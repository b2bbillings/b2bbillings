import { useState, useEffect } from 'react';
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
    faChartBar,
    faPlus
} from '@fortawesome/free-solid-svg-icons';
import './Sidebar.css';

function Sidebar({
    isOpen,
    toggleSidebar,
    onNavigate,
    activePage,
    currentCompany,
    currentUser,
    isOnline,
    companyId
}) {
    // Track active menu item
    const [activeKey, setActiveKey] = useState('dayBook');

    // Debug info
    useEffect(() => {
        console.log('🧭 Sidebar: Props received:', {
            activePage,
            companyId,
            currentCompany: currentCompany?.businessName || currentCompany?.name,
            isOnline
        });
    }, [activePage, companyId, currentCompany, isOnline]);

    // Auto-expand accordion based on active page
    useEffect(() => {
        const pageToAccordionMap = {
            // Day Book pages
            'dailySummary': 'dayBook',
            'transactions': 'dayBook',
            'cashAndBank': 'dayBook',

            // Sales pages
            'allSales': 'sales',
            'invoices': 'sales',
            'createInvoice': 'sales',

            // Purchase & Expense pages
            'purchaseBills': 'purchaseExpense',
            // 'paymentOut': 'purchaseExpense',
            'expenses': 'purchaseExpense',
            'purchaseOrder': 'purchaseExpense',
            'purchaseReturn': 'purchaseExpense',
            'allPurchases': 'purchaseExpense',
            'createPurchase': 'purchaseExpense',
            'purchaseOrders': 'purchaseExpense',
            'createPurchaseOrder': 'purchaseExpense',

            // Bank & Cash pages
            'bankAccounts': 'bankCash',
            'cashAccounts': 'bankCash',
            'bankTransactions': 'bankCash',
            'bankReconciliation': 'bankCash',
            'cashFlow': 'bankCash',

            // Inventory pages
            'inventory': 'inventory',
            'allProducts': 'inventory',
            'lowStock': 'inventory',
            'stockMovement': 'inventory'
        };

        const accordionKey = pageToAccordionMap[activePage];
        if (accordionKey && accordionKey !== activeKey) {
            setActiveKey(accordionKey);
        }
    }, [activePage]);

    // Custom toggle handler for accordion items
    const handleToggle = (eventKey) => {
        setActiveKey(activeKey === eventKey ? null : eventKey);
    };

    // Function to handle navigation with company validation
    const handleNavigation = (page) => {
        console.log('🧭 Sidebar: Navigation request for:', page);

        // Check if company is required for this page
        const requiresCompany = [
            'inventory', 'allProducts', 'lowStock', 'stockMovement',
            'allSales', 'invoices', 'createInvoice',
            'purchaseBills', 'expenses', 'purchaseOrder',
            'purchaseReturn', 'allPurchases', 'createPurchase', 'purchaseOrders',
            'createPurchaseOrder',
            'bankAccounts', 'cashAccounts', 'bankTransactions',
            'bankReconciliation', 'cashFlow',
            'parties'
        ].includes(page);

        if (requiresCompany && !companyId && !currentCompany?.id && !currentCompany?._id) {
            console.warn('⚠️ Navigation blocked: No company selected for page:', page);
            return;
        }

        if (onNavigate) {
            onNavigate(page);
        }
    };

    // Check if a navigation item should be disabled
    const isItemDisabled = (page) => {
        const requiresCompany = [
            'inventory', 'allProducts', 'lowStock', 'stockMovement',
            'allSales', 'invoices', 'createInvoice',
            'purchaseBills', 'expenses', 'purchaseOrder',
            'purchaseReturn', 'allPurchases', 'createPurchase', 'purchaseOrders',
            'createPurchaseOrder',
            'bankAccounts', 'cashAccounts', 'bankTransactions',
            'bankReconciliation', 'cashFlow',
            'parties'
        ].includes(page);

        return requiresCompany && !companyId && !currentCompany?.id && !currentCompany?._id;
    };

    // Get item class with disabled state
    const getItemClass = (page, baseClass = 'submenu-item') => {
        let classes = [baseClass];

        if (activePage === page) {
            classes.push('active');
        }

        if (isItemDisabled(page)) {
            classes.push('disabled');
        }

        return classes.join(' ');
    };

    // Get sidebar link class with disabled state
    const getSidebarLinkClass = (page) => {
        let classes = ['sidebar-link'];

        if (activePage === page) {
            classes.push('active');
        }

        if (isItemDisabled(page)) {
            classes.push('disabled');
        }

        return classes.join(' ');
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-menu">
                {/* Company Info (when sidebar is open) */}
                {isOpen && currentCompany && (
                    <div className="sidebar-company-info">
                        <div className="company-name">
                            {currentCompany.businessName || currentCompany.name}
                        </div>
                        <div className="company-id">
                            <small className="text-muted">
                                ID: {companyId || currentCompany.id || currentCompany._id}
                            </small>
                        </div>
                    </div>
                )}

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
                                        className={getItemClass('dailySummary')}
                                    >
                                        Daily Summary
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('transactions')}
                                        className={getItemClass('transactions')}
                                    >
                                        Transactions
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('cashAndBank')}
                                        className={getItemClass('cashAndBank')}
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
                            className={getSidebarLinkClass('parties')}
                            title={isItemDisabled('parties') ? 'Select a company to access Parties' : ''}
                        >
                            <div className="sidebar-link-content">
                                <FontAwesomeIcon icon={faUserFriends} className="sidebar-icon" />
                                <span className="sidebar-text">Parties</span>
                            </div>
                        </Nav.Link>
                    </div>

                    {/* Sales - UPDATED: Removed sales orders, create sales order, and credit notes */}
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
                                        className={getItemClass('allSales')}
                                        title={isItemDisabled('allSales') ? 'Select a company to access Sales' : ''}
                                    >
                                        All Sales
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('invoices')}
                                        className={getItemClass('invoices')}
                                        title={isItemDisabled('invoices') ? 'Select a company to access Invoices' : ''}
                                    >
                                        <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                                        Invoices
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('createInvoice')}
                                        className={getItemClass('createInvoice')}
                                        title={isItemDisabled('createInvoice') ? 'Select a company to create invoices' : ''}
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                                        Create Invoice
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
                                        className={getItemClass('purchaseBills')}
                                        title={isItemDisabled('purchaseBills') ? 'Select a company to access Purchase Bills' : ''}
                                    >
                                        <FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2" />
                                        Purchase Bills
                                    </Nav.Link>
                                    {/* <Nav.Link
                                        onClick={() => handleNavigation('paymentOut')}
                                        className={getItemClass('paymentOut')}
                                        title={isItemDisabled('paymentOut') ? 'Select a company to access Payment Out' : ''}
                                    >
                                        <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                                        Payment Out
                                    </Nav.Link> */}
                                    <Nav.Link
                                        onClick={() => handleNavigation('expenses')}
                                        className={getItemClass('expenses')}
                                        title={isItemDisabled('expenses') ? 'Select a company to access Expenses' : ''}
                                    >
                                        <FontAwesomeIcon icon={faReceipt} className="me-2" />
                                        Expenses
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('purchaseOrder')}
                                        className={getItemClass('purchaseOrder')}
                                        title={isItemDisabled('purchaseOrder') ? 'Select a company to access Purchase Orders' : ''}
                                    >
                                        <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                                        Purchase Order
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('purchaseReturn')}
                                        className={getItemClass('purchaseReturn')}
                                        title={isItemDisabled('purchaseReturn') ? 'Select a company to access Purchase Returns' : ''}
                                    >
                                        <FontAwesomeIcon icon={faUndoAlt} className="me-2" />
                                        Purchase Return/ Dr. Note
                                    </Nav.Link>
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    </div>

                    {/* Bank & Cash */}
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
                                        className={getItemClass('bankAccounts')}
                                        title={isItemDisabled('bankAccounts') ? 'Select a company to access Bank Accounts' : ''}
                                    >
                                        <FontAwesomeIcon icon={faUniversity} className="me-2" />
                                        Bank Accounts
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('cashAccounts')}
                                        className={getItemClass('cashAccounts')}
                                        title={isItemDisabled('cashAccounts') ? 'Select a company to access Cash Accounts' : ''}
                                    >
                                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                                        Cash Accounts
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('bankTransactions')}
                                        className={getItemClass('bankTransactions')}
                                        title={isItemDisabled('bankTransactions') ? 'Select a company to access Bank Transactions' : ''}
                                    >
                                        <FontAwesomeIcon icon={faTransfer} className="me-2" />
                                        Transactions
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('bankReconciliation')}
                                        className={getItemClass('bankReconciliation')}
                                        title={isItemDisabled('bankReconciliation') ? 'Select a company to access Bank Reconciliation' : ''}
                                    >
                                        <FontAwesomeIcon icon={faBalanceScale} className="me-2" />
                                        Reconciliation
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('cashFlow')}
                                        className={getItemClass('cashFlow')}
                                        title={isItemDisabled('cashFlow') ? 'Select a company to access Cash Flow Report' : ''}
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
                            className={getSidebarLinkClass('products')}
                            title={isItemDisabled('products') ? 'Select a company to access Products & Services' : ''}
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
                                        className={getItemClass('allProducts')}
                                        title={isItemDisabled('allProducts') ? 'Select a company to access All Products' : ''}
                                    >
                                        <FontAwesomeIcon icon={faWarehouse} className="me-2" />
                                        All Products
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('lowStock')}
                                        className={getItemClass('lowStock')}
                                        title={isItemDisabled('lowStock') ? 'Select a company to access Low Stock Items' : ''}
                                    >
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                        Low Stock Items
                                    </Nav.Link>
                                    <Nav.Link
                                        onClick={() => handleNavigation('stockMovement')}
                                        className={getItemClass('stockMovement')}
                                        title={isItemDisabled('stockMovement') ? 'Select a company to access Stock Movement' : ''}
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
                            className={getSidebarLinkClass('staff')}
                            title={isItemDisabled('staff') ? 'Select a company to access Staff Management' : ''}
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
                            className={getSidebarLinkClass('insights')}
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
                            className={getSidebarLinkClass('reports')}
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
                            className={getSidebarLinkClass('settings')}
                        >
                            <div className="sidebar-link-content">
                                <FontAwesomeIcon icon={faCog} className="sidebar-icon" />
                                <span className="sidebar-text">Settings</span>
                            </div>
                        </Nav.Link>
                    </div>
                </Accordion>

                {/* No Company Warning (when sidebar is open) */}
                {isOpen && !currentCompany && (
                    <div className="sidebar-warning">
                        <div className="alert alert-warning small">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                            Select a company to access all features
                        </div>
                    </div>
                )}

                {/* Offline Warning (when sidebar is open) */}
                {isOpen && !isOnline && (
                    <div className="sidebar-warning">
                        <div className="alert alert-info small">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                            You're offline. Some features may be limited.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Sidebar;