import axios from "axios";
import apiConfig from "../config/api";

const API_BASE_URL = apiConfig.baseURL;

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token and company context
apiClient.interceptors.request.use(
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
apiClient.interceptors.response.use(
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

class PartyService {
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
   * ✅ ENHANCED: Create a new party with linking support
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

      // ✅ ENHANCED: Transform the form data to match backend schema with linking fields
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

        // ✅ NEW: Bidirectional linking fields
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

        // ✅ NEW: Additional business fields
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

      console.log("💾 Creating party with linking data:", {
        name: backendData.name,
        partyType: backendData.partyType,
        linkedCompanyId: backendData.linkedCompanyId,
        isLinkedSupplier: backendData.isLinkedSupplier,
        enableBidirectionalOrders: backendData.enableBidirectionalOrders,
        supplierCompanyData: !!backendData.supplierCompanyData,
      });

      const response = await apiClient.post("/api/parties", backendData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * ✅ NEW: Create party with enhanced linking support
   * @param {Object} partyData - Party data with linking fields
   * @returns {Promise<Object>} Created party data with linking info
   */
  async createPartyWithLinking(partyData) {
    try {
      console.log(
        "🔗 Creating party with enhanced linking support:",
        partyData
      );

      // Use enhanced endpoint if available, fallback to regular
      const endpoint = "/api/parties/create-with-linking";

      try {
        const response = await apiClient.post(endpoint, partyData);
        return response.data;
      } catch (error) {
        // Fallback to regular creation if enhanced endpoint doesn't exist
        if (error.response?.status === 404) {
          console.log(
            "📝 Enhanced endpoint not available, using regular creation"
          );
          return await this.createParty(partyData);
        }
        throw error;
      }
    } catch (error) {
      console.error("❌ Error creating party with linking:", error);
      throw error;
    }
  }

  /**
   * ✅ ENHANCED: Update party with linking support
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

      // ✅ ENHANCED: Transform the form data to match backend schema with linking fields
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

        // ✅ NEW: Bidirectional linking fields
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

        // ✅ NEW: Additional business fields
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

      console.log("📝 Updating party with linking data:", {
        partyId,
        linkedCompanyId: backendData.linkedCompanyId,
        isLinkedSupplier: backendData.isLinkedSupplier,
        enableBidirectionalOrders: backendData.enableBidirectionalOrders,
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
   * ✅ NEW: Update party with enhanced linking support
   * @param {string} partyId - Party ID
   * @param {Object} partyData - Updated party data with linking fields
   * @returns {Promise<Object>} Updated party data with linking info
   */
  async updatePartyWithLinking(partyId, partyData) {
    try {
      console.log("🔗 Updating party with enhanced linking support:", {
        partyId,
        partyData,
      });

      // Use enhanced endpoint if available, fallback to regular
      const endpoint = `/api/parties/${partyId}/update-with-linking`;

      try {
        const response = await apiClient.put(endpoint, partyData);
        return response.data;
      } catch (error) {
        // Fallback to regular update if enhanced endpoint doesn't exist
        if (error.response?.status === 404) {
          console.log(
            "📝 Enhanced endpoint not available, using regular update"
          );
          return await this.updateParty(partyId, partyData);
        }
        throw error;
      }
    } catch (error) {
      console.error("❌ Error updating party with linking:", error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Link supplier to company
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

      console.log("🔗 Linking supplier to company:", requestData);

      const response = await apiClient.post(
        "/api/parties/link-supplier",
        requestData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error linking supplier to company:", error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Get suppliers with linked companies
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
      console.error("❌ Error getting linked suppliers:", error);
      throw error;
    }
  }

  // ... keep all existing methods with enhancements ...

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
   * ✅ ENHANCED: Get all parties with linking information
   * @param {string|Object} companyIdOrFilters - Company ID or filters object (for backward compatibility)
   * @param {Object} filters - Filter options (when companyId is provided as first param)
   * @returns {Promise<Object>} Parties data with pagination
   */
  async getParties(companyIdOrFilters = {}, filters = {}) {
    try {
      let actualFilters = {};
      let companyId = null;

      // Handle different parameter formats for backward compatibility
      if (typeof companyIdOrFilters === "string") {
        // New format: getParties(companyId, filters)
        companyId = companyIdOrFilters;
        actualFilters = filters || {};
      } else {
        // Old format: getParties(filters)
        actualFilters = companyIdOrFilters || {};
      }

      // Extract filter parameters with defaults
      const {
        page = 1,
        limit = 10,
        search = "",
        partyType = null,
        type = null, // Handle both partyType and type for compatibility
        sortBy = "createdAt",
        sortOrder = "desc",
        includeLinked = false, // ✅ NEW: Filter for linked suppliers only
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

      // ✅ Map the sort key to backend expected format
      const mappedSortBy = this.mapSortKey(String(sortBy));

      // Build request parameters
      const params = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        type: partyType || type || "all",
        sortBy: mappedSortBy, // Use mapped sort key
        sortOrder: String(sortOrder),
        companyId: companyId,
        includeLinked: includeLinked, // ✅ NEW: Include linked filter
      };

      // Only add search if it's not empty and is a string
      if (search && typeof search === "string" && search.trim() !== "") {
        params.search = search.trim();
      } else if (search && typeof search !== "string") {
        // Convert non-string search to string and check if it's meaningful
        const searchString = String(search).trim();
        if (
          searchString !== "" &&
          searchString !== "undefined" &&
          searchString !== "null"
        ) {
          params.search = searchString;
        }
      }

      const response = await apiClient.get("/api/parties", {params});
      return response.data;
    } catch (error) {
      console.error("❌ PartyService.getParties error:", error);
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
      console.error("❌ PartyService.deleteParty error:", error);
      throw error;
    }
  }

  /**
   * ✅ ENHANCED: Get party by ID with linking information
   * @param {string} partyId - Party ID
   * @returns {Promise<Object>} Party data
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

      // Add company ID as query param as fallback
      const params = {
        companyId: companyValidation.companyId,
      };

      const response = await apiClient.get(`/api/parties/${partyId}`, {params});
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * ✅ ENHANCED: Search parties with linking information
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
        includeLinked: includeLinked, // ✅ NEW: Include linked filter
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
      console.error("❌ Error searching parties:", error);
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
      console.error("❌ Error searching external database:", error);
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
      console.error("❌ Error searching companies:", error);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  }

  // ✅ ENHANCED: Search external company databases with linking support
  async searchExternalCompanies(params = {}) {
    try {
      const companyValidation = this.validateCompanyContext();
      if (!companyValidation.isValid) {
        throw new Error(companyValidation.error);
      }

      console.log("🌐 Searching external companies with params:", params);

      const response = await apiClient.post("/api/companies/search/external", {
        ...params,
        companyId: companyValidation.companyId,
      });

      console.log("📥 External companies search response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error searching external companies:", error);
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
      console.error("❌ Connection test failed:", error);
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
   * ✅ ENHANCED: Get party statistics with linking information
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
   * Get current company context
   * @returns {Object|null} Current company data
   */
  getCurrentCompany() {
    const validation = this.validateCompanyContext();
    return validation.isValid ? validation.company : null;
  }

  /**
   * Get current company ID
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
   * ✅ ENHANCED: Validate party data with linking fields
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

    // ✅ NEW: Linking field validation
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
   * ✅ ENHANCED: Format party data for display with linking information
   * @param {Object} partyData - Raw party data from backend
   * @returns {Object} Normalized party data
   */
  formatPartyForDisplay(partyData) {
    if (!partyData) return null;

    return {
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

      // ✅ NEW: Linking fields
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

      // ✅ NEW: Additional business fields
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
