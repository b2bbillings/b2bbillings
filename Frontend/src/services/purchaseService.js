const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

import transactionService from "./transactionService.js";

class PurchaseService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getAuthHeaders() {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token");

    return {
      "Content-Type": "application/json",
      ...(token && {
        Authorization: `Bearer ${token}`,
        "x-auth-token": token,
      }),
    };
  }

  // ✅ Enhanced API call with better error handling
  async apiCall(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      let data;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = {message: await response.text()};
      }

      if (!response.ok) {
        let errorMessage =
          data.message || `HTTP error! status: ${response.status}`;

        // Enhanced error categorization
        const errorCategory = this.categorizeError(response.status, data);

        if (response.status === 400) {
          errorMessage = data.message || "Invalid purchase data";
          // Check for validation errors
          if (data.errors && Array.isArray(data.errors)) {
            errorMessage +=
              "\nValidation errors: " +
              data.errors.map((err) => err.message).join(", ");
          }
        } else if (response.status === 401) {
          errorMessage = "Authentication required. Please login again.";
          // Clear auth tokens
          localStorage.removeItem("token");
          localStorage.removeItem("authToken");
          sessionStorage.removeItem("token");
        } else if (response.status === 403) {
          errorMessage =
            "Access denied. You do not have permission for this operation.";
        } else if (response.status === 404) {
          errorMessage = "Purchase or resource not found.";
        } else if (response.status === 422) {
          errorMessage =
            "Validation failed: " + (data.message || "Invalid data provided");
        } else if (response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.category = errorCategory;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Add error context
      if (!error.status) {
        error.category = "network";
        error.message = `Network error: ${error.message}`;
      }
      throw error;
    }
  }

  // ✅ Enhanced retry logic for critical operations
  async apiCallWithRetry(endpoint, options = {}, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.apiCall(endpoint, options);
      } catch (error) {
        lastError = error;

        // Don't retry for client errors (4xx) except 408, 429
        if (
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 408 &&
          error.status !== 429
        ) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // ✅ Error categorization helper
  categorizeError(status, data) {
    if (status >= 400 && status < 500) {
      if (status === 401) return "authentication";
      if (status === 403) return "authorization";
      if (status === 404) return "not_found";
      if (status === 422) return "validation";
      return "client_error";
    }
    if (status >= 500) return "server_error";
    return "unknown";
  }

  // ✅ Company validation helper
  validateCompanyId(companyId) {
    if (!companyId) {
      throw new Error("Company ID is required for this operation");
    }
    return true;
  }

  async getPendingPurchaseInvoicesForPayment(companyId, supplierId) {
    this.validateCompanyId(companyId);

    if (!supplierId) {
      throw new Error("Supplier ID is required");
    }

    return await this.apiCall(
      `/payments/pending-purchase-invoices/${supplierId}?companyId=${companyId}`
    );
  }

  async makePaymentWithAllocation(
    companyId,
    paymentData,
    employeeContext = {}
  ) {
    try {
      this.validateCompanyId(companyId);

      // First create the payment
      const paymentResponse = await this.createPaymentOut(
        companyId,
        {
          party: paymentData.supplierId,
          partyId: paymentData.supplierId,
          partyName: paymentData.supplierName,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod || "cash",
          paymentDate: paymentData.paymentDate || new Date().toISOString(),
          reference: paymentData.reference || "",
          notes: paymentData.notes || "",
          bankAccountId: paymentData.bankAccountId,
          purchaseInvoiceId: paymentData.purchaseId,
          clearingDate: paymentData.clearingDate,
          status: "completed",
        },
        employeeContext
      );

      return paymentResponse;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Enhanced payment update method
  async updatePaymentTransaction(
    transactionId,
    updateData,
    employeeContext = {}
  ) {
    const enhancedUpdateData = {
      ...updateData,
      employeeName: employeeContext.name || updateData.employeeName || "",
      employeeId: employeeContext.id || updateData.employeeId || "",
      lastModifiedBy: employeeContext.id || updateData.lastModifiedBy || null,
    };

    return await this.apiCall(`/payments/transactions/${transactionId}`, {
      method: "PUT",
      body: JSON.stringify(enhancedUpdateData),
    });
  }

  // ✅ Enhanced purchase creation with employee tracking
  async createPurchaseWithEmployee(purchaseData, employeeContext = {}) {
    const enhancedData = {
      ...purchaseData,
      employeeName: employeeContext.name || "",
      employeeId: employeeContext.id || "",
      createdBy: employeeContext.id || null,
    };

    return await this.createPurchase(enhancedData);
  }

  async addPaymentWithEmployee(purchaseId, paymentData, employeeContext = {}) {
    const enhancedPaymentData = {
      ...paymentData,
      employeeName: employeeContext.name || "",
      employeeId: employeeContext.id || "",
      createdBy: employeeContext.id || null,
    };

    return await this.addPayment(purchaseId, enhancedPaymentData);
  }

  async createPurchaseWithTransaction(purchaseData) {
    try {
      if (!purchaseData.companyId) {
        throw new Error("Company ID is required");
      }

      const purchaseResponse = await this.createPurchase(purchaseData);

      if (!purchaseResponse.success) {
        throw new Error(
          purchaseResponse.message || "Failed to create purchase"
        );
      }

      const createdPurchase = purchaseResponse.data;
      const paymentMade = parseFloat(
        purchaseData.paymentReceived || purchaseData.payment?.paidAmount || 0
      );

      if (paymentMade > 0 && purchaseData.bankAccountId) {
        try {
          const transactionData = {
            companyId: purchaseData.companyId,
            bankAccountId: purchaseData.bankAccountId,
            amount: paymentMade,
            transactionType: "payment_out",
            direction: "out",
            paymentMethod: purchaseData.paymentMethod || "cash",
            description: `Purchase payment for ${
              createdPurchase.purchaseNumber || "N/A"
            }`,
            notes: `Payment made to ${
              purchaseData.supplierName ||
              purchaseData.supplier?.name ||
              "supplier"
            }`,

            // Party information (supplier)
            partyId:
              purchaseData.supplier?.id || purchaseData.supplierId || null,
            partyName:
              purchaseData.supplierName || purchaseData.supplier?.name || "",
            partyType: "supplier",

            // Reference information
            referenceId: createdPurchase._id || createdPurchase.id,
            referenceType: "purchase",
            referenceNumber: createdPurchase.purchaseNumber,

            // Payment specific details
            chequeNumber: purchaseData.chequeNumber || "",
            chequeDate: purchaseData.chequeDate || null,
            transactionId:
              purchaseData.upiTransactionId ||
              purchaseData.bankTransactionId ||
              "",
            upiTransactionId: purchaseData.upiTransactionId || "",

            // Dates
            transactionDate: new Date().toISOString(),
            dueDate:
              purchaseData.dueDate || purchaseData.payment?.dueDate || null,
            creditDays:
              purchaseData.creditDays || purchaseData.payment?.creditDays || 0,

            // Employee context
            employeeName: purchaseData.employeeName || "",
            employeeId: purchaseData.employeeId || "",
            createdBy: purchaseData.employeeId || null,

            // Invoice information
            invoiceNumber: createdPurchase.purchaseNumber,
            formType: "purchase",

            status: "completed",
          };

          const transactionResponse =
            await transactionService.createTransaction(
              purchaseData.companyId,
              transactionData
            );

          if (transactionResponse?.success) {
            createdPurchase.transaction = transactionResponse.data;
            createdPurchase.transactionId =
              transactionResponse.data._id || transactionResponse.data.id;

            // ✅ Return consistent success format
            return {
              success: true,
              data: {
                ...createdPurchase,
                transaction: transactionResponse.data,
                transactionId:
                  transactionResponse.data._id || transactionResponse.data.id,
              },
              message: "Purchase created successfully with payment transaction",
              // Also include the individual objects for backward compatibility
              purchase: createdPurchase,
              bill: createdPurchase,
              transaction: transactionResponse.data,
              transactionId:
                transactionResponse.data._id || transactionResponse.data.id,
            };
          } else {
            throw new Error(
              transactionResponse?.message || "Transaction creation failed"
            );
          }
        } catch (transactionError) {
          console.warn("Transaction creation failed:", transactionError);

          // ✅ Return success with warning for purchase created but transaction failed
          return {
            success: true,
            data: {
              ...createdPurchase,
              transactionError: transactionError.message,
              transactionWarning:
                "Purchase created successfully, but payment transaction could not be recorded. You can add payment manually later.",
            },
            message:
              "Purchase created successfully, but payment transaction failed",
            // Also include the individual objects for backward compatibility
            purchase: createdPurchase,
            bill: createdPurchase,
            transactionError: transactionError.message,
            transactionWarning:
              "Purchase created successfully, but payment transaction could not be recorded. You can add payment manually later.",
          };
        }
      } else if (paymentMade > 0 && !purchaseData.bankAccountId) {
        // ✅ Return success with warning for payment without bank account
        return {
          success: true,
          data: {
            ...createdPurchase,
            transactionWarning:
              "Payment amount specified but no bank account selected. Transaction not created.",
          },
          message: "Purchase created successfully",
          // Also include the individual objects for backward compatibility
          purchase: createdPurchase,
          bill: createdPurchase,
          transactionWarning:
            "Payment amount specified but no bank account selected. Transaction not created.",
        };
      }

      // ✅ Return standard success format for purchases without payment
      return {
        success: true,
        data: createdPurchase,
        message: "Purchase created successfully",
        // Also include the individual objects for backward compatibility
        purchase: createdPurchase,
        bill: createdPurchase,
      };
    } catch (error) {
      throw error;
    }
  }

  async addPaymentWithTransaction(companyId, purchaseId, paymentData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }
      if (!purchaseId) {
        throw new Error("Purchase ID is required");
      }
      if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        throw new Error("Valid payment amount is required");
      }
      if (!paymentData.bankAccountId) {
        throw new Error("Bank account is required for payment transaction");
      }

      const purchaseResponse = await this.getPurchaseById(purchaseId);
      if (!purchaseResponse.success) {
        throw new Error("Purchase not found");
      }

      const purchase = purchaseResponse.data;

      const paymentResponse = await this.addPayment(purchaseId, {
        ...paymentData,
        dueDate: paymentData.dueDate || null,
        creditDays: paymentData.creditDays || 0,
        employeeName: paymentData.employeeName || "",
        employeeId: paymentData.employeeId || "",
      });

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message || "Failed to add payment");
      }

      const paymentAmount = parseFloat(paymentData.amount);

      try {
        // ✅ FIXED: Use correct transactionService.createTransaction method
        const transactionData = {
          companyId: companyId,
          bankAccountId: paymentData.bankAccountId,
          amount: paymentAmount,
          transactionType: "payment_out", // Purchase payment is money going out
          direction: "out",
          paymentMethod:
            paymentData.method || paymentData.paymentMethod || "cash",
          description: `Additional payment for purchase ${
            purchase.purchaseNumber || purchaseId
          }`,
          notes:
            paymentData.notes ||
            `Additional payment made to ${purchase.supplierName || "supplier"}`,

          // Party information (supplier)
          partyId: purchase.supplier?._id || purchase.supplier?.id || null,
          partyName: purchase.supplierName || purchase.supplier?.name || "",
          partyType: "supplier",

          // Reference information
          referenceId: purchaseId,
          referenceType: "purchase",
          referenceNumber: purchase.purchaseNumber,

          // Payment specific details
          chequeNumber: paymentData.chequeNumber || "",
          chequeDate: paymentData.chequeDate || null,
          transactionId:
            paymentData.upiTransactionId || paymentData.bankTransactionId || "",
          upiTransactionId: paymentData.upiTransactionId || "",

          // Dates
          transactionDate: new Date().toISOString(),
          dueDate: paymentData.dueDate || null,
          creditDays: paymentData.creditDays || 0,

          // Employee context
          employeeName: paymentData.employeeName || "",
          employeeId: paymentData.employeeId || "",
          createdBy: paymentData.employeeId || null,

          // Invoice information
          invoiceNumber: purchase.purchaseNumber,
          formType: "purchase-payment",

          status: "completed",
        };

        // ✅ Use the correct method signature from transactionService
        const transactionResponse = await transactionService.createTransaction(
          companyId,
          transactionData
        );

        if (transactionResponse?.success) {
          paymentResponse.data.transaction = transactionResponse.data;
          paymentResponse.data.transactionId =
            transactionResponse.data._id || transactionResponse.data.id;
        } else {
          throw new Error(
            transactionResponse?.message || "Transaction creation failed"
          );
        }
      } catch (transactionError) {
        console.warn("Transaction creation failed:", transactionError);
        paymentResponse.data.transactionError = transactionError.message;
        paymentResponse.data.transactionWarning =
          "Payment recorded successfully, but bank transaction could not be created. Please check your bank account settings.";
      }

      return {
        success: true,
        data: paymentResponse.data,
        message:
          "Payment added successfully" +
          (paymentResponse.data.transaction ? " with bank transaction" : "") +
          (paymentResponse.data.transactionWarning
            ? ". Note: " + paymentResponse.data.transactionWarning
            : ""),
      };
    } catch (error) {
      throw error;
    }
  }

  // ✅ FIXED: Update quick purchase method as well
  async createQuickPurchaseWithTransaction(purchaseData) {
    try {
      if (!purchaseData.companyId) {
        throw new Error("Company ID is required");
      }
      if (!purchaseData.amount || parseFloat(purchaseData.amount) <= 0) {
        throw new Error("Valid purchase amount is required");
      }
      if (!purchaseData.bankAccountId) {
        throw new Error("Bank account is required for cash purchase");
      }

      const quickPurchaseData = {
        companyId: purchaseData.companyId,
        supplierName: purchaseData.supplierName || "Cash Supplier",
        supplierMobile: purchaseData.supplierMobile || "",
        purchaseType: "non-gst",
        gstEnabled: false,
        paymentMethod: purchaseData.paymentMethod || "cash",
        paymentReceived: purchaseData.amount,
        bankAccountId: purchaseData.bankAccountId,
        items: purchaseData.items || [
          {
            itemName: purchaseData.itemName || "Quick Purchase Item",
            quantity: 1,
            pricePerUnit: parseFloat(purchaseData.amount),
            taxRate: 0,
            amount: parseFloat(purchaseData.amount),
          },
        ],
        totals: {
          subtotal: parseFloat(purchaseData.amount),
          totalDiscount: 0,
          totalTax: 0,
          finalTotal: parseFloat(purchaseData.amount),
        },
        notes: purchaseData.notes || "Quick cash purchase",
        status: "completed",
        chequeNumber: purchaseData.chequeNumber,
        chequeDate: purchaseData.chequeDate,
        upiTransactionId: purchaseData.upiTransactionId,
        bankTransactionId: purchaseData.bankTransactionId,
        dueDate: purchaseData.dueDate || null,
        creditDays: purchaseData.creditDays || 0,
        employeeName: purchaseData.employeeName || "",
        employeeId: purchaseData.employeeId || "",
      };

      const result = await this.createPurchaseWithTransaction(
        quickPurchaseData
      );

      return {
        ...result,
        message:
          "Quick purchase created successfully" +
          (result.data.transaction ? " with payment transaction" : ""),
      };
    } catch (error) {
      throw error;
    }
  }

  // ✅ Add helper method to handle different transaction service methods safely
  async safeCreateTransaction(companyId, transactionData) {
    try {
      // Check if transactionService has the method we need
      if (typeof transactionService.createTransaction === "function") {
        return await transactionService.createTransaction(
          companyId,
          transactionData
        );
      } else if (
        typeof transactionService.createPaymentOutTransaction === "function"
      ) {
        // Fallback to payment out transaction method
        return await transactionService.createPaymentOutTransaction(
          companyId,
          transactionData
        );
      } else {
        // If no transaction service method is available, return a mock success
        console.warn(
          "Transaction service method not available. Transaction not created."
        );
        return {
          success: false,
          message: "Transaction service not available",
          data: null,
        };
      }
    } catch (error) {
      console.warn("Transaction creation failed:", error);
      return {
        success: false,
        message: error.message || "Transaction creation failed",
        data: null,
      };
    }
  }

  // ✅ Enhanced createPaymentOut method to use correct transaction service
  async createPaymentOut(companyId, paymentData, employeeContext = {}) {
    this.validateCompanyId(companyId);

    const enhancedPaymentData = {
      companyId,
      amount: paymentData.amount,
      transactionType: "payment_out",
      direction: "out",
      paymentMethod: paymentData.paymentMethod || "cash",
      description:
        paymentData.description ||
        `Payment to ${paymentData.partyName || "supplier"}`,

      // Party information
      partyId: paymentData.partyId || paymentData.party,
      partyName: paymentData.partyName || "",
      partyType: "supplier",

      // Bank account for non-cash payments
      ...(paymentData.bankAccountId &&
        paymentData.paymentMethod !== "cash" && {
          bankAccountId: paymentData.bankAccountId,
        }),

      // Reference information
      ...(paymentData.purchaseInvoiceId && {
        referenceId: paymentData.purchaseInvoiceId,
        referenceType: "purchase",
        invoiceNumber: paymentData.reference || "",
      }),

      // Employee context
      employeeName: employeeContext.name || paymentData.employeeName || "",
      employeeId: employeeContext.id || paymentData.employeeId || "",
      createdBy: employeeContext.id || paymentData.createdBy || null,

      // Additional fields
      notes: paymentData.notes || "",
      status: paymentData.status || "completed",
      transactionDate: paymentData.paymentDate || new Date().toISOString(),
      clearingDate: paymentData.clearingDate || null,
    };

    try {
      // Use the transaction service directly
      const result = await transactionService.createTransaction(
        companyId,
        enhancedPaymentData
      );

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: "Payment created successfully",
        };
      } else {
        throw new Error(result.message || "Failed to create payment");
      }
    } catch (error) {
      // Fallback to regular API call if transaction service fails
      return await this.apiCall("/payments/pay-out", {
        method: "POST",
        body: JSON.stringify(enhancedPaymentData),
      });
    }
  }

  // ✅ Enhanced method to get transactions for purchases
  async getPurchasesWithTransactions(companyId, filters = {}) {
    try {
      this.validateCompanyId(companyId);

      const purchasesResponse = await this.getPurchases(companyId, filters);

      if (!purchasesResponse.success) {
        return purchasesResponse;
      }

      // ✅ Use correct transaction service method
      const transactionSummary = await transactionService.getTransactionSummary(
        companyId,
        {
          transactionType: "payment_out",
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      );

      return {
        success: true,
        data: {
          ...purchasesResponse.data,
          transactionSummary: transactionSummary.data?.summary || {},
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: {purchases: [], summary: {}},
      };
    }
  }

  // ✅ Enhanced method to get purchase transaction status
  async getPurchaseTransactionStatus(companyId, purchaseId) {
    try {
      this.validateCompanyId(companyId);

      // ✅ Use correct transaction service method
      const transactions = await transactionService.getTransactions(companyId, {
        referenceId: purchaseId,
        referenceType: "purchase",
      });

      const purchaseTransactions = transactions.data?.transactions || [];
      const totalTransacted = purchaseTransactions.reduce((sum, txn) => {
        return sum + (txn.direction === "out" ? txn.amount : 0);
      }, 0);

      return {
        success: true,
        data: {
          hasTransactions: purchaseTransactions.length > 0,
          transactionCount: purchaseTransactions.length,
          totalTransacted: totalTransacted,
          transactions: purchaseTransactions,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: {hasTransactions: false, transactionCount: 0, totalTransacted: 0},
      };
    }
  }

  // ✅ Enhanced core methods with retry logic
  async createPurchase(purchaseData) {
    const backendData = this.transformToBackendFormat(purchaseData);

    return await this.apiCallWithRetry("/purchases", {
      method: "POST",
      body: JSON.stringify(backendData),
    });
  }

  async getPurchases(companyId, filters = {}) {
    this.validateCompanyId(companyId);

    const queryParams = new URLSearchParams({
      companyId,
      ...filters,
    });

    return await this.apiCall(`/purchases?${queryParams}`);
  }

  async getPurchaseById(id) {
    return await this.apiCall(`/purchases/${id}`);
  }

  async updatePurchase(id, purchaseData, employeeContext = {}) {
    const backendData = this.transformToBackendFormat({
      ...purchaseData,
      employeeName: employeeContext.name || purchaseData.employeeName || "",
      employeeId: employeeContext.id || purchaseData.employeeId || "",
      lastModifiedBy: employeeContext.id || purchaseData.lastModifiedBy || null,
    });

    return await this.apiCall(`/purchases/${id}`, {
      method: "PUT",
      body: JSON.stringify(backendData),
    });
  }

  async deletePurchase(id) {
    return await this.apiCall(`/purchases/${id}`, {
      method: "DELETE",
    });
  }

  async addPayment(purchaseId, paymentData) {
    return await this.apiCall(`/purchases/${purchaseId}/payments`, {
      method: "POST",
      body: JSON.stringify({
        amount: paymentData.amount,
        method: paymentData.method || paymentData.paymentMethod || "cash",
        reference: paymentData.reference || "",
        paymentDate: paymentData.paymentDate || null,
        dueDate: paymentData.dueDate || null,
        creditDays: paymentData.creditDays || null,
        notes: paymentData.notes || "",
        employeeName: paymentData.employeeName || "",
        employeeId: paymentData.employeeId || "",
      }),
    });
  }

  async getDashboardData(companyId) {
    this.validateCompanyId(companyId);
    return await this.apiCall(`/purchases/dashboard?companyId=${companyId}`);
  }

  async getNextPurchaseNumber(companyId, purchaseType = "gst") {
    this.validateCompanyId(companyId);
    return await this.apiCall(
      `/purchases/next-purchase-number?companyId=${companyId}&purchaseType=${purchaseType}`
    );
  }

  async getTodaysPurchases(companyId) {
    this.validateCompanyId(companyId);
    return await this.apiCall(`/purchases/today?companyId=${companyId}`);
  }

  async getMonthlyReport(companyId, year, month) {
    this.validateCompanyId(companyId);
    return await this.apiCall(
      `/purchases/monthly-report?companyId=${companyId}&year=${year}&month=${month}`
    );
  }

  async getSupplierStats(companyId, supplierId) {
    this.validateCompanyId(companyId);
    return await this.apiCall(
      `/purchases/supplier-stats?companyId=${companyId}&supplierId=${supplierId}`
    );
  }

  async completePurchase(purchaseId) {
    return await this.apiCall(`/purchases/${purchaseId}/complete`, {
      method: "POST",
    });
  }

  async markAsOrdered(purchaseId) {
    return await this.apiCall(`/purchases/${purchaseId}/mark-ordered`, {
      method: "POST",
    });
  }

  async markAsReceived(purchaseId) {
    return await this.apiCall(`/purchases/${purchaseId}/mark-received`, {
      method: "POST",
    });
  }

  async validateItems(items) {
    return await this.apiCall("/purchases/validate-items", {
      method: "POST",
      body: JSON.stringify({items}),
    });
  }

  async exportCSV(companyId, filters = {}) {
    this.validateCompanyId(companyId);

    const queryParams = new URLSearchParams({
      companyId,
      ...filters,
    });

    const response = await fetch(
      `${this.baseURL}/purchases/export-csv?${queryParams}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to export CSV");
    }

    return response.blob();
  }

  async getOverduePurchases(companyId) {
    try {
      this.validateCompanyId(companyId);
      return await this.apiCall(`/purchases/overdue?companyId=${companyId}`);
    } catch (error) {
      try {
        const purchasesResponse = await this.getPurchases(companyId);

        if (!purchasesResponse.success) {
          return {
            success: false,
            message: "Failed to fetch purchases data",
            data: [],
          };
        }

        const allPurchases = purchasesResponse.data.purchases || [];
        const today = new Date();

        const overduePurchases = allPurchases.filter((purchase) => {
          const pendingAmount = purchase.payment?.pendingAmount || 0;
          const dueDate = purchase.payment?.dueDate;

          if (!dueDate || pendingAmount <= 0) return false;

          const due = new Date(dueDate);
          return due < today;
        });

        return {
          success: true,
          data: overduePurchases,
          message: `Found ${overduePurchases.length} overdue purchases (client-side filtered)`,
        };
      } catch (fallbackError) {
        return {
          success: false,
          message: "Unable to fetch overdue purchases",
          data: [],
        };
      }
    }
  }

  async getPurchasesDueToday(companyId) {
    try {
      this.validateCompanyId(companyId);
      return await this.apiCall(`/purchases/due-today?companyId=${companyId}`);
    } catch (error) {
      try {
        const purchasesResponse = await this.getPurchases(companyId);

        if (!purchasesResponse.success) {
          return {
            success: false,
            message: "Failed to fetch purchases data",
            data: [],
          };
        }

        const allPurchases = purchasesResponse.data.purchases || [];
        const today = new Date();
        const todayString = today.toDateString();

        const purchasesDueToday = allPurchases.filter((purchase) => {
          const pendingAmount = purchase.payment?.pendingAmount || 0;
          const dueDate = purchase.payment?.dueDate;

          if (!dueDate || pendingAmount <= 0) return false;

          const due = new Date(dueDate);
          return due.toDateString() === todayString;
        });

        return {
          success: true,
          data: purchasesDueToday,
          message: `Found ${purchasesDueToday.length} purchases due today (client-side filtered)`,
        };
      } catch (fallbackError) {
        return {
          success: false,
          message: "Unable to fetch purchases due today",
          data: [],
        };
      }
    }
  }

  async getPaymentSummaryWithOverdue(companyId, dateFrom, dateTo) {
    this.validateCompanyId(companyId);

    const queryParams = new URLSearchParams({
      companyId,
      ...(dateFrom && {dateFrom: this.formatDateForAPI(dateFrom)}),
      ...(dateTo && {dateTo: this.formatDateForAPI(dateTo)}),
    });

    try {
      return await this.apiCall(
        `/purchases/payment-summary-overdue?${queryParams}`
      );
    } catch (error) {
      return await this.getEnhancedPaymentSummary(companyId, {
        dateFrom: dateFrom,
        dateTo: dateTo,
      });
    }
  }

  async updatePaymentDueDate(purchaseId, dueDate, creditDays) {
    return await this.apiCall(`/purchases/${purchaseId}/due-date`, {
      method: "PUT",
      body: JSON.stringify({
        dueDate: dueDate,
        creditDays: creditDays,
      }),
    });
  }

  // ✅ Enhanced transform method with employee tracking
  transformToBackendFormat(purchaseData) {
    const supplierName =
      purchaseData.supplier?.name ||
      purchaseData.supplierData?.name ||
      purchaseData.partyName ||
      "Cash Supplier";

    const supplierMobile =
      purchaseData.supplier?.mobile ||
      purchaseData.supplier?.phone ||
      purchaseData.supplierData?.phone ||
      purchaseData.mobileNumber ||
      "";

    const globalTaxMode =
      purchaseData.globalTaxMode ||
      purchaseData.taxMode ||
      (purchaseData.priceIncludesTax ? "with-tax" : "without-tax") ||
      "without-tax";

    const priceIncludesTax = globalTaxMode === "with-tax";

    const paymentInfo = purchaseData.paymentInfo || {};

    const paymentMade = parseFloat(
      purchaseData.paymentReceived ||
        paymentInfo.amount ||
        purchaseData.payment?.paidAmount ||
        purchaseData.amount ||
        0
    );

    const finalTotal = parseFloat(purchaseData.totals?.finalTotal || 0);
    const pendingAmount = Math.max(0, finalTotal - paymentMade);

    const paymentMethod =
      paymentInfo.method ||
      paymentInfo.paymentMethod ||
      purchaseData.payment?.method ||
      purchaseData.paymentMethod ||
      "cash";

    const bankAccountId =
      purchaseData.bankAccountId ||
      paymentInfo.bankAccountId ||
      purchaseData.payment?.bankAccountId ||
      null;

    let dueDate = null;
    let creditDays = 0;

    if (purchaseData.dueDate) {
      dueDate = new Date(purchaseData.dueDate).toISOString();
    } else if (paymentInfo.dueDate) {
      dueDate = new Date(paymentInfo.dueDate).toISOString();
    } else if (purchaseData.payment?.dueDate) {
      dueDate = new Date(purchaseData.payment.dueDate).toISOString();
    }

    const explicitCreditDays = parseInt(
      purchaseData.creditDays ||
        paymentInfo.creditDays ||
        purchaseData.payment?.creditDays ||
        0
    );

    if (explicitCreditDays > 0) {
      creditDays = explicitCreditDays;
      if (!dueDate) {
        const calculatedDueDate = new Date();
        calculatedDueDate.setDate(calculatedDueDate.getDate() + creditDays);
        dueDate = calculatedDueDate.toISOString();
      }
    }

    if (!dueDate && paymentInfo.notes) {
      const notesText = paymentInfo.notes.toLowerCase();

      const datePatterns = [
        /(?:pay|due|payment|paid).*?(?:on|by)\s*(?:the\s*)?(\d{1,2})(?:th|st|nd|rd)?/i,
        /(\d{1,2})(?:th|st|nd|rd)?\s*(?:date|day|of)/i,
        /(\d{1,2})\s*(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)/i,
        /(?:remaining|balance|rest).*?(\d{1,2})/i,
      ];

      let foundDate = false;
      for (const [index, pattern] of datePatterns.entries()) {
        const match = paymentInfo.notes.match(pattern);
        if (match) {
          const dayNumber = parseInt(match[1]);

          if (dayNumber >= 1 && dayNumber <= 31) {
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const currentDay = today.getDate();

            let calculatedDueDate = new Date(
              currentYear,
              currentMonth,
              dayNumber
            );

            if (dayNumber <= currentDay) {
              calculatedDueDate = new Date(
                currentYear,
                currentMonth + 1,
                dayNumber
              );
            }

            dueDate = calculatedDueDate.toISOString();
            creditDays = Math.max(
              1,
              Math.ceil((calculatedDueDate - today) / (1000 * 60 * 60 * 24))
            );

            foundDate = true;
            break;
          }
        }
      }
    }

    if (!dueDate && pendingAmount > 0 && paymentMade > 0) {
      creditDays = 30;
      const calculatedDueDate = new Date();
      calculatedDueDate.setDate(calculatedDueDate.getDate() + creditDays);
      dueDate = calculatedDueDate.toISOString();
    }

    const chequeNumber =
      purchaseData.chequeNumber ||
      paymentInfo.chequeNumber ||
      purchaseData.payment?.chequeNumber ||
      "";

    const chequeDate =
      purchaseData.chequeDate ||
      paymentInfo.chequeDate ||
      purchaseData.payment?.chequeDate ||
      null;

    const transactionId =
      purchaseData.transactionId ||
      paymentInfo.transactionId ||
      paymentInfo.upiTransactionId ||
      paymentInfo.bankTransactionId ||
      purchaseData.payment?.transactionId ||
      "";

    const paymentNotes =
      paymentInfo.notes ||
      purchaseData.notes ||
      purchaseData.payment?.notes ||
      "";

    const processedItems = (purchaseData.items || [])
      .filter(
        (item) =>
          item.itemName &&
          parseFloat(item.quantity) > 0 &&
          parseFloat(item.pricePerUnit) >= 0
      )
      .map((item, index) => {
        const itemTaxMode = item.taxMode || item.itemTaxMode || globalTaxMode;

        const itemPriceIncludesTax = itemTaxMode === "with-tax";

        return {
          itemRef: item.itemRef || item._id || item.id || null,
          itemName: item.itemName || item.name,
          hsnCode: item.hsnCode || item.hsnNumber || "0000",
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit || "PCS",
          pricePerUnit: parseFloat(item.pricePerUnit) || 0,
          taxRate:
            parseFloat(item.taxRate || item.gstRate) ||
            (itemPriceIncludesTax ? 18 : 0),
          priceIncludesTax: itemPriceIncludesTax,
          taxMode: itemTaxMode,
          discountPercent: parseFloat(item.discountPercent) || 0,
          discountAmount: parseFloat(item.discountAmount) || 0,
          cgst: parseFloat(item.cgstAmount || item.cgst) || 0,
          sgst: parseFloat(item.sgstAmount || item.sgst) || 0,
          igst: parseFloat(item.igstAmount || item.igst) || 0,
          itemAmount: parseFloat(item.amount || item.itemAmount) || 0,
          lineNumber: item.lineNumber || index + 1,
        };
      });

    const transformedData = {
      purchaseNumber: purchaseData.purchaseNumber,
      purchaseDate: purchaseData.purchaseDate || new Date().toISOString(),
      purchaseType: purchaseData.gstEnabled ? "gst" : "non-gst",
      gstEnabled: purchaseData.gstEnabled || false,
      priceIncludesTax: priceIncludesTax,
      companyId: purchaseData.companyId,

      supplierName: supplierName,
      supplierMobile: supplierMobile,
      supplier: purchaseData.supplier?.id || purchaseData.supplierId || null,

      items: processedItems,

      payment: {
        method: paymentMethod,
        status: this.calculatePaymentStatus(paymentMade, finalTotal),
        paidAmount: paymentMade,
        pendingAmount: pendingAmount,
        paymentDate:
          paymentInfo.paymentDate ||
          purchaseData.paymentDate ||
          purchaseData.payment?.paymentDate ||
          new Date().toISOString(),
        dueDate: dueDate,
        creditDays: creditDays,
        reference:
          paymentInfo.reference ||
          purchaseData.paymentReference ||
          purchaseData.payment?.reference ||
          transactionId ||
          chequeNumber ||
          "",
        notes: paymentNotes,
        chequeNumber: chequeNumber,
        chequeDate: chequeDate,
        bankTransactionId: transactionId,
        upiTransactionId: transactionId,
        bankAccountId: bankAccountId,
      },

      totals: {
        subtotal: parseFloat(purchaseData.totals?.subtotal) || 0,
        totalDiscount:
          parseFloat(
            purchaseData.totals?.totalDiscountAmount ||
              purchaseData.totals?.totalDiscount
          ) || 0,
        totalTax:
          parseFloat(
            purchaseData.totals?.totalTaxAmount || purchaseData.totals?.totalTax
          ) || 0,
        finalTotal: finalTotal,
      },

      notes: purchaseData.notes || "",
      termsAndConditions:
        purchaseData.terms || purchaseData.termsAndConditions || "",
      status: purchaseData.status || "draft",
      receivingStatus: purchaseData.receivingStatus || "pending",

      roundOff: parseFloat(purchaseData.roundOff) || 0,
      roundOffEnabled: purchaseData.roundOffEnabled || false,

      bankAccountId: bankAccountId,

      chequeNumber: chequeNumber,
      chequeDate: chequeDate ? new Date(chequeDate).toISOString() : null,
      upiTransactionId: transactionId,
      bankTransactionId: transactionId,

      globalTaxMode: globalTaxMode,
      taxModeInfo: {
        globalTaxMode,
        priceIncludesTax,
        itemCount: processedItems.length,
        itemTaxModes: processedItems.map((item) => ({
          itemName: item.itemName,
          taxMode: item.taxMode,
          priceIncludesTax: item.priceIncludesTax,
          pricePerUnit: item.pricePerUnit,
          taxRate: item.taxRate,
        })),
      },

      paymentMethod: paymentMethod,
      dueDate: dueDate,
      creditDays: creditDays,

      // ✅ Enhanced employee tracking
      employeeName: purchaseData.employeeName || "",
      employeeId: purchaseData.employeeId || "",
      createdBy: purchaseData.createdBy || null,
      lastModifiedBy: purchaseData.lastModifiedBy || null,
    };

    return transformedData;
  }

  transformToFrontendFormat(backendData) {
    const purchase = backendData.data || backendData;

    return {
      id: purchase._id || purchase.id,
      date: new Date(purchase.purchaseDate).toLocaleDateString("en-GB"),
      purchaseNo: purchase.purchaseNumber,
      partyName:
        purchase.supplier?.name || purchase.supplierName || "Unknown Supplier",
      partyPhone: purchase.supplier?.mobile || purchase.supplierMobile || "",
      transaction:
        purchase.purchaseType === "gst" ? "GST Purchase" : "Purchase",
      paymentType: this.capitalizeFirst(purchase.payment?.method || "Cash"),

      cgst: purchase.totals?.totalTax ? purchase.totals.totalTax / 2 : 0,
      sgst: purchase.totals?.totalTax ? purchase.totals.totalTax / 2 : 0,
      cgstPercent: 9,
      sgstPercent: 9,

      amount: purchase.totals?.finalTotal || 0,
      balance: purchase.payment?.pendingAmount || 0,
      subtotal: purchase.totals?.subtotal || 0,
      discount: purchase.totals?.totalDiscount || 0,

      status: this.mapPaymentStatus(purchase.payment?.status),
      purchaseStatus: this.capitalizeFirst(purchase.status),
      receivingStatus: this.capitalizeFirst(
        purchase.receivingStatus || "pending"
      ),

      dueDate: purchase.payment?.dueDate,
      creditDays: purchase.payment?.creditDays || 0,
      isOverdue: purchase.isOverdue || false,
      daysOverdue: purchase.daysOverdue || 0,

      items: purchase.items || [],
      gstEnabled: purchase.gstEnabled || false,
      priceIncludesTax: purchase.priceIncludesTax || false,
      roundOff: purchase.roundOff || 0,
      notes: purchase.notes || "",
      terms: purchase.termsAndConditions || "",

      originalPurchase: purchase,

      paymentReceived: purchase.payment?.paidAmount || 0,
      paymentMethod: purchase.payment?.method || "cash",
      paymentDate: purchase.payment?.paymentDate,
      paymentReference: purchase.payment?.reference || "",
      paymentDueDate: purchase.payment?.dueDate,
      paymentCreditDays: purchase.payment?.creditDays || 0,

      supplier: {
        id: purchase.supplier?._id || purchase.supplier?.id,
        name: purchase.supplier?.name || purchase.supplierName,
        mobile: purchase.supplier?.mobile || purchase.supplierMobile,
        email: purchase.supplier?.email || "",
        address: purchase.supplier?.address || null,
      },

      totals: {
        subtotal: purchase.totals?.subtotal || 0,
        totalDiscountAmount: purchase.totals?.totalDiscount || 0,
        totalTaxAmount: purchase.totals?.totalTax || 0,
        finalTotal: purchase.totals?.finalTotal || 0,
      },

      // ✅ Enhanced employee information
      employeeName: purchase.employeeName || "",
      employeeId: purchase.employeeId || "",
      createdBy: purchase.createdBy || null,
      lastModifiedBy: purchase.lastModifiedBy || null,
    };
  }

  calculatePaymentStatus(paidAmount, totalAmount) {
    if (paidAmount >= totalAmount) return "paid";
    if (paidAmount > 0) return "partial";
    return "pending";
  }

  mapPaymentStatus(backendStatus) {
    const statusMap = {
      paid: "Paid",
      partial: "Partial",
      pending: "Pending",
      overdue: "Overdue",
      cancelled: "Cancelled",
    };
    return statusMap[backendStatus] || "Pending";
  }

  capitalizeFirst(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  }

  formatDateForAPI(date) {
    if (!date) return null;
    if (typeof date === "string") return date.split("T")[0];
    return date.toISOString().split("T")[0];
  }

  formatDueDate(dueDate) {
    if (!dueDate) return "No due date";
    const date = new Date(dueDate);
    const today = new Date();

    if (date < today) {
      const diffTime = Math.abs(today - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `Overdue by ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    }

    return date.toLocaleDateString("en-GB");
  }

  getOverdueStatus(dueDate, pendingAmount) {
    if (!dueDate || pendingAmount <= 0)
      return {isOverdue: false, daysOverdue: 0};

    const today = new Date();
    const due = new Date(dueDate);

    if (due < today) {
      const diffTime = Math.abs(today - due);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {isOverdue: true, daysOverdue: diffDays};
    }

    return {isOverdue: false, daysOverdue: 0};
  }

  async getPurchasesSummary(companyId, dateFrom, dateTo) {
    this.validateCompanyId(companyId);

    const queryParams = new URLSearchParams({
      companyId,
      ...(dateFrom && {dateFrom: this.formatDateForAPI(dateFrom)}),
      ...(dateTo && {dateTo: this.formatDateForAPI(dateTo)}),
    });

    const response = await this.apiCall(`/purchases?${queryParams}`);

    if (response.success && response.data) {
      return {
        purchases: response.data.purchases || [],
        summary: response.data.summary || {},
        pagination: response.data.pagination || {},
      };
    }

    return {purchases: [], summary: {}, pagination: {}};
  }

  async searchPurchases(companyId, searchTerm, filters = {}) {
    this.validateCompanyId(companyId);

    const queryParams = new URLSearchParams({
      companyId,
      search: searchTerm,
      ...filters,
    });

    return await this.apiCall(`/purchases?${queryParams}`);
  }

  async getPurchasesBySupplier(companyId, supplierId, limit = 10) {
    this.validateCompanyId(companyId);

    const queryParams = new URLSearchParams({
      companyId,
      supplier: supplierId,
      limit: limit.toString(),
    });

    return await this.apiCall(`/purchases?${queryParams}`);
  }

  async getPaymentStatus(purchaseId) {
    return await this.apiCall(`/purchases/${purchaseId}/payment-status`);
  }

  async getTopItems(companyId, dateFrom, dateTo, limit = 10) {
    this.validateCompanyId(companyId);

    const queryParams = new URLSearchParams({
      companyId,
      limit: limit.toString(),
      ...(dateFrom && {dateFrom: this.formatDateForAPI(dateFrom)}),
      ...(dateTo && {dateTo: this.formatDateForAPI(dateTo)}),
    });

    return await this.apiCall(`/purchases/top-items?${queryParams}`);
  }

  async getPurchasesReport(companyId, startDate, endDate) {
    this.validateCompanyId(companyId);

    const queryParams = new URLSearchParams({
      companyId,
      startDate: this.formatDateForAPI(startDate),
      endDate: this.formatDateForAPI(endDate),
    });

    return await this.apiCall(`/purchases/report?${queryParams}`);
  }

  async getEnhancedPaymentSummary(companyId, filters = {}) {
    try {
      this.validateCompanyId(companyId);

      const purchasesResponse = await this.getPurchases(companyId, filters);

      if (!purchasesResponse.success) {
        return purchasesResponse;
      }

      const purchases = purchasesResponse.data.purchases || [];

      const summary = {
        totalPurchases: purchases.length,
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        dueTodayAmount: 0,
        paymentStatusBreakdown: {
          paid: 0,
          partial: 0,
          pending: 0,
          overdue: 0,
        },
      };

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      purchases.forEach((purchase) => {
        const amount = purchase.totals?.finalTotal || 0;
        const paid = purchase.payment?.paidAmount || 0;
        const pending = purchase.payment?.pendingAmount || 0;
        const dueDate = purchase.payment?.dueDate
          ? new Date(purchase.payment.dueDate)
          : null;
        const status = purchase.payment?.status || "pending";

        summary.totalAmount += amount;
        summary.totalPaid += paid;
        summary.totalPending += pending;

        summary.paymentStatusBreakdown[status] =
          (summary.paymentStatusBreakdown[status] || 0) + 1;

        if (dueDate && pending > 0) {
          if (dueDate < today) {
            summary.totalOverdue += pending;
            summary.overdueCount++;
          } else if (dueDate.toDateString() === today.toDateString()) {
            summary.dueTodayCount++;
            summary.dueTodayAmount += pending;
          }
        }
      });

      return {
        success: true,
        data: {
          ...purchasesResponse.data,
          enhancedSummary: summary,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: {purchases: [], summary: {}, enhancedSummary: {}},
      };
    }
  }

  async getPurchasesGroupedByStatus(companyId) {
    try {
      this.validateCompanyId(companyId);

      const purchasesResponse = await this.getPurchases(companyId);

      if (!purchasesResponse.success) {
        return purchasesResponse;
      }

      const purchases = purchasesResponse.data.purchases || [];
      const today = new Date();

      const grouped = {
        paid: [],
        partial: [],
        pending: [],
        overdue: [],
        dueToday: [],
      };

      purchases.forEach((purchase) => {
        const pending = purchase.payment?.pendingAmount || 0;
        const dueDate = purchase.payment?.dueDate
          ? new Date(purchase.payment.dueDate)
          : null;
        const status = purchase.payment?.status || "pending";

        if (dueDate && pending > 0) {
          const overdueInfo = this.getOverdueStatus(dueDate, pending);
          purchase.overdueInfo = overdueInfo;
        }

        if (status === "paid") {
          grouped.paid.push(purchase);
        } else if (dueDate && pending > 0 && dueDate < today) {
          grouped.overdue.push(purchase);
        } else if (
          dueDate &&
          pending > 0 &&
          dueDate.toDateString() === today.toDateString()
        ) {
          grouped.dueToday.push(purchase);
        } else if (status === "partial") {
          grouped.partial.push(purchase);
        } else {
          grouped.pending.push(purchase);
        }
      });

      return {
        success: true,
        data: grouped,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: {paid: [], partial: [], pending: [], overdue: [], dueToday: []},
      };
    }
  }
}

export default new PurchaseService();
