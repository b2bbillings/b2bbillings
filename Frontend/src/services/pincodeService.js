// ================================
// PINCODE API SERVICE
// ================================

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

class PincodeService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: `${API_BASE}/api/pincode`,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for debugging
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log('🌍 Pincode API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          timeout: config.timeout,
        });
        return config;
      },
      (error) => {
        console.error('❌ Pincode API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => {
        console.log('✅ Pincode API Response:', {
          status: response.status,
          url: response.config.url,
          responseTime: response.config.metadata?.responseTime,
          dataLength: JSON.stringify(response.data).length,
        });
        return response;
      },
      (error) => {
        console.error('❌ Pincode API Error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
          code: error.response?.data?.code,
        });
        
        // Transform error for better UX
        const transformedError = this.transformError(error);
        return Promise.reject(transformedError);
      }
    );
  }

  /**
   * Transform API errors into user-friendly messages
   */
  transformError(error) {
    if (!error.response) {
      return {
        message: 'Network error. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        type: 'network'
      };
    }

    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          message: data.message || 'Invalid pincode format. Please enter a valid 6-digit pincode.',
          code: data.code || 'INVALID_INPUT',
          type: 'validation'
        };
      case 404:
        return {
          message: data.message || 'Location not found for this pincode.',
          code: data.code || 'NOT_FOUND',
          type: 'not_found'
        };
      case 429:
        return {
          message: 'Too many requests. Please try again in a moment.',
          code: 'RATE_LIMIT',
          type: 'rate_limit'
        };
      case 500:
        return {
          message: 'Server error. Please try again later.',
          code: data.code || 'SERVER_ERROR',
          type: 'server'
        };
      default:
        return {
          message: data.message || 'An unexpected error occurred.',
          code: data.code || 'UNKNOWN_ERROR',
          type: 'unknown'
        };
    }
  }

  /**
   * Get location details by pincode
   * @param {string} pincode - 6-digit Indian pincode
   * @returns {Promise<Object>} Location details
   */
  async getLocationByPincode(pincode) {
    try {
      // Validate pincode format on frontend
      if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) {
        throw {
          response: {
            status: 400,
            data: {
              message: 'Please enter a valid 6-digit pincode',
              code: 'INVALID_PINCODE_FORMAT'
            }
          }
        };
      }

      const response = await this.apiClient.get(`/${pincode}`);
      
      if (response.data.success && response.data.data) {
        const location = response.data.data;
        
        return {
          success: true,
          data: {
            pincode: location.pincode,
            village: location.village || '',
            taluka: location.taluka || '',
            district: location.district || '',
            state: location.state || '',
            country: location.country || 'India',
            latitude: location.latitude || null,
            longitude: location.longitude || null,
            source: location.source || 'unknown'
          },
          metadata: response.data.metadata
        };
      } else {
        throw {
          response: {
            status: 404,
            data: {
              message: 'Location details not found',
              code: 'LOCATION_NOT_FOUND'
            }
          }
        };
      }
    } catch (error) {
      console.error('❌ Get location by pincode failed:', error);
      throw this.transformError(error);
    }
  }

  /**
   * Search pincodes by location name
   * @param {string} location - City/village name to search
   * @returns {Promise<Array>} Array of matching locations
   */
  async searchLocationsByName(location) {
    try {
      if (!location || location.trim().length < 2) {
        throw {
          response: {
            status: 400,
            data: {
              message: 'Location name must be at least 2 characters long',
              code: 'INVALID_LOCATION_NAME'
            }
          }
        };
      }

      const cleanLocation = location.trim();
      const response = await this.apiClient.get(`/search/${encodeURIComponent(cleanLocation)}`);
      
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data.results || [],
          searchTerm: response.data.data.searchTerm,
          count: response.data.data.count || 0,
          metadata: response.data.metadata
        };
      } else {
        return {
          success: true,
          data: [],
          searchTerm: cleanLocation,
          count: 0,
          message: 'No locations found'
        };
      }
    } catch (error) {
      console.error('❌ Search locations by name failed:', error);
      throw this.transformError(error);
    }
  }

  /**
   * Validate pincode format
   * @param {string} pincode - Pincode to validate
   * @returns {Object} Validation result
   */
  validatePincode(pincode) {
    const validation = {
      isValid: false,
      errors: []
    };

    if (!pincode) {
      validation.errors.push('Pincode is required');
      return validation;
    }

    const cleanPincode = pincode.toString().trim();

    if (cleanPincode.length !== 6) {
      validation.errors.push('Pincode must be exactly 6 digits');
    }

    if (!/^[0-9]+$/.test(cleanPincode)) {
      validation.errors.push('Pincode must contain only numbers');
    }

    if (/^0/.test(cleanPincode)) {
      validation.errors.push('Pincode cannot start with 0');
    }

    if (!/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      validation.errors.push('Invalid Indian pincode format');
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  }

  /**
   * Get suggestions for incomplete pincode
   * @param {string} partialPincode - Partial pincode (1-5 digits)
   * @returns {Array} Array of pincode suggestions
   */
  getPincodeSuggestions(partialPincode) {
    // This would ideally come from a comprehensive pincode database
    // For now, return some common pincode prefixes
    const commonPrefixes = {
      '1': ['110001', '110002', '110003'], // Delhi
      '2': ['200001', '200002', '200003'], // Mumbai
      '3': ['302001', '302002', '302003'], // Jaipur
      '4': ['400001', '400002', '400003'], // Mumbai
      '5': ['500001', '500002', '500003'], // Hyderabad
      '6': ['600001', '600002', '600003'], // Chennai
      '7': ['700001', '700002', '700003'], // Kolkata
      '8': ['800001', '800002', '800003'], // Patna
      '9': ['900001', '900002', '900003'], // Various
    };

    if (!partialPincode || partialPincode.length === 0) {
      return [];
    }

    const firstDigit = partialPincode[0];
    const suggestions = commonPrefixes[firstDigit] || [];
    
    return suggestions
      .filter(pincode => pincode.startsWith(partialPincode))
      .slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Auto-fill address fields from pincode
   * @param {string} pincode - 6-digit pincode
   * @param {Object} addressForm - Address form object to update
   * @returns {Promise<Object>} Updated address form
   */
  async autoFillAddress(pincode, addressForm = {}) {
    try {
      const result = await this.getLocationByPincode(pincode);
      
      if (result.success && result.data) {
        const location = result.data;
        
        return {
          ...addressForm,
          pincode: location.pincode,
          village: location.village,
          taluka: location.taluka,
          district: location.district,
          state: location.state,
          country: location.country || 'India',
          // Preserve existing fields that aren't auto-filled
          shopAddress: addressForm.shopAddress || '',
          ownerName: addressForm.ownerName || '',
          shopName: addressForm.shopName || '',
          businessPhone: addressForm.businessPhone || '',
          businessEmail: addressForm.businessEmail || '',
          website: addressForm.website || '',
        };
      }
      
      return addressForm;
    } catch (error) {
      console.error('❌ Auto-fill address failed:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const pincodeService = new PincodeService();
export default pincodeService;