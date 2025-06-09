import React from 'react';
import { Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowUp,
    faArrowDown,
    faWallet,
    faReceipt,
    faChartLine,
    faCalendarDay,
    faFileInvoice,
    faRupeeSign
} from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesSummary({ summary }) {
    const formatCurrency = (amount) => {
        if (amount >= 10000000) { // 1 crore
            return `₹${(amount / 10000000).toFixed(1)}Cr`;
        } else if (amount >= 100000) { // 1 lakh
            return `₹${(amount / 100000).toFixed(1)}L`;
        } else if (amount >= 1000) { // 1 thousand
            return `₹${(amount / 1000).toFixed(1)}K`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const isPositiveGrowth = summary.growthPercentage >= 0;

    return (
        <>
            <div className="sales-summary-ultra-compact">
                {/* Compact Header */}
                <div className="summary-header-mini mb-2">
                    <h6 className="fw-bold text-purple mb-0" style={{ fontSize: '0.8rem' }}>Sales Overview</h6>
                </div>

                {/* Main Stats - Ultra Compact Cards */}
                <div className="stats-grid">
                    {/* Total Sales */}
                    <div className="stat-card-mini mb-1">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="stat-icon-mini">
                                <FontAwesomeIcon icon={faChartLine} className="text-primary" />
                            </div>
                            <div className={`growth-badge-mini ${isPositiveGrowth ? 'positive' : 'negative'}`}>
                                <FontAwesomeIcon icon={isPositiveGrowth ? faArrowUp : faArrowDown} size="xs" />
                                <span>{Math.abs(summary.growthPercentage).toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className="stat-content-mini">
                            <small className="stat-label">Total Sales</small>
                            <div className="stat-value text-dark">{formatCurrency(summary.totalSalesAmount)}</div>
                        </div>
                    </div>

                    {/* Received */}
                    <div className="stat-card-mini mb-1">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="stat-icon-mini">
                                <FontAwesomeIcon icon={faWallet} className="text-success" />
                            </div>
                            <div className="status-mini received">Paid</div>
                        </div>
                        <div className="stat-content-mini">
                            <small className="stat-label">Received</small>
                            <div className="stat-value text-success">{formatCurrency(summary.received)}</div>
                            <small className="stat-percent">{((summary.received / summary.totalSalesAmount) * 100).toFixed(0)}%</small>
                        </div>
                    </div>

                    {/* Outstanding */}
                    <div className="stat-card-mini mb-2">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="stat-icon-mini">
                                <FontAwesomeIcon icon={faReceipt} className="text-warning" />
                            </div>
                            <div className="status-mini pending">Due</div>
                        </div>
                        <div className="stat-content-mini">
                            <small className="stat-label">Outstanding</small>
                            <div className="stat-value text-warning">{formatCurrency(summary.balance)}</div>
                            <small className="stat-percent">{((summary.balance / summary.totalSalesAmount) * 100).toFixed(0)}%</small>
                        </div>
                    </div>
                </div>

                {/* Quick Stats - Minimal */}
                <div className="quick-stats-mini">
                    <div className="mini-stat-row">
                        <FontAwesomeIcon icon={faCalendarDay} className="mini-icon text-primary" />
                        <span className="mini-label">Today</span>
                        <span className="mini-value text-primary">{formatCurrency(summary.todaysSales || 0)}</span>
                    </div>
                    <div className="mini-stat-row">
                        <FontAwesomeIcon icon={faFileInvoice} className="mini-icon text-info" />
                        <span className="mini-label">Invoices</span>
                        <span className="mini-value text-info">{summary.totalInvoices || 0}</span>
                    </div>
                    <div className="mini-stat-row">
                        <FontAwesomeIcon icon={faRupeeSign} className="mini-icon text-success" />
                        <span className="mini-label">Avg. Sale</span>
                        <span className="mini-value text-success">{formatCurrency(summary.avgSaleValue || 0)}</span>
                    </div>
                </div>
            </div>

            {/* Ultra Compact Styles */}
            <style>
                {`
                .sales-summary-ultra-compact {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.03) 0%, rgba(156, 136, 255, 0.03) 100%);
                    border-radius: 10px;
                    padding: 0.5rem;
                    height: fit-content;
                    border: 1px solid rgba(108, 99, 255, 0.1);
                    position: sticky;
                    top: 1rem;
                    width: 100%;
                    min-width: 160px;
                    max-width: 180px;
                }

                .summary-header-mini {
                    text-align: center;
                    border-bottom: 1px solid rgba(108, 99, 255, 0.1);
                    padding-bottom: 0.25rem;
                }

                .stat-card-mini {
                    background: white;
                    border-radius: 6px;
                    padding: 0.4rem;
                    border: 1px solid rgba(108, 99, 255, 0.08);
                    box-shadow: 0 1px 3px rgba(108, 99, 255, 0.05);
                    transition: all 0.2s ease;
                }

                .stat-card-mini:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(108, 99, 255, 0.1);
                }

                .stat-icon-mini {
                    width: 18px;
                    height: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.6rem;
                    background: rgba(108, 99, 255, 0.08);
                    border-radius: 4px;
                    flex-shrink: 0;
                }

                .growth-badge-mini {
                    padding: 1px 3px;
                    border-radius: 3px;
                    font-size: 0.5rem;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 1px;
                }

                .growth-badge-mini.positive {
                    background: #10b981;
                }

                .growth-badge-mini.negative {
                    background: #ef4444;
                }

                .status-mini {
                    padding: 1px 4px;
                    border-radius: 3px;
                    font-size: 0.5rem;
                    color: white;
                }

                .status-mini.received {
                    background: #10b981;
                }

                .status-mini.pending {
                    background: #f59e0b;
                }

                .stat-content-mini {
                    margin-top: 0.2rem;
                }

                .stat-label {
                    font-size: 0.55rem;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.2px;
                    display: block;
                    margin-bottom: 1px;
                }

                .stat-value {
                    font-size: 0.75rem;
                    font-weight: 700;
                    line-height: 1;
                }

                .stat-percent {
                    font-size: 0.5rem;
                    color: #9ca3af;
                    margin-top: 1px;
                    display: block;
                }

                .quick-stats-mini {
                    background: rgba(108, 99, 255, 0.04);
                    border-radius: 5px;
                    padding: 0.3rem;
                    border: 1px solid rgba(108, 99, 255, 0.08);
                }

                .mini-stat-row {
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                    padding: 0.15rem 0;
                    border-bottom: 1px solid rgba(108, 99, 255, 0.05);
                    font-size: 0.65rem;
                }

                .mini-stat-row:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }

                .mini-icon {
                    width: 12px;
                    flex-shrink: 0;
                    font-size: 0.5rem;
                }

                .mini-label {
                    flex: 1;
                    color: #6b7280;
                    font-size: 0.55rem;
                }

                .mini-value {
                    font-weight: 600;
                    font-size: 0.6rem;
                }

                /* Enhanced Colors */
                .text-purple {
                    color: #6c63ff !important;
                }

                .text-primary {
                    color: #6c63ff !important;
                }

                .text-success {
                    color: #10b981 !important;
                }

                .text-warning {
                    color: #f59e0b !important;
                }

                .text-info {
                    color: #06b6d4 !important;
                }

                /* Responsive Design */
                @media (max-width: 1200px) {
                    .sales-summary-ultra-compact {
                        max-width: 160px;
                        min-width: 140px;
                    }

                    .stat-value {
                        font-size: 0.7rem;
                    }
                }

                @media (max-width: 992px) {
                    .sales-summary-ultra-compact {
                        max-width: 140px;
                        min-width: 120px;
                        padding: 0.4rem;
                    }

                    .stat-value {
                        font-size: 0.65rem;
                    }
                }

                @media (max-width: 768px) {
                    .sales-summary-ultra-compact {
                        position: static;
                        margin-bottom: 0.75rem;
                        max-width: 100%;
                        min-width: auto;
                        display: flex;
                        flex-direction: row;
                        gap: 0.5rem;
                        overflow-x: auto;
                        padding: 0.5rem;
                    }

                    .summary-header-mini {
                        display: none;
                    }

                    .stats-grid {
                        display: flex;
                        gap: 0.5rem;
                        flex: 1;
                    }

                    .stat-card-mini {
                        min-width: 120px;
                        margin-bottom: 0 !important;
                    }

                    .quick-stats-mini {
                        min-width: 120px;
                    }
                }

                /* Animations */
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                .stat-card-mini {
                    animation: slideInLeft 0.3s ease-out;
                }

                .stat-card-mini:nth-child(1) {
                    animation-delay: 0.1s;
                }

                .stat-card-mini:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .stat-card-mini:nth-child(3) {
                    animation-delay: 0.3s;
                }

                .quick-stats-mini {
                    animation: slideInLeft 0.3s ease-out;
                    animation-delay: 0.4s;
                }
                `}
            </style>
        </>
    );
}

export default SalesInvoicesSummary;