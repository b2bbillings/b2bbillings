import React from "react";
import {
  Modal,
  Button,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Alert,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPrint,
  faDownload,
  faShare,
  faEdit,
  faFileInvoice,
  faUser,
  faCalendar,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faHashtag,
  faRupeeSign,
  faExchangeAlt,
  faCheck,
  faBuilding,
  faShoppingCart,
  faFileAlt,
  faTruck,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

function UniversalViewModal({
  show,
  onHide,
  transaction,
  onEdit,
  onPrint,
  onDownload,
  onShare,
  onConvert,
  onGenerateSalesOrder, // ✅ NEW: Generate Sales Order prop
  documentType = "invoice",
}) {
  if (!transaction) return null;

  const getDocumentConfig = () => {
    switch (documentType) {
      case "quotation":
        return {
          title: "Quotation Details",
          primaryColor: "#0dcaf0",
          primaryBg: "info",
          primaryDark: "#0aa2c0",
          icon: faFileAlt,
          numberField: "quotationNumber",
          partyLabel: "Customer",
          partyField: "partyName",
          canConvert:
            !transaction.convertedToInvoice &&
            transaction.status !== "converted" &&
            transaction.status !== "cancelled",
          convertLabel: "Convert to Invoice",
        };
      case "purchase-invoice":
        return {
          title: "Purchase Invoice Details",
          primaryColor: "#198754",
          primaryBg: "success",
          primaryDark: "#146c43",
          icon: faShoppingCart,
          numberField: "invoiceNo",
          partyLabel: "Supplier",
          partyField: "supplierName",
          canConvert: false,
          convertLabel: null,
        };
      case "purchase-order":
        return {
          title: "Purchase Order Details",
          primaryColor: "#fd7e14",
          primaryBg: "warning",
          primaryDark: "#dc6e0a",
          icon: faTruck,
          numberField: "purchaseOrderNumber",
          partyLabel: "Supplier",
          partyField: "supplierName",
          canConvert:
            !transaction.convertedToInvoice &&
            transaction.status !== "converted" &&
            transaction.status !== "cancelled",
          convertLabel: "Convert to Purchase Invoice",
          // ✅ NEW: Generate Sales Order capability
          canGenerateSalesOrder:
            !transaction.hasGeneratedSalesOrder &&
            !transaction.hasCorrespondingSalesOrder &&
            transaction.status !== "cancelled" &&
            transaction.status !== "deleted",
          generateSalesOrderLabel: "Generate Sales Order",
        };
      default:
        return {
          title: "Sales Invoice Details",
          primaryColor: "#0d6efd",
          primaryBg: "primary",
          primaryDark: "#0b5ed7",
          icon: faFileInvoice,
          numberField: "invoiceNo",
          partyLabel: "Customer",
          partyField: "partyName",
          canConvert: false,
          convertLabel: null,
        };
    }
  };

  const config = getDocumentConfig();

  const getPartyInfo = () => {
    const isPurchaseDoc = documentType.includes("purchase");

    // Enhanced field mapping for party information
    const partyName = isPurchaseDoc
      ? transaction.supplierName ||
        transaction.partyName ||
        transaction.customerName ||
        transaction.customer?.name ||
        transaction.supplier?.name ||
        "Walk-in Supplier"
      : transaction.partyName ||
        transaction.customerName ||
        transaction.customer?.name ||
        transaction.supplier?.name ||
        "Walk-in Customer";

    const partyPhone = isPurchaseDoc
      ? transaction.supplierMobile ||
        transaction.supplierPhone ||
        transaction.partyPhone ||
        transaction.supplier?.mobile ||
        transaction.supplier?.phone ||
        transaction.customer?.mobile ||
        transaction.customer?.phone
      : transaction.partyPhone ||
        transaction.customerPhone ||
        transaction.customer?.mobile ||
        transaction.customer?.phone ||
        transaction.supplier?.mobile;

    const partyEmail = isPurchaseDoc
      ? transaction.supplierEmail ||
        transaction.partyEmail ||
        transaction.supplier?.email ||
        transaction.customer?.email
      : transaction.partyEmail ||
        transaction.customerEmail ||
        transaction.customer?.email ||
        transaction.supplier?.email;

    const partyAddress = isPurchaseDoc
      ? transaction.supplierAddress ||
        transaction.partyAddress ||
        transaction.supplier?.address ||
        transaction.customer?.address
      : transaction.partyAddress ||
        transaction.customerAddress ||
        transaction.customer?.address ||
        transaction.supplier?.address;

    const partyGstNumber = isPurchaseDoc
      ? transaction.supplierGstNumber ||
        transaction.partyGstNumber ||
        transaction.supplier?.gstNumber ||
        transaction.customer?.gstNumber
      : transaction.partyGstNumber ||
        transaction.customerGstNumber ||
        transaction.customer?.gstNumber ||
        transaction.supplier?.gstNumber;

    return {
      name: partyName,
      phone: partyPhone,
      email: partyEmail,
      address: partyAddress,
      gstNumber: partyGstNumber,
    };
  };

  const partyInfo = getPartyInfo();

  const calculateTotals = () => {
    const items = transaction.items || [];
    let subtotal = 0;

    if (items.length > 0) {
      subtotal = items.reduce((sum, item) => {
        const amount = parseFloat(
          item.amount ||
            item.totalAmount ||
            item.itemAmount ||
            item.quantity *
              (item.price ||
                item.rate ||
                item.sellPrice ||
                item.purchasePrice) ||
            0
        );
        return sum + amount;
      }, 0);
    } else {
      subtotal = parseFloat(
        transaction.amount ||
          transaction.totalAmount ||
          transaction.grandTotal ||
          0
      );
    }

    const cgst = parseFloat(
      transaction.cgst || transaction.totals?.totalCgstAmount || 0
    );
    const sgst = parseFloat(
      transaction.sgst || transaction.totals?.totalSgstAmount || 0
    );
    const igst = parseFloat(
      transaction.igst || transaction.totals?.totalIgstAmount || 0
    );
    const totalTax = cgst + sgst + igst;

    const isPurchaseDoc = documentType.includes("purchase");
    let grandTotal;

    if (isPurchaseDoc && transaction.taxMode === "with-tax") {
      grandTotal = subtotal;
      subtotal = grandTotal - totalTax;
    } else {
      grandTotal = subtotal + totalTax;
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      cgst: cgst,
      sgst: sgst,
      igst: igst,
      totalTax: totalTax,
      grandTotal: Math.round(grandTotal * 100) / 100,
      balance: parseFloat(
        transaction.balance || transaction.balanceAmount || 0
      ),
      totalItems: items.length,
      totalQuantity: items.reduce(
        (sum, item) => sum + (parseFloat(item.quantity) || 0),
        0
      ),
    };
  };

  const totals = calculateTotals();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Enhanced document number extraction
  const getDocumentNumber = () => {
    const isPurchaseDoc = documentType.includes("purchase");

    if (isPurchaseDoc) {
      return (
        transaction.purchaseOrderNumber ||
        transaction.invoiceNo ||
        transaction.invoiceNumber ||
        transaction.orderNumber ||
        transaction.documentNumber ||
        transaction.number ||
        transaction._id?.slice(-8) ||
        "N/A"
      );
    } else {
      return (
        transaction[config.numberField] ||
        transaction.quotationNumber ||
        transaction.invoiceNo ||
        transaction.invoiceNumber ||
        transaction.orderNumber ||
        transaction.documentNumber ||
        transaction.number ||
        transaction._id?.slice(-8) ||
        "N/A"
      );
    }
  };

  // Enhanced payment/order type extraction
  const getPaymentOrOrderType = () => {
    const isPurchaseDoc = documentType.includes("purchase");

    if (isPurchaseDoc) {
      return (
        transaction.orderType ||
        transaction.purchaseType ||
        transaction.paymentType ||
        transaction.payment?.method ||
        "Purchase Order"
      );
    } else {
      return (
        transaction.paymentType ||
        transaction.payment?.method ||
        transaction.orderType ||
        "Cash"
      );
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
      <Modal.Header
        className={`bg-${config.primaryBg} text-white border-0`}
        style={{padding: "20px 30px"}}
      >
        <div className="d-flex align-items-center w-100">
          <FontAwesomeIcon icon={config.icon} className="me-3" size="lg" />
          <div className="flex-grow-1">
            <Modal.Title className="mb-1">{config.title}</Modal.Title>
            <div className="d-flex align-items-center gap-3">
              <small className="opacity-75">#{getDocumentNumber()}</small>
              <Badge bg="light" text="dark" className="px-2 py-1">
                {formatDate(
                  transaction.date ||
                    transaction.purchaseDate ||
                    transaction.orderDate ||
                    transaction.invoiceDate
                )}
              </Badge>
              {transaction.convertedToInvoice && (
                <Badge bg="success" className="px-2 py-1">
                  <FontAwesomeIcon icon={faCheck} className="me-1" />
                  Converted
                </Badge>
              )}
              {transaction.status && (
                <Badge
                  bg={
                    transaction.status === "draft"
                      ? "secondary"
                      : transaction.status === "pending"
                      ? "warning"
                      : transaction.status === "completed"
                      ? "success"
                      : "info"
                  }
                  className="px-2 py-1 text-capitalize"
                >
                  {transaction.status}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline-light"
            onClick={onHide}
            className="rounded-circle p-2"
            style={{width: "40px", height: "40px"}}
          >
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        </div>
      </Modal.Header>

      <Modal.Body
        style={{padding: "30px", maxHeight: "70vh", overflowY: "auto"}}
      >
        <div className="d-flex gap-2 mb-4 flex-wrap">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => onEdit && onEdit(transaction)}
          >
            <FontAwesomeIcon icon={faEdit} className="me-1" />
            Edit
          </Button>
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => onPrint && onPrint(transaction)}
          >
            <FontAwesomeIcon icon={faPrint} className="me-1" />
            Print
          </Button>
          <Button
            variant="outline-info"
            size="sm"
            onClick={() => onDownload && onDownload(transaction)}
          >
            <FontAwesomeIcon icon={faDownload} className="me-1" />
            Download
          </Button>
          <Button
            variant="outline-warning"
            size="sm"
            onClick={() => onShare && onShare(transaction)}
          >
            <FontAwesomeIcon icon={faShare} className="me-1" />
            Share
          </Button>

          {/* ✅ NEW: Generate Sales Order Button for Purchase Orders */}
          {config.canGenerateSalesOrder && onGenerateSalesOrder && (
            <Button
              variant="info"
              size="sm"
              onClick={() => onGenerateSalesOrder(transaction)}
            >
              <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
              {config.generateSalesOrderLabel}
            </Button>
          )}

          {config.canConvert && (
            <Button
              variant="success"
              size="sm"
              onClick={() => onConvert && onConvert(transaction)}
            >
              <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
              {config.convertLabel}
            </Button>
          )}
        </div>

        {/* ✅ NEW: Sales Order Status Section for Purchase Orders */}
        {documentType === "purchase-order" && (
          <Row className="mb-4">
            <Col>
              <Card className="border-2 border-info">
                <Card.Header
                  className="text-white fw-bold"
                  style={{
                    backgroundColor: "#0dcaf0",
                    borderBottom: "3px solid #0aa2c0",
                    padding: "10px 15px",
                  }}
                >
                  <h6
                    className="mb-0 text-white fw-bold"
                    style={{fontSize: "0.95rem"}}
                  >
                    <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                    Sales Order Status
                  </h6>
                </Card.Header>
                <Card.Body style={{padding: "15px"}}>
                  <Row className="g-3">
                    <Col sm={6}>
                      <div>
                        <small className="text-muted fw-medium">
                          Generated Sales Order
                        </small>
                        <div>
                          {transaction.hasGeneratedSalesOrder ? (
                            <Badge
                              bg="success"
                              className="d-flex align-items-center"
                              style={{width: "fit-content"}}
                            >
                              <FontAwesomeIcon
                                icon={faCheck}
                                className="me-1"
                              />
                              Generated
                            </Badge>
                          ) : (
                            <Badge
                              bg="secondary"
                              className="d-flex align-items-center"
                              style={{width: "fit-content"}}
                            >
                              Not Generated
                            </Badge>
                          )}
                        </div>
                        {transaction.salesOrderNumber && (
                          <small className="text-muted d-block mt-1">
                            SO#: {transaction.salesOrderNumber}
                          </small>
                        )}
                      </div>
                    </Col>
                    <Col sm={6}>
                      <div>
                        <small className="text-muted fw-medium">
                          Corresponding Sales Order
                        </small>
                        <div>
                          {transaction.hasCorrespondingSalesOrder ? (
                            <Badge
                              bg="primary"
                              className="d-flex align-items-center"
                              style={{width: "fit-content"}}
                            >
                              <FontAwesomeIcon
                                icon={faExchangeAlt}
                                className="me-1"
                              />
                              Linked
                            </Badge>
                          ) : (
                            <Badge
                              bg="secondary"
                              className="d-flex align-items-center"
                              style={{width: "fit-content"}}
                            >
                              Not Linked
                            </Badge>
                          )}
                        </div>
                        {transaction.correspondingSalesOrderId && (
                          <small className="text-muted d-block mt-1">
                            ID: {transaction.correspondingSalesOrderId}
                          </small>
                        )}
                      </div>
                    </Col>

                    {/* ✅ Generate Button in Card */}
                    {config.canGenerateSalesOrder && onGenerateSalesOrder && (
                      <Col xs={12}>
                        <div className="text-center pt-2 border-top">
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => onGenerateSalesOrder(transaction)}
                            className="px-4"
                          >
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            Generate Sales Order
                          </Button>
                          <small className="text-muted d-block mt-2">
                            Create a corresponding sales order for this purchase
                            order
                          </small>
                        </div>
                      </Col>
                    )}
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        <Row className="g-4">
          <Col lg={6}>
            {/* Customer/Supplier Information Card */}
            <Card
              className="border-2 mb-4"
              style={{borderColor: config.primaryColor}}
            >
              <Card.Header
                className="text-white fw-bold"
                style={{
                  backgroundColor: config.primaryDark,
                  borderBottom: `3px solid ${config.primaryColor}`,
                  padding: "15px 20px",
                }}
              >
                <h6
                  className="mb-0 text-white fw-bold"
                  style={{fontSize: "1.1rem"}}
                >
                  <FontAwesomeIcon
                    icon={
                      documentType.includes("purchase") ? faBuilding : faUser
                    }
                    className="me-2"
                    style={{color: "white"}}
                  />
                  {config.partyLabel} Information
                </h6>
              </Card.Header>
              <Card.Body style={{padding: "20px"}}>
                <div className="mb-3">
                  <strong
                    className="d-block text-dark"
                    style={{fontSize: "1.2rem"}}
                  >
                    {partyInfo.name}
                  </strong>
                </div>

                {partyInfo.phone && (
                  <div className="mb-2 d-flex align-items-center">
                    <FontAwesomeIcon
                      icon={faPhone}
                      className="me-2"
                      style={{color: config.primaryDark, fontSize: "1rem"}}
                    />
                    <span style={{fontSize: "0.95rem"}}>{partyInfo.phone}</span>
                  </div>
                )}

                {partyInfo.email && (
                  <div className="mb-2 d-flex align-items-center">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="me-2"
                      style={{color: config.primaryDark, fontSize: "1rem"}}
                    />
                    <span style={{fontSize: "0.95rem"}}>{partyInfo.email}</span>
                  </div>
                )}

                {partyInfo.address && (
                  <div className="mb-2 d-flex align-items-start">
                    <FontAwesomeIcon
                      icon={faMapMarkerAlt}
                      className="me-2 mt-1"
                      style={{color: config.primaryDark, fontSize: "1rem"}}
                    />
                    <span style={{fontSize: "0.95rem"}}>
                      {partyInfo.address}
                    </span>
                  </div>
                )}

                {partyInfo.gstNumber && (
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon
                      icon={faHashtag}
                      className="me-2"
                      style={{color: config.primaryDark, fontSize: "1rem"}}
                    />
                    <span style={{fontSize: "0.95rem"}}>
                      GST: {partyInfo.gstNumber}
                    </span>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Document Details Card */}
            <Card
              className="border-2"
              style={{borderColor: config.primaryColor}}
            >
              <Card.Header
                className="text-white fw-bold"
                style={{
                  backgroundColor: config.primaryDark,
                  borderBottom: `3px solid ${config.primaryColor}`,
                  padding: "15px 20px",
                }}
              >
                <h6
                  className="mb-0 text-white fw-bold"
                  style={{fontSize: "1.1rem"}}
                >
                  <FontAwesomeIcon
                    icon={config.icon}
                    className="me-2"
                    style={{color: "white"}}
                  />
                  Document Details
                </h6>
              </Card.Header>
              <Card.Body style={{padding: "20px"}}>
                <Row className="g-3">
                  <Col sm={6}>
                    <div>
                      <small className="text-muted fw-medium">
                        Document Number
                      </small>
                      <div
                        className="fw-bold"
                        style={{fontSize: "1rem", color: "#212529"}}
                      >
                        {getDocumentNumber()}
                      </div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div>
                      <small className="text-muted fw-medium">Date</small>
                      <div
                        className="fw-bold"
                        style={{fontSize: "1rem", color: "#212529"}}
                      >
                        <FontAwesomeIcon
                          icon={faCalendar}
                          className="me-1"
                          style={{color: config.primaryDark}}
                        />
                        {formatDate(
                          transaction.date ||
                            transaction.purchaseDate ||
                            transaction.orderDate ||
                            transaction.invoiceDate
                        )}
                      </div>
                    </div>
                  </Col>

                  <Col sm={6}>
                    <div>
                      <small className="text-muted fw-medium">
                        Document Type
                      </small>
                      <div>
                        <Badge
                          bg={config.primaryBg}
                          className="text-capitalize"
                          style={{fontSize: "0.8rem"}}
                        >
                          {transaction.transaction ||
                            transaction.orderType ||
                            transaction.documentType ||
                            config.title.split(" ")[0]}
                        </Badge>
                      </div>
                    </div>
                  </Col>

                  <Col sm={6}>
                    <div>
                      <small className="text-muted fw-medium">
                        {documentType.includes("purchase")
                          ? "Order Type"
                          : "Payment Mode"}
                      </small>
                      <div>
                        <Badge
                          bg={
                            getPaymentOrOrderType() === "cash"
                              ? "success"
                              : getPaymentOrOrderType() === "credit"
                              ? "warning"
                              : "info"
                          }
                          className="text-capitalize"
                          style={{fontSize: "0.8rem"}}
                        >
                          {getPaymentOrOrderType()}
                        </Badge>
                      </div>
                    </div>
                  </Col>

                  {(transaction.dueDate ||
                    transaction.deliveryDate ||
                    transaction.expectedDeliveryDate) && (
                    <Col sm={6}>
                      <div>
                        <small className="text-muted fw-medium">
                          {documentType.includes("purchase")
                            ? "Delivery Date"
                            : "Due Date"}
                        </small>
                        <div
                          className="fw-bold"
                          style={{fontSize: "1rem", color: "#212529"}}
                        >
                          {formatDate(
                            transaction.dueDate ||
                              transaction.deliveryDate ||
                              transaction.expectedDeliveryDate
                          )}
                        </div>
                      </div>
                    </Col>
                  )}

                  {(transaction.employeeName || transaction.createdBy) && (
                    <Col sm={6}>
                      <div>
                        <small className="text-muted fw-medium">
                          Created By
                        </small>
                        <div
                          className="fw-bold"
                          style={{fontSize: "1rem", color: "#212529"}}
                        >
                          {transaction.employeeName || transaction.createdBy}
                        </div>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6}>
            {/* Items Table Card */}
            <Card
              className="border-2 mb-4"
              style={{borderColor: config.primaryColor}}
            >
              <Card.Header
                className="text-white fw-bold"
                style={{
                  backgroundColor: config.primaryDark,
                  borderBottom: `3px solid ${config.primaryColor}`,
                  padding: "15px 20px",
                }}
              >
                <h6
                  className="mb-0 text-white fw-bold"
                  style={{fontSize: "1.1rem"}}
                >
                  Items ({totals.totalItems}) - Total Qty:{" "}
                  {totals.totalQuantity}
                </h6>
              </Card.Header>
              <Card.Body className="p-0">
                <div style={{maxHeight: "300px", overflowY: "auto"}}>
                  <Table className="mb-0 table-sm">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th
                          className="border-0"
                          style={{fontWeight: "600", color: "#495057"}}
                        >
                          <small>Item</small>
                        </th>
                        <th
                          className="border-0 text-center"
                          style={{fontWeight: "600", color: "#495057"}}
                        >
                          <small>Qty</small>
                        </th>
                        <th
                          className="border-0 text-end"
                          style={{fontWeight: "600", color: "#495057"}}
                        >
                          <small>
                            {documentType.includes("purchase")
                              ? "Purchase Rate"
                              : "Rate"}
                          </small>
                        </th>
                        <th
                          className="border-0 text-end"
                          style={{fontWeight: "600", color: "#495057"}}
                        >
                          <small>Amount</small>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(transaction.items || []).map((item, index) => (
                        <tr key={index}>
                          <td className="border-0">
                            <div>
                              <small
                                className="fw-medium text-dark"
                                style={{fontSize: "0.9rem"}}
                              >
                                {item.productName ||
                                  item.itemName ||
                                  item.name ||
                                  `Item ${index + 1}`}
                              </small>
                              {item.description && (
                                <small className="text-muted d-block">
                                  {item.description}
                                </small>
                              )}
                              {item.hsnNumber && (
                                <small
                                  className="d-block"
                                  style={{color: config.primaryDark}}
                                >
                                  HSN: {item.hsnNumber}
                                </small>
                              )}
                              {(item.productCode || item.itemCode) && (
                                <small className="text-secondary d-block">
                                  Code: {item.productCode || item.itemCode}
                                </small>
                              )}
                            </div>
                          </td>
                          <td className="border-0 text-center">
                            <small
                              className="fw-medium"
                              style={{fontSize: "0.9rem"}}
                            >
                              {item.quantity || 0} {item.unit || "pcs"}
                            </small>
                          </td>
                          <td className="border-0 text-end">
                            <small
                              className="fw-medium"
                              style={{fontSize: "0.9rem"}}
                            >
                              {formatCurrency(
                                item.price ||
                                  item.rate ||
                                  item.sellPrice ||
                                  item.purchasePrice ||
                                  0
                              )}
                            </small>
                          </td>
                          <td className="border-0 text-end">
                            <small
                              className="fw-bold text-success"
                              style={{fontSize: "0.9rem"}}
                            >
                              {formatCurrency(
                                item.amount ||
                                  item.totalAmount ||
                                  item.itemAmount ||
                                  (item.quantity || 0) *
                                    (item.price ||
                                      item.rate ||
                                      item.sellPrice ||
                                      item.purchasePrice ||
                                      0)
                              )}
                            </small>
                          </td>
                        </tr>
                      ))}
                      {(!transaction.items ||
                        transaction.items.length === 0) && (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center text-muted py-3 border-0"
                          >
                            <small>No items found</small>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>

            {/* Amount Summary Card */}
            <Card className="border-2 border-success">
              <Card.Header
                className="text-white fw-bold"
                style={{
                  backgroundColor: "#146c43",
                  borderBottom: "3px solid #198754",
                  padding: "15px 20px",
                }}
              >
                <h6
                  className="mb-0 text-white fw-bold"
                  style={{fontSize: "1.1rem"}}
                >
                  <FontAwesomeIcon
                    icon={faRupeeSign}
                    className="me-2"
                    style={{color: "white"}}
                  />
                  Amount Summary
                </h6>
              </Card.Header>
              <Card.Body style={{padding: "20px"}}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span style={{fontSize: "1rem", fontWeight: "500"}}>
                    Subtotal:
                  </span>
                  <span className="fw-bold" style={{fontSize: "1rem"}}>
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>

                {totals.cgst > 0 && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span style={{fontSize: "1rem", fontWeight: "500"}}>
                      CGST:
                      {transaction.cgstPercent && (
                        <small className="text-muted ms-1">
                          ({transaction.cgstPercent}%)
                        </small>
                      )}
                    </span>
                    <span
                      className="fw-bold text-info"
                      style={{fontSize: "1rem"}}
                    >
                      {formatCurrency(totals.cgst)}
                    </span>
                  </div>
                )}

                {totals.sgst > 0 && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span style={{fontSize: "1rem", fontWeight: "500"}}>
                      SGST:
                      {transaction.sgstPercent && (
                        <small className="text-muted ms-1">
                          ({transaction.sgstPercent}%)
                        </small>
                      )}
                    </span>
                    <span
                      className="fw-bold text-warning"
                      style={{fontSize: "1rem"}}
                    >
                      {formatCurrency(totals.sgst)}
                    </span>
                  </div>
                )}

                {totals.igst > 0 && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span style={{fontSize: "1rem", fontWeight: "500"}}>
                      IGST:
                      {transaction.igstPercent && (
                        <small className="text-muted ms-1">
                          ({transaction.igstPercent}%)
                        </small>
                      )}
                    </span>
                    <span
                      className="fw-bold text-danger"
                      style={{fontSize: "1rem"}}
                    >
                      {formatCurrency(totals.igst)}
                    </span>
                  </div>
                )}

                {totals.totalTax > 0 && (
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span style={{fontSize: "1rem", fontWeight: "500"}}>
                      Total Tax:
                    </span>
                    <span
                      className="fw-bold text-secondary"
                      style={{fontSize: "1rem"}}
                    >
                      {formatCurrency(totals.totalTax)}
                    </span>
                  </div>
                )}

                <hr />
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="h6 mb-0" style={{fontWeight: "600"}}>
                    Grand Total:
                  </span>
                  <span className="h5 mb-0 fw-bold text-success">
                    {formatCurrency(totals.grandTotal)}
                  </span>
                </div>

                {totals.balance !== 0 && (
                  <>
                    <hr />
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-medium" style={{fontSize: "1rem"}}>
                        {documentType.includes("purchase")
                          ? "Payment Due:"
                          : "Balance Due:"}
                      </span>
                      <span
                        className={`h6 mb-0 fw-bold ${
                          totals.balance > 0 ? "text-danger" : "text-success"
                        }`}
                      >
                        {formatCurrency(Math.abs(totals.balance))}
                        <small className="ms-1">
                          ({totals.balance > 0 ? "Due" : "Advance"})
                        </small>
                      </span>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {(transaction.notes || transaction.description) && (
          <Row className="mt-4">
            <Col>
              <Card className="border-2 border-secondary">
                <Card.Header
                  className="text-white fw-bold"
                  style={{
                    backgroundColor: "#495057",
                    borderBottom: "3px solid #6c757d",
                    padding: "15px 20px",
                  }}
                >
                  <h6
                    className="mb-0 text-white fw-bold"
                    style={{fontSize: "1.1rem"}}
                  >
                    Notes
                  </h6>
                </Card.Header>
                <Card.Body style={{padding: "20px"}}>
                  <p className="mb-0" style={{fontSize: "1rem"}}>
                    {transaction.notes || transaction.description}
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {transaction.convertedToInvoice && transaction.invoiceNumber && (
          <Row className="mt-4">
            <Col>
              <Alert variant="success" className="mb-0">
                <FontAwesomeIcon icon={faCheck} className="me-2" />
                <strong>Conversion Status:</strong> This {documentType} has been
                converted
                {transaction.invoiceNumber && (
                  <span> to Invoice #{transaction.invoiceNumber}</span>
                )}
                {transaction.conversionDate && (
                  <small className="d-block mt-1">
                    Converted on: {formatDate(transaction.conversionDate)}
                  </small>
                )}
              </Alert>
            </Col>
          </Row>
        )}
      </Modal.Body>

      <Modal.Footer
        className="border-0 bg-light"
        style={{padding: "20px 30px"}}
      >
        <div className="d-flex w-100 justify-content-between align-items-center">
          <div className="text-muted">
            <small>
              Created:{" "}
              {formatDate(
                transaction.createdDate ||
                  transaction.date ||
                  transaction.purchaseDate ||
                  transaction.createdAt
              )}
              {(transaction.employeeName || transaction.createdBy) && (
                <span className="ms-2">
                  by {transaction.employeeName || transaction.createdBy}
                </span>
              )}
            </small>
          </div>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onHide}>
              Close
            </Button>

            {/* ✅ Generate Sales Order in Footer for Purchase Orders */}
            {config.canGenerateSalesOrder && onGenerateSalesOrder && (
              <Button
                variant="info"
                onClick={() => {
                  onGenerateSalesOrder && onGenerateSalesOrder(transaction);
                  onHide();
                }}
              >
                <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
                {config.generateSalesOrderLabel}
              </Button>
            )}

            {config.canConvert && (
              <Button
                variant="success"
                onClick={() => {
                  onConvert && onConvert(transaction);
                  onHide();
                }}
              >
                <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
                {config.convertLabel}
              </Button>
            )}
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default UniversalViewModal;
