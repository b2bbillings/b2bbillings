/**
 * ItemsTable Calculation & Logic Functions
 * Handles all calculations, tax logic, and business rules
 */

import {
    faShoppingCart,
    faTruck,
    faArrowDown,
    faArrowUp
} from '@fortawesome/free-solid-svg-icons';

// Enhanced totals calculation with proper field mapping
export const calculateTotals = (items, gstEnabled = true) => {
    let totalQuantity = 0;
    let totalDiscountAmount = 0;
    let totalCgstAmount = 0;
    let totalSgstAmount = 0;
    let subtotal = 0;
    let totalAmount = 0;
    let totalTaxableAmount = 0;

    items.forEach((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
        const amount = parseFloat(item.amount) || 0;
        const discountAmount = parseFloat(item.discountAmount) || 0;
        const cgstAmount = parseFloat(item.cgstAmount) || 0;
        const sgstAmount = parseFloat(item.sgstAmount) || 0;
        const taxableAmount = parseFloat(item.taxableAmount) || 0;

        if (quantity > 0 && pricePerUnit > 0) {
            totalQuantity += quantity;
            totalDiscountAmount += discountAmount;
            totalCgstAmount += cgstAmount;
            totalSgstAmount += sgstAmount;
            totalAmount += amount;
            totalTaxableAmount += taxableAmount;
        }
    });

    const totalTax = totalCgstAmount + totalSgstAmount;

    // Return totals in both formats for compatibility
    const calculatedTotals = {
        // For ItemsTable display
        totalQuantity: parseFloat(totalQuantity.toFixed(2)),
        totalDiscountAmount: parseFloat(totalDiscountAmount.toFixed(2)),
        totalCgstAmount: parseFloat(totalCgstAmount.toFixed(2)),
        totalSgstAmount: parseFloat(totalSgstAmount.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),

        // For TotalSection compatibility
        subtotal: parseFloat(totalTaxableAmount.toFixed(2)),
        totalCGST: parseFloat(totalCgstAmount.toFixed(2)),
        totalSGST: parseFloat(totalSgstAmount.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        finalTotal: parseFloat(totalAmount.toFixed(2)),

        // For better display logic
        withTaxTotal: gstEnabled ? parseFloat(totalAmount.toFixed(2)) : 0,
        withoutTaxTotal: parseFloat(totalTaxableAmount.toFixed(2)),
        totalTaxableAmount: parseFloat(totalTaxableAmount.toFixed(2))
    };

    return calculatedTotals;
};

// Enhanced calculation function with proper tax mode handling
export const calculateItemTotals = (item, index, allItems, changedField = null, gstEnabled = true, globalTaxMode = 'without-tax') => {
    // Get item-specific tax mode with proper fallback logic
    const itemTaxMode = item.taxMode || globalTaxMode;

    // Determine if price includes tax using both fields for compatibility
    let priceIncludesTax;
    if (item.priceIncludesTax !== undefined) {
        priceIncludesTax = item.priceIncludesTax;
    } else {
        priceIncludesTax = itemTaxMode === 'with-tax';
    }

    // Parse values
    const quantity = parseFloat(item.quantity) || 0;
    const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
    const discountPercent = parseFloat(item.discountPercent) || 0;
    const discountAmount = parseFloat(item.discountAmount) || 0;
    const taxRate = parseFloat(item.taxRate || item.gstRate) || 18;

    // Early return if no quantity or price
    if (quantity <= 0 || pricePerUnit <= 0) {
        return {
            ...item,
            taxMode: itemTaxMode,
            priceIncludesTax: priceIncludesTax,
            amount: 0,
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igst: 0
        };
    }

    // Calculate line total before discount
    const lineTotalBeforeDiscount = quantity * pricePerUnit;

    // Apply discount to the line total
    let totalDiscountAmount = 0;
    if (changedField === 'discountPercent') {
        totalDiscountAmount = (lineTotalBeforeDiscount * discountPercent) / 100;
    } else if (changedField === 'discountAmount') {
        totalDiscountAmount = discountAmount;
    } else if (!changedField || changedField === 'quantity' || changedField === 'pricePerUnit') {
        totalDiscountAmount = (lineTotalBeforeDiscount * discountPercent) / 100;
    } else {
        totalDiscountAmount = discountAmount;
    }

    // Line total after discount
    const lineTotalAfterDiscount = Math.max(0, lineTotalBeforeDiscount - totalDiscountAmount);

    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let finalAmount = 0;

    if (gstEnabled && taxRate > 0) {
        if (priceIncludesTax) {
            // WITH TAX MODE - Extract tax from the discounted amount
            // When price includes tax, the lineTotalAfterDiscount IS the final amount
            const taxMultiplier = 1 + (taxRate / 100);
            taxableAmount = lineTotalAfterDiscount / taxMultiplier;

            const totalTaxAmount = lineTotalAfterDiscount - taxableAmount;
            cgstAmount = totalTaxAmount / 2;
            sgstAmount = totalTaxAmount / 2;
            igstAmount = totalTaxAmount;

            // Final amount is the discounted amount (tax already included)
            finalAmount = lineTotalAfterDiscount;
        } else {
            // WITHOUT TAX MODE - Add tax to the discounted amount  
            // When price excludes tax, the lineTotalAfterDiscount is the taxable amount
            taxableAmount = lineTotalAfterDiscount;

            const totalTaxAmount = (taxableAmount * taxRate) / 100;
            cgstAmount = totalTaxAmount / 2;
            sgstAmount = totalTaxAmount / 2;
            igstAmount = totalTaxAmount;

            // Final amount includes the added tax
            finalAmount = taxableAmount + totalTaxAmount;
        }
    } else {
        // No GST calculation
        taxableAmount = lineTotalAfterDiscount;
        finalAmount = lineTotalAfterDiscount;
        cgstAmount = 0;
        sgstAmount = 0;
        igstAmount = 0;
    }

    // Update the item object with calculated values
    const updatedItem = {
        ...item,
        // Ensure both taxMode and priceIncludesTax are set for compatibility
        taxMode: itemTaxMode,
        priceIncludesTax: priceIncludesTax,

        // Calculated values
        discountPercent: parseFloat(discountPercent.toFixed(2)),
        discountAmount: parseFloat(totalDiscountAmount.toFixed(2)),
        taxableAmount: parseFloat(taxableAmount.toFixed(2)),
        cgstAmount: parseFloat(cgstAmount.toFixed(2)),
        sgstAmount: parseFloat(sgstAmount.toFixed(2)),
        igst: parseFloat(igstAmount.toFixed(2)),
        amount: parseFloat(finalAmount.toFixed(2)),
        totalTaxAmount: parseFloat((cgstAmount + sgstAmount + igstAmount).toFixed(2)),

        // Backend compatibility fields
        itemAmount: parseFloat(finalAmount.toFixed(2)),
        cgst: parseFloat(cgstAmount.toFixed(2)),
        sgst: parseFloat(sgstAmount.toFixed(2)),
        igst: parseFloat(igstAmount.toFixed(2))
    };

    // Update the items array
    allItems[index] = updatedItem;

    return updatedItem;
};

// Round off calculations
export const calculateRoundOff = (baseTotal, roundOffEnabled = false, roundOff = 0) => {
    return roundOffEnabled ? baseTotal + (parseFloat(roundOff) || 0) : baseTotal;
};

// Search and suggestions logic
export const searchItemsLogic = async (itemService, companyId, query, rowIndex, setters) => {
    const { setItemSuggestions, setShowItemSuggestions, setSearchNotFound, setSearchLoading } = setters;

    if (!query.trim() || query.length < 2) {
        setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
        setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
        setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
        return;
    }

    if (!companyId) {
        setSearchNotFound(prev => ({ ...prev, [rowIndex]: query }));
        return;
    }

    setSearchLoading(prev => ({ ...prev, [rowIndex]: true }));

    try {
        const response = await itemService.searchItems(companyId, query, 'product', 8);
        let items = [];

        if (response?.success && response.data) {
            if (response.data.items && Array.isArray(response.data.items)) {
                items = response.data.items;
            } else if (Array.isArray(response.data)) {
                items = response.data;
            }
        }

        if (items.length > 0) {
            setItemSuggestions(prev => ({ ...prev, [rowIndex]: items }));
            setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: true }));
            setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
        } else {
            setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
            setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
            if (query.length >= 2) {
                setSearchNotFound(prev => ({ ...prev, [rowIndex]: query }));
            }
        }
    } catch (error) {
        setItemSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
        setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
        if (query.length >= 2) {
            setSearchNotFound(prev => ({ ...prev, [rowIndex]: query }));
        }
    } finally {
        setSearchLoading(prev => ({ ...prev, [rowIndex]: false }));
    }
};

