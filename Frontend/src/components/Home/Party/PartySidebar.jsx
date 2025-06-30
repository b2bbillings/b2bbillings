import React from "react";
import {
  Row,
  Col,
  Button,
  Card,
  Form,
  InputGroup,
  Badge,
  Dropdown,
  Spinner,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faEdit,
  faPhone,
  faUser,
  faEllipsisV,
  faFilter,
  faSort,
  faSortUp,
  faSortDown,
  faTrash,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

function PartySidebar({
  parties = [],
  selectedParty = null,
  isLoadingParties = false,
  searchQuery = "",
  onSearchChange,
  sortConfig = {key: "currentBalance", direction: "desc"},
  onSort,
  onPartySelect,
  onEditParty,
  onDeleteParty,
  onAddParty,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  formatCurrency,
  totalParties = 0,
}) {
  // ✅ Sort key mapping helper function
  const mapSortKey = (frontendKey) => {
    const sortKeyMapping = {
      balance: "currentBalance",
      name: "name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      partyType: "partyType",
      creditLimit: "creditLimit",
      gstType: "gstType",
    };
    return sortKeyMapping[frontendKey] || frontendKey;
  };

  // ✅ Enhanced sort icon helper with proper key mapping
  const getSortIcon = (frontendColumnKey) => {
    const backendKey = mapSortKey(frontendColumnKey);
    if (sortConfig.key !== backendKey) {
      return faSort;
    }
    return sortConfig.direction === "asc" ? faSortUp : faSortDown;
  };

  // ✅ Handle sort with key mapping
  const handleSort = (frontendKey) => {
    const backendKey = mapSortKey(frontendKey);
    onSort(frontendKey, backendKey);
  };

  return (
    <div
      className="h-100 d-flex flex-column border-end shadow-sm"
      style={{
        background: "linear-gradient(135deg, #f5f2ff 0%, #ebe4ff 100%)",
      }}
    >
      {/* ✅ Search Section - Using #7c5cfc Purple Theme */}
      <div
        className="p-3 border-bottom"
        style={{
          background: "linear-gradient(135deg, #7c5cfc 0%, #6a47e8 100%)",
          borderColor: "rgba(124, 92, 252, 0.2)",
        }}
      >
        <InputGroup size="sm">
          <InputGroup.Text
            className="border-0 rounded-start-pill"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderColor: "rgba(124, 92, 252, 0.2)",
            }}
          >
            <FontAwesomeIcon
              icon={faSearch}
              className="text-muted"
              size="sm"
              style={{color: "#7c5cfc"}}
            />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search parties..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-0 rounded-end-pill shadow-sm"
            style={{
              fontSize: "13px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderColor: "rgba(124, 92, 252, 0.2)",
              boxShadow: "0 2px 4px rgba(124, 92, 252, 0.1)",
            }}
          />
        </InputGroup>
      </div>

      {/* ✅ List Header with Sorting - Using #7c5cfc Purple Theme */}
      <div
        className="border-bottom px-3 py-2"
        style={{
          background: "linear-gradient(135deg, #ebe4ff 0%, #ddd0ff 100%)",
          borderColor: "rgba(124, 92, 252, 0.2)",
        }}
      >
        <Row className="align-items-center">
          <Col>
            <small
              className="fw-bold text-uppercase d-flex align-items-center cursor-pointer"
              style={{
                fontSize: "11px",
                color: "#7c5cfc",
                transition: "color 0.2s ease",
              }}
              onClick={() => handleSort("name")}
              onMouseEnter={(e) => (e.target.style.color = "#5a3de0")}
              onMouseLeave={(e) => (e.target.style.color = "#7c5cfc")}
            >
              <FontAwesomeIcon icon={faFilter} className="me-1" size="xs" />
              Party Name
              <FontAwesomeIcon
                icon={getSortIcon("name")}
                className="ms-auto"
                size="xs"
                style={{color: "#7c5cfc"}}
              />
            </small>
          </Col>
          <Col xs="auto">
            <small
              className="fw-bold text-uppercase d-flex align-items-center cursor-pointer"
              style={{
                fontSize: "11px",
                color: "#7c5cfc",
                transition: "color 0.2s ease",
              }}
              onClick={() => handleSort("balance")}
              onMouseEnter={(e) => (e.target.style.color = "#5a3de0")}
              onMouseLeave={(e) => (e.target.style.color = "#7c5cfc")}
            >
              Amount
              <FontAwesomeIcon
                icon={getSortIcon("balance")}
                className="ms-1"
                size="xs"
                style={{color: "#7c5cfc"}}
              />
            </small>
          </Col>
        </Row>
      </div>

      {/* ✅ Parties List - Using #7c5cfc Purple Theme */}
      <div
        className="flex-grow-1 overflow-auto"
        style={{
          maxHeight: "calc(100vh - 350px)",
          scrollbarWidth: "thin",
          scrollbarColor: "#7c5cfc rgba(124, 92, 252, 0.1)",
        }}
      >
        {isLoadingParties ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="text-center">
              <Spinner
                animation="border"
                size="sm"
                style={{color: "#7c5cfc"}}
              />
              <div className="mt-2 small" style={{color: "#7c5cfc"}}>
                Loading parties...
              </div>
            </div>
          </div>
        ) : parties.length === 0 ? (
          <div className="d-flex flex-column justify-content-center align-items-center py-5 px-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mb-3"
              style={{
                width: "60px",
                height: "60px",
                background: "linear-gradient(135deg, #7c5cfc 0%, #6a47e8 100%)",
                color: "white",
                boxShadow: "0 4px 12px rgba(124, 92, 252, 0.3)",
              }}
            >
              <FontAwesomeIcon icon={faUser} size="lg" />
            </div>
            <h6
              className="text-center mb-2"
              style={{
                fontSize: "14px",
                color: "#7c5cfc",
              }}
            >
              {searchQuery ? "No parties found" : "No parties yet"}
            </h6>
            <p
              className="text-center mb-3"
              style={{
                fontSize: "12px",
                color: "#9484ff",
              }}
            >
              {searchQuery
                ? "Try adjusting your search terms"
                : "Get started by adding your first party"}
            </p>
            <Button
              size="sm"
              onClick={onAddParty}
              className="px-3 border-0 shadow-sm"
              style={{
                fontSize: "12px",
                background: "linear-gradient(135deg, #7c5cfc 0%, #6a47e8 100%)",
                color: "white",
                boxShadow: "0 2px 8px rgba(124, 92, 252, 0.3)",
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="me-1" />
              Add Party
            </Button>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {parties.map((party) => {
              const isSelected =
                selectedParty &&
                (selectedParty.id === party.id ||
                  selectedParty._id === party._id);
              return (
                <div
                  key={party.id || party._id}
                  className="list-group-item list-group-item-action border-0 border-bottom px-3 py-3"
                  style={{
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    minHeight: "75px",
                    background: isSelected
                      ? "linear-gradient(135deg, #7c5cfc 0%, #6a47e8 100%)"
                      : "rgba(255, 255, 255, 0.8)",
                    color: isSelected ? "white" : "inherit",
                    borderLeft: isSelected
                      ? "4px solid #ffffff"
                      : "4px solid transparent",
                    borderColor: "rgba(124, 92, 252, 0.1)",
                    boxShadow: isSelected
                      ? "0 2px 8px rgba(124, 92, 252, 0.3)"
                      : "none",
                  }}
                  onClick={() => onPartySelect(party)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background =
                        "linear-gradient(135deg, #ebe4ff 0%, #ddd0ff 100%)";
                      e.currentTarget.style.borderLeft = "4px solid #7c5cfc";
                      e.currentTarget.style.boxShadow =
                        "0 2px 4px rgba(124, 92, 252, 0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.8)";
                      e.currentTarget.style.borderLeft =
                        "4px solid transparent";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <Row className="align-items-center g-0">
                    <Col className="pe-2">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="flex-grow-1 me-2">
                          <div
                            className={`fw-semibold mb-1 ${
                              isSelected ? "text-white" : ""
                            }`}
                            style={{
                              fontSize: "14px",
                              lineHeight: "1.2",
                              wordBreak: "break-word",
                              color: isSelected ? "white" : "#4a4a4a",
                            }}
                          >
                            {party.name}
                            <Badge
                              className="ms-2"
                              style={{
                                fontSize: "9px",
                                backgroundColor: isSelected
                                  ? "rgba(255,255,255,0.25)"
                                  : party.partyType === "customer"
                                  ? "#28a745"
                                  : party.partyType === "vendor"
                                  ? "#fd7e14"
                                  : "#7c5cfc",
                                color: "white",
                                border: "none",
                              }}
                            >
                              {party.partyType}
                            </Badge>
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: isSelected
                                ? "rgba(255,255,255,0.8)"
                                : "#7c5cfc",
                            }}
                          >
                            <FontAwesomeIcon icon={faPhone} className="me-1" />
                            {party.phone}
                          </div>
                        </div>

                        {/* ✅ Party Actions - Using #7c5cfc Purple Theme */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Dropdown align="end">
                            <Dropdown.Toggle
                              variant="link"
                              className="p-1 border-0 shadow-none text-decoration-none rounded"
                              style={{
                                fontSize: "12px",
                                color: isSelected
                                  ? "rgba(255,255,255,0.8)"
                                  : "#7c5cfc",
                                backgroundColor: "transparent",
                              }}
                            >
                              <FontAwesomeIcon icon={faEllipsisV} size="sm" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu
                              className="shadow border-0"
                              style={{
                                borderRadius: "8px",
                                background:
                                  "linear-gradient(135deg, #f5f2ff 0%, #ebe4ff 100%)",
                                border: "1px solid rgba(124, 92, 252, 0.2)",
                              }}
                            >
                              <Dropdown.Item
                                onClick={() => onEditParty(party)}
                                className="small py-2"
                                style={{
                                  fontSize: "12px",
                                  color: "#7c5cfc",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background =
                                    "linear-gradient(135deg, #ebe4ff 0%, #ddd0ff 100%)";
                                  e.target.style.color = "#5a3de0";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor =
                                    "transparent";
                                  e.target.style.color = "#7c5cfc";
                                }}
                              >
                                <FontAwesomeIcon
                                  icon={faEdit}
                                  className="me-2"
                                />
                                Edit Party
                              </Dropdown.Item>
                              <Dropdown.Divider
                                style={{
                                  borderColor: "rgba(124, 92, 252, 0.2)",
                                }}
                              />
                              <Dropdown.Item
                                onClick={() => onDeleteParty(party)}
                                className="small py-2"
                                style={{
                                  fontSize: "12px",
                                  color: "#dc3545",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = "#fff5f5";
                                  e.target.style.color = "#c82333";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor =
                                    "transparent";
                                  e.target.style.color = "#dc3545";
                                }}
                              >
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  className="me-2"
                                />
                                Delete Party
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </div>

                      {/* ✅ Balance Display - Using #7c5cfc Purple Theme */}
                      <div className="mt-2">
                        <span
                          className="fw-bold small"
                          style={{
                            fontSize: "12px",
                            color: isSelected
                              ? "white"
                              : party.balance > 0
                              ? "#28a745"
                              : party.balance < 0
                              ? "#dc3545"
                              : "#6c757d",
                          }}
                        >
                          ₹{formatCurrency(Math.abs(party.balance))}
                          <small
                            style={{
                              fontSize: "10px",
                              color: isSelected
                                ? "rgba(255,255,255,0.7)"
                                : "#7c5cfc",
                              marginLeft: "4px",
                            }}
                          >
                            ({party.balance >= 0 ? "Credit" : "Debit"})
                          </small>
                        </span>
                      </div>
                    </Col>
                  </Row>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ Pagination - Using #7c5cfc Purple Theme */}
      {totalPages > 1 && (
        <div
          className="p-3 border-top"
          style={{
            background: "linear-gradient(135deg, #ebe4ff 0%, #ddd0ff 100%)",
            borderColor: "rgba(124, 92, 252, 0.2)",
          }}
        >
          <Row className="align-items-center g-2">
            <Col>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="border-0"
                style={{
                  fontSize: "11px",
                  color: currentPage <= 1 ? "#9ca3af" : "#7c5cfc",
                  backgroundColor: "transparent",
                  border: `1px solid ${
                    currentPage <= 1 ? "#e5e7eb" : "#7c5cfc"
                  }`,
                }}
                onMouseEnter={(e) => {
                  if (currentPage > 1) {
                    e.target.style.background =
                      "linear-gradient(135deg, #7c5cfc 0%, #6a47e8 100%)";
                    e.target.style.color = "white";
                    e.target.style.boxShadow =
                      "0 2px 4px rgba(124, 92, 252, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage > 1) {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#7c5cfc";
                    e.target.style.boxShadow = "none";
                  }
                }}
              >
                Previous
              </Button>
            </Col>
            <Col xs="auto">
              <small
                className="fw-semibold"
                style={{
                  fontSize: "11px",
                  color: "#7c5cfc",
                }}
              >
                Page {currentPage} of {totalPages}
              </small>
            </Col>
            <Col xs="auto">
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="border-0"
                style={{
                  fontSize: "11px",
                  color: currentPage >= totalPages ? "#9ca3af" : "#7c5cfc",
                  backgroundColor: "transparent",
                  border: `1px solid ${
                    currentPage >= totalPages ? "#e5e7eb" : "#7c5cfc"
                  }`,
                }}
                onMouseEnter={(e) => {
                  if (currentPage < totalPages) {
                    e.target.style.background =
                      "linear-gradient(135deg, #7c5cfc 0%, #6a47e8 100%)";
                    e.target.style.color = "white";
                    e.target.style.boxShadow =
                      "0 2px 4px rgba(124, 92, 252, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage < totalPages) {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#7c5cfc";
                    e.target.style.boxShadow = "none";
                  }
                }}
              >
                Next
              </Button>
            </Col>
          </Row>
        </div>
      )}

      {/* ✅ Contact Info - Using #7c5cfc Purple Theme */}
      <div
        className="p-3 border-top"
        style={{
          background: "linear-gradient(135deg, #ebe4ff 0%, #ddd0ff 100%)",
          borderColor: "rgba(124, 92, 252, 0.2)",
        }}
      >
        <Card
          className="border-0 shadow-sm"
          style={{
            background:
              "linear-gradient(135deg, rgba(124, 92, 252, 0.1) 0%, rgba(106, 71, 232, 0.1) 100%)",
            borderRadius: "8px",
            border: "1px solid rgba(124, 92, 252, 0.2)",
          }}
        >
          <Card.Body className="p-3 text-center">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2"
              style={{
                width: "24px",
                height: "24px",
                background: "linear-gradient(135deg, #7c5cfc 0%, #6a47e8 100%)",
                color: "white",
                boxShadow: "0 2px 4px rgba(124, 92, 252, 0.3)",
              }}
            >
              <FontAwesomeIcon icon={faPhone} size="xs" />
            </div>
            <div
              className="small"
              style={{
                fontSize: "11px",
                lineHeight: "1.4",
                color: "#7c5cfc",
              }}
            >
              Use contacts from your Phone or Gmail to{" "}
              <strong style={{color: "#5a3de0"}}>
                quickly create parties.
              </strong>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

export default PartySidebar;
