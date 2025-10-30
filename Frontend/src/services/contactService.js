import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const contactAPI = axios.create({
  baseURL: `${API_BASE_URL}/contacts`,
  timeout: 60000, // 60 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
contactAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Attach selected company id (if any) so backend can resolve req.user.currentCompany/companyId
    try {
      const rawCompany = localStorage.getItem('selectedCompany') || sessionStorage.getItem('selectedCompany');
      if (rawCompany) {
        let companyId = rawCompany;
        try {
          const parsed = JSON.parse(rawCompany);
          companyId = parsed?.id || parsed?._id || parsed || rawCompany;
        } catch (e) {
          companyId = rawCompany;
        }

        if (companyId) {
          config.headers['x-company-id'] = companyId;
        }
      }
    } catch (e) {
      // ignore header attach errors
    }
    
    // 🔍 DEBUG: Log request details
    console.log('🔍 Contact API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: {
        hasAuth: !!config.headers.Authorization,
        hasCompanyId: !!config.headers['x-company-id'],
        companyId: config.headers['x-company-id'],
        authPreview: config.headers.Authorization ? `${config.headers.Authorization.substring(0, 20)}...` : 'MISSING'
      },
      localStorage: {
        hasToken: !!localStorage.getItem('token'),
        hasCompany: !!localStorage.getItem('selectedCompany'),
        companyValue: localStorage.getItem('selectedCompany')
      }
    });
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
contactAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// =============================================================================
// CONTACT API SERVICES
// =============================================================================

