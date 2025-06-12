const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Import transaction service
import transactionService from './transactionService.js';

class PurchaseService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Helper method to get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            sessionStorage.getItem('token');

        return {
            'Content-Type': 'application/json',
            ...(token && {
                'Authorization': `Bearer ${token}`,
                'x-auth-token': token  // Add x-auth-token for backend compatibility
            })
        };
    }

    // Helper method for API calls (matching Sales Service)
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        console.log('🔗 Purchase API Call:', url);

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
                console.error('❌ Purchase API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                });

                let errorMessage = data.message || `HTTP error! status: ${response.status}`;

                if (response.status === 400) {
                    errorMessage = data.message || 'Invalid purchase data';
                } else if (response.status === 401) {
                    errorMessage = 'Authentication required. Please login again.';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. You do not have permission for this operation.';
                } else if (response.status === 404) {
                    errorMessage = 'Purchase or resource not found.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }

                throw new Error(errorMessage);
            }

            console.log('✅ Purchase API Success:', data);
            return data;

        } catch (error) {
            console.error('❌ Purchase API Error:', error);
            throw error;
        }
    }

    // ==================== ENHANCED PURCHASE METHODS WITH TRANSACTIONS ====================

    /**
     * Create purchase with automatic transaction (Enhanced Version)
     * @param {Object} purchaseData - Purchase data
     * @returns {Promise<Object>} Created purchase with transaction
     */
    async createPurchaseWithTransaction(purchaseData) {
        console.log('🛒 Creating purchase with transaction:', purchaseData);

        try {
            // Validate required fields for transaction
            if (!purchaseData.companyId) {
                throw new Error('Company ID is required');
            }

            // First create the purchase using existing method
            const purchaseResponse = await this.createPurchase(purchaseData);

            if (!purchaseResponse.success) {
                throw new Error(purchaseResponse.message || 'Failed to create purchase');
            }

            const createdPurchase = purchaseResponse.data;
            console.log('✅ Purchase created successfully:', createdPurchase._id || createdPurchase.id);

            // Check if payment was made and create transaction
            const paymentMade = parseFloat(purchaseData.paymentReceived || purchaseData.payment?.paidAmount || 0);

            if (paymentMade > 0 && purchaseData.bankAccountId) {
                console.log('💸 Creating purchase transaction for payment made:', paymentMade);

                try {
                    const transactionData = {
                        bankAccountId: purchaseData.bankAccountId,
                        amount: paymentMade,
                        paymentMethod: purchaseData.paymentMethod || 'cash',
                        description: `Purchase payment for ${createdPurchase.purchaseNumber || 'N/A'}`,
                        notes: `Payment made to ${purchaseData.supplierName || purchaseData.supplier?.name || 'supplier'}`,
                        supplierId: purchaseData.supplier?.id || purchaseData.supplierId || null,
                        supplierName: purchaseData.supplierName || purchaseData.supplier?.name || '',
                        purchaseId: createdPurchase._id || createdPurchase.id,
                        purchaseNumber: createdPurchase.purchaseNumber,
                        chequeNumber: purchaseData.chequeNumber || '',
                        chequeDate: purchaseData.chequeDate || null,
                        upiTransactionId: purchaseData.upiTransactionId || '',
                        bankTransactionId: purchaseData.bankTransactionId || '',
                        // NEW: Due date fields
                        dueDate: purchaseData.dueDate || purchaseData.payment?.dueDate || null,
                        creditDays: purchaseData.creditDays || purchaseData.payment?.creditDays || 0
                    };

                    const transactionResponse = await transactionService.createPurchaseTransaction(
                        purchaseData.companyId,
                        transactionData
                    );

                    console.log('✅ Purchase transaction created:', transactionResponse.data);

                    // Add transaction info to purchase response
                    createdPurchase.transaction = transactionResponse.data;
                    createdPurchase.transactionId = transactionResponse.data.transactionId;

                } catch (transactionError) {
                    console.warn('⚠️ Purchase created but transaction failed:', transactionError);
                    // Don't fail the whole operation, just add warning
                    createdPurchase.transactionError = transactionError.message;
                    createdPurchase.transactionWarning = 'Purchase created successfully, but payment transaction could not be recorded. You can add payment manually later.';
                }
            } else if (paymentMade > 0 && !purchaseData.bankAccountId) {
                console.warn('⚠️ Payment made but no bank account specified');
                createdPurchase.transactionWarning = 'Payment amount specified but no bank account selected. Transaction not created.';
            }

            return {
                success: true,
                data: createdPurchase,
                message: 'Purchase created successfully' +
                    (createdPurchase.transaction ? ' with payment transaction' : '') +
                    (createdPurchase.transactionWarning ? '. Note: ' + createdPurchase.transactionWarning : '')
            };

        } catch (error) {
            console.error('❌ Error creating purchase with transaction:', error);
            throw error;
        }
    }

    /**
     * Add payment to existing purchase with transaction - UPDATED with due date support
     * @param {string} companyId - Company ID
     * @param {string} purchaseId - Purchase ID
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Updated purchase with transaction
     */
    async addPaymentWithTransaction(companyId, purchaseId, paymentData) {
        console.log('💸 Adding payment with transaction:', { companyId, purchaseId, paymentData });

        try {
            // Validate required fields
            if (!companyId) {
                throw new Error('Company ID is required');
            }
            if (!purchaseId) {
                throw new Error('Purchase ID is required');
            }
            if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
                throw new Error('Valid payment amount is required');
            }
            if (!paymentData.bankAccountId) {
                throw new Error('Bank account is required for payment transaction');
            }

            // First get the purchase details
            const purchaseResponse = await this.getPurchaseById(purchaseId);
            if (!purchaseResponse.success) {
                throw new Error('Purchase not found');
            }

            const purchase = purchaseResponse.data;

            // Add payment to purchase using existing method - UPDATED with due date support
            const paymentResponse = await this.addPayment(purchaseId, {
                ...paymentData,
                dueDate: paymentData.dueDate || null,
                creditDays: paymentData.creditDays || 0
            });

            if (!paymentResponse.success) {
                throw new Error(paymentResponse.message || 'Failed to add payment');
            }

            // Create transaction for the payment
            const paymentAmount = parseFloat(paymentData.amount);

            console.log('💸 Creating payment transaction for amount:', paymentAmount);

            try {
                const transactionData = {
                    bankAccountId: paymentData.bankAccountId,
                    amount: paymentAmount,
                    paymentMethod: paymentData.method || paymentData.paymentMethod || 'cash',
                    description: `Payment made for purchase ${purchase.purchaseNumber || purchaseId}`,
                    notes: paymentData.notes || `Additional payment made to ${purchase.supplierName || 'supplier'}`,
                    supplierId: purchase.supplier?._id || purchase.supplier?.id || null,
                    supplierName: purchase.supplierName || purchase.supplier?.name || '',
                    purchaseId: purchaseId,
                    purchaseNumber: purchase.purchaseNumber,
                    chequeNumber: paymentData.chequeNumber || '',
                    chequeDate: paymentData.chequeDate || null,
                    upiTransactionId: paymentData.upiTransactionId || '',
                    bankTransactionId: paymentData.bankTransactionId || '',
                    // NEW: Due date fields
                    dueDate: paymentData.dueDate || null,
                    creditDays: paymentData.creditDays || 0
                };

                const transactionResponse = await transactionService.createPurchaseTransaction(
                    companyId,
                    transactionData
                );

                console.log('✅ Payment transaction created:', transactionResponse.data);

                // Add transaction info to payment response
                paymentResponse.data.transaction = transactionResponse.data;
                paymentResponse.data.transactionId = transactionResponse.data.transactionId;

            } catch (transactionError) {
                console.warn('⚠️ Payment added but transaction failed:', transactionError);
                paymentResponse.data.transactionError = transactionError.message;
                paymentResponse.data.transactionWarning = 'Payment recorded successfully, but bank transaction could not be created. Please check your bank account settings.';
            }

            return {
                success: true,
                data: paymentResponse.data,
                message: 'Payment added successfully' +
                    (paymentResponse.data.transaction ? ' with bank transaction' : '') +
                    (paymentResponse.data.transactionWarning ? '. Note: ' + paymentResponse.data.transactionWarning : '')
            };

        } catch (error) {
            console.error('❌ Error adding payment with transaction:', error);
            throw error;
        }
    }

    /**
     * Create quick cash purchase with automatic transaction
     * @param {Object} purchaseData - Quick purchase data
     * @returns {Promise<Object>} Created purchase with transaction
     */
    async createQuickPurchaseWithTransaction(purchaseData) {
        console.log('⚡ Creating quick purchase with transaction:', purchaseData);

        try {
            // Validate required fields
            if (!purchaseData.companyId) {
                throw new Error('Company ID is required');
            }
            if (!purchaseData.amount || parseFloat(purchaseData.amount) <= 0) {
                throw new Error('Valid purchase amount is required');
            }
            if (!purchaseData.bankAccountId) {
                throw new Error('Bank account is required for cash purchase');
            }

            // Prepare purchase data for quick purchase
            const quickPurchaseData = {
                companyId: purchaseData.companyId,
                supplierName: purchaseData.supplierName || 'Cash Supplier',
                supplierMobile: purchaseData.supplierMobile || '',
                purchaseType: 'non-gst', // Quick purchases are usually non-GST
                gstEnabled: false,
                paymentMethod: purchaseData.paymentMethod || 'cash',
                paymentReceived: purchaseData.amount,
                bankAccountId: purchaseData.bankAccountId,
                items: purchaseData.items || [{
                    itemName: purchaseData.itemName || 'Quick Purchase Item',
                    quantity: 1,
                    pricePerUnit: parseFloat(purchaseData.amount),
                    taxRate: 0,
                    amount: parseFloat(purchaseData.amount)
                }],
                totals: {
                    subtotal: parseFloat(purchaseData.amount),
                    totalDiscount: 0,
                    totalTax: 0,
                    finalTotal: parseFloat(purchaseData.amount)
                },
                notes: purchaseData.notes || 'Quick cash purchase',
                status: 'completed',
                // Transaction fields
                chequeNumber: purchaseData.chequeNumber,
                chequeDate: purchaseData.chequeDate,
                upiTransactionId: purchaseData.upiTransactionId,
                bankTransactionId: purchaseData.bankTransactionId,
                // NEW: Due date fields
                dueDate: purchaseData.dueDate || null,
                creditDays: purchaseData.creditDays || 0
            };

            // Create purchase with transaction
            const result = await this.createPurchaseWithTransaction(quickPurchaseData);

            return {
                ...result,
                message: 'Quick purchase created successfully' +
                    (result.data.transaction ? ' with payment transaction' : '')
            };

        } catch (error) {
            console.error('❌ Error creating quick purchase with transaction:', error);
            throw error;
        }
    }

    // ==================== EXISTING METHODS (Updated to match Sales Service structure) ====================

    // Create new purchase
    async createPurchase(purchaseData) {
        console.log('🛒 Creating purchase:', purchaseData);

        // Transform frontend data to backend format
        const backendData = this.transformToBackendFormat(purchaseData);

        return await this.apiCall('/purchases', {
            method: 'POST',
            body: JSON.stringify(backendData)
        });
    }

    // Get all purchases
    async getPurchases(companyId, filters = {}) {
        const queryParams = new URLSearchParams({
            companyId,
            ...filters
        });

        return await this.apiCall(`/purchases?${queryParams}`);
    }

    // Get single purchase by ID
    async getPurchaseById(id) {
        return await this.apiCall(`/purchases/${id}`);
    }

    // Update purchase
    async updatePurchase(id, purchaseData) {
        const backendData = this.transformToBackendFormat(purchaseData);

        return await this.apiCall(`/purchases/${id}`, {
            method: 'PUT',
            body: JSON.stringify(backendData)
        });
    }

    // Delete purchase (soft delete - marks as cancelled)
    async deletePurchase(id) {
        return await this.apiCall(`/purchases/${id}`, {
            method: 'DELETE'
        });
    }

    // UPDATED: Add payment to purchase with due date support
    async addPayment(purchaseId, paymentData) {
        return await this.apiCall(`/purchases/${purchaseId}/payments`, {
            method: 'POST',
            body: JSON.stringify({
                amount: paymentData.amount,
                method: paymentData.method || paymentData.paymentMethod || 'cash',
                reference: paymentData.reference || '',
                paymentDate: paymentData.paymentDate || null,
                dueDate: paymentData.dueDate || null, // NEW
                creditDays: paymentData.creditDays || null, // NEW
                notes: paymentData.notes || ''
            })
        });
    }

    // Get dashboard data
    async getDashboardData(companyId) {
        return await this.apiCall(`/purchases/dashboard?companyId=${companyId}`);
    }

    // Get next purchase number
    async getNextPurchaseNumber(companyId, purchaseType = 'gst') {
        return await this.apiCall(`/purchases/next-purchase-number?companyId=${companyId}&purchaseType=${purchaseType}`);
    }

    // Get today's purchases
    async getTodaysPurchases(companyId) {
        return await this.apiCall(`/purchases/today?companyId=${companyId}`);
    }

    // Get monthly report
    async getMonthlyReport(companyId, year, month) {
        return await this.apiCall(`/purchases/monthly-report?companyId=${companyId}&year=${year}&month=${month}`);
    }

    // Get supplier stats
    async getSupplierStats(companyId, supplierId) {
        return await this.apiCall(`/purchases/supplier-stats?companyId=${companyId}&supplierId=${supplierId}`);
    }

    // Complete purchase
    async completePurchase(purchaseId) {
        return await this.apiCall(`/purchases/${purchaseId}/complete`, {
            method: 'POST'
        });
    }

    // Mark as ordered
    async markAsOrdered(purchaseId) {
        return await this.apiCall(`/purchases/${purchaseId}/mark-ordered`, {
            method: 'POST'
        });
    }

    // Mark as received
    async markAsReceived(purchaseId) {
        return await this.apiCall(`/purchases/${purchaseId}/mark-received`, {
            method: 'POST'
        });
    }

    // Validate items before creating purchase
    async validateItems(items) {
        return await this.apiCall('/purchases/validate-items', {
            method: 'POST',
            body: JSON.stringify({ items })
        });
    }

    // Export purchases to CSV
    async exportCSV(companyId, filters = {}) {
        const queryParams = new URLSearchParams({
            companyId,
            ...filters
        });

        const response = await fetch(`${this.baseURL}/purchases/export-csv?${queryParams}`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to export CSV');
        }

        return response.blob();
    }

    // UPDATED: Get overdue purchases with fallback to client-side filtering
    async getOverduePurchases(companyId) {
        try {
            // Try the dedicated endpoint first
            return await this.apiCall(`/purchases/overdue?companyId=${companyId}`);
        } catch (error) {
            console.warn('⚠️ Overdue endpoint not available, using fallback method');

            // Fallback: Get all purchases and filter client-side for overdue
            try {
                const purchasesResponse = await this.getPurchases(companyId);

                if (!purchasesResponse.success) {
                    return {
                        success: false,
                        message: 'Failed to fetch purchases data',
                        data: []
                    };
                }

                const allPurchases = purchasesResponse.data.purchases || [];
                const today = new Date();

                // Filter for overdue purchases
                const overduePurchases = allPurchases.filter(purchase => {
                    const pendingAmount = purchase.payment?.pendingAmount || 0;
                    const dueDate = purchase.payment?.dueDate;

                    if (!dueDate || pendingAmount <= 0) return false;

                    const due = new Date(dueDate);
                    return due < today;
                });

                return {
                    success: true,
                    data: overduePurchases,
                    message: `Found ${overduePurchases.length} overdue purchases (client-side filtered)`
                };

            } catch (fallbackError) {
                console.error('❌ Fallback method also failed:', fallbackError);
                return {
                    success: false,
                    message: 'Unable to fetch overdue purchases',
                    data: []
                };
            }
        }
    }

    // UPDATED: Get purchases due today with fallback to client-side filtering
    async getPurchasesDueToday(companyId) {
        try {
            // Try the dedicated endpoint first
            return await this.apiCall(`/purchases/due-today?companyId=${companyId}`);
        } catch (error) {
            console.warn('⚠️ Due today endpoint not available, using fallback method');

            // Fallback: Get all purchases and filter client-side for due today
            try {
                const purchasesResponse = await this.getPurchases(companyId);

                if (!purchasesResponse.success) {
                    return {
                        success: false,
                        message: 'Failed to fetch purchases data',
                        data: []
                    };
                }

                const allPurchases = purchasesResponse.data.purchases || [];
                const today = new Date();
                const todayString = today.toDateString();

                // Filter for purchases due today
                const purchasesDueToday = allPurchases.filter(purchase => {
                    const pendingAmount = purchase.payment?.pendingAmount || 0;
                    const dueDate = purchase.payment?.dueDate;

                    if (!dueDate || pendingAmount <= 0) return false;

                    const due = new Date(dueDate);
                    return due.toDateString() === todayString;
                });

                return {
                    success: true,
                    data: purchasesDueToday,
                    message: `Found ${purchasesDueToday.length} purchases due today (client-side filtered)`
                };

            } catch (fallbackError) {
                console.error('❌ Fallback method also failed:', fallbackError);
                return {
                    success: false,
                    message: 'Unable to fetch purchases due today',
                    data: []
                };
            }
        }
    }

    // NEW: Get payment summary with overdue info
    async getPaymentSummaryWithOverdue(companyId, dateFrom, dateTo) {
        const queryParams = new URLSearchParams({
            companyId,
            ...(dateFrom && { dateFrom: this.formatDateForAPI(dateFrom) }),
            ...(dateTo && { dateTo: this.formatDateForAPI(dateTo) })
        });

        try {
            return await this.apiCall(`/purchases/payment-summary-overdue?${queryParams}`);
        } catch (error) {
            console.warn('⚠️ Payment summary overdue endpoint not available, using fallback');

            // Fallback to enhanced payment summary
            return await this.getEnhancedPaymentSummary(companyId, {
                dateFrom: dateFrom,
                dateTo: dateTo
            });
        }
    }

    // NEW: Update payment due date
    async updatePaymentDueDate(purchaseId, dueDate, creditDays) {
        return await this.apiCall(`/purchases/${purchaseId}/due-date`, {
            method: 'PUT',
            body: JSON.stringify({
                dueDate: dueDate,
                creditDays: creditDays
            })
        });
    }

    // FIXED: Enhanced due date extraction with smart date parsing (matching Sales Service)
    transformToBackendFormat(purchaseData) {
        console.log('🔄 Transforming data for backend:', purchaseData);

        // Extract supplier information
        const supplierName = purchaseData.supplier?.name ||
            purchaseData.supplierData?.name ||
            purchaseData.partyName ||
            'Cash Supplier';

        const supplierMobile = purchaseData.supplier?.mobile ||
            purchaseData.supplier?.phone ||
            purchaseData.supplierData?.phone ||
            purchaseData.mobileNumber ||
            '';

        // FIXED: Extract tax mode information with proper priority
        const globalTaxMode = purchaseData.globalTaxMode ||
            purchaseData.taxMode ||
            (purchaseData.priceIncludesTax ? 'with-tax' : 'without-tax') ||
            'without-tax'; // DEFAULT to without-tax

        const priceIncludesTax = globalTaxMode === 'with-tax';

        console.log('🏷️ FIXED Tax Mode Mapping:', {
            originalGlobalTaxMode: purchaseData.globalTaxMode,
            originalPriceIncludesTax: purchaseData.priceIncludesTax,
            finalGlobalTaxMode: globalTaxMode,
            finalPriceIncludesTax: priceIncludesTax,
            purchaseDataKeys: Object.keys(purchaseData)
        });

        // Enhanced payment information extraction
        const paymentInfo = purchaseData.paymentInfo || {};

        // Extract payment amount
        const paymentMade = parseFloat(
            purchaseData.paymentReceived ||
            paymentInfo.amount ||
            purchaseData.payment?.paidAmount ||
            purchaseData.amount ||
            0
        );

        const finalTotal = parseFloat(purchaseData.totals?.finalTotal || 0);
        const pendingAmount = Math.max(0, finalTotal - paymentMade);

        // FIXED: Extract payment method with CORRECT PRIORITY ORDER
        const paymentMethod = paymentInfo.method ||
            paymentInfo.paymentMethod ||
            purchaseData.payment?.method ||
            purchaseData.paymentMethod ||
            'cash';

        console.log('💳 FIXED Payment Method Extraction:', {
            selectedMethod: paymentMethod,
            paymentInfoMethod: paymentInfo.method,
            paymentInfoPaymentMethod: paymentInfo.paymentMethod,
            purchaseDataPaymentMethod: purchaseData.paymentMethod,
            paymentObjectMethod: purchaseData.payment?.method
        });

        // Extract bank account ID
        const bankAccountId = purchaseData.bankAccountId ||
            paymentInfo.bankAccountId ||
            purchaseData.payment?.bankAccountId ||
            null;

        // FIXED: Enhanced due date extraction with IMPROVED smart date parsing
        let dueDate = null;
        let creditDays = 0;

        // First, try to get explicit due date
        if (purchaseData.dueDate) {
            dueDate = new Date(purchaseData.dueDate).toISOString();
            console.log('📅 Using explicit due date from purchaseData:', dueDate);
        } else if (paymentInfo.dueDate) {
            dueDate = new Date(paymentInfo.dueDate).toISOString();
            console.log('📅 Using explicit due date from paymentInfo:', dueDate);
        } else if (purchaseData.payment?.dueDate) {
            dueDate = new Date(purchaseData.payment.dueDate).toISOString();
            console.log('📅 Using explicit due date from payment object:', dueDate);
        }

        // Second, try to get credit days and calculate due date
        const explicitCreditDays = parseInt(
            purchaseData.creditDays ||
            paymentInfo.creditDays ||
            purchaseData.payment?.creditDays ||
            0
        );

        if (explicitCreditDays > 0) {
            creditDays = explicitCreditDays;
            if (!dueDate) {
                // Calculate due date from credit days
                const calculatedDueDate = new Date();
                calculatedDueDate.setDate(calculatedDueDate.getDate() + creditDays);
                dueDate = calculatedDueDate.toISOString();
                console.log('📅 Calculated due date from credit days:', { creditDays, dueDate });
            }
        }

        // ENHANCED: Smart date parsing from payment notes
        if (!dueDate && paymentInfo.notes) {
            console.log('📅 Attempting smart date parsing from notes:', paymentInfo.notes);

            const notesText = paymentInfo.notes.toLowerCase();

            // Enhanced patterns for date extraction
            const datePatterns = [
                // "will pay on 14", "payment on 20", "due on 15"
                /(?:pay|due|payment|paid).*?(?:on|by)\s*(?:the\s*)?(\d{1,2})(?:th|st|nd|rd)?/i,
                // "14th date", "15th day", "20 date"
                /(\d{1,2})(?:th|st|nd|rd)?\s*(?:date|day|of)/i,
                // "14 december", "15 jan", etc.
                /(\d{1,2})\s*(?:december|january|february|march|april|may|june|july|august|september|october|november|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)/i,
                // Simple numbers with context
                /(?:remaining|balance|rest).*?(\d{1,2})/i
            ];

            let foundDate = false;
            for (const [index, pattern] of datePatterns.entries()) {
                const match = paymentInfo.notes.match(pattern);
                if (match) {
                    const dayNumber = parseInt(match[1]);
                    console.log(`📅 Pattern ${index + 1} matched:`, { match: match[0], dayNumber });

                    if (dayNumber >= 1 && dayNumber <= 31) {
                        const today = new Date();
                        const currentMonth = today.getMonth();
                        const currentYear = today.getFullYear();
                        const currentDay = today.getDate();

                        // Create due date for this month or next month
                        let calculatedDueDate = new Date(currentYear, currentMonth, dayNumber);

                        // If the date has passed this month, set it for next month
                        if (dayNumber <= currentDay) {
                            calculatedDueDate = new Date(currentYear, currentMonth + 1, dayNumber);
                        }

                        dueDate = calculatedDueDate.toISOString();
                        creditDays = Math.max(1, Math.ceil((calculatedDueDate - today) / (1000 * 60 * 60 * 24)));

                        console.log('📅 ✅ SMART Due Date Parsing SUCCESS:', {
                            originalNotes: paymentInfo.notes,
                            patternUsed: pattern.toString(),
                            extractedDay: dayNumber,
                            calculatedDueDate: dueDate,
                            calculatedCreditDays: creditDays,
                            currentDay: currentDay
                        });

                        foundDate = true;
                        break;
                    }
                }
            }

            if (!foundDate) {
                console.log('📅 ❌ Smart date parsing failed - no valid date found in notes');
            }
        }

        // Final fallback: if partial payment and no due date, set 30 days default
        if (!dueDate && pendingAmount > 0 && paymentMade > 0) {
            creditDays = 30; // Default 30 days credit
            const calculatedDueDate = new Date();
            calculatedDueDate.setDate(calculatedDueDate.getDate() + creditDays);
            dueDate = calculatedDueDate.toISOString();
            console.log('📅 Applied default 30-day credit for partial payment:', { dueDate, creditDays });
        }

        // Additional payment details extraction
        const chequeNumber = purchaseData.chequeNumber ||
            paymentInfo.chequeNumber ||
            purchaseData.payment?.chequeNumber ||
            '';

        const chequeDate = purchaseData.chequeDate ||
            paymentInfo.chequeDate ||
            purchaseData.payment?.chequeDate ||
            null;

        const transactionId = purchaseData.transactionId ||
            paymentInfo.transactionId ||
            paymentInfo.upiTransactionId ||
            paymentInfo.bankTransactionId ||
            purchaseData.payment?.transactionId ||
            '';

        const paymentNotes = paymentInfo.notes ||
            purchaseData.notes ||
            purchaseData.payment?.notes ||
            '';

        console.log('💳 Enhanced Payment Information Extraction:', {
            paymentMade,
            paymentMethod,
            bankAccountId,
            dueDate,
            creditDays,
            finalTotal,
            pendingAmount,
            paymentNotes,
            dueDateSource: dueDate ? (
                purchaseData.dueDate ? 'purchaseData.dueDate' :
                    paymentInfo.dueDate ? 'paymentInfo.dueDate' :
                        explicitCreditDays ? 'calculated from creditDays' :
                            paymentInfo.notes ? 'smart parsed from notes' :
                                'default fallback'
            ) : 'none'
        });

        // FIXED: Process items with CORRECT tax mode mapping
        const processedItems = (purchaseData.items || [])
            .filter(item =>
                item.itemName &&
                parseFloat(item.quantity) > 0 &&
                parseFloat(item.pricePerUnit) >= 0
            )
            .map((item, index) => {
                // FIXED: Use individual item tax mode or fall back to global
                const itemTaxMode = item.taxMode ||
                    item.itemTaxMode ||
                    globalTaxMode;

                const itemPriceIncludesTax = itemTaxMode === 'with-tax';

                console.log(`🔧 Processing Item ${index + 1}:`, {
                    itemName: item.itemName,
                    originalItemTaxMode: item.taxMode,
                    originalItemItemTaxMode: item.itemTaxMode,
                    globalTaxMode: globalTaxMode,
                    finalItemTaxMode: itemTaxMode,
                    finalItemPriceIncludesTax: itemPriceIncludesTax,
                    pricePerUnit: item.pricePerUnit,
                    quantity: item.quantity
                });

                return {
                    itemRef: item.itemRef || item._id || item.id || null,
                    itemName: item.itemName || item.name,
                    hsnCode: item.hsnCode || item.hsnNumber || '0000',
                    quantity: parseFloat(item.quantity) || 1,
                    unit: item.unit || 'PCS',
                    pricePerUnit: parseFloat(item.pricePerUnit) || 0,
                    taxRate: parseFloat(item.taxRate || item.gstRate) || (itemPriceIncludesTax ? 18 : 0),
                    priceIncludesTax: itemPriceIncludesTax,
                    taxMode: itemTaxMode, // FIXED: Use correct tax mode
                    discountPercent: parseFloat(item.discountPercent) || 0,
                    discountAmount: parseFloat(item.discountAmount) || 0,
                    cgst: parseFloat(item.cgstAmount || item.cgst) || 0,
                    sgst: parseFloat(item.sgstAmount || item.sgst) || 0,
                    igst: parseFloat(item.igstAmount || item.igst) || 0,
                    itemAmount: parseFloat(item.amount || item.itemAmount) || 0,
                    lineNumber: item.lineNumber || (index + 1)
                };
            });

        console.log('📦 FIXED Processed Items for Backend:', processedItems.map(item => ({
            name: item.itemName,
            taxMode: item.taxMode,
            priceIncludesTax: item.priceIncludesTax,
            pricePerUnit: item.pricePerUnit,
            taxRate: item.taxRate
        })));

        const transformedData = {
            // Purchase basic info
            purchaseNumber: purchaseData.purchaseNumber,
            purchaseDate: purchaseData.purchaseDate || new Date().toISOString(),
            purchaseType: purchaseData.gstEnabled ? 'gst' : 'non-gst',
            gstEnabled: purchaseData.gstEnabled || false,
            priceIncludesTax: priceIncludesTax, // FIXED: Use correct value
            companyId: purchaseData.companyId,

            // Supplier information
            supplierName: supplierName,
            supplierMobile: supplierMobile,
            supplier: purchaseData.supplier?.id || purchaseData.supplierId || null,

            // Items array with proper tax mode mapping
            items: processedItems,

            // FIXED: Enhanced payment object with CORRECT values
            payment: {
                method: paymentMethod,
                status: this.calculatePaymentStatus(paymentMade, finalTotal),
                paidAmount: paymentMade,
                pendingAmount: pendingAmount,
                paymentDate: paymentInfo.paymentDate ||
                    purchaseData.paymentDate ||
                    purchaseData.payment?.paymentDate ||
                    new Date().toISOString(),
                dueDate: dueDate, // FIXED: Now properly parsed
                creditDays: creditDays, // FIXED: Now properly calculated
                reference: paymentInfo.reference ||
                    purchaseData.paymentReference ||
                    purchaseData.payment?.reference ||
                    transactionId ||
                    chequeNumber ||
                    '',
                notes: paymentNotes,
                // Additional payment details
                chequeNumber: chequeNumber,
                chequeDate: chequeDate,
                bankTransactionId: transactionId,
                upiTransactionId: transactionId,
                bankAccountId: bankAccountId
            },

            // Totals
            totals: {
                subtotal: parseFloat(purchaseData.totals?.subtotal) || 0,
                totalDiscount: parseFloat(purchaseData.totals?.totalDiscountAmount || purchaseData.totals?.totalDiscount) || 0,
                totalTax: parseFloat(purchaseData.totals?.totalTaxAmount || purchaseData.totals?.totalTax) || 0,
                finalTotal: finalTotal
            },

            // Additional information
            notes: purchaseData.notes || '',
            termsAndConditions: purchaseData.terms || purchaseData.termsAndConditions || '',
            status: purchaseData.status || 'draft',
            receivingStatus: purchaseData.receivingStatus || 'pending',

            // Round off
            roundOff: parseFloat(purchaseData.roundOff) || 0,
            roundOffEnabled: purchaseData.roundOffEnabled || false,

            // Bank account info
            bankAccountId: bankAccountId,

            // Transaction-related fields
            chequeNumber: chequeNumber,
            chequeDate: chequeDate ? new Date(chequeDate).toISOString() : null,
            upiTransactionId: transactionId,
            bankTransactionId: transactionId,

            // FIXED: Enhanced tax mode info
            globalTaxMode: globalTaxMode,
            taxModeInfo: {
                globalTaxMode,
                priceIncludesTax,
                itemCount: processedItems.length,
                itemTaxModes: processedItems.map(item => ({
                    itemName: item.itemName,
                    taxMode: item.taxMode,
                    priceIncludesTax: item.priceIncludesTax,
                    pricePerUnit: item.pricePerUnit,
                    taxRate: item.taxRate
                }))
            },

            // FIXED: Include CORRECTED values at root level
            paymentMethod: paymentMethod,
            dueDate: dueDate,
            creditDays: creditDays
        };

        console.log('🚀 FIXED Final Transformed Data for Backend:', {
            purchaseNumber: transformedData.purchaseNumber,
            globalTaxMode: transformedData.globalTaxMode,
            priceIncludesTax: transformedData.priceIncludesTax,
            payment: {
                method: transformedData.payment.method,
                paidAmount: transformedData.payment.paidAmount,
                pendingAmount: transformedData.payment.pendingAmount,
                dueDate: transformedData.payment.dueDate,
                creditDays: transformedData.payment.creditDays
            },
            itemsPreview: transformedData.items.map(item => ({
                name: item.itemName,
                taxMode: item.taxMode,
                priceIncludesTax: item.priceIncludesTax
            }))
        });

        return transformedData;
    }

    // UPDATED: Transform backend data to frontend format with due date support
    transformToFrontendFormat(backendData) {
        const purchase = backendData.data || backendData;

        return {
            id: purchase._id || purchase.id,
            date: new Date(purchase.purchaseDate).toLocaleDateString('en-GB'),
            purchaseNo: purchase.purchaseNumber,
            partyName: purchase.supplier?.name || purchase.supplierName || 'Unknown Supplier',
            partyPhone: purchase.supplier?.mobile || purchase.supplierMobile || '',
            transaction: purchase.purchaseType === 'gst' ? 'GST Purchase' : 'Purchase',
            paymentType: this.capitalizeFirst(purchase.payment?.method || 'Cash'),

            // Tax information
            cgst: purchase.totals?.totalTax ? purchase.totals.totalTax / 2 : 0,
            sgst: purchase.totals?.totalTax ? purchase.totals.totalTax / 2 : 0,
            cgstPercent: 9,
            sgstPercent: 9,

            // Amounts
            amount: purchase.totals?.finalTotal || 0,
            balance: purchase.payment?.pendingAmount || 0,
            subtotal: purchase.totals?.subtotal || 0,
            discount: purchase.totals?.totalDiscount || 0,

            // Status
            status: this.mapPaymentStatus(purchase.payment?.status),
            purchaseStatus: this.capitalizeFirst(purchase.status),
            receivingStatus: this.capitalizeFirst(purchase.receivingStatus || 'pending'),

            // NEW: Due date information
            dueDate: purchase.payment?.dueDate,
            creditDays: purchase.payment?.creditDays || 0,
            isOverdue: purchase.isOverdue || false,
            daysOverdue: purchase.daysOverdue || 0,

            // Additional data
            items: purchase.items || [],
            gstEnabled: purchase.gstEnabled || false,
            priceIncludesTax: purchase.priceIncludesTax || false, // NEW
            roundOff: purchase.roundOff || 0,
            notes: purchase.notes || '',
            terms: purchase.termsAndConditions || '',

            // Keep original purchase data for editing
            originalPurchase: purchase,

            // UPDATED: Payment details with due date
            paymentReceived: purchase.payment?.paidAmount || 0,
            paymentMethod: purchase.payment?.method || 'cash',
            paymentDate: purchase.payment?.paymentDate,
            paymentReference: purchase.payment?.reference || '',
            paymentDueDate: purchase.payment?.dueDate, // NEW
            paymentCreditDays: purchase.payment?.creditDays || 0, // NEW

            // Supplier details for editing
            supplier: {
                id: purchase.supplier?._id || purchase.supplier?.id,
                name: purchase.supplier?.name || purchase.supplierName,
                mobile: purchase.supplier?.mobile || purchase.supplierMobile,
                email: purchase.supplier?.email || '',
                address: purchase.supplier?.address || null
            },

            // Totals for frontend
            totals: {
                subtotal: purchase.totals?.subtotal || 0,
                totalDiscountAmount: purchase.totals?.totalDiscount || 0,
                totalTaxAmount: purchase.totals?.totalTax || 0,
                finalTotal: purchase.totals?.finalTotal || 0
            }
        };
    }

    // Calculate payment status
    calculatePaymentStatus(paidAmount, totalAmount) {
        if (paidAmount >= totalAmount) return 'paid';
        if (paidAmount > 0) return 'partial';
        return 'pending';
    }

    // Map backend payment status to frontend display
    mapPaymentStatus(backendStatus) {
        const statusMap = {
            'paid': 'Paid',
            'partial': 'Partial',
            'pending': 'Pending',
            'overdue': 'Overdue', // NEW
            'cancelled': 'Cancelled'
        };
        return statusMap[backendStatus] || 'Pending';
    }

    // Utility method to capitalize first letter
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Format currency for display
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    }

    // Format date for API calls
    formatDateForAPI(date) {
        if (!date) return null;
        if (typeof date === 'string') return date.split('T')[0];
        return date.toISOString().split('T')[0];
    }

    // NEW: Format due date for display
    formatDueDate(dueDate) {
        if (!dueDate) return 'No due date';
        const date = new Date(dueDate);
        const today = new Date();

        // Check if overdue
        if (date < today) {
            const diffTime = Math.abs(today - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return `Overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        }

        return date.toLocaleDateString('en-GB');
    }

    // NEW: Get overdue status
    getOverdueStatus(dueDate, pendingAmount) {
        if (!dueDate || pendingAmount <= 0) return { isOverdue: false, daysOverdue: 0 };

        const today = new Date();
        const due = new Date(dueDate);

        if (due < today) {
            const diffTime = Math.abs(today - due);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { isOverdue: true, daysOverdue: diffDays };
        }

        return { isOverdue: false, daysOverdue: 0 };
    }

    // Get purchases summary for date range
    async getPurchasesSummary(companyId, dateFrom, dateTo) {
        const queryParams = new URLSearchParams({
            companyId,
            ...(dateFrom && { dateFrom: this.formatDateForAPI(dateFrom) }),
            ...(dateTo && { dateTo: this.formatDateForAPI(dateTo) })
        });

        const response = await this.apiCall(`/purchases?${queryParams}`);

        if (response.success && response.data) {
            return {
                purchases: response.data.purchases || [],
                summary: response.data.summary || {},
                pagination: response.data.pagination || {}
            };
        }

        return { purchases: [], summary: {}, pagination: {} };
    }

    // Search purchases by various criteria
    async searchPurchases(companyId, searchTerm, filters = {}) {
        const queryParams = new URLSearchParams({
            companyId,
            search: searchTerm,
            ...filters
        });

        return await this.apiCall(`/purchases?${queryParams}`);
    }

    // Get purchases by supplier
    async getPurchasesBySupplier(companyId, supplierId, limit = 10) {
        const queryParams = new URLSearchParams({
            companyId,
            supplier: supplierId,
            limit: limit.toString()
        });

        return await this.apiCall(`/purchases?${queryParams}`);
    }

    // Get payment status for a purchase
    async getPaymentStatus(purchaseId) {
        return await this.apiCall(`/purchases/${purchaseId}/payment-status`);
    }

    // Get top purchased items
    async getTopItems(companyId, dateFrom, dateTo, limit = 10) {
        const queryParams = new URLSearchParams({
            companyId,
            limit: limit.toString(),
            ...(dateFrom && { dateFrom: this.formatDateForAPI(dateFrom) }),
            ...(dateTo && { dateTo: this.formatDateForAPI(dateTo) })
        });

        return await this.apiCall(`/purchases/top-items?${queryParams}`);
    }

    // Get purchases report
    async getPurchasesReport(companyId, startDate, endDate) {
        const queryParams = new URLSearchParams({
            companyId,
            startDate: this.formatDateForAPI(startDate),
            endDate: this.formatDateForAPI(endDate)
        });

        return await this.apiCall(`/purchases/report?${queryParams}`);
    }

    // ==================== TRANSACTION-RELATED UTILITY METHODS ====================

    /**
     * Get purchases with transaction details
     * @param {string} companyId - Company ID
     * @param {Object} filters - Query filters
     * @returns {Promise<Object>} Purchases with transaction info
     */
    async getPurchasesWithTransactions(companyId, filters = {}) {
        try {
            console.log('📊 Getting purchases with transaction details:', { companyId, filters });

            // Get purchases data
            const purchasesResponse = await this.getPurchases(companyId, filters);

            if (!purchasesResponse.success) {
                return purchasesResponse;
            }

            // Get transaction summary for the same period
            const transactionSummary = await transactionService.getTransactionSummary(companyId, {
                transactionType: 'purchase',
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo
            });

            return {
                success: true,
                data: {
                    ...purchasesResponse.data,
                    transactionSummary: transactionSummary.data?.summary || {}
                }
            };

        } catch (error) {
            console.error('❌ Error getting purchases with transactions:', error);
            return {
                success: false,
                message: error.message,
                data: { purchases: [], summary: {} }
            };
        }
    }

    /**
     * Check if purchase has associated transactions
     * @param {string} companyId - Company ID
     * @param {string} purchaseId - Purchase ID
     * @returns {Promise<Object>} Transaction status
     */
    async getPurchaseTransactionStatus(companyId, purchaseId) {
        try {
            console.log('🔍 Checking transaction status for purchase:', { companyId, purchaseId });

            // Get transactions for this purchase
            const transactions = await transactionService.getTransactions(companyId, {
                referenceId: purchaseId,
                referenceType: 'purchase'
            });

            const purchaseTransactions = transactions.data?.transactions || [];
            const totalTransacted = purchaseTransactions.reduce((sum, txn) => {
                return sum + (txn.direction === 'out' ? txn.amount : 0);
            }, 0);

            return {
                success: true,
                data: {
                    hasTransactions: purchaseTransactions.length > 0,
                    transactionCount: purchaseTransactions.length,
                    totalTransacted: totalTransacted,
                    transactions: purchaseTransactions
                }
            };

        } catch (error) {
            console.error('❌ Error checking purchase transaction status:', error);
            return {
                success: false,
                message: error.message,
                data: { hasTransactions: false, transactionCount: 0, totalTransacted: 0 }
            };
        }
    }

    // NEW: Enhanced methods for due date management

    /**
     * Get comprehensive payment summary with overdue analysis
     * @param {string} companyId - Company ID
     * @param {Object} filters - Date and other filters
     * @returns {Promise<Object>} Enhanced payment summary
     */
    async getEnhancedPaymentSummary(companyId, filters = {}) {
        try {
            console.log('📊 Getting enhanced payment summary:', { companyId, filters });

            // Get regular purchases data
            const purchasesResponse = await this.getPurchases(companyId, filters);

            if (!purchasesResponse.success) {
                return purchasesResponse;
            }

            const purchases = purchasesResponse.data.purchases || [];

            // Calculate comprehensive summary
            const summary = {
                totalPurchases: purchases.length,
                totalAmount: 0,
                totalPaid: 0,
                totalPending: 0,
                totalOverdue: 0,
                overdueCount: 0,
                dueTodayCount: 0,
                dueTodayAmount: 0,
                paymentStatusBreakdown: {
                    paid: 0,
                    partial: 0,
                    pending: 0,
                    overdue: 0
                }
            };

            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today

            purchases.forEach(purchase => {
                const amount = purchase.totals?.finalTotal || 0;
                const paid = purchase.payment?.paidAmount || 0;
                const pending = purchase.payment?.pendingAmount || 0;
                const dueDate = purchase.payment?.dueDate ? new Date(purchase.payment.dueDate) : null;
                const status = purchase.payment?.status || 'pending';

                summary.totalAmount += amount;
                summary.totalPaid += paid;
                summary.totalPending += pending;

                // Count payment status
                summary.paymentStatusBreakdown[status] = (summary.paymentStatusBreakdown[status] || 0) + 1;

                // Check overdue
                if (dueDate && pending > 0) {
                    if (dueDate < today) {
                        summary.totalOverdue += pending;
                        summary.overdueCount++;
                    } else if (dueDate.toDateString() === today.toDateString()) {
                        summary.dueTodayCount++;
                        summary.dueTodayAmount += pending;
                    }
                }
            });

            return {
                success: true,
                data: {
                    ...purchasesResponse.data,
                    enhancedSummary: summary
                }
            };

        } catch (error) {
            console.error('❌ Error getting enhanced payment summary:', error);
            return {
                success: false,
                message: error.message,
                data: { purchases: [], summary: {}, enhancedSummary: {} }
            };
        }
    }

    /**
     * Get purchases grouped by payment status with due date analysis
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Grouped purchases data
     */
    async getPurchasesGroupedByStatus(companyId) {
        try {
            console.log('📊 Getting purchases grouped by payment status:', companyId);

            const purchasesResponse = await this.getPurchases(companyId);

            if (!purchasesResponse.success) {
                return purchasesResponse;
            }

            const purchases = purchasesResponse.data.purchases || [];
            const today = new Date();

            const grouped = {
                paid: [],
                partial: [],
                pending: [],
                overdue: [],
                dueToday: []
            };

            purchases.forEach(purchase => {
                const pending = purchase.payment?.pendingAmount || 0;
                const dueDate = purchase.payment?.dueDate ? new Date(purchase.payment.dueDate) : null;
                const status = purchase.payment?.status || 'pending';

                // Add overdue info
                if (dueDate && pending > 0) {
                    const overdueInfo = this.getOverdueStatus(dueDate, pending);
                    purchase.overdueInfo = overdueInfo;
                }

                // Group by status
                if (status === 'paid') {
                    grouped.paid.push(purchase);
                } else if (dueDate && pending > 0 && dueDate < today) {
                    grouped.overdue.push(purchase);
                } else if (dueDate && pending > 0 && dueDate.toDateString() === today.toDateString()) {
                    grouped.dueToday.push(purchase);
                } else if (status === 'partial') {
                    grouped.partial.push(purchase);
                } else {
                    grouped.pending.push(purchase);
                }
            });

            return {
                success: true,
                data: grouped
            };

        } catch (error) {
            console.error('❌ Error grouping purchases by status:', error);
            return {
                success: false,
                message: error.message,
                data: { paid: [], partial: [], pending: [], overdue: [], dueToday: [] }
            };
        }
    }
}

// Export single instance
export default new PurchaseService();