import React, { useState, useEffect, useRef } from "react";
import styles from "./NewSalesInvoice.module.css";
import ShowHideColumns from "./ShowHideColumns";
import AddItemModal from "../Items/Add_Items"; // adjust path as needed
import CustomersForm from "../New_parties/Customers/Customers";
import VendorsForm from "../New_parties/Vendors/Vendors";
import EndCustomers from "../New_parties/End_Customer/EndCustomers";
import {
  customerService,
  vendorService,
} from "../../../services/customerVendorService";

const ALWAYS_VISIBLE = [
  { key: "goods", label: "Goods/Service" },
  { key: "qty", label: "Qty" },
  { key: "rate", label: "Rate (₹)" },
  { key: "gst", label: "GST (%)" },
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
      gst: "",
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
  const [gstType, setGstType] = useState(rows.map(() => "GST")); // Track GST/Without GST per row
  const [gstValues, setGstValues] = useState(rows.map(() => "")); // Track GST % per row
  const [allParties, setAllParties] = useState([]);
  const [partySearch, setPartySearch] = useState("");
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showEndCustomerModal, setShowEndCustomerModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState("");
  const [selectedEndCustomer, setSelectedEndCustomer] = useState("");

  // Compose columns for table: always visible + toggled (after Goods/Service)
  const visibleColumns = [
    ALWAYS_VISIBLE[0], // Goods/Service
    ...columns.filter((c) => c.visible),
    ...ALWAYS_VISIBLE.slice(1), // Qty, Rate, Amount
  ];

  // Update GST type per row
  const handleGstTypeChange = (rowIdx, value) => {
    setGstType((prev) => prev.map((v, i) => (i === rowIdx ? value : v)));
    // Optionally reset GST % if switching to Without GST
    if (value === "Without GST") {
      setGstValues((prev) => prev.map((v, i) => (i === rowIdx ? "" : v)));
    }
  };

  // Update GST % per row
  const handleGstValueChange = (rowIdx, value) => {
    setGstValues((prev) => prev.map((v, i) => (i === rowIdx ? value : v)));
  };

  // Add row: also update gstType and gstValues
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
        gst: "",
        amount: "",
      },
    ]);
    setGstType((prev) => [...prev, "GST"]);
    setGstValues((prev) => [...prev, ""]);
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
      setRows((r) =>
        r.map((row, idx) => (idx === rowIdx ? { ...row, goods: value } : row))
      );
    }
  };

  // When item is created in modal
  const handleItemCreated = (item) => {
    if (addItemRowIndex !== null) {
      setRows((r) =>
        r.map((row, idx) =>
          idx === addItemRowIndex ? { ...row, goods: item.name } : row
        )
      );
    }
    setShowAddItemModal(false);
    setAddItemRowIndex(null);
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

      // Handle both {data: [...]} and [...] responses
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

  // Filtered parties for dropdown
  const filteredParties = allParties.filter(
    (p) =>
      p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
      p.company?.toLowerCase().includes(partySearch.toLowerCase()) ||
      p.phone?.includes(partySearch)
  );

  // Dropdown close on outside click
  const partyDropdownRef = useRef();
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
            />
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
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
              />
              <input
                className={styles.input}
                style={{ width: 80 }}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
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
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className={styles.section + " " + styles.tableSection}>
        <div style={{ position: "relative" }}>
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
                <th>GST</th>
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
                  {/* Goods/Service input, no search icon */}
                  <td style={{ position: "relative" }}>
                    <div className={styles.goodsServiceSelectWrapper}>
                      <input
                        className={styles.input}
                        placeholder="Please select goods/service"
                        value={row.goods}
                        onChange={(e) => handleGoodsChange(idx, e.target.value)}
                        style={{ width: "100%" }}
                        onFocus={() => setGoodsFocusIndex(idx)}
                        onBlur={() =>
                          setTimeout(() => setGoodsFocusIndex(null), 200)
                        }
                      />
                    </div>
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
                    />
                  </td>
                  {/* GST Dropdown and Input */}
                  <td>
                    <select
                      className={styles.input}
                      style={{ width: 90, marginBottom: 4 }}
                      value={gstType[idx] || "GST"}
                      onChange={(e) => handleGstTypeChange(idx, e.target.value)}
                    >
                      <option value="GST">GST</option>
                      <option value="Without GST">Without GST</option>
                    </select>
                    {gstType[idx] === "GST" && (
                      <input
                        className={styles.input}
                        type="number"
                        placeholder="GST %"
                        style={{ width: 60, marginTop: 2 }}
                        value={gstValues[idx] || ""}
                        onChange={(e) =>
                          handleGstValueChange(idx, e.target.value)
                        }
                      />
                    )}
                  </td>
                  {/* Amount */}
                  <td>
                    <input
                      className={styles.input}
                      type="number"
                      value={
                        row.qty && row.rate
                          ? Number(row.qty) * Number(row.rate)
                          : ""
                      }
                      disabled
                    />
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
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
            <span>₹{total.toFixed(2)}</span>
          </div>
          <div className={styles.summaryTotalRow}>
            <span>Total Amount</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Modal for create new item */}
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
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
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
