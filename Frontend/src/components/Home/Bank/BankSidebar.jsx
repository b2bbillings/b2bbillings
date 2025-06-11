import React, { useState, useEffect } from 'react';
import { ListGroup, Button, InputGroup, Form, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUniversity, faMobile, faPlus, faSearch, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import bankAccountService from '../../../services/bankAccountService';

function BankSidebar({
    accounts = [],
    selectedAccount,
    onAccountSelect,
    onAddAccount,
    searchQuery,
    onSearchChange,
    activeType,
    onTypeChange,
    loading = false
}) {
    const { companyId } = useParams();

    const [sidebarAccounts, setSidebarAccounts] = useState([]);
    const [sidebarLoading, setSidebarLoading] = useState(false);
    const [sidebarError, setSidebarError] = useState('');

    const getEffectiveCompanyId = () => {
        const sources = [
            companyId,
            localStorage.getItem('selectedCompanyId'),
            sessionStorage.getItem('companyId')
        ];

        try {
            const currentCompanyStr = localStorage.getItem('currentCompany');
            if (currentCompanyStr) {
                const currentCompany = JSON.parse(currentCompanyStr);
                const companyIdFromStorage = currentCompany.id || currentCompany._id;
                if (companyIdFromStorage) {
                    sources.unshift(companyIdFromStorage);
                }
            }
        } catch (error) {
            // Silent fallback
        }

        for (const source of sources) {
            if (source && source.trim() !== '') {
                return source;
            }
        }
        return null;
    };

    const loadSidebarAccounts = async () => {
        const effectiveCompanyId = getEffectiveCompanyId();

        if (!effectiveCompanyId) {
            setSidebarError('Company selection required');
            setSidebarLoading(false);
            return;
        }

        setSidebarLoading(true);
        setSidebarError('');

        try {
            const response = await bankAccountService.getBankAccounts(effectiveCompanyId, {
                type: activeType === 'all' ? 'all' : activeType,
                active: 'true',
                page: 1,
                limit: 100,
                sortBy: 'accountName',
                sortOrder: 'asc'
            });

            const fetchedAccounts = response.data?.accounts || [];
            setSidebarAccounts(fetchedAccounts);

        } catch (error) {
            setSidebarError(error.response?.data?.message || 'Failed to load accounts');
        } finally {
            setSidebarLoading(false);
        }
    };

    useEffect(() => {
        loadSidebarAccounts();
    }, [companyId, activeType]);

    const displayAccounts = accounts.length > 0 ? accounts : sidebarAccounts;

    const filteredAccounts = displayAccounts.filter(acc => {
        const matchesType = activeType === 'all' || acc.type === activeType;
        if (!matchesType) return false;

        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        return (
            acc.accountName?.toLowerCase().includes(query) ||
            acc.accountNumber?.toLowerCase().includes(query) ||
            acc.bankName?.toLowerCase().includes(query) ||
            acc.accountHolderName?.toLowerCase().includes(query) ||
            acc.ifscCode?.toLowerCase().includes(query) ||
            acc.upiId?.toLowerCase().includes(query) ||
            acc.mobileNumber?.toLowerCase().includes(query)
        );
    });

    const getAccountDisplayInfo = (account) => {
        return {
            id: account._id || account.id,
            name: account.accountName || 'Unknown Account',
            number: account.accountNumber || 'N/A',
            upiId: account.upiId || null,
            mobileNumber: account.mobileNumber || null,
            balance: account.currentBalance || 0,
            type: account.type || 'bank',
            isActive: account.isActive !== false
        };
    };

    const handleTypeChange = (newType) => {
        if (onTypeChange) {
            onTypeChange(newType);
        }
    };

    const getTypeTotals = () => {
        const bankAccounts = displayAccounts.filter(acc => acc.type === 'bank');
        const upiAccounts = displayAccounts.filter(acc => acc.type === 'upi');

        return {
            bank: {
                count: bankAccounts.length,
                total: bankAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0)
            },
            upi: {
                count: upiAccounts.length,
                total: upiAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0),
                enabledCount: upiAccounts.filter(acc => acc.upiId && acc.mobileNumber && acc.isActive).length
            }
        };
    };

    const typeTotals = getTypeTotals();

    const getAccountIcon = (account) => {
        if (account.type === 'upi') return faMobile;
        return faUniversity;
    };

    const formatCurrency = (amount) => {
        return bankAccountService.formatCurrency(amount || 0);
    };

    const getAccountSubtitle = (account) => {
        const accountInfo = getAccountDisplayInfo(account);

        if (account.type === 'upi') {
            return accountInfo.upiId || accountInfo.mobileNumber || accountInfo.number;
        }
        return accountInfo.number !== 'N/A' && accountInfo.number !== '' ? accountInfo.number : null;
    };

    // ✅ Format amount for display - compact version
    const formatDisplayAmount = (amount) => {
        const num = parseFloat(amount) || 0;

        if (Math.abs(num) >= 10000000) {
            return `₹${(num / 10000000).toFixed(1)}Cr`;
        } else if (Math.abs(num) >= 100000) {
            return `₹${(num / 100000).toFixed(1)}L`;
        } else if (Math.abs(num) >= 1000) {
            return `₹${(num / 1000).toFixed(1)}K`;
        }
        return `₹${Math.round(num).toLocaleString('en-IN')}`;
    };

    return (
        <>
            <div className="bank-sidebar h-100 bg-light border-end">
                {/* Header Section */}
                <div className="sidebar-header p-3 bg-white border-bottom">
                    {/* Type Selector */}
                    <div className="mb-3">
                        <div className="btn-group w-100" role="group">
                            <input
                                type="radio"
                                className="btn-check"
                                name="accountType"
                                id="bankType"
                                checked={activeType === 'bank'}
                                onChange={() => handleTypeChange('bank')}
                            />
                            <label className="btn btn-outline-primary btn-sm flex-fill" htmlFor="bankType">
                                <FontAwesomeIcon icon={faUniversity} className="me-1" size="xs" />
                                Bank ({typeTotals.bank.count})
                            </label>

                            <input
                                type="radio"
                                className="btn-check"
                                name="accountType"
                                id="upiType"
                                checked={activeType === 'upi'}
                                onChange={() => handleTypeChange('upi')}
                            />
                            <label className="btn btn-outline-primary btn-sm flex-fill" htmlFor="upiType">
                                <FontAwesomeIcon icon={faMobile} className="me-1" size="xs" />
                                UPI ({typeTotals.upi.count})
                                {typeTotals.upi.enabledCount > 0 && (
                                    <span className="badge bg-success ms-1" style={{ fontSize: '0.6rem' }}>
                                        {typeTotals.upi.enabledCount}
                                    </span>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Title and Add Button */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="flex-grow-1 me-2">
                            <h6 className="mb-0 fw-bold text-dark small">
                                {activeType === 'bank' ? 'Bank Accounts' : 'UPI Accounts'}
                            </h6>
                            <small className="text-muted">
                                Total: {formatCurrency(activeType === 'bank' ? typeTotals.bank.total : typeTotals.upi.total)}
                                {activeType === 'upi' && typeTotals.upi.enabledCount > 0 && (
                                    <span className="text-success ms-1">
                                        • {typeTotals.upi.enabledCount} enabled
                                    </span>
                                )}
                            </small>
                        </div>
                        <Button
                            size="sm"
                            variant="primary"
                            className="btn-add-account flex-shrink-0"
                            onClick={() => onAddAccount(activeType)}
                            disabled={sidebarLoading || !getEffectiveCompanyId()}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
                            <span className="small">Add</span>
                        </Button>
                    </div>

                    {/* Search Input */}
                    <InputGroup size="sm">
                        <InputGroup.Text className="bg-light border-end-0 text-muted">
                            <FontAwesomeIcon icon={faSearch} size="xs" />
                        </InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder={activeType === 'upi' ? "Search by name, UPI ID, mobile..." : "Search accounts..."}
                            value={searchQuery}
                            onChange={e => onSearchChange(e.target.value)}
                            className="border-start-0 bg-light text-dark"
                            style={{ fontSize: '0.75rem' }}
                            disabled={sidebarLoading}
                        />
                    </InputGroup>
                </div>

                {/* Error Alert */}
                {sidebarError && (
                    <Alert variant="danger" className="m-2 mb-0">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        <small>{sidebarError}</small>
                    </Alert>
                )}

                {/* Accounts List */}
                <div className="accounts-list p-2" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                    {/* Loading State */}
                    {(sidebarLoading || loading) && (
                        <div className="text-center py-4">
                            <Spinner animation="border" size="sm" className="text-primary mb-2" />
                            <div className="text-muted small">Loading accounts...</div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!sidebarLoading && !loading && filteredAccounts.length === 0 && (
                        <div className="text-center py-4">
                            <div className="mb-2" style={{ fontSize: '2rem', opacity: 0.3 }}>
                                <FontAwesomeIcon icon={activeType === 'bank' ? faUniversity : faMobile} />
                            </div>
                            <div className="text-muted small fw-medium mb-1">
                                {searchQuery ? 'No accounts found' : `No ${activeType} accounts`}
                            </div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                {searchQuery
                                    ? 'Try different search terms'
                                    : `Click Add to create your first ${activeType === 'upi' ? 'UPI' : 'bank'} account`
                                }
                            </small>
                        </div>
                    )}

                    {/* ✅ FIXED: Accounts List - Better Layout */}
                    {!sidebarLoading && !loading && filteredAccounts.length > 0 && (
                        <ListGroup variant="flush">
                            {filteredAccounts.map((account) => {
                                const accountInfo = getAccountDisplayInfo(account);
                                const isSelected = selectedAccount?._id === accountInfo.id || selectedAccount?.id === accountInfo.id;
                                const subtitle = getAccountSubtitle(account);
                                const isUpiEnabled = account.type === 'upi' && account.upiId && account.mobileNumber && account.isActive;

                                return (
                                    <ListGroup.Item
                                        key={accountInfo.id}
                                        action
                                        active={isSelected}
                                        onClick={() => onAccountSelect(account)}
                                        className={`border-0 mb-2 rounded-2 account-item ${isSelected ? 'bg-primary bg-opacity-10 border-primary' : 'bg-white border'
                                            }`}
                                        style={{
                                            padding: '0.75rem',
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            opacity: accountInfo.isActive ? 1 : 0.6
                                        }}
                                    >
                                        {/* ✅ FIXED: Container with proper flex layout */}
                                        <div className="account-item-container">
                                            {/* ✅ Main row - Icon, Name and Amount */}
                                            <div className="account-main-row">
                                                <div className="account-info">
                                                    <FontAwesomeIcon
                                                        icon={getAccountIcon(account)}
                                                        className={`account-icon ${isSelected ? 'text-primary' : account.type === 'upi' ? 'text-info' : 'text-muted'
                                                            }`}
                                                        size="sm"
                                                    />
                                                    <span
                                                        className={`account-name ${isSelected ? 'text-primary' : 'text-dark'
                                                            }`}
                                                        title={accountInfo.name}
                                                    >
                                                        {accountInfo.name}
                                                    </span>
                                                </div>
                                                <div className="account-balance">
                                                    <span
                                                        className={`balance-amount ${accountInfo.balance < 0 ? 'text-danger' : 'text-success'
                                                            }`}
                                                        title={formatCurrency(accountInfo.balance)}
                                                    >
                                                        {formatDisplayAmount(accountInfo.balance)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ✅ Badges row */}
                                            <div className="account-badges">
                                                {!accountInfo.isActive && (
                                                    <span className="badge bg-secondary">
                                                        Inactive
                                                    </span>
                                                )}
                                                {account.type === 'upi' && isUpiEnabled && (
                                                    <span className="badge bg-success">
                                                        UPI Ready
                                                    </span>
                                                )}
                                            </div>

                                            {/* ✅ Subtitle row */}
                                            {subtitle && (
                                                <div className="account-subtitle">
                                                    <span
                                                        className={`subtitle-text ${isSelected ? 'text-primary' : 'text-muted'
                                                            }`}
                                                        title={subtitle}
                                                    >
                                                        {subtitle}
                                                    </span>
                                                </div>
                                            )}

                                            {/* ✅ Mobile number row (UPI only) */}
                                            {account.type === 'upi' && accountInfo.mobileNumber && subtitle !== accountInfo.mobileNumber && (
                                                <div className="account-mobile">
                                                    <span
                                                        className={`mobile-text ${isSelected ? 'text-primary' : 'text-muted'
                                                            }`}
                                                        title={accountInfo.mobileNumber}
                                                    >
                                                        {accountInfo.mobileNumber}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="selection-indicator" />
                                        )}
                                    </ListGroup.Item>
                                );
                            })}
                        </ListGroup>
                    )}
                </div>

                {/* Summary Footer */}
                {!sidebarLoading && !loading && displayAccounts.length > 0 && (
                    <div className="border-top p-2 bg-white">
                        <div className="text-center">
                            <small className="text-muted d-block mb-1">
                                {filteredAccounts.length} of {displayAccounts.length} accounts
                                {activeType === 'upi' && typeTotals.upi.enabledCount > 0 && (
                                    <span className="text-success ms-1">
                                        • {typeTotals.upi.enabledCount} UPI enabled
                                    </span>
                                )}
                            </small>
                            <small className="fw-bold text-primary">
                                Total: {formatCurrency(
                                    activeType === 'bank' ? typeTotals.bank.total : typeTotals.upi.total
                                )}
                            </small>
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ FIXED: Enhanced Custom Styles - Better Layout */}
            <style>
                {`
                .btn-add-account {
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    min-width: 60px;
                }

                .btn-add-account:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(13, 110, 253, 0.3);
                }

                .btn-add-account:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                /* ✅ FIXED: Account item container layout */
                .account-item-container {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .account-main-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    min-height: 20px;
                }

                .account-info {
                    display: flex;
                    align-items: center;
                    flex: 1;
                    min-width: 0; /* Important for text truncation */
                    gap: 0.5rem;
                }

                .account-icon {
                    flex-shrink: 0;
                    width: 16px;
                }

                .account-name {
                    font-weight: 600;
                    font-size: 0.875rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    flex: 1;
                    min-width: 0;
                }

                .account-balance {
                    flex-shrink: 0;
                    margin-left: 0.5rem;
                    min-width: fit-content;
                }

                .balance-amount {
                    font-weight: 700;
                    font-size: 0.8rem;
                    white-space: nowrap;
                }

                .account-badges {
                    display: flex;
                    gap: 0.25rem;
                    flex-wrap: wrap;
                    align-items: center;
                    min-height: 16px;
                }

                .account-badges .badge {
                    font-size: 0.6rem;
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                }

                .account-subtitle {
                    margin-left: 22px; /* Align with account name */
                }

                .subtitle-text {
                    font-size: 0.7rem;
                    font-family: monospace;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    display: block;
                }

                .account-mobile {
                    margin-left: 22px; /* Align with account name */
                }

                .mobile-text {
                    font-size: 0.65rem;
                    font-family: monospace;
                    opacity: 0.8;
                    display: block;
                }

                .selection-indicator {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background-color: #0d6efd;
                    border-radius: 0 2px 2px 0;
                }

                .account-item:hover:not(.list-group-item-action[disabled]) {
                    transform: translateX(2px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
                }

                .account-item.active,
                .account-item:focus {
                    transform: translateX(2px);
                    box-shadow: 0 3px 12px rgba(13, 110, 253, 0.15) !important;
                }

                .accounts-list::-webkit-scrollbar {
                    width: 6px;
                }

                .accounts-list::-webkit-scrollbar-track {
                    background: transparent;
                }

                .accounts-list::-webkit-scrollbar-thumb {
                    background: #dee2e6;
                    border-radius: 3px;
                }

                .accounts-list::-webkit-scrollbar-thumb:hover {
                    background: #adb5bd;
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .account-item {
                    animation: fadeInUp 0.3s ease-out;
                }

                .account-item:nth-child(1) { animation-delay: 0.05s; }
                .account-item:nth-child(2) { animation-delay: 0.1s; }
                .account-item:nth-child(3) { animation-delay: 0.15s; }
                .account-item:nth-child(4) { animation-delay: 0.2s; }

                .btn-group .btn-check:checked + .btn-outline-primary {
                    background-color: #0d6efd;
                    border-color: #0d6efd;
                    color: white;
                }

                .btn-group .btn-outline-primary {
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.375rem 0.5rem;
                }

                .account-item .badge.bg-success {
                    background-color: #198754 !important;
                }

                .account-item .text-info {
                    color: #0dcaf0 !important;
                }

                @media (max-width: 768px) {
                    .sidebar-header {
                        padding: 0.75rem !important;
                    }

                    .accounts-list {
                        padding: 0.5rem !important;
                        max-height: calc(100vh - 270px) !important;
                    }

                    .account-item {
                        padding: 0.6rem !important;
                        margin-bottom: 0.5rem !important;
                    }

                    .btn-add-account {
                        font-size: 0.7rem;
                        padding: 0.3rem 0.6rem;
                        min-width: 50px;
                    }

                    .btn-group .btn-outline-primary {
                        font-size: 0.7rem;
                        padding: 0.3rem 0.4rem;
                    }

                    .account-name {
                        font-size: 0.8rem;
                    }

                    .balance-amount {
                        font-size: 0.75rem;
                    }
                }

                @media (max-width: 576px) {
                    .sidebar-header .d-flex:nth-child(2) {
                        flex-direction: column;
                        gap: 0.75rem;
                        align-items: stretch;
                    }

                    .btn-add-account {
                        width: 100%;
                        text-align: center;
                    }

                    .account-main-row {
                        gap: 0.25rem;
                    }

                    .account-info {
                        gap: 0.35rem;
                    }

                    .account-name {
                        font-size: 0.75rem;
                    }

                    .balance-amount {
                        font-size: 0.7rem;
                    }
                }
                `}
            </style>
        </>
    );
}

export default BankSidebar;