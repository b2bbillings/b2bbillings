import React, { useState, useEffect, useRef } from "react";
import "./ItemCreateDrawer.css";

export default function ItemCreateDrawer({ open, onClose, onSave }) {
  if (!open) return null;

  const [type, setType] = useState("Goods");
  const formRef = useRef(null);

  const handleTypeChange = (e) => {
    setType(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Collect and validate form data here
    const formData = new FormData(e.target);
    const itemName = formData.get("name");
    onSave(itemName || "New Item Name");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // CTRL + ALT + S = Save
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      }
      // CTRL + ALT + C = Cancel
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className="drawerBackdrop">
      <div className="drawer">
        <div className="header">
          <span>New Item</span>
          <button className="closeBtn" onClick={onClose}>×</button>
        </div>
        <form
          ref={formRef}
          className="form"
          onSubmit={handleSubmit}
        >
          <div className="formGroup">
            <label>Type</label>
            <div>
              <label>
                <input
                  type="radio"
                  name="type"
                  value="Goods"
                  checked={type === "Goods"}
                  onChange={handleTypeChange}
                />{" "}
                Goods
              </label>
              <label style={{ marginLeft: 16 }}>
                <input
                  type="radio"
                  name="type"
                  value="Service"
                  checked={type === "Service"}
                  onChange={handleTypeChange}
                />{" "}
                Service
              </label>
            </div>
          </div>

          {/* Common fields for both Goods and Service */}
          <div className="formRow">
            <div className="formGroup">
              <label>Name<span style={{ color: "#e53935" }}>*</span></label>
              <input
                className="input"
                name="name"
                required
                placeholder="Enter Name"
                autoFocus
              />
            </div>
            <div className="formGroup">
              <label>Description</label>
              <textarea className="input" name="description" placeholder="Enter Description" maxLength={3000} />
            </div>
          </div>
          {/* Conditional fields based on type */}
          {type === "Goods" && (
            <>
              <div className="formRow">
                <div className="formGroup">
                  <label>Group</label>
                  <select className="input" name="group" defaultValue="None of the list">
                    <option>None of the list</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Category</label>
                  <select className="input" name="category" defaultValue="None of the list">
                    <option>None of the list</option>
                  </select>
                </div>
              </div>
              <div className="formRow">
                <div className="formGroup">
                  <label>Unit<span style={{ color: "#e53935" }}>*</span></label>
                  <select className="input" name="unit" defaultValue="Multi Unit">
                    <option>Multi Unit</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Manage stock</label>
                  <div>
                    <label>
                      <input type="radio" name="stock" value="normal" defaultChecked /> Normal
                    </label>
                    <label style={{ marginLeft: 16 }}>
                      <input type="radio" name="stock" value="batch" /> Batch wise
                    </label>
                    <label style={{ marginLeft: 16 }}>
                      <input type="radio" name="stock" value="lot" /> Lot wise
                    </label>
                  </div>
                </div>
              </div>
              <div className="formRow">
                <div className="formGroup">
                  <label>SKU / Goods Code</label>
                  <input className="input" name="sku" placeholder="Enter product or SKU here" />
                </div>
                <div className="formGroup">
                  <label>Opening Stock Qty</label>
                  <input className="input" name="openingStockQty" type="number" defaultValue="0" />
                </div>
              </div>
              <div className="formRow">
                <div className="formGroup">
                  <label>Opening Stock Rate</label>
                  <input className="input" name="openingStockRate" type="number" defaultValue="0" />
                </div>
                <div className="formGroup">
                  <label>Opening Stock Value</label>
                  <input className="input" name="openingStockValue" type="number" step="0.01" defaultValue="0.00" />
                </div>
              </div>
              <div className="formGroup">
                <label>Negative Qty Allowed</label>
                <div>
                  <label>
                    <input type="radio" name="negativeQty" value="yes" defaultChecked /> Yes
                  </label>
                  <label style={{ marginLeft: 16 }}>
                    <input type="radio" name="negativeQty" value="no" /> No
                  </label>
                </div>
              </div>
              <div className="formGroup">
                <label>Show Item In Purchase</label>
                <input type="checkbox" name="showInPurchase" defaultChecked />
              </div>
              <div className="formGroup">
                <label>Show Item In Sales</label>
                <input type="checkbox" name="showInSales" defaultChecked />
              </div>
              <div className="formGroup">
                <label>MRP</label>
                <input className="input" name="mrp" type="number" step="0.01" defaultValue="0.00" />
              </div>
              <div className="formGroup">
                <label>Old MRP</label>
                <input className="input" name="oldMrp" type="number" step="0.01" defaultValue="0.00" />
              </div>
              <div className="formGroup">
                <label>Purchase Price</label>
                <input className="input" name="purchasePrice" type="number" defaultValue="0" />
              </div>
              <div className="formGroup">
                <label>Sales Price</label>
                <input className="input" name="salesPrice" type="number" defaultValue="0" />
              </div>
              <div className="formGroup">
                <label>Cess Enable</label>
                <div>
                  <label>
                    <input type="radio" name="cess" value="yes" /> Yes
                  </label>
                  <label style={{ marginLeft: 16 }}>
                    <input type="radio" name="cess" value="no" defaultChecked /> No
                  </label>
                </div>
              </div>
              {/* <div className="formGroup">
                <button type="button" className="infoBtn">Start managing Barcode details for the products. Click here for setting.</button>
              </div>
              <div className="formGroup">
                <button type="button" className="infoBtn">Start managing Manufacturer details for the products. Click here for setting.</button>
              </div>
              <div className="formGroup">
                <button type="button" className="infoBtn">Start managing Product Serial / IMEI No. details for the products. Click here for setting.</button>
              </div> */}
            </>
          )}

          {type === "Service" && (
            <>
              <div className="formGroup">
                <label>Unit</label>
                <select className="input" name="unit" defaultValue="">
                  <option value="">Select Unit</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Show Item In Purchase</label>
                <input type="checkbox" name="showInPurchase" defaultChecked />
              </div>
              <div className="formGroup">
                <label>Show Item In Sales</label>
                <input type="checkbox" name="showInSales" defaultChecked />
              </div>
              <div className="formGroup">
                <label>Purchase Price</label>
                <input className="input" name="purchasePrice" type="number" defaultValue="0" />
              </div>
              <div className="formGroup">
                <label>Sales Price</label>
                <input className="input" name="salesPrice" type="number" defaultValue="0" />
              </div>
            </>
          )}

          <div className="formGroup">
            <label>Shortcuts:</label>
            <div className="shortcuts">
              <span><span className="shortcutKey">Ctrl</span> + <span className="shortcutKey">Alt</span> + <span className="shortcutKey">S</span> Save</span>
              <span><span className="shortcutKey">Ctrl</span> + <span className="shortcutKey">Alt</span> + <span className="shortcutKey">C</span> Cancel</span>
              <span><span className="shortcutKey">←</span>/<span className="shortcutKey">→</span> Move</span>
            </div>
          </div>
          <div className="footer">
            <button type="button" className="cancelBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="saveBtn">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}