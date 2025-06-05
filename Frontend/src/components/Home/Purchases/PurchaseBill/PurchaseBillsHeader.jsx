import React from 'react';
import { Container, Row, Col, Button, InputGroup, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUpload,
    faPlus,
    faReceipt,
    faSearch,
    faEllipsisH,
    faCog,
    faChevronDown
} from '@fortawesome/free-solid-svg-icons';

function PurchaseBillsHeader({
    onUploadBill,
    onAddPurchase,
    searchTerm,
    onSearchChange,
    onMoreOptions,
    onSettings
}) {
    return (
        <>
            {/* Search Transaction Section */}
            <div className="search-transaction-section">
                <Container fluid>
                    <Row className="align-items-center">
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
                                    onClick={onAddPurchase}
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
            </div>

            {/* Purchase Bills Page Title Section */}
            <div className="page-title-section">
                <Container fluid>
                    <Row className="align-items-center">
                        <Col>
                            <div className="d-flex align-items-center">
                                <div className="page-icon">
                                    <FontAwesomeIcon icon={faReceipt} />
                                </div>
                                <div className="page-title-content">
                                    <h4 className="page-title-text mb-0">Purchase Bills</h4>
                                    <small className="page-subtitle text-muted">
                                        Manage your purchase transactions
                                    </small>
                                </div>
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className="page-dropdown-icon ms-2"
                                />
                            </div>
                        </Col>
                        <Col xs="auto">
                            <div className="d-flex gap-2">
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="upload-bill-btn d-flex align-items-center"
                                    onClick={onUploadBill}
                                >
                                    <FontAwesomeIcon icon={faUpload} className="me-2" />
                                    Upload Bill
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="add-purchase-btn d-flex align-items-center"
                                    onClick={onAddPurchase}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                                    Add Purchase
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Enhanced Purple Theme Styles */}
            <style>
                {`
                /* Search Transaction Section Styles */
                .search-transaction-section {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%);
                    border-bottom: 1px solid rgba(108, 99, 255, 0.1);
                    box-shadow: 0 2px 15px rgba(108, 99, 255, 0.08);
                    backdrop-filter: blur(10px);
                    z-index: 1020;
                    padding: 1rem 0;
                    margin-bottom: 0;
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

                .btn-icon {
                    font-size: 0.75rem;
                }

                .btn-text {
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                /* Page Title Section Styles */
                .page-title-section {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%);
                    border-bottom: 1px solid rgba(108, 99, 255, 0.1);
                    padding: 1.25rem 0;
                    margin-bottom: 1.5rem;
                    backdrop-filter: blur(10px);
                }

                .page-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.2rem;
                    margin-right: 1rem;
                    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);
                    transition: all 0.3s ease;
                }

                .page-icon:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);
                }

                .page-title-content {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .page-title-text {
                    font-weight: 700;
                    color: #2d3748;
                    font-size: 1.5rem;
                    line-height: 1.2;
                    margin-bottom: 0.25rem !important;
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .page-subtitle {
                    font-size: 0.8rem;
                    color: #6b7280;
                    font-weight: 500;
                    letter-spacing: 0.3px;
                }

                .page-dropdown-icon {
                    color: #9ca3af;
                    font-size: 0.7rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    opacity: 0.6;
                }

                .page-dropdown-icon:hover {
                    color: #6c63ff;
                    opacity: 1;
                    transform: translateY(1px);
                }

                .upload-bill-btn {
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(108, 99, 255, 0.3);
                    border-radius: 8px;
                    padding: 0.6rem 1.2rem;
                    font-weight: 600;
                    font-size: 0.85rem;
                    color: #6c63ff;
                    transition: all 0.3s ease;
                }

                .upload-bill-btn:hover {
                    background: rgba(108, 99, 255, 0.1);
                    border-color: rgba(108, 99, 255, 0.4);
                    color: #5a52d5;
                    transform: translateY(-1px);
                }

                .add-purchase-btn {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    border: none;
                    border-radius: 8px;
                    padding: 0.6rem 1.2rem;
                    font-weight: 600;
                    font-size: 0.85rem;
                    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);
                    transition: all 0.3s ease;
                }

                .add-purchase-btn:hover {
                    background: linear-gradient(135deg, #5a52d5 0%, #8a7ae8 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .search-transaction-section,
                    .page-title-section {
                        padding: 1rem 0;
                    }

                    .search-transaction-section .row,
                    .page-title-section .row {
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

                    .page-icon {
                        width: 40px;
                        height: 40px;
                        font-size: 1rem;
                        margin-right: 0.75rem;
                    }

                    .page-title-text {
                        font-size: 1.3rem;
                    }

                    .page-subtitle {
                        font-size: 0.75rem;
                    }
                }

                @media (max-width: 576px) {
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

                    .page-icon {
                        width: 36px;
                        height: 36px;
                        font-size: 0.9rem;
                        margin-right: 0.5rem;
                    }

                    .page-title-text {
                        font-size: 1.2rem;
                    }

                    .page-subtitle {
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

                .search-transaction-section {
                    animation: slideInDown 0.4s ease-out;
                }

                .page-title-section {
                    animation: slideInDown 0.5s ease-out;
                }

                .search-group {
                    animation: slideInDown 0.6s ease-out;
                }

                .action-buttons-container > * {
                    animation: slideInDown 0.7s ease-out;
                }

                .page-icon {
                    animation: slideInDown 0.8s ease-out;
                }

                .page-title-content {
                    animation: slideInDown 0.9s ease-out;
                }

                /* Enhanced Purple Theme Integration */
                .search-transaction-section::before,
                .page-title-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, #6c63ff 50%, transparent 100%);
                    opacity: 0.6;
                }
                `}
            </style>
        </>
    );
}

export default PurchaseBillsHeader;