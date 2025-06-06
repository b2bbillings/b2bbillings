import axios from 'axios';
import apiConfig from '../config/api';

const API_BASE_URL = apiConfig.baseURL;

// Create axios instance with default configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor to add auth token and company context
apiClient.interceptors.request.use(
    (config) => {
        // Add authentication token
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔐 Adding auth header to party request');
        } else {
            console.warn('⚠️ No auth token found for party request');
        }
        
        // Add current company context - IMPROVED
        const currentCompany = localStorage.getItem('currentCompany');
        if (currentCompany) {
            try {
                const company = JSON.parse(currentCompany);
                const companyId = company.id || company._id || company.companyId;
                
                if (companyId) {
                    config.headers['X-Company-ID'] = companyId;
                    console.log('🏢 Adding company context to party request:', {
                        companyName: company.name || 'Unknown',
                        companyId: companyId
                    });
                } else {
                    console.warn('⚠️ Company object exists but no ID found:', company);
                }
            } catch (e) {
                console.warn('⚠️ Failed to parse current company for party request:', e);
            }
        } else {
            console.warn('⚠️ No company context found in localStorage');
        }

        // Debug current localStorage state
        console.log('🔍 localStorage Debug:', {
            hasToken: !!localStorage.getItem('token'),
            hasUser: !!localStorage.getItem('user'),
            hasCurrentCompany: !!localStorage.getItem('currentCompany'),
            currentCompanyRaw: localStorage.getItem('currentCompany')
        });

        // Additional debug info
        console.log('🔍 Request Headers Debug:', {
            url: config.url,
            method: config.method?.toUpperCase(),
            hasAuth: !!config.headers.Authorization,
            hasCompany: !!config.headers['X-Company-ID'],
            companyId: config.headers['X-Company-ID']
        });
        
        // Log request details for debugging
        console.log(`🌐 Party API Request: ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data && Object.keys(config.data).length > 0) {
            console.log('📤 Request Data keys:', Object.keys(config.data));
        }
        if (config.params && Object.keys(config.params).length > 0) {
            console.log('📤 Request Params:', config.params);
        }
        
        return config;
    },
    (error) => {
        console.error('❌ Party Request Interceptor Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
    (response) => {
        // Log successful responses
        console.log(`✅ Party API Response: ${response.status} ${response.config.url}`);
        
        // Log response data structure for debugging
        if (response.data) {
            console.log('📥 Response structure:', {
                success: response.data.success,
                message: response.data.message,
                dataType: typeof response.data.data,
                hasData: !!response.data.data
            });
        }
        
        return response;
    },
    (error) => {
        // Enhanced error logging
        console.error('❌ Party API Error Details:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message,
            code: error.response?.data?.code,
            serverMessage: error.response?.data?.message,
            debug: error.response?.data?.debug,
            requestHeaders: {
                hasAuth: !!error.config?.headers?.Authorization,
                hasCompany: !!error.config?.headers['X-Company-ID'],
                companyId: error.config?.headers['X-Company-ID']
            }
        });

        // Handle common errors
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;

            switch (status) {
                case 401:
                    console.log('🔐 Authentication failed - clearing session data');
                    // Clear all authentication data
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('currentCompany');
                    
                    // Only redirect if not already on login page
                    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth')) {
                        console.log('🔄 Redirecting to login due to 401 error');
                        window.location.href = '/login';
                    }
                    break;
                case 400:
                    if (data.code === 'COMPANY_REQUIRED') {
                        console.error('🏢 Company selection required for party operation');
                        console.error('🔍 Debug Info:', data.debug);
                    }
                    break;
                case 403:
                    console.error('🚫 Access forbidden for party operation:', data.message);
                    break;
                case 404:
                    console.error('📭 Party resource not found:', data.message);
                    break;
                case 500:
                    console.error('🔥 Server error in party operation:', data.message);
                    break;
                default:
                    console.error('❓ Unhandled party API error:', data.message || error.message);
            }

            // Throw error with server message and code
            const errorMessage = data.message || `HTTP Error: ${status}`;
            const apiError = new Error(errorMessage);
            apiError.code = data.code;
            apiError.status = status;
            apiError.debug = data.debug;
            throw apiError;
        } else if (error.request) {
            // Network error
            console.error('🌐 Network Error in party request:', error.message);
            const networkError = new Error('Unable to connect to server. Please check your internet connection.');
            networkError.code = 'NETWORK_ERROR';
            throw networkError;
        } else {
            // Other error
            console.error('❓ Unknown Party Service Error:', error.message);
            throw new Error(error.message || 'An unexpected error occurred.');
        }
    }
);

class PartyService {
    /**
     * Validate company context before making requests
     * @returns {Object} Company validation result
     */
    validateCompanyContext() {
        const currentCompany = localStorage.getItem('currentCompany');
        
        console.log('🔍 Validating company context:', {
            hasCurrentCompany: !!currentCompany,
            currentCompanyValue: currentCompany
        });
        
        if (!currentCompany) {
            return {
                isValid: false,
                error: 'No company selected. Please select a company first.',
                company: null
            };
        }

        try {
            const company = JSON.parse(currentCompany);
            const companyId = company.id || company._id || company.companyId;
            
            console.log('🔍 Parsed company data:', {
                company: company,
                companyId: companyId,
                hasId: !!companyId
            });
            
            if (!companyId) {
                return {
                    isValid: false,
                    error: 'Company ID is missing. Please reselect your company.',
                    company: company
                };
            }

            return {
                isValid: true,
                error: null,
                company: company,
                companyId: companyId
            };
        } catch (e) {
            console.error('❌ Error parsing company data:', e);
            return {
                isValid: false,
                error: 'Invalid company data. Please reselect your company.',
                company: null
            };
        }
    }

    /**
     * Create a new party
     * @param {Object} partyData - Party data
     * @returns {Promise<Object>} Created party data
     */
    async createParty(partyData) {
        try {
            console.log('📝 Creating party:', partyData);

            // Validate required fields
            if (!partyData.name || !partyData.phoneNumber) {
                throw new Error('Name and phone number are required');
            }

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            // Transform the form data to match backend schema
            const backendData = {
                partyType: partyData.partyType || 'customer',
                name: partyData.name.trim(),
                email: partyData.email?.trim() || undefined,
                phoneNumber: partyData.phoneNumber?.trim() || partyData.phone?.trim(),
                companyName: partyData.companyName?.trim() || undefined,
                gstNumber: partyData.gstNumber?.toUpperCase() || undefined,
                country: partyData.country || 'INDIA',
                
                // Home address
                homeAddressLine: partyData.homeAddressLine || partyData.addressLine || partyData.address || '',
                homePincode: partyData.homePincode || partyData.pincode || '',
                homeState: partyData.homeState || partyData.state || '',
                homeDistrict: partyData.homeDistrict || partyData.district || '',
                homeTaluka: partyData.homeTaluka || partyData.taluka || '',
                
                // Delivery address
                deliveryAddressLine: partyData.deliveryAddressLine || '',
                deliveryPincode: partyData.deliveryPincode || '',
                deliveryState: partyData.deliveryState || '',
                deliveryDistrict: partyData.deliveryDistrict || '',
                deliveryTaluka: partyData.deliveryTaluka || '',
                sameAsHomeAddress: partyData.sameAsHomeAddress || false,
                
                // Financial
                openingBalance: parseFloat(partyData.openingBalance) || 0,
                openingBalanceType: partyData.openingBalanceType || 'debit',
                
                // Additional phone numbers
                phoneNumbers: partyData.phoneNumbers?.filter(phone => phone.number && phone.number.trim()) || []
            };

            // Remove undefined fields to avoid sending unnecessary data
            Object.keys(backendData).forEach(key => {
                if (backendData[key] === undefined) {
                    delete backendData[key];
                }
            });

            console.log('📤 Sending party data to backend:', Object.keys(backendData));
            console.log('🏢 Using company:', companyValidation.company.name, 'ID:', companyValidation.companyId);

            const response = await apiClient.post('/api/parties', backendData);

            console.log('✅ Party created successfully:', response.data?.data?.name || 'Unknown');
            return response.data;

        } catch (error) {
            console.error('❌ Error creating party:', error.message);
            throw error;
        }
    }

    /**
     * Create a quick party (minimal data)
     * @param {Object} quickData - Quick party data
     * @returns {Promise<Object>} Created party data
     */
    async createQuickParty(quickData) {
        try {
            console.log('⚡ Creating quick party:', quickData);

            // Validate required fields
            if (!quickData.name || !quickData.phone) {
                throw new Error('Name and phone are required for quick party');
            }

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            const backendData = {
                name: quickData.name.trim(),
                phone: quickData.phone.trim(),
                type: quickData.type || 'customer'
            };

            console.log('🏢 Using company:', companyValidation.company.name, 'ID:', companyValidation.companyId);

            const response = await apiClient.post('/api/parties/quick', backendData);

            console.log('✅ Quick party created successfully:', response.data?.data?.name || 'Unknown');
            return response.data;

        } catch (error) {
            console.error('❌ Error creating quick party:', error.message);
            throw error;
        }
    }

    /**
     * Get all parties with pagination and filtering
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Parties data with pagination
     */
    async getParties(filters = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                partyType = 'all',
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = filters;

            console.log('📋 Fetching parties with filters:', { page, limit, search, partyType, sortBy, sortOrder });

            // Validate company context first
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                console.error('🏢 Company validation failed:', companyValidation.error);
                throw new Error(companyValidation.error);
            }

            console.log('🏢 Using company for party fetch:', companyValidation.company.name, 'ID:', companyValidation.companyId);

            const params = {
                page,
                limit,
                partyType,
                sortBy,
                sortOrder
            };

            // Only add search if it's not empty
            if (search && search.trim() !== '') {
                params.search = search.trim();
            }

            // Add company ID as query param as fallback
            params.companyId = companyValidation.companyId;

            console.log('📤 Request params:', params);

            const response = await apiClient.get('/api/parties', { params });

            console.log('✅ Parties fetched successfully:', {
                count: response.data?.data?.parties?.length || 0,
                total: response.data?.data?.pagination?.totalItems || 0,
                page: response.data?.data?.pagination?.current || page
            });

            return response.data;

        } catch (error) {
            console.error('❌ Error fetching parties:', error.message);
            throw error;
        }
    }

    /**
     * Get party by ID
     * @param {string} partyId - Party ID
     * @returns {Promise<Object>} Party data
     */
    async getPartyById(partyId) {
        try {
            console.log('🔍 Fetching party by ID:', partyId);

            if (!partyId) {
                throw new Error('Party ID is required');
            }

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            console.log('🏢 Using company:', companyValidation.company.name, 'ID:', companyValidation.companyId);

            // Add company ID as query param as fallback
            const params = {
                companyId: companyValidation.companyId
            };

            const response = await apiClient.get(`/api/parties/${partyId}`, { params });

            console.log('✅ Party fetched successfully:', response.data?.data?.name || 'Unknown');
            return response.data;

        } catch (error) {
            console.error('❌ Error fetching party:', error.message);
            throw error;
        }
    }

    /**
     * Update party
     * @param {string} partyId - Party ID
     * @param {Object} partyData - Updated party data
     * @returns {Promise<Object>} Updated party data
     */
    async updateParty(partyId, partyData) {
        try {
            console.log('📝 Updating party:', partyId, Object.keys(partyData));

            if (!partyId) {
                throw new Error('Party ID is required');
            }

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            // Transform the form data to match backend schema
            const backendData = {
                partyType: partyData.partyType,
                name: partyData.name?.trim(),
                email: partyData.email?.trim() || undefined,
                phoneNumber: partyData.phoneNumber?.trim() || partyData.phone?.trim(),
                companyName: partyData.companyName?.trim() || undefined,
                gstNumber: partyData.gstNumber?.toUpperCase() || undefined,
                country: partyData.country || 'INDIA',
                
                // Home address
                homeAddressLine: partyData.homeAddressLine || partyData.addressLine || partyData.address || '',
                homePincode: partyData.homePincode || partyData.pincode || '',
                homeState: partyData.homeState || partyData.state || '',
                homeDistrict: partyData.homeDistrict || partyData.district || '',
                homeTaluka: partyData.homeTaluka || partyData.taluka || '',
                
                // Delivery address
                deliveryAddressLine: partyData.deliveryAddressLine || '',
                deliveryPincode: partyData.deliveryPincode || '',
                deliveryState: partyData.deliveryState || '',
                deliveryDistrict: partyData.deliveryDistrict || '',
                deliveryTaluka: partyData.deliveryTaluka || '',
                sameAsHomeAddress: partyData.sameAsHomeAddress || false,
                
                // Financial
                openingBalance: parseFloat(partyData.openingBalance) || 0,
                openingBalanceType: partyData.openingBalanceType || 'debit',
                
                // Additional phone numbers
                phoneNumbers: partyData.phoneNumbers?.filter(phone => phone.number && phone.number.trim()) || []
            };

            // Remove undefined fields for cleaner update
            Object.keys(backendData).forEach(key => {
                if (backendData[key] === undefined) {
                    delete backendData[key];
                }
            });

            console.log('📤 Sending party update data:', Object.keys(backendData));
            console.log('🏢 Using company:', companyValidation.company.name, 'ID:', companyValidation.companyId);

            const response = await apiClient.put(`/api/parties/${partyId}`, backendData);

            console.log('✅ Party updated successfully:', response.data?.data?.name || 'Unknown');
            return response.data;

        } catch (error) {
            console.error('❌ Error updating party:', error.message);
            throw error;
        }
    }

    /**
     * Delete party
     * @param {string} partyId - Party ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteParty(partyId) {
        try {
            console.log('🗑️ Deleting party:', partyId);

            if (!partyId) {
                throw new Error('Party ID is required');
            }

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            console.log('🏢 Using company:', companyValidation.company.name, 'ID:', companyValidation.companyId);

            // Add company ID as query param as fallback
            const params = {
                companyId: companyValidation.companyId
            };

            const response = await apiClient.delete(`/api/parties/${partyId}`, { params });

            console.log('✅ Party deleted successfully');
            return response.data;

        } catch (error) {
            console.error('❌ Error deleting party:', error.message);
            throw error;
        }
    }

    /**
     * Search parties
     * @param {string} query - Search query
     * @param {string} type - Party type filter (optional)
     * @param {number} limit - Result limit (default: 10)
     * @returns {Promise<Object>} Search results
     */
    async searchParties(query, type = null, limit = 10) {
        try {
            console.log('🔍 Searching parties:', { query, type, limit });

            if (!query || query.length < 2) {
                console.log('🔍 Search query too short, returning empty results');
                return {
                    success: true,
                    data: []
                };
            }

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            const params = { 
                limit,
                companyId: companyValidation.companyId // Add as fallback
            };
            
            if (type && type !== 'all') {
                params.type = type;
            }

            console.log('🏢 Using company:', companyValidation.company.name, 'ID:', companyValidation.companyId);

            const response = await apiClient.get(`/api/parties/search/${encodeURIComponent(query.trim())}`, { params });

            console.log('✅ Parties search completed:', response.data?.data?.length || 0, 'results');
            return response.data;

        } catch (error) {
            console.error('❌ Error searching parties:', error.message);
            throw error;
        }
    }

    /**
     * Get party statistics for current company
     * @returns {Promise<Object>} Party statistics
     */
    async getPartyStats() {
        try {
            console.log('📊 Fetching party statistics');

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            console.log('🏢 Using company:', companyValidation.company.name, 'ID:', companyValidation.companyId);

            // Add company ID as query param as fallback
            const params = {
                companyId: companyValidation.companyId
            };

            const response = await apiClient.get('/api/parties/stats', { params });

            console.log('✅ Party statistics fetched successfully');
            return response.data;

        } catch (error) {
            console.error('❌ Error fetching party statistics:', error.message);
            throw error;
        }
    }

    /**
     * Check if party service is available (health check)
     * @returns {Promise<boolean>} Service availability
     */
    async checkServiceHealth() {
        try {
            // For health check, just try to get stats with company validation
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                console.warn('⚠️ Health check failed - no company context');
                return false;
            }

            const response = await apiClient.get('/api/parties/stats', {
                params: { companyId: companyValidation.companyId }
            });
            return response.status === 200;
        } catch (error) {
            console.warn('⚠️ Party service health check failed:', error.message);
            return false;
        }
    }

    /**
     * Get current company context
     * @returns {Object|null} Current company data
     */
    getCurrentCompany() {
        const validation = this.validateCompanyContext();
        return validation.isValid ? validation.company : null;
    }

    /**
     * Get current company ID
     * @returns {string|null} Current company ID
     */
    getCurrentCompanyId() {
        const validation = this.validateCompanyContext();
        return validation.isValid ? validation.companyId : null;
    }

    /**
     * Validate party data before sending to backend
     * @param {Object} partyData - Party data to validate
     * @returns {Object} Validation result
     */
    validatePartyData(partyData) {
        const errors = [];

        if (!partyData.name || partyData.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }

        if (!partyData.phoneNumber || partyData.phoneNumber.trim().length < 10) {
            errors.push('Phone number must be at least 10 digits');
        }

        if (partyData.email && partyData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partyData.email.trim())) {
            errors.push('Email format is invalid');
        }

        if (partyData.gstNumber && partyData.gstNumber.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(partyData.gstNumber.trim().toUpperCase())) {
            errors.push('GST number format is invalid');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Debug current state
     */
    debugState() {
        const validation = this.validateCompanyContext();
        const token = localStorage.getItem('token');
        
        console.log('🔍 Party Service Debug State:', {
            hasToken: !!token,
            tokenLength: token?.length || 0,
            companyValidation: validation,
            localStorage: {
                token: !!localStorage.getItem('token'),
                user: !!localStorage.getItem('user'),
                currentCompany: !!localStorage.getItem('currentCompany'),
                currentCompanyRaw: localStorage.getItem('currentCompany')
            }
        });
        
        return {
            hasToken: !!token,
            companyValid: validation.isValid,
            companyId: validation.companyId,
            companyName: validation.company?.name,
            error: validation.error
        };
    }
}

// Create and export singleton instance
const partyService = new PartyService();
export default partyService;