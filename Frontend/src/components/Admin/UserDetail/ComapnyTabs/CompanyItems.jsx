import React, {useState, useEffect} from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Badge,
  Form,
  InputGroup,
  Spinner,
  Alert,
  Modal,
  Dropdown,
  Tabs,
  Tab,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBoxes,
  faSearch,
  faDownload,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faEllipsisV,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faSort,
  faIndustry,
  faCog,
  faChartLine,
  faExclamationCircle,
  faSync,
  faRupeeSign,
} from "@fortawesome/free-solid-svg-icons";
import itemService from "../../../../services/itemService";

function CompanyItems({companyId, companyData, userRole, addToast}) {
  // ✅ State management
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [activeTab, setActiveTab] = useState("all");

  // ✅ Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  // ✅ Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  // ✅ Stats state
  const [stats, setStats] = useState({
    totalItems: 0,
    totalProducts: 0,
    totalServices: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalStockValue: 0,
    activeItems: 0,
    inactiveItems: 0,
  });

  // ✅ Load data on component mount
  useEffect(() => {
    if (companyId) {
      loadCompanyItems();
      loadCategories();
    }
  }, [companyId, pagination.page, pagination.limit]);

  // ✅ Apply filters when data or filters change
  useEffect(() => {
    filterAndSortItems();
  }, [
    items,
    searchQuery,
    typeFilter,
    categoryFilter,
    stockFilter,
    statusFilter,
    sortBy,
    sortDirection,
    activeTab,
  ]);

  // ✅ Load company items
  const loadCompanyItems = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/companies/${companyId}/items`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data?.items) {
        const itemsData = data.data.items;
        setItems(itemsData);

        setPagination((prev) => ({
          ...prev,
          total: data.data.pagination?.totalItems || itemsData.length,
          pages: Math.ceil(
            (data.data.pagination?.totalItems || itemsData.length) / prev.limit
          ),
        }));

        calculateStats(itemsData);
        addToast?.(`Successfully loaded ${itemsData.length} items`, "success");
      } else {
        throw new Error("No items found in response");
      }
    } catch (error) {
      console.error("❌ Error loading items:", error);
      setError(error.message);
      addToast?.(error.message, "error");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Load categories
  const loadCategories = async () => {
    try {
      const response = await itemService.getCategories(companyId);
      if (response.success) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      setCategories([]);
    }
  };

  // ✅ Calculate statistics
  const calculateStats = (itemsData) => {
    if (!Array.isArray(itemsData)) {
      setStats({
        totalItems: 0,
        totalProducts: 0,
        totalServices: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalStockValue: 0,
        activeItems: 0,
        inactiveItems: 0,
      });
      return;
    }

    const totalItems = itemsData.length;
    const products = itemsData.filter((item) => item.type === "product");
    const services = itemsData.filter((item) => item.type === "service");

    const activeItems = itemsData.filter(
      (item) => item.isActive !== false
    ).length;
    const inactiveItems = totalItems - activeItems;

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockValue = 0;

    products.forEach((item) => {
      const currentStock = Number(item.currentStock || 0);
      const minStock = Number(
        item.minStockLevel || item.minStockToMaintain || 0
      );
      const salePrice = Number(item.salePrice || 0);

      totalStockValue += currentStock * salePrice;

      if (currentStock === 0) {
        outOfStockCount++;
      } else if (minStock > 0 && currentStock <= minStock) {
        lowStockCount++;
      }
    });

    const newStats = {
      totalItems,
      totalProducts: products.length,
      totalServices: services.length,
      lowStockItems: lowStockCount,
      outOfStockItems: outOfStockCount,
      totalStockValue,
      activeItems,
      inactiveItems,
    };

    console.log("📊 Calculated item stats:", newStats);
    setStats(newStats);
  };

  // ✅ Handle card click for filtering
  const handleCardClick = (filterType, filterValue) => {
    console.log("🔄 Card clicked:", filterType, filterValue);

    // Reset all filters first
    setSearchQuery("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setStockFilter("all");
    setStatusFilter("all");

    // Apply the specific filter
    switch (filterType) {
      case "tab":
        setActiveTab(filterValue);
        break;
      case "stock":
        setActiveTab("all");
        setStockFilter(filterValue);
        break;
      case "status":
        setActiveTab("all");
        setStatusFilter(filterValue);
        break;
      default:
        setActiveTab(filterValue);
    }
  };

  // ✅ Filter and sort items
  const filterAndSortItems = () => {
    let filtered = [...items];

    console.log("🔍 Filtering items:", {
      totalItems: items.length,
      activeTab,
      typeFilter,
      categoryFilter,
      stockFilter,
      statusFilter,
      searchQuery,
    });

    // ✅ Apply tab filter first
    if (activeTab !== "all") {
      filtered = filtered.filter((item) => item.type === activeTab);
      console.log(`📋 After tab filter (${activeTab}):`, filtered.length);
    }

    // ✅ Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.itemCode?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
      );
      console.log(`🔍 After search filter:`, filtered.length);
    }

    // ✅ Apply type filter (only if different from tab)
    if (typeFilter !== "all" && typeFilter !== activeTab) {
      filtered = filtered.filter((item) => item.type === typeFilter);
      console.log(`🏷️ After type filter (${typeFilter}):`, filtered.length);
    }

    // ✅ Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
      console.log(
        `📂 After category filter (${categoryFilter}):`,
        filtered.length
      );
    }

    // ✅ Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => {
        const isActive = item.isActive !== false;
        return statusFilter === "active" ? isActive : !isActive;
      });
      console.log(`✅ After status filter (${statusFilter}):`, filtered.length);
    }

    // ✅ Apply stock filter
    if (stockFilter !== "all") {
      filtered = filtered.filter((item) => {
        if (item.type === "service") return stockFilter === "service";

        const currentStock = Number(item.currentStock || 0);
        const minStock = Number(
          item.minStockLevel || item.minStockToMaintain || 0
        );

        switch (stockFilter) {
          case "inStock":
            return currentStock > minStock;
          case "lowStock":
            return minStock > 0 && currentStock > 0 && currentStock <= minStock;
          case "outOfStock":
            return currentStock === 0;
          default:
            return true;
        }
      });
      console.log(`📦 After stock filter (${stockFilter}):`, filtered.length);
    }

    // ✅ Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (
        sortBy === "currentStock" ||
        sortBy === "salePrice" ||
        sortBy === "buyPrice"
      ) {
        aValue = Number(aValue || 0);
        bValue = Number(bValue || 0);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || "";
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    console.log("✅ Final filtered items:", filtered.length);
    setFilteredItems(filtered);
  };

  // ✅ Get type badge
  const getTypeBadge = (type) => {
    const variants = {
      product: {bg: "primary", label: "PRODUCT"},
      service: {bg: "info", label: "SERVICE"},
    };

    const config = variants[type] || {
      bg: "secondary",
      label: "UNKNOWN",
    };

    return (
      <Badge bg={config.bg} className="fw-normal">
        {config.label}
      </Badge>
    );
  };

  // ✅ Get stock badge
  const getStockBadge = (item) => {
    if (item.type === "service") {
      return (
        <Badge bg="light" text="muted" className="fw-normal">
          N/A
        </Badge>
      );
    }

    const currentStock = Number(item.currentStock || 0);
    const minStock = Number(item.minStockLevel || item.minStockToMaintain || 0);

    if (currentStock === 0) {
      return (
        <Badge bg="danger" className="fw-normal">
          Out of Stock
        </Badge>
      );
    } else if (minStock > 0 && currentStock <= minStock) {
      return (
        <Badge bg="warning" text="dark" className="fw-normal">
          Low Stock
        </Badge>
      );
    } else {
      return (
        <Badge bg="success" className="fw-normal">
          In Stock
        </Badge>
      );
    }
  };

  // ✅ Handle item actions
  const handleItemAction = async (action, item) => {
    setIsLoadingAction(true);

    try {
      switch (action) {
        case "view":
          setSelectedItem(item);
          setShowItemModal(true);
          break;
        case "edit":
          addToast?.(`Edit functionality for ${item.name} coming soon`, "info");
          break;
        case "delete":
          setSelectedItem(item);
          setShowDeleteModal(true);
          break;
        case "adjustStock":
          addToast?.(`Stock adjustment for ${item.name} coming soon`, "info");
          break;
        case "refresh":
          await loadCompanyItems();
          break;
        default:
          addToast?.("Action not implemented", "info");
      }
    } catch (error) {
      addToast?.(error.message || "Action failed", "error");
    } finally {
      setIsLoadingAction(false);
    }
  };

  // ✅ Handle delete item
  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      setIsLoadingAction(true);

      const response = await itemService.deleteItem(
        companyId,
        selectedItem._id || selectedItem.id
      );

      if (response.success) {
        addToast?.(`${selectedItem.name} deleted successfully`, "success");
        setShowDeleteModal(false);
        setSelectedItem(null);
        await loadCompanyItems();
      } else {
        throw new Error(response.message || "Failed to delete item");
      }
    } catch (error) {
      addToast?.(error.message || "Failed to delete item", "error");
    } finally {
      setIsLoadingAction(false);
    }
  };

  // ✅ Handle export
  const handleExport = async () => {
    try {
      setIsLoadingAction(true);

      const params = {
        format: "csv",
        search: searchQuery,
        type: typeFilter !== "all" ? typeFilter : "",
        category: categoryFilter !== "all" ? categoryFilter : "",
      };

      if (userRole === "admin" || userRole === "owner") {
        await itemService.exportAllItemsAdmin(companyId, params);
      } else {
        addToast?.("Export functionality coming soon for this role", "info");
      }
    } catch (error) {
      addToast?.(error.message || "Export failed", "error");
    } finally {
      setIsLoadingAction(false);
    }
  };

  // ✅ Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setStockFilter("all");
    setStatusFilter("all");
    setActiveTab("all");
    addToast?.("All filters cleared", "info");
  };

  // ✅ Handle pagination
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // ✅ Utility functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ✅ Loading state
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <h5 className="mt-3 text-muted">Loading company items...</h5>
        </Card.Body>
      </Card>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Error Loading Items
            </Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={loadCompanyItems}>
              Try Again
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      {/* Stats Cards - Clickable */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "all" &&
              stockFilter === "all" &&
              statusFilter === "all"
                ? "active-card"
                : ""
            }`}
            onClick={() => handleCardClick("tab", "all")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faBoxes}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.totalItems}</h4>
              <small className="text-muted">Total Items</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "product" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("tab", "product")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faIndustry}
                className="stat-icon text-primary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.totalProducts}</h4>
              <small className="text-muted">Products</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              activeTab === "service" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("tab", "service")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faCog}
                className="stat-icon text-info mb-2"
              />
              <h4 className="text-dark mb-1">{stats.totalServices}</h4>
              <small className="text-muted">Services</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              stockFilter === "lowStock" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("stock", "lowStock")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faExclamationCircle}
                className="stat-icon text-warning mb-2"
              />
              <h4 className="text-dark mb-1">{stats.lowStockItems}</h4>
              <small className="text-muted">Low Stock</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stock Value and Status Stats */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <FontAwesomeIcon
                icon={faRupeeSign}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">
                {formatCurrency(stats.totalStockValue)}
              </h4>
              <small className="text-muted">Total Stock Value</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              stockFilter === "outOfStock" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("stock", "outOfStock")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faTimesCircle}
                className="stat-icon text-danger mb-2"
              />
              <h4 className="text-dark mb-1">{stats.outOfStockItems}</h4>
              <small className="text-muted">Out of Stock</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "active" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("status", "active")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="stat-icon text-success mb-2"
              />
              <h4 className="text-dark mb-1">{stats.activeItems}</h4>
              <small className="text-muted">Active Items</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm text-center h-100 clickable-card ${
              statusFilter === "inactive" ? "active-card" : ""
            }`}
            onClick={() => handleCardClick("status", "inactive")}
            style={{cursor: "pointer"}}
          >
            <Card.Body>
              <FontAwesomeIcon
                icon={faTimesCircle}
                className="stat-icon text-secondary mb-2"
              />
              <h4 className="text-dark mb-1">{stats.inactiveItems}</h4>
              <small className="text-muted">Inactive Items</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Items Card */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="neutral-header">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-semibold neutral-text">
              <FontAwesomeIcon icon={faBoxes} className="me-2 neutral-muted" />
              Items ({filteredItems.length})
            </h5>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={clearAllFilters}
                className="neutral-button"
              >
                Clear Filters
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handleItemAction("refresh")}
                disabled={isLoadingAction}
                className="neutral-button"
              >
                <FontAwesomeIcon icon={faSync} className="me-1" />
                Refresh
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleExport}
                disabled={isLoadingAction}
                className="neutral-button"
              >
                {isLoadingAction ? (
                  <Spinner animation="border" size="sm" className="me-1" />
                ) : (
                  <FontAwesomeIcon icon={faDownload} className="me-1" />
                )}
                Export
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            activeKey={activeTab}
            onSelect={(key) => handleCardClick("tab", key)}
            className="mb-3 neutral-tabs"
          >
            <Tab
              eventKey="all"
              title={
                <span>
                  <FontAwesomeIcon icon={faBoxes} className="me-1" />
                  All ({stats.totalItems})
                </span>
              }
            />
            <Tab
              eventKey="product"
              title={
                <span>
                  <FontAwesomeIcon icon={faIndustry} className="me-1" />
                  Products ({stats.totalProducts})
                </span>
              }
            />
            <Tab
              eventKey="service"
              title={
                <span>
                  <FontAwesomeIcon icon={faCog} className="me-1" />
                  Services ({stats.totalServices})
                </span>
              }
            />
          </Tabs>

          {/* Search and Filters */}
          <Row className="g-3">
            <Col md={2}>
              <InputGroup size="sm">
                <InputGroup.Text className="neutral-input-group-text border-end-0">
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="neutral-input border-start-0"
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All Stock</option>
                <option value="inStock">In Stock</option>
                <option value="lowStock">Low Stock</option>
                <option value="outOfStock">Out of Stock</option>
                <option value="service">Services</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="neutral-input"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-");
                  setSortBy(field);
                  setSortDirection(direction);
                }}
                className="neutral-input"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="salePrice-asc">Price Low-High</option>
                <option value="salePrice-desc">Price High-Low</option>
                <option value="currentStock-asc">Stock Low-High</option>
                <option value="currentStock-desc">Stock High-Low</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <small className="neutral-muted d-block mt-2">
                {filteredItems.length} of {stats.totalItems} items
              </small>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-0">
          {filteredItems.length > 0 ? (
            <div className="table-responsive">
              <Table className="mb-0 clean-table">
                <thead>
                  <tr>
                    <th>
                      Item Details
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>
                      Type
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>Category</th>
                    <th>
                      Pricing
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>
                      Stock
                      <FontAwesomeIcon
                        icon={faSort}
                        className="ms-2 text-muted"
                      />
                    </th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item._id || item.id} className="item-row">
                      <td>
                        <div>
                          <div className="fw-semibold text-dark mb-1">
                            {item.name}
                          </div>
                          <small className="text-muted">
                            ID: {item.itemCode || item._id?.slice(-6) || "N/A"}
                          </small>
                          {item.hsnNumber && (
                            <>
                              <br />
                              <small className="text-muted">
                                HSN: {item.hsnNumber}
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      <td>{getTypeBadge(item.type)}</td>
                      <td>
                        <span className="text-dark">
                          {item.category || "N/A"}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span className="fw-semibold text-dark">
                            ₹{Number(item.salePrice || 0).toLocaleString()}
                          </span>
                          <br />
                          <small className="text-muted">
                            per {item.unit || "unit"}
                          </small>
                        </div>
                      </td>
                      <td>
                        {item.type === "product" ? (
                          <div>
                            <span className="fw-semibold text-dark">
                              {Number(item.currentStock || 0)}{" "}
                              {item.unit || "units"}
                            </span>
                            <br />
                            {getStockBadge(item)}
                          </div>
                        ) : (
                          getStockBadge(item)
                        )}
                      </td>
                      <td>
                        <Badge
                          bg={item.isActive !== false ? "success" : "secondary"}
                          className="fw-normal"
                        >
                          {item.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle
                            variant="link"
                            className="text-muted p-0 border-0 shadow-none"
                            disabled={isLoadingAction}
                          >
                            <FontAwesomeIcon icon={faEllipsisV} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu align="end">
                            <Dropdown.Item
                              onClick={() => handleItemAction("view", item)}
                            >
                              <FontAwesomeIcon icon={faEye} className="me-2" />
                              View Details
                            </Dropdown.Item>
                            {(userRole === "owner" || userRole === "admin") && (
                              <>
                                <Dropdown.Item
                                  onClick={() => handleItemAction("edit", item)}
                                >
                                  <FontAwesomeIcon
                                    icon={faEdit}
                                    className="me-2"
                                  />
                                  Edit Item
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() =>
                                    handleItemAction("delete", item)
                                  }
                                  className="text-danger"
                                >
                                  <FontAwesomeIcon
                                    icon={faTrash}
                                    className="me-2"
                                  />
                                  Delete Item
                                </Dropdown.Item>
                              </>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5">
              <FontAwesomeIcon
                icon={faBoxes}
                className="fs-1 text-muted mb-3"
              />
              <h6 className="text-muted">No items found</h6>
              <p className="text-muted">
                {searchQuery ||
                typeFilter !== "all" ||
                categoryFilter !== "all" ||
                stockFilter !== "all" ||
                statusFilter !== "all" ||
                activeTab !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "This company hasn't added any items yet"}
              </p>
              {(searchQuery ||
                typeFilter !== "all" ||
                categoryFilter !== "all" ||
                stockFilter !== "all" ||
                statusFilter !== "all" ||
                activeTab !== "all") && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </Card.Body>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Card.Footer className="bg-white border-top">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing page {pagination.page} of {pagination.pages} (
                {pagination.total} total items)
              </small>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Item Details Modal */}
      <Modal
        show={showItemModal}
        onHide={() => setShowItemModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faBoxes} className="me-2" />
            Item Details - {selectedItem?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <Row>
              <Col md={6}>
                <Card className="border-0 bg-light mb-3">
                  <Card.Header className="bg-primary text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faBoxes} className="me-2" />
                      Basic Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>Name:</strong> {selectedItem.name}
                    </p>
                    <p>
                      <strong>Type:</strong> {getTypeBadge(selectedItem.type)}
                    </p>
                    <p>
                      <strong>Category:</strong>{" "}
                      {selectedItem.category || "N/A"}
                    </p>
                    <p>
                      <strong>Item Code:</strong>{" "}
                      {selectedItem.itemCode || "N/A"}
                    </p>
                    {selectedItem.hsnNumber && (
                      <p>
                        <strong>HSN Number:</strong> {selectedItem.hsnNumber}
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="border-0 bg-light mb-3">
                  <Card.Header className="bg-success text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faRupeeSign} className="me-2" />
                      Pricing & Stock
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p>
                      <strong>Sale Price:</strong>{" "}
                      {formatCurrency(selectedItem.salePrice || 0)}
                    </p>
                    <p>
                      <strong>Buy Price:</strong>{" "}
                      {formatCurrency(selectedItem.buyPrice || 0)}
                    </p>
                    {selectedItem.type === "product" && (
                      <>
                        <p>
                          <strong>Current Stock:</strong>{" "}
                          {selectedItem.currentStock || 0}{" "}
                          {selectedItem.unit || "units"}
                        </p>
                        <p>
                          <strong>Stock Status:</strong>{" "}
                          {getStockBadge(selectedItem)}
                        </p>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              {selectedItem.description && (
                <Col md={12}>
                  <Card className="border-0 bg-light">
                    <Card.Header className="bg-info text-white">
                      <h6 className="mb-0">
                        <FontAwesomeIcon icon={faBoxes} className="me-2" />
                        Description
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <p>{selectedItem.description}</p>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowItemModal(false)}>
            Close
          </Button>
          {(userRole === "owner" || userRole === "admin") && (
            <Button
              variant="primary"
              onClick={() => handleItemAction("edit", selectedItem)}
            >
              <FontAwesomeIcon icon={faEdit} className="me-2" />
              Edit Item
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <FontAwesomeIcon icon={faTrash} className="me-2" />
            Delete Item
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <Alert variant="danger">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="me-2"
                />
                <strong>Warning:</strong> This action cannot be undone.
              </Alert>
              <p>
                Are you sure you want to delete{" "}
                <strong>{selectedItem.name}</strong>?
              </p>
              <div className="bg-light p-3 rounded">
                <div>
                  <strong>Type:</strong> {selectedItem.type}
                </div>
                <div>
                  <strong>Price:</strong>{" "}
                  {formatCurrency(selectedItem.salePrice || 0)}
                </div>
                {selectedItem.type === "product" &&
                  selectedItem.currentStock > 0 && (
                    <div>
                      <strong>Stock:</strong> {selectedItem.currentStock} units
                    </div>
                  )}
              </div>
              {selectedItem.type === "product" &&
                selectedItem.currentStock > 0 && (
                  <Alert variant="warning" className="mt-3">
                    <small>
                      <strong>Note:</strong> This item has{" "}
                      {selectedItem.currentStock} units in stock.
                    </small>
                  </Alert>
                )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isLoadingAction}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteItem}
            disabled={isLoadingAction}
          >
            {isLoadingAction ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} className="me-2" />
                Delete Item
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Styles - Same as CompanyParties */}
      <style>{`
        /* Neutral header styles */
        .neutral-header {
          background: linear-gradient(
            135deg,
            #f8f9fa 0%,
            #f1f3f4 100%
          ) !important;
          border-bottom: 1px solid #e5e7eb !important;
        }

        .neutral-text {
          color: #374151 !important;
        }

        .neutral-muted {
          color: #6b7280 !important;
        }

        .neutral-input {
          border-color: #d1d5db !important;
          color: #374151 !important;
          background-color: white !important;
        }

        .neutral-input:focus {
          border-color: #9ca3af !important;
          box-shadow: 0 0 0 0.2rem rgba(156, 163, 175, 0.25) !important;
        }

        .neutral-input-group-text {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
          color: #6b7280 !important;
        }

        .neutral-button {
          border-color: #d1d5db !important;
          color: #6b7280 !important;
          background-color: white !important;
        }

        .neutral-button:hover {
          border-color: #9ca3af !important;
          color: #374151 !important;
          background-color: #f9fafb !important;
        }

        /* Clickable card styles */
        .clickable-card {
          transition: all 0.3s ease;
          border: 2px solid transparent !important;
          cursor: pointer;
        }

        .clickable-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border-color: #007bff !important;
        }

        .active-card {
          border-color: #007bff !important;
          background: linear-gradient(
            135deg,
            #f8f9ff 0%,
            #e6f3ff 100%
          ) !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2) !important;
        }

        .stat-icon {
          font-size: 1.5rem;
          display: block;
          transition: transform 0.2s ease;
        }

        .clickable-card:hover .stat-icon {
          transform: scale(1.1);
        }

        /* Neutral tabs */
        .neutral-tabs .nav-link {
          color: #6b7280 !important;
          border: none !important;
          padding: 0.75rem 1rem !important;
          font-weight: 500 !important;
        }

        .neutral-tabs .nav-link.active {
          color: #374151 !important;
          background: none !important;
          border: none !important;
          border-bottom: 2px solid #374151 !important;
        }

        .neutral-tabs .nav-link:hover {
          color: #374151 !important;
          border-color: transparent !important;
        }

        /* Clean table styles */
        .clean-table {
          border-collapse: separate;
          border-spacing: 0;
        }

        .clean-table thead th {
          background: #f8f9fa;
          border: none;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          font-size: 0.875rem;
          color: #495057;
          padding: 1rem;
          vertical-align: middle;
          white-space: nowrap;
        }

        .clean-table tbody td {
          background: white;
          border: none;
          border-bottom: 1px solid #f1f3f4;
          padding: 1rem;
          vertical-align: middle;
          font-size: 0.875rem;
        }

        .item-row {
          transition: background-color 0.2s ease;
        }

        .item-row:hover {
          background-color: #f8f9fa !important;
        }

        .item-row:hover td {
          background: transparent;
        }

        .badge {
          font-weight: 500;
          font-size: 0.75rem;
          padding: 0.35em 0.65em;
        }

        /* Hover effects for better UX */
        .clickable-card .card-body {
          transition: all 0.2s ease;
        }

        .clickable-card:hover .card-body {
          color: #007bff !important;
        }

        .clickable-card:hover h4 {
          color: #007bff !important;
        }

        .active-card .card-body {
          color: #0056b3 !important;
        }

        .active-card h4 {
          color: #0056b3 !important;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .clean-table thead th,
          .clean-table tbody td {
            padding: 0.75rem 0.5rem;
            font-size: 0.8rem;
          }

          .stat-icon {
            font-size: 1.2rem;
          }

          .clickable-card:hover {
            transform: translateY(-1px);
          }

          .active-card {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

export default CompanyItems;
