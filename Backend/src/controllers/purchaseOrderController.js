const PurchaseOrder = require('../models/PurchaseOrder');
const Purchase = require('../models/Purchase');
const Item = require('../models/Item');
const Party = require('../models/Party');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

// Enhanced findOrCreateSupplier function with better duplicate handling
const findOrCreateSupplier = async (supplierName, supplierMobile, supplierId, companyId, userId) => {
    try {
        let supplierRecord;

        // 1. If supplier ID is provided, use it directly
        if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
            const foundSupplier = await Party.findById(supplierId);
            if (foundSupplier && foundSupplier.companyId.toString() === companyId.toString()) {
                return foundSupplier;
            }
        }

        // 2. Enhanced mobile search with exact matching
        if (supplierMobile) {
            const cleanMobile = supplierMobile.toString().replace(/[\s\-\(\)]/g, '');
            const mobileVariations = [cleanMobile, supplierMobile, supplierMobile.toString()];

            // Use aggregation pipeline for better search
            const supplierByMobile = await Party.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        $or: [
                            { type: 'supplier' },
                            { type: { $exists: false } },
                            { type: null }
                        ],
                        $or: [
                            { mobile: { $in: mobileVariations } },
                            { phoneNumber: { $in: mobileVariations } },
                            { phone: { $in: mobileVariations } },
                            { contactNumber: { $in: mobileVariations } }
                        ]
                    }
                },
                { $limit: 1 }
            ]);

            if (supplierByMobile && supplierByMobile.length > 0) {
                const foundSupplier = await Party.findById(supplierByMobile[0]._id);

                // Update name if provided and different
                if (supplierName && supplierName.trim() !== foundSupplier.name) {
                    foundSupplier.name = supplierName.trim();
                    await foundSupplier.save();
                }
                return foundSupplier;
            }

            // Fallback: Try raw MongoDB query
            try {
                const db = mongoose.connection.db;
                const collection = db.collection('parties');

                const rawSupplier = await collection.findOne({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    $or: [
                        { mobile: { $in: mobileVariations } },
                        { phoneNumber: { $in: mobileVariations } },
                        { phone: { $in: mobileVariations } },
                        { contactNumber: { $in: mobileVariations } }
                    ]
                });

                if (rawSupplier) {
                    const foundSupplier = await Party.findById(rawSupplier._id);

                    // Update name if provided and different
                    if (supplierName && supplierName.trim() !== foundSupplier.name) {
                        foundSupplier.name = supplierName.trim();
                        await foundSupplier.save();
                    }
                    return foundSupplier;
                }
            } catch (rawQueryError) {
                // Continue to name search
            }
        }

        // 3. Enhanced search by name with better regex
        if (supplierName) {
            const nameVariations = [
                supplierName.trim(),
                supplierName.trim().toLowerCase(),
                supplierName.trim().toUpperCase()
            ];

            const supplierByName = await Party.findOne({
                companyId: companyId,
                $or: [
                    { type: 'supplier' },
                    { type: { $exists: false } },
                    { type: null }
                ],
                $or: nameVariations.map(name => ({
                    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                }))
            });

            if (supplierByName) {
                // Update mobile if provided
                if (supplierMobile && !supplierByName.mobile && !supplierByName.phoneNumber) {
                    supplierByName.mobile = supplierMobile;
                    supplierByName.phoneNumber = supplierMobile;
                    await supplierByName.save();
                }
                return supplierByName;
            }
        }

        // 4. Create new supplier with better validation
        if (!supplierName || !supplierName.trim()) {
            throw new Error('Supplier name is required to create new supplier');
        }

        // Clean and prepare data before creation
        const cleanSupplierData = {
            name: supplierName.trim(),
            mobile: supplierMobile ? supplierMobile.toString() : '',
            phoneNumber: supplierMobile ? supplierMobile.toString() : '',
            type: 'supplier',
            partyType: 'supplier',
            email: '',
            companyId: companyId,
            userId: userId,
            createdBy: userId,
            homeAddressLine: '',
            address: '',
            gstNumber: '',
            panNumber: '',
            status: 'active',
            creditLimit: 0,
            creditDays: 0,
            currentBalance: 0,
            openingBalance: 0
        };

        // Only add mobile/phoneNumber if provided to avoid duplicate key error
        if (supplierMobile && supplierMobile.trim()) {
            const existingParty = await Party.findOne({ companyId }).select('mobile phoneNumber');

            if (existingParty && existingParty.mobile !== undefined) {
                cleanSupplierData.mobile = supplierMobile.trim();
            } else {
                cleanSupplierData.phoneNumber = supplierMobile.trim();
            }
        }

        try {
            supplierRecord = new Party(cleanSupplierData);
            await supplierRecord.save();
            return supplierRecord;
        } catch (saveError) {
            // If it's a duplicate key error, try to find the existing record
            if (saveError.code === 11000) {
                // Try to find by mobile again
                if (supplierMobile) {
                    supplierRecord = await Party.findOne({
                        $or: [
                            { mobile: supplierMobile },
                            { phoneNumber: supplierMobile }
                        ],
                        type: 'supplier',
                        companyId
                    });
                }

                // Try to find by name if mobile search failed
                if (!supplierRecord && supplierName) {
                    supplierRecord = await Party.findOne({
                        name: { $regex: new RegExp(`^${supplierName.trim()}$`, 'i') },
                        type: 'supplier',
                        companyId
                    });
                }

                if (supplierRecord) {
                    return supplierRecord;
                }
            }

            throw new Error(`Failed to create supplier: ${saveError.message}`);
        }

        if (!supplierRecord) {
            throw new Error('Unable to find or create supplier');
        }

        return supplierRecord;

    } catch (error) {
        // Enhanced error messages for different error types
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            throw new Error(`Supplier validation failed: ${validationErrors.join(', ')}`);
        }

        if (error.name === 'CastError') {
            throw new Error(`Invalid data format for supplier: ${error.message}`);
        }

        // Handle duplicate key error with comprehensive recovery
        if (error.code === 11000 || error.message.includes('E11000') || error.message.includes('duplicate key')) {
            try {
                // Comprehensive recovery: Try all possible search methods
                const recoverySearches = [];

                // Search by mobile with all possible field combinations
                if (supplierMobile) {
                    const cleanMobile = supplierMobile.toString().replace(/[\s\-\(\)]/g, '');

                    recoverySearches.push(
                        Party.findOne({ companyId: companyId, mobile: supplierMobile }),
                        Party.findOne({ companyId: companyId, phoneNumber: supplierMobile }),
                        Party.findOne({ companyId: companyId, phone: supplierMobile }),
                        Party.findOne({ companyId: companyId, contactNumber: supplierMobile }),
                        Party.findOne({ companyId: companyId, mobile: cleanMobile }),
                        Party.findOne({ companyId: companyId, phoneNumber: cleanMobile })
                    );
                }

                // Search by name
                if (supplierName) {
                    recoverySearches.push(
                        Party.findOne({ companyId: companyId, name: supplierName.trim() }),
                        Party.findOne({ companyId: companyId, name: { $regex: new RegExp(`^${supplierName.trim()}$`, 'i') } })
                    );
                }

                // Execute all searches in parallel
                const searchResults = await Promise.allSettled(recoverySearches);

                // Find the first successful result
                for (const result of searchResults) {
                    if (result.status === 'fulfilled' && result.value) {
                        // Update any missing fields
                        let needsUpdate = false;

                        if (supplierName && result.value.name !== supplierName.trim()) {
                            result.value.name = supplierName.trim();
                            needsUpdate = true;
                        }

                        if (supplierMobile && !result.value.mobile) {
                            result.value.mobile = supplierMobile;
                            needsUpdate = true;
                        }

                        if (supplierMobile && !result.value.phoneNumber) {
                            result.value.phoneNumber = supplierMobile;
                            needsUpdate = true;
                        }

                        if (!result.value.type) {
                            result.value.type = 'supplier';
                            needsUpdate = true;
                        }

                        if (needsUpdate) {
                            try {
                                await result.value.save();
                            } catch (updateError) {
                                // Continue if update fails
                            }
                        }

                        return result.value;
                    }
                }

                // Last resort: Use raw MongoDB aggregation
                const db = mongoose.connection.db;
                const collection = db.collection('parties');

                let rawResult = null;

                if (supplierMobile) {
                    rawResult = await collection.findOne({
                        companyId: new mongoose.Types.ObjectId(companyId),
                        $or: [
                            { mobile: supplierMobile },
                            { phoneNumber: supplierMobile },
                            { phone: supplierMobile },
                            { contactNumber: supplierMobile }
                        ]
                    });
                }

                if (!rawResult && supplierName) {
                    rawResult = await collection.findOne({
                        companyId: new mongoose.Types.ObjectId(companyId),
                        name: { $regex: new RegExp(`^${supplierName.trim()}$`, 'i') }
                    });
                }

                if (rawResult) {
                    const recoveredSupplier = await Party.findById(rawResult._id);
                    return recoveredSupplier;
                }

                // If all recovery attempts fail, provide detailed error
                const errorDetails = {
                    supplierName,
                    supplierMobile,
                    companyId,
                    searchAttempts: recoverySearches.length,
                    duplicateKeyError: error.keyValue || {},
                    suggestion: 'Check database directly for data inconsistency'
                };

                throw new Error(`Supplier already exists but cannot be found. This indicates a database inconsistency. Details: ${JSON.stringify(errorDetails)}`);

            } catch (recoveryError) {
                throw new Error(`Database error: Unable to resolve supplier conflict. Original error: ${error.message}. Recovery error: ${recoveryError.message}`);
            }
        }

        // Re-throw other errors with additional context
        throw new Error(`Supplier operation failed: ${error.message}`);
    }
};

