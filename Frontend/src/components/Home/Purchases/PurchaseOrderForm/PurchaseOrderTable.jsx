import React, {useState, useCallback, useMemo, useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import {useReactToPrint} from "react-to-print";
import PurchaseOrder from "../../../PrintComponents/PurchaseOrder";
import {
  Container,
  Row,
  Col,
  Button,
  Table,
  Badge,
  InputGroup,
  Form,
  Spinner,
  Alert,
  Modal,
  ButtonGroup,
} from "react-bootstrap";
import {useNavigate, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFileExcel,
  faSort,
  faEllipsisV,
  faEye,
  faEdit,
  faTrash,
  faCopy,
  faShare,
  faTruck,
  faCheck,
  faClipboardList,
  faDownload,
  faExchangeAlt,
  faPlus,
  faSpinner,
  faBoxes,
  faFileInvoice,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faInfoCircle,
  faRobot,
  faUser,
  faBuilding,
  faProjectDiagram,
  faArrowRight,
  faList,
  faUserTie,
  faTags,
  faPrint,
  faUndo,
  faBan,
} from "@fortawesome/free-solid-svg-icons";
import UniversalViewModal from "../../../Common/UniversalViewModal";
import purchaseOrderService from "../../../../services/purchaseOrderService";

// ✅ ENHANCED CONSTANTS
const DOCUMENT_LABELS = {
  "purchase-order": {
    documentName: "Purchase Order",
    documentNamePlural: "Purchase Orders",
    listPath: "purchase-orders",
    editPath: "purchase-orders",
    createPath: "purchase-orders/new",
  },
};

const STATUS_CONFIG = {
  cancelled: {variant: "dark", text: "Cancelled", icon: faTimesCircle},
  deleted: {variant: "dark", text: "Cancelled", icon: faTimesCircle},
  draft: {variant: "secondary", text: "Draft", icon: faEdit},
  pending: {variant: "warning", text: "Pending", icon: faClock},
  confirmed: {variant: "primary", text: "Confirmed", icon: faCheckCircle},
  shipped: {variant: "info", text: "Shipped", icon: faTruck},
  delivered: {variant: "success", text: "Delivered", icon: faBoxes},
  received: {variant: "success", text: "Received", icon: faBoxes},
  completed: {variant: "success", text: "Completed", icon: faCheck},
  default: {variant: "secondary", text: "Unknown", icon: faClipboardList},
};

function PurchaseOrderTable({
  purchaseOrders: propPurchaseOrders = [],
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
  onPrintOrder,
  onShareOrder,
  onDownloadOrder,
  onConvertOrder,
  onConfirmOrder,
  onShipOrder,
  onReceiveOrder,
  onCompleteOrder,
  onCancelOrder,
  onDuplicateOrder,
  isLoading: propIsLoading = false,
  title,
  searchPlaceholder,
  companyId,
  addToast,
  currentUser,
  currentCompany,
  searchTerm = "",
  onSearchChange,
  sortBy = "date",
  sortOrder = "desc",
  onSort,
  filterStatus = "all",
  onFilterChange,
  showHeader = true,
  enableActions = true,
  enableBulkActions = false,
  selectedOrders = [],
  onSelectionChange,
  showBidirectionalColumns = true,
  onViewTrackingChain,
  onGenerateSalesOrder,
  onViewSourceOrder,
  onViewGeneratedOrders,
  purchaseOrderService: propPurchaseOrderService,
  onError,
  enableEnhancedTracking = true,
  showSourceCompanyColumn = true,
  showGeneratedOrdersColumn = true,
  enableQuickNavigation = true,
  onNavigate,
  refreshTrigger,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ ENHANCED: Service resolution with fallback
  const resolvedPurchaseOrderService =
    propPurchaseOrderService || purchaseOrderService;

  // ✅ ENHANCED STATE MANAGEMENT
  const [purchaseOrders, setPurchaseOrders] = useState(propPurchaseOrders);
  const [isLoading, setIsLoading] = useState(propIsLoading);
  const [fetchError, setFetchError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // ✅ Modal and UI state
  const [viewModalShow, setViewModalShow] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [activeOrderType, setActiveOrderType] = useState("all");
  const [deletingOrders, setDeletingOrders] = useState(new Set());
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);
  const [localFilterStatus, setLocalFilterStatus] = useState(
    filterStatus === "all" ? "" : filterStatus || ""
  );
  const [showCancelledOrders, setShowCancelledOrders] = useState(false);
  const [showGenerateSOModal, setShowGenerateSOModal] = useState(false);
  const [selectedOrderForSOGeneration, setSelectedOrderForSOGeneration] =
    useState(null);
  const [soGenerationLoading, setSOGenerationLoading] = useState(false);
  const [soGenerationError, setSOGenerationError] = useState(null);
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  const [lastGenerationTime, setLastGenerationTime] = useState(null);

  const [printModalShow, setPrintModalShow] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState(null);
  const [bulkPrintMode, setBulkPrintMode] = useState(false);
  const [selectedOrdersForBulkPrint, setSelectedOrdersForBulkPrint] = useState(
    []
  );
  const [confirmingOrders, setConfirmingOrders] = useState(new Set());
  const [lastConfirmationTime, setLastConfirmationTime] = useState(null);
  const [bulkConfirmationLoading, setBulkConfirmationLoading] = useState(false);
  const [printTemplate, setPrintTemplate] = useState("standard");
  const [printFormat, setPrintFormat] = useState("a4");
  const printComponentRef = useRef();

  // ✅ ENHANCED: Document type and navigation paths
  const getDocumentType = useCallback(() => {
    return "purchase-order";
  }, []);

  const getNavigationPaths = useCallback(() => {
    return DOCUMENT_LABELS["purchase-order"];
  }, []);

  // ✅ ENHANCED: Data fetching function
  const fetchPurchaseOrders = useCallback(
    async (force = false) => {
      if (!companyId) {
        return;
      }

      // Skip if data is fresh and not forced
      if (!force && lastFetchTime && Date.now() - lastFetchTime < 30000) {
        return;
      }

      try {
        setIsLoading(true);
        setFetchError(null);

        let response;

        try {
          response = await resolvedPurchaseOrderService.getPurchaseOrders(
            companyId,
            {
              includeBidirectional: true,
              includeSourceOrders: true,
              includeGeneratedOrders: true,
              includeTrackingChain: true,
              populateSupplier: true,
              populateItems: true,
              sortBy: sortBy || "date",
              sortOrder: sortOrder || "desc",
              status: filterStatus !== "all" ? filterStatus : undefined,
              search: searchTerm || undefined,
            }
          );
        } catch (fetchError) {
          console.error("❌ Purchase orders fetch failed:", fetchError);
          throw fetchError;
        }

        if (response?.success && response?.data) {
          // ✅ Enhanced data extraction with comprehensive fallbacks
          let orders = [];

          // ✅ Enhanced response structure handling
          if (Array.isArray(response.data)) {
            orders = response.data;
          } else if (response.data && typeof response.data === "object") {
            const possibleArrayKeys = [
              "purchaseOrders",
              "orders",
              "data",
              "purchase_orders",
              "purchaseOrder",
              "transactions",
              "documents",
              "items",
              "results",
              "records",
              "order",
              "list",
              "content",
              "rows",
              "values",
            ];

            let foundOrders = false;

            // Method 1: Try known property names
            for (const key of possibleArrayKeys) {
              if (response.data[key] && Array.isArray(response.data[key])) {
                orders = response.data[key];

                foundOrders = true;
                break;
              }
            }

            // Method 2: If no known properties, inspect all properties
            if (!foundOrders) {
              for (const [key, value] of Object.entries(response.data)) {
                if (Array.isArray(value)) {
                  if (value.length > 0) {
                    const firstItem = value[0];
                    const hasOrderProperties = Boolean(
                      firstItem &&
                        typeof firstItem === "object" &&
                        (firstItem.orderNumber ||
                          firstItem._id ||
                          firstItem.id ||
                          firstItem.supplier ||
                          firstItem.supplierName ||
                          firstItem.amount ||
                          firstItem.total ||
                          firstItem.items)
                    );

                    if (hasOrderProperties) {
                      orders = value;

                      foundOrders = true;
                      break;
                    }
                  }
                }
              }
            }

            // Method 3: If still no arrays found, check if response.data itself is an order
            if (!foundOrders) {
              const hasOrderProperties = Boolean(
                response.data.orderNumber ||
                  response.data._id ||
                  response.data.id ||
                  response.data.supplier ||
                  response.data.supplierName
              );

              if (hasOrderProperties) {
                orders = [response.data];

                foundOrders = true;
              }
            }
          }

          if (orders.length === 0) {
            setPurchaseOrders([]);
            setLastFetchTime(Date.now());
            setFetchError(null);
            return;
          }

          // ✅ Process orders with minimal transformation
          const processedOrders = orders
            .filter((order) => order != null)
            .map((order) => ({
              ...order,
              displaySupplierName:
                order.supplierName ||
                order.supplier?.name ||
                order.partyName ||
                "Unknown Supplier",
              displayAmount: parseFloat(
                order.amount || order.total || order.totals?.finalTotal || 0
              ),
              displayStatus: order.status || "draft",
              displayDate:
                order.orderDate || order.purchaseDate || order.createdAt,
            }));

          setPurchaseOrders(processedOrders);
          setLastFetchTime(Date.now());
          setFetchError(null);
        } else {
          console.error("❌ Invalid response structure:", response);
          throw new Error(
            response?.message ||
              "Failed to fetch purchase orders - Invalid response"
          );
        }
      } catch (error) {
        console.error("❌ Error fetching purchase orders:", {
          error: error.message,
          stack: error.stack,
          companyId,
          serviceAvailable: !!resolvedPurchaseOrderService,
        });

        setFetchError(error.message);

        // ✅ Fallback to provided data
        if (propPurchaseOrders && propPurchaseOrders.length > 0) {
          setPurchaseOrders(propPurchaseOrders);
        } else {
          setPurchaseOrders([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      companyId,
      sortBy,
      sortOrder,
      filterStatus,
      searchTerm,
      propPurchaseOrders,
      addToast,
      lastFetchTime,
      resolvedPurchaseOrderService,
    ]
  );

  // ✅ Auto-fetch on mount and dependency changes
  useEffect(() => {
    if (companyId) {
      fetchPurchaseOrders(true);
    }
  }, [companyId, refreshTrigger]);

  // ✅ Refresh when filters change
  useEffect(() => {
    if (companyId && lastFetchTime) {
      const delayedFetch = setTimeout(() => {
        fetchPurchaseOrders(false);
      }, 500);

      return () => clearTimeout(delayedFetch);
    }
  }, [searchTerm, filterStatus, sortBy, sortOrder, fetchPurchaseOrders]);

  // ✅ Auto-refresh after conversions
  useEffect(() => {
    const state = location.state;
    if (state?.conversionSuccess || state?.generatedFrom) {
      setLastGenerationTime(Date.now());
      setTimeout(() => {
        fetchPurchaseOrders(true);
      }, 1000);
    }
  }, [location.state, fetchPurchaseOrders]);

  // ✅ Add periodic refresh for recently generated orders
  useEffect(() => {
    if (lastGenerationTime && Date.now() - lastGenerationTime < 30000) {
      const interval = setInterval(() => {
        fetchPurchaseOrders(true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [lastGenerationTime, fetchPurchaseOrders]);

  // ✅ Final data resolution with multiple fallbacks
  const finalPurchaseOrders = useMemo(() => {
    const orders =
      Array.isArray(purchaseOrders) && purchaseOrders.length > 0
        ? purchaseOrders
        : Array.isArray(propPurchaseOrders)
        ? propPurchaseOrders
        : [];

    return orders.filter((order) => order != null);
  }, [purchaseOrders, propPurchaseOrders]);

  const finalIsLoading = isLoading || propIsLoading;

  // ✅ Order source detection
  const getOrderSource = useCallback((order) => {
    // ✅ Check if order came from a sales order
    const isFromSalesOrder = Boolean(
      order.isAutoGenerated === true &&
        order.sourceOrderId &&
        order.sourceOrderType === "sales_order"
    );

    if (isFromSalesOrder) {
      return {
        type: "fromSO",
        label: "From Sales Order",
        icon: faArrowRight,
        color: "info",
        description: `Generated from: ${
          order.sourceOrderNumber || order.sourceOrderId
        }`,
        sourceOrderNumber: order.sourceOrderNumber,
        sourceCompanyId: order.sourceCompanyId,
      };
    } else {
      return {
        type: "self",
        label: "Self Created",
        icon: faUser,
        color: "success",
        description: "Created directly",
      };
    }
  }, []);

  const handleBulkConfirmOrders = useCallback(
    async (orders) => {
      try {
        if (!orders || orders.length === 0) {
          addToast?.("No orders selected for confirmation", "warning");
          return;
        }

        // ✅ FIXED: Include both "sent" and "draft" status in filter for purchase orders
        const confirmableOrders = orders.filter(
          (order) =>
            order.isAutoGenerated &&
            order.generatedFrom === "sales_order" &&
            (order.status === "sent" || order.status === "draft") &&
            !order.confirmedAt &&
            !order.isConfirmed &&
            order.status !== "confirmed"
        );

        if (confirmableOrders.length === 0) {
          addToast?.("No orders need confirmation", "warning");
          return;
        }

        const confirmed = window.confirm(
          `Are you sure you want to confirm ${confirmableOrders.length} auto-generated purchase orders?`
        );

        if (!confirmed) return;

        setBulkConfirmationLoading(true);
        addToast?.(`Confirming ${confirmableOrders.length} orders...`, "info");

        const confirmationData = {
          confirmedBy: currentUser?.id || currentUser?._id || "system",
          notes: `Bulk confirmed by ${
            currentUser?.name || "user"
          } on ${new Date().toLocaleString()}`,
        };

        const response = await resolvedPurchaseOrderService.bulkConfirmOrders(
          confirmableOrders.map((order) => order._id || order.id),
          confirmationData
        );

        if (response.success) {
          const successCount = response.data.data?.successful?.length || 0;
          const failedCount = response.data.data?.failed?.length || 0;

          addToast?.(
            `✅ Bulk confirmation completed: ${successCount} successful${
              failedCount > 0 ? `, ${failedCount} failed` : ""
            }`,
            successCount > 0 ? "success" : "warning"
          );

          // Update last confirmation time and refresh
          setLastConfirmationTime(Date.now());
          fetchPurchaseOrders(true);
        } else {
          throw new Error(response.message || "Failed to bulk confirm orders");
        }
      } catch (error) {
        console.error("❌ Error bulk confirming purchase orders:", error);
        addToast?.(`Failed to bulk confirm orders: ${error.message}`, "error");
      } finally {
        setBulkConfirmationLoading(false);
      }
    },
    [resolvedPurchaseOrderService, currentUser, addToast, fetchPurchaseOrders]
  );

  const ConfirmationStatusBadge = ({order}) => {
    // ✅ FIXED: Include draft status for auto-generated orders
    const needsConfirmation = Boolean(
      order.isAutoGenerated &&
        order.generatedFrom === "sales_order" &&
        (order.status === "sent" || order.status === "draft") &&
        !order.confirmedAt &&
        !order.isConfirmed &&
        order.status !== "confirmed"
    );

    // ✅ FIXED: Enhanced confirmation check
    const isConfirmed = Boolean(
      order.isAutoGenerated &&
        order.generatedFrom === "sales_order" &&
        (order.status === "confirmed" || order.confirmedAt || order.isConfirmed)
    );

    if (needsConfirmation) {
      return (
        <Badge
          bg="warning"
          className="d-flex align-items-center confirmation-badge"
          style={{fontSize: "0.7rem", animation: "pulse 2s infinite"}}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
          Needs Confirmation
        </Badge>
      );
    }

    if (isConfirmed) {
      return (
        <Badge
          bg="success"
          className="d-flex align-items-center confirmation-badge"
          style={{fontSize: "0.7rem"}}
        >
          <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
          Confirmed
          {order.confirmedAt && (
            <small className="ms-1 text-white-75">
              {new Date(order.confirmedAt).toLocaleDateString("en-GB")}
            </small>
          )}
        </Badge>
      );
    }

    return null;
  };

  // ✅ ORDER CATEGORIZATION
  const categorizeOrders = useMemo(() => {
    const all = Array.isArray(finalPurchaseOrders) ? finalPurchaseOrders : [];
    const selfCreated = [];
    const fromSalesOrders = [];
    const autoGenerated = [];

    all.forEach((order) => {
      if (!order) return;

      const source = getOrderSource(order);
      if (source.type === "fromSO") {
        fromSalesOrders.push(order);
        if (order.isAutoGenerated === true) {
          autoGenerated.push(order);
        }
      } else {
        selfCreated.push(order);
      }
    });

    return {all, selfCreated, fromSalesOrders, autoGenerated};
  }, [finalPurchaseOrders, getOrderSource]);

  // ✅ Enhanced filtering logic
  const getFilteredOrders = () => {
    let orders = [...finalPurchaseOrders];

    // ✅ Apply order type filter
    switch (activeOrderType) {
      case "self":
        orders = categorizeOrders.selfCreated;
        break;
      case "fromSO":
        orders = categorizeOrders.fromSalesOrders;
        break;
      case "auto":
        orders = categorizeOrders.autoGenerated;
        break;
      default:
        orders = categorizeOrders.all;
    }

    // ✅ Search filter
    if (localSearchTerm && localSearchTerm.trim()) {
      const searchLower = localSearchTerm.toLowerCase();
      orders = orders.filter(
        (order) =>
          (order.orderNumber || "").toLowerCase().includes(searchLower) ||
          (order.supplierName || order.supplier?.name || "")
            .toLowerCase()
            .includes(searchLower) ||
          (order.supplierMobile || order.supplier?.mobile || "")
            .toLowerCase()
            .includes(searchLower) ||
          (order.notes || "").toLowerCase().includes(searchLower)
      );
    }

    // ✅ Status filter
    if (
      localFilterStatus &&
      localFilterStatus !== "all" &&
      localFilterStatus !== ""
    ) {
      orders = orders.filter((order) => order.status === localFilterStatus);
    }

    // ✅ Sorting logic
    if (orders.length > 0) {
      orders.sort((a, b) => {
        let aVal, bVal;

        switch (localSortBy) {
          case "date":
            aVal = new Date(a.orderDate || a.date || a.createdAt || 0);
            bVal = new Date(b.orderDate || b.date || b.createdAt || 0);
            if (isNaN(aVal.getTime())) aVal = new Date(0);
            if (isNaN(bVal.getTime())) bVal = new Date(0);
            break;
          case "amount":
            aVal = parseFloat(a.amount || a.total || a.totals?.finalTotal || 0);
            bVal = parseFloat(b.amount || b.total || b.totals?.finalTotal || 0);
            if (isNaN(aVal)) aVal = 0;
            if (isNaN(bVal)) bVal = 0;
            break;
          case "supplier":
            aVal = (a.supplierName || a.supplier?.name || "").toLowerCase();
            bVal = (b.supplierName || b.supplier?.name || "").toLowerCase();
            break;
          default:
            aVal = a.orderNumber || "";
            bVal = b.orderNumber || "";
        }

        try {
          if (localSortOrder === "desc") {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
          } else {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          }
        } catch (error) {
          return 0;
        }
      });
    }

    return orders;
  };

  // ✅ Safe fallback for filteredOrders
  const filteredOrders = useMemo(() => {
    try {
      return getFilteredOrders();
    } catch (error) {
      console.error("Error filtering orders:", error);
      return [];
    }
  }, [
    localSearchTerm,
    localFilterStatus,
    localSortBy,
    localSortOrder,
    finalPurchaseOrders,
    activeOrderType,
    categorizeOrders,
  ]);

  // ✅ MODAL HANDLER FOR SALES ORDER GENERATION
  const handleModalGenerateSalesOrder = useCallback((order) => {
    setViewModalShow(false);
    setSelectedOrderForSOGeneration(order);
    setShowGenerateSOModal(true);
    setSOGenerationError(null);
  }, []);

  // ✅ ENHANCED GENERATE SALES ORDER MODAL
  const GenerateSalesOrderModal = ({show, onHide, order}) => {
    const [confirmationData, setConfirmationData] = useState({
      notes: "",
      priority: "normal",
      expectedDeliveryDate: "",
      termsAndConditions: "",
      autoLinkSupplier: true,
    });

    // In your PurchaseOrderTable.jsx GenerateSalesOrderModal
    const handleGenerate = async () => {
      try {
        setSOGenerationLoading(true);
        setSOGenerationError(null);
        const response = await resolvedPurchaseOrderService.generateSalesOrder(
          order._id,
          {
            ...conversionData,
            // ✅ Add explicit debug flag
            debug: true,
            validateCompanies: true,
          }
        );

        if (response.success) {
          // Success handling...
        } else {
          throw new Error(response.message || "Generation failed");
        }
      } catch (error) {
        console.error("❌ Frontend SO generation error:", {
          error: error.message,
          order: {
            id: order._id,
            number: order.orderNumber,
            companyId: order.companyId,
            targetCompanyId: order.targetCompanyId,
          },
        });

        // ✅ Enhanced error display
        setSOGenerationError(`Generation Failed: ${error.message}
    
    Debug Info:
    - Order: ${order.orderNumber}
    - Source Company: ${order.companyId}
    - Target Company: ${order.targetCompanyId || "Not set"}
    - Supplier: ${order.supplierName || "Unknown"}
    
    Please check the supplier's company linkage in the database.`);
      } finally {
        setSOGenerationLoading(false);
      }
    };

    if (!order) return null;

    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
            Generate Sales Order
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {soGenerationError && (
            <Alert variant="danger" className="mb-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              <pre
                style={{whiteSpace: "pre-wrap", margin: 0, fontSize: "0.9em"}}
              >
                {soGenerationError}
              </pre>
            </Alert>
          )}

          <div className="mb-4">
            <h6 className="text-info mb-3">
              <FontAwesomeIcon icon={faClipboardList} className="me-2" />
              Purchase Order Details
            </h6>
            <Row>
              <Col md={6}>
                <div className="mb-2">
                  <strong>Order Number:</strong>
                  <div className="text-primary">
                    {order.orderNumber || "N/A"}
                  </div>
                </div>
                <div className="mb-2">
                  <strong>Supplier:</strong>
                  <div>
                    {order.supplierName || order.supplier?.name || "Unknown"}
                  </div>
                  {(order.supplierMobile || order.supplier?.mobile) && (
                    <small className="text-muted">
                      {order.supplierMobile || order.supplier?.mobile}
                    </small>
                  )}
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-2">
                  <strong>Order Value:</strong>
                  <div className="h6 text-success">
                    ₹{(order.amount || 0).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="mb-2">
                  <strong>Items:</strong>
                  <div>
                    <Badge bg="info">
                      {(order.items || []).length} item
                      {(order.items || []).length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          <div className="mb-3">
            <h6 className="text-info mb-3">
              <FontAwesomeIcon icon={faEdit} className="me-2" />
              Sales Order Configuration
            </h6>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={confirmationData.priority}
                    onChange={(e) =>
                      setConfirmationData((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Expected Delivery Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={confirmationData.expectedDeliveryDate}
                    onChange={(e) =>
                      setConfirmationData((prev) => ({
                        ...prev,
                        expectedDeliveryDate: e.target.value,
                      }))
                    }
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Additional Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder={`Generated from Purchase Order: ${order.orderNumber}`}
                value={confirmationData.notes}
                onChange={(e) =>
                  setConfirmationData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="autoLinkSupplier"
                checked={confirmationData.autoLinkSupplier}
                onChange={(e) =>
                  setConfirmationData((prev) => ({
                    ...prev,
                    autoLinkSupplier: e.target.checked,
                  }))
                }
                label="Automatically link supplier as customer (recommended)"
                className="text-info"
              />
            </Form.Group>
          </div>

          <Alert variant="info" className="mb-3">
            <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
            <strong>What will happen:</strong>
            <ul className="mb-0 mt-2">
              <li>
                A new sales order will be created with the supplier as customer
              </li>
              <li>
                All items and pricing will be copied from this purchase order
              </li>
              <li>You can track the status of both orders bidirectionally</li>
              {confirmationData.autoLinkSupplier && (
                <li className="text-success">
                  ✅ Supplier will be linked as customer
                </li>
              )}
            </ul>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={onHide}
            disabled={soGenerationLoading}
          >
            Cancel
          </Button>
          <Button
            variant="info"
            onClick={handleGenerate}
            disabled={soGenerationLoading}
          >
            {soGenerationLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="me-2 fa-spin" />
                Generating...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                Generate Sales Order
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // ✅ ORDER TRANSFORMATION FOR EDIT
  const transformOrderForEdit = useCallback(
    (order) => {
      const transformedItems = (order.items || []).map((item, index) => {
        const quantity = parseFloat(item.quantity || item.qty || 1);
        const pricePerUnit = parseFloat(
          item.pricePerUnit ||
            item.unitPrice ||
            item.rate ||
            item.price ||
            item.purchasePrice ||
            item.costPrice ||
            0
        );
        const taxRate = parseFloat(item.taxRate || item.gstRate || 18);

        const subtotal = quantity * pricePerUnit;
        const discountAmount = parseFloat(item.discountAmount || 0);
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = (taxableAmount * taxRate) / 100;
        const cgstAmount = taxAmount / 2;
        const sgstAmount = taxAmount / 2;
        const totalAmount = taxableAmount + taxAmount;

        return {
          id: item.id || item._id || `item-${index}-${Date.now()}`,
          _id: item.id || item._id,
          itemRef: item.itemRef || item.productId || item.id,
          itemName: item.itemName || item.productName || item.name || "",
          itemCode: item.itemCode || item.productCode || item.code || "",
          hsnCode: item.hsnCode || item.hsnNumber || "0000",
          quantity: quantity,
          unit: item.unit || "PCS",
          pricePerUnit: pricePerUnit,
          taxRate: taxRate,
          discountPercent: parseFloat(item.discountPercent || 0),
          discountAmount: discountAmount,
          taxableAmount: taxableAmount,
          cgstAmount: cgstAmount,
          sgstAmount: sgstAmount,
          igst: parseFloat(item.igst || 0),
          amount: totalAmount,
          category: item.category || "",
          currentStock: parseFloat(item.currentStock || 0),
          taxMode: item.taxMode || order.taxMode || "without-tax",
          priceIncludesTax: Boolean(
            item.priceIncludesTax || order.priceIncludesTax
          ),
          selectedProduct: item.itemRef
            ? {
                id: item.itemRef,
                _id: item.itemRef,
                name: item.itemName || item.productName,
                purchasePrice: pricePerUnit,
                gstRate: taxRate,
                hsnCode: item.hsnCode || "0000",
                unit: item.unit || "PCS",
              }
            : null,
        };
      });

      const supplierData =
        order.supplier && typeof order.supplier === "object"
          ? {
              id: order.supplier._id || order.supplier.id,
              _id: order.supplier._id || order.supplier.id,
              name: order.supplier.name || order.supplier.supplierName || "",
              mobile: order.supplier.mobile || order.supplier.phone || "",
              email: order.supplier.email || "",
              address: order.supplier.address || "",
              gstNumber: order.supplier.gstNumber || "",
            }
          : {
              id: order.supplierId || order.supplier,
              _id: order.supplierId || order.supplier,
              name: order.supplierName || order.partyName || "",
              mobile:
                order.supplierMobile ||
                order.partyPhone ||
                order.mobileNumber ||
                "",
              email: order.supplierEmail || order.partyEmail || "",
              address: order.supplierAddress || order.partyAddress || "",
              gstNumber: order.supplierGstNumber || "",
            };

      const totalAmount = parseFloat(
        order.amount ||
          order.total ||
          order.totals?.finalTotal ||
          order.grandTotal ||
          order.orderValue ||
          0
      );

      return {
        id: order._id || order.id,
        _id: order._id || order.id,
        documentType: "purchase-order",
        orderNumber:
          order.orderNumber ||
          order.purchaseOrderNumber ||
          order.purchaseNumber ||
          order.billNumber,
        orderDate:
          order.orderDate || order.purchaseDate || order.billDate || order.date,
        expectedDeliveryDate:
          order.expectedDeliveryDate || order.deliveryDate || null,
        supplier: supplierData,
        supplierName: supplierData?.name || "",
        supplierMobile: supplierData?.mobile || "",
        items: transformedItems,
        amount: totalAmount,
        status: order.status || "draft",
        priority: order.priority || "normal",
        notes: order.notes || order.description || "",
        terms: order.terms || order.termsAndConditions || "",
        gstEnabled: order.gstEnabled !== undefined ? order.gstEnabled : true,
        taxMode: order.taxMode || "without-tax",
        priceIncludesTax: Boolean(order.priceIncludesTax),
        companyId: order.companyId || companyId,
        isAutoGenerated: Boolean(order.isAutoGenerated),
        sourceOrderType: order.sourceOrderType || null,
        sourceOrderId: order.sourceOrderId || null,
        sourceOrderNumber: order.sourceOrderNumber || null,
        sourceCompanyId: order.sourceCompanyId || null,
        hasCorrespondingSalesOrder: Boolean(order.hasCorrespondingSalesOrder),
        correspondingSalesOrderId: order.correspondingSalesOrderId || null,
        hasGeneratedSalesOrder: Boolean(order.hasGeneratedSalesOrder),
        trackingInfo: order.trackingInfo || null,
        isTransformed: true,
      };
    },
    [companyId]
  );

  const handleConfirmGeneratedOrder = useCallback(
    async (order) => {
      try {
        const orderId = order._id || order.id;

        // Check if already confirming
        if (confirmingOrders.has(orderId)) {
          return;
        }

        // Validate order is eligible for confirmation
        if (
          !order.isAutoGenerated ||
          order.generatedFrom !== "sales_order" ||
          order.status === "confirmed" ||
          order.confirmedAt ||
          order.isConfirmed
        ) {
          addToast?.("This order is not eligible for confirmation", "warning");
          return;
        }

        setConfirmingOrders((prev) => new Set(prev).add(orderId));
        setModalLoading(true);

        const confirmationData = {
          confirmedBy: currentUser?.id || currentUser?._id || "system",
          notes: `Confirmed by ${
            currentUser?.name || "user"
          } on ${new Date().toLocaleString()}`,
          status: "confirmed",
          confirmedAt: new Date().toISOString(),
          isConfirmed: true,
        };

        const response =
          await resolvedPurchaseOrderService.confirmPurchaseOrder(
            orderId,
            confirmationData
          );

        if (response.success) {
          addToast?.(
            `✅ Purchase order ${order.orderNumber} confirmed successfully`,
            "success"
          );

          // Close modal if open
          if (viewModalShow && selectedOrder?._id === orderId) {
            setViewModalShow(false);
            setSelectedOrder(null);
          }

          // Update confirmation time and refresh
          setLastConfirmationTime(Date.now());
          fetchPurchaseOrders(true);

          // Call external handler if provided
          if (onConfirmOrder) {
            onConfirmOrder(order);
          }
        } else {
          throw new Error(response.message || "Failed to confirm order");
        }
      } catch (error) {
        console.error("❌ Error confirming purchase order:", error);
        addToast?.(`Failed to confirm order: ${error.message}`, "error");
      } finally {
        setModalLoading(false);
        setConfirmingOrders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(order._id || order.id);
          return newSet;
        });
      }
    },
    [
      resolvedPurchaseOrderService,
      currentUser,
      addToast,
      onConfirmOrder,
      viewModalShow,
      selectedOrder,
      fetchPurchaseOrders,
      confirmingOrders,
    ]
  );
  const handleAction = useCallback(
    async (action, order, ...args) => {
      const targetOrder = order || selectedOrder;
      if (!targetOrder) return;

      const orderId = targetOrder._id || targetOrder.id;

      try {
        switch (action) {
          case "view":
            setModalLoading(true);
            setModalError(null);
            const transformedOrder = transformOrderForEdit(targetOrder);

            // ✅ Enhanced order for UniversalViewModal
            const enhancedOrder = {
              ...transformedOrder,
              documentType: "purchase-order",
              purchaseOrderNumber: transformedOrder.orderNumber || "N/A",
              orderNumber: transformedOrder.orderNumber || "N/A",

              // Dates
              orderDate: transformedOrder.orderDate,
              purchaseDate: transformedOrder.orderDate,
              date: transformedOrder.orderDate,
              expectedDeliveryDate: transformedOrder.expectedDeliveryDate,
              deliveryDate: transformedOrder.expectedDeliveryDate,

              // Supplier information (mapped to party fields for UniversalViewModal)
              supplierName:
                transformedOrder.supplierName ||
                transformedOrder.supplier?.name ||
                "Unknown Supplier",
              partyName:
                transformedOrder.supplierName ||
                transformedOrder.supplier?.name ||
                "Unknown Supplier",
              supplierMobile:
                transformedOrder.supplierMobile ||
                transformedOrder.supplier?.mobile ||
                "",
              partyPhone:
                transformedOrder.supplierMobile ||
                transformedOrder.supplier?.mobile ||
                "",
              supplierEmail: transformedOrder.supplier?.email || "",
              partyEmail: transformedOrder.supplier?.email || "",
              supplierAddress: transformedOrder.supplier?.address || "",
              partyAddress: transformedOrder.supplier?.address || "",
              supplierGstNumber: transformedOrder.supplier?.gstNumber || "",
              partyGstNumber: transformedOrder.supplier?.gstNumber || "",

              // Order details
              orderType: transformedOrder.isAutoGenerated
                ? "Auto-Generated"
                : "Manual",
              paymentType: transformedOrder.isAutoGenerated
                ? "Auto-Generated Order"
                : "Purchase Order",
              status: transformedOrder.status || "draft",
              priority: transformedOrder.priority || "normal",

              // Financial information
              amount: transformedOrder.amount || 0,
              totalAmount: transformedOrder.amount || 0,
              grandTotal: transformedOrder.amount || 0,

              items: (transformedOrder.items || []).map((item) => ({
                ...item,
                productName:
                  item.itemName ||
                  item.productName ||
                  item.name ||
                  "Unknown Item",
                itemName:
                  item.itemName ||
                  item.productName ||
                  item.name ||
                  "Unknown Item",
                name:
                  item.itemName ||
                  item.productName ||
                  item.name ||
                  "Unknown Item",
                quantity: item.quantity || 0,
                unit: item.unit || "PCS",
                price:
                  item.pricePerUnit ||
                  item.unitPrice ||
                  item.rate ||
                  item.price ||
                  0,
                rate:
                  item.pricePerUnit ||
                  item.unitPrice ||
                  item.rate ||
                  item.price ||
                  0,
                purchasePrice:
                  item.pricePerUnit ||
                  item.unitPrice ||
                  item.rate ||
                  item.price ||
                  0,
                amount:
                  item.amount ||
                  item.totalAmount ||
                  item.quantity * item.pricePerUnit ||
                  0,
                totalAmount:
                  item.amount ||
                  item.totalAmount ||
                  item.quantity * item.pricePerUnit ||
                  0,
                hsnNumber: item.hsnCode || item.hsnNumber || "",
                itemCode: item.itemCode || item.productCode || "",
                productCode: item.itemCode || item.productCode || "",
              })),

              // Additional metadata
              notes: transformedOrder.notes || "",
              description: transformedOrder.notes || "",
              terms: transformedOrder.terms || "",

              // Source tracking
              isAutoGenerated: transformedOrder.isAutoGenerated || false,
              sourceOrderType: transformedOrder.sourceOrderType,
              sourceOrderNumber: transformedOrder.sourceOrderNumber,
              sourceOrderId: transformedOrder.sourceOrderId,

              // ✅ ADD: Sales Order Generation Status
              hasGeneratedSalesOrder: Boolean(
                targetOrder.hasGeneratedSalesOrder ||
                  targetOrder.autoGeneratedSalesOrder ||
                  targetOrder.salesOrderRef
              ),
              hasCorrespondingSalesOrder: Boolean(
                targetOrder.hasCorrespondingSalesOrder ||
                  targetOrder.correspondingSalesOrderId
              ),
              salesOrderNumber: targetOrder.salesOrderNumber || null,
              correspondingSalesOrderId:
                targetOrder.correspondingSalesOrderId || null,

              // Conversion status
              convertedToInvoice:
                transformedOrder.hasGeneratedSalesOrder || false,
              invoiceNumber: transformedOrder.correspondingSalesOrderId || null,

              // Display helpers
              displayNumber: transformedOrder.orderNumber || "N/A",
              displayDate: new Date(
                transformedOrder.orderDate
              ).toLocaleDateString("en-GB"),
              displaySupplier:
                transformedOrder.supplierName || "Unknown Supplier",
              displayAmount: `₹${transformedOrder.amount.toLocaleString(
                "en-IN"
              )}`,
              displayStatus: transformedOrder.status || "draft",
              displayPriority: transformedOrder.priority || "normal",
              displayExpectedDelivery: transformedOrder.expectedDeliveryDate
                ? new Date(
                    transformedOrder.expectedDeliveryDate
                  ).toLocaleDateString("en-GB")
                : "Not set",
            };

            setSelectedOrder(enhancedOrder);
            setViewModalShow(true);
            setModalLoading(false);
            onViewOrder?.(targetOrder);
            break;

          case "edit":
            if (
              targetOrder.status === "cancelled" ||
              targetOrder.status === "deleted"
            ) {
              return;
            }
            const editTransformed = transformOrderForEdit(targetOrder);
            const editPath = `/companies/${companyId}/purchase-orders/${orderId}/edit`;
            navigate(editPath, {
              state: {
                purchaseOrder: editTransformed,
                order: editTransformed,
                transaction: editTransformed,
                documentType: "purchase-order",
                mode: "purchase-orders",
                returnPath: location.pathname,
                editMode: true,
              },
            });
            if (viewModalShow) {
              setViewModalShow(false);
              setSelectedOrder(null);
            }
            onEditOrder?.(targetOrder);
            break;

          case "delete":
            if (
              deletingOrders.has(orderId) ||
              targetOrder.status === "cancelled"
            ) {
              return;
            }

            setDeletingOrders((prev) => new Set(prev).add(orderId));
            setModalLoading(true);

            const orderNumber =
              targetOrder.orderNumber || "this purchase order";
            const confirmed = window.confirm(
              `Are you sure you want to delete purchase order ${orderNumber}?`
            );

            if (!confirmed) {
              setModalLoading(false);
              setDeletingOrders((prev) => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
              });
              return;
            }

            const deleteOptions = {
              hard: targetOrder.status === "draft",
              reason: "Deleted by user",
            };

            const deleteResponse =
              await resolvedPurchaseOrderService.deletePurchaseOrder(
                orderId,
                deleteOptions
              );

            if (deleteResponse.success) {
              addToast?.(
                deleteResponse.message || "Purchase order deleted successfully",
                "success"
              );
              if (viewModalShow) {
                setViewModalShow(false);
                setSelectedOrder(null);
              }
              onDeleteOrder?.(targetOrder);
            } else {
              throw new Error(
                deleteResponse.message || "Failed to delete purchase order"
              );
            }
            break;

          case "duplicate":
            const duplicateTransformed = transformOrderForEdit(targetOrder);
            const duplicateData = {
              ...duplicateTransformed,
              id: undefined,
              _id: undefined,
              orderNumber: undefined,
              status: "draft",
              orderDate: new Date().toISOString(),
              isAutoGenerated: false,
              sourceOrderType: null,
              sourceOrderId: null,
              sourceOrderNumber: null,
              hasCorrespondingSalesOrder: false,
              hasGeneratedSalesOrder: false,
            };
            const createPath = `/companies/${companyId}/purchase-orders/new`;
            navigate(createPath, {
              state: {
                duplicateData: duplicateData,
                isDuplicate: true,
                originalOrder: targetOrder,
                returnPath: location.pathname,
              },
            });
            if (viewModalShow) {
              setViewModalShow(false);
              setSelectedOrder(null);
            }
            onDuplicateOrder?.(targetOrder);
            break;

          case "print":
            await handlePrintOrder(targetOrder);
            break;

          case "printPreview":
            await handlePrintPreview(targetOrder);
            break;

          case "downloadPDF":
            await handleDownloadPDF(targetOrder);
            break;

          case "bulkPrint":
            await handleBulkPrint([targetOrder]);
            break;

          case "share":
            onShareOrder?.(targetOrder);
            break;

          case "download":
            onDownloadOrder?.(targetOrder);
            break;

          case "convert":
            onConvertOrder?.(targetOrder);
            break;

          // ✅ NEW: Confirmation action
          case "confirm":
            await handleConfirmGeneratedOrder(targetOrder);
            break;

          // ✅ NEW: Bulk confirmation action
          case "bulkConfirm":
            await handleBulkConfirmOrders(args[0] || [targetOrder]);
            break;

          case "ship":
            onShipOrder?.(targetOrder);
            break;

          case "receive":
            onReceiveOrder?.(targetOrder);
            break;

          case "complete":
            onCompleteOrder?.(targetOrder);
            break;

          case "cancel":
            onCancelOrder?.(targetOrder);
            break;

          case "generateSalesOrder":
            if (onGenerateSalesOrder) {
              onGenerateSalesOrder(targetOrder);
            } else {
              handleModalGenerateSalesOrder(targetOrder);
            }
            break;

          case "viewTrackingChain":
            if (onViewTrackingChain) {
              onViewTrackingChain(targetOrder);
            } else {
              const response =
                await resolvedPurchaseOrderService.getTrackingChain(orderId);
            }
            break;

          case "viewSourceOrder":
            if (onViewSourceOrder) {
              onViewSourceOrder(targetOrder);
            } else if (
              targetOrder.sourceOrderId &&
              targetOrder.sourceOrderType === "sales_order"
            ) {
              navigate(
                `/companies/${companyId}/sales-orders/${targetOrder.sourceOrderId}`
              );
            }
            break;

          case "viewGeneratedOrders":
            if (onViewGeneratedOrders) {
              onViewGeneratedOrders(targetOrder);
            } else {
              const response =
                await resolvedPurchaseOrderService.getGeneratedOrders(orderId);
              if (response.success) {
                addToast?.("Generated orders loaded successfully", "success");
              }
            }
            break;

          default:
            console.warn("Unknown action:", action);
        }
      } catch (error) {
        console.error(`❌ Error handling action ${action}:`, error);
        addToast?.(
          error.message || `Failed to ${action} purchase order`,
          "error"
        );
      } finally {
        if (action === "delete") {
          setModalLoading(false);
          setDeletingOrders((prev) => {
            const newSet = new Set(prev);
            newSet.delete(orderId);
            return newSet;
          });
        }
      }
    },
    [
      selectedOrder,
      companyId,
      location.pathname,
      navigate,
      viewModalShow,
      deletingOrders,
      transformOrderForEdit,
      onViewOrder,
      onEditOrder,
      onDeleteOrder,
      onDuplicateOrder,
      onPrintOrder,
      onShareOrder,
      onDownloadOrder,
      onConvertOrder,
      onConfirmOrder,
      onShipOrder,
      onReceiveOrder,
      onCompleteOrder,
      onCancelOrder,
      onGenerateSalesOrder,
      onViewTrackingChain,
      onViewSourceOrder,
      onViewGeneratedOrders,
      addToast,
      handleModalGenerateSalesOrder,
      resolvedPurchaseOrderService,
      handleConfirmGeneratedOrder, // ✅ NEW: Add to dependencies
      handleBulkConfirmOrders, // ✅ NEW: Add to dependencies
    ]
  );
  const handleViewOrder = useCallback(
    (order) => handleAction("view", order),
    [handleAction]
  );

  const handleEditOrder = useCallback(
    (order) => handleAction("edit", order),
    [handleAction]
  );

  const handleDeleteOrder = useCallback(
    (order) => handleAction("delete", order),
    [handleAction]
  );

  const handleDuplicateOrder = useCallback(
    (order) => handleAction("duplicate", order),
    [handleAction]
  );

  const handlePrintOrder = useCallback(
    async (order, options = {}) => {
      try {
        setPrintLoading(true);
        setPrintError(null);
        setSelectedOrderForPrint(order);

        // Determine print service method based on document type
        let printServiceMethod;
        if (order.orderType === "purchase_quotation") {
          printServiceMethod =
            resolvedPurchaseOrderService.getPurchaseQuotationForPrint;
        } else if (order.orderType === "proforma_purchase") {
          printServiceMethod =
            resolvedPurchaseOrderService.getProformaPurchaseForPrint;
        } else {
          printServiceMethod =
            resolvedPurchaseOrderService.getPurchaseOrderForPrint;
        }

        // Prepare print options
        const printOptions = {
          template: options.template || printTemplate,
          format: options.format || printFormat,
          ...options,
        };

        // Call the appropriate print service
        let response;
        if (printServiceMethod && typeof printServiceMethod === "function") {
          response = await printServiceMethod(
            order._id || order.id,
            printOptions
          );
        } else {
          // Fallback to general print method
          response =
            await resolvedPurchaseOrderService.getPurchaseOrderForPrint(
              order._id || order.id,
              printOptions
            );
        }

        if (response.success && response.data) {
          setPrintData(response.data);
          setPrintModalShow(true);
          addToast?.("Print data loaded successfully", "success");
        } else {
          throw new Error(response.message || "Failed to load print data");
        }
      } catch (error) {
        setPrintError(error.message);
        addToast?.(`Failed to load print data: ${error.message}`, "error");
      } finally {
        setPrintLoading(false);
      }
    },
    [printTemplate, printFormat, resolvedPurchaseOrderService, addToast]
  );

  const handlePrintPreview = useCallback(
    async (order, options = {}) => {
      try {
        setPrintLoading(true);
        setPrintError(null);

        const previewOptions = {
          ...options,
          template: options.template || "preview",
          format: "html",
        };

        const response =
          await resolvedPurchaseOrderService.getPurchaseOrderForPrint(
            order._id || order.id,
            previewOptions
          );

        if (response.success && response.data) {
          setPrintData(response.data);
          setPrintModalShow(true);
        } else {
          throw new Error(response.message || "Failed to load print preview");
        }
      } catch (error) {
        addToast?.(`Failed to load print preview: ${error.message}`, "error");
      } finally {
        setPrintLoading(false);
      }
    },
    [resolvedPurchaseOrderService, addToast]
  );

  const handleBulkPrint = useCallback(
    async (orders, options = {}) => {
      try {
        setPrintLoading(true);
        setPrintError(null);
        setBulkPrintMode(true);

        const orderIds = orders.map((order) => order._id || order.id);

        const printOptions = {
          template: options.template || printTemplate,
          format: options.format || printFormat,
          ...options,
        };

        const response =
          await resolvedPurchaseOrderService.getBulkPurchaseOrdersForPrint(
            orderIds,
            printOptions
          );

        if (response.success && response.data) {
          setSelectedOrdersForBulkPrint(orders);
          setPrintData(response.data);
          setPrintModalShow(true);
          addToast?.(
            `${orders.length} orders prepared for bulk printing`,
            "success"
          );
        } else {
          throw new Error(response.message || "Failed to load bulk print data");
        }
      } catch (error) {
        setPrintError(error.message);
        addToast?.(`Failed to load bulk print data: ${error.message}`, "error");
      } finally {
        setPrintLoading(false);
      }
    },
    [printTemplate, printFormat, resolvedPurchaseOrderService, addToast]
  );

  const handleDownloadPDF = useCallback(
    async (order, options = {}) => {
      try {
        setPrintLoading(true);
        setPrintError(null);

        const downloadOptions = {
          template: options.template || printTemplate,
          format: "pdf",
          ...options,
        };

        const response =
          await resolvedPurchaseOrderService.downloadPurchaseOrderPDF(
            order._id || order.id,
            downloadOptions
          );

        if (!response.success) {
          throw new Error(response.message || "Failed to download PDF");
        }

        addToast?.("PDF download initiated", "success");
      } catch (error) {
        addToast?.(`Failed to download PDF: ${error.message}`, "error");
      } finally {
        setPrintLoading(false);
      }
    },
    [printTemplate, resolvedPurchaseOrderService, addToast]
  );

  const handleComponentPrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: selectedOrderForPrint
      ? `Purchase-Order-${
          selectedOrderForPrint.orderNumber || selectedOrderForPrint._id
        }`
      : "Purchase Order",
    onAfterPrint: () => {
      // ✅ FIXED: Close modal only - no refresh, no toasts
      setPrintModalShow(false);
      setSelectedOrderForPrint(null);
      setPrintData(null);
      setBulkPrintMode(false);
    },
    onPrintError: (errorLocation, error) => {
      addToast?.("Printing failed", "error");
    },
  });

  // ✅ ADD: Print Controls component (around line 800)
  const PrintControls = () => (
    <div className="d-flex gap-2 align-items-center">
      {/* Manual Refresh Button */}
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => fetchPurchaseOrders(true)}
        disabled={isLoading}
        title="Refresh orders list"
      >
        <FontAwesomeIcon
          icon={isLoading ? faSpinner : faUndo}
          className={`me-1 ${isLoading ? "fa-spin" : ""}`}
        />
        {isLoading ? "Loading..." : "Refresh"}
      </Button>

      {/* Simple Print Button */}
      <Button
        variant="outline-info"
        size="sm"
        onClick={() => {
          if (filteredOrders.length === 1) {
            handlePrintOrder(filteredOrders[0]);
          } else if (filteredOrders.length > 1) {
            // For multiple orders, show selection dialog or print first one
            handlePrintOrder(filteredOrders[0]);
          }
        }}
        disabled={filteredOrders.length === 0 || printLoading}
        title="Print order"
      >
        <FontAwesomeIcon
          icon={printLoading ? faSpinner : faPrint}
          className={`me-1 ${printLoading ? "fa-spin" : ""}`}
        />
        {printLoading ? "Processing..." : "Print"}
      </Button>

      {/* Print Status Indicator */}
      {printLoading && (
        <div className="d-flex align-items-center text-info">
          <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2" />
          <small>
            <strong>Preparing print...</strong>
          </small>
        </div>
      )}

      {/* Print Error Indicator */}
      {printError && (
        <div className="d-flex align-items-center text-danger">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <small>
            <strong>Print Error</strong>
          </small>
        </div>
      )}

      {/* Quick Stats */}
      {filteredOrders.length > 0 && (
        <div className="d-flex align-items-center">
          <small className="text-muted">
            <strong>{filteredOrders.length}</strong> order
            {filteredOrders.length !== 1 ? "s" : ""}
            {selectedOrders.length > 0 && enableBulkActions && (
              <span className="ms-2">
                (<strong>{selectedOrders.length}</strong> selected)
              </span>
            )}
          </small>
        </div>
      )}
    </div>
  );

  // ✅ ADD: Print Modal component (around line 900)
  const PrintModal = () => {
    if (!printModalShow) return null;

    return (
      <Modal
        show={printModalShow}
        onHide={() => {
          setPrintModalShow(false);
          setSelectedOrderForPrint(null);
          setPrintData(null);
          setBulkPrintMode(false);
          setPrintError(null);
        }}
        size="xl"
        centered
        backdrop="static" // ✅ ADDED: Prevent accidental closing
      >
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faPrint} className="me-2" />
            {bulkPrintMode
              ? `Print ${selectedOrdersForBulkPrint.length} Orders`
              : `Print Purchase Order`}
            {selectedOrderForPrint && (
              <Badge bg="light" text="dark" className="ms-2">
                {selectedOrderForPrint.orderNumber || selectedOrderForPrint._id}
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-0">
          {printError && (
            <Alert variant="danger" className="m-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              <strong>Print Error:</strong> {printError}
              <div className="mt-2">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setPrintError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </Alert>
          )}

          {printLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" size="lg" />
              <h5 className="mt-3 text-muted">Preparing print data...</h5>
              <p className="text-muted">
                {bulkPrintMode
                  ? `Processing ${selectedOrdersForBulkPrint.length} orders...`
                  : `Loading ${
                      selectedOrderForPrint?.orderNumber || "order"
                    }...`}
              </p>
            </div>
          ) : printData ? (
            <div
              className="print-preview-container"
              style={{maxHeight: "70vh", overflow: "auto"}}
            >
              {bulkPrintMode ? (
                <div ref={printComponentRef}>
                  {printData.orders?.map((orderData, index) => (
                    <div key={index} className="mb-4 page-break">
                      <PurchaseOrder orderData={orderData} />
                      {index < printData.orders.length - 1 && (
                        <div style={{pageBreakAfter: "always"}} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div ref={printComponentRef}>
                  <PurchaseOrder orderData={printData.data || printData} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-5">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                size="3x"
                className="text-warning mb-3"
              />
              <h5>No Print Data Available</h5>
              <p className="text-muted">
                Unable to load print data for the selected order(s).
              </p>
              <Button
                variant="outline-primary"
                onClick={() => {
                  setPrintModalShow(false);
                  setSelectedOrderForPrint(null);
                  setPrintData(null);
                  setBulkPrintMode(false);
                }}
              >
                Close
              </Button>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <div className="d-flex gap-2">
            {/* ✅ FIXED: Print button with no refresh */}
            <Button
              variant="primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleComponentPrint();
              }}
              disabled={printLoading || !printData}
            >
              <FontAwesomeIcon icon={faPrint} className="me-1" />
              Print Now
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setPrintModalShow(false);
                setSelectedOrderForPrint(null);
                setPrintData(null);
                setBulkPrintMode(false);
              }}
            >
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    );
  };

  const handleShareOrder = useCallback(
    (order) => handleAction("share", order),
    [handleAction]
  );

  const handleDownloadOrder = useCallback(
    (order) => handleAction("download", order),
    [handleAction]
  );

  const handleConvertOrder = useCallback(
    (order) => handleAction("convert", order),
    [handleAction]
  );

  const handleConfirmOrder = useCallback(
    (order) => handleAction("confirm", order),
    [handleAction]
  );

  const handleShipOrder = useCallback(
    (order) => handleAction("ship", order),
    [handleAction]
  );

  const handleReceiveOrder = useCallback(
    (order) => handleAction("receive", order),
    [handleAction]
  );

  const handleCompleteOrder = useCallback(
    (order) => handleAction("complete", order),
    [handleAction]
  );

  const handleCancelOrder = useCallback(
    (order) => handleAction("cancel", order),
    [handleAction]
  );

  const handleGenerateSalesOrder = useCallback(
    (order) => handleAction("generateSalesOrder", order),
    [handleAction]
  );

  const handleViewTrackingChain = useCallback(
    (order) => handleAction("viewTrackingChain", order),
    [handleAction]
  );

  const handleViewSourceOrder = useCallback(
    (order) => handleAction("viewSourceOrder", order),
    [handleAction]
  );

  const handleViewGeneratedOrders = useCallback(
    (order) => handleAction("viewGeneratedOrders", order),
    [handleAction]
  );

  // ✅ MODAL HANDLERS (these should go after the basic handlers)
  const handleModalEdit = useCallback(
    (order) => {
      setViewModalShow(false);
      setSelectedOrder(null);
      handleEditOrder(order);
    },
    [handleEditOrder]
  );

  const handleModalDownload = useCallback(
    (order) => {
      handleDownloadOrder(order);
    },
    [handleDownloadOrder]
  );

  const handleModalShare = useCallback(
    (order) => {
      handleShareOrder(order);
    },
    [handleShareOrder]
  );

  const handleModalConvert = useCallback(
    (order) => {
      handleConvertOrder(order);
    },
    [handleConvertOrder]
  );
  // Add this around line 1200 (after other modal handlers)
  const handleModalPrint = useCallback(
    (order) => {
      handlePrintOrder(order);
    },
    [handlePrintOrder]
  );
  const handleModalDuplicate = useCallback(
    (order) => {
      setViewModalShow(false);
      setSelectedOrder(null);
      handleDuplicateOrder(order);
    },
    [handleDuplicateOrder]
  );

  const handleModalDelete = useCallback(
    (order) => {
      setViewModalShow(false);
      setSelectedOrder(null);
      handleDeleteOrder(order);
    },
    [handleDeleteOrder]
  );

  const handleModalConfirm = useCallback(
    (order) => {
      handleConfirmOrder(order);
    },
    [handleConfirmOrder]
  );

  const handleModalShip = useCallback(
    (order) => {
      handleShipOrder(order);
    },
    [handleShipOrder]
  );

  const handleModalReceive = useCallback(
    (order) => {
      handleReceiveOrder(order);
    },
    [handleReceiveOrder]
  );

  const handleModalComplete = useCallback(
    (order) => {
      handleCompleteOrder(order);
    },
    [handleCompleteOrder]
  );

  const handleModalCancel = useCallback(
    (order) => {
      handleCancelOrder(order);
    },
    [handleCancelOrder]
  );

  const handleModalViewSource = useCallback(
    (order) => {
      handleViewSourceOrder(order);
    },
    [handleViewSourceOrder]
  );

  const handleModalViewGenerated = useCallback(
    (order) => {
      handleViewGeneratedOrders(order);
    },
    [handleViewGeneratedOrders]
  );

  const handleModalViewTracking = useCallback(
    (order) => {
      handleViewTrackingChain(order);
    },
    [handleViewTrackingChain]
  );
  // ✅ SEPARATED ORDERS
  const separatedOrders = useMemo(() => {
    const active = [];
    const cancelled = [];

    filteredOrders.forEach((order) => {
      if (order.status === "cancelled" || order.status === "deleted") {
        cancelled.push(order);
      } else {
        active.push(order);
      }
    });

    return {active, cancelled};
  }, [filteredOrders]);

  // ✅ COMPONENTS
  const OrderTypeFilter = () => {
    const filterOptions = [
      {
        key: "all",
        label: "All Orders",
        icon: faList,
        count: categorizeOrders.all.length,
        color: "primary",
      },
      {
        key: "self",
        label: "Self Created",
        icon: faUserTie,
        count: categorizeOrders.selfCreated.length,
        color: "success",
      },
      {
        key: "fromSO",
        label: "From Sales Orders",
        icon: faBuilding,
        count: categorizeOrders.fromSalesOrders.length,
        color: "warning",
      },
      {
        key: "auto",
        label: "Auto-Generated",
        icon: faRobot,
        count: categorizeOrders.autoGenerated.length,
        color: "info",
      },
    ];

    return (
      <div className="mb-3">
        <ButtonGroup size="sm" className="order-type-filter">
          {filterOptions.map((option) => (
            <Button
              key={option.key}
              variant={
                activeOrderType === option.key
                  ? option.color
                  : "outline-" + option.color
              }
              onClick={() => setActiveOrderType(option.key)}
              className="d-flex align-items-center"
            >
              <FontAwesomeIcon icon={option.icon} className="me-2" />
              {option.label}
              <Badge
                bg={activeOrderType === option.key ? "light" : option.color}
                text={activeOrderType === option.key ? "dark" : "white"}
                className="ms-2"
              >
                {option.count}
              </Badge>
            </Button>
          ))}
        </ButtonGroup>
      </div>
    );
  };

  const StatusBadge = ({status}) => {
    const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.default;

    return (
      <Badge
        bg={statusInfo.variant}
        className="d-flex align-items-center status-badge-compact"
      >
        <FontAwesomeIcon icon={statusInfo.icon} className="me-1" />
        {statusInfo.text}
      </Badge>
    );
  };

  const SourceBadge = ({order}) => {
    const source = getOrderSource(order);

    return (
      <div className="d-flex flex-column align-items-start gap-1">
        <Badge bg={source.color} className="d-flex align-items-center">
          <FontAwesomeIcon icon={source.icon} className="me-1" />
          {source.label}
        </Badge>
        {source.description && (
          <small className="text-muted" title={source.description}>
            {source.description.length > 25
              ? `${source.description.substring(0, 25)}...`
              : source.description}
          </small>
        )}
      </div>
    );
  };

  const ActionButton = ({order}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({
      top: 0,
      right: 0,
    });
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    const orderId = order._id || order.id;
    const isDeleting = deletingOrders.has(orderId);
    const isConfirming = confirmingOrders.has(orderId);
    const isCancelled =
      order.status === "cancelled" || order.status === "deleted";

    // Enhanced confirmation status logic
    const needsConfirmation = Boolean(
      order.isAutoGenerated &&
        order.generatedFrom === "sales_order" &&
        (order.status === "sent" || order.status === "draft") &&
        !order.confirmedAt &&
        !order.isConfirmed &&
        order.status !== "confirmed"
    );

    const isConfirmed = Boolean(
      order.isAutoGenerated &&
        order.generatedFrom === "sales_order" &&
        (order.status === "confirmed" || order.confirmedAt || order.isConfirmed)
    );

    const wasAutoGenerated = Boolean(
      order.isAutoGenerated && order.generatedFrom === "sales_order"
    );

    // Sales Order generation checks
    const isFromSalesOrder = Boolean(
      order.isAutoGenerated === true &&
        order.sourceOrderId &&
        order.sourceOrderType === "sales_order"
    );

    const canGenerateSO = Boolean(
      !isCancelled &&
        !order.hasGeneratedSalesOrder &&
        !order.autoGeneratedSalesOrder &&
        !order.salesOrderRef &&
        !isFromSalesOrder
    );

    const genInfo = {
      canGenerateSO: canGenerateSO,
      hasGeneratedSO: Boolean(
        order.hasGeneratedSalesOrder ||
          order.autoGeneratedSalesOrder ||
          order.salesOrderRef
      ),
      hasCorrespondingSO: Boolean(
        order.hasCorrespondingSalesOrder || order.correspondingSalesOrderId
      ),
      salesOrderNumber: order.salesOrderNumber || null,
      isFromSalesOrder: isFromSalesOrder,
      statusAllowed: !isCancelled,
      reasonIfDisabled: isCancelled
        ? "Cannot generate from cancelled orders"
        : order.hasGeneratedSalesOrder ||
          order.autoGeneratedSalesOrder ||
          order.salesOrderRef
        ? "Sales order already generated"
        : isFromSalesOrder
        ? "Cannot create circular reference"
        : null,
    };

    // ✅ FIXED: Calculate dropdown position relative to viewport
    const updateDropdownPosition = useCallback(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };

        // Calculate position
        let top = rect.bottom + 4;
        let right = viewport.width - rect.right;

        // Adjust if dropdown would go off-screen
        const dropdownWidth = 250;
        const dropdownHeight = 400;

        // If dropdown would go off right edge, align to left
        if (right < 0) {
          right = viewport.width - rect.left - dropdownWidth;
        }

        // If dropdown would go off bottom, show above button
        if (top + dropdownHeight > viewport.height) {
          top = rect.top - dropdownHeight - 4;
        }

        // Ensure dropdown doesn't go off top
        if (top < 10) {
          top = 10;
        }

        setDropdownPosition({top, right});
      }
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          isOpen &&
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // ✅ FIXED: Handle scroll with position update instead of closing
    useEffect(() => {
      const handleScroll = () => {
        if (isOpen) {
          updateDropdownPosition();
        }
      };

      const handleResize = () => {
        if (isOpen) {
          updateDropdownPosition();
        }
      };

      if (isOpen) {
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleResize);
        return () => {
          window.removeEventListener("scroll", handleScroll, true);
          window.removeEventListener("resize", handleResize);
        };
      }
    }, [isOpen, updateDropdownPosition]);

    const handleToggle = (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (!isOpen) {
        updateDropdownPosition();
      }
      setIsOpen(!isOpen);
    };

    const handleActionClick = (actionFn, ...args) => {
      actionFn(...args);
      setIsOpen(false);
    };

    return (
      <div className="action-button-container" style={{position: "relative"}}>
        <Button
          ref={buttonRef}
          variant={
            needsConfirmation && !isConfirmed
              ? "warning"
              : isConfirmed && wasAutoGenerated
              ? "success"
              : "outline-primary"
          }
          size="sm"
          className={`action-trigger-btn ${
            needsConfirmation && !isConfirmed ? "needs-confirmation" : ""
          } ${isConfirmed && wasAutoGenerated ? "confirmed-order" : ""}`}
          onClick={handleToggle}
          disabled={isDeleting || isConfirming || modalLoading}
          title={
            needsConfirmation && !isConfirmed
              ? "Order needs confirmation - Click for actions"
              : isConfirmed && wasAutoGenerated
              ? "Order confirmed - Click for actions"
              : "Click for actions"
          }
        >
          <FontAwesomeIcon
            icon={
              needsConfirmation && !isConfirmed
                ? faExclamationTriangle
                : isConfirmed && wasAutoGenerated
                ? faCheckCircle
                : faEllipsisV
            }
          />
        </Button>

        {/* ✅ FIXED: Portal with fixed positioning */}
        {isOpen &&
          createPortal(
            <div
              ref={dropdownRef}
              className="action-dropdown-menu-fixed"
              style={{
                position: "fixed",
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
                zIndex: 99999,
                minWidth: "220px",
                maxWidth: "250px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="action-dropdown-content">
                {/* ✅ Confirmation section at the top */}
                {needsConfirmation && !isConfirmed && (
                  <>
                    <button
                      className="action-dropdown-item action-confirm-btn"
                      onClick={() =>
                        handleActionClick(handleAction, "confirm", order)
                      }
                      disabled={isConfirming || modalLoading}
                    >
                      <FontAwesomeIcon
                        icon={isConfirming ? faSpinner : faCheckCircle}
                        className={`me-2 ${isConfirming ? "fa-spin" : ""}`}
                      />
                      {isConfirming ? "Confirming..." : "✅ Confirm Order"}
                    </button>
                    <div className="action-dropdown-info">
                      <small>
                        <FontAwesomeIcon
                          icon={faExclamationTriangle}
                          className="me-1"
                        />
                        This order needs confirmation
                      </small>
                    </div>
                    <div className="action-dropdown-divider"></div>
                  </>
                )}

                {/* ✅ Confirmed status display */}
                {isConfirmed && wasAutoGenerated && (
                  <>
                    <div className="action-dropdown-info confirmed">
                      <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                      Order Confirmed
                      {order.confirmedAt && (
                        <small className="ms-2">
                          {new Date(order.confirmedAt).toLocaleDateString(
                            "en-GB"
                          )}
                        </small>
                      )}
                      {order.confirmedBy && (
                        <div className="mt-1">
                          <small>By: {order.confirmedBy}</small>
                        </div>
                      )}
                    </div>
                    <div className="action-dropdown-divider"></div>
                  </>
                )}

                {/* View Details */}
                <button
                  className="action-dropdown-item"
                  onClick={() => handleActionClick(handleAction, "view", order)}
                >
                  <FontAwesomeIcon icon={faEye} className="me-2" />
                  View Details
                </button>

                {enableActions && !isCancelled && (
                  <>
                    {/* Edit Order */}
                    <button
                      className="action-dropdown-item"
                      onClick={() =>
                        handleActionClick(handleAction, "edit", order)
                      }
                    >
                      <FontAwesomeIcon icon={faEdit} className="me-2" />
                      Edit Order
                    </button>

                    {/* ✅ Generate Sales Order - Prominent */}
                    {genInfo.canGenerateSO ? (
                      <button
                        className="action-dropdown-item action-generate-so"
                        onClick={() =>
                          handleActionClick(
                            handleAction,
                            "generateSalesOrder",
                            order
                          )
                        }
                      >
                        <FontAwesomeIcon
                          icon={faExchangeAlt}
                          className="me-2"
                        />
                        Generate Sales Order
                      </button>
                    ) : genInfo.hasGeneratedSO ? (
                      <div className="action-dropdown-info success">
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="me-2"
                        />
                        Sales Order Generated
                        {genInfo.salesOrderNumber && (
                          <div className="mt-1">
                            <small>SO: {genInfo.salesOrderNumber}</small>
                          </div>
                        )}
                      </div>
                    ) : genInfo.isFromSalesOrder ? (
                      <div className="action-dropdown-info">
                        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                        From Sales Order
                        <div className="mt-1">
                          <small>Cannot generate circular reference</small>
                        </div>
                      </div>
                    ) : (
                      <div className="action-dropdown-info disabled">
                        <FontAwesomeIcon icon={faBan} className="me-2" />
                        SO Generation Disabled
                        <div className="mt-1">
                          <small>
                            {genInfo.reasonIfDisabled || "Not available"}
                          </small>
                        </div>
                      </div>
                    )}

                    {/* Convert to Invoice */}
                    <button
                      className="action-dropdown-item"
                      onClick={() =>
                        handleActionClick(handleAction, "convert", order)
                      }
                    >
                      <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                      Convert to Invoice
                    </button>

                    {/* ✅ Source/Generated Orders Section */}
                    {(order.isAutoGenerated ||
                      genInfo.hasGeneratedSO ||
                      genInfo.hasCorrespondingSO) && (
                      <>
                        <div className="action-dropdown-divider"></div>
                        <div className="action-dropdown-section-title">
                          Order Tracking:
                        </div>

                        {order.isAutoGenerated && order.sourceOrderNumber && (
                          <button
                            className="action-dropdown-item"
                            onClick={() =>
                              handleActionClick(
                                handleAction,
                                "viewSourceOrder",
                                order
                              )
                            }
                          >
                            <FontAwesomeIcon icon={faEye} className="me-2" />
                            View Source: {order.sourceOrderNumber}
                          </button>
                        )}

                        {(genInfo.hasGeneratedSO ||
                          genInfo.hasCorrespondingSO) && (
                          <button
                            className="action-dropdown-item"
                            onClick={() =>
                              handleActionClick(
                                handleAction,
                                "viewGeneratedOrders",
                                order
                              )
                            }
                          >
                            <FontAwesomeIcon
                              icon={faProjectDiagram}
                              className="me-2"
                            />
                            View Generated Orders
                          </button>
                        )}

                        <button
                          className="action-dropdown-item"
                          onClick={() =>
                            handleActionClick(
                              handleAction,
                              "viewTrackingChain",
                              order
                            )
                          }
                        >
                          <FontAwesomeIcon
                            icon={faProjectDiagram}
                            className="me-2"
                          />
                          View Order Chain
                        </button>
                      </>
                    )}

                    {/* Duplicate Order */}
                    <button
                      className="action-dropdown-item"
                      onClick={() =>
                        handleActionClick(handleAction, "duplicate", order)
                      }
                    >
                      <FontAwesomeIcon icon={faCopy} className="me-2" />
                      Duplicate Order
                    </button>

                    <div className="action-dropdown-divider"></div>

                    {/* ✅ Print & Share Section */}
                    <div className="action-dropdown-section-title">
                      Print & Share:
                    </div>

                    {/* Print Options */}
                    <div className="action-dropdown-button-group">
                      <button
                        className="action-dropdown-item-half"
                        onClick={() =>
                          handleActionClick(handleAction, "print", order)
                        }
                        disabled={printLoading}
                        title="Print purchase order"
                      >
                        <FontAwesomeIcon
                          icon={printLoading ? faSpinner : faPrint}
                          className={`me-1 ${printLoading ? "fa-spin" : ""}`}
                        />
                        Print
                      </button>
                      <button
                        className="action-dropdown-item-half"
                        onClick={() =>
                          handleActionClick(handleAction, "share", order)
                        }
                        title="Share purchase order"
                      >
                        <FontAwesomeIcon icon={faShare} className="me-1" />
                        Share
                      </button>
                    </div>

                    {/* Download Options */}
                    <div className="action-dropdown-button-group">
                      <button
                        className="action-dropdown-item-half"
                        onClick={() =>
                          handleActionClick(handleAction, "downloadPDF", order)
                        }
                        disabled={printLoading}
                        title="Download as PDF"
                      >
                        <FontAwesomeIcon
                          icon={printLoading ? faSpinner : faDownload}
                          className={`me-1 ${printLoading ? "fa-spin" : ""}`}
                        />
                        PDF
                      </button>
                      <button
                        className="action-dropdown-item-half"
                        onClick={() =>
                          handleActionClick(handleAction, "download", order)
                        }
                        title="Download Excel"
                      >
                        <FontAwesomeIcon icon={faFileExcel} className="me-1" />
                        Excel
                      </button>
                    </div>

                    {/* Print Preview */}
                    <button
                      className="action-dropdown-item"
                      onClick={() =>
                        handleActionClick(handleAction, "printPreview", order)
                      }
                      disabled={printLoading}
                    >
                      <FontAwesomeIcon icon={faEye} className="me-2" />
                      Print Preview
                    </button>

                    <div className="action-dropdown-divider"></div>

                    {/* ✅ Status Actions */}
                    <div className="action-dropdown-section-title">
                      Status Actions:
                    </div>

                    {order.status === "draft" && (
                      <button
                        className="action-dropdown-item action-status"
                        onClick={() =>
                          handleActionClick(handleAction, "confirm", order)
                        }
                      >
                        <FontAwesomeIcon icon={faCheck} className="me-2" />
                        Confirm Order
                      </button>
                    )}

                    {order.status === "confirmed" && (
                      <button
                        className="action-dropdown-item action-status"
                        onClick={() =>
                          handleActionClick(handleAction, "ship", order)
                        }
                      >
                        <FontAwesomeIcon icon={faTruck} className="me-2" />
                        Ship Order
                      </button>
                    )}

                    {(order.status === "shipped" ||
                      order.status === "confirmed") && (
                      <button
                        className="action-dropdown-item action-status"
                        onClick={() =>
                          handleActionClick(handleAction, "receive", order)
                        }
                      >
                        <FontAwesomeIcon icon={faBoxes} className="me-2" />
                        Mark as Received
                      </button>
                    )}

                    {order.status === "received" && (
                      <button
                        className="action-dropdown-item action-status"
                        onClick={() =>
                          handleActionClick(handleAction, "complete", order)
                        }
                      >
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="me-2"
                        />
                        Complete Order
                      </button>
                    )}

                    <div className="action-dropdown-divider"></div>

                    {/* Delete/Cancel Order */}
                    <button
                      className="action-dropdown-item action-delete"
                      onClick={() =>
                        handleActionClick(handleAction, "delete", order)
                      }
                      disabled={isDeleting}
                    >
                      <FontAwesomeIcon
                        icon={isDeleting ? faSpinner : faTrash}
                        className={`me-2 ${isDeleting ? "fa-spin" : ""}`}
                      />
                      {isDeleting
                        ? "Deleting..."
                        : order.status === "draft"
                        ? "Delete Order"
                        : "Cancel & Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  };

  const LoadingComponent = () => (
    <div className="text-center py-5">
      <Spinner
        animation="border"
        variant="primary"
        size="lg"
        className="mb-3"
      />
      <h5 className="text-muted">Loading purchase orders...</h5>
      <p className="text-muted small">Please wait while we fetch your data</p>
    </div>
  );

  const EmptyStateComponent = () => (
    <div className="text-center py-5">
      <FontAwesomeIcon
        icon={faClipboardList}
        size="4x"
        className="text-muted mb-4"
      />
      <h4 className="text-muted mb-3">No Purchase Orders Found</h4>
      <p className="text-muted mb-4">
        Start by creating your first purchase order to track your suppliers and
        orders.
      </p>
      <Button
        variant="primary"
        onClick={() =>
          navigate(`/companies/${companyId}/${DOCUMENT_LABELS.createPath}`)
        }
      >
        <FontAwesomeIcon icon={faPlus} className="me-2" />
        Create Purchase Order
      </Button>
    </div>
  );

  // ✅ MAIN RENDER LOGIC
  if (isLoading) {
    return <LoadingComponent />;
  }

  const safeFilteredOrders = Array.isArray(filteredOrders)
    ? filteredOrders
    : [];
  const safePurchaseOrders = Array.isArray(purchaseOrders)
    ? purchaseOrders
    : [];
  const safeSeparatedOrders = separatedOrders || {active: [], cancelled: []};
  const safeCategorizeOrders = categorizeOrders || {
    all: [],
    selfCreated: [],
    fromSuppliers: [],
  };

  // ✅ MAIN RENDER LOGIC
  if (finalIsLoading) {
    return <LoadingComponent />;
  }

  if (!Array.isArray(finalPurchaseOrders) || finalPurchaseOrders.length === 0) {
    return <EmptyStateComponent />;
  }

  return (
    <>
      {showHeader && (
        <div className="purchase-orders-filter-section mb-4">
          <Container fluid className="px-0">
            <Row className="align-items-center">
              <Col>
                <h5 className="mb-3 text-purple">
                  <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                  {title || "Purchase Orders"}
                  <Badge bg="light" text="dark" className="ms-2">
                    {safeFilteredOrders.length}
                  </Badge>
                </h5>
                <OrderTypeFilter />
              </Col>
              <Col xs="auto">
                <div className="d-flex gap-2 align-items-center">
                  {/* ✅ Enhanced Print Controls */}
                  <PrintControls />

                  {/* Search Input */}
                  <InputGroup size="sm" style={{width: "250px"}}>
                    <InputGroup.Text>
                      <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder={searchPlaceholder || "Search orders..."}
                      value={localSearchTerm}
                      onChange={(e) => {
                        setLocalSearchTerm(e.target.value);
                        if (onSearchChange) {
                          onSearchChange(e.target.value);
                        }
                      }}
                    />
                  </InputGroup>

                  {/* Status Filter */}
                  <Form.Select
                    size="sm"
                    value={localFilterStatus}
                    onChange={(e) => {
                      setLocalFilterStatus(e.target.value);
                      if (onFilterChange) {
                        onFilterChange(e.target.value);
                      }
                    }}
                    style={{width: "150px"}}
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="received">Received</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>

                  {/* Export button */}
                  <Button variant="outline-primary" size="sm">
                    <FontAwesomeIcon icon={faFileExcel} className="me-1" />
                    Export
                  </Button>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      )}

      <div className="purchase-orders-container-redesigned">
        <div className="table-container-modern">
          <Table responsive hover className="modern-purchase-table">
            <thead className="table-header-purple">
              <tr>
                <th className="date-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faClock} className="me-2" />
                    Date
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 text-white-50 sort-icon"
                      onClick={() => onSort?.("date")}
                      style={{cursor: "pointer"}}
                    />
                  </div>
                </th>

                <th className="order-number-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faList} className="me-2" />
                    Order No.
                  </div>
                </th>

                <th className="supplier-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faBuilding} className="me-2" />
                    Supplier
                  </div>
                </th>

                <th className="type-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faRobot} className="me-2" />
                    Type
                  </div>
                </th>

                <th className="amount-column text-end">
                  <div className="d-flex align-items-center justify-content-end">
                    <FontAwesomeIcon icon={faTags} className="me-2" />
                    Amount
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 text-white-50 sort-icon"
                      onClick={() => onSort?.("amount")}
                      style={{cursor: "pointer"}}
                    />
                  </div>
                </th>

                <th className="status-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Status
                  </div>
                </th>

                {enableActions && (
                  <th className="actions-column text-center">
                    <FontAwesomeIcon icon={faEllipsisV} />
                  </th>
                )}
              </tr>
            </thead>

            {Array.isArray(safeFilteredOrders) &&
            safeFilteredOrders.length > 0 ? (
              <tbody>
                {safeFilteredOrders.map((order, index) => {
                  if (!order) return null;

                  const amount = parseFloat(
                    order.amount ||
                      order.total ||
                      order.totals?.finalTotal ||
                      order.orderValue ||
                      0
                  );
                  const orderId = order._id || order.id;
                  const isCancelled =
                    order.status === "cancelled" || order.status === "deleted";
                  const source = getOrderSource(order);

                  return (
                    <tr
                      key={orderId || `order-${index}`}
                      className={`modern-table-row ${
                        isCancelled ? "cancelled" : ""
                      }`}
                      onClick={() => {
                        if (!modalLoading && !deletingOrders.has(orderId)) {
                          handleViewOrder(order);
                        }
                      }}
                      style={{
                        cursor:
                          modalLoading || deletingOrders.has(orderId)
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          modalLoading || deletingOrders.has(orderId) ? 0.7 : 1,
                      }}
                    >
                      {/* Date Column */}
                      <td
                        className={`date-cell ${
                          isCancelled ? "text-muted" : ""
                        }`}
                      >
                        <div className="date-wrapper">
                          <div className="order-date fw-semibold">
                            {new Date(
                              order.orderDate ||
                                order.purchaseDate ||
                                order.date
                            ).toLocaleDateString("en-GB")}
                          </div>
                          <small className="order-time text-muted">
                            {new Date(
                              order.orderDate ||
                                order.purchaseDate ||
                                order.date
                            ).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </small>
                        </div>
                      </td>

                      {/* Order Number Column */}
                      <td className="order-number-cell">
                        <div className="order-number-wrapper">
                          <strong
                            className={
                              isCancelled
                                ? "text-muted text-decoration-line-through"
                                : "text-primary order-number-link"
                            }
                          >
                            {order.orderNumber ||
                              order.purchaseOrderNumber ||
                              order.purchaseNumber ||
                              "N/A"}
                          </strong>
                          {order.isAutoGenerated && (
                            <div className="auto-generated-indicator mt-1">
                              <Badge bg="info" size="sm">
                                <FontAwesomeIcon
                                  icon={faRobot}
                                  className="me-1"
                                />
                                Auto
                              </Badge>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Supplier Column */}
                      <td className="supplier-cell">
                        <div className="supplier-info">
                          <div
                            className={`supplier-name fw-medium ${
                              isCancelled ? "text-muted" : ""
                            }`}
                          >
                            {order.supplierName ||
                              order.supplier?.name ||
                              order.partyName ||
                              "Unknown Supplier"}
                          </div>
                          {(order.supplierMobile ||
                            order.supplier?.mobile ||
                            order.partyPhone ||
                            order.mobileNumber) && (
                            <small className="supplier-contact text-muted">
                              <FontAwesomeIcon
                                icon={faUserTie}
                                className="me-1"
                              />
                              {order.supplierMobile ||
                                order.supplier?.mobile ||
                                order.partyPhone ||
                                order.mobileNumber}
                            </small>
                          )}
                          <div className="mt-1">
                            <Badge
                              bg="outline-secondary"
                              className="supplier-role-badge"
                            >
                              <FontAwesomeIcon
                                icon={faBuilding}
                                className="me-1"
                              />
                              Supplier
                            </Badge>
                          </div>
                        </div>
                      </td>

                      {/* Type Column */}
                      <td className="type-cell">
                        <div className="type-info">
                          <Badge
                            bg={source.color}
                            className="d-flex align-items-center"
                          >
                            <FontAwesomeIcon
                              icon={source.icon}
                              className="me-1"
                            />
                            {source.label}
                          </Badge>
                          {source.description && (
                            <small
                              className="text-muted mt-1 d-block"
                              style={{fontSize: "0.7rem"}}
                            >
                              {source.description.length > 20
                                ? `${source.description.substring(0, 20)}...`
                                : source.description}
                            </small>
                          )}
                        </div>
                      </td>

                      {/* Amount Column */}
                      <td className="amount-cell text-end">
                        <div className="amount-info">
                          <strong
                            className={`order-amount fs-6 ${
                              isCancelled
                                ? "text-muted text-decoration-line-through"
                                : "text-success"
                            }`}
                          >
                            ₹{amount.toLocaleString("en-IN")}
                          </strong>
                          {amount > 100000 && (
                            <small className="text-muted d-block">
                              ₹{(amount / 100000).toFixed(1)}L
                            </small>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="status-cell">
                        <StatusBadge
                          status={order.status}
                          priority={order.priority}
                        />
                      </td>

                      {/* Actions Column */}
                      {enableActions && (
                        <td
                          className="actions-cell-modern"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ActionButton order={order} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            ) : (
              <tbody>
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <FontAwesomeIcon
                      icon={faSearch}
                      size="3x"
                      className="text-muted mb-3"
                    />
                    <h5 className="text-muted">No Orders Found</h5>
                    <p className="text-muted">
                      No purchase orders match your current filters.
                    </p>
                  </td>
                </tr>
              </tbody>
            )}
          </Table>

          {/* Table footer summary */}
          {safeFilteredOrders.length > 0 && (
            <div className="table-footer-summary">
              <Container fluid className="px-3 py-2">
                <Row className="align-items-center">
                  <Col>
                    <small className="text-muted">
                      Showing {safeFilteredOrders.length} of{" "}
                      {safePurchaseOrders.length} orders
                      {activeOrderType !== "all" && (
                        <span className="ms-2">
                          (
                          {activeOrderType === "self"
                            ? "Self Created"
                            : activeOrderType === "fromSO"
                            ? "From Sales Orders"
                            : "Auto-Generated"}
                          )
                        </span>
                      )}
                      {printLoading && (
                        <span className="ms-2 text-info">
                          <FontAwesomeIcon
                            icon={faSpinner}
                            className="fa-spin me-1"
                          />
                          Preparing print...
                        </span>
                      )}
                    </small>
                  </Col>
                  <Col xs="auto">
                    <div className="summary-stats d-flex gap-3">
                      <small className="text-muted">
                        <strong>Total Value:</strong> ₹
                        {safeFilteredOrders
                          .reduce((sum, order) => {
                            if (!order) return sum;
                            const amount = parseFloat(
                              order.amount ||
                                order.total ||
                                order.totals?.finalTotal ||
                                0
                            );
                            return sum + (isNaN(amount) ? 0 : amount);
                          }, 0)
                          .toLocaleString("en-IN")}
                      </small>
                      <small className="text-muted">
                        <strong>Active:</strong>{" "}
                        {safeSeparatedOrders.active?.length || 0}
                      </small>
                      {(safeSeparatedOrders.cancelled?.length || 0) > 0 && (
                        <small className="text-muted">
                          <strong>Cancelled:</strong>{" "}
                          {safeSeparatedOrders.cancelled?.length || 0}
                        </small>
                      )}
                      <small className="text-muted">
                        <strong>Template:</strong> {printTemplate}
                      </small>
                    </div>
                  </Col>
                </Row>
              </Container>
            </div>
          )}
        </div>
      </div>

      {/* ✅ View Modal */}
      {selectedOrder && (
        <UniversalViewModal
          show={viewModalShow}
          onHide={() => {
            setViewModalShow(false);
            setSelectedOrder(null);
            setModalError(null);
          }}
          transaction={selectedOrder}
          documentType="purchase-order"
          onEdit={handleModalEdit}
          onPrint={handleModalPrint}
          onDownload={handleModalDownload}
          onShare={handleModalShare}
          onConvert={handleModalConvert}
          onGenerateSalesOrder={handleModalGenerateSalesOrder}
          onDuplicate={handleModalDuplicate}
          onDelete={handleModalDelete}
          onConfirm={handleModalConfirm}
          onShip={handleModalShip}
          onReceive={handleModalReceive}
          onComplete={handleModalComplete}
          onCancel={handleModalCancel}
          onViewSource={handleModalViewSource}
          onViewGenerated={handleModalViewGenerated}
          onViewTracking={handleModalViewTracking}
          loading={modalLoading}
          error={modalError}
          currentUser={currentUser}
          currentCompany={currentCompany}
          companyId={companyId}
          addToast={addToast}
          enableActions={enableActions}
          enableBidirectionalActions={showBidirectionalColumns}
          showSourceOrderActions={Boolean(selectedOrder?.isAutoGenerated)}
          showGeneratedOrderActions={Boolean(
            selectedOrder?.hasGeneratedSalesOrder ||
              selectedOrder?.hasCorrespondingSalesOrder
          )}
          // ✅ NEW: Enhanced sales order generation props
          enableSalesOrderGeneration={true}
          showGenerateSalesOrder={
            !selectedOrder?.hasGeneratedSalesOrder &&
            !selectedOrder?.salesOrderRef
          }
          salesOrderGenerationConfig={{
            enabled: true,
            allowFromDraft: true,
            allowFromConfirmed: true,
            allowFromReceived: true,
            preventCircular: true,
            showStatus: true,
          }}
        />
      )}

      {/* ✅ Generate Sales Order Modal */}
      <GenerateSalesOrderModal
        show={showGenerateSOModal}
        onHide={() => {
          setShowGenerateSOModal(false);
          setSelectedOrderForSOGeneration(null);
          setSOGenerationError(null);
        }}
        order={selectedOrderForSOGeneration}
      />

      {/* ✅ Print Modal */}
      <PrintModal />

      <style>
        {`
/* ✅ CRITICAL FIX: Ensure dropdown appears on top */
.action-button-container {
  position: relative !important;
  display: inline-block !important;
  z-index: 10 !important;
}

/* ✅ FIXED: Higher z-index for trigger button when active */
.action-trigger-btn {
  border-radius: 0 !important;
  padding: 6px 8px !important;
  border: 1px solid #e9ecef !important;
  background: transparent !important;
  box-shadow: none !important;
  transition: all 0.2s ease !important;
  position: relative !important;
  z-index: 10 !important;
  min-width: 32px !important;
  height: 32px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.action-trigger-btn:hover,
.action-trigger-btn:focus,
.action-trigger-btn:active {
  background: #f8f9ff !important;
  color: #667eea !important;
  transform: scale(1.05) !important;
  border-radius: 0 !important;
  z-index: 10005 !important;
  outline: none !important;
}

.action-trigger-btn:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  border-radius: 0 !important;
}

.action-trigger-btn.needs-confirmation {
  background: #fff3cd !important;
  border-color: #ffc107 !important;
  color: #856404 !important;
  animation: pulse-warning 2s infinite;
  z-index: 10005 !important;
}

.action-trigger-btn.confirmed-order {
  background: #d1e7dd !important;
  border-color: #28a745 !important;
  color: #155724 !important;
  z-index: 10005 !important;
}

@keyframes pulse-warning {
  0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
}

/* ✅ FIXED: Portal-based dropdown with fixed positioning */
.action-dropdown-menu-fixed {
  position: fixed !important;
  z-index: 99999 !important;
  min-width: 220px !important;
  max-width: 250px !important;
  border-radius: 8px !important;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 2px solid rgba(255, 255, 255, 0.2) !important;
  background: rgba(255, 255, 255, 0.95) !important;
}

.action-dropdown-content {
  background: white !important;
  border: 1px solid #e9ecef !important;
  border-radius: 8px !important;
  padding: 8px 0 !important;
  max-height: 400px !important;
  overflow-y: auto !important;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25) !important;
  z-index: 99999 !important;
  position: relative !important;
}

/* ✅ FIXED: Table row z-index management */
.modern-table-row {
  position: relative !important;
  z-index: 1 !important;
}

.modern-table-row:hover {
  position: relative !important;
  z-index: 5 !important;
}

.modern-table-row:hover .action-button-container {
  z-index: 10 !important;
}

/* ✅ FIXED: Actions cell specific styling */
.actions-cell-modern {
  position: relative !important;
  z-index: 5 !important;
  overflow: visible !important;
}

/* ✅ FIXED: Table container overflow management */
.table-container-modern {
  position: relative !important;
  overflow-x: auto !important;
  overflow-y: visible !important;
  z-index: 1 !important;
}

.modern-purchase-table {
  position: relative !important;
  z-index: 1 !important;
}

.modern-purchase-table tbody {
  position: relative !important;
  z-index: 1 !important;
}

.modern-purchase-table tbody tr {
  position: relative !important;
  z-index: 1 !important;
}

/* ✅ FIXED: Remove Bootstrap table-responsive overflow issues */
.table-responsive {
  overflow: visible !important;
}

/* ✅ FIXED: Dropdown Items */
.action-dropdown-item {
  width: 100% !important;
  padding: 8px 12px !important;
  border: none !important;
  background: transparent !important;
  text-align: left !important;
  font-size: 14px !important;
  color: #333 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  border-radius: 0 !important;
  display: flex !important;
  align-items: center !important;
  position: relative !important;
  z-index: 1 !important;
}

.action-dropdown-item:hover {
  background: #f8f9ff !important;
  color: #667eea !important;
  transform: translateX(2px) !important;
  border-radius: 0 !important;
  z-index: 2 !important;
}

.action-dropdown-item:disabled {
  background: #f8f9fa !important;
  color: #6c757d !important;
  cursor: not-allowed !important;
  opacity: 0.6 !important;
  border-radius: 0 !important;
}

.action-dropdown-item:active,
.action-dropdown-item:focus {
  background: #e9ecef !important;
  outline: none !important;
  border-radius: 0 !important;
  z-index: 2 !important;
}

/* ✅ Special Item Types */
.action-dropdown-item.action-confirm-btn {
  background: #d1e7dd !important;
  color: #155724 !important;
  font-weight: 600 !important;
  border-radius: 4px !important;
  margin: 2px 4px !important;
}

.action-dropdown-item.action-confirm-btn:hover {
  background: #c3e6cb !important;
  color: #155724 !important;
  border-radius: 4px !important;
  transform: translateX(0) !important;
}

.action-dropdown-item.action-generate-so {
  background: #f0f9ff !important;
  color: #059669 !important;
  font-weight: 600 !important;
  border-left: 3px solid #059669 !important;
  border-radius: 0 !important;
}

.action-dropdown-item.action-generate-so:hover {
  background: #e0f2fe !important;
  color: #047857 !important;
  border-radius: 0 !important;
}

.action-dropdown-item.action-status {
  color: #0d6efd !important;
}

.action-dropdown-item.action-status:hover {
  background: #e7f3ff !important;
  color: #0a58ca !important;
  border-radius: 0 !important;
}

.action-dropdown-item.action-delete {
  color: #dc3545 !important;
}

.action-dropdown-item.action-delete:hover {
  background: #f8d7da !important;
  color: #721c24 !important;
  border-radius: 0 !important;
}

/* ✅ Button Groups */
.action-dropdown-button-group {
  display: flex !important;
  gap: 0 !important;
  margin: 4px 0 !important;
}

.action-dropdown-item-half {
  flex: 1 !important;
  padding: 6px 8px !important;
  border: none !important;
  background: transparent !important;
  text-align: center !important;
  font-size: 12px !important;
  color: #333 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  border-radius: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-direction: column !important;
  gap: 2px !important;
  border-right: 1px solid #e9ecef !important;
  position: relative !important;
  z-index: 1 !important;
}

.action-dropdown-item-half:last-child {
  border-right: none !important;
}

.action-dropdown-item-half:hover {
  background: #f8f9ff !important;
  color: #667eea !important;
  border-radius: 0 !important;
  z-index: 2 !important;
}

.action-dropdown-item-half:disabled {
  background: #f8f9fa !important;
  color: #6c757d !important;
  cursor: not-allowed !important;
  opacity: 0.6 !important;
  border-radius: 0 !important;
}

/* ✅ Info and Status Items */
.action-dropdown-info {
  padding: 6px 12px !important;
  font-size: 12px !important;
  color: #856404 !important;
  background: #fff3cd !important;
  border-radius: 4px !important;
  margin: 2px 4px !important;
}

.action-dropdown-info.success {
  color: #155724 !important;
  background: #d1e7dd !important;
  border-radius: 4px !important;
}

.action-dropdown-info.confirmed {
  color: #155724 !important;
  background: #d1e7dd !important;
  border-radius: 4px !important;
  font-weight: 500 !important;
}

.action-dropdown-info.disabled {
  color: #6c757d !important;
  background: #f8f9fa !important;
  border-radius: 4px !important;
}

/* ✅ Section Titles and Dividers */
.action-dropdown-section-title {
  padding: 6px 12px 4px 12px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #667eea !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  background: #f8f9ff !important;
  border-radius: 0 !important;
  margin: 4px 0 2px 0 !important;
}

.action-dropdown-divider {
  height: 1px !important;
  background: #e9ecef !important;
  margin: 4px 8px !important;
  border-radius: 0 !important;
}

/* ✅ GLOBAL Z-INDEX OVERRIDE */
.purchase-orders-container-redesigned {
  position: relative !important;
  z-index: 1 !important;
}

/* ✅ BOOTSTRAP MODAL OVERRIDE */
.modal {
  z-index: 1050 !important;
}

.modal-backdrop {
  z-index: 1040 !important;
}

/* ✅ ENSURE DROPDOWNS ARE ABOVE MODALS */
.action-dropdown-menu-fixed {
  z-index: 99999 !important;
}

/* ✅ RESPONSIVE: Mobile adjustments */
@media (max-width: 768px) {
  .action-dropdown-menu-fixed {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    right: auto !important;
    min-width: 280px !important;
    max-width: 90vw !important;
    margin-top: 0 !important;
    z-index: 99999 !important;
    border-radius: 12px !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
  }

  .action-dropdown-content {
    max-height: 70vh !important;
    border-radius: 12px !important;
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
  }

  .action-dropdown-item {
    padding: 12px 16px !important;
    font-size: 15px !important;
  }

  .action-trigger-btn {
    min-width: 40px !important;
    height: 40px !important;
    padding: 10px !important;
  }

  .action-dropdown-button-group {
    flex-direction: column !important;
  }

  .action-dropdown-item-half {
    border-right: none !important;
    border-bottom: 1px solid #e9ecef !important;
    flex-direction: row !important;
    justify-content: flex-start !important;
    padding: 10px 16px !important;
  }

  .action-dropdown-item-half:last-child {
    border-bottom: none !important;
  }
}

/* ✅ ADDITIONAL CRITICAL FIXES */
.table-responsive,
.table-responsive-sm,
.table-responsive-md,
.table-responsive-lg,
.table-responsive-xl,
.table-responsive-xxl {
  overflow: visible !important;
}

/* ✅ WEBKIT SPECIFIC FIXES */
@supports (-webkit-backdrop-filter: blur(10px)) {
  .action-dropdown-menu-fixed {
    -webkit-backdrop-filter: blur(12px) !important;
    background: rgba(255, 255, 255, 0.95) !important;
  }
}

/* ✅ FALLBACK FOR OLDER BROWSERS */
@supports not (backdrop-filter: blur(10px)) {
  .action-dropdown-menu-fixed {
    background: white !important;
    border: 2px solid #e9ecef !important;
  }
}
`}
      </style>
    </>
  );
}

export default PurchaseOrderTable;
