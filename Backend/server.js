const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");

// Load environment variables
dotenv.config();

// Import routes
const companyRoutes = require("./src/routes/companies");
const itemRoutes = require("./src/routes/items");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const partyRoutes = require("./src/routes/partyRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const salesRoutes = require("./src/routes/salesRoutes");
const salesOrderRoutes = require("./src/routes/salesOrderRoutes");
const purchaseRoutes = require("./src/routes/purchaseRoutes");
const purchaseOrderRoutes = require("./src/routes/purchaseOrderRoutes");
const bankAccountRoutes = require("./src/routes/bankAccountRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const staffRoutes = require("./src/routes/staffRoutes");
// ✅ ADD TASK ROUTES IMPORT
const taskRoutes = require("./src/routes/taskRoutes");

// Import Socket.IO Manager
const SocketManager = require("./src/socket/SocketManager");

const app = express();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
const socketManager = new SocketManager(server);

// Make socket manager available globally
app.set("socketManager", socketManager);

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true, limit: "50mb"}));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================================
// 🔄 ROUTES - PROPERLY ORGANIZED (FIXED ORDER)
// ================================

// Health check route (first)
app.get("/api/health", (req, res) => {
  const socketStats = socketManager.getStats();

  res.status(200).json({
    status: "success",
    message: "Shop Management API is running! 🚀",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    features: {
      companies: true,
      items: true,
      parties: true,
      sales: true,
      salesOrders: true,
      purchases: true,
      purchaseOrders: true,
      bankAccounts: true,
      transactions: true,
      payments: true,
      auth: true,
      userManagement: true,
      staffManagement: true,
      taskManagement: true, // ✅ ADD TASK MANAGEMENT FEATURE
      chat: true,
      realTimeMessaging: true,
    },
    socketIO: {
      status: "active",
      connectedClients: socketStats.totalConnections,
      onlineUsers: socketStats.onlineUsers,
      activeRooms: socketStats.activeRooms,
    },
  });
});

// Socket.IO status endpoint
app.get("/api/socket/status", (req, res) => {
  const stats = socketManager.getStats();
  res.json({
    success: true,
    data: {
      ...stats,
      socketIOVersion: require("socket.io/package.json").version,
      serverUptime: process.uptime(),
    },
  });
});

// ================================
// 🔐 AUTHENTICATION & USER MANAGEMENT (PRIORITY)
// ================================
// Auth routes (public - no company required)
app.use("/api/auth", authRoutes);

// User management routes (admin panel)
app.use("/api/users", userRoutes);

// ================================
// 👥 STAFF MANAGEMENT ROUTES
// ================================
app.use("/api/staff", staffRoutes);

// ================================
// 📋 TASK MANAGEMENT ROUTES (ADD THIS SECTION)
// ================================
app.use("/api/tasks", taskRoutes);

// ================================
// 💬 CHAT ROUTES
// ================================
app.use("/api/chat", chatRoutes);

// ================================
// 💰 PAYMENT ROUTES (PRIORITY)
// ================================
// Payment routes need to be registered BEFORE parameterized routes
app.use("/api/payments", paymentRoutes);

// ================================
// 🏢 COMPANY ROUTES (MUST BE BEFORE GENERIC /api ROUTES)
// ================================
app.use("/api/companies", companyRoutes);

// ================================
// 🔥 SPECIFIC ADMIN ROUTES (BEFORE GENERIC /api ROUTES)
// ================================
// Use specific paths instead of mounting at /api to avoid conflicts
app.use("/api/admin/sales-orders", salesOrderRoutes);
app.use("/api/admin/purchase-orders", purchaseOrderRoutes);

// ================================
// 🏢 COMPANY-SPECIFIC NESTED ROUTES
// ================================
// These routes are scoped to specific companies

// Items management
app.use("/api/companies/:companyId/items", itemRoutes);

// Party management
app.use("/api/companies/:companyId/parties", partyRoutes);

// Sales management
app.use("/api/companies/:companyId/sales", salesRoutes);

// Sales Order management (company-specific)
app.use("/api/companies/:companyId/sales-orders", salesOrderRoutes);

// Purchase management
app.use("/api/companies/:companyId/purchases", purchaseRoutes);

// Purchase Order management
app.use("/api/companies/:companyId/purchase-orders", purchaseOrderRoutes);

// Bank Account management
app.use("/api/companies/:companyId/bank-accounts", bankAccountRoutes);

// Transaction management (company-specific)
app.use("/api/companies/:companyId/transactions", transactionRoutes);

// Bank Account specific transactions
app.use(
  "/api/companies/:companyId/bank-accounts/:bankAccountId/transactions",
  transactionRoutes
);

// Company-specific chat routes
app.use("/api/companies/:companyId/chat", chatRoutes);

// Company-specific staff routes
app.use("/api/companies/:companyId/staff", staffRoutes);

// ✅ Company-specific task routes
app.use("/api/companies/:companyId/tasks", taskRoutes);

// ================================
// 🔄 LEGACY ROUTES (BACKWARD COMPATIBILITY)
// ================================
// These routes maintain backward compatibility with existing frontend code

// Legacy party routes
app.use("/api/parties", partyRoutes);

