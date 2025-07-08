import React, {forwardRef, useState} from "react";

const PurchaseOrder = forwardRef(({orderData, onPrint}, ref) => {
  const data = orderData || {};
  const company = data.company || {};
  const supplier = data.supplier || {};
  const order = data.order || data.quotation || data.proforma || {};
  const items = data.items || [];
  const totals = data.totals || {};
  const payment = data.payment || {};
  const meta = data.meta || {};

  // ✅ NEW: State for document copy type
  const [copyType, setCopyType] = useState("standard");

  // Determine document type
  const isQuotation =
    meta.isQuotation || order.orderType === "purchase_quotation";
  const isProformaPurchase =
    meta.isProformaPurchase || order.orderType === "proforma_purchase";
  const isPurchaseOrder = !isQuotation && !isProformaPurchase;

  // Get document title and headers
  const getDocumentTitle = () => {
    if (isQuotation) return "PURCHASE QUOTATION";
    if (isProformaPurchase) return "PROFORMA PURCHASE";
    return "PURCHASE ORDER";
  };

  // ✅ UPDATED: Dynamic document copy based on selection
  const getDocumentCopy = () => {
    switch (copyType) {
      case "customer":
        return "CUSTOMER COPY";
      case "transporter":
        return "TRANSPORTER COPY";
      default:
        if (isQuotation) return "QUOTATION COPY";
        if (isProformaPurchase) return "PROFORMA FOR SUPPLIER";
        return "PURCHASE ORDER COPY";
    }
  };

  // ✅ NEW: Copy type options
  const copyTypeOptions = [
    {value: "standard", label: "Standard"},
    {value: "customer", label: "Customer"},
    {value: "transporter", label: "Transporter"},
  ];

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

  // Calculate validity days remaining
  const getValidityInfo = () => {
    if (!order.validUntil) return null;

    const validUntil = new Date(order.validUntil);
    const today = new Date();
    const diffTime = validUntil - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      validUntil: formatDate(order.validUntil),
      daysRemaining: diffDays,
      isExpired: diffDays < 0,
      isExpiringSoon: diffDays <= 7 && diffDays >= 0,
    };
  };

  const validityInfo = getValidityInfo();

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
            {companyName ? companyName.substring(0, 2).toUpperCase() : "PO"}
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

  // Status badge component
  const StatusBadge = ({status, orderType}) => {
    const getStatusColor = (status) => {
      switch (status) {
        case "draft":
          return "#6c757d";
        case "sent":
          return "#0d6efd";
        case "confirmed":
          return "#198754";
        case "received":
          return "#28a745";
        case "partially_received":
          return "#ffc107";
        case "rejected":
          return "#dc3545";
        case "expired":
          return "#fd7e14";
        case "converted":
          return "#6f42c1";
        case "cancelled":
          return "#dc3545";
        case "completed":
          return "#28a745";
        default:
          return "#6c757d";
      }
    };

    return (
      <span
        className="status-badge"
        style={{
          backgroundColor: getStatusColor(status),
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "10px",
          fontWeight: "bold",
          textTransform: "uppercase",
        }}
      >
        {status}
      </span>
    );
  };

  // Priority badge component
  const PriorityBadge = ({priority}) => {
    if (!priority || priority === "normal") return null;

    const getPriorityColor = (priority) => {
      switch (priority) {
        case "high":
          return "#dc3545";
        case "urgent":
          return "#fd7e14";
        case "low":
          return "#28a745";
        default:
          return "#6c757d";
      }
    };

    return (
      <span
        className="priority-badge"
        style={{
          backgroundColor: getPriorityColor(priority),
          color: "white",
          padding: "2px 6px",
          borderRadius: "3px",
          fontSize: "9px",
          fontWeight: "bold",
          textTransform: "uppercase",
          marginLeft: "8px",
        }}
      >
        {priority}
      </span>
    );
  };

  if (!orderData) {
    return (
      <div className="order-container" ref={ref}>
        <div className="loading-state">
          <p>Loading purchase order data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-container" ref={ref}>
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

      <div className="purchase-order">
        <style>{`
          .order-container {
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

          .purchase-order {
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

          .order-header {
            text-align: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
            position: relative;
          }

          .order-title {
            position: relative;
            margin-bottom: 5px;
          }

          .order-title h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            letter-spacing: 3px;
            color: #000;
          }

          .quotation-title {
            color: #0d6efd;
          }

          .proforma-title {
            color: #6f42c1;
          }

          .purchase-order-title {
            color: #dc3545;
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
            background: #f3e7ff;
            border-color: #6f42c1;
            color: #6f42c1;
          }

          .document-copy.transporter-copy {
            background: #fff3e0;
            border-color: #ff9800;
            color: #ff9800;
          }

          .validity-notice {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 4px 8px;
            margin-top: 4px;
            font-size: 10px;
            border-radius: 3px;
          }

          .validity-expired {
            background: #f8d7da;
            border-color: #dc3545;
            color: #721c24;
          }

          .validity-expiring {
            background: #fff3cd;
            border-color: #ffc107;
            color: #856404;
          }

          .expected-delivery-notice {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 4px 8px;
            margin-top: 4px;
            font-size: 10px;
            border-radius: 3px;
            color: #155724;
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

          .supplier-details {
            flex: 1;
            padding: 10px;
            border-right: 1px solid #ddd;
          }

          .order-details {
            flex: 1;
            padding: 10px;
          }

          .supplier-details h3 {
            font-size: 12px;
            margin: 0 0 6px 0;
            font-weight: bold;
            color: #000;
          }

          .supplier-details p {
            margin: 3px 0;
            font-size: 10px;
            color: #333;
          }

          .order-field {
            display: flex;
            margin-bottom: 4px;
            font-size: 10px;
          }

          .order-field .label {
            font-weight: bold;
            width: 90px;
            color: #000;
          }

          .order-field .value {
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

          .terms-section {
            margin-bottom: 12px;
            border: 1px solid #ddd;
            padding: 10px;
          }

          .terms-section h4 {
            margin: 0 0 6px 0;
            font-size: 12px;
            color: #000;
          }

          .terms-section p {
            margin: 3px 0;
            font-size: 10px;
            color: #333;
            line-height: 1.4;
          }

          .payment-terms {
            background-color: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            margin-top: 6px;
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
            background-color: #dc3545;
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
            background-color: #c82333;
          }

          .print-button.secondary {
            background-color: #6c757d;
          }

          .print-button.secondary:hover {
            background-color: #545b62;
          }

          .quotation-specific {
            background-color: #e7f3ff;
            border-left: 4px solid #0d6efd;
            padding: 8px;
            margin: 8px 0;
            font-size: 10px;
          }

          .proforma-specific {
            background-color: #f3e7ff;
            border-left: 4px solid #6f42c1;
            padding: 8px;
            margin: 8px 0;
            font-size: 10px;
          }

          .order-specific {
            background-color: #ffe7e7;
            border-left: 4px solid #dc3545;
            padding: 8px;
            margin: 8px 0;
            font-size: 10px;
          }

          .source-tracking {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 6px 10px;
            margin: 8px 0;
            font-size: 9px;
            border-radius: 3px;
          }

          .bidirectional-info {
            background-color: #e7f3ff;
            border: 1px solid #0d6efd;
            padding: 6px 10px;
            margin: 8px 0;
            font-size: 9px;
            border-radius: 3px;
          }

          @media print {
            .order-container {
              background-color: white;
              padding: 5mm;
              min-height: auto;
            }

            .purchase-order {
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

            .order-header {
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
        <div className="order-header">
          <div className="order-title">
            <h1
              className={
                isQuotation
                  ? "quotation-title"
                  : isProformaPurchase
                  ? "proforma-title"
                  : "purchase-order-title"
              }
            >
              {getDocumentTitle()}
            </h1>
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

          {/* Status Badge */}
          {order.status && (
            <div style={{marginTop: "5px"}}>
              <StatusBadge status={order.status} orderType={order.orderType} />
              <PriorityBadge priority={order.priority} />
            </div>
          )}

          {/* Validity Notice for Quotations */}
          {isQuotation && validityInfo && (
            <div
              className={`validity-notice ${
                validityInfo.isExpired
                  ? "validity-expired"
                  : validityInfo.isExpiringSoon
                  ? "validity-expiring"
                  : ""
              }`}
            >
              {validityInfo.isExpired ? (
                <strong>⚠️ EXPIRED on {validityInfo.validUntil}</strong>
              ) : validityInfo.isExpiringSoon ? (
                <strong>
                  ⚠️ Expires in {validityInfo.daysRemaining} days (
                  {validityInfo.validUntil})
                </strong>
              ) : (
                <span>Valid until: {validityInfo.validUntil}</span>
              )}
            </div>
          )}

          {/* Expected Delivery Notice */}
          {order.expectedDeliveryDate && (
            <div className="expected-delivery-notice">
              <strong>📅 Expected Delivery:</strong>{" "}
              {formatDate(order.expectedDeliveryDate)}
              {order.requiredBy && (
                <span>
                  {" "}
                  | <strong>Required By:</strong> {formatDate(order.requiredBy)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Rest of the component remains the same... */}
        {/* Company Section */}
        <div className="company-section">
          <div className="company-logo">
            <LogoComponent logo={company.logo} companyName={company.name} />
          </div>
          <div className="company-details">
            <h2>{company.name || "Your Company"}</h2>
            {company.gstin && (
              <p>
                <strong>GSTIN:</strong> {company.gstin}
              </p>
            )}
            <p>{company.address || "Company Address"}</p>
            {company.phone && (
              <p>
                <strong>Mobile:</strong> {company.phone}
              </p>
            )}
            {company.email && (
              <p>
                <strong>Email:</strong> {company.email}
              </p>
            )}
            {company.website && (
              <p>
                <strong>Website:</strong> {company.website}
              </p>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="details-section">
          <div className="supplier-details">
            <h3>
              {isQuotation
                ? "Quotation From:"
                : isProformaPurchase
                ? "Proforma From:"
                : "Purchase From:"}
            </h3>
            <p>
              <strong>Supplier:</strong> {supplier.name || "Supplier Name"}
            </p>
            {supplier.address && (
              <p>
                <strong>Address:</strong> {supplier.address}
              </p>
            )}
            {supplier.mobile && (
              <p>
                <strong>Mobile:</strong> {supplier.mobile}
              </p>
            )}
            {supplier.email && (
              <p>
                <strong>Email:</strong> {supplier.email}
              </p>
            )}
            {supplier.gstin && (
              <p>
                <strong>GSTIN:</strong> {supplier.gstin}
              </p>
            )}
          </div>
          <div className="order-details">
            <div className="order-field">
              <span className="label">
                {isQuotation
                  ? "Quotation #:"
                  : isProformaPurchase
                  ? "Proforma #:"
                  : "PO #:"}
              </span>
              <span className="value">
                {order.orderNumber ||
                  order.quotationNumber ||
                  order.proformaNumber ||
                  "N/A"}
              </span>
            </div>
            <div className="order-field">
              <span className="label">
                {isQuotation
                  ? "Quote Date:"
                  : isProformaPurchase
                  ? "Proforma Date:"
                  : "PO Date:"}
              </span>
              <span className="value">
                {formatDate(
                  order.orderDate || order.quotationDate || order.proformaDate
                )}
              </span>
            </div>
            {order.validUntil && (
              <div className="order-field">
                <span className="label">Valid Until:</span>
                <span className="value">{formatDate(order.validUntil)}</span>
              </div>
            )}
            {order.expectedDeliveryDate && (
              <div className="order-field">
                <span className="label">Expected Delivery:</span>
                <span className="value">
                  {formatDate(order.expectedDeliveryDate)}
                </span>
              </div>
            )}
            {order.requiredBy && (
              <div className="order-field">
                <span className="label">Required By:</span>
                <span className="value">{formatDate(order.requiredBy)}</span>
              </div>
            )}
            {order.priority && order.priority !== "normal" && (
              <div className="order-field">
                <span className="label">Priority:</span>
                <span
                  className="value"
                  style={{
                    textTransform: "uppercase",
                    fontWeight: "bold",
                    color:
                      order.priority === "high"
                        ? "#dc3545"
                        : order.priority === "urgent"
                        ? "#fd7e14"
                        : "#333",
                  }}
                >
                  {order.priority}
                </span>
              </div>
            )}
            {payment.creditDays && (
              <div className="order-field">
                <span className="label">Credit Days:</span>
                <span className="value">{payment.creditDays} days</span>
              </div>
            )}
          </div>
        </div>

        {/* Document Type Specific Notice */}
        {isQuotation && (
          <div className="quotation-specific">
            <strong>Purchase Quotation Notice:</strong> This is a price
            quotation request. Final order confirmation required.
            {validityInfo && !validityInfo.isExpired && (
              <span>
                {" "}
                Response required within {validityInfo.daysRemaining} days.
              </span>
            )}
          </div>
        )}

        {isProformaPurchase && (
          <div className="proforma-specific">
            <strong>Proforma Purchase Notice:</strong> This is a proforma
            purchase order. Final purchase order will be issued upon
            confirmation.
            {payment.advanceRequired && (
              <span>
                {" "}
                Advance payment of {formatCurrency(payment.advanceRequired)} may
                be required.
              </span>
            )}
          </div>
        )}

        {isPurchaseOrder && (
          <div className="order-specific">
            <strong>Purchase Order Notice:</strong> This is a confirmed purchase
            order. Please proceed with supply as per terms.
          </div>
        )}

        {/* Source Tracking Information */}
        {(order.sourceOrderNumber || order.isAutoGenerated) && (
          <div className="source-tracking">
            <strong>📊 Source Tracking:</strong>
            {order.sourceOrderNumber && (
              <span>
                {" "}
                Generated from Sales Order: {order.sourceOrderNumber}
              </span>
            )}
            {order.isAutoGenerated && (
              <span>
                {" "}
                Auto-generated from {order.generatedFrom || "system"}
              </span>
            )}
          </div>
        )}

        {/* Bidirectional Information */}
        {order.correspondingSalesOrderNumber && (
          <div className="bidirectional-info">
            <strong>🔄 Bidirectional Link:</strong> Linked to Sales Order:{" "}
            {order.correspondingSalesOrderNumber}
          </div>
        )}

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
                      <div>
                        {item.name || item.itemName || `Item ${index + 1}`}
                      </div>
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
                    <td className="col-hsn">{item.hsnCode || "N/A"}</td>
                    <td className="col-tax">
                      {item.taxRate ? `${item.taxRate}%` : "0%"}
                    </td>
                    <td className="col-qty">
                      {(item.quantity || 1).toFixed(1)} {item.unit || "PCS"}
                    </td>
                    <td className="col-rate">
                      {formatCurrency(item.rate || item.pricePerUnit || 0)}
                    </td>
                    <td className="col-amount">
                      {formatCurrency(item.amount || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="col-sno">1</td>
                  <td className="col-item">Sample Item</td>
                  <td className="col-hsn">N/A</td>
                  <td className="col-tax">18%</td>
                  <td className="col-qty">1.0 PCS</td>
                  <td className="col-rate">₹1,000.00</td>
                  <td className="col-amount">₹1,000.00</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="totals-section">
          <div className="totals-row">
            <div className="totals-label">Subtotal</div>
            <div className="totals-value">
              {formatCurrency(calculatedTotals.taxableAmount)}
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
          {meta.isGSTEnabled && calculatedTotals.totalTax > 0 && (
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
              <strong>
                {isQuotation
                  ? "Quotation Total"
                  : isProformaPurchase
                  ? "Proforma Total"
                  : "Purchase Total"}
              </strong>
            </div>
            <div className="totals-value">
              <strong>{formatCurrency(calculatedTotals.finalAmount)}</strong>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="amount-words">
          Amount in words: {convertToWords(calculatedTotals.finalAmount)}
        </div>

        {/* Terms and Conditions */}
        {(order.termsAndConditions ||
          order.notes ||
          order.supplierNotes ||
          payment.paymentTerms) && (
          <div className="terms-section">
            <h4>Terms & Conditions:</h4>
            {order.termsAndConditions && <p>{order.termsAndConditions}</p>}
            {order.notes && (
              <p>
                <strong>Notes:</strong> {order.notes}
              </p>
            )}
            {order.supplierNotes && (
              <p>
                <strong>Supplier Notes:</strong> {order.supplierNotes}
              </p>
            )}
            {order.internalNotes && (
              <p>
                <strong>Internal Notes:</strong> {order.internalNotes}
              </p>
            )}

            {/* Payment Terms */}
            {payment.paymentTerms && (
              <div className="payment-terms">
                <strong>Payment Terms:</strong> {payment.paymentTerms}
              </div>
            )}

            {/* Document Specific Terms */}
            {isQuotation && (
              <p>
                <strong>Quotation Terms:</strong> Please confirm quantities and
                specifications. This quotation is valid for the period mentioned
                above.
              </p>
            )}

            {isProformaPurchase && (
              <p>
                <strong>Proforma Terms:</strong> This is a proforma purchase
                order. Final purchase order will be issued upon confirmation.
              </p>
            )}

            {isPurchaseOrder && (
              <p>
                <strong>Purchase Terms:</strong> This is a confirmed purchase
                order. Supply to be made as per the agreed schedule and
                specifications.
              </p>
            )}
          </div>
        )}

        {/* Payment Information */}
        {(payment.paidAmount > 0 || payment.pendingAmount > 0) && (
          <div
            className="payment-section"
            style={{
              marginBottom: "12px",
              border: "1px solid #ddd",
              padding: "10px",
            }}
          >
            <h4 style={{margin: "0 0 6px 0", fontSize: "12px"}}>
              Payment Information:
            </h4>
            {payment.paidAmount > 0 && (
              <p style={{margin: "3px 0", fontSize: "10px"}}>
                <strong>Paid Amount:</strong>{" "}
                {formatCurrency(payment.paidAmount)}
              </p>
            )}
            {payment.pendingAmount > 0 && (
              <p style={{margin: "3px 0", fontSize: "10px"}}>
                <strong>Pending Amount:</strong>{" "}
                {formatCurrency(payment.pendingAmount)}
              </p>
            )}
            {payment.method && (
              <p style={{margin: "3px 0", fontSize: "10px"}}>
                <strong>Payment Method:</strong> {payment.method}
              </p>
            )}
            {payment.dueDate && (
              <p style={{margin: "3px 0", fontSize: "10px"}}>
                <strong>Due Date:</strong> {formatDate(payment.dueDate)}
              </p>
            )}
          </div>
        )}

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
              For {company.name || "Your Company"}
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
            🖨️ Print {getDocumentTitle()}
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

PurchaseOrder.displayName = "PurchaseOrder";

export default PurchaseOrder;
