import axios from "axios";

// ✅ NEW: Simple EventEmitter implementation for browser
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);

    // Return unsubscribe function
    return () => {
      this.off(event, listener);
    };
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return;

    this.events[event] = this.events[event].filter(
      (listener) => listener !== listenerToRemove
    );
  }

  emit(event, ...args) {
    if (!this.events[event]) return;

    this.events[event].forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error("EventEmitter listener error:", error);
      }
    });
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// ✅ Create API instance
const API_BASE_URL = "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {"Content-Type": "application/json"},
});

// Add interceptors
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const currentCompany = localStorage.getItem("currentCompany");
  if (currentCompany) {
    try {
      const company = JSON.parse(currentCompany);
      const companyId = company.id || company._id || company.companyId;
      if (companyId) config.headers["X-Company-ID"] = companyId;
    } catch (e) {
      // Silent fail
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.unreadCount = 0;
    this.notifications = [];
    this.isConnected = false;
    this.socket = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.pollingInterval = null;
    this.lastFetchTime = null;

    // ✅ NEW: Chat notification state
    this.isChatWindowFocused = false;
    this.activeChatCompanyId = null;
    this.chatNotificationSettings = {
      enabled: true,
      sound: true,
      desktop: true,
    };

    // Bind methods to preserve context
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);

    // Initialize service
    this.init();
  }

  // ===============================
  // 🚀 INITIALIZATION
  // ===============================

  init() {
    // Add event listeners
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // ✅ Load chat notification settings
    this.loadChatNotificationSettings();

    // Load cached notifications
    this.loadCachedNotifications();

    // Connect to real-time updates
    this.connectWebSocket();

    // Start polling as fallback
    this.startPolling();

    console.log("📢 NotificationService initialized");
  }

  // ✅ NEW: Load chat notification settings
  loadChatNotificationSettings() {
    try {
      const saved = localStorage.getItem("chatNotificationSettings");
      if (saved) {
        this.chatNotificationSettings = {
          ...this.chatNotificationSettings,
          ...JSON.parse(saved),
        };
      }
    } catch (error) {
      console.warn("Failed to load chat notification settings:", error);
    }
  }

  // ✅ NEW: Save chat notification settings
  saveChatNotificationSettings() {
    try {
      localStorage.setItem(
        "chatNotificationSettings",
        JSON.stringify(this.chatNotificationSettings)
      );
    } catch (error) {
      console.warn("Failed to save chat notification settings:", error);
    }
  }

  // ✅ NEW: Simple toast method (replaces react-toastify)
  showToast(message, type = "info") {
    // Emit event for components to handle
    this.emit("show_toast", {message, type});
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  // ===============================
  // 📡 REAL-TIME CONNECTION
  // ===============================

  connectWebSocket() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("⚠️ No auth token found for WebSocket connection");
        return;
      }

      // ✅ Use dynamic import for socket.io-client
      import("socket.io-client")
        .then(({io}) => {
          this.socket = io(API_BASE_URL, {
            auth: {token},
            transports: ["websocket", "polling"],
            timeout: 5000,
            retries: 3,
          });

          this.setupSocketListeners();
        })
        .catch((error) => {
          console.warn("Socket.IO not available:", error);
          // Continue without real-time updates, use polling only
        });
    } catch (error) {
      console.error("❌ Failed to initialize WebSocket:", error);
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("✅ Notification WebSocket connected");
      this.isConnected = true;
      this.retryCount = 0;
      this.emit("connected");

      // Join user room for personalized notifications
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.id) {
        this.socket.emit("join_user_room", user.id);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Notification WebSocket disconnected:", reason);
      this.isConnected = false;
      this.emit("disconnected", reason);

      // Auto-reconnect logic
      if (
        reason !== "io client disconnect" &&
        this.retryCount < this.maxRetries
      ) {
        setTimeout(() => {
          this.retryCount++;
          console.log(`🔄 Reconnecting... Attempt ${this.retryCount}`);
          this.socket.connect();
        }, Math.pow(2, this.retryCount) * 1000);
      }
    });

    // Notification events
    this.socket.on("new_notification", (notification) => {
      console.log("📢 New notification received:", notification);
      this.handleNewNotification(notification);
    });

    this.socket.on("notification_read", (data) => {
      console.log("👁️ Notification marked as read:", data);
      this.handleNotificationRead(data.notificationId);
    });

    this.socket.on("all_notifications_read", (data) => {
      console.log("👁️ All notifications marked as read:", data);
      this.handleAllNotificationsRead();
    });

    this.socket.on("notification_deleted", (data) => {
      console.log("🗑️ Notification deleted:", data);
      this.handleNotificationDeleted(data.notificationId);
    });

    // ✅ NEW: Chat notification events
    this.socket.on("new_chat_notification", (notification) => {
      console.log("💬 New chat notification received:", notification);
      this.handleChatNotification(notification);
    });

    // Error handling
    this.socket.on("error", (error) => {
      console.error("❌ Notification WebSocket error:", error);
      this.emit("error", error);
    });
  }

  // ===============================
  // 📥 FETCH NOTIFICATIONS
  // ===============================

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

      const response = await api.get(`/api/notifications?${queryParams}`);

      if (response.data.success) {
        const {notifications, pagination} = response.data.data;

        // Update local cache
        if (page === 1) {
          this.notifications = notifications;
        } else {
          this.notifications = [...this.notifications, ...notifications];
        }

        this.cacheNotifications();
        this.lastFetchTime = new Date();

        this.emit("notifications_fetched", {notifications, pagination});

        return {
          success: true,
          data: {notifications, pagination},
        };
      } else {
        throw new Error(
          response.data.message || "Failed to fetch notifications"
        );
      }
    } catch (error) {
      console.error("❌ Fetch notifications error:", error);
      this.showToast("Failed to load notifications", "error");

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async fetchNotificationById(notificationId) {
    try {
      const response = await api.get(`/api/notifications/${notificationId}`);

      if (response.data.success) {
        const notification = response.data.data.notification;

        // Update in local cache
        const index = this.notifications.findIndex(
          (n) => n.id === notificationId
        );
        if (index !== -1) {
          this.notifications[index] = notification;
          this.cacheNotifications();
        }

        return {
          success: true,
          data: notification,
        };
      } else {
        throw new Error(response.data.message || "Notification not found");
      }
    } catch (error) {
      console.error("❌ Fetch notification by ID error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async fetchUnreadCount(companyId = null) {
    try {
      const queryParams = companyId ? `?companyId=${companyId}` : "";
      const response = await api.get(
        `/api/notifications/unread-count${queryParams}`
      );

      if (response.data.success) {
        const {unreadCount} = response.data.data;
        this.unreadCount = unreadCount;

        this.emit("unread_count_updated", {count: unreadCount});

        return {
          success: true,
          data: unreadCount,
        };
      } else {
        throw new Error(
          response.data.message || "Failed to fetch unread count"
        );
      }
    } catch (error) {
      console.error("❌ Fetch unread count error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ===============================
  // 📤 CREATE NOTIFICATIONS
  // ===============================

  async createNotification(notificationData) {
    try {
      const response = await api.post("/api/notifications", notificationData);

      if (response.data.success) {
        this.showToast("Notification sent successfully", "success");

        this.emit("notification_created", response.data.data);

        return {
          success: true,
          data: response.data.data,
        };
      } else {
        throw new Error(
          response.data.message || "Failed to create notification"
        );
      }
    } catch (error) {
      console.error("❌ Create notification error:", error);
      this.showToast(
        error.response?.data?.message || "Failed to send notification",
        "error"
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ===============================
  // ✏️ UPDATE NOTIFICATIONS
  // ===============================

  async markAsRead(notificationId) {
    try {
      const response = await api.put(
        `/api/notifications/${notificationId}/read`
      );

      if (response.data.success) {
        // Update local cache
        const notification = this.notifications.find(
          (n) => n.id === notificationId
        );
        if (notification) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.cacheNotifications();
        }

        this.emit("notification_read", notificationId);
        this.emit("unread_count_updated", {count: this.unreadCount});

        return {
          success: true,
          data: response.data.data,
        };
      } else {
        throw new Error(response.data.message || "Failed to mark as read");
      }
    } catch (error) {
      console.error("❌ Mark as read error:", error);
      this.showToast("Failed to mark notification as read", "error");

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async markAllAsRead(companyId = null) {
    try {
      const queryParams = companyId ? `?companyId=${companyId}` : "";
      const response = await api.put(
        `/api/notifications/mark-all-read${queryParams}`
      );

      if (response.data.success) {
        // Update local cache
        this.notifications.forEach((notification) => {
          if (!notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date().toISOString();
          }
        });

        this.unreadCount = 0;
        this.cacheNotifications();

        this.showToast(response.data.message, "success");

        this.emit("all_notifications_read");
        this.emit("unread_count_updated", {count: 0});

        return {
          success: true,
          data: response.data.data,
        };
      } else {
        throw new Error(response.data.message || "Failed to mark all as read");
      }
    } catch (error) {
      console.error("❌ Mark all as read error:", error);
      this.showToast("Failed to mark all notifications as read", "error");

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async markAsClicked(notificationId) {
    try {
      const response = await api.put(
        `/api/notifications/${notificationId}/click`
      );

      if (response.data.success) {
        // Update local cache
        const notification = this.notifications.find(
          (n) => n.id === notificationId
        );
        if (notification && notification.interactions) {
          notification.interactions.clicks = response.data.data.clicks;
        }

        this.emit("notification_clicked", notificationId);

        return {
          success: true,
          data: response.data.data,
        };
      } else {
        throw new Error(response.data.message || "Failed to track click");
      }
    } catch (error) {
      console.error("❌ Mark as clicked error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // =============================================================================
  // 💬 NEW: CHAT NOTIFICATION METHODS
  // =============================================================================

  // ✅ NEW: Handle chat-specific notifications
  handleNewChatMessage(messageData, senderInfo, chatInfo) {
    try {
      // Don't show notification if chat window is focused
      if (
        this.isChatWindowFocused &&
        this.activeChatCompanyId === senderInfo.companyId
      ) {
        return;
      }

      // Don't show if chat notifications are disabled
      if (!this.chatNotificationSettings.enabled) {
        return;
      }

      const notification = {
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

      // Add to notifications array
      this.notifications.unshift(notification);
      this.unreadCount++;

      // Keep cache size reasonable
      if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(0, 100);
      }

      this.cacheNotifications();

      // Emit events
      this.emit("new_notification", notification);
      this.emit("unread_count_updated", {count: this.unreadCount});

      // Show browser notification if enabled
      if (this.chatNotificationSettings.desktop) {
        this.showBrowserNotification(notification);
      }

      // Play sound if enabled
      if (this.chatNotificationSettings.sound) {
        this.playNotificationSound();
      }

      // Show toast notification
      this.showToastNotification(notification);
    } catch (error) {
      console.error("❌ Error handling chat notification:", error);
    }
  }

  // ✅ NEW: Handle chat notification from server
  handleChatNotification(notification) {
    try {
      // Only handle if notification is relevant and chat notifications are enabled
      if (!this.chatNotificationSettings.enabled) {
        return;
      }

      // Don't show if relevant chat window is focused
      const senderCompanyId =
        notification.relatedTo?.entityData?.senderCompanyId;
      if (
        this.isChatWindowFocused &&
        this.activeChatCompanyId === senderCompanyId
      ) {
        return;
      }

      // Add to notifications
      this.handleNewNotification(notification);

      // Play sound if enabled
      if (this.chatNotificationSettings.sound) {
        this.playNotificationSound();
      }

      // Show browser notification if enabled
      if (this.chatNotificationSettings.desktop) {
        this.showBrowserNotification(notification);
      }
    } catch (error) {
      console.error("❌ Error handling server chat notification:", error);
    }
  }

  // ✅ NEW: Track chat window focus
  setChatWindowFocus(isFocused, companyId = null) {
    this.isChatWindowFocused = isFocused;
    this.activeChatCompanyId = companyId;

    console.log("🔔 Chat focus updated:", {
      isFocused,
      companyId,
      notificationsEnabled: this.chatNotificationSettings.enabled,
    });
  }

  // ✅ NEW: Update chat notification settings
  updateChatNotificationSettings(settings) {
    this.chatNotificationSettings = {
      ...this.chatNotificationSettings,
      ...settings,
    };
    this.saveChatNotificationSettings();

    this.emit(
      "chat_notification_settings_updated",
      this.chatNotificationSettings
    );
  }

  // ✅ NEW: Get chat notification settings
  getChatNotificationSettings() {
    return {...this.chatNotificationSettings};
  }

  // ✅ NEW: Play notification sound
  playNotificationSound() {
    try {
      if (!this.chatNotificationSettings.sound) return;

      // Create a simple notification sound using Web Audio API
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
    } catch (error) {
      // Silent fail for audio
      console.warn("Audio notification failed:", error);
    }
  }

  // ✅ NEW: Show browser notification
  showBrowserNotification(notification) {
    try {
      // Check if browser notifications are supported and permitted
      if (!("Notification" in window)) {
        return;
      }

      // Request permission if needed
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            this.createBrowserNotification(notification);
          }
        });
      } else if (Notification.permission === "granted") {
        this.createBrowserNotification(notification);
      }
    } catch (error) {
      console.warn("Browser notification failed:", error);
    }
  }

  // ✅ NEW: Create browser notification
  createBrowserNotification(notification) {
    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: notification.id,
        requireInteraction: notification.priority === "critical",
        silent: notification.priority === "low",
      });

      browserNotification.onclick = () => {
        window.focus();
        this.markAsClicked(notification.id);
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };

      // Auto close after 5 seconds for non-critical notifications
      if (notification.priority !== "critical") {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }
    } catch (error) {
      console.warn("Failed to create browser notification:", error);
    }
  }

  // ===============================
  // 🗑️ DELETE NOTIFICATIONS
  // ===============================

  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(`/api/notifications/${notificationId}`);

      if (response.data.success) {
        // Remove from local cache
        this.notifications = this.notifications.filter(
          (n) => n.id !== notificationId
        );
        this.cacheNotifications();

        this.showToast("Notification deleted", "success");

        this.emit("notification_deleted", notificationId);

        return {
          success: true,
        };
      } else {
        throw new Error(
          response.data.message || "Failed to delete notification"
        );
      }
    } catch (error) {
      console.error("❌ Delete notification error:", error);
      this.showToast("Failed to delete notification", "error");

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async archiveNotification(notificationId) {
    try {
      const response = await api.put(
        `/api/notifications/${notificationId}/archive`
      );

      if (response.data.success) {
        // Remove from local cache (archived notifications are hidden)
        this.notifications = this.notifications.filter(
          (n) => n.id !== notificationId
        );
        this.cacheNotifications();

        this.showToast("Notification archived", "success");

        this.emit("notification_archived", notificationId);

        return {
          success: true,
        };
      } else {
        throw new Error(
          response.data.message || "Failed to archive notification"
        );
      }
    } catch (error) {
      console.error("❌ Archive notification error:", error);
      this.showToast("Failed to archive notification", "error");

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ===============================
  // 📊 ANALYTICS & STATS
  // ===============================

  async fetchNotificationStats(companyId, startDate = null, endDate = null) {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);

      const query = queryParams.toString() ? `?${queryParams}` : "";
      const response = await api.get(
        `/api/notifications/stats/${companyId}${query}`
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        throw new Error(response.data.message || "Failed to fetch stats");
      }
    } catch (error) {
      console.error("❌ Fetch notification stats error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ===============================
  // 🎯 SPECIALIZED NOTIFICATIONS
  // ===============================

  async notifyLowInventory(productData, companyId) {
    const notificationData = {
      title: "⚠️ Low Inventory Alert",
      message: `${productData.name} is running low! Current stock: ${productData.currentStock} units`,
      type: "inventory",
      priority: productData.currentStock === 0 ? "critical" : "high",
      recipients: await this.getManagerRecipients(companyId),
      relatedTo: {
        entityType: "product",
        entityId: productData.id,
        entityData: productData,
      },
      actionUrl: `/companies/${companyId}/products/${productData.id}`,
      actionLabel: "View Product",
      channels: {
        inApp: true,
        email: productData.currentStock === 0,
      },
      metadata: {
        source: "inventory_management",
        tags: ["low_stock", "urgent"],
      },
    };

    return await this.createNotification(notificationData);
  }

  async notifyNewOrder(orderData, companyId) {
    const isHighValue = orderData.totalAmount > 25000;

    const notificationData = {
      title: "🛒 New Order Received",
      message: `New order #${
        orderData.orderNumber
      } for ₹${orderData.totalAmount.toLocaleString()} from ${
        orderData.customerName
      }`,
      type: "order",
      priority: isHighValue ? "high" : "medium",
      recipients: await this.getSalesRecipients(companyId),
      relatedTo: {
        entityType: "order",
        entityId: orderData.id,
        entityData: orderData,
      },
      actionUrl: `/companies/${companyId}/orders/${orderData.id}`,
      actionLabel: "View Order",
      channels: {
        inApp: true,
        email: isHighValue,
      },
      metadata: {
        source: "order_management",
        tags: ["new_order", "sales"],
      },
    };

    return await this.createNotification(notificationData);
  }

  async notifyTaskAssignment(taskData, assignedUserId, companyId) {
    const notificationData = {
      title: "📋 New Task Assigned",
      message: `You have been assigned a new task: "${taskData.title}"`,
      type: "task",
      priority: taskData.priority || "medium",
      recipients: [{userId: assignedUserId}],
      relatedTo: {
        entityType: "task",
        entityId: taskData.id,
        entityData: taskData,
      },
      actionUrl: `/companies/${companyId}/tasks/${taskData.id}`,
      actionLabel: "View Task",
      channels: {
        inApp: true,
        email: taskData.priority === "high" || taskData.priority === "critical",
      },
      metadata: {
        source: "task_management",
        tags: ["task_assignment"],
      },
    };

    return await this.createNotification(notificationData);
  }

  // ===============================
  // 🔧 UTILITY METHODS
  // ===============================

  async getManagerRecipients(companyId) {
    // TODO: Implement API call to get managers
    return [];
  }

  async getSalesRecipients(companyId) {
    // TODO: Implement API call to get sales team
    return [];
  }

  // ===============================
  // 💾 CACHING
  // ===============================

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
      console.warn("⚠️ Failed to cache notifications:", error);
    }
  }

  loadCachedNotifications() {
    try {
      const cached = localStorage.getItem("cached_notifications");
      if (cached) {
        const cacheData = JSON.parse(cached);

        // Check if cache is not too old (5 minutes)
        const cacheAge = new Date() - new Date(cacheData.timestamp);
        if (cacheAge < 5 * 60 * 1000) {
          this.notifications = cacheData.notifications || [];
          this.unreadCount = cacheData.unreadCount || 0;
          this.lastFetchTime = cacheData.lastFetchTime
            ? new Date(cacheData.lastFetchTime)
            : null;

          console.log(
            "📦 Loaded cached notifications:",
            this.notifications.length
          );
          this.emit("notifications_loaded_from_cache", this.notifications);
        }
      }
    } catch (error) {
      console.warn("⚠️ Failed to load cached notifications:", error);
    }
  }

  clearCache() {
    localStorage.removeItem("cached_notifications");
    this.notifications = [];
    this.unreadCount = 0;
    this.lastFetchTime = null;
  }

  // ===============================
  // 🔄 POLLING (FALLBACK)
  // ===============================

  startPolling(interval = 30000) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      // Only poll if not connected via WebSocket and page is visible
      if (!this.isConnected && !document.hidden) {
        console.log("🔄 Polling for new notifications...");
        await this.fetchUnreadCount();

        // Fetch latest notifications if it's been a while
        if (!this.lastFetchTime || new Date() - this.lastFetchTime > 60000) {
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

  // ===============================
  // 📡 REAL-TIME EVENT HANDLERS
  // ===============================

  handleNewNotification(notification) {
    // Add to local cache
    this.notifications.unshift(notification);
    this.unreadCount++;

    // Keep cache size reasonable
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.cacheNotifications();

    // Show toast notification
    this.showToastNotification(notification);

    // Emit events
    this.emit("new_notification", notification);
    this.emit("unread_count_updated", {count: this.unreadCount});
  }

  handleNotificationRead(notificationId) {
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
  }

  handleAllNotificationsRead() {
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
  }

  handleNotificationDeleted(notificationId) {
    this.notifications = this.notifications.filter(
      (n) => n.id !== notificationId
    );
    this.cacheNotifications();

    this.emit("notification_deleted", notificationId);
  }

  // ===============================
  // 🔔 TOAST NOTIFICATIONS
  // ===============================

  showToastNotification(notification) {
    // Don't show toast if page is hidden
    if (document.hidden) return;

    // ✅ Emit custom toast event for components to handle
    this.emit("show_notification_toast", {
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      type: "chat",
      onClick: () => {
        this.markAsClicked(notification.id);
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
      },
    });

    // ✅ Also show simple toast
    this.showToast(`${notification.title}: ${notification.message}`, "info");
  }

  // ===============================
  // 🎧 EVENT LISTENERS
  // ===============================

  handleVisibilityChange() {
    if (!document.hidden) {
      // Page became visible, refresh notifications
      console.log("👁️ Page visible, refreshing notifications...");
      this.fetchUnreadCount();

      // Reconnect WebSocket if disconnected
      if (!this.isConnected && this.socket) {
        this.socket.connect();
      }
    }
  }

  handleOnline() {
    console.log("🌐 Back online, reconnecting...");
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
    this.fetchUnreadCount();
  }

  handleOffline() {
    console.log("📴 Offline mode");
    this.isConnected = false;
  }

  // ===============================
  // 🧹 CLEANUP
  // ===============================

  destroy() {
    // Remove event listeners
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);

    // Stop polling
    this.stopPolling();

    // Disconnect WebSocket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Remove all listeners
    this.removeAllListeners();

    console.log("🧹 NotificationService destroyed");
  }

  // ===============================
  // 📊 GETTERS
  // ===============================

  getNotifications() {
    return this.notifications;
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

  // ===============================
  // 🎨 UI HELPERS
  // ===============================

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
    };

    return icons[type] || "📢";
  }

  getNotificationColor(priority) {
    const colors = {
      critical: "#DC2626", // Red
      high: "#F59E0B", // Orange
      medium: "#3B82F6", // Blue
      low: "#6B7280", // Gray
    };

    return colors[priority] || colors.medium;
  }

  formatNotificationTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return time.toLocaleDateString();
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

// Export for direct import
export {notificationService};
