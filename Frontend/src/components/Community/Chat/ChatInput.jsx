import React, {useState, useRef} from "react";
import {Form, Button, Dropdown, OverlayTrigger, Tooltip} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faSmile,
  faPaperclip,
  faMicrophone,
  faImage,
  faFile,
  faCamera,
  faPlus,
  faStop,
} from "@fortawesome/free-solid-svg-icons";

function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Type a message...",
}) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Common emojis for quick access
  const quickEmojis = [
    "😊",
    "👍",
    "❤️",
    "😂",
    "😢",
    "😮",
    "😡",
    "🎉",
    "👏",
    "🔥",
  ];

  // Handle message submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    setMessage(e.target.value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
    textarea.style.height = newHeight + "px";
  };

  // Handle emoji insertion
  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage =
        message.substring(0, start) + emoji + message.substring(end);
      setMessage(newMessage);

      // Focus back and set cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  // Handle file upload
  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Here you would typically upload the files and send them as messages
      files.forEach((file) => {
        console.log(`Uploading ${type}:`, file.name);
        // For now, just send a message indicating file upload
        onSendMessage(`📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      });
    }
    // Reset file input
    e.target.value = "";
  };

  // Handle voice recording (mock implementation)
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // Mock: send voice message
      onSendMessage("🎤 Voice message (0:05)");
    } else {
      // Start recording
      setIsRecording(true);
      // Mock: auto-stop after 5 seconds
      setTimeout(() => {
        if (isRecording) {
          setIsRecording(false);
        }
      }, 5000);
    }
  };

  return (
    <div className="bg-white border-top p-3">
      <Form onSubmit={handleSubmit}>
        <div className="d-flex align-items-end gap-2">
          {/* Attachment Options */}
          <Dropdown drop="up">
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Attach files</Tooltip>}
            >
              <Dropdown.Toggle
                variant="outline-secondary"
                size="sm"
                className="rounded-circle border-0"
                style={{width: "40px", height: "40px"}}
                disabled={disabled}
              >
                <FontAwesomeIcon icon={faPlus} />
              </Dropdown.Toggle>
            </OverlayTrigger>

            <Dropdown.Menu>
              <Dropdown.Item
                onClick={() => imageInputRef.current?.click()}
                className="d-flex align-items-center"
              >
                <FontAwesomeIcon icon={faImage} className="me-2 text-success" />
                Photos
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => fileInputRef.current?.click()}
                className="d-flex align-items-center"
              >
                <FontAwesomeIcon icon={faFile} className="me-2 text-primary" />
                Documents
              </Dropdown.Item>
              <Dropdown.Item className="d-flex align-items-center">
                <FontAwesomeIcon icon={faCamera} className="me-2 text-info" />
                Camera
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          {/* Message Input Area */}
          <div className="flex-grow-1 position-relative">
            <Form.Control
              ref={textareaRef}
              as="textarea"
              value={message}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="border-0 bg-light rounded-pill resize-none"
              style={{
                paddingRight: "50px",
                paddingLeft: "15px",
                paddingTop: "10px",
                paddingBottom: "10px",
                minHeight: "40px",
                maxHeight: "120px",
                overflow: "hidden",
              }}
            />

            {/* Emoji Button */}
            <div
              className="position-absolute"
              style={{right: "10px", bottom: "8px"}}
            >
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Add emoji</Tooltip>}
              >
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 border-0"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={disabled}
                  style={{width: "24px", height: "24px"}}
                >
                  <FontAwesomeIcon icon={faSmile} className="text-muted" />
                </Button>
              </OverlayTrigger>
            </div>

            {/* Quick Emoji Picker */}
            {showEmojiPicker && (
              <div
                className="position-absolute bg-white border rounded shadow-sm p-2"
                style={{
                  bottom: "100%",
                  right: "0",
                  marginBottom: "5px",
                  zIndex: 1000,
                  minWidth: "250px",
                }}
              >
                <div className="d-flex flex-wrap gap-1">
                  {quickEmojis.map((emoji, index) => (
                    <Button
                      key={index}
                      variant="link"
                      size="sm"
                      className="p-1 border-0"
                      onClick={() => insertEmoji(emoji)}
                      style={{fontSize: "1.2rem", lineHeight: 1}}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
                <hr className="my-2" />
                <div className="text-center">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted"
                    onClick={() => setShowEmojiPicker(false)}
                  >
                    More emojis...
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Voice Recording or Send Button */}
          {message.trim() ? (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Send message</Tooltip>}
            >
              <Button
                type="submit"
                variant="primary"
                className="rounded-circle"
                style={{width: "40px", height: "40px"}}
                disabled={disabled}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </Button>
            </OverlayTrigger>
          ) : (
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip>
                  {isRecording ? "Stop recording" : "Record voice message"}
                </Tooltip>
              }
            >
              <Button
                variant={isRecording ? "danger" : "outline-secondary"}
                className="rounded-circle"
                style={{width: "40px", height: "40px"}}
                onClick={toggleRecording}
                disabled={disabled}
              >
                <FontAwesomeIcon
                  icon={isRecording ? faStop : faMicrophone}
                  className={isRecording ? "text-white" : ""}
                />
              </Button>
            </OverlayTrigger>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          style={{display: "none"}}
          multiple
          onChange={(e) => handleFileUpload(e, "document")}
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        />
        <input
          ref={imageInputRef}
          type="file"
          style={{display: "none"}}
          multiple
          onChange={(e) => handleFileUpload(e, "image")}
          accept="image/*"
        />

        {/* Recording indicator */}
        {isRecording && (
          <div className="text-center mt-2">
            <small className="text-danger">
              <FontAwesomeIcon icon={faMicrophone} className="me-1" />
              Recording... Tap to stop
            </small>
          </div>
        )}
      </Form>
    </div>
  );
}

export default ChatInput;
