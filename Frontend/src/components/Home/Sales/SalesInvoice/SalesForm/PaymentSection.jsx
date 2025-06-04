import React from 'react';
import { Card, Form, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faUniversity, faCreditCard, faMobile, faCoins } from '@fortawesome/free-solid-svg-icons';

function PaymentSection({ paymentMethod, notes, onPaymentMethodChange, onNotesChange }) {
    const paymentOptions = [
        { value: 'cash', label: 'Cash', icon: faCoins, color: 'success' },
        { value: 'card', label: 'Card', icon: faCreditCard, color: 'primary' },
        { value: 'upi', label: 'UPI', icon: faMobile, color: 'warning' },
        { value: 'bank', label: 'Bank Transfer', icon: faUniversity, color: 'info' },
        { value: 'credit', label: 'Credit', icon: faMoneyBillWave, color: 'secondary' }
    ];

    const selectedPayment = paymentOptions.find(option => option.value === paymentMethod);

    return (
        <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-success text-white">
                <h6 className="mb-0">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                    Payment Details
                </h6>
            </Card.Header>
            <Card.Body>
                <Form.Group className="mb-3">
                    <Form.Label className="text-muted">Payment Method</Form.Label>
                    <div className="d-grid gap-2">
                        {paymentOptions.map((option) => (
                            <div key={option.value}>
                                <Form.Check
                                    type="radio"
                                    id={`payment-${option.value}`}
                                    name="paymentMethod"
                                    value={option.value}
                                    checked={paymentMethod === option.value}
                                    onChange={(e) => onPaymentMethodChange(e.target.value)}
                                    label={
                                        <div className="d-flex align-items-center">
                                            <FontAwesomeIcon
                                                icon={option.icon}
                                                className={`text-${option.color} me-2`}
                                            />
                                            {option.label}
                                        </div>
                                    }
                                    className="payment-option"
                                />
                            </div>
                        ))}
                    </div>
                </Form.Group>

                {selectedPayment && (
                    <div className="mb-3">
                        <Badge
                            bg={selectedPayment.color}
                            className="p-2 w-100 text-center"
                        >
                            <FontAwesomeIcon icon={selectedPayment.icon} className="me-2" />
                            Payment via {selectedPayment.label}
                        </Badge>
                    </div>
                )}

                <Form.Group>
                    <Form.Label className="text-muted">Notes (Optional)</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        placeholder="Add any notes or special instructions..."
                        className="notes-textarea"
                    />
                </Form.Group>
            </Card.Body>
        </Card>
    );
}

export default PaymentSection;