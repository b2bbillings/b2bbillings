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
} from "react-bootstrap";
import {useNavigate, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faChartLine,
  faFileExcel,
  faPrint,
  faSort,
  faEllipsisV,
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
  faSpinner, // ✅ Added faSpinner import
} from "@fortawesome/free-solid-svg-icons";
import purchaseOrderService from "../../../../services/purchaseOrderService";
import purchaseService from "../../../../services/purchaseService";

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
  // ✅ Enhanced props for better functionality
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

  // ✅ Enhanced state for view modal with additional features
  const [viewModalShow, setViewModalShow] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // ✅ FIXED: Add better state management for delete operations
  const [deletingPurchases, setDeletingPurchases] = useState(new Set());

  // ✅ Local search and filter state if not provided
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);
  const [localFilterStatus, setLocalFilterStatus] = useState(filterStatus);

  const isPurchaseOrdersMode = useMemo(() => {
    return (
      isPurchaseOrderView ||
      location.pathname.includes("/purchase-orders") ||
      title?.toLowerCase().includes("order")
    );
  }, [isPurchaseOrderView, location.pathname, title]);

  // ✅ Add this helper function near the top of the component (around line 50)
  const getDocumentType = useCallback(
    (purchase) => {
      // Check various indicators to determine document type
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

      // Default based on current mode
      return isPurchaseOrdersMode ? "purchase-order" : "purchase-invoice";
    },
    [isPurchaseOrdersMode]
  );
  // In PurchaseBillsTable.jsx, update the getDocumentLabels function:

  const getDocumentLabels = (documentType = null) => {
    // If specific document type is passed, use it
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
        documentName: "Purchase Invoice", // ✅ Changed from "Purchase Bill"
        documentNamePlural: "Purchase Invoices", // ✅ Changed from "Purchase Bills"
        listPath: "purchases",
        editPath: "purchases",
        createPath: "purchases/new",
      };
    }

    // Default based on current mode/path
    return isPurchaseOrdersMode
      ? {
          documentName: "Purchase Order",
          documentNamePlural: "Purchase Orders",
          listPath: "purchase-orders",
          editPath: "purchase-orders",
          createPath: "purchase-orders/new",
        }
      : {
          documentName: "Purchase Invoice", // ✅ Changed from "Purchase Bill"
          documentNamePlural: "Purchase Invoices", // ✅ Changed from "Purchase Bills"
          listPath: "purchases",
          editPath: "purchases",
          createPath: "purchases/new",
        };
  };

  const labels = getDocumentLabels();

  // ✅ Enhanced data transformation for consistent structure
  const transformPurchaseForEdit = useCallback(
    (purchase) => {
      console.log("🔧 Transforming purchase for edit:", purchase);

      // ✅ Transform items to ensure proper structure
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

        // Calculate amounts
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
          // ✅ Add selected product info for form compatibility
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

      // ✅ Transform supplier data
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

      // ✅ Calculate financial data
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

      // ✅ Enhanced payment data
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
        // ✅ Bank account information
        bankAccountId:
          purchase.payment?.bankAccountId || purchase.bankAccountId || null,
        bankAccountName:
          purchase.payment?.bankAccountName || purchase.bankAccountName || "",
        bankName: purchase.payment?.bankName || purchase.bankName || "",
        accountNumber:
          purchase.payment?.accountNumber || purchase.accountNumber || "",
      };

      // ✅ Comprehensive transformed purchase
      const transformedPurchase = {
        // ✅ IDs
        id: purchase._id || purchase.id,
        _id: purchase._id || purchase.id,

        // ✅ Document type
        documentType: isPurchaseOrdersMode ? "purchase-order" : "purchase",

        // ✅ Document numbers with comprehensive mapping
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

        // ✅ Dates with multiple fallbacks
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

        // ✅ Supplier information (store in customer field for form compatibility)
        customer: supplierData, // Store supplier as customer for form compatibility
        supplier: supplierData,

        // ✅ Legacy supplier fields for compatibility
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

        // ✅ Items - CRITICAL: Ensure items are properly structured
        items: transformedItems,
        lineItems: transformedItems,

        // ✅ Financial data
        amount: totalAmount,
        total: totalAmount,
        grandTotal: totalAmount,
        balance: balanceAmount,
        balanceAmount: balanceAmount,

        // ✅ Payment information
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

        // ✅ Bank account information
        bankAccountId: paymentData.bankAccountId,
        bankAccountName: paymentData.bankAccountName,
        bankName: paymentData.bankName,
        accountNumber: paymentData.accountNumber,

        // ✅ Totals object
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

        // ✅ Status and configuration
        status: purchase.status,
        purchaseOrderStatus: purchase.purchaseOrderStatus || purchase.status,
        gstEnabled:
          purchase.gstEnabled !== undefined ? purchase.gstEnabled : true,

        // ✅ Additional fields
        notes: purchase.notes || purchase.description || "",
        terms: purchase.terms || purchase.termsAndConditions || "",
        description: purchase.description || purchase.notes || "",
        termsAndConditions: purchase.termsAndConditions || purchase.terms || "",

        // ✅ Purchase-specific fields
        purchaseType: purchase.purchaseType || "purchase",
        invoiceType: purchase.invoiceType || "gst",
        taxMode: purchase.taxMode || "without-tax",
        priceIncludesTax: Boolean(purchase.priceIncludesTax),

        // ✅ Company and employee context
        companyId: purchase.companyId || companyId,
        employeeName: purchase.employeeName,
        employeeId: purchase.employeeId,
        createdBy: purchase.createdBy,
        createdByName: purchase.createdByName,

        // ✅ Timestamps
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,

        // ✅ Additional metadata for modal
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

  // ✅ Enhanced edit handler
  const handleEditPurchase = useCallback(
    (purchase) => {
      console.log("📝 Edit purchase clicked:", purchase);

      try {
        // Transform purchase data for proper editing
        const transformedPurchase = transformPurchaseForEdit(purchase);

        // Navigate to edit page with enhanced state
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

        // Close view modal if open
        if (viewModalShow) {
          setViewModalShow(false);
          setSelectedPurchase(null);
        }

        // Also call parent handler if provided
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

  // ✅ Enhanced view handler with loading states
  const handleViewPurchase = useCallback(
    async (purchase) => {
      console.log("👁️ View purchase clicked:", purchase);

      try {
        setModalLoading(true);
        setModalError(null);

        // Transform purchase data for viewing
        const transformedPurchase = transformPurchaseForEdit(purchase);

        // Add additional view-specific data
        const enhancedPurchase = {
          ...transformedPurchase,
          // ✅ Add display-friendly fields
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

  // ✅ Updated delete handler
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

        // ✅ Use the correct service based on mode
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
  // ✅ Enhanced duplicate handler
  const handleDuplicatePurchase = useCallback(
    (purchase) => {
      console.log("📋 Duplicate purchase clicked:", purchase);

      try {
        const transformedPurchase = transformPurchaseForEdit(purchase);

        // Remove ID fields for duplication
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
          // Reset to draft status
          status: "draft",
          // Set current date
          purchaseDate: new Date().toISOString(),
          date: new Date().toISOString(),
          billDate: new Date().toISOString(),
        };

        // Navigate to create page with duplicate data
        const createPath = `/companies/${companyId}/${labels.createPath}`;

        navigate(createPath, {
          state: {
            duplicateData: duplicateData,
            isDuplicate: true,
            originalPurchase: purchase,
            returnPath: location.pathname,
          },
        });

        // Close view modal if open
        if (viewModalShow) {
          setViewModalShow(false);
          setSelectedPurchase(null);
        }

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

  // ✅ Modal action handlers
  const handleModalEdit = useCallback(() => {
    if (selectedPurchase) {
      handleEditPurchase(selectedPurchase);
    }
  }, [selectedPurchase, handleEditPurchase]);

  const handleModalPrint = useCallback(() => {
    if (selectedPurchase && onPrintPurchase) {
      onPrintPurchase(selectedPurchase);
    }
  }, [selectedPurchase, onPrintPurchase]);

  const handleModalShare = useCallback(() => {
    if (selectedPurchase && onSharePurchase) {
      onSharePurchase(selectedPurchase);
    }
  }, [selectedPurchase, onSharePurchase]);

  const handleModalDownload = useCallback(() => {
    if (selectedPurchase && onDownloadPurchase) {
      onDownloadPurchase(selectedPurchase);
    }
  }, [selectedPurchase, onDownloadPurchase]);

  const handleModalDelete = useCallback(() => {
    if (selectedPurchase && !modalLoading) {
      const purchaseId = selectedPurchase._id || selectedPurchase.id;
      if (!deletingPurchases.has(purchaseId)) {
        handleDeletePurchase(selectedPurchase);
      }
    }
  }, [selectedPurchase, handleDeletePurchase, modalLoading, deletingPurchases]);

  const handleModalDuplicate = useCallback(() => {
    if (selectedPurchase) {
      handleDuplicatePurchase(selectedPurchase);
    }
  }, [selectedPurchase, handleDuplicatePurchase]);

  // ✅ Other action handlers
  const handlePrintPurchase = useCallback(
    (purchase) => {
      if (onPrintPurchase) {
        onPrintPurchase(purchase);
      }
    },
    [onPrintPurchase]
  );

  const handleSharePurchase = useCallback(
    (purchase) => {
      if (onSharePurchase) {
        onSharePurchase(purchase);
      }
    },
    [onSharePurchase]
  );

  const handleDownloadPurchase = useCallback(
    (purchase) => {
      if (onDownloadPurchase) {
        onDownloadPurchase(purchase);
      }
    },
    [onDownloadPurchase]
  );

  const handleConvertPurchase = useCallback(
    (purchase) => {
      if (onConvertPurchase) {
        onConvertPurchase(purchase);
      }
    },
    [onConvertPurchase]
  );

  const handleMarkAsOrdered = useCallback(
    (purchase) => {
      if (onMarkAsOrdered) {
        onMarkAsOrdered(purchase);
      }
    },
    [onMarkAsOrdered]
  );

  const handleMarkAsReceived = useCallback(
    (purchase) => {
      if (onMarkAsReceived) {
        onMarkAsReceived(purchase);
      }
    },
    [onMarkAsReceived]
  );

  const handleCompletePurchase = useCallback(
    (purchase) => {
      if (onCompletePurchase) {
        onCompletePurchase(purchase);
      }
    },
    [onCompletePurchase]
  );

  // ✅ ENHANCED: Filter and separate cancelled purchases
  const separatedPurchases = useMemo(() => {
    const active = [];
    const cancelled = [];

    purchases.forEach((purchase) => {
      if (purchase.status === "cancelled" || purchase.status === "deleted") {
        cancelled.push(purchase);
      } else {
        active.push(purchase);
      }
    });

    return {active, cancelled};
  }, [purchases]);

  // ✅ Update the ActionButton component around line 750
  const ActionButton = ({purchase}) => {
    const purchaseId = purchase._id || purchase.id;
    const isDeleting = deletingPurchases.has(purchaseId);
    const isCancelled =
      purchase.status === "cancelled" || purchase.status === "deleted";

    // ✅ Detect document type for this specific purchase
    const docType = getDocumentType(purchase);
    const isOrder = docType === "purchase-order";
    const docLabels = getDocumentLabels(docType);

    const handleDelete = useCallback(
      async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isDeleting || isCancelled) {
          console.warn(
            "⚠️ Cannot delete - purchase is cancelled or being deleted"
          );
          return;
        }

        await handleDeletePurchase(purchase);
      },
      [purchase, isDeleting, isCancelled, handleDeletePurchase]
    );

    const handleEdit = useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isCancelled) {
          addToast?.("Cannot edit cancelled purchase", "warning");
          return;
        }

        handleEditPurchase(purchase);
      },
      [purchase, isCancelled, handleEditPurchase, addToast]
    );

    return (
      <Dropdown>
        <Dropdown.Toggle
          variant={isCancelled ? "outline-secondary" : "outline-secondary"}
          size="sm"
          className={`border-0 ${isCancelled ? "opacity-50" : ""}`}
          id={`dropdown-${purchaseId}`}
          disabled={isDeleting || modalLoading}
        >
          <FontAwesomeIcon icon={faEllipsisV} />
        </Dropdown.Toggle>

        <Dropdown.Menu align="end">
          <Dropdown.Item onClick={() => handleViewPurchase(purchase)}>
            <FontAwesomeIcon icon={faEye} className="me-2" />
            View Details
          </Dropdown.Item>

          {enableActions && !isCancelled && (
            <>
              <Dropdown.Item
                onClick={handleEdit}
                disabled={isDeleting || modalLoading}
              >
                <FontAwesomeIcon icon={faEdit} className="me-2" />
                Edit {docLabels.documentName}
              </Dropdown.Item>

              <Dropdown.Item
                onClick={() => handleDuplicatePurchase(purchase)}
                disabled={isDeleting || modalLoading}
              >
                <FontAwesomeIcon icon={faCopy} className="me-2" />
                Duplicate
              </Dropdown.Item>

              <Dropdown.Divider />
            </>
          )}

          {/* ✅ Always show print/download options */}
          <Dropdown.Item onClick={() => handlePrintPurchase(purchase)}>
            <FontAwesomeIcon icon={faPrint} className="me-2" />
            Print
          </Dropdown.Item>

          <Dropdown.Item onClick={() => handleSharePurchase(purchase)}>
            <FontAwesomeIcon icon={faShare} className="me-2" />
            Share
          </Dropdown.Item>

          <Dropdown.Item onClick={() => handleDownloadPurchase(purchase)}>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Download
          </Dropdown.Item>

          {/* ✅ Show order-specific actions for purchase orders */}
          {isOrder && !isCancelled && (
            <>
              <Dropdown.Divider />
              <Dropdown.Header>Order Actions</Dropdown.Header>
              <Dropdown.Item onClick={() => handleMarkAsOrdered(purchase)}>
                <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                Mark as Ordered
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleMarkAsReceived(purchase)}>
                <FontAwesomeIcon icon={faTruck} className="me-2" />
                Mark as Received
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleConvertPurchase(purchase)}>
                <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                Convert to Invoice
              </Dropdown.Item>
            </>
          )}

          {/* ✅ Show invoice-specific actions for purchase invoices */}
          {!isOrder && !isCancelled && (
            <>
              <Dropdown.Divider />
              <Dropdown.Header>Invoice Actions</Dropdown.Header>
              <Dropdown.Item onClick={() => handleConvertPurchase(purchase)}>
                <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                Convert to Order
              </Dropdown.Item>
            </>
          )}

          {/* ✅ Delete option only for non-cancelled documents */}
          {enableActions && !isCancelled && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item
                onClick={handleDelete}
                className="text-danger"
                disabled={isDeleting || modalLoading}
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

  // ✅ ENHANCED: StatusBadge with cancelled status
  const StatusBadge = ({status, paymentStatus, amount, balance}) => {
    const getStatusInfo = () => {
      // ✅ Check for cancelled status first
      if (status === "cancelled" || status === "deleted") {
        return {variant: "dark", text: "Cancelled", icon: faTrash};
      }

      if (paymentStatus === "paid" || balance <= 0) {
        return {variant: "success", text: "Paid", icon: faCheck};
      } else if (
        paymentStatus === "partial" ||
        (balance > 0 && balance < amount)
      ) {
        return {variant: "warning", text: "Partial", icon: faClipboardList};
      } else if (paymentStatus === "overdue") {
        return {variant: "danger", text: "Overdue", icon: faExchangeAlt};
      } else {
        return {variant: "secondary", text: "Pending", icon: faInbox};
      }
    };

    const statusInfo = getStatusInfo();

    return (
      <Badge bg={statusInfo.variant} className="me-1 d-flex align-items-center">
        <FontAwesomeIcon icon={statusInfo.icon} className="me-1" />
        {statusInfo.text}
      </Badge>
    );
  };

  // ✅ ENHANCED: PurchaseRow component to handle cancelled styling
  const PurchaseRow = ({
    purchase,
    isSelected,
    onRowClick,
    enableBulkActions,
    enableActions,
  }) => {
    const amount = parseFloat(
      purchase.amount || purchase.total || purchase.totals?.finalTotal || 0
    );
    const paidAmount = parseFloat(
      purchase.paidAmount || purchase.payment?.paidAmount || 0
    );
    const balance = parseFloat(
      purchase.balance ||
        purchase.balanceAmount ||
        purchase.pendingAmount ||
        purchase.payment?.pendingAmount ||
        0
    );
    const paymentStatus =
      purchase.paymentStatus ||
      purchase.payment?.status ||
      (balance <= 0 ? "paid" : paidAmount > 0 ? "partial" : "pending");
    const itemsCount = (purchase.items || []).length;
    const purchaseId = purchase._id || purchase.id;
    const isCancelled =
      purchase.status === "cancelled" || purchase.status === "deleted";

    return (
      <tr
        key={purchaseId}
        className={`
        ${isSelected ? "table-active-purple" : ""} 
        ${isCancelled ? "cancelled-purchase-row" : ""}
      `}
        style={{cursor: "pointer"}}
        onClick={() => onRowClick(purchase)}
      >
        {enableBulkActions && (
          <td onClick={(e) => e.stopPropagation()}>
            <Form.Check
              type="checkbox"
              checked={isSelected}
              disabled={isCancelled} // ✅ Disable selection for cancelled purchases
              onChange={(e) => {
                if (onSelectionChange && !isCancelled) {
                  const newSelection = e.target.checked
                    ? [...selectedPurchases, purchaseId]
                    : selectedPurchases.filter((id) => id !== purchaseId);
                  onSelectionChange(newSelection);
                }
              }}
            />
          </td>
        )}
        <td className={isCancelled ? "text-muted" : ""}>
          <small className={isCancelled ? "text-muted" : "text-muted"}>
            {new Date(
              purchase.purchaseDate ||
                purchase.billDate ||
                purchase.date ||
                purchase.invoiceDate
            ).toLocaleDateString("en-GB")}
          </small>
        </td>
        <td>
          <strong
            className={
              isCancelled
                ? "text-muted text-decoration-line-through"
                : "text-primary"
            }
          >
            {purchase.purchaseNumber ||
              purchase.billNumber ||
              purchase.billNo ||
              purchase.purchaseOrderNumber ||
              purchase.invoiceNumber ||
              "N/A"}
          </strong>
          {isCancelled && (
            <div>
              <small className="text-muted fst-italic">
                <FontAwesomeIcon icon={faTrash} className="me-1" />
                Cancelled
              </small>
            </div>
          )}
        </td>
        <td>
          <div>
            <div className={`fw-medium ${isCancelled ? "text-muted" : ""}`}>
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
          <Badge
            bg={isCancelled ? "secondary" : "info"}
            className={`me-1 ${isCancelled ? "opacity-50" : ""}`}
          >
            {itemsCount} item{itemsCount !== 1 ? "s" : ""}
          </Badge>
        </td>
        <td className="text-end">
          <strong
            className={
              isCancelled ? "text-muted text-decoration-line-through" : ""
            }
          >
            ₹{amount.toLocaleString("en-IN")}
          </strong>
        </td>
        <td className="text-end">
          {paidAmount > 0 ? (
            <span
              className={`fw-medium ${
                isCancelled ? "text-muted" : "text-success"
              }`}
            >
              ₹{paidAmount.toLocaleString("en-IN")}
            </span>
          ) : (
            <span className="text-muted">₹0</span>
          )}
        </td>
        <td className="text-end">
          {balance > 0 ? (
            <span
              className={`fw-medium ${
                isCancelled ? "text-muted" : "text-danger"
              }`}
            >
              ₹{balance.toLocaleString("en-IN")}
            </span>
          ) : (
            <span className="text-muted">₹0</span>
          )}
        </td>
        <td>
          <StatusBadge
            status={purchase.status}
            paymentStatus={paymentStatus}
            amount={amount}
            balance={balance}
          />
        </td>
        <td>
          <Badge
            bg={
              isCancelled
                ? "secondary"
                : purchase.paymentMethod === "cash"
                ? "success"
                : purchase.paymentMethod === "bank" ||
                  purchase.paymentMethod === "bank_transfer"
                ? "primary"
                : purchase.paymentMethod === "upi"
                ? "info"
                : "secondary"
            }
            className={`text-capitalize ${isCancelled ? "opacity-50" : ""}`}
          >
            {purchase.paymentMethod ||
              purchase.payment?.method ||
              purchase.paymentType ||
              "Cash"}
          </Badge>
        </td>
        {enableActions && (
          <td
            className="text-center dropdown-cell"
            onClick={(e) => e.stopPropagation()}
          >
            <ActionButton purchase={purchase} />
          </td>
        )}
      </tr>
    );
  };

  // ✅ Enhanced loading component
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

  // ✅ Enhanced empty state component
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
      >
        <FontAwesomeIcon icon={faPlus} className="me-2" />
        Create {labels.documentName}
      </Button>
    </div>
  );

  // ✅ Main render logic
  if (isLoading) {
    return <LoadingComponent />;
  }

  if (!purchases || purchases.length === 0) {
    return <EmptyStateComponent />;
  }

  // ✅ Main render logic
  if (isLoading) {
    return <LoadingComponent />;
  }

  if (!purchases || purchases.length === 0) {
    return <EmptyStateComponent />;
  }

  return (
    <>
      <div className="purchase-bills-table-wrapper">
        {/* ✅ FIXED: Add responsive wrapper */}
        <div className="table-responsive-wrapper">
          <Table responsive hover className="mb-0">
            {/* ✅ UPDATED: Purple-themed header */}
            <thead className="table-header-purple">
              <tr>
                {enableBulkActions && (
                  <th width="40">
                    <Form.Check
                      type="checkbox"
                      checked={
                        selectedPurchases.length === purchases.length &&
                        purchases.length > 0
                      }
                      onChange={(e) => {
                        if (onSelectionChange) {
                          onSelectionChange(
                            e.target.checked
                              ? purchases.map((p) => p._id || p.id)
                              : []
                          );
                        }
                      }}
                      className="purple-checkbox"
                    />
                  </th>
                )}
                <th>
                  <div className="d-flex align-items-center">
                    Date
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 text-white-50"
                      style={{cursor: "pointer"}}
                      onClick={() => onSort?.("date")}
                    />
                  </div>
                </th>
                <th>{isPurchaseOrdersMode ? "Order No." : "Bill No."}</th>
                <th>Supplier</th>
                <th>Items</th>
                <th className="text-end">
                  <div className="d-flex align-items-center justify-content-end">
                    Amount
                    <FontAwesomeIcon
                      icon={faSort}
                      className="ms-1 text-white-50"
                      style={{cursor: "pointer"}}
                      onClick={() => onSort?.("amount")}
                    />
                  </div>
                </th>
                <th className="text-end">Paid</th>
                <th className="text-end">Balance</th>
                <th>Status</th>
                <th>Payment</th>
                {enableActions && <th className="text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => {
                const amount = parseFloat(
                  purchase.amount ||
                    purchase.total ||
                    purchase.totals?.finalTotal ||
                    0
                );
                const paidAmount = parseFloat(
                  purchase.paidAmount || purchase.payment?.paidAmount || 0
                );
                const balance = parseFloat(
                  purchase.balance ||
                    purchase.balanceAmount ||
                    purchase.pendingAmount ||
                    purchase.payment?.pendingAmount ||
                    0
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
                    className={isSelected ? "table-active-purple" : ""}
                    style={{cursor: "pointer"}}
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
                        {new Date(
                          purchase.purchaseDate ||
                            purchase.billDate ||
                            purchase.date ||
                            purchase.invoiceDate
                        ).toLocaleDateString("en-GB")}
                      </small>
                    </td>
                    <td>
                      <strong className="text-primary">
                        {purchase.purchaseNumber ||
                          purchase.billNumber ||
                          purchase.billNo ||
                          purchase.purchaseOrderNumber ||
                          purchase.invoiceNumber ||
                          "N/A"}
                      </strong>
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
                      <strong>₹{amount.toLocaleString("en-IN")}</strong>
                    </td>
                    <td className="text-end">
                      {paidAmount > 0 ? (
                        <span className="text-success fw-medium">
                          ₹{paidAmount.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-muted">₹0</span>
                      )}
                    </td>
                    <td className="text-end">
                      {balance > 0 ? (
                        <span className="text-danger fw-medium">
                          ₹{balance.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-muted">₹0</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        status={purchase.status}
                        paymentStatus={paymentStatus}
                        amount={amount}
                        balance={balance}
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
                        className="text-center dropdown-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionButton purchase={purchase} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </div>

      {/* ✅ Enhanced Universal View Modal */}
      {selectedPurchase && (
        <UniversalViewModal
          show={viewModalShow}
          onHide={() => {
            setViewModalShow(false);
            setSelectedPurchase(null);
            setModalError(null);
          }}
          title={`${labels.documentName} Details`}
          data={selectedPurchase}
          transaction={selectedPurchase}
          companyId={companyId}
          currentUser={currentUser}
          currentCompany={currentCompany}
          addToast={addToast}
          loading={modalLoading}
          error={modalError}
          documentType={
            isPurchaseOrdersMode ? "purchase-order" : "purchase-invoice"
          }
          // ✅ Enhanced action handlers
          onEdit={handleModalEdit}
          onPrint={handleModalPrint}
          onShare={handleModalShare}
          onDownload={handleModalDownload}
          onDuplicate={handleModalDuplicate}
          onDelete={handleModalDelete}
          // ✅ Additional props for enhanced functionality
          enableEdit={enableActions}
          enablePrint={true}
          enableShare={true}
          enableDownload={true}
          enableDuplicate={enableActions}
          enableDelete={enableActions}
          // ✅ Purchase-specific props
          enableConvert={isPurchaseOrdersMode}
          onConvert={() => handleConvertPurchase(selectedPurchase)}
          onMarkAsOrdered={
            isPurchaseOrdersMode
              ? () => handleMarkAsOrdered(selectedPurchase)
              : undefined
          }
          onMarkAsReceived={
            isPurchaseOrdersMode
              ? () => handleMarkAsReceived(selectedPurchase)
              : undefined
          }
          onComplete={
            isPurchaseOrdersMode
              ? () => handleCompletePurchase(selectedPurchase)
              : undefined
          }
        />
      )}

      <style>
        {`
      .purchase-bills-table-wrapper {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        border: 1px solid #e9ecef;
        position: relative;
        max-width: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      .purchase-bills-table-wrapper .table-responsive-wrapper {
        overflow-x: auto;
        overflow-y: visible;
        max-width: 100%;
        position: relative;
        scrollbar-width: thin;
        scrollbar-color: rgba(168, 85, 247, 0.3) transparent;
      }

      .purchase-bills-table-wrapper .table-responsive-wrapper::-webkit-scrollbar {
        height: 6px;
      }

      .purchase-bills-table-wrapper .table-responsive-wrapper::-webkit-scrollbar-track {
        background: #f1f3f4;
        border-radius: 3px;
      }

      .purchase-bills-table-wrapper .table-responsive-wrapper::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, 0.3);
        border-radius: 3px;
      }

      .purchase-bills-table-wrapper .table-responsive-wrapper::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, 0.5);
      }

      .purchase-bills-table-wrapper .table-header-purple {
        background: linear-gradient(
          135deg,
          #6f42c1 0%,
          #8b5cf6 50%,
          #a855f7 100%
        );
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .purchase-bills-table-wrapper .table-header-purple th {
        background: transparent !important;
        border-bottom: 2px solid rgba(255, 255, 255, 0.2);
        font-weight: 600;
        padding: 16px 12px;
        font-size: 0.875rem;
        color: #ffffff !important;
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        position: relative;
        min-width: 120px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:first-child {
        min-width: 40px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:nth-child(2) {
        min-width: 100px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:nth-child(3) {
        min-width: 150px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:nth-child(4) {
        min-width: 180px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:nth-child(5) {
        min-width: 80px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:nth-child(6) {
        min-width: 120px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:nth-child(7) {
        min-width: 100px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:nth-child(8) {
        min-width: 100px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:nth-child(9) {
        min-width: 100px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:nth-child(10) {
        min-width: 100px;
      }

      .purchase-bills-table-wrapper .table-header-purple th:last-child {
        min-width: 80px;
      }

      .purchase-bills-table-wrapper .table-header-purple th::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.1) 0%,
          transparent 50%
        );
        pointer-events: none;
      }

      .purchase-bills-table-wrapper .table-header-purple th:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        transition: all 0.3s ease;
      }

      .purple-checkbox input[type="checkbox"] {
        accent-color: #ffffff;
        transform: scale(1.1);
      }

      .purple-checkbox input[type="checkbox"]:checked {
        background-color: #ffffff;
        border-color: #ffffff;
      }

      .purchase-bills-table-wrapper .table tbody tr.table-active-purple {
        background: linear-gradient(
          90deg,
          rgba(168, 85, 247, 0.1) 0%,
          rgba(139, 92, 246, 0.05) 100%
        );
        border-left: 4px solid #a855f7;
      }

      .purchase-bills-table-wrapper .table {
        margin-bottom: 0;
        font-size: 0.9rem;
        width: 100%;
        table-layout: auto;
        min-width: 1200px;
      }

      .purchase-bills-table-wrapper .table td {
        padding: 16px 12px;
        vertical-align: middle;
        border-bottom: 1px solid #f1f3f4;
        white-space: nowrap;
        min-width: inherit;
      }

      .purchase-bills-table-wrapper .dropdown-cell {
        position: relative;
        z-index: 10;
        overflow: visible;
      }

      .purchase-bills-table-wrapper .table tbody tr:hover {
        background: linear-gradient(
          90deg,
          rgba(168, 85, 247, 0.05) 0%,
          rgba(139, 92, 246, 0.02) 100%
        );
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(168, 85, 247, 0.15);
        transition: all 0.2s ease;
        border-left: 3px solid #a855f7;
      }

      .purchase-bills-table-wrapper .dropdown {
        position: static;
      }

      .purchase-bills-table-wrapper .dropdown-toggle {
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
        color: #6f42c1;
        position: relative;
        z-index: 11;
      }

      .purchase-bills-table-wrapper .dropdown-toggle:focus,
      .purchase-bills-table-wrapper .dropdown-toggle:hover {
        box-shadow: 0 0 0 0.2rem rgba(168, 85, 247, 0.25) !important;
        background-color: rgba(168, 85, 247, 0.1) !important;
        color: #6f42c1 !important;
      }

      .purchase-bills-table-wrapper .dropdown-menu {
        border: none;
        box-shadow: 0 8px 32px rgba(168, 85, 247, 0.3);
        border-radius: 8px;
        margin-top: 4px;
        border-top: 3px solid #a855f7;
        z-index: 9999 !important;
        position: absolute !important;
        will-change: transform;
        min-width: 180px;
        background: white;
        transform: translateZ(0);
      }

      .purchase-bills-table-wrapper .dropdown-menu.show {
        z-index: 9999 !important;
        position: absolute !important;
      }

      .purchase-bills-table-wrapper .badge {
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.4em 0.8em;
      }

      .purchase-bills-table-wrapper .dropdown-item {
        padding: 8px 16px;
        font-size: 0.875rem;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .purchase-bills-table-wrapper .dropdown-item:hover {
        background: linear-gradient(
          90deg,
          rgba(168, 85, 247, 0.1) 0%,
          rgba(139, 92, 246, 0.05) 100%
        );
        color: #6f42c1;
        padding-left: 20px;
      }

      .purchase-bills-table-wrapper .dropdown-header {
        font-size: 0.75rem;
        color: #6f42c1;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: rgba(168, 85, 247, 0.1);
        margin: 0 -16px;
        padding: 8px 16px;
      }

      .purchase-bills-table-wrapper .dropdown-divider {
        border-color: rgba(168, 85, 247, 0.2);
      }

      .purchase-bills-table-wrapper .text-white-50:hover {
        color: rgba(255, 255, 255, 0.8) !important;
        transform: scale(1.1);
        transition: all 0.2s ease;
      }

      @media (max-width: 1400px) {
        .purchase-bills-table-wrapper .table {
          min-width: 1100px;
        }
        
        .purchase-bills-table-wrapper .table th,
        .purchase-bills-table-wrapper .table td {
          padding: 14px 10px;
          font-size: 0.85rem;
        }
      }

      @media (max-width: 1200px) {
        .purchase-bills-table-wrapper .table {
          min-width: 1000px;
        }

        .purchase-bills-table-wrapper .table th,
        .purchase-bills-table-wrapper .table td {
          padding: 12px 8px;
          font-size: 0.85rem;
        }

        .purchase-bills-table-wrapper .dropdown-menu {
          min-width: 160px;
        }
      }

      @media (max-width: 992px) {
        .purchase-bills-table-wrapper .table {
          min-width: 900px;
        }

        .purchase-bills-table-wrapper .table th,
        .purchase-bills-table-wrapper .table td {
          padding: 10px 6px;
          font-size: 0.8rem;
        }
      }

      @media (max-width: 768px) {
        .purchase-bills-table-wrapper {
          font-size: 0.8rem;
          border-radius: 8px;
          margin: 0 -15px;
        }

        .purchase-bills-table-wrapper .table {
          min-width: 800px;
        }

        .purchase-bills-table-wrapper .table th,
        .purchase-bills-table-wrapper .table td {
          padding: 8px 4px;
          font-size: 0.75rem;
        }

        .purchase-bills-table-wrapper .badge {
          font-size: 0.7rem;
          padding: 0.3em 0.6em;
        }

        .purchase-bills-table-wrapper .table-header-purple th {
          padding: 10px 6px;
          font-size: 0.75rem;
        }

        .purchase-bills-table-wrapper .dropdown-menu {
          min-width: 140px;
          font-size: 0.8rem;
        }

        .purchase-bills-table-wrapper .dropdown-item {
          padding: 6px 12px;
          font-size: 0.8rem;
        }

        .purchase-bills-table-wrapper .table-responsive-wrapper::-webkit-scrollbar {
          height: 8px;
        }
      }

      @media (max-width: 576px) {
        .purchase-bills-table-wrapper {
          border-radius: 0;
          margin: 0 -15px;
        }

        .purchase-bills-table-wrapper .table {
          min-width: 700px;
        }

        .purchase-bills-table-wrapper .table th,
        .purchase-bills-table-wrapper .table td {
          padding: 6px 3px;
          font-size: 0.7rem;
        }
      }

      .purchase-bills-table-wrapper .table tbody tr {
        transition: all 0.2s ease;
      }

      .purchase-bills-table-wrapper .spinner-border {
        width: 3rem;
        height: 3rem;
      }

      .purchase-bills-table-wrapper .badge.bg-info {
        background: linear-gradient(45deg, #a855f7, #8b5cf6) !important;
      }

      .purchase-bills-table-wrapper .badge.bg-success {
        background: linear-gradient(45deg, #10b981, #059669) !important;
      }

      .purchase-bills-table-wrapper .badge.bg-warning {
        background: linear-gradient(45deg, #f59e0b, #d97706) !important;
      }

      .purchase-bills-table-wrapper .badge.bg-danger {
        background: linear-gradient(45deg, #ef4444, #dc2626) !important;
      }

      .purchase-bills-table-wrapper .badge.bg-secondary {
        background: linear-gradient(45deg, #6b7280, #4b5563) !important;
      }

      .purchase-bills-table-wrapper .badge.bg-primary {
        background: linear-gradient(45deg, #8b5cf6, #7c3aed) !important;
      }

      .dropdown-menu {
        z-index: 9999 !important;
      }

      .table-responsive {
        overflow: visible !important;
      }

      .purchase-bills-table-wrapper .dropdown.show .dropdown-menu {
        z-index: 9999 !important;
        position: absolute !important;
        transform: translate3d(0, 0, 0);
      }

      .purchase-bills-table-wrapper * {
        box-sizing: border-box;
      }
      `}
      </style>
    </>
  );
}

export default PurchaseBillsTable;
