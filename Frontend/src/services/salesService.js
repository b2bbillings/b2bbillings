import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance with better config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

class SalesService {
  constructor() {
    this.setupInterceptors();
    this.isWarmedUp = false;
    this.warmupPromise = null;
  }

  // Setup interceptors with retry logic
  setupInterceptors() {
    // Request interceptor
    api.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          config.headers["x-auth-token"] = token;
        }

        config.metadata = {
          requestId: `req_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          startTime: Date.now(),
        };

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    api.interceptors.response.use(
      (response) => response,
      async (error) => Promise.reject(error)
    );
  }

  // Get auth token
  getAuthToken() {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token")
    );
  }

  // Check backend health
  async checkBackendHealth() {
    try {
      const response = await api.get("/health", {timeout: 5000});
      return {healthy: true, status: response.status};
    } catch (error) {
      return {
        healthy: false,
        status: error.response?.status,
        error: error.message,
      };
    }
  }

  // Warm up backend connection
  async warmupBackend() {
    if (this.isWarmedUp || this.warmupPromise) {
      return this.warmupPromise || Promise.resolve();
    }

    this.warmupPromise = this.checkBackendHealth()
      .then((health) => {
        this.isWarmedUp = health.healthy;
        return this.isWarmedUp;
      })
      .catch(() => {
        this.isWarmedUp = false;
        return false;
      });

    return this.warmupPromise;
  }

  // ✅ ENHANCED: Payment method normalization to match PaymentModal options
  normalizePaymentMethod(method) {
    if (!method) return "cash";

    // Convert to lowercase and handle common variations
    const normalizedMethod = method.toString().toLowerCase().trim();

    // Map common variations to backend enum values (updated to match PaymentModal)
    const methodMap = {
      // Cash payments
      cash: "cash",
      "cash payment": "cash",

      // UPI payments
      upi: "upi",
      "upi transfer": "upi",

      // Bank transfers
      "bank account": "bank_transfer",
      bank_transfer: "bank_transfer",
      banktransfer: "bank_transfer",
      "bank transfer": "bank_transfer",

      // Card payments
      card: "card",
      "card payment": "card",
      "credit card": "card",
      "debit card": "card",

      // Cheque payments
      cheque: "cheque",
      check: "cheque",
      "cheque payment": "cheque",

      // Online payments
      online: "online",
      "online payment": "online",
      online_transfer: "online",
      onlinetransfer: "online",
      "online transfer": "online",

      // NEFT transfers
      neft: "neft",
      "neft transfer": "neft",

      // RTGS transfers
      rtgs: "rtgs",
      "rtgs transfer": "rtgs",
    };

    return methodMap[normalizedMethod] || "cash";
  }

  validatePaymentData(paymentData) {
    const errors = [];

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      errors.push("Payment amount is required and must be greater than 0");
    }

    if (!paymentData.paymentType) {
      errors.push("Payment method is required");
    }

    // Normalize payment type for comparison
    const normalizedType = (paymentData.paymentType || "").toLowerCase();

    // Only require bank account for non-cash payments
    if (normalizedType !== "cash" && !paymentData.bankAccountId) {
      errors.push(
        `Bank account is required for ${paymentData.paymentType} payments`
      );
    }

    // Validate cheque details
    if (normalizedType === "cheque") {
      if (!paymentData.chequeNumber) {
        errors.push("Cheque number is required for cheque payments");
      }
      if (!paymentData.chequeDate) {
        errors.push("Cheque date is required for cheque payments");
      }
    }

    // Validate next payment date for partial payments
    const finalTotal = parseFloat(paymentData.finalTotal || 0);
    const paymentAmount = parseFloat(paymentData.amount || 0);

    if (paymentAmount < finalTotal && paymentAmount > 0) {
      if (!paymentData.nextPaymentDate) {
        errors.push("Next payment date is required for partial payments");
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  // ✅ ENHANCED: Better payment status logic
  getPaymentStatus(paid, total) {
    const paidAmount = parseFloat(paid) || 0;
    const totalAmount = parseFloat(total) || 0;

    if (totalAmount === 0) return "pending";

    // Use a small threshold to handle floating point precision issues
    const threshold = 0.01;

    if (paidAmount >= totalAmount - threshold) return "paid";
    if (paidAmount > threshold) return "partial";
    return "pending";
  }

  // ✅ ENHANCED: Extract payment info with additional fields from PaymentModal
  extractPaymentInfo(invoiceData) {
    let paymentAmount = 0;
    let paymentMethod = "cash";
    let bankAccountId = null;
    let bankAccountName = null;
    let reference = "";
    let notes = "";
    let dueDate = null;
    let creditDays = 0;
    let chequeNumber = "";
    let chequeDate = null;
    let transactionId = "";
    let nextPaymentDate = null;

    // Priority 1: paymentData from PaymentModal
    if (invoiceData.paymentData && invoiceData.paymentData.amount) {
      paymentAmount = parseFloat(invoiceData.paymentData.amount);
      paymentMethod = this.normalizePaymentMethod(
        invoiceData.paymentData.paymentType ||
          invoiceData.paymentData.method ||
          "cash"
      );
      bankAccountId = invoiceData.paymentData.bankAccountId || null;
      bankAccountName = invoiceData.paymentData.bankAccountName || null;
      reference = invoiceData.paymentData.reference || "";
      notes = invoiceData.paymentData.notes || "";
      dueDate = invoiceData.paymentData.dueDate || null;
      creditDays = invoiceData.paymentData.creditDays || 0;

      // ✅ NEW: Additional fields from PaymentModal
      chequeNumber = invoiceData.paymentData.chequeNumber || "";
      chequeDate = invoiceData.paymentData.chequeDate || null;
      transactionId = invoiceData.paymentData.transactionId || "";
      nextPaymentDate = invoiceData.paymentData.nextPaymentDate || null;
    }
    // Priority 2: payment object
    else if (invoiceData.payment) {
      paymentAmount = parseFloat(
        invoiceData.payment.paidAmount || invoiceData.payment.amount || 0
      );
      paymentMethod = this.normalizePaymentMethod(
        invoiceData.payment.method || "cash"
      );
      bankAccountId = invoiceData.payment.bankAccountId || null;
      bankAccountName = invoiceData.payment.bankAccountName || null;
      reference = invoiceData.payment.reference || "";
      notes = invoiceData.payment.notes || "";
      dueDate = invoiceData.payment.dueDate || null;
      creditDays = invoiceData.payment.creditDays || 0;
      chequeNumber = invoiceData.payment.chequeNumber || "";
      chequeDate = invoiceData.payment.chequeDate || null;
      transactionId = invoiceData.payment.transactionId || "";
    }
    // Priority 3: direct properties
    else if (invoiceData.paymentReceived) {
      paymentAmount = parseFloat(invoiceData.paymentReceived);
      paymentMethod = this.normalizePaymentMethod(
        invoiceData.paymentMethod || "cash"
      );
      dueDate = invoiceData.dueDate || null;
      creditDays = invoiceData.creditDays || 0;
    }

    const finalTotal = parseFloat(
      invoiceData.totals?.finalTotalWithRoundOff ||
        invoiceData.totals?.finalTotal ||
        0
    );
    const pendingAmount = Math.max(0, finalTotal - paymentAmount);

    // ✅ ENHANCED: Return more comprehensive payment info
    const paymentInfo = {
      method: paymentMethod,
      paidAmount: paymentAmount,
      pendingAmount: pendingAmount,
      status: this.getPaymentStatus(paymentAmount, finalTotal),
      paymentDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      creditDays: parseInt(creditDays) || 0,
      reference: reference,
      notes: notes,
      bankAccountId: bankAccountId,
      bankAccountName: bankAccountName,
    };

    // ✅ NEW: Add additional fields based on payment method
    if (paymentMethod === "cheque" && chequeNumber) {
      paymentInfo.chequeNumber = chequeNumber;
      paymentInfo.chequeDate = chequeDate ? new Date(chequeDate) : null;
    }

    if (
      ["upi", "online", "neft", "rtgs"].includes(paymentMethod) &&
      transactionId
    ) {
      paymentInfo.transactionId = transactionId;
    }

    // ✅ NEW: Add next payment date for partial payments
    if (pendingAmount > 0 && nextPaymentDate) {
      paymentInfo.nextPaymentDate = new Date(nextPaymentDate);
    }

    return paymentInfo;
  }

  // ✅ COMPLETELY FIXED: Create invoice with proper submission guards
  async createInvoice(invoiceData, retryCount = 0) {
    const maxRetries = 2;

    // ✅ CRITICAL: Generate unique request ID for tracking
    const requestId = `create_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const baseRequestId = invoiceData.submissionId || `create_${Date.now()}`;

    // ✅ CRITICAL: Check if this exact request is already in progress
    if (this._activeRequests && this._activeRequests.has(baseRequestId)) {
      console.log(
        "⚠️ Create invoice request already in progress:",
        baseRequestId
      );
      return {
        success: false,
        error: "Request already in progress",
        message: "Invoice creation already in progress",
        isDuplicate: true, // ✅ CRITICAL: Mark as duplicate
      };
    }

    try {
      // ✅ CRITICAL: Track this request to prevent duplicates
      if (!this._activeRequests) {
        this._activeRequests = new Set();
      }
      this._activeRequests.add(baseRequestId);

      console.log("💾 Starting invoice creation - SINGLE CALL:", {
        requestId,
        baseRequestId,
        timestamp: new Date().toISOString(),
        retryCount,
      });

      // Ensure backend is ready
      if (!this.isWarmedUp && retryCount === 0) {
        await this.warmupBackend();
      }

      // ✅ NEW: Validate payment data if present
      if (invoiceData.paymentData) {
        const validation = this.validatePaymentData(invoiceData.paymentData);
        if (!validation.isValid) {
          throw new Error(
            `Payment validation failed: ${validation.errors.join(", ")}`
          );
        }
      }

      // Validation
      if (!invoiceData.companyId) {
        throw new Error("Company ID is required");
      }

      if (!invoiceData.items || invoiceData.items.length === 0) {
        throw new Error("At least one item is required");
      }

      // Clean data for backend
      const cleanData = this.cleanInvoiceData(invoiceData);

      // ✅ NEW: Log payment method for debugging
      console.log(
        "💳 Payment method being sent to backend:",
        cleanData.payment?.method
      );

      // Add delay for retries
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryCount * 500));
      }

      const response = await api.post("/sales", cleanData);

      // Handle response formats
      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          console.log("✅ Invoice created successfully:", {
            requestId,
            baseRequestId,
            invoiceId: responseData.data?._id || responseData.data?.id,
          });

          return {
            success: true,
            data: responseData.data,
            message: responseData.message || "Invoice created successfully!",
          };
        }

        if (
          responseData &&
          (responseData._id || responseData.id || responseData.invoiceNumber)
        ) {
          console.log("✅ Invoice created successfully (direct response):", {
            requestId,
            baseRequestId,
            invoiceId: responseData._id || responseData.id,
          });

          return {
            success: true,
            data: responseData,
            message: "Invoice created successfully!",
          };
        }

        if (responseData && responseData.success === false) {
          if (
            retryCount < maxRetries &&
            (responseData.message?.includes("temporary") ||
              responseData.message?.includes("busy") ||
              responseData.message?.includes("initialization"))
          ) {
            console.log(
              "🔄 Retrying invoice creation due to temporary error:",
              {
                requestId,
                baseRequestId,
                retryCount: retryCount + 1,
                error: responseData.message,
              }
            );
            return await this.createInvoice(invoiceData, retryCount + 1);
          }

          throw new Error(
            responseData.message ||
              responseData.error ||
              "Backend rejected the request"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Invoice created successfully!",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error in createInvoice:", {
        requestId,
        baseRequestId,
        error: error.message,
        retryCount,
      });

      // Retry on server errors
      if (
        retryCount < maxRetries &&
        error.response?.status &&
        [500, 502, 503, 504].includes(error.response.status)
      ) {
        console.log("🔄 Retrying due to server error:", {
          requestId,
          baseRequestId,
          status: error.response.status,
          retryCount: retryCount + 1,
        });

        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 1000)
        );
        return await this.createInvoice(invoiceData, retryCount + 1);
      }

      // Retry on network errors
      if (retryCount < maxRetries && !error.response && error.request) {
        console.log("🔄 Retrying due to network error:", {
          requestId,
          baseRequestId,
          retryCount: retryCount + 1,
        });

        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 800)
        );
        return await this.createInvoice(invoiceData, retryCount + 1);
      }

      // Return error
      let errorMessage = "Failed to create invoice";
      let errorDetails = {
        requestId,
        baseRequestId,
        status: error.response?.status,
        isNetworkError: !error.response && !!error.request,
        isRetryExhausted: retryCount >= maxRetries,
        totalAttempts: retryCount + 1,
      };

      if (error.response?.data) {
        errorMessage =
          error.response.data.message ||
          error.response.data.error ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "Network error - unable to reach server";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      if (retryCount >= maxRetries) {
        errorMessage += ` (Failed after ${retryCount + 1} attempts)`;
      }

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
        details: errorDetails,
        isDuplicate: false, // ✅ Not a duplicate, actual error
      };
    } finally {
      // ✅ CRITICAL: Clean up request tracking after delay to prevent rapid successive calls
      setTimeout(() => {
        if (this._activeRequests) {
          this._activeRequests.delete(baseRequestId);
          console.log("🧹 Cleaned up request tracking for:", baseRequestId);
        }
      }, 1500); // 1.5 second cleanup delay
    }
  }

  // ✅ NEW: Get single invoice by ID (enhanced for edit functionality)
  async getInvoiceById(id) {
    try {
      if (!id) {
        throw new Error("Invoice ID is required");
      }

      console.log("🔍 Fetching invoice by ID:", id);

      const response = await api.get(`/sales/${id}`);

      if (response.data && response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        // Handle different response formats
        if (responseData.success === true && responseData.data) {
          return {
            success: true,
            data: responseData.data,
            message: responseData.message || "Invoice fetched successfully",
          };
        }

        if (responseData.success === false) {
          throw new Error(
            responseData.message || responseData.error || "Invoice not found"
          );
        }

        // Direct data response
        if (responseData._id || responseData.id) {
          return {
            success: true,
            data: responseData,
            message: "Invoice fetched successfully",
          };
        }

        throw new Error("Invalid response format");
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error fetching invoice:", error);

      let errorMessage = "Failed to fetch invoice";

      if (error.response?.data) {
        errorMessage =
          error.response.data.message ||
          error.response.data.error ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "Network error - unable to reach server";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  }

  // ✅ ENHANCED: Update invoice method (already exists but enhanced)
  async updateInvoice(id, invoiceData, retryCount = 0) {
    const maxRetries = 2;

    try {
      if (!id) {
        throw new Error("Invoice ID is required");
      }

      console.log(
        "🔄 Updating invoice:",
        id,
        "with data keys:",
        Object.keys(invoiceData)
      );

      // ✅ NEW: Validate payment data if present
      if (invoiceData.paymentData) {
        const validation = this.validatePaymentData(invoiceData.paymentData);
        if (!validation.isValid) {
          throw new Error(
            `Payment validation failed: ${validation.errors.join(", ")}`
          );
        }
      }

      const cleanData = this.cleanInvoiceDataForUpdate(invoiceData);

      console.log("💾 Sending update data:", {
        hasItems: !!cleanData.items?.length,
        hasTotals: !!cleanData.totals,
        hasPayment: !!cleanData.payment,
        status: cleanData.status,
        paymentMethod: cleanData.payment?.method,
      });

      // Add delay for retries
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryCount * 500));
      }

      const response = await api.put(`/sales/${id}`, cleanData);

      // Handle response formats
      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message: responseData.message || "Invoice updated successfully",
          };
        }

        if (responseData && (responseData._id || responseData.id)) {
          return {
            success: true,
            data: responseData,
            message: "Invoice updated successfully",
          };
        }

        if (responseData && responseData.success === false) {
          // Retry on temporary errors
          if (
            retryCount < maxRetries &&
            (responseData.message?.includes("temporary") ||
              responseData.message?.includes("busy") ||
              responseData.message?.includes("stock"))
          ) {
            return await this.updateInvoice(id, invoiceData, retryCount + 1);
          }

          throw new Error(
            responseData.message ||
              responseData.error ||
              "Backend rejected the update"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Invoice updated successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Enhanced error handling for retries
      if (
        retryCount < maxRetries &&
        error.response?.status &&
        [500, 502, 503, 504].includes(error.response.status)
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 1000)
        );
        return await this.updateInvoice(id, invoiceData, retryCount + 1);
      }

      if (retryCount < maxRetries && !error.response && error.request) {
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 800)
        );
        return await this.updateInvoice(id, invoiceData, retryCount + 1);
      }

      // Handle specific backend errors
      let errorMessage = "Failed to update invoice";
      let errorDetails = {
        status: error.response?.status,
        isNetworkError: !error.response && !!error.request,
        isRetryExhausted: retryCount >= maxRetries,
        totalAttempts: retryCount + 1,
      };

      if (error.response?.data) {
        errorMessage =
          error.response.data.message ||
          error.response.data.error ||
          `Server error: ${error.response.status}`;

        // Handle specific business logic errors
        if (error.response.data.message?.includes("stock")) {
          errorMessage =
            "Stock validation failed: " + error.response.data.message;
        } else if (error.response.data.message?.includes("completed")) {
          errorMessage = "Cannot update completed invoices";
        } else if (error.response.data.message?.includes("cancelled")) {
          errorMessage = "Cannot update cancelled invoices";
        } else if (
          error.response.data.message?.includes("Insufficient stock")
        ) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = "Network error - unable to reach server";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      if (retryCount >= maxRetries) {
        errorMessage += ` (Failed after ${retryCount + 1} attempts)`;
      }

      console.error("❌ Error updating invoice:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
        details: errorDetails,
      };
    }
  }

  cleanInvoiceData(invoiceData) {
    try {
      console.log(
        "🧹 CLEANING INVOICE DATA - Input keys:",
        Object.keys(invoiceData)
      );

      // ✅ ENHANCED DEBUG: Log all preservation flags
      console.log("🔍 PRESERVATION FLAGS CHECK:", {
        preserveUICalculations: invoiceData.preserveUICalculations,
        useExactAmounts: invoiceData.useExactAmounts,
        skipRecalculation: invoiceData.skipRecalculation,
        skipBackendCalculation: invoiceData.skipBackendCalculation,
        BACKEND_SKIP_CALCULATION: invoiceData.BACKEND_SKIP_CALCULATION,
        FRONTEND_AMOUNTS_FINAL: invoiceData.FRONTEND_AMOUNTS_FINAL,
        authoritative: invoiceData.authoritative,
        totals: invoiceData.totals
          ? {
              finalTotal: invoiceData.totals.finalTotal,
              subtotal: invoiceData.totals.subtotal,
              totalTax: invoiceData.totals.totalTax,
            }
          : null,
      });
      // ✅ CRITICAL: Check for preservation flags first
      const shouldPreserveCalculations =
        invoiceData.preserveUICalculations ||
        invoiceData.useExactAmounts ||
        invoiceData.skipRecalculation ||
        invoiceData.skipBackendCalculation ||
        invoiceData.BACKEND_SKIP_CALCULATION ||
        invoiceData.FRONTEND_AMOUNTS_FINAL;

      if (shouldPreserveCalculations) {
        console.log(
          "🔒 PRESERVATION MODE: Using exact amounts from frontend - NO RECALCULATION"
        );

        // Extract customer/party information (non-calculation related)
        const customerInfo = this.extractCustomerInfo(invoiceData);

        // Extract payment information (non-calculation related)
        const paymentInfo = this.extractPaymentInfo(invoiceData);

        // ✅ CRITICAL: Use items exactly as provided by frontend
        const preservedItems = (invoiceData.items || []).map((item, index) => ({
          // Basic item info
          itemRef: item.itemRef || item.itemId || null,
          itemName: item.itemName || `Item ${index + 1}`,
          itemCode: item.itemCode || "",
          hsnCode: item.hsnCode || "0000",
          category: item.category || "",

          // Quantity and pricing - EXACT from frontend
          quantity: parseFloat(item.quantity) || 0,
          unit: item.unit || "PCS",
          pricePerUnit: parseFloat(item.pricePerUnit) || 0,

          // ✅ CRITICAL: Tax mode fields - EXACT from frontend
          taxMode: item.taxMode,
          priceIncludesTax: item.priceIncludesTax,
          gstMode: item.gstMode,
          taxRate: parseFloat(item.taxRate) || 0,

          // ✅ CRITICAL: Discount fields - EXACT from frontend
          discountPercent: parseFloat(item.discountPercent) || 0,
          discountAmount: parseFloat(item.discountAmount) || 0,

          // ✅ CRITICAL: Use EXACT tax amounts from frontend - NO RECALCULATION
          taxableAmount: parseFloat(item.taxableAmount) || 0,
          cgst: parseFloat(item.cgstAmount) || 0,
          sgst: parseFloat(item.sgstAmount) || 0,
          igst: parseFloat(item.igstAmount) || 0,
          cgstAmount: parseFloat(item.cgstAmount) || 0,
          sgstAmount: parseFloat(item.sgstAmount) || 0,
          igstAmount: parseFloat(item.igstAmount) || 0,
          totalTaxAmount:
            (parseFloat(item.cgstAmount) || 0) +
            (parseFloat(item.sgstAmount) || 0) +
            (parseFloat(item.igstAmount) || 0),

          // ✅ CRITICAL: Use EXACT final amounts from frontend
          amount: parseFloat(item.amount) || 0,
          itemAmount: parseFloat(item.amount) || 0,
          finalAmount: parseFloat(item.amount) || 0,
          totalAmount: parseFloat(item.amount) || 0,

          // Line number for backend
          lineNumber: index + 1,

          // Stock info (if available)
          currentStock: item.currentStock || 0,

          // ✅ CRITICAL: Add preservation flags to each item
          _preservedFromFrontend: true,
          _skipCalculation: true,
          useExactAmounts: true,
          skipTaxRecalculation: true,
        }));

        // ✅ CRITICAL: Use EXACT totals from frontend - NO RECALCULATION
        const preservedTotals = {
          // Use authoritative total as the primary source
          finalTotal:
            invoiceData.authoritative || invoiceData.totals?.finalTotal || 0,
          grandTotal:
            invoiceData.authoritative || invoiceData.totals?.finalTotal || 0,
          total:
            invoiceData.authoritative || invoiceData.totals?.finalTotal || 0,
          amount:
            invoiceData.authoritative || invoiceData.totals?.finalTotal || 0,
          invoiceTotal:
            invoiceData.authoritative || invoiceData.totals?.finalTotal || 0,

          // Use exact breakdown from frontend
          subtotal: parseFloat(invoiceData.totals?.subtotal) || 0,
          totalQuantity: preservedItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          ),
          totalDiscount: parseFloat(invoiceData.totals?.totalDiscount) || 0,
          totalTax: parseFloat(invoiceData.totals?.totalTax) || 0,
          totalCGST: parseFloat(invoiceData.totals?.totalCGST) || 0,
          totalSGST: parseFloat(invoiceData.totals?.totalSGST) || 0,
          totalIGST: parseFloat(invoiceData.totals?.totalIGST) || 0,
          totalTaxableAmount: parseFloat(invoiceData.totals?.subtotal) || 0,

          // Round off values
          roundOff: parseFloat(invoiceData.roundOffValue) || 0,
          roundOffValue: parseFloat(invoiceData.roundOffValue) || 0,

          // ✅ CRITICAL: Add preservation metadata
          _preservedFromFrontend: true,
          _skipCalculation: true,
          _exactTotal:
            invoiceData.authoritative || invoiceData.totals?.finalTotal,
          _calculationSource: "frontend_preserved",
        };

        console.log("🔒 PRESERVED DATA:", {
          itemsCount: preservedItems.length,
          exactFinalTotal: preservedTotals.finalTotal,
          preservationApplied: true,
          authoritativeTotal: invoiceData.authoritative,
          message: "NO BACKEND RECALCULATION PERFORMED",
        });

        // Build preserved data for backend
        const preservedData = {
          // Company and document info
          companyId: invoiceData.companyId,
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: invoiceData.invoiceDate,
          invoiceType: invoiceData.gstEnabled ? "gst" : "non-gst",
          gstEnabled: Boolean(invoiceData.gstEnabled),

          // Customer data
          customer: customerInfo.id,
          customerId: customerInfo.id,
          customerName: customerInfo.name,
          customerMobile: customerInfo.mobile,

          // Tax configuration - preserve from frontend
          taxMode:
            invoiceData.taxMode || invoiceData.globalTaxMode || "without-tax",
          priceIncludesTax: Boolean(invoiceData.priceIncludesTax),

          // ✅ CRITICAL: Use preserved items and totals - NO RECALCULATION
          items: preservedItems,
          totals: preservedTotals,

          // Payment information
          payment: paymentInfo,

          // Additional fields
          notes: invoiceData.notes || "",
          status: invoiceData.status || "completed",
          termsAndConditions: invoiceData.termsAndConditions || "",

          // Round off - use exact values
          roundOffEnabled: Boolean(invoiceData.roundOffEnabled),
          roundOff: parseFloat(invoiceData.roundOffValue || 0),

          // Document type for quotations
          ...(invoiceData.documentType === "quotation" && {
            documentType: "quotation",
            orderType: "quotation",
            quotationValidity: invoiceData.quotationValidity || 30,
          }),

          // Metadata
          createdAt: new Date().toISOString(),
          createdBy: "user",

          // ✅ CRITICAL: Preserve all preservation flags for backend
          preserveUICalculations: true,
          useExactAmounts: true,
          skipRecalculation: true,
          skipBackendCalculation: true,
          BACKEND_SKIP_CALCULATION: true,
          FRONTEND_AMOUNTS_FINAL: true,
          _preservedFromFrontend: true,
          _exactCalculation: true,
          authoritative: invoiceData.authoritative,
        };

        console.log("✅ PRESERVED INVOICE DATA (NO RECALCULATION):", {
          hasCustomer: !!preservedData.customer,
          hasItems: !!preservedData.items?.length,
          hasTotals: !!preservedData.totals,
          hasPayment: !!preservedData.payment,
          exactFinalTotal: preservedData.totals?.finalTotal,
          preservationFlags: {
            preserveUICalculations: preservedData.preserveUICalculations,
            BACKEND_SKIP_CALCULATION: preservedData.BACKEND_SKIP_CALCULATION,
            FRONTEND_AMOUNTS_FINAL: preservedData.FRONTEND_AMOUNTS_FINAL,
          },
          documentType: preservedData.documentType,
        });

        return preservedData;
      }

      // ✅ Original calculation logic for non-preserved invoices
      console.log("📊 CALCULATION MODE: Performing backend calculations");

      // Extract customer/party information with all field variations
      const customerInfo = this.extractCustomerInfo(invoiceData);

      // Extract payment information with enhanced handling
      const paymentInfo = this.extractPaymentInfo(invoiceData);

      // Clean items array with proper validation
      const validItems = (invoiceData.items || []).filter(
        (item) =>
          item.itemName &&
          parseFloat(item.quantity || 0) > 0 &&
          parseFloat(item.pricePerUnit || item.price || 0) > 0
      );

      const cleanItems = this.cleanItems(validItems, invoiceData);

      // Calculate or extract totals
      const totals = this.calculateTotals(invoiceData, cleanItems);

      // Build clean data for backend
      const cleanData = {
        // Company and document info
        companyId: invoiceData.companyId,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        invoiceType: invoiceData.gstEnabled ? "gst" : "non-gst",
        gstEnabled: Boolean(invoiceData.gstEnabled),

        // Customer data
        customer: customerInfo.id,
        customerId: customerInfo.id,
        customerName: customerInfo.name,
        customerMobile: customerInfo.mobile,

        // Tax configuration
        taxMode:
          invoiceData.taxMode || invoiceData.globalTaxMode || "exclusive",
        priceIncludesTax: Boolean(invoiceData.priceIncludesTax),

        // Items and calculations
        items: cleanItems,
        totals: totals,

        // Payment information
        payment: paymentInfo,

        // Additional fields
        notes: invoiceData.notes || "",
        status: invoiceData.status || "completed",
        termsAndConditions: invoiceData.termsAndConditions || "",

        // Round off
        roundOffEnabled: Boolean(invoiceData.roundOffEnabled),
        roundOff: parseFloat(invoiceData.roundOffValue || 0),

        // Document type for quotations
        ...(invoiceData.documentType === "quotation" && {
          documentType: "quotation",
          orderType: "quotation",
          quotationValidity: invoiceData.quotationValidity || 30,
        }),

        // Metadata
        createdAt: new Date().toISOString(),
        createdBy: "user",
      };

      console.log("✅ CALCULATED INVOICE DATA:", {
        hasCustomer: !!cleanData.customer,
        hasItems: !!cleanData.items?.length,
        hasTotals: !!cleanData.totals,
        hasPayment: !!cleanData.payment,
        finalTotal: cleanData.totals?.finalTotal,
        documentType: cleanData.documentType,
      });

      return cleanData;
    } catch (error) {
      console.error("❌ Error cleaning invoice data:", error);
      throw new Error(`Data cleaning failed: ${error.message}`);
    }
  }

  // ✅ CRITICAL FIX: Update extractPaymentInfo to use exact invoice total when available
  extractPaymentInfo(invoiceData) {
    let paymentAmount = 0;
    let paymentMethod = "cash";
    let bankAccountId = null;
    let bankAccountName = null;
    let reference = "";
    let notes = "";
    let dueDate = null;
    let creditDays = 0;
    let chequeNumber = "";
    let chequeDate = null;
    let transactionId = "";
    let nextPaymentDate = null;

    // Priority 1: paymentData from PaymentModal
    if (invoiceData.paymentData && invoiceData.paymentData.amount) {
      paymentAmount = parseFloat(invoiceData.paymentData.amount);
      paymentMethod = this.normalizePaymentMethod(
        invoiceData.paymentData.paymentType ||
          invoiceData.paymentData.method ||
          "cash"
      );
      bankAccountId = invoiceData.paymentData.bankAccountId || null;
      bankAccountName = invoiceData.paymentData.bankAccountName || null;
      reference = invoiceData.paymentData.reference || "";
      notes = invoiceData.paymentData.notes || "";
      dueDate = invoiceData.paymentData.dueDate || null;
      creditDays = invoiceData.paymentData.creditDays || 0;

      // ✅ NEW: Additional fields from PaymentModal
      chequeNumber = invoiceData.paymentData.chequeNumber || "";
      chequeDate = invoiceData.paymentData.chequeDate || null;
      transactionId = invoiceData.paymentData.transactionId || "";
      nextPaymentDate = invoiceData.paymentData.nextPaymentDate || null;
    }
    // Priority 2: payment object
    else if (invoiceData.payment) {
      paymentAmount = parseFloat(
        invoiceData.payment.paidAmount || invoiceData.payment.amount || 0
      );
      paymentMethod = this.normalizePaymentMethod(
        invoiceData.payment.method || "cash"
      );
      bankAccountId = invoiceData.payment.bankAccountId || null;
      bankAccountName = invoiceData.payment.bankAccountName || null;
      reference = invoiceData.payment.reference || "";
      notes = invoiceData.payment.notes || "";
      dueDate = invoiceData.payment.dueDate || null;
      creditDays = invoiceData.payment.creditDays || 0;
      chequeNumber = invoiceData.payment.chequeNumber || "";
      chequeDate = invoiceData.payment.chequeDate || null;
      transactionId = invoiceData.payment.transactionId || "";
    }
    // Priority 3: direct properties
    else if (invoiceData.paymentReceived) {
      paymentAmount = parseFloat(invoiceData.paymentReceived);
      paymentMethod = this.normalizePaymentMethod(
        invoiceData.paymentMethod || "cash"
      );
      dueDate = invoiceData.dueDate || null;
      creditDays = invoiceData.creditDays || 0;
    }

    // ✅ CRITICAL FIX: Use exact total when preservation flags are present
    let finalTotal;
    if (invoiceData.preserveUICalculations || invoiceData.useExactAmounts) {
      finalTotal = parseFloat(
        invoiceData.authoritative ||
          invoiceData.totals?.finalTotal ||
          invoiceData.totals?.uiCalculatedTotal ||
          0
      );
      console.log(
        "💰 Using preserved final total for payment calculation:",
        finalTotal
      );
    } else {
      finalTotal = parseFloat(
        invoiceData.totals?.finalTotalWithRoundOff ||
          invoiceData.totals?.finalTotal ||
          0
      );
    }

    const pendingAmount = Math.max(0, finalTotal - paymentAmount);

    // ✅ ENHANCED: Return more comprehensive payment info
    const paymentInfo = {
      method: paymentMethod,
      paidAmount: paymentAmount,
      pendingAmount: pendingAmount,
      status: this.getPaymentStatus(paymentAmount, finalTotal),
      paymentDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      creditDays: parseInt(creditDays) || 0,
      reference: reference,
      notes: notes,
      bankAccountId: bankAccountId,
      bankAccountName: bankAccountName,

      // ✅ CRITICAL: Include exact invoice total reference
      invoiceTotal: finalTotal,
      relatedInvoiceTotal: finalTotal,
    };

    // ✅ NEW: Add additional fields based on payment method
    if (paymentMethod === "cheque" && chequeNumber) {
      paymentInfo.chequeNumber = chequeNumber;
      paymentInfo.chequeDate = chequeDate ? new Date(chequeDate) : null;
    }

    if (
      ["upi", "online", "neft", "rtgs"].includes(paymentMethod) &&
      transactionId
    ) {
      paymentInfo.transactionId = transactionId;
    }

    // ✅ NEW: Add next payment date for partial payments
    if (pendingAmount > 0 && nextPaymentDate) {
      paymentInfo.nextPaymentDate = new Date(nextPaymentDate);
    }

    return paymentInfo;
  }
  // ✅ ENHANCED: Clean invoice data specifically for updates with proper field mapping
  cleanInvoiceDataForUpdate(invoiceData) {
    try {
      console.log(
        "🧹 CLEANING UPDATE DATA - Input keys:",
        Object.keys(invoiceData)
      );

      // Extract customer/party information
      const customerInfo = this.extractCustomerInfoForUpdate(invoiceData);
      const paymentInfo = this.extractPaymentInfoForUpdate(invoiceData);

      // Process items if provided
      let cleanItems = [];
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        cleanItems = this.cleanItemsForUpdate(invoiceData.items, invoiceData);
      }

      // Calculate totals if items are provided
      let totals = null;
      if (cleanItems.length > 0) {
        totals = this.calculateTotalsForUpdate(invoiceData, cleanItems);
      } else if (invoiceData.totals) {
        // Use existing totals if no new items
        totals = {
          subtotal: parseFloat(invoiceData.totals.subtotal) || 0,
          totalQuantity: parseFloat(invoiceData.totals.totalQuantity) || 0,
          totalDiscount:
            parseFloat(
              invoiceData.totals.totalDiscountAmount ||
                invoiceData.totals.totalDiscount
            ) || 0,
          totalTax: parseFloat(invoiceData.totals.totalTax) || 0,
          totalCGST:
            parseFloat(
              invoiceData.totals.totalCGST || invoiceData.totals.totalCgstAmount
            ) || 0,
          totalSGST:
            parseFloat(
              invoiceData.totals.totalSGST || invoiceData.totals.totalSgstAmount
            ) || 0,
          totalIGST:
            parseFloat(
              invoiceData.totals.totalIGST || invoiceData.totals.totalIgstAmount
            ) || 0,
          totalTaxableAmount:
            parseFloat(invoiceData.totals.totalTaxableAmount) || 0,
          finalTotal:
            parseFloat(
              invoiceData.totals.finalTotalWithRoundOff ||
                invoiceData.totals.finalTotal
            ) || 0,
          roundOff:
            parseFloat(
              invoiceData.totals.roundOffValue || invoiceData.roundOff
            ) || 0,
        };
      }

      // Build clean update data with proper field mapping for backend
      const cleanData = {
        // Only include fields that are being updated
        ...(customerInfo.id && {
          customer: customerInfo.id,
          customerId: customerInfo.id,
          customerName: customerInfo.name,
          customerMobile: customerInfo.mobile,
        }),

        // Invoice details (only if provided)
        ...(invoiceData.invoiceNumber && {
          invoiceNumber: invoiceData.invoiceNumber,
        }),
        ...(invoiceData.invoiceDate && {invoiceDate: invoiceData.invoiceDate}),
        ...(invoiceData.hasOwnProperty("gstEnabled") && {
          gstEnabled: Boolean(invoiceData.gstEnabled),
          invoiceType: invoiceData.gstEnabled ? "gst" : "non-gst",
        }),

        // Tax configuration
        ...(invoiceData.taxMode && {taxMode: invoiceData.taxMode}),
        ...(invoiceData.hasOwnProperty("priceIncludesTax") && {
          priceIncludesTax: invoiceData.priceIncludesTax,
        }),

        // Items and totals (only if items are provided)
        ...(cleanItems.length > 0 && {items: cleanItems}),
        ...(totals && {totals: totals}),

        // Payment information (only if provided)
        ...(paymentInfo &&
          Object.keys(paymentInfo).length > 0 && {payment: paymentInfo}),

        // Additional fields
        ...(invoiceData.notes !== undefined && {notes: invoiceData.notes}),
        ...(invoiceData.status && {status: invoiceData.status}),
        ...(invoiceData.termsAndConditions !== undefined && {
          termsAndConditions: invoiceData.termsAndConditions,
        }),

        // Round off
        ...(invoiceData.hasOwnProperty("roundOffEnabled") && {
          roundOffEnabled: invoiceData.roundOffEnabled,
        }),
        ...(invoiceData.roundOffValue !== undefined && {
          roundOff: parseFloat(invoiceData.roundOffValue) || 0,
        }),

        // Update metadata
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: "user", // You can pass this from the component if needed
      };

      console.log("✅ CLEANED UPDATE DATA:", {
        hasCustomer: !!cleanData.customer,
        hasItems: !!cleanData.items?.length,
        hasTotals: !!cleanData.totals,
        hasPayment: !!cleanData.payment,
        status: cleanData.status,
        finalTotal: cleanData.totals?.finalTotal,
        outputKeys: Object.keys(cleanData),
      });

      return cleanData;
    } catch (error) {
      console.error("❌ Error cleaning update data:", error);
      throw new Error(`Data cleaning failed: ${error.message}`);
    }
  }

  // ✅ NEW: Enhanced customer info extraction for updates
  extractCustomerInfoForUpdate(invoiceData) {
    let customerId = null;
    let customerName = "";
    let customerMobile = "";

    // Priority 1: selectedCustomer or selectedSupplier (from UniversalEditForm)
    const selectedParty =
      invoiceData.selectedCustomer ||
      invoiceData.selectedSupplier ||
      invoiceData.selectedParty;

    if (selectedParty) {
      customerId = selectedParty._id || selectedParty.id;
      customerName = selectedParty.name || selectedParty.businessName || "";
      customerMobile = selectedParty.mobile || selectedParty.phone || "";
    }

    // Priority 2: Direct customer fields
    if (!customerId) {
      if (
        typeof invoiceData.customer === "string" &&
        invoiceData.customer.trim() !== ""
      ) {
        customerId = invoiceData.customer.trim();
      } else if (
        typeof invoiceData.customer === "object" &&
        invoiceData.customer
      ) {
        customerId = invoiceData.customer._id || invoiceData.customer.id;
        customerName =
          invoiceData.customer.name || invoiceData.customer.businessName || "";
        customerMobile =
          invoiceData.customer.mobile || invoiceData.customer.phone || "";
      }
    }

    // Priority 3: Other customer ID fields
    if (!customerId) {
      customerId =
        invoiceData.customerId ||
        invoiceData.partyId ||
        invoiceData.supplierId ||
        null;
    }

    // Extract names and mobile from various sources
    if (!customerName) {
      customerName =
        invoiceData.customerName ||
        invoiceData.partyName ||
        invoiceData.supplierName ||
        "";
    }

    if (!customerMobile) {
      customerMobile =
        invoiceData.customerMobile ||
        invoiceData.mobileNumber ||
        invoiceData.partyPhone ||
        invoiceData.supplierPhone ||
        "";
    }

    return {
      id: customerId,
      name: customerName,
      mobile: customerMobile,
    };
  }

  // ✅ NEW: Enhanced payment info extraction for updates
  extractPaymentInfoForUpdate(invoiceData) {
    let paymentInfo = {};

    // Priority 1: paymentData from PaymentModal (from enhanced PaymentDetailsSection)
    if (
      invoiceData.paymentData &&
      typeof invoiceData.paymentData === "object"
    ) {
      paymentInfo = {
        method: this.normalizePaymentMethod(
          invoiceData.paymentData.paymentType || invoiceData.paymentData.method
        ),
        paidAmount: parseFloat(invoiceData.paymentData.amount) || 0,
        pendingAmount: parseFloat(invoiceData.paymentData.pendingAmount) || 0,
        status: invoiceData.paymentData.status || "pending",
        paymentDate: invoiceData.paymentData.paymentDate
          ? new Date(invoiceData.paymentData.paymentDate)
          : new Date(),
        dueDate: invoiceData.paymentData.dueDate
          ? new Date(invoiceData.paymentData.dueDate)
          : null,
        creditDays: parseInt(invoiceData.paymentData.creditDays) || 0,
        reference: invoiceData.paymentData.reference || "",
        notes: invoiceData.paymentData.notes || "",
      };

      // Add method-specific fields
      if (paymentInfo.method === "cheque") {
        paymentInfo.chequeNumber = invoiceData.paymentData.chequeNumber || "";
        paymentInfo.chequeDate = invoiceData.paymentData.chequeDate
          ? new Date(invoiceData.paymentData.chequeDate)
          : null;
      }

      if (
        ["bank_transfer", "online", "neft", "rtgs"].includes(paymentInfo.method)
      ) {
        paymentInfo.bankAccountId =
          invoiceData.paymentData.bankAccountId || null;
        paymentInfo.bankAccountName =
          invoiceData.paymentData.bankAccountName || null;
        paymentInfo.transactionId = invoiceData.paymentData.transactionId || "";
      }
    }
    // Priority 2: Direct payment fields from UniversalEditForm
    else if (
      invoiceData.paymentMethod ||
      invoiceData.paidAmount !== undefined
    ) {
      paymentInfo = {
        method: this.normalizePaymentMethod(invoiceData.paymentMethod),
        paidAmount: parseFloat(invoiceData.paidAmount) || 0,
        status: invoiceData.paymentStatus || "pending",
        paymentDate: invoiceData.paymentDate
          ? new Date(invoiceData.paymentDate)
          : new Date(),
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
        creditDays: parseInt(invoiceData.creditDays) || 0,
        notes: invoiceData.notes || "",
      };
    }
    // Priority 3: Existing payment object
    else if (invoiceData.payment && typeof invoiceData.payment === "object") {
      paymentInfo = {...invoiceData.payment};

      // Normalize method if present
      if (paymentInfo.method) {
        paymentInfo.method = this.normalizePaymentMethod(paymentInfo.method);
      }
    }

    return paymentInfo;
  }

  // ✅ NEW: Clean items specifically for updates
  cleanItemsForUpdate(items, invoiceData) {
    const globalTaxMode =
      invoiceData?.taxMode || invoiceData?.globalTaxMode || "exclusive";
    const globalPriceIncludesTax =
      invoiceData?.priceIncludesTax || globalTaxMode === "inclusive";
    const gstEnabled = Boolean(invoiceData?.gstEnabled);

    console.log("🧹 CLEANING ITEMS FOR UPDATE:", {
      itemCount: items.length,
      globalTaxMode,
      globalPriceIncludesTax,
      gstEnabled,
    });

    return items.map((item, index) => {
      // Extract item reference (product ID)
      const itemRef =
        item.selectedProduct?.id ||
        item.selectedProduct?._id ||
        item.itemRef ||
        item.productId ||
        null;

      // Parse numeric values with safety checks
      const quantity = parseFloat(item.quantity) || 1;
      const pricePerUnit = parseFloat(item.price || item.pricePerUnit) || 0;
      const taxRate = parseFloat(item.gstRate || item.taxRate) || 0;
      const discountPercent = parseFloat(item.discountPercent) || 0;
      const discountAmount =
        parseFloat(item.discountAmount || item.discount) || 0;

      // Use calculated values from frontend (ItemsTableWithTotals)
      const taxableAmount =
        parseFloat(item.taxableAmount || item.subtotal) || 0;
      const cgstAmount = parseFloat(item.cgstAmount || item.cgst) || 0;
      const sgstAmount = parseFloat(item.sgstAmount || item.sgst) || 0;
      const igstAmount = parseFloat(item.igstAmount || item.igst) || 0;
      const finalAmount =
        parseFloat(item.totalAmount || item.amount || item.itemAmount) || 0;

      // Build cleaned item with proper field mapping for backend
      const cleanedItem = {
        // Item identification
        itemRef: itemRef,
        itemName: (
          item.productName ||
          item.itemName ||
          item.name ||
          `Item ${index + 1}`
        ).trim(),
        itemCode: item.productCode || item.itemCode || item.code || "",
        hsnCode: item.hsnNumber || item.hsnCode || item.hsn || "0000",
        category: item.category || "",

        // Quantity and pricing
        quantity: quantity,
        unit: item.unit || "PCS",
        pricePerUnit: pricePerUnit,

        // Tax configuration
        taxRate: taxRate,
        taxMode: item.taxMode || globalTaxMode,
        priceIncludesTax:
          item.priceIncludesTax !== undefined
            ? item.priceIncludesTax
            : globalPriceIncludesTax,

        // Discount
        discountPercent: discountPercent,
        discountAmount: discountAmount,

        // Tax amounts (use frontend calculations)
        taxableAmount: taxableAmount,
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: igstAmount,
        cgstAmount: cgstAmount,
        sgstAmount: sgstAmount,
        igstAmount: igstAmount,
        totalTaxAmount: cgstAmount + sgstAmount + igstAmount,

        // Final amount
        amount: finalAmount,
        itemAmount: finalAmount,

        // Additional fields for backend processing
        lineNumber: index + 1,
        currentStock: item.availableStock || item.currentStock || 0,
      };

      console.log(`✅ CLEANED UPDATE ITEM ${index + 1}:`, {
        itemName: cleanedItem.itemName,
        itemRef: cleanedItem.itemRef,
        quantity: cleanedItem.quantity,
        pricePerUnit: cleanedItem.pricePerUnit,
        taxableAmount: cleanedItem.taxableAmount,
        finalAmount: cleanedItem.amount,
      });

      return cleanedItem;
    });
  }

  // ✅ NEW: Calculate totals specifically for updates
  calculateTotalsForUpdate(invoiceData, cleanItems) {
    console.log("📊 CALCULATING TOTALS FOR UPDATE:", {
      itemCount: cleanItems.length,
      hasExistingTotals: !!invoiceData.totals,
    });

    // If frontend has already calculated totals, use them
    if (invoiceData.totals && invoiceData.totals.finalTotal) {
      const existingTotals = {
        subtotal: parseFloat(invoiceData.totals.subtotal) || 0,
        totalQuantity: cleanItems.reduce((sum, item) => sum + item.quantity, 0),
        totalDiscount:
          parseFloat(
            invoiceData.totals.totalDiscountAmount ||
              invoiceData.totals.totalDiscount
          ) || 0,
        totalTax: parseFloat(invoiceData.totals.totalTax) || 0,
        totalCGST:
          parseFloat(
            invoiceData.totals.totalCGST || invoiceData.totals.totalCgstAmount
          ) || 0,
        totalSGST:
          parseFloat(
            invoiceData.totals.totalSGST || invoiceData.totals.totalSgstAmount
          ) || 0,
        totalIGST:
          parseFloat(
            invoiceData.totals.totalIGST || invoiceData.totals.totalIgstAmount
          ) || 0,
        totalTaxableAmount:
          parseFloat(invoiceData.totals.totalTaxableAmount) || 0,
        finalTotal:
          parseFloat(
            invoiceData.totals.finalTotalWithRoundOff ||
              invoiceData.totals.finalTotal
          ) || 0,
        roundOff:
          parseFloat(
            invoiceData.totals.roundOffValue || invoiceData.roundOff
          ) || 0,
      };

      console.log("✅ USING EXISTING TOTALS FOR UPDATE:", existingTotals);
      return existingTotals;
    }

    // Calculate from items if no existing totals
    const totalQuantity = cleanItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalDiscount = cleanItems.reduce(
      (sum, item) => sum + item.discountAmount,
      0
    );
    const totalTaxableAmount = cleanItems.reduce(
      (sum, item) => sum + item.taxableAmount,
      0
    );
    const totalCGST = cleanItems.reduce(
      (sum, item) => sum + item.cgstAmount,
      0
    );
    const totalSGST = cleanItems.reduce(
      (sum, item) => sum + item.sgstAmount,
      0
    );
    const totalIGST = cleanItems.reduce(
      (sum, item) => sum + item.igstAmount,
      0
    );
    const totalTax = totalCGST + totalSGST + totalIGST;
    const finalTotal = cleanItems.reduce((sum, item) => sum + item.amount, 0);

    const calculatedTotals = {
      subtotal: Math.round(totalTaxableAmount * 100) / 100,
      totalQuantity: totalQuantity,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalCGST: Math.round(totalCGST * 100) / 100,
      totalSGST: Math.round(totalSGST * 100) / 100,
      totalIGST: Math.round(totalIGST * 100) / 100,
      totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      roundOff:
        parseFloat(invoiceData.roundOffValue || invoiceData.roundOff) || 0,
    };

    console.log("✅ CALCULATED TOTALS FOR UPDATE:", calculatedTotals);
    return calculatedTotals;
  }

  // ✅ ENHANCED: Delete invoice with better cancellation options
  async deleteInvoice(id, options = {}, retryCount = 0) {
    const maxRetries = 2;

    try {
      if (!id) {
        throw new Error("Invoice ID is required");
      }

      console.log(
        "🗑️ Deleting/Cancelling invoice:",
        id,
        "with options:",
        options
      );

      // Prepare cancellation data that matches controller expectations
      const cancellationData = {
        reason: options.reason || "User requested deletion",
        force: options.force || false,
        restoreStock: options.restoreStock !== false, // Default to true
        refundPayments: options.refundPayments !== false, // Default to true
      };

      // Add delay for retries
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryCount * 500));
      }

      const response = await api.delete(`/sales/${id}`, {
        data: cancellationData,
      });

      // Handle response formats that match updated controller
      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message: responseData.message || "Invoice cancelled successfully",
          };
        }

        if (responseData && responseData.success === false) {
          // Handle specific errors from updated controller
          if (responseData.message?.includes("completed and fully paid")) {
            throw new Error(
              "Cannot cancel completed and fully paid invoices. Please create a return/refund instead."
            );
          } else if (responseData.message?.includes("already cancelled")) {
            throw new Error("Invoice is already cancelled");
          }

          // Retry on temporary errors
          if (
            retryCount < maxRetries &&
            (responseData.message?.includes("temporary") ||
              responseData.message?.includes("busy"))
          ) {
            return await this.deleteInvoice(id, options, retryCount + 1);
          }

          throw new Error(
            responseData.message ||
              responseData.error ||
              "Backend rejected the cancellation"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Invoice cancelled successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Enhanced retry logic
      if (
        retryCount < maxRetries &&
        error.response?.status &&
        [500, 502, 503, 504].includes(error.response.status)
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 1000)
        );
        return await this.deleteInvoice(id, options, retryCount + 1);
      }

      if (retryCount < maxRetries && !error.response && error.request) {
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 800)
        );
        return await this.deleteInvoice(id, options, retryCount + 1);
      }

      // Enhanced error handling to match controller responses
      let errorMessage = "Failed to cancel invoice";
      let errorDetails = {
        status: error.response?.status,
        isNetworkError: !error.response && !!error.request,
        isRetryExhausted: retryCount >= maxRetries,
        totalAttempts: retryCount + 1,
      };

      if (error.response?.data) {
        errorMessage =
          error.response.data.message ||
          error.response.data.error ||
          `Server error: ${error.response.status}`;

        // Handle specific business logic errors from controller
        if (error.response.data.message?.includes("completed and fully paid")) {
          errorMessage =
            "Cannot cancel completed and fully paid invoices. Please create a return/refund instead.";
        } else if (error.response.data.message?.includes("already cancelled")) {
          errorMessage = "Invoice is already cancelled";
        }
      } else if (error.request) {
        errorMessage = "Network error - unable to reach server";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      if (retryCount >= maxRetries) {
        errorMessage += ` (Failed after ${retryCount + 1} attempts)`;
      }

      console.error("❌ Error cancelling invoice:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
        details: errorDetails,
      };
    }
  }

  // ✅ NEW: Update payment due date (matches new controller method)
  async updatePaymentDueDate(saleId, dueDate, creditDays) {
    try {
      if (!saleId) {
        throw new Error("Sale ID is required");
      }

      const updateData = {
        dueDate: dueDate,
        creditDays: parseInt(creditDays) || 0,
      };

      const response = await api.put(`/sales/${saleId}/due-date`, updateData);

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message: responseData.message || "Due date updated successfully",
          };
        }

        if (responseData && responseData.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              "Failed to update due date"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Due date updated successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      let errorMessage = "Failed to update due date";

      if (error.response?.data) {
        errorMessage =
          error.response.data.message ||
          error.response.data.error ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "Network error - unable to reach server";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      console.error("❌ Error updating due date:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  }

  // ✅ ENHANCED: Clean items array with proper tax mode handling
  cleanItems(items, invoiceData) {
    const globalTaxMode =
      invoiceData?.taxMode || invoiceData?.globalTaxMode || "without-tax";
    const globalPriceIncludesTax =
      invoiceData?.priceIncludesTax || globalTaxMode === "with-tax";
    const gstEnabled = Boolean(invoiceData?.gstEnabled);

    console.log("🧹 CLEANING ITEMS:", {
      itemCount: items.length,
      globalTaxMode,
      globalPriceIncludesTax,
      gstEnabled,
    });

    return items.map((item, index) => {
      // ✅ CRITICAL: Determine item-specific tax mode
      const itemTaxMode = item.taxMode || globalTaxMode;
      const itemPriceIncludesTax =
        item.priceIncludesTax !== undefined
          ? item.priceIncludesTax
          : itemTaxMode === "with-tax" || globalPriceIncludesTax;

      // Parse numeric values
      const quantity = parseFloat(item.quantity) || 1;
      const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
      const taxRate = parseFloat(item.taxRate || item.gstRate) || 0;
      const discountPercent = parseFloat(item.discountPercent) || 0;
      const discountAmount = parseFloat(item.discountAmount) || 0;

      // ✅ CRITICAL: Use calculated values from frontend
      const taxableAmount = parseFloat(item.taxableAmount) || 0;
      const cgstAmount = parseFloat(item.cgstAmount || item.cgst) || 0;
      const sgstAmount = parseFloat(item.sgstAmount || item.sgst) || 0;
      const igstAmount = parseFloat(item.igstAmount || item.igst) || 0;
      const finalAmount = parseFloat(item.amount || item.itemAmount) || 0;
      const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;

      console.log(`📦 CLEANING ITEM ${index + 1}:`, {
        itemName: item.itemName,
        itemTaxMode,
        itemPriceIncludesTax,
        pricePerUnit,
        quantity,
        taxableAmount,
        totalTaxAmount,
        finalAmount,
        calculationMode: itemPriceIncludesTax ? "TAX_INCLUDED" : "TAX_EXCLUDED",
      });

      const cleanedItem = {
        // Basic item info
        itemRef: item.itemRef || item.itemId || null,
        itemName: item.itemName || `Item ${index + 1}`,
        itemCode: item.itemCode || "",
        hsnCode: item.hsnCode || "0000",
        category: item.category || "",

        // Quantity and pricing
        quantity: quantity,
        unit: item.unit || "PCS",
        pricePerUnit: pricePerUnit,

        // ✅ CRITICAL: Tax mode fields for backend
        taxMode: itemTaxMode,
        priceIncludesTax: itemPriceIncludesTax,
        gstMode: itemPriceIncludesTax ? "include" : "exclude", // Backend compatibility
        taxRate: taxRate,

        // Discount fields
        discountPercent: discountPercent,
        discountAmount: discountAmount,

        // ✅ CRITICAL: Use calculated tax amounts from frontend
        taxableAmount: taxableAmount,
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: igstAmount,
        cgstAmount: cgstAmount,
        sgstAmount: sgstAmount,
        igstAmount: igstAmount,
        totalTaxAmount: totalTaxAmount,

        // ✅ CRITICAL: Final calculated amounts
        amount: finalAmount,
        itemAmount: finalAmount, // Backend compatibility

        // Line number for backend
        lineNumber: index + 1,

        // Stock info (if available)
        currentStock: item.currentStock || 0,
        minStockLevel: item.minStockLevel || 0,
      };

      console.log(`✅ CLEANED ITEM ${index + 1}:`, {
        itemName: cleanedItem.itemName,
        taxMode: cleanedItem.taxMode,
        priceIncludesTax: cleanedItem.priceIncludesTax,
        taxableAmount: cleanedItem.taxableAmount,
        totalTax: cleanedItem.totalTaxAmount,
        finalAmount: cleanedItem.amount,
        backend_compatibility: {
          gstMode: cleanedItem.gstMode,
          itemAmount: cleanedItem.itemAmount,
        },
      });

      return cleanedItem;
    });
  }

  // ✅ ENHANCED: Calculate totals with proper tax mode consideration
  calculateTotals(invoiceData, cleanItems) {
    console.log("📊 CALCULATING TOTALS:", {
      itemCount: cleanItems.length,
      hasExistingTotals: !!invoiceData.totals,
    });

    // If totals are already calculated by frontend, use them
    if (invoiceData.totals) {
      const existingTotals = {
        subtotal: parseFloat(invoiceData.totals.subtotal) || 0,
        totalQuantity: cleanItems.reduce((sum, item) => sum + item.quantity, 0),
        totalDiscount:
          parseFloat(
            invoiceData.totals.totalDiscountAmount ||
              invoiceData.totals.totalDiscount
          ) || 0,
        totalTax: parseFloat(invoiceData.totals.totalTax) || 0,
        totalCGST:
          parseFloat(
            invoiceData.totals.totalCGST || invoiceData.totals.totalCgstAmount
          ) || 0,
        totalSGST:
          parseFloat(
            invoiceData.totals.totalSGST || invoiceData.totals.totalSgstAmount
          ) || 0,
        totalIGST:
          parseFloat(
            invoiceData.totals.totalIGST || invoiceData.totals.totalIgstAmount
          ) || 0,
        totalTaxableAmount:
          parseFloat(invoiceData.totals.totalTaxableAmount) || 0,
        finalTotal:
          parseFloat(
            invoiceData.totals.finalTotalWithRoundOff ||
              invoiceData.totals.finalTotal
          ) || 0,
        roundOff: parseFloat(invoiceData.totals.roundOffValue) || 0,

        // Additional fields for backend compatibility
        withTaxTotal: parseFloat(invoiceData.totals.withTaxTotal) || 0,
        withoutTaxTotal: parseFloat(invoiceData.totals.withoutTaxTotal) || 0,
      };

      console.log("✅ USING EXISTING TOTALS:", existingTotals);
      return existingTotals;
    }

    // Calculate totals from clean items
    const totalQuantity = cleanItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalDiscount = cleanItems.reduce(
      (sum, item) => sum + item.discountAmount,
      0
    );
    const totalTaxableAmount = cleanItems.reduce(
      (sum, item) => sum + item.taxableAmount,
      0
    );
    const totalCGST = cleanItems.reduce(
      (sum, item) => sum + item.cgstAmount,
      0
    );
    const totalSGST = cleanItems.reduce(
      (sum, item) => sum + item.sgstAmount,
      0
    );
    const totalIGST = cleanItems.reduce(
      (sum, item) => sum + item.igstAmount,
      0
    );
    const totalTax = totalCGST + totalSGST + totalIGST;
    const finalTotal = cleanItems.reduce((sum, item) => sum + item.amount, 0);

    // ✅ CRITICAL: Calculate subtotal based on tax mode
    const globalTaxMode =
      invoiceData.taxMode || invoiceData.globalTaxMode || "without-tax";
    const priceIncludesTax =
      invoiceData.priceIncludesTax || globalTaxMode === "with-tax";

    let subtotal;
    if (priceIncludesTax) {
      // For "with tax" mode, subtotal should be the taxable amount
      subtotal = totalTaxableAmount;
    } else {
      // For "without tax" mode, subtotal is the pre-tax amount
      subtotal = totalTaxableAmount;
    }

    const calculatedTotals = {
      subtotal: Math.round(subtotal * 100) / 100,
      totalQuantity: totalQuantity,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalCGST: Math.round(totalCGST * 100) / 100,
      totalSGST: Math.round(totalSGST * 100) / 100,
      totalIGST: Math.round(totalIGST * 100) / 100,
      totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      roundOff: parseFloat(invoiceData.roundOffValue) || 0,

      // Additional totals for backend compatibility
      withTaxTotal: priceIncludesTax
        ? Math.round(finalTotal * 100) / 100
        : Math.round((totalTaxableAmount + totalTax) * 100) / 100,
      withoutTaxTotal: Math.round(totalTaxableAmount * 100) / 100,
    };

    console.log("✅ CALCULATED TOTALS:", {
      ...calculatedTotals,
      taxMode: globalTaxMode,
      priceIncludesTax: priceIncludesTax,
    });

    return calculatedTotals;
  }

  // Extract customer info from various sources
  extractCustomerInfo(invoiceData) {
    let customerId = null;

    if (
      typeof invoiceData.customer === "string" &&
      invoiceData.customer.trim() !== ""
    ) {
      customerId = invoiceData.customer.trim();
    } else if (
      typeof invoiceData.customer === "object" &&
      invoiceData.customer
    ) {
      customerId = invoiceData.customer._id || invoiceData.customer.id;
    } else {
      customerId =
        invoiceData.selectedCustomer?._id ||
        invoiceData.selectedCustomer?.id ||
        invoiceData.customerId ||
        invoiceData.party?._id ||
        invoiceData.party?.id ||
        invoiceData.selectedParty?._id ||
        invoiceData.selectedParty?.id ||
        invoiceData.partyId ||
        null;
    }

    const customerName =
      invoiceData.customerName ||
      invoiceData.customer?.name ||
      invoiceData.customer?.businessName ||
      invoiceData.selectedCustomer?.name ||
      invoiceData.selectedCustomer?.businessName ||
      invoiceData.party?.name ||
      invoiceData.party?.businessName ||
      invoiceData.selectedParty?.name ||
      invoiceData.selectedParty?.businessName ||
      invoiceData.partyName ||
      "Walk-in Customer";

    const customerMobile =
      invoiceData.customerMobile ||
      invoiceData.customer?.mobile ||
      invoiceData.customer?.phone ||
      invoiceData.selectedCustomer?.mobile ||
      invoiceData.selectedCustomer?.phone ||
      invoiceData.party?.mobile ||
      invoiceData.party?.phone ||
      invoiceData.selectedParty?.mobile ||
      invoiceData.selectedParty?.phone ||
      invoiceData.mobileNumber ||
      "";

    return {
      name: customerName,
      mobile: customerMobile,
      id: customerId,
    };
  }

  // Get all invoices
  async getInvoices(companyId, filters = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {companyId, ...filters};
      const response = await api.get("/sales", {params});

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (
          responseData?.success === true &&
          Array.isArray(responseData.data)
        ) {
          return {
            success: true,
            data: responseData.data,
            message: responseData.message || "Invoices fetched successfully",
          };
        }

        if (responseData?.success === true && responseData.data) {
          const nestedData =
            responseData.data.sales ||
            responseData.data.invoices ||
            responseData.data.items ||
            responseData.data.records ||
            [];

          return {
            success: true,
            data: Array.isArray(nestedData) ? nestedData : [],
            message: responseData.message || "Invoices fetched successfully",
          };
        }

        if (Array.isArray(responseData)) {
          return {
            success: true,
            data: responseData,
            message: "Invoices fetched successfully",
          };
        }

        if (responseData && typeof responseData === "object") {
          const possibleArrays = [
            responseData.sales,
            responseData.invoices,
            responseData.data,
            responseData.items,
            responseData.records,
          ];

          for (const arr of possibleArrays) {
            if (Array.isArray(arr)) {
              return {
                success: true,
                data: arr,
                message: "Invoices fetched successfully",
              };
            }
          }
        }

        if (responseData?.success === false) {
          throw new Error(responseData.message || "API returned failure");
        }

        return {
          success: true,
          data: [],
          message: "No invoices found",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // ✅ NEW: Clean invoice data specifically for updates
  cleanInvoiceDataForUpdate(invoiceData) {
    // Use the standard cleaning process but with update-specific handling
    const cleanData = this.cleanInvoiceData(invoiceData);

    // ✅ ENHANCED: Add update-specific fields
    cleanData.lastModifiedAt = new Date().toISOString();

    // ✅ ENHANCED: Handle status transitions properly
    if (
      invoiceData.status &&
      ["draft", "active", "completed", "cancelled"].includes(invoiceData.status)
    ) {
      cleanData.status = invoiceData.status;
    }

    // ✅ ENHANCED: Handle payment updates more carefully
    if (invoiceData.paymentUpdate) {
      cleanData.paymentUpdate = true;
      cleanData.payment = {
        ...cleanData.payment,
        ...invoiceData.paymentUpdate,
      };
    }

    console.log("✅ CLEANED UPDATE DATA:", {
      hasItems: !!cleanData.items?.length,
      hasTotals: !!cleanData.totals,
      hasPayment: !!cleanData.payment,
      status: cleanData.status,
      finalTotal: cleanData.totals?.finalTotal,
    });

    return cleanData;
  }

  // ✅ NEW: Add payment to existing invoice
  async addPayment(invoiceId, paymentData, retryCount = 0) {
    const maxRetries = 2;

    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      // Validate payment data
      const validation = this.validatePaymentData(paymentData);
      if (!validation.isValid) {
        throw new Error(
          `Payment validation failed: ${validation.errors.join(", ")}`
        );
      }

      console.log(
        "💰 Adding payment to invoice:",
        invoiceId,
        "Amount:",
        paymentData.amount
      );

      // Clean payment data for backend
      const cleanPaymentData = {
        amount: parseFloat(paymentData.amount),
        method: this.normalizePaymentMethod(
          paymentData.paymentType || paymentData.method
        ),
        reference: paymentData.reference || "",
        paymentDate: paymentData.paymentDate || new Date().toISOString(),
        dueDate: paymentData.dueDate || null,
        creditDays: parseInt(paymentData.creditDays) || 0,
        notes: paymentData.notes || "",
        // Additional payment fields
        bankAccountId: paymentData.bankAccountId || null,
        bankAccountName: paymentData.bankAccountName || null,
        transactionId: paymentData.transactionId || "",
        chequeNumber: paymentData.chequeNumber || "",
        chequeDate: paymentData.chequeDate || null,
      };

      // Add delay for retries
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryCount * 500));
      }

      const response = await api.post(
        `/sales/${invoiceId}/payment`,
        cleanPaymentData
      );

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message: responseData.message || "Payment added successfully",
          };
        }

        if (responseData && responseData.success === false) {
          // Retry on temporary errors
          if (
            retryCount < maxRetries &&
            (responseData.message?.includes("temporary") ||
              responseData.message?.includes("busy"))
          ) {
            return await this.addPayment(
              invoiceId,
              paymentData,
              retryCount + 1
            );
          }

          throw new Error(
            responseData.message ||
              responseData.error ||
              "Backend rejected the payment"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Payment added successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Retry logic similar to other methods
      if (
        retryCount < maxRetries &&
        error.response?.status &&
        [500, 502, 503, 504].includes(error.response.status)
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 1000)
        );
        return await this.addPayment(invoiceId, paymentData, retryCount + 1);
      }

      if (retryCount < maxRetries && !error.response && error.request) {
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 800)
        );
        return await this.addPayment(invoiceId, paymentData, retryCount + 1);
      }

      let errorMessage = "Failed to add payment";

      if (error.response?.data) {
        errorMessage =
          error.response.data.message ||
          error.response.data.error ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "Network error - unable to reach server";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      if (retryCount >= maxRetries) {
        errorMessage += ` (Failed after ${retryCount + 1} attempts)`;
      }

      console.error("❌ Error adding payment:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  }

  // Get dashboard data
  async getDashboardData(companyId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await api.get("/sales/reports/dashboard", {
        params: {companyId},
      });

      if (response.data?.success !== false) {
        return {
          success: true,
          data: response.data?.data || response.data,
          message:
            response.data?.message || "Dashboard data fetched successfully",
        };
      } else {
        throw new Error(
          response.data?.message || "Failed to get dashboard data"
        );
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {},
      };
    }
  }

  // Get overdue sales
  async getOverdueSales(companyId) {
    try {
      const response = await this.getInvoices(companyId, {
        paymentStatus: "pending,partial",
      });

      if (response.success && response.data) {
        let salesData = response.data;

        if (!Array.isArray(salesData)) {
          salesData =
            salesData.sales ||
            salesData.invoices ||
            salesData.items ||
            salesData.records ||
            [];

          if (!Array.isArray(salesData)) {
            return {
              success: true,
              data: [],
              message: "No sales data found",
            };
          }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueSales = salesData.filter((sale) => {
          if (!sale.payment?.dueDate) return false;

          try {
            const dueDate = new Date(sale.payment.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            const isOverdue = dueDate < today;
            const hasPendingAmount = (sale.payment.pendingAmount || 0) > 0;

            return isOverdue && hasPendingAmount;
          } catch (dateError) {
            return false;
          }
        });

        return {
          success: true,
          data: overdueSales,
          message: "Overdue sales fetched successfully",
        };
      }

      return {
        success: false,
        data: [],
        error: "Failed to fetch sales data",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Get sales due today
  async getSalesDueToday(companyId) {
    try {
      const response = await this.getInvoices(companyId, {
        paymentStatus: "pending,partial",
      });

      if (response.success && response.data) {
        let salesData = response.data;

        if (!Array.isArray(salesData)) {
          salesData =
            salesData.sales ||
            salesData.invoices ||
            salesData.items ||
            salesData.records ||
            [];

          if (!Array.isArray(salesData)) {
            return {
              success: true,
              data: [],
              message: "No sales data found",
            };
          }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const salesDueToday = salesData.filter((sale) => {
          if (!sale.payment?.dueDate) return false;

          try {
            const dueDate = new Date(sale.payment.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            const isDueToday = dueDate.getTime() === today.getTime();
            const hasPendingAmount = (sale.payment.pendingAmount || 0) > 0;

            return isDueToday && hasPendingAmount;
          } catch (dateError) {
            return false;
          }
        });

        return {
          success: true,
          data: salesDueToday,
          message: "Sales due today fetched successfully",
        };
      }

      return {
        success: false,
        data: [],
        error: "Failed to fetch sales data",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Get sales by payment status
  async getSalesByPaymentStatus(companyId, status = "pending") {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await this.getInvoices(companyId, {
        paymentStatus: status,
      });

      if (response.success) {
        return {
          success: true,
          data: response.data || [],
          message: "Sales by payment status fetched successfully",
        };
      } else {
        throw new Error(
          response.error || "Failed to fetch sales by payment status"
        );
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Get payment schedule
  async getPaymentSchedule(companyId, startDate, endDate) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await this.getInvoices(companyId, {
        startDate,
        endDate,
        includeDueDates: true,
      });

      if (response.success) {
        return {
          success: true,
          data: response.data || [],
          message: "Payment schedule fetched successfully",
        };
      } else {
        throw new Error(response.error || "Failed to fetch payment schedule");
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // ✅ ENHANCED: Mark payment as received with better payment method handling
  async markPaymentReceived(saleId, paymentData) {
    try {
      if (!saleId) {
        throw new Error("Sale ID is required");
      }

      const currentSale = await this.getInvoiceById(saleId);
      if (!currentSale.success) {
        throw new Error("Unable to fetch current sale data");
      }

      const updateData = {
        payment: {
          ...currentSale.data.payment,
          paidAmount:
            (currentSale.data.payment?.paidAmount || 0) +
            parseFloat(paymentData.amount || 0),
          status: "paid",
          lastPaymentDate: new Date(),
          method: this.normalizePaymentMethod(paymentData.method || "cash"), // ✅ Enhanced
          reference: paymentData.reference || "",
          notes: paymentData.notes || "",
          // ✅ NEW: Add additional payment details
          ...(paymentData.transactionId && {
            transactionId: paymentData.transactionId,
          }),
          ...(paymentData.chequeNumber && {
            chequeNumber: paymentData.chequeNumber,
          }),
          ...(paymentData.chequeDate && {
            chequeDate: new Date(paymentData.chequeDate),
          }),
          ...(paymentData.bankAccountId && {
            bankAccountId: paymentData.bankAccountId,
          }),
          ...(paymentData.bankAccountName && {
            bankAccountName: paymentData.bankAccountName,
          }),
        },
      };

      return await this.updateInvoice(saleId, updateData);
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get sales summary
  async getSalesSummary(companyId, dateRange = "30d") {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const endDate = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case "7d":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(endDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(endDate.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const response = await this.getInvoices(companyId, {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });

      if (response.success && response.data) {
        const summary = {
          totalSales: response.data.length,
          totalAmount: response.data.reduce(
            (sum, sale) => sum + (sale.totals?.finalTotal || 0),
            0
          ),
          totalPaid: response.data.reduce(
            (sum, sale) => sum + (sale.payment?.paidAmount || 0),
            0
          ),
          totalPending: response.data.reduce(
            (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
            0
          ),
          paidSales: response.data.filter(
            (sale) => sale.payment?.status === "paid"
          ).length,
          pendingSales: response.data.filter(
            (sale) => sale.payment?.status === "pending"
          ).length,
          partialSales: response.data.filter(
            (sale) => sale.payment?.status === "partial"
          ).length,
        };

        return {
          success: true,
          data: summary,
          message: "Sales summary fetched successfully",
        };
      }

      return {success: false, data: {}, error: "Failed to fetch sales summary"};
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {},
      };
    }
  }

  // Search sales
  async searchSales(companyId, searchQuery, filters = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await this.getInvoices(companyId, {
        search: searchQuery,
        ...filters,
      });

      if (response.success) {
        return {
          success: true,
          data: response.data || [],
          message: "Sales search completed successfully",
        };
      } else {
        throw new Error(response.error || "Failed to search sales");
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Utility methods
  formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }

  formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN");
  }

  getDaysDifference(date1, date2) {
    const diffTime = Math.abs(new Date(date2) - new Date(date1));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Test connection
  async testConnection() {
    try {
      const response = await api.get("/health");
      return {success: true, message: "Connection successful"};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }
}

const salesService = new SalesService();
export default salesService;
