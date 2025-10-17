const mongoose = require("mongoose");

const InvoiceItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  name: { type: String, required: true },
  sku: { type: String },
  qty: { type: Number, default: 0 },
  unit: { type: String },
  rate: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 }, // e.g. 18
  taxable: { type: Number, default: 0 }, // computed
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  desc: { type: String },
});

const TotalsSchema = new mongoose.Schema({
  subTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  rounding: { type: Number, default: 0 },
  finalTotal: { type: Number, default: 0 },
});

const SalesInvoiceWithGSTSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, index: true, unique: true },
    invoicePrefix: { type: String, default: "S-GST" },
    invoiceDate: { type: Date, default: Date.now },

    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    customer: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Party" },
      name: { type: String, required: true },
      company: { type: String },
      phone: { type: String },
      email: { type: String },
    },

    items: [InvoiceItemSchema],
    totals: { type: TotalsSchema, default: () => ({}) },

    status: { type: String, enum: ["draft", "completed", "cancelled"], default: "draft" },

    meta: { createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, notes: String },
  },
  { timestamps: true }
);

SalesInvoiceWithGSTSchema.methods.recalculateTotals = function () {
  let subTotal = 0,
    cgstTotal = 0,
    sgstTotal = 0,
    igstTotal = 0,
    taxTotal = 0;

  this.items.forEach((it) => {
    const qty = Number(it.qty || 0);
    const rate = Number(it.rate || 0);
    const taxable = Math.round(qty * rate * 100) / 100;
    it.taxable = taxable;
    // assume GST split equally into CGST+SGST when intra-state (simple rule)
    const gst = Number(it.gstRate || 0);
    const gstAmount = Math.round((taxable * gst) / 100 * 100) / 100;
    // simple split: if gst>0 assume CGST/SGST split (50/50). Adjust logic for IGST as needed.
    const half = Math.round((gstAmount / 2) * 100) / 100;
    it.cgst = half;
    it.sgst = half;
    it.igst = gstAmount === 0 ? 0 : 0; // keep IGST 0 by default
    it.amount = Math.round((taxable + gstAmount) * 100) / 100;

    subTotal += taxable;
    cgstTotal += it.cgst;
    sgstTotal += it.sgst;
    igstTotal += it.igst;
    taxTotal += gstAmount;
  });

  this.totals.subTotal = Math.round(subTotal * 100) / 100;
  this.totals.cgstTotal = Math.round(cgstTotal * 100) / 100;
  this.totals.sgstTotal = Math.round(sgstTotal * 100) / 100;
  this.totals.igstTotal = Math.round(igstTotal * 100) / 100;
  this.totals.taxTotal = Math.round(taxTotal * 100) / 100;
  this.totals.finalTotal = Math.round((this.totals.subTotal + this.totals.taxTotal - (this.totals.discount || 0) + (this.totals.rounding || 0)) * 100) / 100;
};

module.exports = mongoose.model("SalesInvoiceWithGST", SalesInvoiceWithGSTSchema);