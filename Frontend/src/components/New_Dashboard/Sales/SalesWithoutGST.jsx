import React, { useState, useEffect, useRef } from "react";
import styles from "./SalesWithoutGST.module.css";
import ShowHideColumns from "./ShowHideColumns";
import AddItemModal from "../Items/Add_Items";
import EndCustomers from "../New_parties/End_Customer/EndCustomers";
import {
  customerService,
  vendorService,
} from "../../../services/customerVendorService";
import itemService from "../../../services/itemService";
import authService from "../../../services/authService";

const ALWAYS_VISIBLE = [
  { key: "goods", label: "Goods/Service" },
  { key: "qty", label: "Qty" },
  { key: "rate", label: "Rate (₹)" },
  { key: "amount", label: "Amount (₹)" },
];

const TOGGLE_COLUMNS = [
  { key: "challan", label: "Challan No.", visible: false },
  { key: "desc", label: "Description", visible: false },
  { key: "batch", label: "Batch/Lot no.", visible: false },
  { key: "exp", label: "Exp. Date", visible: false },
  { key: "mrp", label: "MRP", visible: false },
  { key: "freeqty", label: "Free QTY", visible: false },
  { key: "disc", label: "Disc.(%/₹)", visible: false },
  { key: "taxable", label: "Taxable Amt.", visible: false },
  { key: "cess", label: "CESS(%)", visible: false },
];

