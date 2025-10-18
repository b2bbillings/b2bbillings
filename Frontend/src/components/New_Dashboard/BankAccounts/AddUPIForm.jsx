import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMobileAlt,
  faSave,
  faTimes,
  faQrcode,
  faLink,
  faUpload,
  faCheck,
  faInfoCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import './AddUPIForm.css';
import newUPIDetailsService from '../../../services/newUPIDetailsService';
import newBankDetailsService from '../../../services/newBankDetailsService';
import { getSelectedCompany } from '../../../utils/auth';

const AddUPIForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    upiId: '',
    providerName: '',
    displayName: '',
    linkedBankAccount: '',
    qrCodeData: '',
    qrCodeImage: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(true);

  const upiProviders = [
    { value: 'paytm', label: 'Paytm', domain: '@paytm' },
    { value: 'googlepay', label: 'Google Pay', domain: '@okaxis' },
    { value: 'phonepe', label: 'PhonePe', domain: '@ybl' },
    { value: 'amazonpay', label: 'Amazon Pay', domain: '@apl' },
    { value: 'bharatpe', label: 'BharatPe', domain: '@bharatpe' },
    { value: 'mobikwik', label: 'MobiKwik', domain: '@mobikwik' },
    { value: 'freecharge', label: 'Freecharge', domain: '@freecharge' },
    { value: 'airtel', label: 'Airtel Money', domain: '@airtel' },
    { value: 'jio', label: 'JioMoney', domain: '@jio' },
    { value: 'sbi', label: 'SBI Pay', domain: '@sbi' },
    { value: 'hdfc', label: 'HDFC Bank', domain: '@hdfcbank' },
    { value: 'icici', label: 'ICICI Bank', domain: '@icici' },
    { value: 'axis', label: 'Axis Bank', domain: '@axisbank' },
    { value: 'other', label: 'Other', domain: '' }
  ];

  // Load bank accounts on component mount
  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        const companyId = getSelectedCompany();
        
        // Debug: Check what's in localStorage/sessionStorage
        console.log('Debug - UPI Form Company ID check:', {
          companyId,
          localStorage: {
            selectedCompany: localStorage.getItem('selectedCompany'),
            selectedCompanyId: localStorage.getItem('selectedCompanyId'),
            currentCompany: localStorage.getItem('currentCompany'),
            user: localStorage.getItem('user')
          }
        });
        
        if (!companyId) {
          throw new Error('Please select a company first. Check browser console for debug info.');
        }

        const result = await newBankDetailsService.getBankDetails(companyId, { active: 'true' });
        if (result.success) {
          const formattedAccounts = result.data.map(account => ({
            _id: account._id,
            value: account._id,
            label: `${account.bankName} - ${account.accountHolderName} (${account.accountNumber.slice(-4)})`,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
          }));
          setBankAccounts(formattedAccounts);
        }
      } catch (error) {
        console.error('Error loading bank accounts:', error);
        setErrors(prev => ({ ...prev, linkedBankAccount: 'Failed to load bank accounts' }));
      } finally {
        setLoadingBankAccounts(false);
      }
    };

    loadBankAccounts();
  }, []);

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'upiId':
        if (!value.trim()) {
          newErrors.upiId = 'UPI ID is required';
        } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(value)) {
          newErrors.upiId = 'Please enter a valid UPI ID format';
        } else {
          delete newErrors.upiId;
        }
        break;

      case 'providerName':
        if (!value.trim()) {
          newErrors.providerName = 'UPI provider is required';
        } else {
          delete newErrors.providerName;
        }
        break;

      case 'linkedBankAccount':
        if (!value.trim()) {
          newErrors.linkedBankAccount = 'Please select a linked bank account';
        } else {
          delete newErrors.linkedBankAccount;
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

    // Auto-generate UPI ID when provider changes
    if (name === 'providerName') {
      const provider = upiProviders.find(p => p.value === newValue);
      if (provider && provider.domain && formData.displayName) {
        const baseId = formData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
        setFormData(prev => ({
          ...prev,
          upiId: `${baseId}${provider.domain}`
        }));
      }
    }

    // Auto-generate UPI ID when display name changes
    if (name === 'displayName' && formData.providerName) {
      const provider = upiProviders.find(p => p.value === formData.providerName);
      if (provider && provider.domain) {
        const baseId = newValue.toLowerCase().replace(/[^a-z0-9]/g, '');
        setFormData(prev => ({
          ...prev,
          upiId: `${baseId}${provider.domain}`
        }));
      }
    }

    validateField(name, newValue);
  };

  const handleQRUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setErrors(prev => ({ ...prev, qrCodeImage: 'QR code image must be less than 2MB' }));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setQrPreview(event.target.result);
        setFormData(prev => ({
          ...prev,
          qrCodeImage: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateQRCode = () => {
    // In a real app, you would use a QR code library
    const qrData = `upi://pay?pa=${formData.upiId}&pn=${formData.displayName || 'Merchant'}&cu=INR`;
    setFormData(prev => ({
      ...prev,
      qrCodeData: qrData
    }));
  };

  const validateForm = () => {
    const formErrors = {};

    if (!formData.upiId.trim()) formErrors.upiId = 'UPI ID is required';
    if (!formData.providerName.trim()) formErrors.providerName = 'Provider is required';
    if (!formData.linkedBankAccount) formErrors.linkedBankAccount = 'Linked bank account is required';

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
      const companyId = getSelectedCompany();
      if (!companyId) {
        throw new Error('Please select a company first');
      }

      // Prepare the data for UPI account
      const upiData = {
        upiId: formData.upiId,
        providerName: formData.providerName,
        displayName: formData.displayName,
        linkedBankAccount: formData.linkedBankAccount,
        qrCodeData: formData.qrCodeData || `upi://pay?pa=${formData.upiId}&pn=${formData.displayName}&cu=INR`,
        qrCodeImage: formData.qrCodeImage
      };

      // Call the API
      const result = await newUPIDetailsService.createUPIDetail(companyId, upiData);
      
      if (result.success) {
        // Reset form
        setFormData({
          upiId: '',
          providerName: '',
          displayName: '',
          linkedBankAccount: '',
          qrCodeData: '',
          qrCodeImage: null
        });
        setQrPreview(null);
        
        // Call onSubmit callback if provided
        if (onSubmit) {
          await onSubmit(result.data);
        }
        
        alert('UPI account created successfully!');
      }
    } catch (error) {
      console.error('Error creating UPI account:', error);
      alert(error.message || 'Failed to create UPI account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-upi-form">
      <div className="form-header">
        <div className="header-content">
          <FontAwesomeIcon icon={faMobileAlt} className="header-icon" />
          <div>
            <h1>Add UPI Account</h1>
            <p>Add a new UPI account for digital payments</p>
          </div>
        </div>
        <button className="close-btn" onClick={onCancel}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="upi-form">
        {/* Basic UPI Information */}
        <div className="form-section">
          <h3>UPI Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Display Name *</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder="Enter display name for UPI"
                required
              />
            </div>

            <div className="form-group">
              <label>UPI Provider *</label>
              <select
                name="providerName"
                value={formData.providerName}
                onChange={handleInputChange}
                className={errors.providerName ? 'error' : ''}
                required
              >
                <option value="">Select UPI Provider</option>
                {upiProviders.map(provider => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
              {errors.providerName && <span className="error-message">{errors.providerName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>UPI ID *</label>
            <input
              type="text"
              name="upiId"
              value={formData.upiId}
              onChange={handleInputChange}
              className={errors.upiId ? 'error' : ''}
              placeholder="Enter UPI ID (e.g., username@paytm)"
              required
            />
            {errors.upiId && <span className="error-message">{errors.upiId}</span>}
          </div>

          <div className="form-group">
            <label>Linked Bank Account *</label>
            <select
              name="linkedBankAccount"
              value={formData.linkedBankAccount}
              onChange={handleInputChange}
              className={errors.linkedBankAccount ? 'error' : ''}
              required
              disabled={loadingBankAccounts}
            >
              <option value="">
                {loadingBankAccounts ? 'Loading bank accounts...' : 'Select Bank Account'}
              </option>
              {bankAccounts.map(account => (
                <option key={account._id} value={account._id}>
                  {account.label}
                </option>
              ))}
            </select>
            {errors.linkedBankAccount && <span className="error-message">{errors.linkedBankAccount}</span>}
            {!loadingBankAccounts && bankAccounts.length === 0 && (
              <span className="info-message">
                <FontAwesomeIcon icon={faInfoCircle} />
                Please add a bank account first to link with UPI
              </span>
            )}
          </div>
        </div>





        {/* QR Code Section */}
        <div className="form-section">
          <h3>QR Code</h3>
          
          <div className="qr-section">
            <div className="qr-upload">
              <label>Upload QR Code Image</label>
              <div className="upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQRUpload}
                  id="qr-upload"
                  hidden
                />
                <label htmlFor="qr-upload" className="upload-label">
                  <FontAwesomeIcon icon={faUpload} />
                  <span>Click to upload QR code image</span>
                </label>
                {qrPreview && (
                  <div className="qr-preview">
                    <img src={qrPreview} alt="QR Code" />
                  </div>
                )}
              </div>
            </div>

            <div className="qr-generate">
              <button
                type="button"
                className="btn secondary"
                onClick={generateQRCode}
                disabled={!formData.upiId}
              >
                <FontAwesomeIcon icon={faQrcode} />
                Generate QR Code
              </button>
              {formData.qrCodeData && (
                <div className="qr-data">
                  <label>Generated QR Data:</label>
                  <textarea value={formData.qrCodeData} readOnly rows="2" />
                </div>
              )}
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
            Cancel
          </button>
          
          <button
            type="submit"
            className="btn primary"
            disabled={isSubmitting || bankAccounts.length === 0}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Adding UPI Account...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} />
                Add UPI Account
              </>
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default AddUPIForm;