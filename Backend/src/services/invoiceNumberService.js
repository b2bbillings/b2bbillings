const mongoose = require("mongoose");
const InvoiceCounter = require("../models/InvoiceCounter");

/**
 * getNextNumber - atomic increment using findOneAndUpdate
 * returns { prefix, number, formatted }
 */
async function getNextNumber(companyId, prefix = "INV", pad = 4) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error("Invalid companyId");
  }

  const counter = await InvoiceCounter.findOneAndUpdate(
    { companyId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const next = counter.seq || 1;
  const number = String(next).padStart(pad, "0");
  const formatted = `${prefix}-${number}`;
  return { prefix, number, formatted, seq: next };
}

module.exports = { getNextNumber };