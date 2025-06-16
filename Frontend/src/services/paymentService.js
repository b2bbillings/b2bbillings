const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

    // ================================
    // 💰 PAYMENT CREATION METHODS
    // ================================

    /**
     * Create Payment In - Customer pays us
     * @param {Object} paymentData - Payment data from PayIn modal
     * @returns {Promise<Object>} Created payment response
     */
    async createPaymentIn(paymentData) {
        try {
            console.log('💰 Creating Payment In:', paymentData);

            // Validate required fields
            this.validatePaymentData(paymentData);

            // Build payment data for backend API
            const apiPaymentData = {
                partyId: paymentData.partyId,
                amount: parseFloat(paymentData.amount),
                paymentMethod: paymentData.paymentMethod || 'cash',
                paymentDate: paymentData.paymentDate || new Date().toISOString(),
                paymentType: paymentData.paymentType || 'advance',
                saleOrderId: paymentData.saleOrderId || null,
                reference: paymentData.reference || '',
                notes: paymentData.notes || '',
                bankAccountId: paymentData.selectedBank || null,
                employeeName: paymentData.employeeName || '',
                companyId: paymentData.companyId,
                paymentDetails: {
                    bankAccountId: paymentData.selectedBank || null,
                    bankDetails: paymentData.bankDetails || '',
                    employeeName: paymentData.employeeName || '',
                    // Add method-specific details
                    ...(paymentData.paymentMethod === 'cheque' && {
                        chequeNumber: paymentData.bankDetails,
                        chequeDate: paymentData.paymentDate
                    }),
                    ...(paymentData.paymentMethod === 'upi' && {
                        upiTransactionId: paymentData.bankDetails
                    }),
                    ...(paymentData.paymentMethod === 'bank_transfer' && {
                        bankTransactionId: paymentData.bankDetails
                    })
                }
            };

            console.log('🔄 Sending payment data to API:', apiPaymentData);

            // Call the payment API
            const response = await this.apiCall('/payments/pay-in', {
                method: 'POST',
                body: JSON.stringify(apiPaymentData)
            });

            if (response.success) {
                console.log('✅ Payment In created successfully:', response.data);

                return {
                    success: true,
                    data: {
                        _id: response.data.payment._id,
                        paymentId: response.data.payment._id,
                        paymentNumber: response.data.payment.paymentNumber,
                        amount: response.data.payment.amount,
                        paymentMethod: response.data.payment.paymentMethod,
                        paymentDate: response.data.payment.paymentDate,
                        partyName: paymentData.partyName,
                        status: response.data.payment.status,
                        createdAt: response.data.payment.createdAt,
                        party: response.data.party,
                        invoice: response.data.invoice
                    },
                    message: response.message || 'Payment recorded successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to create payment');
            }

        } catch (error) {
            console.error('❌ Error creating Payment In:', error);
            throw error;
        }
    }

    /**
     * Create Payment Out - We pay supplier
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Created payment response
     */
    async createPaymentOut(paymentData) {
        try {
            console.log('💸 Creating Payment Out:', paymentData);

            // Validate required fields
            this.validatePaymentData(paymentData);

            // Build payment data for backend API
            const apiPaymentData = {
                partyId: paymentData.partyId,
                amount: parseFloat(paymentData.amount),
                paymentMethod: paymentData.paymentMethod || 'cash',
                paymentDate: paymentData.paymentDate || new Date().toISOString(),
                reference: paymentData.reference || '',
                notes: paymentData.notes || '',
                employeeName: paymentData.employeeName || '',
                companyId: paymentData.companyId,
                paymentDetails: {
                    bankAccountId: paymentData.selectedBank || null,
                    bankDetails: paymentData.bankDetails || '',
                    employeeName: paymentData.employeeName || ''
                }
            };

            console.log('🔄 Sending payment out data to API:', apiPaymentData);

            // Call the payment API
            const response = await this.apiCall('/payments/pay-out', {
                method: 'POST',
                body: JSON.stringify(apiPaymentData)
            });

            if (response.success) {
                console.log('✅ Payment Out created successfully:', response.data);

                return {
                    success: true,
                    data: {
                        _id: response.data.payment._id,
                        paymentId: response.data.payment._id,
                        paymentNumber: response.data.payment.paymentNumber,
                        amount: response.data.payment.amount,
                        paymentMethod: response.data.payment.paymentMethod,
                        paymentDate: response.data.payment.paymentDate,
                        partyName: paymentData.partyName,
                        status: response.data.payment.status,
                        createdAt: response.data.payment.createdAt,
                        party: response.data.party
                    },
                    message: response.message || 'Payment made successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to create payment out');
            }

        } catch (error) {
            console.error('❌ Error creating Payment Out:', error);
            throw error;
        }
    }

    // ================================
    // 📋 INVOICE AND DATA METHODS
    // ================================

    /**
     * Get pending invoices for payment
     * @param {string} companyId - Company ID
     * @param {string} partyId - Party ID
     * @returns {Promise<Object>} Pending invoices with due amounts
     */
    async getPendingInvoicesForPayment(companyId, partyId) {
        try {
            console.log('🔍 Fetching pending invoices for payment:', { companyId, partyId });

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!partyId) {
                throw new Error('Party ID is required');
            }

            // Use the backend payment API endpoint
            const queryParams = new URLSearchParams({
                companyId: companyId
            });

            console.log('🌐 API Request URL:', `/payments/pending-invoices/${partyId}?${queryParams}`);

            const response = await this.apiCall(`/payments/pending-invoices/${partyId}?${queryParams}`, {
                method: 'GET'
            });

            if (response.success) {
                const invoices = response.data.invoices || response.data.salesOrders || response.data.orders || [];

                console.log('✅ Loaded pending invoices:', invoices.length);

                return {
                    success: true,
                    data: {
                        invoices: invoices,
                        salesOrders: invoices, // For backward compatibility
                        orders: invoices,
                        totalInvoices: invoices.length,
                        totalDueAmount: invoices.reduce((sum, inv) => sum + (inv.dueAmount || 0), 0),
                        party: response.data.party
                    },
                    message: response.message || 'Pending invoices fetched successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to fetch pending invoices');
            }

        } catch (error) {
            console.error('❌ Error fetching pending invoices:', error);
            console.error('📊 Error details:', {
                name: error.name,
                message: error.message,
                companyId,
                partyId
            });
            throw error;
        }
    }

    /**
     * Get bank accounts for company
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Bank accounts list
     */
    async getBankAccounts(companyId) {
        try {
            console.log('🏦 Fetching bank accounts for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            // Call bank accounts API
            const response = await this.apiCall(`/bank-accounts?companyId=${companyId}`, {
                method: 'GET'
            });

            // Handle different response structures
            const bankAccounts = response.data?.bankAccounts ||
                response.bankAccounts ||
                response.data ||
                response ||
                [];

            console.log('✅ Bank accounts fetched:', bankAccounts.length);

            return {
                success: true,
                data: bankAccounts,
                message: 'Bank accounts fetched successfully'
            };

        } catch (error) {
            console.error('❌ Error fetching bank accounts:', error);
            throw error;
        }
    }

    /**
     * Get payment history
     * @param {string} companyId - Company ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Payment history
     */
    async getPaymentHistory(companyId, filters = {}) {
        try {
            console.log('📋 Getting payment history:', { companyId, filters });

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            // Build query parameters
            const queryParams = new URLSearchParams({
                companyId: companyId,
                page: filters.page || 1,
                limit: filters.limit || 50,
                sortBy: filters.sortBy || 'paymentDate',
                sortOrder: filters.sortOrder || 'desc'
            });

            // Add optional filters
            if (filters.paymentType) queryParams.append('paymentType', filters.paymentType);
            if (filters.partyId) queryParams.append('partyId', filters.partyId);
            if (filters.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);

            const response = await this.apiCall(`/payments?${queryParams}`, {
                method: 'GET'
            });

            if (response.success) {
                const payments = response.data.payments || response.data || [];

                return {
                    success: true,
                    data: payments,
                    payments: payments,
                    total: response.data.pagination?.totalRecords || payments.length,
                    pagination: response.data.pagination || {},
                    message: 'Payment history retrieved successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to get payment history');
            }

        } catch (error) {
            console.error('❌ Error getting payment history:', error);
            throw error;
        }
    }

    /**
     * Get payment by ID
     * @param {string} paymentId - Payment ID
     * @returns {Promise<Object>} Payment details
     */
    async getPaymentById(paymentId) {
        try {
            console.log('🔍 Getting payment by ID:', paymentId);

            if (!paymentId) {
                throw new Error('Payment ID is required');
            }

            const response = await this.apiCall(`/payments/${paymentId}`, {
                method: 'GET'
            });

            if (response.success) {
                return {
                    success: true,
                    data: response.data.payment,
                    message: 'Payment details retrieved successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to get payment details');
            }

        } catch (error) {
            console.error('❌ Error getting payment by ID:', error);
            throw error;
        }
    }

    /**
     * Get party payment summary
     * @param {string} partyId - Party ID
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Party payment summary
     */
    async getPartyPaymentSummary(partyId, companyId) {
        try {
            console.log('📊 Getting party payment summary:', { partyId, companyId });

            if (!partyId) {
                throw new Error('Party ID is required');
            }

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await this.apiCall(`/payments/party/${partyId}/summary?companyId=${companyId}`, {
                method: 'GET'
            });

            if (response.success) {
                return {
                    success: true,
                    data: response.data,
                    message: 'Party payment summary retrieved successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to get party payment summary');
            }

        } catch (error) {
            console.error('❌ Error getting party payment summary:', error);
            throw error;
        }
    }

    /**
     * Cancel payment
     * @param {string} paymentId - Payment ID
     * @param {string} reason - Cancellation reason
     * @returns {Promise<Object>} Cancellation response
     */
    async cancelPayment(paymentId, reason) {
        try {
            console.log('❌ Cancelling payment:', { paymentId, reason });

            if (!paymentId) {
                throw new Error('Payment ID is required');
            }

            const response = await this.apiCall(`/payments/${paymentId}/cancel`, {
                method: 'PATCH',
                body: JSON.stringify({
                    reason: reason || 'No reason provided'
                })
            });

            if (response.success) {
                return {
                    success: true,
                    data: response.data,
                    message: 'Payment cancelled successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to cancel payment');
            }

        } catch (error) {
            console.error('❌ Error cancelling payment:', error);
            throw error;
        }
    }

    // ================================
    // 🛠️ UTILITY METHODS
    // ================================

    /**
     * Get available payment methods
     * @returns {Array} Payment method options
     */
    getPaymentMethods() {
        return [
            { value: 'cash', label: 'Cash' },
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'cheque', label: 'Cheque' },
            { value: 'card', label: 'Card Payment' },
            { value: 'upi', label: 'UPI Payment' },
            { value: 'other', label: 'Other' }
        ];
    }

    /**
     * Format currency amount
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    }

    /**
     * Format date for API
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDateForAPI(date) {
        if (!date) return new Date().toISOString().split('T')[0];
        if (date instanceof Date) return date.toISOString().split('T')[0];
        return date;
    }

    /**
     * Validate payment data
     * @param {Object} paymentData - Payment data to validate
     * @throws {Error} Validation error
     */
    validatePaymentData(paymentData) {
        const errors = [];

        if (!paymentData.companyId) {
            errors.push('Company ID is required');
        }

        if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
            errors.push('Valid payment amount is required');
        }

        if (!paymentData.partyId) {
            errors.push('Party ID is required');
        }

        if (!paymentData.paymentMethod) {
            errors.push('Payment method is required');
        }

        if (errors.length > 0) {
            throw new Error(`Payment validation failed: ${errors.join(', ')}`);
        }

        return true;
    }

    /**
     * Calculate payment allocation
     * @param {Array} invoices - Invoices to allocate payment to
     * @param {number} paymentAmount - Total payment amount
     * @returns {Array} Allocated payment amounts
     */
    calculatePaymentAllocation(invoices, paymentAmount) {
        let remainingAmount = parseFloat(paymentAmount);
        const allocations = [];

        // Sort invoices by due date (oldest first)
        const sortedInvoices = [...invoices].sort((a, b) => {
            const dateA = new Date(a.orderDate || a.createdAt);
            const dateB = new Date(b.orderDate || b.createdAt);
            return dateA - dateB;
        });

        for (const invoice of sortedInvoices) {
            if (remainingAmount <= 0) break;

            const dueAmount = parseFloat(invoice.dueAmount || 0);
            const allocationAmount = Math.min(remainingAmount, dueAmount);

            if (allocationAmount > 0) {
                allocations.push({
                    invoiceId: invoice._id || invoice.id,
                    orderNumber: invoice.orderNumber || invoice.saleNumber,
                    dueAmount: dueAmount,
                    allocationAmount: allocationAmount,
                    remainingDue: dueAmount - allocationAmount
                });

                remainingAmount -= allocationAmount;
            }
        }

        return {
            allocations,
            remainingAmount,
            totalAllocated: parseFloat(paymentAmount) - remainingAmount
        };
    }
}

// Export singleton instance
const paymentService = new PaymentService();
export default paymentService;