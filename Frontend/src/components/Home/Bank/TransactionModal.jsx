import React from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

function TransactionModal({ show, onHide, account, formData, onInputChange, onSaveTransaction }) {
    if (!account) return null;

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Add Transaction</Modal.Title>
            </Modal.Header>
            <Form onSubmit={onSaveTransaction}>
                <Modal.Body>
                    <Row className="g-2">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Type</Form.Label>
                                <Form.Select
                                    name="transactionType"
                                    value={formData.transactionType}
                                    onChange={onInputChange}
                                >
                                    <option value="deposit">Deposit</option>
                                    <option value="withdrawal">Withdrawal</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Amount</Form.Label>
                                <Form.Control
                                    name="amount"
                                    type="number"
                                    value={formData.amount}
                                    onChange={onInputChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    name="description"
                                    value={formData.description}
                                    onChange={onInputChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Reference</Form.Label>
                                <Form.Control
                                    name="reference"
                                    value={formData.reference}
                                    onChange={onInputChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Date</Form.Label>
                                <Form.Control
                                    name="transactionDate"
                                    type="date"
                                    value={formData.transactionDate}
                                    onChange={onInputChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Payment Method</Form.Label>
                                <Form.Select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={onInputChange}
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="cash">Cash</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Category</Form.Label>
                                <Form.Control
                                    name="category"
                                    value={formData.category}
                                    onChange={onInputChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit">
                        Add Transaction
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default TransactionModal;