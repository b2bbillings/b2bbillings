const mongoose = require("mongoose");
const Schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, unique: true },
  seq: { type: Number, default: 0 },
});
module.exports = mongoose.model("SalesWithoutGstCounter", Schema);