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

class PurchaseOrderService {
    // ==================== BASIC CRUD OPERATIONS ====================

    /**
     * Create a new purchase order/quotation/proforma purchase
     */
    async createPurchaseOrder(orderData) {
        try {
            const response = await apiClient.post('/api/purchase-orders', orderData);
            return {
                success: true,
                data: response.data,
                message: response.data.message || 'Purchase order created successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to create purchase order',
                error: error.response?.data?.error
            };
        }
    }

    /**
     * Get all purchase orders with advanced filtering - Enhanced for PayOut compatibility
     */
    async getPurchaseOrders(companyId, filters = {}) {
        try {
            const params = {
                companyId,
                page: filters.page || 1,
                limit: filters.limit || 10,
                ...filters
            };

            // Add supplier filtering for PayOut
            if (filters.supplierId) {
                params.supplierId = filters.supplierId;
            }
            if (filters.supplierName) {
                params.supplierName = filters.supplierName;
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

            console.log('📡 Fetching purchase orders with params:', params);

            const response = await apiClient.get('/api/purchase-orders', { params });

            // Handle different response structures
            const rawData = response.data;
            let purchaseOrders = [];

            if (rawData.data && rawData.data.orders && Array.isArray(rawData.data.orders)) {
                purchaseOrders = rawData.data.orders;
            } else if (rawData.data && Array.isArray(rawData.data)) {
                purchaseOrders = rawData.data;
            } else if (rawData.purchaseOrders && Array.isArray(rawData.purchaseOrders)) {
                purchaseOrders = rawData.purchaseOrders;
            } else if (rawData.orders && Array.isArray(rawData.orders)) {
                purchaseOrders = rawData.orders;
            } else if (Array.isArray(rawData)) {
                purchaseOrders = rawData;
            }

            console.log('✅ Processed purchase orders:', purchaseOrders.length);

            return {
                success: true,
                data: {
                    purchaseOrders: purchaseOrders,
                    orders: purchaseOrders,
                    data: purchaseOrders,
                    pagination: rawData.data?.pagination || rawData.pagination || {},
                    summary: rawData.data?.summary || rawData.summary || {}
                },
                message: 'Purchase orders fetched successfully'
            };
        } catch (error) {
            console.error('❌ Error fetching purchase orders:', error);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch purchase orders',
                data: {
                    purchaseOrders: [],
                    orders: [],
                    data: []
                }
            };
        }
    }

    /**
     * ✅ NEW: Get purchases (alias for getPurchaseOrders for backward compatibility with PayOut)
     */
    async getPurchases(companyId, filters = {}) {
        console.log('🔄 getPurchases called - redirecting to getPurchaseOrders');
        return this.getPurchaseOrders(companyId, filters);
    }

