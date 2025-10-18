import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUniversity,
  faSave,
  faTimes,
  faEye,
  faEyeSlash,
  faInfoCircle,
  faCheck,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import './AddBankAccountForm.css';
import newBankDetailsService from '../../../services/newBankDetailsService';
import { getSelectedCompany } from '../../../utils/auth';

const AddBankAccountForm = ({ currentCompany, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountHolderName: '',
    accountType: 'Savings',
    ifscCode: '',
    branchName: '',
    branchAddress: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const bankList = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank',
    'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Bank of India', 'IDBI Bank',
    'Central Bank of India', 'IndusInd Bank', 'Yes Bank', 'Kotak Mahindra Bank', 'Federal Bank',
    'South Indian Bank', 'Karnataka Bank', 'Dhanlaxmi Bank', 'City Union Bank', 'Others'
  ];

  const accountTypes = [
    'Savings', 'Current', 'Fixed Deposit', 'Recurring Deposit', 'NRI Account', 'Joint Account'
  ];

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'bankName':
        if (!value.trim()) {
          newErrors.bankName = 'Bank name is required';
        } else {
          delete newErrors.bankName;
        }
        break;

      case 'accountNumber':
        if (!value.trim()) {
          newErrors.accountNumber = 'Account number is required';
        } else if (value.length < 9 || value.length > 18) {
          newErrors.accountNumber = 'Account number must be between 9-18 digits';
        } else if (!/^\d+$/.test(value)) {
          newErrors.accountNumber = 'Account number should contain only digits';
        } else {
          delete newErrors.accountNumber;
        }
        break;

      case 'confirmAccountNumber':
        if (!value.trim()) {
          newErrors.confirmAccountNumber = 'Please confirm account number';
        } else if (value !== formData.accountNumber) {
          newErrors.confirmAccountNumber = 'Account numbers do not match';
        } else {
          delete newErrors.confirmAccountNumber;
        }
        break;

      case 'accountHolderName':
        if (!value.trim()) {
          newErrors.accountHolderName = 'Account holder name is required';
        } else if (value.length < 2) {
          newErrors.accountHolderName = 'Name must be at least 2 characters';
        } else {
          delete newErrors.accountHolderName;
        }
        break;

      case 'ifscCode':
        if (!value.trim()) {
          newErrors.ifscCode = 'IFSC code is required';
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) {
          newErrors.ifscCode = 'Invalid IFSC code format';
        } else {
          delete newErrors.ifscCode;
        }
        break;

      case 'branchName':
        if (!value.trim()) {
          newErrors.branchName = 'Branch name is required';
        } else {
          delete newErrors.branchName;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    validateField(name, newValue);
  };

  const validateStep = (step) => {
    const stepErrors = {};

    if (step === 1) {
      if (!formData.bankName.trim()) stepErrors.bankName = 'Bank name is required';
      if (!formData.accountNumber.trim()) stepErrors.accountNumber = 'Account number is required';
      if (!formData.confirmAccountNumber.trim()) stepErrors.confirmAccountNumber = 'Please confirm account number';
      if (formData.accountNumber !== formData.confirmAccountNumber) stepErrors.confirmAccountNumber = 'Account numbers do not match';
      if (!formData.accountHolderName.trim()) stepErrors.accountHolderName = 'Account holder name is required';
      if (!formData.accountType) stepErrors.accountType = 'Account type is required';
    }

    if (step === 2) {
      if (!formData.ifscCode.trim()) stepErrors.ifscCode = 'IFSC code is required';
      if (!formData.branchName.trim()) stepErrors.branchName = 'Branch name is required';
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const validateForm = () => {
    const formErrors = {};

    // Required field validations
    if (!formData.bankName.trim()) formErrors.bankName = 'Bank name is required';
    if (!formData.accountNumber.trim()) formErrors.accountNumber = 'Account number is required';
    if (!formData.confirmAccountNumber.trim()) formErrors.confirmAccountNumber = 'Please confirm account number';
    if (formData.accountNumber !== formData.confirmAccountNumber) formErrors.confirmAccountNumber = 'Account numbers do not match';
    if (!formData.accountHolderName.trim()) formErrors.accountHolderName = 'Account holder name is required';
    if (!formData.accountType) formErrors.accountType = 'Account type is required';
    if (!formData.ifscCode.trim()) formErrors.ifscCode = 'IFSC code is required';
    if (!formData.branchName.trim()) formErrors.branchName = 'Branch name is required';

    // Format validations
    if (formData.accountNumber && (formData.accountNumber.length < 9 || formData.accountNumber.length > 18)) {
      formErrors.accountNumber = 'Account number must be between 9-18 digits';
    }
    if (formData.accountNumber && !/^\d+$/.test(formData.accountNumber)) {
      formErrors.accountNumber = 'Account number should contain only digits';
    }
    if (formData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase())) {
      formErrors.ifscCode = 'Invalid IFSC code format';
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get company ID
      const companyId = currentCompany?.id || currentCompany?._id;
      
      // Debug: Check what's in localStorage/sessionStorage
      console.log('Debug - Company ID check:', {
        companyId,
        localStorage: {
          selectedCompany: localStorage.getItem('selectedCompany'),
          selectedCompanyId: localStorage.getItem('selectedCompanyId'),
          currentCompany: localStorage.getItem('currentCompany'),
          user: localStorage.getItem('user')
        },
        sessionStorage: {
          selectedCompany: sessionStorage.getItem('selectedCompany'),
          companyId: sessionStorage.getItem('companyId'),
          currentCompany: sessionStorage.getItem('currentCompany'),
          user: sessionStorage.getItem('user')
        }
      });
      
      if (!companyId) {
        throw new Error('Please select a company first. Check browser console for debug info.');
      }

      // Prepare the data
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

      // Call the API
      const result = await newBankDetailsService.createBankDetail(companyId, bankDetailData);
      
      if (result.success) {
        // Reset form
        setFormData({
          bankName: '',
          accountNumber: '',
          confirmAccountNumber: '',
          accountHolderName: '',
          accountType: 'Savings',
          ifscCode: '',
          branchName: '',
          branchAddress: '',
          notes: ''
        });
        setCurrentStep(1);
        
        // Call onSubmit callback if provided
        if (onSubmit) {
          await onSubmit(result.data);
        }
        
        alert('Bank account created successfully!');
      }
    } catch (error) {
      console.error('Error creating bank account:', error);
      alert(error.message || 'Failed to create bank account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
        <div className="step-number">
          {currentStep > 1 ? <FontAwesomeIcon icon={faCheck} /> : '1'}
        </div>
        <div className="step-label">Basic Details</div>
      </div>
      <div className="step-line"></div>
      <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
        <div className="step-number">
          {currentStep > 2 ? <FontAwesomeIcon icon={faCheck} /> : '2'}
        </div>
        <div className="step-label">Branch Details</div>
      </div>
      <div className="step-line"></div>
      <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
        <div className="step-number">
          {currentStep > 3 ? <FontAwesomeIcon icon={faCheck} /> : '3'}
        </div>
        <div className="step-label">Additional Info</div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="form-step">
      <h3>Basic Account Information</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>Bank Name *</label>
          <select
            name="bankName"
            value={formData.bankName}
            onChange={handleInputChange}
            className={errors.bankName ? 'error' : ''}
            required
          >
            <option value="">Select Bank</option>
            {bankList.map(bank => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
          {errors.bankName && <span className="error-message">{errors.bankName}</span>}
        </div>

        <div className="form-group">
          <label>Account Type *</label>
          <select
            name="accountType"
            value={formData.accountType}
            onChange={handleInputChange}
            className={errors.accountType ? 'error' : ''}
            required
          >
            {accountTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.accountType && <span className="error-message">{errors.accountType}</span>}
        </div>
      </div>

      <div className="form-group">
        <label>Account Holder Name *</label>
        <input
          type="text"
          name="accountHolderName"
          value={formData.accountHolderName}
          onChange={handleInputChange}
          className={errors.accountHolderName ? 'error' : ''}
          placeholder="Enter account holder name"
          required
        />
        {errors.accountHolderName && <span className="error-message">{errors.accountHolderName}</span>}
      </div>

      <div className="form-group">
        <label>Account Number *</label>
        <div className="password-input">
          <input
            type={showAccountNumber ? "text" : "password"}
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleInputChange}
            className={errors.accountNumber ? 'error' : ''}
            placeholder="Enter account number"
            required
          />
          <button
            type="button"
            className="toggle-visibility"
            onClick={() => setShowAccountNumber(!showAccountNumber)}
          >
            <FontAwesomeIcon icon={showAccountNumber ? faEyeSlash : faEye} />
          </button>
        </div>
        {errors.accountNumber && <span className="error-message">{errors.accountNumber}</span>}
      </div>

      <div className="form-group">
        <label>Confirm Account Number *</label>
        <div className="password-input">
          <input
            type={showAccountNumber ? "text" : "password"}
            name="confirmAccountNumber"
            value={formData.confirmAccountNumber}
            onChange={handleInputChange}
            className={errors.confirmAccountNumber ? 'error' : ''}
            placeholder="Re-enter account number"
            required
          />
        </div>
        {errors.confirmAccountNumber && <span className="error-message">{errors.confirmAccountNumber}</span>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step">
      <h3>Branch Information</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>IFSC Code *</label>
          <input
            type="text"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleInputChange}
            className={errors.ifscCode ? 'error' : ''}
            placeholder="Enter IFSC code (e.g., SBIN0001234)"
            style={{ textTransform: 'uppercase' }}
            maxLength="11"
            required
          />
          {errors.ifscCode && <span className="error-message">{errors.ifscCode}</span>}
        </div>

        <div className="form-group">
          <label>Branch Name *</label>
          <input
            type="text"
            name="branchName"
            value={formData.branchName}
            onChange={handleInputChange}
            className={errors.branchName ? 'error' : ''}
            placeholder="Enter branch name"
            required
          />
          {errors.branchName && <span className="error-message">{errors.branchName}</span>}
        </div>
      </div>

      <div className="form-group">
        <label>Branch Address</label>
        <textarea
          name="branchAddress"
          value={formData.branchAddress}
          onChange={handleInputChange}
          placeholder="Enter branch address"
          rows="3"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="form-step">
      <h3>Additional Information</h3>
      
      <div className="form-group">
        <label>Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="Add any additional notes or comments"
          rows="3"
        />
      </div>
    </div>
  );

  return (
    <div className="add-bank-account-form">
      <div className="form-header">
        <div className="header-content">
          <FontAwesomeIcon icon={faUniversity} className="header-icon" />
          <div>
            <h1>Add Bank Account</h1>
            <p>Complete all details to add your bank account</p>
          </div>
        </div>
        <button className="close-btn" onClick={onCancel}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="unified-form">
        <div className="form-section">
          {/* Basic Account Information */}
          <div className="section-header">
            <FontAwesomeIcon icon={faUniversity} />
            <h3>Account Information</h3>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Bank Name *</label>
              <select
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className={errors.bankName ? 'error' : ''}
                required
              >
                <option value="">Select Bank</option>
                {bankList.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
              {errors.bankName && <span className="error-message">{errors.bankName}</span>}
            </div>

            <div className="form-group">
              <label>Account Type *</label>
              <select
                name="accountType"
                value={formData.accountType}
                onChange={handleInputChange}
                className={errors.accountType ? 'error' : ''}
                required
              >
                {accountTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.accountType && <span className="error-message">{errors.accountType}</span>}
            </div>

            <div className="form-group full-width">
              <label>Account Holder Name *</label>
              <input
                type="text"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleInputChange}
                className={errors.accountHolderName ? 'error' : ''}
                placeholder="Enter account holder name"
                required
              />
              {errors.accountHolderName && <span className="error-message">{errors.accountHolderName}</span>}
            </div>

            <div className="form-group">
              <label>Account Number *</label>
              <div className="input-with-icon">
                <input
                  type={showAccountNumber ? "text" : "password"}
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className={errors.accountNumber ? 'error' : ''}
                  placeholder="Enter account number"
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                >
                  <FontAwesomeIcon icon={showAccountNumber ? faEyeSlash : faEye} />
                </button>
              </div>
              {errors.accountNumber && <span className="error-message">{errors.accountNumber}</span>}
            </div>

            <div className="form-group">
              <label>Confirm Account Number *</label>
              <div className="input-with-icon">
                <input
                  type={showAccountNumber ? "text" : "password"}
                  name="confirmAccountNumber"
                  value={formData.confirmAccountNumber}
                  onChange={handleInputChange}
                  className={errors.confirmAccountNumber ? 'error' : ''}
                  placeholder="Re-enter account number"
                  required
                />
              </div>
              {errors.confirmAccountNumber && <span className="error-message">{errors.confirmAccountNumber}</span>}
            </div>

            <div className="form-group">
              <label>IFSC Code *</label>
              <input
                type="text"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleInputChange}
                className={errors.ifscCode ? 'error' : ''}
                placeholder="Enter IFSC code (e.g., SBIN0001234)"
                style={{ textTransform: 'uppercase' }}
                maxLength="11"
                required
              />
              {errors.ifscCode && <span className="error-message">{errors.ifscCode}</span>}
            </div>

            <div className="form-group">
              <label>Branch Name *</label>
              <input
                type="text"
                name="branchName"
                value={formData.branchName}
                onChange={handleInputChange}
                className={errors.branchName ? 'error' : ''}
                placeholder="Enter branch name"
                required
              />
              {errors.branchName && <span className="error-message">{errors.branchName}</span>}
            </div>

            <div className="form-group full-width">
              <label>Branch Address</label>
              <textarea
                name="branchAddress"
                value={formData.branchAddress}
                onChange={handleInputChange}
                placeholder="Enter branch address"
                rows="2"
              />
            </div>



















            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any additional notes or comments"
                rows="3"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn cancel"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <FontAwesomeIcon icon={faTimes} />
            Cancel
          </button>
          
          <button
            type="submit"
            className="btn primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Adding Account...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} />
                Add Bank Account
              </>
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default AddBankAccountForm;