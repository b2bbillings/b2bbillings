import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUniversity,
  faPlus,
  faMobileAlt,
  faEye,
  faEyeSlash,
  faSearch,
  faFilter,
  faSort,
  faWallet,
  faMoneyBillWave,
  faExchangeAlt,
  faHistory,
  faEdit,
  faTrash,
  faCreditCard,
  faQrcode,
  faChartLine,
  faDownload,
  faUpload
} from '@fortawesome/free-solid-svg-icons';
import AddBankAccountForm from './AddBankAccountForm';
import AddUPIForm from './AddUPIForm';
import BankAccountDetail from './BankAccountDetail';
import UPIAccountDetail from './UPIAccountDetail';
import CashPaymentForm from './CashPaymentForm';
import newUPIDetailsService from '../../services/newUPIDetailsService';
import newBankDetailsService from '../../services/newBankDetailsService';
import { getSelectedCompany } from '../../utils/auth';
import './BankAccountDashboard.css';

const BankAccountDashboard = ({ currentUser, currentCompany, addToast }) => {
  const [activeView, setActiveView] = useState('overview');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedUPI, setSelectedUPI] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [upiAccounts, setUPIAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showBalance, setShowBalance] = useState(true);

  // Sample data - replace with API calls
  useEffect(() => {
    loadBankAccounts();
    loadUPIAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      const companyId = getSelectedCompany();
      if (!companyId) {
        console.warn('No company selected for loading bank accounts');
        return;
      }

      const result = await newBankDetailsService.getBankDetails(companyId, { active: 'true' });
      if (result.success) {
        setBankAccounts(result.data.map(account => ({
          id: account._id,
          _id: account._id,
          bankName: account.bankName,
          accountNumber: `****${account.accountNumber.slice(-4)}`,
          fullAccountNumber: account.accountNumber,
          accountHolderName: account.accountHolderName,
          ifscCode: account.ifscCode,
          branchName: account.branchName,
          balance: 0, // TODO: Get actual balance from transactions
          isActive: account.isActive,
          createdAt: new Date(account.createdAt)
        })));
      } else {
        console.error('Failed to load bank accounts:', result.message);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const loadUPIAccounts = async () => {
    try {
      const companyId = getSelectedCompany();
      if (!companyId) {
        console.warn('No company selected for loading UPI accounts');
        return;
      }

      const result = await newUPIDetailsService.getUPIDetails(companyId, { active: 'true' });
      if (result.success) {
        setUPIAccounts(result.data.map(upi => ({
          id: upi._id,
          _id: upi._id,
          upiId: upi.upiId,
          providerName: upi.providerName,
          displayName: upi.displayName,
          linkedBankAccount: upi.linkedBankAccount, // This is an object from API
          qrCodeData: upi.qrCodeData,
          qrCodeImage: upi.qrCodeImage,
          balance: 0, // TODO: Get actual balance from transactions
          isActive: upi.isActive,
          createdAt: new Date(upi.createdAt)
        })));
      } else {
        console.error('Failed to load UPI accounts:', result.message);
      }
    } catch (error) {
      console.error('Error loading UPI accounts:', error);
    }
  };

  const handleAddBankAccount = (accountData) => {
    // Add to current state immediately for better UX
    const newAccount = {
      id: accountData._id || Date.now().toString(),
      _id: accountData._id,
      bankName: accountData.bankName,
      accountNumber: `****${accountData.accountNumber?.slice(-4) || '****'}`,
      fullAccountNumber: accountData.accountNumber,
      accountHolderName: accountData.accountHolderName,
      ifscCode: accountData.ifscCode,
      branchName: accountData.branchName,
      balance: 0,
      isActive: accountData.isActive || true,
      createdAt: accountData.createdAt || new Date()
    };
    setBankAccounts([...bankAccounts, newAccount]);
    setActiveView('overview');
    addToast?.('Bank account added successfully!', 'success');
    
    // Optionally reload from API to ensure consistency
    // loadBankAccounts();
  };

  const handleAddUPI = (upiData) => {
    // Add to current state immediately for better UX
    const newUPI = {
      id: upiData._id || Date.now().toString(),
      _id: upiData._id,
      upiId: upiData.upiId,
      providerName: upiData.providerName,
      displayName: upiData.displayName,
      linkedBankAccount: upiData.linkedBankAccount, // This is already an object from API
      qrCodeData: upiData.qrCodeData,
      qrCodeImage: upiData.qrCodeImage,
      balance: 0,
      isActive: upiData.isActive || true,
      createdAt: upiData.createdAt || new Date()
    };
    setUPIAccounts([...upiAccounts, newUPI]);
    setActiveView('overview');
    addToast?.('UPI account added successfully!', 'success');
    
    // Optionally reload from API to ensure consistency
    // loadUPIAccounts();
  };

  const handleDeleteBankAccount = (accountId) => {
    if (window.confirm('Are you sure you want to delete this bank account? This action cannot be undone.')) {
      setBankAccounts(accounts => accounts.filter(acc => acc.id !== accountId));
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(null);
        setActiveView('overview');
      }
      addToast?.('Bank account deleted successfully!', 'success');
    }
  };

  const handleDeleteUPI = (upiId) => {
    if (window.confirm('Are you sure you want to delete this UPI account? This action cannot be undone.')) {
      setUPIAccounts(upis => upis.filter(upi => upi.id !== upiId));
      if (selectedUPI?.id === upiId) {
        setSelectedUPI(null);
        setActiveView('overview');
      }
      addToast?.('UPI account deleted successfully!', 'success');
    }
  };

  // Transaction recording function
  const recordTransaction = (transactionData) => {
    const newTransaction = {
      id: Date.now().toString(),
      timestamp: new Date(),
      companyId: currentCompany?.id,
      userId: currentUser?.id,
      ...transactionData
    };
    
    setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
    return newTransaction;
  };

  // Payment functions
  const handleCashPayment = (paymentData) => {
    try {
      // Record the transaction
      const transaction = recordTransaction({
        type: 'cash_payment',
        amount: parseFloat(paymentData.amount),
        description: paymentData.description || 'Cash Payment',
        category: 'payment',
        reference: paymentData.reference || `CASH${Date.now()}`,
        paymentMethod: 'cash',
        recipientName: paymentData.recipientName,
        recipientPhone: paymentData.recipientPhone,
        status: 'completed'
      });

      addToast?.(`Cash payment of ₹${paymentData.amount} recorded successfully!`, 'success');
      setActiveView('overview');
    } catch (error) {
      addToast?.('Error recording cash payment', 'error');
    }
  };





  const handleSelectBankAccount = (account) => {
    setSelectedAccount(account);
    setActiveView('bankDetail');
  };

  const handleSelectUPI = (upi) => {
    setSelectedUPI(upi);
    setActiveView('upiDetail');
  };

  const filteredBankAccounts = bankAccounts.filter(account => {
    const matchesSearch = account.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.accountNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'active' && account.isActive) ||
                         (filterType === 'inactive' && !account.isActive);
    return matchesSearch && matchesFilter;
  });

  const filteredUPIAccounts = upiAccounts.filter(upi => {
    const matchesSearch = upi.upiId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         upi.providerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'active' && upi.isActive) ||
                         (filterType === 'inactive' && !upi.isActive);
    return matchesSearch && matchesFilter;
  });

  const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0) +
                      upiAccounts.reduce((sum, upi) => sum + upi.balance, 0);

  // Calculate today's transactions
  const today = new Date();
  const todayTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.timestamp);
    return txDate.getDate() === today.getDate() &&
           txDate.getMonth() === today.getMonth() &&
           txDate.getFullYear() === today.getFullYear();
  });
  
  const todayTotal = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const renderSidebar = () => (
    <div className="bank-sidebar">
      <div className="sidebar-header">
        <FontAwesomeIcon icon={faUniversity} className="header-icon" />
        <h2>Bank Accounts</h2>
      </div>

      <div className="sidebar-stats">
        <div className="stat-card">
          <div className="stat-value">
            {showBalance ? `₹${totalBalance.toLocaleString()}` : '₹****'}
            <FontAwesomeIcon 
              icon={showBalance ? faEye : faEyeSlash} 
              className="toggle-balance"
              onClick={() => setShowBalance(!showBalance)}
            />
          </div>
          <div className="stat-label">Total Balance</div>
        </div>
      </div>

      <div className="sidebar-actions">
        <button 
          className={`sidebar-btn ${activeView === 'addBank' ? 'active' : ''}`}
          onClick={() => setActiveView('addBank')}
        >
          <FontAwesomeIcon icon={faPlus} />
          Add Bank Account
        </button>
        
        <button 
          className={`sidebar-btn ${activeView === 'addUPI' ? 'active' : ''}`}
          onClick={() => setActiveView('addUPI')}
        >
          <FontAwesomeIcon icon={faPlus} />
          Add UPI Details
        </button>

        <button 
          className={`sidebar-btn ${activeView === 'cashPayment' ? 'active' : ''}`}
          onClick={() => setActiveView('cashPayment')}
        >
          <FontAwesomeIcon icon={faMoneyBillWave} />
          Cash Payment
        </button>




      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="bank-overview">
      <div className="overview-header">
        <h1>Bank Account Management</h1>
        <div className="header-actions">
          <div className="search-bar">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Accounts</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="overview-stats">
        <div className="stat-card large">
          <FontAwesomeIcon icon={faWallet} className="stat-icon" />
          <div className="stat-content">
            <div className="stat-value">
              {showBalance ? `₹${totalBalance.toLocaleString()}` : '₹****'}
            </div>
            <div className="stat-label">Total Balance</div>
          </div>
        </div>
        
        <div className="stat-card">
          <FontAwesomeIcon icon={faUniversity} className="stat-icon" />
          <div className="stat-content">
            <div className="stat-value">{bankAccounts.length}</div>
            <div className="stat-label">Bank Accounts</div>
          </div>
        </div>
        
        <div className="stat-card">
          <FontAwesomeIcon icon={faMobileAlt} className="stat-icon" />
          <div className="stat-content">
            <div className="stat-value">{upiAccounts.length}</div>
            <div className="stat-label">UPI Accounts</div>
          </div>
        </div>
        
        <div className="stat-card">
          <FontAwesomeIcon icon={faChartLine} className="stat-icon" />
          <div className="stat-content">
            <div className="stat-value">₹{todayTotal.toLocaleString()}</div>
            <div className="stat-label">Today's Transactions ({todayTransactions.length})</div>
          </div>
        </div>
      </div>

      <div className="accounts-grid">
        <div className="accounts-section-overview">
          <h2>Recent Bank Accounts</h2>
          <div className="accounts-cards">
            {filteredBankAccounts.slice(0, 6).map(account => (
              <div 
                key={account.id}
                className="account-card"
                onClick={() => handleSelectBankAccount(account)}
              >
                <div className="card-header">
                  <FontAwesomeIcon icon={faUniversity} className="card-icon" />
                  <div className={`status-badge ${account.isActive ? 'active' : 'inactive'}`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="card-content">
                  <h3>{account.bankName}</h3>
                  <p className="account-number">{account.accountNumber}</p>
                  <p className="account-type">{account.accountType}</p>
                  <div className="card-balance">
                    {showBalance ? `₹${account.balance.toLocaleString()}` : '₹****'}
                  </div>
                </div>
                <div className="card-actions">
                  <button 
                    className="action-btn primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectBankAccount(account);
                    }}
                  >
                    <FontAwesomeIcon icon={faEye} />
                    View Details
                  </button>
                  <button 
                    className="action-btn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBankAccount(account.id);
                    }}
                    title="Delete Account"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="accounts-section-overview">
          <h2>Recent UPI Accounts</h2>
          <div className="accounts-cards">
            {filteredUPIAccounts.slice(0, 6).map(upi => (
              <div 
                key={upi.id}
                className="account-card upi-card"
                onClick={() => handleSelectUPI(upi)}
              >
                <div className="card-header">
                  <FontAwesomeIcon icon={faMobileAlt} className="card-icon" />
                  <div className={`status-badge ${upi.isActive ? 'active' : 'inactive'}`}>
                    {upi.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="card-content">
                  <h3>{upi.providerName}</h3>
                  <p className="account-number">{upi.upiId}</p>
                  <p className="linked-account">
                    {upi.linkedBankAccount?.bankName ? 
                      `${upi.linkedBankAccount.bankName} - ${upi.linkedBankAccount.accountNumber?.slice(-4) || '****'}` : 
                      'No linked account'
                    }
                  </p>
                  <div className="card-balance">
                    {showBalance ? `₹${upi.balance.toLocaleString()}` : '₹****'}
                  </div>
                </div>
                <div className="card-actions">
                  <button 
                    className="action-btn primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectUPI(upi);
                    }}
                  >
                    <FontAwesomeIcon icon={faEye} />
                    View Details
                  </button>
                  <button 
                    className="action-btn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUPI(upi.id);
                    }}
                    title="Delete UPI Account"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'addBank':
        return (
          <AddBankAccountForm 
            onSubmit={handleAddBankAccount}
            onCancel={() => setActiveView('overview')}
          />
        );
      case 'addUPI':
        return (
          <AddUPIForm 
            onSubmit={handleAddUPI}
            onCancel={() => setActiveView('overview')}
            bankAccounts={bankAccounts}
          />
        );
      case 'bankDetail':
        return (
          <BankAccountDetail 
            account={selectedAccount}
            transactions={transactions.filter(tx => tx.fromAccount === selectedAccount?.id || tx.toAccount === selectedAccount?.id)}
            onBack={() => setActiveView('overview')}
            onUpdate={(updatedAccount) => {
              setBankAccounts(accounts => 
                accounts.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)
              );
              setSelectedAccount(updatedAccount);
              addToast?.('Bank account updated successfully!', 'success');
            }}
            onRecordTransaction={recordTransaction}
            addToast={addToast}
            showBalance={showBalance}
          />
        );
      case 'upiDetail':
        return (
          <UPIAccountDetail 
            upi={selectedUPI}
            transactions={transactions.filter(tx => tx.fromUPI === selectedUPI?.id || tx.toUPI === selectedUPI?.id)}
            onBack={() => setActiveView('overview')}
            onUpdate={(updatedUPI) => {
              setUPIAccounts(upis => 
                upis.map(upi => upi.id === updatedUPI.id ? updatedUPI : upi)
              );
              setSelectedUPI(updatedUPI);
              addToast?.('UPI account updated successfully!', 'success');
            }}
            onRecordTransaction={recordTransaction}
            addToast={addToast}
            showBalance={showBalance}
          />
        );
      case 'cashPayment':
        return (
          <CashPaymentForm 
            onSubmit={handleCashPayment}
            onCancel={() => setActiveView('overview')}
            bankAccounts={bankAccounts}
          />
        );


      default:
        return renderOverview();
    }
  };

  return (
    <div className="bank-account-dashboard">
      {renderSidebar()}
      <div className="bank-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default BankAccountDashboard;