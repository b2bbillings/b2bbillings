import axios from "axios";
import apiConfig from "../config/api.js";

const API_BASE_URL = apiConfig.baseURL;

// Create axios instance with auth interceptor
const createAxiosInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add auth token to requests
  instance.interceptors.request.use(
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

export default {
  categoryService,
  subCategoryService
};