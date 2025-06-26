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
      console.log("🚫 Duplicate request detected, returning existing promise");
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
      console.log("📤 Submitting purchase order:", {
        companyId: orderData.companyId,
        supplierName: orderData.supplierName,
        supplierMobile: orderData.supplierMobile,
        itemsCount: orderData.items?.length,
        autoDetectSourceCompany: orderData.autoDetectSourceCompany, // ✅ NEW
        hasSupplierInfo: !!(
          orderData.supplierName ||
          orderData.supplierMobile ||
          orderData.supplier
        ),
      });

      const response = await apiClient.post("/api/purchase-orders", orderData);

      console.log("✅ Purchase order created successfully:", {
        orderNumber: response.data.data?.purchaseOrder?.orderNumber,
        sourceCompanyId:
          response.data.data?.sourceCompanyTracking?.sourceCompanyId, // ✅ NEW
        detectionMethod:
          response.data.data?.sourceCompanyTracking?.detectionMethod, // ✅ NEW
        autoDetectedSource:
          response.data.data?.sourceCompanyTracking?.autoDetectedSourceCompany, // ✅ NEW
        success: response.data.success,
      });

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

      console.log("📡 Fetching purchase orders with params:", params);

      const response = await apiClient.get("/api/purchase-orders", {
        params,
      });

      console.log("📊 Raw API response:", response.data);

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

      console.log("✅ Processed purchase orders:", purchaseOrders.length);

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
   * Generate order number with fallback
   */
  async generateOrderNumber(
    companyId,
    orderType = "purchase_order",
    userId = null
  ) {
    // Always provide fallback first for immediate response
    const fallbackNumber = this.generateFallbackOrderNumber(
      companyId,
      orderType,
      userId
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
    };
  }

  /**
   * Generate fallback order number
   */
  generateFallbackOrderNumber(
    companyId,
    orderType = "purchase_order",
    userId = null
  ) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    // Use company ID and user ID for uniqueness
    const companyHash = companyId ? companyId.slice(-3) : "001";
    const userHash = userId ? userId.slice(-2) : "01";
    const random = Math.floor(100 + Math.random() * 900);

    let prefix = "DOC";
    switch (orderType) {
      case "purchase_quotation":
        prefix = "PQU";
        break;
      case "purchase_order":
        prefix = "PO";
        break;
      case "proforma_purchase":
        prefix = "PPO";
        break;
      default:
        prefix = "PO";
    }

    return `${prefix}-${year}${month}${day}${hours}${minutes}-${companyHash}${userHash}${random}`;
  }

  /**
   * Search orders
   */
  async searchOrders(companyId, searchTerm, filters = {}) {
    try {
      const params = {
        companyId,
        q: searchTerm,
        ...filters,
      };
      const response = await apiClient.get("/api/purchase-orders/search", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Search completed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || error.message || "Search failed",
      };
    }
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

        if (preview.success) {
          console.log("🔍 Source company detection preview:", preview.data);
        }
      }

      // Create the purchase order
      const result = await this.createPurchaseOrder(formattedData);

      // Enhanced response with source tracking info
      if (result.success && result.data?.data?.sourceCompanyTracking) {
        const sourceTracking = result.data.data.sourceCompanyTracking;

        console.log("✅ Purchase order created with source tracking:", {
          orderNumber: result.data.data?.purchaseOrder?.orderNumber,
          sourceCompanyDetected: sourceTracking.detected,
          detectionMethod: sourceTracking.detectionMethod,
          sourceCompanyId: sourceTracking.sourceCompanyId,
          linkedCompanyName: sourceTracking.supplierLinkedCompany?.name,
        });

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
}

// Export as default
export default new PurchaseOrderService();
