import React, {useState, useEffect} from "react";
import {Toast, ToastContainer, Button, Dropdown} from "react-bootstrap";
import {useParams} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faComments,
  faBuilding,
  faBell,
  faCog,
  faSignOutAlt,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

// Chat Components
import ChatSidebar from "../components/Community/Chat/ChatSidebar";
import ChatContainer from "../components/Community/Chat/ChatContainer";

// Section Components
import AllChats from "../components/Community/Sections/AllChats";
import SupplierChats from "../components/Community/Sections/SupplierChats";
import BuyerChats from "../components/Community/Sections/BuyerChats";
import EnquiryChats from "../components/Community/Sections/EnquiryChats";

// Mock data for development
const mockUser = {
  id: "user123",
  name: "John Doe",
  company: "ABC Business",
  avatar: null,
};

const mockChats = [
  {
    id: 1,
    name: "Rajesh Kumar",
    company: "Kumar Electronics",
    type: "supplier",
    isOnline: true,
    status: "online",
    lastSeen: new Date().toISOString(),
    lastMessage: "The new shipment will arrive tomorrow",
    lastMessageTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    lastMessageStatus: "read",
    unreadCount: 0,
    messages: [
      {
        id: 1,
        senderId: "rajesh",
        senderName: "Rajesh Kumar",
        content: "Hello! I have your order ready for dispatch.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        type: "text",
        status: "read",
      },
      {
        id: 2,
        senderId: "user123",
        senderName: "You",
        content: "Great! When can you ship it?",
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        type: "text",
        status: "read",
      },
      {
        id: 3,
        senderId: "rajesh",
        senderName: "Rajesh Kumar",
        content: "The new shipment will arrive tomorrow",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        type: "text",
        status: "delivered",
      },
    ],
  },
  {
    id: 2,
    name: "Priya Sharma",
    company: "Sharma Textiles",
    type: "buyer",
    isOnline: false,
    status: "away",
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lastMessage: "Can you provide bulk pricing?",
    lastMessageTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    lastMessageStatus: "sent",
    unreadCount: 2,
    messages: [
      {
        id: 1,
        senderId: "priya",
        senderName: "Priya Sharma",
        content: "Hi! I am interested in bulk purchase.",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        type: "text",
        status: "read",
      },
      {
        id: 2,
        senderId: "priya",
        senderName: "Priya Sharma",
        content: "Can you provide bulk pricing?",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        type: "text",
        status: "delivered",
      },
    ],
  },
  {
    id: 3,
    name: "Support Team",
    company: "Customer Support",
    type: "support",
    isOnline: true,
    status: "online",
    lastSeen: new Date().toISOString(),
    lastMessage: "How can we help you today?",
    lastMessageTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    lastMessageStatus: "read",
    unreadCount: 0,
    messages: [
      {
        id: 1,
        senderId: "support",
        senderName: "Support Team",
        content:
          "Hello! Welcome to our support chat. How can we help you today?",
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        type: "text",
        status: "read",
      },
    ],
  },
  {
    id: 4,
    name: "Amit Patel",
    company: "Patel Wholesale",
    type: "supplier",
    isOnline: false,
    status: "offline",
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lastMessage: "Thank you for your order!",
    lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lastMessageStatus: "read",
    unreadCount: 0,
    messages: [],
  },
  {
    id: 5,
    name: "Neha Gupta",
    company: "Gupta Enterprises",
    type: "buyer",
    isOnline: true,
    status: "online",
    lastSeen: new Date().toISOString(),
    lastMessage: "When will the products be available?",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lastMessageStatus: "sent",
    unreadCount: 1,
    messages: [
      {
        id: 1,
        senderId: "neha",
        senderName: "Neha Gupta",
        content: "When will the products be available?",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        type: "text",
        status: "sent",
      },
    ],
  },
];

const mockContacts = [
  {
    id: 6,
    name: "Vikram Singh",
    company: "Singh Industries",
    type: "supplier",
    email: "vikram@singhindustries.com",
    phone: "+91 98765 43210",
    location: "Mumbai, Maharashtra",
    isOnline: false,
  },
  {
    id: 7,
    name: "Kavita Joshi",
    company: "Joshi Trading Co.",
    type: "buyer",
    email: "kavita@joshitrading.com",
    phone: "+91 87654 32109",
    location: "Pune, Maharashtra",
    isOnline: true,
  },
];

