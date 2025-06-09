import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Badge, Tabs, Tab } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faShoppingBag, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

// Import components
import PurchasesSummaryCards from './Purchases/PurchasesSummaryCards';
import PurchasesEmptyState from './Purchases/PurchasesEmptyState';
import PurchaseOrderModal from './Purchases/PurchaseOrderModal';
import QuickSupplierModal from './Purchases/QuickSupplierModal';
import PurchasesTable from './Purchases/PurchasesTable';
import PurchaseBills from './Purchases/PurchaseBills'; // ✅ Import PurchaseBills component

function PurchaseOrders({
    view = 'purchaseOrders',
    onNavigate,
    currentCompany,
    isOnline = true,
    addToast,
    companyId: propCompanyId
}) {
    const { companyId: urlCompanyId } = useParams();
    const navigate = useNavigate();

    // Use companyId from props or URL
    const companyId = propCompanyId || urlCompanyId;

    // ✅ UPDATED: Route to specific components based on view
    const renderViewComponent = () => {
        const commonProps = {
            currentCompany,
            addToast,
            isOnline,
            companyId
        };

        switch (view) {
            case 'purchaseBills':
                // ✅ Render the PurchaseBills component for purchase bills view
                return <PurchaseBills {...commonProps} />;

            case 'allPurchases':
                // ✅ This could render a general purchases overview
                return <PurchaseBills {...commonProps} />;

            case 'paymentOut':
                // ✅ Placeholder for payment out functionality
                return (
                    <Container fluid className="py-4">
                        <div className="text-center">
                            <h4>💸 Payment Out</h4>
                            <p className="text-muted">
                                Payment out functionality will be available here.
                            </p>
                            <Button
                                variant="outline-primary"
                                onClick={() => navigate(`/companies/${companyId}/purchase-bills`)}
                            >
                                Go to Purchase Bills
                            </Button>
                        </div>
                    </Container>
                );

            case 'expenses':
                // ✅ Placeholder for expenses functionality
                return (
                    <Container fluid className="py-4">
                        <div className="text-center">
                            <h4>📊 Expenses</h4>
                            <p className="text-muted">
                                Expense management functionality will be available here.
                            </p>
                            <Button
                                variant="outline-primary"
                                onClick={() => navigate(`/companies/${companyId}/purchase-bills`)}
                            >
                                Go to Purchase Bills
                            </Button>
                        </div>
                    </Container>
                );

            case 'purchaseReturn':
                // ✅ Placeholder for purchase return functionality
                return (
                    <Container fluid className="py-4">
                        <div className="text-center">
                            <h4>↩️ Purchase Returns</h4>
                            <p className="text-muted">
                                Purchase return functionality will be available here.
                            </p>
                            <Button
                                variant="outline-primary"
                                onClick={() => navigate(`/companies/${companyId}/purchase-bills`)}
                            >
                                Go to Purchase Bills
                            </Button>
                        </div>
                    </Container>
                );

            case 'purchaseOrders':
            default:
                // ✅ Render the original purchase orders functionality
                return renderPurchaseOrdersContent();
        }
    };

    // ✅ EXTRACTED: Original purchase orders content
    const renderPurchaseOrdersContent = () => {
        // State management for purchase orders
        const [purchaseOrders, setPurchaseOrders] = useState([]);
        const [suppliers, setSuppliers] = useState([]);
        const [showCreateModal, setShowCreateModal] = useState(false);
        const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
        const [editingPurchaseOrder, setEditingPurchaseOrder] = useState(null);
        const [activeTab, setActiveTab] = useState('purchaseOrders');
        const [searchQuery, setSearchQuery] = useState('');
        const [dateFilter, setDateFilter] = useState({
            from: '',
            to: ''
        });

        // Form data structure
        const [formData, setFormData] = useState({
            orderNumber: '',
            orderDate: new Date().toISOString().split('T')[0],
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            selectedSupplier: '',
            purchaseType: 'non-gst',
            paymentTerms: 'net30',
            items: [{
                productService: '',
                quantity: 1,
                price: 0,
                total: 0,
                gstRate: 0,
                taxInclusive: false
            }],
            subtotal: 0,
            gstAmount: 0,
            discount: 0,
            total: 0,
            notes: '',
            status: 'draft'
        });

        // Quick supplier form data
        const [quickSupplierData, setQuickSupplierData] = useState({
            partyType: 'supplier',
            name: '',
            phone: '',
            email: '',
            gstNumber: '',
            address: ''
        });

        // Navigation handlers for the new routing system
        const handleCreatePurchaseOrder = () => {
            if (!companyId) {
                addToast?.('Please select a company first', 'warning');
                return;
            }

            console.log('📝 Navigating to Create Purchase Order form');
            navigate(`/companies/${companyId}/purchase-orders/add`);
        };

        const handleEditPurchaseOrderRoute = (orderId) => {
            if (!companyId) {
                addToast?.('Please select a company first', 'warning');
                return;
            }

            console.log('✏️ Navigating to Edit Purchase Order form:', orderId);
            navigate(`/companies/${companyId}/purchase-orders/${orderId}/edit`);
        };

        const handleBackToPurchases = () => {
            if (!companyId) {
                addToast?.('Please select a company first', 'warning');
                return;
            }

            if (onNavigate) {
                onNavigate('allPurchases');
            } else {
                navigate(`/companies/${companyId}/purchases`);
            }
        };

        const hasPurchaseOrders = purchaseOrders.length > 0;

        // Load suppliers on component mount
        useEffect(() => {
            const sampleSuppliers = [
                {
                    id: 1,
                    name: 'ABC Suppliers Ltd',
                    phone: '9876543211',
                    whatsappNumber: '9876543211',
                    email: 'abc@suppliers.com',
                    partyType: 'supplier',
                    city: 'Delhi',
                    address: '456 Business Ave',
                    gstNumber: '27AAACR5055K1ZX'
                },
                {
                    id: 2,
                    name: 'XYZ Vendors',
                    phone: '9876543212',
                    whatsappNumber: '9876543212',
                    email: 'xyz@vendors.com',
                    partyType: 'supplier',
                    city: 'Mumbai',
                    address: '789 Industrial Road',
                    gstNumber: '27BBBBR5055K1ZY'
                }
            ];
            setSuppliers(sampleSuppliers);
        }, []);

        // ... rest of the purchase orders logic (keeping your existing functions)

        return (
            <Container fluid className="py-4">
                {/* Enhanced Page Header with Navigation */}
                <Row className="mb-4 align-items-center">
                    <Col>
                        <div className="d-flex align-items-center">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={handleBackToPurchases}
                                className="me-3"
                                title="Back to Purchases"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} />
                            </Button>
                            <div>
                                <h1 className="page-title mb-0">
                                    Purchase Orders
                                    {hasPurchaseOrders && (
                                        <Badge bg="secondary" className="ms-2">{purchaseOrders.length}</Badge>
                                    )}
                                </h1>
                                {currentCompany && (
                                    <small className="text-muted">
                                        {currentCompany.businessName || currentCompany.name}
                                    </small>
                                )}
                            </div>
                        </div>
                    </Col>
                    <Col xs="auto">
                        <Button
                            variant="primary"
                            className="d-flex align-items-center"
                            onClick={handleCreatePurchaseOrder}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            Create Purchase Order
                        </Button>
                    </Col>
                </Row>

                {/* Enhanced Tabs with proper routing */}
                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    className="mb-4 custom-tabs"
                >
                    <Tab eventKey="purchaseOrders" title="All Purchase Orders">
                        {hasPurchaseOrders ? (
                            <>
                                <PurchasesSummaryCards purchases={purchaseOrders} />
                                <PurchasesTable
                                    filteredPurchases={purchaseOrders}
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    dateFilter={dateFilter}
                                    setDateFilter={setDateFilter}
                                    onCreatePurchase={handleCreatePurchaseOrder}
                                    onEditPurchase={handleEditPurchaseOrderRoute}
                                    onDeletePurchase={() => { }}
                                    onManagePayment={() => addToast?.('Payment management not available for purchase orders', 'info')}
                                    onPrintPurchase={() => addToast?.('Print functionality will be available soon', 'info')}
                                    onConvertToPurchase={() => { }}
                                    isPurchaseOrder={true}
                                />
                            </>
                        ) : (
                            <PurchasesEmptyState
                                onCreatePurchase={handleCreatePurchaseOrder}
                                type="purchaseOrder"
                                companyName={currentCompany?.businessName || currentCompany?.name}
                            />
                        )}
                    </Tab>
                    <Tab eventKey="draft" title="Draft Orders">
                        <div className="text-center py-5">
                            <h5>📝 Draft Purchase Orders</h5>
                            <p className="text-muted">Draft purchase orders will be displayed here.</p>
                            <Button variant="outline-primary" onClick={handleCreatePurchaseOrder}>
                                Create New Order
                            </Button>
                        </div>
                    </Tab>
                    <Tab eventKey="sent" title="Sent Orders">
                        <div className="text-center py-5">
                            <h5>📤 Sent Purchase Orders</h5>
                            <p className="text-muted">Sent purchase orders will be displayed here.</p>
                            <small className="text-muted d-block">
                                Track orders that have been sent to suppliers
                            </small>
                        </div>
                    </Tab>
                    <Tab eventKey="reports" title="Reports">
                        <div className="text-center py-5">
                            <h5>📊 Purchase Order Reports</h5>
                            <p className="text-muted">Purchase order reports and analytics will be available here.</p>
                            <small className="text-muted d-block">
                                View performance metrics, supplier analysis, and order trends
                            </small>
                        </div>
                    </Tab>
                </Tabs>
            </Container>
        );
    };

    // Check if we have a company selected
    if (!companyId) {
        return (
            <Container fluid className="py-4">
                <div className="text-center">
                    <h4>⚠️ No Company Selected</h4>
                    <p className="text-muted">
                        Please select a company to manage purchases.
                    </p>
                </div>
            </Container>
        );
    }

    // Check online status
    if (!isOnline) {
        return (
            <Container fluid className="py-4">
                <div className="text-center">
                    <h4>📡 No Internet Connection</h4>
                    <p className="text-muted">
                        Purchase functionality requires an internet connection. Please check your network and try again.
                    </p>
                </div>
            </Container>
        );
    }

    // ✅ MAIN RENDER: Route to appropriate component based on view
    return renderViewComponent();
}

export default PurchaseOrders;