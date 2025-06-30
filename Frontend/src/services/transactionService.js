const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

class TransactionService {
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
          data.message ||
          data.error ||
          `HTTP error! status: ${response.status}`;

        switch (response.status) {
          case 400:
            errorMessage = data.message || "Invalid transaction data provided";
            break;
          case 401:
            errorMessage = "Authentication required. Please login again.";
            localStorage.removeItem("token");
            localStorage.removeItem("authToken");
            sessionStorage.removeItem("token");
            break;
          case 403:
            errorMessage =
              "Access denied. You do not have permission for this operation.";
            break;
          case 404:
            errorMessage = "Transaction or resource not found.";
            break;
          case 409:
            errorMessage =
              data.message ||
              "Transaction conflict. This transaction may already exist.";
            break;
          case 422:
            errorMessage =
              data.message ||
              "Invalid transaction data. Please check all fields.";
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            break;
          case 502:
          case 503:
          case 504:
            errorMessage =
              "Service temporarily unavailable. Please try again later.";
            break;
          default:
            errorMessage =
              data.message || `Request failed with status ${response.status}`;
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.response = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        const networkError = new Error(
          "Unable to connect to server. Please check your internet connection."
        );
        networkError.status = 0;
        networkError.isNetworkError = true;
        throw networkError;
      }
      throw error;
    }
  }

  async createTransaction(companyId, transactionData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const isCashPayment =
        transactionData.paymentMethod === "cash" ||
        transactionData.paymentType === "Cash" ||
        transactionData.cashPayment === true;

      if (!isCashPayment && !transactionData.bankAccountId) {
        throw new Error("Bank account ID is required for non-cash payments");
      }

      const amount = parseFloat(transactionData.amount);
      if (!amount || amount <= 0) {
        throw new Error("Valid amount greater than 0 is required");
      }

      if (!transactionData.description?.trim()) {
        throw new Error("Transaction description is required");
      }

      const cleanTransactionData = {
        companyId,
        amount: amount,
        transactionType: transactionData.transactionType || "payment_in",
        paymentMethod: transactionData.paymentMethod || "cash",
        description: transactionData.description.trim(),
        transactionDate:
          transactionData.transactionDate || new Date().toISOString(),
        status: transactionData.status || "completed",

        ...(transactionData.bankAccountId &&
          !isCashPayment && {
            bankAccountId: transactionData.bankAccountId,
            bankAccountName: transactionData.bankAccountName,
            bankName: transactionData.bankName,
            accountNumber: transactionData.accountNumber,
            ifscCode: transactionData.ifscCode,
            branchName: transactionData.branchName,
          }),

        ...(isCashPayment && {
          isCashTransaction: true,
          cashAmount: amount,
          cashTransactionType:
            transactionData.direction === "out" ? "cash_out" : "cash_in",
        }),

        ...(transactionData.partyId && {
          partyId: transactionData.partyId,
          partyName: transactionData.partyName?.trim() || "",
          partyType: transactionData.partyType || "",
        }),

        ...(transactionData.referenceId && {
          referenceId: transactionData.referenceId,
          referenceType: transactionData.referenceType || "payment",
          referenceNumber: transactionData.referenceNumber?.trim() || "",
        }),

        ...(transactionData.chequeNumber && {
          chequeNumber: transactionData.chequeNumber.trim(),
          chequeDate: transactionData.chequeDate,
        }),

        ...(transactionData.transactionId && {
          externalTransactionId: transactionData.transactionId.trim(),
          transactionReference: transactionData.transactionId.trim(),
        }),

        ...(transactionData.upiTransactionId && {
          upiTransactionId: transactionData.upiTransactionId.trim(),
        }),

        notes: transactionData.notes?.trim() || "",
        ...(transactionData.invoiceNumber && {
          invoiceNumber: transactionData.invoiceNumber.trim(),
        }),
        ...(transactionData.formType && {
          sourceType: transactionData.formType,
        }),
        ...(transactionData.createdBy && {
          createdBy: transactionData.createdBy,
        }),
        ...(transactionData.direction && {
          direction: transactionData.direction,
        }),
      };

      Object.keys(cleanTransactionData).forEach((key) => {
        const value = cleanTransactionData[key];
        if (value === "" || value === null || value === undefined) {
          delete cleanTransactionData[key];
        }
      });

      const response = await this.apiCall(
        `/companies/${companyId}/transactions`,
        {
          method: "POST",
          headers: {
            ...this.getAuthHeaders(),
            "x-company-id": companyId,
          },
          body: JSON.stringify(cleanTransactionData),
        }
      );

      return {
        success: true,
        data: response.data || response,
        message: "Transaction created successfully",
      };
    } catch (error) {
      let errorMessage = error.message || "Failed to create transaction";

      if (errorMessage.includes("Validation failed")) {
        errorMessage =
          "Transaction validation failed. Please check all required fields are provided.";
      }

      if (
        errorMessage.includes("Bank account ID is required") &&
        (transactionData.paymentMethod === "cash" ||
          transactionData.paymentType === "Cash")
      ) {
        errorMessage =
          "Cash payment processing failed. Backend configuration issue detected.";
      }

      return {
        success: false,
        data: null,
        message: errorMessage,
        error: errorMessage,
      };
    }
  }

  async updateTransaction(transactionId, updateData) {
    try {
      if (!transactionId) {
        throw new Error("Transaction ID is required");
      }

      if (!updateData.amount || parseFloat(updateData.amount) <= 0) {
        throw new Error("Valid amount is required");
      }

      if (!updateData.paymentMethod) {
        throw new Error("Payment method is required");
      }

      if (!updateData.paymentDate) {
        throw new Error("Payment date is required");
      }

      const updatePayload = {
        amount: parseFloat(updateData.amount),
        paymentMethod: updateData.paymentMethod,
        paymentDate: this.formatDateForAPI(updateData.paymentDate),
        reference: updateData.reference || "",
        notes: updateData.notes || "",
        status: updateData.status || "completed",
      };

      if (updateData.paymentMethod !== "cash" && updateData.bankAccountId) {
        updatePayload.bankAccountId = updateData.bankAccountId;
      }

      if (updateData.clearingDate) {
        updatePayload.clearingDate = this.formatDateForAPI(
          updateData.clearingDate
        );
      }

      const response = await this.apiCall(
        `/payments/transactions/${transactionId}`,
        {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        }
      );

      if (response.success) {
        return {
          success: true,
          data: {
            transaction: response.data || response.transaction,
            bankTransactionUpdated: response.bankTransactionUpdated || false,
            changes: response.changes || {},
            updatedAt: new Date().toISOString(),
          },
          message: response.message || "Transaction updated successfully",
        };
      } else {
        throw new Error(response.message || "Failed to update transaction");
      }
    } catch (error) {
      throw new Error(error.message || "Failed to update transaction");
    }
  }

  async deleteTransaction(transactionId, reason = "") {
    try {
      if (!transactionId) {
        throw new Error("Transaction ID is required");
      }

      const deletePayload = {
        reason: reason || "Transaction deleted by user",
      };

      const response = await this.apiCall(
        `/payments/transactions/${transactionId}`,
        {
          method: "DELETE",
          body: JSON.stringify(deletePayload),
        }
      );

      if (response.success) {
        return {
          success: true,
          data: {
            transactionId: response.data.transactionId,
            paymentNumber: response.data.paymentNumber,
            status: response.data.status,
            cancelReason: response.data.cancelReason,
            cancelledAt: response.data.cancelledAt,
          },
          message: response.message || "Transaction cancelled successfully",
        };
      } else {
        throw new Error(response.message || "Failed to cancel transaction");
      }
    } catch (error) {
      throw new Error(error.message || "Failed to cancel transaction");
    }
  }

  async getTransactions(companyId, filters = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (typeof companyId !== "string" || companyId.length < 10) {
        throw new Error(`Invalid company ID format: ${companyId}`);
      }

      const queryParams = new URLSearchParams();
      queryParams.append("page", filters.page || 1);
      queryParams.append("limit", filters.limit || 50);

      if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
      if (filters.sortOrder) queryParams.append("sortOrder", filters.sortOrder);
      if (filters.transactionType)
        queryParams.append("transactionType", filters.transactionType);
      if (filters.direction) queryParams.append("direction", filters.direction);
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.paymentMethod)
        queryParams.append("paymentMethod", filters.paymentMethod);
      if (filters.bankAccountId)
        queryParams.append("bankAccountId", filters.bankAccountId);
      if (filters.partyId) queryParams.append("partyId", filters.partyId);
      if (filters.dateFrom)
        queryParams.append("dateFrom", this.formatDateForAPI(filters.dateFrom));
      if (filters.dateTo)
        queryParams.append("dateTo", this.formatDateForAPI(filters.dateTo));
      if (filters.startDate)
        queryParams.append(
          "startDate",
          this.formatDateForAPI(filters.startDate)
        );
      if (filters.endDate)
        queryParams.append("endDate", this.formatDateForAPI(filters.endDate));
      if (filters.search) queryParams.append("search", filters.search);
      if (filters.referenceId)
        queryParams.append("referenceId", filters.referenceId);
      if (filters.referenceType)
        queryParams.append("referenceType", filters.referenceType);
      if (filters.referenceNumber)
        queryParams.append("referenceNumber", filters.referenceNumber);
      if (filters.amount) queryParams.append("amount", filters.amount);
      if (filters.amountMin) queryParams.append("amountMin", filters.amountMin);
      if (filters.amountMax) queryParams.append("amountMax", filters.amountMax);
      if (filters.purchaseId)
        queryParams.append("purchaseId", filters.purchaseId);
      if (filters.purchaseNumber)
        queryParams.append("purchaseNumber", filters.purchaseNumber);
      if (filters.supplierId)
        queryParams.append("supplierId", filters.supplierId);
      if (filters.supplierName)
        queryParams.append("supplierName", filters.supplierName);

      const response = await this.apiCall(
        `/companies/${companyId}/transactions?${queryParams}`,
        {
          headers: {
            ...this.getAuthHeaders(),
            "x-company-id": companyId,
          },
        }
      );

      const transactions = response.data?.transactions || response.data || [];
      const pagination = response.data?.pagination || {};

      return {
        success: true,
        data: {
          transactions: transactions,
          pagination: {
            page: parseInt(filters.page) || 1,
            limit: parseInt(filters.limit) || 50,
            total:
              pagination.totalTransactions ||
              pagination.total ||
              transactions.length,
            totalPages:
              pagination.totalPages ||
              Math.ceil(
                (pagination.totalTransactions || transactions.length) /
                  (parseInt(filters.limit) || 50)
              ),
            hasNext: pagination.hasNext || false,
            hasPrev: pagination.hasPrev || false,
          },
          summary: response.data?.summary || {},
          searchCriteria: filters,
          resultCount: transactions.length,
        },
        message: "Transactions retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        data: {
          transactions: [],
          pagination: {page: 1, limit: 50, total: 0, totalPages: 0},
          summary: {},
          searchCriteria: filters,
          resultCount: 0,
        },
        message: error.message || "Failed to get transactions",
      };
    }
  }

  async searchTransactionsByReference(companyId, searchCriteria = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const {
        referenceId,
        referenceType,
        purchaseNumber,
        supplierName,
        supplierId,
        amount,
        dateFrom,
        dateTo,
        paymentMethod,
      } = searchCriteria;

      if (referenceId && referenceType) {
        const referenceResponse = await this.getTransactions(companyId, {
          referenceId,
          referenceType,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (
          referenceResponse.success &&
          referenceResponse.data.transactions.length > 0
        ) {
          return {
            success: true,
            data: {
              transactions: referenceResponse.data.transactions,
              searchStrategy: "reference",
              matchType: "exact",
            },
          };
        }
      }

      if (purchaseNumber) {
        const numberResponse = await this.getTransactions(companyId, {
          search: purchaseNumber,
          limit: 50,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (
          numberResponse.success &&
          numberResponse.data.transactions.length > 0
        ) {
          return {
            success: true,
            data: {
              transactions: numberResponse.data.transactions,
              searchStrategy: "purchaseNumber",
              matchType: "description",
            },
          };
        }
      }

      if (supplierId) {
        const supplierFilters = {
          partyId: supplierId,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        };

        if (dateFrom) supplierFilters.dateFrom = dateFrom;
        if (dateTo) supplierFilters.dateTo = dateTo;
        if (paymentMethod) supplierFilters.paymentMethod = paymentMethod;

        const supplierResponse = await this.getTransactions(
          companyId,
          supplierFilters
        );

        if (
          supplierResponse.success &&
          supplierResponse.data.transactions.length > 0
        ) {
          let matchingTransactions = supplierResponse.data.transactions;

          if (amount && amount > 0) {
            matchingTransactions = matchingTransactions.filter((t) => {
              const amountDiff = Math.abs(t.amount - amount);
              return amountDiff <= 10;
            });
          }

          return {
            success: true,
            data: {
              transactions: matchingTransactions,
              searchStrategy: "supplier",
              matchType: amount ? "supplierWithAmount" : "supplier",
            },
          };
        }
      }

      if (supplierName) {
        const nameResponse = await this.getTransactions(companyId, {
          search: supplierName,
          limit: 50,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (nameResponse.success && nameResponse.data.transactions.length > 0) {
          return {
            success: true,
            data: {
              transactions: nameResponse.data.transactions,
              searchStrategy: "supplierName",
              matchType: "description",
            },
          };
        }
      }

      const generalFilters = {
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      if (dateFrom) generalFilters.dateFrom = dateFrom;
      if (dateTo) generalFilters.dateTo = dateTo;
      if (paymentMethod) generalFilters.paymentMethod = paymentMethod;
      if (amount) generalFilters.amount = amount;

      const generalResponse = await this.getTransactions(
        companyId,
        generalFilters
      );

      if (generalResponse.success) {
        return {
          success: true,
          data: {
            transactions: generalResponse.data.transactions,
            searchStrategy: "general",
            matchType: "filtered",
          },
        };
      }

      return {
        success: true,
        data: {
          transactions: [],
          searchStrategy: "none",
          matchType: "notFound",
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          transactions: [],
          searchStrategy: "error",
          matchType: "error",
        },
        message: error.message || "Failed to search transactions",
        error: error.message,
      };
    }
  }

  async getTransactionsByReference(
    companyId,
    referenceId,
    referenceType = "purchase"
  ) {
    try {
      if (!companyId || !referenceId) {
        throw new Error("Company ID and Reference ID are required");
      }

      const queryParams = new URLSearchParams();
      queryParams.append("referenceId", referenceId);
      queryParams.append("referenceType", referenceType);
      queryParams.append("limit", "50");
      queryParams.append("sortBy", "createdAt");
      queryParams.append("sortOrder", "desc");

      const response = await this.apiCall(
        `/companies/${companyId}/transactions?${queryParams}`,
        {
          headers: {
            ...this.getAuthHeaders(),
            "x-company-id": companyId,
          },
        }
      );

      const transactions = response.data?.transactions || response.data || [];

      return {
        success: true,
        data: {
          transactions: transactions,
          total: transactions.length,
          referenceId: referenceId,
          referenceType: referenceType,
        },
        message: `Found ${transactions.length} transactions for reference ${referenceId}`,
      };
    } catch (error) {
      return {
        success: false,
        data: {
          transactions: [],
          total: 0,
        },
        message: error.message || "Failed to get transactions by reference",
      };
    }
  }

  async getPurchaseTransactions(companyId, purchaseData) {
    try {
      const searchCriteria = {
        referenceId:
          purchaseData.purchaseId || purchaseData._id || purchaseData.id,
        referenceType: "purchase",
        purchaseNumber: purchaseData.purchaseNumber || purchaseData.billNumber,
        supplierName: purchaseData.supplierName || purchaseData.supplier?.name,
        supplierId: purchaseData.supplierId || purchaseData.supplier?._id,
        amount:
          purchaseData.finalTotal || purchaseData.amount || purchaseData.total,
        dateFrom: purchaseData.purchaseDate
          ? this.formatDateForAPI(purchaseData.purchaseDate)
          : null,
        dateTo: purchaseData.purchaseDate
          ? this.formatDateForAPI(purchaseData.purchaseDate)
          : null,
        paymentMethod: purchaseData.paymentMethod,
      };

      return await this.searchTransactionsByReference(
        companyId,
        searchCriteria
      );
    } catch (error) {
      return {
        success: false,
        data: {
          transactions: [],
          searchStrategy: "error",
          matchType: "error",
        },
        message: error.message || "Failed to get purchase transactions",
        error: error.message,
      };
    }
  }

  async getTransactionById(companyId, transactionId) {
    try {
      if (!companyId || !transactionId) {
        throw new Error("Company ID and Transaction ID are required");
      }

      const response = await this.apiCall(
        `/companies/${companyId}/transactions/${transactionId}`,
        {
          headers: {
            ...this.getAuthHeaders(),
            "x-company-id": companyId,
          },
        }
      );

      return {
        success: true,
        data: response.data || response,
        message: "Transaction retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.message || "Failed to get transaction",
      };
    }
  }

  async getBankAccountTransactions(companyId, bankAccountId, filters = {}) {
    try {
      if (!companyId || !bankAccountId) {
        throw new Error("Company ID and Bank Account ID are required");
      }

      const bankFilters = {
        ...filters,
        bankAccountId: bankAccountId,
      };

      return await this.getTransactions(companyId, bankFilters);
    } catch (error) {
      return {
        success: false,
        data: {
          transactions: [],
          pagination: {page: 1, limit: 50, total: 0, totalPages: 0},
          summary: {},
        },
        message: error.message || "Failed to get bank account transactions",
      };
    }
  }

  async getTransactionSummary(companyId, options = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const queryParams = new URLSearchParams();
      queryParams.append("period", options.period || "month");

      if (options.bankAccountId)
        queryParams.append("bankAccountId", options.bankAccountId);
      if (options.dateFrom)
        queryParams.append("dateFrom", this.formatDateForAPI(options.dateFrom));
      if (options.dateTo)
        queryParams.append("dateTo", this.formatDateForAPI(options.dateTo));
      if (options.startDate)
        queryParams.append(
          "startDate",
          this.formatDateForAPI(options.startDate)
        );
      if (options.endDate)
        queryParams.append("endDate", this.formatDateForAPI(options.endDate));

      const response = await this.apiCall(
        `/companies/${companyId}/transactions/summary?${queryParams}`,
        {
          headers: {
            ...this.getAuthHeaders(),
            "x-company-id": companyId,
          },
        }
      );

      const summaryData = response.data?.summary || response.data || {};

      const enhancedSummary = {
        totalIn: summaryData.totalIn || 0,
        totalOut: summaryData.totalOut || 0,
        netAmount:
          summaryData.netAmount ||
          (summaryData.totalIn || 0) - (summaryData.totalOut || 0),
        totalTransactions: summaryData.totalTransactions || 0,
        totalSales: summaryData.totalSales || 0,
        totalPurchases: summaryData.totalPurchases || 0,
        totalPaymentsIn: summaryData.totalPaymentsIn || 0,
        totalPaymentsOut: summaryData.totalPaymentsOut || 0,
        period: options.period || "month",
        dateRange: {
          from: options.dateFrom || options.startDate,
          to: options.dateTo || options.endDate,
        },
      };

      return {
        success: true,
        data: {
          summary: enhancedSummary,
        },
        message: "Transaction summary retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        data: {
          summary: {
            totalIn: 0,
            totalOut: 0,
            netAmount: 0,
            totalTransactions: 0,
          },
        },
        message: error.message || "Failed to get transaction summary",
      };
    }
  }

  async createPaymentInTransaction(companyId, paymentData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const transactionData = {
        ...paymentData,
        direction: "in",
        transactionType: "payment_in",
        companyId,
        description:
          paymentData.description ||
          `Payment from ${paymentData.partyName || "Customer"} for ${
            paymentData.referenceNumber || "invoice"
          }`,
        amount: parseFloat(paymentData.amount) || 0,
      };

      return await this.createTransaction(companyId, transactionData);
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.message || "Failed to create Payment In transaction",
        error: error.message,
      };
    }
  }

  async createPaymentOutTransaction(companyId, paymentData) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const transactionData = {
        ...paymentData,
        direction: "out",
        transactionType: "payment_out",
        companyId,
      };

      return await this.createTransaction(companyId, transactionData);
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.message || "Failed to create Payment Out transaction",
        error: error.message,
      };
    }
  }

  normalizePaymentMethodForBackend(method) {
    if (!method) return "cash";

    const methodStr = method.toString().toLowerCase();
    const methodMappings = {
      bank: "bank_transfer",
      bank_transfer: "bank_transfer",
      banktransfer: "bank_transfer",
      "bank transfer": "bank_transfer",
      neft: "bank_transfer",
      rtgs: "bank_transfer",
      imps: "bank_transfer",
      net_banking: "bank_transfer",
      netbanking: "bank_transfer",

      upi: "upi",
      upi_payment: "upi",
      paytm: "upi",
      gpay: "upi",
      phonepe: "upi",

      card: "card",
      credit_card: "card",
      debit_card: "card",
      creditcard: "card",
      debitcard: "card",

      cash: "cash",
      cheque: "cheque",
      credit: "credit",
      partial: "partial",
    };

    return methodMappings[methodStr] || methodStr;
  }

  normalizePaymentMethodForFrontend(method) {
    if (!method) return "cash";

    const methodStr = method.toString().toLowerCase();
    const methodMappings = {
      bank_transfer: "bank",
      neft: "bank",
      rtgs: "bank",
      imps: "bank",
      net_banking: "bank",
      netbanking: "bank",
      bank: "bank",

      upi: "upi",
      upi_payment: "upi",
      paytm: "upi",
      gpay: "upi",
      phonepe: "upi",

      card: "card",
      credit_card: "card",
      debit_card: "card",
      creditcard: "card",
      debitcard: "card",

      cash: "cash",
      cheque: "cheque",
      credit: "credit",
      partial: "partial",
    };

    return methodMappings[methodStr] || methodStr;
  }

  getPaymentMethods() {
    return [
      {value: "cash", label: "Cash", backend: "cash"},
      {value: "bank", label: "Bank Transfer", backend: "bank_transfer"},
      {value: "upi", label: "UPI", backend: "upi"},
      {value: "card", label: "Card", backend: "card"},
      {value: "cheque", label: "Cheque", backend: "cheque"},
      {value: "credit", label: "Credit", backend: "credit"},
    ];
  }

  getTransactionTypes() {
    return [
      {value: "payment_in", label: "Payment In"},
      {value: "payment_out", label: "Payment Out"},
      {value: "sale", label: "Sale"},
      {value: "purchase", label: "Purchase"},
      {value: "transfer", label: "Transfer"},
      {value: "fee", label: "Fee"},
      {value: "refund", label: "Refund"},
      {value: "other", label: "Other"},
    ];
  }

  formatCurrency(amount, options = {}) {
    const {
      currency = "INR",
      locale = "en-IN",
      showSign = false,
      minimumFractionDigits = 2,
    } = options;

    try {
      const formattedAmount = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits,
      }).format(Math.abs(amount) || 0);

      if (showSign && amount !== 0) {
        return amount > 0 ? `+${formattedAmount}` : `-${formattedAmount}`;
      }

      return formattedAmount;
    } catch (error) {
      return `₹${amount || 0}`;
    }
  }

  formatDateForAPI(date) {
    if (!date) return null;

    try {
      if (typeof date === "string") {
        if (date.includes("T")) {
          return date.split("T")[0];
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return date;
        }
      }

      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return null;
      }

      return dateObj.toISOString().split("T")[0];
    } catch (error) {
      return null;
    }
  }

  formatDateForDisplay(date, options = {}) {
    if (!date) return "N/A";

    try {
      const {
        locale = "en-IN",
        dateStyle = "medium",
        timeStyle = undefined,
      } = options;

      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "Invalid Date";

      return dateObj.toLocaleDateString(locale, {
        dateStyle,
        ...(timeStyle && {timeStyle}),
      });
    } catch (error) {
      return "Invalid Date";
    }
  }

  async testConnection() {
    try {
      const response = await this.apiCall("/health", {
        method: "GET",
      });

      return {
        success: true,
        message: "Transaction service connected successfully",
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Connection test failed",
        error: error.message,
      };
    }
  }
}

export default new TransactionService();
