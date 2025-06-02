import React from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faComment,
    faComments,
    faEnvelope,
    faPhone,
    faHistory
} from '@fortawesome/free-solid-svg-icons';

function PartyMessage({ party, paymentSummary, formatCurrency }) {
    return (
        <div className="p-4">
            <h4 className="mb-3">Message Center</h4>
            <Card>
                <Card.Header>
                    <h6 className="mb-0">
                        <FontAwesomeIcon icon={faComment} className="me-2" />
                        Send Message
                    </h6>
                </Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Message Type</Form.Label>
                            <Form.Select>
                                <option>Select message type</option>
                                <option value="payment_reminder">Payment Reminder</option>
                                <option value="invoice_notification">Invoice Notification</option>
                                <option value="statement">Statement</option>
                                <option value="custom">Custom Message</option>
                            </Form.Select>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>Template</Form.Label>
                            <Form.Select>
                                <option>Select template</option>
                                <option value="payment_due">Payment Due Reminder</option>
                                <option value="thank_you">Thank You for Business</option>
                                <option value="invoice_ready">Invoice Ready</option>
                                <option value="custom">Custom Template</option>
                            </Form.Select>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>Message</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={5}
                                placeholder="Enter your message here"
                                defaultValue={`Dear ${party.name},\n\nThis is a reminder that you have an outstanding balance of ₹${formatCurrency(paymentSummary.salesDue)} due for payment.\n\nPlease arrange for the settlement at your earliest convenience.\n\nRegards,\nYour Business Name`}
                            />
                        </Form.Group>
                        
                        <div className="d-flex gap-3">
                            <Button variant="primary">
                                <FontAwesomeIcon icon={faComments} className="me-1" />
                                Send WhatsApp
                            </Button>
                            <Button variant="info" className="text-white">
                                <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                                Send Email
                            </Button>
                            <Button variant="secondary">
                                <FontAwesomeIcon icon={faPhone} className="me-1" />
                                Send SMS
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
            
            <Card className="mt-4">
                <Card.Header>
                    <h6 className="mb-0">
                        <FontAwesomeIcon icon={faHistory} className="me-2" />
                        Message History
                    </h6>
                </Card.Header>
                <Card.Body>
                    <Alert variant="info">
                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                        No message history available. Messages sent to this party will appear here.
                    </Alert>
                </Card.Body>
            </Card>
        </div>
    );
}

export default PartyMessage;