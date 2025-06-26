import React from "react";
import {Container, Row, Col, Form, InputGroup, Dropdown} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faChevronDown,
  faFilter,
  faBuilding,
  faClipboardList,
  faTruck,
  faUsers,
  faShoppingCart,
} from "@fortawesome/free-solid-svg-icons";

function PurchaseOrderFilter({
  dateRange,
  startDate,
  endDate,
  selectedFirm,
  orderStatus,
  selectedSupplier,
  deliveryStatus,
  dateRangeOptions,
  firmOptions,
  orderStatusOptions,
  supplierOptions,
  deliveryStatusOptions,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange,
  onFirmChange,
  onOrderStatusChange,
  onSupplierChange,
  onDeliveryStatusChange,
}) {
  // ✅ FIXED: Safe date formatting function with null checks
  const formatDateForInput = (date) => {
    // ✅ Return empty string for null, undefined, or invalid dates
    if (!date || date === null || date === undefined) {
      return "";
    }

    // ✅ Handle string dates
    if (typeof date === "string") {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return ""; // Invalid date string
      }
      return parsedDate.toISOString().split("T")[0];
    }

    // ✅ Handle Date objects
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        return ""; // Invalid Date object
      }
      return date.toISOString().split("T")[0];
    }

    // ✅ Fallback for any other type
    return "";
  };

  const formatDateDisplay = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Count active filters for display
  const getActiveFiltersCount = () => {
    let count = 0;
    if (dateRange && dateRange !== "All Time") count++;
    if (orderStatus) count++;
    if (selectedSupplier && selectedSupplier !== "All Suppliers") count++;
    if (deliveryStatus && deliveryStatus !== "All Status") count++;
    if (selectedFirm && selectedFirm !== "All Firms") count++;
    return count;
  };

  return (
    <>
      <div className="purchase-order-filter-section">
        <Container fluid>
          <div className="filter-container">
            <div className="filter-header mb-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <div className="filter-icon">
                    <FontAwesomeIcon icon={faFilter} />
                  </div>
                  <h6 className="mb-0 fw-semibold text-dark">
                    Purchase Order Filter Options
                  </h6>
                </div>
                <div className="active-filters-badge">
                  <span className="badge bg-primary">
                    {getActiveFiltersCount()} Active
                  </span>
                </div>
              </div>
            </div>

            <Row className="align-items-center g-3">
              {/* Date Range Dropdown */}
              <Col lg={2} md={4} sm={6}>
                <div className="filter-group">
                  <label className="filter-label">Date Range</label>
                  <Dropdown className="custom-dropdown">
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="custom-dropdown-toggle w-100"
                      size="sm"
                    >
                      <FontAwesomeIcon
                        icon={faCalendarAlt}
                        className="me-2 text-purple"
                      />
                      {dateRange || "All Time"}
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className="ms-auto"
                      />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="custom-dropdown-menu">
                      {dateRangeOptions?.map((option) => (
                        <Dropdown.Item
                          key={option}
                          onClick={() => onDateRangeChange(option)}
                          active={dateRange === option}
                          className="custom-dropdown-item"
                        >
                          {option}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Col>

              {/* Start Date */}
              <Col lg={2} md={3} sm={6}>
                <div className="filter-group">
                  <label className="filter-label">From Date</label>
                  <InputGroup size="sm" className="custom-date-input-group">
                    <InputGroup.Text className="date-icon-wrapper">
                      <FontAwesomeIcon
                        icon={faCalendarAlt}
                        className="text-purple"
                      />
                    </InputGroup.Text>
                    <Form.Control
                      type="date"
                      value={formatDateForInput(startDate)}
                      onChange={onStartDateChange}
                      className="custom-date-input"
                      size="sm"
                    />
                  </InputGroup>
                </div>
              </Col>

              {/* End Date */}
              <Col lg={2} md={3} sm={6}>
                <div className="filter-group">
                  <label className="filter-label">To Date</label>
                  <Form.Control
                    type="date"
                    value={formatDateForInput(endDate)}
                    onChange={onEndDateChange}
                    className="custom-date-input-standalone"
                    size="sm"
                  />
                </div>
              </Col>

              {/* Order Status */}
              <Col lg={2} md={4} sm={6}>
                <div className="filter-group">
                  <label className="filter-label">Order Status</label>
                  <Dropdown className="custom-dropdown">
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="custom-dropdown-toggle w-100"
                      size="sm"
                    >
                      <FontAwesomeIcon
                        icon={faClipboardList}
                        className="me-2 text-purple"
                      />
                      {orderStatus || "All Status"}
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className="ms-auto"
                      />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="custom-dropdown-menu">
                      <Dropdown.Item
                        onClick={() => onOrderStatusChange("")}
                        active={!orderStatus}
                        className="custom-dropdown-item"
                      >
                        All Status
                      </Dropdown.Item>
                      {orderStatusOptions?.map((option) => (
                        <Dropdown.Item
                          key={option.value}
                          onClick={() => onOrderStatusChange(option.value)}
                          active={orderStatus === option.value}
                          className="custom-dropdown-item"
                        >
                          <span
                            className={`status-dot status-${option.color} me-2`}
                          ></span>
                          {option.label}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Col>

              {/* Supplier Filter */}
              <Col lg={2} md={4} sm={6}>
                <div className="filter-group">
                  <label className="filter-label">Supplier</label>
                  <Dropdown className="custom-dropdown">
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="custom-dropdown-toggle w-100"
                      size="sm"
                    >
                      <FontAwesomeIcon
                        icon={faUsers}
                        className="me-2 text-purple"
                      />
                      {selectedSupplier || "All Suppliers"}
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className="ms-auto"
                      />
                    </Dropdown.Toggle>
                    <Dropdown.Menu
                      className="custom-dropdown-menu"
                      style={{maxHeight: "200px", overflowY: "auto"}}
                    >
                      <Dropdown.Item
                        onClick={() => onSupplierChange("")}
                        active={!selectedSupplier}
                        className="custom-dropdown-item"
                      >
                        All Suppliers
                      </Dropdown.Item>
                      {supplierOptions?.map((supplier) => (
                        <Dropdown.Item
                          key={supplier.id || supplier.name}
                          onClick={() =>
                            onSupplierChange(supplier.name || supplier.value)
                          }
                          active={
                            selectedSupplier ===
                            (supplier.name || supplier.value)
                          }
                          className="custom-dropdown-item"
                        >
                          <div className="supplier-item">
                            <span className="supplier-name">
                              {supplier.name || supplier.label}
                            </span>
                            {supplier.orderCount && (
                              <span className="supplier-count">
                                ({supplier.orderCount})
                              </span>
                            )}
                          </div>
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Col>

              {/* Delivery Status */}
              <Col lg={2} md={4} sm={6}>
                <div className="filter-group">
                  <label className="filter-label">Delivery</label>
                  <Dropdown className="custom-dropdown">
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="custom-dropdown-toggle w-100"
                      size="sm"
                    >
                      <FontAwesomeIcon
                        icon={faTruck}
                        className="me-2 text-purple"
                      />
                      {deliveryStatus || "All Status"}
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className="ms-auto"
                      />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="custom-dropdown-menu">
                      <Dropdown.Item
                        onClick={() => onDeliveryStatusChange("")}
                        active={!deliveryStatus}
                        className="custom-dropdown-item"
                      >
                        All Status
                      </Dropdown.Item>
                      {deliveryStatusOptions?.map((option) => (
                        <Dropdown.Item
                          key={option.value}
                          onClick={() => onDeliveryStatusChange(option.value)}
                          active={deliveryStatus === option.value}
                          className="custom-dropdown-item"
                        >
                          <span
                            className={`status-dot delivery-${option.color} me-2`}
                          ></span>
                          {option.label}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Col>
            </Row>

            {/* Second Row - Firm/Branch and Quick Stats */}
            <Row className="align-items-center g-3 mt-2">
              {/* Firm/Branch */}
              <Col lg={3} md={6} sm={6}>
                <div className="filter-group">
                  <label className="filter-label">Firm/Branch</label>
                  <Dropdown className="custom-dropdown">
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="custom-dropdown-toggle w-100"
                      size="sm"
                    >
                      <FontAwesomeIcon
                        icon={faBuilding}
                        className="me-2 text-purple"
                      />
                      {selectedFirm || "All Firms"}
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className="ms-auto"
                      />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="custom-dropdown-menu">
                      <Dropdown.Item
                        onClick={() => onFirmChange("")}
                        active={!selectedFirm}
                        className="custom-dropdown-item"
                      >
                        All Firms
                      </Dropdown.Item>
                      {firmOptions?.map((firm) => (
                        <Dropdown.Item
                          key={firm}
                          onClick={() => onFirmChange(firm)}
                          active={selectedFirm === firm}
                          className="custom-dropdown-item"
                        >
                          {firm}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Col>

              {/* Quick Filter Stats */}
              <Col lg={9} md={6} sm={6}>
                <div className="filter-group">
                  <label className="filter-label">Active Filters</label>
                  <div className="quick-stats">
                    <div className="d-flex flex-wrap gap-1 align-items-center">
                      {/* Date Range Chip */}
                      {dateRange && dateRange !== "All Time" && (
                        <span className="badge bg-primary filter-chip">
                          <FontAwesomeIcon
                            icon={faCalendarAlt}
                            className="me-1"
                          />
                          {dateRange}
                        </span>
                      )}

                      {/* Order Status Chip */}
                      {orderStatus && (
                        <span className="badge bg-success filter-chip">
                          <FontAwesomeIcon
                            icon={faClipboardList}
                            className="me-1"
                          />
                          {orderStatus}
                        </span>
                      )}

                      {/* Supplier Chip */}
                      {selectedSupplier &&
                        selectedSupplier !== "All Suppliers" && (
                          <span className="badge bg-info filter-chip">
                            <FontAwesomeIcon icon={faUsers} className="me-1" />
                            {selectedSupplier.length > 15
                              ? `${selectedSupplier.substring(0, 15)}...`
                              : selectedSupplier}
                          </span>
                        )}

                      {/* Delivery Status Chip */}
                      {deliveryStatus && deliveryStatus !== "All Status" && (
                        <span className="badge bg-warning filter-chip">
                          <FontAwesomeIcon icon={faTruck} className="me-1" />
                          {deliveryStatus}
                        </span>
                      )}

                      {/* Firm Chip */}
                      {selectedFirm && selectedFirm !== "All Firms" && (
                        <span className="badge bg-secondary filter-chip">
                          <FontAwesomeIcon icon={faBuilding} className="me-1" />
                          {selectedFirm}
                        </span>
                      )}

                      {/* No filters message */}
                      {getActiveFiltersCount() === 0 && (
                        <small className="text-muted">No active filters</small>
                      )}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      {/* Enhanced Purple Theme Styles with Bootstrap - Order-specific */}
      <style>
        {`
                .purchase-order-filter-section {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.03) 0%, rgba(156, 136, 255, 0.03) 100%);
                    border: 1px solid rgba(108, 99, 255, 0.1);
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    backdrop-filter: blur(10px);
                    position: relative;
                    z-index: 10;
                    box-shadow: 0 2px 15px rgba(108, 99, 255, 0.05);
                }

                .filter-container {
                    padding: 1.25rem 1.5rem;
                    position: relative;
                    z-index: 20;
                }

                .filter-header {
                    border-bottom: 1px solid rgba(108, 99, 255, 0.1);
                    padding-bottom: 1rem;
                }

                .filter-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 0.8rem;
                    margin-right: 0.75rem;
                    box-shadow: 0 2px 8px rgba(108, 99, 255, 0.2);
                }

                .active-filters-badge .badge {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%) !important;
                    font-size: 0.7rem;
                    padding: 0.3rem 0.6rem;
                    border-radius: 6px;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    box-shadow: 0 2px 6px rgba(108, 99, 255, 0.2);
                }

                .filter-group {
                    width: 100%;
                    position: relative;
                    z-index: 30;
                }

                .filter-label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #6c63ff;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 0.5rem;
                }

                /* Bootstrap Dropdown Enhancements */
                .custom-dropdown {
                    width: 100%;
                    position: relative;
                    z-index: 1000;
                }

                .custom-dropdown-toggle {
                    background: white !important;
                    border: 1px solid rgba(108, 99, 255, 0.2) !important;
                    border-radius: 6px !important;
                    padding: 0.375rem 0.75rem !important;
                    font-size: 0.8rem !important;
                    color: #495057 !important;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    text-align: left;
                    min-height: 32px;
                    position: relative;
                    z-index: 1001;
                    box-shadow: 0 1px 3px rgba(108, 99, 255, 0.08);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .custom-dropdown-toggle:hover,
                .custom-dropdown-toggle:focus {
                    background: rgba(108, 99, 255, 0.05) !important;
                    border-color: rgba(108, 99, 255, 0.3) !important;
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.1) !important;
                    color: #495057 !important;
                    transform: translateY(-1px);
                }

                .custom-dropdown-toggle::after {
                    display: none;
                }

                .custom-dropdown-menu {
                    border: 1px solid rgba(108, 99, 255, 0.15) !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 25px rgba(108, 99, 255, 0.15) !important;
                    padding: 0.5rem 0;
                    margin-top: 0.25rem;
                    position: absolute;
                    z-index: 1050 !important;
                    background: white;
                    max-height: 200px;
                    overflow-y: auto;
                    min-width: 100%;
                }

                .custom-dropdown-item {
                    padding: 0.375rem 0.75rem !important;
                    font-size: 0.8rem !important;
                    color: #495057 !important;
                    transition: all 0.2s ease;
                    border-radius: 4px;
                    margin: 0 0.25rem;
                    display: flex;
                    align-items: center;
                    white-space: nowrap;
                }

                .custom-dropdown-item:hover {
                    background: rgba(108, 99, 255, 0.1) !important;
                    color: #6c63ff !important;
                    transform: translateX(2px);
                }

                .custom-dropdown-item.active {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%) !important;
                    color: white !important;
                }

                /* ✅ Supplier Item Enhancement */
                .supplier-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                }

                .supplier-name {
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .supplier-count {
                    font-size: 0.7rem;
                    color: #6c757d;
                    margin-left: 0.5rem;
                    font-weight: 500;
                }

                .custom-dropdown-item:hover .supplier-count {
                    color: #9c88ff;
                }

                .custom-dropdown-item.active .supplier-count {
                    color: rgba(255, 255, 255, 0.8);
                }

                /* Bootstrap Form Control Enhancements */
                .custom-date-input-group {
                    border-radius: 6px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    position: relative;
                    z-index: 10;
                    box-shadow: 0 1px 3px rgba(108, 99, 255, 0.08);
                }

                .custom-date-input-group:focus-within {
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.1);
                    transform: translateY(-1px);
                }

                .date-icon-wrapper {
                    background: rgba(108, 99, 255, 0.1) !important;
                    border: 1px solid rgba(108, 99, 255, 0.2) !important;
                    border-right: none !important;
                    font-size: 0.7rem;
                }

                .custom-date-input,
                .custom-date-input-standalone {
                    font-size: 0.8rem !important;
                    background: white !important;
                    transition: all 0.2s ease;
                    position: relative;
                    z-index: 10;
                    border: 1px solid rgba(108, 99, 255, 0.2) !important;
                }

                .custom-date-input-standalone {
                    border-radius: 6px !important;
                    box-shadow: 0 1px 3px rgba(108, 99, 255, 0.08);
                }

                .custom-date-input-standalone:focus,
                .custom-date-input:focus {
                    background: rgba(108, 99, 255, 0.02) !important;
                    border-color: rgba(108, 99, 255, 0.3) !important;
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.1) !important;
                    transform: translateY(-1px);
                }

                .text-purple {
                    color: #6c63ff !important;
                }

                /* Bootstrap Badge Enhancements */
                .quick-stats {
                    padding: 0.5rem;
                    background: rgba(108, 99, 255, 0.05);
                    border-radius: 8px;
                    border: 1px solid rgba(108, 99, 255, 0.1);
                    box-shadow: 0 1px 3px rgba(108, 99, 255, 0.08);
                    min-height: 32px;
                    display: flex;
                    align-items: center;
                }

                .filter-chip {
                    font-size: 0.65rem !important;
                    padding: 0.25rem 0.375rem !important;
                    font-weight: 500 !important;
                    border-radius: 4px !important;
                    letter-spacing: 0.2px;
                    display: inline-flex;
                    align-items: center;
                    white-space: nowrap;
                }

                .badge.bg-primary {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%) !important;
                }

                .badge.bg-success {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%) !important;
                }

                .badge.bg-info {
                    background: linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%) !important;
                }

                .badge.bg-warning {
                    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%) !important;
                }

                .badge.bg-secondary {
                    background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%) !important;
                }

                /* ✅ Order-specific Status Dots */
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    display: inline-block;
                    flex-shrink: 0;
                }

                /* Order Status Colors */
                .status-dot.status-gray { background-color: #6c757d; } /* Draft */
                .status-dot.status-orange { background-color: #f59e0b; } /* Pending */
                .status-dot.status-blue { background-color: #6c63ff; } /* Confirmed */
                .status-dot.status-cyan { background-color: #06b6d4; } /* Shipped */
                .status-dot.status-green { background-color: #10b981; } /* Delivered */
                .status-dot.status-darkgreen { background-color: #059669; } /* Completed */
                .status-dot.status-red { background-color: #dc3545; } /* Cancelled */

                /* Delivery Status Colors */
                .status-dot.delivery-gray { background-color: #6c757d; } /* Not Scheduled */
                .status-dot.delivery-blue { background-color: #3b82f6; } /* Scheduled */
                .status-dot.delivery-orange { background-color: #f59e0b; } /* In Transit */
                .status-dot.delivery-green { background-color: #10b981; } /* Delivered */
                .status-dot.delivery-red { background-color: #ef4444; } /* Failed */

                /* Bootstrap Responsive */
                @media (max-width: 992px) {
                    .filter-container {
                        padding: 1rem;
                    }

                    .filter-header {
                        margin-bottom: 1rem;
                    }

                    .filter-icon {
                        width: 28px;
                        height: 28px;
                        font-size: 0.7rem;
                    }

                    .custom-dropdown-toggle,
                    .custom-date-input,
                    .custom-date-input-standalone {
                        font-size: 0.75rem !important;
                        min-height: 30px;
                    }

                    .filter-label {
                        font-size: 0.7rem;
                        margin-bottom: 0.4rem;
                    }

                    .custom-dropdown-menu {
                        z-index: 1055 !important;
                    }
                }

                @media (max-width: 768px) {
                    .purchase-order-filter-section {
                        border-radius: 8px;
                        margin-bottom: 1rem;
                    }

                    .filter-container {
                        padding: 0.75rem;
                    }

                    .filter-header .d-flex {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 0.5rem;
                    }

                    .active-filters-badge {
                        align-self: flex-end;
                    }

                    .quick-stats {
                        margin-top: 0.5rem;
                    }

                    .filter-chip {
                        font-size: 0.6rem !important;
                        padding: 0.2rem 0.3rem !important;
                    }

                    .filter-chip .me-1 {
                        margin-right: 0.2rem !important;
                        font-size: 0.5rem;
                    }
                }

                @media (max-width: 576px) {
                    .filter-container {
                        padding: 0.5rem;
                    }

                    .quick-stats .d-flex {
                        justify-content: center;
                    }

                    .supplier-name {
                        max-width: 120px;
                    }
                }

                /* Bootstrap Dropdown z-index override */
                .dropdown-menu.show {
                    z-index: 1050 !important;
                    position: absolute !important;
                }

                .dropdown.show {
                    z-index: 1050 !important;
                }

                .purchase-order-filter-section .dropdown {
                    z-index: 1050 !important;
                }

                .purchase-order-filter-section .dropdown-menu {
                    z-index: 1051 !important;
                }

                /* Enhanced Purple Theme */
                .purchase-order-filter-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent 0%, #6c63ff 50%, transparent 100%);
                    border-radius: 12px 12px 0 0;
                    opacity: 0.6;
                }

                /* Bootstrap Animation */
                @keyframes slideInDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .purchase-order-filter-section {
                    animation: slideInDown 0.3s ease-out;
                }

                .filter-group {
                    animation: slideInDown 0.4s ease-out;
                }

                .filter-group:nth-child(1) { animation-delay: 0.1s; }
                .filter-group:nth-child(2) { animation-delay: 0.15s; }
                .filter-group:nth-child(3) { animation-delay: 0.2s; }
                .filter-group:nth-child(4) { animation-delay: 0.25s; }
                .filter-group:nth-child(5) { animation-delay: 0.3s; }
                .filter-group:nth-child(6) { animation-delay: 0.35s; }

                /* Bootstrap Utility Enhancements */
                .gap-1 {
                    gap: 0.25rem !important;
                }

                .gap-3 {
                    gap: 1rem !important;
                }

                /* Custom Scrollbar */
                .custom-dropdown-menu::-webkit-scrollbar {
                    width: 4px;
                }

                .custom-dropdown-menu::-webkit-scrollbar-track {
                    background: rgba(108, 99, 255, 0.1);
                    border-radius: 2px;
                }

                .custom-dropdown-menu::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    border-radius: 2px;
                }

                .custom-dropdown-menu::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #5a52d5 0%, #8a7ae8 100%);
                }

                /* Bootstrap Focus States */
                .custom-dropdown-toggle:focus-visible,
                .custom-date-input:focus-visible,
                .custom-date-input-standalone:focus-visible {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.25) !important;
                }

                /* Enhanced Hover Effects */
                .custom-dropdown-toggle:hover,
                .custom-date-input-group:hover,
                .custom-date-input-standalone:hover {
                    box-shadow: 0 2px 8px rgba(108, 99, 255, 0.15);
                }

                /* ✅ Order-specific enhancements */
                .filter-chip:hover {
                    transform: scale(1.05);
                    transition: transform 0.2s ease;
                }

                .status-dot {
                    transition: transform 0.2s ease;
                }

                .custom-dropdown-item:hover .status-dot {
                    transform: scale(1.2);
                }

                /* Enhanced visual feedback */
                .filter-group:hover .filter-label {
                    color: #5a52d5;
                    transition: color 0.2s ease;
                }

                /* Better mobile touch targets */
                @media (max-width: 768px) {
                    .custom-dropdown-toggle,
                    .custom-date-input,
                    .custom-date-input-standalone {
                        min-height: 36px;
                        padding: 0.5rem 0.75rem !important;
                    }

                    .custom-dropdown-item {
                        padding: 0.5rem 0.75rem !important;
                        min-height: 36px;
                    }
                }

                /* Print optimization */
                @media print {
                    .purchase-order-filter-section {
                        background: white !important;
                        border: 1px solid #ddd !important;
                        box-shadow: none !important;
                        break-inside: avoid;
                    }

                    .filter-icon {
                        background: #6c63ff !important;
                    }

                    .badge {
                        background: #6c63ff !important;
                        color: white !important;
                    }
                }
                `}
      </style>
    </>
  );
}

export default PurchaseOrderFilter;
