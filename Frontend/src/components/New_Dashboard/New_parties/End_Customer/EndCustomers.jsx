import React, { useState, useEffect } from "react";
import { Plus, Search, Phone, User, Edit2, Trash2, X } from "lucide-react";
import "./EndCustomers.css";

const EndCustomers = ({ onSelect }) => {
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customerName: "",
    whatsapp: "",
  });
  const [errors, setErrors] = useState({});

  // Use full URL for testing
  const API_BASE_URL = "http://localhost:5000/api/end-customers";

  useEffect(() => {
    fetchCustomers();
  }, []);

  const token = localStorage.getItem("token");

  const fetchCustomers = async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      console.log("Fetching customers from:", API_BASE_URL, "with headers:", headers);

      const response = await fetch(API_BASE_URL, { headers });
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      const text = await response.text();
      console.log("Raw response:", text);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: "Invalid JSON response, received HTML" };
        }
        console.log("Error response:", errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = JSON.parse(text);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching customers:", error.message);
      setCustomers([]);
      // alert(`Failed to fetch customers: ${error.message}`);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = "WhatsApp number is required";
    } else if (!/^\+?[\d\s-]{10,}$/.test(formData.whatsapp)) {
      newErrors.whatsapp = "Please enter a valid phone number (at least 10 digits)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      console.log("Sending request to:", editingCustomer ? `${API_BASE_URL}/${editingCustomer._id}` : API_BASE_URL);
      console.log("Request body:", formData, "headers:", headers);

      const response = await fetch(
        editingCustomer ? `${API_BASE_URL}/${editingCustomer._id}` : API_BASE_URL,
        {
          method: editingCustomer ? "PUT" : "POST",
          headers,
          body: JSON.stringify(formData),
        }
      );

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      const text = await response.text();
      console.log("Raw response:", text);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: "Invalid JSON response, received HTML" };
        }
        console.log("Error response:", errorData);
        throw new Error(errorData.error || `Failed to ${editingCustomer ? "update" : "create"} customer`);
      }

      const createdCustomer = { ...formData, _id: editingCustomer ? editingCustomer._id : Date.now() };
      setFormData({ customerName: "", whatsapp: "" });
      setShowModal(false);
      setEditingCustomer(null);
      setErrors({});
      fetchCustomers();

      if (typeof onSelect === "function") {
        onSelect(createdCustomer);
      }
    } catch (error) {
      console.error(`Error ${editingCustomer ? "updating" : "creating"} customer:`, error.message);
      alert(`Error: ${error.message}`);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerName: customer.customerName,
      whatsapp: customer.whatsapp,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        const headers = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        console.log(`Sending DELETE request to ${API_BASE_URL}/${id}`);

        const response = await fetch(`${API_BASE_URL}/${id}`, {
          method: "DELETE",
          headers,
        });

        console.log("Delete response status:", response.status);
        const text = await response.text();
        console.log("Delete raw response:", text);

        if (!response.ok) {
          let errorData;
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { error: "Invalid JSON response, received HTML" };
          }
          console.log("Delete error response:", errorData);
          throw new Error(errorData.error || "Failed to delete customer");
        }

        fetchCustomers();
      } catch (error) {
        console.error("Error deleting customer:", error.message);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const filteredCustomers = Array.isArray(customers)
    ? customers.filter(
        (customer) =>
          customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.whatsapp.includes(searchTerm)
      )
    : [];

  const openModal = () => {
    setFormData({ customerName: "", whatsapp: "" });
    setEditingCustomer(null);
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setErrors({});
  };

  return (
    <div className="customer-container">
      {/* <div className="header-section">
        <h1>Customer Management</h1>
        <p>Manage your customer contacts efficiently</p>
      </div> */}
      <div className="controls-section">
        <div className="controls-wrapper">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search by name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={openModal} className="add-button">
            <Plus style={{ width: "20px", height: "20px" }} />
            Add Customer
          </button>
        </div>
      </div>
      <div className="customers-section">
        <h2 className="customers-header">
          All Customers ({filteredCustomers.length})
        </h2>
        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <User style={{ width: "40px", height: "40px", color: "#9ca3af" }} />
            </div>
            <h3>No customers found</h3>
            <p>
              {searchTerm ? "Try a different search term" : 'Click "Add Customer" to get started'}
            </p>
          </div>
        ) : (
          <div className="customers-grid">
            {filteredCustomers.map((customer) => (
              <div key={customer._id} className="customer-card">
                <div className="card-header">
                  <div className="customer-icon-wrapper">
                    <User className="customer-icon" />
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="action-button edit-button"
                      title="Edit customer"
                    >
                      <Edit2 style={{ width: "16px", height: "16px" }} />
                    </button>
                    <button
                      onClick={() => handleDelete(customer._id)}
                      className="action-button delete-button"
                      title="Delete customer"
                    >
                      <Trash2 style={{ width: "16px", height: "16px" }} />
                    </button>
                    {typeof onSelect === "function" && (
                      <button
                        onClick={() => onSelect(customer)}
                        className="action-button select-button"
                        title="Select this customer"
                        style={{
                          background: "#4f46e5",
                          color: "#fff",
                          marginLeft: 8,
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontSize: 12,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="customer-name">{customer.customerName}</h3>
                <div className="customer-phone">
                  <Phone className="phone-icon" />
                  <span>{customer.whatsapp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.className === "modal-overlay") closeModal();
          }}
        >
          <div className="modal-content">
            <button onClick={closeModal} className="modal-close" title="Close">
              <X style={{ width: "24px", height: "24px" }} />
            </button>
            <h2 className="modal-title">
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Customer Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  className={`form-input ${errors.customerName ? "error" : ""}`}
                  placeholder="Enter customer name"
                  autoFocus
                />
                {errors.customerName && (
                  <span className="error-message">{errors.customerName}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">
                  WhatsApp Number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp: e.target.value })
                  }
                  className={`form-input ${errors.whatsapp ? "error" : ""}`}
                  placeholder="Enter WhatsApp number (e.g., +1234567890)"
                />
                {errors.whatsapp && (
                  <span className="error-message">{errors.whatsapp}</span>
                )}
              </div>
              <button type="submit" className="submit-button">
                {editingCustomer ? "Update Customer" : "Save Customer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EndCustomers;