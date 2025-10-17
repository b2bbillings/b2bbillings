import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const salesInvoiceService = {
  createInvoice: async (payload) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/salesinvoice`, payload);
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  getInvoices: async (params) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/salesinvoice`, { params });
      return { success: true, data: res.data.data || res.data, meta: res.data.meta };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  getNextInvoiceNumber: async (companyId, prefix) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/salesinvoice/next-invoice-number`, {
        params: { companyId, prefix },
      });
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  getById: async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/salesinvoice/${id}`);
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  updateInvoice: async (id, payload) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/salesinvoice/${id}`, payload);
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  deleteInvoice: async (id) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/salesinvoice/${id}`);
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },
};

export default salesInvoiceService;