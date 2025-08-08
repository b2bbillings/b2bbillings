import React, {useState, useEffect, useCallback, useMemo} from "react";
import {
  Modal,
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Spinner,
} from "react-bootstrap";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faFileInvoice,
  faSave,
  faSpinner,
  faExclamationTriangle,
  faCalculator,
  faTimes,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Import the required components
import OrderFormHeader from "./SalesOrderForm/OrderFormHeader";
import OrderFormProductSection from "./SalesOrderForm/OrderFormProductSection";
import saleOrderService from "../../../../services/saleOrderService";

// ✅ ENHANCED: Better order type detection
function SalesOrderForm({
  show = false,
  onHide,
  onSaveOrder,
  orderType = "quotation",
  currentCompany,
  currentUser,
  companyId: propCompanyId,
  addToast,
  onNavigate,
  isOnline = true,
  editMode = false,
  existingOrder = null,
  orderId = null,
  isPageMode = false,
  onCancel = null,
}) {
  const {companyId: urlCompanyId} = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const companyId = propCompanyId || urlCompanyId;

  // ✅ ENHANCED: Multiple methods to detect quotation mode
  const isQuotationMode = useMemo(() => {
    // Method 1: Explicit orderType prop
    if (orderType === "quotation") return true;

    // Method 2: Check location state
    const locationState = location.state;
    if (
      locationState?.orderType === "quotation" ||
      locationState?.documentType === "quotation" ||
      locationState?.mode === "quotations"
    )
      return true;

    // Method 3: Check existing order data
    if (
      existingOrder?.orderType === "quotation" ||
      existingOrder?.documentType === "quotation" ||
      existingOrder?.quotationNumber
    )
      return true;

    // Method 4: Check URL path
    if (location.pathname.includes("/quotations")) return true;

    // Method 5: Check if we're editing a quotation (from orderId in quotations context)
    if (editMode && location.state?.isQuotationsMode) return true;

    return false;
  }, [orderType, location.state, location.pathname, existingOrder, editMode]);
  // ✅ Form state for order/quotation data
  const [formData, setFormData] = useState({
    // Header fields
    gstType: "gst",
    deliveryDate: "",
    partyName: "",
    selectedParty: "",
    partyPhone: "",
    partyEmail: "",
    partyAddress: "",
    partyGstNumber: "",
    orderDate: new Date().toISOString().split("T")[0],
    orderNumber: "",
    quotationDate: new Date().toISOString().split("T")[0],
    quotationNumber: "",
    employeeName: currentUser?.name || "",
    employeeId: currentUser?.id || "",

    // Product fields
    items: [],
    invoiceDescription: "",
    notes: "",

    // Payment and additional fields
    paymentMethod: "cash",
    paymentStatus: "pending",
    termsAndConditions: "",
    status: "draft",
    priority: "normal",

    // Totals (calculated)
    subtotal: 0,
    totalTax: 0,
    finalTotal: 0,
    roundOffValue: 0,
    finalTotalWithRoundOff: 0,
  });

  // ✅ UI state
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const calculateTotals = useCallback(() => {
    const items = formData.items || [];
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item, index) => {
      const itemSubtotal = parseFloat(
        item.subtotal || item.amount || item.quantity * item.pricePerUnit || 0
      );
      const itemTax = parseFloat(
        item.gstAmount || item.totalTaxAmount || item.taxAmount || 0
      );

      subtotal += itemSubtotal;
      if (formData.gstType === "gst") {
        totalTax += itemTax;
      }
    });

    const finalTotal = subtotal + (formData.gstType === "gst" ? totalTax : 0);
    const roundOffValue = Math.round(finalTotal) - finalTotal;
    const finalTotalWithRoundOff = Math.round(finalTotal);

    const calculatedTotals = {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      roundOffValue: Math.round(roundOffValue * 100) / 100,
      finalTotalWithRoundOff,
    };

    setFormData((prev) => ({
      ...prev,
      ...calculatedTotals,
    }));
  }, [formData.items, formData.gstType]);

  const loadExistingOrder = useCallback(async () => {
    setLoading(true);
    try {
      let orderData = existingOrder;

      // ✅ FIRST: Check navigation state for existing data
      if (!orderData && typeof window !== "undefined") {
        const navigationState = location.state;

        orderData =
          navigationState?.salesOrder ||
          navigationState?.order ||
          navigationState?.quotation ||
          navigationState?.transaction;
      }

      if (!orderData && orderId) {
        if (
          !saleOrderService ||
          typeof saleOrderService.getSalesOrder !== "function"
        ) {
          console.error(
            "❌ saleOrderService.getSalesOrder method not available:",
            {
              serviceExists: !!saleOrderService,
              availableMethods: saleOrderService
                ? Object.keys(saleOrderService)
                : [],
            }
          );
          throw new Error(
            "Sales order service method not available. Please check service configuration."
          );
        }

        const response = await saleOrderService.getSalesOrder(orderId);

        if (response?.success && response?.data) {
          // ✅ ENHANCED: Handle different response structures
          orderData =
            response.data.salesOrder ||
            response.data.order ||
            response.data.quotation ||
            response.data;
        } else {
          throw new Error(response?.message || "Failed to load order data");
        }
      }

      if (orderData) {
        // ✅ ENHANCED: Determine if this is a quotation
        const isQuotationOrder =
          isQuotationMode ||
          orderData.orderType === "quotation" ||
          orderData.documentType === "quotation" ||
          !!orderData.quotationNumber;

        // ✅ ENHANCED: Better field mapping for both sales orders and quotations
        const processedFormData = {
          gstType:
            orderData.gstType || (orderData.gstEnabled ? "gst" : "without-gst"),
          deliveryDate:
            orderData.deliveryDate || orderData.expectedDeliveryDate || "",

          // ✅ ENHANCED: Customer information with multiple fallbacks
          partyName:
            orderData.customerName ||
            orderData.partyName ||
            orderData.customer?.name ||
            "",
          selectedParty:
            orderData.customerId ||
            orderData.customer?._id ||
            orderData.customer?.id ||
            orderData.selectedParty ||
            "",
          partyPhone:
            orderData.customerMobile ||
            orderData.customerPhone ||
            orderData.partyPhone ||
            orderData.customer?.mobile ||
            orderData.customer?.phone ||
            "",
          partyEmail:
            orderData.customerEmail ||
            orderData.partyEmail ||
            orderData.customer?.email ||
            "",
          partyAddress:
            orderData.customerAddress ||
            orderData.partyAddress ||
            orderData.customer?.address ||
            "",
          partyGstNumber:
            orderData.customerGstNumber ||
            orderData.partyGstNumber ||
            orderData.customer?.gstNumber ||
            "",

          // ✅ ENHANCED: Date fields - handle both quotations and sales orders
          orderDate: orderData.orderDate
            ? new Date(orderData.orderDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          quotationDate: isQuotationOrder
            ? new Date(
                orderData.quotationDate || orderData.orderDate || new Date()
              )
                .toISOString()
                .split("T")[0]
            : new Date(orderData.orderDate || new Date())
                .toISOString()
                .split("T")[0],

          // ✅ ENHANCED: Order numbers - handle both types
          orderNumber: isQuotationOrder
            ? orderData.quotationNumber ||
              orderData.orderNumber ||
              orderData.orderNo ||
              ""
            : orderData.orderNumber || orderData.orderNo || "",
          quotationNumber: isQuotationOrder
            ? orderData.quotationNumber ||
              orderData.orderNumber ||
              orderData.orderNo ||
              ""
            : "",

          // ✅ ENHANCED: Employee information
          employeeName:
            orderData.employeeName ||
            orderData.createdBy ||
            currentUser?.name ||
            "",
          employeeId:
            orderData.employeeId ||
            orderData.createdById ||
            currentUser?.id ||
            "",

          // ✅ ENHANCED: Items with better transformation
          items: Array.isArray(orderData.items)
            ? orderData.items.map((item, index) => {
                const quantity = parseFloat(item.quantity || item.qty || 1);
                const pricePerUnit = parseFloat(
                  item.pricePerUnit ||
                    item.unitPrice ||
                    item.rate ||
                    item.price ||
                    0
                );
                const taxRate = parseFloat(item.taxRate || item.gstRate || 18);
                const discountPercent = parseFloat(item.discountPercent || 0);

                const subtotal = quantity * pricePerUnit;
                const discountAmount = (subtotal * discountPercent) / 100;
                const taxableAmount = subtotal - discountAmount;
                const cgst = (taxableAmount * taxRate) / 200; // Divide by 2 for CGST
                const sgst = (taxableAmount * taxRate) / 200; // Divide by 2 for SGST
                const totalTaxAmount = cgst + sgst;
                const finalAmount = taxableAmount + totalTaxAmount;

                return {
                  id: item.id || item._id || `item-${index}-${Date.now()}`,
                  _id: item.id || item._id,
                  itemRef: item.itemRef || item.productId || item.id,
                  itemName:
                    item.itemName || item.productName || item.name || "",
                  itemCode:
                    item.itemCode || item.productCode || item.code || "",
                  hsnCode: item.hsnCode || item.hsnNumber || "0000",
                  quantity: quantity,
                  unit: item.unit || "PCS",
                  pricePerUnit: pricePerUnit,
                  taxRate: taxRate,
                  discountPercent: discountPercent,
                  discountAmount: discountAmount,
                  subtotal: subtotal,
                  taxableAmount: taxableAmount,
                  cgst: cgst,
                  sgst: sgst,
                  igst: parseFloat(item.igst || 0),
                  gstAmount: totalTaxAmount,
                  totalTaxAmount: totalTaxAmount,
                  amount: finalAmount,
                  category: item.category || "",
                  availableStock: parseFloat(item.availableStock || 0),
                  taxMode: item.taxMode || orderData.taxMode || "without-tax",
                  priceIncludesTax: Boolean(
                    item.priceIncludesTax || orderData.priceIncludesTax
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
              })
            : [],

          // ✅ ENHANCED: Description and notes
          invoiceDescription:
            orderData.description ||
            orderData.invoiceDescription ||
            orderData.notes ||
            "",
          notes:
            orderData.notes ||
            orderData.description ||
            orderData.invoiceDescription ||
            "",

          // ✅ ENHANCED: Payment information
          paymentMethod:
            orderData.paymentMethod || orderData.payment?.method || "cash",
          paymentStatus:
            orderData.paymentStatus || orderData.payment?.status || "pending",

          // ✅ ENHANCED: Terms and conditions
          termsAndConditions:
            orderData.termsAndConditions || orderData.terms || "",

          // ✅ ENHANCED: Status and priority
          status: orderData.status || "draft",
          priority: orderData.priority || "normal",

          // ✅ ENHANCED: Financial totals will be calculated by calculateTotals
          subtotal: 0, // Will be calculated
          totalTax: 0, // Will be calculated
          finalTotal: 0, // Will be calculated
          roundOffValue: 0, // Will be calculated
          finalTotalWithRoundOff: 0, // Will be calculated
        };

        setFormData(processedFormData);

        // ✅ ADDED: Calculate totals after setting form data
        if (processedFormData.items && processedFormData.items.length > 0) {
          setTimeout(() => {
            calculateTotals();
          }, 100); // Small delay to ensure formData is updated
        }
      } else {
        console.warn("⚠️ No order data found to load");
        addToast?.("No order data found to load", "warning");
      }
    } catch (error) {
      console.error("❌ Error loading existing order:", {
        error: error.message,
        orderId,
        existingOrder: !!existingOrder,
        serviceAvailable: !!saleOrderService,
        getSalesOrderMethod: !!(
          saleOrderService && saleOrderService.getSalesOrder
        ),
      });

      let errorMessage = `Error loading ${
        isQuotationMode ? "quotation" : "order"
      } data`;

      if (error.message.includes("service method not available")) {
        errorMessage += ": Service configuration issue";
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage += ": Network connection issue";
      } else {
        errorMessage += `: ${error.message}`;
      }

      addToast?.(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }, [
    existingOrder,
    orderId,
    location.state,
    saleOrderService,
    isQuotationMode,
    currentUser,
    addToast,
    calculateTotals,
  ]);

  useEffect(() => {
    if (editMode && (existingOrder || orderId || location.state)) {
      loadExistingOrder();
    }
  }, [editMode, loadExistingOrder]);

  // ✅ Calculate totals when items or GST type changes
  useEffect(() => {
    if (formData.items && formData.items.length > 0) {
      calculateTotals();
    }
  }, [formData.items, formData.gstType, calculateTotals]);

  // ✅ Handle form data changes
  const handleFormDataChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: null,
        }));
      }
    },
    [errors]
  );

  // ✅ UPDATED: Validate form - remove number validation for new quotations
  const validateForm = () => {
    const newErrors = {};

    // Header validation
    if (!formData.gstType) {
      newErrors.gstType = "GST type is required";
    }

    if (!formData.partyName && !formData.selectedParty) {
      newErrors.partyName = "Please select a customer";
    }

    const dateField = isQuotationMode ? "quotationDate" : "orderDate";

    if (!formData[dateField]) {
      newErrors[dateField] = `${
        isQuotationMode ? "Quotation" : "Order"
      } date is required`;
    }

    // ✅ UPDATED: Only validate number if editing existing quotation
    if (editMode) {
      const numberField = isQuotationMode ? "quotationNumber" : "orderNumber";
      if (!formData[numberField]) {
        newErrors[numberField] = `${
          isQuotationMode ? "Quotation" : "Order"
        } number is required`;
      }
    }

    // Product validation
    if (!formData.items || formData.items.length === 0) {
      newErrors.items = "At least one product is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ UPDATED: handleSave function - remove manual number generation
  const handleSave = async () => {
    if (!validateForm()) {
      addToast?.("Please fix the errors before saving", "error");
      return;
    }

    setSaving(true);

    try {
      // ✅ UPDATED: Always treat as quotation - backend handles numbering
      const orderData = {
        companyId,
        documentType: "quotation",
        orderType: "quotation",

        // ✅ UPDATED: GST and tax settings
        gstType: formData.gstType,
        gstEnabled: formData.gstType === "gst",
        taxMode: formData.gstType === "gst" ? "with-tax" : "without-tax",
        priceIncludesTax: formData.gstType === "gst",

        // ✅ Dates
        deliveryDate: formData.deliveryDate,
        expectedDeliveryDate: formData.deliveryDate,
        orderDate: formData.quotationDate || formData.orderDate,
        validUntil:
          formData.validUntil ||
          (() => {
            const date = new Date(formData.quotationDate || formData.orderDate);
            date.setDate(date.getDate() + 30);
            return date.toISOString();
          })(),

        // ✅ CRITICAL: Only send numbers if editing existing quotation
        ...(editMode &&
          formData.quotationNumber && {
            quotationNumber: formData.quotationNumber,
            orderNumber: formData.quotationNumber,
          }),

        // ✅ Customer data
        customer: formData.selectedParty,
        customerName: formData.partyName,
        customerMobile: formData.partyPhone,
        customerEmail: formData.partyEmail,
        customerAddress: formData.partyAddress,
        customerGstNumber: formData.partyGstNumber,

        // ✅ Employee data
        employeeName: formData.employeeName || currentUser?.name || "",
        employeeId: formData.employeeId || currentUser?.id || "",
        createdBy: currentUser?.name || currentUser?.id || "System",

        // ✅ Items
        items: (formData.items || []).map((item, index) => ({
          itemName: item.itemName || item.productName || item.name,
          itemCode: item.itemCode || item.productCode || "",
          description: item.description || "",
          hsnCode: item.hsnCode || item.hsnNumber || "0000",
          quantity: parseFloat(item.quantity || 0),
          unit: item.unit || "PCS",
          pricePerUnit: parseFloat(item.pricePerUnit || item.price || 0),
          taxRate: parseFloat(item.taxRate || item.gstRate || 18),
          discountPercent: parseFloat(item.discountPercent || 0),
          discountAmount: parseFloat(item.discountAmount || 0),
          subtotal: parseFloat(item.subtotal || 0),
          cgst: parseFloat(item.cgst || 0),
          sgst: parseFloat(item.sgst || 0),
          igst: parseFloat(item.igst || 0),
          amount: parseFloat(item.amount || item.totalAmount || 0),
          lineNumber: index + 1,
          selectedProduct: item.selectedProduct?.id || item.itemRef,
        })),

        // ✅ Description and notes
        description: formData.invoiceDescription || formData.notes || "",
        notes: formData.notes || formData.invoiceDescription || "",
        termsAndConditions: formData.termsAndConditions || "",

        // ✅ Payment details
        payment: {
          method: formData.paymentMethod || "cash",
          status: formData.paymentStatus || "pending",
          paidAmount: 0,
          advanceAmount: 0,
          pendingAmount: formData.finalTotalWithRoundOff || 0,
        },

        // ✅ Totals
        totals: {
          subtotal: formData.subtotal || 0,
          totalTax: formData.totalTax || 0,
          totalDiscount: 0,
          finalTotal: formData.finalTotalWithRoundOff || 0,
          roundOff: formData.roundOffValue || 0,
        },

        // ✅ Status
        status: formData.status || "draft",
        priority: formData.priority || "normal",
      };

      let result;
      if (onSaveOrder) {
        // Use external save handler if provided
        result = await onSaveOrder(orderData);
      } else {
        // Use internal service
        if (editMode && (existingOrder?.id || existingOrder?._id || orderId)) {
          const id = existingOrder?.id || existingOrder?._id || orderId;
          result = await saleOrderService.updateSalesOrder(id, orderData);
        } else {
          result = await saleOrderService.createSalesOrder(orderData);
        }
      }

      if (result?.success) {
        const action = editMode ? "updated" : "created";
        addToast?.(`Quotation ${action} successfully!`, "success");

        // ✅ UPDATED: Update form data with server response (including generated number)
        if (result.data) {
          const serverData =
            result.data.salesOrder ||
            result.data.order ||
            result.data.data?.salesOrder ||
            result.data.data?.order ||
            result.data;

          if (serverData && serverData.orderNumber) {
            setFormData((prev) => ({
              ...prev,
              orderNumber: serverData.orderNumber,
              quotationNumber: serverData.orderNumber,
            }));
          }
        }

        // ✅ SIMPLIFIED: Always redirect to quotations
        setTimeout(() => {
          if (isPageMode) {
            navigate(`/companies/${companyId}/quotations`);
          } else {
            if (onHide) {
              onHide();
            }
          }
        }, 1000);
      } else {
        const errorMessage =
          result?.error || result?.message || "Failed to save quotation";
        addToast?.(errorMessage, "error");
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("❌ Error saving quotation:", error);

      let userFriendlyMessage = "Error saving quotation";

      if (error.message?.includes("Company ID")) {
        userFriendlyMessage += ": Company information is missing";
      } else if (error.message?.includes("Customer")) {
        userFriendlyMessage += ": Customer information is invalid";
      } else if (
        error.message?.includes("Items") ||
        error.message?.includes("products")
      ) {
        userFriendlyMessage += ": Product information is incomplete";
      } else if (
        error.message?.includes("already exists") ||
        error.message?.includes("duplicate")
      ) {
        userFriendlyMessage += ": Quotation number already exists";
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("fetch")
      ) {
        userFriendlyMessage += ": Network connection issue";
      } else {
        userFriendlyMessage += `: ${error.message}`;
      }

      addToast?.(userFriendlyMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Handle close/cancel - always go to quotations
  const handleClose = () => {
    if (isPageMode) {
      if (onCancel) {
        onCancel();
      } else {
        navigate(`/companies/${companyId}/quotations`);
      }
    } else {
      if (onHide) {
        onHide();
      }
    }
  };

  // ✅ ADDED: Helper to display quotation number
  const displayQuotationNumber = useMemo(() => {
    if (editMode && formData.quotationNumber) {
      return formData.quotationNumber;
    }

    if (!editMode) {
      return "Will be generated automatically";
    }

    return "Generating...";
  }, [editMode, formData.quotationNumber]);

  // ✅ Validation checks
  if (!companyId) {
    const errorContent = (
      <Alert variant="warning" className="text-center">
        <h5>⚠️ No Company Selected</h5>
        <p className="mb-0">
          Please select a company to manage{" "}
          {isQuotationMode ? "quotations" : "sales orders"}.
        </p>
      </Alert>
    );

    if (isPageMode) {
      return <Container className="py-4">{errorContent}</Container>;
    } else {
      return (
        <Modal show={show} onHide={onHide} size="lg" backdrop="static">
          <Modal.Body>{errorContent}</Modal.Body>
        </Modal>
      );
    }
  }

  if (!isOnline) {
    const errorContent = (
      <Alert variant="warning" className="text-center">
        <h5>📡 No Internet Connection</h5>
        <p className="mb-0">
          {isQuotationMode ? "Quotations" : "Sales Orders"} data requires an
          internet connection.
        </p>
      </Alert>
    );

    if (isPageMode) {
      return <Container className="py-4">{errorContent}</Container>;
    } else {
      return (
        <Modal show={show} onHide={onHide} size="lg" backdrop="static">
          <Modal.Body>{errorContent}</Modal.Body>
        </Modal>
      );
    }
  }

  // ✅ Main form content
  const formContent = (
    <>
      {/* Error Alert */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="danger" className="mb-3">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <strong>Please fix the following errors:</strong>
          <ul className="mb-0 mt-2">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Row>
        <Col lg={8}>
          {/* ✅ Header Section */}
          <Card className="mb-3 border-2" style={{borderColor: "#007bff"}}>
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                {isQuotationMode ? "Quotation" : "Sales Order"} Details
              </h6>
            </Card.Header>
            <Card.Body>
              <OrderFormHeader
                formData={formData}
                onFormDataChange={handleFormDataChange}
                companyId={companyId}
                currentUser={currentUser}
                currentCompany={currentCompany}
                addToast={addToast}
                errors={errors}
                disabled={saving}
                isQuotationMode={isQuotationMode}
                displayQuotationNumber={displayQuotationNumber}
                editMode={editMode}
              />

              {/* ✅ ADDED: Number generation info */}
              {!editMode && (
                <div className="mt-3 p-2 bg-info bg-opacity-10 border border-info rounded">
                  <small className="text-info">
                    <FontAwesomeIcon icon={faFileInvoice} className="me-1" />
                    <em>
                      Quotation number will be generated automatically when
                      saving
                    </em>
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* ✅ Products Section */}
          <Card className="mb-3 border-2" style={{borderColor: "#28a745"}}>
            <Card.Header className="bg-success text-white">
              <h6 className="mb-0">
                <FontAwesomeIcon icon={faCalculator} className="me-2" />
                Products & Services
              </h6>
            </Card.Header>
            <Card.Body>
              <OrderFormProductSection
                formData={formData}
                onFormDataChange={handleFormDataChange}
                companyId={companyId}
                currentUser={currentUser}
                addToast={addToast}
                errors={errors}
                disabled={saving}
                isQuotationMode={isQuotationMode}
              />
            </Card.Body>
          </Card>
        </Col>

        {/* ✅ Summary Sidebar */}
        <Col lg={4}>
          <Card className="border-2" style={{borderColor: "#17a2b8"}}>
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">
                <FontAwesomeIcon icon={faCalculator} className="me-2" />
                {isQuotationMode ? "Quotation" : "Order"} Summary
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="order-summary">
                <div className="d-flex justify-content-between mb-2">
                  <span>Items:</span>
                  <strong>{formData.items?.length || 0}</strong>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span>
                  <strong>₹{formData.subtotal.toFixed(2)}</strong>
                </div>

                {formData.gstType === "gst" && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>GST:</span>
                    <strong>₹{formData.totalTax.toFixed(2)}</strong>
                  </div>
                )}

                {formData.roundOffValue !== 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>Round Off:</span>
                    <strong>₹{formData.roundOffValue.toFixed(2)}</strong>
                  </div>
                )}

                <hr />

                <div className="d-flex justify-content-between mb-3">
                  <span className="h6">Total:</span>
                  <strong className="h6 text-primary">
                    ₹{formData.finalTotalWithRoundOff.toFixed(2)}
                  </strong>
                </div>

                {/* ✅ ADDED: Quotation number display */}
                {!editMode && (
                  <div className="mb-3 p-2 bg-light rounded">
                    <div className="small text-muted">Quotation Number:</div>
                    <div className="small">
                      <em>{displayQuotationNumber}</em>
                    </div>
                  </div>
                )}

                {formData.partyName && (
                  <div className="bg-light p-2 rounded">
                    <h6 className="mb-1 small">Customer Details</h6>
                    <div className="small">
                      <strong>{formData.partyName}</strong>
                    </div>
                    {formData.partyPhone && (
                      <div className="small">📞 {formData.partyPhone}</div>
                    )}
                    {formData.partyEmail && (
                      <div className="small">✉️ {formData.partyEmail}</div>
                    )}
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );

  // ✅ Loading state
  const loadingContent = (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{minHeight: "300px"}}
    >
      <div className="text-center">
        <Spinner animation="border" role="status" className="mb-3">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="text-muted">Loading form...</p>
      </div>
    </div>
  );

  // ✅ Action buttons
  const actionButtons = (
    <>
      <Button
        variant="outline-secondary"
        onClick={handleClose}
        disabled={saving}
        className="me-2"
      >
        {isPageMode && <FontAwesomeIcon icon={faArrowLeft} className="me-2" />}
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={saving || !formData.items?.length}
      >
        {saving ? (
          <>
            <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
            Saving...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faSave} className="me-2" />
            {editMode ? "Update" : "Save"}{" "}
            {isQuotationMode ? "Quotation" : "Order"}
          </>
        )}
      </Button>
    </>
  );

  // ✅ Render based on mode
  if (isPageMode) {
    // ✅ Page mode - render as full page
    return (
      <div
        className="sales-order-page"
        style={{
          width: "100%",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
        }}
      >
        {/* Page Header */}
        <div className="page-header bg-white border-bottom sticky-top">
          <Container>
            <div className="d-flex justify-content-between align-items-center py-3">
              <div className="d-flex align-items-center">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleClose}
                  className="me-3"
                  disabled={saving}
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                  Back
                </Button>
                <div>
                  <h4 className="mb-0">
                    <FontAwesomeIcon
                      icon={faFileInvoice}
                      className="me-2 text-primary"
                    />
                    {editMode ? "Edit" : "Create"}{" "}
                    {isQuotationMode ? "Quotation" : "Sales Order"}
                  </h4>
                  {(formData.quotationNumber || formData.orderNumber) && (
                    <small className="text-muted">
                      #{formData.quotationNumber || formData.orderNumber}
                    </small>
                  )}
                  {!editMode && (
                    <small className="text-info d-block">
                      Number will be generated automatically
                    </small>
                  )}
                </div>
              </div>
              <div>{actionButtons}</div>
            </div>
          </Container>
        </div>

        {/* Page Content */}
        <Container className="py-4">
          {loading ? loadingContent : formContent}
        </Container>
      </div>
    );
  } else {
    // ✅ Modal mode - render as modal
    return (
      <Modal
        show={show}
        onHide={handleClose}
        size="xl"
        backdrop="static"
        className="sales-order-form-modal"
      >
        <Modal.Header className="bg-primary text-white">
          <Modal.Title className="d-flex align-items-center">
            <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
            {editMode ? "Edit" : "Create"}{" "}
            {isQuotationMode ? "Quotation" : "Sales Order"}
            {(formData.quotationNumber || formData.orderNumber) && (
              <span className="ms-2 badge bg-light text-dark">
                {formData.quotationNumber || formData.orderNumber}
              </span>
            )}
            {!editMode && (
              <span className="ms-2 badge bg-warning text-dark">
                Number: Auto-generated
              </span>
            )}
          </Modal.Title>
          <Button variant="light" size="sm" onClick={handleClose}>
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        </Modal.Header>

        <Modal.Body className="p-0">
          <Container fluid className="py-3">
            {loading ? loadingContent : formContent}
          </Container>
        </Modal.Body>

        <Modal.Footer className="bg-light">{actionButtons}</Modal.Footer>
      </Modal>
    );
  }
}

export default SalesOrderForm;
