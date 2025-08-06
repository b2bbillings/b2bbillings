import React, {useState, useCallback, useMemo, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
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
  faExclamationTriangle,
  faSync,
  faExchangeAlt,
  faCheckCircle,
  faInfoCircle,
  faFileImport,
} from "@fortawesome/free-solid-svg-icons";

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

  // State Management
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

  // Filter states
  const [dateRange, setDateRange] = useState("This Month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  // Modal states for bidirectional operations
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedOrderForGeneration, setSelectedOrderForGeneration] =
    useState(null);
  const [generateOptions, setGenerateOptions] = useState({
    targetCompanyId: "",
    notes: "",
    skipCircularValidation: false,
    autoCreateSupplier: true,
  });

  // Get effective company ID
  const companyId = propCompanyId || currentCompany?.id || currentCompany?._id;

  // Load purchase orders with comprehensive error handling
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
      } else {
        throw new Error(response?.message || "Failed to load purchase orders");
      }
    } catch (error) {
      setError(error.message || "Failed to load purchase orders");
      setOrders([]);
      addToast?.("Failed to load purchase orders", "error");
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

  // Load orders on component mount and when dependencies change
  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders, refreshTrigger]);

  // Calculate summary stats from orders
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

  // Event Handlers
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
  }, []);

  // Navigation handlers
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

  // Purchase Order Action Handlers
  const handleViewOrder = useCallback((order) => {
    // Implementation for viewing order details
  }, []);

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
    async (order) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete order ${
          order.orderNumber || order.id
        }?`
      );
      if (confirmed) {
        try {
          await purchaseOrderService.deletePurchaseOrder(order._id);
          setOrders((prev) => prev.filter((o) => o._id !== order._id));
          addToast?.("Order deleted successfully", "success");
        } catch (error) {
          addToast?.("Failed to delete order", "error");
        }
      }
    },
    [addToast]
  );

  const handlePrintOrder = useCallback((order) => {
    // Implementation for printing order
    window.print();
  }, []);

  const handleShareOrder = useCallback((order) => {
    // Implementation for sharing order
    if (navigator.share) {
      navigator.share({
        title: `Purchase Order ${order.orderNumber}`,
        text: `Purchase Order details for ${order.orderNumber}`,
        url: window.location.href,
      });
    }
  }, []);

  const handleDownloadOrder = useCallback((order) => {
    // Implementation for downloading order
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(order, null, 2)], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = `purchase-order-${order.orderNumber}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, []);

  const handleConvertOrder = useCallback(
    async (order) => {
      try {
        // Implementation for converting order to invoice
        addToast?.("Order conversion feature coming soon", "info");
      } catch (error) {
        addToast?.("Failed to convert order", "error");
      }
    },
    [addToast]
  );

  const handleConfirmOrder = useCallback(
    async (order) => {
      try {
        await purchaseOrderService.updateOrderStatus(order._id, "confirmed");
        setOrders((prev) =>
          prev.map((o) =>
            o._id === order._id ? {...o, status: "confirmed"} : o
          )
        );
        addToast?.("Order confirmed successfully", "success");
      } catch (error) {
        addToast?.("Failed to confirm order", "error");
      }
    },
    [addToast]
  );

  const handleShipOrder = useCallback(
    async (order) => {
      try {
        await purchaseOrderService.updateOrderStatus(order._id, "shipped");
        setOrders((prev) =>
          prev.map((o) => (o._id === order._id ? {...o, status: "shipped"} : o))
        );
        addToast?.("Order marked as shipped", "success");
      } catch (error) {
        addToast?.("Failed to update order status", "error");
      }
    },
    [addToast]
  );

  const handleReceiveOrder = useCallback(
    async (order) => {
      try {
        await purchaseOrderService.updateOrderStatus(order._id, "received");
        setOrders((prev) =>
          prev.map((o) =>
            o._id === order._id ? {...o, status: "received"} : o
          )
        );
        addToast?.("Order marked as received", "success");
      } catch (error) {
        addToast?.("Failed to update order status", "error");
      }
    },
    [addToast]
  );

  const handleCompleteOrder = useCallback(
    async (order) => {
      try {
        await purchaseOrderService.updateOrderStatus(order._id, "completed");
        setOrders((prev) =>
          prev.map((o) =>
            o._id === order._id ? {...o, status: "completed"} : o
          )
        );
        addToast?.("Order completed successfully", "success");
      } catch (error) {
        addToast?.("Failed to complete order", "error");
      }
    },
    [addToast]
  );

  const handleCancelOrder = useCallback(
    async (order) => {
      const confirmed = window.confirm(
        `Are you sure you want to cancel order ${order.orderNumber}?`
      );
      if (confirmed) {
        try {
          await purchaseOrderService.updateOrderStatus(order._id, "cancelled");
          setOrders((prev) =>
            prev.map((o) =>
              o._id === order._id ? {...o, status: "cancelled"} : o
            )
          );
          addToast?.("Order cancelled successfully", "success");
        } catch (error) {
          addToast?.("Failed to cancel order", "error");
        }
      }
    },
    [addToast]
  );

  const handleDuplicateOrder = useCallback(
    async (order) => {
      try {
        const duplicatedOrder = await purchaseOrderService.duplicateOrder(
          order._id
        );
        if (duplicatedOrder?.success) {
          setOrders((prev) => [duplicatedOrder.data, ...prev]);
          addToast?.("Order duplicated successfully", "success");
        }
      } catch (error) {
        addToast?.("Failed to duplicate order", "error");
      }
    },
    [addToast]
  );

  // Bidirectional action handlers
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
          // Implementation for viewing tracking chain
        } else {
          throw new Error(response?.message || "Failed to load tracking chain");
        }
      } catch (error) {
        addToast?.(`Failed to load tracking chain: ${error.message}`, "error");
      }
    },
    [addToast]
  );

  // Modal handlers
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
    <div className="purchase-order-container">
      {/* Purchase Order Header */}
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

      {/* Page Title Component */}
      <PurchaseOrderPageTitle
        onAddPurchase={handleAddPurchaseOrder}
        billCount={orders.length}
        companyId={companyId}
        mode="orders"
        documentType="order"
        title="Purchase Orders"
        subtitle="Create and manage purchase orders"
      />

      {/* Filter Component */}
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

      {/* Main Content */}
      <div className="px-3 pb-3">
        <Row className="g-3">
          {/* Left Sidebar with Summary */}
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

          {/* Main Content Area */}
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

                  {/* Purchase Orders Table */}
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

      {/* Generate Sales Order Modal */}
      <Modal
        show={showGenerateModal}
        onHide={handleCloseGenerateModal}
        size="lg"
        backdrop="static"
        centered
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

      {/* Production-ready styles */}
      <style>{`
        .purchase-order-container {
          width: 100%;
          min-height: 100vh;
          background-color: #f8f9fa;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

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

        .nav-tabs .nav-link {
          border-radius: 0.375rem 0.375rem 0 0 !important;
        }

        .card {
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important;
          border: 1px solid rgba(0, 0, 0, 0.125) !important;
          transition: all 0.15s ease-in-out;
        }

        .card:hover {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }

        .btn {
          transition: all 0.15s ease-in-out;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .alert {
          border: none !important;
          font-weight: 500;
        }

        .badge {
          font-weight: 600;
          letter-spacing: 0.025em;
        }

        .modal-content {
          box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important;
        }

        .nav-tabs {
          border-bottom: 2px solid #dee2e6;
        }

        .nav-tabs .nav-link {
          border: 1px solid transparent;
          font-weight: 500;
          color: #6c757d;
          transition: all 0.15s ease-in-out;
        }

        .nav-tabs .nav-link:hover {
          border-color: #e9ecef #e9ecef #dee2e6;
          color: #495057;
        }

        .nav-tabs .nav-link.active {
          color: #495057;
          background-color: #fff;
          border-color: #dee2e6 #dee2e6 #fff;
          font-weight: 600;
        }

        .form-control:focus,
        .form-select:focus {
          border-color: #86b7fe;
          outline: 0;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
        }

        .text-muted {
          color: #6c757d !important;
        }

        @media (max-width: 768px) {
          .px-3 {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }

          .pb-3 {
            padding-bottom: 1rem !important;
          }

          .g-3 {
            gap: 1rem !important;
          }

          .card-body {
            padding: 1rem !important;
          }

          .modal-dialog {
            margin: 0.5rem !important;
          }
        }

        @media (max-width: 576px) {
          .purchase-order-container {
            padding: 0.5rem;
          }

          .nav-tabs .nav-link {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }

          .card-body {
            padding: 0.75rem !important;
          }

          .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.775rem;
          }
        }
      `}</style>
    </div>
  );
}

export default PurchaseOrder;
