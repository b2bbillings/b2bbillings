import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import {useNavigate} from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  InputGroup,
  Modal,
  Badge,
  Alert,
  Spinner,
  Pagination,
  OverlayTrigger,
  Popover,
  Tooltip,
} from "react-bootstrap";
import {createPortal} from "react-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faEdit,
  faTrash,
  faBuilding,
  faEye,
  faBoxes,
  faList,
  faChartBar,
  faBan,
  faCheck,
  faEllipsisV,
  faDownload,
  faUpload,
  faFilter,
  faSort,
  faExclamationTriangle,
  faRefresh,
  faTags,
  faBarcode,
  faDollarSign,
  faWarehouse,
  faInfoCircle,
  faCog,
  faAdjust,
  faHistory,
  faLayerGroup,
  faCalendarAlt,
  faChevronUp,
  faChevronDown,
  faExclamation,
  faCheckCircle,
  faTimesCircle,
  faArrowUp,
  faArrowDown,
  faExchangeAlt,
  faUsers,
  faShoppingCart,
  faChartLine, // ✅ Using faChartLine instead of faTrendingUp
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";

// Import the item service
import itemService from "../../services/itemService";

function ItemManagement({adminData, currentUser, addToast}) {
  const navigate = useNavigate();

  // State management
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [popularityFilter, setPopularityFilter] = useState("all");
  const [sortField, setSortField] = useState("popularity");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({x: 0, y: 0});
  const dropdownRef = useRef(null);

  // Global statistics state
  const [globalStats, setGlobalStats] = useState({
    totalUniqueItems: 0,
    totalProducts: 0,
    totalServices: 0,
    totalCompaniesUsingItems: 0,
    totalSalesTransactions: 0,
    totalPurchaseTransactions: 0,
    totalSalesValue: 0,
    totalPurchaseValue: 0,
    mostPopularItems: [],
    categories: [],
    topSellingCategories: [],
  });

  // Load items and stats on component mount and when filters change
  useEffect(() => {
    loadGlobalItems();
    loadGlobalStats();
  }, [
    currentPage,
    searchQuery,
    typeFilter,
    categoryFilter,
    popularityFilter,
    sortField,
    sortDirection,
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load global items from backend using real service
  const loadGlobalItems = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dummyCompanyId = "admin";

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        type: typeFilter !== "all" ? typeFilter : "",
        category: categoryFilter !== "all" ? categoryFilter : "",
        popularity: popularityFilter !== "all" ? popularityFilter : "",
        sortBy: sortField,
        sortOrder: sortDirection,
        // ✅ NEW: Request global aggregated data
        globalView: true,
        aggregateByName: true,
        includeSalesData: true,
        includePurchaseData: true,
      };

      const response = await itemService.getAllItemsAdmin(
        dummyCompanyId,
        params
      );

      if (response.success) {
        const itemsData = response.data.items || [];
        const formattedItems = itemsData.map((item) => ({
          id: item._id || item.id,
          name: item.name || "Unknown Item",
          itemCode: item.itemCode || "",
          hsnNumber: item.hsnNumber || "",
          type: item.type || "product",
          category: item.category || "Uncategorized",
          unit: item.unit || "pieces",
          description: item.description || "",

          // ✅ Global aggregated data
          totalCompaniesUsing: item.totalCompaniesUsing || 0,
          totalSalesQuantity: item.totalSalesQuantity || 0,
          totalPurchaseQuantity: item.totalPurchaseQuantity || 0,
          totalSalesValue: item.totalSalesValue || 0,
          totalPurchaseValue: item.totalPurchaseValue || 0,
          averageSalePrice: item.averageSalePrice || 0,
          averagePurchasePrice: item.averagePurchasePrice || 0,
          popularity: item.popularity || 0, // Based on usage across companies

          // ✅ Price range data
          minSalePrice: item.minSalePrice || 0,
          maxSalePrice: item.maxSalePrice || 0,
          minPurchasePrice: item.minPurchasePrice || 0,
          maxPurchasePrice: item.maxPurchasePrice || 0,

          // ✅ Usage analytics
          usageFrequency: item.usageFrequency || "low",
          trendDirection: item.trendDirection || "stable", // up, down, stable
          lastUsedDate: item.lastUsedDate ? new Date(item.lastUsedDate) : null,

          // ✅ Company details using this item
          topCompanies: item.topCompanies || [],

          // ✅ Metadata
          firstCreatedAt: new Date(item.firstCreatedAt || Date.now()),
          lastUpdatedAt: new Date(item.lastUpdatedAt || Date.now()),

          // ✅ Calculated fields
          netTransactionValue:
            (item.totalSalesValue || 0) + (item.totalPurchaseValue || 0),
          totalTransactions:
            (item.totalSalesQuantity || 0) + (item.totalPurchaseQuantity || 0),
          profitMargin:
            item.averageSalePrice > 0 && item.averagePurchasePrice > 0
              ? (
                  ((item.averageSalePrice - item.averagePurchasePrice) /
                    item.averagePurchasePrice) *
                  100
                ).toFixed(2)
              : 0,

          formattedFirstCreated: item.firstCreatedAt
            ? new Date(item.firstCreatedAt).toLocaleDateString()
            : "Unknown",
          formattedLastUsed: item.lastUsedDate
            ? new Date(item.lastUsedDate).toLocaleDateString()
            : "Never",

          originalData: item,
        }));

        setItems(formattedItems);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalItems(
          response.data.pagination?.totalItems || formattedItems.length
        );

        if (currentPage === 1 && !isRefreshing) {
        }
      } else {
        throw new Error(response.message || "Failed to load global items");
      }
    } catch (error) {
      console.error("Error loading global items:", error);
      const errorMessage = error.message || "Failed to load global items";
      setError(errorMessage);
      addToast?.(errorMessage, "error");

      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  // Load global item statistics
  const loadGlobalStats = async () => {
    try {
      const dummyCompanyId = "admin";
      const response = await itemService.getAdminItemStats(dummyCompanyId);

      if (response.success) {
        setGlobalStats({
          totalUniqueItems: response.data.totalUniqueItems || 0,
          totalProducts: response.data.totalProducts || 0,
          totalServices: response.data.totalServices || 0,
          totalCompaniesUsingItems: response.data.totalCompaniesUsingItems || 0,
          totalSalesTransactions: response.data.totalSalesTransactions || 0,
          totalPurchaseTransactions:
            response.data.totalPurchaseTransactions || 0,
          totalSalesValue: response.data.totalSalesValue || 0,
          totalPurchaseValue: response.data.totalPurchaseValue || 0,
          mostPopularItems: response.data.mostPopularItems || [],
          categories: response.data.categories || [],
          topSellingCategories: response.data.topSellingCategories || [],
        });
      }
    } catch (error) {
      console.error("Error loading global item stats:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadGlobalItems(), loadGlobalStats()]);
    setIsRefreshing(false);
  };

  // Handle dropdown toggle
  const handleDropdownToggle = useCallback(
    (itemId, event) => {
      event.stopPropagation();

      if (activeDropdown === itemId) {
        setActiveDropdown(null);
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      setDropdownPosition({
        x: rect.right - 220 + scrollLeft,
        y: rect.bottom + 5 + scrollTop,
      });

      setActiveDropdown(itemId);
    },
    [activeDropdown]
  );

  // Handle item actions
  const handleItemAction = async (action, item) => {
    setSelectedItem(item);
    setActiveDropdown(null);

    switch (action) {
      case "view":
        setModalMode("view");
        setShowItemModal(true);
        break;
      case "viewAnalytics":
        setModalMode("analytics");
        setShowItemModal(true);
        break;
      case "viewCompanies":
        setModalMode("companies");
        setShowItemModal(true);
        break;
      case "viewTransactions":
        setModalMode("transactions");
        setShowItemModal(true);
        break;
      default:
        break;
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      setIsRefreshing(true);
      const dummyCompanyId = "admin";

      const params = {
        format: "csv",
        search: searchQuery,
        type: typeFilter !== "all" ? typeFilter : "",
        category: categoryFilter !== "all" ? categoryFilter : "",
        globalView: true,
        includeSalesData: true,
        includePurchaseData: true,
      };

      const response = await itemService.exportAllItemsAdmin(
        dummyCompanyId,
        params
      );

      if (response.success) {
      } else {
        throw new Error(response.message || "Failed to export items");
      }
    } catch (error) {
      console.error("Error exporting items:", error);
      addToast?.(error.message || "Failed to export items", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get popularity badge
  const getPopularityBadge = (item) => {
    const usage = item.usageFrequency;
    const companies = item.totalCompaniesUsing;

    if (companies >= 10 || usage === "very_high") {
      return (
        <Badge bg="success" className="d-flex align-items-center gap-1">
          <FontAwesomeIcon icon={faChartLine} size="sm" />
          Very Popular
        </Badge>
      );
    } else if (companies >= 5 || usage === "high") {
      return (
        <Badge bg="primary" className="d-flex align-items-center gap-1">
          <FontAwesomeIcon icon={faArrowUp} size="sm" />
          Popular
        </Badge>
      );
    } else if (companies >= 2 || usage === "medium") {
      return (
        <Badge bg="warning" className="d-flex align-items-center gap-1">
          <FontAwesomeIcon icon={faExchangeAlt} size="sm" />
          Moderate
        </Badge>
      );
    } else {
      return (
        <Badge bg="secondary" className="d-flex align-items-center gap-1">
          <FontAwesomeIcon icon={faArrowDown} size="sm" />
          Low Usage
        </Badge>
      );
    }
  };

  const getTypeBadge = (type) => {
    return type === "product" ? (
      <Badge bg="primary" className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={faBoxes} size="sm" />
        Product
      </Badge>
    ) : (
      <Badge bg="info" className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={faList} size="sm" />
        Service
      </Badge>
    );
  };

  const getTrendBadge = (trend) => {
    switch (trend) {
      case "up":
        return (
          <Badge bg="success" className="d-flex align-items-center gap-1">
            <FontAwesomeIcon icon={faArrowUp} size="sm" />
            Trending Up
          </Badge>
        );
      case "down":
        return (
          <Badge bg="danger" className="d-flex align-items-center gap-1">
            <FontAwesomeIcon icon={faArrowDown} size="sm" />
            Declining
          </Badge>
        );
      default:
        return (
          <Badge bg="secondary" className="d-flex align-items-center gap-1">
            <FontAwesomeIcon icon={faExchangeAlt} size="sm" />
            Stable
          </Badge>
        );
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(num || 0);
  };

  // Custom Portal Dropdown Component
  const PortalDropdown = ({item, isOpen, position}) => {
    if (!isOpen) return null;

    const dropdownItems = [
      {
        type: "header",
        content: (
          <div className="dropdown-header">
            <FontAwesomeIcon icon={faEye} className="me-2" />
            Analytics & Insights
          </div>
        ),
      },
      {
        type: "item",
        action: "view",
        content: (
          <>
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="me-2 text-primary"
            />
            View Details
          </>
        ),
      },
      {
        type: "item",
        action: "viewAnalytics",
        content: (
          <>
            <FontAwesomeIcon icon={faChartBar} className="me-2 text-success" />
            Sales & Purchase Analytics
          </>
        ),
      },
      {
        type: "item",
        action: "viewCompanies",
        content: (
          <>
            <FontAwesomeIcon icon={faBuilding} className="me-2 text-info" />
            Companies Using This Item
          </>
        ),
      },
      {
        type: "item",
        action: "viewTransactions",
        content: (
          <>
            <FontAwesomeIcon icon={faHistory} className="me-2 text-warning" />
            Transaction History
          </>
        ),
      },
    ];

    return createPortal(
      <div
        ref={dropdownRef}
        className="dropdown-portal"
        style={{
          position: "absolute",
          top: position.y,
          left: position.x,
          zIndex: 9999,
          minWidth: "220px",
        }}
      >
        <div className="dropdown-menu show shadow-lg border-0">
          {dropdownItems.map((dropItem, index) => {
            if (dropItem.type === "header") {
              return (
                <div key={index} className="dropdown-header-custom">
                  {dropItem.content}
                </div>
              );
            } else if (dropItem.type === "item") {
              return (
                <button
                  key={index}
                  className="dropdown-item dropdown-item-custom"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemAction(dropItem.action, item);
                  }}
                  disabled={isActionLoading}
                >
                  {dropItem.content}
                </button>
              );
            }
            return null;
          })}
        </div>
      </div>,
      document.body
    );
  };

  // Custom Three Dot Menu Component
  const ThreeDotMenu = ({item}) => {
    const isDropdownOpen = activeDropdown === item.id;

    return (
      <div className="dropdown-container">
        <button
          className="dropdown-trigger three-dot-menu"
          onClick={(e) => handleDropdownToggle(item.id, e)}
          disabled={isActionLoading}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>

        <PortalDropdown
          item={item}
          isOpen={isDropdownOpen}
          position={dropdownPosition}
        />
      </div>
    );
  };

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="item-management">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <h5 className="mt-3 text-muted">Loading global items data...</h5>
          <p className="text-muted">Analyzing items across all companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="item-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FontAwesomeIcon icon={faGlobe} className="me-2 text-primary" />
            Global Item Analytics
          </h4>
          <p className="text-muted mb-0">
            Analyze items usage across all companies ({totalItems} unique items)
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="professional-button"
          >
            <FontAwesomeIcon
              icon={faRefresh}
              className={`me-2 ${isRefreshing ? "fa-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="outline-primary"
            onClick={handleExport}
            disabled={isRefreshing}
            className="professional-button"
          >
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Export Analytics
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </Alert>
      )}

      {/* Global Statistics Cards */}
      <Row className="g-3 mb-4">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <div
                className="rounded-circle bg-primary bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon icon={faGlobe} className="fs-2 text-primary" />
              </div>
              <h3 className="text-primary mb-2">
                {globalStats.totalUniqueItems}
              </h3>
              <p className="text-muted mb-0">Unique Items</p>
              <small className="text-muted">
                {globalStats.totalProducts} Products •{" "}
                {globalStats.totalServices} Services
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <div
                className="rounded-circle bg-success bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faBuilding}
                  className="fs-2 text-success"
                />
              </div>
              <h3 className="text-success mb-2">
                {globalStats.totalCompaniesUsingItems}
              </h3>
              <p className="text-muted mb-0">Companies</p>
              <small className="text-muted">Using these items</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <div
                className="rounded-circle bg-info bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faShoppingCart}
                  className="fs-2 text-info"
                />
              </div>
              <h3 className="text-info mb-2">
                {formatNumber(
                  globalStats.totalSalesTransactions +
                    globalStats.totalPurchaseTransactions
                )}
              </h3>
              <p className="text-muted mb-0">Total Transactions</p>
              <small className="text-muted">
                {formatNumber(globalStats.totalSalesTransactions)} Sales •{" "}
                {formatNumber(globalStats.totalPurchaseTransactions)} Purchases
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body>
              <div
                className="rounded-circle bg-warning bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{width: "60px", height: "60px"}}
              >
                <FontAwesomeIcon
                  icon={faDollarSign}
                  className="fs-2 text-warning"
                />
              </div>
              <h3 className="text-warning mb-2">
                {formatCurrency(
                  globalStats.totalSalesValue + globalStats.totalPurchaseValue
                )}
              </h3>
              <p className="text-muted mb-0">Total Transaction Value</p>
              <small className="text-muted">
                Sales: {formatCurrency(globalStats.totalSalesValue)}
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-end">
            <Col lg={3} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Search Items</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FontAwesomeIcon icon={faSearch} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, category, or HSN..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Type</Form.Label>
              <Form.Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select-custom"
              >
                <option value="all">All Types</option>
                <option value="product">Products</option>
                <option value="service">Services</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Category</Form.Label>
              <Form.Select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select-custom"
              >
                <option value="all">All Categories</option>
                {globalStats.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={2} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Popularity</Form.Label>
              <Form.Select
                value={popularityFilter}
                onChange={(e) => {
                  setPopularityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select-custom"
              >
                <option value="all">All Items</option>
                <option value="very_popular">Very Popular</option>
                <option value="popular">Popular</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low Usage</option>
              </Form.Select>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Form.Label className="fw-semibold">Sort By</Form.Label>
              <Form.Select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-");
                  setSortField(field);
                  setSortDirection(direction);
                  setCurrentPage(1);
                }}
                className="form-select-custom"
              >
                <option value="popularity-desc">Most Popular</option>
                <option value="popularity-asc">Least Popular</option>
                <option value="totalCompaniesUsing-desc">Most Companies</option>
                <option value="totalTransactions-desc">
                  Most Transactions
                </option>
                <option value="netTransactionValue-desc">Highest Value</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="firstCreatedAt-desc">Latest First</option>
                <option value="lastUsedDate-desc">Recently Used</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Items Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading && (
            <div className="text-center py-3 bg-light">
              <Spinner animation="border" size="sm" className="me-2" />
              <span className="text-muted">Loading global items...</span>
            </div>
          )}

          <div className="table-container">
            <div className="table-responsive table-scrollable">
              <Table hover className="mb-0 modern-table">
                <thead className="table-light sticky-header">
                  <tr>
                    <th className="border-0 fw-semibold text-dark">
                      Item Details
                    </th>
                    <th className="border-0 fw-semibold text-dark">Type</th>
                    <th className="border-0 fw-semibold text-dark">
                      Usage Analytics
                    </th>
                    <th className="border-0 fw-semibold text-dark">
                      Companies
                    </th>
                    <th className="border-0 fw-semibold text-dark">
                      Sales Data
                    </th>
                    <th className="border-0 fw-semibold text-dark">
                      Purchase Data
                    </th>
                    <th className="border-0 fw-semibold text-dark">
                      Popularity
                    </th>
                    <th className="border-0 fw-semibold text-dark">
                      Last Used
                    </th>
                    <th className="border-0 fw-semibold text-dark text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="clickable-row"
                      style={{cursor: "pointer"}}
                    >
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <div className="item-icon me-3">
                            <FontAwesomeIcon
                              icon={item.type === "product" ? faBoxes : faList}
                              className={`text-${
                                item.type === "product" ? "primary" : "info"
                              }`}
                              size="lg"
                            />
                          </div>
                          <div>
                            <div className="fw-bold item-name-clickable">
                              {item.name}
                            </div>
                            <small className="text-muted">
                              {item.category}
                              {item.hsnNumber && ` • HSN: ${item.hsnNumber}`}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">{getTypeBadge(item.type)}</td>
                      <td className="py-3">
                        <div>
                          <div className="fw-semibold text-primary">
                            {formatNumber(item.totalTransactions)} transactions
                          </div>
                          <small className="text-muted">
                            {formatCurrency(item.netTransactionValue)} total
                            value
                          </small>
                          <br />
                          {getTrendBadge(item.trendDirection)}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={faBuilding}
                            className="text-muted me-2"
                            size="sm"
                          />
                          <div>
                            <div className="fw-semibold">
                              {item.totalCompaniesUsing}
                            </div>
                            <small className="text-muted">companies</small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div>
                          <div className="fw-semibold text-success">
                            {formatNumber(item.totalSalesQuantity)} {item.unit}
                          </div>
                          <small className="text-success">
                            {formatCurrency(item.totalSalesValue)}
                          </small>
                          {item.averageSalePrice > 0 && (
                            <>
                              <br />
                              <small className="text-muted">
                                Avg: {formatCurrency(item.averageSalePrice)}
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div>
                          <div className="fw-semibold text-info">
                            {formatNumber(item.totalPurchaseQuantity)}{" "}
                            {item.unit}
                          </div>
                          <small className="text-info">
                            {formatCurrency(item.totalPurchaseValue)}
                          </small>
                          {item.averagePurchasePrice > 0 && (
                            <>
                              <br />
                              <small className="text-muted">
                                Avg: {formatCurrency(item.averagePurchasePrice)}
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3">{getPopularityBadge(item)}</td>
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={faCalendarAlt}
                            className="text-muted me-2"
                            size="sm"
                          />
                          <small className="text-muted">
                            {formatDate(item.lastUsedDate)}
                          </small>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <ThreeDotMenu item={item} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Table Info Bar */}
            <div className="table-info-bar bg-light border-top p-3">
              <div className="d-flex justify-content-between align-items-center text-muted small">
                <div>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                  {totalItems} unique items
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span>
                    Total Value:{" "}
                    <strong className="text-success">
                      {formatCurrency(
                        globalStats.totalSalesValue +
                          globalStats.totalPurchaseValue
                      )}
                    </strong>
                  </span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Footer className="bg-light border-0">
            <div className="d-flex justify-content-center">
              <Pagination className="mb-0">
                <Pagination.First
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                />
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                {[...Array(Math.min(totalPages, 7))].map((_, index) => {
                  const page =
                    currentPage <= 4 ? index + 1 : currentPage - 3 + index;
                  if (page > totalPages) return null;
                  return (
                    <Pagination.Item
                      key={page}
                      active={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Pagination.Item>
                  );
                })}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                />
                <Pagination.Last
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                />
              </Pagination>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Empty State */}
      {items.length === 0 && !isLoading && (
        <div className="text-center py-5">
          <FontAwesomeIcon
            icon={faGlobe}
            size="3x"
            className="text-muted mb-3"
          />
          <h5 className="text-muted">No global items found</h5>
          <p className="text-muted">
            {searchQuery || typeFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No items have been created across any companies yet"}
          </p>
        </div>
      )}

      {/* Enhanced Item Modal */}
      <Modal
        show={showItemModal}
        onHide={() => setShowItemModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton className="bg-light border-0">
          <Modal.Title className="d-flex align-items-center">
            <FontAwesomeIcon
              icon={
                modalMode === "view"
                  ? faEye
                  : modalMode === "analytics"
                  ? faChartBar
                  : modalMode === "companies"
                  ? faBuilding
                  : faHistory
              }
              className="me-2 text-primary"
            />
            {modalMode === "view" && "Item Details"}
            {modalMode === "analytics" && "Sales & Purchase Analytics"}
            {modalMode === "companies" && "Companies Using This Item"}
            {modalMode === "transactions" && "Transaction History"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalMode === "view" && selectedItem && (
            <Row>
              <Col md={6}>
                <h6 className="text-primary mb-3">Basic Information</h6>
                <p>
                  <strong>Name:</strong> {selectedItem.name}
                </p>
                <p>
                  <strong>Type:</strong> {getTypeBadge(selectedItem.type)}
                </p>
                <p>
                  <strong>Category:</strong> {selectedItem.category}
                </p>
                <p>
                  <strong>Unit:</strong> {selectedItem.unit}
                </p>
                {selectedItem.hsnNumber && (
                  <p>
                    <strong>HSN Number:</strong> {selectedItem.hsnNumber}
                  </p>
                )}
                {selectedItem.description && (
                  <p>
                    <strong>Description:</strong> {selectedItem.description}
                  </p>
                )}
              </Col>
              <Col md={6}>
                <h6 className="text-success mb-3">Global Usage Statistics</h6>
                <p>
                  <strong>Companies Using:</strong>{" "}
                  {selectedItem.totalCompaniesUsing}
                </p>
                <p>
                  <strong>Total Transactions:</strong>{" "}
                  {formatNumber(selectedItem.totalTransactions)}
                </p>
                <p>
                  <strong>Total Value:</strong>{" "}
                  {formatCurrency(selectedItem.netTransactionValue)}
                </p>
                <p>
                  <strong>Popularity:</strong>{" "}
                  {getPopularityBadge(selectedItem)}
                </p>
                <p>
                  <strong>Trend:</strong>{" "}
                  {getTrendBadge(selectedItem.trendDirection)}
                </p>
                <p>
                  <strong>Last Used:</strong>{" "}
                  {formatDate(selectedItem.lastUsedDate)}
                </p>
              </Col>
              <Col md={12} className="mt-4">
                <Row>
                  <Col md={6}>
                    <h6 className="text-success mb-3">Sales Analytics</h6>
                    <p>
                      <strong>Total Sales Quantity:</strong>{" "}
                      {formatNumber(selectedItem.totalSalesQuantity)}{" "}
                      {selectedItem.unit}
                    </p>
                    <p>
                      <strong>Total Sales Value:</strong>{" "}
                      {formatCurrency(selectedItem.totalSalesValue)}
                    </p>
                    <p>
                      <strong>Average Sale Price:</strong>{" "}
                      {formatCurrency(selectedItem.averageSalePrice)}
                    </p>
                    {selectedItem.minSalePrice > 0 &&
                      selectedItem.maxSalePrice > 0 && (
                        <p>
                          <strong>Price Range:</strong>{" "}
                          {formatCurrency(selectedItem.minSalePrice)} -{" "}
                          {formatCurrency(selectedItem.maxSalePrice)}
                        </p>
                      )}
                  </Col>
                  <Col md={6}>
                    <h6 className="text-info mb-3">Purchase Analytics</h6>
                    <p>
                      <strong>Total Purchase Quantity:</strong>{" "}
                      {formatNumber(selectedItem.totalPurchaseQuantity)}{" "}
                      {selectedItem.unit}
                    </p>
                    <p>
                      <strong>Total Purchase Value:</strong>{" "}
                      {formatCurrency(selectedItem.totalPurchaseValue)}
                    </p>
                    <p>
                      <strong>Average Purchase Price:</strong>{" "}
                      {formatCurrency(selectedItem.averagePurchasePrice)}
                    </p>
                    {selectedItem.minPurchasePrice > 0 &&
                      selectedItem.maxPurchasePrice > 0 && (
                        <p>
                          <strong>Price Range:</strong>{" "}
                          {formatCurrency(selectedItem.minPurchasePrice)} -{" "}
                          {formatCurrency(selectedItem.maxPurchasePrice)}
                        </p>
                      )}
                  </Col>
                </Row>
              </Col>
            </Row>
          )}

          {modalMode === "analytics" && selectedItem && (
            <Row>
              <Col md={12}>
                <Alert variant="info">
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  Detailed analytics charts and graphs for{" "}
                  <strong>{selectedItem.name}</strong> will be displayed here.
                  This includes sales trends, purchase patterns, seasonal
                  variations, and predictive analytics.
                </Alert>
              </Col>
            </Row>
          )}

          {modalMode === "companies" && selectedItem && (
            <Row>
              <Col md={12}>
                <Alert variant="info">
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  List of {selectedItem.totalCompaniesUsing} companies using{" "}
                  <strong>{selectedItem.name}</strong> will be displayed here.
                  This includes company details, usage frequency, and
                  transaction volumes.
                </Alert>
              </Col>
            </Row>
          )}

          {modalMode === "transactions" && selectedItem && (
            <Row>
              <Col md={12}>
                <Alert variant="info">
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  Complete transaction history for{" "}
                  <strong>{selectedItem.name}</strong> across all companies will
                  be displayed here. This includes dates, quantities, prices,
                  and company details for each transaction.
                </Alert>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowItemModal(false)}
            className="professional-button"
          >
            Close
          </Button>
          {selectedItem && (
            <Button
              variant="primary"
              onClick={handleExport}
              className="professional-button"
            >
              <FontAwesomeIcon icon={faDownload} className="me-2" />
              Export {selectedItem.name} Data
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Include the same styles from before */}
      <style>{`
        /* All existing styles remain the same, just updated for global context */
        .item-management {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .table-container {
          position: relative;
          height: 450px;
          display: flex;
          flex-direction: column;
        }

        .table-scrollable {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          border-radius: 0.5rem 0.5rem 0 0;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f8f9fa;
        }

        .table-scrollable::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .table-scrollable::-webkit-scrollbar-track {
          background: #f8f9fa;
          border-radius: 4px;
        }

        .table-scrollable::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
          border: 2px solid #f8f9fa;
        }

        .table-scrollable::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .sticky-header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: linear-gradient(
            135deg,
            #f8f9fa 0%,
            #f1f3f4 100%
          ) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .sticky-header th {
          border-bottom: 2px solid #dee2e6 !important;
          background: transparent !important;
        }

        .table-info-bar {
          flex-shrink: 0;
          background: linear-gradient(
            135deg,
            #f8f9fa 0%,
            #f1f3f4 100%
          ) !important;
          border-radius: 0 0 0.5rem 0.5rem;
          box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
        }

        .clickable-row {
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .clickable-row:hover {
          background-color: #f8f9fa !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-left-color: #0d6efd;
        }

        .item-name-clickable {
          color: #0d6efd;
          transition: color 0.2s ease;
        }

        .clickable-row:hover .item-name-clickable {
          color: #0a58ca;
          text-decoration: underline;
        }

        .professional-button {
          border-radius: 0.5rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          transition: all 0.2s ease;
          border-width: 1px;
        }

        .professional-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .modern-table {
          font-size: 0.95rem;
          margin-bottom: 0 !important;
        }

        .modern-table thead th {
          padding: 1rem 0.75rem;
          font-weight: 600;
          color: #495057;
          white-space: nowrap;
        }

        .modern-table tbody td {
          border-color: #f1f3f4;
          vertical-align: middle;
          padding: 0.75rem;
        }

        .item-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: linear-gradient(135deg, #e3f2fd 0%, #f8f9fa 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(13, 110, 253, 0.1);
          flex-shrink: 0;
        }

        .dropdown-portal {
          position: absolute;
          z-index: 9999;
        }

        .dropdown-menu {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 0.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          padding: 0.5rem 0;
          min-width: 220px;
        }

        .dropdown-header-custom {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #495057;
          background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
          border-bottom: 1px solid #e9ecef;
          margin-bottom: 0.25rem;
        }

        .dropdown-item-custom {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          color: #495057;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .dropdown-item-custom:hover {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          transform: translateX(2px);
        }

        .dropdown-item-custom:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropdown-trigger {
          background: transparent;
          border: none;
          color: #6c757d;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .dropdown-trigger:hover {
          background: #f8f9fa;
          color: #495057;
          transform: scale(1.1);
        }

        .dropdown-trigger:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.2);
        }

        .form-control-custom,
        .form-select-custom {
          border: 1px solid #dee2e6;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          transition: all 0.2s ease;
        }

        .form-control-custom:focus,
        .form-select-custom:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.1);
        }

        .badge {
          font-weight: 500;
          padding: 0.4rem 0.6rem;
          border-radius: 0.5rem;
        }

        .item-management .card h3 {
          font-weight: 700;
          font-size: 2rem;
        }

        .pagination {
          gap: 0.25rem;
        }

        .pagination .page-item .page-link {
          border-radius: 0.375rem;
          border: 1px solid #dee2e6;
          color: #495057;
          padding: 0.5rem 0.75rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .pagination .page-item.active .page-link {
          background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);
          border-color: #0d6efd;
          box-shadow: 0 2px 4px rgba(13, 110, 253, 0.3);
        }

        .pagination .page-item .page-link:hover {
          background: #f8f9fa;
          border-color: #0d6efd;
          color: #0d6efd;
          transform: translateY(-1px);
        }

        @media (max-width: 1200px) {
          .table-container {
            height: 400px;
          }
        }

        @media (max-width: 992px) {
          .table-container {
            height: 380px;
          }

          .table-info-bar .d-flex {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
          }
        }

        @media (max-width: 768px) {
          .table-container {
            height: 350px;
          }

          .clickable-row:hover {
            transform: none;
            box-shadow: none;
          }

          .modern-table {
            font-size: 0.875rem;
          }

          .item-icon {
            width: 32px;
            height: 32px;
          }

          .professional-button {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
          }

          .dropdown-menu {
            min-width: 200px;
          }

          .item-management .card h3 {
            font-size: 1.5rem !important;
          }
        }

        @media (max-width: 576px) {
          .table-container {
            height: 320px;
          }

          .modern-table thead th,
          .modern-table tbody td {
            padding: 0.5rem 0.25rem;
            font-size: 0.8rem;
          }

          .item-icon {
            width: 28px;
            height: 28px;
          }
        }

        .item-management {
          margin-bottom: 2rem;
        }

        .fa-spin {
          animation: fa-spin 1s infinite linear;
        }

        @keyframes fa-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .clickable-row {
          user-select: none;
        }

        .table-scrollable {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}

export default ItemManagement;
