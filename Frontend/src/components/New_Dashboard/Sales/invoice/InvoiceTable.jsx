// File: D:\b2b Main web\b2bbillings\Frontend\src\components\New_Dashboard\Sales\InvoiceTable.jsx
import React from 'react';

const InvoiceTable = ({ rows, visibleColumns, onAddRow, onGoodsServiceClick, onUpdateRow }) => {
  const columns = [
    { key: 'srNo', label: 'SR. NO.', visible: true },
    { key: 'goodsService', label: 'GOODS/SERVICE', visible: true },
    ...(visibleColumns.challanNo ? [{ key: 'challanNo', label: 'Challan No.', visible: true }] : []),
    ...(visibleColumns.description ? [{ key: 'description', label: 'Description', visible: true }] : []),
    ...(visibleColumns.batchLot ? [{ key: 'batchLot', label: 'BATCH/LOT NO.', visible: true }] : []),
    ...(visibleColumns.expDate ? [{ key: 'expDate', label: 'EXP. DATE', visible: true }] : []),
    ...(visibleColumns.mrp ? [{ key: 'mrp', label: 'MRP', visible: true }] : []),
    { key: 'qty', label: 'QTY', visible: visibleColumns.qty },
    { key: 'rate', label: 'RATE (₹)', visible: visibleColumns.rate },
    { key: 'amount', label: 'AMOUNT (₹)', visible: visibleColumns.amount },
    ...(visibleColumns.discPercent ? [{ key: 'discPercent', label: 'Disc.(%/₹)', visible: true }] : []),
    ...(visibleColumns.taxableAmt ? [{ key: 'taxableAmt', label: 'Taxable Amt.', visible: true }] : []),
    ...(visibleColumns.cessPercent ? [{ key: 'cessPercent', label: 'CESS(%)', visible: true }] : []),
  ];

  return (
    <section className="invoice-table-section">
      <div className="table-header">
        {columns.map(col => col.visible && (
          <div key={col.key} className={`table-col-header ${col.key}`}>
            {col.label}
          </div>
        ))}
        <div className="table-col-header actions">Actions</div>
      </div>
      <div className="table-body">
        {rows.map(row => (
          <div key={row.id} className="table-row">
            {columns.map(col => col.visible && (
              <div key={col.key} className={`table-cell ${col.key}`}>
                {col.key === 'srNo' ? row.id : 
                 col.key === 'goodsService' ? (
                  <select 
                    value={row.goodsService} 
                    onChange={(e) => onUpdateRow(row.id, 'goodsService', e.target.value)}
                    onClick={() => onGoodsServiceClick(row.id)}
                  >
                    <option>Please select goods/service</option>
                    <option>Create New Item</option>
                  </select>
                ) : col.key === 'qty' ? (
                  <input 
                    type="number" 
                    value={row.qty} 
                    onChange={(e) => onUpdateRow(row.id, 'qty', parseFloat(e.target.value) || 0)}
                  />
                ) : col.key === 'rate' ? (
                  <input 
                    type="number" 
                    value={row.rate} 
                    onChange={(e) => onUpdateRow(row.id, 'rate', parseFloat(e.target.value) || 0)}
                  />
                ) : col.key === 'amount' ? row.amount || 0 :
                 <input type="text" value={row[col.key] || ''} onChange={(e) => onUpdateRow(row.id, col.key, e.target.value)} />
                }
              </div>
            ))}
            <div className="table-cell actions">
              {/* Delete button placeholder */}
            </div>
          </div>
        ))}
        <div className="table-row subtotal">
          <div className="table-cell subtotal-label">Subtotal</div>
          <div className="table-cell subtotal-value"></div>
          {/* Empty cells for other columns */}
          {columns.slice(1).map((_, index) => <div key={index} className="table-cell"></div>)}
          <div className="table-cell subtotal-amount">0.00</div>
        </div>
      </div>
      <button className="btn-add-row" onClick={onAddRow}>➕ Add Row</button>
    </section>
  );
};

export default InvoiceTable;