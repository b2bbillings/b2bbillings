import React, {useState} from "react";
import {Table, Badge, Dropdown, Modal} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUser,
  faBuilding,
  faRocket,
  faPhone,
  faEnvelope,
  faEllipsisV,
  faEye,
  faEdit,
  faTrash,
  faComments,
  faLink,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

// ✅ NEW: Import chat components and services
import PartyChat from "./PartyChat";
import partyService from "../../../services/partyService";

function PartiesList({parties, onViewDetails, onEditParty, onDeleteParty}) {
  // ✅ NEW: State for chat functionality
  const [selectedPartyForChat, setSelectedPartyForChat] = useState(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // ✅ NEW: Chat button component
  const ChatButton = ({party}) => {
    const chatValidation = partyService.validatePartyChatCapability(party);

    const handleOpenChat = async (e) => {
      e.stopPropagation(); // Prevent row click

      if (!chatValidation.canChat) {
        alert(`Cannot start chat: ${chatValidation.reason}`);
        return;
      }

      try {
        setChatLoading(true);

        // ✅ FIXED: Get fresh party data with chat fields
        const partyResponse = await partyService.getPartyForChat(
          party._id || party.id
        );

        if (!partyResponse.success) {
          throw new Error("Failed to fetch party data");
        }

        const freshPartyData = partyResponse.data;

        console.log("🎯 Opening chat with party data:", {
          partyId: freshPartyData._id,
          partyName: freshPartyData.name,
          canChat: freshPartyData.canChat,
          chatCompanyId: freshPartyData.chatCompanyId,
        });

        setSelectedPartyForChat(freshPartyData);
        setChatModalOpen(true);
      } catch (error) {
        console.error("❌ Error opening chat:", error);
        alert("Failed to open chat. Please try again.");
      } finally {
        setChatLoading(false);
      }
    };

    return (
      <Dropdown.Item
        onClick={handleOpenChat}
        disabled={!chatValidation.canChat || chatLoading}
        className={chatValidation.canChat ? "text-primary" : "text-muted"}
      >
        <FontAwesomeIcon
          icon={chatValidation.canChat ? faComments : faExclamationTriangle}
          className="me-2"
        />
        {chatLoading
          ? "Loading..."
          : chatValidation.canChat
          ? "Start Chat"
          : "No Chat Link"}
        {chatValidation.canChat && (
          <div className="small text-muted mt-1">
            with {chatValidation.chatCompanyName}
          </div>
        )}
      </Dropdown.Item>
    );
  };

  // ✅ NEW: Chat status indicator component
  const ChatStatusIndicator = ({party}) => {
    const chatValidation = partyService.validatePartyChatCapability(party);

    if (!chatValidation.canChat) return null;

    return (
      <div className="mt-1">
        <small className="text-success">
          <FontAwesomeIcon icon={faLink} className="me-1" />
          Chat Available
        </small>
      </div>
    );
  };

  // ✅ NEW: Enhanced party type badge with chat indicator
  const PartyTypeBadge = ({party}) => {
    const chatValidation = partyService.validatePartyChatCapability(party);

    return (
      <div>
        <Badge
          bg={party.partyType === "customer" ? "primary" : "success"}
          className="party-type-badge"
        >
          {party.partyType === "customer" ? "Customer" : "Supplier"}
        </Badge>

        {party.isRunningCustomer && (
          <div className="mt-1">
            <small className="text-warning">
              <FontAwesomeIcon icon={faRocket} className="me-1" />
              Quick Entry
            </small>
          </div>
        )}

        {/* ✅ NEW: Chat availability indicator */}
        <ChatStatusIndicator party={party} />

        {/* ✅ NEW: Linked company info */}
        {chatValidation.canChat && chatValidation.chatCompanyName && (
          <div className="mt-1">
            <small className="text-info">
              <FontAwesomeIcon icon={faBuilding} className="me-1" />
              {chatValidation.chatCompanyName}
            </small>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="parties-list-container">
      <div className="table-responsive">
        <Table hover className="parties-table">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Type & Status</th>
              <th>Contact</th>
              <th>Location</th>
              <th>GST</th>
              <th width="50">Actions</th>
            </tr>
          </thead>
          <tbody>
            {parties.map((party) => (
              <tr
                key={party.id}
                className="party-row-clickable"
                style={{cursor: "pointer"}}
              >
                <td onClick={() => onViewDetails(party)}>
                  <div className="d-flex align-items-center">
                    <div className="party-avatar me-3">
                      <FontAwesomeIcon
                        icon={
                          party.isRunningCustomer
                            ? faRocket
                            : party.partyType === "customer"
                            ? faUser
                            : faBuilding
                        }
                        className={
                          party.isRunningCustomer
                            ? "text-warning"
                            : "text-muted"
                        }
                      />
                    </div>
                    <div>
                      <div className="fw-semibold">
                        {party.name}
                        {party.isRunningCustomer && (
                          <Badge bg="warning" className="ms-2 text-dark">
                            Running
                          </Badge>
                        )}
                        {/* ✅ NEW: Chat enabled indicator */}
                        {party.canChat && (
                          <Badge bg="success" className="ms-2">
                            💬
                          </Badge>
                        )}
                      </div>
                      {party.email && (
                        <small className="text-muted">
                          <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                          {party.email}
                        </small>
                      )}
                    </div>
                  </div>
                </td>

                <td onClick={() => onViewDetails(party)}>
                  {/* ✅ UPDATED: Enhanced party type badge with chat info */}
                  <PartyTypeBadge party={party} />
                </td>

                <td onClick={() => onViewDetails(party)}>
                  <div className="contact-info">
                    {party.whatsappNumber && (
                      <div className="text-muted mb-1">
                        <FontAwesomeIcon
                          icon={faPhone}
                          className="me-1 text-success"
                        />
                        <small className="text-success">WhatsApp:</small>{" "}
                        {party.whatsappNumber}
                      </div>
                    )}
                    {party.phoneNumbers &&
                      party.phoneNumbers.length > 0 &&
                      party.phoneNumbers.slice(0, 2).map(
                        (phone, index) =>
                          phone.number && (
                            <div key={index} className="text-muted">
                              <FontAwesomeIcon
                                icon={faPhone}
                                className="me-1"
                              />
                              {phone.label && <small>{phone.label}:</small>}{" "}
                              {phone.number}
                            </div>
                          )
                      )}
                    {party.phoneNumbers && party.phoneNumbers.length > 2 && (
                      <small className="text-muted">
                        +{party.phoneNumbers.length - 2} more
                      </small>
                    )}
                  </div>
                </td>

                <td onClick={() => onViewDetails(party)}>
                  <div>
                    {party.city && (
                      <span className="text-muted">{party.city}</span>
                    )}
                    {party.taluka && party.city && (
                      <span className="text-muted">, </span>
                    )}
                    {party.taluka && (
                      <span className="text-muted">{party.taluka}</span>
                    )}
                    {party.state && (party.city || party.taluka) && (
                      <div className="small text-muted">{party.state}</div>
                    )}
                    {!party.city && !party.taluka && !party.state && (
                      <span className="text-muted">-</span>
                    )}
                    {party.pincode && (
                      <div>
                        <small className="text-muted">
                          PIN: {party.pincode}
                        </small>
                      </div>
                    )}
                  </div>
                </td>

                <td onClick={() => onViewDetails(party)}>
                  <span className="text-muted">{party.gstNumber || "-"}</span>
                </td>

                <td>
                  <Dropdown>
                    <Dropdown.Toggle
                      variant="link"
                      className="p-0 border-0 text-muted"
                      id={`dropdown-${party.id}`}
                    >
                      <FontAwesomeIcon icon={faEllipsisV} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => onViewDetails(party)}>
                        <FontAwesomeIcon icon={faEye} className="me-2" />
                        View Details
                      </Dropdown.Item>

                      <Dropdown.Item onClick={() => onEditParty(party)}>
                        <FontAwesomeIcon icon={faEdit} className="me-2" />
                        Edit
                      </Dropdown.Item>

                      {/* ✅ NEW: Chat button in dropdown */}
                      <Dropdown.Divider />
                      <ChatButton party={party} />
                      <Dropdown.Divider />

                      <Dropdown.Item
                        onClick={() => onDeleteParty(party.id)}
                        className="text-danger"
                      >
                        <FontAwesomeIcon icon={faTrash} className="me-2" />
                        Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* ✅ NEW: Chat Modal */}
      <Modal
        show={chatModalOpen}
        onHide={() => {
          setChatModalOpen(false);
          setSelectedPartyForChat(null);
        }}
        size="lg"
        centered
        className="chat-modal"
      >
        <Modal.Body className="p-0">
          {selectedPartyForChat && (
            <PartyChat
              party={selectedPartyForChat}
              onClose={() => {
                setChatModalOpen(false);
                setSelectedPartyForChat(null);
              }}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* ✅ NEW: Chat loading overlay */}
      {chatLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 9999,
          }}
        >
          <div className="bg-white p-4 rounded shadow">
            <div className="d-flex align-items-center">
              <div
                className="spinner-border spinner-border-sm me-3"
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <span>Preparing chat...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartiesList;
