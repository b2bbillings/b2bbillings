import axios from "axios";
import apiConfig from "../config/api";
import paymentService from "./paymentService";

// Create axios instance with your API configuration
const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
    }
    return Promise.reject(error);
  }
);

class PurchaseOrderService {
  constructor() {
    this.pendingRequests = new Map(); // Add request deduplication
  }

  // ==================== CORE CRUD OPERATIONS ====================

  /**
   * Create a new purchase order/quotation/proforma purchase with deduplication
   */
  async createPurchaseOrder(orderData) {
    // Create a unique request key for deduplication
    const requestKey = JSON.stringify({
      companyId: orderData.companyId,
      supplierMobile: orderData.supplierMobile,
      supplierName: orderData.supplierName,
      items: orderData.items?.length,
      timestamp: Math.floor(Date.now() / 1000), // Round to nearest second
    });

    // Check if request is already pending
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    // Create the request promise
    const requestPromise = this._createPurchaseOrderInternal(orderData);

    // Store the promise
    this.pendingRequests.set(requestKey, requestPromise);

    // Clean up after completion
    requestPromise.finally(() => {
      setTimeout(() => {
        this.pendingRequests.delete(requestKey);
      }, 2000); // Clear after 2 seconds
    });

    return requestPromise;
  }

  async _createPurchaseOrderInternal(orderData) {
    try {
      const response = await apiClient.post("/api/purchase-orders", orderData);

      return {
        success: true,
        data: response.data,
        message: response.data.message || "Purchase order created successfully",
      };
    } catch (error) {
      console.error("❌ Purchase order creation failed:", {
        status: error.response?.status,
        message: error.response?.data?.message,
        code: error.response?.data?.code,
        details: error.response?.data?.details,
      });

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to create purchase order",
        error: error.response?.data?.error,
        code: error.response?.data?.code,
        details: error.response?.data?.details,
      };
    }
  }

  /**
   * Get purchase orders with filters
   */
  async getPurchaseOrders(companyId, filters = {}) {
    try {
      const params = {
        companyId,
        page: filters.page || 1,
        limit: filters.limit || 100,
        ...filters,
      };

      // Map frontend filter names to backend expected names
      if (filters.startDate || filters.dateFrom) {
        params.dateFrom = filters.startDate || filters.dateFrom;
      }
      if (filters.endDate || filters.dateTo) {
        params.dateTo = filters.endDate || filters.dateTo;
      }

      // Add search parameter
      if (filters.search || filters.searchTerm) {
        params.search = filters.search || filters.searchTerm;
      }

      // Add supplier filtering
      if (filters.supplierId) {
        params.supplierId = filters.supplierId;
      }
      if (filters.supplierName || filters.supplier) {
        params.supplierName = filters.supplierName || filters.supplier;
      }

      // Add status filtering
      if (filters.status && filters.status !== "All Status") {
        params.status = filters.status;
      }
      if (filters.orderStatus && filters.orderStatus !== "") {
        params.status = filters.orderStatus;
      }

      // Add priority filtering
      if (filters.priority) {
        params.priority = filters.priority;
      }

      // Add order type filtering
      if (filters.orderType) {
        params.orderType = filters.orderType;
      } else {
        params.orderType = "purchase_order"; // Default to purchase orders
      }

      // Remove undefined/null values
      Object.keys(params).forEach((key) => {
        if (
          params[key] === undefined ||
          params[key] === null ||
          params[key] === ""
        ) {
          delete params[key];
        }
      });

      const response = await apiClient.get("/api/purchase-orders", {
        params,
      });

      // Handle the response structure
      const rawData = response.data;
      let purchaseOrders = [];

      if (rawData.success && rawData.data) {
        if (Array.isArray(rawData.data.orders)) {
          purchaseOrders = rawData.data.orders;
        } else if (Array.isArray(rawData.data.purchaseOrders)) {
          purchaseOrders = rawData.data.purchaseOrders;
        } else if (Array.isArray(rawData.data)) {
          purchaseOrders = rawData.data;
        }
      } else if (rawData.data && Array.isArray(rawData.data)) {
        purchaseOrders = rawData.data;
      } else if (Array.isArray(rawData)) {
        purchaseOrders = rawData;
      }

      return {
        success: true,
        data: {
          purchaseOrders: purchaseOrders,
          orders: purchaseOrders,
          data: purchaseOrders,
          pagination: rawData.data?.pagination || rawData.pagination || {},
          summary: rawData.data?.summary || rawData.summary || {},
          filter: rawData.data?.filter || {},
        },
        message: rawData.message || "Purchase orders fetched successfully",
      };
    } catch (error) {
      console.error("❌ Error fetching purchase orders:", error);
      console.error("❌ Error response:", error.response?.data);

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch purchase orders",
        data: {
          purchaseOrders: [],
          orders: [],
          data: [],
          pagination: {},
          summary: {},
        },
      };
    }
  }

  /**
   * Get purchase order by ID
   */
  async getPurchaseOrderById(orderId) {
    try {
      const response = await apiClient.get(`/api/purchase-orders/${orderId}`);
      return {
        success: true,
        data: response.data,
        message: "Purchase order fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch purchase order",
      };
    }
  }

  /**
   * Update purchase order
   */
  async updatePurchaseOrder(orderId, orderData) {
    try {
      const response = await apiClient.put(
        `/api/purchase-orders/${orderId}`,
        orderData
      );
      return {
        success: true,
        data: response.data,
        message: "Purchase order updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to update purchase order",
      };
    }
  }

  /**
   * Delete purchase order
   */
  async deletePurchaseOrder(orderId) {
    try {
      const response = await apiClient.delete(
        `/api/purchase-orders/${orderId}`
      );
      return {
        success: true,
        data: response.data,
        message: "Purchase order deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to delete purchase order",
      };
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  /**
   * Generate order number with fallback and GST type support
   */
  async generateOrderNumber(
    companyId,
    orderType = "purchase_order",
    userId = null,
    gstType = "gst"
  ) {
    // Always provide fallback first for immediate response
    const fallbackNumber = this.generateFallbackOrderNumber(
      companyId,
      orderType,
      userId,
      gstType
    );

    // Try the exact endpoints that exist in your backend routes
    const endpointsToTry = [
      "/api/purchase-orders/generate-number",
      "/api/purchase-orders/next-order-number",
      "/api/purchase-orders/next-number",
    ];

    for (const endpoint of endpointsToTry) {
      try {
        const params = {
          companyId,
          orderType,
          type: orderType,
          gstType,
        };

        const response = await apiClient.get(endpoint, {params});

        if (response.data) {
          const serverNumber =
            response.data.nextOrderNumber ||
            response.data.orderNumber ||
            response.data.number ||
            response.data.data?.nextOrderNumber;

          if (serverNumber) {
            return {
              success: true,
              data: {nextOrderNumber: serverNumber},
              message: "Order number generated successfully",
              source: "server",
              gstType,
              orderType,
            };
          }
        }
      } catch (error) {
        continue;
      }
    }

    // All endpoints failed, use fallback
    return {
      success: true,
      data: {nextOrderNumber: fallbackNumber},
      message: "Order number generated (fallback)",
      source: "fallback",
      gstType,
      orderType,
    };
  }

  /**
   * Generate fallback matching backend pattern exactly (WITH GST prefix)
   */
  generateFallbackOrderNumber(
    companyId,
    orderType = "purchase_order",
    userId = null,
    gstType = "gst"
  ) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    // Company prefix (will be updated by actual company data in frontend)
    let companyPrefix = "PO";

    // Order type prefix (matching backend exactly)
    let orderTypePrefix = "PO";
    switch (orderType) {
      case "purchase_quotation":
        orderTypePrefix = "QUO";
        break;
      case "proforma_purchase":
        orderTypePrefix = "PPO";
        break;
      default:
        orderTypePrefix = "PO";
    }

    // GST prefix for proper differentiation
    const gstPrefix = gstType === "gst" ? "GST-" : "NGST-";

    // Backend pattern: CompanyPrefix-OrderType-GST/NGST-YYYYMMDD-XXXX
    const fallbackNumber = `${companyPrefix}-${orderTypePrefix}-${gstPrefix}${dateStr}-XXXX`;

    return fallbackNumber;
  }
  // ==================== STATUS & CONVERSION ====================

  /**
   * Update order status (generic method for all status changes)
   */
  async updateOrderStatus(orderId, status, reason = "") {
    try {
      const response = await apiClient.patch(
        `/api/purchase-orders/${orderId}/status`,
        {
          status,
          reason,
        }
      );
      return {
        success: true,
        data: response.data,
        message: `Order status updated to ${status}`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to update order status",
      };
    }
  }

  /**
   * Convert purchase order to purchase invoice
   */
  async convertToPurchaseInvoice(orderId, conversionData = {}) {
    try {
      const response = await apiClient.post(
        `/api/purchase-orders/${orderId}/convert-to-invoice`,
        {
          ...conversionData,
          convertedAt: new Date().toISOString(),
          convertedBy: conversionData.userId || "system",
        }
      );

      return {
        success: true,
        data: {
          order:
            response.data.data?.purchaseOrder || response.data.purchaseOrder,
          invoice:
            response.data.data?.purchaseInvoice ||
            response.data.purchaseInvoice,
          conversion:
            response.data.data?.conversion || response.data.conversion,
        },
        message:
          response.data.message ||
          "Purchase order converted to invoice successfully",
      };
    } catch (error) {
      let errorMessage = "Failed to convert purchase order to invoice";

      if (error.response?.status === 400) {
        errorMessage =
          error.response.data?.message || "Purchase order cannot be converted";
      } else if (error.response?.status === 404) {
        errorMessage = "Purchase order not found";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        data: null,
      };
    }
  }

  // ==================== PAYMENT OPERATIONS ====================

  /**
   * Add payment to purchase order
   */
  async addPayment(orderId, paymentData) {
    try {
      const response = await apiClient.post(
        `/api/purchase-orders/${orderId}/payment`,
        paymentData
      );
      return {
        success: true,
        data: response.data,
        message: "Payment added successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to add payment",
      };
    }
  }

  /**
   * Add advance payment
   */
  async addAdvancePayment(orderId, paymentData) {
    try {
      const response = await apiClient.post(
        `/api/purchase-orders/${orderId}/advance-payment`,
        {
          ...paymentData,
          isAdvancePayment: true,
        }
      );
      return {
        success: true,
        data: response.data,
        message: "Advance payment added successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to add advance payment",
      };
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(orderIds, status, reason = "") {
    try {
      const response = await apiClient.patch(
        "/api/purchase-orders/bulk/status",
        {
          orderIds,
          status,
          reason,
        }
      );
      return {
        success: true,
        data: response.data,
        message: `${
          response.data.data?.modifiedCount || 0
        } orders updated to ${status}`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to bulk update status",
      };
    }
  }

  /**
   * Bulk convert orders
   */
  async bulkConvertOrders(orderIds) {
    try {
      const response = await apiClient.post(
        "/api/purchase-orders/bulk/convert",
        {orderIds}
      );
      return {
        success: true,
        data: response.data,
        message: `${
          response.data.data?.successCount || 0
        } orders converted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to bulk convert orders",
      };
    }
  }

  // ==================== REPORTING ====================

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(companyId) {
    try {
      const params = {companyId};
      const response = await apiClient.get(
        "/api/purchase-orders/reports/dashboard",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Dashboard summary fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch dashboard summary",
      };
    }
  }

  /**
   * Export orders to CSV
   */
  async exportToCSV(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get("/api/purchase-orders/export/csv", {
        params,
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `purchase-orders-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: "Export completed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || error.message || "Export failed",
      };
    }
  }

  // ==================== SOURCE COMPANY TRACKING ====================

  /**
   * Check supplier linking status for source company detection
   */
  async checkSupplierLinking(companyId, supplierInfo) {
    try {
      const params = {
        companyId,
        ...supplierInfo,
      };

      const response = await apiClient.get("/api/parties/check-linking", {
        params,
      });

      return {
        success: true,
        data: response.data,
        message: "Supplier linking status checked successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to check supplier linking",
        data: {
          hasLinkedCompany: false,
          linkedCompanyId: null,
          canAutoDetectSource: false,
        },
      };
    }
  }

  /**
   * Get supplier details with linked company for source detection
   */
  async getSupplierWithLinkedCompany(supplierId) {
    try {
      const response = await apiClient.get(
        `/api/parties/${supplierId}?populate=linkedCompanyId`
      );

      return {
        success: true,
        data: response.data,
        message: "Supplier details fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get supplier details",
        data: null,
      };
    }
  }

  /**
   * Preview source company detection before creating order
   */
  async previewSourceCompanyDetection(orderData) {
    try {
      const response = await apiClient.post(
        "/api/purchase-orders/preview-source-detection",
        {
          companyId: orderData.companyId,
          supplierName: orderData.supplierName,
          supplierMobile: orderData.supplierMobile,
          supplier: orderData.supplier,
          autoDetectSourceCompany: orderData.autoDetectSourceCompany ?? true,
        }
      );

      return {
        success: true,
        data: response.data,
        message: "Source company detection preview completed",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to preview source company detection",
        data: {
          canDetectSourceCompany: false,
          sourceCompanyId: null,
          detectionMethod: "none",
          explanation: "Unable to detect source company",
        },
      };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate order data before submission
   */
  validateOrderData(orderData) {
    const errors = [];

    if (!orderData.companyId) {
      errors.push("Company ID is required");
    }

    if (
      !orderData.supplierName &&
      !orderData.supplier &&
      !orderData.supplierMobile
    ) {
      errors.push("Supplier information is required");
    }

    if (
      !orderData.items ||
      !Array.isArray(orderData.items) ||
      orderData.items.length === 0
    ) {
      errors.push("At least one item is required");
    }

    if (orderData.items) {
      orderData.items.forEach((item, index) => {
        if (!item.itemName && !item.productName) {
          errors.push(`Item ${index + 1}: Name is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Valid quantity is required`);
        }
        if (
          (!item.pricePerUnit && !item.price) ||
          (item.pricePerUnit || item.price) < 0
        ) {
          errors.push(`Item ${index + 1}: Valid price is required`);
        }
      });
    }

    if (
      orderData.orderType &&
      !["purchase_order", "purchase_quotation", "proforma_purchase"].includes(
        orderData.orderType
      )
    ) {
      errors.push("Invalid order type");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format order data for API submission
   */
  formatOrderData(orderData) {
    return {
      ...orderData,
      orderType: orderData.orderType || "purchase_order",
      gstEnabled: orderData.gstEnabled ?? true,
      taxMode: orderData.taxMode || "without-tax",
      priceIncludesTax: orderData.priceIncludesTax ?? false,
      status: orderData.status || "draft",
      priority: orderData.priority || "normal",

      // ✅ NEW: Enable auto-detection of source company by default
      autoDetectSourceCompany: orderData.autoDetectSourceCompany ?? true,

      items:
        orderData.items?.map((item, index) => ({
          ...item,
          lineNumber: index + 1,
          taxRate: item.taxRate || item.gstRate || 18,
          unit: item.unit || "PCS",
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          productName: item.productName || item.itemName,
          itemName: item.itemName || item.productName,
          price: item.price || item.pricePerUnit,
          pricePerUnit: item.pricePerUnit || item.price,
        })) || [],
    };
  }

  /**
   * Format payment data
   */
  formatPaymentData(paymentData) {
    return {
      amount: parseFloat(paymentData.amount || 0),
      method: paymentData.method || "bank_transfer",
      reference: paymentData.reference || "",
      paymentDate: paymentData.paymentDate || new Date().toISOString(),
      notes: paymentData.notes || "",
      isAdvancePayment: paymentData.isAdvancePayment || false,
      paymentDetails: paymentData.paymentDetails || {},
    };
  }

  // ==================== ENHANCED HELPER METHODS ====================

  /**
   * Create purchase order with enhanced source company tracking
   */
  async createPurchaseOrderWithSourceTracking(orderData, options = {}) {
    try {
      // Validate order data first
      const validation = this.validateOrderData(orderData);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Order validation failed",
          errors: validation.errors,
        };
      }

      // Format order data with source detection enabled
      const formattedData = this.formatOrderData({
        ...orderData,
        autoDetectSourceCompany: options.autoDetectSourceCompany ?? true,
        sourceCompanyId: options.sourceCompanyId || orderData.sourceCompanyId,
      });

      // Preview source company detection if requested
      if (options.previewSourceDetection) {
        const preview = await this.previewSourceCompanyDetection(formattedData);
      }

      // Create the purchase order
      const result = await this.createPurchaseOrder(formattedData);

      // Enhanced response with source tracking info
      if (result.success && result.data?.data?.sourceCompanyTracking) {
        const sourceTracking = result.data.data.sourceCompanyTracking;

        // Add source tracking summary to result
        result.sourceTracking = {
          detected: sourceTracking.detected,
          method: sourceTracking.detectionMethod,
          sourceCompanyId: sourceTracking.sourceCompanyId,
          sourceCompanyName: sourceTracking.sourceCompanyDetails?.businessName,
          explanation: sourceTracking.explanation,
          supplierLinkedCompany: sourceTracking.supplierLinkedCompany,
        };
      }

      return result;
    } catch (error) {
      console.error("❌ Enhanced purchase order creation failed:", error);

      return {
        success: false,
        message:
          error.message ||
          "Failed to create purchase order with source tracking",
        error: error,
      };
    }
  }

  /**
   * Get tracking chain for bidirectional order relationships
   */
  async getTrackingChain(orderId) {
    try {
      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/tracking-chain`
      );

      return {
        success: true,
        data: response.data,
        message: "Tracking chain fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get tracking chain",
        data: {
          purchaseOrder: null,
          sourceOrder: null,
          correspondingOrder: null,
          relatedOrders: [],
          trackingHistory: [],
        },
      };
    }
  }

  /**
   * Get bidirectional analytics for company relationships
   */
  async getBidirectionalAnalytics(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/purchase-orders/analytics/bidirectional",
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Bidirectional analytics fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to get bidirectional analytics",
        data: {
          summary: {},
          companyRelationships: [],
          orderFlows: [],
          sourceCompanyBreakdown: {},
        },
      };
    }
  }

  // ==================== ADMIN FUNCTIONS (NO COMPANY ID) ====================

  /**
   * ✅ Get all purchase orders for admin (across all companies)
   */
  async getAllPurchaseOrdersForAdmin(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        adminAccess: true,
        populate: "supplier,companyId",
        page: filters.page || 1,
        limit: filters.limit || 100,
        ...filters,
      };

      // Remove undefined/null values
      Object.keys(params).forEach((key) => {
        if (
          params[key] === undefined ||
          params[key] === null ||
          params[key] === ""
        ) {
          delete params[key];
        }
      });

      const response = await apiClient.get("/api/purchase-orders/admin/all", {
        params,
      });

      if (!response.data) {
        throw new Error("No data received from server");
      }

      let purchaseOrders = [];
      let responseData = response.data;

      // Handle multiple response structures
      if (responseData.success !== undefined) {
        if (responseData.success === false) {
          throw new Error(responseData.message || "API returned error");
        }
        if (responseData.data) {
          if (Array.isArray(responseData.data)) {
            purchaseOrders = responseData.data;
          } else if (responseData.data.purchaseOrders) {
            purchaseOrders = responseData.data.purchaseOrders;
          } else if (responseData.data.orders) {
            purchaseOrders = responseData.data.orders;
          }
        }
      } else if (Array.isArray(responseData)) {
        purchaseOrders = responseData;
      } else if (
        responseData.purchaseOrders &&
        Array.isArray(responseData.purchaseOrders)
      ) {
        purchaseOrders = responseData.purchaseOrders;
      }

      return {
        success: true,
        data: {
          purchaseOrders: purchaseOrders,
          orders: purchaseOrders,
          data: purchaseOrders,
          count: purchaseOrders.length,
          pagination: responseData.pagination || {},
          summary: responseData.summary || {},
          adminStats: responseData.adminStats || {},
        },
        message:
          responseData.message ||
          `✅ Admin purchase orders fetched: ${purchaseOrders.length}`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch all purchase orders for admin",
        data: {
          purchaseOrders: [],
          orders: [],
          data: [],
          count: 0,
          pagination: {},
          summary: {},
          adminStats: {},
        },
      };
    }
  }

  /**
   * ✅ Get purchase order statistics for admin dashboard (NO COMPANY ID)
   */
  async getPurchaseOrderStatsForAdmin(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        adminAccess: true,
        statsOnly: true,
        ...filters,
      };

      // Remove undefined/null values
      Object.keys(params).forEach((key) => {
        if (
          params[key] === undefined ||
          params[key] === null ||
          params[key] === ""
        ) {
          delete params[key];
        }
      });

      try {
        const response = await apiClient.get(
          "/api/purchase-orders/admin/stats",
          {
            params,
          }
        );

        return {
          success: true,
          data: response.data,
          message: "✅ Admin purchase order statistics fetched successfully",
        };
      } catch (error) {
        // ✅ Fallback: Get orders and calculate stats manually
        const ordersResponse = await this.getAllPurchaseOrdersForAdmin({
          limit: 1000,
        });

        if (ordersResponse.success && ordersResponse.data.purchaseOrders) {
          const orders = ordersResponse.data.purchaseOrders;
          const stats = this.calculateAdminStatsFromData(orders);

          return {
            success: true,
            data: stats,
            message:
              "✅ Admin purchase order statistics calculated from orders data",
          };
        }

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "❌ Failed to fetch purchase order statistics",
        data: this.getEmptyAdminStats(),
      };
    }
  }

  // ==================== REPORTING FUNCTIONS (HANDLE ADMIN CASE) ====================

  /**
   * ✅ Get dashboard summary (handle admin case like salesOrderService)
   */
  async getDashboardSummary(companyId) {
    try {
      // ✅ Handle admin case - NO companyId
      if (companyId === "admin") {
        const ordersResponse = await this.getAllPurchaseOrdersForAdmin({
          limit: 1000,
        });

        if (ordersResponse.success) {
          const orders = ordersResponse.data.purchaseOrders || [];
          const stats = this.calculateAdminStatsFromData(orders);

          return {
            success: true,
            data: {
              totalOrders: stats.totalOrders,
              totalRevenue: stats.totalRevenue,
              pendingOrders: stats.pendingOrders,
              completedOrders: stats.completedOrders,
              conversionRate: stats.conversionRate,
              recentOrders: orders.slice(0, 10),
              ordersByStatus: stats.ordersByStatus,
              monthlyTrends: [],
              topSuppliers: [],
              isAdmin: true,
              totalCompanies: stats.totalCompanies,
            },
            message: "✅ Admin dashboard summary calculated successfully",
          };
        }

        throw new Error("Failed to fetch purchase orders for admin dashboard");
      }

      // ✅ Regular company dashboard
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {companyId};

      try {
        const response = await apiClient.get(
          "/api/purchase-orders/reports/dashboard",
          {params}
        );

        return {
          success: true,
          data: response.data,
          message: "✅ Dashboard summary fetched successfully",
        };
      } catch (specificError) {
        // Fallback: Get orders and calculate manually
        const ordersResponse = await this.getPurchaseOrders(companyId);

        if (ordersResponse.success) {
          const orders = ordersResponse.data.purchaseOrders || [];
          const stats = this.calculateAdminStatsFromData(orders);

          return {
            success: true,
            data: {
              totalOrders: stats.totalOrders,
              totalRevenue: stats.totalRevenue,
              pendingOrders: stats.pendingOrders,
              completedOrders: stats.completedOrders,
              conversionRate: stats.conversionRate,
              recentOrders: orders.slice(0, 10),
              ordersByStatus: stats.ordersByStatus,
              monthlyTrends: [],
              topSuppliers: [],
            },
            message: "✅ Dashboard summary calculated from orders data",
          };
        }

        throw new Error("Failed to fetch orders for dashboard summary");
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "❌ Failed to fetch dashboard summary",
        data: {
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          completedOrders: 0,
          conversionRate: 0,
          recentOrders: [],
          ordersByStatus: {},
          monthlyTrends: [],
          topSuppliers: [],
        },
      };
    }
  }

  /**
   * ✅ Get conversion rate analysis (handle admin case)
   */
  async getConversionRateAnalysis(companyId, filters = {}) {
    try {
      // ✅ Handle admin case
      if (companyId === "admin") {
        return await this.getConversionRateAnalysisForAdmin(filters);
      }

      // ✅ Regular company analysis
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/purchase-orders/reports/conversion-rate",
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "✅ Conversion rate analysis fetched successfully",
      };
    } catch (error) {
      // ✅ Return comprehensive fallback data
      return {
        success: true,
        data: {
          statusDistribution: {},
          typeDistribution: {},
          monthlyTrends: [],
          topSuppliers: [],
          topCompanies: [],
          conversionFunnel: [],
          performanceMetrics: {
            totalOrders: 0,
            totalValue: 0,
            avgOrderValue: 0,
            overallConversionRate: 0,
          },
        },
        message: "✅ Fallback conversion rate analysis (endpoint unavailable)",
      };
    }
  }

  // ==================== HELPER METHODS FOR ADMIN STATS ====================

  /**
   * ✅ Calculate admin statistics from purchase orders data
   */
  calculateAdminStatsFromData(orders) {
    if (!orders || !Array.isArray(orders)) {
      return this.getEmptyAdminStats();
    }

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const stats = {
      totalOrders: orders.length,
      totalRevenue: 0,
      totalAmount: 0,
      activeCompanies: 0,
      thisMonthOrders: 0,
      lastMonthOrders: 0,
      orderGrowth: 0,
      pendingOrders: 0,
      completedOrders: 0,
      conversionRate: 0,
      ordersByStatus: {
        draft: 0,
        sent: 0,
        confirmed: 0,
        received: 0,
        partially_received: 0,
        cancelled: 0,
        completed: 0,
      },
      ordersByCompany: {},
      ordersByMonth: [],
      topSuppliers: [],
      recentOrders: [],
      totalCompanies: 0,
      companySummary: [],
    };

    // Track unique companies
    const uniqueCompanies = new Set();
    const companyStats = {};
    const supplierStats = {};

    orders.forEach((order) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const totalAmount = parseFloat(
        order.totals?.finalTotal || order.totalAmount || 0
      );
      const status = order.status || "draft";

      // Basic counters
      stats.totalRevenue += totalAmount;
      stats.totalAmount += totalAmount;

      // Company tracking
      const companyId = order.companyId?._id || order.companyId;
      if (companyId) {
        uniqueCompanies.add(companyId.toString());

        if (!companyStats[companyId]) {
          companyStats[companyId] = {
            companyId,
            companyName:
              order.companyId?.businessName ||
              order.companyName ||
              "Unknown Company",
            orderCount: 0,
            totalRevenue: 0,
            orders: [],
          };
        }
        companyStats[companyId].orderCount++;
        companyStats[companyId].totalRevenue += totalAmount;
        companyStats[companyId].orders.push(order);
      }

      // Supplier tracking
      const supplierId =
        order.supplier?._id || order.supplier || order.supplierId;
      const supplierName =
        order.supplier?.name || order.supplierName || "Unknown Supplier";
      if (supplierId) {
        if (!supplierStats[supplierId]) {
          supplierStats[supplierId] = {
            supplierId,
            supplierName,
            orderCount: 0,
            totalValue: 0,
          };
        }
        supplierStats[supplierId].orderCount++;
        supplierStats[supplierId].totalValue += totalAmount;
      }

      // Status counting
      if (stats.ordersByStatus.hasOwnProperty(status)) {
        stats.ordersByStatus[status]++;
      } else {
        stats.ordersByStatus[status] = 1;
      }

      // Date-based counting
      if (orderDate >= thisMonth) {
        stats.thisMonthOrders++;
      } else if (orderDate >= lastMonth && orderDate <= lastMonthEnd) {
        stats.lastMonthOrders++;
      }

      // Status categorization
      if (["draft", "sent", "confirmed"].includes(status)) {
        stats.pendingOrders++;
      } else if (["received", "completed"].includes(status)) {
        stats.completedOrders++;
      }
    });

    // Calculate derived stats
    stats.activeCompanies = uniqueCompanies.size;
    stats.totalCompanies = uniqueCompanies.size;

    // Calculate growth rate
    if (stats.lastMonthOrders > 0) {
      stats.orderGrowth =
        ((stats.thisMonthOrders - stats.lastMonthOrders) /
          stats.lastMonthOrders) *
        100;
    } else {
      stats.orderGrowth = stats.thisMonthOrders > 0 ? 100 : 0;
    }

    // Calculate conversion rate
    const completedOrders = stats.ordersByStatus.completed || 0;
    stats.conversionRate =
      stats.totalOrders > 0 ? (completedOrders / stats.totalOrders) * 100 : 0;

    // Company summary
    stats.companySummary = Object.values(companyStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    stats.ordersByCompany = Object.values(companyStats).reduce(
      (acc, company) => {
        acc[company.companyName] = company.orderCount;
        return acc;
      },
      {}
    );

    // Top suppliers
    stats.topSuppliers = Object.values(supplierStats)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((supplier) => ({
        name: supplier.supplierName,
        orders: supplier.orderCount,
        value: supplier.totalValue,
      }));

    // Recent orders
    stats.recentOrders = orders
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.orderDate) -
          new Date(a.createdAt || a.orderDate)
      )
      .slice(0, 10);

    return stats;
  }

  /**
   * ✅ Calculate conversion analysis from purchase orders data
   */
  calculateConversionAnalysisFromData(orders) {
    if (!orders || !Array.isArray(orders)) {
      return {
        statusDistribution: {},
        typeDistribution: {},
        monthlyTrends: [],
        topSuppliers: [],
        topCompanies: [],
        conversionFunnel: [],
        performanceMetrics: {
          totalOrders: 0,
          totalValue: 0,
          avgOrderValue: 0,
          overallConversionRate: 0,
        },
      };
    }

    const analysis = {
      statusDistribution: {},
      typeDistribution: {},
      monthlyTrends: [],
      topSuppliers: [],
      topCompanies: [],
      conversionFunnel: [],
      performanceMetrics: {
        totalOrders: orders.length,
        totalValue: 0,
        avgOrderValue: 0,
        overallConversionRate: 0,
      },
    };

    const companyStats = {};
    const supplierStats = {};
    const monthlyStats = {};
    let convertedCount = 0;

    orders.forEach((order) => {
      const totalAmount = parseFloat(
        order.totals?.finalTotal || order.totalAmount || 0
      );
      const status = order.status || "draft";
      const orderType = order.orderType || "purchase_order";
      const orderDate = new Date(order.orderDate || order.createdAt);
      const monthKey = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;

      // Accumulate total value
      analysis.performanceMetrics.totalValue += totalAmount;

      // Status distribution
      analysis.statusDistribution[status] =
        (analysis.statusDistribution[status] || 0) + 1;

      // Type distribution
      analysis.typeDistribution[orderType] =
        (analysis.typeDistribution[orderType] || 0) + 1;

      // Monthly trends
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          orders: 0,
          value: 0,
          converted: 0,
        };
      }
      monthlyStats[monthKey].orders++;
      monthlyStats[monthKey].value += totalAmount;

      // Count converted orders
      if (status === "completed" || order.convertedToPurchaseInvoice) {
        convertedCount++;
        monthlyStats[monthKey].converted++;
      }

      // Company stats
      const companyId = order.companyId?._id || order.companyId;
      const companyName =
        order.companyId?.businessName || order.companyName || "Unknown Company";
      if (companyId) {
        if (!companyStats[companyId]) {
          companyStats[companyId] = {
            name: companyName,
            orders: 0,
            value: 0,
            converted: 0,
          };
        }
        companyStats[companyId].orders++;
        companyStats[companyId].value += totalAmount;
        if (status === "completed" || order.convertedToPurchaseInvoice) {
          companyStats[companyId].converted++;
        }
      }

      // Supplier stats
      const supplierId =
        order.supplier?._id || order.supplier || order.supplierId;
      const supplierName =
        order.supplier?.name || order.supplierName || "Unknown Supplier";
      if (supplierId) {
        if (!supplierStats[supplierId]) {
          supplierStats[supplierId] = {
            name: supplierName,
            orders: 0,
            value: 0,
            converted: 0,
          };
        }
        supplierStats[supplierId].orders++;
        supplierStats[supplierId].value += totalAmount;
        if (status === "completed" || order.convertedToPurchaseInvoice) {
          supplierStats[supplierId].converted++;
        }
      }
    });

    // Calculate derived metrics
    analysis.performanceMetrics.avgOrderValue =
      analysis.performanceMetrics.totalOrders > 0
        ? analysis.performanceMetrics.totalValue /
          analysis.performanceMetrics.totalOrders
        : 0;

    analysis.performanceMetrics.overallConversionRate =
      analysis.performanceMetrics.totalOrders > 0
        ? (convertedCount / analysis.performanceMetrics.totalOrders) * 100
        : 0;

    // Monthly trends
    analysis.monthlyTrends = Object.values(monthlyStats)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((month) => ({
        ...month,
        conversionRate:
          month.orders > 0 ? (month.converted / month.orders) * 100 : 0,
      }));

    // Top companies
    analysis.topCompanies = Object.values(companyStats)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((company) => ({
        ...company,
        conversionRate:
          company.orders > 0 ? (company.converted / company.orders) * 100 : 0,
      }));

    // Top suppliers
    analysis.topSuppliers = Object.values(supplierStats)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((supplier) => ({
        ...supplier,
        conversionRate:
          supplier.orders > 0
            ? (supplier.converted / supplier.orders) * 100
            : 0,
      }));

    // Conversion funnel
    const totalOrders = analysis.performanceMetrics.totalOrders;
    const sentOrders = analysis.statusDistribution.sent || 0;
    const confirmedOrders = analysis.statusDistribution.confirmed || 0;
    const completedOrders = convertedCount;

    analysis.conversionFunnel = [
      {stage: "Created", count: totalOrders, percentage: 100},
      {
        stage: "Sent",
        count: sentOrders,
        percentage: totalOrders > 0 ? (sentOrders / totalOrders) * 100 : 0,
      },
      {
        stage: "Confirmed",
        count: confirmedOrders,
        percentage: totalOrders > 0 ? (confirmedOrders / totalOrders) * 100 : 0,
      },
      {
        stage: "Completed",
        count: completedOrders,
        percentage: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      },
    ];

    return analysis;
  }

  /**
   * ✅ Get unique company count from orders
   */
  getUniqueCompanyCount(orders) {
    if (!orders || !Array.isArray(orders)) {
      return 0;
    }

    const uniqueCompanies = new Set();
    orders.forEach((order) => {
      const companyId = order.companyId?._id || order.companyId;
      if (companyId) {
        uniqueCompanies.add(companyId.toString());
      }
    });

    return uniqueCompanies.size;
  }

  /**
   * ✅ Get empty admin stats structure
   */
  getEmptyAdminStats() {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalAmount: 0,
      activeCompanies: 0,
      thisMonthOrders: 0,
      lastMonthOrders: 0,
      orderGrowth: 0,
      pendingOrders: 0,
      completedOrders: 0,
      conversionRate: 0,
      ordersByStatus: {
        draft: 0,
        sent: 0,
        confirmed: 0,
        received: 0,
        partially_received: 0,
        cancelled: 0,
        completed: 0,
      },
      ordersByCompany: {},
      ordersByMonth: [],
      topSuppliers: [],
      recentOrders: [],
      totalCompanies: 0,
      companySummary: [],
    };
  }

  /**
   * ✅ FIXED: Get purchase order statistics for admin dashboard (NO COMPANY ID)
   */
  async getPurchaseOrderStatsForAdmin(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        adminAccess: true,
        statsOnly: true,
        ...filters,
      };

      // Remove undefined/null values
      Object.keys(params).forEach((key) => {
        if (
          params[key] === undefined ||
          params[key] === null ||
          params[key] === ""
        ) {
          delete params[key];
        }
      });

      try {
        // ✅ FIXED: Use correct backend route structure
        const response = await apiClient.get(
          "/api/purchase-orders/admin/stats",
          {
            params,
          }
        );

        return {
          success: true,
          data: response.data,
          message: "✅ Admin purchase order statistics fetched successfully",
        };
      } catch (error) {
        // ✅ Fallback: Get orders and calculate stats manually
        const ordersResponse = await this.getAllPurchaseOrdersForAdmin({
          limit: 1000,
        });

        if (ordersResponse.success && ordersResponse.data.purchaseOrders) {
          const orders = ordersResponse.data.purchaseOrders;
          const stats = this.calculateAdminStatsFromData(orders);

          return {
            success: true,
            data: stats,
            message:
              "✅ Admin purchase order statistics calculated from orders data",
          };
        }

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "❌ Failed to fetch purchase order statistics",
        data: this.getEmptyAdminStats(),
      };
    }
  }

  /**
   * ✅ FIXED: Get conversion analysis for admin (NO COMPANY ID)
   */
  async getConversionRateAnalysisForAdmin(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        adminAccess: true,
        ...filters,
      };

      // Remove undefined/null values
      Object.keys(params).forEach((key) => {
        if (
          params[key] === undefined ||
          params[key] === null ||
          params[key] === ""
        ) {
          delete params[key];
        }
      });

      try {
        // ✅ FIXED: Use correct backend route structure
        const response = await apiClient.get(
          "/api/purchase-orders/admin/conversion-analysis",
          {params}
        );

        return {
          success: true,
          data: response.data,
          message: "✅ Admin conversion analysis fetched successfully",
        };
      } catch (error) {
        // ✅ Fallback: Get orders and calculate conversion analysis manually
        const ordersResponse = await this.getAllPurchaseOrdersForAdmin({
          limit: 1000,
        });

        if (ordersResponse.success && ordersResponse.data.purchaseOrders) {
          const orders = ordersResponse.data.purchaseOrders;
          const analysis = this.calculateConversionAnalysisFromData(orders);

          return {
            success: true,
            data: analysis,
            message: "✅ Admin conversion analysis calculated from orders data",
          };
        }

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "❌ Failed to fetch conversion analysis",
        data: {
          statusDistribution: {},
          typeDistribution: {},
          monthlyTrends: [],
          topSuppliers: [],
          topCompanies: [],
          conversionFunnel: [],
          performanceMetrics: {
            totalOrders: 0,
            totalValue: 0,
            avgOrderValue: 0,
            overallConversionRate: 0,
          },
        },
      };
    }
  }

  /**
   * ✅ FIXED: Get bidirectional analytics for admin (NO COMPANY ID)
   */
  async getAdminBidirectionalAnalytics(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        adminAccess: true,
        ...filters,
      };

      // ✅ FIXED: Use correct backend route structure
      const response = await apiClient.get(
        "/api/purchase-orders/admin/bidirectional-analytics",
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "✅ Admin bidirectional analytics fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "❌ Failed to fetch admin bidirectional analytics",
        data: {
          totalBidirectionalOrders: 0,
          totalBidirectionalValue: 0,
          companiesUsingBidirectional: 0,
          bidirectionalRevenue: 0,
          conversionRates: {},
          relationshipMapping: [],
          sourceBreakdown: {},
          detectionMethodStats: {},
          topCompanyPairs: [],
          monthlyTrends: [],
          flowAnalysis: {},
        },
      };
    }
  }

  /**
   * ✅ FIXED: Get bidirectional dashboard for admin (NO COMPANY ID)
   */
  async getAdminBidirectionalDashboard(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        adminAccess: true,
        ...filters,
      };

      // ✅ FIXED: Use correct backend route structure
      const response = await apiClient.get(
        "/api/purchase-orders/admin/bidirectional-dashboard",
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "✅ Admin bidirectional dashboard fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "❌ Failed to fetch admin bidirectional dashboard",
        data: {
          summary: {},
          companyRelationships: [],
          orderFlows: [],
          sourceCompanyBreakdown: {},
        },
      };
    }
  }
  /**
   * ✅ NEW: Get all bidirectional orders for admin (across all companies)
   */
  async getAllBidirectionalOrdersForAdmin(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        bidirectional: true,
        populate: "supplier,companyId,sourceCompanyId,correspondingOrder",
        page: filters.page || 1,
        limit: filters.limit || 100,
        ...filters,
      };

      // Remove undefined/null values
      Object.keys(params).forEach((key) => {
        if (
          params[key] === undefined ||
          params[key] === null ||
          params[key] === ""
        ) {
          delete params[key];
        }
      });

      const response = await apiClient.get("/api/admin/bidirectional-orders", {
        params,
      });

      if (!response.data) {
        throw new Error("No data received from server");
      }

      let bidirectionalOrders = [];
      let responseData = response.data;

      // Handle multiple response structures
      if (responseData.success !== undefined) {
        if (responseData.success === false) {
          throw new Error(responseData.message || "API returned error");
        }
        if (responseData.data) {
          if (Array.isArray(responseData.data)) {
            bidirectionalOrders = responseData.data;
          } else if (responseData.data.bidirectionalOrders) {
            bidirectionalOrders = responseData.data.bidirectionalOrders;
          } else if (responseData.data.orders) {
            bidirectionalOrders = responseData.data.orders;
          }
        }
      } else if (Array.isArray(responseData)) {
        bidirectionalOrders = responseData;
      } else if (
        responseData.bidirectionalOrders &&
        Array.isArray(responseData.bidirectionalOrders)
      ) {
        bidirectionalOrders = responseData.bidirectionalOrders;
      }

      return {
        success: true,
        data: {
          bidirectionalOrders: bidirectionalOrders,
          orders: bidirectionalOrders,
          data: bidirectionalOrders,
          count: bidirectionalOrders.length,
          pagination: responseData.pagination || {},
          summary: responseData.summary || {},
          adminStats: responseData.adminStats || {},
          relationships: responseData.relationships || {},
        },
        message:
          responseData.message ||
          `Found ${bidirectionalOrders.length} bidirectional orders`,
      };
    } catch (error) {
      console.error("❌ Error fetching admin bidirectional orders:", error);

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch all bidirectional orders for admin",
        data: {
          bidirectionalOrders: [],
          orders: [],
          data: [],
          count: 0,
          pagination: {},
          summary: {},
          adminStats: {},
          relationships: {},
        },
      };
    }
  }

  /**
   * ✅ NEW: Get company relationship mapping for admin
   */
  async getAdminCompanyRelationshipMapping(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        ...filters,
      };

      const response = await apiClient.get(
        "/api/admin/bidirectional-orders/relationships",
        {
          params,
        }
      );

      return {
        success: true,
        data: response.data,
        message: "Company relationship mapping fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch company relationship mapping",
        data: {
          companyPairs: [],
          relationshipGraph: {},
          connectionStrength: {},
          mutualRelationships: [],
          oneWayRelationships: [],
          totalConnections: 0,
        },
      };
    }
  }

  /**
   * ✅ NEW: Get bidirectional order flow analysis for admin
   */
  async getAdminBidirectionalFlowAnalysis(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        ...filters,
      };

      const response = await apiClient.get(
        "/api/admin/bidirectional-orders/flow-analysis",
        {
          params,
        }
      );

      return {
        success: true,
        data: response.data,
        message: "Bidirectional flow analysis fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch bidirectional flow analysis",
        data: {
          flowPatterns: [],
          conversionFunnels: {},
          orderChains: [],
          circularity: {},
          flowEfficiency: {},
          bottlenecks: [],
        },
      };
    }
  }

  /**
   * ✅ MISSING: Get orders by status
   */
  async getOrdersByStatus(companyId, status, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        `/api/purchase-orders/by-status/${status}`,
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: `${status} orders fetched successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          `Failed to fetch ${status} orders`,
      };
    }
  }

  // ==================== 🖨️ PRINT & EXPORT FUNCTIONS ====================

  /**
   * ✅ Get purchase order for printing
   */
  async getPurchaseOrderForPrint(orderId, options = {}) {
    try {
      const params = {
        format: options.format || "a4",
        template: options.template || "standard",
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/print`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order data prepared for printing",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order for printing",
        data: null,
      };
    }
  }

  /**
   * ✅ Get purchase order for email/PDF generation
   */
  async getPurchaseOrderForEmail(orderId, options = {}) {
    try {
      const params = {
        includePaymentLink: options.includePaymentLink || false,
        template: options.template || "professional",
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/email`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order data prepared for email",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order for email",
        data: null,
      };
    }
  }

  /**
   * ✅ Download purchase order as PDF
   */
  async downloadPurchaseOrderPDF(orderId, options = {}) {
    try {
      const params = {
        template: options.template || "standard",
        format: options.format || "a4",
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/download-pdf`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "PDF download initiated",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to generate PDF",
        data: null,
      };
    }
  }

  /**
   * ✅ Get multiple purchase orders for bulk printing
   */
  async getBulkPurchaseOrdersForPrint(orderIds, options = {}) {
    try {
      const params = {
        format: options.format || "a4",
        template: options.template || "standard",
        ...options,
      };

      const response = await apiClient.post(
        "/api/purchase-orders/bulk/print",
        {ids: orderIds},
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: `${orderIds.length} purchase orders prepared for bulk printing`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get bulk purchase orders for printing",
        data: null,
      };
    }
  }

  /**
   * ✅ Get purchase order QR confirmation data
   */
  async getPurchaseOrderForQRConfirmation(orderId) {
    try {
      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/qr-confirmation`
      );

      return {
        success: true,
        data: response.data,
        message: "Order confirmation QR data generated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order for QR confirmation",
        data: null,
      };
    }
  }

  /**
   * ✅ Get purchase order summary for quick view
   */
  async getPurchaseOrderSummary(orderId) {
    try {
      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/summary`
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order summary retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order summary",
        data: null,
      };
    }
  }

  /**
   * ✅ Get purchase quotation for printing
   */
  async getPurchaseQuotationForPrint(orderId, options = {}) {
    try {
      const params = {
        format: options.format || "a4",
        template: options.template || "quotation",
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/quotations/${orderId}/print`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase quotation data prepared for printing",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase quotation for printing",
        data: null,
      };
    }
  }

  /**
   * ✅ Get proforma purchase order for printing
   */
  async getProformaPurchaseForPrint(orderId, options = {}) {
    try {
      const params = {
        format: options.format || "a4",
        template: options.template || "proforma",
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/proforma/${orderId}/print`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Proforma purchase order data prepared for printing",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get proforma purchase order for printing",
        data: null,
      };
    }
  }

  // ==================== 📱 MOBILE & APP SPECIFIC FUNCTIONS ====================

  /**
   * ✅ Get purchase order optimized for mobile printing
   */
  async getPurchaseOrderForMobilePrint(orderId, options = {}) {
    try {
      const params = {
        format: "mobile",
        template: "compact",
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/mobile-print`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order data prepared for mobile printing",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order for mobile printing",
        data: null,
      };
    }
  }

  /**
   * ✅ Get purchase order optimized for thermal printer
   */
  async getPurchaseOrderForThermalPrint(orderId, options = {}) {
    try {
      const params = {
        format: "thermal",
        template: "minimal",
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/thermal-print`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order data prepared for thermal printing",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order for thermal printing",
        data: null,
      };
    }
  }

  /**
   * ✅ Get purchase order optimized for WhatsApp sharing
   */
  async getPurchaseOrderForWhatsAppShare(orderId, options = {}) {
    try {
      const params = {
        template: "whatsapp",
        includePaymentLink: true,
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/whatsapp-share`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order data prepared for WhatsApp sharing",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order for WhatsApp sharing",
        data: null,
      };
    }
  }

  // ==================== 📁 BULK OPERATIONS FOR PRINTING ====================

  /**
   * ✅ Get multiple purchase orders for bulk email
   */
  async getBulkPurchaseOrdersForEmail(orderIds, options = {}) {
    try {
      const params = {
        template: options.template || "professional",
        ...options,
      };

      const response = await apiClient.post(
        "/api/purchase-orders/bulk/email-data",
        {ids: orderIds},
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: `${orderIds.length} purchase orders prepared for bulk email`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get bulk email data",
        data: null,
      };
    }
  }

  /**
   * ✅ Download multiple purchase orders as PDFs
   */
  async downloadBulkPurchaseOrdersPDF(orderIds, options = {}) {
    try {
      const params = {
        template: options.template || "standard",
        format: options.format || "a4",
        ...options,
      };

      const response = await apiClient.post(
        "/api/purchase-orders/bulk/download-pdf",
        {ids: orderIds},
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: `${orderIds.length} purchase orders prepared for bulk PDF download`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to prepare bulk PDF download",
        data: null,
      };
    }
  }

  // ==================== 🔍 DOCUMENT VALIDATION & PREVIEW ====================

  /**
   * ✅ Validate purchase order data before printing
   */
  async validatePurchaseOrderForPrint(orderId) {
    try {
      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/validate-print`
      );

      return {
        success: true,
        data: response.data,
        message: response.data.message || "Order validation completed",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to validate order for printing",
        data: {
          orderId,
          validation: {
            isValid: false,
            warnings: [],
            errors: ["Validation failed"],
            recommendations: [],
          },
          printReady: false,
        },
      };
    }
  }

  /**
   * ✅ Get available print templates
   */
  async getPrintTemplates() {
    try {
      const response = await apiClient.get(
        "/api/purchase-orders/print-templates"
      );

      return {
        success: true,
        data: response.data,
        message: "Print templates retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get print templates",
        data: {
          templates: {
            standard: {
              name: "Standard",
              description: "Default purchase order template",
              features: ["Company logo", "Full item details", "Tax breakdown"],
              formats: ["a4", "letter"],
            },
            compact: {
              name: "Compact",
              description: "Space-saving template for mobile",
              features: ["Essential details only", "Mobile optimized"],
              formats: ["a4", "mobile"],
            },
            professional: {
              name: "Professional",
              description:
                "Business-oriented template with enhanced formatting",
              features: [
                "Professional layout",
                "Enhanced branding",
                "Detailed terms",
              ],
              formats: ["a4", "letter"],
            },
          },
          defaultTemplate: "standard",
          defaultFormat: "a4",
        },
      };
    }
  }

  // ==================== 📧 EMAIL & SHARING FUNCTIONS ====================

  /**
   * ✅ Get purchase order email data (alternative method)
   */
  async getPurchaseOrderEmailData(orderId, options = {}) {
    try {
      const params = {
        template: options.template || "professional",
        includePaymentLink: options.includePaymentLink || false,
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/email-data`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order email data prepared successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order email data",
        data: null,
      };
    }
  }

  /**
   * ✅ Get purchase order sharing data
   */
  async getPurchaseOrderSharingData(orderId, options = {}) {
    try {
      const params = {
        template: options.template || "standard",
        platform: options.platform || "email",
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/sharing-data`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order sharing data prepared successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order sharing data",
        data: null,
      };
    }
  }

  // ==================== 🔗 QR CODE & CONFIRMATION FUNCTIONS ====================

  /**
   * ✅ Get purchase order QR code data (alternative method)
   */
  async getPurchaseOrderQRCode(orderId, options = {}) {
    try {
      const params = {
        size: options.size || 256,
        format: options.format || "png",
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/qr-code`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order QR code generated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order QR code",
        data: null,
      };
    }
  }

  /**
   * ✅ Get purchase order confirmation QR
   */
  async getPurchaseOrderConfirmationQR(orderId, options = {}) {
    try {
      const params = {
        size: options.size || 256,
        includeOrderDetails: options.includeOrderDetails || true,
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/confirmation-qr`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order confirmation QR generated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order confirmation QR",
        data: null,
      };
    }
  }

  // ==================== 📊 QUICK VIEW & PREVIEW FUNCTIONS ====================

  /**
   * ✅ Get purchase order preview data
   */
  async getPurchaseOrderPreview(orderId, options = {}) {
    try {
      const params = {
        includeItems: options.includeItems || true,
        includeTotals: options.includeTotals || true,
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/preview`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order preview data retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order preview",
        data: null,
      };
    }
  }

  /**
   * ✅ Get purchase order quick view data
   */
  async getPurchaseOrderQuickView(orderId, options = {}) {
    try {
      const params = {
        includeActions: options.includeActions || true,
        includeTimeline: options.includeTimeline || true,
        ...options,
      };

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/quick-view`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order quick view data retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get purchase order quick view",
        data: null,
      };
    }
  }

  // ==================== 📄 DOCUMENT TYPE SPECIFIC FUNCTIONS ====================

  /**
   * ✅ Get document by type for printing
   */
  async getDocumentForPrint(orderId, documentType, options = {}) {
    try {
      let endpoint;
      let defaultTemplate;

      switch (documentType) {
        case "purchase_quotation":
        case "quotation":
          endpoint = `/api/purchase-orders/print/quotation/${orderId}`;
          defaultTemplate = "quotation";
          break;
        case "proforma_purchase":
        case "proforma":
          endpoint = `/api/purchase-orders/print/proforma/${orderId}`;
          defaultTemplate = "proforma";
          break;
        case "purchase_order":
        case "order":
        default:
          endpoint = `/api/purchase-orders/print/order/${orderId}`;
          defaultTemplate = "standard";
          break;
      }

      const params = {
        format: options.format || "a4",
        template: options.template || defaultTemplate,
        ...options,
      };

      const response = await apiClient.get(endpoint, {params});

      return {
        success: true,
        data: response.data,
        message: `${documentType} data prepared for printing`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          `Failed to get ${documentType} for printing`,
        data: null,
      };
    }
  }

  // ==================== 🎯 UTILITY FUNCTIONS FOR PRINTING ====================

  /**
   * ✅ Print purchase order (opens print dialog)
   */
  async printPurchaseOrder(orderId, options = {}) {
    try {
      const printData = await this.getPurchaseOrderForPrint(orderId, options);

      if (!printData.success) {
        throw new Error(printData.message);
      }

      // Create a new window for printing
      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        throw new Error("Pop-up blocked. Please allow pop-ups for this site.");
      }

      // Generate HTML content for printing
      const htmlContent = this.generatePrintHTML(printData.data, options);

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };

      return {
        success: true,
        message: "Print dialog opened successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to print purchase order",
      };
    }
  }

  /**
   * ✅ Generate HTML content for printing
   */
  generatePrintHTML(orderData, options = {}) {
    const {template = "standard", format = "a4"} = options;

    // Basic HTML structure for printing
    return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Purchase Order - ${
            orderData.order?.orderNumber || "PO"
          }</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-info { margin-bottom: 20px; }
            .order-details { margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f5f5f5; }
            .totals { text-align: right; margin-top: 20px; }
            .footer { margin-top: 30px; font-size: 12px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Purchase Order</h1>
            <h2>${orderData.order?.orderNumber || "PO Number"}</h2>
          </div>
          
          <div class="company-info">
            <strong>${orderData.company?.name || "Company Name"}</strong><br>
            ${orderData.company?.address || "Company Address"}<br>
            ${orderData.company?.phone || "Phone"} | ${
      orderData.company?.email || "Email"
    }
          </div>
          
          <div class="order-details">
            <strong>Supplier:</strong> ${
              orderData.supplier?.name || "Supplier Name"
            }<br>
            <strong>Order Date:</strong> ${new Date(
              orderData.order?.orderDate
            ).toLocaleDateString()}<br>
            <strong>Status:</strong> ${orderData.order?.status || "Status"}
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${
                orderData.items
                  ?.map(
                    (item) => `
                <tr>
                  <td>${item.srNo}</td>
                  <td>${item.name}</td>
                  <td>${item.quantity} ${item.unit}</td>
                  <td>₹${item.rate}</td>
                  <td>₹${item.amount}</td>
                </tr>
              `
                  )
                  .join("") || '<tr><td colspan="5">No items found</td></tr>'
              }
            </tbody>
          </table>
          
          <div class="totals">
            <strong>Total: ₹${orderData.totals?.finalTotal || 0}</strong>
          </div>
          
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;
  }

  /**
   * ✅ Download purchase order as file
   */
  async downloadPurchaseOrder(orderId, format = "pdf", options = {}) {
    try {
      let downloadFunction;

      switch (format.toLowerCase()) {
        case "pdf":
          downloadFunction = this.downloadPurchaseOrderPDF;
          break;
        case "excel":
        case "xlsx":
          downloadFunction = this.exportPurchaseOrderToExcel;
          break;
        case "csv":
          downloadFunction = this.exportPurchaseOrderToCSV;
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const result = await downloadFunction.call(this, orderId, options);

      if (result.success) {
        return {
          success: true,
          message: `Purchase order downloaded as ${format.toUpperCase()}`,
          data: result.data,
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to download purchase order",
        data: null,
      };
    }
  }

  /**
   * ✅ Export purchase order to Excel
   */
  async exportPurchaseOrderToExcel(orderId, options = {}) {
    try {
      const orderData = await this.getPurchaseOrderForPrint(orderId, options);

      if (!orderData.success) {
        throw new Error(orderData.message);
      }

      // Create Excel-compatible CSV data
      const csvData = this.convertOrderToCSV(orderData.data);

      // Create and download file
      const blob = new Blob([csvData], {type: "text/csv;charset=utf-8;"});
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `purchase-order-${orderId}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return {
        success: true,
        message: "Purchase order exported to Excel successfully",
        data: {filename: `purchase-order-${orderId}.csv`},
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to export purchase order to Excel",
        data: null,
      };
    }
  }

  /**
   * ✅ Export purchase order to CSV
   */
  async exportPurchaseOrderToCSV(orderId, options = {}) {
    try {
      const orderData = await this.getPurchaseOrderForPrint(orderId, options);

      if (!orderData.success) {
        throw new Error(orderData.message);
      }

      const csvData = this.convertOrderToCSV(orderData.data);

      // Create and download file
      const blob = new Blob([csvData], {type: "text/csv;charset=utf-8;"});
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `purchase-order-${orderId}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return {
        success: true,
        message: "Purchase order exported to CSV successfully",
        data: {filename: `purchase-order-${orderId}.csv`},
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to export purchase order to CSV",
        data: null,
      };
    }
  }

  /**
   * ✅ Convert order data to CSV format
   */
  convertOrderToCSV(orderData) {
    const headers = [
      "Order Number",
      "Date",
      "Supplier",
      "Item Name",
      "Quantity",
      "Unit",
      "Rate",
      "Amount",
      "Total",
    ];

    const rows =
      orderData.items?.map((item) => [
        orderData.order?.orderNumber || "",
        new Date(orderData.order?.orderDate).toLocaleDateString(),
        orderData.supplier?.name || "",
        item.name || "",
        item.quantity || 0,
        item.unit || "",
        item.rate || 0,
        item.amount || 0,
        orderData.totals?.finalTotal || 0,
      ]) || [];

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    return csvContent;
  }

  // ==================== 🎨 TEMPLATE MANAGEMENT ====================

  /**
   * ✅ Get template by name
   */
  async getTemplate(templateName) {
    try {
      const templatesResult = await this.getPrintTemplates();

      if (!templatesResult.success) {
        throw new Error(templatesResult.message);
      }

      const template = templatesResult.data.templates[templateName];

      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      return {
        success: true,
        data: template,
        message: `Template '${templateName}' retrieved successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to get template",
        data: null,
      };
    }
  }

  /**
   * ✅ Get supported formats for template
   */
  async getSupportedFormats(templateName) {
    try {
      const templateResult = await this.getTemplate(templateName);

      if (!templateResult.success) {
        throw new Error(templateResult.message);
      }

      return {
        success: true,
        data: {
          formats: templateResult.data.formats || ["a4"],
          defaultFormat: templateResult.data.formats?.[0] || "a4",
        },
        message: `Supported formats for '${templateName}' retrieved successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to get supported formats",
        data: {
          formats: ["a4"],
          defaultFormat: "a4",
        },
      };
    }
  }

  /**
   * ✅ Confirm purchase order (individual confirmation)
   */
  async confirmPurchaseOrder(orderId, confirmationData = {}) {
    try {
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      const response = await apiClient.post(
        `/api/purchase-orders/${orderId}/confirm`,
        {
          confirmedBy:
            confirmationData.confirmedBy ||
            localStorage.getItem("userId") ||
            "system",
          notes: confirmationData.notes || "",
          confirmedAt: new Date().toISOString(),
          status: "confirmed",
          isConfirmed: true,
          confirmationType: "manual_confirmation",
          confirmationSource: "purchase_order_table",
          ...confirmationData,
        }
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase order confirmed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to confirm purchase order",
      };
    }
  }

  /**
   * ✅ Get purchase orders that need confirmation
   */
  async getOrdersNeedingConfirmation(companyId, filters = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {
        companyId,
        isAutoGenerated: true,
        generatedFrom: "sales_order",
        status: "sent", // Orders sent but not yet confirmed
        ...filters,
      };

      const response = await apiClient.get(
        "/api/purchase-orders/needing-confirmation",
        {
          params,
        }
      );

      return {
        success: true,
        data: response.data,
        message: "Purchase orders needing confirmation fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch purchase orders needing confirmation",
        data: {
          orders: [],
          count: 0,
        },
      };
    }
  }

  /**
   * ✅ Bulk confirm multiple purchase orders
   */
  async bulkConfirmOrders(orderIds, confirmationData = {}) {
    try {
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error("Order IDs array is required");
      }

      const response = await apiClient.post(
        "/api/purchase-orders/bulk/confirm",
        {
          orderIds,
          confirmedBy:
            confirmationData.confirmedBy ||
            localStorage.getItem("userId") ||
            "system",
          notes: confirmationData.notes || "",
          status: "confirmed",
          confirmedAt: new Date().toISOString(),
          isConfirmed: true,
          confirmationType: "bulk_confirmation",
          confirmationSource: "purchase_order_table",
          ...confirmationData,
        }
      );

      return {
        success: true,
        data: response.data,
        message: `${
          response.data.data?.successful?.length || 0
        } purchase orders confirmed successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to bulk confirm purchase orders",
      };
    }
  }

  /**
   * ✅ Check confirmation status of a purchase order
   */
  async checkConfirmationStatus(orderId) {
    try {
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      const response = await apiClient.get(
        `/api/purchase-orders/${orderId}/confirmation-status`
      );

      return {
        success: true,
        data: response.data,
        message: "Confirmation status checked successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to check confirmation status",
      };
    }
  }
}

// Export as default
export default new PurchaseOrderService();
