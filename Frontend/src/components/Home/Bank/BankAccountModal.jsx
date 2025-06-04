import React from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

function BankAccountModal({ show, onHide, editingAccount, formData, onInputChange, onSaveAccount }) {
    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSaveAccount(e);
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg" className="bank-modal">
            <Modal.Header closeButton>
                <Modal.Title>
                    {editingAccount ? 'Edit Account' : 'Add Bank Account'}
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleFormSubmit}>
                <Modal.Body>
                    {/* Top Row - Basic Info */}
                    <Row className="g-3 mb-4">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Account Display Name *</Form.Label>
                                <Form.Control
                                    name="accountName"
                                    value={formData.accountName}
                                    onChange={onInputChange}
                                    placeholder="Enter display name"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Opening Balance</Form.Label>
                                <Form.Control
                                    name="openingBalance"
                                    type="number"
                                    step="0.01"
                                    value={formData.openingBalance}
                                    onChange={onInputChange}
                                    placeholder="0.00"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>As of Date</Form.Label>
                                <Form.Control
                                    name="asOfDate"
                                    type="date"
                                    value={formData.asOfDate || new Date().toISOString().split('T')[0]}
                                    onChange={onInputChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Checkboxes */}
                    <Row className="g-3 mb-4">
                        <Col md={6}>
                            <Form.Check
                                type="checkbox"
                                name="printUpiQrCodes"
                                label="Print UPI QR Code on Invoices"
                                checked={formData.printUpiQrCodes || false}
                                onChange={(e) => onInputChange({
                                    target: {
                                        name: 'printUpiQrCodes',
                                        type: 'checkbox',
                                        checked: e.target.checked
                                    }
                                })}
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Check
                                type="checkbox"
                                name="printBankDetails"
                                label="Print bank details on invoices"
                                checked={formData.printBankDetails || false}
                                onChange={(e) => onInputChange({
                                    target: {
                                        name: 'printBankDetails',
                                        type: 'checkbox',
                                        checked: e.target.checked
                                    }
                                })}
                            />
                        </Col>
                    </Row>

                    {/* Dynamic Fields - Shows ONLY when checkboxes are selected */}
                    {(formData.printUpiQrCodes || formData.printBankDetails) && (
                        <>
                            {/* First Row */}
                            <Row className="g-3 mb-3">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Account Number *</Form.Label>
                                        <Form.Control
                                            name="accountNumber"
                                            value={formData.accountNumber}
                                            onChange={onInputChange}
                                            placeholder="Enter account number"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>IFSC Code</Form.Label>
                                        <Form.Control
                                            name="ifscCode"
                                            value={formData.ifscCode}
                                            onChange={onInputChange}
                                            placeholder="Enter IFSC code"
                                            style={{ textTransform: 'uppercase' }}
                                        />
                                    </Form.Group>
                                </Col>
                                {formData.printUpiQrCodes && (
                                    <>
                                        <Col md={1} className="d-flex align-items-center justify-content-center">
                                            <span className="text-muted">Or</span>
                                        </Col>
                                        <Col md={5}>
                                            <Form.Group>
                                                <Form.Label>UPI ID for QR Codes</Form.Label>
                                                <Form.Control
                                                    name="upiId"
                                                    value={formData.upiId || ''}
                                                    onChange={onInputChange}
                                                    placeholder="Enter UPI ID"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </>
                                )}
                                {formData.printBankDetails && !formData.printUpiQrCodes && (
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Bank Name</Form.Label>
                                            <Form.Control
                                                name="bankName"
                                                value={formData.bankName}
                                                onChange={onInputChange}
                                                placeholder="Enter bank name"
                                            />
                                        </Form.Group>
                                    </Col>
                                )}
                            </Row>

                            {/* Second Row */}
                            {formData.printBankDetails && (
                                <Row className="g-3 mb-4">
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>Account Holder Name</Form.Label>
                                            <Form.Control
                                                name="accountHolderName"
                                                value={formData.accountHolderName || ''}
                                                onChange={onInputChange}
                                                placeholder="Enter account holder name"
                                            />
                                        </Form.Group>
                                    </Col>
                                    {formData.printUpiQrCodes && (
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label>Bank Name</Form.Label>
                                                <Form.Control
                                                    name="bankName"
                                                    value={formData.bankName}
                                                    onChange={onInputChange}
                                                    placeholder="Enter bank name"
                                                />
                                            </Form.Group>
                                        </Col>
                                    )}
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>Branch Name</Form.Label>
                                            <Form.Control
                                                name="branchName"
                                                value={formData.branchName}
                                                onChange={onInputChange}
                                                placeholder="Enter branch name"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <div>
                        <small className="text-muted">* Required fields</small>
                    </div>
                    <div>
                        <Button variant="outline-secondary" onClick={onHide} className="me-2">
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Save & Exit
                        </Button>
                    </div>
                </Modal.Footer>
            </Form>

            {/* Custom Styles */}
            <style jsx>{`
                .bank-modal .modal-header {
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    color: white;
                    border-bottom: none;
                }
                
                .bank-modal .modal-header .btn-close {
                    filter: invert(1);
                }
                
                .bank-modal .form-label {
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 6px;
                    font-size: 0.9rem;
                }
                
                .bank-modal .form-control,
                .bank-modal .form-select {
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    padding: 10px 12px;
                    transition: border-color 0.2s ease;
                    font-size: 0.9rem;
                }
                
                .bank-modal .form-control:focus,
                .bank-modal .form-select:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                }
                
                .bank-modal .form-check-label {
                    font-weight: 500;
                    color: #555;
                }
                
                .bank-modal .btn-primary {
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    border: none;
                    padding: 10px 24px;
                    font-weight: 600;
                }
                
                .bank-modal .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
                }
                
                @media (max-width: 768px) {
                    .bank-modal .modal-dialog {
                        margin: 1rem;
                        max-width: calc(100% - 2rem);
                    }
                }
            `}</style>
        </Modal>
    );
}

export default BankAccountModal;