// Legacy sales routes
app.use("/api/sales", salesRoutes);

// Legacy sales order routes
app.use("/api/sales-orders", salesOrderRoutes);

// Legacy purchase routes
app.use("/api/purchases", purchaseRoutes);

// Legacy purchase order routes
app.use("/api/purchase-orders", purchaseOrderRoutes);

// Legacy bank account routes
app.use("/api/bank-accounts", bankAccountRoutes);

// Legacy transaction routes (MUST BE LAST to avoid conflicts)
app.use("/api/transactions", transactionRoutes);

// ================================
// ⚠️ ERROR HANDLING
// ================================

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Global Error Handler:", {
    error: err.message,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "error",
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      })),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      status: "error",
      message: "Invalid ID format",
      field: err.path,
      value: err.value,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      status: "error",
      message: "Duplicate entry",
      field: field,
      value: err.keyValue[field],
    });
  }

  if (err.name === "UnauthorizedError" || err.status === 401) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
      code: "UNAUTHORIZED",
    });
  }

  if (err.status === 403) {
    return res.status(403).json({
      status: "error",
      message: "Access denied",
      code: "FORBIDDEN",
    });
  }

  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
    code: err.code || "INTERNAL_ERROR",
    ...(isDevelopment && {
      stack: err.stack,
      details: err,
    }),
  });
});

// 404 handler for unmatched routes
app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      health: "GET /api/health",
      socketStatus: "GET /api/socket/status",
      authentication: "POST /api/auth/*",
      userManagement: "GET /api/users",
      staffManagement: "GET /api/staff",
      taskManagement: "GET /api/tasks", // ✅ ADD TASK MANAGEMENT ENDPOINT
      chat: "GET /api/chat/*",
      adminSalesOrders: "GET /api/admin/sales-orders",
      companies: "GET /api/companies",
      payments: "GET /api/payments",
      salesOrders: "GET /api/sales-orders",
      companySpecific: {
        items: "GET /api/companies/:companyId/items",
        parties: "GET /api/companies/:companyId/parties",
        staff: "GET /api/companies/:companyId/staff",
        tasks: "GET /api/companies/:companyId/tasks", // ✅ ADD COMPANY-SPECIFIC TASKS
        sales: "GET /api/companies/:companyId/sales",
        salesOrders: "GET /api/companies/:companyId/sales-orders",
        purchases: "GET /api/companies/:companyId/purchases",
        purchaseOrders: "GET /api/companies/:companyId/purchase-orders",
        bankAccounts: "GET /api/companies/:companyId/bank-accounts",
        transactions: "GET /api/companies/:companyId/transactions",
        chat: "GET /api/companies/:companyId/chat/*",
      },
    },
    hint: "Visit /api/docs for complete API documentation including staff management, task management and chat features",
  });
});

// ================================
// 🗄️ DATABASE CONNECTION
// ================================
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/shop-management";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📁 Connected to MongoDB");
    console.log(`🗄️  Database: ${mongoose.connection.name}`);
    console.log(`🔗 Connection: ${MONGODB_URI}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// ================================
// 🚀 SERVER START
// ================================
const PORT = process.env.PORT || 5000;

// Use server.listen instead of app.listen for Socket.IO
server.listen(PORT, () => {
  const socketStats = socketManager.getStats();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Shop Management System Backend Started!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(
    `🔌 Socket.IO: http://localhost:${PORT} (${socketStats.totalConnections} connections)`
  );
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`📊 Socket Status: http://localhost:${PORT}/api/socket/status`);
  console.log(`🏢 Companies: http://localhost:${PORT}/api/companies`);
  console.log(`💰 Payments: http://localhost:${PORT}/api/payments`);
  console.log(`👥 Users: http://localhost:${PORT}/api/users`);
  console.log(`👨‍💼 Staff: http://localhost:${PORT}/api/staff`);
  console.log(`📋 Tasks: http://localhost:${PORT}/api/tasks`); // ✅ ADD TASK MANAGEMENT LOG
  console.log(
    `🔥 Admin Sales Orders: http://localhost:${PORT}/api/admin/sales-orders`
  );
  console.log(`📋 Sales Orders: http://localhost:${PORT}/api/sales-orders`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Ready to handle requests!");
  console.log("💬 Real-time chat system active!");
  console.log("👨‍💼 Staff management system active!");
  console.log("📋 Task management system active!"); // ✅ ADD TASK MANAGEMENT LOG
  console.log("");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🔄 SIGTERM received, shutting down gracefully...");

  // Shutdown Socket.IO
  if (socketManager && socketManager.shutdown) {
    socketManager.shutdown();
  }

  // Close MongoDB connection
  mongoose.connection.close(() => {
    console.log("📁 MongoDB connection closed");

    // Close HTTP server
    server.close(() => {
      console.log("🌐 HTTP server closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("🔄 SIGINT received, shutting down gracefully...");

  // Shutdown Socket.IO
  if (socketManager && socketManager.shutdown) {
    socketManager.shutdown();
  }

  // Close MongoDB connection
  mongoose.connection.close(() => {
    console.log("📁 MongoDB connection closed");

    // Close HTTP server
    server.close(() => {
      console.log("🌐 HTTP server closed");
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

module.exports = app;
