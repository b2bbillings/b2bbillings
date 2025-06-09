import React from 'react';
import { Container, Row, Col, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarAlt,
    faChevronDown,
    faFilter,
    faBuilding,
    faShoppingCart
} from '@fortawesome/free-solid-svg-icons';

function PurchaseBillsFilter({
    dateRange,
    startDate,
    endDate,
    selectedFirm,
    purchaseStatus,
    dateRangeOptions,
    firmOptions,
    purchaseStatusOptions,
    onDateRangeChange,
    onStartDateChange,
    onEndDateChange,
    onFirmChange,
    onPurchaseStatusChange
}) {
    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    const formatDateDisplay = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <>
            <div className="purchase-filter-section">
                <Container fluid>
                    <div className="filter-container">
                        <div className="filter-header mb-3">
                            <div className="d-flex align-items-center">
                                <div className="filter-icon">
                                    <FontAwesomeIcon icon={faFilter} />
                                </div>
                                <h6 className="mb-0 fw-semibold text-dark">Purchase Filter Options</h6>
                            </div>
                        </div>

                        <Row className="align-items-center g-3">
                            {/* Date Range Dropdown */}
                            <Col md={3} sm={6}>
                                <div className="filter-group">
                                    <label className="filter-label">Date Range</label>
                                    <Dropdown className="custom-dropdown">
                                        <Dropdown.Toggle variant="outline-secondary" className="custom-dropdown-toggle w-100" size="sm">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-purple" />
                                            {dateRange}
                                            <FontAwesomeIcon icon={faChevronDown} className="ms-auto" />
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
                            <Col md={2} sm={6}>
                                <div className="filter-group">
                                    <label className="filter-label">From Date</label>
                                    <InputGroup size="sm" className="custom-date-input-group">
                                        <InputGroup.Text className="date-icon-wrapper">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="text-purple" />
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
                            <Col md={2} sm={6}>
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

                            {/* Purchase Status */}
                            <Col md={2} sm={6}>
                                <div className="filter-group">
                                    <label className="filter-label">Status</label>
                                    <Dropdown className="custom-dropdown">
                                        <Dropdown.Toggle variant="outline-secondary" className="custom-dropdown-toggle w-100" size="sm">
                                            <FontAwesomeIcon icon={faShoppingCart} className="me-2 text-purple" />
                                            {purchaseStatus || 'All Status'}
                                            <FontAwesomeIcon icon={faChevronDown} className="ms-auto" />
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu className="custom-dropdown-menu">
                                            <Dropdown.Item
                                                onClick={() => onPurchaseStatusChange('')}
                                                active={!purchaseStatus}
                                                className="custom-dropdown-item"
                                            >
                                                All Status
                                            </Dropdown.Item>
                                            {purchaseStatusOptions?.map((option) => (
                                                <Dropdown.Item
                                                    key={option.value}
                                                    onClick={() => onPurchaseStatusChange(option.value)}
                                                    active={purchaseStatus === option.value}
                                                    className="custom-dropdown-item"
                                                >
                                                    <span className={`status-dot status-${option.color} me-2`}></span>
                                                    {option.label}
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>
                            </Col>

                            {/* Firm Dropdown */}
                            <Col md={2} sm={6}>
                                <div className="filter-group">
                                    <label className="filter-label">Firm/Branch</label>
                                    <Dropdown className="custom-dropdown">
                                        <Dropdown.Toggle variant="outline-secondary" className="custom-dropdown-toggle w-100" size="sm">
                                            <FontAwesomeIcon icon={faBuilding} className="me-2 text-purple" />
                                            {selectedFirm}
                                            <FontAwesomeIcon icon={faChevronDown} className="ms-auto" />
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu className="custom-dropdown-menu">
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

                            {/* Quick Stats */}
                            <Col md={1} sm={12}>
                                <div className="filter-group">
                                    <div className="quick-stats text-center">
                                        <small className="text-muted d-block">Active Filters</small>
                                        <div className="d-flex flex-wrap gap-1 mt-1 justify-content-center">
                                            <span className="badge bg-primary filter-chip">{dateRange}</span>
                                            {purchaseStatus && <span className="badge bg-success filter-chip">{purchaseStatus}</span>}
                                            <span className="badge bg-secondary filter-chip">{selectedFirm}</span>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Container>
            </div>

            {/* Enhanced Purple Theme Styles with Bootstrap */}
            <style>
                {`
                .purchase-filter-section {
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
                }

                .filter-chip {
                    font-size: 0.65rem !important;
                    padding: 0.25rem 0.375rem !important;
                    font-weight: 500 !important;
                    border-radius: 4px !important;
                    letter-spacing: 0.2px;
                }

                .badge.bg-primary {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%) !important;
                }

                .badge.bg-success {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%) !important;
                }

                .badge.bg-secondary {
                    background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%) !important;
                }

                /* Status Dots */
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    display: inline-block;
                }

                .status-dot.status-gray { background-color: #6c757d; }
                .status-dot.status-blue { background-color: #0d6efd; }
                .status-dot.status-orange { background-color: #fd7e14; }
                .status-dot.status-green { background-color: #198754; }
                .status-dot.status-red { background-color: #dc3545; }

                /* Bootstrap Responsive */
                @media (max-width: 768px) {
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

                @media (max-width: 576px) {
                    .purchase-filter-section {
                        border-radius: 8px;
                        margin-bottom: 1rem;
                    }

                    .filter-container {
                        padding: 0.75rem;
                    }

                    .quick-stats {
                        margin-top: 1rem;
                    }

                    .filter-chip {
                        font-size: 0.6rem !important;
                        padding: 0.2rem 0.3rem !important;
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

                .purchase-filter-section .dropdown {
                    z-index: 1050 !important;
                }

                .purchase-filter-section .dropdown-menu {
                    z-index: 1051 !important;
                }

                /* Enhanced Purple Theme */
                .purchase-filter-section::before {
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

                .purchase-filter-section {
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
                `}
            </style>
        </>
    );
}

export default PurchaseBillsFilter;