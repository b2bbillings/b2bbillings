import React from "react";
import {Button, Dropdown} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPhone,
  faVideo,
  faEllipsisV,
  faCircle,
  faBuilding,
  faTruck,
  faShoppingCart,
  faHeadset,
  faSearch,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";

function ChatHeader({chat}) {
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
        return "success";
      case "away":
        return "warning";
      case "busy":
        return "danger";
      default:
        return "secondary";
    }
  };

  // Format last seen time
  const formatLastSeen = (timestamp) => {
    if (chat.isOnline) return "Online";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now - date) / (1000 * 60);

    if (diffInMinutes < 60) {
      return `Last seen ${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 1440) {
      return `Last seen ${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `Last seen ${date.toLocaleDateString()}`;
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

  return (
    <div className="bg-white border-bottom p-3 shadow-sm">
      <div className="d-flex align-items-center justify-content-between">
        {/* Left side - Chat info */}
        <div className="d-flex align-items-center flex-grow-1">
          {/* Avatar with online indicator */}
          <div className="position-relative me-3">
            <div
              className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold bg-${getTypeColor(
                chat.type
              )}`}
              style={{width: "50px", height: "50px", fontSize: "1.1rem"}}
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
                  width: "14px",
                  height: "14px",
                  backgroundColor:
                    getStatusColor(chat.status) === "success"
                      ? "#28a745"
                      : getStatusColor(chat.status) === "warning"
                      ? "#ffc107"
                      : getStatusColor(chat.status) === "danger"
                      ? "#dc3545"
                      : "#6c757d",
                }}
              />
            )}
          </div>

          {/* Chat details */}
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex align-items-center mb-1">
              <h6 className="mb-0 me-2 text-truncate">{chat.name}</h6>
              <FontAwesomeIcon
                icon={getTypeIcon(chat.type)}
                className={`text-${getTypeColor(chat.type)}`}
                title={chat.type.charAt(0).toUpperCase() + chat.type.slice(1)}
                size="sm"
              />
            </div>

            {/* Company name */}
            {chat.company && (
              <div className="small text-muted mb-1">
                <FontAwesomeIcon icon={faBuilding} className="me-1" />
                {chat.company}
              </div>
            )}

            {/* Online status */}
            <div className="small text-muted">
              {formatLastSeen(chat.lastSeen)}
            </div>
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="d-flex align-items-center gap-2">
          {/* Search messages */}
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-circle"
            style={{width: "40px", height: "40px"}}
            title="Search messages"
          >
            <FontAwesomeIcon icon={faSearch} />
          </Button>

          {/* Call and video buttons (not for support) */}
          {chat.type !== "support" && (
            <>
              <Button
                variant="outline-secondary"
                size="sm"
                className="rounded-circle"
                style={{width: "40px", height: "40px"}}
                title="Voice call"
              >
                <FontAwesomeIcon icon={faPhone} />
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="rounded-circle"
                style={{width: "40px", height: "40px"}}
                title="Video call"
              >
                <FontAwesomeIcon icon={faVideo} />
              </Button>
            </>
          )}

          {/* Info button for support */}
          {chat.type === "support" && (
            <Button
              variant="outline-info"
              size="sm"
              className="rounded-circle"
              style={{width: "40px", height: "40px"}}
              title="Support info"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
            </Button>
          )}

          {/* More options dropdown */}
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              size="sm"
              className="rounded-circle border-0"
              style={{width: "40px", height: "40px"}}
              title="More options"
            >
              <FontAwesomeIcon icon={faEllipsisV} />
            </Dropdown.Toggle>

            <Dropdown.Menu align="end">
              <Dropdown.Item>
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                View Profile
              </Dropdown.Item>
              <Dropdown.Item>
                <FontAwesomeIcon icon={faSearch} className="me-2" />
                Search Messages
              </Dropdown.Item>
              <Dropdown.Divider />

              {chat.type === "support" ? (
                <>
                  <Dropdown.Item>
                    <FontAwesomeIcon icon={faHeadset} className="me-2" />
                    Escalate to Manager
                  </Dropdown.Item>
                  <Dropdown.Item>Close Ticket</Dropdown.Item>
                </>
              ) : (
                <>
                  <Dropdown.Item>Mute Notifications</Dropdown.Item>
                  <Dropdown.Item>Block Contact</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item className="text-danger">
                    Delete Chat
                  </Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* Support ticket info banner */}
      {chat.type === "support" && chat.ticketId && (
        <div className="mt-2 p-2 bg-light rounded">
          <small className="text-muted">
            <FontAwesomeIcon icon={faHeadset} className="me-1" />
            Support Ticket #{chat.ticketId}
            {chat.priority && (
              <span
                className={`badge ms-2 bg-${
                  chat.priority === "high"
                    ? "danger"
                    : chat.priority === "medium"
                    ? "warning"
                    : "secondary"
                }`}
              >
                {chat.priority} priority
              </span>
            )}
            {chat.status && (
              <span
                className={`badge ms-1 bg-${
                  chat.status === "open"
                    ? "success"
                    : chat.status === "pending"
                    ? "warning"
                    : "secondary"
                }`}
              >
                {chat.status}
              </span>
            )}
          </small>
        </div>
      )}
    </div>
  );
}

export default ChatHeader;
