import React, {useState} from "react";
import {ListGroup, Badge, Button, Form, InputGroup} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUser,
  faBuilding,
  faTruck,
  faShoppingCart,
  faHeadset,
  faCircle,
  faSearch,
  faPlus,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
} from "@fortawesome/free-solid-svg-icons";

function ContactList({
  contacts = [],
  selectedContacts = [],
  onContactSelect,
  onStartChat,
  multiSelect = false,
  showActions = true,
  loading = false,
  searchPlaceholder = "Search contacts...",
  emptyMessage = "No contacts found",
  currentUser,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Get appropriate icon based on contact type
  const getTypeIcon = (type) => {
    switch (type) {
      case "supplier":
        return faTruck;
      case "buyer":
        return faShoppingCart;
      case "support":
        return faHeadset;
      case "user":
        return faUser;
      default:
        return faBuilding;
    }
  };

  // Get appropriate color for contact type
  const getTypeColor = (type) => {
    switch (type) {
      case "supplier":
        return "success";
      case "buyer":
        return "info";
      case "support":
        return "warning";
      case "user":
        return "primary";
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

  // Filter contacts based on search and type
  const getFilteredContacts = () => {
    let filtered = contacts;

    // Filter by search query
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(searchLower) ||
          contact.company?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.phone?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((contact) => contact.type === filterType);
    }

    return filtered;
  };

  // Check if contact is selected
  const isContactSelected = (contactId) => {
    return selectedContacts.some((contact) => contact.id === contactId);
  };

  // Handle contact selection
  const handleContactClick = (contact) => {
    if (multiSelect && onContactSelect) {
      onContactSelect(contact);
    } else if (onStartChat) {
      onStartChat(contact);
    }
  };

  // Get unique contact types for filter
  const getContactTypes = () => {
    const types = [...new Set(contacts.map((contact) => contact.type))];
    return types.filter((type) => type);
  };

  const filteredContacts = getFilteredContacts();

  return (
    <div className="contact-list h-100 d-flex flex-column">
      {/* Search and Filter Header */}
      <div className="flex-shrink-0 p-3 border-bottom bg-white">
        <div className="mb-3">
          <InputGroup>
            <InputGroup.Text className="bg-light border-end-0">
              <FontAwesomeIcon icon={faSearch} className="text-muted" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-start-0"
            />
          </InputGroup>
        </div>

        {/* Type Filter */}
        {getContactTypes().length > 0 && (
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant={filterType === "all" ? "primary" : "outline-secondary"}
              size="sm"
              onClick={() => setFilterType("all")}
            >
              All
            </Button>
            {getContactTypes().map((type) => (
              <Button
                key={type}
                variant={
                  filterType === type ? getTypeColor(type) : "outline-secondary"
                }
                size="sm"
                onClick={() => setFilterType(type)}
                className="text-capitalize"
              >
                <FontAwesomeIcon icon={getTypeIcon(type)} className="me-1" />
                {type}s
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="flex-grow-1 overflow-hidden">
        <div className="h-100 overflow-y-auto">
          {loading ? (
            <div className="d-flex align-items-center justify-content-center p-4">
              <div
                className="spinner-border spinner-border-sm me-2"
                role="status"
              />
              <span className="text-muted">Loading contacts...</span>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center p-4">
              <FontAwesomeIcon
                icon={faUser}
                className="text-muted mb-2"
                size="2x"
              />
              <h6 className="text-muted">{emptyMessage}</h6>
              {searchQuery && (
                <p className="text-muted small mb-0">
                  Try adjusting your search terms
                </p>
              )}
            </div>
          ) : (
            <ListGroup variant="flush">
              {filteredContacts.map((contact) => (
                <ListGroup.Item
                  key={contact.id}
                  action
                  className={`border-0 contact-item ${
                    isContactSelected(contact.id) ? "bg-light" : ""
                  }`}
                  onClick={() => handleContactClick(contact)}
                  style={{cursor: "pointer"}}
                >
                  <div className="d-flex align-items-center">
                    {/* Avatar with online indicator */}
                    <div className="position-relative me-3 flex-shrink-0">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold bg-${getTypeColor(
                          contact.type
                        )}`}
                        style={{
                          width: "50px",
                          height: "50px",
                          fontSize: "1rem",
                        }}
                      >
                        {getInitials(contact.name)}
                      </div>

                      {/* Online status indicator */}
                      {contact.isOnline && (
                        <div
                          className="position-absolute border border-white rounded-circle"
                          style={{
                            bottom: "2px",
                            right: "2px",
                            width: "12px",
                            height: "12px",
                            backgroundColor: getStatusColor(contact.status),
                          }}
                        />
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-grow-1 min-w-0">
                      {/* Name and type */}
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <div className="d-flex align-items-center min-w-0 flex-grow-1">
                          <h6 className="mb-0 me-2 text-truncate fw-semibold">
                            {contact.name}
                          </h6>
                          <FontAwesomeIcon
                            icon={getTypeIcon(contact.type)}
                            className={`text-${getTypeColor(
                              contact.type
                            )} flex-shrink-0`}
                            size="sm"
                            title={
                              contact.type?.charAt(0).toUpperCase() +
                              contact.type?.slice(1)
                            }
                          />
                        </div>

                        {/* Selection indicator */}
                        {multiSelect && isContactSelected(contact.id) && (
                          <Badge bg="primary" className="ms-2">
                            ✓
                          </Badge>
                        )}
                      </div>

                      {/* Company */}
                      {contact.company && (
                        <div className="small text-muted mb-1 d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={faBuilding}
                            className="me-1"
                            size="xs"
                          />
                          <span className="text-truncate">
                            {contact.company}
                          </span>
                        </div>
                      )}

                      {/* Contact details */}
                      <div className="small text-muted">
                        {contact.email && (
                          <div className="d-flex align-items-center mb-1">
                            <FontAwesomeIcon
                              icon={faEnvelope}
                              className="me-1"
                              size="xs"
                            />
                            <span className="text-truncate">
                              {contact.email}
                            </span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="d-flex align-items-center mb-1">
                            <FontAwesomeIcon
                              icon={faPhone}
                              className="me-1"
                              size="xs"
                            />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.location && (
                          <div className="d-flex align-items-center">
                            <FontAwesomeIcon
                              icon={faMapMarkerAlt}
                              className="me-1"
                              size="xs"
                            />
                            <span className="text-truncate">
                              {contact.location}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {showActions && (
                      <div className="flex-shrink-0 ms-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartChat && onStartChat(contact);
                          }}
                          title="Start chat"
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </Button>
                      </div>
                    )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      </div>

      {/* Selected contacts summary */}
      {multiSelect && selectedContacts.length > 0 && (
        <div className="flex-shrink-0 p-3 border-top bg-light">
          <div className="d-flex align-items-center justify-content-between">
            <small className="text-muted">
              {selectedContacts.length} contact
              {selectedContacts.length !== 1 ? "s" : ""} selected
            </small>
            {onStartChat && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onStartChat(selectedContacts)}
                disabled={selectedContacts.length === 0}
              >
                Start Group Chat
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactList;
