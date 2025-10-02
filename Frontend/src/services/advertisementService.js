import axios from 'axios';
import apiConfig from '../config/api';

// Create API instance
const api = axios.create({
  baseURL: `${apiConfig.baseURL}/api`,
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

class AdvertisementService {
  // Get ads by section
  async getAdsBySection(section, options = {}) {
    try {
      const params = new URLSearchParams(options);
      const url = `/advertisements/section/${section}${params.toString() ? `?${params}` : ''}`;
      console.log('Making request to:', `${api.defaults.baseURL}${url}`);
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching ads by section:', error);
      console.error('Request URL:', error.config?.url);
      console.error('Request method:', error.config?.method);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      throw error;
    }
  }

  // Get all active ads
  async getActiveAds() {
    try {
      const response = await api.get('/advertisements?isActive=true');
      return response.data;
    } catch (error) {
      console.error('Error fetching active ads:', error);
      throw error;
    }
  }

  // Get ad by ID
  async getAdById(id) {
    try {
      const response = await api.get(`/advertisements/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ad by ID:', error);
      throw error;
    }
  }

  // Create new ad
  async createAd(adData) {
    try {
      const response = await api.post('/advertisements', adData);
      return response.data;
    } catch (error) {
      console.error('Error creating ad:', error);
      throw error;
    }
  }

  // Upload ad media
  async uploadAdMedia(file, adId = null) {
    try {
      const formData = new FormData();
      formData.append('media', file);
      if (adId) formData.append('adId', adId);

      const response = await api.post('/advertisements/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading ad media:', error);
      throw error;
    }
  }

  // Update ad
  async updateAd(id, adData) {
    try {
      const response = await api.put(`/advertisements/${id}`, adData);
      return response.data;
    } catch (error) {
      console.error('Error updating ad:', error);
      throw error;
    }
  }

  // Delete ad
  async deleteAd(id) {
    try {
      const response = await api.delete(`/advertisements/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting ad:', error);
      throw error;
    }
  }

  // Track ad impression
  async trackImpression(adId) {
    try {
      const response = await api.post(`/advertisements/${adId}/impression`);
      return response.data;
    } catch (error) {
      console.error('Error tracking impression:', error);
      // Don't throw error for impressions as it's not critical
    }
  }

  // Track ad click
  async trackClick(adId) {
    try {
      const response = await api.post(`/advertisements/${adId}/click`);
      return response.data;
    } catch (error) {
      console.error('Error tracking click:', error);
      // Don't throw error for clicks as it's not critical
    }
  }

  // Get user's ads
  async getUserAds() {
    try {
      const response = await api.get('/advertisements/user');
      return response.data;
    } catch (error) {
      console.error('Error fetching user ads:', error);
      throw error;
    }
  }

  // Get ad analytics
  async getAdAnalytics(adId, period = '7d') {
    try {
      const response = await api.get(`/advertisements/${adId}/analytics?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ad analytics:', error);
      throw error;
    }
  }

  // Validate ad data
  validateAdData(adData) {
    const errors = [];

    if (!adData.title || adData.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!adData.section || !['banner', 'sidebar', 'whatsapp'].includes(adData.section)) {
      errors.push('Valid section is required (banner, sidebar, or whatsapp)');
    }

    if (!adData.mediaType || !['image', 'video', 'text'].includes(adData.mediaType)) {
      errors.push('Valid media type is required (image, video, or text)');
    }

    if (adData.mediaType !== 'text' && !adData.mediaUrl) {
      errors.push('Media URL is required for image and video ads');
    }

    if (adData.priority && (adData.priority < 1 || adData.priority > 10)) {
      errors.push('Priority must be between 1 and 10');
    }

    return errors;
  }

  // Format ad data for display
  formatAdForDisplay(ad) {
    return {
      ...ad,
      title: ad.title || '',
      description: ad.description || '',
      mediaUrl: ad.mediaUrl || '',
      ctaText: ad.ctaText || 'Learn More',
      ctaUrl: ad.ctaUrl || '#',
      priority: ad.priority || 5,
      isActive: ad.isActive !== false,
    };
  }

  // Get section-specific ad limits
  getSectionLimits() {
    return {
      banner: { maxAds: 10, maxFileSize: 10 * 1024 * 1024 }, // 10MB
      sidebar: { maxAds: 5, maxFileSize: 5 * 1024 * 1024 }, // 5MB
      whatsapp: { maxAds: 8, maxFileSize: 3 * 1024 * 1024 }, // 3MB
    };
  }

  // Validate file for upload
  validateFile(file, section) {
    const limits = this.getSectionLimits()[section];
    const errors = [];

    if (!file) {
      errors.push('File is required');
      return errors;
    }

    if (file.size > limits.maxFileSize) {
      errors.push(`File size must be less than ${limits.maxFileSize / (1024 * 1024)}MB`);
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const validTypes = [...validImageTypes, ...validVideoTypes];

    if (!validTypes.includes(file.type)) {
      errors.push('File must be an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, OGG)');
    }

    return errors;
  }
}

export default new AdvertisementService();