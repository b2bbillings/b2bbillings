import axios from 'axios';
import apiConfig from '../config/api.js';

// Create axios instance using the centralized API config
const api = axios.create({
    baseURL: `${apiConfig.baseURL}/api`,
    timeout: apiConfig.timeout,
    headers: {
        'Content-Type': 'application/json'
    }
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

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('currentCompanyId');
            sessionStorage.removeItem('user');

            // Redirect to login if not already there
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

const authService = {
    // Login user
    login: async (credentials) => {
        try {
            // Basic validation
            if (!credentials.email || !credentials.password) {
                return {
                    success: false,
                    message: 'Email and password are required'
                };
            }

            const response = await api.post('/auth/login', credentials);

            if (response.data.success) {
                // Store user data and token after successful login
                const { token, user } = response.data.data;
                
                if (token) {
                    localStorage.setItem('token', token);
                }
                
                if (user) {
                    localStorage.setItem('user', JSON.stringify(user));
                    sessionStorage.setItem('user', JSON.stringify(user));
                }

                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (error) {
            // Handle specific error cases
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    message: 'Request timeout. Please check your connection and try again.'
                };
            }

            if (error.response?.data?.message) {
                return {
                    success: false,
                    message: error.response.data.message
                };
            }

            if (error.response?.status === 500) {
                return {
                    success: false,
                    message: 'Server error. Please try again later.'
                };
            }

            return {
                success: false,
                message: error.message || 'Login failed. Please try again.'
            };
        }
    },

    // Register new user
    signup: async (userData) => {
        try {
            // Basic validation
            if (!userData.name || !userData.email || !userData.password || !userData.phone) {
                return {
                    success: false,
                    message: 'All required fields must be filled'
                };
            }

            const response = await api.post('/auth/signup', userData);

            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Signup failed');
            }
        } catch (error) {
            // Handle specific error cases
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    message: 'Request timeout. Please check your connection and try again.'
                };
            }

            if (error.response?.data?.message) {
                return {
                    success: false,
                    message: error.response.data.message
                };
            }

            if (error.response?.status === 500) {
                return {
                    success: false,
                    message: 'Server error. Please try again later.'
                };
            }

            return {
                success: false,
                message: error.message || 'Signup failed. Please try again.'
            };
        }
    },

    // Logout user
    logout: async () => {
        try {
            // Call backend logout endpoint
            try {
                await api.post('/auth/logout');
            } catch (logoutError) {
                // Continue with local cleanup even if backend call fails
                console.warn('Backend logout call failed:', logoutError);
            }

            // Clear all auth data
            authService.clearAuthData();

            return { success: true };
        } catch (error) {
            // Even if API call fails, clear local storage
            authService.clearAuthData();
            return { success: true };
        }
    },

    // Clear authentication data
    clearAuthData: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentCompanyId');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
    },

    // ✅ ENHANCED: Verify token with backend and refresh user data
    verifyToken: async () => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                return { success: false, message: 'No token found' };
            }

            const response = await api.get('/auth/verify');

            if (response.data.success) {
                // Update stored user data with fresh data from server
                if (response.data.data?.user) {
                    const freshUserData = response.data.data.user;
                    localStorage.setItem('user', JSON.stringify(freshUserData));
                    sessionStorage.setItem('user', JSON.stringify(freshUserData));
                }

                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Token verification failed');
            }
        } catch (error) {
            // Clear invalid token
            authService.clearAuthData();

            return {
                success: false,
                message: error.response?.data?.message || 'Session expired. Please login again.'
            };
        }
    },

    // ✅ ENHANCED: Get current user from multiple sources
    getCurrentUser: () => {
        try {
            // Try localStorage first
            let userStr = localStorage.getItem('user');
            
            if (!userStr) {
                // Fall back to sessionStorage
                userStr = sessionStorage.getItem('user');
            }

            if (userStr) {
                const user = JSON.parse(userStr);
                // Validate user object has required properties
                if (user && (user.id || user._id || user.name)) {
                    return user;
                }
            }
            
            return null;
        } catch (error) {
            console.warn('Error parsing stored user data:', error);
            // Clear corrupted data
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            return null;
        }
    },

    // ✅ NEW: Get current user with enhanced fallback and validation
    getCurrentUserSafe: async () => {
        try {
            // First try to get from storage
            const storedUser = authService.getCurrentUser();
            if (storedUser) {
                return {
                    success: true,
                    user: storedUser,
                    source: 'storage'
                };
            }

            // If no stored user, try to verify token and get fresh data
            const verifyResult = await authService.verifyToken();
            if (verifyResult.success && verifyResult.data?.user) {
                return {
                    success: true,
                    user: verifyResult.data.user,
                    source: 'token_verification'
                };
            }

            return {
                success: false,
                message: 'No valid user found',
                user: null
            };
        } catch (error) {
            console.error('Error in getCurrentUserSafe:', error);
            return {
                success: false,
                message: error.message || 'Failed to get current user',
                user: null
            };
        }
    },

    // ✅ NEW: Refresh current user data from server
    refreshCurrentUser: async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return {
                    success: false,
                    message: 'No authentication token found'
                };
            }

            const response = await api.get('/auth/profile');
            
            if (response.data.success && response.data.data) {
                const userData = response.data.data;
                
                // Update stored user data
                localStorage.setItem('user', JSON.stringify(userData));
                sessionStorage.setItem('user', JSON.stringify(userData));
                
                return {
                    success: true,
                    user: userData
                };
            }

            return {
                success: false,
                message: response.data.message || 'Failed to refresh user data'
            };
        } catch (error) {
            console.error('Error refreshing user data:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to refresh user data'
            };
        }
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        const user = authService.getCurrentUser();
        return !!(token && user);
    },

    // ✅ ENHANCED: Get token from multiple sources
    getToken: () => {
        return localStorage.getItem('token') || 
               localStorage.getItem('authToken') || 
               sessionStorage.getItem('token');
    },

    // ✅ ENHANCED: Update user data in both storage types
    updateUserData: (userData) => {
        try {
            if (userData) {
                const userStr = JSON.stringify(userData);
                localStorage.setItem('user', userStr);
                sessionStorage.setItem('user', userStr);
                
                console.log('✅ User data updated in storage:', userData);
                return { success: true };
            }
            return { success: false, message: 'No user data provided' };
        } catch (error) {
            console.error('Error updating user data:', error);
            return { success: false, message: 'Failed to update user data' };
        }
    },

    // Check if user has specific role
    hasRole: (requiredRole) => {
        const user = authService.getCurrentUser();
        if (!user) return false;

        const userRole = user.role;

        // Admin has access to everything
        if (userRole === 'admin') return true;

        // Manager has access to user and manager features
        if (userRole === 'manager' && (requiredRole === 'user' || requiredRole === 'manager')) {
            return true;
        }

        // User only has access to user features
        if (userRole === 'user' && requiredRole === 'user') return true;

        return false;
    },

    // ✅ ENHANCED: Get user's display name with fallbacks
    getUserDisplayName: () => {
        const user = authService.getCurrentUser();
        if (!user) return 'Guest';
        
        return user.name || 
               user.displayName || 
               user.username || 
               user.email?.split('@')[0] || 
               'User';
    },

    // ✅ ENHANCED: Get user's ID with fallbacks
    getUserId: () => {
        const user = authService.getCurrentUser();
        if (!user) return null;
        
        return user.id || user._id || user.userId || null;
    },

    // ✅ ENHANCED: Get user's employee information
    getUserEmployeeInfo: () => {
        const user = authService.getCurrentUser();
        if (!user) return null;
        
        return {
            id: user.id || user._id || user.userId || null,
            name: user.name || user.displayName || user.username || 'Unknown',
            employeeId: user.employeeId || user.id || user._id || 'N/A',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'user',
            department: user.department || '',
            designation: user.designation || ''
        };
    },

    // ✅ ENHANCED: Initialize auth state with better error handling
    initializeAuth: async () => {
        try {
            const token = localStorage.getItem('token');
            const user = authService.getCurrentUser();

            if (token && user) {
                // Verify token is still valid
                try {
                    const verifyResult = await authService.verifyToken();
                    if (verifyResult.success) {
                        return {
                            authenticated: true,
                            user: verifyResult.data?.user || user,
                            tokenValid: true
                        };
                    } else {
                        // Token invalid, clear data
                        authService.clearAuthData();
                        return { 
                            authenticated: false, 
                            tokenValid: false,
                            message: 'Session expired'
                        };
                    }
                } catch (verifyError) {
                    // Network error during verification, use stored data
                    console.warn('Token verification failed due to network error, using stored data');
                    return {
                        authenticated: true,
                        user: user,
                        tokenValid: 'unknown',
                        message: 'Using cached authentication data'
                    };
                }
            } else {
                return { authenticated: false };
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
            authService.clearAuthData();
            return { 
                authenticated: false,
                error: error.message 
            };
        }
    },

    // ✅ NEW: Check authentication status without network call
    isAuthenticatedLocal: () => {
        try {
            const token = authService.getToken();
            const user = authService.getCurrentUser();
            
            return {
                authenticated: !!(token && user),
                hasToken: !!token,
                hasUser: !!user,
                user: user
            };
        } catch (error) {
            return {
                authenticated: false,
                hasToken: false,
                hasUser: false,
                user: null,
                error: error.message
            };
        }
    },

    // ✅ NEW: Validate user session
    validateSession: async () => {
        try {
            const authStatus = authService.isAuthenticatedLocal();
            
            if (!authStatus.authenticated) {
                return {
                    valid: false,
                    reason: 'No authentication data found'
                };
            }

            // Try to verify with server
            const verifyResult = await authService.verifyToken();
            
            return {
                valid: verifyResult.success,
                user: verifyResult.data?.user || authStatus.user,
                reason: verifyResult.success ? 'Session valid' : verifyResult.message
            };
        } catch (error) {
            return {
                valid: false,
                reason: 'Session validation failed',
                error: error.message
            };
        }
    },

    // Get API configuration info
    getApiInfo: () => {
        return {
            baseURL: api.defaults.baseURL,
            timeout: api.defaults.timeout,
            environment: window.location.hostname === 'localhost' ? 'development' : 'production'
        };
    },

    // ✅ NEW: Debug information for troubleshooting
    getDebugInfo: () => {
        const token = authService.getToken();
        const user = authService.getCurrentUser();
        
        return {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            hasUser: !!user,
            userName: user?.name || 'N/A',
            userId: user?.id || user?._id || 'N/A',
            userEmail: user?.email || 'N/A',
            storageKeys: {
                localStorage: Object.keys(localStorage).filter(key => 
                    ['token', 'user', 'currentCompanyId'].includes(key)
                ),
                sessionStorage: Object.keys(sessionStorage).filter(key => 
                    ['token', 'user'].includes(key)
                )
            },
            apiBaseURL: api.defaults.baseURL,
            timestamp: new Date().toISOString()
        };
    }
};

export default authService;