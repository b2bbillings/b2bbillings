import React, {createContext, useContext, useState, useEffect} from "react";
import {Modal} from "react-bootstrap";
import PartyChat from "../components/Home/Party/PartyChat";

const ChatContext = createContext();

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
};

export const ChatProvider = ({children}) => {
  const [chatState, setChatState] = useState({
    isOpen: false,
    party: null,
    mode: "modal", // 'modal' or 'embedded'
    loading: false,
  });

  const openChat = (party, mode = "modal") => {
    if (!party) {
      console.warn("Cannot open chat: party is required");
      return;
    }

    // Add body class for scroll prevention
    document.body.classList.add("chat-modal-open");

    setChatState({
      isOpen: true,
      party,
      mode,
      loading: false,
    });
  };

  const closeChat = () => {
    // Remove body class to restore scroll
    document.body.classList.remove("chat-modal-open");

    setChatState({
      isOpen: false,
      party: null,
      mode: "modal",
      loading: false,
    });
  };

  const setLoading = (loading) => {
    setChatState((prev) => ({...prev, loading}));
  };

  const isChatOpen = (partyId) => {
    return chatState.isOpen && chatState.party?._id === partyId;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove("chat-modal-open");
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && chatState.isOpen) {
        closeChat();
      }
    };

    if (chatState.isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [chatState.isOpen]);

  return (
    <ChatContext.Provider
      value={{
        chatState,
        openChat,
        closeChat,
        setLoading,
        isChatOpen,
      }}
    >
      {children}

      {/* Chat Modal with Custom Backdrop */}
      {chatState.isOpen && chatState.mode === "modal" && chatState.party && (
        <>
          {/* Custom backdrop with reduced blur effect */}
          <div
            className="chat-custom-backdrop position-fixed top-0 start-0 w-100 h-100"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 1055,
              pointerEvents: "auto",
            }}
            onClick={closeChat}
            role="button"
            tabIndex="-1"
            aria-label="Close chat"
          />

          {/* Chat Modal */}
          <Modal
            show={true}
            onHide={closeChat}
            backdrop={false}
            className="chat-modal"
            style={{zIndex: 1060}}
            aria-labelledby="chat-modal-title"
          >
            <Modal.Body className="p-0">
              <PartyChat
                party={chatState.party}
                onClose={closeChat}
                isEmbedded={false}
                show={true}
              />
            </Modal.Body>
          </Modal>
        </>
      )}

      {/* Loading overlay */}
      {chatState.loading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 10000,
            backdropFilter: "blur(2px)",
          }}
          role="dialog"
          aria-live="polite"
          aria-label="Loading chat"
        >
          <div className="bg-white p-4 rounded-3 shadow-lg">
            <div className="d-flex align-items-center">
              <div
                className="spinner-border spinner-border-sm me-3 text-primary"
                role="status"
                aria-hidden="true"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="fw-medium">Preparing chat...</span>
            </div>
          </div>
        </div>
      )}

      {/* Production-ready CSS */}
      <style>{`
        /* Custom Backdrop Blur Effect */
        .chat-custom-backdrop {
          backdrop-filter: blur(4px) saturate(1.1);
          -webkit-backdrop-filter: blur(4px) saturate(1.1);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.01) 0%,
            rgba(255, 255, 255, 0.03) 50%,
            rgba(255, 255, 255, 0.01) 100%
          );
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: backdrop-filter, opacity;
          transform: translateZ(0);
          opacity: 0;
          animation: backdropFadeIn 0.4s ease-out forwards;
        }
        
        @keyframes backdropFadeIn {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(4px) saturate(1.1);
            -webkit-backdrop-filter: blur(4px) saturate(1.1);
          }
        }
        
        /* Fallback for browsers without backdrop-filter */
        @supports not (backdrop-filter: blur(4px)) {
          .chat-custom-backdrop {
            background: rgba(0, 0, 0, 0.15);
          }
        }
        
        /* Chat Modal Styling */
        .chat-modal .modal-dialog {
          margin: 0;
          height: 100vh;
          max-width: none;
          width: 100%;
          pointer-events: none;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .chat-modal .modal-content {
          height: 100vh;
          border: none;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          pointer-events: auto;
        }
        
        .chat-modal .modal-body {
          height: 100vh;
          padding: 0;
        }
        
        .chat-modal {
          z-index: 1060;
          animation: chatModalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes chatModalSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Hide Bootstrap's default backdrop */
        .chat-modal + .modal-backdrop,
        .modal-backdrop.show {
          display: none;
        }
        
        /* Loading Spinner Enhanced */
        .spinner-border-sm {
          width: 1.2rem;
          height: 1.2rem;
          border-width: 2px;
        }
        
        /* Body scroll prevention */
        body.chat-modal-open {
          overflow: hidden;
          padding-right: 0;
        }
        
        /* Focus management */
        .chat-modal:focus-visible {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }
        
        .chat-custom-backdrop:focus-visible {
          outline: 2px solid #007bff;
          outline-offset: -2px;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .chat-custom-backdrop {
            display: none;
          }
          
          .chat-modal .modal-dialog {
            width: 100vw;
          }
          
          .chat-modal {
            animation: chatModalSlideUp 0.3s ease-out;
          }
          
          @keyframes chatModalSlideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        }
        
        /* Tablet optimization */
        @media (min-width: 769px) and (max-width: 1024px) {
          .chat-custom-backdrop {
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);
          }
        }
        
        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .chat-custom-backdrop {
            backdrop-filter: blur(3px) saturate(1.05);
            -webkit-backdrop-filter: blur(3px) saturate(1.05);
          }
        }
        
        /* Accessibility - Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .chat-custom-backdrop,
          .chat-modal {
            animation: none;
            transition: opacity 0.2s ease;
          }
          
          .chat-custom-backdrop {
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            background: rgba(0, 0, 0, 0.2);
          }
        }
        
        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .chat-custom-backdrop {
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }
        }
        
        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
          .chat-custom-backdrop {
            background: linear-gradient(
              135deg,
              rgba(0, 0, 0, 0.05) 0%,
              rgba(0, 0, 0, 0.1) 50%,
              rgba(0, 0, 0, 0.05) 100%
            );
          }
        }
        
        /* Performance optimizations */
        .chat-modal,
        .chat-custom-backdrop {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          perspective: 1000px;
          -webkit-perspective: 1000px;
        }
        
        /* Print styles */
        @media print {
          .chat-modal,
          .chat-custom-backdrop {
            display: none;
          }
        }
        
        /* Prevent text selection on backdrop */
        .chat-custom-backdrop {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        /* Loading state improvements */
        .chat-modal .spinner-border {
          animation-duration: 0.75s;
        }
        
        /* Error state styling */
        .chat-modal .alert {
          border-radius: 12px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          background: rgba(248, 215, 218, 0.95);
        }
        
        /* RTL support */
        [dir="rtl"] .chat-modal {
          transform: translateX(-100%);
        }
        
        [dir="rtl"] .chat-modal.show {
          transform: translateX(0);
        }
        
        /* Safari specific fixes */
        @supports (-webkit-backdrop-filter: blur(4px)) {
          .chat-custom-backdrop {
            -webkit-backdrop-filter: blur(4px) saturate(1.1);
          }
        }
        
        /* Firefox specific optimizations */
        @-moz-document url-prefix() {
          .chat-custom-backdrop {
            background: rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </ChatContext.Provider>
  );
};

export {ChatContext};
export default ChatProvider;
