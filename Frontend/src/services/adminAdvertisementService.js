import axios from 'axios';
import apiConfig from '../config/api';

// Create API instance
const api = axios.create({
  baseURL: `${apiConfig.baseURL}/api/admin/advertisements`,
  timeout: apiConfig.timeout || 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const companyId = localStorage.getItem('currentCompanyId');
    if (companyId) {
      config.headers['x-company-id'] = companyId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
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

class AdminAdvertisementService {
  // Get pending advertisements for review
  async getPendingAdvertisements(params = {}) {
    try {
      const response = await api.get('/pending', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching pending advertisements:', error);
      throw error;
    }
  }

  // Get all advertisements with optional status filtering
  async getAllAdvertisements(params = {}) {
    try {
      console.log('📡 AdminAdvertisementService: getAllAdvertisements with params:', params);
      const response = await api.get('/', { params });
      console.log('✅ AdminAdvertisementService: getAllAdvertisements response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ AdminAdvertisementService: Error fetching all advertisements:', error);
      
      // If admin service fails, try to use regular advertisement service as fallback
      // This ensures we can still see ads even if admin permissions aren't working
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔄 Admin access denied, trying regular advertisement service...');
        try {
          // Import regular advertisement service
          const regularApi = axios.create({
            baseURL: `${apiConfig.baseURL}/api/advertisements`,
            timeout: apiConfig.timeout || 30000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            withCredentials: true,
          });
          
          // Add auth token
          const token = localStorage.getItem('token');
          if (token) {
            regularApi.defaults.headers.Authorization = `Bearer ${token}`;
          }
          
          // Try to get user's own ads as fallback
          const fallbackResponse = await regularApi.get('/user');
          console.log('✅ Fallback: Got user ads:', fallbackResponse.data);
          
          // Filter based on status if provided
          if (params.status) {
            const filteredData = fallbackResponse.data.data?.filter(ad => {
              switch (params.status) {
                case 'pending':
                  return !ad.isApproved && !ad.isRejected && !ad.hasChangeRequests;
                case 'approved':
                  return ad.isApproved;
                case 'rejected':
                  return ad.isRejected;
                case 'changes':
                  return ad.hasChangeRequests;
                default:
                  return true;
              }
            }) || [];
            
            return {
              success: true,
              data: filteredData,
              total: filteredData.length,
              message: 'Using fallback data (your ads only)'
            };
          }
          
          return fallbackResponse.data;
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          throw error; // Throw original admin error
        }
      }
      
      throw error;
    }
  }

  // Get advertisement details for review
  async getAdvertisementById(id) {
    try {
      const response = await api.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching advertisement:', error);
      throw error;
    }
  }

  // Approve advertisement
  async approveAdvertisement(id, data = {}) {
    try {
      const response = await api.put(`/${id}/approve`, data);
      return response.data;
    } catch (error) {
      console.error('Error approving advertisement:', error);
      throw error;
    }
  }

  // Reject advertisement
  async rejectAdvertisement(id, data) {
    try {
      const response = await api.put(`/${id}/reject`, data);
      return response.data;
    } catch (error) {
      console.error('Error rejecting advertisement:', error);
      throw error;
    }
  }

  // Request changes
  async requestChanges(id, data) {
    try {
      const response = await api.put(`/${id}/request-changes`, data);
      return response.data;
    } catch (error) {
      console.error('Error requesting changes:', error);
      throw error;
    }
  }

  // Get advertisement history
  async getAdvertisementHistory(id) {
    try {
      const response = await api.get(`/${id}/history`);
      return response.data;
    } catch (error) {
      console.error('Error fetching advertisement history:', error);
      throw error;
    }
  }

  // Get advertisement statistics
  async getStats() {
    try {
      const response = await api.get('/stats/overview');
      return response.data;
    } catch (error) {
      console.error('Error fetching advertisement statistics:', error);
      throw error;
    }
  }

  // Bulk approve advertisements
  async bulkApprove(advertisementIds, comments) {
    try {
      const response = await api.put('/bulk/approve', {
        advertisementIds,
        comments
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk approving advertisements:', error);
      throw error;
    }
  }

  // Bulk reject advertisements
  async bulkReject(advertisementIds, reason, comments) {
    try {
      const response = await api.put('/bulk/reject', {
        advertisementIds,
        reason,
        comments
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk rejecting advertisements:', error);
      throw error;
    }
  }

  // Delete advertisement (hard delete from database)
  async deleteAdvertisement(id) {
    try {
      console.log('🗑️ Deleting advertisement:', id);
      const response = await api.delete(`/${id}`);
      console.log('✅ Advertisement deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting advertisement:', error);
      throw error;
    }
  }
}

export default new AdminAdvertisementService();