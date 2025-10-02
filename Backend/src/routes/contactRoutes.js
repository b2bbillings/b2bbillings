const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// =============================================================================
// CONTACT ROUTES
// =============================================================================

/**
 * @route   POST /api/contacts
 * @desc    Create a new contact
 * @access  Private
 */
router.post('/', contactController.createContact);

/**
 * @route   GET /api/contacts
 * @desc    Get all contacts for company, grouped by user
 * @access  Private
 */
router.get('/', contactController.getContactsByCompany);

/**
 * @route   GET /api/contacts/search
 * @desc    Search contacts
 * @access  Private
 */
router.get('/search', contactController.searchContacts);

/**
 * @route   GET /api/contacts/statistics
 * @desc    Get contact statistics for company
 * @access  Private
 */
router.get('/statistics', contactController.getContactStatistics);

/**
 * @route   GET /api/contacts/user/:targetUserId?
 * @desc    Get contacts added by specific user (or current user if no targetUserId)
 * @access  Private
 */
router.get('/user/:targetUserId?', contactController.getContactsByUser);

/**
 * @route   GET /api/contacts/:contactId
 * @desc    Get single contact by ID
 * @access  Private
 */
router.get('/:contactId', contactController.getContactById);

/**
 * @route   PUT /api/contacts/:contactId
 * @desc    Update contact
 * @access  Private
 */
router.put('/:contactId', contactController.updateContact);

/**
 * @route   DELETE /api/contacts/:contactId
 * @desc    Delete contact (soft delete)
 * @access  Private
 */
router.delete('/:contactId', contactController.deleteContact);

/**
 * @route   POST /api/contacts/bulk-delete
 * @desc    Bulk delete contacts
 * @access  Private
 */
router.post('/bulk-delete', contactController.bulkDeleteContacts);

module.exports = router;