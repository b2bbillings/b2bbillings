import React, {useState} from "react";
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
  faTruck,
  faPlus,
  faFilter,
  faSort,
  faBoxes,
  faHandshake,
  faMapMarkerAlt,
  faCalendarAlt,
  faDollarSign,
  faClipboardList,
  faShippingFast,
  faStar,
  faUsers,
  faEye,
  faWarehouse,
  faIndustry,
} from "@fortawesome/free-solid-svg-icons";
import ChatList from "../Chat/ChatList";
import ContactList from "../Common/ContactList";

function SupplierChats({
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
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [viewMode, setViewMode] = useState("chats");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  // Filter chats to only show supplier conversations
  const supplierChats = chats.filter((chat) => chat.type === "supplier");
  const supplierContacts = contacts.filter(
    (contact) => contact.type === "supplier"
  );

  // Advanced filtering for supplier chats
  const getFilteredAndSortedChats = () => {
    let filtered = [...supplierChats];

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          chat.name?.toLowerCase().includes(searchLower) ||
          chat.company?.toLowerCase().includes(searchLower) ||
          chat.location?.toLowerCase().includes(searchLower) ||
          chat.products?.some((product) =>
            product.toLowerCase().includes(searchLower)
          ) ||
          chat.industry?.toLowerCase().includes(searchLower) ||
          chat.category?.toLowerCase().includes(searchLower)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (chat) => chat.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    if (locationFilter !== "all") {
      filtered = filtered.filter(
        (chat) =>
          chat.location?.toLowerCase().includes(locationFilter.toLowerCase()) ||
          chat.region?.toLowerCase() === locationFilter.toLowerCase()
      );
    }

    switch (filterBy) {
      case "active":
        filtered = filtered.filter(
          (chat) => chat.supplierStatus === "active" || chat.isActive
        );
        break;
      case "verified":
        filtered = filtered.filter(
          (chat) => chat.isVerified || chat.verificationStatus === "verified"
        );
        break;
      case "top_rated":
        filtered = filtered.filter((chat) => (chat.rating || 0) >= 4.0);
        break;
      case "local":
        filtered = filtered.filter(
          (chat) => chat.isLocal || (chat.distance && chat.distance <= 100)
        );
        break;
      case "contract":
        filtered = filtered.filter(
          (chat) => chat.hasContract || chat.contractStatus === "active"
        );
        break;
      case "all":
      default:
        break;
    }

    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "orders":
        filtered.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));
        break;
      case "location":
        filtered.sort((a, b) =>
          (a.location || "").localeCompare(b.location || "")
        );
        break;
      case "value":
        filtered.sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));
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

  // Get supplier statistics
  const getSupplierStats = () => {
    const totalSuppliers = supplierChats.length;
    const activeSuppliers = supplierChats.filter(
      (chat) => chat.supplierStatus === "active" || chat.isActive
    ).length;
    const verifiedSuppliers = supplierChats.filter(
      (chat) => chat.isVerified || chat.verificationStatus === "verified"
    ).length;
    const topRatedSuppliers = supplierChats.filter(
      (chat) => (chat.rating || 0) >= 4.0
    ).length;
    const contractSuppliers = supplierChats.filter(
      (chat) => chat.hasContract || chat.contractStatus === "active"
    ).length;
    const unreadSuppliers = supplierChats.filter(
      (chat) => chat.unreadCount > 0
    ).length;
    const totalOrders = supplierChats.reduce(
      (sum, chat) => sum + (chat.totalOrders || 0),
      0
    );
    const totalValue = supplierChats.reduce(
      (sum, chat) => sum + (chat.totalValue || 0),
      0
    );
    const averageRating =
      supplierChats.length > 0
        ? supplierChats.reduce((sum, chat) => sum + (chat.rating || 0), 0) /
          supplierChats.length
        : 0;

    return {
      totalSuppliers,
      activeSuppliers,
      verifiedSuppliers,
      topRatedSuppliers,
      contractSuppliers,
      unreadSuppliers,
      totalOrders,
      totalValue,
      averageRating,
    };
  };

  // Get unique categories
  const getCategories = () => {
    const categories = [
      ...new Set(supplierChats.map((chat) => chat.category).filter(Boolean)),
    ];
    return categories.sort();
  };

  // Get unique locations
  const getLocations = () => {
    const locations = [
      ...new Set(
        supplierChats
          .map((chat) => chat.region || chat.location)
          .filter(Boolean)
      ),
    ];
    return locations.sort();
  };

  // Handle new supplier chat
  const handleStartNewSupplierChat = (supplier) => {
    if (onStartNewChat) {
      onStartNewChat(supplier);
    }
    setShowNewSupplierModal(false);
    addToast?.(
      `Started conversation with supplier: ${supplier.name}`,
      "success"
    );
  };

  // Sort options for suppliers
  const sortOptions = [
    {key: "recent", label: "Most Recent"},
    {key: "name", label: "Company Name"},
    {key: "rating", label: "Highest Rated"},
    {key: "orders", label: "Most Orders"},
    {key: "value", label: "Total Value"},
    {key: "location", label: "Location"},
  ];

  // Filter options for suppliers
  const filterOptions = [
    {key: "all", label: "All", count: supplierChats.length},
    {key: "active", label: "Active", count: getSupplierStats().activeSuppliers},
    {
      key: "verified",
      label: "Verified",
      count: getSupplierStats().verifiedSuppliers,
    },
    {
      key: "top_rated",
      label: "Top",
      count: getSupplierStats().topRatedSuppliers,
    },
  ];

  const filteredChats = getFilteredAndSortedChats();
  const stats = getSupplierStats();
  const categories = getCategories();
  const locations = getLocations();

  return (
    <div className="supplier-chats h-100 d-flex flex-column">
      {/* Ultra Compact Header */}
      <div className="flex-shrink-0 p-2 border-bottom bg-white">
        {/* Single row header */}
        <div className="d-flex align-items-center justify-content-between mb-1">
          <div className="d-flex align-items-center">
            <FontAwesomeIcon
              icon={faTruck}
              className="me-2 text-success"
              size="sm"
            />
            <span className="fw-bold" style={{fontSize: "0.85rem"}}>
              Suppliers
            </span>

            {/* Inline compact stats */}
            <div className="d-flex gap-1 ms-2">
              <Badge bg="success" style={{fontSize: "0.6rem"}}>
                {stats.totalSuppliers}
              </Badge>
              {stats.unreadSuppliers > 0 && (
                <Badge bg="danger" style={{fontSize: "0.6rem"}}>
                  {stats.unreadSuppliers}
                </Badge>
              )}
              <Badge
                bg="outline-warning"
                text="warning"
                style={{fontSize: "0.6rem"}}
              >
                {stats.averageRating.toFixed(1)}★
              </Badge>
            </div>
          </div>

          {/* Compact action buttons */}
          <div className="d-flex gap-1">
            <Button
              variant={viewMode === "suppliers" ? "success" : "outline-success"}
              size="sm"
              onClick={() =>
                setViewMode(viewMode === "chats" ? "suppliers" : "chats")
              }
              style={{fontSize: "0.65rem", padding: "0.15rem 0.3rem"}}
            >
              <FontAwesomeIcon icon={faUsers} size="xs" />
            </Button>

            <Button
              variant="success"
              size="sm"
              onClick={() => setShowNewSupplierModal(true)}
              style={{fontSize: "0.65rem", padding: "0.15rem 0.3rem"}}
            >
              <FontAwesomeIcon icon={faPlus} size="xs" />
            </Button>
          </div>
        </div>

        {/* Compact metrics in single row */}
        <div className="mb-1">
          <div className="d-flex gap-1 flex-wrap">
            <Badge
              bg="outline-success"
              text="success"
              style={{fontSize: "0.55rem"}}
            >
              <FontAwesomeIcon icon={faHandshake} size="xs" className="me-1" />
              {stats.activeSuppliers}
            </Badge>
            <Badge
              bg="outline-primary"
              text="primary"
              style={{fontSize: "0.55rem"}}
            >
              <FontAwesomeIcon
                icon={faClipboardList}
                size="xs"
                className="me-1"
              />
              {stats.verifiedSuppliers}
            </Badge>
            <Badge bg="outline-info" text="info" style={{fontSize: "0.55rem"}}>
              <FontAwesomeIcon icon={faBoxes} size="xs" className="me-1" />
              {stats.totalOrders}
            </Badge>
            <Badge
              bg="outline-secondary"
              text="secondary"
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
              viewMode === "chats" ? "suppliers" : "contacts"
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
        {viewMode === "chats" && (
          <div className="d-flex align-items-center justify-content-between">
            {/* Filter buttons - reduced size */}
            <div className="d-flex gap-1 flex-wrap">
              {filterOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={
                    filterBy === option.key ? "success" : "outline-secondary"
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
              {/* Category filter */}
              {categories.length > 0 && (
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
                    <FontAwesomeIcon icon={faIndustry} size="xs" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Header style={{fontSize: "0.65rem"}}>
                      Category
                    </Dropdown.Header>
                    <Dropdown.Item
                      active={categoryFilter === "all"}
                      onClick={() => setCategoryFilter("all")}
                      style={{fontSize: "0.7rem"}}
                    >
                      All
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    {categories.map((category) => (
                      <Dropdown.Item
                        key={category}
                        active={categoryFilter === category}
                        onClick={() => setCategoryFilter(category)}
                        style={{fontSize: "0.7rem"}}
                      >
                        {category}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              )}

              {/* Location filter */}
              {locations.length > 0 && (
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
                    <FontAwesomeIcon icon={faMapMarkerAlt} size="xs" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Header style={{fontSize: "0.65rem"}}>
                      Location
                    </Dropdown.Header>
                    <Dropdown.Item
                      active={locationFilter === "all"}
                      onClick={() => setLocationFilter("all")}
                      style={{fontSize: "0.7rem"}}
                    >
                      All
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    {locations.map((location) => (
                      <Dropdown.Item
                        key={location}
                        active={locationFilter === location}
                        onClick={() => setLocationFilter(location)}
                        style={{fontSize: "0.7rem"}}
                      >
                        {location}
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
            contacts={supplierContacts}
            onStartChat={handleStartNewSupplierChat}
            searchPlaceholder="Search suppliers..."
            emptyMessage="No suppliers found"
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
            {viewMode === "chats"
              ? `${filteredChats.length}/${stats.totalSuppliers} suppliers`
              : `${supplierContacts.length} contacts`}
          </small>

          <div className="d-flex gap-2">
            <small className="text-muted" style={{fontSize: "0.65rem"}}>
              <FontAwesomeIcon icon={faStar} size="xs" className="me-1" />
              {stats.averageRating.toFixed(1)}
            </small>
            <small className="text-muted" style={{fontSize: "0.65rem"}}>
              <FontAwesomeIcon icon={faBoxes} size="xs" className="me-1" />
              {stats.totalOrders}
            </small>
          </div>
        </div>
      </div>

      {/* Compact Modal */}
      {showNewSupplierModal && (
        <div
          className="modal show d-block"
          style={{backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050}}
          onClick={() => setShowNewSupplierModal(false)}
        >
          <div
            className="modal-dialog modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header py-1">
                <h6 className="modal-title mb-0" style={{fontSize: "0.85rem"}}>
                  <FontAwesomeIcon icon={faTruck} className="me-2" />
                  Contact Supplier
                </h6>
                <button
                  type="button"
                  className="btn-close btn-sm"
                  onClick={() => setShowNewSupplierModal(false)}
                />
              </div>
              <div
                className="modal-body p-0"
                style={{maxHeight: "350px", overflowY: "auto"}}
              >
                <ContactList
                  contacts={supplierContacts}
                  onStartChat={handleStartNewSupplierChat}
                  searchPlaceholder="Search suppliers..."
                  emptyMessage="No suppliers available"
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

export default SupplierChats;
