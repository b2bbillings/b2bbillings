import React, {useState} from "react";
import {Badge, Button, Dropdown} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSort,
  faComments,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import ChatList from "../Chat/ChatList";
import ContactList from "../Common/ContactList";

function AllChats({
  chats = [],
  selectedChat,
  onChatSelect,
  onStartNewChat,
  contacts = [],
  loading = false,
  currentUser,
  addToast,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterType, setFilterType] = useState("all");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [viewMode, setViewMode] = useState("chats");

  // Search and filter logic
  const getFilteredAndSortedChats = () => {
    let filtered = [...chats];

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          chat.name?.toLowerCase().includes(searchLower) ||
          chat.company?.toLowerCase().includes(searchLower) ||
          chat.lastMessage?.toLowerCase().includes(searchLower)
      );
    }

    switch (filterType) {
      case "unread":
        filtered = filtered.filter((chat) => chat.unreadCount > 0);
        break;
      case "online":
        filtered = filtered.filter((chat) => chat.isOnline);
        break;
      case "all":
      default:
        break;
    }

    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "unread":
        filtered.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
        break;
      case "recent":
      default:
        filtered.sort(
          (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        );
        break;
    }

    return filtered;
  };

  const getChatStats = () => {
    const totalChats = chats.length;
    const unreadChats = chats.filter((chat) => chat.unreadCount > 0).length;
    const onlineUsers = chats.filter((chat) => chat.isOnline).length;
    const totalUnread = chats.reduce(
      (sum, chat) => sum + (chat.unreadCount || 0),
      0
    );

    return {totalChats, unreadChats, onlineUsers, totalUnread};
  };

  const handleStartNewChat = (contact) => {
    if (onStartNewChat) {
      onStartNewChat(contact);
    }
    setShowNewChatModal(false);
    addToast?.("New chat started successfully!", "success");
  };

  const sortOptions = [
    {key: "recent", label: "Most Recent"},
    {key: "name", label: "Name (A-Z)"},
    {key: "unread", label: "Unread First"},
  ];

  const filterOptions = [
    {key: "all", label: "All", count: chats.length},
    {key: "unread", label: "Unread", count: getChatStats().unreadChats},
    {key: "online", label: "Online", count: getChatStats().onlineUsers},
  ];

  const filteredChats = getFilteredAndSortedChats();
  const stats = getChatStats();

  return (
    <div className="all-chats h-100 d-flex flex-column">
      {/* Minimal Header - Single Row */}
      <div className="flex-shrink-0 p-2 border-bottom bg-white">
        <div className="d-flex align-items-center justify-content-between mb-1">
          {/* Left side - Title */}
          <div className="d-flex align-items-center">
            <FontAwesomeIcon icon={faComments} className="me-2" size="sm" />
            <span className="fw-bold" style={{fontSize: "0.85rem"}}>
              Conversations
            </span>
          </div>

          {/* Right side - Actions */}
          <div className="d-flex gap-1">
            <Button
              variant={viewMode === "contacts" ? "success" : "outline-success"}
              size="sm"
              onClick={() =>
                setViewMode(viewMode === "chats" ? "contacts" : "chats")
              }
              style={{fontSize: "0.7rem", padding: "0.2rem 0.4rem"}}
            >
              <FontAwesomeIcon
                icon={viewMode === "chats" ? faUsers : faComments}
                size="xs"
              />
            </Button>

            <Button
              variant="success"
              size="sm"
              onClick={() => setShowNewChatModal(true)}
              style={{fontSize: "0.7rem", padding: "0.2rem 0.4rem"}}
            >
              <FontAwesomeIcon icon={faPlus} size="xs" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-1">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder={`Search ${
              viewMode === "chats" ? "chats" : "contacts"
            }...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{fontSize: "0.75rem", padding: "0.25rem 0.5rem"}}
          />
        </div>

        {/* Compact Filters Row */}
        {viewMode === "chats" && (
          <div className="d-flex align-items-center justify-content-between">
            {/* Filter buttons */}
            <div className="d-flex gap-1">
              {filterOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={
                    filterType === option.key ? "primary" : "outline-secondary"
                  }
                  size="sm"
                  onClick={() => setFilterType(option.key)}
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.2rem 0.3rem",
                    minWidth: "fit-content",
                  }}
                >
                  {option.label}
                  {option.count > 0 && (
                    <Badge
                      bg={filterType === option.key ? "light" : "primary"}
                      text={filterType === option.key ? "dark" : "white"}
                      className="ms-1"
                      style={{fontSize: "0.55rem"}}
                    >
                      {option.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Sort dropdown */}
            <Dropdown>
              <Dropdown.Toggle
                variant="outline-secondary"
                size="sm"
                style={{fontSize: "0.65rem", padding: "0.2rem 0.3rem"}}
              >
                <FontAwesomeIcon icon={faSort} size="xs" />
              </Dropdown.Toggle>
              <Dropdown.Menu align="end">
                <Dropdown.Header style={{fontSize: "0.7rem"}}>
                  Sort by:
                </Dropdown.Header>
                {sortOptions.map((option) => (
                  <Dropdown.Item
                    key={option.key}
                    active={sortBy === option.key}
                    onClick={() => setSortBy(option.key)}
                    style={{fontSize: "0.75rem"}}
                  >
                    {option.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-grow-1 overflow-hidden" style={{minHeight: 0}}>
        {viewMode === "chats" ? (
          <ChatList
            chats={filteredChats}
            selectedChat={selectedChat}
            onChatSelect={onChatSelect}
            loading={loading}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : (
          <ContactList
            contacts={contacts}
            onStartChat={handleStartNewChat}
            searchPlaceholder="Search contacts..."
            emptyMessage="No contacts found"
            currentUser={currentUser}
            showActions={true}
          />
        )}
      </div>

      {/* Sticky Footer */}
      <div
        className="flex-shrink-0 p-2 border-top bg-light"
        style={{
          minHeight: "40px",
          position: "sticky",
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <small className="text-muted" style={{fontSize: "0.7rem"}}>
            {viewMode === "chats"
              ? `${filteredChats.length} of ${stats.totalChats} conversations`
              : `${contacts.length} contacts`}
          </small>

          {viewMode === "chats" && stats.unreadChats > 0 && (
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none p-0"
              onClick={() => {
                addToast?.("All messages marked as read", "success");
              }}
              style={{fontSize: "0.7rem", lineHeight: 1}}
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Modal */}
      {showNewChatModal && (
        <div
          className="modal show d-block"
          style={{backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050}}
          onClick={() => setShowNewChatModal(false)}
        >
          <div
            className="modal-dialog modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header py-2">
                <h6 className="modal-title mb-0" style={{fontSize: "0.9rem"}}>
                  Start New Chat
                </h6>
                <button
                  type="button"
                  className="btn-close btn-sm"
                  onClick={() => setShowNewChatModal(false)}
                />
              </div>
              <div
                className="modal-body p-0"
                style={{maxHeight: "400px", overflowY: "auto"}}
              >
                <ContactList
                  contacts={contacts}
                  onStartChat={handleStartNewChat}
                  searchPlaceholder="Search contacts..."
                  emptyMessage="No contacts available"
                  currentUser={currentUser}
                  showActions={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AllChats;
