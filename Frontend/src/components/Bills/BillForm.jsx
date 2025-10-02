import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Modal,
  Row,
  Col,
  Form,
  Button,
  Card,
  Table,
  Badge,
  Alert,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileInvoice,
  faPlus,
  faTrash,
  faEdit,
  faCalculator,
  faUser,
  faCalendarAlt,
  faFileAlt,
  faBoxOpen,
  faRupeeSign,
  faPercent,
  faSave,
  faDownload,
  faEye,
  faTimes,
  faCheck,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

import billService from "../../services/billService";
import itemService from "../../services/itemService";
import partyService from "../../services/partyService";

function BillForm({
  show,
  onHide,
  companyId,
  currentUser,
  currentCompany,
  addToast,
  onBillCreated,
}) {
  // Debug logging
  console.log("BillForm render - props:", {
    show,
    companyId,
    currentUser,
    currentCompany
  });

  // Enhanced purple theme
  const purpleTheme = {
    primary: "#6366f1",
    primaryLight: "#8b5cf6",
    primaryDark: "#4f46e5",
    primaryRgb: "99, 102, 241",
    secondary: "#8b5cf6",
    accent: "#a855f7",
    background: "#f8fafc",
    surface: "#ffffff",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    text: "#1e293b",
    textMuted: "#64748b",
    border: "#e2e8f0",
    borderDark: "#cbd5e1",
    shadow: "0 4px 20px rgba(99, 102, 241, 0.08)",
    shadowMd: "0 8px 30px rgba(99, 102, 241, 0.12)",
    shadowLg: "0 12px 40px rgba(99, 102, 241, 0.15)",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  };

  // Form state
  const [billData, setBillData] = useState({
    invoiceType: "gst",
    invoiceDate: new Date().toISOString().split("T")[0],
    employeeName: currentUser?.name || "",
    invoiceNumber: "",
    customer: null,
    manualCustomerName: "",
    items: [],
    notes: "",
    gstEnabled: true,
    taxMode: "without-tax",
  });

  // UI state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Item form state
  const [itemForm, setItemForm] = useState({
    selectedProduct: null,
    itemName: "",
    itemCode: "",
    category: "",
    quantity: 1,
    pricePerUnit: "",
    unit: "PCS",
    taxMode: "without-tax",
    taxRate: 18,
    hsnCode: "",
    discountPercent: 0,
    discountAmount: 0,
    description: "",
    amount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
  });

  // Enhanced input styles
  const getInputStyle = (fieldName, hasError = false) => ({
    borderColor: hasError ? purpleTheme.error : purpleTheme.border,
    fontSize: "14px",
    padding: "12px 16px",
    height: "48px",
    borderWidth: "2px",
    borderRadius: "10px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: purpleTheme.surface,
    color: purpleTheme.text,
    fontWeight: "500",
    boxShadow: hasError
      ? `0 0 0 3px rgba(239, 68, 68, 0.1), ${purpleTheme.shadow}`
      : purpleTheme.shadow,
  });

  const unitOptions = [
    "PCS", "KG", "GM", "LTR", "MTR", "SQM", "BOX", "SET", "PAIR", "DOZEN"
  ];

  const categoryOptions = [
    "Laptops & Notebooks",
    "Desktop Computers",
    "Computer Components",
    "Storage Devices",
    "Memory (RAM)",
    "Graphics Cards",
    "Processors (CPU)",
    "Motherboards",
    "Power Supplies",
    "Computer Cases",
    "Cooling Systems",
    "Monitors & Displays",
    "Keyboards & Mice",
    "Speakers & Headphones",
    "Webcams & Cameras",
    "Printers & Scanners",  
    "Networking Equipment",
    "Software & Licenses",
    "Computer Accessories",
    "Mobile Devices",
    "Tablets & E-readers",
    "Gaming Accessories",
    "Office Equipment",
    "Cables & Adapters",
    "Other",
  ];

  // Load customers
  const loadCustomers = useCallback(async () => {
    if (!companyId) return;
    
    setLoadingCustomers(true);
    try {
      const result = await partyService.getParties(companyId, { type: "customer" });
      if (result.success) {
        const customersData = result.data || [];
        console.log("Customers loaded:", customersData, "Type:", typeof customersData, "IsArray:", Array.isArray(customersData));
        setCustomers(Array.isArray(customersData) ? customersData : []);
      } else {
        console.error("Failed to load customers:", result);
        setCustomers([]);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
      addToast("Failed to load customers", "error");
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, [companyId, addToast]);

  // Load products
  const loadProducts = useCallback(async () => {
    if (!companyId) return;
    
    setLoadingProducts(true);
    try {
      const result = await itemService.getItems(companyId);
      if (result.success) {
        const productsData = result.data || [];
        console.log("Products loaded:", productsData, "Type:", typeof productsData, "IsArray:", Array.isArray(productsData));
        setProducts(Array.isArray(productsData) ? productsData : []);
      } else {
        console.error("Failed to load products:", result);
        setProducts([]);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      addToast("Failed to load products", "error");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [companyId, addToast]);

  // Load data on mount
  useEffect(() => {
    if (show && companyId) {
      loadCustomers();
      loadProducts();
    }
  }, [show, companyId, loadCustomers, loadProducts]);

  // Calculate item totals
  const calculateItemTotals = useCallback((item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
    const discountPercent = parseFloat(item.discountPercent) || 0;
    const discountAmount = parseFloat(item.discountAmount) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;

    // Calculate subtotal
    const subtotal = quantity * pricePerUnit;
    
    // Apply discount
    let finalDiscountAmount = discountAmount;
    if (discountPercent > 0) {
      finalDiscountAmount = (subtotal * discountPercent) / 100;
    }
    
    const discountedAmount = subtotal - finalDiscountAmount;
    
    // Calculate tax
    let taxableAmount = discountedAmount;
    let totalTax = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    
    if (billData.gstEnabled && taxRate > 0) {
      if (item.taxMode === "with-tax") {
        // Price includes tax
        taxableAmount = discountedAmount / (1 + taxRate / 100);
        totalTax = discountedAmount - taxableAmount;
      } else {
        // Price excludes tax
        totalTax = (taxableAmount * taxRate) / 100;
      }
      
      cgstAmount = totalTax / 2;
      sgstAmount = totalTax / 2;
    }
    
    const finalAmount = item.taxMode === "with-tax" ? discountedAmount : taxableAmount + totalTax;
    
    return {
      ...item,
      subtotal,
      discountAmount: finalDiscountAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      totalTax,
      amount: finalAmount,
    };
  }, [billData.gstEnabled]);

  // Calculate bill totals
  const billTotals = useMemo(() => {
    const items = billData.items || [];
    
    let subtotal = 0;
    let totalDiscount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTax = 0;
    let finalTotal = 0;
    
    items.forEach(item => {
      const calculatedItem = calculateItemTotals(item);
      subtotal += calculatedItem.subtotal;
      totalDiscount += calculatedItem.discountAmount;
      totalCGST += calculatedItem.cgstAmount;
      totalSGST += calculatedItem.sgstAmount;
      totalTax += calculatedItem.totalTax;
      finalTotal += calculatedItem.amount;
    });
    
    return {
      subtotal,
      totalDiscount,
      totalCGST,
      totalSGST,
      totalTax,
      finalTotal,
      itemCount: items.length,
    };
  }, [billData.items, calculateItemTotals]);

  // Handle form data changes
  const handleBillDataChange = (field, value) => {
    setBillData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle item form changes
  const handleItemFormChange = (field, value) => {
    setItemForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Recalculate totals when relevant fields change
      if (['quantity', 'pricePerUnit', 'discountPercent', 'discountAmount', 'taxRate', 'taxMode'].includes(field)) {
        const calculated = calculateItemTotals(updated);
        return calculated;
      }
      
      return updated;
    });
  };

  // Handle product selection
  const handleProductSelect = (product) => {
    setItemForm(prev => ({
      ...prev,
      selectedProduct: product,
      itemName: product.name,
      itemCode: product.itemCode || product.code || "",
      pricePerUnit: product.salePrice || product.sellPrice || 0,
      hsnCode: product.hsnCode || "",
      taxRate: product.gstRate || product.taxRate || 18,
    }));
  };

  // Add/Update item
  const handleSaveItem = () => {
    if (!itemForm.itemName || !itemForm.quantity || (!itemForm.pricePerUnit && itemForm.pricePerUnit !== 0)) {
      addToast("Please fill all required fields", "error");
      return;
    }

    const calculatedItem = calculateItemTotals(itemForm);
    
    setBillData(prev => {
      const items = [...prev.items];
      
      if (editingItemIndex !== null) {
        items[editingItemIndex] = { ...calculatedItem, id: items[editingItemIndex].id };
      } else {
        items.push({ ...calculatedItem, id: Date.now() });
      }
      
      return { ...prev, items };
    });

    // Reset form
    setItemForm({
      selectedProduct: null,
      itemName: "",
      itemCode: "",
      category: "",
      quantity: 1,
      pricePerUnit: "",
      unit: "PCS",
      taxMode: "without-tax",
      taxRate: 18,
      hsnCode: "",
      discountPercent: 0,
      discountAmount: 0,
      description: "",
      amount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
    });
    setShowItemModal(false);
    setEditingItemIndex(null);
  };

  // Edit item
  const handleEditItem = (index) => {
    const item = billData.items[index];
    setItemForm(item);
    setEditingItemIndex(index);
    setShowItemModal(true);
  };

  // Delete item
  const handleDeleteItem = (index) => {
    setBillData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Save bill
  const handleSaveBill = async () => {
    if (!billData.customer && !billData.manualCustomerName?.trim()) {
      addToast("Please select a customer or enter customer name", "error");
      return;
    }
    
    if (!Array.isArray(billData.items) || billData.items.length === 0) {
      addToast("Please add at least one item", "error");
      return;
    }

    setSaving(true);
    try {
      const billPayload = {
        ...billData,
        companyId,
        totals: billTotals,
        createdBy: currentUser?.id || currentUser?.name,
        status: "active",
        // Handle manual customer entry
        customerInfo: billData.customer || {
          name: billData.manualCustomerName,
          type: "manual",
        },
      };

      const result = await billService.createBill(billPayload);
      
      if (result.success) {
        addToast("Bill created successfully!", "success");
        
        // Generate and show PDF
        await handleGeneratePDF(result.data);
        
        // Notify parent component
        if (onBillCreated) {
          onBillCreated(result.data);
        }
      } else {
        throw new Error(result.message || "Failed to create bill");
      }
    } catch (error) {
      console.error("Error creating bill:", error);
      addToast(`Error creating bill: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Generate PDF
  const handleGeneratePDF = async (billData) => {
    try {
      const result = await billService.generateBillPDF(billData._id || billData.id);
      
      if (result.success && result.pdfUrl) {
        // Open PDF in new window
        window.open(result.pdfUrl, '_blank');
      } else {
        throw new Error("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      addToast("Bill created but PDF generation failed", "warning");
    }
  };

  // Reset form
  const handleReset = () => {
    setBillData({
      invoiceType: "gst",
      invoiceDate: new Date().toISOString().split("T")[0],
      employeeName: currentUser?.name || "",
      invoiceNumber: "",
      customer: null,
      items: [],
      notes: "",
      gstEnabled: true,
      taxMode: "without-tax",
    });
    setItemForm({
      selectedProduct: null,
      itemName: "",
      itemCode: "",
      category: "",
      quantity: 1,
      pricePerUnit: 0,
      unit: "PCS",
      taxMode: "without-tax",
      taxRate: 18,
      hsnCode: "",
      discountPercent: 0,
      discountAmount: 0,
      description: "",
      amount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
    });
  };

  if (!show) return null;

  return (
    <>
      {/* Main Bill Modal */}
      <Modal
        show={show}
        onHide={onHide}
        size="xl"
        centered
        backdrop="static"
        className="bill-form-modal"
      >
        <Modal.Header
          closeButton
          style={{
            background: purpleTheme.gradient,
            color: "white",
            borderBottom: "none",
            borderRadius: "16px 16px 0 0",
          }}
        >
          <Modal.Title className="fw-bold d-flex align-items-center">
            <FontAwesomeIcon icon={faFileInvoice} className="me-3" />
            Create New Bill
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ padding: "24px", backgroundColor: purpleTheme.background }}>
          {/* Bill Header Form */}
          <Card className="mb-4" style={{ border: `2px solid ${purpleTheme.border}`, borderRadius: "12px" }}>
            <Card.Header style={{ backgroundColor: purpleTheme.surface, padding: "20px" }}>
              <h5 className="mb-0 fw-bold" style={{ color: purpleTheme.text }}>
                <FontAwesomeIcon icon={faFileAlt} className="me-2" style={{ color: purpleTheme.primary }} />
                Bill Information
              </h5>
            </Card.Header>
            <Card.Body style={{ padding: "24px" }}>
              <Row className="g-3">
                {/* Invoice Type */}
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                      Invoice Type *
                    </Form.Label>
                    <Form.Select
                      value={billData.invoiceType}
                      onChange={(e) => {
                        handleBillDataChange("invoiceType", e.target.value);
                        handleBillDataChange("gstEnabled", e.target.value === "gst");
                      }}
                      style={getInputStyle("invoiceType")}
                    >
                      <option value="gst">GST Invoice</option>
                      <option value="non-gst">Non-GST Invoice</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* Invoice Date */}
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" style={{ color: purpleTheme.primary }} />
                      Invoice Date *
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={billData.invoiceDate}
                      onChange={(e) => handleBillDataChange("invoiceDate", e.target.value)}
                      style={getInputStyle("invoiceDate")}
                    />
                  </Form.Group>
                </Col>

                {/* Employee Name */}
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                      <FontAwesomeIcon icon={faUser} className="me-2" style={{ color: purpleTheme.primary }} />
                      Employee Name *
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={billData.employeeName}
                      onChange={(e) => handleBillDataChange("employeeName", e.target.value)}
                      style={getInputStyle("employeeName")}
                      placeholder="Enter employee name"
                    />
                  </Form.Group>
                </Col>

                {/* Invoice Number */}
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                      Invoice Number
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={billData.invoiceNumber}
                      onChange={(e) => handleBillDataChange("invoiceNumber", e.target.value)}
                      style={getInputStyle("invoiceNumber")}
                      placeholder="Auto-generated if empty"
                    />
                    <small className="text-muted">Leave empty for auto-generation</small>
                  </Form.Group>
                </Col>

                {/* Customer Selection */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                      Customer *
                    </Form.Label>
                    <div className="mb-2">
                      <Form.Select
                        value={billData.customer?._id || ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            const selectedCustomer = customers.find(c => c._id === e.target.value);
                            handleBillDataChange("customer", selectedCustomer);
                            handleBillDataChange("manualCustomerName", "");
                          }
                        }}
                        style={getInputStyle("customer")}
                        disabled={loadingCustomers}
                      >
                        <option value="">Select existing customer</option>
                        {Array.isArray(customers) ? customers.map(customer => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name} {customer.mobile ? `(${customer.mobile})` : ""}
                          </option>
                        )) : null}
                      </Form.Select>
                      {loadingCustomers && (
                        <small className="text-muted">
                          <FontAwesomeIcon icon={faSpinner} spin className="me-1" />
                          Loading customers...
                        </small>
                      )}
                    </div>
                    <div className="text-center my-2">
                      <small style={{ color: purpleTheme.textMuted }}>OR</small>
                    </div>
                    <Form.Control
                      type="text"
                      placeholder="Enter customer name manually"
                      value={billData.manualCustomerName || ""}
                      onChange={(e) => {
                        handleBillDataChange("manualCustomerName", e.target.value);
                        if (e.target.value) {
                          handleBillDataChange("customer", null);
                        }
                      }}
                      style={getInputStyle("manualCustomerName")}
                    />
                    <small className="text-muted">You can select existing customer or enter new customer name</small>
                  </Form.Group>
                </Col>

                {/* Notes */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                      Notes
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={billData.notes}
                      onChange={(e) => handleBillDataChange("notes", e.target.value)}
                      style={{ ...getInputStyle("notes"), minHeight: "60px" }}
                      placeholder="Additional notes or terms..."
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Items Section */}
          <Card className="mb-4" style={{ border: `2px solid ${purpleTheme.border}`, borderRadius: "12px" }}>
            <Card.Header 
              className="d-flex justify-content-between align-items-center"
              style={{ backgroundColor: purpleTheme.surface, padding: "20px" }}
            >
              <h5 className="mb-0 fw-bold" style={{ color: purpleTheme.text }}>
                <FontAwesomeIcon icon={faBoxOpen} className="me-2" style={{ color: purpleTheme.primary }} />
                Items ({Array.isArray(billData.items) ? billData.items.length : 0})
              </h5>
              <Button
                onClick={() => setShowItemModal(true)}
                style={{
                  background: purpleTheme.gradient,
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                Add Item
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              {Array.isArray(billData.items) && billData.items.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead style={{ backgroundColor: purpleTheme.background }}>
                      <tr>
                        <th style={{ padding: "12px", fontSize: "12px", fontWeight: "600" }}>#</th>
                        <th style={{ padding: "12px", fontSize: "12px", fontWeight: "600" }}>ITEM</th>
                        <th style={{ padding: "12px", fontSize: "12px", fontWeight: "600" }}>QTY</th>
                        <th style={{ padding: "12px", fontSize: "12px", fontWeight: "600" }}>UNIT</th>
                        <th style={{ padding: "12px", fontSize: "12px", fontWeight: "600" }}>PRICE</th>
                        <th style={{ padding: "12px", fontSize: "12px", fontWeight: "600" }}>DISCOUNT</th>
                        {billData.gstEnabled && (
                          <th style={{ padding: "12px", fontSize: "12px", fontWeight: "600" }}>TAX</th>
                        )}
                        <th style={{ padding: "12px", fontSize: "12px", fontWeight: "600" }}>AMOUNT</th>
                        <th style={{ padding: "12px", fontSize: "12px", fontWeight: "600" }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(billData.items) ? billData.items.map((item, index) => {
                        const calculatedItem = calculateItemTotals(item);
                        return (
                          <tr key={item.id}>
                            <td style={{ padding: "12px", fontSize: "13px" }}>{index + 1}</td>
                            <td style={{ padding: "12px" }}>
                              <div>
                                <div className="fw-semibold" style={{ fontSize: "13px" }}>
                                  {calculatedItem.itemName}
                                </div>
                                {calculatedItem.itemCode && (
                                  <small className="text-muted">{calculatedItem.itemCode}</small>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: "12px", fontSize: "13px" }}>{calculatedItem.quantity}</td>
                            <td style={{ padding: "12px", fontSize: "13px" }}>{calculatedItem.unit}</td>
                            <td style={{ padding: "12px", fontSize: "13px" }}>₹{calculatedItem.pricePerUnit.toFixed(2)}</td>
                            <td style={{ padding: "12px", fontSize: "13px" }}>
                              {calculatedItem.discountPercent > 0 ? `${calculatedItem.discountPercent}%` : 
                               calculatedItem.discountAmount > 0 ? `₹${calculatedItem.discountAmount.toFixed(2)}` : "-"}
                            </td>
                            {billData.gstEnabled && (
                              <td style={{ padding: "12px", fontSize: "11px" }}>
                                {calculatedItem.totalTax > 0 ? (
                                  <div>
                                    <div>C: ₹{calculatedItem.cgstAmount.toFixed(2)}</div>
                                    <div>S: ₹{calculatedItem.sgstAmount.toFixed(2)}</div>
                                  </div>
                                ) : "-"}
                              </td>
                            )}
                            <td style={{ padding: "12px" }}>
                              <span className="fw-bold" style={{ color: purpleTheme.success, fontSize: "14px" }}>
                                ₹{calculatedItem.amount.toFixed(2)}
                              </span>
                            </td>
                            <td style={{ padding: "12px" }}>
                              <div className="d-flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => handleEditItem(index)}
                                  style={{ padding: "4px 8px", borderRadius: "4px" }}
                                >
                                  <FontAwesomeIcon icon={faEdit} size="xs" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => handleDeleteItem(index)}
                                  style={{ padding: "4px 8px", borderRadius: "4px" }}
                                >
                                  <FontAwesomeIcon icon={faTrash} size="xs" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : null}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4" style={{ color: purpleTheme.textMuted }}>
                  <FontAwesomeIcon icon={faBoxOpen} size="2x" className="mb-3" style={{ opacity: 0.5 }} />
                  <p>No items added yet. Click "Add Item" to get started.</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Bill Totals */}
          {Array.isArray(billData.items) && billData.items.length > 0 && (
            <Card className="mb-4" style={{ border: `2px solid ${purpleTheme.success}`, borderRadius: "12px" }}>
              <Card.Header style={{ backgroundColor: purpleTheme.success, color: "white", padding: "16px" }}>
                <h5 className="mb-0 fw-bold">
                  <FontAwesomeIcon icon={faCalculator} className="me-2" />
                  Bill Summary
                </h5>
              </Card.Header>
              <Card.Body style={{ padding: "20px" }}>
                <Row>
                  <Col md={8}>
                    {billData.gstEnabled && (
                      <div className="row g-3">
                        <div className="col-6">
                          <div className="d-flex justify-content-between">
                            <span>Subtotal:</span>
                            <span className="fw-semibold">₹{billTotals.subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex justify-content-between">
                            <span>Discount:</span>
                            <span className="fw-semibold text-warning">-₹{billTotals.totalDiscount.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex justify-content-between">
                            <span>CGST:</span>
                            <span className="fw-semibold">₹{billTotals.totalCGST.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex justify-content-between">
                            <span>SGST:</span>
                            <span className="fw-semibold">₹{billTotals.totalSGST.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </Col>
                  <Col md={4}>
                    <div className="text-end">
                      <h4 className="fw-bold" style={{ color: purpleTheme.success }}>
                        Total: ₹{billTotals.finalTotal.toFixed(2)}
                      </h4>
                      <small className="text-muted">{billTotals.itemCount} item(s)</small>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Modal.Body>

        <Modal.Footer style={{ padding: "20px 24px", backgroundColor: purpleTheme.background }}>
          <div className="d-flex justify-content-between w-100">
            <div>
              <Button
                variant="outline-secondary"
                onClick={handleReset}
                disabled={saving}
                style={{ borderRadius: "8px" }}
              >
                <FontAwesomeIcon icon={faTimes} className="me-2" />
                Reset
              </Button>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                onClick={onHide}
                disabled={saving}
                style={{ borderRadius: "8px" }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBill}
                disabled={saving || !billData.customer || !Array.isArray(billData.items) || billData.items.length === 0}
                style={{
                  background: saving ? purpleTheme.textMuted : purpleTheme.gradient,
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 24px",
                }}
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                    Creating Bill...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                    Create Bill & Generate PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Item Modal */}
      <Modal
        show={showItemModal}
        onHide={() => {
          setShowItemModal(false);
          setEditingItemIndex(null);
          setItemForm({
            selectedProduct: null,
            itemName: "",
            itemCode: "",
            category: "",
            quantity: 1,
            pricePerUnit: "",
            unit: "PCS",
            taxMode: "without-tax",
            taxRate: 18,
            hsnCode: "",
            discountPercent: 0,
            discountAmount: 0,
            description: "",
            amount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
          });
        }}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton style={{ backgroundColor: purpleTheme.background }}>
          <Modal.Title>
            <FontAwesomeIcon icon={editingItemIndex !== null ? faEdit : faPlus} className="me-2" />
            {editingItemIndex !== null ? "Edit Item" : "Add Item"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: purpleTheme.surface, padding: "24px" }}>
          <Row className="g-3">
            {/* Product Selection */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                  Select Product
                </Form.Label>
                <Form.Select
                  value={itemForm.selectedProduct?._id || ""}
                  onChange={(e) => {
                    const product = products.find(p => p._id === e.target.value);
                    if (product) {
                      handleProductSelect(product);
                    } else {
                      handleItemFormChange("selectedProduct", null);
                    }
                  }}
                  style={getInputStyle("selectedProduct")}
                  disabled={loadingProducts}
                >
                  <option value="">Select or enter manually</option>
                  {(() => {
                    console.log("About to map products:", products, "Type:", typeof products, "IsArray:", Array.isArray(products));
                    return Array.isArray(products) ? products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name} - ₹{product.salePrice || product.sellPrice || 0}
                    </option>
                  )) : null;
                  })()}
                </Form.Select>
                {loadingProducts && (
                  <small className="text-muted">
                    <FontAwesomeIcon icon={faSpinner} spin className="me-1" />
                    Loading products...
                  </small>
                )}
              </Form.Group>
            </Col>

            {/* Item Name */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.error, fontSize: "13px" }}>
                  Item Name *
                </Form.Label>
                <Form.Control
                  type="text"
                  value={itemForm.itemName}
                  onChange={(e) => handleItemFormChange("itemName", e.target.value)}
                  style={getInputStyle("itemName", !itemForm.itemName)}
                  placeholder="Enter item name"
                />
              </Form.Group>
            </Col>

            {/* Category */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                  Category
                </Form.Label>
                <Form.Select
                  value={itemForm.category}
                  onChange={(e) => handleItemFormChange("category", e.target.value)}
                  style={getInputStyle("category")}
                >
                  <option value="">Select category</option>
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Item Code */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                  Item Code
                </Form.Label>
                <Form.Control
                  type="text"
                  value={itemForm.itemCode}
                  onChange={(e) => handleItemFormChange("itemCode", e.target.value)}
                  style={getInputStyle("itemCode")}
                  placeholder="Enter item code"
                />
              </Form.Group>
            </Col>

            {/* Quantity and Price */}
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.error, fontSize: "13px" }}>
                  Quantity *
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={itemForm.quantity}
                  onChange={(e) => handleItemFormChange("quantity", parseFloat(e.target.value) || 0)}
                  style={getInputStyle("quantity", !itemForm.quantity)}
                />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                  Unit
                </Form.Label>
                <Form.Select
                  value={itemForm.unit}
                  onChange={(e) => handleItemFormChange("unit", e.target.value)}
                  style={getInputStyle("unit")}
                >
                  {Array.isArray(unitOptions) ? unitOptions.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  )) : null}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.error, fontSize: "13px" }}>
                  Price Per Unit *
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text style={getInputStyle("pricePerUnit")}>₹</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.pricePerUnit === "" ? "" : itemForm.pricePerUnit}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        handleItemFormChange("pricePerUnit", "");
                      } else {
                        handleItemFormChange("pricePerUnit", parseFloat(value) || 0);
                      }
                    }}
                    placeholder="0.00"
                    style={getInputStyle("pricePerUnit", !itemForm.pricePerUnit)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>

            {/* Tax and GST fields */}
            {billData.gstEnabled && (
              <>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                      Tax Mode
                    </Form.Label>
                    <Form.Select
                      value={itemForm.taxMode}
                      onChange={(e) => handleItemFormChange("taxMode", e.target.value)}
                      style={getInputStyle("taxMode")}
                    >
                      <option value="without-tax">Price Excludes Tax</option>
                      <option value="with-tax">Price Includes Tax</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                      Tax Rate (%)
                    </Form.Label>
                    <Form.Select
                      value={itemForm.taxRate}
                      onChange={(e) => handleItemFormChange("taxRate", parseFloat(e.target.value) || 0)}
                      style={getInputStyle("taxRate")}
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                      HSN Code
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={itemForm.hsnCode}
                      onChange={(e) => handleItemFormChange("hsnCode", e.target.value)}
                      style={getInputStyle("hsnCode")}
                      placeholder="Enter HSN code"
                    />
                  </Form.Group>
                </Col>
              </>
            )}

            {/* Discount */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                  Discount %
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={itemForm.discountPercent}
                  onChange={(e) => {
                    handleItemFormChange("discountPercent", parseFloat(e.target.value) || 0);
                    handleItemFormChange("discountAmount", 0); // Reset discount amount
                  }}
                  style={getInputStyle("discountPercent")}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                  OR Discount Amount
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text style={getInputStyle("discountAmount")}>₹</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.discountAmount}
                    onChange={(e) => {
                      handleItemFormChange("discountAmount", parseFloat(e.target.value) || 0);
                      handleItemFormChange("discountPercent", 0); // Reset discount percent
                    }}
                    style={getInputStyle("discountAmount")}
                  />
                </InputGroup>
              </Form.Group>
            </Col>

            {/* Description */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-bold" style={{ color: purpleTheme.text, fontSize: "13px" }}>
                  Description
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => handleItemFormChange("description", e.target.value)}
                  style={{ ...getInputStyle("description"), minHeight: "60px" }}
                  placeholder="Additional description or notes..."
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Item Total Display */}
          <div className="mt-4 p-3 rounded" style={{ backgroundColor: purpleTheme.background, border: `2px solid ${purpleTheme.success}` }}>
            <div className="text-center">
              <h5 className="fw-bold" style={{ color: purpleTheme.success }}>
                Item Total: ₹{itemForm.amount?.toFixed(2) || "0.00"}
              </h5>
              {itemForm.quantity > 0 && itemForm.pricePerUnit > 0 && (
                <div className="row mt-2 text-sm">
                  <div className="col-6">
                    <div>Qty: {itemForm.quantity}</div>
                    <div>Rate: ₹{itemForm.pricePerUnit}</div>
                  </div>
                  <div className="col-6">
                    <div>Subtotal: ₹{(itemForm.quantity * itemForm.pricePerUnit).toFixed(2)}</div>
                    {billData.gstEnabled && itemForm.totalTax > 0 && (
                      <div>Tax: ₹{itemForm.totalTax.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: purpleTheme.background }}>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowItemModal(false);
              setEditingItemIndex(null);
            }}
            style={{ borderRadius: "8px" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveItem}
            disabled={!itemForm.itemName || !itemForm.quantity || (!itemForm.pricePerUnit && itemForm.pricePerUnit !== 0)}
            style={{
              background: purpleTheme.gradient,
              border: "none",
              borderRadius: "8px",
            }}
          >
            <FontAwesomeIcon icon={faCheck} className="me-2" />
            {editingItemIndex !== null ? "Update Item" : "Add Item"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom Styles */}
      <style>{`
        .bill-form-modal .modal-dialog {
          max-width: 95vw;
        }
        
        .bill-form-modal .modal-content {
          border-radius: 16px;
          border: none;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        .table-responsive {
          border-radius: 8px;
        }
        
        .form-control:focus,
        .form-select:focus {
          border-color: ${purpleTheme.primary};
          box-shadow: 0 0 0 0.25rem rgba(99, 102, 241, 0.25);
        }
        
        @media (max-width: 768px) {
          .bill-form-modal .modal-dialog {
            margin: 0.5rem;
          }
          
          .table-responsive {
            font-size: 12px;
          }
          
          .card-body {
            padding: 16px !important;
          }
        }
      `}</style>
    </>
  );
}

export default BillForm;