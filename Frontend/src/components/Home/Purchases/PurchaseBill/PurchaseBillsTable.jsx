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
    faCheck,
    faClipboardList,
    faPaperPlane,
    faInbox
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
    isLoading = false,
    // ✅ NEW: Purchase Order mode support
    isPurchaseOrderView = false,
    title,
    searchPlaceholder
}) {
    const [searchQuery, setSearchQuery] = useState('');

    // ✅ SMART: Auto-detect view configuration
    const getViewConfig = () => {
        if (isPurchaseOrderView) {
            return {
                defaultTitle: "Purchase Orders",
                defaultSearchPlaceholder: "Search orders, suppliers, items...",
                numberLabel: "Order No",
                actionLabels: {
                    markOrdered: "Send Order",
                    markReceived: "Mark Received",
                    complete: "Complete Order"
                }
            };
        } else {
            return {
                defaultTitle: "Purchase Bills",
                defaultSearchPlaceholder: "Search bills, suppliers, items...",
                numberLabel: "Bill No",
                actionLabels: {
                    markOrdered: "Mark Ordered",
                    markReceived: "Mark Received",
                    complete: "Complete Purchase"
                }
            };
        }
    };

    const config = getViewConfig();
    const displayTitle = title || config.defaultTitle;
    const displaySearchPlaceholder = searchPlaceholder || config.defaultSearchPlaceholder;

    // ✅ ENHANCED: Filter purchases with better search logic for both views
    const filteredPurchases = purchases.filter(purchase =>
        purchase.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.purchaseNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.purchaseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.purchaseStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.orderStatus?.toLowerCase().includes(searchQuery.toLowerCase())
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

    // ✅ ENHANCED: Extract values for both Purchase Bills and Orders
    const extractPurchaseValues = (purchase) => {
        // Try to get values from fullObject first, then fall back to direct properties
        const fullObj = purchase.fullObject || purchase;

        // ✅ ENHANCED: More comprehensive amount extraction with nested totals
        const totalAmount = parseFloat(
            fullObj.totals?.finalTotal ||
            fullObj.finalTotal ||
            fullObj.grandTotal ||
            fullObj.totalAmount ||
            fullObj.amount ||
            fullObj.total ||
            fullObj.netAmount ||
            fullObj.invoiceAmount ||
            fullObj.billAmount ||
            fullObj.orderAmount ||
            purchase.totals?.finalTotal ||
            purchase.finalTotal ||
            purchase.grandTotal ||
            purchase.totalAmount ||
            purchase.amount ||
            purchase.total ||
            purchase.netAmount ||
            purchase.invoiceAmount ||
            purchase.billAmount ||
            purchase.orderAmount ||
            0
        );

        // ✅ ENHANCED: Better balance amount extraction with nested payment object
        const balanceAmount = parseFloat(
            fullObj.payment?.pendingAmount ||
            fullObj.payment?.balanceAmount ||
            fullObj.balanceAmount ||
            fullObj.pendingAmount ||
            fullObj.balance ||
            fullObj.payableAmount ||
            fullObj.outstandingAmount ||
            fullObj.dueAmount ||
            fullObj.remainingAmount ||
            purchase.payment?.pendingAmount ||
            purchase.payment?.balanceAmount ||
            purchase.balanceAmount ||
            purchase.pendingAmount ||
            purchase.balance ||
            purchase.payableAmount ||
            purchase.outstandingAmount ||
            purchase.dueAmount ||
            purchase.remainingAmount ||
            0
        );

        // ✅ ENHANCED: Better paid amount extraction with nested payment object
        const paidAmount = parseFloat(
            fullObj.payment?.paidAmount ||
            fullObj.payment?.amountPaid ||
            fullObj.paidAmount ||
            fullObj.amountPaid ||
            fullObj.paymentReceived ||
            fullObj.receivedAmount ||
            purchase.payment?.paidAmount ||
            purchase.payment?.amountPaid ||
            purchase.paidAmount ||
            purchase.amountPaid ||
            purchase.paymentReceived ||
            purchase.receivedAmount ||
            0
        );

        // LOGIC: Calculate actual balance if not provided
        let actualBalance = balanceAmount;

        // If balance is not set but we have total and paid amounts
        if (balanceAmount === 0 && totalAmount > 0) {
            actualBalance = Math.max(0, totalAmount - paidAmount);
        }

        // If balance equals total and no payment received, it's unpaid
        if (balanceAmount === totalAmount && paidAmount === 0) {
            actualBalance = totalAmount;
        }

        // If we still don't have amounts, try to calculate from items
        let calculatedTotal = totalAmount;
        if (totalAmount === 0) {
            const items = fullObj.items || purchase.items || [];
            if (items.length > 0) {
                calculatedTotal = items.reduce((sum, item) => {
                    const itemTotal = parseFloat(
                        item.total ||
                        item.amount ||
                        item.itemAmount || // ✅ NEW: From your data structure
                        item.lineTotal ||
                        (item.quantity * item.pricePerUnit) || // ✅ NEW: From your data structure
                        (item.quantity * item.rate) ||
                        0
                    );
                    return sum + itemTotal;
                }, 0);
            }
        }

        // ✅ ENHANCED: Date extraction for both bills and orders
        const purchaseDate = fullObj.purchaseDate ||
            fullObj.billDate ||
            fullObj.orderDate ||
            fullObj.quotationDate ||
            fullObj.invoiceDate ||
            fullObj.date ||
            fullObj.createdAt ||
            purchase.purchaseDate ||
            purchase.billDate ||
            purchase.orderDate ||
            purchase.quotationDate ||
            purchase.invoiceDate ||
            purchase.date ||
            purchase.createdAt;

        // ✅ ENHANCED: Number extraction for both bills and orders
        const purchaseNumber = fullObj.purchaseNumber ||
            fullObj.purchaseNo ||
            fullObj.billNumber ||
            fullObj.billNo ||
            fullObj.orderNumber ||
            fullObj.orderNo ||
            fullObj.quotationNumber ||
            fullObj.quotationNo ||
            fullObj.invoiceNumber ||
            fullObj.invoiceNo ||
            purchase.purchaseNumber ||
            purchase.purchaseNo ||
            purchase.billNumber ||
            purchase.billNo ||
            purchase.orderNumber ||
            purchase.orderNo ||
            purchase.quotationNumber ||
            purchase.quotationNo ||
            purchase.invoiceNumber ||
            purchase.invoiceNo;

        // ✅ ENHANCED: Status extraction for both bills and orders
        const currentStatus = fullObj.status ||
            fullObj.purchaseStatus ||
            fullObj.billStatus ||
            fullObj.orderStatus ||
            fullObj.quotationStatus ||
            purchase.status ||
            purchase.purchaseStatus ||
            purchase.billStatus ||
            purchase.orderStatus ||
            purchase.quotationStatus ||
            'draft';

        const supplierName = fullObj.supplierName ||
            fullObj.supplier?.name ||
            fullObj.supplier?.businessName ||
            fullObj.supplier?.companyName ||
            fullObj.partyName ||
            purchase.supplierName ||
            purchase.supplier?.name ||
            purchase.supplier?.businessName ||
            purchase.supplier?.companyName ||
            purchase.partyName ||
            'Unknown Supplier';

        const supplierMobile = fullObj.supplierMobile ||
            fullObj.supplier?.mobile ||
            fullObj.supplier?.phone ||
            fullObj.partyMobile ||
            purchase.supplierMobile ||
            purchase.supplier?.mobile ||
            purchase.supplier?.phone ||
            purchase.partyMobile ||
            '';

        const gstEnabled = fullObj.gstEnabled ||
            fullObj.purchaseType === 'gst' ||
            fullObj.taxType === 'gst' ||
            fullObj.taxMode === 'gst' ||
            fullObj.isGstBill ||
            purchase.gstEnabled ||
            purchase.purchaseType === 'gst' ||
            purchase.taxType === 'gst' ||
            purchase.taxMode === 'gst' ||
            purchase.isGstBill ||
            false;

        // ✅ FIXED: Enhanced payment method extraction to handle nested payment object
        const paymentMethod = fullObj.payment?.method ||        // ✅ PRIORITY: Check nested payment.method first
            fullObj.paymentType ||
            fullObj.paymentMethod ||
            fullObj.paymentMode ||
            fullObj.paymentMethodType ||
            purchase.payment?.method ||                          // ✅ PRIORITY: Check nested payment.method in purchase
            purchase.paymentType ||
            purchase.paymentMethod ||
            purchase.paymentMode ||
            purchase.paymentMethodType ||
            'cash'; // Default to 'cash' instead of calculating

        const items = fullObj.items ||
            fullObj.purchaseItems ||
            fullObj.orderItems ||
            purchase.items ||
            purchase.purchaseItems ||
            purchase.orderItems ||
            [];

        const finalValues = {
            totalAmount: calculatedTotal || totalAmount,
            balanceAmount: actualBalance,
            paidAmount,
            purchaseDate,
            purchaseNumber,
            currentStatus,
            supplierName,
            supplierMobile,
            gstEnabled,
            paymentMethod, // This will now have the actual payment type from nested payment.method
            items
        };

        return finalValues;
    };

    // ✅ ENHANCED: Better tax calculation with more fallbacks
    const calculateTaxAmounts = (purchase) => {
        const values = extractPurchaseValues(purchase);
        const items = values.items;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;

        const fullObj = purchase.fullObject || purchase;

        // ENHANCED: Try multiple ways to get tax amounts
        if (fullObj.totalCGST !== undefined || fullObj.totalSGST !== undefined || fullObj.totalIGST !== undefined) {
            totalCGST = parseFloat(fullObj.totalCGST || fullObj.cgstAmount || 0);
            totalSGST = parseFloat(fullObj.totalSGST || fullObj.sgstAmount || 0);
            totalIGST = parseFloat(fullObj.totalIGST || fullObj.igstAmount || 0);
        } else if (fullObj.taxBreakup) {
            // Check if tax breakup is available
            totalCGST = parseFloat(fullObj.taxBreakup.cgst || 0);
            totalSGST = parseFloat(fullObj.taxBreakup.sgst || 0);
            totalIGST = parseFloat(fullObj.taxBreakup.igst || 0);
        } else if (fullObj.totals) {
            // Check if totals object has tax information
            totalCGST = parseFloat(fullObj.totals.totalCGST || fullObj.totals.cgst || 0);
            totalSGST = parseFloat(fullObj.totals.totalSGST || fullObj.totals.sgst || 0);
            totalIGST = parseFloat(fullObj.totals.totalIGST || fullObj.totals.igst || 0);
        } else if (items && items.length > 0) {
            // Calculate from items
            items.forEach(item => {
                totalCGST += parseFloat(
                    item.cgstAmount ||
                    item.cgst ||
                    item.cgstValue ||
                    item.cgstTotal ||
                    0
                );
                totalSGST += parseFloat(
                    item.sgstAmount ||
                    item.sgst ||
                    item.sgstValue ||
                    item.sgstTotal ||
                    0
                );
                totalIGST += parseFloat(
                    item.igstAmount ||
                    item.igst ||
                    item.igstValue ||
                    item.igstTotal ||
                    0
                );
            });
        }

        return { totalCGST, totalSGST, totalIGST };
    };

    // ✅ ENHANCED: Transaction type for both bills and orders
    const getTransactionType = (purchase) => {
        if (isPurchaseOrderView) {
            const orderType = purchase.orderType || purchase.fullObject?.orderType;
            if (orderType === 'purchase_quotation') return 'Quotation';
            if (orderType === 'proforma_purchase') return 'Proforma';
            return 'Order';
        } else {
            const values = extractPurchaseValues(purchase);
            if (values.gstEnabled) {
                return 'GST Purchase';
            }
            return 'Purchase';
        }
    };

    const getTransactionIcon = (purchase) => {
        if (isPurchaseOrderView) {
            const orderType = purchase.orderType || purchase.fullObject?.orderType;
            if (orderType === 'purchase_quotation') return '💰';
            if (orderType === 'proforma_purchase') return '📄';
            return '📋';
        } else {
            const type = getTransactionType(purchase);
            switch (type?.toLowerCase()) {
                case 'purchase': return '🛒';
                case 'gst purchase': return '📋';
                case 'purchase order': return '📋';
                case 'return': return '↩️';
                case 'payment': return '💳';
                default: return '📄';
            }
        }
    };

    // ✅ ENHANCED: Updated payment method mapping to handle underscores
    const getPaymentType = (purchase) => {
        const values = extractPurchaseValues(purchase);

        // Get the direct payment method from data
        let paymentType = values.paymentMethod;

        // If no payment method is found, determine based on balance/status
        if (!paymentType || paymentType === 'credit' || paymentType === 'unpaid') {
            // ✅ NEW: Check payment status from nested object
            const paymentStatus = purchase.payment?.status || purchase.fullObject?.payment?.status;

            if (paymentStatus === 'partial') {
                paymentType = 'partial';
            } else if (values.balanceAmount <= 0 && values.totalAmount > 0) {
                paymentType = 'cash';
            } else if (values.paidAmount > 0 && values.balanceAmount > 0) {
                paymentType = 'partial';
            } else if (values.balanceAmount > 0) {
                paymentType = 'credit';
            } else {
                paymentType = 'cash';
            }
        }

        // ✅ ENHANCED: Updated payment method mapping with underscore handling
        const paymentMethodMap = {
            'cash': 'Cash',
            'bank': 'Bank Transfer',
            'banktransfer': 'Bank Transfer',
            'bank_transfer': 'Bank Transfer',      // ✅ NEW: Handle underscore format
            'bank transfer': 'Bank Transfer',
            'online': 'Online',
            'upi': 'UPI',
            'cheque': 'Cheque',
            'check': 'Cheque',
            'card': 'Card',
            'credit_card': 'Credit Card',
            'debit_card': 'Debit Card',
            'wallet': 'Wallet',
            'paytm': 'Paytm',
            'gpay': 'Google Pay',
            'phonepe': 'PhonePe',
            'neft': 'NEFT',
            'rtgs': 'RTGS',
            'imps': 'IMPS',
            'credit': 'Credit',
            'partial': 'Partial',
            'paid': 'Cash'
        };

        // Convert to lowercase for mapping, then return the mapped value
        const mappedPaymentType = paymentMethodMap[paymentType?.toLowerCase()] ||
            paymentType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || // ✅ NEW: Handle underscores and capitalize
            'Cash';
        return mappedPaymentType;
    };

    // ✅ ENHANCED: Better calculation function to handle different scenarios
    const calculateDisplayAmounts = (purchase) => {
        const values = extractPurchaseValues(purchase);
        const taxAmounts = calculateTaxAmounts(purchase);

        let displayAmount = values.totalAmount;
        let displayBalance = values.balanceAmount;

        // If we have tax amounts but no total, calculate total with tax
        if (displayAmount === 0 && (taxAmounts.totalCGST > 0 || taxAmounts.totalSGST > 0)) {
            const items = values.items;
            if (items && items.length > 0) {
                const baseAmount = items.reduce((sum, item) => {
                    return sum + parseFloat(item.amount || item.total || item.itemAmount || (item.quantity * item.pricePerUnit) || (item.quantity * item.rate) || 0);
                }, 0);
                displayAmount = baseAmount + taxAmounts.totalCGST + taxAmounts.totalSGST + taxAmounts.totalIGST;
            }
        }

        // If balance is still 0 but we have amount, balance equals amount (unpaid)
        if (displayBalance === 0 && displayAmount > 0 && values.paidAmount === 0) {
            displayBalance = displayAmount;
        }

        return {
            amount: displayAmount,
            balance: displayBalance,
            cgst: taxAmounts.totalCGST,
            sgst: taxAmounts.totalSGST,
            totalTax: taxAmounts.totalCGST + taxAmounts.totalSGST + taxAmounts.totalIGST,
            baseAmount: displayAmount - (taxAmounts.totalCGST + taxAmounts.totalSGST + taxAmounts.totalIGST)
        };
    };

    // ✅ ENHANCED: Updated payment type variant mapping
    const getPaymentTypeVariant = (purchase) => {
        const paymentType = getPaymentType(purchase);
        switch (paymentType?.toLowerCase()) {
            case 'cash': return 'success';           // Green
            case 'bank transfer':
            case 'online':
            case 'upi':
            case 'neft':
            case 'rtgs':
            case 'imps': return 'info';              // Blue
            case 'credit': return 'warning';         // Orange
            case 'partial': return 'secondary';      // Gray
            case 'cheque':
            case 'check': return 'primary';          // Purple
            case 'card':
            case 'credit card':
            case 'debit card': return 'info';        // Blue
            case 'wallet':
            case 'paytm':
            case 'google pay':
            case 'phonepe': return 'success';        // Green
            default: return 'light';                 // Light gray
        }
    };

    const getTransactionVariant = (purchase) => {
        if (isPurchaseOrderView) {
            const orderType = purchase.orderType || purchase.fullObject?.orderType;
            if (orderType === 'purchase_quotation') return 'warning';
            if (orderType === 'proforma_purchase') return 'info';
            return 'primary';
        } else {
            const type = getTransactionType(purchase);
            switch (type?.toLowerCase()) {
                case 'purchase': return 'primary';
                case 'gst purchase': return 'info';
                case 'purchase order': return 'info';
                case 'return': return 'danger';
                case 'payment': return 'success';
                default: return 'light';
            }
        }
    };

    const getPurchaseStatusVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'draft': return 'secondary';
            case 'sent':
            case 'ordered': return 'primary';
            case 'confirmed': return 'info';
            case 'received': return 'warning';
            case 'completed': return 'success';
            case 'cancelled': return 'danger';
            case 'expired': return 'dark';
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

    return (
        <>
            <div className="purchase-bills-table-container">
                <div className="purchase-table-card border-0">
                    {/* ✅ UPDATED: Dynamic header based on view type */}
                    <div className="purchase-table-header bg-gradient-purple border-0 pb-0">
                        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
                            <div className="header-info">
                                <h6 className="fw-bold mb-1 text-white">{displayTitle}</h6>
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
                                        placeholder={displaySearchPlaceholder}
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
                                        {/* ✅ UPDATED: Dynamic column header */}
                                        <th className="border-0 bg-gradient-light-purple text-purple fw-semibold">
                                            <div className="d-flex align-items-center">
                                                <span>{config.numberLabel}</span>
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
                                                        {isLoading ? '⏳' : isPurchaseOrderView ? '📋' : '🛒'}
                                                    </div>
                                                    <h6 className="fw-semibold mb-1 text-purple" style={{ fontSize: '0.9rem' }}>
                                                        {isLoading ? `Loading ${displayTitle.toLowerCase()}...` : `No ${displayTitle.toLowerCase()} found`}
                                                    </h6>
                                                    <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                                                        {isLoading
                                                            ? 'Please wait while we fetch your data'
                                                            : searchQuery
                                                                ? 'Try adjusting your search terms'
                                                                : `Create your first ${isPurchaseOrderView ? 'purchase order' : 'purchase bill'}`
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPurchases.map((purchase, index) => {
                                            // ✅ FIXED: Extract values properly with enhanced logic
                                            const values = extractPurchaseValues(purchase);

                                            // ✅ FIXED: Calculate display amounts
                                            const displayAmounts = calculateDisplayAmounts(purchase);

                                            return (
                                                <tr key={purchase.id || purchase._id || index} className="purchase-transaction-row">
                                                    {/* Date - Ultra Compact */}
                                                    <td className="border-0 pys-2">
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
                                                                {values.purchaseNumber || `${isPurchaseOrderView ? 'ORD' : 'PUR'}-${index + 1}`}
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

                                                    {/* Payment Type - Enhanced Badge */}
                                                    <td className="border-0 py-2">
                                                        <Badge
                                                            bg={getPaymentTypeVariant(purchase)}
                                                            className="px-1 py-1 payment-badge"
                                                            style={{ fontSize: '0.55rem' }} // Slightly smaller font to fit longer names
                                                            text={getPaymentTypeVariant(purchase) === 'light' ? 'dark' : 'white'}
                                                            title={getPaymentType(purchase)} // Tooltip for full name
                                                        >
                                                            {getPaymentType(purchase).length > 8
                                                                ? getPaymentType(purchase).substring(0, 8) + '...'
                                                                : getPaymentType(purchase)
                                                            }
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
                                                                {formatCurrency(displayAmounts.cgst)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* SGST - Compact */}
                                                    <td className="border-0 py-2 text-center">
                                                        <div className="tax-info">
                                                            <span className="fw-semibold text-warning" style={{ fontSize: '0.7rem' }}>
                                                                {formatCurrency(displayAmounts.sgst)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Total Amount - Use calculated display amount */}
                                                    <td className="border-0 py-2 text-end">
                                                        <div className="amount-info">
                                                            <span className="fw-bold text-primary" style={{ fontSize: '0.8rem' }}>
                                                                {formatCurrency(displayAmounts.amount)}
                                                            </span>
                                                            {displayAmounts.totalTax > 0 && (
                                                                <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>
                                                                    +₹{Math.round(displayAmounts.totalTax)} tax
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Balance - Use calculated display balance */}
                                                    <td className="border-0 py-2 text-end">
                                                        <div className="balance-info">
                                                            <span className={`fw-bold ${displayAmounts.balance > 0 ? 'text-danger' : 'text-success'}`}
                                                                style={{ fontSize: '0.75rem' }}>
                                                                {formatCurrency(displayAmounts.balance)}
                                                            </span>
                                                            {displayAmounts.balance > 0 && (
                                                                <small className="text-danger d-block" style={{ fontSize: '0.55rem' }}>
                                                                    Due
                                                                </small>
                                                            )}
                                                            {displayAmounts.balance === 0 && displayAmounts.amount > 0 && (
                                                                <small className="text-success d-block" style={{ fontSize: '0.55rem' }}>
                                                                    Paid
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
                                                                            <FontAwesomeIcon
                                                                                icon={isPurchaseOrderView ? faPaperPlane : faShoppingCart}
                                                                                className="me-2 text-info"
                                                                            />
                                                                            {config.actionLabels.markOrdered}
                                                                        </Dropdown.Item>
                                                                    )}
                                                                    {(values.currentStatus === 'ordered' || values.currentStatus === 'sent') && (
                                                                        <Dropdown.Item
                                                                            onClick={() => onMarkAsReceived(purchase)}
                                                                            className="dropdown-item-enhanced"
                                                                        >
                                                                            <FontAwesomeIcon
                                                                                icon={isPurchaseOrderView ? faInbox : faTruck}
                                                                                className="me-2 text-warning"
                                                                            />
                                                                            {config.actionLabels.markReceived}
                                                                        </Dropdown.Item>
                                                                    )}
                                                                    {values.currentStatus === 'received' && (
                                                                        <Dropdown.Item
                                                                            onClick={() => onCompletePurchase(purchase)}
                                                                            className="dropdown-item-enhanced"
                                                                        >
                                                                            <FontAwesomeIcon icon={faCheck} className="me-2 text-success" />
                                                                            {config.actionLabels.complete}
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
                /* Responsive design */
                @media (max-width: 768px) {
                    .table-responsive {
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                    }
                    
                    .purchase-bills-table {
                        min-width: 900px;
                    }
                }
                `}
            </style>
        </>
    );
}

export default PurchaseBillsTable;