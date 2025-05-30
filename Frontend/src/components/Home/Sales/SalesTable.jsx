import React from 'react';
import { Card, Button, Table, Badge, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileExport,
    faPlus,
    faEllipsisV,
    faEye,
    faEdit,
    faPrint,
    faDownload,
    faTrash,
    faMoneyBillWave,
    faCreditCard
} from '@fortawesome/free-solid-svg-icons';
import SalesFilters from './SalesFileters';

function SalesTable({
    filteredSales,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    onCreateInvoice,
    onEditSale,
    onDeleteSale,
    onManagePayment,
    onPrintInvoice
}) {
    const getPaymentStatusBadge = (sale) => {
        const totalPaid = sale.paymentHistory?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0;
        const remainingAmount = sale.total - totalPaid;

        if (remainingAmount <= 0) {
            return { bg: 'success', text: 'Paid', icon: 'check' };
        } else if (totalPaid > 0) {
            return { bg: 'warning', text: 'Partial', icon: 'clock' };
        } else {
            return { bg: 'danger', text: 'Pending', icon: 'exclamation' };
        }
    };

    const getPaymentProgress = (sale) => {
        const totalPaid = sale.paymentHistory?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0;
        return Math.round((totalPaid / sale.total) * 100);
    };

    return (
        <Card className="shadow mb-4">
            <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                <h6 className="m-0 font-weight-bold text-primary">Sales Invoices</h6>
                <div className="d-flex gap-2">
                    <Button variant="outline-secondary" size="sm">
                        <FontAwesomeIcon icon={faFileExport} className="me-1" />
                        Export
                    </Button>
                    <Button variant="primary" size="sm" onClick={onCreateInvoice}>
                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                        New Invoice
                    </Button>
                </div>
            </Card.Header>
            <Card.Body>
                <SalesFilters
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                />

                <div className="table-responsive">
                    <Table hover>
                        <thead className="table-light">
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Amount</th>
                                <th>Payment Status</th>
                                <th>Progress</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length > 0 ? (
                                filteredSales.map((sale) => {
                                    const statusBadge = getPaymentStatusBadge(sale);
                                    const progress = getPaymentProgress(sale);

                                    return (
                                        <tr key={sale.id}>
                                            <td className="fw-bold">{sale.invoiceNumber}</td>
                                            <td>
                                                <div>
                                                    <div className="fw-semibold">{sale.customerName}</div>
                                                    {sale.customerPhone && (
                                                        <small className="text-muted">{sale.customerPhone}</small>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{new Date(sale.invoiceDate || sale.createdAt).toLocaleDateString()}</td>
                                            <td>{sale.items.length} item(s)</td>
                                            <td className="fw-bold">₹{sale.total.toLocaleString()}</td>
                                            <td>
                                                <Badge bg={statusBadge.bg} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                                                    {statusBadge.text}
                                                </Badge>
                                                {sale.paymentHistory && sale.paymentHistory.length > 0 && (
                                                    <small className="text-muted d-block mt-1">
                                                        ₹{(sale.paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount), 0)).toLocaleString()} paid
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="progress" style={{ width: '60px', height: '6px' }}>
                                                        <div
                                                            className={`progress-bar bg-${statusBadge.bg}`}
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <small className="text-muted">{progress}%</small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    {/* Quick Payment Button */}
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={() => onManagePayment(sale)}
                                                        title="Manage Payment"
                                                    >
                                                        <FontAwesomeIcon icon={faMoneyBillWave} />
                                                    </Button>

                                                    {/* Quick Print Button */}
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => onPrintInvoice(sale)}
                                                        title="Print Invoice"
                                                    >
                                                        <FontAwesomeIcon icon={faPrint} />
                                                    </Button>

                                                    {/* More Actions Dropdown */}
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant="outline-secondary" size="sm" className="p-1 px-2">
                                                            <FontAwesomeIcon icon={faEllipsisV} />
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                                                View Details
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => onEditSale(sale)}>
                                                                <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                                Edit Invoice
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Item onClick={() => onManagePayment(sale)}>
                                                                <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                                                                Payment History
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => onPrintInvoice(sale)}>
                                                                <FontAwesomeIcon icon={faPrint} className="me-2" />
                                                                Print Invoice
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <FontAwesomeIcon icon={faDownload} className="me-2" />
                                                                Download PDF
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Item
                                                                onClick={() => onDeleteSale(sale.id)}
                                                                className="text-danger"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                                Delete
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">
                                        No sales found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
}

export default SalesTable;