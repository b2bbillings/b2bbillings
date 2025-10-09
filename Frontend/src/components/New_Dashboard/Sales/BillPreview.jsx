import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft,
  faDownload,
  faPrint,
  faEdit,
  faBuilding,
  faPhone,
  faEnvelope,
  faGlobe,
  faFilePdf
} from '@fortawesome/free-solid-svg-icons';
import './BillPreview.css';

const BillPreview = ({ billData, onBack, onEdit }) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const billRef = useRef();

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onBack();
    }
  };

  // Company details (in real app, this would come from settings/database)
  const companyDetails = {
    name: "Your Company Name",
    address: "123 Business Street, Business City, State - 123456",
    phone: "+91 98765 43210",
    email: "info@yourcompany.com",
    website: "www.yourcompany.com",
    gst: "27ABCDE1234F1Z5" // Only show for GST bills
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero';

    const convertHundreds = (n) => {
      let result = '';
      if (n > 99) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n > 19) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n > 9) {
        result += teens[n - 10] + ' ';
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };

    let result = '';
    let place = 0;
    
    while (num > 0) {
      const chunk = num % (place === 0 ? 1000 : 100);
      if (chunk !== 0) {
        result = convertHundreds(chunk) + thousands[place] + ' ' + result;
      }
      num = Math.floor(num / (place === 0 ? 1000 : 100));
      place++;
    }
    
    return result.trim() + ' Only';
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    
    try {
      // Try to use html2pdf if available
      try {
        const html2pdf = await import('html2pdf.js');
        const html2pdfLib = html2pdf.default || html2pdf;
        
        const element = billRef.current;
        const opt = {
          margin: 0.5,
          filename: `${billData.type}_Bill_${billData.invoiceNo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        await html2pdfLib().set(opt).from(element).save();
      } catch (importError) {
        // Fallback to simple PDF generation
        handleSimplePDF();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please use the Print button or Simple PDF option.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    // Create a clean print version
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill - ${billData.invoiceNo}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              font-size: 12px;
              line-height: 1.4;
            }
            .bill-header { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .company-details h1 { 
              margin: 0 0 10px 0; 
              font-size: 24px; 
              color: #333;
            }
            .company-address { 
              margin: 0 0 10px 0; 
              color: #666; 
              max-width: 300px;
            }
            .contact-info { 
              display: flex; 
              flex-direction: column; 
              gap: 5px; 
              margin-bottom: 10px;
            }
            .bill-meta { 
              text-align: right; 
            }
            .bill-type h2 { 
              margin: 0 0 15px 0; 
              color: #dc3545; 
              font-size: 20px;
            }
            .client-section { 
              background: #f8f9fa; 
              padding: 15px; 
              margin: 20px 0; 
              border-left: 4px solid #007bff;
            }
            .client-section h3 { 
              margin: 0 0 10px 0; 
              color: #333;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
            }
            .items-table th, .items-table td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: center;
            }
            .items-table th { 
              background: #495057; 
              color: white; 
              font-weight: bold;
            }
            .items-table td:nth-child(2) { 
              text-align: left; 
            }
            .totals-section { 
              margin: 20px 0; 
              text-align: right;
            }
            .totals-table { 
              margin-left: auto; 
              border: 1px solid #ddd;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 8px 15px; 
              border-bottom: 1px solid #ddd;
            }
            .grand-total { 
              background: #28a745; 
              color: white; 
              font-weight: bold;
            }
            .amount-words { 
              background: #f8f9fa; 
              padding: 10px; 
              margin: 20px 0; 
              border-left: 4px solid #28a745;
            }
            .signature-section { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 50px;
            }
            .signature-line { 
              height: 1px; 
              background: #333; 
              margin-bottom: 10px; 
              width: 200px;
            }
            .thank-you { 
              text-align: center; 
              background: #6f42c1; 
              color: white; 
              padding: 15px; 
              margin-top: 20px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${billRef.current.innerHTML}
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = function() {
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    };
  };

  const handleSimplePDF = () => {
    // Instructions for users to save as PDF
    const message = `To save as PDF:
    
1. Click "Simple PDF" to open print preview
2. In the print dialog, select "Save as PDF" as destination
3. Click "Save" to download the PDF

This will work in all modern browsers!`;

    if (confirm(message)) {
      handlePrint();
    }
  };

  return (
    <div className="bill-preview" onClick={handleBackdropClick}>
      <div className="bill-preview-modal">
        {/* Navigation Header */}
        <div className="modal-nav-header">
          <button className="back-btn" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to Bills
          </button>
          {onEdit && (
            <button className="edit-btn" onClick={onEdit}>
              <FontAwesomeIcon icon={faEdit} />
              Edit
            </button>
          )}
        </div>

        {/* Action Buttons Section - Prominent at Top */}
        <div className="bill-actions-section">
          <div className="actions-header">
            <h3>Bill Actions</h3>
          </div>
          <div className="action-buttons-row">
            <button className="action-btn print-btn" onClick={handlePrint}>
              <FontAwesomeIcon icon={faPrint} />
              Print Bill
            </button>
            <button 
              className="action-btn advanced-pdf-btn" 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              <FontAwesomeIcon icon={faFilePdf} />
              {isGeneratingPDF ? 'Generating...' : 'Advanced PDF'}
            </button>
            <button 
              className="action-btn simple-pdf-btn" 
              onClick={handleSimplePDF}
            >
              <FontAwesomeIcon icon={faDownload} />
              Simple PDF
            </button>
          </div>
        </div>

        {/* Bill Container */}
        <div className="bill-container" ref={billRef}>
        <div className="bill-content">
          {/* Header */}
          <div className="bill-header">
            <div className="company-details">
              <h1>{companyDetails.name}</h1>
              <p className="company-address">{companyDetails.address}</p>
              <div className="contact-info">
                <div className="contact-item">
                  <span>{companyDetails.phone}</span>
                </div>
                <div className="contact-item">
                  <span>{companyDetails.email}</span>
                </div>
                <div className="contact-item">
                  <span>{companyDetails.website}</span>
                </div>
              </div>
              {billData.type === 'GST' && (
                <div className="gst-info">
                  <strong>GST No: {companyDetails.gst}</strong>
                </div>
              )}
            </div>
            <div className="bill-meta">
              <div className="bill-type">
                <h2>{billData.type === 'GST' ? 'TAX INVOICE' : 'BILL'}</h2>
              </div>
              <div className="bill-details">
                <div className="detail-row">
                  <span>Date:</span>
                  <span>{formatDate(billData.date)}</span>
                </div>
                <div className="detail-row">
                  <span>{billData.type === 'GST' ? 'Invoice No:' : 'Bill No:'}</span>
                  <span>{billData.invoiceNo}</span>
                </div>
                <div className="detail-row">
                  <span>Serial No:</span>
                  <span>{billData.serialNo}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="client-section">
            <h3>Bill To:</h3>
            <div className="client-details">
              <div className="client-name">{billData.partyName || billData.clientName}</div>
              {billData.clientAddress && (
                <div className="client-address">{billData.clientAddress}</div>
              )}
              {billData.clientGST && (
                <div className="client-gst">GST No: {billData.clientGST}</div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="items-section">
            <table className="items-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Item Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  {billData.type === 'GST' ? (
                    <>
                      <th>GST %</th>
                      <th>GST Amount</th>
                    </>
                  ) : (
                    <>
                      <th>Tax %</th>
                      <th>Tax Amount</th>
                    </>
                  )}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {billData.items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.name}</td>
                    <td>{Number(item.quantity) || 0}</td>
                    <td>₹{(Number(item.rate) || 0).toFixed(2)}</td>
                    <td>₹{(Number(item.amount) || 0).toFixed(2)}</td>
                    <td>{(Number(item.gstRate) || Number(item.taxRate) || 0).toFixed(2)}%</td>
                    <td>₹{(Number(item.gstAmount) || Number(item.taxAmount) || 0).toFixed(2)}</td>
                    <td>₹{(Number(item.totalAmount) || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="totals-section">
            <div className="totals-table">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>₹{(Number(billData.subtotal) || 0).toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>{billData.type === 'GST' ? 'Total GST:' : 'Total Tax:'}</span>
                <span>₹{(Number(billData.totalGST) || Number(billData.totalTax) || 0).toFixed(2)}</span>
              </div>
              <div className="total-row grand-total">
                <span>Grand Total:</span>
                <span>₹{(Number(billData.grandTotal) || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="amount-words">
            <strong>Amount in Words: </strong>
            <span>₹ {numberToWords(Math.floor(Number(billData.grandTotal) || 0))}</span>
          </div>

          {/* Terms and Conditions */}
          <div className="terms-section">
            <h4>Terms & Conditions:</h4>
            <ul>
              <li>Payment is due within 30 days of invoice date</li>
              <li>Interest @ 2% per month will be charged on overdue amounts</li>
              <li>All disputes subject to local jurisdiction only</li>
              <li>Goods once sold will not be taken back</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="bill-footer">
            <div className="signature-section">
              <div className="customer-signature">
                <div className="signature-line"></div>
                <p>Customer Signature</p>
              </div>
              <div className="company-signature">
                <div className="signature-line"></div>
                <p>For {companyDetails.name}</p>
                <p>Authorized Signatory</p>
              </div>
            </div>
          </div>

          {/* Thank You Note */}
          <div className="thank-you">
            <p>Thank you for your business!</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default BillPreview;