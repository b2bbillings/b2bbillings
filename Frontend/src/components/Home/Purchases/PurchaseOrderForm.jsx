import React, {useState, useEffect} from "react";
import {Row, Col, Card, Button, Form, Alert, Spinner} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSave,
  faUser,
  faRefresh,
  faArrowLeft,
  faShoppingCart,
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
  const editMode = !!editingOrder;

  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState(null);

  const getTheme = () => {
    return {
      primary: "#6366f1",
      primaryLight: "#8b5cf6",
      primaryDark: "#4f46e5",
      primaryRgb: "99, 102, 241",
      secondary: "#6c757d",
      accent: "#8b5cf6",
      background: "#f8fafc",
      surface: "#ffffff",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      text: "#1e293b",
      textMuted: "#64748b",
      border: "#e2e8f0",
      borderDark: "#cbd5e1",
    };
  };

  const theme = getTheme();

  const [formData, setFormData] = useState(() => {
    const initialData = {
      gstType: "gst",
      deliveryDate: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      employeeName: "",
      employeeId: "",
      selectedEmployee: "",
      description: "",
      selectedParty: "",
      partyName: "",
      partyPhone: "",
      partyEmail: "",
      partyAddress: "",
      partyGstNumber: "",
      items: [
        {
          id: 1,
          selectedProduct: "",
          productName: "",
          productCode: "",
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
    };

    // Only include purchaseOrderNumber in edit mode
    if (editMode && editingOrder?.purchaseOrderNumber) {
      initialData.purchaseOrderNumber = editingOrder.purchaseOrderNumber;
    }

    return initialData;
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  const pageStyles = {
    wrapper: {
      backgroundColor: theme.background,
      minHeight: "100vh",
      padding: "20px 0",
      borderRadius: "0",
    },
    card: {
      border: `1px solid ${theme.border}`,
      borderRadius: "0",
      backgroundColor: theme.surface,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    },
    button: {
      borderWidth: "1px",
      borderColor: theme.border,
      borderRadius: "0",
      fontWeight: "600",
    },
    input: {
      borderColor: theme.border,
      borderWidth: "1px",
      borderRadius: "0",
      fontSize: "14px",
      fontWeight: "500",
      backgroundColor: theme.surface,
    },
  };

  const fetchCurrentUser = async () => {
    try {
      setIsLoadingUser(true);
      setUserError(null);

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

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else if (onNavigate) {
      onNavigate("purchase-orders");
    } else {
      window.history.back();
    }
  };

  useEffect(() => {
    if (editingOrder) {
      setFormData((prev) => ({
        ...prev,
        ...editingOrder,
        items: editingOrder.items || prev.items,
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

  const handleFormDataChange = (field, value) => {
    setFormData((prev) => {
      const newData = {...prev, [field]: value};

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

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

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

  // FIXED: Enhanced validation function
  const validateForm = () => {
    const newErrors = {};

    // CRITICAL FIX: Only validate purchaseOrderNumber in edit mode
    if (
      editMode &&
      (!formData.purchaseOrderNumber || !formData.purchaseOrderNumber.trim())
    ) {
      newErrors.purchaseOrderNumber = "Purchase order number is required";
    }

    // Enhanced supplier validation
    const supplierName = formData.partyName?.trim();
    const supplierMobile = formData.partyPhone?.trim();

    if (!supplierName && !supplierMobile) {
      newErrors.partyName = "Please select a supplier or provide supplier name";
      newErrors.partyPhone = "Please provide supplier mobile number";
    }

    // Required field validations (excluding purchaseOrderNumber in create mode)
    const requiredFields = [
      {field: "purchaseDate", message: "Purchase date is required"},
      {field: "employeeName", message: "Employee selection is required"},
    ];

    requiredFields.forEach(({field, message}) => {
      if (!formData[field]) {
        newErrors[field] = message;
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
    return Object.keys(newErrors).length === 0;
  };

  // FIXED: Enhanced handleSave function
  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

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

      // FIXED: Use the corrected validation function
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

      const orderData = {
        companyId: effectiveCompanyId,
        orderType: "purchase_order",
        gstType: formData.gstType || "gst",
        gstEnabled: formData.gstType === "gst",

        // Supplier information
        supplier: formData.selectedParty || "",
        supplierName: supplierName || "",
        supplierMobile: supplierMobile || "",
        supplierEmail: supplierEmail || "",

        // Dates
        orderDate:
          formData.purchaseDate || new Date().toISOString().split("T")[0],
        purchaseDate:
          formData.purchaseDate || new Date().toISOString().split("T")[0],
        expectedDeliveryDate: formData.deliveryDate || null,

        // Employee info
        employeeName: formData.employeeName || effectiveUser?.name || "",
        employeeId: formData.employeeId || effectiveUser?.id || "",

        // Items
        items: validItems.map((item, index) => ({
          lineNumber: index + 1,
          itemName: item.productName,
          productName: item.productName,
          itemCode: item.productCode || "",
          productCode: item.productCode || "",
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

        // Payment
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

        // Additional fields
        notes: formData.description || "",
        termsAndConditions: formData.termsAndConditions || "",
        status: formData.status || "draft",
        priority: formData.priority || "normal",

        // CRITICAL: Only include purchaseOrderNumber in edit mode
        ...(editMode &&
          formData.purchaseOrderNumber && {
            purchaseOrderNumber: formData.purchaseOrderNumber,
          }),

        // Creation metadata
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
        autoDetectSourceCompany: true,
      };

      let result;

      if (editMode && formData.id) {
        // Update existing order
        result = await purchaseOrderService.updatePurchaseOrder(
          formData.id,
          orderData
        );
      } else {
        // Create new order (orderNumber will be generated by backend)
        result = await purchaseOrderService.createPurchaseOrder(orderData);
      }

      if (result.success) {
        const savedOrder =
          result.data?.data?.purchaseOrder ||
          result.data?.purchaseOrder ||
          result.data;
        const orderNumber =
          savedOrder?.orderNumber || savedOrder?.purchaseOrderNumber;

        addToast?.(
          editMode
            ? `Purchase order ${orderNumber || ""} updated successfully!`
            : `Purchase order ${orderNumber || ""} created successfully!`,
          "success"
        );

        if (onSave) {
          onSave(savedOrder);
        }

        setTimeout(() => {
          if (onNavigate) {
            onNavigate("purchase-orders");
          }
        }, 1500);
      } else {
        throw new Error(result.message || "Failed to save purchase order");
      }
    } catch (error) {
      setError(error.message);
      addToast?.(`Error saving purchase order: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateGrandTotals();

  if (loading) {
    return (
      <div style={pageStyles.wrapper}>
        <div className="text-center">
          <Spinner animation="border" style={{color: theme.primary}} />
          <p className="mt-2 fw-bold" style={{color: theme.text}}>
            Loading purchase order form...
          </p>
        </div>
      </div>
    );
  }

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
    <>
      <style>
        {`
          .card,
          .card *,
          .btn,
          .btn *,
          .form-control,
          .form-select,
          .input-group-text,
          .badge,
          .dropdown-menu,
          .modal-content,
          .modal-header,
          .modal-body,
          .modal-footer,
          .alert {
            border-radius: 0 !important;
            -webkit-border-radius: 0 !important;
            -moz-border-radius: 0 !important;
            -ms-border-radius: 0 !important;
          }
          
          * {
            --bs-border-radius: 0 !important;
            --bs-border-radius-sm: 0 !important;
            --bs-border-radius-lg: 0 !important;
            --bs-border-radius-xl: 0 !important;
            --bs-border-radius-2xl: 0 !important;
            --bs-border-radius-pill: 0 !important;
          }

          .form-label {
            font-size: 15px !important;
            font-weight: 600 !important;
          }
        `}
      </style>

      <div style={pageStyles.wrapper}>
        {error && (
          <Alert
            variant="danger"
            className="mb-3 mx-3"
            dismissible
            onClose={() => setError("")}
            style={pageStyles.card}
          >
            {error}
          </Alert>
        )}

        {(isLoadingUser || userError) && (
          <Alert
            variant={isLoadingUser ? "info" : "warning"}
            className="mb-3 mx-3"
            style={pageStyles.card}
          >
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
                  style={pageStyles.button}
                >
                  <FontAwesomeIcon icon={faRefresh} className="me-1" />
                  Retry
                </Button>
              )}
            </div>
          </Alert>
        )}

        <div className="mb-3 px-3">
          <Card className="shadow-sm" style={pageStyles.card}>
            <Card.Body className="py-2 px-3">
              <div className="d-flex align-items-center justify-content-between">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleBack}
                  disabled={saving}
                  style={{
                    ...pageStyles.button,
                    fontSize: "12px",
                    padding: "6px 12px",
                  }}
                  title="Go back to purchase orders list"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                  Back
                </Button>

                <h4
                  className="mb-0 fw-bold d-flex align-items-center"
                  style={{color: theme.text}}
                >
                  <FontAwesomeIcon
                    icon={faShoppingCart}
                    className="me-2"
                    style={{color: theme.primary}}
                  />
                  {editMode ? "Edit Purchase Order" : "Create Purchase Order"}
                </h4>

                <div style={{width: "60px"}}></div>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div style={{maxWidth: "1200px", margin: "0 auto", padding: "0 15px"}}>
          <Card className="shadow-lg" style={pageStyles.card}>
            <Card.Body className="p-4">
              <PurchaseOrderFormHeader
                formData={formData}
                onFormDataChange={handleFormDataChange}
                companyId={effectiveCompanyId}
                currentUser={currentUser || propCurrentUser}
                currentCompany={currentCompany}
                addToast={addToast}
                errors={errors}
                disabled={saving}
                editMode={editMode}
              />

              <PurchaseOrderFormProductSelection
                formData={formData}
                onFormDataChange={handleFormDataChange}
                companyId={effectiveCompanyId}
                currentUser={currentUser || propCurrentUser}
                addToast={addToast}
                errors={errors}
                disabled={saving}
              />

              <Row className="mb-2">
                <Col md={7}>
                  <Card
                    className="h-100"
                    style={{
                      ...pageStyles.card,
                      backgroundColor: theme.background,
                    }}
                  >
                    <Card.Body className="p-3">
                      <Row className="g-2 align-items-center">
                        <Col xs={6}>
                          <div style={{fontSize: "13px"}}>
                            <div className="mb-2">
                              <strong style={{color: theme.text}}>
                                Items: {totals.totalQuantity}
                              </strong>
                            </div>
                            <div className="mb-2">
                              <strong style={{color: theme.text}}>
                                Subtotal: ₹{totals.subtotal.toFixed(2)}
                              </strong>
                            </div>
                            {formData.gstType === "gst" && (
                              <div>
                                <strong style={{color: theme.text}}>
                                  GST: ₹{totals.gstAmount.toFixed(2)}
                                </strong>
                              </div>
                            )}
                          </div>
                        </Col>
                        <Col xs={6} className="text-end">
                          <div
                            className="fw-bold"
                            style={{fontSize: "18px", color: theme.primary}}
                          >
                            ₹{totals.grandTotal.toFixed(2)}
                          </div>
                          <div
                            style={{fontSize: "11px", color: theme.textMuted}}
                          >
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
                  <div className="d-flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={isSaveDisabled()}
                      style={{
                        ...pageStyles.button,
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                        color: "white",
                        fontSize: "14px",
                        padding: "10px 20px",
                        minWidth: "120px",
                      }}
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
                          {isLoadingUser && (
                            <Spinner size="sm" className="ms-1" />
                          )}
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline-secondary"
                      onClick={handleBack}
                      disabled={saving}
                      style={{
                        ...pageStyles.button,
                        fontSize: "14px",
                        padding: "10px 20px",
                        minWidth: "100px",
                      }}
                      title="Cancel and go back"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                      Cancel
                    </Button>
                  </div>
                </Col>
              </Row>

              {(Object.keys(errors).length > 0 || userError) && (
                <Row>
                  <Col md={12}>
                    <Alert
                      variant="danger"
                      className="p-3 mb-0"
                      style={pageStyles.card}
                    >
                      <div style={{fontSize: "13px"}}>
                        <strong>Please fix the following issues:</strong>
                        <ul className="mb-0 mt-2" style={{paddingLeft: "20px"}}>
                          {userError && (
                            <li>
                              <strong>User Error:</strong> {userError}
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 ms-1 text-decoration-none"
                                style={{fontSize: "12px"}}
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
        </div>
      </div>
    </>
  );
}

export default PurchaseOrderForm;
