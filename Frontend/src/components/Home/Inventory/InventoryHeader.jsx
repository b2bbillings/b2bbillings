import React from 'react';
import { Navbar, Container, Row, Col, InputGroup, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus, faEllipsisH, faCog, faUpload } from '@fortawesome/free-solid-svg-icons';

function InventoryHeader({
    activeType,
    onTypeChange,
    transactionSearchQuery,
    onTransactionSearchChange,
    onAddSale,
    onAddPurchase,
    onBulkImport,
    onMoreOptions,
    onSettings
}) {
    return (
        <>
            <Navbar bg="white" className="border-bottom shadow-sm sticky-top">
                <Container fluid className="px-4 py-3">
                    <Row className="w-100 align-items-center">
                        {/* Left side - Type Toggle */}
                        <Col md={3} lg={3} xl={2}>
                            <div className="btn-group w-100" role="group">
                                <Button
                                    variant={activeType === 'products' ? 'success' : 'outline-success'}
                                    size="sm"
                                    className="type-toggle-btn"
                                    onClick={() => onTypeChange('products')}
                                >
                                    Products
                                </Button>
                                <Button
                                    variant={activeType === 'services' ? 'warning' : 'outline-warning'}
                                    size="sm"
                                    className="type-toggle-btn"
                                    onClick={() => onTypeChange('services')}
                                >
                                    Services
                                </Button>
                            </div>
                        </Col>

                        {/* Center - Search */}
                        <Col md={5} lg={5} xl={6}>
                            <InputGroup size="sm" className="search-group mx-auto">
                                <InputGroup.Text className="bg-light border-end-0">
                                    <FontAwesomeIcon icon={faSearch} className="text-muted" size="sm" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder={`Search ${activeType}, transactions, categories...`}
                                    value={transactionSearchQuery}
                                    onChange={(e) => onTransactionSearchChange(e.target.value)}
                                    className="search-input border-start-0 bg-light text-dark"
                                    style={{ fontSize: '0.875rem' }}
                                />
                            </InputGroup>
                        </Col>

                        {/* Right side - Action buttons */}
                        <Col md={4} lg={4} xl={4}>
                            <div className="d-flex gap-2 justify-content-end flex-wrap align-items-center">
                                <Button
                                    variant="success"
                                    size="sm"
                                    className="btn-add-sale fw-semibold"
                                    onClick={onAddSale}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-2" size="xs" />
                                    <span className="btn-text small">Add Sale</span>
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="btn-add-purchase fw-semibold"
                                    onClick={onAddPurchase}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-2" size="xs" />
                                    <span className="btn-text small">Add Purchase</span>
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="btn-icon"
                                    onClick={onBulkImport}
                                    title="Bulk Import"
                                >
                                    <FontAwesomeIcon icon={faUpload} size="sm" />
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="btn-icon"
                                    onClick={onMoreOptions}
                                    title="More Options"
                                >
                                    <FontAwesomeIcon icon={faEllipsisH} size="sm" />
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="btn-icon"
                                    onClick={onSettings}
                                    title="Settings"
                                >
                                    <FontAwesomeIcon icon={faCog} size="sm" />
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </Navbar>

            {/* Minimal Custom Styles */}
            <style>
                {`
                .search-group {
                    max-width: 450px;
                    width: 100%;
                }

                .search-input {
                    color: #495057 !important;
                }

                .search-input:focus {
                    color: #495057 !important;
                    background-color: white !important;
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                }

                .search-input::placeholder {
                    color: #6c757d !important;
                    opacity: 0.8;
                }

                /* Type Toggle Buttons */
                .type-toggle-btn {
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.45rem 0.9rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    border-width: 1px;
                }

                /* Products Button - Green Theme */
                .btn-outline-success.type-toggle-btn {
                    color: #198754;
                    border-color: #198754;
                    background: transparent;
                }

                .btn-outline-success.type-toggle-btn:hover {
                    background: #198754;
                    border-color: #198754;
                    color: white;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(25, 135, 84, 0.3);
                }

                .btn-success.type-toggle-btn {
                    background: linear-gradient(135deg, #198754 0%, #20c997 100%) !important;
                    border-color: #198754 !important;
                    color: white !important;
                    box-shadow: 0 2px 8px rgba(25, 135, 84, 0.3);
                }

                /* Services Button - Orange Theme */
                .btn-outline-warning.type-toggle-btn {
                    color: #fd7e14;
                    border-color: #fd7e14;
                    background: transparent;
                }

                .btn-outline-warning.type-toggle-btn:hover {
                    background: #fd7e14;
                    border-color: #fd7e14;
                    color: white;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(253, 126, 20, 0.3);
                }

                .btn-warning.type-toggle-btn {
                    background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%) !important;
                    border-color: #fd7e14 !important;
                    color: white !important;
                    box-shadow: 0 2px 8px rgba(253, 126, 20, 0.3);
                }

                /* Action Buttons */
                .btn-add-sale {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
                    border: none !important;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .btn-add-sale:hover {
                    background: linear-gradient(135deg, #218838 0%, #1ba085 100%) !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
                }

                .btn-add-purchase {
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
                    border: none !important;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .btn-add-purchase:hover {
                    background: linear-gradient(135deg, #0056b3 0%, #004085 100%) !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
                }

                .btn-icon {
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    min-width: 40px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-icon:hover {
                    background: #f8f9fa !important;
                    border-color: #007bff !important;
                    color: #007bff !important;
                    transform: translateY(-1px);
                }

                /* Responsive Design */
                @media (max-width: 1200px) {
                    .search-group {
                        max-width: 350px;
                    }
                }

                @media (max-width: 992px) {
                    .search-group {
                        max-width: 300px;
                    }

                    .btn-add-sale,
                    .btn-add-purchase {
                        padding: 0.4rem 0.8rem;
                    }

                    .btn-text {
                        font-size: 0.75rem;
                    }

                    .type-toggle-btn {
                        padding: 0.4rem 0.7rem;
                        font-size: 0.7rem;
                    }
                }

                @media (max-width: 768px) {
                    .container-fluid .row {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: stretch;
                    }

                    .search-group {
                        max-width: 100%;
                    }

                    .d-flex {
                        justify-content: center !important;
                        flex-wrap: wrap;
                    }

                    .btn-add-sale,
                    .btn-add-purchase {
                        flex: 1 1 auto;
                        min-width: 110px;
                        margin-bottom: 0.5rem;
                    }

                    .btn-icon {
                        flex: 0 0 auto;
                        min-width: 36px;
                        margin: 0 0.2rem;
                    }

                    .btn-group {
                        margin-bottom: 0.5rem;
                        width: 100%;
                        max-width: 250px;
                        margin-left: auto;
                        margin-right: auto;
                    }
                }

                @media (max-width: 576px) {
                    .container-fluid {
                        padding: 0.5rem !important;
                    }

                    .btn-add-sale,
                    .btn-add-purchase {
                        padding: 0.375rem 0.6rem;
                        flex: 1 1 45%;
                        min-width: 100px;
                    }

                    .btn-text {
                        font-size: 0.7rem;
                    }

                    .btn-icon {
                        padding: 0.375rem 0.5rem;
                        min-width: 32px;
                        height: 32px;
                    }

                    .type-toggle-btn {
                        padding: 0.35rem 0.6rem;
                        font-size: 0.65rem;
                    }

                    .search-group {
                        margin-bottom: 0.5rem;
                    }
                }

                /* Focus states for accessibility */
                .btn-add-sale:focus,
                .btn-add-purchase:focus,
                .btn-icon:focus,
                .type-toggle-btn:focus {
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
                }

                /* Better button group alignment */
                .btn-group .btn {
                    position: relative;
                    flex: 1 1 auto;
                }

                .btn-group .btn:first-child {
                    border-top-right-radius: 0;
                    border-bottom-right-radius: 0;
                }

                .btn-group .btn:last-child {
                    border-top-left-radius: 0;
                    border-bottom-left-radius: 0;
                }
                `}
            </style>
        </>
    );
}

export default InventoryHeader;