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
                    window.location.href = '/login';
                    break;
                case 403:
                    console.error('Access forbidden:', data.message);
                    break;
                case 404:
                    console.error('Resource not found:', data.message);
                    break;
                case 500:
                    console.error('Server error:', data.message);
                    break;
                default:
                    console.error('API Error:', data.message || error.message);
            }

            // Throw error with server message
            throw new Error(data.message || `HTTP Error: ${status}`);
        } else if (error.request) {
            // Network error
            console.error('Network Error:', error.message);
            throw new Error('Unable to connect to server. Please check your internet connection.');
        } else {
            // Other error
            console.error('Error:', error.message);
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
            console.log('🚀 Creating company with data:', companyData);

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

            console.log('✅ Company created successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error creating company:', error);
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
            console.log('📋 Fetching companies with params:', params);

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

            console.log('✅ Companies fetched successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error fetching companies:', error);
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
            console.log('🔍 Fetching company by ID:', id);

            if (!id) {
                throw new Error('Company ID is required');
            }

            const response = await apiClient.get(`/api/companies/${id}`);

            console.log('✅ Company fetched successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error fetching company by ID:', error);
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
            console.log('📝 Updating company:', id, companyData);

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

            console.log('✅ Company updated successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error updating company:', error);
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
            console.log('🗑️ Deleting company:', id);

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

            console.log('✅ Company deleted successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error deleting company:', error);
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
            console.log('🔍 Searching companies:', searchTerm, filters);

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
            console.error('❌ Error searching companies:', error);
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
            console.log('📊 Fetching companies by type:', businessType);

            if (!businessType) {
                throw new Error('Business type is required');
            }

            return await this.getCompanies({ businessType });

        } catch (error) {
            console.error('❌ Error fetching companies by type:', error);
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
            console.log('📍 Fetching companies by location:', state, city);

            if (!state) {
                throw new Error('State is required');
            }

            return await this.getCompanies({ state, city });

        } catch (error) {
            console.error('❌ Error fetching companies by location:', error);
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
            console.log('🔄 Toggling company status:', id, isActive);

            return await this.updateCompany(id, { isActive });

        } catch (error) {
            console.error('❌ Error toggling company status:', error);
            throw error;
        }
    }

    /**
     * Get company statistics
     * @returns {Promise<Object>} Company statistics
     */
    async getCompanyStats() {
        try {
            console.log('📈 Fetching company statistics');

            // This would be a separate endpoint in your backend
            const response = await apiClient.get('/api/companies/stats');

            console.log('✅ Company stats fetched:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error fetching company stats:', error);

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
            console.log('🔄 Performing bulk operation:', operation, companyIds);

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

            console.log('✅ Bulk operation completed:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error performing bulk operation:', error);
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
            console.log('📤 Exporting companies:', format, filters);

            const response = await apiClient.get('/api/companies/export', {
                params: {
                    format,
                    ...filters
                },
                responseType: 'blob'
            });

            console.log('✅ Companies exported successfully');
            return response.data;

        } catch (error) {
            console.error('❌ Error exporting companies:', error);
            throw error;
        }
    }
}

export default new CompanyService();