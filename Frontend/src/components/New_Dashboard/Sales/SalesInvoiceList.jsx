import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SalesInvoiceList.module.css";
import invoiceService from "../../../services/invoiceService";
import authService from "../../../services/authService";

export default function SalesInvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("General");
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Helper function to get company ID
  const getCompanyId = () => {
    let companyId = localStorage.getItem("currentCompanyId") || sessionStorage.getItem("currentCompanyId");
    if (!companyId) {
      const urlMatch = window.location.pathname.match(/\/companies\/([^\/]+)/);
      if (urlMatch && urlMatch[1]) companyId = urlMatch[1];
    }
    if (!companyId) {
      const user = authService.getCurrentUser();
      companyId = user?.companyId || user?.company?._id || user?.company;
    }
    return companyId;
  };

  // Fetch all sales invoices (both with and without GST)
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const companyId = getCompanyId();
        
        if (!companyId) {
          console.error("❌ No companyId found");
          setLoading(false);
          return;
        }

        console.log("🔍 Fetching sales invoices for companyId:", companyId);

        // Fetch ALL invoices (both with GST and without GST) in one call
        const result = await invoiceService.getInvoices("sales-with-gst", { 
          companyId, 
          type: "all", // This tells backend to return both GST and non-GST invoices
          limit: 1000 
        });

        console.log("📦 Sales invoices result:", result);

        const allInvoices = result?.data || [];

        // Map backend type to our type
        const mappedInvoices = allInvoices.map(inv => ({
          ...inv,
          type: inv.type === 'gst' ? 'WITH_GST' : 'WITHOUT_GST'
        }));

        console.log("✅ Total invoices loaded:", mappedInvoices.length);
        setInvoices(mappedInvoices);
      } catch (err) {
        console.error("❌ Error fetching invoices:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenuId && !event.target.closest('.actionsDropdown')) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₹0.00";
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handle create invoice click
  const handleCreateInvoice = (type) => {
    setShowCreateMenu(false);
    const companyId = getCompanyId();
    if (type === 'with-gst') {
      navigate(`/companies/${companyId}/sales-invoice`); // Go to NewSalesInvoice (With GST)
    } else {
      navigate(`/companies/${companyId}/salesWithoutGST`); // Go to SalesWithoutGST form
    }
  };

  // Handle edit invoice
  const handleEdit = (invoice) => {
    console.log("✏️ Edit invoice:", invoice);
    const companyId = getCompanyId();
    // Navigate to edit page based on type
    if (invoice.type === 'WITH_GST') {
      navigate(`/companies/${companyId}/sales-invoice?id=${invoice._id}`);
    } else {
      navigate(`/companies/${companyId}/salesWithoutGST?id=${invoice._id}`);
    }
  };

  // Toggle actions menu
  const toggleMenu = (invoiceId) => {
    setActiveMenuId(activeMenuId === invoiceId ? null : invoiceId);
  };

  // Handle print invoice
  const handlePrint = (invoice) => {
    setActiveMenuId(null);
    // Open print window with invoice details
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(generateInvoicePDF(invoice));
    printWindow.document.close();
    printWindow.print();
  };

  // Handle view invoice
  const handleView = (invoice) => {
    setActiveMenuId(null);
    console.log("👁️ View invoice:", invoice);
    // You can navigate to a detail view page or open a modal
  };

  // Handle download invoice
  const handleDownload = (invoice, format = 'pdf') => {
    setActiveMenuId(null);
    console.log(`📥 Download invoice as ${format}:`, invoice);
    // Generate and download invoice
    const content = generateInvoicePDF(invoice);
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoice.invoiceNumber}.html`;
    a.click();
  };

  // Handle delete invoice
  const handleDelete = (invoice) => {
    setActiveMenuId(null);
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      console.log("🗑️ Delete invoice:", invoice);
      // Call delete API
    }
  };

  // Generate invoice PDF HTML
  const generateInvoicePDF = (invoice) => {
    const companyId = getCompanyId();
    const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tax Invoice - ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #000; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .company-info { margin-bottom: 20px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .buyer-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
          .totals { text-align: right; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>Tax Invoice</h1>
          </div>
          
          <div class="company-info">
            <h2>${company.name || 'My Company'}</h2>
            <p>${company.address || 'Company Address'}</p>
            <p>${company.city || ''}, ${company.state || 'MAHARASHTRA'}</p>
            <p>Email: ${company.email || 'company@example.com'}</p>
            <p>Phone: ${company.phone || '+91 1234567890'}</p>
            <p>GSTIN: ${company.gstin || 'GSTIN NUMBER'}</p>
          </div>

          <div class="invoice-details">
            <div>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
              <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p><strong>Type:</strong> ${invoice.type === 'WITH_GST' ? 'GST Invoice' : 'Invoice (No GST)'}</p>
              <p><strong>Status:</strong> ${invoice.status || 'Draft'}</p>
            </div>
          </div>

          <div class="buyer-info">
            <h3>Buyer (Bill to):</h3>
            <p><strong>${invoice.customer?.name || 'Cash Sales'}</strong></p>
            <p>${invoice.customer?.address || ''}</p>
            <p>${invoice.customer?.city || ''}, ${invoice.customer?.state || 'MAHARASHTRA'}</p>
            <p>Country: ${invoice.customer?.country || 'India'}</p>
            ${invoice.customer?.gstin ? `<p>GSTIN: ${invoice.customer.gstin}</p>` : ''}
            ${invoice.customer?.phone ? `<p>Phone: ${invoice.customer.phone}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Product/Service</th>
                <th>Qty</th>
                <th>Rate</th>
                ${invoice.type === 'WITH_GST' ? '<th>Discount</th><th>Taxable Amt</th><th>GST(%)</th>' : '<th>Discount</th>'}
                <th>Total(₹)</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name || item.itemName || '-'}</td>
                  <td>${item.quantity || 0}</td>
                  <td>₹${(item.rate || 0).toFixed(2)}</td>
                  ${invoice.type === 'WITH_GST' ? `
                    <td>₹${(item.discount || 0).toFixed(2)}</td>
                    <td>₹${(item.taxableAmount || 0).toFixed(2)}</td>
                    <td>${item.gstRate || 0}%</td>
                  ` : `
                    <td>₹${(item.discount || 0).toFixed(2)}</td>
                  `}
                  <td>₹${(item.total || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <p><strong>Item Total:</strong> ₹${(invoice.totals?.itemTotal || 0).toFixed(2)}</p>
            ${invoice.type === 'WITH_GST' ? `
              <p><strong>Taxable Amount(₹):</strong> ₹${(invoice.totals?.subTotal || 0).toFixed(2)}</p>
              <p><strong>CGST:</strong> ₹${(invoice.totals?.cgst || 0).toFixed(2)}</p>
              <p><strong>SGST:</strong> ₹${(invoice.totals?.sgst || 0).toFixed(2)}</p>
              <p><strong>IGST:</strong> ₹${(invoice.totals?.igst || 0).toFixed(2)}</p>
            ` : ''}
            <p><strong>Round Off:</strong> ₹${(invoice.totals?.roundOff || 0).toFixed(2)}</p>
            <h3><strong>Total Amount(₹):</strong> ₹${(invoice.totals?.finalTotal || 0).toFixed(2)}</h3>
            <p><strong>Outstanding Amount(₹):</strong> ₹${(invoice.totals?.finalTotal || 0).toFixed(2)}</p>
          </div>

          <div class="footer">
            <p>For, ${company.name || 'My Company'}</p>
            <br><br>
            <p>_____________________</p>
            <p>Signature</p>
            <br>
            <p style="font-size: 10px;">This is a computer generated invoice</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sales Invoice</h1>
        </div>
        <div className={styles.loading}>Loading invoices...</div>
      </div>
    );
  }

  // Empty state
  if (invoices.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sales Invoice</h1>
        </div>

        <div className={styles.tabs}>
          <button 
            className={activeTab === "General" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("General")}
          >
            General
          </button>
          <button 
            className={activeTab === "Opening" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("Opening")}
          >
            Opening
          </button>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
              <circle cx="90" cy="140" r="40" fill="#2563eb" opacity="0.1"/>
              <rect x="50" y="30" width="80" height="100" rx="4" fill="#e5e7eb"/>
              <rect x="50" y="30" width="80" height="8" rx="4" fill="#2563eb"/>
              <rect x="60" y="50" width="20" height="4" rx="2" fill="#d1d5db"/>
              <rect x="60" y="60" width="30" height="4" rx="2" fill="#d1d5db"/>
              <rect x="60" y="70" width="25" height="4" rx="2" fill="#d1d5db"/>
              <rect x="100" y="50" width="20" height="4" rx="2" fill="#d1d5db"/>
              <rect x="100" y="60" width="15" height="4" rx="2" fill="#d1d5db"/>
              <rect x="100" y="70" width="20" height="4" rx="2" fill="#d1d5db"/>
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>Record your sales!</h2>
          <p className={styles.emptyDescription}>
            Quick and easy sales, sending detailed invoices and getting paid easier than ever. Go ahead quickly!
          </p>
          <div className={styles.emptyActions}>
            <button className={styles.createBtn} onClick={() => setShowCreateMenu(true)}>
              <span>+</span> Create Invoice
            </button>
            <button className={styles.importBtn}>
              <span>📥</span> Import
            </button>
          </div>

          {showCreateMenu && (
            <div className={styles.createMenu}>
              <div className={styles.menuItem} onClick={() => handleCreateInvoice('with-gst')}>
                Sales Invoice (With GST)
              </div>
              <div className={styles.menuItem} onClick={() => handleCreateInvoice('without-gst')}>
                Sales Invoice (Without GST)
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Table view with data
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sales Invoice</h1>
        <div className={styles.headerActions}>
          <button className={styles.exportBtn}>📤 Export</button>
          <button className={styles.importBtn}>📥 Import</button>
          <button className={styles.printBtn}>🖨️ Print</button>
          <div className={styles.dropdown}>
            <button className={styles.reportBtn}>More Report ▾</button>
          </div>
          <button className={styles.createBtn} onClick={() => setShowCreateMenu(true)}>
            <span>+</span> Create Invoice
          </button>
        </div>
      </div>

      {showCreateMenu && (
        <div className={styles.createMenuOverlay} onClick={() => setShowCreateMenu(false)}>
          <div className={styles.createMenuDropdown} onClick={(e) => e.stopPropagation()}>
            <div className={styles.menuItem} onClick={() => handleCreateInvoice('with-gst')}>
              Sales Invoice (With GST)
            </div>
            <div className={styles.menuItem} onClick={() => handleCreateInvoice('without-gst')}>
              Sales Invoice (Without GST)
            </div>
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        <button 
          className={activeTab === "General" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("General")}
        >
          General
        </button>
        <button 
          className={activeTab === "Opening" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("Opening")}
        >
          Opening
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Invoice Date</th>
              <th>Invoice No.</th>
              <th>Customer</th>
              <th>Due Date</th>
              <th>Taxable Amt. (₹)</th>
              <th>Total Amount(₹)</th>
              <th>Status</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice._id}>
                <td>{formatDate(invoice.invoiceDate)}</td>
                <td className={styles.invoiceNo}>{invoice.invoiceNumber}</td>
                <td>{invoice.customer?.name || "-"}</td>
                <td>{formatDate(invoice.dueDate)}</td>
                <td>{formatCurrency(invoice.totals?.subTotal)}</td>
                <td>{formatCurrency(invoice.totals?.finalTotal)}</td>
                <td>
                  <span className={`${styles.status} ${styles[invoice.status?.toLowerCase()]}`}>
                    {invoice.status || "Draft"}
                  </span>
                </td>
                <td>
                  <span className={styles.typeTag}>
                    {invoice.type === 'WITH_GST' ? 'GST' : 'No GST'}
                  </span>
                </td>
                <td className={styles.actionsCell}>
                  <button className={styles.editBtn} onClick={() => handleEdit(invoice)}>
                    Edit
                  </button>
                  <div className={styles.actionsDropdown}>
                    <button 
                      className={styles.moreBtn} 
                      onClick={() => toggleMenu(invoice._id)}
                    >
                      ⋮
                    </button>
                    {activeMenuId === invoice._id && (
                      <div className={styles.dropdownMenu}>
                        <button onClick={() => handleView(invoice)}>
                          <span>👁️</span> View
                        </button>
                        <button onClick={() => handlePrint(invoice)}>
                          <span>🖨️</span> Print Invoice
                        </button>
                        <button onClick={() => handleDownload(invoice, 'proforma')}>
                          <span>📄</span> Download Proforma
                        </button>
                        <button onClick={() => handleDownload(invoice, 'pdf')}>
                          <span>📥</span> Download Invoice
                        </button>
                        <button onClick={() => handleDelete(invoice)} className={styles.deleteBtn}>
                          <span>🗑️</span> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <span>1 - {invoices.length} of {invoices.length} Records</span>
      </div>

      <div className={styles.shortcuts}>
        <span>SHORTCUTS:</span>
        <kbd>ALT</kbd> + <kbd>N</kbd> Create Sales Invoice
      </div>
    </div>
  );
}
