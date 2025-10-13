import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import invoiceService from "../../../../../Backend/src/services/invoiceService";

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1
  });
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [filters.page, filters.status]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const result = await invoiceService.getAllInvoices({
        ...filters,
        sortBy: "invoiceDate",
        sortOrder: "desc"
      });

      if (result.success) {
        setInvoices(result.data || []);
        setPagination(result.pagination || {});
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await invoiceService.getInvoiceStats();
      if (result.success) {
        setStats(result.data || {});
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, page: 1 });
    fetchInvoices();
  };

  const handleStatusFilter = (status) => {
    setFilters({ ...filters, status, page: 1 });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) {
      return;
    }

    try {
      const result = await invoiceService.deleteInvoice(id);
      if (result.success) {
        toast.success("Invoice deleted successfully");
        fetchInvoices();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete invoice");
    }
  };

  const handleRecordPayment = async (invoice) => {
    const amount = prompt(`Enter payment amount (Pending: ₹${invoice.payment.pendingAmount}):`);
    
    if (!amount || isNaN(amount)) return;

    try {
      const result = await invoiceService.recordPayment(invoice._id, {
        amount: parseFloat(amount),
        mode: "Cash"
      });

      if (result.success) {
        toast.success("Payment recorded successfully");
        fetchInvoices();
        fetchStats();
      }
    } catch (error) {
      toast.error(error.message || "Failed to record payment");
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      paid: "#28a745",
      pending: "#ffc107",
      partially_paid: "#17a2b8",
      overdue: "#dc3545",
      draft: "#6c757d",
      cancelled: "#6c757d",
      void: "#6c757d"
    };

    return (
      <span style={{
        padding: "4px 12px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "500",
        background: statusColors[status] || "#6c757d",
        color: "#fff"
      }}>
        {status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Invoices</h2>
        <button
          onClick={() => window.location.href = "/invoices/new"}
          style={{
            padding: "12px 24px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          + New Invoice
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <div style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>Total Invoices</div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>{stats.totalInvoices || 0}</div>
          <div style={{ color: "#007bff", fontSize: "12px", marginTop: "4px" }}>
            ₹{(stats.totalAmount || 0).toLocaleString()}
          </div>
        </div>

        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <div style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>Paid</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
            {stats.paidCount || 0}
          </div>
          <div style={{ color: "#28a745", fontSize: "12px", marginTop: "4px" }}>
            ₹{(stats.totalPaid || 0).toLocaleString()}
          </div>
        </div>

        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <div style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>Pending</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffc107" }}>
            {stats.pendingCount || 0}
          </div>
          <div style={{ color: "#ffc107", fontSize: "12px", marginTop: "4px" }}>
            ₹{(stats.totalPending || 0).toLocaleString()}
          </div>
        </div>

        <div style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <div style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>Partially Paid</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#17a2b8" }}>
            {stats.partiallyPaidCount || 0}
          </div>
          <div style={{ color: "#17a2b8", fontSize: "12px", marginTop: "4px" }}>
            ₹{(stats.totalPartiallyPaid || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px" }}>Search</label>
            <input
              type="text"
              placeholder="Invoice number, party name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px" }}>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px" }}>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px" }}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleStatusFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <button
            onClick={handleSearch}
            style={{
              padding: "8px 16px",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div style={{
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        overflowX: "auto"
      }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
            No invoices found
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>
                  Invoice #
                </th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>
                  Date
                </th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>
                  Party
                </th>
                <th style={{ padding: "12px", textAlign: "right", borderBottom: "2px solid #dee2e6" }}>
                  Amount
                </th>
                <th style={{ padding: "12px", textAlign: "right", borderBottom: "2px solid #dee2e6" }}>
                  Paid
                </th>
                <th style={{ padding: "12px", textAlign: "right", borderBottom: "2px solid #dee2e6" }}>
                  Pending
                </th>
                <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>
                  Status
                </th>
                <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice._id} style={{ borderBottom: "1px solid #dee2e6" }}>
                  <td style={{ padding: "12px" }}>
                    <strong>{invoice.fullInvoiceNumber}</strong>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {new Date(invoice.invoiceDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div>{invoice.party.name}</div>
                    {invoice.party.company && (
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {invoice.party.company}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    ₹{(invoice.totals.grandTotal || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", color: "#28a745" }}>
                    ₹{(invoice.payment.amount || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", color: "#dc3545" }}>
                    ₹{(invoice.payment.pendingAmount || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        onClick={() => window.location.href = `/invoices/${invoice._id}`}
                        style={{
                          padding: "6px 12px",
                          background: "#007bff",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        View
                      </button>
                      
                      {invoice.status !== "paid" && (
                        <button
                          onClick={() => handleRecordPayment(invoice)}
                          style={{
                            padding: "6px 12px",
                            background: "#28a745",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          Pay
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(invoice._id)}
                        style={{
                          padding: "6px 12px",
                          background: "#dc3545",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "center",
          gap: "8px"
        }}>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            style={{
              padding: "8px 16px",
              background: filters.page === 1 ? "#ccc" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: filters.page === 1 ? "not-allowed" : "pointer"
            }}
          >
            Previous
          </button>
          
          <span style={{ padding: "8px 16px", display: "flex", alignItems: "center" }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={filters.page === pagination.pages}
            style={{
              padding: "8px 16px",
              background: filters.page === pagination.pages ? "#ccc" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: filters.page === pagination.pages ? "not-allowed" : "pointer"
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;