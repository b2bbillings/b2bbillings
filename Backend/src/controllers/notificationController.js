const notificationService = require("../services/notificationService");

class NotificationController {
  // ✅ Create notification - Delegate to service
  async createNotification(req, res) {
    try {
      // Call service with request data and sender ID
      const result = await notificationService.createUserNotification(
        req.body,
        req.user.id
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          message: "Notification created successfully",
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || "Failed to create notification",
        });
      }
    } catch (error) {
      console.error("❌ Create notification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create notification",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Get user notifications - Delegate to service
  async getUserNotifications(req, res) {
    try {
      const filters = {
        userId: req.user.id,
        companyId: req.query.companyId,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        type: req.query.type,
        priority: req.query.priority,
        unreadOnly: req.query.unreadOnly === "true",
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: req.query.sortOrder || "desc",
      };

      const result = await notificationService.getUserNotifications(filters);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Get notifications error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get notifications",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Get single notification by ID - Delegate to service
  async getNotificationById(req, res) {
    try {
      const result = await notificationService.getNotificationById(
        req.params.notificationId,
        req.user.id
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else if (result.error === "Notification not found") {
        res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Get notification by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get notification",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Mark notification as read - Delegate to service
  async markAsRead(req, res) {
    try {
      const deviceInfo = {
        device: req.get("User-Agent") || "unknown",
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      };

      const result = await notificationService.markNotificationAsRead(
        req.params.notificationId,
        req.user.id,
        deviceInfo
      );

      if (result.success) {
        res.json({
          success: true,
          message: result.message || "Notification marked as read",
          data: result.data,
        });
      } else if (result.error === "Notification not found") {
        res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      } else if (result.error === "Not authorized") {
        res.status(403).json({
          success: false,
          message: "Not authorized to read this notification",
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Mark as read error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark notification as read",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Mark all notifications as read - Delegate to service
  async markAllAsRead(req, res) {
    try {
      const deviceInfo = {
        device: req.get("User-Agent") || "unknown",
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      };

      const result = await notificationService.markAllNotificationsAsRead(
        req.user.id,
        req.query.companyId,
        deviceInfo
      );

      if (result.success) {
        res.json({
          success: true,
          message: `${result.data.markedCount} notifications marked as read`,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Mark all as read error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark all notifications as read",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Get unread count - Delegate to service
  async getUnreadCount(req, res) {
    try {
      const result = await notificationService.getUnreadCount(
        req.user.id,
        req.query.companyId
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Get unread count error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get unread count",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Delete notification - Delegate to service
  async deleteNotification(req, res) {
    try {
      const result = await notificationService.deleteNotification(
        req.params.notificationId,
        req.user.id
      );

      if (result.success) {
        res.json({
          success: true,
          message: "Notification deleted successfully",
        });
      } else if (result.error === "Notification not found") {
        res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      } else if (result.error === "Not authorized") {
        res.status(403).json({
          success: false,
          message: "Not authorized to delete this notification",
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Delete notification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete notification",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Archive notification - Delegate to service
  async archiveNotification(req, res) {
    try {
      const result = await notificationService.archiveNotification(
        req.params.notificationId,
        req.user.id
      );

      if (result.success) {
        res.json({
          success: true,
          message: "Notification archived successfully",
        });
      } else if (result.error === "Notification not found") {
        res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Archive notification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to archive notification",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Mark notification as clicked - Delegate to service
  async markAsClicked(req, res) {
    try {
      const result = await notificationService.markNotificationAsClicked(
        req.params.notificationId,
        req.user.id
      );

      if (result.success) {
        res.json({
          success: true,
          message: "Notification click tracked",
          data: result.data,
        });
      } else if (result.error === "Notification not found") {
        res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Mark as clicked error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track notification click",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Get notification statistics - Delegate to service
  async getNotificationStats(req, res) {
    try {
      const filters = {
        companyId: req.params.companyId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const result = await notificationService.getNotificationStatistics(
        filters
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Get notification stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get notification statistics",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Cleanup expired notifications - Delegate to service
  async cleanupExpiredNotifications(req, res) {
    try {
      const result = await notificationService.cleanupExpiredNotifications();

      if (result.success) {
        res.json({
          success: true,
          message: "Expired notifications cleaned up successfully",
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Cleanup expired notifications error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cleanup expired notifications",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Get notifications by group - Delegate to service
  async getNotificationsByGroup(req, res) {
    try {
      const filters = {
        groupId: req.params.groupId,
        userId: req.user.id,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      };

      const result = await notificationService.getNotificationsByGroup(filters);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Get notifications by group error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get notifications by group",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Create system notification (Admin only) - Delegate to service
  async createSystemNotification(req, res) {
    try {
      // Check if user has admin privileges
      if (!req.user || !["admin", "super_admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Admin privileges required",
        });
      }

      const result = await notificationService.createSystemNotification(
        req.body
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          message: "System notification created successfully",
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Create system notification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create system notification",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Bulk create notifications (Admin only) - Delegate to service
  async createBulkNotifications(req, res) {
    try {
      // Check if user has admin privileges
      if (!req.user || !["admin", "super_admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Admin privileges required",
        });
      }

      const result = await notificationService.createBulkNotifications(
        req.body.notifications
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          message: "Bulk notifications created successfully",
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("❌ Bulk create notifications error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create bulk notifications",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Get notification templates
  async getNotificationTemplates(req, res) {
    try {
      const templates = notificationService.getNotificationTemplates();

      res.json({
        success: true,
        data: {templates},
      });
    } catch (error) {
      console.error("❌ Get notification templates error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get notification templates",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // ✅ Test notification delivery (Admin only)
  async testNotificationDelivery(req, res) {
    try {
      // Check if user has admin privileges
      if (!req.user || !["admin", "super_admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Admin privileges required",
        });
      }

      const testData = {
        title: "🧪 Test Notification",
        message:
          "This is a test notification to verify the delivery system is working correctly.",
        type: "system",
        priority: "low",
        recipients: [{userId: req.user.id}],
        metadata: {
          source: "admin_test",
          tags: ["test", "delivery_check"],
        },
      };

      const result = await notificationService.createSystemNotification(
        testData
      );

      if (result.success) {
        res.json({
          success: true,
          message: "Test notification sent successfully",
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Test notification failed: ${result.error}`,
        });
      }
    } catch (error) {
      console.error("❌ Test notification delivery error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send test notification",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }
}

module.exports = new NotificationController();
