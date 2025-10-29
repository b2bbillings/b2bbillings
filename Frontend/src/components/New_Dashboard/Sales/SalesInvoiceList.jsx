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
  const [filterType, setFilterType] = useState("all"); // all, gst, no-gst
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

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

        // Fetch ALL invoices (both with GST and without GST) from the unified endpoint
        const response = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/sales-invoices?companyId=${companyId}&type=all&limit=1000`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("📦 Sales invoices API response:", result);

        const allInvoices = result?.data || [];

        // Map backend type to our type
        const mappedInvoices = allInvoices.map(inv => ({
          ...inv,
          type: inv.type === 'gst' ? 'WITH_GST' : inv.type === 'no-gst' ? 'WITHOUT_GST' : 'WITHOUT_GST'
        }));

        console.log("✅ Total sales invoices loaded:", mappedInvoices.length);
        console.log("📊 Invoice breakdown:", {
          withGST: mappedInvoices.filter(i => i.type === 'WITH_GST').length,
          withoutGST: mappedInvoices.filter(i => i.type === 'WITHOUT_GST').length
        });
        
        setInvoices(mappedInvoices);
      } catch (err) {
        console.error("❌ Error fetching sales invoices:", err);
        alert(`Failed to load invoices: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenuId) {
        // Check if click is outside the dropdown menu
        const dropdownMenu = event.target.closest('[data-dropdown-menu]');
        const moreButton = event.target.closest('[data-more-btn]');
        
        if (!dropdownMenu && !moreButton) {
          setActiveMenuId(null);
        }
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
  const toggleMenu = (invoiceId, event) => {
    if (activeMenuId === invoiceId) {
      setActiveMenuId(null);
    } else {
      setActiveMenuId(invoiceId);
      // Calculate position for fixed dropdown
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: buttonRect.bottom + 4,
        left: buttonRect.left - 150 // Offset to align right side
      });
    }
  };

  // Handle print invoice
  const handlePrint = (invoice) => {
    setActiveMenuId(null);
    // Generate PDF and open print dialog
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    const content = generateInvoicePDF(invoice);
    printWindow.document.write(content);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = function() {
      printWindow.focus();
      printWindow.print();
    };
  };

  // Handle view invoice
  const handleView = (invoice) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    const content = generateInvoicePDF(invoice);
    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Handle download invoice as PDF
  const handleDownload = async (invoice, format = 'pdf') => {
    setActiveMenuId(null);
    
    if (format === 'proforma') {
      // Download as Proforma Invoice (HTML)
      const content = generateProformaInvoice(invoice);
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proforma_Invoice_${invoice.invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Download as regular invoice (HTML that can be printed to PDF)
      const content = generateInvoicePDF(invoice);
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sales_Invoice_${invoice.invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Handle delete invoice
  const handleDelete = async (invoice) => {
    setActiveMenuId(null);
    if (!window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const companyId = getCompanyId();
      const endpoint = invoice.type === 'WITH_GST' 
        ? `${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/sales-invoices/${invoice._id}?companyId=${companyId}`
        : `${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/sales-invoices/${invoice._id}?companyId=${companyId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete invoice: ${response.status}`);
      }

      // Remove invoice from state
      setInvoices(prev => prev.filter(inv => inv._id !== invoice._id));
      alert(`Invoice ${invoice.invoiceNumber} deleted successfully`);
    } catch (error) {
      console.error('❌ Error deleting invoice:', error);
      alert(`Failed to delete invoice: ${error.message}`);
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
        <meta charset="UTF-8">
        <title>Tax Invoice - ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            background: white;
          }
          .invoice-container { 
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 15px;
          }
          .header { 
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .header h1 { 
            font-size: 20px;
            margin-bottom: 5px;
          }
          .company-section {
            background: #f9fafb;
            padding: 12px;
            margin-bottom: 15px;
            border-left: 3px solid #2563eb;
          }
          .company-section h2 {
            font-size: 16px;
            color: #2563eb;
            margin-bottom: 8px;
          }
          .company-section p {
            font-size: 12px;
            margin: 3px 0;
            color: #374151;
          }
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding: 10px;
            background: #f3f4f6;
            border-radius: 4px;
          }
          .invoice-meta > div {
            flex: 1;
          }
          .invoice-meta p {
            font-size: 11px;
            margin: 4px 0;
          }
          .invoice-meta strong {
            font-size: 12px;
            color: #1f2937;
          }
          .buyer-section {
            background: #eff6ff;
            padding: 12px;
            margin-bottom: 15px;
            border-left: 3px solid #3b82f6;
          }
          .buyer-section h3 {
            font-size: 13px;
            color: #1e40af;
            margin-bottom: 6px;
          }
          .buyer-section p {
            font-size: 11px;
            margin: 3px 0;
            color: #374151;
          }
          table { 
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 11px;
          }
          th {
            background: #2563eb;
            color: white;
            padding: 8px 6px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
          }
          td {
            border: 1px solid #d1d5db;
            padding: 6px;
            color: #374151;
          }
          tbody tr:nth-child(even) {
            background: #f9fafb;
          }
          .totals-section {
            margin-left: auto;
            width: 350px;
            background: #f0f9ff;
            padding: 12px;
            border: 2px solid #2563eb;
            border-radius: 4px;
          }
          .totals-section p {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 11px;
            border-bottom: 1px solid #bfdbfe;
          }
          .totals-section p:last-child {
            border-bottom: none;
          }
          .totals-section .grand-total {
            border-top: 2px solid #2563eb;
            margin-top: 8px;
            padding-top: 8px;
            font-size: 14px;
            font-weight: bold;
            color: #2563eb;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
          }
          .footer p {
            font-size: 10px;
            margin: 5px 0;
          }
          .signature-line {
            margin-top: 40px;
            border-top: 1px solid #000;
            width: 200px;
            margin-left: auto;
            margin-right: 40px;
            padding-top: 5px;
            text-align: center;
            font-size: 11px;
          }
          @media print {
            body { padding: 0; }
            .invoice-container { padding: 10mm; }
            @page { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>Tax Invoice</h1>
          </div>
          
          <div class="company-section">
            <h2>${company.name || 'My Company'}</h2>
            <p>${company.address || 'Company Address'}</p>
            <p>${company.city || ''}, ${company.state || 'MAHARASHTRA'}</p>
            <p>Email: ${company.email || 'company@example.com'}</p>
            <p>Phone: ${company.phone || '+91 1234567890'}</p>
            ${company.gstin ? `<p>GSTIN: ${company.gstin}</p>` : ''}
          </div>

          <div class="invoice-meta">
            <div>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
              <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Type:</strong> ${invoice.type === 'WITH_GST' ? 'GST Invoice' : 'Invoice (No GST)'}</p>
              <p><strong>Status:</strong> ${invoice.status || 'Draft'}</p>
            </div>
          </div>

          <div class="buyer-section">
            <h3>Buyer (Bill to):</h3>
            <p><strong>${invoice.customer?.name || 'Cash Sales'}</strong></p>
            ${invoice.customer?.address ? `<p>${invoice.customer.address}</p>` : ''}
            <p>${invoice.customer?.state || 'MAHARASHTRA'}</p>
            <p>Country: ${invoice.customer?.country || 'India'}</p>
            ${invoice.customer?.gstin ? `<p>GSTIN: ${invoice.customer.gstin}</p>` : ''}
            ${invoice.customer?.phone ? `<p>Phone: ${invoice.customer.phone}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">Sr. No.</th>
                <th>Product/Service</th>
                <th style="width: 60px;">Qty</th>
                <th style="width: 80px;">Rate</th>
                ${invoice.type === 'WITH_GST' ? `
                  <th style="width: 70px;">Discount</th>
                  <th style="width: 90px;">Taxable Amt</th>
                  <th style="width: 60px;">GST(%)</th>
                ` : '<th style="width: 70px;">Discount</th>'}
                <th style="width: 90px;">Total(₹)</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map((item, index) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${item.name || item.itemName || '-'}</td>
                  <td style="text-align: center;">${item.quantity || 0}</td>
                  <td style="text-align: right;">₹${(item.rate || 0).toFixed(2)}</td>
                  ${invoice.type === 'WITH_GST' ? `
                    <td style="text-align: right;">₹${(item.discount || 0).toFixed(2)}</td>
                    <td style="text-align: right;">₹${(item.taxableAmount || 0).toFixed(2)}</td>
                    <td style="text-align: center;">${item.gstRate || 0}%</td>
                  ` : `
                    <td style="text-align: right;">₹${(item.discount || 0).toFixed(2)}</td>
                  `}
                  <td style="text-align: right;">₹${(item.total || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <p><span>Item Total:</span><strong>₹${(invoice.totals?.itemTotal || 0).toFixed(2)}</strong></p>
            ${invoice.type === 'WITH_GST' ? `
              <p><span>Taxable Amount(₹):</span><strong>₹${(invoice.totals?.subTotal || 0).toFixed(2)}</strong></p>
              <p><span>CGST:</span><strong>₹${(invoice.totals?.cgst || 0).toFixed(2)}</strong></p>
              <p><span>SGST:</span><strong>₹${(invoice.totals?.sgst || 0).toFixed(2)}</strong></p>
              <p><span>IGST:</span><strong>₹${(invoice.totals?.igst || 0).toFixed(2)}</strong></p>
            ` : ''}
            <p><span>Round Off:</span><strong>₹${(invoice.totals?.roundOff || 0).toFixed(2)}</strong></p>
            <p class="grand-total"><span>Total Amount(₹):</span><strong>₹${(invoice.totals?.finalTotal || 0).toFixed(2)}</strong></p>
            <p><span>Outstanding Amount(₹):</span><strong>₹${(invoice.totals?.finalTotal || 0).toFixed(2)}</strong></p>
          </div>

          <div class="signature-line">
            <p>For, ${company.name || 'My Company'}</p>
            <br><br>
            <p>Signature</p>
          </div>

          <div class="footer">
            <p style="font-size: 9px; color: #6b7280;">This is a computer generated invoice</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Proforma Invoice HTML
  const generateProformaInvoice = (invoice) => {
    const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Proforma Invoice - ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            background: white;
          }
          .invoice-container { 
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 15px;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(37, 99, 235, 0.1);
            font-weight: bold;
            z-index: -1;
            pointer-events: none;
          }
          .header { 
            text-align: center;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .header h1 { 
            font-size: 22px;
            margin-bottom: 5px;
            color: #dc2626;
          }
          .header p {
            font-size: 12px;
            color: #991b1b;
            font-weight: bold;
          }
          .company-section {
            background: #fef2f2;
            padding: 12px;
            margin-bottom: 15px;
            border-left: 3px solid #dc2626;
          }
          .company-section h2 {
            font-size: 16px;
            color: #dc2626;
            margin-bottom: 8px;
          }
          .company-section p {
            font-size: 12px;
            margin: 3px 0;
            color: #374151;
          }
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding: 10px;
            background: #fef3c7;
            border-radius: 4px;
          }
          .invoice-meta > div {
            flex: 1;
          }
          .invoice-meta p {
            font-size: 11px;
            margin: 4px 0;
          }
          .invoice-meta strong {
            font-size: 12px;
            color: #1f2937;
          }
          .buyer-section {
            background: #eff6ff;
            padding: 12px;
            margin-bottom: 15px;
            border-left: 3px solid #3b82f6;
          }
          .buyer-section h3 {
            font-size: 13px;
            color: #1e40af;
            margin-bottom: 6px;
          }
          .buyer-section p {
            font-size: 11px;
            margin: 3px 0;
            color: #374151;
          }
          table { 
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 11px;
          }
          th {
            background: #dc2626;
            color: white;
            padding: 8px 6px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
          }
          td {
            border: 1px solid #d1d5db;
            padding: 6px;
            color: #374151;
          }
          tbody tr:nth-child(even) {
            background: #fef2f2;
          }
          .totals-section {
            margin-left: auto;
            width: 350px;
            background: #fef2f2;
            padding: 12px;
            border: 2px solid #dc2626;
            border-radius: 4px;
          }
          .totals-section p {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 11px;
            border-bottom: 1px solid #fecaca;
          }
          .totals-section p:last-child {
            border-bottom: none;
          }
          .totals-section .grand-total {
            border-top: 2px solid #dc2626;
            margin-top: 8px;
            padding-top: 8px;
            font-size: 14px;
            font-weight: bold;
            color: #dc2626;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            background: #fef3c7;
            padding: 10px;
            border-radius: 4px;
          }
          .footer p {
            font-size: 10px;
            margin: 5px 0;
            color: #92400e;
          }
          .footer strong {
            color: #991b1b;
          }
          .signature-line {
            margin-top: 40px;
            border-top: 1px solid #000;
            width: 200px;
            margin-left: auto;
            margin-right: 40px;
            padding-top: 5px;
            text-align: center;
            font-size: 11px;
          }
          @media print {
            body { padding: 0; }
            .invoice-container { padding: 10mm; }
            @page { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="watermark">PROFORMA</div>
        <div class="invoice-container">
          <div class="header">
            <h1>Proforma Invoice</h1>
            <p>(This is not a tax invoice)</p>
          </div>
          
          <div class="company-section">
            <h2>${company.name || 'My Company'}</h2>
            <p>${company.address || 'Company Address'}</p>
            <p>${company.city || ''}, ${company.state || 'MAHARASHTRA'}</p>
            <p>Email: ${company.email || 'company@example.com'}</p>
            <p>Phone: ${company.phone || '+91 1234567890'}</p>
            ${company.gstin ? `<p>GSTIN: ${company.gstin}</p>` : ''}
          </div>

          <div class="invoice-meta">
            <div>
              <p><strong>Proforma Invoice Number:</strong> PRO-${invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
              <p><strong>Valid Until:</strong> ${formatDate(invoice.dueDate)}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Type:</strong> ${invoice.type === 'WITH_GST' ? 'GST Invoice' : 'Invoice (No GST)'}</p>
              <p><strong>Status:</strong> Quotation</p>
            </div>
          </div>

          <div class="buyer-section">
            <h3>Buyer Details:</h3>
            <p><strong>${invoice.customer?.name || 'Customer'}</strong></p>
            ${invoice.customer?.address ? `<p>${invoice.customer.address}</p>` : ''}
            <p>${invoice.customer?.state || 'MAHARASHTRA'}</p>
            <p>Country: ${invoice.customer?.country || 'India'}</p>
            ${invoice.customer?.gstin ? `<p>GSTIN: ${invoice.customer.gstin}</p>` : ''}
            ${invoice.customer?.phone ? `<p>Phone: ${invoice.customer.phone}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">Sr. No.</th>
                <th>Product/Service</th>
                <th style="width: 60px;">Qty</th>
                <th style="width: 80px;">Rate</th>
                ${invoice.type === 'WITH_GST' ? `
                  <th style="width: 70px;">Discount</th>
                  <th style="width: 90px;">Taxable Amt</th>
                  <th style="width: 60px;">GST(%)</th>
                ` : '<th style="width: 70px;">Discount</th>'}
                <th style="width: 90px;">Total(₹)</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map((item, index) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${item.name || item.itemName || '-'}</td>
                  <td style="text-align: center;">${item.quantity || 0}</td>
                  <td style="text-align: right;">₹${(item.rate || 0).toFixed(2)}</td>
                  ${invoice.type === 'WITH_GST' ? `
                    <td style="text-align: right;">₹${(item.discount || 0).toFixed(2)}</td>
                    <td style="text-align: right;">₹${(item.taxableAmount || 0).toFixed(2)}</td>
                    <td style="text-align: center;">${item.gstRate || 0}%</td>
                  ` : `
                    <td style="text-align: right;">₹${(item.discount || 0).toFixed(2)}</td>
                  `}
                  <td style="text-align: right;">₹${(item.total || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <p><span>Item Total:</span><strong>₹${(invoice.totals?.itemTotal || 0).toFixed(2)}</strong></p>
            ${invoice.type === 'WITH_GST' ? `
              <p><span>Taxable Amount(₹):</span><strong>₹${(invoice.totals?.subTotal || 0).toFixed(2)}</strong></p>
              <p><span>CGST:</span><strong>₹${(invoice.totals?.cgst || 0).toFixed(2)}</strong></p>
              <p><span>SGST:</span><strong>₹${(invoice.totals?.sgst || 0).toFixed(2)}</strong></p>
              <p><span>IGST:</span><strong>₹${(invoice.totals?.igst || 0).toFixed(2)}</strong></p>
            ` : ''}
            <p><span>Round Off:</span><strong>₹${(invoice.totals?.roundOff || 0).toFixed(2)}</strong></p>
            <p class="grand-total"><span>Estimated Total(₹):</span><strong>₹${(invoice.totals?.finalTotal || 0).toFixed(2)}</strong></p>
          </div>

          <div class="signature-line">
            <p>For, ${company.name || 'My Company'}</p>
            <br><br>
            <p>Signature</p>
          </div>

          <div class="footer">
            <p><strong>Important Notice:</strong></p>
            <p>This is a Proforma Invoice for quotation purposes only.</p>
            <p>This document does not constitute a valid tax invoice.</p>
            <p>Final invoice will be issued upon confirmation of order.</p>
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
  // Filter invoices based on selected type
  const filteredInvoices = invoices.filter(invoice => {
    if (filterType === "all") return true;
    if (filterType === "gst") return invoice.type === "WITH_GST";
    if (filterType === "no-gst") return invoice.type === "WITHOUT_GST";
    return true;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sales Invoice</h1>
        <div className={styles.headerActions}>
          <div className={styles.filterDropdown}>
            <select 
              className={styles.filterSelect}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Invoices</option>
              <option value="gst">With GST</option>
              <option value="no-gst">Without GST</option>
            </select>
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
            {filteredInvoices.map((invoice) => (
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
                      data-more-btn
                      onClick={(e) => toggleMenu(invoice._id, e)}
                    >
                      ⋮
                    </button>
                    {activeMenuId === invoice._id && (
                      <div 
                        className={styles.dropdownMenu}
                        data-dropdown-menu
                        style={{
                          top: `${menuPosition.top}px`,
                          left: `${menuPosition.left}px`
                        }}
                      >
                        <button onClick={(e) => { e.stopPropagation(); handleView(invoice); }}>
                          <span>👁️</span> View
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handlePrint(invoice); }}>
                          <span>🖨️</span> Print Invoice
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(invoice, 'proforma'); }}>
                          <span>📄</span> Download Proforma
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(invoice, 'pdf'); }}>
                          <span>📥</span> Download Invoice
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(invoice); }} className={styles.deleteBtn}>
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