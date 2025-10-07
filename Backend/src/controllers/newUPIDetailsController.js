const NewUPIDetails = require("../models/NewUPIDetails");
const NewBankDetails = require("../models/NewBankDetails");
const mongoose = require("mongoose");

class NewUPIDetailsController {
  // Get all UPI details for a company
  async getUPIDetails(req, res) {
    try {
      const companyId = req.companyId || req.query.companyId || req.params.companyId;
      const { active = "true", search, page = 1, limit = 50 } = req.query;

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

      if (search) {
        query.$or = [
          { upiId: { $regex: search, $options: "i" } },
          { displayName: { $regex: search, $options: "i" } },
          { providerName: { $regex: search, $options: "i" } },
        ];
      }

      const upiDetails = await NewUPIDetails.find(query)
        .populate('linkedBankAccount', 'bankName accountNumber accountHolderName')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ displayName: 1, upiId: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await NewUPIDetails.countDocuments(query);

      const providerMap = {
        paytm: 'Paytm',
        googlepay: 'Google Pay',
        phonepe: 'PhonePe',
        amazonpay: 'Amazon Pay',
        bharatpe: 'BharatPe',
        mobikwik: 'MobiKwik',
        freecharge: 'Freecharge',
        airtel: 'Airtel Money',
        jio: 'JioMoney',
        sbi: 'SBI Pay',
        hdfc: 'HDFC Bank',
        icici: 'ICICI Bank',
        axis: 'Axis Bank',
        other: 'Other'
      };

      const formattedDetails = upiDetails.map((detail) => {
        const [localPart, domain] = detail.upiId.split('@');
        const maskedUpiId = localPart.length <= 2 
          ? detail.upiId 
          : localPart.slice(0, 2) + '*'.repeat(localPart.length - 2) + '@' + domain;

        return {
          _id: detail._id,
          id: detail._id,
          upiId: detail.upiId,
          maskedUpiId,
          providerName: detail.providerName,
          providerDisplayName: providerMap[detail.providerName] || detail.providerName,
          displayName: detail.displayName,
          linkedBankAccount: detail.linkedBankAccount,
          qrCodeData: detail.qrCodeData,
          qrCodeImage: detail.qrCodeImage,
          mobileNumber: detail.mobileNumber,
          isActive: detail.isActive,
          createdAt: detail.createdAt,
          updatedAt: detail.updatedAt,
          createdBy: detail.createdBy,
          updatedBy: detail.updatedBy,
        };
      });

      res.json({
        success: true,
        data: formattedDetails,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        message: "UPI details retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting UPI details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get UPI details",
        code: "FETCH_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get a single UPI detail
  async getUPIDetail(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const { detailId } = req.params;

      if (!companyId || !detailId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Detail ID are required",
          code: "MISSING_REQUIRED_IDS",
        });
      }

      const upiDetail = await NewUPIDetails.findOne({
        _id: detailId,
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
      })
        .populate('linkedBankAccount', 'bankName accountNumber accountHolderName')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();

      if (!upiDetail) {
        return res.status(404).json({
          success: false,
          message: "UPI detail not found",
          code: "DETAIL_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        data: upiDetail,
        message: "UPI detail retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting UPI detail:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get UPI detail",
        code: "FETCH_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create new UPI detail
  async createUPIDetail(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const userId = req.user?.id;

      console.log("🔍 Debug UPI Creation - Company ID:", companyId);
      console.log("🔍 Debug UPI Creation - User ID:", userId);
      console.log("🔍 Debug UPI Creation - Request Body:", req.body);

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const {
        upiId,
        providerName,
        displayName,
        linkedBankAccount,
        qrCodeData,
        qrCodeImage,
        mobileNumber
      } = req.body;

      // Validation
      if (!upiId?.trim()) {
        return res.status(400).json({
          success: false,
          message: "UPI ID is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!providerName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Provider name is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!displayName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Display name is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!linkedBankAccount) {
        return res.status(400).json({
          success: false,
          message: "Linked bank account is required",
          code: "VALIDATION_ERROR",
        });
      }

      // Check if UPI ID already exists for this company
      const existingUPI = await NewUPIDetails.findOne({
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
        upiId: upiId.trim().toLowerCase(),
      });

      if (existingUPI) {
        return res.status(400).json({
          success: false,
          message: "UPI ID already exists for this company",
          code: "DUPLICATE_UPI",
        });
      }

      // Verify linked bank account exists and belongs to the same company
      const bankAccount = await NewBankDetails.findOne({
        _id: linkedBankAccount,
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
      });

      if (!bankAccount) {
        return res.status(400).json({
          success: false,
          message: "Linked bank account not found or doesn't belong to this company",
          code: "INVALID_BANK_ACCOUNT",
        });
      }

      const upiDetailData = {
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
        upiId: upiId.trim().toLowerCase(),
        providerName: providerName.trim(),
        displayName: displayName.trim(),
        linkedBankAccount: mongoose.Types.ObjectId.isValid(linkedBankAccount)
          ? new mongoose.Types.ObjectId(linkedBankAccount)
          : linkedBankAccount,
        qrCodeData: qrCodeData?.trim() || `upi://pay?pa=${upiId.trim()}&pn=${displayName.trim()}&cu=INR`,
        qrCodeImage: qrCodeImage?.trim() || '',
        mobileNumber: mobileNumber?.trim() || '',
        isActive: true,
      };

      if (userId) {
        upiDetailData.createdBy = mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      }

      console.log("🔍 Debug UPI Creation - Final Data:", JSON.stringify(upiDetailData, null, 2));

      const newUPIDetail = new NewUPIDetails(upiDetailData);
      await newUPIDetail.save();

      // Populate the response
      await newUPIDetail.populate('linkedBankAccount', 'bankName accountNumber accountHolderName');

      res.status(201).json({
        success: true,
        data: newUPIDetail,
        message: "UPI detail created successfully",
      });
    } catch (error) {
      console.error("❌ Error creating UPI detail:", error);
      console.error("❌ Full error details:", JSON.stringify(error, null, 2));
      
      if (error.name === 'ValidationError') {
        console.error("❌ Validation errors:", Object.values(error.errors).map(err => err.message));
        return res.status(400).json({
          success: false,
          message: "Validation error",
          code: "VALIDATION_ERROR",
          errors: Object.values(error.errors).map(err => err.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create UPI detail",
        code: "CREATE_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update UPI detail
  async updateUPIDetail(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const { detailId } = req.params;
      const userId = req.user?.id;

      if (!companyId || !detailId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Detail ID are required",
          code: "MISSING_REQUIRED_IDS",
        });
      }

      const updateData = { ...req.body };
      
      if (userId) {
        updateData.updatedBy = mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      }

      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.companyId;
      delete updateData.createdAt;
      delete updateData.createdBy;

      const updatedDetail = await NewUPIDetails.findOneAndUpdate(
        {
          _id: detailId,
          companyId: mongoose.Types.ObjectId.isValid(companyId)
            ? new mongoose.Types.ObjectId(companyId)
            : companyId,
        },
        updateData,
        { new: true, runValidators: true }
      ).populate('linkedBankAccount', 'bankName accountNumber accountHolderName');

      if (!updatedDetail) {
        return res.status(404).json({
          success: false,
          message: "UPI detail not found",
          code: "DETAIL_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        data: updatedDetail,
        message: "UPI detail updated successfully",
      });
    } catch (error) {
      console.error("❌ Error updating UPI detail:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update UPI detail",
        code: "UPDATE_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete UPI detail
  async deleteUPIDetail(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;
      const { detailId } = req.params;

      if (!companyId || !detailId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Detail ID are required",
          code: "MISSING_REQUIRED_IDS",
        });
      }

      const deletedDetail = await NewUPIDetails.findOneAndDelete({
        _id: detailId,
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
      });

      if (!deletedDetail) {
        return res.status(404).json({
          success: false,
          message: "UPI detail not found",
          code: "DETAIL_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        data: deletedDetail,
        message: "UPI detail deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleting UPI detail:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete UPI detail",
        code: "DELETE_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get bank accounts for UPI linking (helper method)
  async getBankAccountsForLinking(req, res) {
    try {
      const companyId = req.companyId || req.params.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const bankAccounts = await NewBankDetails.find({
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
        isActive: true,
      })
        .select('_id bankName accountNumber accountHolderName branchName')
        .sort({ bankName: 1, accountHolderName: 1 })
        .lean();

      const formattedAccounts = bankAccounts.map(account => ({
        _id: account._id,
        value: account._id,
        label: `${account.bankName} - ${account.accountHolderName} (${account.accountNumber.slice(-4)})`,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
        branchName: account.branchName,
      }));

      res.json({
        success: true,
        data: formattedAccounts,
        message: "Bank accounts for linking retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting bank accounts for linking:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bank accounts for linking",
        code: "FETCH_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = new NewUPIDetailsController();