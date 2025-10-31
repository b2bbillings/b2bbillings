import React, {useState, useEffect, useRef, Fragment} from "react";
import {createPortal} from "react-dom";
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
  faPlus,
  faMinus,
  faPhone,
  faVideo,
  faEllipsisV,
  faCircle,
  faBuilding,
  faMapMarkerAlt,
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
  faTag,
  faEdit,
  faCamera,
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
  faArchive,
  faUserPlus,
  faCog,
  faLock,
  faEye,
  faTrash,
  faDownload,
  faUserTimes,
  faUserCheck,
  faInfo,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

// Import services
import partyService from "../../services/partyService";
import chatService from "../../services/chatService";
import teamChatService from "../../services/teamChatService";
import allPartiesService from "../../services/allPartiesService";
import { contactService } from "../../services/contactService";
import AddNewParty from "../Home/Party/AddNewParty";
import { 
  sendWhatsAppToMultipleContacts, 
  sendWhatsAppToContact,
  isValidWhatsAppNumber,
  getWhatsAppStatus,
  generateDefaultMessage,
  generateBulkMessage,
  openWhatsApp
} from "../../utils/whatsappUtils";
import './TeamChats.css';

function TeamChats({
  currentUser,
  currentCompany,
  addToast,
  isOnline = true,
  onNavigate,
  onChatPopupOpen,
  onChatPopupClose,
  isChatPopupOpen,
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
  const [activeSection, setActiveSection] = useState("all");
  
  // ✅ NEW: Filter menu states
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all"); // all, customers, vendors, endCustomers, contacts
  const [filterCounts, setFilterCounts] = useState({
    all: 0,
    customers: 0,
    vendors: 0,
    endCustomers: 0,
    contacts: 0
  });

  // Chat functionality states
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageType, setMessageType] = useState("website");
  const [displayMessageType, setDisplayMessageType] = useState("whatsapp");
  const [isConnected, setIsConnected] = useState(false);
  const [mappingValidated, setMappingValidated] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState(null);
  const [currentCompanyData, setCurrentCompanyData] = useState(null);

  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Add New Party Modal
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  
  // ✅ NEW: Browse All Contacts Modal (Customers, Vendors, End Customers)
  const [showBrowseContactsModal, setShowBrowseContactsModal] = useState(false);
  const [allAvailableContacts, setAllAvailableContacts] = useState([]);
  const [loadingAvailableContacts, setLoadingAvailableContacts] = useState(false);
  const [browseContactsFilter, setBrowseContactsFilter] = useState("all"); // all, customers, vendors, endCustomers
  const [browseSearchQuery, setBrowseSearchQuery] = useState("");
  
  // ✅ NEW: Quick Add Form States
  const [quickAddForm, setQuickAddForm] = useState({
    name: '',
    phone: '',
    phoneNumbers: [{ number: '', label: 'Primary' }], // ✅ NEW: Support multiple phone numbers
    shopName: '',
    shopOwner: '',
    partyType: 'customer',
    // ✅ SWIPE UP: Additional details
    email: '',
    address: '',
    company: '',
    website: '',
    notes: '',
    priority: 'medium',
    status: 'active',
    tags: [],
    socialMedia: {
      linkedin: '',
      twitter: '',
      instagram: ''
    }
  });
  
  // ✅ NEW: Swipe/Expand functionality
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showAdditionalPhones, setShowAdditionalPhones] = useState(false); // ✅ NEW: Show additional phone numbers
  const [quickAddValidation, setQuickAddValidation] = useState({
    nameError: '',
    phoneError: '',
    isChecking: false,
    userExists: false,
    existingUser: null
  });
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);
  
  // WhatsApp related states
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappProgress, setWhatsappProgress] = useState({ current: 0, total: 0 });
  const [selectedContactsForWhatsApp, setSelectedContactsForWhatsApp] = useState([]);
  const [bulkMessageMode, setBulkMessageMode] = useState(false);
  
  // ✅ NEW: Enhanced WhatsApp modal states
  const [whatsappMessageMode, setWhatsappMessageMode] = useState('single'); // 'single', 'bulk', 'all', 'big-size'
  const [customMessage, setCustomMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [whatsappModalAnimating, setWhatsappModalAnimating] = useState(false);
  const [selectedSingleContact, setSelectedSingleContact] = useState(null);
  
  // ✅ NEW: Big Size mode states
  const [selectedBigSizeNumber, setSelectedBigSizeNumber] = useState(null);
  const [bigSizeContactsToSend, setBigSizeContactsToSend] = useState([]);

  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // ✅ NEW: Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // ✅ NEW: Chat options menu state
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileParty, setProfileParty] = useState(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenancePosition, setMaintenancePosition] = useState({ x: 0, y: 0 });
  const [maintenanceType, setMaintenanceType] = useState("");
  
  // ✅ NEW: Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileValidationErrors, setProfileValidationErrors] = useState({});
  
  // ✅ NEW: Contact status states with persistence
  const [mutedContacts, setMutedContacts] = useState(() => {
    try {
      const stored = localStorage.getItem(`mutedContacts_${currentCompany?.id}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [blockedContacts, setBlockedContacts] = useState(() => {
    try {
      const stored = localStorage.getItem(`blockedContacts_${currentCompany?.id}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // ✅ NEW: Predefined emojis
  const predefinedEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
    '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
    '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
    '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟',
    '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
    '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
    '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
    '🔥', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️',
    '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌'
  ];

  // ✅ Load messages from local storage function
  const loadMessagesFromStorage = (party) => {
    try {
      const partyId = party._id || party.id;
      const companyId = currentCompany?.id;
      
      if (!partyId || !companyId) {
        console.log("📁 No party ID or company ID for loading messages from storage");
        return [];
      }
      
      const storageKey = `messages_${companyId}_${partyId}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const parsedMessages = JSON.parse(storedData);
        console.log(`📁 Loaded ${parsedMessages.length} messages from storage for ${party.name}`);
        return Array.isArray(parsedMessages) ? parsedMessages : [];
      }
      
      console.log("📁 No stored messages found");
      return [];
    } catch (error) {
      console.error("📁 Error loading messages from storage:", error);
      return [];
    }
  };

  // Helper functions for WhatsApp styling
  const getUserInitials = (name) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarColor = (name) => {
    if (!name) return "#00a884";
    const colors = [
      "#00a884", "#128c7e", "#25d366", "#075e54", 
      "#34b7f1", "#667781", "#54656f", "#008069"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Helper function to limit message preview to 3 words
  // Render contact list with ads
  const renderContactListWithAds = () => {
    const items = [];
    
    filteredParties.forEach((party, index) => {
      const displayName = party.name || party.businessName || party.partyName;
      const displayPhone = party.phone || party.mobile || party.phoneNumber || party.contactNumber;
      
      // Add contact with original styling
      items.push(
        <div
          key={party._id || party.id}
          className="whatsapp-chat-item"
        >
          {/* Main chat content - clickable */}
          <div 
            className="chat-main-content"
            onClick={() => handleChatClick(party)}
            onDoubleClick={() => {
              // ✅ Demo: Double-click to simulate receiving a message
              const demoMessages = [
                "Hello! How are you?",
                "Can we schedule a meeting?",
                "Thanks for your help!",
                "Looking forward to working with you.",
                "Please let me know when you're available.",
                "Great work on the project!",
                "Could you send me the details?",
                "I have a question about the proposal."
              ];
              const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
              simulateReceiveMessage(party, randomMessage);
            }}
          >
            <div className="chat-avatar-container">
              <div 
                className="chat-avatar"
                style={{ backgroundColor: getAvatarColor(displayName) }}
              >
                {party.profileImage ? (
                  <img 
                    src={party.profileImage} 
                    alt={displayName} 
                    className="avatar-image"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : null}
                <span 
                  className="avatar-initials"
                  style={{ display: party.profileImage ? 'none' : 'block' }}
                >
                  {getUserInitials(displayName)}
                </span>
              </div>
              {party.isOnline && <div className="online-dot"></div>}
            </div>

            <div className="chat-content">
              <div className="chat-header">
                <div className="chat-name">
                  {displayName}
                  {(party.canChat || party.chatEnabled) && (
                    <span className="chat-enabled-indicator" title="Chat enabled">
                      ✓
                    </span>
                  )}
                </div>
              </div>
              <div className="chat-preview-container">
                <div className="chat-contact-details">
                  <div className="contact-phone">
                    {displayPhone}
                  </div>
                  {(party.shopName || party.companyName || party.businessName) && (
                    <div className="contact-shop-name">
                      🏪 {party.shopName || party.companyName || party.businessName}
                    </div>
                  )}
                </div>
                <div className="chat-preview">
                  <span className="last-message">
                    {party.lastMessage ? 
                      getMessagePreview(party.lastMessage) : 
                      `${party.partyType || 'Contact'}`
                    }
                  </span>
                </div>
                <div className="chat-meta">
                  <div className="chat-time">
                    {party.lastMessageTime ? formatWhatsAppTime(party.lastMessageTime) : ''}
                  </div>
                  {party.unreadCount > 0 && (
                    <div className="unread-count">
                      {party.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );

      // Add dummy ad after every 2 contacts
      if ((index + 1) % 2 === 0 && index < filteredParties.length - 1) {
        items.push(
          <div key={`ad-${index}`} className="dummy-ad">
            <div className="ad-content">
              <div className="ad-icon">📢</div>
              <div className="ad-text">
                <div className="ad-title">Special Offer</div>
                <div className="ad-subtitle">Boost your business with our premium features</div>
              </div>
            </div>
          </div>
        );
      }
    });

    return items;
  };

  // Helper function to limit message preview to 3 words
  const getMessagePreview = (message) => {
    if (!message) return "";
    const words = message.trim().split(' ');
    if (words.length <= 3) return message;
    return words.slice(0, 3).join(' ') + '...';
  };

  const formatWhatsAppTime = (dateString) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // ✅ NEW: WhatsApp-like chat ordering - move party to top on message activity
  const movePartyToTop = (targetParty, messageContent = null) => {
    if (!targetParty) return;
    
    const partyId = targetParty._id || targetParty.id;
    
    setParties(prevParties => {
      // Find the party in the current list
      const existingPartyIndex = prevParties.findIndex(p => 
        (p._id || p.id) === partyId
      );
      
      if (existingPartyIndex === -1) {
        // Party not found in list, add it to the top with message info
        const newParty = {
          ...targetParty,
          lastMessageTime: new Date().toISOString(),
          lastMessage: messageContent || targetParty.lastMessage
        };
        return [newParty, ...prevParties];
      }
      
      // Move existing party to top and update activity
      const newParties = [...prevParties];
      const [movedParty] = newParties.splice(existingPartyIndex, 1);
      
      // Update the party with latest activity timestamp and message
      const updatedParty = {
        ...movedParty,
        lastMessageTime: new Date().toISOString(),
        lastMessage: messageContent || movedParty.lastMessage || 'New message',
        hasUnreadMessages: targetParty.hasUnreadMessages !== undefined 
          ? targetParty.hasUnreadMessages 
          : movedParty.hasUnreadMessages
      };
      
      return [updatedParty, ...newParties];
    });
    
    // Also update allParties for consistency
    setAllParties(prevParties => {
      const existingPartyIndex = prevParties.findIndex(p => 
        (p._id || p.id) === partyId
      );
      
      if (existingPartyIndex === -1) {
        return [targetParty, ...prevParties];
      }
      
      if (existingPartyIndex === 0) {
        return prevParties;
      }
      
      const newParties = [...prevParties];
      const [movedParty] = newParties.splice(existingPartyIndex, 1);
      
      const updatedParty = {
        ...movedParty,
        lastMessageTime: new Date().toISOString(),
        hasUnreadMessages: targetParty.hasUnreadMessages !== undefined 
          ? targetParty.hasUnreadMessages 
          : movedParty.hasUnreadMessages
      };
      
      return [updatedParty, ...newParties];
    });
  };

  // ✅ ENHANCED: Fetch only contacts (not customers/vendors/end customers)
  const fetchParties = async () => {
    console.log("🔄 Fetching contacts for company:", currentCompany?.id);
    
    if (!currentCompany?.id) {
      console.log("❌ No company ID available");
      setLoading(false);
      setError("No company selected");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("📡 Calling partyService.getParties...");
      const response = await partyService.getParties(currentCompany.id);
      console.log("✅ getParties response:", response);
      
      if (response && response.success && response.data) {
        console.log("📊 Raw data from API:", response.data);
        
        // Handle the correct data structure
        let partiesData = [];
        
        if (Array.isArray(response.data)) {
          partiesData = response.data;
        } else if (response.data.parties && Array.isArray(response.data.parties)) {
          partiesData = response.data.parties;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          partiesData = response.data.data;
        } else {
          console.log("❌ Unexpected data structure:", response.data);
          throw new Error("Invalid data structure received from server");
        }
        
        console.log("📊 Extracted parties data:", partiesData);
        
        if (!Array.isArray(partiesData)) {
          throw new Error("Parties data is not an array");
        }
        
        // Mark all as contacts source
        const formattedParties = partiesData.map(party => ({
          ...party,
          source: party.source || 'contact',
          partyType: party.partyType || 'contact',
          id: party._id || party.id
        }));
        
        setAllParties(formattedParties);
        
        // Filter parties with valid phone and name
        const chatEnabledParties = formattedParties.filter(party => {
          const phoneFields = [
            party.phone, 
            party.mobile, 
            party.phoneNumber, 
            party.contactNumber,
            party.mobileNumber
          ].filter(Boolean);
          
          const nameFields = [
            party.name,
            party.businessName,
            party.partyName,
            party.customerName,
            party.supplierName,
            party.companyName
          ].filter(Boolean);
          
          return phoneFields.length > 0 && nameFields.length > 0;
        });
        
        // Set parties that have chat capabilities
        const linkedChatParties = formattedParties.filter(party => 
          party.canChat && party.chatCompanyId && 
          (party.phone || party.mobile || party.phoneNumber || party.contactNumber)
        );
        
        setLinkedParties(linkedChatParties);
        setParties(formattedParties);
        
        // Update filter counts (only contacts)
        setFilterCounts({
          all: formattedParties.length,
          customers: 0,
          vendors: 0,
          endCustomers: 0,
          contacts: formattedParties.length
        });
        
        console.log("✅ Processed parties:", {
          total: formattedParties.length,
          chatEnabled: chatEnabledParties.length,
          linked: linkedChatParties.length
        });
        
        if (addToast && formattedParties.length > 0) {
          addToast(`Loaded ${formattedParties.length} contacts`, "success");
        } else if (formattedParties.length === 0) {
          console.log("⚠️ No parties found");
          setError("No contacts found in database");
        }
        
        // Update last message info from stored messages
        setTimeout(() => {
          updatePartiesWithStoredMessages(formattedParties);
        }, 100);
        
      } else {
        console.log("❌ Invalid response structure:", response);
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("❌ Error fetching parties:", err);
      setError(`Failed to load contacts: ${err.message}`);
      setAllParties([]);
      setParties([]);
      setLinkedParties([]);
      if (addToast) {
        addToast(`Error: ${err.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize data and load stored messages
  useEffect(() => {
    if (currentCompany?.id) {
      fetchParties();
    }
  }, [currentCompany?.id]);

  // Update parties with last messages from storage
  useEffect(() => {
    if (parties.length > 0 && currentCompany?.id) {
      const updatedParties = parties.map(party => {
        const storedMessages = loadMessagesFromStorage(party);
        if (storedMessages.length > 0) {
          const lastMessage = storedMessages[storedMessages.length - 1];
          return {
            ...party,
            lastMessage: lastMessage.content || lastMessage.message,
            lastMessageTime: lastMessage.createdAt || lastMessage.timestamp
          };
        }
        return party;
      });
      
      // Only update if there are changes
      const hasChanges = updatedParties.some((party, index) => 
        party.lastMessage !== parties[index].lastMessage || 
        party.lastMessageTime !== parties[index].lastMessageTime
      );
      
      if (hasChanges) {
        setParties(updatedParties);
      }
    }
  }, [parties.length, currentCompany?.id]);

  // ✅ NEW: Initialize team chat service
  useEffect(() => {
    if (currentUser && currentCompany) {
      console.log("🚀 Initializing team chat service...");
      
      // Set up event listeners for real-time chat updates
      teamChatService.on("connection_status", (data) => {
        setIsConnected(data.connected);
        console.log(`🔌 Team chat connection: ${data.connected ? 'Connected' : 'Disconnected'}`);
      });

      teamChatService.on("new_message", (data) => {
        console.log("📩 New team message received:", data);
        
        // Update messages if this is the active chat
        if (selectedParty && data.chatId === selectedParty.chatId) {
          setMessages(prev => [...prev, data.message]);
        }
        
        // Update party list with new message activity (WhatsApp-like behavior)
        const messageTime = data.message?.createdAt || new Date().toISOString();
        setParties(prevParties => {
          return prevParties.map(party => {
            if (party.chatId === data.chatId || 
                (data.message?.participants && data.message.participants.includes(party._id || party.id))) {
              const updatedParty = {
                ...party,
                lastMessage: data.message?.content || 'New message',
                lastMessageTime: messageTime,
                hasUnreadMessages: selectedParty?.chatId !== data.chatId, // Mark as unread if not current chat
                unreadCount: (party.unreadCount || 0) + (selectedParty?.chatId !== data.chatId ? 1 : 0)
              };
              return updatedParty;
            }
            return party;
          }).sort((a, b) => {
            // Real-time WhatsApp-like sorting: Most recent activity first
            const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            
            // Parties with unread messages get priority
            if (a.hasUnreadMessages && !b.hasUnreadMessages) return -1;
            if (!a.hasUnreadMessages && b.hasUnreadMessages) return 1;
            
            // Then sort by most recent message time
            return bTime - aTime;
          });
        });
      });

      teamChatService.on("message_sent", (data) => {
        console.log("✅ Team message sent confirmation:", data);
        
        // Update message status in current chat
        setMessages(prev => prev.map(msg => 
          msg.tempId === data.tempId ? { ...msg, ...data.message, status: 'sent' } : msg
        ));
        
        // Update party list with sent message activity (WhatsApp-like behavior)
        const messageTime = data.message?.createdAt || new Date().toISOString();
        setParties(prevParties => {
          return prevParties.map(party => {
            if (party.chatId === data.chatId || party._id === selectedParty?._id || party.id === selectedParty?.id) {
              return {
                ...party,
                lastMessage: data.message?.content || 'Message sent',
                lastMessageTime: messageTime
              };
            }
            return party;
          }).sort((a, b) => {
            // Real-time WhatsApp-like sorting: Most recent activity first
            const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            
            // Parties with unread messages get priority
            if (a.hasUnreadMessages && !b.hasUnreadMessages) return -1;
            if (!a.hasUnreadMessages && b.hasUnreadMessages) return 1;
            
            // Then sort by most recent message time
            return bTime - aTime;
          });
        });
      });

      teamChatService.on("message_failed", (data) => {
        console.error("❌ Team message failed:", data);
        setMessages(prev => prev.map(msg => 
          msg.tempId === data.tempId ? { ...msg, status: 'failed', error: data.error } : msg
        ));
        showToastNotification(`Message failed: ${data.error}`, "error");
      });

      // Cleanup on unmount
      return () => {
        console.log("🧹 Cleaning up team chat service...");
        teamChatService.cleanup();
      };
    }
  }, [currentUser, currentCompany, selectedParty]);

  // ✅ Filter by search query only (no type filtering in main view)
  const filteredParties = parties.filter(party => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (party.name && party.name.toLowerCase().includes(searchLower)) ||
      (party.businessName && party.businessName.toLowerCase().includes(searchLower)) ||
      (party.partyName && party.partyName.toLowerCase().includes(searchLower)) ||
      (party.phone && party.phone.includes(searchQuery)) ||
      (party.mobile && party.mobile.includes(searchQuery)) ||
      (party.phoneNumber && party.phoneNumber.includes(searchQuery)) ||
      (party.contactNumber && party.contactNumber.includes(searchQuery));

    // Legacy filter for linked chats
    if (activeSection === "linked") {
      return matchesSearch && party.canChat && party.chatCompanyId;
    }
    
    return matchesSearch;
  }).sort((a, b) => {
    // ✅ WhatsApp-like sorting: Most recent activity first
    const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 
                  (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 
                  (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    
    // Parties with unread messages get priority (WhatsApp behavior)
    if (a.hasUnreadMessages && !b.hasUnreadMessages) return -1;
    if (!a.hasUnreadMessages && b.hasUnreadMessages) return 1;
    
    // If both have unread or both don't have unread, sort by most recent message time
    if (bTime !== aTime) {
      return bTime - aTime; // Most recent first
    }
    
    // If times are equal, sort alphabetically by name as fallback
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    return aName.localeCompare(bName);
  });

  // ✅ FIXED: Enhanced chat click with better validation
  const handleChatClick = async (party) => {
    console.log("💬 Chat clicked for party:", party);
    
    // ✅ Allow chat for any party with phone number
    const hasPhone = party.phone || party.mobile || party.phoneNumber || party.contactNumber;
    if (!hasPhone) {
      if (addToast) {
        addToast("This contact doesn't have a phone number", "warning");
      }
      return;
    }

    setSelectedParty(party);
    
    // ✅ Load stored messages first
    const storedMessages = loadMessagesFromStorage(party);
    setMessages(storedMessages);
    
    // ✅ Update party's last message info from stored messages (WhatsApp behavior)
    if (storedMessages.length > 0) {
      const lastStoredMessage = storedMessages[storedMessages.length - 1];
      setParties(prevParties => 
        prevParties.map(p => 
          (p._id || p.id) === (party._id || party.id) 
            ? { 
                ...p, 
                lastMessage: lastStoredMessage.content || lastStoredMessage.text,
                lastMessageTime: lastStoredMessage.timestamp || lastStoredMessage.createdAt || new Date().toISOString()
              }
            : p
        )
      );
    }
    
    // ✅ Clear unread status when chat is opened (WhatsApp behavior)
    setParties(prevParties => 
      prevParties.map(p => 
        (p._id || p.id) === (party._id || party.id) 
          ? { ...p, hasUnreadMessages: false, unreadCount: 0 }
          : p
      )
    );
    
    setError(null);
    setMappingValidated(true);
    setTargetCompanyId(party.chatCompanyId || party._id || party.id);
    
    // Use parent's popup handlers if available
    if (onChatPopupOpen) {
      onChatPopupOpen();
    }
    
    setChatPopupOpen(true);
    
    // Prevent body scroll
    document.body.classList.add("chat-popup-open");
    
    // ✅ ENHANCED: Try to load messages using team chat service first, then legacy service
    if (party.canChat) {
      try {
        setIsLoadingMessages(true);
        let messagesLoaded = false;

        // 1️⃣ First try: Team Chat Service (with HTTP fallback)
        if (selectedParty.canChat) {
          try {
            console.log("📥 Loading messages via team chat service...");
            
            // Create or get direct chat
            const chatResult = await teamChatService.createOrGetDirectChat(party);
            if (chatResult.success) {
              const chatId = chatResult.chat._id;
              
              // Join the chat for real-time updates
              teamChatService.joinChat(chatId);
              
              // Load chat messages
              const messagesResponse = await teamChatService.getChatMessages(chatId);
              if (messagesResponse.success) {
                setMessages(messagesResponse.messages);
                messagesLoaded = true;
                console.log("✅ Messages loaded via team chat service");
              }
            }
          } catch (teamChatError) {
            console.warn("Team chat message loading failed:", teamChatError.message);
          }
        }

        // 2️⃣ Fallback: Legacy Chat Service
        console.log("🔍 DEBUGGING: Checking if we should load chat history");
        console.log("🔍 messagesLoaded:", messagesLoaded);
        console.log("🔍 chatService exists:", !!chatService);
        console.log("🔍 getChatHistory exists:", !!(chatService && chatService.getChatHistory));
        console.log("🔍 party.chatCompanyId:", party.chatCompanyId);
        console.log("🔍 party.canChat:", party.canChat);
        console.log("🔍 party data:", {
          id: party._id || party.id,
          name: party.name,
          chatCompanyId: party.chatCompanyId,
          linkedCompanyId: party.linkedCompanyId,
          canChat: party.canChat
        });
        
        if (!messagesLoaded && chatService && chatService.getChatHistory && party.chatCompanyId) {
          try {
            console.log("📥 Falling back to legacy chat service for messages...");
            console.log("Party data for getChatHistory:", {
              id: party._id || party.id,
              name: party.name,
              chatCompanyId: party.chatCompanyId,
              linkedCompanyId: party.linkedCompanyId,
              canChat: party.canChat
            });
            
            const messagesResponse = await chatService.getChatHistory(party, {
              limit: 50,
              page: 1
            });
            
            console.log("getChatHistory response:", messagesResponse);
            
            if (messagesResponse?.success && messagesResponse.data) {
              setMessages(messagesResponse.data);
              messagesLoaded = true;
              console.log("✅ Messages loaded via legacy chat service");
            } else if (messagesResponse?.messages) {
              setMessages(messagesResponse.messages);
              messagesLoaded = true;
            } else if (messagesResponse?.data?.messages) {
              setMessages(messagesResponse.data.messages);
              messagesLoaded = true;
            }
          } catch (legacyError) {
            console.warn("Legacy chat message loading failed:", legacyError.message);
          }
        }

        // 3️⃣ Final fallback: Load from local storage
        if (!messagesLoaded) {
          console.log("📁 Loading messages from local storage...");
          const storedMessages = loadMessagesFromStorage(party);
          setMessages(storedMessages);
        }
      } catch (err) {
        console.error("Error loading messages:", err);
        setError("Failed to load chat messages");
        // Load from local storage as final fallback
        const storedMessages = loadMessagesFromStorage(party);
        setMessages(storedMessages);
      } finally {
        setIsLoadingMessages(false);
      }
    } else {
      console.log("🔍 Chat not enabled for this party, loading from local storage");
      const storedMessages = loadMessagesFromStorage(party);
      setMessages(storedMessages);
    }
  };

  // Close chat popup
  const closeChatPopup = () => {
    // Add closing animation class
    const popup = document.querySelector('.whatsapp-popup');
    if (popup) {
      popup.classList.add('closing');
      
      // Wait for animation to complete
      setTimeout(() => {
        // ✅ Save messages before closing
        if (selectedParty && messages.length > 0) {
          saveMessagesToStorage(selectedParty, messages);
        }
        
        // ✅ ENHANCED: Leave team chat if connected
        if (selectedParty?.chatId && teamChatService.isSocketConnected()) {
          teamChatService.leaveChat(selectedParty.chatId);
        }
        
        setChatPopupOpen(false);
        setSelectedParty(null);
        setMessages([]);
        setNewMessage("");
        setError(null);
        setShowEmojiPicker(false);
        setShowChatOptionsMenu(false);
        // Don't reset profile modal here - let it manage its own state
        // setShowProfileModal(false);
        
        // Use parent's popup handlers if available
        if (onChatPopupClose) {
          onChatPopupClose();
        }
        
        // Remove body scroll lock
        document.body.classList.remove("chat-popup-open");
      }, 300);
    } else {
      // Fallback without animation
      // ✅ Save messages before closing
      if (selectedParty && messages.length > 0) {
        saveMessagesToStorage(selectedParty, messages);
      }
      
      // ✅ ENHANCED: Leave team chat if connected
      if (selectedParty?.chatId && teamChatService.isSocketConnected()) {
        teamChatService.leaveChat(selectedParty.chatId);
      }
      
      setChatPopupOpen(false);
      setSelectedParty(null);
      setMessages([]);
      setNewMessage("");
      setError(null);
      setShowEmojiPicker(false);
      setShowChatOptionsMenu(false);
      setShowProfileModal(false);
      
      if (onChatPopupClose) {
        onChatPopupClose();
      }
      
      document.body.classList.remove("chat-popup-open");
    }
  };

  // Handle escape key
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

  // ✅ FIXED: Enhanced send message with proper error handling
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !selectedParty) return;

    // ✅ Check if contact is blocked
    const partyId = selectedParty._id || selectedParty.id;
    if (blockedContacts.has(partyId)) {
      showToastNotification("Cannot send message to blocked contact", "error");
      return;
    }

    const messageContent = newMessage.trim();
    setIsSending(true);
    
    // ✅ FIXED: Declare tempMessage outside try block so it's accessible in catch block
    const tempMessage = {
      id: `temp_${Date.now()}`,
      type: "sent",
      content: messageContent,
      timestamp: new Date().toISOString(),
      status: "sending",
      sender: currentUser?.name || "You"
    };
    
    try {
      // Add optimistic message
      setMessages(prev => {
        const updatedMessages = [...prev, tempMessage];
        // ✅ Save immediately with temp message
        if (selectedParty) {
          saveMessagesToStorage(selectedParty, updatedMessages);
        }
        return updatedMessages;
      });
      setNewMessage("");
      
      // ✅ ENHANCED: Try team chat service first, then legacy chat service, finally demo mode
      let messageResponse = null;
      let usedService = "none";

      // 1️⃣ First try: Team Chat Service (for enabled contacts - with socket or HTTP fallback)
      if (selectedParty.canChat) {
        try {
          console.log("📤 Sending message via team chat service...");
          console.log("📤 Team chat service connection status:", teamChatService.getConnectionStatus());
          
          // Create or get direct chat
          const chatResult = await teamChatService.createOrGetDirectChat(selectedParty);
          console.log("📤 Chat creation result:", chatResult);
          
          if (chatResult.success) {
            messageResponse = await teamChatService.sendMessage(
              chatResult.chat._id, 
              messageContent,
              { type: messageType }
            );
            console.log("📤 Message send result:", messageResponse);
            usedService = "teamChat";
          } else {
            console.warn("Failed to create/get chat:", chatResult.error);
          }
        } catch (teamChatError) {
          console.error("Team chat service error:", teamChatError);
        }
      }

      // 2️⃣ Second try: Legacy Chat Service (fallback)
      if (!messageResponse && chatService && chatService.sendMessage && selectedParty.canChat && selectedParty.chatCompanyId) {
        try {
          console.log("📤 Falling back to legacy chat service...");
          const phoneNumber = selectedParty.phone || selectedParty.mobile || 
                             selectedParty.phoneNumber || selectedParty.contactNumber;
          
          // Use the correct structure expected by chatService
          const messageData = {
            party: selectedParty,
            content: messageContent,
            tempId: tempMessage.id
          };
          
          console.log("📤 Sending message via chatService:", messageData);
          messageResponse = await chatService.sendMessage(messageData);
          usedService = "legacyChat";
        } catch (legacyChatError) {
          console.warn("Legacy chat service failed:", legacyChatError.message);
        }
      }

      // 3️⃣ Final option: Local storage mode (when no service available)
      if (!messageResponse) {
        console.log("📝 Using local storage mode for message...");
        usedService = "localStorage";
        messageResponse = { success: true, isLocal: true };
      }

      // Handle response based on service used
      if (messageResponse?.success) {
        const statusMessage = {
          teamChat: "Message sent via team chat",
          legacyChat: "Message sent via legacy chat", 
          localStorage: "Message stored locally"
        };

        setMessages(prev => {
          const updatedMessages = prev.map(msg => 
            msg.id === tempMessage.id 
              ? { 
                  ...msg, 
                  id: messageResponse.message?._id || messageResponse.data?.id || tempMessage.id,
                  status: "sent",
                  service: usedService
                }
              : msg
          );
          // Save updated messages
          if (selectedParty) {
            saveMessagesToStorage(selectedParty, updatedMessages);
          }
          return updatedMessages;
        });
        
        // Move party to top of chat list after sending message with message content
        movePartyToTop(selectedParty, messageContent);
        
        if (addToast) {
          addToast(statusMessage[usedService], usedService === "localStorage" ? "info" : "success");
        }
      } else {
        throw new Error(messageResponse?.error || "All message services failed");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      
      // Remove failed message
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      
      // ✅ IMPROVED: Better error messages for different types of errors
      let errorMessage = "Failed to send message";
      if (err.message?.includes("Socket not connected")) {
        errorMessage = "Connection lost. Please check your internet connection and try again.";
      } else if (err.message?.includes("Network Error")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      if (addToast) {
        addToast(errorMessage, "error");
      } else {
        // Fallback toast
        showToastNotification(errorMessage, "error");
      }
      
      // Restore message in input
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
    
    // Auto scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, 100);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
        return <FontAwesomeIcon icon={faCheckDouble} className="text-primary" />;
      default:
        return null;
    }
  };

  // ✅ NEW: Fetch all available contacts from customers, vendors, end customers
  const fetchAllAvailableContacts = async () => {
    try {
      setLoadingAvailableContacts(true);
      console.log("📡 Fetching all available contacts...");
      
      const result = await allPartiesService.fetchAllParties();
      
      if (result.success && result.data) {
        console.log("✅ Available contacts fetched:", result);
        setAllAvailableContacts(result.data);
        
        // Update counts
        setFilterCounts(prev => ({
          ...prev,
          customers: result.breakdown.customers,
          vendors: result.breakdown.vendors,
          endCustomers: result.breakdown.endCustomers
        }));
        
        return result.data;
      } else {
        throw new Error("Failed to fetch available contacts");
      }
    } catch (error) {
      console.error("❌ Error fetching available contacts:", error);
      addToast && addToast("Failed to load available contacts", "error");
      return [];
    } finally {
      setLoadingAvailableContacts(false);
    }
  };

  // ✅ NEW: Add contact to chat list
  const addContactToChat = async (contact) => {
    try {
      console.log("➕ Adding contact to chat list:", contact);
      
      // Check if already exists
      const exists = parties.find(p => 
        (p._id || p.id) === (contact._id || contact.id) ||
        p.phone === contact.phone
      );
      
      if (exists) {
        addToast && addToast("Contact already in your chat list", "warning");
        setShowBrowseContactsModal(false);
        // Open chat with existing contact
        handleChatClick(exists);
        return;
      }
      
      // Create contact data - only include fields with actual values
      const contactData = {
        name: contact.name,
        phone: contact.phone,
        phoneNumbers: contact.phoneNumbers || [{ number: contact.phone, label: 'Primary' }],
        // Map party type to valid enum values
        partyType: (() => {
          const type = contact.partyType || contact.source || 'customer';
          // Map source types to valid partyType enum
          if (type === 'endCustomer') return 'customer';
          if (type === 'contact') return 'customer';
          if (type === 'vendor' || type === 'supplier') return 'vendor';
          return type;
        })(),
        priority: contact.priority || 'medium',
        status: contact.status || 'active',
      };
      
      // Add optional fields only if they have values
      if (contact.email && contact.email.trim()) {
        contactData.email = contact.email.trim();
      }
      if (contact.address && contact.address.trim()) {
        contactData.address = contact.address.trim();
      }
      if (contact.company && contact.company.trim()) {
        contactData.company = contact.company.trim();
      }
      if (contact.shopName && contact.shopName.trim()) {
        contactData.shopName = contact.shopName.trim();
      }
      if (contact.shopOwner && contact.shopOwner.trim()) {
        contactData.shopOwner = contact.shopOwner.trim();
      }
      if (contact.website && contact.website.trim()) {
        contactData.website = contact.website.trim();
      }
      if (contact.notes) {
        contactData.notes = contact.notes;
      } else {
        contactData.notes = `Added from ${contact.source || 'browse contacts'}`;
      }
      if (contact.tags && contact.tags.length > 0) {
        contactData.tags = contact.tags;
      }
      if (contact.socialMedia && Object.keys(contact.socialMedia).length > 0) {
        contactData.socialMedia = contact.socialMedia;
      }
      
      console.log("🔄 Creating contact in database:", contactData);
      const result = await contactService.createContact(contactData);
      
      if (result.success) {
        console.log("✅ Contact added successfully:", result.data);
        
        // Create party object
        const newParty = {
          ...result.data,
          id: result.data._id,
          source: 'contact',
          canChat: true,
          hasUnreadMessages: false,
          unreadCount: 0,
          lastMessageTime: null,
          lastMessage: 'Contact added to your list',
          isOnline: false,
          lastSeen: null
        };
        
        // Add to parties list
        setParties(prev => [newParty, ...prev]);
        setAllParties(prev => [newParty, ...prev]);
        
        // Update counts
        setFilterCounts(prev => ({
          ...prev,
          all: prev.all + 1,
          contacts: prev.contacts + 1
        }));
        
        addToast && addToast(`${contact.name} added to your chat list`, "success");
        
        // Close modal and open chat
        setShowBrowseContactsModal(false);
        setTimeout(() => {
          handleChatClick(newParty);
        }, 300);
      }
    } catch (error) {
      console.error("❌ Error adding contact:", error);
      console.error("❌ Error details:", {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data
      });
      
      if (error.response?.status === 409) {
        addToast && addToast("Contact already exists in your list", "warning");
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || "Invalid contact data";
        addToast && addToast(errorMsg, "error");
        console.error("❌ Validation error:", errorMsg);
      } else {
        const errorMsg = error.response?.data?.message || "Failed to add contact to chat list";
        addToast && addToast(errorMsg, "error");
      }
    }
  };

  // Handle add new party
  const handleAddNewParty = () => {
    // ✅ Show browse contacts modal to view all available contacts
    setShowBrowseContactsModal(true);
    fetchAllAvailableContacts();
  };

  const handlePartyAdded = (newParty) => {
    setShowAddPartyModal(false);
    // ✅ FIXED: Refresh data after adding new party
    setTimeout(() => {
      fetchParties();
    }, 500);
    
    if (addToast) {
      addToast(`Contact "${newParty.name || newParty.businessName}" added successfully`, "success");
    }
  };

  // ✅ Handle section change
  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (section === "linked") {
      setParties(linkedParties);
    } else {
      setParties(allParties);
    }
  };

  // ✅ NEW: Internal toast notification system
  const showToastNotification = (message, type = "info") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    // Also use external addToast if available
    if (addToast) {
      addToast(message, type);
    }
  };

  // ✅ NEW: Add system message to chat
  const addSystemMessage = (message) => {
    const systemMessage = {
      id: `system_${Date.now()}`,
      type: "system",
      content: message,
      timestamp: new Date().toISOString(),
      status: "delivered",
      sender: "System"
    };
    
    setMessages(prev => {
      const updatedMessages = [...prev, systemMessage];
      // Save system messages too
      if (selectedParty) {
        saveMessagesToStorage(selectedParty, updatedMessages);
      }
      return updatedMessages;
    });
    
    // Auto scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, 100);
  };

  // ✅ NEW: Simulate receiving a message (for testing WhatsApp-like behavior)
  const simulateReceiveMessage = (fromParty, messageContent) => {
    if (!fromParty || !messageContent) return;

    const receivedMessage = {
      id: `received_${Date.now()}`,
      type: "received",
      content: messageContent,
      timestamp: new Date().toISOString(),
      status: "delivered",
      sender: fromParty.name || fromParty.businessName || fromParty.partyName || "Unknown"
    };

    // If this is the currently selected party, add message to current chat
    if (selectedParty && (selectedParty._id === fromParty._id || selectedParty.id === fromParty.id)) {
      setMessages(prev => {
        const updatedMessages = [...prev, receivedMessage];
        saveMessagesToStorage(fromParty, updatedMessages);
        return updatedMessages;
      });
    } else {
      // Save message for later viewing
      const storedMessages = loadStoredMessages(fromParty);
      const updatedMessages = [...storedMessages, receivedMessage];
      saveMessagesToStorage(fromParty, updatedMessages);
    }

    // ✅ Move party to top of chat list when receiving message
    movePartyToTop({
      ...fromParty,
      hasUnreadMessages: selectedParty?.id !== fromParty._id && selectedParty?._id !== fromParty.id
    });

    // Show notification if not currently viewing this chat
    if (!selectedParty || (selectedParty._id !== fromParty._id && selectedParty.id !== fromParty.id)) {
      showToastNotification(
        `New message from ${fromParty.name || fromParty.businessName || fromParty.partyName}`, 
        "info"
      );
    }

    // Auto scroll to bottom if viewing this chat
    if (selectedParty && (selectedParty._id === fromParty._id || selectedParty.id === fromParty.id)) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
      }, 100);
    }
  };

  // ✅ NEW: Handle emoji click
  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    // Focus back to input
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  // ✅ NEW: Handle emoji picker toggle
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev);
  };

  // ✅ NEW: Handle chat options menu
  const handleChatOptionsClick = (option) => {
    setShowChatOptionsMenu(false);
    
    switch(option) {
      case 'viewProfile':
        setProfileParty(selectedParty);
        setShowProfileModal(true);
        break;
      case 'clearChat':
        handleClearChat();
        break;
      case 'selectMessages':
        // Add system message to chat
        addSystemMessage("📝 Select messages feature will be available soon");
        showToastNotification("Select messages feature coming soon", "info");
        break;
      case 'muteNotifications':
        const contactId = selectedParty._id || selectedParty.id;
        const isMuted = mutedContacts.has(contactId);
        
        if (isMuted) {
          // Unmute
          setMutedContacts(prev => {
            const newSet = new Set(prev);
            newSet.delete(contactId);
            // Save to localStorage
            localStorage.setItem(`mutedContacts_${currentCompany?.id}`, JSON.stringify([...newSet]));
            return newSet;
          });
          addSystemMessage("🔔 Notifications turned on for this contact");
          showToastNotification("Notifications turned on for this contact", "success");
        } else {
          // Mute
          setMutedContacts(prev => {
            const newSet = new Set(prev).add(contactId);
            // Save to localStorage
            localStorage.setItem(`mutedContacts_${currentCompany?.id}`, JSON.stringify([...newSet]));
            return newSet;
          });
          addSystemMessage("🔇 Notifications muted for this contact");
          showToastNotification("Notifications muted for this contact", "success");
        }
        break;
      case 'blockContact':
        const partyId = selectedParty._id || selectedParty.id;
        const isBlocked = blockedContacts.has(partyId);
        
        if (isBlocked) {
          // Unblock
          setBlockedContacts(prev => {
            const newSet = new Set(prev);
            newSet.delete(partyId);
            return newSet;
          });
          addSystemMessage("✅ Contact has been unblocked");
          showToastNotification("Contact unblocked successfully", "success");
        } else {
          // Block
          setBlockedContacts(prev => new Set(prev).add(partyId));
          addSystemMessage("🚫 Contact has been blocked");
          showToastNotification("Contact blocked successfully", "success");
        }
        break;
      case 'exportChat':
        handleExportChat();
        break;
      case 'addShortcut':
        addSystemMessage("🔗 Chat shortcut added to desktop");
        showToastNotification("Chat shortcut added to desktop", "success");
        break;
      default:
        break;
    }
  };

  // ✅ NEW: Handle clear chat
  const handleClearChat = () => {
    if (window.confirm(`Clear all messages with ${selectedParty?.name || 'this contact'}?`)) {
      setMessages([]);
      // Also clear from localStorage
      if (selectedParty) {
        const chatKey = `chat_${currentCompany?.id}_${selectedParty._id || selectedParty.id}`;
        localStorage.removeItem(chatKey);
      }
      
      showToastNotification("Chat cleared successfully", "success");
      
      // Add a system message after clearing
      setTimeout(() => {
        addSystemMessage("🗑️ Chat history has been cleared");
      }, 500);
    }
  };

  // ✅ NEW: Handle export chat
  const handleExportChat = () => {
    if (messages.length === 0) {
      addSystemMessage("📂 No messages to export - chat is empty");
      showToastNotification("No messages to export", "warning");
      return;
    }

    const chatData = {
      contact: selectedParty?.name || 'Unknown',
      phone: selectedParty?.phone || selectedParty?.mobile || 'Unknown',
      exportDate: new Date().toISOString(),
      messages: messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        sender: msg.sender || (msg.type === 'sent' ? 'You' : selectedParty?.name)
      }))
    };

    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_${selectedParty?.name || 'contact'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Add system message
    addSystemMessage("📥 Chat exported successfully");
    showToastNotification("Chat exported successfully", "success");
  };

  // ✅ ENHANCED: Handle video/audio call maintenance message with positioned popup
  const handleCallClick = (type, event) => {
    // Add system message to chat
    addSystemMessage(`📞 ${type} call service is currently under maintenance. This feature will be available soon.`);
    
    // Show positioned maintenance popup
    showServiceUnavailablePopup(event, `${type} Call Service Under Maintenance`);
    
    // Show toast notification
    showToastNotification(`${type} call service is under maintenance`, "warning");
  };

  // ✅ NEW: Generic function to show service unavailable popup above any button
  const showServiceUnavailablePopup = (event, message) => {
    // Calculate button position to show popup above it
    if (event && event.currentTarget) {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setMaintenancePosition({
        x: buttonRect.left + buttonRect.width / 2,
        y: buttonRect.top - 10 // 10px above the button
      });
    }
    
    // Show positioned popup
    setMaintenanceMessage(message);
    setShowMaintenanceModal(true);
    
    // Auto-close popup after 4 seconds
    setTimeout(() => {
      setShowMaintenanceModal(false);
      setMaintenancePosition(null);
    }, 4000);
  };

  // ✅ NEW: Handle profile click
  const handleProfileClick = () => {
    console.log('🔍 Profile clicked for:', selectedParty);
    
    // Reset editing state when opening new profile
    setIsEditingProfile(false);
    setEditedProfile({});
    setProfileImage(null);
    
    setProfileParty(selectedParty);
    setShowProfileModal(true);
  };

  // ✅ NEW: Quick Add Contact Validation
  const validateQuickAddForm = async (field, value) => {
    const newValidation = { ...quickAddValidation };
    
    if (field === 'name') {
      if (!value.trim()) {
        newValidation.nameError = 'Contact name is required';
      } else if (value.trim().length < 2) {
        newValidation.nameError = 'Name must be at least 2 characters';
      } else {
        newValidation.nameError = '';
      }
    }
    
    if (field === 'phone') {
      if (!value.trim()) {
        newValidation.phoneError = 'Phone number is required';
        newValidation.userExists = false;
        newValidation.existingUser = null;
      } else if (!/^[+]?[\d\s\-\(\)]{10,}$/.test(value.trim())) {
        newValidation.phoneError = 'Please enter a valid phone number';
        newValidation.userExists = false;
        newValidation.existingUser = null;
      } else {
        newValidation.phoneError = '';
        
        // Check if user already exists by phone number
        if (value.trim().length >= 10) {
          newValidation.isChecking = true;
          setQuickAddValidation(newValidation);
          
          try {
            // ✅ ENHANCED: Check both local parties and backend service
            const cleanPhone = value.replace(/\D/g, ''); // Remove all non-digits
            
            // First check local parties array for quick response
            const existingPartyLocal = parties.find(party => {
              const partyPhone = (party.phone || party.mobile || party.phoneNumber || party.contactNumber || '').replace(/\D/g, '');
              return partyPhone === cleanPhone || 
                     partyPhone.endsWith(cleanPhone.slice(-10)) || 
                     cleanPhone.endsWith(partyPhone.slice(-10));
            });
            
            if (existingPartyLocal) {
              newValidation.userExists = true;
              newValidation.existingUser = existingPartyLocal;
              newValidation.phoneError = '';
            } else {
              // ✅ NEW: Also check backend service for comprehensive validation
              try {
                const backendCheck = await partyService.checkPhoneExists(cleanPhone);
                if (backendCheck.success && backendCheck.exists && backendCheck.party) {
                  newValidation.userExists = true;
                  newValidation.existingUser = backendCheck.party;
                  newValidation.phoneError = '';
                } else {
                  newValidation.userExists = false;
                  newValidation.existingUser = null;
                }
              } catch (backendError) {
                console.warn('Backend phone check failed, using local check only:', backendError);
                // Continue with local check result
                newValidation.userExists = false;
                newValidation.existingUser = null;
              }
            }
          } catch (error) {
            console.error('Error checking user existence:', error);
            newValidation.phoneError = 'Error checking phone number';
            newValidation.userExists = false;
            newValidation.existingUser = null;
          } finally {
            newValidation.isChecking = false;
          }
        }
      }
    }
    
    setQuickAddValidation(newValidation);
    return newValidation;
  };

  // ✅ NEW: Handle Quick Add Form Changes
  const handleQuickAddInputChange = async (field, value) => {
    setQuickAddForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // ✅ NEW: Sync main phone field with first phoneNumbers entry
      if (field === 'phone') {
        newForm.phoneNumbers = [{
          ...newForm.phoneNumbers[0],
          number: value
        }, ...newForm.phoneNumbers.slice(1)];
      }
      
      return newForm;
    });
    await validateQuickAddForm(field, value);
  };

  // ✅ NEW: Handle Phone Number Management
  const handleAddPhoneNumber = () => {
    setQuickAddForm(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, { number: '', label: 'Mobile' }]
    }));
    setShowAdditionalPhones(true);
  };

  const handleRemovePhoneNumber = (index) => {
    setQuickAddForm(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)
    }));
    
    // Hide additional phones section if only one phone number left
    if (quickAddForm.phoneNumbers.length <= 2) {
      setShowAdditionalPhones(false);
    }
  };

  const handlePhoneNumberChange = (index, field, value) => {
    setQuickAddForm(prev => {
      const newForm = {
        ...prev,
        phoneNumbers: prev.phoneNumbers.map((phone, i) => 
          i === index ? { ...phone, [field]: value } : phone
        )
      };
      
      // ✅ NEW: Sync main phone field when first phoneNumbers entry changes
      if (index === 0 && field === 'number') {
        newForm.phone = value;
      }
      
      return newForm;
    });
  };

  // ✅ NEW: Handle Quick Add Form Submit
  const handleQuickAddSubmit = async () => {
    if (isSubmittingQuickAdd) return;
    
    try {
      setIsSubmittingQuickAdd(true);
      
      // Validate all fields
      const nameValidation = await validateQuickAddForm('name', quickAddForm.name);
      const phoneValidation = await validateQuickAddForm('phone', quickAddForm.phone);
      
      // Check if there are any errors
      if (nameValidation.nameError || phoneValidation.phoneError || phoneValidation.userExists) {
        if (phoneValidation.userExists) {
          const existingUser = phoneValidation.existingUser;
          const userName = existingUser.name || existingUser.businessName || existingUser.partyName || 'Unknown Contact';
          const userPhone = existingUser.phone || existingUser.mobile || existingUser.phoneNumber || existingUser.contactNumber || 'No phone';
          
          const warningMessage = `Contact already exists!\n\nName: ${userName}\nPhone: ${userPhone}\n\nWould you like to start a chat with this contact instead?`;
          
          addToast && addToast(`Contact already exists: ${userName}`, "warning");
          showToastNotification(`Contact already exists: ${userName}`, "warning");
          
          // Show confirmation dialog
          if (window.confirm(warningMessage)) {
            // Close modal and open chat with existing contact
            resetQuickAddModal();
            
            // Find and select the existing contact
            const contactToChat = parties.find(p => 
              (p._id || p.id) === (existingUser._id || existingUser.id)
            ) || existingUser;
            
            if (contactToChat) {
              // Open chat with existing contact
              setTimeout(() => {
                handleChatClick(contactToChat);
              }, 300);
            }
          }
        } else {
          addToast && addToast("Please fix the errors before submitting", "error");
        }
        return;
      }
      
      // ✅ UPDATED: Prepare contact data for the new contact service
      const contactData = {
        name: quickAddForm.name.trim(),
        phone: quickAddForm.phone.trim(),
        phoneNumbers: quickAddForm.phoneNumbers.filter(phoneItem => phoneItem.number.trim()),
        email: quickAddForm.email?.trim() || null,
        address: quickAddForm.address?.trim() || null,
        company: quickAddForm.company?.trim() || null,
        shopName: quickAddForm.shopName?.trim() || null,
        shopOwner: quickAddForm.shopOwner?.trim() || null,
        website: quickAddForm.website?.trim() || null,
        partyType: quickAddForm.partyType || 'customer',
        priority: quickAddForm.priority || 'medium',
        status: quickAddForm.status || 'active',
        notes: quickAddForm.notes?.trim() || null,
        tags: quickAddForm.tags?.filter(tag => tag && tag.trim()) || [],
        socialMedia: {
          linkedin: quickAddForm.socialMedia?.linkedin?.trim() || null,
          twitter: quickAddForm.socialMedia?.twitter?.trim() || null,
          instagram: quickAddForm.socialMedia?.instagram?.trim() || null
        }
      };
      
      console.log('🔄 Submitting contact data to database:', contactData);
      
      // ✅ UPDATED: Use the new contact service
      const { contactService } = await import('../../services/contactService');
      const result = await contactService.createContact(contactData);
      
      console.log('✅ Quick party creation result:', result);
      
      if (result.success) {
        // ✅ UPDATED: Create party object from saved contact data
        const savedContact = result.data;
        const newParty = {
          id: savedContact._id,
          _id: savedContact._id,
          name: savedContact.name,
          phone: savedContact.phone,
          mobile: savedContact.phone,
          phoneNumber: savedContact.phone,
          contactNumber: savedContact.phone,
          phoneNumbers: savedContact.phoneNumbers || [],
          email: savedContact.email,
          address: savedContact.address,
          company: savedContact.company,
          shopName: savedContact.shopName,
          shopOwner: savedContact.shopOwner,
          website: savedContact.website,
          partyType: savedContact.partyType,
          priority: savedContact.priority,
          status: savedContact.status,
          notes: savedContact.notes,
          tags: savedContact.tags || [],
          socialMedia: savedContact.socialMedia || {},
          // ✅ Chat functionality properties
          canChat: true, 
          hasUnreadMessages: false,
          unreadCount: 0,
          lastMessageTime: null,
          lastMessage: 'Contact added to your list',
          isOnline: false,
          lastSeen: null,
          // ✅ Database metadata
          addedAt: savedContact.createdAt,
          addedBy: savedContact.addedByName,
          companyId: savedContact.companyId,
          companyName: savedContact.companyName,
          // ✅ Chat identification fields
          chatId: null, // Will be created when first message is sent
          chatCompanyId: currentCompany?.id,
          linkedCompanyId: currentCompany?.id
        };
        
        // ✅ Update both parties arrays
        setParties(prev => [newParty, ...prev]);
        setAllParties(prev => [newParty, ...prev]);
        
        // ✅ Also update linked parties if it's a chat-enabled contact
        if (activeSection === "linked") {
          setLinkedParties(prev => [newParty, ...prev]);
        }
        
        // Reset form and close modal
        resetQuickAddModal();
        
        // Show success message
        const successMessage = `Contact "${quickAddForm.name}" added successfully to database and is ready for chat!`;
        addToast && addToast(successMessage, "success");
        showToastNotification(successMessage, "success");
        
        // ✅ OPTIONAL: Auto-refresh parties to get any server-side updates
        setTimeout(() => {
          fetchParties();
        }, 1000);
        
      } else {
        console.error('❌ Failed to create party:', result.error);
        addToast && addToast(result.error || "Failed to add contact", "error");
        showToastNotification(result.error || "Failed to add contact", "error");
      }
      
    } catch (error) {
      console.error('❌ Error adding new contact:', error);
      
      // ✅ ENHANCED: Handle specific duplicate contact error
      if (error.response?.data?.message?.includes('already exists')) {
        const errorMessage = error.response.data.message;
        const phoneMatch = errorMessage.match(/phone number (\d+)/);
        const existingPhone = phoneMatch ? phoneMatch[1] : quickAddForm.phone;
        
        // Try to find the existing contact in our parties list
        const existingContact = parties.find(party => {
          const partyPhone = (party.phone || party.mobile || party.phoneNumber || party.contactNumber || '').replace(/\D/g, '');
          const searchPhone = existingPhone.replace(/\D/g, '');
          return partyPhone === searchPhone || 
                 partyPhone.endsWith(searchPhone.slice(-10)) || 
                 searchPhone.endsWith(partyPhone.slice(-10));
        });
        
        if (existingContact) {
          const userName = existingContact.name || existingContact.businessName || existingContact.partyName || 'Unknown Contact';
          const userPhone = existingContact.phone || existingContact.mobile || existingContact.phoneNumber || existingContact.contactNumber || existingPhone;
          
          const warningMessage = `Contact already exists!\n\nName: ${userName}\nPhone: ${userPhone}\n\nWould you like to start a chat with this contact instead?`;
          
          addToast && addToast(`Contact already exists: ${userName}`, "warning");
          showToastNotification(`Contact already exists: ${userName}`, "warning");
          
          // Show confirmation dialog
          if (window.confirm(warningMessage)) {
            // Close modal and open chat with existing contact
            resetQuickAddModal();
            
            setTimeout(() => {
              handleChatClick(existingContact);
            }, 300);
          }
        } else {
          // Fallback if we can't find the contact locally
          const fallbackMessage = `A contact with phone number ${existingPhone} already exists in your company. Please check your contacts list.`;
          addToast && addToast(fallbackMessage, "warning");
          showToastNotification(fallbackMessage, "warning");
        }
      } else {
        // Handle other errors
        const errorMessage = error.response?.data?.message || error.message || "Failed to add contact. Please try again.";
        addToast && addToast(errorMessage, "error");
        showToastNotification(errorMessage, "error");
      }
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  };

  // ✅ NEW: Reset Quick Add Modal
  const resetQuickAddModal = () => {
    setQuickAddForm({ 
      name: '', 
      phone: '', 
      phoneNumbers: [{ number: '', label: 'Primary' }], // ✅ Reset phone numbers
      shopName: '', 
      shopOwner: '', 
      partyType: 'customer',
      email: '',
      address: '',
      notes: ''
    });
    setQuickAddValidation({
      nameError: '',
      phoneError: '',
      isChecking: false,
      userExists: false,
      existingUser: null
    });
    setIsSubmittingQuickAdd(false);
    setShowAddPartyModal(false);
    setShowAdditionalPhones(false); // ✅ Reset additional phones visibility
  };

  // ✅ NEW: Handle profile modal close
  const handleProfileModalClose = () => {
    setShowProfileModal(false);
    setIsEditingProfile(false);
    setEditedProfile({});
    setProfileImage(null);
    setProfileParty(null);
  };

  // ✅ NEW: Validate profile form data
  const validateProfileForm = () => {
    const errors = {};
    
    // Name validation
    if (!editedProfile.name?.trim()) {
      errors.name = "Name is required";
    } else if (editedProfile.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (editedProfile.name.trim().length > 100) {
      errors.name = "Name cannot exceed 100 characters";
    }
    
    // Phone validation
    if (!editedProfile.phone?.trim()) {
      errors.phone = "Phone number is required";
    } else {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(editedProfile.phone.trim())) {
        errors.phone = "Please enter a valid 10-digit phone number starting with 6, 7, 8, or 9";
      }
    }
    
    // Email validation (optional but must be valid if provided)
    if (editedProfile.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedProfile.email.trim())) {
        errors.email = "Please enter a valid email address";
      }
    }
    
    return errors;
  };

  // ✅ NEW: Handle profile save
  const handleSaveProfile = async () => {
    if (!currentCompany?.id || !profileParty?._id) {
      showToastNotification("Unable to save profile - missing required data", "error");
      return;
    }

    // Validate form data
    const validationErrors = validateProfileForm();
    setProfileValidationErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      const errorMessages = Object.values(validationErrors).join(", ");
      showToastNotification(`Please fix the following errors: ${errorMessages}`, "error");
      return;
    }

    try {
      setIsSavingProfile(true);
      
      // Prepare update data matching backend schema exactly
      const updateData = {
        // Core fields - map to exact backend schema field names
        name: editedProfile.name?.trim() || profileParty.name || profileParty.businessName || profileParty.partyName,
        phoneNumber: editedProfile.phone?.trim() || profileParty.phoneNumber || profileParty.phone || profileParty.mobile,
        email: editedProfile.email?.trim() || profileParty.email || "",
        companyName: editedProfile.shopName?.trim() || profileParty.companyName || profileParty.businessName || profileParty.shopName || "",
        shopName: editedProfile.shopName?.trim() || profileParty.shopName || "",
        shopOwner: editedProfile.ownerName?.trim() || profileParty.shopOwner || profileParty.ownerName || "",
        partyType: (editedProfile.partyType || profileParty.partyType || "customer").toLowerCase(),
        
        // Address handling - map to backend address structure
        homeAddressLine: editedProfile.address?.trim() || profileParty.address || profileParty.homeAddress?.addressLine || "",
        
        // Additional fields for backward compatibility
        ownerName: editedProfile.ownerName?.trim() || profileParty.ownerName || profileParty.name || ""
      };

      // Remove empty/null/undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === "" || updateData[key] === null || updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      console.log("🔄 Updating party with data:", updateData);
      console.log("📝 Original party data:", profileParty);

      // Upload profile image if selected
      let imageUrl = null;
      if (profileImage?.preview) {
        try {
          console.log("�️ Uploading profile image...");
          const imageResponse = await partyService.uploadProfileImage(profileParty._id, profileImage.preview);
          imageUrl = imageResponse.imageUrl || imageResponse.profileImage || imageResponse.data?.profileImage;
          console.log("✅ Profile image uploaded:", imageUrl);
        } catch (imageError) {
          console.error("❌ Failed to upload profile image:", imageError);
          showToastNotification("Profile updated but image upload failed", "warning");
        }
      }

      // Add image URL to update data if uploaded
      if (imageUrl) {
        updateData.profileImage = imageUrl;
      }

      // Call backend API to update party
      console.log("🚀 Calling updateParty API...");
      const response = await partyService.updateParty(profileParty._id, updateData);
      console.log("✅ Update response:", response);

      // Extract the updated party data from response
      const updatedPartyData = response.data?.party || response.party || response.data || response;
      
      console.log("📋 Updated party data received:", updatedPartyData);

      // Update local parties list
      setParties(prevParties => 
        prevParties.map(party => {
          if (party._id === profileParty._id) {
            const updatedParty = { 
              ...party, 
              ...updatedPartyData,
              // Ensure field compatibility for UI display
              phone: updatedPartyData.phoneNumber || updatedPartyData.phone || party.phone,
              businessName: updatedPartyData.companyName || updatedPartyData.businessName || party.businessName,
              address: updatedPartyData.homeAddress?.addressLine || updatedPartyData.address || party.address,
              shopName: updatedPartyData.companyName || updatedPartyData.shopName || party.shopName
            };
            console.log("📱 Updated party in list:", updatedParty);
            return updatedParty;
          }
          return party;
        })
      );

      // Update selected party if it's the same
      if (selectedParty?._id === profileParty._id) {
        const updatedSelectedParty = { 
          ...selectedParty, 
          ...updatedPartyData,
          phone: updatedPartyData.phoneNumber || updatedPartyData.phone || selectedParty.phone,
          businessName: updatedPartyData.companyName || updatedPartyData.businessName || selectedParty.businessName,
          address: updatedPartyData.homeAddress?.addressLine || updatedPartyData.address || selectedParty.address,
          shopName: updatedPartyData.companyName || updatedPartyData.shopName || selectedParty.shopName
        };
        console.log("🎯 Updated selected party:", updatedSelectedParty);
        setSelectedParty(updatedSelectedParty);
      }

      // Update profile party for modal display
      const updatedProfileParty = { 
        ...profileParty, 
        ...updatedPartyData,
        phone: updatedPartyData.phoneNumber || updatedPartyData.phone || profileParty.phone,
        businessName: updatedPartyData.companyName || updatedPartyData.businessName || profileParty.businessName,
        address: updatedPartyData.homeAddress?.addressLine || updatedPartyData.address || profileParty.address,
        shopName: updatedPartyData.companyName || updatedPartyData.shopName || profileParty.shopName
      };
      console.log("👤 Updated profile party:", updatedProfileParty);
      setProfileParty(updatedProfileParty);

      // Exit edit mode and reset form
      setIsEditingProfile(false);
      setEditedProfile({});
      setProfileImage(null);
      
      // Close the profile modal after successful save
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileParty(null);
      }, 500);

      // Show success message
      showToastNotification(
        imageUrl ? "Profile and image updated successfully!" : "Profile updated successfully!", 
        "success"
      );

      console.log("🎉 Profile update completed successfully!");

    } catch (error) {
      console.error("❌ Error saving profile:", error);
      
      let errorMessage = "Failed to update profile";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToastNotification(errorMessage, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ✅ NEW: Handle profile image selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToastNotification("Image size must be less than 5MB", "error");
        return;
      }

      // Store both the file and preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage({
          file: file,
          preview: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ ENHANCED: WhatsApp handler functions
  const handleSendWhatsAppToContact = async (party) => {
    try {
      if (!party.phoneNumber) {
        showToastNotification("This contact doesn't have a phone number", "error");
        return;
      }

      if (!isValidWhatsAppNumber(party.phoneNumber)) {
        showToastNotification("Invalid phone number for WhatsApp", "error");
        return;
      }

      // Get current user info
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      const senderName = currentUser?.name || currentUser?.username || "";
      const companyName = currentCompany?.businessName || currentCompany?.companyName || "";

      const result = await sendWhatsAppToContact(party, {
        senderName,
        companyName
      });

      if (result.success) {
        showToastNotification(`WhatsApp message sent to ${party.name}!`, "success");
      } else {
        showToastNotification(result.error || "Failed to send WhatsApp message", "error");
      }

    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      showToastNotification("Failed to send WhatsApp message", "error");
    }
  };

  // ✅ NEW: Enhanced WhatsApp modal functions
  const handleWhatsAppModalOpen = () => {
    setWhatsappModalAnimating(true);
    setShowWhatsAppModal(true);
    setWhatsappMessageMode('single');    const handleDirectProfileClick = (party) => {
      console.log('🔍 Direct profile clicked for:', party);
      
      // Reset editing state when opening new profile
      setIsEditingProfile(false);
      setEditedProfile({});
      setProfileImage(null);
      
      setProfileParty(party);
      setShowProfileModal(true);
    };    const handleProfileModalClose = () => {
      setShowProfileModal(false);
      setIsEditingProfile(false);
      setEditedProfile({});
      setProfileImage(null);
      setProfileParty(null);
    };
    setUseCustomMessage(false);
    setCustomMessage('');
    
    // Get all parties with valid phone numbers for initial setup
    const validContacts = parties.filter(party => {
      const phoneNumber = party.phoneNumber || party.phone || party.mobile || party.contactNumber;
      return phoneNumber && isValidWhatsAppNumber(phoneNumber);
    });
    
    setSelectedContactsForWhatsApp(validContacts);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Add entrance animation delay
    setTimeout(() => {
      setWhatsappModalAnimating(false);
    }, 300);
  };

  const handleWhatsAppModalClose = (e) => {
    // Stop event propagation if it's from overlay click
    if (e) {
      e.stopPropagation();
    }
    
    setWhatsappModalAnimating(true);
    
    // Add exit animation
    setTimeout(() => {
      setShowWhatsAppModal(false);
      setWhatsappModalAnimating(false);
      setSelectedSingleContact(null);
      setUseCustomMessage(false);
      setCustomMessage('');
      
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }, 300);
  };

  const handleMessageModeChange = (mode) => {
    // Don't block mode changes due to animation state
    setWhatsappMessageMode(mode);
    
    if (mode === 'single') {
      setSelectedSingleContact(null);
    } else if (mode === 'all') {
      // Select all valid contacts
      const validContacts = parties.filter(party => {
        const phoneNumber = party.phoneNumber || party.phone || party.mobile || party.contactNumber;
        return phoneNumber && isValidWhatsAppNumber(phoneNumber);
      });
      setSelectedContactsForWhatsApp(validContacts);
    } else if (mode === 'big-size') {
      // Reset big size selections
      setSelectedBigSizeNumber(null);
      setBigSizeContactsToSend([]);
      setSelectedContactsForWhatsApp([]);
    }
  };

  const handleSingleContactSelect = (contact) => {
    console.log('Selecting single contact:', contact);
    setSelectedSingleContact(contact);
  };

  const handleBigSizeNumberSelect = (number) => {
    console.log('Selecting big size number:', number);
    setSelectedBigSizeNumber(number);
    
    // Get valid contacts
    const validContacts = parties.filter(party => {
      const phoneNumber = party.phoneNumber || party.phone || party.mobile || party.contactNumber;
      return phoneNumber && isValidWhatsAppNumber(phoneNumber);
    });
    
    // Select first N contacts
    const selectedContacts = validContacts.slice(0, number);
    setBigSizeContactsToSend(selectedContacts);
    setSelectedContactsForWhatsApp(selectedContacts);
    
    console.log(`Selected first ${number} contacts:`, selectedContacts);
  };

  const handleContactToggle = (contact) => {
    console.log('Toggling contact:', contact);
    setSelectedContactsForWhatsApp(prev => {
      const contactId = contact._id || contact.id;
      const isSelected = prev.some(c => (c._id || c.id) === contactId);
      
      if (isSelected) {
        return prev.filter(c => (c._id || c.id) !== contactId);
      } else {
        return [...prev, contact];
      }
    });
  };

  // ✅ FIXED: Enhanced bulk WhatsApp sending
  const handleSendBulkWhatsApp = async () => {
    try {
      setWhatsappSending(true);
      
      let contactsToSend = [];
      let messageToSend = '';
      
      // Determine contacts and message based on mode
      if (whatsappMessageMode === 'single') {
        if (!selectedSingleContact) {
          showToastNotification("Please select a contact to send message to", "error");
          return;
        }
        contactsToSend = [selectedSingleContact];
      } else if (whatsappMessageMode === 'bulk') {
        contactsToSend = selectedContactsForWhatsApp.filter(contact => {
          const phoneNumber = contact.phoneNumber || contact.phone || contact.mobile || contact.contactNumber;
          return phoneNumber && isValidWhatsAppNumber(phoneNumber);
        });
      } else if (whatsappMessageMode === 'all') {
        contactsToSend = parties.filter(party => {
          const phoneNumber = party.phoneNumber || party.phone || party.mobile || party.contactNumber;
          return phoneNumber && isValidWhatsAppNumber(phoneNumber);
        });
      }
      
      if (contactsToSend.length === 0) {
        showToastNotification("No valid contacts selected for WhatsApp messaging", "error");
        return;
      }
      
      setWhatsappProgress({ current: 0, total: contactsToSend.length });

      // Get current user info
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      const senderName = currentUser?.name || currentUser?.username || "";
      const companyName = currentCompany?.businessName || currentCompany?.companyName || "";

      // ✅ FIXED: Send messages to ALL contacts, not just the first one
      const results = [];
      
      for (let i = 0; i < contactsToSend.length; i++) {
        const contact = contactsToSend[i];
        
        try {
          // Update progress
          setWhatsappProgress({ current: i + 1, total: contactsToSend.length });
          
          // Get phone number from any available field
          const phoneNumber = contact.phoneNumber || contact.phone || contact.mobile || contact.contactNumber;
          
          if (!phoneNumber || !isValidWhatsAppNumber(phoneNumber)) {
            results.push({
              success: false,
              contact: contact.name || 'Unknown',
              error: 'Invalid phone number'
            });
            continue;
          }
          
          // Generate message
          const message = useCustomMessage && customMessage.trim() 
            ? customMessage.trim()
            : whatsappMessageMode === 'all' || bulkMessageMode
              ? generateBulkMessage({ senderName, companyName })
              : generateDefaultMessage({
                  contactName: contact.name || contact.businessName || 'Valued Contact',
                  companyName,
                  senderName
                });
          
          // Open WhatsApp for this contact
          openWhatsApp(phoneNumber, message);
          
          results.push({
            success: true,
            contact: contact.name || 'Unknown',
            phoneNumber: phoneNumber
          });
          
          // Add delay between messages to prevent overwhelming
          if (i < contactsToSend.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
          
        } catch (error) {
          console.error(`Error sending WhatsApp to ${contact.name}:`, error);
          results.push({
            success: false,
            contact: contact.name || 'Unknown',
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        showToastNotification(
          `WhatsApp messages opened for ${successCount} contact(s)${failCount > 0 ? `. ${failCount} failed.` : ''}`,
          successCount > failCount ? "success" : "warning"
        );
      } else {
        showToastNotification("Failed to open WhatsApp for any contacts", "error");
      }

      // Close modal after successful sending
      setTimeout(() => {
        handleWhatsAppModalClose();
      }, 1000);
      
    } catch (error) {
      console.error("Error sending bulk WhatsApp:", error);
      showToastNotification("Failed to send bulk WhatsApp messages", "error");
    } finally {
      setWhatsappSending(false);
      setWhatsappProgress({ current: 0, total: 0 });
    }
  };

  const handleBulkWhatsApp = handleWhatsAppModalOpen;

  // ✅ Update parties with last message info from stored messages (WhatsApp-like behavior)
  const updatePartiesWithStoredMessages = (partiesToUpdate) => {
    const updatedParties = partiesToUpdate.map(party => {
      const storedMessages = loadStoredMessages(party);
      if (storedMessages.length > 0) {
        const lastMessage = storedMessages[storedMessages.length - 1];
        return {
          ...party,
          lastMessage: lastMessage.content || lastMessage.text || 'Message',
          lastMessageTime: lastMessage.timestamp || lastMessage.createdAt || new Date().toISOString(),
          hasUnreadMessages: false // Assume read when loading
        };
      }
      return party;
    });
    
    // Sort by most recent activity (WhatsApp behavior)
    const sortedParties = updatedParties.sort((a, b) => {
      const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 
                    (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 
                    (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return bTime - aTime;
    });
    
    setParties(sortedParties);
    setAllParties(sortedParties);
  };

  // ✅ NEW: Chat persistence functions
  const loadStoredMessages = (party) => {
    try {
      const partyId = party._id || party.id;
      const companyId = currentCompany?.id;
      
      if (!partyId || !companyId) {
        console.log("📁 No party ID or company ID for loading stored messages");
        return [];
      }
      
      // Use the same key format as saveMessagesToStorage
      const storageKey = `messages_${companyId}_${partyId}`;
      const storedMessages = localStorage.getItem(storageKey);
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        console.log(`📁 Loaded ${parsed.length} stored messages for ${party.name || party.partyName}`);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error loading stored messages:', error);
    }
    return [];
  };

  const saveMessagesToStorage = (party, messages) => {
    try {
      const partyId = party._id || party.id;
      const companyId = currentCompany?.id;
      
      if (!partyId || !companyId) {
        console.log("📁 No party ID or company ID for saving messages");
        return;
      }
      
      // Use the same key format as loadMessagesFromStorage
      const storageKey = `messages_${companyId}_${partyId}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
      console.log(`📁 Saved ${messages.length} messages to storage for ${party.name || party.partyName}`);
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  // ✅ NEW: Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // ✅ NEW: Close chat options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close options menu when clicking outside
      if (showChatOptionsMenu && !event.target.closest('.header-actions')) {
        setShowChatOptionsMenu(false);
      }
    };

    if (showChatOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showChatOptionsMenu]);

  // Render chat popup
  const renderChatPopup = () => {
    if (!chatPopupOpen || !selectedParty) return null;

    const displayPhone = selectedParty.phone || selectedParty.mobile || 
                        selectedParty.phoneNumber || selectedParty.contactNumber;
    const displayName = selectedParty.name || selectedParty.businessName || 
                       selectedParty.partyName;

    const popupContent = (
      <div className="whatsapp-overlay" onClick={closeChatPopup}>
        <div className="whatsapp-popup" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="whatsapp-header">
            <div className="header-left">
              <button className="back-btn ripple" onClick={closeChatPopup}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
              <div className="contact-avatar">
                <div 
                  className="avatar-circle"
                  style={{ backgroundColor: getAvatarColor(displayName) }}
                >
                  {getUserInitials(displayName)}
                </div>
              </div>
              <div className="contact-info">
                <div 
                  className="contact-name"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleProfileClick();
                  }}
                  style={{ cursor: 'pointer' }}
                  title="View profile"
                >
                  {displayName}
                </div>
                <div className="contact-status">
                  {displayPhone}
                  {selectedParty.canChat ? ' • Chat enabled' : ' • Basic contact'}
                </div>
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="action-btn ripple" 
                title="Video call (Under maintenance)"
                onClick={(e) => handleCallClick('Video', e)}
              >
                <FontAwesomeIcon icon={faVideo} />
              </button>
              <button 
                className="action-btn ripple" 
                title="Voice call (Under maintenance)"
                onClick={(e) => handleCallClick('Voice', e)}
              >
                <FontAwesomeIcon icon={faPhone} />
              </button>
              <div style={{ position: 'relative' }}>
                <button 
                  className="action-btn ripple" 
                  title="More options"
                  onClick={() => setShowChatOptionsMenu(prev => !prev)}
                >
                  <FontAwesomeIcon icon={faEllipsisV} />
                </button>
                
                {/* ✅ NEW: Chat Options Dropdown */}
                {showChatOptionsMenu && (
                  <div className="chat-options-menu">
                    <div className="chat-option-item" onClick={() => handleChatOptionsClick('viewProfile')}>
                      <FontAwesomeIcon icon={faEye} />
                      <span>View Profile</span>
                    </div>
                    <div className="chat-option-item" onClick={() => handleChatOptionsClick('selectMessages')}>
                      <FontAwesomeIcon icon={faCheck} />
                      <span>Select Messages</span>
                    </div>
                    <div className="chat-option-item" onClick={() => handleChatOptionsClick('muteNotifications')}>
                      <FontAwesomeIcon icon={mutedContacts.has(selectedParty?._id || selectedParty?.id) ? faBell : faBellSlash} />
                      <span>{mutedContacts.has(selectedParty?._id || selectedParty?.id) ? 'UnMute Notifications' : 'Mute Notifications'}</span>
                    </div>
                    <div className="chat-option-item" onClick={() => handleChatOptionsClick('clearChat')}>
                      <FontAwesomeIcon icon={faTrash} />
                      <span>Clear Chat</span>
                    </div>
                    <div className="chat-option-item" onClick={() => handleChatOptionsClick('exportChat')}>
                      <FontAwesomeIcon icon={faDownload} />
                      <span>Export Chat</span>
                    </div>
                    <div className="chat-option-item" onClick={() => handleChatOptionsClick('blockContact')}>
                      <FontAwesomeIcon icon={blockedContacts.has(selectedParty?._id || selectedParty?.id) ? faUserCheck : faUserTimes} />
                      <span>{blockedContacts.has(selectedParty?._id || selectedParty?.id) ? 'Unblock Contact' : 'Block Contact'}</span>
                    </div>
                    <div className="chat-option-item" onClick={() => handleChatOptionsClick('addShortcut')}>
                      <FontAwesomeIcon icon={faLink} />
                      <span>Add Chat Shortcut</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="whatsapp-messages" ref={messagesContainerRef}>
            {error && (
              <Alert variant="danger" className="m-3">
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                {error}
              </Alert>
            )}
            
            {isLoadingMessages ? (
              <div className="text-center py-4">
                <Spinner animation="border" size="sm" />
                <div className="mt-2 text-muted">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="no-messages-whatsapp">
                <div className="encryption-notice">
                  <FontAwesomeIcon icon={faLock} />
                  <p>Messages are end-to-end encrypted. No one outside of this chat can read or listen to them.</p>
                  <p className="mt-2">Start a conversation with {displayName}!</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div 
                    key={message.id || index}
                    className={`message-container ${message.type}`}
                  >
                    <div className={`message-bubble ${message.type}`}>
                      <div className="message-text">{message.content}</div>
                      <div className="message-meta">
                        <span className="message-time">
                          {formatWhatsAppTime(message.timestamp)}
                        </span>
                        {message.type === "sent" && (
                          <span className="message-status">
                            {getStatusIcon(message.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* ✅ ENHANCED: Input Area with Emoji Picker */}
          <div className="whatsapp-input">
            <div className="input-container">
              <div style={{ position: 'relative' }} ref={emojiPickerRef}>
                <button 
                  className="emoji-btn ripple" 
                  title="Emoji"
                  onClick={toggleEmojiPicker}
                >
                  <span>😊</span>
                </button>
                
                {/* ✅ ENHANCED: Modern Emoji Picker */}
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    <div className="emoji-picker-header">
                      <span>Choose an emoji</span>
                      <button 
                        className="emoji-close-btn"
                        onClick={() => setShowEmojiPicker(false)}
                        title="Close emoji picker"
                      >
                        ×
                      </button>
                    </div>
                    <div className="emoji-grid">
                      {predefinedEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          className="emoji-item"
                          onClick={() => {
                            console.log("Emoji clicked:", emoji);
                            handleEmojiClick(emoji);
                          }}
                          title={emoji}
                          style={{ fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <input
                ref={messageInputRef}
                type="text"
                className="message-input"
                placeholder="Type a message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending}
              />
              <button className="attach-btn ripple" title="Attach">
                <FontAwesomeIcon icon={faClipboardList} />
              </button>
              {newMessage.trim() ? (
                <button 
                  className="send-btn ripple"
                  onClick={handleSendMessage}
                  disabled={isSending}
                  title="Send message"
                >
                  {isSending ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} />
                  )}
                </button>
              ) : (
                <button className="mic-btn ripple" title="Voice message">
                  🎤
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(popupContent, document.body);
  };

  // ✅ NEW: Render Profile Modal
  const renderProfileModal = () => {
    if (!showProfileModal || !profileParty) {
      return null;
    }

    console.log('🎨 Rendering profile modal for:', profileParty);

    const displayName = profileParty.name || profileParty.businessName || profileParty.partyName;
    const displayPhone = profileParty.phone || profileParty.mobile || 
                        profileParty.phoneNumber || profileParty.contactNumber;

    const profileModalContent = (
      <div className="profile-modal-overlay" onClick={handleProfileModalClose}>
        <div 
          className="profile-modal" 
          onClick={(e) => e.stopPropagation()}
          key={profileParty._id || profileParty.id || profileParty.name}
        >
          <div className="profile-modal-header">
            <button 
              className="profile-close-btn"
              onClick={handleProfileModalClose}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h3>Contact Info</h3>
          </div>

          <div className="profile-modal-content">
            {/* Profile Picture Section */}
            <div className="profile-picture-section">
              <div className="profile-picture-container">
                <div 
                  className="profile-picture"
                  style={{ backgroundColor: getAvatarColor(displayName) }}
                >
                  {profileImage?.preview || profileImage || profileParty?.profileImage ? (
                    <img 
                      src={profileImage?.preview || profileImage || profileParty?.profileImage} 
                      alt="Profile" 
                      className="profile-img" 
                    />
                  ) : (
                    <span className="profile-initials">
                      {getUserInitials(displayName)}
                    </span>
                  )}
                </div>
                {isEditingProfile && (
                  <div className="profile-image-controls">
                    <input
                      type="file"
                      id="profile-image-input"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    <button 
                      className="change-picture-btn"
                      onClick={() => document.getElementById('profile-image-input').click()}
                      title="Change profile picture"
                    >
                      <FontAwesomeIcon icon={faCamera} />
                    </button>
                  </div>
                )}
              </div>
              <h4 className="profile-name">
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={editedProfile.name || ''}
                    onChange={(e) => {
                      setEditedProfile({...editedProfile, name: e.target.value});
                      // Clear validation error on change
                      if (profileValidationErrors.name) {
                        setProfileValidationErrors(prev => ({...prev, name: null}));
                      }
                    }}
                    className={`profile-edit-input ${profileValidationErrors.name ? 'error' : ''}`}
                    placeholder="Enter name"
                    style={{ fontSize: '16px', textAlign: 'center', fontWeight: '600' }}
                  />
                ) : (
                  displayName
                )}
              </h4>
              <p className="profile-phone">{displayPhone}</p>
            </div>

            {/* Contact Details - Grid Layout */}
            <div className="profile-details-section">
              <div className="profile-detail-item">
                <div className="detail-label">
                  <FontAwesomeIcon icon={faBuilding} />
                  <span>Shop Name</span>
                </div>
                <div className="detail-value">
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={editedProfile.shopName || ''}
                      onChange={(e) => setEditedProfile({...editedProfile, shopName: e.target.value})}
                      className="profile-edit-input"
                      placeholder="Enter shop name"
                    />
                  ) : (
                    <span>{profileParty.shopName || profileParty.businessName || 'Not specified'}</span>
                  )}
                </div>
              </div>

              <div className="profile-detail-item">
                <div className="detail-label">
                  <FontAwesomeIcon icon={faUser} />
                  <span>Owner Name</span>
                </div>
                <div className="detail-value">
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={editedProfile.ownerName || ''}
                      onChange={(e) => setEditedProfile({...editedProfile, ownerName: e.target.value})}
                      className="profile-edit-input"
                      placeholder="Enter owner name"
                    />
                  ) : (
                    <span>{profileParty.shopOwner || profileParty.ownerName || profileParty.name || 'Not specified'}</span>
                  )}
                </div>
              </div>

              <div className="profile-detail-item">
                <div className="detail-label">
                  <FontAwesomeIcon icon={faPhone} />
                  <span>Phone Numbers</span>
                </div>
                <div className="detail-value">
                  {isEditingProfile ? (
                    <input
                      type="tel"
                      value={editedProfile.phone || ''}
                      onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                      className="profile-edit-input"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <div className="phone-numbers-list">
                      {/* Primary Phone */}
                      <div className="phone-number-item">
                        <span className="phone-number">{displayPhone}</span>
                        <Badge bg="primary" className="ms-2">Primary</Badge>
                        <button
                          className="chat-phone-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsAppToContact(profileParty);
                          }}
                          title="Chat on WhatsApp"
                        >
                          <FontAwesomeIcon icon={faWhatsapp} />
                        </button>
                      </div>
                      
                      {/* Additional Phone Numbers */}
                      {profileParty.phoneNumbers && profileParty.phoneNumbers.length > 1 && (
                        profileParty.phoneNumbers.slice(1).map((phoneItem, index) => (
                          <div key={index} className="phone-number-item">
                            <span className="phone-number">{phoneItem.number}</span>
                            {phoneItem.label && (
                              <Badge bg="secondary" className="ms-2">{phoneItem.label}</Badge>
                            )}
                            <button
                              className="chat-phone-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                const tempParty = { ...profileParty, phone: phoneItem.number };
                                handleSendWhatsAppToContact(tempParty);
                              }}
                              title="Chat on WhatsApp"
                            >
                              <FontAwesomeIcon icon={faWhatsapp} />
                            </button>
                          </div>
                        ))
                      )}
                      
                      {/* Show if no additional numbers */}
                      {(!profileParty.phoneNumbers || profileParty.phoneNumbers.length <= 1) && (
                        <small className="text-muted d-block mt-1">Only one phone number available</small>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-detail-item">
                <div className="detail-label">
                  <FontAwesomeIcon icon={faEnvelope} />
                  <span>Email</span>
                </div>
                <div className="detail-value">
                  {isEditingProfile ? (
                    <input
                      type="email"
                      value={editedProfile.email || ''}
                      onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                      className="profile-edit-input"
                      placeholder="Enter email address"
                    />
                  ) : (
                    <span>{profileParty.email || 'Not specified'}</span>
                  )}
                </div>
              </div>

              <div className="profile-detail-item">
                <div className="detail-label">
                  <FontAwesomeIcon icon={faTag} />
                  <span>Type / Source</span>
                </div>
                <div className="detail-value">
                  {isEditingProfile ? (
                    <select
                      value={editedProfile.partyType || 'customer'}
                      onChange={(e) => setEditedProfile({...editedProfile, partyType: e.target.value})}
                      className="profile-edit-select"
                    >
                      <option value="customer">Customer</option>
                      <option value="vendor">Vendor</option>
                      <option value="supplier">Supplier</option>
                      <option value="both">Both</option>
                    </select>
                  ) : (
                    <div className="party-type-badges">
                      <Badge 
                        bg={
                          profileParty.source === 'customer' ? 'primary' :
                          profileParty.source === 'vendor' ? 'success' :
                          profileParty.source === 'endCustomer' ? 'info' :
                          'warning'
                        }
                      >
                        {profileParty.source === 'customer' ? '👤 Customer' :
                         profileParty.source === 'vendor' ? '🏢 Vendor' :
                         profileParty.source === 'endCustomer' ? '👥 End Customer' :
                         '📇 Contact'}
                      </Badge>
                      {profileParty.partyType && profileParty.partyType !== profileParty.source && (
                        <Badge bg="secondary" className="ms-2">
                          {profileParty.partyType.charAt(0).toUpperCase() + profileParty.partyType.slice(1)}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-detail-item full-width">
                <div className="detail-label">
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  <span>Address</span>
                </div>
                <div className="detail-value">
                  {isEditingProfile ? (
                    <textarea
                      value={editedProfile.address || ''}
                      onChange={(e) => setEditedProfile({...editedProfile, address: e.target.value})}
                      className="profile-edit-textarea"
                      placeholder="Enter address"
                      rows="2"
                      style={{ resize: 'none', width: '100%' }}
                    />
                  ) : (
                    <span>{profileParty.address || 'Not specified'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="profile-actions">
              <button 
                className="profile-action-btn"
                onClick={() => {
                  setIsEditingProfile(!isEditingProfile);
                  if (!isEditingProfile) {
                    // Initialize edit form with current data
                    setEditedProfile({
                      name: profileParty.name || profileParty.businessName || profileParty.partyName || '',
                      shopName: profileParty.shopName || profileParty.businessName || '',
                      ownerName: profileParty.ownerName || profileParty.name || '',
                      phone: profileParty.phone || profileParty.mobile || profileParty.phoneNumber || '',
                      email: profileParty.email || '',
                      address: profileParty.address || '',
                      partyType: (profileParty.partyType || 'customer').toLowerCase()
                    });
                  }
                }}
              >
                <FontAwesomeIcon icon={isEditingProfile ? faTimes : faEdit} />
                <span>{isEditingProfile ? 'Cancel' : 'Edit'}</span>
              </button>
              
              {isEditingProfile && (
                <button 
                  className="profile-action-btn success"
                  onClick={() => handleSaveProfile()}
                  disabled={isSavingProfile}
                  style={{ 
                    opacity: isSavingProfile ? 0.6 : 1,
                    cursor: isSavingProfile ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSavingProfile ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} />
                      <span>Save</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(profileModalContent, document.body);
  };

  // ✅ NEW: Render Quick Add Modal
  const renderQuickAddModal = () => {
    if (!showAddPartyModal) {
      return null;
    }

    const quickAddModalContent = (
      <div className="profile-modal-overlay" onClick={resetQuickAddModal}>
        <div className="quick-add-modal" onClick={(e) => e.stopPropagation()}>
          <div className="quick-add-header">
            <h3>Quick Add Contact</h3>
            <button 
              className="profile-close-btn"
              onClick={resetQuickAddModal}
              disabled={isSubmittingQuickAdd}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          <div className="quick-add-content">
            <div className="quick-add-form">
              {/* Contact Name Field */}
              <div className="form-group">
                <label>Contact Name <span className="required">*</span></label>
                <input 
                  type="text" 
                  className={`form-control ${quickAddValidation.nameError ? 'is-invalid' : ''}`}
                  placeholder="Enter contact name"
                  value={quickAddForm.name}
                  onChange={(e) => handleQuickAddInputChange('name', e.target.value)}
                  disabled={isSubmittingQuickAdd}
                />
                {quickAddValidation.nameError && (
                  <div className="invalid-feedback">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                    {quickAddValidation.nameError}
                  </div>
                )}
              </div>
              
              {/* Phone Number Field */}
              <div className="form-group">
                <label>Phone Number <span className="required">*</span></label>
                <div className="phone-input-container">
                  <div className="d-flex align-items-center">
                    <input 
                      type="tel" 
                      className={`form-control ${quickAddValidation.phoneError ? 'is-invalid' : quickAddValidation.userExists ? 'is-invalid' : quickAddForm.phone && !quickAddValidation.phoneError && !quickAddValidation.isChecking ? 'is-valid' : ''}`}
                      placeholder="Enter Whatsapp number"
                      value={quickAddForm.phone}
                      onChange={(e) => handleQuickAddInputChange('phone', e.target.value)}
                      disabled={isSubmittingQuickAdd}
                    />
                    {/* ✅ NEW: Plus icon to add additional phone numbers */}
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm ms-2"
                      onClick={handleAddPhoneNumber}
                      disabled={isSubmittingQuickAdd}
                      style={{ minWidth: '40px' }}
                      title="Add another phone number"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                  {quickAddValidation.isChecking && (
                    <div className="phone-checking-indicator">
                      <Spinner size="sm" animation="border" />
                    </div>
                  )}
                </div>
                
                {/* Validation Messages */}
                {quickAddValidation.phoneError && (
                  <div className={`validation-feedback ${quickAddValidation.userExists ? 'user-exists' : 'error'}`}>
                    <FontAwesomeIcon 
                      icon={quickAddValidation.userExists ? faExclamationCircle : faExclamationTriangle} 
                      className="me-1" 
                    />
                    {quickAddValidation.phoneError}
                    {quickAddValidation.existingUser && (
                      <div className="existing-user-info">
                        <small>
                          Type: {quickAddValidation.existingUser.partyType || 'Contact'} | 
                          Phone: {quickAddValidation.existingUser.phone || quickAddValidation.existingUser.mobile || 'N/A'}
                        </small>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Success Message */}
                {quickAddForm.phone && !quickAddValidation.phoneError && !quickAddValidation.isChecking && !quickAddValidation.userExists && (
                  <div className="validation-feedback success">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                    Phone number is available
                  </div>
                )}
              </div>

              {/* ✅ NEW: Additional Phone Numbers Section */}
              {showAdditionalPhones && quickAddForm.phoneNumbers.length > 1 && (
                <div className="form-group">
                  <label>Additional Phone Numbers</label>
                  {quickAddForm.phoneNumbers.slice(1).map((phoneItem, index) => (
                    <div key={index + 1} className="d-flex align-items-center mb-2">
                      <input
                        type="text"
                        className="form-control me-2"
                        placeholder="Label (e.g., Office, Home)"
                        value={phoneItem.label}
                        onChange={(e) => handlePhoneNumberChange(index + 1, 'label', e.target.value)}
                        disabled={isSubmittingQuickAdd}
                        style={{ maxWidth: '150px' }}
                      />
                      <input
                        type="tel"
                        className="form-control me-2"
                        placeholder="Phone number"
                        value={phoneItem.number}
                        onChange={(e) => handlePhoneNumberChange(index + 1, 'number', e.target.value)}
                        disabled={isSubmittingQuickAdd}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleRemovePhoneNumber(index + 1)}
                        disabled={isSubmittingQuickAdd}
                        style={{ minWidth: '40px' }}
                        title="Remove phone number"
                      >
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Shop Name Field */}
              <div className="form-group">
                <label>Shop Name</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Enter shop name"
                  value={quickAddForm.shopName}
                  onChange={(e) => handleQuickAddInputChange('shopName', e.target.value)}
                  disabled={isSubmittingQuickAdd}
                />
              </div>  
              
              {/* Contact Type Field */}
              <div className="form-group">
                <label>Contact Type</label>
                <select 
                  className="form-control"
                  value={quickAddForm.partyType}
                  onChange={(e) => handleQuickAddInputChange('partyType', e.target.value)}
                  disabled={isSubmittingQuickAdd}
                >
                  <option value="customer">Customer</option>
                  <option value="Shop Owner">Shop Owner</option>
                  {/* <option value="supplier">Supplier</option>
                  <option value="both">Both</option> */}
                </select>
              </div>
              
              {/* Action Buttons */}
              <div className="quick-add-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleQuickAddSubmit}
                  disabled={
                    isSubmittingQuickAdd || 
                    !quickAddForm.name.trim() || 
                    !quickAddForm.phone.trim() || 
                    quickAddValidation.nameError || 
                    quickAddValidation.phoneError || 
                    quickAddValidation.userExists ||
                    quickAddValidation.isChecking
                  }
                >
                  {isSubmittingQuickAdd ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                      Add Contact
                    </>
                  )}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={resetQuickAddModal}
                  disabled={isSubmittingQuickAdd}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(quickAddModalContent, document.body);
  };

  // ✅ NEW: Render Browse Contacts Modal (Customers, Vendors, End Customers)
  const renderBrowseContactsModal = () => {
    if (!showBrowseContactsModal) {
      return null;
    }

    // Filter available contacts based on selected filter and search
    const filteredAvailableContacts = allAvailableContacts.filter(contact => {
      // Filter by type
      let matchesFilter = true;
      if (browseContactsFilter !== "all") {
        if (browseContactsFilter === "customers") {
          matchesFilter = contact.source === 'customer';
        } else if (browseContactsFilter === "vendors") {
          matchesFilter = contact.source === 'vendor';
        } else if (browseContactsFilter === "endCustomers") {
          matchesFilter = contact.source === 'endCustomer';
        }
      }

      // Filter by search
      const searchLower = browseSearchQuery.toLowerCase();
      const matchesSearch = !browseSearchQuery || 
        (contact.name && contact.name.toLowerCase().includes(searchLower)) ||
        (contact.phone && contact.phone.includes(browseSearchQuery)) ||
        (contact.email && contact.email.toLowerCase().includes(searchLower)) ||
        (contact.company && contact.company.toLowerCase().includes(searchLower));

      return matchesFilter && matchesSearch;
    });

    const browseContactsContent = (
      <div className="profile-modal-overlay" onClick={() => setShowBrowseContactsModal(false)}>
        <div className="browse-contacts-modal" onClick={(e) => e.stopPropagation()}>
          <div className="browse-contacts-header">
            <h3>
              <FontAwesomeIcon icon={faUsers} className="me-2" />
              Add Contacts to Chat
            </h3>
            <button 
              className="profile-close-btn"
              onClick={() => setShowBrowseContactsModal(false)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Search and Filter */}
          <div className="browse-contacts-filters">
            <div className="browse-search-container">
              <input
                type="text"
                placeholder="Search by name, phone, email..."
                className="browse-search-input"
                value={browseSearchQuery}
                onChange={(e) => setBrowseSearchQuery(e.target.value)}
              />
            </div>

            <div className="browse-filter-tabs">
              <button 
                className={`browse-filter-tab ${browseContactsFilter === "all" ? "active" : ""}`}
                onClick={() => setBrowseContactsFilter("all")}
              >
                All ({allAvailableContacts.length})
              </button>
              <button 
                className={`browse-filter-tab ${browseContactsFilter === "customers" ? "active" : ""}`}
                onClick={() => setBrowseContactsFilter("customers")}
              >
                Customers ({allAvailableContacts.filter(c => c.source === 'customer').length})
              </button>
              <button 
                className={`browse-filter-tab ${browseContactsFilter === "vendors" ? "active" : ""}`}
                onClick={() => setBrowseContactsFilter("vendors")}
              >
                Vendors ({allAvailableContacts.filter(c => c.source === 'vendor').length})
              </button>
              <button 
                className={`browse-filter-tab ${browseContactsFilter === "endCustomers" ? "active" : ""}`}
                onClick={() => setBrowseContactsFilter("endCustomers")}
              >
                End Customers ({allAvailableContacts.filter(c => c.source === 'endCustomer').length})
              </button>
            </div>

            {/* Quick Add Button */}
            {/* <button 
              className="btn btn-success btn-sm"
              onClick={() => {
                setShowBrowseContactsModal(false);
                setShowAddPartyModal(true);
              }}
              title="Add new contact manually"
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Create New Contact
            </button> */}
          </div>

          {/* Contacts List */}
          <div className="browse-contacts-list">
            {loadingAvailableContacts ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <div className="mt-2">Loading contacts...</div>
              </div>
            ) : filteredAvailableContacts.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FontAwesomeIcon icon={faUsers} size="3x" className="mb-3 opacity-50" />
                <p>No contacts found</p>
                {browseSearchQuery && <small>Try adjusting your search or filters</small>}
              </div>
            ) : (
              filteredAvailableContacts.map((contact) => {
                const displayName = contact.name || contact.businessName || contact.partyName || 'Unnamed';
                const displayPhone = contact.phone || contact.mobile || contact.phoneNumber || 'No phone';
                const isAlreadyAdded = parties.some(p => p.phone === contact.phone);

                return (
                  <div key={contact._id || contact.id} className="browse-contact-item">
                    <div className="browse-contact-avatar" style={{ backgroundColor: getAvatarColor(displayName) }}>
                      {getUserInitials(displayName)}
                    </div>
                    <div className="browse-contact-info">
                      <div className="browse-contact-name">{displayName}</div>
                      <div className="browse-contact-details">
                        <span className="phone-detail">
                          <FontAwesomeIcon icon={faPhone} className="me-1" />
                          {displayPhone}
                        </span>
                        {contact.email && (
                          <span className="email-detail">
                            <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                            {contact.email}
                          </span>
                        )}
                      </div>
                      <div className="browse-contact-meta">
                        <Badge 
                          bg={
                            contact.source === 'customer' ? 'primary' :
                            contact.source === 'vendor' ? 'success' :
                            contact.source === 'endCustomer' ? 'info' :
                            'secondary'
                          }
                          className="me-2"
                        >
                          {contact.source === 'customer' ? '👤 Customer' :
                           contact.source === 'vendor' ? '🏢 Vendor' :
                           contact.source === 'endCustomer' ? '👥 End Customer' :
                           'Contact'}
                        </Badge>
                        {contact.company && (
                          <small className="text-muted">
                            <FontAwesomeIcon icon={faBuilding} className="me-1" />
                            {contact.company}
                          </small>
                        )}
                      </div>
                    </div>
                    <div className="browse-contact-actions">
                      {isAlreadyAdded ? (
                        <Badge bg="success">
                          <FontAwesomeIcon icon={faCheck} className="me-1" />
                          Added
                        </Badge>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => addContactToChat(contact)}
                          title="Add to chat list"
                        >
                          <FontAwesomeIcon icon={faPlus} className="me-1" />
                          Add to Chat
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );

    return createPortal(browseContactsContent, document.body);
  };

  // ✅ NEW: Render Positioned Popup for maintenance messages
  const renderPositionedPopup = () => {
    if (!showMaintenanceModal || !maintenancePosition) {
      return null;
    }

    const popupContent = (
      <div 
        className="positioned-popup"
        style={{
          position: 'fixed',
          left: `${maintenancePosition.x}px`,
          top: `${maintenancePosition.y}px`,
          transform: 'translateX(-50%)',
          zIndex: 2147483647
        }}
      >
        <div className="positioned-popup-content">
          <div className="positioned-popup-arrow"></div>
          <div className="positioned-popup-message">
            <FontAwesomeIcon icon={faExclamationTriangle} className="popup-icon" />
            <span>{maintenanceMessage}</span>
          </div>
          <button 
            className="positioned-popup-close"
            onClick={() => {
              setShowMaintenanceModal(false);
              setMaintenancePosition(null);
            }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>
    );

    return createPortal(popupContent, document.body);
  };

  if (loading) {
    return (
      <div className="whatsapp-container">
        <div className="whatsapp-main-header">
          <div className="header-content">
            <div className="app-title">
              <FontAwesomeIcon icon={faComments} className="app-icon" />
              <span>Chats</span>
            </div>
          </div>
        </div>
        <div className="text-center py-4">
          <Spinner animation="border" />
          <div className="mt-2">Loading contacts...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="whatsapp-container">
        {/* Header */}
        <div className="whatsapp-main-header">
          <div className="header-content">
            <div className="app-title">
              <FontAwesomeIcon icon={faComments} className="app-icon" />
              <span>Chats</span>
            </div>
            <div className="header-actions">
              <button 
                className="header-btn" 
                onClick={handleBulkWhatsApp}
                title="Send WhatsApp to all contacts"
              >
                <FontAwesomeIcon icon={faWhatsapp} />
              </button>
              <button 
                className="header-btn add-contact-btn" 
                onClick={handleAddNewParty}
                title="Browse and add contacts (Customers, Vendors, End Customers)"
              >
                <FontAwesomeIcon icon={faUserPlus} />
                {(filterCounts.customers + filterCounts.vendors + filterCounts.endCustomers > 0) && (
                  <span className="add-contact-badge">
                    {filterCounts.customers + filterCounts.vendors + filterCounts.endCustomers}
                  </span>
                )}
              </button>
              <button 
                className="header-btn"
                onClick={fetchParties}
                title="Refresh"
              >
                <FontAwesomeIcon icon={faSync} />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="whatsapp-search">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search contacts..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeSection === "all" ? "active" : ""}`}
            onClick={() => handleSectionChange("all")}
          >
            All ({allParties.length})
          </button>
          <button 
            className={`filter-tab ${activeSection === "linked" ? "active" : ""}`}
            onClick={() => handleSectionChange("linked")}
          >
            Chat Enabled ({linkedParties.length})
          </button>
        </div>

        {/* Chat List */}
        <div className="whatsapp-chat-list">
          {error && (
            <Alert variant="warning" className="m-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              {error}
              <Button 
                variant="link" 
                size="sm" 
                onClick={fetchParties}
                className="ms-2"
              >
                Retry
              </Button>
            </Alert>
          )}
          
          {filteredParties.length === 0 ? (
            <div className="text-center py-4 text-muted">
              {searchQuery ? (
                <>
                  <FontAwesomeIcon icon={faSearch} className="mb-2" size="2x" />
                  <div>No contacts found matching "{searchQuery}"</div>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUsers} className="mb-2" size="2x" />
                  <div>No contacts available</div>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="mt-2"
                    onClick={handleAddNewParty}
                  >
                    Add New Contact
                  </Button>
                </>
              )}
            </div>
          ) : (
            renderContactListWithAds()
          )}
        </div>
      </div>

      {/* Chat Popup */}
      {renderChatPopup()}

      {/* Profile Modal */}
      {renderProfileModal()}

      {/* Quick Add Modal */}
      {renderQuickAddModal()}

      {/* Positioned Popup */}
      {renderPositionedPopup()}

      {/* Maintenance Modal - Fallback when position not available */}
      {showMaintenanceModal && !maintenancePosition && (
        <div className="maintenance-modal-overlay" onClick={() => setShowMaintenanceModal(false)}>
          <div className="maintenance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="maintenance-modal-content">
              <div className="maintenance-icon">
                <FontAwesomeIcon icon={faCog} spin />
              </div>
              <h3>Service Under Maintenance</h3>
              <p>{maintenanceMessage}</p>
              <p className="maintenance-description">
                We're currently upgrading our calling services to provide you with better quality calls. 
                This feature will be available soon.
              </p>
              <button 
                className="maintenance-ok-btn"
                onClick={() => setShowMaintenanceModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Contact Modal */}
      {showAddPartyModal && (
        <div className="profile-modal-overlay" onClick={() => setShowAddPartyModal(false)}>
          <div className="quick-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quick-add-header">
              <h3>Quick Add Contact</h3>
              <button 
                className="profile-close-btn"
                onClick={() => setShowAddPartyModal(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="quick-add-content">
              <div className="quick-add-form">
                {/* Show validation errors */}
                {quickAddValidation.nameError && (
                  <div className="alert alert-danger">
                    {quickAddValidation.nameError}
                  </div>
                )}
                {quickAddValidation.phoneError && (
                  <div className="alert alert-danger">
                    {quickAddValidation.phoneError}
                  </div>
                )}
                {quickAddValidation.userExists && (
                  <div className="alert alert-warning">
                    Contact already exists: {quickAddValidation.existingUser?.name || 'Unknown'}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Contact Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className={`form-control ${quickAddValidation.nameError ? 'is-invalid' : ''}`}
                    placeholder="Enter contact name"
                    value={quickAddForm.name}
                    onChange={(e) => handleQuickAddInputChange('name', e.target.value)}
                    disabled={isSubmittingQuickAdd}
                  />
                </div>
                
                <div className="form-group">
                  <label>Business Name</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Enter business name (optional)"
                    value={quickAddForm.shopName}
                    onChange={(e) => handleQuickAddInputChange('shopName', e.target.value)}
                    disabled={isSubmittingQuickAdd}
                  />
                </div>
                
                <div className="form-group">
                  <label>Phone Number <span className="required">*</span></label>
                  <input 
                    type="tel" 
                    className={`form-control ${quickAddValidation.phoneError ? 'is-invalid' : ''}`}
                    placeholder="Enter phone number"
                    value={quickAddForm.phone}
                    onChange={(e) => handleQuickAddInputChange('phone', e.target.value)}
                    disabled={isSubmittingQuickAdd}
                  />
                </div>
                
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="form-control"
                    placeholder="Enter email address (optional)"
                    value={quickAddForm.email}
                    onChange={(e) => handleQuickAddInputChange('email', e.target.value)}
                    disabled={isSubmittingQuickAdd}
                  />
                </div>
                
                <div className="form-group">
                  <label>Contact Type <span className="required">*</span></label>
                  <select 
                    className="form-control"
                    value={quickAddForm.partyType}
                    onChange={(e) => handleQuickAddInputChange('partyType', e.target.value)}
                    disabled={isSubmittingQuickAdd}
                  >
                    <option value="">Select contact type</option>
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Address</label>
                  <textarea 
                    className="form-control"
                    placeholder="Enter address (optional)"
                    rows="3"
                    value={quickAddForm.address}
                    onChange={(e) => handleQuickAddInputChange('address', e.target.value)}
                    disabled={isSubmittingQuickAdd}
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label>Notes</label>
                  <textarea 
                    className="form-control"
                    placeholder="Add any notes about this contact (optional)"
                    rows="3"
                    value={quickAddForm.notes}
                    onChange={(e) => handleQuickAddInputChange('notes', e.target.value)}
                    disabled={isSubmittingQuickAdd}
                  ></textarea>
                </div>
                
                <div className="quick-add-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleQuickAddSubmit}
                    disabled={isSubmittingQuickAdd || !quickAddForm.name.trim() || !quickAddForm.phone.trim()}
                  >
                    {isSubmittingQuickAdd ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Add Contact
                      </>
                    )}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowAddPartyModal(false)}
                    disabled={isSubmittingQuickAdd}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          bg={toastType === "success" ? "success" : "danger"}
          delay={3000}
          autohide
        >
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* ✅ ENHANCED: Full-Window WhatsApp Modal with Animations - Using createPortal for whole page coverage */}
      {showWhatsAppModal && createPortal(
        <div className={`whatsapp-full-modal ${whatsappModalAnimating ? 'animating' : ''}`}>
          <div 
            className="whatsapp-modal-overlay" 
            onClick={(e) => {
              // Only close if clicking directly on overlay, not on modal content
              if (e.target === e.currentTarget) {
                handleWhatsAppModalClose(e);
              }
            }}
          >
            <div className="whatsapp-modal-container" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="whatsapp-modal-header">
                <div className="header-content">
                  <div className="header-left">
                    <FontAwesomeIcon icon={faWhatsapp} className="whatsapp-icon" />
                    <div className="header-text">
                      <h2>WhatsApp Messaging</h2>
                      <p>Send professional messages to your contacts</p>
                    </div>
                  </div>
                  <button 
                    className="close-modal-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWhatsAppModalClose();
                    }}
                    disabled={whatsappSending}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="whatsapp-modal-content">
                {/* Mode Selection */}
                <div className="message-mode-section">
                  <h3>Choose Messaging Mode</h3>
                  <div className="mode-options">
                    <div 
                      className={`mode-option ${whatsappMessageMode === 'single' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessageModeChange('single');
                      }}
                    >
                      <div className="mode-icon">
                        <FontAwesomeIcon icon={faUser} />
                      </div>
                      <div className="mode-info">
                        <h4>Single Contact</h4>
                        <p>Send personalized message to one contact</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`mode-option ${whatsappMessageMode === 'bulk' ? 'active' : ''}`}
                      onClick={() => handleMessageModeChange('bulk')}
                    >
                      <div className="mode-icon">
                        <FontAwesomeIcon icon={faUsers} />
                      </div>
                      <div className="mode-info">
                        <h4>Bulk Selection</h4>
                        <p>Choose specific contacts from your list</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`mode-option ${whatsappMessageMode === 'all' ? 'active' : ''}`}
                      onClick={() => handleMessageModeChange('all')}
                    >
                      <div className="mode-icon">
                        <FontAwesomeIcon icon={faRocket} />
                      </div>
                      <div className="mode-info">
                        <h4>Send to All</h4>
                        <p>Automatically send to all valid contacts</p>
                      </div>
                    </div>
                    
                    <div 
                      className={`mode-option ${whatsappMessageMode === 'big-size' ? 'active' : ''}`}
                      onClick={() => handleMessageModeChange('big-size')}
                    >
                      <div className="mode-icon">
                        <FontAwesomeIcon icon={faClipboardList} />
                      </div>
                      <div className="mode-info">
                        <h4>Big Size</h4>
                        <p>Send to a specific number of contacts</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single Contact Selection */}
                {whatsappMessageMode === 'single' && (
                  <div className="single-contact-section">
                    <h3>Select Contact</h3>
                    <div className="contacts-grid">
                      {parties.filter(party => {
                        const phoneNumber = party.phoneNumber || party.phone || party.mobile || party.contactNumber;
                        return phoneNumber && isValidWhatsAppNumber(phoneNumber);
                      }).map(contact => (
                        <div 
                          key={contact._id || contact.id}
                          className={`contact-card ${selectedSingleContact?._id === contact._id ? 'selected' : ''}`}
                          onClick={() => handleSingleContactSelect(contact)}
                        >
                          <div className="contact-avatar">
                            <div 
                              className="avatar-circle"
                              style={{ backgroundColor: getAvatarColor(contact.name || contact.businessName) }}
                            >
                              {getUserInitials(contact.name || contact.businessName)}
                            </div>
                          </div>
                          <div className="contact-info">
                            <h5>{contact.name || contact.businessName}</h5>
                            <p>{contact.phoneNumber || contact.phone || contact.mobile || contact.contactNumber}</p>
                            {(contact.shopName || contact.companyName) && (
                              <small className="contact-shop-info">🏪 {contact.shopName || contact.companyName}</small>
                            )}
                          </div>
                          {selectedSingleContact?._id === contact._id && (
                            <div className="selected-indicator">
                              <FontAwesomeIcon icon={faCheckCircle} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bulk Contact Selection */}
                {whatsappMessageMode === 'bulk' && (
                  <div className="bulk-contact-section">
                    <h3>Select Contacts ({selectedContactsForWhatsApp.length} selected)</h3>
                    <div className="bulk-controls">
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => {
                          const validContacts = parties.filter(party => {
                            const phoneNumber = party.phoneNumber || party.phone || party.mobile || party.contactNumber;
                            return phoneNumber && isValidWhatsAppNumber(phoneNumber);
                          });
                          setSelectedContactsForWhatsApp(validContacts);
                        }}
                      >
                        Select All
                      </button>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setSelectedContactsForWhatsApp([])}
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="contacts-grid">
                      {parties.filter(party => {
                        const phoneNumber = party.phoneNumber || party.phone || party.mobile || party.contactNumber;
                        return phoneNumber && isValidWhatsAppNumber(phoneNumber);
                      }).map(contact => {
                        const isSelected = selectedContactsForWhatsApp.some(c => (c._id || c.id) === (contact._id || contact.id));
                        return (
                          <div 
                            key={contact._id || contact.id}
                            className={`contact-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleContactToggle(contact)}
                          >
                            <div className="contact-avatar">
                              <div 
                                className="avatar-circle"
                                style={{ backgroundColor: getAvatarColor(contact.name || contact.businessName) }}
                              >
                                {getUserInitials(contact.name || contact.businessName)}
                              </div>
                            </div>
                            <div className="contact-info">
                              <h5>{contact.name || contact.businessName}</h5>
                              <p>{contact.phoneNumber || contact.phone || contact.mobile || contact.contactNumber}</p>
                              {(contact.shopName || contact.companyName) && (
                                <small className="contact-shop-info">🏪 {contact.shopName || contact.companyName}</small>
                              )}
                            </div>
                            {isSelected && (
                              <div className="selected-indicator">
                                <FontAwesomeIcon icon={faCheckCircle} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Send to All Summary */}
                {whatsappMessageMode === 'all' && (
                  <div className="all-contacts-section">
                    <h3>Send to All Contacts</h3>
                    <div className="all-summary">
                      <div className="summary-card">
                        <FontAwesomeIcon icon={faUsers} className="summary-icon" />
                        <div className="summary-info">
                          <h4>{parties.filter(party => {
                            const phoneNumber = party.phoneNumber || party.phone || party.mobile || party.contactNumber;
                            return phoneNumber && isValidWhatsAppNumber(phoneNumber);
                          }).length} Valid Contacts</h4>
                          <p>All contacts with valid WhatsApp numbers will receive the message</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Big Size Selection */}
                {whatsappMessageMode === 'big-size' && (
                  <div className="big-size-section">
                    <h3>Select Number of Contacts</h3>
                    <p className="section-description">Choose how many contacts you want to send messages to:</p>
                    
                    <div className="big-size-numbers">
                      {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(number => (
                        <button
                          key={number}
                          className={`big-size-number-btn ${selectedBigSizeNumber === number ? 'selected' : ''}`}
                          onClick={() => handleBigSizeNumberSelect(number)}
                          disabled={whatsappSending}
                        >
                          <span className="number">{number}</span>
                          <span className="label">contacts</span>
                        </button>
                      ))}
                    </div>
                    
                    {selectedBigSizeNumber && (
                      <div className="big-size-summary">
                        <div className="summary-card">
                          <FontAwesomeIcon icon={faClipboardList} className="summary-icon" />
                          <div className="summary-info">
                            <h4>Selected: {selectedBigSizeNumber} Contacts</h4>
                            <p>
                              {bigSizeContactsToSend.length > 0 
                                ? `${bigSizeContactsToSend.length} contacts will receive the message`
                                : `First ${selectedBigSizeNumber} contacts with valid WhatsApp numbers will be selected`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Customization */}
                <div className="message-customization">
                  <h3>Message Options</h3>
                  <div className="message-options">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="useCustomMessage"
                        checked={useCustomMessage}
                        onChange={(e) => setUseCustomMessage(e.target.checked)}
                        disabled={whatsappSending}
                      />
                      <label className="form-check-label" htmlFor="useCustomMessage">
                        Use custom message
                      </label>
                    </div>
                    
                    {useCustomMessage && (
                      <div className="custom-message-input">
                        <textarea
                          className="form-control"
                          rows="4"
                          placeholder="Enter your custom message here..."
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          disabled={whatsappSending}
                        />
                        <small className="text-muted">
                          If empty, default B2B Billings introduction message will be used
                        </small>
                      </div>
                    )}
                    
                    {whatsappMessageMode !== 'single' && (
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="bulkMessageMode"
                          checked={bulkMessageMode}
                          onChange={(e) => setBulkMessageMode(e.target.checked)}
                          disabled={whatsappSending}
                        />
                        <label className="form-check-label" htmlFor="bulkMessageMode">
                          Use bulk announcement format (general message style)
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Section */}
                {whatsappSending && (
                  <div className="progress-section">
                    <h3>Sending Messages</h3>
                    <div className="progress-container">
                      <div className="progress">
                        <div 
                          className="progress-bar bg-success" 
                          style={{
                            width: `${(whatsappProgress.current / whatsappProgress.total) * 100}%`
                          }}
                        ></div>
                      </div>
                      <p className="progress-text">
                        Sending message {whatsappProgress.current} of {whatsappProgress.total}...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="whatsapp-modal-footer">
                <div className="footer-info">
                  <FontAwesomeIcon icon={faInfo} className="info-icon" />
                  <span>WhatsApp will open in new tabs for each contact</span>
                </div>
                <div className="footer-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={handleWhatsAppModalClose}
                    disabled={whatsappSending}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleSendBulkWhatsApp}
                    disabled={whatsappSending || 
                      (whatsappMessageMode === 'single' && !selectedSingleContact) ||
                      (whatsappMessageMode === 'bulk' && selectedContactsForWhatsApp.length === 0) ||
                      (whatsappMessageMode === 'big-size' && (!selectedBigSizeNumber || bigSizeContactsToSend.length === 0))
                    }
                  >
                    {whatsappSending ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faWhatsapp} className="me-2" />
                        Send Messages
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* ✅ NEW: Browse Contacts Modal */}
      {renderBrowseContactsModal()}
    </>
  );
}

export default TeamChats;
