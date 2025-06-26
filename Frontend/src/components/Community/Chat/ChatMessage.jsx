import React, {useState} from "react";
import {Dropdown, OverlayTrigger, Tooltip} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCheckDouble,
  faClock,
  faEllipsisV,
  faReply,
  faCopy,
  faTrash,
  faExclamationTriangle,
  faDownload,
  faPlay,
  faPause,
} from "@fortawesome/free-solid-svg-icons";

function ChatMessage({message, currentUser, isOwn, showSender = false}) {
  const [showActions, setShowActions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Get message status icon
  const getStatusIcon = (status) => {
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
  const getStatusColor = (status) => {
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

  // Handle message actions
  const handleReply = () => {
    console.log("Reply to message:", message.id);
    // Implement reply functionality
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    console.log("Message copied to clipboard");
  };

  const handleDelete = () => {
    console.log("Delete message:", message.id);
    // Implement delete functionality
  };

  const handleReport = () => {
    console.log("Report message:", message.id);
    // Implement report functionality
  };

  // Render different message types
  const renderMessageContent = () => {
    switch (message.type) {
      case "text":
        return <div className="message-text">{message.content}</div>;

      case "image":
        return (
          <div className="message-image">
            <img
              src={message.content}
              alt="Shared image"
              className="img-fluid rounded"
              style={{maxWidth: "250px", maxHeight: "250px"}}
            />
            {message.caption && (
              <div className="mt-2 small">{message.caption}</div>
            )}
          </div>
        );

      case "file":
        return (
          <div className="message-file d-flex align-items-center p-2 bg-light rounded">
            <FontAwesomeIcon icon={faDownload} className="me-2 text-primary" />
            <div className="flex-grow-1">
              <div className="fw-semibold">{message.fileName}</div>
              <small className="text-muted">{message.fileSize}</small>
            </div>
          </div>
        );

      case "voice":
        return (
          <div className="message-voice d-flex align-items-center p-2 bg-light rounded">
            <button
              className="btn btn-sm btn-primary rounded-circle me-2"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{width: "30px", height: "30px"}}
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} size="xs" />
            </button>
            <div className="flex-grow-1">
              <div
                className="bg-secondary rounded"
                style={{height: "20px", position: "relative"}}
              >
                <div
                  className="bg-primary rounded h-100"
                  style={{width: "30%"}}
                />
              </div>
              <small className="text-muted">{message.duration || "0:05"}</small>
            </div>
          </div>
        );

      case "system":
        return (
          <div className="text-center text-muted small py-2">
            <span className="bg-light px-3 py-1 rounded-pill">
              {message.content}
            </span>
          </div>
        );

      default:
        return <div>{message.content}</div>;
    }
  };

  // System messages have special styling
  if (message.type === "system") {
    return (
      <div className="message-container text-center my-2">
        {renderMessageContent()}
      </div>
    );
  }

  return (
    <div
      className={`message-container d-flex mb-3 ${
        isOwn ? "justify-content-end" : "justify-content-start"
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`message-wrapper ${isOwn ? "order-2" : "order-1"}`}>
        {/* Sender name (for group chats or non-own messages) */}
        {showSender && !isOwn && (
          <div className="message-sender small text-primary fw-semibold mb-1">
            {message.senderName}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`message-bubble p-3 rounded-3 position-relative ${
            isOwn ? "bg-primary text-white ms-auto" : "bg-white border me-auto"
          }`}
          style={{
            maxWidth: "70%",
            minWidth: "100px",
            wordWrap: "break-word",
            borderBottomRightRadius: isOwn ? "6px" : undefined,
            borderBottomLeftRadius: !isOwn ? "6px" : undefined,
          }}
        >
          {/* Message content */}
          {renderMessageContent()}

          {/* Message time and status */}
          <div
            className={`message-meta d-flex align-items-center justify-content-end mt-2 ${
              isOwn ? "text-white-50" : "text-muted"
            }`}
            style={{fontSize: "0.75rem"}}
          >
            <span className="me-1">{formatTime(message.timestamp)}</span>

            {/* Status indicators for own messages */}
            {isOwn && message.status && (
              <FontAwesomeIcon
                icon={getStatusIcon(message.status)}
                className={
                  isOwn ? "text-white-50" : getStatusColor(message.status)
                }
                size="xs"
                title={message.status}
              />
            )}
          </div>
        </div>

        {/* Message actions dropdown */}
        {showActions && (
          <div
            className={`message-actions ${
              isOwn ? "order-1 me-2" : "order-3 ms-2"
            }`}
          >
            <Dropdown drop={isOwn ? "start" : "end"}>
              <Dropdown.Toggle
                variant="light"
                size="sm"
                className="btn-sm rounded-circle border-0 shadow-sm"
                style={{width: "30px", height: "30px", opacity: 0.8}}
              >
                <FontAwesomeIcon icon={faEllipsisV} size="xs" />
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item
                  onClick={handleReply}
                  className="d-flex align-items-center"
                >
                  <FontAwesomeIcon icon={faReply} className="me-2" />
                  Reply
                </Dropdown.Item>

                <Dropdown.Item
                  onClick={handleCopy}
                  className="d-flex align-items-center"
                >
                  <FontAwesomeIcon icon={faCopy} className="me-2" />
                  Copy
                </Dropdown.Item>

                {isOwn ? (
                  <Dropdown.Item
                    onClick={handleDelete}
                    className="d-flex align-items-center text-danger"
                  >
                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                    Delete
                  </Dropdown.Item>
                ) : (
                  <Dropdown.Item
                    onClick={handleReport}
                    className="d-flex align-items-center text-warning"
                  >
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-2"
                    />
                    Report
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
