import React, { useState, useEffect } from 'react';
import ExpenseCategories from './ExpenseCategories';
import CreateExpense from './CreateExpense';
import { expenseService } from '../../../services/expenseService';
import './Expense.css';

const Expense = () => {
  const [activeView, setActiveView] = useState('main');
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);

  // Fetch expenses from database
  const fetchExpenses = async () => {
    try {
      setIsLoadingExpenses(true);
      console.log('Fetching expenses from database...');
      
      const response = await expenseService.getAllExpenses({
        page: 1,
        limit: 10,
        sortBy: 'expenseDate',
        sortOrder: 'desc'
      });
      
      console.log('Fetched expenses:', response);
      
      if (response.success && response.data && response.data.expenses) {
        setExpenses(response.data.expenses);
      } else {
        console.warn('No expenses data in response:', response);
        setExpenses([]);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  // Load expenses when component mounts
  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateExpense = async (expenseData) => {
    setIsLoading(true);
    try {
      console.log('Creating expense with data:', expenseData);
      
      // Call the API to create expense in database
      const response = await expenseService.createExpense(expenseData);
      
      console.log('Expense created successfully:', response);
      
      // Refresh the expenses list from database
      await fetchExpenses();
      
      setActiveView('main');
      
      // Show success message
      alert('Expense created successfully and saved to database!');
      
    } catch (error) {
      console.error('Error creating expense:', error);
      alert(`Failed to create expense: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMainView = () => (
    <div className="expense-container">
      <div className="expense-header">
        <h1 className="expense-title">
          Expenses <span className="expense-icon">▶</span>
        </h1>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={() => setActiveView('categories')}
          >
            📋 Expense Categories
          </button>
          <button 
            className="btn-primary"
            onClick={() => setActiveView('create')}
          >
            ➕ Create Expense
          </button>
        </div>
      </div>

      <div className="expense-content">
        <div className="expense-hero">
          <div className="hero-image">
            <img 
              src="/api/placeholder/400/300" 
              alt="Woman working with expenses" 
              className="hero-illustration"
            />
          </div>
          <div className="hero-text">
            <h2>All your Expenses at one place.</h2>
            <div className="features-list">
              <div className="feature-item">
                <span className="check-icon">✓</span>
                Track all of your business Expenses in one place
              </div>
              <div className="feature-item">
                <span className="check-icon">✓</span>
                Easily record your Expenses across various categories
              </div>
              <div className="feature-item">
                <span className="check-icon">✓</span>
                Discover business insights through Expense report
              </div>
            </div>
            <button 
              className="btn-record-expense"
              onClick={() => setActiveView('create')}
            >
              ➕ Record your Expenses
            </button>
          </div>
        </div>

        {isLoadingExpenses ? (
          <div className="expenses-loading">
            <p>Loading expenses...</p>
          </div>
        ) : expenses.length > 0 ? (
          <div className="expenses-summary">
            <h3>Recent Expenses ({expenses.length} total)</h3>
            <div className="expenses-grid">
              {expenses.slice(0, 6).map(expense => (
                <div key={expense._id || expense.id} className="expense-card">
                  <div className="expense-card-header">
                    <span className="expense-category">{expense.category}</span>
                    <span className="expense-amount">₹{expense.amount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="expense-card-body">
                    <h4 className="expense-bill-name">{expense.billName}</h4>
                    <p className="expense-notes">{expense.notes || 'No notes'}</p>
                    <div className="expense-meta">
                      <span className="expense-date">
                        {new Date(expense.expenseDate).toLocaleDateString('en-IN')}
                      </span>
                      <span className="expense-payment">{expense.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {expenses.length > 6 && (
              <div className="view-all-expenses">
                <button className="btn-view-all" onClick={() => alert('View all expenses functionality coming soon!')}>
                  View All {expenses.length} Expenses
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="no-expenses">
            <p>No expenses found. Create your first expense!</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="expense-wrapper">
      {activeView === 'main' && renderMainView()}
      {activeView === 'categories' && (
        <ExpenseCategories onBack={() => setActiveView('main')} />
      )}
      {activeView === 'create' && (
        <CreateExpense 
          onBack={() => setActiveView('main')}
          onCreate={handleCreateExpense}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default Expense;
