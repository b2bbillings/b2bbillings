import axios from "axios";
const API_BASE_URL = "http://localhost:5000/api"; // Adjust as needed

const brandService = {
  getBrands: async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/brand`); // <-- use correct endpoint
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, data: [], message: err.message };
    }
  },
};

export default brandService;