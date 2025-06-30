import React, {useState, useCallback, useMemo, useEffect, useRef} from "react";
import {
  Card,
  Table,
  Form,
  InputGroup,
  Badge,
  Button,
  Dropdown,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faEllipsisV,
  faFileExport,
  faSortDown,
  faArrowUp,
  faArrowDown,
  faEye,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

function TransactionHistory({
  transactions = [],
  selectedItem,
  searchQuery = "",
  onSearchChange,
}) {
  const [sortConfig, setSortConfig] = useState({key: null, direction: "asc"});

  // Filter transactions for selected item and search query
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (!selectedItem) return false;

      const itemMatch = transaction.itemId === selectedItem.id;
      const searchMatch =
        searchQuery === "" ||
        transaction.customerName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.invoiceNumber
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.type?.toLowerCase().includes(searchQuery.toLowerCase());

      return itemMatch && searchMatch;
    });
  }, [transactions, selectedItem, searchQuery]);

  const formatPrice = useCallback((price) => {
    return `₹${Number(price || 0).toLocaleString("en-IN")}`;
  }, []);

  const getTransactionIcon = useCallback((type) => {
    return type === "Sale" ? (
      <FontAwesomeIcon icon={faArrowUp} className="text-success" size="sm" />
    ) : (
      <FontAwesomeIcon icon={faArrowDown} className="text-danger" size="sm" />
    );
  }, []);

  const getStatusBadge = useCallback((status) => {
    const variant = status === "Paid" ? "success" : "warning";
    return (
      <Badge
        bg={variant}
        className="fw-normal"
        style={{
          borderRadius: "0",
          fontSize: "11px",
          padding: "0.25rem 0.5rem",
        }}
      >
        {status}
      </Badge>
    );
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      let direction = "asc";
      if (prev.key === key && prev.direction === "asc") {
        direction = "desc";
      }
      return {key, direction};
    });
  }, []);

  // Action handlers
  const handleViewDetails = useCallback((transaction) => {
    console.log("View details for:", transaction);
    // Add your view details logic here
  }, []);

  const handleEditTransaction = useCallback((transaction) => {
    console.log("Edit transaction:", transaction);
    // Add your edit transaction logic here
  }, []);

  const handleDeleteTransaction = useCallback((transaction) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      console.log("Delete transaction:", transaction);
      // Add your delete transaction logic here
    }
  }, []);

  // Custom Dropdown Toggle
  const CustomToggle = React.forwardRef(({children, onClick}, ref) => (
    <button
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      className="btn btn-link p-0 border-0 text-muted custom-dropdown-toggle"
      style={{
        borderRadius: "0",
        opacity: 0.7,
        transition: "all 0.2s ease",
        background: "none",
        fontSize: "14px",
        textDecoration: "none",
      }}
    >
      {children}
    </button>
  ));

  CustomToggle.displayName = "CustomToggle";

  return (
    <>
      <Card className="border-0 shadow-sm h-100 transaction-history-card">
        {/* Header */}
        <Card.Header
          className="bg-white border-bottom py-3"
          style={{borderRadius: "0"}}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h5
              className="mb-0 fw-bold"
              style={{color: "#495057", fontSize: "16px"}}
            >
              TRANSACTIONS
              {selectedItem && (
                <small className="text-muted ms-2" style={{fontSize: "12px"}}>
                  for {selectedItem.name}
                </small>
              )}
            </h5>
            <div className="d-flex align-items-center gap-3">
              {/* Search */}
              <div className="search-container">
                <InputGroup size="sm" style={{width: "250px"}}>
                  <InputGroup.Text
                    className="bg-light border-end-0"
                    style={{borderRadius: "0"}}
                  >
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="text-muted"
                      size="sm"
                    />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="border-start-0 bg-light"
                    style={{
                      borderRadius: "0",
                      fontSize: "13px",
                    }}
                  />
                </InputGroup>
              </div>

              {/* Export Button */}
              <Button
                size="sm"
                className="fw-semibold text-white border-0"
                style={{
                  background: "#6c757d",
                  borderRadius: "0",
                  fontSize: "12px",
                  padding: "0.5rem 1rem",
                }}
              >
                <FontAwesomeIcon
                  icon={faFileExport}
                  className="me-1"
                  size="sm"
                />
                Export
              </Button>
            </div>
          </div>
        </Card.Header>

        {/* Table */}
        <Card.Body className="p-0" style={{borderRadius: "0"}}>
          <div className="table-responsive transaction-table-container">
            <Table
              className="mb-0 transaction-table"
              style={{borderRadius: "0"}}
            >
              <thead className="bg-light">
                <tr>
                  <th
                    className="border-0 py-3 ps-4 text-muted small fw-semibold text-uppercase"
                    style={{fontSize: "11px"}}
                  >
                    <div className="d-flex align-items-center gap-2">
                      TYPE
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("type")}
                        style={{fontSize: "10px", color: "#6c757d"}}
                      />
                    </div>
                  </th>
                  <th
                    className="border-0 py-3 text-muted small fw-semibold text-uppercase"
                    style={{fontSize: "11px"}}
                  >
                    <div className="d-flex align-items-center gap-2">
                      INVOICE/REF.
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("invoiceNumber")}
                        style={{fontSize: "10px", color: "#6c757d"}}
                      />
                    </div>
                  </th>
                  <th
                    className="border-0 py-3 text-muted small fw-semibold text-uppercase"
                    style={{fontSize: "11px"}}
                  >
                    <div className="d-flex align-items-center gap-2">
                      CUSTOMER/VENDOR
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("customerName")}
                        style={{fontSize: "10px", color: "#6c757d"}}
                      />
                    </div>
                  </th>
                  <th
                    className="border-0 py-3 text-muted small fw-semibold text-uppercase"
                    style={{fontSize: "11px"}}
                  >
                    <div className="d-flex align-items-center gap-2">
                      DATE
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("date")}
                        style={{fontSize: "10px", color: "#6c757d"}}
                      />
                    </div>
                  </th>
                  <th
                    className="border-0 py-3 text-muted small fw-semibold text-uppercase"
                    style={{fontSize: "11px"}}
                  >
                    <div className="d-flex align-items-center gap-2">
                      QUANTITY
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("quantity")}
                        style={{fontSize: "10px", color: "#6c757d"}}
                      />
                    </div>
                  </th>
                  <th
                    className="border-0 py-3 text-muted small fw-semibold text-uppercase"
                    style={{fontSize: "11px"}}
                  >
                    <div className="d-flex align-items-center gap-2">
                      PRICE/UNIT
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("pricePerUnit")}
                        style={{fontSize: "10px", color: "#6c757d"}}
                      />
                    </div>
                  </th>
                  <th
                    className="border-0 py-3 text-muted small fw-semibold text-uppercase"
                    style={{fontSize: "11px"}}
                  >
                    <div className="d-flex align-items-center gap-2">
                      TOTAL
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-muted cursor-pointer"
                        onClick={() => handleSort("total")}
                        style={{fontSize: "10px", color: "#6c757d"}}
                      />
                    </div>
                  </th>
                  <th
                    className="border-0 py-3 text-muted small fw-semibold text-uppercase"
                    style={{fontSize: "11px"}}
                  >
                    STATUS
                  </th>
                  <th className="border-0 py-3 pe-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <div className="d-flex flex-column align-items-center">
                        <div
                          className="mb-2"
                          style={{fontSize: "2rem", opacity: 0.5}}
                        >
                          📊
                        </div>
                        <div
                          className="fw-semibold mb-1"
                          style={{fontSize: "14px"}}
                        >
                          {selectedItem
                            ? searchQuery
                              ? "No transactions found matching your search"
                              : "No transactions found for this item"
                            : "Select an item to view transactions"}
                        </div>
                        <small style={{fontSize: "12px", color: "#6c757d"}}>
                          {selectedItem && !searchQuery
                            ? "Transactions will appear here once created"
                            : ""}
                        </small>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction, index) => (
                    <tr
                      key={transaction.id || index}
                      className="border-bottom transaction-row"
                    >
                      <td className="py-3 ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <span className="transaction-icon">
                            {getTransactionIcon(transaction.type)}
                          </span>
                          <span
                            className="fw-medium text-dark"
                            style={{fontSize: "13px"}}
                          >
                            {transaction.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-dark"
                          style={{
                            fontSize: "13px",
                            fontFamily: "monospace",
                            background: "#f8f9fa",
                            padding: "2px 4px",
                            borderRadius: "0",
                          }}
                        >
                          {transaction.invoiceNumber || "-"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-dark fw-medium"
                          style={{fontSize: "13px"}}
                        >
                          {transaction.customerName}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-muted" style={{fontSize: "13px"}}>
                          {new Date(transaction.date).toLocaleDateString(
                            "en-IN"
                          )}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-dark fw-medium"
                          style={{fontSize: "13px"}}
                        >
                          {transaction.quantity} {transaction.unit || "PCS"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-dark fw-medium"
                          style={{fontSize: "13px"}}
                        >
                          {formatPrice(transaction.pricePerUnit)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className="text-dark fw-bold"
                          style={{
                            fontSize: "13px",
                            color:
                              transaction.type === "Sale"
                                ? "#28a745"
                                : "#dc3545",
                          }}
                        >
                          {formatPrice(
                            transaction.quantity * transaction.pricePerUnit
                          )}
                        </span>
                      </td>
                      <td className="py-3">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="py-3 pe-4">
                        <Dropdown align="end" drop="down">
                          <Dropdown.Toggle as={CustomToggle}>
                            <FontAwesomeIcon icon={faEllipsisV} />
                          </Dropdown.Toggle>

                          <Dropdown.Menu
                            style={{
                              borderRadius: "0",
                              border: "1px solid #dee2e6",
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                              padding: "0.5rem 0",
                              minWidth: "180px",
                              zIndex: 1050,
                            }}
                          >
                            <Dropdown.Item
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewDetails(transaction);
                              }}
                              className="d-flex align-items-center gap-2"
                              style={{
                                fontSize: "13px",
                                padding: "0.5rem 1rem",
                                transition: "all 0.2s ease",
                                borderRadius: "0",
                              }}
                            >
                              <FontAwesomeIcon
                                icon={faEye}
                                className="text-primary"
                                style={{width: "14px"}}
                              />
                              View Details
                            </Dropdown.Item>

                            <Dropdown.Item
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditTransaction(transaction);
                              }}
                              className="d-flex align-items-center gap-2"
                              style={{
                                fontSize: "13px",
                                padding: "0.5rem 1rem",
                                transition: "all 0.2s ease",
                                borderRadius: "0",
                              }}
                            >
                              <FontAwesomeIcon
                                icon={faEdit}
                                className="text-warning"
                                style={{width: "14px"}}
                              />
                              Edit Transaction
                            </Dropdown.Item>

                            <Dropdown.Divider style={{margin: "0.5rem 0"}} />

                            <Dropdown.Item
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteTransaction(transaction);
                              }}
                              className="d-flex align-items-center gap-2 text-danger"
                              style={{
                                fontSize: "13px",
                                padding: "0.5rem 1rem",
                                transition: "all 0.2s ease",
                                borderRadius: "0",
                              }}
                            >
                              <FontAwesomeIcon
                                icon={faTrash}
                                style={{width: "14px"}}
                              />
                              Delete
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Clean Styles */}
      <style>
        {`
                /* Remove all border radius */
                .transaction-history-card,
                .transaction-history-card *,
                .transaction-history-card *::before,
                .transaction-history-card *::after {
                    border-radius: 0 !important;
                }

                /* Apply theme colors */
                .transaction-history-card {
                    background: #ffffff;
                    border: 1px solid #dee2e6 !important;
                    transition: all 0.2s ease;
                }

                .transaction-history-card:hover {
                    box-shadow: 0 2px 8px rgba(108, 117, 125, 0.1) !important;
                    border-color: #6c757d !important;
                }

                .cursor-pointer {
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .cursor-pointer:hover {
                    color: #6c757d !important;
                    transform: scale(1.1);
                }

                .search-container .input-group-text {
                    background-color: #f8f9fa !important;
                    border-color: #dee2e6 !important;
                }

                .transaction-table-container {
                    max-height: calc(100vh - 300px);
                    overflow-y: auto;
                }

                .transaction-table thead th {
                    position: sticky;
                    top: 0;
                    background-color: #f8f9fa !important;
                    z-index: 10;
                    border-bottom: 2px solid #dee2e6 !important;
                }

                .transaction-row {
                    transition: all 0.2s ease;
                    border-bottom: 1px solid #f1f3f4 !important;
                }

                .transaction-row:hover {
                    background-color: #f8f9fa !important;
                    border-color: #6c757d !important;
                    transform: translateX(2px);
                }

                .transaction-row:hover .custom-dropdown-toggle {
                    opacity: 1 !important;
                }

                .transaction-icon {
                    font-size: 0.8rem;
                }

                .table td, .table th {
                    vertical-align: middle;
                    border-color: #e9ecef;
                }

                /* Export button hover */
                .btn[style*="background: #6c757d"]:hover {
                    background: #5a6268 !important;
                    transform: translateY(-1px);
                }

                /* Form focus states */
                .form-control:focus {
                    border-color: #6c757d !important;
                    box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.25) !important;
                    background-color: white !important;
                }

                /* Custom toggle button */
                .custom-dropdown-toggle {
                    transition: all 0.2s ease !important;
                }

                .custom-dropdown-toggle:hover {
                    opacity: 1 !important;
                    transform: scale(1.1);
                    color: #6c757d !important;
                    text-decoration: none !important;
                }

                .custom-dropdown-toggle:focus {
                    box-shadow: none !important;
                    outline: none !important;
                    text-decoration: none !important;
                }

                .custom-dropdown-toggle:active {
                    text-decoration: none !important;
                }

                /* Enhanced Dropdown styling */
                .dropdown-menu {
                    border-radius: 0 !important;
                    min-width: 180px;
                }

                .dropdown-item {
                    border-radius: 0 !important;
                    transition: all 0.2s ease !important;
                }

                .dropdown-item:hover {
                    background: #f8f9fa !important;
                    padding-left: 1.25rem !important;
                    transform: translateX(4px);
                }

                .dropdown-item.text-danger:hover {
                    background: rgba(220, 53, 69, 0.1) !important;
                    color: #dc3545 !important;
                }

                .dropdown-item:focus {
                    background: #f8f9fa !important;
                    outline: none;
                }

                .dropdown-item:active {
                    background: #e9ecef !important;
                }

                /* Ensure dropdown appears above other elements */
                .dropdown-menu.show {
                    z-index: 1050 !important;
                }

                /* Scrollbar styling */
                .transaction-table-container::-webkit-scrollbar {
                    width: 6px;
                }

                .transaction-table-container::-webkit-scrollbar-track {
                    background: transparent;
                }

                .transaction-table-container::-webkit-scrollbar-thumb {
                    background: #dee2e6;
                }

                .transaction-table-container::-webkit-scrollbar-thumb:hover {
                    background: #adb5bd;
                }

                /* Enhanced visual elements */
                .badge {
                    font-weight: 500 !important;
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .search-container {
                        display: none;
                    }
                    
                    .transaction-table-container {
                        max-height: 400px;
                    }
                    
                    .table-responsive {
                        font-size: 0.875rem;
                    }

                    .transaction-row:hover {
                        transform: none;
                    }

                    .dropdown-item:hover {
                        transform: none;
                        padding-left: 1rem !important;
                    }
                }

                @media (max-width: 576px) {
                    .transaction-table th,
                    .transaction-table td {
                        padding: 0.5rem 0.25rem;
                        font-size: 12px !important;
                    }
                    
                    .transaction-table th:first-child,
                    .transaction-table td:first-child {
                        padding-left: 0.75rem;
                    }
                    
                    .transaction-table th:last-child,
                    .transaction-table td:last-child {
                        padding-right: 0.75rem;
                    }

                    .d-flex.justify-content-between {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .dropdown-menu {
                        min-width: 160px;
                    }
                }
                `}
      </style>
    </>
  );
}

export default TransactionHistory;
