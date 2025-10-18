// Get authentication token from localStorage
export const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Get selected company ID (returns parsed id/object when stored as JSON)
export const getSelectedCompany = () => {
    try {
        const raw = localStorage.getItem('selectedCompany') || sessionStorage.getItem('selectedCompany');
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return parsed?.id || parsed?._id || parsed || null;
        } catch {
            return raw;
        }
    } catch (e) {
        return null;
    }
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

export default {
    getAuthToken,
    getSelectedCompany,
    setAuthToken,
    setSelectedCompany,
    clearAuth,
    isAuthenticated
};