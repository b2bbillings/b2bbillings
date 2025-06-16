import React from 'react';
import { Button, Spinner, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave,
    faCheck,
    faPrint,
    faEye,
    faTimes,
    faFileContract
} from '@fortawesome/free-solid-svg-icons';

function SalesOrderActionButtons({
    onSaveDraft,
    onConfirm,
    onPrint,
    onPreview,
    onCancel,
    isSaving,
    isEditing,
    hasItems,
    hasCustomer
}) {
    const isFormValid = hasItems && hasCustomer;

    return (
        <div className="sales-order-actions">
            {/* Primary Actions */}
            <div className="mb-3">
                <Button
                    variant="outline-primary"
                    onClick={onSaveDraft}
                    disabled={isSaving || !hasCustomer}
                    className="w-100 mb-2"
                >
                    {isSaving ? (
                        <>
                            <Spinner size="sm" className="me-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faSave} className="me-2" />
                            {isEditing ? 'Update Draft' : 'Save as Draft'}
                        </>
                    )}
                </Button>

                <Button
                    variant="primary"
                    onClick={onConfirm}
                    disabled={isSaving || !isFormValid}
                    className="w-100"
                >
                    {isSaving ? (
                        <>
                            <Spinner size="sm" className="me-2" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faCheck} className="me-2" />
                            {isEditing ? 'Update & Confirm' : 'Confirm Order'}
                        </>
                    )}
                </Button>
            </div>

            {/* Secondary Actions */}
            <ButtonGroup className="w-100 mb-3">
                <Button
                    variant="outline-secondary"
                    onClick={onPreview}
                    disabled={!isFormValid}
                    size="sm"
                >
                    <FontAwesomeIcon icon={faEye} className="me-1" />
                    Preview
                </Button>
                <Button
                    variant="outline-secondary"
                    onClick={onPrint}
                    disabled={!isFormValid}
                    size="sm"
                >
                    <FontAwesomeIcon icon={faPrint} className="me-1" />
                    Print
                </Button>
            </ButtonGroup>

            {/* Cancel */}
            <Button
                variant="outline-danger"
                onClick={onCancel}
                disabled={isSaving}
                className="w-100"
                size="sm"
            >
                <FontAwesomeIcon icon={faTimes} className="me-2" />
                Cancel
            </Button>

            {/* Validation Messages */}
            {!hasCustomer && (
                <div className="text-muted small mt-2">
                    * Please select a customer to proceed
                </div>
            )}
            {!hasItems && hasCustomer && (
                <div className="text-muted small mt-2">
                    * Please add items to confirm order
                </div>
            )}
        </div>
    );
}

export default SalesOrderActionButtons;