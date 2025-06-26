import React, {useEffect, useRef, useState} from "react";
import {Spinner, Button} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faArrowDown, faSpinner} from "@fortawesome/free-solid-svg-icons";
import ChatMessage from "./ChatMessage";

function ChatWindow({chat, currentUser}) {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!hasScrolledUp) {
      scrollToBottom();
    }
  }, [chat?.messages, hasScrolledUp]);

  // Handle scroll events
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const {scrollTop, scrollHeight, clientHeight} = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

      setShowScrollToBottom(!isAtBottom && chat?.messages?.length > 0);
      setHasScrolledUp(!isAtBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [chat?.messages?.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    setHasScrolledUp(false);
  };

  const loadOlderMessages = async () => {
    setIsLoadingOlder(true);
    // Mock API call - in real app, this would load older messages
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoadingOlder(false);
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return [];

    const groups = [];
    let currentDate = null;
    let currentGroup = [];

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp).toDateString();

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({
            date: currentDate,
            messages: currentGroup,
          });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({
        date: currentDate,
        messages: currentGroup,
      });
    }

    return groups;
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  // Check if messages should be grouped (same sender, within 5 minutes)
  const shouldGroupMessage = (currentMsg, previousMsg) => {
    if (!previousMsg) return false;

    const timeDiff =
      new Date(currentMsg.timestamp) - new Date(previousMsg.timestamp);
    const fiveMinutes = 5 * 60 * 1000;

    return (
      currentMsg.senderId === previousMsg.senderId && timeDiff < fiveMinutes
    );
  };

  if (!chat) {
    return (
      <div className="h-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center text-muted">
          <div className="mb-3" style={{fontSize: "3rem", opacity: 0.5}}>
            💬
          </div>
          <h5>Select a conversation</h5>
          <p>Choose a chat to start messaging</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(chat.messages || []);

  return (
    <div className="h-100 position-relative" style={{background: "#e5ddd5"}}>
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="h-100 overflow-y-auto p-3"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none'%3e%3cpath fill='%23f0f2f5' opacity='0.4' d='M16 0C7.2 0 0 7.2 0 16s7.2 16 16 16 16-7.2 16-16S24.8 0 16 0z'/%3e%3c/svg%3e")`,
          backgroundRepeat: "repeat",
        }}
      >
        {/* Load Older Messages Button */}
        {chat.messages && chat.messages.length > 0 && (
          <div className="text-center mb-3">
            <Button
              variant="light"
              size="sm"
              onClick={loadOlderMessages}
              disabled={isLoadingOlder}
              className="rounded-pill px-3 shadow-sm"
            >
              {isLoadingOlder ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                  Loading...
                </>
              ) : (
                "Load older messages"
              )}
            </Button>
          </div>
        )}

        {/* Messages */}
        {messageGroups.length === 0 ? (
          <div className="h-100 d-flex align-items-center justify-content-center">
            <div className="text-center text-muted">
              <div className="mb-3" style={{fontSize: "2rem", opacity: 0.6}}>
                👋
              </div>
              <h6>Start the conversation</h6>
              <p className="small mb-0">
                Send your first message to {chat.name}
              </p>
            </div>
          </div>
        ) : (
          messageGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="text-center my-4">
                <span className="bg-white px-3 py-1 rounded-pill shadow-sm text-muted small">
                  {formatDate(group.date)}
                </span>
              </div>

              {/* Messages for this date */}
              {group.messages.map((message, messageIndex) => {
                const isOwn = message.senderId === currentUser?.id;
                const previousMessage =
                  messageIndex > 0 ? group.messages[messageIndex - 1] : null;
                const showSender =
                  !isOwn && !shouldGroupMessage(message, previousMessage);

                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    currentUser={currentUser}
                    isOwn={isOwn}
                    showSender={showSender}
                  />
                );
              })}
            </div>
          ))
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <div
          className="position-absolute"
          style={{bottom: "20px", right: "20px", zIndex: 10}}
        >
          <Button
            variant="light"
            className="rounded-circle shadow"
            style={{width: "50px", height: "50px"}}
            onClick={scrollToBottom}
            title="Scroll to bottom"
          >
            <FontAwesomeIcon icon={faArrowDown} />
          </Button>
        </div>
      )}

      {/* Typing Indicator */}
      {chat.isTyping && (
        <div
          className="position-absolute bg-white rounded-pill px-3 py-2 shadow-sm"
          style={{bottom: "20px", left: "20px"}}
        >
          <div className="d-flex align-items-center">
            <div className="me-2">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <small className="text-muted">{chat.name} is typing...</small>
          </div>
        </div>
      )}

      {/* Inline CSS for typing indicator animation */}
      <style jsx>{`
        .typing-indicator {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }

        .typing-indicator span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: #6c757d;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes typing {
          0%,
          80%,
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default ChatWindow;
