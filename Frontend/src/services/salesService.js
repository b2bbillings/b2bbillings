import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with better config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

class SalesService {
    constructor() {
        this.setupInterceptors();
        this.isWarmedUp = false;
        this.warmupPromise = null;
    }

    // Setup interceptors with retry logic
    setupInterceptors() {
        // Request interceptor
        api.interceptors.request.use(
            (config) => {
                const token = this.getAuthToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                    config.headers['x-auth-token'] = token;
                }

                config.metadata = {
                    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    startTime: Date.now()
                };

                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor
        api.interceptors.response.use(
            (response) => response,
            async (error) => Promise.reject(error)
        );
    }

    // Get auth token
    getAuthToken() {
        return localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            sessionStorage.getItem('token');
    }

    // Check backend health
    async checkBackendHealth() {
        try {
            const response = await api.get('/health', { timeout: 5000 });
            return { healthy: true, status: response.status };
        } catch (error) {
            return {
                healthy: false,
                status: error.response?.status,
                error: error.message
            };
        }
    }

    // Warm up backend connection
    async warmupBackend() {
        if (this.isWarmedUp || this.warmupPromise) {
            return this.warmupPromise || Promise.resolve();
        }

        this.warmupPromise = this.checkBackendHealth()
            .then((health) => {
                this.isWarmedUp = health.healthy;
                return this.isWarmedUp;
            })
            .catch(() => {
                this.isWarmedUp = false;
                return false;
            });

        return this.warmupPromise;
    }

    // ✅ FIXED: Create invoice with proper payment method formatting
    async createInvoice(invoiceData, retryCount = 0) {
        const maxRetries = 2;

        try {
            // Ensure backend is ready
            if (!this.isWarmedUp && retryCount === 0) {
                await this.warmupBackend();
            }

            // Validation
            if (!invoiceData.companyId) {
                throw new Error('Company ID is required');
            }

            if (!invoiceData.items || invoiceData.items.length === 0) {
                throw new Error('At least one item is required');
            }

            // Clean data for backend
            const cleanData = this.cleanInvoiceData(invoiceData);

            // Add delay for retries
            if (retryCount > 0) {
                await new Promise(resolve => setTimeout(resolve, retryCount * 500));
            }

            const response = await api.post('/sales', cleanData);

            // Handle response formats
            if (response.status >= 200 && response.status < 300) {
                const responseData = response.data;

                if (responseData && responseData.success === true) {
                    return {
                        success: true,
                        data: responseData.data,
                        message: responseData.message || 'Invoice created successfully'
                    };
                }

                if (responseData && (responseData._id || responseData.id || responseData.invoiceNumber)) {
                    return {
                        success: true,
                        data: responseData,
                        message: 'Invoice created successfully'
                    };
                }

                if (responseData && responseData.success === false) {
                    if (retryCount < maxRetries &&
                        (responseData.message?.includes('temporary') ||
                            responseData.message?.includes('busy') ||
                            responseData.message?.includes('initialization'))) {
                        return await this.createInvoice(invoiceData, retryCount + 1);
                    }

                    throw new Error(responseData.message || responseData.error || 'Backend rejected the request');
                }

                return {
                    success: true,
                    data: responseData || null,
                    message: 'Invoice created successfully'
                };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            // Retry on server errors
            if (retryCount < maxRetries &&
                error.response?.status &&
                [500, 502, 503, 504].includes(error.response.status)) {

                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
                return await this.createInvoice(invoiceData, retryCount + 1);
            }

            // Retry on network errors
            if (retryCount < maxRetries && !error.response && error.request) {
                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 800));
                return await this.createInvoice(invoiceData, retryCount + 1);
            }

            // Return error
            let errorMessage = 'Failed to create invoice';
            let errorDetails = {
                status: error.response?.status,
                isNetworkError: !error.response && !!error.request,
                isRetryExhausted: retryCount >= maxRetries,
                totalAttempts: retryCount + 1
            };

            if (error.response?.data) {
                errorMessage = error.response.data.message ||
                    error.response.data.error ||
                    `Server error: ${error.response.status}`;
            } else if (error.request) {
                errorMessage = 'Network error - unable to reach server';
            } else {
                errorMessage = error.message || 'Unknown error occurred';
            }

            if (retryCount >= maxRetries) {
                errorMessage += ` (Failed after ${retryCount + 1} attempts)`;
            }

            return {
                success: false,
                error: errorMessage,
                message: errorMessage,
                details: errorDetails
            };
        }
    }

    // ✅ FIXED: Clean invoice data with proper payment method normalization
    cleanInvoiceData(invoiceData) {
        const customerInfo = this.extractCustomerInfo(invoiceData);

        if (!customerInfo.id) {
            throw new Error('Please select a customer before saving the invoice. Customer selection is required.');
        }

        const paymentInfo = this.extractPaymentInfo(invoiceData);
        const cleanItems = this.cleanItems(invoiceData.items || []);
        const totals = this.calculateTotals(invoiceData, cleanItems);

        const cleanData = {
            // Company info
            companyId: invoiceData.companyId,

            // Customer info - multiple formats for backend compatibility
            customer: customerInfo.id,
            customerId: customerInfo.id,
            customerName: customerInfo.name,
            customerMobile: customerInfo.mobile,

            // Invoice details
            invoiceNumber: invoiceData.invoiceNumber || `INV-${Date.now()}`,
            invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
            invoiceType: invoiceData.gstEnabled ? 'gst' : 'non-gst',
            gstEnabled: Boolean(invoiceData.gstEnabled),
            documentType: invoiceData.documentType || 'invoice',

            // Items and totals
            items: cleanItems,
            totals: totals,

            // Payment info
            payment: paymentInfo,

            // Additional details
            notes: invoiceData.notes || '',
            status: invoiceData.status || 'draft',
            termsAndConditions: invoiceData.termsAndConditions || '',

            // Tax configuration
            taxMode: invoiceData.taxMode || invoiceData.globalTaxMode || 'without-tax',
            priceIncludesTax: invoiceData.priceIncludesTax || false,

            // Round off
            roundOff: invoiceData.roundOffValue || 0,
            roundOffEnabled: invoiceData.roundOffEnabled || false
        };

        // Final validation
        if (!cleanData.companyId) {
            throw new Error('Company ID is required');
        }

        if (!cleanData.customer) {
            throw new Error('Customer ID is required. Please select a customer before saving.');
        }

        if (!cleanData.items || cleanData.items.length === 0) {
            throw new Error('At least one item is required');
        }

        return cleanData;
    }

    // Extract customer info from various sources
    extractCustomerInfo(invoiceData) {
        let customerId = null;

        if (typeof invoiceData.customer === 'string' && invoiceData.customer.trim() !== '') {
            customerId = invoiceData.customer.trim();
        } else if (typeof invoiceData.customer === 'object' && invoiceData.customer) {
            customerId = invoiceData.customer._id || invoiceData.customer.id;
        } else {
            customerId = invoiceData.selectedCustomer?._id ||
                invoiceData.selectedCustomer?.id ||
                invoiceData.customerId ||
                invoiceData.party?._id ||
                invoiceData.party?.id ||
                invoiceData.selectedParty?._id ||
                invoiceData.selectedParty?.id ||
                invoiceData.partyId ||
                null;
        }

        const customerName = invoiceData.customerName ||
            invoiceData.customer?.name ||
            invoiceData.customer?.businessName ||
            invoiceData.selectedCustomer?.name ||
            invoiceData.selectedCustomer?.businessName ||
            invoiceData.party?.name ||
            invoiceData.party?.businessName ||
            invoiceData.selectedParty?.name ||
            invoiceData.selectedParty?.businessName ||
            invoiceData.partyName ||
            'Walk-in Customer';

        const customerMobile = invoiceData.customerMobile ||
            invoiceData.customer?.mobile ||
            invoiceData.customer?.phone ||
            invoiceData.selectedCustomer?.mobile ||
            invoiceData.selectedCustomer?.phone ||
            invoiceData.party?.mobile ||
            invoiceData.party?.phone ||
            invoiceData.selectedParty?.mobile ||
            invoiceData.selectedParty?.phone ||
            invoiceData.mobileNumber ||
            '';

        return {
            name: customerName,
            mobile: customerMobile,
            id: customerId
        };
    }

