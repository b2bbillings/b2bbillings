import React from 'react';
import { ListGroup, Button, InputGroup, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUniversity, faMoneyBillWave, faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';

function BankSidebar({
    accounts = [],
    selectedAccount,
    onAccountSelect,
    onAddAccount,
    searchQuery,
    onSearchChange,
    activeType
}) {
    const filteredAccounts = accounts.filter(acc =>
        acc.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.accountNumber && acc.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <>
            <div className="bank-sidebar h-100 bg-light border-end mt-1">
                {/* Header Section */}
                <div className="sidebar-header p-3 bg-white border-bottom">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0 fw-bold text-dark small mt-3 ms-1">
                            {activeType === 'bank' ? 'Bank Accounts' : 'Cash Accounts'}
                        </h6>
                        <Button 
                            size="sm" 
                            variant="primary"
                            className="btn-add-account mt-3 me-1"
                            onClick={() => onAddAccount(activeType)}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-1" size="xs" />
                            <span className="small">Add Account</span>
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
                            style={{fontSize: '0.75rem'}}
                        />
                    </InputGroup>
                </div>

                {/* Accounts List */}
                <div className="accounts-list p-2" style={{maxHeight: 'calc(100vh - 140px)', overflowY: 'auto'}}>
                    {filteredAccounts.length === 0 ? (
                        <div className="text-center py-4">
                            <div className="mb-2" style={{fontSize: '1.5rem', opacity: 0.5}}>🏦</div>
                            <div className="text-muted small fw-medium">No accounts found</div>
                            <small className="text-muted" style={{fontSize: '0.7rem'}}>
                                {searchQuery ? 'Try different search terms' : 'Click Add Account to create one'}
                            </small>
                        </div>
                    ) : (
                        <ListGroup variant="flush">
                            {filteredAccounts.map(acc => (
                                <ListGroup.Item
                                    key={acc.id}
                                    action
                                    active={selectedAccount?.id === acc.id}
                                    onClick={() => onAccountSelect(acc)}
                                    className={`border-0 mb-2 rounded-2 account-item ${
                                        selectedAccount?.id === acc.id ? 'bg-primary bg-opacity-10 border-primary' : 'bg-white border'
                                    }`}
                                    style={{
                                        padding: '0.75rem',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center mb-1">
                                                <FontAwesomeIcon
                                                    icon={acc.type === 'bank' ? faUniversity : faMoneyBillWave}
                                                    className={`me-2 ${
                                                        selectedAccount?.id === acc.id ? 'text-primary' : 'text-muted'
                                                    }`}
                                                    size="sm"
                                                />
                                                <span className={`fw-semibold small ${
                                                    selectedAccount?.id === acc.id ? 'text-primary' : 'text-dark'
                                                }`}>
                                                    {acc.accountName}
                                                </span>
                                            </div>
                                            <div className={`${
                                                selectedAccount?.id === acc.id ? 'text-primary' : 'text-muted'
                                            }`} style={{fontSize: '0.7rem', fontFamily: 'monospace'}}>
                                                {acc.accountNumber}
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <span className={`fw-bold small ${
                                                acc.currentBalance < 0 ? 'text-danger' : 'text-success'
                                            }`}>
                                                ₹{acc.currentBalance.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedAccount?.id === acc.id && (
                                        <div 
                                            className="position-absolute start-0 top-0 bottom-0 bg-primary rounded-start"
                                            style={{width: '3px'}}
                                        />
                                    )}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                </div>
            </div>

            {/* Minimal Custom Styles */}
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

                .btn-add-account:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(13, 110, 253, 0.3);
                }

                .account-item:hover {
                    transform: translateX(2px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
                }

                .account-item.active {
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

                @media (max-width: 768px) {
                    .sidebar-header {
                        padding: 0.75rem !important;
                    }

                    .accounts-list {
                        padding: 0.5rem !important;
                    }

                    .account-item {
                        padding: 0.6rem !important;
                        margin-bottom: 0.5rem !important;
                    }

                    .btn-add-account {
                        font-size: 0.7rem;
                        padding: 0.3rem 0.6rem;
                    }
                }

                @media (max-width: 576px) {
                    .sidebar-header .d-flex:first-child {
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