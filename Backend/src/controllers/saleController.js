const Sale = require('../models/Sale');
const Item = require('../models/Item');
const Party = require('../models/Party');
const mongoose = require('mongoose');

const saleController = {
    // Create a new sale/invoice
    createSale: async (req, res) => {
        try {
            const {
                customerName,           // Customer name (will find or create)
                customerMobile,         // Customer mobile
                customer,
                invoiceNumber,               // Customer ID (if provided directly)
                invoiceDate,           // Invoice date
                gstEnabled = true,     // GST enabled flag
                companyId,             // Company ID
                items,                 // Items array
                payment,               // Payment details
                notes,                 // Notes
                termsAndConditions,    // Terms and conditions
                roundOff = 0,          // Round off amount
                roundOffEnabled = false, // Round off enabled flag
                status = 'draft'       // Sale status
            } = req.body;

            // Validate required fields - check for either customer ID or customer name
            if ((!customerName && !customer) || !companyId || !items || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer (name or ID), Company, and Items are required'
                });
            }

            // Find or create customer
            let customerRecord;

            // If customer ID is provided, use it directly
            if (customer && mongoose.Types.ObjectId.isValid(customer)) {
                customerRecord = await Party.findById(customer);
                if (!customerRecord) {
                    return res.status(400).json({
                        success: false,
                        message: 'Customer not found with provided ID'
                    });
                }
            } else {
                // Find customer by mobile first, then by name
                if (customerMobile) {
                    customerRecord = await Party.findOne({
                        mobile: customerMobile,
                        type: 'customer'
                    });
                }

                if (!customerRecord && customerName) {
                    customerRecord = await Party.findOne({
                        name: { $regex: new RegExp(`^${customerName}$`, 'i') },
                        type: 'customer'
                    });
                }

                // If customer not found, create new customer
                if (!customerRecord) {
                    if (!customerName) {
                        return res.status(400).json({
                            success: false,
                            message: 'Customer name is required to create new customer'
                        });
                    }

                    customerRecord = new Party({
                        name: customerName,
                        mobile: customerMobile || '',
                        type: 'customer',
                        email: '',
                        address: {
                            street: '',
                            city: '',
                            state: '',
                            pincode: '',
                            country: 'India'
                        }
                    });
                    await customerRecord.save();
                    console.log('Created new customer:', customerRecord._id);
                }
            }

            // Validate and process items
            const processedItems = [];
            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

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

                // If itemRef is provided, validate stock
                if (item.itemRef) {
                    const itemDetails = await Item.findById(item.itemRef);
                    if (itemDetails && itemDetails.currentStock < quantity) {
                        return res.status(400).json({
                            success: false,
                            message: `Item ${i + 1} (${item.itemName}): Insufficient stock. Available: ${itemDetails.currentStock}, Required: ${quantity}`
                        });
                    }
                }
            }

            // Calculate final totals
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
                finalTotal: parseFloat(finalTotal.toFixed(2))
            };

            // Prepare payment object
            const paymentDetails = {
                method: payment?.method || 'cash',
                status: payment?.status || 'pending',
                paidAmount: parseFloat(payment?.paidAmount || 0),
                pendingAmount: parseFloat((finalTotal - (payment?.paidAmount || 0)).toFixed(2)),
                paymentDate: payment?.paymentDate ? new Date(payment.paymentDate) : new Date(),
                reference: payment?.reference || ''
            };

            // Auto-determine payment status based on amount
            if (paymentDetails.paidAmount >= finalTotal) {
                paymentDetails.status = 'paid';
                paymentDetails.pendingAmount = 0;
            } else if (paymentDetails.paidAmount > 0) {
                paymentDetails.status = 'partial';
            } else {
                paymentDetails.status = 'pending';
                paymentDetails.pendingAmount = finalTotal;
            }

            // Create sale object
            const saleData = {
                // Invoice number will be auto-generated by pre-save middleware
                invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
                invoiceType: gstEnabled ? 'gst' : 'non-gst',
                customer: customerRecord._id,
                invoiceNumber,
                customerMobile: customerMobile || customerRecord.mobile,
                gstEnabled,
                companyId,
                items: processedItems,
                totals,
                payment: paymentDetails,
                notes: notes || '',
                termsAndConditions: termsAndConditions || '',
                status,
                createdBy: req.user?.id || 'system',
                lastModifiedBy: req.user?.id || 'system'
            };

            // Create the sale
            const sale = new Sale(saleData);
            await sale.save();

            // Populate customer details for response
            await sale.populate('customer', 'name mobile email address type');

            // Update item stock if itemRef is provided
            for (const item of processedItems) {
                if (item.itemRef) {
                    await Item.findByIdAndUpdate(
                        item.itemRef,
                        { $inc: { currentStock: -item.quantity } },
                        { new: true }
                    );
                }
            }

            res.status(201).json({
                success: true,
                message: 'Sale created successfully',
                data: {
                    sale,
                    invoice: {
                        invoiceNumber: sale.invoiceNumber,
                        invoiceDate: sale.invoiceDate,
                        customer: {
                            name: customerRecord.name,
                            mobile: customerRecord.mobile
                        },
                        totals: sale.totals,
                        payment: sale.payment
                    }
                }
            });

        } catch (error) {
            console.error('Error creating sale:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create sale',
                error: error.message
            });
        }
    },

    // Get all sales with pagination and filters
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

            // Build filter object
            const filter = {};

            if (companyId) filter.companyId = companyId;
            if (customer) filter.customer = customer;
            if (status) filter.status = status;
            if (paymentStatus) filter['payment.status'] = paymentStatus;
            if (invoiceType) filter.invoiceType = invoiceType;

            // Date range filter
            if (dateFrom || dateTo) {
                filter.invoiceDate = {};
                if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
                if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
            }

            // Search filter
            if (search) {
                filter.$or = [
                    { invoiceNumber: { $regex: search, $options: 'i' } },
                    { customerMobile: { $regex: search, $options: 'i' } },
                    { notes: { $regex: search, $options: 'i' } }
                ];
            }

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Get sales with pagination
            const sales = await Sale.find(filter)
                .populate('customer', 'name mobile email address type')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            // Get total count
            const totalSales = await Sale.countDocuments(filter);
            const totalPages = Math.ceil(totalSales / parseInt(limit));

            // Calculate summary using correct field names
            const summary = await Sale.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$totals.finalTotal' },
                        totalTax: { $sum: '$totals.totalTax' },
                        totalDiscount: { $sum: '$totals.totalDiscount' }
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: {
                    sales,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalSales,
                        hasNext: parseInt(page) < totalPages,
                        hasPrev: parseInt(page) > 1
                    },
                    summary: summary[0] || { totalAmount: 0, totalTax: 0, totalDiscount: 0 }
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

    // Get sale by ID
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

            res.status(200).json({
                success: true,
                data: sale
            });

        } catch (error) {
            console.error('Error getting sale:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get sale',
                error: error.message
            });
        }
    },

    // Update sale
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

            // Check if sale can be updated
            if (sale.status === 'completed' || sale.status === 'cancelled') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update completed or cancelled sales'
                });
            }

            // Update metadata
            updateData.lastModifiedBy = req.user?.id || 'system';

            // If updating items, validate stock again
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

    // Delete sale (soft delete by marking as cancelled)
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

            // Mark as cancelled instead of hard delete
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

    // Mark sale as completed
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

            // Mark as completed
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

    // Add payment to sale
    addPayment: async (req, res) => {
        try {
            const { id } = req.params;
            const { amount, method = 'cash', reference = '' } = req.body;

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

            // Check if payment amount is valid
            const balance = sale.balanceAmount;
            if (amount > balance) {
                return res.status(400).json({
                    success: false,
                    message: `Payment amount cannot exceed balance amount of ₹${balance}`
                });
            }

            // Add payment
            await sale.addPayment(amount, method, reference);

            res.status(200).json({
                success: true,
                message: 'Payment added successfully',
                data: {
                    paidAmount: sale.payment.paidAmount,
                    pendingAmount: sale.payment.pendingAmount,
                    paymentStatus: sale.payment.status
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

    // Get today's sales
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

            // Calculate today's summary
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

    // Get sales report
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
                        companyId: mongoose.Types.ObjectId(companyId),
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
                        avgInvoiceValue: { $avg: '$totals.finalTotal' }
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
                    avgInvoiceValue: 0
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

    // Get sales dashboard data
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
                todaysSales,
                weekSales,
                monthSales,
                recentSales,
                topCustomers
            ] = await Promise.all([
                // Today's sales
                Sale.aggregate([
                    {
                        $match: {
                            companyId: mongoose.Types.ObjectId(companyId),
                            invoiceDate: {
                                $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
                            },
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

                // This week's sales
                Sale.aggregate([
                    {
                        $match: {
                            companyId: mongoose.Types.ObjectId(companyId),
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

                // This month's sales
                Sale.aggregate([
                    {
                        $match: {
                            companyId: mongoose.Types.ObjectId(companyId),
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

                // Recent sales
                Sale.find({ companyId, status: { $ne: 'cancelled' } })
                    .populate('customer', 'name mobile')
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('invoiceNumber invoiceDate totals.finalTotal payment.status'),

                // Top customers
                Sale.aggregate([
                    {
                        $match: {
                            companyId: mongoose.Types.ObjectId(companyId),
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

    // Get payment status
    getPaymentStatus: async (req, res) => {
        try {
            const { id } = req.params;

            const sale = await Sale.findById(id).select('payment totals');

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
                    paymentDate: sale.payment.paymentDate
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

            const monthlyData = await Sale.aggregate([
                {
                    $match: {
                        companyId: mongoose.Types.ObjectId(companyId),
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
                        companyId: mongoose.Types.ObjectId(companyId),
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

    // Get top items
    getTopItems: async (req, res) => {
        try {
            const { companyId, limit = 10, dateFrom, dateTo } = req.query;

            const matchConditions = {
                companyId: mongoose.Types.ObjectId(companyId),
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

    // Get customer stats
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
                        companyId: mongoose.Types.ObjectId(companyId),
                        customer: mongoose.Types.ObjectId(customerId),
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

    // Get next invoice number
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

    // Validate stock
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

    // Export CSV
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

            // Build filter object (same as getAllSales)
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
                .limit(1000); // Limit for performance

            // Convert to CSV format
            const csvHeaders = [
                'Invoice Number',
                'Invoice Date',
                'Customer Name',
                'Customer Mobile',
                'Invoice Type',
                'Total Amount',
                'Tax Amount',
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
    }
};

module.exports = saleController;