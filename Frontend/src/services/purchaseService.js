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
    // ✅ FIXED: apiCall method with enhanced headers support
    async apiCall(endpoint, method = 'GET', options = {}) {
        // ✅ FIXED: Handle different parameter formats
        let requestMethod = method;
        let requestOptions = options;

        // Handle case where second parameter is options object with method
        if (typeof method === 'object' && method !== null) {
            requestOptions = method;
            requestMethod = requestOptions.method || 'GET';
        }

        // ✅ CRITICAL FIX: Clean up endpoint
        let cleanEndpoint = endpoint;

        // Remove leading slash if present since baseURL already has /api
        if (cleanEndpoint.startsWith('/')) {
            cleanEndpoint = cleanEndpoint.substring(1);
        }

        // ✅ CRITICAL: Construct URL properly
        const url = `${this.baseURL}/${cleanEndpoint}`;

        // ✅ ENHANCED: Merge headers properly
        const defaultHeaders = this.getAuthHeaders();
        const customHeaders = requestOptions.headers || {};

        const config = {
            method: requestMethod,
            headers: {
                ...defaultHeaders,
                ...customHeaders  // ✅ Custom headers override defaults
            },
            ...requestOptions
        };

        // Remove headers from requestOptions to avoid duplication
        delete config.headers.headers;

        // ✅ ENHANCED: Don't add body for GET requests
        if (requestMethod === 'GET' && config.body) {
            console.warn('⚠️ Removing body from GET request');
            delete config.body;
        }

        console.log('🔗 Purchase API Call Details:', {
            originalEndpoint: endpoint,
            cleanEndpoint: cleanEndpoint,
            finalUrl: url,
            method: config.method,
            baseURL: this.baseURL,
            headers: config.headers,
            hasAuth: !!config.headers.Authorization,
            hasXAuthToken: !!config.headers['x-auth-token'],
            hasCompanyId: !!config.headers['x-company-id']
        });

        try {
            // ✅ FIXED: Add timeout for requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('📡 Response Status:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url,
                finalRequestUrl: url
            });

            let data;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
                console.log('📦 JSON Response received:', {
                    hasData: !!data,
                    dataType: typeof data,
                    dataKeys: data && typeof data === 'object' ? Object.keys(data) : []
                });
            } else {
                const textResponse = await response.text();
                console.log('📝 Non-JSON Response:', textResponse);
                data = { message: textResponse };
            }

            // ✅ ENHANCED: Handle errors properly
            if (!response.ok) {
                console.error('❌ Purchase API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    responseData: data,
                    requestUrl: url,
                    method: config.method,
                    originalEndpoint: endpoint,
                    cleanEndpoint: cleanEndpoint,
                    requestHeaders: config.headers
                });

                if (response.status === 400 && data) {
                    console.error('🔍 Backend Validation Error Details:', {
                        message: data.message,
                        errors: data.errors,
                        validationErrors: data.validationErrors,
                        details: data.details,
                        fullErrorObject: data
                    });
                }

                let errorMessage = data.message || `HTTP error! status: ${response.status}`;

                if (response.status === 400) {
                    errorMessage = `Bad Request: ${data.message || 'Invalid request data'}`;
                } else if (response.status === 401) {
                    errorMessage = 'Authentication required. Please login again.';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. You do not have permission for this operation.';
                } else if (response.status === 404) {
                    errorMessage = 'API endpoint not found. Please check server configuration.';
                } else if (response.status === 500) {
                    errorMessage = `Server error: ${data.message || 'Please try again later'}`;
                }

                throw new Error(errorMessage);
            }

            console.log('✅ Purchase API Success Response:', {
                hasData: !!data,
                dataType: typeof data
            });

            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ Purchase API Call Timeout:', {
                    url: url,
                    method: config.method,
                    timeout: '30 seconds'
                });
                throw new Error('Request timeout. Please try again.');
            }

            console.error('❌ Purchase API Call Failed:', {
                error: error.message,
                url: url,
                method: config.method,
                originalEndpoint: endpoint,
                cleanEndpoint: cleanEndpoint,
                requestHeaders: config.headers
            });
            throw error;
        }
    }


    // ✅ FIXED: Update payment method mapping to match backend enum values
    getValidPaymentMethod(paymentMethod) {
        // Map frontend payment method values to backend enum values
        const paymentMethodMap = {
            'cash': 'cash',
            'Cash': 'cash',
            'CASH': 'cash',

            // ✅ CORRECTED: Map all bank variations to 'bank_transfer' (as per backend model)
            'bank': 'bank_transfer',           // ✅ This was the issue!
            'Bank': 'bank_transfer',
            'BANK': 'bank_transfer',
            'Bank Account': 'bank_transfer',   // ✅ Map "Bank Account" to "bank_transfer"
            'bank_account': 'bank_transfer',
            'BankAccount': 'bank_transfer',
            'bank_transfer': 'bank_transfer',  // ✅ Direct mapping
            'bank transfer': 'bank_transfer',

            'cheque': 'cheque',
            'Cheque': 'cheque',
            'CHEQUE': 'cheque',
            'check': 'cheque',

            'upi': 'upi',
            'UPI': 'upi',
            'Upi': 'upi',

            'card': 'card',
            'Card': 'card',
            'CARD': 'card',
            'credit_card': 'card',
            'debit_card': 'card',

            // ✅ Note: Your model doesn't have 'online' - mapping to 'bank_transfer'
            'online': 'bank_transfer',
            'Online': 'bank_transfer',
            'ONLINE': 'bank_transfer',
            'net_banking': 'bank_transfer',
            'netbanking': 'bank_transfer',

            'credit': 'credit',
            'Credit': 'credit',
            'CREDIT': 'credit'
        };

        // Return mapped value or default to 'cash'
        const mappedMethod = paymentMethodMap[paymentMethod] || 'cash';

        console.log('💳 Frontend payment method mapping (FIXED):', {
            original: paymentMethod,
            mapped: mappedMethod,
            isValid: !!paymentMethodMap[paymentMethod],
            modelEnums: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit'] // ✅ Your actual model enums
        });

        return mappedMethod;
    }

    // ✅ ENHANCED: Updated transformToBackendFormat method
    transformToBackendFormat(purchaseData) {
        console.log('🔄 Transforming purchase data to backend format:', purchaseData);

        try {
            // ✅ CRITICAL: Log input validation
            console.log('🔍 Input Data Validation:', {
                hasCompanyId: !!purchaseData.companyId,
                hasItems: !!(purchaseData.items && purchaseData.items.length > 0),
                hasSupplier: !!purchaseData.selectedSupplier,
                hasCustomer: !!purchaseData.selectedCustomer,
                hasSupplierName: !!purchaseData.supplierName,
                hasCustomerName: !!purchaseData.customerName,
                hasPurchaseNumber: !!purchaseData.purchaseNumber,
                hasPurchaseDate: !!purchaseData.purchaseDate,
                inputKeys: Object.keys(purchaseData)
            });

            // Validate the input data first
            this.validatePurchaseData(purchaseData);

            // Process user and party information
            const userInfo = this.getUserInfo(purchaseData);
            const partyData = this.processPartyData(purchaseData);
            const processedItems = this.processItemsData(purchaseData);

            // ✅ CRITICAL: Log processed data
            console.log('🔍 Processed Data Check:', {
                userInfo: userInfo,
                partyData: partyData,
                itemsCount: processedItems.length,
                firstProcessedItem: processedItems[0] || null
            });

            if (processedItems.length === 0) {
                throw new Error('At least one valid item is required for purchase');
            }

            // Calculate totals from processed items
            const totals = this.calculateTotalsFromItems(processedItems, purchaseData);

            // ✅ CRITICAL: Log totals calculation
            console.log('🔍 Calculated Totals:', totals);

            // Process payment information with bank transaction support
            const paymentAmount = parseFloat(purchaseData.paymentReceived || purchaseData.paidAmount || 0);
            const hasBankAccount = !!(purchaseData.bankAccountId && purchaseData.bankAccountId.trim() !== '');
            const willCreateTransaction = hasBankAccount && paymentAmount > 0;

            // ✅ CRITICAL: Log payment processing
            console.log('💰 Payment Processing Check:', {
                originalPaymentReceived: purchaseData.paymentReceived,
                originalPaidAmount: purchaseData.paidAmount,
                parsedPaymentAmount: paymentAmount,
                bankAccountId: purchaseData.bankAccountId,
                hasBankAccount: hasBankAccount,
                willCreateTransaction: willCreateTransaction,
                paymentMethod: purchaseData.paymentMethod,
                rawPaymentMethod: purchaseData.paymentMethod
            });

            // ✅ FIXED: Update payment details creation in transformToBackendFormat method
            const paymentDetails = {
                method: this.getValidPaymentMethod(purchaseData.paymentMethod || 'cash'), // ✅ Use mapping function
                status: paymentAmount >= totals.finalTotal ? 'paid' : (paymentAmount > 0 ? 'partial' : 'pending'),
                paidAmount: paymentAmount,
                pendingAmount: Math.max(0, totals.finalTotal - paymentAmount),
                paymentDate: this.formatDateForAPI(purchaseData.paymentDate) || new Date().toISOString().split('T')[0],
                dueDate: this.formatDateForAPI(purchaseData.dueDate) || this.calculateDueDate(purchaseData.paymentTerms),
                reference: purchaseData.paymentReference || '',

                // Enhanced payment details for bank transactions
                chequeNumber: purchaseData.chequeNumber || '',
                chequeDate: this.formatDateForAPI(purchaseData.chequeDate),
                upiTransactionId: purchaseData.upiTransactionId || '',
                bankTransactionId: purchaseData.bankTransactionId || '',

                // Additional payment metadata - ✅ FIXED: Use mapped method
                paymentMode: this.getValidPaymentMethod(purchaseData.paymentMode || purchaseData.paymentMethod || 'cash'), // ✅ Use mapping
                bankReference: purchaseData.bankReference || '',
                transactionReference: purchaseData.transactionReference || ''
            };

            console.log('💳 Backend payment details prepared:', {
                originalMethod: purchaseData.paymentMethod,
                mappedMethod: paymentDetails.method,
                actualPaidAmount: paymentAmount,
                finalTotal: totals.finalTotal
            });
            // ✅ CRITICAL: Ensure all required fields are present
            const backendPayload = {
                // ✅ REQUIRED: Core purchase metadata
                companyId: purchaseData.companyId,
                userId: userInfo.userId,
                createdBy: userInfo.createdBy,
                purchaseNumber: purchaseData.purchaseNumber || purchaseData.invoiceNumber || `PUR-${Date.now()}`,
                purchaseDate: this.formatDateForAPI(purchaseData.purchaseDate || purchaseData.invoiceDate) || new Date().toISOString().split('T')[0],
                purchaseType: purchaseData.gstEnabled ? 'gst' : 'non-gst',
                gstEnabled: Boolean(purchaseData.gstEnabled),

                // ✅ REQUIRED: Party information
                ...partyData,

                // ✅ REQUIRED: Items and totals
                items: processedItems,
                subtotal: parseFloat(totals.subtotal.toFixed(2)),
                totalDiscount: parseFloat(totals.totalDiscount.toFixed(2)),
                totalTax: parseFloat(totals.totalTax.toFixed(2)),
                totalCGST: parseFloat(totals.totalCGST.toFixed(2)),
                totalSGST: parseFloat(totals.totalSGST.toFixed(2)),
                totalIGST: parseFloat(totals.totalIGST.toFixed(2)),
                finalTotal: parseFloat(totals.finalTotal.toFixed(2)),

                // ✅ FIXED: Payment information with mapped methods
                payment: paymentDetails,
                paymentMethod: paymentDetails.method, // ✅ Use mapped method
                paidAmount: paymentDetails.paidAmount,
                pendingAmount: paymentDetails.pendingAmount,

                // ✅ Bank transaction details
                bankAccountId: hasBankAccount ? purchaseData.bankAccountId : null,
                createBankTransaction: willCreateTransaction,

                // ✅ Round off information
                roundOff: parseFloat(purchaseData.roundOffValue || purchaseData.roundOff || 0),
                roundOffEnabled: Boolean(purchaseData.roundOffEnabled),

                // ✅ Additional details
                notes: purchaseData.notes || '',
                termsAndConditions: purchaseData.termsAndConditions || '',
                status: purchaseData.status || 'draft',
                receivingStatus: purchaseData.receivingStatus || 'pending',

                // ✅ Timestamps
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            // ✅ ENHANCED: Handle totals from ItemsTableWithTotals if provided
            if (purchaseData.totals) {
                console.log('📊 Using totals from ItemsTableWithTotals:', purchaseData.totals);

                // Override calculated totals with provided totals
                backendPayload.subtotal = parseFloat(purchaseData.totals.subtotal || totals.subtotal);
                backendPayload.totalDiscount = parseFloat(purchaseData.totals.totalDiscountAmount || totals.totalDiscount);
                backendPayload.totalTax = parseFloat(purchaseData.totals.totalTax || totals.totalTax);
                backendPayload.totalCGST = parseFloat(purchaseData.totals.totalCGST || totals.totalCGST);
                backendPayload.totalSGST = parseFloat(purchaseData.totals.totalSGST || totals.totalSGST);
                backendPayload.totalIGST = parseFloat(purchaseData.totals.totalIGST || totals.totalIGST);
                backendPayload.finalTotal = parseFloat(purchaseData.totals.finalTotal || totals.finalTotal);

                // Update round off from totals
                if (purchaseData.totals.roundOffValue !== undefined) {
                    backendPayload.roundOff = parseFloat(purchaseData.totals.roundOffValue);
                    backendPayload.roundOffEnabled = Boolean(purchaseData.totals.roundOffEnabled);
                }

                // Recalculate payment amounts based on updated totals
                backendPayload.payment.pendingAmount = Math.max(0, backendPayload.finalTotal - paymentAmount);
                backendPayload.payment.status = paymentAmount >= backendPayload.finalTotal ? 'paid' :
                    (paymentAmount > 0 ? 'partial' : 'pending');
                backendPayload.pendingAmount = backendPayload.payment.pendingAmount;
            }

            // ✅ ENHANCED: Handle payment info from ItemsTableWithTotals
            if (purchaseData.paymentInfo) {
                console.log('💰 Using payment info from ItemsTableWithTotals:', purchaseData.paymentInfo);

                const paymentInfoAmount = parseFloat(purchaseData.paymentInfo.amount || 0);
                const paymentInfoBankAccount = purchaseData.paymentInfo.bankAccountId;
                const paymentInfoMethod = this.getValidPaymentMethod( // ✅ Use mapped method
                    purchaseData.paymentInfo.paymentType ||
                    purchaseData.paymentInfo.method ||
                    'cash'
                );

                console.log('💰 Payment info method mapping:', {
                    original: purchaseData.paymentInfo.paymentType || purchaseData.paymentInfo.method,
                    mapped: paymentInfoMethod
                });

                // Update payment details
                backendPayload.payment.paidAmount = paymentInfoAmount;
                backendPayload.payment.method = paymentInfoMethod; // ✅ Already mapped
                backendPayload.payment.pendingAmount = Math.max(0, backendPayload.finalTotal - paymentInfoAmount);
                backendPayload.payment.status = paymentInfoAmount >= backendPayload.finalTotal ? 'paid' :
                    (paymentInfoAmount > 0 ? 'partial' : 'pending');

                // Update bank transaction details
                if (paymentInfoBankAccount && paymentInfoAmount > 0) {
                    backendPayload.bankAccountId = paymentInfoBankAccount;
                    backendPayload.createBankTransaction = true;

                    // Update transaction metadata
                    if (backendPayload.transactionMetadata) {
                        backendPayload.transactionMetadata.amount = paymentInfoAmount;
                        backendPayload.transactionMetadata.method = paymentInfoMethod; // ✅ Use mapped method
                        backendPayload.transactionMetadata.bankAccountId = paymentInfoBankAccount;
                    }
                } else {
                    backendPayload.createBankTransaction = false;
                    backendPayload.transactionMetadata = null;
                }

                // Update top-level payment fields
                backendPayload.paidAmount = paymentInfoAmount;
                backendPayload.pendingAmount = backendPayload.payment.pendingAmount;
                backendPayload.paymentMethod = paymentInfoMethod; // ✅ Already mapped
            }
            // ✅ CRITICAL: Final validation before sending
            console.log('🔍 Final Backend Payload Validation:', {
                hasCompanyId: !!backendPayload.companyId,
                hasUserId: !!backendPayload.userId,
                hasCreatedBy: !!backendPayload.createdBy,
                hasPurchaseNumber: !!backendPayload.purchaseNumber,
                hasPurchaseDate: !!backendPayload.purchaseDate,
                hasSupplierName: !!backendPayload.supplierName,
                hasCustomerName: !!backendPayload.customerName,
                hasPartyName: !!backendPayload.partyName,
                hasItems: !!(backendPayload.items && backendPayload.items.length > 0),
                hasFinalTotal: typeof backendPayload.finalTotal === 'number',
                finalTotal: backendPayload.finalTotal,
                itemsCount: backendPayload.items?.length || 0,
                paymentMethod: backendPayload.paymentMethod,
                paymentDetailsMethod: backendPayload.payment?.method
            });

            // ✅ Final validation of the backend payload
            this.validateBackendPayload(backendPayload);

            console.log('✅ Backend payload prepared successfully for:', backendPayload.purchaseNumber);

            return backendPayload;

        } catch (error) {
            console.error('❌ Error transforming purchase data:', error);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Input data that caused error:', purchaseData);
            throw new Error(`Failed to transform purchase data: ${error.message}`);
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
        console.log('📊 Purchase data structure:', {
            companyId: purchaseData.companyId,
            hasSelectedSupplier: !!purchaseData.selectedSupplier,
            hasSelectedCustomer: !!purchaseData.selectedCustomer,
            hasSupplierName: !!purchaseData.supplierName,
            hasCustomerName: !!purchaseData.customerName,
            paymentAmount: purchaseData.paymentReceived || purchaseData.paidAmount,
            bankAccountId: purchaseData.bankAccountId,
            keys: Object.keys(purchaseData)
        });

        try {
            // Validate required fields for transaction
            if (!purchaseData.companyId) {
                throw new Error('Company ID is required');
            }

            // First create the purchase using existing method
            console.log('📞 Calling createPurchase method...');
            const purchaseResponse = await this.createPurchase(purchaseData);

            if (!purchaseResponse.success) {
                throw new Error(purchaseResponse.message || 'Failed to create purchase');
            }

            const createdPurchase = purchaseResponse.data;
            console.log('✅ Purchase created successfully:', createdPurchase._id || createdPurchase.id);

            // Check if payment was made and create transaction
            const paymentMade = parseFloat(purchaseData.paymentReceived || purchaseData.paidAmount || 0);

            if (paymentMade > 0 && purchaseData.bankAccountId) {
                console.log('💸 Creating purchase transaction for payment made:', paymentMade);

                try {
                    // ✅ Extract party info from purchase data
                    console.log('🔍 Extracting party info from purchase data...');
                    const partyInfo = this.extractPartyInfo(purchaseData);

                    console.log('🎯 Party info extracted:', {
                        partyType: partyInfo.partyType,
                        partyId: partyInfo.partyId,
                        partyName: partyInfo.partyName,
                        isValid: !!(partyInfo.partyType && partyInfo.partyName)
                    });

                    if (!partyInfo.partyType || !partyInfo.partyName) {
                        console.error('❌ Invalid party info extracted:', partyInfo);
                        throw new Error('Could not extract valid party information for transaction');
                    }

                    // ✅ FIXED: Create transaction data with correct structure
                    const transactionData = {
                        bankAccountId: purchaseData.bankAccountId,
                        amount: paymentMade,
                        transactionType: 'purchase_payment',
                        direction: 'out',
                        description: `Purchase payment for ${createdPurchase.purchaseNumber || 'new purchase'}`,
                        reference: createdPurchase.purchaseNumber || purchaseData.purchaseNumber || 'NEW-PURCHASE',

                        // Party information
                        partyType: partyInfo.partyType,
                        partyId: partyInfo.partyId,
                        partyName: partyInfo.partyName,

                        // Purchase reference
                        referenceType: 'purchase',
                        referenceId: createdPurchase._id || createdPurchase.id,

                        // ✅ FIXED: Payment details with mapped payment method
                        paymentMethod: this.getValidPaymentMethod(purchaseData.paymentMethod || 'cash'),
                        status: 'completed',

                        // Additional details
                        notes: `Payment made to ${partyInfo.partyName} for purchase ${createdPurchase.purchaseNumber || 'new purchase'}`,
                        chequeNumber: purchaseData.chequeNumber || '',
                        chequeDate: purchaseData.chequeDate || null,
                        upiTransactionId: purchaseData.upiTransactionId || '',
                        bankTransactionId: purchaseData.bankTransactionId || '',

                        // Timestamps
                        transactionDate: new Date(purchaseData.purchaseDate || new Date()),
                        createdBy: purchaseData.userId || purchaseData.createdBy || 'system'
                    };

                    console.log('📝 Transaction data prepared:', {
                        bankAccountId: transactionData.bankAccountId,
                        amount: transactionData.amount,
                        partyType: transactionData.partyType,
                        partyName: transactionData.partyName,
                        paymentMethod: transactionData.paymentMethod,
                        hasPartyId: !!transactionData.partyId
                    });

                    // ✅ FIXED: Use the correct transaction service method
                    console.log('📡 Available transaction service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(transactionService)));

                    let transactionResponse;

                    // ✅ FIXED: Use createPaymentOutTransaction for purchase payments (money going out)
                    if (transactionService.createPaymentOutTransaction) {
                        console.log('📡 Using createPaymentOutTransaction method...');
                        transactionResponse = await transactionService.createPaymentOutTransaction(
                            purchaseData.companyId,
                            transactionData
                        );
                    } else if (transactionService.createTransaction) {
                        console.log('📡 Using generic createTransaction method...');
                        transactionResponse = await transactionService.createTransaction(
                            purchaseData.companyId,
                            transactionData
                        );
                    } else if (transactionService.addTransaction) {
                        console.log('📡 Using addTransaction method...');
                        transactionResponse = await transactionService.addTransaction(
                            purchaseData.companyId,
                            transactionData
                        );
                    } else {
                        throw new Error('No suitable transaction service method found. Available methods: ' +
                            Object.getOwnPropertyNames(Object.getPrototypeOf(transactionService)).join(', '));
                    }

                    console.log('✅ Purchase transaction created:', transactionResponse);

                    // ✅ FIXED: Handle different response structures
                    const transactionResult = transactionResponse.data || transactionResponse;

                    // Add transaction info to purchase response
                    if (createdPurchase.purchase) {
                        createdPurchase.purchase.transaction = transactionResult;
                        createdPurchase.purchase.transactionId = transactionResult._id || transactionResult.transactionId || transactionResult.id;
                    } else {
                        createdPurchase.transaction = transactionResult;
                        createdPurchase.transactionId = transactionResult._id || transactionResult.transactionId || transactionResult.id;
                    }

                    console.log('✅ Transaction successfully linked to purchase');

                } catch (transactionError) {
                    console.error('⚠️ Purchase created but transaction failed:', {
                        error: transactionError.message,
                        stack: transactionError.stack,
                        purchaseId: createdPurchase._id || createdPurchase.id,
                        paymentAmount: paymentMade,
                        bankAccountId: purchaseData.bankAccountId,
                        availableTransactionMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(transactionService))
                    });

                    // Don't fail the whole operation, just add warning
                    createdPurchase.transactionError = transactionError.message;
                    createdPurchase.transactionWarning = 'Purchase created successfully, but payment transaction could not be recorded. You can add payment manually later.';
                }
            } else if (paymentMade > 0 && !purchaseData.bankAccountId) {
                console.warn('⚠️ Payment made but no bank account specified:', {
                    paymentAmount: paymentMade,
                    hasAmount: paymentMade > 0,
                    hasBankAccount: !!purchaseData.bankAccountId
                });
                createdPurchase.transactionWarning = 'Payment amount specified but no bank account selected. Transaction not created.';
            } else {
                console.log('ℹ️ No payment transaction needed:', {
                    paymentAmount: paymentMade,
                    hasPayment: paymentMade > 0,
                    hasBankAccount: !!purchaseData.bankAccountId
                });
            }

            return {
                success: true,
                data: createdPurchase,
                message: 'Purchase created successfully' +
                    (createdPurchase.transaction ? ' with payment transaction' : '') +
                    (createdPurchase.transactionWarning ? '. Note: ' + createdPurchase.transactionWarning : '')
            };

        } catch (error) {
            console.error('❌ Error creating purchase with transaction:', {
                error: error.message,
                stack: error.stack,
                companyId: purchaseData.companyId,
                hasItems: !!(purchaseData.items && purchaseData.items.length > 0),
                hasPartyInfo: !!(purchaseData.selectedSupplier || purchaseData.selectedCustomer || purchaseData.supplierName)
            });
            throw error;
        }
    }

    // ✅ FIXED: Update makePaymentWithTransaction method around line 750
    async makePaymentWithTransaction(companyId, purchaseId, paymentData) {
        console.log('💸 Making payment with transaction:', { companyId, purchaseId, paymentData });

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
            const purchaseResponse = await this.getPurchaseById(companyId, purchaseId);
            if (!purchaseResponse.success) {
                throw new Error('Purchase not found');
            }

            const purchase = purchaseResponse.data;

            // Extract party info from purchase data
            const partyInfo = this.extractPartyInfoFromPurchase(purchase);

            // Create transaction for the payment
            const paymentAmount = parseFloat(paymentData.amount);

            console.log('💸 Creating purchase payment transaction for amount:', paymentAmount);

            try {
                const transactionData = {
                    bankAccountId: paymentData.bankAccountId,
                    amount: paymentAmount,
                    paymentMethod: this.getValidPaymentMethod(paymentData.paymentMethod || paymentData.method || 'cash'),
                    description: `Payment for purchase ${purchase.purchaseNumber || purchaseId}`,
                    notes: paymentData.notes || `Payment made to ${partyInfo.partyName}`,

                    // Party info
                    partyType: partyInfo.partyType,
                    partyName: partyInfo.partyName,
                    partyId: partyInfo.partyId,

                    // Purchase reference
                    purchaseId: purchaseId,
                    purchaseNumber: purchase.purchaseNumber,
                    referenceType: 'purchase',
                    referenceId: purchaseId,

                    // Payment details
                    chequeNumber: paymentData.chequeNumber || '',
                    chequeDate: paymentData.chequeDate || null,
                    upiTransactionId: paymentData.upiTransactionId || '',
                    bankTransactionId: paymentData.bankTransactionId || '',

                    // Transaction specifics
                    direction: 'out',
                    transactionType: 'purchase_payment',
                    status: 'completed'
                };

                let transactionResponse;

                // ✅ FIXED: Use correct transaction service method
                if (transactionService.createPaymentOutTransaction) {
                    transactionResponse = await transactionService.createPaymentOutTransaction(
                        companyId,
                        transactionData
                    );
                } else if (transactionService.createTransaction) {
                    transactionResponse = await transactionService.createTransaction(
                        companyId,
                        transactionData
                    );
                } else {
                    throw new Error('No suitable transaction service method available');
                }

                console.log('✅ Purchase payment transaction created:', transactionResponse);

                return {
                    success: true,
                    data: {
                        purchase: purchase,
                        transaction: transactionResponse.data || transactionResponse,
                        transactionId: (transactionResponse.data || transactionResponse)?._id ||
                            (transactionResponse.data || transactionResponse)?.transactionId,
                        partyInfo: partyInfo
                    },
                    message: 'Payment transaction created successfully'
                };

            } catch (transactionError) {
                console.error('❌ Error creating purchase payment transaction:', transactionError);
                throw new Error(`Payment transaction failed: ${transactionError.message}`);
            }

        } catch (error) {
            console.error('❌ Error making payment with transaction:', error);
            throw error;
        }
    }

    // ✅ FIXED: Update recordPaymentWithTransaction method around line 850
    async recordPaymentWithTransaction(companyId, paymentData) {
        console.log('💸 Recording payment with transaction:', paymentData);

        try {
            // Validate required fields
            if (!companyId) {
                throw new Error('Company ID is required');
            }
            if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
                throw new Error('Valid payment amount is required');
            }
            if (!paymentData.bankAccountId) {
                throw new Error('Bank account is required');
            }

            // Extract party info from payment data
            const partyInfo = this.extractPartyInfo(paymentData);

            if (!partyInfo.partyName) {
                throw new Error('Party information is required');
            }

            // Create payment transaction directly
            const transactionData = {
                bankAccountId: paymentData.bankAccountId,
                amount: parseFloat(paymentData.amount),
                paymentMethod: this.getValidPaymentMethod(paymentData.paymentMethod || 'cash'),
                description: paymentData.description || `Payment to ${partyInfo.partyName}`,
                notes: paymentData.notes || '',

                // Party info
                partyType: partyInfo.partyType,
                partyName: partyInfo.partyName,
                partyId: partyInfo.partyId,

                // Payment details
                chequeNumber: paymentData.chequeNumber || '',
                chequeDate: paymentData.chequeDate || null,
                upiTransactionId: paymentData.upiTransactionId || '',
                bankTransactionId: paymentData.bankTransactionId || '',

                // Transaction specifics
                direction: partyInfo.partyType === 'supplier' ? 'out' : 'in',
                transactionType: partyInfo.partyType === 'supplier' ? 'supplier_payment' : 'customer_payment',
                status: 'completed'
            };

            // ✅ FIXED: Use appropriate transaction service method based on party type
            let transactionResponse;

            if (partyInfo.partyType === 'supplier') {
                if (transactionService.createPaymentOutTransaction) {
                    transactionResponse = await transactionService.createPaymentOutTransaction(
                        companyId,
                        transactionData
                    );
                } else if (transactionService.createTransaction) {
                    transactionResponse = await transactionService.createTransaction(
                        companyId,
                        transactionData
                    );
                } else {
                    throw new Error('No suitable transaction service method available for supplier payment');
                }
            } else {
                // For customer payments in purchase context (reverse purchase)
                if (transactionService.createPaymentInTransaction) {
                    transactionResponse = await transactionService.createPaymentInTransaction(
                        companyId,
                        transactionData
                    );
                } else if (transactionService.createTransaction) {
                    transactionResponse = await transactionService.createTransaction(
                        companyId,
                        transactionData
                    );
                } else {
                    throw new Error('No suitable transaction service method available for customer payment');
                }
            }

            console.log('✅ Payment transaction created:', transactionResponse);

            return {
                success: true,
                data: {
                    ...(transactionResponse.data || transactionResponse),
                    partyInfo: partyInfo
                },
                message: `${partyInfo.partyType === 'supplier' ? 'Supplier' : 'Customer'} payment recorded successfully`
            };

        } catch (error) {
            console.error('❌ Error recording payment:', error);
            throw error;
        }
    }

    // ✅ FIXED: Enhanced party information extraction with comprehensive supplier data structure support
    extractPartyInfo(data) {
        console.log('🔍 Extracting party info from data:', JSON.stringify(data, null, 2));

        let partyInfo = {
            partyType: null,
            partyId: null,
            partyName: null
        };

        // ✅ PRIORITY 1: Check for explicit party selection from hooks (selectedParty + partyType)
        if (data.selectedParty && data.partyType) {
            const party = data.selectedParty;
            partyInfo = {
                partyType: data.partyType,
                partyId: party._id || party.id,
                partyName: data.partyName || party.name || party.businessName || party.companyName || party.supplierName || party.customerName
            };
            console.log('✅ Found explicit party selection:', partyInfo);
            return partyInfo;
        }

        // ✅ PRIORITY 2: Check for selectedSupplier object (common in your UI)
        if (data.selectedSupplier && typeof data.selectedSupplier === 'object') {
            const supplier = data.selectedSupplier;
            // Check if supplier has required fields
            const hasId = supplier._id || supplier.id;
            const hasName = supplier.name || supplier.businessName || supplier.companyName || supplier.supplierName;

            if (hasId && hasName) {
                partyInfo = {
                    partyType: 'supplier',
                    partyId: hasId,
                    partyName: hasName
                };
                console.log('✅ Found selectedSupplier object:', partyInfo);
                return partyInfo;
            }
        }

        // ✅ PRIORITY 3: Check for selectedCustomer object
        if (data.selectedCustomer && typeof data.selectedCustomer === 'object') {
            const customer = data.selectedCustomer;
            const hasId = customer._id || customer.id;
            const hasName = customer.name || customer.businessName || customer.companyName || customer.customerName;

            if (hasId && hasName) {
                partyInfo = {
                    partyType: 'customer',
                    partyId: hasId,
                    partyName: hasName
                };
                console.log('✅ Found selectedCustomer object:', partyInfo);
                return partyInfo;
            }
        }

        // ✅ PRIORITY 4: Check for supplier data (nested object)
        if (data.supplier && typeof data.supplier === 'object') {
            const supplier = data.supplier;
            const hasId = supplier._id || supplier.id;
            const hasName = supplier.name || supplier.businessName || supplier.companyName || supplier.supplierName;

            if (hasId && hasName) {
                partyInfo = {
                    partyType: 'supplier',
                    partyId: hasId,
                    partyName: hasName
                };
                console.log('✅ Found supplier object:', partyInfo);
                return partyInfo;
            }
        }

        // ✅ PRIORITY 5: Check for customer data (nested object)
        if (data.customer && typeof data.customer === 'object') {
            const customer = data.customer;
            const hasId = customer._id || customer.id;
            const hasName = customer.name || customer.businessName || customer.companyName || customer.customerName;

            if (hasId && hasName) {
                partyInfo = {
                    partyType: 'customer',
                    partyId: hasId,
                    partyName: hasName
                };
                console.log('✅ Found customer object:', partyInfo);
                return partyInfo;
            }
        }

        // ✅ PRIORITY 6: Check for direct supplier fields (flat structure)
        if ((data.supplierId || data.supplierName) && data.supplierName) {
            partyInfo = {
                partyType: 'supplier',
                partyId: data.supplierId,
                partyName: data.supplierName
            };
            console.log('✅ Found flat supplier fields:', partyInfo);
            return partyInfo;
        }

        // ✅ PRIORITY 7: Check for direct customer fields (flat structure)
        if ((data.customerId || data.customerName) && data.customerName) {
            partyInfo = {
                partyType: 'customer',
                partyId: data.customerId,
                partyName: data.customerName
            };
            console.log('✅ Found flat customer fields:', partyInfo);
            return partyInfo;
        }

        // ✅ PRIORITY 8: Check for mobile number fallback
        if (data.mobileNumber) {
            partyInfo = {
                partyType: 'supplier', // Default to supplier
                partyId: null,
                partyName: `Walk-in Party (${data.mobileNumber})`
            };
            console.log('✅ Found mobile number fallback:', partyInfo);
            return partyInfo;
        }

        console.warn('❌ No party information found in data:', {
            hasSelectedSupplier: !!data.selectedSupplier,
            hasSelectedCustomer: !!data.selectedCustomer,
            hasSupplier: !!data.supplier,
            hasCustomer: !!data.customer,
            hasSupplierName: !!data.supplierName,
            hasCustomerName: !!data.customerName,
            hasMobileNumber: !!data.mobileNumber,
            hasSelectedParty: !!data.selectedParty,
            hasPartyType: !!data.partyType,
            keys: Object.keys(data)
        });

        return partyInfo;
    }

    // ✅ FIXED: Enhanced party information extraction from existing purchase
    extractPartyInfoFromPurchase(purchase) {
        console.log('🔍 Extracting party info from purchase:', JSON.stringify(purchase, null, 2));

        let partyInfo = {
            partyType: 'supplier', // Default for purchases
            partyId: null,
            partyName: 'Unknown Party'
        };

        // ✅ PRIORITY 1: Try to extract supplier info from nested supplier object
        if (purchase.supplier && typeof purchase.supplier === 'object') {
            const supplier = purchase.supplier;
            const hasId = supplier._id || supplier.id;
            const hasName = supplier.name || supplier.businessName || supplier.companyName || supplier.supplierName;

            if (hasId && hasName) {
                partyInfo = {
                    partyType: 'supplier',
                    partyId: hasId,
                    partyName: hasName
                };
                console.log('✅ Found supplier in purchase:', partyInfo);
                return partyInfo;
            }
        }

        // ✅ PRIORITY 2: Try supplier fields directly on purchase
        if (purchase.supplierName) {
            partyInfo = {
                partyType: 'supplier',
                partyId: purchase.supplierId || null,
                partyName: purchase.supplierName
            };
            console.log('✅ Found supplier fields in purchase:', partyInfo);
            return partyInfo;
        }

        // ✅ PRIORITY 3: Check for customer info (reverse purchase case)
        if (purchase.customer && typeof purchase.customer === 'object') {
            const customer = purchase.customer;
            const hasId = customer._id || customer.id;
            const hasName = customer.name || customer.businessName || customer.companyName || customer.customerName;

            if (hasId && hasName) {
                partyInfo = {
                    partyType: 'customer',
                    partyId: hasId,
                    partyName: hasName
                };
                console.log('✅ Found customer in purchase:', partyInfo);
                return partyInfo;
            }
        }

        // ✅ PRIORITY 4: Try customer fields directly on purchase
        if (purchase.customerName) {
            partyInfo = {
                partyType: 'customer',
                partyId: purchase.customerId || null,
                partyName: purchase.customerName
            };
            console.log('✅ Found customer fields in purchase:', partyInfo);
            return partyInfo;
        }

        // ✅ PRIORITY 5: Check for party-related fields
        if (purchase.partyName) {
            partyInfo = {
                partyType: purchase.partyType || 'supplier',
                partyId: purchase.partyId || null,
                partyName: purchase.partyName
            };
            console.log('✅ Found party fields in purchase:', partyInfo);
            return partyInfo;
        }

        console.warn('❌ No party information found in purchase:', {
            hasSupplier: !!purchase.supplier,
            hasCustomer: !!purchase.customer,
            hasSupplierName: !!purchase.supplierName,
            hasCustomerName: !!purchase.customerName,
            hasPartyName: !!purchase.partyName,
            keys: Object.keys(purchase)
        });

        return partyInfo;
    }

    // ==================== EXISTING METHODS (Updated for enhanced party support) ====================

    // ✅ Update the createPurchase method around line 650
    async createPurchase(purchaseData) {
        console.log('🛒 Creating purchase - ENHANCED DEBUG:');
        console.log('📊 Raw purchase data received:', JSON.stringify(purchaseData, null, 2));

        if (!purchaseData.companyId) {
            throw new Error('Company ID is required to create purchase');
        }

        try {
            const backendData = this.transformToBackendFormat(purchaseData);

            console.log('🔄 Transformed backend data:');
            console.log('📦 Backend payload size:', JSON.stringify(backendData).length);
            console.log('📦 Backend payload structure:', {
                purchaseNumber: backendData.purchaseNumber,
                companyId: backendData.companyId,
                supplierName: backendData.supplierName,
                customerName: backendData.customerName,
                items: backendData.items?.length || 0,
                finalTotal: backendData.finalTotal,
                paymentAmount: backendData.paidAmount,
                bankAccountId: backendData.bankAccountId,
                createBankTransaction: backendData.createBankTransaction
            });

            // ✅ Log the complete payload (be careful with large data)
            console.log('📦 Complete backend payload:', JSON.stringify(backendData, null, 2));

            const response = await this.apiCall(`companies/${purchaseData.companyId}/purchases`, {
                method: 'POST',
                body: JSON.stringify(backendData)
            });

            console.log('✅ Purchase creation response received:', response);
            return response;

        } catch (error) {
            console.error('❌ Error in createPurchase:', error);
            console.error('❌ Error stack:', error.stack);
            throw error;
        }
    }

    // ✅ FIXED: getPurchases method with company ID in multiple formats
    async getPurchases(companyId, filters = {}) {
        try {
            // ✅ CRITICAL: Validate companyId parameter
            if (!companyId || companyId.trim() === '') {
                console.error('❌ PurchaseService.getPurchases: Company ID is required but not provided');
                throw new Error('Company ID is required');
            }

            console.log('📊 PurchaseService.getPurchases called with:', {
                companyId,
                companyIdType: typeof companyId,
                companyIdLength: companyId.length,
                filters
            });

            // ✅ FIXED: Build query parameters properly INCLUDING companyId
            const queryParams = new URLSearchParams();

            // ✅ CRITICAL: Add companyId as query parameter
            queryParams.append('companyId', companyId);

            if (filters && typeof filters === 'object') {
                if (filters.startDate) {
                    queryParams.append('startDate', filters.startDate);
                }
                if (filters.endDate) {
                    queryParams.append('endDate', filters.endDate);
                }
                if (filters.limit && !isNaN(filters.limit)) {
                    queryParams.append('limit', filters.limit.toString());
                }
                if (filters.offset && !isNaN(filters.offset)) {
                    queryParams.append('offset', filters.offset.toString());
                }
                if (filters.status) {
                    queryParams.append('status', filters.status);
                }
                if (filters.supplierName) {
                    queryParams.append('supplierName', filters.supplierName);
                }
            }

            const queryString = queryParams.toString();

            // ✅ CRITICAL FIX: Try different endpoint patterns
            const endpoint = `companies/${companyId}/purchases${queryString ? `?${queryString}` : ''}`;

            console.log('🌐 Making API call to endpoint:', endpoint);
            console.log('🔗 Base URL:', this.baseURL);
            console.log('🔗 Final URL:', `${this.baseURL}/${endpoint}`);
            console.log('🔍 Query parameters:', Object.fromEntries(queryParams));

            // ✅ FIXED: Call with enhanced headers and options
            const response = await this.apiCall(endpoint, {
                method: 'GET',
                // ✅ CRITICAL: Add companyId in headers too
                headers: {
                    ...this.getAuthHeaders(),
                    'x-company-id': companyId,
                    'company-id': companyId
                }
            });

            console.log('📡 Raw API response:', response);

            // ✅ FIXED: Handle different response structures
            if (response) {
                if (response.hasOwnProperty('success')) {
                    if (response.success) {
                        let purchases = [];
                        let summary = {};
                        let pagination = {};

                        if (response.data) {
                            if (Array.isArray(response.data)) {
                                purchases = response.data;
                            } else if (response.data.purchases && Array.isArray(response.data.purchases)) {
                                purchases = response.data.purchases;
                                summary = response.data.summary || {};
                                pagination = response.data.pagination || {};
                            } else if (typeof response.data === 'object') {
                                purchases = [response.data];
                            }
                        }

                        return {
                            success: true,
                            data: {
                                purchases: purchases,
                                summary: summary,
                                pagination: pagination
                            },
                            message: response.message || 'Purchases retrieved successfully'
                        };
                    } else {
                        return {
                            success: false,
                            message: response.message || 'Failed to retrieve purchases',
                            data: { purchases: [], summary: {}, pagination: {} }
                        };
                    }
                } else {
                    // Response doesn't have success property, assume it's data
                    let purchases = [];

                    if (Array.isArray(response)) {
                        purchases = response;
                    } else if (response.purchases && Array.isArray(response.purchases)) {
                        purchases = response.purchases;
                    } else if (typeof response === 'object') {
                        purchases = [response];
                    }

                    return {
                        success: true,
                        data: {
                            purchases: purchases,
                            summary: response.summary || {},
                            pagination: response.pagination || {}
                        },
                        message: 'Purchases retrieved successfully'
                    };
                }
            } else {
                return {
                    success: false,
                    message: 'No response received from server',
                    data: { purchases: [], summary: {}, pagination: {} }
                };
            }

        } catch (error) {
            console.error('❌ Error getting purchases:', {
                error: error.message,
                companyId: companyId,
                filters: filters
            });

            let errorMessage = 'Failed to retrieve purchases';

            if (error.message.includes('Company ID is required')) {
                errorMessage = 'Company ID is required. Please select a company first.';
            } else if (error.message.includes('400')) {
                errorMessage = 'Invalid request. Please check your parameters.';
            } else if (error.message.includes('401')) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.message.includes('403')) {
                errorMessage = 'Access denied. You may not have permission to view purchases.';
            } else if (error.message.includes('404')) {
                errorMessage = 'Purchases API not found. Please contact support.';
            } else if (error.message.includes('Network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                message: errorMessage,
                data: { purchases: [], summary: {}, pagination: {} },
                error: error.message
            };
        }
    }

    // ✅ Get single purchase by ID
    async getPurchaseById(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}`);
        } catch (error) {
            console.error('❌ Error getting purchase by ID:', error);
            throw error;
        }
    }

    // ✅ Update purchase with enhanced party support
    async updatePurchase(companyId, purchaseId, purchaseData) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            const backendData = this.transformToBackendFormat(purchaseData);
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}`, {
                method: 'PUT',
                body: JSON.stringify(backendData)
            });
        } catch (error) {
            console.error('❌ Error updating purchase:', error);
            throw error;
        }
    }

    // ✅ Delete purchase
    async deletePurchase(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`companies/${companyId}/purchases/${purchaseId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('❌ Error deleting purchase:', error);
            throw error;
        }
    }

    // ==================== STATUS MANAGEMENT ====================

    // ✅ Mark purchase as ordered
    async markAsOrdered(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}/mark-ordered`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'ordered' })
            });
        } catch (error) {
            console.error('❌ Error marking purchase as ordered:', error);
            throw error;
        }
    }

    // ✅ Mark purchase as received
    async markAsReceived(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}/mark-received`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'received' })
            });
        } catch (error) {
            console.error('❌ Error marking purchase as received:', error);
            throw error;
        }
    }

    // ✅ Complete purchase
    async completePurchase(companyId, purchaseId) {
        if (!companyId || !purchaseId) {
            throw new Error('Company ID and Purchase ID are required');
        }

        try {
            return await this.apiCall(`/companies/${companyId}/purchases/${purchaseId}/complete`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'completed' })
            });
        } catch (error) {
            console.error('❌ Error completing purchase:', error);
            throw error;
        }
    }

    // ==================== LOCAL SUMMARY CALCULATION ====================

    // ✅ Calculate summary from purchases data locally
    calculateSummaryFromData(purchases = []) {
        console.log('📊 Calculating summary from purchases data locally:', purchases.length);

        if (!Array.isArray(purchases) || purchases.length === 0) {
            return {
                success: true,
                data: {
                    totalAmount: 0,
                    paidAmount: 0,
                    pendingAmount: 0,
                    totalBills: 0,
                    totalSuppliers: 0,
                    totalCustomers: 0, // ✅ NEW: For reverse purchases
                    pendingDeliveries: 0,
                    overdueAmount: 0,
                    todaysPurchases: 0,
                    growthPercentage: 0,
                    statusCounts: {
                        draft: 0,
                        ordered: 0,
                        received: 0,
                        completed: 0,
                        paid: 0,
                        overdue: 0
                    },
                    partyTypeCounts: { // ✅ NEW: Party type breakdown
                        supplier: 0,
                        customer: 0
                    }
                }
            };
        }

        try {
            const totalAmount = purchases.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const totalBalance = purchases.reduce((sum, p) => sum + (parseFloat(p.balance) || 0), 0);
            const paidAmount = totalAmount - totalBalance;

            // Count by status
            const statusCounts = purchases.reduce((counts, p) => {
                const status = (p.purchaseStatus || 'draft').toLowerCase();
                counts[status] = (counts[status] || 0) + 1;
                return counts;
            }, {
                draft: 0,
                ordered: 0,
                received: 0,
                completed: 0,
                paid: 0,
                overdue: 0
            });

            // ✅ NEW: Count by party type
            const partyTypeCounts = purchases.reduce((counts, p) => {
                // Detect party type from purchase data
                if (p.customerId || p.customerName || p.customer) {
                    counts.customer += 1;
                } else {
                    counts.supplier += 1; // Default to supplier
                }
                return counts;
            }, {
                supplier: 0,
                customer: 0
            });

            // Today's purchases
            const todaysDate = new Date().toISOString().split('T')[0];
            const todaysPurchasesAmount = purchases
                .filter(p => {
                    try {
                        const purchaseDate = new Date(p.date).toISOString().split('T')[0];
                        return purchaseDate === todaysDate;
                    } catch {
                        return false;
                    }
                })
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

            // ✅ ENHANCED: Count unique suppliers and customers
            const uniqueSuppliers = new Set(
                purchases
                    .filter(p => p.supplierName && !p.customerName)
                    .map(p => p.supplierName)
                    .filter(name => name && name.trim() !== '')
            ).size;

            const uniqueCustomers = new Set(
                purchases
                    .filter(p => p.customerName)
                    .map(p => p.customerName)
                    .filter(name => name && name.trim() !== '')
            ).size;

            // Pending deliveries
            const pendingDeliveries = purchases.filter(p =>
                p.receivingStatus === 'pending' || p.receivingStatus === 'partial'
            ).length;

            return {
                success: true,
                data: {
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    pendingAmount: totalBalance,
                    totalBills: purchases.length,
                    totalSuppliers: uniqueSuppliers,
                    totalCustomers: uniqueCustomers, // ✅ NEW
                    pendingDeliveries: pendingDeliveries,
                    overdueAmount: totalBalance, // Simplified
                    todaysPurchases: todaysPurchasesAmount,
                    growthPercentage: 0, // Cannot calculate without historical data
                    statusCounts: statusCounts,
                    partyTypeCounts: partyTypeCounts // ✅ NEW
                }
            };

        } catch (error) {
            console.error('❌ Error calculating summary from data:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // ==================== DATA TRANSFORMATION (Enhanced for party support) ====================

    // ✅ Transform frontend data to backend format with enhanced party support and bank transactions
    transformToBackendFormat(purchaseData) {
        console.log('🔄 Transforming purchase data to backend format:', purchaseData);

        try {
            // Validate the input data first
            this.validatePurchaseData(purchaseData);

            // Process user and party information
            const userInfo = this.getUserInfo(purchaseData);
            const partyData = this.processPartyData(purchaseData);
            const processedItems = this.processItemsData(purchaseData);

            if (processedItems.length === 0) {
                throw new Error('At least one valid item is required for purchase');
            }

            // Calculate totals from processed items
            const totals = this.calculateTotalsFromItems(processedItems, purchaseData);
            // ✅ Update the payment processing section in transformToBackendFormat around line 900
            // Process payment information with bank transaction support
            const paymentAmount = parseFloat(purchaseData.paymentReceived || purchaseData.paidAmount || 0);
            const hasBankAccount = !!(purchaseData.bankAccountId && purchaseData.bankAccountId.trim() !== '');
            const willCreateTransaction = hasBankAccount && paymentAmount > 0;

            // ✅ CRITICAL DEBUG: Log payment processing
            console.log('💰 Payment processing debug:', {
                originalPaymentReceived: purchaseData.paymentReceived,
                originalPaidAmount: purchaseData.paidAmount,
                parsedPaymentAmount: paymentAmount,
                bankAccountId: purchaseData.bankAccountId,
                hasBankAccount: hasBankAccount,
                willCreateTransaction: willCreateTransaction,
                paymentMethod: purchaseData.paymentMethod,
                paymentInfo: purchaseData.paymentInfo
            });

            // Payment object with comprehensive details
            const paymentDetails = {
                method: purchaseData.paymentMethod || 'cash',
                status: paymentAmount >= totals.finalTotal ? 'paid' : (paymentAmount > 0 ? 'partial' : 'pending'),
                paidAmount: paymentAmount, // ✅ This should be the correct amount
                pendingAmount: Math.max(0, totals.finalTotal - paymentAmount),
                paymentDate: this.formatDateForAPI(purchaseData.paymentDate) || new Date().toISOString().split('T')[0],
                dueDate: this.formatDateForAPI(purchaseData.dueDate) || this.calculateDueDate(purchaseData.paymentTerms),
                reference: purchaseData.paymentReference || '',

                // Enhanced payment details for bank transactions
                chequeNumber: purchaseData.chequeNumber || '',
                chequeDate: this.formatDateForAPI(purchaseData.chequeDate),
                upiTransactionId: purchaseData.upiTransactionId || '',
                bankTransactionId: purchaseData.bankTransactionId || '',

                // Additional payment metadata
                paymentMode: purchaseData.paymentMode || purchaseData.paymentMethod || 'cash',
                bankReference: purchaseData.bankReference || '',
                transactionReference: purchaseData.transactionReference || ''
            };

            // ✅ CRITICAL DEBUG: Log final payment details
            console.log('💰 Final payment details:', {
                paidAmount: paymentDetails.paidAmount,
                pendingAmount: paymentDetails.pendingAmount,
                status: paymentDetails.status,
                method: paymentDetails.method,
                totalAmount: totals.finalTotal
            });

            // Main backend payload
            const backendPayload = {
                // ✅ Purchase metadata
                purchaseNumber: purchaseData.purchaseNumber || purchaseData.invoiceNumber,
                purchaseDate: this.formatDateForAPI(purchaseData.purchaseDate || purchaseData.invoiceDate) || new Date().toISOString().split('T')[0],
                purchaseType: purchaseData.gstEnabled ? 'gst' : 'non-gst',
                gstEnabled: Boolean(purchaseData.gstEnabled),
                companyId: purchaseData.companyId,

                // ✅ ENHANCED: Party information (supplier or customer)
                ...partyData,

                // ✅ User information
                userId: userInfo.userId,
                createdBy: userInfo.createdBy,

                // ✅ Items and totals
                items: processedItems,
                subtotal: parseFloat(totals.subtotal.toFixed(2)),
                totalDiscount: parseFloat(totals.totalDiscount.toFixed(2)),
                totalTax: parseFloat(totals.totalTax.toFixed(2)),
                totalCGST: parseFloat(totals.totalCGST.toFixed(2)),
                totalSGST: parseFloat(totals.totalSGST.toFixed(2)),
                totalIGST: parseFloat(totals.totalIGST.toFixed(2)),
                finalTotal: parseFloat(totals.finalTotal.toFixed(2)),

                // ✅ ENHANCED: Payment information with bank transaction support
                payment: paymentDetails,
                paymentMethod: paymentDetails.method,
                paidAmount: paymentDetails.paidAmount,
                pendingAmount: paymentDetails.pendingAmount,

                // ✅ NEW: Bank transaction details
                bankAccountId: hasBankAccount ? purchaseData.bankAccountId : null,
                createBankTransaction: willCreateTransaction,

                // ✅ NEW: Enhanced transaction metadata
                transactionMetadata: willCreateTransaction ? {
                    amount: paymentAmount,
                    method: paymentDetails.method,
                    bankAccountId: purchaseData.bankAccountId,
                    partyType: partyData.partyType || 'supplier',
                    partyName: partyData.partyName,
                    partyId: partyData.partyId,
                    description: `Purchase payment for ${purchaseData.purchaseNumber || 'new purchase'}`,
                    reference: purchaseData.purchaseNumber || paymentDetails.reference,
                    notes: `Payment made to ${partyData.partyName} for purchase`,

                    // Payment details for transaction
                    chequeNumber: paymentDetails.chequeNumber,
                    chequeDate: paymentDetails.chequeDate,
                    upiTransactionId: paymentDetails.upiTransactionId,
                    bankTransactionId: paymentDetails.bankTransactionId,

                    // Transaction flags
                    direction: 'out', // Money going out for purchase payment
                    transactionType: 'purchase_payment',
                    isAutomaticTransaction: true,
                    createdFrom: 'purchase_form'
                } : null,

                // ✅ Round off information
                roundOff: parseFloat(purchaseData.roundOffValue || purchaseData.roundOff || 0),
                roundOffEnabled: Boolean(purchaseData.roundOffEnabled),

                // ✅ Additional details
                notes: purchaseData.notes || '',
                termsAndConditions: purchaseData.termsAndConditions || '',
                status: purchaseData.status || 'draft',
                receivingStatus: purchaseData.receivingStatus || 'pending',

                // ✅ NEW: Enhanced metadata for comprehensive tracking
                metadata: {
                    source: 'purchase_form',
                    formType: purchaseData.formType || 'purchase',
                    gstCalculationMode: purchaseData.gstEnabled ? 'enabled' : 'disabled',

                    // Payment tracking
                    hasPayment: paymentAmount > 0,
                    paymentAmount: paymentAmount,
                    bankAccountSelected: hasBankAccount,
                    willCreateTransaction: willCreateTransaction,

                    // Party tracking
                    partyType: partyData.partyType || 'supplier',
                    partyName: partyData.partyName,
                    isReversePurchase: partyData.partyType === 'customer',
                    isCrossPurchase: partyData.partyType === 'customer',

                    // Items tracking
                    itemsCount: processedItems.length,
                    totalQuantity: processedItems.reduce((sum, item) => sum + item.quantity, 0),

                    // Calculation method
                    calculationMethod: purchaseData.calculationMethod || 'ItemsTableWithTotals',
                    enhancedDataProvided: !!(purchaseData.totals || purchaseData.paymentInfo),

                    // Timestamps
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),

                    // Form state
                    formVersion: '2.0',
                    dataTransformVersion: '1.0'
                },

                // ✅ NEW: Cross-transaction support flags
                isCrossPurchase: partyData.partyType === 'customer',
                isReversePurchase: partyData.partyType === 'customer',
                partyType: partyData.partyType || 'supplier',

                // ✅ Timestamps
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            // ✅ ENHANCED: Handle totals from ItemsTableWithTotals if provided
            if (purchaseData.totals) {
                console.log('📊 Using totals from ItemsTableWithTotals:', purchaseData.totals);

                // Override calculated totals with provided totals
                backendPayload.subtotal = parseFloat(purchaseData.totals.subtotal || totals.subtotal);
                backendPayload.totalDiscount = parseFloat(purchaseData.totals.totalDiscountAmount || totals.totalDiscount);
                backendPayload.totalTax = parseFloat(purchaseData.totals.totalTax || totals.totalTax);
                backendPayload.totalCGST = parseFloat(purchaseData.totals.totalCGST || totals.totalCGST);
                backendPayload.totalSGST = parseFloat(purchaseData.totals.totalSGST || totals.totalSGST);
                backendPayload.totalIGST = parseFloat(purchaseData.totals.totalIGST || totals.totalIGST);
                backendPayload.finalTotal = parseFloat(purchaseData.totals.finalTotal || totals.finalTotal);

                // Update round off from totals
                if (purchaseData.totals.roundOffValue !== undefined) {
                    backendPayload.roundOff = parseFloat(purchaseData.totals.roundOffValue);
                    backendPayload.roundOffEnabled = Boolean(purchaseData.totals.roundOffEnabled);
                }

                // Recalculate payment amounts based on updated totals
                backendPayload.payment.pendingAmount = Math.max(0, backendPayload.finalTotal - paymentAmount);
                backendPayload.payment.status = paymentAmount >= backendPayload.finalTotal ? 'paid' :
                    (paymentAmount > 0 ? 'partial' : 'pending');
                backendPayload.pendingAmount = backendPayload.payment.pendingAmount;
            }

            // ✅ ENHANCED: Handle payment info from ItemsTableWithTotals
            if (purchaseData.paymentInfo) {
                console.log('💰 Using payment info from ItemsTableWithTotals:', purchaseData.paymentInfo);

                const paymentInfoAmount = parseFloat(purchaseData.paymentInfo.amount || 0);
                const paymentInfoBankAccount = purchaseData.paymentInfo.bankAccountId;
                const paymentInfoMethod = purchaseData.paymentInfo.paymentType || purchaseData.paymentInfo.method || 'cash';

                // Update payment details
                backendPayload.payment.paidAmount = paymentInfoAmount;
                backendPayload.payment.method = paymentInfoMethod;
                backendPayload.payment.pendingAmount = Math.max(0, backendPayload.finalTotal - paymentInfoAmount);
                backendPayload.payment.status = paymentInfoAmount >= backendPayload.finalTotal ? 'paid' :
                    (paymentInfoAmount > 0 ? 'partial' : 'pending');

                // Update bank transaction details
                if (paymentInfoBankAccount && paymentInfoAmount > 0) {
                    backendPayload.bankAccountId = paymentInfoBankAccount;
                    backendPayload.createBankTransaction = true;

                    // Update transaction metadata
                    if (backendPayload.transactionMetadata) {
                        backendPayload.transactionMetadata.amount = paymentInfoAmount;
                        backendPayload.transactionMetadata.method = paymentInfoMethod;
                        backendPayload.transactionMetadata.bankAccountId = paymentInfoBankAccount;
                    }
                } else {
                    backendPayload.createBankTransaction = false;
                    backendPayload.transactionMetadata = null;
                }

                // Update top-level payment fields
                backendPayload.paidAmount = paymentInfoAmount;
                backendPayload.pendingAmount = backendPayload.payment.pendingAmount;
                backendPayload.paymentMethod = paymentInfoMethod;

                // Update metadata
                backendPayload.metadata.hasPayment = paymentInfoAmount > 0;
                backendPayload.metadata.paymentAmount = paymentInfoAmount;
                backendPayload.metadata.bankAccountSelected = !!(paymentInfoBankAccount);
                backendPayload.metadata.willCreateTransaction = !!(paymentInfoBankAccount && paymentInfoAmount > 0);
            }

            // ✅ Final validation of the backend payload
            this.validateBackendPayload(backendPayload);

            console.log('✅ Backend payload prepared successfully:', {
                purchaseNumber: backendPayload.purchaseNumber,
                partyName: backendPayload.supplierName || backendPayload.customerName,
                partyType: backendPayload.partyType,
                itemsCount: backendPayload.items.length,
                finalTotal: backendPayload.finalTotal,
                hasPayment: backendPayload.payment.paidAmount > 0,
                bankAccountId: backendPayload.bankAccountId,
                willCreateTransaction: backendPayload.createBankTransaction,
                transactionAmount: backendPayload.transactionMetadata?.amount || 0
            });

            return backendPayload;

        } catch (error) {
            console.error('❌ Error transforming purchase data:', error);
            throw new Error(`Failed to transform purchase data: ${error.message}`);
        }
    }

    // ✅ NEW: Helper method to calculate due date based on payment terms
    calculateDueDate(paymentTerms = 'immediate') {
        const today = new Date();
        let dueDate = new Date(today);

        switch (paymentTerms) {
            case 'immediate':
            case 'cash':
                // Due today
                break;
            case 'net7':
                dueDate.setDate(today.getDate() + 7);
                break;
            case 'net15':
                dueDate.setDate(today.getDate() + 15);
                break;
            case 'net30':
                dueDate.setDate(today.getDate() + 30);
                break;
            case 'net45':
                dueDate.setDate(today.getDate() + 45);
                break;
            case 'net60':
                dueDate.setDate(today.getDate() + 60);
                break;
            default:
                // Default to 30 days
                dueDate.setDate(today.getDate() + 30);
        }

        return dueDate.toISOString().split('T')[0];
    }

    // ✅ Transform backend data to frontend format with enhanced party support
    transformToFrontendFormat(backendPurchase) {
        try {
            console.log('🔄 Transforming backend purchase:', backendPurchase);

            // Extract totals
            const totals = backendPurchase.totals || {};
            const payment = backendPurchase.payment || {};

            // ✅ ENHANCED: Determine party info from purchase
            const partyInfo = this.extractPartyInfoFromPurchase(backendPurchase);

            const transformed = {
                id: backendPurchase._id || backendPurchase.id,
                purchaseNo: backendPurchase.purchaseNumber || backendPurchase.purchaseNo || 'N/A',
                purchaseNumber: backendPurchase.purchaseNumber || backendPurchase.purchaseNo,
                date: backendPurchase.purchaseDate || backendPurchase.createdAt || backendPurchase.date,
                purchaseDate: backendPurchase.purchaseDate || backendPurchase.createdAt,

                // ✅ ENHANCED: Party information
                partyName: partyInfo.partyName,
                partyType: partyInfo.partyType,
                partyId: partyInfo.partyId,

                // Legacy fields for backward compatibility
                supplierName: partyInfo.partyType === 'supplier' ? partyInfo.partyName : (backendPurchase.supplierName || 'N/A'),
                customerName: partyInfo.partyType === 'customer' ? partyInfo.partyName : (backendPurchase.customerName || null),

                // ✅ FIXED: Extract correct amounts from nested objects
                amount: totals.finalTotal || backendPurchase.finalTotal || 0,
                finalTotal: totals.finalTotal || backendPurchase.finalTotal || 0,
                balance: payment.pendingAmount || backendPurchase.balanceAmount || 0,
                pendingAmount: payment.pendingAmount || backendPurchase.balanceAmount || 0,
                paidAmount: payment.paidAmount || 0,

                purchaseStatus: backendPurchase.status || 'draft',
                status: backendPurchase.status || 'draft',
                receivingStatus: backendPurchase.receivingStatus || 'pending',
                paymentStatus: payment.status || (
                    (payment.pendingAmount || 0) <= 0 ? 'paid' : 'unpaid'
                ),

                // Include nested objects for fallback access
                items: backendPurchase.items || [],
                notes: backendPurchase.notes || '',
                supplier: backendPurchase.supplier || {},
                customer: backendPurchase.customer || {}, // ✅ NEW
                totals: totals,
                payment: payment,
                gstEnabled: backendPurchase.gstEnabled || false,
                paymentMethod: payment.method || 'credit',
                supplierMobile: backendPurchase.supplierMobile || backendPurchase.supplier?.mobile || '',
                customerMobile: backendPurchase.customerMobile || backendPurchase.customer?.mobile || '', // ✅ NEW

                // ✅ NEW: Cross-transaction flags
                isCrossPurchase: backendPurchase.isCrossPurchase || partyInfo.partyType === 'customer',
                isReversePurchase: backendPurchase.isReversePurchase || partyInfo.partyType === 'customer',

                // ✅ FIXED: Add fullObject with all backend data for complex extraction
                fullObject: backendPurchase,

                createdAt: backendPurchase.createdAt,
                updatedAt: backendPurchase.updatedAt || backendPurchase.lastModified
            };

            console.log('✅ Transformed purchase:', transformed);
            return transformed;

        } catch (error) {
            console.error('❌ Error transforming purchase data:', error, backendPurchase);

            // Return error-safe object
            return {
                id: backendPurchase._id || backendPurchase.id || 'unknown',
                purchaseNo: backendPurchase.purchaseNumber || 'Error loading',
                purchaseNumber: backendPurchase.purchaseNumber || 'Error loading',
                date: new Date().toISOString(),
                purchaseDate: new Date().toISOString(),
                partyName: 'Error loading',
                partyType: 'unknown',
                supplierName: 'Error loading',
                customerName: null,
                amount: 0,
                finalTotal: 0,
                balance: 0,
                pendingAmount: 0,
                paidAmount: 0,
                purchaseStatus: 'error',
                status: 'error',
                receivingStatus: 'error',
                paymentStatus: 'error',
                items: [],
                totals: {},
                payment: {},
                fullObject: backendPurchase // Still include full object for debugging
            };
        }
    }

    // ==================== VALIDATION METHODS (Enhanced) ====================

    validatePurchaseData(purchaseData) {
        const errors = [];

        if (!purchaseData.companyId) {
            errors.push('Company ID is required');
        }

        // ✅ ENHANCED: Check for either supplier or customer information
        const hasSupplier = purchaseData.supplier && (purchaseData.supplier.name || purchaseData.supplier._id);
        const hasCustomer = purchaseData.customer && (purchaseData.customer.name || purchaseData.customer._id);
        const hasSelectedSupplier = purchaseData.selectedSupplier && (purchaseData.selectedSupplier.name || purchaseData.selectedSupplier._id);
        const hasSelectedCustomer = purchaseData.selectedCustomer && (purchaseData.selectedCustomer.name || purchaseData.selectedCustomer._id);
        const hasSupplierName = purchaseData.supplierName;
        const hasCustomerName = purchaseData.customerName;
        const hasMobileNumber = purchaseData.mobileNumber;
        const hasPartyInfo = purchaseData.selectedParty && purchaseData.partyName;

        if (!hasSupplier && !hasCustomer && !hasSelectedSupplier && !hasSelectedCustomer &&
            !hasSupplierName && !hasCustomerName && !hasMobileNumber && !hasPartyInfo) {
            errors.push('Either supplier or customer information is required');
        }

        const validItems = (purchaseData.items || []).filter(item =>
            item.itemName &&
            item.itemName.trim() !== '' &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) >= 0
        );

        if (validItems.length === 0) {
            errors.push('At least one valid item is required');
        }

        if (!purchaseData.purchaseNumber) {
            errors.push('Purchase number is required');
        }

        if (errors.length > 0) {
            throw new Error(`Purchase validation failed: ${errors.join(', ')}`);
        }
    }

    validateBackendPayload(payload) {
        const errors = [];

        // ✅ ENHANCED: Check for either supplier or customer name
        if (!payload.supplierName && !payload.customerName && !payload.partyName) {
            errors.push('Either supplier name or customer name is required');
        }

        if (!payload.companyId) {
            errors.push('Company ID is missing');
        }

        if (!payload.userId) {
            errors.push('User ID is missing');
        }

        if (!payload.items || payload.items.length === 0) {
            errors.push('Items array is missing or empty');
        }

        if (errors.length > 0) {
            throw new Error(`Backend payload validation failed: ${errors.join(', ')}`);
        }
    }

    // ==================== DATA PROCESSING METHODS (Enhanced) ====================

    getUserInfo(purchaseData) {
        if (purchaseData.userId && purchaseData.createdBy) {
            return {
                userId: purchaseData.userId,
                createdBy: purchaseData.createdBy
            };
        }

        try {
            const possibleKeys = ['user', 'currentUser', 'authUser', 'loggedInUser'];

            for (const key of possibleKeys) {
                const userStr = localStorage.getItem(key);
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        if (user && (user._id || user.id)) {
                            return {
                                userId: user._id || user.id,
                                createdBy: user._id || user.id
                            };
                        }
                    } catch (parseError) {
                        console.warn(`⚠️ Could not parse user from key '${key}':`, parseError);
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Error accessing localStorage:', error);
        }

        // Fallback
        return {
            userId: '684325fb769fc9190846750c',
            createdBy: '684325fb769fc9190846750c'
        };
    }

    // ✅ ENHANCED: Process party data (replaces processSupplierData)
    processPartyData(purchaseData) {
        console.log('🔄 Processing party data for purchase:', purchaseData);

        // Extract party info using the helper method
        const partyInfo = this.extractPartyInfo(purchaseData);

        if (partyInfo.partyType === 'supplier') {
            // Process as supplier
            return {
                partyType: 'supplier',
                partyName: partyInfo.partyName,
                partyId: partyInfo.partyId,

                // Supplier-specific fields
                supplierId: partyInfo.partyId,
                supplierName: partyInfo.partyName,
                supplierMobile: this.extractMobile(purchaseData, 'supplier'),
                supplierEmail: this.extractEmail(purchaseData, 'supplier'),
                supplierAddress: this.extractAddress(purchaseData, 'supplier'),
                supplierGSTNumber: this.extractGSTNumber(purchaseData, 'supplier')
            };
        } else if (partyInfo.partyType === 'customer') {
            // Process as customer (reverse purchase)
            return {
                partyType: 'customer',
                partyName: partyInfo.partyName,
                partyId: partyInfo.partyId,

                // Customer-specific fields
                customerId: partyInfo.partyId,
                customerName: partyInfo.partyName,
                customerMobile: this.extractMobile(purchaseData, 'customer'),
                customerEmail: this.extractEmail(purchaseData, 'customer'),
                customerAddress: this.extractAddress(purchaseData, 'customer'),
                customerGSTNumber: this.extractGSTNumber(purchaseData, 'customer'),

                // For legacy compatibility, also set supplier fields with default
                supplierName: `Reverse Purchase from ${partyInfo.partyName}`,
                supplierMobile: ''
            };
        } else {
            // Fallback to mobile number or cash purchase
            const mobile = purchaseData.mobileNumber || '';
            const name = mobile ? `Walk-in Party (${mobile})` : 'Cash Purchase';

            return {
                partyType: 'supplier', // Default to supplier
                partyName: name,
                partyId: null,
                supplierName: name,
                supplierMobile: mobile,
                supplierEmail: '',
                supplierAddress: '',
                supplierGSTNumber: ''
            };
        }
    }

    // ✅ NEW: Extract mobile number based on party type
    extractMobile(purchaseData, partyType) {
        const party = purchaseData[partyType] || purchaseData[`selected${partyType.charAt(0).toUpperCase() + partyType.slice(1)}`] || {};
        return party.mobile || party.phoneNumber || purchaseData.mobileNumber || '';
    }

    // ✅ NEW: Extract email based on party type
    extractEmail(purchaseData, partyType) {
        const party = purchaseData[partyType] || purchaseData[`selected${partyType.charAt(0).toUpperCase() + partyType.slice(1)}`] || {};
        return party.email || '';
    }

    // ✅ NEW: Extract address based on party type
    extractAddress(purchaseData, partyType) {
        const party = purchaseData[partyType] || purchaseData[`selected${partyType.charAt(0).toUpperCase() + partyType.slice(1)}`] || {};
        return party.address || party.billingAddress || '';
    }

    // ✅ NEW: Extract GST number based on party type
    extractGSTNumber(purchaseData, partyType) {
        const party = purchaseData[partyType] || purchaseData[`selected${partyType.charAt(0).toUpperCase() + partyType.slice(1)}`] || {};
        return party.gstNumber || party.gstIN || '';
    }

    processItemsData(purchaseData) {
        const validItems = (purchaseData.items || [])
            .filter(item => {
                const isValid = item.itemName &&
                    item.itemName.trim() !== '' &&
                    parseFloat(item.quantity) > 0 &&
                    parseFloat(item.pricePerUnit) >= 0;

                if (!isValid) {
                    console.warn('⚠️ Skipping invalid item:', {
                        name: item.itemName || 'No name',
                        quantity: item.quantity,
                        price: item.pricePerUnit
                    });
                }

                return isValid;
            })
            .map((item, index) => {
                const quantity = parseFloat(item.quantity) || 1;
                const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
                const taxRate = parseFloat(item.taxRate || item.gstRate) || 0;
                const discountAmount = parseFloat(item.discountAmount) || 0;

                let baseAmount = quantity * pricePerUnit;
                let taxableAmount = baseAmount - discountAmount;
                let taxAmount = 0;
                let finalAmount = taxableAmount;

                if (purchaseData.gstEnabled && taxRate > 0) {
                    if (item.taxMode === 'with-tax') {
                        taxableAmount = baseAmount / (1 + taxRate / 100);
                        taxAmount = baseAmount - taxableAmount;
                        finalAmount = baseAmount - discountAmount;
                    } else {
                        taxAmount = (taxableAmount * taxRate) / 100;
                        finalAmount = taxableAmount + taxAmount;
                    }
                }

                const cgst = purchaseData.gstEnabled ? taxAmount / 2 : 0;
                const sgst = purchaseData.gstEnabled ? taxAmount / 2 : 0;

                return {
                    itemRef: item.itemRef || item._id || item.id || null,
                    itemName: item.itemName,
                    itemCode: item.itemCode || item.sku || '',
                    hsnCode: item.hsnCode || item.hsnNumber || '0000',
                    category: item.category || '',
                    description: item.description || '',
                    quantity: quantity,
                    unit: item.unit || 'PCS',
                    pricePerUnit: pricePerUnit,
                    taxRate: taxRate,
                    taxMode: item.taxMode || 'with-tax',
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    igst: 0,
                    discountAmount: discountAmount,
                    baseAmount: parseFloat(baseAmount.toFixed(2)),
                    taxAmount: parseFloat(taxAmount.toFixed(2)),
                    itemAmount: parseFloat(finalAmount.toFixed(2)),
                    lineNumber: index + 1
                };
            });

        return validItems;
    }

    calculateTotalsFromItems(processedItems, purchaseData) {
        const totals = processedItems.reduce((acc, item) => {
            acc.subtotal += item.baseAmount;
            acc.totalDiscount += item.discountAmount;
            acc.totalTax += item.taxAmount;
            acc.totalCGST += item.cgst;
            acc.totalSGST += item.sgst;
            acc.totalIGST += item.igst;
            return acc;
        }, {
            subtotal: 0,
            totalDiscount: 0,
            totalTax: 0,
            totalCGST: 0,
            totalSGST: 0,
            totalIGST: 0
        });

        const finalTotal = totals.subtotal - totals.totalDiscount + totals.totalTax +
            (parseFloat(purchaseData.roundOff) || 0);

        return {
            ...totals,
            finalTotal: finalTotal
        };
    }

    // ==================== STATUS AND OPTIONS ====================

    getPurchaseStatusOptions() {
        return [
            { value: '', label: 'All Status' },
            { value: 'draft', label: 'Draft' },
            { value: 'ordered', label: 'Ordered' },
            { value: 'received', label: 'Received' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
        ];
    }

    getReceivingStatusOptions() {
        return [
            { value: '', label: 'All Receiving Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'partial', label: 'Partially Received' },
            { value: 'received', label: 'Fully Received' },
            { value: 'overdue', label: 'Overdue' }
        ];
    }

    getPaymentStatusOptions() {
        return [
            { value: '', label: 'All Payment Status' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partial', label: 'Partially Paid' },
            { value: 'paid', label: 'Fully Paid' },
            { value: 'overdue', label: 'Overdue' }
        ];
    }

    // ✅ NEW: Get party type options
    getPartyTypeOptions() {
        return [
            { value: '', label: 'All Party Types' },
            { value: 'supplier', label: 'Suppliers' },
            { value: 'customer', label: 'Customers (Reverse Purchase)' }
        ];
    }

    // ==================== UTILITY METHODS ====================

    formatDateForAPI(date) {
        if (!date) return null;

        try {
            if (typeof date === 'string') {
                return date.split('T')[0];
            }

            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }

            return null;
        } catch (error) {
            console.warn('Error formatting date for API:', error);
            return null;
        }
    }

    formatCurrency(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return '₹0';
        }

        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        if (isNaN(numAmount)) {
            return '₹0';
        }

        if (numAmount >= 10000000) {
            return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
        } else if (numAmount >= 100000) {
            return `₹${(numAmount / 100000).toFixed(1)}L`;
        } else if (numAmount >= 1000) {
            return `₹${(numAmount / 1000).toFixed(1)}K`;
        }

        return `₹${numAmount.toLocaleString('en-IN')}`;
    }

    // ==================== EXPORT OPERATIONS ====================

    async exportCSV(companyId, filters = {}) {
        if (!companyId) {
            throw new Error('Company ID is required for export');
        }

        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    params.append(key, filters[key]);
                }
            });

            const queryString = params.toString();
            const endpoint = `/companies/${companyId}/purchases/export${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            console.log('✅ Purchase CSV export successful');
            return blob;

        } catch (error) {
            console.error('❌ Error exporting purchases:', error);
            throw error;
        }
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
}

// Export single instance
export default new PurchaseService();