const Contact = require('../models/Contact');
const User = require('../models/User');
const Company = require('../models/Company');
const mongoose = require('mongoose');

// =============================================================================
// CONTACT CRUD OPERATIONS
// =============================================================================

/**
 * Create a new contact
 */
const createContact = async (req, res) => {
  try {
    // Get userId and companyId from authenticated user
    const userId = req.user.id || req.user._id;
    const companyId = req.user.companyId || req.user.currentCompany;
    
    const {
      name,
      phone,
      phoneNumbers = [],
      email,
      address,
      company,
      shopName,
      shopOwner,
      website,
      partyType = 'customer',
      priority = 'medium',
      status = 'active',
      notes,
      tags = [],
      socialMedia = {}
    } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required fields'
      });
    }

    // Get user and company information
    const [user, companyInfo] = await Promise.all([
      User.findById(userId).select('username fullName email'),
      Company.findById(companyId).select('businessName')
    ]);

    if (!user || !companyInfo) {
      return res.status(404).json({
        success: false,
        message: 'User or company not found'
      });
    }

    // Check if contact already exists
    const existingContact = await Contact.findOne({
      $or: [
        { phone: phone, companyId: companyId, isDeleted: false },
        ...(email ? [{ email: email, companyId: companyId, isDeleted: false }] : [])
      ]
    });

    if (existingContact) {
      return res.status(409).json({
        success: false,
        message: 'Contact with this phone or email already exists',
        existingContact: {
          id: existingContact._id,
          name: existingContact.name,
          phone: existingContact.phone,
          email: existingContact.email,
          addedBy: existingContact.addedByName
        }
      });
    }

    // Create new contact
    const newContact = new Contact({
      name,
      phone,
      phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : [{ number: phone, label: 'Primary' }],
      email,
      address,
      company,
      shopName,
      shopOwner,
      website,
      partyType,
      priority,
      status,
      notes,
      tags,
      socialMedia,
      addedBy: userId,
      addedByName: user.fullName || user.username,
      companyId,
      companyName: companyInfo.businessName
    });

    const savedContact = await newContact.save();

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: savedContact
    });

  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create contact',
      error: error.message
    });
  }
};

/**
 * Get all contacts for a company, grouped by user
 */
const getContactsByCompany = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 50, search, partyType, status, addedBy } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build match conditions
    const matchConditions = {
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false
    };

    if (search) {
      const regex = new RegExp(search, 'i');
      matchConditions.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
        { company: regex },
        { shopName: regex },
        { shopOwner: regex },
        { addedByName: regex }
      ];
    }

    if (partyType) {
      matchConditions.partyType = partyType;
    }

    if (status) {
      matchConditions.status = status;
    }

    if (addedBy) {
      matchConditions.addedBy = new mongoose.Types.ObjectId(addedBy);
    }

    // Get contacts grouped by user
    const contactsGrouped = await Contact.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'addedBy',
          foreignField: '_id',
          as: 'addedByUser'
        }
      },
      { $unwind: '$addedByUser' },
      {
        $group: {
          _id: {
            userId: '$addedBy',
            userName: '$addedByName',
            userEmail: '$addedByUser.email',
            userUsername: '$addedByUser.username'
          },
          contacts: { $push: '$$ROOT' },
          totalContacts: { $sum: 1 },
          lastAdded: { $max: '$createdAt' }
        }
      },
      { $sort: { lastAdded: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Get total count
    const totalUsers = await Contact.aggregate([
      { $match: matchConditions },
      { $group: { _id: '$addedBy' } },
      { $count: 'total' }
    ]);

    const totalCount = totalUsers[0]?.total || 0;

    // Get overall statistics
    const stats = await Contact.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId), isDeleted: false } },
      {
        $group: {
          _id: null,
          totalContacts: { $sum: 1 },
          activeContacts: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          customers: { $sum: { $cond: [{ $eq: ['$partyType', 'customer'] }, 1, 0] } },
          suppliers: { $sum: { $cond: [{ $eq: ['$partyType', 'supplier'] }, 1, 0] } },
          vendors: { $sum: { $cond: [{ $eq: ['$partyType', 'vendor'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        contactsGrouped,
        statistics: stats[0] || {
          totalContacts: 0,
          activeContacts: 0,
          customers: 0,
          suppliers: 0,
          vendors: 0
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalUsers: totalCount,
          hasMore: skip + contactsGrouped.length < totalCount,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get contacts by company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contacts',
      error: error.message
    });
  }
};

/**
 * Get contacts added by specific user
 */
const getContactsByUser = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const companyId = req.user.companyId || req.user.currentCompany;
    const { targetUserId } = req.params;
    const { page = 1, limit = 20, search, partyType, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchUserId = targetUserId || userId;

    // Build query
    const query = {
      addedBy: searchUserId,
      companyId: companyId,
      isDeleted: false
    };

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
        { company: regex },
        { shopName: regex }
      ];
    }

    if (partyType) query.partyType = partyType;
    if (status) query.status = status;

    const [contacts, totalContacts] = await Promise.all([
      Contact.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('addedBy', 'username fullName email'),
      Contact.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalContacts / parseInt(limit)),
          totalContacts,
          hasMore: skip + contacts.length < totalContacts,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get contacts by user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user contacts',
      error: error.message
    });
  }
};

