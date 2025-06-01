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
import SalesFilters from './SalesFilters';

function SalesTable({
    filteredSales,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    sortConfig,
    setSortConfig,
    onCreateInvoice,
    onEditSale,
    onDeleteSale,
    onManagePayment,
    onPrintInvoice
}) {
    // Helper function to safely convert to number
    const safeToNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    // Helper function to format currency safely
    const formatCurrency = (amount) => {
        return safeToNumber(amount).toFixed(2);
    };

    const getPaymentStatusBadge = (sale) => {
        const totalPaid = sale.payments?.reduce((sum, payment) => sum + safeToNumber(payment.amount), 0) ||
            sale.paymentHistory?.reduce((sum, payment) => sum + safeToNumber(payment.amount), 0) || 0;
        const saleTotal = safeToNumber(sale.total || sale.finalTotal || 0);
        const remainingAmount = saleTotal - totalPaid;

        if (remainingAmount <= 0) {
            return { bg: 'success', text: 'Paid', icon: 'check' };
        } else if (totalPaid > 0) {
            return { bg: 'warning', text: 'Partial', icon: 'clock' };
        } else {
            return { bg: 'danger', text: 'Pending', icon: 'exclamation' };
        }
    };

    const getPaymentProgress = (sale) => {
        const totalPaid = sale.payments?.reduce((sum, payment) => sum + safeToNumber(payment.amount), 0) ||
            sale.paymentHistory?.reduce((sum, payment) => sum + safeToNumber(payment.amount), 0) || 0;
        const saleTotal = safeToNumber(sale.total || sale.finalTotal || 0);
        return saleTotal > 0 ? Math.round((totalPaid / saleTotal) * 100) : 0;
    };

    const getTotalPaid = (sale) => {
        return sale.payments?.reduce((sum, payment) => sum + safeToNumber(payment.amount), 0) ||
            sale.paymentHistory?.reduce((sum, payment) => sum + safeToNumber(payment.amount), 0) || 0;
    };

    const handleDeleteSale = (saleId) => {
        if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            onDeleteSale(saleId);
        }
    };

    return (
        <Card className="shadow mb-4">
            <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                <h6 className="m-0 font-weight-bold text-primary">
                    Sales Invoices ({filteredSales.length})
                </h6>
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
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    paymentStatusFilter={paymentStatusFilter}
                    setPaymentStatusFilter={setPaymentStatusFilter}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig}
                />

                <div className="table-responsive">
                    <Table hover className="mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Items</th>
                                <th>Amount</th>
                                <th>Payment Status</th>
                                <th>Progress</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length > 0 ? (
                                filteredSales.map((sale) => {
                                    const statusBadge = getPaymentStatusBadge(sale);
                                    const progress = getPaymentProgress(sale);
                                    const totalPaid = getTotalPaid(sale);
                                    const saleTotal = safeToNumber(sale.total || sale.finalTotal || 0);
                                    const gstAmount = safeToNumber(sale.gstAmount || sale.taxAmount || 0);

                                    return (
                                        <tr key={sale.id}>
                                            <td>
                                                <div className="fw-bold text-primary">{sale.invoiceNumber}</div>
                                                <small className="text-muted">
                                                    {sale.invoiceType?.toUpperCase()} Invoice
                                                </small>
                                            </td>
                                            <td>
                                                <div>
                                                    <div className="fw-semibold">
                                                        {sale.customerName || sale.partyName || 'Walk-in Customer'}
                                                    </div>
                                                    {(sale.customerPhone || sale.partyPhone) && (
                                                        <small className="text-muted">
                                                            📞 {sale.customerPhone || sale.partyPhone}
                                                        </small>
                                                    )}
                                                    {(sale.customerEmail || sale.partyEmail) && (
                                                        <small className="text-muted d-block">
                                                            ✉️ {sale.customerEmail || sale.partyEmail}
                                                        </small>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div>{new Date(sale.invoiceDate || sale.createdAt).toLocaleDateString()}</div>
                                                <small className="text-muted">
                                                    {new Date(sale.invoiceDate || sale.createdAt).toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </small>
                                            </td>
                                            <td>
                                                <Badge
                                                    bg={sale.invoiceType === 'gst' ? 'info' : 'secondary'}
                                                    className="text-uppercase"
                                                >
                                                    {sale.invoiceType || 'N/A'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div className="fw-semibold">{sale.items?.length || 0} item(s)</div>
                                                {sale.items?.length > 0 && (
                                                    <small className="text-muted">
                                                        {sale.items[0].productService}
                                                        {sale.items.length > 1 && ` +${sale.items.length - 1} more`}
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <div className="fw-bold fs-6">₹{saleTotal.toLocaleString()}</div>
                                                {sale.invoiceType === 'gst' && gstAmount > 0 && (
                                                    <small className="text-muted">
                                                        incl. GST ₹{formatCurrency(gstAmount)}
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <Badge
                                                    bg={statusBadge.bg}
                                                    className="d-flex align-items-center gap-1 mb-1"
                                                    style={{ width: 'fit-content' }}
                                                >
                                                    {statusBadge.text}
                                                </Badge>
                                                {(sale.payments?.length > 0 || sale.paymentHistory?.length > 0) && (
                                                    <div>
                                                        <small className="text-success fw-semibold">
                                                            ₹{totalPaid.toLocaleString()} paid
                                                        </small>
                                                        {totalPaid < saleTotal && (
                                                            <small className="text-danger d-block">
                                                                ₹{(saleTotal - totalPaid).toLocaleString()} due
                                                            </small>
                                                        )}
                                                    </div>
                                                )}
                                                {sale.installments && sale.installments.length > 0 && (
                                                    <small className="text-info d-block">
                                                        {sale.installments.length} installment{sale.installments.length > 1 ? 's' : ''}
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="progress" style={{ width: '50px', height: '8px' }}>
                                                        <div
                                                            className={`progress-bar bg-${statusBadge.bg}`}
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <small className="text-muted fw-semibold">{progress}%</small>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex gap-1 justify-content-center">
                                                    <Button
                                                        variant={progress < 100 ? "success" : "outline-success"}
                                                        size="sm"
                                                        onClick={() => onManagePayment(sale)}
                                                        title={progress < 100 ? "Add Payment" : "View Payment History"}
                                                        className={progress < 100 ? "pulse-animation" : ""}
                                                    >
                                                        <FontAwesomeIcon icon={faMoneyBillWave} />
                                                    </Button>

                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => onPrintInvoice(sale)}
                                                        title="Print Invoice"
                                                    >
                                                        <FontAwesomeIcon icon={faPrint} />
                                                    </Button>

                                                    <Dropdown>
                                                        <Dropdown.Toggle
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            className="p-1 px-2 border-0"
                                                        >
                                                            <FontAwesomeIcon icon={faEllipsisV} />
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu align="end">
                                                            <Dropdown.Header>Invoice Actions</Dropdown.Header>
                                                            <Dropdown.Item>
                                                                <FontAwesomeIcon icon={faEye} className="me-2 text-info" />
                                                                View Details
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => onEditSale(sale)}>
                                                                <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                                                                Edit Invoice
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Header>Payment & Print</Dropdown.Header>
                                                            <Dropdown.Item onClick={() => onManagePayment(sale)}>
                                                                <FontAwesomeIcon icon={faCreditCard} className="me-2 text-success" />
                                                                Payment Management
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => onPrintInvoice(sale)}>
                                                                <FontAwesomeIcon icon={faPrint} className="me-2 text-primary" />
                                                                Print Invoice
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <FontAwesomeIcon icon={faDownload} className="me-2 text-info" />
                                                                Download PDF
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Item
                                                                onClick={() => handleDeleteSale(sale.id)}
                                                                className="text-danger"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                                Delete Invoice
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
                                    <td colSpan="9" className="text-center py-5">
                                        <div className="text-muted">
                                            <FontAwesomeIcon icon={faFileExport} size="3x" className="mb-3 opacity-50" />
                                            <div className="h5">No sales invoices found</div>
                                            <p>Create your first invoice to get started</p>
                                            <Button variant="primary" onClick={onCreateInvoice}>
                                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                                Create Invoice
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>

                {/* Summary Footer */}
                {filteredSales.length > 0 && (
                    <div className="mt-3 p-3 bg-light rounded">
                        <div className="row text-center">
                            <div className="col-md-3">
                                <div className="fw-bold text-primary fs-5">
                                    {filteredSales.length}
                                </div>
                                <small className="text-muted">Total Invoices</small>
                            </div>
                            <div className="col-md-3">
                                <div className="fw-bold text-success fs-5">
                                    ₹{filteredSales.reduce((sum, sale) => sum + safeToNumber(sale.total || sale.finalTotal || 0), 0).toLocaleString()}
                                </div>
                                <small className="text-muted">Total Revenue</small>
                            </div>
                            <div className="col-md-3">
                                <div className="fw-bold text-warning fs-5">
                                    {filteredSales.filter(sale => {
                                        const totalPaid = getTotalPaid(sale);
                                        const saleTotal = safeToNumber(sale.total || sale.finalTotal || 0);
                                        return totalPaid > 0 && totalPaid < saleTotal;
                                    }).length}
                                </div>
                                <small className="text-muted">Partial Payments</small>
                            </div>
                            <div className="col-md-3">
                                <div className="fw-bold text-danger fs-5">
                                    {filteredSales.filter(sale => {
                                        const totalPaid = getTotalPaid(sale);
                                        return totalPaid === 0;
                                    }).length}
                                </div>
                                <small className="text-muted">Pending Payments</small>
                            </div>
                        </div>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
}

export default SalesTable;