// Item suggestion selection logic
export const handleItemSuggestionSelection = (rowIndex, item, items, calculateItemTotals, callbacks) => {
    const { onItemsChange, setItemSearches, setShowItemSuggestions, setSearchNotFound, setSearchLoading } = callbacks;

    const newItems = [...items];
    const taxRate = item.gstRate || 18;

    newItems[rowIndex] = {
        ...newItems[rowIndex],
        itemRef: item._id || item.id,
        itemName: item.name,
        hsnCode: item.hsnNumber || '',
        unit: item.unit || 'PCS',
        pricePerUnit: item.salePrice || 0,
        taxRate: taxRate,
        itemCode: item.itemCode || '',
        category: item.category || '',
        currentStock: item.currentStock || 0,
        minStockLevel: item.minStockLevel || item.minStockToMaintain || 0
    };

    calculateItemTotals(newItems[rowIndex], rowIndex, newItems);

    setItemSearches(prev => ({ ...prev, [rowIndex]: item.name }));
    setShowItemSuggestions(prev => ({ ...prev, [rowIndex]: false }));
    setSearchNotFound(prev => ({ ...prev, [rowIndex]: false }));
    setSearchLoading(prev => ({ ...prev, [rowIndex]: false }));

    onItemsChange(newItems);
};

