// PurchasePaymentModal.jsx
import React from 'react';
import { Modal, Button } from 'react-bootstrap';

function PurchasePaymentModal({ show, onHide, purchase, onUpdatePayment }) {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Payment Management</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Payment management for purchase orders will be available here.</p>
                <p>Purchase: {purchase?.purchaseNumber}</p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default PurchasePaymentModal;