import React, {useState, useEffect, useRef} from "react";
import {
  Button,
  Form,
  InputGroup,
  Card,
  Badge,
  Spinner,
  Dropdown,
  Row,
  Col,
  Alert,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faComment,
  faComments,
  faEnvelope,
  faPhone,
  faPaperPlane,
  faTimes,
  faUser,
  faRobot,
  faCheck,
  faCheckDouble,
  faClock,
  faExclamationTriangle,
  faCommentDots,
  faSms,
  faFileInvoiceDollar,
  faMoneyBillWave,
  faCalendarAlt,
  faEllipsisV,
  faClipboardList,
  faHistory,
  faMobileAlt,
  faGlobe,
  faSync,
  faExclamationCircle,
  faCheckCircle,
  faBuilding,
  faUsers,
  faLink,
} from "@fortawesome/free-solid-svg-icons";

import chatService from "../../../services/chatService";

function PartyChat({show, onHide, party, paymentSummary, formatCurrency}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [messageType, setMessageType] = useState("whatsapp");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [conversationSummary, setConversationSummary] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const [currentCompany, setCurrentCompany] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatParticipants, setChatParticipants] = useState([]);

  const [targetCompanyId, setTargetCompanyId] = useState(null);
  const [mappingValidated, setMappingValidated] = useState(false);

  // ✅ FIX: Store unsubscribe functions
  const [socketUnsubscribeFns, setSocketUnsubscribeFns] = useState([]);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // ✅ FIX: Initialize company context
  useEffect(() => {
    const initializeCompanyContext = () => {
      try {
        const companyData = localStorage.getItem("currentCompany");
        if (companyData) {
          const company = JSON.parse(companyData);
          setCurrentCompany(company);

          const companyId = company._id || company.id;
          if (companyId) {
            chatService.setCompanyContext(companyId, company.businessName);
          }
        }
      } catch (error) {
        console.error("Error initializing company context:", error);
      }
    };

    initializeCompanyContext();
  }, []);

  // ✅ FIX: Validate party mapping when party changes
  useEffect(() => {
    if (party) {
      validatePartyCompanyMapping();
    } else {
      setMappingValidated(false);
      setTargetCompanyId(null);
    }
  }, [party?._id]);

  // ✅ FIX: Initialize chat when conditions are met
  useEffect(() => {
    if (show && party && currentCompany && mappingValidated) {
      initializeChat();
    }

    return () => {
      if (show) {
        cleanup();
      }
    };
  }, [show, party?._id, currentCompany?._id, mappingValidated]);

  const validatePartyCompanyMapping = () => {
    try {
      if (!party) {
        setMappingValidated(false);
        setTargetCompanyId(null);
        return;
      }

      console.log("🔍 Validating party company mapping for:", party);

      const extractedCompanyId = chatService.extractTargetCompanyId(party);

      if (!extractedCompanyId) {
        setError(
          "No linked company found for this party. This party cannot be used for company-to-company chat."
        );
        setMappingValidated(false);
        setTargetCompanyId(null);
        console.warn("❌ No company mapping found for party:", party);
        return;
      }

      console.log("✅ Company mapping validated:", extractedCompanyId);
      setTargetCompanyId(extractedCompanyId);
      setMappingValidated(true);
      setError(null);
    } catch (error) {
      console.error("❌ Party mapping validation error:", error);
      setError(error.message || "Failed to validate party-company mapping");
      setMappingValidated(false);
      setTargetCompanyId(null);
    }
  };

  // ✅ FIX: Improved chat initialization
  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🚀 Initializing chat for party:", party?.name);

      // ✅ FIX: Initialize socket first
      const socket = chatService.initializeSocket();
      if (socket) {
        console.log("✅ Socket initialized");

        // ✅ FIX: Wait for socket connection before proceeding
        await new Promise((resolve) => {
          if (chatService.isConnected) {
            resolve();
          } else {
            const unsubscribe = chatService.on("socket_authenticated", () => {
              unsubscribe();
              resolve();
            });

            // Timeout after 10 seconds
            setTimeout(() => {
              unsubscribe();
              resolve();
            }, 10000);
          }
        });

        setIsConnected(chatService.isConnected);
        setupSocketListeners();
      }

      // Load data in parallel
      await Promise.allSettled([
        loadChatHistory(),
        loadConversationSummary(),
        loadTemplates(),
        loadChatParticipants(),
      ]);

      // ✅ FIX: Join chat room if socket is connected
      if (party && chatService.isConnected) {
        try {
          console.log("🚀 Joining chat room...");
          const joinResult = await chatService.joinChat(party);
          console.log("✅ Joined chat room:", joinResult);
        } catch (joinError) {
          console.warn("⚠️ Failed to join chat room:", joinError);
          showToastMessage("Failed to join chat room", "warning");
        }
      }
    } catch (error) {
      console.error("❌ Failed to initialize chat:", error);
      setError("Failed to initialize chat. Please try again.");
      showToastMessage("Failed to initialize chat", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIX: Improved socket listeners setup
  const setupSocketListeners = () => {
    try {
      console.log("🎧 Setting up socket listeners...");

      // ✅ FIX: Clear existing listeners first
      cleanupSocketListeners();

      const unsubscribeFunctions = [];

      // ✅ FIX: Handle new messages
      const unsubscribeNewMessage = chatService.on("new_message", (message) => {
        console.log("📨 New message received:", message);
        try {
          const formattedMessage = formatIncomingMessage(message);
          setMessages((prev) => {
            // ✅ FIX: Avoid duplicate messages
            const exists = prev.find((m) => m.id === formattedMessage.id);
            if (exists) return prev;
            return [...prev, formattedMessage];
          });
          scrollToBottom();
        } catch (error) {
          console.error("Error handling new message:", error);
        }
      });
      unsubscribeFunctions.push(unsubscribeNewMessage);

      // ✅ FIX: Handle message status updates
      const unsubscribeMessageSent = chatService.on("message_sent", (data) => {
        console.log("✅ Message sent confirmation:", data);
        updateMessageStatus(data.messageId, "sent");
      });
      unsubscribeFunctions.push(unsubscribeMessageSent);

      const unsubscribeMessageDelivered = chatService.on(
        "message_delivered",
        (data) => {
          updateMessageStatus(data.messageId, "delivered");
        }
      );
      unsubscribeFunctions.push(unsubscribeMessageDelivered);

      const unsubscribeMessageRead = chatService.on("message_read", (data) => {
        updateMessageStatus(data.messageId, "read");
      });
      unsubscribeFunctions.push(unsubscribeMessageRead);

      // ✅ FIX: Handle typing indicators
      const unsubscribeTyping = chatService.on("user_typing", (data) => {
        console.log("⌨️ User typing:", data);

        // ✅ FIX: Only show typing from other companies
        if (data.companyId !== currentCompany?._id) {
          if (data.isTyping) {
            setTypingUsers((prev) => {
              const existing = prev.find((u) => u.userId === data.userId);
              if (!existing) {
                return [
                  ...prev,
                  {
                    userId: data.userId,
                    username: data.username,
                    companyName: data.companyName || "Other Company",
                  },
                ];
              }
              return prev;
            });
          } else {
            setTypingUsers((prev) =>
              prev.filter((u) => u.userId !== data.userId)
            );
          }
        }
      });
      unsubscribeFunctions.push(unsubscribeTyping);

      // ✅ FIX: Handle user join/leave events
      const unsubscribeUserJoined = chatService.on(
        "user_joined_chat",
        (data) => {
          console.log("👤 User joined chat:", data);
          showToastMessage(
            `${data.username} from ${
              data.companyName || "Other Company"
            } joined the chat`,
            "success"
          );
          setChatParticipants((prev) => {
            const existing = prev.find((p) => p.userId === data.userId);
            if (!existing) {
              return [
                ...prev,
                {
                  userId: data.userId,
                  username: data.username,
                  companyName: data.companyName,
                  joinedAt: new Date(),
                },
              ];
            }
            return prev;
          });
        }
      );
      unsubscribeFunctions.push(unsubscribeUserJoined);

      const unsubscribeUserLeft = chatService.on("user_left_chat", (data) => {
        console.log("👋 User left chat:", data);
        showToastMessage(
          `${data.username} from ${
            data.companyName || "Other Company"
          } left the chat`,
          "info"
        );
        setChatParticipants((prev) =>
          prev.filter((p) => p.userId !== data.userId)
        );
      });
      unsubscribeFunctions.push(unsubscribeUserLeft);

      // ✅ FIX: Handle online/offline status
      const unsubscribeUserOnline = chatService.on("user_online", (data) => {
        console.log("🟢 User online:", data);
        setOnlineUsers((prev) => {
          const existing = prev.find((u) => u.userId === data.userId);
          if (!existing) {
            return [...prev, data];
          }
          return prev;
        });
      });
      unsubscribeFunctions.push(unsubscribeUserOnline);

      const unsubscribeUserOffline = chatService.on("user_offline", (data) => {
        console.log("🔴 User offline:", data);
        setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      });
      unsubscribeFunctions.push(unsubscribeUserOffline);

      // ✅ FIX: Handle connection events
      const unsubscribeAuthenticated = chatService.on(
        "socket_authenticated",
        (data) => {
          console.log("✅ Socket authenticated:", data);
          setIsConnected(true);
          setConnectionStatus("authenticated");
        }
      );
      unsubscribeFunctions.push(unsubscribeAuthenticated);

      const unsubscribeConnected = chatService.on("socket_connected", () => {
        console.log("🔌 Socket connected");
        setIsConnected(true);
        setConnectionStatus("connected");
      });
      unsubscribeFunctions.push(unsubscribeConnected);

      const unsubscribeDisconnected = chatService.on(
        "socket_disconnected",
        (data) => {
          console.log("❌ Socket disconnected:", data);
          setIsConnected(false);
          setConnectionStatus("disconnected");
        }
      );
      unsubscribeFunctions.push(unsubscribeDisconnected);

      const unsubscribeAuthError = chatService.on("auth_failed", (data) => {
        console.error("🚫 Authentication failed:", data);
        setError("Authentication failed. Please refresh the page.");
        showToastMessage("Authentication failed", "error");
      });
      unsubscribeFunctions.push(unsubscribeAuthError);

      const unsubscribeSocketError = chatService.on("socket_error", (error) => {
        console.error("🚨 Socket error:", error);
        showToastMessage("Connection error occurred", "error");
      });
      unsubscribeFunctions.push(unsubscribeSocketError);

      // ✅ FIX: Store unsubscribe functions for cleanup
      setSocketUnsubscribeFns(unsubscribeFunctions);

      console.log("✅ Socket listeners setup complete");
    } catch (error) {
      console.error("❌ Error setting up socket listeners:", error);
    }
  };

  // ✅ FIX: Cleanup socket listeners
  const cleanupSocketListeners = () => {
    try {
      socketUnsubscribeFns.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
      setSocketUnsubscribeFns([]);
    } catch (error) {
      console.error("Error cleaning up socket listeners:", error);
    }
  };

  // ✅ FIX: Improved load chat history
  const loadChatHistory = async (page = 1, append = false) => {
    if (!party || !mappingValidated) {
      console.warn("Cannot load chat history: party or mapping not validated");
      return;
    }

    try {
      console.log("📚 Loading chat history...", {page, append});

      const response = await chatService.getChatHistory(party, {
        page,
        limit: 50,
        messageType: messageType !== "all" ? messageType : null,
      });

      if (response && response.success && response.data) {
        const formattedMessages = response.data.messages.map(
          formatIncomingMessage
        );

        if (append) {
          setMessages((prev) => [...formattedMessages, ...prev]);
        } else {
          setMessages(formattedMessages);
          scrollToBottom();
        }

        setHasMoreMessages(response.data.pagination?.hasMore || false);
        setCurrentPage(page);

        console.log(
          "✅ Chat history loaded:",
          formattedMessages.length,
          "messages"
        );
      } else {
        console.warn("No chat history data received");
      }
    } catch (error) {
      console.error("❌ Failed to load chat history:", error);
      setError("Failed to load chat history");
      showToastMessage(error.message || "Failed to load chat history", "error");
    }
  };

  // ✅ FIX: Improved load conversation summary
  const loadConversationSummary = async () => {
    if (!party || !mappingValidated) return;

    try {
      console.log("📊 Loading conversation summary...");

      const response = await chatService.getConversationSummary(party);
      if (response && response.success && response.data) {
        setConversationSummary(response.data);
        console.log("✅ Conversation summary loaded:", response.data);
      } else {
        // ✅ FIX: Set default summary if no data
        setConversationSummary({
          totalMessages: 0,
          unreadCount: 0,
          lastMessageAt: null,
          participantCount: 0,
        });
      }
    } catch (error) {
      console.warn("⚠️ Failed to load conversation summary:", error);
      setConversationSummary({
        totalMessages: 0,
        unreadCount: 0,
        lastMessageAt: null,
        participantCount: 0,
      });
    }
  };

  // ✅ FIX: Improved load templates
  const loadTemplates = async () => {
    if (!party || !mappingValidated) return;

    try {
      setIsLoadingTemplates(true);
      console.log("📋 Loading message templates...");

      const response = await chatService.getMessageTemplates(party);
      if (response && response.success && response.data) {
        setTemplates(response.data.templates || {});
        console.log("✅ Templates loaded:", response.data.templates);
      } else {
        setTemplates({});
      }
    } catch (error) {
      console.warn("⚠️ Failed to load message templates:", error);
      showToastMessage("Failed to load message templates", "warning");
      setTemplates({});
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // ✅ FIX: Improved load chat participants
  const loadChatParticipants = async () => {
    if (!party || !mappingValidated) return;

    try {
      console.log("👥 Loading chat participants...");

      const response = await chatService.getChatParticipants(party);
      if (response && response.success && response.data) {
        setChatParticipants(response.data.participants || []);
        console.log("✅ Chat participants loaded:", response.data.participants);
      } else {
        setChatParticipants([]);
      }
    } catch (error) {
      console.warn("⚠️ Failed to load chat participants:", error);
      setChatParticipants([]);
    }
  };

  // ✅ FIX: Improved typing handlers
  const handleTypingStart = () => {
    try {
      if (isConnected && party && mappingValidated && !isTyping) {
        console.log("⌨️ Starting typing indicator...");
        chatService.startTyping(party);
        setIsTyping(true);
      }
    } catch (error) {
      console.error("Error starting typing:", error);
    }
  };

  const handleTypingStop = () => {
    try {
      if (isConnected && party && mappingValidated && isTyping) {
        console.log("⏹️ Stopping typing indicator...");
        chatService.stopTyping(party);
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Error stopping typing:", error);
    }
  };

  // ✅ FIX: Improved cleanup
  const cleanup = () => {
    try {
      console.log("🧹 Cleaning up chat...");

      // Stop typing
      if (isTyping) {
        handleTypingStop();
      }

      // Leave chat room
      if (isConnected && party && mappingValidated) {
        chatService.leaveChat(party).catch(console.warn);
      }

      // Cleanup socket listeners
      cleanupSocketListeners();

      // Reset state
      setMessages([]);
      setTypingUsers([]);
      setChatParticipants([]);
      setOnlineUsers([]);
      setError(null);
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  };

  // ✅ FIX: Improved message formatting
  const formatIncomingMessage = (message) => {
    try {
      const isFromMyCompany =
        message.senderCompanyId === currentCompany?._id ||
        message.senderCompanyId === currentCompany?.id ||
        message.fromCompany === currentCompany?._id ||
        message.fromCompany === currentCompany?.id;

      return {
        id: message._id || message.id || Date.now().toString(),
        type: isFromMyCompany ? "sent" : "received",
        content: message.content || "",
        timestamp: new Date(
          message.createdAt || message.timestamp || Date.now()
        ),
        status: message.status || "delivered",
        sender: isFromMyCompany
          ? "You"
          : message.senderName || message.sender || "User",
        senderCompanyName: message.senderCompanyName || message.fromCompanyName,
        senderCompanyId: message.senderCompanyId || message.fromCompany,
        receiverCompanyId: message.receiverCompanyId || message.toCompany,
        messageType: message.messageType || "whatsapp",
        attachments: message.attachments || [],
      };
    } catch (error) {
      console.error("Error formatting message:", error);
      return {
        id: Date.now().toString(),
        type: "received",
        content: "Error loading message",
        timestamp: new Date(),
        status: "error",
        sender: "System",
        messageType: "system",
        attachments: [],
      };
    }
  };

  const updateMessageStatus = (messageId, status) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? {...msg, status} : msg))
    );
  };

  // ✅ FIX: Improved send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !party || !mappingValidated) {
      console.warn("Cannot send message: conditions not met");
      return;
    }

    setIsSending(true);
    const messageContent = newMessage.trim();
    const tempId = `temp_${Date.now()}`;

    try {
      console.log("📤 Sending message:", messageContent);

      // ✅ FIX: Create optimistic message
      const tempMessage = {
        id: tempId,
        type: "sent",
        content: messageContent,
        timestamp: new Date(),
        status: "sending",
        sender: "You",
        senderCompanyName: currentCompany?.businessName,
        senderCompanyId: currentCompany?._id || currentCompany?.id,
        receiverCompanyId: targetCompanyId,
        messageType: messageType,
        attachments: [],
      };

      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");
      scrollToBottom();

      // ✅ FIX: Send via HTTP API (primary method)
      const response = await chatService.sendMessage(
        party,
        messageContent,
        messageType
      );

      if (response && response.success && response.data) {
        // ✅ FIX: Update with real message data
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? {
                  ...msg,
                  id: response.data._id || response.data.id,
                  status: "sent",
                  timestamp: new Date(
                    response.data.createdAt || response.data.timestamp
                  ),
                  senderCompanyId:
                    response.data.senderCompanyId || response.data.fromCompany,
                  receiverCompanyId:
                    response.data.receiverCompanyId || response.data.toCompany,
                }
              : msg
          )
        );

        showToastMessage("Message sent successfully", "success");

        // ✅ FIX: Also send via socket for real-time updates
        if (isConnected) {
          try {
            chatService.sendSocketMessage(party, messageContent, messageType);
          } catch (socketError) {
            console.warn("Socket message failed:", socketError);
          }
        }
      } else {
        throw new Error(response?.message || "Failed to send message");
      }
    } catch (error) {
      console.error("❌ Failed to send message:", error);

      // ✅ FIX: Mark message as failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? {...msg, status: "failed"} : msg
        )
      );

      showToastMessage(
        error.message || "Failed to send message. Please try again.",
        "error"
      );
    } finally {
      setIsSending(false);
    }
  };

  // ✅ FIX: Improved template selection
  const handleTemplateSelect = async (templateCategory, templateKey) => {
    const template = templates[templateCategory]?.[templateKey];
    if (!template) {
      console.warn("Template not found:", templateCategory, templateKey);
      return;
    }

    try {
      console.log("📋 Using template:", template);

      if (template.content) {
        setNewMessage(template.content);
        setSelectedTemplate(templateKey);
        setShowTemplates(false);
        messageInputRef.current?.focus();
      }
    } catch (error) {
      console.error("Error using template:", error);
      showToastMessage("Failed to use template", "error");
    }
  };

  // ✅ FIX: Improved key press handler
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      handleTypingStop();
    } else if (e.key === "Enter" && e.shiftKey) {
      return; // Allow new line
    } else {
      // ✅ FIX: Debounced typing start
      handleTypingStart();
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMoreMessages || isLoading) {
      console.warn("Cannot load more messages");
      return;
    }

    setIsLoading(true);
    await loadChatHistory(currentPage + 1, true);
    setIsLoading(false);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, 100);
  };

  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sending":
        return <FontAwesomeIcon icon={faClock} className="text-muted" />;
      case "sent":
        return <FontAwesomeIcon icon={faCheck} className="text-muted" />;
      case "delivered":
        return <FontAwesomeIcon icon={faCheckDouble} className="text-muted" />;
      case "read":
        return (
          <FontAwesomeIcon icon={faCheckDouble} className="text-primary" />
        );
      case "failed":
        return (
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="text-danger"
          />
        );
      default:
        return null;
    }
  };

  const getMessageTypeIcon = (msgType) => {
    switch (msgType) {
      case "whatsapp":
        return {icon: faCommentDots, color: "#25D366"};
      case "sms":
        return {icon: faMobileAlt, color: "#007bff"};
      case "email":
        return {icon: faEnvelope, color: "#dc3545"};
      default:
        return {icon: faComment, color: "#6c757d"};
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const renderTemplateButtons = () => {
    return Object.entries(templates).map(([category, categoryTemplates]) => (
      <div key={category} className="mb-2">
        <small className="text-muted text-uppercase fw-bold d-block mb-1">
          {category.replace("_", " ")}
        </small>
        <div className="d-flex flex-wrap gap-1">
          {Object.entries(categoryTemplates).map(([templateKey, template]) => (
            <Button
              key={templateKey}
              variant="outline-secondary"
              size="sm"
              onClick={() => handleTemplateSelect(category, templateKey)}
              disabled={isLoadingTemplates}
              style={{fontSize: "9px"}}
            >
              {template.title || templateKey}
            </Button>
          ))}
        </div>
      </div>
    ));
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <div className="d-flex mb-3">
        <div className="bg-white border rounded-3 p-2">
          <div className="d-flex align-items-center">
            <div className="typing-indicator me-2">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <small className="text-muted">
              {typingUsers.length === 1 ? (
                <span>
                  <FontAwesomeIcon icon={faBuilding} className="me-1" />
                  {typingUsers[0].username} from {typingUsers[0].companyName} is
                  typing...
                </span>
              ) : (
                <span>
                  <FontAwesomeIcon icon={faUsers} className="me-1" />
                  {typingUsers.length} users are typing...
                </span>
              )}
            </small>
          </div>
        </div>
      </div>
    );
  };

  const renderMappingInfo = () => {
    if (!party) return null;

    return (
      <div className="text-center py-2 border-bottom bg-light">
        <small className="text-muted" style={{fontSize: "10px"}}>
          <FontAwesomeIcon icon={faLink} className="me-1" />
          Chat between <strong>{currentCompany?.businessName}</strong> and{" "}
          <strong>{party.name}</strong>
          {targetCompanyId && (
            <span className="text-success ms-1">
              • Linked Company: {targetCompanyId.substring(0, 8)}...
            </span>
          )}
          {!mappingValidated && (
            <span className="text-danger ms-1">• No company mapping found</span>
          )}
        </small>
      </div>
    );
  };

  if (!show) return null;

  return (
    <>
      <ToastContainer position="top-end" className="p-3" style={{zIndex: 1060}}>
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          bg={
            toastType === "success"
              ? "success"
              : toastType === "warning"
              ? "warning"
              : "danger"
          }
          delay={3000}
          autohide
        >
          <Toast.Body className="text-white d-flex align-items-center">
            <FontAwesomeIcon
              icon={
                toastType === "success" ? faCheckCircle : faExclamationCircle
              }
              className="me-2"
            />
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{
          zIndex: 1040,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onHide}
      />

      <div
        className={`position-fixed top-0 end-0 h-100 bg-white shadow-lg border-start ${
          show ? "chat-sidebar-show" : "chat-sidebar-hide"
        }`}
        style={{
          width: "400px",
          zIndex: 1050,
          transform: show ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-in-out",
        }}
      >
        <div
          className="d-flex align-items-center p-3 bg-primary text-white border-bottom"
          style={{height: "70px"}}
        >
          <div
            className="rounded-circle bg-white text-primary me-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{width: "40px", height: "40px"}}
          >
            <FontAwesomeIcon icon={faBuilding} />
          </div>
          <div className="flex-grow-1 min-w-0">
            <h6
              className="mb-0 text-truncate d-flex align-items-center"
              style={{fontSize: "14px"}}
            >
              {party?.name || "Company"}
              <span
                className={`ms-2 rounded-circle ${
                  isConnected ? "bg-success" : "bg-danger"
                }`}
                style={{
                  width: "8px",
                  height: "8px",
                  display: "inline-block",
                }}
                title={isConnected ? "Connected" : "Disconnected"}
              />
              <span
                className={`ms-1 rounded-circle ${
                  mappingValidated ? "bg-success" : "bg-warning"
                }`}
                style={{
                  width: "6px",
                  height: "6px",
                  display: "inline-block",
                }}
                title={
                  mappingValidated
                    ? "Company mapping validated"
                    : "No company mapping"
                }
              />
            </h6>
            <small
              className="opacity-75 d-block text-truncate"
              style={{fontSize: "11px"}}
            >
              Company Chat • {currentCompany?.businessName || "Your Company"}
              {chatParticipants.length > 0 && (
                <span className="ms-1">
                  • {chatParticipants.length} participants
                </span>
              )}
            </small>
          </div>
          <Dropdown align="end" className="me-2">
            <Dropdown.Toggle
              variant="link"
              className="text-white border-0 shadow-none p-1"
              id="chat-options"
            >
              <FontAwesomeIcon icon={faEllipsisV} />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => loadChatHistory(1, false)}>
                <FontAwesomeIcon icon={faSync} className="me-2" />
                Refresh Chat
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => loadMoreMessages()}
                disabled={!hasMoreMessages || isLoading}
              >
                <FontAwesomeIcon icon={faHistory} className="me-2" />
                Load More Messages
              </Dropdown.Item>
              <Dropdown.Item onClick={() => loadChatParticipants()}>
                <FontAwesomeIcon icon={faUsers} className="me-2" />
                View Participants ({chatParticipants.length})
              </Dropdown.Item>
              <Dropdown.Item onClick={() => validatePartyCompanyMapping()}>
                <FontAwesomeIcon icon={faLink} className="me-2" />
                Validate Company Mapping
              </Dropdown.Item>
              <Dropdown.Item>
                <FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2" />
                Send Statement
              </Dropdown.Item>
              <Dropdown.Item>
                <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                Payment Link
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Button
            variant="link"
            className="text-white p-1"
            onClick={onHide}
            title="Close Chat"
          >
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        </div>

        {renderMappingInfo()}

        {error && (
          <Alert variant="danger" className="m-3 mb-0">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {error}
            <Button
              variant="outline-danger"
              size="sm"
              className="ms-2"
              onClick={() => {
                setError(null);
                validatePartyCompanyMapping();
                if (mappingValidated) {
                  initializeChat();
                }
              }}
            >
              Retry
            </Button>
          </Alert>
        )}

        <div
          className="flex-grow-1 overflow-hidden d-flex flex-column"
          style={{
            height: "calc(100vh - 100px)",
          }}
        >
          {!mappingValidated ? (
            <div className="text-center text-muted py-5">
              <FontAwesomeIcon
                icon={faLink}
                size="3x"
                className="mb-3 text-warning"
              />
              <h5>Company Mapping Required</h5>
              <p>
                This party needs to be linked to a company for chat
                functionality.
              </p>
              <small className="text-muted">
                Please ensure this party has a linkedCompanyId or
                externalCompanyId.
              </small>
              <div className="mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={validatePartyCompanyMapping}
                >
                  <FontAwesomeIcon icon={faSync} className="me-1" />
                  Re-validate Mapping
                </Button>
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="text-center p-3">
                  <Spinner animation="border" size="sm" />
                  <span className="ms-2">Loading messages...</span>
                </div>
              )}

              {hasMoreMessages && !isLoading && messages.length > 0 && (
                <div className="text-center p-2 border-bottom">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={loadMoreMessages}
                    disabled={isLoading}
                  >
                    Load More Messages
                  </Button>
                </div>
              )}

              <div
                ref={messagesContainerRef}
                className="flex-grow-1 overflow-auto p-3"
                style={{
                  background: "#f8f9fa",
                  maxHeight: "calc(100vh - 310px)",
                }}
              >
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-muted py-5">
                    <FontAwesomeIcon
                      icon={faComments}
                      size="3x"
                      className="mb-3"
                    />
                    <p>No messages yet. Start a conversation!</p>
                    <small className="text-muted">
                      This is a company-to-company chat between{" "}
                      {currentCompany?.businessName} and {party?.name}
                    </small>
                  </div>
                )}

                {messages.map((message, index) => {
                  const typeInfo = getMessageTypeIcon(message.messageType);
                  const showDate =
                    index === 0 ||
                    formatDate(message.timestamp) !==
                      formatDate(messages[index - 1].timestamp);

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="text-center my-3">
                          <small className="bg-light px-3 py-1 rounded-pill text-muted">
                            {formatDate(message.timestamp)}
                          </small>
                        </div>
                      )}

                      <div
                        className={`d-flex mb-3 ${
                          message.type === "sent" ? "justify-content-end" : ""
                        }`}
                      >
                        <div
                          className={`message-bubble p-2 rounded-3 position-relative ${
                            message.type === "sent"
                              ? "bg-primary text-white"
                              : "bg-white border"
                          }`}
                          style={{
                            maxWidth: "85%",
                            wordWrap: "break-word",
                            fontSize: "13px",
                          }}
                        >
                          <div className="d-flex align-items-center mb-1">
                            <FontAwesomeIcon
                              icon={typeInfo.icon}
                              style={{color: typeInfo.color, fontSize: "10px"}}
                              className="me-1"
                            />
                            <small
                              className={`${
                                message.type === "sent"
                                  ? "text-white-50"
                                  : "text-muted"
                              }`}
                              style={{fontSize: "9px"}}
                            >
                              {message.messageType.toUpperCase()}
                              {message.senderCompanyName && (
                                <span className="ms-1">
                                  • {message.senderCompanyName}
                                </span>
                              )}
                            </small>
                          </div>

                          <div
                            style={{whiteSpace: "pre-wrap", fontSize: "13px"}}
                            className="mb-1"
                          >
                            {message.content}
                          </div>

                          <div
                            className={`d-flex align-items-center justify-content-between mt-1 ${
                              message.type === "sent"
                                ? "text-white-50"
                                : "text-muted"
                            }`}
                            style={{fontSize: "10px"}}
                          >
                            <span>{formatTime(message.timestamp)}</span>
                            {message.type === "sent" && (
                              <span className="ms-2">
                                {getStatusIcon(message.status)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {renderTypingIndicator()}

                <div ref={messagesEndRef} />
              </div>

              <div className="border-top bg-white" style={{minHeight: "180px"}}>
                <div className="p-2 border-bottom">
                  <div className="d-flex gap-1 flex-wrap">
                    <Button
                      variant={
                        messageType === "whatsapp"
                          ? "success"
                          : "outline-success"
                      }
                      size="sm"
                      onClick={() => setMessageType("whatsapp")}
                      style={{fontSize: "10px"}}
                      disabled={!mappingValidated}
                    >
                      <FontAwesomeIcon icon={faCommentDots} className="me-1" />
                      WhatsApp
                    </Button>
                    <Button
                      variant={
                        messageType === "sms" ? "primary" : "outline-primary"
                      }
                      size="sm"
                      onClick={() => setMessageType("sms")}
                      style={{fontSize: "10px"}}
                      disabled={!mappingValidated}
                    >
                      <FontAwesomeIcon icon={faMobileAlt} className="me-1" />
                      SMS
                    </Button>
                    <Button
                      variant={
                        messageType === "email" ? "danger" : "outline-danger"
                      }
                      size="sm"
                      onClick={() => setMessageType("email")}
                      style={{fontSize: "10px"}}
                      disabled={!mappingValidated}
                    >
                      <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                      Email
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setShowTemplates(!showTemplates)}
                      disabled={isLoadingTemplates || !mappingValidated}
                      style={{fontSize: "10px"}}
                    >
                      <FontAwesomeIcon
                        icon={faClipboardList}
                        className="me-1"
                      />
                      Templates
                      {isLoadingTemplates && (
                        <Spinner
                          animation="border"
                          size="sm"
                          className="ms-1"
                        />
                      )}
                    </Button>
                  </div>
                </div>

                {showTemplates && mappingValidated && (
                  <div
                    className="p-2 border-bottom bg-light"
                    style={{maxHeight: "150px", overflowY: "auto"}}
                  >
                    {Object.keys(templates).length === 0 ? (
                      <div className="text-center text-muted py-2">
                        <FontAwesomeIcon
                          icon={faClipboardList}
                          className="me-2"
                        />
                        No templates available
                      </div>
                    ) : (
                      renderTemplateButtons()
                    )}
                  </div>
                )}

                <div className="p-3">
                  <InputGroup>
                    <Form.Control
                      ref={messageInputRef}
                      as="textarea"
                      rows={2}
                      placeholder={
                        mappingValidated
                          ? `Type your ${messageType} message to ${party?.name}...`
                          : "Company mapping required to send messages..."
                      }
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onKeyUp={handleTypingStop}
                      disabled={isSending || !mappingValidated}
                      style={{resize: "none", fontSize: "13px"}}
                    />
                    <Button
                      variant="primary"
                      onClick={handleSendMessage}
                      disabled={
                        !newMessage.trim() || isSending || !mappingValidated
                      }
                    >
                      {isSending ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <FontAwesomeIcon icon={faPaperPlane} />
                      )}
                    </Button>
                  </InputGroup>

                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted" style={{fontSize: "10px"}}>
                      {newMessage.length}/1000 characters
                      {conversationSummary && (
                        <span className="ms-2">
                          • {conversationSummary.totalMessages} messages
                          {conversationSummary.unreadCount > 0 && (
                            <span className="text-primary">
                              {" "}
                              • {conversationSummary.unreadCount} unread
                            </span>
                          )}
                        </span>
                      )}
                    </small>
                    <div className="d-flex gap-1">
                      <small className="text-muted" style={{fontSize: "9px"}}>
                        {isConnected ? (
                          <span className="text-success">
                            <FontAwesomeIcon icon={faCheckCircle} /> Connected
                          </span>
                        ) : (
                          <span className="text-danger">
                            <FontAwesomeIcon icon={faExclamationCircle} />{" "}
                            Disconnected
                          </span>
                        )}
                        {mappingValidated ? (
                          <span className="ms-2 text-success">
                            <FontAwesomeIcon icon={faLink} /> Mapped
                          </span>
                        ) : (
                          <span className="ms-2 text-warning">
                            <FontAwesomeIcon icon={faExclamationTriangle} /> No
                            Mapping
                          </span>
                        )}
                        {onlineUsers.length > 0 && (
                          <span className="ms-2 text-info">
                            <FontAwesomeIcon icon={faUsers} />{" "}
                            {onlineUsers.length} online
                          </span>
                        )}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .chat-sidebar-show {
          transform: translateX(0) !important;
        }

        .chat-sidebar-hide {
          transform: translateX(100%) !important;
        }

        .border-start {
          border-left-width: 1px !important;
          border-left-style: solid !important;
          border-left-color: #dee2e6 !important;
        }

        .message-bubble {
          position: relative;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .message-bubble::before {
          content: "";
          position: absolute;
          width: 0;
          height: 0;
          border-style: solid;
        }

        .message-bubble.bg-primary::before {
          top: 10px;
          right: -6px;
          border-width: 6px 0 6px 6px;
          border-top-color: transparent;
          border-right-color: transparent;
          border-bottom-color: transparent;
          border-left-color: #0d6efd;
        }

        .message-bubble.bg-white::before {
          top: 10px;
          left: -6px;
          border-width: 6px 6px 6px 0;
          border-top-color: transparent;
          border-right-color: #ffffff;
          border-bottom-color: transparent;
          border-left-color: transparent;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #999;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes typing {
          0%,
          80%,
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .overflow-auto::-webkit-scrollbar {
          width: 4px;
        }

        .overflow-auto::-webkit-scrollbar-track {
          background-color: #f1f1f1;
          border-radius: 10px;
        }

        .overflow-auto::-webkit-scrollbar-thumb {
          background-color: #c1c1c1;
          border-radius: 10px;
        }

        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background-color: #a8a8a8;
        }

        .message-bubble .fa-check {
          font-size: 10px;
        }

        .message-bubble .fa-check-double {
          font-size: 10px;
        }

        .message-bubble .fa-clock {
          font-size: 10px;
        }
      `}</style>
    </>
  );
}

export default PartyChat;
