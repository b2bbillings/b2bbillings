import React, {useRef, useEffect, useState} from "react";
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  InputGroup,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSave,
  faTimes,
  faSearch,
  faDatabase,
  faPlus,
  faCheck,
  faToggleOn,
  faToggleOff,
  faSpinner,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";
import ProductSearchModal from "./ProductSearchModal";
import itemService from "../../../services/itemService";
import "./ProductModal.css";

function ProductModal({
  show,
  onHide,
  editingProduct,
  formData,
  categories,
  onInputChange,
  onSaveProduct,
  currentCompany,
  mode = "add", // 'add' or 'edit'
  type = "product", // 'product' or 'service'
}) {
  // Refs for keyboard navigation
  const productServiceToggleRef = useRef(null);
  const searchDatabaseRef = useRef(null);
  const nameRef = useRef(null);
  const hsnNumberRef = useRef(null);
  const itemCodeRef = useRef(null);
  const assignCodeRef = useRef(null);
  const unitRef = useRef(null);
  const categoryRef = useRef(null);
  const gstRateRef = useRef(null);
  const descriptionRef = useRef(null);
  // Stock refs
  const openingQuantityRef = useRef(null);
  const atPriceRef = useRef(null);
  const asOfDateRef = useRef(null);
  const minStockToMaintainRef = useRef(null);
  // Pricing refs
  const buyPriceRef = useRef(null);
  const buyTaxToggleRef = useRef(null);
  const salePriceRef = useRef(null);
  const saleTaxToggleRef = useRef(null);
  const isActiveRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const saveAndAddButtonRef = useRef(null);
  const saveButtonRef = useRef(null);

  // Local state for product search and toast
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [isSaveAndAdd, setIsSaveAndAdd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [buyPriceTaxInclusive, setBuyPriceTaxInclusive] = useState(false);
  const [salePriceTaxInclusive, setSalePriceTaxInclusive] = useState(false);

  // Database search products state
  const [searchProducts, setSearchProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const unitOptions = [
    "BAG",
    "BTL",
    "BOX",
    "BUN",
    "CAN",
    "CTN",
    "DOZ",
    "DRM",
    "FEW",
    "GMS",
    "GRS",
    "KGS",
    "KME",
    "LTR",
    "MLS",
    "MTR",
    "NOS",
    "PAC",
    "PCS",
    "QTL",
    "ROL",
    "SET",
    "SQF",
    "SQM",
    "TBS",
    "TGM",
    "THD",
    "TON",
    "TUB",
    "UGS",
    "UNT",
    "YDS",
    "OTH",
  ];

  const gstRateOptions = [0, 0.25, 3, 5, 12, 18, 28];

  // Auto-focus first field when modal opens
  useEffect(() => {
    if (show && productServiceToggleRef.current) {
      setTimeout(() => {
        productServiceToggleRef.current.focus();
      }, 100);
    }
  }, [show]);

  // Reset save and add flag when modal closes
  useEffect(() => {
    if (!show) {
      setIsSaveAndAdd(false);
      setIsLoading(false);
    }
  }, [show]);

  // Load search products when modal opens
  useEffect(() => {
    if (show && currentCompany?.id) {
      loadSearchProducts();
    }
  }, [show, currentCompany?.id]);

  // 🚨 SIMPLIFIED PRE-POPULATION - Only set tax states, form data handled by parent
  useEffect(() => {
    if (editingProduct && mode === "edit" && show) {
      // Only set tax inclusive states here - form data is handled by parent
      setBuyPriceTaxInclusive(editingProduct.isBuyPriceTaxInclusive || false);
      setSalePriceTaxInclusive(editingProduct.isSalePriceTaxInclusive || false);
    }
  }, [editingProduct?.id, editingProduct?._id, mode, show]); // Use stable ID references

  // Load products for search modal
  const loadSearchProducts = async () => {
    try {
      if (!currentCompany?.id) return;

      setIsSearching(true);
      const response = await itemService.getItems(currentCompany.id, {
        limit: 50,
        isActive: true,
        sortBy: "name",
        sortOrder: "asc",
      });

      if (response.success) {
        setSearchProducts(response.data.items || []);
      }
    } catch (error) {
      console.error("Error loading search products:", error);
      showToastMessage("Error loading products for search", "error");
    } finally {
      setIsSearching(false);
    }
  };

  // Generate item code automatically
  const generateItemCode = (name, category) => {
    if (!name || !category) return "";

    const namePrefix = name.substring(0, 3).toUpperCase();
    const categoryPrefix = category.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    return `${namePrefix}-${categoryPrefix}-${randomNum}`;
  };

  // Calculate price with/without tax
  const calculatePriceWithTax = (price, gstRate, isInclusive) => {
    if (!price || !gstRate) return price;

    if (isInclusive) {
      // Tax inclusive - return price without tax
      return (price / (1 + gstRate / 100)).toFixed(2);
    } else {
      // Tax exclusive - return price with tax
      return (price * (1 + gstRate / 100)).toFixed(2);
    }
  };

  // Get ordered navigation refs based on current form state
  const getNavigationRefs = () => {
    const baseRefs = [
      productServiceToggleRef,
      searchDatabaseRef,
      nameRef,
      hsnNumberRef,
      itemCodeRef,
      assignCodeRef,
      unitRef,
      categoryRef,
      gstRateRef,
      descriptionRef,
    ];

    const stockRefs =
      formData.type !== "service"
        ? [openingQuantityRef, atPriceRef, asOfDateRef, minStockToMaintainRef]
        : [];

    // For services, only show sale price (service rate). For products, show both buy and sale price
    const pricingRefs =
      formData.type === "service"
        ? [salePriceRef, saleTaxToggleRef]
        : [buyPriceRef, buyTaxToggleRef, salePriceRef, saleTaxToggleRef];

    const endRefs = [
      isActiveRef,
      cancelButtonRef,
      ...(mode === "edit" ? [] : [saveAndAddButtonRef]), // Hide Save & New for edit mode
      saveButtonRef,
    ];

    return [...baseRefs, ...stockRefs, ...pricingRefs, ...endRefs];
  };

  // Handle keyboard navigation globally
  const handleKeyDown = (e) => {
    // Prevent action if currently loading
    if (isLoading) return;

    // Handle Escape key
    if (e.key === "Escape") {
      e.preventDefault();
      onHide();
      return;
    }

    // Handle Ctrl+S for save
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    // Handle Ctrl+Shift+S for save and add another (only in add mode)
    if (e.ctrlKey && e.shiftKey && e.key === "S" && mode === "add") {
      e.preventDefault();
      handleSaveAndAddAnother(e);
      return;
    }

    // Handle Ctrl+G for generate code
    if (e.ctrlKey && e.key === "g") {
      e.preventDefault();
      handleGenerateCode();
      return;
    }

    // Handle Ctrl+D for database search (only in add mode)
    if (e.ctrlKey && e.key === "d" && mode === "add") {
      e.preventDefault();
      setShowProductSearch(true);
      return;
    }

    // Handle Tab navigation
    if (e.key === "Tab") {
      e.preventDefault();
      const refs = getNavigationRefs();
      const currentElement = document.activeElement;
      const currentIndex = refs.findIndex(
        (ref) => ref.current === currentElement
      );

      if (e.shiftKey) {
        // Shift+Tab - go to previous
        const prevIndex =
          currentIndex <= 0 ? refs.length - 1 : currentIndex - 1;
        const prevRef = refs[prevIndex];
        if (prevRef && prevRef.current) {
          prevRef.current.focus();
        }
      } else {
        // Tab - go to next
        const nextIndex =
          currentIndex >= refs.length - 1 ? 0 : currentIndex + 1;
        const nextRef = refs[nextIndex];
        if (nextRef && nextRef.current) {
          nextRef.current.focus();
        }
      }
      return;
    }

    // Handle Enter key navigation (except for textarea and buttons)
    if (
      e.key === "Enter" &&
      !["TEXTAREA", "BUTTON"].includes(e.target.tagName)
    ) {
      e.preventDefault();
      const refs = getNavigationRefs();
      const currentElement = document.activeElement;
      const currentIndex = refs.findIndex(
        (ref) => ref.current === currentElement
      );

      if (currentIndex !== -1 && currentIndex < refs.length - 1) {
        const nextRef = refs[currentIndex + 1];
        if (nextRef && nextRef.current) {
          nextRef.current.focus();
        }
      }
    }
  };

  // Handle toggle keyboard interactions
  const handleToggleKeyDown = (e, action) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  // Generate item code
  const handleGenerateCode = () => {
    if (formData.name && formData.category) {
      const generatedCode = generateItemCode(formData.name, formData.category);
      onInputChange({
        target: {name: "itemCode", value: generatedCode},
      });
      showToastMessage("Item code generated automatically!");
    } else {
      showToastMessage(
        "Please enter item name and select category first",
        "error"
      );
    }
  };

  // Validate form data
  const validateForm = () => {
    if (!currentCompany?.id) {
      showToastMessage("No company selected", "error");
      return false;
    }

    if (!formData.name?.trim()) {
      nameRef.current?.focus();
      showToastMessage("Please enter item name", "error");
      return false;
    }

    if (!formData.unit) {
      unitRef.current?.focus();
      showToastMessage("Please select unit", "error");
      return false;
    }

    if (!formData.category) {
      categoryRef.current?.focus();
      showToastMessage("Please select category", "error");
      return false;
    }

    return true;
  };

  // Clear form fields but keep common ones
  const clearFormForNext = () => {
    // Reset specific fields to empty
    const fieldsToReset = [
      "name",
      "itemCode",
      "hsnNumber",
      "description",
      "openingQuantity",
      "atPrice",
      "minStockToMaintain",
      "buyPrice",
      "salePrice",
    ];

    fieldsToReset.forEach((field) => {
      onInputChange({
        target: {name: field, value: ""},
      });
    });

    // Keep isActive as true and reset date
    onInputChange({
      target: {name: "isActive", value: true, type: "checkbox", checked: true},
    });

    onInputChange({
      target: {name: "asOfDate", value: new Date().toISOString().split("T")[0]},
    });
  };

  // 🚨 ENHANCED FORM SUBMISSION WITH NAME VERIFICATION AWARENESS
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateForm() || isLoading) {
      return;
    }

    // Prepare the complete data to send to parent
    const dataToSend = {
      ...formData,
      // Include tax states from local component state
      isBuyPriceTaxInclusive: buyPriceTaxInclusive,
      isSalePriceTaxInclusive: salePriceTaxInclusive,
      // Ensure proper data types
      buyPrice: parseFloat(formData.buyPrice) || 0,
      salePrice: parseFloat(formData.salePrice) || 0,
      atPrice: parseFloat(formData.atPrice) || 0,
      gstRate: parseFloat(formData.gstRate) || 18,
      openingQuantity:
        formData.type === "service"
          ? 0
          : parseFloat(formData.openingQuantity) ||
            parseFloat(formData.currentStock) ||
            parseFloat(formData.openingStock) ||
            0,
      currentStock:
        formData.type === "service"
          ? 0
          : parseFloat(formData.currentStock) ||
            parseFloat(formData.openingQuantity) ||
            parseFloat(formData.openingStock) ||
            0,
      openingStock:
        formData.type === "service"
          ? 0
          : parseFloat(formData.openingStock) ||
            parseFloat(formData.openingQuantity) ||
            parseFloat(formData.currentStock) ||
            0,
      minStockLevel:
        formData.type === "service"
          ? 0
          : parseFloat(formData.minStockLevel) ||
            parseFloat(formData.minStockToMaintain) ||
            0,
      minStockToMaintain:
        formData.type === "service"
          ? 0
          : parseFloat(formData.minStockToMaintain) ||
            parseFloat(formData.minStockLevel) ||
            0,
    };

    setIsLoading(true);

    try {
      // Call parent's onSaveProduct function
      if (onSaveProduct) {
        const result = await onSaveProduct(dataToSend, false);

        if (result && result.success) {
          // ✅ ENHANCED: Check if item has verification status
          const verificationStatus =
            result.data?.item?.nameVerification?.status;

          if (mode === "add" && verificationStatus === "pending") {
            showToastMessage(
              `✅ ${formData.name} created successfully! 
            🔔 Item is pending name verification by admin.`,
              "success"
            );
          } else {
            showToastMessage(
              `${formData.name} ${
                mode === "edit" ? "updated" : "created"
              } successfully!`,
              "success"
            );
          }

          // Close modal after successful save
          setTimeout(() => {
            onHide();
          }, 2000); // Slightly longer to show verification message
        }
      }
    } catch (error) {
      console.error(
        `❌ ProductModal - Error ${
          mode === "edit" ? "updating" : "saving"
        } item:`,
        error
      );
      showToastMessage(
        `Error ${mode === "edit" ? "updating" : "saving"} item: ${
          error.message
        }`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ENHANCED: Handle save and add another with verification awareness
  const handleSaveAndAddAnother = async (e) => {
    if (mode === "edit") return; // Don't allow save and add in edit mode

    e.preventDefault();
    e.stopPropagation();

    if (!validateForm() || isLoading) {
      return;
    }

    setIsLoading(true);
    setIsSaveAndAdd(true);

    try {
      const currentProductName = formData.name;

      // Prepare the complete data to send to parent
      const dataToSend = {
        ...formData,
        // Include tax states from local component state
        isBuyPriceTaxInclusive: buyPriceTaxInclusive,
        isSalePriceTaxInclusive: salePriceTaxInclusive,
        // Ensure proper data types
        buyPrice: parseFloat(formData.buyPrice) || 0,
        salePrice: parseFloat(formData.salePrice) || 0,
        atPrice: parseFloat(formData.atPrice) || 0,
        gstRate: parseFloat(formData.gstRate) || 18,
        openingQuantity:
          formData.type === "service"
            ? 0
            : parseFloat(formData.openingQuantity) ||
              parseFloat(formData.currentStock) ||
              parseFloat(formData.openingStock) ||
              0,
        currentStock:
          formData.type === "service"
            ? 0
            : parseFloat(formData.currentStock) ||
              parseFloat(formData.openingQuantity) ||
              parseFloat(formData.openingStock) ||
              0,
        openingStock:
          formData.type === "service"
            ? 0
            : parseFloat(formData.openingStock) ||
              parseFloat(formData.openingQuantity) ||
              parseFloat(formData.currentStock) ||
              0,
        minStockLevel:
          formData.type === "service"
            ? 0
            : parseFloat(formData.minStockLevel) ||
              parseFloat(formData.minStockToMaintain) ||
              0,
        minStockToMaintain:
          formData.type === "service"
            ? 0
            : parseFloat(formData.minStockToMaintain) ||
              parseFloat(formData.minStockLevel) ||
              0,
      };

      // Call parent's onSaveProduct function
      if (onSaveProduct) {
        const result = await onSaveProduct(dataToSend, true);

        if (result && result.success) {
          // ✅ ENHANCED: Show verification-aware success message
          const verificationStatus =
            result.data?.item?.nameVerification?.status;

          if (verificationStatus === "pending") {
            showToastMessage(
              `✅ ${currentProductName} saved successfully! 
            🔔 Pending admin verification. Ready to add another...`,
              "success"
            );
          } else {
            showToastMessage(
              `${currentProductName} saved successfully! Ready to add another...`,
              "success"
            );
          }

          // Clear form for new product while keeping common fields
          clearFormForNext();

          // Focus on name field for next product
          setTimeout(() => {
            nameRef.current?.focus();
          }, 200);
        }
      }
    } catch (error) {
      console.error("❌ ProductModal - Error saving item:", error);
      showToastMessage(`Error saving item: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
      setIsSaveAndAdd(false);
    }
  };

  // ✅ ENHANCED: Show toast message with better formatting for verification
  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);

    // Auto-hide toast after longer time for verification messages
    const hideTimeout =
      message.includes("verification") || message.includes("admin")
        ? 6000
        : 4000;

    setTimeout(() => {
      setShowToast(false);
    }, hideTimeout);
  };

  // Custom onHide that checks for save and add
  const handleModalHide = () => {
    if (isSaveAndAdd || isLoading) {
      return; // Don't close modal if we're in save and add mode or loading
    }
    onHide();
  };

  // Handle product selection from search modal (only for add mode)
  const handleProductSelection = (product) => {
    if (mode === "edit") return; // Don't allow database search in edit mode

    // Auto-fill form with selected product data
    const productData = {
      name: product.name,
      itemCode: product.itemCode || product.sku,
      hsnNumber: product.hsnNumber,
      unit: product.unit,
      category: product.category,
      description: product.description,
      gstRate: product.gstRate,
      type: product.type || "product",
      buyPrice: product.buyPrice,
      salePrice: product.salePrice,
      atPrice: product.atPrice,
      isActive: true,
    };

    // Update form data using individual onInputChange calls
    Object.entries(productData).forEach(([name, value]) => {
      if (value !== undefined && value !== null) {
        onInputChange({
          target: {name, value},
        });
      }
    });

    setShowProductSearch(false);
    showToastMessage("Product details imported successfully!");

    // Focus on the next relevant field after auto-fill
    setTimeout(() => {
      if (formData.type !== "service") {
        openingQuantityRef.current?.focus();
      } else {
        isActiveRef.current?.focus();
      }
    }, 100);
  };

  return (
    <>
      <Modal
        show={show}
        onHide={handleModalHide}
        size="xl"
        centered
        onKeyDown={handleKeyDown}
        backdrop="static"
        className={`product-modal ${showProductSearch ? "modal-blurred" : ""}`}
      >
        <div
          className={`modal-content-wrapper ${
            showProductSearch ? "content-blurred" : ""
          }`}
        >
          <Modal.Header className="border-0 pb-0">
            <Modal.Title className="fw-bold">
              {mode === "edit" ? (
                <>
                  <FontAwesomeIcon
                    icon={faEdit}
                    className="me-2 text-primary"
                  />
                  Edit {type === "service" ? "Service" : "Product"}
                </>
              ) : (
                <>
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="me-2 text-success"
                  />
                  Add New {type === "service" ? "Service" : "Product"}
                </>
              )}
              {currentCompany && (
                <small className="text-muted ms-2">
                  for {currentCompany.companyName}
                </small>
              )}
              <small className="text-muted ms-2 fw-normal d-block">
                (Tab/Enter: navigate, Esc: close, Ctrl+S: save
                {mode === "add" &&
                  ", Ctrl+Shift+S: save & add, Ctrl+D: search database"}
                , Ctrl+G: generate code)
                {/* ✅ NEW: Verification info */}
                {mode === "add" && (
                  <span className="text-info d-block mt-1">
                    📋 New items require admin name verification
                  </span>
                )}
              </small>
            </Modal.Title>
            <Button
              variant="link"
              className="p-0 border-0 text-muted"
              onClick={handleModalHide}
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </Button>
          </Modal.Header>

          <Modal.Body className="px-4 pb-4">
            <ToastContainer
              position="top-end"
              className="p-3"
              style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                zIndex: 9999,
              }}
            >
              <Toast
                show={showToast}
                onClose={() => setShowToast(false)}
                className={`${toastType}-toast`}
                autohide
                delay={
                  toastMessage.includes("verification") ||
                  toastMessage.includes("admin")
                    ? 6000
                    : 4000
                }
              >
                <Toast.Header
                  className={`${
                    toastType === "success" ? "bg-success" : "bg-danger"
                  } text-white border-0`}
                >
                  <FontAwesomeIcon
                    icon={toastType === "success" ? faCheck : faTimes}
                    className="me-2"
                  />
                  <strong className="me-auto">
                    {toastType === "success" ? "Success" : "Error"}
                  </strong>
                </Toast.Header>
                <Toast.Body className="bg-light border-0">
                  <div className="d-flex align-items-start">
                    <FontAwesomeIcon
                      icon={toastType === "success" ? faCheck : faTimes}
                      className={`${
                        toastType === "success" ? "text-success" : "text-danger"
                      } me-2 mt-1`}
                    />
                    <div>
                      {/* ✅ ENHANCED: Multi-line message support */}
                      {toastMessage.split("\n").map((line, index) => (
                        <div key={index} className={index > 0 ? "mt-1" : ""}>
                          {line.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                  {isSaveAndAdd && toastType === "success" && (
                    <small className="text-muted mt-2 d-block">
                      Ready to add another item...
                    </small>
                  )}
                  {/* ✅ NEW: Verification info */}
                  {toastMessage.includes("verification") &&
                    toastType === "success" && (
                      <small className="text-info mt-2 d-block">
                        <FontAwesomeIcon icon={faSpinner} className="me-1" />
                        Items will be available after admin approval
                      </small>
                    )}
                </Toast.Body>
              </Toast>
            </ToastContainer>
            {/* Loading Overlay */}
            {isLoading && (
              <div
                className="loading-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                style={{zIndex: 1000}}
              >
                <div className="text-center">
                  <FontAwesomeIcon
                    icon={faSpinner}
                    spin
                    size="2x"
                    className="text-primary mb-3"
                  />
                  <div className="fw-bold text-primary">
                    {mode === "edit"
                      ? "Updating item..."
                      : isSaveAndAdd
                      ? "Saving item and preparing for next..."
                      : "Saving item..."}
                  </div>
                </div>
              </div>
            )}
            {/* Header Section with Type Toggle and Database Search */}
            <Row className="mb-4">
              <Col md={mode === "edit" ? 12 : 6}>
                {/* Product/Service Toggle */}
                <div className="product-service-toggle p-3 bg-light rounded border">
                  <div className="d-flex align-items-center justify-content-center">
                    <span
                      className={`toggle-label ${
                        formData.type === "product" ? "active" : ""
                      }`}
                    >
                      Product
                    </span>
                    <div
                      ref={productServiceToggleRef}
                      className="custom-toggle mx-3"
                      onClick={() => {
                        if (!isLoading && mode === "add") {
                          // Only allow type change in add mode
                          const newType =
                            formData.type === "product" ? "service" : "product";
                          onInputChange({
                            target: {name: "type", value: newType},
                          });
                        }
                      }}
                      onKeyDown={(e) =>
                        handleToggleKeyDown(e, () => {
                          if (!isLoading && mode === "add") {
                            const newType =
                              formData.type === "product"
                                ? "service"
                                : "product";
                            onInputChange({
                              target: {name: "type", value: newType},
                            });
                          }
                        })
                      }
                      tabIndex={0}
                      role="button"
                      aria-label={`Switch to ${
                        formData.type === "product" ? "service" : "product"
                      } mode`}
                      style={{
                        opacity: isLoading || mode === "edit" ? 0.6 : 1,
                        cursor: mode === "edit" ? "not-allowed" : "pointer",
                      }}
                    >
                      <div
                        className={`toggle-slider ${
                          formData.type === "service" ? "active" : ""
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={
                            formData.type === "service"
                              ? faToggleOn
                              : faToggleOff
                          }
                          size="2x"
                          className={
                            formData.type === "service"
                              ? "text-primary"
                              : "text-secondary"
                          }
                        />
                      </div>
                    </div>
                    <span
                      className={`toggle-label ${
                        formData.type === "service" ? "active" : ""
                      }`}
                    >
                      Services
                    </span>
                  </div>
                  {mode === "edit" && (
                    <small className="text-muted text-center d-block mt-2">
                      Type cannot be changed in edit mode
                    </small>
                  )}
                </div>
              </Col>

              {/* Database Search - Only show in add mode */}
              {mode === "add" && (
                <Col md={6}>
                  <div className="p-3 bg-light rounded border">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1 fw-bold text-primary">
                          <FontAwesomeIcon icon={faDatabase} className="me-2" />
                          Search Items in Database
                          {isSearching && (
                            <FontAwesomeIcon
                              icon={faSpinner}
                              spin
                              className="ms-2 text-muted"
                            />
                          )}
                        </h6>
                        <small className="text-muted">
                          Import details to save time (Ctrl+D)
                          {searchProducts.length > 0 && (
                            <span className="ms-1">
                              • {searchProducts.length} items available
                            </span>
                          )}
                        </small>
                      </div>
                      <Button
                        ref={searchDatabaseRef}
                        variant="outline-primary"
                        onClick={() => !isLoading && setShowProductSearch(true)}
                        className="search-database-btn"
                        tabIndex={0}
                        disabled={isLoading || isSearching}
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </Button>
                    </div>
                  </div>
                </Col>
              )}
            </Row>
            <Form onSubmit={handleSubmit} autoComplete="off">
              {/* First Row - Item Details */}
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      {formData.type === "service"
                        ? "Service Name"
                        : "Item Name"}{" "}
                      <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      ref={nameRef}
                      type="text"
                      name="name"
                      value={formData.name || ""}
                      onChange={onInputChange}
                      placeholder={
                        formData.type === "service"
                          ? "Service Name"
                          : "Item Name"
                      }
                      className="form-input"
                      required
                      tabIndex={0}
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>

                <Col md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      {formData.type === "service" ? "SAC Code" : "HSN Code"}
                    </Form.Label>
                    <Form.Control
                      ref={hsnNumberRef}
                      type="text"
                      name="hsnNumber"
                      value={formData.hsnNumber || ""}
                      onChange={onInputChange}
                      placeholder={
                        formData.type === "service" ? "SAC Code" : "HSN Code"
                      }
                      className="form-input"
                      tabIndex={0}
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      {formData.type === "service"
                        ? "Service Code"
                        : "Item Code"}
                      <Button
                        ref={assignCodeRef}
                        variant="link"
                        size="sm"
                        className="p-0 ms-2 text-primary"
                        onClick={handleGenerateCode}
                        title="Generate Code (Ctrl+G)"
                        tabIndex={0}
                        disabled={isLoading}
                      >
                        Assign Code
                      </Button>
                    </Form.Label>
                    <Form.Control
                      ref={itemCodeRef}
                      type="text"
                      name="itemCode"
                      value={formData.itemCode || ""}
                      onChange={onInputChange}
                      placeholder={
                        formData.type === "service"
                          ? "Service Code"
                          : "Item Code"
                      }
                      className="form-input"
                      tabIndex={0}
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Select Unit <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      ref={unitRef}
                      name="unit"
                      value={formData.unit || ""}
                      onChange={onInputChange}
                      className="form-input"
                      required
                      tabIndex={0}
                      disabled={isLoading}
                    >
                      <option value="">Select Unit</option>
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Second Row - Category, GST, Description */}
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Select Category <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      ref={categoryRef}
                      name="category"
                      value={formData.category || ""}
                      onChange={onInputChange}
                      className="form-input"
                      required
                      tabIndex={0}
                      disabled={isLoading}
                    >
                      <option value="">Select Category</option>
                      {categories
                        .filter((cat) => cat.isActive)
                        .map((category) => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">GST Rate</Form.Label>
                    <Form.Select
                      ref={gstRateRef}
                      name="gstRate"
                      value={formData.gstRate || 0}
                      onChange={onInputChange}
                      className="form-input"
                      tabIndex={0}
                      disabled={isLoading}
                    >
                      {gstRateOptions.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={5}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Description</Form.Label>
                    <Form.Control
                      ref={descriptionRef}
                      as="textarea"
                      rows={2}
                      name="description"
                      value={formData.description || ""}
                      onChange={onInputChange}
                      placeholder="Description"
                      className="form-input"
                      tabIndex={0}
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Stock Section - Only for Products */}
              {formData.type !== "service" && (
                <Row className="mb-4">
                  <Col md={12}>
                    <div className="bg-light p-3 rounded border">
                      <h6 className="fw-bold text-primary mb-3">📦 Stock</h6>
                      <Row>
                        <Col md={3}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              {mode === "edit"
                                ? "Current Quantity"
                                : "Opening Quantity"}
                            </Form.Label>
                            <Form.Control
                              ref={openingQuantityRef}
                              type="number"
                              name={
                                mode === "edit"
                                  ? "currentStock"
                                  : "openingQuantity"
                              }
                              value={
                                mode === "edit"
                                  ? formData.currentStock || ""
                                  : formData.openingQuantity || ""
                              }
                              onChange={onInputChange}
                              placeholder="0"
                              min="0"
                              step="1"
                              className="form-input"
                              tabIndex={0}
                              disabled={isLoading}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={3}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              At Price
                            </Form.Label>
                            <InputGroup>
                              <InputGroup.Text>₹</InputGroup.Text>
                              <Form.Control
                                ref={atPriceRef}
                                type="number"
                                name="atPrice"
                                value={formData.atPrice || ""}
                                onChange={onInputChange}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="form-input"
                                tabIndex={0}
                                disabled={isLoading}
                              />
                            </InputGroup>
                          </Form.Group>
                        </Col>

                        <Col md={3}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              As of Date
                            </Form.Label>
                            <Form.Control
                              ref={asOfDateRef}
                              type="date"
                              name="asOfDate"
                              value={
                                formData.asOfDate ||
                                new Date().toISOString().split("T")[0]
                              }
                              onChange={onInputChange}
                              className="form-input"
                              tabIndex={0}
                              disabled={isLoading}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={3}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Minimum Stock to Maintain
                            </Form.Label>
                            <Form.Control
                              ref={minStockToMaintainRef}
                              type="number"
                              name="minStockToMaintain"
                              value={formData.minStockToMaintain || ""}
                              onChange={onInputChange}
                              placeholder="0"
                              min="0"
                              step="1"
                              className="form-input"
                              tabIndex={0}
                              disabled={isLoading}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              )}

              {/* Pricing Section */}
              <Row className="mb-4">
                <Col md={12}>
                  <div className="bg-light p-3 rounded border">
                    <h6 className="fw-bold text-primary mb-3">💰 Pricing</h6>
                    <Row>
                      {/* For Products - Show both Buy and Sale Price */}
                      {formData.type !== "service" && (
                        <>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold">
                                Buy Price
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>₹</InputGroup.Text>
                                <Form.Control
                                  ref={buyPriceRef}
                                  type="number"
                                  name="buyPrice"
                                  value={formData.buyPrice || ""}
                                  onChange={onInputChange}
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  className="form-input"
                                  tabIndex={0}
                                  disabled={isLoading}
                                />
                              </InputGroup>
                              <div className="d-flex align-items-center mt-2">
                                <Form.Check
                                  ref={buyTaxToggleRef}
                                  type="checkbox"
                                  id="buyPriceTaxInclusive"
                                  checked={buyPriceTaxInclusive}
                                  onChange={(e) =>
                                    setBuyPriceTaxInclusive(e.target.checked)
                                  }
                                  className="me-2"
                                  tabIndex={0}
                                  disabled={isLoading}
                                />
                                <Form.Label
                                  htmlFor="buyPriceTaxInclusive"
                                  className="mb-0 text-muted small"
                                >
                                  With Tax
                                </Form.Label>
                              </div>
                              <div className="d-flex align-items-center">
                                <Form.Check
                                  type="checkbox"
                                  id="buyPriceWithoutTax"
                                  checked={!buyPriceTaxInclusive}
                                  onChange={(e) =>
                                    setBuyPriceTaxInclusive(!e.target.checked)
                                  }
                                  className="me-2"
                                  tabIndex={0}
                                  disabled={isLoading}
                                />
                                <Form.Label
                                  htmlFor="buyPriceWithoutTax"
                                  className="mb-0 text-muted small"
                                >
                                  Without Tax
                                </Form.Label>
                              </div>
                              {buyPriceTaxInclusive &&
                                formData.buyPrice &&
                                formData.gstRate > 0 && (
                                  <Form.Text className="text-muted">
                                    Price without tax: ₹
                                    {calculatePriceWithTax(
                                      formData.buyPrice,
                                      formData.gstRate,
                                      true
                                    )}
                                  </Form.Text>
                                )}
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold">
                                Sale Price
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>₹</InputGroup.Text>
                                <Form.Control
                                  ref={salePriceRef}
                                  type="number"
                                  name="salePrice"
                                  value={formData.salePrice || ""}
                                  onChange={onInputChange}
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  className="form-input"
                                  tabIndex={0}
                                  disabled={isLoading}
                                />
                              </InputGroup>
                              <div className="d-flex align-items-center mt-2">
                                <Form.Check
                                  ref={saleTaxToggleRef}
                                  type="checkbox"
                                  id="salePriceTaxInclusive"
                                  checked={salePriceTaxInclusive}
                                  onChange={(e) =>
                                    setSalePriceTaxInclusive(e.target.checked)
                                  }
                                  className="me-2"
                                  tabIndex={0}
                                  disabled={isLoading}
                                />
                                <Form.Label
                                  htmlFor="salePriceTaxInclusive"
                                  className="mb-0 text-muted small"
                                >
                                  With Tax
                                </Form.Label>
                              </div>
                              <div className="d-flex align-items-center">
                                <Form.Check
                                  type="checkbox"
                                  id="salePriceWithoutTax"
                                  checked={!salePriceTaxInclusive}
                                  onChange={(e) =>
                                    setSalePriceTaxInclusive(!e.target.checked)
                                  }
                                  className="me-2"
                                  tabIndex={0}
                                  disabled={isLoading}
                                />
                                <Form.Label
                                  htmlFor="salePriceWithoutTax"
                                  className="mb-0 text-muted small"
                                >
                                  Without Tax
                                </Form.Label>
                              </div>
                              {salePriceTaxInclusive &&
                                formData.salePrice &&
                                formData.gstRate > 0 && (
                                  <Form.Text className="text-muted">
                                    Price without tax: ₹
                                    {calculatePriceWithTax(
                                      formData.salePrice,
                                      formData.gstRate,
                                      true
                                    )}
                                  </Form.Text>
                                )}
                            </Form.Group>
                          </Col>
                        </>
                      )}

                      {/* For Services - Show only Service Rate */}
                      {formData.type === "service" && (
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              Service Rate
                            </Form.Label>
                            <InputGroup>
                              <InputGroup.Text>₹</InputGroup.Text>
                              <Form.Control
                                ref={salePriceRef}
                                type="number"
                                name="salePrice"
                                value={formData.salePrice || ""}
                                onChange={onInputChange}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="form-input"
                                tabIndex={0}
                                disabled={isLoading}
                              />
                              <InputGroup.Text>/hr</InputGroup.Text>
                            </InputGroup>
                            <div className="d-flex align-items-center mt-2">
                              <Form.Check
                                ref={saleTaxToggleRef}
                                type="checkbox"
                                id="serviceRateTaxInclusive"
                                checked={salePriceTaxInclusive}
                                onChange={(e) =>
                                  setSalePriceTaxInclusive(e.target.checked)
                                }
                                className="me-2"
                                tabIndex={0}
                                disabled={isLoading}
                              />
                              <Form.Label
                                htmlFor="serviceRateTaxInclusive"
                                className="mb-0 text-muted small"
                              >
                                Tax inclusive
                              </Form.Label>
                            </div>
                            {salePriceTaxInclusive &&
                              formData.salePrice &&
                              formData.gstRate > 0 && (
                                <Form.Text className="text-muted">
                                  Rate without tax: ₹
                                  {calculatePriceWithTax(
                                    formData.salePrice,
                                    formData.gstRate,
                                    true
                                  )}
                                  /hr
                                </Form.Text>
                              )}
                          </Form.Group>
                        </Col>
                      )}
                    </Row>
                  </div>
                </Col>
              </Row>

              {/* Enhanced Action Buttons */}
              <div className="action-buttons mt-4 pt-3 border-top d-flex justify-content-end gap-2">
                <Button
                  ref={cancelButtonRef}
                  variant="outline-secondary"
                  onClick={handleModalHide}
                  className="cancel-btn"
                  type="button"
                  tabIndex={0}
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faTimes} className="me-2" />
                  Cancel
                </Button>

                {/* Save & New Button - Only show for add mode */}
                {mode === "add" && (
                  <Button
                    ref={saveAndAddButtonRef}
                    variant="outline-success"
                    onClick={handleSaveAndAddAnother}
                    className="save-and-new-btn"
                    type="button"
                    tabIndex={0}
                    disabled={isLoading}
                    style={{whiteSpace: "nowrap"}}
                  >
                    {isLoading && isSaveAndAdd ? (
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                    ) : (
                      <FontAwesomeIcon icon={faPlus} className="me-2" />
                    )}
                    Save & New
                  </Button>
                )}

                <Button
                  ref={saveButtonRef}
                  variant="primary"
                  type="submit"
                  className="save-and-exit-btn"
                  tabIndex={0}
                  disabled={isLoading}
                  style={{whiteSpace: "nowrap"}}
                >
                  {isLoading && !isSaveAndAdd ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                  ) : (
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                  )}
                  {mode === "edit" ? "Update" : "Save"} & Exit
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </div>
      </Modal>

      {/* Enhanced Product Search Modal - Only show in add mode */}
      {mode === "add" && (
        <ProductSearchModal
          show={showProductSearch}
          onHide={() => setShowProductSearch(false)}
          products={searchProducts}
          onProductSelect={handleProductSelection}
          isLoading={isSearching}
          companyName={currentCompany?.companyName}
        />
      )}
    </>
  );
}

export default ProductModal;
