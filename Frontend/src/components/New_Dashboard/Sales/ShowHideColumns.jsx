import React from "react";
import styles from "./ShowHideColumnsDropdown.module.css";

export default function ShowHideColumns({ columns, onToggle, onClose, dropdown, gstType, gstValues, handleGstValueChange }) {
  // dropdown prop triggers dropdown style (no modal background)
  return (
    <div className={dropdown ? styles.dropdown : styles.modalBackdrop}>
      <div className={dropdown ? styles.dropdownPanel : styles.modal}>
        {dropdown && <div className={styles.arrowUp} />}
        <ul className={styles.columnList}>
          {columns.map((col, idx) => (
            <li key={col.key} className={styles.columnItem}>
              <label>
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => onToggle(col.key)}
                />
                <span className={styles.labelText}>{col.label}</span>
              </label>
              {col.key === "gst" && (
                <>
                  {gstType[idx] === "GST" ? (
                    <>
                      <span style={{ fontWeight: 500, marginRight: 4 }}>GST</span>
                      <input
                        className={styles.input}
                        type="number"
                        placeholder="GST %"
                        style={{ width: 40, marginTop: 2 }}
                        value={gstValues[idx] || ""}
                        onChange={e => handleGstValueChange(idx, e.target.value)}
                      />
                    </>
                  ) : (
                    <span style={{ fontWeight: 500 }}>Without GST</span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        <div className={styles.dropdownActions}>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}