    // ✅ CRITICAL FIX: Extract payment info with proper method normalization
    extractPaymentInfo(invoiceData) {
        let paymentAmount = 0;
        let paymentMethod = 'cash'; // Default to lowercase
        let bankAccountId = null;
        let bankAccountName = null;
        let reference = '';
        let notes = '';
        let dueDate = null;
        let creditDays = 0;

        // Priority 1: paymentData from PaymentModal
        if (invoiceData.paymentData && invoiceData.paymentData.amount) {
            paymentAmount = parseFloat(invoiceData.paymentData.amount);
            paymentMethod = this.normalizePaymentMethod(invoiceData.paymentData.paymentType || invoiceData.paymentData.method || 'cash');
            bankAccountId = invoiceData.paymentData.bankAccountId || null;
            bankAccountName = invoiceData.paymentData.bankAccountName || null;
            reference = invoiceData.paymentData.reference || '';
            notes = invoiceData.paymentData.notes || '';
            dueDate = invoiceData.paymentData.dueDate || null;
            creditDays = invoiceData.paymentData.creditDays || 0;
        }
        // Priority 2: payment object
        else if (invoiceData.payment) {
            paymentAmount = parseFloat(invoiceData.payment.paidAmount || invoiceData.payment.amount || 0);
            paymentMethod = this.normalizePaymentMethod(invoiceData.payment.method || 'cash');
            bankAccountId = invoiceData.payment.bankAccountId || null;
            bankAccountName = invoiceData.payment.bankAccountName || null;
            reference = invoiceData.payment.reference || '';
            notes = invoiceData.payment.notes || '';
            dueDate = invoiceData.payment.dueDate || null;
            creditDays = invoiceData.payment.creditDays || 0;
        }
        // Priority 3: direct properties
        else if (invoiceData.paymentReceived) {
            paymentAmount = parseFloat(invoiceData.paymentReceived);
            paymentMethod = this.normalizePaymentMethod(invoiceData.paymentMethod || 'cash');
            dueDate = invoiceData.dueDate || null;
            creditDays = invoiceData.creditDays || 0;
        }

        const finalTotal = parseFloat(
            invoiceData.totals?.finalTotalWithRoundOff ||
            invoiceData.totals?.finalTotal ||
            0
        );
        const pendingAmount = Math.max(0, finalTotal - paymentAmount);

        return {
            method: paymentMethod, // ✅ Now properly normalized
            paidAmount: paymentAmount,
            pendingAmount: pendingAmount,
            status: this.getPaymentStatus(paymentAmount, finalTotal),
            paymentDate: new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            creditDays: parseInt(creditDays) || 0,
            reference: reference,
            notes: notes,
            bankAccountId: bankAccountId,
            bankAccountName: bankAccountName
        };
    }

    // ✅ NEW: Normalize payment method to match backend enum values
    normalizePaymentMethod(method) {
        if (!method) return 'cash';

        // Convert to lowercase and handle common variations
        const normalizedMethod = method.toString().toLowerCase().trim();

        // Map common variations to backend enum values
        const methodMap = {
            'cash': 'cash',
            'upi': 'upi',
            'bank_transfer': 'bank_transfer',
            'banktransfer': 'bank_transfer',
            'bank transfer': 'bank_transfer',
            'cheque': 'cheque',
            'check': 'cheque',
            'card': 'card',
            'online': 'online',
            'online_transfer': 'online_transfer',
            'onlinetransfer': 'online_transfer',
            'online transfer': 'online_transfer',
            'neft': 'neft',
            'rtgs': 'rtgs'
        };

        return methodMap[normalizedMethod] || 'cash';
    }

