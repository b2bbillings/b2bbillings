import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faBuilding } from '@fortawesome/free-solid-svg-icons';

import SalesInvoices from './Sales/SalesInvoices';
import salesService from '../../services/salesService';
import saleOrderService from '../../services/saleOrderService';

function Sales({
    view = 'allSales',
    onNavigate,
    currentCompany,
    currentUser,
    isOnline = true,
    addToast,
    companyId: propCompanyId,
    onSave
}) {
    const { companyId: urlCompanyId } = useParams();
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const companyId = propCompanyId || urlCompanyId;

    // ✅ SIMPLIFIED: Map view names to component subviews
    const mapViewToSubView = (viewName) => {
        const viewMap = {
            'allSales': 'invoices',
            'invoices': 'invoices',
            'quotations': 'quotations',
            'salesOrders': 'salesOrders',
            'creditNotes': 'credit-notes',
            'salesReturns': 'returns',
            'estimates': 'estimates'
        };
        return viewMap[viewName] || 'invoices';
    };

    // ✅ SIMPLIFIED: Always navigate to page (no modal logic)
    const handleAddSale = () => {
        console.log('🧾 Sales.jsx - Adding new sale/quotation:', view);

        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        // ✅ FIXED: Navigate based on current view
        if (view === 'quotations') {
            console.log('📋 Sales.jsx - Navigating to quotation creation');
            if (onNavigate) {
                onNavigate('createQuotation');
            } else {
                navigate(`/companies/${companyId}/quotations/add`);
            }
        } else {
            console.log('🧾 Sales.jsx - Navigating to invoice creation');
            if (onNavigate) {
                onNavigate('createInvoice');
            } else {
                navigate(`/companies/${companyId}/sales/add`);
            }
        }
    };

    // ✅ SIMPLIFIED: Always navigate to edit page (no modal logic)
    const handleEditSale = (transaction) => {
        console.log('✏️ Sales.jsx - Editing transaction:', transaction.id || transaction._id);

        const transactionId = transaction.id || transaction._id;

        if (!transactionId) {
            addToast?.('Unable to edit: Transaction ID not found', 'error');
            return;
        }

        // ✅ FIXED: Navigate based on current view
        if (view === 'quotations') {
            console.log('📋 Sales.jsx - Navigating to quotation edit');
            if (onNavigate) {
                onNavigate('editQuotation', { quotationId: transactionId, quotation: transaction });
            } else {
                navigate(`/companies/${companyId}/quotations/edit/${transactionId}`);
            }
        } else {
            console.log('🧾 Sales.jsx - Navigating to invoice edit');
            if (onNavigate) {
                onNavigate('editSalesInvoice', { invoiceId: transactionId, invoice: transaction });
            } else {
                navigate(`/companies/${companyId}/sales/edit/${transactionId}`);
            }
        }
    };

    // ✅ SIMPLIFIED: View handler
    const handleViewSale = (transaction) => {
        console.log('👁️ Sales.jsx - Viewing transaction:', transaction.id || transaction._id);
        // View logic can be handled by the table component
    };

    // ✅ SIMPLIFIED: Delete handler
    const handleDeleteSale = async (transaction) => {
        console.log('🗑️ Sales.jsx - Deleting transaction:', transaction.id || transaction._id);
        // Delete logic will be handled by SalesInvoices component
    };

    // ✅ SIMPLIFIED: Print handler
    const handlePrintSale = (transaction) => {
        console.log('🖨️ Sales.jsx - Printing transaction:', transaction.id || transaction._id);
        const docName = view === 'quotations' ? 'quotation' : 'invoice';
        const docNumber = transaction.quotationNumber || transaction.invoiceNo || 'Unknown';
        addToast?.(`Printing ${docName} ${docNumber}...`, 'info');
    };

    // ✅ SIMPLIFIED: Share handler
    const handleShareSale = (transaction) => {
        console.log('📤 Sales.jsx - Sharing transaction:', transaction.id || transaction._id);
        const docName = view === 'quotations' ? 'quotation' : 'invoice';
        const docNumber = transaction.quotationNumber || transaction.invoiceNo || 'Unknown';
        addToast?.(`Sharing ${docName} ${docNumber}...`, 'info');
    };

    // ✅ SIMPLIFIED: Convert handler
    const handleConvertSale = (transaction) => {
        console.log('🔄 Sales.jsx - Converting transaction:', transaction.id || transaction._id);
        // Convert logic will be handled by SalesInvoices component
    };

    // ✅ SIMPLIFIED: Download handler
    const handleDownloadSale = (transaction) => {
        console.log('💾 Sales.jsx - Downloading transaction:', transaction.id || transaction._id);
        const docName = view === 'quotations' ? 'quotation' : 'invoice';
        const docNumber = transaction.quotationNumber || transaction.invoiceNo || 'Unknown';
        addToast?.(`Downloading ${docName} ${docNumber}...`, 'info');
    };

    // ✅ SIMPLIFIED: Save handlers
    const handleCreateSale = async (saleData) => {
        try {
            console.log('💾 Sales.jsx - Creating sale/quotation:', view, saleData);

            if (!saleData || typeof saleData !== 'object') {
                return { success: false, error: 'Invalid sale data' };
            }

            const isQuotation = view === 'quotations' || saleData.documentType === 'quotation';

            let result;
            if (isQuotation) {
                const quotationData = {
                    ...saleData,
                    documentType: 'quotation',
                    orderType: 'quotation',
                    mode: 'quotations'
                };
                result = await saleOrderService.createSalesOrder(quotationData);
            } else {
                const invoiceData = {
                    ...saleData,
                    documentType: 'invoice',
                    mode: 'invoices'
                };
                result = await salesService.createInvoice(invoiceData);
            }

            if (result?.success) {
                const docName = isQuotation ? 'Quotation' : 'Invoice';
                addToast?.(`${docName} created successfully!`, 'success');

                // Navigate back to list
                setTimeout(() => {
                    if (isQuotation) {
                        navigate(`/companies/${companyId}/quotations`);
                    } else {
                        navigate(`/companies/${companyId}/sales`);
                    }
                }, 1500);
            }

            return result;
        } catch (error) {
            console.error('❌ Sales.jsx - Save error:', error);
            const docName = view === 'quotations' ? 'quotation' : 'invoice';
            addToast?.(`Error creating ${docName}: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    };

    // Get page title based on view
    const getPageTitle = (viewName) => {
        const titleMap = {
            'allSales': 'All Sales',
            'invoices': 'Sales Invoices',
            'quotations': 'Quotations',
            'salesOrders': 'Sales Orders',
            'creditNotes': 'Credit Notes',
            'salesReturns': 'Sales Returns',
            'estimates': 'Estimates'
        };
        return titleMap[viewName] || 'Sales Management';
    };

    // Get document type based on view
    const getDocumentType = (viewName) => {
        const typeMap = {
            'allSales': 'invoice',
            'invoices': 'invoice',
            'quotations': 'quotation',
            'salesOrders': 'sales_order',
            'creditNotes': 'credit_note',
            'salesReturns': 'sales_return',
            'estimates': 'estimate'
        };
        return typeMap[viewName] || 'invoice';
    };

    // Early returns for error states
    if (!companyId) {
        return (
            <div className="sales-container">
                <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
                    <FontAwesomeIcon icon={faBuilding} size="3x" className="text-muted mb-3" />
                    <h4 className="text-muted">No Company Selected</h4>
                    <p className="text-muted text-center">
                        Please select a company to access Sales Management.
                    </p>
                </Container>
            </div>
        );
    }

    if (isRedirecting) {
        return (
            <div className="sales-container">
                <Container className="d-flex justify-content-center align-items-center min-vh-100">
                    <div className="text-center">
                        <Spinner animation="border" role="status" className="mb-3">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                        <p className="text-muted">Loading Sales...</p>
                    </div>
                </Container>
            </div>
        );
    }

    const subView = mapViewToSubView(view);

    // ✅ FIXED: Render SalesInvoices with clean props (no modal complexity)
    return (
        <div className="sales-container">
            <SalesInvoices
                companyId={companyId}
                currentCompany={currentCompany}
                currentUser={currentUser}
                view={subView}
                mode={view === 'quotations' ? 'quotations' : 'invoices'}
                pageTitle={getPageTitle(view)}
                documentType={getDocumentType(view)}
                formType={view === 'quotations' ? 'quotation' : 'sales'}

                // ✅ SIMPLE: Action handlers that ALWAYS navigate to pages
                onAddSale={handleAddSale}
                onEditSale={handleEditSale}
                onViewSale={handleViewSale}
                onDeleteSale={handleDeleteSale}
                onPrintSale={handlePrintSale}
                onShareSale={handleShareSale}
                onConvertSale={handleConvertSale}
                onDownloadSale={handleDownloadSale}

                // Save handlers
                onCreateSale={handleCreateSale}
                onSave={view === 'quotations' ? handleCreateSale : onSave}
                onSaveQuotation={handleCreateSale}

                // Navigation and utilities
                onNavigate={onNavigate}
                isOnline={isOnline}
                addToast={addToast}

                // Services
                salesService={salesService}
                quotationService={saleOrderService}
                saleOrderService={saleOrderService}

            // ✅ REMOVED: All useAdvancedForm, showFormModal, and complex props
            // Clean, simple navigation only
            />
        </div>
    );
}

export default Sales;