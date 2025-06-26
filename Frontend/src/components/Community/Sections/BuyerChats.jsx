import React, {useState, useEffect} from "react";
import {Card, Badge, Button, Dropdown, Row, Col} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faPlus,
  faFilter,
  faSort,
  faMapMarkerAlt,
  faDollarSign,
  faCalendarAlt,
  faHandshake,
  faEye,
  faChartLine,
  faUsers,
  faStar,
  faBoxes,
} from "@fortawesome/free-solid-svg-icons";
import ChatList from "../Chat/ChatList";
import ContactList from "../Common/ContactList";

function BuyerChats({
  chats = [],
  selectedChat,
  onChatSelect,
  onStartNewChat,
  contacts = [],
  loading = false,
  currentUser,
  addToast,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterBy, setFilterBy] = useState("all");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [viewMode, setViewMode] = useState("chats");
  const [selectedRegion, setSelectedRegion] = useState("all");

  // Filter chats to only show buyer conversations
  const buyerChats = chats.filter((chat) => chat.type === "buyer");
  const buyerContacts = contacts.filter((contact) => contact.type === "buyer");

  // Advanced filtering for buyer chats
  const getFilteredAndSortedChats = () => {
    let filtered = [...buyerChats];

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          chat.name?.toLowerCase().includes(searchLower) ||
          chat.company?.toLowerCase().includes(searchLower) ||
          chat.location?.toLowerCase().includes(searchLower) ||
          chat.lastMessage?.toLowerCase().includes(searchLower) ||
          chat.industry?.toLowerCase().includes(searchLower)
      );
    }

    // Apply region filter
    if (selectedRegion !== "all") {
      filtered = filtered.filter(
        (chat) => chat.region?.toLowerCase() === selectedRegion.toLowerCase()
      );
    }

    // Apply buyer-specific filters
    switch (filterBy) {
      case "active":
        filtered = filtered.filter(
          (chat) => chat.buyerStatus === "active" || chat.recentActivity
        );
        break;
      case "potential":
        filtered = filtered.filter(
          (chat) =>
            chat.buyerStatus === "potential" || chat.inquiryStatus === "pending"
        );
        break;
      case "priority":
        filtered = filtered.filter(
          (chat) => chat.priority === "high" || chat.orderValue >= 10000
        );
        break;
      case "all":
      default:
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "location":
        filtered.sort((a, b) =>
          (a.location || "").localeCompare(b.location || "")
        );
        break;
      case "activity":
        filtered.sort(
          (a, b) => (b.activityScore || 0) - (a.activityScore || 0)
        );
        break;
      case "orderValue":
        filtered.sort((a, b) => (b.orderValue || 0) - (a.orderValue || 0));
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

  // Get buyer statistics
  const getBuyerStats = () => {
    const totalBuyers = buyerChats.length;
    const activeBuyers = buyerChats.filter(
      (chat) => chat.buyerStatus === "active"
    ).length;
    const potentialBuyers = buyerChats.filter(
      (chat) => chat.buyerStatus === "potential"
    ).length;
    const highValueBuyers = buyerChats.filter(
      (chat) => (chat.orderValue || 0) >= 10000
    ).length;
    const unreadBuyers = buyerChats.filter(
      (chat) => chat.unreadCount > 0
    ).length;
    const totalOrderValue = buyerChats.reduce(
      (sum, chat) => sum + (chat.orderValue || 0),
      0
    );

    return {
      totalBuyers,
      activeBuyers,
      potentialBuyers,
      highValueBuyers,
      unreadBuyers,
      totalOrderValue,
    };
  };

  // Get unique regions
  const getRegions = () => {
    const regions = [
      ...new Set(buyerChats.map((chat) => chat.region).filter(Boolean)),
    ];
    return regions.sort();
  };

  // Handle new buyer chat
  const handleStartNewBuyerChat = (buyer) => {
    if (onStartNewChat) {
      onStartNewChat(buyer);
    }
    setShowNewChatModal(false);
    addToast?.(`Started conversation with buyer: ${buyer.name}`, "success");
  };

  // Sort options for buyers
  const sortOptions = [
    {key: "recent", label: "Most Recent"},
    {key: "name", label: "Company Name"},
    {key: "location", label: "Location"},
    {key: "activity", label: "Activity Score"},
    {key: "orderValue", label: "Order Value"},
  ];

  // Filter options for buyers
  const filterOptions = [
    {key: "all", label: "All", count: buyerChats.length},
    {key: "active", label: "Active", count: getBuyerStats().activeBuyers},
    {
      key: "potential",
      label: "Potential",
      count: getBuyerStats().potentialBuyers,
    },
    {
      key: "priority",
      label: "High Value",
      count: getBuyerStats().highValueBuyers,
    },
  ];

  const filteredChats = getFilteredAndSortedChats();
  const stats = getBuyerStats();
  const regions = getRegions();

  return (
    <div className="buyer-chats h-100 d-flex flex-column">
      {/* Compact Header */}
      <div className="flex-shrink-0 p-2 border-bottom bg-white">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center">
            <FontAwesomeIcon
              icon={faShoppingCart}
              className="me-2 text-info"
              size="sm"
            />
            <span className="fw-bold" style={{fontSize: "0.85rem"}}>
              Buyers
            </span>

            {/* Compact Stats */}
            <div className="d-flex gap-1 ms-3">
              <Badge bg="info" style={{fontSize: "0.65rem"}}>
                {stats.totalBuyers}
              </Badge>
              {stats.unreadBuyers > 0 && (
                <Badge bg="danger" style={{fontSize: "0.65rem"}}>
                  {stats.unreadBuyers}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="d-flex gap-1">
            <Button
              variant={viewMode === "buyers" ? "info" : "outline-info"}
              size="sm"
              onClick={() =>
                setViewMode(viewMode === "chats" ? "buyers" : "chats")
              }
              style={{fontSize: "0.7rem", padding: "0.2rem 0.4rem"}}
            >
              <FontAwesomeIcon icon={faUsers} size="xs" />
            </Button>

            <Button
              variant="success"
              size="sm"
              onClick={() => setShowNewChatModal(true)}
              style={{fontSize: "0.7rem", padding: "0.2rem 0.4rem"}}
            >
              <FontAwesomeIcon icon={faPlus} size="xs" />
            </Button>
          </div>
        </div>

        {/* Compact Metrics */}
        <div className="mb-2">
          <div className="d-flex gap-1 flex-wrap">
            <Badge bg="outline-info" text="info" style={{fontSize: "0.6rem"}}>
              <FontAwesomeIcon icon={faHandshake} size="xs" className="me-1" />
              {stats.activeBuyers} Active
            </Badge>
            <Badge
              bg="outline-warning"
              text="warning"
              style={{fontSize: "0.6rem"}}
            >
              <FontAwesomeIcon icon={faDollarSign} size="xs" className="me-1" />
              ${(stats.totalOrderValue / 1000).toFixed(0)}K
            </Badge>
            <Badge
              bg="outline-secondary"
              text="secondary"
              style={{fontSize: "0.6rem"}}
            >
              <FontAwesomeIcon icon={faChartLine} size="xs" className="me-1" />
              {stats.potentialBuyers} Potential
            </Badge>
            <Badge
              bg="outline-primary"
              text="primary"
              style={{fontSize: "0.6rem"}}
            >
              <FontAwesomeIcon
                icon={faMapMarkerAlt}
                size="xs"
                className="me-1"
              />
              {regions.length} Regions
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="mb-2">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder={`Search ${
              viewMode === "chats" ? "buyer chats" : "buyers"
            }...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{fontSize: "0.75rem", padding: "0.25rem 0.5rem"}}
          />
        </div>

        {/* Compact Filters */}
        {viewMode === "chats" && (
          <div className="d-flex align-items-center justify-content-between">
            {/* Filter buttons */}
            <div className="d-flex gap-1 flex-wrap">
              {filterOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={
                    filterBy === option.key ? "info" : "outline-secondary"
                  }
                  size="sm"
                  onClick={() => setFilterBy(option.key)}
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.2rem 0.3rem",
                    minWidth: "fit-content",
                  }}
                >
                  {option.label}
                  {option.count > 0 && (
                    <Badge
                      bg={filterBy === option.key ? "light" : "info"}
                      text={filterBy === option.key ? "dark" : "white"}
                      className="ms-1"
                      style={{fontSize: "0.55rem"}}
                    >
                      {option.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Compact Controls */}
            <div className="d-flex gap-1">
              {/* Region filter */}
              {regions.length > 0 && (
                <Dropdown>
                  <Dropdown.Toggle
                    variant="outline-secondary"
                    size="sm"
                    style={{fontSize: "0.65rem", padding: "0.2rem 0.3rem"}}
                  >
                    <FontAwesomeIcon icon={faMapMarkerAlt} size="xs" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Header style={{fontSize: "0.7rem"}}>
                      Region:
                    </Dropdown.Header>
                    <Dropdown.Item
                      active={selectedRegion === "all"}
                      onClick={() => setSelectedRegion("all")}
                      style={{fontSize: "0.75rem"}}
                    >
                      All Regions
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    {regions.map((region) => (
                      <Dropdown.Item
                        key={region}
                        active={selectedRegion === region}
                        onClick={() => setSelectedRegion(region)}
                        style={{fontSize: "0.75rem"}}
                      >
                        {region}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              )}

              {/* Sort dropdown */}
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  size="sm"
                  style={{fontSize: "0.65rem", padding: "0.2rem 0.3rem"}}
                >
                  <FontAwesomeIcon icon={faSort} size="xs" />
                </Dropdown.Toggle>
                <Dropdown.Menu align="end">
                  <Dropdown.Header style={{fontSize: "0.7rem"}}>
                    Sort by:
                  </Dropdown.Header>
                  {sortOptions.map((option) => (
                    <Dropdown.Item
                      key={option.key}
                      active={sortBy === option.key}
                      onClick={() => setSortBy(option.key)}
                      style={{fontSize: "0.75rem"}}
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
        {viewMode === "chats" ? (
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
            contacts={buyerContacts}
            onStartChat={handleStartNewBuyerChat}
            searchPlaceholder="Search buyers..."
            emptyMessage="No buyers found"
            currentUser={currentUser}
            showActions={true}
          />
        )}
      </div>

      {/* Sticky Footer */}
      <div
        className="flex-shrink-0 p-2 border-top bg-light"
        style={{
          minHeight: "40px",
          position: "sticky",
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <small className="text-muted" style={{fontSize: "0.7rem"}}>
            {viewMode === "chats"
              ? `${filteredChats.length} of ${stats.totalBuyers} buyer chats`
              : `${buyerContacts.length} buyers`}
          </small>

          <div className="d-flex gap-2">
            <small className="text-muted" style={{fontSize: "0.7rem"}}>
              <FontAwesomeIcon icon={faDollarSign} size="xs" className="me-1" />
              Avg: $
              {stats.totalBuyers > 0
                ? Math.round(stats.totalOrderValue / stats.totalBuyers)
                : 0}
            </small>
            <small className="text-muted" style={{fontSize: "0.7rem"}}>
              <FontAwesomeIcon icon={faHandshake} size="xs" className="me-1" />
              {stats.activeBuyers} Active
            </small>
          </div>
        </div>
      </div>

      {/* Compact Modal */}
      {showNewChatModal && (
        <div
          className="modal show d-block"
          style={{backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050}}
          onClick={() => setShowNewChatModal(false)}
        >
          <div
            className="modal-dialog modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header py-2">
                <h6 className="modal-title mb-0" style={{fontSize: "0.9rem"}}>
                  <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                  Contact Buyer
                </h6>
                <button
                  type="button"
                  className="btn-close btn-sm"
                  onClick={() => setShowNewChatModal(false)}
                />
              </div>
              <div
                className="modal-body p-0"
                style={{maxHeight: "400px", overflowY: "auto"}}
              >
                <ContactList
                  contacts={buyerContacts}
                  onStartChat={handleStartNewBuyerChat}
                  searchPlaceholder="Search buyers..."
                  emptyMessage="No buyers available"
                  currentUser={currentUser}
                  showActions={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuyerChats;
