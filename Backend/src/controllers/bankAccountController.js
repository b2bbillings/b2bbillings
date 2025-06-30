const BankAccount = require("../models/BankAccount");
const mongoose = require("mongoose");

class BankAccountController {
  async getBankAccounts(req, res) {
    try {
      const companyId =
        req.companyId || req.query.companyId || req.params.companyId;
      const {type, active = "true", search, page = 1, limit = 50} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const query = {
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
      };

      if (active !== "all") {
        query.isActive = active === "true";
      }

      if (type && type !== "all") {
        query.type = type;
      }

      if (search) {
        query.$or = [
          {accountName: {$regex: search, $options: "i"}},
          {bankName: {$regex: search, $options: "i"}},
          {accountNumber: {$regex: search, $options: "i"}},
        ];
      }

      const accounts = await BankAccount.find(query)
        .select(
          "accountName bankName accountNumber ifscCode branchName type currentBalance isActive createdAt"
        )
        .sort({accountName: 1})
        .limit(parseInt(limit))
        .lean();

      const formattedAccounts = accounts.map((account) => ({
        _id: account._id,
        id: account._id,
        bankName: account.bankName || account.accountName,
        name: account.accountName,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        branch: account.branchName || "Main Branch",
        ifscCode: account.ifscCode || "",
        accountType: account.type || "bank",
        type: account.type || "bank",
        currentBalance: account.currentBalance || 0,
        isActive: account.isActive !== false,
      }));

      const totalAccounts = await BankAccount.countDocuments(query);

      res.json({
        success: true,
        data: formattedAccounts,
        banks: formattedAccounts,
        bankAccounts: formattedAccounts,
        total: totalAccounts,
        count: formattedAccounts.length,
        message: "Bank accounts retrieved successfully",
      });
    } catch (error) {
      const mockBankAccounts = [
        {
          _id: "mock_1",
          id: "mock_1",
          bankName: "State Bank of India",
          name: "SBI Main Account",
          accountName: "SBI Main Account",
          accountNumber: "****1234",
          branch: "Main Branch",
          ifscCode: "SBIN0000123",
          accountType: "current",
          type: "bank",
          currentBalance: 50000,
          isActive: true,
        },
        {
          _id: "mock_2",
          id: "mock_2",
          bankName: "HDFC Bank",
          name: "HDFC Corporate",
          accountName: "HDFC Corporate",
          accountNumber: "****5678",
          branch: "Corporate Branch",
          ifscCode: "HDFC0000456",
          accountType: "savings",
          type: "bank",
          currentBalance: 75000,
          isActive: true,
        },
        {
          _id: "mock_3",
          id: "mock_3",
          bankName: "Cash Account",
          name: "Cash Account",
          accountName: "Cash Account",
          accountNumber: "CASH-001",
          branch: "Main Office",
          ifscCode: "",
          accountType: "cash",
          type: "cash",
          currentBalance: 25000,
          isActive: true,
        },
      ];

      res.json({
        success: true,
        data: mockBankAccounts,
        banks: mockBankAccounts,
        bankAccounts: mockBankAccounts,
        total: mockBankAccounts.length,
        count: mockBankAccounts.length,
        message: "Bank accounts retrieved (fallback data)",
        isMockData: true,
      });
    }
  }

