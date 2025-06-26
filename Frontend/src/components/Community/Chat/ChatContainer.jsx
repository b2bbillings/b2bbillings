import React from "react";
import {Card} from "react-bootstrap";
import ChatHeader from "./ChatHeader";
import ChatWindow from "./ChatWindow";
import ChatInput from "./ChatInput";

function ChatContainer({
  selectedChat,
  currentUser,
  onSendMessage,
  activeSection,
}) {
  // If no chat is selected, show welcome screen
  if (!selectedChat) {
    return (
      <div
        className="h-100 d-flex align-items-center justify-content-center"
        style={{background: "#e5ddd5"}}
      >
        <div className="text-center text-muted">
          <div className="mb-4" style={{fontSize: "4rem", opacity: 0.5}}>
            💬
          </div>
          <h4 className="mb-3">Select a conversation</h4>
          <p className="mb-0">
            Choose a chat from the sidebar to start messaging
          </p>
          <small className="text-muted">
            Connect with suppliers, buyers, or get support
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="h-100 d-flex flex-column" style={{background: "#e5ddd5"}}>
      {/* Chat Header */}
      <div className="flex-shrink-0">
        <ChatHeader chat={selectedChat} />
      </div>

      {/* Chat Messages Window */}
      <div className="flex-grow-1 overflow-hidden">
        <ChatWindow chat={selectedChat} currentUser={currentUser} />
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0">
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={
            selectedChat?.type === "support" &&
            selectedChat?.status === "closed"
          }
          placeholder={
            selectedChat?.type === "support" &&
            selectedChat?.status === "closed"
              ? "This support conversation is closed"
              : `Message ${selectedChat?.name || "recipient"}...`
          }
        />
      </div>
    </div>
  );
}

export default ChatContainer;
