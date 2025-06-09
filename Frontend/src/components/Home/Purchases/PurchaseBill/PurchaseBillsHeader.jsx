import React from 'react';
import { Navbar, Container, Row, Col, InputGroup, Form, Button, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus, faEllipsisH, faCog, faShoppingCart, faFileInvoice } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useParams } from 'react-router-dom';

function PurchaseBillsHeader({
    searchTerm,
    onSearchChange,
    onAddPurchase,
    onAddSale,
    onMoreOptions,
    onSettings,
    currentCompany,
    addToast
}) {
    const navigate = useNavigate();
    const { companyId } = useParams();

    // Get effective company ID from URL params or currentCompany prop
    const getCompanyId = () => {
        return companyId || currentCompany?.id || currentCompany?._id;
    };

    // Handle Add Purchase button click
    const handleAddPurchase = () => {
        const effectiveCompanyId = getCompanyId();

        if (!effectiveCompanyId) {
            console.warn('⚠️ No company selected for Add Purchase');
            addToast?.('Please select a company first to create a purchase', 'warning', 5000);
            return;
        }

        console.log('🛒 Navigating to Add Purchase form for company:', effectiveCompanyId);

        if (onAddPurchase) {
            onAddPurchase();
        } else {
            // Navigate to purchase form with correct company context
            navigate(`/companies/${effectiveCompanyId}/purchases/add`);
        }
    };

    // Handle Add Sale button click  
    const handleAddSale = () => {
        const effectiveCompanyId = getCompanyId();

        if (!effectiveCompanyId) {
            console.warn('⚠️ No company selected for Add Sale');
            addToast?.('Please select a company first to create a sale', 'warning', 5000);
            return;
        }

        console.log('🧾 Navigating to Add Sale form for company:', effectiveCompanyId);

        if (onAddSale) {
            onAddSale();
        } else {
            // Navigate to sales form with correct company context
            navigate(`/companies/${effectiveCompanyId}/sales/add`);
        }
    };

    // Handle More Options
    const handleMoreOptions = () => {
        console.log('⚙️ More options clicked');
        if (onMoreOptions) {
            onMoreOptions();
        } else {
            addToast?.('More options menu coming soon!', 'info', 3000);
        }
    };

    // Handle Settings
    const handleSettings = () => {
        console.log('🔧 Settings clicked');
        if (onSettings) {
            onSettings();
        } else {
            const effectiveCompanyId = getCompanyId();
            if (effectiveCompanyId) {
                navigate(`/companies/${effectiveCompanyId}/settings`);
            } else {
                addToast?.('Please select a company first', 'warning', 3000);
            }
        }
    };

    return (
        <>
            <Navbar expand="lg" className="purchase-header-navbar sticky-top bg-light border-bottom">
                <Container fluid>
                    <Row className="w-100 align-items-center g-3">
                        {/* Left side - Search */}
                        <Col md={6} lg={5}>
                            <InputGroup size="sm" className="search-group">
                                <InputGroup.Text className="search-icon-wrapper bg-white border-end-0">
                                    <FontAwesomeIcon icon={faSearch} className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search purchase bills, suppliers, items..."
                                    value={searchTerm}
                                    onChange={onSearchChange}
                                    className="search-input border-start-0"
                                    style={{ boxShadow: 'none' }}
                                />
                            </InputGroup>
                        </Col>

                        {/* Right side - Action buttons */}
                        <Col md={6} lg={7}>
                            <div className="d-flex justify-content-end flex-wrap gap-2">
                                {/* Action Buttons - NOT in ButtonGroup */}
                                <div className="d-flex gap-2 me-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="btn-add-purchase d-flex align-items-center"
                                        onClick={handleAddPurchase}
                                        title="Create New Purchase Bill"
                                        disabled={!getCompanyId()}
                                    >
                                        <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                                        <span className="btn-text">Add Purchase</span>
                                    </Button>
                                    <Button
                                        variant="success"
                                        size="sm"
                                        className="btn-add-sale d-flex align-items-center"
                                        onClick={handleAddSale}
                                        title="Create New Sales Invoice"
                                        disabled={!getCompanyId()}
                                    >
                                        <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                                        <span className="btn-text">Add Sale</span>
                                    </Button>
                                </div>

                                {/* Settings ButtonGroup */}
                                <ButtonGroup size="sm">
                                    <Button
                                        variant="outline-secondary"
                                        className="btn-icon-only"
                                        onClick={handleMoreOptions}
                                        title="More Options"
                                    >
                                        <FontAwesomeIcon icon={faEllipsisH} />
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        className="btn-icon-only"
                                        onClick={handleSettings}
                                        title="Settings"
                                    >
                                        <FontAwesomeIcon icon={faCog} />
                                    </Button>
                                </ButtonGroup>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </Navbar>

            {/* Enhanced Purple Theme Styles with Bootstrap */}
            <style>
                {`
                .purchase-header-navbar {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%) !important;
                    border-bottom: 1px solid rgba(108, 99, 255, 0.1) !important;
                    box-shadow: 0 2px 15px rgba(108, 99, 255, 0.08);
                    backdrop-filter: blur(10px);
                    z-index: 1020;
                    padding: 0.75rem 0;
                }

                .search-group {
                    max-width: 400px;
                    width: 100%;
                    border-radius: 0.375rem;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(108, 99, 255, 0.1);
                    transition: all 0.3s ease;
                }

                .search-group:focus-within {
                    box-shadow: 0 4px 20px rgba(108, 99, 255, 0.2);
                    transform: translateY(-1px);
                }

                .search-icon-wrapper {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(156, 136, 255, 0.05) 100%) !important;
                    border: 1px solid rgba(108, 99, 255, 0.15) !important;
                    border-right: none !important;
                    color: #6c63ff !important;
                }

                .search-input {
                    border: 1px solid rgba(108, 99, 255, 0.15) !important;
                    background: rgba(255, 255, 255, 0.95) !important;
                    color: #495057 !important;
                    transition: all 0.3s ease;
                }

                .search-input:focus {
                    background: white !important;
                    border-color: rgba(108, 99, 255, 0.3) !important;
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.1) !important;
                    color: #495057 !important;
                }

                .search-input::placeholder {
                    color: rgba(108, 99, 255, 0.6) !important;
                    opacity: 0.8;
                    font-weight: 400;
                }

                /* Enhanced Bootstrap Button Styles - Fixed for individual buttons */
                .btn-add-purchase {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%) !important;
                    border: none !important;
                    color: white !important;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    box-shadow: 0 3px 12px rgba(108, 99, 255, 0.25);
                    transition: all 0.3s ease;
                    white-space: nowrap;
                    border-radius: 0.375rem !important;
                    cursor: pointer !important;
                    pointer-events: auto !important;
                    position: relative;
                    z-index: 10;
                    min-height: 36px;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                .btn-add-purchase:hover:not(:disabled) {
                    background: linear-gradient(135deg, #5a52d5 0%, #8a7ae8 100%) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(108, 99, 255, 0.35);
                    color: white !important;
                    border: none !important;
                }

                .btn-add-purchase:focus:not(:disabled) {
                    background: linear-gradient(135deg, #5a52d5 0%, #8a7ae8 100%) !important;
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.25) !important;
                    color: white !important;
                    border: none !important;
                }

                .btn-add-purchase:active:not(:disabled) {
                    background: linear-gradient(135deg, #4c46c7 0%, #7c6cda 100%) !important;
                    transform: translateY(0);
                    color: white !important;
                    border: none !important;
                }

                .btn-add-purchase:disabled {
                    background: linear-gradient(135deg, #6c757d 0%, #868e96 100%) !important;
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .btn-add-sale {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%) !important;
                    border: none !important;
                    color: white !important;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    box-shadow: 0 3px 12px rgba(16, 185, 129, 0.2);
                    transition: all 0.3s ease;
                    white-space: nowrap;
                    border-radius: 0.375rem !important;
                    cursor: pointer !important;
                    pointer-events: auto !important;
                    position: relative;
                    z-index: 10;
                    min-height: 36px;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }

                .btn-add-sale:hover:not(:disabled) {
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
                    color: white !important;
                    border: none !important;
                }

                .btn-add-sale:focus:not(:disabled) {
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
                    box-shadow: 0 0 0 0.2rem rgba(16, 185, 129, 0.25) !important;
                    color: white !important;
                    border: none !important;
                }

                .btn-add-sale:active:not(:disabled) {
                    background: linear-gradient(135deg, #047857 0%, #059669 100%) !important;
                    transform: translateY(0);
                    color: white !important;
                    border: none !important;
                }

                .btn-add-sale:disabled {
                    background: linear-gradient(135deg, #6c757d 0%, #868e96 100%) !important;
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .btn-icon-only {
                    background: rgba(255, 255, 255, 0.8) !important;
                    border: 1px solid rgba(108, 99, 255, 0.2) !important;
                    color: #6c63ff !important;
                    transition: all 0.3s ease;
                    min-width: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-icon-only:hover {
                    background: rgba(108, 99, 255, 0.1) !important;
                    border-color: rgba(108, 99, 255, 0.3) !important;
                    color: #5a52d5 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.15);
                }

                .btn-icon-only:focus {
                    background: rgba(108, 99, 255, 0.1) !important;
                    border-color: rgba(108, 99, 255, 0.3) !important;
                    color: #5a52d5 !important;
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.25) !important;
                }

                .btn-icon-only:active {
                    background: rgba(108, 99, 255, 0.15) !important;
                    color: #4c46c7 !important;
                    transform: translateY(0);
                }

                /* Bootstrap ButtonGroup Enhancements - Only for settings buttons */
                .btn-group .btn {
                    border-radius: 0.375rem !important;
                }

                .btn-group .btn:not(:last-child) {
                    border-top-right-radius: 0 !important;
                    border-bottom-right-radius: 0 !important;
                    margin-right: 0;
                }

                .btn-group .btn:not(:first-child) {
                    border-top-left-radius: 0 !important;
                    border-bottom-left-radius: 0 !important;
                }

                /* Action buttons gap fix */
                .d-flex.gap-2 {
                    gap: 0.5rem !important;
                }

                /* Ensure buttons are clickable - CRITICAL */
                .btn-add-purchase *,
                .btn-add-sale * {
                    pointer-events: none;
                }

                .btn-add-purchase,
                .btn-add-sale {
                    pointer-events: auto !important;
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }

                /* Debug info styling */
                .purchase-header-navbar small {
                    font-size: 0.7rem;
                    background: rgba(108, 99, 255, 0.1);
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                }

                /* Responsive Design using Bootstrap breakpoints */
                @media (max-width: 991.98px) {
                    .search-group {
                        max-width: 320px;
                    }

                    .btn-add-purchase,
                    .btn-add-sale {
                        font-size: 0.8rem;
                        padding: 0.375rem 0.75rem;
                    }

                    .btn-icon-only {
                        min-width: 34px;
                        padding: 0.375rem 0.5rem;
                    }
                }

                @media (max-width: 767.98px) {
                    .purchase-header-navbar .row {
                        flex-direction: column;
                        align-items: stretch !important;
                    }

                    .search-group {
                        max-width: 100%;
                    }

                    .d-flex.justify-content-end {
                        justify-content: center !important;
                    }

                    .btn-add-purchase,
                    .btn-add-sale {
                        flex: 1;
                        min-width: 110px;
                        max-width: 150px;
                    }

                    .d-flex.gap-2 {
                        margin-right: 0.5rem !important;
                    }
                }

                @media (max-width: 575.98px) {
                    .purchase-header-navbar {
                        padding: 0.5rem 0;
                    }

                    .btn-add-purchase,
                    .btn-add-sale {
                        font-size: 0.75rem;
                        padding: 0.375rem 0.5rem;
                        min-width: 100px;
                    }

                    .btn-text {
                        display: inline !important; /* Keep text visible on mobile */
                    }

                    .btn-add-purchase .me-2,
                    .btn-add-sale .me-2 {
                        margin-right: 0.25rem !important;
                        font-size: 0.9rem;
                    }

                    .btn-icon-only {
                        min-width: 32px;
                        padding: 0.375rem 0.375rem;
                    }

                    .search-input {
                        font-size: 0.85rem;
                    }
                }

                /* Enhanced Animations */
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

                .purchase-header-navbar {
                    animation: slideInDown 0.4s ease-out;
                }

                .search-group {
                    animation: slideInDown 0.5s ease-out;
                }

                .d-flex.gap-2 {
                    animation: slideInDown 0.6s ease-out;
                }

                .btn-group {
                    animation: slideInDown 0.7s ease-out;
                }

                /* Enhanced Focus States for Accessibility */
                .btn-add-purchase:focus-visible:not(:disabled),
                .btn-add-sale:focus-visible:not(:disabled),
                .btn-icon-only:focus-visible {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.25) !important;
                }

                /* Loading States */
                .btn-add-purchase.loading,
                .btn-add-sale.loading {
                    opacity: 0.7;
                    pointer-events: none;
                }

                .btn-add-purchase.loading::after,
                .btn-add-sale.loading::after {
                    content: '';
                    width: 12px;
                    height: 12px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-left: 0.5rem;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Purple Theme Enhancements */
                .purchase-header-navbar::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, #6c63ff 50%, transparent 100%);
                    opacity: 0.6;
                }

                /* Hover Glow Effects */
                .btn-add-purchase:hover:not(:disabled),
                .btn-add-sale:hover:not(:disabled) {
                    position: relative;
                    overflow: hidden;
                }

                .btn-add-purchase:hover:not(:disabled)::before,
                .btn-add-sale:hover:not(:disabled)::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                    animation: shimmer 0.6s ease-out;
                }

                @keyframes shimmer {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }

                /* Bootstrap Gap Utilities Enhancement */
                .gap-2 {
                    gap: 0.5rem !important;
                }

                /* Enhanced container padding */
                .container-fluid {
                    padding-left: 1.5rem;
                    padding-right: 1.5rem;
                }

                @media (max-width: 575.98px) {
                    .container-fluid {
                        padding-left: 1rem;
                        padding-right: 1rem;
                    }
                }

                /* Button states for better UX */
                .btn-add-purchase:not(:disabled),
                .btn-add-sale:not(:disabled) {
                    cursor: pointer;
                    user-select: none;
                }

                .btn-add-purchase:disabled,
                .btn-add-sale:disabled {
                    cursor: not-allowed;
                    user-select: none;
                }

                /* Tooltip enhancement */
                .btn-add-purchase[disabled]::after,
                .btn-add-sale[disabled]::after {
                    content: attr(title);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                    z-index: 1060;
                }

                .btn-add-purchase[disabled]:hover::after,
                .btn-add-sale[disabled]:hover::after {
                    opacity: 1;
                }
                `}
            </style>
        </>
    );
}

export default PurchaseBillsHeader;