const purchaseOrderController = {

    createPurchaseOrder: async (req, res) => {
        try {
            const {
                supplierName,
                supplierMobile,
                supplier,
                orderNumber,
                orderDate,
                orderType = 'purchase_order',
                validUntil,
                expectedDeliveryDate,
                requiredBy,
                gstEnabled = true,
                gstType = 'gst',
                companyId,
                items,
                payment,
                notes,
                termsAndConditions,
                supplierNotes,
                internalNotes,
                roundOff = 0,
                roundOffEnabled = false,
                status = 'draft',
                priority = 'normal',
                departmentRef,
                shippingAddress,
                taxMode = 'without-tax',
                priceIncludesTax = false
            } = req.body;

            // Validate required fields
            if ((!supplierName && !supplier) || !companyId || !items || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Supplier (name or ID), Company, and Items are required'
                });
            }

            // Validate order type
            if (!['purchase_order', 'purchase_quotation', 'proforma_purchase'].includes(orderType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order type. Must be purchase_order, purchase_quotation, or proforma_purchase'
                });
            }

            // Check if order number already exists (if provided)
            if (orderNumber) {
                const existingOrder = await PurchaseOrder.findOne({
                    orderNumber: orderNumber,
                    companyId: companyId
                });

                if (existingOrder) {
                    return res.status(400).json({
                        success: false,
                        message: `Purchase order with number ${orderNumber} already exists for this company`,
                        existingOrder: {
                            id: existingOrder._id,
                            orderNumber: existingOrder.orderNumber,
                            orderDate: existingOrder.orderDate,
                            orderType: existingOrder.orderType,
                            supplierName: existingOrder.supplier?.name || 'Unknown',
                            status: existingOrder.status
                        }
                    });
                }
            }

            // Generate order number if not provided
            let finalOrderNumber = orderNumber;
            if (!finalOrderNumber) {
                const date = new Date();
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');

                // Get prefix based on order type
                let prefix;
                switch (orderType) {
                    case 'purchase_quotation':
                        prefix = 'PQU';
                        break;
                    case 'proforma_purchase':
                        prefix = 'PPO';
                        break;
                    case 'purchase_order':
                        prefix = 'PO';
                        break;
                    default:
                        prefix = 'PO';
                }

                // Find the last order number for today to determine sequence
                const todayStart = new Date(year, date.getMonth(), date.getDate());
                const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

                const lastOrder = await PurchaseOrder.findOne({
                    companyId,
                    orderDate: { $gte: todayStart, $lt: todayEnd },
                    orderNumber: new RegExp(`^${prefix}-${year}${month}${day}`)
                }).sort({ orderNumber: -1 });

                let sequence = 1;
                if (lastOrder && lastOrder.orderNumber) {
                    const lastSequence = parseInt(lastOrder.orderNumber.split('-').pop());
                    if (!isNaN(lastSequence)) {
                        sequence = lastSequence + 1;
                    }
                }

                finalOrderNumber = `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;

                // Double-check generated number doesn't exist
                const duplicateCheck = await PurchaseOrder.findOne({
                    orderNumber: finalOrderNumber,
                    companyId: companyId
                });

                if (duplicateCheck) {
                    sequence += 1;
                    finalOrderNumber = `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;
                }
            }

            // Sync tax mode fields
            const finalGstType = gstType || (gstEnabled ? 'gst' : 'non-gst');
            const finalTaxMode = taxMode || (priceIncludesTax ? 'with-tax' : 'without-tax');
            const finalPriceIncludesTax = finalTaxMode === 'with-tax';
            const finalGstEnabled = finalGstType === 'gst';

            // Find or create supplier
            let supplierRecord;
            try {
                supplierRecord = await findOrCreateSupplier(
                    supplierName,
                    supplierMobile,
                    supplier,
                    companyId,
                    req.user?.id || companyId
                );
            } catch (supplierError) {
                return res.status(400).json({
                    success: false,
                    message: 'Supplier resolution failed',
                    error: supplierError.message,
                    details: {
                        supplierName,
                        supplierMobile,
                        companyId,
                        suggestion: supplierMobile ?
                            `Try searching for existing supplier with mobile ${supplierMobile} in your supplier list` :
                            'Ensure supplier name is provided for new supplier creation'
                    }
                });
            }

            // Process items with proper tax mode handling
            const processedItems = [];
            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;
            let totalTaxableAmount = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Frontend field mapping
                const itemName = item.productName || item.itemName;
                const itemCode = item.productCode || item.itemCode || '';
                const pricePerUnit = parseFloat(item.price || item.pricePerUnit || 0);
                const quantity = parseFloat(item.quantity);
                const description = item.description || '';
                const gstRate = parseFloat(item.gstRate || item.taxRate || 18);
                const unit = item.unit === 'pcs' ? 'PCS' : (item.unit || 'PCS');
                const hsnNumber = item.hsnNumber || item.hsnCode || '0000';

                // Frontend GST mode mapping
                const itemGstMode = item.gstMode || item.taxMode || finalTaxMode;
                const itemPriceIncludesTax = itemGstMode === 'include' ||
                    (itemGstMode === 'with-tax') ||
                    (item.priceIncludesTax === true);

                // Basic validation
                if (!itemName || !quantity || !pricePerUnit) {
                    return res.status(400).json({
                        success: false,
                        message: `Item ${i + 1}: Name, quantity, and price are required`
                    });
                }

                if (isNaN(quantity) || isNaN(pricePerUnit) || quantity <= 0 || pricePerUnit < 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Item ${i + 1}: Invalid quantity or price values`
                    });
                }

                // Calculate base amount
                const baseAmount = quantity * pricePerUnit;

                // Calculate discount
                const discountPercent = parseFloat(item.discountPercent || 0);
                const discountAmount = parseFloat(item.discountAmount || 0);
                let itemDiscountAmount = discountAmount;
                if (discountAmount === 0 && discountPercent > 0) {
                    itemDiscountAmount = (baseAmount * discountPercent) / 100;
                }
                const amountAfterDiscount = baseAmount - itemDiscountAmount;

                // Get tax rates
                let itemCgstRate = 0;
                let itemSgstRate = 0;
                let itemIgstRate = 0;

                if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
                    const itemDetails = await Item.findById(item.itemRef).select('cgst sgst igst taxRate');
                    if (itemDetails) {
                        itemCgstRate = parseFloat(itemDetails.cgst || 0);
                        itemSgstRate = parseFloat(itemDetails.sgst || 0);
                        itemIgstRate = parseFloat(itemDetails.igst || 0);

                        if (itemCgstRate === 0 && itemSgstRate === 0 && itemIgstRate === 0) {
                            const itemTaxRate = parseFloat(itemDetails.taxRate || gstRate || 0);
                            if (itemTaxRate > 0) {
                                itemCgstRate = itemTaxRate / 2;
                                itemSgstRate = itemTaxRate / 2;
                                itemIgstRate = 0;
                            }
                        }
                    }
                } else if (gstRate > 0) {
                    itemCgstRate = gstRate / 2;
                    itemSgstRate = gstRate / 2;
                    itemIgstRate = 0;
                }

                // Calculate taxes based on item tax mode
                let cgst = 0;
                let sgst = 0;
                let igst = 0;
                let itemAmount = 0;
                let itemTaxableAmount = 0;

                if (finalGstEnabled && (itemCgstRate > 0 || itemSgstRate > 0 || itemIgstRate > 0)) {
                    const totalTaxRate = itemCgstRate + itemSgstRate + itemIgstRate;

                    if (itemPriceIncludesTax) {
                        // WITH TAX MODE - Extract tax from amount
                        const taxMultiplier = 1 + (totalTaxRate / 100);
                        itemTaxableAmount = amountAfterDiscount / taxMultiplier;

                        cgst = (itemTaxableAmount * itemCgstRate) / 100;
                        sgst = (itemTaxableAmount * itemSgstRate) / 100;
                        igst = (itemTaxableAmount * itemIgstRate) / 100;

                        itemAmount = amountAfterDiscount; // Amount stays same (tax included)
                    } else {
                        // WITHOUT TAX MODE - Add tax to amount
                        itemTaxableAmount = amountAfterDiscount;
                        cgst = (itemTaxableAmount * itemCgstRate) / 100;
                        sgst = (itemTaxableAmount * itemSgstRate) / 100;
                        igst = (itemTaxableAmount * itemIgstRate) / 100;

                        itemAmount = itemTaxableAmount + cgst + sgst + igst; // Add tax
                    }
                } else {
                    // No GST
                    itemTaxableAmount = amountAfterDiscount;
                    itemAmount = amountAfterDiscount;
                }

                // Update totals
                subtotal += baseAmount;
                totalDiscount += itemDiscountAmount;
                totalTaxableAmount += itemTaxableAmount;
                const itemTotalTax = cgst + sgst + igst;
                totalTax += itemTotalTax;

                // Create processed item with both frontend and backend fields
                const processedItem = {
                    // Item reference
                    itemRef: item.selectedProduct && mongoose.Types.ObjectId.isValid(item.selectedProduct)
                        ? item.selectedProduct : null,
                    selectedProduct: item.selectedProduct || '',

                    // Item details - dual field mapping
                    itemName: itemName,
                    productName: itemName,
                    itemCode: itemCode,
                    productCode: itemCode,
                    description: description,
                    hsnCode: hsnNumber,
                    hsnNumber: hsnNumber,
                    category: item.category || '',

                    // Quantity and unit
                    quantity,
                    unit: unit,

                    // Pricing - dual field mapping
                    pricePerUnit: pricePerUnit,
                    price: pricePerUnit,
                    purchasePrice: pricePerUnit,
                    taxRate: itemCgstRate + itemSgstRate + itemIgstRate,
                    gstRate: itemCgstRate + itemSgstRate + itemIgstRate,

                    // Tax modes - dual field mapping
                    taxMode: itemPriceIncludesTax ? 'with-tax' : 'without-tax',
                    gstMode: itemPriceIncludesTax ? 'include' : 'exclude',
                    priceIncludesTax: itemPriceIncludesTax,

                    // Stock info
                    availableStock: item.availableStock || 0,

                    // Discount
                    discountPercent,
                    discountAmount: parseFloat(itemDiscountAmount.toFixed(2)),

                    // Tax amounts - dual field mapping
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    igst: parseFloat(igst.toFixed(2)),
                    cgstAmount: parseFloat(cgst.toFixed(2)),
                    sgstAmount: parseFloat(sgst.toFixed(2)),
                    igstAmount: parseFloat(igst.toFixed(2)),

                    // Calculated amounts - dual field mapping
                    subtotal: parseFloat((baseAmount - itemDiscountAmount).toFixed(2)),
                    taxableAmount: parseFloat(itemTaxableAmount.toFixed(2)),
                    totalTaxAmount: parseFloat(itemTotalTax.toFixed(2)),
                    gstAmount: parseFloat(itemTotalTax.toFixed(2)),

                    // Final amounts - dual field mapping
                    amount: parseFloat(itemAmount.toFixed(2)),
                    itemAmount: parseFloat(itemAmount.toFixed(2)),
                    totalAmount: parseFloat(itemAmount.toFixed(2)),

                    // Line number
                    lineNumber: i + 1
                };

                processedItems.push(processedItem);
            }

            // Calculate final totals
            const finalTotal = processedItems.reduce((sum, item) => sum + item.amount, 0);

            // Apply round off if enabled
            let appliedRoundOff = 0;
            let adjustedFinalTotal = finalTotal;
            if (roundOffEnabled && roundOff !== 0) {
                appliedRoundOff = parseFloat(roundOff);
                adjustedFinalTotal = finalTotal + appliedRoundOff;
            }

            // Prepare totals object
            const totals = {
                subtotal: parseFloat(subtotal.toFixed(2)),
                totalQuantity: processedItems.reduce((sum, item) => sum + item.quantity, 0),
                totalDiscount: parseFloat(totalDiscount.toFixed(2)),
                totalDiscountAmount: parseFloat(totalDiscount.toFixed(2)),
                totalTax: parseFloat(totalTax.toFixed(2)),
                totalCGST: parseFloat(processedItems.reduce((sum, item) => sum + item.cgst, 0).toFixed(2)),
                totalSGST: parseFloat(processedItems.reduce((sum, item) => sum + item.sgst, 0).toFixed(2)),
                totalIGST: parseFloat(processedItems.reduce((sum, item) => sum + item.igst, 0).toFixed(2)),
                totalTaxableAmount: parseFloat(totalTaxableAmount.toFixed(2)),
                finalTotal: parseFloat(adjustedFinalTotal.toFixed(2)),
                roundOff: parseFloat(appliedRoundOff.toFixed(2)),
                withTaxTotal: finalPriceIncludesTax ? parseFloat(adjustedFinalTotal.toFixed(2)) : parseFloat((totalTaxableAmount + totalTax + appliedRoundOff).toFixed(2)),
                withoutTaxTotal: finalPriceIncludesTax ? parseFloat(totalTaxableAmount.toFixed(2)) : parseFloat(adjustedFinalTotal.toFixed(2))
            };

            // Payment details (Purchase-specific: Default to credit payment with longer credit days)
            const paymentDetails = {
                method: payment?.method || 'credit',
                status: payment?.status || 'pending',
                paidAmount: parseFloat(payment?.paidAmount || 0),
                advanceAmount: parseFloat(payment?.advanceAmount || 0),
                pendingAmount: 0,
                paymentDate: payment?.paymentDate ? new Date(payment.paymentDate) : new Date(),
                dueDate: payment?.dueDate ? new Date(payment.dueDate) : null,
                creditDays: parseInt(payment?.creditDays || 30), // Default 30 days for purchases
                reference: payment?.reference || '',
                notes: payment?.notes || ''
            };

            const paidAmount = Math.max(paymentDetails.paidAmount, paymentDetails.advanceAmount);
            paymentDetails.paidAmount = paidAmount;
            paymentDetails.pendingAmount = parseFloat((adjustedFinalTotal - paidAmount).toFixed(2));

            // Auto-determine payment status
            if (paidAmount >= adjustedFinalTotal) {
                paymentDetails.status = 'paid';
                paymentDetails.pendingAmount = 0;
                paymentDetails.dueDate = null;
            } else if (paidAmount > 0) {
                paymentDetails.status = 'partial';
                if (paymentDetails.creditDays > 0 && !paymentDetails.dueDate) {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + paymentDetails.creditDays);
                    paymentDetails.dueDate = dueDate;
                }
            } else {
                paymentDetails.status = 'pending';
                paymentDetails.pendingAmount = adjustedFinalTotal;
                if (paymentDetails.creditDays > 0 && !paymentDetails.dueDate) {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + paymentDetails.creditDays);
                    paymentDetails.dueDate = dueDate;
                }
            }

            if (paymentDetails.pendingAmount < 0) {
                paymentDetails.pendingAmount = 0;
            }

            // Initialize payment history
            let paymentHistory = [];
            if (paidAmount > 0) {
                paymentHistory.push({
                    amount: paidAmount,
                    method: paymentDetails.method,
                    reference: paymentDetails.reference,
                    paymentDate: paymentDetails.paymentDate,
                    dueDate: paymentDetails.dueDate,
                    notes: paymentDetails.notes || 'Initial payment',
                    createdAt: new Date(),
                    createdBy: req.user?.id || 'system'
                });
            }

            // Set validity date for quotations
            let orderValidUntil = validUntil ? new Date(validUntil) : null;
            if (!orderValidUntil && orderType === 'purchase_quotation') {
                orderValidUntil = new Date();
                orderValidUntil.setDate(orderValidUntil.getDate() + 30);
            }

            // Create purchase order object
            const purchaseOrderData = {
                orderNumber: finalOrderNumber,
                orderDate: orderDate ? new Date(orderDate) : new Date(),
                orderType,
                validUntil: orderValidUntil,
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                requiredBy: requiredBy ? new Date(requiredBy) : null,
                supplier: supplierRecord._id,
                supplierMobile: supplierMobile || supplierRecord.mobile || supplierRecord.phoneNumber,

                // GST and tax settings with dual fields
                gstEnabled: finalGstEnabled,
                gstType: finalGstType,
                taxMode: finalTaxMode,
                priceIncludesTax: finalPriceIncludesTax,

                companyId,
                items: processedItems,
                totals,
                payment: paymentDetails,
                paymentHistory: paymentHistory,
                notes: notes || '',
                termsAndConditions: termsAndConditions || '',
                supplierNotes: supplierNotes || '',
                internalNotes: internalNotes || '',
                status,
                priority,
                departmentRef: departmentRef || null,
                shippingAddress: shippingAddress || {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: 'India'
                },
                createdBy: req.user?.id || 'system',
                lastModifiedBy: req.user?.id || 'system'
            };

            // Create the purchase order
            const purchaseOrder = new PurchaseOrder(purchaseOrderData);
            await purchaseOrder.save();

            // Populate supplier details for response
            await purchaseOrder.populate('supplier', 'name mobile phoneNumber email address type');

            res.status(201).json({
                success: true,
                message: `${orderType === 'purchase_quotation' ? 'Purchase quotation' : orderType === 'proforma_purchase' ? 'Proforma purchase' : 'Purchase order'} created successfully`,
                data: {
                    purchaseOrder,
                    order: {
                        orderNumber: purchaseOrder.orderNumber,
                        orderDate: purchaseOrder.orderDate,
                        orderType: purchaseOrder.orderType,
                        validUntil: purchaseOrder.validUntil,
                        supplier: {
                            name: supplierRecord.name,
                            mobile: supplierRecord.mobile || supplierRecord.phoneNumber
                        },
                        totals: purchaseOrder.totals,
                        payment: {
                            ...purchaseOrder.payment,
                            dueDate: purchaseOrder.payment.dueDate,
                            creditDays: purchaseOrder.payment.creditDays,
                            isOverdue: purchaseOrder.isOverdue
                        },
                        gstType: purchaseOrder.gstType,
                        gstEnabled: purchaseOrder.gstEnabled,
                        taxMode: purchaseOrder.taxMode,
                        priceIncludesTax: purchaseOrder.priceIncludesTax,
                        status: purchaseOrder.status,
                        priority: purchaseOrder.priority
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to create purchase order',
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },

    generateOrderNumber: async (req, res) => {
        try {
            const { companyId, orderType = 'purchase_order' } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!['purchase_order', 'purchase_quotation', 'proforma_purchase'].includes(orderType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order type'
                });
            }

            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            let prefix;
            switch (orderType) {
                case 'purchase_quotation':
                    prefix = 'PQU';
                    break;
                case 'proforma_purchase':
                    prefix = 'PPO';
                    break;
                case 'purchase_order':
                    prefix = 'PO';
                    break;
                default:
                    prefix = 'PO';
            }

            const todayStart = new Date(year, date.getMonth(), date.getDate());
            const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

            const lastOrder = await PurchaseOrder.findOne({
                companyId,
                orderDate: { $gte: todayStart, $lt: todayEnd },
                orderNumber: new RegExp(`^${prefix}-${year}${month}${day}`)
            }).sort({ orderNumber: -1 });

            let sequence = 1;
            if (lastOrder && lastOrder.orderNumber) {
                const lastSequence = parseInt(lastOrder.orderNumber.split('-').pop());
                if (!isNaN(lastSequence)) {
                    sequence = lastSequence + 1;
                }
            }

            const nextOrderNumber = `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;

            res.json({
                success: true,
                data: {
                    nextOrderNumber,
                    orderType,
                    prefix,
                    date: `${year}-${month}-${day}`,
                    sequence
                },
                message: 'Next order number generated successfully'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate order number',
                error: error.message
            });
        }
    },

    getAllPurchaseOrders: async (req, res) => {
        try {
            const { companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const {
                page = 1,
                limit = 10,
                orderType,
                status,
                priority,
                search,
                dateFrom,
                dateTo,
                supplierId,
                convertedToPurchaseInvoice
            } = req.query;

            // Build filter
            const filter = { companyId };

            if (orderType) {
                if (orderType.includes(',')) {
                    filter.orderType = { $in: orderType.split(',') };
                } else {
                    filter.orderType = orderType;
                }
            }

            if (status) {
                if (status.includes(',')) {
                    filter.status = { $in: status.split(',') };
                } else {
                    filter.status = status;
                }
            }

            if (priority) {
                filter.priority = priority;
            }

            if (supplierId) {
                filter.supplier = supplierId;
            }

            if (convertedToPurchaseInvoice !== undefined) {
                filter.convertedToPurchaseInvoice = convertedToPurchaseInvoice === 'true';
            }

            if (dateFrom || dateTo) {
                filter.orderDate = {};
                if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
                if (dateTo) filter.orderDate.$lte = new Date(dateTo);
            }

            if (search) {
                filter.$or = [
                    { orderNumber: { $regex: search, $options: 'i' } },
                    { 'items.itemName': { $regex: search, $options: 'i' } },
                    { notes: { $regex: search, $options: 'i' } }
                ];
            }

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Execute query
            const [orders, total] = await Promise.all([
                PurchaseOrder.find(filter)
                    .populate('supplier', 'name mobile phoneNumber email address')
                    .sort({ orderDate: -1, orderNumber: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                PurchaseOrder.countDocuments(filter)
            ]);

            res.json({
                success: true,
                data: {
                    orders,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / parseInt(limit)),
                        totalOrders: total,
                        limit: parseInt(limit)
                    },
                    filter: {
                        companyId,
                        orderType,
                        status,
                        priority,
                        search,
                        dateFrom,
                        dateTo,
                        supplierId
                    }
                },
                message: `Retrieved ${orders.length} purchase orders`
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve purchase orders',
                error: error.message
            });
        }
    },

    getPurchaseOrderById: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase order ID'
                });
            }

            const order = await PurchaseOrder.findById(id)
                .populate('supplier', 'name mobile phoneNumber email address type')
                .populate('items.itemRef', 'name code category');

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase order not found'
                });
            }

            // Ensure full frontend compatibility
            const compatibleOrder = {
                ...order.toObject(),
                // GST type compatibility
                gstType: order.gstType || (order.gstEnabled ? 'gst' : 'non-gst'),
                gstEnabled: order.gstEnabled ?? (order.gstType === 'gst'),
                // Tax mode compatibility
                taxMode: order.taxMode || (order.priceIncludesTax ? 'with-tax' : 'without-tax'),
                priceIncludesTax: order.priceIncludesTax ?? (order.taxMode === 'with-tax'),
                items: order.items.map(item => ({
                    ...item,
                    // Frontend field mapping
                    selectedProduct: item.selectedProduct || item.itemRef || '',
                    productName: item.productName || item.itemName,
                    productCode: item.productCode || item.itemCode,
                    price: item.price || item.pricePerUnit,
                    gstRate: item.gstRate || item.taxRate,
                    gstMode: item.gstMode || (item.priceIncludesTax ? 'include' : 'exclude'),
                    totalAmount: item.totalAmount || item.itemAmount || item.amount,
                    gstAmount: item.gstAmount || item.totalTaxAmount,
                    subtotal: item.subtotal || (item.taxableAmount || item.amount),
                    hsnNumber: item.hsnNumber || item.hsnCode,
                    // Backend compatibility
                    taxMode: item.taxMode || order.taxMode || 'without-tax',
                    priceIncludesTax: item.priceIncludesTax ?? (item.taxMode === 'with-tax'),
                    cgstAmount: item.cgstAmount || item.cgst || 0,
                    sgstAmount: item.sgstAmount || item.sgst || 0,
                    igstAmount: item.igstAmount || item.igst || 0,
                    amount: item.amount || item.itemAmount || 0
                }))
            };

            res.json({
                success: true,
                data: { order: compatibleOrder },
                message: 'Purchase order retrieved successfully'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve purchase order',
                error: error.message
            });
        }
    },

    addPayment: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                amount,
                method = 'bank_transfer',
                reference = '',
                paymentDate,
                dueDate,
                creditDays,
                notes = '',
                isAdvancePayment = false,
                paymentDetails = {}
            } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase order ID'
                });
            }

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid payment amount is required'
                });
            }

            const purchaseOrder = await PurchaseOrder.findById(id);
            if (!purchaseOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase order not found'
                });
            }

            const currentBalance = purchaseOrder.balanceAmount || purchaseOrder.payment.pendingAmount;
            if (amount > currentBalance) {
                return res.status(400).json({
                    success: false,
                    message: `Payment amount cannot exceed balance amount of ₹${currentBalance.toFixed(2)}`
                });
            }

            // Create payment record using Payment model
            const paymentRecord = new Payment({
                party: purchaseOrder.supplier,
                partyType: 'supplier',
                amount: parseFloat(amount),
                paymentMethod: method,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                type: 'payment_out',
                reference,
                notes: notes || `Payment for ${purchaseOrder.orderType} ${purchaseOrder.orderNumber}`,
                internalNotes: `Purchase Order: ${purchaseOrder.orderNumber} (${purchaseOrder.orderType})`,
                paymentDetails,
                company: purchaseOrder.companyId,
                createdBy: req.user?.id || 'system',
                status: 'completed',
                linkedDocuments: [{
                    documentType: 'purchase_order',
                    documentId: purchaseOrder._id,
                    documentModel: 'PurchaseOrder',
                    documentNumber: purchaseOrder.orderNumber,
                    documentDate: purchaseOrder.orderDate,
                    documentTotal: purchaseOrder.totals.finalTotal,
                    allocatedAmount: parseFloat(amount),
                    remainingAmount: Math.max(0, currentBalance - parseFloat(amount)),
                    allocationDate: new Date(),
                    isFullyPaid: (currentBalance - parseFloat(amount)) <= 0
                }]
            });

            await paymentRecord.save();

            // Add payment using purchase order model method (if available)
            if (typeof purchaseOrder.addPayment === 'function') {
                await purchaseOrder.addPayment(amount, method, reference, notes);
            } else {
                // Manual payment addition
                purchaseOrder.payment.paidAmount += parseFloat(amount);
                purchaseOrder.payment.pendingAmount = Math.max(0, purchaseOrder.payment.pendingAmount - parseFloat(amount));

                if (purchaseOrder.payment.pendingAmount <= 0) {
                    purchaseOrder.payment.status = 'paid';
                } else if (purchaseOrder.payment.paidAmount > 0) {
                    purchaseOrder.payment.status = 'partial';
                }

                purchaseOrder.paymentHistory.push({
                    amount: parseFloat(amount),
                    method,
                    reference,
                    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                    notes,
                    createdAt: new Date(),
                    createdBy: req.user?.id || 'system'
                });

                await purchaseOrder.save();
            }

            if (isAdvancePayment) {
                purchaseOrder.payment.advanceAmount = (purchaseOrder.payment.advanceAmount || 0) + parseFloat(amount);
                await purchaseOrder.save();
            }

            res.status(200).json({
                success: true,
                message: 'Payment added successfully',
                data: {
                    orderNumber: purchaseOrder.orderNumber,
                    paymentNumber: paymentRecord.paymentNumber,
                    paymentId: paymentRecord._id,
                    totalAmount: purchaseOrder.totals.finalTotal,
                    paidAmount: purchaseOrder.payment.paidAmount,
                    advanceAmount: purchaseOrder.payment.advanceAmount,
                    pendingAmount: purchaseOrder.payment.pendingAmount,
                    paymentStatus: purchaseOrder.payment.status,
                    paymentMethod: purchaseOrder.payment.method,
                    paymentDate: purchaseOrder.payment.paymentDate,
                    dueDate: purchaseOrder.payment.dueDate,
                    creditDays: purchaseOrder.payment.creditDays,
                    isOverdue: purchaseOrder.isOverdue,
                    paymentHistory: purchaseOrder.paymentHistory,
                    balanceAmount: purchaseOrder.balanceAmount || purchaseOrder.payment.pendingAmount,
                    paymentRecord: {
                        id: paymentRecord._id,
                        paymentNumber: paymentRecord.paymentNumber,
                        amount: paymentRecord.amount,
                        method: paymentRecord.paymentMethod,
                        date: paymentRecord.paymentDate,
                        status: paymentRecord.status
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to add payment',
                error: error.message
            });
        }
    },

    convertToPurchaseInvoice: async (req, res) => {
        try {
            const { id } = req.params;
            const { invoiceDate, transferAdvancePayment = true, convertedBy } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase order ID'
                });
            }

            const purchaseOrder = await PurchaseOrder.findById(id);
            if (!purchaseOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase order not found'
                });
            }

            if (purchaseOrder.convertedToPurchaseInvoice) {
                return res.status(400).json({
                    success: false,
                    message: 'Purchase order already converted to invoice',
                    data: {
                        invoiceNumber: purchaseOrder.purchaseInvoiceNumber,
                        invoiceRef: purchaseOrder.purchaseInvoiceRef,
                        convertedAt: purchaseOrder.convertedAt
                    }
                });
            }

            if (purchaseOrder.status === 'cancelled') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot convert cancelled orders'
                });
            }

            // Set convertedBy if provided
            if (convertedBy) {
                purchaseOrder.convertedBy = convertedBy;
            }

            // Convert using the model method
            let purchaseInvoice;
            if (typeof purchaseOrder.convertToPurchaseInvoice === 'function') {
                purchaseInvoice = await purchaseOrder.convertToPurchaseInvoice();
            } else {
                // Manual conversion logic
                purchaseOrder.convertedToPurchaseInvoice = true;
                purchaseOrder.convertedAt = new Date();
                purchaseOrder.status = 'converted';
                await purchaseOrder.save();

                purchaseInvoice = {
                    _id: 'manual_conversion_' + Date.now(),
                    invoiceNumber: 'PI-' + purchaseOrder.orderNumber,
                    invoiceDate: invoiceDate || new Date(),
                    totals: purchaseOrder.totals,
                    status: 'draft'
                };
            }

            // Update invoice date if provided
            if (invoiceDate && purchaseInvoice.invoiceDate) {
                purchaseInvoice.invoiceDate = new Date(invoiceDate);
                if (typeof purchaseInvoice.save === 'function') {
                    await purchaseInvoice.save();
                }
            }

            // Transfer advance payments to invoice
            if (transferAdvancePayment && purchaseOrder.payment.advanceAmount > 0) {
                try {
                    const advancePayments = await Payment.find({
                        party: purchaseOrder.supplier,
                        company: purchaseOrder.companyId,
                        'linkedDocuments.documentId': purchaseOrder._id,
                        status: 'completed'
                    });

                    for (const payment of advancePayments) {
                        const originalNotes = payment.notes || '';
                        payment.notes = `${originalNotes} - Transferred to Invoice ${purchaseInvoice.invoiceNumber}`;
                        payment.internalNotes = `${payment.internalNotes || ''} | Transferred from PO ${purchaseOrder.orderNumber} to INV ${purchaseInvoice.invoiceNumber}`;

                        payment.linkedDocuments.push({
                            documentType: 'purchase',
                            documentId: purchaseInvoice._id,
                            documentModel: 'Purchase',
                            documentNumber: purchaseInvoice.invoiceNumber,
                            documentDate: purchaseInvoice.invoiceDate,
                            documentTotal: purchaseInvoice.totals.finalTotal,
                            allocatedAmount: payment.amount,
                            remainingAmount: Math.max(0, purchaseInvoice.totals.finalTotal - payment.amount),
                            allocationDate: new Date(),
                            isFullyPaid: purchaseInvoice.totals.finalTotal <= payment.amount
                        });

                        await payment.save();
                    }
                } catch (paymentTransferError) {
                    // Don't fail the conversion, just log the warning
                }
            }

            // Populate data for response
            await purchaseOrder.populate('supplier', 'name mobile phoneNumber email');

            res.status(200).json({
                success: true,
                message: 'Purchase order converted to invoice successfully',
                data: {
                    purchaseOrder: {
                        id: purchaseOrder._id,
                        orderNumber: purchaseOrder.orderNumber,
                        orderType: purchaseOrder.orderType,
                        status: purchaseOrder.status,
                        convertedToPurchaseInvoice: purchaseOrder.convertedToPurchaseInvoice,
                        purchaseInvoiceNumber: purchaseOrder.purchaseInvoiceNumber,
                        convertedAt: purchaseOrder.convertedAt,
                        convertedBy: purchaseOrder.convertedBy
                    },
                    purchaseInvoice: {
                        id: purchaseInvoice._id,
                        invoiceNumber: purchaseInvoice.invoiceNumber,
                        invoiceDate: purchaseInvoice.invoiceDate,
                        totalAmount: purchaseInvoice.totals.finalTotal,
                        status: purchaseInvoice.status
                    },
                    conversion: {
                        orderNumber: purchaseOrder.orderNumber,
                        invoiceNumber: purchaseInvoice.invoiceNumber,
                        convertedAt: purchaseOrder.convertedAt,
                        convertedBy: purchaseOrder.convertedBy,
                        advanceTransferred: transferAdvancePayment ? purchaseOrder.payment.advanceAmount : 0,
                        transferredAmount: transferAdvancePayment ? purchaseOrder.payment.advanceAmount : 0
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to convert purchase order to invoice',
                error: error.message
            });
        }
    },

    updateStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, approvedBy, reason = '' } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase order ID'
                });
            }

            const validStatuses = ['draft', 'sent', 'confirmed', 'received', 'partially_received', 'cancelled', 'completed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status value'
                });
            }

            const purchaseOrder = await PurchaseOrder.findById(id);
            if (!purchaseOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase order not found'
                });
            }

            const previousStatus = purchaseOrder.status;

            // Handle approval workflow
            if (status === 'confirmed' && approvedBy) {
                if (typeof purchaseOrder.approve === 'function') {
                    await purchaseOrder.approve(approvedBy);
                } else {
                    purchaseOrder.status = 'confirmed';
                    purchaseOrder.approvedBy = approvedBy;
                    purchaseOrder.approvedAt = new Date();
                }
            } else if (status === 'received') {
                if (typeof purchaseOrder.markAsReceived === 'function') {
                    await purchaseOrder.markAsReceived();
                } else {
                    purchaseOrder.status = 'received';
                    purchaseOrder.deliveryDate = new Date();
                }
            } else if (status === 'partially_received') {
                if (typeof purchaseOrder.markAsPartiallyReceived === 'function') {
                    await purchaseOrder.markAsPartiallyReceived();
                } else {
                    purchaseOrder.status = 'partially_received';
                }
            } else {
                purchaseOrder.status = status;
            }

            // Add reason to notes if provided
            if (reason) {
                const statusNote = `Status changed from ${previousStatus} to ${status}. Reason: ${reason}`;
                purchaseOrder.notes = purchaseOrder.notes ? `${purchaseOrder.notes}\n${statusNote}` : statusNote;
            }

            purchaseOrder.lastModifiedBy = req.user?.id || 'system';
            await purchaseOrder.save();

            res.status(200).json({
                success: true,
                message: 'Purchase order status updated successfully',
                data: {
                    id: purchaseOrder._id,
                    orderNumber: purchaseOrder.orderNumber,
                    previousStatus,
                    currentStatus: purchaseOrder.status,
                    approvedBy: purchaseOrder.approvedBy,
                    approvedAt: purchaseOrder.approvedAt,
                    reason,
                    updatedAt: purchaseOrder.updatedAt
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to update purchase order status',
                error: error.message
            });
        }
    },

    updatePurchaseOrder: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase order ID'
                });
            }

            const purchaseOrder = await PurchaseOrder.findById(id);
            if (!purchaseOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase order not found'
                });
            }

            if (purchaseOrder.convertedToPurchaseInvoice) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update purchase order that has been converted to invoice'
                });
            }

            if (purchaseOrder.status === 'cancelled') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update cancelled purchase orders'
                });
            }

            updateData.lastModifiedBy = req.user?.id || 'system';

            const updatedPurchaseOrder = await PurchaseOrder.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('supplier', 'name mobile phoneNumber email address');

            res.status(200).json({
                success: true,
                message: 'Purchase order updated successfully',
                data: updatedPurchaseOrder
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to update purchase order',
                error: error.message
            });
        }
    },

    // Delete purchase order (cancel)
    deletePurchaseOrder: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purchase order ID'
                });
            }

            const purchaseOrder = await PurchaseOrder.findById(id);
            if (!purchaseOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase order not found'
                });
            }

            if (purchaseOrder.convertedToPurchaseInvoice) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete purchase order that has been converted to invoice'
                });
            }

            purchaseOrder.status = 'cancelled';
            purchaseOrder.lastModifiedBy = req.user?.id || 'system';
            await purchaseOrder.save();

            res.status(200).json({
                success: true,
                message: 'Purchase order cancelled successfully'
            });

        } catch (error) {
            console.error('❌ Error deleting purchase order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete purchase order',
                error: error.message
            });
        }
    },

    // Get pending orders for payment
    getPendingOrdersForPayment: async (req, res) => {
        try {
            const { companyId, supplierId } = req.query;

            const filter = {
                companyId,
                status: { $nin: ['cancelled', 'draft'] },
                'payment.pendingAmount': { $gt: 0 }
            };

            if (supplierId) {
                filter.supplier = supplierId;
            }

            const pendingOrders = await PurchaseOrder.find(filter)
                .populate('supplier', 'name mobile phoneNumber email')
                .select('orderNumber orderDate supplier totals payment')
                .sort({ orderDate: -1 });

            res.status(200).json({
                success: true,
                data: pendingOrders
            });

        } catch (error) {
            console.error('❌ Error getting pending orders:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get pending orders for payment',
                error: error.message
            });
        }
    },

    // Get supplier pending documents
    getSupplierPendingDocuments: async (req, res) => {
        try {
            const { companyId, supplierId } = req.query;

            if (!supplierId) {
                return res.status(400).json({
                    success: false,
                    message: 'Supplier ID is required'
                });
            }

            const pendingOrders = await PurchaseOrder.find({
                companyId,
                supplier: supplierId,
                status: { $nin: ['cancelled', 'completed'] },
                'payment.pendingAmount': { $gt: 0 }
            })
                .select('orderNumber orderDate orderType totals payment status')
                .sort({ orderDate: -1 });

            const summary = {
                totalPendingAmount: pendingOrders.reduce((sum, order) => sum + (order.payment?.pendingAmount || 0), 0),
                totalOrders: pendingOrders.length,
                overdueOrders: pendingOrders.filter(order => {
                    const dueDate = order.payment?.dueDate;
                    return dueDate && new Date() > dueDate;
                }).length
            };

            res.status(200).json({
                success: true,
                data: {
                    orders: pendingOrders,
                    summary
                }
            });

        } catch (error) {
            console.error('❌ Error getting supplier pending documents:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get supplier pending documents',
                error: error.message
            });
        }
    },

    // Get expired orders
    getExpiredOrders: async (req, res) => {
        try {
            const { companyId } = req.query;

            const expiredOrders = await PurchaseOrder.find({
                companyId,
                validUntil: { $lt: new Date() },
                status: { $nin: ['completed', 'cancelled', 'converted'] }
            })
                .populate('supplier', 'name mobile phoneNumber')
                .sort({ validUntil: 1 });

            res.status(200).json({
                success: true,
                data: expiredOrders,
                message: `Found ${expiredOrders.length} expired orders`
            });

        } catch (error) {
            console.error('❌ Error getting expired orders:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get expired orders',
                error: error.message
            });
        }
    },

    // Get orders awaiting approval
    getOrdersAwaitingApproval: async (req, res) => {
        try {
            const { companyId } = req.query;

            const awaitingApproval = await PurchaseOrder.find({
                companyId,
                status: 'draft',
                approvedBy: { $exists: false }
            })
                .populate('supplier', 'name mobile phoneNumber')
                .sort({ orderDate: -1 });

            res.status(200).json({
                success: true,
                data: awaitingApproval,
                message: `Found ${awaitingApproval.length} orders awaiting approval`
            });

        } catch (error) {
            console.error('❌ Error getting orders awaiting approval:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get orders awaiting approval',
                error: error.message
            });
        }
    },

    // Get orders required by date
    getOrdersRequiredByDate: async (req, res) => {
        try {
            const { companyId, date } = req.query;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Date is required'
                });
            }

            const requiredOrders = await PurchaseOrder.find({
                companyId,
                requiredBy: { $lte: new Date(date) },
                status: { $nin: ['completed', 'cancelled', 'received'] }
            })
                .populate('supplier', 'name mobile phoneNumber')
                .sort({ requiredBy: 1 });

            res.status(200).json({
                success: true,
                data: requiredOrders,
                message: `Found ${requiredOrders.length} orders required by ${date}`
            });

        } catch (error) {
            console.error('❌ Error getting orders required by date:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get orders required by date',
                error: error.message
            });
        }
    },

    // Get dashboard summary
    getDashboardSummary: async (req, res) => {
        try {
            const { companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const [
                totalOrders,
                pendingOrders,
                confirmedOrders,
                completedOrders,
                totalValue,
                pendingPayments,
                overdueOrders,
                expiredOrders,
                awaitingApproval
            ] = await Promise.all([
                PurchaseOrder.countDocuments({ companyId, status: { $ne: 'cancelled' } }),
                PurchaseOrder.countDocuments({ companyId, status: { $in: ['draft', 'sent'] } }),
                PurchaseOrder.countDocuments({ companyId, status: 'confirmed' }),
                PurchaseOrder.countDocuments({ companyId, status: 'completed' }),
                PurchaseOrder.aggregate([
                    { $match: { companyId: new mongoose.Types.ObjectId(companyId), status: { $ne: 'cancelled' } } },
                    { $group: { _id: null, total: { $sum: '$totals.finalTotal' } } }
                ]),
                PurchaseOrder.aggregate([
                    { $match: { companyId: new mongoose.Types.ObjectId(companyId), 'payment.pendingAmount': { $gt: 0 } } },
                    { $group: { _id: null, total: { $sum: '$payment.pendingAmount' } } }
                ]),
                PurchaseOrder.countDocuments({
                    companyId,
                    'payment.dueDate': { $lt: new Date() },
                    'payment.pendingAmount': { $gt: 0 }
                }),
                PurchaseOrder.countDocuments({
                    companyId,
                    validUntil: { $lt: new Date() },
                    status: { $nin: ['completed', 'cancelled'] }
                }),
                PurchaseOrder.countDocuments({
                    companyId,
                    status: 'draft',
                    approvedBy: null
                })
            ]);

            res.status(200).json({
                success: true,
                data: {
                    totalOrders,
                    pendingOrders,
                    confirmedOrders,
                    completedOrders,
                    totalValue: totalValue[0]?.total || 0,
                    pendingPayments: pendingPayments[0]?.total || 0,
                    overdueOrders,
                    expiredOrders,
                    awaitingApproval
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard summary',
                error: error.message
            });
        }
    }
};

module.exports = purchaseOrderController;