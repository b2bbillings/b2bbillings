import React from "react";
import {Card, Nav, Button, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faComments,
  faTruck,
  faShoppingCart,
  faHeadset,
  faUser,
  faQuestionCircle,
  faUsers,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import SearchBar from "../Common/SearchBar";
import ChatList from "./ChatList";

function ChatSidebar({
  activeSection,
  onSectionChange,
  chats,
  selectedChat,
  onChatSelect,
  loading,
  currentUser,
  searchQuery,
  onSearchChange,
  filterSections,
  renderSectionContent,
  onStartNewChat,
  contacts = [],
}) {
  // Get icon for section
  const getSectionIcon = (iconName) => {
    switch (iconName) {
      case "faComments":
        return faComments;
      case "faTruck":
        return faTruck;
      case "faShoppingCart":
        return faShoppingCart;
      case "faHeadset":
        return faHeadset;
      case "faQuestionCircle":
        return faQuestionCircle;
      default:
        return faComments;
    }
  };

  // Get total unread count
  const getTotalUnreadCount = () => {
    return chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);
  };

  // Get online count
  const getOnlineCount = () => {
    return chats.filter((chat) => chat.isOnline).length;
  };

  return (
    <div className="h-100 d-flex flex-column bg-white">
      {/* Sidebar Header */}
      <div className="flex-shrink-0 p-3 border-bottom bg-white">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="mb-0 text-primary fw-bold">
            <FontAwesomeIcon icon={faComments} className="me-2" />
            Messages
          </h5>
          {currentUser && (
            <div className="d-flex align-items-center text-muted">
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                style={{width: "24px", height: "24px", fontSize: "0.75rem"}}
              >
                {currentUser.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <small
                className="text-truncate d-none d-md-inline"
                style={{maxWidth: "120px"}}
              >
                {currentUser.name}
              </small>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          placeholder="Search conversations..."
        />
      </div>

      {/* Filter Tabs - Made smaller */}
      <div className="flex-shrink-0 bg-light border-bottom p-2">
        <div className="d-flex flex-wrap gap-1">
          {filterSections.map((section) => (
            <button
              key={section.key}
              onClick={() => onSectionChange(section.key)}
              className={`btn btn-sm flex-fill d-flex flex-column align-items-center py-1 px-1 ${
                activeSection === section.key
                  ? `btn-${section.color}`
                  : "btn-outline-secondary"
              }`}
              style={{minWidth: "fit-content", fontSize: "0.7rem"}}
            >
              <FontAwesomeIcon
                icon={getSectionIcon(section.icon)}
                className="mb-1"
                size="xs"
              />
              <span
                className="small text-truncate"
                style={{maxWidth: "50px", fontSize: "0.65rem"}}
              >
                {section.label}
              </span>
              {section.count > 0 && (
                <Badge
                  bg={activeSection === section.key ? "light" : section.color}
                  text={activeSection === section.key ? "dark" : "white"}
                  className="mt-1"
                  style={{fontSize: "0.55rem"}}
                >
                  {section.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Section Header with Stats - Simplified */}
      <div className="flex-shrink-0 p-2 bg-light border-bottom">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="mb-0 fw-bold" style={{fontSize: "0.9rem"}}>
            <FontAwesomeIcon
              icon={getSectionIcon(
                filterSections.find((s) => s.key === activeSection)?.icon
              )}
              className="me-2"
              size="sm"
            />
            All Conversations
          </h6>

          {onStartNewChat && (
            <Button
              variant="success"
              size="sm"
              onClick={() => onStartNewChat()}
              style={{fontSize: "0.75rem", padding: "0.25rem 0.5rem"}}
            >
              <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
              New Chat
            </Button>
          )}
        </div>

        {/* Compact Stats */}
        <div className="d-flex gap-1 flex-wrap">
          <Badge bg="primary" style={{fontSize: "0.65rem"}}>
            {chats.length} Total
          </Badge>
          {getTotalUnreadCount() > 0 && (
            <Badge bg="danger" style={{fontSize: "0.65rem"}}>
              {getTotalUnreadCount()} Unread
            </Badge>
          )}
          <Badge bg="success" style={{fontSize: "0.65rem"}}>
            {getOnlineCount()} Online
          </Badge>
        </div>
      </div>

      {/* Chat List or Section Content */}
      <div className="flex-grow-1 overflow-hidden">
        <div className="h-100 overflow-y-auto">
          {renderSectionContent ? (
            renderSectionContent()
          ) : (
            <ChatList
              chats={chats}
              selectedChat={selectedChat}
              onChatSelect={onChatSelect}
              loading={loading}
              currentUser={currentUser}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
            />
          )}
        </div>
      </div>

      {/* Footer with Actions - Simplified */}
      <div className="flex-shrink-0 p-2 border-top bg-light">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center text-muted">
            <div
              className="rounded-circle me-2"
              style={{
                width: "6px",
                height: "6px",
                backgroundColor: "#28a745",
              }}
            />
            <small style={{fontSize: "0.7rem"}}>Connected</small>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              style={{fontSize: "0.7rem", padding: "0.2rem 0.4rem"}}
            >
              <FontAwesomeIcon icon={faUsers} size="xs" />
            </Button>
            <small className="text-muted" style={{fontSize: "0.7rem"}}>
              {chats.length} conversations
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatSidebar;