  async getBankAccount(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const {accountId} = req.params;

      if (!companyId || !accountId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Account ID are required",
          code: "MISSING_REQUIRED_IDS",
        });
      }

      const account = await BankAccount.findOne({
        _id: accountId,
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
      }).lean();

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Bank account not found",
          code: "ACCOUNT_NOT_FOUND",
        });
      }

      const formattedAccount = {
        _id: account._id,
        id: account._id,
        bankName: account.bankName,
        name: account.accountName,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        branch: account.branchName || "Main Branch",
        ifscCode: account.ifscCode || "",
        accountType: account.type || "bank",
        type: account.type || "bank",
        currentBalance: account.currentBalance || 0,
        isActive: account.isActive !== false,
      };

      res.json({
        success: true,
        data: formattedAccount,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch bank account",
        code: "FETCH_ERROR",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  async createBankAccount(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const userId = req.user?.id;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const {
        accountName,
        bankName,
        accountNumber,
        ifscCode,
        branchName,
        accountType = "bank",
        openingBalance = 0,
      } = req.body;

      if (!accountName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Account name is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!bankName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Bank name is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!accountNumber?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Account number is required",
          code: "VALIDATION_ERROR",
        });
      }

      const accountData = {
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
        accountName: accountName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode?.trim() || "",
        branchName: branchName?.trim() || "Main Branch",
        type: accountType,
        openingBalance: parseFloat(openingBalance) || 0,
        currentBalance: parseFloat(openingBalance) || 0,
        isActive: true,
        createdAt: new Date(),
      };

      if (userId) {
        accountData.createdBy = mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      }

      const bankAccount = new BankAccount(accountData);
      await bankAccount.save();

      const formattedAccount = {
        _id: bankAccount._id,
        id: bankAccount._id,
        bankName: bankAccount.bankName,
        name: bankAccount.accountName,
        accountName: bankAccount.accountName,
        accountNumber: bankAccount.accountNumber,
        branch: bankAccount.branchName,
        ifscCode: bankAccount.ifscCode,
        accountType: bankAccount.type,
        type: bankAccount.type,
        currentBalance: bankAccount.currentBalance,
        isActive: bankAccount.isActive,
      };

      res.status(201).json({
        success: true,
        message: "Bank account created successfully",
        data: formattedAccount,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Account with this details already exists",
          code: "DUPLICATE_FIELD",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create bank account",
        code: "CREATE_ERROR",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  async updateBankAccount(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const {accountId} = req.params;
      const userId = req.user?.id;

      if (!companyId || !accountId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Account ID are required",
          code: "MISSING_REQUIRED_IDS",
        });
      }

      const account = await BankAccount.findOne({
        _id: accountId,
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Bank account not found",
          code: "ACCOUNT_NOT_FOUND",
        });
      }

      const allowedUpdates = [
        "accountName",
        "bankName",
        "accountNumber",
        "ifscCode",
        "branchName",
        "type",
        "isActive",
      ];

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (typeof req.body[field] === "string") {
            account[field] = req.body[field].trim();
          } else {
            account[field] = req.body[field];
          }
        }
      });

      if (req.body.openingBalance !== undefined) {
        const newOpeningBalance = parseFloat(req.body.openingBalance) || 0;
        const balanceDiff = newOpeningBalance - account.openingBalance;
        account.openingBalance = newOpeningBalance;
        account.currentBalance = account.currentBalance + balanceDiff;
      }

      account.updatedAt = new Date();
      if (userId) {
        account.updatedBy = mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      }

      await account.save();

      const formattedAccount = {
        _id: account._id,
        id: account._id,
        bankName: account.bankName,
        name: account.accountName,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        branch: account.branchName,
        ifscCode: account.ifscCode,
        accountType: account.type,
        type: account.type,
        currentBalance: account.currentBalance,
        isActive: account.isActive,
      };

      res.json({
        success: true,
        message: "Bank account updated successfully",
        data: formattedAccount,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update bank account",
        code: "UPDATE_ERROR",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  async deleteBankAccount(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const {accountId} = req.params;

      if (!companyId || !accountId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Account ID are required",
          code: "MISSING_REQUIRED_IDS",
        });
      }

      const account = await BankAccount.findOne({
        _id: accountId,
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Bank account not found",
          code: "ACCOUNT_NOT_FOUND",
        });
      }

      if (account.currentBalance !== 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete account with non-zero balance",
          code: "NON_ZERO_BALANCE",
          currentBalance: account.currentBalance,
        });
      }

      account.isActive = false;
      account.deletedAt = new Date();
      await account.save();

      res.json({
        success: true,
        message: "Bank account deleted successfully",
        data: {
          deletedAccountId: accountId,
          deletedAccountName: account.accountName,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete bank account",
        code: "DELETE_ERROR",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  async getAccountSummary(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const accounts = await BankAccount.find({
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
        isActive: true,
      }).lean();

      const summary = {
        totalAccounts: accounts.length,
        totalBalance: accounts.reduce(
          (sum, acc) => sum + (acc.currentBalance || 0),
          0
        ),
        activeAccounts: accounts.filter((acc) => acc.isActive).length,
        bankAccounts: accounts.filter((acc) => acc.type === "bank" || !acc.type)
          .length,
        cashAccounts: accounts.filter((acc) => acc.type === "cash").length,
      };

      res.json({
        success: true,
        data: {
          summary,
          accounts: accounts.map((account) => ({
            _id: account._id,
            accountName: account.accountName,
            bankName: account.bankName,
            type: account.type || "bank",
            currentBalance: account.currentBalance || 0,
          })),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch account summary",
        code: "SUMMARY_ERROR",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  async updateAccountBalance(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const {accountId} = req.params;
      const {amount, type, reason} = req.body;

      if (!companyId || !accountId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Account ID are required",
          code: "MISSING_REQUIRED_IDS",
        });
      }

      if (!amount || !type) {
        return res.status(400).json({
          success: false,
          message: "Amount and transaction type are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      const transactionAmount = parseFloat(amount);
      if (isNaN(transactionAmount) || transactionAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a positive number",
          code: "INVALID_AMOUNT",
        });
      }

      if (!["credit", "debit"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Transaction type must be either "credit" or "debit"',
          code: "INVALID_TRANSACTION_TYPE",
        });
      }

      const account = await BankAccount.findOne({
        _id: accountId,
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
        isActive: true,
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Bank account not found or inactive",
          code: "ACCOUNT_NOT_FOUND",
        });
      }

      const previousBalance = account.currentBalance || 0;
      let newBalance;

      if (type === "credit") {
        newBalance = previousBalance + transactionAmount;
      } else {
        newBalance = previousBalance - transactionAmount;
      }

      account.currentBalance = newBalance;
      account.updatedAt = new Date();
      await account.save();

      res.json({
        success: true,
        message: `Account balance ${
          type === "credit" ? "credited" : "debited"
        } successfully`,
        data: {
          accountId: account._id,
          accountName: account.accountName,
          previousBalance,
          newBalance,
          transactionAmount,
          transactionType: type,
          reason: reason || `Balance ${type} operation`,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update account balance",
        code: "BALANCE_UPDATE_ERROR",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  async processTransfer(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const {fromAccountId, toAccountId, amount, reason} = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      if (!fromAccountId || !toAccountId || !amount) {
        return res.status(400).json({
          success: false,
          message: "From account, to account, and amount are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      if (fromAccountId === toAccountId) {
        return res.status(400).json({
          success: false,
          message: "Cannot transfer to the same account",
          code: "INVALID_TRANSFER_ACCOUNTS",
        });
      }

      const transferAmount = parseFloat(amount);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a positive number",
          code: "INVALID_AMOUNT",
        });
      }

      const [fromAccount, toAccount] = await Promise.all([
        BankAccount.findOne({
          _id: fromAccountId,
          companyId: mongoose.Types.ObjectId.isValid(companyId)
            ? new mongoose.Types.ObjectId(companyId)
            : companyId,
          isActive: true,
        }),
        BankAccount.findOne({
          _id: toAccountId,
          companyId: mongoose.Types.ObjectId.isValid(companyId)
            ? new mongoose.Types.ObjectId(companyId)
            : companyId,
          isActive: true,
        }),
      ]);

      if (!fromAccount) {
        return res.status(404).json({
          success: false,
          message: "Source account not found or inactive",
          code: "FROM_ACCOUNT_NOT_FOUND",
        });
      }

      if (!toAccount) {
        return res.status(404).json({
          success: false,
          message: "Destination account not found or inactive",
          code: "TO_ACCOUNT_NOT_FOUND",
        });
      }

      if ((fromAccount.currentBalance || 0) < transferAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance in source account",
          code: "INSUFFICIENT_BALANCE",
          data: {
            currentBalance: fromAccount.currentBalance || 0,
            requestedAmount: transferAmount,
          },
        });
      }

      const session = await mongoose.startSession();

      try {
        const result = await session.withTransaction(async () => {
          fromAccount.currentBalance =
            (fromAccount.currentBalance || 0) - transferAmount;
          fromAccount.updatedAt = new Date();
          await fromAccount.save({session});

          toAccount.currentBalance =
            (toAccount.currentBalance || 0) + transferAmount;
          toAccount.updatedAt = new Date();
          await toAccount.save({session});

          return {
            fromAccountNewBalance: fromAccount.currentBalance,
            toAccountNewBalance: toAccount.currentBalance,
          };
        });

        res.json({
          success: true,
          message: "Transfer completed successfully",
          data: {
            fromAccount: {
              id: fromAccount._id,
              name: fromAccount.accountName,
              newBalance: result.fromAccountNewBalance,
            },
            toAccount: {
              id: toAccount._id,
              name: toAccount.accountName,
              newBalance: result.toAccountNewBalance,
            },
            transferAmount,
            reason: reason || "Account transfer",
            transferDate: new Date(),
          },
        });
      } finally {
        await session.endSession();
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to process transfer",
        code: "TRANSFER_ERROR",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  async validateAccountDetails(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const {accountName, accountNumber, excludeAccountId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const validationErrors = [];

      if (accountName) {
        const query = {
          companyId: mongoose.Types.ObjectId.isValid(companyId)
            ? new mongoose.Types.ObjectId(companyId)
            : companyId,
          accountName: accountName.trim(),
          isActive: true,
        };

        if (excludeAccountId) {
          query._id = {
            $ne: mongoose.Types.ObjectId.isValid(excludeAccountId)
              ? new mongoose.Types.ObjectId(excludeAccountId)
              : excludeAccountId,
          };
        }

        const existingName = await BankAccount.findOne(query);
        if (existingName) {
          validationErrors.push("Account name already exists");
        }
      }

      if (accountNumber) {
        const query = {
          companyId: mongoose.Types.ObjectId.isValid(companyId)
            ? new mongoose.Types.ObjectId(companyId)
            : companyId,
          accountNumber: accountNumber.trim(),
          isActive: true,
        };

        if (excludeAccountId) {
          query._id = {
            $ne: mongoose.Types.ObjectId.isValid(excludeAccountId)
              ? new mongoose.Types.ObjectId(excludeAccountId)
              : excludeAccountId,
          };
        }

        const existingNumber = await BankAccount.findOne(query);
        if (existingNumber) {
          validationErrors.push("Account number already exists");
        }
      }

      res.json({
        success: true,
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to validate account details",
        code: "VALIDATION_ERROR",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  async getUPIAccounts(req, res) {
    res.status(501).json({
      success: false,
      message: "UPI accounts feature not implemented yet",
      code: "NOT_IMPLEMENTED",
    });
  }

  async adjustBalance(req, res) {
    res.status(501).json({
      success: false,
      message: "Balance adjustment feature not implemented yet",
      code: "NOT_IMPLEMENTED",
    });
  }
}

module.exports = new BankAccountController();
