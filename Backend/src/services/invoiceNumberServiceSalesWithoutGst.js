const InvoiceCounter = require("../models/SalesWithoutGstCounter");
async function getNextNumber(companyId, prefix = "S-NGST", pad = 4) {
  const counter = await InvoiceCounter.findOneAndUpdate(
    { companyId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  const next = counter.seq || 1;
  const number = String(next).padStart(pad, "0");
  return { prefix, number, formatted: `${prefix}-${number}`, seq: next };
}
module.exports = { getNextNumber };