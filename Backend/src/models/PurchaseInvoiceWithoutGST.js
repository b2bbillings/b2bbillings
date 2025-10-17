const mongoose = require("mongoose");

const InvoiceItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  name: { type: String, required: true },
  qty: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
});

const TotalsSchema = new mongoose.Schema({
  subTotal: { type: Number, default: 0 },
  finalTotal: { type: Number, default: 0 },
});

const PurchaseInvoiceWithoutGSTSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, index: true, unique: true },
    invoicePrefix: { type: String, default: "P-NGST" },
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

PurchaseInvoiceWithoutGSTSchema.methods.recalculateTotals = function () {
  const subTotal = this.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0);
  this.totals.subTotal = Math.round(subTotal * 100) / 100;
  this.totals.finalTotal = this.totals.subTotal;
};

module.exports = mongoose.model("PurchaseInvoiceWithoutGST", PurchaseInvoiceWithoutGSTSchema);