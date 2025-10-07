import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave,
  faTimes,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import './CashPaymentForm.css';

const CashPaymentForm = ({ onSubmit, onCancel, bankAccounts }) => {
  return (
    <div className="cash-payment-page">
      <div className="page-header">
        <div className="header-content">
          <FontAwesomeIcon icon={faMoneyBillWave} className="header-icon" />
          <div>
            <h2>Cash Payment</h2>
            <p>Cash payment management system</p>
          </div>
        </div>
        <button className="close-btn" onClick={onCancel}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="page-container">
        <div className="image-container">
          <img 
            src="/api/placeholder/600/400" 
            alt="Cash Payment System" 
            className="payment-image"
            onError={(e) => {
              // Fallback to a CSS background if image fails to load
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          <div className="image-fallback" style={{display: 'none'}}>
            <FontAwesomeIcon icon={faMoneyBillWave} className="fallback-icon" />
            <h3>Cash Payment System</h3>
            <p>Manage your cash transactions efficiently</p>
          </div>
        </div>

        <div className="page-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashPaymentForm;