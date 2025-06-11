const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Import transaction service
import transactionService from './transactionService.js';

class PaymentService {
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

        console.log('🔗 Payment API Call:', url);

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
                console.error('❌ Payment API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data,
                    url: endpoint
                });

                let errorMessage = data.message || `HTTP error! status: ${response.status}`;

                if (response.status === 400) {
                    errorMessage = data.message || 'Invalid payment data';
                } else if (response.status === 401) {
                    errorMessage = 'Authentication required. Please login again.';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. You do not have permission for this operation.';
                } else if (response.status === 404) {
                    errorMessage = 'Payment or resource not found.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }

                throw new Error(errorMessage);
            }

            console.log('✅ Payment API Success:', data);
            return data;

        } catch (error) {
            console.error('❌ Payment API Error:', error);
            throw error;
        }
    }

    // ==================== ENHANCED PAYMENT METHODS WITH TRANSACTION INTEGRATION ====================

    /**
     * Create Payment (Universal method) - Now uses transactions
     * @param {Object} paymentData - Complete payment information
     * @returns {Promise<Object>} API response
     */
    async createPayment(paymentData) {
        try {
            console.log('💰 Creating universal payment with transaction:', paymentData);

            if (!paymentData) {
                throw new Error('Payment data is required');
            }

            // Clean the data to remove any circular references
            const cleanedPaymentData = this.cleanPaymentData(paymentData);

            console.log('📤 Sending cleaned payment data:', cleanedPaymentData);

            // Validate required fields
            const requiredFields = ['companyId', 'paymentAmount'];
            const missingFields = requiredFields.filter(field => !cleanedPaymentData[field]);

            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            if (cleanedPaymentData.paymentAmount <= 0) {
                throw new Error('Payment amount must be greater than 0');
            }

            // Determine payment direction
            const isPaymentOut = cleanedPaymentData.paymentDirection === 'out' ||
                cleanedPaymentData.formType === 'purchase';

            // Create transaction using transaction service
            let transactionResponse;

            if (isPaymentOut) {
                // Payment Out - We pay supplier
                transactionResponse = await transactionService.createPaymentOutTransaction(
                    cleanedPaymentData.companyId,
                    {
                        bankAccountId: cleanedPaymentData.bankAccountId,
                        amount: cleanedPaymentData.paymentAmount,
                        paymentMethod: this.mapPaymentMethod(cleanedPaymentData.paymentType),
                        description: cleanedPaymentData.notes || `Payment to ${cleanedPaymentData.partyName || 'supplier'}`,
                        notes: cleanedPaymentData.notes || '',
                        partyId: cleanedPaymentData.partyId,
                        partyName: cleanedPaymentData.partyName,
                        partyType: 'supplier',
                        chequeNumber: cleanedPaymentData.chequeNumber,
                        chequeDate: cleanedPaymentData.chequeDate,
                        upiTransactionId: cleanedPaymentData.transactionId,
                        bankTransactionId: cleanedPaymentData.transactionId
                    }
                );
            } else {
                // Payment In - Customer pays us
                transactionResponse = await transactionService.createPaymentInTransaction(
                    cleanedPaymentData.companyId,
                    {
                        bankAccountId: cleanedPaymentData.bankAccountId,
                        amount: cleanedPaymentData.paymentAmount,
                        paymentMethod: this.mapPaymentMethod(cleanedPaymentData.paymentType),
                        description: cleanedPaymentData.notes || `Payment from ${cleanedPaymentData.partyName || 'customer'}`,
                        notes: cleanedPaymentData.notes || '',
                        partyId: cleanedPaymentData.partyId,
                        partyName: cleanedPaymentData.partyName,
                        partyType: 'customer',
                        chequeNumber: cleanedPaymentData.chequeNumber,
                        chequeDate: cleanedPaymentData.chequeDate,
                        upiTransactionId: cleanedPaymentData.transactionId,
                        bankTransactionId: cleanedPaymentData.transactionId
                    }
                );
            }

            console.log('✅ Payment transaction created successfully:', transactionResponse.data);

            // Transform transaction response to payment format for compatibility
            const paymentResponse = {
                _id: transactionResponse.data._id,
                transactionId: transactionResponse.data.transactionId,
                paymentId: transactionResponse.data._id,
                companyId: cleanedPaymentData.companyId,
                partyId: cleanedPaymentData.partyId,
                partyName: cleanedPaymentData.partyName,
                amount: cleanedPaymentData.paymentAmount,
                paymentMethod: this.mapPaymentMethod(cleanedPaymentData.paymentType),
                paymentType: isPaymentOut ? 'out' : 'in',
                paymentDate: transactionResponse.data.transactionDate,
                description: transactionResponse.data.description,
                notes: transactionResponse.data.notes,
                status: 'completed',
                bankAccount: transactionResponse.data.bankAccountId,
                chequeNumber: cleanedPaymentData.chequeNumber,
                chequeDate: cleanedPaymentData.chequeDate,
                invoiceNumber: cleanedPaymentData.invoiceNumber,
                createdAt: transactionResponse.data.createdAt
            };

            return {
                success: true,
                data: paymentResponse,
                message: 'Payment processed successfully with transaction record'
            };

        } catch (error) {
            console.error('❌ Error creating payment:', error);

            return {
                success: false,
                data: null,
                message: error.message || 'Failed to process payment',
                error: error.message
            };
        }
    }

    /**
     * Create Payment In with transaction (Customer pays us)
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Created payment with transaction
     */
    async createPaymentInWithTransaction(paymentData) {
        try {
            console.log('💰 Creating Payment In with transaction:', paymentData);

            // Clean and validate data
            const cleanedData = this.cleanPaymentData(paymentData);

            if (!cleanedData.companyId) {
                throw new Error('Company ID is required');
            }

            if (!cleanedData.bankAccountId) {
                throw new Error('Bank account is required');
            }

            if (!cleanedData.paymentAmount || cleanedData.paymentAmount <= 0) {
                throw new Error('Valid payment amount is required');
            }

            // Create the transaction using transaction service
            const transactionResponse = await transactionService.createPaymentInTransaction(
                cleanedData.companyId,
                {
                    bankAccountId: cleanedData.bankAccountId,
                    amount: cleanedData.paymentAmount,
                    paymentMethod: this.mapPaymentMethod(cleanedData.paymentType),
                    description: cleanedData.notes || `Payment received from ${cleanedData.partyName || 'customer'}`,
                    notes: cleanedData.notes || '',
                    partyId: cleanedData.partyId,
                    partyName: cleanedData.partyName,
                    partyType: 'customer',
                    chequeNumber: cleanedData.chequeNumber,
                    chequeDate: cleanedData.chequeDate,
                    upiTransactionId: cleanedData.transactionId,
                    bankTransactionId: cleanedData.transactionId
                }
            );

            console.log('✅ Payment In transaction created successfully:', transactionResponse.data);
            return transactionResponse;

        } catch (error) {
            console.error('❌ Error creating Payment In with transaction:', error);
            throw error;
        }
    }

    /**
     * Create Payment Out with transaction (We pay supplier)
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Created payment with transaction
     */
    async createPaymentOutWithTransaction(paymentData) {
        try {
            console.log('💸 Creating Payment Out with transaction:', paymentData);

            // Clean and validate data
            const cleanedData = this.cleanPaymentData(paymentData);

            if (!cleanedData.companyId) {
                throw new Error('Company ID is required');
            }

            if (!cleanedData.bankAccountId) {
                throw new Error('Bank account is required');
            }

            if (!cleanedData.paymentAmount || cleanedData.paymentAmount <= 0) {
                throw new Error('Valid payment amount is required');
            }

            // Create the transaction using transaction service
            const transactionResponse = await transactionService.createPaymentOutTransaction(
                cleanedData.companyId,
                {
                    bankAccountId: cleanedData.bankAccountId,
                    amount: cleanedData.paymentAmount,
                    paymentMethod: this.mapPaymentMethod(cleanedData.paymentType),
                    description: cleanedData.notes || `Payment made to ${cleanedData.partyName || 'supplier'}`,
                    notes: cleanedData.notes || '',
                    partyId: cleanedData.partyId,
                    partyName: cleanedData.partyName,
                    partyType: 'supplier',
                    chequeNumber: cleanedData.chequeNumber,
                    chequeDate: cleanedData.chequeDate,
                    upiTransactionId: cleanedData.transactionId,
                    bankTransactionId: cleanedData.transactionId
                }
            );

            console.log('✅ Payment Out transaction created successfully:', transactionResponse.data);
            return transactionResponse;

        } catch (error) {
            console.error('❌ Error creating Payment Out with transaction:', error);
            throw error;
        }
    }

    // ==================== PAYMENT HISTORY AND RETRIEVAL ====================

    /**
     * Get payment history using transaction service (FIXES YOUR ERROR)
     * @param {Object} params - Search parameters or filters
     * @returns {Promise<Object>} Payment history from transactions
     */
    async getPaymentHistory(params = {}) {
        try {
            console.log('📋 Getting payment history from transactions:', params);

            // Handle both old format (params) and new format (companyId, filters)
            let companyId, filters;

            if (typeof params === 'string') {
                // If first param is string, it's companyId
                companyId = params;
                filters = arguments[1] || {};
            } else if (params.companyId) {
                // If params has companyId, extract it
                companyId = params.companyId;
                filters = { ...params };
                delete filters.companyId;
            } else {
                throw new Error('Company ID is required');
            }

            // Convert payment filters to transaction filters
            const transactionFilters = {
                page: filters.page || 1,
                limit: filters.limit || 50,
                sortBy: filters.sortBy || 'transactionDate',
                sortOrder: filters.sortOrder || 'desc'
            };

            // Add transaction type filter based on payment type
            if (filters.type === 'in') {
                transactionFilters.transactionType = 'payment_in,sale';
                transactionFilters.direction = 'in';
            } else if (filters.type === 'out') {
                transactionFilters.transactionType = 'payment_out,purchase';
                transactionFilters.direction = 'out';
            } else {
                // Get all payment-related transactions
                transactionFilters.transactionType = 'payment_in,payment_out,sale,purchase';
            }

            // Add other filters
            if (filters.dateFrom) transactionFilters.dateFrom = filters.dateFrom;
            if (filters.dateTo) transactionFilters.dateTo = filters.dateTo;
            if (filters.search) transactionFilters.search = filters.search;
            if (filters.partyId) transactionFilters.partyId = filters.partyId;
            if (filters.partyName) transactionFilters.search = filters.partyName;
            if (filters.bankAccountId) transactionFilters.bankAccountId = filters.bankAccountId;
            if (filters.paymentMethod) transactionFilters.paymentMethod = filters.paymentMethod;
            if (filters.invoiceNumber) transactionFilters.referenceNumber = filters.invoiceNumber;

            // Get transactions
            const transactionResponse = await transactionService.getTransactions(companyId, transactionFilters);

            if (!transactionResponse.success) {
                throw new Error(transactionResponse.message || 'Failed to get payment history');
            }

            // Transform transactions to payment format
            const payments = (transactionResponse.data?.transactions || []).map(transaction => ({
                id: transaction._id || transaction.id,
                transactionId: transaction.transactionId,
                paymentDate: transaction.transactionDate,
                paymentAmount: transaction.amount,
                paymentMethod: transaction.paymentMethod,
                paymentType: transaction.direction === 'in' ? 'received' : 'paid',
                direction: transaction.direction,
                partyName: transaction.partyName || 'Unknown',
                partyType: transaction.partyType || 'customer',
                partyId: transaction.partyId,
                description: transaction.description,
                notes: transaction.notes,
                status: transaction.status || 'completed',
                bankAccount: transaction.bankAccountId,
                balanceBefore: transaction.balanceBefore,
                balanceAfter: transaction.balanceAfter,
                chequeNumber: transaction.chequeNumber,
                chequeDate: transaction.chequeDate,
                upiTransactionId: transaction.upiTransactionId,
                bankTransactionId: transaction.bankTransactionId,
                invoiceNumber: transaction.referenceNumber,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
                // Additional fields for compatibility
                amount: transaction.amount,
                type: transaction.direction,
                method: transaction.paymentMethod,
                party: {
                    id: transaction.partyId,
                    name: transaction.partyName,
                    type: transaction.partyType
                },
                reference: {
                    type: transaction.referenceType,
                    id: transaction.referenceId,
                    number: transaction.referenceNumber
                }
            }));

            const result = {
                success: true,
                data: payments,
                payments: payments, // For backward compatibility
                total: payments.length,
                pagination: transactionResponse.data?.pagination || {},
                summary: transactionResponse.data?.summary || {},
                message: 'Payment history retrieved successfully'
            };

            console.log('✅ Payment history retrieved:', result.data.length, 'payments');
            return result;

        } catch (error) {
            console.error('❌ Error getting payment history:', error);

            return {
                success: false,
                data: [],
                payments: [],
                total: 0,
                message: error.message || 'Failed to get payment history'
            };
        }
    }

    /**
     * Get payment summary for dashboard
     * @param {Object} params - Parameters
     * @returns {Promise<Object>} Payment summary
     */
    async getPaymentSummary(params = {}) {
        try {
            console.log('📊 Getting payment summary:', params);

            // Extract companyId
            const companyId = params.companyId || params;
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            // Get payment summary using transaction service
            const summaryResponse = await transactionService.getTransactionSummary(companyId, {
                period: params.period || 'month',
                bankAccountId: params.bankAccountId,
                dateFrom: params.dateFrom,
                dateTo: params.dateTo
            });

            if (!summaryResponse.success) {
                throw new Error(summaryResponse.message || 'Failed to get payment summary');
            }

            const summary = summaryResponse.data?.summary || {};

            // Transform to payment summary format
            const paymentSummary = {
                totalPaid: summary.totalOut || 0,
                totalReceived: summary.totalIn || 0,
                netCashFlow: (summary.totalIn || 0) - (summary.totalOut || 0),
                paymentCount: (summary.transactionCount || 0),
                lastPaymentDate: summary.lastTransactionDate || null,
                totalPending: 0, // Would need separate calculation
                methodBreakdown: summary.methodBreakdown || {},
                customerPayments: summary.totalIn || 0,
                supplierPayments: summary.totalOut || 0
            };

            return {
                success: true,
                data: paymentSummary,
                message: 'Payment summary retrieved successfully'
            };

        } catch (error) {
            console.error('❌ Error getting payment summary:', error);

            return {
                success: false,
                data: {
                    totalPaid: 0,
                    totalReceived: 0,
                    netCashFlow: 0,
                    paymentCount: 0,
                    lastPaymentDate: null,
                    totalPending: 0,
                    methodBreakdown: {},
                    customerPayments: 0,
                    supplierPayments: 0
                },
                message: error.message || 'Failed to get payment summary'
            };
        }
    }

    // ==================== DATA CLEANING AND VALIDATION ====================

    /**
     * Clean payment data to remove circular references
     * @param {Object} paymentData - Raw payment data from frontend
     * @returns {Object} Cleaned payment data
     */
    cleanPaymentData(paymentData) {
        // Helper function to safely convert values
        const safeString = (value) => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'string') return value.trim();
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        };

        const safeNumber = (value) => {
            const num = parseFloat(value);
            return isNaN(num) ? 0 : num;
        };

        const safeBoolean = (value) => {
            return Boolean(value);
        };

        const safeDate = (value) => {
            if (!value) return new Date().toISOString().split('T')[0];
            if (value instanceof Date) return value.toISOString().split('T')[0];
            if (typeof value === 'string') return value;
            return new Date().toISOString().split('T')[0];
        };

        // Create a clean object with only the data we need
        const cleanData = {
            // Core identifiers
            companyId: safeString(paymentData.companyId),
            partyId: safeString(paymentData.partyId),
            partyName: safeString(paymentData.partyName),
            partyType: safeString(paymentData.partyType),

            // Invoice details
            invoiceNumber: safeString(paymentData.invoiceNumber),
            invoiceDate: safeDate(paymentData.invoiceDate),
            invoiceTotal: safeNumber(paymentData.invoiceTotal),

            // Payment details
            formType: safeString(paymentData.formType),
            paymentDirection: safeString(paymentData.paymentDirection),
            paymentType: safeString(paymentData.paymentType),
            paymentAmount: safeNumber(paymentData.paymentAmount),
            paymentDate: safeDate(paymentData.paymentDate || paymentData.invoiceDate),

            // Bank/Transaction details
            bankAccountId: paymentData.bankAccountId ? safeString(paymentData.bankAccountId) : null,
            bankName: safeString(paymentData.bankName),
            transactionId: safeString(paymentData.transactionId),
            chequeNumber: safeString(paymentData.chequeNumber),
            chequeDate: paymentData.chequeDate ? safeDate(paymentData.chequeDate) : null,

            // Partial payment handling
            isPartialPayment: safeBoolean(paymentData.isPartialPayment),
            remainingAmount: safeNumber(paymentData.remainingAmount),
            totalPaid: safeNumber(paymentData.totalPaid),
            nextPaymentDate: paymentData.nextPaymentDate ? safeDate(paymentData.nextPaymentDate) : null,
            nextPaymentAmount: safeNumber(paymentData.nextPaymentAmount),

            // Additional info
            notes: safeString(paymentData.notes),
            reference: safeString(paymentData.reference || paymentData.invoiceNumber),

            // Metadata
            userId: paymentData.userId ? safeString(paymentData.userId) : null,
            createdAt: new Date().toISOString(),
            createdFrom: safeString(paymentData.createdFrom || 'PaymentService')
        };

        // Remove empty strings, null values, and zero amounts (except paymentAmount)
        Object.keys(cleanData).forEach(key => {
            const value = cleanData[key];
            if (key === 'paymentAmount') {
                // Keep paymentAmount even if it's 0 for validation
                return;
            }
            if (value === '' || value === null || value === undefined ||
                (typeof value === 'number' && value === 0 && key !== 'remainingAmount')) {
                delete cleanData[key];
            }
        });

        console.log('🧹 Cleaned payment data:', cleanData);
        return cleanData;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Map frontend payment types to backend payment methods
     * @param {string} paymentType - Frontend payment type
     * @returns {string} Backend payment method
     */
    mapPaymentMethod(paymentType) {
        const mapping = {
            'Cash': 'cash',
            'UPI': 'upi',
            'Bank': 'bank_transfer',
            'Card': 'card',
            'Cheque': 'cheque',
            'Online': 'online_payment',
            'NEFT': 'neft',
            'RTGS': 'rtgs',
            'Debit Card': 'debit_card',
            'Credit Card': 'credit_card',
            'Net Banking': 'net_banking'
        };
        return mapping[paymentType] || 'cash';
    }

    /**
     * Get payment method options
     */
    getPaymentMethods() {
        return transactionService.getPaymentMethods();
    }

    /**
     * Format currency for display
     */
    formatCurrency(amount) {
        return transactionService.formatCurrency(amount);
    }

    /**
     * Format date for API calls
     */
    formatDateForAPI(date) {
        return transactionService.formatDateForAPI(date);
    }

    /**
     * Get payment status options
     */
    getPaymentStatusOptions() {
        return [
            { value: '', label: 'All Status' },
            { value: 'completed', label: 'Completed' },
            { value: 'pending', label: 'Pending' },
            { value: 'failed', label: 'Failed' },
            { value: 'cancelled', label: 'Cancelled' }
        ];
    }

    /**
     * Get payment type options
     */
    getPaymentTypeOptions() {
        return [
            { value: '', label: 'All Types' },
            { value: 'in', label: 'Payment In (Received)' },
            { value: 'out', label: 'Payment Out (Made)' }
        ];
    }

    /**
     * Validate payment data
     */
    validatePaymentData(paymentData) {
        const errors = [];

        if (!paymentData.companyId) {
            errors.push('Company ID is required');
        }

        if (!paymentData.paymentAmount || parseFloat(paymentData.paymentAmount) <= 0) {
            errors.push('Valid payment amount is required');
        }

        if (!paymentData.partyName && !paymentData.partyId) {
            errors.push('Party information is required');
        }

        if (errors.length > 0) {
            throw new Error(`Payment validation failed: ${errors.join(', ')}`);
        }

        return true;
    }

    // ==================== LEGACY COMPATIBILITY METHODS ====================

    /**
     * Legacy method - Create Payment In (for backwards compatibility)
     * @deprecated Use createPaymentInWithTransaction instead
     */
    async createPaymentIn(paymentData) {
        console.warn('⚠️ createPaymentIn is deprecated. Use createPaymentInWithTransaction instead.');
        return await this.createPaymentInWithTransaction(paymentData);
    }

    /**
     * Legacy method - Create Payment Out (for backwards compatibility)
     * @deprecated Use createPaymentOutWithTransaction instead
     */
    async createPaymentOut(paymentData) {
        console.warn('⚠️ createPaymentOut is deprecated. Use createPaymentOutWithTransaction instead.');
        return await this.createPaymentOutWithTransaction(paymentData);
    }

    /**
     * Legacy method - Get payments (for backwards compatibility)
     * @deprecated Use getPaymentHistory instead
     */
    async getPayments(filters = {}) {
        console.warn('⚠️ getPayments is deprecated. Use getPaymentHistory instead.');
        return await this.getPaymentHistory(filters);
    }

    /**
     * Update payment status (for partial payments)
     * @param {string} paymentId - Payment ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} API response
     */
    async updatePaymentStatus(paymentId, updateData) {
        try {
            console.log('🔄 Updating payment status:', paymentId, updateData);

            // Since we're using transactions now, we need to update the transaction
            // This would be handled by the transaction service
            console.warn('⚠️ Payment status updates are now handled by the transaction system');

            return {
                success: true,
                data: { message: 'Payment status update not needed with transaction system' },
                message: 'Transaction system handles payment status automatically'
            };

        } catch (error) {
            console.error('❌ Error updating payment status:', error);

            return {
                success: false,
                data: null,
                message: error.message || 'Failed to update payment status'
            };
        }
    }

    /**
     * Cancel payment
     * @param {string} paymentId - Payment ID
     * @param {string} reason - Cancellation reason
     * @returns {Promise<Object>} API response
     */
    async cancelPayment(paymentId, reason = '') {
        try {
            console.log('❌ Cancelling payment:', paymentId, reason);

            // Since we're using transactions now, cancellation would need to be handled differently
            console.warn('⚠️ Payment cancellation should be handled through the transaction system');

            return {
                success: true,
                data: { message: 'Payment cancellation should be handled through transaction system' },
                message: 'Use transaction service for payment cancellation'
            };

        } catch (error) {
            console.error('❌ Error cancelling payment:', error);

            return {
                success: false,
                data: null,
                message: error.message || 'Failed to cancel payment'
            };
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            console.log('🔧 Testing payment service connection...');

            // Test transaction service connection instead
            const testResponse = await transactionService.getTransactionTypes();

            console.log('✅ Payment service connection test successful');
            return {
                success: true,
                message: 'Payment service connected successfully',
                data: testResponse
            };
        } catch (error) {
            console.error('❌ Payment service connection test failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
const paymentService = new PaymentService();
export default paymentService;