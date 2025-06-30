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
// ✅ ADD: Import UniversalViewModal
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
        left: triggerRect.right + scrollLeft - 200, // Align to right
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

// Custom Dropdown Item Component
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

// Custom Dropdown Divider Component
const DropdownDivider = () => (
  <div className="dropdown-divider my-1" style={{margin: "4px 0"}} />
);

// Custom Dropdown Header Component
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
      key: "self_generated", // ✅ CHANGED: Created by your company
      label: "Self Generated",
      icon: faExchangeAlt,
      color: "info",
      description: "Created by your company from your sales invoices",
    },
    {
      key: "from_suppliers", // ✅ CHANGED: Created by suppliers
      label: "From Suppliers",
      icon: faTruck,
      color: "success",
      description: "Created by suppliers (manual or from their sales)",
    },
  ];

  return (
    <div className="purchase-source-filter mb-3">
      <div className="d-flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const count = purchaseCounts[option.key] || 0;
          const isActive = activeFilter === option.key;

          return (
            <button
              key={option.key}
              type="button"
              className={`btn ${
                isActive ? `btn-${option.color}` : `btn-outline-${option.color}`
              } d-flex align-items-center position-relative`}
              onClick={() => onFilterChange(option.key)}
              disabled={isLoading}
              style={{borderRadius: 0}}
              title={option.description}
            >
              <FontAwesomeIcon icon={option.icon} className="me-2" />
              {option.label}
              <Badge
                bg={isActive ? "light" : option.color}
                text={isActive ? "dark" : "white"}
                className="ms-2"
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

  // ✅ UPDATED: Source filter state with new default
  const [sourceFilter, setSourceFilter] = useState("all");
  const [filteredPurchases, setFilteredPurchases] = useState(purchases);

  // Portal dropdown state
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRefs = useRef({});

  const isPurchaseOrdersMode = useMemo(() => {
    return (
      isPurchaseOrderView ||
      location.pathname.includes("/purchase-orders") ||
      title?.toLowerCase().includes("order")
    );
  }, [isPurchaseOrderView, location.pathname, title]);

  const purchaseCounts = useMemo(() => {
    const counts = {
      all: purchases.length,
      self_generated: 0,
      from_suppliers: 0,
    };

    purchases.forEach((purchase) => {
      // ✅ CORRECTED: Check if this purchase was created by YOUR company
      const isCreatedByYourCompany =
        // Manual creation by your company (no external source)
        (purchase.companyId?.toString() === companyId?.toString() &&
          !purchase.sourceCompanyId &&
          !purchase.isAutoGenerated) ||
        // Auto-generated from YOUR sales invoice (you sold to someone else)
        (purchase.isAutoGenerated === true &&
          purchase.generatedFrom === "sales_invoice" &&
          purchase.sourceCompanyId?.toString() === companyId?.toString()); // ✅ FIXED: YOUR company is the SOURCE

      if (isCreatedByYourCompany) {
        counts.self_generated++;
      } else {
        // Created by suppliers or auto-generated from supplier's sales
        counts.from_suppliers++;
      }
    });

    console.log("🔢 Purchase counts by creator:", {
      all: counts.all,
      selfGenerated: counts.self_generated,
      fromSuppliers: counts.from_suppliers,
      companyId: companyId,
    });

    return counts;
  }, [purchases, companyId]);

  // ✅ FIXED: Filter purchases based on WHO created them
  const filterPurchasesBySource = useCallback(
    (purchases, filter) => {
      if (filter === "all") {
        return purchases;
      }

      return purchases.filter((purchase) => {
        // ✅ CORRECTED: Check if this purchase was created by YOUR company
        const isCreatedByYourCompany =
          // Manual creation by your company (no external source)
          (purchase.companyId?.toString() === companyId?.toString() &&
            !purchase.sourceCompanyId &&
            !purchase.isAutoGenerated) ||
          // Auto-generated from YOUR sales invoice (you sold to someone else)
          (purchase.isAutoGenerated === true &&
            purchase.generatedFrom === "sales_invoice" &&
            purchase.sourceCompanyId?.toString() === companyId?.toString()); // ✅ FIXED: YOUR company is the SOURCE

        console.log(`🔍 Purchase ${purchase.purchaseNumber || purchase._id}:`, {
          isAutoGenerated: purchase.isAutoGenerated,
          generatedFrom: purchase.generatedFrom,
          targetCompanyId: purchase.targetCompanyId,
          sourceCompanyId: purchase.sourceCompanyId,
          companyId: purchase.companyId,
          currentCompanyId: companyId,
          isCreatedByYourCompany: isCreatedByYourCompany,
          filterMatch:
            filter === "self_generated"
              ? isCreatedByYourCompany
              : !isCreatedByYourCompany,
        });

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

  // ✅ NEW: Update filtered purchases when source filter changes
  useEffect(() => {
    const filtered = filterPurchasesBySource(purchases, sourceFilter);
    setFilteredPurchases(filtered);
  }, [purchases, sourceFilter, filterPurchasesBySource]);

  // ✅ NEW: Handle source filter change
  const handleSourceFilterChange = (newFilter) => {
    setSourceFilter(newFilter);
    console.log(`🔍 Source filter changed to: ${newFilter}`);
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
      console.log("🔧 Transforming purchase for edit:", purchase);

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

      console.log("✅ Transformed purchase for edit:", {
        originalItemsCount: (purchase.items || []).length,
        transformedItemsCount: transformedItems.length,
        firstItem: transformedItems[0],
        paymentMethod: transformedPurchase.paymentMethod,
        totalAmount: transformedPurchase.amount,
        supplierName: transformedPurchase.supplierName,
      });

      return transformedPurchase;
    },
    [isPurchaseOrdersMode, companyId]
  );

  const handleEditPurchase = useCallback(
    (purchase) => {
      console.log("📝 Edit purchase clicked:", purchase);

      try {
        const transformedPurchase = transformPurchaseForEdit(purchase);

        const editPath = `/companies/${companyId}/${labels.editPath}/${
          purchase._id || purchase.id
        }/edit`;

        console.log("🚀 Navigating to edit path:", editPath);
        console.log("📋 Passing purchase data:", transformedPurchase);

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
        console.error("❌ Error handling edit purchase:", error);
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
      console.log("👁️ View purchase clicked:", purchase);

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
        console.error("❌ Error handling view purchase:", error);
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
        console.warn("⚠️ Delete already in progress for:", purchaseId);
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
          console.log("❌ Delete cancelled by user");
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

        console.log("🗑️ Deleting purchase:", purchaseId, deleteOptions);

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

          console.log("✅ Purchase deletion completed:", purchaseId);
        } else {
          throw new Error(
            deleteResponse.message ||
              `Failed to delete ${isPurchaseOrdersMode ? "order" : "purchase"}`
          );
        }
      } catch (error) {
        console.error("❌ Delete error:", error);

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
      console.log("📋 Duplicate purchase clicked:", purchase);

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
        console.error("❌ Error duplicating purchase:", error);
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

  // ✅ Updated: Separate active and cancelled purchases using filtered purchases
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

    // ✅ FIXED: Check if created by your company (self-generated)
    const isSelfGenerated =
      // Manual creation by your company (no external source)
      (purchase?.companyId?.toString() === companyId?.toString() &&
        !purchase?.sourceCompanyId &&
        !purchase?.isAutoGenerated) ||
      // Auto-generated from YOUR sales invoice (you sold to someone else)
      (purchase?.isAutoGenerated === true &&
        purchase?.generatedFrom === "sales_invoice" &&
        purchase?.sourceCompanyId?.toString() === companyId?.toString()); // ✅ FIXED: YOUR company is the SOURCE

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

  // Action button component with Portal dropdown
  const ActionButton = ({purchase}) => {
    const purchaseId = purchase._id || purchase.id;
    const isDeleting = deletingPurchases.has(purchaseId);
    const isCancelled =
      purchase.status === "cancelled" || purchase.status === "deleted";
    const isOpen = openDropdownId === purchaseId;

    const docType = getDocumentType(purchase);
    const isOrder = docType === "purchase-order";
    const docLabels = getDocumentLabels(docType);

    // Set up ref for this dropdown
    useEffect(() => {
      if (!dropdownRefs.current[purchaseId]) {
        dropdownRefs.current[purchaseId] = React.createRef();
      }
    }, [purchaseId]);

    const handleToggleDropdown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpenDropdownId(isOpen ? null : purchaseId);
    };

    const handleCloseDropdown = () => {
      setOpenDropdownId(null);
    };

    const handleDelete = async () => {
      if (isDeleting || isCancelled) {
        console.warn(
          "⚠️ Cannot delete - purchase is cancelled or being deleted"
        );
        return;
      }
      await handleDeletePurchase(purchase);
    };

    const handleEdit = () => {
      if (isCancelled) {
        addToast?.("Cannot edit cancelled purchase", "warning");
        return;
      }
      handleEditPurchase(purchase);
    };

    return (
      <>
        <button
          ref={dropdownRefs.current[purchaseId]}
          type="button"
          className="btn btn-sm btn-outline-secondary border-0 p-2"
          onClick={handleToggleDropdown}
          disabled={isDeleting || modalLoading}
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
          <DropdownItem onClick={() => handleViewPurchase(purchase)}>
            <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
            View Details
          </DropdownItem>

          {enableActions && !isCancelled && (
            <>
              <DropdownItem
                onClick={handleEdit}
                disabled={isDeleting || modalLoading}
              >
                <FontAwesomeIcon icon={faEdit} className="me-2 text-info" />
                Edit {docLabels.documentName}
              </DropdownItem>

              <DropdownItem
                onClick={() => handleDuplicatePurchase(purchase)}
                disabled={isDeleting || modalLoading}
              >
                <FontAwesomeIcon icon={faCopy} className="me-2 text-success" />
                Duplicate
              </DropdownItem>

              <DropdownDivider />
            </>
          )}

          <DropdownItem onClick={() => onPrintPurchase?.(purchase)}>
            <FontAwesomeIcon icon={faPrint} className="me-2 text-secondary" />
            Print
          </DropdownItem>

          <DropdownItem onClick={() => onSharePurchase?.(purchase)}>
            <FontAwesomeIcon icon={faShare} className="me-2 text-warning" />
            Share
          </DropdownItem>

          <DropdownItem onClick={() => onDownloadPurchase?.(purchase)}>
            <FontAwesomeIcon icon={faDownload} className="me-2 text-info" />
            Download
          </DropdownItem>

          {isOrder && !isCancelled && (
            <>
              <DropdownDivider />
              <DropdownHeader>Order Actions</DropdownHeader>
              <DropdownItem onClick={() => onMarkAsOrdered?.(purchase)}>
                <FontAwesomeIcon
                  icon={faShoppingCart}
                  className="me-2 text-primary"
                />
                Mark as Ordered
              </DropdownItem>
              <DropdownItem onClick={() => onMarkAsReceived?.(purchase)}>
                <FontAwesomeIcon icon={faTruck} className="me-2 text-success" />
                Mark as Received
              </DropdownItem>
              <DropdownItem onClick={() => onConvertPurchase?.(purchase)}>
                <FontAwesomeIcon
                  icon={faExchangeAlt}
                  className="me-2 text-warning"
                />
                Convert to Invoice
              </DropdownItem>
            </>
          )}

          {!isOrder && !isCancelled && (
            <>
              <DropdownDivider />
              <DropdownHeader>Invoice Actions</DropdownHeader>
              <DropdownItem onClick={() => onConvertPurchase?.(purchase)}>
                <FontAwesomeIcon
                  icon={faExchangeAlt}
                  className="me-2 text-info"
                />
                Convert to Order
              </DropdownItem>
            </>
          )}

          {enableActions && !isCancelled && (
            <>
              <DropdownDivider />
              <DropdownItem
                onClick={handleDelete}
                disabled={isDeleting || modalLoading}
                variant="danger"
              >
                <FontAwesomeIcon
                  icon={isDeleting ? faSpinner : faTrash}
                  className={`me-2 ${isDeleting ? "fa-spin" : ""}`}
                />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownItem>
            </>
          )}
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
        
        /* ✅ ENHANCED: Source filter styling with no border radius */
        .purchase-source-filter {
          background: #f8f9fa;
          padding: 15px;
          border: 1px solid #e9ecef;
          margin-bottom: 0;
          border-radius: 0 !important;
        }
        
        .purchase-source-filter .btn {
          transition: all 0.3s ease;
          font-weight: 500;
          font-size: 14px;
          border-radius: 0 !important;
        }
        
        .purchase-source-filter .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-radius: 0 !important;
        }
        
        .purchase-source-filter .badge {
          font-size: 11px;
          min-width: 20px;
          border-radius: 0 !important;
        }
        
        /* ✅ ENHANCED: Ensure card components have no border radius */
        .card {
          border-radius: 0 !important;
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
      `}
      </style>

      {/* ✅ NEW: Add source filter above the card */}
      <PurchaseSourceFilter
        activeFilter={sourceFilter}
        onFilterChange={handleSourceFilterChange}
        purchaseCounts={purchaseCounts}
        isLoading={isLoading}
      />

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
                        {/* ✅ ENHANCED: Show source indicator for auto-generated invoices */}
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
                        {/* ✅ ENHANCED: Show self-generated indicator */}
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

              {/* Cancelled Purchases Section */}
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
                              {/* ✅ ENHANCED: Show source indicator for cancelled auto-generated invoices */}
                              {((purchase.companyId?.toString() !==
                                companyId?.toString() &&
                                !purchase.sourceCompanyId &&
                                !purchase.isAutoGenerated) ||
                                (purchase.isAutoGenerated === true &&
                                  purchase.generatedFrom === "sales_invoice" &&
                                  purchase.sourceCompanyId?.toString() !==
                                    companyId?.toString())) && (
                                <small className="text-muted">
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

      {/* ✅ NEW: Universal View Modal */}
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
          onPrint={onPrintPurchase}
          onDownload={onDownloadPurchase}
          onShare={onSharePurchase}
          onConvert={onConvertPurchase}
          onGenerateSalesOrder={onMarkAsOrdered} // For purchase orders
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
