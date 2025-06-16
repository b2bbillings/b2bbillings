import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import SalesInvoices from './Sales/SalesInvoices'; // Reuse the same component

function Quotations({
    view = 'quotations',
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

    // Handle navigation to forms
    const handleAddQuotation = () => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        console.log('📋 Navigating to Add Quotation form');
        navigate(`/companies/${companyId}/quotations/add`);
    };

    const handleEditQuotation = (quotationId) => {
        if (!companyId) {
            addToast?.('Please select a company first', 'warning');
            return;
        }

        console.log('✏️ Navigating to Edit Quotation form:', quotationId);
        navigate(`/companies/${companyId}/quotations/${quotationId}/edit`);
    };

    // Show warning if no company selected
    if (!companyId) {
        return (
            <div className="quotations-container">
                <div className="container-fluid py-4">
                    <Alert variant="warning" className="text-center">
                        <h5>⚠️ No Company Selected</h5>
                        <p className="mb-0">
                            Please select a company to view and manage quotations.
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
            <div className="quotations-container">
                <div className="container-fluid py-4">
                    <Alert variant="warning" className="text-center">
                        <h5>📡 No Internet Connection</h5>
                        <p className="mb-0">
                            Quotations data requires an internet connection. Please check your network and try again.
                        </p>
                    </Alert>
                </div>
            </div>
        );
    }

    // Render the SalesInvoices component but configured for quotations
    return (
        <div className="quotations-container">
            <SalesInvoices
                companyId={companyId}
                currentCompany={currentCompany}
                view="quotations"
                onAddSale={handleAddQuotation}
                onEditSale={handleEditQuotation}
                onNavigate={onNavigate}
                isOnline={isOnline}
                addToast={addToast}
                mode="quotations" // Add this prop to differentiate
                pageTitle="Quotations"
                documentType="quotation"
            />

            <style jsx>{`
                .quotations-container {
                    width: 100%;
                    height: 100%;
                    min-height: 100vh;
                    background-color: #f8f9fa;
                }
            `}</style>
        </div>
    );
}

export default Quotations;