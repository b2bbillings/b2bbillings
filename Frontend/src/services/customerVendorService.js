import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw error.response?.data || error;
  }
);

// Customer API Service
export const customerService = {
  // Create new customer
  createCustomer: async (customerData) => {
    try {
      const response = await api.post('/customers', customerData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all customers with pagination and search
  getCustomers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/customers?${queryParams.toString()}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Search customers for autocomplete
  searchCustomers: async (query) => {
    try {
      const response = await api.get(`/customers/search?query=${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get customer by ID
  getCustomer: async (id) => {
    try {
      const response = await api.get(`/customers/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update customer
  updateCustomer: async (id, customerData) => {
    try {
      const response = await api.put(`/customers/${id}`, customerData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete customer
  deleteCustomer: async (id) => {
    try {
      const response = await api.delete(`/customers/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update customer balance
  updateCustomerBalance: async (id, balanceData) => {
    try {
      const response = await api.put(`/customers/${id}/balance`, balanceData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get customers with outstanding balance
  getOutstandingCustomers: async (minAmount = 0) => {
    try {
      const response = await api.get(`/customers/outstanding?minAmount=${minAmount}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get customer statistics
  getCustomerStats: async () => {
    try {
      const response = await api.get('/customers/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Check if phone number exists
  checkPhoneExists: async (phone) => {
    try {
      const response = await api.get(`/customers/check-phone?phone=${encodeURIComponent(phone)}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Check if email exists
  checkEmailExists: async (email) => {
    try {
      const response = await api.get(`/customers/check-email?email=${encodeURIComponent(email)}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Vendor API Service
export const vendorService = {
  // Create new vendor
  createVendor: async (vendorData) => {
    try {
      const response = await api.post('/vendors', vendorData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all vendors with pagination and search
  getVendors: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.vendorType) queryParams.append('vendorType', params.vendorType);

      const response = await api.get(`/vendors?${queryParams.toString()}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Search vendors for autocomplete
  searchVendors: async (query) => {
    try {
      const response = await api.get(`/vendors/search?query=${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get vendor by ID
  getVendor: async (id) => {
    try {
      const response = await api.get(`/vendors/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update vendor
  updateVendor: async (id, vendorData) => {
    try {
      const response = await api.put(`/vendors/${id}`, vendorData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete vendor
  deleteVendor: async (id) => {
    try {
      const response = await api.delete(`/vendors/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update vendor balance
  updateVendorBalance: async (id, balanceData) => {
    try {
      const response = await api.put(`/vendors/${id}/balance`, balanceData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get vendors with outstanding balance
  getOutstandingVendors: async (minAmount = 0) => {
    try {
      const response = await api.get(`/vendors/outstanding?minAmount=${minAmount}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get vendors by type
  getVendorsByType: async (type) => {
    try {
      const response = await api.get(`/vendors/type/${type}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Validate GSTIN
  validateGstin: async (gstin) => {
    try {
      const response = await api.post('/vendors/validate-gstin', { gstin });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get vendor statistics
  getVendorStats: async () => {
    try {
      const response = await api.get('/vendors/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Check if phone number exists
  checkPhoneExists: async (phone) => {
    try {
      const response = await api.get(`/vendors/check-phone?phone=${encodeURIComponent(phone)}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Check if email exists
  checkEmailExists: async (email) => {
    try {
      const response = await api.get(`/vendors/check-email?email=${encodeURIComponent(email)}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Utility functions for form handling
export const customerVendorUtils = {
  // Format phone number for Indian format
  formatPhone: (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{5})(\d{5})/, '$1 $2');
    }
    return phone;
  },

  // Validate Indian phone number
  validatePhone: (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  },

  // Validate email
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate GSTIN format
  validateGstin: (gstin) => {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
  },

  // Validate pincode
  validatePincode: (pincode) => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
  },

  // Format currency for display
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  },

  // Format balance with sign
  formatBalance: (balance, type = 'customer') => {
    const formatted = Math.abs(balance).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    if (type === 'customer') {
      return balance >= 0 ? `₹${formatted} (Receivable)` : `₹${formatted} (Advance)`;
    } else {
      return balance <= 0 ? `₹${formatted} (Payable)` : `₹${formatted} (Advance)`;
    }
  },

  // Get balance color based on amount and type
  getBalanceColor: (balance, type = 'customer') => {
    if (balance === 0) return 'text-gray-600';
    
    if (type === 'customer') {
      return balance > 0 ? 'text-red-600' : 'text-green-600';
    } else {
      return balance < 0 ? 'text-red-600' : 'text-green-600';
    }
  },

  // Debounce function for search
  debounce: (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  },

  // Generate display name for vendor
  getVendorDisplayName: (vendor) => {
    return vendor.copyToVendorName && vendor.company ? vendor.company : vendor.name;
  },

  // Get payment terms display text
  getPaymentTermsText: (terms) => {
    const termMap = {
      'immediate': 'Immediate',
      '15_days': '15 Days',
      '30_days': '30 Days',
      '45_days': '45 Days',
      '60_days': '60 Days',
      '90_days': '90 Days'
    };
    return termMap[terms] || terms;
  },

  // Get vendor type display text
  getVendorTypeText: (type) => {
    const typeMap = {
      'supplier': 'Supplier',
      'service_provider': 'Service Provider',
      'contractor': 'Contractor',
      'consultant': 'Consultant'
    };
    return typeMap[type] || type;
  },

  // Get GST type display text
  getGstTypeText: (type) => {
    const typeMap = {
      'unregistered': 'Unregistered',
      'regular': 'Regular',
      'composition': 'Composition'
    };
    return typeMap[type] || type;
  }
};

export default { customerService, vendorService, customerVendorUtils };