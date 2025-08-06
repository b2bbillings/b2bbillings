const Transaction = require("../models/Transaction");
const BankAccount = require("../models/BankAccount");
const Purchase = require("../models/Purchase");
const Sale = require("../models/Sale");
const mongoose = require("mongoose");

// Production-ready payment method normalization
const normalizePaymentMethod = (method) => {
  const methodMapping = {
    "bank account": "bank_transfer",
    bank_account: "bank_transfer",
    "bank transfer": "bank_transfer",
    bank_transfer: "bank_transfer",
    bankaccount: "bank_transfer",
    banktransfer: "bank_transfer",
    "net banking": "bank_transfer",
    netbanking: "bank_transfer",
    neft: "bank_transfer",
    rtgs: "bank_transfer",
    imps: "bank_transfer",
    "wire transfer": "bank_transfer",
    bank: "bank",
    "credit card": "card",
    "debit card": "card",
    card: "card",
    visa: "card",
    mastercard: "card",
    rupay: "card",
    upi: "upi",
    paytm: "upi",
    phonepe: "upi",
    gpay: "upi",
    googlepay: "upi",
    bhim: "upi",
    "digital wallet": "upi",
    wallet: "upi",
    digital: "upi",
    online: "online",
    "internet banking": "online",
    "web payment": "online",
    gateway: "online",
    cash: "cash",
    cheque: "cheque",
    check: "cheque",
    dd: "cheque",
    draft: "cheque",
    credit: "credit",
    "credit terms": "credit",
    "on credit": "credit",
    case: "cash",
    cach: "cash",
    csh: "cash",
    chque: "cheque",
    chek: "cheque",
    credt: "credit",
    cardt: "card",
    onlin: "online",
  };

  const inputMethod = method?.toString().toLowerCase().trim() || "";
  const normalized = methodMapping[inputMethod] || "cash";

  const validEnums = [
    "cash",
    "card",
    "upi",
    "bank_transfer",
    "cheque",
    "credit",
    "online",
    "neft",
    "rtgs",
    "bank",
  ];

  return validEnums.includes(normalized) ? normalized : "cash";
};

