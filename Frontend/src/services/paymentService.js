// Frontend/src/services/paymentService.js
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
                    if (data.errors && Array.isArray(data.errors)) {
                        errorMessage = data.errors.join(', ');
                    } else if (data.error) {
                        errorMessage = data.error;
                    } else if (data.message) {
                        errorMessage = data.message;
                    } else {
                        errorMessage = 'Invalid payment data. Please check all required fields.';
                    }
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

            return data;

        } catch (error) {
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
            this.validatePaymentData(paymentData);

            const apiPaymentData = {
                party: paymentData.partyId,
                type: 'in',
                companyId: paymentData.companyId,
                amount: parseFloat(paymentData.amount),
                paymentMethod: paymentData.paymentMethod || 'cash',
                paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
                paymentType: paymentData.paymentType || 'advance',
                reference: paymentData.reference || '',
                notes: paymentData.notes || '',
                status: 'completed',
                employeeName: paymentData.employeeName || '',
                employeeId: paymentData.employeeId || '',
                createdBy: paymentData.employeeName || paymentData.createdBy || '',
                ...(paymentData.selectedBank && {
                    bankAccountId: paymentData.selectedBank,
                    bankAccount: paymentData.selectedBank
                }),
                ...(paymentData.bankDetails && {
                    bankDetails: paymentData.bankDetails
                }),
                ...(paymentData.saleOrderId && {
                    saleOrderId: paymentData.saleOrderId,
                    orderId: paymentData.saleOrderId
                }),
                ...(paymentData.invoiceId && {
                    invoiceId: paymentData.invoiceId
                }),
                ...(paymentData.invoiceAllocations && {
                    invoiceAllocations: paymentData.invoiceAllocations,
                    allocations: paymentData.invoiceAllocations
                }),
                partyName: paymentData.partyName || '',
                partyId: paymentData.partyId
            };

            console.log('💰 PaymentService: Creating Payment In with data:', apiPaymentData);

            const response = await this.apiCall('/payments/pay-in', {
                method: 'POST',
                body: JSON.stringify(apiPaymentData)
            });

            console.log('📥 PaymentService: Payment In response:', response);

            if (response.success) {
                // **UPDATED: Handle enhanced response with invoice allocation details**
                return {
                    success: true,
                    data: {
                        _id: response.data.payment?._id || response.data._id,
                        paymentId: response.data.payment?._id || response.data._id,
                        paymentNumber: response.data.payment?.paymentNumber || response.data.paymentNumber,
                        amount: response.data.payment?.amount || response.data.amount,
                        paymentMethod: response.data.payment?.paymentMethod || response.data.paymentMethod,
                        paymentDate: response.data.payment?.paymentDate || response.data.paymentDate,
                        partyName: paymentData.partyName,
                        status: response.data.payment?.status || response.data.status || 'completed',
                        createdAt: response.data.payment?.createdAt || response.data.createdAt,
                        party: response.data.party,

                        // **NEW: Include invoice allocation details**
                        invoiceAllocations: response.data.invoiceAllocations || [],
                        remainingAmount: response.data.remainingAmount || 0,
                        totalInvoicesUpdated: response.data.totalInvoicesUpdated || 0,
                        partyBalance: response.data.partyBalance || response.data.party?.currentBalance || 0,

                        // Enhanced response data for UI display
                        allocationSummary: {
                            totalAllocated: (response.data.invoiceAllocations || []).reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0),
                            invoicesUpdated: response.data.totalInvoicesUpdated || 0,
                            remainingAmount: response.data.remainingAmount || 0,
                            invoiceDetails: response.data.invoiceAllocations || []
                        }
                    },
                    message: response.message || 'Payment recorded successfully',

                    // **NEW: Enhanced success details for UI notifications**
                    details: {
                        paymentAmount: parseFloat(paymentData.amount),
                        invoicesUpdated: response.data.totalInvoicesUpdated || 0,
                        totalAllocated: (response.data.invoiceAllocations || []).reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0),
                        remainingAmount: response.data.remainingAmount || 0,
                        invoiceList: (response.data.invoiceAllocations || []).map(alloc => ({
                            invoiceNumber: alloc.invoiceNumber,
                            allocatedAmount: alloc.allocatedAmount,
                            paymentStatus: alloc.paymentStatus
                        }))
                    }
                };
            } else {
                throw new Error(response.message || 'Failed to create payment');
            }

        } catch (error) {
            console.error('❌ PaymentService: Error in createPaymentIn:', error);
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
            this.validatePaymentData(paymentData);

            const apiPaymentData = {
                party: paymentData.partyId,
                type: 'out',
                companyId: paymentData.companyId,
                amount: parseFloat(paymentData.amount),
                paymentMethod: paymentData.paymentMethod || 'cash',
                paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
                reference: paymentData.reference || '',
                notes: paymentData.notes || '',
                status: 'completed',
                employeeName: paymentData.employeeName || '',
                employeeId: paymentData.employeeId || '',
                createdBy: paymentData.employeeName || paymentData.createdBy || '',
                ...(paymentData.selectedBank && {
                    bankAccountId: paymentData.selectedBank,
                    bankAccount: paymentData.selectedBank
                }),
                ...(paymentData.bankDetails && {
                    bankDetails: paymentData.bankDetails
                }),
                partyName: paymentData.partyName || '',
                partyId: paymentData.partyId
            };

            const response = await this.apiCall('/payments/pay-out', {
                method: 'POST',
                body: JSON.stringify(apiPaymentData)
            });

            if (response.success) {
                return {
                    success: true,
                    data: {
                        _id: response.data.payment?._id || response.data._id,
                        paymentId: response.data.payment?._id || response.data._id,
                        paymentNumber: response.data.payment?.paymentNumber || response.data.paymentNumber,
                        amount: response.data.payment?.amount || response.data.amount,
                        paymentMethod: response.data.payment?.paymentMethod || response.data.paymentMethod,
                        paymentDate: response.data.payment?.paymentDate || response.data.paymentDate,
                        partyName: paymentData.partyName,
                        status: response.data.payment?.status || response.data.status || 'completed',
                        createdAt: response.data.payment?.createdAt || response.data.createdAt,
                        party: response.data.party
                    },
                    message: response.message || 'Payment made successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to create payment out');
            }

        } catch (error) {
            throw error;
        }
    }

    // ================================
    // 🛠️ UTILITY METHODS
    // ================================

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

        if (!paymentData.partyId) {
            errors.push('Party ID is required');
        }

        if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
            errors.push('Valid payment amount is required');
        }

        if (!paymentData.paymentMethod) {
            errors.push('Payment method is required');
        }

        if (paymentData.paymentDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(paymentData.paymentDate)) {
                errors.push('Payment date must be in YYYY-MM-DD format');
            }
        }

        // **NEW: Validate invoice allocations if provided**
        if (paymentData.invoiceAllocations && Array.isArray(paymentData.invoiceAllocations)) {
            paymentData.invoiceAllocations.forEach((allocation, index) => {
                if (!allocation.invoiceId) {
                    errors.push(`Invoice allocation ${index + 1}: Invoice ID is required`);
                }
                if (!allocation.allocatedAmount || parseFloat(allocation.allocatedAmount) <= 0) {
                    errors.push(`Invoice allocation ${index + 1}: Valid allocated amount is required`);
                }
            });
        }

        if (errors.length > 0) {
            throw new Error(`Payment validation failed: ${errors.join(', ')}`);
        }

        return true;
    }

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
     * Format payment allocation summary for display
     * @param {Object} allocationData - Allocation data from payment response
     * @returns {Object} Formatted allocation summary
     */
    formatAllocationSummary(allocationData) {
        if (!allocationData || !allocationData.invoiceAllocations) {
            return {
                hasAllocations: false,
                message: 'No invoice allocations found',
                totalAllocated: 0,
                remainingAmount: 0,
                invoiceDetails: []
            };
        }

        const allocations = allocationData.invoiceAllocations;
        const totalAllocated = allocations.reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0);

        return {
            hasAllocations: allocations.length > 0,
            message: `Payment allocated to ${allocations.length} invoice(s)`,
            totalAllocated: totalAllocated,
            remainingAmount: allocationData.remainingAmount || 0,
            invoiceCount: allocations.length,
            invoiceDetails: allocations.map(alloc => ({
                invoiceNumber: alloc.invoiceNumber,
                allocatedAmount: alloc.allocatedAmount,
                formattedAmount: this.formatCurrency(alloc.allocatedAmount),
                paymentStatus: alloc.paymentStatus || 'updated'
            })),
            summary: {
                totalPayment: totalAllocated + (allocationData.remainingAmount || 0),
                totalAllocated: totalAllocated,
                remainingAmount: allocationData.remainingAmount || 0,
                formattedTotal: this.formatCurrency(totalAllocated + (allocationData.remainingAmount || 0)),
                formattedAllocated: this.formatCurrency(totalAllocated),
                formattedRemaining: this.formatCurrency(allocationData.remainingAmount || 0)
            }
        };
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
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!partyId) {
                throw new Error('Party ID is required');
            }

            const queryParams = new URLSearchParams({
                companyId: companyId
            });

            const response = await this.apiCall(`/payments/pending-invoices/${partyId}?${queryParams}`, {
                method: 'GET'
            });

            if (response.success) {
                const invoices = response.data.invoices || response.data.salesOrders || response.data.orders || [];

                return {
                    success: true,
                    data: {
                        invoices: invoices,
                        salesOrders: invoices,
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
            throw error;
        }
    }

    /**
     * Get payment allocation details
     * @param {string} paymentId - Payment ID
     * @returns {Promise<Object>} Payment allocation details
     */
    async getPaymentAllocations(paymentId) {
        try {
            if (!paymentId) {
                throw new Error('Payment ID is required');
            }

            console.log('🔍 PaymentService: Getting payment allocations for:', paymentId);

            const response = await this.apiCall(`/payments/${paymentId}/allocations`, {
                method: 'GET'
            });

            if (response.success) {
                return {
                    success: true,
                    data: {
                        payment: response.data.payment,
                        allocations: response.data.allocations || [],
                        totalAllocatedAmount: response.data.totalAllocatedAmount || 0,
                        remainingAmount: response.data.remainingAmount || 0
                    },
                    message: response.message || 'Payment allocation details retrieved successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to fetch payment allocation details');
            }

        } catch (error) {
            console.error('❌ PaymentService: Error in getPaymentAllocations:', error);
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
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await this.apiCall(`/bank-accounts?companyId=${companyId}`, {
                method: 'GET'
            });

            const bankAccounts = response.data?.bankAccounts ||
                response.bankAccounts ||
                response.data ||
                response ||
                [];

            return {
                success: true,
                data: bankAccounts,
                message: 'Bank accounts fetched successfully'
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get payment history
     * @param {string} companyId - Company ID (optional for now)
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Payment history
     */
    async getPaymentHistory(companyId, filters = {}) {
        try {
            const queryParams = new URLSearchParams({
                page: filters.page || 1,
                limit: filters.limit || 100,
                sortBy: filters.sortBy || 'paymentDate',
                sortOrder: filters.sortOrder || 'desc'
            });

            // TEMPORARILY SKIP companyId since your payments don't have this field
            // TODO: Add companyId to payment creation later
            // if (companyId) {
            //     queryParams.append('companyId', companyId);
            // }

            // Add optional filters
            if (filters.paymentType) queryParams.append('paymentType', filters.paymentType);
            if (filters.partyId) queryParams.append('partyId', filters.partyId);
            if (filters.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);

            const endpoint = `/payments?${queryParams.toString()}`;
            console.log('🔍 PaymentService: Making API call to:', endpoint);

            const response = await this.apiCall(endpoint, {
                method: 'GET'
            });

            console.log('📥 PaymentService: Raw API response:', response);

            if (response && response.success) {
                // Handle the nested response structure from your backend
                let payments = [];

                // Your backend returns: { success: true, data: { payments: [...], pagination: {...} } }
                if (response.data && response.data.payments && Array.isArray(response.data.payments)) {
                    payments = response.data.payments;
                } else if (response.data && Array.isArray(response.data)) {
                    payments = response.data;
                } else if (response.payments && Array.isArray(response.payments)) {
                    payments = response.payments;
                } else if (Array.isArray(response)) {
                    payments = response;
                }

                console.log('📋 PaymentService: Extracted payments:', payments.length);

                // Party filtering if needed (client-side)
                if (filters.partyId && payments.length > 0) {
                    const originalCount = payments.length;
                    payments = payments.filter(payment => {
                        const paymentPartyId = payment.party || payment.partyId;
                        const match = paymentPartyId === filters.partyId ||
                            paymentPartyId?.toString() === filters.partyId?.toString();
                        return match;
                    });
                    console.log(`🔍 PaymentService: Filtered payments from ${originalCount} to ${payments.length} for party ${filters.partyId}`);
                }

                // Process and normalize payment data
                const processedPayments = payments.map(payment => ({
                    ...payment,
                    id: payment._id || payment.id,
                    type: payment.type || payment.paymentType || (payment.amount > 0 ? 'payment_in' : 'payment_out'),
                    amount: parseFloat(payment.amount || 0),
                    paymentDate: payment.paymentDate || payment.createdAt,
                    paymentMethod: payment.paymentMethod || 'cash',
                    reference: payment.reference || payment.paymentNumber || `PAY-${(payment._id || payment.id)?.toString().substring(0, 8)}`,
                    status: payment.status || 'completed',
                    notes: payment.notes || '',
                    partyName: payment.partyName || '',
                    employeeName: payment.employeeName || '',
                    companyId: payment.companyId || payment.company,
                    partyId: payment.partyId || payment.party
                }));

                console.log('✅ PaymentService: Processed payments:', processedPayments.length);

                // Extract pagination from the correct location
                const pagination = response.data?.pagination || response.pagination || {
                    page: parseInt(filters.page || 1),
                    limit: parseInt(filters.limit || 100),
                    totalRecords: processedPayments.length,
                    totalPages: Math.ceil(processedPayments.length / parseInt(filters.limit || 100))
                };

                return {
                    success: true,
                    data: processedPayments,
                    payments: processedPayments,
                    total: pagination.totalRecords || processedPayments.length,
                    pagination: pagination,
                    message: processedPayments.length > 0
                        ? `${processedPayments.length} payments retrieved successfully`
                        : 'No payments found for the specified criteria'
                };
            } else {
                console.log('⚠️ PaymentService: API returned unsuccessful response');
                return {
                    success: true,
                    data: [],
                    payments: [],
                    total: 0,
                    pagination: {},
                    message: response?.message || 'No payments found'
                };
            }

        } catch (error) {
            console.error('❌ PaymentService: Error in getPaymentHistory:', error);

            return {
                success: false,
                data: [],
                payments: [],
                total: 0,
                pagination: {},
                message: error.message || 'Failed to load payment history',
                error: error.message
            };
        }
    }

    /**
     * Get payment history for a specific party
     * @param {string} companyId - Company ID (optional for now)
     * @param {string} partyId - Party ID
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Party payment history
     */
    async getPartyPaymentHistory(companyId, partyId, options = {}) {
        try {
            if (!partyId) {
                throw new Error('Party ID is required');
            }

            console.log('🔍 PaymentService: Getting party payment history for:', { companyId, partyId });

            const filters = {
                ...options,
                partyId: partyId,
                limit: options.limit || 100,
                sortBy: options.sortBy || 'paymentDate',
                sortOrder: options.sortOrder || 'desc'
            };

            // Don't add companyId for now since payments don't have this field
            // TODO: Add companyId filtering when you update payment creation

            const result = await this.getPaymentHistory(null, filters); // Pass null for companyId

            console.log('✅ PaymentService: Party payment history result:', {
                success: result.success,
                count: result.data?.length || 0,
                partyId
            });

            return result;

        } catch (error) {
            console.error('❌ PaymentService: Error in getPartyPaymentHistory:', error);
            return {
                success: false,
                data: [],
                payments: [],
                total: 0,
                pagination: {},
                message: error.message || 'Failed to load party payment history',
                error: error.message
            };
        }
    }

    /**
     * Get payment summary for a party
     * @param {string} companyId - Company ID  
     * @param {string} partyId - Party ID
     * @returns {Promise<Object>} Payment summary
     */
    async getPartyPaymentSummary(companyId, partyId) {
        try {
            if (!companyId || !partyId) {
                throw new Error('Company ID and Party ID are required');
            }

            const response = await this.apiCall(`/payments/party/${partyId}/summary?companyId=${companyId}`, {
                method: 'GET'
            });

            if (response && response.success) {
                return {
                    success: true,
                    data: response.data || response.summary || {},
                    message: response.message || 'Payment summary retrieved successfully'
                };
            } else {
                // Fallback: calculate summary from payment history
                const historyResult = await this.getPartyPaymentHistory(companyId, partyId);

                if (historyResult.success && historyResult.data.length > 0) {
                    const payments = historyResult.data;
                    const summary = {
                        totalPayments: payments.length,
                        totalPaymentsIn: payments.filter(p => p.type === 'payment_in').reduce((sum, p) => sum + p.amount, 0),
                        totalPaymentsOut: payments.filter(p => p.type === 'payment_out').reduce((sum, p) => sum + p.amount, 0),
                        netAmount: 0
                    };
                    summary.netAmount = summary.totalPaymentsIn - summary.totalPaymentsOut;

                    return {
                        success: true,
                        data: summary,
                        message: 'Payment summary calculated from history'
                    };
                }

                return {
                    success: true,
                    data: {
                        totalPayments: 0,
                        totalPaymentsIn: 0,
                        totalPaymentsOut: 0,
                        netAmount: 0
                    },
                    message: 'No payment data found'
                };
            }

        } catch (error) {
            console.error('❌ PaymentService: Error in getPartyPaymentSummary:', error);
            return {
                success: false,
                data: {
                    totalPayments: 0,
                    totalPaymentsIn: 0,
                    totalPaymentsOut: 0,
                    netAmount: 0
                },
                message: error.message || 'Failed to load payment summary',
                error: error.message
            };
        }
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