import axios from "axios";
import apiConfig from "../config/api.js";

const pendingRequests = new Map();
const requestCache = new Map();
const requestFrequency = new Map();
const REQUEST_CACHE_TIME = 2000;
const MAX_REQUESTS_PER_SECOND = 3;
const DEBOUNCE_TIME = 100;

const deduplicateAuthRequest = async (key, requestFn) => {
  // Skip deduplication for logout - always execute immediately
  if (key === "logout" || key.startsWith("logout_")) {
    return requestFn();
  }

  // Check if same request is already pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Check recent cache
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < REQUEST_CACHE_TIME) {
    return cached.result;
  }

  // Frequency control
  const now = Date.now();
  const frequency = requestFrequency.get(key) || [];
  const recentRequests = frequency.filter((time) => now - time < 1000);

  if (recentRequests.length >= MAX_REQUESTS_PER_SECOND) {
    // Return cached result if available, otherwise wait
    if (cached) {
      return cached.result;
    }
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_TIME));
  }

  // Update frequency tracking
  recentRequests.push(now);
  requestFrequency.set(key, recentRequests);

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);

  try {
    const result = await promise;

    // Cache successful results briefly
    if (result.success) {
      requestCache.set(key, {
        result,
        timestamp: Date.now(),
      });
    }

    return result;
  } catch (error) {
    throw error;
  }
};

const clearRequestCaches = () => {
  pendingRequests.clear();
  requestCache.clear();
  requestFrequency.clear();
};

const api = axios.create({
  baseURL: `${apiConfig.baseURL}/api`,
  timeout: apiConfig.timeout || 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Spam prevention
    const requestKey = `${config.method?.toUpperCase()}_${config.url}`;
    const now = Date.now();

    // Check if this is a spam request
    if (!config._deduplicated) {
      const lastRequestKey = `last_${requestKey}`;
      const lastRequest = requestCache.get(lastRequestKey);

      if (lastRequest && now - lastRequest < 50) {
        const error = new Error("Request blocked - spam prevention");
        error.code = "REQUEST_SPAM_BLOCKED";
        return Promise.reject(error);
      }

      requestCache.set(lastRequestKey, now);
    }

    // Add authentication tokens
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add company ID if available
    const companyId =
      localStorage.getItem("currentCompanyId") ||
      sessionStorage.getItem("currentCompanyId");
    if (companyId) {
      config.headers["X-Company-ID"] = companyId;
    }

    // Essential tracking headers
    config.headers["X-Request-ID"] = Math.random()
      .toString(36)
      .substring(2, 15);
    config.headers["X-Client-Version"] = "3.0.0";
    config.headers["X-Client-Platform"] = "web";

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle cancelled requests
    if (axios.isCancel(error) || error.code === "REQUEST_SPAM_BLOCKED") {
      return Promise.resolve({
        data: {
          success: false,
          cancelled: true,
          message: "Request was cancelled to prevent spam",
        },
      });
    }

    const originalRequest = error.config;

    // Rate limiting with exponential backoff
    if (error.response?.status === 429) {
      const retryAfter = error.response?.data?.retryAfter || 60;

      if (window.showToast) {
        window.showToast(
          `Too many requests. Please wait ${retryAfter} seconds and try again.`,
          "warning"
        );
      }

      if (!originalRequest._retry && (originalRequest._retryCount || 0) < 2) {
        originalRequest._retry = true;
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

        const delay = Math.min(
          1000 * Math.pow(2, originalRequest._retryCount),
          5000
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(originalRequest);
      }

      return Promise.reject(error);
    }

    // Authentication errors
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;
      const preserveAuthCodes = [
        "INVALID_CREDENTIALS",
        "MISSING_CREDENTIALS",
        "VALIDATION_ERROR",
        "EMAIL_NOT_VERIFIED",
      ];

      // Don't try to refresh token for these specific errors
      if (!preserveAuthCodes.includes(errorCode)) {
        if (!originalRequest._retry && errorCode !== "REFRESH_TOKEN_EXPIRED") {
          originalRequest._retry = true;

          try {
            const refreshResult = await authService.refreshTokens();

            if (refreshResult.success) {
              const newToken = authService.getToken();
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
              }
            }
          } catch (refreshError) {
            authService.clearAuthData();

            // Emit event for session expiry
            window.dispatchEvent(
              new CustomEvent("auth:session-expired", {
                detail: {
                  message: "Session expired. Please login again.",
                  reason: "token_refresh_failed",
                },
              })
            );
          }
        }

        // Clear auth data for persistent 401s
        if (originalRequest._retry) {
          authService.clearAuthData();
        }
      }
    }

    // Account locked
    if (error.response?.status === 423) {
      const retryAfter = error.response?.data?.retryAfter || 15;
      const minutes = Math.ceil(retryAfter / 60);

      if (window.showToast) {
        window.showToast(
          `Account locked due to security reasons. Try again in ${minutes} minute(s).`,
          "error"
        );
      }
    }

    // Server errors
    if (error.response?.status >= 500) {
      if (window.showToast) {
        window.showToast(
          "Server temporarily unavailable. Please try again later.",
          "error"
        );
      }
    }

    // Network errors - don't clear auth data for temporary connection issues
    if (
      error.code === "ECONNABORTED" ||
      error.code === "NETWORK_ERROR" ||
      error.code === "ERR_NETWORK" ||
      !error.response
    ) {
      console.log("🌐 Network error detected - maintaining user session");
      
      // Don't show toast for every network error to avoid spam
      const lastNetworkError = sessionStorage.getItem('lastNetworkError');
      const now = Date.now();
      
      if (!lastNetworkError || now - parseInt(lastNetworkError) > 30000) { // 30 seconds
        sessionStorage.setItem('lastNetworkError', now.toString());
        if (window.showToast) {
          window.showToast(
            "Connection issue detected. Retrying automatically...",
            "warning"
          );
        }
      }
      
      // Add a flag to indicate this is a network error
      error.isNetworkError = true;
    }

    return Promise.reject(error);
  }
);

