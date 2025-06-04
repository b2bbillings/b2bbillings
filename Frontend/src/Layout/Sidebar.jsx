import { useState } from 'react';
import { Accordion, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShoppingCart,
    faShoppingBag,
    faBoxes,
    faClipboardList,
    faChartLine,
    faFileAlt,
    faCog,
    faBook,
    faUserFriends,
    faAngleRight,
    faLayerGroup,
    faWarehouse,
    faExclamationTriangle,
    faExchangeAlt,
    faUserTie,
    faFileInvoice,
    faFileContract,
    faFileInvoiceDollar,
    faCreditCard,
    faReceipt,
    faUndoAlt,
    faUniversity,
    faMoneyBillWave,
    faExchangeAlt as faTransfer,
    faBalanceScale,
    faChartBar
} from '@fortawesome/free-solid-svg-icons';
import './Sidebar.css';

function Sidebar({ isOpen, toggleSidebar, onNavigate, activePage }) {
    // Track active menu item
    const [activeKey, setActiveKey] = useState('dayBook');

    // Custom toggle handler for accordion items
    const handleToggle = (eventKey) => {
        setActiveKey(activeKey === eventKey ? null : eventKey);
    };

    // Function to handle navigation
    const handleNavigation = (page) => {
        if (onNavigate) {
            onNavigate(page);
        }
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-menu">
                <Accordion defaultActiveKey="dayBook" activeKey={activeKey} className="sidebar-accordion">
                    {/* Day Book */}
                    <div className="sidebar-item">
                        <Accordion.Item eventKey="dayBook" className="sidebar-accordion-item">
                            <Accordion.Header
                                onClick={() => handleToggle('dayBook')}
                                className="sidebar-header"
                            >
                                <div className="sidebar-link-content">
                                    <FontAwesomeIcon icon={faBook} className="sidebar-icon" />
                                    <span className="sidebar-text">Day Book</span>
                                </div>
                                <FontAwesomeIcon
                                    icon={faAngleRight}
                                    className={`chevron-icon ${activeKey === 'dayBook' ? 'rotated' : ''}`}
                                />
                            </Accordion.Header>
                            <Accordion.Body className="sidebar-submenu">
                                <Nav className="flex-column">
                                    <Nav.Link
                                        onClick={() => handleNavigation('dailySummary')}
                                        className={`submenu-item ${activePage === 'dailySummary' ? 'active' : ''}`}
                                    >
                                        Daily Summary
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('transactions')}
                                        className={`submenu-item ${activePage === 'transactions' ? 'active' : ''}`}
                                    >
                                        Transactions
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('cashAndBank')}
                                        className={`submenu-item ${activePage === 'cashAndBank' ? 'active' : ''}`}
                                    >
                                        Cash & Bank
                                    </Nav.Link>
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    </div>

                    {/* Parties */}
                    <div className="sidebar-item">
                        <Nav.Link
                            onClick={() => handleNavigation('parties')}
                            className={`sidebar-link ${activePage === 'parties' ? 'active' : ''}`}
                        >
                            <div className="sidebar-link-content">
                                <FontAwesomeIcon icon={faUserFriends} className="sidebar-icon" />
                                <span className="sidebar-text">Parties</span>
                            </div>
                        </Nav.Link>
                    </div>

                    {/* Sales */}
                    <div className="sidebar-item">
                        <Accordion.Item eventKey="sales" className="sidebar-accordion-item">
                            <Accordion.Header
                                onClick={() => handleToggle('sales')}
                                className="sidebar-header"
                            >
                                <div className="sidebar-link-content">
                                    <FontAwesomeIcon icon={faShoppingCart} className="sidebar-icon" />
                                    <span className="sidebar-text">Sales</span>
                                </div>
                                <FontAwesomeIcon
                                    icon={faAngleRight}
                                    className={`chevron-icon ${activeKey === 'sales' ? 'rotated' : ''}`}
                                />
                            </Accordion.Header>
                            <Accordion.Body className="sidebar-submenu">
                                <Nav className="flex-column">
                                    <Nav.Link
                                        onClick={() => handleNavigation('allSales')}
                                        className={`submenu-item ${activePage === 'allSales' ? 'active' : ''}`}
                                    >
                                        All Sales
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('invoices')}
                                        className={`submenu-item ${activePage === 'invoices' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                                        Invoices
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('salesOrders')}
                                        className={`submenu-item ${activePage === 'salesOrders' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faFileContract} className="me-2" />
                                        Sales Orders
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('createInvoice')}
                                        className={`submenu-item ${activePage === 'createInvoice' ? 'active' : ''}`}
                                    >
                                        Create Invoice
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('createSalesOrder')}
                                        className={`submenu-item ${activePage === 'createSalesOrder' ? 'active' : ''}`}
                                    >
                                        Create Sales Order
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('creditNotes')}
                                        className={`submenu-item ${activePage === 'creditNotes' ? 'active' : ''}`}
                                    >
                                        Credit Notes
                                    </Nav.Link>
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    </div>

                    {/* Purchase & Expense */}
                    <div className="sidebar-item">
                        <Accordion.Item eventKey="purchaseExpense" className="sidebar-accordion-item">
                            <Accordion.Header
                                onClick={() => handleToggle('purchaseExpense')}
                                className="sidebar-header"
                            >
                                <div className="sidebar-link-content">
                                    <FontAwesomeIcon icon={faShoppingBag} className="sidebar-icon" />
                                    <span className="sidebar-text">Purchase & Expense</span>
                                </div>
                                <FontAwesomeIcon
                                    icon={faAngleRight}
                                    className={`chevron-icon ${activeKey === 'purchaseExpense' ? 'rotated' : ''}`}
                                />
                            </Accordion.Header>
                            <Accordion.Body className="sidebar-submenu">
                                <Nav className="flex-column">
                                    <Nav.Link
                                        onClick={() => handleNavigation('purchaseBills')}
                                        className={`submenu-item ${activePage === 'purchaseBills' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2" />
                                        Purchase Bills
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('paymentOut')}
                                        className={`submenu-item ${activePage === 'paymentOut' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                                        Payment Out
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('expenses')}
                                        className={`submenu-item ${activePage === 'expenses' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faReceipt} className="me-2" />
                                        Expenses
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('purchaseOrder')}
                                        className={`submenu-item ${activePage === 'purchaseOrder' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                                        Purchase Order
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('purchaseReturn')}
                                        className={`submenu-item ${activePage === 'purchaseReturn' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faUndoAlt} className="me-2" />
                                        Purchase Return/ Dr. Note
                                    </Nav.Link>
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    </div>

                    {/* Bank & Cash - NEW SECTION */}
                    <div className="sidebar-item">
                        <Accordion.Item eventKey="bankCash" className="sidebar-accordion-item">
                            <Accordion.Header
                                onClick={() => handleToggle('bankCash')}
                                className="sidebar-header"
                            >
                                <div className="sidebar-link-content">
                                    <FontAwesomeIcon icon={faUniversity} className="sidebar-icon" />
                                    <span className="sidebar-text">Bank & Cash</span>
                                </div>
                                <FontAwesomeIcon
                                    icon={faAngleRight}
                                    className={`chevron-icon ${activeKey === 'bankCash' ? 'rotated' : ''}`}
                                />
                            </Accordion.Header>
                            <Accordion.Body className="sidebar-submenu">
                                <Nav className="flex-column">
                                    <Nav.Link
                                        onClick={() => handleNavigation('bankAccounts')}
                                        className={`submenu-item ${activePage === 'bankAccounts' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faUniversity} className="me-2" />
                                        Bank Accounts
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('cashAccounts')}
                                        className={`submenu-item ${activePage === 'cashAccounts' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                        Cash Accounts
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('bankTransactions')}
                                        className={`submenu-item ${activePage === 'bankTransactions' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faTransfer} className="me-2" />
                                        Transactions
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('bankReconciliation')}
                                        className={`submenu-item ${activePage === 'bankReconciliation' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faBalanceScale} className="me-2" />
                                        Reconciliation
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('cashFlow')}
                                        className={`submenu-item ${activePage === 'cashFlow' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faChartBar} className="me-2" />
                                        Cash Flow Report
                                    </Nav.Link>
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    </div>

                    {/* Products & Services */}
                    <div className="sidebar-item">
                        <Nav.Link
                            onClick={() => handleNavigation('products')}
                            className={`sidebar-link ${activePage === 'products' ? 'active' : ''}`}
                        >
                            <div className="sidebar-link-content">
                                <FontAwesomeIcon icon={faBoxes} className="sidebar-icon" />
                                <span className="sidebar-text">Products & Services</span>
                            </div>
                        </Nav.Link>
                    </div>

                    {/* Inventory */}
                    <div className="sidebar-item">
                        <Accordion.Item eventKey="inventory" className="sidebar-accordion-item">
                            <Accordion.Header
                                onClick={() => handleToggle('inventory')}
                                className="sidebar-header"
                            >
                                <div className="sidebar-link-content">
                                    <FontAwesomeIcon icon={faLayerGroup} className="sidebar-icon" />
                                    <span className="sidebar-text">Inventory</span>
                                </div>
                                <FontAwesomeIcon
                                    icon={faAngleRight}
                                    className={`chevron-icon ${activeKey === 'inventory' ? 'rotated' : ''}`}
                                />
                            </Accordion.Header>
                            <Accordion.Body className="sidebar-submenu">
                                <Nav className="flex-column">
                                    <Nav.Link
                                        onClick={() => handleNavigation('allProducts')}
                                        className={`submenu-item ${activePage === 'allProducts' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faWarehouse} className="me-2" />
                                        All Products
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('lowStock')}
                                        className={`submenu-item ${activePage === 'lowStock' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                        Low Stock Items
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('stockMovement')}
                                        className={`submenu-item ${activePage === 'stockMovement' ? 'active' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                                        Stock Movement
                                    </Nav.Link>
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    </div>

                    {/* Staff Management */}
                    <div className="sidebar-item">
                        <Nav.Link
                            onClick={() => handleNavigation('staff')}
                            className={`sidebar-link ${activePage === 'staff' ? 'active' : ''}`}
                        >
                            <div className="sidebar-link-content">
                                <FontAwesomeIcon icon={faUserTie} className="sidebar-icon" />
                                <span className="sidebar-text">Staff Management</span>
                            </div>
                        </Nav.Link>
                    </div>

                    {/* Insights */}
                    <div className="sidebar-item">
                        <Nav.Link
                            onClick={() => handleNavigation('insights')}
                            className={`sidebar-link ${activePage === 'insights' ? 'active' : ''}`}
                        >
                            <div className="sidebar-link-content">
                                <FontAwesomeIcon icon={faChartLine} className="sidebar-icon" />
                                <span className="sidebar-text">Insights</span>
                            </div>
                        </Nav.Link>
                    </div>

                    {/* Reports */}
                    <div className="sidebar-item">
                        <Nav.Link
                            onClick={() => handleNavigation('reports')}
                            className={`sidebar-link ${activePage === 'reports' ? 'active' : ''}`}
                        >
                            <div className="sidebar-link-content">
                                <FontAwesomeIcon icon={faFileAlt} className="sidebar-icon" />
                                <span className="sidebar-text">Reports</span>
                            </div>
                        </Nav.Link>
                    </div>

                    {/* Settings */}
                    <div className="sidebar-item">
                        <Nav.Link
                            onClick={() => handleNavigation('settings')}
                            className={`sidebar-link ${activePage === 'settings' ? 'active' : ''}`}
                        >
                            <div className="sidebar-link-content">
                                <FontAwesomeIcon icon={faCog} className="sidebar-icon" />
                                <span className="sidebar-text">Settings</span>
                            </div>
                        </Nav.Link>
                    </div>
                </Accordion>
            </div>
        </div>
    );
}

export default Sidebar;