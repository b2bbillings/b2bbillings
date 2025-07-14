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

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

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
        // Silent fail
      }
    };

    initializeCompanyContext();
  }, []);

  useEffect(() => {
    if (party) {
      validatePartyCompanyMapping();
    }
  }, [party?._id]);

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

      const extractedCompanyId = chatService.extractTargetCompanyId(party);

      if (!extractedCompanyId) {
        setError(
          "No linked company found for this party. This party cannot be used for company-to-company chat."
        );
        setMappingValidated(false);
        setTargetCompanyId(null);
        return;
      }

      setTargetCompanyId(extractedCompanyId);
      setMappingValidated(true);
      setError(null);
    } catch (error) {
      setError(error.message || "Failed to validate party-company mapping");
      setMappingValidated(false);
      setTargetCompanyId(null);
    }
  };

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const socket = chatService.initializeSocket();
      if (socket) {
        setIsConnected(true);
        setupSocketListeners();
      }

      await loadChatHistory();
      await loadConversationSummary();
      await loadTemplates();

      if (party) {
        try {
          const joinResult = await chatService.joinChat(party);
        } catch (joinError) {
          showToastMessage("Failed to join chat room", "error");
        }
      }

      await loadChatParticipants();
    } catch (error) {
      setError("Failed to initialize chat. Please try again.");
      showToastMessage("Failed to initialize chat", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketListeners = () => {
    try {
      const unsubscribeFunctions = [];

      if (typeof chatService.on === "function") {
        const unsubscribeNewMessage = chatService.on(
          "new_message",
          (message) => {
            const formattedMessage = formatIncomingMessage(message);
            setMessages((prev) => [...prev, formattedMessage]);
            scrollToBottom();
          }
        );
        unsubscribeFunctions.push(unsubscribeNewMessage);

        const unsubscribeMessageSent = chatService.on(
          "message_sent",
          (data) => {
            updateMessageStatus(data.messageId, "sent");
          }
        );
        unsubscribeFunctions.push(unsubscribeMessageSent);

        const unsubscribeMessageDelivered = chatService.on(
          "message_delivered",
          (data) => {
            updateMessageStatus(data.messageId, "delivered");
          }
        );
        unsubscribeFunctions.push(unsubscribeMessageDelivered);

        const unsubscribeMessageRead = chatService.on(
          "message_read",
          (data) => {
            updateMessageStatus(data.messageId, "read");
          }
        );
        unsubscribeFunctions.push(unsubscribeMessageRead);

        const unsubscribeTypingStart = chatService.on("user_typing", (data) => {
          if (data.companyId !== currentCompany?._id && data.isTyping) {
            setTypingUsers((prev) => {
              const existing = prev.find((u) => u.userId === data.userId);
              if (!existing) {
                return [
                  ...prev,
                  {
                    userId: data.userId,
                    username: data.username,
                    companyName: data.companyName,
                  },
                ];
              }
              return prev;
            });
          } else if (!data.isTyping) {
            setTypingUsers((prev) =>
              prev.filter((u) => u.userId !== data.userId)
            );
          }
        });
        unsubscribeFunctions.push(unsubscribeTypingStart);

        const unsubscribeUserJoined = chatService.on(
          "user_joined_chat",
          (data) => {
            showToastMessage(
              `${data.username} from ${data.companyName} joined the chat`,
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
          showToastMessage(
            `${data.username} from ${data.companyName} left the chat`,
            "info"
          );
          setChatParticipants((prev) =>
            prev.filter((p) => p.userId !== data.userId)
          );
        });
        unsubscribeFunctions.push(unsubscribeUserLeft);

        const unsubscribeUserOnline = chatService.on("user_online", (data) => {
          setOnlineUsers((prev) => {
            const existing = prev.find((u) => u.userId === data.userId);
            if (!existing) {
              return [...prev, data];
            }
            return prev;
          });
        });
        unsubscribeFunctions.push(unsubscribeUserOnline);

        const unsubscribeUserOffline = chatService.on(
          "user_offline",
          (data) => {
            setOnlineUsers((prev) =>
              prev.filter((u) => u.userId !== data.userId)
            );
          }
        );
        unsubscribeFunctions.push(unsubscribeUserOffline);

        const unsubscribeAuthenticated = chatService.on(
          "socket_authenticated",
          (data) => {
            setIsConnected(true);
            setConnectionStatus("authenticated");
          }
        );
        unsubscribeFunctions.push(unsubscribeAuthenticated);

        const unsubscribeAuthError = chatService.on(
          "socket_auth_error",
          (data) => {
            setError("Authentication failed. Please refresh the page.");
            showToastMessage("Authentication failed", "error");
          }
        );
        unsubscribeFunctions.push(unsubscribeAuthError);

        const unsubscribeConnected = chatService.on("socket_connected", () => {
          setIsConnected(true);
          setConnectionStatus("connected");
        });
        unsubscribeFunctions.push(unsubscribeConnected);

        const unsubscribeDisconnected = chatService.on(
          "socket_disconnected",
          () => {
            setIsConnected(false);
            setConnectionStatus("disconnected");
          }
        );
        unsubscribeFunctions.push(unsubscribeDisconnected);
      } else if (chatService.socket) {
        chatService.socket.on("new_message", (message) => {
          const formattedMessage = formatIncomingMessage(message);
          setMessages((prev) => [...prev, formattedMessage]);
          scrollToBottom();
        });

        chatService.socket.on("user_typing", (data) => {
          if (data.companyId !== currentCompany?._id && data.isTyping) {
            setTypingUsers((prev) => {
              const existing = prev.find((u) => u.userId === data.userId);
              if (!existing) {
                return [
                  ...prev,
                  {
                    userId: data.userId,
                    username: data.username,
                    companyName: data.companyName,
                  },
                ];
              }
              return prev;
            });
          } else if (!data.isTyping) {
            setTypingUsers((prev) =>
              prev.filter((u) => u.userId !== data.userId)
            );
          }
        });

        chatService.socket.on("connect", () => {
          setIsConnected(true);
          setConnectionStatus("connected");
        });

        chatService.socket.on("disconnect", () => {
          setIsConnected(false);
          setConnectionStatus("disconnected");
        });
      }

      return () => {
        try {
          unsubscribeFunctions.forEach((unsubscribe) => {
            if (typeof unsubscribe === "function") {
              unsubscribe();
            }
          });
        } catch (error) {
          // Silent fail
        }
      };
    } catch (error) {
      return () => {};
    }
  };

  const loadChatHistory = async (page = 1, append = false) => {
    if (!party || !mappingValidated) return;

    try {
      const response = await chatService.getChatHistory(party, {
        page,
        limit: 50,
        messageType: messageType !== "all" ? messageType : null,
      });

      if (response.success) {
        const formattedMessages = response.data.messages.map(
          formatIncomingMessage
        );

        if (append) {
          setMessages((prev) => [...formattedMessages, ...prev]);
        } else {
          setMessages(formattedMessages);
          scrollToBottom();
        }

        setHasMoreMessages(response.data.pagination.hasMore);
        setCurrentPage(page);
      }
    } catch (error) {
      setError("Failed to load chat history");
      showToastMessage(error.message || "Failed to load chat history", "error");
    }
  };

  const loadConversationSummary = async () => {
    if (!party || !mappingValidated) return;

    try {
      if (typeof chatService.getConversationSummary === "function") {
        const response = await chatService.getConversationSummary(party);
        if (response.success) {
          setConversationSummary(response.data);
        }
      } else {
        setConversationSummary({
          totalMessages: 0,
          unreadCount: 0,
          lastMessageAt: null,
          participantCount: 0,
        });
      }
    } catch (error) {
      setConversationSummary({
        totalMessages: 0,
        unreadCount: 0,
        lastMessageAt: null,
        participantCount: 0,
      });
    }
  };

  const loadTemplates = async () => {
    if (!party || !mappingValidated) return;

    try {
      setIsLoadingTemplates(true);

      if (typeof chatService.getMessageTemplates === "function") {
        const response = await chatService.getMessageTemplates(party);
        if (response.success) {
          setTemplates(response.data.templates || {});
        }
      } else {
        setTemplates({});
      }
    } catch (error) {
      showToastMessage("Failed to load message templates", "error");
      setTemplates({});
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadChatParticipants = async () => {
    if (!party || !mappingValidated) return;

    try {
      if (typeof chatService.getChatParticipants === "function") {
        const response = await chatService.getChatParticipants(party);
        if (response.success) {
          setChatParticipants(response.data.participants || []);
        }
      } else {
        setChatParticipants([]);
      }
    } catch (error) {
      setChatParticipants([]);
    }
  };

  const handleTypingStart = () => {
    try {
      if (isConnected && party && mappingValidated) {
        if (typeof chatService.startTyping === "function") {
          chatService.startTyping(party);
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleTypingStop = () => {
    try {
      if (isConnected && party && mappingValidated) {
        if (typeof chatService.stopTyping === "function") {
          chatService.stopTyping(party);
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const cleanup = () => {
    try {
      if (isConnected && party && mappingValidated) {
        if (typeof chatService.leaveChat === "function") {
          chatService.leaveChat();
        }
      }

      if (typeof chatService.off === "function") {
        const eventsToRemove = [
          "new_message",
          "message_sent",
          "message_delivered",
          "message_read",
          "user_typing",
          "user_joined_chat",
          "user_left_chat",
          "user_online",
          "user_offline",
          "socket_authenticated",
          "socket_auth_error",
          "socket_connected",
          "socket_disconnected",
        ];

        eventsToRemove.forEach((eventName) => {
          try {
            chatService.off(eventName);
          } catch (error) {
            // Silent fail
          }
        });
      }
    } catch (error) {
      // Silent fail
    }
  };

  const formatIncomingMessage = (message) => {
    const isFromMyCompany =
      message.senderCompanyId === currentCompany?._id ||
      message.senderCompanyId === currentCompany?.id;

    return {
      id: message._id || message.id,
      type: isFromMyCompany ? "sent" : "received",
      content: message.content,
      timestamp: new Date(message.createdAt),
      status: message.status,
      sender: isFromMyCompany ? "You" : message.senderName || "User",
      senderCompanyName: message.senderCompanyName,
      senderCompanyId: message.senderCompanyId,
      receiverCompanyId: message.receiverCompanyId,
      messageType: message.messageType,
      attachments: message.attachments || [],
    };
  };

  const updateMessageStatus = (messageId, status) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? {...msg, status} : msg))
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !party || !mappingValidated) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    const tempId = Date.now().toString();

    try {
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

      const response = await chatService.sendMessage(
        party,
        messageContent,
        messageType
      );

      if (response.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? {
                  ...msg,
                  id: response.data._id,
                  status: "sent",
                  senderCompanyId: response.data.senderCompanyId,
                  receiverCompanyId: response.data.receiverCompanyId,
                }
              : msg
          )
        );

        showToastMessage("Message sent successfully", "success");
      } else {
        throw new Error(response.message || "Failed to send message");
      }
    } catch (error) {
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

  const handleTemplateSelect = async (templateCategory, templateKey) => {
    const template = templates[templateCategory]?.[templateKey];
    if (!template) return;

    try {
      setIsLoadingTemplates(true);

      if (template.content) {
        setNewMessage(template.content);
        setSelectedTemplate(templateKey);
        setShowTemplates(false);
        messageInputRef.current?.focus();
      }
    } catch (error) {
      showToastMessage("Failed to use template", "error");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      handleTypingStop();
    } else if (e.key === "Enter" && e.shiftKey) {
      return;
    } else {
      handleTypingStart();
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMoreMessages || isLoading) return;

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
              {template.title}
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
          bg={toastType === "success" ? "success" : "danger"}
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
              <Dropdown.Item onClick={() => loadMoreMessages()}>
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