    // Clean items array
    cleanItems(items) {
        return items.map((item, index) => {
            const quantity = parseFloat(item.quantity) || 1;
            const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
            const taxRate = parseFloat(item.taxRate || item.gstRate) || 0;
            const discountPercent = parseFloat(item.discountPercent) || 0;
            const discountAmount = parseFloat(item.discountAmount) || 0;

            return {
                itemRef: item.itemRef || item.itemId || null,
                itemName: item.itemName || `Item ${index + 1}`,
                itemCode: item.itemCode || '',
                hsnCode: item.hsnCode || '0000',
                category: item.category || '',

                quantity: quantity,
                unit: item.unit || 'PCS',
                pricePerUnit: pricePerUnit,

                taxRate: taxRate,
                taxMode: item.taxMode || 'without-tax',
                priceIncludesTax: item.priceIncludesTax || false,

                discountPercent: discountPercent,
                discountAmount: discountAmount,

                cgst: parseFloat(item.cgstAmount || item.cgst) || 0,
                sgst: parseFloat(item.sgstAmount || item.sgst) || 0,
                igst: parseFloat(item.igstAmount || item.igst) || 0,
                cgstAmount: parseFloat(item.cgstAmount || item.cgst) || 0,
                sgstAmount: parseFloat(item.sgstAmount || item.sgst) || 0,
                igstAmount: parseFloat(item.igstAmount || item.igst) || 0,

                amount: parseFloat(item.amount) || (quantity * pricePerUnit),
                taxableAmount: parseFloat(item.taxableAmount) || 0,
                totalTaxAmount: parseFloat(item.totalTaxAmount) || 0,
                itemAmount: parseFloat(item.itemAmount || item.amount) || (quantity * pricePerUnit)
            };
        });
    }

