const express = require("express");
const router = express.Router();
const controller = require("../controllers/salesInvoiceController");

// simple middlewares (copy/adapt your auth/validation layers)
const authenticate = (req, res, next) => next();
const validateCompany = (req, res, next) => {
  const companyId = req.query.companyId || req.body.companyId;
  if (!companyId) return res.status(400).json({ success: false, message: "companyId required" });
  next();
};

// CRUD
router.post("/", authenticate, controller.createSalesInvoice);
router.get("/", authenticate, validateCompany, controller.getSalesInvoices);
router.get("/next-invoice-number", authenticate, validateCompany, controller.getNextInvoiceNumber);
router.get("/:id", authenticate, controller.getSalesInvoiceById);
router.put("/:id", authenticate, controller.updateSalesInvoice);
router.delete("/:id", authenticate, controller.deleteSalesInvoice);

module.exports = router;