import axios from "axios";
import apiConfig from "../config/api.js";
import { getSelectedCompany, getAuthToken } from '../utils/auth.js';

const API_BASE_URL = apiConfig.baseURL;

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

// Create axios instance with auth interceptor
const createAxiosInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000
  });

  // Add auth token and company ID to requests
  instance.interceptors.request.use(
    (config) => {
      const headers = getAuthHeaders();
      config.headers = { ...config.headers, ...headers };
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Handle responses and token expiry
  instance.interceptors.response.use(
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

  return instance;
};

const api = createAxiosInstance();

// Category API Functions
export const categoryService = {
  // Get all categories
  getAllCategories: async () => {
    try {
      const response = await api.get('/api/categories');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch categories',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Get category by ID
  getCategoryById: async (categoryId) => {
    try {
      const response = await api.get(`/api/categories/${categoryId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error fetching category:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch category',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Create new category
  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/api/categories', categoryData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error creating category:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create category',
        error: error.response?.data?.error || error.message,
        errors: error.response?.data?.errors || []
      };
    }
  },

  // Update category
  updateCategory: async (categoryId, categoryData) => {
    try {
      const response = await api.put(`/api/categories/${categoryId}`, categoryData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating category:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update category',
        error: error.response?.data?.error || error.message,
        errors: error.response?.data?.errors || []
      };
    }
  },

  // Delete category
  deleteCategory: async (categoryId) => {
    try {
      const response = await api.delete(`/api/categories/${categoryId}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error deleting category:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete category',
        error: error.response?.data?.error || error.message
      };
    }
  }
};

// SubCategory API Functions
export const subCategoryService = {
  // Get all sub-categories
  getAllSubCategories: async () => {
    try {
      const response = await api.get('/api/subcategories');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch sub-categories',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Get sub-categories by parent category
  getSubCategoriesByParent: async (parentCategoryId) => {
    try {
      const response = await api.get(`/api/subcategories/parent/${parentCategoryId}`);
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch sub-categories',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Create new sub-category
  createSubCategory: async (subCategoryData) => {
    try {
      const response = await api.post('/api/subcategories', subCategoryData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error creating sub-category:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create sub-category',
        error: error.response?.data?.error || error.message,
        errors: error.response?.data?.errors || []
      };
    }
  },

  // Update sub-category
  updateSubCategory: async (subCategoryId, subCategoryData) => {
    try {
      const response = await api.put(`/api/subcategories/${subCategoryId}`, subCategoryData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating sub-category:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update sub-category',
        error: error.response?.data?.error || error.message,
        errors: error.response?.data?.errors || []
      };
    }
  },

  // Delete sub-category
  deleteSubCategory: async (subCategoryId) => {
    try {
      const response = await api.delete(`/api/subcategories/${subCategoryId}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error deleting sub-category:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete sub-category',
        error: error.response?.data?.error || error.message
      };
    }
  }
};

// Expense & Income Category API Functions
export const expenseIncomeCategoryService = {
  // Get all expense categories
  getExpenseCategories: async () => {
    try {
      const response = await api.get('/api/expense-income-categories/expenses');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch expense categories',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Get all income categories
  getIncomeCategories: async () => {
    try {
      const response = await api.get('/api/expense-income-categories/income');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error fetching income categories:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch income categories',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Create new expense category
  createExpenseCategory: async (categoryData) => {
    try {
      console.log('Creating expense category with data:', categoryData);
      const response = await api.post('/api/expense-income-categories/expenses', categoryData);
      console.log('Expense category created successfully:', response.data);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error creating expense category:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create expense category',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Create new income category
  createIncomeCategory: async (categoryData) => {
    try {
      console.log('Creating income category with data:', categoryData);
      const response = await api.post('/api/expense-income-categories/income', categoryData);
      console.log('Income category created successfully:', response.data);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error creating income category:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create income category',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Initialize default expense categories
  initializeExpenseCategories: async () => {
    try {
      const response = await api.post('/api/expense-income-categories/expenses/initialize');
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error initializing expense categories:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to initialize expense categories',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Initialize default income categories
  initializeIncomeCategories: async () => {
    try {
      const response = await api.post('/api/expense-income-categories/income/initialize');
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error initializing income categories:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to initialize income categories',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Update expense category
  updateExpenseCategory: async (categoryId, categoryData) => {
    try {
      console.log('Updating expense category:', categoryId, categoryData);
      const response = await api.put(`/api/expense-income-categories/expenses/${categoryId}`, categoryData);
      console.log('Expense category updated successfully:', response.data);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating expense category:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update expense category',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Delete expense category
  deleteExpenseCategory: async (categoryId) => {
    try {
      console.log('Deleting expense category:', categoryId);
      const response = await api.delete(`/api/expense-income-categories/expenses/${categoryId}`);
      console.log('Expense category deleted successfully:', response.data);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error deleting expense category:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete expense category',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Update income category
  updateIncomeCategory: async (categoryId, categoryData) => {
    try {
      console.log('Updating income category:', categoryId, categoryData);
      const response = await api.put(`/api/expense-income-categories/income/${categoryId}`, categoryData);
      console.log('Income category updated successfully:', response.data);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating income category:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update income category',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Delete income category
  deleteIncomeCategory: async (categoryId) => {
    try {
      console.log('Deleting income category:', categoryId);
      const response = await api.delete(`/api/expense-income-categories/income/${categoryId}`);
      console.log('Income category deleted successfully:', response.data);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error deleting income category:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete income category',
        error: error.response?.data?.error || error.message
      };
    }
  }
};

export default {
  categoryService,
  subCategoryService,
  expenseIncomeCategoryService
};