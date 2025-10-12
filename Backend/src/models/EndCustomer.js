const mongoose = require("mongoose");

const endCustomerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    whatsapp: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[\d\s-]{10,}$/, "Please enter a valid phone number"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EndCustomer", endCustomerSchema);