// File: D:\b2b Main web\b2bbillings\Frontend\src\components\New_Dashboard\Sales\NewSalesInvoice.jsx
import React, { useState, useEffect, useRef } from 'react';
import InvoiceTable from './InvoiceTable';
import PaymentSection from './PaymentSection';
import SpecialNotesSection from './SpecialNotesSection';
import NewItemSidebar from './NewItemSidebar';
import './NewSalesInvoice.css';

const NewSalesInvoice = () => {
  const [customer, setCustomer] = useState('Please select customer');
  const [invoiceNumber, setInvoiceNumber] = useState('INV0001');
  const [invoiceDate, setInvoiceDate] = useState('10-10-2025');
  const [seriesName, setSeriesName] = useState('Sales Invoice');
  const [bookName, setBookName] = useState(''); // Assuming default empty
  const [showHideColumnsOpen, setShowHideColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    challanNo: false,
    description: false,
    batchLot: false,
    expDate: false,
    mrp: false,
    qty: true,
    rate: true,
    amount: true,
    discPercent: false,
    taxableAmt: false,
    cessPercent: false,
  });
  const [tableRows, setTableRows] = useState([
    { id: 1, goodsService: 'Please select goods/service', qty: 0, rate: 0, amount: 0 }
  ]);
  const [isPaymentReceived, setIsPaymentReceived] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [refNo, setRefNo] = useState('AD/0102');
  const [depositTo, setDepositTo] = useState('Cash-in-hand');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [taxableAmt, setTaxableAmt] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [autoRoundOff, setAutoRoundOff] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [specialNotes, setSpecialNotes] = useState('');
  const [showNewItemSidebar, setShowNewItemSidebar] = useState(false);
  const [selectedGoodsService, setSelectedGoodsService] = useState(null);

  const showHideRef = useRef(null);

  // Calculate totals
  useEffect(() => {
    const newSubtotal = tableRows.reduce((sum, row) => sum + (row.amount || 0), 0);
    setSubtotal(newSubtotal);
    const newTotal = newSubtotal - discount + serviceCharge;
    setTotalAmount(newTotal);
  }, [tableRows, discount, serviceCharge]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + Alt + S: Save
      if (e.ctrlKey && e.altKey && e.key === 's') {
        e.preventDefault();
        // Implement save logic here
        console.log('Save invoice');
      }
      // Ctrl + Alt + C: Cancel
      if (e.ctrlKey && e.altKey && e.key === 'c') {
        e.preventDefault();
        // Implement cancel logic
        console.log('Cancel invoice');
      }
      // Left/Right Arrow: Navigate (placeholder)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        console.log('Navigate');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddRow = () => {
    const newRow = { id: Date.now(), goodsService: 'Please select goods/service', qty: 0, rate: 0, amount: 0 };
    setTableRows([...tableRows, newRow]);
  };

  const handleGoodsServiceClick = (rowId) => {
    setSelectedGoodsService(rowId);
    setShowNewItemSidebar(true);
  };

  const updateRow = (rowId, field, value) => {
    setTableRows(tableRows.map(row => 
      row.id === rowId ? { ...row, [field]: value, amount: row.qty * row.rate } : row
    ));
  };

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
    setShowHideColumnsOpen(false);
  };

  return (
    <div className="new-sales-invoice-container">
      <header className="invoice-header">
        <h1>Create New Sales Invoice <span className="required">*</span></h1>
        <div className="header-actions">
          <button className="btn-discard">Discard</button>
          <button className="btn-save">Save</button>
        </div>
      </header>

      <section className="customer-info-section">
        <label className="section-label">Customer Info.</label>
        <div className="customer-fields">
          <div className="field-group">
            <label>Select Customer <span className="required">*</span></label>
            <select value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option>Please select customer</option>
              {/* Add options */}
            </select>
          </div>
          <div className="field-group">
            <label>Series Name</label>
            <select value={seriesName} onChange={(e) => setSeriesName(e.target.value)}>
              <option>Sales Invoice</option>
            </select>
          </div>
          <div className="field-group">
            <label>Invoice Number <span className="required">*</span></label>
            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <div className="field-group">
            <label>Invoice Date <span className="required">*</span></label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div className="field-group">
            <label>Book Name</label>
            <select value={bookName} onChange={(e) => setBookName(e.target.value)}>
              <option></option>
            </select>
          </div>
          <div className="show-hide-wrapper">
            <button 
              ref={showHideRef}
              className="btn-show-hide-columns"
              onClick={() => setShowHideColumnsOpen(!showHideColumnsOpen)}
            >
              Show/Hide Columns
            </button>
            {showHideColumnsOpen && (
              <div className="columns-dropdown">
                {Object.keys(visibleColumns).map(col => (
                  <label key={col}>
                    <input 
                      type="checkbox" 
                      checked={visibleColumns[col]} 
                      onChange={() => toggleColumn(col)} 
                    />
                    {col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <InvoiceTable 
        rows={tableRows} 
        visibleColumns={visibleColumns}
        onAddRow={handleAddRow}
        onGoodsServiceClick={handleGoodsServiceClick}
        onUpdateRow={updateRow}
      />

      <div className="lower-sections">
        <SpecialNotesSection notes={specialNotes} onNotesChange={setSpecialNotes} />
        <PaymentSection 
          isReceived={isPaymentReceived}
          onReceivedChange={setIsPaymentReceived}
          paymentMode={paymentMode}
          onPaymentModeChange={setPaymentMode}
          refNo={refNo}
          onRefNoChange={setRefNo}
          depositTo={depositTo}
          onDepositToChange={setDepositTo}
          paymentAmount={paymentAmount}
          onPaymentAmountChange={setPaymentAmount}
          subtotal={subtotal}
          taxableAmt={taxableAmt}
          onTaxableAmtChange={setTaxableAmt}
          serviceCharge={serviceCharge}
          onServiceChargeChange={setServiceCharge}
          discount={discount}
          onDiscountChange={setDiscount}
          autoRoundOff={autoRoundOff}
          onAutoRoundOffChange={setAutoRoundOff}
          totalAmount={totalAmount}
        />
      </div>

      {showNewItemSidebar && (
        <NewItemSidebar 
          onClose={() => setShowNewItemSidebar(false)}
          onSave={(newItem) => {
            // Update the selected row with new item
            updateRow(selectedGoodsService, 'goodsService', newItem.name);
            setShowNewItemSidebar(false);
          }}
        />
      )}
    </div>
  );
};

export default NewSalesInvoice;