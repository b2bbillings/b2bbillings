import React from 'react';
import { Navbar, Container, Row, Col, InputGroup, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus, faEllipsisH, faCog } from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesHeader({
    searchTerm,
    onSearchChange,
    onAddSale,
    onAddPurchase,
    onMoreOptions,
    onSettings
}) {
    return (
        <>
            <Navbar className="sales-header-navbar sticky-top">
                <Container fluid className="header-container">
                    <Row className="w-100 align-items-center">
                        {/* Left side - Search */}
                        <Col md={6} lg={5}>
                            <InputGroup size="sm" className="search-group">
                                <InputGroup.Text className="search-icon-wrapper">
                                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search invoices, customers, items..."
                                    value={searchTerm}
                                    onChange={onSearchChange}
                                    className="search-input"
                                />
                            </InputGroup>
                        </Col>

                        {/* Right side - Action buttons */}
                        <Col md={6} lg={7}>
                            <div className="action-buttons-container">
                                <Button
                                    variant="success"
                                    size="sm"
                                    className="btn-add-sale"
                                    onClick={onAddSale}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-2 btn-icon" />
                                    <span className="btn-text">Add Sale</span>
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="btn-add-purchase"
                                    onClick={onAddPurchase}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-2 btn-icon" />
                                    <span className="btn-text">Add Purchase</span>
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="btn-icon-only"
                                    onClick={onMoreOptions}
                                    title="More Options"
                                >
                                    <FontAwesomeIcon icon={faEllipsisH} />
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="btn-icon-only"
                                    onClick={onSettings}
                                    title="Settings"
                                >
                                    <FontAwesomeIcon icon={faCog} />
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </Navbar>

            {/* Enhanced Purple Theme Styles */}
            <style>
                {`
                .sales-header-navbar {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%);
                    border-bottom: 1px solid rgba(108, 99, 255, 0.1);
                    box-shadow: 0 2px 15px rgba(108, 99, 255, 0.08);
                    backdrop-filter: blur(10px);
                    z-index: 1020;
                }

                .header-container {
                    padding: 1rem 1.5rem;
                }

                .search-group {
                    max-width: 400px;
                    width: 100%;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(108, 99, 255, 0.1);
                    transition: all 0.3s ease;
                }

                .search-group:focus-within {
                    box-shadow: 0 4px 20px rgba(108, 99, 255, 0.2);
                    transform: translateY(-1px);
                }

                .search-icon-wrapper {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.1) 0%, rgba(156, 136, 255, 0.1) 100%);
                    border: 1px solid rgba(108, 99, 255, 0.2);
                    border-right: none;
                    padding: 0.6rem 0.8rem;
                }

                .search-icon {
                    color: #6c63ff;
                    font-size: 0.85rem;
                }

                .search-input {
                    border: 1px solid rgba(108, 99, 255, 0.2);
                    border-left: none;
                    background: rgba(255, 255, 255, 0.9);
                    color: #495057;
                    font-size: 0.85rem;
                    padding: 0.6rem 0.8rem;
                    transition: all 0.3s ease;
                }

                .search-input:focus {
                    background: white;
                    border-color: rgba(108, 99, 255, 0.3);
                    box-shadow: none;
                    color: #495057;
                }

                .search-input::placeholder {
                    color: rgba(108, 99, 255, 0.6);
                    opacity: 0.8;
                    font-weight: 400;
                }

                .action-buttons-container {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                }

                .btn-add-sale {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                    border: none;
                    border-radius: 8px;
                    padding: 0.6rem 1.2rem;
                    font-weight: 600;
                    font-size: 0.8rem;
                    color: white;
                    box-shadow: 0 3px 12px rgba(16, 185, 129, 0.2);
                    transition: all 0.3s ease;
                    white-space: nowrap;
                    letter-spacing: 0.3px;
                }

                .btn-add-sale:hover {
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
                    color: white;
                }

                .btn-add-sale:focus {
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                    box-shadow: 0 0 0 0.2rem rgba(16, 185, 129, 0.25);
                    color: white;
                }

                .btn-add-sale:active {
                    background: linear-gradient(135deg, #047857 0%, #059669 100%);
                    transform: translateY(0);
                    color: white;
                }

                .btn-add-purchase {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    border: none;
                    border-radius: 8px;
                    padding: 0.6rem 1.2rem;
                    font-weight: 600;
                    font-size: 0.8rem;
                    color: white;
                    box-shadow: 0 3px 12px rgba(108, 99, 255, 0.2);
                    transition: all 0.3s ease;
                    white-space: nowrap;
                    letter-spacing: 0.3px;
                }

                .btn-add-purchase:hover {
                    background: linear-gradient(135deg, #5a52d5 0%, #8a7ae8 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(108, 99, 255, 0.3);
                    color: white;
                }

                .btn-add-purchase:focus {
                    background: linear-gradient(135deg, #5a52d5 0%, #8a7ae8 100%);
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.25);
                    color: white;
                }

                .btn-add-purchase:active {
                    background: linear-gradient(135deg, #4c46c7 0%, #7c6cda 100%);
                    transform: translateY(0);
                    color: white;
                }

                .btn-icon-only {
                    background: rgba(255, 255, 255, 0.8);
                    border: 1px solid rgba(108, 99, 255, 0.2);
                    border-radius: 8px;
                    padding: 0.6rem 0.8rem;
                    color: #6c63ff;
                    transition: all 0.3s ease;
                    min-width: 42px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-icon-only:hover {
                    background: rgba(108, 99, 255, 0.1);
                    border-color: rgba(108, 99, 255, 0.3);
                    color: #5a52d5;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.15);
                }

                .btn-icon-only:focus {
                    background: rgba(108, 99, 255, 0.1);
                    border-color: rgba(108, 99, 255, 0.3);
                    color: #5a52d5;
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.25);
                }

                .btn-icon-only:active {
                    background: rgba(108, 99, 255, 0.15);
                    color: #4c46c7;
                    transform: translateY(0);
                }

                .btn-icon {
                    font-size: 0.75rem;
                }

                .btn-text {
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                /* Responsive Design */
                @media (max-width: 992px) {
                    .header-container {
                        padding: 0.875rem 1.25rem;
                    }

                    .search-group {
                        max-width: 320px;
                    }

                    .btn-add-sale,
                    .btn-add-purchase {
                        padding: 0.5rem 1rem;
                        font-size: 0.75rem;
                    }

                    .btn-icon-only {
                        padding: 0.5rem 0.7rem;
                        min-width: 38px;
                    }

                    .action-buttons-container {
                        gap: 0.5rem;
                    }
                }

                @media (max-width: 768px) {
                    .header-container .row {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .search-group {
                        max-width: 100%;
                    }

                    .action-buttons-container {
                        justify-content: center;
                        gap: 0.6rem;
                    }

                    .btn-add-sale,
                    .btn-add-purchase {
                        flex: 1;
                        min-width: 100px;
                        max-width: 140px;
                    }

                    .btn-icon-only {
                        flex: 0 0 auto;
                    }
                }

                @media (max-width: 576px) {
                    .header-container {
                        padding: 0.75rem 1rem;
                    }

                    .btn-add-sale,
                    .btn-add-purchase {
                        padding: 0.5rem 0.8rem;
                        font-size: 0.7rem;
                    }

                    .btn-text {
                        display: none;
                    }

                    .btn-icon {
                        margin-right: 0 !important;
                        font-size: 0.8rem;
                    }

                    .btn-icon-only {
                        padding: 0.5rem;
                        min-width: 36px;
                    }

                    .action-buttons-container {
                        gap: 0.4rem;
                    }

                    .search-icon-wrapper {
                        padding: 0.5rem 0.7rem;
                    }

                    .search-input {
                        padding: 0.5rem 0.7rem;
                        font-size: 0.8rem;
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

                .sales-header-navbar {
                    animation: slideInDown 0.4s ease-out;
                }

                .search-group {
                    animation: slideInDown 0.5s ease-out;
                }

                .action-buttons-container > * {
                    animation: slideInDown 0.6s ease-out;
                }

                .action-buttons-container > *:nth-child(1) { animation-delay: 0.1s; }
                .action-buttons-container > *:nth-child(2) { animation-delay: 0.15s; }
                .action-buttons-container > *:nth-child(3) { animation-delay: 0.2s; }
                .action-buttons-container > *:nth-child(4) { animation-delay: 0.25s; }

                /* Enhanced Focus States for Accessibility */
                .btn-add-sale:focus-visible,
                .btn-add-purchase:focus-visible,
                .btn-icon-only:focus-visible {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.25);
                }

                /* Loading States (for future use) */
                .btn-add-sale.loading,
                .btn-add-purchase.loading {
                    opacity: 0.7;
                    pointer-events: none;
                }

                .btn-add-sale.loading::after,
                .btn-add-purchase.loading::after {
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
                .sales-header-navbar::before {
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
                .btn-add-sale:hover,
                .btn-add-purchase:hover {
                    position: relative;
                    overflow: hidden;
                }

                .btn-add-sale:hover::before,
                .btn-add-purchase:hover::before {
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
                `}
            </style>
        </>
    );
}

export default SalesInvoicesHeader;