import React, {useState, useCallback, useMemo} from "react";
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
import saleOrderService from "../../../../services/saleOrderService"; // ✅ ADD: Import with alias
import partyService from "../../../../services/partyService";
// ✅ CONSTANTS
const DOCUMENT_LABELS = {
  documentName: "Sales Order",
  documentNamePlural: "Sales Orders",
  listPath: "sales-orders",
  editPath: "sales-orders",
  createPath: "sales-orders/new",
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
  salesOrders = [],
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
  isLoading = false,
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
  saleOrderService: propSaleOrderService, // ✅ ALREADY CORRECT: Accept service as prop
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ ADD THIS: Service resolution with fallback
  const resolvedSaleOrderService = propSaleOrderService || saleOrderService;

  // ✅ ADD: Enhanced quotations mode detection
  const isInQuotationsMode =
    isQuotationsMode ||
    documentType === "quotation" ||
    location.pathname.includes("/quotations") ||
    salesOrders.some(
      (order) =>
        order.orderType === "quotation" ||
        order.documentType === "quotation" ||
        order.quotationNumber
    );

  console.log("🔍 SalesOrderTable Mode Detection:", {
    isQuotationsMode,
    documentType,
    isInQuotationsMode,
    pathname: location.pathname,
    hasQuotations: salesOrders.some(
      (order) =>
        order.orderType === "quotation" || order.documentType === "quotation"
    ),
  });

  // ✅ VALIDATION: Ensure services are available - UPDATE THIS
  if (!resolvedSaleOrderService) {
    return (
      <Alert variant="danger">
        <h6>Service Error</h6>
        <p>
          Sales order service is not available. Please check your configuration.
        </p>
      </Alert>
    );
  }
  if (!companyId) {
    return (
      <Alert variant="warning">
        <h6>Configuration Error</h6>
        <p>Company ID is required for sales order operations.</p>
      </Alert>
    );
  }

  // ✅ STATE MANAGEMENT
  const [viewModalShow, setViewModalShow] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [activeOrderType, setActiveOrderType] = useState("all");
  const [deletingOrders, setDeletingOrders] = useState(new Set());
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);

  // ✅ Purchase Order Generation Modal States
  const [showGeneratePOModal, setShowGeneratePOModal] = useState(false);
  const [selectedOrderForPOGeneration, setSelectedOrderForPOGeneration] =
    useState(null);
  const [poGenerationLoading, setPOGenerationLoading] = useState(false);
  const [poGenerationError, setPOGenerationError] = useState(null);

  const [localFilterStatus, setLocalFilterStatus] = useState(
    filterStatus === "all" ? "" : filterStatus || ""
  );
  const [showCancelledOrders, setShowCancelledOrders] = useState(false);

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

  // ✅ ORDER SOURCE DETECTION
  const getOrderSource = useCallback((order) => {
    const hasActualSourceOrderData = Boolean(
      (order.sourceOrderId || order.sourceOrderNumber) &&
        (order.sourceOrderType === "purchase_order" ||
          order.sourceOrderType === "purchase-order" ||
          order.sourceOrderType === "purchaseOrder" ||
          order.sourceOrderType === "PO")
    );

    const isExplicitlyFromPurchaseOrder = Boolean(
      order.isAutoGenerated === true &&
        (order.generatedFrom === "purchase_order" ||
          order.generatedFrom === "purchase-order" ||
          order.generatedFrom === "purchaseOrder")
    );

    const isFromPurchaseOrder =
      hasActualSourceOrderData || isExplicitlyFromPurchaseOrder;

    if (isFromPurchaseOrder) {
      const sourceInfo =
        order.sourceOrderNumber || order.sourceOrderId || "Purchase Order";
      return {
        type: "fromPO",
        label: "From Purchase Order",
        icon: faArrowRight,
        color: "info",
        description: `Generated from: ${sourceInfo}`,
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

  // ✅ ORDER CATEGORIZATION
  const categorizeOrders = useMemo(() => {
    const all = salesOrders;
    const selfCreated = [];
    const fromPurchaseOrders = [];
    const autoGenerated = [];

    salesOrders.forEach((order) => {
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
  }, [salesOrders, getOrderSource]);

  // ✅ UTILITY FUNCTIONS
  const getDocumentType = () => "sales-order";

  // ✅ MODAL HANDLER FOR PURCHASE ORDER GENERATION
  const handleModalGeneratePurchaseOrder = useCallback((order) => {
    setViewModalShow(false);
    setSelectedOrderForPOGeneration(order);
    setShowGeneratePOModal(true);
    setPOGenerationError(null);
  }, []);

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
                navigate(
                  `/companies/${targetCompanyIdFromResponse}/purchase-orders/${poId}`,
                  {
                    state: {
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
                    },
                  }
                );
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
              {isQuotationsMode ? "Quotation" : "Sales Order"} Details
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
                  isQuotationsMode ? "Quotation" : "Sales Order"
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
                {isQuotationsMode ? "quotation" : "sales order"}
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

      const customerData =
        order.customer && typeof order.customer === "object"
          ? {
              id: order.customer._id || order.customer.id,
              _id: order.customer._id || order.customer.id,
              name: order.customer.name || order.customer.customerName || "",
              mobile: order.customer.mobile || order.customer.phone || "",
              email: order.customer.email || "",
              address: order.customer.address || "",
              gstNumber: order.customer.gstNumber || "",
            }
          : {
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
        documentType: "sales-order",
        orderNumber:
          order.orderNumber ||
          order.salesOrderNumber ||
          order.orderNo ||
          order.billNumber,
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
        isAutoGenerated: Boolean(order.isAutoGenerated),
        sourceOrderType: order.sourceOrderType || null,
        sourceOrderId: order.sourceOrderId || null,
        sourceOrderNumber: order.sourceOrderNumber || null,
        sourceCompanyId: order.sourceCompanyId || null,
        hasCorrespondingPurchaseOrder: Boolean(
          order.hasCorrespondingPurchaseOrder
        ),
        correspondingPurchaseOrderId:
          order.correspondingPurchaseOrderId || null,
        hasGeneratedPurchaseOrder: Boolean(order.hasGeneratedPurchaseOrder),
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

          case "edit":
            if (
              targetOrder.status === "cancelled" ||
              targetOrder.status === "deleted"
            ) {
              addToast?.("Cannot edit cancelled sales order", "warning");
              return;
            }
            const editTransformed = transformOrderForEdit(targetOrder);
            const editPath = `/companies/${companyId}/${DOCUMENT_LABELS.editPath}/${orderId}/edit`;
            navigate(editPath, {
              state: {
                salesOrder: editTransformed,
                order: editTransformed,
                transaction: editTransformed,
                documentType: "sales-order",
                mode: "sales-orders",
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

  // ✅ FIXED: Better filtering logic with proper default handling
  const getFilteredOrders = () => {
    let orders = [];

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

    // ✅ FIXED: Apply search filter only if search term exists
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

    // ✅ FIXED: Apply status filter only if not "all" or empty
    if (
      localFilterStatus &&
      localFilterStatus !== "all" &&
      localFilterStatus !== ""
    ) {
      orders = orders.filter((order) => order.status === localFilterStatus);
    }

    // ✅ Apply sorting
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

  const filteredOrders = getFilteredOrders();

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

  const StatusBadge = ({status, priority}) => {
    const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.default;

    return (
      <div className="d-flex flex-column align-items-start gap-1">
        <Badge bg={statusInfo.variant} className="d-flex align-items-center">
          <FontAwesomeIcon icon={statusInfo.icon} className="me-1" />
          {statusInfo.text}
        </Badge>
        {priority && priority !== "normal" && (
          <Badge
            bg={
              priority === "high"
                ? "danger"
                : priority === "urgent"
                ? "warning"
                : "info"
            }
            className="small"
          >
            {priority.toUpperCase()}
          </Badge>
        )}
      </div>
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

  const GeneratedOrdersBadge = ({order}) => {
    const hasGeneratedPO =
      order.autoGeneratedPurchaseOrder === true ||
      order.purchaseOrderRef ||
      order.hasGeneratedPurchaseOrder;

    const hasCorrespondingPO =
      order.correspondingPurchaseOrderId || order.hasCorrespondingPurchaseOrder;

    if (!hasGeneratedPO && !hasCorrespondingPO) {
      return <small className="text-muted">None</small>;
    }

    return (
      <div className="generated-orders-info">
        {hasCorrespondingPO && (
          <Badge bg="success" className="me-1 mb-1">
            <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
            Linked PO
          </Badge>
        )}
        {hasGeneratedPO && (
          <Badge bg="primary" className="me-1 mb-1">
            <FontAwesomeIcon icon={faArrowRight} className="me-1" />
            Generated PO
          </Badge>
        )}
        {order.purchaseOrderNumber && (
          <small className="text-muted d-block">
            {order.purchaseOrderNumber}
          </small>
        )}
      </div>
    );
  };
  const ActionButton = ({order}) => {
    const orderId = order._id || order.id;
    const isDeleting = deletingOrders.has(orderId);
    const isCancelled =
      order.status === "cancelled" || order.status === "deleted";
    const status = order.status || "draft";

    return (
      <Dropdown>
        <Dropdown.Toggle
          variant="outline-secondary"
          size="sm"
          className={`border-0 ${isCancelled ? "opacity-50" : ""}`}
          disabled={isDeleting || modalLoading}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </Dropdown.Toggle>

        <Dropdown.Menu align="end">
          <Dropdown.Item onClick={() => handleViewOrder(order)}>
            <FontAwesomeIcon icon={faEye} className="me-2" />
            View Details
          </Dropdown.Item>

          {enableActions && !isCancelled && (
            <>
              <Dropdown.Item onClick={() => handleEditOrder(order)}>
                <FontAwesomeIcon icon={faEdit} className="me-2" />
                Edit Order
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleDuplicateOrder(order)}>
                <FontAwesomeIcon icon={faCopy} className="me-2" />
                Duplicate
              </Dropdown.Item>
              <Dropdown.Divider />
            </>
          )}

          <Dropdown.Item onClick={() => handlePrintOrder(order)}>
            <FontAwesomeIcon icon={faPrint} className="me-2" />
            Print
          </Dropdown.Item>
          <Dropdown.Item onClick={() => handleShareOrder(order)}>
            <FontAwesomeIcon icon={faShare} className="me-2" />
            Share
          </Dropdown.Item>
          <Dropdown.Item onClick={() => handleDownloadOrder(order)}>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Download
          </Dropdown.Item>

          {enableActions && !isCancelled && (
            <>
              <Dropdown.Divider />
              <Dropdown.Header>Order Actions</Dropdown.Header>

              {status === "draft" && (
                <Dropdown.Item onClick={() => handleConfirmOrder(order)}>
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                  Confirm Order
                </Dropdown.Item>
              )}
              {(status === "pending" || status === "confirmed") && (
                <Dropdown.Item onClick={() => handleApproveOrder(order)}>
                  <FontAwesomeIcon icon={faCheck} className="me-2" />
                  Approve Order
                </Dropdown.Item>
              )}
              {(status === "approved" || status === "confirmed") && (
                <Dropdown.Item onClick={() => handleShipOrder(order)}>
                  <FontAwesomeIcon icon={faTruck} className="me-2" />
                  Mark as Shipped
                </Dropdown.Item>
              )}
              {status === "shipped" && (
                <Dropdown.Item onClick={() => handleDeliverOrder(order)}>
                  <FontAwesomeIcon icon={faBoxes} className="me-2" />
                  Mark as Delivered
                </Dropdown.Item>
              )}
              {status === "delivered" && (
                <Dropdown.Item onClick={() => handleCompleteOrder(order)}>
                  <FontAwesomeIcon icon={faCheck} className="me-2" />
                  Complete Order
                </Dropdown.Item>
              )}
              <Dropdown.Item onClick={() => handleConvertOrder(order)}>
                <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                Convert to Invoice
              </Dropdown.Item>
              {status !== "completed" && (
                <Dropdown.Item
                  onClick={() => handleCancelOrder(order)}
                  className="text-warning"
                >
                  <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
                  Cancel Order
                </Dropdown.Item>
              )}

              <Dropdown.Divider />
              <Dropdown.Header>Bidirectional Actions</Dropdown.Header>

              {!order.hasCorrespondingPurchaseOrder &&
                !order.hasGeneratedPurchaseOrder && (
                  <Dropdown.Item
                    onClick={() => handleGeneratePurchaseOrder(order)}
                  >
                    <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                    Generate Purchase Order
                  </Dropdown.Item>
                )}
              {order.isAutoGenerated && order.sourceOrderNumber && (
                <Dropdown.Item onClick={() => handleViewSourceOrder(order)}>
                  <FontAwesomeIcon icon={faEye} className="me-2" />
                  View Source: {order.sourceOrderNumber}
                </Dropdown.Item>
              )}
              {(order.hasCorrespondingPurchaseOrder ||
                order.hasGeneratedPurchaseOrder) && (
                <Dropdown.Item onClick={() => handleViewGeneratedOrders(order)}>
                  <FontAwesomeIcon icon={faProjectDiagram} className="me-2" />
                  View Generated Orders
                </Dropdown.Item>
              )}
              <Dropdown.Item onClick={() => handleViewTrackingChain(order)}>
                <FontAwesomeIcon icon={faProjectDiagram} className="me-2" />
                View Tracking Chain
              </Dropdown.Item>

              <Dropdown.Divider />
              <Dropdown.Item
                onClick={() => handleDeleteOrder(order)}
                className="text-danger"
                disabled={isDeleting}
              >
                <FontAwesomeIcon
                  icon={isDeleting ? faSpinner : faTrash}
                  className={`me-2 ${isDeleting ? "fa-spin" : ""}`}
                />
                {isDeleting ? "Deleting..." : "Delete"}
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
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
        <div className="table-responsive-wrapper">
          <Table responsive hover className="mb-0 sales-orders-table">
            {/* ✅ Enhanced header with bidirectional columns */}
            <thead className="table-header-purple">
              <tr>
                {enableBulkActions && (
                  <th width="40" className="selection-column">
                    <Form.Check
                      type="checkbox"
                      checked={
                        selectedOrders.length === filteredOrders.length &&
                        filteredOrders.length > 0
                      }
                      onChange={(e) => {
                        if (onSelectionChange) {
                          onSelectionChange(
                            e.target.checked
                              ? filteredOrders.map((o) => o._id || o.id)
                              : []
                          );
                        }
                      }}
                      className="purple-checkbox"
                    />
                  </th>
                )}
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
                <th className="customer-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Customer
                  </div>
                </th>
                <th className="items-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faBoxes} className="me-2" />
                    Items
                  </div>
                </th>
                {/* ✅ Source column for bidirectional orders */}
                {showBidirectionalColumns && (
                  <th className="source-column">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faRobot} className="me-2" />
                      Source
                    </div>
                  </th>
                )}
                {/* ✅ Generated Orders column */}
                {showBidirectionalColumns && (
                  <th className="generated-orders-column">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                      Generated Orders
                    </div>
                  </th>
                )}
                <th className="delivery-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faTruck} className="me-2" />
                    Expected Delivery
                  </div>
                </th>
                <th className="amount-column text-end">
                  <div className="d-flex align-items-center justify-content-end">
                    <FontAwesomeIcon icon={faTags} className="me-2" />
                    Order Value
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
                <th className="priority-column">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-2"
                    />
                    Priority
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
                const isSelected = selectedOrders.includes(orderId);
                const isCancelled =
                  order.status === "cancelled" || order.status === "deleted";

                return (
                  <tr
                    key={orderId}
                    className={`
                        sales-order-row
                        ${isSelected ? "table-active-purple" : ""} 
                        ${isCancelled ? "cancelled-order-row" : ""}
                        ${index % 2 === 0 ? "even-row" : "odd-row"}
                      `}
                    onClick={() => handleViewOrder(order)}
                    style={{cursor: "pointer"}}
                  >
                    {enableBulkActions && (
                      <td
                        className="selection-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Form.Check
                          type="checkbox"
                          checked={isSelected}
                          disabled={isCancelled}
                          onChange={(e) => {
                            if (onSelectionChange && !isCancelled) {
                              const newSelection = e.target.checked
                                ? [...selectedOrders, orderId]
                                : selectedOrders.filter((id) => id !== orderId);
                              onSelectionChange(newSelection);
                            }
                          }}
                          className="row-checkbox"
                        />
                      </td>
                    )}

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
                        {isCancelled && (
                          <div className="cancellation-indicator">
                            <small className="text-muted fst-italic">
                              <FontAwesomeIcon
                                icon={faTrash}
                                className="me-1"
                              />
                              Cancelled
                            </small>
                          </div>
                        )}
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
                            "Unknown Customer"}
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
                        {order.customerEmail && (
                          <small className="customer-email text-muted d-block">
                            {order.customerEmail}
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
                          {itemsCount} item{itemsCount !== 1 ? "s" : ""}
                        </Badge>
                        {itemsCount > 0 && (
                          <small className="text-muted d-block mt-1">
                            {order.items
                              ?.slice(0, 2)
                              .map((item) => item.itemName || item.name)
                              .join(", ")}
                            {itemsCount > 2 && ` +${itemsCount - 2} more`}
                          </small>
                        )}
                      </div>
                    </td>

                    {/* ✅ Source Information */}
                    {showBidirectionalColumns && (
                      <td className="source-cell">
                        <SourceBadge order={order} />
                      </td>
                    )}

                    {/* ✅ Generated Orders */}
                    {showBidirectionalColumns && (
                      <td className="generated-orders-cell">
                        <GeneratedOrdersBadge order={order} />
                      </td>
                    )}

                    <td className="delivery-cell">
                      <div className="delivery-info">
                        {order.expectedDeliveryDate || order.deliveryDate ? (
                          <>
                            <small
                              className={`delivery-date ${
                                isCancelled ? "text-muted" : ""
                              }`}
                            >
                              {new Date(
                                order.expectedDeliveryDate || order.deliveryDate
                              ).toLocaleDateString("en-GB")}
                            </small>
                            {/* Calculate days until delivery */}
                            {(() => {
                              const deliveryDate = new Date(
                                order.expectedDeliveryDate || order.deliveryDate
                              );
                              const today = new Date();
                              const diffTime = deliveryDate - today;
                              const diffDays = Math.ceil(
                                diffTime / (1000 * 60 * 60 * 24)
                              );

                              if (diffDays < 0) {
                                return (
                                  <small className="text-danger d-block">
                                    {Math.abs(diffDays)} days overdue
                                  </small>
                                );
                              } else if (diffDays <= 3) {
                                return (
                                  <small className="text-warning d-block">
                                    {diffDays} days remaining
                                  </small>
                                );
                              } else {
                                return (
                                  <small className="text-muted d-block">
                                    {diffDays} days remaining
                                  </small>
                                );
                              }
                            })()}
                          </>
                        ) : (
                          <small className="text-muted">Not set</small>
                        )}
                      </div>
                    </td>

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
                        {amount > 100000 && (
                          <small className="text-muted d-block">
                            ₹{(amount / 100000).toFixed(1)}L
                          </small>
                        )}
                      </div>
                    </td>

                    <td className="status-cell">
                      <StatusBadge
                        status={order.status}
                        priority={order.priority}
                      />
                    </td>

                    <td className="priority-cell">
                      <div className="priority-info">
                        <Badge
                          bg={
                            isCancelled
                              ? "secondary"
                              : order.priority === "high"
                              ? "danger"
                              : order.priority === "urgent"
                              ? "warning"
                              : order.priority === "low"
                              ? "info"
                              : "success"
                          }
                          className={`priority-badge text-capitalize ${
                            isCancelled ? "opacity-50" : ""
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={
                              order.priority === "high"
                                ? faExclamationTriangle
                                : order.priority === "urgent"
                                ? faClock
                                : order.priority === "low"
                                ? faCheckCircle
                                : faUser
                            }
                            className="me-1"
                          />
                          {order.priority || "Normal"}
                        </Badge>
                      </div>
                    </td>

                    {enableActions && (
                      <td
                        className="actions-cell text-center"
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

          {/* ✅ Empty state for filtered results */}
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

      {/* ✅ View Modal */}
      {selectedOrder && (
        <SimpleViewModal
          show={viewModalShow}
          onHide={() => {
            setViewModalShow(false);
            setSelectedOrder(null);
            setModalError(null);
          }}
          order={selectedOrder}
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

      {/* ✅ DEBUG: Temporary debug panel (remove in production) */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "10px",
            borderRadius: "8px",
            fontSize: "12px",
            zIndex: 9999,
            maxWidth: "300px",
          }}
        >
          <div>
            <strong>Debug Info:</strong>
          </div>
          <div>Total: {salesOrders.length}</div>
          <div>Filtered: {filteredOrders.length}</div>
          <div>Active Filter: {activeOrderType}</div>
          <div>Search: "{localSearchTerm}"</div>
          <div>
            Categories: All={categorizeOrders.all.length}, Self=
            {categorizeOrders.selfCreated.length}, Auto=
            {categorizeOrders.autoGenerated.length}
          </div>
        </div>
      )}

      {/* ✅ Enhanced CSS Styling */}
      <style jsx>{`
        /* ==================== MAIN CONTAINER ==================== */
        .sales-orders-filter-section {
          background: linear-gradient(135deg, #f8f9ff 0%, #f3f4f6 100%);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          margin-bottom: 20px;
        }

        .text-purple {
          color: #6f42c1 !important;
        }

        .order-type-filter .btn {
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .order-type-filter .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(111, 66, 193, 0.2);
        }

        .order-type-filter .btn.btn-outline-primary:hover {
          background: linear-gradient(135deg, #6f42c1 0%, #8b5cf6 100%);
          border-color: #6f42c1;
        }

        .order-type-filter .btn.btn-outline-success:hover {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          border-color: #059669;
        }

        .order-type-filter .btn.btn-outline-warning:hover {
          background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
          border-color: #d97706;
        }

        .order-type-filter .btn.btn-outline-info:hover {
          background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
          border-color: #0891b2;
        }

        /* ==================== TABLE WRAPPER ==================== */
        .sales-orders-table-wrapper {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05),
            0 10px 15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(111, 66, 193, 0.1);
          border: 1px solid #e5e7eb;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .table-responsive-wrapper {
          overflow-x: auto;
          overflow-y: visible;
          position: relative;
          scrollbar-width: thin;
          scrollbar-color: rgba(111, 66, 193, 0.3) transparent;
        }

        .table-responsive-wrapper::-webkit-scrollbar {
          height: 8px;
        }

        .table-responsive-wrapper::-webkit-scrollbar-track {
          background: linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 4px;
        }

        .table-responsive-wrapper::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #6f42c1 0%, #8b5cf6 100%);
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .table-responsive-wrapper::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #5a2d91 0%, #7c3aed 100%);
        }

        /* ==================== TABLE HEADER ==================== */
        .table-header-purple {
          background: linear-gradient(
            135deg,
            #6f42c1 0%,
            #8b5cf6 25%,
            #a855f7 50%,
            #c084fc 75%,
            #ddd6fe 100%
          );
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .table-header-purple th {
          background: transparent !important;
          border: none;
          border-bottom: 3px solid rgba(255, 255, 255, 0.2);
          font-weight: 700;
          padding: 18px 16px;
          font-size: 0.9rem;
          color: #ffffff !important;
          white-space: nowrap;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          position: relative;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .table-header-purple th::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 50%,
            rgba(255, 255, 255, 0.05) 100%
          );
          pointer-events: none;
        }

        .table-header-purple th:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          transform: translateY(-1px);
          transition: all 0.3s ease;
        }

        .sort-icon {
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .sort-icon:hover {
          color: rgba(255, 255, 255, 1) !important;
          transform: scale(1.2);
        }

        /* ==================== COLUMN SIZING ==================== */
        .selection-column {
          width: 50px;
          min-width: 50px;
        }
        .date-column {
          width: 120px;
          min-width: 120px;
        }
        .order-number-column {
          width: 180px;
          min-width: 180px;
        }
        .customer-column {
          width: 200px;
          min-width: 200px;
        }
        .items-column {
          width: 150px;
          min-width: 150px;
        }
        .source-column {
          width: 140px;
          min-width: 140px;
        }
        .generated-orders-column {
          width: 160px;
          min-width: 160px;
        }
        .delivery-column {
          width: 140px;
          min-width: 140px;
        }
        .amount-column {
          width: 120px;
          min-width: 120px;
        }
        .status-column {
          width: 120px;
          min-width: 120px;
        }
        .priority-column {
          width: 100px;
          min-width: 100px;
        }
        .actions-column {
          width: 80px;
          min-width: 80px;
        }

        /* ==================== TABLE BODY ==================== */
        .sales-orders-table {
          margin-bottom: 0;
          font-size: 0.9rem;
          width: 100%;
          table-layout: fixed;
          min-width: 1400px;
        }

        .sales-orders-table tbody tr {
          transition: all 0.3s ease;
          border-bottom: 1px solid #f1f3f4;
          position: relative;
        }

        .sales-orders-table tbody tr:hover {
          background: linear-gradient(
            90deg,
            rgba(111, 66, 193, 0.08) 0%,
            rgba(139, 92, 246, 0.05) 50%,
            rgba(168, 85, 247, 0.03) 100%
          );
          transform: translateY(-2px) scale(1.001);
          box-shadow: 0 8px 25px rgba(111, 66, 193, 0.15),
            0 0 0 1px rgba(111, 66, 193, 0.1);
          border-left: 4px solid #6f42c1;
          cursor: pointer;
          z-index: 10;
        }

        .sales-order-row.even-row {
          background: rgba(248, 249, 255, 0.3);
        }

        .sales-order-row.odd-row {
          background: rgba(255, 255, 255, 0.5);
        }

        .table-active-purple {
          background: linear-gradient(
            90deg,
            rgba(111, 66, 193, 0.15) 0%,
            rgba(139, 92, 246, 0.1) 50%,
            rgba(168, 85, 247, 0.05) 100%
          ) !important;
          border-left: 4px solid #6f42c1 !important;
          box-shadow: inset 0 0 0 1px rgba(111, 66, 193, 0.2);
        }

        .cancelled-order-row {
          background: linear-gradient(
            90deg,
            rgba(108, 117, 125, 0.1) 0%,
            rgba(173, 181, 189, 0.05) 100%
          ) !important;
          border-left: 4px solid #6c757d !important;
          opacity: 0.7;
        }

        .cancelled-order-row:hover {
          opacity: 0.8;
          border-left: 4px solid #6c757d !important;
          background: linear-gradient(
            90deg,
            rgba(108, 117, 125, 0.15) 0%,
            rgba(173, 181, 189, 0.1) 100%
          ) !important;
        }

        /* ==================== TABLE CELLS ==================== */
        .sales-orders-table td {
          padding: 16px 12px;
          vertical-align: middle;
          border-bottom: 1px solid #f8f9fa;
          position: relative;
        }

        /* Date Cell */
        .date-cell .date-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .order-date {
          font-weight: 600;
          color: #374151;
        }

        .order-time {
          font-size: 0.75rem;
          color: #6b7280;
        }

        /* Order Number Cell */
        .order-number-cell .order-number-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .order-number-link {
          text-decoration: none;
          font-weight: 700;
          transition: all 0.3s ease;
        }

        .order-number-link:hover {
          color: #5a2d91 !important;
          text-decoration: underline;
        }

        .auto-generated-indicator {
          margin-top: 4px;
        }

        .cancellation-indicator {
          margin-top: 2px;
        }

        /* Customer Cell */
        .customer-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .customer-name {
          font-size: 0.9rem;
          line-height: 1.2;
        }

        .customer-contact,
        .customer-email {
          font-size: 0.75rem;
          line-height: 1.2;
        }

        /* Items Cell */
        .items-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .items-count {
          font-weight: 600;
        }

        /* Amount Cell */
        .amount-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .order-amount {
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.2;
        }

        /* Delivery Cell */
        .delivery-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .delivery-date {
          font-weight: 500;
          font-size: 0.85rem;
        }

        /* Priority Cell */
        .priority-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .priority-badge {
          font-weight: 600;
          font-size: 0.75rem;
          padding: 0.4em 0.8em;
          border-radius: 6px;
        }

        /* ==================== BADGES ==================== */
        .badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.4em 0.8em;
          border-radius: 6px;
          letter-spacing: 0.3px;
          transition: all 0.3s ease;
        }

        .badge:hover {
          transform: scale(1.05);
        }

        .badge.bg-secondary {
          background: linear-gradient(45deg, #6b7280, #4b5563) !important;
        }

        .badge.bg-warning {
          background: linear-gradient(45deg, #f59e0b, #d97706) !important;
        }

        .badge.bg-primary {
          background: linear-gradient(45deg, #6f42c1, #8b5cf6) !important;
        }

        .badge.bg-info {
          background: linear-gradient(45deg, #06b6d4, #0891b2) !important;
        }

        .badge.bg-success {
          background: linear-gradient(45deg, #10b981, #059669) !important;
        }

        .badge.bg-danger {
          background: linear-gradient(45deg, #ef4444, #dc2626) !important;
        }

        .badge.bg-dark {
          background: linear-gradient(45deg, #374151, #1f2937) !important;
        }

        /* ==================== ACTION DROPDOWN ==================== */
        .actions-cell {
          position: relative;
          z-index: 50;
        }

        .dropdown {
          position: static;
        }

        .dropdown-toggle {
          border: none !important;
          box-shadow: none !important;
          background: rgba(111, 66, 193, 0.1) !important;
          color: #6f42c1 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          transition: all 0.3s ease !important;
        }

        .dropdown-toggle:hover,
        .dropdown-toggle:focus {
          background: rgba(111, 66, 193, 0.2) !important;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3) !important;
        }

        .dropdown-menu {
          border: none !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(111, 66, 193, 0.1) !important;
          border-radius: 12px !important;
          padding: 8px !important;
          margin-top: 8px !important;
          min-width: 220px !important;
          z-index: 9999 !important;
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95) !important;
        }

        .dropdown-item {
          padding: 10px 16px !important;
          font-size: 0.875rem !important;
          border-radius: 8px !important;
          margin: 2px 0 !important;
          transition: all 0.3s ease !important;
          display: flex !important;
          align-items: center !important;
        }

        .dropdown-item:hover {
          background: linear-gradient(
            90deg,
            rgba(111, 66, 193, 0.1) 0%,
            rgba(139, 92, 246, 0.08) 100%
          ) !important;
          color: #6f42c1 !important;
          transform: translateX(4px);
          padding-left: 20px !important;
        }

        .dropdown-header {
          font-size: 0.75rem !important;
          color: #6f42c1 !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          background: linear-gradient(
            90deg,
            rgba(111, 66, 193, 0.1) 0%,
            rgba(139, 92, 246, 0.05) 100%
          ) !important;
          margin: 8px -8px 4px -8px !important;
          padding: 8px 16px !important;
          border-radius: 6px !important;
        }

        .dropdown-divider {
          border-color: rgba(111, 66, 193, 0.2) !important;
          margin: 8px 0 !important;
        }

        /* ==================== TABLE FOOTER ==================== */
        .table-footer-summary {
          background: linear-gradient(135deg, #f8f9ff 0%, #f3f4f6 100%);
          border-top: 1px solid rgba(111, 66, 193, 0.1);
          border-radius: 0 0 16px 16px;
        }

        .summary-stats {
          font-size: 0.85rem;
        }

        .summary-stats strong {
          color: #6f42c1;
        }

        /* ==================== CHECKBOXES ==================== */
        .purple-checkbox input[type="checkbox"],
        .row-checkbox input[type="checkbox"] {
          accent-color: #6f42c1;
          transform: scale(1.2);
          border-radius: 4px;
        }

        .purple-checkbox input[type="checkbox"]:checked,
        .row-checkbox input[type="checkbox"]:checked {
          background-color: #6f42c1;
          border-color: #6f42c1;
        }

        /* ==================== RESPONSIVE DESIGN ==================== */
        @media (max-width: 1400px) {
          .sales-orders-table {
            min-width: 1200px;
          }

          .sales-orders-table th,
          .sales-orders-table td {
            padding: 14px 10px;
            font-size: 0.85rem;
          }
        }

        @media (max-width: 1200px) {
          .sales-orders-table {
            min-width: 1000px;
          }

          .sales-orders-table th,
          .sales-orders-table td {
            padding: 12px 8px;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 992px) {
          .sales-orders-table {
            min-width: 900px;
          }

          .order-type-filter {
            flex-direction: column;
            gap: 8px;
          }

          .order-type-filter .btn {
            width: 100%;
          }
        }

        @media (max-width: 768px) {
          .sales-orders-filter-section {
            padding: 15px;
            margin: 0 -15px 15px -15px;
            border-radius: 0;
          }

          .sales-orders-table-wrapper {
            border-radius: 8px;
            margin: 0 -15px;
          }

          .sales-orders-table {
            min-width: 800px;
          }

          .sales-orders-table th,
          .sales-orders-table td {
            padding: 8px 6px;
            font-size: 0.75rem;
          }

          .table-header-purple th {
            padding: 12px 8px;
            font-size: 0.7rem;
          }
        }

        @media (max-width: 576px) {
          .sales-orders-table-wrapper {
            border-radius: 0;
            margin: 0 -15px;
          }

          .sales-orders-table {
            min-width: 700px;
          }

          .sales-orders-table th,
          .sales-orders-table td {
            padding: 6px 4px;
            font-size: 0.7rem;
          }
        }

        /* ==================== ANIMATIONS ==================== */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .sales-order-row {
          animation: fadeInUp 0.3s ease-out;
        }

        .dropdown-menu.show {
          animation: slideInRight 0.3s ease-out;
        }

        /* ==================== ACCESSIBILITY ==================== */
        .sales-orders-table tr:focus {
          outline: 2px solid #6f42c1;
          outline-offset: -2px;
        }

        .dropdown-toggle:focus {
          box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.25) !important;
        }

        /* ==================== PRINT STYLES ==================== */
        @media print {
          .sales-orders-table-wrapper {
            box-shadow: none;
            border: 1px solid #000;
          }

          .table-header-purple {
            background: #6f42c1 !important;
            -webkit-print-color-adjust: exact;
          }

          .actions-column,
          .actions-cell {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

export default SalesOrderTable;
