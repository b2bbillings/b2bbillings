import axios from 'axios';

// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// Create API client instance
const createApiClient = () => {
    const apiClient = axios.create({
        baseURL: API_BASE_URL,
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Add auth token to requests (optional for testing)
    apiClient.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
            return config;
        },
        (error) => {
            console.error('❌ Request error:', error);
            return Promise.reject(error);
        }
    );

    // Response interceptor for better error handling
    apiClient.interceptors.response.use(
        (response) => {
            console.log('📥 API Response:', response.status, response.config.url);
            return response;
        },
        (error) => {
            console.error('❌ API Error:', {
                status: error.response?.status,
                message: error.response?.data?.message,
                url: error.config?.url
            });
            return Promise.reject(error);
        }
    );

    return apiClient;
};

class PaymentService {
    constructor() {
        this.apiClient = createApiClient();
    }

    /**
     * Create Payment In (Customer pays us)
     * @param {Object} paymentData - Payment information
     * @param {string} paymentData.partyId - Party ID
     * @param {number} paymentData.amount - Payment amount
     * @param {string} paymentData.paymentMethod - Payment method (cash, bank_transfer, etc.)
     * @param {string} paymentData.paymentDate - Payment date
     * @param {Object} paymentData.paymentDetails - Method-specific details
     * @param {string} paymentData.reference - Reference number
     * @param {string} paymentData.notes - Notes
     * @returns {Promise} API response
     */
    async createPaymentIn(paymentData) {
        try {
            console.log('💰 Creating Payment In:', paymentData);

            // Validate required fields
            if (!paymentData.partyId) {
                throw new Error('Party ID is required');
            }
            if (!paymentData.amount || paymentData.amount <= 0) {
                throw new Error('Valid amount is required');
            }

            const response = await this.apiClient.post('/api/payments/pay-in', paymentData);

            console.log('✅ Payment In created successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error creating Payment In:', error);
            
            // Enhanced error handling
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            } else if (error.message) {
                throw new Error(error.message);
            } else {
                throw new Error('Failed to create payment');
            }
        }
    }

    /**
     * Create Payment Out (We pay supplier)
     * @param {Object} paymentData - Payment information
     * @param {string} paymentData.partyId - Party ID
     * @param {number} paymentData.amount - Payment amount
     * @param {string} paymentData.paymentMethod - Payment method (cash, bank_transfer, etc.)
     * @param {string} paymentData.paymentDate - Payment date
     * @param {Object} paymentData.paymentDetails - Method-specific details
     * @param {string} paymentData.reference - Reference number
     * @param {string} paymentData.notes - Notes
     * @returns {Promise} API response
     */
    async createPaymentOut(paymentData) {
        try {
            console.log('💸 Creating Payment Out:', paymentData);

            // Validate required fields
            if (!paymentData.partyId) {
                throw new Error('Party ID is required');
            }
            if (!paymentData.amount || paymentData.amount <= 0) {
                throw new Error('Valid amount is required');
            }

            const response = await this.apiClient.post('/api/payments/pay-out', paymentData);

            console.log('✅ Payment Out created successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error creating Payment Out:', error);
            
            // Enhanced error handling
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            } else if (error.message) {
                throw new Error(error.message);
            } else {
                throw new Error('Failed to create payment');
            }
        }
    }

/**
 * Get payments with filtering options
 * @param {Object} filters - Filter options
 * @returns {Promise} API response
 */
async getPayments(filters = {}) {
    try {
        console.log('📋 Getting payments with filters:', filters);

        const queryParams = new URLSearchParams();
        
        if (filters.partyId) queryParams.append('partyId', filters.partyId);
        if (filters.type) queryParams.append('type', filters.type);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.page) queryParams.append('page', filters.page);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
        if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

        const response = await this.apiClient.get(`/api/payments?${queryParams.toString()}`);

        console.log('✅ Payments retrieved successfully:', response.data);
        return response.data;

    } catch (error) {
        console.error('❌ Error getting payments:', error);
        
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        } else if (error.message) {
            throw new Error(error.message);
        } else {
            throw new Error('Failed to get payments');
        }
    }
}
    /**
     * Test API connection
     * @returns {Promise} API response
     */
    async testConnection() {
        try {
            console.log('🔧 Testing API connection...');
            const response = await this.apiClient.get('/api/payments/test');
            console.log('✅ API connection test successful:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ API connection test failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
const paymentService = new PaymentService();
export default paymentService;