import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave,
  faChartLine,
  faReceipt,
  faArrowRight,
  faPlus,
  faFileInvoice,
  faCoins,
  faChartBar,
  faCalculator,
} from '@fortawesome/free-solid-svg-icons';
import './Accounting.css';

const Accounting = ({ currentCompany, currentUser, addToast }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    netProfit: 0,
    pendingTransactions: 0,
  });

  // Get company ID for navigation
  const getCompanyId = () => {
    return currentCompany?.id || currentCompany?._id || null;
  };

  // Navigate to specific accounting section
  const navigateTo = (section) => {
    const companyId = getCompanyId();
    if (companyId) {
      navigate(`/companies/${companyId}/${section}`);
    } else {
      addToast?.('Please select a company first', 'warning');
    }
  };

  // Accounting features/sections
  const accountingSections = [
    {
      id: 'expenses',
      title: 'Expense Management',
      description: 'Track and manage all your business expenses',
      icon: faReceipt,
      color: '#ef4444',
      bgColor: '#fef2f2',
      route: 'expenses',
      stats: `₹${stats.totalExpenses.toLocaleString('en-IN')}`,
      statsLabel: 'Total Expenses',
    },
    {
      id: 'indirect-income',
      title: 'Indirect Income',
      description: 'Manage indirect income sources and revenue',
      icon: faChartLine,
      color: '#10b981',
      bgColor: '#f0fdf4',
      route: 'indirect-income',
      stats: `₹${stats.totalIncome.toLocaleString('en-IN')}`,
      statsLabel: 'Total Income',
    },
    {
      id: 'payment-in',
      title: 'Payment In',
      description: 'Record incoming payments from customers',
      icon: faCoins,
      color: '#3b82f6',
      bgColor: '#eff6ff',
      route: 'payment-in',
      stats: `${stats.pendingTransactions}`,
      statsLabel: 'Pending',
    },
    {
      id: 'payment-out',
      title: 'Payment Out',
      description: 'Record outgoing payments to vendors',
      icon: faMoneyBillWave,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      route: 'payment-out',
      stats: `${stats.pendingTransactions}`,
      statsLabel: 'Pending',
    },
  ];

  // Quick actions
  const quickActions = [
    {
      id: 'record-expense',
      title: 'Record Expense',
      icon: faPlus,
      color: '#ef4444',
      action: () => navigateTo('expenses'),
    },
    {
      id: 'add-income',
      title: 'Add Income',
      icon: faPlus,
      color: '#10b981',
      action: () => navigateTo('indirect-income'),
    },
    {
      id: 'receive-payment',
      title: 'Receive Payment',
      icon: faPlus,
      color: '#3b82f6',
      action: () => navigateTo('payment-in'),
    },
    {
      id: 'make-payment',
      title: 'Make Payment',
      icon: faPlus,
      color: '#f59e0b',
      action: () => navigateTo('payment-out'),
    },
  ];

  // Fetch accounting stats (placeholder for now)
  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      totalExpenses: 125000,
      totalIncome: 185000,
      netProfit: 60000,
      pendingTransactions: 5,
    });
  }, [currentCompany]);

  return (
    <div className="accounting-container">
      {/* Header Section */}
      <div className="accounting-header">
        <div className="header-content">
          <div className="header-icon">
            <FontAwesomeIcon icon={faCalculator} />
          </div>
          <div className="header-text">
            <h1 className="header-title">Accounting Management</h1>
            <p className="header-subtitle">
              Manage your business finances, track expenses and income
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <Row className="g-3">
          <Col xs={12} md={6} lg={3}>
            <Card className="stat-card expenses">
              <Card.Body>
                <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                  <FontAwesomeIcon icon={faReceipt} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Total Expenses</div>
                  <div className="stat-value">₹{stats.totalExpenses.toLocaleString('en-IN')}</div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={3}>
            <Card className="stat-card income">
              <Card.Body>
                <div className="stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#10b981' }}>
                  <FontAwesomeIcon icon={faChartLine} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Total Income</div>
                  <div className="stat-value">₹{stats.totalIncome.toLocaleString('en-IN')}</div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={3}>
            <Card className="stat-card profit">
              <Card.Body>
                <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                  <FontAwesomeIcon icon={faChartBar} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Net Profit</div>
                  <div className="stat-value">₹{stats.netProfit.toLocaleString('en-IN')}</div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={3}>
            <Card className="stat-card pending">
              <Card.Body>
                <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}>
                  <FontAwesomeIcon icon={faFileInvoice} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Pending</div>
                  <div className="stat-value">{stats.pendingTransactions}</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3 className="section-title">Quick Actions</h3>
        <Row className="g-3">
          {quickActions.map((action) => (
            <Col key={action.id} xs={12} sm={6} md={3}>
              <Button
                variant="outline-primary"
                className="quick-action-btn"
                onClick={action.action}
                style={{ 
                  borderColor: action.color,
                  color: action.color,
                }}
              >
                <FontAwesomeIcon icon={action.icon} className="me-2" />
                {action.title}
              </Button>
            </Col>
          ))}
        </Row>
      </div>

      {/* Accounting Sections */}
      <div className="accounting-sections">
        <h3 className="section-title">Accounting Modules</h3>
        <Row className="g-4">
          {accountingSections.map((section) => (
            <Col key={section.id} xs={12} md={6} lg={6}>
              <Card 
                className="accounting-section-card"
                onClick={() => navigateTo(section.route)}
                style={{ cursor: 'pointer' }}
              >
                <Card.Body>
                  <div className="section-header">
                    <div 
                      className="section-icon"
                      style={{ 
                        backgroundColor: section.bgColor,
                        color: section.color 
                      }}
                    >
                      <FontAwesomeIcon icon={section.icon} />
                    </div>
                    <div className="section-arrow">
                      <FontAwesomeIcon icon={faArrowRight} />
                    </div>
                  </div>
                  <h4 className="section-card-title">{section.title}</h4>
                  <p className="section-description">{section.description}</p>
                  <div className="section-stats">
                    <div className="stats-value" style={{ color: section.color }}>
                      {section.stats}
                    </div>
                    <div className="stats-label">{section.statsLabel}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Features Info */}
      <div className="features-section">
        <Card className="features-card">
          <Card.Body>
            <h3 className="section-title">Accounting Features</h3>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <div className="feature-item">
                  <FontAwesomeIcon icon={faReceipt} className="feature-icon" />
                  <div className="feature-content">
                    <h5>Expense Tracking</h5>
                    <p>Track all business expenses with categories and receipts</p>
                  </div>
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div className="feature-item">
                  <FontAwesomeIcon icon={faChartLine} className="feature-icon" />
                  <div className="feature-content">
                    <h5>Income Management</h5>
                    <p>Manage all sources of income including indirect revenue</p>
                  </div>
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div className="feature-item">
                  <FontAwesomeIcon icon={faCoins} className="feature-icon" />
                  <div className="feature-content">
                    <h5>Payment Tracking</h5>
                    <p>Record and track both incoming and outgoing payments</p>
                  </div>
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div className="feature-item">
                  <FontAwesomeIcon icon={faChartBar} className="feature-icon" />
                  <div className="feature-content">
                    <h5>Financial Reports</h5>
                    <p>Generate comprehensive financial reports and insights</p>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default Accounting;
