import React from "react";
import {ListGroup, Badge, Spinner} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faCircle,
  faCheck,
  faCheckDouble,
  faClock,
  faBuilding,
  faTruck,
  faShoppingCart,
  faHeadset,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";

function ChatList({
  chats = [],
  selectedChat,
  onChatSelect,
  loading = false,
  currentUser,
  searchQuery = "",
  onSearchChange,
}) {
  // Get appropriate icon based on chat type
  const getTypeIcon = (type) => {
    switch (type) {
      case "supplier":
        return faTruck;
      case "buyer":
        return faShoppingCart;
      case "support":
        return faHeadset;
      default:
        return faBuilding;
    }
  };

  // Get appropriate color for chat type
  const getTypeColor = (type) => {
    switch (type) {
      case "supplier":
        return "success";
      case "buyer":
        return "info";
      case "support":
        return "warning";
      default:
        return "secondary";
    }
  };

  // Get status color for online indicator
  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "#28a745";
      case "away":
        return "#ffc107";
      case "busy":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  // Generate avatar initials
  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    );
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now - date) / (1000 * 60);

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;

    return date.toLocaleDateString();
  };

  // Get message status icon
  const getMessageStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return faClock;
      case "delivered":
        return faCheck;
      case "read":
        return faCheckDouble;
      default:
        return null;
    }
  };

  // Get message status color
  const getMessageStatusColor = (status) => {
    switch (status) {
      case "sent":
        return "text-muted";
      case "delivered":
        return "text-muted";
      case "read":
        return "text-primary";
      default:
        return "text-muted";
    }
  };

  // Filter chats based on search query
  const filteredChats = chats.filter((chat) => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      chat.name?.toLowerCase().includes(searchLower) ||
      chat.company?.toLowerCase().includes(searchLower) ||
      chat.lastMessage?.toLowerCase().includes(searchLower)
    );
  });

  // Loading state
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center p-4">
        <Spinner animation="border" size="sm" className="me-2" />
        <span className="text-muted">Loading chats...</span>
      </div>
    );
  }

  // Empty state
  if (filteredChats.length === 0) {
    return (
      <div className="text-center p-4">
        {searchQuery ? (
          <>
            <FontAwesomeIcon
              icon={faSearch}
              className="text-muted mb-2"
              size="2x"
            />
            <h6 className="text-muted">No chats found</h6>
            <p className="text-muted small mb-0">
              Try adjusting your search terms
            </p>
          </>
        ) : (
          <>
            <div className="text-muted mb-2" style={{fontSize: "3rem"}}>
              💬
            </div>
            <h6 className="text-muted">No conversations yet</h6>
            <p className="text-muted small mb-0">
              Start a conversation with suppliers, buyers, or support
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="chat-list">
      <ListGroup variant="flush">
        {filteredChats.map((chat) => (
          <ListGroup.Item
            key={chat.id}
            action
            active={selectedChat?.id === chat.id}
            onClick={() => onChatSelect(chat)}
            className={`border-0 chat-item ${
              selectedChat?.id === chat.id ? "active" : ""
            }`}
            style={{cursor: "pointer"}}
          >
            <div className="d-flex align-items-center">
              {/* Avatar with online indicator */}
              <div className="position-relative me-3 flex-shrink-0">
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold bg-${getTypeColor(
                    chat.type
                  )}`}
                  style={{width: "50px", height: "50px", fontSize: "1rem"}}
                >
                  {getInitials(chat.name)}
                </div>

                {/* Online status indicator */}
                {chat.isOnline && (
                  <div
                    className="position-absolute border border-white rounded-circle"
                    style={{
                      bottom: "2px",
                      right: "2px",
                      width: "12px",
                      height: "12px",
                      backgroundColor: getStatusColor(chat.status),
                    }}
                  />
                )}
              </div>

              {/* Chat content */}
              <div className="flex-grow-1 min-w-0">
                {/* Header row */}
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <div className="d-flex align-items-center min-w-0 flex-grow-1">
                    <h6 className="mb-0 me-2 text-truncate fw-semibold">
                      {chat.name}
                    </h6>
                    <FontAwesomeIcon
                      icon={getTypeIcon(chat.type)}
                      className={`text-${getTypeColor(
                        chat.type
                      )} flex-shrink-0`}
                      size="sm"
                      title={
                        chat.type.charAt(0).toUpperCase() + chat.type.slice(1)
                      }
                    />
                  </div>

                  {/* Time and unread count */}
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <small className="text-muted">
                      {formatTime(chat.lastMessageTime)}
                    </small>
                    {chat.unreadCount > 0 && (
                      <Badge
                        bg="primary"
                        pill
                        className="unread-badge"
                        style={{minWidth: "20px", fontSize: "0.7rem"}}
                      >
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Company name */}
                {chat.company && (
                  <div className="small text-muted mb-1 d-flex align-items-center">
                    <FontAwesomeIcon
                      icon={faBuilding}
                      className="me-1"
                      size="xs"
                    />
                    <span className="text-truncate">{chat.company}</span>
                  </div>
                )}

                {/* Last message row */}
                <div className="d-flex align-items-center justify-content-between">
                  <div className="text-muted small text-truncate me-2 flex-grow-1">
                    {chat.lastMessage || "No messages yet"}
                  </div>

                  {/* Message status (only for sent messages) */}
                  {chat.lastMessageStatus &&
                    chat.messages?.length > 0 &&
                    chat.messages[chat.messages.length - 1]?.senderId ===
                      currentUser?.id && (
                      <FontAwesomeIcon
                        icon={getMessageStatusIcon(chat.lastMessageStatus)}
                        className={`${getMessageStatusColor(
                          chat.lastMessageStatus
                        )} flex-shrink-0`}
                        size="xs"
                        title={chat.lastMessageStatus}
                      />
                    )}
                </div>

                {/* Support ticket info */}
                {chat.type === "support" && chat.ticketId && (
                  <div className="mt-1">
                    <small className="text-muted">
                      Ticket #{chat.ticketId}
                      {chat.priority && (
                        <span
                          className={`badge ms-1 bg-${
                            chat.priority === "high"
                              ? "danger"
                              : chat.priority === "medium"
                              ? "warning"
                              : "secondary"
                          }`}
                          style={{fontSize: "0.6rem"}}
                        >
                          {chat.priority}
                        </span>
                      )}
                    </small>
                  </div>
                )}
              </div>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
}

export default ChatList;
