const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class PaymentService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    getAuthHeaders() {
        const token = localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            sessionStorage.getItem('token');

        return {
            'Content-Type': 'application/json',
            ...(token && {
                'Authorization': `Bearer ${token}`,
                'x-auth-token': token
            })
        };
    }

    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            let data;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                let errorMessage = data.message || `HTTP error! status: ${response.status}`;

                if (response.status === 400) {
                    if (data.errors && Array.isArray(data.errors)) {
                        errorMessage = data.errors.join(', ');
                    } else if (data.error) {
                        errorMessage = data.error;
                    } else if (data.message) {
                        errorMessage = data.message;
                    } else {
                        errorMessage = 'Invalid payment data. Please check all required fields.';
                    }
                } else if (response.status === 401) {
                    errorMessage = 'Authentication required. Please login again.';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. You do not have permission for this operation.';
                } else if (response.status === 404) {
                    errorMessage = 'Payment or resource not found.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }

                throw new Error(errorMessage);
            }

            return data;

        } catch (error) {
            throw error;
        }
    }

    async createPaymentIn(paymentData) {
        try {
            this.validatePaymentData(paymentData);

            const apiPaymentData = {
                party: paymentData.partyId,
                type: 'in',
                companyId: paymentData.companyId,
                amount: parseFloat(paymentData.amount),
                paymentMethod: paymentData.paymentMethod || 'cash',
                paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
                paymentType: paymentData.paymentType || 'advance',
                reference: paymentData.reference || '',
                notes: paymentData.notes || '',
                status: 'completed',
                employeeName: paymentData.employeeName || '',
                employeeId: paymentData.employeeId || '',
                createdBy: paymentData.employeeName || paymentData.createdBy || '',
                partyName: paymentData.partyName || '',
                partyId: paymentData.partyId,
                clearingDate: paymentData.clearingDate || null
            };

            if (paymentData.selectedBank) {
                apiPaymentData.bankAccountId = paymentData.selectedBank;
                apiPaymentData.bankAccount = paymentData.selectedBank;
            } else if (paymentData.bankAccountId) {
                apiPaymentData.bankAccountId = paymentData.bankAccountId;
                apiPaymentData.bankAccount = paymentData.bankAccountId;
            } else if (paymentData.bankAccount) {
                apiPaymentData.bankAccountId = paymentData.bankAccount;
                apiPaymentData.bankAccount = paymentData.bankAccount;
            } else if (paymentData.bankDetails?.bankAccountId) {
                apiPaymentData.bankAccountId = paymentData.bankDetails.bankAccountId;
                apiPaymentData.bankAccount = paymentData.bankDetails.bankAccountId;
            }

            if (paymentData.bankDetails) {
                apiPaymentData.bankDetails = paymentData.bankDetails;
            }

            if (paymentData.saleOrderId) {
                apiPaymentData.saleOrderId = paymentData.saleOrderId;
                apiPaymentData.orderId = paymentData.saleOrderId;
            }

            if (paymentData.invoiceId) {
                apiPaymentData.invoiceId = paymentData.invoiceId;
            }

            if (paymentData.invoiceAllocations) {
                apiPaymentData.invoiceAllocations = paymentData.invoiceAllocations;
                apiPaymentData.allocations = paymentData.invoiceAllocations;
            }

            const response = await this.apiCall('/payments/pay-in', {
                method: 'POST',
                body: JSON.stringify(apiPaymentData)
            });

            if (response.success) {
                return {
                    success: true,
                    data: {
                        _id: response.data.payment?._id || response.data._id,
                        paymentId: response.data.payment?._id || response.data._id,
                        paymentNumber: response.data.payment?.paymentNumber || response.data.paymentNumber,
                        amount: response.data.payment?.amount || response.data.amount,
                        paymentMethod: response.data.payment?.paymentMethod || response.data.paymentMethod,
                        paymentDate: response.data.payment?.paymentDate || response.data.paymentDate,
                        partyName: paymentData.partyName,
                        status: response.data.payment?.status || response.data.status || 'completed',
                        createdAt: response.data.payment?.createdAt || response.data.createdAt,
                        party: response.data.party,

                        bankTransaction: response.data.bankTransaction ? {
                            _id: response.data.bankTransaction._id,
                            transactionNumber: response.data.bankTransaction.transactionNumber,
                            transactionType: response.data.bankTransaction.transactionType,
                            amount: response.data.bankTransaction.amount,
                            balance: response.data.bankTransaction.balance,
                            bankName: response.data.bankTransaction.bankName,
                            accountName: response.data.bankTransaction.accountName,
                            description: response.data.bankTransaction.description
                        } : null,

                        bankAccount: response.data.bankAccount ? {
                            _id: response.data.bankAccount._id,
                            bankName: response.data.bankAccount.bankName,
                            accountName: response.data.bankAccount.accountName,
                            currentBalance: response.data.bankAccount.currentBalance
                        } : null,

                        invoiceAllocations: response.data.invoiceAllocations || [],
                        remainingAmount: response.data.remainingAmount || 0,
                        totalInvoicesUpdated: response.data.totalInvoicesUpdated || 0,
                        partyBalance: response.data.partyBalance || response.data.party?.currentBalance || 0,

                        allocationSummary: {
                            totalAllocated: (response.data.invoiceAllocations || []).reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0),
                            invoicesUpdated: response.data.totalInvoicesUpdated || 0,
                            remainingAmount: response.data.remainingAmount || 0,
                            invoiceDetails: response.data.invoiceAllocations || []
                        }
                    },
                    message: response.message || 'Payment recorded successfully',

                    details: {
                        paymentAmount: parseFloat(paymentData.amount),
                        invoicesUpdated: response.data.totalInvoicesUpdated || 0,
                        totalAllocated: (response.data.invoiceAllocations || []).reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0),
                        remainingAmount: response.data.remainingAmount || 0,
                        bankTransactionCreated: !!response.data.bankTransaction,
                        bankTransactionNumber: response.data.bankTransaction?.transactionNumber || null,
                        newBankBalance: response.data.bankAccount?.currentBalance || null,
                        invoiceList: (response.data.invoiceAllocations || []).map(alloc => ({
                            invoiceNumber: alloc.invoiceNumber,
                            allocatedAmount: alloc.allocatedAmount,
                            paymentStatus: alloc.paymentStatus
                        }))
                    }
                };
            } else {
                throw new Error(response.message || 'Failed to create payment');
            }

        } catch (error) {
            throw error;
        }
    }

    async createPaymentOut(paymentData) {
        try {
            this.validatePaymentData(paymentData);

            const apiPaymentData = {
                party: paymentData.partyId,
                partyId: paymentData.partyId,
                type: 'out',
                companyId: paymentData.companyId,
                amount: parseFloat(paymentData.amount),
                paymentMethod: paymentData.paymentMethod || 'cash',
                paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
                paymentType: paymentData.paymentType || 'advance',
                reference: paymentData.reference || '',
                notes: paymentData.notes || '',
                status: 'completed',
                employeeName: paymentData.employeeName || '',
                employeeId: paymentData.employeeId || '',
                createdBy: paymentData.employeeName || paymentData.createdBy || '',
                partyName: paymentData.partyName || '',
                clearingDate: paymentData.clearingDate || null
            };

            if (paymentData.selectedBank) {
                apiPaymentData.bankAccountId = paymentData.selectedBank;
                apiPaymentData.bankAccount = paymentData.selectedBank;
            } else if (paymentData.bankAccountId) {
                apiPaymentData.bankAccountId = paymentData.bankAccountId;
                apiPaymentData.bankAccount = paymentData.bankAccountId;
            } else if (paymentData.bankAccount) {
                apiPaymentData.bankAccountId = paymentData.bankAccount;
                apiPaymentData.bankAccount = paymentData.bankAccount;
            } else if (paymentData.bankDetails?.bankAccountId) {
                apiPaymentData.bankAccountId = paymentData.bankDetails.bankAccountId;
                apiPaymentData.bankAccount = paymentData.bankDetails.bankAccountId;
            }

            if (paymentData.bankDetails) {
                apiPaymentData.bankDetails = paymentData.bankDetails;
            }

            let purchaseInvoiceAllocations = [];

            if (paymentData.purchaseInvoiceAllocations && Array.isArray(paymentData.purchaseInvoiceAllocations)) {
                purchaseInvoiceAllocations = paymentData.purchaseInvoiceAllocations.map(allocation => ({
                    purchaseInvoiceId: allocation.purchaseInvoiceId,
                    invoiceNumber: allocation.invoiceNumber || allocation.purchaseNumber,
                    allocatedAmount: parseFloat(allocation.allocatedAmount)
                }));
            } else if (paymentData.selectedPurchaseInvoices && Array.isArray(paymentData.selectedPurchaseInvoices)) {
                const selectedInvoices = paymentData.selectedPurchaseInvoices.filter(invoice =>
                    invoice.selected || invoice.isSelected || (invoice.allocatedAmount && invoice.allocatedAmount > 0)
                );

                if (selectedInvoices.length > 0) {
                    purchaseInvoiceAllocations = selectedInvoices.map(invoice => ({
                        purchaseInvoiceId: invoice._id || invoice.id,
                        invoiceNumber: invoice.invoiceNumber || invoice.purchaseNumber,
                        allocatedAmount: parseFloat(
                            invoice.allocatedAmount ||
                            invoice.selectedAmount ||
                            invoice.allocationAmount ||
                            Math.min(parseFloat(paymentData.amount), parseFloat(invoice.dueAmount || 0)) ||
                            0
                        )
                    })).filter(allocation => allocation.allocatedAmount > 0);
                }
            } else if (paymentData.purchaseInvoiceId) {
                purchaseInvoiceAllocations = [{
                    purchaseInvoiceId: paymentData.purchaseInvoiceId,
                    invoiceNumber: paymentData.invoiceNumber || '',
                    allocatedAmount: parseFloat(paymentData.amount)
                }];
                apiPaymentData.purchaseInvoiceId = paymentData.purchaseInvoiceId;
            } else if (paymentData.selectedInvoices && Array.isArray(paymentData.selectedInvoices)) {
                purchaseInvoiceAllocations = this.processSelectedInvoicesForPayment(
                    paymentData.selectedInvoices,
                    paymentData.amount
                );
            } else if (paymentData.allocations && Array.isArray(paymentData.allocations)) {
                purchaseInvoiceAllocations = paymentData.allocations.map(allocation => ({
                    purchaseInvoiceId: allocation.purchaseInvoiceId || allocation.invoiceId,
                    invoiceNumber: allocation.invoiceNumber || allocation.purchaseNumber,
                    allocatedAmount: parseFloat(allocation.allocatedAmount || allocation.amount || 0)
                }));
            }

            const validAllocations = purchaseInvoiceAllocations.filter(alloc =>
                alloc.purchaseInvoiceId && alloc.allocatedAmount > 0
            );

            if (validAllocations.length > 0) {
                apiPaymentData.purchaseInvoiceAllocations = validAllocations;
                apiPaymentData.allocations = validAllocations;

                if (validAllocations.length === 1) {
                    apiPaymentData.purchaseInvoiceId = validAllocations[0].purchaseInvoiceId;
                    apiPaymentData.invoiceId = validAllocations[0].purchaseInvoiceId;
                }
            }

            const response = await this.apiCall('/payments/pay-out', {
                method: 'POST',
                body: JSON.stringify(apiPaymentData)
            });

            if (response.success) {
                const responseAllocations = response.data.purchaseInvoiceAllocations ||
                    response.data.invoiceAllocations ||
                    response.data.allocations ||
                    [];

                return {
                    success: true,
                    data: {
                        _id: response.data.payment?._id || response.data._id,
                        paymentId: response.data.payment?._id || response.data._id,
                        paymentNumber: response.data.payment?.paymentNumber || response.data.paymentNumber,
                        amount: response.data.payment?.amount || response.data.amount,
                        paymentMethod: response.data.payment?.paymentMethod || response.data.paymentMethod,
                        paymentDate: response.data.payment?.paymentDate || response.data.paymentDate,
                        partyName: paymentData.partyName,
                        status: response.data.payment?.status || response.data.status || 'completed',
                        createdAt: response.data.payment?.createdAt || response.data.createdAt,
                        party: response.data.party,

                        bankTransaction: response.data.bankTransaction || response.data.transaction ? {
                            _id: (response.data.bankTransaction || response.data.transaction)._id,
                            transactionNumber: (response.data.bankTransaction || response.data.transaction).transactionNumber,
                            transactionType: (response.data.bankTransaction || response.data.transaction).transactionType,
                            amount: (response.data.bankTransaction || response.data.transaction).amount,
                            balance: (response.data.bankTransaction || response.data.transaction).balance,
                            bankName: (response.data.bankTransaction || response.data.transaction).bankName,
                            accountName: (response.data.bankTransaction || response.data.transaction).accountName,
                            description: (response.data.bankTransaction || response.data.transaction).description,
                            reference: (response.data.bankTransaction || response.data.transaction).reference,
                            category: (response.data.bankTransaction || response.data.transaction).category,
                            status: (response.data.bankTransaction || response.data.transaction).status
                        } : null,

                        bankAccount: response.data.bankAccount ? {
                            _id: response.data.bankAccount._id,
                            bankName: response.data.bankAccount.bankName,
                            accountName: response.data.bankAccount.accountName,
                            accountNumber: response.data.bankAccount.accountNumber,
                            currentBalance: response.data.bankAccount.currentBalance
                        } : null,

                        purchaseInvoiceAllocations: responseAllocations,
                        invoiceAllocations: responseAllocations,
                        allocations: responseAllocations,
                        remainingAmount: response.data.remainingAmount || 0,
                        totalInvoicesUpdated: response.data.totalInvoicesUpdated ||
                            response.data.invoicesUpdated ||
                            responseAllocations.length,
                        partyBalance: response.data.partyBalance || response.data.party?.currentBalance || 0,

                        allocationSummary: {
                            totalAllocated: responseAllocations.reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0),
                            invoicesUpdated: response.data.totalInvoicesUpdated ||
                                response.data.invoicesUpdated ||
                                responseAllocations.length,
                            remainingAmount: response.data.remainingAmount || 0,
                            invoiceDetails: responseAllocations
                        }
                    },
                    message: response.message || 'Payment made successfully',

                    details: {
                        paymentAmount: parseFloat(paymentData.amount),
                        invoicesUpdated: response.data.totalInvoicesUpdated ||
                            response.data.invoicesUpdated ||
                            responseAllocations.length,
                        totalAllocated: responseAllocations.reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0),
                        remainingAmount: response.data.remainingAmount || 0,
                        bankTransactionCreated: !!(response.data.bankTransaction || response.data.transaction),
                        bankTransactionNumber: (response.data.bankTransaction || response.data.transaction)?.transactionNumber || null,
                        newBankBalance: response.data.bankAccount?.currentBalance || null,
                        invoiceList: responseAllocations.map(alloc => ({
                            invoiceNumber: alloc.invoiceNumber || alloc.purchaseNumber,
                            allocatedAmount: alloc.allocatedAmount,
                            paymentStatus: alloc.paymentStatus
                        }))
                    }
                };
            } else {
                throw new Error(response.message || 'Failed to create payment out');
            }

        } catch (error) {
            throw error;
        }
    }

    formatPaymentSuccessMessage(paymentResult) {
        const { data, details } = paymentResult;
        let message = `Payment ${data.paymentNumber} of ₹${details.paymentAmount.toLocaleString('en-IN')} `;

        if (details.bankTransactionCreated) {
            message += `processed via ${data.bankAccount?.bankName || 'bank'} `;
            if (details.bankTransactionNumber) {
                message += `(Transaction: ${details.bankTransactionNumber}) `;
            }
        } else {
            message += 'processed ';
        }

        if (details.invoicesUpdated > 0) {
            message += `and allocated to ${details.invoicesUpdated} invoice(s). `;
            if (details.remainingAmount > 0) {
                message += `₹${details.remainingAmount.toLocaleString('en-IN')} remains as advance.`;
            }
        } else {
            message += 'as advance payment.';
        }

        if (details.newBankBalance !== null) {
            message += ` New bank balance: ₹${details.newBankBalance.toLocaleString('en-IN')}.`;
        }

        return message;
    }

    processSelectedInvoicesForPayment(selectedInvoices, paymentAmount) {
        if (!selectedInvoices || !Array.isArray(selectedInvoices) || selectedInvoices.length === 0) {
            return [];
        }

        const totalPaymentAmount = parseFloat(paymentAmount);
        let remainingAmount = totalPaymentAmount;
        const allocations = [];

        selectedInvoices.forEach((invoice, index) => {
            const invoiceId = invoice._id || invoice.id;
            const invoiceNumber = invoice.invoiceNumber || invoice.purchaseNumber || `INV-${invoiceId}`;
            const dueAmount = parseFloat(invoice.dueAmount || invoice.pendingAmount || 0);

            let allocatedAmount = 0;

            if (invoice.allocatedAmount !== undefined && invoice.allocatedAmount > 0) {
                allocatedAmount = parseFloat(invoice.allocatedAmount);
            } else if (invoice.selectedAmount !== undefined && invoice.selectedAmount > 0) {
                allocatedAmount = parseFloat(invoice.selectedAmount);
            } else if (invoice.allocationAmount !== undefined && invoice.allocationAmount > 0) {
                allocatedAmount = parseFloat(invoice.allocationAmount);
            } else if ((invoice.isSelected || invoice.selected) && dueAmount > 0) {
                allocatedAmount = Math.min(dueAmount, remainingAmount);
            } else {
                return;
            }

            if (allocatedAmount > 0 && allocatedAmount <= dueAmount && allocatedAmount <= remainingAmount) {
                allocations.push({
                    purchaseInvoiceId: invoiceId,
                    invoiceNumber: invoiceNumber,
                    allocatedAmount: allocatedAmount,
                    originalDueAmount: dueAmount,
                    remainingDue: dueAmount - allocatedAmount
                });

                remainingAmount -= allocatedAmount;
            }
        });

        return allocations;
    }

    getPaymentMethodInfo(paymentMethod) {
        const methods = {
            cash: {
                label: 'Cash',
                requiresBank: false,
                icon: '💵',
                description: 'Cash payment - no bank account required'
            },
            bank_transfer: {
                label: 'Bank Transfer',
                requiresBank: true,
                icon: '🏦',
                description: 'Electronic bank transfer - bank account required'
            },
            cheque: {
                label: 'Cheque',
                requiresBank: true,
                icon: '📝',
                description: 'Cheque payment - bank account required'
            },
            card: {
                label: 'Card Payment',
                requiresBank: true,
                icon: '💳',
                description: 'Credit/Debit card payment - bank account required'
            },
            upi: {
                label: 'UPI Payment',
                requiresBank: true,
                icon: '📱',
                description: 'UPI payment - bank account required'
            },
            other: {
                label: 'Other',
                requiresBank: false,
                icon: '💼',
                description: 'Other payment method'
            }
        };

        return methods[paymentMethod] || methods.other;
    }

    validatePaymentData(paymentData) {
        const errors = [];

        if (!paymentData.companyId) {
            errors.push('Company ID is required');
        }

        if (!paymentData.partyId) {
            errors.push('Party ID is required');
        }

        if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
            errors.push('Valid payment amount is required');
        }

        if (!paymentData.paymentMethod) {
            errors.push('Payment method is required');
        }

        if (paymentData.paymentDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(paymentData.paymentDate)) {
                errors.push('Payment date must be in YYYY-MM-DD format');
            }
        }

        if (paymentData.invoiceAllocations && Array.isArray(paymentData.invoiceAllocations)) {
            paymentData.invoiceAllocations.forEach((allocation, index) => {
                if (!allocation.invoiceId) {
                    errors.push(`Invoice allocation ${index + 1}: Invoice ID is required`);
                }
                if (!allocation.allocatedAmount || parseFloat(allocation.allocatedAmount) <= 0) {
                    errors.push(`Invoice allocation ${index + 1}: Valid allocated amount is required`);
                }
            });
        }

        if (paymentData.purchaseInvoiceAllocations && Array.isArray(paymentData.purchaseInvoiceAllocations)) {
            paymentData.purchaseInvoiceAllocations.forEach((allocation, index) => {
                if (!allocation.purchaseInvoiceId) {
                    errors.push(`Purchase invoice allocation ${index + 1}: Purchase invoice ID is required`);
                }
                if (!allocation.allocatedAmount || parseFloat(allocation.allocatedAmount) <= 0) {
                    errors.push(`Purchase invoice allocation ${index + 1}: Valid allocated amount is required`);
                }
            });
        }

        if (paymentData.selectedPurchaseInvoices && Array.isArray(paymentData.selectedPurchaseInvoices)) {
            const selectedInvoices = paymentData.selectedPurchaseInvoices.filter(inv =>
                inv.selected || inv.isSelected || (inv.allocatedAmount && inv.allocatedAmount > 0)
            );

            selectedInvoices.forEach((invoice, index) => {
                if (!invoice._id && !invoice.id) {
                    errors.push(`Selected invoice ${index + 1}: Invoice ID is required`);
                }
                const allocatedAmount = parseFloat(
                    invoice.allocatedAmount ||
                    invoice.selectedAmount ||
                    invoice.allocationAmount ||
                    0
                );
                if (allocatedAmount <= 0) {
                    errors.push(`Selected invoice ${index + 1}: Valid allocated amount is required`);
                }
            });
        }

        if (errors.length > 0) {
            throw new Error(`Payment validation failed: ${errors.join(', ')}`);
        }

        return true;
    }

    getPaymentMethods() {
        return [
            { value: 'cash', label: 'Cash' },
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'cheque', label: 'Cheque' },
            { value: 'card', label: 'Card Payment' },
            { value: 'upi', label: 'UPI Payment' },
            { value: 'other', label: 'Other' }
        ];
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    }

    formatDateForAPI(date) {
        if (!date) return new Date().toISOString().split('T')[0];
        if (date instanceof Date) return date.toISOString().split('T')[0];
        return date;
    }

    formatAllocationSummary(allocationData) {
        if (!allocationData || !allocationData.invoiceAllocations) {
            return {
                hasAllocations: false,
                message: 'No invoice allocations found',
                totalAllocated: 0,
                remainingAmount: 0,
                invoiceDetails: []
            };
        }

        const allocations = allocationData.invoiceAllocations;
        const totalAllocated = allocations.reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0);

        return {
            hasAllocations: allocations.length > 0,
            message: `Payment allocated to ${allocations.length} invoice(s)`,
            totalAllocated: totalAllocated,
            remainingAmount: allocationData.remainingAmount || 0,
            invoiceCount: allocations.length,
            invoiceDetails: allocations.map(alloc => ({
                invoiceNumber: alloc.invoiceNumber,
                allocatedAmount: alloc.allocatedAmount,
                formattedAmount: this.formatCurrency(alloc.allocatedAmount),
                paymentStatus: alloc.paymentStatus || 'updated'
            })),
            summary: {
                totalPayment: totalAllocated + (allocationData.remainingAmount || 0),
                totalAllocated: totalAllocated,
                remainingAmount: allocationData.remainingAmount || 0,
                formattedTotal: this.formatCurrency(totalAllocated + (allocationData.remainingAmount || 0)),
                formattedAllocated: this.formatCurrency(totalAllocated),
                formattedRemaining: this.formatCurrency(allocationData.remainingAmount || 0)
            }
        };
    }

    formatPurchaseInvoiceAllocationSummary(allocationData) {
        if (!allocationData || !allocationData.purchaseInvoiceAllocations) {
            return {
                hasAllocations: false,
                message: 'No purchase invoice allocations found',
                totalAllocated: 0,
                remainingAmount: 0,
                invoiceDetails: []
            };
        }

        const allocations = allocationData.purchaseInvoiceAllocations;
        const totalAllocated = allocations.reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0);

        return {
            hasAllocations: allocations.length > 0,
            message: `Payment allocated to ${allocations.length} purchase invoice(s)`,
            totalAllocated: totalAllocated,
            remainingAmount: allocationData.remainingAmount || 0,
            invoiceCount: allocations.length,
            invoiceDetails: allocations.map(alloc => ({
                invoiceNumber: alloc.invoiceNumber || alloc.purchaseNumber,
                allocatedAmount: alloc.allocatedAmount,
                formattedAmount: this.formatCurrency(alloc.allocatedAmount),
                paymentStatus: alloc.paymentStatus || 'updated'
            })),
            summary: {
                totalPayment: totalAllocated + (allocationData.remainingAmount || 0),
                totalAllocated: totalAllocated,
                remainingAmount: allocationData.remainingAmount || 0,
                formattedTotal: this.formatCurrency(totalAllocated + (allocationData.remainingAmount || 0)),
                formattedAllocated: this.formatCurrency(totalAllocated),
                formattedRemaining: this.formatCurrency(allocationData.remainingAmount || 0)
            }
        };
    }

    async getPendingInvoicesForPayment(companyId, partyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!partyId) {
                throw new Error('Party ID is required');
            }

            const queryParams = new URLSearchParams({
                companyId: companyId
            });

            const response = await this.apiCall(`/payments/pending-invoices/${partyId}?${queryParams}`, {
                method: 'GET'
            });

            if (response.success) {
                const invoices = response.data.invoices || response.data.salesOrders || response.data.orders || [];

                return {
                    success: true,
                    data: {
                        invoices: invoices,
                        salesOrders: invoices,
                        orders: invoices,
                        totalInvoices: invoices.length,
                        totalDueAmount: invoices.reduce((sum, inv) => sum + (inv.dueAmount || 0), 0),
                        party: response.data.party
                    },
                    message: response.message || 'Pending sales invoices fetched successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to fetch pending sales invoices');
            }

        } catch (error) {
            throw error;
        }
    }

    async getPendingPurchaseInvoicesForPayment(companyId, partyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            if (!partyId) {
                throw new Error('Party ID is required');
            }

            const queryParams = new URLSearchParams({
                companyId: companyId
            });

            const response = await this.apiCall(`/payments/pending-purchase-invoices/${partyId}?${queryParams}`, {
                method: 'GET'
            });

            if (response.success) {
                const invoices = response.data.purchaseInvoices ||
                    response.data.invoices ||
                    response.data.purchases ||
                    response.data.data ||
                    [];

                const processedInvoices = invoices.map(invoice => {
                    const totalAmount = parseFloat(invoice.totalAmount || 0);
                    const paidAmount = parseFloat(invoice.paidAmount || 0);
                    const dueAmount = parseFloat(invoice.dueAmount || Math.max(0, totalAmount - paidAmount));

                    return {
                        ...invoice,
                        _id: invoice._id || invoice.id,
                        id: invoice._id || invoice.id,
                        invoiceNumber: invoice.invoiceNumber || invoice.purchaseNumber || `PUR-${invoice._id}`,
                        purchaseNumber: invoice.purchaseNumber || invoice.invoiceNumber || `PUR-${invoice._id}`,
                        totalAmount: totalAmount,
                        paidAmount: paidAmount,
                        dueAmount: dueAmount,
                        pendingAmount: dueAmount,
                        displayText: `#${invoice.invoiceNumber || invoice.purchaseNumber || `PUR-${invoice._id}`} - ₹${totalAmount.toLocaleString('en-IN')} (Due: ₹${dueAmount.toLocaleString('en-IN')})`,
                        formattedTotalAmount: totalAmount.toLocaleString('en-IN'),
                        formattedDueAmount: dueAmount.toLocaleString('en-IN'),
                        formattedPaidAmount: paidAmount.toLocaleString('en-IN'),
                        invoiceDate: invoice.invoiceDate || invoice.purchaseDate || invoice.createdAt,
                        purchaseDate: invoice.purchaseDate || invoice.invoiceDate || invoice.createdAt,
                        displayDate: invoice.invoiceDate || invoice.purchaseDate || invoice.createdAt,
                        selected: false,
                        isSelected: false,
                        allocatedAmount: 0
                    };
                });

                const pendingInvoices = processedInvoices.filter(invoice => invoice.dueAmount > 0);

                return {
                    success: true,
                    data: {
                        purchaseInvoices: pendingInvoices,
                        invoices: pendingInvoices,
                        purchases: pendingInvoices,
                        data: pendingInvoices,
                        totalInvoices: pendingInvoices.length,
                        totalDueAmount: pendingInvoices.reduce((sum, invoice) => sum + (invoice.dueAmount || 0), 0),
                        party: response.data.party
                    },
                    message: response.message || `Found ${pendingInvoices.length} pending purchase invoices`
                };
            } else {
                throw new Error(response.message || 'Failed to fetch pending purchase invoices');
            }

        } catch (error) {
            throw error;
        }
    }

    async getPaymentAllocations(paymentId) {
        try {
            if (!paymentId) {
                throw new Error('Payment ID is required');
            }

            const response = await this.apiCall(`/payments/${paymentId}/allocations`, {
                method: 'GET'
            });

            if (response.success) {
                return {
                    success: true,
                    data: {
                        payment: response.data.payment,
                        allocations: response.data.allocations || [],
                        totalAllocatedAmount: response.data.totalAllocatedAmount || 0,
                        remainingAmount: response.data.remainingAmount || 0
                    },
                    message: response.message || 'Payment allocation details retrieved successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to fetch payment allocation details');
            }

        } catch (error) {
            throw error;
        }
    }

    async getPaymentOutAllocations(paymentId) {
        try {
            if (!paymentId) {
                throw new Error('Payment ID is required');
            }

            const response = await this.apiCall(`/payments/${paymentId}/purchase-invoice-allocations`, {
                method: 'GET'
            });

            if (response.success) {
                return {
                    success: true,
                    data: {
                        payment: response.data.payment,
                        allocations: response.data.allocations || [],
                        totalAllocatedAmount: response.data.totalAllocatedAmount || 0,
                        remainingAmount: response.data.remainingAmount || 0
                    },
                    message: response.message || 'Payment allocation details retrieved successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to fetch payment allocation details');
            }

        } catch (error) {
            throw error;
        }
    }

    async getBankAccounts(companyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const response = await this.apiCall(`/bank-accounts?companyId=${companyId}`, {
                method: 'GET'
            });

            const bankAccounts = response.data?.bankAccounts ||
                response.bankAccounts ||
                response.data ||
                response ||
                [];

            return {
                success: true,
                data: bankAccounts,
                message: 'Bank accounts fetched successfully'
            };

        } catch (error) {
            throw error;
        }
    }

    async getPaymentHistory(companyId, filters = {}) {
        try {
            const queryParams = new URLSearchParams({
                page: filters.page || 1,
                limit: filters.limit || 100,
                sortBy: filters.sortBy || 'paymentDate',
                sortOrder: filters.sortOrder || 'desc'
            });

            if (filters.paymentType) queryParams.append('paymentType', filters.paymentType);
            if (filters.partyId) queryParams.append('partyId', filters.partyId);
            if (filters.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);

            const endpoint = `/payments?${queryParams.toString()}`;

            const response = await this.apiCall(endpoint, {
                method: 'GET'
            });

            if (response && response.success) {
                let payments = [];

                if (response.data && response.data.payments && Array.isArray(response.data.payments)) {
                    payments = response.data.payments;
                } else if (response.data && Array.isArray(response.data)) {
                    payments = response.data;
                } else if (response.payments && Array.isArray(response.payments)) {
                    payments = response.payments;
                } else if (Array.isArray(response)) {
                    payments = response;
                }

                if (filters.partyId && payments.length > 0) {
                    const originalCount = payments.length;
                    payments = payments.filter(payment => {
                        const paymentPartyId = payment.party || payment.partyId;
                        const match = paymentPartyId === filters.partyId ||
                            paymentPartyId?.toString() === filters.partyId?.toString();
                        return match;
                    });
                }

                const processedPayments = payments.map(payment => ({
                    ...payment,
                    id: payment._id || payment.id,
                    type: payment.type || payment.paymentType || (payment.amount > 0 ? 'payment_in' : 'payment_out'),
                    amount: parseFloat(payment.amount || 0),
                    paymentDate: payment.paymentDate || payment.createdAt,
                    paymentMethod: payment.paymentMethod || 'cash',
                    reference: payment.reference || payment.paymentNumber || `PAY-${(payment._id || payment.id)?.toString().substring(0, 8)}`,
                    status: payment.status || 'completed',
                    notes: payment.notes || '',
                    partyName: payment.partyName || '',
                    employeeName: payment.employeeName || '',
                    companyId: payment.companyId || payment.company,
                    partyId: payment.partyId || payment.party
                }));

                const pagination = response.data?.pagination || response.pagination || {
                    page: parseInt(filters.page || 1),
                    limit: parseInt(filters.limit || 100),
                    totalRecords: processedPayments.length,
                    totalPages: Math.ceil(processedPayments.length / parseInt(filters.limit || 100))
                };

                return {
                    success: true,
                    data: processedPayments,
                    payments: processedPayments,
                    total: pagination.totalRecords || processedPayments.length,
                    pagination: pagination,
                    message: processedPayments.length > 0
                        ? `${processedPayments.length} payments retrieved successfully`
                        : 'No payments found for the specified criteria'
                };
            } else {
                return {
                    success: true,
                    data: [],
                    payments: [],
                    total: 0,
                    pagination: {},
                    message: response?.message || 'No payments found'
                };
            }

        } catch (error) {
            return {
                success: false,
                data: [],
                payments: [],
                total: 0,
                pagination: {},
                message: error.message || 'Failed to load payment history',
                error: error.message
            };
        }
    }

    async getPartyPaymentHistory(companyId, partyId, options = {}) {
        try {
            if (!partyId) {
                throw new Error('Party ID is required');
            }

            const filters = {
                ...options,
                partyId: partyId,
                limit: options.limit || 100,
                sortBy: options.sortBy || 'paymentDate',
                sortOrder: options.sortOrder || 'desc'
            };

            const result = await this.getPaymentHistory(null, filters);

            return result;

        } catch (error) {
            return {
                success: false,
                data: [],
                payments: [],
                total: 0,
                pagination: {},
                message: error.message || 'Failed to load party payment history',
                error: error.message
            };
        }
    }

    async getPartyPaymentSummary(companyId, partyId) {
        try {
            if (!companyId || !partyId) {
                throw new Error('Company ID and Party ID are required');
            }

            const response = await this.apiCall(`/payments/party/${partyId}/summary?companyId=${companyId}`, {
                method: 'GET'
            });

            if (response && response.success) {
                return {
                    success: true,
                    data: response.data || response.summary || {},
                    message: response.message || 'Payment summary retrieved successfully'
                };
            } else {
                const historyResult = await this.getPartyPaymentHistory(companyId, partyId);

                if (historyResult.success && historyResult.data.length > 0) {
                    const payments = historyResult.data;
                    const summary = {
                        totalPayments: payments.length,
                        totalPaymentsIn: payments.filter(p => p.type === 'payment_in').reduce((sum, p) => sum + p.amount, 0),
                        totalPaymentsOut: payments.filter(p => p.type === 'payment_out').reduce((sum, p) => sum + p.amount, 0),
                        netAmount: 0
                    };
                    summary.netAmount = summary.totalPaymentsIn - summary.totalPaymentsOut;

                    return {
                        success: true,
                        data: summary,
                        message: 'Payment summary calculated from history'
                    };
                }

                return {
                    success: true,
                    data: {
                        totalPayments: 0,
                        totalPaymentsIn: 0,
                        totalPaymentsOut: 0,
                        netAmount: 0
                    },
                    message: 'No payment data found'
                };
            }

        } catch (error) {
            return {
                success: false,
                data: {
                    totalPayments: 0,
                    totalPaymentsIn: 0,
                    totalPaymentsOut: 0,
                    netAmount: 0
                },
                message: error.message || 'Failed to load payment summary',
                error: error.message
            };
        }
    }

    calculatePaymentAllocation(invoices, paymentAmount) {
        let remainingAmount = parseFloat(paymentAmount);
        const allocations = [];

        const sortedInvoices = [...invoices].sort((a, b) => {
            const dateA = new Date(a.orderDate || a.createdAt);
            const dateB = new Date(b.orderDate || b.createdAt);
            return dateA - dateB;
        });

        for (const invoice of sortedInvoices) {
            if (remainingAmount <= 0) break;

            const dueAmount = parseFloat(invoice.dueAmount || 0);
            const allocationAmount = Math.min(remainingAmount, dueAmount);

            if (allocationAmount > 0) {
                allocations.push({
                    invoiceId: invoice._id || invoice.id,
                    orderNumber: invoice.orderNumber || invoice.saleNumber,
                    dueAmount: dueAmount,
                    allocationAmount: allocationAmount,
                    remainingDue: dueAmount - allocationAmount
                });

                remainingAmount -= allocationAmount;
            }
        }

        return {
            allocations,
            remainingAmount,
            totalAllocated: parseFloat(paymentAmount) - remainingAmount
        };
    }

    calculatePurchaseInvoicePaymentAllocation(invoices, paymentAmount) {
        let remainingAmount = parseFloat(paymentAmount);
        const allocations = [];

        const sortedInvoices = [...invoices].sort((a, b) => {
            const dateA = new Date(a.invoiceDate || a.purchaseDate || a.createdAt);
            const dateB = new Date(b.invoiceDate || b.purchaseDate || b.createdAt);
            return dateA - dateB;
        });

        for (const invoice of sortedInvoices) {
            if (remainingAmount <= 0) break;

            const dueAmount = parseFloat(invoice.dueAmount || 0);
            const allocationAmount = Math.min(remainingAmount, dueAmount);

            if (allocationAmount > 0) {
                allocations.push({
                    purchaseInvoiceId: invoice._id || invoice.id,
                    invoiceNumber: invoice.invoiceNumber || invoice.purchaseNumber,
                    dueAmount: dueAmount,
                    allocationAmount: allocationAmount,
                    remainingDue: dueAmount - allocationAmount
                });

                remainingAmount -= allocationAmount;
            }
        }

        return {
            allocations,
            remainingAmount,
            totalAllocated: parseFloat(paymentAmount) - remainingAmount
        };
    }

    validateInvoiceAllocations(selectedInvoices, paymentAmount) {
        const errors = [];
        const warnings = [];

        if (!selectedInvoices || !Array.isArray(selectedInvoices)) {
            return {
                isValid: false,
                errors: ['No invoices selected for allocation'],
                warnings: []
            };
        }

        const totalPaymentAmount = parseFloat(paymentAmount);
        let totalAllocated = 0;

        selectedInvoices.forEach((invoice, index) => {
            const allocatedAmount = parseFloat(
                invoice.allocatedAmount ||
                invoice.selectedAmount ||
                invoice.allocationAmount ||
                0
            );
            const dueAmount = parseFloat(invoice.dueAmount || 0);

            if (allocatedAmount > dueAmount) {
                errors.push(`Invoice ${index + 1}: Allocated amount (₹${allocatedAmount}) exceeds due amount (₹${dueAmount})`);
            }

            if (allocatedAmount <= 0) {
                warnings.push(`Invoice ${index + 1}: No amount allocated`);
            }

            totalAllocated += allocatedAmount;
        });

        if (totalAllocated > totalPaymentAmount) {
            errors.push(`Total allocated amount (₹${totalAllocated}) exceeds payment amount (₹${totalPaymentAmount})`);
        }

        const remainingAmount = totalPaymentAmount - totalAllocated;
        if (remainingAmount > 0) {
            warnings.push(`₹${remainingAmount} will remain unallocated`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            summary: {
                totalPaymentAmount,
                totalAllocated,
                remainingAmount,
                selectedInvoicesCount: selectedInvoices.length,
                validAllocationsCount: selectedInvoices.filter(inv =>
                    parseFloat(inv.allocatedAmount || inv.selectedAmount || 0) > 0
                ).length
            }
        };
    }

    autoAllocatePaymentToInvoices(invoices, paymentAmount) {
        if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
            return [];
        }

        const totalPaymentAmount = parseFloat(paymentAmount);
        let remainingAmount = totalPaymentAmount;

        const sortedInvoices = [...invoices].sort((a, b) => {
            const dateA = new Date(a.invoiceDate || a.purchaseDate || a.createdAt);
            const dateB = new Date(b.invoiceDate || b.purchaseDate || b.createdAt);
            return dateA - dateB;
        });

        const allocatedInvoices = sortedInvoices.map(invoice => {
            const dueAmount = parseFloat(invoice.dueAmount || 0);
            let allocatedAmount = 0;

            if (remainingAmount > 0 && dueAmount > 0) {
                allocatedAmount = Math.min(remainingAmount, dueAmount);
                remainingAmount -= allocatedAmount;
            }

            return {
                ...invoice,
                selected: allocatedAmount > 0,
                isSelected: allocatedAmount > 0,
                allocatedAmount: allocatedAmount,
                selectedAmount: allocatedAmount,
                allocationAmount: allocatedAmount
            };
        });

        return allocatedInvoices;
    }

    // Update the updateTransaction method in paymentService.js
    async updateTransaction(transactionId, updateData) {
        try {
            if (!transactionId) {
                throw new Error('Transaction ID is required');
            }

            // Validate required fields
            if (!updateData.amount || parseFloat(updateData.amount) <= 0) {
                throw new Error('Valid amount is required');
            }

            if (!updateData.paymentMethod) {
                throw new Error('Payment method is required');
            }

            if (!updateData.paymentDate) {
                throw new Error('Payment date is required');
            }

            // Prepare update payload
            const updatePayload = {
                amount: parseFloat(updateData.amount),
                paymentMethod: updateData.paymentMethod,
                paymentDate: this.formatDateForAPI(updateData.paymentDate),
                reference: updateData.reference || '',
                notes: updateData.notes || '',
                status: updateData.status || 'completed',
                adjustInvoiceAllocations: updateData.adjustInvoiceAllocations !== false, // Default to true
                employeeName: updateData.employeeName || '',
                employeeId: updateData.employeeId || ''
            };

            // Add bank account if provided and not cash
            if (updateData.paymentMethod !== 'cash' && updateData.bankAccountId) {
                updatePayload.bankAccountId = updateData.bankAccountId;
            }

            // Add clearing date for cheque payments
            if (updateData.clearingDate) {
                updatePayload.clearingDate = this.formatDateForAPI(updateData.clearingDate);
            }

            console.log('🔄 Sending transaction update request:', {
                transactionId: transactionId,
                payload: updatePayload
            });

            const response = await this.apiCall(`/payments/transactions/${transactionId}`, {
                method: 'PUT',
                body: JSON.stringify(updatePayload)
            });

            console.log('✅ Transaction update response:', response);

            if (response.success) {
                // Enhanced response handling
                const transaction = response.data || response.transaction;
                const changes = response.changes || {};
                const invoiceAllocationUpdates = response.invoiceAllocationUpdates || [];
                const warnings = response.warnings || [];

                let successMessage = response.message || 'Transaction updated successfully';

                // Add allocation update info to message
                if (invoiceAllocationUpdates.length > 0) {
                    successMessage += `. ${invoiceAllocationUpdates.length} invoice allocation(s) updated.`;
                }

                // Add bank update info
                if (response.bankTransactionUpdated) {
                    successMessage += ' Bank account balances adjusted.';
                }

                // Add warnings if any
                if (warnings.length > 0) {
                    console.warn('⚠️ Transaction update warnings:', warnings);
                }

                return {
                    success: true,
                    data: {
                        transaction: transaction,
                        changes: changes,
                        bankTransactionUpdated: response.bankTransactionUpdated || false,
                        invoiceAllocationsUpdated: response.invoiceAllocationsUpdated || false,
                        invoiceAllocationUpdates: invoiceAllocationUpdates,
                        bankAccount: response.bankAccount || null,
                        updatedAt: new Date().toISOString()
                    },
                    message: successMessage,
                    warnings: warnings,
                    details: {
                        amountChanged: changes.amountChanged || false,
                        paymentMethodChanged: changes.paymentMethodChanged || false,
                        bankAccountChanged: changes.bankAccountChanged || false,
                        originalAmount: changes.originalAmount || 0,
                        newAmount: changes.newAmount || 0,
                        amountDifference: changes.amountDifference || 0,
                        invoiceAllocationsAdjusted: changes.invoiceAllocationsAdjusted || 0
                    }
                };
            } else {
                throw new Error(response.message || 'Failed to update transaction');
            }

        } catch (error) {
            console.error('❌ Transaction update error:', error);
            throw new Error(error.message || 'Failed to update transaction');
        }
    }

    // Delete/Cancel Transaction
    async deleteTransaction(transactionId, reason = '') {
        try {
            if (!transactionId) {
                throw new Error('Transaction ID is required');
            }

            const deletePayload = {
                reason: reason || 'Transaction deleted by user'
            };

            const response = await this.apiCall(`/payments/transactions/${transactionId}`, {
                method: 'DELETE',
                body: JSON.stringify(deletePayload)
            });

            if (response.success) {
                return {
                    success: true,
                    data: {
                        transactionId: response.data.transactionId,
                        paymentNumber: response.data.paymentNumber,
                        status: response.data.status,
                        cancelReason: response.data.cancelReason,
                        cancelledAt: response.data.cancelledAt
                    },
                    message: response.message || 'Transaction cancelled successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to cancel transaction');
            }

        } catch (error) {
            throw new Error(error.message || 'Failed to cancel transaction');
        }
    }

    // Get Transaction Details
    async getTransactionDetails(transactionId) {
        try {
            if (!transactionId) {
                throw new Error('Transaction ID is required');
            }

            const response = await this.apiCall(`/payments/${transactionId}`, {
                method: 'GET'
            });

            if (response.success) {
                return {
                    success: true,
                    data: response.data.payment || response.data,
                    message: response.message || 'Transaction details retrieved successfully'
                };
            } else {
                throw new Error(response.message || 'Failed to fetch transaction details');
            }

        } catch (error) {
            throw new Error(error.message || 'Failed to fetch transaction details');
        }
    }

    // Validate Transaction Update Data
    validateTransactionUpdate(updateData) {
        const errors = [];

        if (!updateData.amount || parseFloat(updateData.amount) <= 0) {
            errors.push('Valid amount is required');
        }

        if (!updateData.paymentMethod) {
            errors.push('Payment method is required');
        }

        const validPaymentMethods = ['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other'];
        if (!validPaymentMethods.includes(updateData.paymentMethod)) {
            errors.push('Invalid payment method');
        }

        if (!updateData.paymentDate) {
            errors.push('Payment date is required');
        }

        // Validate date format
        if (updateData.paymentDate) {
            const date = new Date(updateData.paymentDate);
            if (isNaN(date.getTime())) {
                errors.push('Invalid payment date format');
            }
        }

        // Bank account required for non-cash payments
        if (updateData.paymentMethod !== 'cash' && !updateData.bankAccountId) {
            errors.push('Bank account is required for non-cash payments');
        }

        // Validate amount range
        const amount = parseFloat(updateData.amount);
        if (amount > 10000000) { // 1 crore limit
            errors.push('Amount cannot exceed ₹1,00,00,000');
        }

        // Validate clearing date for cheque
        if (updateData.paymentMethod === 'cheque' && updateData.clearingDate) {
            const clearingDate = new Date(updateData.clearingDate);
            const paymentDate = new Date(updateData.paymentDate);
            if (clearingDate < paymentDate) {
                errors.push('Clearing date cannot be before payment date');
            }
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }

        return true;
    }

    // Format Transaction Update Data
    formatTransactionUpdateData(formData) {
        return {
            amount: parseFloat(formData.amount || 0),
            paymentMethod: formData.paymentMethod || 'cash',
            paymentDate: this.formatDateForAPI(formData.paymentDate || new Date()),
            reference: (formData.reference || '').trim(),
            notes: (formData.notes || '').trim(),
            status: formData.status || 'completed',
            bankAccountId: formData.bankAccountId || null,
            clearingDate: formData.clearingDate ? this.formatDateForAPI(formData.clearingDate) : null
        };
    }

    // Get Transaction Update Summary
    getTransactionUpdateSummary(originalData, updatedData) {
        const changes = [];
        const summary = {
            hasChanges: false,
            changedFields: [],
            originalValues: {},
            newValues: {},
            impactSummary: []
        };

        // Check amount change
        if (parseFloat(originalData.amount) !== parseFloat(updatedData.amount)) {
            changes.push('Amount');
            summary.originalValues.amount = parseFloat(originalData.amount);
            summary.newValues.amount = parseFloat(updatedData.amount);
            summary.impactSummary.push(
                `Amount changed from ₹${originalData.amount.toLocaleString('en-IN')} to ₹${updatedData.amount.toLocaleString('en-IN')}`
            );
        }

        // Check payment method change
        if (originalData.paymentMethod !== updatedData.paymentMethod) {
            changes.push('Payment Method');
            summary.originalValues.paymentMethod = originalData.paymentMethod;
            summary.newValues.paymentMethod = updatedData.paymentMethod;
            summary.impactSummary.push(
                `Payment method changed from ${originalData.paymentMethod} to ${updatedData.paymentMethod}`
            );
        }

        // Check date change
        const originalDate = new Date(originalData.paymentDate).toDateString();
        const newDate = new Date(updatedData.paymentDate).toDateString();
        if (originalDate !== newDate) {
            changes.push('Payment Date');
            summary.originalValues.paymentDate = originalData.paymentDate;
            summary.newValues.paymentDate = updatedData.paymentDate;
            summary.impactSummary.push(
                `Payment date changed from ${originalDate} to ${newDate}`
            );
        }

        // Check bank account change
        if (originalData.bankAccountId !== updatedData.bankAccountId) {
            changes.push('Bank Account');
            summary.originalValues.bankAccountId = originalData.bankAccountId;
            summary.newValues.bankAccountId = updatedData.bankAccountId;
            summary.impactSummary.push('Bank account updated - balances will be adjusted');
        }

        // Check reference change
        if ((originalData.reference || '') !== (updatedData.reference || '')) {
            changes.push('Reference');
            summary.originalValues.reference = originalData.reference;
            summary.newValues.reference = updatedData.reference;
        }

        // Check notes change
        if ((originalData.notes || '') !== (updatedData.notes || '')) {
            changes.push('Notes');
            summary.originalValues.notes = originalData.notes;
            summary.newValues.notes = updatedData.notes;
        }

        // Check status change
        if (originalData.status !== updatedData.status) {
            changes.push('Status');
            summary.originalValues.status = originalData.status;
            summary.newValues.status = updatedData.status;
            summary.impactSummary.push(
                `Status changed from ${originalData.status} to ${updatedData.status}`
            );
        }

        summary.hasChanges = changes.length > 0;
        summary.changedFields = changes;

        return summary;
    }

    // Get Editable Transaction Fields
    getEditableTransactionFields(transaction) {
        const editableFields = {
            amount: true,
            paymentMethod: true,
            paymentDate: true,
            reference: true,
            notes: true,
            bankAccountId: true,
            clearingDate: true,
            status: true
        };

        const restrictions = [];

        // Check if transaction is cancelled
        if (transaction.status === 'cancelled') {
            Object.keys(editableFields).forEach(field => {
                editableFields[field] = false;
            });
            restrictions.push('Transaction is cancelled and cannot be edited');
            return { editableFields, restrictions };
        }

        // Check if transaction is very old (more than 30 days)
        const transactionDate = new Date(transaction.paymentDate || transaction.createdAt);
        const daysDiff = (new Date() - transactionDate) / (1000 * 60 * 60 * 24);

        if (daysDiff > 30) {
            restrictions.push('Transaction is older than 30 days - some restrictions may apply');
        }

        // Check if transaction has allocations
        if (transaction.invoiceAllocations && transaction.invoiceAllocations.length > 0) {
            restrictions.push('Transaction has invoice allocations - amount changes may affect linked invoices');
        }

        // Check if transaction is part of reconciled bank statement
        if (transaction.isReconciled) {
            editableFields.amount = false;
            editableFields.paymentMethod = false;
            editableFields.bankAccountId = false;
            restrictions.push('Transaction is reconciled - financial details cannot be changed');
        }

        return { editableFields, restrictions };
    }

    // Prepare Transaction for Edit
    prepareTransactionForEdit(transaction) {
        return {
            id: transaction._id || transaction.id,
            transactionId: transaction._id || transaction.id,
            amount: parseFloat(transaction.amount || 0),
            paymentMethod: transaction.paymentMethod || 'cash',
            paymentDate: transaction.paymentDate ?
                new Date(transaction.paymentDate).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0],
            reference: transaction.reference || '',
            notes: transaction.notes || '',
            status: transaction.status || 'completed',
            bankAccountId: transaction.bankAccountId || '',
            clearingDate: transaction.clearingDate ?
                new Date(transaction.clearingDate).toISOString().split('T')[0] : '',

            // Additional info for form
            paymentNumber: transaction.paymentNumber || transaction.number,
            partyName: transaction.partyName,
            partyId: transaction.partyId,
            type: transaction.type || transaction.paymentType,
            originalAmount: parseFloat(transaction.amount || 0),
            originalPaymentMethod: transaction.paymentMethod || 'cash',
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
        };
    }

    // Handle Transaction Update Success
    handleTransactionUpdateSuccess(updateResult) {
        const { data, message } = updateResult;

        let successMessage = message || 'Transaction updated successfully';

        if (data.changes) {
            const changedFields = Object.keys(data.changes).filter(key =>
                key.endsWith('Changed') && data.changes[key]
            ).map(key => key.replace('Changed', ''));

            if (changedFields.length > 0) {
                successMessage += `. Updated: ${changedFields.join(', ')}`;
            }
        }

        if (data.bankTransactionUpdated) {
            successMessage += '. Bank account balances have been adjusted.';
        }

        return {
            success: true,
            message: successMessage,
            transaction: data.transaction,
            changes: data.changes || {},
            bankTransactionUpdated: data.bankTransactionUpdated || false,
            updatedAt: data.updatedAt || new Date().toISOString()
        };
    }

    // Handle Transaction Delete Success
    handleTransactionDeleteSuccess(deleteResult) {
        const { data, message } = deleteResult;

        return {
            success: true,
            message: message || 'Transaction cancelled successfully',
            transactionId: data.transactionId,
            paymentNumber: data.paymentNumber,
            cancelledAt: data.cancelledAt,
            cancelReason: data.cancelReason
        };
    }

    // Get Transaction Action Permissions
    getTransactionActionPermissions(transaction, userRole = 'user') {
        const permissions = {
            canView: true,
            canEdit: true,
            canDelete: true,
            canDuplicate: true,
            restrictions: []
        };

        // Check transaction status
        if (transaction.status === 'cancelled') {
            permissions.canEdit = false;
            permissions.canDelete = false;
            permissions.restrictions.push('Transaction is already cancelled');
        }

        // Check transaction age
        const transactionDate = new Date(transaction.paymentDate || transaction.createdAt);
        const daysDiff = (new Date() - transactionDate) / (1000 * 60 * 60 * 24);

        if (daysDiff > 90) {
            if (userRole !== 'admin') {
                permissions.canEdit = false;
                permissions.canDelete = false;
                permissions.restrictions.push('Transaction is older than 90 days - admin access required');
            }
        }

        // Check if reconciled
        if (transaction.isReconciled) {
            permissions.canEdit = false;
            permissions.canDelete = false;
            permissions.restrictions.push('Transaction is reconciled and cannot be modified');
        }

        // Check if has allocations
        if (transaction.invoiceAllocations && transaction.invoiceAllocations.length > 0) {
            permissions.restrictions.push('Transaction has invoice allocations - changes may affect linked invoices');
        }

        return permissions;
    }

}

const paymentService = new PaymentService();
export default paymentService;