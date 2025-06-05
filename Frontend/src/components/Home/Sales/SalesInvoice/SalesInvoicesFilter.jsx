import React from 'react';
import { Container, Row, Col, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarAlt,
    faChevronDown,
    faFilter,
    faBuilding
} from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesFilter({
    dateRange,
    startDate,
    endDate,
    selectedFirm,
    dateRangeOptions,
    firmOptions,
    onDateRangeChange,
    onStartDateChange,
    onEndDateChange,
    onFirmChange
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
            <div className="sales-filter-section">
                <Container fluid>
                    <div className="filter-container">
                        <div className="filter-header mb-3">
                            <div className="d-flex align-items-center">
                                <div className="filter-icon">
                                    <FontAwesomeIcon icon={faFilter} />
                                </div>
                                <h6 className="mb-0 fw-semibold text-dark">Filter Options</h6>
                            </div>
                        </div>

                        <Row className="align-items-center g-3">
                            {/* Date Range Dropdown */}
                            <Col md={3} sm={6}>
                                <div className="filter-group">
                                    <label className="filter-label">Date Range</label>
                                    <Dropdown className="custom-dropdown">
                                        <Dropdown.Toggle className="custom-dropdown-toggle w-100">
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
                                    <InputGroup className="custom-date-input-group">
                                        <InputGroup.Text className="date-icon-wrapper">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="text-purple" />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="date"
                                            value={formatDateForInput(startDate)}
                                            onChange={onStartDateChange}
                                            className="custom-date-input"
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
                                    />
                                </div>
                            </Col>

                            {/* Firm Dropdown */}
                            <Col md={3} sm={6}>
                                <div className="filter-group">
                                    <label className="filter-label">Firm/Branch</label>
                                    <Dropdown className="custom-dropdown">
                                        <Dropdown.Toggle className="custom-dropdown-toggle w-100">
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
                            <Col md={2} sm={12}>
                                <div className="filter-group">
                                    <div className="quick-stats">
                                        <small className="text-muted">Active Filters</small>
                                        <div className="d-flex gap-1 mt-1">
                                            <span className="filter-chip">{dateRange}</span>
                                            <span className="filter-chip">{selectedFirm}</span>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Container>
            </div>


            {/* Enhanced Purple Theme Styles */}

            <style>
                {`
                .sales-filter-section {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.03) 0%, rgba(156, 136, 255, 0.03) 100%);
                    border: 1px solid rgba(108, 99, 255, 0.1);
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    backdrop-filter: blur(10px);
                    position: relative;
                    z-index: 10;
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

                .custom-dropdown {
                    width: 100%;
                    position: relative;
                    z-index: 1000;
                }

                .custom-dropdown-toggle {
                    background: white;
                    border: 1px solid rgba(108, 99, 255, 0.2);
                    border-radius: 8px;
                    padding: 0.6rem 0.75rem;
                    font-size: 0.85rem;
                    color: #495057;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    text-align: left;
                    min-height: 38px;
                    position: relative;
                    z-index: 1001;
                }

                .custom-dropdown-toggle:hover,
                .custom-dropdown-toggle:focus {
                    background: rgba(108, 99, 255, 0.05);
                    border-color: rgba(108, 99, 255, 0.3);
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.1);
                    color: #495057;
                }

                .custom-dropdown-toggle::after {
                    display: none;
                }

                .custom-dropdown-menu {
                    border: 1px solid rgba(108, 99, 255, 0.15);
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(108, 99, 255, 0.15);
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
                    padding: 0.5rem 1rem;
                    font-size: 0.85rem;
                    color: #495057;
                    transition: all 0.2s ease;
                    border-radius: 4px;
                    margin: 0 0.25rem;
                }

                .custom-dropdown-item:hover {
                    background: rgba(108, 99, 255, 0.1);
                    color: #6c63ff;
                    transform: translateX(2px);
                }

                .custom-dropdown-item.active {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    color: white;
                }

                .custom-date-input-group {
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid rgba(108, 99, 255, 0.2);
                    transition: all 0.2s ease;
                    position: relative;
                    z-index: 10;
                }

                .custom-date-input-group:focus-within {
                    border-color: rgba(108, 99, 255, 0.3);
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.1);
                }

                .date-icon-wrapper {
                    background: rgba(108, 99, 255, 0.1);
                    border: none;
                    border-right: 1px solid rgba(108, 99, 255, 0.2);
                }

                .custom-date-input,
                .custom-date-input-standalone {
                    border: none;
                    font-size: 0.85rem;
                    padding: 0.6rem 0.75rem;
                    background: white;
                    transition: all 0.2s ease;
                    position: relative;
                    z-index: 10;
                }

                .custom-date-input-standalone {
                    border: 1px solid rgba(108, 99, 255, 0.2);
                    border-radius: 8px;
                }

                .custom-date-input-standalone:focus,
                .custom-date-input:focus {
                    background: rgba(108, 99, 255, 0.02);
                    border-color: rgba(108, 99, 255, 0.3);
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.1);
                }

                .text-purple {
                    color: #6c63ff !important;
                }

                .quick-stats {
                    text-align: center;
                    padding: 0.5rem;
                    background: rgba(108, 99, 255, 0.05);
                    border-radius: 8px;
                    border: 1px solid rgba(108, 99, 255, 0.1);
                }

                .filter-chip {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 500;
                }

                /* Override Bootstrap dropdown z-index */
                .dropdown-menu.show {
                    z-index: 1050 !important;
                    position: absolute !important;
                }

                .dropdown.show {
                    z-index: 1050 !important;
                }

                /* Ensure dropdown appears above other components */
                .sales-filter-section .dropdown {
                    z-index: 1050 !important;
                }

                .sales-filter-section .dropdown-menu {
                    z-index: 1051 !important;
                }

                /* Responsive Design */
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
                        font-size: 0.8rem;
                        padding: 0.5rem 0.6rem;
                        min-height: 36px;
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
                    .sales-filter-section {
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
                        font-size: 0.65rem;
                        padding: 1px 4px;
                    }
                }

                /* Animations */
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

                .sales-filter-section {
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

                /* Custom Scrollbar for Dropdown */
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
                `}
            </style>
        </>
    );
}

export default SalesInvoicesFilter;