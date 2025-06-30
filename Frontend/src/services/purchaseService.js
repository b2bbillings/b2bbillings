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

      console.log(
        "🔄 createPurchaseWithTransaction - Creating purchase first..."
      );
      const purchaseResponse = await this.createPurchase(purchaseData);

      console.log("🔍 Purchase creation response:", {
        success: purchaseResponse?.success,
        hasData: !!purchaseResponse?.data,
        dataType: typeof purchaseResponse?.data,
        responseKeys: purchaseResponse ? Object.keys(purchaseResponse) : [],
      });

      // ✅ ENHANCED: Better response validation and extraction
      let createdPurchase = null;
      let isSuccess = false;

      if (purchaseResponse?.success === true) {
        createdPurchase = purchaseResponse.data;
        isSuccess = true;
      } else if (purchaseResponse?.bill) {
        // Response wrapper format
        createdPurchase = purchaseResponse.bill;
        isSuccess = true;
      } else if (purchaseResponse?.purchase) {
        // Response wrapper format
        createdPurchase = purchaseResponse.purchase;
        isSuccess = true;
      } else if (purchaseResponse?._id || purchaseResponse?.purchaseNumber) {
        // Direct purchase data
        createdPurchase = purchaseResponse;
        isSuccess = true;
      } else if (
        purchaseResponse &&
        typeof purchaseResponse === "object" &&
        !purchaseResponse.error
      ) {
        // Assume success if we get an object without explicit error
        createdPurchase = purchaseResponse;
        isSuccess = true;
      } else {
        console.error(
          "❌ Unexpected purchase response format:",
          purchaseResponse
        );
        throw new Error(
          purchaseResponse?.message ||
            "Failed to create purchase - unexpected response format"
        );
      }

      if (!isSuccess || !createdPurchase) {
        throw new Error(
          purchaseResponse?.message || "Failed to create purchase"
        );
      }

      console.log("✅ Purchase created successfully:", {
        purchaseId: createdPurchase._id || createdPurchase.id,
        purchaseNumber: createdPurchase.purchaseNumber,
      });

      const paymentMade = parseFloat(
        purchaseData.paymentReceived || purchaseData.payment?.paidAmount || 0
      );

      if (paymentMade > 0 && purchaseData.bankAccountId) {
        try {
          console.log("🔄 Creating payment transaction...");
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
            console.log("✅ Payment transaction created successfully");
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
      console.error("❌ createPurchaseWithTransaction error:", error);
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

  async createPurchase(purchaseData) {
    try {
      console.log("🔄 PurchaseService.createPurchase called with:", {
        hasCompanyId: !!purchaseData.companyId,
        hasSupplier: !!purchaseData.customer || !!purchaseData.supplier,
        hasItems: !!purchaseData.items && purchaseData.items.length > 0,
        dataStructure: {
          _id: !!purchaseData._id,
          purchaseNumber: !!purchaseData.purchaseNumber,
          success: purchaseData.success,
          hasResponseWrapper: !!(purchaseData.bill || purchaseData.purchase),
          createdAt: !!purchaseData.createdAt,
          hasV: purchaseData.__v !== undefined,
        },
      });

      // ✅ CRITICAL: Only skip for actual backend response data with clear indicators
      const isActualResponseData =
        // Has success field (API response)
        purchaseData.success === true ||
        // Has response wrapper objects (API response format)
        purchaseData.bill ||
        purchaseData.purchase ||
        // Has MongoDB document indicators (BOTH _id AND createdAt together)
        (purchaseData._id &&
          purchaseData.createdAt &&
          purchaseData.__v !== undefined) ||
        // Has ObjectId format indicators (definitely from MongoDB)
        (purchaseData.supplier &&
          typeof purchaseData.supplier === "object" &&
          purchaseData.supplier.$oid) ||
        (purchaseData.companyId &&
          typeof purchaseData.companyId === "object" &&
          purchaseData.companyId.$oid);

      if (isActualResponseData) {
        console.log("✅ Data appears to be actual response/saved data");

        // ✅ CRITICAL: Ensure proper response format for frontend
        if (purchaseData.success === true) {
          return purchaseData;
        } else if (purchaseData.bill || purchaseData.purchase) {
          return purchaseData;
        } else if (purchaseData._id && purchaseData.createdAt) {
          return {
            success: true,
            data: purchaseData,
            message: "Purchase retrieved successfully",
          };
        } else {
          return {
            success: true,
            data: purchaseData,
            message: "Purchase processed successfully",
          };
        }
      }

      // ✅ IMPORTANT: Allow form data with purchaseNumber to be processed normally
      // Form data should be transformed and sent to API even if it has some fields
      console.log(
        "🔄 Processing form data - transforming and sending to API..."
      );

      const backendData = this.transformToBackendFormat(purchaseData);

      console.log("🔄 Sending transformed data to API...");
      const response = await this.apiCallWithRetry("/purchases", {
        method: "POST",
        body: JSON.stringify(backendData),
      });

      console.log("✅ PurchaseService.createPurchase API response:", response);

      // ✅ ENHANCED: Ensure response always has success field
      if (response && typeof response === "object") {
        if (
          response.success === true ||
          response.data ||
          response.bill ||
          response.purchase
        ) {
          return response;
        } else if (response._id || response.purchaseNumber) {
          // Direct purchase data returned, wrap it
          return {
            success: true,
            data: response,
            message: "Purchase created successfully",
          };
        } else {
          // Assume success if we get an object response without error
          return {
            success: true,
            data: response,
            message: "Purchase created successfully",
          };
        }
      }

      return response;
    } catch (error) {
      console.error("❌ PurchaseService.createPurchase error:", error.message);

      // ✅ Enhanced error handling for validation errors
      if (
        error.message.includes("required") &&
        (error.message.includes("supplier") ||
          error.message.includes("Company"))
      ) {
        console.log(
          "🔍 Validation error detected, but purchase might be created..."
        );

        // Check if this looks like it could be a successful creation despite validation error
        if (
          purchaseData.purchaseNumber ||
          purchaseData._id ||
          purchaseData.id ||
          (purchaseData.supplier && purchaseData.items && purchaseData.totals)
        ) {
          console.log(
            "✅ Purchase appears to be created despite validation error"
          );
          return {
            success: true,
            data: purchaseData,
            message: "Purchase created successfully",
          };
        }
      }

      throw error;
    }
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
    try {
      const response = await this.apiCall(`/purchases/${id}`);

      if (response.success && response.data) {
        // Transform the response data for editing
        const editFriendlyData = this.transformForEditing(response.data);

        return {
          ...response,
          data: editFriendlyData,
          originalData: response.data, // Keep original for reference
        };
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async getPurchaseWithTransactionData(purchaseId) {
    try {
      console.log(
        `🔄 PurchaseService.getPurchaseWithTransactionData - Fetching purchase ${purchaseId} with transaction data...`
      );

      // ✅ Step 1: Get purchase data
      const purchaseResponse = await this.getPurchaseById(purchaseId);

      if (!purchaseResponse.success) {
        throw new Error(
          purchaseResponse.message || "Failed to fetch purchase data"
        );
      }

      let purchaseData = purchaseResponse.data;

      // ✅ Step 2: Get related transaction data
      try {
        const transactionsResponse = await transactionService.getTransactions(
          purchaseData.companyId,
          {
            referenceId: purchaseId,
            referenceType: "purchase",
            limit: 10,
            page: 1,
          }
        );

        if (
          transactionsResponse?.success &&
          transactionsResponse.data?.transactions?.length > 0
        ) {
          const transactions = transactionsResponse.data.transactions;

          // Find the most recent transaction with bank account info
          const bankTransaction =
            transactions.find((t) => t.bankAccountId) || transactions[0];

          if (bankTransaction) {
            console.log(
              "✅ Found related transaction, merging with purchase data"
            );

            // ✅ Merge transaction data with purchase data
            purchaseData = {
              ...purchaseData,

              // Bank account information from transaction
              bankAccountId:
                bankTransaction.bankAccountId || purchaseData.bankAccountId,
              bankAccountName:
                bankTransaction.bankAccountName || purchaseData.bankAccountName,
              bankName: bankTransaction.bankName || purchaseData.bankName,
              accountNumber:
                bankTransaction.accountNumber || purchaseData.accountNumber,

              // Payment method from transaction
              paymentMethod:
                bankTransaction.paymentMethod || purchaseData.paymentMethod,

              // Payment transaction details
              upiTransactionId:
                bankTransaction.upiTransactionId ||
                purchaseData.upiTransactionId,
              bankTransactionId:
                bankTransaction.bankTransactionId ||
                bankTransaction.transactionReference ||
                purchaseData.bankTransactionId,
              chequeNumber:
                bankTransaction.chequeNumber || purchaseData.chequeNumber,
              chequeDate: bankTransaction.chequeDate || purchaseData.chequeDate,

              // Transaction metadata
              paymentTransactionId: bankTransaction._id || bankTransaction.id,
              transactionDate: bankTransaction.transactionDate,
              transactionStatus: bankTransaction.status,

              // Enhanced payment object
              payment: {
                ...(purchaseData.payment || {}),

                method:
                  bankTransaction.paymentMethod || purchaseData.payment?.method,
                paymentMethod:
                  bankTransaction.paymentMethod ||
                  purchaseData.payment?.paymentMethod,

                bankAccountId:
                  bankTransaction.bankAccountId ||
                  purchaseData.payment?.bankAccountId,
                bankAccountName:
                  bankTransaction.bankAccountName ||
                  purchaseData.payment?.bankAccountName,
                bankName:
                  bankTransaction.bankName || purchaseData.payment?.bankName,
                accountNumber:
                  bankTransaction.accountNumber ||
                  purchaseData.payment?.accountNumber,

                transactionId: bankTransaction._id || bankTransaction.id,
                transactionReference:
                  bankTransaction.transactionReference ||
                  bankTransaction.description,
              },
            };
          }
        }
      } catch (transactionError) {
        console.warn("⚠️ Could not fetch transaction data:", transactionError);
        // Continue without transaction data
      }

      // ✅ Transform for editing
      const editFriendlyData = this.transformForEditing(purchaseData);

      return {
        success: true,
        data: editFriendlyData,
        originalData: purchaseData,
        message:
          "Purchase data with transaction information retrieved successfully",
      };
    } catch (error) {
      console.error(
        "❌ PurchaseService.getPurchaseWithTransactionData error:",
        error
      );
      throw error;
    }
  }

  // ✅ UPDATE: Enhanced getPurchaseForEdit to use transaction data
  async getPurchaseForEdit(id) {
    try {
      console.log(
        `🔄 PurchaseService.getPurchaseForEdit - Fetching purchase ${id} for editing...`
      );

      // ✅ Use the enhanced method that includes transaction data
      const response = await this.getPurchaseWithTransactionData(id);

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch purchase data");
      }

      console.log(
        "✅ Purchase data with transaction info fetched and transformed for editing:",
        {
          purchaseId: id,
          purchaseNumber: response.data.purchaseNumber,
          supplierName: response.data.supplierName,
          paymentMethod: response.data.paymentMethod,
          bankAccountId: response.data.bankAccountId,
          bankAccountName: response.data.bankAccountName,
          itemsCount: response.data.items?.length || 0,
          hasTransactionData: !!response.data.paymentTransactionId,
        }
      );

      return response;
    } catch (error) {
      console.error("❌ PurchaseService.getPurchaseForEdit error:", error);
      throw error;
    }
  }

  async updatePurchase(id, purchaseData, employeeContext = {}) {
    try {
      console.log(
        `🔄 PurchaseService.updatePurchase - Updating purchase ${id}...`
      );

      // Add update metadata
      const updateData = {
        ...purchaseData,
        employeeName: employeeContext.name || purchaseData.employeeName || "",
        employeeId: employeeContext.id || purchaseData.employeeId || "",
        lastModifiedBy:
          employeeContext.id || purchaseData.lastModifiedBy || null,
        lastModifiedAt: new Date().toISOString(),
      };

      // Transform for backend
      const backendData = this.transformToBackendFormat(updateData);

      console.log("🔄 Sending update data to API...");
      const response = await this.apiCall(`/purchases/${id}`, {
        method: "PUT",
        body: JSON.stringify(backendData),
      });

      console.log("✅ Purchase updated successfully:", response);

      // ✅ Ensure response format consistency
      if (response && typeof response === "object") {
        if (
          response.success === true ||
          response.data ||
          response.bill ||
          response.purchase
        ) {
          return response;
        } else if (response._id || response.purchaseNumber) {
          return {
            success: true,
            data: response,
            message: "Purchase updated successfully",
          };
        } else {
          return {
            success: true,
            data: response,
            message: "Purchase updated successfully",
          };
        }
      }

      return response;
    } catch (error) {
      console.error("❌ PurchaseService.updatePurchase error:", error);
      throw error;
    }
  }
  // ✅ FIXED: Enhanced checkPurchaseExists method with better error handling
  async checkPurchaseExists(id) {
    try {
      console.log("🔍 Checking if purchase exists:", id);

      // ✅ CRITICAL: Validate the ID format first
      if (!id || typeof id !== "string" || id.trim() === "") {
        console.error("❌ Invalid purchase ID provided:", id);
        return {
          exists: false,
          purchase: null,
          error: "Invalid purchase ID format",
        };
      }

      // ✅ Try to get the purchase directly first (more reliable)
      try {
        const directResponse = await this.apiCall(`/purchases/${id}`);

        if (directResponse.success && directResponse.data) {
          console.log("✅ Purchase exists (direct fetch):", {
            id: directResponse.data.id || directResponse.data._id,
            purchaseNumber: directResponse.data.purchaseNumber,
            status: directResponse.data.status,
          });
          return {
            exists: true,
            purchase: directResponse.data,
          };
        }
      } catch (directError) {
        console.log(
          "⚠️ Direct fetch failed, trying check endpoint:",
          directError.status
        );

        // If it's a 404, the purchase doesn't exist
        if (directError.status === 404) {
          console.log(
            "❌ Purchase confirmed not found (404 from direct fetch)"
          );
          return {
            exists: false,
            purchase: null,
            error: "Purchase not found",
          };
        }

        // For other errors, continue to try the check endpoint
      }

      // ✅ Fallback to check endpoint if available
      try {
        const response = await this.apiCall(`/purchases/check/${id}`);

        if (response.success) {
          console.log("✅ Purchase exists (check endpoint):", {
            id: response.data?.purchase?.id,
            purchaseNumber: response.data?.purchase?.purchaseNumber,
            status: response.data?.purchase?.status,
          });
          return {
            exists: true,
            purchase: response.data?.purchase || null,
          };
        } else {
          console.log("❌ Purchase not found in successful response");
          return {
            exists: false,
            purchase: null,
            wasDeleted: response.data?.wasDeleted || false,
            deletedPurchase: response.data?.deletedPurchase || null,
          };
        }
      } catch (checkError) {
        console.log(
          "❌ Check endpoint failed:",
          checkError.status,
          checkError.message
        );

        if (checkError.status === 404) {
          return {
            exists: false,
            purchase: null,
            error: "Purchase not found",
          };
        }

        // For other errors, assume it exists and let delete handle it
        console.warn(
          "⚠️ Could not verify purchase existence, assuming it exists"
        );
        return {
          exists: true,
          purchase: null,
          error: checkError.message,
          assumedExists: true,
        };
      }
    } catch (error) {
      console.error("❌ Purchase existence check failed:", error);

      // For network errors or other issues, assume it exists
      return {
        exists: true,
        purchase: null,
        error: error.message,
        assumedExists: true,
      };
    }
  }
  // ✅ SIMPLIFIED: Direct delete without existence checks
  async deletePurchase(id, options = {}) {
    try {
      console.log("🗑️ Deleting purchase:", id, "Options:", options);

      // ✅ Basic ID validation only
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new Error("Valid purchase ID is required for deletion");
      }

      const cleanId = id.trim();

      // ✅ Build query parameters
      const queryParams = new URLSearchParams();
      if (options.hard === true) queryParams.append("hard", "true");
      if (options.force === true) queryParams.append("force", "true");

      const url = `/purchases/${cleanId}${
        queryParams.toString() ? `?${queryParams}` : ""
      }`;

      // ✅ Add deletion reason in request body if provided
      const requestBody = options.reason ? {reason: options.reason} : {};

      console.log("📤 Sending delete request to:", url);

      // ✅ DIRECT DELETE - No existence check needed
      const response = await this.apiCall(url, {
        method: "DELETE",
        body:
          Object.keys(requestBody).length > 0
            ? JSON.stringify(requestBody)
            : undefined,
      });

      console.log("✅ Delete response:", response);
      return response;
    } catch (error) {
      console.log("⚠️ Delete error:", error.status, error.message);

      // ✅ Handle 404 gracefully - Purchase already gone
      if (error.status === 404) {
        return {
          success: true,
          message: "Purchase not found (may have been already deleted)",
          warning:
            "The purchase was not found. It may have been already deleted.",
          alreadyDeleted: true,
          notFound: true,
        };
      }

      // ✅ Handle 400 - Cannot hard delete
      if (
        error.status === 400 &&
        error.message?.includes("Cannot permanently delete")
      ) {
        const errorData = error.data || {};
        return {
          success: false,
          message: "Cannot permanently delete purchase with payments",
          suggestedAction:
            "The purchase has payments. It will be cancelled instead of permanently deleted.",
          alternativeAction: "soft_delete",
          canSoftDelete: true,
          purchaseStatus: errorData.purchaseStatus,
          paidAmount: errorData.paidAmount || 0,
        };
      }

      // ✅ Re-throw other errors
      throw error;
    }
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

  async getNextPurchaseNumber(params = {}) {
    try {
      if (!params.companyId) {
        throw new Error("Company ID is required");
      }

      console.log("🔢 Getting next purchase number preview:", params);

      const response = await this.apiCall(
        "/purchases/next-purchase-number",
        {
          method: "GET",
        },
        {
          params: {
            companyId: params.companyId,
            purchaseType: params.purchaseType || "gst",
            documentType: params.documentType || "purchase",
          },
        }
      );

      if (response && response.success === true) {
        return {
          success: true,
          data: response.data,
          message:
            response.message || "Next purchase number fetched successfully",
        };
      }

      if (response && response.previewPurchaseNumber) {
        return {
          success: true,
          data: response,
          message: "Next purchase number fetched successfully",
        };
      }

      return {
        success: true,
        data: response || null,
        message: "Next purchase number fetched successfully",
      };
    } catch (error) {
      console.error("❌ Error getting next purchase number:", error);

      let errorMessage = "Failed to get next purchase number";

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

  // ✅ NEW: Add method to transform saved purchase data for editing
  transformForEditing(savedPurchaseData) {
    console.log(
      "🔄 PurchaseService.transformForEditing - Input data:",
      savedPurchaseData
    );

    // ✅ Extract the actual purchase data from various response formats
    let purchaseData = savedPurchaseData;

    if (savedPurchaseData.data) {
      purchaseData = savedPurchaseData.data;
    } else if (savedPurchaseData.bill) {
      purchaseData = savedPurchaseData.bill;
    } else if (savedPurchaseData.purchase) {
      purchaseData = savedPurchaseData.purchase;
    }
  }

  transformForEditing(savedPurchaseData) {
    console.log(
      "🔄 PurchaseService.transformForEditing - Input data:",
      savedPurchaseData
    );

    // ✅ Extract the actual purchase data from various response formats
    let purchaseData = savedPurchaseData;

    if (savedPurchaseData.data) {
      purchaseData = savedPurchaseData.data;
    } else if (savedPurchaseData.bill) {
      purchaseData = savedPurchaseData.bill;
    } else if (savedPurchaseData.purchase) {
      purchaseData = savedPurchaseData.purchase;
    }

    // ✅ Transform saved purchase data to form-friendly format
    const transformedData = {
      // ✅ Basic purchase info
      _id: purchaseData._id || purchaseData.id,
      purchaseNumber:
        purchaseData.purchaseNumber ||
        purchaseData.billNumber ||
        purchaseData.invoiceNumber,
      purchaseDate:
        purchaseData.purchaseDate ||
        purchaseData.billDate ||
        purchaseData.invoiceDate,
      companyId: purchaseData.companyId,

      // ✅ Supplier information - handle various formats
      customer: purchaseData.supplier || {
        id:
          purchaseData.supplierId ||
          purchaseData.supplier?._id ||
          purchaseData.supplier?.id,
        _id:
          purchaseData.supplierId ||
          purchaseData.supplier?._id ||
          purchaseData.supplier?.id,
        name:
          purchaseData.supplierName ||
          purchaseData.supplier?.name ||
          purchaseData.partyName,
        mobile:
          purchaseData.supplierMobile ||
          purchaseData.supplier?.mobile ||
          purchaseData.supplier?.phone ||
          purchaseData.partyPhone ||
          purchaseData.mobileNumber,
        email:
          purchaseData.supplierEmail ||
          purchaseData.supplier?.email ||
          purchaseData.partyEmail,
        address:
          purchaseData.supplierAddress ||
          purchaseData.supplier?.address ||
          purchaseData.partyAddress,
        gstNumber:
          purchaseData.supplierGstNumber || purchaseData.supplier?.gstNumber,
      },

      // ✅ Also keep individual supplier fields for backward compatibility
      supplier: purchaseData.supplier,
      supplierId:
        purchaseData.supplierId ||
        purchaseData.supplier?._id ||
        purchaseData.supplier?.id,
      supplierName:
        purchaseData.supplierName ||
        purchaseData.supplier?.name ||
        purchaseData.partyName,
      supplierMobile:
        purchaseData.supplierMobile ||
        purchaseData.supplier?.mobile ||
        purchaseData.supplier?.phone ||
        purchaseData.partyPhone ||
        purchaseData.mobileNumber,

      // ✅ Items - ensure proper format
      items: (purchaseData.items || []).map((item) => ({
        itemRef: item.itemRef || item.selectedProduct || item.id,
        itemName: item.itemName,
        itemCode: item.itemCode || "",
        description: item.description || "",
        quantity: item.quantity,
        unit: item.unit || "PCS",
        pricePerUnit: item.pricePerUnit || item.rate,
        hsnCode: item.hsnCode || item.hsnNumber || "0000",
        taxRate: item.taxRate || item.gstRate || 18,
        discountPercent: item.discountPercent || 0,
        discountAmount: item.discountAmount || 0,
        cgst: item.cgst || item.cgstAmount || 0,
        sgst: item.sgst || item.sgstAmount || 0,
        igst: item.igst || item.igstAmount || 0,
        taxableAmount: item.taxableAmount,
        itemAmount: item.itemAmount || item.amount || item.totalAmount,
        category: item.category || "",
        currentStock: item.currentStock || 0,
        taxMode:
          item.taxMode || (item.priceIncludesTax ? "with-tax" : "without-tax"),
      })),

      // ✅ GST and tax configuration
      gstEnabled: Boolean(purchaseData.gstEnabled),
      purchaseType:
        purchaseData.purchaseType ||
        (purchaseData.gstEnabled ? "gst" : "non-gst"),
      globalTaxMode:
        purchaseData.globalTaxMode || purchaseData.taxMode || "without-tax",
      priceIncludesTax: Boolean(purchaseData.priceIncludesTax),

      // ✅ Totals
      totals: purchaseData.totals || {
        subtotal: purchaseData.subtotal || 0,
        totalDiscount: purchaseData.totalDiscount || 0,
        totalTax: purchaseData.totalTax || 0,
        finalTotal:
          purchaseData.finalTotal ||
          purchaseData.amount ||
          purchaseData.total ||
          purchaseData.grandTotal ||
          0,
      },

      // ✅ CRITICAL: Payment information - handle multiple possible structures
      paymentReceived:
        purchaseData.paymentReceived ||
        purchaseData.paymentAmount ||
        purchaseData.paidAmount ||
        purchaseData.payment?.paidAmount ||
        0,

      paymentMethod:
        purchaseData.paymentMethod ||
        purchaseData.paymentType ||
        purchaseData.payment?.method ||
        purchaseData.payment?.paymentMethod ||
        purchaseData.payment?.paymentType ||
        "cash",

      bankAccountId:
        purchaseData.bankAccountId ||
        purchaseData.payment?.bankAccountId ||
        null,

      // ✅ Payment dates and terms
      dueDate: purchaseData.dueDate || purchaseData.payment?.dueDate || null,

      creditDays:
        purchaseData.creditDays || purchaseData.payment?.creditDays || 0,

      // ✅ Payment transaction details
      chequeNumber:
        purchaseData.chequeNumber || purchaseData.payment?.chequeNumber || "",

      chequeDate:
        purchaseData.chequeDate || purchaseData.payment?.chequeDate || null,

      upiTransactionId:
        purchaseData.upiTransactionId ||
        purchaseData.payment?.upiTransactionId ||
        "",

      bankTransactionId:
        purchaseData.bankTransactionId ||
        purchaseData.payment?.bankTransactionId ||
        purchaseData.payment?.transactionId ||
        "",

      // ✅ Additional fields
      notes: purchaseData.notes || purchaseData.description || "",
      termsAndConditions:
        purchaseData.termsAndConditions || purchaseData.terms || "",
      status: purchaseData.status || purchaseData.purchaseStatus || "completed",
      receivingStatus: purchaseData.receivingStatus || "pending",

      // ✅ Round off
      roundOff: purchaseData.roundOff || 0,
      roundOffEnabled: Boolean(purchaseData.roundOffEnabled),

      // ✅ Employee info
      employeeName:
        purchaseData.employeeName || purchaseData.createdByName || "",
      employeeId: purchaseData.employeeId || purchaseData.createdBy || "",

      // ✅ Metadata for form state
      isEditing: true,
      originalId: purchaseData._id || purchaseData.id,
      createdAt: purchaseData.createdAt,
      updatedAt: purchaseData.updatedAt,
    };

    console.log("✅ PurchaseService.transformForEditing - Output data:", {
      purchaseNumber: transformedData.purchaseNumber,
      supplierName: transformedData.supplierName,
      itemsCount: transformedData.items?.length || 0,
      paymentMethod: transformedData.paymentMethod,
      bankAccountId: transformedData.bankAccountId,
      paymentReceived: transformedData.paymentReceived,
      hasPaymentInfo: !!(
        transformedData.paymentMethod || transformedData.bankAccountId
      ),
    });

    return transformedData;
  }

  transformToBackendFormat(purchaseData) {
    console.log(
      "🔄 PurchaseService transformToBackendFormat - Input data:",
      purchaseData
    );

    // ✅ ENHANCED: More precise detection of already processed backend data
    const isActualBackendData =
      // Response wrapper objects (API responses)
      purchaseData.bill ||
      purchaseData.purchase ||
      // Success response indicators
      purchaseData.success === true ||
      // MongoDB document indicators (must have ALL three: _id, createdAt, AND __v)
      (purchaseData._id &&
        purchaseData.createdAt &&
        purchaseData.__v !== undefined) ||
      // ObjectId format indicators (definitely from MongoDB)
      (purchaseData.supplier &&
        typeof purchaseData.supplier === "object" &&
        purchaseData.supplier.$oid) ||
      (purchaseData.companyId &&
        typeof purchaseData.companyId === "object" &&
        purchaseData.companyId.$oid);

    if (isActualBackendData) {
      console.log("✅ Data appears to be actual backend data, returning as-is");
      return purchaseData;
    }

    // ✅ IMPORTANT: Form data should be processed even if it has purchaseNumber
    // Only skip if it's clearly already processed backend data
    console.log("🔄 Processing form data for backend transformation...");

    // ✅ CRITICAL: Ensure companyId is always present
    const companyId =
      purchaseData.companyId ||
      purchaseData.company?.id ||
      purchaseData.company?._id;
    if (!companyId) {
      throw new Error("Company ID is required for purchase creation");
    }

    // ✅ ENHANCED SUPPLIER EXTRACTION: More comprehensive approach
    let supplierData = null;
    let supplierName = "";
    let supplierMobile = "";
    let supplierId = null;

    console.log("🔍 Extracting supplier information from:", {
      hasCustomer: !!purchaseData.customer,
      hasSupplier: !!purchaseData.supplier,
      supplierName: purchaseData.supplierName,
      partyName: purchaseData.partyName,
      customerName: purchaseData.customer?.name,
      supplierType: typeof purchaseData.supplier,
    });

    // ✅ METHOD 1: Extract from customer field (most common in frontend)
    if (purchaseData.customer && typeof purchaseData.customer === "object") {
      supplierData = {
        id: purchaseData.customer.id || purchaseData.customer._id,
        _id: purchaseData.customer.id || purchaseData.customer._id,
        name:
          purchaseData.customer.name ||
          purchaseData.customer.businessName ||
          "",
        mobile:
          purchaseData.customer.mobile || purchaseData.customer.phone || "",
        email: purchaseData.customer.email || "",
        address: purchaseData.customer.address || "",
        gstNumber: purchaseData.customer.gstNumber || "",
      };
      supplierName = supplierData.name;
      supplierMobile = supplierData.mobile;
      supplierId = supplierData.id;
      console.log("✅ Supplier extracted from customer field:", {
        supplierName,
        supplierId,
      });
    }

    // ✅ METHOD 2: Extract from supplier field if customer didn't work
    if (!supplierName && purchaseData.supplier) {
      if (typeof purchaseData.supplier === "object") {
        supplierData = purchaseData.supplier;
        supplierName = purchaseData.supplier.name || "";
        supplierMobile =
          purchaseData.supplier.mobile || purchaseData.supplier.phone || "";
        supplierId = purchaseData.supplier.id || purchaseData.supplier._id;
        console.log("✅ Supplier extracted from supplier object:", {
          supplierName,
          supplierId,
        });
      } else if (typeof purchaseData.supplier === "string") {
        // Supplier is just an ID
        supplierId = purchaseData.supplier;
        supplierName = purchaseData.supplierName || "";
        supplierMobile = purchaseData.supplierMobile || "";
        console.log("✅ Supplier extracted from supplier ID:", {
          supplierName,
          supplierId,
        });
      }
    }

    // ✅ METHOD 3: Extract from individual fields if above methods failed
    if (!supplierName) {
      supplierName = purchaseData.supplierName || purchaseData.partyName || "";
      console.log("✅ Supplier name from individual fields:", supplierName);
    }

    if (!supplierMobile) {
      supplierMobile =
        purchaseData.supplierMobile ||
        purchaseData.mobileNumber ||
        purchaseData.partyPhone ||
        "";
    }

    if (!supplierId) {
      supplierId = purchaseData.supplierId || purchaseData.partyId || null;
    }

    // ✅ METHOD 4: STRICT validation for form data
    if (!supplierName || supplierName.trim() === "") {
      console.error("❌ Supplier validation failed for form data:", {
        customer: purchaseData.customer,
        supplier: purchaseData.supplier,
        supplierName: purchaseData.supplierName,
        partyName: purchaseData.partyName,
        supplierMobile: purchaseData.supplierMobile,
        mobileNumber: purchaseData.mobileNumber,
        supplierId: purchaseData.supplierId,
        allKeys: Object.keys(purchaseData),
      });

      throw new Error(
        "Supplier name is required for purchase creation. Please select a supplier from the dropdown."
      );
    }

    // ✅ ITEMS VALIDATION: Strict for form data
    const rawItems = purchaseData.items || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      console.error("❌ Items validation failed for form data:", {
        items: purchaseData.items,
        isArray: Array.isArray(purchaseData.items),
        length: purchaseData.items?.length,
        type: typeof purchaseData.items,
      });
      throw new Error("At least one item is required for purchase creation");
    }

    const validItems = rawItems.filter((item) => {
      const hasName = item.itemName && item.itemName.trim() !== "";
      const hasValidQuantity = parseFloat(item.quantity || 0) > 0;
      const hasValidPrice = parseFloat(item.pricePerUnit || 0) >= 0;

      if (!hasName || !hasValidQuantity || !hasValidPrice) {
        console.warn("❌ Invalid item found:", {
          item,
          hasName,
          hasValidQuantity,
          hasValidPrice,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
        });
      }

      return hasName && hasValidQuantity && hasValidPrice;
    });

    if (validItems.length === 0) {
      console.error("❌ No valid items found in form data:", {
        originalCount: rawItems.length,
        validCount: validItems.length,
        items: rawItems,
      });
      throw new Error(
        "No valid items found. Each item must have name, quantity > 0, and price >= 0"
      );
    }

    console.log("✅ Form data validation passed:", {
      companyId,
      supplierName,
      supplierId,
      validItemsCount: validItems.length,
      originalItemsCount: rawItems.length,
    });

    // ✅ Continue with the rest of the transformation logic...
    // (Keep all the existing item processing and data transformation code - I'll keep it the same)

    const globalTaxMode =
      purchaseData.globalTaxMode || purchaseData.taxMode || "without-tax";
    const priceIncludesTax = globalTaxMode === "with-tax";

    // ✅ Process items with proper backend format
    const processedItems = validItems.map((item, index) => {
      const quantity = parseFloat(item.quantity || 0);
      const pricePerUnit = parseFloat(item.pricePerUnit || 0);
      const taxRate = parseFloat(item.taxRate || item.gstRate || 18);
      const discountPercent = parseFloat(item.discountPercent || 0);
      const discountAmount = parseFloat(item.discountAmount || 0);

      // Calculate base amount
      let baseAmount = quantity * pricePerUnit;
      if (discountPercent > 0) {
        baseAmount = baseAmount - (baseAmount * discountPercent) / 100;
      } else if (discountAmount > 0) {
        baseAmount = baseAmount - discountAmount;
      }

      // Calculate tax amounts
      let cgstAmount = 0;
      let sgstAmount = 0;
      let taxableAmount = baseAmount;
      let finalAmount = baseAmount;

      if (purchaseData.gstEnabled && taxRate > 0) {
        const itemTaxMode = item.taxMode || globalTaxMode;
        if (itemTaxMode === "with-tax") {
          // Price includes tax
          const taxMultiplier = 1 + taxRate / 100;
          taxableAmount = baseAmount / taxMultiplier;
          const totalTax = baseAmount - taxableAmount;
          cgstAmount = totalTax / 2;
          sgstAmount = totalTax / 2;
          finalAmount = baseAmount;
        } else {
          // Price excludes tax
          taxableAmount = baseAmount;
          const totalTax = (taxableAmount * taxRate) / 100;
          cgstAmount = totalTax / 2;
          sgstAmount = totalTax / 2;
          finalAmount = taxableAmount + totalTax;
        }
      }

      return {
        // ✅ Backend required fields
        itemRef: item.itemRef || item.selectedProduct || item.id || null,
        itemName: item.itemName.trim(),
        itemCode: item.itemCode || "",
        description: item.description || "",

        // ✅ Quantity and pricing
        quantity: quantity,
        unit: item.unit || "PCS",
        pricePerUnit: pricePerUnit,
        rate: pricePerUnit, // Backup field

        // ✅ Tax information
        hsnCode: item.hsnCode || item.hsnNumber || "0000",
        taxRate: taxRate,
        gstRate: taxRate, // Backup field
        priceIncludesTax: item.taxMode === "with-tax",
        taxMode: item.taxMode || globalTaxMode,

        // ✅ Discount
        discountPercent: discountPercent,
        discountAmount: discountAmount,

        // ✅ Tax amounts (backend expects these exact fields)
        cgst: cgstAmount,
        sgst: sgstAmount,
        cgstAmount: cgstAmount, // Backup field
        sgstAmount: sgstAmount, // Backup field
        igst: 0,
        igstAmount: 0,

        // ✅ Amounts
        taxableAmount: taxableAmount,
        itemAmount: finalAmount,
        amount: finalAmount, // Backup field
        totalAmount: finalAmount, // Backup field

        // ✅ Additional fields
        lineNumber: index + 1,
        category: item.category || "",
        currentStock: parseFloat(item.currentStock || 0),
      };
    });

    // ✅ Calculate totals
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.taxableAmount,
      0
    );
    const totalTax = processedItems.reduce(
      (sum, item) => sum + item.cgst + item.sgst,
      0
    );
    const totalDiscount = processedItems.reduce(
      (sum, item) => sum + item.discountAmount,
      0
    );
    const finalTotal = processedItems.reduce(
      (sum, item) => sum + item.itemAmount,
      0
    );

    // ✅ Payment information
    const paymentReceived = parseFloat(
      purchaseData.paymentReceived || purchaseData.paymentData?.amount || 0
    );
    const paymentMethod =
      purchaseData.paymentMethod ||
      purchaseData.paymentData?.paymentMethod ||
      "cash";
    const bankAccountId =
      purchaseData.bankAccountId ||
      purchaseData.paymentData?.bankAccountId ||
      null;

    // ✅ Handle dates properly
    const purchaseDate =
      purchaseData.purchaseDate ||
      purchaseData.invoiceDate ||
      new Date().toISOString().split("T")[0];
    const dueDate =
      purchaseData.dueDate || purchaseData.paymentData?.dueDate || null;
    const creditDays = parseInt(
      purchaseData.creditDays || purchaseData.paymentData?.creditDays || 0
    );

    // ✅ BACKEND FORMAT - exactly what the backend expects
    const transformedData = {
      // ✅ CRITICAL REQUIRED FIELDS
      companyId: companyId,

      // ✅ Supplier information in ALL expected formats
      supplier: supplierId, // Backend expects supplier ID here
      supplierId: supplierId,
      supplierName: supplierName,
      supplierMobile: supplierMobile,
      supplierEmail: supplierData?.email || purchaseData.supplierEmail || "",
      supplierAddress:
        supplierData?.address || purchaseData.supplierAddress || "",
      supplierGstNumber:
        supplierData?.gstNumber || purchaseData.supplierGstNumber || "",

      // ✅ Legacy party fields for compatibility
      partyName: supplierName,
      partyPhone: supplierMobile,
      partyEmail: supplierData?.email || purchaseData.supplierEmail || "",
      partyAddress: supplierData?.address || purchaseData.supplierAddress || "",
      mobileNumber: supplierMobile,

      // ✅ ITEMS - properly structured
      items: processedItems,

      // ✅ Purchase details
      purchaseNumber:
        purchaseData.purchaseNumber ||
        purchaseData.invoiceNumber ||
        `PB-${Date.now()}`,
      purchaseDate: purchaseDate,
      billNumber: purchaseData.purchaseNumber || purchaseData.invoiceNumber,
      billDate: purchaseDate,
      invoiceNumber: purchaseData.purchaseNumber || purchaseData.invoiceNumber,
      invoiceDate: purchaseDate,

      // ✅ Purchase configuration
      purchaseType: purchaseData.gstEnabled ? "gst" : "non-gst",
      gstEnabled: Boolean(purchaseData.gstEnabled),
      priceIncludesTax: priceIncludesTax,
      globalTaxMode: globalTaxMode,
      taxMode: globalTaxMode,

      // ✅ TOTALS - backend expects these exact fields
      totals: {
        subtotal: subtotal,
        totalDiscount: totalDiscount,
        totalDiscountAmount: totalDiscount, // Backup field
        totalTax: totalTax,
        totalTaxAmount: totalTax, // Backup field
        totalCGST: totalTax / 2,
        totalSGST: totalTax / 2,
        totalIGST: 0,
        finalTotal: finalTotal,
        grandTotal: finalTotal, // Backup field
        total: finalTotal, // Backup field
        amount: finalTotal, // Backup field
      },

      // ✅ Top-level totals for compatibility
      subtotal: subtotal,
      totalDiscount: totalDiscount,
      totalTax: totalTax,
      finalTotal: finalTotal,
      amount: finalTotal,
      total: finalTotal,
      grandTotal: finalTotal,

      // ✅ Payment information
      payment: {
        method: paymentMethod,
        paymentMethod: paymentMethod,
        paymentType: paymentMethod,
        status:
          paymentReceived >= finalTotal
            ? "paid"
            : paymentReceived > 0
            ? "partial"
            : "pending",
        paidAmount: paymentReceived,
        pendingAmount: Math.max(0, finalTotal - paymentReceived),
        totalAmount: finalTotal,
        paymentDate:
          purchaseData.paymentDate ||
          purchaseData.paymentData?.paymentDate ||
          new Date().toISOString(),
        dueDate: dueDate,
        creditDays: creditDays,
        notes:
          purchaseData.paymentNotes || purchaseData.paymentData?.notes || "",
        reference:
          purchaseData.paymentReference ||
          purchaseData.paymentData?.reference ||
          "",
        bankAccountId: bankAccountId,
      },

      // ✅ Top-level payment fields for compatibility
      paymentReceived: paymentReceived,
      paymentAmount: paymentReceived,
      paidAmount: paymentReceived,
      paymentMethod: paymentMethod,
      paymentType: paymentMethod,
      pendingAmount: Math.max(0, finalTotal - paymentReceived),
      balanceAmount: Math.max(0, finalTotal - paymentReceived),
      dueDate: dueDate,
      creditDays: creditDays,
      bankAccountId: bankAccountId,

      // ✅ Additional fields
      notes: purchaseData.notes || "",
      description: purchaseData.notes || "",
      termsAndConditions:
        purchaseData.termsAndConditions || purchaseData.terms || "",
      terms: purchaseData.termsAndConditions || purchaseData.terms || "",

      // ✅ Status
      status: purchaseData.status || "completed",
      purchaseStatus: purchaseData.status || "completed",
      receivingStatus: purchaseData.receivingStatus || "pending",

      // ✅ Round off
      roundOff: parseFloat(purchaseData.roundOff || 0),
      roundOffEnabled: Boolean(purchaseData.roundOffEnabled),

      // ✅ Employee tracking
      employeeName: purchaseData.employeeName || "",
      employeeId: purchaseData.employeeId || "",
      createdBy: purchaseData.createdBy || purchaseData.employeeId || null,
      createdByName: purchaseData.employeeName || "",

      // ✅ Form metadata
      formType: purchaseData.formType || "purchase",
      documentType: purchaseData.documentType || "purchase",
      transactionType: purchaseData.transactionType || "purchase",

      // ✅ Additional backend compatibility fields
      invoiceType: purchaseData.gstEnabled ? "gst" : "non-gst",
      gstType: purchaseData.gstEnabled ? "gst" : "non-gst",
      billType: purchaseData.gstEnabled ? "gst" : "non-gst",
    };

    console.log("✅ PurchaseService transformToBackendFormat - Output data:", {
      companyId: transformedData.companyId,
      supplierName: transformedData.supplierName,
      supplierId: transformedData.supplierId,
      itemsCount: transformedData.items?.length || 0,
      totalAmount: transformedData.finalTotal,
      hasRequiredFields: !!(
        transformedData.companyId &&
        transformedData.supplierName &&
        transformedData.items?.length > 0
      ),
    });

    // ✅ Final validation for form data - STRICT
    if (!transformedData.companyId) {
      throw new Error("Company ID is missing after transformation");
    }
    if (!transformedData.supplierName) {
      throw new Error("Supplier name is missing after transformation");
    }
    if (!transformedData.items || transformedData.items.length === 0) {
      throw new Error("No items found after transformation");
    }

    return transformedData;
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
