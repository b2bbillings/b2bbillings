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

      // ✅ ENHANCED: Include source company reference for cross-company tracking
      sourceCompanyId: invoiceData.sourceCompanyId || invoiceData.companyId,
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

  // ✅ NEW: Get next invoice number preview (for SalesFormHeader)
  async getNextInvoiceNumber(params = {}) {
    try {
      if (!params.companyId) {
        throw new Error("Company ID is required");
      }

      const response = await api.get("/sales/next-invoice-number", {
        params: {
          companyId: params.companyId,
          invoiceType: params.invoiceType || "gst",
          documentType: params.documentType || "invoice",
        },
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Next invoice number fetched successfully",
          };
        }

        if (responseData && responseData.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              "Failed to get next invoice number"
          );
        }

        // Handle direct response
        if (responseData && responseData.previewInvoiceNumber) {
          return {
            success: true,
            data: responseData,
            message: "Next invoice number fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || null,
          message: "Next invoice number fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error getting next invoice number:", error);

      let errorMessage = "Failed to get next invoice number";

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

  async getInvoiceById(id) {
    try {
      if (!id) {
        throw new Error("Invoice ID is required");
      }

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

  async updateInvoice(id, invoiceData, retryCount = 0) {
    const maxRetries = 2;

    try {
      if (!id) {
        throw new Error("Invoice ID is required");
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

      const cleanData = this.cleanInvoiceDataForUpdate(invoiceData);

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
      const companyId = invoiceData.companyId || this.getCompanyId();

      // ✅ CRITICAL: Remove any manual invoice number - Model will generate
      delete invoiceData.invoiceNumber;

      // Auto-detection configuration
      const autoDetectSourceCompany =
        invoiceData.autoDetectSourceCompany !== false;

      // Determine sourceCompanyId with auto-detection
      const sourceCompanyId = (() => {
        if (
          invoiceData.sourceCompanyId &&
          invoiceData.sourceCompanyId !== companyId &&
          invoiceData.sourceCompanyId.toString() !== companyId.toString()
        ) {
          return invoiceData.sourceCompanyId;
        }

        if (autoDetectSourceCompany) {
          const customerLinkedCompanyId =
            invoiceData.customer?.linkedCompanyId ||
            invoiceData.selectedCustomer?.linkedCompanyId ||
            invoiceData.selectedParty?.linkedCompanyId;

          if (
            customerLinkedCompanyId &&
            customerLinkedCompanyId.toString() !== companyId.toString()
          ) {
            return customerLinkedCompanyId;
          }

          const customerCompanyId =
            invoiceData.customer?.companyId ||
            invoiceData.selectedCustomer?.companyId ||
            invoiceData.selectedParty?.companyId;

          if (
            customerCompanyId &&
            customerCompanyId.toString() !== companyId.toString()
          ) {
            return customerCompanyId;
          }
        }

        return null;
      })();

      let sourceCompanyDetectionMethod = "none";
      if (sourceCompanyId) {
        if (invoiceData.sourceCompanyId) {
          sourceCompanyDetectionMethod = "manual";
        } else if (
          invoiceData.customer?.linkedCompanyId ||
          invoiceData.selectedCustomer?.linkedCompanyId
        ) {
          sourceCompanyDetectionMethod = "customer_linked_company";
        } else {
          sourceCompanyDetectionMethod = "customer_company_id";
        }
      } else if (invoiceData.sourceCompanyId === companyId) {
        sourceCompanyDetectionMethod = "rejected_same_company";
      }

      const isCrossCompanyTransaction = !!sourceCompanyId;

      // Check for preservation flags
      const shouldPreserveCalculations =
        invoiceData.preserveUICalculations ||
        invoiceData.useExactAmounts ||
        invoiceData.skipRecalculation ||
        invoiceData.skipBackendCalculation ||
        invoiceData.BACKEND_SKIP_CALCULATION ||
        invoiceData.FRONTEND_AMOUNTS_FINAL;

      if (shouldPreserveCalculations) {
        const customerInfo = this.extractCustomerInfo(invoiceData);
        const paymentInfo = this.extractPaymentInfo(invoiceData);

        const preservedItems = (invoiceData.items || []).map((item, index) => ({
          itemRef: item.itemRef || item.itemId || null,
          itemName: item.itemName || `Item ${index + 1}`,
          itemCode: item.itemCode || "",
          hsnCode: item.hsnCode || "0000",
          category: item.category || "",
          quantity: parseFloat(item.quantity) || 0,
          unit: item.unit || "PCS",
          pricePerUnit: parseFloat(item.pricePerUnit) || 0,
          taxMode: item.taxMode,
          priceIncludesTax: item.priceIncludesTax,
          gstMode: item.gstMode,
          taxRate: parseFloat(item.taxRate) || 0,
          discountPercent: parseFloat(item.discountPercent) || 0,
          discountAmount: parseFloat(item.discountAmount) || 0,
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
          amount: parseFloat(item.amount) || 0,
          itemAmount: parseFloat(item.amount) || 0,
          finalAmount: parseFloat(item.amount) || 0,
          totalAmount: parseFloat(item.amount) || 0,
          lineNumber: index + 1,
          currentStock: item.currentStock || 0,
          _preservedFromFrontend: true,
          _skipCalculation: true,
          useExactAmounts: true,
          skipTaxRecalculation: true,
        }));

        const preservedTotals = {
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
          roundOff: parseFloat(invoiceData.roundOffValue) || 0,
          roundOffValue: parseFloat(invoiceData.roundOffValue) || 0,
          _preservedFromFrontend: true,
          _skipCalculation: true,
          _exactTotal:
            invoiceData.authoritative || invoiceData.totals?.finalTotal,
          _calculationSource: "frontend_preserved",
        };

        const preservedData = {
          // ✅ NO INVOICE NUMBER - Model will generate
          companyId: companyId,
          invoiceDate: invoiceData.invoiceDate,
          invoiceType: invoiceData.gstEnabled ? "gst" : "non-gst",
          gstEnabled: Boolean(invoiceData.gstEnabled),
          customer: customerInfo.id,
          customerId: customerInfo.id,
          customerName: customerInfo.name,
          customerMobile: customerInfo.mobile,
          taxMode:
            invoiceData.taxMode || invoiceData.globalTaxMode || "without-tax",
          priceIncludesTax: Boolean(invoiceData.priceIncludesTax),
          items: preservedItems,
          totals: preservedTotals,
          payment: paymentInfo,
          notes: invoiceData.notes || "",
          status: invoiceData.status || "completed",
          termsAndConditions: invoiceData.termsAndConditions || "",
          roundOffEnabled: Boolean(invoiceData.roundOffEnabled),
          roundOff: parseFloat(invoiceData.roundOffValue || 0),

          ...(invoiceData.documentType === "quotation" && {
            documentType: "quotation",
            orderType: "quotation",
            quotationValidity: invoiceData.quotationValidity || 30,
          }),

          ...(sourceCompanyId && {
            sourceCompanyId: sourceCompanyId,
            isCrossCompanyTransaction: true,
            customerCompanyId: invoiceData.customer?.companyId || null,
            customerLinkedCompanyId:
              invoiceData.customer?.linkedCompanyId || null,
            sourceCompanyDetectionMethod: sourceCompanyDetectionMethod,
          }),

          ...(!sourceCompanyId && {
            isCrossCompanyTransaction: false,
            customerCompanyId: null,
            customerLinkedCompanyId: null,
            sourceCompanyDetectionMethod: sourceCompanyDetectionMethod,
          }),

          autoDetectSourceCompany: autoDetectSourceCompany,
          sourceOrderId: invoiceData.sourceOrderId || null,
          sourceOrderNumber: invoiceData.sourceOrderNumber || null,
          sourceOrderType: invoiceData.sourceOrderType || null,
          isAutoGenerated: invoiceData.isAutoGenerated || false,
          generatedFrom: invoiceData.generatedFrom || "manual",
          convertedBy: invoiceData.convertedBy || null,

          createdAt: new Date().toISOString(),
          createdBy: "user",

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

        return preservedData;
      }

      const customerInfo = this.extractCustomerInfo(invoiceData);
      const paymentInfo = this.extractPaymentInfo(invoiceData);

      const validItems = (invoiceData.items || []).filter(
        (item) =>
          item.itemName &&
          parseFloat(item.quantity || 0) > 0 &&
          parseFloat(item.pricePerUnit || item.price || 0) > 0
      );

      const cleanItems = this.cleanItems(validItems, invoiceData);
      const totals = this.calculateTotals(invoiceData, cleanItems);

      const cleanData = {
        // ✅ NO INVOICE NUMBER - Model will generate
        companyId: companyId,
        invoiceDate: invoiceData.invoiceDate,
        invoiceType: invoiceData.gstEnabled ? "gst" : "non-gst",
        gstEnabled: Boolean(invoiceData.gstEnabled),
        customer: customerInfo.id,
        customerId: customerInfo.id,
        customerName: customerInfo.name,
        customerMobile: customerInfo.mobile,
        taxMode:
          invoiceData.taxMode || invoiceData.globalTaxMode || "without-tax",
        priceIncludesTax: Boolean(invoiceData.priceIncludesTax),
        items: cleanItems,
        totals: totals,
        payment: paymentInfo,
        notes: invoiceData.notes || "",
        status: invoiceData.status || "completed",
        termsAndConditions: invoiceData.termsAndConditions || "",
        roundOffEnabled: Boolean(invoiceData.roundOffEnabled),
        roundOff: parseFloat(invoiceData.roundOffValue || 0),

        ...(invoiceData.documentType === "quotation" && {
          documentType: "quotation",
          orderType: "quotation",
          quotationValidity: invoiceData.quotationValidity || 30,
        }),

        ...(sourceCompanyId && {
          sourceCompanyId: sourceCompanyId,
          isCrossCompanyTransaction: true,
          customerCompanyId: invoiceData.customer?.companyId || null,
          customerLinkedCompanyId:
            invoiceData.customer?.linkedCompanyId || null,
          sourceCompanyDetectionMethod: sourceCompanyDetectionMethod,
        }),

        ...(!sourceCompanyId && {
          isCrossCompanyTransaction: false,
          customerCompanyId: null,
          customerLinkedCompanyId: null,
          sourceCompanyDetectionMethod: sourceCompanyDetectionMethod,
        }),

        autoDetectSourceCompany: autoDetectSourceCompany,
        sourceOrderId: invoiceData.sourceOrderId || null,
        sourceOrderNumber: invoiceData.sourceOrderNumber || null,
        sourceOrderType: invoiceData.sourceOrderType || null,
        isAutoGenerated: invoiceData.isAutoGenerated || false,
        generatedFrom: invoiceData.generatedFrom || "manual",
        convertedBy: invoiceData.convertedBy || null,

        createdAt: new Date().toISOString(),
        createdBy: "user",
      };

      return cleanData;
    } catch (error) {
      console.error("❌ Error cleaning invoice data:", error);
      throw new Error(`Data cleaning failed: ${error.message}`);
    }
  }

  cleanInvoiceDataForUpdate(invoiceData) {
    try {
      const companyId = invoiceData.companyId || this.getCompanyId();

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

      // Build clean update data
      const cleanData = {
        // ✅ ONLY include invoiceNumber if explicitly forcing an update (rare case)
        ...(invoiceData.forceInvoiceNumberUpdate &&
          invoiceData.invoiceNumber && {
            invoiceNumber: invoiceData.invoiceNumber,
          }),

        // Customer updates
        ...(customerInfo.id && {
          customer: customerInfo.id,
          customerId: customerInfo.id,
          customerName: customerInfo.name,
          customerMobile: customerInfo.mobile,
        }),

        // Invoice details (only if provided)
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

        // Cross-company tracking
        ...(invoiceData.sourceCompanyId && {
          sourceCompanyId: invoiceData.sourceCompanyId,
        }),
        ...(invoiceData.sourceCompanyId && {
          isCrossCompanyTransaction: true,
          customerCompanyId: invoiceData.customer?.companyId || null,
        }),

        // Bidirectional fields if provided
        ...(invoiceData.sourceOrderId && {
          sourceOrderId: invoiceData.sourceOrderId,
        }),
        ...(invoiceData.sourceOrderNumber && {
          sourceOrderNumber: invoiceData.sourceOrderNumber,
        }),
        ...(invoiceData.sourceOrderType && {
          sourceOrderType: invoiceData.sourceOrderType,
        }),
        ...(invoiceData.hasOwnProperty("isAutoGenerated") && {
          isAutoGenerated: invoiceData.isAutoGenerated,
        }),
        ...(invoiceData.generatedFrom && {
          generatedFrom: invoiceData.generatedFrom,
        }),
        ...(invoiceData.convertedBy && {convertedBy: invoiceData.convertedBy}),

        // Update metadata
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: "user",
      };

      return cleanData;
    } catch (error) {
      console.error("❌ Error cleaning update data:", error);
      throw new Error(`Data cleaning failed: ${error.message}`);
    }
  }
  // ✅ NEW: Validate model-generated invoice number format
  validateInvoiceNumberFormat(invoiceNumber) {
    if (!invoiceNumber) return false;

    // Match model's format: PREFIX-[GST-]YYYYMMDD-XXXX
    const pattern = /^[A-Z]{3,4}-(GST-)?[0-9]{8}-[0-9]{4}$/;
    return pattern.test(invoiceNumber);
  }

  // ✅ NEW: Extract company info from model-generated invoice number
  extractInvoiceNumberInfo(invoiceNumber) {
    if (!invoiceNumber) return null;

    const match = invoiceNumber.match(
      /^([A-Z]{3,4})-(GST-)?([0-9]{8})-([0-9]{4})$/
    );

    if (!match) return null;

    return {
      companyPrefix: match[1],
      isGST: !!match[2],
      date: match[3],
      sequence: match[4],
      generatedByModel: true,
      format: "company-specific-sequential",
    };
  }

  // ✅ NEW: Check if invoice number was generated by model
  isModelGeneratedInvoiceNumber(invoiceNumber) {
    return this.validateInvoiceNumberFormat(invoiceNumber);
  }

  // ✅ NEW: Get invoice number pattern info (for display only)
  getInvoiceNumberPatternInfo(companyId, invoiceType = "gst") {
    // This is just for UI display - actual numbers are generated by model
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const prefix = "INV";
    const gstPrefix = invoiceType === "gst" ? "GST-" : "";
    const dateStr = `${year}${month}${day}`;

    return {
      pattern: `${prefix}-${gstPrefix}${dateStr}-XXXX`,
      example: `${prefix}-${gstPrefix}${dateStr}-0001`,
      description: "Sequential number generated automatically by model",
      isPattern: true,
      modelGenerated: true,
    };
  }

  async createInvoice(invoiceData, retryCount = 0) {
    const maxRetries = 2;
    const requestId = `create_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const baseRequestId = invoiceData.submissionId || `create_${Date.now()}`;

    if (this._activeRequests && this._activeRequests.has(baseRequestId)) {
      return {
        success: false,
        error: "Request already in progress",
        message: "Invoice creation already in progress",
        isDuplicate: true,
      };
    }

    try {
      if (!this._activeRequests) {
        this._activeRequests = new Set();
      }
      this._activeRequests.add(baseRequestId);

      if (!this.isWarmedUp && retryCount === 0) {
        await this.warmupBackend();
      }

      if (invoiceData.paymentData) {
        const validation = this.validatePaymentData(invoiceData.paymentData);
        if (!validation.isValid) {
          throw new Error(
            `Payment validation failed: ${validation.errors.join(", ")}`
          );
        }
      }

      if (!invoiceData.companyId) {
        throw new Error("Company ID is required");
      }

      if (!invoiceData.items || invoiceData.items.length === 0) {
        throw new Error("At least one item is required");
      }

      // ✅ CRITICAL: Remove any manual invoice number - let model generate
      delete invoiceData.invoiceNumber;

      const cleanData = this.cleanInvoiceData(invoiceData);

      // ✅ ENSURE: No invoice number is sent to backend
      delete cleanData.invoiceNumber;

      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryCount * 500));
      }

      const response = await api.post("/sales", cleanData);

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
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

      if (
        retryCount < maxRetries &&
        error.response?.status &&
        [500, 502, 503, 504].includes(error.response.status)
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 1000)
        );
        return await this.createInvoice(invoiceData, retryCount + 1);
      }

      if (retryCount < maxRetries && !error.response && error.request) {
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 800)
        );
        return await this.createInvoice(invoiceData, retryCount + 1);
      }

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
        isDuplicate: false,
      };
    } finally {
      setTimeout(() => {
        if (this._activeRequests) {
          this._activeRequests.delete(baseRequestId);
        }
      }, 1500);
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

      return cleanedItem;
    });
  }

  // ✅ NEW: Calculate totals specifically for updates
  calculateTotalsForUpdate(invoiceData, cleanItems) {
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

    return calculatedTotals;
  }

  // ✅ ENHANCED: Delete invoice with better cancellation options
  async deleteInvoice(id, options = {}, retryCount = 0) {
    const maxRetries = 2;

    try {
      if (!id) {
        throw new Error("Invoice ID is required");
      }

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

      return cleanedItem;
    });
  }

  // ✅ ENHANCED: Calculate totals with proper tax mode consideration
  calculateTotals(invoiceData, cleanItems) {
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

  // ==================== 🔄 BIDIRECTIONAL CONVERSION FUNCTIONS ====================

  async convertSalesOrderToInvoice(salesOrderId, conversionData = {}) {
    try {
      if (!salesOrderId) {
        throw new Error("Sales Order ID is required");
      }

      // ✅ ENHANCED: Ensure sourceCompanyId is included in conversion
      const enhancedConversionData = {
        convertedBy: conversionData.convertedBy || "user",
        sourceCompanyId:
          conversionData.sourceCompanyId || conversionData.companyId, // ✅ Critical fix
        sourceOrderId: salesOrderId,
        sourceOrderType: "sales_order",
        isAutoGenerated: true,
        generatedFrom: "sales_order",
        ...conversionData,
      };

      const response = await api.post(
        `/sales/convert-from-sales-order/${salesOrderId}`,
        enhancedConversionData
      );

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Sales order converted to invoice successfully",
          };
        }

        return {
          success: true,
          data: responseData || null,
          message: "Sales order converted to invoice successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to convert sales order to invoice",
        data: null,
      };
    }
  }

  // ✅ NEW: Get purchase invoices created from sales invoices
  async getPurchaseInvoicesFromSalesInvoices(companyId, filters = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {
        companyId,
        page: filters.page || 1,
        limit: filters.limit || 10,
        ...filters,
      };

      const response = await api.get("/sales/purchase-invoices-from-sales", {
        params,
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Purchase invoices from sales invoices fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {purchaseInvoices: [], pagination: {}},
          message: "Purchase invoices from sales invoices fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch purchase invoices from sales invoices",
        data: {purchaseInvoices: [], pagination: {}},
      };
    }
  }

  // ✅ NEW: Get bidirectional invoice analytics
  async getBidirectionalInvoiceAnalytics(companyId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await api.get("/sales/bidirectional-invoice-analytics", {
        params: {companyId},
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Bidirectional invoice analytics fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Bidirectional invoice analytics fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch bidirectional invoice analytics",
        data: {},
      };
    }
  }

  // ✅ NEW: Get sales invoice conversion status
  async getSalesInvoiceConversionStatus(companyId, salesInvoiceId) {
    try {
      if (!companyId || !salesInvoiceId) {
        throw new Error("Company ID and Sales Invoice ID are required");
      }

      const response = await api.get("/sales/invoice-conversion-status", {
        params: {companyId, salesInvoiceId},
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Sales invoice conversion status fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Sales invoice conversion status fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales invoice conversion status",
        data: {},
      };
    }
  }

  // ✅ NEW: Bulk convert sales invoices to purchase invoices
  async bulkConvertSalesInvoicesToPurchaseInvoices(
    salesInvoiceIds,
    conversionData = {}
  ) {
    try {
      if (
        !salesInvoiceIds ||
        !Array.isArray(salesInvoiceIds) ||
        salesInvoiceIds.length === 0
      ) {
        throw new Error("Sales invoice IDs array is required");
      }

      const response = await api.post(
        "/sales/bulk-convert-to-purchase-invoices",
        {
          salesInvoiceIds,
          convertedBy: conversionData.convertedBy || "user",
          targetCompanyId: conversionData.targetCompanyId || null,
        }
      );

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message || "Bulk conversion completed successfully",
          };
        }

        return {
          success: true,
          data: responseData || null,
          message: "Bulk conversion completed successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to perform bulk conversion",
        data: null,
      };
    }
  }

  // ==================== 📄 SALES ORDER TO INVOICE CONVERSION ====================

  // ✅ NEW: Convert sales order to invoice
  async convertSalesOrderToInvoice(salesOrderId, conversionData = {}) {
    try {
      if (!salesOrderId) {
        throw new Error("Sales Order ID is required");
      }

      const response = await api.post(
        `/sales/convert-from-sales-order/${salesOrderId}`,
        {
          convertedBy: conversionData.convertedBy || "user",
          ...conversionData,
        }
      );

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Sales order converted to invoice successfully",
          };
        }

        return {
          success: true,
          data: responseData || null,
          message: "Sales order converted to invoice successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to convert sales order to invoice",
        data: null,
      };
    }
  }

  // ✅ NEW: Get invoices created from sales orders
  async getInvoicesFromSalesOrders(companyId, filters = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {
        companyId,
        page: filters.page || 1,
        limit: filters.limit || 10,
        ...filters,
      };

      const response = await api.get("/sales/from-sales-orders", {params});

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Invoices from sales orders fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {invoices: [], pagination: {}},
          message: "Invoices from sales orders fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch invoices from sales orders",
        data: {invoices: [], pagination: {}},
      };
    }
  }

  // ✅ NEW: Get bidirectional sales analytics
  async getBidirectionalSalesAnalytics(companyId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await api.get("/sales/analytics/bidirectional", {
        params: {companyId},
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Bidirectional sales analytics fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Bidirectional sales analytics fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch bidirectional sales analytics",
        data: {},
      };
    }
  }

  // ✅ NEW: Get sales order conversion status
  async getSalesOrderConversionStatus(companyId, salesOrderId) {
    try {
      if (!companyId || !salesOrderId) {
        throw new Error("Company ID and Sales Order ID are required");
      }

      const response = await api.get("/sales/sales-order-conversion-status", {
        params: {companyId, salesOrderId},
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Sales order conversion status fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Sales order conversion status fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales order conversion status",
        data: {},
      };
    }
  }

  // ✅ NEW: Bulk convert sales orders to invoices
  async bulkConvertSalesOrdersToInvoices(salesOrderIds, conversionData = {}) {
    try {
      if (
        !salesOrderIds ||
        !Array.isArray(salesOrderIds) ||
        salesOrderIds.length === 0
      ) {
        throw new Error("Sales order IDs array is required");
      }

      const response = await api.post("/sales/bulk-convert-sales-orders", {
        salesOrderIds,
        convertedBy: conversionData.convertedBy || "user",
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message || "Bulk conversion completed successfully",
          };
        }

        return {
          success: true,
          data: responseData || null,
          message: "Bulk conversion completed successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to perform bulk conversion",
        data: null,
      };
    }
  }

  // ==================== 🔍 SOURCE TRACKING FUNCTIONS ====================

  // ✅ NEW: Get invoice source tracking
  async getInvoiceSourceTracking(invoiceId) {
    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      const response = await api.get(`/sales/${invoiceId}/source-tracking`);

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Invoice source tracking fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Invoice source tracking fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch invoice source tracking",
        data: {},
      };
    }
  }

  // ✅ NEW: Get detailed sales invoice source tracking
  async getSalesInvoiceSourceTracking(invoiceId) {
    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      const response = await api.get(
        `/sales/${invoiceId}/source-tracking-detailed`
      );

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Detailed invoice source tracking fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Detailed invoice source tracking fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch detailed invoice source tracking",
        data: {},
      };
    }
  }

  // ✅ NEW: Get bidirectional information for an invoice
  async getBidirectionalInvoiceInfo(invoiceId) {
    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      const response = await api.get(`/sales/${invoiceId}/bidirectional-info`);

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Bidirectional invoice information fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Bidirectional invoice information fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch bidirectional invoice information",
        data: {},
      };
    }
  }

  // ==================== 📊 ENHANCED REPORTING FUNCTIONS ====================

  // ✅ NEW: Get bidirectional summary report
  async getBidirectionalSummaryReport(
    companyId,
    dateFrom = null,
    dateTo = null
  ) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {companyId};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await api.get("/sales/reports/bidirectional-summary", {
        params,
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Bidirectional summary report fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Bidirectional summary report fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch bidirectional summary report",
        data: {},
      };
    }
  }

  // ✅ NEW: Get conversion analysis
  async getConversionAnalysis(companyId, period = "month") {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await api.get("/sales/reports/conversion-analysis", {
        params: {companyId, period},
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Conversion analysis fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Conversion analysis fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch conversion analysis",
        data: {},
      };
    }
  }

  // ✅ NEW: Get sales source breakdown analytics
  async getSalesSourceBreakdown(companyId) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const response = await api.get("/sales/analytics/source-breakdown", {
        params: {companyId},
      });

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Sales source breakdown fetched successfully",
          };
        }

        return {
          success: true,
          data: responseData || {},
          message: "Sales source breakdown fetched successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales source breakdown",
        data: {},
      };
    }
  }
  // ✅ NEW: Convert sales invoice to purchase invoice (ADD THIS FUNCTION)
  async convertSalesInvoiceToPurchaseInvoice(
    salesInvoiceId,
    conversionData = {}
  ) {
    try {
      if (!salesInvoiceId) {
        throw new Error("Sales Invoice ID is required");
      }

      // ✅ ENHANCED: Ensure proper conversion data structure
      const enhancedConversionData = {
        convertedBy: conversionData.convertedBy || "user",
        targetCompanyId: conversionData.targetCompanyId || null,
        sourceInvoiceId: salesInvoiceId,
        sourceInvoiceType: "sales_invoice",
        isAutoGenerated: true,
        generatedFrom: "sales_invoice",
        preserveItemDetails: conversionData.preserveItemDetails !== false, // Default to true
        preservePricing: conversionData.preservePricing !== false, // Default to true
        ...conversionData,
      };

      const response = await api.post(
        `/sales/${salesInvoiceId}/convert-to-purchase-invoice`,
        enhancedConversionData
      );

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Sales invoice converted to purchase invoice successfully",
          };
        }

        return {
          success: true,
          data: responseData || null,
          message: "Sales invoice converted to purchase invoice successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(
        "❌ Error converting sales invoice to purchase invoice:",
        error
      );

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to convert sales invoice to purchase invoice",
        data: null,
      };
    }
  }

  // ==================== 📄 EXPORT FUNCTIONS ====================

  // ✅ NEW: Export bidirectional sales data as CSV
  async exportBidirectionalCSV(companyId, dateFrom = null, dateTo = null) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {companyId};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await api.get("/sales/export/bidirectional-csv", {
        params,
        responseType: "blob", // Important for file download
      });

      if (response.status >= 200 && response.status < 300) {
        // Create downloadable blob
        const blob = new Blob([response.data], {type: "text/csv"});
        const url = window.URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement("a");
        link.href = url;
        link.download = `bidirectional-sales-export-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return {
          success: true,
          message: "Bidirectional sales data exported successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to export bidirectional sales data",
      };
    }
  }

  // ==================== 🛠️ UTILITY FUNCTIONS ====================

  // ✅ NEW: Check if invoice can be converted to purchase invoice
  canConvertInvoiceToPurchaseInvoice(invoice) {
    return (
      invoice &&
      !invoice.autoGeneratedPurchaseInvoice &&
      ["draft", "completed"].includes(invoice.status)
    );
  }

  // ✅ NEW: Check if sales order can be converted to invoice
  canConvertSalesOrderToInvoice(salesOrder) {
    return (
      salesOrder &&
      !salesOrder.convertedToInvoice &&
      ["accepted", "confirmed"].includes(salesOrder.status)
    );
  }

  // ✅ NEW: Get bidirectional status description for invoices
  getBidirectionalInvoiceStatusDescription(invoice) {
    const statuses = [];

    if (invoice.isAutoGenerated) {
      statuses.push(`Auto-generated from ${invoice.generatedFrom}`);
    }

    if (invoice.sourceInvoiceId) {
      statuses.push("Generated from purchase invoice");
    }

    if (invoice.autoGeneratedPurchaseInvoice) {
      statuses.push("Has generated purchase invoice");
    }

    if (invoice.notes && invoice.notes.includes("Converted from")) {
      statuses.push("Converted from sales order");
    }

    return statuses.length > 0 ? statuses.join(" | ") : "Direct invoice";
  }

  // ✅ NEW: Format conversion data for API calls
  formatConversionData(data) {
    return {
      convertedBy: data.convertedBy || data.userId || "user",
      targetCompanyId: data.targetCompanyId || null,
      notes: data.notes || "",
      createdBy: data.createdBy || data.convertedBy || data.userId || "user",
      ...data,
    };
  }

  // ==================== ADMIN FUNCTIONS ====================

  /**
   * ✅ FIXED: Admin dashboard - NO companyId for admin calls
   */
  async getDashboardData(companyId) {
    try {
      // ✅ CRITICAL FIX: Handle admin case properly - NO companyId
      if (companyId === "admin") {
        // ✅ FIXED: Remove companyId from admin calls
        const salesResponse = await this.getAllSalesInvoicesForAdmin({
          limit: 1000,
          // ✅ NO companyId for admin
        });

        if (salesResponse.success) {
          const salesData = salesResponse.data.salesInvoices || [];

          // Calculate basic dashboard stats from sales data
          const today = new Date();
          const startOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          );
          const startOfWeek = new Date(
            today.setDate(today.getDate() - today.getDay())
          );
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );

          const todaysSales = salesData.filter((sale) => {
            const saleDate = new Date(sale.invoiceDate || sale.createdAt);
            return saleDate >= startOfDay;
          });

          const weekSales = salesData.filter((sale) => {
            const saleDate = new Date(sale.invoiceDate || sale.createdAt);
            return saleDate >= startOfWeek;
          });

          const monthSales = salesData.filter((sale) => {
            const saleDate = new Date(sale.invoiceDate || sale.createdAt);
            return saleDate >= startOfMonth;
          });

          const dashboardData = {
            today: {
              totalSales: todaysSales.reduce(
                (sum, sale) =>
                  sum + (sale.totals?.finalTotal || sale.amount || 0),
                0
              ),
              totalInvoices: todaysSales.length,
            },
            week: {
              totalSales: weekSales.reduce(
                (sum, sale) =>
                  sum + (sale.totals?.finalTotal || sale.amount || 0),
                0
              ),
              totalInvoices: weekSales.length,
            },
            month: {
              totalSales: monthSales.reduce(
                (sum, sale) =>
                  sum + (sale.totals?.finalTotal || sale.amount || 0),
                0
              ),
              totalInvoices: monthSales.length,
            },
            recentSales: salesData
              .sort(
                (a, b) =>
                  new Date(b.invoiceDate || b.createdAt) -
                  new Date(a.invoiceDate || a.createdAt)
              )
              .slice(0, 10),
            isAdmin: true,
          };

          return {
            success: true,
            data: dashboardData,
            message: "Admin dashboard data calculated from sales",
          };
        }

        // Fallback for admin if sales fetch fails
        return {
          success: true,
          data: {
            today: {totalSales: 0, totalInvoices: 0},
            week: {totalSales: 0, totalInvoices: 0},
            month: {totalSales: 0, totalInvoices: 0},
            recentSales: [],
            isAdmin: true,
          },
          message: "Admin dashboard data (fallback)",
        };
      }

      // ✅ Regular company dashboard
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
      console.error("❌ Dashboard data error:", error);
      return {
        success: false,
        error: error.message,
        data: {},
      };
    }
  }

  /**
   * ✅ FIXED: Enhanced payment summary - NO companyId for admin
   */
  async getEnhancedPaymentSummary(companyId, filters = {}) {
    try {
      // ✅ CRITICAL FIX: Handle admin case - NO companyId
      if (companyId === "admin") {
        // ✅ FIXED: Use getAllSalesInvoicesForAdmin instead of companyId
        const salesResponse = await this.getAllSalesInvoicesForAdmin({
          ...filters,
          limit: filters.limit || 1000,
        });

        if (salesResponse.success) {
          const sales = salesResponse.data.salesInvoices || [];

          // Calculate payment summary manually from all companies
          const summary = {
            totalInvoices: sales.length,
            totalAmount: sales.reduce(
              (sum, sale) =>
                sum + (sale.totals?.finalTotal || sale.amount || 0),
              0
            ),
            totalPaid: sales.reduce(
              (sum, sale) => sum + (sale.payment?.paidAmount || 0),
              0
            ),
            totalPending: sales.reduce(
              (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
              0
            ),
            invoicesByStatus: sales.reduce((acc, sale) => {
              const status = sale.payment?.status || "pending";
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {}),
            paymentMethods: sales.reduce((acc, sale) => {
              const method = sale.payment?.method || "cash";
              acc[method] =
                (acc[method] || 0) + (sale.payment?.paidAmount || 0);
              return acc;
            }, {}),
            overdue: sales.filter((sale) => {
              const dueDate = sale.payment?.dueDate;
              const pending = sale.payment?.pendingAmount || 0;
              return dueDate && new Date(dueDate) < new Date() && pending > 0;
            }),
            dueToday: sales.filter((sale) => {
              const dueDate = sale.payment?.dueDate;
              const pending = sale.payment?.pendingAmount || 0;
              const today = new Date();
              return (
                dueDate &&
                new Date(dueDate).toDateString() === today.toDateString() &&
                pending > 0
              );
            }),
            statusDistribution: sales.reduce((acc, sale) => {
              const status = sale.status || "unknown";
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {}),
            paymentStatusDistribution: sales.reduce((acc, sale) => {
              const status = sale.payment?.status || "pending";
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {}),
            topCompanies: [],
            customerAnalytics: [],
            monthlyTrends: [],
            isAdmin: true,
          };

          return {
            success: true,
            data: summary,
            message: "Admin payment summary calculated successfully",
          };
        }

        throw new Error("Failed to fetch sales data for admin payment summary");
      }

      // ✅ Regular company payment summary
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {companyId, ...filters};

      // Try the enhanced endpoint first
      try {
        const response = await api.get("/sales/analytics/payment-summary", {
          params,
        });

        if (response.status >= 200 && response.status < 300) {
          return {
            success: true,
            data: response.data,
            message: "Enhanced payment summary fetched successfully",
          };
        }
      } catch (enhancedError) {
        console.log("Enhanced endpoint not available, using fallback");
      }

      // Fallback to basic sales data and calculate manually
      const salesResponse = await this.getInvoices(companyId, filters);

      if (salesResponse.success) {
        const sales = salesResponse.data.sales || salesResponse.data.data || [];

        // Calculate payment summary manually
        const summary = {
          totalInvoices: sales.length,
          totalAmount: sales.reduce(
            (sum, sale) => sum + (sale.totals?.finalTotal || sale.amount || 0),
            0
          ),
          totalPaid: sales.reduce(
            (sum, sale) => sum + (sale.payment?.paidAmount || 0),
            0
          ),
          totalPending: sales.reduce(
            (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
            0
          ),
          invoicesByStatus: sales.reduce((acc, sale) => {
            const status = sale.payment?.status || "pending";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {}),
          paymentMethods: sales.reduce((acc, sale) => {
            const method = sale.payment?.method || "cash";
            acc[method] = (acc[method] || 0) + (sale.payment?.paidAmount || 0);
            return acc;
          }, {}),
          overdue: sales.filter((sale) => {
            const dueDate = sale.payment?.dueDate;
            const pending = sale.payment?.pendingAmount || 0;
            return dueDate && new Date(dueDate) < new Date() && pending > 0;
          }),
          dueToday: sales.filter((sale) => {
            const dueDate = sale.payment?.dueDate;
            const pending = sale.payment?.pendingAmount || 0;
            const today = new Date();
            return (
              dueDate &&
              new Date(dueDate).toDateString() === today.toDateString() &&
              pending > 0
            );
          }),
          statusDistribution: sales.reduce((acc, sale) => {
            const status = sale.status || "unknown";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {}),
          paymentStatusDistribution: sales.reduce((acc, sale) => {
            const status = sale.payment?.status || "pending";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {}),
          topCompanies: [],
          customerAnalytics: [],
          monthlyTrends: [],
        };

        return {
          success: true,
          data: summary,
          message: "Payment summary calculated successfully",
        };
      }

      throw new Error("Failed to fetch sales data for payment summary");
    } catch (error) {
      console.error("❌ Error fetching enhanced payment summary:", error);

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch enhanced payment summary",
        data: {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalPending: 0,
          invoicesByStatus: {},
          paymentMethods: {},
          overdue: [],
          dueToday: [],
          statusDistribution: {},
          paymentStatusDistribution: {},
          topCompanies: [],
          customerAnalytics: [],
          monthlyTrends: [],
        },
      };
    }
  }

  /**
   * ✅ FIXED: Payment summary with overdue - NO companyId for admin
   */
  async getPaymentSummaryWithOverdue(companyId, filters = {}) {
    try {
      // ✅ CRITICAL FIX: Handle admin case - NO companyId
      if (companyId === "admin") {
        // ✅ FIXED: Use enhanced payment summary for admin
        const enhancedSummary = await this.getEnhancedPaymentSummary(
          "admin",
          filters
        );

        if (enhancedSummary.success) {
          // Add overdue-specific calculations
          const data = enhancedSummary.data;
          const overdueCount = data.overdue?.length || 0;
          const dueTodayCount = data.dueToday?.length || 0;
          const overdueAmount =
            data.overdue?.reduce(
              (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
              0
            ) || 0;
          const dueTodayAmount =
            data.dueToday?.reduce(
              (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
              0
            ) || 0;

          return {
            success: true,
            data: {
              ...data,
              summary: {
                ...data,
                overdueCount,
                dueTodayCount,
                overdueAmount,
                dueTodayAmount,
              },
              totalSales: data.totalInvoices,
              totalAmount: data.totalAmount,
              totalReceived: data.totalPaid,
              totalPending: data.totalPending,
              totalOverdue: overdueAmount,
              overdueCount: overdueCount,
              isAdmin: true,
            },
            message: "Admin payment summary with overdue analysis completed",
          };
        }

        throw new Error("Failed to fetch admin payment summary data");
      }

      // ✅ Regular company payment summary with overdue
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {companyId, ...filters};

      // Try the specific endpoint first
      try {
        const response = await api.get("/sales/payment-summary-overdue", {
          params,
        });

        if (response.status >= 200 && response.status < 300) {
          return {
            success: true,
            data: response.data,
            message: "Payment summary with overdue fetched successfully",
          };
        }
      } catch (specificError) {
        console.log("Specific endpoint not available, using enhanced summary");
      }

      // Fallback to enhanced payment summary
      const enhancedSummary = await this.getEnhancedPaymentSummary(
        companyId,
        filters
      );

      if (enhancedSummary.success) {
        // Add overdue-specific calculations
        const data = enhancedSummary.data;
        const overdueCount = data.overdue?.length || 0;
        const dueTodayCount = data.dueToday?.length || 0;
        const overdueAmount =
          data.overdue?.reduce(
            (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
            0
          ) || 0;
        const dueTodayAmount =
          data.dueToday?.reduce(
            (sum, sale) => sum + (sale.payment?.pendingAmount || 0),
            0
          ) || 0;

        return {
          success: true,
          data: {
            ...data,
            summary: {
              ...data,
              overdueCount,
              dueTodayCount,
              overdueAmount,
              dueTodayAmount,
            },
            totalSales: data.totalInvoices,
            totalAmount: data.totalAmount,
            totalReceived: data.totalPaid,
            totalPending: data.totalPending,
            totalOverdue: overdueAmount,
            overdueCount: overdueCount,
          },
          message: "Payment summary with overdue analysis completed",
        };
      }

      throw new Error("Failed to fetch payment summary data");
    } catch (error) {
      console.error("❌ Error fetching payment summary with overdue:", error);

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch payment summary with overdue",
        data: {
          summary: {
            totalInvoices: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0,
            overdueCount: 0,
            dueTodayCount: 0,
            overdueAmount: 0,
            dueTodayAmount: 0,
          },
          invoicesByStatus: {},
          paymentMethods: {},
          overdue: [],
          dueToday: [],
          totalSales: 0,
          totalAmount: 0,
          totalReceived: 0,
          totalPending: 0,
          totalOverdue: 0,
          overdueCount: 0,
        },
      };
    }
  }
  /**
   * ✅ FIXED: Get all sales invoices for admin (use proper admin endpoint)
   */
  async getAllSalesInvoicesForAdmin(filters = {}) {
    try {
      const params = {
        populate: "customer,companyId",
        page: filters.page || 1,
        limit: filters.limit || 100,
        sortBy: filters.sortBy || "invoiceDate",
        sortOrder: filters.sortOrder || "desc",
        status: filters.status,
        paymentStatus: filters.paymentStatus,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: filters.search,
        ...filters,
      };

      // Remove undefined/null/empty values
      Object.keys(params).forEach((key) => {
        if (
          params[key] === undefined ||
          params[key] === null ||
          params[key] === ""
        ) {
          delete params[key];
        }
      });

      // ✅ FIXED: Use the correct admin endpoint for sales invoices
      const response = await api.get("/sales/admin/sales-invoices", {params});

      let salesInvoices = [];
      let responseData = response.data;

      // Handle response format - same pattern as sales orders
      if (responseData.success !== undefined) {
        if (responseData.success === false) {
          throw new Error(responseData.message || "API returned error");
        }
        if (responseData.data) {
          if (Array.isArray(responseData.data)) {
            salesInvoices = responseData.data;
          } else if (responseData.data.salesInvoices) {
            salesInvoices = responseData.data.salesInvoices;
          } else if (responseData.data.invoices) {
            salesInvoices = responseData.data.invoices;
          } else if (responseData.data.sales) {
            salesInvoices = responseData.data.sales;
          }
        }
      } else if (Array.isArray(responseData)) {
        salesInvoices = responseData;
      } else if (
        responseData.salesInvoices &&
        Array.isArray(responseData.salesInvoices)
      ) {
        salesInvoices = responseData.salesInvoices;
      } else if (
        responseData.invoices &&
        Array.isArray(responseData.invoices)
      ) {
        salesInvoices = responseData.invoices;
      } else if (responseData.sales && Array.isArray(responseData.sales)) {
        salesInvoices = responseData.sales;
      }

      return {
        success: true,
        data: {
          salesInvoices: salesInvoices,
          invoices: salesInvoices,
          sales: salesInvoices,
          data: salesInvoices,
          count: salesInvoices.length,
          pagination: responseData.pagination || {},
          summary: responseData.summary || {},
          adminStats:
            responseData.adminStats ||
            this.calculateAdminStatsFromData(salesInvoices),
          adminInfo: responseData.adminInfo || {
            isAdminAccess: true,
            crossAllCompanies: true,
            totalCompanies: this.getUniqueCompanyCount(salesInvoices),
          },
        },
        message:
          responseData.message ||
          `Found ${salesInvoices.length} sales invoices`,
      };
    } catch (error) {
      console.error("❌ Admin sales invoices fetch failed:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch all sales invoices for admin",
        data: {
          salesInvoices: [],
          invoices: [],
          sales: [],
          data: [],
          count: 0,
          pagination: {},
          summary: {},
          adminStats: {},
          adminInfo: {},
        },
      };
    }
  }

  /**
   * ✅ NEW: Helper method to count unique companies
   */
  getUniqueCompanyCount(salesInvoices) {
    const uniqueCompanies = new Set();
    salesInvoices.forEach((invoice) => {
      if (invoice.companyId) {
        uniqueCompanies.add(
          typeof invoice.companyId === "object"
            ? invoice.companyId._id
            : invoice.companyId
        );
      }
    });
    return uniqueCompanies.size;
  }

  // ✅ ADD: Calculate admin stats from data (helper method)
  calculateAdminStatsFromData(salesInvoices) {
    if (!Array.isArray(salesInvoices) || salesInvoices.length === 0) {
      return {
        totalRevenue: 0,
        totalInvoices: 0,
        avgInvoiceValue: 0,
        totalCompanies: 0,
        paymentStats: {
          paid: 0,
          pending: 0,
          partial: 0,
        },
      };
    }

    const totalRevenue = salesInvoices.reduce(
      (sum, invoice) =>
        sum +
        (invoice.totals?.finalTotal ||
          invoice.finalTotal ||
          invoice.amount ||
          0),
      0
    );

    const totalInvoices = salesInvoices.length;
    const avgInvoiceValue =
      totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    // Get unique companies
    const uniqueCompanies = new Set();
    salesInvoices.forEach((invoice) => {
      if (invoice.companyId) {
        uniqueCompanies.add(
          typeof invoice.companyId === "object"
            ? invoice.companyId._id
            : invoice.companyId
        );
      }
    });

    // Calculate payment stats
    const paymentStats = {
      paid: 0,
      pending: 0,
      partial: 0,
    };

    salesInvoices.forEach((invoice) => {
      const status =
        invoice.payment?.status || invoice.paymentStatus || "pending";
      if (paymentStats.hasOwnProperty(status)) {
        paymentStats[status]++;
      } else {
        paymentStats.pending++;
      }
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalInvoices,
      avgInvoiceValue: Math.round(avgInvoiceValue * 100) / 100,
      totalCompanies: uniqueCompanies.size,
      paymentStats,
    };
  }

  /**
   * ✅ NEW: Get admin bidirectional analytics for sales
   */
  async getAdminBidirectionalSalesAnalytics(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        ...filters,
      };

      const response = await api.get(
        "/api/admin/sales-invoices/bidirectional-analytics",
        {
          params,
        }
      );

      return {
        success: true,
        data: response.data,
        message: "Admin bidirectional sales analytics fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch admin bidirectional sales analytics",
        data: {
          totalBidirectionalSales: 0,
          companiesUsingBidirectional: 0,
          bidirectionalRevenue: 0,
          conversionRates: {},
          relationshipMapping: [],
          sourceBreakdown: {},
        },
      };
    }
  }

  /**
   * ✅ NEW: Get admin payment analytics for sales invoices
   */
  async getAdminPaymentAnalytics(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        ...filters,
      };

      const response = await api.get(
        "/api/admin/sales-invoices/payment-analytics",
        {
          params,
        }
      );

      return {
        success: true,
        data: response.data,
        message: "Admin payment analytics fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch admin payment analytics",
        data: {
          totalPaidAmount: 0,
          totalPendingAmount: 0,
          totalOverdueAmount: 0,
          paymentMethodBreakdown: {},
          paymentTrends: [],
          overdueAnalysis: {},
        },
      };
    }
  }

  /**
   * ✅ NEW: Get admin customer analytics for sales invoices
   */
  async getAdminCustomerAnalytics(filters = {}) {
    try {
      const params = {
        isAdmin: true,
        includeAllCompanies: true,
        ...filters,
      };

      const response = await api.get(
        "/api/admin/sales-invoices/customer-analytics",
        {
          params,
        }
      );

      return {
        success: true,
        data: response.data,
        message: "Admin customer analytics fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch admin customer analytics",
        data: {
          totalCustomers: 0,
          activeCustomers: 0,
          topCustomers: [],
          customerGrowth: [],
          customerSegmentation: {},
        },
      };
    }
  }

  // ==================== 🖨️ PRINT AND DOCUMENT FUNCTIONS ====================

  /**
   * ✅ NEW: Get sales invoice for printing (A4 format)
   */
  async getSalesInvoiceForPrint(invoiceId, options = {}) {
    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      const params = {
        format: options.format || "a4",
        template: options.template || "standard",
      };

      const response = await api.get(`/sales/${invoiceId}/print`, {params});

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Sales invoice data prepared for printing",
          };
        }

        if (responseData && responseData.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              "Failed to get invoice for printing"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Sales invoice data prepared for printing",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error getting sales invoice for print:", error);

      let errorMessage = "Failed to get sales invoice for printing";

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

  /**
   * ✅ NEW: Get sales receipt for thermal printing
   */
  async getSalesReceiptForPrint(invoiceId, options = {}) {
    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      const params = {
        format: options.format || "thermal",
        template: options.template || "receipt",
      };

      const response = await api.get(`/sales/${invoiceId}/receipt`, {params});

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Sales receipt data prepared for printing",
          };
        }

        if (responseData && responseData.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              "Failed to get receipt for printing"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Sales receipt data prepared for printing",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error getting sales receipt for print:", error);

      let errorMessage = "Failed to get sales receipt for printing";

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

  /**
   * ✅ NEW: Get sales invoice for email/PDF generation (already exists but enhanced)
   */
  async getSalesInvoiceForEmail(invoiceId, options = {}) {
    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      const params = {
        includePaymentLink: options.includePaymentLink || false,
        template: options.template || "professional",
      };

      const response = await api.get(`/sales/${invoiceId}/email`, {params});

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message || "Sales invoice data prepared for email",
          };
        }

        if (responseData && responseData.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              "Failed to get invoice for email"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Sales invoice data prepared for email",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error getting sales invoice for email:", error);

      let errorMessage = "Failed to get sales invoice for email";

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

  /**
   * ✅ NEW: Download sales invoice PDF
   */
  async downloadSalesInvoicePDF(invoiceId, options = {}) {
    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      const params = {
        template: options.template || "standard",
        format: options.format || "a4",
      };

      const response = await api.get(`/sales/${invoiceId}/pdf`, {params});

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message: responseData.message || "PDF download initiated",
            action: "download_pdf",
          };
        }

        if (responseData && responseData.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              "Failed to generate PDF"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "PDF download initiated",
          action: "download_pdf",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error downloading sales invoice PDF:", error);

      let errorMessage = "Failed to download sales invoice PDF";

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

  /**
   * ✅ NEW: Get multiple sales invoices for bulk printing
   */
  async getBulkSalesInvoicesForPrint(invoiceIds, options = {}) {
    try {
      if (
        !invoiceIds ||
        !Array.isArray(invoiceIds) ||
        invoiceIds.length === 0
      ) {
        throw new Error("Invoice IDs array is required");
      }

      const params = {
        format: options.format || "a4",
        template: options.template || "standard",
      };

      const response = await api.post(
        "/sales/bulk-print",
        {ids: invoiceIds},
        {params}
      );

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Bulk sales invoices prepared for printing",
          };
        }

        if (responseData && responseData.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              "Failed to get bulk invoices for printing"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Bulk sales invoices prepared for printing",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error getting bulk sales invoices for print:", error);

      let errorMessage = "Failed to get bulk sales invoices for printing";

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
  /**
   * ✅ NEW: Get sales invoice for QR code payment
   */
  async getSalesInvoiceForQRPayment(invoiceId) {
    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      const response = await api.get(`/sales/${invoiceId}/qr-payment`);

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message || "Payment QR data generated successfully",
          };
        }

        if (responseData && responseData.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              "Failed to generate QR payment data"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Payment QR data generated successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error getting sales invoice for QR payment:", error);

      let errorMessage = "Failed to get sales invoice for QR payment";

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

  /**
   * ✅ NEW: Get sales invoice summary for quick view
   */
  async getSalesInvoiceSummary(invoiceId) {
    try {
      if (!invoiceId) {
        throw new Error("Invoice ID is required");
      }

      const response = await api.get(`/sales/${invoiceId}/summary`);

      if (response.status >= 200 && response.status < 300) {
        const responseData = response.data;

        if (responseData && responseData.success === true) {
          return {
            success: true,
            data: responseData.data,
            message:
              responseData.message ||
              "Sales invoice summary retrieved successfully",
          };
        }

        if (responseData && responseData.success === false) {
          throw new Error(
            responseData.message ||
              responseData.error ||
              "Failed to get invoice summary"
          );
        }

        return {
          success: true,
          data: responseData || null,
          message: "Sales invoice summary retrieved successfully",
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error getting sales invoice summary:", error);

      let errorMessage = "Failed to get sales invoice summary";

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

  // ==================== 📄 PRINT UTILITY FUNCTIONS ====================

  /**
   * ✅ NEW: Check if invoice can be printed
   */
  canPrintInvoice(invoice) {
    return (
      invoice &&
      invoice._id &&
      ["draft", "completed", "active"].includes(invoice.status)
    );
  }

  /**
   * ✅ NEW: Get print format options
   */
  getPrintFormatOptions() {
    return [
      {
        value: "a4",
        label: "A4 Format",
        description: "Standard A4 invoice format",
      },
      {
        value: "thermal",
        label: "Thermal Receipt",
        description: "58mm thermal printer format",
      },
      {
        value: "pos",
        label: "POS Receipt",
        description: "80mm POS printer format",
      },
    ];
  }

  /**
   * ✅ NEW: Get print template options
   */
  getPrintTemplateOptions() {
    return [
      {
        value: "standard",
        label: "Standard Template",
        description: "Standard business invoice",
      },
      {
        value: "professional",
        label: "Professional Template",
        description: "Enhanced professional layout",
      },
      {
        value: "minimal",
        label: "Minimal Template",
        description: "Clean minimal design",
      },
      {
        value: "receipt",
        label: "Receipt Template",
        description: "Simple receipt format",
      },
    ];
  }

  /**
   * ✅ NEW: Format invoice data for frontend printing
   */
  formatInvoiceDataForPrint(invoiceData) {
    if (!invoiceData) return null;

    return {
      // Company info
      company: {
        name: invoiceData.company?.name || "Company Name",
        gstin: invoiceData.company?.gstin || "",
        address: invoiceData.company?.address || "",
        phone: invoiceData.company?.phone || "",
        email: invoiceData.company?.email || "",
        logo: invoiceData.company?.logo || null,
      },

      // Customer info
      customer: {
        name: invoiceData.customer?.name || "Customer",
        address: invoiceData.customer?.address || "",
        mobile: invoiceData.customer?.mobile || "",
        email: invoiceData.customer?.email || "",
        gstin: invoiceData.customer?.gstin || "",
      },

      // Invoice details
      invoice: {
        id: invoiceData.invoice?.id || invoiceData._id,
        invoiceNumber:
          invoiceData.invoice?.invoiceNumber || invoiceData.invoiceNumber,
        invoiceDate:
          invoiceData.invoice?.invoiceDate || invoiceData.invoiceDate,
        dueDate: invoiceData.invoice?.dueDate || invoiceData.dueDate,
        status: invoiceData.invoice?.status || invoiceData.status,
        notes: invoiceData.invoice?.notes || invoiceData.notes || "",
        terms:
          invoiceData.invoice?.terms || invoiceData.termsAndConditions || "",
      },

      // Items
      items: (invoiceData.items || []).map((item, index) => ({
        srNo: index + 1,
        name: item.name || item.itemName || `Item ${index + 1}`,
        hsnCode: item.hsnCode || "",
        quantity: item.quantity || 1,
        unit: item.unit || "PCS",
        rate: item.rate || item.pricePerUnit || 0,
        taxRate: item.taxRate || 0,
        cgst: item.cgst || item.cgstAmount || 0,
        sgst: item.sgst || item.sgstAmount || 0,
        igst: item.igst || item.igstAmount || 0,
        amount: item.amount || 0,
      })),

      // Totals
      totals: {
        subtotal: invoiceData.totals?.subtotal || 0,
        totalTax: invoiceData.totals?.totalTax || 0,
        totalCGST: invoiceData.totals?.totalCGST || 0,
        totalSGST: invoiceData.totals?.totalSGST || 0,
        totalIGST: invoiceData.totals?.totalIGST || 0,
        totalDiscount: invoiceData.totals?.totalDiscount || 0,
        roundOff: invoiceData.totals?.roundOff || 0,
        finalTotal: invoiceData.totals?.finalTotal || 0,
      },

      // Payment info
      payment: {
        method: invoiceData.payment?.method || "cash",
        paidAmount: invoiceData.payment?.paidAmount || 0,
        pendingAmount: invoiceData.payment?.pendingAmount || 0,
        status: invoiceData.payment?.status || "pending",
      },

      // Metadata
      meta: {
        printDate: new Date(),
        isSalesInvoice: true,
        isGSTInvoice: invoiceData.gstEnabled || false,
        format: invoiceData.meta?.format || "a4",
        template: invoiceData.meta?.template || "standard",
      },
    };
  }

  /**
   * ✅ NEW: Generate invoice print preview URL
   */
  generateInvoicePrintPreviewURL(invoiceId, options = {}) {
    if (!invoiceId) return null;

    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const params = new URLSearchParams({
      format: options.format || "a4",
      template: options.template || "standard",
      preview: "true",
    });

    return `${baseURL}/sales/${invoiceId}/print?${params.toString()}`;
  }
  /**
   * ✅ NEW: Convert invoice to different print formats
   */
  async convertInvoiceToPrintFormat(invoiceId, targetFormat, options = {}) {
    try {
      // Get invoice data in the target format
      const printData = await this.getSalesInvoiceForPrint(invoiceId, {
        format: targetFormat,
        template: options.template || "standard",
      });

      if (printData.success) {
        // Format the data based on target format
        switch (targetFormat) {
          case "thermal":
            return this.formatForThermalPrint(printData.data);
          case "pos":
            return this.formatForPOSPrint(printData.data);
          case "email":
            return this.formatForEmailPrint(printData.data);
          default:
            return printData;
        }
      }

      return printData;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to convert invoice to print format",
      };
    }
  }

  /**
   * ✅ NEW: Format data for thermal printing
   */
  formatForThermalPrint(invoiceData) {
    const thermalData = this.formatInvoiceDataForPrint(invoiceData);

    // Thermal-specific formatting
    if (thermalData) {
      thermalData.meta.width = 58; // mm
      thermalData.meta.printType = "thermal";
      thermalData.meta.lineLimit = 32; // characters per line

      // Truncate long item names for thermal printing
      thermalData.items = thermalData.items.map((item) => ({
        ...item,
        name: item.name.substring(0, 20), // Limit to 20 chars
      }));
    }

    return {
      success: true,
      data: thermalData,
      message: "Invoice formatted for thermal printing",
    };
  }

  /**
   * ✅ NEW: Format data for POS printing
   */
  formatForPOSPrint(invoiceData) {
    const posData = this.formatInvoiceDataForPrint(invoiceData);

    // POS-specific formatting
    if (posData) {
      posData.meta.width = 80; // mm
      posData.meta.printType = "pos";
      posData.meta.lineLimit = 42; // characters per line
    }

    return {
      success: true,
      data: posData,
      message: "Invoice formatted for POS printing",
    };
  }

  /**
   * ✅ NEW: Format data for email printing
   */
  formatForEmailPrint(invoiceData) {
    const emailData = this.formatInvoiceDataForPrint(invoiceData);

    // Email-specific formatting
    if (emailData) {
      emailData.meta.isEmailVersion = true;
      emailData.meta.includePaymentLink = true;
      emailData.meta.format = "email";
    }

    return {
      success: true,
      data: emailData,
      message: "Invoice formatted for email",
    };
  }
}

const salesService = new SalesService();
export default salesService;
