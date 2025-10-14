const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const invoiceService = {
  // Create invoice
  async createInvoice(data) {
    const response = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  // Get all invoices
  async getAllInvoices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/invoices?${queryString}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  // Get invoice statistics
  async getInvoiceStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/invoices/stats?${queryString}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  // Get next invoice number
  async getNextInvoiceNumber() {
    const response = await fetch(`${API_URL}/invoices/next-number`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  // Search invoices
  async searchInvoices(query) {
    const response = await fetch(`${API_URL}/invoices/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  // Get single invoice
  async getInvoice(id) {
    const response = await fetch(`${API_URL}/invoices/${id}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  // Update invoice
  async updateInvoice(id, data) {
    const response = await fetch(`${API_URL}/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  // Update invoice status
  async updateInvoiceStatus(id, status) {
    const response = await fetch(`${API_URL}/invoices/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    return response.json();
  },
  
  // Record payment
  async recordPayment(id, paymentData) {
    const response = await fetch(`${API_URL}/invoices/${id}/payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData)
    });
    return response.json();
  },
  
  // Delete invoice
  async deleteInvoice(id) {
    const response = await fetch(`${API_URL}/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  // Restore invoice
  async restoreInvoice(id) {
    const response = await fetch(`${API_URL}/invoices/${id}/restore`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  // Download PDF
  async downloadPDF(id) {
    const response = await fetch(`${API_URL}/invoices/${id}/pdf`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },
  
  // Email invoice
  async emailInvoice(id, emailData) {
    const response = await fetch(`${API_URL}/invoices/${id}/email`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(emailData)
    });
    return response.json();
  },
  
  // Duplicate invoice
  async duplicateInvoice(id) {
    const response = await fetch(`${API_URL}/invoices/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return response.json();
  }
};

export default invoiceService;
