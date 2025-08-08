import axios from "axios";
import apiConfig from "../config/api.js";

const CONFIG = {
  API_BASE_URL: apiConfig.baseURL,
  WEBSOCKET_URL: apiConfig.baseURL
    .replace(/^http/, "ws")
    .replace(/^https/, "wss"),
  CACHE_EXPIRY: 5 * 60 * 1000,
  POLLING_INTERVAL: 30000,
  MAX_CACHED_NOTIFICATIONS: 100,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000,
  REQUEST_TIMEOUT: apiConfig.timeout || 10000,
};

class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    if (this.events.has(event)) {
      this.events.get(event).delete(listener);
      if (this.events.get(event).size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event, ...args) {
    if (this.events.has(event)) {
      this.events.get(event).forEach((listener) => {
        try {
          listener(...args);
        } catch (error) {
          console.warn("Event listener error:", error);
        }
      });
    }
  }

  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).size : 0;
  }
}

class APIClient {
  constructor() {
    const baseURL = CONFIG.API_BASE_URL.endsWith("/api")
      ? CONFIG.API_BASE_URL
      : `${CONFIG.API_BASE_URL}/api`;

    this.client = axios.create({
      baseURL: baseURL,
      timeout: CONFIG.REQUEST_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });
    this.setupInterceptors();
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          config.headers["x-auth-token"] = token;
        }

        const companyId = this.getCurrentCompanyId();
        if (companyId) {
          config.headers["X-Company-ID"] = companyId;
        }

        config.metadata = {startTime: Date.now()};
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.handleAuthenticationError();
        }
        return Promise.reject(error);
      }
    );
  }

  getAuthToken() {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("accessToken")
    );
  }

  getCurrentCompanyId() {
    try {
      const companyId =
        localStorage.getItem("currentCompanyId") ||
        sessionStorage.getItem("currentCompanyId");

      if (companyId) {
        return companyId;
      }

      const currentCompany = localStorage.getItem("currentCompany");
      if (currentCompany) {
        const company = JSON.parse(currentCompany);
        return company.id || company._id || company.companyId;
      }
    } catch (error) {
      console.warn("Error getting company ID:", error);
    }
    return null;
  }

  getTokenSource() {
    if (localStorage.getItem("token")) return "localStorage.token";
    if (localStorage.getItem("accessToken")) return "localStorage.accessToken";
    if (sessionStorage.getItem("token")) return "sessionStorage.token";
    if (sessionStorage.getItem("accessToken"))
      return "sessionStorage.accessToken";
    return "none";
  }

  handleAuthenticationError() {
    const authKeys = [
      "token",
      "accessToken",
      "refreshToken",
      "user",
      "currentCompany",
      "currentCompanyId",
      "isAdmin",
    ];

    authKeys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("auth:logged-out", {
            detail: {
              source: "notification-service",
              timestamp: new Date().toISOString(),
            },
          })
        );
      } catch (error) {
        console.warn("Error dispatching logout event:", error);
      }
    }

    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  async request(config) {
    try {
      const response = await this.client.request(config);
      return {
        success: true,
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        code: error.code,
      };
    }
  }
}

class NotificationService extends EventEmitter {
  constructor() {
    super();

    this.api = new APIClient();
    this.notifications = [];
    this.unreadCount = 0;
    this.lastFetchTime = null;

    this.isConnected = false;
    this.socket = null;
    this.retryCount = 0;
    this.pollingInterval = null;

    this.isChatWindowFocused = false;
    this.activeChatCompanyId = null;
    this.chatNotificationSettings = {
      enabled: true,
      sound: true,
      desktop: true,
      showToast: true,
    };

    this.notificationPermission = "default";

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);

