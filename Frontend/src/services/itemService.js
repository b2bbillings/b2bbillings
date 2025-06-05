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
        
        // Log request details for debugging
        console.log(`🌐 Item API Request: ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
            console.log('📤 Request Data:', config.data);
        }
        
        return config;
    },
    (error) => {
        console.error('❌ Item Request Interceptor Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
    (response) => {
        // Log successful responses
        console.log(`✅ Item API Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        // Enhanced error logging
        console.error('❌ Item API Error Details:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
        });

        // Handle common errors
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;
            
            switch (status) {
                case 401:
                    // Unauthorized - clear token and redirect to login
                    console.warn('🔒 Unauthorized access - clearing token');
                    localStorage.removeItem('token');
                    // Only redirect if not already on login page
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    break;
                case 403:
                    console.error('🚫 Access forbidden:', data.message);
                    break;
                case 404:
                    console.error('🔍 Resource not found:', data.message);
                    break;
                case 500:
                    console.error('💥 Server error:', data.message);
                    break;
                default:
                    console.error('⚠️ API Error:', data.message || error.message);
            }
            
            // Throw error with server message
            throw new Error(data.message || `HTTP Error: ${status}`);
        } else if (error.request) {
            // Network error
            console.error('🌐 Network Error:', error.message);
            throw new Error('Unable to connect to server. Please check your internet connection.');
        } else {
            // Other error
            console.error('❓ Unknown Error:', error.message);
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
            console.log('📋 Fetching items for company:', companyId, 'with params:', params);

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

            console.log('✅ Items fetched successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error fetching items:', error);
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
            console.log('🆕 Creating item for company:', companyId, 'with data:', itemData);

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

            console.log('✅ Item created successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error creating item:', error);
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
            console.log('📝 Updating item:', itemId, 'for company:', companyId, 'with data:', itemData);

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!itemId) {
                throw new Error('Item ID is required');
            }

            // Clean the data similar to create
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
                asOfDate: itemData.asOfDate,
                isActive: itemData.isActive
            };

            // Remove undefined fields
            Object.keys(cleanedData).forEach(key => {
                if (cleanedData[key] === undefined) {
                    delete cleanedData[key];
                }
            });

            const response = await apiClient.put(`/api/companies/${companyId}/items/${itemId}`, cleanedData);

            console.log('✅ Item updated successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error updating item:', error);
            throw error;
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
            console.log('🗑️ Deleting item:', itemId, 'for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!itemId) {
                throw new Error('Item ID is required');
            }

            const response = await apiClient.delete(`/api/companies/${companyId}/items/${itemId}`);

            console.log('✅ Item deleted successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error deleting item:', error);
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
            console.log('🔍 Searching items for company:', companyId, 'query:', query, 'type:', type);

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

            console.log('✅ Items search completed:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error searching items:', error);
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
            console.log('📂 Fetching categories for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await apiClient.get(`/api/companies/${companyId}/items/categories`);

            console.log('✅ Categories fetched successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error fetching categories:', error);
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
            console.log('🔍 Fetching item by ID:', itemId, 'for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!itemId) {
                throw new Error('Item ID is required');
            }

            const response = await apiClient.get(`/api/companies/${companyId}/items/${itemId}`);

            console.log('✅ Item fetched successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error fetching item by ID:', error);
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
            console.log('📦 Bulk updating stock for company:', companyId, 'updates:', updates);

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!Array.isArray(updates) || updates.length === 0) {
                throw new Error('Updates array is required and cannot be empty');
            }

            const response = await apiClient.patch(`/api/companies/${companyId}/items/bulk/stock`, {
                updates
            });

            console.log('✅ Bulk stock update completed:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error bulk updating stock:', error);
            throw error;
        }
    }

    /**
     * Get items with low stock
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Low stock items
     */
    async getLowStockItems(companyId) {
        try {
            console.log('⚠️ Fetching low stock items for company:', companyId);

            return await this.getItems(companyId, {
                type: 'product',
                isActive: true,
                sortBy: 'currentStock',
                sortOrder: 'asc'
            });

        } catch (error) {
            console.error('❌ Error fetching low stock items:', error);
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
            console.log('📂 Fetching items by category:', category, 'for company:', companyId);

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
            console.error('❌ Error fetching items by category:', error);
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
            console.log('🏥 Performing items service health check...');
            
            const response = await apiClient.get('/api/health');
            
            console.log('✅ Items service health check passed:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Items service health check failed:', error);
            throw error;
        }
    }
}

export default new ItemService();