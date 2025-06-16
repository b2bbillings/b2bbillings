import axios from 'axios';
import { getAuthToken, getSelectedCompany } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ✅ SIMPLIFIED: Create axios instance with better config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// ✅ UPDATED: Request interceptor with automatic URL modification
api.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        let companyId = getSelectedCompany();

        // Try multiple sources for companyId
        if (!companyId) {
            try {
                const currentCompanyStr = localStorage.getItem('currentCompany');
                if (currentCompanyStr) {
                    const currentCompany = JSON.parse(currentCompanyStr);
                    companyId = currentCompany.id || currentCompany._id;
                }
            } catch (error) {
                console.warn('Failed to parse currentCompany from localStorage');
            }
        }

        if (!companyId) {
            companyId = localStorage.getItem('selectedCompanyId') ||
                sessionStorage.getItem('companyId');
        }

        // Set auth headers
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            config.headers['x-auth-token'] = token;
        }

        // ✅ FIXED: Automatically modify URL to include company path structure
        if (companyId && config.url && !config.url.includes('/companies/')) {
            // Check if URL starts with /bank-accounts
            if (config.url.startsWith('/bank-accounts')) {
                config.url = `/companies/${companyId}${config.url}`;
            }
            // Handle other bank-account related URLs
            else if (config.url.includes('bank-accounts')) {
                const urlParts = config.url.split('/');
                const bankAccountIndex = urlParts.findIndex(part => part === 'bank-accounts');
                if (bankAccountIndex > 0) {
                    urlParts.splice(bankAccountIndex, 0, 'companies', companyId);
                    config.url = urlParts.join('/');
                }
            }
        }

        // Set company ID in headers as backup
        if (companyId) {
            config.headers['x-company-id'] = companyId;
        }

        console.log('🔗 Bank API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            companyId,
            hasAuth: !!token
        });

        return config;
    },
    (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// ✅ SIMPLIFIED: Response interceptor
api.interceptors.response.use(
    (response) => {
        console.log('✅ Bank API Response:', {
            status: response.status,
            url: response.config.url,
            dataType: typeof response.data
        });
        return response;
    },
    (error) => {
        console.error('❌ Bank API Error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            message: error.response?.data?.message || error.message
        });

        // Handle auth errors
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            console.warn('🔐 Authentication expired, redirecting to login...');
            // Don't auto-redirect in development
            if (process.env.NODE_ENV === 'production') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// ✅ UPDATED: Bank Account Service with correct URL patterns
const bankAccountService = {

    // ✅ FIXED: Get bank accounts for PayIn.jsx compatibility
    async getBankAccounts(companyId, filters = {}) {
        try {
            console.log('🏦 Getting bank accounts for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required to fetch bank accounts');
            }

            const {
                type = 'all',
                active = 'true',
                search = '',
                page = 1,
                limit = 50
            } = filters;

            // ✅ FIXED: Call API route with correct URL pattern
            const response = await api.get('/bank-accounts', {
                params: {
                    type,
                    active,
                    search,
                    page,
                    limit
                }
            });

            console.log('✅ Bank accounts response:', response.data);

            // ✅ Handle response format
            const responseData = response.data;

            if (!responseData.success) {
                throw new Error(responseData.message || 'Failed to get bank accounts');
            }

            const bankAccounts = responseData.data || responseData.banks || responseData.bankAccounts || [];

            // ✅ Format accounts for PayIn.jsx compatibility
            const formattedAccounts = bankAccounts.map(account => ({
                _id: account._id || account.id,
                id: account._id || account.id,
                bankName: account.bankName || account.name || 'Unknown Bank',
                name: account.accountName || account.bankName || 'Unknown Account',
                accountName: account.accountName || account.name || 'Unknown Account',
                accountNumber: account.accountNumber || 'N/A',
                branch: account.branch || account.branchName || 'Main Branch',
                ifscCode: account.ifscCode || '',
                accountType: account.accountType || account.type || 'bank',
                type: account.type || account.accountType || 'bank',
                currentBalance: account.currentBalance || account.balance || 0,
                balance: account.currentBalance || account.balance || 0,
                isActive: account.isActive !== false,
                displayName: this.formatAccountDisplayName(account)
            }));

            return {
                success: true,
                data: {
                    banks: formattedAccounts, // For PayIn.jsx
                    bankAccounts: formattedAccounts, // Alternative
                    accounts: formattedAccounts // Another alternative
                },
                banks: formattedAccounts, // Direct property for PayIn.jsx
                total: responseData.total || formattedAccounts.length,
                message: responseData.message || 'Bank accounts retrieved successfully'
            };

        } catch (error) {
            console.error('❌ Error getting bank accounts:', error);

            // ✅ NO MOCK DATA - Return proper error
            return {
                success: false,
                data: {
                    banks: [],
                    bankAccounts: [],
                    accounts: []
                },
                banks: [],
                total: 0,
                message: error.response?.data?.message || error.message || 'Failed to fetch bank accounts',
                error: error.response?.data || error.message
            };
        }
    },

    // ✅ FIXED: Get single bank account
    async getBankAccount(companyId, accountId) {
        try {
            console.log('📊 Getting bank account:', accountId);

            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            const response = await api.get(`/bank-accounts/${accountId}`);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to get bank account');
            }

            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || 'Bank account retrieved successfully'
            };

        } catch (error) {
            console.error('❌ Error getting bank account:', error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to get bank account'
            };
        }
    },

    // ✅ FIXED: Create bank account
    async createBankAccount(companyId, accountData) {
        try {
            console.log('➕ Creating bank account for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required to create bank account');
            }

            if (!accountData.accountName?.trim()) {
                throw new Error('Account name is required');
            }

            // ✅ Clean and validate data
            const cleanedData = {
                accountName: accountData.accountName.trim(),
                bankName: accountData.bankName?.trim() || '',
                accountNumber: accountData.accountNumber?.trim() || '',
                ifscCode: accountData.ifscCode?.toUpperCase().trim() || '',
                branchName: accountData.branchName?.trim() || 'Main Branch',
                accountType: accountData.accountType || accountData.type || 'bank',
                type: accountData.type || accountData.accountType || 'bank',
                openingBalance: parseFloat(accountData.openingBalance) || 0,
                isActive: accountData.isActive !== false
            };

            const response = await api.post('/bank-accounts', cleanedData);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to create bank account');
            }

            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || 'Bank account created successfully'
            };

        } catch (error) {
            console.error('❌ Error creating bank account:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to create bank account');
        }
    },

    // ✅ FIXED: Update bank account
    async updateBankAccount(companyId, accountId, accountData) {
        try {
            console.log('✏️ Updating bank account:', accountId);

            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            const cleanedData = {
                ...accountData,
                accountName: accountData.accountName?.trim() || '',
                bankName: accountData.bankName?.trim() || '',
                accountNumber: accountData.accountNumber?.trim() || '',
                ifscCode: accountData.ifscCode?.toUpperCase().trim() || '',
                branchName: accountData.branchName?.trim() || '',
                isActive: accountData.isActive !== undefined ? Boolean(accountData.isActive) : true
            };

            const response = await api.put(`/bank-accounts/${accountId}`, cleanedData);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to update bank account');
            }

            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || 'Bank account updated successfully'
            };

        } catch (error) {
            console.error('❌ Error updating bank account:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to update bank account');
        }
    },

    // ✅ FIXED: Delete bank account
    async deleteBankAccount(companyId, accountId) {
        try {
            console.log('🗑️ Deleting bank account:', accountId);

            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            const response = await api.delete(`/bank-accounts/${accountId}`);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to delete bank account');
            }

            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || 'Bank account deleted successfully'
            };

        } catch (error) {
            console.error('❌ Error deleting bank account:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to delete bank account');
        }
    },

    // ✅ FIXED: Update account balance
    async updateAccountBalance(companyId, accountId, balanceData) {
        try {
            console.log('💰 Updating account balance:', { accountId, amount: balanceData.amount, type: balanceData.type });

            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            const { amount, type, reason, reference } = balanceData;

            const numAmount = parseFloat(amount);
            if (!amount || isNaN(numAmount) || numAmount <= 0) {
                throw new Error('Valid positive amount is required');
            }

            if (!['credit', 'debit'].includes(type)) {
                throw new Error('Type must be either "credit" or "debit"');
            }

            const requestData = {
                amount: numAmount,
                type,
                reason: reason || `Balance ${type} operation`,
                reference: reference || null
            };

            const response = await api.patch(`/bank-accounts/${accountId}/balance`, requestData);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to update account balance');
            }

            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || `Account balance ${type === 'credit' ? 'credited' : 'debited'} successfully`
            };

        } catch (error) {
            console.error('❌ Error updating account balance:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to update account balance');
        }
    },

    // ✅ FIXED: Process transfer between accounts
    async processTransfer(companyId, transferData) {
        try {
            console.log('🔄 Processing transfer:', transferData);

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const { fromAccountId, toAccountId, amount, reason } = transferData;

            if (!fromAccountId || !toAccountId || !amount) {
                throw new Error('From account, to account, and amount are required');
            }

            const transferAmount = parseFloat(amount);
            if (isNaN(transferAmount) || transferAmount <= 0) {
                throw new Error('Transfer amount must be a positive number');
            }

            const requestData = {
                fromAccountId,
                toAccountId,
                amount: transferAmount,
                reason: reason || 'Account transfer'
            };

            const response = await api.post('/bank-accounts/transfer', requestData);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to process transfer');
            }

            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || 'Transfer completed successfully'
            };

        } catch (error) {
            console.error('❌ Error processing transfer:', error);
            throw new Error(error.response?.data?.message || error.message || 'Failed to process transfer');
        }
    },

    // ✅ FIXED: Get account summary
    async getAccountSummary(companyId) {
        try {
            console.log('📊 Getting account summary for company:', companyId);

            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await api.get('/bank-accounts/summary');

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to get account summary');
            }

            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || 'Account summary retrieved successfully'
            };

        } catch (error) {
            console.error('❌ Error getting account summary:', error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to get account summary'
            };
        }
    },

    // ✅ FIXED: Validate account details
    async validateAccountDetails(companyId, validationData) {
        try {
            const {
                accountName,
                accountNumber,
                excludeAccountId
            } = validationData;

            if (!companyId) {
                throw new Error('Company ID is required for validation');
            }

            const params = new URLSearchParams();

            if (accountName?.trim()) {
                params.append('accountName', accountName.trim());
            }
            if (accountNumber?.trim()) {
                params.append('accountNumber', accountNumber.trim());
            }
            if (excludeAccountId) {
                params.append('excludeAccountId', excludeAccountId);
            }

            const response = await api.get(`/bank-accounts/validate?${params.toString()}`);

            return {
                success: response.data?.success !== false,
                isValid: response.data?.isValid || false,
                errors: response.data?.errors || [],
                message: response.data?.message || 'Validation completed'
            };

        } catch (error) {
            console.error('❌ Error validating account details:', error);
            return {
                success: false,
                isValid: false,
                errors: [error.response?.data?.message || error.message || 'Validation failed'],
                message: 'Validation error'
            };
        }
    },

    // ✅ HELPER: Format account display name
    formatAccountDisplayName(account) {
        if (!account) return 'Unknown Account';

        const name = account.accountName || account.name || 'Unnamed Account';
        const bank = account.bankName || 'Unknown Bank';
        const number = account.accountNumber || 'N/A';
        const balance = this.formatCurrency(account.currentBalance || account.balance || 0);

        if (account.type === 'cash') {
            return `${name} - ${bank} (${number}) - ${balance}`;
        } else {
            const maskedNumber = number.length > 4 ? '****' + number.slice(-4) : number;
            return `${name} - ${bank} (${maskedNumber}) - ${balance}`;
        }
    },

    // ✅ HELPER: Format currency
    formatCurrency(amount) {
        const numAmount = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numAmount);
    },

    // ✅ FIXED: Get active accounts for payments (PayIn.jsx compatible)
    async getActiveAccountsForPayment(companyId, paymentType = 'all') {
        try {
            const response = await this.getBankAccounts(companyId, {
                active: 'true',
                limit: 100
            });

            if (!response.success) {
                return response;
            }

            let filteredAccounts = response.banks || response.data?.banks || [];

            // Filter by payment type if specified
            switch (paymentType) {
                case 'bank_transfer':
                case 'Bank':
                    filteredAccounts = filteredAccounts.filter(account =>
                        account.type === 'bank' && account.accountNumber && account.ifscCode
                    );
                    break;
                case 'cash':
                case 'Cash':
                    filteredAccounts = filteredAccounts.filter(account =>
                        account.type === 'cash'
                    );
                    break;
                default:
                    // Return all active accounts
                    break;
            }

            return {
                success: true,
                data: filteredAccounts,
                banks: filteredAccounts, // For PayIn.jsx compatibility
                total: filteredAccounts.length,
                message: `Active accounts for ${paymentType} payments retrieved successfully`
            };

        } catch (error) {
            console.error('❌ Error getting active accounts:', error);
            return {
                success: false,
                data: [],
                banks: [],
                total: 0,
                message: error.message || 'Failed to get active accounts for payment'
            };
        }
    }
};

// ✅ UPDATED: Export service and individual methods
export default bankAccountService;

export const {
    getBankAccounts,
    getBankAccount,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    updateAccountBalance,
    processTransfer,
    getAccountSummary,
    validateAccountDetails,
    formatAccountDisplayName,
    formatCurrency,
    getActiveAccountsForPayment
} = bankAccountService;