const getApiConfig = () => {
  const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  return {
    baseURL: isDevelopment
      ? "http://localhost:5000" // ✅ REMOVED /api from base URL
      : "https://b2bbillings.onrender.com",
    timeout: 30000,
  };
};

export default getApiConfig();
