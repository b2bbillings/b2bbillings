import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faTrash, 
  faSave, 
  faFileInvoiceDollar,
  faUser,
  faCalendarAlt,
  faHashtag,
  faBuilding
} from '@fortawesome/free-solid-svg-icons';
import BillPreview from './BillPreview';
import './SalesWithGST.css';

const SalesWithGST = () => {
  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Generate serial number
  const generateSerialNo = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `GST-${timestamp}`;
  };

  const [billData, setBillData] = useState({
    serialNo: generateSerialNo(),
    date: getCurrentDate(),
    invoiceNo: '',
    partyId: '',
    partyName: '',
    items: [
      {
        id: 1,
        name: '',
        quantity: '',
        rate: '',
        gstRate: '',
        amount: 0,
        gstAmount: 0,
        totalAmount: 0
      }
    ]
  });

  const [showPreview, setShowPreview] = useState(false);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load parties and items from API
    loadPartiesAndItems();
  }, []);

  const loadPartiesAndItems = async () => {
    setLoading(true);
    try {
      // Load parties from API
      const partiesResponse = await fetch('/api/parties');
      if (partiesResponse.ok) {
        const partiesData = await partiesResponse.json();
        setParties(partiesData);
      } else {
        console.error('Failed to load parties');
        // Fallback data for development
        setParties([
          { _id: '1', name: 'ABC Company', partyType: 'customer' },
          { _id: '2', name: 'XYZ Enterprises', partyType: 'customer' },
          { _id: '3', name: 'DEF Vendor', partyType: 'vendor' }
        ]);
      }
      
      // Load items - keep existing placeholder
      setItems([
        { id: 1, name: 'Product A', rate: 100 },
        { id: 2, name: 'Product B', rate: 200 },
        { id: 3, name: 'Service C', rate: 500 }
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback data for development
      setParties([
        { _id: '1', name: 'ABC Company', partyType: 'customer' },
        { _id: '2', name: 'XYZ Enterprises', partyType: 'customer' },
        { _id: '3', name: 'DEF Vendor', partyType: 'vendor' }
      ]);
      setItems([
        { id: 1, name: 'Product A', rate: 100 },
        { id: 2, name: 'Product B', rate: 200 },
        { id: 3, name: 'Service C', rate: 500 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setBillData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePartySelect = (partyId) => {
    const party = parties.find(p => p._id === partyId);
    if (party) {
      setBillData(prev => ({
        ...prev,
        partyId: party._id,
        partyName: party.name
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
    if (field === 'quantity' || field === 'rate' || field === 'gstRate') {
      const item = updatedItems[index];
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;
      
      item.amount = quantity * rate;
      item.gstAmount = (item.amount * gstRate) / 100;
      item.totalAmount = item.amount + item.gstAmount;
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
      gstRate: 18,
      amount: 0,
      gstAmount: 0,
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
    const totalGST = billData.items.reduce((sum, item) => sum + item.gstAmount, 0);
    const grandTotal = subtotal + totalGST;
    
    return { subtotal, totalGST, grandTotal };
  };

  const handleSaveBill = async () => {
    // Comprehensive validation
    const missingFields = [];
    
    if (!billData.serialNo?.trim()) missingFields.push('Serial No');
    if (!billData.invoiceNo?.trim()) missingFields.push('Invoice No');
    if (!billData.partyId?.trim()) missingFields.push('Party Name');
    if (!billData.date?.trim()) missingFields.push('Date');
    
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
      type: 'GST',
      createdAt: new Date().toISOString()
    };

    try {
      setLoading(true);
      // Save to backend API
      const response = await fetch('/api/sales/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeBillData)
      });

      if (response.ok) {
        alert('Bill saved successfully!');
        setShowPreview(true);
      } else {
        throw new Error('Failed to save bill');
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      // Fallback to localStorage for development
      const existingBills = JSON.parse(localStorage.getItem('salesBills') || '[]');
      existingBills.push(completeBillData);
      localStorage.setItem('salesBills', JSON.stringify(existingBills));
      alert('Bill saved successfully (locally)!');
      setShowPreview(true);
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, totalGST, grandTotal } = calculateTotals();

  if (showPreview) {
    const completePreviewData = {
      ...billData,
      subtotal,
      totalGST,
      grandTotal,
      type: 'GST',
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
    <div className="sales-with-gst">
      <div className="sales-header">
        <div className="header-content">
          <FontAwesomeIcon icon={faFileInvoiceDollar} className="header-icon" />
          <div>
            <h2>Sales with GST</h2>
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
                  <FontAwesomeIcon icon={faFileInvoiceDollar} />
                  Invoice No *
                </label>
                <input
                  type="text"
                  value={billData.invoiceNo}
                  onChange={(e) => handleInputChange('invoiceNo', e.target.value)}
                  placeholder="Enter invoice number"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faUser} />
                  Party Name *
                </label>
                <select 
                  value={billData.partyId}
                  onChange={(e) => handlePartySelect(e.target.value)}
                  required
                >
                  <option value="">Select party (customer/vendor)</option>
                  {parties.map(party => (
                    <option key={party._id} value={party._id}>
                      {party.name} ({party.partyType})
                    </option>
                  ))}
                </select>
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
                      {/* <div className="item-field">
                        <label>Select from List</label>
                        <select onChange={(e) => handleItemSelect(index, e.target.value)}>
                          <option value="">Choose existing item</option>
                          {items.map(availableItem => (
                            <option key={availableItem.id} value={availableItem.id}>
                              {availableItem.name}
                            </option>
                          ))}
                        </select>
                      </div> */}
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
                    
                    {/* Quantity and Rate Row */}
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
                      <div className="item-field">
                        <label>GST % *</label>
                        <input
                          type="number"
                          value={item.gstRate}
                          onChange={(e) => handleItemChange(index, 'gstRate', e.target.value)}
                          min="0"
                          max="28"
                          step="0.01"
                          placeholder="GST rate"
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Calculation Results Row */}
                    <div className="item-calculations">
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

          {/* Action Buttons */}
          <div className="form-actions">
            <button 
              type="button" 
              className="save-btn" 
              onClick={handleSaveBill}
              disabled={loading}
            >
              <FontAwesomeIcon icon={faSave} />
              {loading ? 'Saving...' : 'Save & Preview Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesWithGST;