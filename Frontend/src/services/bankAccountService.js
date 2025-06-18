import axios from 'axios';
import { getAuthToken, getSelectedCompany } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        let companyId = getSelectedCompany();

        if (!companyId) {
            try {
                const currentCompanyStr = localStorage.getItem('currentCompany');
                if (currentCompanyStr) {
                    const currentCompany = JSON.parse(currentCompanyStr);
                    companyId = currentCompany.id || currentCompany._id;
                }
            } catch (error) {
                // Silent error handling
            }
        }

        if (!companyId) {
            companyId = localStorage.getItem('selectedCompanyId') ||
                sessionStorage.getItem('companyId');
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            config.headers['x-auth-token'] = token;
        }

        if (companyId && config.url && !config.url.includes('/companies/')) {
            if (config.url.startsWith('/bank-accounts')) {
                config.url = `/companies/${companyId}${config.url}`;
            } else if (config.url.includes('bank-accounts')) {
                const urlParts = config.url.split('/');
                const bankAccountIndex = urlParts.findIndex(part => part === 'bank-accounts');
                if (bankAccountIndex > 0) {
                    urlParts.splice(bankAccountIndex, 0, 'companies', companyId);
                    config.url = urlParts.join('/');
                }
            }
        }

        if (companyId) {
            config.headers['x-company-id'] = companyId;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (process.env.NODE_ENV === 'production') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

const bankAccountService = {
    async getBankAccounts(companyId, filters = {}) {
        try {
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

            const response = await api.get('/bank-accounts', {
                params: {
                    type,
                    active,
                    search,
                    page,
                    limit
                }
            });

            const responseData = response.data;

            if (!responseData.success) {
                throw new Error(responseData.message || 'Failed to get bank accounts');
            }

            const bankAccounts = responseData.data || responseData.banks || responseData.bankAccounts || [];

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
                    banks: formattedAccounts,
                    bankAccounts: formattedAccounts,
                    accounts: formattedAccounts
                },
                banks: formattedAccounts,
                total: responseData.total || formattedAccounts.length,
                message: responseData.message || 'Bank accounts retrieved successfully'
            };

        } catch (error) {
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

    async getBankAccount(companyId, accountId) {
        try {
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
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to get bank account'
            };
        }
    },

    async createBankAccount(companyId, accountData) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required to create bank account');
            }

            if (!accountData.accountName?.trim()) {
                throw new Error('Account name is required');
            }

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
            throw new Error(error.response?.data?.message || error.message || 'Failed to create bank account');
        }
    },

    async updateBankAccount(companyId, accountId, accountData) {
        try {
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
            throw new Error(error.response?.data?.message || error.message || 'Failed to update bank account');
        }
    },

    async deleteBankAccount(companyId, accountId) {
        try {
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
            throw new Error(error.response?.data?.message || error.message || 'Failed to delete bank account');
        }
    },

    async updateAccountBalance(companyId, accountId, balanceData) {
        try {
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
            throw new Error(error.response?.data?.message || error.message || 'Failed to update account balance');
        }
    },

    async processTransfer(companyId, transferData) {
        try {
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
            throw new Error(error.response?.data?.message || error.message || 'Failed to process transfer');
        }
    },

    async getAccountSummary(companyId) {
        try {
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
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to get account summary'
            };
        }
    },

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
            return {
                success: false,
                isValid: false,
                errors: [error.response?.data?.message || error.message || 'Validation failed'],
                message: 'Validation error'
            };
        }
    },

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

    formatCurrency(amount) {
        const numAmount = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numAmount);
    },

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
                    break;
            }

            return {
                success: true,
                data: filteredAccounts,
                banks: filteredAccounts,
                total: filteredAccounts.length,
                message: `Active accounts for ${paymentType} payments retrieved successfully`
            };

        } catch (error) {
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