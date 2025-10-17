const mongoose = require("mongoose");

const InvoiceCounterSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, unique: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("InvoiceCounter", InvoiceCounterSchema);