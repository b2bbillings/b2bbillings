import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and company ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const companyId = localStorage.getItem('selectedCompanyId') || sessionStorage.getItem('companyId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['x-auth-token'] = token;
    }

    if (companyId) {
      config.headers['x-company-id'] = companyId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const newBankDetailsService = {
  /**
   * Get all bank details for a company
   */
  async getBankDetails(companyId, filters = {}) {
    try {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const { active = 'true', search = '', page = 1, limit = 50 } = filters;

      const response = await api.get(`/companies/${companyId}/bank-accounts`, {
        params: {
          active,
          search,
          page,
          limit,
        },
      });

      return {
        success: true,
        data: response.data.data || response.data.bankAccounts || [],
        total: response.data.total || 0,
        message: response.data.message || 'Bank details fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching bank details:', error);
      return {
        success: false,
        data: [],
        total: 0,
        message: error.response?.data?.message || error.message || 'Failed to fetch bank details',
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Create a new bank account
   */
  async createBankDetail(companyId, bankData) {
    try {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      console.log('🔄 Creating bank account for company:', companyId);
      console.log('📋 Bank data:', bankData);

      const response = await api.post(`/companies/${companyId}/bank-accounts`, bankData);

      console.log('✅ Bank account created successfully:', response.data);

      return {
        success: true,
        data: response.data.data || response.data.account,
        message: response.data.message || 'Bank account created successfully',
      };
    } catch (error) {
      console.error('❌ Error creating bank account:', error);
      console.error('📛 Error response:', error.response?.data);
      console.error('📛 Error status:', error.response?.status);
      
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || 'Failed to create bank account',
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Get a single bank account by ID
   */
  async getBankDetail(companyId, accountId) {
    try {
      if (!companyId || !accountId) {
        throw new Error('Company ID and Account ID are required');
      }

      const response = await api.get(`/companies/${companyId}/bank-accounts/${accountId}`);

      return {
        success: true,
        data: response.data.data || response.data.account,
        message: response.data.message || 'Bank account fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching bank account:', error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || 'Failed to fetch bank account',
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Update an existing bank account
   */
  async updateBankDetail(companyId, accountId, bankData) {
    try {
      if (!companyId || !accountId) {
        throw new Error('Company ID and Account ID are required');
      }

      const response = await api.put(`/companies/${companyId}/bank-accounts/${accountId}`, bankData);

      return {
        success: true,
        data: response.data.data || response.data.account,
        message: response.data.message || 'Bank account updated successfully',
      };
    } catch (error) {
      console.error('Error updating bank account:', error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || 'Failed to update bank account',
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Delete a bank account
   */
  async deleteBankDetail(companyId, accountId) {
    try {
      if (!companyId || !accountId) {
        throw new Error('Company ID and Account ID are required');
      }

      const response = await api.delete(`/companies/${companyId}/bank-accounts/${accountId}`);

      return {
        success: true,
        message: response.data.message || 'Bank account deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting bank account:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to delete bank account',
        error: error.response?.data || error.message,
      };
    }
  },

  /**
   * Get account summary
   */
  async getAccountSummary(companyId) {
    try {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const response = await api.get(`/companies/${companyId}/bank-accounts/summary`);

      return {
        success: true,
        data: response.data.data || response.data.summary,
        message: response.data.message || 'Account summary fetched successfully',
      };
    } catch (error) {
      console.error('Error fetching account summary:', error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || 'Failed to fetch account summary',
        error: error.response?.data || error.message,
      };
    }
  },

  // Legacy method for backward compatibility
  createBank(companyId, payload) {
    return this.createBankDetail(companyId, payload);
  },
};

export default newBankDetailsService;