import axios from 'axios';
import authService from './authService';
import apiConfig from '../config/api';

// ================================
// 👤 PROFILE SERVICE
// ================================

class ProfileService {
  constructor() {
    this.baseURL = `${apiConfig.baseURL}/api/profile`;
    
    // Create axios instance for profile API calls
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response, // Keep full response object
      (error) => {
        console.error('Profile API Error:', error);
        
        // Handle specific error cases
        if (error.response?.status === 401) {
          // Token expired or invalid - logout user
          authService.logout();
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Get current user ID
  getCurrentUserId() {
    const user = authService.getCurrentUser();
    console.log('Current user from auth service:', user);
    return user?._id || user?.id;
  }

  // ================================
  // 📋 PROFILE MANAGEMENT
  // ================================

  /**
   * Get user profile
   */
  async getUserProfile() {
    try {
      console.log('Fetching current user profile...');
      console.log('API Base URL:', this.baseURL);
      
      const response = await this.api.get('/');
      console.log('Profile fetch response:', response);
      
      // Handle the response structure from the backend
      const responseData = response.data;
      
      if (responseData.success) {
        return {
          success: true,
          profile: responseData.data, // The flat profile structure
          data: responseData.data,
          user: responseData.user,
          nestedProfile: responseData.profile, // The nested profile structure
          companies: responseData.companies,
          summary: responseData.summary,
        };
      } else {
        return {
          success: false,
          error: responseData.message || 'Failed to fetch profile',
        };
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      
      // Check if it's a network/server error
      if (error.code === 'ERR_NETWORK' || error.response?.status === 503) {
        return {
          success: false,
          error: 'Profile service is temporarily unavailable. Please check if the backend server is running.',
          isServerError: true,
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch user profile',
        status: error.response?.status,
      };
    }
  }

  // Alias method for compatibility
  async getProfile() {
    return this.getUserProfile();
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      console.log('Updating current user profile (raw):', profileData);

      // Sanitize: remove empty string / null values so backend optional validators ignore them
      const sanitize = (obj) => {
        if (obj == null) return obj;
        if (Array.isArray(obj)) return obj.map(sanitize);
        if (typeof obj === 'object') {
          const cleaned = {};
            Object.entries(obj).forEach(([k, v]) => {
              if (v === '' || v === null || v === undefined) return; // drop empty
              if (typeof v === 'object') {
                const nested = sanitize(v);
                if (nested && (typeof nested !== 'object' || Object.keys(nested).length > 0)) {
                  cleaned[k] = nested;
                }
              } else {
                cleaned[k] = v;
              }
            });
          return cleaned;
        }
        return obj;
      };

      const cleanedPayload = sanitize(profileData);
      console.log('Updating current user profile (sanitized):', cleanedPayload);

      const response = await this.api.put('/', cleanedPayload);
      console.log('Profile update response:', response);
      
      // Handle the response structure from the backend
      const responseData = response.data;
      
      if (responseData.success) {
        // Update local user data
        if (responseData.data) {
          authService.updateCurrentUser(responseData.data);
        }
        
        return {
          success: true,
          profile: responseData.data, // The flat profile structure
          data: responseData.data,
          user: responseData.user,
          nestedProfile: responseData.profile, // The nested profile structure
          summary: responseData.summary,
          message: responseData.message || 'Profile updated successfully',
        };
      } else {
        return {
          success: false,
          error: responseData.message || 'Failed to update profile',
          errors: responseData.errors || [],
        };
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.response) {
        console.error('Server responded with:', {
          status: error.response.status,
            data: error.response.data,
          headers: error.response.headers,
        });
      }
      // Extract validation errors into key:messages map for easier UI consumption
      const validationMap = {};
      if (error.response?.data?.errors) {
        if (Array.isArray(error.response.data.errors)) {
          error.response.data.errors.forEach(e => {
            if (e.field) validationMap[e.field] = e.message || 'Invalid value';
          });
        } else if (typeof error.response.data.errors === 'object') {
          Object.entries(error.response.data.errors).forEach(([k, v]) => {
            validationMap[k] = v?.message || v;
          });
        }
      }
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to update profile',
        errors: error.response?.data?.errors || [],
        validationMap,
        status: error.response?.status,
      };
    }
  }

  /**
   * Update user avatar
   */
  async updateAvatar(avatarFile) {
    try {
      const formData = new FormData();
      formData.append('profileImage', avatarFile);

      const response = await this.api.post('/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: {
          avatarUrl: response.data?.data?.profileImageUrl || response.data?.data?.avatarUrl,
        },
        message: response.data?.message || 'Avatar updated successfully',
      };
    } catch (error) {
      console.error('Error updating avatar:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update avatar',
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(passwordData) {
    try {
      console.log('Changing password for current user...');
      
      const response = await this.api.put('/change-password', passwordData);
      console.log('Password change response:', response);
      
      return {
        success: true,
        message: response.message || 'Password changed successfully',
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to change password',
        errors: error.response?.data?.errors || [],
      };
    }
  }

  // ================================
  // 💬 CHAT PROFILE MANAGEMENT
  // ================================

  /**
   * Update chat settings
   */
  async updateChatSettings(settings) {
    try {
      const response = await this.api.put('/chat-settings', { settings });
      return {
        success: true,
        chatProfile: response.data,
        message: response.message || 'Chat settings updated successfully',
      };
    } catch (error) {
      console.error('Error updating chat settings:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update chat settings',
      };
    }
  }

  /**
   * Get chat status
   */
  async getChatStatus() {
    try {
      const response = await this.api.get('/chat-status');
      return {
        success: true,
        chatProfile: response.data?.chatProfile,
        user: response.data,
      };
    } catch (error) {
      console.error('Error fetching chat status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch chat status',
      };
    }
  }

  /**
   * Update online status
   */
  async updateOnlineStatus(isOnline, status) {
    try {
      const response = await this.api.put('/online-status', {
        isOnline,
        status,
      });
      return {
        success: true,
        chatProfile: response.data,
        message: response.message || 'Online status updated successfully',
      };
    } catch (error) {
      console.error('Error updating online status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update online status',
      };
    }
  }

  // ================================
  // 🏢 COMPANY MANAGEMENT
  // ================================

  /**
   * Get user companies
   */
  async getUserCompanies() {
    try {
      const response = await this.api.get('/companies');
      return {
        success: true,
        companies: response.data || [],
        count: response.count || 0,
      };
    } catch (error) {
      console.error('Error fetching user companies:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch companies',
        companies: [],
      };
    }
  }

  // ================================
  // 🚫 BLOCKING MANAGEMENT
  // ================================

  /**
   * Block a user
   */
  async blockUser(targetUserId) {
    try {
      const response = await this.api.post(`/block/${targetUserId}`, {
        action: 'block',
      });
      return {
        success: true,
        message: response.message || 'User blocked successfully',
      };
    } catch (error) {
      console.error('Error blocking user:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to block user',
      };
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(targetUserId) {
    try {
      const response = await this.api.post(`/block/${targetUserId}`, {
        action: 'unblock',
      });
      return {
        success: true,
        message: response.message || 'User unblocked successfully',
      };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to unblock user',
      };
    }
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers() {
    try {
      const response = await this.api.get('/blocked-users');
      return {
        success: true,
        blockedUsers: response.data || [],
        count: response.count || 0,
      };
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch blocked users',
        blockedUsers: [],
      };
    }
  }

  // ================================
  // 🔧 UTILITY METHODS
  // ================================

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      criteria: {
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar,
      },
    };
  }

  /**
   * Validate phone number
   */
  validatePhone(phone) {
    // Basic phone validation - can be enhanced based on requirements
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format user status for display
   */
  formatUserStatus(status) {
    const statusMap = {
      available: { color: 'success', text: 'Available', icon: '🟢' },
      busy: { color: 'danger', text: 'Busy', icon: '🔴' },
      away: { color: 'warning', text: 'Away', icon: '🟡' },
      invisible: { color: 'secondary', text: 'Invisible', icon: '⚫' },
    };
    return statusMap[status] || statusMap.available;
  }

  /**
   * Get initials from name
   */
  getInitials(name) {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  /**
   * Format last seen time
   */
  formatLastSeen(lastSeen) {
    if (!lastSeen) return 'Never';

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return lastSeenDate.toLocaleDateString();
  }

  /**
   * Get profile completion percentage
   */
  getProfileCompletion(profile) {
    if (!profile) return 0;

    const fields = [
      profile.name,
      profile.email,
      profile.phone,
      profile.avatar,
      profile.address,
      profile.chatProfile?.statusMessage,
    ];

    const completedFields = fields.filter(field => field && field.trim()).length;
    return Math.round((completedFields / fields.length) * 100);
  }

  /**
   * Generate avatar URL
   */
  getAvatarUrl(avatar, name) {
    if (avatar) {
      // If avatar starts with http/https, it's a complete URL
      if (avatar.startsWith('http')) {
        return avatar;
      }
      // If it starts with /, it's a relative path
      if (avatar.startsWith('/')) {
        return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${avatar}`;
      }
    }
    
    // Generate a placeholder avatar based on initials
    const initials = this.getInitials(name);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=007bff&color=ffffff&size=128`;
  }

  /**
   * Check if user is online (based on last seen)
   */
  isUserOnline(lastSeen, threshold = 5) {
    if (!lastSeen) return false;
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = (now - lastSeenDate) / 60000;
    
    return diffMinutes <= threshold;
  }
}

// Create and export a singleton instance
export const profileService = new ProfileService();
export default profileService;