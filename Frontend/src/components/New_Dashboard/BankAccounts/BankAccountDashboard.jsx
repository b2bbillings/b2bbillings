import React, { useState, useEffect } from 'react';
import './BankAccountDashboard.css';
import newBankDetailsService from '../../../services/newBankDetailsService';
import { getSelectedCompany } from '../../../utils/auth';
import { AlertCircle, X } from 'lucide-react';

const BankAccountDashboard = ({ addToast }) => {
  const [activeView, setActiveView] = useState('overview');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '', errors: [] });

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
    openingBalance: '0.00',
    balanceType: 'Dr',
    status: 'Active',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Helper function to get company ID from multiple sources
  const getCompanyId = () => {
    let companyId = getSelectedCompany();
    
    if (!companyId) {
      companyId = localStorage.getItem('selectedCompanyId') || 
                  sessionStorage.getItem('companyId') ||
                  localStorage.getItem('companyId');
      
      if (!companyId) {
        const currentCompanyStr = localStorage.getItem('currentCompany') || 
                                   sessionStorage.getItem('currentCompany');
        if (currentCompanyStr) {
          try {
            const currentCompany = JSON.parse(currentCompanyStr);
            companyId = currentCompany?._id || currentCompany?.id;
          } catch (e) {
            console.error('Error parsing currentCompany:', e);
          }
        }
      }
    }
    
    return companyId;
  };

  const bankList = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank',
    'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Bank of India', 'IDBI Bank',
    'Central Bank of India', 'IndusInd Bank', 'Yes Bank', 'Kotak Mahindra Bank', 'Federal Bank',
    'South Indian Bank', 'Karnataka Bank', 'Dhanlaxmi Bank', 'City Union Bank', 'Others'
  ];

  const accountTypes = [
    'Savings', 'Current', 'Fixed Deposit', 'Recurring Deposit', 'NRI Account', 'Joint Account'
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Enter key: Move to next field
      if (e.key === 'Enter' && activeView === 'addBank') {
        const focusedElement = document.activeElement;
        
        // Don't move to next field if we're on the Save button or textarea
        if (focusedElement?.classList.contains('save-btn') || 
            focusedElement?.tagName === 'BUTTON' ||
            focusedElement?.tagName === 'TEXTAREA') {
          return;
        }

        // Get all focusable form elements
        const formElements = Array.from(
          document.querySelectorAll(
            'input:not([type="radio"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
          )
        );

        const currentIndex = formElements.indexOf(focusedElement);
        if (currentIndex !== -1 && currentIndex < formElements.length - 1) {
          e.preventDefault();
          formElements[currentIndex + 1].focus();
        }
      }

      // Alt + S: Save
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeView === 'addBank' && !loading) {
          handleSubmit();
        }
      }
      
      // Alt + C: Cancel
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (activeView === 'addBank') {
          handleCancel();
        }
      }
      
      // Alt + D: Discard (same as cancel)
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (activeView === 'addBank') {
          handleCancel();
        }
      }

      // Escape key: Cancel/Close
      if (e.key === 'Escape') {
        if (activeView === 'addBank') {
          handleCancel();
        }
      }

      // Left/Right Arrow: Navigate between Active/Inactive status
      if (activeView === 'addBank' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const focusedElement = document.activeElement;
        if (focusedElement?.getAttribute('name') === 'status-toggle') {
          e.preventDefault();
          setFormData(prev => ({
            ...prev,
            status: prev.status === 'Active' ? 'Inactive' : 'Active'
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, loading, formData]);

  // Debug: Check company ID on mount
  useEffect(() => {
    const companyId = getCompanyId();
    console.log('🏢 Bank Account Dashboard - Company ID:', companyId);
    console.log('📦 LocalStorage keys:', Object.keys(localStorage));
    console.log('📦 SessionStorage keys:', Object.keys(sessionStorage));
    
    // Log all possible company-related items
    [
      'selectedCompany',
      'selectedCompanyId', 
      'companyId',
      'currentCompany',
      'company'
    ].forEach(key => {
      const localValue = localStorage.getItem(key);
      const sessionValue = sessionStorage.getItem(key);
      if (localValue) console.log(`  localStorage.${key}:`, localValue);
      if (sessionValue) console.log(`  sessionStorage.${key}:`, sessionValue);
    });
  }, []);

  // Load bank accounts on mount
  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      const companyId = getCompanyId();
      
      console.log('📋 Loading bank accounts for company:', companyId);
      
      if (!companyId) {
        console.warn('⚠️ No company selected for loading bank accounts');
        return;
      }

      // Fetch all accounts (both active and inactive)
      const result = await newBankDetailsService.getBankDetails(companyId, { active: 'all' });
      
      console.log('📋 Bank accounts loaded:', result);
      
      if (result.success) {
        const accounts = result.data.map(account => ({
          id: account._id,
          _id: account._id,
          accountDisplayName: account.accountDisplayName || account.accountName,
          bankName: account.bankName,
          accountNumber: `****${account.accountNumber?.slice(-4) || 'XXXX'}`,
          fullAccountNumber: account.accountNumber,
          accountHolderName: account.accountHolderName,
          accountType: account.accountType,
          ifscCode: account.ifscCode,
          branchName: account.branchName,
          balance: account.currentBalance || 0,
          isActive: account.isActive,
          status: account.status,
          createdAt: new Date(account.createdAt)
        }));
        
        console.log('✅ Formatted accounts:', accounts);
        setBankAccounts(accounts);
      } else {
        console.error('❌ Failed to load bank accounts:', result.message);
        addToast?.('Failed to load bank accounts: ' + result.message, 'error');
      }
    } catch (error) {
      console.error('❌ Error loading bank accounts:', error);
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
    console.log('🔍 VALIDATING FORM');
    console.log('📋 Form Data:', formData);
    
    const newErrors = {};
    
    // ✅ FIXED: Determine if this is a cash account based on underGroup
    const isCashAccount = formData.underGroup?.toLowerCase().includes('cash');
    console.log('💰 Is Cash Account:', isCashAccount);
    
    // Required fields validation (for all account types)
    if (!formData.accountDisplayName.trim()) {
      newErrors.accountDisplayName = 'Account display name is required';
    }
    
    // ✅ FIXED: Only validate bank-specific fields for non-cash accounts
    if (!isCashAccount) {
      if (!formData.accountHolderName.trim()) {
        newErrors.accountHolderName = 'Account holder name is required';
      }
      
      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required';
      } else if (formData.accountNumber.trim().length < 9 || formData.accountNumber.trim().length > 18) {
        newErrors.accountNumber = 'Account number must be between 9-18 digits';
      }
      
      if (!formData.ifscCode.trim()) {
        newErrors.ifscCode = 'IFSC code is required';
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifscCode)) {
        newErrors.ifscCode = 'Invalid IFSC code format (e.g., SBIN0001234)';
      }
      
      if (!formData.bankName.trim()) {
        newErrors.bankName = 'Bank name is required';
      }
    }

    // Email validation (if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Mobile validation (if provided)
    if (formData.mobileNo && !/^[6-9]\d{9}$/.test(formData.mobileNo)) {
      newErrors.mobileNo = 'Please enter a valid 10-digit mobile number';
    }
    
    console.log('📝 Validation Errors:', newErrors);
    setErrors(newErrors);
    
    const isValid = Object.keys(newErrors).length === 0;
    console.log(isValid ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED');
    
    return isValid;
  };

  const handleSubmit = async () => {
    console.log('🚀 SUBMIT BUTTON CLICKED');
    console.log('📋 Current Form Data:', formData);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      addToast?.('Please fix the errors in the form', 'error');
      return;
    }

    console.log('✅ Form validation passed');
    setLoading(true);
    
    try {
      const companyId = getCompanyId();
      
      console.log('🔍 Company ID found:', companyId);
      
      if (!companyId) {
        addToast?.('Please select a company first. Go to company settings.', 'error');
        throw new Error('Please select a company first');
      }

      // ✅ FIXED: Determine account type based on underGroup
      const isCashAccount = formData.underGroup?.toLowerCase().includes('cash');
      const accountType = isCashAccount ? 'cash' : 'bank';
      
      console.log('💰 Account Type Detection:');
      console.log('  - underGroup:', formData.underGroup);
      console.log('  - isCashAccount:', isCashAccount);
      console.log('  - accountType:', accountType);

      // ✅ FIXED: Build account data based on account type
      const bankAccountData = {
        // Basic Information - REQUIRED (for all types)
        underGroup: formData.underGroup || 'Bank Accounts',
        accountDisplayName: formData.accountDisplayName.trim(),
        shortName: formData.shortName.trim() || formData.accountDisplayName.trim().substring(0, 20),
        accountName: formData.accountDisplayName.trim(),
        
        // Contact Information - OPTIONAL
        email: formData.email?.trim() || '',
        mobileNo: formData.mobileNo?.trim() || '',
        
        // Balance Information - REQUIRED
        openingBalance: parseFloat(formData.openingBalance) || 0,
        balanceType: formData.balanceType || 'Dr',
        
        // Status - REQUIRED
        status: formData.status || 'Active',
        isActive: (formData.status || 'Active') === 'Active',
        
        // Additional Information - OPTIONAL
        notes: formData.notes?.trim() || '',
        
        // Type - REQUIRED (bank/cash/upi)
        type: accountType
      };

      // ✅ Add bank-specific fields only for non-cash accounts
      if (!isCashAccount) {
        bankAccountData.accountHolderName = formData.accountHolderName.trim();
        bankAccountData.accountNumber = formData.accountNumber.trim();
        bankAccountData.ifscCode = formData.ifscCode.toUpperCase().trim();
        bankAccountData.bankName = formData.bankName.trim();
        bankAccountData.branchName = formData.branchName?.trim() || '';
        bankAccountData.branchAddress = formData.branchAddress?.trim() || '';
        bankAccountData.accountType = formData.accountType || 'Savings';
      } else {
        // For cash accounts, use default/placeholder values
        bankAccountData.accountHolderName = formData.accountDisplayName.trim();
        bankAccountData.accountNumber = 'CASH-' + Date.now();
        bankAccountData.ifscCode = 'CASH0000000';
        bankAccountData.bankName = 'Cash';
        bankAccountData.branchName = 'N/A';
        bankAccountData.branchAddress = '';
        bankAccountData.accountType = 'Cash';
      }

      console.log('📤 Sending bank account data:', JSON.stringify(bankAccountData, null, 2));

      const result = await newBankDetailsService.createBankDetail(companyId, bankAccountData);
      
      console.log('📥 API Response:', result);
      
      if (result.success) {
        console.log('✅ Bank account created successfully!');
        addToast?.('Bank account created successfully!', 'success');
        await loadBankAccounts();
        setActiveView('overview');
        resetForm();
      } else {
        console.log('❌ API returned failure:', result.message);
        // Show detailed error message if available
        const errorMsg = result.error?.errors 
          ? `Validation failed: ${result.error.errors.join(', ')}`
          : result.message || 'Failed to create bank account';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('❌ Error creating bank account:', error);
      
      // Extract detailed error information
      let errorTitle = 'Failed to Create Bank Account';
      let errorMessage = 'An unexpected error occurred';
      let errorList = [];
      
      if (error.response?.data?.errors) {
        errorTitle = 'Validation Error';
        errorMessage = 'Please fix the following issues:';
        errorList = error.response.data.errors;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error modal
      setErrorModal({
        show: true,
        title: errorTitle,
        message: errorMessage,
        errors: errorList
      });
      
      // Also show toast for backward compatibility
      addToast?.(errorMessage, 'error');
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
      openingBalance: '0.00',
      balanceType: 'Dr',
      status: 'Active',
      notes: ''
    });
    setErrors({});
    setShowAccountNumber(false);
  };

  const handleCancel = () => {
    setActiveView('overview');
    resetForm();
  };

  const handleDeleteAccount = async (accountId) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      try {
        setLoading(true);
        const companyId = getCompanyId();
        
        if (!companyId) {
          addToast?.('Please select a company first', 'error');
          return;
        }
        
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
        
        <button 
          onClick={() => setShowInactive(!showInactive)} 
          className={`toggle-inactive-btn ${showInactive ? 'active' : ''}`}
          title={showInactive ? 'Hide inactive accounts' : 'Show inactive accounts'}
        >
          <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {showInactive ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            )}
          </svg>
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
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
      ) : (() => {
        const filteredAccounts = bankAccounts.filter(account => showInactive ? true : account.isActive);
        
        if (filteredAccounts.length === 0) {
          return (
            <div className="empty-state">
              <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3>No {showInactive ? '' : 'active '}accounts found</h3>
              <p>{showInactive ? 'All your accounts are active' : 'Click "Show Inactive" to see inactive accounts'}</p>
            </div>
          );
        }

        return (
          <div className="accounts-list">
            {filteredAccounts.map(account => (
            <div key={account.id} className="account-card-modern">
              <div className="account-card-header">
                <div className="account-name-section">
                  <h3 className="account-name">{account.accountDisplayName || account.accountHolderName || 'Account'}</h3>
                  <span className={`status-badge-modern ${account.isActive ? 'active' : 'inactive'}`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button 
                  className="delete-btn-modern"
                  onClick={() => handleDeleteAccount(account.id)}
                  title="Delete Account"
                >
                  <svg className="delete-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div className="account-details-modern">
                <div className="detail-row">
                  <span className="detail-label-modern">Account Holder</span>
                  <span className="detail-value-modern">{account.accountHolderName || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label-modern">Account Number</span>
                  <span className="detail-value-modern account-number-modern">{account.accountNumber || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label-modern">Account Type</span>
                  <span className="detail-value-modern">{account.accountType || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        );
      })()}
    </div>
  );

  const renderAddBankForm = () => (
    <div className="form-page">
      <div className="form-page-container">
        <div className="form-page-header">
          <button onClick={handleCancel} className="back-button" title="Back to list">
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
            {/* Under Group */}
            <div className="form-row">
              <label className="form-label">
                Under group
                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </label>
              <div className="form-input-wrapper">
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
                    autoFocus
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
                    maxLength="10"
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
                          placeholder="32XXXXXXXX01"
                          className={`form-input ${errors.accountNumber ? 'error' : ''}`}
                        />
                        <button
                          type="button"
                          className="toggle-visibility-btn"
                          onClick={() => setShowAccountNumber(!showAccountNumber)}
                          title={showAccountNumber ? "Hide account number" : "Show account number"}
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
                        style={{ textTransform: 'uppercase' }}
                        maxLength="11"
                        className={`form-input ${errors.ifscCode ? 'error' : ''}`}
                      />
                      {errors.ifscCode && <span className="error-text">{errors.ifscCode}</span>}
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
                        list="bank-list"
                      />
                      <datalist id="bank-list">
                        {bankList.map(bank => (
                          <option key={bank} value={bank} />
                        ))}
                      </datalist>
                      {errors.bankName && <span className="error-text">{errors.bankName}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Balance Section */}
            <div className="form-section">
              <h3 className="section-title">Opening Balance</h3>

              <div className="section-content">
                <div className="form-row-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                  <div className="form-row">
                    <label className="form-label">Opening Balance</label>
                    <div className="form-input-wrapper">
                      <div className="input-with-prefix">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          name="openingBalance"
                          value={formData.openingBalance}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="form-input with-prefix"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <label className="form-label">Type</label>
                    <div className="form-input-wrapper">
                      <select
                        name="balanceType"
                        value={formData.balanceType}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="Dr">Dr (Debit)</option>
                        <option value="Cr">Cr (Credit)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="form-section">
              <h3 className="section-title">Status</h3>

              <div className="section-content">
                <div className="form-row">
                  <label className="form-label">
                    Status
                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </label>
                  <div className="form-input-wrapper">
                    <div className="status-toggle">
                      <label className="status-option">
                        <input
                          type="radio"
                          name="status-toggle"
                          value="Active"
                          checked={formData.status === 'Active'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        />
                        <span className="status-label">Active</span>
                      </label>
                      <label className="status-option">
                        <input
                          type="radio"
                          name="status-toggle"
                          value="Inactive"
                          checked={formData.status === 'Inactive'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        />
                        <span className="status-label">Inactive</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-footer">
            {/* Keyboard Shortcuts - Above buttons */}
            <div className="keyboard-shortcuts-container">
              <div className="keyboard-shortcuts">
                <span className="shortcut-hint">
                  <kbd>ALT</kbd> + <kbd>S</kbd> Save
                </span>
                <span className="shortcut-hint">
                  <kbd>ALT</kbd> + <kbd>C</kbd> Cancel
                </span>
                <span className="shortcut-hint">
                  <kbd>ALT</kbd> + <kbd>D</kbd> Discard
                </span>
                <span className="shortcut-hint">
                  <kbd>←</kbd> <kbd>→</kbd> Left/Right Arrow
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="footer-actions">
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
    </div>
  );

  return (
    <div className="bank-dashboard">
      {activeView === 'overview' && renderOverview()}
      {activeView === 'addBank' && renderAddBankForm()}
      
      {/* Error Modal */}
      {errorModal.show && (
        <div className="error-modal-overlay" onClick={() => setErrorModal({ show: false, title: '', message: '', errors: [] })}>
          <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-header">
              <div className="error-modal-icon">
                <AlertCircle size={32} />
              </div>
              <h3>{errorModal.title}</h3>
              <button 
                className="error-modal-close"
                onClick={() => setErrorModal({ show: false, title: '', message: '', errors: [] })}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="error-modal-body">
              <p className="error-modal-message">{errorModal.message}</p>
              
              {errorModal.errors.length > 0 && (
                <ul className="error-modal-list">
                  {errorModal.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="error-modal-footer">
              <button 
                className="error-modal-btn"
                onClick={() => setErrorModal({ show: false, title: '', message: '', errors: [] })}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountDashboard;