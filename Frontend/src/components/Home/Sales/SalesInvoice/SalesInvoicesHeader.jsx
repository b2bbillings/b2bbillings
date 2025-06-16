import React from 'react';
import { Navbar, Container, Row, Col, InputGroup, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus, faEllipsisH, faCog, faFileContract, faFileInvoice } from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesHeader({
    searchTerm,
    onSearchChange,
    onAddSale,
    onAddPurchase,
    onMoreOptions,
    onSettings,
    mode = 'invoices',
    documentType = 'invoice',
    pageTitle = 'Sales Invoices',
    companyId
}) {
    // Mode detection
    const isQuotationsMode = mode === 'quotations' || documentType === 'quotation';

    // Custom styles object (converted from styled-jsx)
    const customStyles = {
        btnPurple: {
            backgroundColor: '#8b5cf6',
            borderColor: '#8b5cf6',
            color: 'white',
            transition: 'all 0.2s ease'
        },
        btnPurpleHover: {
            backgroundColor: '#7c3aed',
            borderColor: '#7c3aed',
            color: 'white',
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
        },
        btnPurpleFocus: {
            backgroundColor: '#7c3aed',
            borderColor: '#7c3aed',
            color: 'white',
            boxShadow: '0 0 0 0.2rem rgba(139, 92, 246, 0.25)'
        },
        btnPurpleActive: {
            backgroundColor: '#6d28d9',
            borderColor: '#6d28d9',
            color: 'white'
        },
        navbar: {
            zIndex: 1020
        }
    };

    const getPlaceholderText = () => {
        return isQuotationsMode
            ? 'Search quotations, customers, items...'
            : 'Search invoices, customers, items...';
    };

    const getAddButtonText = () => {
        return isQuotationsMode ? 'Add Quotation' : 'Add Sale';
    };

    const getAddButtonIcon = () => {
        return isQuotationsMode ? faFileContract : faPlus;
    };

    const getButtonVariant = () => {
        return isQuotationsMode ? 'info' : 'primary';
    };

    const getBorderClass = () => {
        return isQuotationsMode
            ? 'border-info border-2 border-start-0 border-end-0 border-top-0'
            : 'border-primary border-2 border-start-0 border-end-0 border-top-0';
    };

    return (
        <Navbar
            className={`bg-light border-bottom shadow-sm sticky-top ${getBorderClass()}`}
            style={customStyles.navbar}
        >
            <Container fluid className="py-2">
                <Row className="w-100 align-items-center g-3">
                    {/* Search Section */}
                    <Col md={6} lg={5}>
                        <InputGroup size="sm">
                            <InputGroup.Text className="bg-white border-end-0">
                                <FontAwesomeIcon
                                    icon={faSearch}
                                    className={isQuotationsMode ? 'text-info' : 'text-primary'}
                                />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder={getPlaceholderText()}
                                value={searchTerm}
                                onChange={onSearchChange}
                                className="border-start-0"
                            />
                        </InputGroup>
                    </Col>

                    {/* Action Buttons Section */}
                    <Col md={6} lg={7}>
                        <div className="d-flex gap-2 justify-content-end flex-wrap">
                            {/* Add Sale/Quotation Button */}
                            <Button
                                variant={getButtonVariant()}
                                size="sm"
                                className="d-flex align-items-center"
                                onClick={onAddSale}
                                title={getAddButtonText()}
                            >
                                <FontAwesomeIcon icon={getAddButtonIcon()} className="me-2" />
                                <span className="d-none d-sm-inline">{getAddButtonText()}</span>
                            </Button>

                            {/* Add Purchase Button - Only show for invoices mode with purple theme */}
                            {!isQuotationsMode && (
                                <Button
                                    className="d-flex align-items-center"
                                    size="sm"
                                    onClick={onAddPurchase}
                                    title="Add Purchase"
                                    style={customStyles.btnPurple}
                                    onMouseEnter={(e) => {
                                        Object.assign(e.target.style, customStyles.btnPurpleHover);
                                    }}
                                    onMouseLeave={(e) => {
                                        Object.assign(e.target.style, customStyles.btnPurple);
                                    }}
                                    onFocus={(e) => {
                                        Object.assign(e.target.style, customStyles.btnPurpleFocus);
                                    }}
                                    onBlur={(e) => {
                                        Object.assign(e.target.style, customStyles.btnPurple);
                                    }}
                                    onMouseDown={(e) => {
                                        Object.assign(e.target.style, customStyles.btnPurpleActive);
                                    }}
                                    onMouseUp={(e) => {
                                        Object.assign(e.target.style, customStyles.btnPurpleHover);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                                    <span className="d-none d-sm-inline">Add Purchase</span>
                                </Button>
                            )}

                            {/* More Options Button */}
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={onMoreOptions}
                                title="More Options"
                            >
                                <FontAwesomeIcon icon={faEllipsisH} />
                            </Button>

                            {/* Settings Button */}
                            <Button
                                variant="outline-secondary"
                                size="sm"
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
    );
}

export default SalesInvoicesHeader;