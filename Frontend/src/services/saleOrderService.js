import axios from 'axios';
import apiConfig from '../config/api';

// Create axios instance with your API configuration
const apiClient = axios.create({
    baseURL: apiConfig.baseURL,
    timeout: apiConfig.timeout,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
        }
        return Promise.reject(error);
    }
);

class SaleOrderService {
    // ==================== BASIC CRUD OPERATIONS ====================

    /**
     * Create a new sales order/quotation/proforma invoice
     */
    async createSalesOrder(orderData) {
        try {
            const response = await apiClient.post('/api/sales-orders', orderData);
            return {
                success: true,
                data: response.data,
                message: response.data.message || 'Sales order created successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to create sales order',
                error: error.response?.data?.error
            };
        }
    }

    /**
     * Get all sales orders with advanced filtering - Enhanced for PayIn compatibility
     */
    async getSalesOrders(companyId, filters = {}) {
        try {
            const params = {
                companyId,
                page: filters.page || 1,
                limit: filters.limit || 10,
                ...filters
            };

            // Add customer filtering for PayIn
            if (filters.customerId) {
                params.customerId = filters.customerId;
            }
            if (filters.customerName) {
                params.customerName = filters.customerName;
            }

            // Add status filtering for pending orders
            if (filters.status) {
                params.status = filters.status;
            }

            // Add order type filtering
            if (filters.orderType) {
                params.orderType = filters.orderType;
            }

            // Add date range filtering
            if (filters.dateFrom) {
                params.dateFrom = filters.dateFrom;
            }
            if (filters.dateTo) {
                params.dateTo = filters.dateTo;
            }

            console.log('📡 Fetching sales orders with params:', params);

            const response = await apiClient.get('/api/sales-orders', { params });

            // Handle different response structures
            const rawData = response.data;
            let salesOrders = [];

            if (rawData.data && Array.isArray(rawData.data)) {
                salesOrders = rawData.data;
            } else if (rawData.salesOrders && Array.isArray(rawData.salesOrders)) {
                salesOrders = rawData.salesOrders;
            } else if (rawData.orders && Array.isArray(rawData.orders)) {
                salesOrders = rawData.orders;
            } else if (Array.isArray(rawData)) {
                salesOrders = rawData;
            }

            console.log('✅ Processed sales orders:', salesOrders.length);

            return {
                success: true,
                data: {
                    salesOrders: salesOrders,
                    orders: salesOrders,
                    data: salesOrders,
                    pagination: rawData.pagination || {},
                    summary: rawData.summary || {}
                },
                message: 'Sales orders fetched successfully'
            };
        } catch (error) {
            console.error('❌ Error fetching sales orders:', error);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch sales orders',
                data: {
                    salesOrders: [],
                    orders: [],
                    data: []
                }
            };
        }
    }

    /**
     * ✅ NEW: Get sales (alias for getSalesOrders for backward compatibility with PayIn)
     */
    async getSales(companyId, filters = {}) {
        console.log('🔄 getSales called - redirecting to getSalesOrders');
        return this.getSalesOrders(companyId, filters);
    }

    /**
     * ✅ NEW: Get pending sales orders for payment (specific for PayIn component)
     */
    async getPendingSalesForPayment(companyId, customerId, customerName = null) {
        try {
            console.log('💰 Loading pending sales for payment:', { companyId, customerId, customerName });

            const filters = {
                customerId: customerId,
                customerName: customerName,
                status: 'sent,confirmed,delivered,pending', // Orders that can receive payments
                orderType: 'sales_order', // Only sales orders, not quotations
                limit: 100,
                page: 1,
                // Add date range to limit results (last 2 years)
                dateFrom: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0]
            };

            const response = await this.getSalesOrders(companyId, filters);

            if (response.success) {
                const allOrders = response.data.salesOrders || response.data.orders || response.data.data || [];
                console.log('📋 Total orders fetched:', allOrders.length);

                // Filter orders with pending amounts on client side
                const ordersWithPending = allOrders.filter(order => {
                    if (!order) return false;

                    // Verify customer match (more flexible matching)
                    const orderCustomerId = order.customerId || order.customer?._id || order.customer?.id;
                    const orderCustomerName = order.customerName || order.customer?.name || order.customer?.businessName;
                    const orderCustomerPhone = order.customerPhone || order.mobileNumber || order.customer?.phone;

                    const partyId = customerId;
                    const partyName = customerName;

                    const isCustomerMatch = orderCustomerId === partyId ||
                        orderCustomerName === partyName ||
                        (orderCustomerPhone && orderCustomerPhone === partyName); // Phone match as fallback

                    if (!isCustomerMatch) {
                        console.log('❌ Customer mismatch for order:', order.orderNumber, {
                            orderCustomerId,
                            orderCustomerName,
                            orderCustomerPhone,
                            partyId,
                            partyName
                        });
                        return false;
                    }

                    // Check pending amount
                    const totalAmount = parseFloat(order.totalAmount || order.amount || order.finalTotal || order.grandTotal || 0);
                    const paidAmount = parseFloat(order.paidAmount || order.amountPaid || order.receivedAmount || 0);
                    const pendingAmount = totalAmount - paidAmount;

                    console.log(`💸 Order ${order.orderNumber || order._id} payment status:`, {
                        totalAmount,
                        paidAmount,
                        pendingAmount,
                        hasPending: pendingAmount > 0.01
                    });

                    return pendingAmount > 0.01; // At least 1 paisa pending
                });

                console.log('✅ Orders with pending amounts:', ordersWithPending.length);

                // Sort by order date (newest first)
                ordersWithPending.sort((a, b) => {
                    const dateA = new Date(a.orderDate || a.saleDate || a.quotationDate || a.createdAt);
                    const dateB = new Date(b.orderDate || b.saleDate || b.quotationDate || b.createdAt);
                    return dateB - dateA;
                });

                return {
                    success: true,
                    data: {
                        salesOrders: ordersWithPending,
                        orders: ordersWithPending,
                        data: ordersWithPending,
                        count: ordersWithPending.length,
                        totalPending: ordersWithPending.reduce((sum, order) => {
                            const total = parseFloat(order.totalAmount || order.amount || order.finalTotal || 0);
                            const paid = parseFloat(order.paidAmount || order.amountPaid || 0);
                            return sum + (total - paid);
                        }, 0)
                    },
                    message: `Found ${ordersWithPending.length} pending sales orders`
                };
            }

            return response;

        } catch (error) {
            console.error('❌ Error in getPendingSalesForPayment:', error);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch pending sales orders',
                data: {
                    salesOrders: [],
                    orders: [],
                    data: [],
                    count: 0,
                    totalPending: 0
                }
            };
        }
    }



    /**
     * ✅ NEW: Get customer's sales order summary for payment
     */
    async getCustomerOrderSummary(companyId, customerId, customerName = null) {
        try {
            const response = await this.getPendingSalesForPayment(companyId, customerId, customerName);

            if (response.success) {
                const orders = response.data.salesOrders || [];

                const summary = {
                    totalOrders: orders.length,
                    totalPendingAmount: response.data.totalPending || 0,
                    oldestPendingOrder: orders.length > 0 ? orders[orders.length - 1] : null,
                    newestOrder: orders.length > 0 ? orders[0] : null,
                    ordersByStatus: {}
                };

                // Group by status
                orders.forEach(order => {
                    const status = order.status || 'pending';
                    if (!summary.ordersByStatus[status]) {
                        summary.ordersByStatus[status] = 0;
                    }
                    summary.ordersByStatus[status]++;
                });

                return {
                    success: true,
                    data: summary,
                    message: 'Customer order summary fetched successfully'
                };
            }

            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to fetch customer order summary',
                data: null
            };
        }
    }

    /**
     * Get sales order by ID with full details
     */
    async getSalesOrderById(orderId) {
        try {
            const response = await apiClient.get(`/api/sales-orders/${orderId}`);
            return {
                success: true,
                data: response.data,
                message: 'Sales order fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch sales order'
            };
        }
    }

    /**
     * Update sales order
     */
    async updateSalesOrder(orderId, orderData) {
        try {
            const response = await apiClient.put(`/api/sales-orders/${orderId}`, orderData);
            return {
                success: true,
                data: response.data,
                message: 'Sales order updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to update sales order'
            };
        }
    }

    /**
     * Delete/Cancel sales order
     */
    async deleteSalesOrder(orderId) {
        try {
            const response = await apiClient.delete(`/api/sales-orders/${orderId}`);
            return {
                success: true,
                data: response.data,
                message: 'Sales order cancelled successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to delete sales order'
            };
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Enhanced client-side fallback generation with better logic
     */
    generateFallbackOrderNumber(companyId, orderType = 'quotation', userId = null) {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        // Use company ID and user ID for uniqueness
        const companyHash = companyId ? companyId.slice(-3) : '001';
        const userHash = userId ? userId.slice(-2) : '01';
        const random = Math.floor(100 + Math.random() * 900);

        let prefix = 'DOC';
        switch (orderType) {
            case 'quotation':
                prefix = 'QUO';
                break;
            case 'sales_order':
                prefix = 'SO';
                break;
            case 'proforma_invoice':
                prefix = 'PI';
                break;
            default:
                prefix = 'QUO';
        }

        return `${prefix}-${year}${month}${day}${hours}${minutes}-${companyHash}${userHash}${random}`;
    }

    /**
     * Generate order number with exact route matching
     */
    async generateOrderNumber(companyId, orderType = 'quotation', userId = null) {
        // Always provide fallback first for immediate response
        const fallbackNumber = this.generateFallbackOrderNumber(companyId, orderType, userId);

        // Try the exact endpoints that exist in your backend routes
        const endpointsToTry = [
            '/api/sales-orders/generate-number',
            '/api/sales-orders/next-order-number',
            '/api/sales-orders/next-number'
        ];

        for (const endpoint of endpointsToTry) {
            try {
                const params = {
                    companyId,
                    orderType,
                    type: orderType
                };

                const response = await apiClient.get(endpoint, { params });

                if (response.data) {
                    const serverNumber = response.data.nextOrderNumber ||
                        response.data.orderNumber ||
                        response.data.number ||
                        response.data.quotationNumber ||
                        response.data.data?.nextOrderNumber;

                    if (serverNumber) {
                        return {
                            success: true,
                            data: { nextOrderNumber: serverNumber },
                            message: 'Order number generated successfully',
                            source: 'server'
                        };
                    }
                }
            } catch (error) {
                continue;
            }
        }

        // All endpoints failed, use fallback
        return {
            success: true,
            data: { nextOrderNumber: fallbackNumber },
            message: 'Order number generated (fallback)',
            source: 'fallback'
        };
    }

    /**
     * Get next order number (alternative method)
     */
    async getNextOrderNumber(companyId, orderType = 'quotation', userId = null) {
        return this.generateOrderNumber(companyId, orderType, userId);
    }

    // ==================== FILTERING AND SEARCH ====================

    /**
     * Get quotations
     */
    async getQuotations(companyId, filters = {}) {
        try {
            const params = new URLSearchParams({
                companyId,
                orderType: 'quotation',
                page: filters.page || 1,
                limit: filters.limit || 50
            });

            // Add date filters if provided
            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);

            const response = await apiClient.get(`/api/sales-orders/quotations?${params.toString()}`);

            // Flatten the nested response structure
            const rawData = response.data.data || response.data;

            // Handle nested quotations structure
            let quotationsArray = [];

            if (rawData.quotations && rawData.quotations.salesOrders) {
                quotationsArray = rawData.quotations.salesOrders;
            } else if (rawData.salesOrders) {
                quotationsArray = rawData.salesOrders;
            } else if (rawData.quotations && Array.isArray(rawData.quotations)) {
                quotationsArray = rawData.quotations;
            } else if (Array.isArray(rawData)) {
                quotationsArray = rawData;
            }

            // Ensure we always return an array
            const finalArray = Array.isArray(quotationsArray) ? quotationsArray : [];

            return {
                success: true,
                data: {
                    quotations: finalArray,
                    salesOrders: finalArray,
                    pagination: rawData.quotations?.pagination || rawData.pagination || {},
                    summary: rawData.quotations?.summary || rawData.summary || {}
                },
                message: response.data.message || 'Quotations fetched successfully'
            };

        } catch (error) {
            if (error.response?.status === 404) {
                return {
                    success: true,
                    data: {
                        quotations: [],
                        salesOrders: []
                    },
                    message: 'No quotations found'
                };
            }

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to fetch quotations',
                data: {
                    quotations: [],
                    salesOrders: []
                }
            };
        }
    }

    /**
     * Get sales orders
     */
    async getOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/sales-orders/orders', { params });
            return {
                success: true,
                data: response.data,
                message: 'Sales orders fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch sales orders'
            };
        }
    }

    /**
     * Get proforma invoices
     */
    async getProformaInvoices(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/sales-orders/proforma', { params });
            return {
                success: true,
                data: response.data,
                message: 'Proforma invoices fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch proforma invoices'
            };
        }
    }

    /**
     * Get orders by status
     */
    async getOrdersByStatus(companyId, status, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get(`/api/sales-orders/by-status/${status}`, { params });
            return {
                success: true,
                data: response.data,
                message: `${status} orders fetched successfully`
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || `Failed to fetch ${status} orders`
            };
        }
    }

    /**
     * Get draft orders
     */
    async getDraftOrders(companyId, filters = {}) {
        return this.getOrdersByStatus(companyId, 'draft', filters);
    }

    /**
     * Get pending orders (draft + sent)
     */
    async getPendingOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/sales-orders/pending', { params });
            return {
                success: true,
                data: response.data,
                message: 'Pending orders fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch pending orders'
            };
        }
    }

    /**
     * Get active orders
     */
    async getActiveOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/sales-orders/active', { params });
            return {
                success: true,
                data: response.data,
                message: 'Active orders fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch active orders'
            };
        }
    }

    /**
     * Get expired orders
     */
    async getExpiredOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/sales-orders/expired', { params });
            return {
                success: true,
                data: response.data,
                message: 'Expired orders fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch expired orders'
            };
        }
    }

    /**
     * Search orders
     */
    async searchOrders(companyId, searchTerm, filters = {}) {
        try {
            const params = {
                companyId,
                q: searchTerm,
                ...filters
            };
            const response = await apiClient.get('/api/sales-orders/search', { params });
            return {
                success: true,
                data: response.data,
                message: 'Search completed successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Search failed'
            };
        }
    }

    // ==================== STATUS MANAGEMENT ====================

    /**
     * Update order status
     */
    async updateOrderStatus(orderId, status, reason = '') {
        try {
            const response = await apiClient.patch(`/api/sales-orders/${orderId}/status`, {
                status,
                reason
            });
            return {
                success: true,
                data: response.data,
                message: `Order status updated to ${status}`
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to update order status'
            };
        }
    }

    /**
     * Accept order
     */
    async acceptOrder(orderId, reason = '') {
        try {
            const response = await apiClient.patch(`/api/sales-orders/${orderId}/accept`, { reason });
            return {
                success: true,
                data: response.data,
                message: 'Order accepted successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to accept order'
            };
        }
    }

    /**
     * Cancel order
     */
    async cancelOrder(orderId) {
        try {
            const response = await apiClient.patch(`/api/sales-orders/${orderId}/cancel`);
            return {
                success: true,
                data: response.data,
                message: 'Order cancelled successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to cancel order'
            };
        }
    }

    // ==================== ORDER CONVERSION ====================

    /**
     * Convert sales order to invoice
     */
    async convertToInvoice(orderId, conversionData = {}) {
        try {
            const response = await apiClient.post(`/api/sales-orders/${orderId}/convert-to-invoice`, {
                ...conversionData,
                convertedAt: new Date().toISOString(),
                convertedBy: conversionData.userId || 'system'
            });

            return {
                success: true,
                data: {
                    order: response.data.data?.order || response.data.order,
                    invoice: response.data.data?.invoice || response.data.invoice,
                    conversion: response.data.data?.conversion || response.data.conversion
                },
                message: response.data.message || 'Sales order converted to invoice successfully'
            };

        } catch (error) {
            let errorMessage = 'Failed to convert sales order to invoice';

            if (error.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Sales order cannot be converted';
            } else if (error.response?.status === 404) {
                errorMessage = 'Sales order not found';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage,
                data: null
            };
        }
    }

    // ==================== EXPORT FUNCTIONS ====================

    /**
     * Export orders to CSV
     */
    async exportToCSV(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/sales-orders/export/csv', {
                params,
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `sales-orders-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return {
                success: true,
                message: 'Export completed successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Export failed'
            };
        }
    }

    // ==================== REPORTING AND ANALYTICS ====================

    /**
     * Get dashboard summary
     */
    async getDashboardSummary(companyId) {
        try {
            const params = { companyId };
            const response = await apiClient.get('/api/sales-orders/reports/dashboard', { params });
            return {
                success: true,
                data: response.data,
                message: 'Dashboard summary fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch dashboard summary'
            };
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Validate order data before submission
     */
    validateOrderData(orderData) {
        const errors = [];

        if (!orderData.companyId) {
            errors.push('Company ID is required');
        }

        if (!orderData.customerName && !orderData.customer) {
            errors.push('Customer name or ID is required');
        }

        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            errors.push('At least one item is required');
        }

        if (orderData.items) {
            orderData.items.forEach((item, index) => {
                if (!item.itemName) {
                    errors.push(`Item ${index + 1}: Name is required`);
                }
                if (!item.quantity || item.quantity <= 0) {
                    errors.push(`Item ${index + 1}: Valid quantity is required`);
                }
                if (!item.pricePerUnit || item.pricePerUnit < 0) {
                    errors.push(`Item ${index + 1}: Valid price is required`);
                }
            });
        }

        if (orderData.orderType && !['quotation', 'sales_order', 'proforma_invoice'].includes(orderData.orderType)) {
            errors.push('Invalid order type');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Format order data for API submission
     */
    formatOrderData(orderData) {
        return {
            ...orderData,
            orderType: orderData.orderType || 'quotation',
            gstEnabled: orderData.gstEnabled ?? true,
            taxMode: orderData.taxMode || 'without-tax',
            priceIncludesTax: orderData.priceIncludesTax ?? false,
            status: orderData.status || 'draft',
            priority: orderData.priority || 'normal',
            items: orderData.items?.map((item, index) => ({
                ...item,
                lineNumber: index + 1,
                taxRate: item.taxRate || 18,
                unit: item.unit || 'PCS',
                discountPercent: item.discountPercent || 0,
                discountAmount: item.discountAmount || 0
            })) || []
        };
    }

    // ==================== ✅ PAYIN SPECIFIC HELPER METHODS ====================

    /**
     * ✅ Calculate pending amount for an order
     */
    calculatePendingAmount(order) {
        const totalAmount = parseFloat(order.totalAmount || order.amount || order.finalTotal || order.grandTotal || 0);
        const paidAmount = parseFloat(order.paidAmount || order.amountPaid || order.receivedAmount || 0);
        return Math.max(0, totalAmount - paidAmount);
    }

    /**
     * ✅ Format order for PayIn dropdown display
     */
    formatOrderForPayment(order) {
        const totalAmount = parseFloat(order.totalAmount || order.amount || order.finalTotal || 0);
        const paidAmount = parseFloat(order.paidAmount || order.amountPaid || 0);
        const pendingAmount = totalAmount - paidAmount;
        const orderNumber = order.orderNumber || order.saleNumber || order.quotationNumber || order._id;
        const orderDate = order.orderDate || order.saleDate || order.quotationDate || order.createdAt;

        return {
            id: order._id || order.id,
            orderNumber,
            orderDate,
            totalAmount,
            paidAmount,
            pendingAmount,
            displayText: `#${orderNumber} - ₹${totalAmount.toLocaleString('en-IN')} (Pending: ₹${pendingAmount.toLocaleString('en-IN')}) - ${new Date(orderDate).toLocaleDateString('en-IN')}`,
            order: order
        };
    }

    /**
     * ✅ Get payment types for PayIn (only 2 options as requested)
     */
    getPaymentTypes() {
        return [
            {
                value: 'advance',
                label: 'Advance Payment',
                description: 'Payment received in advance without specific order',
                icon: 'faMoneyBillWave'
            },
            {
                value: 'pending',
                label: 'Order Payment',
                description: 'Payment against a specific sales order',
                icon: 'faFileInvoice'
            }
        ];
    }
}

// Export as default
export default new SaleOrderService();