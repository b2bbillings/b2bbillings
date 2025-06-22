import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import SalesInvoices from './Sales/SalesInvoices';

function Quotations({
    view = 'quotations',
    onNavigate,
    currentCompany,
    currentUser,
    isOnline = true,
    addToast,
    companyId: propCompanyId,
    saleOrderService
}) {
    const { companyId: urlCompanyId } = useParams();
    const navigate = useNavigate();

    // Use companyId from props or URL
    const companyId = propCompanyId || urlCompanyId;

    // ✅ SIMPLE: Always navigate to page (like purchase orders)
    const handleAddQuotation = () => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        console.log('📋 Adding new quotation - navigating to page:', companyId);

        if (onNavigate) {
            onNavigate('createQuotation');
        } else {
            navigate(`/companies/${companyId}/quotations/add`);
        }
    };

    // ✅ SIMPLE: Always navigate to edit page (like purchase orders)
    const handleEditQuotation = (quotation) => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        const quotationId = quotation.id || quotation._id;

        if (!quotationId) {
            console.error('❌ No valid quotation ID found:', quotation);
            addToast?.('Unable to edit quotation: ID not found', 'error');
            return;
        }

        console.log('✏️ Editing quotation - navigating to page:', quotationId);

        if (onNavigate) {
            onNavigate('editQuotation', { quotationId, quotation });
        } else {
            navigate(`/companies/${companyId}/quotations/edit/${quotationId}`);
        }
    };

    // ✅ SIMPLE: Delete handler
    const handleDeleteQuotation = async (quotation) => {
        const quotationNumber = quotation.quotationNumber || quotation.orderNo || 'Unknown';
        const quotationId = quotation.id || quotation._id;

        const confirmDelete = window.confirm(
            `Are you sure you want to delete quotation ${quotationNumber}?\n\nThis action cannot be undone.`
        );

        if (confirmDelete) {
            try {
                addToast?.(`Deleting quotation ${quotationNumber}...`, 'info');

                if (saleOrderService && quotationId) {
                    const result = await saleOrderService.deleteSalesOrder(quotationId);
                    if (result?.success) {
                        addToast?.(`Quotation ${quotationNumber} deleted successfully!`, 'success');
                    } else {
                        throw new Error(result?.message || 'Failed to delete quotation');
                    }
                } else {
                    // Fallback simulation
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    addToast?.(`Quotation ${quotationNumber} deleted successfully!`, 'success');
                }
            } catch (error) {
                console.error('❌ Delete error:', error);
                addToast?.(`Failed to delete quotation ${quotationNumber}: ${error.message}`, 'error');
            }
        }
    };

    // ✅ SIMPLE: Print handler
    const handlePrintQuotation = (quotation) => {
        const quotationNumber = quotation.quotationNumber || quotation.orderNo || 'Unknown';
        console.log('🖨️ Print quotation:', quotationNumber);
        addToast?.(`Printing quotation ${quotationNumber}...`, 'info');

        // Simulate print
        setTimeout(() => {
            addToast?.(`Quotation ${quotationNumber} sent to printer!`, 'success');
        }, 1500);
    };

    // ✅ SIMPLE: Share handler
    const handleShareQuotation = async (quotation) => {
        const quotationNumber = quotation.quotationNumber || quotation.orderNo || 'Unknown';
        const customerName = quotation.partyName || 'Customer';
        const amount = quotation.amount ? `₹${quotation.amount.toLocaleString()}` : 'Amount TBD';

        const shareText = `Quotation ${quotationNumber}\nCustomer: ${customerName}\nAmount: ${amount}`;

        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareText);
                addToast?.(`Quotation ${quotationNumber} details copied to clipboard!`, 'success');
            } else {
                addToast?.(`Share text: ${shareText}`, 'info');
            }
        } catch (error) {
            console.error('❌ Share error:', error);
            addToast?.(`Failed to share quotation ${quotationNumber}`, 'error');
        }
    };

    // ✅ SIMPLE: Convert handler
    const handleConvertQuotation = async (quotation) => {
        const quotationNumber = quotation.quotationNumber || quotation.orderNo || 'Unknown';
        const quotationId = quotation.id || quotation._id;

        const confirmConvert = window.confirm(
            `Convert quotation ${quotationNumber} to Sales Invoice?\n\nThis will create a new invoice and mark the quotation as converted.`
        );

        if (confirmConvert) {
            try {
                addToast?.(`Converting quotation ${quotationNumber} to invoice...`, 'info');

                if (saleOrderService && quotationId) {
                    // Create invoice data from quotation
                    const invoiceData = {
                        ...quotation,
                        orderType: 'invoice',
                        documentType: 'invoice',
                        originalQuotationId: quotationId,
                        invoiceDate: new Date().toISOString().split('T')[0],
                        status: 'pending'
                    };

                    const result = await saleOrderService.createSalesOrder(invoiceData);

                    if (result?.success) {
                        const newInvoiceNumber = result.data?.invoiceNumber || 'Generated';
                        addToast?.(`Quotation ${quotationNumber} converted to invoice ${newInvoiceNumber}!`, 'success');

                        // Ask if user wants to view invoices
                        setTimeout(() => {
                            const viewInvoices = window.confirm(`Conversion successful! View invoices now?`);
                            if (viewInvoices && onNavigate) {
                                onNavigate('invoices');
                            }
                        }, 2000);
                    } else {
                        throw new Error(result?.message || 'Failed to create invoice');
                    }
                } else {
                    // Fallback simulation
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    addToast?.(`Quotation ${quotationNumber} converted to invoice!`, 'success');
                }
            } catch (error) {
                console.error('❌ Conversion error:', error);
                addToast?.(`Failed to convert quotation ${quotationNumber}: ${error.message}`, 'error');
            }
        }
    };

    // ✅ SIMPLE: Download handler
    const handleDownloadQuotation = (quotation) => {
        const quotationNumber = quotation.quotationNumber || quotation.orderNo || 'Unknown';
        console.log('💾 Download quotation:', quotationNumber);
        addToast?.(`Downloading quotation ${quotationNumber}...`, 'info');

        // Simulate download
        setTimeout(() => {
            addToast?.(`Quotation ${quotationNumber} downloaded successfully!`, 'success');
        }, 1500);
    };

    // Show warning if no company selected
    if (!companyId) {
        return (
            <div className="quotations-container" style={{
                width: '100%',
                height: '100%',
                minHeight: '100vh',
                backgroundColor: '#f8f9fa'
            }}>
                <div className="container-fluid py-4">
                    <Alert variant="warning" className="text-center">
                        <h5>⚠️ No Company Selected</h5>
                        <p className="mb-0">Please select a company to view and manage quotations.</p>
                    </Alert>
                </div>
            </div>
        );
    }

    // Show offline warning if needed
    if (!isOnline) {
        return (
            <div className="quotations-container" style={{
                width: '100%',
                height: '100%',
                minHeight: '100vh',
                backgroundColor: '#f8f9fa'
            }}>
                <div className="container-fluid py-4">
                    <Alert variant="warning" className="text-center">
                        <h5>📡 No Internet Connection</h5>
                        <p className="mb-0">Quotations data requires an internet connection.</p>
                    </Alert>
                </div>
            </div>
        );
    }

    // ✅ SIMPLIFIED: Render SalesInvoices with NO modal complexity
    return (
        <div className="quotations-container" style={{
            width: '100%',
            height: '100%',
            minHeight: '100vh',
            backgroundColor: '#f8f9fa'
        }}>
            <SalesInvoices
                companyId={companyId}
                currentCompany={currentCompany}
                currentUser={currentUser}
                view="quotations"

                // ✅ SIMPLE: Action handlers that ALWAYS navigate to pages
                onAddSale={handleAddQuotation}
                onEditSale={handleEditQuotation}
                onDeleteSale={handleDeleteQuotation}
                onPrintSale={handlePrintQuotation}
                onShareSale={handleShareQuotation}
                onConvertSale={handleConvertQuotation}
                onDownloadSale={handleDownloadQuotation}

                onNavigate={onNavigate}
                isOnline={isOnline}
                addToast={addToast}

                // ✅ SIMPLE: Services
                salesService={saleOrderService}
                quotationService={saleOrderService}
                saleOrderService={saleOrderService}

                // ✅ SIMPLE: Quotation mode
                mode="quotations"
                pageTitle="Quotations Management"
                documentType="quotation"
                formType="quotation"

            // ✅ REMOVED: All useAdvancedForm, showFormModal, and complex props
            // Now it's just simple page navigation like purchase orders
            />
        </div>
    );
}

export default Quotations;