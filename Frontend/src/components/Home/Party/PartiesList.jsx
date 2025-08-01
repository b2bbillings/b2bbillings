import React from "react";
import {Table, Badge, Dropdown} from "react-bootstrap";
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

// ✅ UPDATED: Import chat context instead of PartyChat component
import {useChatContext} from "../../../context/chatContext";
import partyService from "../../../services/partyService";

function PartiesList({parties, onViewDetails, onEditParty, onDeleteParty}) {
  // ✅ UPDATED: Use chat context instead of local state
  const {openChat, setLoading, chatState, isChatOpen} = useChatContext();

  // ✅ UPDATED: Chat button component using context
  const ChatButton = ({party}) => {
    const chatValidation = partyService.validatePartyChatCapability(party);
    const isThisChatOpen = isChatOpen(party._id || party.id);

    const handleOpenChat = async (e) => {
      e.stopPropagation(); // Prevent row click

      if (!chatValidation.canChat) {
        alert(`Cannot start chat: ${chatValidation.reason}`);
        return;
      }

      // ✅ If chat is already open for this party, don't open again
      if (isThisChatOpen) {
        return;
      }

      try {
        setLoading(true);

        // ✅ Get fresh party data with chat fields
        const partyResponse = await partyService.getPartyForChat(
          party._id || party.id
        );

        if (!partyResponse.success) {
          throw new Error("Failed to fetch party data");
        }

        const freshPartyData = partyResponse.data;

        // ✅ UPDATED: Use context to open chat instead of local state
        openChat(freshPartyData, "modal");
      } catch (error) {
        console.error("❌ Error opening chat:", error);
        alert("Failed to open chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dropdown.Item
        onClick={handleOpenChat}
        disabled={
          !chatValidation.canChat || chatState.loading || isThisChatOpen
        }
        className={chatValidation.canChat ? "text-primary" : "text-muted"}
      >
        <FontAwesomeIcon
          icon={
            isThisChatOpen
              ? faComments
              : chatValidation.canChat
              ? faComments
              : faExclamationTriangle
          }
          className="me-2"
        />
        {chatState.loading && chatState.party?._id === party._id
          ? "Loading..."
          : isThisChatOpen
          ? "Chat Open"
          : chatValidation.canChat
          ? "Start Chat"
          : "No Chat Link"}
        {chatValidation.canChat && !isThisChatOpen && (
          <div className="small text-muted mt-1">
            with {chatValidation.chatCompanyName}
          </div>
        )}
        {isThisChatOpen && (
          <div className="small text-success mt-1">Currently active</div>
        )}
      </Dropdown.Item>
    );
  };

  // ✅ Chat status indicator component (unchanged)
  const ChatStatusIndicator = ({party}) => {
    const chatValidation = partyService.validatePartyChatCapability(party);
    const isThisChatOpen = isChatOpen(party._id || party.id);

    if (!chatValidation.canChat) return null;

    return (
      <div className="mt-1">
        <small
          className={isThisChatOpen ? "text-success fw-bold" : "text-success"}
        >
          <FontAwesomeIcon icon={faLink} className="me-1" />
          {isThisChatOpen ? "Chat Active" : "Chat Available"}
        </small>
      </div>
    );
  };

  // ✅ Enhanced party type badge with chat indicator (unchanged)
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

        {/* Chat availability indicator */}
        <ChatStatusIndicator party={party} />

        {/* Linked company info */}
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
            {parties.map((party) => {
              const isThisChatOpen = isChatOpen(party._id || party.id);

              return (
                <tr
                  key={party.id}
                  className={`party-row-clickable ${
                    isThisChatOpen ? "table-success" : ""
                  }`}
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
                          {/* ✅ UPDATED: Enhanced chat indicator */}
                          {party.canChat && (
                            <Badge
                              bg={isThisChatOpen ? "success" : "secondary"}
                              className="ms-2"
                            >
                              💬 {isThisChatOpen ? "Active" : ""}
                            </Badge>
                          )}
                        </div>
                        {party.email && (
                          <small className="text-muted">
                            <FontAwesomeIcon
                              icon={faEnvelope}
                              className="me-1"
                            />
                            {party.email}
                          </small>
                        )}
                      </div>
                    </div>
                  </td>

                  <td onClick={() => onViewDetails(party)}>
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

                        {/* ✅ UPDATED: Chat button using context */}
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
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* ✅ REMOVED: No need for local chat modal or loading overlay */}
      {/* Chat modal and loading are now handled by ChatContext */}
    </div>
  );
}

export default PartiesList;
