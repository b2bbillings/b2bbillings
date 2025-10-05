import React, { useState, useEffect } from 'react';
import IndirectIncomeCategories from './IndirectIncomeCategories';
import CreateIndirectIncome from './CreateIndirectIncome';
import { indirectIncomeService } from '../../../../services/indirectIncomeService';
import './IndirectIncome.css';

const IndirectIncome = () => {
  const [activeView, setActiveView] = useState('main');
  const [incomes, setIncomes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingIncomes, setIsLoadingIncomes] = useState(true);

  // Fetch indirect incomes from database
  const fetchIncomes = async () => {
    try {
      setIsLoadingIncomes(true);
      console.log('Fetching indirect incomes from database...');
      
      const response = await indirectIncomeService.getAllIndirectIncome({
        page: 1,
        limit: 10,
        sortBy: 'incomeDate',
        sortOrder: 'desc'
      });
      
      console.log('API Response for indirect incomes:', response);
      console.log('Response data structure:', response.data);
      console.log('Incomes array:', response.data?.incomes);
      
      if (response.success && response.data && response.data.incomes) {
        setIncomes(response.data.incomes);
      } else {
        console.warn('No indirect incomes data in response:', response);
        setIncomes([]);
      }
    } catch (error) {
      console.error('Error fetching indirect incomes:', error);
      setIncomes([]);
    } finally {
      setIsLoadingIncomes(false);
    }
  };

  // Load incomes when component mounts
  useEffect(() => {
    fetchIncomes();
  }, []);

  const handleCreateIncome = async (incomeData) => {
    setIsLoading(true);
    try {
      console.log('Creating indirect income with data:', incomeData);
      
      // Call the API to create indirect income in database
      const response = await indirectIncomeService.createIndirectIncome(incomeData);
      
      console.log('Indirect income created successfully:', response);
      
      // Refresh the incomes list from database
      await fetchIncomes();
      
      setActiveView('main');
      
      // Show success message
      alert('Indirect income created successfully and saved to database!');
      
    } catch (error) {
      console.error('Error creating indirect income:', error);
      alert(`Failed to create indirect income: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMainView = () => (
    <div className="indirect-income-container">
      <div className="indirect-income-header">
        <h1 className="indirect-income-title">
          Indirect Income <span className="income-icon">💰</span>
        </h1>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={() => setActiveView('categories')}
          >
            📋 Income Categories
          </button>
          <button 
            className="btn-primary"
            onClick={() => setActiveView('create')}
          >
            ➕ Create Income
          </button>
        </div>
      </div>

      <div className="indirect-income-content">
        <div className="income-hero">
          <div className="hero-image">
            <div className="income-illustration">
              <div className="money-stack">
                <div className="money-bill"></div>
                <div className="money-bill"></div>
                <div className="money-bill"></div>
              </div>
              <div className="income-chart">
                <div className="chart-bar" style={{ height: '60%' }}></div>
                <div className="chart-bar" style={{ height: '80%' }}></div>
                <div className="chart-bar" style={{ height: '100%' }}></div>
                <div className="chart-bar" style={{ height: '70%' }}></div>
              </div>
            </div>
          </div>
          <div className="hero-text">
            <h2>Manage all your Indirect Income streams.</h2>
            <div className="features-list">
              <div className="feature-item">
                <span className="check-icon">✓</span>
                Track all indirect income sources in one place
              </div>
              <div className="feature-item">
                <span className="check-icon">✓</span>
                Categorize income by different revenue streams
              </div>
              <div className="feature-item">
                <span className="check-icon">✓</span>
                Monitor payment status and payment methods
              </div>
              <div className="feature-item">
                <span className="check-icon">✓</span>
                Generate comprehensive income reports
              </div>
            </div>
            <button 
              className="btn-record-income"
              onClick={() => setActiveView('create')}
            >
              ➕ Record Income
            </button>
          </div>
        </div>

        {isLoadingIncomes ? (
          <div className="incomes-loading">
            <p>Loading indirect incomes...</p>
          </div>
        ) : incomes.length > 0 ? (
          <div className="incomes-summary">
            <h3>Recent Income Records ({incomes.length} total)</h3>
            <div className="incomes-grid">
              {incomes.slice(0, 6).map(income => (
                <div key={income._id || income.id} className="income-card">
                  <div className="income-card-header">
                    <span className="income-category">{income.category}</span>
                    <span className="income-amount">₹{income.amount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="income-card-body">
                    <h4 className="income-bill-name">{income.billName}</h4>
                    <p className="income-notes">{income.notes || 'No notes'}</p>
                    <div className="income-meta">
                      <span className="income-date">
                        {new Date(income.incomeDate || income.expenseDate).toLocaleDateString('en-IN')}
                      </span>
                      <span className="income-payment">{income.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {incomes.length > 6 && (
              <div className="view-all-incomes">
                <button className="btn-view-all" onClick={() => alert('View all income records functionality coming soon!')}>
                  View All {incomes.length} Income Records
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="no-incomes">
            <p>No income records found. Create your first income record!</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="indirect-income-wrapper">
      {activeView === 'main' && renderMainView()}
      {activeView === 'categories' && (
        <IndirectIncomeCategories onBack={() => setActiveView('main')} />
      )}
      {activeView === 'create' && (
        <CreateIndirectIncome 
          onBack={() => setActiveView('main')}
          onCreate={handleCreateIncome}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default IndirectIncome;
