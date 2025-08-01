import React, {createContext, useContext, useState} from "react";
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

    setChatState({
      isOpen: true,
      party,
      mode,
      loading: false,
    });
  };

  const closeChat = () => {
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

  // ✅ Helper function to check if chat is open for a specific party
  const isChatOpen = (partyId) => {
    return chatState.isOpen && chatState.party?._id === partyId;
  };

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

      {/* ✅ SINGLE Chat Modal - Only renders when needed */}
      {chatState.isOpen && chatState.mode === "modal" && chatState.party && (
        <Modal
          show={true}
          onHide={closeChat}
          size="lg"
          centered
          className="chat-modal"
          style={{zIndex: 1060}} // Higher than other modals
          backdrop="static" // Prevent closing on backdrop click
        >
          <Modal.Body className="p-0">
            <PartyChat
              party={chatState.party}
              onClose={closeChat}
              isEmbedded={false}
              show={true} // ✅ Add show prop for compatibility
            />
          </Modal.Body>
        </Modal>
      )}

      {/* ✅ Loading overlay with better styling */}
      {chatState.loading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 10000,
            backdropFilter: "blur(2px)", // ✅ Add blur effect
          }}
        >
          <div className="bg-white p-4 rounded shadow-lg">
            <div className="d-flex align-items-center">
              <div
                className="spinner-border spinner-border-sm me-3 text-primary"
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="fw-medium">Preparing chat...</span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Add global CSS for chat modal */}
      <style>{`
        .chat-modal .modal-dialog {
          margin: 0 !important;
          height: 100vh !important;
          max-width: none !important;
          width: 100% !important;
        }
        
        .chat-modal .modal-content {
          height: 100vh !important;
          border: none !important;
          border-radius: 0 !important;
        }
        
        .chat-modal .modal-body {
          height: 100vh !important;
          padding: 0 !important;
        }
        
        /* Ensure chat modal has proper z-index hierarchy */
        .chat-modal {
          z-index: 1060 !important;
        }
        
        .chat-modal .modal-backdrop {
          z-index: 1055 !important;
        }
        
        /* Prevent multiple chat instances */
        .chat-modal + .chat-modal {
          display: none !important;
        }
      `}</style>
    </ChatContext.Provider>
  );
};
