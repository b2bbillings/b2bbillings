import { API_BASE_URL } from '../config/api';
import { getSelectedCompany } from '../utils/auth';

const EXPENSE_API_URL = `${API_BASE_URL}/api/expenses`;

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

export const expenseService = {
  // Create a new expense
  async createExpense(expenseData) {
    try {
      const formData = new FormData();
      
      // Map frontend field names to backend field names
      const fieldMapping = {
        'paymentDone': 'paymentMethod',
        'uploadedBill': 'billFile'
      };
      
      // Append all expense data to FormData with field mapping
      Object.keys(expenseData).forEach(key => {
        const backendKey = fieldMapping[key] || key;
        
        if (key === 'uploadedBill' && expenseData[key]) {
          formData.append('billFile', expenseData[key]);
        } else if (expenseData[key] !== null && expenseData[key] !== undefined && expenseData[key] !== '') {
          formData.append(backendKey, expenseData[key]);
        }
      });

      const response = await fetch(EXPENSE_API_URL, {
        method: 'POST',
        headers: getFormDataHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create expense');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  },

  // Get all expenses
  async getAllExpenses(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const url = queryParams.toString() 
        ? `${EXPENSE_API_URL}?${queryParams.toString()}`
        : EXPENSE_API_URL;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch expenses');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  },

  // Get expense by ID
  async getExpenseById(id) {
    try {
      const response = await fetch(`${EXPENSE_API_URL}/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch expense');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching expense:', error);
      throw error;
    }
  },

  // Update expense
  async updateExpense(id, expenseData) {
    try {
      const formData = new FormData();
      
      // Append all expense data to FormData
      Object.keys(expenseData).forEach(key => {
        if (key === 'billFile' && expenseData[key]) {
          formData.append('billFile', expenseData[key]);
        } else if (expenseData[key] !== null && expenseData[key] !== undefined) {
          formData.append(key, expenseData[key]);
        }
      });

      const response = await fetch(`${EXPENSE_API_URL}/${id}`, {
        method: 'PUT',
        headers: getFormDataHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update expense');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  },

  // Delete expense
  async deleteExpense(id) {
    try {
      const response = await fetch(`${EXPENSE_API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete expense');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  },

  // Get expense statistics
  async getExpenseStats(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const url = queryParams.toString() 
        ? `${EXPENSE_API_URL}/stats?${queryParams.toString()}`
        : `${EXPENSE_API_URL}/stats`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch expense stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      throw error;
    }
  }
};

export default expenseService;