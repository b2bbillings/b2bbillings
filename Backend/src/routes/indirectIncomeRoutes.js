const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getAllIndirectIncome,
  getIndirectIncomeById,
  createIndirectIncome,
  updateIndirectIncome,
  deleteIndirectIncome,
  getIndirectIncomeStats
} = require('../controllers/indirectIncomeController');

const { authenticate } = require('../middleware/authMiddleware');
const { validateIndirectIncome } = require('../middleware/validation');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/indirect-income');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `income-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|xlsx|xls/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, PDF, and Excel files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Apply auth middleware to all routes
router.use(authenticate);

// Routes
router.get('/', getAllIndirectIncome);
router.get('/stats', getIndirectIncomeStats);
router.get('/:id', getIndirectIncomeById);
router.post('/', upload.any(), validateIndirectIncome, createIndirectIncome);
router.put('/:id', upload.any(), validateIndirectIncome, updateIndirectIncome);
router.delete('/:id', deleteIndirectIncome);

module.exports = router;