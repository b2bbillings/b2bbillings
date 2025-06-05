// Frontend/src/config/api.js
const getApiConfig = () => {
    const isDevelopment = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    return {
        baseURL: isDevelopment ? 'http://localhost:5000' : window.location.origin,
        timeout: 30000
    };
};

export default getApiConfig();