function CommunityPage({
  currentUser = mockUser,
  currentCompany = null,
  companyId: propCompanyId,
  addToast,
  onLogout,
  companies = [],
  onCompanyChange,
}) {
  const {companyId: urlCompanyId} = useParams();
  const effectiveCompanyId = propCompanyId || urlCompanyId;

  // State management
  const [activeSection, setActiveSection] = useState("all");
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState(mockChats);
  const [contacts, setContacts] = useState(mockContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Filter sections configuration
  const filterSections = [
    {
      key: "all",
      label: "All Chats",
      icon: "faComments",
      color: "primary",
      count: chats.length,
    },
    {
      key: "suppliers",
      label: "Suppliers",
      icon: "faTruck",
      color: "success",
      count: chats.filter((chat) => chat.type === "supplier").length,
    },
    {
      key: "buyers",
      label: "Buyers",
      icon: "faShoppingCart",
      color: "info",
      count: chats.filter((chat) => chat.type === "buyer").length,
    },
    {
      key: "enquiries",
      label: "Enquiries",
      icon: "faQuestionCircle",
      color: "warning",
      count: chats.filter((chat) => chat.type === "enquiry").length,
    },
    {
      key: "support",
      label: "Support",
      icon: "faHeadset",
      color: "secondary",
      count: chats.filter((chat) => chat.type === "support").length,
    },
  ];

  // Load chats based on active section
  useEffect(() => {
    loadChatsForSection(activeSection);
  }, [activeSection]);

  // Toast management
  const showToast = (message, type = "info") => {
    const newToast = {
      id: Date.now(),
      message,
      type,
      show: true,
    };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(newToast.id);
    }, 3000);

    if (addToast) {
      addToast(message, type);
    }
  };

  const removeToast = (toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  // Load chats for specific section
  const loadChatsForSection = async (section) => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 300));

      let filteredChats;
      switch (section) {
        case "suppliers":
          filteredChats = mockChats.filter((chat) => chat.type === "supplier");
          break;
        case "buyers":
          filteredChats = mockChats.filter((chat) => chat.type === "buyer");
          break;
        case "enquiries":
          filteredChats = mockChats.filter((chat) => chat.type === "enquiry");
          break;
        case "support":
          filteredChats = mockChats.filter((chat) => chat.type === "support");
          break;
        default:
          filteredChats = mockChats;
      }

      setChats(filteredChats);
    } catch (error) {
      console.error("Error loading chats:", error);
      showToast("Error loading chats", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle section change
  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSelectedChat(null);
    setSearchQuery("");
  };

  // Handle chat selection
  const handleChatSelect = (chat) => {
    setSelectedChat(chat);

    if (chat.unreadCount > 0) {
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? {...c, unreadCount: 0} : c))
      );
    }
  };

  // Handle starting new chat
  const handleStartNewChat = (contact) => {
    const newChat = {
      id: Date.now(),
      name: contact.name,
      company: contact.company,
      type: contact.type,
      isOnline: contact.isOnline,
      status: contact.isOnline ? "online" : "offline",
      lastSeen: new Date().toISOString(),
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      lastMessageStatus: "sent",
      unreadCount: 0,
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setSelectedChat(newChat);
    showToast(`Started new conversation with ${contact.name}`, "success");
  };

  // Handle sending message
  const handleSendMessage = async (message) => {
    try {
      if (!selectedChat || !message.trim()) return;

      const newMessage = {
        id: Date.now(),
        senderId: currentUser?.id || "current",
        senderName: currentUser?.name || "You",
        content: message,
        timestamp: new Date().toISOString(),
        type: "text",
        status: "sent",
      };

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), newMessage],
        lastMessage: message,
        lastMessageTime: newMessage.timestamp,
        lastMessageStatus: "sent",
      }));

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                lastMessage: message,
                lastMessageTime: newMessage.timestamp,
                lastMessageStatus: "sent",
              }
            : chat
        )
      );

      setTimeout(() => {
        setSelectedChat((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === newMessage.id ? {...msg, status: "delivered"} : msg
          ),
        }));
      }, 1000);

      showToast("Message sent successfully", "success");
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("Error sending message", "error");
    }
  };

  // Filter chats based on search query
  const getFilteredChats = () => {
    if (!searchQuery.trim()) return chats;

    const searchLower = searchQuery.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.name?.toLowerCase().includes(searchLower) ||
        chat.company?.toLowerCase().includes(searchLower) ||
        chat.lastMessage?.toLowerCase().includes(searchLower)
    );
  };

  // Render section content
  const renderSectionContent = () => {
    const filteredChats = getFilteredChats();

    const commonProps = {
      chats: filteredChats,
      selectedChat,
      onChatSelect: handleChatSelect,
      onStartNewChat: handleStartNewChat,
      contacts,
      loading,
      currentUser,
      addToast: showToast,
    };

    switch (activeSection) {
      case "suppliers":
        return <SupplierChats {...commonProps} />;
      case "buyers":
        return <BuyerChats {...commonProps} />;
      case "enquiries":
        return <EnquiryChats {...commonProps} />;
      case "support":
        return <AllChats {...commonProps} />;
      default:
        return <AllChats {...commonProps} />;
    }
  };

  return (
    <div
      className="community-page"
      style={{height: "100vh", overflow: "hidden"}}
    >
      {/* Top Header */}
      <div className="bg-white border-bottom px-3 py-2 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <Button
            variant="ghost"
            size="sm"
            className="me-3 border-0 bg-transparent"
            onClick={() =>
              (window.location.href = `/companies/${effectiveCompanyId}/dashboard`)
            }
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Button>

          <h4 className="mb-0 me-4">
            <FontAwesomeIcon icon={faComments} className="me-2 text-primary" />
            Messages
          </h4>

          <div className="d-flex align-items-center text-muted">
            <FontAwesomeIcon icon={faBuilding} className="me-1" size="sm" />
            <span className="small">
              {currentCompany?.name || currentCompany?.businessName}
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="position-relative border-0 bg-transparent"
          >
            <FontAwesomeIcon icon={faBell} />
            <span
              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
              style={{fontSize: "0.6em"}}
            >
              3
            </span>
          </Button>

          <Dropdown align="end">
            <Dropdown.Toggle
              variant="ghost"
              size="sm"
              className="d-flex align-items-center border-0 bg-transparent"
            >
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                  style={{width: "32px", height: "32px", fontSize: "0.9rem"}}
                >
                  {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="d-none d-md-inline">{currentUser?.name}</span>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Header>
                <div className="fw-bold">{currentUser?.name}</div>
                <div className="small text-muted">{currentUser?.email}</div>
              </Dropdown.Header>
              <Dropdown.Divider />

              {companies && companies.length > 1 && (
                <>
                  <Dropdown.Header>Switch Company</Dropdown.Header>
                  {companies.map((company) => (
                    <Dropdown.Item
                      key={company.id || company._id}
                      active={
                        currentCompany?.id === company.id ||
                        currentCompany?._id === company._id
                      }
                      onClick={() => onCompanyChange?.(company)}
                    >
                      <FontAwesomeIcon icon={faBuilding} className="me-2" />
                      {company.businessName || company.name}
                    </Dropdown.Item>
                  ))}
                  <Dropdown.Divider />
                </>
              )}

              <Dropdown.Item
                href={`/companies/${effectiveCompanyId}/dashboard`}
              >
                <FontAwesomeIcon icon={faBuilding} className="me-2" />
                Back to Dashboard
              </Dropdown.Item>
              <Dropdown.Item>
                <FontAwesomeIcon icon={faCog} className="me-2" />
                Settings
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={onLogout} className="text-danger">
                <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* Main Content */}
      <div className="d-flex h-100" style={{height: "calc(100vh - 60px)"}}>
        {/* ChatSidebar Component */}
        <div
          className="flex-shrink-0 border-end"
          style={{
            width: selectedChat ? "400px" : "450px",
            minWidth: "350px",
            maxWidth: "500px",
          }}
        >
          <ChatSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            chats={getFilteredChats()}
            selectedChat={selectedChat}
            onChatSelect={handleChatSelect}
            loading={loading}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterSections={filterSections}
            renderSectionContent={renderSectionContent}
            onStartNewChat={handleStartNewChat}
            contacts={contacts}
          />
        </div>

        {/* Main Chat Area */}
        <div
          className="flex-grow-1 d-flex flex-column"
          style={{background: "#e5ddd5"}}
        >
          <ChatContainer
            selectedChat={selectedChat}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            activeSection={activeSection}
          />
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3" style={{zIndex: 1055}}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            show={toast.show}
            onClose={() => removeToast(toast.id)}
            bg={toast.type === "error" ? "danger" : toast.type}
            text={toast.type === "error" ? "white" : undefined}
          >
            <Toast.Header closeButton>
              <strong className="me-auto">
                {toast.type === "success"
                  ? "Success"
                  : toast.type === "error"
                  ? "Error"
                  : "Info"}
              </strong>
            </Toast.Header>
            <Toast.Body>{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  );
}

export default CommunityPage;
