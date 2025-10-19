const mongoose = require("mongoose");

const InvoiceItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  name: { type: String, required: true },
  sku: { type: String },
  qty: { type: Number, default: 0 },
  unit: { type: String },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  desc: { type: String },
});

const TotalsSchema = new mongoose.Schema({
  subTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  rounding: { type: Number, default: 0 },
  finalTotal: { type: Number, default: 0 },
});

const SalesInvoiceWithoutGSTSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, index: true, unique: true },
    invoicePrefix: { type: String, default: "S-NGST" },
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

SalesInvoiceWithoutGSTSchema.methods.recalculateTotals = function () {
  const subTotal = this.items.reduce((sum, item) => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const amount = Math.round(qty * rate * 100) / 100;
    item.amount = amount;
    return sum + amount;
  }, 0);

  this.totals.subTotal = Math.round(subTotal * 100) / 100;
  this.totals.finalTotal = Math.round((this.totals.subTotal - (this.totals.discount || 0) + (this.totals.rounding || 0)) * 100) / 100;
};

module.exports = mongoose.model("SalesInvoiceWithoutGST", SalesInvoiceWithoutGSTSchema);
