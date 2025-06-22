import React, {useState, useEffect, useMemo, useCallback} from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Alert,
} from "react-bootstrap";
import {useParams, useNavigate} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faFileInvoice,
  faShoppingCart,
  faReceipt,
  faArrowLeft,
  faEdit,
  faSave,
  faSpinner,
  faExclamationTriangle,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";

import PurchaseInvoiceHeader from "./PurchaseBill/PurchaseInvoiceHeader";
import PurchaseInvoiceFormSection from "./PurchaseBill/PurchaseInvoiceFormSection";
import purchaseService from "../../../services/purchaseService";

function PurchaseForm({
  onSave,
  onCancel,
  onExit,
  inventoryItems = [],
  categories = [],
  onAddItem,
  mode = "purchases",
  documentType = "purchase",
  formType = "purchase",
  pageTitle,
  addToast,
  editMode = false,
  existingTransaction = null,
  transactionId = null,
  companyId: propCompanyId,
  currentUser,
  currentCompany,
  isOnline = true,
  orderType,
  purchaseOrderService,
  show = true,
  onHide,
}) {
  const {companyId: urlCompanyId} = useParams();
  const navigate = useNavigate();
  const [localCompanyId, setLocalCompanyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);

  // Get effective company ID
  const getEffectiveCompanyId = useCallback(() => {
    const candidates = [
      propCompanyId,
      urlCompanyId,
      localCompanyId,
      currentCompany?._id,
      currentCompany?.id,
      currentUser?.companyId,
      currentUser?.company?._id,
      currentUser?.company?.id,
      localStorage.getItem("selectedCompanyId"),
      localStorage.getItem("companyId"),
      sessionStorage.getItem("companyId"),
    ];

    return (
      candidates.find((id) => id && id !== "null" && id !== "undefined") || null
    );
  }, [
    propCompanyId,
    urlCompanyId,
    localCompanyId,
    currentCompany,
    currentUser,
  ]);

  const effectiveCompanyId = getEffectiveCompanyId();

  // Determine if purchase orders mode
  const isPurchaseOrdersMode = useMemo(() => {
    return (
      mode === "purchase-orders" ||
      documentType === "purchase-order" ||
      formType === "purchase-order" ||
      orderType === "purchase-order"
    );
  }, [mode, documentType, formType, orderType]);

  // Default toast function
  const defaultAddToast = useCallback((message, type = "info") => {
    if (type === "error") {
      alert(`Error: ${message}`);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }, []);

  const effectiveAddToast = addToast || defaultAddToast;

  // Initialize company ID from storage if needed
  useEffect(() => {
    if (!propCompanyId && !urlCompanyId && !localCompanyId) {
      const storedCompanyId =
        localStorage.getItem("selectedCompanyId") ||
        localStorage.getItem("companyId") ||
        sessionStorage.getItem("companyId") ||
        currentCompany?.id ||
        currentCompany?._id ||
        currentUser?.companyId ||
        currentUser?.company?._id ||
        currentUser?.company?.id;

      if (
        storedCompanyId &&
        storedCompanyId !== "null" &&
        storedCompanyId !== "undefined"
      ) {
        setLocalCompanyId(storedCompanyId);
      }
    }
  }, [
    propCompanyId,
    urlCompanyId,
    currentCompany,
    currentUser,
    localCompanyId,
  ]);

  // Generate document number
  const generateDocumentNumber = (invoiceType = "non-gst") => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);

    if (isPurchaseOrdersMode) {
      const companyPrefix = currentCompany?.code || "PO";
      return invoiceType === "gst"
        ? `${companyPrefix}-GST-${year}${month}${day}-${random}`
        : `${companyPrefix}-${year}${month}${day}-${random}`;
    } else {
      const companyPrefix = currentCompany?.code || "PB";
      return invoiceType === "gst"
        ? `${companyPrefix}-GST-${year}${month}${day}-${random}`
        : `${companyPrefix}-${year}${month}${day}-${random}`;
    }
  };

  // Get field labels
  const getFieldLabels = () => {
    return isPurchaseOrdersMode
      ? {
          documentName: "Purchase Order",
          documentNamePlural: "Purchase Orders",
          documentNumber: "Purchase Order Number",
          documentDate: "Order Date",
          documentAction: editMode
            ? "Update Purchase Order"
            : "Create Purchase Order",
          shareAction: "Share Purchase Order",
          saveAction: editMode
            ? "Update Purchase Order"
            : "Save Purchase Order",
          supplierLabel: "Order From",
          notesPlaceholder:
            "Add purchase order notes, terms & conditions, delivery date...",
          emptyStateMessage:
            "Start by adding products or services for this purchase order",
          successMessage: editMode
            ? "Purchase Order updated successfully!"
            : "Purchase Order created successfully!",
          validationMessage: "Please complete the purchase order details",
        }
      : {
          documentName: "Purchase Bill",
          documentNamePlural: "Purchase Bills",
          documentNumber: "Purchase Bill Number",
          documentDate: "Bill Date",
          documentAction: editMode
            ? "Update Purchase Bill"
            : "Create Purchase Bill",
          shareAction: "Share Purchase Bill",
          saveAction: editMode ? "Update Purchase Bill" : "Save Purchase Bill",
          supplierLabel: "Bill From",
          notesPlaceholder:
            "Add purchase bill notes, payment terms, due date...",
          emptyStateMessage:
            "Start by adding products or services for this purchase bill",
          successMessage: editMode
            ? "Purchase Bill updated successfully!"
            : "Purchase Bill created successfully!",
          validationMessage: "Please complete the purchase bill details",
        };
  };

  const labels = getFieldLabels();

  // Initialize form data
  const [formData, setFormData] = useState(() => {
    const initialCompanyId = getEffectiveCompanyId();

    return {
      gstEnabled: true,
      invoiceType: "gst",
      taxMode: "without-tax", // Purchase default
      priceIncludesTax: false,
      customer: null, // Will store supplier data
      mobileNumber: "",
      invoiceNumber: generateDocumentNumber("gst"),
      invoiceDate: new Date().toISOString().split("T")[0],
      items: [],
      paymentMethod: "cash",
      paymentData: null,
      notes: "",
      purchaseOrderValidity: isPurchaseOrdersMode ? 30 : undefined,
      purchaseOrderStatus: isPurchaseOrdersMode ? "draft" : undefined,
      purchaseOrderExpiryDate: isPurchaseOrdersMode
        ? (() => {
            const date = new Date();
            date.setDate(date.getDate() + 30);
            return date.toISOString().split("T")[0];
          })()
        : undefined,
      convertedToPurchase: isPurchaseOrdersMode ? false : undefined,
      documentMode: isPurchaseOrdersMode ? "purchase-order" : "purchase",
      createdBy: currentUser?.name || currentUser?.email || "System",
      companyId: initialCompanyId,
      termsAndConditions: isPurchaseOrdersMode
        ? "This purchase order is valid for 30 days from the date of issue."
        : "",
    };
  });

  // Update form data function
  const updateFormData = useCallback(
    (field, value) => {
      setFormData((prev) => {
        const updated = {...prev, [field]: value};
        if (!updated.companyId) {
          updated.companyId = effectiveCompanyId;
        }
        return updated;
      });
    },
    [effectiveCompanyId]
  );

  // Update company ID when it changes
  useEffect(() => {
    const currentEffectiveCompanyId = getEffectiveCompanyId();
    if (
      currentEffectiveCompanyId &&
      currentEffectiveCompanyId !== formData.companyId
    ) {
      setFormData((prev) => ({
        ...prev,
        companyId: currentEffectiveCompanyId,
      }));
    }
  }, [effectiveCompanyId, formData.companyId, getEffectiveCompanyId]);

  // Load transaction for editing
  useEffect(() => {
    if (editMode && existingTransaction && !initializationComplete) {
      initializeFormFromTransaction(existingTransaction);
    } else if (editMode && !existingTransaction && transactionId) {
      loadTransactionById(transactionId);
    } else if (editMode && !existingTransaction) {
      setInitializing(false);
      setInitializationComplete(true);
      effectiveAddToast("No transaction data provided for editing", "error");
    } else if (!editMode && !initializationComplete) {
      setInitializing(false);
      setInitializationComplete(true);
    }
  }, [
    editMode,
    existingTransaction,
    transactionId,
    initializationComplete,
    isPurchaseOrdersMode,
  ]);

  // Load transaction by ID
  const loadTransactionById = async (id) => {
    setInitializing(true);
    try {
      let result;
      if (isPurchaseOrdersMode && purchaseOrderService) {
        result = await purchaseOrderService.getPurchaseOrder(id);
      } else {
        result = await purchaseService.getPurchaseById(id);
      }

      if (result?.success && result.data) {
        await initializeFormFromTransaction(result.data);
      } else {
        throw new Error(`Failed to load ${labels.documentName.toLowerCase()}`);
      }
    } catch (error) {
      effectiveAddToast(
        `Error loading ${labels.documentName.toLowerCase()}: ${error.message}`,
        "error"
      );
      setInitializing(false);
      setInitializationComplete(true);
    }
  };

  // Initialize form from transaction data
  const initializeFormFromTransaction = useCallback(
    async (transaction) => {
      if (initializationComplete) return;

      setInitializing(true);

      try {
        if (!transaction) {
          throw new Error("No transaction data provided");
        }

        // Transform supplier data (stored in customer field for consistency)
        let transformedSupplier = null;
        if (transaction.supplier && typeof transaction.supplier === "object") {
          transformedSupplier = {
            id: transaction.supplier._id || transaction.supplier.id,
            _id: transaction.supplier._id || transaction.supplier.id,
            name:
              transaction.supplier.name ||
              transaction.supplier.supplierName ||
              "",
            mobile:
              transaction.supplier.mobile || transaction.supplier.phone || "",
            email: transaction.supplier.email || "",
            address: transaction.supplier.address || "",
            gstNumber: transaction.supplier.gstNumber || "",
          };
        } else if (transaction.supplierId || transaction.supplierName) {
          transformedSupplier = {
            id: transaction.supplierId,
            _id: transaction.supplierId,
            name: transaction.supplierName || "",
            mobile:
              transaction.supplierMobile || transaction.mobileNumber || "",
            email: transaction.supplierEmail || "",
            address: transaction.supplierAddress || "",
            gstNumber: transaction.supplierGstNumber || "",
          };
        }

        // Transform items data for purchase
        const transformedItems = (transaction.items || []).map(
          (item, index) => {
            const quantity = parseFloat(item.quantity || item.qty || 0);
            // Purchase-specific: Use purchase price fields
            const pricePerUnit = parseFloat(
              item.pricePerUnit ||
                item.purchasePrice ||
                item.costPrice ||
                item.price ||
                item.rate ||
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
              itemRef: item.itemRef || item.productId,
              itemName: item.itemName || item.productName || item.name || "",
              itemCode: item.itemCode || item.productCode || "",
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
              taxMode: item.taxMode || transaction.taxMode || "without-tax",
              priceIncludesTax: Boolean(
                item.priceIncludesTax || transaction.priceIncludesTax
              ),
              selectedProduct: item.itemRef
                ? {
                    id: item.itemRef,
                    name: item.itemName || item.productName,
                    purchasePrice: pricePerUnit,
                    gstRate: taxRate,
                    hsnCode: item.hsnCode || "0000",
                  }
                : null,
            };
          }
        );

        // Transform payment data
        let paymentData = null;
        if (transaction.payment || transaction.paymentData) {
          const payment = transaction.payment || transaction.paymentData;
          paymentData = {
            paymentType: payment.method || payment.paymentType || "cash",
            method: payment.method || payment.paymentType || "cash",
            amount: parseFloat(payment.paidAmount || payment.amount || 0),
            paidAmount: parseFloat(payment.paidAmount || payment.amount || 0),
            pendingAmount: parseFloat(
              payment.pendingAmount || payment.balanceAmount || 0
            ),
            status: payment.status || "pending",
            paymentDate: payment.paymentDate || transaction.invoiceDate,
            reference: payment.reference || "",
            dueDate: payment.dueDate || null,
            creditDays: payment.creditDays || 0,
          };
        }

        // Create new form data
        const newFormData = {
          invoiceNumber:
            transaction.purchaseNumber ||
            transaction.purchaseOrderNumber ||
            transaction.billNumber ||
            transaction.invoiceNumber ||
            transaction.documentNumber ||
            transaction.number ||
            "",

          invoiceDate: (() => {
            const dateValue =
              transaction.purchaseDate ||
              transaction.purchaseOrderDate ||
              transaction.billDate ||
              transaction.invoiceDate ||
              transaction.date ||
              transaction.documentDate;
            if (dateValue) {
              try {
                return new Date(dateValue).toISOString().split("T")[0];
              } catch (e) {
                return new Date().toISOString().split("T")[0];
              }
            }
            return new Date().toISOString().split("T")[0];
          })(),

          customer: transformedSupplier, // Store supplier in customer field
          mobileNumber:
            transaction.supplierMobile ||
            transaction.mobileNumber ||
            transformedSupplier?.mobile ||
            "",

          items: transformedItems,

          gstEnabled:
            transaction.gstEnabled !== false &&
            (transaction.purchaseType === "gst" ||
              transaction.invoiceType === "gst" ||
              transformedItems.some((item) => item.taxRate > 0)),
          invoiceType:
            transaction.purchaseType ||
            transaction.invoiceType ||
            (transaction.gstEnabled !== false ? "gst" : "non-gst"),
          taxMode: transaction.taxMode || "without-tax",
          priceIncludesTax: Boolean(transaction.priceIncludesTax),

          paymentMethod: paymentData?.paymentType || "cash",
          paymentData: paymentData,

          notes: transaction.notes || transaction.description || "",
          termsAndConditions: transaction.termsAndConditions || "",

          status: transaction.status || "draft",
          purchaseOrderValidity:
            transaction.purchaseOrderValidity ||
            (isPurchaseOrdersMode ? 30 : undefined),
          purchaseOrderStatus:
            transaction.purchaseOrderStatus ||
            (isPurchaseOrdersMode ? "draft" : undefined),
          purchaseOrderExpiryDate:
            transaction.purchaseOrderExpiryDate ||
            (isPurchaseOrdersMode
              ? (() => {
                  const date = new Date(
                    transaction.purchaseOrderDate ||
                      transaction.purchaseDate ||
                      transaction.invoiceDate
                  );
                  date.setDate(
                    date.getDate() + (transaction.purchaseOrderValidity || 30)
                  );
                  return date.toISOString().split("T")[0];
                })()
              : undefined),
          convertedToPurchase: transaction.convertedToPurchase || false,

          documentMode: isPurchaseOrdersMode ? "purchase-order" : "purchase",
          createdBy: transaction.createdBy || currentUser?.name || "System",
          companyId: effectiveCompanyId,
        };

        setFormData((prev) => ({...prev, ...newFormData}));
      } catch (error) {
        effectiveAddToast(
          `Error loading ${labels.documentName.toLowerCase()}: ${
            error.message
          }`,
          "error"
        );
      } finally {
        setInitializing(false);
        setInitializationComplete(true);
      }
    },
    [
      effectiveAddToast,
      labels.documentName,
      isPurchaseOrdersMode,
      initializationComplete,
      currentUser,
      effectiveCompanyId,
    ]
  );

  // Simple share handler
  const handleShare = () => {
    effectiveAddToast(
      `${labels.documentName} ${formData.invoiceNumber} ready to share!`,
      "info"
    );
  };

  // Page configuration
  const pageConfig = useMemo(() => {
    const baseConfig = {
      purchase: {
        title: editMode ? "Edit Purchase Bill" : "Create Purchase Bill",
        icon: faFileInvoice,
        color: "primary",
      },
      "purchase-order": {
        title: editMode ? "Edit Purchase Order" : "Create Purchase Order",
        icon: faShoppingCart,
        color: "warning",
      },
    };

    return (
      baseConfig[isPurchaseOrdersMode ? "purchase-order" : "purchase"] ||
      baseConfig.purchase
    );
  }, [isPurchaseOrdersMode, editMode]);

  // Company validation
  if (!effectiveCompanyId) {
    return (
      <div
        className="purchase-form-wrapper"
        style={{backgroundColor: "#f8f9fa", minHeight: "100vh"}}
      >
        <Container fluid className="py-3 px-4">
          <Alert variant="warning" className="text-center">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              size="2x"
              className="mb-3"
            />
            <h5>Company Not Selected</h5>
            <p>
              Please select a company to {editMode ? "edit" : "create"}{" "}
              {labels.documentNamePlural.toLowerCase()}.
            </p>
            <Button variant="secondary" onClick={onCancel || onHide}>
              {onCancel ? "Back to List" : "Close"}
            </Button>
            <Button
              variant="primary"
              className="ms-2"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Alert>
        </Container>
      </div>
    );
  }

  // Online validation
  if (!isOnline) {
    return (
      <div
        className="purchase-form-wrapper"
        style={{backgroundColor: "#f8f9fa", minHeight: "100vh"}}
      >
        <Container fluid className="py-3 px-4">
          <Alert variant="warning" className="text-center">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              size="2x"
              className="mb-3"
            />
            <h5>No Internet Connection</h5>
            <p>
              {labels.documentNamePlural} require an internet connection to save
              data.
            </p>
          </Alert>
        </Container>
      </div>
    );
  }

  // Loading state
  if (initializing) {
    return (
      <div
        className="purchase-form-wrapper"
        style={{backgroundColor: "#f8f9fa", minHeight: "100vh"}}
      >
        <Container fluid className="py-3 px-4">
          <Card>
            <Card.Body className="text-center py-5">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h5>Loading {labels.documentName}...</h5>
              <p className="text-muted">
                Please wait while we load the{" "}
                {labels.documentName.toLowerCase()} data.
              </p>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  // Edit mode validation
  if (editMode && !existingTransaction && initializationComplete) {
    return (
      <div
        className="purchase-form-wrapper"
        style={{backgroundColor: "#f8f9fa", minHeight: "100vh"}}
      >
        <Container fluid className="py-3 px-4">
          <Alert variant="danger" className="text-center">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              size="2x"
              className="mb-3"
            />
            <h5>Transaction Data Missing</h5>
            <p>
              Unable to load transaction data for editing. Please try again.
            </p>
            <Button variant="secondary" onClick={onCancel || onHide}>
              {onCancel ? "Back to List" : "Close"}
            </Button>
          </Alert>
        </Container>
      </div>
    );
  }

  return (
    <div
      className="purchase-form-wrapper"
      style={{backgroundColor: "#f8f9fa", minHeight: "100vh"}}
      data-mode={mode}
    >
      <Container fluid className="py-3 px-4">
        {/* Header Component */}
        <div className="mb-3">
          <PurchaseInvoiceHeader
            formData={formData}
            onFormDataChange={updateFormData}
            companyId={effectiveCompanyId}
            currentUser={currentUser}
            currentCompany={currentCompany}
            addToast={effectiveAddToast}
            errors={{}}
            disabled={saving}
            mode={mode}
            documentType={documentType}
            isPurchaseOrdersMode={isPurchaseOrdersMode}
            labels={labels}
          />
        </div>

        {/* Main Form Component */}
        <div className="mb-3">
          <PurchaseInvoiceFormSection
            formData={formData}
            onFormDataChange={updateFormData}
            companyId={effectiveCompanyId}
            currentUser={currentUser}
            currentCompany={currentCompany}
            addToast={effectiveAddToast}
            onSave={onSave} // Pass through parent onSave for additional handling if needed
            onCancel={onCancel || onHide}
            onShare={handleShare}
            errors={{}}
            disabled={saving}
            mode={mode}
            documentType={documentType}
            isPurchaseOrdersMode={isPurchaseOrdersMode}
            editMode={editMode}
            saving={saving}
            labels={labels}
            transactionId={transactionId} // Pass transactionId for edit mode
          />
        </div>
      </Container>

      {/* Custom Styles */}
      <style jsx>{`
        .purchase-form-wrapper[data-mode="purchase-orders"] {
          --primary-color: #ffc107;
          --primary-rgb: 255, 193, 7;
          --secondary-color: #fd7e14;
        }

        .purchase-form-wrapper[data-mode="purchases"] {
          --primary-color: #6c63ff;
          --primary-rgb: 108, 99, 255;
          --secondary-color: #9c88ff;
        }

        .purchase-form-wrapper[data-mode="purchase-orders"] .card {
          border-left: 4px solid var(--primary-color) !important;
        }

        .purchase-form-wrapper[data-mode="purchase-orders"] .card-header {
          background: linear-gradient(
            135deg,
            rgba(var(--primary-rgb), 0.1) 0%,
            rgba(var(--primary-rgb), 0.05) 100%
          );
        }

        .purchase-form-wrapper[data-mode="purchase-orders"] .btn-primary {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
        }

        .purchase-form-wrapper[data-mode="purchase-orders"] .text-primary {
          color: var(--primary-color) !important;
        }
      `}</style>
    </div>
  );
}

export default PurchaseForm;
