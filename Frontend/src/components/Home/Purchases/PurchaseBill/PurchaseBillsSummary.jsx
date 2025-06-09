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
    faShoppingCart,
    faTruck,
    faFileInvoiceDollar,
    faBoxes,
    faUsers,
    faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

function PurchaseBillsSummary({
    summary = {},
    purchases = [],
    isLoading = false
}) {
    const formatCurrency = (amount) => {
        // Handle undefined, null, or non-numeric values
        if (amount === undefined || amount === null || isNaN(amount)) {
            return '₹0';
        }

        // Convert to number if it's a string
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        // Handle invalid conversions
        if (isNaN(numAmount)) {
            return '₹0';
        }

        if (numAmount >= 10000000) { // 1 crore
            return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
        } else if (numAmount >= 100000) { // 1 lakh
            return `₹${(numAmount / 100000).toFixed(1)}L`;
        } else if (numAmount >= 1000) { // 1 thousand
            return `₹${(numAmount / 1000).toFixed(1)}K`;
        }
        return `₹${numAmount.toLocaleString('en-IN')}`;
    };

    // ✅ ENHANCED: Calculate summary from real purchase data
    const calculateSummaryFromPurchases = () => {
        if (!purchases || purchases.length === 0) {
            return {
                totalPurchaseAmount: 0,
                paidAmount: 0,
                payableAmount: 0,
                totalPurchases: 0,
                growthPercentage: 0,
                statusCounts: {
                    draft: 0,
                    ordered: 0,
                    received: 0,
                    completed: 0,
                    paid: 0,
                    overdue: 0
                },
                recentPurchases: 0,
                uniqueSuppliers: 0
            };
        }

        let totalAmount = 0;
        let totalPaid = 0;
        let totalPayable = 0;

        const statusCounts = {
            draft: 0,
            ordered: 0,
            received: 0,
            completed: 0,
            paid: 0,
            overdue: 0
        };

        const supplierSet = new Set();
        const currentDate = new Date();
        const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        let recentPurchases = 0;

        purchases.forEach(purchase => {
            // ✅ Calculate totals from actual purchase data
            const purchaseTotal = purchase.finalTotal || purchase.totalAmount || purchase.total || 0;
            const purchasePaid = purchase.paidAmount || purchase.amountPaid || 0;
            const purchasePayable = purchase.payableAmount || purchase.outstandingAmount || (purchaseTotal - purchasePaid);

            totalAmount += purchaseTotal;
            totalPaid += purchasePaid;
            totalPayable += purchasePayable;

            // ✅ Count by status
            const status = purchase.status?.toLowerCase() || 'draft';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            } else {
                statusCounts.draft++; // Default to draft for unknown statuses
            }

            // ✅ Track unique suppliers
            if (purchase.supplier?.name || purchase.supplierName) {
                supplierSet.add(purchase.supplier?.name || purchase.supplierName);
            }

            // ✅ Count recent purchases
            const purchaseDate = new Date(purchase.purchaseDate || purchase.createdAt || purchase.date);
            if (purchaseDate >= lastWeek) {
                recentPurchases++;
            }
        });

        // ✅ Calculate growth percentage (simplified - could be enhanced with time-based comparison)
        const avgPurchaseAmount = totalAmount / purchases.length;
        const recentAvg = purchases.slice(-5).reduce((sum, p) => sum + (p.finalTotal || 0), 0) / Math.min(5, purchases.length);
        const growthPercentage = avgPurchaseAmount > 0 ? ((recentAvg - avgPurchaseAmount) / avgPurchaseAmount) * 100 : 0;

        return {
            totalPurchaseAmount: totalAmount,
            paidAmount: totalPaid,
            payableAmount: totalPayable,
            totalPurchases: purchases.length,
            growthPercentage: isFinite(growthPercentage) ? growthPercentage : 0,
            statusCounts,
            recentPurchases,
            uniqueSuppliers: supplierSet.size
        };
    };

    // ✅ Use calculated summary or provided summary
    const calculatedSummary = calculateSummaryFromPurchases();
    const finalSummary = {
        ...calculatedSummary,
        ...summary // Allow manual override of calculated values
    };

    // Safe access to summary properties with default values
    const safeGrowthPercentage = finalSummary?.growthPercentage || 0;
    const isPositiveGrowth = safeGrowthPercentage >= 0;

    // ✅ Loading state
    if (isLoading) {
        return (
            <div className="purchase-summary-ultra-compact">
                <div className="summary-header-mini mb-2">
                    <h6 className="fw-bold text-purple mb-0" style={{ fontSize: '0.8rem' }}>Purchase Overview</h6>
                </div>
                <div className="stats-grid">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="stat-card-mini loading mb-1">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="stat-icon-mini">
                                    <div style={{ width: '12px', height: '12px', background: '#e5e7eb', borderRadius: '2px' }}></div>
                                </div>
                                <div style={{ width: '30px', height: '12px', background: '#e5e7eb', borderRadius: '2px' }}></div>
                            </div>
                            <div className="stat-content-mini">
                                <small className="stat-label">Loading...</small>
                                <div className="stat-value" style={{ width: '60px', height: '14px', background: '#e5e7eb', borderRadius: '2px' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="purchase-summary-ultra-compact">
                {/* Compact Header */}
                <div className="summary-header-mini mb-2">
                    <h6 className="fw-bold text-purple mb-0" style={{ fontSize: '0.8rem' }}>Purchase Overview</h6>
                </div>

                {/* Main Stats - Ultra Compact Cards */}
                <div className="stats-grid">
                    {/* Total Purchases */}
                    <div className="stat-card-mini mb-1">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="stat-icon-mini">
                                <FontAwesomeIcon icon={faChartLine} className="text-purple" />
                            </div>
                            <div className={`growth-badge-mini ${isPositiveGrowth ? 'positive' : 'negative'}`}>
                                <FontAwesomeIcon icon={isPositiveGrowth ? faArrowUp : faArrowDown} size="xs" />
                                <span>{Math.abs(safeGrowthPercentage).toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className="stat-content-mini">
                            <small className="stat-label">Total Purchases</small>
                            <div className="stat-value text-dark">{formatCurrency(finalSummary?.totalPurchaseAmount)}</div>
                        </div>
                    </div>

                    {/* Paid */}
                    <div className="stat-card-mini mb-1">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="stat-icon-mini">
                                <FontAwesomeIcon icon={faWallet} className="text-success" />
                            </div>
                            <div className="status-mini paid">Paid</div>
                        </div>
                        <div className="stat-content-mini">
                            <small className="stat-label">Paid Amount</small>
                            <div className="stat-value text-success">{formatCurrency(finalSummary?.paidAmount)}</div>
                            <small className="stat-percent">
                                {finalSummary?.totalPurchaseAmount && finalSummary?.paidAmount ?
                                    ((finalSummary.paidAmount / finalSummary.totalPurchaseAmount) * 100).toFixed(0) : 0}%
                            </small>
                        </div>
                    </div>

                    {/* Outstanding/Payable */}
                    <div className="stat-card-mini mb-2">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="stat-icon-mini">
                                <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-warning" />
                            </div>
                            <div className="status-mini payable">Payable</div>
                        </div>
                        <div className="stat-content-mini">
                            <small className="stat-label">Outstanding</small>
                            <div className="stat-value text-warning">{formatCurrency(finalSummary?.payableAmount)}</div>
                            <small className="stat-percent">
                                {finalSummary?.totalPurchaseAmount && finalSummary?.payableAmount ?
                                    ((finalSummary.payableAmount / finalSummary.totalPurchaseAmount) * 100).toFixed(0) : 0}%
                            </small>
                        </div>
                    </div>
                </div>

                {/* ✅ ENHANCED: Additional Quick Stats from Real Data */}
                <div className="quick-stats-mini mb-2">
                    <small className="section-title">Quick Stats</small>

                    <div className="mini-stat-row">
                        <FontAwesomeIcon icon={faReceipt} className="mini-icon text-purple" />
                        <span className="mini-label">Total Bills</span>
                        <span className="mini-value text-dark">{finalSummary?.totalPurchases || 0}</span>
                    </div>

                    <div className="mini-stat-row">
                        <FontAwesomeIcon icon={faUsers} className="mini-icon text-primary" />
                        <span className="mini-label">Suppliers</span>
                        <span className="mini-value text-dark">{finalSummary?.uniqueSuppliers || 0}</span>
                    </div>

                    <div className="mini-stat-row">
                        <FontAwesomeIcon icon={faCalendarDay} className="mini-icon text-info" />
                        <span className="mini-label">Recent (7d)</span>
                        <span className="mini-value text-dark">{finalSummary?.recentPurchases || 0}</span>
                    </div>

                    <div className="mini-stat-row">
                        <FontAwesomeIcon icon={faBoxes} className="mini-icon text-secondary" />
                        <span className="mini-label">Avg Amount</span>
                        <span className="mini-value text-dark">
                            {finalSummary?.totalPurchases > 0 ?
                                formatCurrency(finalSummary.totalPurchaseAmount / finalSummary.totalPurchases) :
                                '₹0'
                            }
                        </span>
                    </div>
                </div>

                {/* ✅ ENHANCED: Status Distribution from Real Data */}
                <div className="status-distribution-mini">
                    <small className="section-title">Status Overview</small>

                    <div className="status-grid">
                        <div className="status-item">
                            <div className="status-dot draft"></div>
                            <span className="status-text">Draft</span>
                            <span className="status-count">{finalSummary?.statusCounts?.draft || 0}</span>
                        </div>

                        <div className="status-item">
                            <div className="status-dot ordered"></div>
                            <span className="status-text">Ordered</span>
                            <span className="status-count">{finalSummary?.statusCounts?.ordered || 0}</span>
                        </div>

                        <div className="status-item">
                            <div className="status-dot received"></div>
                            <span className="status-text">Received</span>
                            <span className="status-count">{finalSummary?.statusCounts?.received || 0}</span>
                        </div>

                        <div className="status-item">
                            <div className="status-dot completed"></div>
                            <span className="status-text">Paid</span>
                            <span className="status-count">{finalSummary?.statusCounts?.paid || finalSummary?.statusCounts?.completed || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ultra Compact Styles - Purple Theme */}
            <style>
                {`
                .purchase-summary-ultra-compact {
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
                    box-shadow: 0 2px 8px rgba(108, 99, 255, 0.06);
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
                    position: relative;
                }

                .stat-card-mini:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(108, 99, 255, 0.1);
                    border-color: rgba(108, 99, 255, 0.15);
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
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                    box-shadow: 0 1px 3px rgba(16, 185, 129, 0.2);
                }

                .growth-badge-mini.negative {
                    background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
                    box-shadow: 0 1px 3px rgba(239, 68, 68, 0.2);
                }

                .status-mini {
                    padding: 1px 4px;
                    border-radius: 3px;
                    font-size: 0.5rem;
                    color: white;
                    font-weight: 600;
                }

                .status-mini.paid {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                    box-shadow: 0 1px 2px rgba(16, 185, 129, 0.2);
                }

                .status-mini.payable {
                    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
                    box-shadow: 0 1px 2px rgba(245, 158, 11, 0.2);
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
                    font-weight: 500;
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
                    font-weight: 500;
                }

                .quick-stats-mini {
                    background: rgba(108, 99, 255, 0.04);
                    border-radius: 5px;
                    padding: 0.3rem;
                    border: 1px solid rgba(108, 99, 255, 0.08);
                    position: relative;
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
                    font-weight: 500;
                }

                .mini-value {
                    font-weight: 600;
                    font-size: 0.6rem;
                }

                /* Status Distribution */
                .status-distribution-mini {
                    background: rgba(108, 99, 255, 0.02);
                    border-radius: 5px;
                    padding: 0.3rem;
                    border: 1px solid rgba(108, 99, 255, 0.05);
                }

                .section-title {
                    font-size: 0.55rem;
                    color: #6c63ff;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    font-weight: 600;
                    display: block;
                    margin-bottom: 0.3rem;
                    text-align: center;
                }

                .status-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.2rem;
                }

                .status-item {
                    display: flex;
                    align-items: center;
                    gap: 0.2rem;
                    padding: 0.1rem 0;
                    font-size: 0.55rem;
                }

                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .status-dot.draft { background: #6b7280; }
                .status-dot.ordered { background: #6c63ff; }
                .status-dot.received { background: #f59e0b; }
                .status-dot.completed { background: #10b981; }

                .status-text {
                    flex: 1;
                    color: #6b7280;
                    font-weight: 500;
                }

                .status-count {
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.5rem;
                }

                /* Enhanced Colors - Purple Theme */
                .text-purple {
                    color: #6c63ff !important;
                }

                .text-primary {
                    color: #6c63ff !important;
                }

                .text-secondary {
                    color: #9c88ff !important;
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

                .text-danger {
                    color: #ef4444 !important;
                }

                /* ✅ ENHANCED: Loading state styles */
                .stat-card-mini.loading {
                    opacity: 0.6;
                    pointer-events: none;
                }

                .stat-card-mini.loading .stat-value {
                    background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    border-radius: 2px;
                    color: transparent;
                    height: 14px;
                    display: block;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Enhanced Visual Effects */
                .purchase-summary-ultra-compact::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent 0%, #6c63ff 25%, #9c88ff 75%, transparent 100%);
                    border-radius: 10px 10px 0 0;
                    opacity: 0.6;
                }

                /* Hover Effects */
                .mini-stat-row:hover {
                    background: rgba(108, 99, 255, 0.06);
                    border-radius: 3px;
                    margin: 0 -0.1rem;
                    padding-left: 0.25rem;
                    padding-right: 0.25rem;
                    transform: translateX(2px);
                    transition: all 0.2s ease;
                }

                .status-item:hover {
                    background: rgba(108, 99, 255, 0.08);
                    border-radius: 3px;
                    padding: 0.15rem 0.1rem;
                    margin: 0 -0.1rem;
                    transform: scale(1.02);
                    transition: all 0.2s ease;
                }

                /* Responsive Design */
                @media (max-width: 1200px) {
                    .purchase-summary-ultra-compact {
                        max-width: 160px;
                        min-width: 140px;
                    }

                    .stat-value {
                        font-size: 0.7rem;
                    }
                }

                @media (max-width: 992px) {
                    .purchase-summary-ultra-compact {
                        max-width: 140px;
                        min-width: 120px;
                        padding: 0.4rem;
                    }

                    .stat-value {
                        font-size: 0.65rem;
                    }

                    .status-grid {
                        grid-template-columns: 1fr;
                        gap: 0.1rem;
                    }
                }

                @media (max-width: 768px) {
                    .purchase-summary-ultra-compact {
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

                    .quick-stats-mini,
                    .status-distribution-mini {
                        min-width: 140px;
                    }

                    .status-grid {
                        grid-template-columns: 1fr 1fr;
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

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
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
                    animation: fadeInUp 0.3s ease-out;
                    animation-delay: 0.4s;
                }

                .status-distribution-mini {
                    animation: fadeInUp 0.3s ease-out;
                    animation-delay: 0.5s;
                }
                `}
            </style>
        </>
    );
}

export default PurchaseBillsSummary;