const express = require("express");
const router = express.Router({mergeParams: true}); // ⭐ IMPORTANT: mergeParams must be true
const itemController = require("../controllers/itemController");

// Middleware to validate companyId parameter
router.use((req, res, next) => {
  const {companyId} = req.params;
  console.log("🔍 CompanyId validation:", companyId);

  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: "Company ID is required",
      debug: {
        params: req.params,
        url: req.url,
        originalUrl: req.originalUrl,
      },
    });
  }
  next();
});

// Routes for items management
// Base route: /api/companies/:companyId/items

// ===== ITEM CRUD ROUTES =====

// POST /api/companies/:companyId/items - Create new item
router.post("/", itemController.createItem);

// GET /api/companies/:companyId/items - Get all items for a company
router.get("/", itemController.getItems);

// ===== SPECIAL ROUTES (must be before /:itemId) =====

// GET /api/companies/:companyId/items/search - Search items (autocomplete)
router.get("/search", itemController.searchItems);

// GET /api/companies/:companyId/items/categories - Get all categories
router.get("/categories", itemController.getCategories);

// 📊 GET /api/companies/:companyId/items/low-stock - Get low stock items
router.get("/low-stock", itemController.getLowStockItems);

// ===== ADMIN ROUTES (EXISTING) =====

// 🔧 GET /api/companies/:companyId/items/admin/all - Get all items across companies (Admin)
router.get("/admin/all", itemController.getAllItemsAdmin);

// 📊 GET /api/companies/:companyId/items/admin/stats - Get comprehensive item statistics (Admin)
router.get("/admin/stats", itemController.getAdminItemStats);

// 📋 GET /api/companies/:companyId/items/admin/export - Export all items data (Admin)
router.get("/admin/export", itemController.exportAllItemsAdmin);

// 🚨 GET /api/companies/:companyId/items/admin/low-stock - Get low stock items across companies (Admin)
router.get("/admin/low-stock", itemController.getAllLowStockItemsAdmin);

// ===== ✅ NEW ADMIN NAME VERIFICATION ROUTES =====

// 🔍 GET /api/companies/:companyId/items/admin/verification/pending - Get items for verification review
router.get(
  "/admin/verification/pending",
  itemController.getPendingVerificationItems
);

// 📊 GET /api/companies/:companyId/items/admin/verification/stats - Get verification statistics
router.get("/admin/verification/stats", itemController.getVerificationStats);

// ✅ PUT /api/companies/:companyId/items/admin/verification/:itemId/approve - Approve item name (with optional correction)
router.put(
  "/admin/verification/:itemId/approve",
  itemController.approveItemName
);

// ❌ PUT /api/companies/:companyId/items/admin/verification/:itemId/reject - Reject item name
router.put("/admin/verification/:itemId/reject", itemController.rejectItemName);

// ⚡ POST /api/companies/:companyId/items/admin/verification/quick-approve - Quick approve multiple items
router.post(
  "/admin/verification/quick-approve",
  itemController.quickApproveItems
);

// 📋 POST /api/companies/:companyId/items/admin/verification/bulk-approve - Bulk approve multiple items
router.post(
  "/admin/verification/bulk-approve",
  itemController.bulkApproveItems
);

// 📜 GET /api/companies/:companyId/items/admin/verification/:itemId/history - Get verification history
router.get(
  "/admin/verification/:itemId/history",
  itemController.getVerificationHistory
);

// 🔄 PUT /api/companies/:companyId/items/admin/verification/:itemId/resubmit - Resubmit item for verification
router.put(
  "/admin/verification/:itemId/resubmit",
  itemController.resubmitForVerification
);

// ===== STOCK MANAGEMENT ROUTES =====

// GET /api/companies/:companyId/items/stock-summary - Get stock summary/analytics
router.get("/stock-summary", itemController.getStockSummary);

// PATCH /api/companies/:companyId/items/bulk/stock - Bulk update stock
router.patch("/bulk/stock", itemController.bulkUpdateStock);

// ===== INDIVIDUAL ITEM ROUTES =====

// GET /api/companies/:companyId/items/:itemId - Get single item
router.get("/:itemId", itemController.getItemById);

// PUT /api/companies/:companyId/items/:itemId - Update item
router.put("/:itemId", itemController.updateItem);

// DELETE /api/companies/:companyId/items/:itemId - Delete item
router.delete("/:itemId", itemController.deleteItem);

// ===== STOCK ADJUSTMENT ROUTES =====

// 📊 PUT /api/companies/:companyId/items/:itemId/adjust-stock - Adjust stock for specific item
router.put("/:itemId/adjust-stock", itemController.adjustStock);

// 📊 GET /api/companies/:companyId/items/:itemId/stock-history - Get stock history for specific item
router.get("/:itemId/stock-history", itemController.getStockHistory);

// ===== TRANSACTION ROUTES =====

// 📊 GET /api/companies/:companyId/items/:itemId/transactions - Get transactions for specific item
router.get("/:itemId/transactions", itemController.getItemTransactions);

// 📊 POST /api/companies/:companyId/items/:itemId/transactions - Create transaction for specific item
router.post("/:itemId/transactions", itemController.createItemTransaction);

// 📊 PUT /api/companies/:companyId/items/:itemId/transactions/:transactionId - Update transaction
router.put(
  "/:itemId/transactions/:transactionId",
  itemController.updateItemTransaction
);

// 📊 DELETE /api/companies/:companyId/items/:itemId/transactions/:transactionId - Delete transaction
router.delete(
  "/:itemId/transactions/:transactionId",
  itemController.deleteItemTransaction
);

// ===== ROUTE TESTING/DEBUG =====

// Debug middleware to log all routes
router.use((req, res, next) => {
  console.log(`📍 Route hit: ${req.method} ${req.originalUrl}`);
  console.log(`📍 Params:`, req.params);
  console.log(`📍 Query:`, req.query);
  next();
});

// Catch-all route for debugging unmatched routes
router.use("*", (req, res) => {
  console.log(`❌ Unmatched route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    debug: {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      availableRoutes: [
        // Basic CRUD
        "POST /",
        "GET /",
        "GET /search",
        "GET /categories",
        "GET /low-stock",

        // Admin routes
        "GET /admin/all",
        "GET /admin/stats",
        "GET /admin/export",
        "GET /admin/low-stock",

        // ✅ NEW: Admin verification routes
        "GET /admin/verification/pending",
        "GET /admin/verification/stats",
        "PUT /admin/verification/:itemId/approve",
        "PUT /admin/verification/:itemId/reject",
        "POST /admin/verification/quick-approve",
        "POST /admin/verification/bulk-approve",
        "GET /admin/verification/:itemId/history",
        "PUT /admin/verification/:itemId/resubmit",

        // Stock management
        "GET /stock-summary",
        "PATCH /bulk/stock",

        // Individual item routes
        "GET /:itemId",
        "PUT /:itemId",
        "DELETE /:itemId",
        "PUT /:itemId/adjust-stock",
        "GET /:itemId/stock-history",

        // Transaction routes
        "GET /:itemId/transactions",
        "POST /:itemId/transactions",
        "PUT /:itemId/transactions/:transactionId",
        "DELETE /:itemId/transactions/:transactionId",
      ],
    },
  });
});

module.exports = router;
