// src/routes/invoiceRoutes.js
const express = require('express');
const router = express.Router();

console.log('🔍 Loading invoiceRoutes.js...');

// Basic test route - NO dependencies
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Invoice routes working!', 
    timestamp: new Date().toISOString(),
    path: req.path 
  });
});

// Basic invoices route - NO dependencies
router.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Get all invoices', 
    data: [],
    query: req.query 
  });
});

// Mock authentication middleware (no imports needed)
const mockAuth = (req, res, next) => {
  // Simulate authenticated user for testing
  req.user = { 
    _id: 'test-user', 
    companyId: 'test-company',
    email: 'test@example.com'
  };
  console.log('🔐 Mock auth applied');
  next();
};

// Apply mock auth safely
router.use(mockAuth);

// Add more basic routes
router.post('/', (req, res) => {
  res.status(201).json({ 
    success: true, 
    message: 'Invoice created successfully', 
    data: { id: 'new-invoice-id', ...req.body }
  });
});

router.get('/:id', (req, res) => {
  res.json({ 
    success: true, 
    message: `Get invoice ${req.params.id}`,
    data: { id: req.params.id }
  });
});

// Log success
console.log('✅ invoiceRoutes.js loaded successfully');
console.log(`📋 Routes registered: ${router.stack.length}`);

// Export ONLY the router
module.exports = router;