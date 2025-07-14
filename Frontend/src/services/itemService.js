import axios from "axios";

// Use window.location to determine API URL if env var not available
const getApiBaseUrl = () => {
  // Try to get from environment variable first
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL
  ) {
    return process.env.REACT_APP_API_URL;
  }

  // Fallback to development URL
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5000";
  }

  // For production, use same origin with /api path
  return `${window.location.protocol}//${window.location.host}`;
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
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
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem("token");
          // Only redirect if not already on login page
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          break;
        case 403:
        case 404:
        case 500:
        default:
          break;
      }

      // Throw error with server message
      throw new Error(data.message || `HTTP Error: ${status}`);
    } else if (error.request) {
      // Network error
      throw new Error(
        "Unable to connect to server. Please check your internet connection."
      );
    } else {
      // Other error
      throw new Error(error.message || "An unexpected error occurred.");
    }
  }
);

class ItemService {
  /**
   * Get all items for a company
   * @param {string} companyId - Company ID
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Items list with pagination
   */
  async getItems(companyId, params = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items`,
        {
          params: {
            page: params.page || 1,
            limit: params.limit || 50,
            search: params.search || "",
            type: params.type || "",
            category: params.category || "",
            isActive: params.isActive !== undefined ? params.isActive : "",
            sortBy: params.sortBy || "name",
            sortOrder: params.sortOrder || "asc",
          },
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new item
   * @param {string} companyId - Company ID
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>} Created item data
   */
  async createItem(companyId, itemData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      // Validate required fields
      const requiredFields = ["name", "category", "unit"];
      const missingFields = requiredFields.filter((field) => !itemData[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Clean the data
      const cleanedData = {
        name: itemData.name?.trim(),
        itemCode: itemData.itemCode?.trim() || undefined,
        hsnNumber: itemData.hsnNumber?.trim() || undefined,
        type: itemData.type || "product",
        category: itemData.category?.trim(),
        unit: itemData.unit,
        description: itemData.description?.trim() || undefined,
        buyPrice: parseFloat(itemData.buyPrice) || 0,
        salePrice: parseFloat(itemData.salePrice) || 0,
        gstRate: parseFloat(itemData.gstRate) || 0,
        openingStock:
          itemData.type === "service"
            ? 0
            : parseFloat(itemData.openingStock) || 0,
        minStockLevel:
          itemData.type === "service"
            ? 0
            : parseFloat(itemData.minStockLevel) || 0,
        asOfDate: itemData.asOfDate || new Date().toISOString().split("T")[0],
        isActive: itemData.isActive !== undefined ? itemData.isActive : true,
      };

      // Remove undefined fields
      Object.keys(cleanedData).forEach((key) => {
        if (cleanedData[key] === undefined) {
          delete cleanedData[key];
        }
      });

      const response = await apiClient.post(
        `/api/companies/${companyId}/items`,
        cleanedData
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get transactions for a specific item
   * @param {string} companyId - Company ID
   * @param {string} itemId - Item ID
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.type - Transaction type filter ('sale', 'purchase', 'adjustment')
   * @param {string} params.dateFrom - Start date filter
   * @param {string} params.dateTo - End date filter
   * @returns {Promise<Object>} Item transactions data
   */
  async getItemTransactions(companyId, itemId, params = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/${itemId}/transactions`,
        {
          params: {
            page: params.page || 1,
            limit: params.limit || 50,
            type: params.type || "",
            dateFrom: params.dateFrom || "",
            dateTo: params.dateTo || "",
            sortBy: params.sortBy || "date",
            sortOrder: params.sortOrder || "desc",
          },
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update item
   * @param {string} companyId - Company ID
   * @param {string} itemId - Item ID
   * @param {Object} itemData - Updated item data
   * @returns {Promise<Object>} Updated item data
   */
  async updateItem(companyId, itemId, itemData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      // Validate required fields
      if (itemData.name && !itemData.name.trim()) {
        throw new Error("Item name cannot be empty");
      }

      // Clean and properly handle price calculations
      const gstRate = parseFloat(itemData.gstRate) || 0;
      const buyPrice = parseFloat(itemData.buyPrice) || 0;
      const salePrice = parseFloat(itemData.salePrice) || 0;

      // Calculate tax-inclusive and tax-exclusive prices
      const buyPriceWithTax = itemData.isBuyPriceTaxInclusive
        ? buyPrice
        : buyPrice * (1 + gstRate / 100);
      const buyPriceWithoutTax = itemData.isBuyPriceTaxInclusive
        ? buyPrice / (1 + gstRate / 100)
        : buyPrice;

      const salePriceWithTax = itemData.isSalePriceTaxInclusive
        ? salePrice
        : salePrice * (1 + gstRate / 100);
      const salePriceWithoutTax = itemData.isSalePriceTaxInclusive
        ? salePrice / (1 + gstRate / 100)
        : salePrice;

      const cleanedData = {
        name: itemData.name?.trim(),
        itemCode: itemData.itemCode?.trim() || undefined,
        hsnNumber: itemData.hsnNumber?.trim() || undefined,
        type: itemData.type || "product",
        category: itemData.category?.trim(),
        unit: itemData.unit,
        description: itemData.description?.trim() || undefined,

        // Store both base prices and calculated prices
        buyPrice: buyPrice,
        salePrice: salePrice,
        atPrice: parseFloat(itemData.atPrice) || 0,
        gstRate: gstRate,

        // Store calculated tax prices
        buyPriceWithTax: Math.round(buyPriceWithTax * 100) / 100,
        buyPriceWithoutTax: Math.round(buyPriceWithoutTax * 100) / 100,
        salePriceWithTax: Math.round(salePriceWithTax * 100) / 100,
        salePriceWithoutTax: Math.round(salePriceWithoutTax * 100) / 100,

        // Tax inclusion flags
        isBuyPriceTaxInclusive: itemData.isBuyPriceTaxInclusive || false,
        isSalePriceTaxInclusive: itemData.isSalePriceTaxInclusive || false,

        // Handle stock fields
        openingStock:
          itemData.type === "service"
            ? 0
            : parseFloat(itemData.openingStock) ||
              parseFloat(itemData.currentStock) ||
              parseFloat(itemData.openingQuantity) ||
              0,
        currentStock:
          itemData.type === "service"
            ? 0
            : parseFloat(itemData.currentStock) ||
              parseFloat(itemData.openingStock) ||
              parseFloat(itemData.openingQuantity) ||
              0,
        openingQuantity:
          itemData.type === "service"
            ? 0
            : parseFloat(itemData.openingQuantity) ||
              parseFloat(itemData.currentStock) ||
              parseFloat(itemData.openingStock) ||
              0,
        minStockLevel:
          itemData.type === "service"
            ? 0
            : parseFloat(itemData.minStockLevel) ||
              parseFloat(itemData.minStockToMaintain) ||
              0,
        minStockToMaintain:
          itemData.type === "service"
            ? 0
            : parseFloat(itemData.minStockToMaintain) ||
              parseFloat(itemData.minStockLevel) ||
              0,
        asOfDate: itemData.asOfDate || new Date().toISOString().split("T")[0],
        isActive: itemData.isActive !== undefined ? itemData.isActive : true,
      };

      // Remove undefined fields
      Object.keys(cleanedData).forEach((key) => {
        if (cleanedData[key] === undefined) {
          delete cleanedData[key];
        }
      });

      const response = await apiClient.put(
        `/api/companies/${companyId}/items/${itemId}`,
        cleanedData
      );

      // Return the response in the expected format
      return {
        success: true,
        data: response.data,
        message: response.data.message || "Item updated successfully",
      };
    } catch (error) {
      // Return consistent error format
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to update item",
        error: error,
      };
    }
  }

