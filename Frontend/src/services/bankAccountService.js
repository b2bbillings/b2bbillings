import axios from 'axios';
import { getAuthToken, getSelectedCompany } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ✅ ENHANCED: Add request interceptor with better company ID handling
api.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        
        // ✅ ENHANCED: Better company ID resolution
        let companyId = getSelectedCompany();
        
        // Try multiple sources for company ID
        if (!companyId) {
            try {
                const currentCompanyStr = localStorage.getItem('currentCompany');
                if (currentCompanyStr) {
                    const currentCompany = JSON.parse(currentCompanyStr);
                    companyId = currentCompany.id || currentCompany._id;
                }
            } catch (error) {
                console.warn('⚠️ Failed to parse currentCompany from localStorage:', error);
            }
        }

        // Try additional fallback sources
        if (!companyId) {
            companyId = localStorage.getItem('selectedCompanyId') || 
                      sessionStorage.getItem('companyId');
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (companyId) {
            config.headers['x-company-id'] = companyId;
            console.log('🏢 Adding company ID to bank request:', companyId);
        } else {
            console.warn('⚠️ No company ID found for bank API request');
        }

        // ✅ ENHANCED: Debug logging
        console.log('🔍 Bank Service Request Debug:', {
            url: config.url,
            method: config.method?.toUpperCase(),
            hasAuth: !!config.headers.Authorization,
            hasCompanyId: !!config.headers['x-company-id'],
            companyId: config.headers['x-company-id'],
            authToken: config.headers.Authorization ? 
                config.headers.Authorization.substring(0, 20) + '...' : 'Missing'
        });

        return config;
    },
    (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// ✅ ENHANCED: Add response interceptor with better error handling
api.interceptors.response.use(
    (response) => {
        console.log('✅ Bank API Response:', {
            status: response.status,
            url: response.config.url,
            dataPresent: !!response.data
        });
        return response;
    },
    (error) => {
        console.error('❌ Bank API Error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.response?.data?.message || error.message,
            code: error.response?.data?.code
        });

        // Handle specific error cases
        if (error.response?.status === 401) {
            console.error('🔒 Authentication failed - redirecting to login');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } else if (error.response?.status === 403) {
            console.error('🚫 Access denied - insufficient permissions');
        } else if (error.response?.status === 404) {
            console.error('🔍 Resource not found');
        }

        return Promise.reject(error);
    }
);

