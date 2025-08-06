const mongoose = require("mongoose");
const Message = require("../models/Message");
const notificationService = require("../services/notificationService"); // ✅ ADD THIS IMPORT
const Company = require("../models/Company");
// ✅ UPDATED: Helper function to safely get models
const getModel = (modelName) => {
  try {
    return require(`../models/${modelName}`);
  } catch (error) {
    console.warn(`Model ${modelName} not found:`, error.message);
    return null;
  }
};

// =============================================================================
// UTILITY & HEALTH CHECK ENDPOINTS
// =============================================================================

const healthCheck = async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    // Check message collection
    const messageCount = await Message.countDocuments({});

    // Check socket manager
    const socketManager = req.app.get("socketManager");
    const socketStats = socketManager ? socketManager.getStats() : null;

    res.json({
      success: true,
      message: "Chat service is healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      database: {
        status: dbStates[dbState],
        readyState: dbState,
        totalMessages: messageCount,
      },
      services: {
        messaging: "operational",
        websocket: socketManager ? "operational" : "disabled",
        storage: "operational",
        companyChat: "operational",
      },
      socket: socketStats,
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
    });
  }
};
// ✅ ENHANCED: Get chat statistics with company-specific metrics
const getChatStats = async (req, res) => {
  try {
    const {companyId} = req.user;
    const {period = "30d"} = req.query;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case "1d":
        startDate.setDate(now.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // ✅ UPDATED: Enhanced stats for company-to-company chat
    const [
      totalMessages,
      unreadMessages,
      sentMessages,
      receivedMessages,
      activeConversations,
      messagesByType,
      companyInteractions,
      recentMessages,
      todayMessages,
      weekMessages,
    ] = await Promise.all([
      // Total messages
      Message.countDocuments({
        $or: [
          {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
          {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
        ],
        isDeleted: false,
        createdAt: {$gte: startDate},
      }),

      // Unread messages
      Message.countDocuments({
        receiverCompanyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
        status: {$ne: "read"},
      }),

      // Sent messages
      Message.countDocuments({
        senderCompanyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
        createdAt: {$gte: startDate},
      }),

      // Received messages
      Message.countDocuments({
        receiverCompanyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
        createdAt: {$gte: startDate},
      }),

      // Active conversations (unique companies)
      Message.aggregate([
        {
          $match: {
            $or: [
              {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
              {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
            ],
            isDeleted: false,
            createdAt: {$gte: startDate},
          },
        },
        {
          $addFields: {
            otherCompanyId: {
              $cond: {
                if: {
                  $eq: [
                    "$senderCompanyId",
                    new mongoose.Types.ObjectId(companyId),
                  ],
                },
                then: "$receiverCompanyId",
                else: "$senderCompanyId",
              },
            },
          },
        },
        {
          $group: {
            _id: "$otherCompanyId",
          },
        },
        {
          $count: "total",
        },
      ]),

      // Messages by type
      Message.aggregate([
        {
          $match: {
            $or: [
              {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
              {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
            ],
            isDeleted: false,
            createdAt: {$gte: startDate},
          },
        },
        {$group: {_id: "$messageType", count: {$sum: 1}}},
      ]),

      // Company interactions
      Message.aggregate([
        {
          $match: {
            $or: [
              {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
              {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
            ],
            isDeleted: false,
            createdAt: {$gte: startDate},
          },
        },
        {
          $addFields: {
            otherCompanyId: {
              $cond: {
                if: {
                  $eq: [
                    "$senderCompanyId",
                    new mongoose.Types.ObjectId(companyId),
                  ],
                },
                then: "$receiverCompanyId",
                else: "$senderCompanyId",
              },
            },
          },
        },
        {
          $group: {
            _id: "$otherCompanyId",
            messageCount: {$sum: 1},
            lastMessageAt: {$max: "$createdAt"},
          },
        },
        {
          $lookup: {
            from: "companies",
            localField: "_id",
            foreignField: "_id",
            as: "company",
          },
        },
        {
          $unwind: {
            path: "$company",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            companyId: "$_id",
            companyName: "$company.businessName",
            messageCount: 1,
            lastMessageAt: 1,
          },
        },
        {$sort: {lastMessageAt: -1}},
        {$limit: 10},
      ]),

      // Recent messages
      Message.find({
        $or: [
          {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
          {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
        ],
        isDeleted: false,
      })
        .sort({createdAt: -1})
        .limit(10)
        .populate("senderId", "username fullName")
        .lean(),

      // Today's messages
      Message.countDocuments({
        $or: [
          {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
          {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
        ],
        isDeleted: false,
        createdAt: {$gte: new Date().setHours(0, 0, 0, 0)},
      }),

      // Week's messages
      Message.countDocuments({
        $or: [
          {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
          {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
        ],
        isDeleted: false,
        createdAt: {$gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)},
      }),
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange: {startDate, endDate: now},
        totalMessages,
        unreadMessages,
        sentMessages,
        receivedMessages,
        activeConversations: activeConversations[0]?.total || 0,
        todayMessages,
        weekMessages,
        messagesByType,
        companyInteractions,
        recentMessages,
        responseRate:
          sentMessages > 0
            ? (
                (sentMessages / (sentMessages + receivedMessages)) *
                100
              ).toFixed(1)
            : 0,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get chat stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat statistics",
      error: error.message,
    });
  }
};

const sendMessageNotifications = async (
  message,
  senderCompanyId,
  receiverCompanyId,
  originalPartyId,
  partyName
) => {
  try {
    const [senderCompany, receiverCompany] = await Promise.all([
      getModel("Company")
        ?.findById(senderCompanyId)
        .select("businessName email"),
      getModel("Company")
        ?.findById(receiverCompanyId)
        .select("businessName email"),
    ]);

    if (!senderCompany || !receiverCompany) {
      console.warn("⚠️ Companies not found for notification");
      return;
    }

    // Check if this is the first message between these companies
    const existingMessagesCount = await Message.countDocuments({
      $or: [
        {senderCompanyId, receiverCompanyId},
        {
          senderCompanyId: receiverCompanyId,
          receiverCompanyId: senderCompanyId,
        },
      ],
    });

    // Prepare original party info if available
    const originalPartyInfo = originalPartyId
      ? {
          partyId: originalPartyId,
          partyName: partyName,
        }
      : null;

    // Check if message is urgent
    const isUrgent = notificationService.isUrgentMessage(message.content);

    if (existingMessagesCount === 1) {
      // First message - notify about new conversation
      const conversationResult =
        await notificationService.notifyNewBusinessConversation(
          senderCompany,
          receiverCompany,
          message,
          originalPartyInfo
        );
    } else if (isUrgent) {
      // Urgent message notification
      const urgentResult = await notificationService.notifyUrgentChatMessage(
        message,
        senderCompany,
        receiverCompany,
        "urgent_keywords"
      );
    } else {
      // Regular message notification
      const messageResult =
        await notificationService.notifyNewCompanyChatMessage(
          message,
          senderCompany,
          receiverCompany,
          originalPartyInfo
        );
    }
  } catch (error) {
    console.error("❌ Notification error:", error.message);
  }
};

// =============================================================================
// CONVERSATION MANAGEMENT
// =============================================================================

// ✅ UPDATED: Get conversations list for company-to-company chat
const getConversations = async (req, res) => {
  try {
    const {companyId} = req.user;
    const {page = 1, limit = 20, search, messageType, type} = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ✅ UPDATED: Build match conditions for company-to-company chat
    const matchConditions = {
      $or: [
        {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
        {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
      ],
      isDeleted: false,
    };

    if (messageType) {
      matchConditions.messageType = messageType;
    }

    // ✅ UPDATED: Get unique companies with their latest messages
    const conversations = await Message.aggregate([
      {
        $match: matchConditions,
      },
      {
        $sort: {createdAt: -1},
      },
      {
        $addFields: {
          otherCompanyId: {
            $cond: {
              if: {
                $eq: [
                  "$senderCompanyId",
                  new mongoose.Types.ObjectId(companyId),
                ],
              },
              then: "$receiverCompanyId",
              else: "$senderCompanyId",
            },
          },
        },
      },
      {
        $group: {
          _id: "$otherCompanyId",
          lastMessage: {$first: "$$ROOT"},
          totalMessages: {$sum: 1},
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$receiverCompanyId",
                        new mongoose.Types.ObjectId(companyId),
                      ],
                    },
                    {$ne: ["$status", "read"]},
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastMessageAt: {$first: "$createdAt"},
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: search
          ? {
              $or: [
                {"company.businessName": {$regex: search, $options: "i"}},
                {"company.email": {$regex: search, $options: "i"}},
                {"company.phoneNumber": {$regex: search, $options: "i"}},
              ],
            }
          : {},
      },
      {
        $project: {
          companyId: "$_id",
          company: 1,
          lastMessage: 1,
          totalMessages: 1,
          unreadCount: 1,
          lastMessageAt: 1,
        },
      },
      {
        $sort: {lastMessageAt: -1},
      },
      {$skip: skip},
      {$limit: parseInt(limit)},
    ]);

    // Get total count
    const totalConversationsResult = await Message.aggregate([
      {
        $match: matchConditions,
      },
      {
        $addFields: {
          otherCompanyId: {
            $cond: {
              if: {
                $eq: [
                  "$senderCompanyId",
                  new mongoose.Types.ObjectId(companyId),
                ],
              },
              then: "$receiverCompanyId",
              else: "$senderCompanyId",
            },
          },
        },
      },
      {
        $group: {
          _id: "$otherCompanyId",
        },
      },
      {
        $count: "total",
      },
    ]);

    const totalConversations = totalConversationsResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        conversations,
        chatType: "company-to-company",
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalConversations / parseInt(limit)),
          totalConversations,
          hasMore: skip + conversations.length < totalConversations,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get conversations",
      error: error.message,
    });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const {partyId} = req.params; // This is the other company ID
    const {companyId, userId} = req.user;
    const {
      page = 1,
      limit = 50,
      messageType,
      startDate,
      endDate,
      type,
      partyId: originalPartyId,
      partyName,
    } = req.query;

    // ✅ ENHANCED: Comprehensive validation
    if (!partyId) {
      return res.status(400).json({
        success: false,
        message: "Party ID is required in URL params",
        code: "MISSING_PARTY_ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid party ID format",
        code: "INVALID_PARTY_ID_FORMAT",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company context required",
        code: "MISSING_COMPANY_CONTEXT",
      });
    }

    // ✅ PREVENT: Self-chat
    if (companyId === partyId) {
      return res.status(400).json({
        success: false,
        message: "Cannot chat with your own company",
        code: "SELF_CHAT_ATTEMPT",
      });
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const myCompanyObjectId = new mongoose.Types.ObjectId(companyId);
    const targetCompanyObjectId = new mongoose.Types.ObjectId(partyId);

    // ✅ ENHANCED: Build optimized query
    const matchQuery = {
      $or: [
        {
          senderCompanyId: myCompanyObjectId,
          receiverCompanyId: targetCompanyObjectId,
        },
        {
          senderCompanyId: targetCompanyObjectId,
          receiverCompanyId: myCompanyObjectId,
        },
      ],
      isDeleted: false,
    };

    // Add optional filters
    if (messageType) {
      matchQuery.messageType = messageType;
    }

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        try {
          matchQuery.createdAt.$gte = new Date(startDate);
        } catch (dateError) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date format",
            code: "INVALID_START_DATE",
          });
        }
      }
      if (endDate) {
        try {
          matchQuery.createdAt.$lte = new Date(endDate);
        } catch (dateError) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date format",
            code: "INVALID_END_DATE",
          });
        }
      }
    }

    // ✅ ENHANCED: Execute query with parallel operations
    const [messages, totalMessages, otherCompany] = await Promise.all([
      // Get messages with proper sorting and population
      Message.find(matchQuery)
        .sort({createdAt: -1})
        .skip(skip)
        .limit(parseInt(limit))
        .populate("senderId", "username fullName email")
        .populate("senderCompanyId", "businessName")
        .populate("receiverCompanyId", "businessName")
        .lean(),

      // Get total count
      Message.countDocuments(matchQuery),

      // Get other company info
      getModel("Company")
        ?.findById(targetCompanyObjectId)
        .select("businessName email phoneNumber")
        .lean(),
    ]);

    // Reverse messages to show oldest first (chronological order)
    messages.reverse();

    // ✅ ENHANCED: Mark notifications as read (async)
    setImmediate(async () => {
      try {
        await markChatNotificationsAsRead(userId, companyId, partyId);
      } catch (notificationError) {
        console.warn(
          "⚠️ Failed to mark notifications as read:",
          notificationError.message
        );
      }
    });

    // ✅ ENHANCED: Calculate pagination info
    const currentPage = parseInt(page);
    const totalPages = Math.ceil(totalMessages / parseInt(limit));
    const hasMore = skip + messages.length < totalMessages;

    const response = {
      success: true,
      data: {
        messages,
        otherCompanyId: partyId,
        otherCompany,
        originalPartyId,
        originalPartyName: partyName,
        chatType: "company-to-company",
        pagination: {
          currentPage,
          totalPages,
          totalMessages,
          hasMore,
          limit: parseInt(limit),
          messagesInPage: messages.length,
        },
        queryInfo: {
          myCompanyId: companyId,
          targetCompanyId: partyId,
          messageType: messageType || null,
          dateRange: {
            startDate: startDate || null,
            endDate: endDate || null,
          },
        },
        notificationInfo: {
          notificationsProcessed: true,
          conversationMarkedAsRead: true,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("❌ Get chat history error:", {
      message: error.message,
      stack: error.stack,
      params: req.params,
      query: req.query,
      user: req.user,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve chat history",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      code: "CHAT_HISTORY_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ UPDATED: Get conversation summary for company-to-company chat
const getConversationSummary = async (req, res) => {
  try {
    const {partyId} = req.params; // Other company ID
    const {companyId} = req.user;
    const {type} = req.query;

    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
    }

    // ✅ UPDATED: Query for company-to-company messages
    const query = {
      $or: [
        {
          senderCompanyId: new mongoose.Types.ObjectId(companyId),
          receiverCompanyId: new mongoose.Types.ObjectId(partyId),
        },
        {
          senderCompanyId: new mongoose.Types.ObjectId(partyId),
          receiverCompanyId: new mongoose.Types.ObjectId(companyId),
        },
      ],
      isDeleted: false,
    };

    const [
      totalMessages,
      unreadCount,
      sentByMe,
      receivedByMe,
      firstMessage,
      lastMessage,
      messageTypes,
    ] = await Promise.all([
      Message.countDocuments(query),
      Message.countDocuments({
        ...query,
        receiverCompanyId: new mongoose.Types.ObjectId(companyId),
        status: {$ne: "read"},
      }),
      Message.countDocuments({
        ...query,
        senderCompanyId: new mongoose.Types.ObjectId(companyId),
      }),
      Message.countDocuments({
        ...query,
        receiverCompanyId: new mongoose.Types.ObjectId(companyId),
      }),
      Message.findOne(query)
        .sort({createdAt: 1})
        .populate("senderId", "username fullName")
        .lean(),
      Message.findOne(query)
        .sort({createdAt: -1})
        .populate("senderId", "username fullName")
        .lean(),
      Message.distinct("messageType", query),
    ]);

    // Get company information
    const Company = getModel("Company");
    let otherCompany = null;
    if (Company) {
      otherCompany = await Company.findById(partyId)
        .select("businessName email phoneNumber")
        .lean();
    }

    res.json({
      success: true,
      data: {
        otherCompanyId: partyId,
        otherCompany,
        totalMessages,
        unreadCount,
        sentByMe,
        receivedByMe,
        firstMessage,
        lastMessage,
        messageTypes,
        conversationStarted: firstMessage?.createdAt || null,
        lastActivity: lastMessage?.createdAt || null,
        chatType: "company-to-company",
        responseRate:
          totalMessages > 0 ? ((sentByMe / totalMessages) * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error("Get conversation summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get conversation summary",
      error: error.message,
    });
  }
};

// ✅ NEW: Get chat notification summary
const getChatNotificationSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Get unread chat notifications count
    const unreadResult = await notificationService.getUserNotifications({
      userId: userId,
      companyId: companyId,
      type: "chat",
      unreadOnly: true,
      limit: 100,
    });

    let unreadChatCount = 0;
    let conversationSummary = {};

    if (unreadResult.success) {
      unreadChatCount = unreadResult.data.notifications.length;

      // Group by sender company
      unreadResult.data.notifications.forEach((notification) => {
        const senderCompanyId =
          notification.relatedTo?.entityData?.senderCompanyId;
        const senderCompanyName =
          notification.relatedTo?.entityData?.senderCompanyName;

        if (senderCompanyId) {
          if (!conversationSummary[senderCompanyId]) {
            conversationSummary[senderCompanyId] = {
              companyName: senderCompanyName,
              unreadCount: 0,
              lastMessage: null,
              lastMessageTime: null,
            };
          }

          conversationSummary[senderCompanyId].unreadCount++;

          // Update last message info if this is more recent
          if (
            !conversationSummary[senderCompanyId].lastMessageTime ||
            new Date(notification.createdAt) >
              new Date(conversationSummary[senderCompanyId].lastMessageTime)
          ) {
            conversationSummary[senderCompanyId].lastMessage =
              notification.message;
            conversationSummary[senderCompanyId].lastMessageTime =
              notification.createdAt;
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        totalUnreadChats: unreadChatCount,
        conversationSummary: Object.values(conversationSummary),
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Get chat notification summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat notification summary",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

const markChatNotificationsAsRead = async (
  userId,
  companyId,
  conversationCompanyId
) => {
  try {
    const notificationResult = await notificationService.getUserNotifications({
      userId: userId,
      companyId: companyId,
      type: "chat",
      unreadOnly: true,
      limit: 100,
    });

    if (
      notificationResult.success &&
      notificationResult.data.notifications.length > 0
    ) {
      const conversationNotifications =
        notificationResult.data.notifications.filter((notification) => {
          const relatedData = notification.relatedTo?.entityData;
          return (
            relatedData?.senderCompanyId === conversationCompanyId ||
            relatedData?.receiverCompanyId === conversationCompanyId ||
            notification.metadata?.senderCompanyId === conversationCompanyId
          );
        });

      let markedCount = 0;
      for (const notification of conversationNotifications) {
        try {
          const markResult = await notificationService.markNotificationAsRead(
            notification.id,
            userId,
            {
              device: "chat_view",
              ipAddress: "server",
              action: "viewed_chat_messages",
              conversationId: conversationCompanyId,
            }
          );

          if (markResult.success) {
            markedCount++;
          }
        } catch (markError) {
          console.warn(
            `⚠️ Failed to mark notification ${notification.id}:`,
            markError.message
          );
        }
      }
      return {success: true, markedCount};
    }

    return {success: true, markedCount: 0};
  } catch (error) {
    console.error("❌ Error marking notifications as read:", error.message);
    return {success: false, error: error.message};
  }
};

// ✅ NEW: Mark conversation as read
const markConversationAsRead = async (req, res) => {
  try {
    const {partyId} = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    if (!partyId) {
      return res.status(400).json({
        success: false,
        message: "Party ID is required",
      });
    }

    // Get all unread chat notifications for this conversation
    const notificationResult = await notificationService.getUserNotifications({
      userId: userId,
      companyId: companyId,
      type: "chat",
      unreadOnly: true,
      limit: 100,
    });

    let markedCount = 0;

    if (notificationResult.success) {
      // Filter notifications for this specific conversation
      const conversationNotifications =
        notificationResult.data.notifications.filter((notification) => {
          const relatedData = notification.relatedTo?.entityData;
          return (
            relatedData?.senderCompanyId === partyId ||
            notification.metadata?.senderCompanyId === partyId
          );
        });

      // Mark each notification as read
      for (const notification of conversationNotifications) {
        const result = await notificationService.markNotificationAsRead(
          notification.id,
          userId,
          {
            device: req.get("User-Agent") || "unknown",
            ipAddress: req.ip || "unknown",
            action: "marked_conversation_read",
          }
        );

        if (result.success) {
          markedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Marked ${markedCount} notifications as read`,
      data: {
        markedCount,
        conversationId: partyId,
      },
    });
  } catch (error) {
    console.error("❌ Mark conversation as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark conversation as read",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
// ✅ NEW: Get detailed chat notifications
const getChatNotificationDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    const {page = 1, limit = 20, unreadOnly = false} = req.query;

    // Get chat notifications with details
    const notificationResult = await notificationService.getUserNotifications({
      userId: userId,
      companyId: companyId,
      type: "chat",
      unreadOnly: unreadOnly === "true",
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    if (!notificationResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to get chat notifications",
        error: notificationResult.error,
      });
    }

    // Enhance notifications with additional chat context
    const enhancedNotifications = notificationResult.data.notifications.map(
      (notification) => ({
        ...notification,
        chatType: "company-to-company",
        senderCompanyName:
          notification.relatedTo?.entityData?.senderCompanyName,
        messagePreview: notification.relatedTo?.entityData?.messageContent,
        urgencyLevel: notification.metadata?.urgencyLevel || "normal",
        hasPartyContext: notification.metadata?.hasPartyContext || false,
        originalPartyName:
          notification.relatedTo?.entityData?.originalPartyName,
      })
    );

    res.json({
      success: true,
      data: {
        notifications: enhancedNotifications,
        pagination: notificationResult.data.pagination,
        summary: {
          total: notificationResult.data.pagination.totalItems,
          unread: enhancedNotifications.filter((n) => !n.isRead).length,
          chatType: "company-to-company",
        },
      },
    });
  } catch (error) {
    console.error("❌ Get chat notification details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat notification details",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
// ✅ NEW: Bulk mark chat notifications as read
const bulkMarkChatNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    const {notificationIds, markAll = false} = req.body;

    let markedCount = 0;

    if (markAll) {
      // Mark all chat notifications as read
      const result = await notificationService.markAllNotificationsAsRead(
        userId,
        companyId,
        {
          device: req.get("User-Agent") || "unknown",
          ipAddress: req.ip || "unknown",
          action: "bulk_mark_all_chat_read",
        }
      );

      if (result.success) {
        markedCount = result.data.markedCount;
      }
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      for (const notificationId of notificationIds) {
        const result = await notificationService.markNotificationAsRead(
          notificationId,
          userId,
          {
            device: req.get("User-Agent") || "unknown",
            ipAddress: req.ip || "unknown",
            action: "bulk_mark_specific_read",
          }
        );

        if (result.success) {
          markedCount++;
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either set markAll to true or provide notificationIds array",
      });
    }

    res.json({
      success: true,
      message: `Marked ${markedCount} chat notifications as read`,
      data: {
        markedCount,
        action: markAll ? "mark_all" : "mark_specific",
      },
    });
  } catch (error) {
    console.error("❌ Bulk mark chat notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark chat notifications as read",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// =============================================================================
// MESSAGE OPERATIONS
// =============================================================================

const sendMessage = async (req, res) => {
  try {
    const {partyId} = req.params; // Target company ID
    const {companyId, userId} = req.user;
    const {
      content,
      messageType = "website", // ✅ UPDATED: Default to "website" for web interface
      templateId,
      attachments = [],
      type,
      partyId: originalPartyId,
      partyName,
      tempId,
    } = req.body;

    // ✅ ENHANCED: Comprehensive validation
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID format",
        code: "INVALID_COMPANY_ID",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
        code: "MISSING_CONTENT",
      });
    }

    if (content.trim().length > 4000) {
      return res.status(400).json({
        success: false,
        message: "Message content too long (max 4000 characters)",
        code: "CONTENT_TOO_LONG",
      });
    }

    if (companyId === partyId) {
      return res.status(400).json({
        success: false,
        message: "Cannot send message to the same company",
        code: "SELF_MESSAGE_ATTEMPT",
      });
    }

    // ✅ VALIDATION: Check if messageType is valid
    const validMessageTypes = [
      "whatsapp",
      "sms",
      "email",
      "internal",
      "website",
    ];
    if (!validMessageTypes.includes(messageType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid message type. Must be one of: ${validMessageTypes.join(
          ", "
        )}`,
        code: "INVALID_MESSAGE_TYPE",
      });
    }

    // ✅ ENHANCED: Validate target company exists
    const targetCompany = await getModel("Company")
      ?.findById(partyId)
      .select("businessName isActive");
    if (!targetCompany) {
      return res.status(404).json({
        success: false,
        message: "Target company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    if (!targetCompany.isActive) {
      return res.status(400).json({
        success: false,
        message: "Target company is inactive",
        code: "COMPANY_INACTIVE",
      });
    }

    // ✅ ENHANCED: Message data with proper messageType handling
    const messageData = {
      senderCompanyId: new mongoose.Types.ObjectId(companyId),
      receiverCompanyId: new mongoose.Types.ObjectId(partyId),
      senderId: new mongoose.Types.ObjectId(userId),
      senderType: "company",
      content: content.trim(),
      messageType, // ✅ Will now accept "website"
      platform: messageType === "website" ? "internal" : messageType, // ✅ Map platform correctly
      templateId: templateId || null,
      attachments: Array.isArray(attachments) ? attachments : [],
      direction: "outbound",
      status: "sent",
      chatType: "company-to-company",
      createdBy: new mongoose.Types.ObjectId(userId),
      metadata: {
        originalPartyId: originalPartyId || null,
        partyName: partyName || null,
        chatType: "company-to-company",
        tempId: tempId || null,
        userAgent: req.get("User-Agent") || "unknown",
        ipAddress: req.ip || "unknown",
        originalMessageType: messageType, // ✅ Store original messageType
      },
    };

    // ✅ CREATE: Message in database
    const message = await Message.create(messageData);

    // ✅ POPULATE: Message for response
    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "username fullName email")
      .populate("senderCompanyId", "businessName email phoneNumber")
      .populate("receiverCompanyId", "businessName email phoneNumber")
      .lean();

    // ✅ NOTIFICATION: Send notifications (async, don't block response)
    setImmediate(async () => {
      try {
        await sendMessageNotifications(
          populatedMessage,
          companyId,
          partyId,
          originalPartyId,
          partyName
        );
      } catch (notificationError) {
        console.warn(
          "⚠️ Notification failed for chat message:",
          notificationError.message
        );
      }
    });

    // ✅ WEBSOCKET: Broadcast message
    const socketManager = req.app.get("socketManager");
    if (socketManager) {
      try {
        const broadcastData = {
          _id: populatedMessage._id,
          id: populatedMessage._id,
          senderCompanyId:
            populatedMessage.senderCompanyId?._id ||
            populatedMessage.senderCompanyId,
          receiverCompanyId:
            populatedMessage.receiverCompanyId?._id ||
            populatedMessage.receiverCompanyId,
          senderId: populatedMessage.senderId,
          content: populatedMessage.content,
          messageType: populatedMessage.messageType,
          platform: populatedMessage.platform,
          createdAt: populatedMessage.createdAt,
          status: populatedMessage.status,
          direction: populatedMessage.direction,
          chatType: "company-to-company",
          senderCompanyName: populatedMessage.senderCompanyId?.businessName,
          receiverCompanyName: populatedMessage.receiverCompanyId?.businessName,
          senderName:
            populatedMessage.senderId?.fullName ||
            populatedMessage.senderId?.username,
          tempId: populatedMessage.metadata?.tempId,
          metadata: populatedMessage.metadata,
          timestamp: populatedMessage.createdAt,
        };

        const broadcastSuccess = socketManager.sendToCompanyChat(
          companyId,
          partyId,
          "new_message",
          broadcastData
        );
      } catch (socketError) {
        console.warn("⚠️ Socket broadcast error:", socketError.message);
      }
    }

    // ✅ RESPONSE: Send success response
    res.status(201).json({
      success: true,
      data: {
        _id: populatedMessage._id,
        id: populatedMessage._id,
        senderCompanyId:
          populatedMessage.senderCompanyId?._id ||
          populatedMessage.senderCompanyId,
        receiverCompanyId:
          populatedMessage.receiverCompanyId?._id ||
          populatedMessage.receiverCompanyId,
        senderId: populatedMessage.senderId,
        content: populatedMessage.content,
        messageType: populatedMessage.messageType,
        platform: populatedMessage.platform,
        createdAt: populatedMessage.createdAt,
        status: populatedMessage.status,
        direction: populatedMessage.direction,
        tempId: populatedMessage.metadata?.tempId,
        chatType: "company-to-company",
      },
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("❌ Send message error:", {
      message: error.message,
      stack: error.stack,
      params: req.params,
      body: req.body,
      user: req.user,
    });

    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      code: "SEND_MESSAGE_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ UPDATED: Mark messages as read for company chat
const markMessagesAsRead = async (req, res) => {
  try {
    const {messageIds} = req.body;
    const {userId, companyId} = req.user;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message IDs array is required",
      });
    }

    const validIds = messageIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid message IDs provided",
      });
    }

    // ✅ UPDATED: Only mark messages where current company is receiver
    const result = await Message.updateMany(
      {
        _id: {$in: validIds.map((id) => new mongoose.Types.ObjectId(id))},
        receiverCompanyId: new mongoose.Types.ObjectId(companyId),
        status: {$ne: "read"},
      },
      {
        status: "read",
        readAt: new Date(),
        readBy: new mongoose.Types.ObjectId(userId),
      }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        messageIds: validIds,
      },
      message: "Messages marked as read successfully",
    });
  } catch (error) {
    console.error("Mark messages as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};

// ✅ UPDATED: Get unread message count for company chat
const getUnreadCount = async (req, res) => {
  try {
    const {companyId} = req.user;
    const {partyId, type} = req.query;

    // ✅ UPDATED: Query for company-to-company unread messages
    const query = {
      receiverCompanyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false,
      status: {$ne: "read"},
    };

    if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
      query.senderCompanyId = new mongoose.Types.ObjectId(partyId);
    }

    const count = await Message.countDocuments(query);

    res.json({
      success: true,
      data: {
        unreadCount: count,
        companyId,
        otherCompanyId: partyId || null,
        chatType: "company-to-company",
      },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread count",
      error: error.message,
    });
  }
};

// ✅ UPDATED: Search messages for company chat
const searchMessages = async (req, res) => {
  try {
    const {companyId} = req.user;
    const {
      query: searchQuery,
      partyId,
      messageType,
      page = 1,
      limit = 20,
      startDate,
      endDate,
      type,
    } = req.query;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // ✅ UPDATED: Build query for company-to-company search
    const query = {
      $or: [
        {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
        {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
      ],
      isDeleted: false,
      content: {$regex: searchQuery, $options: "i"},
    };

    if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
      query.$or = [
        {
          senderCompanyId: new mongoose.Types.ObjectId(companyId),
          receiverCompanyId: new mongoose.Types.ObjectId(partyId),
        },
        {
          senderCompanyId: new mongoose.Types.ObjectId(partyId),
          receiverCompanyId: new mongoose.Types.ObjectId(companyId),
        },
      ];
    }

    if (messageType) {
      query.messageType = messageType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find(query)
      .sort({createdAt: -1})
      .skip(skip)
      .limit(parseInt(limit))
      .populate("senderId", "username fullName email")
      .lean();

    const totalMessages = await Message.countDocuments(query);

    res.json({
      success: true,
      data: {
        messages,
        searchQuery,
        chatType: "company-to-company",
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / parseInt(limit)),
          totalMessages,
          hasMore: skip + messages.length < totalMessages,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Search messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search messages",
      error: error.message,
    });
  }
};

// Delete messages (unchanged)
const deleteMessages = async (req, res) => {
  try {
    const {messageIds} = req.body;
    const {userId} = req.user;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message IDs array is required",
      });
    }

    const validIds = messageIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid message IDs provided",
      });
    }

    const result = await Message.updateMany(
      {_id: {$in: validIds.map((id) => new mongoose.Types.ObjectId(id))}},
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: new mongoose.Types.ObjectId(userId),
      }
    );

    res.json({
      success: true,
      data: {
        deletedCount: result.modifiedCount,
        messageIds: validIds,
      },
      message: "Messages deleted successfully",
    });
  } catch (error) {
    console.error("Delete messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete messages",
      error: error.message,
    });
  }
};

// =============================================================================
// TEMPLATE MANAGEMENT
// =============================================================================

const getMessageTemplates = async (req, res) => {
  try {
    const {partyId} = req.params; // Other company ID
    const {companyId} = req.user;
    const {category, messageType, type} = req.query;

    // ✅ UPDATED: Enhanced templates for company-to-company chat
    const templates = {
      business: {
        meeting_request: {
          title: "Meeting Request",
          content:
            "Hi {{companyName}}, we'd like to schedule a meeting to discuss business opportunities. Are you available on {{date}} at {{time}}?",
          variables: ["companyName", "date", "time"],
        },
        proposal_follow_up: {
          title: "Proposal Follow-up",
          content:
            "Dear {{companyName}}, we sent you a business proposal on {{date}}. Could you please review and share your feedback?",
          variables: ["companyName", "date"],
        },
        partnership_inquiry: {
          title: "Partnership Inquiry",
          content:
            "Hello {{companyName}}, we're interested in exploring partnership opportunities. Would you be open to a discussion?",
          variables: ["companyName"],
        },
      },
      payment: {
        payment_reminder: {
          title: "Payment Reminder",
          content:
            "Dear {{companyName}}, your payment of ₹{{amount}} is due on {{dueDate}}. Please process the payment to avoid late fees.",
          variables: ["companyName", "amount", "dueDate"],
        },
        payment_received: {
          title: "Payment Received",
          content:
            "Thank you {{companyName}}! We've received your payment of ₹{{amount}} for invoice #{{invoiceNumber}}.",
          variables: ["companyName", "amount", "invoiceNumber"],
        },
        payment_overdue: {
          title: "Payment Overdue",
          content:
            "Dear {{companyName}}, your payment of ₹{{amount}} was due on {{dueDate}} and is now overdue. Please make the payment immediately.",
          variables: ["companyName", "amount", "dueDate"],
        },
      },
      invoice: {
        invoice_sent: {
          title: "Invoice Sent",
          content:
            "Hi {{companyName}}, we've sent you invoice #{{invoiceNumber}} for ₹{{amount}}. Please review and process the payment by {{dueDate}}.",
          variables: ["companyName", "invoiceNumber", "amount", "dueDate"],
        },
        invoice_approved: {
          title: "Invoice Approved",
          content:
            "Dear {{companyName}}, your invoice #{{invoiceNumber}} for ₹{{amount}} has been approved and payment will be processed soon.",
          variables: ["companyName", "invoiceNumber", "amount"],
        },
      },
      order: {
        order_confirmation: {
          title: "Order Confirmation",
          content:
            "Thank you {{companyName}}! Your order #{{orderNumber}} has been confirmed. Total amount: ₹{{amount}}. Expected delivery: {{deliveryDate}}.",
          variables: ["companyName", "orderNumber", "amount", "deliveryDate"],
        },
        order_shipped: {
          title: "Order Shipped",
          content:
            "Hi {{companyName}}, your order #{{orderNumber}} has been shipped. Tracking number: {{trackingNumber}}. Expected delivery: {{deliveryDate}}.",
          variables: [
            "companyName",
            "orderNumber",
            "trackingNumber",
            "deliveryDate",
          ],
        },
        order_delivered: {
          title: "Order Delivered",
          content:
            "Dear {{companyName}}, your order #{{orderNumber}} has been delivered. Thank you for your business!",
          variables: ["companyName", "orderNumber"],
        },
      },
      acknowledgment: {
        received_acknowledgment: {
          title: "Received Acknowledgment",
          content:
            "Hi {{companyName}}, we've received your {{documentType}} and will review it shortly. We'll get back to you within {{timeframe}}.",
          variables: ["companyName", "documentType", "timeframe"],
        },
        inquiry_response: {
          title: "Inquiry Response",
          content:
            "Dear {{companyName}}, thank you for your inquiry about {{subject}}. We'll prepare a detailed response and share it with you by {{date}}.",
          variables: ["companyName", "subject", "date"],
        },
      },
    };

    let filteredTemplates = templates;

    if (category) {
      filteredTemplates = {[category]: templates[category] || {}};
    }

    res.json({
      success: true,
      data: {
        templates: filteredTemplates,
        categories: Object.keys(templates),
        messageTypes: ["whatsapp", "sms", "email", "internal", "website"], // ✅ ADDED "website"
        otherCompanyId: partyId,
        chatType: "company-to-company",
      },
    });
  } catch (error) {
    console.error("Get message templates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get message templates",
      error: error.message,
    });
  }
};

const sendTemplateMessage = async (req, res) => {
  try {
    const {partyId, templateId} = req.params; // partyId is other company ID
    const {companyId, userId} = req.user;
    const {
      templateData = {},
      messageType = "website", // ✅ UPDATED: Default to "website"
      customContent,
      type,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
    }

    // ✅ VALIDATION: Check if messageType is valid
    const validMessageTypes = [
      "whatsapp",
      "sms",
      "email",
      "internal",
      "website",
    ];
    if (!validMessageTypes.includes(messageType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid message type. Must be one of: ${validMessageTypes.join(
          ", "
        )}`,
        code: "INVALID_MESSAGE_TYPE",
      });
    }

    // ✅ UPDATED: Get company information for template variables
    const Company = getModel("Company");
    let otherCompany = null;
    if (Company) {
      otherCompany = await Company.findById(partyId)
        .select("businessName email phoneNumber")
        .lean();
    }

    // Process template content
    let content = customContent;
    if (!content && templateId) {
      // ✅ UPDATED: Enhanced templates for company chat
      const templates = {
        meeting_request:
          "Hi {{companyName}}, we'd like to schedule a meeting to discuss business opportunities. Are you available on {{date}} at {{time}}?",
        proposal_follow_up:
          "Dear {{companyName}}, we sent you a business proposal on {{date}}. Could you please review and share your feedback?",
        partnership_inquiry:
          "Hello {{companyName}}, we're interested in exploring partnership opportunities. Would you be open to a discussion?",
        payment_reminder:
          "Dear {{companyName}}, your payment of ₹{{amount}} is due on {{dueDate}}. Please process the payment to avoid late fees.",
        payment_received:
          "Thank you {{companyName}}! We've received your payment of ₹{{amount}} for invoice #{{invoiceNumber}}.",
        invoice_sent:
          "Hi {{companyName}}, we've sent you invoice #{{invoiceNumber}} for ₹{{amount}}. Please review and process the payment by {{dueDate}}.",
        order_confirmation:
          "Thank you {{companyName}}! Your order #{{orderNumber}} has been confirmed. Total amount: ₹{{amount}}. Expected delivery: {{deliveryDate}}.",
        received_acknowledgment:
          "Hi {{companyName}}, we've received your {{documentType}} and will review it shortly. We'll get back to you within {{timeframe}}.",
      };

      content = templates[templateId] || "Template not found";

      // Replace company name
      if (otherCompany) {
        content = content.replace(
          /\{\{companyName\}\}/g,
          otherCompany.businessName || "Company"
        );
      }

      // Replace other variables from templateData
      Object.keys(templateData).forEach((key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        content = content.replace(regex, templateData[key]);
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    // ✅ UPDATED: Create message for company-to-company chat with proper messageType
    const messageData = {
      senderCompanyId: new mongoose.Types.ObjectId(companyId),
      receiverCompanyId: new mongoose.Types.ObjectId(partyId),
      senderId: new mongoose.Types.ObjectId(userId),
      senderType: "company",
      content: content.trim(),
      messageType, // ✅ Will now accept "website"
      platform: messageType === "website" ? "internal" : messageType, // ✅ Map platform correctly
      templateId,
      templateData,
      isTemplate: true,
      chatType: "company-to-company",
      direction: "outbound",
      status: "sent",
      createdBy: new mongoose.Types.ObjectId(userId),
      metadata: {
        isTemplate: true,
        templateId,
        originalMessageType: messageType,
      },
    };

    const message = await Message.create(messageData);

    // Populate the message for response
    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "username fullName email")
      .populate("senderCompanyId", "businessName")
      .populate("receiverCompanyId", "businessName")
      .lean();

    // ✅ UPDATED: Emit to company-to-company chat room
    const socketManager = req.app.get("socketManager");
    if (socketManager) {
      try {
        const broadcastData = {
          ...populatedMessage,
          id: populatedMessage._id,
          chatType: "company-to-company",
          isTemplate: true,
          templateId,
        };

        socketManager.sendToCompanyChat(
          companyId,
          partyId,
          "new_message",
          broadcastData
        );
      } catch (socketError) {
        console.warn("⚠️ Socket emission failed:", socketError.message);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        _id: populatedMessage._id,
        id: populatedMessage._id,
        content: populatedMessage.content,
        messageType: populatedMessage.messageType,
        platform: populatedMessage.platform,
        templateId: populatedMessage.templateId,
        isTemplate: true,
        createdAt: populatedMessage.createdAt,
        status: populatedMessage.status,
        chatType: "company-to-company",
      },
      message: "Template message sent successfully",
    });
  } catch (error) {
    console.error("Send template message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send template message",
      error: error.message,
    });
  }
};
// =============================================================================
// COMPANY-SPECIFIC FEATURES - ✅ NEW: Company interaction features
// =============================================================================

// ✅ NEW: Get company chat participants
const getCompanyChatParticipants = async (req, res) => {
  try {
    const {partyId} = req.params; // This is the other company ID
    const {companyId, userId} = req.user; // My company ID
    const {type} = req.query;

    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
    }

    // Get users who have sent/received messages in this company-to-company chat
    const participants = await Message.aggregate([
      {
        $match: {
          $or: [
            {
              senderCompanyId: new mongoose.Types.ObjectId(companyId),
              receiverCompanyId: new mongoose.Types.ObjectId(partyId),
            },
            {
              senderCompanyId: new mongoose.Types.ObjectId(partyId),
              receiverCompanyId: new mongoose.Types.ObjectId(companyId),
            },
          ],
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            userId: "$senderId",
            companyId: "$senderCompanyId",
          },
          lastMessageAt: {$max: "$createdAt"},
          messageCount: {$sum: 1},
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "_id.companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          userId: "$_id.userId",
          companyId: "$_id.companyId",
          username: "$user.username",
          fullName: "$user.fullName",
          email: "$user.email",
          companyName: "$company.businessName",
          lastMessageAt: 1,
          messageCount: 1,
        },
      },
      {
        $sort: {lastMessageAt: -1},
      },
    ]);

    // Get company information
    const Company = getModel("Company");
    let myCompany = null;
    let otherCompany = null;

    if (Company) {
      [myCompany, otherCompany] = await Promise.all([
        Company.findById(companyId)
          .select("businessName email phoneNumber")
          .lean(),
        Company.findById(partyId)
          .select("businessName email phoneNumber")
          .lean(),
      ]);
    }

    // Get active socket connections (if socket manager is available)
    const socketManager = req.app.get("socketManager");
    let onlineUsers = [];

    if (socketManager) {
      try {
        const myCompanyUsers = socketManager.getCompanyUsers(companyId);
        const otherCompanyUsers = socketManager.getCompanyUsers(partyId);
        onlineUsers = [...myCompanyUsers, ...otherCompanyUsers];
      } catch (error) {
        console.warn("Failed to get online users:", error.message);
      }
    }

    res.json({
      success: true,
      data: {
        participants,
        myCompany,
        otherCompany,
        onlineUsers,
        chatType: "company-to-company",
        totalParticipants: participants.length,
      },
    });
  } catch (error) {
    console.error("Get company chat participants error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get company chat participants",
      error: error.message,
    });
  }
};

// ✅ NEW: Get active company chats
const getActiveCompanyChats = async (req, res) => {
  try {
    const {companyId} = req.user;
    const {type, page = 1, limit = 20} = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get companies that have active chats with current company
    const activeChats = await Message.aggregate([
      {
        $match: {
          $or: [
            {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
            {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
          ],
          isDeleted: false,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      },
      {
        $addFields: {
          otherCompanyId: {
            $cond: {
              if: {
                $eq: [
                  "$senderCompanyId",
                  new mongoose.Types.ObjectId(companyId),
                ],
              },
              then: "$receiverCompanyId",
              else: "$senderCompanyId",
            },
          },
        },
      },
      {
        $group: {
          _id: "$otherCompanyId",
          lastMessageAt: {$max: "$createdAt"},
          totalMessages: {$sum: 1},
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$receiverCompanyId",
                        new mongoose.Types.ObjectId(companyId),
                      ],
                    },
                    {$ne: ["$status", "read"]},
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastMessage: {$first: "$$ROOT"},
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          companyId: "$_id",
          companyName: "$company.businessName",
          companyEmail: "$company.email",
          companyPhone: "$company.phoneNumber",
          lastMessageAt: 1,
          totalMessages: 1,
          unreadCount: 1,
          lastMessage: 1,
        },
      },
      {
        $sort: {lastMessageAt: -1},
      },
      {$skip: skip},
      {$limit: parseInt(limit)},
    ]);

    // Get total count
    const totalCount = await Message.aggregate([
      {
        $match: {
          $or: [
            {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
            {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
          ],
          isDeleted: false,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $addFields: {
          otherCompanyId: {
            $cond: {
              if: {
                $eq: [
                  "$senderCompanyId",
                  new mongoose.Types.ObjectId(companyId),
                ],
              },
              then: "$receiverCompanyId",
              else: "$senderCompanyId",
            },
          },
        },
      },
      {
        $group: {
          _id: "$otherCompanyId",
        },
      },
      {
        $count: "total",
      },
    ]);

    const total = totalCount[0]?.total || 0;

    res.json({
      success: true,
      data: {
        activeChats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalChats: total,
          hasMore: skip + activeChats.length < total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get active company chats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get active company chats",
      error: error.message,
    });
  }
};

// ✅ NEW: Get company chat analytics
const getCompanyChatAnalytics = async (req, res) => {
  try {
    const {partyId} = req.params; // Other company ID
    const {companyId} = req.user; // My company ID
    const {period = "7d"} = req.query;

    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
    }

    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case "1d":
        startDate.setDate(now.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const matchQuery = {
      $or: [
        {
          senderCompanyId: new mongoose.Types.ObjectId(companyId),
          receiverCompanyId: new mongoose.Types.ObjectId(partyId),
        },
        {
          senderCompanyId: new mongoose.Types.ObjectId(partyId),
          receiverCompanyId: new mongoose.Types.ObjectId(companyId),
        },
      ],
      isDeleted: false,
      createdAt: {$gte: startDate},
    };

    // Get message analytics
    const analytics = await Message.aggregate([
      {$match: matchQuery},
      {
        $group: {
          _id: null,
          totalMessages: {$sum: 1},
          sentByMe: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$senderCompanyId",
                    new mongoose.Types.ObjectId(companyId),
                  ],
                },
                1,
                0,
              ],
            },
          },
          receivedByMe: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$receiverCompanyId",
                    new mongoose.Types.ObjectId(companyId),
                  ],
                },
                1,
                0,
              ],
            },
          },
          messagesByType: {
            $push: "$messageType",
          },
          avgResponseTime: {$avg: "$responseTime"},
          firstMessageAt: {$min: "$createdAt"},
          lastMessageAt: {$max: "$createdAt"},
        },
      },
    ]);

    // Get daily message counts
    const dailyStats = await Message.aggregate([
      {$match: matchQuery},
      {
        $group: {
          _id: {
            date: {$dateToString: {format: "%Y-%m-%d", date: "$createdAt"}},
          },
          count: {$sum: 1},
          sentByMe: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$senderCompanyId",
                    new mongoose.Types.ObjectId(companyId),
                  ],
                },
                1,
                0,
              ],
            },
          },
          receivedByMe: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$receiverCompanyId",
                    new mongoose.Types.ObjectId(companyId),
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {$sort: {"_id.date": 1}},
    ]);

    // Get message type distribution
    const messageTypeStats = await Message.aggregate([
      {$match: matchQuery},
      {
        $group: {
          _id: "$messageType",
          count: {$sum: 1},
        },
      },
    ]);

    // Get company information
    const Company = getModel("Company");
    let otherCompany = null;

    if (Company) {
      otherCompany = await Company.findById(partyId)
        .select("businessName email")
        .lean();
    }

    const result = analytics[0] || {
      totalMessages: 0,
      sentByMe: 0,
      receivedByMe: 0,
      messagesByType: [],
      avgResponseTime: 0,
      firstMessageAt: null,
      lastMessageAt: null,
    };

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        otherCompany,
        summary: result,
        dailyStats,
        messageTypeStats,
        conversationHealth: {
          responseRate:
            result.totalMessages > 0
              ? (result.sentByMe / result.totalMessages) * 100
              : 0,
          avgResponseTime: result.avgResponseTime || 0,
          activeDays: dailyStats.length,
        },
      },
    });
  } catch (error) {
    console.error("Get company chat analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get company chat analytics",
      error: error.message,
    });
  }
};

// ✅ NEW: Get company online status
const getCompanyStatus = async (req, res) => {
  try {
    const {companyId} = req.params;
    const {userId} = req.user;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID format",
      });
    }

    // Get company information
    const Company = getModel("Company");
    let company = null;

    if (Company) {
      company = await Company.findById(companyId)
        .select("businessName email phoneNumber isActive")
        .lean();
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check if any users from this company are online (via socket manager)
    const socketManager = req.app.get("socketManager");
    let onlineUsers = [];
    let isOnline = false;

    if (socketManager) {
      try {
        onlineUsers = socketManager.getCompanyUsers(companyId);
        isOnline = onlineUsers.length > 0;
      } catch (error) {
        console.warn("Failed to get online status:", error.message);
      }
    }

    // Get last activity from messages
    const lastActivity = await Message.findOne({
      $or: [
        {senderCompanyId: new mongoose.Types.ObjectId(companyId)},
        {receiverCompanyId: new mongoose.Types.ObjectId(companyId)},
      ],
      isDeleted: false,
    })
      .sort({createdAt: -1})
      .select("createdAt")
      .lean();

    res.json({
      success: true,
      data: {
        companyId,
        company,
        isOnline,
        onlineUsers: onlineUsers.length,
        lastActivity: lastActivity?.createdAt || null,
        status: isOnline ? "online" : "offline",
        isActive: company.isActive,
      },
    });
  } catch (error) {
    console.error("Get company status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get company status",
      error: error.message,
    });
  }
};

// =============================================================================
// EXPORT ALL CONTROLLER METHODS
// =============================================================================

module.exports = {
  // Basic endpoints
  healthCheck,
  getChatStats,

  // Conversation management
  getConversations,
  getChatHistory,
  getConversationSummary,

  // Message operations
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  searchMessages,
  deleteMessages,

  // Template management
  getMessageTemplates,
  sendTemplateMessage,

  // Company-specific methods
  getCompanyChatParticipants,
  getActiveCompanyChats,
  getCompanyChatAnalytics,
  getCompanyStatus,

  // Chat notification methods
  getChatNotificationSummary,
  markConversationAsRead,
  getChatNotificationDetails,
  bulkMarkChatNotificationsAsRead,
};
