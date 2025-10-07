import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUniversity,
  faArrowLeft,
  faPlus,
  faMinus,
  faHistory,
  faEdit,
  faTrash,
  faEye,
  faEyeSlash,
  faDownload,
  faPrint,
  faShare,
  faMoneyBillWave,
  faWallet,
  faCreditCard,
  faCalendarAlt,
  faFilter,
  faSearch,
  faChartLine,
  faSave,
  faTimes,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import './BankAccountDetail.css';

const BankAccountDetail = ({ account, transactions = [], onBack, onUpdate, onRecordTransaction, addToast, showBalance }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [localTransactions, setLocalTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('30days');

  const [editFormData, setEditFormData] = useState({
    bankName: account?.bankName || '',
    accountHolderName: account?.accountHolderName || '',
    branchName: account?.branchName || '',
    contactNumber: account?.contactNumber || '',
    email: account?.email || '',
    notes: account?.notes || ''
  });



  // Combine passed transactions with local sample transactions
  useEffect(() => {
    const sampleTransactions = [
      {
        id: '1',
        type: 'credit',
        amount: 25000,
        description: 'Salary Credit',
        category: 'salary',
        reference: 'SAL001',
        date: new Date('2024-10-01'),
        balance: account?.balance || 0
      },
      {
        id: '2',
        type: 'debit',
        amount: 5000,
        description: 'ATM Withdrawal',
        category: 'withdrawal',
        reference: 'ATM001',
        date: new Date('2024-09-28'),
        balance: (account?.balance || 0) - 25000
      }
    ];

    // Combine sample transactions with passed transactions
    const allTransactions = [
      ...transactions.map(tx => ({...tx, date: new Date(tx.timestamp || tx.date)})),
      ...sampleTransactions
    ].sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));

    setLocalTransactions(allTransactions);
    setFilteredTransactions(allTransactions);
  }, [account, transactions]);

  // Filter transactions
  useEffect(() => {
    let filtered = localTransactions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.reference.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    // Filter by date range
    const now = new Date();
    const dateFilter = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
      '365days': 365
    };

    if (dateFilter[dateRange]) {
      const cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - dateFilter[dateRange]);
      filtered = filtered.filter(tx => tx.date >= cutoffDate);
    }

    setFilteredTransactions(filtered);
  }, [localTransactions, searchTerm, filterType, dateRange]);





  const handleEditSave = async () => {
    try {
      const updatedAccount = {
        ...account,
        ...editFormData
      };
      
      onUpdate(updatedAccount);
      setEditMode(false);
      addToast?.('Account details updated successfully!', 'success');
    } catch (error) {
      addToast?.('Error updating account', 'error');
    }
  };

  const getTransactionStats = () => {
    const totalCredits = filteredTransactions
      .filter(tx => tx.type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalDebits = filteredTransactions
      .filter(tx => tx.type === 'debit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return { totalCredits, totalDebits, netFlow: totalCredits - totalDebits };
  };

  const renderOverview = () => {
    const stats = getTransactionStats();

    return (
      <div className="account-overview">
        <div className="balance-section">
          <div className="balance-card main-balance">
            <div className="balance-header">
              <FontAwesomeIcon icon={faWallet} className="balance-icon" />
              <h3>Current Balance</h3>
            </div>
            <div className="balance-amount">
              {showBalance ? `₹${account.balance.toLocaleString()}` : '₹****'}
            </div>

          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <FontAwesomeIcon icon={faPlus} className="stat-icon positive" />
              <div className="stat-content">
                <div className="stat-value">₹{stats.totalCredits.toLocaleString()}</div>
                <div className="stat-label">Total Credits</div>
              </div>
            </div>
            
            <div className="stat-card">
              <FontAwesomeIcon icon={faMinus} className="stat-icon negative" />
              <div className="stat-content">
                <div className="stat-value">₹{stats.totalDebits.toLocaleString()}</div>
                <div className="stat-label">Total Debits</div>
              </div>
            </div>
            
            <div className="stat-card">
              <FontAwesomeIcon icon={faChartLine} className="stat-icon" />
              <div className="stat-content">
                <div className={`stat-value ${stats.netFlow >= 0 ? 'positive' : 'negative'}`}>
                  ₹{Math.abs(stats.netFlow).toLocaleString()}
                </div>
                <div className="stat-label">Net Flow</div>
              </div>
            </div>
          </div>
        </div>

        <div className="account-details">
          <div className="details-header">
            <h3>Account Details</h3>
            <button className="btn secondary" onClick={() => setEditMode(true)}>
              <FontAwesomeIcon icon={faEdit} />
              Edit Details
            </button>
          </div>
          
          <div className="details-grid">
            <div className="detail-item">
              <label>Bank Name</label>
              <span>{account.bankName}</span>
            </div>
            <div className="detail-item">
              <label>Account Number</label>
              <span>{account.fullAccountNumber || account.accountNumber}</span>
            </div>
            <div className="detail-item">
              <label>Account Type</label>
              <span>{account.accountType}</span>
            </div>
            <div className="detail-item">
              <label>IFSC Code</label>
              <span>{account.ifscCode}</span>
            </div>
            <div className="detail-item">
              <label>Branch Name</label>
              <span>{account.branchName}</span>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <span className={`status ${account.isActive ? 'active' : 'inactive'}`}>
                {account.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactions = () => (
    <div className="transactions-section">
      <div className="transactions-header">
        <h3>Transaction History</h3>
        <div className="header-actions">
          <div className="search-filter-bar">
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
            </select>
            
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="365days">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <div className="action-buttons">
            <button className="btn secondary">
              <FontAwesomeIcon icon={faDownload} />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="transactions-list">
        {filteredTransactions.length === 0 ? (
          <div className="no-transactions">
            <FontAwesomeIcon icon={faHistory} className="no-data-icon" />
            <p>No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map(transaction => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-icon">
                <FontAwesomeIcon 
                  icon={transaction.type === 'credit' ? faPlus : faMinus} 
                  className={transaction.type === 'credit' ? 'credit-icon' : 'debit-icon'}
                />
              </div>
              
              <div className="transaction-details">
                <div className="transaction-main">
                  <span className="transaction-description">{transaction.description}</span>
                  <span className="transaction-reference">Ref: {transaction.reference}</span>
                </div>
                <div className="transaction-meta">
                  <span className="transaction-date">
                    {transaction.date.toLocaleDateString()}
                  </span>
                  <span className="transaction-category">{transaction.category}</span>
                </div>
              </div>
              
              <div className="transaction-amount">
                <span className={`amount ${transaction.type === 'credit' ? 'positive' : 'negative'}`}>
                  {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                </span>
                <span className="balance">
                  Balance: ₹{transaction.balance.toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );





  const renderEditModal = () => (
    <div className="modal-overlay" onClick={() => setEditMode(false)}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <FontAwesomeIcon icon={faEdit} />
            Edit Account Details
          </h3>
          <button className="close-btn" onClick={() => setEditMode(false)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Bank Name</label>
              <input
                type="text"
                value={editFormData.bankName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, bankName: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Account Holder Name</label>
              <input
                type="text"
                value={editFormData.accountHolderName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Branch Name</label>
            <input
              type="text"
              value={editFormData.branchName}
              onChange={(e) => setEditFormData(prev => ({ ...prev, branchName: e.target.value }))}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contact Number</label>
              <input
                type="tel"
                value={editFormData.contactNumber}
                onChange={(e) => setEditFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={editFormData.notes}
              onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={() => setEditMode(false)}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={handleEditSave}>
            <FontAwesomeIcon icon={faSave} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bank-account-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back
        </button>
        
        <div className="account-info">
          <div className="account-title">
            <FontAwesomeIcon icon={faUniversity} className="title-icon" />
            <div>
              <h1>{account.bankName}</h1>
              <p>{account.accountNumber} • {account.accountType}</p>
            </div>
          </div>
          
          <div className="account-status">
            <span className={`status-badge ${account.isActive ? 'active' : 'inactive'}`}>
              {account.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="detail-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
      </div>

      <div className="detail-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'transactions' && renderTransactions()}
      </div>

      {editMode && renderEditModal()}
    </div>
  );
};

export default BankAccountDetail;