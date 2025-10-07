const NewBankDetails = require("../models/NewBankDetails");
const mongoose = require("mongoose");

class NewBankDetailsController {
  // Get all bank details for a company
  async getBankDetails(req, res) {
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
          { bankName: { $regex: search, $options: "i" } },
          { accountHolderName: { $regex: search, $options: "i" } },
          { accountNumber: { $regex: search, $options: "i" } },
          { branchName: { $regex: search, $options: "i" } },
        ];
      }

      const bankDetails = await NewBankDetails.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ bankName: 1, accountHolderName: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await NewBankDetails.countDocuments(query);

      const formattedDetails = bankDetails.map((detail) => ({
        _id: detail._id,
        id: detail._id,
        bankName: detail.bankName,
        accountNumber: detail.accountNumber,
        maskedAccountNumber: detail.accountNumber.slice(0, 2) + '*'.repeat(detail.accountNumber.length - 4) + detail.accountNumber.slice(-2),
        accountHolderName: detail.accountHolderName,
        accountType: detail.accountType,
        ifscCode: detail.ifscCode,
        branchName: detail.branchName,
        branchAddress: detail.branchAddress,
        notes: detail.notes,
        isActive: detail.isActive,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        createdBy: detail.createdBy,
        updatedBy: detail.updatedBy,
      }));

      res.json({
        success: true,
        data: formattedDetails,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        message: "Bank details retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting bank details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bank details",
        code: "FETCH_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get a single bank detail
  async getBankDetail(req, res) {
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

      const bankDetail = await NewBankDetails.findOne({
        _id: detailId,
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
      })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();

      if (!bankDetail) {
        return res.status(404).json({
          success: false,
          message: "Bank detail not found",
          code: "DETAIL_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        data: bankDetail,
        message: "Bank detail retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting bank detail:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bank detail",
        code: "FETCH_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create new bank detail
  async createBankDetail(req, res) {
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
        bankName,
        accountNumber,
        accountHolderName,
        accountType,
        ifscCode,
        branchName,
        branchAddress,
        notes
      } = req.body;

      // Validation
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

      if (!accountHolderName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Account holder name is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!ifscCode?.trim()) {
        return res.status(400).json({
          success: false,
          message: "IFSC code is required",
          code: "VALIDATION_ERROR",
        });
      }

      if (!branchName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Branch name is required",
          code: "VALIDATION_ERROR",
        });
      }

      // Check if account number already exists for this company
      const existingAccount = await NewBankDetails.findOne({
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
        accountNumber: accountNumber.trim(),
      });

      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: "Account number already exists for this company",
          code: "DUPLICATE_ACCOUNT",
        });
      }

      const bankDetailData = {
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        accountType: accountType || 'Savings',
        ifscCode: ifscCode.trim().toUpperCase(),
        branchName: branchName.trim(),
        branchAddress: branchAddress?.trim() || '',
        notes: notes?.trim() || '',
        isActive: true,
      };

      if (userId) {
        bankDetailData.createdBy = mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      }

      const newBankDetail = new NewBankDetails(bankDetailData);
      await newBankDetail.save();

      res.status(201).json({
        success: true,
        data: newBankDetail,
        message: "Bank detail created successfully",
      });
    } catch (error) {
      console.error("❌ Error creating bank detail:", error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          code: "VALIDATION_ERROR",
          errors: Object.values(error.errors).map(err => err.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create bank detail",
        code: "CREATE_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update bank detail
  async updateBankDetail(req, res) {
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

      const updatedDetail = await NewBankDetails.findOneAndUpdate(
        {
          _id: detailId,
          companyId: mongoose.Types.ObjectId.isValid(companyId)
            ? new mongoose.Types.ObjectId(companyId)
            : companyId,
        },
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedDetail) {
        return res.status(404).json({
          success: false,
          message: "Bank detail not found",
          code: "DETAIL_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        data: updatedDetail,
        message: "Bank detail updated successfully",
      });
    } catch (error) {
      console.error("❌ Error updating bank detail:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update bank detail",
        code: "UPDATE_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete bank detail
  async deleteBankDetail(req, res) {
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

      const deletedDetail = await NewBankDetails.findOneAndDelete({
        _id: detailId,
        companyId: mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : companyId,
      });

      if (!deletedDetail) {
        return res.status(404).json({
          success: false,
          message: "Bank detail not found",
          code: "DETAIL_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        data: deletedDetail,
        message: "Bank detail deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleting bank detail:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete bank detail",
        code: "DELETE_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = new NewBankDetailsController();