const Purchase = require('../models/Purchase');
const Item = require('../models/Item');
const Party = require('../models/Party');
const mongoose = require('mongoose');

const purchaseController = {

    createPurchase: async (req, res) => {
        try {
            const {
                supplierName,
                supplierMobile,
                supplier,
                purchaseNumber,
                purchaseDate,
                gstEnabled = true,
                companyId,
                items,
                payment,
                notes,
                termsAndConditions,
                roundOff = 0,
                roundOffEnabled = false,
                status = 'draft',
                userId,
                createdBy
            } = req.body;

            console.log('🛒 Creating purchase with data:', {
                supplierName,
                supplierMobile,
                supplier,
                companyId,
                userId,
                createdBy,
                itemsCount: items?.length
            });

            const finalUserId = userId || createdBy || req.user?.id || 'system';
            const finalCreatedBy = createdBy || userId || req.user?.id || 'system';

            // Validate required fields
            if ((!supplierName && !supplier) || !companyId || !items || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Supplier (name or ID), Company, and Items are required'
                });
            }

            // ✅ ENHANCED SUPPLIER HANDLING - FIND FIRST, CREATE ONLY IF NEEDED
            let supplierRecord = null;

            if (supplier && mongoose.Types.ObjectId.isValid(supplier)) {
                // Case 1: Supplier ID provided - just find it
                console.log('🔍 Finding supplier by ID:', supplier);
                supplierRecord = await Party.findById(supplier);
                if (!supplierRecord) {
                    return res.status(400).json({
                        success: false,
                        message: 'Supplier not found with provided ID'
                    });
                }
                console.log('✅ Using existing supplier by ID:', supplierRecord._id);

            } else {
                // Case 2: Find supplier by phone/name, create only if truly doesn't exist

                console.log('🔍 Searching for existing supplier with criteria:', {
                    supplierName,
                    supplierMobile,
                    companyId
                });

                // ✅ STEP 1: Comprehensive supplier search

                // First, try to find by mobile/phoneNumber
                if (supplierMobile) {
                    console.log('🔍 Searching by mobile:', supplierMobile);

                    // Try multiple phone field combinations
                    supplierRecord = await Party.findOne({
                        companyId: companyId,
                        type: 'supplier',
                        $or: [
                            { mobile: supplierMobile },
                            { phoneNumber: supplierMobile },
                            // Try without leading zeros or country codes
                            { mobile: supplierMobile.replace(/^0+/, '') },
                            { phoneNumber: supplierMobile.replace(/^0+/, '') },
                            { mobile: supplierMobile.replace(/^\+?91/, '') },
                            { phoneNumber: supplierMobile.replace(/^\+?91/, '') }
                        ]
                    });

                    if (supplierRecord) {
                        console.log('✅ Found supplier by mobile/phoneNumber:', supplierRecord._id);
                        console.log('📋 Supplier details:', {
                            name: supplierRecord.name,
                            mobile: supplierRecord.mobile,
                            phoneNumber: supplierRecord.phoneNumber
                        });
                    }
                }

                // If not found by mobile, try by name
                if (!supplierRecord && supplierName) {
                    console.log('🔍 Searching by name:', supplierName);

                    supplierRecord = await Party.findOne({
                        companyId: companyId,
                        type: 'supplier',
                        name: { $regex: new RegExp(`^${supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                    });

                    if (supplierRecord) {
                        console.log('✅ Found supplier by name:', supplierRecord._id);
                    }
                }

                // ✅ DEBUG: Show existing suppliers if not found
                if (!supplierRecord) {
                    console.log('❌ Supplier not found in initial search');

                    // Debug: Show existing suppliers for this company
                    const existingSuppliers = await Party.find({
                        companyId: companyId,
                        type: 'supplier'
                    }).select('name mobile phoneNumber').limit(5);

                    console.log('📋 Existing suppliers in company (sample):',
                        existingSuppliers.map(s => ({
                            id: s._id,
                            name: s.name,
                            mobile: s.mobile,
                            phoneNumber: s.phoneNumber
                        }))
                    );
                }

                // ✅ STEP 2: Create supplier ONLY if not found
                if (!supplierRecord) {
                    if (!supplierName) {
                        return res.status(400).json({
                            success: false,
                            message: 'Supplier name is required to create new supplier'
                        });
                    }

                    console.log('🆕 Creating new supplier with data:', {
                        name: supplierName,
                        mobile: supplierMobile,
                        userId: finalUserId,
                        createdBy: finalCreatedBy,
                        companyId: companyId
                    });

                    try {
                        supplierRecord = new Party({
                            name: supplierName.trim(),
                            mobile: supplierMobile || '',
                            phoneNumber: supplierMobile || '0000000000', // Required field fallback
                            type: 'supplier',
                            companyId: companyId,
                            userId: finalUserId,
                            createdBy: finalCreatedBy,
                            email: '',
                            address: {
                                street: '',
                                city: '',
                                state: '',
                                pincode: '',
                                country: 'India'
                            }
                        });

                        await supplierRecord.save();
                        console.log('✅ Created new supplier successfully:', supplierRecord._id);

                    } catch (supplierError) {
                        console.error('❌ Supplier creation failed:', supplierError);

                        if (supplierError.code === 11000) {
                            // Duplicate key error - someone else created it, find it now
                            console.log('⚠️ Duplicate key error detected, searching for existing supplier...');

                            // More aggressive search after duplicate error
                            supplierRecord = await Party.findOne({
                                companyId: companyId,
                                $or: [
                                    { type: 'supplier', mobile: supplierMobile },
                                    { type: 'supplier', phoneNumber: supplierMobile },
                                    { type: 'supplier', name: { $regex: new RegExp(`^${supplierName}$`, 'i') } }
                                ]
                            });

                            if (!supplierRecord) {
                                // Last resort - find ANY party with this phone in this company
                                supplierRecord = await Party.findOne({
                                    companyId: companyId,
                                    $or: [
                                        { mobile: supplierMobile },
                                        { phoneNumber: supplierMobile }
                                    ]
                                });

                                if (supplierRecord) {
                                    console.log('✅ Found existing party (converting to supplier context):', supplierRecord._id);
                                }
                            }

                            if (!supplierRecord) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'Supplier creation failed due to duplicate data, but existing supplier not found. Please try again.',
                                    debug: {
                                        searchCriteria: { supplierName, supplierMobile, companyId },
                                        error: 'Duplicate key error but supplier not found in any search'
                                    }
                                });
                            }

                            console.log('✅ Found supplier after duplicate error handling:', supplierRecord._id);
                        } else {
                            // Return validation error details
                            return res.status(400).json({
                                success: false,
                                message: 'Failed to create supplier',
                                error: supplierError.message,
                                validationErrors: supplierError.errors
                            });
                        }
                    }
                } else {
                    console.log('✅ Using existing supplier found in search:', supplierRecord._id);
                }
            }

            // ✅ SUPPLIER VALIDATION - Ensure we have a supplier at this point
            if (!supplierRecord || !supplierRecord._id) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to resolve supplier. Please check supplier information and try again.'
                });
            }

            console.log('🚀 Proceeding with purchase creation using supplier:', {
                id: supplierRecord._id,
                name: supplierRecord.name,
                mobile: supplierRecord.mobile
            });

            // ✅ ITEMS PROCESSING AND VALIDATION
            const processedItems = [];
            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;
            let totalCGST = 0;
            let totalSGST = 0;
            let totalIGST = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Basic validation
                if (!item.itemName || !item.quantity || item.pricePerUnit === undefined) {
                    return res.status(400).json({
                        success: false,
                        message: `Item ${i + 1}: Name, quantity, and price are required`
                    });
                }

                // Parse item values
                const quantity = parseFloat(item.quantity);
                const pricePerUnit = parseFloat(item.pricePerUnit);
                const discountPercent = parseFloat(item.discountPercent || 0);
                const discountAmount = parseFloat(item.discountAmount || 0);
                const taxRate = parseFloat(item.taxRate || 0);

                // Validate numeric values
                if (isNaN(quantity) || isNaN(pricePerUnit) || quantity <= 0 || pricePerUnit < 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Item ${i + 1}: Invalid quantity or price values`
                    });
                }

                // Calculate base amount
                const baseAmount = quantity * pricePerUnit;
                subtotal += baseAmount;

                // Calculate discount (use discountAmount if provided, else use discountPercent)
                let itemDiscountAmount = discountAmount;
                if (discountAmount === 0 && discountPercent > 0) {
                    itemDiscountAmount = (baseAmount * discountPercent) / 100;
                }
                totalDiscount += itemDiscountAmount;

                // Amount after discount
                const amountAfterDiscount = baseAmount - itemDiscountAmount;

                // Calculate taxes
                let cgst = parseFloat(item.cgst || 0);
                let sgst = parseFloat(item.sgst || 0);
                let igst = parseFloat(item.igst || 0);

                // Auto-calculate CGST/SGST if tax rate is provided but individual taxes are not
                if (gstEnabled && taxRate > 0 && cgst === 0 && sgst === 0 && igst === 0) {
                    // For intra-state transactions (CGST + SGST)
                    cgst = (taxRate / 2 * amountAfterDiscount) / 100;
                    sgst = (taxRate / 2 * amountAfterDiscount) / 100;
                    // For inter-state transactions, use IGST instead
                    // igst = (taxRate * amountAfterDiscount) / 100;
                }

                const itemTotalTax = cgst + sgst + igst;
                totalTax += itemTotalTax;
                totalCGST += cgst;
                totalSGST += sgst;
                totalIGST += igst;

                // Final item amount
                const itemAmount = amountAfterDiscount + itemTotalTax;

                // Process item
                const processedItem = {
                    itemRef: item.itemRef || null,
                    itemName: item.itemName.trim(),
                    hsnCode: item.hsnCode || '0000',
                    quantity,
                    unit: item.unit || 'PCS',
                    pricePerUnit,
                    taxRate,
                    discountPercent,
                    discountAmount: itemDiscountAmount,
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    igst: parseFloat(igst.toFixed(2)),
                    itemAmount: parseFloat(itemAmount.toFixed(2)),
                    lineNumber: i + 1
                };

                processedItems.push(processedItem);

                // ✅ OPTIONAL: Check stock for existing items
                if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
                    try {
                        const itemDetails = await Item.findById(item.itemRef);
                        if (itemDetails) {
                            console.log(`📦 Item ${item.itemName}: Current stock ${itemDetails.currentStock}, Adding ${quantity}`);
                        }
                    } catch (stockError) {
                        console.warn(`⚠️ Could not check stock for item ${item.itemName}:`, stockError.message);
                    }
                }
            }

            console.log('📊 Items processing complete:', {
                itemsCount: processedItems.length,
                subtotal: subtotal.toFixed(2),
                totalDiscount: totalDiscount.toFixed(2),
                totalTax: totalTax.toFixed(2)
            });

            // ✅ CALCULATE FINAL TOTALS
            const baseTotal = subtotal - totalDiscount;
            let finalTotal = baseTotal + totalTax;

            // Apply round off if enabled
            let appliedRoundOff = 0;
            if (roundOffEnabled && roundOff !== 0) {
                appliedRoundOff = parseFloat(roundOff);
                finalTotal += appliedRoundOff;
            }

            // Prepare totals object
            const totals = {
                subtotal: parseFloat(subtotal.toFixed(2)),
                totalDiscount: parseFloat(totalDiscount.toFixed(2)),
                totalTax: parseFloat(totalTax.toFixed(2)),
                totalCGST: parseFloat(totalCGST.toFixed(2)),
                totalSGST: parseFloat(totalSGST.toFixed(2)),
                totalIGST: parseFloat(totalIGST.toFixed(2)),
                roundOff: appliedRoundOff,
                finalTotal: parseFloat(finalTotal.toFixed(2))
            };

            console.log('💰 Final totals calculated:', totals);

            // ✅ PREPARE PAYMENT DETAILS
            const paymentDetails = {
                method: payment?.method || 'credit',
                status: payment?.status || 'pending',
                paidAmount: parseFloat(payment?.paidAmount || 0),
                pendingAmount: 0, // Will calculate below
                paymentDate: payment?.paymentDate ? new Date(payment.paymentDate) : new Date(),
                dueDate: payment?.dueDate ? new Date(payment.dueDate) : null,
                reference: payment?.reference || ''
            };

            // Calculate pending amount
            paymentDetails.pendingAmount = parseFloat((finalTotal - paymentDetails.paidAmount).toFixed(2));

            // Auto-determine payment status based on amount
            if (paymentDetails.paidAmount >= finalTotal) {
                paymentDetails.status = 'paid';
                paymentDetails.pendingAmount = 0;
            } else if (paymentDetails.paidAmount > 0) {
                paymentDetails.status = 'partial';
            } else {
                paymentDetails.status = 'pending';
            }

            console.log('💳 Payment details prepared:', {
                method: paymentDetails.method,
                status: paymentDetails.status,
                paidAmount: paymentDetails.paidAmount,
                pendingAmount: paymentDetails.pendingAmount
            });

            // ✅ CREATE PURCHASE OBJECT
            const purchaseData = {
                purchaseNumber,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
                purchaseType: gstEnabled ? 'gst' : 'non-gst',
                supplier: supplierRecord._id,
                supplierMobile: supplierMobile || supplierRecord.mobile || '',
                gstEnabled,
                companyId,
                items: processedItems,
                totals,
                payment: paymentDetails,
                notes: notes || '',
                termsAndConditions: termsAndConditions || '',
                status,
                createdBy: finalCreatedBy,
                lastModifiedBy: finalCreatedBy,
                createdAt: new Date(),
                lastModified: new Date()
            };

            console.log('📝 Creating purchase with data:', {
                purchaseNumber: purchaseData.purchaseNumber,
                supplier: purchaseData.supplier,
                companyId: purchaseData.companyId,
                itemsCount: purchaseData.items.length,
                finalTotal: purchaseData.totals.finalTotal,
                status: purchaseData.status
            });

            // ✅ SAVE PURCHASE TO DATABASE
            const purchase = new Purchase(purchaseData);
            await purchase.save();

            console.log('✅ Purchase saved to database:', purchase._id);

            // ✅ POPULATE SUPPLIER DETAILS FOR RESPONSE
            await purchase.populate('supplier', 'name mobile email address type gstNumber');

            // ✅ UPDATE ITEM STOCK (for purchases, increase stock)
            for (const item of processedItems) {
                if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
                    try {
                        const updatedItem = await Item.findByIdAndUpdate(
                            item.itemRef,
                            {
                                $inc: { currentStock: item.quantity },
                                $set: { lastModified: new Date() }
                            },
                            { new: true }
                        );

                        if (updatedItem) {
                            console.log(`📦 Stock updated for ${item.itemName}: +${item.quantity} (New: ${updatedItem.currentStock})`);
                        }
                    } catch (stockError) {
                        console.warn(`⚠️ Could not update stock for item ${item.itemName}:`, stockError.message);
                        // Don't fail the purchase creation for stock update errors
                    }
                }
            }

            console.log('✅ Purchase created successfully with ID:', purchase._id);

            // ✅ RETURN SUCCESS RESPONSE
            res.status(201).json({
                success: true,
                message: 'Purchase created successfully',
                data: {
                    purchase: {
                        _id: purchase._id,
                        purchaseNumber: purchase.purchaseNumber,
                        purchaseDate: purchase.purchaseDate,
                        purchaseType: purchase.purchaseType,
                        supplier: purchase.supplier,
                        supplierMobile: purchase.supplierMobile,
                        companyId: purchase.companyId,
                        gstEnabled: purchase.gstEnabled,
                        items: purchase.items,
                        totals: purchase.totals,
                        payment: purchase.payment,
                        status: purchase.status,
                        notes: purchase.notes,
                        termsAndConditions: purchase.termsAndConditions,
                        createdAt: purchase.createdAt,
                        createdBy: purchase.createdBy
                    },
                    summary: {
                        totalItems: processedItems.length,
                        totalQuantity: processedItems.reduce((sum, item) => sum + item.quantity, 0),
                        finalTotal: totals.finalTotal,
                        paymentStatus: paymentDetails.status,
                        supplierInfo: {
                            id: supplierRecord._id,
                            name: supplierRecord.name,
                            mobile: supplierRecord.mobile
                        }
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error creating purchase:', error);

            // Enhanced error response
            const errorResponse = {
                success: false,
                message: 'Failed to create purchase',
                error: error.message
            };

            // Add debug info in development
            if (process.env.NODE_ENV === 'development') {
                errorResponse.debug = {
                    stack: error.stack,
                    name: error.name,
                    code: error.code
                };
            }

            res.status(500).json(errorResponse);
        }
    },
    // Get all purchases with pagination and filters
    getAllPurchases: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                companyId,
                supplier,
                status,
                paymentStatus,
                purchaseType,
                receivingStatus,
                dateFrom,
                dateTo,
                search
            } = req.query;

            // Build filter object
            const filter = {};

            if (companyId) filter.companyId = companyId;
            if (supplier) filter.supplier = supplier;
            if (status) filter.status = status;
            if (paymentStatus) filter['payment.status'] = paymentStatus;
            if (purchaseType) filter.purchaseType = purchaseType;
            if (receivingStatus) filter.receivingStatus = receivingStatus;

            // Date range filter
            if (dateFrom || dateTo) {
                filter.purchaseDate = {};
                if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
                if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
            }

            // Search filter
            if (search) {
                filter.$or = [
                    { purchaseNumber: { $regex: search, $options: 'i' } },
                    { supplierMobile: { $regex: search, $options: 'i' } },
                    { purchaseOrderNumber: { $regex: search, $options: 'i' } },
                    { notes: { $regex: search, $options: 'i' } }
                ];
            }

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Get purchases with pagination
            const purchases = await Purchase.find(filter)
                .populate('supplier', 'name mobile email address type')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            // Get total count
            const totalPurchases = await Purchase.countDocuments(filter);
            const totalPages = Math.ceil(totalPurchases / parseInt(limit));

            // Calculate summary
            const summary = await Purchase.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$totals.finalTotal' },
                        totalTax: { $sum: '$totals.totalTax' },
                        totalDiscount: { $sum: '$totals.totalDiscount' },
                        totalPaid: { $sum: '$payment.paidAmount' },
                        totalPending: { $sum: '$payment.pendingAmount' }
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: {
                    purchases,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalPurchases,
                        hasNext: parseInt(page) < totalPages,
                        hasPrev: parseInt(page) > 1
                    },
                    summary: summary[0] || {
                        totalAmount: 0,
                        totalTax: 0,
                        totalDiscount: 0,
                        totalPaid: 0,
                        totalPending: 0
                    }
                }
            });

        } catch (error) {
            console.error('Error getting purchases:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get purchases',
                error: error.message
            });
        }
    },

    // Get purchase by ID
    getPurchaseById: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase ID'
                });
            }

            const purchase = await Purchase.findById(id)
                .populate('supplier', 'name mobile email address type gstNumber')
                .populate('items.itemRef', 'name itemCode category currentStock');

            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase not found'
                });
            }

            res.status(200).json({
                success: true,
                data: purchase
            });

        } catch (error) {
            console.error('Error getting purchase:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get purchase',
                error: error.message
            });
        }
    },

    // Update purchase
    updatePurchase: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase ID'
                });
            }

            const purchase = await Purchase.findById(id);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase not found'
                });
            }

            // Check if purchase can be updated
            if (purchase.status === 'completed' || purchase.status === 'cancelled') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update completed or cancelled purchases'
                });
            }

            // Update metadata
            updateData.lastModifiedBy = req.user?.id || 'system';

            const updatedPurchase = await Purchase.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('supplier', 'name mobile email address');

            res.status(200).json({
                success: true,
                message: 'Purchase updated successfully',
                data: updatedPurchase
            });

        } catch (error) {
            console.error('Error updating purchase:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update purchase',
                error: error.message
            });
        }
    },

    // Delete purchase (soft delete by marking as cancelled)
    deletePurchase: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase ID'
                });
            }

            const purchase = await Purchase.findById(id);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase not found'
                });
            }

            // Mark as cancelled instead of hard delete
            purchase.status = 'cancelled';
            purchase.lastModifiedBy = req.user?.id || 'system';
            await purchase.save();

            res.status(200).json({
                success: true,
                message: 'Purchase cancelled successfully'
            });

        } catch (error) {
            console.error('Error deleting purchase:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete purchase',
                error: error.message
            });
        }
    },

    // Mark purchase as ordered
    markAsOrdered: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase ID'
                });
            }

            const purchase = await Purchase.findById(id);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase not found'
                });
            }

            await purchase.markAsOrdered();

            res.status(200).json({
                success: true,
                message: 'Purchase marked as ordered',
                data: purchase
            });

        } catch (error) {
            console.error('Error marking purchase as ordered:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark purchase as ordered',
                error: error.message
            });
        }
    },

    // Mark purchase as received
    markAsReceived: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase ID'
                });
            }

            const purchase = await Purchase.findById(id);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase not found'
                });
            }

            await purchase.markAsReceived();

            res.status(200).json({
                success: true,
                message: 'Purchase marked as received',
                data: purchase
            });

        } catch (error) {
            console.error('Error marking purchase as received:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark purchase as received',
                error: error.message
            });
        }
    },

    // Mark purchase as completed
    completePurchase: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase ID'
                });
            }

            const purchase = await Purchase.findById(id);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase not found'
                });
            }

            if (purchase.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Purchase is already completed'
                });
            }

            await purchase.markAsCompleted();

            res.status(200).json({
                success: true,
                message: 'Purchase marked as completed',
                data: purchase
            });

        } catch (error) {
            console.error('Error completing purchase:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to complete purchase',
                error: error.message
            });
        }
    },

    // Add payment to purchase
    addPayment: async (req, res) => {
        try {
            const { id } = req.params;
            const { amount, method = 'cash', reference = '' } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase ID'
                });
            }

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid payment amount is required'
                });
            }

            const purchase = await Purchase.findById(id);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase not found'
                });
            }

            // Check if payment amount is valid
            const balance = purchase.balanceAmount;
            if (amount > balance) {
                return res.status(400).json({
                    success: false,
                    message: `Payment amount cannot exceed balance amount of ₹${balance}`
                });
            }

            // Add payment
            await purchase.addPayment(amount, method, reference);

            res.status(200).json({
                success: true,
                message: 'Payment added successfully',
                data: {
                    paidAmount: purchase.payment.paidAmount,
                    pendingAmount: purchase.payment.pendingAmount,
                    paymentStatus: purchase.payment.status
                }
            });

        } catch (error) {
            console.error('Error adding payment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add payment',
                error: error.message
            });
        }
    },

    // Get today's purchases
    getTodaysPurchases: async (req, res) => {
        try {
            const { companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const purchases = await Purchase.getTodaysPurchases(companyId)
                .populate('supplier', 'name mobile')
                .select('purchaseNumber purchaseDate totals.finalTotal payment.status items');

            // Calculate today's summary
            const summary = {
                totalPurchases: purchases.length,
                totalAmount: purchases.reduce((sum, purchase) => sum + purchase.totals.finalTotal, 0),
                totalItems: purchases.reduce((sum, purchase) => sum + purchase.items.length, 0),
                paidPurchases: purchases.filter(purchase => purchase.payment.status === 'paid').length,
                pendingPurchases: purchases.filter(purchase => purchase.payment.status === 'pending').length
            };

            res.status(200).json({
                success: true,
                data: {
                    purchases,
                    summary
                }
            });

        } catch (error) {
            console.error('Error getting today\'s purchases:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get today\'s purchases',
                error: error.message
            });
        }
    },

    // Get purchases report
    getPurchasesReport: async (req, res) => {
        try {
            const { companyId, startDate, endDate } = req.query;

            if (!companyId || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID, start date, and end date are required'
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            const report = await Purchase.aggregate([
                {
                    $match: {
                        companyId: mongoose.Types.ObjectId(companyId),
                        purchaseDate: { $gte: start, $lte: end },
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalPurchases: { $sum: '$totals.finalTotal' },
                        totalBills: { $sum: 1 },
                        totalItems: { $sum: { $size: '$items' } },
                        totalTax: { $sum: '$totals.totalTax' },
                        avgBillValue: { $avg: '$totals.finalTotal' }
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: report[0] || {
                    totalPurchases: 0,
                    totalBills: 0,
                    totalItems: 0,
                    totalTax: 0,
                    avgBillValue: 0
                }
            });

        } catch (error) {
            console.error('Error getting purchases report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get purchases report',
                error: error.message
            });
        }
    },

    // Get purchases dashboard data
    getDashboardData: async (req, res) => {
        try {
            const { companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

            // Get various metrics
            const [
                todaysPurchases,
                weekPurchases,
                monthPurchases,
                recentPurchases,
                topSuppliers,
                pendingPurchases,
                overduePurchases
            ] = await Promise.all([
                // Today's purchases
                Purchase.aggregate([
                    {
                        $match: {
                            companyId: mongoose.Types.ObjectId(companyId),
                            purchaseDate: {
                                $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                            },
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalPurchases: { $sum: '$totals.finalTotal' },
                            totalBills: { $sum: 1 }
                        }
                    }
                ]),

                // This week's purchases
                Purchase.aggregate([
                    {
                        $match: {
                            companyId: mongoose.Types.ObjectId(companyId),
                            purchaseDate: { $gte: startOfWeek },
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalPurchases: { $sum: '$totals.finalTotal' },
                            totalBills: { $sum: 1 }
                        }
                    }
                ]),

                // This month's purchases
                Purchase.aggregate([
                    {
                        $match: {
                            companyId: mongoose.Types.ObjectId(companyId),
                            purchaseDate: { $gte: startOfMonth },
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalPurchases: { $sum: '$totals.finalTotal' },
                            totalBills: { $sum: 1 }
                        }
                    }
                ]),

                // Recent purchases
                Purchase.find({ companyId, status: { $ne: 'cancelled' } })
                    .populate('supplier', 'name mobile')
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('purchaseNumber purchaseDate totals.finalTotal payment.status'),

                // Top suppliers
                Purchase.aggregate([
                    {
                        $match: {
                            companyId: mongoose.Types.ObjectId(companyId),
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: '$supplier',
                            totalPurchases: { $sum: '$totals.finalTotal' },
                            billCount: { $sum: 1 }
                        }
                    },
                    {
                        $lookup: {
                            from: 'parties',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'supplierInfo'
                        }
                    },
                    { $unwind: '$supplierInfo' },
                    {
                        $project: {
                            name: '$supplierInfo.name',
                            mobile: '$supplierInfo.mobile',
                            totalPurchases: 1,
                            billCount: 1
                        }
                    },
                    { $sort: { totalPurchases: -1 } },
                    { $limit: 5 }
                ]),

                // Pending purchases
                Purchase.getPendingPurchases(companyId),

                // Overdue purchases
                Purchase.getOverduePurchases(companyId)
            ]);

            res.status(200).json({
                success: true,
                data: {
                    today: todaysPurchases[0] || { totalPurchases: 0, totalBills: 0 },
                    week: weekPurchases[0] || { totalPurchases: 0, totalBills: 0 },
                    month: monthPurchases[0] || { totalPurchases: 0, totalBills: 0 },
                    recentPurchases,
                    topSuppliers,
                    pendingCount: pendingPurchases.length,
                    overdueCount: overduePurchases.length
                }
            });

        } catch (error) {
            console.error('Error getting dashboard data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard data',
                error: error.message
            });
        }
    },

    // Get payment status
    getPaymentStatus: async (req, res) => {
        try {
            const { id } = req.params;

            const purchase = await Purchase.findById(id).select('payment totals');

            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase not found'
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    paymentStatus: purchase.payment.status,
                    paidAmount: purchase.payment.paidAmount,
                    pendingAmount: purchase.payment.pendingAmount,
                    totalAmount: purchase.totals.finalTotal,
                    balanceAmount: purchase.balanceAmount,
                    paymentMethod: purchase.payment.method,
                    paymentDate: purchase.payment.paymentDate,
                    dueDate: purchase.payment.dueDate,
                    isDue: purchase.isDue
                }
            });
        } catch (error) {
            console.error('Error getting payment status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment status',
                error: error.message
            });
        }
    },

    // Get monthly report
    getMonthlyReport: async (req, res) => {
        try {
            const { companyId, year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const monthlyData = await Purchase.aggregate([
                {
                    $match: {
                        companyId: mongoose.Types.ObjectId(companyId),
                        purchaseDate: { $gte: startDate, $lte: endDate },
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: { $dayOfMonth: '$purchaseDate' },
                        dailyPurchases: { $sum: '$totals.finalTotal' },
                        dailyBills: { $sum: 1 },
                        dailyItems: { $sum: { $size: '$items' } }
                    }
                },
                { $sort: { '_id': 1 } }
            ]);

            const summary = await Purchase.aggregate([
                {
                    $match: {
                        companyId: mongoose.Types.ObjectId(companyId),
                        purchaseDate: { $gte: startDate, $lte: endDate },
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalPurchases: { $sum: '$totals.finalTotal' },
                        totalBills: { $sum: 1 },
                        totalTax: { $sum: '$totals.totalTax' },
                        avgDailyPurchases: { $avg: '$totals.finalTotal' }
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: {
                    monthlyBreakdown: monthlyData,
                    summary: summary[0] || { totalPurchases: 0, totalBills: 0, totalTax: 0, avgDailyPurchases: 0 },
                    period: { year: parseInt(year), month: parseInt(month) }
                }
            });
        } catch (error) {
            console.error('Error getting monthly report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get monthly report',
                error: error.message
            });
        }
    },

    // Get top items purchased
    getTopItems: async (req, res) => {
        try {
            const { companyId, limit = 10, dateFrom, dateTo } = req.query;

            const matchConditions = {
                companyId: mongoose.Types.ObjectId(companyId),
                status: { $ne: 'cancelled' }
            };

            if (dateFrom || dateTo) {
                matchConditions.purchaseDate = {};
                if (dateFrom) matchConditions.purchaseDate.$gte = new Date(dateFrom);
                if (dateTo) matchConditions.purchaseDate.$lte = new Date(dateTo);
            }

            const topItems = await Purchase.aggregate([
                { $match: matchConditions },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.itemName',
                        totalQuantity: { $sum: '$items.quantity' },
                        totalCost: { $sum: '$items.itemAmount' },
                        timesPurchased: { $sum: 1 },
                        avgPrice: { $avg: '$items.pricePerUnit' }
                    }
                },
                { $sort: { totalCost: -1 } },
                { $limit: parseInt(limit) }
            ]);

            res.status(200).json({
                success: true,
                data: topItems
            });
        } catch (error) {
            console.error('Error getting top items:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get top items',
                error: error.message
            });
        }
    },

    // Get supplier stats
    getSupplierStats: async (req, res) => {
        try {
            const { companyId, supplierId } = req.query;

            if (!supplierId) {
                return res.status(400).json({
                    success: false,
                    message: 'Supplier ID is required'
                });
            }

            const supplierStats = await Purchase.aggregate([
                {
                    $match: {
                        companyId: mongoose.Types.ObjectId(companyId),
                        supplier: mongoose.Types.ObjectId(supplierId),
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalPurchases: { $sum: '$totals.finalTotal' },
                        totalBills: { $sum: 1 },
                        totalItems: { $sum: { $size: '$items' } },
                        avgBillValue: { $avg: '$totals.finalTotal' },
                        lastPurchaseDate: { $max: '$purchaseDate' },
                        firstPurchaseDate: { $min: '$purchaseDate' }
                    }
                }
            ]);

            const recentPurchases = await Purchase.find({
                companyId,
                supplier: supplierId,
                status: { $ne: 'cancelled' }
            })
                .sort({ purchaseDate: -1 })
                .limit(5)
                .select('purchaseNumber purchaseDate totals.finalTotal payment.status');

            res.status(200).json({
                success: true,
                data: {
                    stats: supplierStats[0] || {
                        totalPurchases: 0,
                        totalBills: 0,
                        totalItems: 0,
                        avgBillValue: 0,
                        lastPurchaseDate: null,
                        firstPurchaseDate: null
                    },
                    recentPurchases
                }
            });
        } catch (error) {
            console.error('Error getting supplier stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get supplier statistics',
                error: error.message
            });
        }
    },

    // Get next purchase number
    getNextPurchaseNumber: async (req, res) => {
        try {
            const { companyId, purchaseType = 'gst' } = req.query;

            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            const todayStart = new Date(year, date.getMonth(), date.getDate());
            const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

            const lastPurchase = await Purchase.findOne({
                companyId,
                purchaseDate: { $gte: todayStart, $lt: todayEnd },
                purchaseNumber: new RegExp(`^${purchaseType.toUpperCase()}-${year}${month}${day}`)
            }).sort({ purchaseNumber: -1 });

            let sequence = 1;
            if (lastPurchase) {
                const lastSequence = parseInt(lastPurchase.purchaseNumber.split('-')[2]);
                sequence = lastSequence + 1;
            }

            const prefix = purchaseType === 'gst' ? 'PO-GST' : 'PO';
            const nextPurchaseNumber = `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;

            res.status(200).json({
                success: true,
                data: {
                    nextPurchaseNumber,
                    purchaseType,
                    date: new Date().toISOString().split('T')[0]
                }
            });
        } catch (error) {
            console.error('Error generating purchase number:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate purchase number',
                error: error.message
            });
        }
    },

    // Get pending purchases
    getPendingPurchases: async (req, res) => {
        try {
            const { companyId } = req.query;

            const pendingPurchases = await Purchase.getPendingPurchases(companyId)
                .populate('supplier', 'name mobile')
                .select('purchaseNumber purchaseDate totals.finalTotal payment.paidAmount payment.pendingAmount payment.dueDate');

            res.status(200).json({
                success: true,
                data: pendingPurchases
            });
        } catch (error) {
            console.error('Error getting pending purchases:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get pending purchases',
                error: error.message
            });
        }
    },

    // Get overdue purchases
    getOverduePurchases: async (req, res) => {
        try {
            const { companyId } = req.query;

            const overduePurchases = await Purchase.getOverduePurchases(companyId)
                .populate('supplier', 'name mobile')
                .select('purchaseNumber purchaseDate totals.finalTotal payment.paidAmount payment.pendingAmount payment.dueDate');

            res.status(200).json({
                success: true,
                data: overduePurchases
            });
        } catch (error) {
            console.error('Error getting overdue purchases:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get overdue purchases',
                error: error.message
            });
        }
    },

    // Export CSV
    exportCSV: async (req, res) => {
        try {
            const {
                companyId,
                supplier,
                status,
                paymentStatus,
                purchaseType,
                dateFrom,
                dateTo
            } = req.query;

            // Build filter object (same as getAllPurchases)
            const filter = { companyId };
            if (supplier) filter.supplier = supplier;
            if (status) filter.status = status;
            if (paymentStatus) filter['payment.status'] = paymentStatus;
            if (purchaseType) filter.purchaseType = purchaseType;

            if (dateFrom || dateTo) {
                filter.purchaseDate = {};
                if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
                if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
            }

            const purchases = await Purchase.find(filter)
                .populate('supplier', 'name mobile email')
                .sort({ purchaseDate: -1 })
                .limit(1000); // Limit for performance

            // Convert to CSV format
            const csvHeaders = [
                'Purchase Number',
                'Purchase Date',
                'Supplier Name',
                'Supplier Mobile',
                'Purchase Type',
                'Total Amount',
                'Tax Amount',
                'Payment Status',
                'Status',
                'Due Date'
            ];

            const csvRows = purchases.map(purchase => [
                purchase.purchaseNumber,
                purchase.purchaseDate.toISOString().split('T')[0],
                purchase.supplier?.name || '',
                purchase.supplier?.mobile || purchase.supplierMobile || '',
                purchase.purchaseType,
                purchase.totals.finalTotal,
                purchase.totals.totalTax,
                purchase.payment.status,
                purchase.status,
                purchase.payment.dueDate ? purchase.payment.dueDate.toISOString().split('T')[0] : ''
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=purchases-export.csv');
            res.status(200).send(csvContent);

        } catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export CSV',
                error: error.message
            });
        }
    }
};

module.exports = purchaseController;