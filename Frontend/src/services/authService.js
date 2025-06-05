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

            // Redirect to login if not already there
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                console.log('🔄 Redirecting to login due to 401 error');
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
            console.log('🔐 AuthService: Attempting login for:', credentials.email);

            // Basic validation
            if (!credentials.email || !credentials.password) {
                return {
                    success: false,
                    message: 'Email and password are required'
                };
            }

            const response = await api.post('/auth/login', credentials);

            if (response.data.success) {
                console.log('✅ AuthService: Login successful for:', response.data.data.user.name);
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (error) {
            console.error('❌ AuthService: Login error:', error);

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
            console.log('📝 AuthService: Attempting signup for:', userData.email);

            // Basic validation
            if (!userData.name || !userData.email || !userData.password || !userData.phone) {
                return {
                    success: false,
                    message: 'All required fields must be filled'
                };
            }

            const response = await api.post('/auth/signup', userData);

            if (response.data.success) {
                console.log('✅ AuthService: Signup successful for:', response.data.data.user.name);
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Signup failed');
            }
        } catch (error) {
            console.error('❌ AuthService: Signup error:', error);

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
            console.log('👋 AuthService: Logging out user...');

            // Call backend logout endpoint
            try {
                await api.post('/auth/logout');
                console.log('✅ Backend logout successful');
            } catch (logoutError) {
                console.warn('⚠️ Backend logout failed, continuing with local cleanup:', logoutError.message);
            }

            // Clear all auth data
            authService.clearAuthData();

            console.log('✅ AuthService: Logout completed');
            return { success: true };
        } catch (error) {
            console.error('❌ AuthService: Logout error:', error);

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
        localStorage.removeItem('refreshToken'); // In case you add refresh tokens later
        console.log('🧹 Auth data cleared from localStorage');
    },

    // Verify token with backend
    verifyToken: async () => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                return { success: false, message: 'No token found' };
            }

            console.log('🔍 AuthService: Verifying token...');

            const response = await api.get('/auth/verify');

            if (response.data.success) {
                console.log('✅ AuthService: Token verified');
                return {
                    success: true,
                    data: response.data.data
                };
            } else {
                throw new Error(response.data.message || 'Token verification failed');
            }
        } catch (error) {
            console.error('❌ AuthService: Token verification error:', error);

            // Clear invalid token
            authService.clearAuthData();

            return {
                success: false,
                message: error.response?.data?.message || 'Session expired. Please login again.'
            };
        }
    },

    // Get current user from localStorage
    getCurrentUser: () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user;
            }
            return null;
        } catch (error) {
            console.error('❌ AuthService: Error getting current user:', error);
            // Clear corrupted data
            localStorage.removeItem('user');
            return null;
        }
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        const user = authService.getCurrentUser();
        const isAuth = !!(token && user);

        if (isAuth) {
            console.log('✅ User is authenticated:', user.name);
        } else {
            console.log('❌ User is not authenticated');
        }

        return isAuth;
    },

    // Get token from localStorage
    getToken: () => {
        return localStorage.getItem('token');
    },

    // Update user data in localStorage
    updateUserData: (userData) => {
        try {
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('✅ User data updated in localStorage');
        } catch (error) {
            console.error('❌ Error updating user data:', error);
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

    // Get user's display name
    getUserDisplayName: () => {
        const user = authService.getCurrentUser();
        return user ? user.name : 'Guest';
    },

    // Initialize auth state (call this on app startup)
    initializeAuth: async () => {
        try {
            console.log('🔄 Initializing authentication...');

            const token = localStorage.getItem('token');
            const user = authService.getCurrentUser();

            if (token && user) {
                console.log('✅ Found existing auth data for:', user.name);

                // Optionally verify token with backend
                // const verification = await authService.verifyToken();
                // if (!verification.success) {
                //     return { authenticated: false };
                // }

                return {
                    authenticated: true,
                    user: user
                };
            } else {
                console.log('❌ No valid auth data found');
                return { authenticated: false };
            }
        } catch (error) {
            console.error('❌ Error initializing auth:', error);
            authService.clearAuthData();
            return { authenticated: false };
        }
    },

    // Get API configuration info
    getApiInfo: () => {
        return {
            baseURL: api.defaults.baseURL,
            timeout: api.defaults.timeout,
            environment: window.location.hostname === 'localhost' ? 'development' : 'production'
        };
    }
};

export default authService;