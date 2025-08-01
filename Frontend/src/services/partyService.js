import axios from "axios";
import apiConfig from "../config/api";
import chatService from "./chatService";

const API_BASE_URL = apiConfig.baseURL;

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

const chatAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

const setupInterceptors = (client) => {
  client.interceptors.request.use(
    (config) => {
      // Add authentication token
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add current company context
      const currentCompany = localStorage.getItem("currentCompany");
      if (currentCompany) {
        try {
          const company = JSON.parse(currentCompany);
          const companyId = company.id || company._id || company.companyId;

          if (companyId) {
            config.headers["X-Company-ID"] = companyId;
          }
        } catch (e) {
          // Silent error handling
        }
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for global error handling
  client.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Handle common errors
      if (error.response) {
        // Server responded with error status
        const {status, data} = error.response;

        switch (status) {
          case 401:
            // Clear all authentication data
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("currentCompany");

            // Only redirect if not already on login page
            if (
              !window.location.pathname.includes("/login") &&
              !window.location.pathname.includes("/auth")
            ) {
              window.location.href = "/login";
            }
            break;
        }

        // Throw error with server message and code
        const errorMessage = data.message || `HTTP Error: ${status}`;
        const apiError = new Error(errorMessage);
        apiError.code = data.code;
        apiError.status = status;
        apiError.debug = data.debug;
        throw apiError;
      } else if (error.request) {
        // Network error
        const networkError = new Error(
          "Unable to connect to server. Please check your internet connection."
        );
        networkError.code = "NETWORK_ERROR";
        throw networkError;
      } else {
        // Other error
        throw new Error(error.message || "An unexpected error occurred.");
      }
    }
  );
};

// Setup interceptors for both clients
setupInterceptors(apiClient);
setupInterceptors(chatAPI);

class PartyService {
  constructor() {
    // ✅ ADDED: Simple in-memory cache
    this.cache = new Map();
    this.cacheTimeouts = new Map();
    this.currentCompanyId = null;
    this.currentCompanyName = null;
  }

  // ✅ ADDED: Cache management methods
  getFromCache(key, type = "default") {
    const cacheKey = `${type}_${key}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    this.cache.delete(cacheKey);
    return null;
  }

  setCache(key, data, type = "default", ttlMinutes = 5) {
    const cacheKey = `${type}_${key}`;
    const expires = Date.now() + ttlMinutes * 60 * 1000;
    this.cache.set(cacheKey, {data, expires});

    // Clear expired cache entries periodically
    if (this.cacheTimeouts.has(cacheKey)) {
      clearTimeout(this.cacheTimeouts.get(cacheKey));
    }

    const timeout = setTimeout(() => {
      this.cache.delete(cacheKey);
      this.cacheTimeouts.delete(cacheKey);
    }, ttlMinutes * 60 * 1000);

    this.cacheTimeouts.set(cacheKey, timeout);
  }

  clearCache(type = null) {
    if (type) {
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${type}_`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => {
        this.cache.delete(key);
        if (this.cacheTimeouts.has(key)) {
          clearTimeout(this.cacheTimeouts.get(key));
          this.cacheTimeouts.delete(key);
        }
      });
    } else {
      this.cache.clear();
      this.cacheTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.cacheTimeouts.clear();
    }
  }

  clearHistoryCache(targetCompanyId) {
    this.clearCache(`history_${targetCompanyId}`);
  }

  clearConversationCache() {
    this.clearCache("conversation");
  }

  // ✅ ADDED: Auto-set company context
  autoSetCompanyContext() {
    try {
      const currentCompany = localStorage.getItem("currentCompany");
      if (currentCompany) {
        const company = JSON.parse(currentCompany);
        this.currentCompanyId = company.id || company._id || company.companyId;
        this.currentCompanyName = company.businessName || company.name;
      }
    } catch (error) {
      console.warn("Failed to auto-set company context:", error);
    }
  }

  handleError(error) {
    if (error.response?.status === 404) {
      // Return empty result for 404s instead of throwing
      return {
        success: false,
        message: "Resource not found",
        data: null,
      };
    }
    throw error;
  }

  validateAndExtractPartyCompanyData(partyData) {
    try {
      if (!partyData) {
        throw new Error("Party data is required");
      }

      // ✅ CRITICAL: Get YOUR authenticated company ID first
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(
          "No authenticated company found. Please refresh and try again."
        );
      }

      const myCompanyId = companyValidation.companyId; // ✅ YOUR company ID

      // ✅ Extract target company ID from party data
      let targetCompanyId = null;

      // Check multiple possible fields for target company
      if (partyData.chatCompanyId) {
        targetCompanyId = partyData.chatCompanyId;
      } else if (partyData.externalCompanyId) {
        targetCompanyId = partyData.externalCompanyId;
      } else if (partyData.linkedCompanyId) {
        if (
          typeof partyData.linkedCompanyId === "object" &&
          partyData.linkedCompanyId._id
        ) {
          targetCompanyId = partyData.linkedCompanyId._id;
        } else if (typeof partyData.linkedCompanyId === "string") {
          targetCompanyId = partyData.linkedCompanyId;
        }
      }

      if (!targetCompanyId) {
        throw new Error("Party is not linked to any company for chat");
      }

      // ✅ VALIDATE: Ensure you're not trying to chat with yourself
      if (myCompanyId === targetCompanyId) {
        throw new Error("Cannot chat with your own company");
      }

      console.log("🔍 Extracted company data:", {
        myCompanyId, // ✅ YOUR company (e.g., IT Solution)
        targetCompanyId, // ✅ PARTY's company (e.g., Sai Computer)
        partyId: partyData._id || partyData.id,
        partyName: partyData.name,
      });

      return {
        myCompanyId, // ✅ CRITICAL: Added YOUR company ID
        targetCompanyId, // ✅ Party's linked company ID
        partyId: partyData._id || partyData.id,
        partyName: partyData.name,
        chatCompanyName:
          partyData.chatCompanyName ||
          partyData.linkedCompanyId?.businessName ||
          partyData.supplierCompanyData?.businessName ||
          partyData.name,
      };
    } catch (error) {
      console.error("❌ Error extracting party company data:", error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Get authenticated company data
   * @returns {Object} Authenticated company info
   */
  getAuthenticatedCompany() {
    try {
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        return null;
      }

      return {
        companyId: companyValidation.companyId,
        company: companyValidation.company,
        name:
          companyValidation.company?.businessName ||
          companyValidation.company?.name,
      };
    } catch (error) {
      console.error("❌ Error getting authenticated company:", error);
      return null;
    }
  }

  /**
   * Map frontend sort keys to backend expected keys
   * @param {string} frontendKey - Frontend sort key
   * @returns {string} Backend sort key
   */
  mapSortKey(frontendKey) {
    const sortKeyMapping = {
      balance: "currentBalance",
      name: "name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      partyType: "partyType",
      creditLimit: "creditLimit",
      gstType: "gstType",
    };

    return sortKeyMapping[frontendKey] || frontendKey;
  }

  /**
   * Validate company context before making requests
   * @returns {Object} Company validation result
   */
  validateCompanyContext() {
    const currentCompany = localStorage.getItem("currentCompany");

    if (!currentCompany) {
      return {
        isValid: false,
        error: "No company selected. Please select a company first.",
        company: null,
      };
    }

    try {
      const company = JSON.parse(currentCompany);
      const companyId = company.id || company._id || company.companyId;

      if (!companyId) {
        return {
          isValid: false,
          error: "Company ID is missing. Please reselect your company.",
          company: company,
        };
      }

      return {
        isValid: true,
        error: null,
        company: company,
        companyId: companyId,
      };
    } catch (e) {
      return {
        isValid: false,
        error: "Invalid company data. Please reselect your company.",
        company: null,
      };
    }
  }
  /**
   * Create a new party with linking support
   * @param {Object} partyData - Party data
   * @returns {Promise<Object>} Created party data
   */
  async createParty(partyData) {
    try {
      // Validate required fields
      if (!partyData.name || !partyData.phoneNumber) {
        throw new Error("Name and phone number are required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      // Transform the form data to match backend schema with linking fields
      const backendData = {
        partyType: partyData.partyType || "customer",
        name: partyData.name.trim(),
        email: partyData.email?.trim() || "",
        phoneNumber: partyData.phoneNumber?.trim(),
        companyName: partyData.companyName?.trim() || "",

        // GST Information
        gstNumber: partyData.gstNumber?.trim()?.toUpperCase() || "",
        gstType: partyData.gstType || "unregistered",

        // Financial Information
        creditLimit: parseFloat(partyData.creditLimit) || 0,
        openingBalance: parseFloat(partyData.openingBalance) || 0,

        country: partyData.country || "INDIA",

        // Home address
        homeAddressLine: partyData.homeAddressLine || "",
        homePincode: partyData.homePincode || "",
        homeState: partyData.homeState || "",
        homeDistrict: partyData.homeDistrict || "",
        homeTaluka: partyData.homeTaluka || "",

        // Delivery address
        deliveryAddressLine: partyData.deliveryAddressLine || "",
        deliveryPincode: partyData.deliveryPincode || "",
        deliveryState: partyData.deliveryState || "",
        deliveryDistrict: partyData.deliveryDistrict || "",
        deliveryTaluka: partyData.deliveryTaluka || "",
        sameAsHomeAddress: partyData.sameAsHomeAddress || false,

        // Additional phone numbers
        phoneNumbers:
          partyData.phoneNumbers?.filter(
            (phone) => phone.number && phone.number.trim()
          ) || [],

        // Bidirectional linking fields
        linkedCompanyId: partyData.linkedCompanyId || null,
        isLinkedSupplier: partyData.isLinkedSupplier || false,
        enableBidirectionalOrders: partyData.enableBidirectionalOrders || false,
        autoLinkByGST:
          partyData.autoLinkByGST !== undefined
            ? partyData.autoLinkByGST
            : true,
        autoLinkByPhone:
          partyData.autoLinkByPhone !== undefined
            ? partyData.autoLinkByPhone
            : true,
        autoLinkByEmail:
          partyData.autoLinkByEmail !== undefined
            ? partyData.autoLinkByEmail
            : true,
        externalCompanyId: partyData.externalCompanyId || null,
        isExternalCompany: partyData.isExternalCompany || false,
        importedFrom: partyData.importedFrom || null,
        importedAt: partyData.importedAt || null,
        source: partyData.source || "Manual Entry",
        isVerified: partyData.isVerified || false,
        supplierCompanyData: partyData.supplierCompanyData || null,

        // Additional business fields
        website: partyData.website?.trim() || "",
        businessType: partyData.businessType?.trim() || "",
        businessCategory: partyData.businessCategory?.trim() || "",
        companyType: partyData.companyType?.trim() || "",
        incorporationDate: partyData.incorporationDate || null,
        cinNumber: partyData.cinNumber?.trim()?.toUpperCase() || "",
        authorizedCapital: partyData.authorizedCapital?.trim() || "",
        paidUpCapital: partyData.paidUpCapital?.trim() || "",
        establishedYear: partyData.establishedYear?.trim() || "",
        description: partyData.description?.trim() || "",
        ownerInfo: partyData.ownerInfo || null,
      };

      // Remove empty fields to avoid sending unnecessary data
      Object.keys(backendData).forEach((key) => {
        if (
          backendData[key] === "" ||
          backendData[key] === undefined ||
          backendData[key] === null
        ) {
          delete backendData[key];
        }
      });

      // Ensure phoneNumbers array has at least the primary phone
      if (!backendData.phoneNumbers || backendData.phoneNumbers.length === 0) {
        backendData.phoneNumbers = [
          {
            number: backendData.phoneNumber,
            label: "Primary",
          },
        ];
      }

      const response = await apiClient.post("/api/parties", backendData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create party with enhanced linking support
   * @param {Object} partyData - Party data with linking fields
   * @returns {Promise<Object>} Created party data with linking info
   */
  async createPartyWithLinking(partyData) {
    try {
      // Use enhanced endpoint if available, fallback to regular
      const endpoint = "/api/parties/create-with-linking";

      try {
        const response = await apiClient.post(endpoint, partyData);
        return response.data;
      } catch (error) {
        // Fallback to regular creation if enhanced endpoint doesn't exist
        if (error.response?.status === 404) {
          return await this.createParty(partyData);
        }
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update party with linking support
   * @param {string} partyId - Party ID
   * @param {Object} partyData - Updated party data
   * @returns {Promise<Object>} Updated party data
   */
  async updateParty(partyId, partyData) {
    try {
      if (!partyId) {
        throw new Error("Party ID is required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      // Transform the form data to match backend schema with linking fields
      const backendData = {
        partyType: partyData.partyType,
        name: partyData.name?.trim(),
        email: partyData.email?.trim() || "",
        phoneNumber: partyData.phoneNumber?.trim(),
        companyName: partyData.companyName?.trim() || "",

        // GST Information
        gstNumber: partyData.gstNumber?.trim()?.toUpperCase() || "",
        gstType: partyData.gstType || "unregistered",

        // Financial Information
        creditLimit: parseFloat(partyData.creditLimit) || 0,
        openingBalance: parseFloat(partyData.openingBalance) || 0,

        country: partyData.country || "INDIA",

        // Home address
        homeAddressLine: partyData.homeAddressLine || "",
        homePincode: partyData.homePincode || "",
        homeState: partyData.homeState || "",
        homeDistrict: partyData.homeDistrict || "",
        homeTaluka: partyData.homeTaluka || "",

        // Delivery address
        deliveryAddressLine: partyData.deliveryAddressLine || "",
        deliveryPincode: partyData.deliveryPincode || "",
        deliveryState: partyData.deliveryState || "",
        deliveryDistrict: partyData.deliveryDistrict || "",
        deliveryTaluka: partyData.deliveryTaluka || "",
        sameAsHomeAddress: partyData.sameAsHomeAddress || false,

        // Additional phone numbers
        phoneNumbers:
          partyData.phoneNumbers?.filter(
            (phone) => phone.number && phone.number.trim()
          ) || [],

        // Bidirectional linking fields
        linkedCompanyId: partyData.linkedCompanyId || null,
        isLinkedSupplier: partyData.isLinkedSupplier || false,
        enableBidirectionalOrders: partyData.enableBidirectionalOrders || false,
        autoLinkByGST:
          partyData.autoLinkByGST !== undefined
            ? partyData.autoLinkByGST
            : true,
        autoLinkByPhone:
          partyData.autoLinkByPhone !== undefined
            ? partyData.autoLinkByPhone
            : true,
        autoLinkByEmail:
          partyData.autoLinkByEmail !== undefined
            ? partyData.autoLinkByEmail
            : true,
        externalCompanyId: partyData.externalCompanyId || null,
        isExternalCompany: partyData.isExternalCompany || false,
        importedFrom: partyData.importedFrom || null,
        importedAt: partyData.importedAt || null,
        source: partyData.source || null,
        isVerified: partyData.isVerified || false,
        supplierCompanyData: partyData.supplierCompanyData || null,

        // Additional business fields
        website: partyData.website?.trim() || "",
        businessType: partyData.businessType?.trim() || "",
        businessCategory: partyData.businessCategory?.trim() || "",
        companyType: partyData.companyType?.trim() || "",
        incorporationDate: partyData.incorporationDate || null,
        cinNumber: partyData.cinNumber?.trim()?.toUpperCase() || "",
        authorizedCapital: partyData.authorizedCapital?.trim() || "",
        paidUpCapital: partyData.paidUpCapital?.trim() || "",
        establishedYear: partyData.establishedYear?.trim() || "",
        description: partyData.description?.trim() || "",
        ownerInfo: partyData.ownerInfo || null,
      };

      // Remove undefined fields for cleaner update
      Object.keys(backendData).forEach((key) => {
        if (backendData[key] === undefined) {
          delete backendData[key];
        }
      });

      const response = await apiClient.put(
        `/api/parties/${partyId}`,
        backendData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update party with enhanced linking support
   * @param {string} partyId - Party ID
   * @param {Object} partyData - Updated party data with linking fields
   * @returns {Promise<Object>} Updated party data with linking info
   */
  async updatePartyWithLinking(partyId, partyData) {
    try {
      // Use enhanced endpoint if available, fallback to regular
      const endpoint = `/api/parties/${partyId}/update-with-linking`;

      try {
        const response = await apiClient.put(endpoint, partyData);
        return response.data;
      } catch (error) {
        // Fallback to regular update if enhanced endpoint doesn't exist
        if (error.response?.status === 404) {
          return await this.updateParty(partyId, partyData);
        }
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Link supplier to company
   * @param {string} supplierId - Supplier ID
   * @param {string} targetCompanyId - Target company ID to link to
   * @returns {Promise<Object>} Linking result
   */
  async linkSupplierToCompany(supplierId, targetCompanyId) {
    try {
      if (!supplierId || !targetCompanyId) {
        throw new Error("Supplier ID and target company ID are required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const requestData = {
        supplierId,
        companyId: targetCompanyId,
      };

      const response = await apiClient.post(
        "/api/parties/link-supplier",
        requestData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * ✅ FIXED: Get conversation summary for party's linked company
   * @param {Object} partyData - Party data
   * @returns {Promise<Object>} Conversation summary
   */
  async getConversationSummary(partyData) {
    try {
      // Extract linked company ID from party data
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      // Check cache first
      const cacheKey = `summary_${targetCompanyId}`;
      const cachedSummary = this.getFromCache(cacheKey, "conversation");
      if (cachedSummary) {
        return cachedSummary;
      }

      // ✅ FIXED: Use proper chat endpoint
      const response = await chatAPI.get(
        `/api/chat/conversations/${targetCompanyId}/summary`,
        {
          params: {
            partyId,
            partyName,
          },
        }
      );

      // Cache the result
      this.setCache(cacheKey, response.data, "conversation");
      return response.data;
    } catch (error) {
      // Return a default summary instead of throwing error
      return {
        success: false,
        data: {
          totalMessages: 0,
          unreadCount: 0,
          lastMessageAt: null,
          participantCount: 0,
        },
      };
    }
  }

  /**
   * ✅ FIXED: Get conversations list for current company
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Conversations list
   */
  async getConversations(options = {}) {
    try {
      const {page = 1, limit = 20, search = "", filter = "all"} = options;

      // Auto-set company context if not available
      if (!this.currentCompanyId) {
        this.autoSetCompanyContext();
      }

      if (!this.currentCompanyId) {
        throw new Error("Company context is required");
      }

      // Check cache first
      const cacheKey = `conversations_${page}_${limit}_${search}_${filter}`;
      const cachedConversations = this.getFromCache(cacheKey, "conversation");
      if (cachedConversations) {
        return cachedConversations;
      }

      const response = await chatAPI.get("/api/chat/conversations", {
        params: {
          page,
          limit,
          search,
          filter,
          companyId: this.currentCompanyId,
        },
      });

      // Cache the result
      this.setCache(cacheKey, response.data, "conversation");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  /**
   * Get active chats for current company
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Active chats
   */
  async getActiveChats(options = {}) {
    try {
      const {page = 1, limit = 10} = options;

      // Auto-set company context if not available
      if (!this.currentCompanyId) {
        this.autoSetCompanyContext();
      }

      if (!this.currentCompanyId) {
        throw new Error("Company context is required");
      }

      // Check cache first
      const cacheKey = `active_chats_${page}_${limit}`;
      const cachedActiveChats = this.getFromCache(cacheKey, "conversation");
      if (cachedActiveChats) {
        return cachedActiveChats;
      }

      const response = await chatAPI.get("/api/chat/active", {
        params: {
          page,
          limit,
          type: "company",
          companyId: this.currentCompanyId,
        },
      });

      // Cache the result
      this.setCache(cacheKey, response.data, "conversation");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search messages in party's linked company chat
   * @param {Object} partyData - Party data
   * @param {string} searchQuery - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchMessages(partyData, searchQuery, options = {}) {
    try {
      const {page = 1, limit = 20, messageType, startDate, endDate} = options;

      // Extract linked company ID from party data
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      if (!searchQuery || searchQuery.trim().length < 2) {
        return {
          success: true,
          data: {
            messages: [],
            pagination: {totalMessages: 0, hasMore: false},
          },
        };
      }

      const response = await chatAPI.get(
        `/api/chat/search/${targetCompanyId}`,
        {
          params: {
            query: searchQuery.trim(),
            page,
            limit,
            messageType,
            startDate,
            endDate,
            type: "company",
            partyId,
            partyName,
          },
        }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark messages as read for party's linked company
   * @param {Object} partyData - Party data
   * @param {Array} messageIds - Message IDs to mark as read
   * @returns {Promise<Object>} Result
   */
  async markMessagesAsRead(partyData, messageIds = []) {
    try {
      // Extract linked company ID from party data
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const response = await chatAPI.post(
        `/api/chat/mark-read/${targetCompanyId}`,
        {
          messageIds,
          type: "company",
          partyId,
          partyName,
        }
      );

      // Clear relevant caches
      this.clearHistoryCache(targetCompanyId);
      this.clearConversationCache();

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get chat analytics for party's linked company
   * @param {Object} partyData - Party data
   * @param {string} period - Analytics period
   * @returns {Promise<Object>} Analytics data
   */
  async getChatAnalytics(partyData, period = "7d") {
    try {
      // Extract linked company ID from party data
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      // Check cache first
      const cacheKey = `analytics_${targetCompanyId}_${period}`;
      const cachedAnalytics = this.getFromCache(cacheKey, "conversation");
      if (cachedAnalytics) {
        return cachedAnalytics;
      }

      const response = await chatAPI.get(
        `/api/chat/analytics/${targetCompanyId}`,
        {
          params: {
            period,
            type: "company",
            partyId,
            partyName,
          },
        }
      );

      // Cache the result (longer cache for analytics)
      this.setCache(cacheKey, response.data, "conversation");
      return response.data;
    } catch (error) {
      // Return default analytics instead of throwing error
      return {
        success: false,
        data: {
          messageCount: 0,
          responseTime: 0,
          activeUsers: 0,
          peakHours: [],
        },
      };
    }
  }

  /**
   * Send template message to party's linked company
   * @param {Object} partyData - Party data
   * @param {string} templateId - Template ID
   * @param {Object} customData - Custom template data
   * @returns {Promise<Object>} Send result
   */
  async sendTemplateMessage(partyData, templateId, customData = {}) {
    try {
      // Extract linked company ID from party data
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const response = await chatAPI.post(
        `/api/chat/template/${targetCompanyId}`,
        {
          templateId,
          customData,
          type: "company",
          partyId,
          partyName,
        }
      );

      // Clear relevant caches
      this.clearHistoryCache(targetCompanyId);
      this.clearConversationCache();

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get message delivery status for party's linked company
   * @param {Object} partyData - Party data
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Message status
   */
  async getMessageStatus(partyData, messageId) {
    try {
      // Extract linked company ID from party data
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const response = await chatAPI.get(
        `/api/chat/status/${targetCompanyId}/${messageId}`,
        {
          params: {
            type: "company",
            partyId,
            partyName,
          },
        }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get suppliers with linked companies
   * @param {Object} params - Filter parameters
   * @returns {Promise<Object>} Linked suppliers data
   */
  async getSuppliersWithLinkedCompanies(params = {}) {
    try {
      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const requestParams = {
        page: params.page || 1,
        limit: params.limit || 10,
        search: params.search || "",
        companyId: companyValidation.companyId,
      };

      const response = await apiClient.get("/api/parties/linked-suppliers", {
        params: requestParams,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a quick party (minimal data)
   * @param {Object} quickData - Quick party data
   * @returns {Promise<Object>} Created party data
   */
  async createQuickParty(quickData) {
    try {
      // Validate required fields
      if (!quickData.name || !quickData.phone) {
        throw new Error("Name and phone are required for quick party");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const backendData = {
        name: quickData.name.trim(),
        phone: quickData.phone.trim(),
        type: quickData.type || "customer",
      };

      const response = await apiClient.post("/api/parties/quick", backendData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if phone number exists in current company
   * @param {string} phoneNumber - Phone number to check
   * @returns {Promise<Object>} Check result
   */
  async checkPhoneExists(phoneNumber) {
    try {
      if (!phoneNumber?.trim()) {
        return {success: true, exists: false, party: null};
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const response = await apiClient.get(
        `/api/parties/check-phone/${phoneNumber.trim()}`
      );
      return response.data;
    } catch (error) {
      // If service is not available, return false to not block creation
      if (error.response?.status === 404) {
        return {success: true, exists: false, party: null};
      }
      throw error;
    }
  }

  /**
   * ✅ ENHANCED: Get parties with proper chat field population
   * @param {string|Object} companyIdOrFilters - Company ID or filters object
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Parties data with chat capabilities
   */
  async getParties(companyIdOrFilters = {}, filters = {}) {
    try {
      let actualFilters = {};
      let companyId = null;

      // Handle different parameter formats for backward compatibility
      if (typeof companyIdOrFilters === "string") {
        companyId = companyIdOrFilters;
        actualFilters = filters || {};
      } else {
        actualFilters = companyIdOrFilters || {};
      }

      // Extract filter parameters with defaults
      const {
        page = 1,
        limit = 10,
        search = "",
        partyType = null,
        type = null,
        sortBy = "createdAt",
        sortOrder = "desc",
        includeLinked = false,
        includeChatFields = true, // Always include chat fields
      } = actualFilters;

      // Validate company context if companyId not provided
      let companyValidation;
      if (!companyId) {
        companyValidation = this.validateCompanyContext();
        if (!companyValidation.isValid) {
          throw new Error(companyValidation.error);
        }
        companyId = companyValidation.companyId;
      }

      const mappedSortBy = this.mapSortKey(String(sortBy));

      // Always include chat fields and populate linked companies
      const params = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        type: partyType || type || "all",
        sortBy: mappedSortBy,
        sortOrder: String(sortOrder),
        companyId: companyId,
        includeLinked: includeLinked,
        includeChatFields: includeChatFields,
        populate: "linkedCompanyId", // Always populate
      };

      // Only add search if it's meaningful
      if (search && typeof search === "string" && search.trim() !== "") {
        params.search = search.trim();
      }

      const response = await apiClient.get("/api/parties", {params});

      // ✅ ENHANCED: Better chat field enhancement
      if (response.data.success && response.data.data?.parties) {
        const enhancedParties = response.data.data.parties.map((party) => {
          const chatCapability = this.validatePartyChatCapability(party);

          return {
            ...party,
            ...chatCapability,
          };
        });

        return {
          ...response.data,
          data: {
            ...response.data.data,
            parties: enhancedParties,
          },
        };
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Link party to company for chat
   * @param {string} partyId - Party ID
   * @param {string} targetCompanyId - Target company ID
   * @param {boolean} isExternal - Whether it's an external company
   * @returns {Promise<Object>} Linking result
   */
  async linkPartyToCompany(partyId, targetCompanyId, isExternal = false) {
    try {
      if (!partyId || !targetCompanyId) {
        throw new Error("Party ID and target company ID are required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const requestData = {
        targetCompanyId,
        isExternal,
      };

      const response = await apiClient.post(
        `/api/chat/link-party/${partyId}`,
        requestData
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unlink party from company
   * @param {string} partyId - Party ID
   * @returns {Promise<Object>} Unlinking result
   */
  async unlinkPartyFromCompany(partyId) {
    try {
      if (!partyId) {
        throw new Error("Party ID is required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const response = await apiClient.delete(
        `/api/chat/unlink-party/${partyId}`
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get companies available for linking
   * @returns {Promise<Object>} Available companies
   */
  async getLinkableCompanies() {
    try {
      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const response = await apiClient.get("/api/chat/linkable-companies");

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get party's linked company information
   * @param {string} partyId - Party ID
   * @returns {Promise<Object>} Linked company info
   */
  async getPartyCompanyLink(partyId) {
    try {
      if (!partyId) {
        throw new Error("Party ID is required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const response = await apiClient.get(
        `/api/chat/party-company-link/${partyId}`
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get parties with chat capabilities
   * @param {Object} params - Filter parameters
   * @returns {Promise<Object>} Chat-enabled parties
   */
  async getChatEnabledParties(params = {}) {
    try {
      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const requestParams = {
        page: params.page || 1,
        limit: params.limit || 20,
        search: params.search || "",
        companyId: companyValidation.companyId,
        includeLinked: true, // Only get parties with linked companies
        includeChatFields: true,
      };

      const response = await apiClient.get("/api/parties", {
        params: requestParams,
      });

      if (response.data.success && response.data.data?.parties) {
        // Filter only parties that can chat
        const chatEnabledParties = response.data.data.parties.filter(
          (party) =>
            party.canChat || party.linkedCompanyId || party.externalCompanyId
        );

        return {
          ...response.data,
          data: {
            ...response.data.data,
            parties: chatEnabledParties,
          },
        };
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * ✅ ENHANCED: Validate party chat capability with correct field checking
   * @param {Object} party - Party object
   * @returns {Object} Validation result
   */
  validatePartyChatCapability(party) {
    if (!party) {
      return {
        canChat: false,
        reason: "Party data is required",
      };
    }

    // ✅ FIXED: Check the correct fields in the right order
    let chatCompanyId = null;
    let chatCompanyName = null;

    if (party.chatCompanyId) {
      chatCompanyId = party.chatCompanyId;
      chatCompanyName = party.chatCompanyName || party.name;
    } else if (party.externalCompanyId) {
      chatCompanyId = party.externalCompanyId;
      chatCompanyName = party.supplierCompanyData?.businessName || party.name;
    } else if (party.linkedCompanyId) {
      if (
        typeof party.linkedCompanyId === "object" &&
        party.linkedCompanyId._id
      ) {
        chatCompanyId = party.linkedCompanyId._id;
        chatCompanyName = party.linkedCompanyId.businessName || party.name;
      } else if (typeof party.linkedCompanyId === "string") {
        chatCompanyId = party.linkedCompanyId;
        chatCompanyName = party.name;
      }
    }

    const hasLinkedCompany = !!chatCompanyId;

    return {
      canChat: hasLinkedCompany && !!chatCompanyId,
      reason: hasLinkedCompany ? null : "Party is not linked to any company",
      chatCompanyId,
      chatCompanyName,
      isLinkedSupplier: party.isLinkedSupplier || false,
      enableBidirectionalOrders: party.enableBidirectionalOrders || false,
    };
  }

  /**
   * Get party with full linking context for frontend
   * @param {string} partyId - Party ID
   * @returns {Promise<Object>} Party with full context
   */
  async getPartyWithFullContext(partyId) {
    try {
      // First get the party with chat fields
      const partyResponse = await this.getPartyForChat(partyId);

      if (!partyResponse.success) {
        throw new Error(partyResponse.message || "Failed to fetch party");
      }

      const party = partyResponse.data;

      // Validate chat capability
      const chatValidation = this.validatePartyChatCapability(party);

      // Get linked company info if available
      let linkedCompanyInfo = null;
      if (chatValidation.canChat) {
        try {
          const linkResponse = await this.getPartyCompanyLink(partyId);
          if (linkResponse.success) {
            linkedCompanyInfo = linkResponse.data;
          }
        } catch (error) {
          // Silent fail for linked company info
        }
      }

      const fullContext = {
        ...party,
        ...chatValidation,
        linkedCompanyInfo,
        fullContextLoaded: true,
      };

      return {
        success: true,
        data: fullContext,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete party
   * @param {string} companyIdOrPartyId - Company ID or Party ID (for backward compatibility)
   * @param {string} partyId - Party ID (when companyId is provided as first param)
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteParty(companyIdOrPartyId, partyId = null) {
    try {
      let actualPartyId;
      let companyId = null;

      // Handle different parameter formats for backward compatibility
      if (partyId) {
        // New format: deleteParty(companyId, partyId)
        companyId = companyIdOrPartyId;
        actualPartyId = partyId;
      } else {
        // Old format: deleteParty(partyId)
        actualPartyId = companyIdOrPartyId;
      }

      if (!actualPartyId) {
        throw new Error("Party ID is required");
      }

      // Validate company context if companyId not provided
      let companyValidation;
      if (!companyId) {
        companyValidation = this.validateCompanyContext();
        if (!companyValidation.isValid) {
          throw new Error(companyValidation.error);
        }
        companyId = companyValidation.companyId;
      }

      // Add company ID as query param
      const params = {
        companyId: companyId,
      };

      const response = await apiClient.delete(`/api/parties/${actualPartyId}`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get party by ID with chat fields populated
   * @param {string} partyId - Party ID
   * @returns {Promise<Object>} Party data with chat fields
   */
  async getPartyById(partyId) {
    try {
      if (!partyId) {
        throw new Error("Party ID is required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      // Always include chat fields and populate linked company
      const params = {
        companyId: companyValidation.companyId,
        includeChatFields: true,
        populate: "linkedCompanyId",
      };

      const response = await apiClient.get(`/api/parties/${partyId}`, {params});

      if (response.data.success && response.data.data) {
        const party = response.data.data;

        // Ensure chat fields are properly set
        const enhancedParty = {
          ...party,
          canChat: !!(party.linkedCompanyId || party.externalCompanyId),
          chatCompanyId:
            party.linkedCompanyId?._id ||
            party.linkedCompanyId ||
            party.externalCompanyId,
          chatCompanyName:
            party.linkedCompanyId?.businessName ||
            party.supplierCompanyData?.businessName ||
            party.name,
        };

        return {
          ...response.data,
          data: enhancedParty,
        };
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get party specifically for chat with all required fields
   * @param {string} partyId - Party ID
   * @returns {Promise<Object>} Party data optimized for chat
   */
  async getPartyForChat(partyId) {
    try {
      if (!partyId) {
        throw new Error("Party ID is required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const params = {
        companyId: companyValidation.companyId,
        includeChatFields: true,
        populate: "linkedCompanyId",
        select:
          "name phoneNumber email linkedCompanyId externalCompanyId isExternalCompany supplierCompanyData partyType isLinkedSupplier enableBidirectionalOrders",
      };

      const response = await apiClient.get(`/api/parties/${partyId}`, {params});

      if (response.data.success && response.data.data) {
        const party = response.data.data;

        // Ensure chat fields are properly set
        const enhancedParty = {
          ...party,
          canChat: !!(party.linkedCompanyId || party.externalCompanyId),
          chatCompanyId:
            party.linkedCompanyId?._id ||
            party.linkedCompanyId ||
            party.externalCompanyId,
          chatCompanyName:
            party.linkedCompanyId?.businessName ||
            party.supplierCompanyData?.businessName ||
            party.name,
        };

        return {
          ...response.data,
          data: enhancedParty,
        };
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Enhanced search parties with linking information
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchParties(params) {
    try {
      const {
        query,
        partyType,
        limit = 20,
        page = 1,
        includeLinked = false,
      } = params;

      if (!query || query.length < 2) {
        return {
          success: true,
          data: [],
        };
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const requestParams = {
        search: query.trim(),
        limit: parseInt(limit, 10),
        page: parseInt(page, 10),
        companyId: companyValidation.companyId,
        includeLinked: includeLinked,
      };

      if (partyType && partyType !== "all") {
        requestParams.type = partyType;
      }

      const response = await apiClient.get("/api/parties/search", {
        params: requestParams,
      });

      return {
        success: true,
        data: response.data.data || response.data.parties || [],
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  }

  /**
   * Search external databases (for DatabaseSearch component)
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchExternalDatabase(params) {
    try {
      const {query, filter, source, limit = 10} = params;

      if (!query || query.length < 2) {
        return {
          success: true,
          data: [],
        };
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const requestData = {
        query: query.trim(),
        filter: filter || "all",
        source: source || "all",
        limit: parseInt(limit, 10),
        companyId: companyValidation.companyId,
      };

      const response = await apiClient.post(
        "/api/parties/search/external",
        requestData
      );

      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  }

  /**
   * Search companies from local database (for AddNewParty auto-complete)
   * @param {string} query - Search query
   * @returns {Promise<Object>} Search results
   */
  async searchCompanies(query) {
    try {
      if (!query || query.length < 2) {
        return {
          success: true,
          data: [],
        };
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const response = await apiClient.get(`/api/parties/search/companies`, {
        params: {
          q: query.trim(),
          companyId: companyValidation.companyId,
          limit: 10,
        },
      });

      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  }

  /**
   * Search external company databases with linking support
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchExternalCompanies(params = {}) {
    try {
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const response = await apiClient.post("/api/companies/search/external", {
        ...params,
        companyId: companyValidation.companyId,
      });

      return response.data;
    } catch (error) {
      // Return empty results instead of throwing error for external searches
      return {
        success: true,
        data: [],
        message: "External company databases unavailable",
      };
    }
  }

  /**
   * Test connection to backend (for DatabaseSearch component)
   * @returns {Promise<Object>} Connection status
   */
  async testConnection() {
    try {
      const response = await apiClient.get("/api/health");
      return {
        success: true,
        status: "connected",
        data: response.data,
      };
    } catch (error) {
      throw new Error("Backend connection failed");
    }
  }

  /**
   * Search parties (legacy method - now uses searchParties)
   * @param {string} query - Search query
   * @param {string} type - Party type filter (optional)
   * @param {number} limit - Result limit (default: 10)
   * @returns {Promise<Object>} Search results
   */
  async searchPartiesLegacy(query, type = null, limit = 10) {
    try {
      if (!query || query.length < 2) {
        return {
          success: true,
          data: [],
        };
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const params = {
        limit,
        companyId: companyValidation.companyId, // Add as fallback
      };

      if (type && type !== "all") {
        params.type = type;
      }

      const response = await apiClient.get(
        `/api/parties/search/${encodeURIComponent(query.trim())}`,
        {params}
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get party statistics with linking information
   * @returns {Promise<Object>} Party statistics
   */
  async getPartyStats() {
    try {
      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      // Add company ID as query param as fallback
      const params = {
        companyId: companyValidation.companyId,
      };

      const response = await apiClient.get("/api/parties/stats", {params});
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if party service is available (health check)
   * @returns {Promise<boolean>} Service availability
   */
  async checkServiceHealth() {
    try {
      // For health check, just try to get stats with company validation
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        return false;
      }

      const response = await apiClient.get("/api/parties/stats", {
        params: {companyId: companyValidation.companyId},
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * ✅ Get current company context
   * @returns {Object|null} Current company data
   */
  getCurrentCompany() {
    const validation = this.validateCompanyContext();
    return validation.isValid ? validation.company : null;
  }

  /**
   * ✅ Get current company ID
   * @returns {string|null} Current company ID
   */
  getCurrentCompanyId() {
    const validation = this.validateCompanyContext();
    return validation.isValid ? validation.companyId : null;
  }

  /**
   * Get valid sort keys for frontend reference
   * @returns {Object} Frontend to backend sort key mapping
   */
  getValidSortKeys() {
    return {
      balance: "currentBalance",
      name: "name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      partyType: "partyType",
      creditLimit: "creditLimit",
      gstType: "gstType",
    };
  }

  /**
   * Validate party data with linking fields
   * @param {Object} partyData - Party data to validate
   * @returns {Object} Validation result
   */
  validatePartyData(partyData) {
    const errors = [];

    // Name validation
    if (!partyData.name || partyData.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    }

    if (partyData.name && partyData.name.trim().length > 100) {
      errors.push("Name cannot exceed 100 characters");
    }

    // Phone number validation
    if (
      !partyData.phoneNumber ||
      !/^[6-9]\d{9}$/.test(partyData.phoneNumber.trim())
    ) {
      errors.push(
        "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9"
      );
    }

    // Email validation
    if (
      partyData.email &&
      partyData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partyData.email.trim())
    ) {
      errors.push("Email format is invalid");
    }

    // GST number validation (only if type is not unregistered)
    if (
      partyData.gstType !== "unregistered" &&
      partyData.gstNumber &&
      partyData.gstNumber.trim()
    ) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(partyData.gstNumber.trim().toUpperCase())) {
        errors.push(
          "Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)"
        );
      }
    }

    // Credit limit validation
    if (partyData.creditLimit !== undefined && partyData.creditLimit < 0) {
      errors.push("Credit limit cannot be negative");
    }

    // Opening balance validation
    if (
      partyData.openingBalance !== undefined &&
      partyData.openingBalance < 0
    ) {
      errors.push("Opening balance cannot be negative");
    }

    // Pincode validation
    if (
      partyData.homePincode &&
      partyData.homePincode.trim() &&
      !/^[0-9]{6}$/.test(partyData.homePincode.trim())
    ) {
      errors.push("Home pincode must be exactly 6 digits");
    }

    if (
      partyData.deliveryPincode &&
      partyData.deliveryPincode.trim() &&
      !/^[0-9]{6}$/.test(partyData.deliveryPincode.trim())
    ) {
      errors.push("Delivery pincode must be exactly 6 digits");
    }

    // Linking field validation
    if (
      partyData.linkedCompanyId &&
      !partyData.linkedCompanyId.match(/^[0-9a-fA-F]{24}$/)
    ) {
      errors.push("Invalid linked company ID format");
    }

    if (
      partyData.externalCompanyId &&
      typeof partyData.externalCompanyId !== "string"
    ) {
      errors.push("External company ID must be a string");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format party data for display with linking information
   * @param {Object} partyData - Raw party data from backend
   * @returns {Object} Normalized party data
   */
  formatPartyForDisplay(partyData) {
    if (!partyData) return null;

    const formatted = {
      id: partyData._id || partyData.id,
      name: partyData.name || "",
      partyType: partyData.partyType || "customer",
      phoneNumber: partyData.phoneNumber || partyData.phone || "",
      email: partyData.email || "",
      companyName: partyData.companyName || "",

      // Financial fields
      currentBalance: partyData.currentBalance || partyData.balance || 0,
      creditLimit: partyData.creditLimit || 0,
      openingBalance: partyData.openingBalance || 0,

      // GST fields
      gstNumber: partyData.gstNumber || "",
      gstType: partyData.gstType || "unregistered",

      // Address fields
      homeAddressLine: partyData.homeAddressLine || "",
      homePincode: partyData.homePincode || "",
      homeState: partyData.homeState || "",
      homeDistrict: partyData.homeDistrict || "",
      homeTaluka: partyData.homeTaluka || "",

      deliveryAddressLine: partyData.deliveryAddressLine || "",
      deliveryPincode: partyData.deliveryPincode || "",
      deliveryState: partyData.deliveryState || "",
      deliveryDistrict: partyData.deliveryDistrict || "",
      deliveryTaluka: partyData.deliveryTaluka || "",
      sameAsHomeAddress: partyData.sameAsHomeAddress || false,

      // Phone numbers array
      phoneNumbers: partyData.phoneNumbers || [],

      // Chat and linking fields
      linkedCompanyId: partyData.linkedCompanyId || null,
      isLinkedSupplier: partyData.isLinkedSupplier || false,
      enableBidirectionalOrders: partyData.enableBidirectionalOrders || false,
      bidirectionalOrderReady: partyData.bidirectionalOrderReady || false,
      linkedCompany: partyData.linkedCompany || null,
      autoLinkByGST:
        partyData.autoLinkByGST !== undefined ? partyData.autoLinkByGST : true,
      autoLinkByPhone:
        partyData.autoLinkByPhone !== undefined
          ? partyData.autoLinkByPhone
          : true,
      autoLinkByEmail:
        partyData.autoLinkByEmail !== undefined
          ? partyData.autoLinkByEmail
          : true,
      externalCompanyId: partyData.externalCompanyId || null,
      isExternalCompany: partyData.isExternalCompany || false,
      supplierCompanyData: partyData.supplierCompanyData || null,

      // Chat capability fields
      canChat:
        partyData.canChat ||
        !!(partyData.linkedCompanyId || partyData.externalCompanyId),
      chatCompanyId:
        partyData.chatCompanyId ||
        partyData.linkedCompanyId?._id ||
        partyData.linkedCompanyId ||
        partyData.externalCompanyId,
      chatCompanyName:
        partyData.chatCompanyName ||
        partyData.linkedCompanyId?.businessName ||
        partyData.supplierCompanyData?.businessName ||
        partyData.name,

      // Additional business fields
      website: partyData.website || "",
      businessType: partyData.businessType || "",
      businessCategory: partyData.businessCategory || "",
      companyType: partyData.companyType || "",
      incorporationDate: partyData.incorporationDate || null,
      cinNumber: partyData.cinNumber || "",
      authorizedCapital: partyData.authorizedCapital || "",
      paidUpCapital: partyData.paidUpCapital || "",
      establishedYear: partyData.establishedYear || "",
      description: partyData.description || "",
      ownerInfo: partyData.ownerInfo || null,

      // Metadata
      country: partyData.country || "INDIA",
      createdAt: partyData.createdAt,
      updatedAt: partyData.updatedAt,
      companyId: partyData.companyId,
      source: partyData.source || "Manual Entry",
      isVerified: partyData.isVerified || false,
      importedFrom: partyData.importedFrom || null,
      importedAt: partyData.importedAt || null,
    };

    return formatted;
  }

  /**
   * Bulk operations for parties
   * @param {Array} partyIds - Array of party IDs
   * @param {string} operation - Operation type ('delete', 'export', etc.)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Operation result
   */
  async bulkOperation(partyIds, operation, options = {}) {
    try {
      if (!Array.isArray(partyIds) || partyIds.length === 0) {
        throw new Error("Party IDs array is required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const requestData = {
        partyIds,
        operation,
        options,
        companyId: companyValidation.companyId,
      };

      const response = await apiClient.post("/api/parties/bulk", requestData);
      return response.data;
    } catch (error) {
      console.error("❌ PartyService.bulkOperation error:", error);
      throw error;
    }
  }

  /**
   * Export parties to CSV/Excel
   * @param {Object} filters - Export filters
   * @param {string} format - Export format ('csv', 'excel')
   * @returns {Promise<Blob>} File blob for download
   */
  async exportParties(filters = {}, format = "csv") {
    try {
      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const params = {
        ...filters,
        format,
        companyId: companyValidation.companyId,
      };

      // Map sort key if present
      if (params.sortBy) {
        params.sortBy = this.mapSortKey(params.sortBy);
      }

      const response = await apiClient.get("/api/parties/export", {
        params,
        responseType: "blob",
      });

      return response.data;
    } catch (error) {
      console.error("❌ PartyService.exportParties error:", error);
      throw error;
    }
  }

  /**
   * Get party ledger/statement
   * @param {string} partyId - Party ID
   * @param {Object} params - Date range and other parameters
   * @returns {Promise<Object>} Party ledger data
   */
  async getPartyLedger(partyId, params = {}) {
    try {
      if (!partyId) {
        throw new Error("Party ID is required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const requestParams = {
        startDate: params.startDate,
        endDate: params.endDate,
        includeOrders: params.includeOrders !== false,
        includePayments: params.includePayments !== false,
        companyId: companyValidation.companyId,
      };

      const response = await apiClient.get(`/api/parties/${partyId}/ledger`, {
        params: requestParams,
      });

      return response.data;
    } catch (error) {
      console.error("❌ Error getting party ledger:", error);
      throw error;
    }
  }

  /**
   * Update party balance
   * @param {string} partyId - Party ID
   * @param {number} amount - Amount to add/subtract
   * @param {string} type - Transaction type
   * @param {string} description - Transaction description
   * @returns {Promise<Object>} Updated balance
   */
  async updatePartyBalance(partyId, amount, type, description) {
    try {
      if (!partyId) {
        throw new Error("Party ID is required");
      }

      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const response = await apiClient.post(`/api/parties/${partyId}/balance`, {
        amount,
        type,
        description,
        companyId: companyValidation.companyId,
      });

      return response.data;
    } catch (error) {
      console.error("❌ Error updating party balance:", error);
      throw error;
    }
  }

  /**
   * Get customer statistics
   * @returns {Promise<Object>} Customer statistics
   */
  async getCustomerStats() {
    try {
      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const response = await apiClient.get("/api/parties/stats/customers", {
        params: {companyId: companyValidation.companyId},
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error getting customer stats:", error);
      return {
        total: 0,
        active: 0,
        withOrders: 0,
        totalCreditLimit: 0,
        totalOutstanding: 0,
      };
    }
  }

  /**
   * ✅ ENHANCED: Get supplier statistics with linking information
   * @returns {Promise<Object>} Supplier statistics
   */
  async getSupplierStats() {
    try {
      // Validate company context
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      const response = await apiClient.get("/api/parties/stats/suppliers", {
        params: {companyId: companyValidation.companyId},
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error getting supplier stats:", error);
      return {
        total: 0,
        active: 0,
        withPurchases: 0,
        totalPayable: 0,
        linkedCount: 0, // ✅ NEW
        bidirectionalReadyCount: 0, // ✅ NEW
      };
    }
  }
}

// Create and export singleton instance
const partyService = new PartyService();
export default partyService;
