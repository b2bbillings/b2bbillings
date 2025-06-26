import React, {useState, useEffect} from "react";
import {
  Card,
  Badge,
  Button,
  Dropdown,
  Row,
  Col,
  ProgressBar,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faQuestionCircle,
  faPlus,
  faFilter,
  faSort,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faChartLine,
  faUsers,
  faCalendarAlt,
  faDollarSign,
  faFileAlt,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import ChatList from "../Chat/ChatList";
import ContactList from "../Common/ContactList";
import EnquiryForm from "../Forms/EnquiryForm";

function EnquiryChats({
  chats = [],
  selectedChat,
  onChatSelect,
  onStartNewChat,
  contacts = [],
  loading = false,
  currentUser,
  addToast,
  mySuppliers = [], // Add this prop for supplier list
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterBy, setFilterBy] = useState("all");
  const [showNewEnquiryModal, setShowNewEnquiryModal] = useState(false);
  const [viewMode, setViewMode] = useState("enquiries");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Filter chats to only show enquiry conversations
  const enquiryChats = chats.filter(
    (chat) => chat.type === "enquiry" || chat.hasEnquiry || chat.inquiryStatus
  );
  const prospectContacts = contacts.filter(
    (contact) => contact.type === "prospect" || contact.hasInquired
  );

  // Advanced filtering for enquiry chats
  const getFilteredAndSortedChats = () => {
    let filtered = [...enquiryChats];

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          chat.name?.toLowerCase().includes(searchLower) ||
          chat.company?.toLowerCase().includes(searchLower) ||
          chat.enquiryTitle?.toLowerCase().includes(searchLower) ||
          chat.product?.toLowerCase().includes(searchLower) ||
          chat.industry?.toLowerCase().includes(searchLower)
      );
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((chat) => chat.priority === priorityFilter);
    }

    switch (filterBy) {
      case "pending":
        filtered = filtered.filter(
          (chat) =>
            chat.inquiryStatus === "pending" || chat.inquiryStatus === "new"
        );
        break;
      case "quoted":
        filtered = filtered.filter(
          (chat) => chat.inquiryStatus === "quoted" || chat.hasQuote
        );
        break;
      case "converted":
        filtered = filtered.filter(
          (chat) =>
            chat.inquiryStatus === "converted" || chat.inquiryStatus === "won"
        );
        break;
      case "expired":
        filtered = filtered.filter(
          (chat) => chat.inquiryStatus === "expired" || chat.isExpired
        );
        break;
      case "urgent":
        filtered = filtered.filter(
          (chat) =>
            chat.priority === "high" ||
            chat.isUrgent ||
            (chat.deadline &&
              new Date(chat.deadline) - new Date() < 7 * 24 * 60 * 60 * 1000)
        );
        break;
      case "all":
      default:
        break;
    }

    switch (sortBy) {
      case "urgency":
        filtered.sort((a, b) => {
          const urgencyOrder = {high: 3, medium: 2, low: 1};
          return (
            (urgencyOrder[b.priority] || 0) - (urgencyOrder[a.priority] || 0)
          );
        });
        break;
      case "value":
        filtered.sort(
          (a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0)
        );
        break;
      case "deadline":
        filtered.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        });
        break;
      case "status":
        filtered.sort((a, b) =>
          (a.inquiryStatus || "").localeCompare(b.inquiryStatus || "")
        );
        break;
      case "recent":
      default:
        filtered.sort(
          (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        );
        break;
    }

    return filtered;
  };

  // Get enquiry statistics
  const getEnquiryStats = () => {
    const totalEnquiries = enquiryChats.length;
    const pendingEnquiries = enquiryChats.filter(
      (chat) => chat.inquiryStatus === "pending" || chat.inquiryStatus === "new"
    ).length;
    const quotedEnquiries = enquiryChats.filter(
      (chat) => chat.inquiryStatus === "quoted" || chat.hasQuote
    ).length;
    const convertedEnquiries = enquiryChats.filter(
      (chat) =>
        chat.inquiryStatus === "converted" || chat.inquiryStatus === "won"
    ).length;
    const urgentEnquiries = enquiryChats.filter(
      (chat) => chat.priority === "high" || chat.isUrgent
    ).length;
    const expiredEnquiries = enquiryChats.filter(
      (chat) => chat.inquiryStatus === "expired" || chat.isExpired
    ).length;
    const totalValue = enquiryChats.reduce(
      (sum, chat) => sum + (chat.estimatedValue || 0),
      0
    );
    const conversionRate =
      totalEnquiries > 0 ? (convertedEnquiries / totalEnquiries) * 100 : 0;

    return {
      totalEnquiries,
      pendingEnquiries,
      quotedEnquiries,
      convertedEnquiries,
      urgentEnquiries,
      expiredEnquiries,
      totalValue,
      conversionRate,
    };
  };

  // Handle new enquiry from contact list (old method - for backwards compatibility)
  const handleStartNewEnquiry = (contact) => {
    if (onStartNewChat) {
      onStartNewChat(contact);
    }
    setShowNewEnquiryModal(false);
    addToast?.(`Started enquiry conversation with ${contact.name}`, "success");
  };

  // Handle enquiry form submission (new method)
  const handleEnquirySubmit = async (enquiryData) => {
    try {
      // Here you would call your API to submit the enquiry
      console.log("Enquiry Data:", enquiryData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create tracking entries for sent enquiries
      const enquiryId = `enq_${Date.now()}`;

      // If sending to selected suppliers
      if (enquiryData.selectedSuppliers.length > 0) {
        enquiryData.selectedSuppliers.forEach((supplierId) => {
          const supplier = mySuppliers.find((s) => s.id === supplierId);
          if (supplier && onStartNewChat) {
            const newChat = {
              id: `${enquiryId}_${supplierId}`,
              type: "enquiry",
              name: supplier.name,
              company: supplier.company,
              avatar: supplier.avatar,
              enquiryTitle: enquiryData.productName,
              product: enquiryData.productName,
              quantity: `${enquiryData.quantity} ${enquiryData.unit}`,
              estimatedValue: enquiryData.budgetPerUnit
                ? parseFloat(enquiryData.budgetPerUnit) *
                  parseFloat(enquiryData.quantity)
                : null,
              inquiryStatus: "pending",
              priority: "medium",
              deadline: enquiryData.deliveryDate,
              lastMessageTime: new Date().toISOString(),
              lastMessage: `Enquiry sent for ${enquiryData.productName}`,
              unreadCount: 0,
              isFromEnquiryForm: true,
              enquiryData: enquiryData,
            };
            // onStartNewChat(newChat);
          }
        });
      }

      // If sending to new suppliers, create a general tracking entry
      if (enquiryData.sendToNewSuppliers) {
        if (onStartNewChat) {
          const newChat = {
            id: `${enquiryId}_new_suppliers`,
            type: "enquiry",
            name: "New Suppliers",
            company: "Various Wholesalers",
            enquiryTitle: enquiryData.productName,
            product: enquiryData.productName,
            quantity: `${enquiryData.quantity} ${enquiryData.unit}`,
            estimatedValue: enquiryData.budgetPerUnit
              ? parseFloat(enquiryData.budgetPerUnit) *
                parseFloat(enquiryData.quantity)
              : null,
            inquiryStatus: "pending",
            priority: "medium",
            deadline: enquiryData.deliveryDate,
            lastMessageTime: new Date().toISOString(),
            lastMessage: `Enquiry broadcast to new suppliers for ${enquiryData.productName}`,
            unreadCount: 0,
            isFromEnquiryForm: true,
            isBroadcast: true,
            enquiryData: enquiryData,
          };
          // onStartNewChat(newChat);
        }
      }

      // Show success message
      let successMessage = "Enquiry sent successfully";
      if (
        enquiryData.selectedSuppliers.length > 0 &&
        enquiryData.sendToNewSuppliers
      ) {
        successMessage += ` to ${enquiryData.selectedSuppliers.length} of your suppliers and new suppliers across India!`;
      } else if (enquiryData.selectedSuppliers.length > 0) {
        successMessage += ` to ${enquiryData.selectedSuppliers.length} of your suppliers!`;
      } else if (enquiryData.sendToNewSuppliers) {
        successMessage += ` to new suppliers across India!`;
      }

      addToast?.(successMessage, "success");
    } catch (error) {
      console.error("Error submitting enquiry:", error);
      throw error; // Re-throw to be handled by the form
    }
  };

  // Sort options for enquiries
  const sortOptions = [
    {key: "recent", label: "Most Recent"},
    {key: "urgency", label: "Priority"},
    {key: "value", label: "Estimated Value"},
    {key: "deadline", label: "Deadline"},
    {key: "status", label: "Status"},
  ];

  // Filter options for enquiries
  const filterOptions = [
    {key: "all", label: "All", count: enquiryChats.length},
    {
      key: "pending",
      label: "Pending",
      count: getEnquiryStats().pendingEnquiries,
    },
    {key: "quoted", label: "Quoted", count: getEnquiryStats().quotedEnquiries},
    {key: "urgent", label: "Urgent", count: getEnquiryStats().urgentEnquiries},
    {
      key: "converted",
      label: "Won",
      count: getEnquiryStats().convertedEnquiries,
    },
  ];

  const filteredChats = getFilteredAndSortedChats();
  const stats = getEnquiryStats();

  return (
    <div className="enquiry-chats h-100 d-flex flex-column">
      {/* Ultra Compact Header */}
      <div className="flex-shrink-0 p-2 border-bottom bg-white">
        {/* Single row header */}
        <div className="d-flex align-items-center justify-content-between mb-1">
          <div className="d-flex align-items-center">
            <FontAwesomeIcon
              icon={faQuestionCircle}
              className="me-2 text-warning"
              size="sm"
            />
            <span className="fw-bold" style={{fontSize: "0.85rem"}}>
              Enquiries
            </span>

            {/* Inline compact stats */}
            <div className="d-flex gap-1 ms-2">
              <Badge bg="warning" style={{fontSize: "0.6rem"}}>
                {stats.totalEnquiries}
              </Badge>
              {stats.pendingEnquiries > 0 && (
                <Badge bg="info" style={{fontSize: "0.6rem"}}>
                  {stats.pendingEnquiries}
                </Badge>
              )}
              {stats.urgentEnquiries > 0 && (
                <Badge bg="danger" style={{fontSize: "0.6rem"}}>
                  {stats.urgentEnquiries}
                </Badge>
              )}
              <Badge
                bg="outline-success"
                text="success"
                style={{fontSize: "0.6rem"}}
              >
                {stats.conversionRate.toFixed(1)}%
              </Badge>
            </div>
          </div>

          {/* Enhanced action buttons */}
          <div className="d-flex gap-1">
            <Button
              variant={viewMode === "prospects" ? "warning" : "outline-warning"}
              size="sm"
              onClick={() =>
                setViewMode(
                  viewMode === "enquiries" ? "prospects" : "enquiries"
                )
              }
              style={{fontSize: "0.65rem", padding: "0.15rem 0.3rem"}}
            >
              <FontAwesomeIcon icon={faUsers} size="xs" />
            </Button>

            {/* Enhanced New Enquiry Button */}
            <Button
              variant="warning"
              size="sm"
              onClick={() => setShowNewEnquiryModal(true)}
              style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.8rem",
                fontWeight: "600",
                minWidth: "110px",
                boxShadow: "0 2px 4px rgba(255, 193, 7, 0.3)",
              }}
            >
              <FontAwesomeIcon icon={faPlus} size="xs" className="me-1" />
              New Enquiry
            </Button>
          </div>
        </div>

        {/* Compact metrics in single row */}
        <div className="mb-1">
          <div className="d-flex gap-1 flex-wrap">
            <Badge
              bg="outline-warning"
              text="warning"
              style={{fontSize: "0.55rem"}}
            >
              <FontAwesomeIcon icon={faClock} size="xs" className="me-1" />
              {stats.pendingEnquiries}
            </Badge>
            <Badge bg="outline-info" text="info" style={{fontSize: "0.55rem"}}>
              <FontAwesomeIcon icon={faFileAlt} size="xs" className="me-1" />
              {stats.quotedEnquiries}
            </Badge>
            <Badge
              bg="outline-success"
              text="success"
              style={{fontSize: "0.55rem"}}
            >
              <FontAwesomeIcon
                icon={faCheckCircle}
                size="xs"
                className="me-1"
              />
              {stats.convertedEnquiries}
            </Badge>
            <Badge
              bg="outline-primary"
              text="primary"
              style={{fontSize: "0.55rem"}}
            >
              <FontAwesomeIcon icon={faDollarSign} size="xs" className="me-1" />
              ${(stats.totalValue / 1000).toFixed(0)}K
            </Badge>
          </div>
        </div>

        {/* Compact search */}
        <div className="mb-1">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder={`Search ${
              viewMode === "enquiries" ? "enquiries" : "prospects"
            }...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              fontSize: "0.7rem",
              padding: "0.2rem 0.4rem",
              height: "28px",
            }}
          />
        </div>

        {/* Ultra compact filters */}
        {viewMode === "enquiries" && (
          <div className="d-flex align-items-center justify-content-between">
            {/* Filter buttons - reduced size */}
            <div className="d-flex gap-1 flex-wrap">
              {filterOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={
                    filterBy === option.key ? "warning" : "outline-secondary"
                  }
                  size="sm"
                  onClick={() => setFilterBy(option.key)}
                  style={{
                    fontSize: "0.6rem",
                    padding: "0.15rem 0.25rem",
                    minWidth: "fit-content",
                    height: "24px",
                  }}
                >
                  {option.label}
                  {option.count > 0 && filterBy === option.key && (
                    <Badge
                      bg="light"
                      text="dark"
                      className="ms-1"
                      style={{fontSize: "0.5rem"}}
                    >
                      {option.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Ultra compact controls */}
            <div className="d-flex gap-1">
              {/* Priority filter */}
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  size="sm"
                  style={{
                    fontSize: "0.6rem",
                    padding: "0.15rem 0.25rem",
                    height: "24px",
                    width: "24px",
                  }}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} size="xs" />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Header style={{fontSize: "0.65rem"}}>
                    Priority
                  </Dropdown.Header>
                  <Dropdown.Item
                    active={priorityFilter === "all"}
                    onClick={() => setPriorityFilter("all")}
                    style={{fontSize: "0.7rem"}}
                  >
                    All
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    active={priorityFilter === "high"}
                    onClick={() => setPriorityFilter("high")}
                    className="text-danger"
                    style={{fontSize: "0.7rem"}}
                  >
                    High
                  </Dropdown.Item>
                  <Dropdown.Item
                    active={priorityFilter === "medium"}
                    onClick={() => setPriorityFilter("medium")}
                    className="text-warning"
                    style={{fontSize: "0.7rem"}}
                  >
                    Medium
                  </Dropdown.Item>
                  <Dropdown.Item
                    active={priorityFilter === "low"}
                    onClick={() => setPriorityFilter("low")}
                    className="text-success"
                    style={{fontSize: "0.7rem"}}
                  >
                    Low
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {/* Sort dropdown */}
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  size="sm"
                  style={{
                    fontSize: "0.6rem",
                    padding: "0.15rem 0.25rem",
                    height: "24px",
                    width: "24px",
                  }}
                >
                  <FontAwesomeIcon icon={faSort} size="xs" />
                </Dropdown.Toggle>
                <Dropdown.Menu align="end">
                  <Dropdown.Header style={{fontSize: "0.65rem"}}>
                    Sort by
                  </Dropdown.Header>
                  {sortOptions.map((option) => (
                    <Dropdown.Item
                      key={option.key}
                      active={sortBy === option.key}
                      onClick={() => setSortBy(option.key)}
                      style={{fontSize: "0.7rem"}}
                    >
                      {option.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow-1 overflow-hidden" style={{minHeight: 0}}>
        {viewMode === "enquiries" ? (
          <ChatList
            chats={filteredChats}
            selectedChat={selectedChat}
            onChatSelect={onChatSelect}
            loading={loading}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : (
          <ContactList
            contacts={prospectContacts}
            onStartChat={handleStartNewEnquiry}
            searchPlaceholder="Search prospects..."
            emptyMessage="No prospects found"
            currentUser={currentUser}
            showActions={true}
          />
        )}
      </div>

      {/* Ultra compact footer */}
      <div
        className="flex-shrink-0 p-1 border-top bg-light"
        style={{
          minHeight: "32px",
          position: "sticky",
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <small className="text-muted" style={{fontSize: "0.65rem"}}>
            {viewMode === "enquiries"
              ? `${filteredChats.length}/${stats.totalEnquiries} enquiries`
              : `${prospectContacts.length} prospects`}
          </small>

          <div className="d-flex gap-2">
            <small className="text-muted" style={{fontSize: "0.65rem"}}>
              <FontAwesomeIcon icon={faDollarSign} size="xs" className="me-1" />
              Avg: $
              {stats.totalEnquiries > 0
                ? Math.round(stats.totalValue / stats.totalEnquiries)
                : 0}
            </small>
            <small className="text-muted" style={{fontSize: "0.65rem"}}>
              <FontAwesomeIcon icon={faChartLine} size="xs" className="me-1" />
              {stats.conversionRate.toFixed(1)}%
            </small>
          </div>
        </div>
      </div>

      {/* Enhanced Enquiry Form Modal */}
      <EnquiryForm
        show={showNewEnquiryModal}
        onHide={() => setShowNewEnquiryModal(false)}
        mySuppliers={mySuppliers}
        onSubmit={handleEnquirySubmit}
        loading={loading}
        currentUser={currentUser}
        addToast={addToast}
      />
    </div>
  );
}

export default EnquiryChats;
