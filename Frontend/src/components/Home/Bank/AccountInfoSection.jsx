import React, { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import bankAccountService from '../../../services/bankAccountService';
import './AccountInfoSection.css'; // ✅ Import CSS file

function AccountInfoSection({ selectedAccount, onEditAccount, onAddTransaction, onAccountUpdated }) {
    const [showTransactionDropdown, setShowTransactionDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef(null);
    const toggleButtonRef = useRef(null);

    // ✅ FIXED: Calculate dropdown position relative to button
    const calculateDropdownPosition = () => {
        if (toggleButtonRef.current) {
            const rect = toggleButtonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.right - 220 + window.scrollX // Align to right edge
            });
        }
    };

    // ✅ FIXED: Handle dropdown toggle with position calculation
    const handleDropdownToggle = (isOpen) => {

        if (isOpen) {
            calculateDropdownPosition();
        }
        setShowTransactionDropdown(isOpen);
    };

    // ✅ FIXED: Update position on scroll/resize
    useEffect(() => {
        const updatePosition = () => {
            if (showTransactionDropdown) {
                calculateDropdownPosition();
            }
        };

        window.addEventListener('scroll', updatePosition);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [showTransactionDropdown]);

    // ✅ FIXED: Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                toggleButtonRef.current && !toggleButtonRef.current.contains(event.target)) {
                setShowTransactionDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // ✅ FIXED: Handle specific transaction types correctly
    const handleTransactionType = (transactionType, event) => {

        // Prevent event propagation
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Validate required props
        if (!onAddTransaction) {
            console.error('❌ onAddTransaction prop is missing');
            return;
        }

        if (!selectedAccount) {
            console.error('❌ No account selected');
            return;
        }

        // Close dropdown first
        setShowTransactionDropdown(false);

        // ✅ FIXED: Pass the correct transaction type with proper structure
        setTimeout(() => {

            try {
                // ✅ FIXED: Pass transaction type as an object with the type property
                onAddTransaction(selectedAccount, {
                    type: transactionType,
                    accountId: selectedAccount._id || selectedAccount.id,
                    accountName: selectedAccount.accountName,
                    accountType: selectedAccount.type
                });
            } catch (error) {
                console.error('❌ Error calling onAddTransaction:', error);
            }
        }, 100);
    };

    // ✅ ENHANCED: Handle edit with proper data formatting
    const handleEditClick = () => {


        if (!onEditAccount) {
            console.error('❌ onEditAccount prop is missing');
            return;
        }

        // ✅ Format account data for editing
        const editData = {
            _id: selectedAccount._id || selectedAccount.id,
            accountName: selectedAccount.accountName || '',
            accountNumber: selectedAccount.accountNumber || '',
            bankName: selectedAccount.bankName || '',
            branchName: selectedAccount.branchName || '',
            ifscCode: selectedAccount.ifscCode || '',
            accountType: selectedAccount.accountType || 'savings',
            accountHolderName: selectedAccount.accountHolderName || '',
            type: selectedAccount.type || 'bank',
            openingBalance: selectedAccount.openingBalance || 0,
            asOfDate: selectedAccount.asOfDate ?
                new Date(selectedAccount.asOfDate).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0],
            printUpiQrCodes: selectedAccount.printUpiQrCodes || false,
            printBankDetails: selectedAccount.printBankDetails || false,
            upiId: selectedAccount.upiId || '',
            isActive: selectedAccount.isActive !== false
        };


        onEditAccount(editData);
    };

    // ✅ FIXED: Custom dropdown portal component
    const DropdownPortal = ({ children, show, position }) => {
        if (!show) return null;

        return createPortal(
            <div
                ref={dropdownRef}
                className="position-fixed account-dropdown-portal"
                style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    zIndex: 9999,
                    minWidth: '220px'
                }}
            >
                <div className="dropdown-menu show border-0 shadow-lg rounded-3 bg-white animate__fadeIn">
                    {children}
                </div>
            </div>,
            document.body
        );
    };

    // Early return AFTER all hooks have been called
    if (!selectedAccount) {
        return (
            <Card className="mb-3 border-0 shadow-sm bg-light">
                <Card.Body className="text-center text-muted py-5">
                    <div className="small fw-medium">Select an account to view details</div>
                </Card.Body>
            </Card>
        );
    }

    // ✅ Format currency properly
    const formatCurrency = (amount) => {
        return bankAccountService.formatCurrency(amount || 0);
    };

    // ✅ Get account type display
    const getAccountTypeDisplay = () => {
        const types = {
            'savings': 'Savings Account',
            'current': 'Current Account',
            'cash': 'Cash Account',
            'fd': 'Fixed Deposit',
            'rd': 'Recurring Deposit',
            'loan': 'Loan Account',
            'cc': 'Credit Card'
        };
        return types[selectedAccount.accountType] || selectedAccount.accountType || 'Unknown';
    };

    return (
        <Card className="mb-3 border-0 shadow-sm rounded-3 account-info-card bg-white">
            <Card.Body className="p-3">
                <Row className="align-items-center">
                    {/* Left Side - Account Details */}
                    <Col md={8}>
                        <div className="mb-2">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <h6 className="fw-bold mb-0 text-dark small">{selectedAccount.accountName}</h6>
                                <div className="d-flex align-items-center gap-2">
                                    <span className={`badge ${selectedAccount.type === 'cash' ? 'bg-warning' : 'bg-primary'} small`}>
                                        {selectedAccount.type?.toUpperCase() || 'BANK'}
                                    </span>
                                    {!selectedAccount.isActive && (
                                        <span className="badge bg-secondary small">INACTIVE</span>
                                    )}
                                </div>
                            </div>

                            <div className="account-details">
                                <Row className="g-2">
                                    <Col sm={6}>
                                        <div className="d-flex align-items-center mb-2">
                                            <span className="text-muted fw-medium me-2 small" style={{ minWidth: '80px', fontSize: '0.75rem' }}>
                                                Type:
                                            </span>
                                            <span className="text-dark fw-normal small" style={{ fontSize: '0.75rem' }}>
                                                {getAccountTypeDisplay()}
                                            </span>
                                        </div>
                                        {selectedAccount.bankName && (
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="text-muted fw-medium me-2 small" style={{ minWidth: '80px', fontSize: '0.75rem' }}>
                                                    Bank Name:
                                                </span>
                                                <span className="text-dark fw-normal small" style={{ fontSize: '0.75rem' }}>
                                                    {selectedAccount.bankName}
                                                </span>
                                            </div>
                                        )}
                                        {selectedAccount.ifscCode && (
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="text-muted fw-medium me-2 small" style={{ minWidth: '80px', fontSize: '0.75rem' }}>
                                                    IFSC Code:
                                                </span>
                                                <span className="text-dark fw-normal small" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                    {selectedAccount.ifscCode}
                                                </span>
                                            </div>
                                        )}
                                    </Col>
                                    <Col sm={6}>
                                        {selectedAccount.accountNumber && (
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="text-muted fw-medium me-2 small" style={{ minWidth: '90px', fontSize: '0.75rem' }}>
                                                    Account No:
                                                </span>
                                                <span className="text-dark fw-normal small" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                    {selectedAccount.accountNumber}
                                                </span>
                                            </div>
                                        )}
                                        {selectedAccount.accountHolderName && (
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="text-muted fw-medium me-2 small" style={{ minWidth: '90px', fontSize: '0.75rem' }}>
                                                    Holder:
                                                </span>
                                                <span className="text-dark fw-normal small" style={{ fontSize: '0.75rem' }}>
                                                    {selectedAccount.accountHolderName}
                                                </span>
                                            </div>
                                        )}
                                        {selectedAccount.upiId && (
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="text-muted fw-medium me-2 small" style={{ minWidth: '90px', fontSize: '0.75rem' }}>
                                                    UPI ID:
                                                </span>
                                                <span className="text-dark fw-normal small" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                    {selectedAccount.upiId}
                                                </span>
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            </div>
                        </div>
                    </Col>

                    {/* Right Side - Balance and Actions */}
                    <Col md={4} className="text-end">
                        <div className={`h4 fw-bold mb-1 ${selectedAccount.currentBalance < 0 ? 'text-danger' : 'text-success'
                            }`} style={{ fontSize: '1.5rem' }}>
                            {formatCurrency(selectedAccount.currentBalance)}
                        </div>
                        <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>Current Balance</div>

                        {/* Opening Balance Info */}
                        {selectedAccount.openingBalance !== selectedAccount.currentBalance && (
                            <div className="small text-muted mb-3" style={{ fontSize: '0.65rem' }}>
                                Opening: {formatCurrency(selectedAccount.openingBalance)}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="d-flex gap-2 justify-content-end align-items-center flex-wrap account-actions">
                            {/* ✅ UPDATED: Transaction dropdown button */}
                            <div className="position-relative">
                                <Button
                                    ref={toggleButtonRef}
                                    variant="primary"
                                    size="sm"
                                    className="btn-transaction px-3 fw-semibold border-0 small d-flex align-items-center"
                                    style={{ minWidth: '130px', fontSize: '0.75rem' }}
                                    onClick={() => handleDropdownToggle(!showTransactionDropdown)}
                                >
                                    <span className="btn-text me-1">Add Transaction</span>
                                    <FontAwesomeIcon
                                        icon={faChevronDown}
                                        className={`transition-transform ${showTransactionDropdown ? 'rotate-180' : ''}`}
                                        size="xs"
                                    />
                                </Button>

                                {/* ✅ UPDATED: Portal-based dropdown with all transaction types */}
                                <DropdownPortal show={showTransactionDropdown} position={dropdownPosition}>
                                    <div className="dropdown-header px-3 py-2 text-muted border-bottom bg-light">
                                        <small style={{ fontSize: '0.7rem' }}>Transaction Types</small>
                                    </div>

                                    {/* ✅ Basic Transactions */}
                                    <button
                                        type="button"
                                        onClick={(e) => handleTransactionType('deposit', e)}
                                        className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        <span className="text-success me-2">💰</span>
                                        Deposit Money
                                        <small className="text-muted ms-auto">Add Money</small>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => handleTransactionType('withdraw', e)}
                                        className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        <span className="text-danger me-2">💸</span>
                                        Withdraw Money
                                        <small className="text-muted ms-auto">Remove Money</small>
                                    </button>

                                    <hr className="dropdown-divider my-1" />

                                    {/* ✅ Transfer Types (conditionally shown) */}
                                    {selectedAccount.type === 'bank' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => handleTransactionType('transfer-bank-to-cash', e)}
                                                className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                <span className="text-primary me-2">🏦</span>
                                                Bank to Cash Transfer
                                                <small className="text-muted ms-auto">Transfer</small>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => handleTransactionType('transfer-bank-to-bank', e)}
                                                className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                <span className="text-warning me-2">🔄</span>
                                                Bank to Bank Transfer
                                                <small className="text-muted ms-auto">Transfer</small>
                                            </button>
                                        </>
                                    )}

                                    {selectedAccount.type === 'cash' && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleTransactionType('transfer-cash-to-bank', e)}
                                            className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start"
                                            style={{ fontSize: '0.75rem' }}
                                        >
                                            <span className="text-info me-2">💵</span>
                                            Cash to Bank Transfer
                                            <small className="text-muted ms-auto">Transfer</small>
                                        </button>
                                    )}

                                    <hr className="dropdown-divider my-1" />

                                    {/* ✅ Balance Adjustment */}
                                    <button
                                        type="button"
                                        onClick={(e) => handleTransactionType('adjust-balance', e)}
                                        className="dropdown-item border-0 d-flex align-items-center py-2 px-3 bg-transparent w-100 text-start text-secondary"
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        <span className="me-2">⚖️</span>
                                        Adjust Balance
                                        <small className="text-muted ms-auto">Correct</small>
                                    </button>
                                </DropdownPortal>
                            </div>

                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={handleEditClick}
                                className="btn-edit px-3 border-2 fw-medium small d-flex align-items-center"
                                style={{ fontSize: '0.75rem' }}
                            >
                                <FontAwesomeIcon icon={faEdit} className="me-1" size="xs" />
                                <span>Edit</span>
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
}

export default AccountInfoSection;