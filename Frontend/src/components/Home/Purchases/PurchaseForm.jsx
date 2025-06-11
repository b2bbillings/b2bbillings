import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import GSTToggle from '../Sales/SalesInvoice/SalesForm/GSTToggle';
import CustomerSection from '../Sales/SalesInvoice/SalesForm/CustomerSection';
import InvoiceDetails from '../Sales/SalesInvoice/SalesForm/InvoiceDetails';
import ItemsTableWithTotals from '../Sales/SalesInvoice/SalesForm/itemsTableWithTotals/ItemsTableWithTotals';
import purchaseService from '../../../services/purchaseService';

function PurchaseForm({
    onSave,
    onCancel,
    onExit,
    inventoryItems = [],
    categories = [],
    bankAccounts = [],
    onAddItem,
    addToast
}) {
    const navigate = useNavigate();
    const { companyId } = useParams();
    const [localCompanyId, setLocalCompanyId] = useState(null);

    // Enhanced state management
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);

    useEffect(() => {
        if (!companyId) {
            const storedCompanyId = localStorage.getItem('selectedCompanyId') ||
                localStorage.getItem('companyId') ||
                sessionStorage.getItem('companyId');

            console.log('🏢 PurchaseForm - CompanyId from storage:', storedCompanyId);
            setLocalCompanyId(storedCompanyId);
        }
    }, [companyId]);

    const effectiveCompanyId = companyId || localCompanyId;

    // Purchase-specific configuration with bank transaction support
    const purchaseConfiguration = useMemo(() => ({
        // Party configuration - Purchase-specific
        party: {
            primaryPartyType: 'supplier',
            secondaryPartyType: 'customer',
            allowBothParties: true,
            showBothPartyFields: true,
            enablePartySwitch: true,
            defaultPartyLabel: 'Supplier',
            crossPartyLabel: 'Customer',
            searchPlaceholder: 'Search suppliers or customers...',
            addNewLabel: 'Add New Party',
            fieldConfig: {
                showSupplierField: true,
                showCustomerField: true,
                supplierRequired: false,
                customerRequired: false,
                atLeastOneRequired: true,
                allowEmptySelection: false,
                defaultSelection: 'supplier'
            }
        },

        // UI Labels - Purchase-specific
        ui: {
            formTitle: 'Purchase Bill',
            pageTitle: 'Create Purchase',
            addButtonText: 'Add Purchase',
            editButtonText: 'Edit Purchase',
            primaryPartyLabel: 'Supplier',
            secondaryPartyLabel: 'Customer',
            amountLabel: 'Purchase Amount',
            paymentLabel: 'Payment Made',
            invoiceLabel: 'Purchase Bill',
            invoiceNumberLabel: 'Bill No.',
            totalLabel: 'Total Purchase',
            balanceLabel: 'Amount Payable',
            paidLabel: 'Amount Paid',
            dueLabel: 'Amount Due',
            statusLabel: 'Purchase Status',
            dateLabel: 'Purchase Date',
            saveButtonText: 'Save Purchase',
            shareButtonText: 'Share Purchase',
            cancelButtonText: 'Cancel Purchase'
        },

        // Payment and transaction configuration
        payment: {
            enableBankTransactions: true,
            defaultPaymentMethod: 'cash',
            supportedMethods: ['cash', 'bank_transfer', 'cheque', 'upi', 'card'],
            requireBankAccountForTransactions: true,
            autoCreateTransactions: true,
            showPaymentSection: true,
            allowPartialPayments: true
        },

        // Service configuration
        service: {
            serviceName: 'purchaseService',
            apiEndpoint: 'purchases',
            transactionType: 'purchase',
            createMethod: 'createPurchaseWithTransaction',
            updateMethod: 'updatePurchase',
            deleteMethod: 'deletePurchase',
            createTransactionMethod: 'createPurchaseTransaction',
            supportsBankTransactions: true,
            requiresTransactionData: true
        },

        // Theme configuration
        theme: {
            primaryColor: '#ff5722',
            primaryColorHover: '#e64a19',
            successColor: '#4caf50',
            warningColor: '#ff9800',
            dangerColor: '#f44336',
            infoColor: '#2196f3'
        }
    }), []);

    // Generate purchase number function
    const generatePurchaseNumber = (purchaseType = 'non-gst') => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);

        if (purchaseType === 'gst') {
            return `PUR-GST-${year}${month}${day}-${random}`;
        } else {
            return `PUR-${year}${month}${day}-${random}`;
        }
    };

    // Form data with comprehensive structure
    const [formData, setFormData] = useState({
        gstEnabled: true,
        invoiceType: 'gst',
        supplier: null,
        customer: null,
        supplierName: '',
        supplierMobile: '',
        customerName: '',
        customerMobile: '',
        mobileNumber: '',
        purchaseNumber: generatePurchaseNumber('gst'),
        purchaseDate: new Date().toISOString().split('T')[0],
        items: [],

        // Enhanced payment information
        paymentMethod: 'cash',
        paymentReceived: 0,
        bankAccountId: '',

        // Additional payment details
        paymentReference: '',
        chequeNumber: '',
        chequeDate: '',
        upiTransactionId: '',
        bankTransactionId: '',
        paymentTerms: 'immediate',
        dueDate: '',

        notes: '',
        termsAndConditions: '',
        status: 'draft'
    });

    // Simplified initialization
    useEffect(() => {
        if (formData.items.length === 0) {
            setFormData(prev => ({
                ...prev,
                items: []
            }));
        }
    }, [formData.gstEnabled]);

    // Handle invoice type change
    const handleInvoiceTypeChange = (newType) => {
        console.log('📋 Changing purchase type to:', newType);

        const gstEnabled = newType === 'gst';
        const newPurchaseNumber = generatePurchaseNumber(newType);

        setFormData(prev => {
            const updatedItems = prev.items.map(item => ({
                ...item,
                taxRate: gstEnabled ? (item.taxRate || 18) : 0,
                cgstAmount: gstEnabled ? item.cgstAmount : 0,
                sgstAmount: gstEnabled ? item.sgstAmount : 0,
                igstAmount: gstEnabled ? item.igstAmount : 0,
                taxAmount: gstEnabled ? item.taxAmount : 0
            }));

            return {
                ...prev,
                invoiceType: newType,
                gstEnabled,
                purchaseNumber: newPurchaseNumber,
                items: updatedItems
            };
        });
    };

    // Handle GST toggle change
    const handleGSTToggleChange = (enabled) => {
        console.log('🔄 GST Toggle changed to:', enabled);

        const newInvoiceType = enabled ? 'gst' : 'non-gst';
        const newPurchaseNumber = generatePurchaseNumber(newInvoiceType);

        setFormData(prev => {
            const updatedItems = prev.items.map(item => ({
                ...item,
                taxRate: enabled ? (item.taxRate || 18) : 0,
                cgstAmount: enabled ? item.cgstAmount : 0,
                sgstAmount: enabled ? item.sgstAmount : 0,
                igstAmount: enabled ? item.igstAmount : 0,
                taxAmount: enabled ? item.taxAmount : 0
            }));

            return {
                ...prev,
                gstEnabled: enabled,
                invoiceType: newInvoiceType,
                purchaseNumber: newPurchaseNumber,
                items: updatedItems
            };
        });
    };

    // Update form data helper
    const updateFormData = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle items change from the merged component
    const handleItemsChange = (newItems) => {
        console.log('🔄 Items updated from ItemsTableWithTotals:', newItems.length);
        updateFormData('items', newItems);
    };

    // Handle data from ItemsTableWithTotals (including totals and payment info)
    const handleDataFromTable = (tableData) => {
        console.log('📊 Received comprehensive data from ItemsTableWithTotals:', tableData);

        if (tableData.items) {
            updateFormData('items', tableData.items);
        }

        // Handle payment information from table
        if (tableData.paymentInfo) {
            const paymentInfo = tableData.paymentInfo;
            setFormData(prev => ({
                ...prev,
                paymentReceived: parseFloat(paymentInfo.amount || 0),
                paymentMethod: paymentInfo.paymentType || paymentInfo.method || 'cash',
                bankAccountId: paymentInfo.bankAccountId || '',
                paymentReference: paymentInfo.reference || '',
                chequeNumber: paymentInfo.chequeNumber || '',
                chequeDate: paymentInfo.chequeDate || '',
                upiTransactionId: paymentInfo.upiTransactionId || '',
                bankTransactionId: paymentInfo.bankTransactionId || ''
            }));
        }

        // Store complete table data for save operation
        setFormData(prev => ({
            ...prev,
            tableData: tableData,
            totals: tableData.totals,
            lastTableUpdate: new Date().toISOString()
        }));
    };

    // Enhanced validation function
    const validateForm = () => {
        const errors = [];

        if (!effectiveCompanyId) {
            errors.push('Company selection is required');
        }

        // Validate either supplier or customer (or both)
        if (!formData.supplier && !formData.customer && !formData.supplierName && !formData.customerName && !formData.mobileNumber) {
            errors.push('Please select a supplier, customer, or enter party information');
        }

        if (!formData.purchaseNumber) {
            errors.push('Purchase number is required');
        } else {
            const gstPattern = /^PUR-GST-\d{8}-\d{4}$/;
            const nonGstPattern = /^PUR-\d{8}-\d{4}$/;

            if (formData.invoiceType === 'gst' && !gstPattern.test(formData.purchaseNumber)) {
                errors.push('GST purchase number must follow format: PUR-GST-YYYYMMDD-XXXX');
            }

            if (formData.invoiceType === 'non-gst' && !nonGstPattern.test(formData.purchaseNumber)) {
                errors.push('Purchase number must follow format: PUR-YYYYMMDD-XXXX');
            }
        }

        const validItems = formData.items.filter(item =>
            item.itemName &&
            parseFloat(item.quantity) > 0 &&
            parseFloat(item.pricePerUnit) > 0
        );

        if (validItems.length === 0) {
            errors.push('Please add at least one valid item');
        }

        if (formData.invoiceType === 'gst' && formData.gstEnabled) {
            const itemsWithoutHSN = validItems.filter(item => !item.hsnCode);
            if (itemsWithoutHSN.length > 0) {
                errors.push('HSN codes are required for GST purchases');
            }
        }

        // Bank transaction validation
        const paymentAmount = parseFloat(formData.paymentReceived || 0);
        if (paymentAmount > 0 && formData.paymentMethod !== 'cash' && !formData.bankAccountId) {
            errors.push('Bank account is required for non-cash payments');
        }

        // Calculate total for validation
        const total = validItems.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.pricePerUnit) || 0;
            return sum + (quantity * price);
        }, 0);

        if (total <= 0) {
            errors.push('Purchase total must be greater than zero');
        }

        // Payment amount validation
        if (paymentAmount > total) {
            errors.push('Payment amount cannot exceed total purchase amount');
        }

        setValidationErrors(errors);
        return errors;
    };

    // ✅ FINAL COMPLETE FIXED handleSave - GUARANTEED to return a value in ALL scenarios
    const handleSave = useCallback(async (invoiceDataFromTable) => {
        console.log('💾 PurchaseForm: Save initiated with call guard');

        // ✅ CRITICAL: Prevent multiple simultaneous calls
        if (isSubmitting) {
            console.warn('⚠️ Save already in progress, ignoring duplicate call');
            return {
                success: false,
                error: 'Save already in progress',
                message: 'Save operation is already running. Please wait.'
            };
        }

        console.log('📥 Data received from ItemsTableWithTotals:', invoiceDataFromTable);
        console.log('📄 Current form data:', formData);

        // ✅ CRITICAL FIX: Declare ALL variables outside try block for proper scope
        let itemsToSave = [];
        let supplierData = null;
        let customerData = null;
        let purchaseData = {};
        let result = null;
        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // ✅ Set loading states FIRST
            setLoading(true);
            setError(null);
            setIsSubmitting(true);

            console.log(`🚀 [${callId}] Starting save process...`);

            // ✅ Add delay to ensure state updates
            await new Promise(resolve => setTimeout(resolve, 50));

            // ✅ CRITICAL: Validate required functions and data
            if (!validateForm || typeof validateForm !== 'function') {
                console.error(`❌ [${callId}] validateForm function not available`);
                return {
                    success: false,
                    error: 'Validation function not available',
                    message: 'Form validation function is missing. Please refresh the page.',
                    callId: callId
                };
            }

            if (!onSave || typeof onSave !== 'function') {
                console.error(`❌ [${callId}] onSave function not available:`, { onSave, type: typeof onSave });
                return {
                    success: false,
                    error: 'Save function not available',
                    message: 'Save function is missing. Please refresh the page.',
                    callId: callId
                };
            }

            if (!effectiveCompanyId) {
                console.error(`❌ [${callId}] Company ID not available`);
                return {
                    success: false,
                    error: 'Company ID not available',
                    message: 'Company information is missing. Please refresh the page.',
                    callId: callId
                };
            }

            // ✅ Form validation
            let errors = [];
            try {
                errors = validateForm() || [];
            } catch (validationError) {
                console.error(`❌ [${callId}] Validation function error:`, validationError);
                return {
                    success: false,
                    error: 'Validation error',
                    message: 'Form validation failed. Please check your data and try again.',
                    callId: callId
                };
            }

            if (errors.length > 0) {
                const errorMessage = 'Please fix the following errors:\n\n' + errors.join('\n');
                if (addToast) {
                    addToast(errorMessage, 'error');
                } else {
                    alert(errorMessage);
                }
                return {
                    success: false,
                    error: 'Validation failed',
                    message: errors.join('; '),
                    callId: callId
                };
            }

            // ✅ Process items with error handling
            try {
                itemsToSave = invoiceDataFromTable?.items || formData.items?.filter(item =>
                    item.itemName &&
                    parseFloat(item.quantity) > 0 &&
                    parseFloat(item.pricePerUnit) > 0
                ) || [];
            } catch (itemFilterError) {
                console.error(`❌ [${callId}] Error filtering items:`, itemFilterError);
                return {
                    success: false,
                    error: 'Item processing error',
                    message: 'Error processing invoice items. Please check your item data.',
                    callId: callId
                };
            }

            if (itemsToSave.length === 0) {
                const errorMessage = 'Please add at least one valid item to the purchase';
                if (addToast) {
                    addToast(errorMessage, 'error');
                }
                return {
                    success: false,
                    error: 'No valid items',
                    message: errorMessage,
                    callId: callId
                };
            }

            // ✅ Process party data
            if (formData.supplier) {
                supplierData = {
                    _id: formData.supplier._id || formData.supplier.id,
                    name: formData.supplier.name || formData.supplier.businessName || 'Unknown Supplier',
                    mobile: formData.supplier.mobile || formData.supplier.phoneNumber || formData.supplierMobile || '',
                    email: formData.supplier.email || '',
                    address: formData.supplier.address || formData.supplier.billingAddress || '',
                    gstNumber: formData.supplier.gstNumber || formData.supplier.gstIN || ''
                };
            } else if (formData.supplierName || formData.supplierMobile) {
                supplierData = {
                    name: formData.supplierName || `Supplier (${formData.supplierMobile})`,
                    mobile: formData.supplierMobile || '',
                    email: '',
                    address: '',
                    gstNumber: ''
                };
            }

            if (formData.customer) {
                customerData = {
                    _id: formData.customer._id || formData.customer.id,
                    name: formData.customer.name || formData.customer.businessName || 'Unknown Customer',
                    mobile: formData.customer.mobile || formData.customer.phoneNumber || formData.customerMobile || '',
                    email: formData.customer.email || '',
                    address: formData.customer.address || formData.customer.billingAddress || '',
                    gstNumber: formData.customer.gstNumber || formData.customer.gstIN || ''
                };
            } else if (formData.customerName || formData.customerMobile) {
                customerData = {
                    name: formData.customerName || `Customer (${formData.customerMobile})`,
                    mobile: formData.customerMobile || '',
                    email: '',
                    address: '',
                    gstNumber: ''
                };
            }

            if (!supplierData && !customerData && formData.mobileNumber) {
                supplierData = {
                    name: `Walk-in Purchase (${formData.mobileNumber})`,
                    mobile: formData.mobileNumber,
                    email: '',
                    address: '',
                    gstNumber: ''
                };
            }

            // ✅ Prepare purchase data
            purchaseData = {
                companyId: effectiveCompanyId,
                formType: 'purchase',
                purchaseNumber: formData.purchaseNumber,
                purchaseDate: formData.purchaseDate,
                gstEnabled: formData.gstEnabled,
                invoiceType: formData.invoiceType,
                selectedSupplier: supplierData,
                selectedCustomer: customerData,
                supplier: supplierData,
                customer: customerData,
                supplierName: supplierData?.name || null,
                customerName: customerData?.name || null,
                items: itemsToSave,
                totals: invoiceDataFromTable?.totals || {
                    finalTotal: 0,
                    subtotal: 0,
                    totalTax: 0,
                    totalCGST: 0,
                    totalSGST: 0,
                    totalDiscountAmount: 0,
                    totalQuantity: 0,
                    withTaxTotal: 0,
                    withoutTaxTotal: 0,
                    roundOffValue: 0,
                    roundOffEnabled: false
                },
                paymentReceived: invoiceDataFromTable?.paymentInfo?.amount || formData.paymentReceived || 0,
                paidAmount: invoiceDataFromTable?.paymentInfo?.amount || formData.paymentReceived || 0,
                bankAccountId: invoiceDataFromTable?.paymentInfo?.bankAccountId || formData.bankAccountId || null,
                paymentMethod: invoiceDataFromTable?.paymentInfo?.paymentType || formData.paymentMethod || 'cash',
                chequeNumber: invoiceDataFromTable?.paymentInfo?.chequeNumber || formData.chequeNumber || '',
                chequeDate: invoiceDataFromTable?.paymentInfo?.chequeDate || formData.chequeDate || null,
                upiTransactionId: invoiceDataFromTable?.paymentInfo?.upiTransactionId || formData.upiTransactionId || '',
                bankTransactionId: invoiceDataFromTable?.paymentInfo?.bankTransactionId || formData.bankTransactionId || '',
                paymentInfo: invoiceDataFromTable?.paymentInfo || null,
                paymentReference: formData.paymentReference || '',
                paymentTerms: formData.paymentTerms || 'immediate',
                roundOff: invoiceDataFromTable?.roundOff || {
                    enabled: invoiceDataFromTable?.roundOffEnabled || false,
                    value: invoiceDataFromTable?.roundOffValue || 0
                },
                roundOffValue: invoiceDataFromTable?.roundOffValue || 0,
                roundOffEnabled: invoiceDataFromTable?.roundOffEnabled || false,
                notes: formData.notes || '',
                termsAndConditions: formData.termsAndConditions || '',
                status: formData.status || 'draft',
                dueDate: formData.dueDate || '',
                gstCalculationMode: invoiceDataFromTable?.gstEnabled !== undefined
                    ? (invoiceDataFromTable.gstEnabled ? 'enabled' : 'disabled')
                    : (formData.gstEnabled ? 'enabled' : 'disabled'),
                invoiceMetadata: {
                    formType: 'purchase',
                    createdFrom: 'PurchaseForm_ItemsTableWithTotals',
                    hasPayment: !!(invoiceDataFromTable?.paymentInfo?.amount || formData.paymentReceived),
                    paymentAmount: invoiceDataFromTable?.paymentInfo?.amount || formData.paymentReceived || 0,
                    bankAccountSelected: !!(invoiceDataFromTable?.paymentInfo?.bankAccountId || formData.bankAccountId),
                    enhancedDataProvided: !!invoiceDataFromTable,
                    calculationMethod: 'ItemsTableWithTotals',
                    willCreateBankTransaction: !!(
                        (invoiceDataFromTable?.paymentInfo?.bankAccountId || formData.bankAccountId) &&
                        (invoiceDataFromTable?.paymentInfo?.amount || formData.paymentReceived) > 0
                    ),
                    serviceMethod: 'createPurchaseWithTransaction'
                },
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                createdBy: 'purchase-form'
            };

            console.log(`📦 [${callId}] Final purchase data prepared:`, {
                companyId: purchaseData.companyId,
                purchaseNumber: purchaseData.purchaseNumber,
                itemCount: purchaseData.items.length,
                totalsFinalTotal: purchaseData.totals.finalTotal,
                hasPayment: !!purchaseData.paymentInfo,
                bankAccountId: purchaseData.bankAccountId,
                paymentAmount: purchaseData.paymentReceived
            });

            // ✅ CRITICAL: Call onSave with comprehensive error handling
            console.log(`📨 [${callId}] Calling onSave function...`);

            try {
                result = await onSave(purchaseData);
                console.log(`📨 [${callId}] Raw onSave result received:`, {
                    result: result,
                    type: typeof result,
                    isNull: result === null,
                    isUndefined: result === undefined,
                    hasSuccess: result?.success,
                    hasData: !!result?.data,
                    hasError: !!result?.error,
                    keys: result && typeof result === 'object' ? Object.keys(result) : 'not object'
                });
            } catch (onSaveError) {
                console.error(`❌ [${callId}] onSave function threw an error:`, onSaveError);
                const errorMessage = `Save operation failed: ${onSaveError.message || 'Unknown error'}`;
                if (addToast) {
                    addToast(errorMessage, 'error');
                }
                return {
                    success: false,
                    error: onSaveError.message || 'Save function error',
                    message: errorMessage,
                    callId: callId,
                    debugInfo: {
                        errorType: onSaveError.constructor.name,
                        originalError: onSaveError.message,
                        hasValidItems: itemsToSave?.length > 0,
                        companyId: effectiveCompanyId,
                        purchaseNumber: formData.purchaseNumber
                    }
                };
            }

            // ✅ CRITICAL: Handle undefined/null result
            if (result === undefined || result === null) {
                console.error(`❌ [${callId}] onSave returned undefined/null:`, result);
                const errorMessage = 'Purchase save function returned no result. Please try again.';
                if (addToast) {
                    addToast(errorMessage, 'error');
                }
                return {
                    success: false,
                    error: 'No result from save function',
                    message: errorMessage,
                    callId: callId,
                    debugInfo: {
                        resultReceived: result,
                        hasValidItems: itemsToSave?.length > 0,
                        companyId: effectiveCompanyId,
                        purchaseNumber: formData.purchaseNumber
                    }
                };
            }

            // ✅ Success validation
            const isSuccessfulResult = (
                (result && result.success === true) ||
                (result && result.data && result.success !== false) ||
                (result &&
                    typeof result === 'object' &&
                    result !== null &&
                    Object.keys(result).length > 0 &&
                    !result.error &&
                    !result.failed &&
                    result.success !== false) ||
                (result && (
                    result.purchase ||
                    result._id ||
                    result.id ||
                    result.purchaseNumber
                ))
            );

            console.log(`🔍 [${callId}] Success validation:`, {
                isSuccessfulResult,
                hasSuccess: result?.success,
                hasData: !!result?.data,
                hasError: !!result?.error
            });

            if (isSuccessfulResult) {
                console.log(`✅ [${callId}] Purchase created successfully`);

                const purchaseResult = result?.data?.purchase ||
                    result?.data ||
                    result?.purchase ||
                    result ||
                {
                    purchaseNumber: purchaseData.purchaseNumber,
                    total: purchaseData.totals.finalTotal,
                    items: itemsToSave,
                    createdAt: new Date().toISOString()
                };

                let successMessage = `Purchase ${purchaseData.purchaseNumber} created successfully!`;

                if (result?.data?.transaction || purchaseResult?.transaction) {
                    successMessage += ' Payment transaction recorded.';
                }

                if (result?.data?.transactionWarning || result?.transactionWarning) {
                    successMessage += ` Note: ${result.data?.transactionWarning || result.transactionWarning}`;
                }

                if (addToast) {
                    addToast(successMessage, 'success');
                }

                try {
                    const draftKey = `purchase_draft_${effectiveCompanyId}_${formData.purchaseNumber}`;
                    localStorage.removeItem(draftKey);
                    console.log('🗑️ Cleared purchase draft after successful save');
                } catch (draftError) {
                    console.warn('Could not clear draft:', draftError);
                }

                setTimeout(() => {
                    const purchaseBillsUrl = `/companies/${effectiveCompanyId}/purchase-bills`;
                    navigate(purchaseBillsUrl, {
                        replace: true,
                        state: {
                            fromPurchaseForm: true,
                            savedPurchase: purchaseResult,
                            successMessage: successMessage,
                            timestamp: new Date().toISOString(),
                            hasTransaction: !!(result?.data?.transaction || purchaseResult?.transaction)
                        }
                    });
                }, 1500);

                return {
                    success: true,
                    data: purchaseResult,
                    message: successMessage,
                    totals: purchaseData.totals,
                    paymentInfo: purchaseData.paymentInfo,
                    purchaseNumber: purchaseData.purchaseNumber,
                    transaction: result?.data?.transaction || purchaseResult?.transaction || null,
                    bankTransactionCreated: !!(result?.data?.transaction || purchaseResult?.transaction),
                    navigating: true,
                    callId: callId
                };

            } else {
                console.error(`❌ [${callId}] Purchase creation failed:`, result);

                let errorMessage = result?.message ||
                    result?.error ||
                    'Failed to create purchase';

                if (result?.validationErrors && Array.isArray(result.validationErrors)) {
                    const validationMessages = result.validationErrors
                        .map(err => err.message || err.toString())
                        .join(', ');
                    errorMessage += ` - Validation errors: ${validationMessages}`;
                }

                if (result?.details) {
                    errorMessage += ` - Details: ${result.details}`;
                }

                console.error(`❌ [${callId}] Final error message:`, errorMessage);

                if (addToast) {
                    addToast(`Error creating purchase: ${errorMessage}`, 'error');
                }

                return {
                    success: false,
                    error: errorMessage,
                    message: errorMessage,
                    totals: invoiceDataFromTable?.totals || null,
                    callId: callId,
                    debugInfo: {
                        receivedResult: result,
                        hasValidItems: itemsToSave?.length > 0,
                        companyId: effectiveCompanyId,
                        purchaseNumber: formData.purchaseNumber
                    }
                };
            }

        } catch (error) {
            console.error(`❌ [${callId}] Purchase creation failed in handleSave:`, {
                error: error.message,
                stack: error.stack,
                type: error.constructor.name,
                purchaseNumber: formData?.purchaseNumber,
                companyId: effectiveCompanyId
            });

            const errorMessage = error.message || 'Failed to create purchase';
            setError(errorMessage);

            if (addToast) {
                addToast(`Error creating purchase: ${errorMessage}`, 'error');
            } else {
                alert(`Error creating purchase:\n\n${errorMessage}`);
            }

            return {
                success: false,
                error: errorMessage,
                message: errorMessage,
                totals: invoiceDataFromTable?.totals || null,
                callId: callId,
                debugInfo: {
                    errorType: error.constructor.name,
                    originalError: error.message,
                    hasValidItems: itemsToSave?.length > 0,
                    companyId: effectiveCompanyId,
                    purchaseNumber: formData?.purchaseNumber
                }
            };

        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    }, [formData, effectiveCompanyId, addToast, onSave, navigate, validateForm, isSubmitting]);

    const handleCancel = () => {
        const shouldCancel = window.confirm(
            'Are you sure you want to cancel this purchase?\n\nAny unsaved changes will be lost.'
        );

        if (shouldCancel) {
            try {
                const draftKey = `purchase_draft_${effectiveCompanyId}_${formData.purchaseNumber}`;
                localStorage.removeItem(draftKey);
                console.log('🗑️ Cleared purchase draft on cancel');
            } catch (error) {
                console.warn('Could not clear draft:', error);
            }

            if (onCancel && typeof onCancel === 'function') {
                onCancel();
            } else {
                const purchaseBillsUrl = `/companies/${effectiveCompanyId}/purchase-bills`;
                console.log('🔄 Cancelling - redirecting to:', purchaseBillsUrl);
                navigate(purchaseBillsUrl, {
                    replace: true,
                    state: { cancelled: true }
                });
            }
        }
    };

    // Handle exit/close with navigation
    const handleExit = () => {
        if (onExit && typeof onExit === 'function') {
            onExit();
        } else {
            const purchaseBillsUrl = `/companies/${effectiveCompanyId}/purchase-bills`;
            console.log('🔄 Exiting - redirecting to:', purchaseBillsUrl);
            navigate(purchaseBillsUrl, { replace: true });
        }
    };

    // Handle share
    const handleShare = () => {
        const errors = validateForm();

        if (errors.length > 0) {
            const message = 'Please complete the purchase before sharing:\n\n' + errors.join('\n');
            if (addToast) {
                addToast(message, 'warning');
            } else {
                alert(message);
            }
            return;
        }

        const shareData = {
            companyId: effectiveCompanyId,
            purchaseNumber: formData.purchaseNumber,
            invoiceType: formData.invoiceType,
            supplier: formData.supplier || { name: 'Cash Purchase', phone: formData.mobileNumber },
            customer: formData.customer,
            itemCount: formData.items.filter(item => item.itemName).length,
            hasPayment: parseFloat(formData.paymentReceived || 0) > 0,
            bankTransaction: !!(formData.bankAccountId && parseFloat(formData.paymentReceived || 0) > 0)
        };

        console.log('📤 Sharing purchase:', shareData);

        const message = `Purchase ${formData.purchaseNumber} ready to share!`;
        if (addToast) {
            addToast(message, 'info');
        } else {
            alert(message);
        }
    };

    // Auto-save draft functionality
    useEffect(() => {
        if (formData.purchaseNumber && effectiveCompanyId) {
            const draftKey = `purchase_draft_${effectiveCompanyId}_${formData.purchaseNumber}`;
            const draftData = {
                ...formData,
                companyId: effectiveCompanyId,
                lastSaved: new Date().toISOString()
            };

            try {
                localStorage.setItem(draftKey, JSON.stringify(draftData));
            } catch (error) {
                console.warn('Could not save draft:', error);
            }
        }

        return () => {
            try {
                const keys = Object.keys(localStorage).filter(key => key.startsWith('purchase_draft_'));
                if (keys.length > 10) {
                    keys.slice(0, -10).forEach(key => localStorage.removeItem(key));
                }
            } catch (error) {
                console.warn('Could not cleanup drafts:', error);
            }
        };
    }, [formData, effectiveCompanyId]);

    // Error display component
    const ErrorMessage = ({ error, errors }) => {
        if (!error && (!errors || errors.length === 0)) return null;

        return (
            <div className="alert alert-danger mb-3" role="alert">
                <div className="d-flex align-items-start">
                    <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
                    <div>
                        <strong>Error:</strong>
                        {error && <div>{error}</div>}
                        {errors && errors.length > 0 && (
                            <ul className="mb-0 mt-1">
                                {errors.map((err, index) => (
                                    <li key={index}>{err}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!effectiveCompanyId) {
        return (
            <div className="purchase-form-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Container fluid className="py-3 px-4">
                    <Card className="border-info">
                        <Card.Body className="text-center py-5">
                            <div className="text-info mb-3">
                                <div className="spinner-border" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                            <h5 className="text-info">Loading Company...</h5>
                            <p className="text-muted">
                                Please wait while we load the company information.
                            </p>
                            <div className="mt-3">
                                <small className="text-muted">
                                    Debug Info:<br />
                                    URL CompanyId: {companyId || 'Not found'}<br />
                                    Storage CompanyId: {localCompanyId || 'Not found'}<br />
                                    Current URL: {window.location.pathname}
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Container>
            </div>
        );
    }

    return (
        <div className="purchase-form-wrapper" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Container fluid className="py-3 px-4">
                <ErrorMessage error={error} errors={validationErrors} />

                {/* Purchase Form Header */}
                <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h4 className="mb-1 text-primary">
                                <i className="fas fa-shopping-cart me-2"></i>
                                {purchaseConfiguration.ui.formTitle}
                            </h4>
                            <small className="text-muted">
                                Create purchase transactions with bank integration
                            </small>
                        </div>
                        <div className="text-end">
                            <small className="text-muted d-block">Company</small>
                            <strong className="text-primary">{effectiveCompanyId}</strong>
                        </div>
                    </div>
                </div>

                {/* Compact Header Section */}
                <div className="mb-3">
                    <GSTToggle
                        gstEnabled={formData.gstEnabled}
                        invoiceType={formData.invoiceType}
                        onChange={handleGSTToggleChange}
                        formType="purchase"
                        labels={{
                            gstLabel: 'GST Purchase',
                            nonGstLabel: 'Non-GST Purchase'
                        }}
                    />
                </div>

                {/* Supplier and Purchase Details Row */}
                <Row className="g-3 mb-3">
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <CustomerSection
                                    customer={formData.supplier}
                                    mobileNumber={formData.mobileNumber}
                                    onCustomerChange={(supplier) => {
                                        console.log('🏢 Supplier selected in PurchaseForm:', supplier);
                                        updateFormData('supplier', supplier);
                                        if (supplier) {
                                            updateFormData('supplierName', supplier.name || supplier.businessName || '');
                                            updateFormData('supplierMobile', supplier.mobile || supplier.phoneNumber || '');
                                        }
                                    }}
                                    onMobileChange={(mobile) => {
                                        console.log('📱 Mobile number changed in PurchaseForm:', mobile);
                                        updateFormData('mobileNumber', mobile);
                                        updateFormData('supplierMobile', mobile);
                                    }}
                                    isSupplierMode={true}
                                    formType="purchase"
                                    partyConfig={purchaseConfiguration.party}
                                    uiLabels={purchaseConfiguration.ui}
                                    companyId={effectiveCompanyId}
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={6}>
                        <Card className="h-100 border-0 shadow-sm">
                            <Card.Body className="p-3">
                                <InvoiceDetails
                                    invoiceNumber={formData.purchaseNumber}
                                    invoiceDate={formData.purchaseDate}
                                    invoiceType={formData.invoiceType}
                                    onInvoiceNumberChange={(number) => updateFormData('purchaseNumber', number)}
                                    onInvoiceDateChange={(date) => updateFormData('purchaseDate', date)}
                                    onInvoiceTypeChange={handleInvoiceTypeChange}
                                    isPurchaseMode={true}
                                    formType="purchase"
                                    uiLabels={purchaseConfiguration.ui}
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Items Table With Totals - Enhanced with Bank Transaction Support */}
                <div className="mb-3">
                    <ItemsTableWithTotals
                        items={formData.items}
                        onItemsChange={handleItemsChange}
                        categories={categories}
                        inventoryItems={inventoryItems}
                        companyId={effectiveCompanyId}
                        gstEnabled={formData.gstEnabled}
                        formType="purchase"
                        configuration={purchaseConfiguration}
                        selectedSupplier={formData.supplier}
                        selectedCustomer={formData.customer}
                        bankAccounts={bankAccounts}
                        onSave={handleSave}
                        onShare={handleShare}
                        onCancel={handleCancel}
                        onDataChange={handleDataFromTable}
                        userId={effectiveCompanyId}
                        addToast={addToast}
                        overrides={{
                            showCustomerField: true,
                            showSupplierField: true,
                            defaultPartyType: 'supplier',
                            allowPartySwitch: true,
                            enableDualPartySelection: true,
                            showPartyValidation: true,
                            enablePaymentSection: true,
                            enableBankTransactions: true,
                            showBankAccountSelection: true,
                            requireBankAccountForTransactions: true
                        }}
                        paymentConfig={purchaseConfiguration.payment}
                        initialPaymentData={{
                            amount: formData.paymentReceived,
                            method: formData.paymentMethod,
                            bankAccountId: formData.bankAccountId,
                            reference: formData.paymentReference,
                            chequeNumber: formData.chequeNumber,
                            chequeDate: formData.chequeDate,
                            upiTransactionId: formData.upiTransactionId,
                            bankTransactionId: formData.bankTransactionId
                        }}
                    />
                </div>

                {/* Enhanced loading overlay during submission */}
                {isSubmitting && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
                        <div className="bg-white p-4 rounded shadow">
                            <div className="d-flex align-items-center">
                                <div className="spinner-border text-primary me-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <div>
                                    <h5 className="mb-1">Saving Purchase...</h5>
                                    <small className="text-muted">
                                        Please wait while we save your purchase to the system.
                                        <br />Bank transactions will be created automatically.
                                        <br />You will be redirected to the purchase bills page.
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Purchase-specific styling */}
                <style jsx>{`
                    .purchase-form-wrapper {
                        background-color: #f8f9fa;
                        min-height: 100vh;
                    }
                    
                    .purchase-form-wrapper .text-primary {
                        color: ${purchaseConfiguration.theme.primaryColor} !important;
                    }
                    
                    .purchase-form-wrapper .btn-primary {
                        background-color: ${purchaseConfiguration.theme.primaryColor};
                        border-color: ${purchaseConfiguration.theme.primaryColor};
                    }
                    
                    .purchase-form-wrapper .btn-primary:hover {
                        background-color: ${purchaseConfiguration.theme.primaryColorHover};
                        border-color: ${purchaseConfiguration.theme.primaryColorHover};
                    }
                    
                    .purchase-form-wrapper .border-primary {
                        border-color: ${purchaseConfiguration.theme.primaryColor} !important;
                    }
                    
                    .purchase-form-wrapper .alert-danger {
                        border-color: ${purchaseConfiguration.theme.dangerColor};
                        background-color: rgba(244, 67, 54, 0.1);
                    }
                    
                    .purchase-form-wrapper .card {
                        transition: all 0.3s ease;
                    }
                    
                    .purchase-form-wrapper .card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }
                    
                    .purchase-form-wrapper .spinner-border {
                        color: ${purchaseConfiguration.theme.primaryColor};
                    }
                    
                    /* Purchase form specific icons */
                    .purchase-form-wrapper .fas.fa-shopping-cart {
                        color: ${purchaseConfiguration.theme.primaryColor};
                    }
                    
                    .purchase-form-wrapper .fas.fa-exclamation-triangle {
                        color: ${purchaseConfiguration.theme.dangerColor};
                    }
                `}</style>
            </Container>
        </div>
    );
}

export default PurchaseForm;