import { API_BASE_URL } from '../config/api';
import { getSelectedCompany } from '../utils/auth';

const INDIRECT_INCOME_API_URL = `${API_BASE_URL}/api/indirect-income`;

// Get authentication token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('authToken');
};

// Get company ID with multiple fallbacks
const getCompanyId = () => {
  // Try getSelectedCompany first
  let companyId = getSelectedCompany();
  
  if (!companyId) {
    try {
      const currentCompanyStr = localStorage.getItem("currentCompany");
      if (currentCompanyStr) {
        const currentCompany = JSON.parse(currentCompanyStr);
        companyId = currentCompany.id || currentCompany._id;
      }
    } catch (error) {
      // Silent error handling
    }
  }
  
  if (!companyId) {
    companyId = localStorage.getItem("selectedCompanyId") || 
                sessionStorage.getItem("companyId");
  }
  
  return companyId;
};

// Create headers with authentication
const getAuthHeaders = () => {
  const token = getAuthToken();
  const companyId = getCompanyId();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-auth-token': token,
    'x-company-id': companyId
  };
};

// Create headers for form data (with file upload)
const getFormDataHeaders = () => {
  const token = getAuthToken();
  const companyId = getCompanyId();
  return {
    'Authorization': `Bearer ${token}`,
    'x-auth-token': token,
    'x-company-id': companyId
    // Don't set Content-Type for FormData, let browser set it with boundary
  };
};

export const indirectIncomeService = {
  // Create a new indirect income
  async createIndirectIncome(incomeData) {
    try {
      const formData = new FormData();
      
      // Map frontend field names to backend field names
      const fieldMapping = {
        'paymentDone': 'paymentMethod',
        'uploadedBill': 'billFile'
      };
      
      // Append all income data to FormData with field mapping
      Object.keys(incomeData).forEach(key => {
        const backendKey = fieldMapping[key] || key;
        
        if (key === 'uploadedBill' && incomeData[key]) {
          formData.append('billFile', incomeData[key]);
        } else if (incomeData[key] !== null && incomeData[key] !== undefined && incomeData[key] !== '') {
          formData.append(backendKey, incomeData[key]);
        }
      });

      const response = await fetch(INDIRECT_INCOME_API_URL, {
        method: 'POST',
        headers: getFormDataHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create indirect income');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating indirect income:', error);
      throw error;
    }
  },

  // Get all indirect income records
  async getAllIndirectIncome(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const url = queryParams.toString() 
        ? `${INDIRECT_INCOME_API_URL}?${queryParams.toString()}`
        : INDIRECT_INCOME_API_URL;

      const headers = getAuthHeaders();
      console.log('Fetching indirect incomes from:', url);
      console.log('Request headers:', headers);

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch indirect income');
      }

      const result = await response.json();
      console.log('API Success Response:', result);
      return result;
    } catch (error) {
      console.error('Error fetching indirect income:', error);
      throw error;
    }
  },

  // Get indirect income by ID
  async getIndirectIncomeById(id) {
    try {
      const response = await fetch(`${INDIRECT_INCOME_API_URL}/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch indirect income');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching indirect income:', error);
      throw error;
    }
  },

  // Update indirect income
  async updateIndirectIncome(id, incomeData) {
    try {
      const formData = new FormData();
      
      // Append all income data to FormData
      Object.keys(incomeData).forEach(key => {
        if (key === 'billFile' && incomeData[key]) {
          formData.append('billFile', incomeData[key]);
        } else if (incomeData[key] !== null && incomeData[key] !== undefined) {
          formData.append(key, incomeData[key]);
        }
      });

      const response = await fetch(`${INDIRECT_INCOME_API_URL}/${id}`, {
        method: 'PUT',
        headers: getFormDataHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update indirect income');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating indirect income:', error);
      throw error;
    }
  },

  // Delete indirect income
  async deleteIndirectIncome(id) {
    try {
      const response = await fetch(`${INDIRECT_INCOME_API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete indirect income');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting indirect income:', error);
      throw error;
    }
  },

  // Get indirect income statistics
  async getIndirectIncomeStats(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const url = queryParams.toString() 
        ? `${INDIRECT_INCOME_API_URL}/stats?${queryParams.toString()}`
        : `${INDIRECT_INCOME_API_URL}/stats`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch indirect income stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching indirect income stats:', error);
      throw error;
    }
  }
};

export default indirectIncomeService;