// Global tax mode change logic
export const handleGlobalTaxModeChange = (mode, items, calculateItemTotals, onItemsChange) => {
    const newItems = items.map((item) => ({
        ...item,
        taxMode: mode,
        priceIncludesTax: mode === 'with-tax'
    }));

    newItems.forEach((item, index) => {
        calculateItemTotals(item, index, newItems, 'taxMode');
    });

    onItemsChange(newItems);
    return mode;
};

// Validation logic
export const validateItems = (items, gstEnabled = true) => {
    const validationErrors = [];

    items.forEach((item, index) => {
        if (!item.itemName) {
            validationErrors.push(`Row ${index + 1}: Item name is required`);
        }

        if (gstEnabled && !item.hsnCode && item.itemName) {
            validationErrors.push(`Row ${index + 1}: HSN code is required for GST transactions`);
        }

        if (item.quantity <= 0 && item.itemName) {
            validationErrors.push(`Row ${index + 1}: Quantity must be greater than 0`);
        }

        if (item.pricePerUnit <= 0 && item.itemName) {
            validationErrors.push(`Row ${index + 1}: Price per unit must be greater than 0`);
        }

        if (item.itemRef && item.currentStock !== undefined && item.quantity > item.currentStock) {
            validationErrors.push(`Row ${index + 1}: Quantity (${item.quantity}) exceeds available stock (${item.currentStock})`);
        }
    });

    return {
        isValid: validationErrors.length === 0,
        errors: validationErrors
    };
};

// Form configuration for different form types
export const getFormConfig = () => {
    return {
        sales: {
            formIcon: faShoppingCart,
            formType: 'sales',
            totalLabel: 'Sales Total',
            totalBorderColor: 'border-success',
            totalBgColor: 'bg-success',
            totalTextColor: 'text-success',
            actionButtonColor: 'success',
            saveButtonVariant: 'success',
            saveButtonText: 'Save Sale',
            emptyMessage: 'Add items to calculate sales total',
            paymentIcon: faArrowDown,
            paymentAction: 'Receive Payment',
            paymentDirection: 'in',
            partyLabel: 'Customer',
            modalTitle: 'Receive Payment from Customer',
            modalHeader: 'bg-success',
            buttonVariant: 'success',
            actionText: 'Receive Payment',
            successMessage: (paymentType, partyName) => `Payment received successfully via ${paymentType} from ${partyName}!`
        },
        purchase: {
            formIcon: faTruck,
            formType: 'purchase',
            totalLabel: 'Purchase Total',
            totalBorderColor: 'border-primary',
            totalBgColor: 'bg-primary',
            totalTextColor: 'text-primary',
            actionButtonColor: 'primary',
            saveButtonVariant: 'primary',
            saveButtonText: 'Save Purchase',
            emptyMessage: 'Add items to calculate purchase total',
            paymentIcon: faArrowUp,
            paymentAction: 'Make Payment',
            paymentDirection: 'out',
            partyLabel: 'Supplier',
            modalTitle: 'Make Payment to Supplier',
            modalHeader: 'bg-primary',
            buttonVariant: 'primary',
            actionText: 'Make Payment',
            successMessage: (paymentType, partyName) => `Payment made successfully via ${paymentType} to ${partyName}!`
        }
    };
};

