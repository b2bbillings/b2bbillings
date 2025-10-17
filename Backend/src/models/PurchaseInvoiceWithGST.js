const mongoose = require("mongoose");

const InvoiceItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  name: { type: String, required: true },
  qty: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  taxable: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
});

const TotalsSchema = new mongoose.Schema({
  subTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  finalTotal: { type: Number, default: 0 },
});

const PurchaseInvoiceWithGSTSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, index: true, unique: true },
    invoicePrefix: { type: String, default: "P-GST" },
    invoiceDate: { type: Date, default: Date.now },

    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    vendor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Party" },
      name: { type: String, required: true },
    },

    items: [InvoiceItemSchema],
    totals: { type: TotalsSchema, default: () => ({}) },

    status: { type: String, enum: ["draft", "completed", "cancelled"], default: "draft" },

    meta: { createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, notes: String },
  },
  { timestamps: true }
);

PurchaseInvoiceWithGSTSchema.methods.recalculateTotals = function () {
  let subTotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0, taxTotal = 0;
  this.items.forEach((it) => {
    const taxable = Math.round((Number(it.qty || 0) * Number(it.rate || 0)) * 100) / 100;
    it.taxable = taxable;
    const gstAmount = Math.round((taxable * Number(it.gstRate || 0) / 100) * 100) / 100;
    const half = Math.round((gstAmount / 2) * 100) / 100;
    it.cgst = half;
    it.sgst = half;
    it.igst = 0;
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

module.exports = mongoose.model("PurchaseInvoiceWithGST", PurchaseInvoiceWithGSTSchema);