    this.init();
  }

  async init() {
    try {
      this.loadSettings();
      this.loadCachedNotifications();
      this.setupBrowserEventListeners();
      await this.requestNotificationPermission();

      const hasAuth = await this.checkAuthentication();
      if (hasAuth) {
        await this.connectWebSocket();
        this.startPolling();
      }
    } catch (error) {
      console.error("NotificationService init error:", error);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem("chatNotificationSettings");
      if (saved) {
        this.chatNotificationSettings = {
          ...this.chatNotificationSettings,
          ...JSON.parse(saved),
        };
      }
    } catch (error) {
      console.warn("Error loading settings:", error);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(
        "chatNotificationSettings",
        JSON.stringify(this.chatNotificationSettings)
      );
    } catch (error) {
      console.warn("Error saving settings:", error);
    }
  }

  setupBrowserEventListeners() {
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  async requestNotificationPermission() {
    if (!("Notification" in window)) {
      return false;
    }

    try {
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        return permission === "granted";
      }

      this.notificationPermission = Notification.permission;
      return Notification.permission === "granted";
    } catch (error) {
      console.warn("Notification permission error:", error);
      return false;
    }
  }

  async checkAuthentication() {
    const token = this.api.getAuthToken();
    const user = this.getCurrentUser();

    if (!token || !user) {
      return false;
    }

    return true;
  }

  async connectWebSocket() {
    try {
      const token = this.api.getAuthToken();

      if (!token) {
        return false;
      }

      let io;
      try {
        const socketIO = await import("socket.io-client");
        io = socketIO.io || socketIO.default?.io || socketIO.default;
      } catch (importError) {
        return false;
      }

      if (!io) {
        return false;
      }

      const wsUrl = CONFIG.API_BASE_URL.replace(/\/api$/, "")
        .replace(/^http/, "ws")
        .replace(/^https/, "wss");

      this.socket = io(wsUrl, {
        auth: {token},
        transports: ["websocket", "polling"],
        timeout: 5000,
        retries: CONFIG.MAX_RETRY_ATTEMPTS,
        autoConnect: true,
      });

      this.setupSocketListeners();
      return true;
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      return false;
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.retryCount = 0;
      this.emit("connected");

      const user = this.getCurrentUser();
      if (user?.id) {
        this.socket.emit("join_user_room", user.id);
      }

      const companyId = this.api.getCurrentCompanyId();
      if (companyId) {
        this.socket.emit("join_company_room", companyId);
      }
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      this.emit("disconnected", reason);

      if (
        reason !== "io client disconnect" &&
        this.retryCount < CONFIG.MAX_RETRY_ATTEMPTS
      ) {
        const delay = CONFIG.RETRY_DELAY_BASE * Math.pow(2, this.retryCount);
        setTimeout(() => {
          this.retryCount++;
          this.socket.connect();
        }, delay);
      }
    });

    this.socket.on("new_notification", (notification) => {
      this.handleNewNotification(notification);
    });

    this.socket.on("notification_read", (data) => {
      this.handleNotificationRead(data.notificationId);
    });

    this.socket.on("all_notifications_read", () => {
      this.handleAllNotificationsRead();
    });

    this.socket.on("notification_deleted", (data) => {
      this.handleNotificationDeleted(data.notificationId);
    });

    this.socket.on("new_chat_notification", (notification) => {
      this.handleChatNotification(notification);
    });

    this.socket.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.emit("error", error);
    });
  }

  getCurrentUser() {
    try {
      let userStr =
        localStorage.getItem("user") || sessionStorage.getItem("user");

      if (userStr) {
        const user = JSON.parse(userStr);

        if (user && (user.id || user._id) && user.email) {
          return user;
        } else {
          this.clearInconsistentAuthData();
        }
      }

      return null;
    } catch (error) {
      console.warn("Error getting current user:", error);
      this.clearInconsistentAuthData();
      return null;
    }
  }

  clearInconsistentAuthData() {
    try {
      const authKeys = [
        "token",
        "accessToken",
        "refreshToken",
        "user",
        "currentCompany",
        "currentCompanyId",
        "isAdmin",
      ];

      authKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.warn("Error clearing inconsistent auth data:", error);
    }
  }

  async fetchNotifications(params = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        priority,
        unreadOnly = false,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc",
        companyId,
      } = params;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (type) queryParams.append("type", type);
      if (priority) queryParams.append("priority", priority);
      if (unreadOnly) queryParams.append("unreadOnly", "true");
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      if (companyId) queryParams.append("companyId", companyId);

      const result = await this.api.request({
        method: "GET",
        url: `/notifications?${queryParams}`,
      });

      if (result.success) {
        const {notifications, pagination} = result.data.data || {};

        if (page === 1) {
          this.notifications = notifications || [];
        } else {
          this.notifications = [
            ...this.notifications,
            ...(notifications || []),
          ];
        }

        this.cacheNotifications();
        this.lastFetchTime = new Date();

        this.emit("notifications_fetched", {notifications, pagination});

        return {
          success: true,
          data: {notifications, pagination},
        };
      }

      throw new Error(result.error || "Failed to fetch notifications");
    } catch (error) {
      console.error("Error fetching notifications:", error);

      if (error.response?.status === 401) {
        this.api.handleAuthenticationError();
        return {
          success: false,
          error: "Authentication required",
          requiresLogin: true,
        };
      }

      this.showToast("Failed to load notifications", "error");
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async fetchUnreadCount(companyId = null) {
    try {
      const queryParams = companyId ? `?companyId=${companyId}` : "";

      const result = await this.api.request({
        method: "GET",
        url: `/notifications/unread-count${queryParams}`,
      });

      if (result.success) {
        const {unreadCount} = result.data.data || {};
        this.unreadCount = unreadCount || 0;

        this.emit("unread_count_updated", {count: this.unreadCount});

        return {
          success: true,
          data: this.unreadCount,
        };
      }

      throw new Error(result.error || "Failed to fetch unread count");
    } catch (error) {
      console.error("Error fetching unread count:", error);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: "Authentication required",
          requiresLogin: true,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async markAsRead(notificationId) {
    try {
      const result = await this.api.request({
        method: "PUT",
        url: `/notifications/${notificationId}/read`,
      });

      if (result.success) {
        const notification = this.notifications.find(
          (n) => n.id === notificationId
        );
        if (notification && !notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.cacheNotifications();
        }

        this.emit("notification_read", notificationId);
        this.emit("unread_count_updated", {count: this.unreadCount});

        return {success: true};
      }

      throw new Error(result.error || "Failed to mark as read");
    } catch (error) {
      console.error("Error marking notification as read:", error);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: "Authentication required",
          requiresLogin: true,
        };
      }

      this.showToast("Failed to mark notification as read", "error");
      return {success: false, error: error.message};
    }
  }

  async markAllAsRead(companyId = null) {
    try {
      const queryParams = companyId ? `?companyId=${companyId}` : "";

      const result = await this.api.request({
        method: "PUT",
        url: `/notifications/mark-all-read${queryParams}`,
      });

      if (result.success) {
        this.notifications.forEach((notification) => {
          if (!notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date().toISOString();
          }
        });

        this.unreadCount = 0;
        this.cacheNotifications();

        this.showToast("All notifications marked as read", "success");

        this.emit("all_notifications_read");
        this.emit("unread_count_updated", {count: 0});

        return {success: true};
      }

      throw new Error(result.error || "Failed to mark all as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: "Authentication required",
          requiresLogin: true,
        };
      }

      this.showToast("Failed to mark all notifications as read", "error");
      return {success: false, error: error.message};
    }
  }

  async markAsClicked(notificationId) {
    try {
      const result = await this.api.request({
        method: "PUT",
        url: `/notifications/${notificationId}/click`,
      });

      if (result.success) {
        this.emit("notification_clicked", notificationId);
        return {success: true};
      }

      return {success: false, error: result.error};
    } catch (error) {
      console.error("Error marking notification as clicked:", error);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: "Authentication required",
          requiresLogin: true,
        };
      }

      return {success: false, error: error.message};
    }
  }

  async deleteNotification(notificationId) {
    try {
      const result = await this.api.request({
        method: "DELETE",
        url: `/notifications/${notificationId}`,
      });

      if (result.success) {
        this.notifications = this.notifications.filter(
          (n) => n.id !== notificationId
        );
        this.cacheNotifications();

        this.showToast("Notification deleted", "success");
        this.emit("notification_deleted", notificationId);

        return {success: true};
      }

      throw new Error(result.error || "Failed to delete notification");
    } catch (error) {
      console.error("Error deleting notification:", error);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: "Authentication required",
          requiresLogin: true,
        };
      }

      this.showToast("Failed to delete notification", "error");
      return {success: false, error: error.message};
    }
  }

  handleNewChatMessage(messageData, senderInfo, chatInfo) {
    try {
      if (
        this.isChatWindowFocused &&
        this.activeChatCompanyId === senderInfo.companyId
      ) {
        return;
      }

      if (!this.chatNotificationSettings.enabled) {
        return;
      }

      const notification = this.createChatNotification(messageData, senderInfo);
      this.handleNewNotification(notification);

      if (this.chatNotificationSettings.desktop) {
        this.showBrowserNotification(notification);
      }

      if (this.chatNotificationSettings.sound) {
        this.playNotificationSound();
      }
    } catch (error) {
      console.error("Error handling chat message:", error);
    }
  }

  createChatNotification(messageData, senderInfo) {
    return {
      id: `chat_${messageData._id || Date.now()}`,
      title: "💬 New Message",
      message: `${
        senderInfo.companyName || "Company"
      }: ${messageData.content.substring(0, 100)}${
        messageData.content.length > 100 ? "..." : ""
      }`,
      type: "chat",
      priority: "low",
      actionUrl: `/chats?from=${senderInfo.companyId}`,
      actionLabel: "Reply",
      createdAt: new Date().toISOString(),
      isRead: false,
      relatedTo: {
        entityType: "chat",
        entityId: messageData._id,
        entityData: {
          senderCompanyId: senderInfo.companyId,
          senderCompanyName: senderInfo.companyName,
          messageType: messageData.messageType,
        },
      },
      metadata: {
        source: "chat_system",
        chatMessage: true,
      },
    };
  }

  handleChatNotification(notification) {
    try {
      if (!this.chatNotificationSettings.enabled) return;

      const senderCompanyId =
        notification.relatedTo?.entityData?.senderCompanyId;
      if (
        this.isChatWindowFocused &&
        this.activeChatCompanyId === senderCompanyId
      ) {
        return;
      }

      this.handleNewNotification(notification);

      if (this.chatNotificationSettings.sound) {
        this.playNotificationSound();
      }

      if (this.chatNotificationSettings.desktop) {
        this.showBrowserNotification(notification);
      }
    } catch (error) {
      console.error("Error handling chat notification:", error);
    }
  }

  setChatWindowFocus(isFocused, companyId = null) {
    this.isChatWindowFocused = isFocused;
    this.activeChatCompanyId = companyId;
  }

  updateChatNotificationSettings(settings) {
    this.chatNotificationSettings = {
      ...this.chatNotificationSettings,
      ...settings,
    };
    this.saveSettings();
    this.emit(
      "chat_notification_settings_updated",
      this.chatNotificationSettings
    );
  }

  getChatNotificationSettings() {
    return {...this.chatNotificationSettings};
  }

  playNotificationSound() {
    if (!this.chatNotificationSettings.sound) return;

    try {
      if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }
    } catch (error) {
      console.warn("Error playing notification sound:", error);
    }
  }

  async showBrowserNotification(notification) {
    if (this.notificationPermission !== "granted") return;

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: notification.id,
        requireInteraction: notification.priority === "critical",
        silent: notification.priority === "low",
        data: notification,
      });

      browserNotification.onclick = () => {
        window.focus();
        this.markAsClicked(notification.id);

        if (notification.actionUrl) {
          if (window.location.pathname !== notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        }

        browserNotification.close();
      };

      if (notification.priority !== "critical") {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }
    } catch (error) {
      console.warn("Error showing browser notification:", error);
    }
  }

  showToast(message, type = "info") {
    this.emit("show_toast", {message, type});
  }

  showToastNotification(notification) {
    if (document.hidden || !this.chatNotificationSettings.showToast) return;

    this.emit("show_notification_toast", {
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      type: notification.type || "info",
      onClick: () => {
        this.markAsClicked(notification.id);
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
      },
    });
  }

  handleNewNotification(notification) {
    try {
      this.notifications.unshift(notification);
      this.unreadCount++;

      if (this.notifications.length > CONFIG.MAX_CACHED_NOTIFICATIONS) {
        this.notifications = this.notifications.slice(
          0,
          CONFIG.MAX_CACHED_NOTIFICATIONS
        );
      }

      this.cacheNotifications();
      this.showToastNotification(notification);

      this.emit("new_notification", notification);
      this.emit("unread_count_updated", {count: this.unreadCount});
    } catch (error) {
      console.error("Error handling new notification:", error);
    }
  }

  handleNotificationRead(notificationId) {
    try {
      const notification = this.notifications.find(
        (n) => n.id === notificationId
      );
      if (notification && !notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.cacheNotifications();

        this.emit("notification_read", notificationId);
        this.emit("unread_count_updated", {count: this.unreadCount});
      }
    } catch (error) {
      console.error("Error handling notification read:", error);
    }
  }

  handleAllNotificationsRead() {
    try {
      this.notifications.forEach((notification) => {
        if (!notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
        }
      });

      this.unreadCount = 0;
      this.cacheNotifications();

      this.emit("all_notifications_read");
      this.emit("unread_count_updated", {count: 0});
    } catch (error) {
      console.error("Error handling all notifications read:", error);
    }
  }

  handleNotificationDeleted(notificationId) {
    try {
      this.notifications = this.notifications.filter(
        (n) => n.id !== notificationId
      );
      this.cacheNotifications();
      this.emit("notification_deleted", notificationId);
    } catch (error) {
      console.error("Error handling notification deleted:", error);
    }
  }

  cacheNotifications() {
    try {
      const cacheData = {
        notifications: this.notifications,
        unreadCount: this.unreadCount,
        lastFetchTime: this.lastFetchTime,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem("cached_notifications", JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Error caching notifications:", error);
    }
  }

  loadCachedNotifications() {
    try {
      const cached = localStorage.getItem("cached_notifications");
      if (!cached) return;

      const cacheData = JSON.parse(cached);
      const cacheAge = new Date() - new Date(cacheData.timestamp);

      if (cacheAge < CONFIG.CACHE_EXPIRY) {
        this.notifications = cacheData.notifications || [];
        this.unreadCount = cacheData.unreadCount || 0;
        this.lastFetchTime = cacheData.lastFetchTime
          ? new Date(cacheData.lastFetchTime)
          : null;

        this.emit("notifications_loaded_from_cache", this.notifications);
      } else {
        this.clearCache();
      }
    } catch (error) {
      console.warn("Error loading cached notifications:", error);
      this.clearCache();
    }
  }

  clearCache() {
    try {
      localStorage.removeItem("cached_notifications");
      this.notifications = [];
      this.unreadCount = 0;
      this.lastFetchTime = null;
    } catch (error) {
      console.warn("Error clearing cache:", error);
    }
  }

  startPolling(interval = CONFIG.POLLING_INTERVAL) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      if (!this.isConnected && !document.hidden) {
        await this.fetchUnreadCount();

        if (!this.lastFetchTime || Date.now() - this.lastFetchTime > 60000) {
          await this.fetchNotifications({limit: 10});
        }
      }
    }, interval);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  handleVisibilityChange() {
    if (!document.hidden) {
      this.fetchUnreadCount();

      if (!this.isConnected && this.socket) {
        this.socket.connect();
      }
    }
  }

  handleOnline() {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
    this.fetchUnreadCount();
  }

  handleOffline() {
    this.isConnected = false;
  }

  getNotifications() {
    return [...this.notifications];
  }

  getUnreadCount() {
    return this.unreadCount;
  }

  getNotificationById(id) {
    return this.notifications.find((n) => n.id === id);
  }

  getNotificationsByType(type) {
    return this.notifications.filter((n) => n.type === type);
  }

  getUnreadNotifications() {
    return this.notifications.filter((n) => !n.isRead);
  }

  isNotificationRead(id) {
    const notification = this.getNotificationById(id);
    return notification ? notification.isRead : false;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasWebSocket: !!this.socket,
      isPolling: !!this.pollingInterval,
      retryCount: this.retryCount,
    };
  }

  getNotificationIcon(type) {
    const icons = {
      system: "⚙️",
      inventory: "📦",
      order: "🛒",
      task: "📋",
      security: "🔒",
      reminder: "⏰",
      chat: "💬",
      report: "📊",
      warning: "⚠️",
      error: "❌",
      success: "✅",
      info: "ℹ️",
      payment: "💳",
      user: "👤",
      company: "🏢",
    };

    return icons[type] || "📢";
  }

  getNotificationColor(priority) {
    const colors = {
      critical: "#DC2626",
      high: "#F59E0B",
      medium: "#3B82F6",
      low: "#6B7280",
    };

    return colors[priority] || colors.medium;
  }

  formatNotificationTime(timestamp) {
    try {
      const now = new Date();
      const time = new Date(timestamp);
      const diffInSeconds = Math.floor((now - time) / 1000);

      if (diffInSeconds < 60) return "Just now";
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800)
        return `${Math.floor(diffInSeconds / 86400)}d ago`;

      return time.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: time.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch (error) {
      return "Unknown";
    }
  }

  cleanup() {
    try {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);

      this.stopPolling();

      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.removeAllListeners();
    } catch (error) {
      console.warn("Error during cleanup:", error);
    }
  }

  destroy() {
    this.cleanup();
  }
}

const notificationService = new NotificationService();

if (import.meta.env?.DEV) {
  if (import.meta?.hot) {
    import.meta.hot.dispose(() => {
      notificationService.cleanup();
    });
  }

  if (typeof window !== "undefined") {
    if (!window.__NOTIFICATION_SERVICE_CLEANUP__) {
      window.__NOTIFICATION_SERVICE_CLEANUP__ = [];
    }
    window.__NOTIFICATION_SERVICE_CLEANUP__.push(() => {
      notificationService.cleanup();
    });
  }
}

export default notificationService;
export {notificationService};