  /**
   * Delete item
   * @param {string} companyId - Company ID
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteItem(companyId, itemId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      const response = await apiClient.delete(
        `/api/companies/${companyId}/items/${itemId}`
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Adjust stock for an item
   * @param {string} companyId - Company ID
   * @param {string} itemId - Item ID
   * @param {Object} adjustmentData - Stock adjustment data
   * @param {string} adjustmentData.adjustmentType - Type: 'set', 'add', 'subtract'
   * @param {number} adjustmentData.quantity - Quantity to adjust
   * @param {number} adjustmentData.newStock - New stock level (for 'set' type)
   * @param {string} adjustmentData.reason - Reason for adjustment
   * @param {string} adjustmentData.asOfDate - Date of adjustment
   * @returns {Promise<Object>} Stock adjustment result
   */
  async adjustStock(companyId, itemId, adjustmentData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      // Validate adjustment data
      if (!adjustmentData.adjustmentType) {
        throw new Error("Adjustment type is required");
      }

      if (
        adjustmentData.quantity === undefined &&
        adjustmentData.newStock === undefined
      ) {
        throw new Error("Either quantity or newStock is required");
      }

      const cleanedData = {
        adjustmentType: adjustmentData.adjustmentType,
        quantity:
          adjustmentData.quantity !== undefined
            ? Number(adjustmentData.quantity)
            : undefined,
        newStock:
          adjustmentData.newStock !== undefined
            ? Number(adjustmentData.newStock)
            : undefined,
        reason: adjustmentData.reason?.trim() || "Manual stock adjustment",
        asOfDate:
          adjustmentData.asOfDate || new Date().toISOString().split("T")[0],
        currentStock:
          adjustmentData.currentStock !== undefined
            ? Number(adjustmentData.currentStock)
            : undefined,
      };

      // Remove undefined fields
      Object.keys(cleanedData).forEach((key) => {
        if (cleanedData[key] === undefined) {
          delete cleanedData[key];
        }
      });

      const response = await apiClient.put(
        `/api/companies/${companyId}/items/${itemId}/adjust-stock`,
        cleanedData
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get stock history for an item
   * @param {string} companyId - Company ID
   * @param {string} itemId - Item ID
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @returns {Promise<Object>} Stock history data
   */
  async getStockHistory(companyId, itemId, params = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/${itemId}/stock-history`,
        {
          params: {
            page: params.page || 1,
            limit: params.limit || 20,
          },
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get items with low stock levels
   * @param {string} companyId - Company ID
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Maximum number of items to return
   * @returns {Promise<Object>} Low stock items data
   */
  async getLowStockItems(companyId, params = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/low-stock`,
        {
          params: {
            limit: params.limit || 50,
          },
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get stock summary/analytics
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Stock summary data
   */
  async getStockSummary(companyId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/stock-summary`
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search items
   * @param {string} companyId - Company ID
   * @param {string} query - Search query
   * @param {string} type - Item type filter (optional)
   * @param {number} limit - Result limit (default: 10)
   * @returns {Promise<Object>} Search results
   */
  async searchItems(companyId, query, type = null, limit = 10) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!query || query.length < 2) {
        return {
          success: true,
          data: {items: []},
        };
      }

      const params = {
        q: query.trim(),
        limit: limit,
      };

      if (type) {
        params.type = type;
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/search`,
        {params}
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get categories for a company
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Categories list
   */
  async getCategories(companyId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/categories`
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single item by ID
   * @param {string} companyId - Company ID
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Item data
   */
  async getItemById(companyId, itemId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/${itemId}`
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update stock
   * @param {string} companyId - Company ID
   * @param {Array} updates - Array of {itemId, newStock}
   * @returns {Promise<Object>} Update results
   */
  async bulkUpdateStock(companyId, updates) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error("Updates array is required and cannot be empty");
      }

      const response = await apiClient.patch(
        `/api/companies/${companyId}/items/bulk/stock`,
        {
          updates,
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ===== ✅ EXISTING ADMIN FUNCTIONS =====

  /**
   * 🔧 Get all items across companies for admin dashboard
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {Object} params - Query parameters for filtering
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page (max 100)
   * @param {string} params.search - Search query (name, code, description, etc.)
   * @param {string} params.type - Filter by type (product/service)
   * @param {string} params.category - Filter by category
   * @param {string} params.isActive - Filter by active status (true/false)
   * @param {string} params.companyId - Filter by specific company
   * @param {string} params.stockStatus - Filter by stock status (inStock/lowStock/outOfStock)
   * @param {string} params.sortBy - Sort field (default: createdAt)
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @returns {Promise<Object>} Items with admin-specific data
   */
  async getAllItemsAdmin(companyId, params = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/admin/all`,
        {
          params: {
            page: params.page || 1,
            limit: Math.min(params.limit || 50, 100), // Max 100 items per page
            search: params.search || "",
            type: params.type || "",
            category: params.category || "",
            isActive: params.isActive !== undefined ? params.isActive : "",
            companyId: params.companyId || "", // Filter by specific company
            stockStatus: params.stockStatus || "",
            sortBy: params.sortBy || "createdAt",
            sortOrder: params.sortOrder || "desc",
          },
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 📊 Get comprehensive item statistics for admin
   * @param {string} companyId - Any company ID (admin can see all)
   * @returns {Promise<Object>} Comprehensive statistics
   */
  async getAdminItemStats(companyId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/admin/stats`
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 📋 Export all items data for admin
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {Object} params - Export parameters
   * @param {string} params.format - Export format ('csv' or 'json')
   * @param {string} params.search - Filter by search query
   * @param {string} params.type - Filter by item type
   * @param {string} params.category - Filter by category
   * @param {string} params.isActive - Filter by active status
   * @param {string} params.companyId - Filter by specific company
   * @returns {Promise<Object|Blob>} Exported data (JSON object or CSV blob)
   */
  async exportAllItemsAdmin(companyId, params = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const queryParams = {
        format: params.format || "csv",
        search: params.search || "",
        type: params.type || "",
        category: params.category || "",
        isActive: params.isActive !== undefined ? params.isActive : "",
        companyId: params.companyId || "",
      };

      if (params.format === "json") {
        // For JSON format, return data as usual
        const response = await apiClient.get(
          `/api/companies/${companyId}/items/admin/export`,
          {
            params: queryParams,
          }
        );
        return response.data;
      } else {
        // For CSV format, handle as blob for file download
        const response = await apiClient.get(
          `/api/companies/${companyId}/items/admin/export`,
          {
            params: queryParams,
            responseType: "blob",
          }
        );

        // Create download link
        const blob = new Blob([response.data], {type: "text/csv"});
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `items_export_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return {
          success: true,
          message: "Export downloaded successfully",
          filename: link.download,
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🚨 Get low stock items across all companies for admin
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Maximum number of items to return (default: 100)
   * @param {string} params.companyId - Filter by specific company (optional)
   * @returns {Promise<Object>} Low stock items across companies
   */
  async getAllLowStockItemsAdmin(companyId, params = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/admin/low-stock`,
        {
          params: {
            limit: params.limit || 100,
            companyId: params.companyId || "",
          },
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ===== ✅ NEW ADMIN NAME VERIFICATION FUNCTIONS =====

  /**
   * 🔍 Get items for name verification review
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 50, max: 100)
   * @param {string} params.search - Search query (name, code, category, etc.)
   * @param {string} params.companyId - Filter by specific company
   * @param {string} params.status - Filter by verification status (all/pending/approved/rejected)
   * @param {string} params.sortBy - Sort field (default: createdAt)
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @returns {Promise<Object>} Items for verification with admin data
   */
  async getPendingVerificationItems(companyId, params = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/admin/verification/pending`,
        {
          params: {
            page: params.page || 1,
            limit: Math.min(params.limit || 50, 100),
            search: params.search || "",
            companyId: params.companyId || "",
            status: params.status || "all",
            sortBy: params.sortBy || "createdAt",
            sortOrder: params.sortOrder || "desc",
          },
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 📊 Get verification statistics for admin
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {Object} params - Query parameters
   * @param {string} params.companyId - Filter by specific company (optional)
   * @param {string} params.dateFrom - Start date filter (optional)
   * @param {string} params.dateTo - End date filter (optional)
   * @returns {Promise<Object>} Verification statistics
   */
  async getVerificationStats(companyId, params = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/admin/verification/stats`,
        {
          params: {
            companyId: params.companyId || "",
            dateFrom: params.dateFrom || "",
            dateTo: params.dateTo || "",
          },
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * ✅ Approve item name (with optional correction)
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {string} itemId - Item ID to approve
   * @param {Object} approvalData - Approval data
   * @param {string} approvalData.correctedName - Corrected name (optional)
   * @param {string} approvalData.adminId - Admin ID (default: "admin")
   * @param {string} approvalData.adminNotes - Admin notes (optional)
   * @returns {Promise<Object>} Approval result
   */
  async approveItemName(companyId, itemId, approvalData = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      const response = await apiClient.put(
        `/api/companies/${companyId}/items/admin/verification/${itemId}/approve`,
        {
          correctedName: approvalData.correctedName?.trim() || "",
          adminId: approvalData.adminId || "admin",
          adminNotes: approvalData.adminNotes?.trim() || "",
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * ❌ Reject item name
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {string} itemId - Item ID to reject
   * @param {Object} rejectionData - Rejection data
   * @param {string} rejectionData.rejectionReason - Reason for rejection (required)
   * @param {string} rejectionData.suggestedName - Suggested correct name (optional)
   * @param {string} rejectionData.adminId - Admin ID (default: "admin")
   * @returns {Promise<Object>} Rejection result
   */
  async rejectItemName(companyId, itemId, rejectionData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      if (!rejectionData.rejectionReason?.trim()) {
        throw new Error("Rejection reason is required");
      }

      const response = await apiClient.put(
        `/api/companies/${companyId}/items/admin/verification/${itemId}/reject`,
        {
          rejectionReason: rejectionData.rejectionReason.trim(),
          suggestedName: rejectionData.suggestedName?.trim() || "",
          adminId: rejectionData.adminId || "admin",
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * ⚡ Quick approve multiple items (names are correct as submitted)
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {Array} itemIds - Array of item IDs to approve
   * @param {string} adminId - Admin ID (default: "admin")
   * @returns {Promise<Object>} Quick approval results
   */
  async quickApproveItems(companyId, itemIds, adminId = "admin") {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error("Item IDs array is required and cannot be empty");
      }

      const response = await apiClient.post(
        `/api/companies/${companyId}/items/admin/verification/quick-approve`,
        {
          itemIds: itemIds,
          adminId: adminId,
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 📋 Bulk approve multiple items with individual corrections
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {Array} approvals - Array of {itemId, correctedName?, adminNotes?}
   * @param {string} adminId - Admin ID (default: "admin")
   * @returns {Promise<Object>} Bulk approval results
   */
  async bulkApproveItems(companyId, approvals, adminId = "admin") {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!Array.isArray(approvals) || approvals.length === 0) {
        throw new Error("Approvals array is required and cannot be empty");
      }

      const response = await apiClient.post(
        `/api/companies/${companyId}/items/admin/verification/bulk-approve`,
        {
          approvals: approvals,
          adminId: adminId,
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 📜 Get verification history for an item
   * @param {string} companyId - Any company ID (admin can see all)
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Verification history
   */
  async getVerificationHistory(companyId, itemId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      const response = await apiClient.get(
        `/api/companies/${companyId}/items/admin/verification/${itemId}/history`
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🔄 Resubmit item for verification (company function)
   * @param {string} companyId - Company ID
   * @param {string} itemId - Item ID to resubmit
   * @param {Object} resubmissionData - Resubmission data
   * @param {string} resubmissionData.newName - New corrected name
   * @param {string} resubmissionData.resubmissionReason - Reason for resubmission
   * @returns {Promise<Object>} Resubmission result
   */
  async resubmitForVerification(companyId, itemId, resubmissionData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!itemId) {
        throw new Error("Item ID is required");
      }

      if (!resubmissionData.newName?.trim()) {
        throw new Error("New name is required for resubmission");
      }

      const response = await apiClient.put(
        `/api/companies/${companyId}/items/admin/verification/${itemId}/resubmit`,
        {
          newName: resubmissionData.newName.trim(),
          resubmissionReason:
            resubmissionData.resubmissionReason?.trim() ||
            "Name updated based on admin feedback",
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ===== EXISTING UTILITY FUNCTIONS =====

  /**
   * Get items by category
   * @param {string} companyId - Company ID
   * @param {string} category - Category name
   * @returns {Promise<Object>} Filtered items
   */
  async getItemsByCategory(companyId, category) {
    try {
      if (!category) {
        throw new Error("Category is required");
      }

      return await this.getItems(companyId, {
        category: category,
        isActive: true,
        sortBy: "name",
        sortOrder: "asc",
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get API configuration info
   * @returns {Object} API configuration
   */
  getApiConfig() {
    return {
      baseURL: API_BASE_URL,
      timeout: apiClient.defaults.timeout,
      hasToken: !!localStorage.getItem("token"),
    };
  }

  /**
   * Health check for items service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await apiClient.get("/api/health");

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Utility method to calculate stock metrics
   * @param {Array} items - Array of items
   * @returns {Object} Stock metrics
   */
  calculateStockMetrics(items) {
    if (!Array.isArray(items)) {
      return {
        totalItems: 0,
        totalStockValue: 0,
        outOfStockItems: 0,
        lowStockItems: 0,
        avgStockValue: 0,
      };
    }

    const metrics = items.reduce(
      (acc, item) => {
        if (item.type === "product") {
          const currentStock = Number(item.currentStock) || 0;
          const salePrice = Number(item.salePrice) || 0;
          const minStock =
            Number(item.minStockLevel) || Number(item.minStockToMaintain) || 0;

          acc.totalItems++;
          acc.totalStockValue += currentStock * salePrice;

          if (currentStock === 0) {
            acc.outOfStockItems++;
          } else if (currentStock <= minStock && minStock > 0) {
            acc.lowStockItems++;
          }
        }
        return acc;
      },
      {
        totalItems: 0,
        totalStockValue: 0,
        outOfStockItems: 0,
        lowStockItems: 0,
      }
    );

    metrics.avgStockValue =
      metrics.totalItems > 0 ? metrics.totalStockValue / metrics.totalItems : 0;

    return metrics;
  }

  /**
   * Format stock adjustment data for UI
   * @param {Object} adjustmentData - Raw adjustment data
   * @returns {Object} Formatted adjustment data
   */
  formatStockAdjustment(adjustmentData) {
    return {
      id: adjustmentData.id || adjustmentData._id,
      date: adjustmentData.date || adjustmentData.adjustedAt,
      type: adjustmentData.adjustmentType,
      previousStock: Number(adjustmentData.previousStock) || 0,
      newStock: Number(adjustmentData.newStock) || 0,
      quantity: Number(adjustmentData.quantity) || 0,
      reason: adjustmentData.reason || "Manual adjustment",
      adjustedBy: adjustmentData.adjustedBy || "Unknown",
      formattedDate: adjustmentData.date
        ? new Date(adjustmentData.date).toLocaleDateString()
        : "Unknown",
      formattedTime: adjustmentData.date
        ? new Date(adjustmentData.date).toLocaleTimeString()
        : "Unknown",
    };
  }

  /**
   * ✅ Utility method to format admin items for display
   * @param {Array} items - Raw admin items data
   * @returns {Array} Formatted items for UI
   */
  formatAdminItems(items) {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      ...item,
      formattedCreatedDate: item.createdAt
        ? new Date(item.createdAt).toLocaleDateString()
        : "Unknown",
      formattedUpdatedDate: item.updatedAt
        ? new Date(item.updatedAt).toLocaleDateString()
        : "Unknown",
      stockStatusBadge: this.getStockStatusBadge(item),
      companyDisplayName: item.companyInfo?.name || "Unknown Company",
      isRecentlyCreated: item.createdDaysAgo <= 7,
      stockDeficit:
        item.minStockLevel > 0
          ? Math.max(0, item.minStockLevel - (item.currentStock || 0))
          : 0,
    }));
  }

  /**
   * ✅ NEW: Format verification items for display
   * @param {Array} items - Raw verification items data
   * @returns {Array} Formatted verification items for UI
   */
  formatVerificationItems(items) {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      ...item,
      formattedSubmissionDate: item.verification?.submittedDate
        ? new Date(item.verification.submittedDate).toLocaleDateString()
        : "Unknown",
      formattedVerificationDate: item.verification?.verificationDate
        ? new Date(item.verification.verificationDate).toLocaleDateString()
        : null,
      verificationStatusBadge: this.getVerificationStatusBadge(
        item.verification?.status
      ),
      companyDisplayName: item.companyInfo?.name || "Unknown Company",
      isUrgent: item.needsAttention,
      wasNameChanged:
        item.verification?.verifiedName !== item.verification?.originalName,
      daysSinceSubmission: item.daysSinceSubmission || 0,
    }));
  }

  /**
   * ✅ NEW: Get verification status badge configuration
   * @param {string} status - Verification status
   * @returns {Object} Badge configuration
   */
  getVerificationStatusBadge(status) {
    switch (status) {
      case "pending":
        return {
          text: "Pending Review",
          color: "yellow",
          variant: "solid",
          icon: "clock",
        };
      case "approved":
        return {
          text: "Approved",
          color: "green",
          variant: "solid",
          icon: "checkCircle",
        };
      case "rejected":
        return {
          text: "Rejected",
          color: "red",
          variant: "solid",
          icon: "xCircle",
        };
      default:
        return {
          text: "Unknown",
          color: "gray",
          variant: "outline",
          icon: "question",
        };
    }
  }

  /**
   * ✅ Get stock status badge configuration
   * @param {Object} item - Item data
   * @returns {Object} Badge configuration
   */
  getStockStatusBadge(item) {
    if (item.type === "service") {
      return {text: "N/A", color: "gray", variant: "outline"};
    }

    switch (item.stockHealth) {
      case "critical":
        return {text: "Out of Stock", color: "red", variant: "solid"};
      case "warning":
        return {text: "Low Stock", color: "yellow", variant: "solid"};
      case "good":
        return {text: "In Stock", color: "green", variant: "solid"};
      default:
        return {text: "Unknown", color: "gray", variant: "outline"};
    }
  }

  /**
   * ✅ Filter admin items by multiple criteria
   * @param {Array} items - Items array
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered items
   */
  filterAdminItems(items, filters = {}) {
    if (!Array.isArray(items)) return [];

    return items.filter((item) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchFields = [
          item.name,
          item.itemCode,
          item.category,
          item.description,
          item.companyInfo?.name,
        ].filter(Boolean);

        if (
          !searchFields.some((field) =>
            field.toLowerCase().includes(searchTerm)
          )
        ) {
          return false;
        }
      }

      // Type filter
      if (filters.type && item.type !== filters.type) {
        return false;
      }

      // Company filter
      if (filters.companyId && item.companyInfo?.id !== filters.companyId) {
        return false;
      }

      // Stock status filter
      if (filters.stockStatus) {
        switch (filters.stockStatus) {
          case "inStock":
            if (item.stockHealth !== "good") return false;
            break;
          case "lowStock":
            if (item.stockHealth !== "warning") return false;
            break;
          case "outOfStock":
            if (item.stockHealth !== "critical") return false;
            break;
        }
      }

      // Active status filter
      if (
        filters.isActive !== undefined &&
        item.isActive !== filters.isActive
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * ✅ NEW: Filter verification items by multiple criteria
   * @param {Array} items - Verification items array
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered verification items
   */
  filterVerificationItems(items, filters = {}) {
    if (!Array.isArray(items)) return [];

    return items.filter((item) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchFields = [
          item.currentName,
          item.originalName,
          item.verifiedName,
          item.itemCode,
          item.category,
          item.companyInfo?.name,
        ].filter(Boolean);

        if (
          !searchFields.some((field) =>
            field.toLowerCase().includes(searchTerm)
          )
        ) {
          return false;
        }
      }

      // Verification status filter
      if (filters.status && filters.status !== "all") {
        if (item.verification?.status !== filters.status) {
          return false;
        }
      }

      // Company filter
      if (filters.companyId && item.companyInfo?.id !== filters.companyId) {
        return false;
      }

      // Urgency filter
      if (filters.urgentOnly && !item.needsAttention) {
        return false;
      }

      // Type filter
      if (filters.type && item.type !== filters.type) {
        return false;
      }

      return true;
    });
  }

  /**
   * ✅ NEW: Get verification action button configuration
   * @param {string} status - Verification status
   * @returns {Object} Action button configuration
   */
  getVerificationActions(status) {
    switch (status) {
      case "pending":
        return {
          canApprove: true,
          canReject: true,
          canResubmit: false,
          canViewHistory: true,
          primaryAction: "approve",
          secondaryAction: "reject",
        };
      case "approved":
        return {
          canApprove: false,
          canReject: false,
          canResubmit: false,
          canViewHistory: true,
          primaryAction: "viewHistory",
          secondaryAction: null,
        };
      case "rejected":
        return {
          canApprove: false,
          canReject: false,
          canResubmit: true,
          canViewHistory: true,
          primaryAction: "resubmit",
          secondaryAction: "viewHistory",
        };
      default:
        return {
          canApprove: false,
          canReject: false,
          canResubmit: false,
          canViewHistory: false,
          primaryAction: null,
          secondaryAction: null,
        };
    }
  }
}

export default new ItemService();
