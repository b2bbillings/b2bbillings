import {useState, useEffect} from "react";
import {Accordion, Nav} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
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
  faPlus,
  faTasks,
  faCalendarCheck,
  faUserClock,
  faUsers,
  faIdBadge,
  faBusinessTime,
  faUserCheck,
  faCalendarAlt,
  faClipboardCheck,
} from "@fortawesome/free-solid-svg-icons";
import "./Sidebar.css";

function Sidebar({
  isOpen,
  toggleSidebar,
  onNavigate,
  activePage,
  currentCompany,
  currentUser,
  isOnline,
  companyId,
}) {
  // Track active menu item
  const [activeKey, setActiveKey] = useState("dayBook");

  // Auto-expand accordion based on active page
  useEffect(() => {
    const pageToAccordionMap = {
      // Day Book pages
      dailySummary: "dayBook",
      transactions: "dayBook",
      cashAndBank: "dayBook",

      // Sales pages
      quotations: "sales",
      invoices: "sales",

      purchaseBills: "purchaseExpense",
      purchaseOrder: "purchaseExpense",
      purchaseOrders: "purchaseExpense",
      "purchase-orders": "purchaseExpense", // Added kebab-case route
      createPurchaseOrder: "purchaseExpense",

      // Bank & Cash pages
      bankAccounts: "bankCash",
      cashAccounts: "bankCash",
      bankTransactions: "bankCash",
      bankReconciliation: "bankCash",
      cashFlow: "bankCash",

      // Inventory pages
      inventory: "inventory",
      allProducts: "inventory",
      lowStock: "inventory",
      stockMovement: "inventory",

      // Staff Management pages
      staff: "staffManagement",
      staffList: "staffManagement",
      dailyTaskAssignment: "staffManagement",
      "daily-task-assignment": "staffManagement", // Added kebab-case route
      staffAttendance: "staffManagement",
      staffPerformance: "staffManagement",
      staffSchedule: "staffManagement",
      employeeManagement: "staffManagement",
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

  // ✅ UPDATED: Function to handle navigation with company validation and proper routing
  const handleNavigation = (page) => {
    console.log("🔍 Navigation Debug:", {
      page,
      companyId,
      currentCompanyId: currentCompany?.id,
      currentCompanyName: currentCompany?.name || currentCompany?.businessName,
    });

    const requiresCompany = [
      "inventory",
      "allProducts",
      "lowStock",
      "stockMovement",
      "quotations",
      "invoices",
      "purchaseBills",
      "purchaseOrder",
      "purchaseOrders",
      "createPurchaseOrder",
      "bankAccounts",
      "cashAccounts",
      "bankTransactions",
      "bankReconciliation",
      "cashFlow",
      "parties",
      "staff",
      "staffList",
      "dailyTaskAssignment",
      "staffAttendance",
      "staffPerformance",
      "staffSchedule",
      "employeeManagement",
    ].includes(page);

    // Get the effective company ID
    const effectiveCompanyId =
      companyId || currentCompany?.id || currentCompany?._id;

    if (requiresCompany && !effectiveCompanyId) {
      console.warn(
        "⚠️ Navigation blocked: No company selected for page:",
        page
      );
      // Show toast if available
      if (window.showToast) {
        window.showToast("Please select a company first", "warning");
      } else {
        alert("Please select a company first");
      }
      return;
    }

    // ✅ ADDED: Direct route handling for staff management pages
    if (page === "dailyTaskAssignment") {
      console.log("✅ Navigating to Daily Task Assignment");
      window.location.href = `/companies/${effectiveCompanyId}/staff/daily-task-assignment`;
      return;
    }

    if (page === "staffList" || page === "staff") {
      console.log("✅ Navigating to Staff List");
      window.location.href = `/companies/${effectiveCompanyId}/staff`;
      return;
    }

    if (page === "staffAttendance") {
      console.log("✅ Navigating to Staff Attendance");
      window.location.href = `/companies/${effectiveCompanyId}/staff/attendance`;
      return;
    }

    if (page === "staffPerformance") {
      console.log("✅ Navigating to Staff Performance");
      window.location.href = `/companies/${effectiveCompanyId}/staff/performance`;
      return;
    }

    if (page === "staffSchedule") {
      console.log("✅ Navigating to Staff Schedule");
      window.location.href = `/companies/${effectiveCompanyId}/staff/schedule`;
      return;
    }

    if (page === "employeeManagement") {
      console.log("✅ Navigating to Employee Management");
      window.location.href = `/companies/${effectiveCompanyId}/staff/employees`;
      return;
    }

    // ✅ ADDED: Direct route handling for other common pages
    if (page === "parties") {
      window.location.href = `/companies/${effectiveCompanyId}/parties`;
      return;
    }

    if (page === "products") {
      window.location.href = `/companies/${effectiveCompanyId}/products`;
      return;
    }

    if (page === "inventory") {
      window.location.href = `/companies/${effectiveCompanyId}/inventory`;
      return;
    }

    if (page === "allProducts") {
      window.location.href = `/companies/${effectiveCompanyId}/inventory`;
      return;
    }

    if (page === "quotations") {
      window.location.href = `/companies/${effectiveCompanyId}/quotations`;
      return;
    }

    if (page === "invoices") {
      window.location.href = `/companies/${effectiveCompanyId}/sales`;
      return;
    }

    if (page === "purchaseBills") {
      window.location.href = `/companies/${effectiveCompanyId}/purchases`;
      return;
    }

    if (page === "purchaseOrders") {
      window.location.href = `/companies/${effectiveCompanyId}/purchase-orders`;
      return;
    }

    // ✅ Fallback to onNavigate prop for other pages
    if (onNavigate) {
      console.log("📞 Calling onNavigate with:", page);
      onNavigate(page);
    } else {
      console.warn("⚠️ No navigation handler available for:", page);
    }
  };

  // Update the isItemDisabled function
  const isItemDisabled = (page) => {
    const requiresCompany = [
      "inventory",
      "allProducts",
      "lowStock",
      "stockMovement",
      "quotations",
      "invoices",
      "purchaseBills",
      "purchaseOrder",
      "purchaseOrders",
      "createPurchaseOrder",
      "bankAccounts",
      "cashAccounts",
      "bankTransactions",
      "bankReconciliation",
      "cashFlow",
      "parties",
      "staff",
      "staffList",
      "dailyTaskAssignment",
      "staffAttendance",
      "staffPerformance",
      "staffSchedule",
      "employeeManagement",
    ].includes(page);

    const effectiveCompanyId =
      companyId || currentCompany?.id || currentCompany?._id;

    return requiresCompany && !effectiveCompanyId;
  };

  // Get item class with disabled state
  const getItemClass = (page, baseClass = "submenu-item") => {
    let classes = [baseClass];

    if (
      activePage === page ||
      activePage === page.replace(/([A-Z])/g, "-$1").toLowerCase()
    ) {
      classes.push("active");
    }

    if (isItemDisabled(page)) {
      classes.push("disabled");
    }

    return classes.join(" ");
  };

  // Get sidebar link class with disabled state
  const getSidebarLinkClass = (page) => {
    let classes = ["sidebar-link"];

    if (
      activePage === page ||
      activePage === page.replace(/([A-Z])/g, "-$1").toLowerCase()
    ) {
      classes.push("active");
    }

    if (isItemDisabled(page)) {
      classes.push("disabled");
    }

    return classes.join(" ");
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-menu">
        {/* Company Info (when sidebar is open) */}
        {isOpen && currentCompany && (
          <div className="sidebar-company-info">
            <div className="company-name">
              {currentCompany.businessName || currentCompany.name}
            </div>
          </div>
        )}

        <Accordion
          defaultActiveKey="dayBook"
          activeKey={activeKey}
          className="sidebar-accordion"
        >
          {/* Day Book */}
          <div className="sidebar-item">
            <Accordion.Item
              eventKey="dayBook"
              className="sidebar-accordion-item"
            >
              <Accordion.Header
                onClick={() => handleToggle("dayBook")}
                className="sidebar-header"
              >
                <div className="sidebar-link-content">
                  <FontAwesomeIcon icon={faBook} className="sidebar-icon" />
                  <span className="sidebar-text">Day Book</span>
                </div>
                <FontAwesomeIcon
                  icon={faAngleRight}
                  className={`chevron-icon ${
                    activeKey === "dayBook" ? "rotated" : ""
                  }`}
                />
              </Accordion.Header>
              <Accordion.Body className="sidebar-submenu">
                <Nav className="flex-column">
                  <Nav.Link
                    onClick={() => handleNavigation("dailySummary")}
                    className={getItemClass("dailySummary")}
                  >
                    Daily Summary
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("transactions")}
                    className={getItemClass("transactions")}
                  >
                    Transactions
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("cashAndBank")}
                    className={getItemClass("cashAndBank")}
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
              onClick={() => handleNavigation("parties")}
              className={getSidebarLinkClass("parties")}
              title={
                isItemDisabled("parties")
                  ? "Select a company to access Parties"
                  : ""
              }
            >
              <div className="sidebar-link-content">
                <FontAwesomeIcon
                  icon={faUserFriends}
                  className="sidebar-icon"
                />
                <span className="sidebar-text">Parties</span>
              </div>
            </Nav.Link>
          </div>

          {/* Sales */}
          <div className="sidebar-item">
            <Accordion.Item eventKey="sales" className="sidebar-accordion-item">
              <Accordion.Header
                onClick={() => handleToggle("sales")}
                className="sidebar-header"
              >
                <div className="sidebar-link-content">
                  <FontAwesomeIcon
                    icon={faShoppingCart}
                    className="sidebar-icon"
                  />
                  <span className="sidebar-text">Sales</span>
                </div>
                <FontAwesomeIcon
                  icon={faAngleRight}
                  className={`chevron-icon ${
                    activeKey === "sales" ? "rotated" : ""
                  }`}
                />
              </Accordion.Header>
              <Accordion.Body className="sidebar-submenu">
                <Nav className="flex-column">
                  <Nav.Link
                    onClick={() => handleNavigation("quotations")}
                    className={getItemClass("quotations")}
                    title={
                      isItemDisabled("quotations")
                        ? "Select a company to access Quotations"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faFileContract} className="me-2" />
                    Quotations
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("invoices")}
                    className={getItemClass("invoices")}
                    title={
                      isItemDisabled("invoices")
                        ? "Select a company to access Invoices"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                    Invoices
                  </Nav.Link>
                </Nav>
              </Accordion.Body>
            </Accordion.Item>
          </div>

          {/* Purchase & Expense */}
          <div className="sidebar-item">
            <Accordion.Item
              eventKey="purchaseExpense"
              className="sidebar-accordion-item"
            >
              <Accordion.Header
                onClick={() => handleToggle("purchaseExpense")}
                className="sidebar-header"
              >
                <div className="sidebar-link-content">
                  <FontAwesomeIcon
                    icon={faShoppingBag}
                    className="sidebar-icon"
                  />
                  <span className="sidebar-text">Purchase & Expense</span>
                </div>
                <FontAwesomeIcon
                  icon={faAngleRight}
                  className={`chevron-icon ${
                    activeKey === "purchaseExpense" ? "rotated" : ""
                  }`}
                />
              </Accordion.Header>
              <Accordion.Body className="sidebar-submenu">
                <Nav className="flex-column">
                  <Nav.Link
                    onClick={() => handleNavigation("purchaseBills")}
                    className={getItemClass("purchaseBills")}
                    title={
                      isItemDisabled("purchaseBills")
                        ? "Select a company to access Purchase Bills"
                        : ""
                    }
                  >
                    <FontAwesomeIcon
                      icon={faFileInvoiceDollar}
                      className="me-2"
                    />
                    Purchase Bills
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("purchaseOrders")}
                    className={getItemClass("purchaseOrders")}
                    title={
                      isItemDisabled("purchaseOrders")
                        ? "Select a company to access Purchase Orders"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                    Purchase Orders
                  </Nav.Link>
                </Nav>
              </Accordion.Body>
            </Accordion.Item>
          </div>

          {/* Bank & Cash */}
          <div className="sidebar-item">
            <Accordion.Item
              eventKey="bankCash"
              className="sidebar-accordion-item"
            >
              <Accordion.Header
                onClick={() => handleToggle("bankCash")}
                className="sidebar-header"
              >
                <div className="sidebar-link-content">
                  <FontAwesomeIcon
                    icon={faUniversity}
                    className="sidebar-icon"
                  />
                  <span className="sidebar-text">Bank & Cash</span>
                </div>
                <FontAwesomeIcon
                  icon={faAngleRight}
                  className={`chevron-icon ${
                    activeKey === "bankCash" ? "rotated" : ""
                  }`}
                />
              </Accordion.Header>
              <Accordion.Body className="sidebar-submenu">
                <Nav className="flex-column">
                  <Nav.Link
                    onClick={() => handleNavigation("bankAccounts")}
                    className={getItemClass("bankAccounts")}
                    title={
                      isItemDisabled("bankAccounts")
                        ? "Select a company to access Bank Accounts"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faUniversity} className="me-2" />
                    Bank Accounts
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("cashAccounts")}
                    className={getItemClass("cashAccounts")}
                    title={
                      isItemDisabled("cashAccounts")
                        ? "Select a company to access Cash Accounts"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                    Cash Accounts
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("bankTransactions")}
                    className={getItemClass("bankTransactions")}
                    title={
                      isItemDisabled("bankTransactions")
                        ? "Select a company to access Bank Transactions"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faTransfer} className="me-2" />
                    Transactions
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("bankReconciliation")}
                    className={getItemClass("bankReconciliation")}
                    title={
                      isItemDisabled("bankReconciliation")
                        ? "Select a company to access Bank Reconciliation"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faBalanceScale} className="me-2" />
                    Reconciliation
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("cashFlow")}
                    className={getItemClass("cashFlow")}
                    title={
                      isItemDisabled("cashFlow")
                        ? "Select a company to access Cash Flow Report"
                        : ""
                    }
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
              onClick={() => handleNavigation("products")}
              className={getSidebarLinkClass("products")}
              title={
                isItemDisabled("products")
                  ? "Select a company to access Products & Services"
                  : ""
              }
            >
              <div className="sidebar-link-content">
                <FontAwesomeIcon icon={faBoxes} className="sidebar-icon" />
                <span className="sidebar-text">Products & Services</span>
              </div>
            </Nav.Link>
          </div>

          {/* Inventory */}
          <div className="sidebar-item">
            <Accordion.Item
              eventKey="inventory"
              className="sidebar-accordion-item"
            >
              <Accordion.Header
                onClick={() => handleToggle("inventory")}
                className="sidebar-header"
              >
                <div className="sidebar-link-content">
                  <FontAwesomeIcon
                    icon={faLayerGroup}
                    className="sidebar-icon"
                  />
                  <span className="sidebar-text">Inventory</span>
                </div>
                <FontAwesomeIcon
                  icon={faAngleRight}
                  className={`chevron-icon ${
                    activeKey === "inventory" ? "rotated" : ""
                  }`}
                />
              </Accordion.Header>
              <Accordion.Body className="sidebar-submenu">
                <Nav className="flex-column">
                  <Nav.Link
                    onClick={() => handleNavigation("allProducts")}
                    className={getItemClass("allProducts")}
                    title={
                      isItemDisabled("allProducts")
                        ? "Select a company to access All Products"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faWarehouse} className="me-2" />
                    All Products
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("lowStock")}
                    className={getItemClass("lowStock")}
                    title={
                      isItemDisabled("lowStock")
                        ? "Select a company to access Low Stock Items"
                        : ""
                    }
                  >
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-2"
                    />
                    Low Stock Items
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => handleNavigation("stockMovement")}
                    className={getItemClass("stockMovement")}
                    title={
                      isItemDisabled("stockMovement")
                        ? "Select a company to access Stock Movement"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                    Stock Movement
                  </Nav.Link>
                </Nav>
              </Accordion.Body>
            </Accordion.Item>
          </div>

          {/* ✅ STAFF MANAGEMENT - With proper navigation handling */}
          <div className="sidebar-item">
            <Accordion.Item
              eventKey="staffManagement"
              className="sidebar-accordion-item"
            >
              <Accordion.Header
                onClick={() => handleToggle("staffManagement")}
                className="sidebar-header"
              >
                <div className="sidebar-link-content">
                  <FontAwesomeIcon icon={faUserTie} className="sidebar-icon" />
                  <span className="sidebar-text">Staff Management</span>
                </div>
                <FontAwesomeIcon
                  icon={faAngleRight}
                  className={`chevron-icon ${
                    activeKey === "staffManagement" ? "rotated" : ""
                  }`}
                />
              </Accordion.Header>
              <Accordion.Body className="sidebar-submenu">
                <Nav className="flex-column">
                  <Nav.Link
                    onClick={() => {
                      console.log("🎯 Clicked Staff List");
                      handleNavigation("staffList");
                    }}
                    className={getItemClass("staffList")}
                    title={
                      isItemDisabled("staffList")
                        ? "Select a company to access Staff List"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faUsers} className="me-2" />
                    Staff List
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => {
                      console.log("🎯 Clicked Daily Task Assignment");
                      handleNavigation("dailyTaskAssignment");
                    }}
                    className={getItemClass("dailyTaskAssignment")}
                    title={
                      isItemDisabled("dailyTaskAssignment")
                        ? "Select a company to access Daily Task Assignment"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faTasks} className="me-2" />
                    Daily Task Assignment
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => {
                      console.log("🎯 Clicked Staff Attendance");
                      handleNavigation("staffAttendance");
                    }}
                    className={getItemClass("staffAttendance")}
                    title={
                      isItemDisabled("staffAttendance")
                        ? "Select a company to access Staff Attendance"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faCalendarCheck} className="me-2" />
                    Staff Attendance
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => {
                      console.log("🎯 Clicked Staff Performance");
                      handleNavigation("staffPerformance");
                    }}
                    className={getItemClass("staffPerformance")}
                    title={
                      isItemDisabled("staffPerformance")
                        ? "Select a company to access Staff Performance"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faChartLine} className="me-2" />
                    Staff Performance
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => {
                      console.log("🎯 Clicked Staff Schedule");
                      handleNavigation("staffSchedule");
                    }}
                    className={getItemClass("staffSchedule")}
                    title={
                      isItemDisabled("staffSchedule")
                        ? "Select a company to access Staff Schedule"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Staff Schedule
                  </Nav.Link>
                  <Nav.Link
                    onClick={() => {
                      console.log("🎯 Clicked Employee Management");
                      handleNavigation("employeeManagement");
                    }}
                    className={getItemClass("employeeManagement")}
                    title={
                      isItemDisabled("employeeManagement")
                        ? "Select a company to access Employee Management"
                        : ""
                    }
                  >
                    <FontAwesomeIcon icon={faIdBadge} className="me-2" />
                    Employee Management
                  </Nav.Link>
                </Nav>
              </Accordion.Body>
            </Accordion.Item>
          </div>

          {/* Insights */}
          <div className="sidebar-item">
            <Nav.Link
              onClick={() => handleNavigation("insights")}
              className={getSidebarLinkClass("insights")}
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
              onClick={() => handleNavigation("reports")}
              className={getSidebarLinkClass("reports")}
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
              onClick={() => handleNavigation("settings")}
              className={getSidebarLinkClass("settings")}
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
