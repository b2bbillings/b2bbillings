const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class TransactionService {
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

    // ✅ FIXED: Enhanced helper method for API calls with better error handling
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        console.log('🔗 Transaction API Call:', {
            url,
            method: config.method || 'GET',
            headers: config.headers
        });

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
                console.error('❌ Transaction API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data,
                    url: endpoint
                });

                let errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;

                // Enhanced error handling
                switch (response.status) {
                    case 400:
                        errorMessage = data.message || 'Invalid transaction data provided';
                        break;
                    case 401:
                        errorMessage = 'Authentication required. Please login again.';
                        // Clear invalid tokens
                        localStorage.removeItem('token');
                        localStorage.removeItem('authToken');
                        sessionStorage.removeItem('token');
                        break;
                    case 403:
                        errorMessage = 'Access denied. You do not have permission for this operation.';
                        break;
                    case 404:
                        errorMessage = 'Transaction or resource not found.';
                        break;
                    case 409:
                        errorMessage = data.message || 'Transaction conflict. This transaction may already exist.';
                        break;
                    case 422:
                        errorMessage = data.message || 'Invalid transaction data. Please check all fields.';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later.';
                        break;
                    case 502:
                    case 503:
                    case 504:
                        errorMessage = 'Service temporarily unavailable. Please try again later.';
                        break;
                    default:
                        errorMessage = data.message || `Request failed with status ${response.status}`;
                }

                const error = new Error(errorMessage);
                error.status = response.status;
                error.response = data;
                throw error;
            }

            // Log successful responses with summary
            console.log('✅ Transaction API Success:', {
                endpoint,
                dataType: Array.isArray(data?.data) ? `Array(${data.data.length})` : typeof data?.data,
                success: data?.success !== false
            });

            return data;

        } catch (error) {
            // ✅ FIXED: Better error handling for network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('❌ Network Error - API might be down:', {
                    endpoint,
                    baseURL: this.baseURL,
                    error: error.message
                });

                const networkError = new Error('Unable to connect to server. Please check your internet connection.');
                networkError.status = 0;
                networkError.isNetworkError = true;
                throw networkError;
            }

            // Enhance error logging
            console.error('❌ Transaction API Error:', {
                endpoint,
                error: error.message,
                status: error.status,
                stack: error.stack?.split('\n')[0]
            });
            throw error;
        }
    }

    // ==================== ENHANCED TRANSACTION CRUD OPERATIONS ====================

    /**
     * ✅ FIXED: Create a new transaction with enhanced validation
     */
    async createTransaction(companyId, transactionData) {
        try {
            console.log('💳 Creating transaction:', { companyId, transactionData });

            // Enhanced validation
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!transactionData.bankAccountId) {
                throw new Error('Bank account ID is required');
            }

            const amount = parseFloat(transactionData.amount);
            if (!amount || amount <= 0) {
                throw new Error('Valid amount greater than 0 is required');
            }

            if (!transactionData.direction || !['in', 'out'].includes(transactionData.direction)) {
                throw new Error('Transaction direction must be "in" or "out"');
            }

            if (!transactionData.transactionType) {
                throw new Error('Transaction type is required');
            }

            if (!transactionData.description?.trim()) {
                throw new Error('Transaction description is required');
            }

            // Clean and prepare transaction data
            const cleanTransactionData = {
                companyId,
                bankAccountId: transactionData.bankAccountId,
                amount: amount,
                direction: transactionData.direction,
                transactionType: transactionData.transactionType,
                paymentMethod: transactionData.paymentMethod || 'cash',
                description: transactionData.description.trim(),
                notes: transactionData.notes?.trim() || '',

                // Party information
                partyId: transactionData.partyId || null,
                partyName: transactionData.partyName?.trim() || '',
                partyType: transactionData.partyType || '',

                // Reference information
                referenceId: transactionData.referenceId || null,
                referenceType: transactionData.referenceType || 'payment',
                referenceNumber: transactionData.referenceNumber?.trim() || '',

                // Payment specific details
                chequeNumber: transactionData.chequeNumber?.trim() || '',
                chequeDate: transactionData.chequeDate || null,
                upiTransactionId: transactionData.upiTransactionId?.trim() || '',
                bankTransactionId: transactionData.bankTransactionId?.trim() || '',

                // Metadata
                transactionDate: transactionData.transactionDate || new Date().toISOString(),
                status: transactionData.status || 'completed'
            };

            // Remove empty strings and null values
            Object.keys(cleanTransactionData).forEach(key => {
                if (cleanTransactionData[key] === '' || cleanTransactionData[key] === null) {
                    delete cleanTransactionData[key];
                }
            });

            const response = await this.apiCall(`/companies/${companyId}/transactions`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'x-company-id': companyId
                },
                body: JSON.stringify(cleanTransactionData)
            });

            console.log('✅ Transaction created successfully:', {
                transactionId: response.data?.transactionId,
                amount: response.data?.amount,
                direction: response.data?.direction
            });

            return {
                success: true,
                data: response.data || response,
                message: 'Transaction created successfully'
            };

        } catch (error) {
            console.error('❌ Error creating transaction:', error);
            return {
                success: false,
                data: null,
                message: error.message || 'Failed to create transaction',
                error: error.message
            };
        }
    }

    /**
     * ✅ FIXED: Get all transactions for a company with enhanced filtering
     */
    async getTransactions(companyId, filters = {}) {
        try {
            console.log('📋 Getting transactions:', { companyId, filters });

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            // ✅ FIXED: Validate company ID format
            if (typeof companyId !== 'string' || companyId.length < 10) {
                throw new Error(`Invalid company ID format: ${companyId}`);
            }

            // Build query parameters with proper encoding
            const queryParams = new URLSearchParams();

            // Pagination
            queryParams.append('page', filters.page || 1);
            queryParams.append('limit', filters.limit || 50);

            // Sorting
            if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
            if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

            // Filtering
            if (filters.transactionType) queryParams.append('transactionType', filters.transactionType);
            if (filters.direction) queryParams.append('direction', filters.direction);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
            if (filters.bankAccountId) queryParams.append('bankAccountId', filters.bankAccountId);
            if (filters.partyId) queryParams.append('partyId', filters.partyId);

            // Date filtering
            if (filters.dateFrom) queryParams.append('dateFrom', this.formatDateForAPI(filters.dateFrom));
            if (filters.dateTo) queryParams.append('dateTo', this.formatDateForAPI(filters.dateTo));
            if (filters.startDate) queryParams.append('startDate', this.formatDateForAPI(filters.startDate));
            if (filters.endDate) queryParams.append('endDate', this.formatDateForAPI(filters.endDate));

            // Search
            if (filters.search) queryParams.append('search', filters.search);

            // ✅ FIXED: Enhanced API call with proper error handling
            const response = await this.apiCall(`/companies/${companyId}/transactions?${queryParams}`, {
                headers: {
                    ...this.getAuthHeaders(),
                    'x-company-id': companyId  // ✅ Add as header backup
                }
            });

            // ✅ FIXED: Better response handling
            const transactions = response.data?.transactions || response.data || [];
            const pagination = response.data?.pagination || {};

            return {
                success: true,
                data: {
                    transactions: transactions,
                    pagination: {
                        page: parseInt(filters.page) || 1,
                        limit: parseInt(filters.limit) || 50,
                        total: pagination.totalTransactions || pagination.total || transactions.length,
                        totalPages: pagination.totalPages || Math.ceil((pagination.totalTransactions || transactions.length) / (parseInt(filters.limit) || 50)),
                        hasNext: pagination.hasNext || false,
                        hasPrev: pagination.hasPrev || false
                    },
                    summary: response.data?.summary || {}
                },
                message: 'Transactions retrieved successfully'
            };

        } catch (error) {
            console.error('❌ Error getting transactions:', error);

            // ✅ ENHANCED: Better error logging for debugging
            if (error.status === 400 && error.message?.includes('Company ID')) {
                console.error('🔍 Company ID Issue Debug:', {
                    providedCompanyId: companyId,
                    companyIdType: typeof companyId,
                    companyIdLength: companyId?.length,
                    filters: filters
                });
            }

            return {
                success: false,
                data: {
                    transactions: [],
                    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
                    summary: {}
                },
                message: error.message || 'Failed to get transactions'
            };
        }
    }

    /**
     * ✅ FIXED: Get transaction by ID
     */
    async getTransactionById(companyId, transactionId) {
        try {
            console.log('🔍 Getting transaction by ID:', { companyId, transactionId });

            if (!companyId || !transactionId) {
                throw new Error('Company ID and Transaction ID are required');
            }

            const response = await this.apiCall(`/companies/${companyId}/transactions/${transactionId}`, {
                headers: {
                    ...this.getAuthHeaders(),
                    'x-company-id': companyId
                }
            });

            return {
                success: true,
                data: response.data || response,
                message: 'Transaction retrieved successfully'
            };

        } catch (error) {
            console.error('❌ Error getting transaction:', error);
            return {
                success: false,
                data: null,
                message: error.message || 'Failed to get transaction'
            };
        }
    }

    /**
     * ✅ FIXED: Get transactions for a specific bank account
     */
    async getBankAccountTransactions(companyId, bankAccountId, filters = {}) {
        try {
            console.log('🏦 Getting bank account transactions:', { companyId, bankAccountId, filters });

            if (!companyId || !bankAccountId) {
                throw new Error('Company ID and Bank Account ID are required');
            }

            // Add bankAccountId to filters and use main getTransactions method
            const bankFilters = {
                ...filters,
                bankAccountId: bankAccountId
            };

            return await this.getTransactions(companyId, bankFilters);

        } catch (error) {
            console.error('❌ Error getting bank account transactions:', error);
            return {
                success: false,
                data: {
                    transactions: [],
                    pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
                    summary: {}
                },
                message: error.message || 'Failed to get bank account transactions'
            };
        }
    }

    /**
     * ✅ FIXED: Get enhanced transaction summary
     */
    async getTransactionSummary(companyId, options = {}) {
        try {
            console.log('📊 Getting transaction summary:', { companyId, options });

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const queryParams = new URLSearchParams();
            queryParams.append('period', options.period || 'month');

            if (options.bankAccountId) queryParams.append('bankAccountId', options.bankAccountId);
            if (options.dateFrom) queryParams.append('dateFrom', this.formatDateForAPI(options.dateFrom));
            if (options.dateTo) queryParams.append('dateTo', this.formatDateForAPI(options.dateTo));
            if (options.startDate) queryParams.append('startDate', this.formatDateForAPI(options.startDate));
            if (options.endDate) queryParams.append('endDate', this.formatDateForAPI(options.endDate));

            const response = await this.apiCall(`/companies/${companyId}/transactions/summary?${queryParams}`, {
                headers: {
                    ...this.getAuthHeaders(),
                    'x-company-id': companyId
                }
            });

            // Transform summary data
            const summaryData = response.data?.summary || response.data || {};

            const enhancedSummary = {
                totalIn: summaryData.totalIn || 0,
                totalOut: summaryData.totalOut || 0,
                netAmount: summaryData.netAmount || (summaryData.totalIn || 0) - (summaryData.totalOut || 0),
                totalTransactions: summaryData.totalTransactions || 0,

                // Transaction type breakdown
                totalSales: summaryData.totalSales || 0,
                totalPurchases: summaryData.totalPurchases || 0,
                totalPaymentsIn: summaryData.totalPaymentsIn || 0,
                totalPaymentsOut: summaryData.totalPaymentsOut || 0,

                // Period info
                period: options.period || 'month',
                dateRange: {
                    from: options.dateFrom || options.startDate,
                    to: options.dateTo || options.endDate
                }
            };

            return {
                success: true,
                data: {
                    summary: enhancedSummary
                },
                message: 'Transaction summary retrieved successfully'
            };

        } catch (error) {
            console.error('❌ Error getting transaction summary:', error);
            return {
                success: false,
                data: {
                    summary: {
                        totalIn: 0,
                        totalOut: 0,
                        netAmount: 0,
                        totalTransactions: 0
                    }
                },
                message: error.message || 'Failed to get transaction summary'
            };
        }
    }

    /**
     * ✅ NEW: Create Payment In Transaction (Customer pays us)
     * @param {string} companyId - Company ID
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} API response
     */
    async createPaymentInTransaction(companyId, paymentData) {
        try {
            console.log('💰 Creating Payment In transaction:', { companyId, paymentData });

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const transactionData = {
                ...paymentData,
                direction: 'in',
                transactionType: 'payment_in',
                companyId
            };

            // Use your existing createTransaction method
            return await this.createTransaction(companyId, transactionData);

        } catch (error) {
            console.error('❌ Error creating Payment In transaction:', error);
            return {
                success: false,
                data: null,
                message: error.message || 'Failed to create Payment In transaction',
                error: error.message
            };
        }
    }

    /**
     * ✅ NEW: Create Payment Out Transaction (We pay supplier)  
     * @param {string} companyId - Company ID
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} API response
     */
    async createPaymentOutTransaction(companyId, paymentData) {
        try {
            console.log('💸 Creating Payment Out transaction:', { companyId, paymentData });

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const transactionData = {
                ...paymentData,
                direction: 'out',
                transactionType: 'payment_out',
                companyId
            };

            // Use your existing createTransaction method
            return await this.createTransaction(companyId, transactionData);

        } catch (error) {
            console.error('❌ Error creating Payment Out transaction:', error);
            return {
                success: false,
                data: null,
                message: error.message || 'Failed to create Payment Out transaction',
                error: error.message
            };
        }
    }

    /**
     * ✅ NEW: Get payment methods list
     */
    getPaymentMethods() {
        return [
            { value: 'cash', label: 'Cash' },
            { value: 'upi', label: 'UPI' },
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'cheque', label: 'Cheque' },
            { value: 'card', label: 'Card' },
            { value: 'net_banking', label: 'Net Banking' },
            { value: 'neft', label: 'NEFT' },
            { value: 'rtgs', label: 'RTGS' }
        ];
    }

    /**
     * ✅ NEW: Get transaction types list
     */
    getTransactionTypes() {
        return [
            { value: 'payment_in', label: 'Payment In' },
            { value: 'payment_out', label: 'Payment Out' },
            { value: 'sale', label: 'Sale' },
            { value: 'purchase', label: 'Purchase' },
            { value: 'transfer', label: 'Transfer' },
            { value: 'fee', label: 'Fee' },
            { value: 'refund', label: 'Refund' },
            { value: 'other', label: 'Other' }
        ];
    }


    // ==================== ENHANCED UTILITY METHODS ====================

    /**
     * ✅ FIXED: Enhanced currency formatting
     */
    formatCurrency(amount, options = {}) {
        const {
            currency = 'INR',
            locale = 'en-IN',
            showSign = false,
            minimumFractionDigits = 2
        } = options;

        try {
            const formattedAmount = new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits
            }).format(Math.abs(amount) || 0);

            if (showSign && amount !== 0) {
                return amount > 0 ? `+${formattedAmount}` : `-${formattedAmount}`;
            }

            return formattedAmount;
        } catch (error) {
            console.warn('Error formatting currency:', error);
            return `₹${amount || 0}`;
        }
    }

    /**
     * ✅ FIXED: Enhanced date formatting for API calls
     */
    formatDateForAPI(date) {
        if (!date) return null;

        try {
            if (typeof date === 'string') {
                // Check if it's already in ISO format
                if (date.includes('T')) {
                    return date.split('T')[0];
                }
                // Check if it's already in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    return date;
                }
            }

            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                console.warn('Invalid date provided:', date);
                return null;
            }

            return dateObj.toISOString().split('T')[0];
        } catch (error) {
            console.warn('Error formatting date:', date, error);
            return null;
        }
    }

    /**
     * ✅ FIXED: Format date for display
     */
    formatDateForDisplay(date, options = {}) {
        if (!date) return 'N/A';

        try {
            const {
                locale = 'en-IN',
                dateStyle = 'medium',
                timeStyle = undefined
            } = options;

            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return 'Invalid Date';

            return dateObj.toLocaleDateString(locale, {
                dateStyle,
                ...(timeStyle && { timeStyle })
            });
        } catch (error) {
            console.warn('Error formatting date for display:', date, error);
            return 'Invalid Date';
        }
    }

    /**
     * ✅ FIXED: Test API connection and service health
     */
    async testConnection() {
        try {
            console.log('🔧 Testing transaction service connection...');

            const response = await this.apiCall('/health', {
                method: 'GET'
            });

            console.log('✅ Transaction service connection test successful');
            return {
                success: true,
                message: 'Transaction service connected successfully',
                data: response
            };
        } catch (error) {
            console.error('❌ Transaction service connection test failed:', error);
            return {
                success: false,
                message: error.message || 'Connection test failed',
                error: error.message
            };
        }
    }
}

// ✅ FIXED: Export single instance
export default new TransactionService();