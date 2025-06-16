const SalesOrder = require('../models/SalesOrder');
const Sale = require('../models/Sale');
const Item = require('../models/Item');
const Party = require('../models/Party');
const Payment = require('../models/Payment'); // ✅ CORRECTED: Use Payment instead of PaymentTransaction
const mongoose = require('mongoose');


// In Backend/src/controllers/salesOrderController.js

// ENHANCED findOrCreateCustomer function with better duplicate handling
const findOrCreateCustomer = async (customerName, customerMobile, customerId, companyId, userId) => {
    try {
        console.log('🔍 Starting customer search:', {
            customerName,
            customerMobile,
            customerId,
            companyId
        });

        // 1. If customer ID is provided, use it directly
        if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
            const customerRecord = await Party.findById(customerId);
            if (customerRecord && customerRecord.companyId.toString() === companyId.toString()) {
                console.log('✅ Found customer by ID:', customerRecord._id);
                return customerRecord;
            }
        }

        // 2. ✅ ENHANCED: More comprehensive mobile search with exact matching
        if (customerMobile) {
            console.log('🔍 Searching by mobile:', customerMobile);

            // Clean mobile number - remove spaces, dashes, and standardize
            const cleanMobile = customerMobile.toString().replace(/[\s\-\(\)]/g, '');

            // Try different mobile number variations
            const mobileVariations = [
                cleanMobile,
                customerMobile,
                customerMobile.toString()
            ];

            console.log('🔍 Trying mobile variations:', mobileVariations);

            // ✅ IMPROVED: Use aggregation pipeline for better search
            const customerByMobile = await Party.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        $or: [
                            { type: 'customer' },
                            { type: { $exists: false } }, // Handle legacy records without type
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

            if (customerByMobile && customerByMobile.length > 0) {
                const foundCustomer = await Party.findById(customerByMobile[0]._id);
                console.log('✅ Found customer by mobile using aggregation:', foundCustomer._id);

                // Update name if provided and different
                if (customerName && customerName.trim() !== foundCustomer.name) {
                    foundCustomer.name = customerName.trim();
                    await foundCustomer.save();
                    console.log('📝 Updated customer name');
                }

                return foundCustomer;
            }

            // ✅ FALLBACK: Try raw MongoDB query
            try {
                const db = mongoose.connection.db;
                const collection = db.collection('parties');

                const rawCustomer = await collection.findOne({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    $or: [
                        { mobile: { $in: mobileVariations } },
                        { phoneNumber: { $in: mobileVariations } },
                        { phone: { $in: mobileVariations } },
                        { contactNumber: { $in: mobileVariations } }
                    ]
                });

                if (rawCustomer) {
                    const foundCustomer = await Party.findById(rawCustomer._id);
                    console.log('✅ Found customer by raw query:', foundCustomer._id);

                    // Update name if provided and different
                    if (customerName && customerName.trim() !== foundCustomer.name) {
                        foundCustomer.name = customerName.trim();
                        await foundCustomer.save();
                        console.log('📝 Updated customer name via raw query');
                    }

                    return foundCustomer;
                }
            } catch (rawQueryError) {
                console.warn('⚠️ Raw query failed:', rawQueryError.message);
            }
        }

        // 3. ✅ ENHANCED: Search by name with better regex
        if (customerName) {
            console.log('🔍 Searching by name:', customerName);

            const nameVariations = [
                customerName.trim(),
                customerName.trim().toLowerCase(),
                customerName.trim().toUpperCase()
            ];

            const customerByName = await Party.findOne({
                companyId: companyId,
                $or: [
                    { type: 'customer' },
                    { type: { $exists: false } }, // Handle legacy records
                    { type: null }
                ],
                $or: nameVariations.map(name => ({
                    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                }))
            });

            if (customerByName) {
                console.log('✅ Found customer by name:', customerByName._id);

                // Update mobile if provided
                if (customerMobile && !customerByName.mobile && !customerByName.phoneNumber) {
                    customerByName.mobile = customerMobile;
                    customerByName.phoneNumber = customerMobile;
                    await customerByName.save();
                    console.log('📝 Added mobile to existing customer');
                }

                return customerByName;
            }
        }

        // 4. ✅ ENHANCED: Create new customer with better validation
        if (!customerName || !customerName.trim()) {
            throw new Error('Customer name is required to create new customer');
        }

        console.log('🆕 No existing customer found, creating new customer');

        // ✅ IMPORTANT: Clean and prepare data before creation
        const cleanCustomerData = {
            name: customerName.trim(),
            mobile: customerMobile ? customerMobile.toString() : '',
            phoneNumber: customerMobile ? customerMobile.toString() : '',
            type: 'customer',
            partyType: 'customer', // Add this for compatibility
            email: '',
            companyId: companyId,
            userId: userId,
            createdBy: userId,
            homeAddressLine: '', // Use homeAddressLine instead of address object
            address: '', // Keep for compatibility
            gstNumber: '',
            panNumber: '',
            status: 'active',
            creditLimit: 0,
            creditDays: 0,
            currentBalance: 0,
            openingBalance: 0
        };

        const newCustomer = new Party(cleanCustomerData);
        await newCustomer.save();

        console.log('✅ Created new customer:', newCustomer._id);
        return newCustomer;

    } catch (error) {
        console.error('❌ Error in findOrCreateCustomer:', error);

        // ✅ ENHANCED: Handle duplicate key error with comprehensive recovery
        if (error.code === 11000 || error.message.includes('E11000') || error.message.includes('duplicate key')) {
            console.log('🔄 Duplicate error detected, attempting comprehensive recovery...');

            try {
                // ✅ COMPREHENSIVE RECOVERY: Try all possible search methods
                const recoverySearches = [];

                // Search by mobile with all possible field combinations
                if (customerMobile) {
                    const cleanMobile = customerMobile.toString().replace(/[\s\-\(\)]/g, '');

                    recoverySearches.push(
                        Party.findOne({
                            companyId: companyId,
                            mobile: customerMobile
                        }),
                        Party.findOne({
                            companyId: companyId,
                            phoneNumber: customerMobile
                        }),
                        Party.findOne({
                            companyId: companyId,
                            phone: customerMobile
                        }),
                        Party.findOne({
                            companyId: companyId,
                            contactNumber: customerMobile
                        }),
                        Party.findOne({
                            companyId: companyId,
                            mobile: cleanMobile
                        }),
                        Party.findOne({
                            companyId: companyId,
                            phoneNumber: cleanMobile
                        })
                    );
                }

                // Search by name
                if (customerName) {
                    recoverySearches.push(
                        Party.findOne({
                            companyId: companyId,
                            name: customerName.trim()
                        }),
                        Party.findOne({
                            companyId: companyId,
                            name: { $regex: new RegExp(`^${customerName.trim()}$`, 'i') }
                        })
                    );
                }

                // Execute all searches in parallel
                const searchResults = await Promise.allSettled(recoverySearches);

                // Find the first successful result
                for (const result of searchResults) {
                    if (result.status === 'fulfilled' && result.value) {
                        console.log('✅ Recovery successful! Found customer:', result.value._id);

                        // Update any missing fields
                        let needsUpdate = false;

                        if (customerName && result.value.name !== customerName.trim()) {
                            result.value.name = customerName.trim();
                            needsUpdate = true;
                        }

                        if (customerMobile && !result.value.mobile) {
                            result.value.mobile = customerMobile;
                            needsUpdate = true;
                        }

                        if (customerMobile && !result.value.phoneNumber) {
                            result.value.phoneNumber = customerMobile;
                            needsUpdate = true;
                        }

                        if (!result.value.type) {
                            result.value.type = 'customer';
                            needsUpdate = true;
                        }

                        if (needsUpdate) {
                            try {
                                await result.value.save();
                                console.log('📝 Updated recovered customer data');
                            } catch (updateError) {
                                console.warn('⚠️ Could not update recovered customer:', updateError.message);
                            }
                        }

                        return result.value;
                    }
                }

                // ✅ LAST RESORT: Use raw MongoDB aggregation
                console.log('🔄 Trying raw aggregation as last resort...');

                const db = mongoose.connection.db;
                const collection = db.collection('parties');

                let rawResult = null;

                if (customerMobile) {
                    rawResult = await collection.findOne({
                        companyId: new mongoose.Types.ObjectId(companyId),
                        $or: [
                            { mobile: customerMobile },
                            { phoneNumber: customerMobile },
                            { phone: customerMobile },
                            { contactNumber: customerMobile }
                        ]
                    });
                }

                if (!rawResult && customerName) {
                    rawResult = await collection.findOne({
                        companyId: new mongoose.Types.ObjectId(companyId),
                        name: { $regex: new RegExp(`^${customerName.trim()}$`, 'i') }
                    });
                }

                if (rawResult) {
                    const recoveredCustomer = await Party.findById(rawResult._id);
                    console.log('✅ Raw aggregation recovery successful:', recoveredCustomer._id);
                    return recoveredCustomer;
                }

                // If all recovery attempts fail, provide detailed error
                const errorDetails = {
                    customerName,
                    customerMobile,
                    companyId,
                    searchAttempts: recoverySearches.length,
                    duplicateKeyError: error.keyValue || {},
                    suggestion: 'Check database directly for data inconsistency'
                };

                console.error('❌ All recovery attempts failed:', errorDetails);

                throw new Error(`Customer already exists but cannot be found. This indicates a database inconsistency. Details: ${JSON.stringify(errorDetails)}`);

            } catch (recoveryError) {
                console.error('❌ Recovery process failed:', recoveryError);
                throw new Error(`Database error: Unable to resolve customer conflict. Original error: ${error.message}. Recovery error: ${recoveryError.message}`);
            }
        }

        // ✅ ENHANCED: Better error messages for other errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            throw new Error(`Customer validation failed: ${validationErrors.join(', ')}`);
        }

        if (error.name === 'CastError') {
            throw new Error(`Invalid data format for customer: ${error.message}`);
        }

        // Re-throw other errors with additional context
        throw new Error(`Customer operation failed: ${error.message}`);
    }
};

