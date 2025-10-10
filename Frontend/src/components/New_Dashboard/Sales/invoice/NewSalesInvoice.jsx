import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileContract,
  faPlus,
  faTrash,
  faSave,
  faCalculator,
  faPercentage,
  faMoneyBillWave,
  faUser,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faCalendarAlt,
  faHashtag,
  faBarcode,
  faBoxes,
  faRupeeSign
} from '@fortawesome/free-solid-svg-icons';
import './NewSalesInvoice.css';

const NewSalesInvoice = ({ currentCompany, currentUser, addToast }) => {
  // State for invoice type
  const [invoiceType, setInvoiceType] = useState('withGST'); // 'withGST' or 'withoutGST'
  
  // State for basic invoice details
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate: getCurrentDate(),
    dueDate: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    paymentTerms: 'Cash',
    notes: ''
  });

  // State for items
  const [items, setItems] = useState([
    {
      id: 1,
      itemName: '',
      quantity: 1,
      unit: 'Pcs',
      rate: 0,
      discount: 0,
      discountType: 'percentage',
      taxRate: 18, // GST rate
      amount: 0,
      taxAmount: 0,
      totalAmount: 0
    }
  ]);

  // State for totals
  const [totals, setTotals] = useState({
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    grandTotal: 0
  });

  // Generate current date in YYYY-MM-DD format
  function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const prefix = invoiceType === 'withGST' ? 'GST' : 'INV';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  // Initialize invoice number on mount or type change
  useEffect(() => {
    if (!invoiceData.invoiceNumber) {
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: generateInvoiceNumber()
      }));
    }
  }, [invoiceType]);

  // Calculate item totals
  const calculateItemTotals = (item) => {
    const { quantity, rate, discount, discountType, taxRate } = item;
    
    // Calculate base amount
    const baseAmount = quantity * rate;
    
    // Calculate discount amount
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = (baseAmount * discount) / 100;
    } else {
      discountAmount = discount;
    }
    
    // Calculate amount after discount
    const amount = baseAmount - discountAmount;
    
    // Calculate tax (only for GST invoices)
    const taxAmount = invoiceType === 'withGST' ? (amount * taxRate) / 100 : 0;
    
    // Calculate total amount
    const totalAmount = amount + taxAmount;
    
    return {
      ...item,
      amount: parseFloat(amount.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2))
    };
  };

  // Calculate overall totals
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const totalDiscount = items.reduce((sum, item) => {
      const baseAmount = item.quantity * item.rate;
      const discountAmount = item.discountType === 'percentage' 
        ? (baseAmount * item.discount) / 100 
        : item.discount;
      return sum + discountAmount;
    }, 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const grandTotal = items.reduce((sum, item) => sum + item.totalAmount, 0);

    setTotals({
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2))
    });
  };

  // Update item and recalculate totals
  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    updatedItems[index] = calculateItemTotals(updatedItems[index]);
    setItems(updatedItems);
  };

  // Add new item
  const addItem = () => {
    const newItem = {
      id: Date.now(),
      itemName: '',
      quantity: 1,
      unit: 'Pcs',
      rate: 0,
      discount: 0,
      discountType: 'percentage',
      taxRate: 18,
      amount: 0,
      taxAmount: 0,
      totalAmount: 0
    };
    setItems([...items, newItem]);
  };

  // Remove item
  const removeItem = (index) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle invoice type change
  const handleTypeChange = (type) => {
    setInvoiceType(type);
    setInvoiceData(prev => ({
      ...prev,
      invoiceNumber: type === 'withGST' ? 'GST-' + Date.now().toString().slice(-6) : 'INV-' + Date.now().toString().slice(-6)
    }));
    
    // Update tax rates based on type
    const updatedItems = items.map(item => {
      const updatedItem = { ...item, taxRate: type === 'withGST' ? 18 : 0 };
      return calculateItemTotals(updatedItem);
    });
    setItems(updatedItems);
  };

  // Save invoice
  const handleSave = () => {
    if (!invoiceData.customerName.trim()) {
      addToast && addToast('Please enter customer name', 'error');
      return;
    }

    if (items.some(item => !item.itemName.trim())) {
      addToast && addToast('Please fill all item names', 'error');
      return;
    }

    // Here you would typically save to database
    console.log('Saving invoice:', {
      invoiceType,
      invoiceData,
      items,
      totals,
      company: currentCompany,
      user: currentUser
    });

    addToast && addToast('Invoice saved successfully!', 'success');
  };

  // Recalculate totals when items change
  useEffect(() => {
    calculateTotals();
  }, [items]);

  return (
    <div className="new-sales-invoice">
      {/* Header */}
      <div className="invoice-header">
        <div className="header-content">
          <div className="header-icon">
            <FontAwesomeIcon icon={faFileContract} />
          </div>
          <div className="header-text">
            <h2>Sales Invoice</h2>
            <p>Create and manage sales invoices with or without GST</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="save-btn" onClick={handleSave}>
            <FontAwesomeIcon icon={faSave} />
            Save Invoice
          </button>
        </div>
      </div>

      {/* Form Container */}
      <div className="invoice-form-container">
        <div className="invoice-form">
          
          {/* Invoice Type Selection */}
          <div className="form-section">
            <h3>Invoice Type</h3>
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faPercentage} />
                  Invoice Type
                </label>
                <select 
                  value={invoiceType} 
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <option value="withGST">With GST</option>
                  <option value="withoutGST">Without GST</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faHashtag} />
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faMoneyBillWave} />
                  Payment Terms
                </label>
                <select 
                  value={invoiceData.paymentTerms} 
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                </select>
              </div>
              <div className="form-group">
                {/* Empty for spacing */}
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="form-section">
            <h3>Customer Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faUser} />
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={invoiceData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faPhone} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={invoiceData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faEnvelope} />
                  Email Address
                </label>
                <input
                  type="email"
                  value={invoiceData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group full-width">
                <label>
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  Address
                </label>
                <textarea
                  value={invoiceData.customerAddress}
                  onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                  placeholder="Enter customer address"
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>Invoice Items</h3>
              <button className="add-item-btn" onClick={addItem}>
                <FontAwesomeIcon icon={faPlus} />
                Add Item
              </button>
            </div>
            
            <div className="items-container">
              {items.map((item, index) => (
                <div key={item.id} className="item-card">
                  <div className="item-card-header">
                    <h4>Item #{index + 1}</h4>
                    <button 
                      className="remove-item-btn"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                  <div className="item-card-content">
                    <div className="item-row">
                      <div className="item-field">
                        <label>
                          <FontAwesomeIcon icon={faBoxes} />
                          Item Name *
                        </label>
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                          placeholder="Enter item name"
                        />
                      </div>
                      <div className="item-field">
                        <label>
                          <FontAwesomeIcon icon={faHashtag} />
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="item-field">
                        <label>Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        >
                          <option value="Pcs">Pieces</option>
                          <option value="Kg">Kilogram</option>
                          <option value="Ltr">Liter</option>
                          <option value="Mtr">Meter</option>
                          <option value="Box">Box</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="item-row">
                      <div className="item-field">
                        <label>
                          <FontAwesomeIcon icon={faRupeeSign} />
                          Rate
                        </label>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="item-field">
                        <label>
                          <FontAwesomeIcon icon={faPercentage} />
                          Discount
                        </label>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="item-field">
                        <label>Discount Type</label>
                        <select
                          value={item.discountType}
                          onChange={(e) => updateItem(index, 'discountType', e.target.value)}
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                      </div>
                    </div>

                    {invoiceType === 'withGST' && (
                      <div className="item-row">
                        <div className="item-field">
                          <label>
                            <FontAwesomeIcon icon={faPercentage} />
                            GST Rate (%)
                          </label>
                          <select
                            value={item.taxRate}
                            onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                        <div className="item-field">
                          <label>GST Amount</label>
                          <input
                            type="text"
                            value={`₹${item.taxAmount.toFixed(2)}`}
                            readOnly
                            className="readonly-field"
                          />
                        </div>
                        <div className="item-field">
                          <label>Total Amount</label>
                          <input
                            type="text"
                            value={`₹${item.totalAmount.toFixed(2)}`}
                            readOnly
                            className="readonly-field"
                          />
                        </div>
                      </div>
                    )}

                    {invoiceType === 'withoutGST' && (
                      <div className="item-row">
                        <div className="item-field">
                          <label>Amount After Discount</label>
                          <input
                            type="text"
                            value={`₹${item.amount.toFixed(2)}`}
                            readOnly
                            className="readonly-field"
                          />
                        </div>
                        <div className="item-field">
                          <label>Total Amount</label>
                          <input
                            type="text"
                            value={`₹${item.totalAmount.toFixed(2)}`}
                            readOnly
                            className="readonly-field"
                          />
                        </div>
                        <div className="item-field">
                          {/* Empty for spacing */}
                        </div>
                      </div>
                    )}

                    <div className="item-calculations">
                      <div className="calc-item">
                        <label>Base Amount</label>
                        <div className="amount">₹{(item.quantity * item.rate).toFixed(2)}</div>
                      </div>
                      <div className="calc-item">
                        <label>After Discount</label>
                        <div className="amount">₹{item.amount.toFixed(2)}</div>
                      </div>
                      {invoiceType === 'withGST' && (
                        <>
                          <div className="calc-item">
                            <label>GST Amount</label>
                            <div className="amount">₹{item.taxAmount.toFixed(2)}</div>
                          </div>
                          <div className="calc-item total-calc">
                            <label>Total Amount</label>
                            <div className="amount">₹{item.totalAmount.toFixed(2)}</div>
                          </div>
                        </>
                      )}
                      {invoiceType === 'withoutGST' && (
                        <div className="calc-item total-calc">
                          <label>Total Amount</label>
                          <div className="amount">₹{item.totalAmount.toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div className="form-section">
            <h3>Additional Notes</h3>
            <div className="form-row">
              <div className="form-group full-width">
                <label>Notes & Terms</label>
                <textarea
                  value={invoiceData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter any additional notes, terms, or conditions..."
                  rows="4"
                />
              </div>
            </div>
          </div>

          {/* Totals Section */}
          <div className="totals-section">
            <div className="total-card">
              <div className="total-row">
                <label>Subtotal:</label>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <label>Total Discount:</label>
                <span>-₹{totals.totalDiscount.toFixed(2)}</span>
              </div>
              {invoiceType === 'withGST' && (
                <div className="total-row">
                  <label>Total GST:</label>
                  <span>₹{totals.totalTax.toFixed(2)}</span>
                </div>
              )}
              <div className="total-row grand-total">
                <label>Grand Total:</label>
                <span>₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NewSalesInvoice;