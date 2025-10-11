import React, { useState } from "react";
import styles from "./NewSalesInvoice.module.css";

export default function CreateNewItemDrawer({ onClose, onSave }) {
  const [itemName, setItemName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (itemName.trim()) {
      onSave(itemName.trim());
    }
  };

  return (
    <div className={styles.drawerBackdrop}>
      <div className={styles.drawer}>
        <h4>Create New Item</h4>
        <form onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            placeholder="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            autoFocus
          />
          <div className={styles.drawerActions}>
            <button className={styles.btn} type="submit">
              Save
            </button>
            <button className={styles.btn} type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}