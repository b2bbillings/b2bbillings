import React, {useState, useEffect, useRef, useCallback, useMemo} from "react";
import {
  Row,
  Col,
  Form,
  Button,
  Card,
  Table,
  Badge,
  Alert,
  Modal,
  InputGroup,
  Container,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faEdit,
  faShoppingCart,
  faBoxOpen,
  faRupeeSign,
  faCalculator,
  faPercent,
  faCheck,
  faTimes,
  faSave,
  faBox,
  faReceipt,
  faFileInvoice,
  faMoneyBillWave,
  faWallet,
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faUser,
  faCreditCard,
  faUniversity,
  faCalendarAlt,
  faDownload,
  faShare,
  faTimes as faCancel,
  faFileContract,
  faClipboardList,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";
import itemService from "../../../../services/itemService";
import ProductModal from "../../Inventory/ProductModal";

function PurchaseOrderFormProductSelection({
  formData,
  onFormDataChange,
  companyId,
  currentUser,
  addToast,
  errors = {},
  disabled = false,
}) {
  // Purple theme matching other components
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
  };

  // Enhanced input styles with purple theme
  const getInputStyle = (fieldName) => ({
    borderColor: errors[fieldName] ? purpleTheme.error : purpleTheme.border,
    fontSize: "14px",
    padding: "12px 16px",
    height: "48px",
    borderWidth: "2px",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    backgroundColor: purpleTheme.surface,
    boxShadow: errors[fieldName]
      ? `0 0 0 3px rgba(239, 68, 68, 0.1)`
      : `0 0 0 0px rgba(${purpleTheme.primaryRgb}, 0.1)`,
  });

  // Purchase Order specific configuration
  const purchaseConfig = {
    formIcon: faTruck,
    title: "Purchase Order Builder",
    subtitle: "Create professional purchase orders",
    actionButtonColor: "primary",
    paymentIcon: faWallet,
    paymentAction: "Add Payment",
    saveButtonVariant: "success",
    saveButtonText: "Save Purchase Order",
    totalLabel: "Order Total",
    totalBorderColor: "border-primary",
    totalTextColor: "text-primary",
    cardBorderColor: purpleTheme.primary,
    primaryColor: purpleTheme.primary,
    primaryRgb: purpleTheme.primaryRgb,
  };

  // State variables
  const [products, setProducts] = useState([]);
  const [productSearchTerms, setProductSearchTerms] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchNotFound, setProductSearchNotFound] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Main product form modal state
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const [tempFormData, setTempFormData] = useState({
    selectedProduct: "",
    productName: "",
    productCode: "",
    description: "",
    quantity: "",
    price: "",
    purchasePrice: "",
    sellingPrice: "",
    unit: "PCS",
    gstMode: "exclude",
    gstRate: 18,
    subtotal: 0,
    gstAmount: 0,
    totalAmount: 0,
    availableStock: 0,
    hsnNumber: "",
    discountPercent: 0,
    discountAmount: 0,
  });

  // ✅ NEW: Add Item Modal states - This will open ProductModal from Inventory
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemFormData, setNewItemFormData] = useState({
    name: "",
    itemCode: "",
    hsnNumber: "",
    type: "product",
    category: "",
    unit: "PCS",
    description: "",
    buyPrice: "",
    salePrice: "",
    atPrice: "",
    gstRate: 18,
    openingQuantity: "",
    currentStock: "",
    openingStock: "",
    minStockLevel: "",
    minStockToMaintain: "",
    asOfDate: new Date().toISOString().split("T")[0],
    isActive: true,
  });
  const [categories, setCategories] = useState([
    {id: 1, name: "Electronics", isActive: true},
    {id: 2, name: "Furniture", isActive: true},
    {id: 3, name: "Stationery", isActive: true},
    {id: 4, name: "Clothing", isActive: true},
    {id: 5, name: "Food & Beverages", isActive: true},
    {id: 6, name: "Medical", isActive: true},
    {id: 7, name: "Automotive", isActive: true},
    {id: 8, name: "Books", isActive: true},
    {id: 9, name: "Other", isActive: true},
  ]);

  // Enhanced refs for better keyboard navigation
  const isSelectingProductRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // Calculate direct total
  const calculateDirectTotal = useCallback(() => {
    const items = formData.items || [];
    if (items.length === 0) return 0;

    const validItems = items.filter(
      (item) =>
        item.productName &&
        parseFloat(item.quantity || 0) > 0 &&
        parseFloat(item.price || 0) > 0
    );

    return validItems.reduce(
      (total, item) => total + (parseFloat(item.totalAmount) || 0),
      0
    );
  }, [formData.items]);

  const displayTotal = calculateDirectTotal();

  const hasValidItems = useMemo(() => {
    const items = formData.items || [];
    return (
      items.length > 0 &&
      items.some(
        (item) => item.productName && item.quantity > 0 && item.price > 0
      )
    );
  }, [formData.items]);

  const validItemsCount = useMemo(() => {
    const items = formData.items || [];
    return items.filter((item) => item.productName).length;
  }, [formData.items]);

  // Load products from backend
  const handleProductSearchChange = async (query) => {
    setProductSearchTerms(query);

    if (!query.trim() || query.length < 2) {
      setProducts([]);
      setShowProductSuggestions(false);
      setProductSearchNotFound(false);
      return;
    }

    try {
      setProductSearchLoading(true);
      setProductSearchNotFound(false);

      const response = await itemService.getItems(companyId, {
        search: query,
        limit: 20,
        isActive: true,
        type: "product",
      });

      let searchResults = [];

      if (response?.success && response.data) {
        if (response.data.items && Array.isArray(response.data.items)) {
          searchResults = response.data.items;
        } else if (Array.isArray(response.data)) {
          searchResults = response.data;
        }
      } else if (Array.isArray(response)) {
        searchResults = response;
      }

      const enhancedResults = searchResults.map((product) => ({
        ...product,
        stock:
          product.stock || product.currentStock || product.availableStock || 0,
        currentStock:
          product.currentStock || product.stock || product.availableStock || 0,
        availableStock:
          product.availableStock || product.stock || product.currentStock || 0,
      }));

      if (enhancedResults.length > 0) {
        setProducts(enhancedResults);
        setShowProductSuggestions(true);
        setProductSearchNotFound(false);
      } else {
        setProducts([]);
        setShowProductSuggestions(false);
        setProductSearchNotFound(true);
      }
    } catch (error) {
      setProducts([]);
      setShowProductSuggestions(false);
      setProductSearchNotFound(true);
      addToast?.("Failed to search products: " + error.message, "error");
    } finally {
      setProductSearchLoading(false);
    }
  };

  const debouncedProductSearch = useCallback(
    (query) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        handleProductSearchChange(query);
      }, 300);
    },
    [companyId]
  );

  // ✅ UPDATED: Handle "Create New Item" click - Opens ProductModal
  const handleCreateNewItem = () => {
    const newItemName = productSearchTerms.trim();

    if (!newItemName) {
      addToast?.("Please enter an item name", "warning");
      return;
    }

    // Set the form data with the searched name
    setNewItemFormData((prev) => ({
      ...prev,
      name: newItemName,
      type: "product",
      isActive: true,
      asOfDate: new Date().toISOString().split("T")[0],
    }));

    // Hide product suggestions and open the add item modal
    setProducts([]);
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);
    setShowAddItemModal(true);

    addToast?.(`Opening form to create new item: "${newItemName}"`, "info");
  };

  // ✅ NEW: Handle new item form input changes
  const handleNewItemInputChange = (e) => {
    const {name, value, type, checked} = e.target;
    setNewItemFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ✅ NEW: Handle saving new item from ProductModal
  const handleNewItemSave = async (itemData, saveAndAdd = false) => {
    try {
      // Create the item using itemService
      const response = await itemService.createItem(companyId, itemData);

      if (response.success) {
        const newItem = response.data?.item || response.data;

        // Create formatted product for selection
        const formattedProduct = {
          id: newItem._id || newItem.id,
          name: newItem.name || newItem.itemName || itemData.name,
          code: newItem.itemCode || newItem.code || itemData.itemCode || "",
          description: newItem.description || itemData.description || "",
          sellingPrice: parseFloat(
            newItem.salePrice || newItem.sellingPrice || itemData.salePrice || 0
          ),
          purchasePrice: parseFloat(
            newItem.buyPrice || newItem.purchasePrice || itemData.buyPrice || 0
          ),
          buyPrice: parseFloat(
            newItem.buyPrice || newItem.purchasePrice || itemData.buyPrice || 0
          ),
          salePrice: parseFloat(
            newItem.salePrice || newItem.sellingPrice || itemData.salePrice || 0
          ),
          gstRate: parseFloat(newItem.gstRate || itemData.gstRate || 18),
          unit: newItem.unit || itemData.unit || "PCS",
          stock:
            newItem.currentStock || newItem.stock || itemData.currentStock || 0,
          currentStock:
            newItem.currentStock || newItem.stock || itemData.currentStock || 0,
          availableStock:
            newItem.currentStock || newItem.stock || itemData.currentStock || 0,
          hsnNumber: newItem.hsnNumber || itemData.hsnNumber || "",
          hsnCode: newItem.hsnNumber || itemData.hsnNumber || "",
        };

        // Automatically select the newly created product
        handleProductSelect(formattedProduct);

        // Close the modal
        setShowAddItemModal(false);

        // Reset form data
        setNewItemFormData({
          name: "",
          itemCode: "",
          hsnNumber: "",
          type: "product",
          category: "",
          unit: "PCS",
          description: "",
          buyPrice: "",
          salePrice: "",
          atPrice: "",
          gstRate: 18,
          openingQuantity: "",
          currentStock: "",
          openingStock: "",
          minStockLevel: "",
          minStockToMaintain: "",
          asOfDate: new Date().toISOString().split("T")[0],
          isActive: true,
        });

        addToast?.(
          `Product "${formattedProduct.name}" created and selected successfully!`,
          "success"
        );

        return true; // Indicate success to ProductModal
      } else {
        throw new Error(response.message || "Failed to create item");
      }
    } catch (error) {
      console.error("Error creating new item:", error);
      addToast?.(`Error creating item: ${error.message}`, "error");
      return false; // Indicate failure to ProductModal
    }
  };

  const handleProductSelect = (product) => {
    isSelectingProductRef.current = true;

    setTempFormData((prev) => {
      const updated = {
        ...prev,
        selectedProduct: product.id || product._id,
        productName: product.name,
        productCode: product.code || product.itemCode || "",
        description: product.description || "",
        price: (
          product.buyPrice ||
          product.purchasePrice ||
          product.salePrice ||
          0
        ).toString(),
        purchasePrice: (
          product.buyPrice ||
          product.purchasePrice ||
          0
        ).toString(),
        sellingPrice: (
          product.salePrice ||
          product.sellingPrice ||
          0
        ).toString(),
        gstRate: product.gstRate || product.taxRate || 18,
        unit: product.unit || "PCS",
        availableStock:
          product.availableStock || product.stock || product.currentStock || 0,
        hsnNumber: product.hsnCode || product.hsnNumber || "",
      };
      return calculateItemTotal(updated);
    });

    setProductSearchTerms(product.name);
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);

    setTimeout(() => {
      isSelectingProductRef.current = false;
    }, 300);
  };

  // ✅ NEW: Handle unselecting a product
  const handleUnselectProduct = () => {
    isSelectingProductRef.current = true;

    setTempFormData({
      selectedProduct: "",
      productName: "",
      productCode: "",
      description: "",
      quantity: "",
      price: "",
      purchasePrice: "",
      sellingPrice: "",
      unit: "PCS",
      gstMode: "exclude",
      gstRate: 18,
      subtotal: 0,
      gstAmount: 0,
      totalAmount: 0,
      availableStock: 0,
      hsnNumber: "",
      discountPercent: 0,
      discountAmount: 0,
    });

    setProductSearchTerms("");
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);

    setTimeout(() => {
      isSelectingProductRef.current = false;
    }, 300);

    addToast?.("Product unselected successfully!", "info");
  };

  // Calculate total for temp form data
  const calculateItemTotal = (itemData) => {
    const quantity = parseFloat(itemData.quantity) || 0;
    const price = parseFloat(itemData.price) || 0;
    const gstRate = parseFloat(itemData.gstRate) || 0;
    const discountPercent = parseFloat(itemData.discountPercent) || 0;

    if (quantity <= 0 || price <= 0) {
      return {
        ...itemData,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        discountAmount: 0,
      };
    }

    let baseAmount = quantity * price;
    let discountAmount = 0;

    // Apply discount
    if (discountPercent > 0) {
      discountAmount = (baseAmount * discountPercent) / 100;
      baseAmount = baseAmount - discountAmount;
    }

    let gstAmount = 0;
    let totalAmount = 0;

    if (formData.gstType === "gst") {
      if (itemData.gstMode === "include") {
        totalAmount = baseAmount;
        gstAmount = (baseAmount * gstRate) / (100 + gstRate);
        baseAmount = totalAmount - gstAmount;
      } else {
        gstAmount = (baseAmount * gstRate) / 100;
        totalAmount = baseAmount + gstAmount;
      }
    } else {
      totalAmount = baseAmount;
      gstAmount = 0;
    }

    return {
      ...itemData,
      subtotal: Math.round(baseAmount * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
    };
  };

  // Handle form field changes in modal
  const handleTempFormChange = (field, value) => {
    setTempFormData((prev) => {
      const updated = {...prev, [field]: value};

      if (
        ["quantity", "price", "gstMode", "gstRate", "discountPercent"].includes(
          field
        )
      ) {
        return calculateItemTotal(updated);
      }

      return updated;
    });
  };

  // Validate temp form
  const validateTempForm = () => {
    if (!tempFormData.productName?.trim()) {
      addToast?.("Please enter a product name", "error");
      return false;
    }
    if (!tempFormData.quantity || parseFloat(tempFormData.quantity) <= 0) {
      addToast?.("Please enter a valid quantity", "error");
      return false;
    }
    if (!tempFormData.price || parseFloat(tempFormData.price) <= 0) {
      addToast?.("Please enter a valid price", "error");
      return false;
    }
    return true;
  };

  // Handle opening product form modal
  const handleAddProductClick = () => {
    setCurrentEditingIndex(null);
    setTempFormData({
      selectedProduct: "",
      productName: "",
      productCode: "",
      description: "",
      quantity: "",
      price: "",
      purchasePrice: "",
      sellingPrice: "",
      unit: "PCS",
      gstMode: "exclude",
      gstRate: 18,
      subtotal: 0,
      gstAmount: 0,
      totalAmount: 0,
      availableStock: 0,
      hsnNumber: "",
      discountPercent: 0,
      discountAmount: 0,
    });
    setProductSearchTerms("");
    setProducts([]);
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);
    setShowProductFormModal(true);
  };

  // Handle editing existing product
  const handleEditProduct = (index) => {
    const item = formData.items[index];
    setCurrentEditingIndex(index);
    setTempFormData({...item});
    setProductSearchTerms(item.productName || "");
    setShowProductFormModal(true);
  };

  // Handle save and add another
  const handleSaveAndAdd = () => {
    if (!validateTempForm()) return;

    const currentItems = formData.items || [];
    const newItem = {
      ...tempFormData,
      id: currentEditingIndex !== null ? tempFormData.id : Date.now(),
    };

    let updatedItems;
    if (currentEditingIndex !== null) {
      updatedItems = [...currentItems];
      updatedItems[currentEditingIndex] = newItem;
    } else {
      updatedItems = [...currentItems, newItem];
    }

    onFormDataChange("items", updatedItems);
    addToast?.("Product added successfully!", "success");

    // Reset form for next product
    setTempFormData({
      selectedProduct: "",
      productName: "",
      productCode: "",
      description: "",
      quantity: "",
      price: "",
      purchasePrice: "",
      sellingPrice: "",
      unit: "PCS",
      gstMode: "exclude",
      gstRate: 18,
      subtotal: 0,
      gstAmount: 0,
      totalAmount: 0,
      availableStock: 0,
      hsnNumber: "",
      discountPercent: 0,
      discountAmount: 0,
    });
    setProductSearchTerms("");
    setCurrentEditingIndex(null);
  };

  // Handle save and exit
  const handleSaveAndExit = () => {
    if (!validateTempForm()) return;

    const currentItems = formData.items || [];
    const newItem = {
      ...tempFormData,
      id: currentEditingIndex !== null ? tempFormData.id : Date.now(),
    };

    let updatedItems;
    if (currentEditingIndex !== null) {
      updatedItems = [...currentItems];
      updatedItems[currentEditingIndex] = newItem;
      addToast?.("Product updated successfully!", "success");
    } else {
      updatedItems = [...currentItems, newItem];
      addToast?.("Product added successfully!", "success");
    }

    onFormDataChange("items", updatedItems);
    setShowProductFormModal(false);
    setCurrentEditingIndex(null);
  };

  // Handle removing product from list
  const handleRemoveProduct = (index) => {
    const currentItems = formData.items || [];
    if (currentItems.length > 0) {
      const updatedItems = currentItems.filter((_, i) => i !== index);
      onFormDataChange("items", updatedItems);
      addToast?.("Product removed successfully!", "success");
    }
  };

  // Utility functions
  const resetProductSearchState = () => {
    setProducts([]);
    setProductSearchTerms("");
    setShowProductSuggestions(false);
    setProductSearchNotFound(false);
    setProductSearchLoading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const items = formData.items || [];

  return (
    <Container fluid className="px-0">
      {/* Header Section - Styled like SalesInvoiceFormSection */}
      <Card
        className="mb-4"
        style={{
          border: "none",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${purchaseConfig.primaryColor} 0%, ${purpleTheme.primaryLight} 100%)`,
            color: "white",
            padding: "20px 24px",
          }}
        >
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <FontAwesomeIcon
                icon={purchaseConfig.formIcon}
                size="lg"
                className="me-3"
              />
              <div>
                <h5 className="mb-0 fw-bold">{purchaseConfig.title}</h5>
                <small className="opacity-90">{purchaseConfig.subtitle}</small>
              </div>
            </div>

            {/* Action Button */}
            <Button
              variant="light"
              size="sm"
              onClick={handleAddProductClick}
              disabled={disabled}
              style={{
                fontWeight: "600",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                color: purchaseConfig.primaryColor,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                transition: "all 0.2s ease",
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div
          className="px-4 py-3 border-bottom"
          style={{
            backgroundColor: purpleTheme.background,
          }}
        >
          <Row className="g-3">
            <Col md={6}>
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: hasValidItems
                      ? purpleTheme.success
                      : purpleTheme.textMuted,
                    color: "white",
                  }}
                >
                  <FontAwesomeIcon icon={faBoxOpen} />
                </div>
                <div>
                  <div className="fw-bold text-dark">{validItemsCount}</div>
                  <small className="text-muted">
                    {validItemsCount === 1 ? "Product" : "Products"} Added
                  </small>
                </div>
              </div>
            </Col>
            <Col md={6}>
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor:
                      displayTotal > 0
                        ? purchaseConfig.primaryColor
                        : purpleTheme.textMuted,
                    color: "white",
                  }}
                >
                  <FontAwesomeIcon icon={faRupeeSign} />
                </div>
                <div>
                  <div className="fw-bold text-dark">
                    ₹{formatCurrency(displayTotal)}
                  </div>
                  <small className="text-muted">
                    {purchaseConfig.totalLabel}
                  </small>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </Card>

      {/* Items Table Section */}
      {hasValidItems && (
        <Card
          className="mb-4"
          style={{
            border: "none",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          }}
        >
          <Card.Header
            style={{
              backgroundColor: purpleTheme.background,
              borderBottom: `2px solid ${purpleTheme.border}`,
              padding: "16px 24px",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold text-dark">
                <FontAwesomeIcon
                  icon={purchaseConfig.formIcon}
                  className="me-2"
                />
                Added Products ({validItemsCount})
              </h6>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead style={{backgroundColor: purpleTheme.background}}>
                  <tr>
                    <th
                      style={{
                        fontSize: "13px",
                        padding: "12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        fontSize: "13px",
                        padding: "12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                      }}
                    >
                      PRODUCT
                    </th>
                    {formData.gstType === "gst" && (
                      <th
                        style={{
                          fontSize: "13px",
                          padding: "12px",
                          fontWeight: "600",
                          color: purpleTheme.text,
                        }}
                      >
                        HSN
                      </th>
                    )}
                    <th
                      style={{
                        fontSize: "13px",
                        padding: "12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                      }}
                    >
                      QTY
                    </th>
                    <th
                      style={{
                        fontSize: "13px",
                        padding: "12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                      }}
                    >
                      UNIT
                    </th>
                    <th
                      style={{
                        fontSize: "13px",
                        padding: "12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                      }}
                    >
                      PRICE
                    </th>
                    <th
                      style={{
                        fontSize: "13px",
                        padding: "12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                      }}
                    >
                      DISCOUNT
                    </th>
                    {formData.gstType === "gst" && (
                      <th
                        style={{
                          fontSize: "13px",
                          padding: "12px",
                          fontWeight: "600",
                          color: purpleTheme.text,
                        }}
                      >
                        GST
                      </th>
                    )}
                    <th
                      style={{
                        fontSize: "13px",
                        padding: "12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                      }}
                    >
                      AMOUNT
                    </th>
                    <th
                      style={{
                        fontSize: "13px",
                        padding: "12px",
                        fontWeight: "600",
                        color: purpleTheme.text,
                      }}
                    >
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((item) => item.productName)
                    .map((item, index) => (
                      <tr
                        key={item.id || index}
                        style={{
                          borderBottom: `1px solid ${purpleTheme.border}`,
                        }}
                      >
                        <td
                          style={{
                            fontSize: "13px",
                            padding: "12px",
                            color: purpleTheme.text,
                          }}
                        >
                          {index + 1}
                        </td>
                        <td style={{fontSize: "13px", padding: "12px"}}>
                          <div>
                            <div className="fw-semibold text-dark">
                              {item.productName}
                            </div>
                            {item.productCode && (
                              <Badge
                                style={{
                                  backgroundColor: `rgba(${purchaseConfig.primaryRgb}, 0.1)`,
                                  color: purchaseConfig.primaryColor,
                                  fontSize: "10px",
                                  fontWeight: "500",
                                }}
                                className="mt-1"
                              >
                                {item.productCode}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <small className="text-muted d-block mt-1">
                              {item.description.length > 40
                                ? `${item.description.substring(0, 40)}...`
                                : item.description}
                            </small>
                          )}
                        </td>
                        {formData.gstType === "gst" && (
                          <td
                            style={{
                              fontSize: "12px",
                              padding: "12px",
                              color: purpleTheme.textMuted,
                            }}
                          >
                            {item.hsnNumber || "N/A"}
                          </td>
                        )}
                        <td
                          style={{
                            fontSize: "13px",
                            padding: "12px",
                            color: purpleTheme.text,
                          }}
                        >
                          <span className="fw-semibold">{item.quantity}</span>
                        </td>
                        <td
                          style={{
                            fontSize: "13px",
                            padding: "12px",
                            color: purpleTheme.textMuted,
                          }}
                        >
                          {item.unit}
                        </td>
                        <td style={{fontSize: "13px", padding: "12px"}}>
                          <div className="fw-semibold text-dark">
                            ₹{parseFloat(item.price || 0).toFixed(2)}
                          </div>
                        </td>
                        <td style={{fontSize: "13px", padding: "12px"}}>
                          {item.discountPercent > 0 && (
                            <span
                              className="fw-semibold"
                              style={{color: purpleTheme.warning}}
                            >
                              {item.discountPercent}%
                            </span>
                          )}
                          {item.discountAmount > 0 && (
                            <div
                              className="fw-semibold"
                              style={{color: purpleTheme.warning}}
                            >
                              ₹{item.discountAmount.toFixed(2)}
                            </div>
                          )}
                        </td>
                        {formData.gstType === "gst" && (
                          <td style={{fontSize: "12px", padding: "12px"}}>
                            {item.gstAmount > 0 ? (
                              <div>
                                <Badge
                                  style={{
                                    backgroundColor:
                                      item.gstMode === "include"
                                        ? purpleTheme.success
                                        : purpleTheme.primary,
                                    color: "white",
                                    fontSize: "10px",
                                  }}
                                >
                                  {item.gstMode === "include" ? "Inc" : "Exc"}{" "}
                                  {item.gstRate}%
                                </Badge>
                                <div
                                  className="fw-semibold mt-1"
                                  style={{color: purpleTheme.success}}
                                >
                                  ₹{(item.gstAmount || 0).toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <Badge
                                style={{
                                  backgroundColor: purpleTheme.textMuted,
                                  color: "white",
                                  fontSize: "10px",
                                }}
                              >
                                No GST
                              </Badge>
                            )}
                          </td>
                        )}
                        <td style={{fontSize: "14px", padding: "12px"}}>
                          <div
                            className="fw-bold"
                            style={{color: purpleTheme.success}}
                          >
                            ₹{(item.totalAmount || 0).toFixed(2)}
                          </div>
                        </td>
                        <td style={{fontSize: "13px", padding: "12px"}}>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEditProduct(index)}
                              disabled={disabled}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                borderColor: purchaseConfig.primaryColor,
                                color: purchaseConfig.primaryColor,
                                fontSize: "12px",
                                transition: "all 0.2s ease",
                              }}
                            >
                              <FontAwesomeIcon icon={faEdit} size="xs" />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleRemoveProduct(index)}
                              disabled={disabled}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                borderColor: purpleTheme.error,
                                color: purpleTheme.error,
                                fontSize: "12px",
                                transition: "all 0.2s ease",
                              }}
                            >
                              <FontAwesomeIcon icon={faTrash} size="xs" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Description Section */}
      {hasValidItems && (
        <Card
          className="mb-4"
          style={{
            border: "none",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          }}
        >
          <Card.Body style={{padding: "24px"}}>
            <Form.Group>
              <Form.Label
                className="d-flex align-items-center fw-bold"
                style={{fontSize: "14px", color: purpleTheme.text}}
              >
                <FontAwesomeIcon
                  icon={faEdit}
                  className="me-2"
                  style={{color: purchaseConfig.primaryColor}}
                />
                Purchase Order Description
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.purchaseDescription || ""}
                onChange={(e) =>
                  onFormDataChange("purchaseDescription", e.target.value)
                }
                style={getInputStyle()}
                placeholder="Enter purchase order description, terms & conditions..."
                disabled={disabled}
              />
              <Form.Text
                className="text-muted fw-bold"
                style={{fontSize: "12px"}}
              >
                📝 This description will appear on the purchase order document
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>
      )}

      {/* Empty State */}
      {!hasValidItems && (
        <Card
          style={{
            border: "none",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          }}
        >
          <Card.Body className="text-center py-5">
            <FontAwesomeIcon
              icon={faBoxOpen}
              size="3x"
              className="mb-3"
              style={{color: purpleTheme.textMuted, opacity: 0.5}}
            />
            <h5 style={{color: purpleTheme.textMuted}}>
              No Products Added Yet
            </h5>
            <p style={{color: purpleTheme.textMuted}}>
              Click the "Add Product" button above to start adding products to
              your purchase order.
            </p>
            <Button
              variant="primary"
              onClick={handleAddProductClick}
              disabled={disabled}
              style={{
                background: `linear-gradient(135deg, ${purchaseConfig.primaryColor} 0%, ${purpleTheme.primaryLight} 100%)`,
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontWeight: "600",
                boxShadow: `0 4px 15px rgba(${purchaseConfig.primaryRgb}, 0.3)`,
                transition: "all 0.2s ease",
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Your First Product
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* Product Form Modal */}
      <Modal
        show={showProductFormModal}
        onHide={() => {
          setShowProductFormModal(false);
          resetProductSearchState();
        }}
        size="xl"
        centered
        backdrop="static"
        style={{
          "--bs-modal-border-radius": "16px",
        }}
      >
        <Modal.Header
          closeButton
          style={{
            backgroundColor: purpleTheme.background,
            borderBottom: `2px solid ${purpleTheme.border}`,
            borderRadius: "16px 16px 0 0",
          }}
        >
          <Modal.Title style={{color: purpleTheme.text, fontWeight: "600"}}>
            <FontAwesomeIcon
              icon={currentEditingIndex !== null ? faEdit : faPlus}
              className="me-2"
              style={{color: purchaseConfig.primaryColor}}
            />
            {currentEditingIndex !== null ? "Edit Product" : "Add Product"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{padding: "24px", backgroundColor: purpleTheme.surface}}
        >
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3 position-relative">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.error}}
                >
                  Select Product *
                  {tempFormData.selectedProduct && (
                    <Badge
                      className="ms-2"
                      style={{
                        backgroundColor: purpleTheme.success,
                        color: "white",
                      }}
                    >
                      <FontAwesomeIcon icon={faCheck} className="me-1" />
                      Selected
                    </Badge>
                  )}
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    value={productSearchTerms || ""}
                    onChange={(e) => {
                      const query = e.target.value;
                      setProductSearchTerms(query);
                      debouncedProductSearch(query);
                    }}
                    style={{
                      ...getInputStyle(),
                      backgroundColor: tempFormData.selectedProduct
                        ? `rgba(${purpleTheme.primaryRgb}, 0.05)`
                        : purpleTheme.surface,
                      borderColor: tempFormData.selectedProduct
                        ? purpleTheme.success
                        : purpleTheme.border,
                    }}
                    placeholder="Search or enter product name..."
                    autoComplete="off"
                    disabled={disabled}
                  />

                  {/* ✅ NEW: Unselect Button */}
                  {tempFormData.selectedProduct && (
                    <Button
                      variant="outline-danger"
                      onClick={handleUnselectProduct}
                      disabled={disabled}
                      style={{
                        borderColor: purpleTheme.error,
                        color: purpleTheme.error,
                        fontSize: "14px",
                        padding: "0 12px",
                      }}
                      title="Unselect product"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </Button>
                  )}
                </InputGroup>

                {productSearchLoading && (
                  <div className="position-absolute end-0 top-50 translate-middle-y me-3">
                    <div
                      className="spinner-border spinner-border-sm"
                      style={{color: purchaseConfig.primaryColor}}
                      role="status"
                    >
                      <span className="visually-hidden">Searching...</span>
                    </div>
                  </div>
                )}

                {(showProductSuggestions || productSearchNotFound) &&
                  !tempFormData.selectedProduct && (
                    <div
                      className="position-absolute w-100 bg-white border rounded shadow-lg"
                      style={{
                        zIndex: 9999,
                        top: "100%",
                        maxHeight: "300px",
                        overflowY: "auto",
                        borderColor: purpleTheme.border,
                        borderRadius: "8px",
                      }}
                    >
                      {productSearchLoading ? (
                        <div className="p-3 text-center">
                          <div
                            className="spinner-border spinner-border-sm me-2"
                            style={{color: purchaseConfig.primaryColor}}
                            role="status"
                          ></div>
                          <span style={{color: purpleTheme.textMuted}}>
                            Searching products...
                          </span>
                        </div>
                      ) : products.length > 0 ? (
                        <>
                          {products.slice(0, 8).map((product) => (
                            <div
                              key={product.id || product._id}
                              className="p-3 border-bottom"
                              style={{
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                                borderColor: purpleTheme.border,
                              }}
                              onClick={() => handleProductSelect(product)}
                              onMouseEnter={(e) =>
                                (e.target.style.backgroundColor =
                                  purpleTheme.background)
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.backgroundColor = "transparent")
                              }
                            >
                              <div
                                className="fw-bold"
                                style={{color: purpleTheme.text}}
                              >
                                {product.name}
                              </div>
                              <small style={{color: purpleTheme.textMuted}}>
                                Purchase: ₹
                                {formatCurrency(
                                  product.buyPrice || product.purchasePrice || 0
                                )}{" "}
                                | Stock:{" "}
                                {product.stock || product.currentStock || 0}
                                {product.itemCode &&
                                  ` | Code: ${product.itemCode}`}
                              </small>
                            </div>
                          ))}

                          {productSearchTerms.trim() && (
                            <div
                              className="p-3 border-top"
                              style={{
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                                backgroundColor: purpleTheme.background,
                                borderColor: purpleTheme.border,
                              }}
                              onClick={handleCreateNewItem}
                              onMouseEnter={(e) =>
                                (e.target.style.backgroundColor =
                                  purpleTheme.borderDark)
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.backgroundColor =
                                  purpleTheme.background)
                              }
                            >
                              <div
                                className="fw-bold"
                                style={{color: purchaseConfig.primaryColor}}
                              >
                                <FontAwesomeIcon
                                  icon={faPlus}
                                  className="me-2"
                                />
                                Create "{productSearchTerms}"
                              </div>
                              <small style={{color: purpleTheme.textMuted}}>
                                Add this as a new product
                              </small>
                            </div>
                          )}
                        </>
                      ) : productSearchNotFound ? (
                        <div className="p-3">
                          <div
                            className="text-center mb-2"
                            style={{color: purpleTheme.textMuted}}
                          >
                            <FontAwesomeIcon
                              icon={faBoxOpen}
                              className="me-2"
                            />
                            No products found for "{productSearchTerms}"
                          </div>

                          {productSearchTerms.trim() && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="w-100"
                              onClick={handleCreateNewItem}
                              style={{
                                borderColor: purchaseConfig.primaryColor,
                                color: purchaseConfig.primaryColor,
                                borderRadius: "8px",
                              }}
                            >
                              <FontAwesomeIcon icon={faPlus} className="me-2" />
                              Create "{productSearchTerms}" as new product
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.error}}
                >
                  Quantity *
                </Form.Label>
                <Form.Control
                  type="number"
                  value={tempFormData.quantity || ""}
                  onChange={(e) =>
                    handleTempFormChange("quantity", e.target.value)
                  }
                  style={getInputStyle()}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  disabled={disabled}
                />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.error}}
                >
                  Purchase Price *
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text style={getInputStyle()}>₹</InputGroup.Text>
                  <Form.Control
                    type="number"
                    value={tempFormData.price || ""}
                    onChange={(e) =>
                      handleTempFormChange("price", e.target.value)
                    }
                    style={getInputStyle()}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={disabled}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.text}}
                >
                  Unit
                </Form.Label>
                <Form.Select
                  value={tempFormData.unit || "PCS"}
                  onChange={(e) => handleTempFormChange("unit", e.target.value)}
                  style={getInputStyle()}
                  disabled={disabled}
                >
                  <option value="PCS">PCS</option>
                  <option value="KG">KG</option>
                  <option value="LTR">LTR</option>
                  <option value="MTR">MTR</option>
                  <option value="BOX">BOX</option>
                  <option value="PACK">PACK</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {formData.gstType === "gst" && (
              <>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label
                      className="fw-bold"
                      style={{color: purpleTheme.text}}
                    >
                      GST Mode
                      <Badge
                        className="ms-2"
                        style={{
                          backgroundColor:
                            tempFormData.gstMode === "include"
                              ? purpleTheme.success
                              : purchaseConfig.primaryColor,
                          color: "white",
                          fontSize: "9px",
                        }}
                      >
                        {tempFormData.gstMode === "include"
                          ? "Inc. GST"
                          : "Exc. GST"}
                      </Badge>
                    </Form.Label>
                    <Form.Select
                      value={tempFormData.gstMode || "exclude"}
                      onChange={(e) =>
                        handleTempFormChange("gstMode", e.target.value)
                      }
                      style={getInputStyle()}
                      disabled={disabled}
                    >
                      <option value="include">GST Inclusive</option>
                      <option value="exclude">GST Exclusive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label
                      className="fw-bold"
                      style={{color: purpleTheme.text}}
                    >
                      GST Rate (%)
                    </Form.Label>
                    <Form.Select
                      value={tempFormData.gstRate || 18}
                      onChange={(e) =>
                        handleTempFormChange("gstRate", e.target.value)
                      }
                      style={getInputStyle()}
                      disabled={disabled}
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label
                      className="fw-bold"
                      style={{color: purpleTheme.text}}
                    >
                      HSN Code
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={tempFormData.hsnNumber || ""}
                      onChange={(e) =>
                        handleTempFormChange("hsnNumber", e.target.value)
                      }
                      style={getInputStyle()}
                      placeholder="HSN Code"
                      disabled={disabled}
                    />
                  </Form.Group>
                </Col>
              </>
            )}

            <Col md={formData.gstType === "gst" ? 12 : 3}>
              <Form.Group className="mb-3">
                <Form.Label
                  className="fw-bold"
                  style={{color: purpleTheme.text}}
                >
                  Discount %
                </Form.Label>
                <Form.Control
                  type="number"
                  value={tempFormData.discountPercent || ""}
                  onChange={(e) =>
                    handleTempFormChange("discountPercent", e.target.value)
                  }
                  style={getInputStyle()}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={disabled}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold" style={{color: purpleTheme.text}}>
              Description
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={tempFormData.description || ""}
              onChange={(e) =>
                handleTempFormChange("description", e.target.value)
              }
              style={getInputStyle()}
              placeholder="Enter product description..."
              disabled={disabled}
            />
          </Form.Group>

          <div
            className="text-center p-3 rounded"
            style={{
              backgroundColor: purpleTheme.background,
              border: `2px solid ${purpleTheme.success}`,
            }}
          >
            <h4 className="mb-2" style={{color: purpleTheme.success}}>
              Total: ₹{formatCurrency(tempFormData.totalAmount || 0)}
            </h4>

            {tempFormData.quantity > 0 && tempFormData.price > 0 && (
              <div className="small" style={{color: purpleTheme.textMuted}}>
                <div className="row">
                  <div className="col-6">
                    <div>Qty: {tempFormData.quantity}</div>
                    <div>Rate: ₹{tempFormData.price}</div>
                    {tempFormData.discountPercent > 0 && (
                      <div>Discount: {tempFormData.discountPercent}%</div>
                    )}
                  </div>
                  <div className="col-6">
                    <div>
                      Subtotal: ₹
                      {(
                        (tempFormData.quantity || 0) * (tempFormData.price || 0)
                      ).toFixed(2)}
                    </div>
                    {formData.gstType === "gst" &&
                      tempFormData.gstAmount > 0 && (
                        <div>
                          GST: ₹{(tempFormData.gstAmount || 0).toFixed(2)}
                        </div>
                      )}
                    <div className="fw-bold">
                      Final: ₹{(tempFormData.totalAmount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.gstType === "gst" && tempFormData.gstMode && (
              <Badge
                className="mt-2"
                style={{
                  backgroundColor:
                    tempFormData.gstMode === "include"
                      ? purpleTheme.success
                      : purchaseConfig.primaryColor,
                  color: "white",
                }}
              >
                {tempFormData.gstMode === "include"
                  ? "Price Includes GST"
                  : "Price Excludes GST"}
              </Badge>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer
          style={{
            backgroundColor: purpleTheme.background,
            borderTop: `2px solid ${purpleTheme.border}`,
            borderRadius: "0 0 16px 16px",
            padding: "16px 24px",
          }}
        >
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowProductFormModal(false);
              resetProductSearchState();
            }}
            disabled={disabled}
            style={{
              borderColor: purpleTheme.textMuted,
              color: purpleTheme.textMuted,
              borderRadius: "8px",
              fontWeight: "600",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSaveAndAdd}
            disabled={
              !tempFormData.productName ||
              !tempFormData.quantity ||
              !tempFormData.price ||
              disabled
            }
            style={{
              backgroundColor: purpleTheme.success,
              borderColor: purpleTheme.success,
              borderRadius: "8px",
              fontWeight: "600",
              boxShadow: `0 4px 15px rgba(16, 185, 129, 0.3)`,
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Save & Add Another
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveAndExit}
            disabled={
              !tempFormData.productName ||
              !tempFormData.quantity ||
              !tempFormData.price ||
              disabled
            }
            style={{
              background: `linear-gradient(135deg, ${purchaseConfig.primaryColor} 0%, ${purpleTheme.primaryLight} 100%)`,
              borderColor: purchaseConfig.primaryColor,
              borderRadius: "8px",
              fontWeight: "600",
              boxShadow: `0 4px 15px rgba(${purchaseConfig.primaryRgb}, 0.3)`,
            }}
          >
            <FontAwesomeIcon icon={faSave} className="me-2" />
            Save & Exit
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ✅ NEW: Add Item Modal using ProductModal from Inventory */}
      {showAddItemModal && (
        <ProductModal
          show={showAddItemModal}
          onHide={() => {
            setShowAddItemModal(false);
            setNewItemFormData({
              name: "",
              itemCode: "",
              hsnNumber: "",
              type: "product",
              category: "",
              unit: "PCS",
              description: "",
              buyPrice: "",
              salePrice: "",
              atPrice: "",
              gstRate: 18,
              openingQuantity: "",
              currentStock: "",
              openingStock: "",
              minStockLevel: "",
              minStockToMaintain: "",
              asOfDate: new Date().toISOString().split("T")[0],
              isActive: true,
            });
          }}
          editingProduct={null}
          formData={newItemFormData}
          categories={categories}
          onInputChange={handleNewItemInputChange}
          onSaveProduct={handleNewItemSave}
          currentCompany={{
            id: companyId,
            companyName: "Current Company",
          }}
          mode="add"
          type="product"
        />
      )}
      {/* Custom Styles */}
      <style jsx>{`
        /* Button hover effects */
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(${purchaseConfig.primaryRgb}, 0.4) !important;
        }

        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(16, 185, 129, 0.4) !important;
        }

        .btn-outline-primary:hover {
          background-color: rgba(${purchaseConfig.primaryRgb}, 0.1) !important;
          border-color: ${purchaseConfig.primaryColor} !important;
          color: ${purchaseConfig.primaryColor} !important;
        }

        .btn-outline-danger:hover {
          background-color: rgba(239, 68, 68, 0.1) !important;
          border-color: ${purpleTheme.error} !important;
          color: ${purpleTheme.error} !important;
        }

        /* Table hover effects */
        .table-hover tbody tr:hover {
          background-color: rgba(${purchaseConfig.primaryRgb}, 0.05) !important;
        }

        /* Card hover effects */
        .card {
          transition: all 0.2s ease;
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12) !important;
        }

        /* Loading states */
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn:disabled:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        /* Focus states */
        .btn:focus {
          box-shadow: 0 0 0 0.2rem rgba(${purchaseConfig.primaryRgb}, 0.25) !important;
        }

        /* Modal styling */
        .modal-content {
          border-radius: 16px !important;
          border: none !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
        }

        /* Form control focus */
        .form-control:focus,
        .form-select:focus {
          border-color: ${purchaseConfig.primaryColor} !important;
          box-shadow: 0 0 0 0.25rem rgba(${purchaseConfig.primaryRgb}, 0.25) !important;
        }

        /* Responsive adjustments */
        @media (max-width: 767.98px) {
          .table-responsive {
            font-size: 12px !important;
          }

          .card-body {
            padding: 16px !important;
          }
        }

        /* Animation for cards */
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

        .card {
          animation: fadeInUp 0.4s ease-out;
        }

        /* Custom scrollbar for dropdown */
        .position-absolute::-webkit-scrollbar {
          width: 6px;
        }

        .position-absolute::-webkit-scrollbar-track {
          background: ${purpleTheme.background};
        }

        .position-absolute::-webkit-scrollbar-thumb {
          background: ${purpleTheme.border};
          border-radius: 3px;
        }

        .position-absolute::-webkit-scrollbar-thumb:hover {
          background: ${purpleTheme.borderDark};
        }
      `}</style>
    </Container>
  );
}

export default PurchaseOrderFormProductSelection;
