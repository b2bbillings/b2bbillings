import React, {useState, useEffect} from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Spinner,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSave,
  faUser,
  faRefresh,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import {useParams} from "react-router-dom";
import purchaseOrderService from "../../../services/purchaseOrderService";
import authService from "../../../services/authService";
import PurchaseOrderFormHeader from "./PurchaseOrderForm/PurchaseOrderFormHeader";
import PurchaseOrderFormProductSelection from "./PurchaseOrderForm/PurchaseOrderFormProductSelection";

function PurchaseOrderForm({
  onSave,
  onCancel,
  editingOrder = null,
  currentCompany,
  currentUser: propCurrentUser,
  companyId,
  addToast,
  onNavigate,
}) {
  const {companyId: urlCompanyId} = useParams();
  const effectiveCompanyId = companyId || urlCompanyId;

  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    // Header fields
    gstType: "gst",
    deliveryDate: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseOrderNumber: "",
    employeeName: "",
    employeeId: "",
    selectedEmployee: "",
    description: "",

    // Party/Supplier selection
    selectedParty: "",
    partyName: "",
    partyPhone: "",
    partyEmail: "",
    partyAddress: "",
    partyGstNumber: "",

    // Product rows
    items: [
      {
        id: 1,
        selectedProduct: "",
        productName: "",
        productCode: "",
        description: "",
        quantity: "",
        price: "",
        purchasePrice: "",
        unit: "pcs",
        gstMode: "exclude",
        gstRate: 18,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        availableStock: 0,
        hsnNumber: "",
      },
    ],
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  // Enhanced user management
  const fetchCurrentUser = async () => {
    try {
      setIsLoadingUser(true);
      setUserError(null);

      // Try multiple methods to get user
      const userResult = await authService.getCurrentUserSafe();
      if (userResult.success && userResult.user) {
        setCurrentUser(userResult.user);
        return userResult.user;
      }

      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        setCurrentUser(storedUser);
        return storedUser;
      }

      const refreshResult = await authService.refreshCurrentUser();
      if (refreshResult.success && refreshResult.user) {
        setCurrentUser(refreshResult.user);
        return refreshResult.user;
      }

      setUserError("Unable to fetch user information");
      return null;
    } catch (error) {
      setUserError(error.message || "Failed to fetch user information");
      return null;
    } finally {
      setIsLoadingUser(false);
    }
  };

  const autoFillUserData = (user) => {
    if (user && !formData.employeeName) {
      const employeeInfo = authService.getUserEmployeeInfo();

      if (employeeInfo) {
        handleFormDataChange("employeeName", employeeInfo.name);
        handleFormDataChange("employeeId", employeeInfo.employeeId);
      } else {
        const employeeName =
          user.name || user.username || user.displayName || "";
        const employeeId = user.employeeId || user.id || user._id || "";

        if (employeeName) {
          handleFormDataChange("employeeName", employeeName);
        }
        if (employeeId) {
          handleFormDataChange("employeeId", employeeId);
        }
      }
    }
  };

  const retryUserFetch = async () => {
    const user = await fetchCurrentUser();
    if (user) {
      autoFillUserData(user);
    }
  };

  // Helper function for back button
  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else if (onNavigate) {
      onNavigate("purchase-orders");
    } else {
      window.history.back();
    }
  };

  // Cleaner useEffect hooks
  useEffect(() => {
    if (editingOrder) {
      setFormData((prev) => ({
        ...prev,
        ...editingOrder,
        items: editingOrder.items || prev.items,
        // Map purchase order specific fields
        purchaseOrderNumber:
          editingOrder.purchaseOrderNumber || editingOrder.orderNumber,
        purchaseDate: editingOrder.purchaseDate || editingOrder.orderDate,
        deliveryDate:
          editingOrder.deliveryDate || editingOrder.expectedDeliveryDate,
      }));
    }
  }, [editingOrder]);

  useEffect(() => {
    const initializeUser = async () => {
      if (propCurrentUser) {
        setCurrentUser(propCurrentUser);
        autoFillUserData(propCurrentUser);
      } else if (!currentUser && !isLoadingUser) {
        const user = await fetchCurrentUser();
        if (user) {
          autoFillUserData(user);
        }
      } else if (currentUser && !formData.employeeName) {
        autoFillUserData(currentUser);
      }
    };

    initializeUser();
  }, [propCurrentUser]);

  useEffect(() => {
    if (propCurrentUser && propCurrentUser !== currentUser) {
      setCurrentUser(propCurrentUser);
      setUserError(null);
      autoFillUserData(propCurrentUser);
    }
  }, [propCurrentUser]);

  // Enhanced form data handler with cleaner GST calculation
  const handleFormDataChange = (field, value) => {
    setFormData((prev) => {
      const newData = {...prev, [field]: value};

      // Handle GST type change - recalculate all item totals
      if (field === "gstType" || field === "_gstTypeChanged") {
        newData.items = (newData.items || []).map((item) => {
          if (item.quantity && item.price) {
            return calculateItemTotals(item, newData.gstType);
          }
          return item;
        });
      }

      return newData;
    });

    // Clear field-specific errors
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  // Extracted calculation logic for better maintainability
  const calculateItemTotals = (item, gstType) => {
    const quantity = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const gstRate = parseFloat(item.gstRate) || 0;

    let subtotal = quantity * price;
    let gstAmount = 0;
    let totalAmount = 0;

    if (gstType === "gst") {
      if (item.gstMode === "include") {
        totalAmount = subtotal;
        gstAmount = (subtotal * gstRate) / (100 + gstRate);
        subtotal = totalAmount - gstAmount;
      } else {
        gstAmount = (subtotal * gstRate) / 100;
        totalAmount = subtotal + gstAmount;
      }
    } else {
      totalAmount = subtotal;
      gstAmount = 0;
    }

    return {
      ...item,
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  };

  // Cleaner totals calculation
  const calculateGrandTotals = () => {
    const items = formData.items || [];
    const totals = items.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + (parseFloat(item.subtotal) || 0),
        gstAmount: acc.gstAmount + (parseFloat(item.gstAmount) || 0),
        grandTotal: acc.grandTotal + (parseFloat(item.totalAmount) || 0),
        totalQuantity: acc.totalQuantity + (parseFloat(item.quantity) || 0),
      }),
      {subtotal: 0, gstAmount: 0, grandTotal: 0, totalQuantity: 0}
    );

    return {
      subtotal: Math.round(totals.subtotal * 100) / 100,
      gstAmount: Math.round(totals.gstAmount * 100) / 100,
      grandTotal: Math.round(totals.grandTotal * 100) / 100,
      totalQuantity: totals.totalQuantity,
    };
  };

  // Replace your current handleSave function with this enhanced version:
  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      console.log("🔍 DEBUGGING: Current form data:", {
        partyName: formData.partyName,
        partyPhone: formData.partyPhone,
        partyEmail: formData.partyEmail,
        selectedParty: formData.selectedParty,
      });

      const effectiveUser = currentUser || propCurrentUser;
      if (!effectiveUser && !formData.employeeName) {
        throw new Error(
          "Employee information is required. Please wait for user data to load or retry."
        );
      }

      const supplierName = formData.partyName?.trim();
      const supplierMobile = formData.partyPhone?.trim();
      const supplierEmail = formData.partyEmail?.trim();

      if (!supplierName && !supplierMobile) {
        throw new Error(
          "Please select a supplier or provide supplier name/mobile number."
        );
      }

      if (!validateForm()) {
        throw new Error("Please fix the validation errors before saving");
      }

      const validItems = formData.items.filter(
        (item) =>
          item.productName &&
          parseFloat(item.quantity) > 0 &&
          parseFloat(item.price) > 0
      );

      if (validItems.length === 0) {
        throw new Error("Please add at least one valid product");
      }

      const totals = calculateGrandTotals();

      // ✅ ENHANCED: Use the service's formatOrderData method with auto-detection
      const orderData = {
        orderNumber: formData.purchaseOrderNumber?.trim(),
        orderDate: formData.purchaseDate,
        expectedDeliveryDate: formData.deliveryDate,
        orderType: "purchase_order",

        // ✅ CRITICAL: Supplier information
        supplierName: supplierName || "",
        supplierMobile: supplierMobile || "",
        supplierEmail: supplierEmail || "",
        supplier: formData.selectedParty || "",

        // ✅ NEW: Enable auto-detection explicitly
        autoDetectSourceCompany: true,

        companyId: effectiveCompanyId,
        gstEnabled: formData.gstType === "gst",
        gstType: formData.gstType,
        taxMode: "without-tax",
        priceIncludesTax: false,

        items: validItems.map((item, index) => ({
          lineNumber: index + 1,
          itemName: item.productName,
          productName: item.productName,
          itemCode: item.productCode || "",
          productCode: item.productCode || "",
          description: item.description || "",
          hsnNumber: item.hsnNumber || "0000",
          hsnCode: item.hsnNumber || "0000",
          quantity: parseFloat(item.quantity),
          unit: item.unit || "PCS",
          pricePerUnit: parseFloat(item.price),
          price: parseFloat(item.price),
          rate: parseFloat(item.price),
          purchasePrice: parseFloat(item.price),
          gstRate:
            formData.gstType === "gst" ? parseFloat(item.gstRate) || 18 : 0,
          taxRate:
            formData.gstType === "gst" ? parseFloat(item.gstRate) || 18 : 0,
          gstMode: item.gstMode || "exclude",
          taxMode: item.gstMode === "include" ? "with-tax" : "without-tax",
          priceIncludesTax: item.gstMode === "include",
          amount: parseFloat(item.totalAmount) || 0,
          selectedProduct: item.selectedProduct || "",
          availableStock: item.availableStock || 0,
          discountPercent: 0,
          discountAmount: 0,
        })),

        totals: {
          subtotal: totals.subtotal,
          totalQuantity: totals.totalQuantity,
          totalDiscount: 0,
          totalDiscountAmount: 0,
          totalTax: totals.gstAmount,
          totalTaxableAmount: totals.subtotal,
          finalTotal: totals.grandTotal,
          roundOff: 0,
          withTaxTotal: totals.grandTotal,
          withoutTaxTotal: totals.subtotal,
        },

        payment: {
          method: "credit",
          status: "pending",
          paidAmount: 0,
          advanceAmount: 0,
          pendingAmount: totals.grandTotal,
          paymentDate: new Date(),
          dueDate: null,
          creditDays: 30,
          reference: "",
          notes: "",
        },

        notes: formData.description || "",
        status: "draft",
        priority: "normal",
        createdBy:
          formData.employeeId ||
          effectiveUser?.id ||
          effectiveUser?._id ||
          "system",
        lastModifiedBy:
          formData.employeeId ||
          effectiveUser?.id ||
          effectiveUser?._id ||
          "system",
      };

      console.log("📦 Order data before formatting:", {
        supplierName: orderData.supplierName,
        supplierMobile: orderData.supplierMobile,
        autoDetectSourceCompany: orderData.autoDetectSourceCompany,
        companyId: orderData.companyId,
      });

      // ✅ Use the enhanced service with proper formatting
      const formattedData = purchaseOrderService.formatOrderData(orderData);

      console.log("📦 Formatted order data:", {
        supplierName: formattedData.supplierName,
        supplierMobile: formattedData.supplierMobile,
        autoDetectSourceCompany: formattedData.autoDetectSourceCompany,
        companyId: formattedData.companyId,
      });

      const response = await purchaseOrderService.createPurchaseOrder(
        formattedData
      );

      console.log("📦 Backend response:", response);

      if (response.success) {
        const purchaseOrderData =
          response.data?.data?.purchaseOrder || response.data?.purchaseOrder;
        const orderData = response.data?.data?.order || response.data?.order;

        // ✅ NEW: Extract source company tracking info
        const sourceTracking = response.data?.data?.sourceCompanyTracking;

        console.log("✅ SUCCESS: Purchase order created:", {
          orderNumber: purchaseOrderData?.orderNumber || orderData?.orderNumber,
          sourceCompanyDetected: sourceTracking?.detected,
          sourceCompanyId: sourceTracking?.sourceCompanyId,
          detectionMethod: sourceTracking?.detectionMethod,
          sourceCompanyName: sourceTracking?.sourceCompanyDetails?.businessName,
        });

        // ✅ Enhanced success message
        let successMessage = "Purchase order created successfully!";
        if (
          sourceTracking?.detected &&
          sourceTracking?.sourceCompanyDetails?.businessName
        ) {
          successMessage += ` (Linked to ${sourceTracking.sourceCompanyDetails.businessName})`;
        }

        addToast?.(successMessage, "success");

        if (onSave) {
          onSave({
            purchaseOrder: purchaseOrderData,
            order: orderData,
            response: response.data,
            sourceTracking, // ✅ Pass source tracking info
          });
        }

        setTimeout(() => {
          if (onNavigate) {
            onNavigate("purchase-orders");
          }
        }, 1500);
      } else {
        throw new Error(response.message || "Failed to create purchase order");
      }
    } catch (error) {
      console.error("❌ Error saving purchase order:", error);
      setError(error.message);
      addToast?.(`Error saving purchase order: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // ✅ FIXED: Enhanced validation with better supplier checks
  const validateForm = () => {
    const newErrors = {};

    // ✅ Debug form data during validation
    console.log("🔍 VALIDATION: Form data being validated:", {
      partyName: formData.partyName,
      partyPhone: formData.partyPhone,
      selectedParty: formData.selectedParty,
      purchaseOrderNumber: formData.purchaseOrderNumber,
      employeeName: formData.employeeName,
    });

    // ✅ Enhanced supplier validation with specific checks
    const supplierName = formData.partyName?.trim();
    const supplierMobile = formData.partyPhone?.trim();

    if (!supplierName && !supplierMobile) {
      newErrors.partyName = "Please select a supplier or provide supplier name";
      newErrors.partyPhone = "Please provide supplier mobile number";
      console.log("❌ VALIDATION FAILED: No supplier information");
    }

    // ✅ Check if supplier fields are properly set
    if (!supplierName) {
      console.log("⚠️  WARNING: Supplier name is missing");
    }
    if (!supplierMobile) {
      console.log("⚠️  WARNING: Supplier mobile is missing");
    }

    // Required field validations
    const requiredFields = [
      {
        field: "purchaseOrderNumber",
        message: "Purchase order number is required",
      },
      {field: "purchaseDate", message: "Purchase date is required"},
      {field: "employeeName", message: "Employee selection is required"},
    ];

    requiredFields.forEach(({field, message}) => {
      if (!formData[field]) {
        newErrors[field] = message;
        console.log(`❌ VALIDATION FAILED: ${field} - ${message}`);
      }
    });

    // Validate items
    const validItems = formData.items.filter(
      (item) =>
        item.productName &&
        parseFloat(item.quantity) > 0 &&
        parseFloat(item.price) > 0
    );

    if (validItems.length === 0) {
      newErrors.items = "Please add at least one valid product";
      console.log("❌ VALIDATION FAILED: No valid items");
    }

    // Validate individual items
    formData.items.forEach((item, index) => {
      if (item.productName) {
        if (!item.quantity || parseFloat(item.quantity) <= 0) {
          newErrors[`items.${index}.quantity`] = "Quantity is required";
        }
        if (!item.price || parseFloat(item.price) <= 0) {
          newErrors[`items.${index}.price`] = "Purchase price is required";
        }
      }
    });

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;

    console.log("🔍 VALIDATION RESULT:", {
      isValid,
      errorCount: Object.keys(newErrors).length,
      errors: newErrors,
    });

    return isValid;
  };

  // ✅ Add this debug function to check form data in real-time
  const debugSupplierData = () => {
    console.log("🔍 REAL-TIME SUPPLIER DATA:", {
      partyName: formData.partyName,
      partyPhone: formData.partyPhone,
      partyEmail: formData.partyEmail,
      selectedParty: formData.selectedParty,
      timestamp: new Date().toISOString(),
    });
  };

  // ✅ Add this useEffect to monitor supplier data changes
  useEffect(() => {
    debugSupplierData();
  }, [formData.partyName, formData.partyPhone, formData.selectedParty]);

  const totals = calculateGrandTotals();

  // Enhanced loading state
  if (loading) {
    return (
      <Container
        className="py-4"
        style={{backgroundColor: "#FF8C00", minHeight: "100vh"}}
      >
        <div className="text-center">
          <Spinner animation="border" className="text-white" />
          <p className="mt-2 text-white fw-bold">
            Loading purchase order form...
          </p>
        </div>
      </Container>
    );
  }

  // Helper function for save button state
  const isSaveDisabled = () => {
    return (
      saving ||
      totals.grandTotal <= 0 ||
      (isLoadingUser && !formData.employeeName) ||
      (!currentUser && !propCurrentUser && !formData.employeeName)
    );
  };

  const getSaveButtonTitle = () => {
    if (isLoadingUser) return "Waiting for user information...";
    if (!currentUser && !propCurrentUser && !formData.employeeName)
      return "Employee information required";
    if (totals.grandTotal <= 0) return "Add products to save";
    return "Save purchase order";
  };

  return (
    <Container
      className="py-3"
      style={{backgroundColor: "#FF8C00", minHeight: "100vh"}}
    >
      {/* Error Alert */}
      {error && (
        <Alert
          variant="danger"
          className="mb-3"
          dismissible
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* User Status Alert */}
      {(isLoadingUser || userError) && (
        <Alert variant={isLoadingUser ? "info" : "warning"} className="mb-3">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              {isLoadingUser ? (
                <>
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  <Spinner size="sm" className="me-2" />
                  Loading user information...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  ⚠️ {userError}
                </>
              )}
            </div>
            {userError && !isLoadingUser && (
              <Button
                variant="outline-warning"
                size="sm"
                onClick={retryUserFetch}
                disabled={isLoadingUser}
              >
                <FontAwesomeIcon icon={faRefresh} className="me-1" />
                Retry
              </Button>
            )}
          </div>
        </Alert>
      )}

      {/* Page Heading with Back Button */}
      <div className="mb-3">
        <Card
          className="mx-auto shadow-sm"
          style={{
            maxWidth: "850px",
            border: "2px solid #000",
            borderRadius: "8px",
          }}
        >
          <Card.Body className="py-2 px-3">
            <div className="d-flex align-items-center justify-content-between">
              {/* Back Button */}
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleBack}
                disabled={saving}
                style={{
                  borderWidth: "2px",
                  borderColor: "#000",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "6px 12px",
                  borderRadius: "6px",
                }}
                title="Go back to purchase orders list"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                Back
              </Button>

              {/* Title */}
              <h4 className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faSave} className="me-2 text-primary" />
                {editingOrder ? "Edit Purchase Order" : "Create Purchase Order"}
              </h4>

              {/* Spacer for centering */}
              <div style={{width: "60px"}}></div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Main Form Card - Same width */}
      <Card className="mx-auto shadow-lg" style={{maxWidth: "850px"}}>
        <Card.Body className="p-4">
          {/* Header Section */}
          <PurchaseOrderFormHeader
            formData={formData}
            onFormDataChange={handleFormDataChange}
            companyId={effectiveCompanyId}
            currentUser={currentUser || propCurrentUser}
            currentCompany={currentCompany}
            addToast={addToast}
            errors={errors}
            disabled={saving}
          />

          {/* Product Section */}
          <PurchaseOrderFormProductSelection
            formData={formData}
            onFormDataChange={handleFormDataChange}
            companyId={effectiveCompanyId}
            currentUser={currentUser || propCurrentUser}
            addToast={addToast}
            errors={errors}
            disabled={saving}
          />

          {/* Description Section - Compact */}
          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-bold text-danger small mb-1">
                  Description
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formData.description || ""}
                  onChange={(e) =>
                    handleFormDataChange("description", e.target.value)
                  }
                  className="border-2"
                  style={{
                    borderColor: "#000",
                    fontSize: "12px",
                    padding: "6px 8px",
                    resize: "none",
                  }}
                  placeholder="Enter description..."
                  disabled={saving}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Totals and Actions Section - Compact Layout */}
          <Row className="mb-2">
            <Col md={7}>
              {/* Totals Display - Compact */}
              <Card
                className="border-2 bg-light h-100"
                style={{borderColor: "#000"}}
              >
                <Card.Body className="p-2">
                  <Row className="g-2 align-items-center">
                    <Col xs={6}>
                      <div style={{fontSize: "11px"}}>
                        <div className="mb-1">
                          <strong>Items: {totals.totalQuantity}</strong>
                        </div>
                        <div className="mb-1">
                          <strong>
                            Subtotal: ₹{totals.subtotal.toFixed(2)}
                          </strong>
                        </div>
                        {formData.gstType === "gst" && (
                          <div>
                            <strong>GST: ₹{totals.gstAmount.toFixed(2)}</strong>
                          </div>
                        )}
                      </div>
                    </Col>
                    <Col xs={6} className="text-end">
                      <div
                        className="text-warning fw-bold"
                        style={{fontSize: "16px"}}
                      >
                        <strong>₹{totals.grandTotal.toFixed(2)}</strong>
                      </div>
                      <div className="text-muted" style={{fontSize: "10px"}}>
                        {formData.gstType === "gst"
                          ? "GST Inclusive"
                          : "Non-GST"}
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            <Col
              md={5}
              className="d-flex align-items-center justify-content-end"
            >
              {/* Action Buttons - Compact */}
              <div className="d-flex gap-2">
                <Button
                  style={{
                    backgroundColor: "#FFD700",
                    borderColor: "#000",
                    color: "#000",
                    fontSize: "12px",
                    padding: "8px 16px",
                    fontWeight: "bold",
                    minWidth: "100px",
                  }}
                  onClick={handleSave}
                  disabled={isSaveDisabled()}
                  className="border-2"
                  title={getSaveButtonTitle()}
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} className="me-1" />
                      Save
                      {isLoadingUser && <Spinner size="sm" className="ms-1" />}
                    </>
                  )}
                </Button>

                <Button
                  variant="outline-secondary"
                  onClick={handleBack}
                  disabled={saving}
                  className="border-2"
                  style={{
                    borderColor: "#000",
                    fontSize: "12px",
                    padding: "8px 16px",
                    fontWeight: "bold",
                    minWidth: "80px",
                  }}
                  title="Cancel and go back"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                  Cancel
                </Button>
              </div>
            </Col>
          </Row>

          {/* Validation Errors - Compact */}
          {(Object.keys(errors).length > 0 || userError) && (
            <Row>
              <Col md={12}>
                <Alert variant="danger" className="p-2 mb-0">
                  <div style={{fontSize: "11px"}}>
                    <strong>Please fix the following issues:</strong>
                    <ul className="mb-0 mt-1" style={{paddingLeft: "16px"}}>
                      {userError && (
                        <li>
                          <strong>User Error:</strong> {userError}
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 ms-1 text-decoration-none"
                            style={{fontSize: "10px"}}
                            onClick={retryUserFetch}
                            disabled={isLoadingUser}
                          >
                            (Retry)
                          </Button>
                        </li>
                      )}

                      {Object.entries(errors).map(([field, message]) => (
                        <li key={field}>{message}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default PurchaseOrderForm;
