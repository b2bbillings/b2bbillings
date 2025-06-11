import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import './Bank.css';

// Import services
import bankAccountService from '../../services/bankAccountService';

// Import components
import SalesInvoicesHeader from './Sales/SalesInvoice/SalesInvoicesHeader';
import BankSidebar from './Bank/BankSidebar';
import AccountInfoSection from './Bank/AccountInfoSection';
import TransactionHistory from './Bank/TransactionHistory';
import BankAccountModal from './Bank/BankAccountModal';
import TransactionModal from './Bank/TransactionModal';
import ReconciliationModal from './Bank/ReconciliationModal';
import SalesForm from './Sales/SalesInvoice/SalesForm';
import PurchaseForm from './Purchases/PurchaseForm';

function Bank({ view = 'allAccounts', onNavigate }) {
    // ✅ Get company ID from URL params
    const { companyId } = useParams();

    // ✅ State for resolved company ID with fallbacks
    const [effectiveCompanyId, setEffectiveCompanyId] = useState(null);

    // Add current view state for form navigation
    const [currentView, setCurrentView] = useState('bank'); // 'bank', 'sale', 'purchase'

    // State management
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [activeType, setActiveType] = useState('bank'); // 'bank' or 'cash'
    const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
    const [transactionSearchQuery, setTransactionSearchQuery] = useState('');

    // Loading and error states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [accountsLoading, setAccountsLoading] = useState(false);

    // Modal states
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showReconciliationModal, setShowReconciliationModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [selectedAccountForTransaction, setSelectedAccountForTransaction] = useState(null);

    // ✅ ENHANCED: Form data states with proper initialization
    const [accountFormData, setAccountFormData] = useState({
        accountName: '',
        accountNumber: '',
        bankName: '',
        branchName: '',
        ifscCode: '',
        accountType: 'savings',
        accountHolderName: '',
        type: 'bank',
        openingBalance: 0,
        asOfDate: new Date().toISOString().split('T')[0],
        printUpiQrCodes: false,
        printBankDetails: false,
        upiId: '',
        isActive: true
    });

    const [transactionFormData, setTransactionFormData] = useState({
        accountId: '',
        transactionType: 'deposit', // 'deposit', 'withdraw', 'transfer', 'adjustment'
        amount: 0,
        description: '',
        reference: '',
        transactionDate: new Date().toISOString().split('T')[0],
        category: '',
        paymentMethod: 'bank_transfer',
        // ✅ Add additional fields for transfers
        fromAccountId: '',
        toAccountId: '',
        transferType: ''
    });

    // ✅ Success/Error alert state
    const [alert, setAlert] = useState({ show: false, variant: '', message: '' });

    // ✅ ENHANCED: Company ID resolution with fallbacks
    useEffect(() => {
        const resolveCompanyId = () => {
            // Try multiple sources for company ID (matching other components)
            const sources = [
                companyId, // From URL params (highest priority)
                localStorage.getItem('selectedCompanyId'),
                sessionStorage.getItem('companyId')
            ];

            // Try parsing currentCompany from localStorage
            try {
                const currentCompanyStr = localStorage.getItem('currentCompany');
                if (currentCompanyStr) {
                    const currentCompany = JSON.parse(currentCompanyStr);
                    const companyIdFromStorage = currentCompany.id || currentCompany._id;
                    if (companyIdFromStorage) {
                        sources.unshift(companyIdFromStorage); // Add to beginning
                    }
                }
            } catch (error) {
                console.warn('⚠️ Failed to parse currentCompany from localStorage:', error);
            }

            // Return the first valid company ID
            for (const source of sources) {
                if (source && source.trim() !== '') {
                    console.log('✅ Bank component using company ID:', source);
                    return source;
                }
            }

            console.warn('⚠️ No valid company ID found in any source');
            return null;
        };

        const resolvedCompanyId = resolveCompanyId();
        setEffectiveCompanyId(resolvedCompanyId);

        console.log('🏢 Bank component company ID resolution:', {
            fromURL: companyId,
            resolved: resolvedCompanyId,
            hasValidId: !!resolvedCompanyId
        });
    }, [companyId]);

    // ✅ UPDATED: Load bank accounts from backend using effectiveCompanyId
    const loadBankAccounts = async () => {
        if (!effectiveCompanyId) {
            setError('Please select a company first');
            setLoading(false);
            return;
        }

        try {
            setAccountsLoading(true);
            setError('');

            console.log('📊 Loading bank accounts for company:', effectiveCompanyId);

            const response = await bankAccountService.getBankAccounts(effectiveCompanyId, {
                type: 'all',
                active: 'true',
                page: 1,
                limit: 100
            });

            // ✅ FIXED: Handle response structure properly
            const accounts = response?.data?.accounts || response?.accounts || [];
            setBankAccounts(accounts);

            // Set first account as selected by default if none selected
            const typeAccounts = accounts.filter(acc => acc.type === activeType);
            if (typeAccounts.length > 0 && !selectedAccount) {
                setSelectedAccount(typeAccounts[0]);
            }

            console.log('✅ Bank accounts loaded:', accounts.length);

        } catch (error) {
            console.error('❌ Error loading bank accounts:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load bank accounts';
            setError(errorMessage);
        } finally {
            setLoading(false);
            setAccountsLoading(false);
        }
    };

    // ✅ UPDATED: Load account summary using effectiveCompanyId
    const loadAccountSummary = async () => {
        if (!effectiveCompanyId) return;

        try {
            const response = await bankAccountService.getAccountSummary(effectiveCompanyId);
            console.log('📊 Account summary:', response.data);
            // You can use this data for dashboard widgets
        } catch (error) {
            console.error('❌ Error loading account summary:', error);
            // Don't show error for summary - it's optional
        }
    };

    // ✅ UPDATED: Initial data loading using effectiveCompanyId
    useEffect(() => {
        if (effectiveCompanyId) {
            console.log('🔄 Loading bank data for company:', effectiveCompanyId);
            loadBankAccounts();
            loadAccountSummary();
        } else {
            setError('Company selection required. Please navigate to a valid company URL.');
            setLoading(false);
        }
    }, [effectiveCompanyId, activeType]); // ✅ Added activeType dependency

    // Update selected account when type changes
    useEffect(() => {
        if (bankAccounts.length > 0) {
            const typeAccounts = bankAccounts.filter(account => account.type === activeType);
            if (typeAccounts.length > 0) {
                const currentSelected = typeAccounts.find(acc => 
                    (acc._id || acc.id) === (selectedAccount?._id || selectedAccount?.id)
                );
                if (!currentSelected) {
                    setSelectedAccount(typeAccounts[0]);
                }
            } else {
                setSelectedAccount(null);
            }
        }
    }, [activeType, bankAccounts, selectedAccount]);

    // ✅ Auto-hide alerts after 5 seconds
    useEffect(() => {
        if (alert.show) {
            const timer = setTimeout(() => {
                setAlert({ show: false, variant: '', message: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [alert]);

    // Filter accounts based on active type and search query
    const filteredAccounts = bankAccounts.filter(account => {
        const matchesType = account.type === activeType;
        const matchesSearch = !sidebarSearchQuery || 
            account.accountName?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
            account.accountNumber?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
            account.bankName?.toLowerCase().includes(sidebarSearchQuery.toLowerCase());
        
        return matchesType && matchesSearch;
    });

    // Handle type change
    const handleTypeChange = (type) => {
        console.log('🔄 Changing account type to:', type);
        setActiveType(type);
        setSidebarSearchQuery('');
    };

    // Handle account selection
    const handleAccountSelect = (account) => {
        console.log('📋 Selecting account:', account.accountName);
        setSelectedAccount(account);
    };

    // ✅ ENHANCED: Handle Add Account with proper type setting
    const handleAddAccount = (accountType) => {
        console.log('➕ Adding new account of type:', accountType);

        setEditingAccount(null);
        setAccountFormData({
            accountName: '',
            accountNumber: '',
            bankName: '',
            branchName: '',
            ifscCode: '',
            accountType: accountType === 'cash' ? 'cash' : 'savings',
            accountHolderName: '',
            type: accountType,
            openingBalance: 0,
            asOfDate: new Date().toISOString().split('T')[0],
            printUpiQrCodes: false,
            printBankDetails: false,
            upiId: '',
            isActive: true
        });
        setShowAccountModal(true);
    };

    // ✅ ENHANCED: Handle Edit Account with proper data population
    const handleEditAccount = (account) => {
        console.log('✏️ Editing account:', account);

        setEditingAccount(account);

        // ✅ FIXED: Properly populate form data for editing with proper date formatting
        const editFormData = {
            accountName: account.accountName || '',
            accountNumber: account.accountNumber || '',
            bankName: account.bankName || '',
            branchName: account.branchName || '',
            ifscCode: account.ifscCode || '',
            accountType: account.accountType || 'savings',
            accountHolderName: account.accountHolderName || '',
            type: account.type || 'bank',
            openingBalance: parseFloat(account.openingBalance) || 0,
            asOfDate: account.asOfDate ? 
                new Date(account.asOfDate).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0],
            printUpiQrCodes: Boolean(account.printUpiQrCodes),
            printBankDetails: Boolean(account.printBankDetails),
            upiId: account.upiId || '',
            isActive: account.isActive !== false
        };

        console.log('📝 Setting form data for edit:', editFormData);
        setAccountFormData(editFormData);
        setShowAccountModal(true);
    };

    // ✅ FIXED: Handle Add Transaction with proper transaction type handling
    const handleAddTransaction = (account, transactionData = null) => {
        console.log('💰 Adding transaction for account:', account.accountName);
        console.log('📊 Transaction data received:', transactionData);

        setSelectedAccountForTransaction(account);

        // ✅ FIXED: Handle different transaction types properly
        let transactionType = 'deposit'; // default
        let paymentMethod = account.type === 'cash' ? 'cash' : 'bank_transfer';

        if (transactionData) {
            // If transactionData is an object with type property
            if (typeof transactionData === 'object' && transactionData.type) {
                switch (transactionData.type) {
                    case 'deposit':
                        transactionType = 'deposit';
                        break;
                    case 'withdraw':
                        transactionType = 'withdraw';
                        break;
                    case 'transfer-bank-to-cash':
                        transactionType = 'transfer-bank-to-cash';
                        paymentMethod = 'transfer_bank_to_cash';
                        break;
                    case 'transfer-cash-to-bank':
                        transactionType = 'transfer-cash-to-bank';
                        paymentMethod = 'transfer_cash_to_bank';
                        break;
                    case 'transfer-bank-to-bank':
                        transactionType = 'transfer-bank-to-bank';
                        paymentMethod = 'transfer_bank_to_bank';
                        break;
                    case 'adjust-balance':
                        transactionType = 'adjust-balance';
                        paymentMethod = 'balance_adjustment';
                        break;
                    default:
                        transactionType = 'deposit';
                }
            } else if (typeof transactionData === 'string') {
                // If transactionData is a simple string (backward compatibility)
                transactionType = transactionData;
            }
        }

        console.log('🔄 Processed transaction type:', transactionType);
        console.log('💳 Payment method:', paymentMethod);

        setTransactionFormData({
            accountId: account._id || account.id,
            transactionType: transactionType,
            amount: 0,
            description: '',
            reference: '',
            transactionDate: new Date().toISOString().split('T')[0],
            category: '',
            paymentMethod: paymentMethod,
            // ✅ Add additional fields for transfers
            fromAccountId: transactionType.includes('transfer') ? (account._id || account.id) : '',
            toAccountId: '',
            transferType: transactionData?.type || ''
        });

        setShowTransactionModal(true);
    };

    // Handle Reconciliation
    const handleReconciliation = (account) => {
        console.log('🔄 Starting reconciliation for account:', account.accountName);
        setSelectedAccountForTransaction(account);
        setShowReconciliationModal(true);
    };

    // ✅ ENHANCED: Modal handlers with proper cleanup
    const handleCloseAccountModal = () => {
        console.log('❌ Closing account modal');
        setShowAccountModal(false);
        setEditingAccount(null);
        setAccountFormData({
            accountName: '',
            accountNumber: '',
            bankName: '',
            branchName: '',
            ifscCode: '',
            accountType: 'savings',
            accountHolderName: '',
            type: activeType,
            openingBalance: 0,
            asOfDate: new Date().toISOString().split('T')[0],
            printUpiQrCodes: false,
            printBankDetails: false,
            upiId: '',
            isActive: true
        });
    };

    // ✅ ENHANCED: Handle account form input changes
    const handleAccountInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const inputValue = type === 'checkbox' ? checked : value;

        console.log(`📝 Account form field changed: ${name} = ${inputValue}`);

        setAccountFormData(prev => ({
            ...prev,
            [name]: inputValue
        }));
    };

    const handleTransactionInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTransactionFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // ✅ ENHANCED: Save account (connected to backend)
    const handleSaveAccount = async (savedAccount) => {
        try {
            console.log('💾 Account saved successfully:', savedAccount);

            // Show success message
            setAlert({
                show: true,
                variant: 'success',
                message: `Account ${editingAccount ? 'updated' : 'created'} successfully!`
            });

            // Reload accounts to get fresh data
            await loadBankAccounts();

            // ✅ FIXED: Update selected account properly
            if (editingAccount && savedAccount && 
                (savedAccount._id === editingAccount._id || savedAccount.id === editingAccount.id)) {
                setSelectedAccount(savedAccount);
            } else if (!editingAccount && savedAccount) {
                // Select the newly created account
                setSelectedAccount(savedAccount);
            }

            // Close modal
            handleCloseAccountModal();

            return true;
        } catch (error) {
            console.error('❌ Error after saving account:', error);
            setAlert({
                show: true,
                variant: 'danger',
                message: `Failed to ${editingAccount ? 'update' : 'create'} account: ${error.message}`
            });
            return false;
        }
    };

    // ✅ FIXED: Handle Save Transaction with proper transaction type handling
    const handleSaveTransaction = async (e) => {
        e.preventDefault();

        if (!selectedAccountForTransaction || !effectiveCompanyId) {
            setAlert({
                show: true,
                variant: 'danger',
                message: 'Missing account or company information'
            });
            return false;
        }

        try {
            console.log('💰 Saving transaction:', transactionFormData);

            let response;
            const amount = parseFloat(transactionFormData.amount);

            // ✅ ENHANCED: Better amount validation
            if (isNaN(amount) || amount <= 0) {
                setAlert({
                    show: true,
                    variant: 'warning',
                    message: 'Please enter a valid amount greater than 0'
                });
                return false;
            }

            // ✅ FIXED: Handle transaction types correctly
            const transactionType = transactionFormData.transactionType;
            console.log('🔄 Processing transaction type:', transactionType);

            switch (transactionType) {
                case 'deposit':
                    console.log('💰 Processing deposit transaction');
                    response = await bankAccountService.updateAccountBalance(
                        effectiveCompanyId,
                        selectedAccountForTransaction._id || selectedAccountForTransaction.id,
                        {
                            amount: amount,
                            type: 'credit', // ✅ Deposit = credit
                            reason: transactionFormData.description || 'Deposit transaction',
                            reference: transactionFormData.reference || null,
                            category: transactionFormData.category || 'general'
                        }
                    );
                    break;

                case 'withdraw':
                    console.log('💸 Processing withdraw transaction');
                    response = await bankAccountService.updateAccountBalance(
                        effectiveCompanyId,
                        selectedAccountForTransaction._id || selectedAccountForTransaction.id,
                        {
                            amount: amount,
                            type: 'debit', // ✅ Withdrawal = debit
                            reason: transactionFormData.description || 'Withdrawal transaction',
                            reference: transactionFormData.reference || null,
                            category: transactionFormData.category || 'general'
                        }
                    );
                    break;

                case 'adjust-balance':
                    console.log('⚖️ Processing balance adjustment');
                    response = await bankAccountService.adjustBalance(
                        effectiveCompanyId,
                        selectedAccountForTransaction._id || selectedAccountForTransaction.id,
                        {
                            adjustmentAmount: amount, // Positive adjustment
                            reason: transactionFormData.description || 'Balance adjustment',
                            reference: transactionFormData.reference || null,
                            category: 'adjustment'
                        }
                    );
                    break;

                // ✅ FIXED: Handle transfer types from dropdown
                case 'transfer-bank-to-cash':
                case 'transfer-cash-to-bank':
                case 'transfer-bank-to-bank':
                    console.log('🔄 Processing transfer type:', transactionType);
                    
                    // For now, treat as balance update on the source account
                    const transferBalanceType = 'debit'; // Money going out of source account
                    response = await bankAccountService.updateAccountBalance(
                        effectiveCompanyId,
                        selectedAccountForTransaction._id || selectedAccountForTransaction.id,
                        {
                            amount: amount,
                            type: transferBalanceType,
                            reason: transactionFormData.description || `${transactionType.replace(/-/g, ' ')} transaction`,
                            reference: transactionFormData.reference || null,
                            category: 'transfer'
                        }
                    );
                    break;

                default:
                    console.error('❌ Unknown transaction type:', transactionType);
                    setAlert({
                        show: true,
                        variant: 'danger',
                        message: `Unknown transaction type: ${transactionType}`
                    });
                    return false;
            }

            // ✅ FIXED: Handle response properly
            console.log('✅ Transaction response:', response);

            // Extract new balance from response
            const newBalance = response?.data?.data?.newBalance || 
                              response?.data?.newBalance || 
                              'Updated';

            // Show success message
            const transactionTypeNames = {
                'deposit': 'Deposit',
                'withdraw': 'Withdrawal',
                'adjust-balance': 'Balance Adjustment',
                'transfer-bank-to-cash': 'Bank to Cash Transfer',
                'transfer-cash-to-bank': 'Cash to Bank Transfer',
                'transfer-bank-to-bank': 'Bank to Bank Transfer'
            };

            const transactionName = transactionTypeNames[transactionType] || 'Transaction';

            setAlert({
                show: true,
                variant: 'success',
                message: `${transactionName} completed successfully! New balance: ${
                    typeof newBalance === 'number' ? 
                    bankAccountService.formatCurrency(newBalance) : 
                    'Updated'
                }`
            });

            // Reload accounts to get updated balances
            await loadBankAccounts();

            // Close modal and reset
            setShowTransactionModal(false);
            setSelectedAccountForTransaction(null);
            setTransactionFormData({
                accountId: '',
                transactionType: 'deposit',
                amount: 0,
                description: '',
                reference: '',
                transactionDate: new Date().toISOString().split('T')[0],
                category: '',
                paymentMethod: 'bank_transfer',
                fromAccountId: '',
                toAccountId: '',
                transferType: ''
            });

            return true;

        } catch (error) {
            console.error('❌ Error saving transaction:', error);
            
            // ✅ ENHANCED: Better error handling
            let errorMessage = 'Failed to save transaction';
            
            if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            setAlert({
                show: true,
                variant: 'danger',
                message: `Transaction failed: ${errorMessage}`
            });
            return false;
        }
    };

    // Navigation handlers for Sales/Purchase forms
    const handleAddSale = () => {
        setCurrentView('sale');
    };

    const handleAddPurchase = () => {
        setCurrentView('purchase');
    };

    const handleBackToBank = () => {
        setCurrentView('bank');
    };

    // ✅ UPDATED: Form save handlers using effectiveCompanyId
    const handleSaleFormSave = async (saleData) => {
        console.log('💾 Saving sale data from Bank component:', saleData);

        if (selectedAccount && effectiveCompanyId) {
            try {
                // Update account balance with sale amount
                await bankAccountService.updateAccountBalance(
                    effectiveCompanyId,
                    selectedAccount._id || selectedAccount.id,
                    {
                        amount: saleData.totals.finalTotal,
                        type: 'credit',
                        reason: `Sale - ${saleData.customer?.name || 'Customer'} - ${saleData.invoiceNumber}`
                    }
                );

                // Reload accounts
                await loadBankAccounts();

                setCurrentView('bank');
                setAlert({
                    show: true,
                    variant: 'success',
                    message: `Sale ${saleData.invoiceNumber} saved successfully!`
                });
            } catch (error) {
                console.error('❌ Error updating balance for sale:', error);
                setAlert({
                    show: true,
                    variant: 'warning',
                    message: 'Sale saved but failed to update account balance'
                });
            }
        }
    };

    const handlePurchaseFormSave = async (purchaseData) => {
        console.log('💾 Saving purchase data from Bank component:', purchaseData);

        if (selectedAccount && effectiveCompanyId) {
            try {
                // Update account balance with purchase amount
                await bankAccountService.updateAccountBalance(
                    effectiveCompanyId,
                    selectedAccount._id || selectedAccount.id,
                    {
                        amount: purchaseData.totals.finalTotal,
                        type: 'debit',
                        reason: `Purchase - ${purchaseData.supplier?.name || 'Supplier'} - ${purchaseData.purchaseNumber}`
                    }
                );

                // Reload accounts
                await loadBankAccounts();

                setCurrentView('bank');
                setAlert({
                    show: true,
                    variant: 'success',
                    message: `Purchase ${purchaseData.purchaseNumber} saved successfully!`
                });
            } catch (error) {
                console.error('❌ Error updating balance for purchase:', error);
                setAlert({
                    show: true,
                    variant: 'warning',
                    message: 'Purchase saved but failed to update account balance'
                });
            }
        }
    };

    // Header action handlers
    const handleMoreOptions = () => {
        console.log('⚙️ More options clicked');
        // You can implement export, bulk operations, etc.
    };

    const handleSettings = () => {
        console.log('⚙️ Settings clicked');
        // You can implement bank settings, preferences, etc.
    };

    // ✅ ENHANCED: Show loading state while resolving company ID
    if (!effectiveCompanyId && !error) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading company data...</p>
                    <small className="text-muted">
                        Company ID from URL: {companyId || 'Not found'}
                    </small>
                </div>
            </div>
        );
    }

    // Render Sales Form View
    if (currentView === 'sale') {
        return (
            <div className="d-flex flex-column vh-100">
                <div className="sales-form-header bg-white border-bottom">
                    <Container fluid className="px-4">
                        <Row className="align-items-center py-3">
                            <Col>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToBank}
                                    className="me-3"
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    Back to Bank
                                </Button>
                                <span className="page-title-text fw-bold">Create New Sale</span>
                            </Col>
                        </Row>
                    </Container>
                </div>

                <SalesForm
                    onSave={handleSaleFormSave}
                    onCancel={handleBackToBank}
                />
            </div>
        );
    }

    // Render Purchase Form View
    if (currentView === 'purchase') {
        return (
            <div className="d-flex flex-column vh-100">
                <div className="sales-form-header bg-white border-bottom">
                    <Container fluid className="px-4">
                        <Row className="align-items-center py-3">
                            <Col>
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToBank}
                                    className="me-3"
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                    Back to Bank
                                </Button>
                                <span className="page-title-text fw-bold">Create New Purchase</span>
                            </Col>
                        </Row>
                    </Container>
                </div>

                <PurchaseForm
                    onSave={handlePurchaseFormSave}
                    onCancel={handleBackToBank}
                />
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading bank accounts...</p>
                </div>
            </div>
        );
    }

    // ✅ ENHANCED: Better error state for missing company
    if (error && !effectiveCompanyId) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <Alert variant="warning" className="text-center">
                    <Alert.Heading>Company Selection Required</Alert.Heading>
                    <p>{error}</p>
                    <div className="mt-3">
                        <small className="text-muted d-block">
                            Expected URL format: <code>/companies/[companyId]/bank-accounts</code>
                        </small>
                        <small className="text-muted d-block">
                            Current company ID: {companyId || 'Missing from URL'}
                        </small>
                    </div>
                    <Button
                        variant="primary"
                        className="mt-3"
                        onClick={() => window.location.href = '/companies'}
                    >
                        Go to Companies
                    </Button>
                </Alert>
            </div>
        );
    }

    // Render Bank View (Default)
    return (
        <div className="d-flex flex-column vh-100">
            {/* Header */}
            <SalesInvoicesHeader
                searchTerm={transactionSearchQuery}
                onSearchChange={(e) => setTransactionSearchQuery(e.target.value)}
                onAddSale={handleAddSale}
                onAddPurchase={handleAddPurchase}
                onMoreOptions={handleMoreOptions}
                onSettings={handleSettings}
            />

            {/* ✅ ENHANCED: Success/Error Alerts */}
            {alert.show && (
                <Alert
                    variant={alert.variant}
                    className="m-3 mb-0"
                    dismissible
                    onClose={() => setAlert({ show: false, variant: '', message: '' })}
                >
                    {alert.message}
                </Alert>
            )}

            {/* Error Alert */}
            {error && !alert.show && (
                <Alert variant="danger" className="m-3 mb-0" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Main Content */}
            <div className="flex-grow-1 overflow-hidden">
                <Container fluid className="h-100 p-0">
                    <Row className="h-100 g-0">
                        {/* Left Sidebar */}
                        <Col md={4} lg={3}>
                            <BankSidebar
                                accounts={filteredAccounts}
                                selectedAccount={selectedAccount}
                                onAccountSelect={handleAccountSelect}
                                onAddAccount={handleAddAccount}
                                searchQuery={sidebarSearchQuery}
                                onSearchChange={setSidebarSearchQuery}
                                activeType={activeType}
                                onTypeChange={handleTypeChange}
                                loading={accountsLoading}
                            />
                        </Col>

                        {/* Right Content */}
                        <Col md={8} lg={9}>
                            <div className="h-100 d-flex flex-column">
                                {/* Account Info Section */}
                                <div className="flex-shrink-0 p-3">
                                    <AccountInfoSection
                                        selectedAccount={selectedAccount}
                                        onEditAccount={handleEditAccount}
                                        onAddTransaction={handleAddTransaction}
                                        onReconciliation={handleReconciliation}
                                        formatCurrency={bankAccountService.formatCurrency}
                                    />
                                </div>

                                {/* Transaction History */}
                                <div className="flex-grow-1 px-3 pb-3">
                                    <TransactionHistory
                                        transactions={transactions}
                                        selectedAccount={selectedAccount}
                                        searchQuery={transactionSearchQuery}
                                        onSearchChange={setTransactionSearchQuery}
                                        formatCurrency={bankAccountService.formatCurrency}
                                    />
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* ✅ ENHANCED: Modals with proper props */}
            <BankAccountModal
                show={showAccountModal}
                onHide={handleCloseAccountModal}
                editingAccount={editingAccount}
                formData={accountFormData}
                onInputChange={handleAccountInputChange}
                onSaveAccount={handleSaveAccount}
            />

            <TransactionModal
                show={showTransactionModal}
                onHide={() => setShowTransactionModal(false)}
                account={selectedAccountForTransaction}
                formData={transactionFormData}
                onInputChange={handleTransactionInputChange}
                onSaveTransaction={handleSaveTransaction}
            />

            <ReconciliationModal
                show={showReconciliationModal}
                onHide={() => setShowReconciliationModal(false)}
                account={selectedAccountForTransaction}
                transactions={transactions.filter(t => 
                    (t.accountId || t.account_id) === (selectedAccountForTransaction?.id || selectedAccountForTransaction?._id)
                )}
                onReconcile={(reconciliationData) => {
                    console.log('🔄 Reconciliation data:', reconciliationData);
                    setShowReconciliationModal(false);
                }}
            />
        </div>
    );
}

export default Bank;