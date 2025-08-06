import React, {useState, useEffect, useRef, Fragment} from "react";
import {createPortal} from "react-dom"; // ✅ ADD THIS LINE
// import "./TeamChats.css";
import {
  Card,
  Form,
  InputGroup,
  Badge,
  Button,
  Spinner,
  Dropdown,
  Alert,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faSearch,
  faPaperPlane,
  faTimes,
  faPhone,
  faVideo,
  faEllipsisV,
  faCircle,
  faBuilding,
  faExclamationTriangle,
  faCheckDouble,
  faCheck,
  faClock,
  faCommentDots,
  faMobileAlt,
  faEnvelope,
  faComment,
  faComments,
  faClipboardList,
  faHistory,
  faSync,
  faFileInvoiceDollar,
  faMoneyBillWave,
  faCheckCircle,
  faExclamationCircle,
  faLink,
  faUser,
  faRobot,
  faSms,
  faCalendarAlt,
  faGlobe,
  faRocket,
  faShare,
  faCopy,
  faQrcode,
  faBell,
  faBellSlash,
  faVolumeUp,
  faVolumeMute,
} from "@fortawesome/free-solid-svg-icons";

// Import services
import partyService from "../../services/partyService";
import chatService from "../../services/chatService";
import AddNewParty from "../Home/Party/AddNewParty";

