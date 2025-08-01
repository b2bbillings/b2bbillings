const mongoose = require("mongoose");
const logger = require("../config/logger");

// Audit Log Schema
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Authentication
        "USER_LOGIN",
        "USER_LOGOUT",
        "USER_REGISTRATION",
        "FAILED_LOGIN_ATTEMPT",
        "PASSWORD_RESET",
        "EMAIL_VERIFICATION",
        "ACCOUNT_LOCKED",
        "INACTIVE_USER_ACCESS_ATTEMPT",
        "LOCKED_ACCOUNT_ACCESS_ATTEMPT",
        "SUCCESSFUL_LOGIN",
        "TOKEN_REFRESH",

        // Sales Operations
        "SALES_ORDER_CREATED",
        "SALES_ORDER_UPDATED",
        "SALES_ORDER_DELETED",
        "SALES_ORDER_CONFIRMED",
        "SALES_ORDER_CANCELLED",
        "SALES_ORDER_VIEWED",

        // Inventory Operations
        "ITEM_CREATED",
        "ITEM_UPDATED",
        "ITEM_DELETED",
        "STOCK_UPDATED",
        "ITEM_VIEWED",
        "BULK_ITEM_UPDATE",

        // Customer Operations
        "CUSTOMER_CREATED",
        "CUSTOMER_UPDATED",
        "CUSTOMER_DELETED",
        "CUSTOMER_VIEWED",
        "CUSTOMER_DATA_EXPORT",

        // Financial Operations
        "PAYMENT_RECEIVED",
        "PAYMENT_REFUNDED",
        "INVOICE_GENERATED",
        "INVOICE_UPDATED",
        "INVOICE_DELETED",

        // System Operations
        "DATA_EXPORT",
        "BULK_OPERATION",
        "SYSTEM_BACKUP",
        "CONFIGURATION_CHANGED",

        // Security Events
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        "SUSPICIOUS_ACTIVITY_DETECTED",
        "MULTIPLE_LOGIN_ATTEMPTS",
        "IP_BLOCKED",
      ],
    },
    resourceType: {
      type: String,
      enum: [
        "User",
        "SalesOrder",
        "Item",
        "Customer",
        "Payment",
        "Company",
        "Invoice",
        "System",
      ],
    },
    resourceId: mongoose.Schema.Types.ObjectId,
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    ipAddress: String,
    userAgent: String,
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
auditLogSchema.index({userId: 1, timestamp: -1});
auditLogSchema.index({action: 1, timestamp: -1});
auditLogSchema.index({severity: 1, timestamp: -1});
auditLogSchema.index({companyId: 1, timestamp: -1});
auditLogSchema.index({timestamp: -1});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

// Create audit log function
const createAuditLog = async (logData) => {
  try {
    const auditLog = new AuditLog({
      userId: logData.userId,
      action: logData.action,
      resourceType: logData.resourceType,
      resourceId: logData.resourceId,
      details: logData.details || {},
      severity: logData.severity || "low",
      ipAddress: logData.ipAddress || logData.ip,
      userAgent: logData.userAgent,
      companyId: logData.companyId,
      timestamp: new Date(),
    });

    await auditLog.save();

    // Also log to winston for immediate debugging
    logger.info("Audit log created", {
      auditId: auditLog._id,
      userId: logData.userId,
      action: logData.action,
      severity: logData.severity,
      timestamp: auditLog.timestamp,
    });

    return auditLog;
  } catch (error) {
    // If audit logging fails, log the error but don't break main functionality
    logger.error("Failed to create audit log", {
      error: error.message,
      logData,
      stack: error.stack,
    });

    return null;
  }
};

// Get audit logs for a user
const getUserAuditLogs = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      severity,
      startDate,
      endDate,
    } = options;

    const query = {userId};

    if (action) query.action = action;
    if (severity) query.severity = severity;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(query)
      .sort({timestamp: -1})
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("userId", "name email")
      .lean();

    const total = await AuditLog.countDocuments(query);

    return {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching audit logs", {
      error: error.message,
      userId,
      options,
    });
    throw error;
  }
};

// Get security events (high/critical severity)
const getSecurityEvents = async (companyId, days = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const securityEvents = await AuditLog.find({
      companyId,
      severity: {$in: ["high", "critical"]},
      timestamp: {$gte: startDate},
    })
      .sort({timestamp: -1})
      .populate("userId", "name email")
      .lean();

    return securityEvents;
  } catch (error) {
    logger.error("Error fetching security events", {
      error: error.message,
      companyId,
      days,
    });
    throw error;
  }
};

// Clean up old audit logs (run periodically)
const cleanupOldAuditLogs = async (daysToKeep = 365) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AuditLog.deleteMany({
      timestamp: {$lt: cutoffDate},
      severity: {$nin: ["high", "critical"]}, // Keep important logs longer
    });

    logger.info("Audit logs cleanup completed", {
      deletedCount: result.deletedCount,
      cutoffDate,
    });

    return result;
  } catch (error) {
    logger.error("Error cleaning up audit logs", {
      error: error.message,
      daysToKeep,
    });
    throw error;
  }
};

module.exports = {
  createAuditLog,
  getUserAuditLogs,
  getSecurityEvents,
  cleanupOldAuditLogs,
  AuditLog,
};
