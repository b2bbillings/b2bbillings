import React, { useState, useEffect } from 'react';
import { expenseIncomeCategoryService } from '../../../services/categoryService';
import './ExpenseCategories.css';

const ExpenseCategories = ({ onBack }) => {
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' or 'income'
  const [isLoading, setIsLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories on component mount
  useEffect(() => {
    fetchAllCategories();
  }, []);

  const fetchAllCategories = async () => {
    try {
      setIsLoading(true);
      
      // Fetch both expense and income categories
      const [expenseResponse, incomeResponse] = await Promise.all([
        expenseIncomeCategoryService.getExpenseCategories(),
        expenseIncomeCategoryService.getIncomeCategories()
      ]);
      
      if (expenseResponse.success) {
        setExpenseCategories(expenseResponse.data || []);
      } else {
        console.error('Failed to fetch expense categories:', expenseResponse.message);
        await expenseIncomeCategoryService.initializeExpenseCategories();
        const retryExpense = await expenseIncomeCategoryService.getExpenseCategories();
        if (retryExpense.success) {
          setExpenseCategories(retryExpense.data || []);
        }
      }
      
      if (incomeResponse.success) {
        setIncomeCategories(incomeResponse.data || []);
      } else {
        console.error('Failed to fetch income categories:', incomeResponse.message);
        await expenseIncomeCategoryService.initializeIncomeCategories();
        const retryIncome = await expenseIncomeCategoryService.getIncomeCategories();
        if (retryIncome.success) {
          setIncomeCategories(retryIncome.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      setIsSubmitting(true);
      const categoryData = {
        name: categoryName.trim(),
        description: categoryDescription.trim() || `${activeTab === 'expense' ? 'Expense' : 'Income'} category: ${categoryName.trim()}`,
        color: activeTab === 'expense' ? '#dc3545' : '#28a745',
        icon: activeTab === 'expense' ? '💸' : '💰'
      };

      const response = activeTab === 'expense' 
        ? await expenseIncomeCategoryService.createExpenseCategory(categoryData)
        : await expenseIncomeCategoryService.createIncomeCategory(categoryData);

      if (response.success) {
        await fetchAllCategories();
        resetModal();
        alert(`${activeTab === 'expense' ? 'Expense' : 'Income'} category created successfully!`);
      } else {
        alert(`Failed to create category: ${response.message}`);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert(`Error creating category: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setShowAddModal(true);
  };

  const handleUpdateCategory = async () => {
    if (!categoryName.trim() || !editingCategory) {
      alert('Please enter a category name');
      return;
    }

    try {
      setIsSubmitting(true);
      const categoryData = {
        name: categoryName.trim(),
        description: categoryDescription.trim() || editingCategory.description
      };

      const response = activeTab === 'expense'
        ? await expenseIncomeCategoryService.updateExpenseCategory(editingCategory._id, categoryData)
        : await expenseIncomeCategoryService.updateIncomeCategory(editingCategory._id, categoryData);

      if (response.success) {
        await fetchAllCategories();
        resetModal();
        alert(`${activeTab === 'expense' ? 'Expense' : 'Income'} category updated successfully!`);
      } else {
        alert(`Failed to update category: ${response.message}`);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert(`Error updating category: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Are you sure you want to delete the category "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = activeTab === 'expense'
        ? await expenseIncomeCategoryService.deleteExpenseCategory(category._id)
        : await expenseIncomeCategoryService.deleteIncomeCategory(category._id);

      if (response.success) {
        await fetchAllCategories();
        alert(`${activeTab === 'expense' ? 'Expense' : 'Income'} category deleted successfully!`);
      } else {
        alert(`Failed to delete category: ${response.message}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(`Error deleting category: ${error.message}`);
    }
  };

  const resetModal = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
  };

  // Get current categories based on active tab
  const currentCategories = activeTab === 'expense' ? expenseCategories : incomeCategories;

  return (
    <div className="expense-categories-container">
      <div className="categories-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Expenses
        </button>
        <h1>Category Management</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          ➕ Add {activeTab === 'expense' ? 'Expense' : 'Income'} Category
        </button>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        <button 
          className={`tab-button ${activeTab === 'expense' ? 'active' : ''}`}
          onClick={() => setActiveTab('expense')}
        >
          💸 Expense Categories ({expenseCategories.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'income' ? 'active' : ''}`}
          onClick={() => setActiveTab('income')}
        >
          💰 Income Categories ({incomeCategories.length})
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading categories...</p>
        </div>
      ) : (
        <div className="categories-table-container">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentCategories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="no-categories">
                    No {activeTab} categories found. Click "Add Category" to create one.
                  </td>
                </tr>
              ) : (
                currentCategories.map(category => (
                  <tr key={category._id}>
                    <td className="category-name">
                      <span className="category-icon">{category.icon}</span>
                      {category.name}
                    </td>
                    <td className="category-description">{category.description}</td>
                    <td className="category-date">
                      {new Date(category.createdAt).toLocaleDateString()}
                    </td>
                    <td className="category-actions">
                      <button 
                        className="btn-edit"
                        onClick={() => handleEditCategory(category)}
                        title="Edit Category"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteCategory(category)}
                        title="Delete Category"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {editingCategory ? 'Edit' : 'Add New'} {activeTab === 'expense' ? 'Expense' : 'Income'} Category
              </h3>
              <button className="btn-close" onClick={resetModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="categoryName">Category Name *</label>
                <input
                  type="text"
                  id="categoryName"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="categoryDescription">Description (Optional)</label>
                <textarea
                  id="categoryDescription"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Enter category description"
                  className="form-input"
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={resetModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                disabled={isSubmitting || !categoryName.trim()}
              >
                {isSubmitting ? 'Saving...' : (editingCategory ? 'Update' : 'Add')} Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseCategories;