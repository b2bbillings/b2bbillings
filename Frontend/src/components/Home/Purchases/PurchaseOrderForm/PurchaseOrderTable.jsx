import React, {useState, useCallback, useMemo, useEffect, useRef} from "react";
import {createPortal} from "react-dom";
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
        console.warn("⚠️ No companyId provided, cannot fetch purchase orders");
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
            console.warn("⚠️ No orders found in response");
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
          console.warn("Sorting error:", error);
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

        // ✅ Enhanced debug logging
        console.log("🔄 Starting SO generation with debug info:", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          sourceCompany: order.companyId,
          targetCompany: order.targetCompanyId,
          supplier: {
            id: order.supplier?._id || order.supplierId,
            name: order.supplierName || order.supplier?.name,
            linkedCompanyId: order.supplier?.linkedCompanyId,
          },
        });

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

  // ✅ ACTION HANDLERS
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

              // Items with enhanced mapping
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
            onPrintOrder?.(targetOrder);
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

          case "confirm":
            onConfirmOrder?.(targetOrder);
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
    ]
  );
  // ✅ ADD THESE MISSING HANDLER FUNCTIONS - Put these AFTER the handleAction function (around line 1568)

  // ✅ BASIC ACTION HANDLERS (these should go after handleAction and before separatedOrders)
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
    (order) => handleAction("print", order),
    [handleAction]
  );

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

  const handleModalPrint = useCallback(
    (order) => {
      handlePrintOrder(order);
    },
    [handlePrintOrder]
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
    const [position, setPosition] = useState({top: 0, left: 0});
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    const orderId = order._id || order.id;
    const isDeleting = deletingOrders.has(orderId);
    const isCancelled =
      order.status === "cancelled" || order.status === "deleted";
    const status = order.status || "draft";

    // ✅ UPDATED: More flexible conditions for Generate Sales Order
    const isFromSalesOrder = Boolean(
      order.isAutoGenerated === true &&
        order.sourceOrderId &&
        order.sourceOrderType === "sales_order"
    );

    // ✅ IMPROVED: Allow generation for most statuses except cancelled
    const canGenerateSO = Boolean(
      !isCancelled && // Not cancelled
        !order.hasGeneratedSalesOrder && // Hasn't already generated
        !order.autoGeneratedSalesOrder && // Alternative check
        !order.salesOrderRef && // Alternative check
        !isFromSalesOrder // Don't allow circular generation
    );

    // ✅ ENHANCED: Better generation info with all required properties
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
      statusAllowed: !isCancelled, // More permissive
      reasonIfDisabled: isCancelled
        ? "Cannot generate from cancelled orders"
        : order.hasGeneratedSalesOrder ||
          order.autoGeneratedSalesOrder ||
          order.salesOrderRef
        ? "Sales order already generated"
        : isFromSalesOrder
        ? "Cannot create circular reference"
        : status === "draft"
        ? "Available after confirming order"
        : null,
    };

    const calculatePosition = useCallback(() => {
      if (!buttonRef.current) return {top: 0, left: 0};

      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 220;
      const dropdownHeight = 400;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      // ✅ Position dropdown BELOW the button with some gap
      let top = rect.bottom + scrollY + 8; // 8px gap below button

      // ✅ Position so menu's right edge aligns with button's right edge
      let left = rect.right + scrollX - dropdownWidth;

      // ✅ Fallback if goes outside left viewport
      if (left < 10) {
        left = rect.left + scrollX; // Align with button's left edge
      }

      // ✅ Fallback if goes outside right viewport
      if (left + dropdownWidth > viewportWidth - 10) {
        left = viewportWidth - dropdownWidth - 10;
      }

      // ✅ If dropdown would go below viewport, show it ABOVE the button
      if (top + dropdownHeight > viewportHeight + scrollY - 20) {
        top = rect.top + scrollY - dropdownHeight - 8; // 8px gap above button
      }

      // ✅ Ensure minimum top margin
      if (top < scrollY + 10) {
        top = scrollY + 10;
      }

      return {top, left};
    }, []);

    // Calculate position when opening
    const handleToggle = (e) => {
      e.stopPropagation();

      if (!isOpen) {
        const newPosition = calculatePosition();
        setPosition(newPosition);
      }
      setIsOpen(!isOpen);
    };

    useEffect(() => {
      if (isOpen) {
        const handleScroll = () => {
          const newPosition = calculatePosition();
          setPosition(newPosition);
        };

        // ✅ Listen to ALL scroll events (including parent containers)
        window.addEventListener("scroll", handleScroll, true);
        document.addEventListener("scroll", handleScroll, true);

        return () => {
          window.removeEventListener("scroll", handleScroll, true);
          document.removeEventListener("scroll", handleScroll, true);
        };
      }
    }, [isOpen, calculatePosition]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          !buttonRef.current?.contains(event.target)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
          document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [isOpen]);

    const handleAction = (actionFn, ...args) => {
      actionFn(...args);
      setIsOpen(false);
    };

    const dropdownMenu =
      isOpen &&
      createPortal(
        <div
          ref={dropdownRef}
          className="custom-action-dropdown"
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            zIndex: 9999,
            maxWidth: "220px",
          }}
        >
          <div
            className="bg-white border shadow-lg p-2"
            style={{
              minWidth: "200px",
              maxWidth: "220px",
              maxHeight: "400px",
              overflowY: "auto",
              borderRadius: "0 !important",
            }}
          >
            {/* View Details */}
            <button
              className="btn btn-light btn-sm w-100 text-start mb-1 d-flex align-items-center"
              onClick={() => handleAction(handleViewOrder, order)}
            >
              <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
              View Details
            </button>

            {enableActions && !isCancelled && (
              <>
                {/* Edit Order */}
                <button
                  className="btn btn-light btn-sm w-100 text-start mb-1 d-flex align-items-center"
                  onClick={() => handleAction(handleEditOrder, order)}
                >
                  <FontAwesomeIcon
                    icon={faEdit}
                    className="me-2 text-secondary"
                  />
                  Edit Order
                </button>

                {/* ✅ ENHANCED: Generate Sales Order - More Visible */}
                {genInfo.canGenerateSO ? (
                  <button
                    className="btn btn-outline-success btn-sm w-100 text-start mb-2 d-flex align-items-center"
                    onClick={() =>
                      handleAction(handleGenerateSalesOrder, order)
                    }
                    style={{
                      backgroundColor: "#f0f9ff",
                      borderColor: "#059669",
                      color: "#059669",
                      fontWeight: "600",
                    }}
                  >
                    <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                    Generate Sales Order
                  </button>
                ) : genInfo.hasGeneratedSO ? (
                  <div className="mb-2">
                    <button
                      className="btn btn-light btn-sm w-100 text-start d-flex align-items-center"
                      disabled
                      style={{opacity: 0.7}}
                    >
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="me-2 text-success"
                      />
                      Sales Order Generated
                    </button>
                    {genInfo.salesOrderNumber && (
                      <small className="text-muted d-block mt-1 px-2">
                        SO: {genInfo.salesOrderNumber}
                      </small>
                    )}
                  </div>
                ) : genInfo.isFromSalesOrder ? (
                  <div className="mb-2">
                    <button
                      className="btn btn-light btn-sm w-100 text-start d-flex align-items-center"
                      disabled
                      style={{opacity: 0.7}}
                    >
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        className="me-2 text-info"
                      />
                      From Sales Order
                    </button>
                    <small className="text-muted d-block mt-1 px-2">
                      Cannot generate circular reference
                    </small>
                  </div>
                ) : (
                  <div className="mb-2">
                    <button
                      className="btn btn-light btn-sm w-100 text-start d-flex align-items-center"
                      disabled
                      style={{opacity: 0.7}}
                    >
                      <FontAwesomeIcon
                        icon={faBan}
                        className="me-2 text-muted"
                      />
                      SO Generation Disabled
                    </button>
                    <small className="text-muted d-block mt-1 px-2">
                      {genInfo.reasonIfDisabled || "Not available"}
                    </small>
                  </div>
                )}

                {/* Convert to Invoice */}
                <button
                  className="btn btn-light btn-sm w-100 text-start mb-1 d-flex align-items-center"
                  onClick={() => handleAction(handleConvertOrder, order)}
                >
                  <FontAwesomeIcon
                    icon={faFileInvoice}
                    className="me-2 text-info"
                  />
                  Convert to Invoice
                </button>

                {/* ✅ IMPROVED: Source/Generated Orders Section */}
                {(order.isAutoGenerated ||
                  genInfo.hasGeneratedSO ||
                  genInfo.hasCorrespondingSO) && (
                  <>
                    <hr className="my-2" />
                    <div className="text-muted small fw-bold mb-1 px-2">
                      Order Tracking:
                    </div>

                    {order.isAutoGenerated && order.sourceOrderNumber && (
                      <button
                        className="btn btn-light btn-sm w-100 text-start mb-1 d-flex align-items-center"
                        onClick={() =>
                          handleAction(handleViewSourceOrder, order)
                        }
                      >
                        <FontAwesomeIcon
                          icon={faEye}
                          className="me-2 text-info"
                        />
                        <span className="text-truncate">
                          View Source: {order.sourceOrderNumber}
                        </span>
                      </button>
                    )}

                    {(genInfo.hasGeneratedSO || genInfo.hasCorrespondingSO) && (
                      <button
                        className="btn btn-light btn-sm w-100 text-start mb-1 d-flex align-items-center"
                        onClick={() =>
                          handleAction(handleViewGeneratedOrders, order)
                        }
                      >
                        <FontAwesomeIcon
                          icon={faProjectDiagram}
                          className="me-2 text-primary"
                        />
                        View Generated Orders
                      </button>
                    )}

                    {/* ✅ NEW: View Tracking Chain */}
                    <button
                      className="btn btn-light btn-sm w-100 text-start mb-1 d-flex align-items-center"
                      onClick={() =>
                        handleAction(handleViewTrackingChain, order)
                      }
                    >
                      <FontAwesomeIcon
                        icon={faProjectDiagram}
                        className="me-2 text-info"
                      />
                      View Order Chain
                    </button>
                  </>
                )}

                {/* Duplicate Order */}
                <button
                  className="btn btn-light btn-sm w-100 text-start mb-1 d-flex align-items-center"
                  onClick={() => handleAction(handleDuplicateOrder, order)}
                >
                  <FontAwesomeIcon icon={faCopy} className="me-2 text-info" />
                  Duplicate Order
                </button>

                <hr className="my-2" />

                {/* Print & Share */}
                <div className="d-flex gap-1 mb-2">
                  <button
                    className="btn btn-light btn-sm flex-fill d-flex align-items-center justify-content-center"
                    onClick={() => handleAction(handlePrintOrder, order)}
                  >
                    <FontAwesomeIcon icon={faPrint} className="me-1" />
                    Print
                  </button>
                  <button
                    className="btn btn-light btn-sm flex-fill d-flex align-items-center justify-content-center"
                    onClick={() => handleAction(handleShareOrder, order)}
                  >
                    <FontAwesomeIcon icon={faShare} className="me-1" />
                    Share
                  </button>
                  <button
                    className="btn btn-light btn-sm flex-fill d-flex align-items-center justify-content-center"
                    onClick={() => handleAction(handleDownloadOrder, order)}
                  >
                    <FontAwesomeIcon icon={faDownload} className="me-1" />
                    Download
                  </button>
                </div>

                {/* ✅ IMPROVED: Status Actions with better visibility */}
                <div className="text-muted small fw-bold mb-1 px-2">
                  Status Actions:
                </div>

                {status === "draft" && (
                  <button
                    className="btn btn-outline-primary btn-sm w-100 text-start mb-1 d-flex align-items-center"
                    onClick={() => handleAction(handleConfirmOrder, order)}
                  >
                    <FontAwesomeIcon icon={faCheck} className="me-2" />
                    Confirm Order
                  </button>
                )}

                {status === "confirmed" && (
                  <button
                    className="btn btn-outline-info btn-sm w-100 text-start mb-1 d-flex align-items-center"
                    onClick={() => handleAction(handleShipOrder, order)}
                  >
                    <FontAwesomeIcon icon={faTruck} className="me-2" />
                    Ship Order
                  </button>
                )}

                {(status === "shipped" || status === "confirmed") && (
                  <button
                    className="btn btn-outline-success btn-sm w-100 text-start mb-1 d-flex align-items-center"
                    onClick={() => handleAction(handleReceiveOrder, order)}
                  >
                    <FontAwesomeIcon icon={faBoxes} className="me-2" />
                    Mark as Received
                  </button>
                )}

                {status === "received" && (
                  <button
                    className="btn btn-outline-success btn-sm w-100 text-start mb-1 d-flex align-items-center"
                    onClick={() => handleAction(handleCompleteOrder, order)}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Complete Order
                  </button>
                )}

                <hr className="my-2" />

                {/* Delete/Cancel Order */}
                <button
                  className={`btn ${
                    status === "draft"
                      ? "btn-outline-danger"
                      : "btn-outline-warning"
                  } btn-sm w-100 text-start d-flex align-items-center`}
                  onClick={() => handleAction(handleDeleteOrder, order)}
                  disabled={isDeleting}
                >
                  <FontAwesomeIcon
                    icon={isDeleting ? faSpinner : faTrash}
                    className={`me-2 ${isDeleting ? "fa-spin" : ""}`}
                  />
                  {isDeleting
                    ? "Deleting..."
                    : status === "draft"
                    ? "Delete Order"
                    : "Cancel & Delete"}
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      );

    return (
      <>
        <Button
          ref={buttonRef}
          variant="outline-primary"
          size="sm"
          className="action-trigger-btn"
          onClick={handleToggle}
          disabled={isDeleting || modalLoading}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </Button>
        {dropdownMenu}
      </>
    );

    return (
      <>
        <Button
          ref={buttonRef}
          variant="outline-primary"
          size="sm"
          className="action-trigger-btn"
          onClick={handleToggle}
          disabled={isDeleting || modalLoading}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </Button>
        {dropdownMenu}
      </>
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
                <h5 className="mb-0 text-purple">
                  <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                  {title || "Purchase Orders"}
                  <Badge bg="light" text="dark" className="ms-2">
                    {safeFilteredOrders.length}
                  </Badge>
                </h5>
              </Col>
              <Col xs="auto">
                <div className="d-flex gap-2 align-items-center">
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
              <Container fluid className="px-3 py-3">
                <Row className="align-items-center">
                  <Col>
                    <small className="text-muted">
                      Showing {safeFilteredOrders.length} of{" "}
                      {safePurchaseOrders.length} orders
                    </small>
                  </Col>
                  <Col xs="auto">
                    <div className="summary-stats d-flex gap-4">
                      <small className="text-muted">
                        <strong className="text-primary">Total Value:</strong> ₹
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
                        <strong className="text-success">Active:</strong>{" "}
                        {safeSeparatedOrders.active?.length || 0}
                      </small>
                      {(safeSeparatedOrders.cancelled?.length || 0) > 0 && (
                        <small className="text-muted">
                          <strong className="text-secondary">Cancelled:</strong>{" "}
                          {safeSeparatedOrders.cancelled?.length || 0}
                        </small>
                      )}
                    </div>
                  </Col>
                </Row>
              </Container>
            </div>
          )}
        </div>
      </div>

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
      {/* Generate Sales Order Modal */}
      <GenerateSalesOrderModal
        show={showGenerateSOModal}
        onHide={() => {
          setShowGenerateSOModal(false);
          setSelectedOrderForSOGeneration(null);
          setSOGenerationError(null);
        }}
        order={selectedOrderForSOGeneration}
      />
      <style jsx>{`
        /* ✅ Purple gradient header styling - matching PurchaseBillsTable */
        .table-header-purple {
          background: linear-gradient(
            135deg,
            #667eea 0%,
            #764ba2 100%
          ) !important;
          background-attachment: fixed;
          border-radius: 0 !important;
        }

        .table-header-purple th {
          background: transparent !important;
          border: none !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          padding: 15px 8px !important;
          font-size: 13px;
          letter-spacing: 0.5px;
          border-radius: 0 !important;
        }

        .table-header-purple th:first-child {
          border-top-left-radius: 0 !important;
          border-radius: 0 !important;
        }

        .table-header-purple th:last-child {
          border-top-right-radius: 0 !important;
          border-radius: 0 !important;
        }

        /* ✅ Remove ALL border radius from everything */
        .card,
        .table,
        .table th,
        .table td,
        .table thead,
        .table tbody,
        .table tfoot,
        .table-responsive,
        .btn,
        .badge,
        .dropdown-menu,
        .dropdown-toggle,
        .modal,
        .modal-content,
        .modal-header,
        .modal-body,
        .modal-footer,
        .form-control,
        .form-select,
        .input-group,
        .input-group-text,
        .alert,
        .border,
        .rounded,
        .rounded-sm,
        .rounded-lg,
        .rounded-xl,
        .rounded-pill {
          border-radius: 0 !important;
        }

        /* ✅ Specifically target table elements */
        .modern-purchase-table,
        .modern-purchase-table *,
        .modern-purchase-table th,
        .modern-purchase-table td,
        .modern-purchase-table thead,
        .modern-purchase-table tbody,
        .modern-purchase-table tfoot {
          border-radius: 0 !important;
        }

        /* ✅ Table container - completely square */
        .table-container-modern {
          overflow: visible !important;
          border-radius: 0 !important;
        }

        .table-container-modern .table {
          border-radius: 0 !important;
        }

        .table-container-modern .table th:first-child {
          border-top-left-radius: 0 !important;
        }

        .table-container-modern .table th:last-child {
          border-top-right-radius: 0 !important;
        }

        /* ✅ Bootstrap table responsive wrapper */
        .table-responsive {
          border-radius: 0 !important;
        }

        .table-responsive .table {
          border-radius: 0 !important;
        }

        /* ✅ Custom table styling */
        .modern-purchase-table {
          border-radius: 0 !important;
          border: 1px solid #e9ecef !important;
        }

        .modern-purchase-table tbody tr {
          border-bottom: 1px solid #e9ecef;
          transition: all 0.2s ease;
          border-radius: 0 !important;
        }

        .modern-purchase-table tbody tr:hover {
          background-color: #f8f9ff !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border-radius: 0 !important;
        }

        .modern-purchase-table tbody tr td {
          border-radius: 0 !important;
        }

        /* ✅ Action button styling - completely square */
        .action-trigger-btn {
          border-radius: 0 !important;
          padding: 6px 8px !important;
          border: 1px solid #e9ecef !important;
          background: transparent !important;
          box-shadow: none !important;
          transition: all 0.2s ease !important;
        }

        .action-trigger-btn:hover {
          background: #f8f9ff !important;
          color: #667eea !important;
          transform: scale(1.05);
          border-radius: 0 !important;
        }

        .action-trigger-btn:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
          border-radius: 0 !important;
        }

        .action-trigger-btn:focus {
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25) !important;
          border-radius: 0 !important;
        }
        // ✅ ADD this CSS to your existing style block:

        /* ✅ Custom dropdown styling - fixed positioning */
        .custom-action-dropdown {
          position: sticky !important;
          z-index: 9999 !important;
        }

        .custom-action-dropdown .bg-white {
          border-radius: 0 !important;
          border: 1px solid #e9ecef !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          max-height: 400px !important;
          overflow-y: auto !important;
        }

        .custom-action-dropdown .btn {
          border: none !important;
          text-align: left !important;
          transition: all 0.2s ease !important;
          border-radius: 0 !important;
          font-size: 14px;
        }

        .custom-action-dropdown .btn:hover {
          background: #f8f9ff !important;
          transform: translateX(2px);
          border-radius: 0 !important;
        }

        /* ✅ Prevent dropdown from being affected by parent scroll */
        .custom-action-dropdown {
          position: fixed !important;
          will-change: transform !important;
          backface-visibility: hidden !important;
        }

        /* ✅ Ensure dropdown stays on top */
        .custom-action-dropdown {
          z-index: 10000 !important;
        }
        /* ✅ Actions cell */
        .actions-cell-modern {
          padding: 8px 6px !important;
          text-align: center !important;
          vertical-align: middle !important;
          width: 50px !important;
          min-width: 50px !important;
          border-radius: 0 !important;
        }

        .purchase-orders-container-redesigned {
          overflow: visible !important;
          border-radius: 0 !important;
        }

        /* ✅ Badge styling - completely square */
        .badge {
          font-size: 11px !important;
          font-weight: 500 !important;
          padding: 4px 8px !important;
          border-radius: 0 !important;
        }

        .status-badge-compact {
          font-size: 11px !important;
          padding: 4px 8px !important;
          border-radius: 0 !important;
        }

        /* ✅ Table row styling */
        .modern-table-row {
          height: 60px;
          transition: all 0.2s ease;
          border-radius: 0 !important;
        }

        .modern-table-row.cancelled {
          opacity: 0.75;
          background-color: #f8f9fa;
          border-radius: 0 !important;
        }

        .modern-table-row.cancelled .text-decoration-line-through {
          text-decoration: line-through;
        }

        /* ✅ Cell styling */
        .date-cell,
        .order-number-cell,
        .supplier-cell,
        .type-cell,
        .amount-cell,
        .status-cell {
          vertical-align: middle !important;
          padding: 12px 8px !important;
          border-radius: 0 !important;
        }

        .order-number-link {
          color: #667eea !important;
          text-decoration: none;
          font-weight: 600;
        }

        .order-number-link:hover {
          color: #764ba2 !important;
          text-decoration: underline;
        }

        .order-amount {
          font-weight: 600;
          color: #28a745 !important;
        }

        /* ✅ Table footer - completely square */
        .table-footer-summary {
          background: linear-gradient(90deg, #f8f9ff 0%, #e9ecef 100%);
          border-top: 2px solid #667eea;
          border-radius: 0 !important;
        }

        /* ✅ Card styling - completely square */
        .card {
          border-radius: 0 !important;
          border: 1px solid #e9ecef !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }

        .card-header {
          border-radius: 0 !important;
        }

        .card-body {
          border-radius: 0 !important;
        }

        .card-footer {
          border-radius: 0 !important;
        }

        /* ✅ Button styling - completely square */
        .btn {
          border-radius: 0 !important;
          transition: all 0.2s ease !important;
        }

        .btn-primary {
          background: linear-gradient(
            135deg,
            #667eea 0%,
            #764ba2 100%
          ) !important;
          border: none !important;
          border-radius: 0 !important;
        }

        .btn-primary:hover {
          background: linear-gradient(
            135deg,
            #5a67d8 0%,
            #6b46c1 100%
          ) !important;
          transform: translateY(-1px);
          border-radius: 0 !important;
        }

        .btn-outline-primary {
          border-color: #667eea !important;
          color: #667eea !important;
          border-radius: 0 !important;
        }

        .btn-outline-primary:hover {
          background: #667eea !important;
          border-color: #667eea !important;
          color: white !important;
          border-radius: 0 !important;
        }

        /* ✅ Mobile responsiveness */
        @media (max-width: 768px) {
          .custom-action-dropdown {
            transform: translateX(-50px) !important;
            border-radius: 0 !important;
          }

          .action-trigger-btn {
            padding: 3px 6px !important;
            font-size: 0.8rem !important;
            border-radius: 0 !important;
          }

          .table-header-purple th {
            padding: 10px 6px !important;
            font-size: 12px;
            border-radius: 0 !important;
          }

          .modern-table-row {
            height: 50px;
            border-radius: 0 !important;
          }

          .date-cell,
          .order-number-cell,
          .supplier-cell,
          .type-cell,
          .amount-cell,
          .status-cell {
            padding: 8px 6px !important;
            border-radius: 0 !important;
          }
        }

        /* ✅ Search and filter header styling */
        .purchase-orders-filter-section {
          background: linear-gradient(90deg, #f8f9ff 0%, #ffffff 100%);
          border-bottom: 1px solid #e9ecef;
          padding: 1rem 0;
          border-radius: 0 !important;
        }

        .text-purple {
          color: #667eea !important;
        }

        /* ✅ Input styling - completely square */
        .form-control,
        .form-select {
          border-radius: 0 !important;
          border-color: #e9ecef !important;
        }

        .form-control:focus,
        .form-select:focus {
          border-color: #667eea !important;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
          border-radius: 0 !important;
        }

        .input-group-text {
          border-radius: 0 !important;
          background: #f8f9ff !important;
          border-color: #e9ecef !important;
          color: #667eea !important;
        }

        .input-group {
          border-radius: 0 !important;
        }

        .input-group .form-control:first-child {
          border-radius: 0 !important;
        }

        .input-group .form-control:last-child {
          border-radius: 0 !important;
        }

        /* ✅ Override Bootstrap's default rounded classes */
        * {
          border-radius: 0 !important;
        }

        /* ✅ Alert styling - completely square */
        .alert {
          border-radius: 0 !important;
        }

        /* ✅ Modal styling - completely square */
        .modal-content {
          border-radius: 0 !important;
        }

        .modal-header {
          border-radius: 0 !important;
        }

        .modal-body {
          border-radius: 0 !important;
        }

        .modal-footer {
          border-radius: 0 !important;
        }
      `}</style>
    </>
  );
}

export default PurchaseOrderTable;
