import React, {useState, useEffect, useRef} from "react";
import {
  Button,
  Form,
  InputGroup,
  Spinner,
  Dropdown,
  Alert,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faComments,
  faEnvelope,
  faPaperPlane,
  faTimes,
  faCheck,
  faCheckDouble,
  faClock,
  faExclamationTriangle,
  faCommentDots,
  faMobileAlt,
  faEllipsisV,
  faSync,
  faExclamationCircle,
  faCheckCircle,
  faBuilding,
  faLink,
  faBell,
  faBellSlash,
  faVolumeUp,
  faVolumeMute,
} from "@fortawesome/free-solid-svg-icons";

import chatService from "../../../services/chatService";
import notificationService from "../../../services/notificationService";

function PartyChat({
  show = true,
  onHide = () => {},
  onClose = () => {},
  party,
  isEmbedded = false,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState("website");
  const [displayMessageType, setDisplayMessageType] = useState("whatsapp");
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [targetCompanyId, setTargetCompanyId] = useState(null);
  const [mappingValidated, setMappingValidated] = useState(false);
  const [showToastFlag, setShowToastFlag] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [socketUnsubscribeFns, setSocketUnsubscribeFns] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    sound: true,
    desktop: true,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatFocused, setIsChatFocused] = useState(false);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  const handleClose = () => {
    if (onClose && typeof onClose === "function") {
      onClose();
    }
    if (onHide && typeof onHide === "function") {
      onHide();
    }
  };

  useEffect(() => {
    try {
      const companyData = localStorage.getItem("currentCompany");
      if (companyData) {
        const company = JSON.parse(companyData);
        setCurrentCompany(company);

        const companyId = company._id || company.id;
        if (companyId) {
          chatService.setCompanyContext(companyId, company.businessName);
        } else {
          setError("Company ID not found. Please refresh and try again.");
        }
      } else {
        setError("Company context not found. Please refresh and try again.");
      }

      const savedDisplayType = localStorage.getItem(
        "preferredDisplayMessageType"
      );
      if (savedDisplayType) {
        setDisplayMessageType(savedDisplayType);
      }

      const savedNotificationSettings = localStorage.getItem(
        "chatNotificationSettings"
      );
      if (savedNotificationSettings) {
        const parsed = JSON.parse(savedNotificationSettings);
        setNotificationSettings(parsed);
        if (notificationService.updateChatNotificationSettings) {
          notificationService.updateChatNotificationSettings(parsed);
        }
      }
    } catch (error) {
      setError("Failed to load settings. Please refresh and try again.");
    }
  }, []);

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

        setCurrentCompany(company);

        if (chatService.setCompanyContext) {
          chatService.setCompanyContext(companyId, company.businessName);
        }

        const savedNotificationSettings = localStorage.getItem(
          "chatNotificationSettings"
        );
        if (savedNotificationSettings) {
          try {
            const parsed = JSON.parse(savedNotificationSettings);
            setNotificationSettings(parsed);
            if (notificationService.updateChatNotificationSettings) {
              notificationService.updateChatNotificationSettings(parsed);
            }
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

  useEffect(() => {
    if (show && party && targetCompanyId && mappingValidated) {
      setIsChatFocused(true);

      if (notificationService.setChatWindowFocus) {
        notificationService.setChatWindowFocus(true, targetCompanyId);
      }

      setTimeout(() => {
        markConversationAsRead();
      }, 1000);

      return () => {
        setIsChatFocused(false);
        if (notificationService.setChatWindowFocus) {
          notificationService.setChatWindowFocus(false);
        }
      };
    }
  }, [show, party, targetCompanyId, mappingValidated]);

  useEffect(() => {
    const handleFocus = () => {
      if (show && party && targetCompanyId && mappingValidated) {
        setIsChatFocused(true);
        if (notificationService.setChatWindowFocus) {
          notificationService.setChatWindowFocus(true, targetCompanyId);
        }
        markConversationAsRead();
      }
    };

    const handleBlur = () => {
      setIsChatFocused(false);
      if (notificationService.setChatWindowFocus) {
        notificationService.setChatWindowFocus(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleFocus();
      } else {
        handleBlur();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [show, party, targetCompanyId, mappingValidated]);

  useEffect(() => {
    const handleNotificationUpdate = (data) => {
      if (data.count !== undefined) {
        setUnreadCount(data.count);
      }
    };

    const handleNewNotification = (notification) => {
      if (
        notification.relatedTo?.entityData?.senderCompanyId ===
          targetCompanyId &&
        !isChatFocused
      ) {
        setUnreadCount((prev) => prev + 1);

        if (notificationSettings.sound) {
          playNotificationSound();
        }
      }
    };

    const unsubscribeFunctions = [];

    if (notificationService.on) {
      const unsubscribe1 = notificationService.on(
        "unread_count_updated",
        handleNotificationUpdate
      );
      const unsubscribe2 = notificationService.on(
        "new_notification",
        handleNewNotification
      );

      if (typeof unsubscribe1 === "function")
        unsubscribeFunctions.push(unsubscribe1);
      if (typeof unsubscribe2 === "function")
        unsubscribeFunctions.push(unsubscribe2);
    }

    return () => {
      unsubscribeFunctions.forEach((fn) => {
        if (typeof fn === "function") fn();
      });
    };
  }, [targetCompanyId, isChatFocused, notificationSettings.sound]);

  useEffect(() => {
    if (party && currentCompany?._id) {
      validatePartyMapping();
    } else if (party && !currentCompany) {
      setMappingValidated(false);
      setTargetCompanyId(null);
      setError("Loading company context...");
    } else {
      setMappingValidated(false);
      setTargetCompanyId(null);
      setError(null);
    }
  }, [party?._id, currentCompany?._id]);

  useEffect(() => {
    if (
      show &&
      party &&
      currentCompany &&
      mappingValidated &&
      targetCompanyId
    ) {
      initializeChat();
    }

    return () => {
      if (show) cleanup();
    };
  }, [
    show,
    party?._id,
    currentCompany?._id,
    mappingValidated,
    targetCompanyId,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "chatNotificationSettings",
        JSON.stringify(notificationSettings)
      );
      if (notificationService.updateChatNotificationSettings) {
        notificationService.updateChatNotificationSettings(
          notificationSettings
        );
      }
    } catch (error) {
      // Silent fail
    }
  }, [notificationSettings]);

  const handleDisplayMessageTypeChange = (newDisplayType) => {
    setDisplayMessageType(newDisplayType);
    localStorage.setItem("preferredDisplayMessageType", newDisplayType);
  };

  const getEffectiveMessageType = () => {
    return "website";
  };

  const displayToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToastFlag(true);
    setTimeout(() => setShowToastFlag(false), 3000);
  };

  const markConversationAsRead = async () => {
    if (!party || !mappingValidated || !targetCompanyId) return;

    try {
      if (chatService.markConversationAsRead) {
        await chatService.markConversationAsRead(party);
      }
      setUnreadCount(0);
    } catch (error) {
      // Silent fail
    }
  };

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

  const validatePartyMapping = () => {
    try {
      if (!party || !currentCompany?._id) {
        setMappingValidated(false);
        setTargetCompanyId(null);
        setError(
          !party ? "Party data is missing" : "Loading company context..."
        );
        return;
      }

      const myCompanyId = currentCompany._id || currentCompany.id;
      let extractedCompanyId = null;

      try {
        const mappingResult =
          chatService.validateAndExtractPartyCompanyData(party);
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
          party.targetCompanyId,
          party.chatCompanyId,
          party.externalCompanyId,
          party.linkedCompanyId,
          party.companyId,
          party.company,
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
          extractedCompanyId = chatService.extractTargetCompanyId(party);
        } catch (extractError) {
          // Silent fail
        }
      }

      if (!extractedCompanyId) {
        if (party.users && Array.isArray(party.users)) {
          const userCompanyIds = party.users
            .map((user) => user.companyId || user.company?._id || user.company)
            .filter(
              (id) =>
                id && typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
            )
            .filter((id) => id !== myCompanyId);

          if (userCompanyIds.length > 0) {
            extractedCompanyId = userCompanyIds[0];
          }
        }

        if (
          !extractedCompanyId &&
          party.transactions &&
          Array.isArray(party.transactions)
        ) {
          const transactionCompanyIds = party.transactions
            .map((txn) => txn.companyId || txn.company?._id || txn.company)
            .filter(
              (id) =>
                id && typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
            )
            .filter((id) => id !== myCompanyId);

          if (transactionCompanyIds.length > 0) {
            extractedCompanyId = transactionCompanyIds[0];
          }
        }

        if (!extractedCompanyId && party.metadata) {
          const metadataCompanyIds = [
            party.metadata.associatedCompany,
            party.metadata.parentCompany,
            party.metadata.relatedCompany,
            party.metadata.businessPartner,
          ]
            .map((ref) => {
              if (!ref) return null;
              return typeof ref === "object" ? ref._id || ref.id : ref;
            })
            .filter(
              (id) =>
                id && typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
            )
            .filter((id) => id !== myCompanyId);

          if (metadataCompanyIds.length > 0) {
            extractedCompanyId = metadataCompanyIds[0];
          }
        }
      }

      if (!extractedCompanyId) {
        try {
          const availableCompanies = JSON.parse(
            localStorage.getItem("availableCompanies") || "[]"
          );

          if (availableCompanies.length > 0) {
            const otherCompanies = availableCompanies.filter((comp) => {
              const compId = comp._id || comp.id;
              return compId && compId !== myCompanyId;
            });

            const bestMatch = otherCompanies.find((comp) => {
              const compName = comp.businessName || comp.name || "";
              const partyName = party.name || "";

              return (
                compName.toLowerCase().includes(partyName.toLowerCase()) ||
                partyName.toLowerCase().includes(compName.toLowerCase())
              );
            });

            if (bestMatch) {
              extractedCompanyId = bestMatch._id || bestMatch.id;
            } else if (otherCompanies.length > 0) {
              extractedCompanyId =
                otherCompanies[0]._id || otherCompanies[0].id;
            }
          }
        } catch (fallbackError) {
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

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!targetCompanyId || !currentCompany?._id) {
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

        const myCompanyId = authenticatedData.companyId || currentCompany._id;

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
              ...party,
              _id: party._id,
              name: party.name,
              linkedCompanyId: targetCompanyId,
              targetCompanyId: targetCompanyId,
              chatCompanyId: targetCompanyId,
            },
            myCompanyId: currentCompany._id,
            targetCompanyId: targetCompanyId,
            otherCompanyId: targetCompanyId,
            partyId: party._id,
            partyName: party.name,
            chatCompanyName: party.chatCompanyName || party.name,
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

          displayToast("Connected to chat room", "success");
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
      setIsLoading(false);
    }
  };

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

      const unsubscribeConnection = chatService.on
        ? chatService.on("socket_connected", () => {
            setTimeout(() => {
              if (!resolved) {
                const companyData = chatService.getAuthenticatedCompany
                  ? chatService.getAuthenticatedCompany()
                  : null;
                if (companyData?.companyId) {
                  resolved = true;
                  if (unsubscribeAuth) unsubscribeAuth();
                  if (unsubscribeError) unsubscribeError();
                  unsubscribeConnection();
                  resolve(companyData);
                }
              }
            }, 1000);
          })
        : null;

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (unsubscribeAuth) unsubscribeAuth();
          if (unsubscribeError) unsubscribeError();
          if (unsubscribeConnection) unsubscribeConnection();
          reject(new Error("Authentication timeout"));
        }
      }, 10000);
    });
  };

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

          if (processedMessageIds.size > 100) {
            const idsArray = Array.from(processedMessageIds);
            processedMessageIds.clear();
            idsArray.slice(-50).forEach((id) => processedMessageIds.add(id));
          }

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

            if (!messageUpdated) {
              const fallbackMessage = {
                id: data.messageId,
                realMessageId: data.messageId,
                type: "sent",
                content: "Message sent",
                timestamp: new Date(),
                status: "sent",
                sender: "You",
                messageType: "website",
                senderCompanyId: currentCompany._id,
                receiverCompanyId: targetCompanyId,
              };

              return [...updatedMessages, fallbackMessage];
            }

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

        chatService.on("auth_failed", (data) => {
          if (data.shouldRedirectToLogin) {
            displayToast("Session expired. Redirecting to login...", "error");
            setTimeout(() => {
              window.location.href = "/auth";
            }, 2000);
          } else {
            setError("Authentication failed - please refresh the page");
            displayToast("Authentication failed", "error");
          }
        }),

        chatService.on("socket_warning", (data) => {
          if (data.shouldRetry) {
            displayToast("Connection issue - retrying...", "warning");
          }
        }),

        chatService.on("chat_room_warning", (data) => {
          if (data.shouldRetry) {
            displayToast("Setting up chat connection...", "info");
          }
        }),

        chatService.on("chat_room_error", (data) => {
          if (data.shouldRedirectToLogin) {
            displayToast(
              "Authentication failed. Redirecting to login...",
              "error"
            );
            setTimeout(() => {
              window.location.href = "/auth";
            }, 2000);
          } else {
            setError(`Chat room error: ${data.error}`);
            displayToast(`Chat room error: ${data.error}`, "error");
          }
        }),

        chatService.on("socket_error", (data) => {
          displayToast("Connection issue detected", "warning");
        }),

        chatService.on("chat_room_joined", (data) => {
          displayToast("Chat room joined successfully", "success");
        }),

        chatService.on("new_chat_notification", (notification) => {
          handleChatNotification(notification);
        }),

        chatService.on("notification_marked_read", (data) => {
          handleNotificationRead(data);
        }),

        chatService.on("message_delivered", (data) => {
          updateMessageStatus(data.messageId, "delivered");
        }),

        chatService.on("message_read", (data) => {
          updateMessageStatus(data.messageId, "read");
        }),

        chatService.on("message_failed", (data) => {
          updateMessageStatus(data.messageId, "failed");
          displayToast(`Message failed: ${data.error}`, "error");
        }),
      ];

      listeners.forEach((listener, index) => {
        if (typeof listener === "function") {
          unsubscribeFunctions.push(listener);
        }
      });
    }

    setSocketUnsubscribeFns(unsubscribeFunctions);
  };

  const handleNewMessage = (message) => {
    try {
      const messageId = message._id || message.id;
      const currentCompanyId = currentCompany?._id || currentCompany?.id;

      const senderCompanyId =
        typeof message.senderCompanyId === "object"
          ? message.senderCompanyId._id || message.senderCompanyId.id
          : message.senderCompanyId;

      const receiverCompanyId =
        typeof message.receiverCompanyId === "object"
          ? message.receiverCompanyId._id || message.receiverCompanyId.id
          : message.receiverCompanyId;

      const isFromMyCompany = senderCompanyId === currentCompanyId;

      if (isFromMyCompany) {
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
    } catch (error) {
      // Silent fail
    }
  };

  const handleChatNotification = (notification) => {
    try {
      if (
        notification.relatedTo?.entityData?.senderCompanyId === targetCompanyId
      ) {
        if (!isChatFocused && notificationSettings.enabled) {
          setUnreadCount((prev) => prev + 1);

          if (notificationSettings.sound) {
            playNotificationSound();
          }

          displayToast(
            `New message from ${
              notification.relatedTo.entityData.senderCompanyName || party?.name
            }`,
            "info"
          );
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleNotificationRead = (data) => {
    try {
      if (data.conversationId === targetCompanyId) {
        setUnreadCount(0);
      }
    } catch (error) {
      // Silent fail
    }
  };

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

  const handleTyping = (data) => {
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
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    }
  };

  const cleanupSocketListeners = () => {
    socketUnsubscribeFns.forEach((unsubscribe, index) => {
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

  const loadChatHistory = async () => {
    if (!party || !mappingValidated || !targetCompanyId) {
      return;
    }

    try {
      const response = await chatService.getChatHistory(party, {
        page: 1,
        limit: 50,
        messageType: "website",
        myCompanyId: currentCompany._id,
        targetCompanyId: targetCompanyId,
      });

      if (response?.success && response.data) {
        const formattedMessages = response.data.messages.map((msg) => {
          return formatIncomingMessage(msg);
        });

        setMessages(formattedMessages);
        scrollToBottom();

        setTimeout(() => {
          markConversationAsRead();
        }, 1000);
      } else {
        displayToast("No chat history found", "info");
      }
    } catch (error) {
      displayToast("Failed to load chat history", "error");
    }
  };

  const handleTypingStart = () => {
    if (
      isConnected &&
      party &&
      mappingValidated &&
      !isTyping &&
      chatService.startTyping
    ) {
      chatService.startTyping(party);
      setIsTyping(true);
    }
  };

  const handleTypingStop = () => {
    if (
      isConnected &&
      party &&
      mappingValidated &&
      isTyping &&
      chatService.stopTyping
    ) {
      chatService.stopTyping(party);
      setIsTyping(false);
    }
  };

  const cleanup = () => {
    try {
      if (isTyping) handleTypingStop();

      if (isConnected && party && mappingValidated && chatService.leaveChat) {
        chatService.leaveChat(party).catch(() => {
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

  const formatIncomingMessage = (message) => {
    const currentCompanyId = currentCompany?._id || currentCompany?.id;

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

  const updateMessageStatus = (messageId, status) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? {...msg, status} : msg))
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !party || !mappingValidated) {
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
        senderCompanyId: currentCompany._id,
        receiverCompanyId: targetCompanyId,
      };

      setMessages((prev) => [...prev, tempMessage]);

      setNewMessage("");
      scrollToBottom();

      const messageData = {
        party: {
          ...party,
          _id: party._id,
          name: party.name,
          linkedCompanyId: targetCompanyId,
          targetCompanyId: targetCompanyId,
          chatCompanyId: targetCompanyId,
        },
        content: messageContent,
        messageType: "website",
        tempId: tempId,
        myCompanyId: currentCompany._id,
        targetCompanyId: targetCompanyId,
        senderCompanyId: currentCompany._id,
        receiverCompanyId: targetCompanyId,
      };

      const response = await chatService.sendMessage(messageData);

      if (response && response.success && response.data) {
        setMessages((prev) => {
          const responseMessageId = response.data._id || response.data.id;
          const responseTempId = response.data.tempId || tempId;

          let messageFound = false;
          const updatedMessages = prev.map((msg) => {
            if (
              msg.id === tempId ||
              msg.tempId === tempId ||
              (msg.id &&
                msg.id.startsWith("temp_") &&
                msg.content === messageContent)
            ) {
              messageFound = true;
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      handleTypingStop();
    } else {
      handleTypingStart();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, 100);
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
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
              {typingUsers[0].username} from {typingUsers[0].companyName} is
              typing...
            </small>
          </div>
        </div>
      </div>
    );
  };

  if (!show && !isEmbedded) return null;
  if (!party) return null;

  if (isEmbedded) {
    return (
      <div
        className="h-100 d-flex flex-column bg-white"
        style={{minHeight: "500px"}}
      >
        <div className="d-flex align-items-center p-3 bg-primary text-white border-bottom">
          <div
            className="rounded-circle bg-white text-primary me-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{width: "30px", height: "30px"}}
          >
            <FontAwesomeIcon icon={faBuilding} size="sm" />
          </div>
          <div className="flex-grow-1 min-w-0">
            <h6 className="mb-0 text-truncate" style={{fontSize: "14px"}}>
              {party?.name || "Company"}
              <span
                className={`ms-2 rounded-circle ${
                  isConnected ? "bg-success" : "bg-danger"
                }`}
                style={{width: "6px", height: "6px"}}
              />
              {unreadCount > 0 && (
                <span
                  className="ms-2 bg-danger text-white rounded-pill d-flex align-items-center justify-content-center"
                  style={{minWidth: "16px", height: "16px", fontSize: "9px"}}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </h6>
            <small className="opacity-75 d-block" style={{fontSize: "10px"}}>
              Company Chat • {currentCompany?.businessName || "Your Company"}
            </small>
          </div>
          <Button
            variant="link"
            className="text-white p-1"
            onClick={handleClose}
          >
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        </div>

        {error && (
          <Alert variant="danger" className="m-3 mb-0">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Error:</strong> {error}
            <div className="mt-2">
              <Button
                variant="outline-danger"
                size="sm"
                className="me-2"
                onClick={() => {
                  setError(null);
                  validatePartyMapping();
                  if (mappingValidated) initializeChat();
                }}
              >
                Retry
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setError(null);
                  cleanup();
                }}
              >
                Reset
              </Button>
            </div>
          </Alert>
        )}

        <div className="flex-grow-1 overflow-hidden d-flex flex-column">
          {!mappingValidated ? (
            <div className="text-center text-muted py-5">
              <FontAwesomeIcon
                icon={faLink}
                size="2x"
                className="mb-3 text-warning"
              />
              <h6>Company Mapping Required</h6>
              <p className="small">
                This party needs to be linked to a company for chat
                functionality.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={validatePartyMapping}
              >
                <FontAwesomeIcon icon={faSync} className="me-1" />
                Re-validate Mapping
              </Button>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="text-center p-3">
                  <Spinner animation="border" size="sm" />
                  <span className="ms-2 small">Loading messages...</span>
                </div>
              )}

              <div
                className="flex-grow-1 overflow-auto p-3"
                style={{background: "#f8f9fa"}}
              >
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-muted py-4">
                    <FontAwesomeIcon
                      icon={faComments}
                      size="2x"
                      className="mb-3"
                    />
                    <p className="small">
                      No messages yet. Start a conversation!
                    </p>
                  </div>
                )}

                {messages.map((message, index) => {
                  const typeInfo = getMessageTypeIcon(message.messageType);

                  return (
                    <div
                      key={`${message.id}_${index}`}
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
                          fontSize: "12px",
                        }}
                      >
                        <div className="d-flex align-items-center mb-1">
                          <FontAwesomeIcon
                            icon={typeInfo.icon}
                            style={{color: typeInfo.color, fontSize: "9px"}}
                            className="me-1"
                          />
                          <small
                            className={`${
                              message.type === "sent"
                                ? "text-white-50"
                                : "text-muted"
                            }`}
                            style={{fontSize: "8px"}}
                          >
                            {message.messageType.toUpperCase()}
                          </small>
                        </div>

                        <div
                          style={{whiteSpace: "pre-wrap", fontSize: "12px"}}
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
                          style={{fontSize: "9px"}}
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
                  );
                })}

                {renderTypingIndicator()}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-top bg-white" style={{minHeight: "120px"}}>
                <div className="p-2 border-bottom">
                  <div className="d-flex gap-1 flex-wrap">
                    <Button
                      variant={
                        displayMessageType === "whatsapp"
                          ? "success"
                          : "outline-success"
                      }
                      size="sm"
                      onClick={() => handleDisplayMessageTypeChange("whatsapp")}
                      style={{fontSize: "9px"}}
                      disabled={!mappingValidated}
                    >
                      <FontAwesomeIcon icon={faCommentDots} className="me-1" />
                      WhatsApp
                    </Button>
                    <Button
                      variant={
                        displayMessageType === "sms"
                          ? "primary"
                          : "outline-primary"
                      }
                      size="sm"
                      onClick={() => handleDisplayMessageTypeChange("sms")}
                      style={{fontSize: "9px"}}
                      disabled={!mappingValidated}
                    >
                      <FontAwesomeIcon icon={faMobileAlt} className="me-1" />
                      SMS
                    </Button>
                    <Button
                      variant={
                        displayMessageType === "email"
                          ? "danger"
                          : "outline-danger"
                      }
                      size="sm"
                      onClick={() => handleDisplayMessageTypeChange("email")}
                      style={{fontSize: "9px"}}
                      disabled={!mappingValidated}
                    >
                      <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                      Email
                    </Button>
                  </div>
                </div>

                <div className="p-3">
                  <InputGroup>
                    <Form.Control
                      ref={messageInputRef}
                      as="textarea"
                      rows={2}
                      placeholder={
                        mappingValidated
                          ? `Type your ${displayMessageType} message to ${party?.name}...`
                          : "Company mapping required to send messages..."
                      }
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onKeyUp={handleTypingStop}
                      onFocus={() => {
                        setIsChatFocused(true);
                        markConversationAsRead();
                      }}
                      disabled={isSending || !mappingValidated}
                      style={{resize: "none", fontSize: "12px"}}
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
                    <small className="text-muted" style={{fontSize: "9px"}}>
                      {newMessage.length}/1000 characters
                    </small>
                    <div className="d-flex gap-1">
                      <small className="text-muted" style={{fontSize: "8px"}}>
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
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-end" className="p-3" style={{zIndex: 1065}}>
        <Toast
          show={showToastFlag}
          onClose={() => setShowToastFlag(false)}
          bg={
            toastType === "success"
              ? "success"
              : toastType === "warning"
              ? "warning"
              : toastType === "info"
              ? "info"
              : "danger"
          }
          delay={3000}
          autohide
        >
          <Toast.Body className="text-white d-flex align-items-center">
            <FontAwesomeIcon
              icon={
                toastType === "success"
                  ? faCheckCircle
                  : toastType === "info"
                  ? faBell
                  : faExclamationCircle
              }
              className="me-2"
            />
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{zIndex: 1055, backgroundColor: "rgba(0, 0, 0, 0.5)"}}
        onClick={handleClose}
      />

      <div
        ref={chatContainerRef}
        className={`position-fixed top-0 end-0 h-100 bg-white shadow-lg border-start ${
          show ? "chat-sidebar-show" : "chat-sidebar-hide"
        }`}
        style={{
          width: "400px",
          zIndex: 1060,
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
                style={{width: "8px", height: "8px"}}
                title={isConnected ? "Connected" : "Disconnected"}
              />
              <span
                className={`ms-1 rounded-circle ${
                  mappingValidated ? "bg-success" : "bg-warning"
                }`}
                style={{width: "6px", height: "6px"}}
                title={mappingValidated ? "Mapping Valid" : "Mapping Issue"}
              />
              {unreadCount > 0 && (
                <span
                  className="ms-2 bg-danger text-white rounded-pill d-flex align-items-center justify-content-center"
                  style={{
                    minWidth: "18px",
                    height: "18px",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </h6>
            <small
              className="opacity-75 d-block text-truncate"
              style={{fontSize: "11px"}}
            >
              Company Chat • {currentCompany?.businessName || "Your Company"}
            </small>
          </div>
          <Dropdown align="end" className="me-2">
            <Dropdown.Toggle
              variant="link"
              className="text-white border-0 shadow-none p-1"
            >
              <FontAwesomeIcon icon={faEllipsisV} />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => loadChatHistory()}>
                <FontAwesomeIcon icon={faSync} className="me-2" />
                Refresh Chat
              </Dropdown.Item>
              <Dropdown.Item onClick={validatePartyMapping}>
                <FontAwesomeIcon icon={faLink} className="me-2" />
                Validate Mapping
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                onClick={() => toggleNotificationSetting("enabled")}
              >
                <FontAwesomeIcon
                  icon={notificationSettings.enabled ? faBell : faBellSlash}
                  className="me-2"
                />
                {notificationSettings.enabled ? "Disable" : "Enable"}{" "}
                Notifications
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => toggleNotificationSetting("sound")}
                disabled={!notificationSettings.enabled}
              >
                <FontAwesomeIcon
                  icon={notificationSettings.sound ? faVolumeUp : faVolumeMute}
                  className="me-2"
                />
                {notificationSettings.sound ? "Mute" : "Unmute"} Sound
              </Dropdown.Item>
              {unreadCount > 0 && (
                <>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={markConversationAsRead}>
                    <FontAwesomeIcon icon={faCheckDouble} className="me-2" />
                    Mark as Read ({unreadCount})
                  </Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
          <Button
            variant="link"
            className="text-white p-1"
            onClick={handleClose}
          >
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        </div>

        {error && (
          <Alert variant="danger" className="m-3 mb-0">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Error:</strong> {error}
            <div className="mt-2">
              <Button
                variant="outline-danger"
                size="sm"
                className="me-2"
                onClick={() => {
                  setError(null);
                  validatePartyMapping();
                  if (mappingValidated) initializeChat();
                }}
              >
                Retry
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setError(null);
                  cleanup();
                }}
              >
                Reset
              </Button>
            </div>
          </Alert>
        )}

        <div
          className="flex-grow-1 overflow-hidden d-flex flex-column"
          style={{height: "calc(100vh - 100px)"}}
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
              <Button
                variant="primary"
                size="sm"
                onClick={validatePartyMapping}
              >
                <FontAwesomeIcon icon={faSync} className="me-1" />
                Re-validate Mapping
              </Button>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="text-center p-3">
                  <Spinner animation="border" size="sm" />
                  <span className="ms-2">Loading messages...</span>
                </div>
              )}

              <div
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
                  </div>
                )}

                {messages.map((message, index) => {
                  const typeInfo = getMessageTypeIcon(message.messageType);

                  return (
                    <div
                      key={`${message.id}_${index}`}
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
                  );
                })}

                {renderTypingIndicator()}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-top bg-white" style={{minHeight: "140px"}}>
                <div className="p-2 border-bottom">
                  <div className="d-flex gap-1 flex-wrap">
                    <Button
                      variant={
                        displayMessageType === "whatsapp"
                          ? "success"
                          : "outline-success"
                      }
                      size="sm"
                      onClick={() => handleDisplayMessageTypeChange("whatsapp")}
                      style={{fontSize: "10px"}}
                      disabled={!mappingValidated}
                    >
                      <FontAwesomeIcon icon={faCommentDots} className="me-1" />
                      WhatsApp
                    </Button>
                    <Button
                      variant={
                        displayMessageType === "sms"
                          ? "primary"
                          : "outline-primary"
                      }
                      size="sm"
                      onClick={() => handleDisplayMessageTypeChange("sms")}
                      style={{fontSize: "10px"}}
                      disabled={!mappingValidated}
                    >
                      <FontAwesomeIcon icon={faMobileAlt} className="me-1" />
                      SMS
                    </Button>
                    <Button
                      variant={
                        displayMessageType === "email"
                          ? "danger"
                          : "outline-danger"
                      }
                      size="sm"
                      onClick={() => handleDisplayMessageTypeChange("email")}
                      style={{fontSize: "10px"}}
                      disabled={!mappingValidated}
                    >
                      <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                      Email
                    </Button>
                  </div>
                </div>

                <div className="p-3">
                  <InputGroup>
                    <Form.Control
                      ref={messageInputRef}
                      as="textarea"
                      rows={2}
                      placeholder={
                        mappingValidated
                          ? `Type your ${displayMessageType} message to ${party?.name}...`
                          : "Company mapping required to send messages..."
                      }
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onKeyUp={handleTypingStop}
                      onFocus={() => {
                        setIsChatFocused(true);
                        markConversationAsRead();
                      }}
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
                        {notificationSettings.enabled ? (
                          <span className="ms-2 text-info">
                            <FontAwesomeIcon icon={faBell} />{" "}
                            {notificationSettings.sound ? "Sound" : "Silent"}
                          </span>
                        ) : (
                          <span className="ms-2 text-muted">
                            <FontAwesomeIcon icon={faBellSlash} /> Muted
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
      .chat-sidebar-show { transform: translateX(0) !important; }
      .chat-sidebar-hide { transform: translateX(100%) !important; }
      .message-bubble { 
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
      }
      .message-bubble:hover {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
      }
      .typing-indicator { display: flex; align-items: center; gap: 3px; }
      .typing-indicator span {
        width: 6px; height: 6px; border-radius: 50%; background-color: #999;
        animation: typing 1.4s infinite ease-in-out;
      }
      .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
      .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes typing {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
      }
      .overflow-auto::-webkit-scrollbar { width: 4px; }
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
    `}</style>
    </>
  );
}

export default PartyChat;
