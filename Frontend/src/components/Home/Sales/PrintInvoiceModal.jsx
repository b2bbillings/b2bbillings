import React, { useRef } from 'react';
import { Modal, Button, Row, Col, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPrint, faDownload } from '@fortawesome/free-solid-svg-icons';
import { useReactToPrint } from 'react-to-print';

function PrintInvoiceModal({ show, onHide, sale }) {
    const componentRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Invoice-${sale?.invoiceNumber}`,
    });

    const handleDownloadPDF = () => {
        // This would integrate with a PDF generation library
        alert('PDF download functionality will be implemented');
    };

    if (!sale) return null;

    const totalPaid = sale.paymentHistory?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0;
    const remainingAmount = sale.total - totalPaid;

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    <FontAwesomeIcon icon={faPrint} className="me-2" />
                    Print Invoice - {sale.invoiceNumber}
                </Modal.Title>
                <Button variant="link" className="p-0 border-0 text-muted" onClick={onHide}>
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </Button>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                {/* Print Actions */}
                <div className="d-flex gap-2 mb-4">
                    <Button variant="primary" onClick={handlePrint}>
                        <FontAwesomeIcon icon={faPrint} className="me-2" />
                        Print Invoice
                    </Button>
                    <Button variant="outline-primary" onClick={handleDownloadPDF}>
                        <FontAwesomeIcon icon={faDownload} className="me-2" />
                        Download PDF
                    </Button>
                </div>

                {/* Invoice Content */}
                <div ref={componentRef} className="p-4 bg-white" style={{ minHeight: '800px' }}>
                    {/* Company Header */}
                    <div className="text-center mb-4">
                        <h2 className="fw-bold text-primary">Your Company Name</h2>
                        <p className="mb-1">123 Business Street, City, State 12345</p>
                        <p className="mb-1">Phone: (555) 123-4567 | Email: info@company.com</p>
                        <p className="mb-0">GST No: 27AAACR5055K1ZX</p>
                    </div>

                    <hr className="my-4" />

                    {/* Invoice Header */}
                    <Row className="mb-4">
                        <Col md={6}>
                            <h4 className="fw-bold text-primary">INVOICE</h4>
                            <p className="mb-1"><strong>Invoice No:</strong> {sale.invoiceNumber}</p>
                            <p className="mb-1"><strong>Invoice Date:</strong> {new Date(sale.invoiceDate).toLocaleDateString()}</p>
                            <p className="mb-0"><strong>Invoice Type:</strong> {sale.invoiceType?.toUpperCase()} Invoice</p>
                        </Col>
                        <Col md={6} className="text-end">
                            <h5 className="fw-bold">Bill To:</h5>
                            <p className="mb-1"><strong>{sale.customerName}</strong></p>
                            {sale.customerPhone && <p className="mb-1">Phone: {sale.customerPhone}</p>}
                            {sale.customerEmail && <p className="mb-1">Email: {sale.customerEmail}</p>}
                            {sale.customerAddress && <p className="mb-1">{sale.customerAddress}</p>}
                            {sale.customerCity && <p className="mb-0">{sale.customerCity}</p>}
                        </Col>
                    </Row>

                    {/* Items Table */}
                    <Table bordered className="mb-4">
                        <thead className="table-dark">
                            <tr>
                                <th>#</th>
                                <th>Product/Service</th>
                                <th className="text-center">Qty</th>
                                <th className="text-end">Rate</th>
                                <th className="text-end">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sale.items.map((item, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{item.productService}</td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td className="text-end">₹{parseFloat(item.price).toLocaleString()}</td>
                                    <td className="text-end">₹{parseFloat(item.total).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    {/* Totals Section */}
                    <Row>
                        <Col md={8}>
                            {sale.notes && (
                                <div>
                                    <h6 className="fw-bold">Notes:</h6>
                                    <p className="text-muted">{sale.notes}</p>
                                </div>
                            )}
                        </Col>
                        <Col md={4}>
                            <Table borderless className="mb-0">
                                <tbody>
                                    <tr>
                                        <td className="text-end"><strong>Subtotal:</strong></td>
                                        <td className="text-end">₹{sale.subtotal.toLocaleString()}</td>
                                    </tr>
                                    {sale.invoiceType === 'gst' && sale.tax > 0 && (
                                        <tr>
                                            <td className="text-end"><strong>GST ({sale.tax}%):</strong></td>
                                            <td className="text-end">₹{((sale.subtotal * sale.tax) / 100).toLocaleString()}</td>
                                        </tr>
                                    )}
                                    {sale.discount > 0 && (
                                        <tr>
                                            <td className="text-end"><strong>Discount ({sale.discount}%):</strong></td>
                                            <td className="text-end text-danger">-₹{((sale.subtotal * sale.discount) / 100).toLocaleString()}</td>
                                        </tr>
                                    )}
                                    <tr className="table-dark">
                                        <td className="text-end"><strong>Total:</strong></td>
                                        <td className="text-end"><strong>₹{sale.total.toLocaleString()}</strong></td>
                                    </tr>
                                </tbody>
                            </Table>
                        </Col>
                    </Row>

                    {/* Payment Status */}
                    {sale.paymentHistory && sale.paymentHistory.length > 0 && (
                        <div className="mt-4">
                            <h6 className="fw-bold">Payment Status:</h6>
                            <Row>
                                <Col md={4}>
                                    <p className="mb-1"><strong>Total Paid:</strong> <span className="text-success">₹{totalPaid.toLocaleString()}</span></p>
                                </Col>
                                <Col md={4}>
                                    <p className="mb-1"><strong>Remaining:</strong> <span className={remainingAmount > 0 ? 'text-danger' : 'text-success'}>₹{remainingAmount.toLocaleString()}</span></p>
                                </Col>
                                <Col md={4}>
                                    <p className="mb-1"><strong>Status:</strong>
                                        <span className={`ms-2 ${remainingAmount <= 0 ? 'text-success' : totalPaid > 0 ? 'text-warning' : 'text-danger'}`}>
                                            {remainingAmount <= 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING'}
                                        </span>
                                    </p>
                                </Col>
                            </Row>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center mt-5 pt-4 border-top">
                        <p className="mb-1 text-muted">Thank you for your business!</p>
                        <p className="mb-0 small text-muted">This is a computer generated invoice</p>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default PrintInvoiceModal;