const getApiConfig = () => {
  const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  return {
    baseURL: isDevelopment
      ? "http://localhost:5000"
      : "https://b2bbillings-v7wq.onrender.com", // ✅ FIXED: Use correct Render URL
    timeout: 30000,
  };
};

const apiConfig = getApiConfig();

// Export both the config object and the base URL
export const API_BASE_URL = apiConfig.baseURL;
export default apiConfig;