// Calculate grid layout for responsive display
export const calculateGridLayout = (hasValidItems, gstEnabled, totalTax) => {
    const hasPaymentButton = hasValidItems;
    const hasTaxBreakdown = gstEnabled && totalTax > 0;
    const hasTotalSection = true;
    const hasActionButtons = true;

    const sectionCount = [hasPaymentButton, hasTaxBreakdown, hasTotalSection, hasActionButtons].filter(Boolean).length;

    if (sectionCount === 4) {
        return { payment: 3, tax: 3, total: 3, actions: 3 };
    } else if (sectionCount === 3) {
        return { payment: 3, tax: 0, total: 4, actions: 5 };
    } else if (sectionCount === 2) {
        return { payment: 0, tax: 0, total: 6, actions: 6 };
    } else {
        return { payment: 4, tax: 0, total: 4, actions: 4 };
    }
};

// Grid layout calculation logic
export const getGridLayout = (hasValidItems, gstEnabled, totalTax) => {
    return calculateGridLayout(hasValidItems, gstEnabled, totalTax);
};

// Round off calculation logic
export const calculateRoundOffValue = (amount, roundOffEnabled = false) => {
    if (!roundOffEnabled || amount === 0) return { roundedAmount: amount, roundOffValue: 0 };

    const rounded = Math.round(amount);
    const roundOffValue = rounded - amount;

    return {
        roundedAmount: rounded,
        roundOffValue: roundOffValue
    };
};

