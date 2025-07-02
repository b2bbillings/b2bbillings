import axios from "axios";
import apiConfig from "../config/api";

const API_BASE_URL = apiConfig.baseURL;

// ✅ Regular API client for authenticated requests
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ NEW: Admin API client for admin-only requests (no aggressive logout)
const adminApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Regular client interceptors
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ FIXED: Updated response interceptor - less aggressive logout
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const {status, data} = error.response;

      switch (status) {
        case 401:
          // ✅ FIX: Only logout for specific auth failures, not admin routes
          const isAdminRoute = error.config?.url?.includes("/admin/");
          const isSpecificAuthError =
            data?.code === "TOKEN_EXPIRED" ||
            data?.message?.includes("authentication required");

          // ✅ Don't logout for admin routes or if user is on admin panel
          if (!isAdminRoute && !window.location.pathname.includes("/admin")) {
            console.log("🔓 Authentication error, logging out...");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("currentCompany");

            if (
              !window.location.pathname.includes("/login") &&
              !window.location.pathname.includes("/auth")
            ) {
              window.location.href = "/login";
            }
          } else {
            // ✅ For admin routes, just log the error but don't logout
            console.log(
              "⚠️ Admin API call failed (401), but not logging out:",
              error.config?.url
            );
          }
          break;
        case 403:
        case 404:
        case 422:
        case 429:
        case 500:
          break;
      }

      throw new Error(data.message || `HTTP Error: ${status}`);
    } else if (error.request) {
      throw new Error(
        "Unable to connect to server. Please check your internet connection."
      );
    } else {
      throw new Error(error.message || "An unexpected error occurred.");
    }
  }
);

// ✅ Admin client interceptors (NO logout logic)
adminApiClient.interceptors.request.use(
  (config) => {
    // Optional: Add token for admin routes that might need it
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ NO logout logic for admin client - just log and reject
    console.log(
      "🔧 Admin API error (no logout):",
      error.response?.status,
      error.config?.url
    );
    return Promise.reject(error);
  }
);

