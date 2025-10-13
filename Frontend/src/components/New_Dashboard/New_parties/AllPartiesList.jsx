import React, { useState, useEffect } from 'react';
import customerService from './Customers/Customers';
import vendorService from './Vendors/Vendors'
import './AllPartiesList.css';

const AllPartiesList = ({ type = 'customers' }) => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    gstType: '',
    isActive: 'true'
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [selectedParty, setSelectedParty] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch parties
  const fetchParties = async () => {
    setLoading(true);
    setError('');
    
    try {
      const service = type === 'customers' ? customerService : vendorService;
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder
      };
      
      const response = await service[type === 'customers' ? 'getAllCustomers' : 'getAllVendors'](params);
      
      if (response.success) {
        setParties(response.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 0
        }));
      } else {
        setError(response.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [type, filters, pagination.page, sortBy, sortOrder]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // View details
  const handleViewDetails = async (party) => {
    try {
      const service = type === 'customers' ? customerService : vendorService;
      const response = await service[type === 'customers' ? 'getCustomer' : 'getVendor'](party._id);
      
      if (response.success) {
        setSelectedParty(response.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
    }
  };

  // Delete party
  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type === 'customers' ? 'customer' : 'vendor'}?`)) {
      return;
    }
    
    try {
      const service = type === 'customers' ? customerService : vendorService;
      const response = await service[type === 'customers' ? 'deleteCustomer' : 'deleteVendor'](id);
      
      if (response.success) {
        alert('Deleted successfully!');
        fetchParties();
      } else {
        alert(response.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete. Please try again.');
    }
  };

  // Pagination controls
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="all-parties-list">
      <div className="list-header">
        <h2 className="list-title">
          {type === 'customers' ? '👥 All Customers' : '🏢 All Vendors'}
        </h2>
        <div className="list-stats">
          Total: <strong>{pagination.total}</strong> {type}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            className="filter-input search-input"
            placeholder="🔍 Search by name, phone, email, company..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <select
            className="filter-select"
            value={filters.gstType}
            onChange={(e) => handleFilterChange('gstType', e.target.value)}
          >
            <option value="">All GST Types</option>
            <option value="unregistered">Unregistered</option>
            <option value="regular">Regular</option>
            <option value="composition">Composition</option>
          </select>
        </div>
        
        <div className="filter-group">
          <select
            className="filter-select"
            value={filters.isActive}
            onChange={(e) => handleFilterChange('isActive', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        
        <button className="reset-filters-btn" onClick={() => {
          setFilters({ search: '', gstType: '', isActive: 'true' });
          setPagination(prev => ({ ...prev, page: 1 }));
        }}>
          Reset Filters
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading {type}...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-state">
          <p className="error-message">⚠️ {error}</p>
          <button className="retry-btn" onClick={fetchParties}>Retry</button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && parties.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            {type === 'customers' ? '👥' : '🏢'}
          </div>
          <h3>No {type} found</h3>
          <p>
            {filters.search 
              ? 'Try adjusting your search filters' 
              : `Start by creating your first ${type === 'customers' ? 'customer' : 'vendor'}`
            }
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && parties.length > 0 && (
        <>
          <div className="table-wrapper">
            <table className="parties-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} className="sortable">
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Contact</th>
                  <th>Company</th>
                  <th onClick={() => handleSort('gstDetails.gstType')} className="sortable">
                    GST Type {sortBy === 'gstDetails.gstType' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Address</th>
                  <th onClick={() => handleSort('currentBalance.amount')} className="sortable">
                    Balance {sortBy === 'currentBalance.amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party._id}>
                    <td>
                      <div className="party-name">
                        <strong>{party.name}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>📱 {party.phone}</div>
                        {party.email && <div className="email-small">📧 {party.email}</div>}
                      </div>
                    </td>
                    <td>
                      {party.company || '-'}
                    </td>
                    <td>
                      <span className={`gst-badge gst-${party.gstDetails?.gstType || 'unregistered'}`}>
                        {party.gstDetails?.gstType || 'Unregistered'}
                      </span>
                    </td>
                    <td className="address-cell">
                      {party.billingAddress?.district && party.billingAddress?.state
                        ? `${party.billingAddress.district}, ${party.billingAddress.state}`
                        : '-'}
                    </td>
                    <td>
                      <span className={`balance-amount ${
                        party.currentBalance?.amount > 0 
                          ? 'positive' 
                          : party.currentBalance?.amount < 0 
                          ? 'negative' 
                          : 'zero'
                      }`}>
                        ₹{Math.abs(party.currentBalance?.amount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${party.isActive ? 'active' : 'inactive'}`}>
                        {party.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view-btn"
                          onClick={() => handleViewDetails(party)}
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(party._id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <div className="pagination-info">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
              >
                ⟪
              </button>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                ‹
              </button>
              <span className="page-indicator">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
              >
                ›
              </button>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.pages)}
                disabled={pagination.page === pagination.pages}
              >
                ⟫
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedParty && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content party-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedParty.name}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Basic Details */}
              <div className="detail-section">
                <h4>📋 Basic Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Name:</label>
                    <span>{selectedParty.name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedParty.phone}</span>
                  </div>
                  {selectedParty.alternatePhone && (
                    <div className="detail-item">
                      <label>Alternate Phone:</label>
                      <span>{selectedParty.alternatePhone}</span>
                    </div>
                  )}
                  {selectedParty.email && (
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{selectedParty.email}</span>
                    </div>
                  )}
                  {selectedParty.webLink && (
                    <div className="detail-item">
                      <label>Website:</label>
                      <span>
                        <a href={selectedParty.webLink} target="_blank" rel="noopener noreferrer">
                          {selectedParty.webLink}
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Details */}
              {selectedParty.company && (
                <div className="detail-section">
                  <h4>🏢 Company Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Company:</label>
                      <span>{selectedParty.company}</span>
                    </div>
                    <div className="detail-item">
                      <label>GST Type:</label>
                      <span className={`gst-badge gst-${selectedParty.gstDetails?.gstType}`}>
                        {selectedParty.gstDetails?.gstType || 'Unregistered'}
                      </span>
                    </div>
                    {selectedParty.gstDetails?.gstin && (
                      <div className="detail-item">
                        <label>GSTIN:</label>
                        <span>{selectedParty.gstDetails.gstin}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Billing Address */}
              {selectedParty.billingAddress && (
                <div className="detail-section">
                  <h4>📍 Billing Address</h4>
                  <div className="address-display">
                    {selectedParty.billingAddress.shopAddress && (
                      <p>{selectedParty.billingAddress.shopAddress}</p>
                    )}
                    <p>
                      {[
                        selectedParty.billingAddress.villageColony,
                        selectedParty.billingAddress.tahsilTaluka,
                        selectedParty.billingAddress.district,
                        selectedParty.billingAddress.state,
                        selectedParty.billingAddress.pincode
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {selectedParty.shippingAddress && !selectedParty.shippingAddress.sameAsBilling && (
                <div className="detail-section">
                  <h4>🚚 Shipping Address</h4>
                  <div className="address-display">
                    {selectedParty.shippingAddress.address && (
                      <p>{selectedParty.shippingAddress.address}</p>
                    )}
                    <p>
                      {[
                        selectedParty.shippingAddress.villageColony,
                        selectedParty.shippingAddress.tahsilTaluka,
                        selectedParty.shippingAddress.district,
                        selectedParty.shippingAddress.state,
                        selectedParty.shippingAddress.pincode
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Balance Information */}
              <div className="detail-section">
                <h4>💰 Balance Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Opening Balance:</label>
                    <span className={`balance-amount ${selectedParty.openingBalance?.type === 'credit' ? 'positive' : 'negative'}`}>
                      {selectedParty.openingBalance?.type === 'credit' ? '+' : '-'}₹{selectedParty.openingBalance?.amount || 0}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Current Balance:</label>
                    <span className={`balance-amount ${
                      selectedParty.currentBalance?.amount > 0 
                        ? 'positive' 
                        : selectedParty.currentBalance?.amount < 0 
                        ? 'negative' 
                        : 'zero'
                    }`}>
                      ₹{selectedParty.currentBalance?.amount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  {selectedParty.openingBalance?.minBalance > 0 && (
                    <div className="detail-item">
                      <label>Min Balance:</label>
                      <span>₹{selectedParty.openingBalance.minBalance}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics */}
              {(selectedParty.totalInvoices > 0 || selectedParty.totalPurchases > 0) && (
                <div className="detail-section">
                  <h4>📊 Statistics</h4>
                  <div className="detail-grid">
                    {selectedParty.totalInvoices !== undefined && (
                      <div className="detail-item">
                        <label>Total Invoices:</label>
                        <span>{selectedParty.totalInvoices}</span>
                      </div>
                    )}
                    {selectedParty.totalRevenue !== undefined && (
                      <div className="detail-item">
                        <label>Total Revenue:</label>
                        <span>₹{selectedParty.totalRevenue?.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedParty.totalPurchases !== undefined && (
                      <div className="detail-item">
                        <label>Total Purchases:</label>
                        <span>{selectedParty.totalPurchases}</span>
                      </div>
                    )}
                    {selectedParty.totalSpent !== undefined && (
                      <div className="detail-item">
                        <label>Total Spent:</label>
                        <span>₹{selectedParty.totalSpent?.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedParty.lastTransaction && (
                      <div className="detail-item">
                        <label>Last Transaction:</label>
                        <span>{new Date(selectedParty.lastTransaction).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedParty.notes && (
                <div className="detail-section">
                  <h4>📝 Notes</h4>
                  <p className="notes-text">{selectedParty.notes}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="detail-section timestamps">
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Created:</label>
                    <span>{new Date(selectedParty.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Last Updated:</label>
                    <span>{new Date(selectedParty.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPartiesList;