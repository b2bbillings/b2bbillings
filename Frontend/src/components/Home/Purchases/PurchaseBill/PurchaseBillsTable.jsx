import React, {useState, useCallback, useMemo, useEffect, useRef} from "react";
import {useReactToPrint} from "react-to-print";
import PurchaseInvoice from "../../../PrintComponents/PurchaseInvoice";

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
  faChartLine,
  faFileExcel,
  faPrint,
  faSort,
  faEllipsisVertical,
  faEye,
  faEdit,
  faTrash,
  faCopy,
  faShare,
  faShoppingCart,
  faTruck,
  faCheck,
  faClipboardList,
  faPaperPlane,
  faInbox,
  faDownload,
  faExchangeAlt,
  faFilter,
  faPlus,
  faSpinner,
  faChevronUp,
  faChevronDown,
  faUndo,
  faBan,
  faCheckCircle,
  faExclamationTriangle,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import purchaseOrderService from "../../../../services/purchaseOrderService";
import purchaseService from "../../../../services/purchaseService";
import UniversalViewModal from "../../../Common/UniversalViewModal";

const PortalDropdown = ({
  children,
  isOpen,
  onClose,
  triggerRef,
  className = "",
  style = {},
}) => {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({top: 0, left: 0});

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      setPosition({
        top: triggerRect.bottom + scrollTop + 4,
        left: triggerRect.right + scrollLeft - 200,
      });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className={`dropdown-menu show ${className}`}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 9999,
        minWidth: "200px",
        maxHeight: "300px",
        overflowY: "auto",
        borderRadius: 0,
        border: "1px solid #e9ecef",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        backgroundColor: "white",
        ...style,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

const DropdownItem = ({
  children,
  onClick,
  disabled = false,
  className = "",
  variant = "default",
}) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  const getVariantClass = () => {
    switch (variant) {
      case "danger":
        return "text-danger";
      case "warning":
        return "text-warning";
      case "success":
        return "text-success";
      case "info":
        return "text-info";
      case "primary":
        return "text-primary";
      default:
        return "";
    }
  };

  return (
    <button
      type="button"
      className={`dropdown-item py-2 px-3 border-0 bg-transparent w-100 text-start d-flex align-items-center ${
        disabled ? "disabled" : ""
      } ${getVariantClass()} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      style={{
        fontSize: "14px",
        transition: "all 0.2s ease",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.backgroundColor = "#f8f9ff";
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = "transparent";
      }}
    >
      {children}
    </button>
  );
};

const DropdownDivider = () => (
  <div className="dropdown-divider my-1" style={{margin: "4px 0"}} />
);

const DropdownHeader = ({children}) => (
  <div className="dropdown-header text-muted small fw-bold py-1 px-3">
    {children}
  </div>
);

const PurchaseSourceFilter = ({
  activeFilter,
  onFilterChange,
  purchaseCounts,
  isLoading,
}) => {
  const filterOptions = [
    {
      key: "all",
      label: "All Invoices",
      icon: faClipboardList,
      color: "primary",
      description: "All purchase invoices from any source",
    },
    {
      key: "self_generated",
      label: "Self Generated",
      icon: faExchangeAlt,
      color: "info",
      description: "Created by your company from your sales invoices",
    },
    {
      key: "from_suppliers",
      label: "From Suppliers",
      icon: faTruck,
      color: "success",
      description: "Created by suppliers (manual or from their sales)",
    },
  ];

  return (
    <div className="purchase-source-filter mb-3">
      <div className="d-flex flex-nowrap gap-2 align-items-center">
        {filterOptions.map((option) => {
          const count = purchaseCounts[option.key] || 0;
          const isActive = activeFilter === option.key;

          return (
            <button
              key={option.key}
              type="button"
              className={`btn ${
                isActive ? `btn-${option.color}` : `btn-outline-${option.color}`
              } btn-sm d-flex align-items-center position-relative flex-shrink-0`}
              onClick={() => onFilterChange(option.key)}
              disabled={isLoading}
              style={{
                borderRadius: 0,
                whiteSpace: "nowrap",
                minWidth: "fit-content",
              }}
              title={option.description}
            >
              <FontAwesomeIcon icon={option.icon} className="me-2" />
              <span className="d-none d-md-inline">{option.label}</span>
              <span className="d-md-none">
                {option.key === "all"
                  ? "All"
                  : option.key === "self_generated"
                  ? "Self"
                  : "Suppliers"}
              </span>
              <Badge
                bg={isActive ? "light" : option.color}
                text={isActive ? "dark" : "white"}
                className="ms-2"
                style={{
                  fontSize: "10px",
                  minWidth: "18px",
                }}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
};

function PurchaseBillsTable({
  purchases = [],
  onViewPurchase,
  onEditPurchase,
  onDeletePurchase,
  onPrintPurchase,
  onSharePurchase,
  onDownloadPurchase,
  onConvertPurchase,
  onMarkAsOrdered,
  onMarkAsReceived,
  onCompletePurchase,
  onDuplicatePurchase,
  isLoading = false,
  isPurchaseOrderView = false,
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
  selectedPurchases = [],
  onSelectionChange,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isPurchaseOrdersMode = useMemo(() => {
    return (
      isPurchaseOrderView ||
      location.pathname.includes("/purchase-orders") ||
      title?.toLowerCase().includes("order")
    );
  }, [isPurchaseOrderView, location.pathname, title]);

  const printRef = useRef();
  const [printData, setPrintData] = useState(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const [printModalShow, setPrintModalShow] = useState(false);
  const [selectedPurchaseForPrint, setSelectedPurchaseForPrint] =
    useState(null);
  const [bulkPrintMode, setBulkPrintMode] = useState(false);
  const [selectedPurchasesForBulkPrint, setSelectedPurchasesForBulkPrint] =
    useState([]);
  const [printTemplate, setPrintTemplate] = useState("standard");
  const [printFormat, setPrintFormat] = useState("a4");
  const printComponentRef = useRef();

  const [viewModalShow, setViewModalShow] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [deletingPurchases, setDeletingPurchases] = useState(new Set());
  const [showCancelledPurchases, setShowCancelledPurchases] = useState(false);

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);
  const [localFilterStatus, setLocalFilterStatus] = useState(filterStatus);

  const [sourceFilter, setSourceFilter] = useState("all");
  const [filteredPurchases, setFilteredPurchases] = useState(purchases);

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRefs = useRef({});

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Purchase-Invoice-${
      printData?.purchase?.billNumber || "DRAFT"
    }`,
    onBeforeGetContent: () => {
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setShowPrintPreview(false);
      setPrintData(null);
      setPrintLoading(false);
    },
    onPrintError: (error) => {
      addToast?.("Print failed. Please try again.", "error");
      setPrintLoading(false);
    },
    removeAfterPrint: true,
  });

  const transformPurchaseDataForPrint = useCallback(
    (purchase) => {
      const items = purchase.items || [];
      const subtotal = items.reduce(
        (sum, item) => sum + (item.amount || item.totalAmount || 0),
        0
      );
      const totalTax = items.reduce((sum, item) => {
        const cgst = parseFloat(item.cgstAmount || item.cgst || 0);
        const sgst = parseFloat(item.sgstAmount || item.sgst || 0);
        const igst = parseFloat(item.igst || 0);
        return sum + cgst + sgst + igst;
      }, 0);

      return {
        company: {
          name: currentCompany?.businessName || "Your Company",
          gstin: currentCompany?.gstin || "",
          address: currentCompany?.address || "",
          phone: currentCompany?.phoneNumber || "",
          email: currentCompany?.email || "",
          logo:
            currentCompany?.logo?.base64 &&
            currentCompany.logo.base64.trim() !== ""
              ? currentCompany.logo.base64
              : null,
        },
        supplier: {
          name:
            purchase.supplierName ||
            purchase.supplier?.name ||
            "Unknown Supplier",
          address: purchase.supplierAddress || purchase.supplier?.address || "",
          mobile: purchase.supplierMobile || purchase.supplier?.mobile || "",
          email: purchase.supplierEmail || purchase.supplier?.email || "",
          gstin:
            purchase.supplierGstNumber || purchase.supplier?.gstNumber || "",
        },
        purchase: {
          billNumber: purchase.purchaseNumber || purchase.billNumber || "N/A",
          billDate: purchase.purchaseDate || purchase.billDate || purchase.date,
          dueDate: purchase.dueDate || purchase.payment?.dueDate,
          status: purchase.status || "draft",
        },
        items: items.map((item, index) => ({
          name: item.itemName || item.productName || `Item ${index + 1}`,
          hsnCode: item.hsnCode || item.hsnNumber || "",
          quantity: item.quantity || item.qty || 1,
          unit: item.unit || "PCS",
          rate: item.pricePerUnit || item.rate || item.price || 0,
          taxRate: item.taxRate || item.gstRate || 0,
          amount: item.amount || item.totalAmount || 0,
        })),
        totals: {
          subtotal: subtotal,
          totalTax: totalTax,
          totalCGST: purchase.cgst || 0,
          totalSGST: purchase.sgst || 0,
          totalIGST: purchase.igst || 0,
          totalDiscount: purchase.discount || purchase.discountAmount || 0,
          roundOff: purchase.roundOff || 0,
          finalTotal:
            purchase.amount ||
            purchase.total ||
            purchase.totals?.finalTotal ||
            subtotal + totalTax,
        },
        payment: {
          method: purchase.paymentMethod || purchase.payment?.method || "cash",
          paidAmount: purchase.paidAmount || purchase.payment?.paidAmount || 0,
          pendingAmount:
            purchase.balance ||
            purchase.balanceAmount ||
            purchase.payment?.pendingAmount ||
            0,
          status:
            purchase.paymentStatus || purchase.payment?.status || "pending",
          terms: purchase.terms || purchase.termsAndConditions || "",
        },
      };
    },
    [currentCompany]
  );

  const fetchPurchaseForPrint = useCallback(
    async (purchase) => {
      try {
        setPrintLoading(true);

        const purchaseId = purchase._id || purchase.id;
        const isPurchaseOrder =
          isPurchaseOrdersMode ||
          purchase.documentType === "purchase-order" ||
          purchase.orderType === "purchase_order";

        let response;

        if (isPurchaseOrder) {
          response = {
            success: true,
            data: transformPurchaseDataForPrint(purchase),
          };
        } else {
          if (purchaseService.getPurchaseBillForPrint) {
            response = await purchaseService.getPurchaseBillForPrint(
              purchaseId
            );
          } else {
            response = {
              success: true,
              data: transformPurchaseDataForPrint(purchase),
            };
          }
        }

        if (response.success && response.data) {
          return response.data;
        } else {
          throw new Error(response.message || "Failed to fetch purchase data");
        }
      } catch (error) {
        return transformPurchaseDataForPrint(purchase);
      } finally {
        setPrintLoading(false);
      }
    },
    [isPurchaseOrdersMode, transformPurchaseDataForPrint]
  );

  const PrintModal = () => {
    if (!printModalShow) return null;

    const handleClose = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setPrintModalShow(false);
      setSelectedPurchaseForPrint(null);
      setPrintData(null);
      setBulkPrintMode(false);
    };

    const handlePrintClick = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      handleComponentPrint();
    };

    const handleDownloadClick = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      addToast?.("PDF download feature coming soon", "info");
    };

    return (
      <Modal
        show={printModalShow}
        onHide={handleClose}
        size="xl"
        centered
        backdrop={false}
        keyboard={true}
        enforceFocus={false}
      >
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faPrint} className="me-2" />
            {bulkPrintMode
              ? `Print ${selectedPurchasesForBulkPrint.length} Invoices`
              : `Print Purchase Invoice`}
            {selectedPurchaseForPrint && (
              <Badge bg="light" text="dark" className="ms-2">
                {selectedPurchaseForPrint.purchaseNumber ||
                  selectedPurchaseForPrint.billNumber ||
                  selectedPurchaseForPrint._id}
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-0">
          {printLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" size="lg" />
              <h5 className="mt-3 text-muted">Preparing print data...</h5>
              <p className="text-muted">
                {bulkPrintMode
                  ? `Processing ${selectedPurchasesForBulkPrint.length} invoices...`
                  : `Loading ${
                      selectedPurchaseForPrint?.purchaseNumber ||
                      selectedPurchaseForPrint?.billNumber ||
                      "invoice"
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
                  {printData.purchases?.map((purchaseData, index) => (
                    <div key={index} className="mb-4 page-break">
                      <PurchaseInvoice invoiceData={purchaseData} />
                      {index < printData.purchases.length - 1 && (
                        <div style={{pageBreakAfter: "always"}} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div ref={printComponentRef}>
                  <PurchaseInvoice invoiceData={printData} />
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
                Unable to load print data for the selected purchase(s).
              </p>
              <Button variant="outline-primary" onClick={handleClose}>
                Close
              </Button>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <div className="d-flex gap-2">
            <Button
              variant="primary"
              onClick={handlePrintClick}
              disabled={printLoading || !printData}
            >
              <FontAwesomeIcon icon={faPrint} className="me-1" />
              Print Now
            </Button>

            <Button
              variant="secondary"
              onClick={handleDownloadClick}
              disabled={printLoading || !printData}
            >
              <FontAwesomeIcon icon={faDownload} className="me-1" />
              Download PDF
            </Button>

            <Button variant="outline-secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    );
  };

  const handleComponentPrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: selectedPurchaseForPrint
      ? `Purchase-Invoice-${
          selectedPurchaseForPrint.purchaseNumber ||
          selectedPurchaseForPrint.billNumber ||
          selectedPurchaseForPrint._id
        }`
      : "Purchase Invoice",
    onAfterPrint: () => {
      setPrintModalShow(false);
      setSelectedPurchaseForPrint(null);
      setPrintData(null);
      setBulkPrintMode(false);
    },
    onPrintError: (errorLocation, error) => {
      addToast?.("Printing failed", "error");
    },
    pageStyle: "@page { margin: 0.5in; }",
    suppressErrors: true,
  });

  const handlePrintPurchase = useCallback(
    async (purchase, options = {}) => {
      try {
        if (options.event) {
          options.event.preventDefault();
          options.event.stopPropagation();
        }

        setPrintLoading(true);
        setSelectedPurchaseForPrint(purchase);

        const printOptions = {
          template: options.template || printTemplate,
          format: options.format || printFormat,
          ...options,
        };

        const printInvoiceData = await fetchPurchaseForPrint(purchase);
        setPrintData(printInvoiceData);
        setPrintModalShow(true);
        addToast?.("Print data loaded successfully", "success");

        if (onPrintPurchase) {
          onPrintPurchase(purchase);
        }
      } catch (error) {
        addToast?.("Error preparing invoice for printing", "error");
        setPrintModalShow(false);
        setSelectedPurchaseForPrint(null);
        setPrintData(null);
      } finally {
        setPrintLoading(false);
      }
    },
    [
      fetchPurchaseForPrint,
      printTemplate,
      printFormat,
      onPrintPurchase,
      addToast,
    ]
  );

  const handlePrintFromModal = useCallback(() => {
    if (selectedPurchase) {
      handlePrintPurchase(selectedPurchase);
    }
  }, [selectedPurchase, handlePrintPurchase]);

  const PrintControls = () => (
    <div className="d-flex gap-2 align-items-center">
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.reload();
        }}
        disabled={isLoading}
        title="Refresh purchases list"
      >
        <FontAwesomeIcon
          icon={isLoading ? faSpinner : faUndo}
          className={`me-1 ${isLoading ? "fa-spin" : ""}`}
        />
        {isLoading ? "Loading..." : "Refresh"}
      </Button>

      <Button
        variant="outline-info"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (filteredPurchases.length === 1) {
            handlePrintPurchase(filteredPurchases[0], {event: e});
          } else if (filteredPurchases.length > 1) {
            handlePrintPurchase(filteredPurchases[0], {event: e});
          }
        }}
        disabled={filteredPurchases.length === 0 || printLoading}
        title="Print purchase"
      >
        <FontAwesomeIcon
          icon={printLoading ? faSpinner : faPrint}
          className={`me-1 ${printLoading ? "fa-spin" : ""}`}
        />
        {printLoading ? "Processing..." : "Print"}
      </Button>

      {printLoading && (
        <div className="d-flex align-items-center text-info">
          <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2" />
          <small>
            <strong>Preparing print...</strong>
          </small>
        </div>
      )}

      {filteredPurchases.length > 0 && (
        <div className="d-flex align-items-center">
          <small className="text-muted">
            <strong>{filteredPurchases.length}</strong> purchase
            {filteredPurchases.length !== 1 ? "s" : ""}
            {selectedPurchases.length > 0 && enableBulkActions && (
              <span className="ms-2">
                (<strong>{selectedPurchases.length}</strong> selected)
              </span>
            )}
          </small>
        </div>
      )}
    </div>
  );

  const handleBulkPrint = useCallback(
    async (purchases, options = {}) => {
      try {
        setPrintLoading(true);
        setBulkPrintMode(true);

        const printOptions = {
          template: options.template || printTemplate,
          format: options.format || printFormat,
          ...options,
        };

        const bulkPrintData = {
          purchases: [],
          template: printOptions.template,
          format: printOptions.format,
        };

        for (const purchase of purchases) {
          try {
            const purchaseData = await fetchPurchaseForPrint(purchase);
            bulkPrintData.purchases.push(purchaseData);
          } catch (error) {
            console.error("Error processing purchase for bulk print:", error);
          }
        }

        if (bulkPrintData.purchases.length > 0) {
          setSelectedPurchasesForBulkPrint(purchases);
          setPrintData(bulkPrintData);
          setPrintModalShow(true);
          addToast?.(
            `${purchases.length} purchases prepared for bulk printing`,
            "success"
          );
        } else {
          throw new Error("No purchases could be prepared for printing");
        }
      } catch (error) {
        addToast?.(`Failed to prepare bulk print: ${error.message}`, "error");
      } finally {
        setPrintLoading(false);
      }
    },
    [fetchPurchaseForPrint, printTemplate, printFormat, addToast]
  );

  const handlePrintPreview = useCallback(
    async (purchase, options = {}) => {
      try {
        setPrintLoading(true);

        const previewOptions = {
          ...options,
          template: "preview",
          format: "html",
        };

        const printInvoiceData = await fetchPurchaseForPrint(purchase);
        setPrintData(printInvoiceData);
        setPrintModalShow(true);
        addToast?.("Print preview loaded successfully", "success");
      } catch (error) {
        addToast?.(`Failed to load print preview: ${error.message}`, "error");
      } finally {
        setPrintLoading(false);
      }
    },
    [fetchPurchaseForPrint, addToast]
  );

  const purchaseCounts = useMemo(() => {
    const counts = {
      all: purchases.length,
      self_generated: 0,
      from_suppliers: 0,
    };

    purchases.forEach((purchase) => {
      const isCreatedByYourCompany =
        (purchase.companyId?.toString() === companyId?.toString() &&
          !purchase.sourceCompanyId &&
          !purchase.isAutoGenerated) ||
        (purchase.isAutoGenerated === true &&
          purchase.generatedFrom === "sales_invoice" &&
          purchase.sourceCompanyId?.toString() === companyId?.toString());

      if (isCreatedByYourCompany) {
        counts.self_generated++;
      } else {
        counts.from_suppliers++;
      }
    });

    return counts;
  }, [purchases, companyId]);

  const filterPurchasesBySource = useCallback(
    (purchases, filter) => {
      if (filter === "all") {
        return purchases;
      }

      return purchases.filter((purchase) => {
        const isCreatedByYourCompany =
          (purchase.companyId?.toString() === companyId?.toString() &&
            !purchase.sourceCompanyId &&
            !purchase.isAutoGenerated) ||
          (purchase.isAutoGenerated === true &&
            purchase.generatedFrom === "sales_invoice" &&
            purchase.sourceCompanyId?.toString() === companyId?.toString());

        if (filter === "self_generated") {
          return isCreatedByYourCompany;
        } else if (filter === "from_suppliers") {
          return !isCreatedByYourCompany;
        }

        return true;
      });
    },
    [companyId]
  );

  useEffect(() => {
    const filtered = filterPurchasesBySource(purchases, sourceFilter);
    setFilteredPurchases(filtered);
  }, [purchases, sourceFilter, filterPurchasesBySource]);

  const handleSourceFilterChange = (newFilter) => {
    setSourceFilter(newFilter);
  };

  const getDocumentType = useCallback(
    (purchase) => {
      if (
        purchase.documentType === "purchase-order" ||
        purchase.orderType === "purchase_order" ||
        purchase.orderType === "purchase_quotation" ||
        purchase.orderType === "proforma_purchase" ||
        purchase.orderNumber ||
        purchase.quotationNumber
      ) {
        return "purchase-order";
      } else if (
        purchase.documentType === "purchase-invoice" ||
        purchase.invoiceNumber ||
        purchase.billNumber ||
        purchase.purchaseNumber
      ) {
        return "purchase-invoice";
      }

      return isPurchaseOrdersMode ? "purchase-order" : "purchase-invoice";
    },
    [isPurchaseOrdersMode]
  );

  const getDocumentLabels = (documentType = null) => {
    if (documentType === "purchase-order") {
      return {
        documentName: "Purchase Order",
        documentNamePlural: "Purchase Orders",
        listPath: "purchase-orders",
        editPath: "purchase-orders",
        createPath: "purchase-orders/new",
      };
    } else if (documentType === "purchase-invoice") {
      return {
        documentName: "Purchase Invoice",
        documentNamePlural: "Purchase Invoices",
        listPath: "purchases",
        editPath: "purchases",
        createPath: "purchases/new",
      };
    }

    return isPurchaseOrdersMode
      ? {
          documentName: "Purchase Order",
          documentNamePlural: "Purchase Orders",
          listPath: "purchase-orders",
          editPath: "purchase-orders",
          createPath: "purchase-orders/new",
        }
      : {
          documentName: "Purchase Invoice",
          documentNamePlural: "Purchase Invoices",
          listPath: "purchases",
          editPath: "purchases",
          createPath: "purchases/new",
        };
  };

  const labels = getDocumentLabels();

  const transformPurchaseForEdit = useCallback(
    (purchase) => {
      const transformedItems = (purchase.items || []).map((item, index) => {
        const quantity = parseFloat(item.quantity || item.qty || 1);
        const pricePerUnit = parseFloat(
          item.pricePerUnit ||
            item.purchasePrice ||
            item.costPrice ||
            item.price ||
            item.rate ||
            item.unitPrice ||
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
          taxMode: item.taxMode || purchase.taxMode || "without-tax",
          priceIncludesTax: Boolean(
            item.priceIncludesTax || purchase.priceIncludesTax
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
        purchase.supplier && typeof purchase.supplier === "object"
          ? {
              id: purchase.supplier._id || purchase.supplier.id,
              _id: purchase.supplier._id || purchase.supplier.id,
              name:
                purchase.supplier.name || purchase.supplier.supplierName || "",
              mobile: purchase.supplier.mobile || purchase.supplier.phone || "",
              email: purchase.supplier.email || "",
              address: purchase.supplier.address || "",
              gstNumber: purchase.supplier.gstNumber || "",
            }
          : {
              id: purchase.supplierId || purchase.supplier,
              _id: purchase.supplierId || purchase.supplier,
              name: purchase.supplierName || purchase.partyName || "",
              mobile:
                purchase.supplierMobile ||
                purchase.partyPhone ||
                purchase.mobileNumber ||
                "",
              email: purchase.supplierEmail || purchase.partyEmail || "",
              address: purchase.supplierAddress || purchase.partyAddress || "",
              gstNumber: purchase.supplierGstNumber || "",
            };

      const totalAmount = parseFloat(
        purchase.amount ||
          purchase.total ||
          purchase.totals?.finalTotal ||
          purchase.grandTotal ||
          0
      );
      const balanceAmount = parseFloat(
        purchase.balance ||
          purchase.balanceAmount ||
          purchase.pendingAmount ||
          purchase.payment?.pendingAmount ||
          0
      );
      const paidAmount = parseFloat(
        purchase.paidAmount ||
          purchase.payment?.paidAmount ||
          totalAmount - balanceAmount
      );

      const paymentMethod =
        purchase.payment?.method ||
        purchase.paymentMethod ||
        purchase.paymentType ||
        purchase.method ||
        "cash";

      const paymentData = {
        method: paymentMethod,
        paymentType: paymentMethod,
        type: paymentMethod,
        paidAmount: paidAmount,
        amount: paidAmount,
        pendingAmount: balanceAmount,
        balanceAmount: balanceAmount,
        totalAmount: totalAmount,
        paymentDate:
          purchase.payment?.paymentDate ||
          purchase.paymentDate ||
          purchase.purchaseDate ||
          purchase.billDate ||
          purchase.date,
        dueDate: purchase.payment?.dueDate || purchase.dueDate || null,
        creditDays: purchase.payment?.creditDays || purchase.creditDays || 0,
        notes:
          purchase.payment?.notes ||
          purchase.paymentNotes ||
          purchase.notes ||
          "",
        reference:
          purchase.payment?.reference || purchase.paymentReference || "",
        status:
          balanceAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "pending",
        bankAccountId:
          purchase.payment?.bankAccountId || purchase.bankAccountId || null,
        bankAccountName:
          purchase.payment?.bankAccountName || purchase.bankAccountName || "",
        bankName: purchase.payment?.bankName || purchase.bankName || "",
        accountNumber:
          purchase.payment?.accountNumber || purchase.accountNumber || "",
      };

      const transformedPurchase = {
        id: purchase._id || purchase.id,
        _id: purchase._id || purchase.id,
        documentType: isPurchaseOrdersMode ? "purchase-order" : "purchase",
        purchaseNumber:
          purchase.purchaseNumber ||
          purchase.billNumber ||
          purchase.billNo ||
          purchase.purchaseOrderNumber ||
          purchase.invoiceNumber,
        billNumber:
          purchase.billNumber ||
          purchase.purchaseNumber ||
          purchase.billNo ||
          purchase.invoiceNumber,
        purchaseOrderNumber:
          purchase.purchaseOrderNumber ||
          purchase.purchaseNumber ||
          purchase.billNumber,
        invoiceNumber:
          purchase.invoiceNumber ||
          purchase.purchaseNumber ||
          purchase.billNumber,
        purchaseDate:
          purchase.purchaseDate ||
          purchase.billDate ||
          purchase.date ||
          purchase.invoiceDate,
        billDate:
          purchase.billDate ||
          purchase.purchaseDate ||
          purchase.date ||
          purchase.invoiceDate,
        invoiceDate:
          purchase.invoiceDate ||
          purchase.purchaseDate ||
          purchase.billDate ||
          purchase.date,
        date:
          purchase.date ||
          purchase.purchaseDate ||
          purchase.billDate ||
          purchase.invoiceDate,
        customer: supplierData,
        supplier: supplierData,
        supplierId: supplierData?.id,
        supplierName: supplierData?.name || "",
        supplierMobile: supplierData?.mobile || "",
        supplierEmail: supplierData?.email || "",
        supplierAddress: supplierData?.address || "",
        partyName: supplierData?.name || "",
        partyPhone: supplierData?.mobile || "",
        partyEmail: supplierData?.email || "",
        partyAddress: supplierData?.address || "",
        mobileNumber: supplierData?.mobile || "",
        items: transformedItems,
        lineItems: transformedItems,
        amount: totalAmount,
        total: totalAmount,
        grandTotal: totalAmount,
        balance: balanceAmount,
        balanceAmount: balanceAmount,
        payment: {
          ...purchase.payment,
          ...paymentData,
        },
        paymentData: paymentData,
        paymentType: paymentMethod,
        paymentMethod: paymentMethod,
        method: paymentMethod,
        paymentReceived: paidAmount,
        paidAmount: paidAmount,
        pendingAmount: balanceAmount,
        paymentDate: paymentData.paymentDate,
        paymentNotes: paymentData.notes,
        paymentReference: paymentData.reference,
        paymentStatus: paymentData.status,
        creditDays: paymentData.creditDays,
        dueDate: paymentData.dueDate,
        bankAccountId: paymentData.bankAccountId,
        bankAccountName: paymentData.bankAccountName,
        bankName: paymentData.bankName,
        accountNumber: paymentData.accountNumber,
        totals: purchase.totals || {
          subtotal: purchase.subtotal || totalAmount,
          finalTotal: totalAmount,
          totalAmount: totalAmount,
          totalTax:
            (purchase.cgst || 0) + (purchase.sgst || 0) + (purchase.igst || 0),
          cgst: purchase.cgst || 0,
          sgst: purchase.sgst || 0,
          igst: purchase.igst || 0,
          discount: purchase.discount || purchase.discountAmount || 0,
        },
        status: purchase.status,
        purchaseOrderStatus: purchase.purchaseOrderStatus || purchase.status,
        gstEnabled:
          purchase.gstEnabled !== undefined ? purchase.gstEnabled : true,
        notes: purchase.notes || purchase.description || "",
        terms: purchase.terms || purchase.termsAndConditions || "",
        description: purchase.description || purchase.notes || "",
        termsAndConditions: purchase.termsAndConditions || purchase.terms || "",
        purchaseType: purchase.purchaseType || "purchase",
        invoiceType: purchase.invoiceType || "gst",
        taxMode: purchase.taxMode || "without-tax",
        priceIncludesTax: Boolean(purchase.priceIncludesTax),
        companyId: purchase.companyId || companyId,
        employeeName: purchase.employeeName,
        employeeId: purchase.employeeId,
        createdBy: purchase.createdBy,
        createdByName: purchase.createdByName,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
        isTransformed: true,
        transformedAt: new Date().toISOString(),
      };

      return transformedPurchase;
    },
    [isPurchaseOrdersMode, companyId]
  );

  const handleEditPurchase = useCallback(
    (purchase) => {
      try {
        const transformedPurchase = transformPurchaseForEdit(purchase);

        const editPath = `/companies/${companyId}/${labels.editPath}/${
          purchase._id || purchase.id
        }/edit`;

        navigate(editPath, {
          state: {
            purchase: transformedPurchase,
            transaction: transformedPurchase,
            documentType: isPurchaseOrdersMode ? "purchase-order" : "purchase",
            mode: isPurchaseOrdersMode ? "purchase-orders" : "purchases",
            returnPath: location.pathname,
            editMode: true,
          },
        });

        if (viewModalShow) {
          setViewModalShow(false);
          setSelectedPurchase(null);
        }

        setOpenDropdownId(null);

        if (onEditPurchase) {
          onEditPurchase(purchase);
        }
      } catch (error) {
        addToast?.("Error opening purchase for editing", "error");
      }
    },
    [
      transformPurchaseForEdit,
      companyId,
      labels.editPath,
      navigate,
      location.pathname,
      isPurchaseOrdersMode,
      onEditPurchase,
      addToast,
      viewModalShow,
    ]
  );

  const handleViewPurchase = useCallback(
    async (purchase) => {
      try {
        setModalLoading(true);
        setModalError(null);

        const transformedPurchase = transformPurchaseForEdit(purchase);

        const enhancedPurchase = {
          ...transformedPurchase,
          displayNumber:
            transformedPurchase.purchaseNumber ||
            transformedPurchase.billNumber ||
            "N/A",
          displayDate: new Date(
            transformedPurchase.purchaseDate || transformedPurchase.date
          ).toLocaleDateString("en-GB"),
          displaySupplier:
            transformedPurchase.supplierName || "Unknown Supplier",
          displayAmount: `₹${transformedPurchase.amount.toLocaleString(
            "en-IN"
          )}`,
          displayPaymentStatus: transformedPurchase.paymentStatus || "pending",
          displayPaymentMethod: transformedPurchase.paymentMethod || "cash",
        };

        setSelectedPurchase(enhancedPurchase);
        setViewModalShow(true);
        setOpenDropdownId(null);

        if (onViewPurchase) {
          onViewPurchase(purchase);
        }
      } catch (error) {
        setModalError("Failed to load purchase details");
        addToast?.("Error loading purchase details", "error");
      } finally {
        setModalLoading(false);
      }
    },
    [transformPurchaseForEdit, onViewPurchase, addToast]
  );

  const handleDeletePurchase = useCallback(
    async (purchase) => {
      const purchaseId = purchase._id || purchase.id;

      if (!purchaseId) {
        addToast?.("Invalid purchase ID", "error");
        return;
      }

      if (deletingPurchases.has(purchaseId)) {
        return;
      }

      try {
        setDeletingPurchases((prev) => new Set(prev).add(purchaseId));
        setModalLoading(true);
        setOpenDropdownId(null);

        const purchaseNumber =
          purchase.purchaseNumber || purchase.billNumber || "this purchase";
        const confirmed = window.confirm(
          `Are you sure you want to delete ${
            isPurchaseOrdersMode ? "purchase order" : "purchase bill"
          } ${purchaseNumber}?`
        );

        if (!confirmed) {
          return;
        }

        const deleteOptions = {
          hard: false,
          reason: "Deleted by user",
        };

        if (
          purchase.status === "draft" &&
          (purchase.payment?.paidAmount || 0) === 0
        ) {
          const hardDelete = window.confirm(
            `This is a draft ${
              isPurchaseOrdersMode ? "order" : "bill"
            } with no payments. Would you like to permanently delete it?\n\nOK = Permanent deletion\nCancel = Soft deletion (cancelled status)`
          );
          if (hardDelete) {
            deleteOptions.hard = true;
          }
        }

        const deleteResponse = isPurchaseOrdersMode
          ? await purchaseOrderService.deletePurchaseOrder(
              purchaseId,
              deleteOptions
            )
          : await purchaseService.deletePurchase(purchaseId, deleteOptions);

        if (
          !deleteResponse.success &&
          deleteResponse.alternativeAction === "soft_delete"
        ) {
          const softDeleteConfirmed = window.confirm(
            `${deleteResponse.message}\n\n${
              deleteResponse.suggestedAction
            }\n\nProceed with cancelling the ${
              isPurchaseOrdersMode ? "order" : "bill"
            }?`
          );

          if (softDeleteConfirmed) {
            deleteOptions.hard = false;
            const retryResponse = isPurchaseOrdersMode
              ? await purchaseOrderService.deletePurchaseOrder(
                  purchaseId,
                  deleteOptions
                )
              : await purchaseService.deletePurchase(purchaseId, deleteOptions);
            Object.assign(deleteResponse, retryResponse);
          } else {
            return;
          }
        }

        if (deleteResponse.success) {
          let message =
            deleteResponse.message ||
            `${
              isPurchaseOrdersMode ? "Order" : "Purchase"
            } processed successfully`;
          let toastType = "success";

          if (deleteResponse.alreadyDeleted || deleteResponse.notFound) {
            message = `${
              isPurchaseOrdersMode ? "Order" : "Purchase"
            } not found - removed from list`;
            toastType = "info";
          } else if (deleteResponse.deleteMethod === "soft") {
            message = `${
              isPurchaseOrdersMode ? "Order" : "Purchase"
            } cancelled successfully`;
          } else if (deleteResponse.deleteMethod === "hard") {
            message = `${
              isPurchaseOrdersMode ? "Order" : "Purchase"
            } deleted permanently`;
          }

          addToast?.(message, toastType);

          if (deleteResponse.warning) {
            setTimeout(() => addToast?.(deleteResponse.warning, "info"), 1000);
          }

          if (viewModalShow) {
            setViewModalShow(false);
            setSelectedPurchase(null);
          }

          if (onDeletePurchase) {
            setTimeout(() => onDeletePurchase(purchase), 100);
          }
        } else {
          throw new Error(
            deleteResponse.message ||
              `Failed to delete ${isPurchaseOrdersMode ? "order" : "purchase"}`
          );
        }
      } catch (error) {
        let errorMessage = `Failed to delete ${
          isPurchaseOrdersMode ? "order" : "purchase"
        }`;
        let shouldRefreshList = false;

        if (
          error.message.includes("not found") ||
          error.message.includes("404") ||
          error.message.includes("already deleted")
        ) {
          errorMessage = `${
            isPurchaseOrdersMode ? "Order" : "Purchase"
          } not found - removing from list`;
          shouldRefreshList = true;
        } else if (error.message.includes("permission")) {
          errorMessage = `You don't have permission to delete this ${
            isPurchaseOrdersMode ? "order" : "purchase"
          }`;
        } else {
          errorMessage =
            error.message ||
            `Failed to delete ${isPurchaseOrdersMode ? "order" : "purchase"}`;
        }

        addToast?.(errorMessage, shouldRefreshList ? "warning" : "error");

        if (shouldRefreshList) {
          if (viewModalShow) {
            setViewModalShow(false);
            setSelectedPurchase(null);
          }
          if (onDeletePurchase) {
            setTimeout(() => onDeletePurchase(purchase), 100);
          }
        }
      } finally {
        setModalLoading(false);
        setDeletingPurchases((prev) => {
          const newSet = new Set(prev);
          newSet.delete(purchaseId);
          return newSet;
        });
      }
    },
    [
      onDeletePurchase,
      viewModalShow,
      addToast,
      deletingPurchases,
      isPurchaseOrdersMode,
    ]
  );

  const handleDuplicatePurchase = useCallback(
    (purchase) => {
      try {
        const transformedPurchase = transformPurchaseForEdit(purchase);

        const duplicateData = {
          ...transformedPurchase,
          id: undefined,
          _id: undefined,
          purchaseNumber: undefined,
          billNumber: undefined,
          invoiceNumber: undefined,
          purchaseOrderNumber: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          status: "draft",
          purchaseDate: new Date().toISOString(),
          date: new Date().toISOString(),
          billDate: new Date().toISOString(),
        };

        const createPath = `/companies/${companyId}/${labels.createPath}`;

        navigate(createPath, {
          state: {
            duplicateData: duplicateData,
            isDuplicate: true,
            originalPurchase: purchase,
            returnPath: location.pathname,
          },
        });

        if (viewModalShow) {
          setViewModalShow(false);
          setSelectedPurchase(null);
        }

        setOpenDropdownId(null);

        if (onDuplicatePurchase) {
          onDuplicatePurchase(purchase);
        }
      } catch (error) {
        addToast?.("Error duplicating purchase", "error");
      }
    },
    [
      transformPurchaseForEdit,
      companyId,
      labels.createPath,
      navigate,
      location.pathname,
      viewModalShow,
      onDuplicatePurchase,
      addToast,
    ]
  );

  const separatedPurchases = useMemo(() => {
    const active = [];
    const cancelled = [];

    filteredPurchases.forEach((purchase) => {
      if (purchase.status === "cancelled" || purchase.status === "deleted") {
        cancelled.push(purchase);
      } else {
        active.push(purchase);
      }
    });

    return {active, cancelled};
  }, [filteredPurchases]);

  const StatusBadge = ({status, paymentStatus, amount, balance, purchase}) => {
    const getStatusInfo = () => {
      if (status === "cancelled" || status === "deleted") {
        return {variant: "danger", text: "Cancelled", icon: faBan};
      }

      if (paymentStatus === "paid" || balance <= 0) {
        return {variant: "success", text: "Paid", icon: faCheckCircle};
      } else if (
        paymentStatus === "partial" ||
        (balance > 0 && balance < amount)
      ) {
        return {
          variant: "warning",
          text: "Partial",
          icon: faExclamationTriangle,
        };
      } else if (paymentStatus === "overdue") {
        return {variant: "danger", text: "Overdue", icon: faClock};
      } else {
        return {variant: "secondary", text: "Pending", icon: faInbox};
      }
    };

    const statusInfo = getStatusInfo();

    const isSelfGenerated =
      (purchase?.companyId?.toString() === companyId?.toString() &&
        !purchase?.sourceCompanyId &&
        !purchase?.isAutoGenerated) ||
      (purchase?.isAutoGenerated === true &&
        purchase?.generatedFrom === "sales_invoice" &&
        purchase?.sourceCompanyId?.toString() === companyId?.toString());

    return (
      <div className="d-flex flex-column gap-1">
        <Badge bg={statusInfo.variant} className="d-flex align-items-center">
          <FontAwesomeIcon icon={statusInfo.icon} className="me-1" />
          {statusInfo.text}
        </Badge>
        {isSelfGenerated && (
          <Badge
            bg="success"
            className="d-flex align-items-center"
            style={{fontSize: "10px"}}
          >
            <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
            Self
          </Badge>
        )}
        {purchase?.isAutoGenerated === true && !isSelfGenerated && (
          <Badge
            bg="info"
            className="d-flex align-items-center"
            style={{fontSize: "10px"}}
          >
            <FontAwesomeIcon icon={faTruck} className="me-1" />
            Supplier
          </Badge>
        )}
      </div>
    );
  };

  const ActionButton = ({purchase}) => {
    const purchaseId = purchase._id || purchase.id;
    const isDeleting = deletingPurchases.has(purchaseId);
    const isCancelled =
      purchase.status === "cancelled" || purchase.status === "deleted";
    const isOpen = openDropdownId === purchaseId;

    const docType = getDocumentType(purchase);
    const isOrder = docType === "purchase-order";
    const docLabels = getDocumentLabels(docType);

    const handleToggleDropdown = (e) => {
      e.stopPropagation();
      setOpenDropdownId(isOpen ? null : purchaseId);
    };

    const handleCloseDropdown = () => {
      setOpenDropdownId(null);
    };

    const handleEdit = () => {
      handleEditPurchase(purchase);
    };

    const handleActionClick = (actionFn, ...args) => {
      actionFn(...args);
      setOpenDropdownId(null);
    };

    // Initialize dropdown ref
    if (!dropdownRefs.current[purchaseId]) {
      dropdownRefs.current[purchaseId] = React.createRef();
    }

    return (
      <>
        <button
          ref={dropdownRefs.current[purchaseId]}
          type="button"
          className="btn btn-sm btn-outline-secondary border-0 p-2"
          onClick={handleToggleDropdown}
          disabled={isDeleting || modalLoading || printLoading}
          style={{
            borderRadius: 0,
            background: "transparent",
            boxShadow: "none",
          }}
        >
          <FontAwesomeIcon
            icon={faEllipsisVertical}
            className="text-muted"
            size="sm"
          />
        </button>

        <PortalDropdown
          isOpen={isOpen}
          onClose={handleCloseDropdown}
          triggerRef={dropdownRefs.current[purchaseId]}
        >
          {/* View Details */}
          <DropdownItem
            onClick={() => handleActionClick(handleViewPurchase, purchase)}
          >
            <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
            View Details
          </DropdownItem>

          {enableActions && !isCancelled && (
            <>
              {/* Edit Purchase */}
              <DropdownItem
                onClick={handleEdit}
                disabled={isDeleting || modalLoading}
              >
                <FontAwesomeIcon icon={faEdit} className="me-2 text-info" />
                Edit {docLabels.documentName}
              </DropdownItem>

              {/* Duplicate Purchase */}
              <DropdownItem
                onClick={() =>
                  handleActionClick(handleDuplicatePurchase, purchase)
                }
                disabled={isDeleting || modalLoading}
              >
                <FontAwesomeIcon icon={faCopy} className="me-2 text-success" />
                Duplicate
              </DropdownItem>

              <DropdownDivider />
            </>
          )}

          {/* ✅ Enhanced Print & Share Section */}
          <DropdownHeader>Print & Share</DropdownHeader>

          {/* Enhanced Print Options */}
          <div className="d-flex">
            <DropdownItem
              onClick={() => handleActionClick(handlePrintPurchase, purchase)}
              disabled={printLoading}
              className="flex-fill text-center"
            >
              <FontAwesomeIcon
                icon={printLoading ? faSpinner : faPrint}
                className={`me-1 ${printLoading ? "fa-spin" : ""}`}
              />
              {printLoading ? "Preparing..." : "Print"}
            </DropdownItem>

            <DropdownItem
              onClick={() => handleActionClick(handlePrintPreview, purchase)}
              disabled={printLoading}
              className="flex-fill text-center"
            >
              <FontAwesomeIcon icon={faEye} className="me-1" />
              Preview
            </DropdownItem>
          </div>

          {/* Share Invoice */}
          <DropdownItem
            onClick={() => handleActionClick(onSharePurchase, purchase)}
          >
            <FontAwesomeIcon icon={faShare} className="me-2 text-warning" />
            Share Invoice
          </DropdownItem>

          {/* Download Options */}
          <div className="d-flex">
            <DropdownItem
              onClick={() => handleActionClick(onDownloadPurchase, purchase)}
              className="flex-fill text-center"
            >
              <FontAwesomeIcon icon={faDownload} className="me-1 text-info" />
              Excel
            </DropdownItem>

            <DropdownItem
              onClick={() => {
                // Add PDF download logic
                addToast?.("PDF download feature coming soon", "info");
                setOpenDropdownId(null);
              }}
              className="flex-fill text-center"
            >
              <FontAwesomeIcon icon={faDownload} className="me-1 text-danger" />
              PDF
            </DropdownItem>
          </div>

          {enableActions && !isCancelled && (
            <>
              <DropdownDivider />

              {/* Status Actions Section */}
              <DropdownHeader>Status Actions</DropdownHeader>

              {/* Convert Order to Invoice */}
              {isOrder && (
                <DropdownItem
                  onClick={() => handleActionClick(onConvertPurchase, purchase)}
                >
                  <FontAwesomeIcon
                    icon={faExchangeAlt}
                    className="me-2 text-success"
                  />
                  Convert to Invoice
                </DropdownItem>
              )}

              {/* Mark as Ordered */}
              {purchase.status === "pending" && (
                <DropdownItem
                  onClick={() => handleActionClick(onMarkAsOrdered, purchase)}
                >
                  <FontAwesomeIcon
                    icon={faShoppingCart}
                    className="me-2 text-info"
                  />
                  Mark as Ordered
                </DropdownItem>
              )}

              {/* Mark as Received */}
              {purchase.status === "ordered" && (
                <DropdownItem
                  onClick={() => handleActionClick(onMarkAsReceived, purchase)}
                >
                  <FontAwesomeIcon
                    icon={faTruck}
                    className="me-2 text-success"
                  />
                  Mark as Received
                </DropdownItem>
              )}

              {/* Complete Order */}
              {purchase.status === "received" && (
                <DropdownItem
                  onClick={() =>
                    handleActionClick(onCompletePurchase, purchase)
                  }
                >
                  <FontAwesomeIcon
                    icon={faCheck}
                    className="me-2 text-success"
                  />
                  Complete Order
                </DropdownItem>
              )}

              <DropdownDivider />

              {/* Delete Purchase */}
              <DropdownItem
                onClick={() =>
                  handleActionClick(handleDeletePurchase, purchase)
                }
                disabled={isDeleting || modalLoading}
                variant="danger"
              >
                <FontAwesomeIcon icon={faTrash} className="me-2" />
                {isDeleting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                    Deleting...
                  </>
                ) : (
                  `Delete ${docLabels.documentName}`
                )}
              </DropdownItem>
            </>
          )}

          {/* ✅ Print Status Information */}
          {printLoading && (
            <>
              <DropdownDivider />
              <div className="px-3 py-2">
                <div className="d-flex align-items-center text-info">
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2" />
                  <small>
                    <strong>Preparing print data...</strong>
                    <br />
                    <span className="text-muted">
                      Loading {purchase.purchaseNumber || purchase.billNumber}
                    </span>
                  </small>
                </div>
              </div>
            </>
          )}

          {/* ✅ Purchase Information */}
          <DropdownDivider />
          <div className="px-3 py-2">
            <small className="text-muted">
              <strong>Template:</strong> {printTemplate}
              <br />
              <strong>Format:</strong> {printFormat.toUpperCase()}
              <br />
              <strong>Items:</strong> {(purchase.items || []).length}
              <br />
              <strong>Amount:</strong> ₹
              {(purchase.amount || 0).toLocaleString("en-IN")}
            </small>
          </div>
        </PortalDropdown>
      </>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₹0";
    const numAmount = parseFloat(amount);

    if (numAmount >= 10000000) {
      return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
    } else if (numAmount >= 100000) {
      return `₹${(numAmount / 100000).toFixed(1)}L`;
    } else if (numAmount >= 1000) {
      return `₹${(numAmount / 1000).toFixed(1)}K`;
    }
    return `₹${Math.round(numAmount)}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  // Calculate due date
  const calculateDueDate = (purchase) => {
    const dueDate = purchase.dueDate || purchase.payment?.dueDate;
    if (dueDate) {
      return formatDate(dueDate);
    }

    const purchaseDate = new Date(
      purchase.purchaseDate || purchase.billDate || purchase.date
    );
    const creditDays = purchase.creditDays || purchase.payment?.creditDays || 0;

    if (creditDays > 0) {
      const due = new Date(purchaseDate);
      due.setDate(due.getDate() + creditDays);
      return formatDate(due);
    }

    return "Immediate";
  };

  // Loading component
  const LoadingComponent = () => (
    <div className="text-center py-5">
      <Spinner
        animation="border"
        variant="primary"
        size="lg"
        className="mb-3"
      />
      <h5 className="text-muted">
        Loading {labels.documentNamePlural.toLowerCase()}...
      </h5>
      <p className="text-muted small">Please wait while we fetch your data</p>
    </div>
  );

  // Empty state component
  const EmptyStateComponent = () => (
    <div className="text-center py-5">
      <FontAwesomeIcon
        icon={isPurchaseOrdersMode ? faShoppingCart : faFileExcel}
        size="4x"
        className="text-muted mb-4"
      />
      <h4 className="text-muted mb-3">No {labels.documentNamePlural} Found</h4>
      <p className="text-muted mb-4">
        {isPurchaseOrdersMode
          ? "Start by creating your first purchase order to track your suppliers and orders."
          : "Start by creating your first purchase bill to manage your vendor payments."}
      </p>
      <Button
        variant="primary"
        onClick={() => navigate(`/companies/${companyId}/${labels.createPath}`)}
        style={{borderRadius: 0}}
      >
        <FontAwesomeIcon icon={faPlus} className="me-2" />
        Create {labels.documentName}
      </Button>
    </div>
  );

  if (isLoading) {
    return <LoadingComponent />;
  }

  if (!purchases || purchases.length === 0) {
    return <EmptyStateComponent />;
  }
  return (
    <>
      {showHeader && (
        <div className="purchase-bills-filter-section mb-4">
          <Container fluid className="px-0">
            {/* ✅ FIXED: Title and Search Controls Row */}
            <Row className="align-items-center mb-3">
              <Col>
                <h5 className="mb-0 text-purple">
                  <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                  {title ||
                    (isPurchaseOrdersMode
                      ? "Purchase Orders"
                      : "Purchase Invoices")}
                  <Badge bg="light" text="dark" className="ms-2">
                    {filteredPurchases.length}
                  </Badge>
                </h5>
              </Col>

              <Col xs="auto">
                {/* ✅ Search and controls section at top */}
                <div className="d-flex gap-2 align-items-center flex-nowrap">
                  {/* ✅ Action buttons FIRST */}
                  <div className="d-flex gap-2 align-items-center flex-shrink-0">
                    <PrintControls />
                  </div>

                  <InputGroup
                    size="sm"
                    style={{width: "250px", minWidth: "200px"}}
                  >
                    <InputGroup.Text>
                      <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder={searchPlaceholder || "Search purchases..."}
                      value={localSearchTerm}
                      onChange={(e) => {
                        setLocalSearchTerm(e.target.value);
                        onSearchChange?.(e.target.value);
                      }}
                    />
                  </InputGroup>

                  <Form.Select
                    size="sm"
                    value={localFilterStatus}
                    onChange={(e) => {
                      setLocalFilterStatus(e.target.value);
                      onFilterChange?.(e.target.value);
                    }}
                    style={{width: "150px", minWidth: "120px"}}
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="ordered">Ordered</option>
                    <option value="received">Received</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>

                  <Button
                    variant="outline-primary"
                    size="sm"
                    style={{flexShrink: 0}}
                  >
                    <FontAwesomeIcon icon={faFileExcel} className="me-1" />
                    Export
                  </Button>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      )}

      {/* ✅ MOVED: Source filter buttons attached to table */}
      <div className="source-filter-attached-to-table mb-0">
        <PurchaseSourceFilter
          activeFilter={sourceFilter}
          onFilterChange={handleSourceFilterChange}
          purchaseCounts={purchaseCounts}
          isLoading={isLoading}
        />
      </div>

      {/* ✅ UPDATED: Enhanced styling for new layout */}
      <style>
        {`
      /* Purple gradient header styling */
      .purchase-table-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        background-attachment: fixed;
      }
      
      .purchase-table-header th {
        background: transparent !important;
        border: none !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        text-shadow: 0 1px 3px rgba(0,0,0,0.2);
        padding: 15px 8px !important;
        font-size: 13px;
        letter-spacing: 0.5px;
      }
      
      .purchase-table-header th:first-child {
        border-top-left-radius: 0 !important;
      }
      
      .purchase-table-header th:last-child {
        border-top-right-radius: 0 !important;
      }
      
      /* ✅ ENHANCED: Remove ALL border radius with more specific selectors */
      .card,
      .card *,
      .table,
      .table *,
      .table th,
      .table td,
      .btn,
      .btn *,
      .badge,
      .badge *,
      .dropdown-menu,
      .dropdown-menu *,
      .dropdown-toggle,
      .dropdown-toggle *,
      .purchase-source-filter .btn,
      .purchase-source-filter .btn *,
      .purchase-source-filter .badge,
      .purchase-source-filter .badge *,
      button,
      button *,
      .form-check-input,
      .form-control,
      .input-group,
      .input-group * {
        border-radius: 0 !important;
        -webkit-border-radius: 0 !important;
        -moz-border-radius: 0 !important;
        -ms-border-radius: 0 !important;
      }
      
      /* ✅ SPECIFIC: Target Bootstrap button variants */
      .btn-primary,
      .btn-secondary,
      .btn-success,
      .btn-danger,
      .btn-warning,
      .btn-info,
      .btn-light,
      .btn-dark,
      .btn-outline-primary,
      .btn-outline-secondary,
      .btn-outline-success,
      .btn-outline-danger,
      .btn-outline-warning,
      .btn-outline-info,
      .btn-outline-light,
      .btn-outline-dark,
      .btn-sm,
      .btn-lg {
        border-radius: 0 !important;
        -webkit-border-radius: 0 !important;
        -moz-border-radius: 0 !important;
        -ms-border-radius: 0 !important;
      }
      
      /* ✅ SPECIFIC: Target Bootstrap badges */
      .badge,
      .badge-primary,
      .badge-secondary,
      .badge-success,
      .badge-danger,
      .badge-warning,
      .badge-info,
      .badge-light,
      .badge-dark {
        border-radius: 0 !important;
        -webkit-border-radius: 0 !important;
        -moz-border-radius: 0 !important;
        -ms-border-radius: 0 !important;
      }
      
      /* Custom table styling */
      .table tbody tr {
        border-bottom: 1px solid #e9ecef;
        transition: all 0.2s ease;
      }
      
      .table tbody tr:hover {
        background-color: #f8f9ff !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      /* Action button styling */
      .action-dropdown-toggle {
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        padding: 6px 8px !important;
        border-radius: 0 !important;
      }
      
      .action-dropdown-toggle:focus {
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25) !important;
        border-radius: 0 !important;
      }
      
      /* Dropdown menu styling */
      .dropdown-menu {
        border: 1px solid #e9ecef !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        border-radius: 0 !important;
      }
      
      .dropdown-item {
        transition: all 0.2s ease;
        border-radius: 0 !important;
      }
      
      .dropdown-item:hover {
        background-color: #f8f9ff !important;
        color: #495057 !important;
        border-radius: 0 !important;
      }
      
      /* Badge styling */
      .badge {
        font-size: 11px;
        font-weight: 500;
        padding: 4px 8px;
        border-radius: 0 !important;
      }
      
      /* Cancelled section styling */
      .cancelled-section {
        background: linear-gradient(90deg, #fff3cd 0%, #ffeaa7 100%);
        border-left: 4px solid #ffc107;
      }
      
      /* ✅ NEW: Source filter attached to table styling */
      .source-filter-attached-to-table {
        border: 1px solid #e9ecef;
        border-bottom: none; /* Connect to table */
        background: #f8f9fa;
        padding: 0;
        margin: 0;
      }
      
      .source-filter-attached-to-table .purchase-source-filter {
        background: transparent !important;
        padding: 15px !important;
        border: none !important;
        margin: 0 !important;
        border-radius: 0 !important;
      }

      .source-filter-attached-to-table .purchase-source-filter .btn {
        transition: all 0.3s ease;
        font-weight: 500;
        font-size: 13px;
        border-radius: 0 !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        margin-right: 8px !important;
      }

      .source-filter-attached-to-table .purchase-source-filter .btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border-radius: 0 !important;
      }

      .source-filter-attached-to-table .purchase-source-filter .badge {
        font-size: 10px;
        min-width: 18px;
        border-radius: 0 !important;
      }

      /* ✅ ENHANCED: Table connection styling */
      .card {
        border-radius: 0 !important;
        border-top: none !important; /* Connect to filter */
      }
      
      .card-header,
      .card-body,
      .card-footer {
        border-radius: 0 !important;
      }
      
      /* ✅ ENHANCED: Table specific styling */
      .table {
        border-radius: 0 !important;
      }
      
      .table thead th:first-child {
        border-top-left-radius: 0 !important;
      }
      
      .table thead th:last-child {
        border-top-right-radius: 0 !important;
      }
      
      .table tbody tr:last-child td:first-child {
        border-bottom-left-radius: 0 !important;
      }
      
      .table tbody tr:last-child td:last-child {
        border-bottom-right-radius: 0 !important;
      }
      
      /* ✅ ENHANCED: Form controls */
      .form-check-input[type="checkbox"] {
        border-radius: 0 !important;
      }
      
      /* ✅ ENHANCED: Override any remaining Bootstrap defaults */
      * {
        --bs-border-radius: 0 !important;
        --bs-border-radius-sm: 0 !important;
        --bs-border-radius-lg: 0 !important;
        --bs-border-radius-xl: 0 !important;
        --bs-border-radius-2xl: 0 !important;
        --bs-border-radius-pill: 0 !important;
      }
      
      /* ✅ ENHANCED: Target any remaining curved elements */
      [class*="btn"],
      [class*="badge"],
      [class*="card"],
      [class*="dropdown"],
      [class*="form"] {
        border-radius: 0 !important;
      }
      
      /* ✅ ENHANCED: Modal styling to remove border radius */
      .modal-content,
      .modal-header,
      .modal-body,
      .modal-footer {
        border-radius: 0 !important;
      }
      
      /* ✅ NEW: Print loading overlay styling */
      .print-loading-overlay {
        background: rgba(0, 0, 0, 0.8) !important;
        backdrop-filter: blur(5px);
        border-radius: 0 !important;
      }
      
      .print-loading-content {
        background: #fff;
        padding: 30px;
        border-radius: 0 !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      }
      
      /* ✅ NEW: Print preview styling */
      .print-preview-container {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 0 !important;
      }
      
      /* ✅ ENHANCED: Page break for printing */
      .page-break {
        page-break-after: always !important;
      }
      
      /* ✅ ENHANCED: Responsive layout */
      @media (max-width: 768px) {
        .source-filter-attached-to-table .purchase-source-filter .btn {
          font-size: 12px;
          padding: 0.25rem 0.5rem;
          margin-right: 4px !important;
        }
        
        .source-filter-attached-to-table .purchase-source-filter .badge {
          font-size: 9px;
          min-width: 16px;
        }
      }

      @media (max-width: 576px) {
        .source-filter-attached-to-table .purchase-source-filter .btn .d-md-none {
          display: inline !important;
        }
        
        .source-filter-attached-to-table .purchase-source-filter .btn .d-none.d-md-inline {
          display: none !important;
        }
      }
      
      @media print {
        .page-break {
          page-break-after: always !important;
        }
        
        .print-preview-container {
          background: white !important;
          border: none !important;
        }
      }
      `}
      </style>

      {/* ✅ Table with connected styling */}
      <div className="card shadow-sm border-0" style={{borderRadius: 0}}>
        <div className="table-responsive" style={{borderRadius: 0}}>
          <Table hover className="mb-0" style={{borderRadius: 0}}>
            <thead className="purchase-table-header">
              <tr>
                {enableBulkActions && (
                  <th style={{width: "40px", borderRadius: 0}}>
                    <Form.Check
                      type="checkbox"
                      style={{borderRadius: 0}}
                      checked={
                        selectedPurchases.length === filteredPurchases.length &&
                        filteredPurchases.length > 0
                      }
                      onChange={(e) => {
                        if (onSelectionChange) {
                          onSelectionChange(
                            e.target.checked
                              ? filteredPurchases.map((p) => p._id || p.id)
                              : []
                          );
                        }
                      }}
                    />
                  </th>
                )}
                <th style={{width: "100px", borderRadius: 0}}>
                  <div className="d-flex align-items-center">
                    Date
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-75"
                      style={{cursor: "pointer"}}
                      onClick={() => onSort?.("date")}
                    />
                  </div>
                </th>
                <th style={{width: "120px", borderRadius: 0}}>
                  {isPurchaseOrdersMode ? "Order No." : "Bill No."}
                </th>
                <th style={{width: "180px", borderRadius: 0}}>Supplier</th>
                <th style={{width: "80px", borderRadius: 0}}>Items</th>
                <th
                  style={{width: "120px", borderRadius: 0}}
                  className="text-end"
                >
                  <div className="d-flex align-items-center justify-content-end">
                    Amount
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 opacity-75"
                      style={{cursor: "pointer"}}
                      onClick={() => onSort?.("amount")}
                    />
                  </div>
                </th>
                <th
                  style={{width: "100px", borderRadius: 0}}
                  className="text-end"
                >
                  Due Date
                </th>
                <th style={{width: "100px", borderRadius: 0}}>Status</th>
                <th style={{width: "100px", borderRadius: 0}}>Payment</th>
                {enableActions && (
                  <th
                    style={{width: "80px", borderRadius: 0}}
                    className="text-center"
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {/* All the existing table body content remains the same */}
              {/* Active Purchases */}
              {separatedPurchases.active.map((purchase) => {
                const amount = parseFloat(
                  purchase.amount ||
                    purchase.total ||
                    purchase.totals?.finalTotal ||
                    0
                );
                const balance = parseFloat(
                  purchase.balance ||
                    purchase.balanceAmount ||
                    purchase.pendingAmount ||
                    purchase.payment?.pendingAmount ||
                    0
                );
                const paidAmount = parseFloat(
                  purchase.paidAmount || purchase.payment?.paidAmount || 0
                );
                const paymentStatus =
                  purchase.paymentStatus ||
                  purchase.payment?.status ||
                  (balance <= 0
                    ? "paid"
                    : paidAmount > 0
                    ? "partial"
                    : "pending");
                const itemsCount = (purchase.items || []).length;
                const purchaseId = purchase._id || purchase.id;
                const isSelected = selectedPurchases.includes(purchaseId);

                return (
                  <tr
                    key={purchaseId}
                    className={isSelected ? "table-active" : ""}
                    style={{cursor: "pointer", height: "60px"}}
                    onClick={() => handleViewPurchase(purchase)}
                  >
                    {enableBulkActions && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <Form.Check
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (onSelectionChange) {
                              const newSelection = e.target.checked
                                ? [...selectedPurchases, purchaseId]
                                : selectedPurchases.filter(
                                    (id) => id !== purchaseId
                                  );
                              onSelectionChange(newSelection);
                            }
                          }}
                        />
                      </td>
                    )}
                    <td>
                      <small className="text-muted">
                        {formatDate(
                          purchase.purchaseDate ||
                            purchase.billDate ||
                            purchase.date ||
                            purchase.invoiceDate
                        )}
                      </small>
                    </td>
                    <td>
                      <div className="d-flex flex-column">
                        <strong className="text-primary">
                          {purchase.purchaseNumber ||
                            purchase.billNumber ||
                            purchase.billNo ||
                            purchase.purchaseOrderNumber ||
                            purchase.invoiceNumber ||
                            "N/A"}
                        </strong>
                        {/* Source indicators */}
                        {((purchase.companyId?.toString() !==
                          companyId?.toString() &&
                          !purchase.sourceCompanyId &&
                          !purchase.isAutoGenerated) ||
                          (purchase.isAutoGenerated === true &&
                            purchase.generatedFrom === "sales_invoice" &&
                            purchase.sourceCompanyId?.toString() !==
                              companyId?.toString())) && (
                          <small className="text-info">
                            <FontAwesomeIcon
                              icon={faExchangeAlt}
                              className="me-1"
                            />
                            From:{" "}
                            {purchase.correspondingSalesInvoiceNumber ||
                              purchase.sourceInvoiceNumber ||
                              "Sales Invoice"}
                          </small>
                        )}
                        {((purchase.companyId?.toString() ===
                          companyId?.toString() &&
                          !purchase.sourceCompanyId &&
                          !purchase.isAutoGenerated) ||
                          (purchase.isAutoGenerated === true &&
                            purchase.generatedFrom === "sales_invoice" &&
                            purchase.sourceCompanyId?.toString() ===
                              companyId?.toString())) && (
                          <small className="text-success">
                            <FontAwesomeIcon
                              icon={faExchangeAlt}
                              className="me-1"
                            />
                            Self Generated
                            {purchase.correspondingSalesInvoiceNumber &&
                              ` from ${purchase.correspondingSalesInvoiceNumber}`}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="fw-medium">
                          {purchase.supplierName ||
                            purchase.supplier?.name ||
                            purchase.partyName ||
                            "Unknown Supplier"}
                        </div>
                        {(purchase.supplierMobile ||
                          purchase.supplier?.mobile ||
                          purchase.partyPhone ||
                          purchase.mobileNumber) && (
                          <small className="text-muted">
                            {purchase.supplierMobile ||
                              purchase.supplier?.mobile ||
                              purchase.partyPhone ||
                              purchase.mobileNumber}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge bg="info" className="me-1">
                        {itemsCount} item{itemsCount !== 1 ? "s" : ""}
                      </Badge>
                    </td>
                    <td className="text-end">
                      <strong>{formatCurrency(amount)}</strong>
                    </td>
                    <td className="text-end">
                      <small className="text-muted">
                        {calculateDueDate(purchase)}
                      </small>
                    </td>
                    <td>
                      <StatusBadge
                        status={purchase.status}
                        paymentStatus={paymentStatus}
                        amount={amount}
                        balance={balance}
                        purchase={purchase}
                      />
                    </td>
                    <td>
                      <Badge
                        bg={
                          purchase.paymentMethod === "cash"
                            ? "success"
                            : purchase.paymentMethod === "bank" ||
                              purchase.paymentMethod === "bank_transfer"
                            ? "primary"
                            : purchase.paymentMethod === "upi"
                            ? "info"
                            : "secondary"
                        }
                        className="text-capitalize"
                      >
                        {purchase.paymentMethod ||
                          purchase.payment?.method ||
                          purchase.paymentType ||
                          "Cash"}
                      </Badge>
                    </td>
                    {enableActions && (
                      <td
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionButton purchase={purchase} />
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Cancelled Purchases Section - keeps all existing code */}
              {separatedPurchases.cancelled.length > 0 && (
                <>
                  <tr className="cancelled-section">
                    <td
                      colSpan={enableBulkActions ? "10" : "9"}
                      className="py-3 text-center border-0"
                    >
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() =>
                          setShowCancelledPurchases(!showCancelledPurchases)
                        }
                        style={{borderRadius: 0}}
                      >
                        <FontAwesomeIcon
                          icon={
                            showCancelledPurchases ? faChevronUp : faChevronDown
                          }
                          className="me-2"
                        />
                        Cancelled {labels.documentNamePlural}
                        <Badge bg="warning" className="ms-2">
                          {separatedPurchases.cancelled.length}
                        </Badge>
                      </Button>
                    </td>
                  </tr>

                  {showCancelledPurchases &&
                    separatedPurchases.cancelled.map((purchase) => {
                      const amount = parseFloat(
                        purchase.amount ||
                          purchase.total ||
                          purchase.totals?.finalTotal ||
                          0
                      );
                      const balance = parseFloat(
                        purchase.balance ||
                          purchase.balanceAmount ||
                          purchase.pendingAmount ||
                          purchase.payment?.pendingAmount ||
                          0
                      );
                      const paidAmount = parseFloat(
                        purchase.paidAmount || purchase.payment?.paidAmount || 0
                      );
                      const paymentStatus =
                        purchase.paymentStatus ||
                        purchase.payment?.status ||
                        (balance <= 0
                          ? "paid"
                          : paidAmount > 0
                          ? "partial"
                          : "pending");
                      const itemsCount = (purchase.items || []).length;
                      const purchaseId = purchase._id || purchase.id;

                      return (
                        <tr
                          key={`cancelled-${purchaseId}`}
                          className="table-secondary opacity-75"
                          style={{cursor: "pointer", height: "60px"}}
                          onClick={() => handleViewPurchase(purchase)}
                        >
                          {enableBulkActions && <td></td>}
                          <td>
                            <small className="text-muted">
                              {formatDate(
                                purchase.purchaseDate ||
                                  purchase.billDate ||
                                  purchase.date ||
                                  purchase.invoiceDate
                              )}
                            </small>
                          </td>
                          <td>
                            <div className="d-flex flex-column">
                              <strong className="text-muted text-decoration-line-through">
                                {purchase.purchaseNumber ||
                                  purchase.billNumber ||
                                  purchase.billNo ||
                                  purchase.purchaseOrderNumber ||
                                  purchase.invoiceNumber ||
                                  "N/A"}
                              </strong>
                              <div className="mt-1">
                                <small className="text-danger">
                                  <FontAwesomeIcon
                                    icon={faBan}
                                    className="me-1"
                                  />
                                  Cancelled
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="fw-medium text-muted">
                              {purchase.supplierName ||
                                purchase.supplier?.name ||
                                purchase.partyName ||
                                "Unknown Supplier"}
                            </div>
                          </td>
                          <td>
                            <Badge bg="secondary" className="me-1">
                              {itemsCount} item{itemsCount !== 1 ? "s" : ""}
                            </Badge>
                          </td>
                          <td className="text-end">
                            <strong className="text-muted text-decoration-line-through">
                              {formatCurrency(amount)}
                            </strong>
                          </td>
                          <td className="text-end">
                            <small className="text-muted text-decoration-line-through">
                              {calculateDueDate(purchase)}
                            </small>
                          </td>
                          <td>
                            <StatusBadge
                              status={purchase.status}
                              paymentStatus={paymentStatus}
                              amount={amount}
                              balance={balance}
                              purchase={purchase}
                            />
                          </td>
                          <td>
                            <Badge bg="secondary" className="text-capitalize">
                              {purchase.paymentMethod ||
                                purchase.payment?.method ||
                                purchase.paymentType ||
                                "Cash"}
                            </Badge>
                          </td>
                          {enableActions && (
                            <td
                              className="text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ActionButton purchase={purchase} />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </>
              )}

              {/* Empty State */}
              {separatedPurchases.active.length === 0 &&
                separatedPurchases.cancelled.length === 0 && (
                  <tr>
                    <td
                      colSpan={enableBulkActions ? "10" : "9"}
                      className="text-center py-5 border-0"
                    >
                      {sourceFilter === "all" ? (
                        <EmptyStateComponent />
                      ) : (
                        <div className="text-center py-5">
                          <FontAwesomeIcon
                            icon={
                              sourceFilter === "self_generated"
                                ? faExchangeAlt
                                : faTruck
                            }
                            size="4x"
                            className="text-muted mb-4"
                          />
                          <h4 className="text-muted mb-3">
                            No{" "}
                            {sourceFilter === "self_generated"
                              ? "Self Generated"
                              : "Supplier"}{" "}
                            {labels.documentNamePlural} Found
                          </h4>
                          <p className="text-muted mb-4">
                            {sourceFilter === "self_generated"
                              ? "No purchase invoices have been generated from your sales invoices yet. These are created when you sell to other companies."
                              : "No purchase invoices from suppliers found. These include both manual entries and supplier-generated invoices."}
                          </p>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleSourceFilterChange("all")}
                            style={{borderRadius: 0}}
                          >
                            <FontAwesomeIcon
                              icon={faClipboardList}
                              className="me-2"
                            />
                            View All Purchases
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* All the existing modals and components remain exactly the same */}
      {/* ✅ Print Modal */}
      <PrintModal />

      {/* ✅ Hidden Print Component */}
      {printModalShow && printData && (
        <div style={{display: "none"}}>
          {bulkPrintMode ? (
            <div ref={printComponentRef}>
              {printData.purchases?.map((purchaseData, index) => (
                <div key={index} className="mb-4 page-break">
                  <PurchaseInvoice invoiceData={purchaseData} />
                  {index < printData.purchases.length - 1 && (
                    <div style={{pageBreakAfter: "always"}} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div ref={printComponentRef}>
              <PurchaseInvoice invoiceData={printData} />
            </div>
          )}
        </div>
      )}

      {/* ✅ FIXED: Hidden Print Preview Component with proper data structure */}
      {showPrintPreview && printData && (
        <div style={{display: "none"}}>
          <PurchaseInvoice
            ref={printRef}
            invoiceData={printData}
            onPrint={() => {
              console.log("🖨️ Print button clicked from component");
              handlePrint();
            }}
          />
        </div>
      )}

      {/* ✅ Print Loading Overlay */}
      {printLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center print-loading-overlay"
          style={{zIndex: 9999}}
        >
          <div className="text-center print-loading-content">
            <Spinner
              animation="border"
              variant="primary"
              size="lg"
              className="mb-3"
            />
            <h5 className="text-dark">Preparing Invoice for Print...</h5>
            <p className="text-muted">
              Please wait while we format the invoice
            </p>
            <div className="mt-3">
              <div
                className="progress"
                style={{height: "4px", borderRadius: 0}}
              >
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{width: "75%", borderRadius: 0}}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Universal View Modal with print support */}
      {selectedPurchase && (
        <UniversalViewModal
          show={viewModalShow}
          onHide={() => {
            setViewModalShow(false);
            setSelectedPurchase(null);
            setModalError(null);
          }}
          transaction={selectedPurchase}
          documentType={
            isPurchaseOrdersMode ? "purchase-order" : "purchase-invoice"
          }
          onEdit={handleEditPurchase}
          onPrint={handlePrintFromModal}
          onDownload={onDownloadPurchase}
          onShare={onSharePurchase}
          onConvert={onConvertPurchase}
          onGenerateSalesOrder={onMarkAsOrdered}
          onDuplicate={handleDuplicatePurchase}
          onDelete={handleDeletePurchase}
          loading={modalLoading}
          error={modalError}
          currentUser={currentUser}
          currentCompany={currentCompany}
          companyId={companyId}
          addToast={addToast}
          enableActions={enableActions}
        />
      )}

      {/* ✅ Modal Loading State */}
      {modalLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50"
          style={{zIndex: 9999}}
        >
          <div className="text-center text-white">
            <Spinner
              animation="border"
              variant="light"
              size="lg"
              className="mb-3"
            />
            <h5>Loading Purchase Details...</h5>
            <p className="text-muted">Please wait while we fetch the data</p>
          </div>
        </div>
      )}

      {/* ✅ Modal Error State */}
      {modalError && !modalLoading && (
        <Alert
          variant="danger"
          className="mt-3"
          dismissible
          onClose={() => setModalError(null)}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <strong>Error:</strong> {modalError}
        </Alert>
      )}
    </>
  );
}

export default PurchaseBillsTable;
