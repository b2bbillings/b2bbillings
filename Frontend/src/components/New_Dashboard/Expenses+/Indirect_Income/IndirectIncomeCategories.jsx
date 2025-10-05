import React, { useState } from 'react';
import './IndirectIncomeCategories.css';

const IndirectIncomeCategories = ({ onBack }) => {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Interest Income', description: 'Income from bank deposits, bonds, loans', createdAt: new Date().toISOString() },
    { id: 2, name: 'Dividend Income', description: 'Income from stock dividends and investments', createdAt: new Date().toISOString() },
    { id: 3, name: 'Rental Income', description: 'Income from property rentals', createdAt: new Date().toISOString() },
    { id: 4, name: 'Royalty Income', description: 'Income from royalties and licensing', createdAt: new Date().toISOString() },
    { id: 5, name: 'Commission Income', description: 'Income from commissions and referrals', createdAt: new Date().toISOString() },
    { id: 6, name: 'Referral Income', description: 'Income from referral programs', createdAt: new Date().toISOString() },
    { id: 7, name: 'Investment Returns', description: 'Returns from various investments', createdAt: new Date().toISOString() },
    { id: 8, name: 'License Fees', description: 'Income from licensing agreements', createdAt: new Date().toISOString() },
    { id: 9, name: 'Subscription Income', description: 'Recurring subscription revenue', createdAt: new Date().toISOString() },
    { id: 10, name: 'Other Income', description: 'Miscellaneous indirect income', createdAt: new Date().toISOString() }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryData, setCategoryData] = useState({ name: '', description: '' });

  const handleAddCategory = () => {
    if (categoryData.name.trim()) {
      const newCategory = {
        id: Date.now(),
        name: categoryData.name.trim(),
        description: categoryData.description.trim(),
        createdAt: new Date().toISOString()
      };
      setCategories([...categories, newCategory]);
      setCategoryData({ name: '', description: '' });
      setShowAddModal(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryData({ name: category.name, description: category.description });
    setShowAddModal(true);
  };

  const handleUpdateCategory = () => {
    if (categoryData.name.trim() && editingCategory) {
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, name: categoryData.name.trim(), description: categoryData.description.trim() }
          : cat
      ));
      setCategoryData({ name: '', description: '' });
      setEditingCategory(null);
      setShowAddModal(false);
    }
  };

  const handleDeleteCategory = (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      setCategories(categories.filter(cat => cat.id !== categoryId));
    }
  };

  const resetModal = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    setCategoryData({ name: '', description: '' });
  };

  return (
    <div className="indirect-income-categories-container">
      <div className="categories-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Indirect Income
        </button>
        <h1>Indirect Income Categories</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          ➕ Add Category
        </button>
      </div>

      <div className="categories-table-container">
        <table className="categories-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.id}>
                <td className="category-name">{category.name}</td>
                <td className="category-description">{category.description}</td>
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
                    onClick={() => handleDeleteCategory(category.id)}
                    title="Delete Category"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <button className="btn-close" onClick={resetModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="categoryName">Category Name:</label>
                <input
                  type="text"
                  id="categoryName"
                  value={categoryData.name}
                  onChange={(e) => setCategoryData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter category name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="categoryDescription">Description:</label>
                <textarea
                  id="categoryDescription"
                  value={categoryData.description}
                  onChange={(e) => setCategoryData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter category description"
                  className="form-textarea"
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={resetModal}>
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
              >
                {editingCategory ? 'Update' : 'Add'} Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndirectIncomeCategories;