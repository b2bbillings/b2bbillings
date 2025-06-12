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
                'x-auth-token': token  // Add x-auth-token for backend compatibility
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

        console.log('🔗 Sales API Call:', url);

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
                console.error('❌ Sales API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                });

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

            console.log('✅ Sales API Success:', data);
            return data;

        } catch (error) {
            console.error('❌ Sales API Error:', error);
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
        console.log('📄 Creating invoice with transaction:', invoiceData);

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
            console.log('✅ Invoice created successfully:', createdInvoice._id || createdInvoice.id);

            // Check if payment was received and create transaction
            const paymentReceived = parseFloat(invoiceData.paymentReceived || invoiceData.payment?.paidAmount || 0);

            if (paymentReceived > 0 && invoiceData.bankAccountId) {
                console.log('💰 Creating sales transaction for payment received:', paymentReceived);

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
                        // NEW: Due date fields
                        dueDate: invoiceData.dueDate || invoiceData.payment?.dueDate || null,
                        creditDays: invoiceData.creditDays || invoiceData.payment?.creditDays || 0
                    };

                    const transactionResponse = await transactionService.createSalesTransaction(
                        invoiceData.companyId,
                        transactionData
                    );

                    console.log('✅ Sales transaction created:', transactionResponse.data);

                    // Add transaction info to invoice response
                    createdInvoice.transaction = transactionResponse.data;
                    createdInvoice.transactionId = transactionResponse.data.transactionId;

                } catch (transactionError) {
                    console.warn('⚠️ Invoice created but transaction failed:', transactionError);
                    // Don't fail the whole operation, just add warning
                    createdInvoice.transactionError = transactionError.message;
                    createdInvoice.transactionWarning = 'Invoice created successfully, but payment transaction could not be recorded. You can add payment manually later.';
                }
            } else if (paymentReceived > 0 && !invoiceData.bankAccountId) {
                console.warn('⚠️ Payment received but no bank account specified');
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
            console.error('❌ Error creating invoice with transaction:', error);
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
        console.log('💰 Adding payment with transaction:', { companyId, saleId, paymentData });

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

            console.log('💰 Creating payment transaction for amount:', paymentAmount);

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
                    // NEW: Due date fields
                    dueDate: paymentData.dueDate || null,
                    creditDays: paymentData.creditDays || 0
                };

                const transactionResponse = await transactionService.createSalesTransaction(
                    companyId,
                    transactionData
                );

                console.log('✅ Payment transaction created:', transactionResponse.data);

                // Add transaction info to payment response
                paymentResponse.data.transaction = transactionResponse.data;
                paymentResponse.data.transactionId = transactionResponse.data.transactionId;

            } catch (transactionError) {
                console.warn('⚠️ Payment added but transaction failed:', transactionError);
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
            console.error('❌ Error adding payment with transaction:', error);
            throw error;
        }
    }

    /**
     * Create quick cash sale with automatic transaction
     * @param {Object} saleData - Quick sale data
     * @returns {Promise<Object>} Created sale with transaction
     */
    async createQuickSaleWithTransaction(saleData) {
        console.log('⚡ Creating quick sale with transaction:', saleData);

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
                invoiceType: 'non-gst', // Quick sales are usually non-GST
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
                // Transaction fields
                chequeNumber: saleData.chequeNumber,
                chequeDate: saleData.chequeDate,
                upiTransactionId: saleData.upiTransactionId,
                bankTransactionId: saleData.bankTransactionId,
                // NEW: Due date fields
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
            console.error('❌ Error creating quick sale with transaction:', error);
            throw error;
        }
    }

    // ==================== EXISTING METHODS (Keep all your existing methods) ====================

    // Create new sale/invoice
    async createInvoice(invoiceData) {
        console.log('📄 Creating invoice:', invoiceData);

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

    // UPDATED: Add payment to sale with due date support
    async addPayment(saleId, paymentData) {
        return await this.apiCall(`/sales/${saleId}/payments`, { // Changed from /payment to /payments
            method: 'POST',
            body: JSON.stringify({
                amount: paymentData.amount,
                method: paymentData.method || paymentData.paymentMethod || 'cash',
                reference: paymentData.reference || '',
                paymentDate: paymentData.paymentDate || null,
                dueDate: paymentData.dueDate || null, // NEW
                creditDays: paymentData.creditDays || null, // NEW
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

    // UPDATED: Get overdue sales with fallback to client-side filtering
    async getOverdueSales(companyId) {
        try {
            // Try the dedicated endpoint first
            return await this.apiCall(`/sales/overdue?companyId=${companyId}`);
        } catch (error) {
            console.warn('⚠️ Overdue endpoint not available, using fallback method');

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
                    message: `Found ${overdueSales.length} overdue sales (client-side filtered)`
                };

            } catch (fallbackError) {
                console.error('❌ Fallback method also failed:', fallbackError);
                return {
                    success: false,
                    message: 'Unable to fetch overdue sales',
                    data: []
                };
            }
        }
    }

    // UPDATED: Get sales due today with fallback to client-side filtering
    async getSalesDueToday(companyId) {
        try {
            // Try the dedicated endpoint first
            return await this.apiCall(`/sales/due-today?companyId=${companyId}`);
        } catch (error) {
            console.warn('⚠️ Due today endpoint not available, using fallback method');

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
                    message: `Found ${salesDueToday.length} sales due today (client-side filtered)`
                };

            } catch (fallbackError) {
                console.error('❌ Fallback method also failed:', fallbackError);
                return {
                    success: false,
                    message: 'Unable to fetch sales due today',
                    data: []
                };
            }
        }
    }

    // NEW: Get payment summary with overdue info
    async getPaymentSummaryWithOverdue(companyId, dateFrom, dateTo) {
        const queryParams = new URLSearchParams({
            companyId,
            ...(dateFrom && { dateFrom: this.formatDateForAPI(dateFrom) }),
            ...(dateTo && { dateTo: this.formatDateForAPI(dateTo) })
        });

        try {
            return await this.apiCall(`/sales/payment-summary-overdue?${queryParams}`);
        } catch (error) {
            console.warn('⚠️ Payment summary overdue endpoint not available, using fallback');

            // Fallback to enhanced payment summary
            return await this.getEnhancedPaymentSummary(companyId, {
                dateFrom: dateFrom,
                dateTo: dateTo
            });
        }
    }

    // NEW: Update payment due date
    async updatePaymentDueDate(saleId, dueDate, creditDays) {
        return await this.apiCall(`/sales/${saleId}/due-date`, {
            method: 'PUT',
            body: JSON.stringify({
                dueDate: dueDate,
                creditDays: creditDays
            })
        });
    }


    // FIXED: Enhanced due date extraction with smart date parsing
    transformToBackendFormat(invoiceData) {
        console.log('🔄 Transforming data for backend:', invoiceData);

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

        // FIXED: Extract tax mode information with proper priority
        const globalTaxMode = invoiceData.globalTaxMode ||
            invoiceData.taxMode ||
            (invoiceData.priceIncludesTax ? 'with-tax' : 'without-tax') ||
            'without-tax'; // DEFAULT to without-tax

        const priceIncludesTax = globalTaxMode === 'with-tax';

        console.log('🏷️ FIXED Tax Mode Mapping:', {
            originalGlobalTaxMode: invoiceData.globalTaxMode,
            originalPriceIncludesTax: invoiceData.priceIncludesTax,
            finalGlobalTaxMode: globalTaxMode,
            finalPriceIncludesTax: priceIncludesTax,
            invoiceDataKeys: Object.keys(invoiceData)
        });

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

        // FIXED: Extract payment method with CORRECT PRIORITY ORDER
        const paymentMethod = paymentInfo.method ||
            paymentInfo.paymentMethod ||
            invoiceData.payment?.method ||
            invoiceData.paymentMethod ||
            'cash';

        console.log('💳 FIXED Payment Method Extraction:', {
            selectedMethod: paymentMethod,
            paymentInfoMethod: paymentInfo.method,
            paymentInfoPaymentMethod: paymentInfo.paymentMethod,
            invoiceDataPaymentMethod: invoiceData.paymentMethod,
            paymentObjectMethod: invoiceData.payment?.method
        });

        // Extract bank account ID
        const bankAccountId = invoiceData.bankAccountId ||
            paymentInfo.bankAccountId ||
            invoiceData.payment?.bankAccountId ||
            null;

        // FIXED: Enhanced due date extraction with IMPROVED smart date parsing
        let dueDate = null;
        let creditDays = 0;

        // First, try to get explicit due date
        if (invoiceData.dueDate) {
            dueDate = new Date(invoiceData.dueDate).toISOString();
            console.log('📅 Using explicit due date from invoiceData:', dueDate);
        } else if (paymentInfo.dueDate) {
            dueDate = new Date(paymentInfo.dueDate).toISOString();
            console.log('📅 Using explicit due date from paymentInfo:', dueDate);
        } else if (invoiceData.payment?.dueDate) {
            dueDate = new Date(invoiceData.payment.dueDate).toISOString();
            console.log('📅 Using explicit due date from payment object:', dueDate);
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
                // Calculate due date from credit days
                const calculatedDueDate = new Date();
                calculatedDueDate.setDate(calculatedDueDate.getDate() + creditDays);
                dueDate = calculatedDueDate.toISOString();
                console.log('📅 Calculated due date from credit days:', { creditDays, dueDate });
            }
        }

        // ENHANCED: Smart date parsing from payment notes
        if (!dueDate && paymentInfo.notes) {
            console.log('📅 Attempting smart date parsing from notes:', paymentInfo.notes);

            const notesText = paymentInfo.notes.toLowerCase();

            // Enhanced patterns for date extraction
            const datePatterns = [
                // "will be paid on 14", "payment on 20", "due on 15"
                /(?:paid|due|payment|pay).*?(?:on|by)\s*(?:the\s*)?(\d{1,2})(?:th|st|nd|rd)?/i,
                // "14th date", "15th day", "20 date"
                /(\d{1,2})(?:th|st|nd|rd)?\s*(?:date|day|of)/i,
                // "14 december", "15 jan", etc.
                /(\d{1,2})\s*(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)/i,
                // Simple numbers with context
                /(?:remaining|balance|rest).*?(\d{1,2})/i
            ];

            let foundDate = false;
            for (const [index, pattern] of datePatterns.entries()) {
                const match = paymentInfo.notes.match(pattern);
                if (match) {
                    const dayNumber = parseInt(match[1]);
                    console.log(`📅 Pattern ${index + 1} matched:`, { match: match[0], dayNumber });

                    if (dayNumber >= 1 && dayNumber <= 31) {
                        const today = new Date();
                        const currentMonth = today.getMonth();
                        const currentYear = today.getFullYear();
                        const currentDay = today.getDate();

                        // Create due date for this month or next month
                        let calculatedDueDate = new Date(currentYear, currentMonth, dayNumber);

                        // If the date has passed this month, set it for next month
                        if (dayNumber <= currentDay) {
                            calculatedDueDate = new Date(currentYear, currentMonth + 1, dayNumber);
                        }

                        dueDate = calculatedDueDate.toISOString();
                        creditDays = Math.max(1, Math.ceil((calculatedDueDate - today) / (1000 * 60 * 60 * 24)));

                        console.log('📅 ✅ SMART Due Date Parsing SUCCESS:', {
                            originalNotes: paymentInfo.notes,
                            patternUsed: pattern.toString(),
                            extractedDay: dayNumber,
                            calculatedDueDate: dueDate,
                            calculatedCreditDays: creditDays,
                            currentDay: currentDay
                        });

                        foundDate = true;
                        break;
                    }
                }
            }

            if (!foundDate) {
                console.log('📅 ❌ Smart date parsing failed - no valid date found in notes');
            }
        }

        // Final fallback: if partial payment and no due date, set 30 days default
        if (!dueDate && pendingAmount > 0 && paymentReceived > 0) {
            creditDays = 30; // Default 30 days credit
            const calculatedDueDate = new Date();
            calculatedDueDate.setDate(calculatedDueDate.getDate() + creditDays);
            dueDate = calculatedDueDate.toISOString();
            console.log('📅 Applied default 30-day credit for partial payment:', { dueDate, creditDays });
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

        console.log('💳 Enhanced Payment Information Extraction:', {
            paymentReceived,
            paymentMethod,
            bankAccountId,
            dueDate,
            creditDays,
            finalTotal,
            pendingAmount,
            paymentNotes,
            dueDateSource: dueDate ? (
                invoiceData.dueDate ? 'invoiceData.dueDate' :
                    paymentInfo.dueDate ? 'paymentInfo.dueDate' :
                        explicitCreditDays ? 'calculated from creditDays' :
                            paymentInfo.notes ? 'smart parsed from notes' :
                                'default fallback'
            ) : 'none'
        });

        // FIXED: Process items with CORRECT tax mode mapping
        const processedItems = (invoiceData.items || [])
            .filter(item =>
                item.itemName &&
                parseFloat(item.quantity) > 0 &&
                parseFloat(item.pricePerUnit) >= 0
            )
            .map((item, index) => {
                // FIXED: Use individual item tax mode or fall back to global
                const itemTaxMode = item.taxMode ||
                    item.itemTaxMode ||
                    globalTaxMode;

                const itemPriceIncludesTax = itemTaxMode === 'with-tax';

                console.log(`🔧 Processing Item ${index + 1}:`, {
                    itemName: item.itemName,
                    originalItemTaxMode: item.taxMode,
                    originalItemItemTaxMode: item.itemTaxMode,
                    globalTaxMode: globalTaxMode,
                    finalItemTaxMode: itemTaxMode,
                    finalItemPriceIncludesTax: itemPriceIncludesTax,
                    pricePerUnit: item.pricePerUnit,
                    quantity: item.quantity
                });

                return {
                    itemRef: item.itemRef || item._id || item.id || null,
                    itemName: item.itemName || item.name,
                    hsnCode: item.hsnCode || item.hsnNumber || '0000',
                    quantity: parseFloat(item.quantity) || 1,
                    unit: item.unit || 'PCS',
                    pricePerUnit: parseFloat(item.pricePerUnit) || 0,
                    taxRate: parseFloat(item.taxRate || item.gstRate) || (itemPriceIncludesTax ? 18 : 0),
                    priceIncludesTax: itemPriceIncludesTax,
                    taxMode: itemTaxMode, // FIXED: Use correct tax mode
                    discountPercent: parseFloat(item.discountPercent) || 0,
                    discountAmount: parseFloat(item.discountAmount) || 0,
                    cgst: parseFloat(item.cgstAmount || item.cgst) || 0,
                    sgst: parseFloat(item.sgstAmount || item.sgst) || 0,
                    igst: parseFloat(item.igstAmount || item.igst) || 0,
                    itemAmount: parseFloat(item.amount || item.itemAmount) || 0,
                    lineNumber: item.lineNumber || (index + 1)
                };
            });

        console.log('📦 FIXED Processed Items for Backend:', processedItems.map(item => ({
            name: item.itemName,
            taxMode: item.taxMode,
            priceIncludesTax: item.priceIncludesTax,
            pricePerUnit: item.pricePerUnit,
            taxRate: item.taxRate
        })));

        const transformedData = {
            // Invoice basic info
            invoiceNumber: invoiceData.invoiceNumber,
            invoiceDate: invoiceData.invoiceDate || new Date().toISOString(),
            invoiceType: invoiceData.gstEnabled ? 'gst' : 'non-gst',
            gstEnabled: invoiceData.gstEnabled || false,
            priceIncludesTax: priceIncludesTax, // FIXED: Use correct value
            companyId: invoiceData.companyId,

            // Customer information
            customerName: customerName,
            customerMobile: customerMobile,
            customer: invoiceData.customer?.id || invoiceData.customerId || null,

            // Items array with proper tax mode mapping
            items: processedItems,

            // FIXED: Enhanced payment object with CORRECT values
            payment: {
                method: paymentMethod,
                status: this.calculatePaymentStatus(paymentReceived, finalTotal),
                paidAmount: paymentReceived,
                pendingAmount: pendingAmount,
                paymentDate: paymentInfo.paymentDate ||
                    invoiceData.paymentDate ||
                    invoiceData.payment?.paymentDate ||
                    new Date().toISOString(),
                dueDate: dueDate, // FIXED: Now properly parsed
                creditDays: creditDays, // FIXED: Now properly calculated
                reference: paymentInfo.reference ||
                    invoiceData.paymentReference ||
                    invoiceData.payment?.reference ||
                    transactionId ||
                    chequeNumber ||
                    '',
                notes: paymentNotes,
                // Additional payment details
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

            // FIXED: Enhanced tax mode info
            globalTaxMode: globalTaxMode,
            taxModeInfo: {
                globalTaxMode,
                priceIncludesTax,
                itemCount: processedItems.length,
                itemTaxModes: processedItems.map(item => ({
                    itemName: item.itemName,
                    taxMode: item.taxMode,
                    priceIncludesTax: item.priceIncludesTax,
                    pricePerUnit: item.pricePerUnit,
                    taxRate: item.taxRate
                }))
            },

            // FIXED: Include CORRECTED values at root level
            paymentMethod: paymentMethod,
            dueDate: dueDate,
            creditDays: creditDays,

            // Enhanced debugging
            debugPaymentData: {
                originalPaymentReceived: invoiceData.paymentReceived,
                originalPaymentMethod: invoiceData.paymentMethod,
                originalBankAccountId: invoiceData.bankAccountId,
                originalDueDate: invoiceData.dueDate,
                originalCreditDays: invoiceData.creditDays,
                paymentInfoObject: paymentInfo,
                methodSelectionDebug: {
                    paymentInfoMethod: paymentInfo.method,
                    paymentInfoPaymentMethod: paymentInfo.paymentMethod,
                    invoiceDataPaymentMethod: invoiceData.paymentMethod,
                    paymentObjectMethod: invoiceData.payment?.method,
                    finalSelectedMethod: paymentMethod
                },
                dueDateParsingDebug: {
                    originalDueDate: invoiceData.dueDate,
                    paymentInfoDueDate: paymentInfo.dueDate,
                    originalCreditDays: invoiceData.creditDays,
                    paymentInfoCreditDays: paymentInfo.creditDays,
                    paymentNotes: paymentInfo.notes,
                    finalDueDate: dueDate,
                    finalCreditDays: creditDays,
                    smartParsed: !!(dueDate && paymentInfo.notes && !invoiceData.dueDate && !paymentInfo.dueDate && !explicitCreditDays)
                },
                taxModeDebug: {
                    originalGlobalTaxMode: invoiceData.globalTaxMode,
                    originalPriceIncludesTax: invoiceData.priceIncludesTax,
                    finalGlobalTaxMode: globalTaxMode,
                    finalPriceIncludesTax: priceIncludesTax
                }
            }
        };

        console.log('🚀 FIXED Final Transformed Data for Backend:', {
            invoiceNumber: transformedData.invoiceNumber,
            globalTaxMode: transformedData.globalTaxMode,
            priceIncludesTax: transformedData.priceIncludesTax,
            payment: {
                method: transformedData.payment.method,
                paidAmount: transformedData.payment.paidAmount,
                pendingAmount: transformedData.payment.pendingAmount,
                dueDate: transformedData.payment.dueDate,
                creditDays: transformedData.payment.creditDays
            },
            itemsPreview: transformedData.items.map(item => ({
                name: item.itemName,
                taxMode: item.taxMode,
                priceIncludesTax: item.priceIncludesTax
            }))
        });

        return transformedData;
    }


    // UPDATED: Transform backend data to frontend format with due date support
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

            // NEW: Due date information
            dueDate: sale.payment?.dueDate,
            creditDays: sale.payment?.creditDays || 0,
            isOverdue: sale.isOverdue || false,
            daysOverdue: sale.daysOverdue || 0,

            // Additional data
            items: sale.items || [],
            gstEnabled: sale.gstEnabled || false,
            priceIncludesTax: sale.priceIncludesTax || false, // NEW
            roundOff: sale.roundOff || 0,
            notes: sale.notes || '',
            terms: sale.termsAndConditions || '',

            // Keep original sale data for editing
            originalSale: sale,

            // UPDATED: Payment details with due date
            paymentReceived: sale.payment?.paidAmount || 0,
            paymentMethod: sale.payment?.method || 'cash',
            paymentDate: sale.payment?.paymentDate,
            paymentReference: sale.payment?.reference || '',
            paymentDueDate: sale.payment?.dueDate, // NEW
            paymentCreditDays: sale.payment?.creditDays || 0, // NEW

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
            'overdue': 'Overdue', // NEW
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

    // NEW: Format due date for display
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

    // NEW: Get overdue status
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
            console.log('📊 Getting sales with transaction details:', { companyId, filters });

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
            console.error('❌ Error getting sales with transactions:', error);
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
            console.log('🔍 Checking transaction status for sale:', { companyId, saleId });

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
            console.error('❌ Error checking sale transaction status:', error);
            return {
                success: false,
                message: error.message,
                data: { hasTransactions: false, transactionCount: 0, totalTransacted: 0 }
            };
        }
    }

    // NEW: Enhanced methods for due date management

    /**
     * Get comprehensive payment summary with overdue analysis
     * @param {string} companyId - Company ID
     * @param {Object} filters - Date and other filters
     * @returns {Promise<Object>} Enhanced payment summary
     */
    async getEnhancedPaymentSummary(companyId, filters = {}) {
        try {
            console.log('📊 Getting enhanced payment summary:', { companyId, filters });

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
            today.setHours(23, 59, 59, 999); // End of today

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
            console.error('❌ Error getting enhanced payment summary:', error);
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
            console.log('📊 Getting sales grouped by payment status:', companyId);

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
            console.error('❌ Error grouping sales by status:', error);
            return {
                success: false,
                message: error.message,
                data: { paid: [], partial: [], pending: [], overdue: [], dueToday: [] }
            };
        }
    }
}

export default new SalesService();