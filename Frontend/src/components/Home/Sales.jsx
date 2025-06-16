import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import SalesInvoices from './Sales/SalesInvoices';

function Sales({
    view = 'allSales',
    onNavigate,
    currentCompany,
    isOnline = true,
    addToast,
    companyId: propCompanyId
}) {
    const { companyId: urlCompanyId } = useParams();
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Use companyId from props or URL
    const companyId = propCompanyId || urlCompanyId;

    // Handle view mapping for the new system - ✅ FIXED: Added quotations mapping
    const mapViewToSubView = (viewName) => {

        const viewMap = {
            'allSales': 'invoices',
            'invoices': 'invoices',
            'quotations': 'quotations', // ✅ ADDED: quotations mapping
            'creditNotes': 'credit-notes',
            'salesReturns': 'returns',
            'estimates': 'estimates'
        };

        const mappedView = viewMap[viewName] || 'invoices';

        return mappedView;
    };

    // Handle navigation to forms - ✅ UPDATED: Better handling for quotations
    const handleAddSale = () => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        // ✅ UPDATED: Navigate based on current view
        if (view === 'quotations') {
            navigate(`/companies/${companyId}/quotations/add`);
        } else {
            navigate(`/companies/${companyId}/sales/add`);
        }
    };

    const handleEditSale = (saleId) => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        // ✅ UPDATED: Navigate based on current view
        if (view === 'quotations') {
            navigate(`/companies/${companyId}/quotations/${saleId}/edit`);
        } else {
            navigate(`/companies/${companyId}/sales/${saleId}/edit`);
        }
    };

    // Handle navigation to different views within sales - ✅ UPDATED
    const handleViewChange = (newView) => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        const viewPaths = {
            'invoices': 'sales',
            'quotations': 'quotations', // ✅ ADDED: quotations path
            'credit-notes': 'credit-notes',
            'returns': 'sales-returns',
            'estimates': 'estimates'
        };

        const path = viewPaths[newView] || 'sales';

        if (onNavigate) {
            onNavigate(newView);
        } else {
            navigate(`/companies/${companyId}/${path}`);
        }
    };

    // Update redirecting logic for better UX
    useEffect(() => {
        // Handle legacy view redirects
        const legacyViews = ['oldSales', 'salesTable', 'legacySales'];

        if (legacyViews.includes(view)) {
            setIsRedirecting(true);

            // Add toast notification for better UX
            addToast?.('Redirecting to the new Invoice System...', 'info', 3000);

            if (onNavigate) {
                onNavigate('allSales');
            } else {
                navigate(`/companies/${companyId}/sales`);
            }

            // Reset redirecting state
            setTimeout(() => setIsRedirecting(false), 1500);
        }
    }, [view, onNavigate, navigate, companyId, addToast]);

    // Show loading state while redirecting
    if (isRedirecting) {
        return (
            <div className="sales-container d-flex justify-content-center align-items-center">
                <Alert variant="info" className="text-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    🔄 Redirecting to Invoice System...
                </Alert>
            </div>
        );
    }

    // Show warning if no company selected
    if (!companyId) {
        return (
            <div className="sales-container">
                <div className="container-fluid py-4">
                    <Alert variant="warning" className="text-center">
                        <h5>⚠️ No Company Selected</h5>
                        <p className="mb-0">
                            Please select a company to view and manage {view === 'quotations' ? 'quotations' : 'sales invoices'}.
                        </p>
                        <small className="text-muted d-block mt-2">
                            You can select a company from the header dropdown.
                        </small>
                    </Alert>
                </div>
            </div>
        );
    }

    // Show offline warning if needed
    if (!isOnline) {
        return (
            <div className="sales-container">
                <div className="container-fluid py-4">
                    <Alert variant="warning" className="text-center">
                        <h5>📡 No Internet Connection</h5>
                        <p className="mb-0">
                            {view === 'quotations' ? 'Quotations' : 'Sales'} data requires an internet connection. Please check your network and try again.
                        </p>
                    </Alert>
                </div>
            </div>
        );
    }

    // Map current view to sub-view for SalesInvoices
    const subView = mapViewToSubView(view);

    // Render the SalesInvoices component with enhanced props - ✅ UPDATED
    return (
        <div className="sales-container">
            <SalesInvoices
                companyId={companyId}
                currentCompany={currentCompany}
                view={subView} // ✅ This should be 'quotations' when view='quotations'
                onAddSale={handleAddSale}
                onEditSale={handleEditSale}
                onViewChange={handleViewChange}
                onNavigate={onNavigate}
                isOnline={isOnline}
                addToast={addToast}
                // ✅ ADDED: Pass additional props to help SalesInvoices differentiate
                mode={view === 'quotations' ? 'quotations' : 'invoices'}
                pageTitle={view === 'quotations' ? 'Quotations' : 'Sales Invoices'}
                documentType={view === 'quotations' ? 'quotation' : 'invoice'}
            />

            {/* Enhanced Styles for seamless integration */}
            <style jsx>{`
                .sales-container {
                    width: 100%;
                    height: 100%;
                    min-height: 100vh;
                    background-color: #f8f9fa;
                }
                
                /* Remove any legacy styles */
                .page-title,
                .custom-tabs,
                .sales-summary-grid {
                    display: none !important;
                }
                
                /* Ensure full width for invoice system */
                .sales-container > div {
                    width: 100%;
                    min-height: 100vh;
                }

                /* Enhanced loading and warning states */
                .sales-container .alert {
                    margin: 2rem;
                    padding: 2rem;
                    border-radius: 0.75rem;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    border: none;
                }

                .sales-container .alert-info {
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    border-left: 4px solid #2196f3;
                    color: #1565c0;
                }

                .sales-container .alert-warning {
                    background: linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%);
                    border-left: 4px solid #ff9800;
                    color: #ef6c00;
                }

                .sales-container .alert h5 {
                    margin-bottom: 0.75rem;
                    font-weight: 600;
                }

                .sales-container .spinner-border-sm {
                    width: 1rem;
                    height: 1rem;
                }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .sales-container .alert {
                        margin: 1rem;
                        padding: 1.5rem;
                    }
                    
                    .sales-container .alert h5 {
                        font-size: 1.1rem;
                    }
                }

                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .sales-container {
                        background-color: #121212;
                    }
                }

                /* Animation for smooth transitions */
                .sales-container {
                    animation: fadeIn 0.3s ease-in-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Print styles */
                @media print {
                    .sales-container .alert {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}

export default Sales;