    /**
     * ✅ NEW: Get pending purchase orders for payment (specific for PayOut component)
     */
    async getPendingPurchasesForPayment(companyId, supplierId, supplierName = null) {
        try {
            console.log('💰 Loading pending purchases for payment:', { companyId, supplierId, supplierName });

            const filters = {
                supplierId: supplierId,
                supplierName: supplierName,
                status: 'sent,confirmed,received,pending', // Orders that can make payments
                orderType: 'purchase_order,purchase_quotation', // Orders and quotations
                limit: 100,
                page: 1,
                // Add date range to limit results (last 2 years)
                dateFrom: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0]
            };

            const response = await this.getPurchaseOrders(companyId, filters);

            if (response.success) {
                const allOrders = response.data.purchaseOrders || response.data.orders || response.data.data || [];
                console.log('📋 Total orders fetched:', allOrders.length);

                // Filter orders with pending amounts on client side
                const ordersWithPending = allOrders.filter(order => {
                    if (!order) return false;

                    // Verify supplier match (more flexible matching)
                    const orderSupplierId = order.supplierId || order.supplier?._id || order.supplier?.id;
                    const orderSupplierName = order.supplierName || order.supplier?.name || order.supplier?.businessName;
                    const orderSupplierPhone = order.supplierPhone || order.supplierMobile || order.supplier?.mobile || order.supplier?.phone;

                    const partyId = supplierId;
                    const partyName = supplierName;

                    const isSupplierMatch = orderSupplierId === partyId ||
                        orderSupplierName === partyName ||
                        (orderSupplierPhone && orderSupplierPhone === partyName); // Phone match as fallback

                    if (!isSupplierMatch) {
                        console.log('❌ Supplier mismatch for order:', order.orderNumber, {
                            orderSupplierId,
                            orderSupplierName,
                            orderSupplierPhone,
                            partyId,
                            partyName
                        });
                        return false;
                    }

                    // Check pending amount
                    const totalAmount = parseFloat(order.totals?.finalTotal || order.totalAmount || order.amount || order.finalTotal || order.grandTotal || 0);
                    const paidAmount = parseFloat(order.payment?.paidAmount || order.paidAmount || order.amountPaid || 0);
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
                    const dateA = new Date(a.orderDate || a.purchaseDate || a.quotationDate || a.createdAt);
                    const dateB = new Date(b.orderDate || b.purchaseDate || b.quotationDate || b.createdAt);
                    return dateB - dateA;
                });

                return {
                    success: true,
                    data: {
                        purchaseOrders: ordersWithPending,
                        orders: ordersWithPending,
                        data: ordersWithPending,
                        count: ordersWithPending.length,
                        totalPending: ordersWithPending.reduce((sum, order) => {
                            const total = parseFloat(order.totals?.finalTotal || order.totalAmount || order.amount || order.finalTotal || 0);
                            const paid = parseFloat(order.payment?.paidAmount || order.paidAmount || order.amountPaid || 0);
                            return sum + (total - paid);
                        }, 0)
                    },
                    message: `Found ${ordersWithPending.length} pending purchase orders`
                };
            }

            return response;

        } catch (error) {
            console.error('❌ Error in getPendingPurchasesForPayment:', error);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch pending purchase orders',
                data: {
                    purchaseOrders: [],
                    orders: [],
                    data: [],
                    count: 0,
                    totalPending: 0
                }
            };
        }
    }

    /**
     * ✅ NEW: Get supplier's purchase order summary for payment
     */
    async getSupplierOrderSummary(companyId, supplierId, supplierName = null) {
        try {
            const response = await this.getPendingPurchasesForPayment(companyId, supplierId, supplierName);

            if (response.success) {
                const orders = response.data.purchaseOrders || [];

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
                    message: 'Supplier order summary fetched successfully'
                };
            }

            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to fetch supplier order summary',
                data: null
            };
        }
    }

    /**
     * Get purchase order by ID with full details
     */
    async getPurchaseOrderById(orderId) {
        try {
            const response = await apiClient.get(`/api/purchase-orders/${orderId}`);
            return {
                success: true,
                data: response.data,
                message: 'Purchase order fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch purchase order'
            };
        }
    }

    /**
     * Update purchase order
     */
    async updatePurchaseOrder(orderId, orderData) {
        try {
            const response = await apiClient.put(`/api/purchase-orders/${orderId}`, orderData);
            return {
                success: true,
                data: response.data,
                message: 'Purchase order updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to update purchase order'
            };
        }
    }

    /**
     * Delete/Cancel purchase order
     */
    async deletePurchaseOrder(orderId) {
        try {
            const response = await apiClient.delete(`/api/purchase-orders/${orderId}`);
            return {
                success: true,
                data: response.data,
                message: 'Purchase order cancelled successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to delete purchase order'
            };
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Enhanced client-side fallback generation with better logic
     */
    generateFallbackOrderNumber(companyId, orderType = 'purchase_order', userId = null) {
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
            case 'purchase_quotation':
                prefix = 'PQU';
                break;
            case 'purchase_order':
                prefix = 'PO';
                break;
            case 'proforma_purchase':
                prefix = 'PPO';
                break;
            default:
                prefix = 'PO';
        }

        return `${prefix}-${year}${month}${day}${hours}${minutes}-${companyHash}${userHash}${random}`;
    }

    /**
     * Generate order number with exact route matching
     */
    async generateOrderNumber(companyId, orderType = 'purchase_order', userId = null) {
        // Always provide fallback first for immediate response
        const fallbackNumber = this.generateFallbackOrderNumber(companyId, orderType, userId);

        // Try the exact endpoints that exist in your backend routes
        const endpointsToTry = [
            '/api/purchase-orders/generate-number',
            '/api/purchase-orders/next-order-number',
            '/api/purchase-orders/next-number'
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
    async getNextOrderNumber(companyId, orderType = 'purchase_order', userId = null) {
        return this.generateOrderNumber(companyId, orderType, userId);
    }

    // ==================== FILTERING AND SEARCH ====================

    /**
     * Get purchase quotations
     */
    async getPurchaseQuotations(companyId, filters = {}) {
        try {
            const params = new URLSearchParams({
                companyId,
                orderType: 'purchase_quotation',
                page: filters.page || 1,
                limit: filters.limit || 50
            });

            // Add date filters if provided
            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);

            const response = await apiClient.get(`/api/purchase-orders/quotations?${params.toString()}`);

            // Flatten the nested response structure
            const rawData = response.data.data || response.data;

            // Handle nested quotations structure
            let quotationsArray = [];

            if (rawData.orders && rawData.orders.purchaseOrders) {
                quotationsArray = rawData.orders.purchaseOrders;
            } else if (rawData.orders) {
                quotationsArray = rawData.orders;
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
                    orders: finalArray,
                    purchaseOrders: finalArray,
                    pagination: rawData.pagination || {},
                    summary: rawData.summary || {}
                },
                message: response.data.message || 'Purchase quotations fetched successfully'
            };

        } catch (error) {
            if (error.response?.status === 404) {
                return {
                    success: true,
                    data: {
                        quotations: [],
                        orders: [],
                        purchaseOrders: []
                    },
                    message: 'No purchase quotations found'
                };
            }

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to fetch purchase quotations',
                data: {
                    quotations: [],
                    orders: [],
                    purchaseOrders: []
                }
            };
        }
    }

    /**
     * Get purchase orders
     */
    async getOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/orders', { params });
            return {
                success: true,
                data: response.data,
                message: 'Purchase orders fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch purchase orders'
            };
        }
    }

    /**
     * Get proforma purchases
     */
    async getProformaPurchases(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/proforma', { params });
            return {
                success: true,
                data: response.data,
                message: 'Proforma purchases fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch proforma purchases'
            };
        }
    }

    /**
     * Get orders by status
     */
    async getOrdersByStatus(companyId, status, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get(`/api/purchase-orders/by-status/${status}`, { params });
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
            const response = await apiClient.get('/api/purchase-orders/pending', { params });
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
            const response = await apiClient.get('/api/purchase-orders/active', { params });
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
     * Get confirmed orders
     */
    async getConfirmedOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/confirmed', { params });
            return {
                success: true,
                data: response.data,
                message: 'Confirmed orders fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch confirmed orders'
            };
        }
    }

    /**
     * Get received orders
     */
    async getReceivedOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/received', { params });
            return {
                success: true,
                data: response.data,
                message: 'Received orders fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch received orders'
            };
        }
    }

    /**
     * Get converted orders
     */
    async getConvertedOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/converted', { params });
            return {
                success: true,
                data: response.data,
                message: 'Converted orders fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch converted orders'
            };
        }
    }

    /**
     * Get expired orders
     */
    async getExpiredOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/expired', { params });
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
     * Get orders expiring soon
     */
    async getExpiringSoonOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/expiring-soon', { params });
            return {
                success: true,
                data: response.data,
                message: 'Orders expiring soon fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch orders expiring soon'
            };
        }
    }

    /**
     * Get pending payments
     */
    async getPendingPayments(companyId, supplierId = null, filters = {}) {
        try {
            const params = { companyId, ...filters };
            if (supplierId) params.supplierId = supplierId;

            const response = await apiClient.get('/api/purchase-orders/pending-payment', { params });
            return {
                success: true,
                data: response.data,
                message: 'Pending payments fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch pending payments'
            };
        }
    }

    /**
     * Get orders awaiting approval
     */
    async getOrdersAwaitingApproval(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/awaiting-approval', { params });
            return {
                success: true,
                data: response.data,
                message: 'Orders awaiting approval fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch orders awaiting approval'
            };
        }
    }

    /**
     * Get orders required by date
     */
    async getOrdersRequiredByDate(companyId, date, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get(`/api/purchase-orders/required-by/${date}`, { params });
            return {
                success: true,
                data: response.data,
                message: `Orders required by ${date} fetched successfully`
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || `Failed to fetch orders required by ${date}`
            };
        }
    }

    /**
     * Get overdue delivery orders
     */
    async getOverdueDeliveryOrders(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/overdue-delivery', { params });
            return {
                success: true,
                data: response.data,
                message: 'Overdue delivery orders fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch overdue delivery orders'
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
            const response = await apiClient.get('/api/purchase-orders/search', { params });
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

    // ==================== SUPPLIER-SPECIFIC FUNCTIONS ====================

    /**
     * Get supplier pending documents
     */
    async getSupplierPendingDocuments(companyId, supplierId, filters = {}) {
        try {
            const params = { companyId, supplierId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/supplier/pending-documents', { params });
            return {
                success: true,
                data: response.data,
                message: 'Supplier pending documents fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch supplier pending documents'
            };
        }
    }

    // ==================== PRIORITY-BASED FUNCTIONS ====================

    /**
     * Get orders by priority
     */
    async getOrdersByPriority(companyId, priority, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get(`/api/purchase-orders/by-priority/${priority}`, { params });
            return {
                success: true,
                data: response.data,
                message: `${priority} priority orders fetched successfully`
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || `Failed to fetch ${priority} priority orders`
            };
        }
    }

    /**
     * Get urgent orders
     */
    async getUrgentOrders(companyId, filters = {}) {
        return this.getOrdersByPriority(companyId, 'urgent', filters);
    }

    /**
     * Get high priority orders
     */
    async getHighPriorityOrders(companyId, filters = {}) {
        return this.getOrdersByPriority(companyId, 'high', filters);
    }

    // ==================== STATUS MANAGEMENT ====================

    /**
     * Update order status
     */
    async updateOrderStatus(orderId, status, reason = '') {
        try {
            const response = await apiClient.patch(`/api/purchase-orders/${orderId}/status`, {
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
     * Confirm order
     */
    async confirmOrder(orderId, reason = '') {
        try {
            const response = await apiClient.patch(`/api/purchase-orders/${orderId}/confirm`, { reason });
            return {
                success: true,
                data: response.data,
                message: 'Order confirmed successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to confirm order'
            };
        }
    }

    /**
     * Send order
     */
    async sendOrder(orderId, reason = '') {
        try {
            const response = await apiClient.patch(`/api/purchase-orders/${orderId}/send`, { reason });
            return {
                success: true,
                data: response.data,
                message: 'Order sent successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to send order'
            };
        }
    }

    /**
     * Mark order as received
     */
    async receiveOrder(orderId, reason = '') {
        try {
            const response = await apiClient.patch(`/api/purchase-orders/${orderId}/receive`, { reason });
            return {
                success: true,
                data: response.data,
                message: 'Order marked as received successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to mark order as received'
            };
        }
    }

    /**
     * Mark order as partially received
     */
    async partialReceiveOrder(orderId, reason = '') {
        try {
            const response = await apiClient.patch(`/api/purchase-orders/${orderId}/partial-receive`, { reason });
            return {
                success: true,
                data: response.data,
                message: 'Order marked as partially received successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to mark order as partially received'
            };
        }
    }

    /**
     * Complete order
     */
    async completeOrder(orderId, reason = '') {
        try {
            const response = await apiClient.patch(`/api/purchase-orders/${orderId}/complete`, { reason });
            return {
                success: true,
                data: response.data,
                message: 'Order completed successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to complete order'
            };
        }
    }

    /**
     * Cancel order
     */
    async cancelOrder(orderId) {
        try {
            const response = await apiClient.patch(`/api/purchase-orders/${orderId}/cancel`);
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

    /**
     * Approve order
     */
    async approveOrder(orderId, approvedBy = null, reason = '') {
        try {
            const response = await apiClient.patch(`/api/purchase-orders/${orderId}/approve`, {
                approvedBy,
                reason
            });
            return {
                success: true,
                data: response.data,
                message: 'Order approved successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to approve order'
            };
        }
    }

    // ==================== PAYMENT MANAGEMENT ====================

    /**
     * Add payment to purchase order
     */
    async addPayment(orderId, paymentData) {
        try {
            const response = await apiClient.post(`/api/purchase-orders/${orderId}/payment`, paymentData);
            return {
                success: true,
                data: response.data,
                message: 'Payment added successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to add payment'
            };
        }
    }

    /**
     * Add advance payment
     */
    async addAdvancePayment(orderId, paymentData) {
        try {
            const response = await apiClient.post(`/api/purchase-orders/${orderId}/advance-payment`, {
                ...paymentData,
                isAdvancePayment: true
            });
            return {
                success: true,
                data: response.data,
                message: 'Advance payment added successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to add advance payment'
            };
        }
    }

    // ==================== ORDER CONVERSION ====================

    /**
     * Convert purchase order to purchase invoice
     */
    async convertToPurchaseInvoice(orderId, conversionData = {}) {
        try {
            const response = await apiClient.post(`/api/purchase-orders/${orderId}/convert-to-invoice`, {
                ...conversionData,
                convertedAt: new Date().toISOString(),
                convertedBy: conversionData.userId || 'system'
            });

            return {
                success: true,
                data: {
                    order: response.data.data?.purchaseOrder || response.data.purchaseOrder,
                    invoice: response.data.data?.purchaseInvoice || response.data.purchaseInvoice,
                    conversion: response.data.data?.conversion || response.data.conversion
                },
                message: response.data.message || 'Purchase order converted to invoice successfully'
            };

        } catch (error) {
            let errorMessage = 'Failed to convert purchase order to invoice';

            if (error.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Purchase order cannot be converted';
            } else if (error.response?.status === 404) {
                errorMessage = 'Purchase order not found';
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

    /**
     * Convert purchase order (alternative endpoint)
     */
    async convertOrder(orderId, conversionData = {}) {
        try {
            const response = await apiClient.post(`/api/purchase-orders/${orderId}/convert`, conversionData);
            return {
                success: true,
                data: response.data,
                message: 'Purchase order converted successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to convert purchase order'
            };
        }
    }

    // ==================== BULK OPERATIONS ====================

    /**
     * Bulk update status
     */
    async bulkUpdateStatus(orderIds, status, reason = '') {
        try {
            const response = await apiClient.patch('/api/purchase-orders/bulk/status', {
                orderIds,
                status,
                reason
            });
            return {
                success: true,
                data: response.data,
                message: `${response.data.data?.modifiedCount || 0} orders updated to ${status}`
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to bulk update status'
            };
        }
    }

    /**
     * Bulk convert orders
     */
    async bulkConvertOrders(orderIds) {
        try {
            const response = await apiClient.post('/api/purchase-orders/bulk/convert', { orderIds });
            return {
                success: true,
                data: response.data,
                message: `${response.data.data?.successCount || 0} orders converted successfully`
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to bulk convert orders'
            };
        }
    }

    /**
     * Bulk approve orders
     */
    async bulkApproveOrders(orderIds, approvedBy = null) {
        try {
            const response = await apiClient.patch('/api/purchase-orders/bulk/approve', {
                orderIds,
                approvedBy
            });
            return {
                success: true,
                data: response.data,
                message: `${response.data.data?.modifiedCount || 0} orders approved successfully`
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to bulk approve orders'
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
            const response = await apiClient.get('/api/purchase-orders/export/csv', {
                params,
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `purchase-orders-${Date.now()}.csv`);
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
            const response = await apiClient.get('/api/purchase-orders/reports/dashboard', { params });
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

    /**
     * Get conversion rate analysis
     */
    async getConversionRateAnalysis(companyId) {
        try {
            const params = { companyId };
            const response = await apiClient.get('/api/purchase-orders/reports/conversion-rate', { params });
            return {
                success: true,
                data: response.data,
                message: 'Conversion rate analysis fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch conversion rate analysis'
            };
        }
    }

    /**
     * Get aging report
     */
    async getAgingReport(companyId) {
        try {
            const params = { companyId };
            const response = await apiClient.get('/api/purchase-orders/reports/aging', { params });
            return {
                success: true,
                data: response.data,
                message: 'Aging report fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch aging report'
            };
        }
    }

    /**
     * Get supplier performance analysis
     */
    async getSupplierPerformanceAnalysis(companyId) {
        try {
            const params = { companyId };
            const response = await apiClient.get('/api/purchase-orders/reports/supplier-performance', { params });
            return {
                success: true,
                data: response.data,
                message: 'Supplier performance analysis fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch supplier performance analysis'
            };
        }
    }

    /**
     * Get summary report
     */
    async getSummaryReport(companyId, filters = {}) {
        try {
            const params = { companyId, ...filters };
            const response = await apiClient.get('/api/purchase-orders/reports/summary', { params });
            return {
                success: true,
                data: response.data,
                message: 'Summary report fetched successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch summary report'
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

        if (!orderData.supplierName && !orderData.supplier) {
            errors.push('Supplier name or ID is required');
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

        if (orderData.orderType && !['purchase_order', 'purchase_quotation', 'proforma_purchase'].includes(orderData.orderType)) {
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
            orderType: orderData.orderType || 'purchase_order',
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

    /**
     * Format payment data
     */
    formatPaymentData(paymentData) {
        return {
            amount: parseFloat(paymentData.amount || 0),
            method: paymentData.method || 'bank_transfer',
            reference: paymentData.reference || '',
            paymentDate: paymentData.paymentDate || new Date().toISOString(),
            notes: paymentData.notes || '',
            isAdvancePayment: paymentData.isAdvancePayment || false,
            paymentDetails: paymentData.paymentDetails || {}
        };
    }

    // ==================== ✅ PAYOUT SPECIFIC HELPER METHODS ====================

    /**
     * ✅ Calculate pending amount for an order
     */
    calculatePendingAmount(order) {
        const totalAmount = parseFloat(order.totals?.finalTotal || order.totalAmount || order.amount || order.finalTotal || order.grandTotal || 0);
        const paidAmount = parseFloat(order.payment?.paidAmount || order.paidAmount || order.amountPaid || 0);
        return Math.max(0, totalAmount - paidAmount);
    }

    /**
     * ✅ Format order for PayOut dropdown display
     */
    formatOrderForPayment(order) {
        const totalAmount = parseFloat(order.totals?.finalTotal || order.totalAmount || order.amount || order.finalTotal || 0);
        const paidAmount = parseFloat(order.payment?.paidAmount || order.paidAmount || order.amountPaid || 0);
        const pendingAmount = totalAmount - paidAmount;
        const orderNumber = order.orderNumber || order.purchaseNumber || order.quotationNumber || order._id;
        const orderDate = order.orderDate || order.purchaseDate || order.quotationDate || order.createdAt;

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
     * ✅ Get payment types for PayOut (only 2 options as requested)
     */
    getPaymentTypes() {
        return [
            {
                value: 'advance',
                label: 'Advance Payment',
                description: 'Payment made in advance without specific order',
                icon: 'faMoneyBillWave'
            },
            {
                value: 'pending',
                label: 'Order Payment',
                description: 'Payment against a specific purchase order',
                icon: 'faFileInvoice'
            }
        ];
    }
}

// Export as default
export default new PurchaseOrderService();