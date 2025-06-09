import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom'; // ✅ Added for URL params
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

    // Form data states
    const [accountFormData, setAccountFormData] = useState(
        bankAccountService.createAccountTemplate()
    );

    const [transactionFormData, setTransactionFormData] = useState({
        accountId: '',
        transactionType: 'deposit', // 'deposit' or 'withdrawal'
        amount: 0,
        description: '',
        reference: '',
        transactionDate: new Date().toISOString().split('T')[0],
        category: '',
        paymentMethod: 'bank_transfer'
    });

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

            const accounts = response.data.accounts || [];
            setBankAccounts(accounts);

            // Set first account as selected by default
            const typeAccounts = accounts.filter(acc => acc.type === activeType);
            if (typeAccounts.length > 0 && !selectedAccount) {
                setSelectedAccount(typeAccounts[0]);
            }

            console.log('✅ Bank accounts loaded:', accounts.length);

        } catch (error) {
            console.error('❌ Error loading bank accounts:', error);
            setError(error.response?.data?.message || 'Failed to load bank accounts');
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
    }, [effectiveCompanyId]); // Watch effectiveCompanyId instead of companyId

    // Update selected account when type changes
    useEffect(() => {
        const typeAccounts = bankAccounts.filter(account => account.type === activeType);
        if (typeAccounts.length > 0) {
            const currentSelected = typeAccounts.find(acc => acc._id === selectedAccount?._id);
            if (!currentSelected) {
                setSelectedAccount(typeAccounts[0]);
            }
        } else {
            setSelectedAccount(null);
        }
    }, [activeType, bankAccounts]);

    // Filter accounts based on active type
    const filteredAccounts = bankAccounts.filter(account => account.type === activeType);

    // Handle type change
    const handleTypeChange = (type) => {
        setActiveType(type);
        setSidebarSearchQuery('');
    };

    // Handle account selection
    const handleAccountSelect = (account) => {
        setSelectedAccount(account);
    };

    // Handle Add Account
    const handleAddAccount = (accountType) => {
        setEditingAccount(null);
        const template = bankAccountService.createAccountTemplate();
        setAccountFormData({
            ...template,
            type: accountType,
            accountType: accountType === 'cash' ? 'cash' : 'savings'
        });
        setShowAccountModal(true);
    };

    // Handle Edit Account
    const handleEditAccount = (account) => {
        setEditingAccount(account);
        setAccountFormData({
            ...account,
            asOfDate: account.asOfDate ? account.asOfDate.split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setShowAccountModal(true);
    };

    // Handle Add Transaction
    const handleAddTransaction = (account, type = null) => {
        setSelectedAccountForTransaction(account);
        setTransactionFormData({
            accountId: account._id || account.id,
            transactionType: 'deposit',
            amount: 0,
            description: '',
            reference: '',
            transactionDate: new Date().toISOString().split('T')[0],
            category: '',
            paymentMethod: account.type === 'cash' ? 'cash' : 'bank_transfer'
        });
        setShowTransactionModal(true);
    };

    // Handle Reconciliation
    const handleReconciliation = (account) => {
        setSelectedAccountForTransaction(account);
        setShowReconciliationModal(true);
    };

    // Modal handlers
    const handleCloseAccountModal = () => {
        setShowAccountModal(false);
        setEditingAccount(null);
        setAccountFormData(bankAccountService.createAccountTemplate());
    };

    const handleAccountInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setAccountFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTransactionInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTransactionFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Save account (connected to backend)
    const handleSaveAccount = async (savedAccount) => {
        try {
            console.log('💾 Account saved successfully:', savedAccount);

            // Reload accounts to get fresh data
            await loadBankAccounts();

            // Update selected account if it was being edited
            if (editingAccount && savedAccount._id === editingAccount._id) {
                setSelectedAccount(savedAccount);
            }

            return true;
        } catch (error) {
            console.error('❌ Error after saving account:', error);
            return false;
        }
    };

    // ✅ UPDATED: Save transaction using effectiveCompanyId
    const handleSaveTransaction = async (e) => {
        e.preventDefault();

        if (!selectedAccountForTransaction || !effectiveCompanyId) {
            alert('Missing account or company information');
            return false;
        }

        try {
            console.log('💰 Saving transaction:', transactionFormData);

            // Update account balance using backend service
            const response = await bankAccountService.updateAccountBalance(
                effectiveCompanyId, // ✅ Use effectiveCompanyId
                selectedAccountForTransaction._id || selectedAccountForTransaction.id,
                {
                    amount: parseFloat(transactionFormData.amount),
                    type: transactionFormData.transactionType === 'deposit' ? 'credit' : 'debit',
                    reason: transactionFormData.description || `${transactionFormData.transactionType} transaction`
                }
            );

            console.log('✅ Balance updated:', response.data);

            // Reload accounts to get updated balances
            await loadBankAccounts();

            // Close modal
            setShowTransactionModal(false);
            setSelectedAccountForTransaction(null);

            alert(`Transaction completed successfully! New balance: ${bankAccountService.formatCurrency(response.data.newBalance)}`);
            return true;

        } catch (error) {
            console.error('❌ Error saving transaction:', error);
            alert(error.response?.data?.message || 'Failed to save transaction');
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
                    effectiveCompanyId, // ✅ Use effectiveCompanyId
                    selectedAccount._id,
                    {
                        amount: saleData.totals.finalTotal,
                        type: 'credit',
                        reason: `Sale - ${saleData.customer?.name || 'Customer'} - ${saleData.invoiceNumber}`
                    }
                );

                // Reload accounts
                await loadBankAccounts();

                setCurrentView('bank');
                alert(`Sale ${saleData.invoiceNumber} saved successfully!`);
            } catch (error) {
                console.error('❌ Error updating balance for sale:', error);
                alert('Sale saved but failed to update account balance');
            }
        }
    };

    const handlePurchaseFormSave = async (purchaseData) => {
        console.log('💾 Saving purchase data from Bank component:', purchaseData);

        if (selectedAccount && effectiveCompanyId) {
            try {
                // Update account balance with purchase amount
                await bankAccountService.updateAccountBalance(
                    effectiveCompanyId, // ✅ Use effectiveCompanyId
                    selectedAccount._id,
                    {
                        amount: purchaseData.totals.finalTotal,
                        type: 'debit',
                        reason: `Purchase - ${purchaseData.supplier?.name || 'Supplier'} - ${purchaseData.purchaseNumber}`
                    }
                );

                // Reload accounts
                await loadBankAccounts();

                setCurrentView('bank');
                alert(`Purchase ${purchaseData.purchaseNumber} saved successfully!`);
            } catch (error) {
                console.error('❌ Error updating balance for purchase:', error);
                alert('Purchase saved but failed to update account balance');
            }
        }
    };

    // Header action handlers
    const handleMoreOptions = () => {
        console.log('More options clicked');
    };

    const handleSettings = () => {
        console.log('Settings clicked');
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

            {/* Error Alert */}
            {error && (
                <Alert variant="danger" className="m-3" dismissible onClose={() => setError('')}>
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

            {/* Modals */}
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
                transactions={transactions.filter(t => t.accountId === selectedAccountForTransaction?.id)}
                onReconcile={(reconciliationData) => {
                    console.log('Reconciliation data:', reconciliationData);
                    setShowReconciliationModal(false);
                }}
            />
        </div>
    );
}

export default Bank;