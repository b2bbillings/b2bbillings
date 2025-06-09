import React, { useState, useEffect } from 'react';
import { ListGroup, Button, InputGroup, Form, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUniversity, faMoneyBillWave, faPlus, faSearch, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
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
    // ✅ Get company ID from URL
    const { companyId } = useParams();

    // ✅ Local state for sidebar-specific data
    const [sidebarAccounts, setSidebarAccounts] = useState([]);
    const [sidebarLoading, setSidebarLoading] = useState(false);
    const [sidebarError, setSidebarError] = useState('');

    // ✅ Enhanced company ID resolution
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
            console.warn('⚠️ Failed to parse currentCompany:', error);
        }

        for (const source of sources) {
            if (source && source.trim() !== '') {
                console.log('✅ BankSidebar using company ID:', source);
                return source;
            }
        }
        return null;
    };

    // ✅ Load accounts from backend
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
            console.log('🔄 Loading sidebar accounts for company:', effectiveCompanyId, 'type:', activeType);

            const response = await bankAccountService.getBankAccounts(effectiveCompanyId, {
                type: activeType === 'all' ? 'all' : activeType,
                active: 'true',
                page: 1,
                limit: 100,
                sortBy: 'accountName',
                sortOrder: 'asc'
            });

            const fetchedAccounts = response.data?.accounts || [];
            console.log('✅ Sidebar accounts loaded:', fetchedAccounts.length, 'accounts');
            console.log('📋 Account data:', fetchedAccounts);

            setSidebarAccounts(fetchedAccounts);

        } catch (error) {
            console.error('❌ Error loading sidebar accounts:', error);
            setSidebarError(error.response?.data?.message || 'Failed to load accounts');
        } finally {
            setSidebarLoading(false);
        }
    };

    // ✅ Load data when component mounts or dependencies change
    useEffect(() => {
        console.log('🔄 BankSidebar effect triggered:', { companyId, activeType });
        loadSidebarAccounts();
    }, [companyId, activeType]);

    // ✅ Use parent accounts if provided, otherwise use sidebar accounts
    const displayAccounts = accounts.length > 0 ? accounts : sidebarAccounts;

    // ✅ Filter accounts based on search query and active type
    const filteredAccounts = displayAccounts.filter(acc => {
        // ✅ FIXED: First filter by type
        const matchesType = activeType === 'all' || acc.type === activeType;
        if (!matchesType) return false;

        // Then filter by search query
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        return (
            acc.accountName?.toLowerCase().includes(query) ||
            acc.accountNumber?.toLowerCase().includes(query) ||
            acc.bankName?.toLowerCase().includes(query) ||
            acc.accountHolderName?.toLowerCase().includes(query) ||
            acc.ifscCode?.toLowerCase().includes(query)
        );
    });

    // ✅ Get account display info with proper ID handling
    const getAccountDisplayInfo = (account) => {
        return {
            id: account._id || account.id,
            name: account.accountName || 'Unknown Account',
            number: account.accountNumber || 'N/A',
            balance: account.currentBalance || 0,
            type: account.type || 'bank',
            isActive: account.isActive !== false
        };
    };

    // ✅ Handle account type change
    const handleTypeChange = (newType) => {
        console.log('🔄 Changing account type to:', newType);
        if (onTypeChange) {
            onTypeChange(newType);
        }
    };

    // ✅ Calculate type totals
    const getTypeTotals = () => {
        const bankAccounts = displayAccounts.filter(acc => acc.type === 'bank');
        const cashAccounts = displayAccounts.filter(acc => acc.type === 'cash');

        return {
            bank: {
                count: bankAccounts.length,
                total: bankAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0)
            },
            cash: {
                count: cashAccounts.length,
                total: cashAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0)
            }
        };
    };

    const typeTotals = getTypeTotals();

    // ✅ Get account icon based on type
    const getAccountIcon = (account) => {
        if (account.type === 'cash') return faMoneyBillWave;
        return faUniversity;
    };

    // ✅ Format currency
    const formatCurrency = (amount) => {
        return bankAccountService.formatCurrency(amount || 0);
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
                                id="cashType"
                                checked={activeType === 'cash'}
                                onChange={() => handleTypeChange('cash')}
                            />
                            <label className="btn btn-outline-primary btn-sm flex-fill" htmlFor="cashType">
                                <FontAwesomeIcon icon={faMoneyBillWave} className="me-1" size="xs" />
                                Cash ({typeTotals.cash.count})
                            </label>
                        </div>
                    </div>

                    {/* Title and Add Button */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h6 className="mb-0 fw-bold text-dark small">
                                {activeType === 'bank' ? 'Bank Accounts' : 'Cash Accounts'}
                            </h6>
                            <small className="text-muted">
                                Total: {formatCurrency(activeType === 'bank' ? typeTotals.bank.total : typeTotals.cash.total)}
                            </small>
                        </div>
                        <Button
                            size="sm"
                            variant="primary"
                            className="btn-add-account"
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
                            placeholder="Search accounts..."
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
                                <FontAwesomeIcon icon={activeType === 'bank' ? faUniversity : faMoneyBillWave} />
                            </div>
                            <div className="text-muted small fw-medium mb-1">
                                {searchQuery ? 'No accounts found' : `No ${activeType} accounts`}
                            </div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                {searchQuery ? 'Try different search terms' : `Click Add to create your first ${activeType} account`}
                            </small>
                        </div>
                    )}

                    {/* Accounts List */}
                    {!sidebarLoading && !loading && filteredAccounts.length > 0 && (
                        <ListGroup variant="flush">
                            {filteredAccounts.map((account) => {
                                const accountInfo = getAccountDisplayInfo(account);
                                const isSelected = selectedAccount?._id === accountInfo.id || selectedAccount?.id === accountInfo.id;

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
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1 me-2">
                                                <div className="d-flex align-items-center mb-1">
                                                    <FontAwesomeIcon
                                                        icon={getAccountIcon(account)}
                                                        className={`me-2 ${isSelected ? 'text-primary' : 'text-muted'
                                                            }`}
                                                        size="sm"
                                                    />
                                                    <span
                                                        className={`fw-semibold small ${isSelected ? 'text-primary' : 'text-dark'
                                                            }`}
                                                        style={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        title={accountInfo.name}
                                                    >
                                                        {accountInfo.name}
                                                    </span>
                                                    {!accountInfo.isActive && (
                                                        <span className="badge bg-secondary ms-2" style={{ fontSize: '0.6rem' }}>
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                {accountInfo.number !== 'N/A' && accountInfo.number !== '' && (
                                                    <div
                                                        className={`${isSelected ? 'text-primary' : 'text-muted'
                                                            }`}
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            fontFamily: 'monospace',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        title={accountInfo.number}
                                                    >
                                                        {accountInfo.number}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-end">
                                                <span
                                                    className={`fw-bold small ${accountInfo.balance < 0 ? 'text-danger' : 'text-success'
                                                        }`}
                                                    title={formatCurrency(accountInfo.balance)}
                                                >
                                                    ₹{(accountInfo.balance || 0).toLocaleString('en-IN', {
                                                        maximumFractionDigits: 0
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div
                                                className="position-absolute start-0 top-0 bottom-0 bg-primary rounded-start"
                                                style={{ width: '3px' }}
                                            />
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
                            </small>
                            <small className="fw-bold text-primary">
                                Total: {formatCurrency(
                                    activeType === 'bank' ? typeTotals.bank.total : typeTotals.cash.total
                                )}
                            </small>
                        </div>
                    </div>
                )}
            </div>

            {/* Enhanced Custom Styles */}
            <style>
                {`
                .btn-add-account {
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .btn-add-account:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(13, 110, 253, 0.3);
                }

                .btn-add-account:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
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
                    }

                    .btn-group .btn-outline-primary {
                        font-size: 0.7rem;
                        padding: 0.3rem 0.4rem;
                    }
                }

                @media (max-width: 576px) {
                    .sidebar-header .d-flex:last-child {
                        flex-direction: column;
                        gap: 0.75rem;
                        align-items: stretch;
                    }

                    .btn-add-account {
                        width: 100%;
                        text-align: center;
                    }
                }
                `}
            </style>
        </>
    );
}

export default BankSidebar;