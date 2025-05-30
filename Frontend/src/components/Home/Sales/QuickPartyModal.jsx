import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUserPlus } from '@fortawesome/free-solid-svg-icons';

function QuickPartyModal({ 
    show, 
    onHide, 
    quickPartyData, 
    onQuickPartyChange, 
    onAddQuickParty 
}) {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header className="border-0 pb-0">
                <Modal.Title className="fw-bold">Add New Party</Modal.Title>
                <Button
                    variant="link"
                    className="p-0 border-0 text-muted"
                    onClick={onHide}
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </Button>
            </Modal.Header>
            <Modal.Body className="px-4 pb-4">
                <Form onSubmit={onAddQuickParty}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Party Type</Form.Label>
                        <div className="d-flex gap-4">
                            <Form.Check
                                type="radio"
                                name="partyType"
                                id="quick-customer"
                                label="Customer"
                                value="customer"
                                checked={quickPartyData.partyType === 'customer'}
                                onChange={onQuickPartyChange}
                            />
                            <Form.Check
                                type="radio"
                                name="partyType"
                                id="quick-supplier"
                                label="Supplier"
                                value="supplier"
                                checked={quickPartyData.partyType === 'supplier'}
                                onChange={onQuickPartyChange}
                            />
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={quickPartyData.name}
                            onChange={onQuickPartyChange}
                            placeholder="Enter party name"
                            className="form-input"
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Phone</Form.Label>
                        <Form.Control
                            type="tel"
                            name="phone"
                            value={quickPartyData.phone}
                            onChange={onQuickPartyChange}
                            placeholder="Enter phone number"
                            className="form-input"
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Email</Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            value={quickPartyData.email}
                            onChange={onQuickPartyChange}
                            placeholder="Enter email"
                            className="form-input"
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Address</Form.Label>
                        <Form.Control
                            type="text"
                            name="address"
                            value={quickPartyData.address}
                            onChange={onQuickPartyChange}
                            placeholder="Enter address"
                            className="form-input"
                        />
                    </Form.Group>
                    <div className="d-flex gap-3 justify-content-end">
                        <Button
                            variant="outline-secondary"
                            onClick={onHide}
                            className="px-4"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            className="px-4"
                        >
                            <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                            Add Party
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

export default QuickPartyModal;