const salesOrderController = {

    createSalesOrder: async (req, res) => {
        try {
            const {
                customerName,
                customerMobile,
                customer,
                orderNumber,
                orderDate,
                orderType = 'quotation',
                validUntil,
                expectedDeliveryDate,
                gstEnabled = true,
                gstType = 'gst',  // ✅ NEW: Added gstType field
                companyId,
                items,
                payment,
                notes,
                termsAndConditions,
                customerNotes,
                roundOff = 0,
                roundOffEnabled = false,
                status = 'draft',
                priority = 'normal',
                // Tax mode fields
                taxMode = 'without-tax',
                priceIncludesTax = false
            } = req.body;

            console.log('📥 Creating sales order with data:', {
                orderType,
                gstType,
                gstEnabled,
                taxMode,
                priceIncludesTax,
                itemCount: items?.length || 0
            });

            // Validate required fields
            if ((!customerName && !customer) || !companyId || !items || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer (name or ID), Company, and Items are required'
                });
            }

            // Validate order type
            if (!['quotation', 'sales_order', 'proforma_invoice'].includes(orderType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order type. Must be quotation, sales_order, or proforma_invoice'
                });
            }

            // ✅ UPDATED: Generate order number with proper logic
            let finalOrderNumber = orderNumber;
            if (!finalOrderNumber) {
                const date = new Date();
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');

                let prefix;
                switch (orderType) {
                    case 'quotation':
                        prefix = 'QUO';
                        break;
                    case 'sales_order':
                        prefix = 'SO';
                        break;
                    case 'proforma_invoice':
                        prefix = 'PI';
                        break;
                    default:
                        prefix = 'ORD';
                }

                const todayStart = new Date(year, date.getMonth(), date.getDate());
                const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

                const lastOrder = await SalesOrder.findOne({
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
            }

            // ✅ UPDATED: Sync tax mode fields properly
            const finalGstType = gstType || (gstEnabled ? 'gst' : 'non-gst');
            const finalTaxMode = taxMode || (priceIncludesTax ? 'with-tax' : 'without-tax');
            const finalPriceIncludesTax = finalTaxMode === 'with-tax';
            const finalGstEnabled = finalGstType === 'gst';

            console.log('🔄 Tax settings synchronized:', {
                originalGstType: gstType,
                originalGstEnabled: gstEnabled,
                originalTaxMode: taxMode,
                originalPriceIncludesTax: priceIncludesTax,
                finalGstType,
                finalGstEnabled,
                finalTaxMode,
                finalPriceIncludesTax
            });

            // Find or create customer
            let customerRecord;
            try {
                customerRecord = await findOrCreateCustomer(
                    customerName,
                    customerMobile,
                    customer,
                    companyId,
                    req.user?.id || companyId
                );
            } catch (customerError) {
                console.error('❌ Customer resolution failed:', customerError);
                return res.status(400).json({
                    success: false,
                    message: 'Customer resolution failed',
                    error: customerError.message,
                    details: {
                        customerName,
                        customerMobile,
                        companyId,
                        suggestion: customerMobile ?
                            `Try searching for existing customer with mobile ${customerMobile} in your customer list` :
                            'Ensure customer name is provided for new customer creation'
                    }
                });
            }

            console.log('👤 Using customer for order:', {
                customerId: customerRecord._id,
                customerName: customerRecord.name,
                customerMobile: customerRecord.mobile || customerRecord.phoneNumber
            });

            // ✅ UPDATED: Process items with frontend field mapping
            const processedItems = [];
            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;
            let totalTaxableAmount = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                console.log(`🔄 Processing item ${i + 1}:`, {
                    productName: item.productName || item.itemName,
                    selectedProduct: item.selectedProduct,
                    price: item.price || item.pricePerUnit,
                    quantity: item.quantity,
                    gstMode: item.gstMode || item.taxMode
                });

                // ✅ UPDATED: Frontend field mapping
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

                // Calculate taxes
                let cgst = 0;
                let sgst = 0;
                let igst = 0;
                let itemAmount = 0;
                let itemTaxableAmount = 0;

                if (finalGstEnabled && gstRate > 0) {
                    const itemCgstRate = gstRate / 2;
                    const itemSgstRate = gstRate / 2;
                    const itemIgstRate = 0; // For now, assume intra-state

                    if (itemPriceIncludesTax) {
                        // GST INCLUDE mode - extract tax from amount
                        const taxMultiplier = 1 + (gstRate / 100);
                        itemTaxableAmount = amountAfterDiscount / taxMultiplier;
                        cgst = (itemTaxableAmount * itemCgstRate) / 100;
                        sgst = (itemTaxableAmount * itemSgstRate) / 100;
                        igst = (itemTaxableAmount * itemIgstRate) / 100;
                        itemAmount = amountAfterDiscount;
                    } else {
                        // GST EXCLUDE mode - add tax to amount
                        itemTaxableAmount = amountAfterDiscount;
                        cgst = (itemTaxableAmount * itemCgstRate) / 100;
                        sgst = (itemTaxableAmount * itemSgstRate) / 100;
                        igst = (itemTaxableAmount * itemIgstRate) / 100;
                        itemAmount = itemTaxableAmount + cgst + sgst + igst;
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

                // ✅ UPDATED: Create processed item with both frontend and backend fields
                const processedItem = {
                    // Item reference
                    itemRef: item.selectedProduct && mongoose.Types.ObjectId.isValid(item.selectedProduct)
                        ? item.selectedProduct : null,
                    selectedProduct: item.selectedProduct || '',

                    // Item details - dual field mapping
                    itemName: itemName,
                    productName: itemName, // Frontend field
                    itemCode: itemCode,
                    productCode: itemCode, // Frontend field
                    description: description,
                    hsnCode: hsnNumber,
                    hsnNumber: hsnNumber, // Frontend field
                    category: item.category || '',

                    // Quantity and unit
                    quantity: quantity,
                    unit: unit,

                    // Pricing - dual field mapping
                    pricePerUnit: pricePerUnit,
                    price: pricePerUnit, // Frontend field
                    taxRate: gstRate,
                    gstRate: gstRate, // Frontend field

                    // Tax modes - dual field mapping
                    taxMode: itemPriceIncludesTax ? 'with-tax' : 'without-tax',
                    gstMode: itemPriceIncludesTax ? 'include' : 'exclude', // Frontend field
                    priceIncludesTax: itemPriceIncludesTax,

                    // Stock info
                    availableStock: item.availableStock || 0,

                    // Discount
                    discountPercent: discountPercent,
                    discountAmount: parseFloat(itemDiscountAmount.toFixed(2)),

                    // Tax amounts - dual field mapping
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    igst: parseFloat(igst.toFixed(2)),
                    cgstAmount: parseFloat(cgst.toFixed(2)), // Frontend field
                    sgstAmount: parseFloat(sgst.toFixed(2)), // Frontend field
                    igstAmount: parseFloat(igst.toFixed(2)), // Frontend field

                    // Calculated amounts - dual field mapping
                    subtotal: parseFloat((baseAmount - itemDiscountAmount).toFixed(2)), // Frontend field
                    taxableAmount: parseFloat(itemTaxableAmount.toFixed(2)),
                    totalTaxAmount: parseFloat(itemTotalTax.toFixed(2)),
                    gstAmount: parseFloat(itemTotalTax.toFixed(2)), // Frontend field

                    // Final amounts - dual field mapping
                    amount: parseFloat(itemAmount.toFixed(2)),
                    itemAmount: parseFloat(itemAmount.toFixed(2)),
                    totalAmount: parseFloat(itemAmount.toFixed(2)), // Frontend field

                    // Line number
                    lineNumber: i + 1
                };

                processedItems.push(processedItem);

                console.log(`✅ Item ${i + 1} processed:`, {
                    itemName: processedItem.itemName,
                    gstMode: processedItem.gstMode,
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

            // Payment details
            const paymentDetails = {
                method: payment?.method || 'cash',
                status: payment?.status || 'pending',
                paidAmount: parseFloat(payment?.paidAmount || 0),
                advanceAmount: parseFloat(payment?.advanceAmount || 0),
                pendingAmount: 0,
                paymentDate: payment?.paymentDate ? new Date(payment.paymentDate) : new Date(),
                dueDate: payment?.dueDate ? new Date(payment.dueDate) : null,
                creditDays: parseInt(payment?.creditDays || 0),
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
            if (!orderValidUntil && orderType === 'quotation') {
                orderValidUntil = new Date();
                orderValidUntil.setDate(orderValidUntil.getDate() + 30);
            }

            // ✅ UPDATED: Create sales order data with all required fields
            const salesOrderData = {
                orderNumber: finalOrderNumber,
                orderDate: orderDate ? new Date(orderDate) : new Date(),
                orderType,
                validUntil: orderValidUntil,
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                customer: customerRecord._id,
                customerMobile: customerMobile || customerRecord.mobile,

                // ✅ UPDATED: GST and tax settings with dual fields
                gstEnabled: finalGstEnabled,
                gstType: finalGstType, // Frontend field
                taxMode: finalTaxMode,
                priceIncludesTax: finalPriceIncludesTax,

                companyId,
                items: processedItems,
                totals,
                payment: paymentDetails,
                paymentHistory: paymentHistory,
                notes: notes || '',
                termsAndConditions: termsAndConditions || '',
                customerNotes: customerNotes || '',
                status,
                priority,
                createdBy: req.user?.id || 'system',
                lastModifiedBy: req.user?.id || 'system'
            };

            console.log('💾 Creating sales order with final data:', {
                orderNumber: finalOrderNumber,
                orderType: salesOrderData.orderType,
                gstType: salesOrderData.gstType,
                gstEnabled: salesOrderData.gstEnabled,
                taxMode: salesOrderData.taxMode,
                priceIncludesTax: salesOrderData.priceIncludesTax,
                itemCount: salesOrderData.items.length,
                finalTotal: salesOrderData.totals.finalTotal
            });

            // Create the sales order
            const salesOrder = new SalesOrder(salesOrderData);
            await salesOrder.save();

            // Populate customer details for response
            await salesOrder.populate('customer', 'name mobile email address type');

            console.log('✅ Sales order created successfully:', {
                id: salesOrder._id,
                orderNumber: salesOrder.orderNumber,
                orderType: salesOrder.orderType,
                gstType: salesOrder.gstType,
                taxMode: salesOrder.taxMode
            });

            res.status(201).json({
                success: true,
                message: `${orderType === 'quotation' ? 'Quotation' : orderType === 'sales_order' ? 'Sales order' : 'Proforma invoice'} created successfully`,
                data: {
                    salesOrder,
                    order: {
                        orderNumber: salesOrder.orderNumber,
                        orderDate: salesOrder.orderDate,
                        orderType: salesOrder.orderType,
                        validUntil: salesOrder.validUntil,
                        customer: {
                            name: customerRecord.name,
                            mobile: customerRecord.mobile
                        },
                        totals: salesOrder.totals,
                        payment: {
                            ...salesOrder.payment,
                            dueDate: salesOrder.payment.dueDate,
                            creditDays: salesOrder.payment.creditDays,
                            isOverdue: salesOrder.isOverdue
                        },
                        gstType: salesOrder.gstType,
                        gstEnabled: salesOrder.gstEnabled,
                        taxMode: salesOrder.taxMode,
                        priceIncludesTax: salesOrder.priceIncludesTax,
                        status: salesOrder.status,
                        priority: salesOrder.priority
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error creating sales order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create sales order',
                error: error.message,
                details: error.code === 11000 ? 'Duplicate key constraint violation - customer may already exist' : undefined
            });
        }
    },

    // ✅ UPDATED: Get sales order by ID with frontend compatibility
    getSalesOrderById: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sales order ID'
                });
            }

            const salesOrder = await SalesOrder.findById(id)
                .populate('customer', 'name mobile email address type gstNumber')
                .populate('items.itemRef', 'name itemCode category currentStock')
                .populate('invoiceRef', 'invoiceNumber invoiceDate');

            if (!salesOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Sales order not found'
                });
            }

            // ✅ UPDATED: Ensure full frontend compatibility
            const compatibleSalesOrder = {
                ...salesOrder.toObject(),
                // GST type compatibility
                gstType: salesOrder.gstType || (salesOrder.gstEnabled ? 'gst' : 'non-gst'),
                gstEnabled: salesOrder.gstEnabled ?? (salesOrder.gstType === 'gst'),
                // Tax mode compatibility
                taxMode: salesOrder.taxMode || (salesOrder.priceIncludesTax ? 'with-tax' : 'without-tax'),
                priceIncludesTax: salesOrder.priceIncludesTax ?? (salesOrder.taxMode === 'with-tax'),
                items: salesOrder.items.map(item => ({
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
                    taxMode: item.taxMode || salesOrder.taxMode || 'without-tax',
                    priceIncludesTax: item.priceIncludesTax ?? (item.taxMode === 'with-tax'),
                    cgstAmount: item.cgstAmount || item.cgst || 0,
                    sgstAmount: item.sgstAmount || item.sgst || 0,
                    igstAmount: item.igstAmount || item.igst || 0,
                    amount: item.amount || item.itemAmount || 0
                }))
            };

            console.log('📤 Sending sales order data with full compatibility:', {
                id: salesOrder._id,
                orderType: compatibleSalesOrder.orderType,
                gstType: compatibleSalesOrder.gstType,
                gstEnabled: compatibleSalesOrder.gstEnabled,
                taxMode: compatibleSalesOrder.taxMode,
                priceIncludesTax: compatibleSalesOrder.priceIncludesTax,
                itemCount: compatibleSalesOrder.items.length
            });

            res.json({
                success: true,
                data: compatibleSalesOrder
            });

        } catch (error) {
            console.error('❌ Error fetching sales order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sales order',
                error: error.message
            });
        }
    },

    // ✅ UPDATED: Convert to invoice with better error handling
    convertToInvoice: async (req, res) => {
        try {
            const { id } = req.params;
            const { invoiceDate, transferAdvancePayment = true, convertedBy } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sales order ID'
                });
            }

            const salesOrder = await SalesOrder.findById(id);
            if (!salesOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Sales order not found'
                });
            }

            if (salesOrder.convertedToInvoice) {
                return res.status(400).json({
                    success: false,
                    message: 'Sales order already converted to invoice',
                    data: {
                        invoiceNumber: salesOrder.invoiceNumber,
                        invoiceRef: salesOrder.invoiceRef,
                        convertedAt: salesOrder.convertedAt
                    }
                });
            }

            if (salesOrder.status === 'cancelled' || salesOrder.status === 'rejected') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot convert cancelled or rejected orders'
                });
            }

            // Set convertedBy if provided
            if (convertedBy) {
                salesOrder.convertedBy = convertedBy;
            }

            console.log('🔄 Converting sales order to invoice:', {
                orderId: salesOrder._id,
                orderNumber: salesOrder.orderNumber,
                orderType: salesOrder.orderType,
                gstType: salesOrder.gstType,
                finalTotal: salesOrder.totals?.finalTotal
            });

            // Convert using the model method
            const invoice = await salesOrder.convertToInvoice();

            // Update invoice date if provided
            if (invoiceDate) {
                invoice.invoiceDate = new Date(invoiceDate);
                await invoice.save();
            }

            // ✅ ENHANCED: Transfer advance payments to invoice
            if (transferAdvancePayment && salesOrder.payment.advanceAmount > 0) {
                try {
                    // Find advance payment records for this order
                    const advancePayments = await Payment.find({
                        party: salesOrder.customer,
                        company: salesOrder.companyId,
                        'linkedDocuments.documentId': salesOrder._id,
                        status: 'completed'
                    });

                    console.log(`🔍 Found ${advancePayments.length} advance payments to transfer`);

                    // Update payment records to reference the new invoice
                    for (const payment of advancePayments) {
                        const originalNotes = payment.notes || '';
                        payment.notes = `${originalNotes} - Transferred to Invoice ${invoice.invoiceNumber}`;
                        payment.internalNotes = `${payment.internalNotes || ''} | Transferred from SO ${salesOrder.orderNumber} to INV ${invoice.invoiceNumber}`;

                        // Add new document link for the invoice
                        payment.linkedDocuments.push({
                            documentType: 'sale',
                            documentId: invoice._id,
                            documentModel: 'Sale',
                            documentNumber: invoice.invoiceNumber,
                            documentDate: invoice.invoiceDate,
                            documentTotal: invoice.totals.finalTotal,
                            allocatedAmount: payment.amount,
                            remainingAmount: Math.max(0, invoice.totals.finalTotal - payment.amount),
                            allocationDate: new Date(),
                            isFullyPaid: invoice.totals.finalTotal <= payment.amount
                        });

                        await payment.save();
                    }

                    console.log(`✅ Transferred ${advancePayments.length} advance payments to invoice`);
                } catch (paymentTransferError) {
                    console.warn('⚠️ Error transferring advance payments:', paymentTransferError.message);
                    // Don't fail the conversion, just log the warning
                }
            }

            // Populate data for response
            await salesOrder.populate('customer', 'name mobile email');
            await invoice.populate('customer', 'name mobile email');

            console.log('✅ Sales order converted to invoice successfully:', {
                orderId: salesOrder._id,
                orderNumber: salesOrder.orderNumber,
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                convertedAt: salesOrder.convertedAt,
                advanceTransferred: transferAdvancePayment ? salesOrder.payment.advanceAmount : 0
            });

            res.status(200).json({
                success: true,
                message: 'Sales order converted to invoice successfully',
                data: {
                    salesOrder: {
                        id: salesOrder._id,
                        orderNumber: salesOrder.orderNumber,
                        orderType: salesOrder.orderType,
                        status: salesOrder.status,
                        convertedToInvoice: salesOrder.convertedToInvoice,
                        convertedAt: salesOrder.convertedAt,
                        convertedBy: salesOrder.convertedBy
                    },
                    invoice: {
                        id: invoice._id,
                        invoiceNumber: invoice.invoiceNumber,
                        invoiceDate: invoice.invoiceDate,
                        invoiceType: invoice.invoiceType,
                        status: invoice.status,
                        totals: invoice.totals
                    },
                    conversion: {
                        orderNumber: salesOrder.orderNumber,
                        invoiceNumber: invoice.invoiceNumber,
                        convertedAt: salesOrder.convertedAt,
                        convertedBy: salesOrder.convertedBy,
                        advanceTransferred: transferAdvancePayment ? salesOrder.payment.advanceAmount : 0,
                        transferredAmount: transferAdvancePayment ? salesOrder.payment.advanceAmount : 0
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error converting sales order to invoice:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to convert sales order to invoice',
                error: error.message,
                details: {
                    errorType: error.name || 'ConversionError',
                    suggestion: 'Check if all required fields are present and valid'
                }
            });
        }
    },


    // Add payment to sales order - ENHANCED WITH PAYMENT MODEL INTEGRATION
    addPayment: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                amount,
                method = 'cash',
                reference = '',
                paymentDate,
                dueDate,
                creditDays,
                notes = '',
                isAdvancePayment = false,
                paymentDetails = {} // Additional payment details for Payment model
            } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sales order ID'
                });
            }

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid payment amount is required'
                });
            }

            const salesOrder = await SalesOrder.findById(id);
            if (!salesOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Sales order not found'
                });
            }

            const currentBalance = salesOrder.balanceAmount;
            if (amount > currentBalance) {
                return res.status(400).json({
                    success: false,
                    message: `Payment amount cannot exceed balance amount of ₹${currentBalance.toFixed(2)}`
                });
            }

            // ✅ CREATE PAYMENT RECORD USING PAYMENT MODEL
            const paymentRecord = new Payment({
                party: salesOrder.customer,
                partyType: 'customer',
                amount: parseFloat(amount),
                paymentMethod: method,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                type: 'payment_in', // Payment received from customer
                reference,
                notes: notes || `Payment for ${salesOrder.orderType} ${salesOrder.orderNumber}`,
                internalNotes: `Sales Order: ${salesOrder.orderNumber} (${salesOrder.orderType})`,
                paymentDetails,
                company: salesOrder.companyId,
                createdBy: req.user?.id || 'system',
                status: 'completed',
                // Link to the sales order document
                linkedDocuments: [{
                    documentType: 'sales_order',
                    documentId: salesOrder._id,
                    documentModel: 'SalesOrder',
                    documentNumber: salesOrder.orderNumber,
                    documentDate: salesOrder.orderDate,
                    documentTotal: salesOrder.totals.finalTotal,
                    allocatedAmount: parseFloat(amount),
                    remainingAmount: Math.max(0, currentBalance - parseFloat(amount)),
                    allocationDate: new Date(),
                    isFullyPaid: (currentBalance - parseFloat(amount)) <= 0
                }]
            });

            // Save the payment record
            await paymentRecord.save();

            // Add payment using sales order model method
            await salesOrder.addPayment(amount, method, reference, notes);

            // If this is an advance payment, update the advance amount
            if (isAdvancePayment) {
                salesOrder.payment.advanceAmount = (salesOrder.payment.advanceAmount || 0) + parseFloat(amount);
                await salesOrder.save();
            }

            console.log('✅ Payment added to sales order and Payment record created:', {
                orderId: salesOrder._id,
                orderNumber: salesOrder.orderNumber,
                paymentId: paymentRecord._id,
                paymentNumber: paymentRecord.paymentNumber,
                amount: parseFloat(amount),
                method,
                isAdvance: isAdvancePayment
            });

            res.status(200).json({
                success: true,
                message: 'Payment added successfully',
                data: {
                    orderNumber: salesOrder.orderNumber,
                    paymentNumber: paymentRecord.paymentNumber,
                    paymentId: paymentRecord._id,
                    totalAmount: salesOrder.totals.finalTotal,
                    paidAmount: salesOrder.payment.paidAmount,
                    advanceAmount: salesOrder.payment.advanceAmount,
                    pendingAmount: salesOrder.payment.pendingAmount,
                    paymentStatus: salesOrder.payment.status,
                    paymentMethod: salesOrder.payment.method,
                    paymentDate: salesOrder.payment.paymentDate,
                    dueDate: salesOrder.payment.dueDate,
                    creditDays: salesOrder.payment.creditDays,
                    isOverdue: salesOrder.isOverdue,
                    paymentHistory: salesOrder.paymentHistory,
                    balanceAmount: salesOrder.balanceAmount,
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
            console.error('Error adding payment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add payment',
                error: error.message
            });
        }
    },

    getSalesOrderById: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sales order ID'
                });
            }

            const salesOrder = await SalesOrder.findById(id)
                .populate('customer', 'name mobile email address type gstNumber')
                .populate('items.itemRef', 'name itemCode category currentStock')
                .populate('invoiceRef', 'invoiceNumber invoiceDate');

            if (!salesOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Sales order not found'
                });
            }

            // Ensure backward compatibility for tax mode fields
            const compatibleSalesOrder = {
                ...salesOrder.toObject(),
                taxMode: salesOrder.taxMode || (salesOrder.priceIncludesTax ? 'with-tax' : 'without-tax'),
                priceIncludesTax: salesOrder.priceIncludesTax ?? (salesOrder.taxMode === 'with-tax'),
                items: salesOrder.items.map(item => ({
                    ...item,
                    taxMode: item.taxMode || salesOrder.taxMode || 'without-tax',
                    priceIncludesTax: item.priceIncludesTax ?? (item.taxMode === 'with-tax'),
                    cgstAmount: item.cgstAmount || item.cgst || 0,
                    sgstAmount: item.sgstAmount || item.sgst || 0,
                    igstAmount: item.igstAmount || item.igst || 0,
                    amount: item.amount || item.itemAmount || 0
                }))
            };

            console.log('📤 Sending sales order data with tax mode compatibility:', {
                id: salesOrder._id,
                orderType: compatibleSalesOrder.orderType,
                taxMode: compatibleSalesOrder.taxMode,
                priceIncludesTax: compatibleSalesOrder.priceIncludesTax
            });

            res.json({
                success: true,
                data: compatibleSalesOrder
            });

        } catch (error) {
            console.error('❌ Error fetching sales order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sales order',
                error: error.message
            });
        }
    },

    getAllSalesOrders: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                companyId,
                customer,
                status,
                orderType,
                paymentStatus,
                dateFrom,
                dateTo,
                validFrom,
                validTo,
                priority,
                search
            } = req.query;

            const filter = {};

            if (companyId) filter.companyId = companyId;
            if (customer) filter.customer = customer;
            if (status) filter.status = status;
            if (orderType) filter.orderType = orderType;
            if (paymentStatus) filter['payment.status'] = paymentStatus;
            if (priority) filter.priority = priority;

            if (dateFrom || dateTo) {
                filter.orderDate = {};
                if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
                if (dateTo) filter.orderDate.$lte = new Date(dateTo);
            }

            if (validFrom || validTo) {
                filter.validUntil = {};
                if (validFrom) filter.validUntil.$gte = new Date(validFrom);
                if (validTo) filter.validUntil.$lte = new Date(validTo);
            }

            if (search) {
                filter.$or = [
                    { orderNumber: { $regex: search, $options: 'i' } },
                    { customerMobile: { $regex: search, $options: 'i' } },
                    { notes: { $regex: search, $options: 'i' } },
                    { customerNotes: { $regex: search, $options: 'i' } }
                ];
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const salesOrders = await SalesOrder.find(filter)
                .populate('customer', 'name mobile email address type')
                .populate('invoiceRef', 'invoiceNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const transformedOrders = salesOrders.map(order => ({
                id: order._id,
                orderNo: order.orderNumber,
                orderType: order.orderType,
                date: order.orderDate,
                validUntil: order.validUntil,
                partyName: order.customer?.name || 'Unknown',
                partyPhone: order.customer?.mobile || order.customerMobile,
                transaction: order.orderType === 'quotation' ? 'Quotation' :
                    order.orderType === 'sales_order' ? 'Sales Order' : 'Proforma Invoice',
                paymentType: order.payment?.method || 'cash',
                amount: order.totals?.finalTotal || 0,
                balance: order.payment?.pendingAmount || 0,
                status: order.status,
                paymentStatus: order.payment?.status || 'pending',
                priority: order.priority,
                convertedToInvoice: order.convertedToInvoice,
                invoiceNumber: order.invoiceRef?.invoiceNumber || null,
                isExpired: order.isExpired,
                isOverdue: order.isOverdue,
                ...order.toObject()
            }));

            const totalOrders = await SalesOrder.countDocuments(filter);
            const totalPages = Math.ceil(totalOrders / parseInt(limit));

            const summary = await SalesOrder.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$totals.finalTotal' },
                        totalTax: { $sum: '$totals.totalTax' },
                        totalDiscount: { $sum: '$totals.totalDiscount' },
                        paidAmount: { $sum: '$payment.paidAmount' },
                        pendingAmount: { $sum: '$payment.pendingAmount' },
                        quotationCount: { $sum: { $cond: [{ $eq: ['$orderType', 'quotation'] }, 1, 0] } },
                        salesOrderCount: { $sum: { $cond: [{ $eq: ['$orderType', 'sales_order'] }, 1, 0] } },
                        convertedCount: { $sum: { $cond: ['$convertedToInvoice', 1, 0] } }
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: {
                    salesOrders: transformedOrders,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalOrders,
                        hasNext: parseInt(page) < totalPages,
                        hasPrev: parseInt(page) > 1
                    },
                    summary: summary[0] || {
                        totalAmount: 0,
                        totalTax: 0,
                        totalDiscount: 0,
                        paidAmount: 0,
                        pendingAmount: 0,
                        quotationCount: 0,
                        salesOrderCount: 0,
                        convertedCount: 0
                    }
                }
            });

        } catch (error) {
            console.error('Error getting sales orders:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get sales orders',
                error: error.message
            });
        }
    },

    convertToInvoice: async (req, res) => {
        try {
            const { id } = req.params;
            const { invoiceDate, transferAdvancePayment = true } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sales order ID'
                });
            }

            const salesOrder = await SalesOrder.findById(id);
            if (!salesOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Sales order not found'
                });
            }

            if (salesOrder.convertedToInvoice) {
                return res.status(400).json({
                    success: false,
                    message: 'Sales order already converted to invoice'
                });
            }

            if (salesOrder.status === 'cancelled' || salesOrder.status === 'rejected') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot convert cancelled or rejected orders'
                });
            }

            // Convert using the model method
            const invoice = await salesOrder.convertToInvoice();

            // Update invoice date if provided
            if (invoiceDate) {
                invoice.invoiceDate = new Date(invoiceDate);
                await invoice.save();
            }

            // ✅ TRANSFER ADVANCE PAYMENTS TO INVOICE
            if (transferAdvancePayment && salesOrder.payment.advanceAmount > 0) {
                // Find advance payment records for this order
                const advancePayments = await Payment.find({
                    party: salesOrder.customer,
                    company: salesOrder.companyId,
                    'linkedDocuments.documentId': salesOrder._id,
                    status: 'completed'
                });

                // Update payment records to reference the new invoice
                for (const payment of advancePayments) {
                    payment.notes = `${payment.notes} - Transferred to Invoice ${invoice.invoiceNumber}`;

                    // Add new document link for the invoice
                    payment.linkedDocuments.push({
                        documentType: 'sale',
                        documentId: invoice._id,
                        documentModel: 'Sale',
                        documentNumber: invoice.invoiceNumber,
                        documentDate: invoice.invoiceDate,
                        documentTotal: invoice.totals.finalTotal,
                        allocatedAmount: payment.amount,
                        remainingAmount: Math.max(0, invoice.totals.finalTotal - payment.amount),
                        allocationDate: new Date(),
                        isFullyPaid: invoice.totals.finalTotal <= payment.amount
                    });

                    await payment.save();
                }

                console.log(`✅ Transferred ${advancePayments.length} advance payments to invoice`);
            }

            await salesOrder.populate('customer', 'name mobile email');
            await invoice.populate('customer', 'name mobile email');

            console.log('✅ Sales order converted to invoice:', {
                orderId: salesOrder._id,
                orderNumber: salesOrder.orderNumber,
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                advanceTransferred: transferAdvancePayment ? salesOrder.payment.advanceAmount : 0
            });

            res.status(200).json({
                success: true,
                message: 'Sales order converted to invoice successfully',
                data: {
                    salesOrder,
                    invoice,
                    conversion: {
                        orderNumber: salesOrder.orderNumber,
                        invoiceNumber: invoice.invoiceNumber,
                        convertedAt: salesOrder.convertedAt,
                        advanceTransferred: transferAdvancePayment ? salesOrder.payment.advanceAmount : 0
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error converting sales order to invoice:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to convert sales order to invoice',
                error: error.message
            });
        }
    },

    updateStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, reason = '' } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sales order ID'
                });
            }

            const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
                });
            }

            const salesOrder = await SalesOrder.findById(id);
            if (!salesOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Sales order not found'
                });
            }

            // Check if status change is allowed
            if (salesOrder.convertedToInvoice && status !== 'converted') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change status of converted orders'
                });
            }

            const previousStatus = salesOrder.status;
            salesOrder.status = status;
            salesOrder.lastModifiedBy = req.user?.id || 'system';

            // Add reason to notes if provided
            if (reason) {
                const statusNote = `Status changed from ${previousStatus} to ${status}. Reason: ${reason}`;
                salesOrder.notes = salesOrder.notes ? `${salesOrder.notes}\n${statusNote}` : statusNote;
            }

            await salesOrder.save();

            console.log('✅ Sales order status updated:', {
                orderId: salesOrder._id,
                orderNumber: salesOrder.orderNumber,
                previousStatus,
                newStatus: status,
                reason
            });

            res.status(200).json({
                success: true,
                message: `Sales order status updated to ${status}`,
                data: {
                    orderNumber: salesOrder.orderNumber,
                    previousStatus,
                    currentStatus: salesOrder.status,
                    reason,
                    updatedAt: salesOrder.updatedAt
                }
            });

        } catch (error) {
            console.error('Error updating sales order status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update sales order status',
                error: error.message
            });
        }
    },

    updateSalesOrder: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sales order ID'
                });
            }

            const salesOrder = await SalesOrder.findById(id);
            if (!salesOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Sales order not found'
                });
            }

            if (salesOrder.convertedToInvoice) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update converted sales orders'
                });
            }

            if (salesOrder.status === 'cancelled') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update cancelled sales orders'
                });
            }

            updateData.lastModifiedBy = req.user?.id || 'system';

            const updatedSalesOrder = await SalesOrder.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('customer', 'name mobile email address');

            console.log('✅ Sales order updated:', {
                orderId: updatedSalesOrder._id,
                orderNumber: updatedSalesOrder.orderNumber,
                updatedFields: Object.keys(updateData)
            });

            res.status(200).json({
                success: true,
                message: 'Sales order updated successfully',
                data: updatedSalesOrder
            });

        } catch (error) {
            console.error('Error updating sales order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update sales order',
                error: error.message
            });
        }
    },

    deleteSalesOrder: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sales order ID'
                });
            }

            const salesOrder = await SalesOrder.findById(id);
            if (!salesOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Sales order not found'
                });
            }

            if (salesOrder.convertedToInvoice) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete converted sales orders'
                });
            }

            salesOrder.status = 'cancelled';
            salesOrder.lastModifiedBy = req.user?.id || 'system';
            await salesOrder.save();

            console.log('✅ Sales order cancelled:', {
                orderId: salesOrder._id,
                orderNumber: salesOrder.orderNumber
            });

            res.status(200).json({
                success: true,
                message: 'Sales order cancelled successfully'
            });

        } catch (error) {
            console.error('Error deleting sales order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete sales order',
                error: error.message
            });
        }
    },

    getPendingOrdersForPayment: async (req, res) => {
        try {
            const { companyId, customerId } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const filter = {
                companyId,
                'payment.pendingAmount': { $gt: 0 },
                status: { $nin: ['cancelled', 'rejected'] }
            };

            if (customerId) {
                filter.customer = customerId;
            }

            const pendingOrders = await SalesOrder.find(filter)
                .populate('customer', 'name mobile email businessName')
                .select('orderNumber orderDate orderType totals payment customer status')
                .sort({ orderDate: -1 });

            console.log(`Found ${pendingOrders.length} pending orders for payment`);

            res.status(200).json({
                success: true,
                data: pendingOrders,
                message: `Found ${pendingOrders.length} pending orders`
            });

        } catch (error) {
            console.error('Error getting pending orders:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get pending orders',
                error: error.message
            });
        }
    },

    getCustomerPendingDocuments: async (req, res) => {
        try {
            const { customerId, companyId } = req.query;

            if (!customerId || !companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID and Company ID are required'
                });
            }

            // Get pending sales orders
            const pendingOrders = await SalesOrder.find({
                customer: customerId,
                companyId,
                'payment.pendingAmount': { $gt: 0 },
                status: { $nin: ['cancelled', 'rejected'] }
            }).select('orderNumber orderDate orderType totals payment status');

            // Get pending invoices
            const pendingInvoices = await Sale.find({
                customer: customerId,
                companyId,
                'payment.pendingAmount': { $gt: 0 },
                status: { $ne: 'cancelled' }
            }).select('invoiceNumber invoiceDate invoiceType totals payment status');

            const documents = [
                ...pendingOrders.map(order => ({
                    id: order._id,
                    type: 'sales_order',
                    number: order.orderNumber,
                    date: order.orderDate,
                    total: order.totals.finalTotal,
                    paid: order.payment.paidAmount,
                    pending: order.payment.pendingAmount,
                    status: order.status,
                    subType: order.orderType
                })),
                ...pendingInvoices.map(invoice => ({
                    id: invoice._id,
                    type: 'sale',
                    number: invoice.invoiceNumber,
                    date: invoice.invoiceDate,
                    total: invoice.totals.finalTotal,
                    paid: invoice.payment.paidAmount,
                    pending: invoice.payment.pendingAmount,
                    status: invoice.status,
                    subType: invoice.invoiceType
                }))
            ];

            // Sort by date descending
            documents.sort((a, b) => new Date(b.date) - new Date(a.date));

            console.log(`Found ${documents.length} pending documents for customer ${customerId}`);

            res.status(200).json({
                success: true,
                data: documents,
                message: `Found ${documents.length} pending documents`
            });

        } catch (error) {
            console.error('Error getting customer pending documents:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get customer pending documents',
                error: error.message
            });
        }
    },

    generateOrderNumber: async (req, res) => {
        try {
            const { companyId, orderType = 'quotation' } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            const todayStart = new Date(year, date.getMonth(), date.getDate());
            const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

            const prefix = orderType === 'quotation' ? 'QUO' :
                orderType === 'sales_order' ? 'SO' : 'PI';

            const lastOrder = await SalesOrder.findOne({
                companyId,
                orderDate: { $gte: todayStart, $lt: todayEnd },
                orderNumber: new RegExp(`^${prefix}-${year}${month}${day}`)
            }).sort({ orderNumber: -1 });

            let sequence = 1;
            if (lastOrder) {
                const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
                sequence = lastSequence + 1;
            }

            const nextOrderNumber = `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;

            res.status(200).json({
                success: true,
                data: {
                    nextOrderNumber,
                    orderType,
                    date: new Date().toISOString().split('T')[0]
                }
            });

        } catch (error) {
            console.error('Error generating order number:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate order number',
                error: error.message
            });
        }
    },

    getExpiredOrders: async (req, res) => {
        try {
            const { companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const today = new Date();

            const expiredOrders = await SalesOrder.find({
                companyId,
                validUntil: { $lt: today },
                status: { $nin: ['converted', 'cancelled', 'expired'] }
            })
                .populate('customer', 'name mobile email')
                .sort({ validUntil: 1 });

            console.log(`Found ${expiredOrders.length} expired orders for company ${companyId}`);

            res.status(200).json({
                success: true,
                data: expiredOrders,
                message: `Found ${expiredOrders.length} expired orders`
            });

        } catch (error) {
            console.error('Error getting expired orders:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get expired orders',
                error: error.message
            });
        }
    },

    getDashboardSummary: async (req, res) => {
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

            const [
                totalSummary,
                monthlySummary,
                statusSummary,
                expiredCount,
                pendingPayments
            ] = await Promise.all([
                // Total summary
                SalesOrder.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: 1 },
                            totalValue: { $sum: '$totals.finalTotal' },
                            totalPaid: { $sum: '$payment.paidAmount' },
                            totalPending: { $sum: '$payment.pendingAmount' }
                        }
                    }
                ]),

                // Monthly summary
                SalesOrder.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            orderDate: { $gte: startOfMonth },
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            monthlyOrders: { $sum: 1 },
                            monthlyValue: { $sum: '$totals.finalTotal' }
                        }
                    }
                ]),

                // Status summary
                SalesOrder.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId)
                        }
                    },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                            value: { $sum: '$totals.finalTotal' }
                        }
                    }
                ]),

                // Expired orders count
                SalesOrder.countDocuments({
                    companyId,
                    validUntil: { $lt: today },
                    status: { $nin: ['converted', 'cancelled', 'expired'] }
                }),

                // Pending payments summary
                SalesOrder.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            'payment.pendingAmount': { $gt: 0 },
                            status: { $nin: ['cancelled', 'rejected'] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            pendingPaymentOrders: { $sum: 1 },
                            pendingPaymentAmount: { $sum: '$payment.pendingAmount' }
                        }
                    }
                ])
            ]);

            const summary = {
                total: totalSummary[0] || { totalOrders: 0, totalValue: 0, totalPaid: 0, totalPending: 0 },
                monthly: monthlySummary[0] || { monthlyOrders: 0, monthlyValue: 0 },
                byStatus: statusSummary.reduce((acc, item) => {
                    acc[item._id] = { count: item.count, value: item.value };
                    return acc;
                }, {}),
                expiredCount,
                pendingPayments: pendingPayments[0] || { pendingPaymentOrders: 0, pendingPaymentAmount: 0 }
            };

            res.status(200).json({
                success: true,
                data: summary,
                message: 'Dashboard summary retrieved successfully'
            });

        } catch (error) {
            console.error('Error getting dashboard summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard summary',
                error: error.message
            });
        }
    }
};

module.exports = salesOrderController;