import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw error;
  }
);

// All Parties Service - Fetches customers, vendors, and end customers
export const allPartiesService = {
  /**
   * Fetch all customers
   */
  fetchCustomers: async (params = {}) => {
    try {
      console.log('📋 Fetching customers...');
      const response = await api.get('/customers', { params });
      console.log('✅ Customers fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      throw error;
    }
  },

  /**
   * Fetch all vendors
   */
  fetchVendors: async (params = {}) => {
    try {
      console.log('📋 Fetching vendors...');
      const response = await api.get('/vendors', { params });
      console.log('✅ Vendors fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching vendors:', error);
      throw error;
    }
  },

  /**
   * Fetch all end customers
   */
  fetchEndCustomers: async (params = {}) => {
    try {
      console.log('📋 Fetching end customers...');
      const response = await api.get('/end-customers', params);
      console.log('✅ End customers fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching end customers:', error);
      throw error;
    }
  },

  /**
   * Fetch all parties (customers, vendors, and end customers combined)
   */
  fetchAllParties: async () => {
    try {
      console.log('📋 Fetching all parties (customers, vendors, end customers)...');
      
      // Fetch all three types in parallel
      const [customersRes, vendorsRes, endCustomersRes] = await Promise.allSettled([
        api.get('/customers', { params: { limit: 1000 } }),
        api.get('/vendors', { params: { limit: 1000 } }),
        api.get('/end-customers')
      ]);

      let allParties = [];

      // Process customers
      if (customersRes.status === 'fulfilled' && customersRes.value?.data) {
        const customers = customersRes.value.data.data || customersRes.value.data;
        const formattedCustomers = (Array.isArray(customers) ? customers : []).map(customer => ({
          id: customer._id || customer.id,
          name: customer.name,
          phone: customer.phone,
          phoneNumbers: customer.phoneNumbers || [{ number: customer.phone, label: 'Primary' }],
          email: customer.email || '',
          address: customer.address || '',
          company: customer.company || '',
          shopName: customer.shopName || '',
          shopOwner: customer.shopOwner || '',
          partyType: 'customer',
          source: 'customer',
          status: customer.status || customer.isActive ? 'active' : 'inactive',
          priority: customer.priority || 'medium',
          notes: customer.notes || '',
          tags: customer.tags || [],
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          ...customer
        }));
        allParties = [...allParties, ...formattedCustomers];
        console.log('✅ Customers processed:', formattedCustomers.length);
      }

      // Process vendors
      if (vendorsRes.status === 'fulfilled' && vendorsRes.value?.data) {
        const vendors = vendorsRes.value.data.data || vendorsRes.value.data;
        const formattedVendors = (Array.isArray(vendors) ? vendors : []).map(vendor => ({
          id: vendor._id || vendor.id,
          name: vendor.name,
          phone: vendor.phone,
          phoneNumbers: vendor.phoneNumbers || [{ number: vendor.phone, label: 'Primary' }],
          email: vendor.email || '',
          address: vendor.address || '',
          company: vendor.company || '',
          shopName: vendor.shopName || '',
          shopOwner: vendor.shopOwner || '',
          partyType: 'vendor',
          source: 'vendor',
          status: vendor.status || vendor.isActive ? 'active' : 'inactive',
          priority: vendor.priority || 'medium',
          notes: vendor.notes || '',
          tags: vendor.tags || [],
          gstin: vendor.gstin || '',
          vendorType: vendor.vendorType || '',
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
          ...vendor
        }));
        allParties = [...allParties, ...formattedVendors];
        console.log('✅ Vendors processed:', formattedVendors.length);
      }

      // Process end customers
      if (endCustomersRes.status === 'fulfilled' && endCustomersRes.value?.data) {
        const endCustomers = Array.isArray(endCustomersRes.value.data) 
          ? endCustomersRes.value.data 
          : endCustomersRes.value.data.data || [];
        const formattedEndCustomers = endCustomers.map(endCustomer => ({
          id: endCustomer._id || endCustomer.id,
          name: endCustomer.name,
          phone: endCustomer.phone || endCustomer.mobile,
          phoneNumbers: endCustomer.phoneNumbers || [{ number: endCustomer.phone || endCustomer.mobile, label: 'Primary' }],
          email: endCustomer.email || '',
          address: endCustomer.address || '',
          company: endCustomer.company || '',
          shopName: endCustomer.shopName || '',
          shopOwner: endCustomer.shopOwner || '',
          partyType: 'endCustomer',
          source: 'endCustomer',
          status: endCustomer.status || endCustomer.isActive ? 'active' : 'inactive',
          priority: endCustomer.priority || 'medium',
          notes: endCustomer.notes || '',
          tags: endCustomer.tags || [],
          createdAt: endCustomer.createdAt,
          updatedAt: endCustomer.updatedAt,
          ...endCustomer
        }));
        allParties = [...allParties, ...formattedEndCustomers];
        console.log('✅ End customers processed:', formattedEndCustomers.length);
      }

      console.log('✅ Total parties fetched:', allParties.length);
      
      return {
        success: true,
        data: allParties,
        total: allParties.length,
        breakdown: {
          customers: allParties.filter(p => p.source === 'customer').length,
          vendors: allParties.filter(p => p.source === 'vendor').length,
          endCustomers: allParties.filter(p => p.source === 'endCustomer').length
        }
      };
    } catch (error) {
      console.error('❌ Error fetching all parties:', error);
      throw error;
    }
  },

  /**
   * Search across all party types
   */
  searchAllParties: async (searchQuery) => {
    try {
      console.log('🔍 Searching all parties for:', searchQuery);
      
      const allPartiesData = await allPartiesService.fetchAllParties();
      
      if (!searchQuery || searchQuery.trim() === '') {
        return allPartiesData;
      }

      const query = searchQuery.toLowerCase().trim();
      const filteredParties = allPartiesData.data.filter(party => {
        return (
          party.name?.toLowerCase().includes(query) ||
          party.phone?.toLowerCase().includes(query) ||
          party.email?.toLowerCase().includes(query) ||
          party.company?.toLowerCase().includes(query) ||
          party.shopName?.toLowerCase().includes(query) ||
          party.shopOwner?.toLowerCase().includes(query)
        );
      });

      return {
        success: true,
        data: filteredParties,
        total: filteredParties.length
      };
    } catch (error) {
      console.error('❌ Error searching parties:', error);
      throw error;
    }
  }
};

export default allPartiesService;