    // Calculate totals
    calculateTotals(invoiceData, cleanItems) {
        if (invoiceData.totals) {
            return {
                subtotal: parseFloat(invoiceData.totals.subtotal) || 0,
                totalQuantity: cleanItems.reduce((sum, item) => sum + item.quantity, 0),
                totalDiscount: parseFloat(invoiceData.totals.totalDiscountAmount || invoiceData.totals.totalDiscount) || 0,
                totalTax: parseFloat(invoiceData.totals.totalTax) || 0,
                totalCGST: parseFloat(invoiceData.totals.totalCGST || invoiceData.totals.totalCgstAmount) || 0,
                totalSGST: parseFloat(invoiceData.totals.totalSGST || invoiceData.totals.totalSgstAmount) || 0,
                totalIGST: parseFloat(invoiceData.totals.totalIGST || invoiceData.totals.totalIgstAmount) || 0,
                totalTaxableAmount: parseFloat(invoiceData.totals.totalTaxableAmount) || 0,
                finalTotal: parseFloat(invoiceData.totals.finalTotalWithRoundOff || invoiceData.totals.finalTotal) || 0,
                roundOff: parseFloat(invoiceData.totals.roundOffValue) || 0
            };
        }

        const subtotal = cleanItems.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
        const totalDiscount = cleanItems.reduce((sum, item) => sum + item.discountAmount, 0);
        const totalTax = cleanItems.reduce((sum, item) => sum + (item.cgstAmount + item.sgstAmount + item.igstAmount), 0);
        const totalTaxableAmount = subtotal - totalDiscount;
        const finalTotal = totalTaxableAmount + totalTax;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            totalQuantity: cleanItems.reduce((sum, item) => sum + item.quantity, 0),
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            totalCGST: cleanItems.reduce((sum, item) => sum + item.cgstAmount, 0),
            totalSGST: cleanItems.reduce((sum, item) => sum + item.sgstAmount, 0),
            totalIGST: cleanItems.reduce((sum, item) => sum + item.igstAmount, 0),
            totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
            finalTotal: Math.round(finalTotal * 100) / 100,
            roundOff: 0
        };
    }

    // Get payment status
    getPaymentStatus(paid, total) {
        if (paid >= total) return 'paid';
        if (paid > 0) return 'partial';
        return 'pending';
    }

    // Get all invoices
    async getInvoices(companyId, filters = {}) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const params = { companyId, ...filters };
            const response = await api.get('/sales', { params });

            if (response.status >= 200 && response.status < 300) {
                const responseData = response.data;

                if (responseData?.success === true && Array.isArray(responseData.data)) {
                    return {
                        success: true,
                        data: responseData.data,
                        message: responseData.message || 'Invoices fetched successfully'
                    };
                }

                if (responseData?.success === true && responseData.data) {
                    const nestedData = responseData.data.sales ||
                        responseData.data.invoices ||
                        responseData.data.items ||
                        responseData.data.records ||
                        [];

                    return {
                        success: true,
                        data: Array.isArray(nestedData) ? nestedData : [],
                        message: responseData.message || 'Invoices fetched successfully'
                    };
                }

                if (Array.isArray(responseData)) {
                    return {
                        success: true,
                        data: responseData,
                        message: 'Invoices fetched successfully'
                    };
                }

                if (responseData && typeof responseData === 'object') {
                    const possibleArrays = [
                        responseData.sales,
                        responseData.invoices,
                        responseData.data,
                        responseData.items,
                        responseData.records
                    ];

                    for (const arr of possibleArrays) {
                        if (Array.isArray(arr)) {
                            return {
                                success: true,
                                data: arr,
                                message: 'Invoices fetched successfully'
                            };
                        }
                    }
                }

                if (responseData?.success === false) {
                    throw new Error(responseData.message || 'API returned failure');
                }

                return {
                    success: true,
                    data: [],
                    message: 'No invoices found'
                };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // Get single invoice
    async getInvoiceById(id) {
        try {
            if (!id) {
                throw new Error('Invoice ID is required');
            }

            const response = await api.get(`/sales/${id}`);

            if (response.data?.success !== false) {
                return {
                    success: true,
                    data: response.data?.data || response.data,
                    message: response.data?.message || 'Invoice fetched successfully'
                };
            } else {
                throw new Error(response.data?.message || 'Invoice not found');
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update invoice
    async updateInvoice(id, invoiceData) {
        try {
            if (!id) {
                throw new Error('Invoice ID is required');
            }

            const cleanData = this.cleanInvoiceData(invoiceData);
            const response = await api.put(`/sales/${id}`, cleanData);

            if (response.data?.success !== false) {
                return {
                    success: true,
                    data: response.data?.data || response.data,
                    message: response.data?.message || 'Invoice updated successfully'
                };
            } else {
                throw new Error(response.data?.message || 'Failed to update invoice');
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete invoice
    async deleteInvoice(id) {
        try {
            if (!id) {
                throw new Error('Invoice ID is required');
            }

            const response = await api.delete(`/sales/${id}`);

            if (response.data?.success !== false) {
                return {
                    success: true,
                    message: response.data?.message || 'Invoice deleted successfully'
                };
            } else {
                throw new Error(response.data?.message || 'Failed to delete invoice');
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get dashboard data
    async getDashboardData(companyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await api.get('/sales/dashboard', {
                params: { companyId }
            });

            if (response.data?.success !== false) {
                return {
                    success: true,
                    data: response.data?.data || response.data,
                    message: response.data?.message || 'Dashboard data fetched successfully'
                };
            } else {
                throw new Error(response.data?.message || 'Failed to get dashboard data');
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: {}
            };
        }
    }

    // Get overdue sales
    async getOverdueSales(companyId) {
        try {
            const response = await this.getInvoices(companyId, {
                paymentStatus: 'pending,partial'
            });

            if (response.success && response.data) {
                let salesData = response.data;

                if (!Array.isArray(salesData)) {
                    salesData = salesData.sales ||
                        salesData.invoices ||
                        salesData.items ||
                        salesData.records ||
                        [];

                    if (!Array.isArray(salesData)) {
                        return {
                            success: true,
                            data: [],
                            message: 'No sales data found'
                        };
                    }
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const overdueSales = salesData.filter(sale => {
                    if (!sale.payment?.dueDate) return false;

                    try {
                        const dueDate = new Date(sale.payment.dueDate);
                        dueDate.setHours(0, 0, 0, 0);

                        const isOverdue = dueDate < today;
                        const hasPendingAmount = (sale.payment.pendingAmount || 0) > 0;

                        return isOverdue && hasPendingAmount;
                    } catch (dateError) {
                        return false;
                    }
                });

                return {
                    success: true,
                    data: overdueSales,
                    message: 'Overdue sales fetched successfully'
                };
            }

            return {
                success: false,
                data: [],
                error: 'Failed to fetch sales data'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // Get sales due today
    async getSalesDueToday(companyId) {
        try {
            const response = await this.getInvoices(companyId, {
                paymentStatus: 'pending,partial'
            });

            if (response.success && response.data) {
                let salesData = response.data;

                if (!Array.isArray(salesData)) {
                    salesData = salesData.sales ||
                        salesData.invoices ||
                        salesData.items ||
                        salesData.records ||
                        [];

                    if (!Array.isArray(salesData)) {
                        return {
                            success: true,
                            data: [],
                            message: 'No sales data found'
                        };
                    }
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const salesDueToday = salesData.filter(sale => {
                    if (!sale.payment?.dueDate) return false;

                    try {
                        const dueDate = new Date(sale.payment.dueDate);
                        dueDate.setHours(0, 0, 0, 0);

                        const isDueToday = dueDate.getTime() === today.getTime();
                        const hasPendingAmount = (sale.payment.pendingAmount || 0) > 0;

                        return isDueToday && hasPendingAmount;
                    } catch (dateError) {
                        return false;
                    }
                });

                return {
                    success: true,
                    data: salesDueToday,
                    message: 'Sales due today fetched successfully'
                };
            }

            return {
                success: false,
                data: [],
                error: 'Failed to fetch sales data'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // Get sales by payment status
    async getSalesByPaymentStatus(companyId, status = 'pending') {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await this.getInvoices(companyId, {
                paymentStatus: status
            });

            if (response.success) {
                return {
                    success: true,
                    data: response.data || [],
                    message: 'Sales by payment status fetched successfully'
                };
            } else {
                throw new Error(response.error || 'Failed to fetch sales by payment status');
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // Get payment schedule
    async getPaymentSchedule(companyId, startDate, endDate) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await this.getInvoices(companyId, {
                startDate,
                endDate,
                includeDueDates: true
            });

            if (response.success) {
                return {
                    success: true,
                    data: response.data || [],
                    message: 'Payment schedule fetched successfully'
                };
            } else {
                throw new Error(response.error || 'Failed to fetch payment schedule');
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // Mark payment as received
    async markPaymentReceived(saleId, paymentData) {
        try {
            if (!saleId) {
                throw new Error('Sale ID is required');
            }

            const currentSale = await this.getInvoiceById(saleId);
            if (!currentSale.success) {
                throw new Error('Unable to fetch current sale data');
            }

            const updateData = {
                payment: {
                    ...currentSale.data.payment,
                    paidAmount: (currentSale.data.payment?.paidAmount || 0) + parseFloat(paymentData.amount || 0),
                    status: 'paid',
                    lastPaymentDate: new Date(),
                    paymentMethod: this.normalizePaymentMethod(paymentData.method || 'cash'), // ✅ Fixed
                    reference: paymentData.reference || '',
                    notes: paymentData.notes || ''
                }
            };

            return await this.updateInvoice(saleId, updateData);

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get sales summary
    async getSalesSummary(companyId, dateRange = '30d') {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const endDate = new Date();
            const startDate = new Date();

            switch (dateRange) {
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(endDate.getDate() - 90);
                    break;
                case '1y':
                    startDate.setFullYear(endDate.getFullYear() - 1);
                    break;
                default:
                    startDate.setDate(endDate.getDate() - 30);
            }

            const response = await this.getInvoices(companyId, {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });

            if (response.success && response.data) {
                const summary = {
                    totalSales: response.data.length,
                    totalAmount: response.data.reduce((sum, sale) => sum + (sale.totals?.finalTotal || 0), 0),
                    totalPaid: response.data.reduce((sum, sale) => sum + (sale.payment?.paidAmount || 0), 0),
                    totalPending: response.data.reduce((sum, sale) => sum + (sale.payment?.pendingAmount || 0), 0),
                    paidSales: response.data.filter(sale => sale.payment?.status === 'paid').length,
                    pendingSales: response.data.filter(sale => sale.payment?.status === 'pending').length,
                    partialSales: response.data.filter(sale => sale.payment?.status === 'partial').length
                };

                return {
                    success: true,
                    data: summary,
                    message: 'Sales summary fetched successfully'
                };
            }

            return { success: false, data: {}, error: 'Failed to fetch sales summary' };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: {}
            };
        }
    }

    // Search sales
    async searchSales(companyId, searchQuery, filters = {}) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await this.getInvoices(companyId, {
                search: searchQuery,
                ...filters
            });

            if (response.success) {
                return {
                    success: true,
                    data: response.data || [],
                    message: 'Sales search completed successfully'
                };
            } else {
                throw new Error(response.error || 'Failed to search sales');
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-IN');
    }

    getDaysDifference(date1, date2) {
        const diffTime = Math.abs(new Date(date2) - new Date(date1));
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Test connection
    async testConnection() {
        try {
            const response = await api.get('/health');
            return { success: true, message: 'Connection successful' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

const salesService = new SalesService();
export default salesService;