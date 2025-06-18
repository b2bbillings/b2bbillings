const Sale = require('../models/Sale');
const Item = require('../models/Item');
const Party = require('../models/Party');
const mongoose = require('mongoose');

const saleController = {

    // Create a new sale/invoice - FIXED WITH PROPER CUSTOMER HANDLING
    createSale: async (req, res) => {
        try {
            const {
                customerName,           // Customer name (for display)
                customerMobile,         // Customer mobile (for display)
                customer,               // Customer ID (MAIN - we'll use this)
                customerId,             // Alternative customer ID field
                invoiceNumber,          // Invoice number
                invoiceDate,           // Invoice date
                gstEnabled = true,     // GST enabled flag
                companyId,             // Company ID
                items,                 // Items array
                payment,               // Payment details
                notes,                 // Notes
                termsAndConditions,    // Terms and conditions
                roundOff = 0,          // Round off amount
                roundOffEnabled = false, // Round off enabled flag
                status = 'draft',      // Sale status
                taxMode = 'without-tax',         // Tax mode (with-tax/without-tax)
                priceIncludesTax = false        // Whether the price includes tax
            } = req.body;

            console.log('📥 Creating sale:', {
                customerName,
                customer,
                customerId,
                taxMode,
                priceIncludesTax,
                gstEnabled,
                itemCount: items?.length || 0
            });

            // Validate required fields
            if (!companyId || !items || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID and Items are required'
                });
            }

            // FIXED: Handle customer - prioritize ID over name
            let customerRecord = null;
            const finalCustomerId = customer || customerId;

            if (finalCustomerId && mongoose.Types.ObjectId.isValid(finalCustomerId)) {
                // ✅ PREFERRED: Find existing customer by ID
                console.log('🔍 Finding customer by ID:', finalCustomerId);
                customerRecord = await Party.findById(finalCustomerId);

                if (!customerRecord) {
                    return res.status(400).json({
                        success: false,
                        message: 'Customer not found with provided ID'
                    });
                }

                console.log('✅ Found customer:', {
                    id: customerRecord._id,
                    name: customerRecord.name,
                    mobile: customerRecord.mobile
                });
            } else if (customerName && customerMobile) {
                // ✅ FALLBACK: Find by name and mobile (but don't create)
                console.log('🔍 Finding customer by name and mobile:', customerName, customerMobile);

                customerRecord = await Party.findOne({
                    $and: [
                        { companyId: companyId },
                        { type: 'customer' },
                        {
                            $or: [
                                { mobile: customerMobile },
                                { phoneNumber: customerMobile }
                            ]
                        }
                    ]
                });

                if (!customerRecord) {
                    // Try by name only
                    customerRecord = await Party.findOne({
                        companyId: companyId,
                        type: 'customer',
                        name: { $regex: new RegExp(`^${customerName}$`, 'i') }
                    });
                }

                if (!customerRecord) {
                    return res.status(400).json({
                        success: false,
                        message: 'Customer not found. Please select an existing customer or create one first.'
                    });
                }

                console.log('✅ Found customer by search:', {
                    id: customerRecord._id,
                    name: customerRecord.name,
                    mobile: customerRecord.mobile
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID or customer name and mobile are required'
                });
            }

            // FIXED: Sync tax mode fields
            const finalTaxMode = taxMode || (priceIncludesTax ? 'with-tax' : 'without-tax');
            const finalPriceIncludesTax = finalTaxMode === 'with-tax';

            console.log('🔄 Tax mode synchronization:', {
                originalTaxMode: taxMode,
                originalPriceIncludesTax: priceIncludesTax,
                finalTaxMode,
                finalPriceIncludesTax
            });

            // FIXED: Process items with proper tax mode handling
            const processedItems = [];
            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;
            let totalTaxableAmount = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                console.log(`🔄 Processing item ${i + 1}:`, {
                    itemName: item.itemName,
                    quantity: item.quantity,
                    pricePerUnit: item.pricePerUnit,
                    taxRate: item.taxRate
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

                // FIXED: Determine item-level tax mode
                const itemTaxMode = item.taxMode || finalTaxMode;
                const itemPriceIncludesTax = itemTaxMode === 'with-tax';

                // Calculate base amount
                const baseAmount = quantity * pricePerUnit;

                // Calculate discount
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

                if (gstEnabled && taxRate > 0) {
                    // Split tax rate for CGST and SGST
                    const cgstRate = taxRate / 2;
                    const sgstRate = taxRate / 2;

                    if (itemPriceIncludesTax) {
                        // WITH TAX MODE - Extract tax from amount
                        const taxMultiplier = 1 + (taxRate / 100);
                        itemTaxableAmount = amountAfterDiscount / taxMultiplier;
                        cgst = (itemTaxableAmount * cgstRate) / 100;
                        sgst = (itemTaxableAmount * sgstRate) / 100;
                        itemAmount = amountAfterDiscount; // Amount stays same (tax included)
                    } else {
                        // WITHOUT TAX MODE - Add tax to amount
                        itemTaxableAmount = amountAfterDiscount;
                        cgst = (itemTaxableAmount * cgstRate) / 100;
                        sgst = (itemTaxableAmount * sgstRate) / 100;
                        itemAmount = itemTaxableAmount + cgst + sgst; // Add tax
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
                    taxRate: taxRate,
                    taxMode: itemTaxMode,
                    priceIncludesTax: itemPriceIncludesTax,
                    discountPercent,
                    discountAmount: parseFloat(itemDiscountAmount.toFixed(2)),
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    igst: parseFloat(igst.toFixed(2)),
                    cgstAmount: parseFloat(cgst.toFixed(2)),
                    sgstAmount: parseFloat(sgst.toFixed(2)),
                    igstAmount: parseFloat(igst.toFixed(2)),
                    taxableAmount: parseFloat(itemTaxableAmount.toFixed(2)),
                    totalTaxAmount: parseFloat(itemTotalTax.toFixed(2)),
                    amount: parseFloat(itemAmount.toFixed(2)),
                    itemAmount: parseFloat(itemAmount.toFixed(2)),
                    lineNumber: i + 1
                };

                processedItems.push(processedItem);

                console.log(`✅ Item ${i + 1} processed:`, {
                    itemName: processedItem.itemName,
                    taxableAmount: processedItem.taxableAmount,
                    totalTax: processedItem.totalTaxAmount,
                    finalAmount: processedItem.amount
                });

                // OPTIONAL: Stock validation (if you want to check stock)
                if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
                    try {
                        const itemDetails = await Item.findById(item.itemRef);
                        if (itemDetails && itemDetails.currentStock < quantity) {
                            console.warn(`⚠️ Low stock for item ${item.itemName}: Available ${itemDetails.currentStock}, Required ${quantity}`);
                            // Note: Not throwing error, just warning
                        }
                    } catch (stockError) {
                        console.warn('Stock check failed:', stockError.message);
                    }
                }
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
                totalTax: parseFloat(totalTax.toFixed(2)),
                totalCGST: parseFloat(processedItems.reduce((sum, item) => sum + item.cgst, 0).toFixed(2)),
                totalSGST: parseFloat(processedItems.reduce((sum, item) => sum + item.sgst, 0).toFixed(2)),
                totalIGST: parseFloat(processedItems.reduce((sum, item) => sum + item.igst, 0).toFixed(2)),
                totalTaxableAmount: parseFloat(totalTaxableAmount.toFixed(2)),
                finalTotal: parseFloat(adjustedFinalTotal.toFixed(2)),
                roundOff: parseFloat(appliedRoundOff.toFixed(2))
            };

            console.log('💰 Final totals calculated:', totals);

            // FIXED: Payment details with bank account info
            const paymentDetails = {
                method: payment?.method || 'cash',
                status: payment?.status || 'pending',
                paidAmount: parseFloat(payment?.paidAmount || 0),
                pendingAmount: 0,
                paymentDate: payment?.paymentDate ? new Date(payment.paymentDate) : new Date(),
                dueDate: payment?.dueDate ? new Date(payment.dueDate) : null,
                creditDays: parseInt(payment?.creditDays || 0),
                reference: payment?.reference || '',
                notes: payment?.notes || '',
                // FIXED: Include bank account details if provided
                bankAccountId: payment?.bankAccountId || null,
                bankAccountName: payment?.bankAccountName || null
            };

            const paidAmount = paymentDetails.paidAmount;
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
                    bankAccountId: paymentDetails.bankAccountId,
                    bankAccountName: paymentDetails.bankAccountName,
                    notes: paymentDetails.notes || 'Initial payment',
                    createdAt: new Date(),
                    createdBy: req.user?.id || 'system'
                });
            }

            // Create sale object
            const saleData = {
                invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
                invoiceType: gstEnabled ? 'gst' : 'non-gst',
                customer: customerRecord._id, // Use the found customer ID
                invoiceNumber,
                customerMobile: customerRecord.mobile || customerMobile, // Use customer's actual mobile
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
                status,
                createdBy: req.user?.id || 'system',
                lastModifiedBy: req.user?.id || 'system'
            };

            console.log('💾 Creating sale with data:', {
                customer: customerRecord.name,
                customerId: customerRecord._id,
                itemCount: saleData.items.length,
                finalTotal: saleData.totals.finalTotal,
                paymentAmount: saleData.payment.paidAmount,
                paymentMethod: saleData.payment.method
            });

            // Create the sale
            const sale = new Sale(saleData);
            await sale.save();

            // Populate customer details for response
            await sale.populate('customer', 'name mobile email address type');

            // OPTIONAL: Update item stock (if you're tracking inventory)
            for (const item of processedItems) {
                if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
                    try {
                        await Item.findByIdAndUpdate(
                            item.itemRef,
                            { $inc: { currentStock: -item.quantity } },
                            { new: true }
                        );
                        console.log(`📦 Updated stock for item ${item.itemName}: -${item.quantity}`);
                    } catch (stockError) {
                        console.warn('Stock update failed:', stockError.message);
                    }
                }
            }

            console.log('✅ Sale created successfully:', {
                id: sale._id,
                invoiceNumber: sale.invoiceNumber,
                customer: customerRecord.name,
                finalTotal: sale.totals.finalTotal
            });

            // Response
            res.status(201).json({
                success: true,
                message: 'Sale created successfully',
                data: {
                    sale,
                    invoice: {
                        invoiceNumber: sale.invoiceNumber,
                        invoiceDate: sale.invoiceDate,
                        customer: {
                            id: customerRecord._id,
                            name: customerRecord.name,
                            mobile: customerRecord.mobile
                        },
                        totals: sale.totals,
                        payment: {
                            ...sale.payment,
                            dueDate: sale.payment.dueDate,
                            creditDays: sale.payment.creditDays
                        },
                        taxMode: sale.taxMode,
                        priceIncludesTax: sale.priceIncludesTax,
                        gstEnabled: sale.gstEnabled
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error creating sale:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create sale',
                error: error.message
            });
        }
    },

    // FIXED: Get sale by ID with proper tax mode handling
    getSaleById: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sale ID'
                });
            }

            const sale = await Sale.findById(id)
                .populate('customer', 'name mobile email address type gstNumber')
                .populate('items.itemRef', 'name itemCode category currentStock');

            if (!sale) {
                return res.status(404).json({
                    success: false,
                    message: 'Sale not found'
                });
            }

            // FIXED: Ensure backward compatibility for tax mode fields
            const compatibleSale = {
                ...sale.toObject(),
                taxMode: sale.taxMode || (sale.priceIncludesTax ? 'with-tax' : 'without-tax'),
                priceIncludesTax: sale.priceIncludesTax ?? (sale.taxMode === 'with-tax'),
                items: sale.items.map(item => ({
                    ...item,
                    taxMode: item.taxMode || sale.taxMode || 'without-tax',
                    priceIncludesTax: item.priceIncludesTax ?? (item.taxMode === 'with-tax'),
                    // Ensure frontend compatibility fields
                    cgstAmount: item.cgstAmount || item.cgst || 0,
                    sgstAmount: item.sgstAmount || item.sgst || 0,
                    igstAmount: item.igstAmount || item.igst || 0,
                    amount: item.amount || item.itemAmount || 0
                }))
            };

            console.log('📤 Sending sale data with tax mode compatibility:', {
                id: sale._id,
                taxMode: compatibleSale.taxMode,
                priceIncludesTax: compatibleSale.priceIncludesTax
            });

            res.json({
                success: true,
                data: compatibleSale
            });

        } catch (error) {
            console.error('❌ Error fetching sale:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sale',
                error: error.message
            });
        }
    },

    // Keep all other existing methods unchanged...
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
                notes = ''
            } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sale ID'
                });
            }

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid payment amount is required'
                });
            }

            const sale = await Sale.findById(id);
            if (!sale) {
                return res.status(404).json({
                    success: false,
                    message: 'Sale not found'
                });
            }

            const currentBalance = sale.balanceAmount;
            if (amount > currentBalance) {
                return res.status(400).json({
                    success: false,
                    message: `Payment amount cannot exceed balance amount of ₹${currentBalance.toFixed(2)}`
                });
            }

            const newPaidAmount = sale.payment.paidAmount + parseFloat(amount);
            const newPendingAmount = sale.totals.finalTotal - newPaidAmount;

            let newPaymentStatus = 'pending';
            let newDueDate = sale.payment.dueDate;

            if (newPaidAmount >= sale.totals.finalTotal) {
                newPaymentStatus = 'paid';
                newDueDate = null;
            } else if (newPaidAmount > 0) {
                newPaymentStatus = 'partial';

                if (dueDate) {
                    newDueDate = new Date(dueDate);
                } else if (creditDays && creditDays > 0) {
                    const calculatedDueDate = new Date();
                    calculatedDueDate.setDate(calculatedDueDate.getDate() + parseInt(creditDays));
                    newDueDate = calculatedDueDate;
                }
            }

            if (newDueDate && new Date() > newDueDate && newPendingAmount > 0) {
                newPaymentStatus = 'overdue';
            }

            sale.payment = {
                ...sale.payment,
                method: method,
                status: newPaymentStatus,
                paidAmount: parseFloat(newPaidAmount.toFixed(2)),
                pendingAmount: parseFloat(Math.max(0, newPendingAmount).toFixed(2)),
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                dueDate: newDueDate,
                creditDays: creditDays ? parseInt(creditDays) : sale.payment.creditDays,
                reference: reference,
                notes: notes
            };

            if (!sale.paymentHistory) {
                sale.paymentHistory = [];
            }

            sale.paymentHistory.push({
                amount: parseFloat(amount),
                method,
                reference,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                dueDate: newDueDate,
                notes,
                createdAt: new Date(),
                createdBy: req.user?.id || 'system'
            });

            await sale.save();

            res.status(200).json({
                success: true,
                message: 'Payment added successfully',
                data: {
                    invoiceNumber: sale.invoiceNumber,
                    totalAmount: sale.totals.finalTotal,
                    paidAmount: sale.payment.paidAmount,
                    pendingAmount: sale.payment.pendingAmount,
                    paymentStatus: sale.payment.status,
                    paymentMethod: sale.payment.method,
                    paymentDate: sale.payment.paymentDate,
                    dueDate: sale.payment.dueDate,
                    creditDays: sale.payment.creditDays,
                    isOverdue: sale.isOverdue,
                    daysOverdue: sale.daysOverdue,
                    paymentHistory: sale.paymentHistory,
                    balanceAmount: sale.balanceAmount
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
    getAllSales: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                companyId,
                customer,
                status,
                paymentStatus,
                invoiceType,
                dateFrom,
                dateTo,
                search
            } = req.query;

            const filter = {};

            if (companyId) filter.companyId = companyId;
            if (customer) filter.customer = customer;
            if (status) filter.status = status;
            if (paymentStatus) filter['payment.status'] = paymentStatus;
            if (invoiceType) filter.invoiceType = invoiceType;

            if (dateFrom || dateTo) {
                filter.invoiceDate = {};
                if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
                if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
            }

            if (search) {
                filter.$or = [
                    { invoiceNumber: { $regex: search, $options: 'i' } },
                    { customerMobile: { $regex: search, $options: 'i' } },
                    { notes: { $regex: search, $options: 'i' } }
                ];
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const sales = await Sale.find(filter)
                .populate('customer', 'name mobile email address type')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const transformedSales = sales.map(sale => ({
                id: sale._id,
                invoiceNo: sale.invoiceNumber,
                date: sale.invoiceDate,
                partyName: sale.customer?.name || 'Unknown',
                partyPhone: sale.customer?.mobile || sale.customerMobile,
                transaction: sale.invoiceType === 'gst' ? 'GST Invoice' : 'Sale',
                paymentType: sale.payment?.method || 'cash',
                amount: sale.totals?.finalTotal || 0,
                balance: sale.payment?.pendingAmount || 0,
                cgst: sale.items?.reduce((sum, item) => sum + (item.cgst || 0), 0) || 0,
                sgst: sale.items?.reduce((sum, item) => sum + (item.sgst || 0), 0) || 0,
                igst: sale.items?.reduce((sum, item) => sum + (item.igst || 0), 0) || 0,
                status: sale.status,
                paymentStatus: sale.payment?.status || 'pending',
                ...sale.toObject()
            }));

            const totalSales = await Sale.countDocuments(filter);
            const totalPages = Math.ceil(totalSales / parseInt(limit));

            const summary = await Sale.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$totals.finalTotal' },
                        totalTax: { $sum: '$totals.totalTax' },
                        totalDiscount: { $sum: '$totals.totalDiscount' },
                        paidAmount: { $sum: '$payment.paidAmount' },
                        pendingAmount: { $sum: '$payment.pendingAmount' }
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: {
                    sales: transformedSales,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalSales,
                        hasNext: parseInt(page) < totalPages,
                        hasPrev: parseInt(page) > 1
                    },
                    summary: summary[0] || {
                        totalAmount: 0,
                        totalTax: 0,
                        totalDiscount: 0,
                        paidAmount: 0,
                        pendingAmount: 0
                    }
                }
            });

        } catch (error) {
            console.error('Error getting sales:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get sales',
                error: error.message
            });
        }
    },

    updateSale: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sale ID'
                });
            }

            const sale = await Sale.findById(id);
            if (!sale) {
                return res.status(404).json({
                    success: false,
                    message: 'Sale not found'
                });
            }

            if (sale.status === 'completed' || sale.status === 'cancelled') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update completed or cancelled sales'
                });
            }

            updateData.lastModifiedBy = req.user?.id || 'system';

            if (updateData.items) {
                for (let i = 0; i < updateData.items.length; i++) {
                    const item = updateData.items[i];
                    if (item.itemRef) {
                        const itemDetails = await Item.findById(item.itemRef);
                        if (itemDetails && itemDetails.currentStock < item.quantity) {
                            return res.status(400).json({
                                success: false,
                                message: `Item ${i + 1}: Insufficient stock`
                            });
                        }
                    }
                }
            }

            const updatedSale = await Sale.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('customer', 'name mobile email address');

            res.status(200).json({
                success: true,
                message: 'Sale updated successfully',
                data: updatedSale
            });

        } catch (error) {
            console.error('Error updating sale:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update sale',
                error: error.message
            });
        }
    },

    deleteSale: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sale ID'
                });
            }

            const sale = await Sale.findById(id);
            if (!sale) {
                return res.status(404).json({
                    success: false,
                    message: 'Sale not found'
                });
            }

            sale.status = 'cancelled';
            sale.lastModifiedBy = req.user?.id || 'system';
            await sale.save();

            res.status(200).json({
                success: true,
                message: 'Sale cancelled successfully'
            });

        } catch (error) {
            console.error('Error deleting sale:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete sale',
                error: error.message
            });
        }
    },

    completeSale: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sale ID'
                });
            }

            const sale = await Sale.findById(id);
            if (!sale) {
                return res.status(404).json({
                    success: false,
                    message: 'Sale not found'
                });
            }

            if (sale.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Sale is already completed'
                });
            }

            await sale.markAsCompleted();

            res.status(200).json({
                success: true,
                message: 'Sale marked as completed',
                data: sale
            });

        } catch (error) {
            console.error('Error completing sale:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to complete sale',
                error: error.message
            });
        }
    },

    getTodaysSales: async (req, res) => {
        try {
            const { companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const sales = await Sale.getTodaysSales(companyId)
                .populate('customer', 'name mobile')
                .select('invoiceNumber invoiceDate totals.finalTotal payment.status items');

            const summary = {
                totalSales: sales.length,
                totalAmount: sales.reduce((sum, sale) => sum + sale.totals.finalTotal, 0),
                totalItems: sales.reduce((sum, sale) => sum + sale.items.length, 0),
                paidSales: sales.filter(sale => sale.payment.status === 'paid').length,
                pendingSales: sales.filter(sale => sale.payment.status === 'pending').length
            };

            res.status(200).json({
                success: true,
                data: {
                    sales,
                    summary
                }
            });

        } catch (error) {
            console.error('Error getting today\'s sales:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get today\'s sales',
                error: error.message
            });
        }
    },

    getSalesReport: async (req, res) => {
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

            const report = await Sale.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        invoiceDate: { $gte: start, $lte: end },
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$totals.finalTotal' },
                        totalInvoices: { $sum: 1 },
                        totalItems: { $sum: { $size: '$items' } },
                        totalTax: { $sum: '$totals.totalTax' },
                        avgInvoiceValue: { $avg: '$totals.finalTotal' },
                        totalPaid: { $sum: '$payment.paidAmount' },
                        totalPending: { $sum: '$payment.pendingAmount' }
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: report[0] || {
                    totalSales: 0,
                    totalInvoices: 0,
                    totalItems: 0,
                    totalTax: 0,
                    avgInvoiceValue: 0,
                    totalPaid: 0,
                    totalPending: 0
                }
            });

        } catch (error) {
            console.error('Error getting sales report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get sales report',
                error: error.message
            });
        }
    },

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
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

            const [
                todaysSales,
                weekSales,
                monthSales,
                recentSales,
                topCustomers
            ] = await Promise.all([
                Sale.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            invoiceDate: { $gte: startOfDay, $lt: endOfDay },
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalSales: { $sum: '$totals.finalTotal' },
                            totalInvoices: { $sum: 1 }
                        }
                    }
                ]),

                Sale.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            invoiceDate: { $gte: startOfWeek },
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalSales: { $sum: '$totals.finalTotal' },
                            totalInvoices: { $sum: 1 }
                        }
                    }
                ]),

                Sale.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            invoiceDate: { $gte: startOfMonth },
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalSales: { $sum: '$totals.finalTotal' },
                            totalInvoices: { $sum: 1 }
                        }
                    }
                ]),

                Sale.find({ companyId, status: { $ne: 'cancelled' } })
                    .populate('customer', 'name mobile')
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('invoiceNumber invoiceDate totals.finalTotal payment.status'),

                Sale.aggregate([
                    {
                        $match: {
                            companyId: new mongoose.Types.ObjectId(companyId),
                            status: { $ne: 'cancelled' }
                        }
                    },
                    {
                        $group: {
                            _id: '$customer',
                            totalPurchases: { $sum: '$totals.finalTotal' },
                            invoiceCount: { $sum: 1 }
                        }
                    },
                    {
                        $lookup: {
                            from: 'parties',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'customerInfo'
                        }
                    },
                    { $unwind: '$customerInfo' },
                    {
                        $project: {
                            name: '$customerInfo.name',
                            mobile: '$customerInfo.mobile',
                            totalPurchases: 1,
                            invoiceCount: 1
                        }
                    },
                    { $sort: { totalPurchases: -1 } },
                    { $limit: 5 }
                ])
            ]);

            res.status(200).json({
                success: true,
                data: {
                    today: todaysSales[0] || { totalSales: 0, totalInvoices: 0 },
                    week: weekSales[0] || { totalSales: 0, totalInvoices: 0 },
                    month: monthSales[0] || { totalSales: 0, totalInvoices: 0 },
                    recentSales,
                    topCustomers
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

    getPaymentStatus: async (req, res) => {
        try {
            const { id } = req.params;

            const sale = await Sale.findById(id).select('payment totals paymentHistory');

            if (!sale) {
                return res.status(404).json({
                    success: false,
                    message: 'Sale not found'
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    paymentStatus: sale.payment.status,
                    paidAmount: sale.payment.paidAmount,
                    pendingAmount: sale.payment.pendingAmount,
                    totalAmount: sale.totals.finalTotal,
                    balanceAmount: sale.balanceAmount,
                    paymentMethod: sale.payment.method,
                    paymentDate: sale.payment.paymentDate,
                    paymentHistory: sale.paymentHistory || []
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

    getMonthlyReport: async (req, res) => {
        try {
            const { companyId, year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const monthlyData = await Sale.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        invoiceDate: { $gte: startDate, $lte: endDate },
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: { $dayOfMonth: '$invoiceDate' },
                        dailySales: { $sum: '$totals.finalTotal' },
                        dailyInvoices: { $sum: 1 },
                        dailyItems: { $sum: { $size: '$items' } }
                    }
                },
                { $sort: { '_id': 1 } }
            ]);

            const summary = await Sale.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        invoiceDate: { $gte: startDate, $lte: endDate },
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$totals.finalTotal' },
                        totalInvoices: { $sum: 1 },
                        totalTax: { $sum: '$totals.totalTax' },
                        avgDailySales: { $avg: '$totals.finalTotal' }
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: {
                    monthlyBreakdown: monthlyData,
                    summary: summary[0] || { totalSales: 0, totalInvoices: 0, totalTax: 0, avgDailySales: 0 },
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

    getTopItems: async (req, res) => {
        try {
            const { companyId, limit = 10, dateFrom, dateTo } = req.query;

            const matchConditions = {
                companyId: new mongoose.Types.ObjectId(companyId),
                status: { $ne: 'cancelled' }
            };

            if (dateFrom || dateTo) {
                matchConditions.invoiceDate = {};
                if (dateFrom) matchConditions.invoiceDate.$gte = new Date(dateFrom);
                if (dateTo) matchConditions.invoiceDate.$lte = new Date(dateTo);
            }

            const topItems = await Sale.aggregate([
                { $match: matchConditions },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.itemName',
                        totalQuantity: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: '$items.itemAmount' },
                        timesOrdered: { $sum: 1 },
                        avgPrice: { $avg: '$items.pricePerUnit' }
                    }
                },
                { $sort: { totalRevenue: -1 } },
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

    getCustomerStats: async (req, res) => {
        try {
            const { companyId, customerId } = req.query;

            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID is required'
                });
            }

            const customerStats = await Sale.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        customer: new mongoose.Types.ObjectId(customerId),
                        status: { $ne: 'cancelled' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalPurchases: { $sum: '$totals.finalTotal' },
                        totalInvoices: { $sum: 1 },
                        totalItems: { $sum: { $size: '$items' } },
                        avgInvoiceValue: { $avg: '$totals.finalTotal' },
                        lastPurchaseDate: { $max: '$invoiceDate' },
                        firstPurchaseDate: { $min: '$invoiceDate' }
                    }
                }
            ]);

            const recentPurchases = await Sale.find({
                companyId,
                customer: customerId,
                status: { $ne: 'cancelled' }
            })
                .sort({ invoiceDate: -1 })
                .limit(5)
                .select('invoiceNumber invoiceDate totals.finalTotal payment.status');

            res.status(200).json({
                success: true,
                data: {
                    stats: customerStats[0] || {
                        totalPurchases: 0,
                        totalInvoices: 0,
                        totalItems: 0,
                        avgInvoiceValue: 0,
                        lastPurchaseDate: null,
                        firstPurchaseDate: null
                    },
                    recentPurchases
                }
            });
        } catch (error) {
            console.error('Error getting customer stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get customer statistics',
                error: error.message
            });
        }
    },

    getNextInvoiceNumber: async (req, res) => {
        try {
            const { companyId, invoiceType = 'gst' } = req.query;

            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            const todayStart = new Date(year, date.getMonth(), date.getDate());
            const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

            const lastInvoice = await Sale.findOne({
                companyId,
                invoiceDate: { $gte: todayStart, $lt: todayEnd },
                invoiceNumber: new RegExp(`^${invoiceType.toUpperCase()}-${year}${month}${day}`)
            }).sort({ invoiceNumber: -1 });

            let sequence = 1;
            if (lastInvoice) {
                const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
                sequence = lastSequence + 1;
            }

            const prefix = invoiceType === 'gst' ? 'GST' : 'INV';
            const nextInvoiceNumber = `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;

            res.status(200).json({
                success: true,
                data: {
                    nextInvoiceNumber,
                    invoiceType,
                    date: new Date().toISOString().split('T')[0]
                }
            });
        } catch (error) {
            console.error('Error generating invoice number:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate invoice number',
                error: error.message
            });
        }
    },

    validateStock: async (req, res) => {
        try {
            const { items } = req.body;

            if (!items || !Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    message: 'Items array is required'
                });
            }

            const stockValidation = [];

            for (const item of items) {
                if (item.itemRef) {
                    const itemDetails = await Item.findById(item.itemRef);
                    if (itemDetails) {
                        const isAvailable = itemDetails.currentStock >= (item.quantity || 0);
                        stockValidation.push({
                            itemRef: item.itemRef,
                            itemName: itemDetails.name,
                            requestedQuantity: item.quantity,
                            availableStock: itemDetails.currentStock,
                            isAvailable,
                            shortfall: isAvailable ? 0 : (item.quantity - itemDetails.currentStock)
                        });
                    } else {
                        stockValidation.push({
                            itemRef: item.itemRef,
                            error: 'Item not found'
                        });
                    }
                }
            }

            const allAvailable = stockValidation.every(item => item.isAvailable !== false);

            res.status(200).json({
                success: true,
                data: {
                    allItemsAvailable: allAvailable,
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

    exportCSV: async (req, res) => {
        try {
            const {
                companyId,
                customer,
                status,
                paymentStatus,
                invoiceType,
                dateFrom,
                dateTo
            } = req.query;

            const filter = { companyId };
            if (customer) filter.customer = customer;
            if (status) filter.status = status;
            if (paymentStatus) filter['payment.status'] = paymentStatus;
            if (invoiceType) filter.invoiceType = invoiceType;

            if (dateFrom || dateTo) {
                filter.invoiceDate = {};
                if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
                if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
            }

            const sales = await Sale.find(filter)
                .populate('customer', 'name mobile email')
                .sort({ invoiceDate: -1 })
                .limit(1000);

            const csvHeaders = [
                'Invoice Number',
                'Invoice Date',
                'Customer Name',
                'Customer Mobile',
                'Invoice Type',
                'Total Amount',
                'Tax Amount',
                'Paid Amount',
                'Pending Amount',
                'Payment Status',
                'Status'
            ];

            const csvRows = sales.map(sale => [
                sale.invoiceNumber,
                sale.invoiceDate.toISOString().split('T')[0],
                sale.customer?.name || '',
                sale.customer?.mobile || sale.customerMobile || '',
                sale.invoiceType,
                sale.totals.finalTotal,
                sale.totals.totalTax,
                sale.payment.paidAmount,
                sale.payment.pendingAmount,
                sale.payment.status,
                sale.status
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-export.csv');
            res.status(200).send(csvContent);

        } catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export CSV',
                error: error.message
            });
        }
    },

    getOverdueSales: async (req, res) => {
        try {
            const { companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const overdueSales = await Sale.find({
                companyId: companyId,
                status: { $ne: 'cancelled' },
                'payment.pendingAmount': { $gt: 0 },
                'payment.dueDate': {
                    $exists: true,
                    $ne: null,
                    $lt: today
                }
            })
                .populate('customer', 'name mobile email')
                .sort({ 'payment.dueDate': 1 });

            const salesWithOverdueInfo = overdueSales.map(sale => {
                const saleObj = sale.toObject();
                const dueDate = new Date(sale.payment.dueDate);
                const diffTime = Math.abs(today - dueDate);
                const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return {
                    ...saleObj,
                    isOverdue: true,
                    daysOverdue: daysOverdue
                };
            });

            console.log(`Found ${salesWithOverdueInfo.length} overdue sales for company ${companyId}`);

            res.status(200).json({
                success: true,
                data: salesWithOverdueInfo,
                message: `Found ${salesWithOverdueInfo.length} overdue sales`
            });

        } catch (error) {
            console.error('Error getting overdue sales:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get overdue sales',
                error: error.message
            });
        }
    },
    // NEW: Get sales due today
    getSalesDueToday: async (req, res) => {
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

            // Find sales due today
            const salesDueToday = await Sale.find({
                companyId: companyId,
                status: { $ne: 'cancelled' },
                'payment.pendingAmount': { $gt: 0 },
                'payment.dueDate': {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            })
                .populate('customer', 'name mobile email')
                .sort({ 'payment.dueDate': 1 });

            console.log(`Found ${salesDueToday.length} sales due today for company ${companyId}`);

            res.status(200).json({
                success: true,
                data: salesDueToday,
                message: `Found ${salesDueToday.length} sales due today`
            });

        } catch (error) {
            console.error('Error getting sales due today:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get sales due today',
                error: error.message
            });
        }
    },

    // NEW: Update payment due date
    updatePaymentDueDate: async (req, res) => {
        try {
            const { id } = req.params;
            const { dueDate, creditDays } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid sale ID'
                });
            }

            const sale = await Sale.findById(id);
            if (!sale) {
                return res.status(404).json({
                    success: false,
                    message: 'Sale not found'
                });
            }

            // Update due date and credit days
            sale.payment.dueDate = dueDate ? new Date(dueDate) : null;
            sale.payment.creditDays = creditDays ? parseInt(creditDays) : 0;
            sale.lastModifiedBy = req.user?.id || 'system';

            await sale.save();

            console.log(`Updated due date for sale ${id}`);

            res.status(200).json({
                success: true,
                data: sale,
                message: 'Payment due date updated successfully'
            });

        } catch (error) {
            console.error('Error updating payment due date:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update payment due date',
                error: error.message
            });
        }
    },

    // NEW: Get payment summary with overdue analysis
    getPaymentSummaryWithOverdue: async (req, res) => {
        try {
            const { companyId, dateFrom, dateTo } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            // Build date filter
            const dateFilter = { companyId, status: { $ne: 'cancelled' } };
            if (dateFrom || dateTo) {
                dateFilter.invoiceDate = {};
                if (dateFrom) dateFilter.invoiceDate.$gte = new Date(dateFrom);
                if (dateTo) dateFilter.invoiceDate.$lte = new Date(dateTo);
            }

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            // Get comprehensive payment analysis
            const [salesData, overdueSummary, dueTodaySummary] = await Promise.all([
                // Regular sales summary
                Sale.aggregate([
                    { $match: dateFilter },
                    {
                        $group: {
                            _id: null,
                            totalSales: { $sum: 1 },
                            totalAmount: { $sum: '$totals.finalTotal' },
                            totalPaid: { $sum: '$payment.paidAmount' },
                            totalPending: { $sum: '$payment.pendingAmount' },
                            paidCount: {
                                $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0] }
                            },
                            partialCount: {
                                $sum: { $cond: [{ $eq: ['$payment.status', 'partial'] }, 1, 0] }
                            },
                            pendingCount: {
                                $sum: { $cond: [{ $eq: ['$payment.status', 'pending'] }, 1, 0] }
                            }
                        }
                    }
                ]),

                // Overdue summary
                Sale.aggregate([
                    {
                        $match: {
                            ...dateFilter,
                            'payment.pendingAmount': { $gt: 0 },
                            'payment.dueDate': { $lt: today }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            overdueCount: { $sum: 1 },
                            overdueAmount: { $sum: '$payment.pendingAmount' }
                        }
                    }
                ]),

                // Due today summary
                Sale.aggregate([
                    {
                        $match: {
                            ...dateFilter,
                            'payment.pendingAmount': { $gt: 0 },
                            'payment.dueDate': {
                                $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            dueTodayCount: { $sum: 1 },
                            dueTodayAmount: { $sum: '$payment.pendingAmount' }
                        }
                    }
                ])
            ]);

            const summary = {
                ...(salesData[0] || {
                    totalSales: 0,
                    totalAmount: 0,
                    totalPaid: 0,
                    totalPending: 0,
                    paidCount: 0,
                    partialCount: 0,
                    pendingCount: 0
                }),
                overdueCount: overdueSummary[0]?.overdueCount || 0,
                overdueAmount: overdueSummary[0]?.overdueAmount || 0,
                dueTodayCount: dueTodaySummary[0]?.dueTodayCount || 0,
                dueTodayAmount: dueTodaySummary[0]?.dueTodayAmount || 0
            };

            res.status(200).json({
                success: true,
                data: { summary },
                message: 'Payment summary with overdue analysis retrieved successfully'
            });

        } catch (error) {
            console.error('Error getting payment summary with overdue:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment summary',
                error: error.message
            });
        }
    },
};

module.exports = saleController;