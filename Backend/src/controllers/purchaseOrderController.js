const PurchaseOrder = require('../models/PurchaseOrder');
const Item = require('../models/Item');
const Party = require('../models/Party');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

// Helper function to find or create supplier - ENHANCED VERSION
const findOrCreateSupplier = async (supplierName, supplierMobile, supplierId, companyId, userId) => {
    try {
        let supplierRecord;

        console.log('🔍 Finding or creating supplier:', {
            supplierName,
            supplierMobile,
            supplierId,
            companyId
        });

        // If supplier ID is provided and valid, try to find by ID
        if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
            supplierRecord = await Party.findById(supplierId);
            if (!supplierRecord) {
                throw new Error('Supplier not found with provided ID');
            }
            console.log('✅ Found supplier by ID:', supplierRecord.name);
            return supplierRecord;
        }

        // Search by mobile number first (check both mobile and phoneNumber fields)
        if (supplierMobile) {
            supplierRecord = await Party.findOne({
                $or: [
                    { mobile: supplierMobile },
                    { phoneNumber: supplierMobile }
                ],
                type: 'supplier',
                companyId
            });

            if (supplierRecord) {
                console.log('✅ Found existing supplier by mobile:', {
                    name: supplierRecord.name,
                    mobile: supplierRecord.mobile || supplierRecord.phoneNumber
                });
                return supplierRecord;
            }
        }

        // Search by name if mobile search didn't work
        if (supplierName && !supplierRecord) {
            supplierRecord = await Party.findOne({
                name: { $regex: new RegExp(`^${supplierName.trim()}$`, 'i') },
                type: 'supplier',
                companyId
            });

            if (supplierRecord) {
                console.log('✅ Found existing supplier by name:', {
                    name: supplierRecord.name,
                    mobile: supplierRecord.mobile || supplierRecord.phoneNumber
                });
                return supplierRecord;
            }
        }

        // If no existing supplier found, create new one
        if (!supplierRecord) {
            if (!supplierName) {
                throw new Error('Supplier name is required to create new supplier');
            }

            console.log('🆕 Creating new supplier:', {
                name: supplierName,
                mobile: supplierMobile
            });

            const newSupplierData = {
                name: supplierName.trim(),
                type: 'supplier',
                companyId: companyId,
                createdBy: userId || companyId,
                lastModifiedBy: userId || companyId,
                createdAt: new Date(),
                updatedAt: new Date(),
                email: '',
                address: {
                    street: '',
                    city: '',
                    state: '',
                    pincode: '',
                    country: 'India'
                },
                gstNumber: '',
                panNumber: '',
                status: 'active',
                creditLimit: 0,
                creditDays: 0
            };

            // ✅ FIXED: Only add mobile/phoneNumber if provided to avoid duplicate key error
            if (supplierMobile && supplierMobile.trim()) {
                // Check which field the Party model uses for mobile
                const existingParty = await Party.findOne({ companyId }).select('mobile phoneNumber');

                if (existingParty && existingParty.mobile !== undefined) {
                    // Model uses 'mobile' field
                    newSupplierData.mobile = supplierMobile.trim();
                } else {
                    // Model uses 'phoneNumber' field
                    newSupplierData.phoneNumber = supplierMobile.trim();
                }
            }

            try {
                supplierRecord = new Party(newSupplierData);
                await supplierRecord.save();

                console.log('✅ New supplier created:', {
                    id: supplierRecord._id,
                    name: supplierRecord.name,
                    mobile: supplierRecord.mobile || supplierRecord.phoneNumber
                });
            } catch (saveError) {
                console.error('❌ Error saving new supplier:', saveError);

                // If it's a duplicate key error, try to find the existing record
                if (saveError.code === 11000) {
                    console.log('🔄 Duplicate key error, searching for existing supplier...');

                    // Try to find by mobile again (maybe it was just created)
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
                        console.log('✅ Found existing supplier after duplicate error:', {
                            name: supplierRecord.name,
                            mobile: supplierRecord.mobile || supplierRecord.phoneNumber
                        });
                        return supplierRecord;
                    }
                }

                throw new Error(`Failed to create supplier: ${saveError.message}`);
            }
        }

        if (!supplierRecord) {
            throw new Error('Unable to find or create supplier');
        }

        return supplierRecord;

    } catch (error) {
        console.error('❌ Error in findOrCreateSupplier:', error);
        throw new Error(`Failed to find or create supplier: ${error.message}`);
    }
};

