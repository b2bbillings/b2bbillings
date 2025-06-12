import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import itemsTableLogic from './itemsTableLogic';
import itemService from '../../../../../../services/itemService';
import bankAccountService from '../../../../../../services/bankAccountService';
import paymentService from '../../../../../../services/paymentService';
import transactionService from '../../../../../../services/transactionService';
import salesService from '../../../../../../services/salesService';
import purchaseService from '../../../../../../services/purchaseService';

// ===== CUSTOM HOOKS =====
// UPDATED: Items management hook with enhanced field compatibility
export const useItemsManagement = (items, onItemsChange, gstEnabled, globalTaxMode) => {
    const [localItems, setLocalItems] = useState([]);
    const [totals, setTotals] = useState({});

    // Initialize items with proper tax mode and priceIncludesTax
    useEffect(() => {
        console.log('🔄 Initializing items with tax mode:', {
            itemsLength: items.length,
            globalTaxMode,
            gstEnabled
        });

        if (items.length === 0) {
            const emptyItem = itemsTableLogic.createEmptyItem();
            // Set both fields for compatibility
            emptyItem.taxMode = globalTaxMode;
            emptyItem.priceIncludesTax = globalTaxMode === 'with-tax';
            console.log('📝 Created empty item:', emptyItem);
            setLocalItems([emptyItem]);
        } else {
            // Update existing items with current tax mode if not set
            const updatedItems = items.map((item, index) => {
                // FIXED: Handle both taxMode and priceIncludesTax for compatibility
                let itemTaxMode = item.taxMode || globalTaxMode;
                let itemPriceIncludesTax;

                // If priceIncludesTax is explicitly set (from backend), use it
                if (item.priceIncludesTax !== undefined) {
                    itemPriceIncludesTax = item.priceIncludesTax;
                    // Sync taxMode with priceIncludesTax
                    itemTaxMode = item.priceIncludesTax ? 'with-tax' : 'without-tax';
                } else {
                    // Use taxMode to set priceIncludesTax
                    itemPriceIncludesTax = itemTaxMode === 'with-tax';
                }

                const updatedItem = {
                    ...item,
                    taxMode: itemTaxMode,
                    priceIncludesTax: itemPriceIncludesTax
                };

                console.log(`📝 Updated item ${index + 1}:`, {
                    name: updatedItem.itemName,
                    taxMode: updatedItem.taxMode,
                    priceIncludesTax: updatedItem.priceIncludesTax,
                    pricePerUnit: updatedItem.pricePerUnit,
                    originalPriceIncludesTax: item.priceIncludesTax,
                    derivedFrom: item.priceIncludesTax !== undefined ? 'backend' : 'taxMode'
                });

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

    // FIXED: Enhanced item change handler to sync both fields
    const handleItemChange = (index, field, value) => {
        console.log(`🔄 Hook: Item ${index + 1} field '${field}' changing to:`, value);

        const newItems = [...localItems];
        newItems[index] = { ...newItems[index], [field]: value };

        // FIXED: Update both taxMode and priceIncludesTax when either changes
        if (field === 'taxMode') {
            newItems[index].priceIncludesTax = value === 'with-tax';
            console.log(`🏷️ Hook: Item ${index + 1} tax mode changed:`, {
                taxMode: value,
                priceIncludesTax: value === 'with-tax'
            });
        } else if (field === 'priceIncludesTax') {
            newItems[index].taxMode = value ? 'with-tax' : 'without-tax';
            console.log(`🏷️ Hook: Item ${index + 1} priceIncludesTax changed:`, {
                priceIncludesTax: value,
                taxMode: value ? 'with-tax' : 'without-tax'
            });
        }

        // FIXED: Recalculate with proper tax mode
        const updatedItem = calculateItemTotals(newItems[index], index, newItems, field);
        newItems[index] = updatedItem;

        console.log(`✅ Hook: Item ${index + 1} updated:`, {
            field,
            value,
            finalAmount: updatedItem.amount,
            taxMode: updatedItem.taxMode,
            priceIncludesTax: updatedItem.priceIncludesTax
        });

        setLocalItems(newItems);
        updateTotals(newItems);
        onItemsChange(newItems);
    };

    const addRow = () => {
        const newItem = itemsTableLogic.createEmptyItem();
        // Set both fields for compatibility
        newItem.taxMode = globalTaxMode;
        newItem.priceIncludesTax = globalTaxMode === 'with-tax';

        console.log('➕ Hook: Adding new row with tax mode:', {
            taxMode: newItem.taxMode,
            priceIncludesTax: newItem.priceIncludesTax
        });

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

// Hook for managing bank accounts
export const useBankAccounts = (companyId) => {
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);

    const loadBankAccounts = async () => {
        try {
            setLoadingBankAccounts(true);

            const response = await bankAccountService.getBankAccountsByCompany(companyId, {
                active: 'true',
                limit: 100
            });

            if (response && response.success) {
                setBankAccounts(response.data || []);
            } else {
                setBankAccounts([]);
            }
        } catch (error) {
            setBankAccounts([]);
        } finally {
            setLoadingBankAccounts(false);
        }
    };

    useEffect(() => {
        if (companyId) {
            loadBankAccounts();
        }
    }, [companyId]);

    return {
        bankAccounts,
        setBankAccounts,
        loadingBankAccounts,
        loadBankAccounts
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

        // Handle both parties being selected
        if (hasValidSupplier && hasValidCustomer) {
            return {
                type: 'both',
                supplier: selectedSupplier,
                customer: selectedCustomer,
                primary: formType === 'purchase' ? selectedSupplier : selectedCustomer,
                secondary: formType === 'purchase' ? selectedCustomer : selectedSupplier
            };
        }

        // Prefer based on form type
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

// UPDATED: Hook for invoice save operations with tax mode support
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
    globalTaxMode // Added parameter for global tax mode
) => {

    const handleSaveWithTransaction = useCallback(async () => {
        try {
            // Validate onSave function exists
            if (!onSave || typeof onSave !== 'function') {
                const message = 'Save function is not available. Please refresh the page and try again.';
                addToast?.(message, 'error');
                return { success: false, message };
            }

            const hasValidItems = totals.finalTotal > 0 || totals.subtotal > 0;

            // Validate items
            if (!hasValidItems) {
                const message = 'Please add items before saving the invoice.';
                addToast?.(message, 'warning');
                return { success: false, message };
            }

            // Validate totals data
            if (!totals || typeof totals !== 'object') {
                const message = 'Invoice totals calculation error. Please refresh and try again.';
                addToast?.(message, 'error');
                return { success: false, message };
            }

            // Validate final total
            if (!finalTotalWithRoundOff || finalTotalWithRoundOff <= 0) {
                const message = 'Invoice total is invalid. Please check item amounts.';
                addToast?.(message, 'error');
                return { success: false, message };
            }

            // Validate party selection
            const result = getSelectedParty();
            if (!result) {
                const message = `Please select a ${formType === 'purchase' ? 'supplier or customer' : 'customer or supplier'} before saving the invoice.`;
                addToast?.(message, 'warning');
                return { success: false, message };
            }

            // Prepare enhanced totals
            const enhancedTotals = {
                ...totals,
                finalTotal: finalTotalWithRoundOff,
                roundOffValue: roundOffValue || 0,
                roundOffEnabled: roundOffEnabled
            };

            // Filter valid items and ensure tax mode consistency
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

            console.log('🏷️ Items Tax Mode Validation:', {
                globalTaxMode,
                itemsWithTaxMode: validItems.map(item => ({
                    name: item.itemName,
                    taxMode: item.taxMode,
                    priceIncludesTax: item.priceIncludesTax
                }))
            });

            // UPDATED: Prepare data for save with enhanced payment information
            const invoiceDataForSave = {
                companyId: companyId,
                items: validItems,
                totals: enhancedTotals,

                // FIXED: Enhanced tax mode information
                globalTaxMode: globalTaxMode,
                taxMode: globalTaxMode, // Backward compatibility
                gstEnabled: gstEnabled,
                priceIncludesTax: globalTaxMode === 'with-tax',

                // Party information
                selectedSupplier: result.type === 'supplier' ? result.party :
                    result.type === 'both' ? result.supplier :
                        selectedSupplier,
                selectedCustomer: result.type === 'customer' ? result.party :
                    result.type === 'both' ? result.customer :
                        selectedCustomer,

                // UPDATED: Enhanced payment information
                paymentReceived: paymentData.amount || 0,
                bankAccountId: paymentData.bankAccountId || null,
                paymentMethod: paymentData.paymentMethod || 'cash',
                dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
                creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,

                // UPDATED: Enhanced paymentInfo object with all payment details
                paymentInfo: paymentData.amount > 0 ? {
                    amount: paymentData.amount,
                    paymentType: paymentData.paymentType,
                    method: paymentData.paymentMethod || 'cash',
                    paymentMethod: paymentData.paymentMethod || 'cash', // Ensure both fields
                    bankAccountId: paymentData.bankAccountId,
                    partyName: getPartyName(),
                    partyType: getPartyType(),
                    notes: paymentData.notes || '',
                    dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
                    creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,
                    paymentDate: new Date().toISOString(),
                    reference: paymentData.transactionId || paymentData.chequeNumber || '',
                    // Transaction details
                    chequeNumber: paymentData.chequeNumber || '',
                    chequeDate: paymentData.chequeDate || null,
                    transactionId: paymentData.transactionId || '',
                    upiTransactionId: paymentData.transactionId || '',
                    bankTransactionId: paymentData.transactionId || ''
                } : null,

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

            console.log('💾 Saving with enhanced payment data:', {
                globalTaxMode,
                priceIncludesTax: globalTaxMode === 'with-tax',
                paymentReceived: invoiceDataForSave.paymentReceived,
                paymentMethod: invoiceDataForSave.paymentMethod,
                bankAccountId: invoiceDataForSave.bankAccountId,
                dueDate: invoiceDataForSave.dueDate,
                creditDays: invoiceDataForSave.creditDays,
                paymentInfo: invoiceDataForSave.paymentInfo,
                itemTaxModes: validItems.map(item => ({
                    name: item.itemName,
                    taxMode: item.taxMode,
                    priceIncludesTax: item.priceIncludesTax
                }))
            });

            // Call onSave with error handling
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

            // Handle undefined or null result from onSave
            if (invoiceResult === undefined || invoiceResult === null) {
                const errorMessage = `${formType === 'purchase' ? 'Purchase' : 'Sales'} save function returned no result. Please try again.`;
                addToast?.(errorMessage, 'error');
                return {
                    success: false,
                    error: 'No result from save function',
                    message: errorMessage
                };
            }

            // Enhanced success validation
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
                // Extract invoice data with fallbacks
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

                // Handle payment processing
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
        createTransactionWithInvoice, resetPaymentData, globalTaxMode // Include globalTaxMode in dependencies
    ]);

    return {
        handleSaveWithTransaction
    };
};

// Hook for managing payment
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
        // Due date fields
        dueDate: '',
        creditDays: 0,
        hasDueDate: false
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
                    // Reset due date fields
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
            transactionId: ['UPI', 'Online', 'NEFT', 'RTGS'].includes(type) ? prev.transactionId : ''
        }));
    };

    const handlePaymentSubmit = async (paymentSubmitData) => {
        try {
            setSubmittingPayment(true);

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

            if (paymentData.paymentType === 'Cheque') {
                if (!paymentData.chequeNumber) {
                    throw new Error('Please enter cheque number');
                }
                if (!paymentData.chequeDate) {
                    throw new Error('Please enter cheque date');
                }
            }

            // Due date validation
            if (paymentData.hasDueDate) {
                if (paymentData.creditDays > 0 && paymentData.dueDate) {
                    throw new Error('Please specify either credit days or due date, not both');
                }
                if (paymentData.creditDays <= 0 && !paymentData.dueDate) {
                    throw new Error('Please specify either credit days or due date');
                }
            }

            setShowPaymentModal(false);

            return {
                success: true,
                message: 'Payment details saved successfully',
                paymentData: {
                    ...paymentData,
                    // Include due date info in return
                    dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
                    creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0
                }
            };

        } catch (error) {
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

            const transactionPayload = {
                bankAccountId: paymentData.bankAccountId,
                amount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                description: `${formType === 'sales' ? 'Payment from' : 'Payment to'} ${paymentData.partyName} for ${formType === 'purchase' ? 'purchase' : 'sales'} invoice ${invoiceData.invoiceNumber || invoiceData.saleNumber || invoiceData.purchaseNumber}`,
                notes: paymentData.notes || `Payment for ${formType} invoice ${invoiceData.invoiceNumber || invoiceData.saleNumber || invoiceData.purchaseNumber}`,

                partyId: paymentData.partyId,
                partyName: paymentData.partyName,
                partyType: formType === 'sales' ? 'customer' : 'supplier',

                referenceId: invoiceData._id || invoiceData.id,
                referenceType: formType === 'sales' ? 'sale' : 'purchase',
                referenceNumber: invoiceData.invoiceNumber || invoiceData.saleNumber || invoiceData.purchaseNumber,

                chequeNumber: paymentData.chequeNumber || null,
                chequeDate: paymentData.chequeDate || null,
                upiTransactionId: paymentData.transactionId || null,
                bankTransactionId: paymentData.transactionId || null,

                // Due date information
                dueDate: paymentData.hasDueDate ? paymentData.dueDate : null,
                creditDays: paymentData.hasDueDate ? paymentData.creditDays : 0,

                transactionDate: new Date().toISOString(),
                status: 'completed'
            };

            let transactionResponse;

            if (formType === 'sales') {
                transactionResponse = await transactionService.createPaymentInTransaction(companyId, transactionPayload);
            } else if (formType === 'purchase') {
                transactionResponse = await transactionService.createPaymentOutTransaction(companyId, transactionPayload);
            } else {
                throw new Error(`Unknown form type: ${formType}`);
            }

            if (transactionResponse && transactionResponse.success) {
                resetPaymentData();

                return {
                    success: true,
                    data: transactionResponse.data,
                    message: 'Transaction created successfully',
                    transactionId: transactionResponse.data?._id || transactionResponse.data?.transactionId
                };
            } else {
                throw new Error(transactionResponse?.message || 'Transaction service returned failure');
            }

        } catch (error) {
            let errorMessage = `Failed to create ${formType} transaction`;

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
            // Reset due date fields
            dueDate: '',
            creditDays: 0,
            hasDueDate: false
        });
        setPaymentHistory([]);
    };

    // Helper functions for due date management
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
        // Due date management functions
        handleDueDateToggle,
        handleCreditDaysChange,
        handleDueDateChange
    };
};

export const useTaxMode = (localItems, calculateItemTotals, onItemsChange, setLocalItems, updateTotals) => {
    // FIXED: Initialize with 'without-tax' and ensure consistent state
    const [globalTaxMode, setGlobalTaxMode] = useState('without-tax');

    console.log('🏷️ Tax mode hook state:', {
        globalTaxMode,
        itemCount: localItems?.length || 0,
        itemTaxModes: localItems?.map(item => ({
            name: item.itemName,
            taxMode: item.taxMode,
            priceIncludesTax: item.priceIncludesTax
        })) || []
    });

    // FIXED: Ensure items are initialized with correct tax mode on mount
    useEffect(() => {
        if (localItems && localItems.length > 0) {
            console.log('🔄 Checking items tax mode consistency:', {
                globalTaxMode,
                itemsWithDifferentModes: localItems.filter(item =>
                    item.itemName && item.taxMode && item.taxMode !== globalTaxMode
                )
            });

            // Check if any items have inconsistent tax modes
            const hasInconsistentModes = localItems.some(item =>
                item.itemName && item.taxMode && item.taxMode !== globalTaxMode
            );

            if (hasInconsistentModes) {
                console.log('⚠️ Found inconsistent tax modes, fixing...');

                const updatedItems = localItems.map((item, index) => {
                    if (item.itemName && item.taxMode !== globalTaxMode) {
                        console.log(`🔧 Fixing item ${index + 1} tax mode:`, {
                            itemName: item.itemName,
                            oldTaxMode: item.taxMode,
                            newTaxMode: globalTaxMode
                        });

                        return {
                            ...item,
                            taxMode: globalTaxMode,
                            priceIncludesTax: globalTaxMode === 'with-tax'
                        };
                    }
                    return item;
                });

                // Only update if there are actual changes
                if (JSON.stringify(updatedItems) !== JSON.stringify(localItems)) {
                    setLocalItems && setLocalItems(updatedItems);
                    onItemsChange && onItemsChange(updatedItems);
                }
            }
        }
    }, [globalTaxMode, localItems, setLocalItems, onItemsChange]);


    // Initialize tax mode for new items
    const initializeItemTaxMode = useCallback((item) => {
        return {
            ...item,
            taxMode: item.taxMode || globalTaxMode,
            priceIncludesTax: item.priceIncludesTax ?? (globalTaxMode === 'with-tax')
        };
    }, [globalTaxMode]);

    const handleGlobalTaxModeChange = useCallback((mode) => {
        console.log('🏷️ Hook: Changing global tax mode FROM:', globalTaxMode, 'TO:', mode);

        setGlobalTaxMode(mode);

        if (!localItems || localItems.length === 0) {
            console.log('⚠️ No items to update, only setting global mode');
            return mode;
        }

        // FIXED: Update all items with the new tax mode and recalculate
        const updatedItems = localItems.map((item, index) => {
            const updatedItem = {
                ...item,
                taxMode: mode,
                priceIncludesTax: mode === 'with-tax'
            };

            console.log(`🔄 Hook: Updating item ${index + 1} tax mode:`, {
                itemName: updatedItem.itemName,
                oldTaxMode: item.taxMode,
                newTaxMode: mode,
                oldPriceIncludesTax: item.priceIncludesTax,
                newPriceIncludesTax: mode === 'with-tax',
                pricePerUnit: updatedItem.pricePerUnit
            });

            // IMPORTANT: Only recalculate if we have the function and item has data
            if (calculateItemTotals && updatedItem.itemName && updatedItem.pricePerUnit > 0) {
                const recalculatedItem = calculateItemTotals(updatedItem, index, localItems, 'taxMode');

                console.log(`✅ Hook: Item ${index + 1} recalculated for tax mode ${mode}:`, {
                    itemName: recalculatedItem.itemName,
                    pricePerUnit: recalculatedItem.pricePerUnit,
                    beforeAmount: item.amount,
                    afterAmount: recalculatedItem.amount,
                    taxableAmount: recalculatedItem.taxableAmount,
                    totalTax: recalculatedItem.cgstAmount + recalculatedItem.sgstAmount,
                    priceIncludesTax: recalculatedItem.priceIncludesTax
                });

                return recalculatedItem;
            }

            return updatedItem;
        });

        console.log('🏷️ Hook: All items updated with new tax mode:', {
            mode,
            itemsCount: updatedItems.length,
            itemsPreview: updatedItems.map(item => ({
                name: item.itemName,
                taxMode: item.taxMode,
                priceIncludesTax: item.priceIncludesTax,
                amount: item.amount,
                taxableAmount: item.taxableAmount
            }))
        });

        // Update state
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
                // Refresh overdue data
                await Promise.all([loadOverdueSales(), loadSalesDueToday()]);
                return { success: true, message: 'Due date updated successfully' };
            } else {
                throw new Error(response?.message || 'Failed to update due date');
            }
        } catch (error) {
            console.error('Error updating due date:', error);
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
            console.error('Error loading payment schedule:', error);
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