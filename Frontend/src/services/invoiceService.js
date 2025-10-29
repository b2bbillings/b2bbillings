import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

/**
 * Invoice Service for Sales and Purchase invoices
 * type = one of:
 *  - "sales-with-gst" -> uses /api/sales-invoices/with-gst
 *  - "sales-without-gst" -> uses /api/sales-invoices/without-gst
 *  - "purchase-with-gst" -> uses /api/purchase-invoices/with-gst
 *  - "purchase-without-gst" -> uses /api/purchase-invoices/without-gst
 */

// Map invoice types to API endpoints
const getEndpoint = (type) => {
  const endpoints = {
    "sales-with-gst": "/sales-invoices/with-gst",
    "sales-without-gst": "/sales-invoices/without-gst",
    "purchase-with-gst": "/purchase-invoices/with-gst",
    "purchase-without-gst": "/purchase-invoices/without-gst",
  };
  return endpoints[type] || `/${type}`;
};

const getBaseEndpoint = (type) => {
  if (type.startsWith("sales")) return "/sales-invoices";
  if (type.startsWith("purchase")) return "/purchase-invoices";
  return `/${type}`;
};

const invoiceService = {
  createInvoice: async (type, payload) => {
    try {
      const endpoint = getEndpoint(type);
      console.log(`📤 Creating invoice: ${API_BASE_URL}${endpoint}`, payload);
      const res = await axios.post(`${API_BASE_URL}${endpoint}`, payload);
      console.log("✅ Invoice created:", res.data);
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      console.error("❌ Error creating invoice:", err);
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  getInvoices: async (type, params) => {
    try {
      const endpoint = getBaseEndpoint(type);
      console.log(`📥 Fetching invoices: ${API_BASE_URL}${endpoint}`, params);
      const res = await axios.get(`${API_BASE_URL}${endpoint}`, { params });
      console.log(`✅ Invoices fetched:`, res.data);
      return { success: true, data: res.data.data || res.data, meta: res.data.meta };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  getNextInvoiceNumber: async (type, companyId, prefix) => {
    try {
      const endpoint = getBaseEndpoint(type);
      const gstType = type.includes("without") ? "no-gst" : "gst";
      const res = await axios.get(`${API_BASE_URL}${endpoint}/next-invoice-number`, {
        params: { companyId, type: gstType, prefix },
      });
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  getById: async (type, id) => {
    try {
      const endpoint = getBaseEndpoint(type);
      const gstType = type.includes("without") ? "no-gst" : "gst";
      const res = await axios.get(`${API_BASE_URL}${endpoint}/${id}`, {
        params: { type: gstType }
      });
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  updateInvoice: async (type, id, payload) => {
    try {
      const endpoint = getBaseEndpoint(type);
      const gstType = type.includes("without") ? "no-gst" : "gst";
      const res = await axios.put(`${API_BASE_URL}${endpoint}/${id}`, payload, {
        params: { type: gstType }
      });
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },

  deleteInvoice: async (type, id) => {
    try {
      const endpoint = getBaseEndpoint(type);
      const gstType = type.includes("without") ? "no-gst" : "gst";
      const res = await axios.delete(`${API_BASE_URL}${endpoint}/${id}`, {
        params: { type: gstType }
      });
      return { success: true, data: res.data.data || res.data };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  },
};

export default invoiceService;