// Main auth service implementation
const authService = {
  // Core authentication methods
  login: async (credentials) => {
    const requestKey = `login_${credentials.email || credentials.phone}`;

    return deduplicateAuthRequest(requestKey, async () => {
      try {
        // Validation: Check required fields
        if ((!credentials.email && !credentials.phone) || !credentials.password) {
          return {
            success: false,
            message: credentials.phone ? "Phone and password are required" : "Email and password are required",
            code: "MISSING_CREDENTIALS",
          };
        }

        // Validation: Email or Phone format
        if (credentials.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(credentials.email)) {
            return {
              success: false,
              message: "Please enter a valid email address",
              code: "INVALID_EMAIL_FORMAT",
            };
          }
        }

        if (credentials.phone) {
          const phoneRegex = /^[6-9]\d{9}$/;
          if (!phoneRegex.test(credentials.phone)) {
            return {
              success: false,
              message: "Please enter a valid 10-digit phone number",
              code: "INVALID_PHONE_FORMAT",
            };
          }
        }

        const loginData = {
          password: credentials.password,
          rememberMe: credentials.rememberMe || false,
        };

        if (credentials.phone) {
          loginData.phone = credentials.phone;
        } else {
          loginData.email = credentials.email.toLowerCase().trim();
        }

        const response = await api.post("/auth/login", loginData);

        if (response.data.success) {
          const {tokens, user} = response.data.data;

          // Store tokens
          if (tokens?.accessToken) {
            localStorage.setItem("token", tokens.accessToken);
            localStorage.setItem("accessToken", tokens.accessToken);
            sessionStorage.setItem("token", tokens.accessToken);
            sessionStorage.setItem("accessToken", tokens.accessToken);
          }

          if (tokens?.refreshToken) {
            localStorage.setItem("refreshToken", tokens.refreshToken);
          }

          // Store user data
          if (user && (user.id || user._id) && user.email) {
            const userData = {
              ...user,
              lastLogin: new Date().toISOString(),
              loginMethod: "password",
              sessionId: Math.random().toString(36).substring(2, 15),
            };

            localStorage.setItem("user", JSON.stringify(userData));
            sessionStorage.setItem("user", JSON.stringify(userData));

            // Admin check
            if (user.role === "admin" || user.isAdmin) {
              localStorage.setItem("isAdmin", "true");
              sessionStorage.setItem("isAdmin", "true");
            }
          }

          // Clear caches
          clearRequestCaches();

          return {
            success: true,
            data: response.data.data,
            user: user,
            tokens: tokens,
            message: "Login successful",
          };
        } else {
          throw new Error(response.data.message || "Login failed");
        }
      } catch (error) {
        const errorResponse = error.response?.data;

        // Timeout handling
        if (error.code === "ECONNABORTED") {
          return {
            success: false,
            message:
              "Request timeout. Please check your connection and try again.",
            code: "TIMEOUT",
          };
        }

        // Network error handling
        if (error.code === "ERR_NETWORK" || error.code === "NETWORK_ERROR") {
          return {
            success: false,
            message:
              "Network connection error. Please check your internet connection and try again.",
            code: "NETWORK_ERROR",
          };
        }

        // Rate limiting
        if (error.response?.status === 429) {
          const retryAfter = errorResponse?.retryAfter || 120;
          const minutes = Math.ceil(retryAfter / 60);
          return {
            success: false,
            message: `Too many failed attempts. Please wait ${minutes} minute(s) and try again.`,
            code: "RATE_LIMITED",
            retryAfter: retryAfter,
          };
        }

        // Account locked
        if (error.response?.status === 423) {
          const retryAfter = errorResponse?.retryAfter || 15;
          const minutes = Math.ceil(retryAfter / 60);
          return {
            success: false,
            message: `Account locked due to security reasons. Try again in ${minutes} minute(s).`,
            code: "ACCOUNT_LOCKED",
            retryAfter: retryAfter,
          };
        }

        // Generic error
        return {
          success: false,
          message:
            errorResponse?.message ||
            error.message ||
            "Login failed. Please try again.",
          code: errorResponse?.code || "LOGIN_ERROR",
        };
      }
    });
  },

  signup: async (userData) => {
    const requestKey = `signup_${userData.email}`;

    return deduplicateAuthRequest(requestKey, async () => {
      try {
        // ✅ ADD: Early timeout detection
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Request timeout - please try again"));
          }, 12000); // 12 second timeout
        });

        // ✅ BETTER: Validation with more detailed error messages
        const requiredFields = ["name", "email", "password", "phone"];
        const missingFields = requiredFields.filter(
          (field) => !userData[field]?.trim()
        );

        if (missingFields.length > 0) {
          return {
            success: false,
            message: `Please fill in all required fields: ${missingFields.join(
              ", "
            )}`,
            code: "MISSING_REQUIRED_FIELDS",
          };
        }

        // ✅ BETTER: Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          return {
            success: false,
            message: "Please enter a valid email address",
            code: "INVALID_EMAIL_FORMAT",
          };
        }

        // ✅ BETTER: Phone validation (more flexible)
        const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
        const cleanPhone = userData.phone
          .replace(/\s+/g, "")
          .replace(/^\+91/, "");
        if (!phoneRegex.test(cleanPhone)) {
          return {
            success: false,
            message:
              "Please enter a valid 10-digit mobile number starting with 6-9",
            code: "INVALID_PHONE_FORMAT",
          };
        }

        // ✅ STRONGER: Password validation
        if (userData.password.length < 8) {
          return {
            success: false,
            message: "Password must be at least 8 characters long",
            code: "WEAK_PASSWORD",
          };
        }

        // ✅ CLEANER: Data preparation
        const cleanUserData = {
          name: userData.name.trim(),
          email: userData.email.toLowerCase().trim(),
          password: userData.password,
          phone: cleanPhone,
          ...(userData.companyName?.trim() && {
            companyName: userData.companyName.trim(),
          }),
          ...(userData.gstNumber?.trim() && {
            gstNumber: userData.gstNumber.trim().toUpperCase(),
          }),
        };

        console.log("🚀 Attempting signup for:", cleanUserData.email);

        // ✅ RACE: API call vs timeout
        const signupResponse = await Promise.race([
          api.post("/auth/signup", cleanUserData),
          timeoutPromise,
        ]);

        console.log("✅ Signup response received:", signupResponse.status);

        if (signupResponse.data.success) {
          const {tokens, user} = signupResponse.data.data;

          // Store tokens
          if (tokens?.accessToken) {
            localStorage.setItem("token", tokens.accessToken);
            localStorage.setItem("accessToken", tokens.accessToken);
            sessionStorage.setItem("token", tokens.accessToken);
            sessionStorage.setItem("accessToken", tokens.accessToken);
          }

          if (tokens?.refreshToken) {
            localStorage.setItem("refreshToken", tokens.refreshToken);
          }

          // Store user data
          if (user && (user.id || user._id) && user.email) {
            const userData = {
              ...user,
              registrationDate: new Date().toISOString(),
              registrationMethod: "email",
              sessionId: Math.random().toString(36).substring(2, 15),
              isNewUser: true,
            };

            localStorage.setItem("user", JSON.stringify(userData));
            sessionStorage.setItem("user", JSON.stringify(userData));
          }

          // Clear caches
          clearRequestCaches();

          return {
            success: true,
            data: signupResponse.data.data,
            user: user,
            tokens: tokens,
            message: "Account created successfully",
          };
        } else {
          throw new Error(signupResponse.data.message || "Signup failed");
        }
      } catch (error) {
        console.error("❌ Signup error:", error.message);

        const errorResponse = error.response?.data;

        // ✅ BETTER: Timeout handling
        if (
          error.message.includes("timeout") ||
          error.code === "ECONNABORTED"
        ) {
          return {
            success: false,
            message:
              "Request timed out. Please check your internet connection and try again.",
            code: "TIMEOUT",
            hint: "This usually indicates a slow network or server overload.",
          };
        }

        // ✅ BETTER: Network error handling
        if (
          error.code === "ERR_NETWORK" ||
          error.code === "NETWORK_ERROR" ||
          !error.response
        ) {
          return {
            success: false,
            message:
              "Unable to connect to server. Please check your internet connection.",
            code: "NETWORK_ERROR",
            hint: "Try refreshing the page or switching networks.",
          };
        }

        // Server errors
        if (error.response?.status >= 500) {
          return {
            success: false,
            message:
              "Server temporarily unavailable. Please try again in a few minutes.",
            code: "SERVER_ERROR",
            hint: "This is usually temporary. Please try again later.",
          };
        }

        // Rate limiting
        if (error.response?.status === 429) {
          return {
            success: false,
            message:
              "Too many signup attempts. Please wait a moment and try again.",
            code: "RATE_LIMITED",
          };
        }

        // Validation errors
        if (error.response?.status === 400) {
          return {
            success: false,
            message:
              errorResponse?.message ||
              "Please check your information and try again.",
            code: errorResponse?.code || "VALIDATION_ERROR",
          };
        }

        // Email already exists
        if (error.response?.status === 409) {
          return {
            success: false,
            message:
              "An account with this email already exists. Please try logging in instead.",
            code: "EMAIL_EXISTS",
          };
        }

        // Generic error
        return {
          success: false,
          message:
            errorResponse?.message ||
            error.message ||
            "Signup failed. Please try again.",
          code: errorResponse?.code || "SIGNUP_ERROR",
          details:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        };
      }
    });
  },

  logout: async () => {
    try {
      // 1. IMMEDIATE CLIENT-SIDE CLEANUP (synchronous)
      authService.clearAuthData();

      // 2. BACKGROUND API CALL (fire and forget - don't wait)
      const logoutPromise = (async () => {
        try {
          // Short timeout for logout API call
          const logoutApi = axios.create({
            baseURL: `${apiConfig.baseURL}/api`,
            timeout: 3000, // Only 3 seconds timeout
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            withCredentials: true,
          });

          const response = await logoutApi.post("/auth/logout");
          console.log("Backend logout successful:", response.status);
        } catch (error) {
          // 401 is expected and normal for logout - not an error
          if (error.response?.status === 401) {
            console.log(
              "Backend logout successful (401 - token already invalidated)"
            );
          } else {
            console.log(
              "Backend logout completed with status:",
              error.response?.status || "network_error"
            );
          }
        }
      })();

      // Don't wait for the API call - fire and forget
      logoutPromise.catch(() => {
        // Silent handling - client-side logout already done
      });

      // 3. IMMEDIATE SUCCESS RESPONSE
      return {
        success: true,
        message: "Logged out successfully",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Even if something fails, ensure auth data is cleared
      authService.clearAuthData();

      return {
        success: true,
        message: "Logged out successfully",
        timestamp: new Date().toISOString(),
      };
    }
  },

  fastLogout: () => {
    try {
      // Immediate synchronous cleanup
      authService.clearAuthData();

      // Optional: Fire and forget backend call using fetch
      setTimeout(() => {
        fetch(`${apiConfig.baseURL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })
          .then((response) => {
            // 401 is expected and normal for logout
            if (response.status === 401 || response.status === 200) {
              console.log("Backend logout successful:", response.status);
            }
          })
          .catch((error) => {
            // Silent fail - logout already completed on client side
            console.log("Backend logout completed:", error.message);
          });
      }, 0);

      return {
        success: true,
        message: "Logged out successfully",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Ensure cleanup even on error
      authService.clearAuthData();
      return {
        success: true,
        message: "Logged out successfully",
        timestamp: new Date().toISOString(),
      };
    }
  },

  instantLogout: () => {
    authService.clearAuthData();
    return {
      success: true,
      message: "Logged out successfully",
      timestamp: new Date().toISOString(),
    };
  },

  verifyToken: async () => {
    const requestKey = "verify_token";

    return deduplicateAuthRequest(requestKey, async () => {
      try {
        const token = authService.getToken();

        if (!token) {
          return {
            success: false,
            message: "No authentication token found",
            code: "NO_TOKEN",
          };
        }

        const response = await api.get("/auth/verify");

        if (response.data.success) {
          const userData = response.data.data?.user;

          // Update user data
          if (userData) {
            const updatedUser = {
              ...userData,
              lastVerified: new Date().toISOString(),
            };

            localStorage.setItem("user", JSON.stringify(updatedUser));
            sessionStorage.setItem("user", JSON.stringify(updatedUser));

            // Update admin status
            if (userData.role === "admin" || userData.isAdmin) {
              localStorage.setItem("isAdmin", "true");
              sessionStorage.setItem("isAdmin", "true");
            } else {
              localStorage.removeItem("isAdmin");
              sessionStorage.removeItem("isAdmin");
            }
          }

          return {
            success: true,
            data: response.data.data,
            user: userData,
            message: "Token verified successfully",
          };
        } else {
          throw new Error(response.data.message || "Token verification failed");
        }
      } catch (error) {
        // ✅ FIX: Only clear auth data for actual authentication failures, not network errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log("🔐 Authentication failed, clearing auth data");
          authService.clearAuthData();
        } else if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED' || !error.response) {
          console.log("🌐 Network error during token verification - keeping session");
          // Don't clear auth data for network errors - user is likely still authenticated
          return {
            success: false,
            message: "Network error - using cached session",
            code: "NETWORK_ERROR",
            keepSession: true,
          };
        }

        return {
          success: false,
          message:
            error.response?.data?.message ||
            "Session expired. Please login again.",
          code: error.response?.data?.code || "TOKEN_VERIFICATION_FAILED",
        };
      }
    });
  },

  refreshTokens: async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await api.post("/auth/refresh", {
        refreshToken: refreshToken,
      });

      if (response.data.success) {
        const {tokens} = response.data.data;

        // Update tokens
        if (tokens?.accessToken) {
          localStorage.setItem("token", tokens.accessToken);
          localStorage.setItem("accessToken", tokens.accessToken);
          sessionStorage.setItem("token", tokens.accessToken);
          sessionStorage.setItem("accessToken", tokens.accessToken);
        }

        if (tokens?.refreshToken) {
          localStorage.setItem("refreshToken", tokens.refreshToken);
        }

        return {
          success: true,
          tokens: tokens,
          message: "Tokens refreshed successfully",
        };
      } else {
        throw new Error(response.data.message || "Token refresh failed");
      }
    } catch (error) {
      // Clear data on refresh failure
      authService.clearAuthData();

      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Session expired. Please login again.",
        code: error.response?.data?.code || "TOKEN_REFRESH_FAILED",
      };
    }
  },

  clearAuthData: () => {
    const authKeys = [
      "token",
      "accessToken",
      "refreshToken",
      "user",
      "currentCompany",
      "currentCompanyId",
      "isAdmin",
      "adminPermissions",
      "userRole",
      "lastActivity",
      "hasVisitedDashboard",
      "dashboard-active-view",
    ];

    // Clear storage synchronously for speed
    authKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (error) {
        // Silent fail
      }
    });

    // Clear caches
    clearRequestCaches();

    // Clear global state if available
    if (window.clearUserState) {
      try {
        window.clearUserState();
      } catch (error) {
        // Silent fail
      }
    }

    // Emit logout event for other components
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("auth:logged-out", {
            detail: {timestamp: new Date().toISOString()},
          })
        );
      } catch (error) {
        // Silent fail
      }
    }
  },

  getCurrentUser: () => {
    try {
      let userStr =
        localStorage.getItem("user") || sessionStorage.getItem("user");

      if (userStr) {
        const user = JSON.parse(userStr);

        // Validate user has required fields
        if (user && (user.id || user._id) && user.email) {
          return user;
        } else {
          authService.clearAuthData();
        }
      }

      return null;
    } catch (error) {
      authService.clearAuthData();
      return null;
    }
  },

  getToken: () => {
    // Try multiple sources in order of preference
    const sources = [
      () => localStorage.getItem("token"),
      () => localStorage.getItem("accessToken"),
      () => sessionStorage.getItem("token"),
      () => sessionStorage.getItem("accessToken"),
    ];

    for (const getToken of sources) {
      const token = getToken();
      if (token && token.length > 20) {
        return token;
      }
    }

    return null;
  },

  isAuthenticated: () => {
    const token = authService.getToken();
    const user = authService.getCurrentUser();

    const isAuth = !!(token && user && (user.id || user._id) && user.email);

    // Cleanup inconsistent state
    if (!isAuth && (token || user)) {
      authService.clearAuthData();
    }

    return isAuth;
  },

  isAdmin: () => {
    const user = authService.getCurrentUser();
    const storedAdminStatus =
      localStorage.getItem("isAdmin") === "true" ||
      sessionStorage.getItem("isAdmin") === "true";

    const userIsAdmin =
      user?.role === "admin" ||
      user?.isAdmin === true ||
      user?.userType === "admin";

    return userIsAdmin || storedAdminStatus;
  },

  getUserDisplayName: () => {
    const user = authService.getCurrentUser();
    if (!user) return "Guest";

    return (
      user.name ||
      user.displayName ||
      user.fullName ||
      user.username ||
      user.email?.split("@")[0] ||
      "User"
    );
  },

  getAuthStatus: () => {
    const token = authService.getToken();
    const user = authService.getCurrentUser();

    return {
      hasToken: !!token,
      hasUser: !!user,
      isAuthenticated: authService.isAuthenticated(),
      isAdmin: authService.isAdmin(),
      userEmail: user?.email || null,
      tokenLength: token?.length || 0,
      cacheStats: {
        pendingRequests: pendingRequests.size,
        cachedRequests: requestCache.size,
        frequencies: requestFrequency.size,
      },
    };
  },

  clearCaches: () => {
    clearRequestCaches();
    return {success: true, message: "Request caches cleared"};
  },

  updateCurrentUser: (updatedUser) => {
    try {
      const isRememberMe = localStorage.getItem("user");
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser) {
        return false;
      }
      
      const mergedUser = { ...currentUser, ...updatedUser };
      
      if (isRememberMe) {
        localStorage.setItem("user", JSON.stringify(mergedUser));
      } else {
        sessionStorage.setItem("user", JSON.stringify(mergedUser));
      }
      
      return true;
    } catch (error) {
      console.error("Failed to update current user:", error);
      return false;
    }
  },

  // ================================
  // FORGOT PASSWORD (OTP-based)
  // ================================
  forgotPassword: async (credentials) => {
    try {
      const {email, phone} = credentials;

      if (!email && !phone) {
        return {
          success: false,
          message: "Email or phone number is required",
          code: "MISSING_CREDENTIALS",
        };
      }

      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return {
            success: false,
            message: "Please enter a valid email address",
            code: "INVALID_EMAIL_FORMAT",
          };
        }
      }

      // Validate phone format if provided
      if (phone) {
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
          return {
            success: false,
            message: "Please enter a valid 10-digit phone number",
            code: "INVALID_PHONE_FORMAT",
          };
        }
      }

      const requestData = {};
      if (phone) {
        requestData.phone = phone;
      } else {
        requestData.email = email.toLowerCase().trim();
      }

      const response = await api.post("/auth/forgot-password", requestData);

      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
          data: response.data,
          otp: response.data.otp, // Only available in development
        };
      } else {
        throw new Error(response.data.message || "Failed to send OTP");
      }
    } catch (error) {
      const errorResponse = error.response?.data;

      if (error.code === "ERR_NETWORK" || error.code === "NETWORK_ERROR") {
        return {
          success: false,
          message: "Network error. Please check your connection and try again.",
          code: "NETWORK_ERROR",
        };
      }

      return {
        success: false,
        message: errorResponse?.message || "Failed to send OTP",
        code: errorResponse?.code || "FORGOT_PASSWORD_ERROR",
      };
    }
  },

  // ================================
  // VERIFY OTP
  // ================================
  verifyOTP: async (email, phone, otp) => {
    try {
      if ((!email && !phone) || !otp) {
        return {
          success: false,
          message: "Email/phone and OTP are required",
          code: "MISSING_FIELDS",
        };
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        return {
          success: false,
          message: "OTP must be a 6-digit number",
          code: "INVALID_OTP_FORMAT",
        };
      }

      const requestData = {otp};
      if (phone) {
        requestData.phone = phone;
      } else {
        requestData.email = email.toLowerCase().trim();
      }

      const response = await api.post("/auth/verify-otp", requestData);

      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
          resetToken: response.data.resetToken,
        };
      } else {
        throw new Error(response.data.message || "Failed to verify OTP");
      }
    } catch (error) {
      const errorResponse = error.response?.data;

      if (error.code === "ERR_NETWORK" || error.code === "NETWORK_ERROR") {
        return {
          success: false,
          message: "Network error. Please check your connection and try again.",
          code: "NETWORK_ERROR",
        };
      }

      return {
        success: false,
        message: errorResponse?.message || "Failed to verify OTP",
        code: errorResponse?.code || "VERIFY_OTP_ERROR",
      };
    }
  },

  // ================================
  // RESET PASSWORD
  // ================================
  resetPassword: async (token, newPassword) => {
    try {
      if (!token || !newPassword) {
        return {
          success: false,
          message: "Reset token and new password are required",
          code: "MISSING_FIELDS",
        };
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return {
          success: false,
          message: "Password must be at least 6 characters long",
          code: "WEAK_PASSWORD",
        };
      }

      const response = await api.post("/auth/reset-password", {
        token,
        newPassword,
      });

      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || "Failed to reset password");
      }
    } catch (error) {
      const errorResponse = error.response?.data;

      if (error.code === "ERR_NETWORK" || error.code === "NETWORK_ERROR") {
        return {
          success: false,
          message: "Network error. Please check your connection and try again.",
          code: "NETWORK_ERROR",
        };
      }

      return {
        success: false,
        message: errorResponse?.message || "Failed to reset password",
        code: errorResponse?.code || "RESET_PASSWORD_ERROR",
      };
    }
  },
};
export default authService;
