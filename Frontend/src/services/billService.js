import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class BillService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Create a new bill
  async createBill(billData) {
    try {
      const response = await this.api.post('/bills', billData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Bill created successfully',
      };
    } catch (error) {
      console.error('Error creating bill:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to create bill',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Get all bills for a company
  async getBills(companyId, params = {}) {
    try {
      const queryParams = new URLSearchParams({
        companyId,
        ...params,
      });

      const response = await this.api.get(`/bills?${queryParams}`);
      return {
        success: true,
        data: response.data.data || response.data.bills || [],
        total: response.data.total || 0,
        pagination: response.data.pagination,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error fetching bills:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch bills',
        data: [],
        total: 0,
      };
    }
  }

  // Get a single bill by ID
  async getBill(billId) {
    try {
      const response = await this.api.get(`/bills/${billId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error fetching bill:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch bill',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Update a bill
  async updateBill(billId, billData) {
    try {
      const response = await this.api.put(`/bills/${billId}`, billData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Bill updated successfully',
      };
    } catch (error) {
      console.error('Error updating bill:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to update bill',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Delete a bill
  async deleteBill(billId) {
    try {
      const response = await this.api.delete(`/bills/${billId}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Bill deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting bill:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to delete bill',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Generate PDF for a bill
  async generateBillPDF(billId) {
    try {
      const response = await this.api.get(`/bills/${billId}/pdf`, {
        responseType: 'blob', // Important for PDF downloads
      });

      // Create blob URL for PDF
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = window.URL.createObjectURL(pdfBlob);

      return {
        success: true,
        pdfUrl: pdfUrl,
        blob: pdfBlob,
        message: 'PDF generated successfully',
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to generate PDF',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Download PDF
  async downloadBillPDF(billId, fileName = null) {
    try {
      const pdfResult = await this.generateBillPDF(billId);
      
      if (pdfResult.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = pdfResult.pdfUrl;
        link.download = fileName || `bill-${billId}.pdf`;
        link.click();

        // Clean up the URL
        setTimeout(() => {
          window.URL.revokeObjectURL(pdfResult.pdfUrl);
        }, 100);

        return {
          success: true,
          message: 'PDF downloaded successfully',
        };
      } else {
        return pdfResult;
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      return {
        success: false,
        message: error.message || 'Failed to download PDF',
      };
    }
  }

  // Get bill statistics
  async getBillStats(companyId, params = {}) {
    try {
      const queryParams = new URLSearchParams({
        companyId,
        ...params,
      });

      const response = await this.api.get(`/bills/stats?${queryParams}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error fetching bill stats:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch bill statistics',
        data: {},
      };
    }
  }

  // Search bills
  async searchBills(companyId, searchTerm, params = {}) {
    try {
      const queryParams = new URLSearchParams({
        companyId,
        search: searchTerm,
        ...params,
      });

      const response = await this.api.get(`/bills/search?${queryParams}`);
      return {
        success: true,
        data: response.data.data || response.data.bills || [],
        total: response.data.total || 0,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error searching bills:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to search bills',
        data: [],
        total: 0,
      };
    }
  }

  // Update bill status
  async updateBillStatus(billId, status) {
    try {
      const response = await this.api.patch(`/bills/${billId}/status`, { status });
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Bill status updated successfully',
      };
    } catch (error) {
      console.error('Error updating bill status:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to update bill status',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Duplicate a bill
  async duplicateBill(billId) {
    try {
      const response = await this.api.post(`/bills/${billId}/duplicate`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Bill duplicated successfully',
      };
    } catch (error) {
      console.error('Error duplicating bill:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to duplicate bill',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Send bill via email
  async sendBillEmail(billId, emailData) {
    try {
      const response = await this.api.post(`/bills/${billId}/email`, emailData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Bill sent successfully',
      };
    } catch (error) {
      console.error('Error sending bill email:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send bill',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Get bill templates
  async getBillTemplates() {
    try {
      const response = await this.api.get('/bills/templates');
      return {
        success: true,
        data: response.data.data || response.data.templates || [],
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error fetching bill templates:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch bill templates',
        data: [],
      };
    }
  }
}

const billService = new BillService();
export default billService;