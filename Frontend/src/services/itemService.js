import axios from 'axios';

// Use window.location to determine API URL if env var not available
const getApiBaseUrl = () => {
    // Try to get from environment variable first
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }

    // Fallback to development URL
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }

    // For production, use same origin with /api path
    return `${window.location.protocol}//${window.location.host}`;
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with default configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;

            switch (status) {
                case 401:
                    // Unauthorized - clear token and redirect to login
                    localStorage.removeItem('token');
                    // Only redirect if not already on login page
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    break;
                case 403:
                case 404:
                case 500:
                default:
                    break;
            }

            // Throw error with server message
            throw new Error(data.message || `HTTP Error: ${status}`);
        } else if (error.request) {
            // Network error
            throw new Error('Unable to connect to server. Please check your internet connection.');
        } else {
            // Other error
            throw new Error(error.message || 'An unexpected error occurred.');
        }
    }
);

class ItemService {
    /**
     * Get all items for a company
     * @param {string} companyId - Company ID
     * @param {Object} params - Query parameters for filtering
     * @returns {Promise<Object>} Items list with pagination
     */
    async getItems(companyId, params = {}) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await apiClient.get(`/api/companies/${companyId}/items`, {
                params: {
                    page: params.page || 1,
                    limit: params.limit || 50,
                    search: params.search || '',
                    type: params.type || '',
                    category: params.category || '',
                    isActive: params.isActive !== undefined ? params.isActive : '',
                    sortBy: params.sortBy || 'name',
                    sortOrder: params.sortOrder || 'asc'
                }
            });

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Create new item
     * @param {string} companyId - Company ID
     * @param {Object} itemData - Item data
     * @returns {Promise<Object>} Created item data
     */
    async createItem(companyId, itemData) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            // Validate required fields
            const requiredFields = ['name', 'category', 'unit'];
            const missingFields = requiredFields.filter(field => !itemData[field]);

            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Clean the data
            const cleanedData = {
                name: itemData.name?.trim(),
                itemCode: itemData.itemCode?.trim() || undefined,
                hsnNumber: itemData.hsnNumber?.trim() || undefined,
                type: itemData.type || 'product',
                category: itemData.category?.trim(),
                unit: itemData.unit,
                description: itemData.description?.trim() || undefined,
                buyPrice: parseFloat(itemData.buyPrice) || 0,
                salePrice: parseFloat(itemData.salePrice) || 0,
                gstRate: parseFloat(itemData.gstRate) || 0,
                openingStock: itemData.type === 'service' ? 0 : (parseFloat(itemData.openingStock) || 0),
                minStockLevel: itemData.type === 'service' ? 0 : (parseFloat(itemData.minStockLevel) || 0),
                asOfDate: itemData.asOfDate || new Date().toISOString().split('T')[0],
                isActive: itemData.isActive !== undefined ? itemData.isActive : true
            };

            // Remove undefined fields
            Object.keys(cleanedData).forEach(key => {
                if (cleanedData[key] === undefined) {
                    delete cleanedData[key];
                }
            });

            const response = await apiClient.post(`/api/companies/${companyId}/items`, cleanedData);

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Update item
     * @param {string} companyId - Company ID
     * @param {string} itemId - Item ID
     * @param {Object} itemData - Updated item data
     * @returns {Promise<Object>} Updated item data
     */
    async updateItem(companyId, itemId, itemData) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!itemId) {
                throw new Error('Item ID is required');
            }

            // Validate required fields
            if (itemData.name && !itemData.name.trim()) {
                throw new Error('Item name cannot be empty');
            }

            // Clean and properly handle price calculations
            const gstRate = parseFloat(itemData.gstRate) || 0;
            const buyPrice = parseFloat(itemData.buyPrice) || 0;
            const salePrice = parseFloat(itemData.salePrice) || 0;

            // Calculate tax-inclusive and tax-exclusive prices
            const buyPriceWithTax = itemData.isBuyPriceTaxInclusive
                ? buyPrice
                : buyPrice * (1 + gstRate / 100);
            const buyPriceWithoutTax = itemData.isBuyPriceTaxInclusive
                ? buyPrice / (1 + gstRate / 100)
                : buyPrice;

            const salePriceWithTax = itemData.isSalePriceTaxInclusive
                ? salePrice
                : salePrice * (1 + gstRate / 100);
            const salePriceWithoutTax = itemData.isSalePriceTaxInclusive
                ? salePrice / (1 + gstRate / 100)
                : salePrice;

            const cleanedData = {
                name: itemData.name?.trim(),
                itemCode: itemData.itemCode?.trim() || undefined,
                hsnNumber: itemData.hsnNumber?.trim() || undefined,
                type: itemData.type || 'product',
                category: itemData.category?.trim(),
                unit: itemData.unit,
                description: itemData.description?.trim() || undefined,

                // Store both base prices and calculated prices
                buyPrice: buyPrice,
                salePrice: salePrice,
                atPrice: parseFloat(itemData.atPrice) || 0,
                gstRate: gstRate,

                // Store calculated tax prices
                buyPriceWithTax: Math.round(buyPriceWithTax * 100) / 100,
                buyPriceWithoutTax: Math.round(buyPriceWithoutTax * 100) / 100,
                salePriceWithTax: Math.round(salePriceWithTax * 100) / 100,
                salePriceWithoutTax: Math.round(salePriceWithoutTax * 100) / 100,

                // Tax inclusion flags
                isBuyPriceTaxInclusive: itemData.isBuyPriceTaxInclusive || false,
                isSalePriceTaxInclusive: itemData.isSalePriceTaxInclusive || false,

                // Handle stock fields
                openingStock: itemData.type === 'service' ? 0 : (
                    parseFloat(itemData.openingStock) ||
                    parseFloat(itemData.currentStock) ||
                    parseFloat(itemData.openingQuantity) || 0
                ),
                currentStock: itemData.type === 'service' ? 0 : (
                    parseFloat(itemData.currentStock) ||
                    parseFloat(itemData.openingStock) ||
                    parseFloat(itemData.openingQuantity) || 0
                ),
                openingQuantity: itemData.type === 'service' ? 0 : (
                    parseFloat(itemData.openingQuantity) ||
                    parseFloat(itemData.currentStock) ||
                    parseFloat(itemData.openingStock) || 0
                ),
                minStockLevel: itemData.type === 'service' ? 0 : (
                    parseFloat(itemData.minStockLevel) ||
                    parseFloat(itemData.minStockToMaintain) || 0
                ),
                minStockToMaintain: itemData.type === 'service' ? 0 : (
                    parseFloat(itemData.minStockToMaintain) ||
                    parseFloat(itemData.minStockLevel) || 0
                ),
                asOfDate: itemData.asOfDate || new Date().toISOString().split('T')[0],
                isActive: itemData.isActive !== undefined ? itemData.isActive : true
            };

            // Remove undefined fields
            Object.keys(cleanedData).forEach(key => {
                if (cleanedData[key] === undefined) {
                    delete cleanedData[key];
                }
            });

            const response = await apiClient.put(`/api/companies/${companyId}/items/${itemId}`, cleanedData);

            // Return the response in the expected format
            return {
                success: true,
                data: response.data,
                message: response.data.message || 'Item updated successfully'
            };

        } catch (error) {
            // Return consistent error format
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to update item',
                error: error
            };
        }
    }

    /**
     * Delete item
     * @param {string} companyId - Company ID
     * @param {string} itemId - Item ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteItem(companyId, itemId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!itemId) {
                throw new Error('Item ID is required');
            }

            const response = await apiClient.delete(`/api/companies/${companyId}/items/${itemId}`);

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Adjust stock for an item
     * @param {string} companyId - Company ID
     * @param {string} itemId - Item ID
     * @param {Object} adjustmentData - Stock adjustment data
     * @param {string} adjustmentData.adjustmentType - Type: 'set', 'add', 'subtract'
     * @param {number} adjustmentData.quantity - Quantity to adjust
     * @param {number} adjustmentData.newStock - New stock level (for 'set' type)
     * @param {string} adjustmentData.reason - Reason for adjustment
     * @param {string} adjustmentData.asOfDate - Date of adjustment
     * @returns {Promise<Object>} Stock adjustment result
     */
    async adjustStock(companyId, itemId, adjustmentData) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!itemId) {
                throw new Error('Item ID is required');
            }

            // Validate adjustment data
            if (!adjustmentData.adjustmentType) {
                throw new Error('Adjustment type is required');
            }

            if (adjustmentData.quantity === undefined && adjustmentData.newStock === undefined) {
                throw new Error('Either quantity or newStock is required');
            }

            const cleanedData = {
                adjustmentType: adjustmentData.adjustmentType,
                quantity: adjustmentData.quantity !== undefined ? Number(adjustmentData.quantity) : undefined,
                newStock: adjustmentData.newStock !== undefined ? Number(adjustmentData.newStock) : undefined,
                reason: adjustmentData.reason?.trim() || 'Manual stock adjustment',
                asOfDate: adjustmentData.asOfDate || new Date().toISOString().split('T')[0],
                currentStock: adjustmentData.currentStock !== undefined ? Number(adjustmentData.currentStock) : undefined
            };

            // Remove undefined fields
            Object.keys(cleanedData).forEach(key => {
                if (cleanedData[key] === undefined) {
                    delete cleanedData[key];
                }
            });

            const response = await apiClient.put(`/api/companies/${companyId}/items/${itemId}/adjust-stock`, cleanedData);

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get stock history for an item
     * @param {string} companyId - Company ID
     * @param {string} itemId - Item ID
     * @param {Object} params - Query parameters
     * @param {number} params.page - Page number
     * @param {number} params.limit - Items per page
     * @returns {Promise<Object>} Stock history data
     */
    async getStockHistory(companyId, itemId, params = {}) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!itemId) {
                throw new Error('Item ID is required');
            }

            const response = await apiClient.get(`/api/companies/${companyId}/items/${itemId}/stock-history`, {
                params: {
                    page: params.page || 1,
                    limit: params.limit || 20
                }
            });

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get items with low stock levels
     * @param {string} companyId - Company ID
     * @param {Object} params - Query parameters
     * @param {number} params.limit - Maximum number of items to return
     * @returns {Promise<Object>} Low stock items data
     */
    async getLowStockItems(companyId, params = {}) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await apiClient.get(`/api/companies/${companyId}/items/low-stock`, {
                params: {
                    limit: params.limit || 50
                }
            });

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get stock summary/analytics
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Stock summary data
     */
    async getStockSummary(companyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await apiClient.get(`/api/companies/${companyId}/stock-summary`);

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Search items
     * @param {string} companyId - Company ID
     * @param {string} query - Search query
     * @param {string} type - Item type filter (optional)
     * @param {number} limit - Result limit (default: 10)
     * @returns {Promise<Object>} Search results
     */
    async searchItems(companyId, query, type = null, limit = 10) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!query || query.length < 2) {
                return {
                    success: true,
                    data: { items: [] }
                };
            }

            const params = {
                q: query.trim(),
                limit: limit
            };

            if (type) {
                params.type = type;
            }

            const response = await apiClient.get(`/api/companies/${companyId}/items/search`, { params });

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get categories for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Categories list
     */
    async getCategories(companyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await apiClient.get(`/api/companies/${companyId}/items/categories`);

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get single item by ID
     * @param {string} companyId - Company ID
     * @param {string} itemId - Item ID
     * @returns {Promise<Object>} Item data
     */
    async getItemById(companyId, itemId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!itemId) {
                throw new Error('Item ID is required');
            }

            const response = await apiClient.get(`/api/companies/${companyId}/items/${itemId}`);

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Bulk update stock
     * @param {string} companyId - Company ID
     * @param {Array} updates - Array of {itemId, newStock}
     * @returns {Promise<Object>} Update results
     */
    async bulkUpdateStock(companyId, updates) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!Array.isArray(updates) || updates.length === 0) {
                throw new Error('Updates array is required and cannot be empty');
            }

            const response = await apiClient.patch(`/api/companies/${companyId}/items/bulk/stock`, {
                updates
            });

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get items by category
     * @param {string} companyId - Company ID
     * @param {string} category - Category name
     * @returns {Promise<Object>} Filtered items
     */
    async getItemsByCategory(companyId, category) {
        try {
            if (!category) {
                throw new Error('Category is required');
            }

            return await this.getItems(companyId, {
                category: category,
                isActive: true,
                sortBy: 'name',
                sortOrder: 'asc'
            });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get API configuration info
     * @returns {Object} API configuration
     */
    getApiConfig() {
        return {
            baseURL: API_BASE_URL,
            timeout: apiClient.defaults.timeout,
            hasToken: !!localStorage.getItem('token')
        };
    }

    /**
     * Health check for items service
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const response = await apiClient.get('/api/health');

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Utility method to calculate stock metrics
     * @param {Array} items - Array of items
     * @returns {Object} Stock metrics
     */
    calculateStockMetrics(items) {
        if (!Array.isArray(items)) {
            return {
                totalItems: 0,
                totalStockValue: 0,
                outOfStockItems: 0,
                lowStockItems: 0,
                avgStockValue: 0
            };
        }

        const metrics = items.reduce((acc, item) => {
            if (item.type === 'product') {
                const currentStock = Number(item.currentStock) || 0;
                const salePrice = Number(item.salePrice) || 0;
                const minStock = Number(item.minStockLevel) || Number(item.minStockToMaintain) || 0;

                acc.totalItems++;
                acc.totalStockValue += currentStock * salePrice;

                if (currentStock === 0) {
                    acc.outOfStockItems++;
                } else if (currentStock <= minStock && minStock > 0) {
                    acc.lowStockItems++;
                }
            }
            return acc;
        }, {
            totalItems: 0,
            totalStockValue: 0,
            outOfStockItems: 0,
            lowStockItems: 0
        });

        metrics.avgStockValue = metrics.totalItems > 0 ? metrics.totalStockValue / metrics.totalItems : 0;

        return metrics;
    }

    /**
     * Format stock adjustment data for UI
     * @param {Object} adjustmentData - Raw adjustment data
     * @returns {Object} Formatted adjustment data
     */
    formatStockAdjustment(adjustmentData) {
        return {
            id: adjustmentData.id || adjustmentData._id,
            date: adjustmentData.date || adjustmentData.adjustedAt,
            type: adjustmentData.adjustmentType,
            previousStock: Number(adjustmentData.previousStock) || 0,
            newStock: Number(adjustmentData.newStock) || 0,
            quantity: Number(adjustmentData.quantity) || 0,
            reason: adjustmentData.reason || 'Manual adjustment',
            adjustedBy: adjustmentData.adjustedBy || 'Unknown',
            formattedDate: adjustmentData.date ? new Date(adjustmentData.date).toLocaleDateString() : 'Unknown',
            formattedTime: adjustmentData.date ? new Date(adjustmentData.date).toLocaleTimeString() : 'Unknown'
        };
    }
}

export default new ItemService();