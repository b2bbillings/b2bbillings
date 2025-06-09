// Get authentication token from localStorage
export const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Get selected company ID
export const getSelectedCompany = () => {
    return localStorage.getItem('selectedCompany') || sessionStorage.getItem('selectedCompany');
};

// Set authentication token
export const setAuthToken = (token) => {
    localStorage.setItem('token', token);
};

// Set selected company
export const setSelectedCompany = (companyId) => {
    localStorage.setItem('selectedCompany', companyId);
};

// Remove authentication data
export const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('selectedCompany');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('selectedCompany');
};

// Check if user is authenticated
export const isAuthenticated = () => {
    const token = getAuthToken();
    return !!token;
};