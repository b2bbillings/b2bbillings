import axios from "axios";
const API_BASE_URL = "http://localhost:5000/api"; // Adjust as needed

const brandService = {
  getBrands: async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/brand`);
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, data: [], message: err.message };
    }
  },

  createBrand: async (brandData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/brand`, brandData);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
};

export default brandService;