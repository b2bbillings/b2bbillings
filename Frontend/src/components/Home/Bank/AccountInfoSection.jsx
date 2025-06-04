import React, { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, Button, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faChevronDown } from '@fortawesome/free-solid-svg-icons';

function AccountInfoSection({ selectedAccount, onEditAccount, onAddTransaction }) {
    const [showTransactionDropdown, setShowTransactionDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Move all hooks to the top level, before any conditional rendering
    const handleMouseEnter = () => {
        setShowTransactionDropdown(true);
    };

    const handleMouseLeave = () => {
        setTimeout(() => {
            setShowTransactionDropdown(false);
        }, 150);
    };

    // Always call useEffect, but make the logic conditional inside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowTransactionDropdown(false);
            }
        };

        // Only add event listener if we have a dropdown ref
        if (dropdownRef.current) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, []);

    const handleTransactionType = (type) => {
        console.log(`Transaction type: ${type}`);
        onAddTransaction(selectedAccount, type);
        setShowTransactionDropdown(false);
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

    return (
        <>
            <Card className="mb-3 border-0 shadow-sm rounded-3 account-info-card bg-white overflow-visible">
                <Card.Body className="p-3">
                    <Row className="align-items-center">
                        {/* Left Side - Account Details */}
                        <Col md={8}>
                            <div className="mb-2">
                                <h6 className="fw-bold mb-2 text-dark small">{selectedAccount.accountName}</h6>
                                <div className="account-details">
                                    <Row className="g-2">
                                        <Col sm={6}>
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="text-muted fw-medium me-2 small" style={{minWidth: '80px', fontSize: '0.75rem'}}>
                                                    Bank Name:
                                                </span>
                                                <span className="text-dark fw-normal small" style={{fontSize: '0.75rem'}}>
                                                    {selectedAccount.bankName || '—'}
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="text-muted fw-medium me-2 small" style={{minWidth: '80px', fontSize: '0.75rem'}}>
                                                    IFSC Code:
                                                </span>
                                                <span className="text-dark fw-normal small" style={{fontSize: '0.75rem'}}>
                                                    {selectedAccount.ifscCode || '—'}
                                                </span>
                                            </div>
                                        </Col>
                                        <Col sm={6}>
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="text-muted fw-medium me-2 small" style={{minWidth: '90px', fontSize: '0.75rem'}}>
                                                    Account No:
                                                </span>
                                                <span className="text-dark fw-normal small" style={{fontSize: '0.75rem'}}>
                                                    {selectedAccount.accountNumber || '—'}
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center mb-2">
                                                <span className="text-muted fw-medium me-2 small" style={{minWidth: '90px', fontSize: '0.75rem'}}>
                                                    UPI ID:
                                                </span>
                                                <span className="text-dark fw-normal small" style={{fontSize: '0.75rem'}}>
                                                    {selectedAccount.upiId || '—'}
                                                </span>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </div>
                        </Col>

                        {/* Right Side - Balance and Actions */}
                        <Col md={4} className="text-end">
                            <div className={`h4 fw-bold mb-1 ${
                                selectedAccount.currentBalance < 0 ? 'text-danger' : 'text-success'
                            }`} style={{fontSize: '1.5rem'}}>
                                ₹{selectedAccount.currentBalance.toLocaleString('en-IN')}
                            </div>
                            <div className="small text-muted mb-3" style={{fontSize: '0.7rem'}}>Current Balance</div>

                            {/* Action Buttons */}
                            <div className="d-flex gap-2 justify-content-end align-items-center flex-wrap position-relative">
                                <div 
                                    ref={dropdownRef}
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                    className="position-relative dropdown-container"
                                >
                                    <Dropdown
                                        show={showTransactionDropdown}
                                        onToggle={setShowTransactionDropdown}
                                        className="position-static"
                                    >
                                        <Dropdown.Toggle
                                            variant="primary"
                                            size="sm"
                                            className="btn-transaction px-3 fw-semibold border-0 small"
                                            style={{ minWidth: '130px', fontSize: '0.75rem' }}
                                            onClick={() => setShowTransactionDropdown(!showTransactionDropdown)}
                                        >
                                            <span className="btn-text">Deposit / Withdraw</span>
                                            <FontAwesomeIcon icon={faChevronDown} className="ms-2" size="xs" />
                                        </Dropdown.Toggle>

                                        <Dropdown.Menu 
                                            align="end"
                                            className="border-0 shadow-lg rounded-3 dropdown-menu-custom"
                                            onMouseEnter={() => setShowTransactionDropdown(true)}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <Dropdown.Item 
                                                onClick={() => handleTransactionType('bank-to-cash')}
                                                className="py-2 px-3 border-0 dropdown-item-custom"
                                            >
                                                Bank to Cash Transfer
                                            </Dropdown.Item>
                                            <Dropdown.Item 
                                                onClick={() => handleTransactionType('cash-to-bank')}
                                                className="py-2 px-3 border-0 dropdown-item-custom"
                                            >
                                                Cash to Bank Transfer
                                            </Dropdown.Item>
                                            <Dropdown.Item 
                                                onClick={() => handleTransactionType('bank-to-bank')}
                                                className="py-2 px-3 border-0 dropdown-item-custom"
                                            >
                                                Bank to Bank Transfer
                                            </Dropdown.Item>
                                            <Dropdown.Divider className="my-1 border-secondary-subtle" />
                                            <Dropdown.Item 
                                                onClick={() => handleTransactionType('adjust-balance')}
                                                className="py-2 px-3 border-0 dropdown-item-custom"
                                            >
                                                Adjust Bank Balance
                                            </Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>

                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() => onEditAccount(selectedAccount)}
                                    className="btn-edit px-3 border-2 fw-medium small"
                                    style={{fontSize: '0.75rem'}}
                                >
                                    <FontAwesomeIcon icon={faEdit} className="me-1" size="xs" />
                                    <span>Edit</span>
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Custom Styles */}
            <style>
                {`
                .account-info-card {
                    transition: all 0.2s ease;
                    background: white;
                    border: 1px solid #e9ecef;
                }
                
                .account-info-card:hover {
                    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.1);
                    transform: translateY(-1px);
                }

                .dropdown-container {
                    z-index: 1000;
                }

                .dropdown-menu-custom {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    left: auto;
                    z-index: 1050;
                    min-width: 200px;
                    margin-top: 0.25rem;
                    background: white;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    font-size: 0.75rem;
                }

                .dropdown-item-custom {
                    font-size: 0.75rem !important;
                    transition: all 0.2s ease;
                    color: #495057;
                    padding: 0.5rem 0.75rem;
                }
                
                .dropdown-item-custom:hover,
                .dropdown-item-custom:focus {
                    background-color: #f8f9fa;
                    color: #0d6efd;
                    font-weight: 500;
                }

                .btn-transaction {
                    background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%) !important;
                    transition: all 0.2s ease;
                    border: none !important;
                    font-size: 0.75rem;
                    padding: 0.4rem 0.75rem;
                }
                
                .btn-transaction:hover,
                .btn-transaction:focus,
                .btn-transaction:active {
                    background: linear-gradient(135deg, #0a58ca 0%, #084298 100%) !important;
                    transform: translateY(-1px);
                    box-shadow: 0 0.25rem 0.75rem rgba(13, 110, 253, 0.3);
                }

                .btn-transaction:focus {
                    box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25) !important;
                }

                .btn-edit {
                    transition: all 0.2s ease;
                    font-size: 0.75rem;
                    padding: 0.4rem 0.75rem;
                    color: #6c757d;
                    border-color: #dee2e6;
                }

                .btn-edit:hover {
                    background-color: #6c757d !important;
                    border-color: #6c757d !important;
                    color: white !important;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .btn-text {
                    font-size: 0.75rem;
                }
                
                @media (max-width: 768px) {
                    .account-info-card .card-body {
                        padding: 1rem;
                    }

                    .dropdown-menu-custom {
                        min-width: 180px;
                        font-size: 0.7rem;
                    }

                    .dropdown-item-custom {
                        font-size: 0.7rem !important;
                        padding: 0.4rem 0.6rem;
                    }
                    
                    .d-flex.gap-2 {
                        gap: 0.5rem !important;
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .btn-transaction,
                    .btn-edit {
                        font-size: 0.7rem;
                        padding: 0.35rem 0.6rem;
                        width: 100%;
                    }

                    .btn-transaction {
                        min-width: auto;
                    }

                    .account-details .d-flex {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .account-details .d-flex span:first-child {
                        min-width: auto !important;
                        margin-bottom: 0.2rem;
                    }

                    .h4 {
                        font-size: 1.25rem !important;
                    }
                }

                @media (max-width: 576px) {
                    .btn-text {
                        font-size: 0.7rem;
                    }

                    .dropdown-menu-custom {
                        min-width: 160px;
                    }
                }
                `}
            </style>
        </>
    );
}

export default AccountInfoSection;