import React, { useState } from 'react';
import { Container, Row, Col, Button, Table, Badge, Dropdown, InputGroup, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faChartLine,
    faFileExcel,
    faPrint,
    faSort,
    faEllipsisV,
    faEye,
    faEdit,
    faTrash,
    faCopy,
    faShare,
    faShoppingCart,
    faTruck,
    faCheck
} from '@fortawesome/free-solid-svg-icons';

function PurchaseBillsTable({
    purchases = [],
    onViewPurchase,
    onEditPurchase,
    onDeletePurchase,
    onPrintPurchase,
    onSharePurchase,
    onMarkAsOrdered,
    onMarkAsReceived,
    onCompletePurchase,
    isLoading = false
}) {
    const [searchQuery, setSearchQuery] = useState('');

    // ✅ FIXED: Filter purchases based on search query with correct property names
    const filteredPurchases = purchases.filter(purchase =>
        purchase.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.purchaseNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.purchaseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.purchaseStatus?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ✅ ENHANCED: Better currency formatting
    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '₹0';

        const numAmount = parseFloat(amount) || 0;

        // Ultra compact currency formatting
        if (numAmount >= 10000000) { // 1 crore
            return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
        } else if (numAmount >= 100000) { // 1 lakh
            return `₹${(numAmount / 100000).toFixed(1)}L`;
        } else if (numAmount >= 1000) { // 1 thousand
            return `₹${(numAmount / 1000).toFixed(1)}K`;
        }
        return `₹${Math.round(numAmount)}`;
    };

    // ✅ ENHANCED: Better date formatting
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';

            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit'
            }); // Only DD/MM format for compactness
        } catch (error) {
            console.warn('Date formatting error:', error);
            return 'N/A';
        }
    };

    // ✅ FIXED: Extract correct values from purchase data including fullObject
    const extractPurchaseValues = (purchase) => {
        // Try to get values from fullObject first, then fall back to direct properties
        const fullObj = purchase.fullObject || purchase;

        const totalAmount = parseFloat(
            fullObj.finalTotal ||
            fullObj.amount ||
            fullObj.totalAmount ||
            purchase.amount ||
            purchase.finalTotal ||
            0
        );

        const balanceAmount = parseFloat(
            fullObj.pendingAmount ||
            fullObj.balance ||
            fullObj.payableAmount ||
            fullObj.outstandingAmount ||
            purchase.balance ||
            purchase.pendingAmount ||
            0
        );

        const paidAmount = parseFloat(
            fullObj.paidAmount ||
            fullObj.amountPaid ||
            purchase.paidAmount ||
            0
        );

        // If balance is 0 but totalAmount > 0 and no paidAmount, balance should equal totalAmount
        const actualBalance = (balanceAmount === 0 && totalAmount > 0 && paidAmount === 0) ? totalAmount : balanceAmount;

        const purchaseDate = fullObj.purchaseDate ||
            fullObj.date ||
            purchase.date ||
            purchase.purchaseDate ||
            purchase.createdAt;

        const purchaseNumber = fullObj.purchaseNumber ||
            fullObj.purchaseNo ||
            purchase.purchaseNo ||
            purchase.purchaseNumber;

        const currentStatus = fullObj.status ||
            fullObj.purchaseStatus ||
            purchase.purchaseStatus ||
            purchase.status ||
            'draft';

        const supplierName = fullObj.supplierName ||
            fullObj.supplier?.name ||
            purchase.supplierName ||
            'Unknown Supplier';

        const supplierMobile = fullObj.supplierMobile ||
            fullObj.supplier?.mobile ||
            purchase.supplierMobile ||
            '';

        const gstEnabled = fullObj.gstEnabled ||
            fullObj.purchaseType === 'gst' ||
            purchase.gstEnabled ||
            false;

        const paymentMethod = fullObj.paymentMethod ||
            purchase.paymentMethod ||
            'credit';

        const items = fullObj.items || purchase.items || [];

        return {
            totalAmount,
            balanceAmount: actualBalance,
            paidAmount,
            purchaseDate,
            purchaseNumber,
            currentStatus,
            supplierName,
            supplierMobile,
            gstEnabled,
            paymentMethod,
            items
        };
    };

    // ✅ FIXED: Get transaction type from purchase data
    const getTransactionType = (purchase) => {
        const values = extractPurchaseValues(purchase);
        if (values.gstEnabled) {
            return 'GST Purchase';
        }
        return 'Purchase';
    };

    const getTransactionIcon = (purchase) => {
        const type = getTransactionType(purchase);
        switch (type?.toLowerCase()) {
            case 'purchase': return '🛒';
            case 'gst purchase': return '📋';
            case 'purchase order': return '📋';
            case 'return': return '↩️';
            case 'payment': return '💳';
            default: return '📄';
        }
    };

    // ✅ FIXED: Get payment type from purchase data
    const getPaymentType = (purchase) => {
        const values = extractPurchaseValues(purchase);

        if (values.paymentMethod && values.paymentMethod !== 'credit') {
            return values.paymentMethod;
        }

        // Determine payment type based on amounts
        if (values.balanceAmount <= 0) {
            return 'Paid';
        } else if (values.paidAmount > 0) {
            return 'Partial';
        } else {
            return 'Credit';
        }
    };

    const getPaymentTypeVariant = (purchase) => {
        const paymentType = getPaymentType(purchase);
        switch (paymentType?.toLowerCase()) {
            case 'cash':
            case 'paid': return 'success';
            case 'credit': return 'warning';
            case 'partial': return 'info';
            case 'online': return 'info';
            case 'cheque': return 'secondary';
            default: return 'light';
        }
    };

    const getTransactionVariant = (purchase) => {
        const type = getTransactionType(purchase);
        switch (type?.toLowerCase()) {
            case 'purchase': return 'primary';
            case 'gst purchase': return 'info';
            case 'purchase order': return 'info';
            case 'return': return 'danger';
            case 'payment': return 'success';
            default: return 'light';
        }
    };

    const getPurchaseStatusVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'draft': return 'secondary';
            case 'ordered': return 'primary';
            case 'received': return 'warning';
            case 'completed': return 'success';
            case 'cancelled': return 'danger';
            default: return 'light';
        }
    };

    const getReceivingStatusVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'secondary';
            case 'partial': return 'warning';
            case 'complete':
            case 'received': return 'success';
            default: return 'light';
        }
    };

    // ✅ FIXED: Calculate GST amounts from purchase data
    const calculateTaxAmounts = (purchase) => {
        const values = extractPurchaseValues(purchase);
        const items = values.items;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;

        const fullObj = purchase.fullObject || purchase;

        // If tax amounts are directly available
        if (fullObj.totalCGST !== undefined || fullObj.totalSGST !== undefined) {
            totalCGST = parseFloat(fullObj.totalCGST || 0);
            totalSGST = parseFloat(fullObj.totalSGST || 0);
            totalIGST = parseFloat(fullObj.totalIGST || 0);
        } else {
            // Calculate from items
            items.forEach(item => {
                totalCGST += parseFloat(item.cgstAmount || item.cgst || 0);
                totalSGST += parseFloat(item.sgstAmount || item.sgst || 0);
                totalIGST += parseFloat(item.igstAmount || item.igst || 0);
            });
        }

        return { totalCGST, totalSGST, totalIGST };
    };



    return (
        <>
            <div className="purchase-bills-table-container">
                <div className="purchase-table-card border-0">
                    {/* Ultra Compact Header with Purple Theme */}
                    <div className="purchase-table-header bg-gradient-purple border-0 pb-0">
                        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
                            <div className="header-info">
                                <h6 className="fw-bold mb-1 text-white">Purchase Bills</h6>
                                <small className="text-white-50" style={{ fontSize: '0.65rem' }}>
                                    {filteredPurchases.length} records
                                    {isLoading && ' (Loading...)'}
                                </small>
                            </div>
                            <div className="d-flex gap-1 align-items-center flex-wrap">
                                <InputGroup className="search-group">
                                    <InputGroup.Text className="bg-white bg-opacity-25 border-white border-opacity-25 text-white px-2">
                                        <FontAwesomeIcon icon={faSearch} className="text-white" style={{ fontSize: '0.65rem' }} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search bills..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="border-white border-opacity-25 bg-white bg-opacity-25 text-white placeholder-white-50 search-input"
                                        size="sm"
                                        style={{ fontSize: '0.75rem' }}
                                        disabled={isLoading}
                                    />
                                </InputGroup>
                                <div className="d-flex gap-1">
                                    <Button variant="outline-light" size="sm" className="table-action-btn" title="Export" disabled={isLoading}>
                                        <FontAwesomeIcon icon={faFileExcel} style={{ fontSize: '0.6rem' }} />
                                    </Button>
                                    <Button variant="outline-light" size="sm" className="table-action-btn" title="Print" disabled={isLoading}>
                                        <FontAwesomeIcon icon={faPrint} style={{ fontSize: '0.6rem' }} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="purchase-table-body p-0">
                        <div className="table-responsive">
                            <Table className="mb-0 purchase-bills-table">
                                <thead>
                                    <tr>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Date</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Bill No</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Supplier</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Type</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Payment</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>Status</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <span>CGST</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-center">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <span>SGST</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-end">
                                            <div className="d-flex align-items-center justify-content-end">
                                                <span>Amount</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-end">
                                            <div className="d-flex align-items-center justify-content-end">
                                                <span>Balance</span>
                                                <FontAwesomeIcon icon={faSort} className="ms-1 sort-icon" />
                                            </div>
                                        </th>
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold text-center">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPurchases.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="text-center text-muted py-4 border-0">
                                                <div className="empty-state">
                                                    <div className="empty-icon mb-2">
                                                        {isLoading ? '⏳' : '🛒'}
                                                    </div>
                                                    <h6 className="fw-semibold mb-1 text-purple" style={{ fontSize: '0.9rem' }}>
                                                        {isLoading ? 'Loading purchase bills...' : 'No purchase bills found'}
                                                    </h6>
                                                    <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                                                        {isLoading
                                                            ? 'Please wait while we fetch your data'
                                                            : searchQuery
                                                                ? 'Try adjusting your search terms'
                                                                : 'Create your first purchase bill'
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPurchases.map((purchase, index) => {


                                            // ✅ FIXED: Extract values properly
                                            const values = extractPurchaseValues(purchase);

                                            // ✅ FIXED: Calculate tax amounts properly
                                            const taxAmounts = calculateTaxAmounts(purchase);

                                            return (
                                                <tr key={purchase.id || index} className="purchase-transaction-row">
                                                    {/* Date - Ultra Compact */}
                                                    <td className="border-0 py-2">
                                                        <div className="date-info">
                                                            <span className="text-dark fw-medium" style={{ fontSize: '0.75rem' }}>
                                                                {formatDate(values.purchaseDate)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Purchase Number - Compact */}
                                                    <td className="border-0 py-2">
                                                        <div className="bill-number">
                                                            <span className="fw-bold text-primary" style={{ fontSize: '0.75rem' }}>
                                                                {values.purchaseNumber || `PUR-${index + 1}`}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Supplier Name - Truncated */}
                                                    <td className="border-0 py-2">
                                                        <div className="supplier-info">
                                                            <div className="fw-medium text-dark mb-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                title={values.supplierName}>
                                                                {values.supplierName?.length > 12
                                                                    ? `${values.supplierName.substring(0, 12)}...`
                                                                    : values.supplierName}
                                                            </div>
                                                            {values.supplierMobile && (
                                                                <small className="text-purple-muted d-block" style={{ fontSize: '0.6rem' }}>
                                                                    {values.supplierMobile.substring(0, 10)}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Transaction Type - Icon + Badge */}
                                                    <td className="border-0 py-2">
                                                        <div className="d-flex align-items-center">
                                                            <span className="me-1" style={{ fontSize: '0.7rem' }}>
                                                                {getTransactionIcon(purchase)}
                                                            </span>
                                                            <Badge
                                                                bg={getTransactionVariant(purchase)}
                                                                className="px-1 py-1 text-capitalize transaction-badge"
                                                                style={{ fontSize: '0.6rem' }}
                                                            >
                                                                {getTransactionType(purchase)?.substring(0, 4)}
                                                            </Badge>
                                                        </div>
                                                    </td>

                                                    {/* Payment Type - Small Badge */}
                                                    <td className="border-0 py-2">
                                                        <Badge
                                                            bg={getPaymentTypeVariant(purchase)}
                                                            className="px-1 py-1 payment-badge"
                                                            style={{ fontSize: '0.6rem' }}
                                                            text={getPaymentTypeVariant(purchase) === 'light' ? 'dark' : 'white'}
                                                        >
                                                            {getPaymentType(purchase)?.substring(0, 4)}
                                                        </Badge>
                                                    </td>

                                                    {/* Purchase Status - Combined Status */}
                                                    <td className="border-0 py-2">
                                                        <div className="status-info">
                                                            <Badge
                                                                bg={getPurchaseStatusVariant(values.currentStatus)}
                                                                className="px-1 py-1 status-badge mb-1"
                                                                style={{ fontSize: '0.55rem' }}
                                                            >
                                                                {values.currentStatus?.substring(0, 4)}
                                                            </Badge>
                                                            {purchase.receivingStatus && (
                                                                <div>
                                                                    <Badge
                                                                        bg={getReceivingStatusVariant(purchase.receivingStatus)}
                                                                        className="px-1 py-1 receiving-badge"
                                                                        style={{ fontSize: '0.5rem' }}
                                                                    >
                                                                        📦{purchase.receivingStatus?.substring(0, 3)}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* CGST - Compact */}
                                                    <td className="border-0 py-2 text-center">
                                                        <div className="tax-info">
                                                            <span className="fw-semibold text-info" style={{ fontSize: '0.7rem' }}>
                                                                {formatCurrency(taxAmounts.totalCGST)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* SGST - Compact */}
                                                    <td className="border-0 py-2 text-center">
                                                        <div className="tax-info">
                                                            <span className="fw-semibold text-warning" style={{ fontSize: '0.7rem' }}>
                                                                {formatCurrency(taxAmounts.totalSGST)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Total Amount - Prominent but Compact */}
                                                    <td className="border-0 py-2 text-end">
                                                        <div className="amount-info">
                                                            <span className="fw-bold text-primary" style={{ fontSize: '0.8rem' }}>
                                                                {formatCurrency(values.totalAmount)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Balance - Compact */}
                                                    <td className="border-0 py-2 text-end">
                                                        <div className="balance-info">
                                                            <span className={`fw-bold ${values.balanceAmount > 0 ? 'text-danger' : 'text-success'}`}
                                                                style={{ fontSize: '0.75rem' }}>
                                                                {formatCurrency(values.balanceAmount)}
                                                            </span>
                                                            {values.balanceAmount > 0 && (
                                                                <small className="text-danger d-block" style={{ fontSize: '0.55rem' }}>
                                                                    Due
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Actions - Ultra Compact */}
                                                    <td className="border-0 py-2 text-center">
                                                        <div className="d-flex gap-1 align-items-center justify-content-center">
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="action-btn"
                                                                title="Print"
                                                                onClick={() => onPrintPurchase(purchase)}
                                                                disabled={isLoading}
                                                            >
                                                                <FontAwesomeIcon icon={faPrint} style={{ fontSize: '0.6rem' }} />
                                                            </Button>
                                                            <Dropdown>
                                                                <Dropdown.Toggle
                                                                    variant="outline-secondary"
                                                                    size="sm"
                                                                    className="action-btn dropdown-toggle-no-caret"
                                                                    title="More"
                                                                    disabled={isLoading}
                                                                >
                                                                    <FontAwesomeIcon icon={faEllipsisV} style={{ fontSize: '0.6rem' }} />
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu align="end" className="shadow-lg border-0 dropdown-menu-enhanced">
                                                                    <Dropdown.Item
                                                                        onClick={() => onViewPurchase(purchase)}
                                                                        className="dropdown-item-enhanced"
                                                                    >
                                                                        <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
                                                                        View
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item
                                                                        onClick={() => onEditPurchase(purchase)}
                                                                        className="dropdown-item-enhanced"
                                                                    >
                                                                        <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                                                                        Edit
                                                                    </Dropdown.Item>
                                                                    {values.currentStatus === 'draft' && (
                                                                        <Dropdown.Item
                                                                            onClick={() => onMarkAsOrdered(purchase)}
                                                                            className="dropdown-item-enhanced"
                                                                        >
                                                                            <FontAwesomeIcon icon={faShoppingCart} className="me-2 text-info" />
                                                                            Mark Ordered
                                                                        </Dropdown.Item>
                                                                    )}
                                                                    {values.currentStatus === 'ordered' && (
                                                                        <Dropdown.Item
                                                                            onClick={() => onMarkAsReceived(purchase)}
                                                                            className="dropdown-item-enhanced"
                                                                        >
                                                                            <FontAwesomeIcon icon={faTruck} className="me-2 text-warning" />
                                                                            Mark Received
                                                                        </Dropdown.Item>
                                                                    )}
                                                                    {values.currentStatus === 'received' && (
                                                                        <Dropdown.Item
                                                                            onClick={() => onCompletePurchase(purchase)}
                                                                            className="dropdown-item-enhanced"
                                                                        >
                                                                            <FontAwesomeIcon icon={faCheck} className="me-2 text-success" />
                                                                            Complete
                                                                        </Dropdown.Item>
                                                                    )}
                                                                    <Dropdown.Item
                                                                        onClick={() => onSharePurchase(purchase)}
                                                                        className="dropdown-item-enhanced"
                                                                    >
                                                                        <FontAwesomeIcon icon={faShare} className="me-2 text-info" />
                                                                        Share
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Divider />
                                                                    <Dropdown.Item
                                                                        onClick={() => onDeletePurchase(purchase)}
                                                                        className="dropdown-item-enhanced text-danger"
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
                                    )}
                                </tbody>
                            </Table>
                        </div>

                        {/* Compact Footer */}
                        {filteredPurchases.length > 0 && (
                            <div className="table-footer p-2 bg-light border-top">
                                <div className="d-flex justify-content-between align-items-center">
                                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                        {filteredPurchases.length} of {purchases.length} records
                                    </small>
                                    <div className="d-flex gap-1">
                                        <Button variant="outline-primary" size="sm" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                                            Prev
                                        </Button>
                                        <Button variant="outline-primary" size="sm" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ultra Compact Table Styles - Purple Theme */}
            <style>
                {`
                .purchase-bills-table-container {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
                    overflow: hidden;
                    margin: 0;
                    height: fit-content;
                    width: 100%;
                }

                .purchase-table-card {
                    border-radius: 12px;
                    overflow: hidden;
                }

                .bg-gradient-purple {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 50%, #b794f6 100%);
                    padding: 0.75rem 1rem 0.5rem;
                }

                .bg-gradient-light-purple {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.06) 0%, rgba(156, 136, 255, 0.06) 50%, rgba(183, 148, 246, 0.06) 100%);
                }

                .text-purple {
                    color: #6c63ff !important;
                }

                .text-purple-muted {
                    color: #9c88ff !important;
                }

                .header-info h6 {
                    font-size: 0.9rem;
                    margin-bottom: 0.1rem;
                }

                .search-group {
                    width: 180px;
                    min-width: 150px;
                }

                .placeholder-white-50::placeholder {
                    color: rgba(255, 255, 255, 0.7) !important;
                }

                .search-input:focus {
                    background: rgba(255, 255, 255, 0.35) !important;
                    border-color: rgba(255, 255, 255, 0.5) !important;
                    box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.25) !important;
                    color: white !important;
                }

                .table-action-btn {
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    padding: 0;
                }

                .table-action-btn:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.5);
                    color: white;
                    transform: translateY(-1px);
                }

                .table-action-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                /* ULTRA COMPACT TABLE - ALL COLUMNS VISIBLE */
                .purchase-bills-table {
                    font-size: 0.7rem;
                    table-layout: fixed;
                    width: 100%;
                }

                .purchase-bills-table th {
                    font-size: 0.6rem;
                    text-transform: uppercase;
                    letter-spacing: 0.2px;
                    padding: 0.5rem 0.3rem;
                    font-weight: 600;
                    border-bottom: 2px solid rgba(108, 99, 255, 0.1);
                    white-space: nowrap;
                    vertical-align: middle;
                }

                .purchase-bills-table td {
                    padding: 0.4rem 0.3rem;
                    vertical-align: middle;
                    font-size: 0.7rem;
                    border-bottom: 1px solid rgba(108, 99, 255, 0.05);
                }

                /* OPTIMIZED COLUMN WIDTHS FOR ALL COLUMNS VISIBILITY */
                .purchase-bills-table th:nth-child(1), /* Date */
                .purchase-bills-table td:nth-child(1) {
                    width: 8%;
                    min-width: 60px;
                }

                .purchase-bills-table th:nth-child(2), /* Bill No */
                .purchase-bills-table td:nth-child(2) {
                    width: 10%;
                    min-width: 80px;
                }

                .purchase-bills-table th:nth-child(3), /* Supplier */
                .purchase-bills-table td:nth-child(3) {
                    width: 14%;
                    min-width: 100px;
                }

                .purchase-bills-table th:nth-child(4), /* Type */
                .purchase-bills-table td:nth-child(4) {
                    width: 8%;
                    min-width: 70px;
                }

                .purchase-bills-table th:nth-child(5), /* Payment */
                .purchase-bills-table td:nth-child(5) {
                    width: 8%;
                    min-width: 70px;
                }

                .purchase-bills-table th:nth-child(6), /* Status */
                .purchase-bills-table td:nth-child(6) {
                    width: 10%;
                    min-width: 80px;
                }

                .purchase-bills-table th:nth-child(7), /* CGST */
                .purchase-bills-table td:nth-child(7) {
                    width: 9%;
                    min-width: 70px;
                }

                .purchase-bills-table th:nth-child(8), /* SGST */
                .purchase-bills-table td:nth-child(8) {
                    width: 9%;
                    min-width: 70px;
                }

                .purchase-bills-table th:nth-child(9), /* Amount */
                .purchase-bills-table td:nth-child(9) {
                    width: 11%;
                    min-width: 80px;
                }

                .purchase-bills-table th:nth-child(10), /* Balance */
                .purchase-bills-table td:nth-child(10) {
                    width: 9%;
                    min-width: 70px;
                }

                .purchase-bills-table th:nth-child(11), /* Actions */
                .purchase-bills-table td:nth-child(11) {
                    width: 9%;
                    min-width: 70px;
                }

                .purchase-transaction-row {
                    transition: all 0.2s ease;
                }

                .purchase-transaction-row:hover {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(108, 99, 255, 0.08);
                }

                .sort-icon {
                    opacity: 0.4;
                    font-size: 0.5rem !important;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #9c88ff;
                }

                .sort-icon:hover {
                    opacity: 0.8;
                    transform: scale(1.1);
                    color: #6c63ff;
                }

                .date-info {
                    min-width: 50px;
                }

                .bill-number {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.08) 0%, rgba(156, 136, 255, 0.08) 100%);
                    padding: 2px 4px;
                    border-radius: 4px;
                    display: inline-block;
                }

                .supplier-info {
                    min-width: 80px;
                    max-width: 100px;
                    overflow: hidden;
                }

                .status-info {
                    min-width: 70px;
                    text-align: center;
                }

                .status-badge,
                .receiving-badge {
                    display: block;
                    width: 100%;
                    font-size: 0.55rem !important;
                    font-weight: 600;
                    border: none;
                    border-radius: 3px;
                    padding: 2px 4px !important;
                    white-space: nowrap;
                    margin-bottom: 2px;
                }

                .receiving-badge {
                    font-size: 0.5rem !important;
                    opacity: 0.9;
                }

                .tax-info {
                    text-align: center;
                    min-width: 60px;
                }

                .tax-percent {
                    line-height: 1;
                    margin-top: 1px;
                }

                .amount-info {
                    min-width: 70px;
                }

                .balance-info {
                    min-width: 60px;
                }

                .transaction-badge,
                .payment-badge {
                    font-size: 0.55rem;
                    font-weight: 600;
                    border: none;
                    border-radius: 3px;
                    padding: 2px 4px !important;
                    white-space: nowrap;
                }

                .action-btn {
                    width: 24px;
                    height: 24px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .action-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
                }

                .action-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .dropdown-toggle-no-caret::after {
                    display: none;
                }

                .dropdown-menu-enhanced {
                    border-radius: 6px;
                    padding: 0.3rem;
                    min-width: 140px;
                    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
                }

                .dropdown-item-enhanced {
                    padding: 0.4rem 0.6rem;
                    font-size: 0.7rem;
                    transition: all 0.2s ease;
                    border-radius: 4px;
                    margin: 1px 0;
                }

                .dropdown-item-enhanced:hover {
                    background: rgba(108, 99, 255, 0.08);
                    transform: translateX(2px);
                }

                .empty-state {
                    padding: 2rem 1rem;
                }

                .empty-icon {
                    font-size: 2rem;
                    opacity: 0.6;
                }

                .table-footer {
                    background: rgba(108, 99, 255, 0.02) !important;
                    border-top: 1px solid rgba(108, 99, 255, 0.08) !important;
                }

                /* Purple-themed badge colors */
                .badge.bg-primary { background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%) !important; }
                .badge.bg-info { background: linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%) !important; }
                .badge.bg-success { background: linear-gradient(135deg, #10b981 0%, #34d399 100%) !important; }
                .badge.bg-warning { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%) !important; }
                .badge.bg-danger { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%) !important; }
                .badge.bg-secondary { background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%) !important; }
                .badge.bg-light { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%) !important; color: #374151 !important; }

                /* Enhanced Colors for Purple Theme */
                .text-primary { color: #6c63ff !important; }
                .text-success { color: #10b981 !important; }
                .text-warning { color: #f59e0b !important; }
                .text-info { color: #06b6d4 !important; }
                .text-danger { color: #ef4444 !important; }

                /* RESPONSIVE DESIGN - MAINTAIN ALL COLUMNS */
                @media (max-width: 1400px) {
                    .search-group {
                        width: 160px;
                    }

                    .purchase-bills-table th,
                    .purchase-bills-table td {
                        padding: 0.35rem 0.25rem;
                        font-size: 0.65rem;
                    }

                    .purchase-bills-table th {
                        font-size: 0.55rem;
                    }
                }

                @media (max-width: 1200px) {
                    .search-group {
                        width: 140px;
                    }

                    .purchase-bills-table th,
                    .purchase-bills-table td {
                        padding: 0.3rem 0.2rem;
                        font-size: 0.6rem;
                    }

                    .purchase-bills-table th {
                        font-size: 0.5rem;
                    }

                    .supplier-info {
                        max-width: 80px;
                    }

                    .action-btn {
                        width: 22px;
                        height: 22px;
                    }
                }

                @media (max-width: 992px) {
                    .bg-gradient-purple {
                        padding: 0.5rem 0.75rem 0.25rem;
                    }

                    .purchase-table-header .d-flex {
                        flex-direction: column;
                        gap: 0.5rem;
                        align-items: stretch !important;
                    }

                    .search-group {
                        width: 100%;
                        max-width: 200px;
                    }

                    .purchase-bills-table th,
                    .purchase-bills-table td {
                        padding: 0.25rem 0.15rem;
                        font-size: 0.55rem;
                    }

                    .purchase-bills-table th {
                        font-size: 0.45rem;
                    }

                    .supplier-info {
                        max-width: 70px;
                    }
                }

                @media (max-width: 768px) {
                    .bg-gradient-purple {
                        padding: 0.4rem 0.5rem 0.2rem;
                    }

                    .purchase-bills-table th,
                    .purchase-bills-table td {
                        padding: 0.2rem 0.1rem;
                        font-size: 0.5rem;
                    }

                    .purchase-bills-table th {
                        font-size: 0.4rem;
                    }

                    .action-btn {
                        width: 20px;
                        height: 20px;
                    }

                    .supplier-info {
                        max-width: 60px;
                    }

                    .sort-icon {
                        font-size: 0.4rem !important;
                    }

                    /* Horizontal scroll for mobile to maintain all columns */
                    .table-responsive {
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                    }

                    .purchase-bills-table {
                        min-width: 900px; /* Force horizontal scroll instead of hiding columns */
                    }
                }

                /* Smooth Animations */
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .purchase-transaction-row {
                    animation: slideInUp 0.3s ease-out;
                }

                /* Table Scroll Enhancement */
                .table-responsive::-webkit-scrollbar {
                    height: 4px;
                }

                .table-responsive::-webkit-scrollbar-track {
                    background: rgba(108, 99, 255, 0.05);
                    border-radius: 2px;
                }

                .table-responsive::-webkit-scrollbar-thumb {
                    background: rgba(108, 99, 255, 0.2);
                    border-radius: 2px;
                }

                .table-responsive::-webkit-scrollbar-thumb:hover {
                    background: rgba(108, 99, 255, 0.3);
                }

                /* Purple theme enhancements */
                .purchase-table-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent 0%, #6c63ff 50%, transparent 100%);
                    opacity: 0.6;
                }

                /* Status-specific workflows */
                .dropdown-item-enhanced[data-status="ordered"] {
                    border-left: 3px solid #6c63ff;
                }

                .dropdown-item-enhanced[data-status="received"] {
                    border-left: 3px solid #f59e0b;
                }

                .dropdown-item-enhanced[data-status="completed"] {
                    border-left: 3px solid #10b981;
                }

                /* Enhanced sort icon interactions */
                .sort-icon:active {
                    transform: scale(0.9);
                    color: #5a52d5;
                }

                /* Focus states */
                .purchase-bills-table th:focus-within .sort-icon,
                .purchase-bills-table th:hover .sort-icon {
                    opacity: 0.8;
                    color: #6c63ff;
                }
                `}
            </style>
        </>
    );
}

export default PurchaseBillsTable;