import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave,
    faTimes,
    faEdit,
    faCalendar,
    faRupeeSign,
    faCreditCard,
    faFileText,
    faStickyNote,
    faBank,
    faExclamationTriangle,
    faCheckCircle,
    faArrowUp,
    faArrowDown,
    faInfoCircle,
    faSync,
    faBuilding
} from '@fortawesome/free-solid-svg-icons';

import paymentService from '../../../services/paymentService';
import purchaseService from '../../../services/purchaseService';
import authService from '../../../services/authService';

const EditTransactionModal = ({
    show,
    onHide,
    transaction,
    onTransactionUpdated,
    addToast,
    bankAccounts = [],
    companyId,
    formatCurrency,
    currentUser,
    currentCompany // ✅ Added currentCompany prop
}) => {
    const [formData, setFormData] = useState({
        amount: '',
        paymentMethod: 'cash',
        paymentDate: '',
        reference: '',
        notes: '',
        status: 'completed',
        bankAccountId: '',
        clearingDate: '',
        employeeName: '',
        employeeId: '',
        companyName: '' // ✅ Added company name field
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const [originalData, setOriginalData] = useState({});
    const [transactionBankInfo, setTransactionBankInfo] = useState(null);
    const [availableBankAccounts, setAvailableBankAccounts] = useState([]);
    const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);

    // ✅ NEW: Auto-fill company data
    const autoFillCompanyData = () => {
        try {
            const company = currentCompany || authService.getCurrentCompany();
            if (company) {
                const companyName =
                    company.companyName ||
                    company.name ||
                    company.businessName ||
                    company.displayName ||
                    '';

                setFormData(prev => ({
                    ...prev,
                    companyName: companyName.trim()
                }));
            }
        } catch (error) {
            console.error('Error auto-filling company data:', error);
        }
    };

    // ✅ Enhanced transaction data preparation
    const prepareTransactionData = (transaction) => {
        try {
            // Format date for input field (YYYY-MM-DD format)
            const formatDateForInput = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return '';
                return date.toISOString().split('T')[0];
            };

            // Extract bank account information from transaction
            let bankAccountId = '';
            let bankInfo = null;

            // Priority order for bank account information
            const possibleBankIds = [
                transaction.bankAccountId,
                transaction.bankAccount?._id,
                transaction.bankAccount?.id,
                transaction.bankDetails?.bankAccountId
            ].filter(Boolean);

            if (possibleBankIds.length > 0) {
                bankAccountId = possibleBankIds[0];

                // Try to find bank info from different sources
                if (transaction.bankAccount && typeof transaction.bankAccount === 'object') {
                    bankInfo = transaction.bankAccount;
                } else if (bankAccountId && availableBankAccounts.length > 0) {
                    bankInfo = availableBankAccounts.find(account =>
                        account._id === bankAccountId || account.id === bankAccountId
                    );
                } else if (bankAccountId && bankAccounts.length > 0) {
                    bankInfo = bankAccounts.find(account =>
                        account._id === bankAccountId || account.id === bankAccountId
                    );
                }

                // If no bank info found but we have embedded bank details
                if (!bankInfo && (transaction.bankName || transaction.bankDetails?.bankName)) {
                    bankInfo = {
                        _id: bankAccountId,
                        id: bankAccountId,
                        bankName: transaction.bankName || transaction.bankDetails?.bankName,
                        accountName: transaction.bankAccountName || transaction.bankDetails?.accountName || transaction.bankAccountName,
                        accountNumber: transaction.bankAccountNumber || transaction.bankDetails?.accountNumber,
                        currentBalance: transaction.bankBalance || 0,
                        ifscCode: transaction.bankDetails?.ifscCode,
                        branchName: transaction.bankDetails?.branchName
                    };
                }
            }

            // For non-cash transactions, try to match by bank name if no ID found
            if (!bankAccountId && transaction.paymentMethod !== 'cash' && transaction.bankName) {
                const allAccounts = [...availableBankAccounts, ...bankAccounts];
                bankInfo = allAccounts.find(account =>
                    account.bankName === transaction.bankName ||
                    account.accountName === transaction.bankName
                );
                if (bankInfo) {
                    bankAccountId = bankInfo._id || bankInfo.id;
                }
            }

            // Set bank info for display
            setTransactionBankInfo(bankInfo);

            return {
                amount: String(transaction.amount || transaction.total || ''),
                paymentMethod: transaction.paymentMethod || 'cash',
                paymentDate: formatDateForInput(transaction.paymentDate || transaction.createdAt),
                reference: transaction.reference || '',
                notes: transaction.notes || '',
                status: transaction.status || 'completed',
                bankAccountId: bankAccountId,
                clearingDate: formatDateForInput(transaction.clearingDate),
                employeeName: transaction.employeeName || currentUser?.name || '',
                employeeId: transaction.employeeId || currentUser?.id || '',
                companyName: transaction.companyName || '' // ✅ Added company name to data
            };
        } catch (error) {
            console.error('Error preparing transaction data:', error);
            throw new Error('Failed to prepare transaction data for editing');
        }
    };

    // ✅ Load available bank accounts
    const loadBankAccounts = async () => {
        if (!companyId) return;

        try {
            setLoadingBankAccounts(true);

            // Try multiple sources for bank accounts
            let bankAccountsData = [];

            // First try payment service
            try {
                const paymentBankResponse = await paymentService.getBankAccounts?.(companyId);
                if (paymentBankResponse?.success && paymentBankResponse.data) {
                    bankAccountsData = paymentBankResponse.data;
                }
            } catch (err) {
                console.warn('Could not load bank accounts from payment service:', err.message);
            }

            // If no data from payment service, try purchase service
            if (bankAccountsData.length === 0) {
                try {
                    const purchaseBankResponse = await purchaseService.getBankAccounts?.(companyId);
                    if (purchaseBankResponse?.success && purchaseBankResponse.data) {
                        bankAccountsData = purchaseBankResponse.data;
                    }
                } catch (err) {
                    console.warn('Could not load bank accounts from purchase service:', err.message);
                }
            }

            // Merge with existing bankAccounts prop to ensure we have all data
            const allBankAccounts = [...bankAccounts];

            // Add any new accounts not already in the list
            bankAccountsData.forEach(account => {
                const exists = allBankAccounts.find(existing =>
                    (existing._id === account._id) || (existing.id === account.id)
                );
                if (!exists) {
                    allBankAccounts.push(account);
                }
            });

            setAvailableBankAccounts(allBankAccounts);

        } catch (error) {
            console.error('Error loading bank accounts:', error);
            // Use fallback to provided bankAccounts
            setAvailableBankAccounts(bankAccounts);
        } finally {
            setLoadingBankAccounts(false);
        }
    };

    // Load transaction data when modal opens
    useEffect(() => {
        if (show && transaction) {
            loadBankAccounts();
        }
    }, [show, transaction, companyId]);

    // Prepare form data after bank accounts are loaded
    useEffect(() => {
        if (show && transaction && !loadingBankAccounts) {
            try {
                const preparedData = prepareTransactionData(transaction);
                setFormData(preparedData);
                setOriginalData(preparedData);
                setError('');
                setValidationErrors({});
                setHasChanges(false);

                // ✅ Auto-fill company name after form data is prepared
                setTimeout(() => {
                    autoFillCompanyData();
                }, 100);
            } catch (error) {
                console.error('Error preparing transaction data:', error);
                setError('Failed to load transaction data');
            }
        }
    }, [show, transaction, availableBankAccounts, loadingBankAccounts, currentCompany]); // ✅ Added currentCompany dependency

    // Check for changes
    useEffect(() => {
        if (originalData.amount) {
            const changed = Object.keys(formData).some(key => {
                if (key === 'amount') {
                    return parseFloat(formData[key] || 0) !== parseFloat(originalData[key] || 0);
                }
                return formData[key] !== originalData[key];
            });
            setHasChanges(changed);
        }
    }, [formData, originalData]);

    // Handle form field changes
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // If payment method changes to cash, clear bank account
        if (name === 'paymentMethod' && value === 'cash') {
            setFormData(prev => ({
                ...prev,
                bankAccountId: '',
                clearingDate: ''
            }));
        }

        // Clear field-specific validation error
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Validate form data
    const validateForm = () => {
        const errors = {};

        // Amount validation
        const amount = parseFloat(formData.amount);
        if (!formData.amount || amount <= 0) {
            errors.amount = 'Valid amount is required';
        } else if (amount > 10000000) {
            errors.amount = 'Amount cannot exceed ₹1,00,00,000';
        }

        // Payment method validation
        if (!formData.paymentMethod) {
            errors.paymentMethod = 'Payment method is required';
        }

        // Payment date validation
        if (!formData.paymentDate) {
            errors.paymentDate = 'Payment date is required';
        } else {
            const paymentDate = new Date(formData.paymentDate);
            if (isNaN(paymentDate.getTime())) {
                errors.paymentDate = 'Invalid payment date';
            }
        }

        // Bank account validation for non-cash payments
        if (formData.paymentMethod !== 'cash' && !formData.bankAccountId && availableBankAccounts.length > 0) {
            errors.bankAccountId = 'Bank account is required for non-cash payments';
        }

        // Clearing date validation for cheque
        if (formData.paymentMethod === 'cheque' && formData.clearingDate) {
            const clearingDate = new Date(formData.clearingDate);
            const paymentDate = new Date(formData.paymentDate);
            if (clearingDate < paymentDate) {
                errors.clearingDate = 'Clearing date cannot be before payment date';
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ✅ Enhanced form submission with updated payment service integration
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);
            setError('');

            // Prepare update data with employee context
            const updateData = {
                amount: parseFloat(formData.amount),
                paymentMethod: formData.paymentMethod,
                paymentDate: formData.paymentDate,
                reference: formData.reference,
                notes: formData.notes,
                status: formData.status,
                bankAccountId: formData.paymentMethod === 'cash' ? null : formData.bankAccountId,
                clearingDate: formData.clearingDate || null,
                employeeName: formData.employeeName || currentUser?.name || '',
                employeeId: formData.employeeId || currentUser?.id || '',
                companyName: formData.companyName // ✅ Include company name in update data
            };

            // Check for significant changes and confirm
            const hasAmountChange = parseFloat(formData.amount) !== parseFloat(originalData.amount);
            const hasBankChange = formData.bankAccountId !== originalData.bankAccountId;
            const hasMethodChange = formData.paymentMethod !== originalData.paymentMethod;

            if (hasAmountChange || hasBankChange || hasMethodChange) {
                const changes = [];
                if (hasAmountChange) {
                    changes.push(`Amount: ₹${formatCurrency ? formatCurrency(originalData.amount) : originalData.amount} → ₹${formatCurrency ? formatCurrency(formData.amount) : formData.amount}`);
                }
                if (hasMethodChange) {
                    changes.push(`Payment Method: ${originalData.paymentMethod} → ${formData.paymentMethod}`);
                }
                if (hasBankChange) {
                    const oldBank = transactionBankInfo?.bankName || 'None';
                    const newBank = availableBankAccounts.find(b => b._id === formData.bankAccountId)?.bankName || 'None';
                    changes.push(`Bank Account: ${oldBank} → ${newBank}`);
                }

                const confirmMessage = `The following significant changes will be made:\n\n${changes.join('\n')}\n\nThis may affect bank balances and party balances. Do you want to continue?`;
                if (!window.confirm(confirmMessage)) {
                    setLoading(false);
                    return;
                }
            }

            // Update transaction using the enhanced purchase service method
            let result;
            try {
                // Try using purchase service update method first
                result = await purchaseService.updatePaymentTransaction(
                    transaction.id || transaction._id,
                    updateData,
                    {
                        name: currentUser?.name || '',
                        id: currentUser?.id || ''
                    }
                );
            } catch (err) {
                // Fallback to payment service
                result = await paymentService.updateTransaction(
                    transaction.id || transaction._id,
                    updateData
                );
            }

            if (result.success) {
                const message = result.message || 'Transaction updated successfully';

                // Show success message with details
                let successMessage = message;
                if (result.bankTransactionUpdated) {
                    successMessage += ' (Bank balance updated)';
                }
                if (result.warnings && result.warnings.length > 0) {
                    successMessage += `\n\nWarnings: ${result.warnings.join(', ')}`;
                }

                if (addToast) {
                    addToast(successMessage, 'success');
                } else {
                    alert(successMessage);
                }

                // Notify parent component with updated transaction
                if (onTransactionUpdated) {
                    onTransactionUpdated(result.data || result.transaction);
                }

                // Close modal
                onHide();
            } else {
                throw new Error(result.message || 'Failed to update transaction');
            }

        } catch (error) {
            console.error('Error updating transaction:', error);
            const errorMessage = error.message || 'Failed to update transaction';
            setError(errorMessage);

            if (addToast) {
                addToast(errorMessage, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle modal close
    const handleClose = () => {
        if (hasChanges) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                onHide();
            }
        } else {
            onHide();
        }
    };

    // Get available payment methods
    const getPaymentMethods = () => {
        return [
            { value: 'cash', label: '💵 Cash' },
            { value: 'bank_transfer', label: '🏦 Bank Transfer' },
            { value: 'cheque', label: '📝 Cheque' },
            { value: 'card', label: '💳 Card' },
            { value: 'upi', label: '📱 UPI' }
        ];
    };

    // Get selected bank account info
    const selectedBank = availableBankAccounts.find(bank =>
        bank._id === formData.bankAccountId || bank.id === formData.bankAccountId
    );

    if (!transaction) {
        return null;
    }

    const isPayIn = transaction.type?.toLowerCase().includes('receipt') ||
        transaction.displayType === 'pay-in' ||
        transaction.type === 'payment_in';

    return (
        <Modal
            show={show}
            onHide={handleClose}
            size="lg"
            centered
            backdrop="static"
            className="edit-transaction-modal"
        >
            {/* ✅ FIXED: Modal Header with proper close button positioning */}
            <Modal.Header
                className="border-bottom"
                style={{ position: 'relative', padding: '1rem 1.5rem' }}
            >
                <Modal.Title className="d-flex align-items-center text-dark flex-grow-1">
                    <Badge
                        bg={isPayIn ? 'success' : 'danger'}
                        className="me-2"
                        style={{ fontSize: '11px' }}
                    >
                        <FontAwesomeIcon
                            icon={isPayIn ? faArrowDown : faArrowUp}
                            className="me-1"
                        />
                        {isPayIn ? 'PAYMENT IN' : 'PAYMENT OUT'}
                    </Badge>
                    <FontAwesomeIcon icon={faEdit} className="me-2 text-primary" />
                    Edit Transaction
                </Modal.Title>

                {/* ✅ Custom close button positioned on the right */}
                <Button
                    variant="link"
                    onClick={handleClose}
                    className="text-muted p-0 border-0 bg-transparent"
                    style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '1.25rem',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.1)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    title="Close"
                >
                    <FontAwesomeIcon icon={faTimes} />
                </Button>
            </Modal.Header>

            <Modal.Body className="p-4">
                {/* ✅ ADDED: Company Name Section */}
                <div className="mb-3 p-3 bg-light rounded">
                    <Row>
                        <Col md={3}>
                            <small className="text-muted">Company</small>
                            <div className="fw-bold text-primary">
                                <FontAwesomeIcon icon={faBuilding} className="me-1" />
                                {formData.companyName || 'Loading...'}
                            </div>
                        </Col>
                        <Col md={3}>
                            <small className="text-muted">Transaction Number</small>
                            <div className="fw-bold text-dark">
                                {transaction.paymentNumber || transaction.number || 'N/A'}
                            </div>
                        </Col>
                        <Col md={3}>
                            <small className="text-muted">Party</small>
                            <div className="fw-bold text-dark">
                                {transaction.partyName || 'N/A'}
                            </div>
                        </Col>
                        <Col md={3}>
                            <small className="text-muted">Current Bank Account</small>
                            <div className="fw-bold text-dark">
                                {transactionBankInfo ? (
                                    <div>
                                        <div>{transactionBankInfo.bankName}</div>
                                        <small className="text-muted">
                                            {transactionBankInfo.accountName}
                                            {transactionBankInfo.accountNumber &&
                                                ` (****${transactionBankInfo.accountNumber.slice(-4)})`
                                            }
                                        </small>
                                        {transactionBankInfo.currentBalance !== undefined && (
                                            <div>
                                                <small className={`${transactionBankInfo.currentBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    Balance: ₹{formatCurrency ? formatCurrency(Math.abs(transactionBankInfo.currentBalance)) : Math.abs(transactionBankInfo.currentBalance).toLocaleString()}
                                                </small>
                                            </div>
                                        )}
                                    </div>
                                ) : transaction.paymentMethod === 'cash' ? (
                                    <span className="text-success">Cash Payment</span>
                                ) : transaction.bankName ? (
                                    <div>
                                        <div>{transaction.bankName}</div>
                                        <small className="text-muted">Bank Transaction</small>
                                    </div>
                                ) : (
                                    <span className="text-muted">No bank info</span>
                                )}
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Loading Bank Accounts Alert */}
                {loadingBankAccounts && (
                    <Alert variant="info" className="mb-3">
                        <FontAwesomeIcon icon={faSync} className="me-2" spin />
                        Loading bank accounts...
                    </Alert>
                )}

                {/* Error Alert */}
                {error && (
                    <Alert variant="danger" className="mb-3">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        {error}
                    </Alert>
                )}

                {/* Changes Indicator */}
                {hasChanges && (
                    <Alert variant="info" className="mb-3">
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                        You have unsaved changes
                    </Alert>
                )}

                {/* Bank Account Change Warning */}
                {formData.bankAccountId !== originalData.bankAccountId && formData.paymentMethod !== 'cash' && (
                    <Alert variant="warning" className="mb-3">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        <strong>Bank Account Change:</strong> Changing the bank account will affect the bank balance for both the old and new accounts.
                    </Alert>
                )}

                {/* Available Bank Accounts Info */}
                {availableBankAccounts.length > 0 && (
                    <Alert variant="info" className="mb-3">
                        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                        <strong>{availableBankAccounts.length} bank accounts available</strong>
                        {transactionBankInfo && (
                            <>
                                <br />
                                <small>Current: {transactionBankInfo.bankName} - {transactionBankInfo.accountName}</small>
                            </>
                        )}
                    </Alert>
                )}

                {/* ✅ ADDED: Company Name Hidden Field */}
                <Form.Control
                    type="hidden"
                    name="companyName"
                    value={formData.companyName}
                />

                {/* Edit Form */}
                <Form onSubmit={handleSubmit}>
                    <Row className="g-3">
                        {/* Amount */}
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold text-dark">
                                    <FontAwesomeIcon icon={faRupeeSign} className="me-2 text-success" />
                                    Amount *
                                </Form.Label>
                                <Form.Control
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    placeholder="Enter amount"
                                    min="0"
                                    step="0.01"
                                    isInvalid={!!validationErrors.amount}
                                    disabled={loading}
                                    className="form-control-lg"
                                />
                                <Form.Control.Feedback type="invalid">
                                    {validationErrors.amount}
                                </Form.Control.Feedback>
                                {parseFloat(formData.amount) !== parseFloat(originalData.amount) && (
                                    <Form.Text className="text-warning">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                                        Original amount: ₹{formatCurrency ? formatCurrency(originalData.amount) : originalData.amount}
                                    </Form.Text>
                                )}
                            </Form.Group>
                        </Col>

                        {/* Payment Method */}
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold text-dark">
                                    <FontAwesomeIcon icon={faCreditCard} className="me-2 text-primary" />
                                    Payment Method *
                                </Form.Label>
                                <Form.Select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleChange}
                                    isInvalid={!!validationErrors.paymentMethod}
                                    disabled={loading}
                                    className="form-control-lg"
                                >
                                    {getPaymentMethods().map(method => (
                                        <option key={method.value} value={method.value}>
                                            {method.label}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                    {validationErrors.paymentMethod}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        {/* Payment Date */}
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold text-dark">
                                    <FontAwesomeIcon icon={faCalendar} className="me-2 text-info" />
                                    Payment Date *
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    name="paymentDate"
                                    value={formData.paymentDate}
                                    onChange={handleChange}
                                    isInvalid={!!validationErrors.paymentDate}
                                    disabled={loading}
                                    className="form-control-lg"
                                />
                                <Form.Control.Feedback type="invalid">
                                    {validationErrors.paymentDate}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        {/* Bank Account (for non-cash payments) */}
                        {formData.paymentMethod !== 'cash' && (
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-dark">
                                        <FontAwesomeIcon icon={faBank} className="me-2 text-warning" />
                                        Bank Account *
                                        {transactionBankInfo && (
                                            <small className="text-muted ms-2">
                                                (Currently: {transactionBankInfo.bankName})
                                            </small>
                                        )}
                                    </Form.Label>
                                    <Form.Select
                                        name="bankAccountId"
                                        value={formData.bankAccountId}
                                        onChange={handleChange}
                                        isInvalid={!!validationErrors.bankAccountId}
                                        disabled={loading || loadingBankAccounts}
                                        className="form-control-lg"
                                    >
                                        <option value="">Select Bank Account</option>
                                        {availableBankAccounts.map(account => (
                                            <option key={account._id || account.id} value={account._id || account.id}>
                                                {account.bankName} - {account.accountName}
                                                {account.accountNumber && ` (****${account.accountNumber.slice(-4)})`}
                                                {(account._id === transactionBankInfo?._id || account.id === transactionBankInfo?.id) && ' (Current)'}
                                                {account.currentBalance !== undefined && ` - ₹${formatCurrency ? formatCurrency(account.currentBalance) : account.currentBalance.toLocaleString()}`}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    <Form.Control.Feedback type="invalid">
                                        {validationErrors.bankAccountId}
                                    </Form.Control.Feedback>
                                    {selectedBank && (
                                        <Form.Text className="text-muted">
                                            <FontAwesomeIcon icon={faBank} className="me-1" />
                                            Current Balance: ₹{formatCurrency ? formatCurrency(selectedBank.currentBalance || 0) : (selectedBank.currentBalance || 0).toLocaleString()}
                                            {(selectedBank._id === transactionBankInfo?._id || selectedBank.id === transactionBankInfo?.id) ? (
                                                <span className="text-success ms-2">✓ Same as original</span>
                                            ) : (
                                                <span className="text-warning ms-2">⚠ Different from original</span>
                                            )}
                                        </Form.Text>
                                    )}
                                    {availableBankAccounts.length === 0 && !loadingBankAccounts && (
                                        <Form.Text className="text-warning">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                                            No bank accounts available. Add a bank account first.
                                        </Form.Text>
                                    )}
                                </Form.Group>
                            </Col>
                        )}

                        {/* Reference */}
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold text-dark">
                                    <FontAwesomeIcon icon={faFileText} className="me-2 text-secondary" />
                                    Reference
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    name="reference"
                                    value={formData.reference}
                                    onChange={handleChange}
                                    placeholder="Enter reference number"
                                    disabled={loading}
                                    className="form-control-lg"
                                />
                            </Form.Group>
                        </Col>

                        {/* Clearing Date (for cheque payments) */}
                        {formData.paymentMethod === 'cheque' && (
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-dark">
                                        <FontAwesomeIcon icon={faCalendar} className="me-2 text-warning" />
                                        Clearing Date
                                    </Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="clearingDate"
                                        value={formData.clearingDate}
                                        onChange={handleChange}
                                        isInvalid={!!validationErrors.clearingDate}
                                        disabled={loading}
                                        className="form-control-lg"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {validationErrors.clearingDate}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                        )}

                        {/* Employee Name */}
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold text-dark">
                                    <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-info" />
                                    Employee Name
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    name="employeeName"
                                    value={formData.employeeName}
                                    onChange={handleChange}
                                    placeholder="Enter employee name"
                                    disabled={loading}
                                    className="form-control-lg"
                                />
                                <Form.Text className="text-muted">
                                    Name of the person handling this transaction
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        {/* Notes */}
                        <Col xs={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold text-dark">
                                    <FontAwesomeIcon icon={faStickyNote} className="me-2 text-info" />
                                    Notes
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Enter any notes or remarks"
                                    disabled={loading}
                                    className="form-control-lg"
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Form>
            </Modal.Body>

            <Modal.Footer className="border-top">
                <div className="d-flex justify-content-between w-100">
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>

                    <div className="d-flex gap-2">
                        {!loadingBankAccounts && availableBankAccounts.length === 0 && (
                            <Button
                                variant="outline-info"
                                onClick={loadBankAccounts}
                                disabled={loading}
                                size="sm"
                            >
                                <FontAwesomeIcon icon={faSync} className="me-1" />
                                Reload Banks
                            </Button>
                        )}

                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={loading || !hasChanges || loadingBankAccounts}
                            className="px-4"
                        >
                            {loading ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSave} className="me-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default EditTransactionModal;