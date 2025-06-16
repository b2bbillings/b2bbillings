import React from 'react';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faReceipt,
    faFileContract
} from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesPageTitle({
    onAddSale,
    invoiceCount = 0,
    companyId,
    mode = 'invoices',
    documentType = 'invoice',
    title = 'Sales Invoices',
    subtitle = 'Manage your sales transactions'
}) {
    // Mode detection
    const isQuotationsMode = mode === 'quotations' || documentType === 'quotation';

    const getIcon = () => {
        return isQuotationsMode ? faFileContract : faReceipt;
    };

    const getTitle = () => {
        if (title !== 'Sales Invoices') return title;
        return isQuotationsMode ? 'Quotations' : 'Sales Invoices';
    };

    const getSubtitle = () => {
        if (subtitle !== 'Manage your sales transactions') return subtitle;
        return isQuotationsMode ? 'Create and manage quotations' : 'Manage your sales transactions';
    };

    const getButtonText = () => {
        return isQuotationsMode ? 'Add Quotation' : 'Add Sale';
    };

    const getButtonIcon = () => {
        return isQuotationsMode ? faFileContract : faPlus;
    };

    const getCountText = () => {
        if (invoiceCount === 0) return isQuotationsMode ? 'No quotations yet' : 'No invoices yet';
        if (invoiceCount === 1) return isQuotationsMode ? '1 quotation' : '1 invoice';
        return isQuotationsMode ? `${invoiceCount} quotations` : `${invoiceCount} invoices`;
    };

    // Bootstrap variant based on mode
    const getButtonVariant = () => {
        return isQuotationsMode ? 'info' : 'primary';
    };

    const getBadgeVariant = () => {
        return isQuotationsMode ? 'info' : 'primary';
    };

    return (
        <div className={`bg-light border-bottom py-3 mb-3 ${isQuotationsMode ? 'border-info' : 'border-primary'}`}>
            <Container fluid>
                <Row className="align-items-center">
                    <Col>
                        <div className="d-flex align-items-center">
                            {/* Icon */}
                            <div
                                className={`d-flex align-items-center justify-content-center rounded me-3 ${isQuotationsMode ? 'bg-info text-white' : 'bg-primary text-white'
                                    }`}
                                style={{ width: '48px', height: '48px' }}
                            >
                                <FontAwesomeIcon icon={getIcon()} size="lg" />
                            </div>

                            {/* Title Content */}
                            <div className="flex-grow-1">
                                <h4 className="mb-1 fw-bold text-dark">
                                    {getTitle()}
                                </h4>
                                <small className="text-muted d-block mb-2">
                                    {getSubtitle()}
                                </small>

                                {/* Count Badge */}
                                {invoiceCount !== undefined && (
                                    <Badge
                                        bg={getBadgeVariant()}
                                        className="px-2 py-1"
                                    >
                                        {getCountText()}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </Col>

                    {/* Add Button */}
                    <Col xs="auto">
                        <Button
                            variant={getButtonVariant()}
                            size="sm"
                            className="d-flex align-items-center px-3 py-2"
                            onClick={onAddSale}
                            title={getButtonText()}
                        >
                            <FontAwesomeIcon icon={getButtonIcon()} className="me-2" />
                            <span className="d-none d-sm-inline">{getButtonText()}</span>
                        </Button>
                    </Col>
                </Row>
            </Container>

            {/* Minimal custom styles - only for the border accent */}
            <style jsx>{`
                .border-info {
                    border-left: 4px solid var(--bs-info) !important;
                }
                .border-primary {
                    border-left: 4px solid var(--bs-primary) !important;
                }
                
                /* Responsive text hiding */
                @media (max-width: 576px) {
                    .d-none.d-sm-inline {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default SalesInvoicesPageTitle;