import React, {forwardRef, useState} from "react";

const PurchaseInvoice = forwardRef(({invoiceData, onPrint}, ref) => {
  const data = invoiceData || {};
  const company = data.company || {};
  const supplier = data.supplier || {};
  const purchase = data.purchase || {};
  const items = data.items || [];
  const totals = data.totals || {};
  const payment = data.payment || {};

  // ✅ NEW: State for document copy type
  const [copyType, setCopyType] = useState("standard");

  // ✅ NEW: Copy type options
  const copyTypeOptions = [
    {value: "standard", label: "Standard"},
    {value: "customer", label: "Customer"},
    {value: "transporter", label: "Transporter"},
  ];

  // ✅ NEW: Dynamic document copy based on selection
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

  // Calculate totals from real data
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const deliveryCharges = totals.deliveryCharges || 0;
    const taxableAmount = totals.subtotal || subtotal;
    const totalTax = totals.totalTax || 0;
    const finalAmount =
      totals.finalTotal || taxableAmount + deliveryCharges + totalTax;

    return {
      subtotal,
      taxableAmount,
      deliveryCharges,
      totalTax,
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

  // Number to words function
  const numberToWords = (num) => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const thousands = ["", "Thousand", "Lakh", "Crore"];

    if (num === 0) return "Zero";

    const convertHundreds = (n) => {
      let result = "";
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + " ";
        return result;
      }
      if (n > 0) {
        result += ones[n] + " ";
      }
      return result;
    };

    let integerPart = Math.floor(num);
    let result = "";
    let thousandCounter = 0;

    if (integerPart === 0) {
      result = "Zero";
    } else {
      while (integerPart > 0) {
        const chunk = integerPart % (thousandCounter === 0 ? 1000 : 100);
        if (chunk !== 0) {
          result =
            convertHundreds(chunk) + thousands[thousandCounter] + " " + result;
        }
        integerPart = Math.floor(
          integerPart / (thousandCounter === 0 ? 1000 : 100)
        );
        thousandCounter++;
      }
    }

    return result.trim() + " Rupees Only";
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

  // Safe logo component
  const LogoComponent = ({logo, companyName}) => {
    const [imageError, setImageError] = useState(false);

    if (!logo || imageError) {
      return (
        <div className="company-logo-placeholder">
          <span className="logo-text">
            {companyName ? companyName.substring(0, 2).toUpperCase() : "CO"}
          </span>
        </div>
      );
    }

    return (
      <img
        src={logo.startsWith("data:") ? logo : `data:image/png;base64,${logo}`}
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
          <p>Loading purchase invoice data...</p>
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

      <div className="purchase-invoice">
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

          .purchase-invoice {
            width: 210mm;
            max-width: 800px;
            background: white;
            color: #333;
            line-height: 1.3;
            border: 2px solid #000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            padding: 8mm;
            margin: 10px auto;
            position: relative;
          }

          .invoice-header {
            text-align: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 2px solid #000;
            position: relative;
          }

          .invoice-title {
            position: relative;
            margin-bottom: 5px;
          }

          .invoice-title h1 {
            font-size: 22px;
            font-weight: bold;
            margin: 0;
            letter-spacing: 3px;
            color: #000;
          }

          .original-copy {
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

          .original-copy.customer-copy {
            background: #f3e7ff;
            border-color: #6f42c1;
            color: #6f42c1;
          }

          .original-copy.transporter-copy {
            background: #fff3e0;
            border-color: #ff9800;
            color: #ff9800;
          }

          .company-section {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            padding: 6px;
            border: 1px solid #ddd;
            min-height: 80px;
          }

          .company-logo {
            width: 70px;
            height: 70px;
            margin-right: 10px;
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
            font-size: 16px;
            color: #666;
          }

          .company-details {
            flex: 1;
            text-align: center;
          }

          .company-details h2 {
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 3px 0;
            color: #000;
          }

          .company-details p {
            margin: 1px 0;
            font-size: 11px;
            color: #333;
          }

          .details-section {
            display: flex;
            margin-bottom: 8px;
            border: 1px solid #ddd;
            min-height: 80px;
          }

          .customer-details {
            flex: 1;
            padding: 6px;
            border-right: 1px solid #ddd;
          }

          .invoice-details {
            flex: 1;
            padding: 6px;
          }

          .customer-details h3 {
            font-size: 12px;
            margin: 0 0 4px 0;
            font-weight: bold;
            color: #000;
          }

          .customer-details p {
            margin: 1px 0;
            font-size: 10px;
            color: #333;
          }

          .invoice-field {
            display: flex;
            margin-bottom: 2px;
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
            margin-bottom: 8px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
          }

          .items-table th,
          .items-table td {
            border: 1px solid #ddd;
            padding: 5px 4px;
            text-align: left;
            font-size: 10px;
          }

          .items-table th {
            background-color: #f8f8f8;
            font-weight: bold;
            text-align: center;
            padding: 7px 4px;
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

          .no-items {
            text-align: center;
            font-style: italic;
            color: #666;
            padding: 20px;
          }

          .totals-section {
            margin-bottom: 8px;
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
            padding: 5px 6px;
            font-size: 10px;
            border-right: 1px solid #eee;
            color: #333;
          }

          .totals-value {
            width: 120px;
            padding: 5px 6px;
            text-align: right;
            font-size: 10px;
            color: #333;
          }

          .totals-final {
            background-color: #f8f8f8;
            font-weight: bold;
            font-size: 11px;
            color: #000;
          }

          .amount-words {
            margin-bottom: 8px;
            padding: 5px 6px;
            border: 1px solid #ddd;
            font-size: 10px;
            font-weight: bold;
            color: #000;
          }

          .tax-section {
            margin-bottom: 8px;
          }

          .tax-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
            margin-bottom: 5px;
          }

          .tax-table th,
          .tax-table td {
            border: 1px solid #ddd;
            padding: 4px 3px;
            text-align: center;
            font-size: 9px;
          }

          .tax-table th {
            background-color: #f8f8f8;
            font-weight: bold;
            color: #000;
          }

          .amount-payable {
            text-align: right;
            font-size: 11px;
            font-weight: bold;
            padding: 5px 6px;
            border: 1px solid #ddd;
            background-color: #f8f8f8;
            color: #000;
          }

          .payment-info-section {
            margin-bottom: 8px;
            border: 1px solid #ddd;
            padding: 6px;
          }

          .payment-details h4 {
            margin: 0 0 4px 0;
            font-size: 11px;
            color: #000;
          }

          .payment-field {
            display: flex;
            margin-bottom: 1px;
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
            margin-top: 8px;
          }

          .signature-section {
            text-align: right;
            margin-top: 10px;
            padding: 6px;
            border: 1px solid #ddd;
          }

          .signature-line {
            border-bottom: 1px solid #ccc;
            width: 150px;
            margin: 15px 0 5px auto;
          }

          .signature-section p {
            margin: 1px 0;
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

            .purchase-invoice {
              margin: 0;
              padding: 5mm;
              border: 1px solid #000;
              box-shadow: none;
              max-width: none;
              width: 100%;
            }

            .print-button-container,
            .template-control,
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Header */}
        <div className="invoice-header">
          <div className="invoice-title">
            <h1>TAX INVOICE</h1>
            <span
              className={`original-copy ${
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
            <h2>{company.name || "Naugaya Technology"}</h2>
            <p>
              <strong>GSTIN:</strong> {company.gstin || "08BASPS5230D1MU"}
            </p>
            <p>
              {company.address ||
                "Plot No 44 Ward No 46, Saini Nagar Jaipur Road"}
            </p>
            <p>
              {company.city || "Sikar"}, {company.state || "RAJASTHAN"},{" "}
              {company.pincode || "332001"}
            </p>
            <p>
              <strong>Mobile:</strong> {company.phone || "9414265810"}{" "}
              <strong>Email:</strong>{" "}
              {company.email || "naugayaindia@gmail.com"}
            </p>
            {company.website && (
              <p>
                <strong>Website:</strong> {company.website}
              </p>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="details-section">
          <div className="customer-details">
            <h3>Customer Details:</h3>
            <p>
              <strong>{supplier.name || "Vishnu Ji"}</strong>
            </p>
            <p>{supplier.address || "Galaxy IT Solution Jaipur"}</p>
            <p>
              <strong>Ph:</strong> {supplier.mobile || "8432077776"}
            </p>
            {supplier.gstin && (
              <p>
                <strong>GSTIN:</strong> {supplier.gstin}
              </p>
            )}
          </div>
          <div className="invoice-details">
            <div className="invoice-field">
              <span className="label">Invoice #:</span>
              <span className="value">{purchase.billNumber || "NTP1-129"}</span>
            </div>
            <div className="invoice-field">
              <span className="label">Invoice Date:</span>
              <span className="value">
                {formatDate(purchase.billDate) || "27 Feb 2025"}
              </span>
            </div>
            <div className="invoice-field">
              <span className="label">Place of Supply:</span>
              <span className="value">{supplier.state || "08-RAJASTHAN"}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="items-section">
          <table className="items-table">
            <thead>
              <tr>
                <th className="col-sno">#</th>
                <th className="col-item">Item</th>
                <th className="col-hsn">HSN/SAC</th>
                <th className="col-tax">Tax</th>
                <th className="col-qty">Qty</th>
                <th className="col-rate">Rate/Item</th>
                <th className="col-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index}>
                    <td className="col-sno">{index + 1}</td>
                    <td className="col-item">
                      {item.name || item.itemName || `Dell 5420 Old Laptop`}
                    </td>
                    <td className="col-hsn">{item.hsnCode || "-"}</td>
                    <td className="col-tax">
                      {item.taxRate ? `${item.taxRate}%` : "-"}
                    </td>
                    <td className="col-qty">
                      {(item.quantity || 1).toFixed(1)} {item.unit || "PCS"}
                    </td>
                    <td className="col-rate">
                      {formatCurrency(item.rate || 22000)}
                    </td>
                    <td className="col-amount">
                      {formatCurrency(item.amount || 22000)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="col-sno">1</td>
                  <td className="col-item">
                    Dell 5420 Old Laptop
                    <br />
                    i5 11th Gen / 16GB / 256GB With Adaptor
                  </td>
                  <td className="col-hsn">-</td>
                  <td className="col-tax">-</td>
                  <td className="col-qty">1.0 PCS</td>
                  <td className="col-rate">₹22,000.00</td>
                  <td className="col-amount">₹22,000.00</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="totals-section">
          <div className="totals-row">
            <div className="totals-label">Taxable Amount</div>
            <div className="totals-value">₹1,20,000.00</div>
          </div>
          <div className="totals-row">
            <div className="totals-label">Delivery/Shipping Charges</div>
            <div className="totals-value">9968</div>
          </div>
          <div className="totals-row totals-final">
            <div className="totals-label">Total</div>
            <div className="totals-value">₹1,20,400.00</div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="amount-words">
          Amount Chargeable (in words): INR One Lakh, Twenty Thousand, Four
          Hundred Rupees Only
        </div>

        {/* Tax Breakdown */}
        <div className="tax-section">
          <table className="tax-table">
            <thead>
              <tr>
                <th rowSpan="2">HSN/SAC</th>
                <th rowSpan="2">Taxable Value</th>
                <th colSpan="2">Central Tax</th>
                <th colSpan="2">State Tax</th>
                <th rowSpan="2">Total Tax Amount</th>
              </tr>
              <tr>
                <th>Rate</th>
                <th>Amount</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>-</td>
                <td>1,20,000.00</td>
                <td>0.0%</td>
                <td>0.00</td>
                <td>0.0%</td>
                <td>0.00</td>
                <td>0.00</td>
              </tr>
              <tr>
                <td>9968</td>
                <td>400.00</td>
                <td>0.0%</td>
                <td>0.00</td>
                <td>0.0%</td>
                <td>0.00</td>
                <td>0.00</td>
              </tr>
              <tr>
                <td colSpan="6">
                  <strong>TOTAL</strong>
                </td>
                <td>
                  <strong>0.00</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="amount-payable">Amount Payable: ₹1,20,400.00</div>
        </div>

        {/* Payment Information */}
        <div className="payment-info-section">
          <div className="payment-details">
            <h4>Bank Details:</h4>
            <div className="payment-field">
              <span className="label">Bank:</span>
              <span className="value">
                {payment.bank || "Bank of Maharashtra"}
              </span>
            </div>
            <div className="payment-field">
              <span className="label">Account #:</span>
              <span className="value">
                {payment.accountNumber || "60356289771"}
              </span>
            </div>
            <div className="payment-field">
              <span className="label">IFSC:</span>
              <span className="value">{payment.ifsc || "MAHB0001479"}</span>
            </div>
            <div className="payment-field">
              <span className="label">Branch:</span>
              <span className="value">{payment.branch || "SIKAR"}</span>
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
              For {company.name || "Naugaya Technology"}
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

      {/* ✅ UPDATED: Print Button Container */}
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
});

PurchaseInvoice.displayName = "PurchaseInvoice";

export default PurchaseInvoice;
