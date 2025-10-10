// File: D:\b2b Main web\b2bbillings\Frontend\src\components\New_Dashboard\Sales\PaymentSection.jsx
import React from 'react';

const PaymentSection = ({
  isReceived,
  onReceivedChange,
  paymentMode,
  onPaymentModeChange,
  refNo,
  onRefNoChange,
  depositTo,
  onDepositToChange,
  paymentAmount,
  onPaymentAmountChange,
  subtotal,
  taxableAmt,
  onTaxableAmtChange,
  serviceCharge,
  onServiceChargeChange,
  discount,
  onDiscountChange,
  autoRoundOff,
  onAutoRoundOffChange,
  totalAmount
}) => {
  return (
    <section className="payment-section">
      <label className="section-label">Summary</label>
      <div className="payment-checkbox">
        <input 
          type="checkbox" 
          id="payment-received"
          checked={isReceived}
          onChange={(e) => onReceivedChange(e.target.checked)}
        />
        <label htmlFor="payment-received">Is Payment Received?</label>
      </div>
      {isReceived && (
        <div className="payment-fields">
          <select value={paymentMode} onChange={(e) => onPaymentModeChange(e.target.value)}>
            <option>Cash</option>
          </select>
          <input type="text" value={refNo} onChange={(e) => onRefNoChange(e.target.value)} placeholder="Ref. No." />
          <select value={depositTo} onChange={(e) => onDepositToChange(e.target.value)}>
            <option>Cash-in-hand</option>
          </select>
          <input type="number" value={paymentAmount} onChange={(e) => onPaymentAmountChange(parseFloat(e.target.value) || 0)} />
          <button>Pay Full</button>
        </div>
      )}
      <div className="summary-fields">
        <div className="summary-row">
          <label>Taxable Amt.</label>
          <input type="number" value={taxableAmt} onChange={(e) => onTaxableAmtChange(parseFloat(e.target.value) || 0)} />
        </div>
        <button 
          className="btn-add-service-charge"
          onClick={() => onServiceChargeChange(serviceCharge + 100)} // Placeholder
        >
          + Add service charge with tax
        </button>
        <div className="summary-row">
          <label>Sub Total</label>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <label>Select charges</label>
          <select>
            <option></option>
          </select>
          <button>+</button>
          <input type="number" value={serviceCharge} onChange={(e) => onServiceChargeChange(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="summary-row">
          <label>Discount</label>
          <select value={discount} onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}>
            <option>0</option>
          </select>
          <span>%</span>
          <input type="number" value={discount} onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="summary-row auto-round">
          <input 
            type="checkbox" 
            id="auto-round-off"
            checked={autoRoundOff}
            onChange={(e) => onAutoRoundOffChange(e.target.checked)}
          />
          <label htmlFor="auto-round-off">Auto Round Off</label>
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <label>Total Amount</label>
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
};

export default PaymentSection;