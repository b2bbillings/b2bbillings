const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class PurchaseService {
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
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    // ✅ Enhanced helper method for API calls with detailed logging
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        console.log('🔗 Purchase API Call:', url);

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
                console.error('❌ API Response Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                });

                let errorMessage = data.message || `HTTP error! status: ${response.status}`;

                if (response.status === 400) {
                    errorMessage = data.message || 'Invalid data sent to server';
                } else if (response.status === 401) {
                    errorMessage = 'Authentication required. Please login again.';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. You do not have permission for this operation.';
                } else if (response.status === 404) {
                    errorMessage = 'Resource not found. Please check the data and try again.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }

                throw new Error(errorMessage);
            }

            console.log('✅ API Response Success:', data);
            return data;

        } catch (error) {
            console.error('❌ Purchase API Error:', error);
            throw error;
        }
    }

    // ==================== MAIN CRUD OPERATIONS ====================

    // ✅ Create new purchase
    async createPurchase(purchaseData) {
        console.log('🛒 Creating purchase:', purchaseData);

        if (!purchaseData.companyId) {
            throw new Error('Company ID is required to create purchase');
        }

        const backendData = this.transformToBackendFormat(purchaseData);
        return await this.apiCall(`/companies/${purchaseData.companyId}/purchases`, {
            method: 'POST',
            body: JSON.stringify(backendData)
        });
    }

    // ✅ Get all purchases with filters
    async getPurchases(companyId, filters = {}) {
        if (!companyId) {
            throw new Error('Company ID is required');
        }

        try {
            const queryParams = new URLSearchParams(filters);
            const response = await this.apiCall(`/companies/${companyId}/purchases?${queryParams}`);

            if (response.success && response.data) {
                return {
                    success: true,
                    data: {
                        purchases: response.data.purchases || [],
                        summary: response.data.summary || {},
                        pagination: response.data.pagination || {}
                    }
                };
            }

            return { success: true, data: { purchases: [], summary: {}, pagination: {} } };

        } catch (error) {
            console.error('❌ Error getting purchases:', error);
            throw error;
        }
    }

    // ✅ REMOVED: Get purchase summary for date range (endpoint doesn't exist)
    // The summary will be calculated from purchases data directly in the frontend

    // ✅ Get single purchase by ID
    async getPurchaseById(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}`);
        } catch (error) {
            console.error('❌ Error getting purchase by ID:', error);
            throw error;
        }
    }

    // ✅ Update purchase
    async updatePurchase(companyId, purchaseId, purchaseData) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            const backendData = this.transformToBackendFormat(purchaseData);
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}`, {
                method: 'PUT',
                body: JSON.stringify(backendData)
            });
        } catch (error) {
            console.error('❌ Error updating purchase:', error);
            throw error;
        }
    }

    // ✅ Delete purchase
    async deletePurchase(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('❌ Error deleting purchase:', error);
            throw error;
        }
    }

    // ==================== STATUS MANAGEMENT ====================

    // ✅ Mark purchase as ordered
    async markAsOrdered(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}/mark-ordered`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'ordered' })
            });
        } catch (error) {
            console.error('❌ Error marking purchase as ordered:', error);
            throw error;
        }
    }

    // ✅ Mark purchase as received
    async markAsReceived(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}/mark-received`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'received' })
            });
        } catch (error) {
            console.error('❌ Error marking purchase as received:', error);
            throw error;
        }
    }

    // ✅ Complete purchase
    async completePurchase(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}/complete`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'completed' })
            });
        } catch (error) {
            console.error('❌ Error completing purchase:', error);
            throw error;
        }
    }

    // ==================== LOCAL SUMMARY CALCULATION ====================

    // ✅ NEW: Calculate summary from purchases data locally
    calculateSummaryFromData(purchases = []) {
        console.log('📊 Calculating summary from purchases data locally:', purchases.length);

        if (!Array.isArray(purchases) || purchases.length === 0) {
            return {
                success: true,
                data: {
                    totalAmount: 0,
                    paidAmount: 0,
                    pendingAmount: 0,
                    totalBills: 0,
                    totalSuppliers: 0,
                    pendingDeliveries: 0,
                    overdueAmount: 0,
                    todaysPurchases: 0,
                    growthPercentage: 0,
                    statusCounts: {
                        draft: 0,
                        ordered: 0,
                        received: 0,
                        completed: 0,
                        paid: 0,
                        overdue: 0
                    }
                }
            };
        }

        try {
            const totalAmount = purchases.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const totalBalance = purchases.reduce((sum, p) => sum + (parseFloat(p.balance) || 0), 0);
            const paidAmount = totalAmount - totalBalance;

            // Count by status
            const statusCounts = purchases.reduce((counts, p) => {
                const status = (p.purchaseStatus || 'draft').toLowerCase();
                counts[status] = (counts[status] || 0) + 1;
                return counts;
            }, {
                draft: 0,
                ordered: 0,
                received: 0,
                completed: 0,
                paid: 0,
                overdue: 0
            });

            // Today's purchases
            const todaysDate = new Date().toISOString().split('T')[0];
            const todaysPurchasesAmount = purchases
                .filter(p => {
                    try {
                        const purchaseDate = new Date(p.date).toISOString().split('T')[0];
                        return purchaseDate === todaysDate;
                    } catch {
                        return false;
                    }
                })
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

            // Unique suppliers
            const uniqueSuppliers = new Set(
                purchases
                    .map(p => p.supplierName)
                    .filter(name => name && name.trim() !== '')
            ).size;

            // Pending deliveries
            const pendingDeliveries = purchases.filter(p =>
                p.receivingStatus === 'pending' || p.receivingStatus === 'partial'
            ).length;

            return {
                success: true,
                data: {
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    pendingAmount: totalBalance,
                    totalBills: purchases.length,
                    totalSuppliers: uniqueSuppliers,
                    pendingDeliveries: pendingDeliveries,
                    overdueAmount: totalBalance, // Simplified
                    todaysPurchases: todaysPurchasesAmount,
                    growthPercentage: 0, // Cannot calculate without historical data
                    statusCounts: statusCounts
                }
            };

        } catch (error) {
            console.error('❌ Error calculating summary from data:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // ==================== DATA TRANSFORMATION ====================

    // ✅ Transform frontend data to backend format
    transformToBackendFormat(purchaseData) {
        console.log('🔄 Transforming purchase data for backend:', purchaseData);

        this.validatePurchaseData(purchaseData);
        const userInfo = this.getUserInfo(purchaseData);
        const supplierData = this.processSupplierData(purchaseData);
        const processedItems = this.processItemsData(purchaseData);

        if (processedItems.length === 0) {
            throw new Error('At least one valid item is required for purchase');
        }

        const totals = this.calculateTotalsFromItems(processedItems, purchaseData);

        const backendPayload = {
            // Purchase basic info
            purchaseNumber: purchaseData.purchaseNumber,
            purchaseDate: purchaseData.purchaseDate || new Date().toISOString(),
            purchaseType: purchaseData.gstEnabled ? 'gst' : 'non-gst',
            gstEnabled: purchaseData.gstEnabled || false,
            companyId: purchaseData.companyId,

            // Supplier information
            supplierName: supplierData.supplierName,
            supplierMobile: supplierData.supplierMobile,
            ...(supplierData.supplierId && { supplierId: supplierData.supplierId }),
            ...(supplierData.supplierEmail && { supplierEmail: supplierData.supplierEmail }),
            ...(supplierData.supplierAddress && { supplierAddress: supplierData.supplierAddress }),
            ...(supplierData.supplierGSTNumber && { supplierGSTNumber: supplierData.supplierGSTNumber }),

            // User information
            userId: userInfo.userId,
            createdBy: userInfo.createdBy,

            // Items and totals
            items: processedItems,
            subtotal: parseFloat(totals.subtotal.toFixed(2)),
            totalDiscount: parseFloat(totals.totalDiscount.toFixed(2)),
            totalTax: parseFloat(totals.totalTax.toFixed(2)),
            totalCGST: parseFloat(totals.totalCGST.toFixed(2)),
            totalSGST: parseFloat(totals.totalSGST.toFixed(2)),
            totalIGST: parseFloat(totals.totalIGST.toFixed(2)),
            finalTotal: parseFloat(totals.finalTotal.toFixed(2)),

            // Payment information
            paymentMethod: purchaseData.paymentMethod || 'credit',
            paidAmount: parseFloat(purchaseData.paymentReceived || 0) || 0,
            pendingAmount: Math.max(0, totals.finalTotal - (parseFloat(purchaseData.paymentReceived || 0) || 0)),

            // Additional information
            notes: purchaseData.notes || '',
            status: purchaseData.status || 'draft',
            roundOff: parseFloat(purchaseData.roundOff) || 0,
            roundOffEnabled: purchaseData.roundOffEnabled || false,

            // Metadata
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        this.validateBackendPayload(backendPayload);
        return backendPayload;
    }

    // ✅ Transform backend data to frontend format
    transformToFrontendFormat(backendPurchase) {
        try {
            console.log('🔄 Transforming backend purchase:', backendPurchase);

            // Extract totals
            const totals = backendPurchase.totals || {};
            const payment = backendPurchase.payment || {};

            const transformed = {
                id: backendPurchase._id || backendPurchase.id,
                purchaseNo: backendPurchase.purchaseNumber || backendPurchase.purchaseNo || 'N/A',
                purchaseNumber: backendPurchase.purchaseNumber || backendPurchase.purchaseNo,
                date: backendPurchase.purchaseDate || backendPurchase.createdAt || backendPurchase.date,
                purchaseDate: backendPurchase.purchaseDate || backendPurchase.createdAt,
                supplierName: backendPurchase.supplier?.name || backendPurchase.supplierName || 'Unknown Supplier',

                // ✅ FIXED: Extract correct amounts from nested objects
                amount: totals.finalTotal || backendPurchase.finalTotal || 0,
                finalTotal: totals.finalTotal || backendPurchase.finalTotal || 0,
                balance: payment.pendingAmount || backendPurchase.balanceAmount || 0,
                pendingAmount: payment.pendingAmount || backendPurchase.balanceAmount || 0,
                paidAmount: payment.paidAmount || 0,

                purchaseStatus: backendPurchase.status || 'draft',
                status: backendPurchase.status || 'draft',
                receivingStatus: backendPurchase.receivingStatus || 'pending',
                paymentStatus: payment.status || (
                    (payment.pendingAmount || 0) <= 0 ? 'paid' : 'unpaid'
                ),

                // Include nested objects for fallback access
                items: backendPurchase.items || [],
                notes: backendPurchase.notes || '',
                supplier: backendPurchase.supplier || {},
                totals: totals,
                payment: payment,
                gstEnabled: backendPurchase.gstEnabled || false,
                paymentMethod: payment.method || 'credit',
                supplierMobile: backendPurchase.supplierMobile || backendPurchase.supplier?.mobile || '',

                // ✅ FIXED: Add fullObject with all backend data for complex extraction
                fullObject: backendPurchase,

                createdAt: backendPurchase.createdAt,
                updatedAt: backendPurchase.updatedAt || backendPurchase.lastModified
            };

            console.log('✅ Transformed purchase:', transformed);
            return transformed;

        } catch (error) {
            console.error('❌ Error transforming purchase data:', error, backendPurchase);

            // Return error-safe object
            return {
                id: backendPurchase._id || backendPurchase.id || 'unknown',
                purchaseNo: backendPurchase.purchaseNumber || 'Error loading',
                purchaseNumber: backendPurchase.purchaseNumber || 'Error loading',
                date: new Date().toISOString(),
                purchaseDate: new Date().toISOString(),
                supplierName: 'Error loading',
                amount: 0,
                finalTotal: 0,
                balance: 0,
                pendingAmount: 0,
                paidAmount: 0,
                purchaseStatus: 'error',
                status: 'error',
                receivingStatus: 'error',
                paymentStatus: 'error',
                items: [],
                totals: {},
                payment: {},
                fullObject: backendPurchase // Still include full object for debugging
            };
        }
    }

    // ==================== VALIDATION METHODS ====================

    validatePurchaseData(purchaseData) {
        const errors = [];

        if (!purchaseData.companyId) {
            errors.push('Company ID is required');
        }

        const hasSupplier = purchaseData.supplier && (purchaseData.supplier.name || purchaseData.supplier._id);
        const hasSupplierName = purchaseData.supplierName;
        const hasMobileNumber = purchaseData.mobileNumber;

        if (!hasSupplier && !hasSupplierName && !hasMobileNumber) {
            errors.push('Supplier information is required');
        }

        const validItems = (purchaseData.items || []).filter(item =>
            item.itemName &&
            item.itemName.trim() !== '' &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) >= 0
        );

        if (validItems.length === 0) {
            errors.push('At least one valid item is required');
        }

        if (!purchaseData.purchaseNumber) {
            errors.push('Purchase number is required');
        }

        if (errors.length > 0) {
            throw new Error(`Purchase validation failed: ${errors.join(', ')}`);
        }
    }

    validateBackendPayload(payload) {
        const errors = [];

        if (!payload.supplierName || payload.supplierName.trim() === '') {
            errors.push('Supplier name is missing or empty');
        }

        if (!payload.companyId) {
            errors.push('Company ID is missing');
        }

        if (!payload.userId) {
            errors.push('User ID is missing');
        }

        if (!payload.items || payload.items.length === 0) {
            errors.push('Items array is missing or empty');
        }

        if (errors.length > 0) {
            throw new Error(`Backend payload validation failed: ${errors.join(', ')}`);
        }
    }

    // ==================== DATA PROCESSING METHODS ====================

    getUserInfo(purchaseData) {
        if (purchaseData.userId && purchaseData.createdBy) {
            return {
                userId: purchaseData.userId,
                createdBy: purchaseData.createdBy
            };
        }

        try {
            const possibleKeys = ['user', 'currentUser', 'authUser', 'loggedInUser'];

            for (const key of possibleKeys) {
                const userStr = localStorage.getItem(key);
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        if (user && (user._id || user.id)) {
                            return {
                                userId: user._id || user.id,
                                createdBy: user._id || user.id
                            };
                        }
                    } catch (parseError) {
                        console.warn(`⚠️ Could not parse user from key '${key}':`, parseError);
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Error accessing localStorage:', error);
        }

        // Fallback
        return {
            userId: '684325fb769fc9190846750c',
            createdBy: '684325fb769fc9190846750c'
        };
    }

    processSupplierData(purchaseData) {
        let supplierData = {
            supplierName: '',
            supplierMobile: '',
            supplierId: null
        };

        if (purchaseData.supplier && purchaseData.supplier._id) {
            supplierData = {
                supplierId: purchaseData.supplier._id,
                supplierName: purchaseData.supplier.name || purchaseData.supplier.businessName || '',
                supplierMobile: purchaseData.supplier.mobile || purchaseData.supplier.phoneNumber || '',
                supplierEmail: purchaseData.supplier.email || '',
                supplierAddress: purchaseData.supplier.address || purchaseData.supplier.billingAddress || '',
                supplierGSTNumber: purchaseData.supplier.gstNumber || purchaseData.supplier.gstIN || ''
            };
        } else if (purchaseData.supplier) {
            supplierData = {
                supplierName: purchaseData.supplier.name || purchaseData.supplier.businessName || '',
                supplierMobile: purchaseData.supplier.mobile || purchaseData.supplier.phoneNumber || purchaseData.mobileNumber || '',
                supplierEmail: purchaseData.supplier.email || '',
                supplierAddress: purchaseData.supplier.address || '',
                supplierGSTNumber: purchaseData.supplier.gstNumber || ''
            };
        } else if (purchaseData.supplierName) {
            supplierData = {
                supplierName: purchaseData.supplierName,
                supplierMobile: purchaseData.mobileNumber || '',
                supplierEmail: '',
                supplierAddress: '',
                supplierGSTNumber: ''
            };
        } else if (purchaseData.mobileNumber) {
            supplierData = {
                supplierName: `Walk-in Supplier (${purchaseData.mobileNumber})`,
                supplierMobile: purchaseData.mobileNumber,
                supplierEmail: '',
                supplierAddress: '',
                supplierGSTNumber: ''
            };
        }

        if (!supplierData.supplierName || supplierData.supplierName.trim() === '') {
            supplierData.supplierName = 'Cash Purchase';
        }

        if (supplierData.supplierMobile === undefined || supplierData.supplierMobile === null) {
            supplierData.supplierMobile = '';
        }

        Object.keys(supplierData).forEach(key => {
            if (supplierData[key] === undefined || supplierData[key] === null) {
                if (key === 'supplierId') {
                    supplierData[key] = null;
                } else {
                    supplierData[key] = '';
                }
            }
        });

        return supplierData;
    }

    processItemsData(purchaseData) {
        const validItems = (purchaseData.items || [])
            .filter(item => {
                const isValid = item.itemName &&
                    item.itemName.trim() !== '' &&
                    parseFloat(item.quantity) > 0 &&
                    parseFloat(item.pricePerUnit) >= 0;

                if (!isValid) {
                    console.warn('⚠️ Skipping invalid item:', {
                        name: item.itemName || 'No name',
                        quantity: item.quantity,
                        price: item.pricePerUnit
                    });
                }

                return isValid;
            })
            .map((item, index) => {
                const quantity = parseFloat(item.quantity) || 1;
                const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
                const taxRate = parseFloat(item.taxRate || item.gstRate) || 0;
                const discountAmount = parseFloat(item.discountAmount) || 0;

                let baseAmount = quantity * pricePerUnit;
                let taxableAmount = baseAmount - discountAmount;
                let taxAmount = 0;
                let finalAmount = taxableAmount;

                if (purchaseData.gstEnabled && taxRate > 0) {
                    if (item.taxMode === 'with-tax') {
                        taxableAmount = baseAmount / (1 + taxRate / 100);
                        taxAmount = baseAmount - taxableAmount;
                        finalAmount = baseAmount - discountAmount;
                    } else {
                        taxAmount = (taxableAmount * taxRate) / 100;
                        finalAmount = taxableAmount + taxAmount;
                    }
                }

                const cgst = purchaseData.gstEnabled ? taxAmount / 2 : 0;
                const sgst = purchaseData.gstEnabled ? taxAmount / 2 : 0;

                return {
                    itemRef: item.itemRef || item._id || item.id || null,
                    itemName: item.itemName,
                    itemCode: item.itemCode || item.sku || '',
                    hsnCode: item.hsnCode || item.hsnNumber || '0000',
                    category: item.category || '',
                    description: item.description || '',
                    quantity: quantity,
                    unit: item.unit || 'PCS',
                    pricePerUnit: pricePerUnit,
                    taxRate: taxRate,
                    taxMode: item.taxMode || 'with-tax',
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    igst: 0,
                    discountAmount: discountAmount,
                    baseAmount: parseFloat(baseAmount.toFixed(2)),
                    taxAmount: parseFloat(taxAmount.toFixed(2)),
                    itemAmount: parseFloat(finalAmount.toFixed(2)),
                    lineNumber: index + 1
                };
            });

        return validItems;
    }

    calculateTotalsFromItems(processedItems, purchaseData) {
        const totals = processedItems.reduce((acc, item) => {
            acc.subtotal += item.baseAmount;
            acc.totalDiscount += item.discountAmount;
            acc.totalTax += item.taxAmount;
            acc.totalCGST += item.cgst;
            acc.totalSGST += item.sgst;
            acc.totalIGST += item.igst;
            return acc;
        }, {
            subtotal: 0,
            totalDiscount: 0,
            totalTax: 0,
            totalCGST: 0,
            totalSGST: 0,
            totalIGST: 0
        });

        const finalTotal = totals.subtotal - totals.totalDiscount + totals.totalTax +
            (parseFloat(purchaseData.roundOff) || 0);

        return {
            ...totals,
            finalTotal: finalTotal
        };
    }

    // ==================== STATUS AND OPTIONS ====================

    getPurchaseStatusOptions() {
        return [
            { value: '', label: 'All Status' },
            { value: 'draft', label: 'Draft' },
            { value: 'ordered', label: 'Ordered' },
            { value: 'received', label: 'Received' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
        ];
    }

    getReceivingStatusOptions() {
        return [
            { value: '', label: 'All Receiving Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'partial', label: 'Partially Received' },
            { value: 'received', label: 'Fully Received' },
            { value: 'overdue', label: 'Overdue' }
        ];
    }

    getPaymentStatusOptions() {
        return [
            { value: '', label: 'All Payment Status' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partial', label: 'Partially Paid' },
            { value: 'paid', label: 'Fully Paid' },
            { value: 'overdue', label: 'Overdue' }
        ];
    }

    // ==================== UTILITY METHODS ====================

    formatDateForAPI(date) {
        if (!date) return null;

        try {
            if (typeof date === 'string') {
                return date.split('T')[0];
            }

            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }

            return null;
        } catch (error) {
            console.warn('Error formatting date for API:', error);
            return null;
        }
    }

    formatCurrency(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return '₹0';
        }

        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        if (isNaN(numAmount)) {
            return '₹0';
        }

        if (numAmount >= 10000000) {
            return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
        } else if (numAmount >= 100000) {
            return `₹${(numAmount / 100000).toFixed(1)}L`;
        } else if (numAmount >= 1000) {
            return `₹${(numAmount / 1000).toFixed(1)}K`;
        }

        return `₹${numAmount.toLocaleString('en-IN')}`;
    }

    // ==================== EXPORT OPERATIONS ====================

    async exportCSV(companyId, filters = {}) {
        if (!companyId) {
            throw new Error('Company ID is required for export');
        }

        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    params.append(key, filters[key]);
                }
            });

            const queryString = params.toString();
            const endpoint = `/companies/${companyId}/purchases/export${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            console.log('✅ Purchase CSV export successful');
            return blob;

        } catch (error) {
            console.error('❌ Error exporting purchases:', error);
            throw error;
        }
    }
}

// Export single instance
export default new PurchaseService();