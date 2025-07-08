import React, {forwardRef, useState} from "react";

const SalesInvoice = forwardRef(
  ({invoiceData, onPrint, template: propTemplate}, ref) => {
    const data = invoiceData || {};
    const company = data.company || {};
    const customer = data.customer || {};
    const invoice = data.invoice || {};
    const items = data.items || [];
    const totals = data.totals || {};
    const payment = data.payment || {};

    // ✅ NEW: State for document copy type
    const [copyType, setCopyType] = useState(propTemplate || "standard");

    // ✅ UPDATED: Dynamic document copy based on selection
    const getDocumentCopy = () => {
      switch (copyType) {
        case "customer":
          return "CUSTOMER COPY";
        case "transporter":
          return "TRANSPORTER COPY";
        default:
          return "ORIGINAL FOR RECIPIENT";
      }
    };

    // ✅ NEW: Copy type options
    const copyTypeOptions = [
      {value: "standard", label: "Standard"},
      {value: "customer", label: "Customer"},
      {value: "transporter", label: "Transporter"},
    ];

    // ✅ NEW: Update copyType when propTemplate changes
    React.useEffect(() => {
      if (propTemplate) {
        setCopyType(propTemplate);
      }
    }, [propTemplate]);

    // Calculate totals from real data
    const calculateTotals = () => {
      const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const deliveryCharges = totals.deliveryCharges || 0;
      const taxableAmount = totals.subtotal || subtotal;
      const totalTax = totals.totalTax || 0;
      const totalDiscount = totals.totalDiscount || 0;
      const roundOff = totals.roundOff || 0;
      const finalAmount =
        totals.finalTotal ||
        taxableAmount + deliveryCharges + totalTax + roundOff - totalDiscount;

      return {
        subtotal,
        taxableAmount,
        deliveryCharges,
        totalTax,
        totalDiscount,
        roundOff,
        finalAmount,
      };
    };

    const calculatedTotals = calculateTotals();

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount || 0);
    };

    // Format dates
    const formatDate = (dateString) => {
      if (!dateString) return "N/A";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch (error) {
        return "N/A";
      }
    };

    // Convert amount to words (simplified)
    const convertToWords = (amount) => {
      const num = Math.floor(amount);
      if (num === 0) return "Zero Rupees Only";

      const crores = Math.floor(num / 10000000);
      const lakhs = Math.floor((num % 10000000) / 100000);
      const thousands = Math.floor((num % 100000) / 1000);
      const hundreds = Math.floor((num % 1000) / 100);
      const remaining = num % 100;

      let words = "INR ";
      if (crores > 0) words += `${crores} Crore `;
      if (lakhs > 0) words += `${lakhs} Lakh `;
      if (thousands > 0) words += `${thousands} Thousand `;
      if (hundreds > 0) words += `${hundreds} Hundred `;
      if (remaining > 0) words += `${remaining} `;
      words += "Rupees Only";

      return words;
    };

    // Safe logo component
    const LogoComponent = ({logo, companyName}) => {
      const [imageError, setImageError] = useState(false);

      if (!logo || imageError) {
        return (
          <div className="company-logo-placeholder">
            <span className="logo-text">
              {companyName ? companyName.substring(0, 2).toUpperCase() : "SA"}
            </span>
          </div>
        );
      }

      return (
        <img
          src={
            logo.startsWith("data:") ? logo : `data:image/png;base64,${logo}`
          }
          alt="Company Logo"
          className="company-logo-img"
          onError={() => setImageError(true)}
        />
      );
    };

    if (!invoiceData) {
      return (
        <div className="invoice-container" ref={ref}>
          <div className="loading-state">
            <p>Loading sales invoice data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="invoice-container" ref={ref}>
        {/* ✅ NEW: Template Selection Control */}
        <div
          className="template-control no-print"
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              justifyContent: "center",
            }}
          >
            <label
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#333",
                minWidth: "80px",
              }}
            >
              Template:
            </label>
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value)}
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                border: "1px solid #ced4da",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#333",
                minWidth: "150px",
                cursor: "pointer",
              }}
            >
              {copyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div
              style={{
                fontSize: "12px",
                color: "#6c757d",
                fontStyle: "italic",
              }}
            >
              Current: {getDocumentCopy()}
            </div>
          </div>
        </div>

        <div className="sales-invoice">
          <style>{`
          .invoice-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 15px;
            background-color: #f0f0f0;
            font-family: Arial, sans-serif;
          }

          .template-control {
            width: 100%;
            max-width: 800px;
          }

          .sales-invoice {
            width: 210mm;
            max-width: 800px;
            background: white;
            color: #333;
            line-height: 1.3;
            border: 2px solid #000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            padding: 12px;
            margin: 0 auto;
            position: relative;
            max-height: 280mm;
            overflow: hidden;
          }

          .invoice-header {
            text-align: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
            position: relative;
          }

          .invoice-title {
            position: relative;
            margin-bottom: 5px;
          }

          .invoice-title h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            letter-spacing: 3px;
            color: #000;
          }

          .document-copy {
            position: absolute;
            right: 0;
            top: 0;
            font-size: 9px;
            font-weight: bold;
            border: 1px solid #000;
            padding: 3px 6px;
            background: white;
            color: #000;
          }

          .document-copy.customer-copy {
            background: #e7f3ff;
            border-color: #0d6efd;
            color: #0d6efd;
          }

          .document-copy.transporter-copy {
            background: #fff3e0;
            border-color: #ff9800;
            color: #ff9800;
          }

          .document-copy.warehouse-copy {
            background: #f3e5f5;
            border-color: #9c27b0;
            color: #9c27b0;
          }

          .document-copy.accounts-copy {
            background: #e8f5e8;
            border-color: #4caf50;
            color: #4caf50;
          }

          .document-copy.minimal-copy {
            background: #f5f5f5;
            border-color: #757575;
            color: #757575;
          }

          .company-section {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            padding: 10px;
            border: 1px solid #ddd;
            min-height: 85px;
          }

          .company-logo {
            width: 70px;
            height: 70px;
            margin-right: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #ddd;
            flex-shrink: 0;
          }

          .company-logo-img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }

          .company-logo-placeholder {
            width: 100%;
            height: 100%;
            background: #f8f8f8;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
            color: #666;
          }

          .company-details {
            flex: 1;
            text-align: center;
          }

          .company-details h2 {
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 4px 0;
            color: #000;
          }

          .company-details p {
            margin: 2px 0;
            font-size: 11px;
            color: #333;
          }

          .details-section {
            display: flex;
            margin-bottom: 12px;
            border: 1px solid #ddd;
            min-height: 100px;
          }

          .customer-details {
            flex: 1;
            padding: 10px;
            border-right: 1px solid #ddd;
          }

          .invoice-details {
            flex: 1;
            padding: 10px;
          }

          .customer-details h3 {
            font-size: 12px;
            margin: 0 0 6px 0;
            font-weight: bold;
            color: #000;
          }

          .customer-details p {
            margin: 3px 0;
            font-size: 10px;
            color: #333;
          }

          .invoice-field {
            display: flex;
            margin-bottom: 4px;
            font-size: 10px;
          }

          .invoice-field .label {
            font-weight: bold;
            width: 90px;
            color: #000;
          }

          .invoice-field .value {
            flex: 1;
            color: #333;
          }

          .items-section {
            margin-bottom: 12px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
          }

          .items-table th,
          .items-table td {
            border: 1px solid #ddd;
            padding: 8px 6px;
            text-align: left;
            font-size: 10px;
          }

          .items-table th {
            background-color: #f8f8f8;
            font-weight: bold;
            text-align: center;
            padding: 10px 6px;
            color: #000;
          }

          .col-sno {
            width: 5%;
            text-align: center;
          }

          .col-item {
            width: 35%;
          }

          .col-hsn {
            width: 12%;
            text-align: center;
          }

          .col-tax {
            width: 10%;
            text-align: center;
          }

          .col-qty {
            width: 12%;
            text-align: center;
          }

          .col-rate {
            width: 13%;
            text-align: right;
          }

          .col-amount {
            width: 13%;
            text-align: right;
          }

          .totals-section {
            margin-bottom: 12px;
            border: 1px solid #ddd;
          }

          .totals-row {
            display: flex;
            border-bottom: 1px solid #eee;
          }

          .totals-row:last-child {
            border-bottom: none;
          }

          .totals-label {
            flex: 1;
            padding: 8px 10px;
            font-size: 10px;
            border-right: 1px solid #eee;
            color: #333;
          }

          .totals-value {
            width: 120px;
            padding: 8px 10px;
            text-align: right;
            font-size: 10px;
            color: #333;
          }

          .totals-final {
            background-color: #f8f8f8;
            font-weight: bold;
            font-size: 12px;
            color: #000;
          }

          .amount-words {
            margin-bottom: 12px;
            padding: 8px 10px;
            border: 1px solid #ddd;
            font-size: 10px;
            font-weight: bold;
            color: #000;
          }

          .payment-info-section {
            margin-bottom: 12px;
            border: 1px solid #ddd;
            padding: 10px;
          }

          .payment-details h4 {
            margin: 0 0 6px 0;
            font-size: 12px;
            color: #000;
          }

          .payment-field {
            display: flex;
            margin-bottom: 3px;
            font-size: 10px;
          }

          .payment-field .label {
            font-weight: bold;
            width: 90px;
            color: #000;
          }

          .payment-field .value {
            flex: 1;
            color: #333;
          }

          .footer-section {
            margin-top: 15px;
          }

          .signature-section {
            text-align: right;
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            min-height: 60px;
          }

          .signature-line {
            border-bottom: 1px solid #ccc;
            width: 150px;
            margin: 15px 0 6px auto;
          }

          .signature-section p {
            margin: 3px 0;
            font-size: 10px;
            color: #333;
          }

          .print-button-container {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 15px;
            padding: 15px;
          }

          .print-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 12px;
            cursor: pointer;
            border-radius: 4px;
            font-weight: 600;
            transition: background-color 0.3s ease;
            min-width: 100px;
          }

          .print-button:hover {
            background-color: #0056b3;
          }

          .print-button.secondary {
            background-color: #6c757d;
          }

          .print-button.secondary:hover {
            background-color: #545b62;
          }

          @media print {
            .invoice-container {
              background-color: white;
              padding: 5mm;
              min-height: auto;
            }

            .sales-invoice {
              margin: 0;
              padding: 8mm;
              border: 1px solid #000;
              box-shadow: none;
              max-width: none;
              width: 100%;
              max-height: none;
              page-break-inside: avoid;
            }

            .print-button-container,
            .template-control,
            .no-print {
              display: none !important;
            }

            .invoice-header {
              margin-bottom: 8px;
            }

            .company-section {
              margin-bottom: 8px;
              min-height: 70px;
            }

            .details-section {
              margin-bottom: 8px;
              min-height: 80px;
            }

            .signature-section {
              min-height: 50px;
            }
          }
        `}</style>

          {/* Header */}
          <div className="invoice-header">
            <div className="invoice-title">
              <h1>TAX INVOICE</h1>
              <span
                className={`document-copy ${
                  copyType === "customer"
                    ? "customer-copy"
                    : copyType === "transporter"
                    ? "transporter-copy"
                    : ""
                }`}
              >
                {getDocumentCopy()}
              </span>
            </div>
          </div>

          {/* Company Section */}
          <div className="company-section">
            <div className="company-logo">
              <LogoComponent logo={company.logo} companyName={company.name} />
            </div>
            <div className="company-details">
              <h2>{company.name || "Sai Computers"}</h2>
              <p>
                <strong>GSTIN:</strong> {company.gstin || "27AAACCE2060DZT"}
              </p>
              <p>{company.address || "Badur Nanded"}</p>
              <p>
                {company.city || "Your City"}, {company.state || "YOUR STATE"},{" "}
                {company.pincode || "000000"}
              </p>
              <p>
                <strong>Mobile:</strong> {company.phone || "9359564994"}{" "}
                <strong>Email:</strong> {company.email || "sai@gmail.com"}
              </p>
            </div>
          </div>

          {/* Details Section */}
          <div className="details-section">
            <div className="customer-details">
              <h3>Bill To:</h3>
              <p>
                <strong>Customer #:</strong>{" "}
                {customer.customerId || customer.name || "Customer Name"}
              </p>
              <p>
                <strong>Customer Address:</strong>{" "}
                {customer.address || "Customer Address"}
              </p>
              <p>
                <strong>Ph:</strong> {customer.mobile || "9168906880"}
              </p>
              <p>
                <strong>Email:</strong> {customer.email || "customer@gmail.com"}
              </p>
              <p>
                <strong>GSTIN:</strong> {customer.gstin || "27AAACCE2060DZQ"}
              </p>
            </div>
            <div className="invoice-details">
              <div className="invoice-field">
                <span className="label">Invoice #:</span>
                <span className="value">
                  {invoice.invoiceNumber || "SAI-20250702-0001"}
                </span>
              </div>
              <div className="invoice-field">
                <span className="label">Invoice Date:</span>
                <span className="value">
                  {formatDate(invoice.invoiceDate) || "02 Jul 2025"}
                </span>
              </div>
              <div className="invoice-field">
                <span className="label">Due Date:</span>
                <span className="value">
                  {formatDate(invoice.dueDate) || "N/A"}
                </span>
              </div>
              <div className="invoice-field">
                <span className="label">Place of Supply:</span>
                <span className="value">{company.state || "YOUR STATE"}</span>
              </div>
              <div className="invoice-field">
                <span className="label">Payment Status:</span>
                <span className="value">{payment.status || "partial"}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="items-section">
            <table className="items-table">
              <thead>
                <tr>
                  <th className="col-sno">#</th>
                  <th className="col-item">Description</th>
                  <th className="col-hsn">HSN/SAC</th>
                  <th className="col-tax">Tax</th>
                  <th className="col-qty">Qty</th>
                  <th className="col-rate">Rate</th>
                  <th className="col-amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={index}>
                      <td className="col-sno">{index + 1}</td>
                      <td className="col-item">
                        <div>{item.name || item.itemName || "Keyboard"}</div>
                        {item.description && (
                          <div
                            style={{
                              fontSize: "8px",
                              color: "#666",
                              marginTop: "2px",
                            }}
                          >
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="col-hsn">{item.hsnCode || "333"}</td>
                      <td className="col-tax">
                        {item.taxRate ? `${item.taxRate}%` : "18%"}
                      </td>
                      <td className="col-qty">
                        {(item.quantity || 6).toFixed(1)} {item.unit || "PCS"}
                      </td>
                      <td className="col-rate">
                        {formatCurrency(item.rate || 5000.0)}
                      </td>
                      <td className="col-amount">
                        {formatCurrency(item.amount || 28800.0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="col-sno">1</td>
                    <td className="col-item">Keyboard</td>
                    <td className="col-hsn">333</td>
                    <td className="col-tax">18%</td>
                    <td className="col-qty">6.0 PCS</td>
                    <td className="col-rate">₹5,000.00</td>
                    <td className="col-amount">₹28,800.00</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="totals-section">
            <div className="totals-row">
              <div className="totals-label">Taxable Amount</div>
              <div className="totals-value">
                {formatCurrency(calculatedTotals.taxableAmount || 30000)}
              </div>
            </div>
            {calculatedTotals.totalDiscount > 0 && (
              <div className="totals-row">
                <div className="totals-label">Discount</div>
                <div className="totals-value">
                  -{formatCurrency(calculatedTotals.totalDiscount)}
                </div>
              </div>
            )}
            {calculatedTotals.totalTax > 0 && (
              <>
                {totals.totalCGST > 0 && (
                  <div className="totals-row">
                    <div className="totals-label">CGST</div>
                    <div className="totals-value">
                      {formatCurrency(totals.totalCGST)}
                    </div>
                  </div>
                )}
                {totals.totalSGST > 0 && (
                  <div className="totals-row">
                    <div className="totals-label">SGST</div>
                    <div className="totals-value">
                      {formatCurrency(totals.totalSGST)}
                    </div>
                  </div>
                )}
                {totals.totalIGST > 0 && (
                  <div className="totals-row">
                    <div className="totals-label">IGST</div>
                    <div className="totals-value">
                      {formatCurrency(totals.totalIGST)}
                    </div>
                  </div>
                )}
                <div className="totals-row">
                  <div className="totals-label">Total Tax</div>
                  <div className="totals-value">
                    {formatCurrency(calculatedTotals.totalTax)}
                  </div>
                </div>
              </>
            )}
            {calculatedTotals.deliveryCharges > 0 && (
              <div className="totals-row">
                <div className="totals-label">Delivery Charges</div>
                <div className="totals-value">
                  {formatCurrency(calculatedTotals.deliveryCharges)}
                </div>
              </div>
            )}
            {calculatedTotals.roundOff !== 0 && (
              <div className="totals-row">
                <div className="totals-label">Round Off</div>
                <div className="totals-value">
                  {calculatedTotals.roundOff >= 0 ? "+" : ""}
                  {formatCurrency(calculatedTotals.roundOff)}
                </div>
              </div>
            )}
            <div className="totals-row totals-final">
              <div className="totals-label">
                <strong>Total Amount</strong>
              </div>
              <div className="totals-value">
                <strong>
                  {formatCurrency(calculatedTotals.finalAmount || 28800)}
                </strong>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="amount-words">
            Amount in words:{" "}
            {convertToWords(calculatedTotals.finalAmount || 28800)}
          </div>

          {/* Payment Information */}
          <div className="payment-info-section">
            <div className="payment-details">
              <h4>Payment Details:</h4>
              <div className="payment-field">
                <span className="label">Method:</span>
                <span className="value">
                  {payment.method || "bank_transfer"}
                </span>
              </div>
              <div className="payment-field">
                <span className="label">Paid Amount:</span>
                <span className="value">
                  {formatCurrency(payment.paidAmount || 2299)}
                </span>
              </div>
              <div className="payment-field">
                <span className="label">Pending Amount:</span>
                <span className="value">
                  {formatCurrency(payment.pendingAmount || 26501)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer-section">
            <div className="signature-section">
              <p
                style={{
                  textAlign: "right",
                  marginBottom: "4px",
                  fontSize: "10px",
                }}
              >
                For {company.name || "Sai Computers"}
              </p>
              <div className="signature-line"></div>
              <p>Authorized Signatory</p>
              <p style={{fontSize: "8px", color: "#666"}}>
                Generated on: {new Date().toLocaleDateString("en-IN")} at{" "}
                {new Date().toLocaleTimeString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Print Button */}
        {onPrint && (
          <div className="print-button-container no-print">
            <button onClick={onPrint} className="print-button">
              🖨️ Print Invoice
            </button>
            <button
              onClick={() => window.print()}
              className="print-button secondary"
            >
              📄 Browser Print
            </button>
          </div>
        )}
      </div>
    );
  }
);

SalesInvoice.displayName = "SalesInvoice";

export default SalesInvoice;
