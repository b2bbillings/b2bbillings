import React from 'react';
import { Container, Row, Col, InputGroup, Form, Button, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faPlus,
    faEllipsisH,
    faCog,
    faRefresh,
    faChevronDown,
    faDownload,
    faUsers
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
    const getPartyTypeText = () => {
        switch (activeType) {
            case 'customer': return 'Customers';
            case 'vendor': return 'Vendors';
            case 'supplier': return 'Suppliers';
            case 'both': return 'Both';
            default: return 'All Parties';
        }
    };

    return (
        <>
            {/* Main Header Section */}
            <div className="party-header-wrapper">
                <Container fluid>
                    {/* First Row - Search and Action Buttons */}
                    <Row className="align-items-center mb-2">
                        <Col md={8}>
                            <InputGroup size="sm" className="search-group">
                                <InputGroup.Text className="search-icon-wrapper">
                                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search parties, customers, vendors..."
                                    value={transactionSearchQuery}
                                    onChange={(e) => onTransactionSearchChange(e.target.value)}
                                    className="search-input"
                                />
                            </InputGroup>
                        </Col>
                        <Col md={4}>
                            <div className="d-flex gap-1 justify-content-end">
                                <Button
                                    size="sm"
                                    className="btn-add-sale"
                                    onClick={onAddSale}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" size="sm" />
                                    Add Sale
                                </Button>
                                <Button
                                    size="sm"
                                    className="btn-add-purchase"
                                    onClick={onAddPurchase}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" size="sm" />
                                    Add Purchase
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="btn-icon-only"
                                    onClick={onRefreshParties}
                                    disabled={isLoadingParties}
                                    title="Refresh"
                                >
                                    <FontAwesomeIcon
                                        icon={faRefresh}
                                        size="sm"
                                        className={isLoadingParties ? 'fa-spin' : ''}
                                    />
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="btn-icon-only"
                                    onClick={onMoreOptions}
                                    title="More Options"
                                >
                                    <FontAwesomeIcon icon={faEllipsisH} size="sm" />
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Parties Section Header */}
            <div className="parties-section-header">
                <Container fluid>
                    <Row className="align-items-center">
                        <Col md={8}>
                            <div className="d-flex align-items-center">
                                <div className="section-icon-wrapper me-2">
                                    <FontAwesomeIcon icon={faUsers} />
                                </div>
                                <div>
                                    <h4 className="section-title mb-0">Parties</h4>
                                    <p className="section-subtitle mb-0">Manage your customers & vendors</p>
                                </div>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="d-flex gap-1 justify-content-end">
                                <Button
                                    size="sm"
                                    className="btn-add-party"
                                    onClick={onAddParty}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" size="sm" />
                                    Add Party
                                </Button>
                            </div>
                        </Col>
                    </Row>

                    {/* Filter Options Row */}
                    <Row className="mt-2 align-items-center">
                        <Col md={3}>
                            <Dropdown>
                                <Dropdown.Toggle
                                    variant="outline-secondary"
                                    size="sm"
                                    className="party-dropdown-toggle w-100"
                                    id="party-type-dropdown"
                                >
                                    <FontAwesomeIcon icon={faChevronDown} className="me-1" size="xs" />
                                    {getPartyTypeText()} ({totalParties})
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="party-dropdown-menu">
                                    <Dropdown.Item
                                        onClick={() => onTypeChange('all')}
                                        active={activeType === 'all'}
                                    >
                                        All Parties
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => onTypeChange('customer')}
                                        active={activeType === 'customer'}
                                    >
                                        Customers
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => onTypeChange('vendor')}
                                        active={activeType === 'vendor'}
                                    >
                                        Vendors
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => onTypeChange('supplier')}
                                        active={activeType === 'supplier'}
                                    >
                                        Suppliers
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => onTypeChange('both')}
                                        active={activeType === 'both'}
                                    >
                                        Both
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={onExportParties}>
                                        <FontAwesomeIcon icon={faDownload} className="me-1" size="sm" />
                                        Export Parties
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Col>
                        <Col md={6}>
                            {/* Optional: Additional filters can go here */}
                        </Col>
                        <Col md={3}>
                            <div className="d-flex gap-1 justify-content-end">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="btn-icon-only"
                                    onClick={onSettings}
                                    title="Settings"
                                >
                                    <FontAwesomeIcon icon={faCog} size="sm" />
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            <style>
                {`
                /* Main Header Wrapper - reduced padding */
                .party-header-wrapper {
                    background: #f8f9ff;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #e5e7eb;
                }

                /* Search Group - fixed styling */
                .search-group {
                    max-width: 400px;
                    border-radius: 6px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .search-icon-wrapper {
                    background: white;
                    border: 1px solid #d1d5db;
                    border-right: none;
                    padding: 0.4rem 0.6rem;
                }

                .search-icon {
                
                    font-size: 0.75rem;
                }

                 .search-input {
                    border: 1px solid #d1d5db !important;
                    border-left: none !important;
                    background: white !important;
                    color: #9ca3af !important;
                    font-size: 0.75rem;
                    padding: 0.4rem 0.6rem;
                    transition: all 0.2s ease;
                }
                    

                .search-input:focus {
                    background: white !important;
                    border-color: #8b5cf6 !important;
                    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1) !important;
                    color: #9ca3af !important;
                    outline: none;
                }

                .search-input::placeholder {
                    color: #374151 !important;
                    font-weight: 500;
                    opacity: 1;
                }
                /* Button Styles - smaller sizes */
                .btn-add-sale {
                    background: #10b981;
                    border: none;
                    border-radius: 4px;
                    padding: 0.4rem 0.75rem;
                    font-weight: 500;
                    font-size: 0.7rem;
                    color: white;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .btn-add-sale:hover {
                    background: #059669;
                    color: white;
                    transform: translateY(-1px);
                }

                .btn-add-purchase {
                    background: #8b5cf6;
                    border: none;
                    border-radius: 4px;
                    padding: 0.4rem 0.75rem;
                    font-weight: 500;
                    font-size: 0.7rem;
                    color: white;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .btn-add-purchase:hover {
                    background: #7c3aed;
                    color: white;
                    transform: translateY(-1px);
                }

                .btn-add-party {
                    background: #8b5cf6;
                    border: none;
                    border-radius: 4px;
                    padding: 0.4rem 0.75rem;
                    font-weight: 500;
                    font-size: 0.7rem;
                    color: white;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .btn-add-party:hover {
                    background: #7c3aed;
                    color: white;
                    transform: translateY(-1px);
                }

                .btn-icon-only {
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    padding: 0.4rem;
                    color: #6b7280;
                    transition: all 0.2s ease;
                    min-width: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-icon-only:hover {
                    background: #f9fafb;
                    border-color: #8b5cf6;
                    color: #8b5cf6;
                }

                .btn-icon-only:disabled {
                    opacity: 0.6;
                    transform: none !important;
                }

                /* Parties Section Header - reduced height */
                .parties-section-header {
                    background: white;
                    padding: 1rem 0 0.75rem 0;
                    border-bottom: 1px solid #e5e7eb;
                }

                .section-icon-wrapper {
                    background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
                    border-radius: 6px;
                    padding: 0.5rem;
                    color: white;
                    font-size: 0.9rem;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .section-title {
                    color: #1f2937;
                    font-weight: 600;
                    font-size: 1.2rem;
                    margin: 0;
                    line-height: 1.2;
                }

                .section-subtitle {
                    color: #6b7280;
                    font-size: 0.75rem;
                    font-weight: 400;
                    margin: 0;
                    line-height: 1.2;
                }

                /* Party Dropdown - with icon in front */
                .party-dropdown-toggle {
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    padding: 0.4rem 0.6rem;
                    color: #374151;
                    transition: all 0.2s ease;
                    font-size: 0.7rem;
                    font-weight: 500;
                    text-align: left;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .party-dropdown-toggle:hover {
                    background: #f9fafb;
                    border-color: #8b5cf6;
                    color: #374151;
                }

                .party-dropdown-toggle:focus {
                    background: white;
                    border-color: #8b5cf6;
                    color: #374151;
                    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
                }

                .party-dropdown-toggle.show {
                    background: #f9fafb;
                    border-color: #8b5cf6;
                    color: #374151;
                }

                .party-dropdown-menu {
                    border-radius: 4px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    padding: 0.25rem 0;
                    min-width: 180px;
                    font-size: 0.7rem;
                    background: white;
                }

                .party-dropdown-menu .dropdown-item {
                    padding: 0.4rem 0.6rem;
                    transition: all 0.2s ease;
                    color: #374151;
                    font-weight: 500;
                }

                .party-dropdown-menu .dropdown-item:hover {
                    background: #f3f4f6;
                    color: #8b5cf6;
                }

                .party-dropdown-menu .dropdown-item.active {
                    background: #8b5cf6;
                    color: white;
                }

                /* Dropdown Arrow Animation - moved to front */
                .party-dropdown-toggle .fa-chevron-down {
                    opacity: 0.7;
                    transition: transform 0.2s ease;
                    margin-right: 0.25rem;
                }

                .party-dropdown-toggle.show .fa-chevron-down {
                    transform: rotate(180deg);
                }

                /* Spinner Animation */
                .fa-spin {
                    animation: fa-spin 2s infinite linear;
                }

                @keyframes fa-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Responsive Design */
                @media (max-width: 992px) {
                    .party-header-wrapper {
                        padding: 0.6rem 0;
                    }

                    .parties-section-header {
                        padding: 0.875rem 0 0.625rem 0;
                    }

                    .section-title {
                        font-size: 1.1rem;
                    }

                    .section-icon-wrapper {
                        width: 34px;
                        height: 34px;
                        font-size: 0.85rem;
                    }

                    .search-group {
                        max-width: 100%;
                        margin-bottom: 0.5rem;
                    }

                    .btn-add-sale,
                    .btn-add-purchase,
                    .btn-add-party {
                        padding: 0.35rem 0.6rem;
                        font-size: 0.65rem;
                    }

                    .btn-icon-only {
                        padding: 0.35rem;
                        min-width: 30px;
                    }
                }

                @media (max-width: 768px) {
                    .party-header-wrapper .row,
                    .parties-section-header .row {
                        flex-direction: column;
                        gap: 0.5rem;
                        text-align: center;
                    }

                    .d-flex {
                        justify-content: center !important;
                        flex-wrap: wrap;
                        gap: 0.4rem;
                    }

                    .party-dropdown-toggle {
                        width: 100% !important;
                    }

                    .section-title {
                        font-size: 1rem;
                    }

                    .section-subtitle {
                        font-size: 0.7rem;
                    }
                }

                @media (max-width: 576px) {
                    .party-header-wrapper,
                    .parties-section-header {
                        padding: 0.5rem 0;
                    }

                    .container-fluid {
                        padding: 0 0.75rem;
                    }

                    .btn-add-sale,
                    .btn-add-purchase,
                    .btn-add-party {
                        padding: 0.3rem 0.5rem;
                        font-size: 0.6rem;
                        flex: 1;
                        min-width: 80px;
                    }

                    .btn-icon-only {
                        padding: 0.3rem;
                        min-width: 28px;
                        flex: 0 0 auto;
                    }

                    .search-input {
                        font-size: 0.7rem;
                        padding: 0.35rem 0.5rem;
                    }

                    .search-icon-wrapper {
                        padding: 0.35rem 0.5rem;
                    }

                    .section-icon-wrapper {
                        width: 32px;
                        height: 32px;
                        font-size: 0.8rem;
                        margin: 0 auto 0.5rem auto;
                    }
                }

                /* Focus states for accessibility */
                .btn-add-sale:focus,
                .btn-add-purchase:focus,
                .btn-add-party:focus,
                .btn-icon-only:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
                }

                /* Smooth transitions */
                .btn-add-sale,
                .btn-add-purchase,
                .btn-add-party,
                .btn-icon-only,
                .party-dropdown-toggle,
                .search-input {
                    transition: all 0.2s ease-in-out;
                }
                `}
            </style>
        </>
    );
}

export default PartyHeader;