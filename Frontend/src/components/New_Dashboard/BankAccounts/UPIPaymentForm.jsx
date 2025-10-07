import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMobileAlt,
  faTimes,
  faUser,
  faCalendarAlt,
  faFileAlt,
  faRupeeSign,
  faSave,
  faArrowLeft,
  faQrcode,
  faHashtag
} from '@fortawesome/free-solid-svg-icons';
import './UPIPaymentForm.css';

const UPIPaymentForm = ({ onSubmit, onCancel, upiAccounts, bankAccounts }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentType: 'sent', // sent or received
    fromUPI: '',
    toUPI: '',
    receiverName: '',
    purpose: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    transactionId: '',
    upiRef: '',
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

    if (formData.paymentType === 'sent' && !formData.fromUPI) {
      newErrors.fromUPI = 'Please select UPI account';
    }

    if (!formData.toUPI.trim()) {
      newErrors.toUPI = 'Please enter receiver UPI ID';
    }

    if (!formData.receiverName.trim()) {
      newErrors.receiverName = 'Please enter receiver name';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Please enter payment purpose';
    }

    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }

    // Validate UPI ID format
    if (formData.toUPI && !isValidUPIId(formData.toUPI)) {
      newErrors.toUPI = 'Please enter a valid UPI ID (e.g., name@paytm)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUPIId = (upiId) => {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    return upiRegex.test(upiId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const paymentData = {
        ...formData,
        amount: parseFloat(formData.amount),
        charges: parseFloat(formData.charges) || 0,
        id: Date.now().toString(),
        createdAt: new Date(),
        status: 'completed'
      };
      onSubmit(paymentData);
    }
  };

  return (
    <div className="upi-payment-form">
      <div className="form-header">
        <div className="header-content">
          <FontAwesomeIcon icon={faMobileAlt} className="header-icon" />
          <div>
            <h2>UPI Payment</h2>
            <p>Send and receive money via UPI</p>
          </div>
        </div>
        <button className="close-btn" onClick={onCancel}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-grid">
          {/* Payment Type */}
          <div className="form-group full-width">
            <label className="form-label">
              Payment Type <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="paymentType"
                  value="sent"
                  checked={formData.paymentType === 'sent'}
                  onChange={handleInputChange}
                />
                <span className="radio-custom"></span>
                <span className="radio-label">Money Sent</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="paymentType"
                  value="received"
                  checked={formData.paymentType === 'received'}
                  onChange={handleInputChange}
                />
                <span className="radio-custom"></span>
                <span className="radio-label">Money Received</span>
              </label>
            </div>
          </div>

          {/* From UPI (only for sent payments) */}
          {formData.paymentType === 'sent' && (
            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faMobileAlt} />
                From UPI Account <span className="required">*</span>
              </label>
              <select
                name="fromUPI"
                value={formData.fromUPI}
                onChange={handleInputChange}
                className={`form-input ${errors.fromUPI ? 'error' : ''}`}
              >
                <option value="">Select UPI account</option>
                {upiAccounts.map(upi => (
                  <option key={upi.id} value={upi.id}>
                    {upi.providerName} - {upi.upiId}
                  </option>
                ))}
              </select>
              {errors.fromUPI && <span className="error-message">{errors.fromUPI}</span>}
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

          {/* Transaction Charges */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faRupeeSign} />
              Transaction Charges
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

          {/* To UPI ID */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faMobileAlt} />
              {formData.paymentType === 'sent' ? 'To' : 'From'} UPI ID <span className="required">*</span>
            </label>
            <input
              type="text"
              name="toUPI"
              value={formData.toUPI}
              onChange={handleInputChange}
              placeholder="example@paytm"
              className={`form-input ${errors.toUPI ? 'error' : ''}`}
              style={{ textTransform: 'lowercase' }}
            />
            {errors.toUPI && <span className="error-message">{errors.toUPI}</span>}
          </div>

          {/* Receiver Name */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faUser} />
              {formData.paymentType === 'sent' ? 'Receiver' : 'Sender'} Name <span className="required">*</span>
            </label>
            <input
              type="text"
              name="receiverName"
              value={formData.receiverName}
              onChange={handleInputChange}
              placeholder="Person/Company name"
              className={`form-input ${errors.receiverName ? 'error' : ''}`}
            />
            {errors.receiverName && <span className="error-message">{errors.receiverName}</span>}
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faCalendarAlt} />
              Payment Date <span className="required">*</span>
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

          {/* Transaction ID */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faHashtag} />
              UPI Transaction ID
            </label>
            <input
              type="text"
              name="transactionId"
              value={formData.transactionId}
              onChange={handleInputChange}
              placeholder="UPI transaction ID"
              className="form-input"
            />
          </div>

          {/* UPI Reference */}
          <div className="form-group">
            <label className="form-label">
              UPI Reference
            </label>
            <input
              type="text"
              name="upiRef"
              value={formData.upiRef}
              onChange={handleInputChange}
              placeholder="UPI reference number"
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
              <option value="personal_transfer">Personal Transfer</option>
              <option value="bill_payment">Bill Payment</option>
              <option value="shopping">Shopping</option>
              <option value="food_delivery">Food Delivery</option>
              <option value="recharge">Mobile/DTH Recharge</option>
              <option value="fuel">Fuel Payment</option>
              <option value="education">Education Fee</option>
              <option value="medical">Medical Payment</option>
              <option value="travel">Travel Booking</option>
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
              placeholder="Additional notes about this UPI payment..."
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
            Record Payment
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default UPIPaymentForm;