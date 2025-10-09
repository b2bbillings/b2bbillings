import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faList,
  faSearch,
  faFilter,
  faEye,
  faTrash,
  faFileInvoiceDollar,
  faReceipt,
  faCalendarAlt,
  faSortAmountUp,
  faSortAmountDown
} from '@fortawesome/free-solid-svg-icons';
import BillPreview from './BillPreview';
import './AllBillsList.css';

const AllBillsList = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedBill, setSelectedBill] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const billsPerPage = 15; // Increased for compact view

  useEffect(() => {
    loadBills();
  }, []);

  useEffect(() => {
    filterAndSortBills();
  }, [bills, searchTerm, filterType, sortBy, sortOrder]);

  const loadBills = () => {
    const savedBills = JSON.parse(localStorage.getItem('salesBills') || '[]');
    setBills(savedBills);
  };

  const filterAndSortBills = () => {
    let filtered = [...bills];

    if (searchTerm) {
      filtered = filtered.filter(bill => 
        bill.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.serialNo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(bill => bill.type === filterType);
    }

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = a.grandTotal;
          bValue = b.grandTotal;
          break;
        case 'invoice':
          aValue = a.invoiceNo.toLowerCase();
          bValue = b.invoiceNo.toLowerCase();
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredBills(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewBill = (bill) => {
    const completeBillData = {
      ...bill,
      subtotal: Number(bill.subtotal) || 0,
      totalGST: Number(bill.totalGST) || Number(bill.totalTax) || 0,
      grandTotal: Number(bill.grandTotal) || 0,
      items: (bill.items || []).map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
        gstRate: Number(item.gstRate) || 0,
        taxRate: Number(item.taxRate) || 0,
        gstAmount: Number(item.gstAmount) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        totalAmount: Number(item.totalAmount) || 0
      })),
      clientName: bill.partyName || bill.clientName || 'N/A',
      clientAddress: bill.clientAddress || 'N/A',
      clientGST: bill.clientGST || '',
      date: bill.date || new Date().toISOString().split('T')[0],
      invoiceNo: bill.invoiceNo || 'N/A',
      serialNo: bill.serialNo || 'N/A',
      type: bill.type || 'GST'
    };
    
    setSelectedBill(completeBillData);
    setShowPreview(true);
  };

  const handleDeleteBill = (billId) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      const updatedBills = bills.filter(bill => bill.invoiceNo !== billId);
      setBills(updatedBills);
      localStorage.setItem('salesBills', JSON.stringify(updatedBills));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Pagination
  const indexOfLastBill = currentPage * billsPerPage;
  const indexOfFirstBill = indexOfLastBill - billsPerPage;
  const currentBills = filteredBills.slice(indexOfFirstBill, indexOfLastBill);
  const totalPages = Math.ceil(filteredBills.length / billsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (showPreview && selectedBill) {
    return (
      <BillPreview 
        billData={selectedBill}
        onBack={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="all-bills-list">
      <div className="bills-header">
        <div className="header-content">
          <FontAwesomeIcon icon={faList} className="header-icon" />
          <div>
            <h2>Bills</h2>
            <p>Manage invoices</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-number">{bills.length}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {formatCurrency(bills.reduce((sum, bill) => sum + bill.grandTotal, 0))}
            </div>
            <div className="stat-label">Amount</div>
          </div>
        </div>
      </div>

      <div className="bills-controls">
        <div className="search-filter-section">
          <div className="search-box">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="Search by invoice or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-box">
            <FontAwesomeIcon icon={faFilter} className="filter-icon" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Bills</option>
              <option value="GST">GST Bills</option>
              <option value="NON_GST">Non-GST Bills</option>
            </select>
          </div>
        </div>

        <div className="sort-section">
          <label>Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="invoice">Invoice No</option>
          </select>
          <button
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <FontAwesomeIcon 
              icon={sortOrder === 'asc' ? faSortAmountUp : faSortAmountDown} 
            />
          </button>
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="no-bills">
          <FontAwesomeIcon icon={faFileInvoiceDollar} className="no-bills-icon" />
          <h3>No Bills Found</h3>
          <p>
            {bills.length === 0 
              ? "No bills created yet."
              : "No bills match your search."
            }
          </p>
        </div>
      ) : (
        <>
          <div className="bills-table-container">
            <table className="bills-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('date')} className="sortable">
                    <FontAwesomeIcon icon={faCalendarAlt} />
                    Date
                    {sortBy === 'date' && (
                      <FontAwesomeIcon 
                        icon={sortOrder === 'asc' ? faSortAmountUp : faSortAmountDown}
                        className="sort-indicator"
                      />
                    )}
                  </th>
                  <th onClick={() => handleSort('invoice')} className="sortable">
                    Invoice No
                    {sortBy === 'invoice' && (
                      <FontAwesomeIcon 
                        icon={sortOrder === 'asc' ? faSortAmountUp : faSortAmountDown}
                        className="sort-indicator"
                      />
                    )}
                  </th>
                  <th>Serial No</th>
                  <th>Type</th>
                  <th onClick={() => handleSort('amount')} className="sortable">
                    Amount
                    {sortBy === 'amount' && (
                      <FontAwesomeIcon 
                        icon={sortOrder === 'asc' ? faSortAmountUp : faSortAmountDown}
                        className="sort-indicator"
                      />
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentBills.map((bill) => (
                  <tr key={bill.invoiceNo}>
                    <td>{formatDate(bill.date)}</td>
                    <td>
                      <span className="invoice-number">{bill.invoiceNo}</span>
                    </td>
                    <td>{bill.serialNo}</td>
                    <td>
                      <span className={`bill-type ${bill.type.toLowerCase()}`}>
                        <FontAwesomeIcon 
                          icon={bill.type === 'GST' ? faFileInvoiceDollar : faReceipt} 
                        />
                        {bill.type === 'GST' ? 'GST' : 'Non-GST'}
                      </span>
                    </td>
                    <td className="amount">{formatCurrency(bill.grandTotal)}</td>
                    <td>
                      <button
                          className="view-btn"
                          onClick={() => handleViewBill(bill)}
                          title="View Bill"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteBill(bill.invoiceNo)}
                          title="Delete Bill"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="page-btn"
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => paginate(index + 1)}
                  className={`page-btn ${currentPage === index + 1 ? 'active' : ''}`}
                >
                  {index + 1}
                </button>
              ))}
              
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="page-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AllBillsList;