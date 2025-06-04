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
            <Navbar bg="white" className="border-bottom shadow-sm sticky-top">
                <Container fluid className="px-4 py-3">
                    <Row className="w-100 align-items-center">
                        {/* Left side - Search */}
                        <Col md={6} lg={5}>
                            <InputGroup size="sm" className="search-group">
                                <InputGroup.Text className="bg-light border-end-0">
                                    <FontAwesomeIcon icon={faSearch} className="text-muted" size="sm" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search invoices, customers, items..."
                                    value={searchTerm}
                                    onChange={onSearchChange}
                                    className="search-input border-start-0 bg-light text-dark"
                                    style={{fontSize: '0.875rem'}}
                                />
                            </InputGroup>
                        </Col>

                        {/* Right side - Action buttons */}
                        <Col md={6} lg={7}>
                            <div className="d-flex gap-2 justify-content-end flex-wrap">
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
                    max-width: 400px;
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
                }

                .btn-icon:hover {
                    background: #f8f9fa !important;
                    border-color: #007bff !important;
                    color: #007bff !important;
                    transform: translateY(-1px);
                }

                /* Responsive Design */
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
                }

                @media (max-width: 768px) {
                    .container-fluid .row {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .search-group {
                        max-width: 100%;
                    }

                    .d-flex {
                        justify-content: center !important;
                    }

                    .btn-add-sale,
                    .btn-add-purchase {
                        flex: 1;
                        min-width: 90px;
                    }

                    .btn-icon {
                        flex: 0 0 auto;
                        min-width: 36px;
                    }
                }

                @media (max-width: 576px) {
                    .container-fluid {
                        padding: 0.5rem !important;
                    }

                    .btn-add-sale,
                    .btn-add-purchase {
                        padding: 0.375rem 0.5rem;
                    }

                    .btn-text {
                        display: none;
                    }

                    .fa-plus {
                        margin-right: 0 !important;
                    }

                    .btn-icon {
                        padding: 0.375rem 0.5rem;
                        min-width: 32px;
                    }
                }

                /* Focus states for accessibility */
                .btn-add-sale:focus,
                .btn-add-purchase:focus,
                .btn-icon:focus {
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
                }
                `}
            </style>
        </>
    );
}

export default SalesInvoicesHeader;