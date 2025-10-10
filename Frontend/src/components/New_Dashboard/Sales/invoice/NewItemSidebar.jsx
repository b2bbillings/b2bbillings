// File: D:\b2b Main web\b2bbillings\Frontend\src\components\New_Dashboard\Sales\NewItemSidebar.jsx
import React, { useState } from 'react';

const NewItemSidebar = ({ onClose, onSave }) => {
  const [itemType, setItemType] = useState('Goods');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState('None of the list');
  const [category, setCategory] = useState('None of the list');
  const [unit, setUnit] = useState('');
  const [stockConfig, setStockConfig] = useState('Normal');
  const [sku, setSku] = useState('');
  const [openingQty, setOpeningQty] = useState(0);
  const [openingRate, setOpeningRate] = useState(0);
  const [negativeQtyAllowed, setNegativeQtyAllowed] = useState(true);
  const [showInPurchase, setShowInPurchase] = useState(true);
  const [showInSales, setShowInSales] = useState(true);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [mrp, setMrp] = useState(0);
  const [cessEnabled, setCessEnabled] = useState(false);

  const handleSave = () => {
    onSave({ name, description, mrp, purchasePrice, sellingPrice });
  };

  return (
    <div className="new-item-sidebar-overlay">
      <div className="new-item-sidebar">
        <header>
          <h2>New Item <span className="required">*</span></h2>
          <button onClick={onClose}>✕</button>
        </header>
        <div className="item-type">
          <button 
            className={itemType === 'Goods' ? 'active' : ''}
            onClick={() => setItemType('Goods')}
          >
            Goods
          </button>
          <button 
            className={itemType === 'Service' ? 'active' : ''}
            onClick={() => setItemType('Service')}
          >
            Service
          </button>
        </div>
        <input 
          type="text" 
          placeholder="Enter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required 
        />
        <textarea 
          placeholder="Enter Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option>None of the list</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>None of the list</option>
        </select>
        <input type="text" placeholder="Unit *" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <div className="stock-config">
          <label>Multi Unit Config</label>
          <select>
            <option></option>
          </select>
        </div>
        <div className="manage-stock">
          <label>Manage Stock</label>
          <select value={stockConfig} onChange={(e) => setStockConfig(e.target.value)}>
            <option>Normal</option>
            <option>Batch wise</option>
            <option>Lot wise</option>
          </select>
        </div>
        <input type="text" placeholder="Enter product or SKU here" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input type="number" placeholder="Opening Stock Qty" value={openingQty} onChange={(e) => setOpeningQty(parseFloat(e.target.value) || 0)} />
        <input type="number" placeholder="Opening Stock Rate" value={openingRate} onChange={(e) => setOpeningRate(parseFloat(e.target.value) || 0)} />
        <div className="negative-qty">
          <label>Negative Qty Allowed ?</label>
          <button className={negativeQtyAllowed ? 'active' : ''} onClick={() => setNegativeQtyAllowed(true)}>Yes</button>
          <button className={!negativeQtyAllowed ? 'active' : ''} onClick={() => setNegativeQtyAllowed(false)}>No</button>
        </div>
        <label className="show-toggle">
          <input type="checkbox" checked={showInPurchase} onChange={(e) => setShowInPurchase(e.target.checked)} />
          Show item in Purchase
        </label>
        <label className="show-toggle">
          <input type="checkbox" checked={showInSales} onChange={(e) => setShowInSales(e.target.checked)} />
          Show item in Sales
        </label>
        <input type="number" placeholder="MRP" value={mrp} onChange={(e) => setMrp(parseFloat(e.target.value) || 0)} />
        <input type="number" placeholder="Purchase Price" value={purchasePrice} onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)} />
        <input type="number" placeholder="Sales Price" value={sellingPrice} onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)} />
        <div className="cess-enable">
          <label>Cess Enable</label>
          <button className={cessEnabled ? 'active' : ''} onClick={() => setCessEnabled(true)}>Yes</button>
          <button className={!cessEnabled ? 'active' : ''} onClick={() => setCessEnabled(false)}>No</button>
        </div>
        {/* Additional info placeholders */}
        <div className="info-box">
          <p>ℹ️ Start managing Barcode details for the products. Click here for setting.</p>
        </div>
        <div className="info-box">
          <p>ℹ️ Start managing Manufacturer details for the products. Click here for setting.</p>
        </div>
        <div className="info-box">
          <p>ℹ️ Start managing Product Serial / IMEI No. details for the products. Click here for setting.</p>
        </div>
        <div className="shortcuts">
          <strong>SHORTCUTS:</strong>
          <button>Ctrl + Alt + S Save</button>
          <button>Ctrl + Alt + C Cancel</button>
          <span>←/→ Left/Right Arrow</span>
        </div>
        <footer className="sidebar-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </footer>
      </div>
    </div>
  );
};

export default NewItemSidebar;