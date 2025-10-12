const EndCustomer = require("../models/endCustomerSchema");

exports.getAll = async (req, res) => {
  try {
    console.log("GET /api/end-customers called");
    const customers = await EndCustomer.find();
    res.status(200).json(customers);
  } catch (error) {
    console.error("Error in getAll:", error);
    res.status(500).json({ error: "Server error while fetching customers" });
  }
};

exports.create = async (req, res) => {
  try {
    console.log("POST /api/end-customers called with body:", req.body);
    const customer = new EndCustomer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    console.error("Error in create:", error);
    res.status(400).json({ error: error.message || "Failed to create customer" });
  }
};

exports.update = async (req, res) => {
  try {
    console.log(`PUT /api/end-customers/${req.params.id} called with body:`, req.body);
    const customer = await EndCustomer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.status(200).json(customer);
  } catch (error) {
    console.error("Error in update:", error);
    res.status(400).json({ error: error.message || "Failed to update customer" });
  }
};

exports.remove = async (req, res) => {
  try {
    console.log(`DELETE /api/end-customers/${req.params.id} called`);
    const customer = await EndCustomer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error in remove:", error);
    res.status(400).json({ error: error.message || "Failed to delete customer" });
  }
};