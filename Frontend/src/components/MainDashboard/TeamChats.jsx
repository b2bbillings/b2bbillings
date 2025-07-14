import React, {useState, useEffect, useRef, Fragment} from "react";

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
  faRocket, // ✅ Add this import
} from "@fortawesome/free-solid-svg-icons";

// Import services
import partyService from "../../services/partyService";
import chatService from "../../services/chatService";
import AddNewParty from "../Home/Party/AddNewParty"; // ✅ Add this import

const styles = `
/* Team Chats Styles */
.team-chats {
  width: 100%;
  height: 100%;
}

.chat-section {
  border: none;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 160px);
  margin-top: 1rem;
}

/* Dashboard layout override */
.dashboard-layout .team-chats .chat-section {
  margin-top: 0;
  height: 100%;
}

/* Single view layout */
.single-view .team-chats .chat-section {
  margin-top: 1rem;
}

/* Chat Header */
.chat-header {
  padding: 1.2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  flex-shrink: 0;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.chat-title {
  font-size: 1.2rem;
  color: white;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chat-title::before {
  content: '💬';
  font-size: 1.1rem;
}

.members-count {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Section Toggle - REDESIGNED WITH FULL WIDTH ADD BUTTON */
.section-toggle-container {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: 100px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: visible;
  flex-shrink: 0;
}

/* Add Party Button - Full Width */
.section-toggle-container .add-party-button {
  width: 100%;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  height: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  white-space: nowrap;
  border: none;
  text-decoration: none;
  box-sizing: border-box;
  position: relative;
  overflow: visible;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

.section-toggle-container .add-party-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  text-decoration: none;
}

.section-toggle-container .add-party-button:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

/* Filter Buttons Container */
.section-toggle-container .filter-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
}

/* Filter buttons */
.section-toggle-container .filter-buttons .btn {
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  height: 42px;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  white-space: nowrap;
  border: 2px solid transparent;
  line-height: 1.2;
  text-decoration: none;
  box-sizing: border-box;
  position: relative;
  overflow: visible;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  flex: 1;
  max-width: 200px;
}

.section-toggle-container .filter-buttons .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  text-decoration: none;
}

.section-toggle-container .filter-buttons .btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border-color: #2563eb;
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.section-toggle-container .filter-buttons .btn-primary:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%);
  border-color: #1d4ed8;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}

.section-toggle-container .filter-buttons .btn-outline-primary {
  border-color: #cbd5e1;
  color: #64748b;
  background-color: white;
}

.section-toggle-container .filter-buttons .btn-outline-primary:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #94a3b8;
  color: #475569;
}

/* Icon styling */
.section-toggle-container .btn svg {
  font-size: 0.875rem;
  margin-right: 0.375rem;
}

/* Search */
.search-chat {
  padding: 0.8rem 1.2rem;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
  flex-shrink: 0;
}

.search-chat .input-group-text {
  background-color: #ffffff;
  border-color: #cbd5e1;
  color: #64748b;
}

.search-chat .form-control {
  border-color: #cbd5e1;
  font-size: 0.95rem;
  background-color: #ffffff;
}

.search-chat .form-control:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
}

/* Chat List */
.chat-list {
  flex: 1;
  overflow-y: auto;
  background-color: #ffffff;
  min-height: 0;
}

.chat-item {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.chat-item:hover {
  background-color: #f8fafc;
  transform: translateX(2px);
}

.chat-item:last-child {
  border-bottom: none;
}

.chat-avatar-container {
  position: relative;
  flex-shrink: 0;
}

.chat-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1.1rem;
  position: relative;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background-color: #10b981;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.3);
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-info-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}

.chat-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.linked-indicator {
  color: #10b981;
  opacity: 0.8;
}

.chat-time {
  font-size: 0.8rem;
  color: #64748b;
  white-space: nowrap;
  font-weight: 500;
}

.chat-preview {
  font-size: 0.9rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  overflow: hidden;
}

.chat-preview .company-name {
  font-weight: 500;
  color: #2563eb;
  white-space: nowrap;
}

.chat-preview .party-type {
  color: #6b7280;
  font-size: 0.8rem;
  text-transform: capitalize;
}

.unread-badge {
  position: absolute;
  top: 0.75rem;
  right: 1rem;
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  min-width: 18px;
  text-align: center;
}

/* No Chats */
.no-chats {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.no-chats-content {
  text-align: center;
}

/* Error State */
.error-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.error-content {
  text-align: center;
  color: #ef4444;
}

/* Chat Popup with proper z-index hierarchy */
.chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.chat-popup {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  height: 100vh;
  background-color: white;
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15);
  z-index: 2001;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Popup Header with highest z-index */
.popup-header {
  padding: 1rem 1.2rem;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2002;
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.2);
  min-height: 72px;
}

.popup-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.popup-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.popup-user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.popup-user-name {
  font-weight: 600;
  font-size: 1rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-user-status {
  font-size: 0.8rem;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  flex-wrap: wrap;
}

.online-dot {
  color: #10b981;
  font-size: 0.6rem;
  filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.5));
}

.popup-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.popup-action-btn,
.popup-close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-action-btn:hover,
.popup-close-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  transform: scale(1.05);
}

/* Messages */
.popup-body {
  flex: 1;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  min-height: 0;
}

.messages-container {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.message-bubble {
  max-width: 85%;
  padding: 0.75rem 1rem;
  border-radius: 18px;
  font-size: 0.9rem;
  line-height: 1.4;
  position: relative;
  word-wrap: break-word;
  animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-sent {
  align-self: flex-end;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border-bottom-right-radius: 6px;
}

.message-received {
  align-self: flex-start;
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.message-status {
  font-size: 0.7rem;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 18px;
  border-bottom-left-radius: 6px;
  max-width: 75%;
  align-self: flex-start;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.typing-dots {
  display: flex;
  gap: 0.25rem;
}

.typing-dot {
  width: 6px;
  height: 6px;
  background-color: #9ca3af;
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typingBounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.no-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

/* Message Input */
.popup-footer {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  background-color: white;
  position: relative;
  z-index: 2001;
  flex-shrink: 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.popup-footer .d-flex.gap-1 {
  margin-bottom: 0.75rem;
}

.popup-footer .btn[style*="font-size: 10px"] {
  font-size: 10px;
  padding: 0.375rem 0.75rem;
  border-radius: 15px;
  font-weight: 500;
}

.popup-footer .input-group {
  position: relative;
}

.popup-footer .form-control {
  border-radius: 20px;
  border-color: #cbd5e1;
  padding: 0.75rem 1rem;
  background-color: #f8fafc;
  transition: all 0.2s ease;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  font-size: 13px;
}

.popup-footer .form-control:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
  background-color: white;
}

.popup-footer .input-group .btn {
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: none;
  margin-left: 0.5rem;
}

.popup-footer .input-group .btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.popup-footer .input-group .btn:disabled {
  opacity: 0.5;
  transform: none;
  background: #9ca3af;
}

.popup-footer .d-flex.justify-content-between {
  margin-top: 0.5rem;
}

.popup-footer .d-flex.justify-content-between small {
  font-size: 10px;
}

/* Templates dropdown */
.popup-footer .p-2.border.rounded.bg-light {
  max-height: 150px;
  overflow-y: auto;
  border-radius: 12px;
  border-color: #cbd5e1;
}

/* Loading state */
.chat-item.loading {
  opacity: 0.6;
  pointer-events: none;
}

.chat-item.loading .chat-avatar {
  background-color: #e2e8f0;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsive Design */
@media (max-width: 992px) {
  .section-toggle-container {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    min-height: 120px;
  }
  
  .section-toggle-container .filter-buttons {
    justify-content: center;
    width: 100%;
  }
  
  .section-toggle-container .filter-buttons .btn {
    flex: 1;
    max-width: 160px;
  }
}

@media (max-width: 768px) {
  .chat-popup {
    width: 100%;
    right: 0;
  }
  
  .popup-header {
    padding-top: 4rem;
    z-index: 2002;
  }
  
  .chat-section {
    height: calc(100vh - 180px);
    max-height: 500px;
    margin-top: 0.5rem;
  }
  
  .section-toggle-container {
    min-height: 140px;
  }
  
  .section-toggle-container .filter-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .section-toggle-container .filter-buttons .btn {
    width: 100%;
    max-width: none;
  }
}

@media (max-width: 576px) {
  .section-toggle-container {
    padding: 1rem;
  }
}

/* Custom scrollbar */
.chat-list::-webkit-scrollbar,
.popup-body::-webkit-scrollbar,
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.chat-list::-webkit-scrollbar-track,
.popup-body::-webkit-scrollbar-track,
.messages-container::-webkit-scrollbar-track {
  background-color: #f1f5f9;
  border-radius: 3px;
}

.chat-list::-webkit-scrollbar-thumb,
.popup-body::-webkit-scrollbar-thumb,
.messages-container::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.chat-list::-webkit-scrollbar-thumb:hover,
.popup-body::-webkit-scrollbar-thumb:hover,
.messages-container::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
`;

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

  // Party management states - UPDATED
  const [parties, setParties] = useState([]); // Current view parties
  const [allParties, setAllParties] = useState([]); // All parties
  const [linkedParties, setLinkedParties] = useState([]); // Only linked parties
  const [activeSection, setActiveSection] = useState("linked"); // 'linked' or 'all'

  // Chat functionality states
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [messageType, setMessageType] = useState("whatsapp");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [conversationSummary, setConversationSummary] = useState(null);

  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Pagination and message loading states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Connection and user states
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatParticipants, setChatParticipants] = useState([]);

  // Company mapping states
  const [targetCompanyId, setTargetCompanyId] = useState(null);
  const [mappingValidated, setMappingValidated] = useState(false);

  // Add Party Modal states
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState("customer");

  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Inject styles into the document
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // Add this useEffect after your existing useEffects (around line 200):
  useEffect(() => {
    console.log("🔍 AddNewParty modal state changed:", {
      showAddPartyModal,
      isQuickAdd,
      quickAddType,
    });
  }, [showAddPartyModal, isQuickAdd, quickAddType]);
  // Initialize company context
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

  // Validate party mapping when selected
  useEffect(() => {
    if (selectedParty) {
      validatePartyCompanyMapping();
    }
  }, [selectedParty?._id]);

  // Initialize chat when conditions are met
  useEffect(() => {
    if (chatPopupOpen && selectedParty && currentCompany && mappingValidated) {
      initializeChat();
    }

    return () => {
      if (chatPopupOpen) {
        cleanup();
      }
    };
  }, [
    chatPopupOpen,
    selectedParty?._id,
    currentCompany?._id,
    mappingValidated,
  ]);

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

        // Fetch all parties
        const allPartiesResponse = await partyService.getParties({
          page: 1,
          limit: 100,
          search: "",
        });

        if (allPartiesResponse.success && allPartiesResponse.data?.parties) {
          const allPartiesData = allPartiesResponse.data.parties;
          setAllParties(allPartiesData);

          // Filter linked parties (those with chat capabilities)
          const linkedPartiesData = allPartiesData.filter(
            (party) => party.canChat && party.chatCompanyId
          );
          setLinkedParties(linkedPartiesData);

          // Set default parties based on active section
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

  const validatePartyCompanyMapping = () => {
    try {
      if (!selectedParty) {
        setMappingValidated(false);
        setTargetCompanyId(null);
        return;
      }

      const extractedCompanyId =
        chatService.extractTargetCompanyId(selectedParty);

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
      setIsLoadingMessages(true);
      setError(null);

      const socket = chatService.initializeSocket();
      if (socket) {
        setIsConnected(true);
        setupSocketListeners();
      }

      await loadChatHistory();
      await loadConversationSummary();
      await loadTemplates();

      if (selectedParty) {
        try {
          const joinResult = await chatService.joinChat(selectedParty);
        } catch (joinError) {
          showToastMessage("Failed to join chat room", "error");
        }
      }

      await loadChatParticipants();
    } catch (error) {
      setError("Failed to initialize chat. Please try again.");
      showToastMessage("Failed to initialize chat", "error");
    } finally {
      setIsLoadingMessages(false);
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
    if (!selectedParty || !mappingValidated) return;

    try {
      const response = await chatService.getChatHistory(selectedParty, {
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

  const loadTemplates = async () => {
    if (!selectedParty || !mappingValidated) return;

    try {
      setIsLoadingTemplates(true);

      if (typeof chatService.getMessageTemplates === "function") {
        const response = await chatService.getMessageTemplates(selectedParty);
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
    if (!selectedParty || !mappingValidated) return;

    try {
      if (typeof chatService.getChatParticipants === "function") {
        const response = await chatService.getChatParticipants(selectedParty);
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

  const cleanup = () => {
    try {
      if (isConnected && selectedParty && mappingValidated) {
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
    if (!newMessage.trim() || isSending || !selectedParty || !mappingValidated)
      return;

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
        selectedParty,
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

  const handleTypingStart = () => {
    try {
      if (isConnected && selectedParty && mappingValidated) {
        if (typeof chatService.startTyping === "function") {
          chatService.startTyping(selectedParty);
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleTypingStop = () => {
    try {
      if (isConnected && selectedParty && mappingValidated) {
        if (typeof chatService.stopTyping === "function") {
          chatService.stopTyping(selectedParty);
        }
      }
    } catch (error) {
      // Silent fail
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
    if (!hasMoreMessages || isLoadingMessages) return;

    setIsLoadingMessages(true);
    await loadChatHistory(currentPage + 1, true);
    setIsLoadingMessages(false);
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
              key={`${category}-${templateKey}`}
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
              <div className="typing-dots">
                <div key="typing-dot-1" className="typing-dot"></div>
                <div key="typing-dot-2" className="typing-dot"></div>
                <div key="typing-dot-3" className="typing-dot"></div>
              </div>
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

  const handleAddParty = (quickAdd = true, type = "customer") => {
    console.log("🚀 handleAddParty called with:", {quickAdd, type});

    setIsQuickAdd(quickAdd);
    setQuickAddType(type);
    setShowAddPartyModal(true);

    console.log("✅ Modal should open now");
  };

  // Update the handleSaveParty function to refresh both lists
  const handleSaveParty = async (
    newParty,
    isQuickAdd = false,
    isUpdate = false
  ) => {
    try {
      console.log("✅ Party saved:", newParty);

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

      // Refresh the parties list to get updated data after a short delay
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

            // Update current view
            setParties(
              activeSection === "linked" ? linkedPartiesData : allPartiesData
            );
          }
        } catch (error) {
          console.warn("Failed to refresh parties list:", error);
        }
      }, 1000);
    } catch (error) {
      console.error("❌ Error handling saved party:", error);
      showToastMessage(
        `Failed to ${isUpdate ? "update" : "add"} party. Please try again.`,
        "error"
      );
    }
  };

  const filteredParties = parties.filter(
    (party) =>
      party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.chatCompanyName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      party.phoneNumber?.includes(searchQuery)
  );

  // Update total linked companies calculation
  const totalLinkedCompanies = new Set(
    linkedParties.map((party) => party.chatCompanyId).filter(Boolean)
  ).size;

  const totalAllParties = allParties.length;

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
  };

  const closeChatPopup = () => {
    setChatPopupOpen(false);
    setSelectedParty(null);
    setMessages([]);
    setNewMessage("");
    setIsTyping(false);
    setError(null);
    setMappingValidated(false);
    setTargetCompanyId(null);
    cleanup();
  };

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

          {/* Section Toggle - REDESIGNED */}
          <div className="section-toggle-container">
            <div className="button-group">
              <Button
                variant={
                  activeSection === "linked" ? "primary" : "outline-primary"
                }
                size="sm"
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
                size="sm"
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

            <Button
              variant="success"
              size="sm"
              onClick={() => {
                console.log("🚀 Add Party button clicked");
                setIsQuickAdd(true);
                setQuickAddType("customer");
                setShowAddPartyModal(true);
              }}
            >
              <FontAwesomeIcon icon={faUser} />
              Add Party
            </Button>
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
                <div key={index} className="chat-item loading">
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
              filteredParties.map((party) => (
                <div
                  key={party.id}
                  className={`chat-item ${
                    !party.canChat || !party.chatCompanyId ? "opacity-75" : ""
                  }`}
                  onClick={() => handlePartyClick(party)}
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

                  <div className="chat-info">
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
                        onClick={() => {
                          setIsQuickAdd(true);
                          setQuickAddType("customer");
                          setShowAddPartyModal(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faRocket} className="me-1" />
                        Quick Add Customer
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          setIsQuickAdd(true);
                          setQuickAddType("supplier");
                          setShowAddPartyModal(true);
                        }}
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

      {/* Chat Popup */}
      {chatPopupOpen && selectedParty && (
        <>
          <div className="chat-overlay" onClick={closeChatPopup}></div>
          <div className="chat-popup">
            {/* Popup Header */}
            <div className="popup-header">
              <div className="popup-header-left">
                <div
                  className="popup-avatar"
                  style={{backgroundColor: getAvatarColor(selectedParty.name)}}
                >
                  {generateInitials(selectedParty.name)}
                </div>
                <div className="popup-user-info">
                  <div className="popup-user-name">{selectedParty.name}</div>
                  <div className="popup-user-status">
                    <FontAwesomeIcon icon={faBuilding} className="online-dot" />
                    {selectedParty.chatCompanyName}
                    <span className="ms-2">
                      • {formatPartyType(selectedParty.partyType)}
                    </span>
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
                  </div>
                </div>
              </div>
              <div className="popup-actions">
                <Dropdown align="end" className="me-2">
                  <Dropdown.Toggle
                    variant="link"
                    className="popup-action-btn border-0"
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
                    <Dropdown.Item
                      onClick={() => validatePartyCompanyMapping()}
                    >
                      <FontAwesomeIcon icon={faLink} className="me-2" />
                      Validate Company Mapping
                    </Dropdown.Item>
                    <Dropdown.Item>
                      <FontAwesomeIcon
                        icon={faFileInvoiceDollar}
                        className="me-2"
                      />
                      Send Statement
                    </Dropdown.Item>
                    <Dropdown.Item>
                      <FontAwesomeIcon
                        icon={faMoneyBillWave}
                        className="me-2"
                      />
                      Payment Link
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <Button
                  variant="link"
                  className="popup-action-btn"
                  title="Voice Call"
                  onClick={() =>
                    showToastMessage(
                      `Voice call feature coming soon for ${selectedParty.name}`,
                      "info"
                    )
                  }
                >
                  <FontAwesomeIcon icon={faPhone} />
                </Button>
                <Button
                  variant="link"
                  className="popup-action-btn"
                  title="Video Call"
                  onClick={() =>
                    showToastMessage(
                      `Video call feature coming soon for ${selectedParty.name}`,
                      "info"
                    )
                  }
                >
                  <FontAwesomeIcon icon={faVideo} />
                </Button>
                <Button
                  variant="link"
                  className="popup-close-btn"
                  onClick={closeChatPopup}
                  title="Close Chat"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </Button>
              </div>
            </div>

            {renderMappingInfo()}

            {error && (
              <Alert variant="danger" className="m-3 mb-0">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="me-2"
                />
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

            {/* Messages */}
            <div className="popup-body">
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

                  <div
                    ref={messagesContainerRef}
                    className="messages-container"
                  >
                    {messages.length === 0 && !isLoadingMessages && (
                      <div className="no-messages">
                        <div>
                          <FontAwesomeIcon
                            icon={faComments}
                            size="3x"
                            className="mb-3 text-muted"
                          />
                          <p>No messages yet. Start a conversation!</p>
                          <small className="text-muted">
                            This is a company-to-company chat between{" "}
                            {currentCompany?.businessName} and{" "}
                            {selectedParty?.name}
                          </small>
                        </div>
                      </div>
                    )}

                    {messages.map((message, index) => {
                      const typeInfo = getMessageTypeIcon(message.messageType);
                      const showDate =
                        index === 0 ||
                        formatDate(message.timestamp) !==
                          formatDate(messages[index - 1].timestamp);

                      return (
                        <Fragment
                          key={`message-wrapper-${message.id || index}`}
                        >
                          {showDate && (
                            <div className="text-center my-3">
                              <small className="bg-light px-3 py-1 rounded-pill text-muted">
                                {formatDate(message.timestamp)}
                              </small>
                            </div>
                          )}

                          <div
                            className={`message-bubble ${
                              message.type === "sent"
                                ? "message-sent"
                                : "message-received"
                            }`}
                          >
                            <div className="d-flex align-items-center mb-1">
                              <FontAwesomeIcon
                                icon={typeInfo.icon}
                                style={{
                                  color: typeInfo.color,
                                  fontSize: "10px",
                                }}
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

                            <div className="message-time">
                              {formatTime(message.timestamp)}
                              {message.type === "sent" && (
                                <span className="message-status ms-1">
                                  {getStatusIcon(message.status)}
                                </span>
                              )}
                            </div>
                          </div>
                        </Fragment>
                      );
                    })}

                    {renderTypingIndicator()}

                    <div ref={messagesEndRef} />
                  </div>
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="popup-footer">
              {mappingValidated && (
                <>
                  <div className="d-flex gap-1 flex-wrap mb-2">
                    <Button
                      variant={
                        messageType === "whatsapp"
                          ? "success"
                          : "outline-success"
                      }
                      size="sm"
                      onClick={() => setMessageType("whatsapp")}
                      style={{fontSize: "10px"}}
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
                    >
                      <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                      Email
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setShowTemplates(!showTemplates)}
                      disabled={isLoadingTemplates}
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

                  {showTemplates && (
                    <div
                      className="p-2 border rounded bg-light mb-2"
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

                  <InputGroup>
                    <Form.Control
                      ref={messageInputRef}
                      as="textarea"
                      rows={2}
                      placeholder={`Type your ${messageType} message to ${selectedParty?.name}...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onKeyUp={handleTypingStop}
                      disabled={isSending}
                      style={{resize: "none", fontSize: "13px"}}
                    />
                    <Button
                      variant="primary"
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
                </>
              )}
            </div>
          </div>
        </>
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
    </>
  );
}

export default TeamChats;
