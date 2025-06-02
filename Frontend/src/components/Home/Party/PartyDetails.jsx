import React, { useState, useMemo } from 'react';
import { Badge, Button, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserCheck,
    faBuilding,
    faEdit,
    faTrash,
    faTimes,
    faUserCircle,
    faMoneyBillWave,
    faComment,
    faFileAlt,
    faChartLine
} from '@fortawesome/free-solid-svg-icons';

// Import the new components (removed PartyBusinessSummary and PartyTransactions)
import PartyProfile from './PartyProfile';
import PartyMessage from './PartyMessage';
import PartyStatement from './PartyStatement';
import PartyAnalytics from './PartyAnalytics';
import PartyPayments from './PartyPayments';
import './PartyDetails.css';

function PartyDetails({ party, show, onHide, onEdit, onDelete, sales = [], purchases = [], onAddPayment, onEditPayment, onDeletePayment }) {
    // Changed default tab from 'business' to 'analytics'
    const [activeTab, setActiveTab] = useState('analytics');

    // Use useMemo to calculate party data and prevent infinite re-renders
    const { partyTransactions, paymentSummary } = useMemo(() => {
        if (!party) {
            return {
                partyTransactions: [],
                paymentSummary: {
                    totalSales: 0,
                    totalPurchases: 0,
                    totalSalesPaid: 0,
                    totalPurchasesPaid: 0,
                    salesDue: 0,
                    purchasesDue: 0,
                    netBalance: 0
                }
            };
        }

        // Filter sales and purchases for this party
        const partySales = sales.filter(sale =>
            sale.customerId === party.id ||
            sale.customerName === party.name ||
            sale.partyId === party.id
        );

        const partyPurchases = purchases.filter(purchase =>
            purchase.supplierId === party.id ||
            purchase.supplierName === party.name ||
            purchase.partyId === party.id
        );

        // Combine all transactions
        const allTransactions = [
            ...partySales.map(sale => ({
                ...sale,
                type: 'sale',
                date: sale.invoiceDate || sale.createdAt,
                amount: parseFloat(sale.total || sale.finalTotal || 0),
                reference: sale.invoiceNumber || `SALE-${sale.id}`
            })),
            ...partyPurchases.map(purchase => ({
                ...purchase,
                type: 'purchase',
                date: purchase.purchaseDate || purchase.createdAt,
                amount: parseFloat(purchase.total || purchase.finalTotal || 0),
                reference: purchase.supplierInvoiceNumber || purchase.invoiceNumber || `PUR-${purchase.id}`
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calculate payment summary
        const totalSales = partySales.reduce((sum, sale) => sum + parseFloat(sale.total || sale.finalTotal || 0), 0);
        const totalPurchases = partyPurchases.reduce((sum, purchase) => sum + parseFloat(purchase.total || purchase.finalTotal || 0), 0);

        const totalSalesPaid = partySales.reduce((sum, sale) => {
            const paid = sale.payments?.reduce((pSum, payment) => pSum + parseFloat(payment.amount || 0), 0) || 0;
            return sum + paid;
        }, 0);

        const totalPurchasesPaid = partyPurchases.reduce((sum, purchase) => {
            const paid = purchase.payments?.reduce((pSum, payment) => pSum + parseFloat(payment.amount || 0), 0) || 0;
            return sum + paid;
        }, 0);

        const salesDue = totalSales - totalSalesPaid;
        const purchasesDue = totalPurchases - totalPurchasesPaid;
        const netBalance = salesDue - purchasesDue;

        return {
            partyTransactions: allTransactions,
            paymentSummary: {
                totalSales,
                totalPurchases,
                totalSalesPaid,
                totalPurchasesPaid,
                salesDue,
                purchasesDue,
                netBalance
            }
        };
    }, [party, sales, purchases]);

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toFixed(2);
    };

    const getPartyTypeIcon = () => {
        return party?.partyType === 'supplier' ? faBuilding : faUserCheck;
    };

    const getPartyTypeBadge = () => {
        return party?.partyType === 'supplier' ?
            <Badge bg="info">Supplier</Badge> :
            <Badge bg="success">Customer</Badge>;
    };

    const handleEditClick = () => {
        if (onEdit) {
            onEdit(party);
        }
    };

    const handleDeleteClick = () => {
        if (window.confirm(`Are you sure you want to delete ${party.name}?`)) {
            if (onDelete) {
                onDelete(party.id);
            }
        }
    };

    // Don't render anything if no party data and modal is not shown
    if (!party || !show) {
        return null;
    }

    // Common props to pass to child components
    const commonProps = {
        party,
        partyTransactions,
        paymentSummary,
        formatCurrency
    };

    // Modal layout when show prop is true
    return (
        <div className={`modal fade ${show ? 'show d-block' : ''}`} style={{ backgroundColor: show ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
            <div className="modal-dialog modal-fullscreen modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header border-0 pb-2">
                        <div className="d-flex align-items-center w-100">
                            <div className="d-flex align-items-center flex-grow-1">
                                <div className="party-avatar-large me-3">
                                    <FontAwesomeIcon
                                        icon={party.isRunningCustomer ? faUserCheck : getPartyTypeIcon()}
                                        className={party.isRunningCustomer ? "text-warning" : "text-primary"}
                                        size="2x"
                                    />
                                </div>
                                <div>
                                    <h5 className="modal-title mb-1">
                                        {party.name}
                                        {party.isRunningCustomer && (
                                            <Badge bg="warning" className="ms-2 text-dark">
                                                <FontAwesomeIcon icon={faUserCheck} className="me-1" />
                                                Running Customer
                                            </Badge>
                                        )}
                                    </h5>
                                    <div className="text-muted">
                                        {getPartyTypeBadge()}
                                        <small className="ms-2">
                                            Added on {new Date(party.createdAt || Date.now()).toLocaleDateString()}
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex gap-2">
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={handleEditClick}
                                >
                                    <FontAwesomeIcon icon={faEdit} className="me-1" />
                                    Edit
                                </Button>
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={handleDeleteClick}
                                >
                                    <FontAwesomeIcon icon={faTrash} className="me-1" />
                                    Delete
                                </Button>
                                <Button
                                    variant="link"
                                    className="p-1 text-muted"
                                    onClick={onHide}
                                >
                                    <FontAwesomeIcon icon={faTimes} size="lg" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="modal-body p-0" style={{ height: '80vh', overflowY: 'auto' }}>
                        {/* Navigation Tabs - Removed Business Summary and Transactions */}
                        <div className="border-bottom bg-light">
                            <Nav variant="tabs" className="px-4">
                                <Nav.Item>
                                    <Nav.Link
                                        active={activeTab === 'analytics'}
                                        onClick={() => setActiveTab('analytics')}
                                        className="d-flex align-items-center"
                                    >
                                        <FontAwesomeIcon icon={faChartLine} className="me-2" />
                                        Analytics
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        active={activeTab === 'profile'}
                                        onClick={() => setActiveTab('profile')}
                                        className="d-flex align-items-center"
                                    >
                                        <FontAwesomeIcon icon={faUserCircle} className="me-2" />
                                        Profile
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        active={activeTab === 'payments'}
                                        onClick={() => setActiveTab('payments')}
                                        className="d-flex align-items-center"
                                    >
                                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                        Payments
                                        {paymentSummary.salesDue > 0 && (
                                            <Badge bg="danger" className="ms-2">
                                                {Math.round(paymentSummary.salesDue)}
                                            </Badge>
                                        )}
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        active={activeTab === 'message'}
                                        onClick={() => setActiveTab('message')}
                                        className="d-flex align-items-center"
                                    >
                                        <FontAwesomeIcon icon={faComment} className="me-2" />
                                        Message
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        active={activeTab === 'statement'}
                                        onClick={() => setActiveTab('statement')}
                                        className="d-flex align-items-center"
                                    >
                                        <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                                        Statement
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>
                        </div>

                        {/* Tab Content - Removed Business Summary and Transactions sections */}
                        <div className="tab-content">
                            {activeTab === 'analytics' && (
                                <div className="p-4">
                                    <PartyAnalytics
                                        party={party}
                                        sales={sales}
                                        purchases={purchases}
                                    />
                                </div>
                            )}

                            {activeTab === 'profile' && (
                                <PartyProfile {...commonProps} />
                            )}

                            {activeTab === 'message' && (
                                <PartyMessage {...commonProps} />
                            )}

                            {activeTab === 'statement' && (
                                <PartyStatement {...commonProps} />
                            )}

                            {activeTab === 'payments' && (
                                <div className="p-4">
                                    <PartyPayments
                                        party={party}
                                        sales={sales}
                                        purchases={purchases}
                                        onAddPayment={onAddPayment}
                                        onEditPayment={onEditPayment}
                                        onDeletePayment={onDeletePayment}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PartyDetails;