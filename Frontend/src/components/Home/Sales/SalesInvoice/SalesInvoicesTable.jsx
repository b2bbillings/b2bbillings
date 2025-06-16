import React, { useState } from 'react';
import { Button, Table, Badge, Dropdown, InputGroup, Form, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faFileExcel,
    faPrint,
    faSort,
    faEllipsisV,
    faEye,
    faEdit,
    faTrash,
    faShare,
    faArrowUp,
    faArrowDown,
    faExchangeAlt,
    faFileInvoice
} from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesTable({
    transactions = [],
    onViewTransaction,
    onEditTransaction,
    onDeleteTransaction,
    onPrintTransaction,
    onShareTransaction,
    onConvertTransaction, // ✅ NEW PROP for conversion
    mode = 'invoices',
    documentType = 'invoice'
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');

    // Mode detection
    const isQuotationsMode = mode === 'quotations' || documentType === 'quotation';

    // Custom styles object (converted from styled-jsx)
    const customStyles = {
        dropdownToggleNoCaret: {
            '::after': {
                display: 'none'
            }
        },
        tableResponsive: {
            maxHeight: '70vh',
            overflowY: 'auto'
        },
        stickyTop: {
            position: 'sticky',
            top: 0,
            zIndex: 1020
        },
        tableHover: {
            backgroundColor: 'rgba(0, 0, 0, 0.025)'
        },
        buttonHover: {
            backgroundColor: 'rgba(0, 0, 0, 0.05)'
        }
    };

    const getTitle = () => {
        return isQuotationsMode ? 'Quotations' : 'Sales Invoices';
    };

    const getSearchPlaceholder = () => {
        return isQuotationsMode ? 'Search quotations...' : 'Search invoices...';
    };

    const filteredTransactions = transactions.filter(transaction =>
        transaction.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.transaction?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.paymentType?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '₹0';

        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(1)}Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`;
        } else if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(1)}K`;
        }
        return `₹${Math.round(amount)}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    };

    const getTransactionIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'sale': return '💰';
            case 'gst invoice': return '📋';
            case 'purchase': return '🛒';
            case 'return': return '↩️';
            case 'payment': return '💳';
            case 'quotation': return '📝';
            default: return '📄';
        }
    };

    const getPaymentTypeVariant = (paymentType) => {
        switch (paymentType?.toLowerCase()) {
            case 'cash': return 'success';
            case 'credit': return 'warning';
            case 'online': return 'info';
            case 'cheque': return 'secondary';
            default: return 'light';
        }
    };

    const getTransactionVariant = (transaction) => {
        switch (transaction?.toLowerCase()) {
            case 'sale': return 'success';
            case 'gst invoice': return 'primary';
            case 'purchase': return 'info';
            case 'return': return 'danger';
            case 'payment': return 'warning';
            case 'quotation': return 'info';
            default: return 'light';
        }
    };

    const calculateDisplayAmounts = (transaction) => {
        const baseAmount = parseFloat(transaction.amount || 0);
        const cgst = parseFloat(transaction.cgst || 0);
        const sgst = parseFloat(transaction.sgst || 0);
        const totalTax = cgst + sgst;
        const displayBalance = parseFloat(transaction.balance || 0);

        return {
            amount: baseAmount,
            balance: displayBalance,
            cgst: cgst,
            sgst: sgst,
            totalTax: totalTax,
            baseAmount: baseAmount - totalTax
        };
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) {
            return <FontAwesomeIcon icon={faSort} className="ms-1 text-muted" size="xs" />;
        }
        return (
            <FontAwesomeIcon
                icon={sortDirection === 'asc' ? faArrowUp : faArrowDown}
                className={`ms-1 ${isQuotationsMode ? 'text-info' : 'text-primary'}`}
                size="xs"
            />
        );
    };

    // ✅ Helper function to check if quotation can be converted
    const canConvertToInvoice = (transaction) => {
        return isQuotationsMode &&
            !transaction.convertedToInvoice &&
            transaction.status !== 'converted' &&
            transaction.quotationStatus !== 'converted' &&
            transaction.status !== 'cancelled' &&
            transaction.quotationStatus !== 'cancelled';
    };

    return (
        <Card className="border-0 shadow-sm">
            {/* Header */}
            <Card.Header
                className={`${isQuotationsMode ? 'bg-info' : 'bg-primary'} text-white border-0`}
            >
                <div className="row align-items-center">
                    <div className="col-md-6">
                        <h5 className="mb-1 fw-bold">{getTitle()}</h5>
                        <small className="opacity-75">
                            {filteredTransactions.length} records
                        </small>
                    </div>
                    <div className="col-md-6">
                        <div className="row g-2">
                            <div className="col-md-8">
                                <InputGroup size="sm">
                                    <InputGroup.Text className="bg-white bg-opacity-25 border-white border-opacity-25 text-white">
                                        <FontAwesomeIcon icon={faSearch} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder={getSearchPlaceholder()}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="border-white border-opacity-25 bg-white bg-opacity-25 text-white"
                                        style={{
                                            color: 'white'
                                        }}
                                    />
                                </InputGroup>
                            </div>
                            <div className="col-md-4">
                                <div className="d-flex gap-1">
                                    <Button variant="outline-light" size="sm" title="Export to Excel">
                                        <FontAwesomeIcon icon={faFileExcel} />
                                    </Button>
                                    <Button variant="outline-light" size="sm" title="Print">
                                        <FontAwesomeIcon icon={faPrint} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card.Header>

            {/* Table */}
            <Card.Body className="p-0">
                <div
                    className="table-responsive"
                    style={customStyles.tableResponsive}
                >
                    <Table className="mb-0 table-hover table-sm">
                        <thead
                            className="table-light"
                            style={customStyles.stickyTop}
                        >
                            <tr>
                                <th
                                    className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('date')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>Date</small>
                                        {getSortIcon('date')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('invoiceNo')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>{isQuotationsMode ? 'Quote #' : 'Invoice #'}</small>
                                        {getSortIcon('invoiceNo')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('partyName')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>Party</small>
                                        {getSortIcon('partyName')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('transaction')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>Type</small>
                                        {getSortIcon('transaction')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('paymentType')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>Payment</small>
                                        {getSortIcon('paymentType')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold text-center`}
                                    role="button"
                                    onClick={() => handleSort('cgst')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div className="d-flex align-items-center justify-content-center">
                                        <small>CGST</small>
                                        {getSortIcon('cgst')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold text-center`}
                                    role="button"
                                    onClick={() => handleSort('sgst')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div className="d-flex align-items-center justify-content-center">
                                        <small>SGST</small>
                                        {getSortIcon('sgst')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold text-end`}
                                    role="button"
                                    onClick={() => handleSort('amount')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div className="d-flex align-items-center justify-content-end">
                                        <small>Amount</small>
                                        {getSortIcon('amount')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold text-end`}
                                    role="button"
                                    onClick={() => handleSort('balance')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    <div className="d-flex align-items-center justify-content-end">
                                        <small>Balance</small>
                                        {getSortIcon('balance')}
                                    </div>
                                </th>
                                <th className={`border-0 ${isQuotationsMode ? 'text-info' : 'text-primary'} fw-semibold text-center`}>
                                    <small>Actions</small>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center text-muted py-5 border-0">
                                        <div className="d-flex flex-column align-items-center">
                                            <div className="mb-3" style={{ fontSize: '3rem', opacity: '0.5' }}>
                                                {isQuotationsMode ? '📝' : '📊'}
                                            </div>
                                            <h6 className="fw-semibold mb-2 text-secondary">
                                                {isQuotationsMode ? 'No quotations found' : 'No invoices found'}
                                            </h6>
                                            <p className="text-muted mb-0">
                                                {searchQuery
                                                    ? 'Try adjusting your search terms'
                                                    : `Create your first ${isQuotationsMode ? 'quotation' : 'sales invoice'}`
                                                }
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((transaction, index) => {
                                    const calculatedAmounts = calculateDisplayAmounts(transaction);

                                    return (
                                        <tr
                                            key={transaction.id || index}
                                            className="align-middle"
                                            style={{
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.025)'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >
                                            {/* Date */}
                                            <td className="border-0">
                                                <small className="text-dark fw-medium">
                                                    {formatDate(transaction.date)}
                                                </small>
                                            </td>

                                            {/* Invoice/Quote Number */}
                                            <td className="border-0">
                                                <Badge
                                                    bg={isQuotationsMode ? 'info' : 'primary'}
                                                    className="fw-bold"
                                                >
                                                    {transaction.invoiceNo}
                                                </Badge>
                                            </td>

                                            {/* ✅ UPDATED: Party Name with Conversion Status */}
                                            <td className="border-0">
                                                <div>
                                                    <div className="fw-medium text-dark" title={transaction.partyName}>
                                                        <small>
                                                            {transaction.partyName?.length > 12
                                                                ? `${transaction.partyName.substring(0, 12)}...`
                                                                : transaction.partyName}
                                                        </small>
                                                    </div>
                                                    {transaction.partyPhone && (
                                                        <small className="text-muted d-block">
                                                            {transaction.partyPhone.substring(0, 8)}
                                                        </small>
                                                    )}

                                                    {/* ✅ NEW: Conversion Status Indicator */}
                                                    {isQuotationsMode && transaction.convertedToInvoice && (
                                                        <div className="mt-1">
                                                            <Badge bg="success" className="d-flex align-items-center" style={{ fontSize: '0.65rem', width: 'fit-content' }}>
                                                                <FontAwesomeIcon icon={faFileInvoice} className="me-1" size="xs" />
                                                                Converted
                                                            </Badge>
                                                            {transaction.invoiceNumber && (
                                                                <small className="text-success d-block" style={{ fontSize: '0.7rem' }}>
                                                                    INV: {transaction.invoiceNumber}
                                                                </small>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Transaction Type */}
                                            <td className="border-0">
                                                <div className="d-flex align-items-center">
                                                    <span className="me-1">
                                                        {getTransactionIcon(transaction.transaction)}
                                                    </span>
                                                    <Badge
                                                        bg={getTransactionVariant(transaction.transaction)}
                                                        className="text-capitalize"
                                                    >
                                                        <small>
                                                            {transaction.transaction === 'gst invoice' ? 'GST' : transaction.transaction}
                                                        </small>
                                                    </Badge>
                                                </div>
                                            </td>

                                            {/* Payment Type */}
                                            <td className="border-0">
                                                <Badge bg={getPaymentTypeVariant(transaction.paymentType)}>
                                                    <small>{transaction.paymentType}</small>
                                                </Badge>
                                            </td>

                                            {/* CGST */}
                                            <td className="border-0 text-center">
                                                <div>
                                                    <div className="fw-semibold text-info">
                                                        <small>{formatCurrency(calculatedAmounts.cgst)}</small>
                                                    </div>
                                                    {transaction.cgstPercent && calculatedAmounts.cgst > 0 && (
                                                        <small className="text-muted">
                                                            ({transaction.cgstPercent}%)
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* SGST */}
                                            <td className="border-0 text-center">
                                                <div>
                                                    <div className="fw-semibold text-warning">
                                                        <small>{formatCurrency(calculatedAmounts.sgst)}</small>
                                                    </div>
                                                    {transaction.sgstPercent && calculatedAmounts.sgst > 0 && (
                                                        <small className="text-muted">
                                                            ({transaction.sgstPercent}%)
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Total Amount */}
                                            <td className="border-0 text-end">
                                                <div>
                                                    <div className="fw-bold text-success">
                                                        <small>{formatCurrency(calculatedAmounts.amount)}</small>
                                                    </div>
                                                    {calculatedAmounts.totalTax > 0 && (
                                                        <small className="text-muted">
                                                            +₹{Math.round(calculatedAmounts.totalTax)} tax
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Balance */}
                                            <td className="border-0 text-end">
                                                <div>
                                                    <div className={`fw-bold ${calculatedAmounts.balance > 0 ? 'text-danger' : 'text-success'}`}>
                                                        <small>{formatCurrency(calculatedAmounts.balance)}</small>
                                                    </div>
                                                    <small className={calculatedAmounts.balance > 0 ? 'text-danger' : 'text-success'}>
                                                        {calculatedAmounts.balance > 0 ? 'Due' : 'Paid'}
                                                    </small>
                                                </div>
                                            </td>

                                            {/* ✅ UPDATED: Actions with Convert Option */}
                                            <td className="border-0 text-center">
                                                <div className="d-flex gap-1 justify-content-center">
                                                    {/* ✅ NEW: Quick Convert Button for Quotations */}
                                                    {canConvertToInvoice(transaction) && (
                                                        <Button
                                                            variant="outline-success"
                                                            size="sm"
                                                            title="Convert to Invoice"
                                                            onClick={() => onConvertTransaction && onConvertTransaction(transaction)}
                                                            className="me-1"
                                                        >
                                                            <FontAwesomeIcon icon={faExchangeAlt} size="xs" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        title="Print"
                                                        onClick={() => onPrintTransaction(transaction)}
                                                    >
                                                        <FontAwesomeIcon icon={faPrint} size="xs" />
                                                    </Button>
                                                    <Dropdown>
                                                        <Dropdown.Toggle
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            className="dropdown-toggle-no-caret"
                                                            title="More Actions"
                                                            style={{
                                                                '::after': {
                                                                    display: 'none'
                                                                }
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faEllipsisV} size="xs" />
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu align="end">
                                                            <Dropdown.Item
                                                                onClick={() => onViewTransaction(transaction)}
                                                                className="d-flex align-items-center"
                                                            >
                                                                <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
                                                                <small>View</small>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                onClick={() => onEditTransaction(transaction)}
                                                                className="d-flex align-items-center"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                                                                <small>Edit</small>
                                                            </Dropdown.Item>

                                                            {/* ✅ NEW: Convert to Invoice Option in Dropdown */}
                                                            {canConvertToInvoice(transaction) && (
                                                                <>
                                                                    <Dropdown.Divider />
                                                                    <Dropdown.Item
                                                                        onClick={() => onConvertTransaction && onConvertTransaction(transaction)}
                                                                        className="d-flex align-items-center text-success"
                                                                    >
                                                                        <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                                                                        <small>Convert to Invoice</small>
                                                                    </Dropdown.Item>
                                                                </>
                                                            )}

                                                            <Dropdown.Item
                                                                onClick={() => onShareTransaction(transaction)}
                                                                className="d-flex align-items-center"
                                                            >
                                                                <FontAwesomeIcon icon={faShare} className="me-2 text-info" />
                                                                <small>Share</small>
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Item
                                                                onClick={() => onDeleteTransaction(transaction)}
                                                                className="d-flex align-items-center text-danger"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                                <small>Delete</small>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                </div>

                {/* Footer */}
                {filteredTransactions.length > 0 && (
                    <Card.Footer className="bg-light border-0">
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <small className="text-muted">
                                    Showing {filteredTransactions.length} of {transactions.length} records
                                </small>
                            </div>
                            <div className="col-md-6">
                                <div className="d-flex justify-content-end gap-2">
                                    <Button variant="outline-primary" size="sm">
                                        Previous
                                    </Button>
                                    <Button variant="outline-primary" size="sm">
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card.Footer>
                )}
            </Card.Body>
        </Card>
    );
}

export default SalesInvoicesTable;