import React from 'react';
import { Container, Row, Col, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarAlt,
    faChevronDown,
    faFilter,
    faBuilding,
    faFileContract,
    faFileInvoice
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
    onFirmChange,
    onExcelExport,
    onPrint,
    resultCount,
    mode = 'invoices',
    documentType = 'invoice',
    pageTitle = 'Sales Invoices'
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

    // ✅ UPDATED: Better mode detection
    const isQuotationsMode = mode === 'quotations' || documentType === 'quotation';

    const getFilterTitle = () => {
        return isQuotationsMode ? 'Quotation Filters' : 'Invoice Filters';
    };

    const getFilterIcon = () => {
        return isQuotationsMode ? faFileContract : faFileInvoice;
    };

    const getDateRangeLabel = () => {
        return isQuotationsMode ? 'Quote Date Range' : 'Invoice Date Range';
    };

    const getFromDateLabel = () => {
        return isQuotationsMode ? 'Quote From' : 'Invoice From';
    };

    const getToDateLabel = () => {
        return isQuotationsMode ? 'Quote To' : 'Invoice To';
    };

    const getActiveFiltersText = () => {
        return isQuotationsMode ? 'Quote Filters' : 'Invoice Filters';
    };

    const getResultText = () => {
        const count = resultCount || 0;
        if (isQuotationsMode) {
            return count === 1 ? `${count} quotation found` : `${count} quotations found`;
        } else {
            return count === 1 ? `${count} invoice found` : `${count} invoices found`;
        }
    };

    // ✅ FIXED: Light color scheme
    const getColorScheme = () => {
        return isQuotationsMode
            ? {
                primary: '#0ea5e9', // Light sky blue for quotations
                primaryRgb: '14, 165, 233',
                secondary: '#38bdf8',
                gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)'
            }
            : {
                primary: '#6366f1', // Light indigo for invoices
                primaryRgb: '99, 102, 241',
                secondary: '#8b5cf6',
                gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            };
    };

    const colors = getColorScheme();

    return (
        <>
            <div className="sales-filter-section" data-mode={mode}>
                <Container fluid>
                    <div className="filter-container">
                        <div className="filter-header mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                    <div className="filter-icon">
                                        <FontAwesomeIcon icon={getFilterIcon()} />
                                    </div>
                                    <div className="filter-title-group">
                                        <h6 className="mb-0 fw-semibold text-dark">{getFilterTitle()}</h6>
                                        <small className="text-muted">{pageTitle}</small>
                                    </div>
                                </div>
                                <div className="results-count">
                                    <small className="text-muted">{getResultText()}</small>
                                </div>
                            </div>
                        </div>

                        <Row className="align-items-center g-3">
                            {/* Date Range Dropdown */}
                            <Col md={3} sm={6}>
                                <div className="filter-group">
                                    <label className="filter-label">{getDateRangeLabel()}</label>
                                    <Dropdown className="custom-dropdown">
                                        <Dropdown.Toggle className="custom-dropdown-toggle w-100">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-themed" />
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
                                    <label className="filter-label">{getFromDateLabel()}</label>
                                    <InputGroup className="custom-date-input-group">
                                        <InputGroup.Text className="date-icon-wrapper">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="text-themed" />
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
                                    <label className="filter-label">{getToDateLabel()}</label>
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
                                    <label className="filter-label">Company/Branch</label>
                                    <Dropdown className="custom-dropdown">
                                        <Dropdown.Toggle className="custom-dropdown-toggle w-100">
                                            <FontAwesomeIcon icon={faBuilding} className="me-2 text-themed" />
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
                                        <small className="text-muted">{getActiveFiltersText()}</small>
                                        <div className="d-flex gap-1 mt-1 flex-wrap justify-content-center">
                                            <span className="filter-chip">{dateRange}</span>
                                            <span className="filter-chip">{selectedFirm}</span>
                                            {isQuotationsMode && (
                                                <span className="filter-chip mode-chip">
                                                    <FontAwesomeIcon icon={faFileContract} className="me-1" />
                                                    Quotes
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Container>
            </div>

            {/* ✅ FIXED: Light theme styles */}
            <style>
                {`
                .sales-filter-section {
                    background: linear-gradient(135deg, rgba(${colors.primaryRgb}, 0.04) 0%, rgba(${colors.primaryRgb}, 0.02) 100%);
                    border: 1px solid rgba(${colors.primaryRgb}, 0.12);
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    backdrop-filter: blur(5px);
                    position: relative;
                    z-index: 10;
                    transition: all 0.3s ease;
                }

                .sales-filter-section[data-mode="quotations"] {
                    background: linear-gradient(135deg, rgba(14, 165, 233, 0.04) 0%, rgba(56, 189, 248, 0.02) 100%);
                    border-color: rgba(14, 165, 233, 0.12);
                }

                .filter-container {
                    padding: 1.25rem 1.5rem;
                    position: relative;
                    z-index: 20;
                }

                .filter-header {
                    border-bottom: 1px solid rgba(${colors.primaryRgb}, 0.1);
                    padding-bottom: 1rem;
                }

                .sales-filter-section[data-mode="quotations"] .filter-header {
                    border-bottom-color: rgba(14, 165, 233, 0.1);
                }

                .filter-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: white;
                    border: 2px solid ${colors.primary};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${colors.primary};
                    font-size: 0.9rem;
                    margin-right: 0.75rem;
                    transition: all 0.3s ease;
                }

                .filter-icon:hover {
                    background: ${colors.primary};
                    color: white;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(${colors.primaryRgb}, 0.2);
                }

                .filter-title-group {
                    flex: 1;
                }

                .filter-title-group h6 {
                    color: #374151;
                    font-size: 1rem;
                }

                .filter-title-group small {
                    font-size: 0.75rem;
                    color: #6b7280;
                }

                .results-count {
                    background: rgba(${colors.primaryRgb}, 0.08);
                    padding: 0.375rem 0.75rem;
                    border-radius: 20px;
                    border: 1px solid rgba(${colors.primaryRgb}, 0.15);
                }

                .results-count small {
                    color: ${colors.primary};
                    font-weight: 500;
                    font-size: 0.75rem;
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
                    color: #374151;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 0.5rem;
                    transition: color 0.3s ease;
                }

                .custom-dropdown {
                    width: 100%;
                    position: relative;
                    z-index: 1000;
                }

                .custom-dropdown-toggle {
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    padding: 0.6rem 0.75rem;
                    font-size: 0.85rem;
                    color: #374151;
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
                    background: #f9fafb;
                    border-color: ${colors.primary};
                    box-shadow: 0 0 0 3px rgba(${colors.primaryRgb}, 0.1);
                    color: #374151;
                }

                .custom-dropdown-toggle::after {
                    display: none;
                }

                .custom-dropdown-menu {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
                    color: #374151;
                    transition: all 0.2s ease;
                    border-radius: 4px;
                    margin: 0 0.25rem;
                }

                .custom-dropdown-item:hover {
                    background: rgba(${colors.primaryRgb}, 0.08);
                    color: ${colors.primary};
                    transform: translateX(2px);
                }

                .custom-dropdown-item.active {
                    background: ${colors.primary};
                    color: white;
                }

                .custom-date-input-group {
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #d1d5db;
                    transition: all 0.2s ease;
                    position: relative;
                    z-index: 10;
                    background: white;
                }

                .custom-date-input-group:focus-within {
                    border-color: ${colors.primary};
                    box-shadow: 0 0 0 3px rgba(${colors.primaryRgb}, 0.1);
                }

                .date-icon-wrapper {
                    background: #f9fafb;
                    border: none;
                    border-right: 1px solid #e5e7eb;
                    color: ${colors.primary};
                }

                .custom-date-input,
                .custom-date-input-standalone {
                    border: none;
                    font-size: 0.85rem;
                    padding: 0.6rem 0.75rem;
                    background: white;
                    color: #374151;
                    transition: all 0.2s ease;
                    position: relative;
                    z-index: 10;
                }

                .custom-date-input-standalone {
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                }

                .custom-date-input-standalone:focus,
                .custom-date-input:focus {
                    background: #f9fafb;
                    border-color: ${colors.primary};
                    box-shadow: 0 0 0 3px rgba(${colors.primaryRgb}, 0.1);
                    outline: none;
                }

                .text-themed {
                    color: ${colors.primary} !important;
                }

                .quick-stats {
                    text-align: center;
                    padding: 0.5rem;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                    transition: all 0.3s ease;
                }

                .quick-stats:hover {
                    background: #f9fafb;
                    border-color: ${colors.primary};
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(${colors.primaryRgb}, 0.1);
                }

                .filter-chip {
                    background: ${colors.primary};
                    color: white;
                    padding: 3px 8px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    transition: all 0.2s ease;
                }

                .filter-chip:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(${colors.primaryRgb}, 0.2);
                }

                .mode-chip {
                    background: white !important;
                    color: ${colors.primary} !important;
                    border: 1px solid ${colors.primary};
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
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.75rem;
                    }

                    .filter-icon {
                        width: 32px;
                        height: 32px;
                        font-size: 0.8rem;
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

                    .filter-title-group h6 {
                        font-size: 0.9rem;
                    }

                    .filter-title-group small {
                        font-size: 0.7rem;
                    }

                    .results-count {
                        width: 100%;
                        text-align: center;
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
                        padding: 2px 6px;
                    }

                    .filter-header .d-flex {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }

                    .filter-icon {
                        width: 28px;
                        height: 28px;
                        font-size: 0.7rem;
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
                    background: #f3f4f6;
                    border-radius: 2px;
                }

                .custom-dropdown-menu::-webkit-scrollbar-thumb {
                    background: ${colors.primary};
                    border-radius: 2px;
                }

                .custom-dropdown-menu::-webkit-scrollbar-thumb:hover {
                    background: ${colors.secondary};
                }

                /* Print styles */
                @media print {
                    .sales-filter-section {
                        background: none !important;
                        border: 1px solid #ddd;
                        box-shadow: none;
                    }

                    .filter-icon {
                        background: #666 !important;
                        color: white !important;
                        border-color: #666 !important;
                    }

                    .filter-chip {
                        background: #666 !important;
                        color: white !important;
                    }
                }
                `}
            </style>
        </>
    );
}

export default SalesInvoicesFilter;