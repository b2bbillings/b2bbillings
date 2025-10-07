import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faTrash, 
  faSave, 
  faReceipt,
  faUser,
  faCalendarAlt,
  faHashtag,
  faBuilding
} from '@fortawesome/free-solid-svg-icons';
import BillPreview from './BillPreview';
import './SalesWithoutGST.css';

const SalesWithoutGST = () => {
  const [billData, setBillData] = useState({
    serialNo: '',
    clientName: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    invoiceNo: '',
    items: [
      {
        id: 1,
        name: '',
        quantity: 1,
        rate: 0,
        taxRate: 0,
        amount: 0,
        taxAmount: 0,
        totalAmount: 0
      }
    ]
  });

  const [showPreview, setShowPreview] = useState(false);
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Generate automatic invoice number
    const today = new Date();
    const invoiceNo = `BILL-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    setBillData(prev => ({ ...prev, invoiceNo }));

    // Load clients and items from localStorage or API
    loadClientsAndItems();
  }, []);

  const loadClientsAndItems = () => {
    // Placeholder for loading clients and items
    setClients([
      { id: 1, name: 'ABC Company', address: '123 Business St, City' },
      { id: 2, name: 'XYZ Enterprises', address: '456 Commerce Ave, Town' },
      { id: 3, name: 'Individual Customer', address: '789 Residential Area, City' }
    ]);
    
    setItems([
      { id: 1, name: 'Product A', rate: 100 },
      { id: 2, name: 'Product B', rate: 200 },
      { id: 3, name: 'Service C', rate: 500 }
    ]);
  };

  const handleInputChange = (field, value) => {
    setBillData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    if (client) {
      setBillData(prev => ({
        ...prev,
        clientName: client.name,
        clientAddress: client.address
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...billData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Recalculate amounts
    if (field === 'quantity' || field === 'rate') {
      const item = updatedItems[index];
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      
      item.amount = quantity * rate;
      item.totalAmount = item.amount;
    }

    setBillData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleItemSelect = (index, itemId) => {
    const selectedItem = items.find(item => item.id === parseInt(itemId));
    if (selectedItem) {
      handleItemChange(index, 'name', selectedItem.name);
      handleItemChange(index, 'rate', selectedItem.rate);
    }
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      name: '',
      quantity: 1,
      rate: 0,
      taxRate: 0,
      amount: 0,
      taxAmount: 0,
      totalAmount: 0
    };
    
    setBillData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index) => {
    if (billData.items.length > 1) {
      const updatedItems = billData.items.filter((_, i) => i !== index);
      setBillData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };

  const calculateTotals = () => {
    const subtotal = billData.items.reduce((sum, item) => sum + item.amount, 0);
    const grandTotal = subtotal; // No tax for non-GST
    
    return { subtotal, totalTax: 0, grandTotal };
  };

  const handleSaveBill = () => {
    // Comprehensive validation
    const missingFields = [];
    
    if (!billData.serialNo?.trim()) missingFields.push('Serial No');
    if (!billData.clientName?.trim()) missingFields.push('Client Name');
    if (!billData.clientAddress?.trim()) missingFields.push('Client Address');
    if (!billData.invoiceNo?.trim()) missingFields.push('Bill No');
    
    // Check items
    const invalidItems = billData.items.filter(item => 
      !item.name?.trim() || 
      !item.quantity || 
      item.quantity <= 0 || 
      !item.rate || 
      item.rate <= 0
    );
    
    if (invalidItems.length > 0) {
      missingFields.push(`Item details (${invalidItems.length} item(s) incomplete)`);
    }
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n• ${missingFields.join('\n• ')}`);
      return;
    }

    const totals = calculateTotals();
    const completeBillData = {
      ...billData,
      ...totals,
      type: 'NON_GST',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage (in real app, save to database)
    const existingBills = JSON.parse(localStorage.getItem('salesBills') || '[]');
    existingBills.push(completeBillData);
    localStorage.setItem('salesBills', JSON.stringify(existingBills));

    alert('Bill saved successfully!');
    setShowPreview(true);
  };

  const { subtotal, totalTax, grandTotal } = calculateTotals();

  if (showPreview) {
    const completePreviewData = {
      ...billData,
      subtotal,
      totalTax,
      grandTotal,
      type: 'NON_GST',
      createdAt: new Date().toISOString()
    };
    
    return (
      <BillPreview 
        billData={completePreviewData}
        onBack={() => setShowPreview(false)}
        onEdit={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="sales-without-gst">
      <div className="sales-header">
        <div className="header-content">
          <FontAwesomeIcon icon={faReceipt} className="header-icon" />
          <div>
            <h2>Sales without GST</h2>
            <p>Create simple invoices and bills without GST compliance</p>
          </div>
        </div>
      </div>

      <div className="sales-form-container">
        <form className="sales-form">
          {/* Basic Details Section */}
          <div className="form-section">
            <h3>Basic Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faHashtag} />
                  Serial No *
                </label>
                <input
                  type="text"
                  value={billData.serialNo}
                  onChange={(e) => handleInputChange('serialNo', e.target.value)}
                  placeholder="e.g., BILL-001, BILL-002..."
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  Date *
                </label>
                <input
                  type="date"
                  value={billData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faReceipt} />
                  Bill No *
                </label>
                <input
                  type="text"
                  value={billData.invoiceNo}
                  onChange={(e) => handleInputChange('invoiceNo', e.target.value)}
                  placeholder="Auto-generated"
                  required
                />
              </div>
            </div>
          </div>

          {/* Client Details Section */}
          <div className="form-section">
            <h3>Client Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faUser} />
                  Select Client
                </label>
                <select onChange={(e) => handleClientSelect(e.target.value)}>
                  <option value="">Select existing client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faUser} />
                  Client Name *
                </label>
                <input
                  type="text"
                  value={billData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Enter client name"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group full-width">
                <label>
                  <FontAwesomeIcon icon={faBuilding} />
                  Address *
                </label>
                <textarea
                  value={billData.clientAddress}
                  onChange={(e) => handleInputChange('clientAddress', e.target.value)}
                  placeholder="Enter client address"
                  rows="3"
                  required
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="form-section">
            <div className="section-header">
              <h3>Items</h3>
              <button type="button" className="add-item-btn" onClick={addItem}>
                <FontAwesomeIcon icon={faPlus} />
                Add Item
              </button>
            </div>
            
            <div className="items-container">
              {billData.items.map((item, index) => (
                <div key={item.id} className="item-card">
                  <div className="item-card-header">
                    <h4>Item #{index + 1}</h4>
                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => removeItem(index)}
                      disabled={billData.items.length === 1}
                      title="Remove Item"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                  
                  <div className="item-card-content">
                    {/* Item Selection Row */}
                    <div className="item-row">
                      <div className="item-field">
                        <label>Select from List</label>
                        <select onChange={(e) => handleItemSelect(index, e.target.value)}>
                          <option value="">Choose existing item</option>
                          {items.map(availableItem => (
                            <option key={availableItem.id} value={availableItem.id}>
                              {availableItem.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="item-field">
                        <label>Item Name *</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          placeholder="Enter item name"
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Quantity, Rate and Tax Row */}
                    <div className="item-row">
                      <div className="item-field">
                        <label>Quantity *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          min="1"
                          step="0.01"
                          placeholder="Enter quantity"
                          required
                        />
                      </div>
                      <div className="item-field">
                        <label>Rate (₹) *</label>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="Enter rate"
                          required
                        />
                      </div>

                    </div>
                    
                    {/* Calculation Results Row */}
                    <div className="item-calculations">
                      <div className="calc-item">
                        <label>Amount</label>
                        <span className="amount">₹{item.amount.toFixed(2)}</span>
                      </div>

                      <div className="calc-item total-calc">
                        <label>Total Amount</label>
                        <span className="amount total">₹{item.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Section */}
          <div className="form-section totals-section">
            <div className="totals-container">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Total Tax:</span>
                <span>₹{totalTax.toFixed(2)}</span>
              </div>
              <div className="total-row grand-total">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button type="button" className="save-btn" onClick={handleSaveBill}>
              <FontAwesomeIcon icon={faSave} />
              Save & Preview Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesWithoutGST;