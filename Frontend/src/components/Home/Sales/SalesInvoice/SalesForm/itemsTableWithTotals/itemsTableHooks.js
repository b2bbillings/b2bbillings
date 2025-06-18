import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import itemsTableLogic from './itemsTableLogic';
import itemService from '../../../../../../services/itemService';
import bankAccountService from '../../../../../../services/bankAccountService';
import paymentService from '../../../../../../services/paymentService';
import transactionService from '../../../../../../services/transactionService';
import salesService from '../../../../../../services/salesService';
import purchaseService from '../../../../../../services/purchaseService';

// ===== CUSTOM HOOKS =====
// Items management hook with enhanced field compatibility
export const useItemsManagement = (items, onItemsChange, gstEnabled, globalTaxMode) => {
    const [localItems, setLocalItems] = useState([]);
    const [totals, setTotals] = useState({});

    // Initialize items with proper tax mode and priceIncludesTax
    useEffect(() => {
        if (items.length === 0) {
            const emptyItem = itemsTableLogic.createEmptyItem();
            emptyItem.taxMode = globalTaxMode;
            emptyItem.priceIncludesTax = globalTaxMode === 'with-tax';
            setLocalItems([emptyItem]);
        } else {
            const updatedItems = items.map((item, index) => {
                let itemTaxMode = item.taxMode || globalTaxMode;
                let itemPriceIncludesTax;

                if (item.priceIncludesTax !== undefined) {
                    itemPriceIncludesTax = item.priceIncludesTax;
                    itemTaxMode = item.priceIncludesTax ? 'with-tax' : 'without-tax';
                } else {
                    itemPriceIncludesTax = itemTaxMode === 'with-tax';
                }

                const updatedItem = {
                    ...item,
                    taxMode: itemTaxMode,
                    priceIncludesTax: itemPriceIncludesTax
                };

                return updatedItem;
            });
            setLocalItems(updatedItems);
        }
    }, [items, globalTaxMode]);

    const calculateItemTotals = useCallback((item, index, allItems, changedField = null) => {
        return itemsTableLogic.calculateItemTotals(item, index, allItems, changedField, gstEnabled, globalTaxMode);
    }, [gstEnabled, globalTaxMode]);

    const updateTotals = useCallback((newItems) => {
        const calculated = itemsTableLogic.calculateTotals(newItems, gstEnabled);
        setTotals(calculated);
        return calculated;
    }, [gstEnabled]);

    // Enhanced item change handler to sync both fields
    const handleItemChange = (index, field, value) => {
        const newItems = [...localItems];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'taxMode') {
            newItems[index].priceIncludesTax = value === 'with-tax';
        } else if (field === 'priceIncludesTax') {
            newItems[index].taxMode = value ? 'with-tax' : 'without-tax';
        }

        const updatedItem = calculateItemTotals(newItems[index], index, newItems, field);
        newItems[index] = updatedItem;

        setLocalItems(newItems);
        updateTotals(newItems);
        onItemsChange(newItems);
    };

    const addRow = () => {
        const newItem = itemsTableLogic.createEmptyItem();
        newItem.taxMode = globalTaxMode;
        newItem.priceIncludesTax = globalTaxMode === 'with-tax';

        const newItems = [...localItems, newItem];
        setLocalItems(newItems);
        updateTotals(newItems);
        onItemsChange(newItems);
    };

    const deleteRow = (index) => {
        if (localItems.length <= 1) return;

        const newItems = localItems.filter((_, i) => i !== index);
        setLocalItems(newItems);
        updateTotals(newItems);
        onItemsChange(newItems);
    };

    return {
        localItems,
        setLocalItems,
        totals,
        handleItemChange,
        addRow,
        deleteRow,
        updateTotals,
        calculateItemTotals
    };
};

// Hook for managing search functionality
export const useItemSearch = (companyId) => {
    const [itemSearches, setItemSearches] = useState({});
    const [itemSuggestions, setItemSuggestions] = useState({});
    const [showItemSuggestions, setShowItemSuggestions] = useState({});
    const [searchNotFound, setSearchNotFound] = useState({});
    const [searchLoading, setSearchLoading] = useState({});
    const searchTimeouts = useRef({});

    const handleItemSearch = async (rowIndex, query) => {
        setItemSearches(prev => ({ ...prev, [rowIndex]: query }));

        if (searchTimeouts.current[rowIndex]) {
            clearTimeout(searchTimeouts.current[rowIndex]);
        }

        searchTimeouts.current[rowIndex] = setTimeout(() => {
            itemsTableLogic.searchItemsLogic(
                itemService,
                companyId,
                query,
                rowIndex,
                {
                    setItemSuggestions,
                    setShowItemSuggestions,
                    setSearchNotFound,
                    setSearchLoading
                }
            );
        }, 300);
    };

    const handleItemSuggestionSelect = (rowIndex, item, localItems, calculateItemTotals, onItemsChange, setLocalItems, updateTotals) => {
        itemsTableLogic.handleItemSuggestionSelection(
            rowIndex,
            item,
            localItems,
            calculateItemTotals,
            {
                onItemsChange: (newItems) => {
                    setLocalItems(newItems);
                    updateTotals(newItems);
                    onItemsChange(newItems);
                },
                setItemSearches,
                setShowItemSuggestions,
                setSearchNotFound,
                setSearchLoading
            }
        );
    };

    return {
        itemSearches,
        itemSuggestions,
        showItemSuggestions,
        searchNotFound,
        searchLoading,
        handleItemSearch,
        handleItemSuggestionSelect
    };
};

// Hook for managing round-off calculations
export const useRoundOff = (totals, gstEnabled) => {
    const [roundOffEnabled, setRoundOffEnabled] = useState(false);

    const roundOffCalculation = useMemo(() => {
        return itemsTableLogic.calculateFinalTotalWithRoundOff(totals, gstEnabled, roundOffEnabled);
    }, [totals, gstEnabled, roundOffEnabled]);

    const roundOffDisplayInfo = useMemo(() => {
        return itemsTableLogic.getRoundOffDisplayInfo(roundOffCalculation, gstEnabled);
    }, [roundOffCalculation, gstEnabled]);

    const finalTotalWithRoundOff = roundOffCalculation.finalTotal;
    const roundOffValue = roundOffCalculation.roundOffValue;

    return {
        roundOffEnabled,
        setRoundOffEnabled,
        roundOffCalculation,
        roundOffDisplayInfo,
        finalTotalWithRoundOff,
        roundOffValue
    };
};


// FIXED: Hook for managing bank accounts
export const useBankAccounts = (companyId) => {
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);

    const loadBankAccounts = async () => {
        if (!companyId) {
            console.log('⚠️ No companyId provided for bank accounts');
            setBankAccounts([]);
            return;
        }

        try {
            setLoadingBankAccounts(true);
            console.log('🏦 Loading bank accounts for company:', companyId);

            // FIXED: Try different service methods based on your API
            let response;

            try {
                // Try the most common method first
                response = await bankAccountService.getBankAccountsByCompany(companyId);
            } catch (firstError) {
                console.log('First method failed, trying alternative:', firstError.message);

                try {
                    // Try alternative method
                    response = await bankAccountService.getBankAccounts(companyId, {
                        active: true,
                        limit: 100
                    });
                } catch (secondError) {
                    console.log('Second method failed, trying third:', secondError.message);

                    try {
                        // Try another alternative
                        response = await bankAccountService.getAllBankAccounts(companyId);
                    } catch (thirdError) {
                        console.log('Third method failed, trying basic fetch:', thirdError.message);

                        // Last resort - basic fetch
                        response = await bankAccountService.getBankAccounts(companyId);
                    }
                }
            }

            console.log('📥 Bank accounts raw response:', response);

            if (response && (response.success || response.data || Array.isArray(response))) {
                // Handle different response formats
                let accounts = [];

                if (response.success && response.data) {
                    // Standard success response format
                    accounts = response.data.banks ||
                        response.data.bankAccounts ||
                        response.data.accounts ||
                        response.data ||
                        [];
                } else if (Array.isArray(response.data)) {
                    // Direct array in data
                    accounts = response.data;
                } else if (Array.isArray(response)) {
                    // Direct array response
                    accounts = response;
                } else if (response.banks) {
                    // Banks property
                    accounts = response.banks;
                } else if (response.bankAccounts) {
                    // bankAccounts property
                    accounts = response.bankAccounts;
                } else {
                    console.log('⚠️ Unexpected response format:', response);
                    accounts = [];
                }

                console.log('✅ Processed bank accounts:', accounts);

                if (Array.isArray(accounts) && accounts.length > 0) {
                    // Format accounts for consistency
                    const formattedAccounts = accounts.map(account => ({
                        _id: account._id || account.id,
                        id: account._id || account.id,
                        accountName: account.accountName || account.name || account.bankAccountName,
                        name: account.accountName || account.name || account.bankAccountName,
                        bankName: account.bankName || account.bank,
                        accountNumber: account.accountNumber || account.accountNo,
                        ifscCode: account.ifscCode || account.ifsc,
                        branchName: account.branchName || account.branch,
                        type: account.type || account.accountType || 'savings',
                        currentBalance: parseFloat(account.currentBalance) || 0,
                        isActive: account.isActive !== false && account.status !== 'inactive',
                        displayName: `${account.accountName || account.name || 'Unknown'} - ${account.bankName || 'Unknown Bank'} (${account.accountNumber || 'No Account Number'})`
                    }));

                    // Filter out inactive accounts
                    const activeAccounts = formattedAccounts.filter(account => account.isActive);

                    console.log('✅ Formatted active bank accounts loaded:', activeAccounts.length);
                    setBankAccounts(activeAccounts);
                } else {
                    console.log('⚠️ No bank accounts found in response');
                    setBankAccounts([]);
                }
            } else {
                console.log('⚠️ Bank accounts response not successful:', response);
                setBankAccounts([]);
            }
        } catch (error) {
            console.error('❌ Error loading bank accounts:', error);
            console.error('Error details:', {
                message: error.message,
                status: error.status,
                response: error.response?.data
            });
            setBankAccounts([]);

            // Show user-friendly error message
            if (error.message?.includes('401') || error.message?.includes('Authentication')) {
                console.log('🔑 Authentication error - user may need to login again');
            } else if (error.message?.includes('403')) {
                console.log('🚫 Permission error - user may not have access to bank accounts');
            } else if (error.message?.includes('404')) {
                console.log('📭 Bank accounts endpoint not found');
            } else {
                console.log('🌐 Network or server error');
            }
        } finally {
            setLoadingBankAccounts(false);
        }
    };

    // FIXED: Add retry mechanism
    const retryLoadBankAccounts = async () => {
        console.log('🔄 Retrying bank accounts load...');
        await loadBankAccounts();
    };

    useEffect(() => {
        if (companyId) {
            console.log('🏦 useEffect triggered for bank accounts with companyId:', companyId);
            loadBankAccounts();
        } else {
            console.log('⚠️ No companyId available for bank accounts');
            setBankAccounts([]);
        }
    }, [companyId]);

    // FIXED: Debug information
    useEffect(() => {
        console.log('🏦 Bank accounts state updated:', {
            count: bankAccounts.length,
            loading: loadingBankAccounts,
            companyId: companyId,
            accounts: bankAccounts.map(acc => ({
                id: acc._id || acc.id,
                name: acc.accountName || acc.name,
                bank: acc.bankName
            }))
        });
    }, [bankAccounts, loadingBankAccounts, companyId]);

    return {
        bankAccounts,
        setBankAccounts,
        loadingBankAccounts,
        loadBankAccounts,
        retryLoadBankAccounts
    };
};



// Hook for managing party selection and validation
export const usePartySelection = (selectedCustomer, selectedSupplier, formType, addToast) => {

    const getSelectedParty = useCallback(() => {
        const hasValidSupplier = !!(
            selectedSupplier &&
            selectedSupplier !== null &&
            selectedSupplier !== undefined &&
            typeof selectedSupplier === 'object' &&
            Object.keys(selectedSupplier).length > 0 &&
            (selectedSupplier._id || selectedSupplier.id) &&
            (selectedSupplier.name || selectedSupplier.businessName || selectedSupplier.companyName || selectedSupplier.supplierName)
        );

        const hasValidCustomer = !!(
            selectedCustomer &&
            selectedCustomer !== null &&
            selectedCustomer !== undefined &&
            typeof selectedCustomer === 'object' &&
            Object.keys(selectedCustomer).length > 0 &&
            (selectedCustomer._id || selectedCustomer.id) &&
            (selectedCustomer.name || selectedCustomer.businessName || selectedCustomer.companyName || selectedCustomer.customerName)
        );

        if (hasValidSupplier && hasValidCustomer) {
            return {
                type: 'both',
                supplier: selectedSupplier,
                customer: selectedCustomer,
                primary: formType === 'purchase' ? selectedSupplier : selectedCustomer,
                secondary: formType === 'purchase' ? selectedCustomer : selectedSupplier
            };
        }

        if (formType === 'purchase') {
            if (hasValidSupplier) {
                return { type: 'supplier', party: selectedSupplier };
            } else if (hasValidCustomer) {
                return { type: 'customer', party: selectedCustomer };
            }
        } else {
            if (hasValidCustomer) {
                return { type: 'customer', party: selectedCustomer };
            } else if (hasValidSupplier) {
                return { type: 'supplier', party: selectedSupplier };
            }
        }
        return null;
    }, [selectedCustomer, selectedSupplier, formType]);

    const getPartyType = useCallback(() => {
        const result = getSelectedParty();
        if (!result) return null;

        if (result.type === 'both') {
            return formType === 'purchase' ? 'supplier' : 'customer';
        }

        return result.type;
    }, [getSelectedParty, formType]);

    const getPartyName = useCallback(() => {
        const result = getSelectedParty();

        if (!result) return null;

        let party;
        if (result.type === 'both') {
            party = result.primary;
        } else {
            party = result.party;
        }

        const possibleNames = [
            party?.name,
            party?.businessName,
            party?.companyName,
            party?.customerName,
            party?.supplierName,
            party?.displayName,
            party?.fullName,
            party?.partyName
        ];

        const foundName = possibleNames.find(name => name && typeof name === 'string' && name.trim());

        return foundName || null;
    }, [getSelectedParty]);

    const getPartyId = useCallback(() => {
        const result = getSelectedParty();

        if (!result) return null;

        let party;
        if (result.type === 'both') {
            party = result.primary;
        } else {
            party = result.party;
        }

        const possibleIds = [
            party?._id,
            party?.id,
            party?.partyId,
            party?.supplierId,
            party?.customerId
        ];

        const foundId = possibleIds.find(id => id && (typeof id === 'string' || typeof id === 'number'));

        return foundId || null;
    }, [getSelectedParty]);

    const getSecondaryParty = useCallback(() => {
        const result = getSelectedParty();

        if (!result || result.type !== 'both') return null;

        return result.secondary;
    }, [getSelectedParty]);

    const getSecondaryPartyName = useCallback(() => {
        const secondary = getSecondaryParty();
        if (!secondary) return null;

        const possibleNames = [
            secondary?.name,
            secondary?.businessName,
            secondary?.companyName,
            secondary?.customerName,
            secondary?.supplierName,
            secondary?.displayName,
            secondary?.fullName,
            secondary?.partyName
        ];

        return possibleNames.find(name => name && typeof name === 'string' && name.trim()) || null;
    }, [getSecondaryParty]);

    const getSecondaryPartyType = useCallback(() => {
        const result = getSelectedParty();

        if (!result || result.type !== 'both') return null;

        return formType === 'purchase' ? 'customer' : 'supplier';
    }, [getSelectedParty, formType]);

    const validatePaymentRequirements = useCallback((hasValidItems, finalTotalWithRoundOff) => {
        if (!hasValidItems || finalTotalWithRoundOff <= 0) {
            const message = `Please add items with valid costs to the ${formType} before processing payment.`;
            addToast?.(message, 'warning');
            return { valid: false, message };
        }

        const result = getSelectedParty();
        const partyType = getPartyType();
        const partyName = getPartyName();
        const partyId = getPartyId();

        if (!result) {
            let message = `Please select a ${formType === 'purchase' ? 'supplier or customer' : 'customer or supplier'} before processing payment.`;

            if (selectedSupplier === null && selectedCustomer === null) {
                message += '\n\nTip: Use the party selection dropdown above to choose a party.';
            } else if (selectedSupplier && typeof selectedSupplier === 'object' && Object.keys(selectedSupplier).length === 0) {
                message += '\n\nIssue: Selected supplier appears to be empty. Please reselect.';
            } else if (selectedCustomer && typeof selectedCustomer === 'object' && Object.keys(selectedCustomer).length === 0) {
                message += '\n\nIssue: Selected customer appears to be empty. Please reselect.';
            }

            addToast?.(message, 'warning');
            return { valid: false, message };
        }

        if (!partyId) {
            const message = `Selected ${partyType} is missing required ID. Please reselect the party.`;
            addToast?.(message, 'error');
            return { valid: false, message };
        }

        if (!partyName) {
            const message = `Selected ${partyType} is missing name information. Please reselect the party.`;
            addToast?.(message, 'error');
            return { valid: false, message };
        }

        return {
            valid: true,
            result: result,
            partyType,
            partyName,
            partyId,
            ...(result.type === 'both' && {
                secondaryParty: getSecondaryParty(),
                secondaryPartyType: getSecondaryPartyType(),
                secondaryPartyName: getSecondaryPartyName()
            })
        };
    }, [getSelectedParty, getPartyType, getPartyName, getPartyId, getSecondaryParty, getSecondaryPartyType, getSecondaryPartyName, formType, selectedCustomer, selectedSupplier, addToast]);

    return {
        getSelectedParty,
        getPartyType,
        getPartyName,
        getPartyId,
        getSecondaryParty,
        getSecondaryPartyName,
        getSecondaryPartyType,
        validatePaymentRequirements
    };
};

// Hook for invoice save operations with tax mode support
export const useInvoiceSave = (
    localItems,
    totals,
    finalTotalWithRoundOff,
    roundOffEnabled,
    roundOffValue,
    roundOffCalculation,
    paymentData,
    gstEnabled,
    formType,
    companyId,
    invoiceNumber,
    invoiceDate,
    selectedCustomer,
    selectedSupplier,
    onSave,
    addToast,
    getSelectedParty,
    getPartyType,
    getPartyId,
    getPartyName,
    getSecondaryParty,
    getSecondaryPartyType,
    getSecondaryPartyName,
    createTransactionWithInvoice,
    resetPaymentData,
    globalTaxMode,
    bankAccounts
) => {

    const handleSaveWithTransaction = useCallback(async () => {
        try {
            if (!onSave || typeof onSave !== 'function') {
                const message = 'Save function is not available. Please refresh the page and try again.';
                addToast?.(message, 'error');
                return { success: false, message };
            }

            const hasValidItems = totals.finalTotal > 0 || totals.subtotal > 0;

            if (!hasValidItems) {
                const message = 'Please add items before saving the invoice.';
                addToast?.(message, 'warning');
                return { success: false, message };
            }

            if (!totals || typeof totals !== 'object') {
                const message = 'Invoice totals calculation error. Please refresh and try again.';
                addToast?.(message, 'error');
                return { success: false, message };
            }

            if (!finalTotalWithRoundOff || finalTotalWithRoundOff <= 0) {
                const message = 'Invoice total is invalid. Please check item amounts.';
                addToast?.(message, 'error');
                return { success: false, message };
            }

            const result = getSelectedParty();
            if (!result) {
                const message = `Please select a ${formType === 'purchase' ? 'supplier or customer' : 'customer or supplier'} before saving the invoice.`;
                addToast?.(message, 'warning');
                return { success: false, message };
            }

            const enhancedTotals = {
                ...totals,
                finalTotal: finalTotalWithRoundOff,
                roundOffValue: roundOffValue || 0,
                roundOffEnabled: roundOffEnabled
            };

            const validItems = localItems.filter(item =>
                item.itemName &&
                (parseFloat(item.quantity) || 0) > 0 &&
                (parseFloat(item.pricePerUnit) || 0) > 0
            ).map(item => ({
                ...item,
                taxMode: item.taxMode || globalTaxMode,
                priceIncludesTax: item.priceIncludesTax ?? (globalTaxMode === 'with-tax')
            }));

            if (validItems.length === 0) {
                const message = 'No valid items found. Please check item details.';
                addToast?.(message, 'warning');
                return { success: false, message };
            }

            // ENHANCED: Payment info processing with bank account details
            const paymentInfoForSave = paymentData.amount > 0 ? {
                amount: paymentData.amount,
                paymentType: paymentData.paymentType,
                method: paymentData.paymentMethod || 'cash',
                paymentMethod: paymentData.paymentMethod || 'cash',

                // ADDED: Bank account information
                bankAccountId: paymentData.bankAccountId,
                bankAccount: paymentData.bankAccount,
                bankAccountName: paymentData.bankAccountName,
                bankName: paymentData.bankName,
                accountNumber: paymentData.accountNumber,

                // Party information
                partyName: getPartyName(),
                partyType: getPartyType(),
                partyId: getPartyId(),

                // Payment details
                notes: paymentData.notes || '',
                dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
                creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,
                paymentDate: new Date().toISOString(),

                // Transaction references
                reference: paymentData.transactionId || paymentData.chequeNumber || '',
                chequeNumber: paymentData.chequeNumber || '',
                chequeDate: paymentData.chequeDate || null,
                transactionId: paymentData.transactionId || '',
                upiTransactionId: paymentData.transactionId || '',
                bankTransactionId: paymentData.transactionId || '',

                // Status and metadata
                status: 'pending',
                isPartialPayment: paymentData.isPartialPayment || false,
                remainingAmount: paymentData.remainingAmount || 0
            } : null;

            const invoiceDataForSave = {
                companyId: companyId,
                items: validItems,
                totals: enhancedTotals,

                globalTaxMode: globalTaxMode,
                taxMode: globalTaxMode,
                gstEnabled: gstEnabled,
                priceIncludesTax: globalTaxMode === 'with-tax',

                selectedSupplier: result.type === 'supplier' ? result.party :
                    result.type === 'both' ? result.supplier :
                        selectedSupplier,
                selectedCustomer: result.type === 'customer' ? result.party :
                    result.type === 'both' ? result.customer :
                        selectedCustomer,

                // UPDATED: Enhanced payment information
                paymentInfo: paymentInfoForSave,
                paymentReceived: paymentData.amount || 0,
                bankAccountId: paymentData.bankAccountId || null,
                paymentMethod: paymentData.paymentMethod || 'cash',
                dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
                creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,

                ...(formType === 'purchase' ? {
                    purchaseNumber: invoiceNumber,
                    purchaseDate: invoiceDate,
                    purchaseType: gstEnabled ? 'gst' : 'non-gst',
                    supplierName: result.type === 'supplier' ? getPartyName() :
                        result.type === 'both' && result.supplier ? (result.supplier.name || result.supplier.businessName) :
                            null,
                    customerName: result.type === 'customer' ? getPartyName() :
                        result.type === 'both' && result.customer ? (result.customer.name || result.customer.businessName) :
                            null,
                    status: 'draft',
                    receivingStatus: 'pending',
                    notes: paymentData.notes || ''
                } : {
                    saleNumber: invoiceNumber,
                    saleDate: invoiceDate,
                    saleType: gstEnabled ? 'gst' : 'non-gst',
                    customerName: result.type === 'customer' ? getPartyName() :
                        result.type === 'both' && result.customer ? (result.customer.name || result.customer.businessName) :
                            null,
                    supplierName: result.type === 'supplier' ? getPartyName() :
                        result.type === 'both' && result.supplier ? (result.supplier.name || result.supplier.businessName) :
                            null
                }),

                formType: formType,
                roundOffValue: roundOffValue || 0,
                roundOffEnabled: roundOffEnabled,
                roundOff: roundOffValue || 0
            };

            console.log('💾 Saving invoice with payment data:', {
                hasPayment: !!paymentInfoForSave,
                paymentAmount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                bankAccountId: paymentData.bankAccountId,
                bankAccountName: paymentData.bankAccountName
            });

            let invoiceResult;
            try {
                invoiceResult = await onSave(invoiceDataForSave);
            } catch (onSaveError) {
                const errorMessage = `Save operation failed: ${onSaveError.message || 'Unknown error'}`;
                addToast?.(errorMessage, 'error');
                return {
                    success: false,
                    error: onSaveError.message || 'Save function error',
                    message: errorMessage
                };
            }

            if (invoiceResult === undefined || invoiceResult === null) {
                const errorMessage = `${formType === 'purchase' ? 'Purchase' : 'Sales'} save function returned no result. Please try again.`;
                addToast?.(errorMessage, 'error');
                return {
                    success: false,
                    error: 'No result from save function',
                    message: errorMessage
                };
            }

            const isSuccessfulResult = (
                (invoiceResult && invoiceResult.success === true) ||
                (invoiceResult && invoiceResult.data && invoiceResult.success !== false) ||
                (invoiceResult &&
                    typeof invoiceResult === 'object' &&
                    invoiceResult !== null &&
                    Object.keys(invoiceResult).length > 0 &&
                    !invoiceResult.error &&
                    !invoiceResult.failed &&
                    invoiceResult.success !== false) ||
                (invoiceResult && (
                    invoiceResult.purchase ||
                    invoiceResult.sale ||
                    invoiceResult.invoice ||
                    invoiceResult._id ||
                    invoiceResult.id
                ))
            );

            if (isSuccessfulResult) {
                const invoiceData = invoiceResult?.data ||
                    invoiceResult?.purchase ||
                    invoiceResult?.sale ||
                    invoiceResult ||
                {
                    invoiceNumber: invoiceNumber,
                    total: finalTotalWithRoundOff,
                    items: validItems,
                    createdAt: new Date().toISOString()
                };

                if (paymentData.amount > 0) {
                    if (createTransactionWithInvoice && typeof createTransactionWithInvoice === 'function') {
                        try {
                            const transactionResult = await createTransactionWithInvoice(invoiceData);

                            if (transactionResult && transactionResult.success) {
                                addToast?.(`${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice and payment created successfully!`, 'success');
                                resetPaymentData();
                                return {
                                    success: true,
                                    data: invoiceData,
                                    totals: enhancedTotals,
                                    paymentRecorded: true,
                                    invoiceCreated: true,
                                    transactionCreated: true,
                                    message: `${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice and payment created successfully`
                                };
                            } else {
                                addToast?.(`${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice created successfully. Payment may need verification.`, 'warning');
                                return {
                                    success: true,
                                    data: invoiceData,
                                    totals: enhancedTotals,
                                    paymentRecorded: false,
                                    invoiceCreated: true,
                                    transactionCreated: false,
                                    message: `${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice created, payment needs verification`
                                };
                            }
                        } catch (transactionError) {
                            addToast?.(`${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice created successfully! Payment recording failed: ${transactionError.message}`, 'warning');
                            return {
                                success: true,
                                data: invoiceData,
                                totals: enhancedTotals,
                                paymentRecorded: false,
                                invoiceCreated: true,
                                transactionCreated: false,
                                transactionError: transactionError.message,
                                message: `${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice created, payment recording failed`
                            };
                        }
                    } else {
                        addToast?.(`${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice created successfully! Payment will need to be recorded separately.`, 'info');
                        return {
                            success: true,
                            data: invoiceData,
                            totals: enhancedTotals,
                            paymentRecorded: false,
                            invoiceCreated: true,
                            transactionCreated: false,
                            message: `${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice created, payment to be recorded separately`
                        };
                    }
                } else {
                    addToast?.(`${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice created successfully!`, 'success');
                    return {
                        success: true,
                        data: invoiceData,
                        totals: enhancedTotals,
                        paymentRecorded: false,
                        invoiceCreated: true,
                        transactionCreated: false,
                        message: `${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice created successfully`
                    };
                }
            } else {
                let errorMessage = invoiceResult?.message ||
                    invoiceResult?.error ||
                    `${formType === 'purchase' ? 'Purchase' : 'Sales'} invoice creation failed`;

                if (invoiceResult?.validationErrors) {
                    const validationMessages = invoiceResult.validationErrors.map(err => err.message || err).join(', ');
                    errorMessage += ` - Validation errors: ${validationMessages}`;
                }

                addToast?.(errorMessage, 'error');

                return {
                    success: false,
                    error: errorMessage,
                    totals: totals,
                    debugInfo: {
                        receivedResult: invoiceResult,
                        hasValidItems: hasValidItems,
                        finalTotal: finalTotalWithRoundOff,
                        itemCount: localItems.length,
                        formType: formType
                    }
                };
            }

        } catch (error) {
            let errorMessage = `Failed to save ${formType === 'purchase' ? 'purchase' : 'sales'} invoice`;

            if (error.message) {
                errorMessage += `: ${error.message}`;
            }

            addToast?.(errorMessage, 'error');

            return {
                success: false,
                error: error.message || 'Unknown error',
                totals: totals,
                debugInfo: {
                    hasValidItems: totals.finalTotal > 0 || totals.subtotal > 0,
                    finalTotal: finalTotalWithRoundOff,
                    itemCount: localItems.length,
                    formType: formType,
                    errorType: error.constructor.name,
                    stack: error.stack
                }
            };
        }
    }, [
        localItems, totals, finalTotalWithRoundOff, roundOffEnabled, roundOffValue, roundOffCalculation,
        paymentData, gstEnabled, formType, companyId, invoiceNumber, invoiceDate,
        selectedCustomer, selectedSupplier, onSave, addToast,
        getSelectedParty, getPartyType, getPartyId, getPartyName,
        getSecondaryParty, getSecondaryPartyType, getSecondaryPartyName,
        createTransactionWithInvoice, resetPaymentData, globalTaxMode, bankAccounts
    ]);

    return {
        handleSaveWithTransaction
    };
};

// ENHANCED: Hook for managing payment with improved bank account handling
export const usePaymentManagement = (formType, companyId, finalTotalWithRoundOff, selectedCustomer, selectedSupplier, invoiceNumber, userId, currentConfig, bankAccounts) => {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({
        partyId: '',
        partyName: '',
        partyType: formType === 'sales' ? 'customer' : 'supplier',
        paymentType: 'Cash',
        amount: 0,
        bankAccountId: '',
        paymentMethod: 'cash',
        notes: '',
        isPartialPayment: false,
        nextPaymentDate: '',
        nextPaymentAmount: 0,
        transactionId: '',
        chequeNumber: '',
        chequeDate: '',
        bankName: '',
        previousPayments: [],
        totalPaid: 0,
        remainingAmount: 0,
        dueDate: '',
        creditDays: 0,
        hasDueDate: false,
        // NEW: Bank account details
        bankAccount: null,
        bankAccountName: '',
        accountNumber: ''
    });
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
    const [submittingPayment, setSubmittingPayment] = useState(false);

    // Load payment history
    const loadPaymentHistory = async (partyId) => {
        if (!partyId) return;

        try {
            setLoadingPaymentHistory(true);

            const response = await paymentService.getPaymentHistory({
                companyId,
                partyId,
                invoiceNumber,
                formType
            });

            if (response && response.success) {
                const history = response.data || [];
                setPaymentHistory(history);

                const totalPaid = history.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                const remainingAmount = Math.max(0, finalTotalWithRoundOff - totalPaid);

                setPaymentData(prev => ({
                    ...prev,
                    previousPayments: history,
                    totalPaid,
                    remainingAmount,
                    isPartialPayment: remainingAmount > 0 && totalPaid > 0,
                    amount: remainingAmount > 0 ? remainingAmount : finalTotalWithRoundOff
                }));
            } else {
                setPaymentHistory([]);
            }
        } catch (error) {
            console.error('Error loading payment history:', error);
            setPaymentHistory([]);
        } finally {
            setLoadingPaymentHistory(false);
        }
    };

    // Auto-select customer/supplier when modal opens
    useEffect(() => {
        if (showPaymentModal) {
            const selectedParty = formType === 'sales' ? selectedCustomer : selectedSupplier;

            if (selectedParty) {
                const partyId = selectedParty._id || selectedParty.id;
                const partyName = selectedParty.name || selectedParty.businessName || selectedParty.companyName || 'Unknown';

                setPaymentData(prev => ({
                    ...prev,
                    partyId: partyId || '',
                    partyName: partyName,
                    partyType: formType === 'sales' ? 'customer' : 'supplier',
                    amount: Math.max(0, finalTotalWithRoundOff),
                    remainingAmount: Math.max(0, finalTotalWithRoundOff),
                    totalPaid: 0,
                    isPartialPayment: false,
                    dueDate: '',
                    creditDays: 0,
                    hasDueDate: false
                }));

                if (partyId && loadPaymentHistory) {
                    loadPaymentHistory(partyId);
                }
            }
        }
    }, [showPaymentModal, selectedCustomer, selectedSupplier, formType, finalTotalWithRoundOff]);

    const handlePaymentAmountChange = (amount) => {
        const numAmount = parseFloat(amount) || 0;
        const remaining = Math.max(0, finalTotalWithRoundOff - numAmount - paymentData.totalPaid);
        const isPartial = numAmount > 0 && remaining > 0;

        setPaymentData(prev => ({
            ...prev,
            amount: numAmount,
            remainingAmount: remaining,
            isPartialPayment: isPartial,
            nextPaymentAmount: isPartial ? remaining : 0
        }));
    };

    const handlePaymentTypeChange = (type) => {
        const paymentMethodMap = {
            'Cash': 'cash',
            'Bank Account': 'bank_transfer',
            'UPI': 'upi',
            'Cheque': 'cheque',
            'Online': 'online_transfer',
            'NEFT': 'neft',
            'RTGS': 'rtgs',
            'Card': 'card'
        };

        setPaymentData(prev => ({
            ...prev,
            paymentType: type,
            paymentMethod: paymentMethodMap[type] || 'cash',
            bankAccountId: ['Cash', 'UPI'].includes(type) ? '' : prev.bankAccountId,
            chequeNumber: type === 'Cheque' ? prev.chequeNumber : '',
            chequeDate: type === 'Cheque' ? prev.chequeDate : '',
            bankName: type === 'Cheque' ? prev.bankName : '',
            transactionId: ['UPI', 'Online', 'NEFT', 'RTGS'].includes(type) ? prev.transactionId : '',
            // Clear bank account details if payment type doesn't require them
            bankAccount: ['Cash', 'UPI'].includes(type) ? null : prev.bankAccount,
            bankAccountName: ['Cash', 'UPI'].includes(type) ? '' : prev.bankAccountName,
            accountNumber: ['Cash', 'UPI'].includes(type) ? '' : prev.accountNumber
        }));
    };

    // ENHANCED: Payment submission handler with proper bank account handling
    const handlePaymentSubmit = async (paymentSubmitData) => {
        try {
            setSubmittingPayment(true);
            console.log('🚀 Starting payment submission with bank accounts:', bankAccounts?.length || 0);
            console.log('💰 Payment data:', paymentData);

            // Validation
            if (!paymentData.amount || paymentData.amount <= 0) {
                throw new Error('Please enter a valid payment amount');
            }

            if (!['Cash', 'UPI'].includes(paymentData.paymentType) && !paymentData.bankAccountId) {
                throw new Error('Please select a bank account for this payment method');
            }

            if (paymentData.amount > finalTotalWithRoundOff) {
                throw new Error('Payment amount cannot exceed invoice total');
            }

            if (!paymentData.partyId) {
                throw new Error('Please select a customer/supplier');
            }

            // Method-specific validation
            if (paymentData.paymentType === 'Cheque') {
                if (!paymentData.chequeNumber?.trim()) {
                    throw new Error('Please enter a valid cheque number');
                }
                if (!paymentData.chequeDate) {
                    throw new Error('Please select the cheque date');
                }
            }

            if (paymentData.hasDueDate) {
                if (paymentData.creditDays > 0 && paymentData.dueDate) {
                    throw new Error('Please specify either credit days OR due date, not both');
                }
                if (paymentData.creditDays <= 0 && !paymentData.dueDate) {
                    throw new Error('Please specify either credit days or due date');
                }
            }

            // ENHANCED: Bank account validation and details
            let selectedBankAccount = null;
            if (paymentData.bankAccountId && bankAccounts && bankAccounts.length > 0) {
                selectedBankAccount = bankAccounts.find(account =>
                    (account._id === paymentData.bankAccountId) ||
                    (account.id === paymentData.bankAccountId)
                );

                if (!selectedBankAccount) {
                    console.error('❌ Selected bank account not found:', paymentData.bankAccountId);
                    console.log('Available bank accounts:', bankAccounts.map(acc => ({ id: acc._id || acc.id, name: acc.accountName || acc.name })));
                    throw new Error('Selected bank account not found. Please refresh and try again.');
                }

                console.log('🏦 Selected bank account:', selectedBankAccount);
            } else if (paymentData.bankAccountId) {
                console.warn('⚠️ Bank account ID provided but no bank accounts available');
                throw new Error('Bank accounts not loaded. Please refresh and try again.');
            }

            // Close modal first
            setShowPaymentModal(false);

            // ENHANCED: Payment data with comprehensive bank account details
            const enhancedPaymentData = {
                ...paymentData,
                dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
                creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,

                // ENHANCED: Complete bank account details
                bankAccount: selectedBankAccount,
                bankAccountId: selectedBankAccount?._id || selectedBankAccount?.id || paymentData.bankAccountId,
                bankAccountName: selectedBankAccount?.accountName || selectedBankAccount?.name || paymentData.bankAccountName,
                bankName: selectedBankAccount?.bankName || paymentData.bankName,
                accountNumber: selectedBankAccount?.accountNumber || paymentData.accountNumber,
                ifscCode: selectedBankAccount?.ifscCode,
                branchName: selectedBankAccount?.branchName || selectedBankAccount?.branch,
                accountType: selectedBankAccount?.type || selectedBankAccount?.accountType,
                currentBalance: selectedBankAccount?.currentBalance || 0,

                // Ensure payment method consistency
                paymentMethod: paymentData.paymentMethod || 'cash',

                // Transaction metadata
                invoiceNumber: invoiceNumber,
                companyId: companyId,
                formType: formType,
                createdAt: new Date().toISOString(),

                // Enhanced transaction references
                transactionReference: paymentData.transactionId || paymentData.chequeNumber || `${formType}-${invoiceNumber}-${Date.now()}`,

                // Payment processing info
                processingStatus: 'completed',
                verificationStatus: paymentData.paymentType === 'Cheque' ? 'pending' : 'verified'
            };

            console.log('✅ Enhanced payment data prepared:', {
                hasBank: !!enhancedPaymentData.bankAccount,
                bankAccountId: enhancedPaymentData.bankAccountId,
                bankAccountName: enhancedPaymentData.bankAccountName,
                paymentMethod: enhancedPaymentData.paymentMethod,
                amount: enhancedPaymentData.amount
            });

            return {
                success: true,
                message: 'Payment details saved successfully',
                paymentData: enhancedPaymentData
            };

        } catch (error) {
            console.error('❌ Payment submission error:', error);
            throw error;
        } finally {
            setSubmittingPayment(false);
        }
    };

    const createTransactionWithInvoice = async (invoiceData) => {
        try {
            if (!paymentData.amount || paymentData.amount <= 0) {
                return { success: true, message: 'No payment to process' };
            }

            console.log('🔄 Creating transaction with invoice data:', invoiceData);
            console.log('💳 Using payment data:', paymentData);

            // ✅ CRITICAL FIX: Handle cash payments properly
            const isCashPayment = paymentData.paymentType === 'Cash' || paymentData.paymentMethod === 'cash';
            const requiresBankAccount = !['Cash', 'UPI'].includes(paymentData.paymentType) &&
                !['cash', 'upi'].includes(paymentData.paymentMethod);

            console.log('💰 Payment analysis:', {
                paymentType: paymentData.paymentType,
                paymentMethod: paymentData.paymentMethod,
                isCashPayment: isCashPayment,
                requiresBankAccount: requiresBankAccount,
                hasBankAccountId: !!paymentData.bankAccountId
            });

            // ✅ VALIDATION: Only require bank account for non-cash payments
            if (requiresBankAccount && !paymentData.bankAccountId) {
                throw new Error(`Please select a bank account for ${paymentData.paymentType} payments`);
            }

            const transactionPayload = {
                // ✅ FIXED: Only include bank account ID for non-cash payments
                ...(requiresBankAccount && paymentData.bankAccountId && {
                    bankAccountId: paymentData.bankAccountId
                }),

                // Core transaction data
                amount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                paymentType: paymentData.paymentType, // ✅ ADDED: Include payment type

                description: `${formType === 'sales' ? 'Payment from' : 'Payment to'} ${paymentData.partyName} for ${formType === 'purchase' ? 'purchase' : 'sales'} invoice ${invoiceData.invoiceNumber || invoiceData.saleNumber || invoiceData.purchaseNumber || invoiceNumber}`,

                notes: paymentData.notes || `Payment for ${formType} invoice ${invoiceData.invoiceNumber || invoiceData.saleNumber || invoiceData.purchaseNumber || invoiceNumber}`,

                // Party information
                partyId: paymentData.partyId,
                partyName: paymentData.partyName,
                partyType: formType === 'sales' ? 'customer' : 'supplier',

                // Reference information
                referenceId: invoiceData._id || invoiceData.id,
                referenceType: formType === 'sales' ? 'sale' : 'purchase',
                referenceNumber: invoiceData.invoiceNumber || invoiceData.saleNumber || invoiceData.purchaseNumber || invoiceNumber,

                // ✅ CONDITIONAL: Payment method specific details
                ...(paymentData.chequeNumber && {
                    chequeNumber: paymentData.chequeNumber,
                    chequeDate: paymentData.chequeDate
                }),

                ...(paymentData.transactionId && {
                    upiTransactionId: paymentData.transactionId,
                    bankTransactionId: paymentData.transactionId,
                    transactionReference: paymentData.transactionId
                }),

                // ✅ FALLBACK: Use cheque number as reference if no transaction ID
                ...(!paymentData.transactionId && paymentData.chequeNumber && {
                    transactionReference: paymentData.chequeNumber
                }),

                // Payment terms
                dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
                creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,

                // ✅ CONDITIONAL: Bank account details (only for non-cash payments)
                ...(requiresBankAccount && paymentData.bankAccountId && {
                    bankAccountName: paymentData.bankAccountName,
                    bankName: paymentData.bankName,
                    accountNumber: paymentData.accountNumber,
                    ifscCode: paymentData.ifscCode,
                    branchName: paymentData.branchName
                }),

                // Transaction metadata
                transactionDate: new Date().toISOString(),
                status: 'completed',
                companyId: companyId,
                createdBy: userId || 'system',
                invoiceNumber: invoiceNumber,
                formType: formType,

                // ✅ ADDED: Cash payment specific fields
                ...(isCashPayment && {
                    cashPayment: true,
                    cashReceived: paymentData.amount,
                    cashTransactionType: formType === 'sales' ? 'cash_in' : 'cash_out'
                })
            };

            console.log('📤 Transaction payload prepared:', {
                ...transactionPayload,
                isCashPayment: isCashPayment,
                hasBankAccount: !!transactionPayload.bankAccountId,
                paymentMethod: transactionPayload.paymentMethod,
                paymentType: transactionPayload.paymentType
            });

            let transactionResponse;

            try {
                if (formType === 'sales') {
                    transactionResponse = await transactionService.createPaymentInTransaction(companyId, transactionPayload);
                } else if (formType === 'purchase') {
                    transactionResponse = await transactionService.createPaymentOutTransaction(companyId, transactionPayload);
                } else {
                    throw new Error(`Unknown form type: ${formType}`);
                }
            } catch (serviceError) {
                console.error('❌ Transaction service error:', serviceError);

                // ✅ ENHANCED: Better error handling for cash payments
                let errorMessage = serviceError.message || 'Transaction service failed';

                if (errorMessage.includes('Bank account ID is required') && isCashPayment) {
                    errorMessage = 'Cash payment processing failed. This may be a system configuration issue.';
                    console.error('🚨 CASH PAYMENT ERROR: Backend is requiring bank account for cash payment');
                    console.error('🚨 Payment Data:', paymentData);
                    console.error('🚨 Transaction Payload:', transactionPayload);
                }

                throw new Error(errorMessage);
            }

            if (transactionResponse && transactionResponse.success) {
                console.log('✅ Transaction created successfully:', transactionResponse);
                resetPaymentData();

                return {
                    success: true,
                    data: transactionResponse.data,
                    message: 'Transaction created successfully',
                    transactionId: transactionResponse.data?._id || transactionResponse.data?.transactionId,
                    bankAccountUsed: requiresBankAccount ? paymentData.bankAccountName : 'Cash',
                    paymentMethod: paymentData.paymentMethod,
                    isCashPayment: isCashPayment
                };
            } else {
                console.error('❌ Transaction service returned failure:', transactionResponse);
                throw new Error(transactionResponse?.message || 'Transaction service returned failure');
            }

        } catch (error) {
            console.error('❌ Transaction creation error:', error);

            let errorMessage = `Failed to create ${formType} transaction`;

            // ✅ ENHANCED: Specific error messages
            if (error.message?.includes('401') || error.message?.includes('Authentication')) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.message?.includes('403') || error.message?.includes('Access denied')) {
                errorMessage = 'Access denied. Please check your permissions.';
            } else if (error.message?.includes('400') || error.message?.includes('validation')) {
                errorMessage = 'Invalid transaction data. Please check payment details.';
            } else if (error.message?.includes('404')) {
                errorMessage = 'Transaction service not found. Please contact support.';
            } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message?.includes('bank account') && paymentData.paymentType !== 'Cash') {
                errorMessage = 'Bank account error. Please check selected bank account.';
            } else if (error.message?.includes('Bank account ID is required') && paymentData.paymentType === 'Cash') {
                // ✅ SPECIAL CASE: Cash payment but backend requires bank account
                errorMessage = 'Cash payment processing is not properly configured. Please contact system administrator.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            throw new Error(errorMessage);
        }
    };

    const resetPaymentData = () => {
        setPaymentData({
            partyId: '',
            partyName: '',
            partyType: formType === 'sales' ? 'customer' : 'supplier',
            paymentType: 'Cash',
            amount: 0,
            bankAccountId: '',
            paymentMethod: 'cash',
            notes: '',
            isPartialPayment: false,
            nextPaymentDate: '',
            nextPaymentAmount: 0,
            transactionId: '',
            chequeNumber: '',
            chequeDate: '',
            bankName: '',
            previousPayments: [],
            totalPaid: 0,
            remainingAmount: 0,
            dueDate: '',
            creditDays: 0,
            hasDueDate: false,
            bankAccount: null,
            bankAccountName: '',
            accountNumber: ''
        });
        setPaymentHistory([]);
    };

    const handleDueDateToggle = (enabled) => {
        setPaymentData(prev => ({
            ...prev,
            hasDueDate: enabled,
            dueDate: enabled ? prev.dueDate : '',
            creditDays: enabled ? prev.creditDays : 0
        }));
    };

    const handleCreditDaysChange = (days) => {
        const numDays = parseInt(days) || 0;
        let calculatedDueDate = '';

        if (numDays > 0) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + numDays);
            calculatedDueDate = dueDate.toISOString().split('T')[0];
        }

        setPaymentData(prev => ({
            ...prev,
            creditDays: numDays,
            dueDate: calculatedDueDate
        }));
    };

    const handleDueDateChange = (date) => {
        let calculatedCreditDays = 0;

        if (date) {
            const today = new Date();
            const dueDate = new Date(date);
            const timeDiff = dueDate.getTime() - today.getTime();
            calculatedCreditDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }

        setPaymentData(prev => ({
            ...prev,
            dueDate: date,
            creditDays: Math.max(0, calculatedCreditDays)
        }));
    };

    // NEW: Handle bank account selection
    const handleBankAccountChange = (bankAccountId) => {
        if (!bankAccountId) {
            setPaymentData(prev => ({
                ...prev,
                bankAccountId: '',
                bankAccount: null,
                bankAccountName: '',
                bankName: '',
                accountNumber: '',
                ifscCode: '',
                branchName: ''
            }));
            return;
        }

        const selectedAccount = bankAccounts?.find(account =>
            (account._id === bankAccountId) || (account.id === bankAccountId)
        );

        if (selectedAccount) {
            setPaymentData(prev => ({
                ...prev,
                bankAccountId: bankAccountId,
                bankAccount: selectedAccount,
                bankAccountName: selectedAccount.accountName || selectedAccount.name,
                bankName: selectedAccount.bankName,
                accountNumber: selectedAccount.accountNumber,
                ifscCode: selectedAccount.ifscCode,
                branchName: selectedAccount.branchName || selectedAccount.branch
            }));

            console.log('🏦 Bank account selected:', {
                id: bankAccountId,
                name: selectedAccount.accountName || selectedAccount.name,
                bank: selectedAccount.bankName
            });
        } else {
            console.warn('⚠️ Selected bank account not found in available accounts');
        }
    };

    return {
        showPaymentModal,
        setShowPaymentModal,
        paymentData,
        setPaymentData,
        paymentHistory,
        loadingPaymentHistory,
        submittingPayment,
        handlePaymentAmountChange,
        handlePaymentTypeChange,
        handlePaymentSubmit,
        createTransactionWithInvoice,
        resetPaymentData,
        handleDueDateToggle,
        handleCreditDaysChange,
        handleDueDateChange,
        handleBankAccountChange
    };
};

export const useTaxMode = (localItems, calculateItemTotals, onItemsChange, setLocalItems, updateTotals) => {
    const [globalTaxMode, setGlobalTaxMode] = useState('without-tax');

    useEffect(() => {
        if (localItems && localItems.length > 0) {
            const hasInconsistentModes = localItems.some(item =>
                item.itemName && item.taxMode && item.taxMode !== globalTaxMode
            );

            if (hasInconsistentModes) {
                const updatedItems = localItems.map((item, index) => {
                    if (item.itemName && item.taxMode !== globalTaxMode) {
                        return {
                            ...item,
                            taxMode: globalTaxMode,
                            priceIncludesTax: globalTaxMode === 'with-tax'
                        };
                    }
                    return item;
                });

                if (JSON.stringify(updatedItems) !== JSON.stringify(localItems)) {
                    setLocalItems && setLocalItems(updatedItems);
                    onItemsChange && onItemsChange(updatedItems);
                }
            }
        }
    }, [globalTaxMode, localItems, setLocalItems, onItemsChange]);

    const initializeItemTaxMode = useCallback((item) => {
        return {
            ...item,
            taxMode: item.taxMode || globalTaxMode,
            priceIncludesTax: item.priceIncludesTax ?? (globalTaxMode === 'with-tax')
        };
    }, [globalTaxMode]);

    const handleGlobalTaxModeChange = useCallback((mode) => {
        setGlobalTaxMode(mode);

        if (!localItems || localItems.length === 0) {
            return mode;
        }

        const updatedItems = localItems.map((item, index) => {
            const updatedItem = {
                ...item,
                taxMode: mode,
                priceIncludesTax: mode === 'with-tax'
            };

            if (calculateItemTotals && updatedItem.itemName && updatedItem.pricePerUnit > 0) {
                const recalculatedItem = calculateItemTotals(updatedItem, index, localItems, 'taxMode');
                return recalculatedItem;
            }

            return updatedItem;
        });

        if (setLocalItems) setLocalItems(updatedItems);
        if (updateTotals) updateTotals(updatedItems);
        if (onItemsChange) onItemsChange(updatedItems);

        return mode;
    }, [localItems, calculateItemTotals, setLocalItems, updateTotals, onItemsChange, globalTaxMode]);

    return {
        globalTaxMode,
        setGlobalTaxMode,
        handleGlobalTaxModeChange,
        initializeItemTaxMode
    };
};

