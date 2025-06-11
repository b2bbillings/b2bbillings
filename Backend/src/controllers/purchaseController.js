const Purchase = require('../models/Purchase');
const Item = require('../models/Item');
const Party = require('../models/Party');
const BankAccount = require('../models/BankAccount');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// ✅ HELPER FUNCTION: Generate Purchase Number
async function generatePurchaseNumber(companyId, gstEnabled) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const todayStart = new Date(year, date.getMonth(), date.getDate());
    const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

    const prefix = gstEnabled ? 'PUR-GST' : 'PUR';
    const dateStr = `${year}${month}${day}`;

    try {
        const lastPurchase = await Purchase.findOne({
            companyId,
            purchaseDate: { $gte: todayStart, $lt: todayEnd },
            purchaseNumber: new RegExp(`^${prefix}-${dateStr}`)
        }).sort({ purchaseNumber: -1 });

        let sequence = 1;
        if (lastPurchase) {
            const parts = lastPurchase.purchaseNumber.split('-');
            const lastSequence = parseInt(parts[parts.length - 1]);
            sequence = lastSequence + 1;
        }

        return `${prefix}-${dateStr}-${String(sequence).padStart(4, '0')}`;
    } catch (error) {
        console.error('Error generating purchase number:', error);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${dateStr}-${random}`;
    }
}

// ✅ HELPER FUNCTION: Get Valid User ID
function getValidUserId(userId, requestUser) {
    // Try to get user ID from various sources
    const potentialUserId = userId || requestUser?.id || requestUser?._id;

    // If we have a valid ObjectId, use it
    if (potentialUserId && mongoose.Types.ObjectId.isValid(potentialUserId)) {
        return potentialUserId;
    }

    // Generate a system ObjectId as fallback
    return new mongoose.Types.ObjectId('000000000000000000000000'); // System user ObjectId
}

// ✅ FIXED: Payment method mapping to match Purchase model enum values
function getValidPaymentMethod(paymentMethod) {
    const paymentMethodMap = {
        'cash': 'cash',
        'Cash': 'cash',
        'CASH': 'cash',

        // ✅ CORRECTED: Map all bank variations to 'bank_transfer' (as per your model)
        'bank': 'bank_transfer',           // ✅ This was the issue!
        'Bank': 'bank_transfer',
        'BANK': 'bank_transfer',
        'Bank Account': 'bank_transfer',   // ✅ Map "Bank Account" to "bank_transfer"
        'bank_account': 'bank_transfer',
        'BankAccount': 'bank_transfer',
        'bank_transfer': 'bank_transfer',  // ✅ Direct mapping
        'bank transfer': 'bank_transfer',
        'banking': 'bank_transfer',
        'wire_transfer': 'bank_transfer',
        'wire transfer': 'bank_transfer',

        'cheque': 'cheque',
        'Cheque': 'cheque',
        'CHEQUE': 'cheque',
        'check': 'cheque',

        'upi': 'upi',
        'UPI': 'upi',
        'Upi': 'upi',

        'card': 'card',
        'Card': 'card',
        'CARD': 'card',
        'credit_card': 'card',
        'debit_card': 'card',
        'credit card': 'card',
        'debit card': 'card',

        // ✅ Note: Your model doesn't have 'online' - mapping to 'bank_transfer'
        'online': 'bank_transfer',
        'Online': 'bank_transfer',
        'ONLINE': 'bank_transfer',
        'net_banking': 'bank_transfer',
        'netbanking': 'bank_transfer',
        'net banking': 'bank_transfer',

        'credit': 'credit',
        'Credit': 'credit',
        'CREDIT': 'credit'
    };

    const mappedMethod = paymentMethodMap[paymentMethod] || 'cash';

    console.log('💳 Backend payment method mapping (FIXED):', {
        original: paymentMethod,
        mapped: mappedMethod,
        isValid: !!paymentMethodMap[paymentMethod],
        modelEnums: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit'] // ✅ Your actual model enums
    });

    return mappedMethod;
}
const purchaseController = {

    // ✅ COMPLETE UPDATED: createPurchase function with duplicate phone number handling
    createPurchase: async (req, res) => {
        try {
            console.log('🛒 =================================');
            console.log('🛒 PURCHASE CREATION STARTED');
            console.log('🛒 =================================');
            console.log('📥 Raw request body:', JSON.stringify(req.body, null, 2));

            // ✅ Test database connection first
            const dbState = mongoose.connection.readyState;
            if (dbState !== 1) {
                console.error('❌ Database not connected!');
                return res.status(500).json({
                    success: false,
                    message: 'Database connection error'
                });
            }

            const {
                supplierName, supplierMobile, supplier, purchaseNumber, purchaseDate,
                gstEnabled = true, companyId, items, payment, notes, termsAndConditions,
                roundOff = 0, status = 'draft', userId, createdBy, bankAccountId,
                paymentMethod = 'cash', customerName, customer, finalTotal, subtotal,
                totalDiscount, totalTax, totalCGST, totalSGST, totalIGST, paidAmount,
                pendingAmount, paymentInfo, totals, partyType, partyName, partyId,
                paymentReceived, purchaseType, invoiceNumber, invoiceDate,
                selectedSupplier, selectedCustomer
            } = req.body;

            // ✅ Use company ID from params if not in body
            const effectiveCompanyId = companyId || req.params?.companyId;

            // ✅ CRITICAL: Validate required fields first
            if (!effectiveCompanyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Items array is required and must not be empty'
                });
            }

            // ✅ FIXED: Get valid user IDs for party creation
            const validUserId = getValidUserId(userId || createdBy, req.user);
            const validCreatedBy = getValidUserId(createdBy || userId, req.user);

            console.log('👤 User ID validation:', {
                validUserId: validUserId,
                validCreatedBy: validCreatedBy
            });

            // ✅ ENHANCED: Party processing with duplicate phone number handling
            let supplierRecord = null;
            let customerRecord = null;
            let primaryParty = null;

            // Process supplier information
            const effectiveSupplierName = supplierName || selectedSupplier?.name || selectedSupplier?.businessName || partyName;
            const effectiveSupplierMobile = supplierMobile || selectedSupplier?.mobile || selectedSupplier?.phoneNumber;
            const effectiveSupplier = supplier || selectedSupplier?._id || selectedSupplier?.id || partyId;

            if (effectiveSupplier && mongoose.Types.ObjectId.isValid(effectiveSupplier)) {
                supplierRecord = await Party.findById(effectiveSupplier);
            } else if (effectiveSupplierName && effectiveSupplierName.trim()) {
                // ✅ ENHANCED: Try multiple search strategies to find existing supplier

                // Strategy 1: Search by name first
                supplierRecord = await Party.findOne({
                    companyId: effectiveCompanyId,
                    name: { $regex: new RegExp(`^${effectiveSupplierName.trim()}$`, 'i') },
                    $or: [{ type: 'supplier' }, { type: 'both' }]
                });

                // Strategy 2: If not found by name and mobile provided, search by mobile
                if (!supplierRecord && effectiveSupplierMobile) {
                    supplierRecord = await Party.findOne({
                        companyId: effectiveCompanyId,
                        $or: [
                            { mobile: effectiveSupplierMobile },
                            { phoneNumber: effectiveSupplierMobile }
                        ],
                        $or: [{ type: 'supplier' }, { type: 'both' }]
                    });

                    // If found by mobile but different name, update the name
                    if (supplierRecord && supplierRecord.name !== effectiveSupplierName.trim()) {
                        console.log(`📝 Updating supplier name from "${supplierRecord.name}" to "${effectiveSupplierName.trim()}"`);
                        supplierRecord.name = effectiveSupplierName.trim();
                        supplierRecord.lastModifiedBy = validCreatedBy;
                        await supplierRecord.save();
                    }
                }

                // Strategy 3: If still not found, create new supplier
                if (!supplierRecord) {
                    try {
                        console.log('🆕 Creating new supplier:', {
                            name: effectiveSupplierName.trim(),
                            mobile: effectiveSupplierMobile
                        });

                        supplierRecord = new Party({
                            companyId: effectiveCompanyId,
                            name: effectiveSupplierName.trim(),
                            mobile: effectiveSupplierMobile || '',
                            phoneNumber: effectiveSupplierMobile || '',
                            type: customerName ? 'supplier' : 'both',
                            email: '',
                            address: {
                                street: '',
                                city: '',
                                state: '',
                                pincode: '',
                                country: 'India'
                            },
                            gstNumber: '',
                            createdBy: validCreatedBy,
                            userId: validUserId,
                            lastModifiedBy: validCreatedBy
                        });
                        await supplierRecord.save();
                        console.log('✅ New supplier created with ID:', supplierRecord._id);

                    } catch (supplierCreateError) {
                        console.error('❌ Error creating supplier:', supplierCreateError);

                        // ✅ HANDLE DUPLICATE KEY ERROR
                        if (supplierCreateError.code === 11000) {
                            console.log('🔍 Duplicate phone number detected, searching for existing party...');

                            // Find the existing party with this phone number
                            supplierRecord = await Party.findOne({
                                companyId: effectiveCompanyId,
                                $or: [
                                    { mobile: effectiveSupplierMobile },
                                    { phoneNumber: effectiveSupplierMobile }
                                ]
                            });

                            if (supplierRecord) {
                                console.log('✅ Found existing party with same phone:', {
                                    id: supplierRecord._id,
                                    name: supplierRecord.name,
                                    type: supplierRecord.type,
                                    mobile: supplierRecord.mobile
                                });

                                // Update party type if needed
                                if (supplierRecord.type === 'customer') {
                                    supplierRecord.type = 'both';
                                    supplierRecord.lastModifiedBy = validCreatedBy;
                                    await supplierRecord.save();
                                    console.log('📝 Updated party type to "both"');
                                }

                                // Update name if different
                                if (supplierRecord.name !== effectiveSupplierName.trim()) {
                                    console.log(`📝 Updating party name from "${supplierRecord.name}" to "${effectiveSupplierName.trim()}"`);
                                    supplierRecord.name = effectiveSupplierName.trim();
                                    supplierRecord.lastModifiedBy = validCreatedBy;
                                    await supplierRecord.save();
                                }
                            } else {
                                // This shouldn't happen, but handle it gracefully
                                return res.status(400).json({
                                    success: false,
                                    message: `A party with phone number ${effectiveSupplierMobile} already exists but could not be found. Please check the data.`
                                });
                            }
                        } else {
                            // Re-throw other errors
                            throw supplierCreateError;
                        }
                    }
                }
            }

            // ✅ ENHANCED: Process customer information with same duplicate handling
            const effectiveCustomerName = customerName || selectedCustomer?.name || selectedCustomer?.businessName;
            const effectiveCustomerMobile = selectedCustomer?.mobile || selectedCustomer?.phoneNumber;
            const effectiveCustomer = customer || selectedCustomer?._id || selectedCustomer?.id;

            if (effectiveCustomer && mongoose.Types.ObjectId.isValid(effectiveCustomer)) {
                customerRecord = await Party.findById(effectiveCustomer);
            } else if (effectiveCustomerName && effectiveCustomerName.trim()) {

                // Strategy 1: Search by name first
                customerRecord = await Party.findOne({
                    companyId: effectiveCompanyId,
                    name: { $regex: new RegExp(`^${effectiveCustomerName.trim()}$`, 'i') },
                    $or: [{ type: 'customer' }, { type: 'both' }]
                });

                // Strategy 2: If not found by name and mobile provided, search by mobile
                if (!customerRecord && effectiveCustomerMobile) {
                    customerRecord = await Party.findOne({
                        companyId: effectiveCompanyId,
                        $or: [
                            { mobile: effectiveCustomerMobile },
                            { phoneNumber: effectiveCustomerMobile }
                        ],
                        $or: [{ type: 'customer' }, { type: 'both' }]
                    });

                    // If found by mobile but different name, update the name
                    if (customerRecord && customerRecord.name !== effectiveCustomerName.trim()) {
                        console.log(`📝 Updating customer name from "${customerRecord.name}" to "${effectiveCustomerName.trim()}"`);
                        customerRecord.name = effectiveCustomerName.trim();
                        customerRecord.lastModifiedBy = validCreatedBy;
                        await customerRecord.save();
                    }
                }

                // Strategy 3: If still not found, create new customer
                if (!customerRecord) {
                    try {
                        console.log('🆕 Creating new customer:', {
                            name: effectiveCustomerName.trim(),
                            mobile: effectiveCustomerMobile
                        });

                        customerRecord = new Party({
                            companyId: effectiveCompanyId,
                            name: effectiveCustomerName.trim(),
                            mobile: effectiveCustomerMobile || '',
                            phoneNumber: effectiveCustomerMobile || '',
                            type: supplierRecord ? 'customer' : 'both',
                            email: '',
                            address: {
                                street: '',
                                city: '',
                                state: '',
                                pincode: '',
                                country: 'India'
                            },
                            gstNumber: '',
                            createdBy: validCreatedBy,
                            userId: validUserId,
                            lastModifiedBy: validCreatedBy
                        });
                        await customerRecord.save();
                        console.log('✅ New customer created with ID:', customerRecord._id);

                    } catch (customerCreateError) {
                        console.error('❌ Error creating customer:', customerCreateError);

                        // ✅ HANDLE DUPLICATE KEY ERROR for customer
                        if (customerCreateError.code === 11000) {
                            console.log('🔍 Duplicate customer phone number detected, searching for existing party...');

                            // Find the existing party with this phone number
                            customerRecord = await Party.findOne({
                                companyId: effectiveCompanyId,
                                $or: [
                                    { mobile: effectiveCustomerMobile },
                                    { phoneNumber: effectiveCustomerMobile }
                                ]
                            });

                            if (customerRecord) {
                                console.log('✅ Found existing party with same phone for customer:', {
                                    id: customerRecord._id,
                                    name: customerRecord.name,
                                    type: customerRecord.type,
                                    mobile: customerRecord.mobile
                                });

                                // Update party type if needed
                                if (customerRecord.type === 'supplier') {
                                    customerRecord.type = 'both';
                                    customerRecord.lastModifiedBy = validCreatedBy;
                                    await customerRecord.save();
                                    console.log('📝 Updated customer party type to "both"');
                                }

                                // Update name if different
                                if (customerRecord.name !== effectiveCustomerName.trim()) {
                                    console.log(`📝 Updating customer party name from "${customerRecord.name}" to "${effectiveCustomerName.trim()}"`);
                                    customerRecord.name = effectiveCustomerName.trim();
                                    customerRecord.lastModifiedBy = validCreatedBy;
                                    await customerRecord.save();
                                }
                            } else {
                                // This shouldn't happen, but handle it gracefully
                                return res.status(400).json({
                                    success: false,
                                    message: `A party with phone number ${effectiveCustomerMobile} already exists but could not be found. Please check the data.`
                                });
                            }
                        } else {
                            // Re-throw other errors
                            throw customerCreateError;
                        }
                    }
                }
            }

            // ✅ ENHANCED: Determine primary party with better logic
            if (partyType === 'customer' && customerRecord) {
                primaryParty = customerRecord;
            } else if (partyType === 'supplier' && supplierRecord) {
                primaryParty = supplierRecord;
            } else if (supplierRecord) {
                primaryParty = supplierRecord;
            } else if (customerRecord) {
                primaryParty = customerRecord;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'No valid supplier or customer provided. Please provide valid party information.'
                });
            }

            console.log('✅ Party processing completed:', {
                primaryParty: {
                    id: primaryParty._id,
                    name: primaryParty.name,
                    type: primaryParty.type,
                    mobile: primaryParty.mobile
                },
                hasSupplier: !!supplierRecord,
                hasCustomer: !!customerRecord
            });

            // ✅ Process and validate items
            const processedItems = [];
            let itemsSubtotal = 0;
            let itemsTotalTax = 0;
            let itemsTotalCGST = 0;
            let itemsTotalSGST = 0;
            let itemsTotalIGST = 0;
            let itemsTotalDiscount = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                if (!item.itemName || item.itemName.trim() === '') {
                    continue;
                }

                const quantity = parseFloat(item.quantity) || 0;
                const pricePerUnit = parseFloat(item.pricePerUnit) || parseFloat(item.price) || 0;

                if (quantity <= 0 || pricePerUnit <= 0) {
                    continue;
                }

                // Calculate item totals
                const itemAmount = quantity * pricePerUnit;
                const discountAmount = parseFloat(item.discountAmount) || 0;
                const discountPercent = parseFloat(item.discountPercent || item.discountPercentage) || 0;

                let finalDiscountAmount = discountAmount;
                if (discountAmount === 0 && discountPercent > 0) {
                    finalDiscountAmount = (itemAmount * discountPercent) / 100;
                }

                const afterDiscount = itemAmount - finalDiscountAmount;

                // Tax calculations
                const taxRate = parseFloat(item.taxRate) || 0;
                let cgstAmount = parseFloat(item.cgst || item.cgstAmount) || 0;
                let sgstAmount = parseFloat(item.sgst || item.sgstAmount) || 0;
                let igstAmount = parseFloat(item.igst || item.igstAmount) || 0;

                if (gstEnabled && taxRate > 0 && cgstAmount === 0 && sgstAmount === 0 && igstAmount === 0) {
                    cgstAmount = (afterDiscount * (taxRate / 2)) / 100;
                    sgstAmount = (afterDiscount * (taxRate / 2)) / 100;
                }

                const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
                const finalItemAmount = afterDiscount + totalTaxAmount;

                // Process item reference
                let itemRef = null;
                if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
                    itemRef = item.itemRef;
                } else if (item.selectedItem && item.selectedItem._id) {
                    itemRef = item.selectedItem._id;
                }

                const processedItem = {
                    itemRef: itemRef,
                    itemName: item.itemName.trim(),
                    hsnCode: item.hsnCode || item.hsn || '0000',
                    description: item.description || '',
                    quantity: quantity,
                    unit: item.unit || 'PCS',
                    pricePerUnit: pricePerUnit,
                    itemAmount: itemAmount,
                    discountPercentage: discountPercent,
                    discountAmount: finalDiscountAmount,
                    taxRate: taxRate,
                    cgstRate: parseFloat(item.cgstRate) || 0,
                    sgstRate: parseFloat(item.sgstRate) || 0,
                    igstRate: parseFloat(item.igstRate) || 0,
                    cgstAmount: cgstAmount,
                    sgstAmount: sgstAmount,
                    igstAmount: igstAmount,
                    totalTaxAmount: totalTaxAmount,
                    finalAmount: finalItemAmount,
                    taxMode: item.taxMode || 'with-tax',
                    lineNumber: i + 1
                };

                processedItems.push(processedItem);

                // Update totals
                itemsSubtotal += afterDiscount;
                itemsTotalTax += totalTaxAmount;
                itemsTotalCGST += cgstAmount;
                itemsTotalSGST += sgstAmount;
                itemsTotalIGST += igstAmount;
                itemsTotalDiscount += finalDiscountAmount;
            }

            if (processedItems.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid items found. Please check item details.'
                });
            }

            // ✅ Prepare totals
            const calculatedSubtotal = itemsSubtotal;
            const calculatedTotalTax = itemsTotalTax;
            const calculatedTotalDiscount = itemsTotalDiscount;
            const roundOffAmount = parseFloat(roundOff) || 0;
            const calculatedFinalTotal = calculatedSubtotal + calculatedTotalTax + roundOffAmount;

            const finalTotals = {
                subtotal: totals?.subtotal || subtotal || calculatedSubtotal,
                totalDiscount: totals?.totalDiscount || totalDiscount || calculatedTotalDiscount,
                totalTax: totals?.totalTax || totalTax || calculatedTotalTax,
                totalCGST: totals?.totalCGST || totalCGST || itemsTotalCGST,
                totalSGST: totals?.totalSGST || totalSGST || itemsTotalSGST,
                totalIGST: totals?.totalIGST || totalIGST || itemsTotalIGST,
                roundOff: roundOffAmount,
                finalTotal: totals?.finalTotal || finalTotal || calculatedFinalTotal
            };

            // ✅ FIXED: Payment processing with mapped payment method
            const paymentAmountFromInfo = parseFloat(paymentInfo?.amount) || 0;
            const paymentAmountDirect = parseFloat(paidAmount) || 0;
            const paymentAmountReceived = parseFloat(paymentReceived) || 0;
            const actualPaidAmount = Math.max(paymentAmountFromInfo, paymentAmountDirect, paymentAmountReceived);

            const paymentDetails = {
                method: getValidPaymentMethod(paymentInfo?.paymentType || paymentInfo?.method || paymentMethod || 'cash'), // ✅ Use mapping
                status: actualPaidAmount >= finalTotals.finalTotal ? 'paid' :
                    (actualPaidAmount > 0 ? 'partial' : 'pending'),
                paidAmount: actualPaidAmount,
                pendingAmount: Math.max(0, finalTotals.finalTotal - actualPaidAmount),
                paymentDate: payment?.paymentDate || paymentInfo?.paymentDate || purchaseDate || new Date(),
                dueDate: payment?.dueDate || paymentInfo?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                reference: payment?.reference || paymentInfo?.reference || '',
                chequeNumber: payment?.chequeNumber || paymentInfo?.chequeNumber || '',
                chequeDate: payment?.chequeDate || paymentInfo?.chequeDate || null,
                upiTransactionId: payment?.upiTransactionId || paymentInfo?.upiTransactionId || '',
                bankTransactionId: payment?.bankTransactionId || paymentInfo?.bankTransactionId || ''
            };

            console.log('💳 Payment details prepared:', {
                originalMethod: paymentInfo?.paymentType || paymentInfo?.method || paymentMethod,
                mappedMethod: paymentDetails.method,
                actualPaidAmount,
                finalTotal: finalTotals.finalTotal
            });

            // ✅ Create purchase object with valid user IDs
            const effectivePurchaseNumber = purchaseNumber || invoiceNumber || await generatePurchaseNumber(effectiveCompanyId, gstEnabled);
            const effectivePurchaseDate = purchaseDate || invoiceDate || new Date();

            const purchaseData = {
                purchaseNumber: effectivePurchaseNumber,
                purchaseDate: new Date(effectivePurchaseDate),
                purchaseType: purchaseType || (gstEnabled ? 'gst' : 'non-gst'),
                supplier: supplierRecord ? supplierRecord._id : primaryParty._id,
                supplierMobile: effectiveSupplierMobile || supplierRecord?.mobile || primaryParty?.mobile || '',
                ...(customerRecord && { customer: customerRecord._id }),
                gstEnabled: Boolean(gstEnabled),
                companyId: effectiveCompanyId,
                items: processedItems,
                totals: finalTotals,
                payment: paymentDetails,
                notes: notes || '',
                termsAndConditions: termsAndConditions || '',
                status: status || 'draft',
                receivingStatus: 'pending',
                createdBy: validCreatedBy, // ✅ Use valid ObjectId
                lastModifiedBy: validCreatedBy, // ✅ Use valid ObjectId
                metadata: {
                    source: 'purchase_form',
                    partyType: partyType || 'supplier',
                    hasCustomer: !!customerRecord,
                    hasSupplier: !!supplierRecord,
                    itemsCount: processedItems.length,
                    gstEnabled: gstEnabled,
                    hasPayment: actualPaidAmount > 0,
                    createdVia: 'api',
                    version: '2.0'
                }
            };

            // ✅ Create and save the purchase
            console.log('💾 Saving purchase to database...');
            console.log('📝 Purchase object created, calling save()...');

            const purchase = new Purchase(purchaseData);
            const savedPurchase = await purchase.save();

            console.log('✅ Purchase saved successfully with ID:', savedPurchase._id);

            // ✅ Populate party details for response
            await savedPurchase.populate('supplier', 'name mobile email address type gstNumber');
            if (customerRecord) {
                await savedPurchase.populate('customer', 'name mobile email address type gstNumber');
            }

            // ✅ Handle bank transaction creation if payment was made
            if (paymentDetails.paidAmount > 0 && bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
                try {
                    console.log('💰 Creating bank transaction for payment:', paymentDetails.paidAmount);

                    const bankAccount = await BankAccount.findOne({
                        _id: bankAccountId,
                        companyId: effectiveCompanyId
                    });

                    if (bankAccount) {
                        const previousBalance = parseFloat(bankAccount.currentBalance) || 0;
                        const paymentAmount = parseFloat(paymentDetails.paidAmount);
                        const newBalance = previousBalance - paymentAmount;

                        // Create transaction record
                        const transactionData = {
                            companyId: effectiveCompanyId,
                            bankAccountId: bankAccountId,
                            transactionType: 'purchase_payment',
                            direction: 'out',
                            amount: paymentAmount,
                            description: `Purchase payment for ${savedPurchase.purchaseNumber}`,
                            reference: savedPurchase.purchaseNumber,
                            partyType: 'supplier',
                            partyId: supplierRecord?._id || primaryParty._id,
                            partyName: supplierRecord?.name || primaryParty.name,
                            referenceType: 'purchase',
                            referenceId: savedPurchase._id,
                            paymentMethod: getValidPaymentMethod(paymentDetails.method), // ✅ Use mapping
                            status: 'completed',
                            notes: `Payment made to ${supplierRecord?.name || primaryParty.name} for purchase ${savedPurchase.purchaseNumber}`,
                            chequeNumber: paymentDetails.chequeNumber || '',
                            chequeDate: paymentDetails.chequeDate || null,
                            upiTransactionId: paymentDetails.upiTransactionId || '',
                            bankTransactionId: paymentDetails.bankTransactionId || '',
                            transactionDate: new Date(purchaseData.purchaseDate),
                            createdBy: validCreatedBy // ✅ Use valid ObjectId
                        };

                        const transaction = new Transaction(transactionData);
                        await transaction.save();

                        console.log('✅ Bank transaction created with ID:', transaction._id);

                        // Update bank account balance
                        await BankAccount.findByIdAndUpdate(
                            bankAccountId,
                            {
                                $set: {
                                    currentBalance: parseFloat(newBalance.toFixed(2)),
                                    lastTransactionDate: new Date(),
                                    lastModified: new Date(),
                                    lastModifiedBy: validCreatedBy // ✅ Use valid ObjectId
                                }
                            },
                            { new: true, runValidators: true }
                        );

                        console.log('✅ Bank account balance updated:', {
                            previousBalance: previousBalance,
                            paymentAmount: paymentAmount,
                            newBalance: newBalance
                        });

                        savedPurchase._doc.bankTransaction = {
                            transactionId: transaction._id,
                            bankAccountId: bankAccountId,
                            amount: paymentAmount,
                            previousBalance: previousBalance,
                            newBalance: newBalance,
                            transactionType: 'purchase_payment',
                            direction: 'out',
                            status: 'completed'
                        };
                    } else {
                        console.warn('⚠️ Bank account not found or does not belong to company');
                    }
                } catch (transactionError) {
                    console.error('❌ Error creating bank transaction:', transactionError);
                    savedPurchase._doc.transactionError = transactionError.message;
                }
            }

            // ✅ Update item stock (ADD to stock for purchase)
            console.log('📦 Updating item stock for purchase...');
            for (const item of processedItems) {
                if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
                    try {
                        await Item.findByIdAndUpdate(
                            item.itemRef,
                            {
                                $inc: { currentStock: item.quantity },
                                $set: { lastModified: new Date() }
                            },
                            { new: true }
                        );
                        console.log(`✅ Stock updated for item ${item.itemName}: +${item.quantity}`);
                    } catch (stockError) {
                        console.warn(`⚠️ Could not update stock for item ${item.itemName}:`, stockError.message);
                    }
                }
            }

            console.log('🛒 =================================');
            console.log('🛒 PURCHASE CREATION COMPLETED');
            console.log('🛒 =================================');

            res.status(201).json({
                success: true,
                message: 'Purchase created successfully' +
                    (savedPurchase._doc.bankTransaction ? ' with bank transaction' : ''),
                data: {
                    purchase: savedPurchase,
                    bill: {
                        purchaseNumber: savedPurchase.purchaseNumber,
                        purchaseDate: savedPurchase.purchaseDate,
                        supplier: {
                            name: supplierRecord?.name || primaryParty?.name,
                            mobile: supplierRecord?.mobile || primaryParty?.mobile
                        },
                        ...(customerRecord && {
                            customer: {
                                name: customerRecord.name,
                                mobile: customerRecord.mobile
                            }
                        }),
                        totals: savedPurchase.totals,
                        payment: savedPurchase.payment
                    },
                    ...(savedPurchase._doc.bankTransaction && {
                        bankTransaction: savedPurchase._doc.bankTransaction
                    })
                }
            });

        } catch (error) {
            console.error('❌ =================================');
            console.error('❌ PURCHASE CREATION FAILED');
            console.error('❌ =================================');
            console.error('❌ Error creating purchase:', error);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error code:', error.code);

            const errorResponse = {
                success: false,
                message: 'Failed to create purchase',
                error: error.message
            };

            if (error.code === 11000) {
                // ✅ ENHANCED: Better duplicate key error handling
                if (error.keyPattern && error.keyPattern.phoneNumber) {
                    errorResponse.message = `A party with phone number ${error.keyValue.phoneNumber} already exists for this company. The system will use the existing party.`;
                    errorResponse.suggestion = 'Please try the request again, or check existing parties.';
                } else if (error.keyPattern && error.keyPattern.purchaseNumber) {
                    errorResponse.message = `Purchase number ${error.keyValue.purchaseNumber} already exists. Please use a different purchase number.`;
                } else {
                    errorResponse.message = 'Duplicate data detected. Please check if this purchase or party already exists.';
                }
            } else if (error.name === 'ValidationError') {
                errorResponse.message = 'Purchase data validation failed';
                errorResponse.validationErrors = Object.keys(error.errors).map(key => ({
                    field: key,
                    message: error.errors[key].message
                }));
            } else if (error.name === 'CastError') {
                errorResponse.message = 'Invalid data format provided';
                errorResponse.error = `Invalid ${error.path}: ${error.value}`;
            }

            const statusCode = error.code === 11000 ? 409 :
                error.name === 'ValidationError' ? 400 :
                    error.name === 'CastError' ? 400 : 500;

            res.status(statusCode).json(errorResponse);
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

            console.log('🔍 Getting purchases with filters:', {
                page, limit, companyId, supplier, status, search
            });

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

            // Calculate summary using correct field names
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

            console.log('✅ Found purchases:', {
                count: purchases.length,
                total: totalPurchases,
                pages: totalPages
            });

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
            console.error('❌ Error getting purchases:', error);
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

            // Check if purchase has markAsOrdered method, if not update manually
            if (typeof purchase.markAsOrdered === 'function') {
                await purchase.markAsOrdered();
            } else {
                purchase.status = 'ordered';
                purchase.lastModifiedBy = req.user?.id || 'system';
                await purchase.save();
            }

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

            // Check if purchase has markAsReceived method, if not update manually
            if (typeof purchase.markAsReceived === 'function') {
                await purchase.markAsReceived();
            } else {
                purchase.status = 'received';
                purchase.receivingStatus = 'received';
                purchase.lastModifiedBy = req.user?.id || 'system';
                await purchase.save();
            }

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

            // Check if purchase has markAsCompleted method, if not update manually
            if (typeof purchase.markAsCompleted === 'function') {
                await purchase.markAsCompleted();
            } else {
                purchase.status = 'completed';
                purchase.lastModifiedBy = req.user?.id || 'system';
                await purchase.save();
            }

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

    // ✅ UPDATED: addPayment function with fixes
    addPayment: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                amount,
                method = 'cash',
                reference = '',
                bankAccountId,
                chequeNumber = '',
                chequeDate = null,
                upiTransactionId = '',
                bankTransactionId = ''
            } = req.body;

            console.log('💳 Adding payment to purchase:', {
                purchaseId: id,
                amount: amount,
                method: method,
                bankAccountId: bankAccountId
            });

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

            const purchase = await Purchase.findById(id).populate('supplier', 'name mobile email');
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase not found'
                });
            }

            // Calculate current balance
            const currentBalance = purchase.totals.finalTotal - purchase.payment.paidAmount;

            if (amount > currentBalance) {
                return res.status(400).json({
                    success: false,
                    message: `Payment amount cannot exceed balance amount of ₹${currentBalance}`
                });
            }

            // ✅ Get valid user ID
            const validUserId = getValidUserId(req.user?.id, req.user);

            // ✅ Parse amount properly
            const paymentAmount = parseFloat(amount);

            const newPaidAmount = purchase.payment.paidAmount + paymentAmount;
            const newPendingAmount = purchase.totals.finalTotal - newPaidAmount;

            purchase.payment.paidAmount = newPaidAmount;
            purchase.payment.pendingAmount = newPendingAmount;
            purchase.payment.method = getValidPaymentMethod(method); // ✅ Use mapping
            purchase.payment.reference = reference;

            // Update payment status
            if (newPendingAmount <= 0) {
                purchase.payment.status = 'paid';
                purchase.payment.pendingAmount = 0;
            } else {
                purchase.payment.status = 'partial';
            }

            purchase.lastModifiedBy = validUserId; // ✅ Use valid ObjectId

            // ✅ Save purchase first
            await purchase.save();

            // ✅ Create bank transaction if bank account is provided
            let bankTransactionResult = null;

            if (bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
                try {
                    const bankAccount = await BankAccount.findOne({
                        _id: bankAccountId,
                        companyId: purchase.companyId
                    });

                    if (bankAccount) {
                        const previousBalance = parseFloat(bankAccount.currentBalance) || 0;
                        const newBalance = previousBalance - paymentAmount;

                        // Create transaction record
                        const transactionData = {
                            companyId: purchase.companyId,
                            bankAccountId: bankAccountId,
                            transactionType: 'purchase_payment',
                            direction: 'out',
                            amount: paymentAmount,
                            description: `Additional payment for purchase ${purchase.purchaseNumber}`,
                            reference: reference || purchase.purchaseNumber,
                            partyType: 'supplier',
                            partyId: purchase.supplier._id,
                            partyName: purchase.supplier.name,
                            referenceType: 'purchase',
                            referenceId: purchase._id,
                            paymentMethod: getValidPaymentMethod(method), // ✅ Use mapping
                            status: 'completed',
                            notes: `Additional payment to ${purchase.supplier.name} for purchase ${purchase.purchaseNumber}`,
                            chequeNumber: chequeNumber,
                            chequeDate: chequeDate ? new Date(chequeDate) : null,
                            upiTransactionId: upiTransactionId,
                            bankTransactionId: bankTransactionId,
                            transactionDate: new Date(),
                            createdBy: validUserId // ✅ Use valid ObjectId
                        };

                        const transaction = new Transaction(transactionData);
                        await transaction.save();

                        // Update bank account balance
                        const updatedBankAccount = await BankAccount.findByIdAndUpdate(
                            bankAccountId,
                            {
                                $set: {
                                    currentBalance: parseFloat(newBalance.toFixed(2)),
                                    lastTransactionDate: new Date(),
                                    lastModified: new Date(),
                                    lastModifiedBy: validUserId // ✅ Use valid ObjectId
                                }
                            },
                            { new: true, runValidators: true }
                        );

                        if (!updatedBankAccount) {
                            throw new Error('Failed to update bank account balance');
                        }

                        bankTransactionResult = {
                            transactionId: transaction._id,
                            bankAccountId: bankAccountId,
                            amount: paymentAmount,
                            previousBalance: previousBalance,
                            newBalance: updatedBankAccount.currentBalance,
                            transactionType: 'purchase_payment',
                            direction: 'out',
                            status: 'completed'
                        };

                    } else {
                        throw new Error('Bank account not found or does not belong to company');
                    }

                } catch (transactionError) {
                    console.error('❌ Error creating bank transaction:', transactionError);
                    return res.status(500).json({
                        success: false,
                        message: 'Payment updated but bank transaction failed',
                        error: transactionError.message,
                        data: {
                            paidAmount: purchase.payment.paidAmount,
                            pendingAmount: purchase.payment.pendingAmount,
                            paymentStatus: purchase.payment.status
                        }
                    });
                }
            }

            res.status(200).json({
                success: true,
                message: 'Payment added successfully' +
                    (bankTransactionResult ? ' with bank transaction' : ''),
                data: {
                    paidAmount: purchase.payment.paidAmount,
                    pendingAmount: purchase.payment.pendingAmount,
                    paymentStatus: purchase.payment.status,
                    ...(bankTransactionResult && {
                        bankTransaction: bankTransactionResult
                    })
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

            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

            const purchases = await Purchase.find({
                companyId,
                purchaseDate: { $gte: startOfDay, $lt: endOfDay },
                status: { $ne: 'cancelled' }
            })
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
                topSuppliers
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
                ])
            ]);

            res.status(200).json({
                success: true,
                data: {
                    today: todaysPurchases[0] || { totalPurchases: 0, totalBills: 0 },
                    week: weekPurchases[0] || { totalPurchases: 0, totalBills: 0 },
                    month: monthPurchases[0] || { totalPurchases: 0, totalBills: 0 },
                    recentPurchases,
                    topSuppliers
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

            const balanceAmount = purchase.totals.finalTotal - purchase.payment.paidAmount;

            res.status(200).json({
                success: true,
                data: {
                    paymentStatus: purchase.payment.status,
                    paidAmount: purchase.payment.paidAmount,
                    pendingAmount: purchase.payment.pendingAmount,
                    totalAmount: purchase.totals.finalTotal,
                    balanceAmount: balanceAmount,
                    paymentMethod: purchase.payment.method,
                    paymentDate: purchase.payment.paymentDate,
                    dueDate: purchase.payment.dueDate
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

            const nextNumber = await generatePurchaseNumber(companyId, purchaseType === 'gst');

            res.status(200).json({
                success: true,
                data: {
                    nextPurchaseNumber: nextNumber,
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

            const pendingPurchases = await Purchase.find({
                companyId,
                'payment.status': { $in: ['pending', 'partial'] },
                status: { $ne: 'cancelled' }
            })
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

            const today = new Date();

            const overduePurchases = await Purchase.find({
                companyId,
                'payment.status': { $in: ['pending', 'partial'] },
                'payment.dueDate': { $lt: today },
                status: { $ne: 'cancelled' }
            })
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

    // Validate stock (not needed for purchases, but keeping for consistency)
    validateStock: async (req, res) => {
        try {
            const { items } = req.body;

            if (!items || !Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    message: 'Items array is required'
                });
            }

            // For purchases, we don't need to validate stock as we're adding to inventory
            // But we can validate that items exist
            const stockValidation = [];

            for (const item of items) {
                if (item.itemRef) {
                    const itemDetails = await Item.findById(item.itemRef);
                    if (itemDetails) {
                        stockValidation.push({
                            itemRef: item.itemRef,
                            itemName: itemDetails.name,
                            currentStock: itemDetails.currentStock,
                            isValid: true
                        });
                    } else {
                        stockValidation.push({
                            itemRef: item.itemRef,
                            error: 'Item not found',
                            isValid: false
                        });
                    }
                }
            }

            const allValid = stockValidation.every(item => item.isValid !== false);

            res.status(200).json({
                success: true,
                data: {
                    allItemsValid: allValid,
                    stockValidation
                }
            });
        } catch (error) {
            console.error('Error validating stock:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate stock',
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