import React, {useState} from "react";
import {
  Button,
  Form,
  Badge,
  Dropdown,
  Row,
  Col,
  ListGroup,
  InputGroup,
  Modal,
  Spinner,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faFilter,
  faEllipsisV,
  faBox,
  faCog,
  faFolder,
  faTimes,
  faEdit,
  faTrash,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

function InventorySidebar({
  items = [],
  selectedItem,
  onItemSelect,
  onAddItem,
  onAddCategory,
  onEditItem,
  onDeleteItem,
  searchQuery,
  onSearchChange,
  activeType = "products",
  isLoading,
  pagination,
  onLoadMore,
  currentCompany,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  // Filter items with proper null checks
  const filteredItems = items.filter((item) => {
    if (!item || !item.name) return false;

    const searchMatch =
      item.name.toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      (item.itemCode &&
        item.itemCode
          .toLowerCase()
          .includes((searchQuery || "").toLowerCase()));
    return searchMatch;
  });

  const handleItemClick = (item) => {
    if (item && onItemSelect) {
      onItemSelect(item);
    }
  };

  // Three-dot menu handlers
  const handleEditItem = (item, e) => {
    e.stopPropagation();
    console.log("🔧 InventorySidebar: Edit item clicked:", item);
    if (item && onEditItem) {
      onEditItem(item);
    }
  };

  const handleDeleteClick = (item, e) => {
    e.stopPropagation();
    if (item) {
      console.log("🗑️ InventorySidebar: Delete clicked for item:", item);
      setItemToDelete(item);
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !onDeleteItem) {
      return;
    }

    try {
      setIsDeleting(true);
      console.log(
        "🗑️ InventorySidebar: Confirming delete for item:",
        itemToDelete
      );

      const success = await onDeleteItem(itemToDelete);

      if (success) {
        console.log("✅ InventorySidebar: Item deleted successfully");
      } else {
        console.error("❌ InventorySidebar: Delete operation failed");
      }
    } catch (error) {
      console.error("❌ InventorySidebar: Error deleting item:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;

    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  // Category form handlers
  const handleAddCategoryClick = () => {
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryFormData({
      name: "",
      description: "",
      isActive: true,
    });
  };

  const handleCategoryInputChange = (e) => {
    const {name, value, type, checked} = e.target;
    setCategoryFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();

    if (!categoryFormData.name.trim()) {
      alert("Please enter a category name");
      return;
    }

    const newCategory = {
      ...categoryFormData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };

    if (onAddCategory) {
      onAddCategory(newCategory);
    }
    handleCloseCategoryModal();
    alert(`Category "${categoryFormData.name}" created successfully!`);
  };

  // Get current stock - check multiple possible field names with null safety
  const getCurrentStock = (item) => {
    if (!item) return 0;

    return (
      item.currentStock ||
      item.openingStock ||
      item.stock ||
      item.quantity ||
      item.openingQuantity ||
      0
    );
  };

  const getQuantityDisplay = (item) => {
    if (!item || item.type === "service") return "-";
    return getCurrentStock(item);
  };

  const getQuantityColor = (item) => {
    if (!item || item.type === "service") return "text-muted";
    const stock = getCurrentStock(item);
    if (stock === 0) return "text-danger";
    if (stock <= (item.minStockLevel || item.minStockToMaintain || 0))
      return "text-warning";
    return "text-success";
  };

  const getStockBadge = (item) => {
    if (!item || item.type === "service") return null;

    const stock = getCurrentStock(item);

    if (stock === 0) {
      return (
        <Badge bg="danger" className="small" style={{borderRadius: "0"}}>
          Out
        </Badge>
      );
    }

    if (
      stock > 0 &&
      stock <= (item.minStockLevel || item.minStockToMaintain || 0)
    ) {
      return (
        <Badge bg="warning" className="small" style={{borderRadius: "0"}}>
          Low
        </Badge>
      );
    }

    return null;
  };

  return (
    <>
      <div
        className="inventory-sidebar h-100 bg-light border-end"
        style={{marginTop: "8px"}}
      >
        {/* Header Section */}
        <div
          className="sidebar-header p-3 bg-white border-bottom"
          style={{borderRadius: "0"}}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0 fw-bold text-dark small mt-3 ms-1">
              {activeType === "products" ? "Products" : "Services"}
              {pagination?.totalItems && (
                <span className="text-muted ms-1">
                  ({pagination.totalItems})
                </span>
              )}
            </h6>
            <div className="d-flex gap-2 mt-3 me-1">
              <Dropdown>
                <Dropdown.Toggle
                  size="sm"
                  className="btn-add-item fw-semibold text-white border-0"
                  disabled={!currentCompany?.id}
                  style={{
                    background: "#7c3aed",
                    borderRadius: "0",
                    fontSize: "12px",
                    padding: "0.4rem 0.8rem",
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
                  <span className="small">Add Item</span>
                </Dropdown.Toggle>
                <Dropdown.Menu style={{borderRadius: "0"}}>
                  <Dropdown.Item
                    onClick={() => onAddItem && onAddItem("product")}
                    disabled={!currentCompany?.id}
                  >
                    Add Product
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => onAddItem && onAddItem("service")}
                    disabled={!currentCompany?.id}
                  >
                    Add Service
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Button
                size="sm"
                variant="outline-secondary"
                className="btn-add-category fw-semibold"
                onClick={handleAddCategoryClick}
                title="Add Category"
                disabled={!currentCompany?.id}
                style={{
                  borderRadius: "0",
                  fontSize: "12px",
                  padding: "0.4rem 0.8rem",
                  color: "#6c757d",
                  borderColor: "#6c757d",
                }}
              >
                <FontAwesomeIcon icon={faFolder} className="me-1" size="xs" />
                <span className="small">Add Category</span>
              </Button>
            </div>
          </div>

          {/* Search Input */}
          <InputGroup size="sm">
            <InputGroup.Text
              className="bg-light border-end-0 text-muted"
              style={{borderRadius: "0"}}
            >
              <FontAwesomeIcon icon={faSearch} size="xs" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={`Search ${activeType}...`}
              value={searchQuery || ""}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="border-start-0 bg-light text-dark"
              style={{
                fontSize: "13px",
                borderRadius: "0",
              }}
              disabled={isLoading}
            />
          </InputGroup>
        </div>

        {/* Items List */}
        <div
          className="items-list p-2"
          style={{maxHeight: "calc(100vh - 140px)", overflowY: "auto"}}
        >
          {isLoading && filteredItems.length === 0 ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" className="mb-2" />
              <div className="text-muted small">Loading {activeType}...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-4">
              <div className="mb-2" style={{fontSize: "1.5rem", opacity: 0.5}}>
                📦
              </div>
              <div className="text-muted small fw-medium">
                No {activeType} found
              </div>
              <small className="text-muted" style={{fontSize: "12px"}}>
                {searchQuery
                  ? "Try different search terms"
                  : "Click Add Item to create one"}
              </small>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {filteredItems.map((item, index) => {
                if (!item || !item.name) {
                  console.warn(`Invalid item at index ${index}:`, item);
                  return null;
                }

                const isSelected =
                  selectedItem?.id === item.id ||
                  selectedItem?._id === item._id;

                return (
                  <div
                    key={item.id || item._id || index}
                    className={`list-group-item border-0 mb-2 item-card ${
                      isSelected ? "selected-item" : "bg-white border"
                    }`}
                    style={{
                      padding: "0.75rem",
                      transition: "all 0.2s ease",
                      position: "relative",
                      borderRadius: "0",
                      backgroundColor: isSelected ? "#f8f5ff" : "#ffffff",
                      borderColor: isSelected ? "#7c3aed" : "#dee2e6",
                    }}
                  >
                    {/* Main clickable area */}
                    <div
                      onClick={() => handleItemClick(item)}
                      style={{cursor: "pointer"}}
                      className="d-flex justify-content-between align-items-start"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-1">
                          <FontAwesomeIcon
                            icon={item.type === "service" ? faCog : faBox}
                            className={`me-2 ${
                              isSelected ? "text-primary" : "text-muted"
                            }`}
                            size="sm"
                            style={{color: isSelected ? "#7c3aed" : "#6c757d"}}
                          />
                          <span
                            className={`fw-semibold small ${
                              isSelected ? "text-primary" : "text-dark"
                            }`}
                            style={{
                              color: isSelected ? "#7c3aed" : "#495057",
                              fontSize: "13px",
                            }}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div
                          className={`${
                            isSelected ? "text-primary" : "text-muted"
                          }`}
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: isSelected ? "#7c3aed" : "#6c757d",
                          }}
                        >
                          {item.itemCode || "No Code"}
                        </div>
                        {/* Stock Badge */}
                        <div className="mt-1">{getStockBadge(item)}</div>
                      </div>

                      <div className="d-flex align-items-start gap-2">
                        {/* Stock/Price Info */}
                        <div className="text-end">
                          <div
                            className={`fw-bold small ${getQuantityColor(
                              item
                            )}`}
                            style={{fontSize: "12px"}}
                          >
                            {item.type === "service"
                              ? "Service"
                              : `${getQuantityDisplay(item)} ${
                                  item.unit || "PCS"
                                }`}
                          </div>
                          {item.type !== "service" && (
                            <div
                              className="text-muted"
                              style={{fontSize: "11px"}}
                            >
                              ₹
                              {(
                                item.salePrice ||
                                item.salePriceWithoutTax ||
                                0
                              ).toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>

                        {/* Three Dot Menu */}
                        <Dropdown
                          onClick={(e) => e.stopPropagation()}
                          align="end"
                        >
                          <Dropdown.Toggle
                            as="button"
                            className="btn btn-sm btn-outline-light border-0 text-muted custom-dropdown-toggle d-flex align-items-center justify-content-center"
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "0",
                              background: "transparent",
                              opacity: 0,
                              transition: "all 0.2s ease",
                            }}
                            bsPrefix="custom-dropdown-toggle"
                          >
                            <FontAwesomeIcon icon={faEllipsisV} size="xs" />
                          </Dropdown.Toggle>

                          <Dropdown.Menu
                            className="shadow border-0"
                            style={{
                              minWidth: "140px",
                              zIndex: 10003,
                              borderRadius: "0",
                            }}
                          >
                            <Dropdown.Item
                              className="d-flex align-items-center py-2 px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditItem(item, e);
                              }}
                              style={{fontSize: "13px"}}
                            >
                              <FontAwesomeIcon
                                icon={faEdit}
                                className="me-2"
                                size="sm"
                                style={{color: "#7c3aed"}}
                              />
                              <span>Edit</span>
                            </Dropdown.Item>
                            <Dropdown.Divider className="my-1" />
                            <Dropdown.Item
                              className="d-flex align-items-center py-2 px-3 text-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(item, e);
                              }}
                              style={{fontSize: "13px"}}
                            >
                              <FontAwesomeIcon
                                icon={faTrash}
                                className="me-2"
                                size="sm"
                              />
                              <span>Delete</span>
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        className="position-absolute start-0 top-0 bottom-0"
                        style={{
                          width: "3px",
                          background: "#7c3aed",
                          borderRadius: "0",
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Load More Button */}
              {pagination && pagination.hasNextPage && onLoadMore && (
                <div className="text-center mt-3">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={isLoading}
                    className="load-more-btn"
                    style={{
                      borderRadius: "0",
                      padding: "0.4rem 1rem",
                      fontSize: "12px",
                      borderColor: "#7c3aed",
                      color: "#7c3aed",
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More (
                        {pagination.totalItems - filteredItems.length}{" "}
                        remaining)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={handleCancelDelete}
        centered
        backdrop="static"
      >
        <Modal.Header
          closeButton={!isDeleting}
          className="pb-3 border-bottom"
          style={{borderRadius: "0"}}
        >
          <Modal.Title
            className="fs-5 fw-bold text-danger"
            style={{fontSize: "16px"}}
          >
            <FontAwesomeIcon icon={faTrash} className="me-2" />
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <div className="text-center">
            <div className="mb-3">
              {isDeleting ? (
                <Spinner animation="border" variant="danger" size="lg" />
              ) : (
                <FontAwesomeIcon
                  icon={faTrash}
                  className="text-danger"
                  size="3x"
                />
              )}
            </div>
            <h6 className="fw-bold mb-2" style={{fontSize: "15px"}}>
              {isDeleting
                ? "Deleting..."
                : `Are you sure you want to delete this ${
                    itemToDelete?.type || "item"
                  }?`}
            </h6>
            <p className="text-muted mb-3" style={{fontSize: "13px"}}>
              <strong>"{itemToDelete?.name || "Unknown Item"}"</strong>
              <br />
              <small>
                {isDeleting
                  ? "Please wait while we delete this item."
                  : "This action cannot be undone."}
              </small>
            </p>
            {itemToDelete &&
              itemToDelete.type !== "service" &&
              getCurrentStock(itemToDelete) > 0 &&
              !isDeleting && (
                <div
                  className="alert alert-warning d-flex align-items-center"
                  style={{borderRadius: "0"}}
                >
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="me-2"
                  />
                  <small style={{fontSize: "12px"}}>
                    <strong>Warning:</strong> This item has{" "}
                    {getCurrentStock(itemToDelete)} units in stock.
                  </small>
                </div>
              )}
          </div>
        </Modal.Body>
        <Modal.Footer className="pt-3 border-top">
          <Button
            variant="outline-secondary"
            onClick={handleCancelDelete}
            className="me-2"
            disabled={isDeleting}
            style={{
              borderRadius: "0",
              fontSize: "13px",
            }}
          >
            <FontAwesomeIcon icon={faTimes} className="me-1" size="sm" />
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            className="px-4"
            disabled={isDeleting}
            style={{
              borderRadius: "0",
              fontSize: "13px",
            }}
          >
            {isDeleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} className="me-1" size="sm" />
                Delete {itemToDelete?.type || "Item"}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        show={showCategoryModal}
        onHide={handleCloseCategoryModal}
        centered
      >
        <Modal.Header closeButton className="pb-3" style={{borderRadius: "0"}}>
          <Modal.Title className="fs-5 fw-bold" style={{fontSize: "16px"}}>
            <FontAwesomeIcon icon={faFolder} className="me-2 text-secondary" />
            Add New Category
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <Form onSubmit={handleSaveCategory}>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label
                    className="fw-semibold small text-dark"
                    style={{fontSize: "13px"}}
                  >
                    Category Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={categoryFormData.name}
                    onChange={handleCategoryInputChange}
                    placeholder="Enter category name"
                    className="border-2"
                    required
                    autoFocus
                    style={{
                      borderRadius: "0",
                      fontSize: "13px",
                    }}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label
                    className="fw-semibold small text-dark"
                    style={{fontSize: "13px"}}
                  >
                    Description
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={categoryFormData.description}
                    onChange={handleCategoryInputChange}
                    placeholder="Enter category description (optional)"
                    className="border-2"
                    style={{
                      borderRadius: "0",
                      fontSize: "13px",
                    }}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="isActive"
                    label="Active Category"
                    checked={categoryFormData.isActive}
                    onChange={handleCategoryInputChange}
                    className="fw-semibold small text-dark"
                    style={{fontSize: "13px"}}
                  />
                  <Form.Text
                    className="text-muted small"
                    style={{fontSize: "12px"}}
                  >
                    Active categories will be available for selection when
                    creating items
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="pt-3 border-top">
          <Button
            variant="outline-secondary"
            onClick={handleCloseCategoryModal}
            className="me-2"
            style={{
              borderRadius: "0",
              fontSize: "13px",
            }}
          >
            <FontAwesomeIcon icon={faTimes} className="me-1" size="sm" />
            Cancel
          </Button>
          <Button
            className="px-4 fw-semibold text-white border-0"
            onClick={handleSaveCategory}
            style={{
              background: "#7c3aed",
              borderRadius: "0",
              fontSize: "13px",
            }}
          >
            <FontAwesomeIcon icon={faFolder} className="me-1" size="sm" />
            Save Category
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Clean Styles */}
      <style>
        {`
                /* Remove all border radius */
                .inventory-sidebar *,
                .inventory-sidebar *::before,
                .inventory-sidebar *::after {
                    border-radius: 0 !important;
                }

                /* Apply theme colors */
                .btn-add-item:hover {
                    background: #6d28d9 !important;
                    transform: translateY(-1px);
                    transition: all 0.2s ease;
                }

                .btn-add-category:hover {
                    background: #6c757d !important;
                    border-color: #6c757d !important;
                    color: white !important;
                    transform: translateY(-1px);
                    transition: all 0.2s ease;
                }

                .btn-add-item:disabled,
                .btn-add-category:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none !important;
                }

                .item-card:hover {
                    transform: translateX(2px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
                    border-color: #7c3aed !important;
                }

                .item-card.selected-item {
                    transform: translateX(2px);
                    box-shadow: 0 3px 12px rgba(124, 58, 237, 0.15) !important;
                }

                /* Custom Dropdown Toggle */
                .custom-dropdown-toggle {
                    opacity: 0;
                    transition: all 0.2s ease;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }

                .custom-dropdown-toggle:focus,
                .custom-dropdown-toggle:active,
                .custom-dropdown-toggle.show {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    outline: none !important;
                }

                .item-card:hover .custom-dropdown-toggle {
                    opacity: 1;
                }

                .custom-dropdown-toggle:hover {
                    background: rgba(124, 58, 237, 0.1) !important;
                    transform: scale(1.1);
                }

                /* Dropdown Menu */
                .dropdown-menu {
                    border: 1px solid rgba(0, 0, 0, 0.1) !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                    padding: 0.5rem 0 !important;
                    z-index: 10003 !important;
                }

                .dropdown-item {
                    padding: 0.5rem 1rem !important;
                    transition: all 0.2s ease !important;
                }

                .dropdown-item:hover {
                    background: #f8f9fa !important;
                    padding-left: 1.25rem !important;
                }

                .dropdown-item.text-danger:hover {
                    background: rgba(220, 53, 69, 0.1) !important;
                    color: #dc3545 !important;
                }

                /* Load More Button */
                .load-more-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
                    background: #7c3aed !important;
                    color: white !important;
                }

                /* Form Controls */
                .form-control:focus {
                    border-color: #7c3aed !important;
                    box-shadow: 0 0 0 0.2rem rgba(124, 58, 237, 0.25) !important;
                }

                /* Modal */
                .modal-content {
                    border-radius: 0 !important;
                }

                .modal-header {
                    background: #f8f9fa;
                    border-bottom: 2px solid #dee2e6;
                }

                .modal-footer {
                    background: #f8f9fa;
                }

                /* Scrollbar */
                .items-list::-webkit-scrollbar {
                    width: 6px;
                }

                .items-list::-webkit-scrollbar-track {
                    background: transparent;
                }

                .items-list::-webkit-scrollbar-thumb {
                    background: #dee2e6;
                }

                .items-list::-webkit-scrollbar-thumb:hover {
                    background: #adb5bd;
                }

                /* Enhanced Visual Elements */
                .inventory-sidebar {
                    background: #f8f9fa;
                }

                .sidebar-header {
                    background: white !important;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }

                .item-card {
                    transition: all 0.2s ease !important;
                }

                /* Input Group */
                .input-group-text {
                    background: #f8f9fa !important;
                    border-color: #dee2e6 !important;
                }

                .form-control {
                    background: #f8f9fa !important;
                    border-color: #dee2e6 !important;
                }

                .form-control:focus {
                    background: white !important;
                }

                /* Override Bootstrap z-index */
                .dropdown-menu[data-bs-popper] {
                    z-index: 10003 !important;
                }

                /* Alert styling */
                .alert {
                    border-radius: 0 !important;
                }
                `}
      </style>
    </>
  );
}

export default InventorySidebar;