// Hook for managing overdue sales and due date tracking
export const useOverdueManagement = (companyId) => {
    const [overdueSales, setOverdueSales] = useState([]);
    const [salesDueToday, setSalesDueToday] = useState([]);
    const [overdueLoading, setOverdueLoading] = useState(false);
    const [dueTodayLoading, setDueTodayLoading] = useState(false);

    const loadOverdueSales = async () => {
        if (!companyId) return;

        try {
            setOverdueLoading(true);
            const response = await salesService.getOverdueSales(companyId);

            if (response && response.success) {
                setOverdueSales(response.data || []);
            } else {
                setOverdueSales([]);
            }
        } catch (error) {
            console.error('Error loading overdue sales:', error);
            setOverdueSales([]);
        } finally {
            setOverdueLoading(false);
        }
    };

    const loadSalesDueToday = async () => {
        if (!companyId) return;

        try {
            setDueTodayLoading(true);
            const response = await salesService.getSalesDueToday(companyId);

            if (response && response.success) {
                setSalesDueToday(response.data || []);
            } else {
                setSalesDueToday([]);
            }
        } catch (error) {
            console.error('Error loading sales due today:', error);
            setSalesDueToday([]);
        } finally {
            setDueTodayLoading(false);
        }
    };

    const updateSaleDueDate = async (saleId, dueDate, creditDays) => {
        try {
            const response = await salesService.updatePaymentDueDate(saleId, dueDate, creditDays);

            if (response && response.success) {
                await Promise.all([loadOverdueSales(), loadSalesDueToday()]);
                return { success: true, message: 'Due date updated successfully' };
            } else {
                throw new Error(response?.message || 'Failed to update due date');
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const getOverdueSummary = () => {
        const totalOverdue = overdueSales.reduce((sum, sale) =>
            sum + (sale.payment?.pendingAmount || 0), 0
        );

        const totalDueToday = salesDueToday.reduce((sum, sale) =>
            sum + (sale.payment?.pendingAmount || 0), 0
        );

        return {
            overdueCount: overdueSales.length,
            dueTodayCount: salesDueToday.length,
            totalOverdueAmount: totalOverdue,
            totalDueTodayAmount: totalDueToday,
            totalPendingAmount: totalOverdue + totalDueToday
        };
    };

    useEffect(() => {
        if (companyId) {
            loadOverdueSales();
            loadSalesDueToday();
        }
    }, [companyId]);

    return {
        overdueSales,
        salesDueToday,
        overdueLoading,
        dueTodayLoading,
        loadOverdueSales,
        loadSalesDueToday,
        updateSaleDueDate,
        getOverdueSummary
    };
};

// Hook for payment scheduling and reminders
export const usePaymentScheduling = (companyId) => {
    const [paymentSchedule, setPaymentSchedule] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    const getPaymentSchedule = async (dateRange = 30) => {
        if (!companyId) return;

        try {
            setScheduleLoading(true);

            const endDate = new Date();
            endDate.setDate(endDate.getDate() + dateRange);

            const response = await salesService.getPaymentSummaryWithOverdue(
                companyId,
                new Date().toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            if (response && response.success) {
                setPaymentSchedule(response.data || []);
            } else {
                setPaymentSchedule([]);
            }
        } catch (error) {
            setPaymentSchedule([]);
        } finally {
            setScheduleLoading(false);
        }
    };

    const getUpcomingPayments = (days = 7) => {
        const today = new Date();
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);

        return paymentSchedule.filter(sale => {
            if (!sale.payment?.dueDate) return false;
            const dueDate = new Date(sale.payment.dueDate);
            return dueDate >= today && dueDate <= targetDate;
        });
    };

    const formatPaymentSchedule = () => {
        const grouped = paymentSchedule.reduce((acc, sale) => {
            const dueDate = sale.payment?.dueDate;
            if (!dueDate) return acc;

            const dateKey = new Date(dueDate).toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(sale);
            return acc;
        }, {});

        return Object.entries(grouped)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([date, sales]) => ({
                date,
                sales,
                totalAmount: sales.reduce((sum, sale) =>
                    sum + (sale.payment?.pendingAmount || 0), 0
                ),
                count: sales.length
            }));
    };

    useEffect(() => {
        if (companyId) {
            getPaymentSchedule();
        }
    }, [companyId]);

    return {
        paymentSchedule,
        scheduleLoading,
        getPaymentSchedule,
        getUpcomingPayments,
        formatPaymentSchedule
    };
};