function TeamChats({
  currentUser,
  currentCompany,
  addToast,
  isOnline = true,
  onNavigate,
}) {
  // Search and UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParty, setSelectedParty] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Party management states
  const [parties, setParties] = useState([]);
  const [allParties, setAllParties] = useState([]);
  const [linkedParties, setLinkedParties] = useState([]);
  const [activeSection, setActiveSection] = useState("linked");

  // Share modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPartyForShare, setSelectedPartyForShare] = useState(null);
  const [shareOptions, setShareOptions] = useState({
    includeContact: true,
    includeCompanyDetails: true,
    generateQR: false,
  });

  // ✅ UPDATED: Chat functionality states (aligned with PartyChat)
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [messageType, setMessageType] = useState("website"); // ✅ Changed to "website"
  const [displayMessageType, setDisplayMessageType] = useState("whatsapp"); // ✅ Added display type
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [conversationSummary, setConversationSummary] = useState(null);

  // ✅ UPDATED: Toast states (aligned with PartyChat)
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Pagination and message loading states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // ✅ UPDATED: Connection and user states (aligned with PartyChat)
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatParticipants, setChatParticipants] = useState([]);

  // ✅ UPDATED: Company mapping states (aligned with PartyChat)
  const [targetCompanyId, setTargetCompanyId] = useState(null);
  const [mappingValidated, setMappingValidated] = useState(false);
  const [currentCompanyData, setCurrentCompanyData] = useState(null);

  // ✅ ADDED: Notification states (from PartyChat)
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    sound: true,
    desktop: true,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatFocused, setIsChatFocused] = useState(false);

  // Add Party Modal states
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState("customer");

  // ✅ UPDATED: Socket management (from PartyChat)
  const [socketUnsubscribeFns, setSocketUnsubscribeFns] = useState([]);

  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // ✅ UPDATED: Load company context (from PartyChat)
  useEffect(() => {
    const loadCompanyContext = async () => {
      try {
        const companyData = localStorage.getItem("currentCompany");
        if (!companyData) {
          setError("Company context not found. Please refresh and try again.");
          return;
        }

        let company;
        try {
          company = JSON.parse(companyData);
        } catch (parseError) {
          setError(
            "Invalid company data. Please refresh and select your company."
          );
          return;
        }

        const companyId = company._id || company.id;
        if (!companyId) {
          setError("Company ID not found. Please refresh and try again.");
          return;
        }

        setCurrentCompanyData(company);

        if (chatService.setCompanyContext) {
          chatService.setCompanyContext(companyId, company.businessName);
        }

        // Load notification settings
        const savedNotificationSettings = localStorage.getItem(
          "chatNotificationSettings"
        );
        if (savedNotificationSettings) {
          try {
            const parsed = JSON.parse(savedNotificationSettings);
            setNotificationSettings(parsed);
          } catch (error) {
            // Silent fail
          }
        }
      } catch (error) {
        setError(
          "Failed to load company context. Please refresh and try again."
        );
      }
    };

    loadCompanyContext();
  }, []);

  // ✅ UPDATED: Notification settings persistence (from PartyChat)
  useEffect(() => {
    try {
      localStorage.setItem(
        "chatNotificationSettings",
        JSON.stringify(notificationSettings)
      );
    } catch (error) {
      // Silent fail
    }
  }, [notificationSettings]);

  // ✅ UPDATED: Chat focus management (from PartyChat)
  useEffect(() => {
    if (chatPopupOpen && selectedParty && targetCompanyId && mappingValidated) {
      setIsChatFocused(true);
      setTimeout(() => {
        markConversationAsRead();
      }, 1000);

      return () => {
        setIsChatFocused(false);
      };
    }
  }, [chatPopupOpen, selectedParty, targetCompanyId, mappingValidated]);

  // ✅ UPDATED: Company context initialization (simplified)
  useEffect(() => {
    const initializeCompanyContext = () => {
      try {
        if (currentCompany) {
          const companyId = currentCompany._id || currentCompany.id;
          if (companyId) {
            chatService.setCompanyContext(
              companyId,
              currentCompany.businessName
            );
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    initializeCompanyContext();
  }, [currentCompany]);

  // ✅ UPDATED: Party mapping validation (aligned with PartyChat)
  useEffect(() => {
    if (selectedParty && currentCompanyData?._id) {
      validatePartyMapping();
    } else if (selectedParty && !currentCompanyData) {
      setMappingValidated(false);
      setTargetCompanyId(null);
      setError("Loading company context...");
    } else {
      setMappingValidated(false);
      setTargetCompanyId(null);
      setError(null);
    }
  }, [selectedParty?._id, currentCompanyData?._id]);

  // ✅ UPDATED: Chat initialization (aligned with PartyChat)
  useEffect(() => {
    if (
      chatPopupOpen &&
      selectedParty &&
      currentCompanyData &&
      mappingValidated &&
      targetCompanyId
    ) {
      initializeChat();
    }

    return () => {
      if (chatPopupOpen) cleanup();
    };
  }, [
    chatPopupOpen,
    selectedParty?._id,
    currentCompanyData?._id,
    mappingValidated,
    targetCompanyId,
  ]);

  // Fetch parties
  useEffect(() => {
    const fetchAllParties = async () => {
      if (!currentCompany?.id && !currentCompany?._id) {
        setError("No company selected");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const allPartiesResponse = await partyService.getParties({
          page: 1,
          limit: 100,
          search: "",
        });

        if (allPartiesResponse.success && allPartiesResponse.data?.parties) {
          const allPartiesData = allPartiesResponse.data.parties;
          setAllParties(allPartiesData);

          const linkedPartiesData = allPartiesData.filter(
            (party) => party.canChat && party.chatCompanyId
          );
          setLinkedParties(linkedPartiesData);

          setParties(
            activeSection === "linked" ? linkedPartiesData : allPartiesData
          );
        } else {
          setAllParties([]);
          setLinkedParties([]);
          setParties([]);
        }
      } catch (error) {
        setError(error.message || "Failed to fetch parties");
        setAllParties([]);
        setLinkedParties([]);
        setParties([]);
        addToast?.("Failed to load parties", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchAllParties();
  }, [currentCompany, addToast, activeSection]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ ADD: New useEffect for escape key
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && chatPopupOpen) {
        e.preventDefault();
        closeChatPopup();
      }
    };

    if (chatPopupOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [chatPopupOpen]);

  // ✅ UPDATED: Display message type change handler (from PartyChat)
  const handleDisplayMessageTypeChange = (newDisplayType) => {
    setDisplayMessageType(newDisplayType);
    localStorage.setItem("preferredDisplayMessageType", newDisplayType);
  };

  // ✅ UPDATED: Get effective message type (from PartyChat)
  const getEffectiveMessageType = () => {
    return "website";
  };

  // ✅ UPDATED: Display toast (from PartyChat)
  const displayToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // ✅ UPDATED: Mark conversation as read (from PartyChat)
  const markConversationAsRead = async () => {
    if (!selectedParty || !mappingValidated || !targetCompanyId) return;

    try {
      if (chatService.markConversationAsRead) {
        await chatService.markConversationAsRead(selectedParty);
      }
      setUnreadCount(0);
    } catch (error) {
      // Silent fail
    }
  };

  // ✅ UPDATED: Toggle notification setting (from PartyChat)
  const toggleNotificationSetting = (setting) => {
    setNotificationSettings((prev) => {
      const newSettings = {
        ...prev,
        [setting]: !prev[setting],
      };

      displayToast(
        `Notifications ${setting} ${prev[setting] ? "disabled" : "enabled"}`,
        "info"
      );

      return newSettings;
    });
  };

  // ✅ UPDATED: Validate party mapping (from PartyChat)
  const validatePartyMapping = () => {
    try {
      if (!selectedParty || !currentCompanyData?._id) {
        setMappingValidated(false);
        setTargetCompanyId(null);
        setError(
          !selectedParty
            ? "Party data is missing"
            : "Loading company context..."
        );
        return;
      }

      const myCompanyId = currentCompanyData._id || currentCompanyData.id;
      let extractedCompanyId = null;

      // Try using chatService validation first
      try {
        const mappingResult =
          chatService.validateAndExtractPartyCompanyData(selectedParty);
        if (
          mappingResult?.targetCompanyId &&
          mappingResult.targetCompanyId !== myCompanyId
        ) {
          extractedCompanyId = mappingResult.targetCompanyId;
        }
      } catch (chatServiceError) {
        // Silent fail and continue with other methods
      }

      if (!extractedCompanyId) {
        const possibleCompanyIds = [
          selectedParty.targetCompanyId,
          selectedParty.chatCompanyId,
          selectedParty.externalCompanyId,
          selectedParty.linkedCompanyId,
          selectedParty.companyId,
          selectedParty.company,
        ]
          .map((companyRef) => {
            if (!companyRef) return null;

            if (typeof companyRef === "object") {
              return companyRef._id || companyRef.id || null;
            }

            if (
              typeof companyRef === "string" &&
              /^[0-9a-fA-F]{24}$/.test(companyRef)
            ) {
              return companyRef;
            }

            return null;
          })
          .filter(Boolean);

        extractedCompanyId = possibleCompanyIds.find(
          (id) => id !== myCompanyId
        );
      }

      if (!extractedCompanyId) {
        try {
          extractedCompanyId =
            chatService.extractTargetCompanyId(selectedParty);
        } catch (extractError) {
          // Silent fail
        }
      }

      if (!extractedCompanyId) {
        setError(
          "This party is not linked to any company for chat. Please configure the party's company association."
        );
        setMappingValidated(false);
        setTargetCompanyId(null);
        return;
      }

      if (!/^[0-9a-fA-F]{24}$/.test(extractedCompanyId)) {
        setError(
          `Invalid company ID format: ${extractedCompanyId}. Please check party configuration.`
        );
        setMappingValidated(false);
        setTargetCompanyId(null);
        return;
      }

      if (extractedCompanyId === myCompanyId) {
        setError(
          "Cannot chat with your own company. Please check party configuration."
        );
        setMappingValidated(false);
        setTargetCompanyId(null);
        return;
      }

      setTargetCompanyId(extractedCompanyId);
      setMappingValidated(true);
      setError(null);
    } catch (error) {
      setError(`Validation failed: ${error.message}`);
      setMappingValidated(false);
      setTargetCompanyId(null);
    }
  };

  // ✅ UPDATED: Initialize chat (from PartyChat)
  const initializeChat = async () => {
    try {
      setIsLoadingMessages(true);
      setError(null);

      if (!targetCompanyId || !currentCompanyData?._id) {
        throw new Error("Missing required IDs for chat initialization");
      }

      const socket = chatService.initializeSocket();
      if (!socket) {
        throw new Error("Failed to initialize socket connection");
      }

      try {
        const authenticatedData = await Promise.race([
          waitForAuthentication(),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(new Error("Authentication timeout after 15 seconds")),
              15000
            )
          ),
        ]);

        const myCompanyId =
          authenticatedData.companyId || currentCompanyData._id;

        if (myCompanyId === targetCompanyId) {
          throw new Error("Cannot chat with your own company");
        }

        setIsConnected(chatService.isConnected);
      } catch (authError) {
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      setupSocketListeners();

      if (chatService.isConnected) {
        try {
          const joinData = {
            party: {
              ...selectedParty,
              _id: selectedParty._id,
              name: selectedParty.name,
              linkedCompanyId: targetCompanyId,
              targetCompanyId: targetCompanyId,
              chatCompanyId: targetCompanyId,
            },
            myCompanyId: currentCompanyData._id,
            targetCompanyId: targetCompanyId,
            otherCompanyId: targetCompanyId,
            partyId: selectedParty._id,
            partyName: selectedParty.name,
            chatCompanyName:
              selectedParty.chatCompanyName || selectedParty.name,
          };

          const joinResult = await Promise.race([
            chatService.joinChat(joinData),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Join chat timeout after 10 seconds")),
                10000
              )
            ),
          ]);
        } catch (joinError) {
          displayToast(
            `Failed to join chat room: ${joinError.message}`,
            "warning"
          );
        }
      } else {
        displayToast(
          "Socket not connected - some features may be limited",
          "warning"
        );
      }

      await loadChatHistory();
    } catch (error) {
      setError(`Failed to initialize chat: ${error.message}`);
      displayToast(`Chat initialization failed: ${error.message}`, "error");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // ✅ ADDED: Wait for authentication (from PartyChat)
  const waitForAuthentication = () => {
    return new Promise((resolve, reject) => {
      if (chatService.isConnected) {
        const companyData = chatService.getAuthenticatedCompany
          ? chatService.getAuthenticatedCompany()
          : null;
        if (companyData?.companyId) {
          resolve(companyData);
          return;
        }
      }

      let resolved = false;

      const unsubscribeAuth = chatService.on
        ? chatService.on("socket_authenticated", (data) => {
            if (!resolved) {
              resolved = true;
              unsubscribeAuth();
              unsubscribeError();
              resolve(data);
            }
          })
        : null;

      const unsubscribeError = chatService.on
        ? chatService.on("auth_failed", (error) => {
            if (!resolved) {
              resolved = true;
              if (unsubscribeAuth) unsubscribeAuth();
              unsubscribeError();
              reject(new Error("Authentication failed: " + error.error));
            }
          })
        : null;

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (unsubscribeAuth) unsubscribeAuth();
          if (unsubscribeError) unsubscribeError();
          reject(new Error("Authentication timeout"));
        }
      }, 10000);
    });
  };

  // ✅ UPDATED: Setup socket listeners (enhanced from PartyChat)
  const setupSocketListeners = () => {
    cleanupSocketListeners();

    const unsubscribeFunctions = [];
    const processedMessageIds = new Set();

    if (chatService.on) {
      const listeners = [
        chatService.on("new_message", (message) => {
          const messageId = message._id || message.id;

          if (processedMessageIds.has(messageId)) {
            return;
          }

          processedMessageIds.add(messageId);
          handleNewMessage(message);
        }),

        chatService.on("message_sent", (data) => {
          if (data.messageId) {
            processedMessageIds.add(data.messageId);
          }

          setMessages((prev) => {
            let messageUpdated = false;

            const updatedMessages = prev.map((msg) => {
              const isTargetMessage =
                msg.id === data.tempId ||
                msg.tempId === data.tempId ||
                (msg.id &&
                  msg.id.startsWith("temp_") &&
                  Math.abs(new Date(msg.timestamp) - new Date()) < 60000);

              if (isTargetMessage) {
                messageUpdated = true;
                return {
                  ...msg,
                  id: data.messageId,
                  tempId: data.tempId,
                  status: "sent",
                  realMessageId: data.messageId,
                  timestamp: new Date(),
                };
              }
              return msg;
            });

            return updatedMessages;
          });

          updateMessageStatus(data.messageId, "sent");
        }),

        chatService.on("user_typing", handleTyping),
        chatService.on("socket_connected", () => {
          setIsConnected(true);
          displayToast("Connected to chat server", "success");
          processedMessageIds.clear();
        }),
        chatService.on("socket_disconnected", (data) => {
          setIsConnected(false);
          displayToast("Disconnected from chat server", "warning");
        }),
        chatService.on("message_delivered", (data) => {
          updateMessageStatus(data.messageId, "delivered");
        }),
        chatService.on("message_read", (data) => {
          updateMessageStatus(data.messageId, "read");
        }),
      ];

      listeners.forEach((listener) => {
        if (typeof listener === "function") {
          unsubscribeFunctions.push(listener);
        }
      });
    }

    setSocketUnsubscribeFns(unsubscribeFunctions);
  };

  // ✅ UPDATED: Handle new message (from PartyChat)
  const handleNewMessage = (message) => {
    try {
      const messageId = message._id || message.id;
      const currentCompanyId =
        currentCompanyData?._id || currentCompanyData?.id;

      const senderCompanyId =
        typeof message.senderCompanyId === "object"
          ? message.senderCompanyId._id || message.senderCompanyId.id
          : message.senderCompanyId;

      const isFromMyCompany = senderCompanyId === currentCompanyId;

      if (isFromMyCompany) {
        // Handle sent message updates
        setMessages((prev) => {
          const existingMessage = prev.find(
            (m) => m.realMessageId === messageId || m.id === messageId
          );
          if (existingMessage) {
            return prev;
          }

          const tempMessage = prev.find(
            (m) =>
              m.id &&
              m.id.startsWith("temp_") &&
              m.content === message.content &&
              m.senderCompanyId === senderCompanyId
          );

          if (tempMessage) {
            return prev.map((m) =>
              m.id === tempMessage.id
                ? {
                    ...m,
                    id: messageId,
                    realMessageId: messageId,
                    status: "delivered",
                    timestamp: new Date(message.createdAt || message.timestamp),
                  }
                : m
            );
          }

          return prev;
        });
        return;
      }

      const formattedMessage = formatIncomingMessage(message);

      setMessages((prev) => {
        const exists = prev.find(
          (m) =>
            m.id === formattedMessage.id ||
            m.realMessageId === formattedMessage.id
        );

        if (exists) {
          return prev;
        }

        return [...prev, formattedMessage];
      });

      scrollToBottom();

      // Handle notifications
      if (!isChatFocused && notificationSettings.enabled) {
        setUnreadCount((prev) => prev + 1);
        if (notificationSettings.sound) {
          playNotificationSound();
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  // ✅ ADDED: Play notification sound (from PartyChat)
  const playNotificationSound = () => {
    try {
      if (!notificationSettings.sound) return;

      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Silent fail
    }
  };

  // ✅ UPDATED: Handle typing (from PartyChat)
  const handleTyping = (data) => {
    if (data.companyId !== currentCompanyData?._id) {
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
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    }
  };

  // ✅ UPDATED: Cleanup socket listeners (from PartyChat)
  const cleanupSocketListeners = () => {
    socketUnsubscribeFns.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch (error) {
          // Silent fail
        }
      }
    });

    setSocketUnsubscribeFns([]);
  };

  // ✅ UPDATED: Load chat history (aligned with PartyChat)
  const loadChatHistory = async (page = 1, append = false) => {
    if (!selectedParty || !mappingValidated || !targetCompanyId) return;

    try {
      const response = await chatService.getChatHistory(selectedParty, {
        page,
        limit: 50,
        messageType: "website",
        myCompanyId: currentCompanyData._id,
        targetCompanyId: targetCompanyId,
      });

      if (response?.success && response.data) {
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

        // Mark as read after loading
        setTimeout(() => {
          markConversationAsRead();
        }, 1000);
      } else {
        displayToast("No chat history found", "info");
      }
    } catch (error) {
      setError("Failed to load chat history");
      displayToast("Failed to load chat history", "error");
    }
  };

  // Load conversation summary (optional functionality)
  const loadConversationSummary = async () => {
    if (!selectedParty || !mappingValidated) return;

    try {
      if (typeof chatService.getConversationSummary === "function") {
        const response = await chatService.getConversationSummary(
          selectedParty
        );
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

  // Load templates (optional functionality)
  const loadTemplates = async () => {
    setTemplates({}); // No templates for now
  };

  // Load chat participants (optional functionality)
  const loadChatParticipants = async () => {
    setChatParticipants([]); // No participants for now
  };

  // ✅ UPDATED: Cleanup (from PartyChat)
  const cleanup = () => {
    try {
      if (isTyping) handleTypingStop();

      if (
        isConnected &&
        selectedParty &&
        mappingValidated &&
        chatService.leaveChat
      ) {
        chatService.leaveChat(selectedParty).catch(() => {
          // Silent fail
        });
      }

      cleanupSocketListeners();
      setMessages([]);
      setTypingUsers([]);
      setError(null);
      setUnreadCount(0);
      setIsChatFocused(false);
    } catch (error) {
      // Silent fail
    }
  };

  // ✅ UPDATED: Format incoming message (from PartyChat)
  const formatIncomingMessage = (message) => {
    const currentCompanyId = currentCompanyData?._id || currentCompanyData?.id;

    const senderCompanyId =
      typeof message.senderCompanyId === "object"
        ? message.senderCompanyId._id || message.senderCompanyId.id
        : message.senderCompanyId;

    const receiverCompanyId =
      typeof message.receiverCompanyId === "object"
        ? message.receiverCompanyId._id || message.receiverCompanyId.id
        : message.receiverCompanyId;

    const isFromMyCompany = senderCompanyId === currentCompanyId;
    const messageType = isFromMyCompany ? "sent" : "received";

    return {
      id:
        message._id ||
        message.id ||
        `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: messageType,
      content: message.content || "",
      timestamp: new Date(message.createdAt || message.timestamp || Date.now()),
      status: message.status || "delivered",
      sender: isFromMyCompany ? "You" : message.senderName || "User",
      senderCompanyName:
        typeof message.senderCompanyId === "object"
          ? message.senderCompanyId.businessName
          : message.senderCompanyName,
      messageType: message.messageType || "website",
      senderCompanyId: senderCompanyId,
      receiverCompanyId: receiverCompanyId,
      chatType: "company-to-company",
    };
  };

  // Update message status
  const updateMessageStatus = (messageId, status) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? {...msg, status} : msg))
    );
  };

  // ✅ UPDATED: Handle send message (aligned with PartyChat)
  const handleSendMessage = async () => {
    if (
      !newMessage.trim() ||
      isSending ||
      !selectedParty ||
      !mappingValidated
    ) {
      return;
    }

    if (!isConnected || !chatService.isConnected) {
      displayToast("Connection lost. Please refresh and try again.", "error");
      return;
    }

    setIsSending(true);
    const messageContent = newMessage.trim();

    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      const tempMessage = {
        id: tempId,
        tempId: tempId,
        type: "sent",
        content: messageContent,
        timestamp: new Date(),
        status: "sending",
        sender: "You",
        messageType: "website",
        senderCompanyId: currentCompanyData._id,
        receiverCompanyId: targetCompanyId,
      };

      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");
      scrollToBottom();

      const messageData = {
        party: {
          ...selectedParty,
          _id: selectedParty._id,
          name: selectedParty.name,
          linkedCompanyId: targetCompanyId,
          targetCompanyId: targetCompanyId,
          chatCompanyId: targetCompanyId,
        },
        content: messageContent,
        messageType: "website",
        tempId: tempId,
        myCompanyId: currentCompanyData._id,
        targetCompanyId: targetCompanyId,
        senderCompanyId: currentCompanyData._id,
        receiverCompanyId: targetCompanyId,
      };

      const response = await chatService.sendMessage(messageData);

      if (response && response.success && response.data) {
        setMessages((prev) => {
          const responseMessageId = response.data._id || response.data.id;

          const updatedMessages = prev.map((msg) => {
            if (
              msg.id === tempId ||
              msg.tempId === tempId ||
              (msg.id &&
                msg.id.startsWith("temp_") &&
                msg.content === messageContent)
            ) {
              return {
                ...msg,
                id: responseMessageId,
                realMessageId: responseMessageId,
                status: "sent",
                timestamp: new Date(
                  response.data.createdAt || response.data.timestamp
                ),
              };
            }
            return msg;
          });

          return updatedMessages;
        });

        displayToast("Message sent successfully", "success");
      } else {
        throw new Error(response?.message || "Send failed");
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId || msg.tempId === tempId
            ? {...msg, status: "failed"}
            : msg
        )
      );
      displayToast(error.message || "Failed to send message", "error");
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing start/stop
  const handleTypingStart = () => {
    if (
      isConnected &&
      selectedParty &&
      mappingValidated &&
      !isTyping &&
      chatService.startTyping
    ) {
      chatService.startTyping(selectedParty);
      setIsTyping(true);
    }
  };

  const handleTypingStop = () => {
    if (
      isConnected &&
      selectedParty &&
      mappingValidated &&
      isTyping &&
      chatService.stopTyping
    ) {
      chatService.stopTyping(selectedParty);
      setIsTyping(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      handleTypingStop();
    } else {
      handleTypingStart();
    }
  };

  // Load more messages
  const loadMoreMessages = async () => {
    if (!hasMoreMessages || isLoadingMessages) return;

    setIsLoadingMessages(true);
    await loadChatHistory(currentPage + 1, true);
    setIsLoadingMessages(false);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, 100);
  };

  // Show toast message
  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Get status icon
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

  // ✅ UPDATED: Get message type icon (with display type support)
  const getMessageTypeIcon = (msgType) => {
    const effectiveType = msgType === "website" ? displayMessageType : msgType;

    switch (effectiveType) {
      case "whatsapp":
        return {icon: faCommentDots, color: "#25D366"};
      case "sms":
        return {icon: faMobileAlt, color: "#007bff"};
      case "email":
        return {icon: faEnvelope, color: "#dc3545"};
      default:
        return {icon: faCommentDots, color: "#6c757d"};
    }
  };

  // Format time and date
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

  // Render typing indicator
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
              {typingUsers[0].username} from {typingUsers[0].companyName} is
              typing...
            </small>
          </div>
        </div>
      </div>
    );
  };

  // Render mapping info
  const renderMappingInfo = () => {
    if (!selectedParty) return null;

    return (
      <div className="text-center py-2 border-bottom bg-light">
        <small className="text-muted" style={{fontSize: "10px"}}>
          <FontAwesomeIcon icon={faLink} className="me-1" />
          Chat between <strong>{currentCompany?.businessName}</strong> and{" "}
          <strong>{selectedParty.name}</strong>
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

  // Handle add party
  const handleAddParty = (quickAdd = true, type = "customer") => {
    setIsQuickAdd(quickAdd);
    setQuickAddType(type);
    setShowAddPartyModal(true);
  };

  // Handle save party
  const handleSaveParty = async (
    newParty,
    isQuickAdd = false,
    isUpdate = false
  ) => {
    try {
      // Add or update the party in the all parties list
      setAllParties((prev) =>
        isUpdate
          ? prev.map((p) => (p.id === newParty.id ? newParty : p))
          : [...prev, newParty]
      );

      // If the party has chat capabilities, add it to linked parties
      if (newParty.canChat && newParty.chatCompanyId) {
        setLinkedParties((prev) =>
          isUpdate
            ? prev.map((p) => (p.id === newParty.id ? newParty : p))
            : [...prev, newParty]
        );
      }

      // Update the current parties view based on active section
      if (
        activeSection === "linked" &&
        newParty.canChat &&
        newParty.chatCompanyId
      ) {
        setParties((prev) =>
          isUpdate
            ? prev.map((p) => (p.id === newParty.id ? newParty : p))
            : [...prev, newParty]
        );
      } else if (activeSection === "all") {
        setParties((prev) =>
          isUpdate
            ? prev.map((p) => (p.id === newParty.id ? newParty : p))
            : [...prev, newParty]
        );
      }

      // Show success message
      showToastMessage(
        `${isUpdate ? "Updated" : "Added"} ${newParty.partyType} successfully!`,
        "success"
      );

      // Close modal
      setShowAddPartyModal(false);

      // Refresh the parties list
      setTimeout(async () => {
        try {
          const allPartiesResponse = await partyService.getParties({
            page: 1,
            limit: 100,
            search: "",
          });

          if (allPartiesResponse.success && allPartiesResponse.data?.parties) {
            const allPartiesData = allPartiesResponse.data.parties;
            setAllParties(allPartiesData);

            const linkedPartiesData = allPartiesData.filter(
              (party) => party.canChat && party.chatCompanyId
            );
            setLinkedParties(linkedPartiesData);

            setParties(
              activeSection === "linked" ? linkedPartiesData : allPartiesData
            );
          }
        } catch (error) {
          console.warn("Failed to refresh parties list:", error);
        }
      }, 1000);
    } catch (error) {
      showToastMessage(
        `Failed to ${isUpdate ? "update" : "add"} party. Please try again.`,
        "error"
      );
    }
  };

  // Filter parties
  const filteredParties = parties.filter(
    (party) =>
      party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.chatCompanyName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      party.phoneNumber?.includes(searchQuery)
  );

  // Calculate totals
  const totalLinkedCompanies = new Set(
    linkedParties.map((party) => party.chatCompanyId).filter(Boolean)
  ).size;

  const totalAllParties = allParties.length;

  // ✅ UPDATE: Enhanced handlePartyClick function
  const handlePartyClick = (party) => {
    // Check if party has chat capabilities
    if (!party.canChat || !party.chatCompanyId) {
      showToastMessage(
        "This party is not linked to any company for chat functionality. Please link them to a company first.",
        "error"
      );
      return;
    }

    setSelectedParty(party);
    setChatPopupOpen(true);
    setMessages([]);
    setError(null);
    setMappingValidated(false);

    // ✅ NEW: Prevent body scroll
    document.body.classList.add("chat-popup-open");
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  };

  // ✅ UPDATE: Enhanced closeChatPopup function
  const closeChatPopup = () => {
    setChatPopupOpen(false);
    setSelectedParty(null);
    setMessages([]);
    setNewMessage("");
    setIsTyping(false);
    setError(null);
    setMappingValidated(false);
    setTargetCompanyId(null);

    // ✅ NEW: Remove body scroll lock
    document.body.classList.remove("chat-popup-open");
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";

    cleanup();
  };
  // Handle share party (existing functionality)
  const handleShareParty = (party, event) => {
    event.stopPropagation();
    setSelectedPartyForShare(party);
    setShowShareModal(true);
  };

  // Generate shareable functions (existing functionality)
  const generateShareableLink = (party) => {
    const baseUrl = window.location.origin;
    const companyId = currentCompany?.id || currentCompany?._id;
    return `${baseUrl}/companies/${companyId}/parties/${party.id}`;
  };

  const generateShareableData = (party) => {
    const shareData = {
      name: party.name,
      type: formatPartyType(party.partyType),
      phone: party.phoneNumber,
      email: party.email,
      address: party.address,
      company: party.chatCompanyName,
      link: generateShareableLink(party),
      sharedBy: currentCompany?.businessName,
      sharedAt: new Date().toLocaleString(),
    };

    if (!shareOptions.includeContact) {
      delete shareData.phone;
      delete shareData.email;
    }

    if (!shareOptions.includeCompanyDetails) {
      delete shareData.company;
      delete shareData.address;
    }

    return shareData;
  };

  const handleCopyToClipboard = async (party) => {
    try {
      const shareData = generateShareableData(party);
      const shareText = `
🏢 ${shareData.name} (${shareData.type})
${shareData.phone ? `📱 ${shareData.phone}` : ""}
${shareData.email ? `📧 ${shareData.email}` : ""}
${shareData.company ? `🏢 Company: ${shareData.company}` : ""}
${shareData.address ? `📍 ${shareData.address}` : ""}

🔗 View Details: ${shareData.link}

Shared by ${shareData.sharedBy} on ${shareData.sharedAt}
      `.trim();

      await navigator.clipboard.writeText(shareText);
      showToastMessage("Party details copied to clipboard!", "success");
      setShowShareModal(false);
    } catch (error) {
      showToastMessage("Failed to copy to clipboard", "error");
    }
  };

  const handleNativeShare = async (party) => {
    if (!navigator.share) {
      showToastMessage("Share not supported on this device", "error");
      return;
    }

    try {
      const shareData = generateShareableData(party);
      await navigator.share({
        title: `${shareData.name} - ${shareData.type}`,
        text: `Check out ${shareData.name} (${shareData.type}) from ${shareData.sharedBy}`,
        url: shareData.link,
      });
      setShowShareModal(false);
    } catch (error) {
      if (error.name !== "AbortError") {
        showToastMessage("Failed to share", "error");
      }
    }
  };

  const handleEmailShare = (party) => {
    const shareData = generateShareableData(party);
    const subject = `${shareData.name} - ${shareData.type} Details`;
    const body = `Hi,

I'm sharing the details of ${shareData.name} (${shareData.type}) with you:

${shareData.phone ? `Phone: ${shareData.phone}` : ""}
${shareData.email ? `Email: ${shareData.email}` : ""}
${shareData.company ? `Company: ${shareData.company}` : ""}
${shareData.address ? `Address: ${shareData.address}` : ""}

View full details: ${shareData.link}

Best regards,
${shareData.sharedBy}`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
    setShowShareModal(false);
  };

  // Utility functions
  const getAvatarColor = (name) => {
    const colors = [
      "#2563eb",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#06b6d4",
      "#84cc16",
      "#f97316",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const generateInitials = (name) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPartyType = (type) => {
    return type === "supplier" ? "Supplier" : "Customer";
  };

  // ✅ ADDED: Missing function - Validate party company mapping
  const validatePartyCompanyMapping = () => {
    validatePartyMapping();
  };

  const renderTemplateButtons = () => {
    if (Object.keys(templates).length === 0) {
      return (
        <div className="text-center text-muted py-2">
          <FontAwesomeIcon icon={faClipboardList} className="me-2" />
          No templates available
        </div>
      );
    }

    return Object.entries(templates).map(([key, template], index) => (
      <Button
        key={`template-${key}-${index}`} // ✅ FIXED: Added unique key
        variant="outline-secondary"
        size="sm"
        className="me-1 mb-1"
        onClick={() => {
          setNewMessage(template.content || template);
          setSelectedTemplate(key);
          setShowTemplates(false);
        }}
        style={{fontSize: "10px"}}
      >
        {template.name || key}
      </Button>
    ));
  };

  const renderChatPopupAsPortal = () => {
    if (!chatPopupOpen || !selectedParty) return null;

    const popupContent = (
      <div className="chat-overlay" onClick={closeChatPopup}>
        <div className="chat-popup" onClick={(e) => e.stopPropagation()}>
          <div className="popup-header">
            <div className="popup-header-left">
              <div
                className="popup-avatar"
                style={{
                  backgroundColor: getAvatarColor(selectedParty.name),
                }}
              >
                {generateInitials(selectedParty.name)}
              </div>
              <div className="popup-user-info">
                <div className="popup-user-name">{selectedParty.name}</div>
                <div className="popup-user-status">
                  <FontAwesomeIcon icon={faBuilding} className="me-1" />
                  <span>{formatPartyType(selectedParty.partyType)}</span>
                </div>
              </div>
            </div>
            <div className="popup-actions">
              <button
                type="button"
                className="popup-close-btn"
                onClick={closeChatPopup}
                aria-label="Close chat"
                title="Close (Esc)"
              >
                <FontAwesomeIcon icon={faTimes} size="sm" />
              </button>
            </div>
          </div>

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

          <div className="popup-body">
            {!mappingValidated ? (
              <div className="d-flex align-items-center justify-content-center h-100 text-center p-4">
                <div>
                  <FontAwesomeIcon
                    icon={faLink}
                    size="3x"
                    className="text-warning mb-3"
                  />
                  <h5>Company Mapping Required</h5>
                  <p className="text-muted">
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
              </div>
            ) : (
              <>
                {isLoadingMessages && (
                  <div className="text-center p-3">
                    <Spinner animation="border" size="sm" />
                    <span className="ms-2">Loading messages...</span>
                  </div>
                )}

                {hasMoreMessages &&
                  !isLoadingMessages &&
                  messages.length > 0 && (
                    <div className="text-center p-2 border-bottom">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={loadMoreMessages}
                        disabled={isLoadingMessages}
                      >
                        Load More Messages
                      </Button>
                    </div>
                  )}

                <div ref={messagesContainerRef} className="messages-container">
                  {messages.length === 0 && !isLoadingMessages && (
                    <div className="no-messages">
                      <div>
                        <FontAwesomeIcon
                          icon={faComments}
                          size="3x"
                          className="mb-3"
                        />
                        <p>No messages yet. Start a conversation!</p>
                      </div>
                    </div>
                  )}

                  {messages.map((message, index) => {
                    const showDate =
                      index === 0 ||
                      formatDate(message.timestamp) !==
                        formatDate(messages[index - 1].timestamp);

                    return (
                      <Fragment
                        key={`message-${message.id || message.tempId || index}`}
                      >
                        {showDate && (
                          <div className="date-separator">
                            <small>{formatDate(message.timestamp)}</small>
                          </div>
                        )}

                        <div className={`message-wrapper ${message.type}`}>
                          <div className={`message-bubble ${message.type}`}>
                            <div className="message-content">
                              {message.content}
                            </div>
                            <div className="message-footer">
                              <span className="message-time">
                                {formatTime(message.timestamp)}
                              </span>
                              {message.type === "sent" && (
                                <span className="message-status">
                                  {getStatusIcon(message.status)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}

                  {typingUsers.length > 0 && (
                    <div className="typing-indicator-wrapper">
                      <div className="typing-indicator-bubble">
                        <div className="typing-indicator">
                          <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                          <span className="typing-text">
                            {typingUsers[0].username} is typing...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </>
            )}
          </div>

          <div className="popup-footer">
            {mappingValidated && (
              <>
                <InputGroup className="message-input-group">
                  <Form.Control
                    ref={messageInputRef}
                    as="textarea"
                    rows={2}
                    className="message-input"
                    placeholder={`Type your message to ${selectedParty?.name}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onKeyUp={handleTypingStop}
                    disabled={isSending}
                  />
                  <Button
                    className="message-send-btn"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                  >
                    {isSending ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <FontAwesomeIcon icon={faPaperPlane} />
                    )}
                  </Button>
                </InputGroup>

                <div className="footer-info">
                  <div className="character-count">
                    {newMessage.length}/1000 characters
                  </div>
                  <div className="connection-status">
                    <div className="status-item">
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
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );

    return createPortal(popupContent, document.body);
  };

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

      <div className="team-chats">
        <Card className="chat-section">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <h3 className="chat-title">Business Chats</h3>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div className="members-count">
                <FontAwesomeIcon icon={faBuilding} className="me-1" />
                {activeSection === "linked"
                  ? `${totalLinkedCompanies} Linked Companies`
                  : `${totalAllParties} Total Parties`}
              </div>
            </div>
          </div>

          {/* Section Toggle */}
          <div className="section-toggle-container">
            {/* Add Party Button - Full Width */}
            <Button
              className="add-party-button"
              onClick={() => handleAddParty(true, "customer")}
            >
              <FontAwesomeIcon icon={faUser} />
              Add New Party
            </Button>

            {/* Filter Buttons */}
            <div className="filter-buttons">
              <Button
                variant={
                  activeSection === "linked" ? "primary" : "outline-primary"
                }
                onClick={() => {
                  setActiveSection("linked");
                  setParties(linkedParties);
                  setSearchQuery("");
                }}
              >
                <FontAwesomeIcon icon={faBuilding} />
                Linked ({linkedParties.length})
              </Button>

              <Button
                variant={
                  activeSection === "all" ? "primary" : "outline-primary"
                }
                onClick={() => {
                  setActiveSection("all");
                  setParties(allParties);
                  setSearchQuery("");
                }}
              >
                <FontAwesomeIcon icon={faUsers} />
                All Parties ({allParties.length})
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="search-chat">
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder={`Search ${
                  activeSection === "linked"
                    ? "linked companies"
                    : "all parties"
                }...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </div>

          {/* Chat List */}
          <div className="chat-list">
            {loading ? (
              Array.from({length: 5}).map((_, index) => (
                <div
                  key={`loading-item-${index}`}
                  className="chat-item loading"
                >
                  <div className="chat-avatar-container">
                    <div
                      className="chat-avatar"
                      style={{backgroundColor: "#e2e8f0"}}
                    >
                      <FontAwesomeIcon icon={faBuilding} />
                    </div>
                  </div>
                  <div className="chat-info">
                    <div className="chat-info-top">
                      <div className="chat-name text-muted">Loading...</div>
                      <div className="chat-time text-muted">...</div>
                    </div>
                    <div className="chat-preview">
                      <span className="party-type text-muted">
                        Loading{" "}
                        {activeSection === "linked"
                          ? "business conversations"
                          : "parties"}
                        ...
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : error && !chatPopupOpen ? (
              <div className="error-state">
                <div className="error-content">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    size="3x"
                    className="mb-3"
                  />
                  <h5>
                    Unable to load{" "}
                    {activeSection === "linked" ? "conversations" : "parties"}
                  </h5>
                  <p>{error}</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : filteredParties.length > 0 ? (
              filteredParties.map((party, index) => (
                <div
                  key={`party-${party.id || party._id || index}`}
                  className={`chat-item ${
                    !party.canChat || !party.chatCompanyId ? "opacity-75" : ""
                  }`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${party.canChat ? "Open chat with" : "View"} ${
                    party.name
                  }`}
                >
                  <div className="chat-avatar-container">
                    <div
                      className="chat-avatar"
                      style={{backgroundColor: getAvatarColor(party.name)}}
                    >
                      {generateInitials(party.name)}
                    </div>
                    {party.canChat && party.chatCompanyId && (
                      <div
                        className="online-indicator"
                        title="Chat Enabled"
                      ></div>
                    )}
                  </div>

                  {/* Main clickable area */}
                  <div
                    className="chat-info"
                    onClick={() => handlePartyClick(party)}
                    style={{cursor: "pointer", flex: 1}}
                  >
                    <div className="chat-info-top">
                      <div className="chat-name">
                        {party.name}
                        {party.canChat && party.chatCompanyId && (
                          <span className="linked-indicator">
                            <FontAwesomeIcon icon={faBuilding} size="sm" />
                          </span>
                        )}
                        {(!party.canChat || !party.chatCompanyId) &&
                          activeSection === "all" && (
                            <span
                              className="text-muted ms-2"
                              title="Not linked to any company"
                            >
                              <FontAwesomeIcon
                                icon={faExclamationTriangle}
                                size="sm"
                              />
                            </span>
                          )}
                      </div>
                      <div className="chat-time">
                        {formatPartyType(party.partyType)}
                      </div>
                    </div>
                    <div className="chat-preview">
                      {party.chatCompanyName ? (
                        <>
                          <span className="company-name">
                            {party.chatCompanyName}
                          </span>
                          <span className="party-type">
                            • {party.phoneNumber}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-muted">
                            {party.phoneNumber || "No phone number"}
                          </span>
                          {activeSection === "all" && (
                            <span className="party-type text-warning">
                              • Not linked
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Share button */}
                  <div className="d-flex align-items-center">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={(e) => handleShareParty(party, e)}
                      title="Share party details"
                      style={{
                        width: "32px",
                        height: "32px",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FontAwesomeIcon icon={faShare} size="sm" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-chats">
                <div className="no-chats-content">
                  <FontAwesomeIcon
                    icon={activeSection === "linked" ? faBuilding : faUsers}
                    size="3x"
                    className="text-muted mb-3"
                  />
                  <h5 className="text-muted">
                    {activeSection === "linked"
                      ? "No business conversations"
                      : "No parties found"}
                  </h5>
                  <p className="text-muted">
                    {searchQuery
                      ? `No parties match your search criteria in ${
                          activeSection === "linked"
                            ? "linked companies"
                            : "all parties"
                        }`
                      : activeSection === "linked"
                      ? "No parties have linked companies for chat yet"
                      : "No parties have been added yet"}
                  </p>
                  {!searchQuery && (
                    <div className="d-flex gap-2 justify-content-center flex-wrap">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAddParty(true, "customer")}
                      >
                        <FontAwesomeIcon icon={faRocket} className="me-1" />
                        Quick Add Customer
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleAddParty(true, "supplier")}
                      >
                        <FontAwesomeIcon icon={faRocket} className="me-1" />
                        Quick Add Supplier
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => onNavigate?.("parties")}
                      >
                        Manage Parties
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ✅ REPLACED: Chat Popup as Portal */}
      {renderChatPopupAsPortal()}

      {/* Share Modal */}
      {showShareModal && selectedPartyForShare && (
        <div
          className="modal show d-block"
          style={{zIndex: 2050, backgroundColor: "rgba(0,0,0,0.5)"}}
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FontAwesomeIcon icon={faShare} className="me-2" />
                  Share {selectedPartyForShare.name}
                </h5>
                <Button
                  variant="link"
                  className="btn-close"
                  onClick={() => setShowShareModal(false)}
                />
              </div>

              <div className="modal-body">
                {/* Party Info Preview */}
                <div className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-2">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center me-3"
                        style={{
                          width: "40px",
                          height: "40px",
                          backgroundColor: getAvatarColor(
                            selectedPartyForShare.name
                          ),
                          color: "white",
                          fontWeight: "bold",
                        }}
                      >
                        {generateInitials(selectedPartyForShare.name)}
                      </div>
                      <div>
                        <h6 className="mb-0">{selectedPartyForShare.name}</h6>
                        <small className="text-muted">
                          {formatPartyType(selectedPartyForShare.partyType)}
                        </small>
                      </div>
                    </div>

                    {shareOptions.includeContact && (
                      <div className="mb-2">
                        {selectedPartyForShare.phoneNumber && (
                          <div>📱 {selectedPartyForShare.phoneNumber}</div>
                        )}
                        {selectedPartyForShare.email && (
                          <div>📧 {selectedPartyForShare.email}</div>
                        )}
                      </div>
                    )}

                    {shareOptions.includeCompanyDetails && (
                      <div>
                        {selectedPartyForShare.chatCompanyName && (
                          <div>🏢 {selectedPartyForShare.chatCompanyName}</div>
                        )}
                        {selectedPartyForShare.address && (
                          <div>📍 {selectedPartyForShare.address}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Share Options */}
                <div className="mb-3">
                  <h6>Share Options</h6>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="includeContact"
                      checked={shareOptions.includeContact}
                      onChange={(e) =>
                        setShareOptions((prev) => ({
                          ...prev,
                          includeContact: e.target.checked,
                        }))
                      }
                    />
                    <label
                      className="form-check-label"
                      htmlFor="includeContact"
                    >
                      Include contact information
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="includeCompanyDetails"
                      checked={shareOptions.includeCompanyDetails}
                      onChange={(e) =>
                        setShareOptions((prev) => ({
                          ...prev,
                          includeCompanyDetails: e.target.checked,
                        }))
                      }
                    />
                    <label
                      className="form-check-label"
                      htmlFor="includeCompanyDetails"
                    >
                      Include company details
                    </label>
                  </div>
                </div>

                {/* Share Actions */}
                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleCopyToClipboard(selectedPartyForShare)}
                  >
                    <FontAwesomeIcon icon={faCopy} className="me-2" />
                    Copy to Clipboard
                  </Button>

                  {navigator.share && (
                    <Button
                      variant="success"
                      onClick={() => handleNativeShare(selectedPartyForShare)}
                    >
                      <FontAwesomeIcon icon={faShare} className="me-2" />
                      Share via Device
                    </Button>
                  )}

                  <Button
                    variant="outline-primary"
                    onClick={() => handleEmailShare(selectedPartyForShare)}
                  >
                    <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                    Share via Email
                  </Button>

                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      const link = generateShareableLink(selectedPartyForShare);
                      navigator.clipboard.writeText(link);
                      showToastMessage("Link copied to clipboard!", "success");
                    }}
                  >
                    <FontAwesomeIcon icon={faLink} className="me-2" />
                    Copy Link Only
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Party Modal */}
      <AddNewParty
        show={showAddPartyModal}
        onHide={() => setShowAddPartyModal(false)}
        editingParty={null}
        onSaveParty={handleSaveParty}
        isQuickAdd={isQuickAdd}
        quickAddType={quickAddType}
      />

      <style>{`
      .team-chats {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-radius: 8px;
}

.chat-header {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px 8px 0 0;
}

.chat-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.members-count {
  font-size: 0.8rem;
  opacity: 0.9;
}

.section-toggle-container {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  background-color: #f8f9fa;
}

.add-party-button {
  width: 100%;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  border: none;
  color: white;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.add-party-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
  border-radius: 8px;
}

.filter-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.filter-buttons .btn {
  font-size: 0.8rem;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
}

.search-chat {
  padding: 0 1rem 1rem;
  background-color: #f8f9fa;
}

.search-chat .form-control,
.search-chat .input-group-text {
  border-radius: 8px;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.chat-item:hover {
  background-color: #f8f9fa;
  border-color: #dee2e6;
  transform: translateX(2px);
  border-radius: 8px;
}

.chat-item.loading {
  opacity: 0.6;
  cursor: default;
  animation: pulse 1.5s ease-in-out infinite;
}

.chat-avatar-container {
  position: relative;
  margin-right: 0.75rem;
}

.chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background-color: #28a745;
  border: 2px solid white;
  border-radius: 50%;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-info-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.chat-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.linked-indicator {
  color: #28a745;
}

.chat-time {
  font-size: 0.7rem;
  color: #6c757d;
}

.chat-preview {
  font-size: 0.8rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.company-name {
  font-weight: 500;
  color: #495057;
}

.party-type {
  font-size: 0.7rem;
}

.error-state, 
.no-chats {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
}

.error-content, 
.no-chats-content {
  max-width: 250px;
}

body.chat-popup-open {
  overflow: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
}

.chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: overlayFadeIn 0.3s ease-out;
}

.chat-popup {
  position: relative;
  width: 100%;
  max-width: 480px;
  height: 88vh;
  max-height: 680px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: popupSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes overlayFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(12px);
  }
}

@keyframes popupSlideIn {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(-30px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.popup-header {
  padding: 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 16px 16px 0 0;
  flex-shrink: 0;
  min-height: 80px;
}

.popup-header-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.popup-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  margin-right: 1rem;
  font-size: 1.1rem;
  border: 3px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.popup-user-info {
  flex: 1;
  min-width: 0;
}

.popup-user-name {
  font-weight: 700;
  font-size: 1.15rem;
  margin-bottom: 0.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.popup-user-status {
  font-size: 0.75rem;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
  line-height: 1.4;
}

.popup-user-status .badge {
  display: none;
}

.popup-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
}

.popup-action-btn, 
.popup-close-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white;
  padding: 0.6rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  backdrop-filter: blur(8px);
}

.popup-action-btn:hover, 
.popup-close-btn:hover,
.popup-action-btn:focus,
.popup-close-btn:focus {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  color: white;
  text-decoration: none;
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.popup-action-btn:active,
.popup-close-btn:active {
  transform: translateY(0) scale(1);
}

.popup-body {
  flex: 1;
  overflow: hidden;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  scroll-behavior: smooth;
  background: transparent;
}

.no-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #6c757d;
  padding: 2rem 1rem;
}

.no-messages div {
  max-width: 280px;
}

.no-messages .fa-comments {
  color: #dee2e6;
  margin-bottom: 1rem;
}

.no-messages p {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #6c757d;
  font-weight: 500;
}

.no-messages small {
  font-size: 0.8rem;
  color: #adb5bd;
  line-height: 1.4;
}

.date-separator {
  text-align: center;
  margin: 1rem 0 0.6rem;
}

.date-separator small {
  background: rgba(255, 255, 255, 0.95);
  color: #6c757d;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
}

.message-wrapper {
  display: flex;
  margin-bottom: 0.6rem;
  align-items: flex-end;
  gap: 0.3rem;
}

.message-wrapper.sent {
  justify-content: flex-end;
}

.message-wrapper.received {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 75%;
  min-width: 80px;
  padding: 0.4rem 0.6rem;
  border-radius: 12px;
  word-wrap: break-word;
  position: relative;
  animation: messageSlideIn 0.3s ease-out;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
}

.message-bubble.sent {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
  margin-left: auto;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.message-bubble.received {
  background: rgba(255, 255, 255, 0.95);
  color: #2d3748;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-bottom-left-radius: 4px;
  margin-right: auto;
  backdrop-filter: blur(12px);
}

.message-type-indicator {
  display: none;
}

.message-content {
  font-size: 0.75rem;
  line-height: 1.3;
  margin-bottom: 0.2rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-weight: 400;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.2rem;
  gap: 0.3rem;
}

.message-time {
  font-size: 0.6rem;
  opacity: 0.8;
  white-space: nowrap;
  font-weight: 500;
}

.message-bubble.sent .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message-bubble.received .message-time {
  color: #6c757d;
}

.message-status {
  font-size: 0.6rem;
  opacity: 0.8;
  color: white;
}

.message-status .fa-check,
.message-status .fa-check-double {
  font-size: 8px;
  color: white;
}

.message-status .fa-check-double.text-success {
  color: white;
}

.typing-indicator-wrapper {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 0.6rem;
}

.typing-indicator-bubble {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 0.4rem 0.6rem;
  max-width: 75%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(12px);
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.typing-dots {
  display: flex;
  gap: 2px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #6c757d;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { 
  animation-delay: -0.32s; 
}

.typing-dots span:nth-child(2) { 
  animation-delay: -0.16s; 
}

.typing-text {
  font-size: 0.7rem;
  color: #6c757d;
  font-weight: 500;
}

@keyframes typing {
  0%, 80%, 100% { 
    transform: scale(0.8); 
    opacity: 0.5; 
  }
  40% { 
    transform: scale(1.2); 
    opacity: 1; 
  }
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.popup-footer {
  padding: 0.8rem;
  border-top: 1px solid #e9ecef;
  background: white;
  border-radius: 0 0 16px 16px;
  flex-shrink: 0;
}

.message-type-buttons {
  display: none;
}

.templates-section {
  display: none;
}

.message-input-group {
  border-radius: 12px;
  border: 1px solid #e9ecef;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.message-input {
  border: none;
  box-shadow: none;
  resize: none;
  font-size: 0.8rem;
  line-height: 1.4;
  padding: 0.6rem 0.8rem;
  background: white;
}

.message-input:focus {
  border: none;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.message-send-btn {
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.6rem 0.8rem;
  transition: all 0.2s ease;
  min-width: 50px;
}

.message-send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.message-send-btn:disabled {
  opacity: 0.6;
  transform: none;
}

.footer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.4rem;
  font-size: 0.6rem;
  color: #6c757d;
}

.character-count {
  opacity: 0.8;
  font-weight: 500;
}

.connection-status {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-item .fa {
  font-size: 7px;
}

@media (max-width: 768px) {
  .chat-overlay {
    padding: 0.5rem;
  }

  .chat-popup {
    width: 100%;
    height: 95vh;
    max-height: none;
    border-radius: 12px;
  }

  .popup-header {
    padding: 1rem;
    border-radius: 12px 12px 0 0;
    min-height: 70px;
  }

  .popup-avatar {
    width: 45px;
    height: 45px;
    font-size: 1rem;
  }

  .popup-user-name {
    font-size: 1rem;
  }

  .popup-user-status {
    font-size: 0.7rem;
  }

  .popup-action-btn, 
  .popup-close-btn {
    width: 36px;
    height: 36px;
    padding: 0.5rem;
    border-radius: 8px;
  }

  .popup-footer {
    padding: 0.6rem;
    border-radius: 0 0 12px 12px;
  }

  .message-bubble {
    max-width: 85%;
    padding: 0.35rem 0.5rem;
    border-radius: 10px;
  }

  .message-content {
    font-size: 0.7rem;
  }

  .message-time {
    font-size: 0.55rem;
  }

  .footer-info {
    font-size: 0.6rem;
    flex-direction: column;
    gap: 0.3rem;
    align-items: flex-start;
  }

  .messages-container {
    padding: 0.4rem;
  }

  .date-separator {
    margin: 1rem 0 0.75rem;
  }

  .date-separator small {
    font-size: 0.65rem;
    padding: 0.25rem 0.6rem;
  }
}

@media (max-width: 480px) {
  .chat-overlay {
    padding: 0.25rem;
  }

  .chat-popup {
    height: 98vh;
    border-radius: 8px;
  }

  .popup-header {
    padding: 0.75rem;
    border-radius: 8px 8px 0 0;
    min-height: 65px;
  }

  .popup-avatar {
    width: 40px;
    height: 40px;
    font-size: 0.9rem;
  }

  .popup-user-name {
    font-size: 0.95rem;
  }

  .popup-action-btn, 
  .popup-close-btn {
    width: 32px;
    height: 32px;
    padding: 0.4rem;
    border-radius: 6px;
  }

  .popup-footer {
    padding: 0.5rem;
    border-radius: 0 0 8px 8px;
  }

  .message-bubble {
    max-width: 90%;
    padding: 0.3rem 0.45rem;
    border-radius: 8px;
  }

  .message-bubble.sent {
    border-bottom-right-radius: 3px;
  }

  .message-bubble.received {
    border-bottom-left-radius: 3px;
  }

  .message-content {
    font-size: 0.65rem;
  }

  .message-time {
    font-size: 0.5rem;
  }

  .date-separator small {
    font-size: 0.6rem;
    padding: 0.15rem 0.4rem;
  }
}

.chat-list::-webkit-scrollbar,
.messages-container::-webkit-scrollbar {
  width: 4px;
}

.chat-list::-webkit-scrollbar-track,
.messages-container::-webkit-scrollbar-track {
  background-color: transparent;
}

.chat-list::-webkit-scrollbar-thumb,
.messages-container::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.chat-list::-webkit-scrollbar-thumb:hover,
.messages-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.form-control,
.form-select,
.btn,
.input-group-text,
.alert,
.card,
.modal-content {
  border-radius: 8px;
}

.dropdown-menu {
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.dropdown-item {
  border-radius: 6px;
  margin: 2px 4px;
  transition: all 0.2s ease;
}

.dropdown-item:hover,
.dropdown-item:focus {
  background-color: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border-radius: 6px;
}

.chat-item:focus,
.popup-action-btn:focus,
.popup-close-btn:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.chat-popup:focus {
  outline: none;
}

@keyframes pulse {
  0%, 100% { 
    opacity: 1; 
  }
  50% { 
    opacity: 0.5; 
  }
}

.modal {
  z-index: 8000;
}

.modal-backdrop {
  z-index: 7999;
}

.toast-container {
  z-index: 10001;
}

@media (prefers-color-scheme: dark) {
  .chat-popup {
    background-color: #1a1a1a;
    color: white;
  }

  .popup-body {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  }

  .popup-footer {
    background-color: #1a1a1a;
    border-color: #444;
  }

  .message-bubble.received {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .message-input {
    background-color: #2a2a2a;
    color: white;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-popup,
  .chat-overlay,
  .message-bubble,
  .popup-action-btn,
  .popup-close-btn {
    animation: none;
    transition: none;
  }

  .chat-item:hover {
    transform: none;
  }
} 
      `}</style>
    </>
  );
}

export default TeamChats;
