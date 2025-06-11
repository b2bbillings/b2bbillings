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
                        bankTransactionId: invoiceData.bankTransactionId || ''
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
     * Add payment to existing sale with transaction
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

            // Add payment to sale using existing method
            const paymentResponse = await this.addPayment(saleId, paymentData);

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
                    bankTransactionId: paymentData.bankTransactionId || ''
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
                bankTransactionId: saleData.bankTransactionId
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

    // Add payment to sale
    async addPayment(saleId, paymentData) {
        return await this.apiCall(`/sales/${saleId}/payment`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
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

    // Transform frontend invoice data to backend format
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

        return {
            // Invoice basic info
            invoiceNumber: invoiceData.invoiceNumber,
            invoiceDate: invoiceData.invoiceDate || new Date().toISOString(),
            invoiceType: invoiceData.gstEnabled ? 'gst' : 'non-gst',
            gstEnabled: invoiceData.gstEnabled || false,
            companyId: invoiceData.companyId,

            // Customer information
            customerName: customerName,
            customerMobile: customerMobile,
            customer: invoiceData.customer?.id || invoiceData.customerId || null,

            // Items array - filter valid items and transform
            items: (invoiceData.items || [])
                .filter(item =>
                    item.itemName &&
                    parseFloat(item.quantity) > 0 &&
                    parseFloat(item.pricePerUnit) >= 0
                )
                .map((item, index) => ({
                    itemRef: item.itemRef || item._id || item.id || null,
                    itemName: item.itemName || item.name,
                    hsnCode: item.hsnCode || item.hsnNumber || '0000',
                    quantity: parseFloat(item.quantity) || 1,
                    unit: item.unit || 'PCS',
                    pricePerUnit: parseFloat(item.pricePerUnit) || 0,
                    taxRate: parseFloat(item.taxRate || item.gstRate) || 0,
                    discountPercent: parseFloat(item.discountPercent) || 0,
                    discountAmount: parseFloat(item.discountAmount) || 0,
                    cgst: parseFloat(item.cgstAmount || item.cgst) || 0,
                    sgst: parseFloat(item.sgstAmount || item.sgst) || 0,
                    igst: parseFloat(item.igstAmount || item.igst) || 0,
                    itemAmount: parseFloat(item.amount || item.itemAmount) || 0,
                    lineNumber: item.lineNumber || (index + 1)
                })),

            // Payment information
            payment: {
                method: invoiceData.paymentMethod || 'cash',
                status: this.calculatePaymentStatus(
                    parseFloat(invoiceData.paymentReceived || invoiceData.payment?.paidAmount) || 0,
                    invoiceData.totals?.finalTotal || 0
                ),
                paidAmount: parseFloat(invoiceData.paymentReceived || invoiceData.payment?.paidAmount) || 0,
                pendingAmount: Math.max(0, (invoiceData.totals?.finalTotal || 0) - (parseFloat(invoiceData.paymentReceived || invoiceData.payment?.paidAmount) || 0)),
                paymentDate: invoiceData.paymentDate || new Date(),
                reference: invoiceData.paymentReference || ''
            },

            // Totals (backend will recalculate, but send what we have)
            totals: {
                subtotal: parseFloat(invoiceData.totals?.subtotal) || 0,
                totalDiscount: parseFloat(invoiceData.totals?.totalDiscountAmount || invoiceData.totals?.totalDiscount) || 0,
                totalTax: parseFloat(invoiceData.totals?.totalTaxAmount || invoiceData.totals?.totalTax) || 0,
                finalTotal: parseFloat(invoiceData.totals?.finalTotal) || 0
            },

            // Additional information
            notes: invoiceData.notes || '',
            termsAndConditions: invoiceData.terms || invoiceData.termsAndConditions || '',
            status: invoiceData.status || 'completed',

            // Round off (if applicable)
            roundOff: parseFloat(invoiceData.roundOff) || 0,
            roundOffEnabled: invoiceData.roundOffEnabled || false
        };
    }

    // Transform backend data to frontend format
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
            cgstPercent: 9, // Default, can be calculated from items if needed
            sgstPercent: 9,

            // Amounts
            amount: sale.totals?.finalTotal || 0,
            balance: sale.payment?.pendingAmount || 0,
            subtotal: sale.totals?.subtotal || 0,
            discount: sale.totals?.totalDiscount || 0,

            // Status
            status: this.mapPaymentStatus(sale.payment?.status),
            saleStatus: this.capitalizeFirst(sale.status),

            // Additional data
            items: sale.items || [],
            gstEnabled: sale.gstEnabled || false,
            roundOff: sale.roundOff || 0,
            notes: sale.notes || '',
            terms: sale.termsAndConditions || '',

            // Keep original sale data for editing
            originalSale: sale,

            // Payment details
            paymentReceived: sale.payment?.paidAmount || 0,
            paymentMethod: sale.payment?.method || 'cash',
            paymentDate: sale.payment?.paymentDate,
            paymentReference: sale.payment?.reference || '',

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
}

export default new SalesService();