// Simplified error handler
const handleError = (res, error, operation = "operation") => {
  const statusCode = error.statusCode || 500;
  const message = error.message || `Failed to ${operation}`;

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

const transactionController = {
  // Get all transactions with filters
  getAllTransactions: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        bankAccountId,
        transactionType,
        direction,
        partyId,
        dateFrom,
        dateTo,
        search,
        status = "completed",
        sortBy = "transactionDate",
        sortOrder = "desc",
      } = req.query;

      const companyId =
        req.companyId ||
        req.params.companyId ||
        req.headers["x-company-id"] ||
        req.query.companyId ||
        req.user?.currentCompany;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Company ID format",
        });
      }

      const filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
        status: status || "completed",
      };

      if (bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
        filter.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
      }

      if (transactionType) {
        if (transactionType.includes(",")) {
          const types = transactionType
            .split(",")
            .map((type) => type.trim())
            .filter(Boolean);
          if (types.length > 0) {
            filter.transactionType = {$in: types};
          }
        } else {
          filter.transactionType = transactionType.trim();
        }
      }

      if (direction && ["in", "out"].includes(direction)) {
        filter.direction = direction;
      }

      if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
        filter.partyId = new mongoose.Types.ObjectId(partyId);
      }

      if (dateFrom || dateTo) {
        filter.transactionDate = {};
        if (dateFrom) {
          filter.transactionDate.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          filter.transactionDate.$lte = endDate;
        }
      }

      if (search && search.trim()) {
        const searchTerm = search.trim();
        filter.$or = [
          {transactionId: {$regex: searchTerm, $options: "i"}},
          {description: {$regex: searchTerm, $options: "i"}},
          {partyName: {$regex: searchTerm, $options: "i"}},
          {referenceNumber: {$regex: searchTerm, $options: "i"}},
          {notes: {$regex: searchTerm, $options: "i"}},
          {chequeNumber: {$regex: searchTerm, $options: "i"}},
          {upiTransactionId: {$regex: searchTerm, $options: "i"}},
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      const sortObj = {};
      if (["transactionDate", "amount", "createdAt"].includes(sortBy)) {
        sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        sortObj.transactionDate = -1;
        sortObj.createdAt = -1;
      }

      const [transactions, totalTransactions] = await Promise.all([
        Transaction.find(filter)
          .populate(
            "bankAccountId",
            "accountName bankName accountNumber currentBalance accountType"
          )
          .populate("partyId", "name mobile email businessName companyName")
          .populate("referenceId")
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Transaction.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalTransactions / limitNum);

      let summary = {
        totalTransactions: totalTransactions,
        totalIn: 0,
        totalOut: 0,
        netAmount: 0,
      };

      try {
        const summaryPipeline = [
          {$match: filter},
          {
            $group: {
              _id: null,
              totalTransactions: {$sum: 1},
              totalIn: {
                $sum: {
                  $cond: [{$eq: ["$direction", "in"]}, "$amount", 0],
                },
              },
              totalOut: {
                $sum: {
                  $cond: [{$eq: ["$direction", "out"]}, "$amount", 0],
                },
              },
              netAmount: {
                $sum: {
                  $cond: [
                    {$eq: ["$direction", "in"]},
                    "$amount",
                    {$multiply: ["$amount", -1]},
                  ],
                },
              },
            },
          },
        ];

        const summaryResult = await Transaction.aggregate(summaryPipeline);
        summary = summaryResult[0] || summary;
      } catch (summaryError) {
        // Use default summary on error
      }

      res.status(200).json({
        success: true,
        data: {
          transactions: transactions || [],
          pagination: {
            page: parseInt(page),
            limit: limitNum,
            total: totalTransactions,
            totalPages,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1,
            from: skip + 1,
            to: Math.min(skip + limitNum, totalTransactions),
          },
          summary: summary,
          filters: {
            applied: {
              companyId: !!companyId,
              bankAccountId: !!bankAccountId,
              transactionType: !!transactionType,
              direction: !!direction,
              partyId: !!partyId,
              dateRange: !!(dateFrom || dateTo),
              search: !!search,
            },
            values: {
              companyId,
              bankAccountId,
              transactionType,
              direction,
              partyId,
              dateFrom,
              dateTo,
              search,
            },
          },
        },
      });
    } catch (error) {
      handleError(res, error, "get transactions");
    }
  },

  // Get transaction by ID
  getTransactionById: async (req, res) => {
    try {
      const {id} = req.params;
      const companyId =
        req.companyId || req.params.companyId || req.query.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID format",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const transaction = await Transaction.findOne({
        _id: new mongoose.Types.ObjectId(id),
        companyId: new mongoose.Types.ObjectId(companyId),
      })
        .populate(
          "bankAccountId",
          "accountName bankName accountNumber accountType currentBalance"
        )
        .populate(
          "partyId",
          "name mobile email address businessName companyName type"
        )
        .populate("referenceId")
        .lean();

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found or access denied",
        });
      }

      res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      handleError(res, error, "get transaction");
    }
  },

  // Create new transaction
  createTransaction: async (req, res) => {
    try {
      const companyId =
        req.companyId || req.params.companyId || req.body.companyId;
      const {
        bankAccountId,
        amount,
        direction,
        transactionType,
        paymentMethod = "cash",
        description,
        notes,
        partyId,
        partyName,
        partyType,
        chequeNumber,
        chequeDate,
        upiTransactionId,
        bankTransactionId,
        referenceId,
        referenceNumber,
        referenceType,
        transactionDate,
        isCashTransaction,
        cashAmount,
        cashTransactionType,
      } = req.body;

      const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
      const isCashPayment =
        normalizedPaymentMethod === "cash" ||
        isCashTransaction === true ||
        cashAmount !== undefined ||
        cashTransactionType !== undefined;

      const validationErrors = [];

      if (!companyId) validationErrors.push("Company ID is required");
      if (!isCashPayment && !bankAccountId) {
        validationErrors.push(
          "Bank account ID is required for non-cash payments"
        );
      }
      if (!amount) validationErrors.push("Amount is required");
      if (!direction) validationErrors.push("Direction is required");
      if (!transactionType)
        validationErrors.push("Transaction type is required");
      if (!description?.trim())
        validationErrors.push("Description is required");

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      if (
        !isCashPayment &&
        bankAccountId &&
        !mongoose.Types.ObjectId.isValid(bankAccountId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid bank account ID format",
        });
      }

      const transactionAmount = parseFloat(amount);
      if (isNaN(transactionAmount) || transactionAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a valid positive number",
        });
      }

      if (!["in", "out"].includes(direction)) {
        return res.status(400).json({
          success: false,
          message: 'Direction must be either "in" or "out"',
        });
      }

      let transaction, updatedBankAccount, finalBalance;

      const transactionId = `TXN_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      let validReferenceType = "payment";
      if (referenceType) {
        const referenceTypeMap = {
          payment_in: "payment",
          payment_out: "payment",
          sale: "sale",
          purchase: "purchase",
          invoice: "invoice",
          expense: "expense",
          transfer: "transfer",
          adjustment: "adjustment",
        };
        validReferenceType =
          referenceTypeMap[referenceType] || referenceType || "payment";
      }

      const transactionData = {
        transactionId,
        companyId: new mongoose.Types.ObjectId(companyId),
        amount: transactionAmount,
        direction,
        transactionType: transactionType.trim(),
        referenceType: validReferenceType,
        paymentMethod: normalizedPaymentMethod,
        description: description.trim(),
        notes: notes?.trim() || "",
        status: "completed",
        createdFrom: "manual",
        createdBy: req.user?.id || "system",
        transactionDate: transactionDate
          ? new Date(transactionDate)
          : new Date(),
        metadata: {
          originalPaymentMethod: paymentMethod,
          normalizedPaymentMethod: normalizedPaymentMethod,
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip || req.connection.remoteAddress,
          timestamp: new Date().toISOString(),
        },
      };

      if (isCashPayment) {
        transactionData.isCashTransaction = true;
        transactionData.cashAmount = transactionAmount;
        transactionData.cashTransactionType =
          cashTransactionType || (direction === "in" ? "cash_in" : "cash_out");
        transactionData.balanceBefore = 0;
        transactionData.balanceAfter = 0;
      } else {
        if (!bankAccountId) {
          throw new Error("Bank account ID is required for non-cash payments");
        }
        transactionData.bankAccountId = new mongoose.Types.ObjectId(
          bankAccountId
        );
        transactionData.balanceBefore = 0;
        transactionData.balanceAfter = 0;
      }

      if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
        transactionData.partyId = new mongoose.Types.ObjectId(partyId);
      }
      if (partyName?.trim()) transactionData.partyName = partyName.trim();
      if (partyType) transactionData.partyType = partyType;

      if (referenceId && mongoose.Types.ObjectId.isValid(referenceId)) {
        transactionData.referenceId = new mongoose.Types.ObjectId(referenceId);
      }
      if (referenceNumber?.trim())
        transactionData.referenceNumber = referenceNumber.trim();

      if (chequeNumber?.trim())
        transactionData.chequeNumber = chequeNumber.trim();
      if (chequeDate) transactionData.chequeDate = new Date(chequeDate);
      if (upiTransactionId?.trim())
        transactionData.upiTransactionId = upiTransactionId.trim();
      if (bankTransactionId?.trim())
        transactionData.bankTransactionId = bankTransactionId.trim();

      transaction = new Transaction(transactionData);
      await transaction.save();

      if (!isCashPayment && bankAccountId) {
        const bankUpdateOperation =
          direction === "in"
            ? {
                $inc: {
                  currentBalance: transactionAmount,
                  totalTransactions: 1,
                  totalCredits: transactionAmount,
                },
              }
            : {
                $inc: {
                  currentBalance: -transactionAmount,
                  totalTransactions: 1,
                  totalDebits: transactionAmount,
                },
              };

        bankUpdateOperation.$set = {lastTransactionDate: new Date()};

        updatedBankAccount = await BankAccount.findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(bankAccountId),
            companyId: new mongoose.Types.ObjectId(companyId),
          },
          bankUpdateOperation,
          {new: true, runValidators: true, upsert: false}
        );

        if (!updatedBankAccount) {
          throw new Error("Bank account not found or access denied");
        }

        finalBalance = parseFloat(updatedBankAccount.currentBalance);
        const balanceBefore =
          direction === "in"
            ? finalBalance - transactionAmount
            : finalBalance + transactionAmount;

        await Transaction.findByIdAndUpdate(transaction._id, {
          balanceBefore,
          balanceAfter: finalBalance,
        });

        transaction.balanceBefore = balanceBefore;
        transaction.balanceAfter = finalBalance;
      }

      const populateOptions = [
        {path: "partyId", select: "name mobile email businessName companyName"},
        {path: "referenceId"},
      ];

      if (transaction.bankAccountId) {
        populateOptions.push({
          path: "bankAccountId",
          select:
            "accountName bankName accountNumber accountType currentBalance",
        });
      }

      await transaction.populate(populateOptions);

      const responseData = {
        _id: transaction._id,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        direction: transaction.direction,
        transactionType: transaction.transactionType,
        description: transaction.description,
        status: transaction.status,
        transactionDate: transaction.transactionDate,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes,
        partyId: transaction.partyId,
        partyName: transaction.partyName,
        createdAt: transaction.createdAt,
        paymentMethodInfo: {
          original: paymentMethod,
          normalized: normalizedPaymentMethod,
          isValid: true,
        },
        ...(transaction.bankAccountId && {
          bankAccountId: transaction.bankAccountId,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
        }),
        ...(isCashPayment && {
          isCashTransaction: transaction.isCashTransaction,
          cashAmount: transaction.cashAmount,
          cashTransactionType: transaction.cashTransactionType,
        }),
      };

      res.status(201).json({
        success: true,
        message: `${
          isCashPayment ? "Cash" : "Bank"
        } transaction created successfully`,
        data: responseData,
        ...(updatedBankAccount && {
          balanceInfo: {
            transactionBalanceAfter: transaction.balanceAfter,
            bankCurrentBalance: updatedBankAccount.currentBalance,
            balancesMatch:
              Math.abs(
                transaction.balanceAfter - updatedBankAccount.currentBalance
              ) < 0.01,
            accountName: updatedBankAccount.accountName,
          },
        }),
        ...(isCashPayment && {
          cashInfo: {
            cashAmount: transactionAmount,
            cashDirection: direction,
            cashTransactionType: transactionData.cashTransactionType,
            noBankAccount: "Cash transaction - no bank account involved",
          },
        }),
        paymentMethodNormalization: {
          original: paymentMethod,
          normalized: normalizedPaymentMethod,
          wasNormalized: paymentMethod !== normalizedPaymentMethod,
          message:
            paymentMethod !== normalizedPaymentMethod
              ? `Payment method '${paymentMethod}' was normalized to '${normalizedPaymentMethod}'`
              : "Payment method was already valid",
        },
      });
    } catch (error) {
      handleError(res, error, "create transaction");
    }
  },

  // Update transaction
  updateTransaction: async (req, res) => {
    try {
      const {id} = req.params;
      const companyId =
        req.companyId || req.params.companyId || req.body.companyId;
      const {
        amount,
        direction,
        transactionType,
        paymentMethod,
        description,
        notes,
        partyId,
        partyName,
        partyType,
        chequeNumber,
        chequeDate,
        upiTransactionId,
        bankTransactionId,
        referenceNumber,
        referenceType,
        transactionDate,
      } = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID format",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const existingTransaction = await Transaction.findOne({
        _id: new mongoose.Types.ObjectId(id),
        companyId: new mongoose.Types.ObjectId(companyId),
      }).populate("bankAccountId");

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found or access denied",
        });
      }

      if (existingTransaction.status === "reconciled") {
        return res.status(400).json({
          success: false,
          message: "Cannot update reconciled transaction",
          code: "TRANSACTION_RECONCILED",
        });
      }

      let updatedTransaction, updatedBankAccount;

      const updateData = {
        lastModifiedBy: req.user?.id || "admin",
        lastModifiedDate: new Date(),
      };

      let balanceAdjustment = 0;
      let needsBalanceUpdate = false;

      if (amount !== undefined) {
        const newAmount = parseFloat(amount);
        if (isNaN(newAmount) || newAmount <= 0) {
          throw new Error("Amount must be a valid positive number");
        }

        const oldAmount = parseFloat(existingTransaction.amount);
        if (newAmount !== oldAmount) {
          updateData.amount = newAmount;
          const amountDiff = newAmount - oldAmount;
          if (existingTransaction.direction === "in") {
            balanceAdjustment += amountDiff;
          } else {
            balanceAdjustment -= amountDiff;
          }
          needsBalanceUpdate = true;
        }
      }

      if (direction && direction !== existingTransaction.direction) {
        if (!["in", "out"].includes(direction)) {
          throw new Error('Direction must be either "in" or "out"');
        }

        updateData.direction = direction;
        const currentAmount = amount
          ? parseFloat(amount)
          : existingTransaction.amount;
        if (existingTransaction.direction === "in" && direction === "out") {
          balanceAdjustment -= currentAmount * 2;
        } else if (
          existingTransaction.direction === "out" &&
          direction === "in"
        ) {
          balanceAdjustment += currentAmount * 2;
        }
        needsBalanceUpdate = true;
      }

      if (transactionType?.trim())
        updateData.transactionType = transactionType.trim();
      if (paymentMethod?.trim())
        updateData.paymentMethod = paymentMethod.trim();
      if (description?.trim()) updateData.description = description.trim();
      if (notes !== undefined) updateData.notes = notes?.trim() || "";
      if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
        updateData.partyId = new mongoose.Types.ObjectId(partyId);
      }
      if (partyName?.trim()) updateData.partyName = partyName.trim();
      if (partyType) updateData.partyType = partyType;
      if (referenceNumber?.trim())
        updateData.referenceNumber = referenceNumber.trim();
      if (referenceType?.trim())
        updateData.referenceType = referenceType.trim();
      if (chequeNumber?.trim()) updateData.chequeNumber = chequeNumber.trim();
      if (chequeDate) updateData.chequeDate = new Date(chequeDate);
      if (upiTransactionId?.trim())
        updateData.upiTransactionId = upiTransactionId.trim();
      if (bankTransactionId?.trim())
        updateData.bankTransactionId = bankTransactionId.trim();
      if (transactionDate)
        updateData.transactionDate = new Date(transactionDate);

      updatedTransaction = await Transaction.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          companyId: new mongoose.Types.ObjectId(companyId),
        },
        updateData,
        {new: true, runValidators: true}
      );

      if (needsBalanceUpdate && balanceAdjustment !== 0) {
        const bankAccount = existingTransaction.bankAccountId;
        const currentBalance = parseFloat(bankAccount.currentBalance || 0);
        const newBalance = currentBalance + balanceAdjustment;

        if (balanceAdjustment < 0 && newBalance < 0) {
          const allowOverdraft =
            process.env.ALLOW_OVERDRAFT === "true" || false;
          if (!allowOverdraft) {
            throw new Error("Insufficient funds for transaction update");
          }
        }

        updatedBankAccount = await BankAccount.findByIdAndUpdate(
          bankAccount._id,
          {
            currentBalance: newBalance,
            lastTransactionDate: new Date(),
          },
          {new: true}
        );

        updateData.balanceBefore = currentBalance;
        updateData.balanceAfter = newBalance;
      }

      await updatedTransaction.populate([
        {
          path: "bankAccountId",
          select:
            "accountName bankName accountNumber accountType currentBalance",
        },
        {path: "partyId", select: "name mobile email businessName companyName"},
        {path: "referenceId"},
      ]);

      res.status(200).json({
        success: true,
        message: "Transaction updated successfully",
        data: {
          transaction: updatedTransaction.toObject(),
          bankAccount: updatedBankAccount
            ? {
                id: updatedBankAccount._id,
                name: updatedBankAccount.accountName,
                newBalance: updatedBankAccount.currentBalance,
                balanceChange:
                  balanceAdjustment !== 0
                    ? balanceAdjustment > 0
                      ? `+₹${balanceAdjustment}`
                      : `-₹${Math.abs(balanceAdjustment)}`
                    : "No change",
              }
            : null,
        },
      });
    } catch (error) {
      handleError(res, error, "update transaction");
    }
  },

  // Delete transaction
  deleteTransaction: async (req, res) => {
    try {
      const {id} = req.params;
      const companyId = req.companyId || req.params.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID format",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const transaction = await Transaction.findOne({
        _id: new mongoose.Types.ObjectId(id),
        companyId: new mongoose.Types.ObjectId(companyId),
      }).populate("bankAccountId");

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found or access denied",
        });
      }

      if (transaction.status === "reconciled") {
        return res.status(400).json({
          success: false,
          message: "Cannot delete reconciled transaction",
          code: "TRANSACTION_RECONCILED",
        });
      }

      let deletedTransaction, updatedBankAccount;

      deletedTransaction = transaction.toObject();

      await Transaction.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        companyId: new mongoose.Types.ObjectId(companyId),
      });

      if (transaction.bankAccountId) {
        const bankAccount = transaction.bankAccountId;
        const currentBalance = parseFloat(bankAccount.currentBalance || 0);
        let newBalance;

        if (transaction.direction === "in") {
          newBalance = currentBalance - transaction.amount;
        } else {
          newBalance = currentBalance + transaction.amount;
        }

        const bankUpdateData = {
          currentBalance: newBalance,
          lastTransactionDate: new Date(),
          $inc: {
            totalTransactions: -1,
            ...(transaction.direction === "in"
              ? {totalCredits: -transaction.amount}
              : {totalDebits: -transaction.amount}),
          },
        };

        updatedBankAccount = await BankAccount.findByIdAndUpdate(
          transaction.bankAccountId._id,
          bankUpdateData,
          {new: true}
        );
      }

      res.status(200).json({
        success: true,
        message: "Transaction deleted successfully",
        data: {
          deletedTransaction: {
            id: deletedTransaction._id,
            transactionId: deletedTransaction.transactionId,
            amount: deletedTransaction.amount,
            direction: deletedTransaction.direction,
            description: deletedTransaction.description,
            transactionDate: deletedTransaction.transactionDate,
            transactionType: deletedTransaction.transactionType,
          },
          bankAccountUpdate: updatedBankAccount
            ? {
                accountName: updatedBankAccount.accountName,
                newBalance: updatedBankAccount.currentBalance,
                balanceAdjustment:
                  deletedTransaction.direction === "in"
                    ? `-₹${deletedTransaction.amount}`
                    : `+₹${deletedTransaction.amount}`,
              }
            : null,
        },
      });
    } catch (error) {
      handleError(res, error, "delete transaction");
    }
  },

  // Get bank account transactions
  getBankAccountTransactions: async (req, res) => {
    try {
      const {bankAccountId} = req.params;
      const companyId =
        req.companyId || req.params.companyId || req.query.companyId;
      const {page = 1, limit = 50, dateFrom, dateTo} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(bankAccountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bank account ID",
        });
      }

      const filter = {
        bankAccountId: new mongoose.Types.ObjectId(bankAccountId),
        companyId: new mongoose.Types.ObjectId(companyId),
      };

      if (dateFrom || dateTo) {
        filter.transactionDate = {};
        if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          filter.transactionDate.$lte = endDate;
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      const [transactions, totalTransactions, bankAccount] = await Promise.all([
        Transaction.find(filter)
          .populate("partyId", "name mobile businessName companyName")
          .populate("bankAccountId", "accountName bankName accountNumber")
          .sort({transactionDate: -1, createdAt: -1})
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Transaction.countDocuments(filter),
        BankAccount.findById(bankAccountId)
          .select(
            "accountName bankName accountNumber currentBalance accountType"
          )
          .lean(),
      ]);

      const totalPages = Math.ceil(totalTransactions / limitNum);

      res.status(200).json({
        success: true,
        data: {
          transactions,
          bankAccount,
          pagination: {
            page: parseInt(page),
            limit: limitNum,
            total: totalTransactions,
            totalPages,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1,
          },
        },
      });
    } catch (error) {
      handleError(res, error, "get bank account transactions");
    }
  },

  // Get transaction summary
  getTransactionSummary: async (req, res) => {
    try {
      const companyId =
        req.companyId || req.params.companyId || req.query.companyId;
      const {bankAccountId, period = "month", dateFrom, dateTo} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      let startDate, endDate;

      if (dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
      } else {
        const now = new Date();
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);

        switch (period) {
          case "today":
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
      }

      const filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
        transactionDate: {$gte: startDate, $lte: endDate},
      };

      if (bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
        filter.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
      }

      const summaryPipeline = [
        {$match: filter},
        {
          $group: {
            _id: null,
            totalTransactions: {$sum: 1},
            totalIn: {
              $sum: {
                $cond: [{$eq: ["$direction", "in"]}, "$amount", 0],
              },
            },
            totalOut: {
              $sum: {
                $cond: [{$eq: ["$direction", "out"]}, "$amount", 0],
              },
            },
            netAmount: {
              $sum: {
                $cond: [
                  {$eq: ["$direction", "in"]},
                  "$amount",
                  {$multiply: ["$amount", -1]},
                ],
              },
            },
          },
        },
      ];

      const summaryResult = await Transaction.aggregate(summaryPipeline);
      const summary = summaryResult[0] || {
        totalTransactions: 0,
        totalIn: 0,
        totalOut: 0,
        netAmount: 0,
      };

      let typeBreakdown = [];
      try {
        typeBreakdown = await Transaction.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$transactionType",
              count: {$sum: 1},
              totalAmount: {$sum: "$amount"},
              totalIn: {
                $sum: {
                  $cond: [{$eq: ["$direction", "in"]}, "$amount", 0],
                },
              },
              totalOut: {
                $sum: {
                  $cond: [{$eq: ["$direction", "out"]}, "$amount", 0],
                },
              },
            },
          },
          {$sort: {totalAmount: -1}},
        ]);
      } catch (typeError) {
        typeBreakdown = [];
      }

      res.status(200).json({
        success: true,
        data: {
          summary,
          typeBreakdown,
          period,
          dateRange: {
            startDate,
            endDate,
          },
        },
      });
    } catch (error) {
      handleError(res, error, "get transaction summary");
    }
  },

  // Reconcile transaction
  reconcileTransaction: async (req, res) => {
    try {
      const {id} = req.params;
      const companyId = req.companyId || req.params.companyId;
      const {reconciled = true, notes} = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID",
        });
      }

      const updateData = {
        reconciled,
        lastModifiedBy: req.user?.id || "admin",
        lastModifiedDate: new Date(),
      };

      if (reconciled) {
        updateData.reconciledDate = new Date();
        updateData.reconciledBy = req.user?.id || "admin";
      } else {
        updateData.reconciledDate = null;
        updateData.reconciledBy = null;
      }

      if (notes) {
        updateData.notes = notes;
      }

      const transaction = await Transaction.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          companyId: new mongoose.Types.ObjectId(companyId),
        },
        updateData,
        {new: true, runValidators: true}
      ).populate(
        "bankAccountId",
        "accountName bankName accountNumber currentBalance"
      );

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found or access denied",
        });
      }

      res.status(200).json({
        success: true,
        message: `Transaction ${
          reconciled ? "reconciled" : "unreconciled"
        } successfully`,
        data: transaction,
      });
    } catch (error) {
      handleError(res, error, "reconcile transaction");
    }
  },

  // Bulk reconcile transactions
  bulkReconcileTransactions: async (req, res) => {
    try {
      const companyId = req.companyId || req.params.companyId;
      const {transactionIds, reconciled = true, notes} = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Transaction IDs array is required and cannot be empty",
        });
      }

      if (transactionIds.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Cannot process more than 100 transactions at once",
        });
      }

      const invalidIds = transactionIds.filter(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction IDs found",
          invalidIds,
        });
      }

      const updateData = {
        reconciled,
        lastModifiedBy: req.user?.id || "admin",
        lastModifiedDate: new Date(),
      };

      if (reconciled) {
        updateData.reconciledDate = new Date();
        updateData.reconciledBy = req.user?.id || "admin";
      } else {
        updateData.reconciledDate = null;
        updateData.reconciledBy = null;
      }

      if (notes) {
        updateData.notes = notes;
      }

      const result = await Transaction.updateMany(
        {
          _id: {
            $in: transactionIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          companyId: new mongoose.Types.ObjectId(companyId),
        },
        updateData
      );

      res.status(200).json({
        success: true,
        message: `${result.modifiedCount} transactions ${
          reconciled ? "reconciled" : "unreconciled"
        } successfully`,
        data: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          requestedCount: transactionIds.length,
          skippedCount: result.matchedCount - result.modifiedCount,
        },
      });
    } catch (error) {
      handleError(res, error, "bulk reconcile transactions");
    }
  },

  // Verify bank account balance
  verifyBankAccountBalance: async (req, res) => {
    try {
      const {bankAccountId} = req.params;
      const companyId = req.companyId || req.params.companyId;

      if (!bankAccountId || !companyId) {
        return res.status(400).json({
          success: false,
          message: "Bank account ID and company ID are required",
        });
      }

      const bankAccount = await BankAccount.findOne({
        _id: new mongoose.Types.ObjectId(bankAccountId),
        companyId: new mongoose.Types.ObjectId(companyId),
      });

      if (!bankAccount) {
        return res.status(404).json({
          success: false,
          message: "Bank account not found",
        });
      }

      const transactions = await Transaction.find({
        bankAccountId: new mongoose.Types.ObjectId(bankAccountId),
        companyId: new mongoose.Types.ObjectId(companyId),
        status: "completed",
      }).sort({transactionDate: 1, createdAt: 1});

      let calculatedBalance = parseFloat(bankAccount.openingBalance || 0);
      const transactionHistory = [];

      transactions.forEach((txn) => {
        const prevBalance = calculatedBalance;

        if (txn.direction === "in") {
          calculatedBalance += txn.amount;
        } else {
          calculatedBalance -= txn.amount;
        }

        transactionHistory.push({
          transactionId: txn.transactionId,
          amount: txn.amount,
          direction: txn.direction,
          balanceBefore: prevBalance,
          balanceAfter: calculatedBalance,
          storedBalanceAfter: txn.balanceAfter,
          match: Math.abs(calculatedBalance - txn.balanceAfter) < 0.01,
        });
      });

      const balanceMatch =
        Math.abs(calculatedBalance - bankAccount.currentBalance) < 0.01;

      res.status(200).json({
        success: true,
        data: {
          bankAccount: {
            id: bankAccount._id,
            accountName: bankAccount.accountName,
            openingBalance: bankAccount.openingBalance,
            currentBalance: bankAccount.currentBalance,
            totalTransactions: bankAccount.totalTransactions,
          },
          verification: {
            calculatedBalance,
            storedBalance: bankAccount.currentBalance,
            difference: calculatedBalance - bankAccount.currentBalance,
            balancesMatch: balanceMatch,
            totalTransactionsProcessed: transactions.length,
          },
          transactionHistory: transactionHistory.slice(-10),
          summary: {
            mismatches: transactionHistory.filter((t) => !t.match).length,
            lastTransaction: transactions[transactions.length - 1],
          },
        },
      });
    } catch (error) {
      handleError(res, error, "verify balance");
    }
  },

  // Get recent transactions
  getRecentTransactions: async (req, res) => {
    try {
      const companyId =
        req.companyId || req.params.companyId || req.query.companyId;
      const {limit = 10, bankAccountId, transactionType} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const limitNum = Math.min(parseInt(limit) || 10, 100);

      const filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
      };

      if (bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
        filter.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
      }

      if (transactionType) {
        filter.transactionType = transactionType;
      }

      const transactions = await Transaction.find(filter)
        .populate("bankAccountId", "accountName bankName accountNumber")
        .populate("partyId", "name businessName companyName")
        .sort({transactionDate: -1, createdAt: -1})
        .limit(limitNum)
        .lean();

      res.status(200).json({
        success: true,
        data: transactions,
        meta: {
          count: transactions.length,
          limit: limitNum,
        },
      });
    } catch (error) {
      handleError(res, error, "get recent transactions");
    }
  },

  // Get transaction analytics
  getTransactionAnalytics: async (req, res) => {
    try {
      const companyId =
        req.companyId || req.params.companyId || req.query.companyId;
      const {period = "month"} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const now = new Date();
      let startDate;

      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
        transactionDate: {$gte: startDate, $lte: now},
      };

      const [
        transactionTrends,
        paymentMethodBreakdown,
        topTransactionTypes,
        dailyTrends,
        monthlyComparison,
      ] = await Promise.all([
        Transaction.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$direction",
              count: {$sum: 1},
              totalAmount: {$sum: "$amount"},
              avgAmount: {$avg: "$amount"},
            },
          },
        ]),

        Transaction.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$paymentMethod",
              count: {$sum: 1},
              totalAmount: {$sum: "$amount"},
              percentage: {$sum: 1},
            },
          },
          {$sort: {totalAmount: -1}},
        ]),

        Transaction.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$transactionType",
              count: {$sum: 1},
              totalAmount: {$sum: "$amount"},
              totalIn: {
                $sum: {
                  $cond: [{$eq: ["$direction", "in"]}, "$amount", 0],
                },
              },
              totalOut: {
                $sum: {
                  $cond: [{$eq: ["$direction", "out"]}, "$amount", 0],
                },
              },
            },
          },
          {$sort: {totalAmount: -1}},
          {$limit: 10},
        ]),

        Transaction.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              transactionDate: {
                $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                $lte: now,
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {format: "%Y-%m-%d", date: "$transactionDate"},
              },
              count: {$sum: 1},
              totalIn: {
                $sum: {
                  $cond: [{$eq: ["$direction", "in"]}, "$amount", 0],
                },
              },
              totalOut: {
                $sum: {
                  $cond: [{$eq: ["$direction", "out"]}, "$amount", 0],
                },
              },
              netFlow: {
                $sum: {
                  $cond: [
                    {$eq: ["$direction", "in"]},
                    "$amount",
                    {$multiply: ["$amount", -1]},
                  ],
                },
              },
            },
          },
          {$sort: {_id: 1}},
        ]),

        Transaction.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              transactionDate: {
                $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                $lte: now,
              },
            },
          },
          {
            $group: {
              _id: {
                month: {$month: "$transactionDate"},
                year: {$year: "$transactionDate"},
              },
              count: {$sum: 1},
              totalAmount: {$sum: "$amount"},
              totalIn: {
                $sum: {
                  $cond: [{$eq: ["$direction", "in"]}, "$amount", 0],
                },
              },
              totalOut: {
                $sum: {
                  $cond: [{$eq: ["$direction", "out"]}, "$amount", 0],
                },
              },
            },
          },
        ]),
      ]);

      res.status(200).json({
        success: true,
        data: {
          trends: transactionTrends,
          paymentMethodBreakdown,
          topTransactionTypes,
          dailyTrends,
          monthlyComparison,
          period,
          dateRange: {
            from: startDate,
            to: now,
          },
        },
      });
    } catch (error) {
      handleError(res, error, "get transaction analytics");
    }
  },

  // Get cash flow summary
  getCashFlowSummary: async (req, res) => {
    try {
      const companyId =
        req.companyId || req.params.companyId || req.query.companyId;
      const {dateFrom, dateTo, bankAccountId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const now = new Date();
      const startDate = dateFrom
        ? new Date(dateFrom)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = dateTo ? new Date(dateTo) : now;
      endDate.setHours(23, 59, 59, 999);

      const filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
        transactionDate: {$gte: startDate, $lte: endDate},
      };

      if (bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
        filter.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
      }

      const cashFlowData = await Transaction.aggregate([
        {$match: filter},
        {
          $group: {
            _id: null,
            totalInflow: {
              $sum: {
                $cond: [{$eq: ["$direction", "in"]}, "$amount", 0],
              },
            },
            totalOutflow: {
              $sum: {
                $cond: [{$eq: ["$direction", "out"]}, "$amount", 0],
              },
            },
            netFlow: {
              $sum: {
                $cond: [
                  {$eq: ["$direction", "in"]},
                  "$amount",
                  {$multiply: ["$amount", -1]},
                ],
              },
            },
            totalTransactions: {$sum: 1},
            inflowTransactions: {
              $sum: {
                $cond: [{$eq: ["$direction", "in"]}, 1, 0],
              },
            },
            outflowTransactions: {
              $sum: {
                $cond: [{$eq: ["$direction", "out"]}, 1, 0],
              },
            },
          },
        },
      ]);

      const paymentMethodFlow = await Transaction.aggregate([
        {$match: filter},
        {
          $group: {
            _id: {
              paymentMethod: "$paymentMethod",
              direction: "$direction",
            },
            amount: {$sum: "$amount"},
            count: {$sum: 1},
          },
        },
        {
          $group: {
            _id: "$_id.paymentMethod",
            inflow: {
              $sum: {
                $cond: [{$eq: ["$_id.direction", "in"]}, "$amount", 0],
              },
            },
            outflow: {
              $sum: {
                $cond: [{$eq: ["$_id.direction", "out"]}, "$amount", 0],
              },
            },
            netFlow: {
              $sum: {
                $cond: [
                  {$eq: ["$_id.direction", "in"]},
                  "$amount",
                  {$multiply: ["$amount", -1]},
                ],
              },
            },
            totalTransactions: {$sum: "$count"},
          },
        },
        {$sort: {netFlow: -1}},
      ]);

      const recentTransactions = await Transaction.find(filter)
        .sort({transactionDate: -1, amount: -1})
        .limit(10)
        .populate("bankAccountId", "accountName bankName")
        .populate("partyId", "name businessName")
        .lean();

      const summary = cashFlowData[0] || {
        totalInflow: 0,
        totalOutflow: 0,
        netFlow: 0,
        totalTransactions: 0,
        inflowTransactions: 0,
        outflowTransactions: 0,
      };

      res.status(200).json({
        success: true,
        data: {
          summary,
          paymentMethodFlow,
          recentTransactions,
          dateRange: {
            from: startDate,
            to: endDate,
          },
        },
      });
    } catch (error) {
      handleError(res, error, "get cash flow summary");
    }
  },

  // Get daily cash flow
  getDailyCashFlow: async (req, res) => {
    try {
      const companyId =
        req.companyId || req.params.companyId || req.query.companyId;
      const {
        date = new Date().toISOString().split("T")[0],
        direction,
        transactionType,
      } = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
        transactionDate: {$gte: startOfDay, $lte: endOfDay},
      };

      if (direction && ["in", "out"].includes(direction)) {
        filter.direction = direction;
      }

      if (transactionType) {
        if (transactionType.includes(",")) {
          const types = transactionType
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          filter.transactionType = {$in: types};
        } else {
          filter.transactionType = transactionType.trim();
        }
      }

      const [dailySummary, transactions] = await Promise.all([
        Transaction.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalInflow: {
                $sum: {
                  $cond: [{$eq: ["$direction", "in"]}, "$amount", 0],
                },
              },
              totalOutflow: {
                $sum: {
                  $cond: [{$eq: ["$direction", "out"]}, "$amount", 0],
                },
              },
              netFlow: {
                $sum: {
                  $cond: [
                    {$eq: ["$direction", "in"]},
                    "$amount",
                    {$multiply: ["$amount", -1]},
                  ],
                },
              },
              totalTransactions: {$sum: 1},
              cashTransactions: {
                $sum: {
                  $cond: [{$eq: ["$paymentMethod", "cash"]}, 1, 0],
                },
              },
              bankTransactions: {
                $sum: {
                  $cond: [{$ne: ["$paymentMethod", "cash"]}, 1, 0],
                },
              },
            },
          },
        ]),

        Transaction.find(filter)
          .populate("bankAccountId", "accountName bankName accountNumber")
          .populate("partyId", "name businessName mobile")
          .sort({transactionDate: -1, createdAt: -1})
          .lean(),
      ]);

      const summary = dailySummary[0] || {
        totalInflow: 0,
        totalOutflow: 0,
        netFlow: 0,
        totalTransactions: 0,
        cashTransactions: 0,
        bankTransactions: 0,
      };

      // Group transactions by hour for timeline
      const hourlyBreakdown = transactions.reduce((acc, txn) => {
        const hour = txn.transactionDate.getHours();
        if (!acc[hour]) {
          acc[hour] = {
            hour,
            transactions: [],
            inflow: 0,
            outflow: 0,
            count: 0,
          };
        }

        acc[hour].transactions.push(txn);
        acc[hour].count++;

        if (txn.direction === "in") {
          acc[hour].inflow += txn.amount;
        } else {
          acc[hour].outflow += txn.amount;
        }

        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: {
          date,
          summary,
          transactions,
          hourlyBreakdown: Object.values(hourlyBreakdown).sort(
            (a, b) => a.hour - b.hour
          ),
          filters: {
            direction,
            transactionType,
            applied: !!direction || !!transactionType,
          },
        },
      });
    } catch (error) {
      handleError(res, error, "get daily cash flow");
    }
  },

  // Export transactions to CSV
  exportTransactionsCSV: async (req, res) => {
    try {
      const companyId =
        req.companyId || req.params.companyId || req.query.companyId;
      const {
        dateFrom,
        dateTo,
        bankAccountId,
        transactionType,
        direction,
        format = "csv",
      } = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
      };

      // Add date filters if provided
      if (dateFrom || dateTo) {
        filter.transactionDate = {};
        if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          filter.transactionDate.$lte = endDate;
        }
      }

      // Add other filters
      if (bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
        filter.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
      }

      if (transactionType) {
        filter.transactionType = transactionType;
      }

      if (direction && ["in", "out"].includes(direction)) {
        filter.direction = direction;
      }

      const transactions = await Transaction.find(filter)
        .populate("bankAccountId", "accountName bankName accountNumber")
        .populate("partyId", "name businessName mobile email")
        .sort({transactionDate: -1})
        .lean();

      if (transactions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No transactions found for the specified criteria",
          filters: filter,
        });
      }

      // Convert to CSV format
      const csvHeaders = [
        "Date",
        "Transaction ID",
        "Type",
        "Direction",
        "Amount",
        "Payment Method",
        "Description",
        "Party Name",
        "Bank Account",
        "Status",
        "Reference Number",
        "Balance After",
        "Created At",
      ].join(",");

      const csvRows = transactions.map((txn) =>
        [
          txn.transactionDate
            ? new Date(txn.transactionDate).toLocaleDateString()
            : "",
          txn.transactionId || "",
          txn.transactionType || "",
          txn.direction || "",
          txn.amount || 0,
          txn.paymentMethod || "",
          `"${(txn.description || "").replace(/"/g, '""')}"`, // Escape quotes
          `"${(txn.partyName || txn.partyId?.name || "").replace(/"/g, '""')}"`,
          `"${(txn.bankAccountId?.accountName || "Cash").replace(/"/g, '""')}"`,
          txn.status || "",
          txn.referenceNumber || "",
          txn.balanceAfter || "",
          txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : "",
        ].join(",")
      );

      const csvContent = [csvHeaders, ...csvRows].join("\n");

      // Set CSV headers
      const filename = `transactions_${companyId}_${
        new Date().toISOString().split("T")[0]
      }.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", Buffer.byteLength(csvContent));

      res.status(200).send(csvContent);
    } catch (error) {
      handleError(res, error, "export transactions CSV");
    }
  },
};

module.exports = transactionController;
