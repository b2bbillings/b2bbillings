import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Container, Row, Col } from 'react-bootstrap';
import PurchaseBills from './Purchases/PurchaseBills';

function PurchaseOrders({
    view = 'allPurchases',
    onNavigate,
    currentCompany,
    isOnline = true,
    addToast,
    companyId: propCompanyId
}) {
    const { companyId: urlCompanyId } = useParams();
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [error, setError] = useState(null);

    // ✅ Enhanced company ID resolution with multiple fallbacks
    const getEffectiveCompanyId = () => {
        const sources = [
            propCompanyId,
            urlCompanyId,
            currentCompany?.id,
            currentCompany?._id,
            localStorage.getItem('selectedCompanyId'),
            sessionStorage.getItem('companyId')
        ];

        try {
            const currentCompanyStr = localStorage.getItem('currentCompany');
            if (currentCompanyStr) {
                const currentCompany = JSON.parse(currentCompanyStr);
                const companyIdFromStorage = currentCompany.id || currentCompany._id;
                if (companyIdFromStorage) {
                    sources.unshift(companyIdFromStorage);
                }
            }
        } catch (error) {
            console.warn('Failed to parse current company from localStorage:', error);
        }

        for (const source of sources) {
            if (source && typeof source === 'string' && source.trim() !== '') {
                return source.trim();
            }
        }
        return null;
    };

    const companyId = getEffectiveCompanyId();

    // ✅ Enhanced view mapping with more purchase types
    const mapViewToSubView = useMemo(() => (viewName) => {
        const viewMap = {
            // Main purchase views
            'allPurchases': 'bills',
            'purchaseOrders': 'orders',
            'purchaseBills': 'bills',
            'purchaseInvoices': 'bills',

            // Payment and financial views
            'paymentOut': 'payments',
            'purchasePayments': 'payments',
            'paymentsMade': 'payments',

            // Expense management
            'expenses': 'expenses',
            'purchaseExpenses': 'expenses',

            // Returns and adjustments
            'purchaseReturn': 'returns',
            'purchaseReturns': 'returns',
            'returnToPurchase': 'returns',

            // Reports and analytics
            'purchaseReports': 'reports',
            'purchaseAnalytics': 'analytics',

            // Legacy views
            'oldPurchases': 'bills',
            'legacyPurchases': 'bills'
        };
        return viewMap[viewName] || 'bills';
    }, []);

    const purchaseConfiguration = useMemo(() => ({
        // ✅ ENHANCED: Party configuration with dual support
        party: {
            primaryPartyType: 'supplier',
            secondaryPartyType: 'customer',
            allowBothParties: true, // ✅ Keep this true
            showBothPartyFields: true, // ✅ NEW: Show both fields simultaneously
            enablePartySwitch: true, // ✅ NEW: Allow switching between party types
            defaultPartyLabel: 'Supplier',
            crossPartyLabel: 'Customer',
            searchPlaceholder: 'Search suppliers or customers...',
            addNewLabel: 'Add New Party',
            // ✅ NEW: Dual party labels
            dualPartyLabels: {
                supplier: 'Supplier',
                customer: 'Customer',
                both: 'Supplier & Customer',
                switchToSupplier: 'Switch to Supplier',
                switchToCustomer: 'Switch to Customer',
                selectSupplier: 'Select Supplier',
                selectCustomer: 'Select Customer'
            },
            // ✅ NEW: Party field configuration
            fieldConfig: {
                showSupplierField: true,  // Always show supplier field
                showCustomerField: true,  // Always show customer field
                supplierRequired: false,  // Not required (either supplier OR customer)
                customerRequired: false,  // Not required (either supplier OR customer)
                atLeastOneRequired: true, // At least one party must be selected
                allowEmptySelection: false,
                defaultSelection: 'supplier' // Default focus on supplier
            }
        },

        // ✅ ENHANCED: UI Labels with dual-party support
        ui: {
            formTitle: 'Purchase Orders',
            pageTitle: 'Purchase Management',
            addButtonText: 'Add Purchase',
            editButtonText: 'Edit Purchase',
            primaryPartyLabel: 'Supplier',
            secondaryPartyLabel: 'Customer',
            amountLabel: 'Purchase Amount',
            paymentLabel: 'Payment Made',
            invoiceLabel: 'Purchase Bill',
            invoiceNumberLabel: 'Bill No.',
            totalLabel: 'Total Purchase',
            balanceLabel: 'Amount Payable',
            paidLabel: 'Amount Paid',
            dueLabel: 'Amount Due',
            statusLabel: 'Purchase Status',
            dateLabel: 'Purchase Date',
            // ✅ NEW: Dual party UI labels
            partySelectionTitle: 'Party Selection',
            partySelectionSubtitle: 'Select supplier, customer, or both',
            supplierSectionTitle: 'Supplier Details',
            customerSectionTitle: 'Customer Details',
            partyTypeSwitcher: 'Party Type',
            transactionTypeLabel: 'Transaction Type',
            transactionTypes: {
                supplierPurchase: 'Purchase from Supplier',
                customerSale: 'Sale to Customer',
                dualTransaction: 'Dual Party Transaction',
                reverseTransaction: 'Reverse Transaction'
            }
        },

        // Service configuration remains the same
        service: {
            serviceName: 'purchaseService',
            apiEndpoint: 'purchases',
            transactionType: 'purchase',
            createMethod: 'createPurchaseWithTransaction',
            updateMethod: 'updatePurchase',
            deleteMethod: 'deletePurchase',
            getMethod: 'getPurchases',
            getByIdMethod: 'getPurchaseById'
        },

        // ✅ ENHANCED: Status options with dual-party awareness
        status: {
            statusField: 'purchaseStatus',
            statusOptions: [
                { value: '', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'ordered', label: 'Ordered' },
                { value: 'received', label: 'Received' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
            ],
            paymentStatusOptions: [
                { value: '', label: 'All Payment Status' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'partial', label: 'Partially Paid' },
                { value: 'paid', label: 'Fully Paid' },
                { value: 'overdue', label: 'Overdue' }
            ],
            // ✅ NEW: Transaction type status
            transactionTypeOptions: [
                { value: '', label: 'All Transaction Types' },
                { value: 'supplier-purchase', label: 'Supplier Purchase' },
                { value: 'customer-sale', label: 'Customer Sale' },
                { value: 'dual-party', label: 'Dual Party' },
                { value: 'reverse', label: 'Reverse Transaction' }
            ]
        },

        // Colors and theming remain the same
        theme: {
            primaryColor: '#ff5722',
            primaryColorHover: '#e64a19',
            successColor: '#4caf50',
            warningColor: '#ff9800',
            dangerColor: '#f44336',
            infoColor: '#2196f3',
            // ✅ NEW: Dual party colors
            supplierColor: '#ff5722',
            customerColor: '#2196f3',
            dualPartyColor: '#9c27b0',
            switcherColor: '#607d8b'
        },

        // ✅ NEW: Dual party behavior configuration
        dualPartyBehavior: {
            enablePartyToggle: true,
            showPartyTypeIndicator: true,
            allowEmptySelection: false,
            defaultToSupplier: true,
            enableBulkPartySelection: true,
            showTransactionTypeSelector: true,
            enablePartyValidation: true,
            showPartyConflictWarnings: true,
            enablePartyAutoComplete: true
        }
    }), []);

    // ✅ Enhanced navigation handlers with better validation
    const handleAddPurchase = () => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            setError('Company selection required');
            return;
        }

        try {
            navigate(`/companies/${companyId}/purchases/add`);
        } catch (error) {
            console.error('Navigation error:', error);
            addToast?.('Navigation failed. Please try again.', 'error');
        }
    };

    const handleEditPurchase = (purchaseId) => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        if (!purchaseId) {
            addToast?.('Invalid purchase selected', 'error');
            return;
        }

        try {
            navigate(`/companies/${companyId}/purchases/${purchaseId}/edit`);
        } catch (error) {
            console.error('Navigation error:', error);
            addToast?.('Failed to open purchase for editing', 'error');
        }
    };

    const handleAddPurchaseOrder = () => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        try {
            navigate(`/companies/${companyId}/purchase-orders/add`);
        } catch (error) {
            console.error('Navigation error:', error);
            addToast?.('Navigation failed. Please try again.', 'error');
        }
    };

    const handleEditPurchaseOrder = (orderId) => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        if (!orderId) {
            addToast?.('Invalid order selected', 'error');
            return;
        }

        try {
            navigate(`/companies/${companyId}/purchase-orders/${orderId}/edit`);
        } catch (error) {
            console.error('Navigation error:', error);
            addToast?.('Failed to open order for editing', 'error');
        }
    };

    // ✅ Enhanced view change handler
    const handleViewChange = (newView) => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        const viewPaths = {
            'bills': 'purchases',
            'orders': 'purchase-orders',
            'payments': 'payment-out',
            'expenses': 'expenses',
            'returns': 'purchase-returns',
            'reports': 'purchase-reports',
            'analytics': 'purchase-analytics'
        };

        const path = viewPaths[newView] || 'purchases';

        try {
            if (onNavigate) {
                onNavigate(newView);
            } else {
                navigate(`/companies/${companyId}/${path}`);
            }
        } catch (error) {
            console.error('View change error:', error);
            addToast?.('Failed to change view. Please try again.', 'error');
        }
    };

    // ✅ Enhanced legacy redirect handling
    useEffect(() => {
        const legacyViews = [
            'oldPurchases',
            'purchasesTable',
            'legacyPurchases',
            'purchasesList',
            'purchasesOverview'
        ];

        if (legacyViews.includes(view)) {
            setIsRedirecting(true);
            addToast?.('Redirecting to updated Purchase System...', 'info');

            const timer = setTimeout(() => {
                try {
                    if (onNavigate) {
                        onNavigate('allPurchases');
                    } else if (companyId) {
                        navigate(`/companies/${companyId}/purchases`);
                    }
                } catch (error) {
                    console.error('Redirect error:', error);
                    addToast?.('Redirect failed. Please navigate manually.', 'error');
                } finally {
                    setIsRedirecting(false);
                }
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [view, onNavigate, navigate, companyId, addToast]);

    // ✅ Enhanced error handling
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // ✅ Loading state with better UX
    if (isRedirecting) {
        return (
            <div className="purchase-orders-wrapper">
                <Container fluid className="d-flex justify-content-center align-items-center min-vh-100">
                    <Alert variant="info" className="text-center purchase-alert">
                        <div className="d-flex align-items-center justify-content-center">
                            <div className="spinner-border spinner-border-sm me-3" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <div>
                                <strong>🔄 Updating Purchase System...</strong>
                                <div className="small text-muted mt-1">Please wait while we redirect you</div>
                            </div>
                        </div>
                    </Alert>
                </Container>

                <style jsx>{`
                    .purchase-orders-wrapper {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    
                    .purchase-alert {
                        border: none;
                        border-radius: 1rem;
                        padding: 2rem;
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    }
                `}</style>
            </div>
        );
    }

    // ✅ No company selected state
    if (!companyId) {
        return (
            <div className="purchase-orders-wrapper">
                <Container fluid className="py-5">
                    <Row className="justify-content-center">
                        <Col md={8} lg={6}>
                            <Alert variant="warning" className="text-center purchase-alert">
                                <div className="mb-4">
                                    <div className="purchase-icon">🏢</div>
                                </div>
                                <h4 className="fw-bold mb-3">No Company Selected</h4>
                                <p className="mb-3">
                                    Please select a company to view and manage your purchases.
                                </p>
                                <small className="text-muted d-block">
                                    You can select a company from the header dropdown menu or
                                    company switcher in the sidebar.
                                </small>
                                {error && (
                                    <Alert variant="danger" className="mt-3 mb-0">
                                        <small>{error}</small>
                                    </Alert>
                                )}
                            </Alert>
                        </Col>
                    </Row>
                </Container>

                <style jsx>{`
                    .purchase-orders-wrapper {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
                    }
                    
                    .purchase-alert {
                        border: none;
                        border-radius: 1rem;
                        padding: 3rem 2rem;
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border-left: 5px solid #ff9800;
                    }
                    
                    .purchase-icon {
                        font-size: 4rem;
                        opacity: 0.7;
                        margin-bottom: 1rem;
                    }
                `}</style>
            </div>
        );
    }

    // ✅ Offline state
    if (!isOnline) {
        return (
            <div className="purchase-orders-wrapper">
                <Container fluid className="py-5">
                    <Row className="justify-content-center">
                        <Col md={8} lg={6}>
                            <Alert variant="danger" className="text-center purchase-alert">
                                <div className="mb-4">
                                    <div className="purchase-icon">📡</div>
                                </div>
                                <h4 className="fw-bold mb-3">Connection Required</h4>
                                <p className="mb-3">
                                    Purchase data requires an internet connection to load and sync properly.
                                </p>
                                <small className="text-muted d-block">
                                    Please check your network connection and try again.
                                    Some cached data may still be available.
                                </small>
                            </Alert>
                        </Col>
                    </Row>
                </Container>

                <style jsx>{`
                    .purchase-orders-wrapper {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
                    }
                    
                    .purchase-alert {
                        border: none;
                        border-radius: 1rem;
                        padding: 3rem 2rem;
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border-left: 5px solid #f44336;
                    }
                    
                    .purchase-icon {
                        font-size: 4rem;
                        opacity: 0.7;
                        margin-bottom: 1rem;
                    }
                `}</style>
            </div>
        );
    }

    // ✅ Main render with enhanced configuration
    const subView = mapViewToSubView(view);

    console.log('🛒 PurchaseOrders: Rendering with config:', {
        view,
        subView,
        companyId,
        configuration: purchaseConfiguration
    });

    return (
        <div className="purchase-orders-wrapper">
            {/* ✅ ENHANCED: Pass all required configuration to PurchaseBills */}
            <PurchaseBills
                companyId={companyId}
                currentCompany={currentCompany}
                view={subView}

                // ✅ CRITICAL: Specify this is purchase mode
                formType="purchase"

                // ✅ NEW: Enable reusable components
                useReusableComponents={true}

                // Purchase-specific handlers
                onAddPurchase={handleAddPurchase}
                onEditPurchase={handleEditPurchase}
                onAddPurchaseOrder={handleAddPurchaseOrder}
                onEditPurchaseOrder={handleEditPurchaseOrder}
                onViewChange={handleViewChange}
                onNavigate={onNavigate}

                // System props
                isOnline={isOnline}
                addToast={addToast}

                // ✅ NEW: Pass purchase-specific configuration
                partyConfig={purchaseConfiguration.party}
                uiLabels={purchaseConfiguration.ui}
                serviceConfig={purchaseConfiguration.service}

                // ✅ NEW: Additional configuration options
                statusConfig={purchaseConfiguration.status}
                themeConfig={purchaseConfiguration.theme}

                // ✅ NEW: Purchase-specific overrides
                overrides={{
                    showCustomerField: false,     // Don't show customer by default
                    showSupplierField: true,      // Show supplier by default
                    defaultPartyType: 'supplier',
                    allowPartySwitch: true,       // Allow switching to customer (reverse purchase)
                    transactionDirection: 'out',  // Money going out for purchases
                    defaultPaymentMethod: 'cash',
                    enableMultiCurrency: true,
                    enableTaxCalculation: true,
                    enableDiscounts: true,
                    enableRoundOff: true
                }}

                // ✅ NEW: Custom styling props
                customStyles={{
                    primaryColor: purchaseConfiguration.theme.primaryColor,
                    headerBackground: purchaseConfiguration.theme.primaryColor,
                    buttonVariant: 'outline-warning'
                }}
            />

            {/* ✅ Enhanced styling with purchase theme */}
            <style jsx>{`
                .purchase-orders-wrapper {
                    width: 100%;
                    min-height: 100vh;
                    background-color: #f8f9fa;
                    animation: fadeIn 0.4s ease-out;
                }
                
                /* Purchase theme integration */
                .purchase-orders-wrapper .btn-primary {
                    background-color: ${purchaseConfiguration.theme.primaryColor};
                    border-color: ${purchaseConfiguration.theme.primaryColor};
                }
                
                .purchase-orders-wrapper .btn-primary:hover {
                    background-color: ${purchaseConfiguration.theme.primaryColorHover};
                    border-color: ${purchaseConfiguration.theme.primaryColorHover};
                }
                
                .purchase-orders-wrapper .text-primary {
                    color: ${purchaseConfiguration.theme.primaryColor} !important;
                }
                
                .purchase-orders-wrapper .border-primary {
                    border-color: ${purchaseConfiguration.theme.primaryColor} !important;
                }
                
                /* Remove conflicting legacy styles */
                .purchase-orders-wrapper .page-title,
                .purchase-orders-wrapper .custom-tabs,
                .purchase-orders-wrapper .purchases-summary-grid {
                    display: none !important;
                }
                
                /* Enhanced alert styling */
                .purchase-alert {
                    border: none;
                    border-radius: 1rem;
                    padding: 2.5rem;
                    margin: 1rem;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                }
                
                .purchase-alert:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                }
                
                .purchase-alert h4 {
                    font-weight: 700;
                    margin-bottom: 1rem;
                }
                
                .purchase-alert p {
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }
                
                .spinner-border-sm {
                    width: 1.2rem;
                    height: 1.2rem;
                    border-width: 0.15em;
                }
                
                /* Animation keyframes */
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }
                
                .purchase-icon {
                    animation: pulse 2s infinite;
                    display: inline-block;
                }
                
                /* Responsive design */
                @media (max-width: 768px) {
                    .purchase-alert {
                        margin: 0.5rem;
                        padding: 2rem 1.5rem;
                    }
                    
                    .purchase-alert h4 {
                        font-size: 1.3rem;
                    }
                    
                    .purchase-icon {
                        font-size: 3rem !important;
                    }
                }
                
                @media (max-width: 576px) {
                    .purchase-alert {
                        margin: 0.25rem;
                        padding: 1.5rem 1rem;
                    }
                    
                    .purchase-alert h4 {
                        font-size: 1.2rem;
                    }
                    
                    .purchase-alert p {
                        font-size: 0.9rem;
                    }
                    
                    .purchase-icon {
                        font-size: 2.5rem !important;
                    }
                }
                
                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .purchase-orders-wrapper {
                        background-color: #1a1a1a;
                    }
                    
                    .purchase-alert {
                        background: rgba(30, 30, 30, 0.95) !important;
                        color: #e0e0e0;
                        border-left-color: currentColor;
                    }
                    
                    .purchase-alert h4 {
                        color: #ffffff;
                    }
                    
                    .text-muted {
                        color: #b0b0b0 !important;
                    }
                }
                
                /* High contrast mode */
                @media (prefers-contrast: high) {
                    .purchase-alert {
                        border: 2px solid currentColor !important;
                        backdrop-filter: none;
                        background: #ffffff !important;
                    }
                    
                    .purchase-orders-wrapper {
                        background: #ffffff !important;
                    }
                }
                
                /* Reduced motion */
                @media (prefers-reduced-motion: reduce) {
                    .purchase-orders-wrapper {
                        animation: none;
                    }
                    
                    .purchase-alert {
                        transition: none;
                    }
                    
                    .purchase-alert:hover {
                        transform: none;
                    }
                    
                    .purchase-icon {
                        animation: none;
                    }
                    
                    @keyframes fadeIn {
                        from, to {
                            opacity: 1;
                            transform: none;
                        }
                    }
                }
                
                /* Print styles */
                @media print {
                    .purchase-alert {
                        display: none;
                    }
                    
                    .purchase-orders-wrapper {
                        background: white !important;
                        animation: none;
                    }
                }
                
                /* Focus styles for accessibility */
                .purchase-alert:focus {
                    outline: 2px solid #0066cc;
                    outline-offset: 2px;
                }
                
                /* Loading animation */
                .spinner-border {
                    animation: spinner-border 0.75s linear infinite;
                }
                
                @keyframes spinner-border {
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}

export default PurchaseOrders;