/**
 * Get single contact by ID
 */
const getContactById = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { companyId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID'
      });
    }

    const contact = await Contact.findOne({
      _id: contactId,
      companyId: companyId,
      isDeleted: false
    }).populate('addedBy', 'username fullName email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('Get contact by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contact',
      error: error.message
    });
  }
};

/**
 * Update contact
 */
const updateContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { companyId } = req.user;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID'
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.addedBy;
    delete updateData.addedByName;
    delete updateData.companyId;
    delete updateData.companyName;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const contact = await Contact.findOneAndUpdate(
      {
        _id: contactId,
        companyId: companyId,
        isDeleted: false
      },
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    ).populate('addedBy', 'username fullName email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact',
      error: error.message
    });
  }
};

/**
 * Delete contact (soft delete)
 */
const deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user.id || req.user._id;
    const companyId = req.user.companyId || req.user.currentCompany;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID'
      });
    }

    const contact = await Contact.findOne({
      _id: contactId,
      companyId: companyId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await contact.softDelete(userId);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.message
    });
  }
};

/**
 * Bulk delete contacts
 */
const bulkDeleteContacts = async (req, res) => {
  try {
    const { contactIds } = req.body;
    const userId = req.user.id || req.user._id;
    const companyId = req.user.companyId || req.user.currentCompany;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contact IDs array is required'
      });
    }

    // Validate all IDs
    const invalidIds = contactIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact IDs found',
        invalidIds
      });
    }

    const result = await Contact.updateMany(
      {
        _id: { $in: contactIds },
        companyId: companyId,
        isDeleted: false
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} contacts deleted successfully`,
      deletedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk delete contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contacts',
      error: error.message
    });
  }
};

/**
 * Search contacts
 */
const searchContacts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { q: searchQuery, page = 1, limit = 20 } = req.query;

    if (!searchQuery || searchQuery.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const contacts = await Contact.searchContacts(companyId, searchQuery.trim())
      .skip(skip)
      .limit(parseInt(limit));

    const totalContacts = await Contact.searchContacts(companyId, searchQuery.trim()).countDocuments();

    res.json({
      success: true,
      data: {
        contacts,
        searchQuery: searchQuery.trim(),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalContacts / parseInt(limit)),
          totalContacts,
          hasMore: skip + contacts.length < totalContacts,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Search contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search contacts',
      error: error.message
    });
  }
};

/**
 * Get contact statistics for company
 */
const getContactStatistics = async (req, res) => {
  try {
    const { companyId } = req.user;

    const stats = await Contact.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId), isDeleted: false } },
      {
        $facet: {
          byPartyType: [
            { $group: { _id: '$partyType', count: { $sum: 1 } } }
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          byUser: [
            {
              $group: {
                _id: { userId: '$addedBy', userName: '$addedByName' },
                count: { $sum: 1 },
                lastAdded: { $max: '$createdAt' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          recentContacts: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                name: 1,
                phone: 1,
                partyType: 1,
                addedByName: 1,
                createdAt: 1
              }
            }
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalContacts: { $sum: 1 },
                activeContacts: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                thisMonth: {
                  $sum: {
                    $cond: [
                      { $gte: ['$createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] },
                      1,
                      0
                    ]
                  }
                },
                thisWeek: {
                  $sum: {
                    $cond: [
                      { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0]
    });

  } catch (error) {
    console.error('Get contact statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contact statistics',
      error: error.message
    });
  }
};

module.exports = {
  createContact,
  getContactsByCompany,
  getContactsByUser,
  getContactById,
  updateContact,
  deleteContact,
  bulkDeleteContacts,
  searchContacts,
  getContactStatistics
};