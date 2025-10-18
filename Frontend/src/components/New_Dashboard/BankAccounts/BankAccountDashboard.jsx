import React, { useState } from 'react';
import './BankAccountDashboard.css';

const BankAccountDashboard = () => {
  const [activeView, setActiveView] = useState('overview');
  const [bankAccounts, setBankAccounts] = useState([
    {
      id: 1,
      bankName: 'State Bank of India',
      accountNumber: '****1234',
      accountHolderName: 'Dash Enterprises',
      ifscCode: 'SBIN0001234',
      branchName: 'Latur Branch',
      balance: 125000,
      isActive: true
    },
    {
      id: 2,
      bankName: 'HDFC Bank',
      accountNumber: '****5678',
      accountHolderName: 'Dash Enterprises',
      ifscCode: 'HDFC0004567',
      branchName: 'Mumbai Branch',
      balance: 85000,
      isActive: true
    }
  ]);

  const [formData, setFormData] = useState({
    underGroup: 'Bank Accounts',
    accountDisplayName: '',
    shortName: '',
    email: '',
    mobileNo: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    openingBalance: '',
    balanceType: 'Dr',
    status: 'Active'
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.accountDisplayName) newErrors.accountDisplayName = 'Required';
    if (!formData.accountHolderName) newErrors.accountHolderName = 'Required';
    if (!formData.accountNumber) newErrors.accountNumber = 'Required';
    if (!formData.ifscCode) newErrors.ifscCode = 'Required';
    if (!formData.bankName) newErrors.bankName = 'Required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const newAccount = {
        id: Date.now(),
        bankName: formData.bankName,
        accountNumber: `****${formData.accountNumber.slice(-4)}`,
        accountHolderName: formData.accountHolderName,
        ifscCode: formData.ifscCode,
        branchName: formData.accountDisplayName,
        balance: parseFloat(formData.openingBalance || 0),
        isActive: formData.status === 'Active'
      };
      setBankAccounts([...bankAccounts, newAccount]);
      setActiveView('overview');
      setFormData({
        underGroup: 'Bank Accounts',
        accountDisplayName: '',
        shortName: '',
        email: '',
        mobileNo: '',
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        openingBalance: '',
        balanceType: 'Dr',
        status: 'Active'
      });
    }
  };

  const handleCancel = () => {
    setActiveView('overview');
    setFormData({
      underGroup: 'Bank Accounts',
      accountDisplayName: '',
      shortName: '',
      email: '',
      mobileNo: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      openingBalance: '',
      balanceType: 'Dr',
      status: 'Active'
    });
    setErrors({});
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

      <div className="total-balance-card">
        <div className="balance-icon-wrapper">
          <svg className="balance-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="balance-label">Total Balance</div>
          <div className="balance-amount">₹{totalBalance.toLocaleString()}</div>
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
                  <div>
                    <span className="detail-label">Account Holder:</span> {account.accountHolderName}
                  </div>
                  <div>
                    <span className="detail-label">Account Number:</span> {account.accountNumber}
                  </div>
                  <div>
                    <span className="detail-label">IFSC Code:</span> {account.ifscCode}
                  </div>
                  <div>
                    <span className="detail-label">Branch:</span> {account.branchName}
                  </div>
                </div>
              </div>
              <div className="account-balance-section">
                <div className="balance-text">Balance</div>
                <div className="balance-value">₹{account.balance.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAddBankForm = () => (
    <div className="form-page">
      <div className="form-page-container">
        {/* Header */}
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

        {/* Form Container */}
        <div className="form-card">
          <div className="form-body">
            {/* Under Group */}
            <div className="form-row">
              <label className="form-label">
                Under group
                <button type="button" className="info-icon-btn">
                  <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </label>
              <div className="form-input-group">
                <select
                  name="underGroup"
                  value={formData.underGroup}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="Bank Accounts">Bank Accounts</option>
                  <option value="Cash in Hand">Cash in Hand</option>
                  <option value="Current Assets">Current Assets</option>
                </select>
                <button type="button" className="info-icon-btn">
                  <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Account Display Name & Short Name */}
            <div className="form-row-grid">
              <div className="form-row">
                <label className="form-label">
                  Account display name<span className="required">*</span>
                </label>
                <div className="form-input-wrapper">
                  <input
                    type="text"
                    name="accountDisplayName"
                    value={formData.accountDisplayName}
                    onChange={handleInputChange}
                    placeholder="Barry Tone PVT. LTD."
                    className={`form-input ${errors.accountDisplayName ? 'error' : ''}`}
                  />
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
                    placeholder="Jack"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Email & Mobile */}
            <div className="form-row-grid">
              <div className="form-row">
                <label className="form-label">Email</label>
                <div className="form-input-wrapper">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@domain.com"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Mobile No.</label>
                <div className="form-input-wrapper">
                  <input
                    type="tel"
                    name="mobileNo"
                    value={formData.mobileNo}
                    onChange={handleInputChange}
                    placeholder="99XXXXXX01"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="form-section">
              <h3 className="section-title">Bank Details</h3>

              <div className="section-content">
                {/* Account Holder Name & Account Number */}
                <div className="form-row-grid">
                  <div className="form-row">
                    <label className="form-label">
                      Account Holder's Name<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <input
                        type="text"
                        name="accountHolderName"
                        value={formData.accountHolderName}
                        onChange={handleInputChange}
                        placeholder="My Company"
                        className={`form-input ${errors.accountHolderName ? 'error' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      Account Number<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <input
                        type="text"
                        name="accountNumber"
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        placeholder="32XXXXXXXXX01"
                        className={`form-input ${errors.accountNumber ? 'error' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {/* IFSC Code & Bank Name */}
                <div className="form-row-grid">
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
                        placeholder="AAXXXXXXX01"
                        className={`form-input ${errors.ifscCode ? 'error' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      Bank Name<span className="required">*</span>
                    </label>
                    <div className="form-input-wrapper">
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        placeholder="Enter your bank name"
                        className={`form-input ${errors.bankName ? 'error' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Balance Section */}
            <div className="form-section">
              <h3 className="section-title">Opening Balance</h3>

              <div className="form-row">
                <label className="form-label">Opening Balance</label>
                <div className="balance-input-group">
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      name="openingBalance"
                      value={formData.openingBalance}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      className="form-input currency-input"
                    />
                  </div>
                  <select
                    name="balanceType"
                    value={formData.balanceType}
                    onChange={handleInputChange}
                    className="balance-type-select"
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="form-section">
              <div className="form-row">
                <label className="form-label">
                  Status
                  <button type="button" className="info-icon-btn">
                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="status"
                      value="Active"
                      checked={formData.status === 'Active'}
                      onChange={handleInputChange}
                      className="radio-input"
                    />
                    <span>Active</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="status"
                      value="Inactive"
                      checked={formData.status === 'Inactive'}
                      onChange={handleInputChange}
                      className="radio-input"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="form-footer">
            <button onClick={handleCancel} className="cancel-btn">
              Cancel
            </button>
            <button onClick={handleSubmit} className="save-btn">
              Save
            </button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="keyboard-shortcuts">
            <span className="shortcut-item">
              <kbd className="kbd">ALT</kbd>
              <span>+</span>
              <kbd className="kbd">S</kbd>
              <span>Save</span>
            </span>
            <span className="shortcut-item">
              <kbd className="kbd">ALT</kbd>
              <span>+</span>
              <kbd className="kbd">C</kbd>
              <span>Cancel</span>
            </span>
            <span className="shortcut-item">
              <kbd className="kbd">ALT</kbd>
              <span>+</span>
              <kbd className="kbd">D</kbd>
              <span>Discard</span>
            </span>
            <div className="shortcut-arrows">
              <span className="arrow-icons">
                <svg className="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <svg className="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <span>Left/Right Arrow</span>
              <button type="button" className="info-icon-btn">
                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
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