// Payment validation logic
export const validatePaymentData = (paymentData, finalTotal, bankAccounts) => {
    const errors = [];

    if (!paymentData.partyId) {
        errors.push('Party information is missing. Please refresh the page and try again.');
    }

    if (!paymentData.partyName) {
        errors.push('Party name is missing. Please refresh the page and try again.');
    }

    if (paymentData.paymentAmount <= 0) {
        errors.push('Please enter a valid payment amount greater than 0.');
    }

    if (paymentData.paymentAmount > finalTotal) {
        errors.push(`Payment amount cannot exceed the invoice total of ₹${formatCurrency(finalTotal)}`);
    }

    // Bank account validation for non-cash payments
    if (!['Cash', 'UPI'].includes(paymentData.paymentType) && !paymentData.bankAccountId) {
        errors.push('Please select a bank account for this payment method.');
    }

    // Cheque validation
    if (paymentData.paymentType === 'Cheque') {
        if (!paymentData.chequeNumber || !paymentData.chequeNumber.trim()) {
            errors.push('Please enter a valid cheque number.');
        }
        if (!paymentData.chequeDate) {
            errors.push('Please select the cheque date.');
        }
    }

    // Partial payment validation
    if (paymentData.isPartialPayment && paymentData.remainingAmount > 0 && !paymentData.nextPaymentDate) {
        errors.push('Please specify the next payment date for the remaining amount.');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Payment success message builder
export const buildPaymentSuccessMessage = (config, paymentData, invoiceNumber, bankAccounts) => {
    let successMsg = `${config.successMessage(paymentData.paymentType, paymentData.partyName)}\n\n`;
    successMsg += `Amount: ₹${formatCurrency(paymentData.paymentAmount)}\n`;
    successMsg += `Invoice: ${invoiceNumber || 'N/A'}\n`;

    if (paymentData.bankAccountId) {
        const selectedBank = bankAccounts.find(b => b._id === paymentData.bankAccountId);
        if (selectedBank) {
            successMsg += `Bank: ${selectedBank.bankName} (${selectedBank.accountNumber})\n`;
        }
    }

    if (paymentData.isPartialPayment) {
        successMsg += `Remaining: ₹${formatCurrency(paymentData.remainingAmount)}\n`;
        if (paymentData.nextPaymentDate) {
            successMsg += `Next Payment: ${paymentData.nextPaymentDate}`;
        }
    }

    return successMsg;
};

// Utility functions
export const formatCurrency = (amount) => {
    const value = Number(amount) || 0;
    return value.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const getColumnWidths = (gstEnabled) => {
    if (gstEnabled) {
        return {
            serial: '3%',
            item: '20%',
            hsn: '8%',
            qty: '7%',
            unit: '7%',
            price: '13%',
            discount: '15%',
            tax: '15%',
            amount: '12%',
            action: '3%'
        };
    } else {
        return {
            serial: '4%',
            item: '24%',
            hsn: '10%',
            qty: '8%',
            unit: '8%',
            price: '15%',
            discount: '18%',
            amount: '12%',
            action: '4%'
        };
    }
};

export const unitOptions = ['NONE', 'KG', 'GM', 'LTR', 'ML', 'PCS', 'BOX', 'M', 'CM'];

// Enhanced round-off calculation with complete logic
export const calculateFinalTotalWithRoundOff = (totals, gstEnabled = true, roundOffEnabled = false) => {
    // Get base total based on GST mode
    const baseTotal = gstEnabled
        ? (totals.withTaxTotal || totals.finalTotal || 0)
        : (totals.withoutTaxTotal || totals.finalTotal || 0);

    if (!roundOffEnabled || baseTotal === 0) {
        return {
            baseTotal,
            finalTotal: baseTotal,
            roundOffValue: 0,
            isRounded: false
        };
    }

    const roundedAmount = Math.round(baseTotal);
    const roundOffValue = roundedAmount - baseTotal;

    return {
        baseTotal,
        finalTotal: roundedAmount,
        roundOffValue,
        isRounded: Math.abs(roundOffValue) > 0.001
    };
};

// Get round-off display information
export const getRoundOffDisplayInfo = (roundOffCalculation, gstEnabled = true) => {
    const { baseTotal, finalTotal, roundOffValue, isRounded } = roundOffCalculation;

    return {
        showRoundOffBreakdown: isRounded,
        baseTotalLabel: gstEnabled ? 'Total (Inc. GST)' : 'Subtotal',
        baseTotalAmount: baseTotal,
        roundOffAmount: roundOffValue,
        roundOffLabel: roundOffValue > 0 ? '+' : '',
        roundOffColorClass: roundOffValue > 0 ? 'text-success' : 'text-danger',
        finalTotalAmount: finalTotal,
        alreadyRoundedMessage: !isRounded && 'Already rounded'
    };
};

// Enhanced payment breakdown calculation
export const calculatePaymentBreakdown = (totals, gstEnabled, roundOffEnabled = false) => {
    const roundOffCalculation = calculateFinalTotalWithRoundOff(totals, gstEnabled, roundOffEnabled);

    return {
        baseAmount: totals.subtotal || 0,
        taxAmount: totals.totalTax || 0,
        totalAmount: roundOffCalculation.baseTotal,
        roundOffAmount: roundOffCalculation.roundOffValue,
        finalTotal: roundOffCalculation.finalTotal,
        roundOffCalculation
    };
};

// Default empty item creator
export const createEmptyItem = () => ({
    id: Date.now() + Math.random(),
    itemRef: null,
    itemName: '',
    itemCode: '',
    hsnCode: '',
    quantity: '',
    unit: 'PCS',
    pricePerUnit: '',
    discountPercent: 0,
    discountAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igst: 0,
    taxRate: 18,
    amount: 0,
    category: '',
    currentStock: 0,
    minStockLevel: 0,
    // Include both fields for compatibility
    taxMode: 'without-tax',
    priceIncludesTax: false,
    // Backend compatibility fields
    itemAmount: 0,
    cgst: 0,
    sgst: 0,
    lineNumber: 1,
    taxableAmount: 0
});

// Export all functions as default object
export default {
    calculateTotals,
    calculateItemTotals,
    calculateRoundOff,
    calculatePaymentBreakdown,
    searchItemsLogic,
    handleItemSuggestionSelection,
    handleGlobalTaxModeChange,
    validateItems,
    getFormConfig,
    calculateGridLayout,
    getGridLayout,
    calculateRoundOffValue,
    validatePaymentData,
    buildPaymentSuccessMessage,
    formatCurrency,
    getColumnWidths,
    unitOptions,
    createEmptyItem,
    calculateFinalTotalWithRoundOff,
    getRoundOffDisplayInfo
};