import React, { useState, useEffect } from 'react';
import './BankAccountDashboard.css';
import newBankDetailsService from '../../../services/newBankDetailsService';
import { getSelectedCompany } from '../../../utils/auth';

const BankAccountDashboard = ({ addToast }) => {
  const [activeView, setActiveView] = useState('overview');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    underGroup: 'Bank Accounts',
    accountDisplayName: '',
    shortName: '',
    email: '',
    mobileNo: '',
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountType: 'Savings',
    ifscCode: '',
    bankName: '',
    branchName: '',
    branchAddress: '',
    openingBalance: '',
    balanceType: 'Dr',
    status: 'Active',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const bankList = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank',
    'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Bank of India', 'IDBI Bank',
    'Central Bank of India', 'IndusInd Bank', 'Yes Bank', 'Kotak Mahindra Bank', 'Federal Bank',
    'South Indian Bank', 'Karnataka Bank', 'Dhanlaxmi Bank', 'City Union Bank', 'Others'
  ];

  const accountTypes = [
    'Savings', 'Current', 'Fixed Deposit', 'Recurring Deposit', 'NRI Account', 'Joint Account'
  ];

  // Load bank accounts on mount
  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
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
          accountType: account.accountType,
          ifscCode: account.ifscCode,
          branchName: account.branchName,
          balance: 0,
          isActive: account.isActive,
          createdAt: new Date(account.createdAt)
        })));
      } else {
        console.error('Failed to load bank accounts:', result.message);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      addToast?.('Failed to load bank accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.bankName.trim()) newErrors.bankName = 'Bank name is required';
    if (!formData.accountDisplayName.trim()) newErrors.accountDisplayName = 'Account display name is required';
    if (!formData.accountHolderName.trim()) newErrors.accountHolderName = 'Account holder name is required';
    if (!formData.accountNumber.trim()) newErrors.accountNumber = 'Account number is required';
    if (formData.accountNumber.length < 9 || formData.accountNumber.length > 18) {
      newErrors.accountNumber = 'Account number must be between 9-18 digits';
    }
    if (!formData.confirmAccountNumber.trim()) newErrors.confirmAccountNumber = 'Please confirm account number';
    if (formData.accountNumber !== formData.confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }
    if (!formData.ifscCode.trim()) newErrors.ifscCode = 'IFSC code is required';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase())) {
      newErrors.ifscCode = 'Invalid IFSC code format';
    }
    if (!formData.branchName.trim()) newErrors.branchName = 'Branch name is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      addToast?.('Please fix the errors in the form', 'error');
      return;
    }

    setLoading(true);
    try {
      const companyId = getSelectedCompany();
      
      if (!companyId) {
        throw new Error('Please select a company first');
      }

      const bankDetailData = {
        bankName: formData.bankName,
        accountNumber: formData.accountNumber.trim(),
        accountHolderName: formData.accountHolderName,
        accountType: formData.accountType,
        ifscCode: formData.ifscCode.toUpperCase(),
        branchName: formData.branchName,
        branchAddress: formData.branchAddress,
        notes: formData.notes
      };

      const result = await newBankDetailsService.createBankDetail(companyId, bankDetailData);
      
      if (result.success) {
        addToast?.('Bank account created successfully!', 'success');
        await loadBankAccounts();
        setActiveView('overview');
        resetForm();
      } else {
        throw new Error(result.message || 'Failed to create bank account');
      }
    } catch (error) {
      console.error('Error creating bank account:', error);
      addToast?.(error.message || 'Failed to create bank account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      underGroup: 'Bank Accounts',
      accountDisplayName: '',
      shortName: '',
      email: '',
      mobileNo: '',
      accountHolderName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      accountType: 'Savings',
      ifscCode: '',
      bankName: '',
      branchName: '',
      branchAddress: '',
      openingBalance: '',
      balanceType: 'Dr',
      status: 'Active',
      notes: ''
    });
    setErrors({});
  };

  const handleCancel = () => {
    setActiveView('overview');
    resetForm();
  };

  const handleDeleteAccount = async (accountId) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      try {
        setLoading(true);
        const companyId = getSelectedCompany();
        const result = await newBankDetailsService.deleteBankDetail(companyId, accountId);
        
        if (result.success) {
          addToast?.('Bank account deleted successfully', 'success');
          await loadBankAccounts();
        } else {
          throw new Error(result.message || 'Failed to delete account');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        addToast?.('Failed to delete account', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const renderOverview = () => (
    <div className="bank-overview-container">
      <div className="overview-header">
        <div>
          <h1 className="page-title">Bank Accounts</h1>
          <p className="page-subtitle">Manage your company's bank accounts</p>
        </div>
      </div>

      <div className="overview-stats">
        <div className="stat-card-modern">
          <div className="stat-icon-wrapper">
            <svg className="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Balance</div>
            <div className="stat-value">₹{totalBalance.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-icon-wrapper accent">
            <svg className="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Accounts</div>
            <div className="stat-value">{bankAccounts.length}</div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-icon-wrapper success">
            <svg className="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Active Accounts</div>
            <div className="stat-value">{bankAccounts.filter(acc => acc.isActive).length}</div>
          </div>
        </div>
      </div>

      <div className="add-account-section">
        <button onClick={() => setActiveView('addBank')} className="add-account-btn">
          <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Bank Account
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading accounts...</p>
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3>No bank accounts yet</h3>
          <p>Add your first bank account to get started</p>
        </div>
      ) : (
        <div className="accounts-list">
          {bankAccounts.map(account => (
            <div key={account.id} className="account-card">
              <div className="account-card-content">
                <div className="account-main-info">
                  <div className="account-header">
                    <h3 className="account-bank-name">{account.bankName}</h3>
                    <span className={`status-badge ${account.isActive ? 'active' : 'inactive'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="account-details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Account Holder:</span>
                      <span className="detail-value">{account.accountHolderName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Account Number:</span>
                      <span className="detail-value">{account.accountNumber}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Account Type:</span>
                      <span className="detail-value">{account.accountType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">IFSC Code:</span>
                      <span className="detail-value">{account.ifscCode}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Branch:</span>
                      <span className="detail-value">{account.branchName}</span>
                    </div>
                  </div>
                </div>
                <div className="account-actions">
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDeleteAccount(account.id)}
                    title="Delete Account"
                  >
                    <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAddBankForm = () => (
    <div className="form-page">
      <div className="form-page-container">
        <div className="form-page-header">
          <button onClick={handleCancel} className="back-button">
            <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="form-title">Create Bank Account</h1>
          </div>
        </div>

        <div className="form-card">
          <div className="form-body">
            {/* Account Display Name & Short Name */}
            <div className="form-row-grid">
              <div className="form-row">
                <label className="form-label">
                  Account Display Name<span className="required">*</span>
                </label>
                <div className="form-input-wrapper">
                  <input
                    type="text"
                    name="accountDisplayName"
                    value={formData.accountDisplayName}
                    onChange={handleInputChange}
                    placeholder="e.g., SBI Main Account"
                    className={`form-input ${errors.accountDisplayName ? 'error' : ''}`}
                  />
                  {errors.accountDisplayName && <span className="error-text">{errors.accountDisplayName}</span>}
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Short/Alias Name</label>
                <div className="form-input-wrapper">
                  <input
                    type="text"
                    name="shortName"
                    value={formData.shortName}
                    onChange={handleInputChange}
                    placeholder="e.g., SBI Main"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="form-section">
              <h3 className="section-title">Bank Details</h3>

              <div className="section-content">
                <div className="form-row-grid">
                  <div className="form-row">
                    <label className="form-label">
                      Bank Name<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <select
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        className={`form-select ${errors.bankName ? 'error' : ''}`}
                      >
                        <option value="">Select Bank</option>
                        {bankList.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                      {errors.bankName && <span className="error-text">{errors.bankName}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      Account Type<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <select
                        name="accountType"
                        value={formData.accountType}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        {accountTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-row">
                    <label className="form-label">
                      Account Holder Name<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <input
                        type="text"
                        name="accountHolderName"
                        value={formData.accountHolderName}
                        onChange={handleInputChange}
                        placeholder="Enter account holder name"
                        className={`form-input ${errors.accountHolderName ? 'error' : ''}`}
                      />
                      {errors.accountHolderName && <span className="error-text">{errors.accountHolderName}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      Account Number<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <div className="input-with-icon">
                        <input
                          type={showAccountNumber ? "text" : "password"}
                          name="accountNumber"
                          value={formData.accountNumber}
                          onChange={handleInputChange}
                          placeholder="Enter account number"
                          className={`form-input ${errors.accountNumber ? 'error' : ''}`}
                        />
                        <button
                          type="button"
                          className="toggle-visibility-btn"
                          onClick={() => setShowAccountNumber(!showAccountNumber)}
                        >
                          {showAccountNumber ? (
                            <svg className="eye-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="eye-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {errors.accountNumber && <span className="error-text">{errors.accountNumber}</span>}
                    </div>
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-row">
                    <label className="form-label">
                      Confirm Account Number<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <input
                        type={showAccountNumber ? "text" : "password"}
                        name="confirmAccountNumber"
                        value={formData.confirmAccountNumber}
                        onChange={handleInputChange}
                        placeholder="Re-enter account number"
                        className={`form-input ${errors.confirmAccountNumber ? 'error' : ''}`}
                      />
                      {errors.confirmAccountNumber && <span className="error-text">{errors.confirmAccountNumber}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      IFSC Code<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <input
                        type="text"
                        name="ifscCode"
                        value={formData.ifscCode}
                        onChange={handleInputChange}
                        placeholder="e.g., SBIN0001234"
                        style={{ textTransform: 'uppercase' }}
                        maxLength="11"
                        className={`form-input ${errors.ifscCode ? 'error' : ''}`}
                      />
                      {errors.ifscCode && <span className="error-text">{errors.ifscCode}</span>}
                    </div>
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-row">
                    <label className="form-label">
                      Branch Name<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <input
                        type="text"
                        name="branchName"
                        value={formData.branchName}
                        onChange={handleInputChange}
                        placeholder="Enter branch name"
                        className={`form-input ${errors.branchName ? 'error' : ''}`}
                      />
                      {errors.branchName && <span className="error-text">{errors.branchName}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <label className="form-label">Branch Address</label>
                    <div className="form-input-wrapper">
                      <input
                        type="text"
                        name="branchAddress"
                        value={formData.branchAddress}
                        onChange={handleInputChange}
                        placeholder="Enter branch address"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Notes</label>
                  <div className="form-input-wrapper full">
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Add any additional notes"
                      rows="3"
                      className="form-textarea"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button onClick={handleCancel} className="cancel-btn" disabled={loading}>
              Cancel
            </button>
            <button onClick={handleSubmit} className="save-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bank-dashboard">
      {activeView === 'overview' && renderOverview()}
      {activeView === 'addBank' && renderAddBankForm()}
    </div>
  );
};

export default BankAccountDashboard;