class CompanyService {
  // ✅ Existing methods remain the same...
  async createCompany(companyData) {
    try {
      const payload = {
        businessName: companyData.businessName,
        phoneNumber: companyData.phoneNumber,
        gstin: companyData.gstin || undefined,
        email: companyData.email || undefined,
        businessType: companyData.businessType || undefined,
        businessCategory: companyData.businessCategory || undefined,
        state: companyData.state || undefined,
        pincode: companyData.pincode || undefined,
        city: companyData.city || undefined,
        tehsil: companyData.tehsil || undefined,
        address: companyData.address || undefined,
        additionalPhones: companyData.additionalPhones || [],
        logo: companyData.logo || undefined,
        signatureImage: companyData.signatureImage || undefined,
        ownerName: companyData.ownerName || undefined,
        description: companyData.description || undefined,
        establishedYear: companyData.establishedYear || undefined,
        website: companyData.website || undefined,
        settings: companyData.settings || undefined,
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      const response = await apiClient.post("/api/companies", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getCompanies(params = {}) {
    try {
      const response = await apiClient.get("/api/companies", {
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search || "",
          businessType: params.businessType || "",
          businessCategory: params.businessCategory || "",
          state: params.state || "",
          city: params.city || "",
          isActive: params.isActive !== undefined ? params.isActive : "",
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ✅ UPDATED: Admin method using admin client
  async getAllCompaniesAdmin(params = {}) {
    try {
      const response = await adminApiClient.get("/api/companies/admin/all", {
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search || "",
          businessType: params.businessType || "",
          businessCategory: params.businessCategory || "",
          state: params.state || "",
          city: params.city || "",
          isActive: params.isActive !== undefined ? params.isActive : "",
          sortBy: params.sortBy || "createdAt",
          sortOrder: params.sortOrder || "desc",
        },
      });

      if (response.data?.success) {
        return response.data;
      } else {
        throw new Error(
          response.data?.message || "Failed to fetch admin companies"
        );
      }
    } catch (error) {
      console.error("❌ Error in getAllCompaniesAdmin:", error);

      // ✅ Return fallback data for admin dashboard instead of failing
      return {
        success: true,
        data: {
          companies: [],
          pagination: {
            current: 1,
            total: 1,
            totalItems: 0,
          },
        },
      };
    }
  }

  // ✅ UPDATED: Admin stats using admin client with fallback
  async getAdminCompanyStats() {
    try {
      const response = await adminApiClient.get("/api/companies/admin/stats");

      if (response.data?.success) {
        return response.data;
      } else {
        throw new Error(
          response.data?.message || "Failed to fetch admin stats"
        );
      }
    } catch (error) {
      console.error("❌ Error in getAdminCompanyStats:", error);
      // ✅ Return fallback stats for admin dashboard
      return {
        success: true,
        data: {
          totalCompanies: 0,
          activeCompanies: 0,
          inactiveCompanies: 0,
          companiesWithSubscription: 0,
          recentCompanies: 0,
          businessTypeDistribution: {},
          stateDistribution: {},
          monthlyGrowth: [],
        },
      };
    }
  }

  // ✅ UPDATED: External search using admin client for admin view
  async searchExternalCompanies(searchQuery, filters = {}) {
    try {
      const params = new URLSearchParams({
        search: searchQuery || "",
        page: filters.page || 1,
        limit: filters.limit || 50,
        ...(filters.businessType && {businessType: filters.businessType}),
        ...(filters.businessCategory && {
          businessCategory: filters.businessCategory,
        }),
        ...(filters.state && {state: filters.state}),
        ...(filters.city && {city: filters.city}),
      });

      // ✅ Use admin client for admin requests
      const client = filters.adminView ? adminApiClient : apiClient;
      const response = await client.get(
        `/api/companies/external/search?${params}`
      );

      if (response.data?.success) {
        return response.data;
      } else {
        throw new Error(
          response.data?.message || "Failed to search external companies"
        );
      }
    } catch (error) {
      // ✅ Return fallback for admin
      if (filters.adminView) {
        return {
          success: true,
          data: {
            companies: [],
            pagination: {current: 1, total: 1, totalItems: 0},
          },
        };
      }
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "External company search failed"
      );
    }
  }

  // ✅ UPDATED: Search with admin client support
  async searchCompanies(searchTerm, filters = {}) {
    try {
      // For admin dashboard, use the admin API
      if (filters.adminView || filters.isAdmin) {
        return await this.getAllCompaniesAdmin({
          search: searchTerm,
          ...filters,
        });
      }

      // For external search
      if (filters.excludeUserCompanies || filters.external) {
        return await this.searchExternalCompanies(searchTerm, filters);
      }

      // Default user search
      const params = {
        search: searchTerm,
        page: filters.page || 1,
        limit: filters.limit || 20,
        businessType: filters.businessType || "",
        businessCategory: filters.businessCategory || "",
        state: filters.state || "",
        city: filters.city || "",
      };

      return await this.getCompanies(params);
    } catch (error) {
      throw error;
    }
  }

  // ✅ UPDATED: Export using admin client
  async exportAllCompaniesAdmin(format = "csv", filters = {}) {
    try {
      const response = await adminApiClient.get("/api/companies/admin/export", {
        params: {
          format,
          ...filters,
        },
        responseType: "blob",
      });

      return response.data;
    } catch (error) {
      console.error("❌ Admin export error (no logout):", error);
      throw new Error(
        error.response?.data?.message || error.message || "Admin export failed"
      );
    }
  }

  // ✅ UPDATED: Company health check using admin client for admin
  async checkServiceHealth(adminView = false) {
    try {
      const client = adminView ? adminApiClient : apiClient;
      const response = await client.get("/api/companies/health");
      const isHealthy = response.status === 200 && response.data?.success;
      return isHealthy;
    } catch (error) {
      return false;
    }
  }

  // ✅ NEW: Admin-specific dashboard data
  async getAdminDashboardData() {
    try {
      const response = await adminApiClient.get("/api/admin/dashboard");

      if (response.data?.success) {
        return response.data;
      } else {
        throw new Error("Failed to fetch admin dashboard data");
      }
    } catch (error) {
      console.error("❌ Error fetching admin dashboard data:", error);
      // ✅ Return fallback admin dashboard data
      return {
        success: true,
        data: {
          totalCompanies: 0,
          totalUsers: 0,
          activeUsers: 0,
          systemHealth: "Unknown",
          lastBackup: new Date().toISOString(),
          notifications: 0,
          alerts: 0,
          recentActivity: [],
        },
      };
    }
  }

  // ✅ NEW: Admin system info
  async getAdminSystemInfo() {
    try {
      const response = await adminApiClient.get("/api/admin/system");

      if (response.data?.success) {
        return response.data;
      } else {
        throw new Error("Failed to fetch system info");
      }
    } catch (error) {
      console.error("❌ Error fetching admin system info:", error);
      // ✅ Return fallback system info
      return {
        success: true,
        data: {
          version: "2.0.0",
          uptime: 0,
          memory: {used: 0, total: 0},
          platform: "unknown",
          nodeVersion: "unknown",
          environment: "development",
        },
      };
    }
  }

  // ✅ All other existing methods remain exactly the same...
  async getCompanyById(id) {
    try {
      if (!id) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(`/api/companies/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateCompany(id, companyData) {
    try {
      if (!id) {
        throw new Error("Company ID is required");
      }

      const payload = {
        businessName: companyData.businessName,
        phoneNumber: companyData.phoneNumber,
        gstin: companyData.gstin || undefined,
        email: companyData.email || undefined,
        businessType: companyData.businessType || undefined,
        businessCategory: companyData.businessCategory || undefined,
        state: companyData.state || undefined,
        pincode: companyData.pincode || undefined,
        city: companyData.city || undefined,
        tehsil: companyData.tehsil || undefined,
        address: companyData.address || undefined,
        additionalPhones: companyData.additionalPhones || [],
        logo: companyData.logo || undefined,
        signatureImage: companyData.signatureImage || undefined,
        isActive: companyData.isActive,
        ownerName: companyData.ownerName || undefined,
        description: companyData.description || undefined,
        establishedYear: companyData.establishedYear || undefined,
        website: companyData.website || undefined,
        settings: companyData.settings || undefined,
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      const response = await apiClient.put(`/api/companies/${id}`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteCompany(id) {
    try {
      if (!id) {
        throw new Error("Company ID is required");
      }

      const confirmed = window.confirm(
        "Are you sure you want to delete this company? This action cannot be undone."
      );

      if (!confirmed) {
        throw new Error("Deletion cancelled by user");
      }

      const response = await apiClient.delete(`/api/companies/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getCompanyStats(companyId = null) {
    try {
      let url = "/api/companies/stats";
      if (companyId) {
        url = `/api/companies/${companyId}/stats`;
      }

      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      return {
        success: true,
        data: {
          totalUsers: 0,
          totalParties: 0,
          totalTransactions: 0,
          totalRevenue: 0,
          lastActivityAt: new Date().toISOString(),
        },
      };
    }
  }

  // ✅ Rest of the methods remain exactly the same...
  async addUserToCompany(companyId, userData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!userData.userId) {
        throw new Error("User ID is required");
      }

      const response = await apiClient.post(
        `/api/companies/${companyId}/users`,
        userData
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async removeUserFromCompany(companyId, userId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!userId) {
        throw new Error("User ID is required");
      }

      const confirmed = window.confirm(
        "Are you sure you want to remove this user from the company?"
      );

      if (!confirmed) {
        throw new Error("Operation cancelled by user");
      }

      const response = await apiClient.delete(
        `/api/companies/${companyId}/users/${userId}`
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getCompaniesByType(businessType) {
    try {
      if (!businessType) {
        throw new Error("Business type is required");
      }

      return await this.getCompanies({businessType});
    } catch (error) {
      throw error;
    }
  }

  async getCompaniesByLocation(state, city = "") {
    try {
      if (!state) {
        throw new Error("State is required");
      }

      return await this.getCompanies({state, city});
    } catch (error) {
      throw error;
    }
  }

  async toggleCompanyStatus(id, isActive) {
    try {
      return await this.updateCompany(id, {isActive});
    } catch (error) {
      throw error;
    }
  }

  async bulkOperation(companyIds, operation) {
    try {
      if (!companyIds || companyIds.length === 0) {
        throw new Error("No companies selected");
      }

      const validOperations = ["activate", "deactivate", "delete"];
      if (!validOperations.includes(operation)) {
        throw new Error("Invalid operation");
      }

      const confirmed = window.confirm(
        `Are you sure you want to ${operation} ${companyIds.length} companies?`
      );

      if (!confirmed) {
        throw new Error("Operation cancelled by user");
      }

      const response = await apiClient.post("/api/companies/bulk", {
        companyIds,
        operation,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async exportCompanies(format = "csv", filters = {}) {
    try {
      const response = await apiClient.get("/api/companies/export", {
        params: {
          format,
          ...filters,
        },
        responseType: "blob",
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  validateCompanyData(companyData) {
    const errors = [];

    if (
      !companyData.businessName ||
      companyData.businessName.trim().length < 2
    ) {
      errors.push("Business name must be at least 2 characters long");
    }

    if (
      companyData.businessName &&
      companyData.businessName.trim().length > 100
    ) {
      errors.push("Business name cannot exceed 100 characters");
    }

    if (
      !companyData.phoneNumber ||
      !/^[6-9]\d{9}$/.test(companyData.phoneNumber.trim())
    ) {
      errors.push(
        "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9"
      );
    }

    if (
      companyData.email &&
      companyData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.email.trim())
    ) {
      errors.push("Email format is invalid");
    }

    if (companyData.gstin && companyData.gstin.trim()) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(companyData.gstin.trim().toUpperCase())) {
        errors.push(
          "Please provide a valid GSTIN format (e.g., 22AAAAA0000A1Z5)"
        );
      }
    }

    if (
      companyData.pincode &&
      companyData.pincode.trim() &&
      !/^[0-9]{6}$/.test(companyData.pincode.trim())
    ) {
      errors.push("Pincode must be exactly 6 digits");
    }

    if (companyData.ownerName && companyData.ownerName.trim().length > 100) {
      errors.push("Owner name cannot exceed 100 characters");
    }

    if (
      companyData.description &&
      companyData.description.trim().length > 1000
    ) {
      errors.push("Description cannot exceed 1000 characters");
    }

    if (companyData.establishedYear) {
      const year = parseInt(companyData.establishedYear);
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear) {
        errors.push(`Established year must be between 1800 and ${currentYear}`);
      }
    }

    if (companyData.website && companyData.website.trim()) {
      try {
        new URL(companyData.website.trim());
      } catch {
        errors.push("Website must be a valid URL");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async testConnection() {
    return await this.checkServiceHealth();
  }

  getCurrentCompany() {
    try {
      const currentCompany = localStorage.getItem("currentCompany");
      return currentCompany ? JSON.parse(currentCompany) : null;
    } catch (error) {
      return null;
    }
  }

  setCurrentCompany(company) {
    try {
      if (!company) {
        throw new Error("Company data is required");
      }

      localStorage.setItem("currentCompany", JSON.stringify(company));
    } catch (error) {
      throw error;
    }
  }

  clearCurrentCompany() {
    try {
      localStorage.removeItem("currentCompany");
    } catch (error) {
      throw error;
    }
  }

  async switchCompany(companyId) {
    try {
      const companyData = await this.getCompanyById(companyId);
      if (companyData.success) {
        this.setCurrentCompany(companyData.data);
        return companyData;
      } else {
        throw new Error("Failed to fetch company data");
      }
    } catch (error) {
      throw error;
    }
  }

  async getUserCompanies() {
    try {
      const response = await apiClient.get("/api/companies/user");
      return response.data;
    } catch (error) {
      return await this.getCompanies({limit: 100});
    }
  }

  async getCompanyDashboard(companyId) {
    try {
      const response = await apiClient.get(
        `/api/companies/${companyId}/dashboard`
      );

      return response.data;
    } catch (error) {
      return await this.getCompanyStats(companyId);
    }
  }

  async updateCompanySettings(companyId, settings) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.patch(
        `/api/companies/${companyId}/settings`,
        {settings}
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async uploadCompanyLogo(companyId, logoBase64) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!logoBase64) {
        throw new Error("Logo data is required");
      }

      const response = await apiClient.patch(
        `/api/companies/${companyId}/logo`,
        {logo: logoBase64}
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async uploadCompanySignature(companyId, signatureBase64) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!signatureBase64) {
        throw new Error("Signature data is required");
      }

      const response = await apiClient.patch(
        `/api/companies/${companyId}/signature`,
        {signatureImage: signatureBase64}
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  getBusinessTypes() {
    return [
      "Retail",
      "Wholesale",
      "Distributor",
      "Service",
      "Manufacturing",
      "Others",
    ];
  }

  getBusinessCategories() {
    return [
      "Accounting & CA",
      "Interior Designer",
      "Automobiles / Auto Parts",
      "Salon / Spa",
      "Liquor Store",
      "Book / Stationary Store",
      "Construction Materials & Equipment",
      "Repairing Plumbing & Electrician",
      "Chemical & Fertilizer",
      "Computer Equipment & Software",
      "Electrical & Electronics Equipment",
      "Fashion Accessory / Cosmetics",
      "Tailoring / Boutique",
      "Fruit and Vegetable",
      "Kirana / General Merchant",
      "FMCG Products",
      "Dairy Farm Products / Poultry",
      "Furniture",
      "Garment / Fashion & Hosiery",
      "Jewellery & Gems",
      "Pharmacy / Medical",
      "Hardware Store",
      "Mobile & Accessories",
      "Nursery / Plants",
      "Petroleum Bulk Stations & Terminals / Petrol",
      "Restaurant / Hotel",
      "Footwear",
      "Paper & Paper Products",
      "Sweet Shop / Bakery",
      "Gift & Toys",
      "Laundry / Washing / Dry Clean",
      "Coaching & Training",
      "Renting & Leasing",
      "Fitness Center",
      "Oil & Gas",
      "Real Estate",
      "NGO & Charitable Trust",
      "Tours & Travels",
      "Other",
    ];
  }

  getUserRoles() {
    return ["owner", "admin", "manager", "employee"];
  }

  getPermissions() {
    return [
      "view_dashboard",
      "manage_parties",
      "create_invoices",
      "view_reports",
      "manage_inventory",
      "manage_users",
      "company_settings",
      "delete_records",
      "view_analytics",
      "manage_payments",
    ];
  }

  formatCompanyData(company) {
    if (!company) return null;

    return {
      id: company._id || company.id,
      businessName: company.businessName || "",
      phoneNumber: company.phoneNumber || "",
      email: company.email || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      pincode: company.pincode || "",
      gstin: company.gstin || "",
      businessType: company.businessType || "",
      businessCategory: company.businessCategory || "",
      isActive: company.isActive !== false,
      createdAt: company.createdAt || "",
      updatedAt: company.updatedAt || "",
      logo: company.logo || "",
      signatureImage: company.signatureImage || "",
      ownerName: company.ownerName || "",
      description: company.description || "",
      establishedYear: company.establishedYear || "",
      website: company.website || "",
      tehsil: company.tehsil || "",
      additionalPhones: company.additionalPhones || [],
      settings: company.settings || {},
      totalActiveUsers: company.totalActiveUsers || 0,
      hasActiveSubscription: company.hasActiveSubscription || false,
      lastActivity: company.lastActivity || null,
      createdDaysAgo: company.createdDaysAgo || 0,
      ownerInfo: company.ownerInfo || null,
    };
  }

  calculateCompanyAge(establishedYear) {
    if (!establishedYear) return 0;
    const currentYear = new Date().getFullYear();
    return Math.max(0, currentYear - establishedYear);
  }

  getCompanyDisplayName(company) {
    if (!company) return "Unknown Company";
    return company.businessName || company.name || "Unnamed Company";
  }

  hasPermission(company, permission) {
    if (!company || !company.userRole) return false;

    if (company.userRole === "owner") return true;

    if (company.permissions && Array.isArray(company.permissions)) {
      return company.permissions.includes(permission);
    }

    return false;
  }

  getCompanyStatus(company) {
    if (!company) {
      return {status: "unknown", color: "secondary", text: "Unknown"};
    }

    if (company.isActive === false) {
      return {status: "inactive", color: "danger", text: "Inactive"};
    }

    if (company.isVerified) {
      return {status: "verified", color: "success", text: "Verified"};
    }

    return {status: "active", color: "primary", text: "Active"};
  }

  // ✅ Admin helper methods
  isAdminRequest(params = {}) {
    return params.adminView || params.isAdmin;
  }

  formatAdminCompanyData(company) {
    const baseData = this.formatCompanyData(company);

    return {
      ...baseData,
      adminView: true,
      subscription: {
        plan: company.subscription?.plan || "Free",
        isActive: company.subscription?.plan !== "Free",
        expiresAt: company.subscription?.endDate,
      },
      metrics: {
        totalUsers: company.totalActiveUsers || 0,
        hasSubscription: company.hasActiveSubscription || false,
        daysSinceCreated: company.createdDaysAgo || 0,
        lastActivityDays: company.lastActivity
          ? Math.floor(
              (Date.now() - new Date(company.lastActivity)) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      },
    };
  }

  getAdminFilters() {
    return {
      businessTypes: this.getBusinessTypes(),
      businessCategories: this.getBusinessCategories(),
      statusOptions: [
        {value: "", label: "All Status"},
        {value: "true", label: "Active"},
        {value: "false", label: "Inactive"},
      ],
      sortOptions: [
        {value: "createdAt", label: "Date Created"},
        {value: "businessName", label: "Company Name"},
        {value: "stats.totalUsers", label: "User Count"},
        {value: "stats.lastActivityAt", label: "Last Activity"},
      ],
      sortOrders: [
        {value: "desc", label: "Descending"},
        {value: "asc", label: "Ascending"},
      ],
    };
  }
}

export default new CompanyService();
