import React, {useState, useEffect, useContext, useCallback} from "react";
import {Container, Row, Col, Button, Alert, Spinner} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faExclamationTriangle,
  faSync,
} from "@fortawesome/free-solid-svg-icons";

import itemService from "../../services/itemService";

import InventoryHeader from "./Inventory/InventoryHeader";
import InventorySidebar from "./Inventory/InventorySidebar";
import ItemInfoSection from "./Inventory/ItemInfoSection";
import TransactionHistory from "./Inventory/TransactionHistory";
import ProductModal from "./Inventory/ProductModal";
import StockAdjustmentModal from "./Inventory/StockAdjustmentModal";
import CategoryModal from "./Inventory/CategoryModal";
import BulkImportModal from "./Inventory/BulkImportModal";
import SalesForm from "./Sales/SalesInvoice/SalesForm";
import PurchaseForm from "./Purchases/PurchaseForm";

function Inventory({view = "allProducts", onNavigate, currentCompany}) {
  const [currentView, setCurrentView] = useState("inventory");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeType, setActiveType] = useState("products");
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState("add");
  const [selectedProductForStock, setSelectedProductForStock] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    itemCode: "",
    hsnNumber: "",
    category: "",
    description: "",
    buyPrice: 0,
    salePrice: 0,
    atPrice: 0,
    gstRate: 18,
    unit: "PCS",
    type: "product",
    minStockLevel: 0,
    minStockToMaintain: 0,
    currentStock: 0,
    openingStock: 0,
    openingQuantity: 0,
    asOfDate: new Date().toISOString().split("T")[0],
    isBuyPriceTaxInclusive: false,
    isSalePriceTaxInclusive: false,
    buyPriceWithTax: 0,
    buyPriceWithoutTax: 0,
    salePriceWithTax: 0,
    salePriceWithoutTax: 0,
    isActive: true,
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const loadItems = async (searchQuery = "", page = 1, limit = 50) => {
    if (!currentCompany?.id) {
      return;
    }

    try {
      setIsLoadingItems(true);
      setError(null);

      const params = {
        page,
        limit,
        search: searchQuery,
        type: activeType === "products" ? "product" : "service",
        isActive: true,
        sortBy: "name",
        sortOrder: "asc",
      };

      const response = await itemService.getItems(currentCompany.id, params);

      if (response && response.success) {
        const items =
          response.data?.items || response.data?.data || response.data || [];

        const normalizedItems = items.map((item) => {
          const normalized = {
            ...item,
            id: item.id || item._id,
            _id: item._id || item.id,
            currentStock: Number(
              item.currentStock ||
                item.openingStock ||
                item.openingQuantity ||
                item.stock ||
                item.quantity ||
                0
            ),
            openingStock: Number(
              item.openingStock ||
                item.currentStock ||
                item.openingQuantity ||
                item.stock ||
                item.quantity ||
                0
            ),
            openingQuantity: Number(
              item.openingQuantity ||
                item.currentStock ||
                item.openingStock ||
                item.stock ||
                item.quantity ||
                0
            ),
            salePrice: Number(
              item.salePrice ||
                item.salePriceWithoutTax ||
                item.salePriceWithTax ||
                0
            ),
            buyPrice: Number(
              item.buyPrice ||
                item.buyPriceWithoutTax ||
                item.buyPriceWithTax ||
                0
            ),
            atPrice: Number(item.atPrice || 0),
            gstRate: Number(item.gstRate || 18),
            salePriceWithTax: Number(item.salePriceWithTax || 0),
            salePriceWithoutTax: Number(item.salePriceWithoutTax || 0),
            buyPriceWithTax: Number(item.buyPriceWithTax || 0),
            buyPriceWithoutTax: Number(item.buyPriceWithoutTax || 0),
            isBuyPriceTaxInclusive: item.isBuyPriceTaxInclusive || false,
            isSalePriceTaxInclusive: item.isSalePriceTaxInclusive || false,
            unit: item.unit || "PCS",
            minStockLevel: Number(
              item.minStockLevel || item.minStockToMaintain || 0
            ),
            minStockToMaintain: Number(
              item.minStockToMaintain || item.minStockLevel || 0
            ),
            isActive: item.isActive !== undefined ? item.isActive : true,
            name: item.name || "",
            itemCode: item.itemCode || "",
            category: item.category || "",
            type: item.type || "product",
          };

          return normalized;
        });

        setProducts(normalizedItems);
        setPagination(response.data?.pagination || {});

        if (selectedItem) {
          const selectedItemId = selectedItem.id || selectedItem._id;
          const updatedSelectedItem = normalizedItems.find(
            (item) => item.id === selectedItemId || item._id === selectedItemId
          );

          if (updatedSelectedItem) {
            setSelectedItem(updatedSelectedItem);
          } else {
            setSelectedItem(null);
          }
        } else if (normalizedItems.length > 0) {
          setSelectedItem(normalizedItems[0]);
        }
      } else {
        throw new Error(response?.message || "Invalid response from server");
      }
    } catch (error) {
      setError(`Failed to load items: ${error.message}`);
      setProducts([]);
      setSelectedItem(null);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const loadCategories = async () => {
    if (!currentCompany?.id) {
      return;
    }

    try {
      setIsLoadingCategories(true);

      const response = await itemService.getCategories(currentCompany.id);

      if (response.success) {
        const categoriesFromAPI = response.data.categories || [];

        const formattedCategories = categoriesFromAPI.map(
          (categoryName, index) => ({
            id: index + 1,
            name: categoryName,
            description: `${categoryName} category`,
            isActive: true,
          })
        );

        if (formattedCategories.length === 0) {
          const defaultCategories = [
            {
              id: 1,
              name: "Electronics",
              description: "Electronic items and gadgets",
              isActive: true,
            },
            {
              id: 2,
              name: "Furniture",
              description: "Office and home furniture",
              isActive: true,
            },
            {
              id: 3,
              name: "Stationery",
              description: "Office stationery items",
              isActive: true,
            },
            {
              id: 4,
              name: "Services",
              description: "Service-based offerings",
              isActive: true,
            },
          ];
          setCategories(defaultCategories);
        } else {
          setCategories(formattedCategories);
        }
      } else {
        throw new Error(response.message || "Failed to load categories");
      }
    } catch (error) {
      const defaultCategories = [
        {
          id: 1,
          name: "Electronics",
          description: "Electronic items and gadgets",
          isActive: true,
        },
        {
          id: 2,
          name: "Furniture",
          description: "Office and home furniture",
          isActive: true,
        },
        {
          id: 3,
          name: "Stationery",
          description: "Office stationery items",
          isActive: true,
        },
        {
          id: 4,
          name: "Services",
          description: "Service-based offerings",
          isActive: true,
        },
      ];
      setCategories(defaultCategories);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (currentCompany?.id) {
      loadItems();
      loadCategories();
    } else {
      setProducts([]);
      setCategories([]);
      setSelectedItem(null);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    if (currentCompany?.id) {
      loadItems(sidebarSearchQuery);
    }
  }, [activeType]);

  useEffect(() => {
    if (currentCompany?.id) {
      const debounceTimer = setTimeout(() => {
        loadItems(sidebarSearchQuery);
      }, 300);

      return () => clearTimeout(debounceTimer);
    }
  }, [sidebarSearchQuery]);

  useEffect(() => {
    const sampleTransactions = [
      {
        id: 1,
        type: "Sale",
        invoiceNumber: "1",
        itemId: selectedItem?.id || selectedItem?._id,
        customerName: "IT Solution",
        date: "03/06/2025",
        quantity: 1,
        pricePerUnit: 100000,
        status: "Unpaid",
      },
      {
        id: 2,
        type: "Purchase",
        invoiceNumber: "",
        itemId: selectedItem?.id || selectedItem?._id,
        customerName: "IT Solution",
        date: "03/06/2025",
        quantity: 1,
        pricePerUnit: 11111,
        status: "Paid",
      },
    ];
    setTransactions(sampleTransactions);
  }, [selectedItem]);

  const filteredItems = products.filter((product) => {
    const typeMatch =
      activeType === "products"
        ? product.type === "product"
        : product.type === "service";
    return typeMatch;
  });

  const handleTypeChange = (type) => {
    setActiveType(type);
    setSidebarSearchQuery("");
    setSelectedItem(null);
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
  };

  const handleAddSale = () => {
    setCurrentView("sale");
  };

  const handleAddPurchase = () => {
    setCurrentView("purchase");
  };

  const handleBackToInventory = () => {
    setCurrentView("inventory");
  };

  const handleSaleFormSave = (saleData) => {
    const newTransaction = {
      id: Date.now(),
      type: "Sale",
      invoiceNumber: saleData.invoiceNumber,
      itemId: selectedItem?.id || selectedItem?._id,
      customerName: saleData.customer?.name || "Customer",
      date: new Date().toLocaleDateString("en-GB"),
      quantity:
        saleData.items?.reduce((total, item) => total + item.quantity, 0) || 1,
      pricePerUnit: saleData.totals?.finalTotal || 0,
      status: saleData.paymentStatus || "Unpaid",
    };

    setTransactions((prev) => [...prev, newTransaction]);

    if (saleData.items) {
      saleData.items.forEach((item) => {
        setProducts((prev) =>
          prev.map((product) =>
            product.id === item.productId || product._id === item.productId
              ? {
                  ...product,
                  currentStock: Math.max(
                    0,
                    product.currentStock - item.quantity
                  ),
                }
              : product
          )
        );
      });
    }

    setCurrentView("inventory");
    alert(`Sale ${saleData.invoiceNumber} saved successfully!`);
  };

  const handlePurchaseFormSave = (purchaseData) => {
    const newTransaction = {
      id: Date.now(),
      type: "Purchase",
      invoiceNumber: purchaseData.purchaseNumber,
      itemId: selectedItem?.id || selectedItem?._id,
      customerName: purchaseData.supplier?.name || "Supplier",
      date: new Date().toLocaleDateString("en-GB"),
      quantity:
        purchaseData.items?.reduce((total, item) => total + item.quantity, 0) ||
        1,
      pricePerUnit: purchaseData.totals?.finalTotal || 0,
      status: purchaseData.paymentStatus || "Paid",
    };

    setTransactions((prev) => [...prev, newTransaction]);

    if (purchaseData.items) {
      purchaseData.items.forEach((item) => {
        setProducts((prev) =>
          prev.map((product) =>
            product.id === item.productId || product._id === item.productId
              ? {...product, currentStock: product.currentStock + item.quantity}
              : product
          )
        );
      });
    }

    setCurrentView("inventory");
    alert(`Purchase ${purchaseData.purchaseNumber} saved successfully!`);
  };

  const handleAddCategory = async (categoryData) => {
    const newCategory = {
      id: Date.now(),
      name: categoryData.name,
      description: categoryData.description,
      isActive: categoryData.isActive,
    };

    setCategories((prev) => [...prev, newCategory]);
  };

  const handleAddItem = (itemType) => {
    if (!currentCompany?.id) {
      alert("Please select a company first");
      return;
    }

    setEditingItem(null);
    setModalType("add");
    setEditingProduct(null);
    setFormData({
      name: "",
      itemCode: "",
      hsnNumber: "",
      category: "",
      description: "",
      buyPrice: 0,
      salePrice: 0,
      atPrice: 0,
      gstRate: 18,
      unit: "PCS",
      type: itemType,
      minStockLevel: 0,
      minStockToMaintain: 0,
      currentStock: 0,
      openingStock: 0,
      openingQuantity: 0,
      asOfDate: new Date().toISOString().split("T")[0],
      isBuyPriceTaxInclusive: false,
      isSalePriceTaxInclusive: false,
      buyPriceWithTax: 0,
      buyPriceWithoutTax: 0,
      salePriceWithTax: 0,
      salePriceWithoutTax: 0,
      isActive: true,
    });
    setShowProductModal(true);
  };

  const handleEditItem = useCallback((item) => {
    setEditingItem(item);
    setModalType("edit");

    const prePopulatedFormData = {
      name: item.name || "",
      itemCode: item.itemCode || "",
      hsnNumber: item.hsnNumber || "",
      category: item.category || "",
      description: item.description || "",
      buyPrice: Number(item.buyPrice) || Number(item.buyPriceWithoutTax) || 0,
      salePrice:
        Number(item.salePrice) || Number(item.salePriceWithoutTax) || 0,
      atPrice: Number(item.atPrice) || 0,
      gstRate: Number(item.gstRate) || 18,
      unit: item.unit || "PCS",
      type: item.type || "product",
      minStockLevel:
        Number(item.minStockLevel) || Number(item.minStockToMaintain) || 0,
      minStockToMaintain:
        Number(item.minStockToMaintain) || Number(item.minStockLevel) || 0,
      currentStock:
        Number(item.currentStock) ||
        Number(item.openingStock) ||
        Number(item.openingQuantity) ||
        0,
      openingStock:
        Number(item.openingStock) ||
        Number(item.currentStock) ||
        Number(item.openingQuantity) ||
        0,
      openingQuantity:
        Number(item.openingQuantity) ||
        Number(item.openingStock) ||
        Number(item.currentStock) ||
        0,
      asOfDate: item.asOfDate
        ? item.asOfDate.split("T")[0]
        : new Date().toISOString().split("T")[0],
      isBuyPriceTaxInclusive: Boolean(item.isBuyPriceTaxInclusive),
      isSalePriceTaxInclusive: Boolean(item.isSalePriceTaxInclusive),
      buyPriceWithTax: Number(item.buyPriceWithTax) || 0,
      buyPriceWithoutTax: Number(item.buyPriceWithoutTax) || 0,
      salePriceWithTax: Number(item.salePriceWithTax) || 0,
      salePriceWithoutTax: Number(item.salePriceWithoutTax) || 0,
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
    };

    setFormData(prePopulatedFormData);
    setShowProductModal(true);
  }, []);

  const handleAdjustStock = (item) => {
    if (item.type === "service") {
      alert("Stock adjustment is not applicable for services");
      return;
    }

    setSelectedProductForStock(item);
    setShowStockModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setShowProductModal(false);
    setEditingProduct(null);
    setEditingItem(null);
    setModalType("add");
  };

  const handleInputChange = useCallback((e) => {
    const {name, value, type, checked} = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleCategoryInputChange = useCallback((e) => {
    const {name, value, type, checked} = e.target;
    setCategoryFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleSaveProduct = async (productData, isSaveAndAdd = false) => {
    if (!currentCompany?.id) {
      alert("Please select a company first");
      return false;
    }

    try {
      setIsLoading(true);

      const response = await itemService.createItem(
        currentCompany.id,
        productData
      );

      if (response && response.success) {
        await loadItems(sidebarSearchQuery);

        if (!isSaveAndAdd) {
          handleCloseModal();
        }

        return true;
      } else {
        throw new Error(response?.message || "Failed to create item");
      }
    } catch (error) {
      alert(`Failed to create item: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async (updatedItemData) => {
    if (!currentCompany?.id) {
      alert("No company selected");
      return false;
    }

    if (!editingItem?.id && !editingItem?._id) {
      alert("Cannot update item: Invalid item data");
      return false;
    }

    try {
      setIsLoading(true);

      const itemIdToUpdate = editingItem._id || editingItem.id;
      const response = await itemService.updateItem(
        currentCompany.id,
        itemIdToUpdate,
        updatedItemData
      );

      if (response && response.success) {
        await loadItems(sidebarSearchQuery);

        setShowProductModal(false);
        setEditingItem(null);
        setModalType("add");

        alert(
          `${
            updatedItemData.name || editingItem.name
          } has been updated successfully!`
        );

        return true;
      } else {
        const errorMessage =
          response?.message || "Failed to update item - no success flag";
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || "Unknown error occurred";
      alert(`Failed to update "${editingItem.name}": ${errorMessage}`);

      try {
        await loadItems(sidebarSearchQuery);
      } catch (reloadError) {
        // Handle reload error silently
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!currentCompany?.id) {
      alert("No company selected");
      return false;
    }

    if (!item?.id && !item?._id) {
      alert("Cannot delete item: Invalid item data");
      return false;
    }

    try {
      setIsLoading(true);

      const itemIdToDelete = item._id || item.id;
      const response = await itemService.deleteItem(
        currentCompany.id,
        itemIdToDelete
      );

      if (response.success) {
        await loadItems(sidebarSearchQuery);
        alert(`${item.name} has been deleted successfully!`);
        return true;
      } else {
        throw new Error(response.message || "Failed to delete item");
      }
    } catch (error) {
      const errorMessage = error.message || "Unknown error occurred";
      alert(`Failed to delete "${item.name}": ${errorMessage}`);

      try {
        await loadItems(sidebarSearchQuery);
      } catch (reloadError) {
        // Handle reload error silently
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    const newCategory = {
      ...categoryFormData,
      id: Date.now(),
    };
    setCategories([...categories, newCategory]);
    setCategoryFormData({name: "", description: "", isActive: true});
    setShowCategoryModal(false);
  };

  const handleUpdateStock = async (productId, adjustmentData) => {
    if (!currentCompany?.id) {
      alert("Please select a company first");
      return false;
    }
    try {
      setIsLoading(true);

      const response = await itemService.adjustStock(
        currentCompany.id,
        productId,
        adjustmentData
      );

      if (response && response.success) {
        await loadItems(sidebarSearchQuery);

        setShowStockModal(false);
        setSelectedProductForStock(null);

        alert(
          `Stock adjusted successfully! New quantity: ${
            response.data.newStock || adjustmentData.newStock
          }`
        );

        return true;
      } else {
        throw new Error(response?.message || "Failed to adjust stock");
      }
    } catch (error) {
      alert(`Failed to adjust stock: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoreOptions = () => {
    // Add your logic here
  };

  const handleSettings = () => {
    // Add your logic here
  };

  const handleRefresh = () => {
    if (currentCompany?.id) {
      loadItems(sidebarSearchQuery);
      loadCategories();
    }
  };

  if (!currentCompany?.id) {
    return (
      <div className="d-flex flex-column vh-100">
        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              size="3x"
              className="text-warning mb-3"
            />
            <h4 className="text-muted">No Company Selected</h4>
            <p className="text-muted">
              Please select a company from the header to manage inventory.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === "sale") {
    return (
      <div className="d-flex flex-column vh-100">
        <div className="sales-form-header bg-white border-bottom">
          <Container fluid className="px-4">
            <Row className="align-items-center py-3">
              <Col>
                <Button
                  variant="outline-secondary"
                  onClick={handleBackToInventory}
                  className="me-3"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                  Back to Inventory
                </Button>
                <span className="page-title-text fw-bold">Create New Sale</span>
                <small className="text-muted ms-2">
                  for {currentCompany.companyName}
                </small>
              </Col>
            </Row>
          </Container>
        </div>

        <SalesForm
          onSave={handleSaleFormSave}
          onCancel={handleBackToInventory}
          currentCompany={currentCompany}
        />
      </div>
    );
  }

  if (currentView === "purchase") {
    return (
      <div className="d-flex flex-column vh-100">
        <div className="sales-form-header bg-white border-bottom">
          <Container fluid className="px-4">
            <Row className="align-items-center py-3">
              <Col>
                <Button
                  variant="outline-secondary"
                  onClick={handleBackToInventory}
                  className="me-3"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                  Back to Inventory
                </Button>
                <span className="page-title-text fw-bold">
                  Create New Purchase
                </span>
                <small className="text-muted ms-2">
                  for {currentCompany.companyName}
                </small>
              </Col>
            </Row>
          </Container>
        </div>

        <PurchaseForm
          onSave={handlePurchaseFormSave}
          onCancel={handleBackToInventory}
          currentCompany={currentCompany}
        />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column vh-100">
      {error && (
        <Alert
          variant="danger"
          className="m-3 mb-0"
          dismissible
          onClose={() => setError(null)}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
          <Button variant="link" className="ms-2 p-0" onClick={handleRefresh}>
            <FontAwesomeIcon icon={faSync} className="me-1" />
            Retry
          </Button>
        </Alert>
      )}

      <InventoryHeader
        activeType={activeType}
        onTypeChange={handleTypeChange}
        transactionSearchQuery={transactionSearchQuery}
        onTransactionSearchChange={setTransactionSearchQuery}
        onAddSale={handleAddSale}
        onAddPurchase={handleAddPurchase}
        onBulkImport={() => setShowBulkImportModal(true)}
        onMoreOptions={handleMoreOptions}
        onSettings={handleSettings}
        onRefresh={handleRefresh}
        currentCompany={currentCompany}
        totalItems={pagination.totalItems}
        isLoading={isLoadingItems}
      />

      <div className="flex-grow-1 overflow-hidden">
        <Container fluid className="h-100 p-0">
          <Row className="h-100 g-0">
            <Col md={4} lg={3}>
              <InventorySidebar
                items={filteredItems}
                selectedItem={selectedItem}
                onItemSelect={handleItemSelect}
                onAddItem={handleAddItem}
                onAddCategory={handleAddCategory}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                searchQuery={sidebarSearchQuery}
                onSearchChange={setSidebarSearchQuery}
                activeType={activeType}
                isLoading={isLoadingItems}
                pagination={pagination}
                onLoadMore={() =>
                  loadItems(sidebarSearchQuery, pagination.current + 1)
                }
                currentCompany={currentCompany}
              />
            </Col>

            <Col md={8} lg={9}>
              <div className="h-100 d-flex flex-column">
                <div className="flex-shrink-0 p-3">
                  <ItemInfoSection
                    selectedItem={selectedItem}
                    onEditItem={handleEditItem}
                    onAdjustStock={handleAdjustStock}
                    currentCompany={currentCompany}
                    isLoading={isLoadingItems && !selectedItem}
                  />
                </div>

                <div className="flex-grow-1 px-3 pb-3">
                  <TransactionHistory
                    transactions={transactions}
                    selectedItem={selectedItem}
                    searchQuery={transactionSearchQuery}
                    onSearchChange={setTransactionSearchQuery}
                    currentCompany={currentCompany}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <ProductModal
        show={showProductModal}
        onHide={handleCloseModal}
        editingProduct={modalType === "edit" ? editingItem : null}
        formData={formData}
        categories={categories}
        onInputChange={handleInputChange}
        onSaveProduct={
          modalType === "edit" ? handleUpdateItem : handleSaveProduct
        }
        currentCompany={currentCompany}
        mode={modalType}
        type={modalType === "edit" ? editingItem?.type : formData.type}
      />

      <StockAdjustmentModal
        show={showStockModal}
        onHide={() => setShowStockModal(false)}
        product={selectedProductForStock}
        onUpdateStock={handleUpdateStock}
        currentCompany={currentCompany}
      />

      <CategoryModal
        show={showCategoryModal}
        onHide={() => setShowCategoryModal(false)}
        categoryFormData={categoryFormData}
        onCategoryInputChange={handleCategoryInputChange}
        onSaveCategory={handleSaveCategory}
        currentCompany={currentCompany}
      />

      <BulkImportModal
        show={showBulkImportModal}
        onHide={() => setShowBulkImportModal(false)}
        categories={categories}
        onProductsImported={(importedProducts) => {
          loadItems(sidebarSearchQuery);
        }}
        currentCompany={currentCompany}
      />
    </div>
  );
}

export default Inventory;
