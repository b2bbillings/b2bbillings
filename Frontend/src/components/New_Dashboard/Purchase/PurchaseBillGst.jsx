import React, { useState, useEffect, useRef } from "react";
import styles from "./PurchaseBillGst.module.css"; // Added import for CSS module
import AddItemModal from "../Items/Add_Items";
import { vendorService } from "../../../services/customerVendorService";
import itemService from "../../../services/itemService";
import authService from "../../../services/authService";
// import purchaseBillService from "../../../services/purchaseBillService"; // Uncomment if needed, ensure implementation exists

// Note: ShowHideColumns import is commented out. If you need to use it, uncomment and implement the component.
// import ShowHideColumns from "./ShowHideColumns";

const TOGGLE_COLUMNS = [
  { key: "challan", label: "Challan No.", visible: false },
  { key: "desc", label: "Description", visible: false },
  { key: "batch", label: "Batch/Lot no.", visible: false },
  { key: "exp", label: "Exp. Date", visible: false },
  { key: "disc", label: "Disc.(%/₹)", visible: false },
  { key: "taxable", label: "Taxable Amt.", visible: false },
  { key: "cess", label: "CESS(%)", visible: false },
];

function PurchaseBillGst() {
  const [columns, setColumns] = useState(TOGGLE_COLUMNS);
  const [rows, setRows] = useState([
    {
      goods: "",
      challan: "",
      desc: "",
      batch: "",
      exp: "",
      qty: "",
      disc: "",
      taxable: "",
      cess: "",
      rate: "",
      gst: "",
      gstType: "include", // "include" or "exclude"
      amount: "",
    },
  ]);

  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemRowIndex, setAddItemRowIndex] = useState(null);

  // Bill info
  const [billPrefix, setBillPrefix] = useState("PB");
  const [billNumber, setBillNumber] = useState("0001");
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [terms, setTerms] = useState("");
  const [bookName, setBookName] = useState("");
  const [poNo, setPoNo] = useState("");

  // Payment info
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [refNo, setRefNo] = useState("");
  const [paidFrom, setPaidFrom] = useState("Cash-in-Hand");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [payFull, setPayFull] = useState(false);

  // Other
  const [specialNotes, setSpecialNotes] = useState("");
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [discount, setDiscount] = useState(0);

  // Vendor
  const [allVendors, setAllVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Items
  const [allItems, setAllItems] = useState([]);
  const [itemSearch, setItemSearch] = useState(rows.map(() => ""));
  const [showItemDropdown, setShowItemDropdown] = useState(null);
  const [goodsFocusIndex, setGoodsFocusIndex] = useState(null);

  const vendorDropdownRef = useRef();

  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      const result = await vendorService.getAllVendors();
      const vendorList = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
        ? result.data
        : [];
      setAllVendors(vendorList);
    };
    fetchVendors();
  }, []);

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const user = authService.getCurrentUser();
        const companyId = user?.companyId || user?.company?._id || user?.company;

        if (companyId) {
          const result = await itemService.getItems(companyId);
          if (result.success) {
            setAllItems(result.data || []);
          }
        }
      } catch (err) {
        console.error("Error fetching items:", err);
      }
    };
    fetchItems();
  }, []);

  // Add row
  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        goods: "",
        challan: "",
        desc: "",
        batch: "",
        exp: "",
        qty: "",
        disc: "",
        taxable: "",
        cess: "",
        rate: "",
        gst: "",
        gstType: "include",
        amount: "",
      },
    ]);
    setItemSearch((prev) => [...prev, ""]);
  };

  // Toggle columns
  const handleColumnToggle = (key) => {
    setColumns((cols) =>
      cols.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  // Handle goods selection
  const handleGoodsChange = (rowIdx, value) => {
    if (value === "__create__") {
      setAddItemRowIndex(rowIdx);
      setShowAddItemModal(true);
    } else {
      const selectedItem = allItems.find((item) => item.name === value || item._id === value);

      setRows((r) =>
        r.map((row, idx) => {
          if (idx === rowIdx) {
            return {
              ...row,
              goods: value,
              rate: selectedItem?.purchasePrice || row.rate,
              gst: selectedItem?.gstRate || row.gst,
            };
          }
          return row;
        })
      );

      setItemSearch((prev) => prev.map((v, i) => (i === rowIdx ? "" : v)));
      setShowItemDropdown(null);
    }
  };

  // When item is created in modal
  const handleItemCreated = (item) => {
    if (addItemRowIndex !== null) {
      setRows((r) =>
        r.map((row, idx) =>
          idx === addItemRowIndex
            ? {
                ...row,
                goods: item.name,
                rate: item.purchasePrice || row.rate,
                gst: item.gstRate || row.gst,
              }
            : row
        )
      );
    }
    setShowAddItemModal(false);
    setAddItemRowIndex(null);

    // Refresh items list
    const fetchItems = async () => {
      try {
        const user = authService.getCurrentUser();
        const companyId = user?.companyId || user?.company?._id || user?.company;
        if (companyId) {
          const result = await itemService.getItems(companyId);
          if (result.success) {
            setAllItems(result.data || []);
          }
        }
      } catch (err) {
        console.error("Error fetching items:", err);
      }
    };
    fetchItems();
  };

  // Calculate amount per row based on GST type
  const calculateRowAmount = (row) => {
    const qty = Number(row.qty) || 0;
    const rate = Number(row.rate) || 0;
    const gst = Number(row.gst) || 0;
    const baseAmount = qty * rate;

    if (row.gstType === "include") {
      // GST included in rate
      return baseAmount;
    } else {
      // GST excluded - add GST to base amount
      return baseAmount * (1 + gst / 100);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    let taxableAmt = 0;
    let gstAmt = 0;

    rows.forEach((row) => {
      const qty = Number(row.qty) || 0;
      const rate = Number(row.rate) || 0;
      const gst = Number(row.gst) || 0;
      const baseAmount = qty * rate;

      if (row.gstType === "include") {
        // GST included - extract taxable and GST amounts
        const taxable = baseAmount / (1 + gst / 100);
        taxableAmt += taxable;
        gstAmt += baseAmount - taxable;
      } else {
        // GST excluded - base is taxable, calculate GST separately
        taxableAmt += baseAmount;
        gstAmt += baseAmount * (gst / 100);
      }
    });

    const subTotal = taxableAmt + gstAmt;
    const afterDiscount = subTotal - Number(discount);
    const total = autoRoundOff ? Math.round(afterDiscount) : afterDiscount;
    const roundOffAmt = autoRoundOff ? total - afterDiscount : 0;

    return { taxableAmt, gstAmt, subTotal, afterDiscount, total, roundOffAmt };
  };

  const totals = calculateTotals();

  // Keyboard navigation
  const handleKeyDown = (e, rowIdx, fieldName) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (fieldName === "rate") {
        handleAddRow();
        setTimeout(() => {
          const newRowIndex = rows.length;
          const goodsInput = document.querySelector(
            `input[data-row="${newRowIndex}"][data-field="goods"]`
          );
          if (goodsInput) goodsInput.focus();
        }, 50);
      } else {
        const currentInput = e.target;
        const allInputs = Array.from(
          document.querySelectorAll(
            `input[data-row="${rowIdx}"], select[data-row="${rowIdx}"]`
          )
        );
        const currentIndex = allInputs.indexOf(currentInput);
        if (currentIndex < allInputs.length - 1) {
          allInputs[currentIndex + 1].focus();
        }
      }
    }
  };

  // Filtered vendors
  const filteredVendors = allVendors.filter(
    (v) =>
      v.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.phone?.includes(vendorSearch)
  );

  // Filtered items
  const getFilteredItems = (rowIdx) => {
    const search = itemSearch[rowIdx] || "";
    return allItems.filter((item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.name?.toLowerCase().includes(search.toLowerCase())
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        vendorDropdownRef.current &&
        !vendorDropdownRef.current.contains(e.target)
      ) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Save purchase bill
  // Note: Ensure purchaseBillService is implemented and imported if this function is used
  const handleSaveBill = async () => {
    const billData = {
      billPrefix,
      billNumber,
      billDate,
      dueDate,
      vendor: selectedVendor,
      items: rows.map((row) => ({
        goods: row.goods,
        quantity: Number(row.qty) || 0,
        rate: Number(row.rate) || 0,
        gstRate: Number(row.gst) || 0,
        gstType: row.gstType,
        amount: calculateRowAmount(row),
      })),
      payment: {
        amount: Number(paymentAmount) || 0,
        mode: paymentMode,
        refNo,
        paidFrom,
        payFull,
      },
      specialNotes,
      terms,
      bookName,
      poNo,
      discount: Number(discount),
      autoRoundOff,
      totals,
    };

    try {
      // Uncomment the purchaseBillService import and ensure the service is implemented
      // const result = await purchaseBillService.createPurchaseBill(billData);
      // if (result && result.success !== false) {
      //   alert("Purchase Bill created successfully!");
      // } else {
      //   alert("Failed to create purchase bill: " + (result.message || "Unknown error"));
      // }
      console.log("Bill data to be saved:", billData); // Temporary log for testing
    } catch (err) {
      alert("Error creating purchase bill: " + err.message);
    }
  };

  return (
    <div className={styles.fullPageWrapper}>
      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>Create Purchase Bill</h2>
      </div>

      {/* Vendor Info Section */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Vendor Info.</div>
        <div className={styles.vendorInfoGrid}>
          {/* Vendor */}
          <div style={{ position: "relative" }}>
            <label>
              Vendor<span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              placeholder="Please select vendor"
              value={selectedVendor?.name || vendorSearch}
              onChange={(e) => {
                setVendorSearch(e.target.value);
                setShowVendorDropdown(true);
              }}
              onFocus={() => setShowVendorDropdown(true)}
              autoComplete="off"
            />
            {showVendorDropdown && (
              <div className={styles.dropdownMenu} ref={vendorDropdownRef}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Search..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  autoFocus
                />
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {filteredVendors.length === 0 && (
                    <div className={styles.dropdownItem}>No results</div>
                  )}
                  {filteredVendors.map((vendor) => (
                    <div
                      key={vendor._id}
                      className={styles.dropdownItem}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setVendorSearch("");
                        setShowVendorDropdown(false);
                      }}
                    >
                      <span>{vendor.name}</span>
                      {vendor.phone && (
                        <span style={{ color: "#888", fontSize: 12, marginLeft: 6 }}>
                          {vendor.phone}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile No */}
          <div>
            <label>Mobile No.</label>
            <input
              className={styles.input}
              value={selectedVendor?.phone || ""}
              placeholder="99XXXXXX01"
              disabled
            />
          </div>

          {/* Email */}
          <div>
            <label>Email</label>
            <input
              className={styles.input}
              value={selectedVendor?.email || ""}
              placeholder="example@domain.com"
              disabled
            />
          </div>

          {/* Bill No */}
          <div>
            <label>
              Bill No.<span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              value={billPrefix + billNumber}
              onChange={(e) => {
                const value = e.target.value.replace(billPrefix, "");
                setBillNumber(value);
              }}
            />
          </div>

          {/* Bill Series No */}
          <div>
            <label>
              Bill Series No.<span className={styles.required}>*</span>
            </label>
            <div className={styles.billSeriesRow}>
              <input
                className={styles.input}
                style={{ width: 60 }}
                value={billPrefix}
                onChange={(e) => setBillPrefix(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.querySelector('input[name="billNumber"]')?.focus();
                  }
                }}
              />
              <input
                className={styles.input}
                style={{ width: 80 }}
                name="billNumber"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.querySelector('input[type="date"]')?.focus();
                  }
                }}
              />
              <input
                className={styles.input}
                style={{ width: 60 }}
                value="Suffix"
                disabled
              />
            </div>
          </div>

          {/* Bill Date */}
          <div>
            <label>
              Bill Date<span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              className={styles.input}
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const firstGoodsInput = document.querySelector(
                    'input[data-row="0"][data-field="goods"]'
                  );
                  if (firstGoodsInput) firstGoodsInput.focus();
                }
              }}
            />
          </div>

          {/* Due Date */}
          <div>
            <label>Due Date</label>
            <input
              type="date"
              className={styles.input}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Terms (Days) */}
          <div>
            <label>Terms (Days)</label>
            <input
              className={styles.input}
              placeholder="Terms (Days)"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </div>

          {/* Book Name */}
          <div>
            <label>Book Name</label>
            <select
              className={styles.input}
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Book 1">Book 1</option>
              <option value="Book 2">Book 2</option>
            </select>
          </div>

          {/* PO No */}
          <div>
            <label>PO No</label>
            <input
              className={styles.input}
              placeholder="A0001Z"
              value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Items Table Section */}
      <div className={styles.section + " " + styles.tableSection}>
        <div style={{ position: "relative" }}>
          <div className={styles.tableWrapper}>
            <table className={styles.invoiceTable}>
              <thead>
                <tr>
                  <th className={styles.thSr}>SR.NO.</th>
                  <th>GOODS/SERVICE</th>
                  {columns
                    .filter((c) => c.visible)
                    .map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  <th>QTY</th>
                  <th>RATE (₹)</th>
                  <th>GST (%)</th>
                  <th>AMOUNT (₹)</th>
                  <th className={styles.showHideColTh}>
                    <button
                      className={styles.showHideBtn}
                      title="Show/Hide columns"
                      onClick={() => setShowColumnsModal((v) => !v)}
                      tabIndex={0}
                    >
                      <span style={{ fontSize: 18 }}>⇅</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td className={styles.thSr}>{idx + 1}</td>

                    {/* Goods/Service */}
                    <td style={{ position: "relative" }}>
                      <div className={styles.goodsServiceSelectWrapper}>
                        <input
                          className={styles.input}
                          placeholder="Search or select item"
                          value={row.goods}
                          onChange={(e) => {
                            const value = e.target.value;
                            setRows((r) =>
                              r.map((row2, i) =>
                                i === idx ? { ...row2, goods: value } : row2
                              )
                            );
                            setItemSearch((prev) =>
                              prev.map((v, i) => (i === idx ? value : v))
                            );
                            setShowItemDropdown(idx);
                          }}
                          style={{ width: "100%" }}
                          onFocus={() => {
                            setGoodsFocusIndex(idx);
                            setShowItemDropdown(idx);
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setGoodsFocusIndex(null);
                              setShowItemDropdown(null);
                            }, 200);
                          }}
                          data-row={idx}
                          data-field="goods"
                          onKeyDown={(e) => handleKeyDown(e, idx, "goods")}
                          autoComplete="off"
                        />
                      </div>
                      {showItemDropdown === idx && (
                        <div className={styles.itemDropdownMenu}>
                          {getFilteredItems(idx).length > 0 ? (
                            <>
                              {getFilteredItems(idx).map((item) => (
                                <div
                                  key={item._id}
                                  className={styles.itemDropdownItem}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleGoodsChange(idx, item.name)}
                                >
                                  <div>
                                    <strong>{item.name}</strong>
                                    {item.category?.name && (
                                      <span
                                        style={{
                                          color: "#888",
                                          fontSize: 11,
                                          marginLeft: 6,
                                        }}
                                      >
                                        {item.category.name}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "#666",
                                      marginTop: 2,
                                    }}
                                  >
                                    Rate: ₹{item.purchasePrice || 0} | GST:{" "}
                                    {item.gstRate || 0}%
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className={styles.itemDropdownItem}>
                              No items found
                            </div>
                          )}
                        </div>
                      )}
                      {goodsFocusIndex === idx && (
                        <div className={styles.createNewItemRow}>
                          <button
                            type="button"
                            className={styles.createNewItemBtn}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleGoodsChange(idx, "__create__")}
                          >
                            + Create new item
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Toggleable columns */}
                    {columns
                      .filter((c) => c.visible)
                      .map((col) => (
                        <td key={col.key}>
                          <input
                            className={styles.input}
                            type="text"
                            value={row[col.key]}
                            onChange={(e) =>
                              setRows((r) =>
                                r.map((row2, i) =>
                                  i === idx
                                    ? { ...row2, [col.key]: e.target.value }
                                    : row2
                                )
                              )
                            }
                            data-row={idx}
                            data-field={col.key}
                            onKeyDown={(e) => handleKeyDown(e, idx, col.key)}
                          />
                        </td>
                      ))}

                    {/* Qty */}
                    <td>
                      <input
                        className={styles.input}
                        type="number"
                        value={row.qty}
                        onChange={(e) =>
                          setRows((r) =>
                            r.map((row2, i) =>
                              i === idx ? { ...row2, qty: e.target.value } : row2
                            )
                          )
                        }
                        data-row={idx}
                        data-field="qty"
                        onKeyDown={(e) => handleKeyDown(e, idx, "qty")}
                      />
                    </td>

                    {/* Rate */}
                    <td>
                      <input
                        className={styles.input}
                        type="number"
                        value={row.rate}
                        onChange={(e) =>
                          setRows((r) =>
                            r.map((row2, i) =>
                              i === idx ? { ...row2, rate: e.target.value } : row2
                            )
                          )
                        }
                        data-row={idx}
                        data-field="rate"
                        onKeyDown={(e) => handleKeyDown(e, idx, "rate")}
                      />
                    </td>

                    {/* GST with Include/Exclude */}
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          className={styles.input}
                          type="number"
                          style={{ width: 70 }}
                          value={row.gst}
                          onChange={(e) =>
                            setRows((r) =>
                              r.map((row2, i) =>
                                i === idx ? { ...row2, gst: e.target.value } : row2
                              )
                            )
                          }
                          data-row={idx}
                          data-field="gst"
                          onKeyDown={(e) => handleKeyDown(e, idx, "gst")}
                        />
                        <select
                          className={styles.input}
                          style={{ fontSize: 12, padding: "4px 6px" }}
                          value={row.gstType}
                          onChange={(e) =>
                            setRows((r) =>
                              r.map((row2, i) =>
                                i === idx ? { ...row2, gstType: e.target.value } : row2
                              )
                            )
                          }
                          data-row={idx}
                          data-field="gstType"
                        >
                          <option value="include">Include</option>
                          <option value="exclude">Exclude</option>
                        </select>
                      </div>
                    </td>

                    {/* Amount */}
                    <td>
                      <input
                        className={styles.input}
                        type="number"
                        value={calculateRowAmount(row).toFixed(2)}
                        disabled
                        style={{ background: "#f9fafb" }}
                      />
                    </td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note: ShowHideColumns is commented out due to missing import. Uncomment and implement if needed. */}
          {/* {showColumnsModal && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                zIndex: 10,
              }}
            >
              <ShowHideColumns
                columns={columns}
                onToggle={handleColumnToggle}
                onClose={() => setShowColumnsModal(false)}
                dropdown
              />
            </div>
          )} */}

          <button
            className={styles.addRowBtn}
            onClick={handleAddRow}
            style={{ marginLeft: 0, marginTop: 12 }}
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* Bottom Section: Special Notes, Payment & Summary */}
      <div className={styles.bottomGridCustom}>
        {/* Left: Special Notes */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Special Notes</div>
          <textarea
            className={styles.input}
            rows="4"
            placeholder="Write your special notes for this purchase bill."
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            maxLength={1000}
            style={{ resize: "vertical", minHeight: "100px" }}
          />
          <div style={{ textAlign: "right", fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {specialNotes.length}/1000
          </div>
        </div>

        {/* Center: Empty */}
        <div />

        {/* Right: Payment & Summary */}
        <div>
          {/* Payment Detail */}
          <div className={styles.section + " " + styles.paymentSection}>
            <div className={styles.sectionTitle}>
              <input
                type="checkbox"
                checked
                readOnly
                style={{ marginRight: 8 }}
              />
              Payment Detail
            </div>
            <div className={styles.paymentGrid}>
              <div>
                <label>Mode</label>
                <select
                  className={styles.input}
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option>Cash</option>
                  <option>Bank</option>
                  <option>UPI</option>
                  <option>Cheque</option>
                  <option>Credit Card</option>
                </select>
              </div>
              <div>
                <label>Ref. No.</label>
                <input
                  className={styles.input}
                  placeholder="AD/0102"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                />
              </div>
              <div>
                <label>Paid from</label>
                <select
                  className={styles.input}
                  value={paidFrom}
                  onChange={(e) => setPaidFrom(e.target.value)}
                >
                  <option>Cash-in-Hand</option>
                  <option>Bank Account</option>
                </select>
              </div>
              <div>
                <label>Amount (₹)</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <label style={{ marginLeft: 8, marginTop: 8, display: "block" }}>
                  <input
                    type="checkbox"
                    checked={payFull}
                    onChange={(e) => setPayFull(e.target.checked)}
                  />
                  {" "}Pay full
                </label>
              </div>
            </div>
            <button className={styles.addMorePaymentBtn}>
              + Add Payment
            </button>
          </div>

          {/* Summary */}
          <div className={styles.section + " " + styles.summarySection} style={{ marginTop: 20 }}>
            <div className={styles.sectionTitle}>Summary</div>
            <div className={styles.summaryRow}>
              <span>Taxable Amt.</span>
              <span>₹{totals.taxableAmt.toFixed(2)}</span>
            </div>
            <button className={styles.linkBtn}>
              + Add service charge with tax
            </button>
            <div className={styles.summaryRow}>
              <span>Total Taxable Amt.</span>
              <span>₹{totals.taxableAmt.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Sub Total</span>
              <span>₹{totals.subTotal.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Discount</span>
              <input
                className={styles.input}
                type="number"
                style={{ width: 80 }}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <button className={styles.linkBtn}>+ Add Another Charges</button>
            <div className={styles.summaryRow}>
              <label>
                <input
                  type="checkbox"
                  checked={autoRoundOff}
                  onChange={(e) => setAutoRoundOff(e.target.checked)}
                />
                {" "}Auto Round Off
              </label>
              <span>₹{totals.roundOffAmt.toFixed(2)}</span>
            </div>
            <div className={styles.summaryTotalRow}>
              <span>Total Amount</span>
              <span>₹{totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for create new item */}
      {showAddItemModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowAddItemModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              onClick={() => setShowAddItemModal(false)}
            >
              ×
            </button>
            <AddItemModal
              show={showAddItemModal}
              onHide={() => setShowAddItemModal(false)}
              onItemCreated={handleItemCreated}
            />
          </div>
        </div>
      )}

      {/* Save Button */}
      <div style={{ marginTop: 24, textAlign: "right" }}>
        <button className={styles.saveBtn} onClick={handleSaveBill}>
          Save Purchase Bill
        </button>
      </div>
    </div>
  );
}

export default PurchaseBillGst;