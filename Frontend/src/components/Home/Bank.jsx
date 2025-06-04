import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './Bank.css';

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
    // Add current view state for form navigation
    const [currentView, setCurrentView] = useState('bank'); // 'bank', 'sale', 'purchase'
    
    // State management
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [activeType, setActiveType] = useState('bank'); // 'bank' or 'cash'
    const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
    const [transactionSearchQuery, setTransactionSearchQuery] = useState('');

    // Modal states
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showReconciliationModal, setShowReconciliationModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [selectedAccountForTransaction, setSelectedAccountForTransaction] = useState(null);

    // Form data states
    const [accountFormData, setAccountFormData] = useState({
        accountName: '',
        accountNumber: '',
        bankName: '',
        branchName: '',
        ifscCode: '',
        accountType: 'savings',
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
        type: 'bank', // 'bank' or 'cash'
        printUpiQrCodes: false,
        printBankDetails: false,
        upiId: '',
        accountHolderName: '',
        asOfDate: new Date().toISOString().split('T')[0]
    });

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

    // Load sample data
    useEffect(() => {
        const sampleAccounts = [
            {
                id: 1,
                accountName: 'Main Business Account',
                accountNumber: '1234567890',
                bankName: 'State Bank of India',
                branchName: 'Main Branch',
                ifscCode: 'SBIN0001234',
                accountType: 'current',
                openingBalance: 100000,
                currentBalance: 250000,
                type: 'bank',
                isActive: true,
                printUpiQrCodes: true,
                printBankDetails: true,
                upiId: 'business@sbi',
                accountHolderName: 'Business Account',
                asOfDate: '2025-01-01',
                createdAt: '2025-01-01T00:00:00.000Z'
            },
            {
                id: 2,
                accountName: 'Savings Account',
                accountNumber: '9876543210',
                bankName: 'HDFC Bank',
                branchName: 'Commercial Street',
                ifscCode: 'HDFC0001234',
                accountType: 'savings',
                openingBalance: 50000,
                currentBalance: 75000,
                type: 'bank',
                isActive: true,
                printUpiQrCodes: false,
                printBankDetails: true,
                upiId: '',
                accountHolderName: 'John Doe',
                asOfDate: '2025-01-01',
                createdAt: '2025-01-01T00:00:00.000Z'
            },
            {
                id: 3,
                accountName: 'Cash in Hand',
                accountNumber: 'CASH001',
                bankName: '',
                branchName: '',
                ifscCode: '',
                accountType: 'cash',
                openingBalance: 10000,
                currentBalance: 15000,
                type: 'cash',
                isActive: true,
                printUpiQrCodes: false,
                printBankDetails: false,
                upiId: '',
                accountHolderName: '',
                asOfDate: '2025-01-01',
                createdAt: '2025-01-01T00:00:00.000Z'
            },
            {
                id: 4,
                accountName: 'Petty Cash',
                accountNumber: 'CASH002',
                bankName: '',
                branchName: '',
                ifscCode: '',
                accountType: 'cash',
                openingBalance: 5000,
                currentBalance: 3500,
                type: 'cash',
                isActive: true,
                printUpiQrCodes: false,
                printBankDetails: false,
                upiId: '',
                accountHolderName: '',
                asOfDate: '2025-01-01',
                createdAt: '2025-01-01T00:00:00.000Z'
            }
        ];

        const sampleTransactions = [
            {
                id: 1,
                accountId: 1,
                transactionType: 'deposit',
                amount: 50000,
                description: 'Customer Payment - INV-2025-001',
                reference: 'TXN123456',
                transactionDate: '2025-06-01',
                category: 'Sales Receipt',
                paymentMethod: 'bank_transfer',
                balance: 250000,
                status: 'completed'
            },
            {
                id: 2,
                accountId: 1,
                transactionType: 'withdrawal',
                amount: 25000,
                description: 'Office Rent Payment',
                reference: 'CHQ001',
                transactionDate: '2025-05-31',
                category: 'Office Expenses',
                paymentMethod: 'cheque',
                balance: 200000,
                status: 'completed'
            },
            {
                id: 3,
                accountId: 2,
                transactionType: 'deposit',
                amount: 15000,
                description: 'Interest Credit',
                reference: 'INT2025',
                transactionDate: '2025-05-30',
                category: 'Interest Income',
                paymentMethod: 'bank_transfer',
                balance: 75000,
                status: 'completed'
            },
            {
                id: 4,
                accountId: 3,
                transactionType: 'withdrawal',
                amount: 2000,
                description: 'Office Supplies',
                reference: 'CASH001',
                transactionDate: '2025-06-02',
                category: 'Office Expenses',
                paymentMethod: 'cash',
                balance: 15000,
                status: 'completed'
            }
        ];

        setBankAccounts(sampleAccounts);
        setTransactions(sampleTransactions);

        // Set first account as selected by default
        const bankTypeAccounts = sampleAccounts.filter(acc => acc.type === activeType);
        if (bankTypeAccounts.length > 0) {
            setSelectedAccount(bankTypeAccounts[0]);
        }
    }, []);

    // Filter accounts based on active type
    const filteredAccounts = bankAccounts.filter(account => account.type === activeType);

    // Handle type change
    const handleTypeChange = (type) => {
        setActiveType(type);
        setSidebarSearchQuery('');
        // Reset selection when switching types
        const typeAccounts = bankAccounts.filter(account => account.type === type);
        if (typeAccounts.length > 0) {
            setSelectedAccount(typeAccounts[0]);
        } else {
            setSelectedAccount(null);
        }
    };

    // Handle account selection
    const handleAccountSelect = (account) => {
        setSelectedAccount(account);
    };

    // Handle Add Account
    const handleAddAccount = (accountType) => {
        setEditingAccount(null);
        setAccountFormData({
            accountName: '',
            accountNumber: '',
            bankName: '',
            branchName: '',
            ifscCode: '',
            accountType: accountType === 'cash' ? 'cash' : 'savings',
            openingBalance: 0,
            currentBalance: 0,
            isActive: true,
            type: accountType,
            printUpiQrCodes: false,
            printBankDetails: false,
            upiId: '',
            accountHolderName: '',
            asOfDate: new Date().toISOString().split('T')[0]
        });
        setShowAccountModal(true);
    };

    // Handle Edit Account
    const handleEditAccount = (account) => {
        setEditingAccount(account);
        setAccountFormData({
            ...account,
            // Ensure all fields have default values
            printUpiQrCodes: account.printUpiQrCodes || false,
            printBankDetails: account.printBankDetails || false,
            upiId: account.upiId || '',
            accountHolderName: account.accountHolderName || '',
            asOfDate: account.asOfDate || new Date().toISOString().split('T')[0]
        });
        setShowAccountModal(true);
    };

    // Handle Add Transaction
    const handleAddTransaction = (account, type = null) => {
        if (type === 'bank-to-cash' || type === 'cash-to-bank' || type === 'bank-to-bank' || type === 'adjust-balance') {
            // Handle bank transaction types
            setSelectedAccountForTransaction(account);
            setTransactionFormData({
                accountId: account.id,
                transactionType: 'deposit',
                amount: 0,
                description: '',
                reference: '',
                transactionDate: new Date().toISOString().split('T')[0],
                category: '',
                paymentMethod: account.type === 'cash' ? 'cash' : 'bank_transfer'
            });
            setShowTransactionModal(true);
        } else {
            // Regular transaction
            setSelectedAccountForTransaction(account);
            setTransactionFormData({
                accountId: account.id,
                transactionType: 'deposit',
                amount: 0,
                description: '',
                reference: '',
                transactionDate: new Date().toISOString().split('T')[0],
                category: '',
                paymentMethod: account.type === 'cash' ? 'cash' : 'bank_transfer'
            });
            setShowTransactionModal(true);
        }
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

    const handleSaveAccount = async (e, isSaveAndAdd = false) => {
        e.preventDefault();

        try {
            const accountData = {
                ...accountFormData,
                id: editingAccount ? editingAccount.id : Date.now(),
                currentBalance: editingAccount ? editingAccount.currentBalance : accountFormData.openingBalance,
                createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString()
            };

            if (editingAccount) {
                setBankAccounts(bankAccounts.map(account =>
                    account.id === editingAccount.id ? accountData : account
                ));
                // Update selected account if it's the one being edited
                if (selectedAccount?.id === editingAccount.id) {
                    setSelectedAccount(accountData);
                }
            } else {
                setBankAccounts(prev => [...prev, accountData]);
            }

            if (!isSaveAndAdd) {
                handleCloseAccountModal();
            } else {
                // Reset form for new account
                setAccountFormData({
                    ...accountFormData,
                    accountName: '',
                    accountNumber: '',
                    bankName: '',
                    branchName: '',
                    ifscCode: '',
                    openingBalance: 0,
                    currentBalance: 0,
                    printUpiQrCodes: false,
                    printBankDetails: false,
                    upiId: '',
                    accountHolderName: '',
                    asOfDate: new Date().toISOString().split('T')[0]
                });
            }
            return true;
        } catch (error) {
            console.error('Error saving account:', error);
            return false;
        }
    };

    const handleSaveTransaction = (e) => {
        e.preventDefault();

        try {
            const transactionData = {
                ...transactionFormData,
                id: Date.now(),
                status: 'completed',
                createdAt: new Date().toISOString()
            };

            // Calculate new balance
            const account = bankAccounts.find(acc => acc.id === transactionData.accountId);
            const newBalance = transactionData.transactionType === 'deposit'
                ? account.currentBalance + parseFloat(transactionData.amount)
                : account.currentBalance - parseFloat(transactionData.amount);

            transactionData.balance = newBalance;

            // Update account balance
            setBankAccounts(bankAccounts.map(acc =>
                acc.id === transactionData.accountId
                    ? { ...acc, currentBalance: newBalance }
                    : acc
            ));

            // Update selected account if it's the one being updated
            if (selectedAccount?.id === transactionData.accountId) {
                setSelectedAccount(prev => ({ ...prev, currentBalance: newBalance }));
            }

            // Add transaction
            setTransactions(prev => [...prev, transactionData]);

            setShowTransactionModal(false);
            setSelectedAccountForTransaction(null);
            return true;
        } catch (error) {
            console.error('Error saving transaction:', error);
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

    // Form save handlers
    const handleSaleFormSave = (saleData) => {
        console.log('💾 Saving sale data from Bank component:', saleData);
        
        // Add transaction to bank records
        const newTransaction = {
            id: Date.now(),
            accountId: selectedAccount?.id || 1, // Use selected account or default
            transactionType: 'deposit',
            amount: saleData.totals.finalTotal,
            description: `Sale - ${saleData.customer?.name || 'Customer'} - ${saleData.invoiceNumber}`,
            reference: saleData.invoiceNumber,
            transactionDate: new Date().toISOString().split('T')[0],
            category: 'Sales Receipt',
            paymentMethod: saleData.paymentDetails?.method || 'cash',
            balance: (selectedAccount?.currentBalance || 0) + saleData.totals.finalTotal,
            status: 'completed'
        };

        // Update transactions
        setTransactions(prev => [...prev, newTransaction]);

        // Update account balance if account is selected
        if (selectedAccount) {
            const newBalance = selectedAccount.currentBalance + saleData.totals.finalTotal;
            setBankAccounts(prev => prev.map(acc => 
                acc.id === selectedAccount.id 
                    ? { ...acc, currentBalance: newBalance }
                    : acc
            ));
            setSelectedAccount(prev => ({ ...prev, currentBalance: newBalance }));
        }

        // Go back to bank view
        setCurrentView('bank');
        alert(`Sale ${saleData.invoiceNumber} saved successfully!`);
    };

    const handlePurchaseFormSave = (purchaseData) => {
        console.log('💾 Saving purchase data from Bank component:', purchaseData);
        
        // Add transaction to bank records
        const newTransaction = {
            id: Date.now(),
            accountId: selectedAccount?.id || 1, // Use selected account or default
            transactionType: 'withdrawal',
            amount: purchaseData.totals.finalTotal,
            description: `Purchase - ${purchaseData.supplier?.name || 'Supplier'} - ${purchaseData.purchaseNumber}`,
            reference: purchaseData.purchaseNumber,
            transactionDate: new Date().toISOString().split('T')[0],
            category: 'Purchase Payment',
            paymentMethod: purchaseData.paymentDetails?.method || 'cash',
            balance: (selectedAccount?.currentBalance || 0) - purchaseData.totals.finalTotal,
            status: 'completed'
        };

        // Update transactions
        setTransactions(prev => [...prev, newTransaction]);

        // Update account balance if account is selected
        if (selectedAccount) {
            const newBalance = selectedAccount.currentBalance - purchaseData.totals.finalTotal;
            setBankAccounts(prev => prev.map(acc => 
                acc.id === selectedAccount.id 
                    ? { ...acc, currentBalance: newBalance }
                    : acc
            ));
            setSelectedAccount(prev => ({ ...prev, currentBalance: newBalance }));
        }

        // Go back to bank view
        setCurrentView('bank');
        alert(`Purchase ${purchaseData.purchaseNumber} saved successfully!`);
    };

    // Header action handlers
    const handleMoreOptions = () => {
        console.log('More options clicked');
        // Add your logic here
    };

    const handleSettings = () => {
        console.log('Settings clicked');
        // Add your logic here
    };

    // Render Sales Form View
    if (currentView === 'sale') {
        return (
            <div className="d-flex flex-column vh-100">
                {/* Header with Back Button */}
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

                {/* Sales Form */}
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
                {/* Header with Back Button */}
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

                {/* Purchase Form */}
                <PurchaseForm
                    onSave={handlePurchaseFormSave}
                    onCancel={handleBackToBank}
                />
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
                                    />
                                </div>

                                {/* Transaction History */}
                                <div className="flex-grow-1 px-3 pb-3">
                                    <TransactionHistory
                                        transactions={transactions}
                                        selectedAccount={selectedAccount}
                                        searchQuery={transactionSearchQuery}
                                        onSearchChange={setTransactionSearchQuery}
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
                    // Handle reconciliation logic here
                    console.log('Reconciliation data:', reconciliationData);
                    setShowReconciliationModal(false);
                }}
            />
        </div>
    );
}

export default Bank;