const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Import transaction service
import transactionService from './transactionService.js';

class SalesService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Helper method to get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            sessionStorage.getItem('token');

        return {
            'Content-Type': 'application/json',
            ...(token && {
                'Authorization': `Bearer ${token}`,
                'x-auth-token': token
            })
        };
    }

    // Helper method for API calls
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            let data;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                let errorMessage = data.message || `HTTP error! status: ${response.status}`;

                if (response.status === 400) {
                    errorMessage = data.message || 'Invalid sales data';
                } else if (response.status === 401) {
                    errorMessage = 'Authentication required. Please login again.';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. You do not have permission for this operation.';
                } else if (response.status === 404) {
                    errorMessage = 'Sale or resource not found.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }

                throw new Error(errorMessage);
            }

            return data;

        } catch (error) {
            throw error;
        }
    }

    // ==================== ENHANCED SALES METHODS WITH TRANSACTIONS ====================

    /**
     * Create invoice with automatic transaction (Enhanced Version)
     * @param {Object} invoiceData - Invoice data
     * @returns {Promise<Object>} Created invoice with transaction
     */
    async createInvoiceWithTransaction(invoiceData) {
        try {
            // Validate required fields for transaction
            if (!invoiceData.companyId) {
                throw new Error('Company ID is required');
            }

            // First create the invoice using existing method
            const invoiceResponse = await this.createInvoice(invoiceData);

            if (!invoiceResponse.success) {
                throw new Error(invoiceResponse.message || 'Failed to create invoice');
            }

            const createdInvoice = invoiceResponse.data;

            // Check if payment was received and create transaction
            const paymentReceived = parseFloat(invoiceData.paymentReceived || invoiceData.payment?.paidAmount || 0);

            if (paymentReceived > 0 && invoiceData.bankAccountId) {
                try {
                    const transactionData = {
                        bankAccountId: invoiceData.bankAccountId,
                        amount: paymentReceived,
                        paymentMethod: invoiceData.paymentMethod || 'cash',
                        description: `Sales receipt for invoice ${createdInvoice.invoiceNumber || 'N/A'}`,
                        notes: `Payment received for sale to ${invoiceData.customerName || invoiceData.customer?.name || 'customer'}`,
                        customerId: invoiceData.customer?.id || invoiceData.customerId || null,
                        customerName: invoiceData.customerName || invoiceData.customer?.name || '',
                        saleId: createdInvoice._id || createdInvoice.id,
                        invoiceNumber: createdInvoice.invoiceNumber,
                        chequeNumber: invoiceData.chequeNumber || '',
                        chequeDate: invoiceData.chequeDate || null,
                        upiTransactionId: invoiceData.upiTransactionId || '',
                        bankTransactionId: invoiceData.bankTransactionId || '',
                        dueDate: invoiceData.dueDate || invoiceData.payment?.dueDate || null,
                        creditDays: invoiceData.creditDays || invoiceData.payment?.creditDays || 0
                    };

                    const transactionResponse = await transactionService.createSalesTransaction(
                        invoiceData.companyId,
                        transactionData
                    );

                    // Add transaction info to invoice response
                    createdInvoice.transaction = transactionResponse.data;
                    createdInvoice.transactionId = transactionResponse.data.transactionId;

                } catch (transactionError) {
                    // Don't fail the whole operation, just add warning
                    createdInvoice.transactionError = transactionError.message;
                    createdInvoice.transactionWarning = 'Invoice created successfully, but payment transaction could not be recorded. You can add payment manually later.';
                }
            } else if (paymentReceived > 0 && !invoiceData.bankAccountId) {
                createdInvoice.transactionWarning = 'Payment amount specified but no bank account selected. Transaction not created.';
            }

            return {
                success: true,
                data: createdInvoice,
                message: 'Invoice created successfully' +
                    (createdInvoice.transaction ? ' with payment transaction' : '') +
                    (createdInvoice.transactionWarning ? '. Note: ' + createdInvoice.transactionWarning : '')
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Add payment to existing sale with transaction - UPDATED with due date support
     * @param {string} companyId - Company ID
     * @param {string} saleId - Sale ID
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Updated sale with transaction
     */
    async addPaymentWithTransaction(companyId, saleId, paymentData) {
        try {
            // Validate required fields
            if (!companyId) {
                throw new Error('Company ID is required');
            }
            if (!saleId) {
                throw new Error('Sale ID is required');
            }
            if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
                throw new Error('Valid payment amount is required');
            }
            if (!paymentData.bankAccountId) {
                throw new Error('Bank account is required for payment transaction');
            }

            // First get the sale details
            const saleResponse = await this.getInvoiceById(saleId);
            if (!saleResponse.success) {
                throw new Error('Sale not found');
            }

            const sale = saleResponse.data;

            // Add payment to sale using existing method - UPDATED with due date support
            const paymentResponse = await this.addPayment(saleId, {
                ...paymentData,
                dueDate: paymentData.dueDate || null,
                creditDays: paymentData.creditDays || 0
            });

            if (!paymentResponse.success) {
                throw new Error(paymentResponse.message || 'Failed to add payment');
            }

            // Create transaction for the payment
            const paymentAmount = parseFloat(paymentData.amount);

            try {
                const transactionData = {
                    bankAccountId: paymentData.bankAccountId,
                    amount: paymentAmount,
                    paymentMethod: paymentData.method || paymentData.paymentMethod || 'cash',
                    description: `Payment received for invoice ${sale.invoiceNumber || saleId}`,
                    notes: paymentData.notes || `Additional payment received from ${sale.customerName || 'customer'}`,
                    customerId: sale.customer?._id || sale.customer?.id || null,
                    customerName: sale.customerName || sale.customer?.name || '',
                    saleId: saleId,
                    invoiceNumber: sale.invoiceNumber,
                    chequeNumber: paymentData.chequeNumber || '',
                    chequeDate: paymentData.chequeDate || null,
                    upiTransactionId: paymentData.upiTransactionId || '',
                    bankTransactionId: paymentData.bankTransactionId || '',
                    dueDate: paymentData.dueDate || null,
                    creditDays: paymentData.creditDays || 0
                };

                const transactionResponse = await transactionService.createSalesTransaction(
                    companyId,
                    transactionData
                );

                // Add transaction info to payment response
                paymentResponse.data.transaction = transactionResponse.data;
                paymentResponse.data.transactionId = transactionResponse.data.transactionId;

            } catch (transactionError) {
                paymentResponse.data.transactionError = transactionError.message;
                paymentResponse.data.transactionWarning = 'Payment recorded successfully, but bank transaction could not be created. Please check your bank account settings.';
            }

            return {
                success: true,
                data: paymentResponse.data,
                message: 'Payment added successfully' +
                    (paymentResponse.data.transaction ? ' with bank transaction' : '') +
                    (paymentResponse.data.transactionWarning ? '. Note: ' + paymentResponse.data.transactionWarning : '')
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Create quick cash sale with automatic transaction
     * @param {Object} saleData - Quick sale data
     * @returns {Promise<Object>} Created sale with transaction
     */
    async createQuickSaleWithTransaction(saleData) {
        try {
            // Validate required fields
            if (!saleData.companyId) {
                throw new Error('Company ID is required');
            }
            if (!saleData.amount || parseFloat(saleData.amount) <= 0) {
                throw new Error('Valid sale amount is required');
            }
            if (!saleData.bankAccountId) {
                throw new Error('Bank account is required for cash sale');
            }

            // Prepare invoice data for quick sale
            const quickInvoiceData = {
                companyId: saleData.companyId,
                customerName: saleData.customerName || 'Cash Customer',
                customerMobile: saleData.customerMobile || '',
                invoiceType: 'non-gst',
                gstEnabled: false,
                paymentMethod: saleData.paymentMethod || 'cash',
                paymentReceived: saleData.amount,
                bankAccountId: saleData.bankAccountId,
                items: saleData.items || [{
                    itemName: saleData.itemName || 'Quick Sale Item',
                    quantity: 1,
                    pricePerUnit: parseFloat(saleData.amount),
                    taxRate: 0,
                    amount: parseFloat(saleData.amount)
                }],
                totals: {
                    subtotal: parseFloat(saleData.amount),
                    totalDiscount: 0,
                    totalTax: 0,
                    finalTotal: parseFloat(saleData.amount)
                },
                notes: saleData.notes || 'Quick cash sale',
                status: 'completed',
                chequeNumber: saleData.chequeNumber,
                chequeDate: saleData.chequeDate,
                upiTransactionId: saleData.upiTransactionId,
                bankTransactionId: saleData.bankTransactionId,
                dueDate: saleData.dueDate || null,
                creditDays: saleData.creditDays || 0
            };

            // Create invoice with transaction
            const result = await this.createInvoiceWithTransaction(quickInvoiceData);

            return {
                ...result,
                message: 'Quick sale created successfully' +
                    (result.data.transaction ? ' with payment transaction' : '')
            };

        } catch (error) {
            throw error;
        }
    }

    // ==================== EXISTING METHODS ====================

    // Create new sale/invoice
    async createInvoice(invoiceData) {
        // Transform frontend data to backend format
        const backendData = this.transformToBackendFormat(invoiceData);

        return await this.apiCall('/sales', {
            method: 'POST',
            body: JSON.stringify(backendData)
        });
    }

    // Get all sales/invoices
    async getInvoices(companyId, filters = {}) {
        const queryParams = new URLSearchParams({
            companyId,
            ...filters
        });

        return await this.apiCall(`/sales?${queryParams}`);
    }

    // Get single invoice by ID
    async getInvoiceById(id) {
        return await this.apiCall(`/sales/${id}`);
    }

    // Update invoice
    async updateInvoice(id, invoiceData) {
        const backendData = this.transformToBackendFormat(invoiceData);

        return await this.apiCall(`/sales/${id}`, {
            method: 'PUT',
            body: JSON.stringify(backendData)
        });
    }

    // Delete invoice (soft delete - marks as cancelled)
    async deleteInvoice(id) {
        return await this.apiCall(`/sales/${id}`, {
            method: 'DELETE'
        });
    }

    // Add payment to sale with due date support
    async addPayment(saleId, paymentData) {
        return await this.apiCall(`/sales/${saleId}/payments`, {
            method: 'POST',
            body: JSON.stringify({
                amount: paymentData.amount,
                method: paymentData.method || paymentData.paymentMethod || 'cash',
                reference: paymentData.reference || '',
                paymentDate: paymentData.paymentDate || null,
                dueDate: paymentData.dueDate || null,
                creditDays: paymentData.creditDays || null,
                notes: paymentData.notes || ''
            })
        });
    }

    // Get dashboard data
    async getDashboardData(companyId) {
        return await this.apiCall(`/sales/dashboard?companyId=${companyId}`);
    }

    // Get next invoice number
    async getNextInvoiceNumber(companyId, invoiceType = 'gst') {
        return await this.apiCall(`/sales/next-invoice-number?companyId=${companyId}&invoiceType=${invoiceType}`);
    }

    // Get today's sales
    async getTodaysSales(companyId) {
        return await this.apiCall(`/sales/today?companyId=${companyId}`);
    }

    // Get monthly report
    async getMonthlyReport(companyId, year, month) {
        return await this.apiCall(`/sales/monthly-report?companyId=${companyId}&year=${year}&month=${month}`);
    }

    // Get customer stats
    async getCustomerStats(companyId, customerId) {
        return await this.apiCall(`/sales/customer-stats?companyId=${companyId}&customerId=${customerId}`);
    }

    // Complete sale
    async completeSale(saleId) {
        return await this.apiCall(`/sales/${saleId}/complete`, {
            method: 'POST'
        });
    }

    // Validate stock before creating sale
    async validateStock(items) {
        return await this.apiCall('/sales/validate-stock', {
            method: 'POST',
            body: JSON.stringify({ items })
        });
    }

    // Export sales to CSV
    async exportCSV(companyId, filters = {}) {
        const queryParams = new URLSearchParams({
            companyId,
            ...filters
        });

        const response = await fetch(`${this.baseURL}/sales/export-csv?${queryParams}`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to export CSV');
        }

        return response.blob();
    }

    // Get overdue sales with fallback to client-side filtering
    async getOverdueSales(companyId) {
        try {
            // Try the dedicated endpoint first
            return await this.apiCall(`/sales/overdue?companyId=${companyId}`);
        } catch (error) {
            // Fallback: Get all sales and filter client-side for overdue
            try {
                const salesResponse = await this.getInvoices(companyId);

                if (!salesResponse.success) {
                    return {
                        success: false,
                        message: 'Failed to fetch sales data',
                        data: []
                    };
                }

                const allSales = salesResponse.data.sales || [];
                const today = new Date();

                // Filter for overdue sales
                const overdueSales = allSales.filter(sale => {
                    const pendingAmount = sale.payment?.pendingAmount || 0;
                    const dueDate = sale.payment?.dueDate;

                    if (!dueDate || pendingAmount <= 0) return false;

                    const due = new Date(dueDate);
                    return due < today;
                });

                return {
                    success: true,
                    data: overdueSales,
                    message: `Found ${overdueSales.length} overdue sales`
                };

            } catch (fallbackError) {
                return {
                    success: false,
                    message: 'Unable to fetch overdue sales',
                    data: []
                };
            }
        }
    }

    // Get sales due today with fallback to client-side filtering
    async getSalesDueToday(companyId) {
        try {
            // Try the dedicated endpoint first
            return await this.apiCall(`/sales/due-today?companyId=${companyId}`);
        } catch (error) {
            // Fallback: Get all sales and filter client-side for due today
            try {
                const salesResponse = await this.getInvoices(companyId);

                if (!salesResponse.success) {
                    return {
                        success: false,
                        message: 'Failed to fetch sales data',
                        data: []
                    };
                }

                const allSales = salesResponse.data.sales || [];
                const today = new Date();
                const todayString = today.toDateString();

                // Filter for sales due today
                const salesDueToday = allSales.filter(sale => {
                    const pendingAmount = sale.payment?.pendingAmount || 0;
                    const dueDate = sale.payment?.dueDate;

                    if (!dueDate || pendingAmount <= 0) return false;

                    const due = new Date(dueDate);
                    return due.toDateString() === todayString;
                });

                return {
                    success: true,
                    data: salesDueToday,
                    message: `Found ${salesDueToday.length} sales due today`
                };

            } catch (fallbackError) {
                return {
                    success: false,
                    message: 'Unable to fetch sales due today',
                    data: []
                };
            }
        }
    }

    // Get payment summary with overdue info
    async getPaymentSummaryWithOverdue(companyId, dateFrom, dateTo) {
        const queryParams = new URLSearchParams({
            companyId,
            ...(dateFrom && { dateFrom: this.formatDateForAPI(dateFrom) }),
            ...(dateTo && { dateTo: this.formatDateForAPI(dateTo) })
        });

        try {
            return await this.apiCall(`/sales/payment-summary-overdue?${queryParams}`);
        } catch (error) {
            // Fallback to enhanced payment summary
            return await this.getEnhancedPaymentSummary(companyId, {
                dateFrom: dateFrom,
                dateTo: dateTo
            });
        }
    }

    // Update payment due date
    async updatePaymentDueDate(saleId, dueDate, creditDays) {
        return await this.apiCall(`/sales/${saleId}/due-date`, {
            method: 'PUT',
            body: JSON.stringify({
                dueDate: dueDate,
                creditDays: creditDays
            })
        });
    }

    // Transform frontend data to backend format
    transformToBackendFormat(invoiceData) {
        // Extract customer information
        const customerName = invoiceData.customer?.name ||
            invoiceData.customerData?.name ||
            invoiceData.partyName ||
            'Cash Customer';

        const customerMobile = invoiceData.customer?.mobile ||
            invoiceData.customer?.phone ||
            invoiceData.customerData?.phone ||
            invoiceData.mobileNumber ||
            '';

        // Extract tax mode information
        const globalTaxMode = invoiceData.globalTaxMode ||
            invoiceData.taxMode ||
            (invoiceData.priceIncludesTax ? 'with-tax' : 'without-tax') ||
            'without-tax';

        const priceIncludesTax = globalTaxMode === 'with-tax';

        // Enhanced payment information extraction
        const paymentInfo = invoiceData.paymentInfo || {};

        // Extract payment amount
        const paymentReceived = parseFloat(
            invoiceData.paymentReceived ||
            paymentInfo.amount ||
            invoiceData.payment?.paidAmount ||
            invoiceData.amount ||
            0
        );

        const finalTotal = parseFloat(invoiceData.totals?.finalTotal || 0);
        const pendingAmount = Math.max(0, finalTotal - paymentReceived);

        // Extract payment method
        const paymentMethod = paymentInfo.method ||
            paymentInfo.paymentMethod ||
            invoiceData.payment?.method ||
            invoiceData.paymentMethod ||
            'cash';

        // Extract bank account ID
        const bankAccountId = invoiceData.bankAccountId ||
            paymentInfo.bankAccountId ||
            invoiceData.payment?.bankAccountId ||
            null;

        // Enhanced due date extraction
        let dueDate = null;
        let creditDays = 0;

        // First, try to get explicit due date
        if (invoiceData.dueDate) {
            dueDate = new Date(invoiceData.dueDate).toISOString();
        } else if (paymentInfo.dueDate) {
            dueDate = new Date(paymentInfo.dueDate).toISOString();
        } else if (invoiceData.payment?.dueDate) {
            dueDate = new Date(invoiceData.payment.dueDate).toISOString();
        }

        // Second, try to get credit days and calculate due date
        const explicitCreditDays = parseInt(
            invoiceData.creditDays ||
            paymentInfo.creditDays ||
            invoiceData.payment?.creditDays ||
            0
        );

        if (explicitCreditDays > 0) {
            creditDays = explicitCreditDays;
            if (!dueDate) {
                const calculatedDueDate = new Date();
                calculatedDueDate.setDate(calculatedDueDate.getDate() + creditDays);
                dueDate = calculatedDueDate.toISOString();
            }
        }

        // Smart date parsing from payment notes
        if (!dueDate && paymentInfo.notes) {
            const notesText = paymentInfo.notes.toLowerCase();

            const datePatterns = [
                /(?:paid|due|payment|pay).*?(?:on|by)\s*(?:the\s*)?(\d{1,2})(?:th|st|nd|rd)?/i,
                /(\d{1,2})(?:th|st|nd|rd)?\s*(?:date|day|of)/i,
                /(\d{1,2})\s*(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)/i,
                /(?:remaining|balance|rest).*?(\d{1,2})/i
            ];

            for (const pattern of datePatterns) {
                const match = paymentInfo.notes.match(pattern);
                if (match) {
                    const dayNumber = parseInt(match[1]);

                    if (dayNumber >= 1 && dayNumber <= 31) {
                        const today = new Date();
                        const currentMonth = today.getMonth();
                        const currentYear = today.getFullYear();
                        const currentDay = today.getDate();

                        let calculatedDueDate = new Date(currentYear, currentMonth, dayNumber);

                        if (dayNumber <= currentDay) {
                            calculatedDueDate = new Date(currentYear, currentMonth + 1, dayNumber);
                        }

                        dueDate = calculatedDueDate.toISOString();
                        creditDays = Math.max(1, Math.ceil((calculatedDueDate - today) / (1000 * 60 * 60 * 24)));
                        break;
                    }
                }
            }
        }

        // Final fallback: if partial payment and no due date, set 30 days default
        if (!dueDate && pendingAmount > 0 && paymentReceived > 0) {
            creditDays = 30;
            const calculatedDueDate = new Date();
            calculatedDueDate.setDate(calculatedDueDate.getDate() + creditDays);
            dueDate = calculatedDueDate.toISOString();
        }

        // Additional payment details extraction
        const chequeNumber = invoiceData.chequeNumber ||
            paymentInfo.chequeNumber ||
            invoiceData.payment?.chequeNumber ||
            '';

        const chequeDate = invoiceData.chequeDate ||
            paymentInfo.chequeDate ||
            invoiceData.payment?.chequeDate ||
            null;

        const transactionId = invoiceData.transactionId ||
            paymentInfo.transactionId ||
            paymentInfo.upiTransactionId ||
            paymentInfo.bankTransactionId ||
            invoiceData.payment?.transactionId ||
            '';

        const paymentNotes = paymentInfo.notes ||
            invoiceData.notes ||
            invoiceData.payment?.notes ||
            '';

        // Process items with correct tax mode mapping
        const processedItems = (invoiceData.items || [])
            .filter(item =>
                item.itemName &&
                parseFloat(item.quantity) > 0 &&
                parseFloat(item.pricePerUnit) >= 0
            )
            .map((item, index) => {
                const itemTaxMode = item.taxMode ||
                    item.itemTaxMode ||
                    globalTaxMode;

                const itemPriceIncludesTax = itemTaxMode === 'with-tax';

                return {
                    itemRef: item.itemRef || item._id || item.id || null,
                    itemName: item.itemName || item.name,
                    hsnCode: item.hsnCode || item.hsnNumber || '0000',
                    quantity: parseFloat(item.quantity) || 1,
                    unit: item.unit || 'PCS',
                    pricePerUnit: parseFloat(item.pricePerUnit) || 0,
                    taxRate: parseFloat(item.taxRate || item.gstRate) || (itemPriceIncludesTax ? 18 : 0),
                    priceIncludesTax: itemPriceIncludesTax,
                    taxMode: itemTaxMode,
                    discountPercent: parseFloat(item.discountPercent) || 0,
                    discountAmount: parseFloat(item.discountAmount) || 0,
                    cgst: parseFloat(item.cgstAmount || item.cgst) || 0,
                    sgst: parseFloat(item.sgstAmount || item.sgst) || 0,
                    igst: parseFloat(item.igstAmount || item.igst) || 0,
                    itemAmount: parseFloat(item.amount || item.itemAmount) || 0,
                    lineNumber: item.lineNumber || (index + 1)
                };
            });

        const transformedData = {
            // Invoice basic info
            invoiceNumber: invoiceData.invoiceNumber,
            invoiceDate: invoiceData.invoiceDate || new Date().toISOString(),
            invoiceType: invoiceData.gstEnabled ? 'gst' : 'non-gst',
            gstEnabled: invoiceData.gstEnabled || false,
            priceIncludesTax: priceIncludesTax,
            companyId: invoiceData.companyId,

            // Customer information
            customerName: customerName,
            customerMobile: customerMobile,
            customer: invoiceData.customer?.id || invoiceData.customerId || null,

            // Items array with proper tax mode mapping
            items: processedItems,

            // Enhanced payment object
            payment: {
                method: paymentMethod,
                status: this.calculatePaymentStatus(paymentReceived, finalTotal),
                paidAmount: paymentReceived,
                pendingAmount: pendingAmount,
                paymentDate: paymentInfo.paymentDate ||
                    invoiceData.paymentDate ||
                    invoiceData.payment?.paymentDate ||
                    new Date().toISOString(),
                dueDate: dueDate,
                creditDays: creditDays,
                reference: paymentInfo.reference ||
                    invoiceData.paymentReference ||
                    invoiceData.payment?.reference ||
                    transactionId ||
                    chequeNumber ||
                    '',
                notes: paymentNotes,
                chequeNumber: chequeNumber,
                chequeDate: chequeDate,
                bankTransactionId: transactionId,
                upiTransactionId: transactionId,
                bankAccountId: bankAccountId
            },

            // Totals
            totals: {
                subtotal: parseFloat(invoiceData.totals?.subtotal) || 0,
                totalDiscount: parseFloat(invoiceData.totals?.totalDiscountAmount || invoiceData.totals?.totalDiscount) || 0,
                totalTax: parseFloat(invoiceData.totals?.totalTaxAmount || invoiceData.totals?.totalTax) || 0,
                finalTotal: finalTotal
            },

            // Additional information
            notes: invoiceData.notes || '',
            termsAndConditions: invoiceData.terms || invoiceData.termsAndConditions || '',
            status: invoiceData.status || 'completed',

            // Round off
            roundOff: parseFloat(invoiceData.roundOff) || 0,
            roundOffEnabled: invoiceData.roundOffEnabled || false,

            // Bank account info
            bankAccountId: bankAccountId,

            // Transaction-related fields
            chequeNumber: chequeNumber,
            chequeDate: chequeDate ? new Date(chequeDate).toISOString() : null,
            upiTransactionId: transactionId,
            bankTransactionId: transactionId,

            // Tax mode info
            globalTaxMode: globalTaxMode,
            paymentMethod: paymentMethod,
            dueDate: dueDate,
            creditDays: creditDays
        };

        return transformedData;
    }

    // Transform backend data to frontend format with due date support
    transformToFrontendFormat(backendData) {
        const sale = backendData.data || backendData;

        return {
            id: sale._id || sale.id,
            date: new Date(sale.invoiceDate).toLocaleDateString('en-GB'),
            invoiceNo: sale.invoiceNumber,
            partyName: sale.customer?.name || sale.customerName || 'Unknown Customer',
            partyPhone: sale.customer?.mobile || sale.customerMobile || '',
            transaction: sale.invoiceType === 'gst' ? 'GST Invoice' : 'Sale Invoice',
            paymentType: this.capitalizeFirst(sale.payment?.method || 'Cash'),

            // Tax information
            cgst: sale.totals?.totalTax ? sale.totals.totalTax / 2 : 0,
            sgst: sale.totals?.totalTax ? sale.totals.totalTax / 2 : 0,
            cgstPercent: 9,
            sgstPercent: 9,

            // Amounts
            amount: sale.totals?.finalTotal || 0,
            balance: sale.payment?.pendingAmount || 0,
            subtotal: sale.totals?.subtotal || 0,
            discount: sale.totals?.totalDiscount || 0,

            // Status
            status: this.mapPaymentStatus(sale.payment?.status),
            saleStatus: this.capitalizeFirst(sale.status),

            // Due date information
            dueDate: sale.payment?.dueDate,
            creditDays: sale.payment?.creditDays || 0,
            isOverdue: sale.isOverdue || false,
            daysOverdue: sale.daysOverdue || 0,

            // Additional data
            items: sale.items || [],
            gstEnabled: sale.gstEnabled || false,
            priceIncludesTax: sale.priceIncludesTax || false,
            roundOff: sale.roundOff || 0,
            notes: sale.notes || '',
            terms: sale.termsAndConditions || '',

            // Keep original sale data for editing
            originalSale: sale,

            // Payment details with due date
            paymentReceived: sale.payment?.paidAmount || 0,
            paymentMethod: sale.payment?.method || 'cash',
            paymentDate: sale.payment?.paymentDate,
            paymentReference: sale.payment?.reference || '',
            paymentDueDate: sale.payment?.dueDate,
            paymentCreditDays: sale.payment?.creditDays || 0,

            // Customer details for editing
            customer: {
                id: sale.customer?._id || sale.customer?.id,
                name: sale.customer?.name || sale.customerName,
                mobile: sale.customer?.mobile || sale.customerMobile,
                email: sale.customer?.email || '',
                address: sale.customer?.address || null
            },

            // Totals for frontend
            totals: {
                subtotal: sale.totals?.subtotal || 0,
                totalDiscountAmount: sale.totals?.totalDiscount || 0,
                totalTaxAmount: sale.totals?.totalTax || 0,
                finalTotal: sale.totals?.finalTotal || 0
            }
        };
    }

    // Calculate payment status
    calculatePaymentStatus(paidAmount, totalAmount) {
        if (paidAmount >= totalAmount) return 'paid';
        if (paidAmount > 0) return 'partial';
        return 'pending';
    }

    // Map backend payment status to frontend display
    mapPaymentStatus(backendStatus) {
        const statusMap = {
            'paid': 'Paid',
            'partial': 'Partial',
            'pending': 'Pending',
            'overdue': 'Overdue',
            'cancelled': 'Cancelled'
        };
        return statusMap[backendStatus] || 'Pending';
    }

    // Utility method to capitalize first letter
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Format currency for display
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    }

    // Format date for API calls
    formatDateForAPI(date) {
        if (!date) return null;
        if (typeof date === 'string') return date.split('T')[0];
        return date.toISOString().split('T')[0];
    }

    // Format due date for display
    formatDueDate(dueDate) {
        if (!dueDate) return 'No due date';
        const date = new Date(dueDate);
        const today = new Date();

        // Check if overdue
        if (date < today) {
            const diffTime = Math.abs(today - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return `Overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        }

        return date.toLocaleDateString('en-GB');
    }

    // Get overdue status
    getOverdueStatus(dueDate, pendingAmount) {
        if (!dueDate || pendingAmount <= 0) return { isOverdue: false, daysOverdue: 0 };

        const today = new Date();
        const due = new Date(dueDate);

        if (due < today) {
            const diffTime = Math.abs(today - due);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { isOverdue: true, daysOverdue: diffDays };
        }

        return { isOverdue: false, daysOverdue: 0 };
    }

    // Get sales summary for date range
    async getSalesSummary(companyId, dateFrom, dateTo) {
        const queryParams = new URLSearchParams({
            companyId,
            ...(dateFrom && { dateFrom: this.formatDateForAPI(dateFrom) }),
            ...(dateTo && { dateTo: this.formatDateForAPI(dateTo) })
        });

        const response = await this.apiCall(`/sales?${queryParams}`);

        if (response.success && response.data) {
            return {
                sales: response.data.sales || [],
                summary: response.data.summary || {},
                pagination: response.data.pagination || {}
            };
        }

        return { sales: [], summary: {}, pagination: {} };
    }

    // Search sales by various criteria
    async searchSales(companyId, searchTerm, filters = {}) {
        const queryParams = new URLSearchParams({
            companyId,
            search: searchTerm,
            ...filters
        });

        return await this.apiCall(`/sales?${queryParams}`);
    }

    // Get sales by customer
    async getSalesByCustomer(companyId, customerId, limit = 10) {
        const queryParams = new URLSearchParams({
            companyId,
            customer: customerId,
            limit: limit.toString()
        });

        return await this.apiCall(`/sales?${queryParams}`);
    }

    // Get payment status for a sale
    async getPaymentStatus(saleId) {
        return await this.apiCall(`/sales/${saleId}/payment-status`);
    }

    // Get top selling items
    async getTopItems(companyId, dateFrom, dateTo, limit = 10) {
        const queryParams = new URLSearchParams({
            companyId,
            limit: limit.toString(),
            ...(dateFrom && { dateFrom: this.formatDateForAPI(dateFrom) }),
            ...(dateTo && { dateTo: this.formatDateForAPI(dateTo) })
        });

        return await this.apiCall(`/sales/top-items?${queryParams}`);
    }

    // Get sales report
    async getSalesReport(companyId, startDate, endDate) {
        const queryParams = new URLSearchParams({
            companyId,
            startDate: this.formatDateForAPI(startDate),
            endDate: this.formatDateForAPI(endDate)
        });

        return await this.apiCall(`/sales/report?${queryParams}`);
    }

    // ==================== TRANSACTION-RELATED UTILITY METHODS ====================

    /**
     * Get sales with transaction details
     * @param {string} companyId - Company ID
     * @param {Object} filters - Query filters
     * @returns {Promise<Object>} Sales with transaction info
     */
    async getSalesWithTransactions(companyId, filters = {}) {
        try {
            // Get sales data
            const salesResponse = await this.getInvoices(companyId, filters);

            if (!salesResponse.success) {
                return salesResponse;
            }

            // Get transaction summary for the same period
            const transactionSummary = await transactionService.getTransactionSummary(companyId, {
                transactionType: 'sale',
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo
            });

            return {
                success: true,
                data: {
                    ...salesResponse.data,
                    transactionSummary: transactionSummary.data?.summary || {}
                }
            };

        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: { sales: [], summary: {} }
            };
        }
    }

    /**
     * Check if sale has associated transactions
     * @param {string} companyId - Company ID
     * @param {string} saleId - Sale ID
     * @returns {Promise<Object>} Transaction status
     */
    async getSaleTransactionStatus(companyId, saleId) {
        try {
            // Get transactions for this sale
            const transactions = await transactionService.getTransactions(companyId, {
                referenceId: saleId,
                referenceType: 'sale'
            });

            const saleTransactions = transactions.data?.transactions || [];
            const totalTransacted = saleTransactions.reduce((sum, txn) => {
                return sum + (txn.direction === 'in' ? txn.amount : 0);
            }, 0);

            return {
                success: true,
                data: {
                    hasTransactions: saleTransactions.length > 0,
                    transactionCount: saleTransactions.length,
                    totalTransacted: totalTransacted,
                    transactions: saleTransactions
                }
            };

        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: { hasTransactions: false, transactionCount: 0, totalTransacted: 0 }
            };
        }
    }

    /**
     * Get comprehensive payment summary with overdue analysis
     * @param {string} companyId - Company ID
     * @param {Object} filters - Date and other filters
     * @returns {Promise<Object>} Enhanced payment summary
     */
    async getEnhancedPaymentSummary(companyId, filters = {}) {
        try {
            // Get regular sales data
            const salesResponse = await this.getInvoices(companyId, filters);

            if (!salesResponse.success) {
                return salesResponse;
            }

            const sales = salesResponse.data.sales || [];

            // Calculate comprehensive summary
            const summary = {
                totalSales: sales.length,
                totalAmount: 0,
                totalPaid: 0,
                totalPending: 0,
                totalOverdue: 0,
                overdueCount: 0,
                dueTodayCount: 0,
                dueTodayAmount: 0,
                paymentStatusBreakdown: {
                    paid: 0,
                    partial: 0,
                    pending: 0,
                    overdue: 0
                }
            };

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            sales.forEach(sale => {
                const amount = sale.totals?.finalTotal || 0;
                const paid = sale.payment?.paidAmount || 0;
                const pending = sale.payment?.pendingAmount || 0;
                const dueDate = sale.payment?.dueDate ? new Date(sale.payment.dueDate) : null;
                const status = sale.payment?.status || 'pending';

                summary.totalAmount += amount;
                summary.totalPaid += paid;
                summary.totalPending += pending;

                // Count payment status
                summary.paymentStatusBreakdown[status] = (summary.paymentStatusBreakdown[status] || 0) + 1;

                // Check overdue
                if (dueDate && pending > 0) {
                    if (dueDate < today) {
                        summary.totalOverdue += pending;
                        summary.overdueCount++;
                    } else if (dueDate.toDateString() === today.toDateString()) {
                        summary.dueTodayCount++;
                        summary.dueTodayAmount += pending;
                    }
                }
            });

            return {
                success: true,
                data: {
                    ...salesResponse.data,
                    enhancedSummary: summary
                }
            };

        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: { sales: [], summary: {}, enhancedSummary: {} }
            };
        }
    }

    /**
     * Get sales grouped by payment status with due date analysis
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Grouped sales data
     */
    async getSalesGroupedByStatus(companyId) {
        try {
            const salesResponse = await this.getInvoices(companyId);

            if (!salesResponse.success) {
                return salesResponse;
            }

            const sales = salesResponse.data.sales || [];
            const today = new Date();

            const grouped = {
                paid: [],
                partial: [],
                pending: [],
                overdue: [],
                dueToday: []
            };

            sales.forEach(sale => {
                const pending = sale.payment?.pendingAmount || 0;
                const dueDate = sale.payment?.dueDate ? new Date(sale.payment.dueDate) : null;
                const status = sale.payment?.status || 'pending';

                // Add overdue info
                if (dueDate && pending > 0) {
                    const overdueInfo = this.getOverdueStatus(dueDate, pending);
                    sale.overdueInfo = overdueInfo;
                }

                // Group by status
                if (status === 'paid') {
                    grouped.paid.push(sale);
                } else if (dueDate && pending > 0 && dueDate < today) {
                    grouped.overdue.push(sale);
                } else if (dueDate && pending > 0 && dueDate.toDateString() === today.toDateString()) {
                    grouped.dueToday.push(sale);
                } else if (status === 'partial') {
                    grouped.partial.push(sale);
                } else {
                    grouped.pending.push(sale);
                }
            });

            return {
                success: true,
                data: grouped
            };

        } catch (error) {
            return {
                success: false,
                message: error.message,
                data: { paid: [], partial: [], pending: [], overdue: [], dueToday: [] }
            };
        }
    }
}

export default new SalesService();