export const contactService = {
  /**
   * Create a new contact
   */
  createContact: async (contactData) => {
    try {
      console.log('📝 Creating contact:', contactData);
      const response = await contactAPI.post('', contactData);  // ✅ FIXED: Remove trailing slash
      console.log('✅ Contact created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating contact:', error);
      throw error;
    }
  },

  /**
   * Get all contacts for company, grouped by user
   */
  getContactsByCompany: async (params = {}) => {
    try {
      console.log('📋 Fetching contacts by company with params:', params);
      console.log('🔗 API URL:', contactAPI.defaults.baseURL);
      console.log('🔑 Auth token exists:', !!localStorage.getItem('token'));
      
      const response = await contactAPI.get('', { params });  // ✅ FIXED: Remove trailing slash
      console.log('✅ Contacts fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
      console.error('❌ Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url,
        method: error.config?.method
      });
      throw error;
    }
  },

  /**
   * Get contacts added by specific user
   */
  getContactsByUser: async (userId = null, params = {}) => {
    try {
      const url = userId ? `/user/${userId}` : '/user';
      console.log('👤 Fetching contacts by user:', url, params);
      const response = await contactAPI.get(url, { params });
      console.log('✅ User contacts fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching user contacts:', error);
      throw error;
    }
  },

  /**
   * Get single contact by ID
   */
  getContactById: async (contactId) => {
    try {
      console.log('🔍 Fetching contact by ID:', contactId);
      const response = await contactAPI.get(`/${contactId}`);
      console.log('✅ Contact fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching contact:', error);
      throw error;
    }
  },

  /**
   * Update contact
   */
  updateContact: async (contactId, updateData) => {
    try {
      console.log('✏️ Updating contact:', contactId, updateData);
      const response = await contactAPI.put(`/${contactId}`, updateData);
      console.log('✅ Contact updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating contact:', error);
      throw error;
    }
  },

  /**
   * Delete contact (soft delete)
   */
  deleteContact: async (contactId) => {
    try {
      console.log('🗑️ Deleting contact:', contactId);
      const response = await contactAPI.delete(`/${contactId}`);
      console.log('✅ Contact deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting contact:', error);
      throw error;
    }
  },

  /**
   * Bulk delete contacts
   */
  bulkDeleteContacts: async (contactIds) => {
    try {
      console.log('🗑️ Bulk deleting contacts:', contactIds);
      const response = await contactAPI.post('/bulk-delete', { contactIds });
      console.log('✅ Contacts deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error bulk deleting contacts:', error);
      throw error;
    }
  },

  /**
   * Search contacts
   */
  searchContacts: async (searchQuery, params = {}) => {
    try {
      console.log('🔍 Searching contacts:', searchQuery, params);
      const response = await contactAPI.get('/search', { 
        params: { q: searchQuery, ...params } 
      });
      console.log('✅ Contact search completed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error searching contacts:', error);
      throw error;
    }
  },

  /**
   * Get contact statistics
   */
  getContactStatistics: async () => {
    try {
      console.log('📊 Fetching contact statistics');
      console.log('🔗 Statistics API URL:', contactAPI.defaults.baseURL + '/statistics');
      
      const response = await contactAPI.get('/statistics');
      console.log('✅ Contact statistics fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching contact statistics:', error);
      console.error('❌ Statistics error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
      throw error;
    }
  },

  /**
   * Check if contact exists (by phone or email)
   */
  checkContactExists: async (phone, email = null) => {
    try {
      console.log('🔍 Checking if contact exists:', { phone, email });
      // We'll use the search functionality to check existence
      const response = await contactAPI.get('/search', { 
        params: { q: phone, limit: 1 } 
      });
      
      const contacts = response.data?.data?.contacts || [];
      const existingContact = contacts.find(contact => 
        contact.phone === phone || (email && contact.email === email)
      );
      
      return {
        exists: !!existingContact,
        contact: existingContact
      };
    } catch (error) {
      console.error('❌ Error checking contact existence:', error);
      return { exists: false, contact: null };
    }
  }
};

// Helper functions for contact management
export const contactHelpers = {
  /**
   * Format phone number for display
   */
  formatPhoneNumber: (phone) => {
    if (!phone) return '';
    // Simple formatting - can be enhanced based on requirements
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  },

  /**
   * Validate contact data
   */
  validateContact: (contactData) => {
    const errors = {};

    if (!contactData.name || contactData.name.trim() === '') {
      errors.name = 'Name is required';
    }

    if (!contactData.phone || contactData.phone.trim() === '') {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]{10,}$/.test(contactData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (contactData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Get contact display name
   */
  getDisplayName: (contact) => {
    if (!contact) return 'Unknown Contact';
    return contact.name || contact.shopName || contact.company || 'Unnamed Contact';
  },

  /**
   * Get contact avatar initials
   */
  getContactInitials: (contact) => {
    const name = contactHelpers.getDisplayName(contact);
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },

  /**
   * Get contact type badge color
   */
  getPartyTypeColor: (partyType) => {
    const colors = {
      customer: 'bg-blue-100 text-blue-800',
      supplier: 'bg-green-100 text-green-800',
      vendor: 'bg-purple-100 text-purple-800',
      partner: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[partyType] || colors.other;
  },

  /**
   * Get priority badge color
   */
  getPriorityColor: (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  },

  /**
   * Get status badge color
   */
  getStatusColor: (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      blocked: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || colors.active;
  },

  /**
   * Sort contacts by various criteria
   */
  sortContacts: (contacts, sortBy = 'name', sortOrder = 'asc') => {
    return [...contacts].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle special cases
      if (sortBy === 'name') {
        aValue = contactHelpers.getDisplayName(a).toLowerCase();
        bValue = contactHelpers.getDisplayName(b).toLowerCase();
      } else if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
  },

  /**
   * Filter contacts by various criteria
   */
  filterContacts: (contacts, filters = {}) => {
    return contacts.filter(contact => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchFields = [
          contact.name,
          contact.phone,
          contact.email,
          contact.company,
          contact.shopName,
          contact.shopOwner
        ].filter(Boolean);
        
        const matchesSearch = searchFields.some(field => 
          field.toLowerCase().includes(searchLower)
        );
        
        if (!matchesSearch) return false;
      }

      // Party type filter
      if (filters.partyType && contact.partyType !== filters.partyType) {
        return false;
      }

      // Status filter
      if (filters.status && contact.status !== filters.status) {
        return false;
      }

      // Priority filter
      if (filters.priority && contact.priority !== filters.priority) {
        return false;
      }

      // Added by filter
      if (filters.addedBy && contact.addedBy !== filters.addedBy) {
        return false;
      }

      return true;
    });
  }
};

export default contactService;