import React, {useState, useCallback, useMemo, useEffect, useRef} from "react";

import {OverlayTrigger, Popover} from "react-bootstrap";
import {createPortal} from "react-dom";
import {
  Container,
  Row,
  Col,
  Button,
  Table,
  Badge,
  Dropdown,
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
  faChevronUp,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import UniversalViewModal from "../../../Common/UniversalViewModal";
import saleOrderService from "../../../../services/saleOrderService";
import partyService from "../../../../services/partyService";

const DOCUMENT_LABELS = {
  "sales-order": {
    documentName: "Sales Order",
    documentNamePlural: "Sales Orders",
    listPath: "sales-orders",
    editPath: "sales-orders", // ✅ FIXED: Should be sales-orders not quotations
    createPath: "sales-orders/add",
    viewPath: "sales-orders",
    apiEndpoint: "sales-orders", // ✅ ADDED: API endpoint path
  },
  quotation: {
    documentName: "Quotation",
    documentNamePlural: "Quotations",
    listPath: "quotations",
    editPath: "sales-orders", // ✅ FIXED: Quotations also use sales-orders API
    createPath: "sales-orders/add", // ✅ FIXED: Both use same endpoint
    viewPath: "quotations",
    apiEndpoint: "sales-orders", // ✅ ADDED: Both use sales-orders API
  },
};

const STATUS_CONFIG = {
  cancelled: {variant: "dark", text: "Cancelled", icon: faTimesCircle},
  deleted: {variant: "dark", text: "Cancelled", icon: faTimesCircle},
  draft: {variant: "secondary", text: "Draft", icon: faEdit},
  pending: {variant: "warning", text: "Pending", icon: faClock},
  confirmed: {variant: "primary", text: "Confirmed", icon: faCheckCircle},
  approved: {variant: "success", text: "Approved", icon: faCheckCircle},
  shipped: {variant: "info", text: "Shipped", icon: faTruck},
  delivered: {variant: "success", text: "Delivered", icon: faBoxes},
  completed: {variant: "success", text: "Completed", icon: faCheck},
  converted: {variant: "info", text: "Converted", icon: faExchangeAlt},
  default: {variant: "secondary", text: "Unknown", icon: faClipboardList},
};

function SalesOrderTable({
  salesOrders: propSalesOrders = [],
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
  onPrintOrder,
  onShareOrder,
  onDownloadOrder,
  onConvertOrder,
  onConfirmOrder,
  onApproveOrder,
  onShipOrder,
  onDeliverOrder,
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
  showBidirectionalColumns = false,
  onViewTrackingChain,
  onGeneratePurchaseOrder,
  onViewSourceOrder,
  onViewGeneratedOrders,
  documentType = "sales-order",
  isQuotationsMode = false,
  saleOrderService: propSaleOrderService,
  quotations = [],
  onError,
  enableEnhancedTracking = false,
  showSourceCompanyColumn = false,
  showGeneratedOrdersColumn = false,
  enableQuickNavigation = false,
  onNavigate,
  refreshTrigger, // ✅ ADD: For external refresh triggers
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ ENHANCED: Service resolution with fallback
  const resolvedSaleOrderService = propSaleOrderService || saleOrderService;

  // ✅ ENHANCED STATE MANAGEMENT (Same as PurchaseOrderTable)
  const [salesOrders, setSalesOrders] = useState(propSalesOrders);
  const [isLoading, setIsLoading] = useState(propIsLoading);
  const [fetchError, setFetchError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // ✅ ENHANCED: Quotations mode detection with multiple fallbacks
  const isInQuotationsMode = useMemo(() => {
    return (
      isQuotationsMode ||
      documentType === "quotation" ||
      location.pathname.includes("/quotations") ||
      title?.toLowerCase().includes("quotation") ||
      salesOrders.some(
        (order) =>
          order.orderType === "quotation" ||
          order.documentType === "quotation" ||
          order.quotationNumber
      ) ||
      quotations.length > 0
    );
  }, [
    isQuotationsMode,
    documentType,
    location.pathname,
    title,
    salesOrders,
    quotations,
  ]);

  // ✅ ENHANCED: State management
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
  const [showGeneratePOModal, setShowGeneratePOModal] = useState(false);
  const [selectedOrderForPOGeneration, setSelectedOrderForPOGeneration] =
    useState(null);
  const [poGenerationLoading, setPOGenerationLoading] = useState(false);
  const [poGenerationError, setPOGenerationError] = useState(null);
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  const [lastGenerationTime, setLastGenerationTime] = useState(null);

  // ✅ ENHANCED: Document type and navigation paths
  const getDocumentType = useCallback(() => {
    return isInQuotationsMode ? "quotation" : "sales-order";
  }, [isInQuotationsMode]);

  const getNavigationPaths = useCallback(() => {
    const docType = getDocumentType();
    const config = DOCUMENT_LABELS[docType] || DOCUMENT_LABELS["sales-order"];

    console.log("📍 Navigation paths:", {
      documentType: docType,
      isInQuotationsMode,
      config,
    });

    return config;
  }, [getDocumentType, isInQuotationsMode]);
  const fetchSalesOrders = useCallback(
    async (force = false) => {
      if (!companyId) {
        console.warn("⚠️ No companyId provided, cannot fetch sales orders");
        return;
      }

      // Skip if data is fresh and not forced
      if (!force && lastFetchTime && Date.now() - lastFetchTime < 30000) {
        console.log("⏭️ Skipping fetch - data is fresh");
        return;
      }

      try {
        setIsLoading(true);
        setFetchError(null);

        console.log("🔄 Fetching sales orders:", {
          companyId,
          isInQuotationsMode,
          documentType,
          force,
        });

        let response;

        try {
          response = await resolvedSaleOrderService.getSalesOrders(companyId, {
            includeCustomer: true,
            includeItems: true,
            sortBy: sortBy || "date",
            sortOrder: sortOrder || "desc",
            status: filterStatus !== "all" ? filterStatus : undefined,
            search: searchTerm || undefined,
          });

          console.log("✅ Sales orders API response:", {
            success: response?.success,
            dataType: typeof response?.data,
            isArray: Array.isArray(response?.data),
            count: Array.isArray(response?.data) ? response.data.length : 0,
            responseKeys: response ? Object.keys(response) : [],
            fullResponse: response,
            // ✅ ADD: Deep inspection of response.data
            dataKeys:
              response?.data && typeof response.data === "object"
                ? Object.keys(response.data)
                : [],
            dataValues:
              response?.data && typeof response.data === "object"
                ? Object.values(response.data)
                : [],
          });
        } catch (fetchError) {
          console.error("❌ Sales orders fetch failed:", fetchError);
          throw fetchError;
        }

        if (response?.success && response?.data) {
          // ✅ ENHANCED: Better data extraction with comprehensive fallbacks
          let orders = [];

          console.log("🔍 DETAILED: Analyzing response.data structure:", {
            dataType: typeof response.data,
            isArray: Array.isArray(response.data),
            dataKeys:
              typeof response.data === "object"
                ? Object.keys(response.data)
                : [],
            dataContent: response.data,
            // ✅ ADD: Check each property value
            propertyInspection:
              typeof response.data === "object"
                ? Object.entries(response.data).map(([key, value]) => ({
                    key,
                    type: typeof value,
                    isArray: Array.isArray(value),
                    length: Array.isArray(value) ? value.length : null,
                    hasOrderProps:
                      Array.isArray(value) && value.length > 0
                        ? Boolean(
                            value[0]?.orderNumber || value[0]._id || value[0].id
                          )
                        : false,
                  }))
                : [],
          });

          // ✅ CRITICAL FIX: Enhanced response structure handling
          if (Array.isArray(response.data)) {
            // Direct array
            orders = response.data;
            console.log("✅ Response data is direct array:", orders.length);
          } else if (response.data && typeof response.data === "object") {
            // ✅ COMPREHENSIVE: Check ALL possible property names and values
            const possibleArrayKeys = [
              "salesOrders",
              "orders",
              "data",
              "sales_orders",
              "saleOrders",
              "transactions",
              "documents",
              "items",
              "results",
              "records",
              "quotations",
              "quotation",
              "salesOrder",
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
                console.log(
                  `✅ Found orders in response.data.${key}:`,
                  orders.length
                );
                foundOrders = true;
                break;
              }
            }

            // Method 2: If no known properties, inspect all properties
            if (!foundOrders) {
              console.log(
                "🔍 No known properties found, inspecting ALL properties..."
              );

              for (const [key, value] of Object.entries(response.data)) {
                console.log(`🔍 Inspecting property "${key}":`, {
                  type: typeof value,
                  isArray: Array.isArray(value),
                  length: Array.isArray(value) ? value.length : null,
                  value: Array.isArray(value) ? value.slice(0, 1) : value,
                });

                if (Array.isArray(value)) {
                  // Check if this array contains order-like objects
                  if (value.length > 0) {
                    const firstItem = value[0];
                    const hasOrderProperties = Boolean(
                      firstItem &&
                        typeof firstItem === "object" &&
                        (firstItem.orderNumber ||
                          firstItem._id ||
                          firstItem.id ||
                          firstItem.quotationNumber ||
                          firstItem.customer ||
                          firstItem.customerName ||
                          firstItem.amount ||
                          firstItem.total ||
                          firstItem.items)
                    );

                    console.log(`🔍 Array "${key}" analysis:`, {
                      length: value.length,
                      firstItem: firstItem,
                      hasOrderProperties: hasOrderProperties,
                      orderProperties: firstItem
                        ? {
                            hasOrderNumber: Boolean(firstItem.orderNumber),
                            hasId: Boolean(firstItem._id || firstItem.id),
                            hasCustomer: Boolean(
                              firstItem.customer || firstItem.customerName
                            ),
                            hasAmount: Boolean(
                              firstItem.amount || firstItem.total
                            ),
                            hasItems: Boolean(firstItem.items),
                          }
                        : null,
                    });

                    if (hasOrderProperties) {
                      orders = value;
                      console.log(
                        `✅ Found order-like objects in response.data.${key}:`,
                        orders.length
                      );
                      foundOrders = true;
                      break;
                    }
                  } else {
                    console.log(`⚠️ Array "${key}" is empty`);
                  }
                }
              }
            }

            // Method 3: If still no arrays found, check if response.data itself is an order
            if (!foundOrders) {
              console.log(
                "🔍 No arrays found, checking if response.data is a single order..."
              );

              const hasOrderProperties = Boolean(
                response.data.orderNumber ||
                  response.data._id ||
                  response.data.id ||
                  response.data.quotationNumber ||
                  response.data.customer ||
                  response.data.customerName
              );

              if (hasOrderProperties) {
                orders = [response.data];
                console.log(
                  "✅ Response data appears to be a single order, wrapping in array"
                );
                foundOrders = true;
              } else {
                console.log("❌ Response data structure not recognized:", {
                  dataKeys: Object.keys(response.data),
                  sampleValues: Object.values(response.data).slice(0, 3),
                  fullData: response.data,
                });
              }
            }
          }

          console.log("✅ Final extracted orders:", {
            total: orders.length,
            firstOrderKeys: orders[0] ? Object.keys(orders[0]) : [],
            sample: orders[0]
              ? {
                  orderNumber: orders[0].orderNumber,
                  customerName: orders[0].customerName,
                  amount: orders[0].amount,
                  status: orders[0].status,
                  isAutoGenerated: orders[0].isAutoGenerated,
                  sourceOrderType: orders[0].sourceOrderType,
                }
              : null,
            allOrders: orders, // ✅ Log all orders for debugging
          });

          if (orders.length === 0) {
            console.warn(
              "⚠️ No orders found in response. Full response analysis:",
              {
                responseStructure: response,
                dataType: typeof response.data,
                dataKeys: response.data ? Object.keys(response.data) : [],
                dataValues: response.data ? Object.values(response.data) : [],
              }
            );

            // Don't throw error, just set empty array and continue
            setSalesOrders([]);
            setLastFetchTime(Date.now());
            setFetchError(null);
            return;
          }

          // ✅ SIMPLIFIED: Process orders with minimal transformation
          const processedOrders = orders
            .filter((order) => order != null) // Remove null/undefined
            .map((order) => ({
              ...order,
              // ✅ Ensure required display fields
              displayCustomerName:
                order.customerName ||
                order.customer?.name ||
                "Unknown Customer",
              displayAmount: parseFloat(
                order.amount || order.total || order.totals?.finalTotal || 0
              ),
              displayStatus: order.status || "draft",
              displayDate: order.orderDate || order.createdAt,
            }));

          console.log("✅ Processed sales orders:", {
            total: processedOrders.length,
            withCustomer: processedOrders.filter(
              (o) => o.displayCustomerName !== "Unknown Customer"
            ).length,
            withAmount: processedOrders.filter((o) => o.displayAmount > 0)
              .length,
            statuses: [...new Set(processedOrders.map((o) => o.status))],
            processedSample: processedOrders[0],
          });

          setSalesOrders(processedOrders);
          setLastFetchTime(Date.now());
          setFetchError(null);
        } else {
          console.error("❌ Invalid response structure:", response);
          throw new Error(
            response?.message ||
              "Failed to fetch sales orders - Invalid response"
          );
        }
      } catch (error) {
        console.error("❌ Error fetching sales orders:", {
          error: error.message,
          stack: error.stack,
          companyId,
          serviceAvailable: !!resolvedSaleOrderService,
        });

        setFetchError(error.message);
        addToast?.(`Failed to fetch sales orders: ${error.message}`, "error");

        // ✅ Fallback to provided data
        if (propSalesOrders && propSalesOrders.length > 0) {
          console.log("📋 Using fallback data:", propSalesOrders.length);
          setSalesOrders(propSalesOrders);
        } else {
          setSalesOrders([]);
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
      propSalesOrders,
      addToast,
      lastFetchTime,
      resolvedSaleOrderService,
    ]
  );

  // ✅ ENHANCED: Auto-fetch on mount and dependency changes (Same as PurchaseOrderTable)
  useEffect(() => {
    if (companyId) {
      fetchSalesOrders(true);
    }
  }, [companyId, refreshTrigger]);

  // ✅ ENHANCED: Refresh when filters change
  useEffect(() => {
    if (companyId && lastFetchTime) {
      const delayedFetch = setTimeout(() => {
        fetchSalesOrders(false);
      }, 500); // Debounce filter changes

      return () => clearTimeout(delayedFetch);
    }
  }, [searchTerm, filterStatus, sortBy, sortOrder, fetchSalesOrders]);

  // ✅ Auto-refresh after conversions
  useEffect(() => {
    const state = location.state;
    if (state?.conversionSuccess || state?.generatedFrom) {
      console.log("🔄 Detected conversion success, forcing refresh...", state);
      setLastGenerationTime(Date.now());
      setTimeout(() => {
        fetchSalesOrders(true);
      }, 1000);
    }
  }, [location.state, fetchSalesOrders]);

  // ✅ Add periodic refresh for recently generated orders
  useEffect(() => {
    if (lastGenerationTime && Date.now() - lastGenerationTime < 30000) {
      const interval = setInterval(() => {
        console.log("🔄 Periodic refresh for recent generation...");
        fetchSalesOrders(true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [lastGenerationTime, fetchSalesOrders]);

  // ✅ ENHANCED: Final data resolution with multiple fallbacks (Same as PurchaseOrderTable)
  const finalSalesOrders = useMemo(() => {
    const orders =
      Array.isArray(salesOrders) && salesOrders.length > 0
        ? salesOrders
        : Array.isArray(propSalesOrders)
        ? propSalesOrders
        : [];

    return orders.filter((order) => order != null); // Remove null/undefined orders
  }, [salesOrders, propSalesOrders]);

  const finalIsLoading = isLoading || propIsLoading;

  // ✅ SIMPLIFIED: Order source detection (around line 506)
  const getOrderSource = useCallback((order) => {
    // ✅ SIMPLIFIED: Check if order came from a purchase order
    const isFromPurchaseOrder = Boolean(
      order.isAutoGenerated === true &&
        order.sourceOrderId &&
        order.sourceOrderType === "purchase_order"
    );

    console.log("🔍 Simplified order source analysis:", {
      orderNumber: order.orderNumber,
      isAutoGenerated: order.isAutoGenerated,
      sourceOrderType: order.sourceOrderType,
      sourceOrderId: order.sourceOrderId,
      isFromPurchaseOrder,
    });

    if (isFromPurchaseOrder) {
      return {
        type: "fromPO",
        label: "From Purchase Order",
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
        label: "Self Generated",
        icon: faUser,
        color: "success",
        description: "Created directly",
      };
    }
  }, []);

  // ✅ ORDER CATEGORIZATION (Same as PurchaseOrderTable)
  const categorizeOrders = useMemo(() => {
    const all = Array.isArray(finalSalesOrders) ? finalSalesOrders : [];
    const selfCreated = [];
    const fromPurchaseOrders = [];
    const autoGenerated = [];

    all.forEach((order) => {
      if (!order) return; // Skip null/undefined orders

      const source = getOrderSource(order);
      if (source.type === "fromPO") {
        fromPurchaseOrders.push(order);
        if (order.isAutoGenerated === true) {
          autoGenerated.push(order);
        }
      } else {
        selfCreated.push(order);
      }
    });

    return {all, selfCreated, fromPurchaseOrders, autoGenerated};
  }, [finalSalesOrders, getOrderSource]);

  // ✅ FIXED: Better filtering logic with proper default handling (Same as PurchaseOrderTable)
  const getFilteredOrders = () => {
    // ✅ FIXED: Start with finalSalesOrders instead of empty array
    let orders = [...finalSalesOrders]; // Always start with all orders

    // ✅ Apply order type filter
    switch (activeOrderType) {
      case "self":
        orders = categorizeOrders.selfCreated;
        break;
      case "fromPO":
        orders = categorizeOrders.fromPurchaseOrders;
        break;
      case "auto":
        orders = categorizeOrders.autoGenerated;
        break;
      default:
        orders = categorizeOrders.all;
    }

    // ✅ KEEP: Search filter
    if (localSearchTerm && localSearchTerm.trim()) {
      const searchLower = localSearchTerm.toLowerCase();
      orders = orders.filter(
        (order) =>
          (order.orderNumber || "").toLowerCase().includes(searchLower) ||
          (order.customerName || order.customer?.name || "")
            .toLowerCase()
            .includes(searchLower) ||
          (order.customerMobile || order.customer?.mobile || "")
            .toLowerCase()
            .includes(searchLower) ||
          (order.notes || "").toLowerCase().includes(searchLower)
      );
    }

    // ✅ KEEP: Status filter
    if (
      localFilterStatus &&
      localFilterStatus !== "all" &&
      localFilterStatus !== ""
    ) {
      orders = orders.filter((order) => order.status === localFilterStatus);
    }

    // ✅ KEEP: Sorting logic
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
          case "customer":
            aVal = (a.customerName || a.customer?.name || "").toLowerCase();
            bVal = (b.customerName || b.customer?.name || "").toLowerCase();
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

  // ✅ FIX: Add safe fallback for filteredOrders (Same as PurchaseOrderTable)
  const filteredOrders = useMemo(() => {
    try {
      return getFilteredOrders();
    } catch (error) {
      console.error("Error filtering orders:", error);
      return []; // Safe fallback
    }
  }, [
    localSearchTerm,
    localFilterStatus,
    localSortBy,
    localSortOrder,
    finalSalesOrders,
    activeOrderType,
    categorizeOrders,
  ]);

  // ✅ ENHANCED: Customer data fetching
  const fetchCustomerData = useCallback(async (customerId) => {
    try {
      console.log("🔍 Fetching customer data for ID:", customerId);

      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      // ✅ Check if customerId is already an object (populated)
      if (typeof customerId === "object" && customerId._id) {
        console.log("✅ Customer already populated:", customerId);
        return customerId;
      }

      // ✅ Extract string ID if it's an ObjectId object
      const customerIdString =
        typeof customerId === "object" && customerId.$oid
          ? customerId.$oid
          : customerId.toString();

      console.log("🔄 Fetching customer with ID:", customerIdString);

      if (!partyService || typeof partyService.getPartyById !== "function") {
        console.warn("❌ Party service not available, using fallback");
        return {
          _id: customerIdString,
          id: customerIdString,
          name: "Unknown Customer",
          linkedCompanyId: null,
          companyId: null,
        };
      }

      // ✅ Use partyService to fetch customer data
      const response = await partyService.getPartyById(customerIdString);

      if (response.success && response.data) {
        const customer =
          response.data.party || response.data.customer || response.data;
        console.log("✅ Customer data fetched successfully:", customer);

        // ✅ Map different possible field names for company linking
        const mappedCustomer = {
          ...customer,
          linkedCompanyId:
            customer.linkedCompanyId ||
            customer.companyId ||
            customer.linkedCompany ||
            customer.company ||
            customer.associatedCompany,
          companyId:
            customer.companyId ||
            customer.linkedCompanyId ||
            customer.company ||
            customer.linkedCompany ||
            customer.associatedCompany,
          name:
            customer.name ||
            customer.customerName ||
            customer.partyName ||
            customer.displayName,
          mobile:
            customer.mobile ||
            customer.phone ||
            customer.customerPhone ||
            customer.contactNumber,
        };

        console.log("🔄 Mapped customer data:", {
          originalCustomer: customer,
          mappedCustomer: mappedCustomer,
          hasCompanyLink: !!(
            mappedCustomer.linkedCompanyId || mappedCustomer.companyId
          ),
        });

        return mappedCustomer;
      } else {
        throw new Error(response.message || "Failed to fetch customer data");
      }
    } catch (error) {
      console.error("❌ Error fetching customer data:", error);

      // Return basic structure on error
      const customerIdString =
        typeof customerId === "object" && customerId.$oid
          ? customerId.$oid
          : customerId?.toString() || "unknown";

      return {
        _id: customerIdString,
        id: customerIdString,
        name: "Unknown Customer",
        linkedCompanyId: null,
        companyId: null,
        error: error.message,
      };
    }
  }, []);

  // ✅ MODAL HANDLER FOR PURCHASE ORDER GENERATION
  const handleModalGeneratePurchaseOrder = useCallback((order) => {
    setViewModalShow(false);
    setSelectedOrderForPOGeneration(order);
    setShowGeneratePOModal(true);
    setPOGenerationError(null);
  }, []);

  // ✅ ENHANCED GENERATE PURCHASE ORDER MODAL
  const GeneratePurchaseOrderModal = ({show, onHide, order}) => {
    const [confirmationData, setConfirmationData] = useState({
      notes: "",
      priority: "normal",
      expectedDeliveryDate: "",
      termsAndConditions: "",
      autoLinkCustomer: true,
    });

    const handleGenerate = async () => {
      try {
        setPOGenerationLoading(true);
        setPOGenerationError(null);

        console.log("🔄 ENHANCED: Starting purchase order generation:", {
          orderNumber: order?.orderNumber,
          orderType: order?.orderType || documentType,
          companyId: companyId,
          serviceAvailable: !!resolvedSaleOrderService?.generatePurchaseOrder,
          isInQuotationsMode: isInQuotationsMode,
        });

        addToast?.("Generating purchase order from order...", "info");

        // ✅ CRITICAL: Check if service method exists
        if (!resolvedSaleOrderService?.generatePurchaseOrder) {
          console.error("❌ Service method not available:", {
            resolvedSaleOrderService: !!resolvedSaleOrderService,
            generatePurchaseOrder:
              !!resolvedSaleOrderService?.generatePurchaseOrder,
            availableMethods: resolvedSaleOrderService
              ? Object.keys(resolvedSaleOrderService)
              : [],
          });
          throw new Error(
            "Generate purchase order service method not available"
          );
        }

        const orderId = order._id || order.id;
        if (!orderId) {
          throw new Error("Order ID not found");
        }

        // ✅ ENHANCED: Extract and fetch customer data
        let customerData = {};
        let customerId = null;

        // ✅ FIXED: Better customer ID extraction
        if (typeof order.customer === "object" && order.customer) {
          // Handle MongoDB ObjectId format
          if (order.customer.$oid) {
            customerId = order.customer.$oid;
            console.log("🔍 Detected MongoDB ObjectId format:", customerId);
          } else if (order.customer._id) {
            customerData = order.customer;
            customerId = order.customer._id;
            console.log("✅ Customer already populated:", customerData);
          } else {
            console.error("❌ Invalid customer object format:", order.customer);
            throw new Error("Invalid customer data format in the order.");
          }
        } else if (typeof order.customer === "string") {
          customerId = order.customer;
          console.log("🔍 Detected string customer ID:", customerId);
        } else {
          console.error("❌ Invalid customer data format:", order.customer);
          throw new Error("Invalid customer data format in the order.");
        }

        // ✅ CRITICAL FIX: Always fetch fresh customer data from service
        console.log("🔍 Fetching fresh customer data from service...");
        try {
          if (
            !partyService ||
            typeof partyService.getPartyById !== "function"
          ) {
            console.warn("❌ Party service not available, using fallback");
            customerData = {
              _id: customerId,
              id: customerId,
              name: "Unknown Customer",
              linkedCompanyId: null,
              companyId: null,
            };
          } else {
            const response = await partyService.getPartyById(customerId);

            if (response.success && response.data) {
              const customer =
                response.data.party || response.data.customer || response.data;
              console.log("✅ Customer data fetched successfully:", customer);

              // Map different possible field names for company linking
              customerData = {
                ...customer,
                linkedCompanyId:
                  customer.linkedCompanyId ||
                  customer.companyId ||
                  customer.linkedCompany ||
                  customer.company ||
                  customer.associatedCompany,
                companyId:
                  customer.companyId ||
                  customer.linkedCompanyId ||
                  customer.company ||
                  customer.linkedCompany ||
                  customer.associatedCompany,
                name:
                  customer.name ||
                  customer.customerName ||
                  customer.partyName ||
                  customer.displayName,
                mobile:
                  customer.mobile ||
                  customer.phone ||
                  customer.customerPhone ||
                  customer.contactNumber,
              };
            } else {
              throw new Error(
                response.message || "Failed to fetch customer data"
              );
            }
          }
        } catch (fetchError) {
          console.error("❌ Failed to fetch customer data:", fetchError);
          throw new Error(
            `Could not load customer information: ${fetchError.message}`
          );
        }

        console.log("🔍 Final customer data analysis:", {
          customerId: customerId,
          customerName:
            customerData.name || customerData.customerName || "Unknown",
          hasLinkedCompanyId: !!customerData.linkedCompanyId,
          hasCompanyId: !!customerData.companyId,
          enableBidirectionalOrders: customerData.enableBidirectionalOrders,
          bidirectionalOrderReady: customerData.bidirectionalOrderReady,
          isLinkedCustomer: customerData.isLinkedCustomer,
          autoLinkSettings: {
            byGST: customerData.autoLinkByGST,
            byPhone: customerData.autoLinkByPhone,
            byEmail: customerData.autoLinkByEmail,
          },
          contactInfo: {
            gstNumber: customerData.gstNumber,
            phoneNumber: customerData.phoneNumber || customerData.mobile,
            email: customerData.email,
          },
        });

        // ✅ ENHANCED: Company linking validation with auto-detection
        const possibleCompanyFields = [
          "linkedCompanyId",
          "companyId",
          "linkedCompany",
          "company",
          "associatedCompanyId",
          "associatedCompany",
          "relatedCompanyId",
          "parentCompanyId",
          "targetCompanyId",
        ];

        let targetCompanyId = null;
        let foundField = null;
        let detectionMethod = "manual";

        // Priority 1: Check existing company linking fields
        for (const field of possibleCompanyFields) {
          const fieldValue = customerData[field];
          if (fieldValue) {
            let companyIdString = null;

            // ✅ CRITICAL FIX: Proper company ID extraction
            if (typeof fieldValue === "object" && fieldValue) {
              if (fieldValue.$oid) {
                companyIdString = fieldValue.$oid;
              } else if (fieldValue._id) {
                companyIdString = fieldValue._id;
              } else if (
                fieldValue.toString &&
                fieldValue.toString() !== "[object Object]"
              ) {
                companyIdString = fieldValue.toString();
              }
            } else if (
              typeof fieldValue === "string" &&
              fieldValue.length > 0
            ) {
              companyIdString = fieldValue;
            }

            if (
              companyIdString &&
              companyIdString !== companyId &&
              companyIdString !== "[object Object]"
            ) {
              targetCompanyId = companyIdString;
              foundField = field;
              detectionMethod = "existing_link";
              console.log(
                `✅ Found company link via field: ${field} = ${targetCompanyId}`
              );
              break;
            } else if (companyIdString === companyId) {
              console.log(
                `⚠️ Found same company link via field: ${field} = ${companyIdString} (same as current)`
              );
            } else if (companyIdString === "[object Object]") {
              console.warn(
                `⚠️ Invalid object reference in field: ${field}`,
                fieldValue
              );
            }
          }
        }

        // ✅ STEP 3: Auto-detection if no direct linking found
        if (
          !targetCompanyId &&
          (customerData.autoLinkByGST ||
            customerData.autoLinkByPhone ||
            customerData.autoLinkByEmail)
        ) {
          console.log(
            "🔍 No direct company link found, attempting auto-detection..."
          );

          try {
            // Get all companies for matching
            const companiesResponse = await fetch(
              `${window.location.origin.replace(
                ":3000",
                ":5000"
              )}/api/companies`,
              {
                headers: {
                  Authorization: `Bearer ${
                    localStorage.getItem("token") ||
                    localStorage.getItem("authToken")
                  }`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (companiesResponse.ok) {
              const companiesData = await companiesResponse.json();
              const companies =
                companiesData.data?.companies ||
                companiesData.companies ||
                companiesData.data ||
                [];

              console.log(
                "🔍 Available companies for matching:",
                companies.length
              );

              // Find matching company by GST, phone, or email
              const matchingCompany = companies.find((company) => {
                if (company._id === companyId) return false; // Skip current company

                const gstMatch =
                  customerData.autoLinkByGST &&
                  customerData.gstNumber &&
                  company.gstin === customerData.gstNumber;

                const phoneMatch =
                  customerData.autoLinkByPhone &&
                  (customerData.phoneNumber || customerData.mobile) &&
                  (company.phoneNumber === customerData.phoneNumber ||
                    company.phoneNumber === customerData.mobile);

                const emailMatch =
                  customerData.autoLinkByEmail &&
                  customerData.email &&
                  company.email === customerData.email;

                if (gstMatch || phoneMatch || emailMatch) {
                  console.log(
                    `✅ Found matching company: ${company.businessName}`,
                    {
                      matchType: gstMatch
                        ? "GST"
                        : phoneMatch
                        ? "Phone"
                        : "Email",
                      companyId: company._id,
                      gstMatch: gstMatch && {
                        customer: customerData.gstNumber,
                        company: company.gstin,
                      },
                      phoneMatch: phoneMatch && {
                        customer:
                          customerData.phoneNumber || customerData.mobile,
                        company: company.phoneNumber,
                      },
                      emailMatch: emailMatch && {
                        customer: customerData.email,
                        company: company.email,
                      },
                    }
                  );
                  return true;
                }
                return false;
              });

              if (matchingCompany) {
                targetCompanyId = matchingCompany._id;
                foundField = "auto_detected";
                detectionMethod = "auto_detection";
                console.log("✅ Auto-detected target company:", {
                  companyId: matchingCompany._id,
                  companyName: matchingCompany.businessName,
                });

                // ✅ Optional: Auto-link the customer for future use
                if (confirmationData.autoLinkCustomer) {
                  try {
                    console.log(
                      "🔗 Auto-linking customer to detected company..."
                    );
                    const linkResponse = await fetch(
                      `${window.location.origin.replace(
                        ":3000",
                        ":5000"
                      )}/api/parties/${customerId}`,
                      {
                        method: "PUT",
                        headers: {
                          Authorization: `Bearer ${
                            localStorage.getItem("token") ||
                            localStorage.getItem("authToken")
                          }`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          linkedCompanyId: matchingCompany._id,
                          enableBidirectionalOrders: true,
                          isLinkedCustomer: true,
                          bidirectionalOrderReady: true,
                        }),
                      }
                    );

                    if (linkResponse.ok) {
                      console.log("✅ Customer auto-linked successfully");
                      // Update local customer data
                      customerData.linkedCompanyId = matchingCompany._id;
                      customerData.enableBidirectionalOrders = true;
                      customerData.isLinkedCustomer = true;
                      customerData.bidirectionalOrderReady = true;
                    } else {
                      console.warn(
                        "⚠️ Failed to auto-link customer, but continuing with generation"
                      );
                    }
                  } catch (linkError) {
                    console.warn("⚠️ Auto-linking failed:", linkError.message);
                  }
                }
              }
            }
          } catch (error) {
            console.warn("⚠️ Company auto-detection failed:", error.message);
          }
        }

        // ✅ CRITICAL: Validate targetCompanyId format before using
        if (!targetCompanyId) {
          const customerName =
            customerData.name || customerData.customerName || customerId;
          let errorMessage = `Customer "${customerName}" is not configured for purchase order generation.\n\n`;

          const hasAutoLinkSettings =
            customerData.autoLinkByGST ||
            customerData.autoLinkByPhone ||
            customerData.autoLinkByEmail;
          const hasContactInfo =
            customerData.gstNumber ||
            customerData.phoneNumber ||
            customerData.mobile ||
            customerData.email;

          if (hasAutoLinkSettings && hasContactInfo) {
            errorMessage += `✅ Auto-linking is enabled but no matching company found.\n\n`;
            errorMessage += `Available contact information:\n`;
            if (customerData.gstNumber)
              errorMessage += `• GST Number: ${customerData.gstNumber}\n`;
            if (customerData.phoneNumber || customerData.mobile)
              errorMessage += `• Phone: ${
                customerData.phoneNumber || customerData.mobile
              }\n`;
            if (customerData.email)
              errorMessage += `• Email: ${customerData.email}\n`;
            errorMessage += `\n💡 Solution: Create a company with matching GST/Phone/Email, or manually link this customer.`;
          } else {
            errorMessage += `❌ Manual linking required.\n\n`;
            errorMessage += `Current configuration:\n`;
            errorMessage += `• Linked Company: ${
              customerData.linkedCompanyId || "None"
            }\n`;
            errorMessage += `• Bidirectional Orders: ${
              customerData.enableBidirectionalOrders ? "Enabled" : "Disabled"
            }\n`;
            errorMessage += `• Bidirectional Ready: ${
              customerData.bidirectionalOrderReady ? "Yes" : "No"
            }\n`;
            errorMessage += `• Is Linked Customer: ${
              customerData.isLinkedCustomer ? "Yes" : "No"
            }\n\n`;

            errorMessage += `💡 To fix this "${customerName}" customer:\n`;
            errorMessage += `1. Go to Customers → Edit "${customerName}"\n`;
            errorMessage += `2. Set "Linked Company ID" to the target company\n`;
            errorMessage += `3. Enable "Bidirectional Orders"\n`;
            errorMessage += `4. Enable "Bidirectional Order Ready"\n`;
            errorMessage += `5. Mark as "Linked Customer"`;
          }

          throw new Error(errorMessage);
        }

        // ✅ CRITICAL: Additional validation for company ID format
        if (
          targetCompanyId === "[object Object]" ||
          typeof targetCompanyId === "object"
        ) {
          console.error("❌ Invalid targetCompanyId format:", targetCompanyId);
          throw new Error(
            "Invalid company ID format detected. Please check customer configuration."
          );
        }

        // ✅ CRITICAL: Ensure targetCompanyId is a proper string
        if (
          typeof targetCompanyId !== "string" ||
          targetCompanyId.length !== 24
        ) {
          console.error("❌ Invalid targetCompanyId format:", {
            value: targetCompanyId,
            type: typeof targetCompanyId,
            length: targetCompanyId?.length,
          });
          throw new Error(
            "Invalid company ID format. Expected 24-character string."
          );
        }

        if (targetCompanyId === companyId) {
          throw new Error(
            `Cannot generate purchase order in the same company.\n\n` +
              `Customer: ${
                customerData.name || customerData.customerName || customerId
              }\n` +
              `Customer's company (${foundField}): ${targetCompanyId}\n` +
              `Your company: ${companyId}\n\n` +
              `The customer must be linked to a DIFFERENT company account.`
          );
        }

        // ✅ ENHANCED: Prepare comprehensive conversion data
        const conversionData = {
          // ✅ CRITICAL: Ensure targetCompanyId is a clean string
          targetCompanyId: String(targetCompanyId).trim(),
          targetSupplierId: String(customerId).trim(),
          targetSupplierName:
            order.customerName ||
            customerData.name ||
            customerData.customerName ||
            customerData.displayName ||
            "Unknown Customer",
          targetSupplierMobile:
            order.customerMobile ||
            customerData.mobile ||
            customerData.phone ||
            customerData.contactNumber ||
            "",
          targetSupplierEmail:
            order.customerEmail ||
            customerData.email ||
            customerData.emailAddress ||
            "",

          // Order details
          orderType: "purchase_order",
          deliveryDate:
            confirmationData.expectedDeliveryDate ||
            order.expectedDeliveryDate ||
            order.deliveryDate ||
            null,
          validUntil: order.validUntil || null,
          priority: confirmationData.priority || "normal",

          // Enhanced conversion context
          convertedBy: currentUser?.id || currentUser?.name || "System",
          convertedByName: currentUser?.name || "System User",
          notes:
            confirmationData.notes ||
            `Generated from ${
              isInQuotationsMode ? "Quotation" : "Sales Order"
            }: ${order.orderNumber}`,
          conversionReason: isInQuotationsMode
            ? "quotation_to_purchase_order"
            : "sales_order_to_purchase_order",

          // Source tracking
          sourceOrderId: String(orderId).trim(),
          sourceOrderNumber:
            order.orderNumber || order.quotationNumber || "Unknown",
          sourceOrderType: isInQuotationsMode ? "quotation" : "sales_order",
          sourceCompanyId: String(companyId).trim(),

          // ✅ CRITICAL: Override bidirectional validation
          skipBidirectionalValidation: true,
          forceGeneration: true,
          validateBidirectionalSetup: false,

          // Bidirectional settings
          autoLinkSupplier: true,
          createCorrespondingRecord: true,

          // Data preservation
          preserveItems: true,
          preservePricing: true,
          preserveTerms: true,
          preserveCustomerInfo: true,

          // Enhanced metadata
          detectionMethod: detectionMethod,
          foundCompanyField: foundField,
          customerAutoLinked:
            detectionMethod === "auto_detection" &&
            confirmationData.autoLinkCustomer,

          // Customer configuration override
          customerConfigurationOverride: {
            originalBidirectionalReady: customerData.bidirectionalOrderReady,
            originalLinkedCustomer: customerData.isLinkedCustomer,
            originalEnableBidirectional: customerData.enableBidirectionalOrders,
            reason: "Manual override for purchase order generation",
          },

          // Debug info
          debugInfo: {
            originalCustomerId: order.customer,
            resolvedCustomerId: customerId,
            detectionMethod: detectionMethod,
            foundField: foundField,
            customerName: customerData.name || customerData.customerName,
            timestamp: new Date().toISOString(),
            targetCompanyIdType: typeof targetCompanyId,
            targetCompanyIdLength: targetCompanyId?.length,
            targetCompanyIdValidation: {
              isString: typeof targetCompanyId === "string",
              isValidLength: targetCompanyId?.length === 24,
              isNotObjectString: targetCompanyId !== "[object Object]",
              trimmedValue: String(targetCompanyId).trim(),
            },
          },
        };

        console.log("📤 ENHANCED: Sending conversion data:", {
          conversionData: conversionData,
          orderId: orderId,
          companyId: companyId,
          targetCompanyIdValidation: {
            value: targetCompanyId,
            type: typeof targetCompanyId,
            length: targetCompanyId?.length,
            isObjectString: targetCompanyId === "[object Object]",
            isValid:
              targetCompanyId &&
              targetCompanyId !== "[object Object]" &&
              typeof targetCompanyId === "string" &&
              targetCompanyId.length === 24,
            trimmedValue: String(targetCompanyId).trim(),
          },
        });

        // ✅ ENHANCED: Call the service method with proper error handling
        let response;
        try {
          response = await resolvedSaleOrderService.generatePurchaseOrder(
            orderId,
            conversionData
          );
          console.log("📥 ENHANCED: Received service response:", response);
        } catch (serviceError) {
          console.error("❌ Service call failed:", serviceError);

          // Enhanced error parsing
          if (serviceError.response) {
            const errorData =
              serviceError.response.data || serviceError.response;
            throw new Error(
              errorData.message ||
                errorData.error ||
                "Service returned an error"
            );
          } else if (serviceError.message) {
            throw serviceError;
          } else {
            throw new Error("Unknown service error occurred");
          }
        }

        // ✅ ENHANCED: Validate response structure
        if (!response) {
          throw new Error("No response received from service");
        }

        console.log("🔍 Response validation:", {
          hasResponse: !!response,
          hasSuccess: !!response.success,
          hasData: !!response.data,
          hasPurchaseOrder: !!response.data?.purchaseOrder,
          responseKeys: Object.keys(response),
        });

        if (response.success) {
          // ✅ ENHANCED: Success handling
          let successMessage =
            response.message || "Purchase order generated successfully!";

          // Add configuration override info to success message
          if (conversionData.skipBidirectionalValidation) {
            successMessage += `\n\n⚠️ Note: Purchase order was generated despite customer configuration issues.`;
          }

          addToast?.(successMessage, "success");

          // ✅ ENHANCED: Handle navigation to generated PO
          if (response.data?.purchaseOrder?._id) {
            const poId = response.data.purchaseOrder._id;
            const poNumber =
              response.data.purchaseOrder.orderNumber ||
              response.data.purchaseOrder.number;
            const targetCompanyIdFromResponse =
              response.data.purchaseOrder.companyId || targetCompanyId;

            console.log("✅ Purchase order created successfully:", {
              poId: poId,
              poNumber: poNumber,
              targetCompanyId: targetCompanyIdFromResponse,
              originalOrderId: orderId,
              configurationOverride: conversionData.skipBidirectionalValidation,
            });

            // Enhanced navigation confirmation
            setTimeout(() => {
              const navigateConfirmed = window.confirm(
                `Purchase order "${poNumber}" generated successfully!\n\n` +
                  `Target Company: ${targetCompanyIdFromResponse}\n` +
                  (conversionData.skipBidirectionalValidation
                    ? `Configuration: Overridden for generation\n`
                    : "") +
                  `\nWould you like to view it now?`
              );

              if (navigateConfirmed) {
                const navigationPath = `/companies/${targetCompanyIdFromResponse}/purchase-orders/${poId}`;
                const navigationState = {
                  returnPath: location.pathname,
                  highlightOrder: poId,
                  generatedFrom: isInQuotationsMode
                    ? "quotation"
                    : "sales-order",
                  sourceOrderId: orderId,
                  sourceOrderNumber: order.orderNumber,
                  showSuccessMessage: true,
                  conversionSuccess: true,
                  configurationOverride:
                    conversionData.skipBidirectionalValidation,
                };

                if (onNavigate) {
                  onNavigate(navigationPath, {state: navigationState});
                } else {
                  navigate(navigationPath, {state: navigationState});
                }
                return;
              }
            }, 1000);
          }

          // ✅ Close modals and refresh
          onHide();
          if (viewModalShow) {
            setViewModalShow(false);
            setSelectedOrder(null);
          }

          // ✅ Trigger parent refresh if available
          setTimeout(() => {
            if (typeof window !== "undefined" && window.location) {
              window.location.reload();
            }
          }, 2000);
        } else {
          // Handle service success=false case
          const errorMessage =
            response.message ||
            response.error ||
            "Failed to generate purchase order - Unknown error";
          console.error("❌ Service returned success=false:", {
            response: response,
            message: errorMessage,
          });
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error("❌ ENHANCED: Error generating purchase order:", {
          error: error.message,
          stack: error.stack,
          orderId: order._id || order.id,
          orderNumber: order.orderNumber,
          companyId: companyId,
          serviceAvailable: !!resolvedSaleOrderService?.generatePurchaseOrder,
        });

        // ✅ ENHANCED: Better error messages based on error content
        let errorMessage = "Failed to generate purchase order";

        if (error.message) {
          if (error.message.includes("not properly configured")) {
            errorMessage = `Customer configuration issue: ${error.message}`;
          } else if (error.message.includes("Customer must be linked")) {
            errorMessage =
              "Customer is not linked to a company account. Please link the customer first.";
          } else if (
            error.message.includes(
              "Cannot generate purchase order in the same company"
            )
          ) {
            errorMessage =
              "Cannot generate purchase order in the same company. Customer must be linked to a different company.";
          } else if (error.message.includes("service method not available")) {
            errorMessage =
              "Generate purchase order service is not configured. Please check your service setup.";
          } else if (
            error.message.includes("Network Error") ||
            error.message.includes("fetch")
          ) {
            errorMessage =
              "Network error: Unable to connect to server. Please check your internet connection.";
          } else if (
            error.message.includes("Unauthorized") ||
            error.message.includes("401")
          ) {
            errorMessage = "Authentication failed. Please log in again.";
          } else if (
            error.message.includes("Forbidden") ||
            error.message.includes("403")
          ) {
            errorMessage = "You don't have permission to perform this action.";
          } else if (error.message.includes("Cast to ObjectId failed")) {
            errorMessage =
              "Invalid company ID format. Please check customer configuration and try again.";
          } else {
            errorMessage = error.message;
          }
        }

        setPOGenerationError(errorMessage);

        // Enhanced debugging for development
        if (process.env.NODE_ENV === "development") {
          console.error("🔍 ENHANCED: Detailed Debug Info:", {
            order: order,
            companyId: companyId,
            currentUser: currentUser,
            resolvedSaleOrderService: {
              available: !!resolvedSaleOrderService,
              methods: resolvedSaleOrderService
                ? Object.keys(resolvedSaleOrderService)
                : [],
              generatePurchaseOrder:
                !!resolvedSaleOrderService?.generatePurchaseOrder,
            },
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          });
        }
      } finally {
        setPOGenerationLoading(false);
      }
    };

    // ✅ ENHANCED: Modal UI with auto-link option
    if (!order) return null;

    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
            Generate Purchase Order
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {poGenerationError && (
            <Alert variant="danger" className="mb-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              <pre
                style={{whiteSpace: "pre-wrap", margin: 0, fontSize: "0.9em"}}
              >
                {poGenerationError}
              </pre>
            </Alert>
          )}

          <div className="mb-4">
            <h6 className="text-info mb-3">
              <FontAwesomeIcon icon={faClipboardList} className="me-2" />
              {isInQuotationsMode ? "Quotation" : "Sales Order"} Details
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
                  <strong>Customer:</strong>
                  <div>
                    {order.customerName || order.customer?.name || "Unknown"}
                  </div>
                  {(order.customerMobile || order.customer?.mobile) && (
                    <small className="text-muted">
                      {order.customerMobile || order.customer?.mobile}
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
              Purchase Order Configuration
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
                placeholder={`Generated from ${
                  isInQuotationsMode ? "Quotation" : "Sales Order"
                }: ${order.orderNumber}`}
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
              <Form.Label>Terms and Conditions</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Enter any specific terms and conditions..."
                value={confirmationData.termsAndConditions}
                onChange={(e) =>
                  setConfirmationData((prev) => ({
                    ...prev,
                    termsAndConditions: e.target.value,
                  }))
                }
              />
            </Form.Group>

            {/* ✅ ENHANCED: Auto-link option */}
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="autoLinkCustomer"
                checked={confirmationData.autoLinkCustomer}
                onChange={(e) =>
                  setConfirmationData((prev) => ({
                    ...prev,
                    autoLinkCustomer: e.target.checked,
                  }))
                }
                label="Automatically link customer to detected company (recommended)"
                className="text-info"
              />
              <Form.Text className="text-muted">
                This will update the customer record with the detected company
                link for future orders.
              </Form.Text>
            </Form.Group>
          </div>

          <Alert variant="info" className="mb-3">
            <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
            <strong>What will happen:</strong>
            <ul className="mb-0 mt-2">
              <li>
                A new purchase order will be created in the target company
                account
              </li>
              <li>
                The customer will be notified about the new purchase order
              </li>
              <li>
                All items and pricing will be copied from this{" "}
                {isInQuotationsMode ? "quotation" : "sales order"}
              </li>
              <li>You can track the status of both orders bidirectionally</li>
              {confirmationData.autoLinkCustomer && (
                <li className="text-success">
                  ✅ Customer will be automatically linked for future orders
                </li>
              )}
            </ul>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={onHide}
            disabled={poGenerationLoading}
          >
            Cancel
          </Button>
          <Button
            variant="info"
            onClick={handleGenerate}
            disabled={poGenerationLoading}
          >
            {poGenerationLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="me-2 fa-spin" />
                Generating...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                Generate Purchase Order
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  const transformOrderForEdit = useCallback(
    (order) => {
      console.log("🔄 Transforming order for edit:", {
        orderNumber: order.orderNumber,
        isInQuotationsMode,
        documentType: getDocumentType(),
        originalOrder: order,
      });

      // ✅ ENHANCED: Item transformation with better fallbacks
      const transformedItems = (order.items || []).map((item, index) => {
        const quantity = parseFloat(item.quantity || item.qty || 1);
        const pricePerUnit = parseFloat(
          item.pricePerUnit ||
            item.unitPrice ||
            item.rate ||
            item.price ||
            item.salePrice ||
            item.sellingPrice ||
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
          availableStock: parseFloat(item.availableStock || 0),
          taxMode: item.taxMode || order.taxMode || "without-tax",
          priceIncludesTax: Boolean(
            item.priceIncludesTax || order.priceIncludesTax
          ),
          selectedProduct: item.itemRef
            ? {
                id: item.itemRef,
                _id: item.itemRef,
                name: item.itemName || item.productName,
                salePrice: pricePerUnit,
                gstRate: taxRate,
                hsnCode: item.hsnCode || "0000",
                unit: item.unit || "PCS",
              }
            : null,
        };
      });

      // ✅ ENHANCED: Customer data transformation with better handling
      const customerData = (() => {
        if (order.customer && typeof order.customer === "object") {
          return {
            id: order.customer._id || order.customer.id,
            _id: order.customer._id || order.customer.id,
            name: order.customer.name || order.customer.customerName || "",
            mobile: order.customer.mobile || order.customer.phone || "",
            email: order.customer.email || "",
            address: order.customer.address || "",
            gstNumber: order.customer.gstNumber || "",
          };
        } else {
          return {
            id: order.customerId || order.customer,
            _id: order.customerId || order.customer,
            name: order.customerName || order.partyName || "",
            mobile:
              order.customerMobile ||
              order.partyPhone ||
              order.mobileNumber ||
              "",
            email: order.customerEmail || order.partyEmail || "",
            address: order.customerAddress || order.partyAddress || "",
            gstNumber: order.customerGstNumber || "",
          };
        }
      })();

      const totalAmount = parseFloat(
        order.amount ||
          order.total ||
          order.totals?.finalTotal ||
          order.grandTotal ||
          order.orderValue ||
          0
      );

      // ✅ ENHANCED: Base transformation with quotation-specific fields
      const baseTransformation = {
        id: order._id || order.id,
        _id: order._id || order.id,
        documentType: getDocumentType(),

        // ✅ ENHANCED: Order number handling for both types
        orderNumber: isInQuotationsMode
          ? order.quotationNumber ||
            order.orderNumber ||
            order.salesOrderNumber ||
            order.orderNo
          : order.orderNumber ||
            order.salesOrderNumber ||
            order.orderNo ||
            order.billNumber,

        // ✅ ENHANCED: For quotations, also include quotationNumber
        ...(isInQuotationsMode && {
          quotationNumber: order.quotationNumber || order.orderNumber,
        }),

        orderDate:
          order.orderDate || order.saleDate || order.billDate || order.date,
        expectedDeliveryDate:
          order.expectedDeliveryDate || order.deliveryDate || null,

        customer: customerData,
        customerName: customerData?.name || "",
        customerMobile: customerData?.mobile || "",

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

        // ✅ ENHANCED: Source tracking fields
        isAutoGenerated: Boolean(order.isAutoGenerated),
        sourceOrderType: order.sourceOrderType || null,
        sourceOrderId: order.sourceOrderId || null,
        sourceOrderNumber: order.sourceOrderNumber || null,
        sourceCompanyId: order.sourceCompanyId || null,

        // ✅ ENHANCED: Bidirectional tracking
        hasCorrespondingPurchaseOrder: Boolean(
          order.hasCorrespondingPurchaseOrder
        ),
        correspondingPurchaseOrderId:
          order.correspondingPurchaseOrderId || null,
        hasGeneratedPurchaseOrder: Boolean(order.hasGeneratedPurchaseOrder),

        trackingInfo: order.trackingInfo || null,

        // ✅ ENHANCED: Metadata
        isTransformed: true,
        transformedAt: new Date().toISOString(),
        transformedFor: "edit",
        originalData: order, // Keep reference to original data
      };

      console.log("✅ Order transformed for edit:", {
        orderNumber: baseTransformation.orderNumber,
        quotationNumber: baseTransformation.quotationNumber,
        documentType: baseTransformation.documentType,
        customerName: baseTransformation.customerName,
        itemsCount: baseTransformation.items.length,
        amount: baseTransformation.amount,
      });

      return baseTransformation;
    },
    [companyId, isInQuotationsMode, getDocumentType]
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
            const enhancedOrder = {
              ...transformedOrder,
              displayNumber: transformedOrder.orderNumber || "N/A",
              displayDate: new Date(
                transformedOrder.orderDate
              ).toLocaleDateString("en-GB"),
              displayCustomer:
                transformedOrder.customerName || "Unknown Customer",
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

          // ✅ ENHANCED: Update the edit case in handleAction function (around line 1650)
          case "edit":
            if (
              targetOrder.status === "cancelled" ||
              targetOrder.status === "deleted"
            ) {
              addToast?.("Cannot edit cancelled order", "warning");
              return;
            }

            // ✅ ENHANCED: Transform order data for editing
            const editTransformed = transformOrderForEdit(targetOrder);

            // ✅ FIXED: Both quotations and sales orders use the same API endpoint
            const documentPaths = getNavigationPaths();
            const editPath = `/companies/${companyId}/sales-orders/${orderId}/edit`;

            console.log("🔄 Navigating to edit page:", {
              editPath,
              orderId,
              isInQuotationsMode,
              documentType: getDocumentType(),
              apiEndpoint: documentPaths.apiEndpoint,
              orderData: editTransformed,
            });

            navigate(editPath, {
              state: {
                // ✅ ENHANCED: Provide multiple data formats for compatibility
                salesOrder: editTransformed,
                order: editTransformed,
                transaction: editTransformed,
                quotation: isInQuotationsMode ? editTransformed : undefined,

                // ✅ ENHANCED: Document type and mode information
                documentType: getDocumentType(),
                orderType: isInQuotationsMode ? "quotation" : "sales_order",
                mode: isInQuotationsMode ? "quotations" : "sales-orders",

                // ✅ ENHANCED: Navigation context
                returnPath: location.pathname,
                editMode: true,
                isEdit: true,

                // ✅ ENHANCED: Original order reference
                originalOrder: targetOrder,

                // ✅ ENHANCED: Default settings
                defaultOrderType: isInQuotationsMode
                  ? "quotation"
                  : "sales_order",

                // ✅ ADDED: API configuration
                apiEndpoint: documentPaths.apiEndpoint,
                updateRoute: `/api/sales-orders/${orderId}`, // ✅ CRITICAL: Actual API route

                // ✅ ENHANCED: Metadata
                editContext: {
                  source: "SalesOrderTable",
                  timestamp: new Date().toISOString(),
                  companyId: companyId,
                  userId: currentUser?.id || currentUser?._id,
                  isQuotationsMode: isInQuotationsMode,
                  apiRoute: `/api/sales-orders/${orderId}`,
                },
              },
            });

            // ✅ Close modal if open
            if (viewModalShow) {
              setViewModalShow(false);
              setSelectedOrder(null);
            }

            // ✅ Call external handler if provided
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

            const orderNumber = targetOrder.orderNumber || "this sales order";
            const confirmed = window.confirm(
              `Are you sure you want to delete sales order ${orderNumber}?`
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

            const deleteResponse = await saleOrderService.deleteSalesOrder(
              orderId,
              deleteOptions
            );

            if (deleteResponse.success) {
              addToast?.(
                deleteResponse.message || "Sales order deleted successfully",
                "success"
              );
              if (viewModalShow) {
                setViewModalShow(false);
                setSelectedOrder(null);
              }
              onDeleteOrder?.(targetOrder);
            } else {
              throw new Error(
                deleteResponse.message || "Failed to delete sales order"
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
              hasCorrespondingPurchaseOrder: false,
              hasGeneratedPurchaseOrder: false,
            };
            const createPath = `/companies/${companyId}/${DOCUMENT_LABELS.createPath}`;
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

          case "approve":
            onApproveOrder?.(targetOrder);
            break;

          case "ship":
            onShipOrder?.(targetOrder);
            break;

          case "deliver":
            onDeliverOrder?.(targetOrder);
            break;

          case "complete":
            onCompleteOrder?.(targetOrder);
            break;

          case "cancel":
            onCancelOrder?.(targetOrder);
            break;

          case "generatePurchaseOrder":
            // ✅ ENHANCED: Always use internal modal for quotations, delegate for regular sales orders
            if (onGeneratePurchaseOrder && !isInQuotationsMode) {
              // Use external handler only for non-quotation mode (regular sales orders)
              console.log(
                "🔄 Using external purchase order handler for sales order"
              );
              onGeneratePurchaseOrder(targetOrder);
            } else {
              // Use internal modal for quotations and when no external handler
              console.log("🔄 Using internal purchase order modal for:", {
                isQuotationsMode: isInQuotationsMode,
                documentType: documentType,
                orderType: targetOrder.orderType,
                hasExternalHandler: !!onGeneratePurchaseOrder,
              });
              handleModalGeneratePurchaseOrder(targetOrder);
            }
            break;

          case "viewTrackingChain":
            if (onViewTrackingChain) {
              onViewTrackingChain(targetOrder);
            } else {
              const response = await saleOrderService.getTrackingChain(orderId);
              if (response.success) {
                addToast?.("Tracking chain loaded successfully", "success");
              }
            }
            break;

          case "viewSourceOrder":
            if (onViewSourceOrder) {
              onViewSourceOrder(targetOrder);
            } else if (
              targetOrder.sourceOrderId &&
              targetOrder.sourceOrderType === "purchase_order"
            ) {
              navigate(
                `/companies/${companyId}/purchase-orders/${targetOrder.sourceOrderId}`
              );
            }
            break;

          case "viewGeneratedOrders":
            if (onViewGeneratedOrders) {
              onViewGeneratedOrders(targetOrder);
            } else {
              const response = await saleOrderService.getGeneratedOrders(
                orderId
              );
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
        addToast?.(error.message || `Failed to ${action} sales order`, "error");
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
      onApproveOrder,
      onShipOrder,
      onDeliverOrder,
      onCompleteOrder,
      onCancelOrder,
      onGeneratePurchaseOrder,
      onViewTrackingChain,
      onViewSourceOrder,
      onViewGeneratedOrders,
      addToast,
      handleModalGeneratePurchaseOrder,
    ]
  );

  // ✅ SIMPLIFIED HANDLERS
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
  const handleApproveOrder = useCallback(
    (order) => handleAction("approve", order),
    [handleAction]
  );
  const handleShipOrder = useCallback(
    (order) => handleAction("ship", order),
    [handleAction]
  );
  const handleDeliverOrder = useCallback(
    (order) => handleAction("deliver", order),
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
  const handleGeneratePurchaseOrder = useCallback(
    (order) => handleAction("generatePurchaseOrder", order),
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
        key: "fromPO",
        label: "From Purchase Orders",
        icon: faBuilding,
        count: categorizeOrders.fromPurchaseOrders.length,
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

  const GeneratedOrdersBadge = ({order}) => {
    const hasGeneratedPO = Boolean(
      order.hasCorrespondingPurchaseOrder || order.hasGeneratedPurchaseOrder
    );
    const hasSourceOrder = Boolean(
      order.isAutoGenerated && order.sourceOrderId
    );

    if (!hasGeneratedPO && !hasSourceOrder) {
      return (
        <Badge bg="light" text="dark" className="d-flex align-items-center">
          <FontAwesomeIcon icon={faUser} className="me-1" />
          Manual
        </Badge>
      );
    }

    return (
      <div className="d-flex flex-column gap-1">
        {hasSourceOrder && (
          <Badge bg="info" className="d-flex align-items-center">
            <FontAwesomeIcon icon={faArrowRight} className="me-1" />
            From PO: {order.sourceOrderNumber}
          </Badge>
        )}
        {hasGeneratedPO && (
          <Badge bg="success" className="d-flex align-items-center">
            <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
            Generated PO
          </Badge>
        )}
      </div>
    );
  };

  const StatusBadge = ({status}) => {
    const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.default;

    return (
      <Badge bg={statusInfo.variant} className="status-badge-compact">
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

    // ✅ Check if order is from purchase order to prevent circular generation
    const isFromPurchaseOrder = Boolean(
      order.isAutoGenerated === true &&
        order.sourceOrderId &&
        order.sourceOrderType === "purchase_order"
    );

    const hasValidPOSetup = Boolean(
      !order.hasCorrespondingPurchaseOrder &&
        !order.hasGeneratedPurchaseOrder &&
        !isFromPurchaseOrder
    );

    // Calculate position when opening
    const handleToggle = (e) => {
      e.stopPropagation();

      if (!isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX - 180, // Position to the left of button
        });
      }
      setIsOpen(!isOpen);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          !buttonRef.current.contains(event.target)
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
            position: "absolute",
            top: position.top,
            left: position.left,
            zIndex: 9999,
          }}
        >
          <div
            className="bg-white border rounded shadow-lg p-2"
            style={{minWidth: "200px"}}
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

                {/* Generate Purchase Order - Only if applicable */}
                {hasValidPOSetup && (
                  <>
                    <hr className="my-2" />
                    <button
                      className="btn btn-outline-success btn-sm w-100 text-start mb-1 d-flex align-items-center"
                      onClick={() =>
                        handleAction(handleGeneratePurchaseOrder, order)
                      }
                    >
                      <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                      Generate Purchase Order
                    </button>
                  </>
                )}

                {/* Source/Generated Orders - Only if applicable */}
                {(order.isAutoGenerated ||
                  order.hasCorrespondingPurchaseOrder ||
                  order.hasGeneratedPurchaseOrder) && (
                  <>
                    <hr className="my-2" />

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
                          Source: {order.sourceOrderNumber}
                        </span>
                      </button>
                    )}

                    {(order.hasCorrespondingPurchaseOrder ||
                      order.hasGeneratedPurchaseOrder) && (
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
                  </>
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
  };
  const SimpleViewModal = ({show, onHide, order}) => {
    if (!order) return null;

    const formatCurrency = (amount) => {
      const numAmount = parseFloat(amount) || 0;
      return `₹${numAmount.toLocaleString("en-IN")}`;
    };

    const formatDate = (dateString) => {
      if (!dateString) return "Not set";
      return new Date(dateString).toLocaleDateString("en-GB");
    };

    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faClipboardList} className="me-2" />
            Sales Order Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && (
            <Alert variant="danger" className="mb-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              {modalError}
            </Alert>
          )}

          {modalLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading order details...</p>
            </div>
          ) : (
            <Row>
              <Col md={6}>
                <div className="mb-3">
                  <strong>Order Number:</strong>
                  <div className="text-primary">
                    {order.orderNumber || "N/A"}
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Order Date:</strong>
                  <div>{formatDate(order.orderDate)}</div>
                </div>
                <div className="mb-3">
                  <strong>Customer:</strong>
                  <div>{order.customerName || "Unknown"}</div>
                  {order.customerMobile && (
                    <small className="text-muted">{order.customerMobile}</small>
                  )}
                </div>
                <div className="mb-3">
                  <strong>Status:</strong>
                  <div>
                    <StatusBadge
                      status={order.status}
                      priority={order.priority}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Source:</strong>
                  <div className="mt-1">
                    <SourceBadge order={order} />
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <strong>Order Value:</strong>
                  <div className="h5 text-success">
                    {formatCurrency(order.amount || 0)}
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Expected Delivery:</strong>
                  <div>{formatDate(order.expectedDeliveryDate)}</div>
                </div>
                <div className="mb-3">
                  <strong>Items:</strong>
                  <div>
                    <Badge bg="info">
                      {(order.items || []).length} item
                      {(order.items || []).length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Generated Orders:</strong>
                  <div className="mt-1">
                    <GeneratedOrdersBadge order={order} />
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {order.notes && (
            <div className="mt-3">
              <strong>Notes:</strong>
              <div className="text-muted">{order.notes}</div>
            </div>
          )}

          {order.items && order.items.length > 0 && (
            <div className="mt-4">
              <strong>Items:</strong>
              <div className="table-responsive mt-2">
                <Table size="sm" striped>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Rate</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.slice(0, 5).map((item, index) => (
                      <tr key={index}>
                        <td>{item.itemName || "Unknown Item"}</td>
                        <td>
                          {item.quantity || 0} {item.unit || "PCS"}
                        </td>
                        <td>{formatCurrency(item.pricePerUnit || 0)}</td>
                        <td className="text-end">
                          {formatCurrency(item.amount || 0)}
                        </td>
                      </tr>
                    ))}
                    {order.items.length > 5 && (
                      <tr>
                        <td colSpan="4" className="text-center text-muted">
                          ... and {order.items.length - 5} more items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between w-100">
            <div>
              {enableActions && order.status !== "cancelled" && (
                <>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleAction("edit")}
                    className="me-2"
                  >
                    <FontAwesomeIcon icon={faEdit} className="me-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleAction("duplicate")}
                    className="me-2"
                  >
                    <FontAwesomeIcon icon={faCopy} className="me-1" />
                    Duplicate
                  </Button>
                  {!order.hasCorrespondingPurchaseOrder &&
                    !order.hasGeneratedPurchaseOrder && (
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleAction("generatePurchaseOrder")}
                        className="me-2"
                      >
                        <FontAwesomeIcon
                          icon={faExchangeAlt}
                          className="me-1"
                        />
                        Generate PO
                      </Button>
                    )}
                </>
              )}
              <Button
                variant="outline-info"
                size="sm"
                onClick={() => handleAction("print")}
                className="me-2"
              >
                <FontAwesomeIcon icon={faPrint} className="me-1" />
                Print
              </Button>
            </div>
            <div>
              {enableActions && order.status !== "cancelled" && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleAction("delete")}
                  disabled={
                    modalLoading || deletingOrders.has(order._id || order.id)
                  }
                  className="me-2"
                >
                  <FontAwesomeIcon
                    icon={
                      deletingOrders.has(order._id || order.id)
                        ? faSpinner
                        : faTrash
                    }
                    className={`me-1 ${
                      deletingOrders.has(order._id || order.id) ? "fa-spin" : ""
                    }`}
                  />
                  {deletingOrders.has(order._id || order.id)
                    ? "Deleting..."
                    : "Delete"}
                </Button>
              )}
              <Button variant="secondary" onClick={onHide}>
                Close
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>
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
      <h5 className="text-muted">Loading sales orders...</h5>
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
      <h4 className="text-muted mb-3">
        No{" "}
        {activeOrderType === "all"
          ? "Sales Orders"
          : activeOrderType === "self"
          ? "Self Created Orders"
          : activeOrderType === "fromPO"
          ? "Purchase Order Generated Orders"
          : "Auto-Generated Orders"}{" "}
        Found
      </h4>
      <p className="text-muted mb-4">
        {activeOrderType === "all" &&
          "Start by creating your first sales order to track your customers and orders."}
        {activeOrderType === "self" &&
          "You haven't created any sales orders yet. Create your first order to get started."}
        {activeOrderType === "fromPO" &&
          "No orders generated from purchase orders yet. Orders generated from purchase orders will appear here."}
        {activeOrderType === "auto" &&
          "No auto-generated orders found. Orders generated from purchase orders will appear here."}
      </p>
      {(activeOrderType === "all" || activeOrderType === "self") && (
        <Button
          variant="primary"
          onClick={() =>
            navigate(`/companies/${companyId}/${DOCUMENT_LABELS.createPath}`)
          }
        >
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Create Sales Order
        </Button>
      )}
    </div>
  );

  // ✅ MAIN RENDER LOGIC
  if (isLoading) {
    return <LoadingComponent />;
  }

  if (!salesOrders || salesOrders.length === 0) {
    return <EmptyStateComponent />;
  }

  return (
    <>
      {/* ✅ Order Type Filter Section */}
      {showHeader && (
        <div className="sales-orders-filter-section mb-4">
          <Container fluid className="px-0">
            <Row className="align-items-center">
              <Col>
                <h5 className="mb-3 text-purple">
                  <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                  {title || "Sales Orders"}
                  <Badge bg="light" text="dark" className="ms-2">
                    {filteredOrders.length}
                  </Badge>
                </h5>
                <OrderTypeFilter />
              </Col>
              <Col xs="auto">
                {/* Search and filter controls */}
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
                    <option value="approved">Approved</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
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
      {/* ✅ Enhanced table with bidirectional support */}
      <div className="sales-orders-table-wrapper">
        <div className="table-responsive-wrapper-fixed">
          <Table responsive hover className="mb-0 sales-orders-table">
            <thead className="table-header-purple">
              <tr>
                <th className="date-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faClock} className="me-1" />
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
                    <FontAwesomeIcon icon={faList} className="me-1" />
                    Order No.
                  </div>
                </th>
                <th className="customer-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faUser} className="me-1" />
                    Customer
                  </div>
                </th>
                <th className="items-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faBoxes} className="me-1" />
                    Items
                  </div>
                </th>
                {showBidirectionalColumns && (
                  <th className="source-column">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faRobot} className="me-1" />
                      Source
                    </div>
                  </th>
                )}
                <th className="amount-column text-end">
                  <div className="d-flex align-items-center justify-content-end">
                    <FontAwesomeIcon icon={faTags} className="me-1" />
                    Value
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
                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
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

            <tbody>
              {filteredOrders.map((order, index) => {
                const amount = parseFloat(
                  order.amount ||
                    order.total ||
                    order.totals?.finalTotal ||
                    order.orderValue ||
                    0
                );
                const itemsCount = (order.items || []).length;
                const orderId = order._id || order.id;
                const isCancelled =
                  order.status === "cancelled" || order.status === "deleted";

                return (
                  <tr
                    key={orderId}
                    className={`
            sales-order-row
            ${isCancelled ? "cancelled-order-row" : ""}
          `}
                    onClick={() => handleViewOrder(order)}
                    style={{cursor: "pointer"}}
                  >
                    <td
                      className={`date-cell ${isCancelled ? "text-muted" : ""}`}
                    >
                      <div className="date-wrapper">
                        <small className="order-date">
                          {new Date(
                            order.orderDate || order.saleDate || order.date
                          ).toLocaleDateString("en-GB")}
                        </small>
                        <small className="order-time text-muted">
                          {new Date(
                            order.orderDate || order.saleDate || order.date
                          ).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    </td>

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
                            order.salesOrderNumber ||
                            order.orderNo ||
                            "N/A"}
                        </strong>
                        {order.isAutoGenerated && (
                          <div className="auto-generated-indicator">
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

                    <td className="customer-cell">
                      <div className="customer-info">
                        <div
                          className={`customer-name fw-medium ${
                            isCancelled ? "text-muted" : ""
                          }`}
                        >
                          {order.customerName ||
                            order.customer?.name ||
                            order.partyName ||
                            "Unknown"}
                        </div>
                        {(order.customerMobile ||
                          order.customer?.mobile ||
                          order.partyPhone ||
                          order.mobileNumber) && (
                          <small className="customer-contact text-muted">
                            <FontAwesomeIcon icon={faUser} className="me-1" />
                            {order.customerMobile ||
                              order.customer?.mobile ||
                              order.partyPhone ||
                              order.mobileNumber}
                          </small>
                        )}
                      </div>
                    </td>

                    <td className="items-cell">
                      <div className="items-info">
                        <Badge
                          bg={isCancelled ? "secondary" : "info"}
                          className={`items-count ${
                            isCancelled ? "opacity-50" : ""
                          }`}
                        >
                          <FontAwesomeIcon icon={faBoxes} className="me-1" />
                          {itemsCount}
                        </Badge>
                        {itemsCount > 0 && (
                          <small className="text-muted d-block mt-1">
                            {order.items
                              ?.slice(0, 1)
                              .map((item) => item.itemName || item.name)
                              .join(", ")}
                            {itemsCount > 1 && ` +${itemsCount - 1}`}
                          </small>
                        )}
                      </div>
                    </td>

                    {showBidirectionalColumns && (
                      <td className="source-cell">
                        <SourceBadge order={order} />
                      </td>
                    )}

                    <td className="amount-cell text-end">
                      <div className="amount-info">
                        <strong
                          className={`order-amount ${
                            isCancelled
                              ? "text-muted text-decoration-line-through"
                              : "text-success"
                          }`}
                        >
                          ₹{amount.toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </td>

                    <td className="status-cell">
                      <StatusBadge status={order.status} />
                    </td>

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
          </Table>

          {filteredOrders.length === 0 && salesOrders.length > 0 && (
            <div className="text-center py-5">
              <FontAwesomeIcon
                icon={faSearch}
                size="3x"
                className="text-muted mb-3"
              />
              <h5 className="text-muted mb-3">No Orders Found</h5>
              <p className="text-muted mb-4">
                No sales orders match your current filters. Try adjusting your
                search terms or filters.
              </p>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => {
                  setLocalSearchTerm("");
                  setLocalFilterStatus("all");
                  setActiveOrderType("all");
                  if (onSearchChange) onSearchChange("");
                  if (onFilterChange) onFilterChange("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
          {/* ✅ Table footer with summary */}
          {filteredOrders.length > 0 && (
            <div className="table-footer-summary">
              <Container fluid className="px-3 py-2">
                <Row className="align-items-center">
                  <Col>
                    <small className="text-muted">
                      Showing {filteredOrders.length} of {salesOrders.length}{" "}
                      orders
                      {activeOrderType !== "all" && (
                        <span className="ms-2">
                          (
                          {activeOrderType === "self"
                            ? "Self Created"
                            : activeOrderType === "fromPO"
                            ? "From Purchase Orders"
                            : "Auto-Generated"}
                          )
                        </span>
                      )}
                    </small>
                  </Col>
                  <Col xs="auto">
                    <div className="summary-stats d-flex gap-3">
                      <small className="text-muted">
                        <strong>Total Value:</strong> ₹
                        {filteredOrders
                          .reduce((sum, order) => {
                            const amount = parseFloat(
                              order.amount ||
                                order.total ||
                                order.totals?.finalTotal ||
                                0
                            );
                            return sum + amount;
                          }, 0)
                          .toLocaleString("en-IN")}
                      </small>
                      <small className="text-muted">
                        <strong>Active:</strong> {separatedOrders.active.length}
                      </small>
                      {separatedOrders.cancelled.length > 0 && (
                        <small className="text-muted">
                          <strong>Cancelled:</strong>{" "}
                          {separatedOrders.cancelled.length}
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
          documentType={isInQuotationsMode ? "quotation" : "sales-order"} // ✅ Dynamic document type
          onEdit={(order) => {
            setViewModalShow(false);
            handleAction("edit", order);
          }}
          onPrint={(order) => handleAction("print", order)}
          onDownload={(order) => handleAction("download", order)}
          onShare={(order) => handleAction("share", order)}
          onConvert={(order) => {
            setViewModalShow(false);
            handleAction("convert", order);
          }}
          // ✅ For sales orders/quotations, this should generate Purchase Orders
          onGenerateSalesOrder={(order) => {
            setViewModalShow(false);
            handleAction("generatePurchaseOrder", order);
          }}
        />
      )}
      {/* ✅ Generate Purchase Order Modal */}
      {selectedOrderForPOGeneration && (
        <GeneratePurchaseOrderModal
          show={showGeneratePOModal}
          onHide={() => {
            setShowGeneratePOModal(false);
            setSelectedOrderForPOGeneration(null);
            setPOGenerationError(null);
          }}
          order={selectedOrderForPOGeneration}
        />
      )}

      <style jsx>{`
        /* ✅ FIXED: Tighter column sizing - reduced spacing */
        .date-column {
          width: 110px;
          min-width: 110px;
        }
        .order-number-column {
          width: 160px;
          min-width: 160px;
        }
        .customer-column {
          width: 220px;
          min-width: 220px;
        }
        .items-column {
          width: 120px;
          min-width: 120px;
        }
        .source-column {
          width: 140px;
          min-width: 140px;
        }
        .amount-column {
          width: 130px;
          min-width: 130px;
        }
        .status-column {
          width: 120px;
          min-width: 120px;
        }
        .actions-column {
          width: 50px;
          min-width: 50px;
        }

        /* ✅ FIXED: Reduce table cell padding */
        .sales-orders-table td {
          padding: 8px 6px !important; /* Reduced from 12px 10px */
          vertical-align: middle;
          border-bottom: 1px solid #f8f9fa;
          margin: 0;
          position: relative;
        }

        .sales-orders-table th {
          padding: 12px 8px !important; /* Reduced from 15px 12px */
        }

        /* ✅ FIXED: Reduce table minimum width */
        .sales-orders-table {
          margin: 0;
          font-size: 0.85rem;
          width: 100%;
          table-layout: fixed;
          min-width: 950px; /* Reduced from 800px */
          position: relative;
          z-index: 1;
          overflow: visible !important;
          border-radius: 0 !important;
        }

        /* ✅ FIXED: Status badges - remove curves */
        .status-badge-compact {
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          padding: 0.3em 0.6em !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          line-height: 1.2 !important;
          margin: 0 !important;
          border: none !important;
        }

        /* ✅ Remove curves from all badges */
        .badge {
          border: none !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ SPECIFIC: Status badge colors without curves */
        .status-badge-compact.bg-primary {
          background: #0d6efd !important;
          color: white !important;
          border-radius: 0 !important;
        }

        .status-badge-compact.bg-secondary {
          background: #6c757d !important;
          color: white !important;
          border-radius: 0 !important;
        }

        .status-badge-compact.bg-success {
          background: #198754 !important;
          color: white !important;
          border-radius: 0 !important;
        }

        .status-badge-compact.bg-warning {
          background: #ffc107 !important;
          color: #000 !important;
          border-radius: 0 !important;
        }

        .status-badge-compact.bg-danger {
          background: #dc3545 !important;
          color: white !important;
          border-radius: 0 !important;
        }

        .status-badge-compact.bg-info {
          background: #0dcaf0 !important;
          color: #000 !important;
          border-radius: 0 !important;
        }

        .status-badge-compact.bg-light {
          background: #f8f9fa !important;
          color: #000 !important;
          border-radius: 0 !important;
        }

        .status-badge-compact.bg-dark {
          background: #212529 !important;
          color: white !important;
          border-radius: 0 !important;
        }

        /* ✅ REDESIGNED: Container with NO curves */
        .sales-orders-container-redesigned {
          position: relative;
          background: white;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05),
            0 10px 15px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: visible !important;
          margin-top: 0;
        }

        .table-container-modern {
          position: relative;
          overflow-x: auto;
          overflow-y: visible !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          scrollbar-width: thin;
          scrollbar-color: rgba(111, 66, 193, 0.3) transparent;
        }

        .modern-sales-table {
          margin: 0;
          position: relative;
          z-index: 1;
          overflow: visible !important;
          font-size: 0.85rem;
          width: 100%;
          table-layout: fixed;
          min-width: 800px;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ Action button - remove curves */
        .action-trigger-btn {
          border: 1px solid rgba(111, 66, 193, 0.3) !important;
          background: linear-gradient(
            135deg,
            rgba(111, 66, 193, 0.08) 0%,
            rgba(139, 92, 246, 0.08) 100%
          ) !important;
          color: #6f42c1 !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          padding: 6px 10px !important;
          transition: all 0.3s ease !important;
          font-size: 0.85rem !important;
          font-weight: 500 !important;
          box-shadow: 0 2px 6px rgba(111, 66, 193, 0.15) !important;
          min-width: 38px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-trigger-btn:hover,
        .action-trigger-btn:focus {
          background: linear-gradient(
            135deg,
            rgba(111, 66, 193, 0.18) 0%,
            rgba(139, 92, 246, 0.18) 100%
          ) !important;
          border-color: rgba(111, 66, 193, 0.5) !important;
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 4px 15px rgba(111, 66, 193, 0.3) !important;
          color: #5a2d91 !important;
        }

        /* ✅ Dropdown menu - remove curves */
        .custom-action-dropdown {
          position: absolute !important;
          z-index: 99999 !important;
        }

        .custom-action-dropdown .bg-white {
          background: #ffffff !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(111, 66, 193, 0.1),
            0 4px 15px rgba(111, 66, 193, 0.1) !important;
          animation: dropdownSlideIn 0.2s ease-out;
        }

        /* ✅ Dropdown buttons - remove curves */
        .custom-action-dropdown .btn {
          border: none !important;
          text-align: left !important;
          transition: all 0.2s ease !important;
          padding: 8px 12px !important;
          font-size: 0.875rem !important;
          font-weight: 500 !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          margin: 1px 0 !important;
          display: flex !important;
          align-items: center !important;
          color: #374151 !important;
          background: transparent !important;
        }

        .custom-action-dropdown .btn:hover {
          background: rgba(111, 66, 193, 0.1) !important;
          color: #6f42c1 !important;
          transform: translateX(2px);
          box-shadow: 0 2px 8px rgba(111, 66, 193, 0.15) !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .custom-action-dropdown .btn-outline-success {
          background: rgba(34, 197, 94, 0.1) !important;
          color: #16a34a !important;
          border: 1px solid rgba(34, 197, 94, 0.2) !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .custom-action-dropdown .btn-outline-success:hover {
          background: rgba(34, 197, 94, 0.2) !important;
          border-color: rgba(34, 197, 94, 0.4) !important;
          color: #15803d !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .custom-action-dropdown .btn-outline-danger {
          background: rgba(239, 68, 68, 0.1) !important;
          color: #dc2626 !important;
          border: 1px solid rgba(239, 68, 68, 0.2) !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .custom-action-dropdown .btn-outline-danger:hover {
          background: rgba(239, 68, 68, 0.2) !important;
          border-color: rgba(239, 68, 68, 0.4) !important;
          color: #b91c1c !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .custom-action-dropdown .btn-outline-warning {
          background: rgba(245, 158, 11, 0.1) !important;
          color: #d97706 !important;
          border: 1px solid rgba(245, 158, 11, 0.2) !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .custom-action-dropdown .btn-outline-warning:hover {
          background: rgba(245, 158, 11, 0.2) !important;
          border-color: rgba(245, 158, 11, 0.4) !important;
          color: #b45309 !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ Primary action (View Details) - remove curves */
        .custom-action-dropdown .btn:first-child {
          background: rgba(59, 130, 246, 0.1) !important;
          color: #2563eb !important;
          border: 1px solid rgba(59, 130, 246, 0.2) !important;
          margin-bottom: 3px !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .custom-action-dropdown .btn:first-child:hover {
          background: rgba(59, 130, 246, 0.2) !important;
          border-color: rgba(59, 130, 246, 0.4) !important;
          color: #1d4ed8 !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ TABLE CONTAINER - remove curves */
        .sales-orders-table-wrapper {
          background: white;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05),
            0 10px 15px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: visible !important;
          position: relative;
          margin-top: 0;
        }

        .table-responsive-wrapper-fixed {
          overflow-x: auto;
          overflow-y: visible !important;
          scrollbar-width: thin;
          scrollbar-color: rgba(111, 66, 193, 0.3) transparent;
          margin: 0;
          padding: 0;
          position: relative;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .sales-orders-table {
          margin: 0;
          font-size: 0.85rem;
          width: 100%;
          table-layout: fixed;
          min-width: 800px;
          position: relative;
          z-index: 1;
          overflow: visible !important;
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ HEADER STYLES - remove curves */
        .sales-orders-filter-section {
          background: linear-gradient(135deg, #f8f9ff 0%, #f3f4f6 100%);
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          padding: 15px;
          border: 1px solid #e5e7eb;
          margin-bottom: 15px;
          margin-top: 0;
        }

        .table-footer-summary {
          background: linear-gradient(135deg, #f8f9ff 0%, #f3f4f6 100%);
          border-top: 1px solid rgba(111, 66, 193, 0.1);
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          margin: 0;
          padding: 12px 0;
        }

        /* ✅ ORDER TYPE FILTER - remove curves */
        .order-type-filter .btn {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
          font-size: 0.85rem !important;
          padding: 6px 12px !important;
          transition: all 0.2s ease !important;
        }

        /* ✅ REMOVE curves from all form elements */
        .form-control,
        .form-select,
        .btn,
        .input-group-text {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from modal elements */
        .modal-content {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .modal-header {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .modal-footer {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from alerts */
        .alert {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from cards */
        .card {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .card-header {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .card-body {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .card-footer {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from tables */
        .table {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from input groups */
        .input-group {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .input-group .form-control:first-child {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .input-group .form-control:last-child {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from button groups */
        .btn-group .btn:first-child {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .btn-group .btn:last-child {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .btn-group .btn {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from dropdowns */
        .dropdown-menu {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .dropdown-item {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from tabs */
        .nav-tabs {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .nav-tabs .nav-link {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .tab-content {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .tab-pane {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from progress bars */
        .progress {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .progress-bar {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from list groups */
        .list-group {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .list-group-item {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .list-group-item:first-child {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .list-group-item:last-child {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ REMOVE curves from pagination */
        .pagination {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        .page-link {
          border-radius: 0 !important; /* ✅ REMOVED: All curves */
        }

        /* ✅ GLOBAL: Remove curves from ALL elements */
        * {
          border-radius: 0 !important; /* ✅ REMOVED: All curves globally */
        }

        /* Keep all other existing styles intact... */
        .sales-orders-table tbody tr {
          position: relative;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .sales-orders-table tbody tr:hover {
          background: linear-gradient(135deg, #f8f9ff 0%, #f3f4f6 100%);
          box-shadow: 0 2px 8px rgba(111, 66, 193, 0.1);
          transform: translateY(-1px);
          border-left: 3px solid #6f42c1;
          z-index: 5;
        }

        .sales-order-row {
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
          position: relative;
        }

        .sales-order-row:hover {
          background: linear-gradient(135deg, #f8f9ff 0%, #f3f4f6 100%);
          box-shadow: 0 2px 8px rgba(111, 66, 193, 0.1);
          transform: translateY(-1px);
          border-left: 3px solid #6f42c1;
          z-index: 5;
        }

        .cancelled-order-row {
          opacity: 0.6;
          background-color: #f8f9fa;
        }

        .cancelled-order-row:hover {
          background-color: #e9ecef !important;
          border-left: 3px solid #6c757d;
        }

        .text-purple {
          color: #6f42c1 !important;
        }

        .table-header-purple {
          background: linear-gradient(
            135deg,
            #6f42c1 0%,
            #8b5cf6 50%,
            #a855f7 100%
          );
          position: sticky;
          top: 0;
          z-index: 100;
          margin: 0;
        }

        .table-header-purple th {
          background: transparent !important;
          border: none;
          border-bottom: 3px solid rgba(255, 255, 255, 0.2);
          font-weight: 700;
          padding: 15px 12px;
          font-size: 0.85rem;
          color: #ffffff !important;
          white-space: nowrap;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin: 0;
        }

        .sales-orders-table td {
          padding: 12px 10px;
          vertical-align: middle;
          border-bottom: 1px solid #f8f9fa;
          margin: 0;
          position: relative;
        }

        .actions-cell-modern {
          padding: 8px 6px !important;
          vertical-align: middle !important;
          text-align: center !important;
          position: relative !important;
          z-index: 10 !important;
          width: 55px !important;
          min-width: 55px !important;
          overflow: visible !important;
        }

        .actions-column {
          width: 55px !important;
          min-width: 55px !important;
          text-align: center !important;
          overflow: visible !important;
        }

        @keyframes dropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-5px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .action-trigger-btn:active {
          transform: translateY(0) scale(0.95);
        }

        .action-trigger-btn:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }

        .custom-action-dropdown hr {
          border-color: rgba(107, 114, 128, 0.2) !important;
          margin: 6px 0 !important;
          opacity: 1 !important;
        }

        .date-cell .date-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .order-number-cell .order-number-link {
          text-decoration: none;
          font-weight: 600;
          color: #6f42c1;
        }

        .order-number-cell .order-number-link:hover {
          color: #5a2d91;
          text-decoration: underline;
        }

        .customer-cell .customer-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .customer-cell .customer-name {
          font-size: 0.9rem;
          line-height: 1.2;
        }

        .customer-cell .customer-contact {
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .items-cell .items-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }

        .amount-cell .amount-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .status-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }

        .order-type-filter .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
        }

        .summary-stats {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .summary-stats small {
          font-size: 0.8rem !important;
        }

        .sales-order-row.loading {
          pointer-events: none;
          opacity: 0.7;
          background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e0e0e0 50%,
            #f0f0f0 75%
          );
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @media (max-width: 768px) {
          .custom-action-dropdown {
            min-width: 180px !important;
            max-width: 220px !important;
          }

          .custom-action-dropdown .btn {
            padding: 6px 10px !important;
            font-size: 0.8rem !important;
          }

          .action-trigger-btn {
            padding: 4px 8px !important;
            font-size: 0.75rem !important;
            min-width: 32px !important;
            height: 28px !important;
          }

          .actions-cell-modern {
            width: 45px !important;
            min-width: 45px !important;
            padding: 6px 4px !important;
          }

          .sales-orders-table {
            min-width: 600px;
          }
        }

        .sales-order-row:focus {
          outline: 2px solid #6f42c1;
          outline-offset: 2px;
        }

        .sort-icon:hover {
          color: rgba(255, 255, 255, 0.8) !important;
          transform: scale(1.1);
          transition: all 0.2s ease;
        }

        @media print {
          .sales-orders-filter-section,
          .actions-column,
          .actions-cell-modern {
            display: none !important;
          }

          .sales-orders-table-wrapper {
            box-shadow: none;
            border: 1px solid #000;
          }

          .table-header-purple {
            background: #000 !important;
            color: #fff !important;
          }
        }
      `}</style>
    </>
  );
}

export default SalesOrderTable;
