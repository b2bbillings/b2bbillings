const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    // Helper method for API calls
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        console.log('🔗 API Call:', url, config);

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    }

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
}

export default new SalesService();