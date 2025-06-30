import React, {useState, useCallback, useMemo, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Tab,
  Nav,
  Alert,
  Button,
  Modal,
  Form,
  Badge,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faBuilding,
  faFileExport,
  faPlus,
  faExclamationTriangle,
  faSync,
  faExchangeAlt,
  faCheckCircle,
  faInfoCircle,
  faFileImport,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Import all components
import PurchaseOrderTable from "./PurchaseOrderForm/PurchaseOrderTable";
import PurchaseOrderSummary from "./PurchaseOrderForm/PurchaseOrderSummary";
import PurchaseOrderPageTitle from "./PurchaseOrderForm/PurchaseOrderPageTitle";
import PurchaseOrderFilter from "./PurchaseOrderForm/PurchaseOrderFilter";
import PurchaseOrderHeader from "./PurchaseOrderForm/PurchaseOrderHeader";
import purchaseOrderService from "../../../services/purchaseOrderService";
import saleOrderService from "../../../services/saleOrderService";

function PurchaseOrder({
  currentCompany,
  currentUser,
  onNavigate,
  isOnline,
  lastChecked,
  addToast,
  companyId: propCompanyId,
}) {
  const navigate = useNavigate();

  // ✅ SIMPLIFIED State Management
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ✅ Filter states for PurchaseOrderFilter
  const [dateRange, setDateRange] = useState("This Month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  // ✅ Modal states for bidirectional operations
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedOrderForGeneration, setSelectedOrderForGeneration] =
    useState(null);
  const [generateOptions, setGenerateOptions] = useState({
    targetCompanyId: "",
    notes: "",
    skipCircularValidation: false,
    autoCreateSupplier: true,
  });

  // ✅ Get effective company ID
  const companyId = propCompanyId || currentCompany?.id || currentCompany?._id;

  // ✅ ENHANCED: Load purchase orders
  const loadPurchaseOrders = useCallback(async () => {
    if (!companyId) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const filters = {
        ...(searchTerm && searchTerm.trim() && {search: searchTerm.trim()}),
        ...(filterStatus && filterStatus !== "all" && {status: filterStatus}),
        ...(supplierFilter &&
          supplierFilter.trim() && {supplier: supplierFilter.trim()}),
        ...(dateRange && dateRange !== "Custom Range" && {dateRange}),
        ...(startDate && {startDate}),
        ...(endDate && {endDate}),
        includeBidirectional: true,
        includeSourceInfo: true,
        includeGeneratedOrders: true,
        sortBy,
        sortOrder,
      };

      let response;
      try {
        response = await purchaseOrderService.getPurchaseOrders(
          companyId,
          filters
        );
      } catch (error) {
        try {
          response =
            await purchaseOrderService.getOrdersWithBidirectionalData?.(
              companyId,
              filters
            );
        } catch (bidirectionalError) {
          throw error;
        }
      }

      if (response?.success) {
        let ordersData = [];

        if (response.data?.orders && Array.isArray(response.data.orders)) {
          ordersData = response.data.orders;
        } else if (
          response.data?.purchaseOrders &&
          Array.isArray(response.data.purchaseOrders)
        ) {
          ordersData = response.data.purchaseOrders;
        } else if (Array.isArray(response.data)) {
          ordersData = response.data;
        }

        setOrders(ordersData);
        addToast?.(
          `Loaded ${ordersData.length} purchase orders successfully`,
          "success"
        );
      } else {
        throw new Error(response?.message || "Failed to load purchase orders");
      }
    } catch (error) {
      setError(error.message || "Failed to load purchase orders");
      setOrders([]);
      addToast?.("Failed to load purchase orders: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    companyId,
    searchTerm,
    filterStatus,
    supplierFilter,
    dateRange,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    addToast,
  ]);

  // ✅ Load orders on component mount and when dependencies change
  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders, refreshTrigger]);

  // ✅ Calculate summary stats from orders
  const summaryStats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalOrderAmount: 0,
        totalOrders: 0,
        autoGeneratedOrders: 0,
        ordersWithGeneratedSO: 0,
        ordersFromSalesOrders: 0,
        uniqueSuppliers: 0,
        pendingOrders: 0,
        completedOrders: 0,
      };
    }

    const autoGeneratedOrders = orders.filter(
      (order) =>
        order.isAutoGenerated || order.sourceOrderType === "sales_order"
    ).length;

    const ordersWithGeneratedSO = orders.filter(
      (order) =>
        order.autoGeneratedSalesOrder ||
        order.salesOrderRef ||
        order.hasGeneratedSalesOrder
    ).length;

    const ordersFromSalesOrders = orders.filter(
      (order) => order.sourceOrderType === "sales_order"
    ).length;

    const totalOrderAmount = orders.reduce((sum, order) => {
      const amount = parseFloat(
        order.amount || order.total || order.orderValue || 0
      );
      return sum + amount;
    }, 0);

    const uniqueSuppliers = new Set(
      orders.map(
        (order) => order.supplierName || order.supplier?.name || "Unknown"
      )
    ).size;

    const pendingOrders = orders.filter((order) =>
      ["draft", "pending", "confirmed"].includes(order.status)
    ).length;

    const completedOrders = orders.filter((order) =>
      ["completed", "received"].includes(order.status)
    ).length;

    return {
      totalOrders: orders.length,
      totalOrderAmount,
      autoGeneratedOrders,
      ordersWithGeneratedSO,
      ordersFromSalesOrders,
      uniqueSuppliers,
      pendingOrders,
      completedOrders,
    };
  }, [orders]);

  // ✅ Event Handlers
  const handleSearchChange = useCallback((e) => {
    const value = typeof e === "string" ? e : e?.target?.value || "";
    setSearchTerm(value);
  }, []);

  const handleSort = useCallback(
    (field, newSortOrder) => {
      if (newSortOrder) {
        setSortOrder(newSortOrder);
      } else {
        setSortOrder((prev) =>
          sortBy === field ? (prev === "asc" ? "desc" : "asc") : "asc"
        );
      }
      setSortBy(field);
    },
    [sortBy]
  );

  const handleFilterChange = useCallback((status) => {
    setFilterStatus(status);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    addToast?.("Purchase orders refreshed", "success");
  }, [addToast]);

  // ✅ Navigation handlers
  const handleAddPurchaseOrder = useCallback(() => {
    if (!companyId) {
      addToast?.("Please select a company first", "warning");
      return;
    }
    navigate(`/companies/${companyId}/purchase-orders/add`);
  }, [companyId, navigate, addToast]);

  const handleAddPurchase = useCallback(() => {
    if (!companyId) {
      addToast?.("Please select a company first", "warning");
      return;
    }
    navigate(`/companies/${companyId}/purchases/add`);
  }, [companyId, navigate, addToast]);

  // ✅ Purchase Order Action Handlers
  const handleViewOrder = useCallback(
    (order) => {
      addToast?.(`Viewing order ${order.orderNumber || order.id}`, "info");
    },
    [addToast]
  );

  const handleEditOrder = useCallback(
    (order) => {
      if (!companyId) return;
      navigate(
        `/companies/${companyId}/purchase-orders/edit/${order._id || order.id}`
      );
    },
    [companyId, navigate]
  );

  const handleDeleteOrder = useCallback(
    (order) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete order ${
          order.orderNumber || order.id
        }?`
      );
      if (confirmed) {
        setOrders((prev) => prev.filter((o) => o._id !== order._id));
        addToast?.(`Order ${order.orderNumber || order.id} deleted`, "success");
      }
    },
    [addToast]
  );

  const handlePrintOrder = useCallback(
    (order) => {
      addToast?.(`Printing order ${order.orderNumber || order.id}`, "info");
    },
    [addToast]
  );

  const handleShareOrder = useCallback(
    (order) => {
      addToast?.(`Sharing order ${order.orderNumber || order.id}`, "info");
    },
    [addToast]
  );

  const handleDownloadOrder = useCallback(
    (order) => {
      addToast?.(`Downloading order ${order.orderNumber || order.id}`, "info");
    },
    [addToast]
  );

  const handleConvertOrder = useCallback(
    (order) => {
      addToast?.(
        `Converting order ${order.orderNumber || order.id} to invoice`,
        "info"
      );
    },
    [addToast]
  );

  const handleConfirmOrder = useCallback(
    (order) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? {...o, status: "confirmed"} : o))
      );
      addToast?.(`Order ${order.orderNumber || order.id} confirmed`, "success");
    },
    [addToast]
  );

  const handleShipOrder = useCallback((order) => {
    setOrders((prev) =>
      prev.map((o) => (o._id === order._id ? {...o, status: "shipped"} : o))
    );
  }, []);

  const handleReceiveOrder = useCallback((order) => {
    setOrders((prev) =>
      prev.map((o) => (o._id === order._id ? {...o, status: "received"} : o))
    );
  }, []);

  const handleCompleteOrder = useCallback((order) => {
    setOrders((prev) =>
      prev.map((o) => (o._id === order._id ? {...o, status: "completed"} : o))
    );
  }, []);

  const handleCancelOrder = useCallback((order) => {
    setOrders((prev) =>
      prev.map((o) => (o._id === order._id ? {...o, status: "cancelled"} : o))
    );
  }, []);

  const handleDuplicateOrder = useCallback((order) => {
    const newOrder = {
      ...order,
      _id: `${order._id}-copy-${Date.now()}`,
      orderNumber: `${order.orderNumber}-COPY`,
      status: "draft",
      orderDate: new Date().toISOString(),
    };
    setOrders((prev) => [newOrder, ...prev]);
  }, []);

  // ✅ Bidirectional action handlers
  const handleViewSourceOrder = useCallback(
    (purchaseOrder) => {
      if (
        purchaseOrder.sourceOrderId &&
        purchaseOrder.sourceOrderType === "sales_order"
      ) {
        if (onNavigate) {
          onNavigate("salesOrders", {
            orderId: purchaseOrder.sourceOrderId,
            highlight: true,
          });
        }
        addToast?.(
          `Viewing source sales order: ${purchaseOrder.sourceOrderNumber}`,
          "info"
        );
      } else {
        addToast?.("No source order found for this purchase order", "warning");
      }
    },
    [onNavigate, addToast]
  );

  const handleViewGeneratedOrders = useCallback(
    (purchaseOrder) => {
      if (
        purchaseOrder.salesOrderRef ||
        purchaseOrder.autoGeneratedSalesOrder
      ) {
        if (onNavigate) {
          onNavigate("salesOrders", {
            orderId:
              purchaseOrder.salesOrderRef ||
              purchaseOrder.correspondingSalesOrderId,
            highlight: true,
          });
        }
        addToast?.(
          `Viewing generated sales order: ${
            purchaseOrder.salesOrderNumber || "Generated Order"
          }`,
          "info"
        );
      } else {
        addToast?.(
          "No generated orders found for this purchase order",
          "warning"
        );
      }
    },
    [onNavigate, addToast]
  );

  const handleGenerateSalesOrder = useCallback(
    (purchaseOrder) => {
      setGenerateOptions({
        targetCompanyId: companyId,
        notes: `Generated from PO: ${purchaseOrder.orderNumber}`,
        skipCircularValidation: false,
        autoCreateSupplier: true,
      });
      setSelectedOrderForGeneration(purchaseOrder);
      setShowGenerateModal(true);
    },
    [companyId]
  );

  const executeGenerateSalesOrder = useCallback(async () => {
    if (!selectedOrderForGeneration) return;

    try {
      if (!saleOrderService?.generateFromPurchaseOrder) {
        addToast?.(
          "Generate Sales Order feature is not available yet",
          "warning"
        );
        return;
      }

      const response = await saleOrderService.generateFromPurchaseOrder(
        selectedOrderForGeneration._id,
        generateOptions
      );

      if (response?.success) {
        addToast?.(
          `Sales order generated successfully: ${
            response.data?.orderNumber || "New Order"
          }`,
          "success"
        );
        setRefreshTrigger((prev) => prev + 1);
        setShowGenerateModal(false);
        setSelectedOrderForGeneration(null);
      } else {
        throw new Error(response?.message || "Failed to generate sales order");
      }
    } catch (error) {
      addToast?.(`Failed to generate sales order: ${error.message}`, "error");
    }
  }, [selectedOrderForGeneration, generateOptions, addToast]);

  const handleViewTrackingChain = useCallback(
    async (purchaseOrder) => {
      try {
        if (!purchaseOrderService?.getTrackingChain) {
          addToast?.("Tracking chain feature is not available yet", "warning");
          return;
        }

        const response = await purchaseOrderService.getTrackingChain(
          purchaseOrder._id
        );
        if (response?.success) {
          addToast?.(
            `Tracking chain loaded for ${purchaseOrder.orderNumber}`,
            "success"
          );
        } else {
          throw new Error(response?.message || "Failed to load tracking chain");
        }
      } catch (error) {
        addToast?.(`Failed to load tracking chain: ${error.message}`, "error");
      }
    },
    [addToast]
  );

  // ✅ Modal handlers
  const handleCloseGenerateModal = useCallback(() => {
    setShowGenerateModal(false);
    setSelectedOrderForGeneration(null);
    setGenerateOptions({
      targetCompanyId: companyId,
      notes: "",
      skipCircularValidation: false,
      autoCreateSupplier: true,
    });
  }, [companyId]);

  const handleGenerateOptionsChange = useCallback((field, value) => {
    setGenerateOptions((prev) => ({...prev, [field]: value}));
  }, []);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        margin: 0,
        padding: 0,
      }}
    >
      <style>
        {`
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          
          .table-responsive {
            overflow-x: auto;
            overflow-y: visible;
          }
          
          .card-body {
            overflow: visible !important;
          }
          
          .container-fluid,
          .row,
          .col {
            overflow: visible;
          }
          
          /* Remove all border radius */
          .card,
          .btn,
          .alert,
          .badge,
          .nav-tabs .nav-link,
          .form-control,
          .form-select,
          .input-group-text,
          .modal-content,
          .modal-header,
          .modal-body,
          .modal-footer {
            border-radius: 0 !important;
          }
        `}
      </style>

      {/* ✅ Purchase Order Header at Top */}
      <PurchaseOrderHeader
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onAddPurchaseOrder={handleAddPurchaseOrder}
        onAddPurchase={handleAddPurchase}
        pageTitle="Purchase Orders"
        companyId={companyId}
        currentCompany={currentCompany}
        addToast={addToast}
        onNavigate={onNavigate}
        totalOrders={summaryStats.totalOrders}
        pendingOrders={summaryStats.pendingOrders}
        completedOrders={summaryStats.completedOrders}
      />

      {/* ✅ Page Title Component */}
      <PurchaseOrderPageTitle
        onAddPurchase={handleAddPurchaseOrder}
        billCount={orders.length}
        companyId={companyId}
        mode="orders"
        documentType="order"
        title="Purchase Orders"
        subtitle="Create and manage purchase orders"
      />

      {/* ✅ Filter Component */}
      <div className="px-3">
        <PurchaseOrderFilter
          dateRange={dateRange}
          startDate={startDate}
          endDate={endDate}
          statusFilter={filterStatus}
          supplierFilter={supplierFilter}
          onDateRangeChange={setDateRange}
          onStartDateChange={(e) => setStartDate(e.target.value)}
          onEndDateChange={(e) => setEndDate(e.target.value)}
          onStatusFilterChange={setFilterStatus}
          onSupplierFilterChange={setSupplierFilter}
          mode="orders"
          documentType="order"
        />
      </div>

      {/* ✅ Main Content */}
      <div className="px-3 pb-3">
        <Row className="g-3">
          {/* ✅ Left Sidebar with Summary */}
          <Col xl={2} lg={3} md={3} sm={12}>
            <PurchaseOrderSummary
              summary={{
                totalOrderAmount: summaryStats.totalOrderAmount,
                totalOrders: summaryStats.totalOrders,
                confirmedAmount: 0,
                pendingAmount: summaryStats.totalOrderAmount,
                todaysOrders: 0,
              }}
              orders={orders}
              loading={isLoading}
              dateRange="This Month"
              mode="orders"
              documentType="order"
            />
          </Col>

          {/* ✅ Main Content Area */}
          <Col xl={10} lg={9} md={9} sm={12}>
            <Tab.Container
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
            >
              <Nav variant="tabs" className="mb-0">
                <Nav.Item>
                  <Nav.Link eventKey="orders">
                    <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                    All Orders ({orders.length})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="bidirectional">
                    <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                    From Suppliers (
                    {summaryStats.autoGeneratedOrders +
                      summaryStats.ordersWithGeneratedSO}
                    )
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              <Tab.Content>
                <Tab.Pane eventKey="orders">
                  {/* Error State */}
                  {error && (
                    <Alert variant="danger" className="mb-3">
                      <FontAwesomeIcon
                        icon={faExclamationTriangle}
                        className="me-2"
                      />
                      {error}
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="ms-2"
                        onClick={() => {
                          setError(null);
                          setRefreshTrigger((prev) => prev + 1);
                        }}
                      >
                        <FontAwesomeIcon icon={faSync} className="me-1" />
                        Retry
                      </Button>
                    </Alert>
                  )}

                  {/* ✅ Purchase Orders Table */}
                  <PurchaseOrderTable
                    purchaseOrders={orders}
                    onViewOrder={handleViewOrder}
                    onEditOrder={handleEditOrder}
                    onDeleteOrder={handleDeleteOrder}
                    onPrintOrder={handlePrintOrder}
                    onShareOrder={handleShareOrder}
                    onDownloadOrder={handleDownloadOrder}
                    onConvertOrder={handleConvertOrder}
                    onConfirmOrder={handleConfirmOrder}
                    onShipOrder={handleShipOrder}
                    onReceiveOrder={handleReceiveOrder}
                    onCompleteOrder={handleCompleteOrder}
                    onCancelOrder={handleCancelOrder}
                    onDuplicateOrder={handleDuplicateOrder}
                    isLoading={isLoading}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    filterStatus={filterStatus}
                    onFilterChange={handleFilterChange}
                    selectedOrders={selectedOrders}
                    onSelectionChange={setSelectedOrders}
                    companyId={companyId}
                    addToast={addToast}
                    currentUser={currentUser}
                    currentCompany={currentCompany}
                    enableActions={true}
                    enableBulkActions={false}
                    showHeader={false}
                    title="Purchase Orders"
                    showBidirectionalColumns={true}
                    onGenerateSalesOrder={handleGenerateSalesOrder}
                    onViewSourceOrder={handleViewSourceOrder}
                    onViewGeneratedOrders={handleViewGeneratedOrders}
                    onViewTrackingChain={handleViewTrackingChain}
                    refreshTrigger={refreshTrigger}
                  />
                </Tab.Pane>

                <Tab.Pane eventKey="bidirectional">
                  <Card>
                    <Card.Header className="bg-light">
                      <div className="d-flex align-items-center justify-content-between">
                        <h5 className="mb-0">
                          <FontAwesomeIcon
                            icon={faBuilding}
                            className="me-2 text-primary"
                          />
                          Orders From Suppliers
                        </h5>
                        <Badge bg="info" className="fs-6">
                          {summaryStats.autoGeneratedOrders +
                            summaryStats.ordersWithGeneratedSO}{" "}
                          Active
                        </Badge>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <Row className="mb-3">
                        <Col md={4}>
                          <Card className="text-center border-info">
                            <Card.Body className="py-3">
                              <FontAwesomeIcon
                                icon={faFileImport}
                                size="lg"
                                className="text-info mb-2"
                              />
                              <h5 className="text-info mb-1">
                                {summaryStats.autoGeneratedOrders}
                              </h5>
                              <small className="text-muted">
                                Auto-Generated from Sales Orders
                              </small>
                            </Card.Body>
                          </Card>
                        </Col>
                        <Col md={4}>
                          <Card className="text-center border-success">
                            <Card.Body className="py-3">
                              <FontAwesomeIcon
                                icon={faFileExport}
                                size="lg"
                                className="text-success mb-2"
                              />
                              <h5 className="text-success mb-1">
                                {summaryStats.ordersWithGeneratedSO}
                              </h5>
                              <small className="text-muted">
                                Generated Sales Orders
                              </small>
                            </Card.Body>
                          </Card>
                        </Col>
                        <Col md={4}>
                          <Card className="text-center border-primary">
                            <Card.Body className="py-3">
                              <FontAwesomeIcon
                                icon={faExchangeAlt}
                                size="lg"
                                className="text-primary mb-2"
                              />
                              <h5 className="text-primary mb-1">
                                {summaryStats.ordersFromSalesOrders}
                              </h5>
                              <small className="text-muted">
                                From Sales Orders
                              </small>
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>

                      {/* Orders From Suppliers Table */}
                      <PurchaseOrderTable
                        purchaseOrders={orders.filter(
                          (order) =>
                            order.isAutoGenerated ||
                            order.salesOrderRef ||
                            order.sourceOrderType === "sales_order" ||
                            order.autoGeneratedSalesOrder
                        )}
                        onViewOrder={handleViewOrder}
                        onEditOrder={handleEditOrder}
                        onDeleteOrder={handleDeleteOrder}
                        onPrintOrder={handlePrintOrder}
                        onShareOrder={handleShareOrder}
                        onDownloadOrder={handleDownloadOrder}
                        onConvertOrder={handleConvertOrder}
                        onConfirmOrder={handleConfirmOrder}
                        onShipOrder={handleShipOrder}
                        onReceiveOrder={handleReceiveOrder}
                        onCompleteOrder={handleCompleteOrder}
                        onCancelOrder={handleCancelOrder}
                        onDuplicateOrder={handleDuplicateOrder}
                        isLoading={isLoading}
                        companyId={companyId}
                        addToast={addToast}
                        currentUser={currentUser}
                        currentCompany={currentCompany}
                        enableActions={true}
                        showHeader={false}
                        title="Orders From Suppliers"
                        showBidirectionalColumns={true}
                        onGenerateSalesOrder={handleGenerateSalesOrder}
                        onViewSourceOrder={handleViewSourceOrder}
                        onViewGeneratedOrders={handleViewGeneratedOrders}
                        onViewTrackingChain={handleViewTrackingChain}
                      />
                    </Card.Body>
                  </Card>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </Col>
        </Row>
      </div>

      {/* ✅ Generate Sales Order Modal */}
      <Modal
        show={showGenerateModal}
        onHide={handleCloseGenerateModal}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon
              icon={faExchangeAlt}
              className="me-2 text-primary"
            />
            Generate Sales Order
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrderForGeneration && (
            <>
              <Alert variant="info" className="mb-3">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Generating sales order from Purchase Order:{" "}
                <strong>{selectedOrderForGeneration.orderNumber}</strong>
              </Alert>

              <Form>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Target Company ID</Form.Label>
                      <Form.Control
                        type="text"
                        value={generateOptions.targetCompanyId}
                        onChange={(e) =>
                          handleGenerateOptionsChange(
                            "targetCompanyId",
                            e.target.value
                          )
                        }
                        placeholder="Enter target company ID"
                      />
                      <Form.Text className="text-muted">
                        Company where the sales order will be created
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={generateOptions.notes}
                        onChange={(e) =>
                          handleGenerateOptionsChange("notes", e.target.value)
                        }
                        placeholder="Optional notes for the generated sales order"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="autoCreateSupplier"
                        label="Auto Create Supplier as Customer"
                        checked={generateOptions.autoCreateSupplier}
                        onChange={(e) =>
                          handleGenerateOptionsChange(
                            "autoCreateSupplier",
                            e.target.checked
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="skipCircularValidation"
                        label="Skip Circular Validation"
                        checked={generateOptions.skipCircularValidation}
                        onChange={(e) =>
                          handleGenerateOptionsChange(
                            "skipCircularValidation",
                            e.target.checked
                          )
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseGenerateModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={executeGenerateSalesOrder}
            disabled={!generateOptions.targetCompanyId.trim()}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
            Generate Sales Order
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default PurchaseOrder;