const bankAccountService = {
    // ✅ GET ALL BANK ACCOUNTS
    async getBankAccounts(companyId, filters = {}) {
        try {
            const {
                type = 'all',
                active = 'true',
                search = '',
                page = 1,
                limit = 50,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = filters;

            console.log('📊 Fetching bank accounts for company:', companyId, 'with filters:', filters);

            if (!companyId) {
                throw new Error('Company ID is required to fetch bank accounts');
            }

            const response = await api.get(`/companies/${companyId}/bank-accounts`, {
                params: {
                    type,
                    active,
                    search,
                    page,
                    limit,
                    sortBy,
                    sortOrder
                }
            });

            const accountsCount = response.data?.data?.accounts?.length || 0;
            console.log('✅ Bank accounts fetched successfully:', accountsCount, 'accounts');
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching bank accounts:', {
                companyId,
                filters,
                error: error.response?.data || error.message
            });
            throw error;
        }
    },

    // ✅ GET SINGLE BANK ACCOUNT
    async getBankAccount(companyId, accountId) {
        try {
            console.log('📊 Fetching bank account:', accountId, 'for company:', companyId);

            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            const response = await api.get(`/companies/${companyId}/bank-accounts/${accountId}`);

            console.log('✅ Bank account fetched successfully:', response.data?.data?.accountName);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching bank account:', {
                companyId,
                accountId,
                error: error.response?.data || error.message
            });
            throw error;
        }
    },

    // ✅ CREATE BANK ACCOUNT
    async createBankAccount(companyId, accountData) {
        try {
            console.log('➕ Creating bank account:', accountData.accountName, 'for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required to create bank account');
            }

            // Validate required fields
            if (!accountData.accountName?.trim()) {
                throw new Error('Account name is required');
            }

            // Clean and validate data
            const cleanedData = {
                ...accountData,
                accountName: accountData.accountName.trim(),
                accountNumber: accountData.accountNumber?.trim() || '',
                bankName: accountData.bankName?.trim() || '',
                branchName: accountData.branchName?.trim() || '',
                ifscCode: accountData.ifscCode?.toUpperCase().trim() || '',
                accountHolderName: accountData.accountHolderName?.trim() || '',
                upiId: accountData.upiId?.toLowerCase().trim() || '',
                openingBalance: parseFloat(accountData.openingBalance) || 0
            };

            console.log('📤 Sending account data:', {
                accountName: cleanedData.accountName,
                type: cleanedData.type,
                openingBalance: cleanedData.openingBalance
            });

            const response = await api.post(`/companies/${companyId}/bank-accounts`, cleanedData);

            console.log('✅ Bank account created successfully:', response.data?.data?.accountName);
            return response.data;
        } catch (error) {
            console.error('❌ Error creating bank account:', {
                companyId,
                accountName: accountData?.accountName,
                error: error.response?.data || error.message
            });
            throw error;
        }
    },

    // ✅ UPDATE BANK ACCOUNT
    async updateBankAccount(companyId, accountId, updateData) {
        try {
            console.log('✏️ Updating bank account:', accountId, 'for company:', companyId);

            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            // Clean and validate update data
            const cleanedData = {
                ...updateData,
                accountName: updateData.accountName?.trim(),
                accountNumber: updateData.accountNumber?.trim() || '',
                bankName: updateData.bankName?.trim() || '',
                branchName: updateData.branchName?.trim() || '',
                ifscCode: updateData.ifscCode?.toUpperCase().trim() || '',
                accountHolderName: updateData.accountHolderName?.trim() || '',
                upiId: updateData.upiId?.toLowerCase().trim() || ''
            };

            const response = await api.put(`/companies/${companyId}/bank-accounts/${accountId}`, cleanedData);

            console.log('✅ Bank account updated successfully:', response.data?.data?.accountName);
            return response.data;
        } catch (error) {
            console.error('❌ Error updating bank account:', {
                companyId,
                accountId,
                error: error.response?.data || error.message
            });
            throw error;
        }
    },

    // ✅ DELETE BANK ACCOUNT (Soft Delete)
    async deleteBankAccount(companyId, accountId) {
        try {
            console.log('🗑️ Deleting bank account:', accountId, 'for company:', companyId);

            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            const response = await api.delete(`/companies/${companyId}/bank-accounts/${accountId}`);

            console.log('✅ Bank account deleted successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error deleting bank account:', {
                companyId,
                accountId,
                error: error.response?.data || error.message
            });
            throw error;
        }
    },

    // ✅ GET ACCOUNT SUMMARY
    async getAccountSummary(companyId) {
        try {
            console.log('📊 Fetching account summary for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required to fetch account summary');
            }

            const response = await api.get(`/companies/${companyId}/bank-accounts/summary`);

            console.log('✅ Account summary fetched successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching account summary:', {
                companyId,
                error: error.response?.data || error.message
            });
            throw error;
        }
    },

    // ✅ UPDATE ACCOUNT BALANCE
    async updateAccountBalance(companyId, accountId, balanceData) {
        try {
            const { amount, type, reason } = balanceData;

            console.log('💰 Updating account balance:', { 
                companyId, 
                accountId, 
                amount, 
                type, 
                reason 
            });

            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            // Validate balance update data
            if (!amount || amount <= 0) {
                throw new Error('Valid positive amount is required');
            }

            if (!['credit', 'debit'].includes(type)) {
                throw new Error('Type must be either "credit" or "debit"');
            }

            const response = await api.patch(`/companies/${companyId}/bank-accounts/${accountId}/balance`, {
                amount: parseFloat(amount),
                type,
                reason: reason || `Balance ${type} operation`,
                timestamp: new Date().toISOString()
            });

            console.log('✅ Account balance updated successfully:', {
                newBalance: response.data?.data?.newBalance,
                previousBalance: response.data?.data?.previousBalance
            });
            return response.data;
        } catch (error) {
            console.error('❌ Error updating account balance:', {
                companyId,
                accountId,
                balanceData,
                error: error.response?.data || error.message
            });
            throw error;
        }
    },

    // ✅ VALIDATE ACCOUNT DETAILS
    async validateAccountDetails(companyId, validationData) {
        try {
            const { accountName, accountNumber, ifscCode } = validationData;

            console.log('✅ Validating account details for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required for validation');
            }

            const response = await api.get(`/companies/${companyId}/bank-accounts/validate`, {
                params: {
                    accountName: accountName?.trim(),
                    accountNumber: accountNumber?.trim(),
                    ifscCode: ifscCode?.toUpperCase().trim()
                }
            });

            console.log('✅ Account validation completed');
            return response.data;
        } catch (error) {
            console.error('❌ Error validating account details:', {
                companyId,
                validationData,
                error: error.response?.data || error.message
            });
            throw error;
        }
    },

    // ✅ HELPER FUNCTIONS

    // Format account data for display
    formatAccountForDisplay(account) {
        if (!account) return null;
        
        return {
            id: account._id || account.id,
            name: account.accountName || 'Unknown Account',
            number: account.accountNumber || 'N/A',
            bank: account.bankName || 'N/A',
            branch: account.branchName || 'N/A',
            ifsc: account.ifscCode || 'N/A',
            type: account.type || 'bank',
            accountType: account.accountType || 'savings',
            balance: account.currentBalance || 0,
            openingBalance: account.openingBalance || 0,
            isActive: account.isActive !== false,
            upiId: account.upiId || 'N/A',
            createdBy: account.createdBy?.name || account.createdBy?.email || 'Unknown',
            createdAt: account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'Unknown',
            updatedAt: account.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : 'Unknown'
        };
    },

    // Format currency
    formatCurrency(amount) {
        const numAmount = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numAmount);
    },

    // Create account data template
    createAccountTemplate() {
        return {
            accountName: '',
            accountNumber: '',
            bankName: '',
            branchName: '',
            ifscCode: '',
            accountType: 'savings',
            accountHolderName: '',
            type: 'bank',
            openingBalance: 0,
            asOfDate: new Date().toISOString().split('T')[0],
            printUpiQrCodes: false,
            printBankDetails: false,
            upiId: '',
            isActive: true
        };
    },

    // Validate IFSC code format
    validateIFSC(ifscCode) {
        if (!ifscCode) return false;
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        return ifscRegex.test(ifscCode.toUpperCase());
    },

    // Validate UPI ID format
    validateUPI(upiId) {
        if (!upiId) return false;
        const upiRegex = /^[\w.-]+@[\w.-]+$/;
        return upiRegex.test(upiId.toLowerCase());
    },

    // Get account type options
    getAccountTypes() {
        return [
            { value: 'savings', label: 'Savings Account' },
            { value: 'current', label: 'Current Account' },
            { value: 'cash', label: 'Cash Account' },
            { value: 'fd', label: 'Fixed Deposit' },
            { value: 'rd', label: 'Recurring Deposit' },
            { value: 'loan', label: 'Loan Account' },
            { value: 'cc', label: 'Credit Card' }
        ];
    },

    // Get account category options
    getAccountCategories() {
        return [
            { value: 'bank', label: 'Bank Account' },
            { value: 'cash', label: 'Cash Account' },
            { value: 'investment', label: 'Investment Account' },
            { value: 'loan', label: 'Loan Account' }
        ];
    },

    // Calculate total balance by type
    calculateBalanceByType(accounts) {
        if (!Array.isArray(accounts)) return {};
        
        return accounts.reduce((summary, account) => {
            const type = account.type || 'unknown';
            if (!summary[type]) {
                summary[type] = {
                    count: 0,
                    totalBalance: 0,
                    totalOpeningBalance: 0,
                    accounts: []
                };
            }
            summary[type].count += 1;
            summary[type].totalBalance += parseFloat(account.currentBalance) || 0;
            summary[type].totalOpeningBalance += parseFloat(account.openingBalance) || 0;
            summary[type].accounts.push(account);
            return summary;
        }, {});
    },

    // Search accounts
    searchAccounts(accounts, searchTerm) {
        if (!Array.isArray(accounts) || !searchTerm) return accounts;

        const term = searchTerm.toLowerCase().trim();
        return accounts.filter(account =>
            account.accountName?.toLowerCase().includes(term) ||
            account.accountNumber?.toLowerCase().includes(term) ||
            account.bankName?.toLowerCase().includes(term) ||
            account.accountHolderName?.toLowerCase().includes(term) ||
            account.ifscCode?.toLowerCase().includes(term) ||
            account.upiId?.toLowerCase().includes(term)
        );
    },

    // Export accounts data
    exportAccounts(accounts, format = 'csv') {
        if (!Array.isArray(accounts)) return '';
        
        const data = accounts.map(account => ({
            'Account Name': account.accountName || 'N/A',
            'Account Number': account.accountNumber || 'N/A',
            'Bank Name': account.bankName || 'N/A',
            'Branch': account.branchName || 'N/A',
            'IFSC Code': account.ifscCode || 'N/A',
            'Account Type': account.accountType || 'N/A',
            'Category': account.type || 'N/A',
            'Current Balance': this.formatCurrency(account.currentBalance),
            'Opening Balance': this.formatCurrency(account.openingBalance),
            'UPI ID': account.upiId || 'N/A',
            'Status': account.isActive ? 'Active' : 'Inactive',
            'Created Date': account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'N/A',
            'Created By': account.createdBy?.name || account.createdBy?.email || 'Unknown',
            'Print UPI QR': account.printUpiQrCodes ? 'Yes' : 'No',
            'Print Bank Details': account.printBankDetails ? 'Yes' : 'No'
        }));

        if (format === 'csv') {
            return this.convertToCSV(data);
        }
        return data;
    },

    // Convert data to CSV format
    convertToCSV(data) {
        if (!Array.isArray(data) || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header =>
                    `"${String(row[header] || '').replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');

        return csvContent;
    },

    // Download CSV file
    downloadCSV(csvContent, filename = 'bank-accounts.csv') {
        if (!csvContent) {
            console.warn('No content to download');
            return;
        }

        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('✅ CSV file downloaded:', filename);
            }
        } catch (error) {
            console.error('❌ Error downloading CSV:', error);
        }
    },

    // ✅ NEW: Debug function to check authentication and company state
    debugAuthState() {
        const token = getAuthToken();
        const companyId = getSelectedCompany();
        
        let currentCompany = null;
        try {
            const currentCompanyStr = localStorage.getItem('currentCompany');
            if (currentCompanyStr) {
                currentCompany = JSON.parse(currentCompanyStr);
            }
        } catch (error) {
            console.warn('Failed to parse currentCompany:', error);
        }

        const debugInfo = {
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'None',
            companyId: companyId || 'None',
            currentCompany: currentCompany ? {
                id: currentCompany.id || currentCompany._id,
                name: currentCompany.name,
                businessName: currentCompany.businessName
            } : 'None',
            localStorage: {
                hasCurrentCompany: !!localStorage.getItem('currentCompany'),
                hasSelectedCompanyId: !!localStorage.getItem('selectedCompanyId'),
                hasToken: !!localStorage.getItem('token')
            },
            sessionStorage: {
                hasCompanyId: !!sessionStorage.getItem('companyId'),
                hasToken: !!sessionStorage.getItem('token')
            }
        };

        console.log('🔍 Bank Service Auth Debug:', debugInfo);
        return debugInfo;
    }
};

export default bankAccountService;

// ✅ Named exports for specific functions
export const {
    getBankAccounts,
    getBankAccount,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    getAccountSummary,
    updateAccountBalance,
    validateAccountDetails,
    formatAccountForDisplay,
    formatCurrency,
    createAccountTemplate,
    validateIFSC,
    validateUPI,
    getAccountTypes,
    getAccountCategories,
    calculateBalanceByType,
    searchAccounts,
    exportAccounts,
    downloadCSV,
    debugAuthState
} = bankAccountService;