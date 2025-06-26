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
  faFileAlt,
  faArrowLeft,
  faEdit,
  faSave,
  faSpinner,
  faExclamationTriangle,
  faQuoteLeft,
} from "@fortawesome/free-solid-svg-icons";

import SalesFormHeader from "./SalesForm/SalesFormHeader";
import SalesInvoiceFormSection from "./SalesForm/SalesInvoiceFormSection";
import salesService from "../../../../services/salesService";
import "./SalesForm.css";

function SalesForm({
  onSave,
  onCancel,
  onExit,
  inventoryItems = [],
  categories = [],
  onAddItem,
  mode = "invoices",
  documentType = "invoice",
  formType = "sales",
  pageTitle,
  addToast,
  editMode = false,
  existingTransaction = null,
  initialData = null,
  editingData = null,
  defaultValues = null,
  transactionId = null,
  companyId: propCompanyId,
  currentUser,
  currentCompany,
  isOnline = true,
  orderType,
  quotationService,
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

  // Determine if quotations mode
  const isQuotationsMode = useMemo(() => {
    return (
      mode === "quotations" ||
      documentType === "quotation" ||
      formType === "quotation" ||
      orderType === "quotation"
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

  // Get field labels
  const getFieldLabels = () => {
    return isQuotationsMode
      ? {
          documentName: "Quotation",
          documentNamePlural: "Quotations",
          documentNumber: "Quotation Number",
          documentDate: "Quote Date",
          documentAction: editMode ? "Update Quotation" : "Create Quotation",
          shareAction: "Share Quotation",
          saveAction: editMode ? "Update Quotation" : "Save Quotation",
          customerLabel: "Quote For",
          notesPlaceholder:
            "Add quotation notes, terms & conditions, validity period...",
          emptyStateMessage:
            "Start by adding products or services for this quotation",
          successMessage: editMode
            ? "Quotation updated successfully!"
            : "Quotation created successfully!",
          validationMessage: "Please complete the quotation details",
        }
      : {
          documentName: "Invoice",
          documentNamePlural: "Invoices",
          documentNumber: "Invoice Number",
          documentDate: "Invoice Date",
          documentAction: editMode ? "Update Invoice" : "Create Invoice",
          shareAction: "Share Invoice",
          saveAction: editMode ? "Update Invoice" : "Save Invoice",
          customerLabel: "Bill To",
          notesPlaceholder: "Add invoice notes, payment terms, due date...",
          emptyStateMessage:
            "Start by adding products or services for this invoice",
          successMessage: editMode
            ? "Invoice updated successfully!"
            : "Invoice created successfully!",
          validationMessage: "Please complete the invoice details",
        };
  };

  const labels = getFieldLabels();

  // Generate document number
  const generateDocumentNumber = (invoiceType = "non-gst") => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);

    if (isQuotationsMode) {
      const companyPrefix = currentCompany?.code || "QT";
      return invoiceType === "gst"
        ? `${companyPrefix}-GST-${year}${month}${day}-${random}`
        : `${companyPrefix}-${year}${month}${day}-${random}`;
    } else {
      const companyPrefix = currentCompany?.code || "INV";
      return invoiceType === "gst"
        ? `${companyPrefix}-GST-${year}${month}${day}-${random}`
        : `${companyPrefix}-${year}${month}${day}-${random}`;
    }
  };

  // Initialize form data
  const [formData, setFormData] = useState(() => {
    const initialCompanyId = getEffectiveCompanyId();

    return {
      gstEnabled: true,
      invoiceType: "gst",
      taxMode: "without-tax",
      priceIncludesTax: false,
      customer: null,
      mobileNumber: "",
      invoiceNumber: generateDocumentNumber("gst"),
      invoiceDate: new Date().toISOString().split("T")[0],
      items: [],
      paymentMethod: "cash",
      paymentData: null,
      paidAmount: 0,
      paymentReceived: 0,
      pendingAmount: 0,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentNotes: "",
      paymentReference: "",
      paymentStatus: "pending",
      creditDays: 0,
      dueDate: null,
      notes: "",
      quotationValidity: isQuotationsMode ? 30 : undefined,
      quotationStatus: isQuotationsMode ? "draft" : undefined,
      quotationExpiryDate: isQuotationsMode
        ? (() => {
            const date = new Date();
            date.setDate(date.getDate() + 30);
            return date.toISOString().split("T")[0];
          })()
        : undefined,
      convertedToInvoice: isQuotationsMode ? false : undefined,
      documentMode: isQuotationsMode ? "quotation" : "invoice",
      createdBy: currentUser?.name || currentUser?.email || "System",
      companyId: initialCompanyId,
      termsAndConditions: isQuotationsMode
        ? "This quotation is valid for 30 days from the date of issue."
        : "",
    };
  });

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

  // ✅ Enhanced initialization for edit mode
  useEffect(() => {
    if (editMode && !initializationComplete) {
      // Get transaction data from any available source
      const transactionData =
        existingTransaction || initialData || editingData || defaultValues;

      if (transactionData) {
        console.log(
          "📝 Initializing edit mode with transaction data:",
          transactionData
        );
        initializeFormFromTransaction(transactionData);
      } else if (transactionId) {
        console.log("📝 Loading transaction by ID:", transactionId);
        loadTransactionById(transactionId);
      } else {
        console.warn("⚠️ Edit mode enabled but no transaction data provided");
        setInitializing(false);
        setInitializationComplete(true);
        effectiveAddToast("No transaction data provided for editing", "error");
      }
    } else if (!editMode && !initializationComplete) {
      setInitializing(false);
      setInitializationComplete(true);
    }
  }, [
    editMode,
    existingTransaction,
    initialData,
    editingData,
    defaultValues,
    transactionId,
    initializationComplete,
  ]);

  // Load transaction by ID
  const loadTransactionById = async (id) => {
    setInitializing(true);
    try {
      let result;
      if (isQuotationsMode && quotationService) {
        result = await quotationService.getQuotation(id);
      } else {
        result = await salesService.getInvoice(id);
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

  // ✅ Enhanced initialize form from transaction data with proper payment handling
  const initializeFormFromTransaction = useCallback(
    async (transaction) => {
      if (initializationComplete) {
        console.log("⚠️ Initialization already complete, skipping...");
        return;
      }

      setInitializing(true);
      console.log("🔄 Initializing form from transaction:", transaction);

      try {
        if (!transaction) {
          throw new Error("No transaction data provided");
        }

        // ✅ Enhanced customer transformation
        let transformedCustomer = null;
        if (transaction.customer && typeof transaction.customer === "object") {
          transformedCustomer = {
            id: transaction.customer._id || transaction.customer.id,
            _id: transaction.customer._id || transaction.customer.id,
            name:
              transaction.customer.name ||
              transaction.customer.customerName ||
              "",
            mobile:
              transaction.customer.mobile || transaction.customer.phone || "",
            email: transaction.customer.email || "",
            address: transaction.customer.address || "",
            gstNumber: transaction.customer.gstNumber || "",
          };
        } else if (
          transaction.customerId ||
          transaction.customerName ||
          transaction.partyName
        ) {
          transformedCustomer = {
            id: transaction.customerId,
            _id: transaction.customerId,
            name: transaction.customerName || transaction.partyName || "",
            mobile:
              transaction.customerMobile ||
              transaction.partyPhone ||
              transaction.mobileNumber ||
              "",
            email: transaction.customerEmail || transaction.partyEmail || "",
            address:
              transaction.customerAddress || transaction.partyAddress || "",
            gstNumber: transaction.customerGstNumber || "",
          };
        }

        // ✅ Enhanced items transformation
        const transformedItems = (
          transaction.items ||
          transaction.lineItems ||
          []
        ).map((item, index) => {
          const quantity = parseFloat(item.quantity || item.qty || 1);
          const pricePerUnit = parseFloat(
            item.pricePerUnit || item.price || item.rate || item.unitPrice || 0
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
            taxMode: item.taxMode || transaction.taxMode || "without-tax",
            priceIncludesTax: Boolean(
              item.priceIncludesTax || transaction.priceIncludesTax
            ),
            selectedProduct: item.itemRef
              ? {
                  id: item.itemRef,
                  name: item.itemName || item.productName,
                  sellPrice: pricePerUnit,
                  gstRate: taxRate,
                  hsnCode: item.hsnCode || "0000",
                }
              : null,
          };
        });

        // ✅ Enhanced payment data transformation with proper calculations
        const totalAmount = parseFloat(
          transaction.amount || transaction.total || transaction.grandTotal || 0
        );
        const balanceAmount = parseFloat(
          transaction.balance || transaction.balanceAmount || 0
        );
        const calculatedPaidAmount = totalAmount - balanceAmount;

        console.log("💰 Payment data calculation:", {
          totalAmount,
          balanceAmount,
          calculatedPaidAmount,
          originalPayment: transaction.payment,
          paymentReceived: transaction.paymentReceived,
          paidAmount: transaction.paidAmount,
        });

        let paymentData = null;
        if (
          transaction.payment ||
          transaction.paymentData ||
          calculatedPaidAmount > 0
        ) {
          const payment = transaction.payment || transaction.paymentData || {};

          // ✅ Use calculated paid amount if no explicit payment data
          const effectivePaidAmount =
            payment.paidAmount ||
            payment.amount ||
            transaction.paymentReceived ||
            transaction.paidAmount ||
            calculatedPaidAmount;

          paymentData = {
            paymentType:
              payment.method ||
              payment.paymentType ||
              transaction.paymentType ||
              transaction.paymentMethod ||
              "cash",
            method:
              payment.method ||
              payment.paymentType ||
              transaction.paymentType ||
              transaction.paymentMethod ||
              "cash",
            amount: effectivePaidAmount,
            paidAmount: effectivePaidAmount,
            totalAmount: totalAmount,
            pendingAmount:
              payment.pendingAmount || payment.balanceAmount || balanceAmount,
            balanceAmount: balanceAmount,
            status:
              payment.status ||
              (balanceAmount <= 0
                ? "paid"
                : effectivePaidAmount > 0
                ? "partial"
                : "pending"),
            paymentDate:
              payment.paymentDate ||
              transaction.paymentDate ||
              transaction.invoiceDate,
            reference: payment.reference || transaction.paymentReference || "",
            notes: payment.notes || transaction.paymentNotes || "",
            dueDate: payment.dueDate || transaction.dueDate || null,
            creditDays: payment.creditDays || transaction.creditDays || 0,
          };
        }

        // ✅ Enhanced date parsing
        const parseDate = (dateValue) => {
          if (dateValue) {
            try {
              const parsedDate = new Date(dateValue);
              if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString().split("T")[0];
              }
            } catch (e) {
              console.warn("Date parsing failed for:", dateValue);
            }
          }
          return new Date().toISOString().split("T")[0];
        };

        // ✅ Create comprehensive form data with proper payment information
        const newFormData = {
          // Document identification
          invoiceNumber:
            transaction.invoiceNumber ||
            transaction.invoiceNo ||
            transaction.quotationNumber ||
            transaction.orderNo ||
            "",

          // Document dates
          invoiceDate: parseDate(
            transaction.invoiceDate ||
              transaction.quotationDate ||
              transaction.date ||
              transaction.documentDate
          ),

          dueDate: transaction.dueDate ? parseDate(transaction.dueDate) : null,

          // Customer information
          customer: transformedCustomer,
          customerId: transformedCustomer?.id,
          customerName: transformedCustomer?.name || "",
          mobileNumber: transformedCustomer?.mobile || "",

          // Items
          items: transformedItems,

          // Tax and pricing configuration
          gstEnabled:
            transaction.gstEnabled !== false &&
            (transaction.invoiceType === "gst" ||
              transformedItems.some((item) => item.taxRate > 0)),
          invoiceType:
            transaction.invoiceType ||
            (transaction.gstEnabled !== false ? "gst" : "non-gst"),
          taxMode: transaction.taxMode || "without-tax",
          priceIncludesTax: Boolean(transaction.priceIncludesTax),

          // ✅ Enhanced payment information with proper values
          paymentMethod:
            paymentData?.paymentType ||
            transaction.paymentType ||
            transaction.paymentMethod ||
            "cash",
          paymentData: paymentData,
          paymentReceived: paymentData?.paidAmount || calculatedPaidAmount,
          paidAmount: paymentData?.paidAmount || calculatedPaidAmount,
          pendingAmount: paymentData?.pendingAmount || balanceAmount,
          paymentDate:
            paymentData?.paymentDate ||
            parseDate(
              transaction.paymentDate ||
                transaction.invoiceDate ||
                transaction.date
            ),
          paymentNotes: paymentData?.notes || transaction.paymentNotes || "",
          paymentReference:
            paymentData?.reference || transaction.paymentReference || "",
          paymentStatus:
            paymentData?.status ||
            (balanceAmount <= 0
              ? "paid"
              : calculatedPaidAmount > 0
              ? "partial"
              : "pending"),
          creditDays: paymentData?.creditDays || transaction.creditDays || 0,

          // Notes and terms
          notes: transaction.notes || transaction.description || "",
          termsAndConditions:
            transaction.termsAndConditions || transaction.terms || "",

          // Status and quotation specific fields
          status: transaction.status || transaction.quotationStatus || "draft",
          quotationValidity:
            transaction.quotationValidity ||
            (isQuotationsMode ? 30 : undefined),
          quotationStatus:
            transaction.quotationStatus ||
            transaction.status ||
            (isQuotationsMode ? "draft" : undefined),
          quotationExpiryDate:
            transaction.quotationExpiryDate ||
            (isQuotationsMode
              ? (() => {
                  const date = new Date(
                    transaction.quotationDate ||
                      transaction.invoiceDate ||
                      new Date()
                  );
                  date.setDate(
                    date.getDate() + (transaction.quotationValidity || 30)
                  );
                  return date.toISOString().split("T")[0];
                })()
              : undefined),
          convertedToInvoice: transaction.convertedToInvoice || false,

          // System fields
          documentMode: isQuotationsMode ? "quotation" : "invoice",
          createdBy: transaction.createdBy || currentUser?.name || "System",
          companyId: effectiveCompanyId,

          // ✅ Financial totals
          totalAmount: totalAmount,
          balance: balanceAmount,
          amount: totalAmount,
        };

        console.log("✅ Setting form data with payment info:", {
          paymentMethod: newFormData.paymentMethod,
          paymentReceived: newFormData.paymentReceived,
          paidAmount: newFormData.paidAmount,
          pendingAmount: newFormData.pendingAmount,
          totalAmount: newFormData.totalAmount,
          paymentData: newFormData.paymentData,
        });

        setFormData((prev) => ({...prev, ...newFormData}));

        console.log("✅ Form initialized successfully with payment data");
      } catch (error) {
        console.error("❌ Error initializing form:", error);
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
      isQuotationsMode,
      initializationComplete,
      currentUser,
      effectiveCompanyId,
    ]
  );

  // ✅ Enhanced save handler
  const handleSave = useCallback(
    async (invoiceDataFromTable) => {
      if (saving) {
        return {
          success: true,
          isDuplicate: true,
          message: "Save operation already in progress",
        };
      }

      try {
        setSaving(true);

        console.log("💾 Save operation:", {
          editMode,
          transactionId,
          isQuotationsMode,
          data: invoiceDataFromTable,
        });

        // ✅ Enhanced data preparation
        const enhancedData = {
          ...invoiceDataFromTable,
          companyId: effectiveCompanyId,
          documentType: isQuotationsMode ? "quotation" : "invoice",
          mode: isQuotationsMode ? "quotations" : "invoices",

          // ✅ Pass edit context if available
          ...(editMode &&
            transactionId && {
              _id: transactionId,
              id: transactionId,
              editMode: true,
              originalTransactionId: transactionId,
            }),
        };

        let result;

        if (editMode && transactionId) {
          // ✅ UPDATE operation
          console.log("🔄 Updating existing transaction:", transactionId);

          if (isQuotationsMode && quotationService) {
            result = await quotationService.updateQuotation(
              transactionId,
              enhancedData
            );
          } else {
            result = await salesService.updateInvoice(
              transactionId,
              enhancedData
            );
          }
        } else {
          // ✅ CREATE operation
          console.log("🆕 Creating new transaction");

          if (isQuotationsMode && quotationService) {
            result = await quotationService.createQuotation(enhancedData);
          } else {
            result = await salesService.createInvoice(enhancedData);
          }
        }

        if (result?.success || result?.data || result?._id || result?.id) {
          const responseData = result.data || result;
          const operation = editMode ? "updated" : "created";
          const successMessage = `${labels.documentName} ${operation} successfully!`;

          effectiveAddToast(
            `${successMessage} Amount: ₹${
              responseData.total ||
              responseData.grandTotal ||
              responseData.amount ||
              enhancedData.totals?.finalTotal ||
              0
            }`,
            "success"
          );

          // ✅ Navigation based on operation
          setTimeout(() => {
            if (editMode) {
              // For edit mode, navigate back to list
              if (isQuotationsMode) {
                navigate(
                  `/companies/${effectiveCompanyId}/sales?tab=quotations`
                );
              } else {
                navigate(`/companies/${effectiveCompanyId}/sales`);
              }
            } else {
              // For create mode, navigate to list
              navigate(`/companies/${effectiveCompanyId}/sales`);
            }
          }, 1500);

          return {
            success: true,
            data: responseData,
            message: successMessage,
            operation: operation,
          };
        } else {
          throw new Error(
            result?.message ||
              `${editMode ? "Update" : "Save"} operation failed`
          );
        }
      } catch (error) {
        if (
          error.message?.includes("already in progress") ||
          error.message?.includes("duplicate")
        ) {
          return {
            success: true,
            isDuplicate: true,
            message: labels.successMessage,
          };
        }

        const operation = editMode ? "updating" : "saving";
        const errorMessage = `Error ${operation} ${labels.documentName.toLowerCase()}: ${
          error.message
        }`;

        effectiveAddToast(errorMessage, "error");

        return {
          success: false,
          error: error.message,
          message: errorMessage,
        };
      } finally {
        setTimeout(() => setSaving(false), 1000);
      }
    },
    [
      saving,
      editMode,
      transactionId,
      isQuotationsMode,
      quotationService,
      labels,
      effectiveAddToast,
      navigate,
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
      invoice: {
        title: editMode ? "Edit Sales Invoice" : "Create Sales Invoice",
        icon: faFileInvoice,
        color: "primary",
      },
      quotation: {
        title: editMode ? "Edit Quotation" : "Create Quotation",
        icon: faQuoteLeft,
        color: "info",
      },
    };

    return (
      baseConfig[isQuotationsMode ? "quotation" : "invoice"] ||
      baseConfig.invoice
    );
  }, [isQuotationsMode, editMode]);

  // Company validation
  if (!effectiveCompanyId) {
    return (
      <div
        className="sales-form-wrapper"
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
        className="sales-form-wrapper"
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
        className="sales-form-wrapper"
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
  if (
    editMode &&
    !existingTransaction &&
    !initialData &&
    !editingData &&
    !defaultValues &&
    initializationComplete
  ) {
    return (
      <div
        className="sales-form-wrapper"
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
      className="sales-form-wrapper"
      style={{backgroundColor: "#f8f9fa", minHeight: "100vh"}}
      data-mode={mode}
    >
      <Container fluid className="py-3 px-4">
        {/* Header Component */}
        <div className="mb-3">
          <SalesFormHeader
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
            isQuotationsMode={isQuotationsMode}
            labels={labels}
            editMode={editMode}
          />
        </div>

        {/* Main Form Component */}
        <div className="mb-3">
          <SalesInvoiceFormSection
            formData={formData}
            onFormDataChange={updateFormData}
            companyId={effectiveCompanyId}
            currentUser={currentUser}
            currentCompany={currentCompany}
            addToast={effectiveAddToast}
            onSave={handleSave}
            onCancel={onCancel || onHide}
            onShare={handleShare}
            errors={{}}
            disabled={saving}
            mode={mode}
            documentType={documentType}
            isQuotationsMode={isQuotationsMode}
            editMode={editMode}
            saving={saving}
            labels={labels}
            inventoryItems={inventoryItems}
            onAddItem={onAddItem}
          />
        </div>
      </Container>

      {/* Loading Overlay */}
      {saving && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50"
          style={{zIndex: 2000}}
        >
          <div className="text-center text-white">
            <Spinner animation="border" size="lg" className="mb-3" />
            <h5>
              {editMode ? "Updating" : "Saving"} {labels.documentName}...
            </h5>
            <p>
              Please wait while we {editMode ? "update" : "save"} your changes.
            </p>
            {editMode && transactionId && <small>ID: {transactionId}</small>}
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        .sales-form-wrapper[data-mode="quotations"] {
          --primary-color: #17a2b8;
          --primary-rgb: 23, 162, 184;
          --secondary-color: #20c997;
        }

        .sales-form-wrapper[data-mode="invoices"] {
          --primary-color: #6c63ff;
          --primary-rgb: 108, 99, 255;
          --secondary-color: #9c88ff;
        }

        .sales-form-wrapper[data-mode="quotations"] .card {
          border-left: 4px solid var(--primary-color) !important;
        }

        .sales-form-wrapper[data-mode="quotations"] .card-header {
          background: linear-gradient(
            135deg,
            rgba(var(--primary-rgb), 0.1) 0%,
            rgba(var(--primary-rgb), 0.05) 100%
          );
        }

        .sales-form-wrapper[data-mode="quotations"] .btn-primary {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
        }

        .sales-form-wrapper[data-mode="quotations"] .text-primary {
          color: var(--primary-color) !important;
        }
      `}</style>
    </div>
  );
}

export default SalesForm;
