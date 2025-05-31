import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUserPlus } from '@fortawesome/free-solid-svg-icons';

function QuickSupplierModal({
    show,
    onHide,
    quickSupplierData,
    onQuickSupplierChange,
    onAddQuickSupplier
}) {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header className="border-0 pb-0">
                <Modal.Title className="fw-bold">Add Quick Supplier</Modal.Title>
                <Button variant="link" className="p-0 border-0 text-muted" onClick={onHide}>
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </Button>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                <Form onSubmit={onAddQuickSupplier}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Supplier Type</Form.Label>
                        <div className="d-flex gap-3">
                            <Form.Check
                                type="radio"
                                name="partyType"
                                id="quick-supplier"
                                label="Supplier"
                                value="supplier"
                                checked={quickSupplierData.partyType === 'supplier'}
                                onChange={onQuickSupplierChange}
                            />
                            <Form.Check
                                type="radio"
                                name="partyType"
                                id="quick-vendor"
                                label="Vendor"
                                value="vendor"
                                checked={quickSupplierData.partyType === 'vendor'}
                                onChange={onQuickSupplierChange}
                            />
                        </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={quickSupplierData.name}
                            onChange={onQuickSupplierChange}
                            placeholder="Enter supplier name"
                            className="form-input"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Phone</Form.Label>
                        <Form.Control
                            type="tel"
                            name="phone"
                            value={quickSupplierData.phone}
                            onChange={onQuickSupplierChange}
                            placeholder="Enter phone number"
                            className="form-input"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Email</Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            value={quickSupplierData.email}
                            onChange={onQuickSupplierChange}
                            placeholder="Enter email"
                            className="form-input"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">GST Number</Form.Label>
                        <Form.Control
                            type="text"
                            name="gstNumber"
                            value={quickSupplierData.gstNumber}
                            onChange={onQuickSupplierChange}
                            placeholder="Enter GST number"
                            className="form-input"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Address</Form.Label>
                        <Form.Control
                            type="text"
                            name="address"
                            value={quickSupplierData.address}
                            onChange={onQuickSupplierChange}
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
                            Add Supplier
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

export default QuickSupplierModal;