import axios from 'axios';
import { getAuthToken, getSelectedCompany } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
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
                console.warn('Failed to parse currentCompany from localStorage');
            }
        }

        if (!companyId) {
            companyId = localStorage.getItem('selectedCompanyId') ||
                sessionStorage.getItem('companyId');
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

const bankAccountService = {
    async validateAccountDetails(companyId, validationData) {
        try {
            const {
                accountName,
                accountNumber,
                ifscCode,
                upiId,
                type,
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
            if (ifscCode?.trim()) {
                params.append('ifscCode', ifscCode.trim().toUpperCase());
            }
            if (upiId?.trim()) {
                params.append('upiId', upiId.trim().toLowerCase());
            }
            if (type) {
                params.append('type', type);
            }
            if (excludeAccountId) {
                params.append('excludeAccountId', excludeAccountId);
            }

            const response = await api.get(`/companies/${companyId}/bank-accounts/validate?${params.toString()}`);

            return {
                success: response.data?.success !== false,
                isValid: response.data?.isValid || false,
                errors: response.data?.errors || [],
                message: response.data?.message || 'Validation completed'
            };

        } catch (error) {
            if (error.response?.status === 400) {
                return {
                    success: false,
                    isValid: false,
                    errors: [error.response.data?.message || 'Validation failed'],
                    message: 'Validation error'
                };
            } else if (error.response?.status === 500) {
                return {
                    success: false,
                    isValid: false,
                    errors: ['Server error during validation. Please try again.'],
                    message: 'Validation service unavailable'
                };
            } else {
                return {
                    success: false,
                    isValid: false,
                    errors: [error.message || 'Validation check failed'],
                    message: 'Validation error'
                };
            }
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
                type: accountData.type || 'bank',
                bankName: accountData.bankName?.trim() || '',
                accountNumber: accountData.accountNumber?.trim() || '',
                ifscCode: accountData.ifscCode?.toUpperCase().trim() || '',
                branchName: accountData.branchName?.trim() || '',
                openingBalance: parseFloat(accountData.openingBalance) || 0,
                asOfDate: accountData.asOfDate || new Date().toISOString().split('T')[0],
                accountType: accountData.accountType || 'savings',
                accountHolderName: accountData.accountHolderName?.trim() || '',
                printUpiQrCodes: Boolean(accountData.printUpiQrCodes),
                printBankDetails: Boolean(accountData.printBankDetails),
                isActive: accountData.isActive !== undefined ? Boolean(accountData.isActive) : true
            };

            if (accountData.type === 'upi') {
                cleanedData.upiId = accountData.upiId?.toLowerCase().trim() || '';
                cleanedData.mobileNumber = accountData.mobileNumber?.trim() || '';
            }

            const response = await api.put(`/companies/${companyId}/bank-accounts/${accountId}`, cleanedData);
            return response.data;

        } catch (error) {
            throw error;
        }
    },

    async deleteBankAccount(companyId, accountId) {
        try {
            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            const response = await api.delete(`/companies/${companyId}/bank-accounts/${accountId}`);
            return response.data;

        } catch (error) {
            throw error;
        }
    },

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

            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getBankAccountsByCompany(companyId, options = {}) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const filters = {
                active: 'true',
                limit: 100,
                sortBy: 'accountName',
                sortOrder: 'asc',
                ...options
            };

            const response = await this.getBankAccounts(companyId, filters);

            if (response && response.success) {
                const accounts = response.data?.accounts || response.accounts || [];

                const formattedAccounts = accounts.map(account => ({
                    _id: account._id || account.id,
                    id: account._id || account.id,
                    accountName: account.accountName,
                    bankName: account.bankName,
                    accountNumber: account.accountNumber,
                    accountType: account.accountType || account.type,
                    ifscCode: account.ifscCode,
                    branchName: account.branchName,
                    currentBalance: account.currentBalance || account.balance || 0,
                    balance: account.currentBalance || account.balance || 0,
                    isActive: account.isActive !== false,
                    type: account.type || 'bank',
                    upiId: account.upiId,
                    mobileNumber: account.mobileNumber,
                    displayName: this.formatAccountDisplayName(account),
                    canReceivePayments: account.isActive && (account.type !== 'upi' || (account.upiId && account.mobileNumber))
                }));

                return {
                    success: true,
                    data: formattedAccounts,
                    total: formattedAccounts.length,
                    message: 'Bank accounts retrieved successfully'
                };
            } else {
                return {
                    success: false,
                    data: [],
                    total: 0,
                    message: response?.message || 'Failed to get bank accounts'
                };
            }

        } catch (error) {
            return {
                success: false,
                data: [],
                total: 0,
                message: error.response?.data?.message || error.message || 'Failed to get bank accounts'
            };
        }
    },

    formatAccountDisplayName(account) {
        if (!account) return 'Unknown Account';

        const name = account.accountName || 'Unnamed Account';
        const bank = account.bankName || 'Unknown Bank';
        const number = account.accountNumber || 'N/A';
        const balance = this.formatCurrency(account.currentBalance || account.balance || 0);

        if (account.type === 'upi' && account.upiId) {
            return `${name} - UPI (${account.upiId}) - ${balance}`;
        } else {
            const maskedNumber = number.length > 4 ?
                '****' + number.slice(-4) : number;
            return `${name} - ${bank} (${maskedNumber}) - ${balance}`;
        }
    },

    async getActiveAccountsForPayment(companyId, paymentType = 'all') {
        try {
            const response = await this.getBankAccountsByCompany(companyId, {
                active: 'true',
                limit: 100
            });

            if (!response.success) {
                return response;
            }

            let filteredAccounts = response.data;

            switch (paymentType) {
                case 'UPI':
                    filteredAccounts = response.data.filter(account =>
                        account.type === 'upi' && account.upiId && account.mobileNumber
                    );
                    break;

                case 'Bank':
                case 'NEFT':
                case 'RTGS':
                case 'Cheque':
                    filteredAccounts = response.data.filter(account =>
                        account.type === 'bank' && account.accountNumber && account.ifscCode
                    );
                    break;

                case 'Cash':
                    filteredAccounts = [];
                    break;

                default:
                    break;
            }

            return {
                success: true,
                data: filteredAccounts,
                total: filteredAccounts.length,
                message: `Active accounts for ${paymentType} payments retrieved successfully`
            };

        } catch (error) {
            return {
                success: false,
                data: [],
                total: 0,
                message: error.message || 'Failed to get active accounts for payment'
            };
        }
    },

    async processPaymentTransaction(companyId, transactionData) {
        try {
            const {
                bankAccountId,
                amount,
                paymentType,
                paymentDirection,
                reference,
                description,
                partyName
            } = transactionData;

            if (!bankAccountId) {
                return {
                    success: true,
                    data: null,
                    message: 'Cash payment - no bank transaction needed'
                };
            }

            if (!companyId || !amount || !paymentDirection) {
                throw new Error('Company ID, amount, and payment direction are required');
            }

            const transactionType = paymentDirection === 'in' ? 'credit' : 'debit';
            const transactionAmount = Math.abs(parseFloat(amount));

            const balanceData = {
                amount: transactionAmount,
                type: transactionType,
                reason: `${paymentDirection === 'in' ? 'Payment received' : 'Payment made'} via ${paymentType}`,
                reference: reference || '',
                category: paymentDirection === 'in' ? 'sales' : 'purchase',
                description: description || `${paymentDirection === 'in' ? 'Payment from' : 'Payment to'} ${partyName || 'Party'}`
            };

            const response = await this.updateAccountBalance(companyId, bankAccountId, balanceData);

            return {
                success: true,
                data: {
                    transactionId: response.data?.transactionId || Date.now().toString(),
                    accountId: bankAccountId,
                    previousBalance: response.data?.previousBalance || 0,
                    newBalance: response.data?.newBalance || 0,
                    transactionAmount: transactionAmount,
                    transactionType: transactionType
                },
                message: `Bank account ${transactionType === 'credit' ? 'credited' : 'debited'} successfully`
            };

        } catch (error) {
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to process payment transaction'
            };
        }
    },

    validatePaymentMethodCompatibility(account, paymentMethod) {
        if (!account) {
            return {
                isValid: false,
                message: 'No account selected'
            };
        }

        if (!account.isActive) {
            return {
                isValid: false,
                message: 'Selected account is inactive'
            };
        }

        switch (paymentMethod) {
            case 'UPI':
                if (account.type !== 'upi' || !account.upiId || !account.mobileNumber) {
                    return {
                        isValid: false,
                        message: 'UPI payments require a UPI-enabled account with valid UPI ID and mobile number'
                    };
                }
                break;

            case 'Bank':
            case 'NEFT':
            case 'RTGS':
            case 'Cheque':
                if (!account.accountNumber || !account.ifscCode) {
                    return {
                        isValid: false,
                        message: 'Bank transfers require account number and IFSC code'
                    };
                }
                break;

            case 'Cash':
                return {
                    isValid: true,
                    message: 'Cash payment - no bank account validation needed'
                };

            default:
                break;
        }

        return {
            isValid: true,
            message: 'Payment method is compatible with selected account'
        };
    },

    async getBankAccount(companyId, accountId) {
        try {
            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

            const response = await api.get(`/companies/${companyId}/bank-accounts/${accountId}`);
            return response.data;
        } catch (error) {
            throw error;
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

            if (!accountData.type || !['bank', 'upi'].includes(accountData.type)) {
                throw new Error('Account type must be either "bank" or "upi"');
            }

            const cleanedData = {
                ...accountData,
                accountName: accountData.accountName.trim(),
                type: accountData.type,
                bankName: accountData.bankName?.trim() || '',
                accountNumber: accountData.accountNumber?.trim() || '',
                ifscCode: accountData.ifscCode?.toUpperCase().trim() || '',
                branchName: accountData.branchName?.trim() || '',
                openingBalance: parseFloat(accountData.openingBalance) || 0,
                asOfDate: accountData.asOfDate || new Date().toISOString().split('T')[0],
                accountType: accountData.accountType || 'savings',
                accountHolderName: accountData.accountHolderName?.trim() || '',
                printUpiQrCodes: accountData.printUpiQrCodes || false,
                printBankDetails: accountData.printBankDetails || false
            };

            if (accountData.type === 'upi') {
                cleanedData.upiId = accountData.upiId?.toLowerCase().trim() || '';
                cleanedData.mobileNumber = accountData.mobileNumber?.trim() || '';
            }

            const response = await api.post(`/companies/${companyId}/bank-accounts`, cleanedData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async updateAccountBalance(companyId, accountId, balanceData) {
        try {
            const { amount, type, reason, reference, category, description } = balanceData;

            if (!companyId || !accountId) {
                throw new Error('Company ID and Account ID are required');
            }

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
                reason: reason || description || `Balance ${type} operation`,
                reference: reference || null,
                category: category || 'general',
                transactionDate: new Date().toISOString()
            };

            const response = await api.patch(`/companies/${companyId}/bank-accounts/${accountId}/balance`, requestData);
            return response.data;
        } catch (error) {
            throw error;
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
    }
};

export default bankAccountService;

export const {
    getBankAccounts,
    getBankAccountsByCompany,
    getActiveAccountsForPayment,
    processPaymentTransaction,
    validatePaymentMethodCompatibility,
    formatAccountDisplayName,
    getBankAccount,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    validateAccountDetails,
    updateAccountBalance,
    formatCurrency
} = bankAccountService;