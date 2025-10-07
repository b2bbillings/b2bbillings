import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMobileAlt,
  faArrowLeft,
  faPlus,
  faMinus,
  faHistory,
  faEdit,
  faShare,
  faDownload,
  faCopy,
  faCheck,
  faEye,
  faEyeSlash,
  faWallet,
  faChartLine,
  faSearch,
  faFilter,
  faSave,
  faTimes,
  faMoneyBillWave,
  faLink,
  faBell,
  faShieldAlt,
  faQrcode
} from '@fortawesome/free-solid-svg-icons';
import './UPIAccountDetail.css';

const UPIAccountDetail = ({ upi, transactions = [], onBack, onUpdate, onRecordTransaction, addToast, showBalance }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [localTransactions, setLocalTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('30days');
  const [copiedText, setCopiedText] = useState('');

  const [editFormData, setEditFormData] = useState({
    providerName: upi?.providerName || '',
    displayName: upi?.displayName || '',
    dailyLimit: upi?.dailyLimit || 50000,
    monthlyLimit: upi?.monthlyLimit || 1000000,
    contactNumber: upi?.contactNumber || '',
    email: upi?.email || '',
    notes: upi?.notes || '',
    autoCollect: upi?.autoCollect || true,
    sendNotifications: upi?.sendNotifications || true
  });



  // Sample UPI transactions
  useEffect(() => {
    const sampleTransactions = [
      {
        id: '1',
        type: 'credit',
        amount: 1500,
        description: 'Payment received from Customer',
        category: 'payment_received',
        reference: 'UPI001234',
        date: new Date('2024-10-01'),
        balance: upi?.balance || 0,
        payerVpa: 'customer@paytm',
        mode: 'UPI'
      },
      {
        id: '2',
        type: 'debit',
        amount: 500,
        description: 'Payment to Vendor',
        category: 'payment_sent',
        reference: 'UPI001235',
        date: new Date('2024-09-30'),
        balance: (upi?.balance || 0) - 1500,
        payeeVpa: 'vendor@gpay',
        mode: 'UPI'
      },
      {
        id: '3',
        type: 'credit',
        amount: 2000,
        description: 'QR Code Payment',
        category: 'qr_payment',
        reference: 'QR001236',
        date: new Date('2024-09-29'),
        balance: (upi?.balance || 0) - 2000,
        payerVpa: 'customer2@phonepe',
        mode: 'QR'
      }
    ];
    
    // Combine sample transactions with passed transactions
    const allTransactions = [
      ...transactions.map(tx => ({...tx, date: new Date(tx.timestamp || tx.date)})),
      ...sampleTransactions
    ].sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));

    setLocalTransactions(allTransactions);
    setFilteredTransactions(allTransactions);
  }, [upi, transactions]);

  // Filter transactions
  useEffect(() => {
    let filtered = localTransactions;

    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.payerVpa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.payeeVpa?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    const dateFilter = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
      '365days': 365
    };

    if (dateFilter[dateRange]) {
      const cutoffDate = new Date();
      cutoffDate.setDate(new Date().getDate() - dateFilter[dateRange]);
      filtered = filtered.filter(tx => tx.date >= cutoffDate);
    }

    setFilteredTransactions(filtered);
  }, [localTransactions, searchTerm, filterType, dateRange]);





  const handleCopyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      addToast?.(`${type} copied to clipboard!`, 'success');
      setTimeout(() => setCopiedText(''), 2000);
    } catch (error) {
      addToast?.('Failed to copy to clipboard', 'error');
    }
  };

  const handleEditSave = async () => {
    try {
      const updatedUPI = {
        ...upi,
        ...editFormData
      };
      
      onUpdate(updatedUPI);
      setEditMode(false);
      addToast?.('UPI account updated successfully!', 'success');
    } catch (error) {
      addToast?.('Error updating UPI account', 'error');
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
      <div className="upi-overview">
        <div className="balance-section">
          <div className="balance-card main-balance upi-card">
            <div className="balance-header">
              <FontAwesomeIcon icon={faWallet} className="balance-icon" />
              <h3>UPI Balance</h3>
            </div>
            <div className="balance-amount">
              {showBalance ? `₹${upi.balance.toLocaleString()}` : '₹****'}
            </div>

          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <FontAwesomeIcon icon={faPlus} className="stat-icon positive" />
              <div className="stat-content">
                <div className="stat-value">₹{stats.totalCredits.toLocaleString()}</div>
                <div className="stat-label">Money Received</div>
              </div>
            </div>
            
            <div className="stat-card">
              <FontAwesomeIcon icon={faMinus} className="stat-icon negative" />
              <div className="stat-content">
                <div className="stat-value">₹{stats.totalDebits.toLocaleString()}</div>
                <div className="stat-label">Money Sent</div>
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

        <div className="upi-details">
          <div className="details-header">
            <h3>UPI Account Details</h3>
            <button className="btn secondary" onClick={() => setEditMode(true)}>
              <FontAwesomeIcon icon={faEdit} />
              Edit Details
            </button>
          </div>
          
          <div className="details-grid">
            <div className="detail-item copyable">
              <label>UPI ID</label>
              <div className="copyable-content">
                <span>{upi.upiId}</span>
                <button 
                  className="copy-btn"
                  onClick={() => handleCopyToClipboard(upi.upiId, 'UPI ID')}
                >
                  <FontAwesomeIcon icon={copiedText === 'UPI ID' ? faCheck : faCopy} />
                </button>
              </div>
            </div>
            
            <div className="detail-item">
              <label>Provider</label>
              <span>{upi.providerName}</span>
            </div>
            
            <div className="detail-item">
              <label>Linked Bank Account</label>
              <span>
                {upi.linkedBankAccount?.bankName ? 
                  `${upi.linkedBankAccount.bankName} - ${upi.linkedBankAccount.accountNumber?.slice(-4) || '****'}` : 
                  'No linked account'
                }
              </span>
            </div>
            
            <div className="detail-item">
              <label>Daily Limit</label>
              <span>₹{upi.dailyLimit?.toLocaleString() || '50,000'}</span>
            </div>
            
            <div className="detail-item">
              <label>Monthly Limit</label>
              <span>₹{upi.monthlyLimit?.toLocaleString() || '10,00,000'}</span>
            </div>
            
            <div className="detail-item">
              <label>Status</label>
              <span className={`status ${upi.isActive ? 'active' : 'inactive'}`}>
                {upi.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="upi-features">
            <h4>Features & Settings</h4>
            <div className="features-grid">
              <div className="feature-item">
                <FontAwesomeIcon icon={faQrcode} className="feature-icon" />
                <div className="feature-content">
                  <span className="feature-name">QR Code Payments</span>
                  <span className="feature-status">Enabled</span>
                </div>
              </div>
              
              <div className="feature-item">
                <FontAwesomeIcon icon={faBell} className="feature-icon" />
                <div className="feature-content">
                  <span className="feature-name">Payment Notifications</span>
                  <span className="feature-status">
                    {upi.sendNotifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              <div className="feature-item">
                <FontAwesomeIcon icon={faMoneyBillWave} className="feature-icon" />
                <div className="feature-content">
                  <span className="feature-name">Auto Collect</span>
                  <span className="feature-status">
                    {upi.autoCollect ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              <div className="feature-item">
                <FontAwesomeIcon icon={faShieldAlt} className="feature-icon" />
                <div className="feature-content">
                  <span className="feature-name">Security</span>
                  <span className="feature-status">Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactions = () => (
    <div className="transactions-section">
      <div className="transactions-header">
        <h3>UPI Transaction History</h3>
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
              <option value="credit">Received</option>
              <option value="debit">Sent</option>
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
            <p>No UPI transactions found</p>
          </div>
        ) : (
          filteredTransactions.map(transaction => (
            <div key={transaction.id} className="transaction-item upi-transaction">
              <div className="transaction-icon">
                <FontAwesomeIcon 
                  icon={transaction.type === 'credit' ? faPlus : faMinus} 
                  className={transaction.type === 'credit' ? 'credit-icon' : 'debit-icon'}
                />
              </div>
              
              <div className="transaction-details">
                <div className="transaction-main">
                  <span className="transaction-description">{transaction.description}</span>
                  <span className="transaction-reference">
                    {transaction.mode} • Ref: {transaction.reference}
                  </span>
                </div>
                <div className="transaction-meta">
                  <span className="transaction-date">
                    {transaction.date.toLocaleDateString()}
                  </span>
                  <span className="transaction-vpa">
                    {transaction.type === 'credit' ? 
                      `From: ${transaction.payerVpa || 'N/A'}` : 
                      `To: ${transaction.payeeVpa || 'N/A'}`
                    }
                  </span>
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
            Edit UPI Account Details
          </h3>
          <button className="close-btn" onClick={() => setEditMode(false)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Provider Name</label>
              <input
                type="text"
                value={editFormData.providerName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, providerName: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={editFormData.displayName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Daily Limit (₹)</label>
              <input
                type="number"
                value={editFormData.dailyLimit}
                onChange={(e) => setEditFormData(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }))}
                min="1000"
                max="200000"
              />
            </div>

            <div className="form-group">
              <label>Monthly Limit (₹)</label>
              <input
                type="number"
                value={editFormData.monthlyLimit}
                onChange={(e) => setEditFormData(prev => ({ ...prev, monthlyLimit: parseInt(e.target.value) }))}
                min="10000"
                max="10000000"
              />
            </div>
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

          <div className="preferences-section">
            <h4>Preferences</h4>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editFormData.autoCollect}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, autoCollect: e.target.checked }))}
                />
                <span className="checkmark"></span>
                Enable auto-collect payments
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editFormData.sendNotifications}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, sendNotifications: e.target.checked }))}
                />
                <span className="checkmark"></span>
                Send payment notifications
              </label>
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
    <div className="upi-account-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back
        </button>
        
        <div className="account-info">
          <div className="account-title">
            <FontAwesomeIcon icon={faMobileAlt} className="title-icon upi-icon" />
            <div>
              <h1>{upi.providerName}</h1>
              <p>{upi.upiId}</p>
            </div>
          </div>
          
          <div className="account-status">
            <span className={`status-badge ${upi.isActive ? 'active' : 'inactive'}`}>
              {upi.isActive ? 'Active' : 'Inactive'}
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

export default UPIAccountDetail;