// Add this helper function to check Party model schema
const checkPartySchema = async () => {
    try {
        const sampleParty = await Party.findOne().select('mobile phoneNumber').lean();
        console.log('📋 Party model schema check:', {
            hasMobile: sampleParty?.mobile !== undefined,
            hasPhoneNumber: sampleParty?.phoneNumber !== undefined,
            sample: sampleParty
        });
    } catch (error) {
        console.log('📋 Party schema check failed:', error.message);
    }
};

const purchaseOrderController = {

    // Create a new purchase order/quotation - ENHANCED WITH ORDER NUMBER VALIDATION
    createPurchaseOrder: async (req, res) => {
        try {
            // Check Party schema at the beginning (only in development)
            if (process.env.NODE_ENV === 'development') {
                await checkPartySchema();
            }

            const {
                supplierName,           // Supplier name (will find or create)
                supplierMobile,         // Supplier mobile
                supplier,               // Supplier ID (if provided directly)
                orderNumber,            // Order number (optional - auto-generated)
                orderDate,             // Order date
                orderType = 'purchase_order', // purchase_order, purchase_quotation, proforma_purchase
                validUntil,            // Valid until date
                expectedDeliveryDate,  // Expected delivery date
                requiredBy,            // Required by date
                gstEnabled = true,     // GST enabled flag
                companyId,             // Company ID
                items,                 // Items array
                payment,               // Payment details
                notes,                 // Notes
                termsAndConditions,    // Terms and conditions
                supplierNotes,         // Supplier specific notes
                internalNotes,         // Internal notes
                roundOff = 0,          // Round off amount
                roundOffEnabled = false, // Round off enabled flag
                status = 'draft',      // Order status
                priority = 'normal',   // Priority level
                departmentRef,         // Department reference
                shippingAddress,       // Shipping address
                // Tax mode fields
                taxMode = 'without-tax',         // Tax mode (with-tax/without-tax)
                priceIncludesTax = false        // Whether the price includes tax
            } = req.body;

            console.log('📥 Creating purchase order with data:', {
                orderType,
                supplierName,
                supplierMobile,
                companyId,
                itemCount: items?.length || 0
            });

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

            // ✅ CHECK IF ORDER NUMBER ALREADY EXISTS (if provided)
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

                console.log('✅ Generated purchase order number:', {
                    orderType,
                    prefix,
                    date: `${year}${month}${day}`,
                    sequence,
                    finalOrderNumber
                });

                // ✅ DOUBLE-CHECK GENERATED NUMBER DOESN'T EXIST
                const duplicateCheck = await PurchaseOrder.findOne({
                    orderNumber: finalOrderNumber,
                    companyId: companyId
                });

                if (duplicateCheck) {
                    // If duplicate found, increment sequence and try again
                    sequence += 1;
                    finalOrderNumber = `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;

                    console.log('⚠️ Duplicate order number found, using:', finalOrderNumber);
                }
            }

            // Sync tax mode fields
            const finalTaxMode = taxMode || (priceIncludesTax ? 'with-tax' : 'without-tax');
            const finalPriceIncludesTax = finalTaxMode === 'with-tax';

            console.log('🔄 Tax mode synchronization:', {
                originalTaxMode: taxMode,
                originalPriceIncludesTax: priceIncludesTax,
                finalTaxMode,
                finalPriceIncludesTax
            });

            // ✅ FIND OR CREATE SUPPLIER USING ENHANCED FUNCTION
            console.log('🔄 Starting supplier lookup/creation...');
            const supplierRecord = await findOrCreateSupplier(
                supplierName,
                supplierMobile,
                supplier,
                companyId,
                req.user?.id || companyId
            );

            console.log('🏭 Using supplier for order:', {
                supplierId: supplierRecord._id,
                supplierName: supplierRecord.name,
                supplierMobile: supplierRecord.mobile || supplierRecord.phoneNumber
            });

            // Process items with proper tax mode handling
            const processedItems = [];
            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;
            let totalTaxableAmount = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                console.log(`🔄 Processing item ${i + 1}:`, {
                    itemName: item.itemName,
                    itemTaxMode: item.taxMode,
                    itemPriceIncludesTax: item.priceIncludesTax,
                    globalTaxMode: finalTaxMode,
                    globalPriceIncludesTax: finalPriceIncludesTax
                });

                // Basic validation
                if (!item.itemName || !item.quantity || !item.pricePerUnit) {
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
                const taxRate = parseFloat(item.taxRate || 18);

                // Validate numeric values
                if (isNaN(quantity) || isNaN(pricePerUnit) || quantity <= 0 || pricePerUnit < 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Item ${i + 1}: Invalid quantity or price values`
                    });
                }

                // Determine item-level tax mode
                const itemTaxMode = item.taxMode || finalTaxMode;
                const itemPriceIncludesTax = itemTaxMode === 'with-tax';

                console.log(`📋 Item ${i + 1} tax mode determined:`, {
                    itemTaxMode,
                    itemPriceIncludesTax,
                    taxRate
                });

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
                            const itemTaxRate = parseFloat(itemDetails.taxRate || taxRate || 0);
                            if (itemTaxRate > 0) {
                                itemCgstRate = itemTaxRate / 2;
                                itemSgstRate = itemTaxRate / 2;
                                itemIgstRate = 0;
                            }
                        }
                    }
                } else if (taxRate > 0) {
                    itemCgstRate = taxRate / 2;
                    itemSgstRate = taxRate / 2;
                    itemIgstRate = 0;
                }

                // Calculate base amount
                const baseAmount = quantity * pricePerUnit;

                // Calculate discount
                let itemDiscountAmount = discountAmount;
                if (discountAmount === 0 && discountPercent > 0) {
                    itemDiscountAmount = (baseAmount * discountPercent) / 100;
                }

                const amountAfterDiscount = baseAmount - itemDiscountAmount;

                // Calculate taxes based on item tax mode
                let cgst = 0;
                let sgst = 0;
                let igst = 0;
                let itemAmount = 0;
                let itemTaxableAmount = 0;

                if (gstEnabled && (itemCgstRate > 0 || itemSgstRate > 0 || itemIgstRate > 0)) {
                    const totalTaxRate = itemCgstRate + itemSgstRate + itemIgstRate;

                    if (itemPriceIncludesTax) {
                        // WITH TAX MODE - Extract tax from amount
                        console.log(`🟢 Item ${i + 1}: WITH TAX calculation`);

                        const taxMultiplier = 1 + (totalTaxRate / 100);
                        itemTaxableAmount = amountAfterDiscount / taxMultiplier;

                        cgst = (itemTaxableAmount * itemCgstRate) / 100;
                        sgst = (itemTaxableAmount * itemSgstRate) / 100;
                        igst = (itemTaxableAmount * itemIgstRate) / 100;

                        itemAmount = amountAfterDiscount; // Amount stays same (tax included)

                        console.log(`✅ Item ${i + 1} WITH TAX result:`, {
                            amountAfterDiscount,
                            itemTaxableAmount,
                            cgst, sgst, igst,
                            itemAmount
                        });
                    } else {
                        // WITHOUT TAX MODE - Add tax to amount
                        console.log(`🔵 Item ${i + 1}: WITHOUT TAX calculation`);

                        itemTaxableAmount = amountAfterDiscount;
                        cgst = (itemTaxableAmount * itemCgstRate) / 100;
                        sgst = (itemTaxableAmount * itemSgstRate) / 100;
                        igst = (itemTaxableAmount * itemIgstRate) / 100;

                        itemAmount = itemTaxableAmount + cgst + sgst + igst; // Add tax

                        console.log(`✅ Item ${i + 1} WITHOUT TAX result:`, {
                            itemTaxableAmount,
                            cgst, sgst, igst,
                            itemAmount
                        });
                    }
                } else {
                    // No GST
                    itemTaxableAmount = amountAfterDiscount;
                    itemAmount = amountAfterDiscount;
                    console.log(`❌ Item ${i + 1}: No GST`);
                }

                // Update totals
                subtotal += baseAmount;
                totalDiscount += itemDiscountAmount;
                totalTaxableAmount += itemTaxableAmount;
                const itemTotalTax = cgst + sgst + igst;
                totalTax += itemTotalTax;

                // Create processed item
                const processedItem = {
                    itemRef: item.itemRef || null,
                    itemName: item.itemName.trim(),
                    itemCode: item.itemCode || '',
                    hsnCode: item.hsnCode || '0000',
                    category: item.category || '',
                    quantity,
                    unit: item.unit || 'PCS',
                    pricePerUnit,
                    taxRate: itemCgstRate + itemSgstRate + itemIgstRate,

                    // Include both tax mode fields for compatibility
                    taxMode: itemTaxMode,
                    priceIncludesTax: itemPriceIncludesTax,

                    discountPercent,
                    discountAmount: parseFloat(itemDiscountAmount.toFixed(2)),

                    // Tax amounts
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    igst: parseFloat(igst.toFixed(2)),
                    cgstAmount: parseFloat(cgst.toFixed(2)),
                    sgstAmount: parseFloat(sgst.toFixed(2)),
                    igstAmount: parseFloat(igst.toFixed(2)),

                    // Calculated amounts
                    taxableAmount: parseFloat(itemTaxableAmount.toFixed(2)),
                    totalTaxAmount: parseFloat(itemTotalTax.toFixed(2)),

                    // Final amounts
                    amount: parseFloat(itemAmount.toFixed(2)),
                    itemAmount: parseFloat(itemAmount.toFixed(2)),

                    lineNumber: i + 1
                };

                processedItems.push(processedItem);

                console.log(`✅ Item ${i + 1} processed:`, {
                    itemName: processedItem.itemName,
                    taxMode: processedItem.taxMode,
                    priceIncludesTax: processedItem.priceIncludesTax,
                    taxableAmount: processedItem.taxableAmount,
                    totalTax: processedItem.totalTaxAmount,
                    finalAmount: processedItem.amount
                });
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

            console.log('💰 Final totals calculated:', totals);

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
                // Default validity: 30 days for quotations
                orderValidUntil = new Date();
                orderValidUntil.setDate(orderValidUntil.getDate() + 30);
            }

            // Create purchase order object
            const purchaseOrderData = {
                orderDate: orderDate ? new Date(orderDate) : new Date(),
                orderType,
                validUntil: orderValidUntil,
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                requiredBy: requiredBy ? new Date(requiredBy) : null,
                supplier: supplierRecord._id,
                orderNumber: finalOrderNumber,
                supplierMobile: supplierMobile || supplierRecord.mobile || supplierRecord.phoneNumber,
                gstEnabled,
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

            console.log('💾 Creating purchase order with data:', {
                orderNumber: finalOrderNumber,
                orderType: purchaseOrderData.orderType,
                taxMode: purchaseOrderData.taxMode,
                priceIncludesTax: purchaseOrderData.priceIncludesTax,
                itemCount: purchaseOrderData.items.length,
                finalTotal: purchaseOrderData.totals.finalTotal,
                supplierName: supplierRecord.name
            });

            // Create the purchase order
            const purchaseOrder = new PurchaseOrder(purchaseOrderData);
            await purchaseOrder.save();

            // Populate supplier details for response
            await purchaseOrder.populate('supplier', 'name mobile phoneNumber email address type');

            console.log('✅ Purchase order created successfully:', {
                id: purchaseOrder._id,
                orderNumber: purchaseOrder.orderNumber,
                orderType: purchaseOrder.orderType,
                taxMode: purchaseOrder.taxMode,
                priceIncludesTax: purchaseOrder.priceIncludesTax,
                supplierName: supplierRecord.name
            });

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
                        taxMode: purchaseOrder.taxMode,
                        priceIncludesTax: purchaseOrder.priceIncludesTax,
                        gstEnabled: purchaseOrder.gstEnabled,
                        status: purchaseOrder.status,
                        priority: purchaseOrder.priority
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error creating purchase order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create purchase order',
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },

    // Generate next order number
    generateOrderNumber: async (req, res) => {
        try {
            const { companyId, orderType = 'purchase_order' } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            // Validate order type
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

            // Find the last order number for today
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
            console.error('❌ Error generating order number:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate order number',
                error: error.message
            });
        }
    },

    // Get all purchase orders with filtering
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
            console.error('❌ Error getting purchase orders:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve purchase orders',
                error: error.message
            });
        }
    },

    // Get purchase order by ID
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

            res.json({
                success: true,
                data: { order },
                message: 'Purchase order retrieved successfully'
            });

        } catch (error) {
            console.error('❌ Error getting purchase order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve purchase order',
                error: error.message
            });
        }
    },

    // Add payment to purchase order - ENHANCED WITH PAYMENT MODEL INTEGRATION
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
                type: 'payment_out', // Payment made to supplier
                reference,
                notes: notes || `Payment for ${purchaseOrder.orderType} ${purchaseOrder.orderNumber}`,
                internalNotes: `Purchase Order: ${purchaseOrder.orderNumber} (${purchaseOrder.orderType})`,
                paymentDetails,
                company: purchaseOrder.companyId,
                createdBy: req.user?.id || 'system',
                status: 'completed',
                // Link to the purchase order document
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

            // Save the payment record
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

                // Add to payment history
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

            // If this is an advance payment, update the advance amount
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
            console.error('❌ Error adding payment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add payment',
                error: error.message
            });
        }
    },

    // Convert purchase order to purchase invoice
    convertToPurchaseInvoice: async (req, res) => {
        try {
            const { id } = req.params;
            const { invoiceDate, transferAdvancePayment = true } = req.body;

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
                    message: 'Purchase order already converted to invoice'
                });
            }

            // Convert using model method (if available)
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

            res.status(200).json({
                success: true,
                message: 'Purchase order converted to invoice successfully',
                data: {
                    purchaseOrder: {
                        id: purchaseOrder._id,
                        orderNumber: purchaseOrder.orderNumber,
                        status: purchaseOrder.status,
                        convertedToPurchaseInvoice: purchaseOrder.convertedToPurchaseInvoice,
                        purchaseInvoiceNumber: purchaseOrder.purchaseInvoiceNumber,
                        convertedAt: purchaseOrder.convertedAt
                    },
                    purchaseInvoice: {
                        id: purchaseInvoice._id,
                        invoiceNumber: purchaseInvoice.invoiceNumber,
                        invoiceDate: purchaseInvoice.invoiceDate,
                        totalAmount: purchaseInvoice.totals.finalTotal,
                        status: purchaseInvoice.status
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error converting purchase order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to convert purchase order to invoice',
                error: error.message
            });
        }
    },

    // Update purchase order status
    updateStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, approvedBy } = req.body;

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

            purchaseOrder.lastModifiedBy = req.user?.id || 'system';
            await purchaseOrder.save();

            res.status(200).json({
                success: true,
                message: 'Purchase order status updated successfully',
                data: {
                    id: purchaseOrder._id,
                    orderNumber: purchaseOrder.orderNumber,
                    status: purchaseOrder.status,
                    approvedBy: purchaseOrder.approvedBy,
                    approvedAt: purchaseOrder.approvedAt
                }
            });

        } catch (error) {
            console.error('❌ Error updating status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update purchase order status',
                error: error.message
            });
        }
    },

    // Update purchase order
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
            console.error('❌ Error updating purchase order:', error);
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