export default function NewSalesInvoice() {
  const [columns, setColumns] = useState(TOGGLE_COLUMNS);
  const [rows, setRows] = useState([
    {
      goods: "",
      challan: "",
      desc: "",
      batch: "",
      exp: "",
      mrp: "",
      qty: "",
      freeqty: "",
      disc: "",
      taxable: "",
      cess: "",
      rate: "",
      amount: "",
    },
  ]);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemRowIndex, setAddItemRowIndex] = useState(null);
  const [customer, setCustomer] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [invoiceNumber, setInvoiceNumber] = useState("0001");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [refNo, setRefNo] = useState("");
  const [depositTo, setDepositTo] = useState("Cash-in-Hand");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [payFull, setPayFull] = useState(false);
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [goodsFocusIndex, setGoodsFocusIndex] = useState(null);
  const [allParties, setAllParties] = useState([]);
  const [partySearch, setPartySearch] = useState("");
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showEndCustomerModal, setShowEndCustomerModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState("");
  const [selectedEndCustomer, setSelectedEndCustomer] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [itemSearch, setItemSearch] = useState(rows.map(() => ""));
  const [showItemDropdown, setShowItemDropdown] = useState(null);

  const partyDropdownRef = useRef();

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
        mrp: "",
        qty: "",
        freeqty: "",
        disc: "",
        taxable: "",
        cess: "",
        rate: "",
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

  // Goods/Service select
  const handleGoodsChange = (rowIdx, value) => {
    if (value === "__create__") {
      setAddItemRowIndex(rowIdx);
      setShowAddItemModal(true);
    } else {
      // Find the selected item
      const selectedItem = allItems.find(
        (item) => item.name === value || item._id === value
      );

      if (selectedItem) {
        // Existing item selected
        setRows((r) =>
          r.map((row, idx) => {
            if (idx === rowIdx) {
              return {
                ...row,
                goods: value,
                rate: selectedItem?.salePrice || row.rate,
              };
            }
            return row;
          })
        );
      } else {
        // Manual entry (not from existing items)
        setRows((r) =>
          r.map((row, idx) => {
            if (idx === rowIdx) {
              return {
                ...row,
                goods: value,
              };
            }
            return row;
          })
        );
      }

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
                rate: item.salePrice || row.rate,
              }
            : row
        )
      );
    }
    setShowAddItemModal(false);
    setAddItemRowIndex(null);

    // Refresh items list to include newly created item
    const fetchItems = async () => {
      try {
        const user = authService.getCurrentUser();
        const companyId =
          user?.companyId || user?.company?._id || user?.company;

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

  // Handle keyboard navigation
  const handleKeyDown = (e, rowIdx, fieldName) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // If in rate field, add new row and focus on goods field of new row
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
        // Move to next field in the same row
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

  // Calculate totals
  const subtotal = rows.reduce(
    (sum, row) => sum + Number(row.qty || 0) * Number(row.rate || 0),
    0
  );
  const total = autoRoundOff ? Math.round(subtotal) : subtotal;

  // Fetch customers and vendors
  useEffect(() => {
    const fetchParties = async () => {
      const customers = await customerService.getAllCustomers();
      const vendors = await vendorService.getAllVendors();

      const customerList = Array.isArray(customers)
        ? customers
        : Array.isArray(customers.data)
        ? customers.data
        : [];
      const vendorList = Array.isArray(vendors)
        ? vendors
        : Array.isArray(vendors.data)
        ? vendors.data
        : [];

      setAllParties([
        ...customerList.map((c) => ({ ...c, type: "Customer" })),
        ...vendorList.map((v) => ({ ...v, type: "Vendor" })),
      ]);
    };
    fetchParties();
  }, []);

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const user = authService.getCurrentUser();
        const companyId =
          user?.companyId || user?.company?._id || user?.company;

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

  // Filtered parties for dropdown
  const filteredParties = allParties.filter(
    (p) =>
      p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
      p.company?.toLowerCase().includes(partySearch.toLowerCase()) ||
      p.phone?.includes(partySearch)
  );

  // Filtered items for dropdown
  const getFilteredItems = (rowIdx) => {
    const search = itemSearch[rowIdx] || "";
    return allItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.category?.name?.toLowerCase().includes(search.toLowerCase())
    );
  };

  // Dropdown close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        partyDropdownRef.current &&
        !partyDropdownRef.current.contains(e.target)
      ) {
        setShowPartyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={styles.fullPageWrapper}>
      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>Create New Sales Invoice</h2>
      </div>

      {/* Customer Info Section */}
      <div className={styles.section + " " + styles.customerInfo}>
        <div className={styles.customerInfoGrid}>
          {/* Select Customer */}
          <div style={{ position: "relative" }}>
            <label>
              Select Customer<span className={styles.required}>*</span>
            </label>
            <div className={styles.customerSelectRow}>
              <input
                className={styles.input}
                placeholder="Search customer or vendor"
                value={selectedParty}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setSelectedParty(e.target.value);
                  setShowPartyDropdown(true);
                }}
                onFocus={() => setShowPartyDropdown(true)}
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document
                      .querySelector('input[name="invoicePrefix"]')
                      ?.focus();
                  }
                }}
              />
            </div>
            {showPartyDropdown && (
              <div className={styles.dropdownMenu} ref={partyDropdownRef}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Search..."
                  value={partySearch}
                  onChange={(e) => setPartySearch(e.target.value)}
                  autoFocus
                />
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {filteredParties.length === 0 && (
                    <div className={styles.dropdownItem}>No results</div>
                  )}
                  {filteredParties.map((party) => (
                    <div
                      key={party._id}
                      className={styles.dropdownItem}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedParty(
                          party.name +
                            (party.company ? ` (${party.company})` : "")
                        );
                        setShowPartyDropdown(false);
                      }}
                    >
                      <span>{party.name}</span>
                      {party.company && (
                        <span style={{ color: "#888" }}>
                          {" "}
                          ({party.company})
                        </span>
                      )}
                      <span
                        style={{
                          float: "right",
                          fontSize: 12,
                          color: "#007bff",
                        }}
                      >
                        {party.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button
              className={styles.endCustomerBtn}
              onClick={() => setShowEndCustomerModal(true)}
              title="Add End Customer"
            >
              + End Customer
            </button>
            {selectedEndCustomer && (
              <div className={styles.selectedEndCustomer}>
                End Customer: {selectedEndCustomer}
              </div>
            )}
          </div>
          {/* Center: Empty */}
          <div />
          {/* Right: Invoice Number + Invoice Date */}
          <div>
            <label>
              Invoice Number<span className={styles.required}>*</span>
            </label>
            <div className={styles.invoiceNumberRow}>
              <input
                className={styles.input}
                style={{ width: 60 }}
                name="invoicePrefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document
                      .querySelector('input[name="invoiceNumber"]')
                      ?.focus();
                  }
                }}
              />
              <input
                className={styles.input}
                style={{ width: 80 }}
                name="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
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
            <label style={{ marginTop: 8, display: "block" }}>
              Invoice Date<span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
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
        </div>
      </div>

      {/* Table Section */}
      <div className={styles.section + " " + styles.tableSection}>
        <div style={{ position: "relative" }}>
          <div className={styles.tableWrapper}>
            <table className={styles.invoiceTable}>
              <thead>
                <tr>
                  <th className={styles.thSr}>SR.NO.</th>
                  <th>Goods/Service</th>
                  {columns
                    .filter((c) => c.visible)
                    .map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  <th>Qty</th>
                  <th>Rate (₹)</th>
                  <th>Amount (₹)</th>
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
                    {/* Goods/Service input */}
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
                                  onClick={() =>
                                    handleGoodsChange(idx, item.name)
                                  }
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
                                    Rate: ₹{item.salePrice || 0}
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
                    {/* Amount */}
                    <td>
                      <input
                        className={styles.input}
                        type="number"
                        value={
                          row.qty && row.rate
                            ? (Number(row.qty) * Number(row.rate)).toFixed(2)
                            : ""
                        }
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
          {showColumnsModal && (
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
          )}
          <button
            className={styles.addRowBtn}
            onClick={handleAddRow}
            style={{ marginLeft: 0, marginTop: 12 }}
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* Payment and Summary sections */}
      <div className={styles.bottomGridCustom}>
        {/* Left: Is Payment Received */}
        <div className={styles.section + " " + styles.paymentSection}>
          <div className={styles.sectionTitle}>
            <input
              type="checkbox"
              checked
              readOnly
              style={{ marginRight: 8 }}
            />
            Is Payment Received?
          </div>
          <div className={styles.paymentGrid}>
            <div>
              <label>Payment Mode</label>
              <select
                className={styles.input}
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option>Cash</option>
                <option>Bank</option>
                <option>UPI</option>
              </select>
            </div>
            <div>
              <label>Ref. No.</label>
              <input
                className={styles.input}
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </div>
            <div>
              <label>Deposit to</label>
              <select
                className={styles.input}
                value={depositTo}
                onChange={(e) => setDepositTo(e.target.value)}
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
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <label style={{ marginLeft: 8 }}>
                <input
                  type="checkbox"
                  checked={payFull}
                  onChange={(e) => setPayFull(e.target.checked)}
                />
                Pay full
              </label>
            </div>
          </div>
          <button className={styles.addMorePaymentBtn}>
            + Add More Payment
          </button>
        </div>
        {/* Center: Empty */}
        <div />
        {/* Right: Summary */}
        <div className={styles.section + " " + styles.summarySection}>
          <div className={styles.sectionTitle}>Summary</div>
          <div className={styles.summaryRow}>
            <span>Taxable Amt.</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <button className={styles.linkBtn}>
            + Add service charge with tax
          </button>
          <div className={styles.summaryRow}>
            <span>Sub Total</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Discount</span>
            <input
              className={styles.input}
              type="number"
              style={{ width: 60 }}
            />
          </div>
          <button className={styles.linkBtn}>+ Add another charges</button>
          <div className={styles.summaryRow}>
            <label>
              <input
                type="checkbox"
                checked={autoRoundOff}
                onChange={(e) => setAutoRoundOff(e.target.checked)}
              />
              Auto Round Off
            </label>
            <span>₹{(autoRoundOff ? Math.round(subtotal) - subtotal : 0).toFixed(2)}</span>
          </div>
          <div className={styles.summaryTotalRow}>
            <span>Total Amount</span>
            <span>₹{total.toFixed(2)}</span>
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

      {/* End Customer Modal */}
      {showEndCustomerModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowEndCustomerModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              onClick={() => setShowEndCustomerModal(false)}
            >
              ×
            </button>
            <EndCustomers
              onSelect={(customer) => {
                setSelectedEndCustomer(customer.customerName);
                setShowEndCustomerModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}