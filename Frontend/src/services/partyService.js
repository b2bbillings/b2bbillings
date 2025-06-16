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
        }

        // Add current company context
        const currentCompany = localStorage.getItem('currentCompany');
        if (currentCompany) {
            try {
                const company = JSON.parse(currentCompany);
                const companyId = company.id || company._id || company.companyId;

                if (companyId) {
                    config.headers['X-Company-ID'] = companyId;
                }
            } catch (e) {
                // Silent error handling
            }
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
                    // Clear all authentication data
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('currentCompany');

                    // Only redirect if not already on login page
                    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth')) {
                        window.location.href = '/login';
                    }
                    break;
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
            const networkError = new Error('Unable to connect to server. Please check your internet connection.');
            networkError.code = 'NETWORK_ERROR';
            throw networkError;
        } else {
            // Other error
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
                email: partyData.email?.trim() || '',
                phoneNumber: partyData.phoneNumber?.trim(),
                companyName: partyData.companyName?.trim() || '',

                // GST Information
                gstNumber: partyData.gstNumber?.trim()?.toUpperCase() || '',
                gstType: partyData.gstType || 'unregistered',

                // Financial Information
                creditLimit: parseFloat(partyData.creditLimit) || 0,
                openingBalance: parseFloat(partyData.openingBalance) || 0,

                country: partyData.country || 'INDIA',

                // Home address
                homeAddressLine: partyData.homeAddressLine || '',
                homePincode: partyData.homePincode || '',
                homeState: partyData.homeState || '',
                homeDistrict: partyData.homeDistrict || '',
                homeTaluka: partyData.homeTaluka || '',

                // Delivery address
                deliveryAddressLine: partyData.deliveryAddressLine || '',
                deliveryPincode: partyData.deliveryPincode || '',
                deliveryState: partyData.deliveryState || '',
                deliveryDistrict: partyData.deliveryDistrict || '',
                deliveryTaluka: partyData.deliveryTaluka || '',
                sameAsHomeAddress: partyData.sameAsHomeAddress || false,

                // Additional phone numbers
                phoneNumbers: partyData.phoneNumbers?.filter(phone => phone.number && phone.number.trim()) || []
            };

            // Remove empty fields to avoid sending unnecessary data
            Object.keys(backendData).forEach(key => {
                if (backendData[key] === '' || backendData[key] === undefined || backendData[key] === null) {
                    delete backendData[key];
                }
            });

            // Ensure phoneNumbers array has at least the primary phone
            if (!backendData.phoneNumbers || backendData.phoneNumbers.length === 0) {
                backendData.phoneNumbers = [{
                    number: backendData.phoneNumber,
                    label: 'Primary'
                }];
            }

            const response = await apiClient.post('/api/parties', backendData);
            return response.data;

        } catch (error) {
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

            const response = await apiClient.post('/api/parties/quick', backendData);
            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Check if phone number exists in current company
     * @param {string} phoneNumber - Phone number to check
     * @returns {Promise<Object>} Check result
     */
    async checkPhoneExists(phoneNumber) {
        try {
            if (!phoneNumber?.trim()) {
                return { success: true, exists: false, party: null };
            }

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            const response = await apiClient.get(`/api/parties/check-phone/${phoneNumber.trim()}`);
            return response.data;

        } catch (error) {
            // If service is not available, return false to not block creation
            if (error.response?.status === 404) {
                return { success: true, exists: false, party: null };
            }
            throw error;
        }
    }

    /**
   * Get all parties with pagination and filtering
   * @param {string|Object} companyIdOrFilters - Company ID or filters object (for backward compatibility)
   * @param {Object} filters - Filter options (when companyId is provided as first param)
   * @returns {Promise<Object>} Parties data with pagination
   */
    async getParties(companyIdOrFilters = {}, filters = {}) {
        try {
            let actualFilters = {};
            let companyId = null;

            // Handle different parameter formats for backward compatibility
            if (typeof companyIdOrFilters === 'string') {
                // New format: getParties(companyId, filters)
                companyId = companyIdOrFilters;
                actualFilters = filters || {};
            } else {
                // Old format: getParties(filters)
                actualFilters = companyIdOrFilters || {};
            }

            // Extract filter parameters with defaults
            const {
                page = 1,
                limit = 10,
                search = '',
                partyType = null,
                type = null, // Handle both partyType and type for compatibility
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = actualFilters;

            // Validate company context if companyId not provided
            let companyValidation;
            if (!companyId) {
                companyValidation = this.validateCompanyContext();
                if (!companyValidation.isValid) {
                    throw new Error(companyValidation.error);
                }
                companyId = companyValidation.companyId;
            }

            // Build request parameters
            const params = {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                type: partyType || type || 'all',
                sortBy: String(sortBy),
                sortOrder: String(sortOrder),
                companyId: companyId
            };

            // Only add search if it's not empty and is a string
            if (search && typeof search === 'string' && search.trim() !== '') {
                params.search = search.trim();
            } else if (search && typeof search !== 'string') {
                // Convert non-string search to string and check if it's meaningful
                const searchString = String(search).trim();
                if (searchString !== '' && searchString !== 'undefined' && searchString !== 'null') {
                    params.search = searchString;
                }
            }
            const response = await apiClient.get('/api/parties', { params });
            return response.data;

        } catch (error) {
            console.error('❌ PartyService.getParties error:', error);
            throw error;
        }
    }

    /**
     * Delete party
     * @param {string} companyIdOrPartyId - Company ID or Party ID (for backward compatibility)
     * @param {string} partyId - Party ID (when companyId is provided as first param)
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteParty(companyIdOrPartyId, partyId = null) {
        try {
            let actualPartyId;
            let companyId = null;

            // Handle different parameter formats for backward compatibility
            if (partyId) {
                // New format: deleteParty(companyId, partyId)
                companyId = companyIdOrPartyId;
                actualPartyId = partyId;
            } else {
                // Old format: deleteParty(partyId)
                actualPartyId = companyIdOrPartyId;
            }

            if (!actualPartyId) {
                throw new Error('Party ID is required');
            }

            // Validate company context if companyId not provided
            let companyValidation;
            if (!companyId) {
                companyValidation = this.validateCompanyContext();
                if (!companyValidation.isValid) {
                    throw new Error(companyValidation.error);
                }
                companyId = companyValidation.companyId;
            }

            // Add company ID as query param
            const params = {
                companyId: companyId
            };

            const response = await apiClient.delete(`/api/parties/${actualPartyId}`, { params });
            return response.data;

        } catch (error) {
            console.error('❌ PartyService.deleteParty error:', error);
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
            if (!partyId) {
                throw new Error('Party ID is required');
            }

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            // Add company ID as query param as fallback
            const params = {
                companyId: companyValidation.companyId
            };

            const response = await apiClient.get(`/api/parties/${partyId}`, { params });
            return response.data;

        } catch (error) {
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
                email: partyData.email?.trim() || '',
                phoneNumber: partyData.phoneNumber?.trim(),
                companyName: partyData.companyName?.trim() || '',

                // GST Information
                gstNumber: partyData.gstNumber?.trim()?.toUpperCase() || '',
                gstType: partyData.gstType || 'unregistered',

                // Financial Information
                creditLimit: parseFloat(partyData.creditLimit) || 0,
                openingBalance: parseFloat(partyData.openingBalance) || 0,

                country: partyData.country || 'INDIA',

                // Home address
                homeAddressLine: partyData.homeAddressLine || '',
                homePincode: partyData.homePincode || '',
                homeState: partyData.homeState || '',
                homeDistrict: partyData.homeDistrict || '',
                homeTaluka: partyData.homeTaluka || '',

                // Delivery address
                deliveryAddressLine: partyData.deliveryAddressLine || '',
                deliveryPincode: partyData.deliveryPincode || '',
                deliveryState: partyData.deliveryState || '',
                deliveryDistrict: partyData.deliveryDistrict || '',
                deliveryTaluka: partyData.deliveryTaluka || '',
                sameAsHomeAddress: partyData.sameAsHomeAddress || false,

                // Additional phone numbers
                phoneNumbers: partyData.phoneNumbers?.filter(phone => phone.number && phone.number.trim()) || []
            };

            // Remove undefined fields for cleaner update
            Object.keys(backendData).forEach(key => {
                if (backendData[key] === undefined) {
                    delete backendData[key];
                }
            });

            const response = await apiClient.put(`/api/parties/${partyId}`, backendData);
            return response.data;

        } catch (error) {
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
            if (!partyId) {
                throw new Error('Party ID is required');
            }

            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            // Add company ID as query param as fallback
            const params = {
                companyId: companyValidation.companyId
            };

            const response = await apiClient.delete(`/api/parties/${partyId}`, { params });
            return response.data;

        } catch (error) {
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
            if (!query || query.length < 2) {
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

            const response = await apiClient.get(`/api/parties/search/${encodeURIComponent(query.trim())}`, { params });
            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get party statistics for current company
     * @returns {Promise<Object>} Party statistics
     */
    async getPartyStats() {
        try {
            // Validate company context
            const companyValidation = this.validateCompanyContext();
            if (!companyValidation.isValid) {
                throw new Error(companyValidation.error);
            }

            // Add company ID as query param as fallback
            const params = {
                companyId: companyValidation.companyId
            };

            const response = await apiClient.get('/api/parties/stats', { params });
            return response.data;

        } catch (error) {
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
                return false;
            }

            const response = await apiClient.get('/api/parties/stats', {
                params: { companyId: companyValidation.companyId }
            });
            return response.status === 200;
        } catch (error) {
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

        // Name validation
        if (!partyData.name || partyData.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }

        if (partyData.name && partyData.name.trim().length > 100) {
            errors.push('Name cannot exceed 100 characters');
        }

        // Phone number validation
        if (!partyData.phoneNumber || !/^[6-9]\d{9}$/.test(partyData.phoneNumber.trim())) {
            errors.push('Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9');
        }

        // Email validation
        if (partyData.email && partyData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partyData.email.trim())) {
            errors.push('Email format is invalid');
        }

        // GST number validation (only if type is not unregistered)
        if (partyData.gstType !== 'unregistered' && partyData.gstNumber && partyData.gstNumber.trim()) {
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(partyData.gstNumber.trim().toUpperCase())) {
                errors.push('Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)');
            }
        }

        // Credit limit validation
        if (partyData.creditLimit !== undefined && partyData.creditLimit < 0) {
            errors.push('Credit limit cannot be negative');
        }

        // Opening balance validation
        if (partyData.openingBalance !== undefined && partyData.openingBalance < 0) {
            errors.push('Opening balance cannot be negative');
        }

        // Pincode validation
        if (partyData.homePincode && partyData.homePincode.trim() && !/^[0-9]{6}$/.test(partyData.homePincode.trim())) {
            errors.push('Home pincode must be exactly 6 digits');
        }

        if (partyData.deliveryPincode && partyData.deliveryPincode.trim() && !/^[0-9]{6}$/.test(partyData.deliveryPincode.trim())) {
            errors.push('Delivery pincode must be exactly 6 digits');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Create and export singleton instance
const partyService = new PartyService();
export default partyService;