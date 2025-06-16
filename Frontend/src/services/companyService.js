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
                    localStorage.removeItem('user');
                    localStorage.removeItem('currentCompany');

                    // Only redirect if not already on login page
                    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth')) {
                        window.location.href = '/login';
                    }
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

class CompanyService {
    /**
     * Create a new company
     * @param {Object} companyData - Company data including files
     * @returns {Promise<Object>} Created company data
     */
    async createCompany(companyData) {
        try {
            // Prepare data for JSON submission (not FormData since we're sending base64)
            const payload = {
                businessName: companyData.businessName,
                phoneNumber: companyData.phoneNumber,
                gstin: companyData.gstin || undefined,
                email: companyData.email || undefined,
                businessType: companyData.businessType || undefined,
                businessCategory: companyData.businessCategory || undefined,
                state: companyData.state || undefined,
                pincode: companyData.pincode || undefined,
                city: companyData.city || undefined,
                tehsil: companyData.tehsil || undefined,
                address: companyData.address || undefined,
                additionalPhones: companyData.additionalPhones || [],
                logo: companyData.logo || undefined, // base64 string
                signatureImage: companyData.signatureImage || undefined // base64 string
            };

            // Remove undefined fields to keep payload clean
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined) {
                    delete payload[key];
                }
            });

            const response = await apiClient.post('/api/companies', payload);
            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get all companies with optional filters
     * @param {Object} params - Query parameters for filtering
     * @returns {Promise<Object>} Companies list with pagination
     */
    async getCompanies(params = {}) {
        try {
            const response = await apiClient.get('/api/companies', {
                params: {
                    page: params.page || 1,
                    limit: params.limit || 50,
                    search: params.search || '',
                    businessType: params.businessType || '',
                    businessCategory: params.businessCategory || '',
                    state: params.state || '',
                    city: params.city || '',
                    isActive: params.isActive !== undefined ? params.isActive : ''
                }
            });

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get company by ID
     * @param {string} id - Company ID
     * @returns {Promise<Object>} Company data
     */
    async getCompanyById(id) {
        try {
            if (!id) {
                throw new Error('Company ID is required');
            }

            const response = await apiClient.get(`/api/companies/${id}`);
            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Update company
     * @param {string} id - Company ID
     * @param {Object} companyData - Updated company data
     * @returns {Promise<Object>} Updated company data
     */
    async updateCompany(id, companyData) {
        try {
            if (!id) {
                throw new Error('Company ID is required');
            }

            // Prepare data similar to create
            const payload = {
                businessName: companyData.businessName,
                phoneNumber: companyData.phoneNumber,
                gstin: companyData.gstin || undefined,
                email: companyData.email || undefined,
                businessType: companyData.businessType || undefined,
                businessCategory: companyData.businessCategory || undefined,
                state: companyData.state || undefined,
                pincode: companyData.pincode || undefined,
                city: companyData.city || undefined,
                tehsil: companyData.tehsil || undefined,
                address: companyData.address || undefined,
                additionalPhones: companyData.additionalPhones || [],
                logo: companyData.logo || undefined,
                signatureImage: companyData.signatureImage || undefined,
                isActive: companyData.isActive
            };

            // Remove undefined fields
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined) {
                    delete payload[key];
                }
            });

            const response = await apiClient.put(`/api/companies/${id}`, payload);
            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete company
     * @param {string} id - Company ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteCompany(id) {
        try {
            if (!id) {
                throw new Error('Company ID is required');
            }

            // Show confirmation dialog
            const confirmed = window.confirm(
                'Are you sure you want to delete this company? This action cannot be undone.'
            );

            if (!confirmed) {
                throw new Error('Deletion cancelled by user');
            }

            const response = await apiClient.delete(`/api/companies/${id}`);
            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Search companies
     * @param {string} searchTerm - Search term
     * @param {Object} filters - Additional filters
     * @returns {Promise<Object>} Search results
     */
    async searchCompanies(searchTerm, filters = {}) {
        try {
            const params = {
                search: searchTerm,
                page: filters.page || 1,
                limit: filters.limit || 20,
                businessType: filters.businessType || '',
                businessCategory: filters.businessCategory || '',
                state: filters.state || '',
                city: filters.city || ''
            };

            return await this.getCompanies(params);

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get companies by business type
     * @param {string} businessType - Business type
     * @returns {Promise<Object>} Filtered companies
     */
    async getCompaniesByType(businessType) {
        try {
            if (!businessType) {
                throw new Error('Business type is required');
            }

            return await this.getCompanies({ businessType });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get companies by location
     * @param {string} state - State
     * @param {string} city - City (optional)
     * @returns {Promise<Object>} Filtered companies
     */
    async getCompaniesByLocation(state, city = '') {
        try {
            if (!state) {
                throw new Error('State is required');
            }

            return await this.getCompanies({ state, city });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Toggle company active status
     * @param {string} id - Company ID
     * @param {boolean} isActive - New active status
     * @returns {Promise<Object>} Updated company
     */
    async toggleCompanyStatus(id, isActive) {
        try {
            return await this.updateCompany(id, { isActive });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get company statistics
     * @returns {Promise<Object>} Company statistics
     */
    async getCompanyStats() {
        try {
            // This would be a separate endpoint in your backend
            const response = await apiClient.get('/api/companies/stats');
            return response.data;

        } catch (error) {
            // Return default stats if endpoint doesn't exist
            return {
                total: 0,
                active: 0,
                inactive: 0,
                byType: {},
                byLocation: {}
            };
        }
    }

    /**
     * Bulk operations on companies
     * @param {Array} companyIds - Array of company IDs
     * @param {string} operation - Operation type ('activate', 'deactivate', 'delete')
     * @returns {Promise<Object>} Operation result
     */
    async bulkOperation(companyIds, operation) {
        try {
            if (!companyIds || companyIds.length === 0) {
                throw new Error('No companies selected');
            }

            const validOperations = ['activate', 'deactivate', 'delete'];
            if (!validOperations.includes(operation)) {
                throw new Error('Invalid operation');
            }

            // Show confirmation for bulk operations
            const confirmed = window.confirm(
                `Are you sure you want to ${operation} ${companyIds.length} companies?`
            );

            if (!confirmed) {
                throw new Error('Operation cancelled by user');
            }

            const response = await apiClient.post('/api/companies/bulk', {
                companyIds,
                operation
            });

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Export companies to CSV/Excel
     * @param {string} format - Export format ('csv' or 'excel')
     * @param {Object} filters - Export filters
     * @returns {Promise<Blob>} Export file
     */
    async exportCompanies(format = 'csv', filters = {}) {
        try {
            const response = await apiClient.get('/api/companies/export', {
                params: {
                    format,
                    ...filters
                },
                responseType: 'blob'
            });

            return response.data;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Validate company data before sending to backend
     * @param {Object} companyData - Company data to validate
     * @returns {Object} Validation result
     */
    validateCompanyData(companyData) {
        const errors = [];

        // Business name validation
        if (!companyData.businessName || companyData.businessName.trim().length < 2) {
            errors.push('Business name must be at least 2 characters long');
        }

        if (companyData.businessName && companyData.businessName.trim().length > 100) {
            errors.push('Business name cannot exceed 100 characters');
        }

        // Phone number validation
        if (!companyData.phoneNumber || !/^[6-9]\d{9}$/.test(companyData.phoneNumber.trim())) {
            errors.push('Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9');
        }

        // Email validation
        if (companyData.email && companyData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.email.trim())) {
            errors.push('Email format is invalid');
        }

        // GSTIN validation
        if (companyData.gstin && companyData.gstin.trim()) {
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(companyData.gstin.trim().toUpperCase())) {
                errors.push('Please provide a valid GSTIN format (e.g., 22AAAAA0000A1Z5)');
            }
        }

        // Pincode validation
        if (companyData.pincode && companyData.pincode.trim() && !/^[0-9]{6}$/.test(companyData.pincode.trim())) {
            errors.push('Pincode must be exactly 6 digits');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if company service is available (health check)
     * @returns {Promise<boolean>} Service availability
     */
    async checkServiceHealth() {
        try {
            const response = await apiClient.get('/api/companies/health');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current company from localStorage
     * @returns {Object|null} Current company data
     */
    getCurrentCompany() {
        try {
            const currentCompany = localStorage.getItem('currentCompany');
            return currentCompany ? JSON.parse(currentCompany) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Set current company in localStorage
     * @param {Object} company - Company data to set as current
     */
    setCurrentCompany(company) {
        try {
            localStorage.setItem('currentCompany', JSON.stringify(company));
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Clear current company from localStorage
     */
    clearCurrentCompany() {
        try {
            localStorage.removeItem('currentCompany');
        } catch (error) {
            // Silent error handling
        }
    }
}

export default new CompanyService();