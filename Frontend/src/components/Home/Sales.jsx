import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faBuilding } from '@fortawesome/free-solid-svg-icons';

// Import components
import SalesInvoices from './Sales/SalesInvoices';
import Quotations from './Quotations'; // ✅ ADDED: Import Quotations component

// ✅ FIXED: Import salesService instance (not class)
import salesService from '../../services/salesService';

function Sales({
    view = 'allSales',
    onNavigate,
    currentCompany,
    isOnline = true,
    addToast,
    companyId: propCompanyId,
    onSave // ✅ Accept onSave prop from HomePage
}) {
    const { companyId: urlCompanyId } = useParams();
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Use companyId from props or URL
    const companyId = propCompanyId || urlCompanyId;

    // Handle view mapping for the new system
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

        const mappedView = viewMap[viewName] || 'invoices';
        return mappedView;
    };

    // ✅ FIXED: Enhanced handleCreateSale with proper validation
    const handleCreateSale = async (saleData) => {
        try {
            // ✅ CRITICAL FIX: Handle initialization calls gracefully
            if (!saleData) {
                console.warn('⚠️ Sales.jsx: handleCreateSale called without data (likely initialization)');
                return {
                    success: false,
                    error: 'No sale data provided',
                    message: 'Sale data is required',
                    isInitializationCall: true
                };
            }

            // ✅ ENHANCED: Validate saleData structure
            if (typeof saleData !== 'object') {
                console.error('❌ Sales.jsx: saleData is not an object:', typeof saleData);
                throw new Error('Invalid sale data format');
            }

            console.log('🔄 Sales.jsx: Creating sale/invoice with:', {
                hasOnSaveProp: !!onSave,
                companyId: companyId,
                view: view,
                hasValidSaleData: !!saleData,
                customerName: saleData.customerName || saleData.customer?.name || 'N/A',
                itemCount: saleData.items?.length || 0,
                dataKeys: Object.keys(saleData || {})
            });

            // ✅ VALIDATION: Check required fields
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            // ✅ VALIDATION: Check items array
            if (!saleData.items || !Array.isArray(saleData.items) || saleData.items.length === 0) {
                throw new Error('At least one item is required for the sale');
            }

            // ✅ ENHANCED: Build complete sale data with all required fields
            const completeSaleData = {
                // Basic invoice info
                companyId: companyId,
                invoiceNumber: saleData.invoiceNumber || `INV-${Date.now()}`,
                invoiceDate: saleData.invoiceDate || new Date().toISOString().split('T')[0],
                invoiceType: saleData.gstEnabled ? 'gst' : 'non-gst',
                documentType: getDocumentType(view),

                // Customer info (handle both string ID and object)
                customer: saleData.customer,
                customerName: saleData.customerName || saleData.customer?.name || 'Cash Customer',
                customerMobile: saleData.customerMobile || saleData.customer?.mobile || '',

                // Items and calculations
                items: saleData.items || [],
                totals: saleData.totals || {
                    subtotal: 0,
                    totalTax: 0,
                    finalTotal: 0,
                    finalTotalWithRoundOff: 0
                },

                // Tax and pricing settings
                gstEnabled: Boolean(saleData.gstEnabled),
                taxMode: saleData.taxMode || saleData.globalTaxMode || 'without-tax',
                priceIncludesTax: Boolean(saleData.priceIncludesTax),

                // Payment info
                payment: saleData.payment || {
                    method: 'cash',
                    paidAmount: 0,
                    status: 'pending'
                },

                // Additional fields
                notes: saleData.notes || '',
                status: saleData.status || 'draft',
                termsAndConditions: saleData.termsAndConditions || '',

                // Round off
                roundOffValue: saleData.roundOffValue || 0,
                roundOffEnabled: Boolean(saleData.roundOffEnabled),

                // Copy any additional fields
                ...saleData
            };

            console.log('📋 Sales.jsx: Complete sale data prepared:', {
                companyId: completeSaleData.companyId,
                customerName: completeSaleData.customerName,
                customer: completeSaleData.customer,
                itemCount: completeSaleData.items.length,
                finalTotal: completeSaleData.totals.finalTotal,
                documentType: completeSaleData.documentType
            });

            // ✅ CRITICAL: Use onSave prop from HomePage if available
            if (onSave && typeof onSave === 'function') {
                console.log('📤 Sales.jsx: Using onSave prop from HomePage');
                const result = await onSave(completeSaleData);

                // Handle HomePage onSave response
                if (result && result.success) {
                    const documentType = view === 'quotations' ? 'Quotation' : 'Invoice';
                    const invoiceNumber = result.data?.invoiceNumber || completeSaleData.invoiceNumber;

                    addToast?.(
                        `${documentType} ${invoiceNumber} created successfully!`,
                        'success',
                        5000
                    );

                    // Navigate after success
                    setTimeout(() => {
                        if (view === 'quotations') {
                            navigate(`/companies/${companyId}/quotations`);
                        } else {
                            navigate(`/companies/${companyId}/sales`);
                        }
                    }, 1500);
                }

                return result;
            }

            // ✅ FALLBACK: Use salesService directly if no onSave prop
            console.log('📤 Sales.jsx: Using direct salesService call');

            const result = await salesService.createInvoice(completeSaleData);

            console.log('📥 Sales.jsx: salesService response:', {
                success: result?.success,
                hasData: !!result?.data,
                error: result?.error,
                message: result?.message
            });

            // ✅ RESPONSE HANDLING: Check for various response formats
            if (!result) {
                throw new Error('No response from sales service');
            }

            // Success cases
            if (result.success === true || (result.data && !result.error)) {
                const documentType = view === 'quotations' ? 'Quotation' : 'Invoice';
                const invoiceNumber = result.data?.invoiceNumber || completeSaleData.invoiceNumber;

                addToast?.(
                    `${documentType} ${invoiceNumber} created successfully!`,
                    'success',
                    5000
                );

                // Navigate after success
                setTimeout(() => {
                    if (view === 'quotations') {
                        navigate(`/companies/${companyId}/quotations`);
                    } else {
                        navigate(`/companies/${companyId}/sales`);
                    }
                }, 1500);

                return {
                    success: true,
                    data: result.data,
                    message: result.message || `${documentType} created successfully`
                };
            }
            // Error cases
            else if (result.success === false || result.error) {
                throw new Error(result.error || result.message || 'Save operation failed');
            }
            // Unexpected response
            else {
                throw new Error('Unable to confirm invoice creation - unexpected response format');
            }

        } catch (error) {
            console.error('❌ Sales.jsx: Error in handleCreateSale:', {
                error: error,
                message: error.message,
                name: error.name,
                stack: error.stack,
                saleDataProvided: !!saleData,
                saleDataKeys: saleData ? Object.keys(saleData) : null,
                isInitializationCall: !saleData
            });

            // ✅ ENHANCED ERROR HANDLING: Don't show errors for initialization calls
            if (!saleData) {
                return {
                    success: false,
                    error: 'No sale data provided',
                    message: 'Sale data is required',
                    isInitializationCall: true
                };
            }

            const documentType = view === 'quotations' ? 'quotation' : 'invoice';
            let errorMessage = error.message || `Failed to create ${documentType}`;

            // ✅ SPECIFIC ERROR HANDLING
            if (error.response) {
                errorMessage = error.response.data?.message ||
                    error.response.data?.error ||
                    `Server error: ${error.response.status}`;
            } else if (error.request) {
                errorMessage = 'Network error - please check your connection';
            } else if (error.name === 'TypeError' && error.message.includes('constructor')) {
                errorMessage = 'Service configuration error - please refresh the page';
            } else if (error.message.includes('Customer')) {
                errorMessage = error.message; // Keep customer-related errors as is
            } else if (error.message.includes('required')) {
                errorMessage = error.message; // Keep validation errors as is
            }

            // Show error toast
            addToast?.(
                `Failed to create ${documentType}: ${errorMessage}`,
                'error',
                8000
            );

            return {
                success: false,
                error: errorMessage,
                message: errorMessage,
                data: null
            };
        }
    };

    // ✅ DEBUG: Log component rendering
    console.log('🔧 Sales component rendering with:', {
        view,
        subView: mapViewToSubView(view),
        companyId,
        hasOnSave: !!onSave,
        salesServiceAvailable: !!salesService
    });

    // ✅ VALIDATION: Check required props
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

    // ✅ LOADING STATE
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

    // ✅ OFFLINE STATE
    if (!isOnline) {
        return (
            <div className="sales-container">
                <Container className="py-4">
                    <Alert variant="warning" className="text-center">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        You are currently offline. Sales data may not be up to date.
                    </Alert>
                </Container>
            </div>
        );
    }

    // Get mapped subview
    const subView = mapViewToSubView(view);

    // ✅ FIXED: Proper conditional rendering for quotations
    const renderContent = () => {
        // ✅ CRITICAL FIX: Handle quotations view separately
        if (view === 'quotations') {
            console.log('🔄 Sales.jsx: Rendering Quotations component');
            return (
                <Quotations
                    view="quotations"
                    onNavigate={onNavigate}
                    currentCompany={currentCompany}
                    isOnline={isOnline}
                    addToast={addToast}
                    companyId={companyId}
                    onSave={onSave} // ✅ CRITICAL: Pass onSave to Quotations
                />
            );
        }

        // ✅ For all other sales views, use SalesInvoices
        console.log('🔄 Sales.jsx: Rendering SalesInvoices component');
        return (
            <SalesInvoices
                companyId={companyId}
                currentCompany={currentCompany}
                view={subView}
                mode={view}
                pageTitle={getPageTitle(view)}
                documentType={getDocumentType(view)}
                onAddSale={handleCreateSale} // Pass the fixed function
                onCreateSale={handleCreateSale} // Pass the fixed function
                onSave={handleCreateSale} // Pass the fixed function
                onEditSale={(saleData) => {
                    console.log('Edit sale:', saleData);
                    // Handle edit logic here
                }}
                onViewChange={(newView) => {
                    console.log('View change:', newView);
                    if (onNavigate) {
                        onNavigate(newView);
                    }
                }}
                onNavigate={onNavigate}
                isOnline={isOnline}
                addToast={addToast}
                salesService={salesService}
            />
        );
    };

    // ✅ HELPER: Get page title
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

    // ✅ HELPER: Get document type
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

    return (
        <div className="sales-container">
            {renderContent()}
        </div>
    );
}

export default Sales;