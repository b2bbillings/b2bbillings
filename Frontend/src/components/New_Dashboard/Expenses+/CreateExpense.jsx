import React, { useState, useEffect } from 'react';
import { expenseIncomeCategoryService } from '../../../services/categoryService';
import './CreateExpense.css';

const CreateExpense = ({ onBack, onCreate, isLoading = false }) => {
  const [formData, setFormData] = useState({
    expenseDate: new Date().toISOString().split('T')[0],
    billName: '',
    amount: '',
    paymentDone: '',
    customPaymentMethod: '',
    category: '',
    uploadedBill: null,
    notes: ''
  });

  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await expenseIncomeCategoryService.getExpenseCategories();
      
      if (response.success) {
        setCategories(response.data || []);
      } else {
        console.error('Failed to fetch categories:', response.message);
        // Initialize default categories if none exist
        await initializeDefaultCategories();
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      await initializeDefaultCategories();
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const initializeDefaultCategories = async () => {
    try {
      const response = await expenseIncomeCategoryService.initializeExpenseCategories();
      if (response.success) {
        await fetchCategories();
      }
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const response = await expenseIncomeCategoryService.createExpenseCategory({
        name: newCategoryName.trim(),
        description: `Custom expense category: ${newCategoryName.trim()}`,
        color: '#6c757d',
        icon: '💰'
      });

      if (response.success) {
        await fetchCategories();
        setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
        setNewCategoryName('');
        setShowAddCategory(false);
        alert('Category created successfully!');
      } else {
        alert(`Failed to create category: ${response.message}`);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert(`Error creating category: ${error.message}`);
    }
  };

  const paymentMethods = [
    'GPay',
    'PhonePe', 
    'Cash',
    'Check',
    'Other Payment Way'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({
      ...prev,
      uploadedBill: file
    }));
  };

  const handleKeyDown = (e, nextFieldId) => {
    if (e.key === 'Enter' && nextFieldId) {
      e.preventDefault();
      const nextField = document.getElementById(nextFieldId);
      if (nextField) {
        nextField.focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoading) {
      return; // Prevent multiple submissions
    }
    
    if (!formData.billName || !formData.amount || !formData.category) {
      alert('Please fill in required fields: Bill Name, Amount and Category');
      return;
    }

    if (formData.paymentDone === 'Other Payment Way' && !formData.customPaymentMethod.trim()) {
      alert('Please enter the custom payment method name');
      return;
    }

    // Prepare final data with custom payment method if applicable
    const finalData = {
      ...formData,
      paymentDone: formData.paymentDone === 'Other Payment Way' 
        ? formData.customPaymentMethod 
        : formData.paymentDone
    };

    await onCreate(finalData);
  };

  return (
    <div className="create-expense-container">
      <div className="expense-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Expenses
        </button>
        <div className="header-content">
          <h1>Create Expense</h1>
          <div className="keyboard-shortcuts-hint">
            💡 Press <kbd>Enter</kbd> to move to next field • <kbd>Ctrl+Enter</kbd> in notes to submit
          </div>
        </div>
      </div>

      <div className="expense-form-container">
        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-section">
            <div className="basic-details-header">
              <h3>Basic Details</h3>
              <div className="date-field-right">
                <label htmlFor="expenseDate">Date</label>
                <input
                  type="date"
                  id="expenseDate"
                  value={formData.expenseDate}
                  onChange={(e) => handleInputChange('expenseDate', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'billName')}
                  className="form-input date-input"
                />
              </div>
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="billName">Bill Name *</label>
              <input
                type="text"
                id="billName"
                value={formData.billName}
                onChange={(e) => handleInputChange('billName', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'amount')}
                placeholder="Enter bill or expense name"
                className="form-input"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="amount">Expense Amount *</label>
                <div className="amount-input">
                  <span className="currency">₹</span>
                  <input
                    type="number"
                    id="amount"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'paymentDone')}
                    placeholder="0.00"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="paymentDone">Payment Done</label>
                <select
                  id="paymentDone"
                  value={formData.paymentDone}
                  onChange={(e) => handleInputChange('paymentDone', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, formData.paymentDone === 'Other Payment Way' ? 'customPaymentMethod' : 'category')}
                  className="form-input"
                >
                  <option value="">Select Payment Method</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
                
                {formData.paymentDone === 'Other Payment Way' && (
                  <div className="custom-payment-input" style={{marginTop: '8px'}}>
                    <input
                      type="text"
                      id="customPaymentMethod"
                      value={formData.customPaymentMethod}
                      onChange={(e) => handleInputChange('customPaymentMethod', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'category')}
                      placeholder="Enter payment method name"
                      className="form-input"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowAddCategory(true);
                    } else {
                      handleInputChange('category', e.target.value);
                    }
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'uploadBill')}
                  className="form-input"
                  required
                  disabled={isLoadingCategories}
                >
                  <option value="">
                    {isLoadingCategories ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {categories.map(cat => (
                    <option key={cat._id || cat.name} value={cat.name}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                  <option value="__add_new__" style={{ fontWeight: 'bold', color: '#4285f4' }}>
                    ➕ Add New Category
                  </option>
                </select>
                
                {showAddCategory && (
                  <div className="add-category-modal">
                    <div className="add-category-content">
                      <h4>Add New Category</h4>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="form-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCategory();
                          } else if (e.key === 'Escape') {
                            setShowAddCategory(false);
                            setNewCategoryName('');
                          }
                        }}
                        autoFocus
                      />
                      <div className="add-category-actions">
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowAddCategory(false);
                            setNewCategoryName('');
                          }}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button" 
                          onClick={handleAddCategory}
                          className="btn-add"
                        >
                          Add Category
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="uploadBill">Upload Bill</label>
                <div className="upload-area">
                  <input
                    type="file"
                    id="uploadBill"
                    onChange={handleFileUpload}
                    accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls"
                    className="file-input"
                  />
                  <label htmlFor="uploadBill" className="file-upload-label">
                    <div className="upload-icon">📁</div>
                    <div className="upload-text">
                      <p>Click to upload bill or receipt</p>
                      <small>Supports: JPG, PNG, PDF, Excel files</small>
                    </div>
                  </label>
                  {formData.uploadedBill && (
                    <div className="uploaded-file">
                      <span>📄 {formData.uploadedBill.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    document.querySelector('.btn-primary').click();
                  }
                }}
                placeholder="Add notes about this expense... (Ctrl+Enter to submit)"
                className="form-textarea"
                rows="2"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onBack}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExpense;