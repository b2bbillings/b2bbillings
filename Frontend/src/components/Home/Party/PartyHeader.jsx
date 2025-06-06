import React from 'react';
import { Navbar, Container, Row, Col, InputGroup, Form, Button, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faPlus, 
    faEllipsisH, 
    faCog, 
    faRefresh,
    faChevronDown,
    faDownload
} from '@fortawesome/free-solid-svg-icons';

function PartyHeader({
    activeType,
    onTypeChange,
    transactionSearchQuery,
    onTransactionSearchChange,
    totalParties,
    onAddParty,
    onAddSale,
    onAddPurchase,
    onRefreshParties,
    isLoadingParties,
    onMoreOptions,
    onSettings,
    onExportParties
}) {
    return (
        <>
            <Navbar bg="white" className="border-bottom shadow-sm sticky-top">
                <Container fluid className="px-4 py-3">
                    <Row className="w-100 align-items-center">
                        {/* Left side - Party Type Toggle */}
                        <Col md={3} lg={3} xl={2}>
                            <Dropdown>
                                <Dropdown.Toggle
                                    variant="link"
                                    className="text-dark text-decoration-none p-0 border-0 shadow-none bg-transparent party-dropdown-toggle"
                                    id="parties-dropdown"
                                >
                                    <h5 className="mb-0 fw-bold d-flex align-items-center party-title">
                                        Parties ({totalParties})
                                        <FontAwesomeIcon icon={faChevronDown} className="ms-2" size="sm" />
                                    </h5>
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="shadow border-0 party-dropdown-menu">
                                    <Dropdown.Item 
                                        className="py-2 party-dropdown-item" 
                                        onClick={() => onTypeChange('all')}
                                        active={activeType === 'all'}
                                    >
                                        All Parties
                                    </Dropdown.Item>
                                    <Dropdown.Item 
                                        className="py-2 party-dropdown-item"
                                        onClick={() => onTypeChange('customer')}
                                        active={activeType === 'customer'}
                                    >
                                        Customers
                                    </Dropdown.Item>
                                    <Dropdown.Item 
                                        className="py-2 party-dropdown-item"
                                        onClick={() => onTypeChange('vendor')}
                                        active={activeType === 'vendor'}
                                    >
                                        Vendors
                                    </Dropdown.Item>
                                    <Dropdown.Item 
                                        className="py-2 party-dropdown-item"
                                        onClick={() => onTypeChange('both')}
                                        active={activeType === 'both'}
                                    >
                                        Both
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item 
                                        className="py-2 party-dropdown-item" 
                                        onClick={onExportParties}
                                    >
                                        <FontAwesomeIcon icon={faDownload} className="me-2" />
                                        Export Parties
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Col>

                        {/* Center - Search */}
                        <Col md={5} lg={5} xl={6}>
                            <InputGroup size="sm" className="search-group mx-auto">
                                <InputGroup.Text className="bg-light border-end-0">
                                    <FontAwesomeIcon icon={faSearch} className="text-muted" size="sm" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search transactions, parties, payments..."
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
                                    variant="outline-info"
                                    size="sm"
                                    className="btn-icon"
                                    onClick={onRefreshParties}
                                    disabled={isLoadingParties}
                                    title="Refresh parties"
                                >
                                    <FontAwesomeIcon 
                                        icon={faRefresh} 
                                        size="sm"
                                        className={isLoadingParties ? 'fa-spin' : ''} 
                                    />
                                </Button>
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="btn-add-party fw-semibold"
                                    onClick={onAddParty}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-2" size="xs" />
                                    <span className="btn-text small">Add Party</span>
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

            {/* Custom Styles matching InventoryHeader theme */}
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

                /* Party Title Styling */
                .party-title {
                    font-size: 16px;
                    color: #212529;
                    transition: all 0.2s ease;
                }

                .party-dropdown-toggle:hover .party-title {
                    color: #007bff;
                }

                /* Party Dropdown Menu */
                .party-dropdown-menu {
                    border-radius: 8px;
                    padding: 0.5rem 0;
                    min-width: 180px;
                }

                .party-dropdown-item {
                    font-size: 13px;
                    padding: 0.5rem 1rem;
                    transition: all 0.2s ease;
                }

                .party-dropdown-item:hover {
                    background: #f8f9fa;
                    color: #007bff;
                }

                .party-dropdown-item.active {
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    color: white;
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

                .btn-add-party {
                    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
                    border: none !important;
                    color: white !important;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .btn-add-party:hover {
                    background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%) !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
                    color: white !important;
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

                .btn-icon:disabled {
                    opacity: 0.6;
                    transform: none !important;
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
                    .btn-add-purchase,
                    .btn-add-party {
                        padding: 0.4rem 0.8rem;
                    }

                    .btn-text {
                        font-size: 0.75rem;
                    }

                    .party-title {
                        font-size: 14px;
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
                    .btn-add-purchase,
                    .btn-add-party {
                        flex: 1 1 auto;
                        min-width: 110px;
                        margin-bottom: 0.5rem;
                    }

                    .btn-icon {
                        flex: 0 0 auto;
                        min-width: 36px;
                        margin: 0 0.2rem;
                    }

                    .party-title {
                        font-size: 14px;
                        margin-bottom: 0.5rem;
                        text-align: center;
                    }
                }

                @media (max-width: 576px) {
                    .container-fluid {
                        padding: 0.5rem !important;
                    }

                    .btn-add-sale,
                    .btn-add-purchase,
                    .btn-add-party {
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

                    .party-title {
                        font-size: 13px;
                    }

                    .search-group {
                        margin-bottom: 0.5rem;
                    }
                }

                /* Focus states for accessibility */
                .btn-add-sale:focus,
                .btn-add-purchase:focus,
                .btn-add-party:focus,
                .btn-icon:focus {
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
                }

                /* Spinner animation for refresh button */
                .fa-spin {
                    animation: fa-spin 2s infinite linear;
                }

                @keyframes fa-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>
        </>
    );
}

export default PartyHeader;