import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExchangeAlt,
  faTimes,
  faUniversity,
  faUser,
  faCalendarAlt,
  faFileAlt,
  faRupeeSign,
  faSave,
  faArrowLeft,
  faHashtag
} from '@fortawesome/free-solid-svg-icons';
import './BankTransferForm.css';

const BankTransferForm = ({ onSubmit, onCancel, bankAccounts }) => {
  const [formData, setFormData] = useState({
    amount: '',
    transferType: 'sent', // sent or received
    fromAccount: '',
    toAccount: '',
    toAccountName: '',
    toAccountNumber: '',
    toBankName: '',
    ifscCode: '',
    purpose: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    transactionId: '',
    charges: '0'
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (formData.transferType === 'sent' && !formData.fromAccount) {
      newErrors.fromAccount = 'Please select from account';
    }

    if (!formData.toAccountName.trim()) {
      newErrors.toAccountName = 'Please enter account holder name';
    }

    if (!formData.toAccountNumber.trim()) {
      newErrors.toAccountNumber = 'Please enter account number';
    }

    if (!formData.toBankName.trim()) {
      newErrors.toBankName = 'Please enter bank name';
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'Please enter IFSC code';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Please enter transfer purpose';
    }

    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const transferData = {
        ...formData,
        amount: parseFloat(formData.amount),
        charges: parseFloat(formData.charges) || 0,
        id: Date.now().toString(),
        createdAt: new Date(),
        status: 'completed'
      };
      onSubmit(transferData);
    }
  };

  return (
    <div className="bank-transfer-form">
      <div className="form-header">
        <div className="header-content">
          <FontAwesomeIcon icon={faExchangeAlt} className="header-icon" />
          <div>
            <h2>Bank Transfer</h2>
            <p>Transfer money between bank accounts</p>
          </div>
        </div>
        <button className="close-btn" onClick={onCancel}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="transfer-form">
        <div className="form-grid">
          {/* Transfer Type */}
          <div className="form-group full-width">
            <label className="form-label">
              Transfer Type <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="transferType"
                  value="sent"
                  checked={formData.transferType === 'sent'}
                  onChange={handleInputChange}
                />
                <span className="radio-custom"></span>
                <span className="radio-label">Money Sent</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="transferType"
                  value="received"
                  checked={formData.transferType === 'received'}
                  onChange={handleInputChange}
                />
                <span className="radio-custom"></span>
                <span className="radio-label">Money Received</span>
              </label>
            </div>
          </div>

          {/* From Account (only for sent transfers) */}
          {formData.transferType === 'sent' && (
            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faUniversity} />
                From Account <span className="required">*</span>
              </label>
              <select
                name="fromAccount"
                value={formData.fromAccount}
                onChange={handleInputChange}
                className={`form-input ${errors.fromAccount ? 'error' : ''}`}
              >
                <option value="">Select account</option>
                {bankAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} - {account.accountNumber}
                  </option>
                ))}
              </select>
              {errors.fromAccount && <span className="error-message">{errors.fromAccount}</span>}
            </div>
          )}

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faRupeeSign} />
              Amount <span className="required">*</span>
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={`form-input ${errors.amount ? 'error' : ''}`}
            />
            {errors.amount && <span className="error-message">{errors.amount}</span>}
          </div>

          {/* Transfer Charges */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faRupeeSign} />
              Transfer Charges
            </label>
            <input
              type="number"
              name="charges"
              value={formData.charges}
              onChange={handleInputChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="form-input"
            />
          </div>

          {/* To Account Details */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faUser} />
              Account Holder Name <span className="required">*</span>
            </label>
            <input
              type="text"
              name="toAccountName"
              value={formData.toAccountName}
              onChange={handleInputChange}
              placeholder="Account holder name"
              className={`form-input ${errors.toAccountName ? 'error' : ''}`}
            />
            {errors.toAccountName && <span className="error-message">{errors.toAccountName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faHashtag} />
              Account Number <span className="required">*</span>
            </label>
            <input
              type="text"
              name="toAccountNumber"
              value={formData.toAccountNumber}
              onChange={handleInputChange}
              placeholder="Account number"
              className={`form-input ${errors.toAccountNumber ? 'error' : ''}`}
            />
            {errors.toAccountNumber && <span className="error-message">{errors.toAccountNumber}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faUniversity} />
              Bank Name <span className="required">*</span>
            </label>
            <input
              type="text"
              name="toBankName"
              value={formData.toBankName}
              onChange={handleInputChange}
              placeholder="Bank name"
              className={`form-input ${errors.toBankName ? 'error' : ''}`}
            />
            {errors.toBankName && <span className="error-message">{errors.toBankName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              IFSC Code <span className="required">*</span>
            </label>
            <input
              type="text"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleInputChange}
              placeholder="IFSC0001234"
              className={`form-input ${errors.ifscCode ? 'error' : ''}`}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.ifscCode && <span className="error-message">{errors.ifscCode}</span>}
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faCalendarAlt} />
              Transfer Date <span className="required">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={`form-input ${errors.date ? 'error' : ''}`}
            />
            {errors.date && <span className="error-message">{errors.date}</span>}
          </div>

          {/* Reference Number */}
          <div className="form-group">
            <label className="form-label">
              Reference Number
            </label>
            <input
              type="text"
              name="referenceNumber"
              value={formData.referenceNumber}
              onChange={handleInputChange}
              placeholder="Bank reference number"
              className="form-input"
            />
          </div>

          {/* Transaction ID */}
          <div className="form-group">
            <label className="form-label">
              Transaction ID
            </label>
            <input
              type="text"
              name="transactionId"
              value={formData.transactionId}
              onChange={handleInputChange}
              placeholder="Transaction ID"
              className="form-input"
            />
          </div>

          {/* Purpose */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faFileAlt} />
              Purpose <span className="required">*</span>
            </label>
            <select
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              className={`form-input ${errors.purpose ? 'error' : ''}`}
            >
              <option value="">Select purpose</option>
              <option value="business_payment">Business Payment</option>
              <option value="salary_transfer">Salary Transfer</option>
              <option value="vendor_payment">Vendor Payment</option>
              <option value="loan_payment">Loan Payment</option>
              <option value="investment">Investment</option>
              <option value="personal_transfer">Personal Transfer</option>
              <option value="tax_payment">Tax Payment</option>
              <option value="other">Other</option>
            </select>
            {errors.purpose && <span className="error-message">{errors.purpose}</span>}
          </div>

          {/* Description */}
          <div className="form-group full-width">
            <label className="form-label">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional notes about this transfer..."
              className="form-textarea"
              rows="3"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            <FontAwesomeIcon icon={faSave} />
            Process Transfer
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default BankTransferForm;