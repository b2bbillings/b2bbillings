// PrintPurchaseModal.jsx
import React from 'react';
import { Modal, Button } from 'react-bootstrap';

function PrintPurchaseModal({ show, onHide, purchase }) {
    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Print Purchase Order</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Print preview and download options will be available here.</p>
                <p>Purchase: {purchase?.purchaseNumber}</p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
                <Button variant="primary">Print</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default PrintPurchaseModal;