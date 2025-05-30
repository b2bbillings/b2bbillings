import React from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import salesEmptyState from '../../../assets/images/sales-empty-state.svg';

function SalesEmptyState({ onCreateInvoice }) {
    return (
        <div className="empty-state-container">
            <div className="empty-state-content text-center">
                <h2 className="mt-4">Start Your Sales Journey</h2>
                <p className="text-muted mb-4">
                    Create your first invoice and start tracking your sales.
                    <br />
                    Generate professional invoices and manage your revenue efficiently!
                </p>

                <div className="empty-state-image-container mb-4">
                    <img
                        src={salesEmptyState}
                        alt="Create your first sale"
                        className="empty-state-image"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div>

                <Button
                    variant="primary"
                    size="lg"
                    className="create-sale-btn"
                    onClick={onCreateInvoice}
                >
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Create Your First Invoice
                </Button>
            </div>
        </div>
    );
}

export default SalesEmptyState;