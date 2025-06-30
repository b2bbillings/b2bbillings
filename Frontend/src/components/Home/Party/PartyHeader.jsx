import React from "react";
import {
  Container,
  Row,
  Col,
  InputGroup,
  Form,
  Button,
  Dropdown,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faEllipsisH,
  faCog,
  faRefresh,
  faChevronDown,
  faDownload,
  faUsers,
  faFileInvoice,
  faShoppingCart,
} from "@fortawesome/free-solid-svg-icons";
import {useNavigate} from "react-router-dom";

function PartyHeader({
  activeType,
  onTypeChange,
  transactionSearchQuery,
  onTransactionSearchChange,
  totalParties,
  onAddParty,
  onAddSale,
  onAddPurchase,
  onRefreshParties,
  isLoadingParties,
  onMoreOptions,
  onSettings,
  onExportParties,
  companyId,
}) {
  const navigate = useNavigate();

  const getPartyTypeText = () => {
    switch (activeType) {
      case "customer":
        return "Customers";
      case "vendor":
        return "Vendors";
      case "supplier":
        return "Suppliers";
      case "both":
        return "Both";
      default:
        return "All Parties";
    }
  };

  // ✅ Handle Sales Invoice Navigation
  const handleAddSalesInvoice = () => {
    if (companyId) {
      navigate(`/companies/${companyId}/sales/add`);
    } else {
      if (onAddSale && typeof onAddSale === "function") {
        onAddSale();
      } else {
        console.warn("No sales handler available and no companyId provided");
      }
    }
  };

  // ✅ Handle Purchase Invoice Navigation
  const handleAddPurchaseInvoice = () => {
    if (companyId) {
      navigate(`/companies/${companyId}/purchases/add`);
    } else {
      if (onAddPurchase && typeof onAddPurchase === "function") {
        onAddPurchase();
      } else {
        console.warn("No purchase handler available and no companyId provided");
      }
    }
  };

  return (
    <div
      style={{
        marginTop: "1.5rem",
        background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
      }}
    >
      {/* ✅ Search and Action Buttons Section */}
      <div
        className="bg-white border-bottom py-3"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
          borderColor: "#dee2e6",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <Container fluid>
          <Row className="align-items-center">
            <Col lg={6} md={12} className="mb-2 mb-lg-0">
              <InputGroup size="sm" style={{maxWidth: "400px"}}>
                <InputGroup.Text
                  className="border-0"
                  style={{
                    backgroundColor: "#f8f9fa",
                    color: "#6c757d",
                    borderColor: "#dee2e6",
                  }}
                >
                  <FontAwesomeIcon icon={faSearch} size="sm" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search parties, customers, vendors..."
                  value={transactionSearchQuery}
                  onChange={(e) => onTransactionSearchChange(e.target.value)}
                  className="border-0"
                  style={{
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                    borderColor: "#dee2e6",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                />
              </InputGroup>
            </Col>
            <Col lg={6} md={12}>
              <div className="d-flex gap-2 justify-content-lg-end justify-content-center flex-wrap">
                {/* ✅ Sales Invoice Button - Purple */}
                <Button
                  size="sm"
                  onClick={handleAddSalesInvoice}
                  className="px-3 border-0"
                  style={{
                    fontSize: "12px",
                    background:
                      "linear-gradient(135deg, #6f42c1 0%, #5a359a 100%)",
                    color: "white",
                    borderRadius: "6px",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #5a359a 0%, #4a2c7d 100%)";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 4px 8px rgba(111, 66, 193, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #6f42c1 0%, #5a359a 100%)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <FontAwesomeIcon
                    icon={faFileInvoice}
                    className="me-1"
                    size="sm"
                  />
                  Sales Invoice
                </Button>

                {/* ✅ Purchase Invoice Button - Green */}
                <Button
                  size="sm"
                  onClick={handleAddPurchaseInvoice}
                  className="px-3 border-0"
                  style={{
                    fontSize: "12px",
                    background:
                      "linear-gradient(135deg, #28a745 0%, #20a540 100%)",
                    color: "white",
                    borderRadius: "6px",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #20a540 0%, #1e7e34 100%)";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 4px 8px rgba(40, 167, 69, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #28a745 0%, #20a540 100%)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <FontAwesomeIcon
                    icon={faShoppingCart}
                    className="me-1"
                    size="sm"
                  />
                  Purchase Invoice
                </Button>

                {/* ✅ Refresh Button */}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={onRefreshParties}
                  disabled={isLoadingParties}
                  title="Refresh"
                  className="border-0"
                  style={{
                    color: "#6c757d",
                    borderColor: "#6c757d",
                    backgroundColor: "#ffffff",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoadingParties) {
                      e.target.style.backgroundColor = "#6c757d";
                      e.target.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoadingParties) {
                      e.target.style.backgroundColor = "#ffffff";
                      e.target.style.color = "#6c757d";
                    }
                  }}
                >
                  <FontAwesomeIcon
                    icon={faRefresh}
                    size="sm"
                    className={isLoadingParties ? "fa-spin" : ""}
                  />
                </Button>

                {/* ✅ More Options Button */}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={onMoreOptions}
                  title="More Options"
                  className="border-0"
                  style={{
                    color: "#6c757d",
                    borderColor: "#6c757d",
                    backgroundColor: "#ffffff",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#6c757d";
                    e.target.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#ffffff";
                    e.target.style.color = "#6c757d";
                  }}
                >
                  <FontAwesomeIcon icon={faEllipsisH} size="sm" />
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* ✅ Line Break/Divider */}
      <div
        style={{
          height: "1px",
          background: "#dee2e6",
        }}
      ></div>

      {/* ✅ Parties Section Header */}
      <div
        className="bg-white py-3"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
          borderColor: "#dee2e6",
        }}
      >
        <Container fluid>
          <Row className="align-items-center mb-3">
            <Col lg={8} md={12} className="mb-2 mb-lg-0">
              <div className="d-flex align-items-center">
                <div
                  className="rounded me-3 d-flex align-items-center justify-content-center"
                  style={{
                    width: "40px",
                    height: "40px",
                    background: "#6f42c1",
                    color: "white",
                    boxShadow: "0 2px 8px rgba(111, 66, 193, 0.3)",
                  }}
                >
                  <FontAwesomeIcon icon={faUsers} size="lg" />
                </div>
                <div>
                  <h4
                    className="mb-1 fw-bold"
                    style={{
                      fontSize: "18px",
                      color: "#495057",
                    }}
                  >
                    Parties
                  </h4>
                  <p
                    className="mb-0"
                    style={{
                      fontSize: "12px",
                      color: "#6c757d",
                    }}
                  >
                    Manage your customers & vendors
                  </p>
                </div>
              </div>
            </Col>
            <Col lg={4} md={12}>
              <div className="d-flex gap-2 justify-content-lg-end justify-content-center">
                {/* ✅ Add Party Button */}
                <Button
                  size="sm"
                  onClick={onAddParty}
                  className="px-3 border-0"
                  style={{
                    fontSize: "12px",
                    background: "#6f42c1",
                    color: "white",
                    borderRadius: "6px",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#5a359a";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 4px 8px rgba(111, 66, 193, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#6f42c1";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-1" size="sm" />
                  Add Party
                </Button>
              </div>
            </Col>
          </Row>

          {/* ✅ Filter Options Row */}
          <Row className="align-items-center">
            <Col lg={3} md={6} className="mb-2 mb-lg-0">
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  size="sm"
                  className="w-100 text-start border-0"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#495057",
                    borderColor: "#dee2e6",
                    fontSize: "12px",
                    transition: "all 0.2s ease",
                    border: "1px solid #dee2e6",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.borderColor = "#adb5bd";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#ffffff";
                    e.target.style.borderColor = "#dee2e6";
                  }}
                >
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="me-2"
                    size="xs"
                  />
                  {getPartyTypeText()} ({totalParties})
                </Dropdown.Toggle>
                <Dropdown.Menu
                  className="shadow border-0"
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #dee2e6",
                    background: "white",
                  }}
                >
                  <Dropdown.Item
                    onClick={() => onTypeChange("all")}
                    active={activeType === "all"}
                    className="small py-2"
                    style={{
                      fontSize: "12px",
                      color: activeType === "all" ? "white" : "#495057",
                      backgroundColor:
                        activeType === "all" ? "#6f42c1" : "transparent",
                    }}
                  >
                    All Parties
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => onTypeChange("customer")}
                    active={activeType === "customer"}
                    className="small py-2"
                    style={{
                      fontSize: "12px",
                      color: activeType === "customer" ? "white" : "#495057",
                      backgroundColor:
                        activeType === "customer" ? "#6f42c1" : "transparent",
                    }}
                  >
                    Customers
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => onTypeChange("vendor")}
                    active={activeType === "vendor"}
                    className="small py-2"
                    style={{
                      fontSize: "12px",
                      color: activeType === "vendor" ? "white" : "#495057",
                      backgroundColor:
                        activeType === "vendor" ? "#6f42c1" : "transparent",
                    }}
                  >
                    Vendors
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => onTypeChange("supplier")}
                    active={activeType === "supplier"}
                    className="small py-2"
                    style={{
                      fontSize: "12px",
                      color: activeType === "supplier" ? "white" : "#495057",
                      backgroundColor:
                        activeType === "supplier" ? "#6f42c1" : "transparent",
                    }}
                  >
                    Suppliers
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => onTypeChange("both")}
                    active={activeType === "both"}
                    className="small py-2"
                    style={{
                      fontSize: "12px",
                      color: activeType === "both" ? "white" : "#495057",
                      backgroundColor:
                        activeType === "both" ? "#6f42c1" : "transparent",
                    }}
                  >
                    Both
                  </Dropdown.Item>
                  <Dropdown.Divider style={{borderColor: "#dee2e6"}} />
                  <Dropdown.Item
                    onClick={onExportParties}
                    className="small py-2"
                    style={{
                      fontSize: "12px",
                      color: "#495057",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faDownload}
                      className="me-2"
                      size="sm"
                    />
                    Export Parties
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col lg={6} md={0}>
              {/* Space for additional filters if needed */}
            </Col>
            <Col lg={3} md={6}>
              <div className="d-flex gap-2 justify-content-lg-end justify-content-center">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={onSettings}
                  title="Settings"
                  className="border-0"
                  style={{
                    color: "#6c757d",
                    borderColor: "#6c757d",
                    backgroundColor: "#ffffff",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#6c757d";
                    e.target.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#ffffff";
                    e.target.style.color = "#6c757d";
                  }}
                >
                  <FontAwesomeIcon icon={faCog} size="sm" />
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* ✅ CSS for animations */}
      <style>
        {`
          .fa-spin {
            animation: fa-spin 2s infinite linear;
          }

          @keyframes fa-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .btn:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(111, 66, 193, 0.2) !important;
          }

          .dropdown-item:hover {
            background-color: #f8f9fa !important;
            color: #495057 !important;
          }
        `}
      </style>
    </div>
  );
}

export default PartyHeader;
