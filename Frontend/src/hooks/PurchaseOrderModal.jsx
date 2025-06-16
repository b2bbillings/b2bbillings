import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import PurchaseOrderForm from './PurchaseOrderForm';

function PurchaseOrderModal({
    show,
    onHide,
    editingOrder = null,
    onSave,
    inventoryItems = [],
    suppliers = [],
    companyId,
    addToast,
    orderTypes = [],
    loading = false,
    categories = [],
    bankAccounts = []
}) {
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    // Reset form state when modal opens/closes
    useEffect(() => {
        if (show) {
            setFormError(null);
            setFormLoading(false);
        }
    }, [show]);

    // Enhanced save handler with loading states
    const handleSave = async (orderData) => {
        console.log('📋 PurchaseOrderModal handling save:', orderData);

        try {
            setFormLoading(true);
            setFormError(null);

            if (!onSave) {
                throw new Error('No save handler provided');
            }

            const result = await onSave(orderData);

            if (result?.success) {
                console.log('✅ Purchase order saved successfully:', result);

                // Show success message
                if (addToast) {
                    const orderNumber = result.data?.orderNumber || orderData.orderNumber || 'New Order';
                    const message = editingOrder
                        ? `Purchase order ${orderNumber} updated successfully!`
                        : `Purchase order ${orderNumber} created successfully!`;
                    addToast(message, 'success');
                }

                // Close modal after successful save
                setTimeout(() => {
                    onHide();
                }, 500);

                return result;
            } else {
                // Handle save failure
                const errorMessage = result?.message || result?.error || 'Failed to save purchase order';
                setFormError(errorMessage);

                if (addToast) {
                    addToast(errorMessage, 'error');
                }

                return result;
            }
        } catch (error) {
            console.error('❌ Error in PurchaseOrderModal save:', error);

            const errorMessage = error.message || 'An unexpected error occurred while saving';
            setFormError(errorMessage);

            if (addToast) {
                addToast(errorMessage, 'error');
            }

            return {
                success: false,
                error: errorMessage,
                data: null
            };
        } finally {
            setFormLoading(false);
        }
    };

    // Handle modal close
    const handleClose = () => {
        if (formLoading) {
            // Prevent closing while saving
            if (addToast) {
                addToast('Please wait while saving...', 'warning');
            }
            return;
        }

        setFormError(null);
        onHide();
    };

    // Handle cancel from form
    const handleCancel = () => {
        if (formLoading) {
            if (addToast) {
                addToast('Cannot cancel while saving...', 'warning');
            }
            return;
        }

        handleClose();
    };

    // Modal title
    const modalTitle = editingOrder
        ? `Edit Purchase Order - ${editingOrder.orderNumber || 'Draft'}`
        : 'Create New Purchase Order';

    return (
        <Modal
            show={show}
            onHide={handleClose}
            size="xl"
            centered
            backdrop={formLoading ? 'static' : true}
            keyboard={!formLoading}
            className="purchase-order-modal"
        >
            <Modal.Header closeButton={!formLoading} className="border-0 pb-0">
                <Modal.Title className="text-primary fw-bold">
                    <i className="fas fa-file-invoice me-2"></i>
                    {modalTitle}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-0">
                {/* Show loading overlay */}
                {(loading || formLoading) && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 1050 }}>
                        <div className="text-center">
                            <Spinner animation="border" variant="primary" className="mb-2" />
                            <div className="text-muted">
                                {formLoading ? 'Saving purchase order...' : 'Loading...'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Show error alert */}
                {formError && (
                    <div className="p-3">
                        <Alert variant="danger" className="mb-0">
                            <Alert.Heading className="h6">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Error Saving Purchase Order
                            </Alert.Heading>
                            <p className="mb-0">{formError}</p>
                        </Alert>
                    </div>
                )}

                {/* Purchase Order Form */}
                <div className={`purchase-order-form-container ${(loading || formLoading) ? 'position-relative' : ''}`}>
                    <PurchaseOrderForm
                        editingOrder={editingOrder}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        onExit={handleClose}
                        inventoryItems={inventoryItems}
                        categories={categories}
                        bankAccounts={bankAccounts}
                        addToast={addToast}
                        orderTypes={orderTypes}
                        companyId={companyId}
                    />
                </div>
            </Modal.Body>

            {/* Modal Footer with action buttons */}
            <Modal.Footer className="border-0 pt-0">
                <div className="d-flex justify-content-between align-items-center w-100">
                    <div className="text-muted small">
                        {editingOrder ? (
                            <>
                                <i className="fas fa-edit me-1"></i>
                                Editing: {editingOrder.orderNumber || 'Draft Order'}
                            </>
                        ) : (
                            <>
                                <i className="fas fa-plus me-1"></i>
                                Creating new purchase order
                            </>
                        )}
                    </div>

                    <div className="d-flex gap-2">
                        <Button
                            variant="outline-secondary"
                            onClick={handleClose}
                            disabled={formLoading}
                            className="px-3"
                        >
                            <i className="fas fa-times me-2"></i>
                            {formLoading ? 'Saving...' : 'Close'}
                        </Button>

                        {/* Note: Save functionality is handled by ItemsTableWithTotals inside the form */}
                        <div className="text-muted small d-flex align-items-center">
                            <i className="fas fa-info-circle me-1"></i>
                            Use Save button in the form below
                        </div>
                    </div>
                </div>
            </Modal.Footer>

            {/* Enhanced Modal Styling */}
            <style>
                {`
                .purchase-order-modal .modal-dialog {
                    max-width: 95vw;
                    margin: 1rem auto;
                }

                .purchase-order-modal .modal-content {
                    border: none;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }

                .purchase-order-modal .modal-header {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(156, 136, 255, 0.05) 100%);
                    border-bottom: 1px solid rgba(108, 99, 255, 0.1);
                    padding: 1.5rem 1.5rem 1rem;
                }

                .purchase-order-modal .modal-title {
                    font-size: 1.25rem;
                    color: #6c63ff;
                }

                .purchase-order-modal .modal-body {
                    max-height: 80vh;
                    overflow-y: auto;
                    padding: 0;
                }

                .purchase-order-modal .modal-footer {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%);
                    border-top: 1px solid rgba(108, 99, 255, 0.1);
                    padding: 1rem 1.5rem;
                }

                .purchase-order-form-container {
                    min-height: 400px;
                }

                /* Loading overlay styling */
                .purchase-order-modal .bg-opacity-75 {
                    backdrop-filter: blur(2px);
                    border-radius: 12px;
                }

                /* Responsive design */
                @media (max-width: 1200px) {
                    .purchase-order-modal .modal-dialog {
                        max-width: 98vw;
                        margin: 0.5rem auto;
                    }
                }

                @media (max-width: 768px) {
                    .purchase-order-modal .modal-dialog {
                        max-width: 100vw;
                        margin: 0;
                        height: 100vh;
                    }

                    .purchase-order-modal .modal-content {
                        height: 100vh;
                        border-radius: 0;
                    }

                    .purchase-order-modal .modal-body {
                        max-height: calc(100vh - 140px);
                    }

                    .purchase-order-modal .modal-header,
                    .purchase-order-modal .modal-footer {
                        padding: 1rem;
                    }

                    .purchase-order-modal .modal-title {
                        font-size: 1.1rem;
                    }
                }

                /* Animation for smooth opening */
                .purchase-order-modal .modal.show .modal-dialog {
                    animation: slideInDown 0.3s ease-out;
                }

                @keyframes slideInDown {
                    from {
                        opacity: 0;
                        transform: translate3d(0, -20px, 0);
                    }
                    to {
                        opacity: 1;
                        transform: translate3d(0, 0, 0);
                    }
                }

                /* Enhanced close button */
                .purchase-order-modal .btn-close {
                    opacity: 0.6;
                    transition: opacity 0.2s ease;
                }

                .purchase-order-modal .btn-close:hover {
                    opacity: 1;
                }

                /* Footer button styling */
                .purchase-order-modal .modal-footer .btn {
                    border-radius: 8px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .purchase-order-modal .modal-footer .btn-outline-secondary {
                    border-width: 2px;
                }

                .purchase-order-modal .modal-footer .btn-outline-secondary:hover {
                    transform: translateY(-1px);
                }

                /* Scrollbar styling for modal body */
                .purchase-order-modal .modal-body::-webkit-scrollbar {
                    width: 6px;
                }

                .purchase-order-modal .modal-body::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }

                .purchase-order-modal .modal-body::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }

                .purchase-order-modal .modal-body::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                `}
            </style>
        </Modal>
    );
}

export default PurchaseOrderModal;