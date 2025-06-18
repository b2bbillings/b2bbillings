import React, { useRef, useEffect } from 'react';
import { Card, Table, Button, Form, Row, Col, Alert, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faTrash,
    faCalculator,
    faPercent,
    faDownload,
    faSave,
    faTimes,
    faCheckCircle,
    faSpinner,
    faExclamationTriangle,
    faUser,
    faBuilding,
    faClock,
    faCalendarAlt,
    faShoppingCart,
    faReceipt,
    faFileContract
} from '@fortawesome/free-solid-svg-icons';

// Import custom hooks and components
import {
    useItemsManagement,
    useItemSearch,
    useRoundOff,
    useBankAccounts,
    usePaymentManagement,
    useTaxMode,
    usePartySelection,
    useInvoiceSave,
    useOverdueManagement
} from './ItemsTableHooks';
import PaymentModal from './PaymentModal';
import itemsTableLogic from './itemsTableLogic';
import './itemsTableStyles.css';

const ItemsTableWithTotals = ({
    items = [],
    onItemsChange,
    categories = [],
    inventoryItems = [],
    companyId,
    gstEnabled = true,
    formType = 'sales',
    mode,
    documentType,
    onSave,
    onShare,
    onCancel,
    selectedCustomer = null,
    selectedSupplier = null,
    invoiceNumber = '',
    invoiceDate = '',
    userId = null,
    addToast
}) => {
    // ===== REFS =====
    const searchTimeouts = useRef({});
    const inputRefs = useRef({});

    // ===== MODE DETECTION =====
    const isQuotationsMode = mode === 'quotations' || documentType === 'quotation' || formType === 'quotation';

    // ===== CONFIGURATION =====
    const config = itemsTableLogic.getFormConfig ? itemsTableLogic.getFormConfig() : {};

    // Enhanced configuration with quotation support
    const getFormTypeConfig = () => {
        if (isQuotationsMode) {
            return config['quotation'] || {
                formIcon: faFileContract,
                totalLabel: 'Quotation Total',
                totalBorderColor: 'border-info',
                totalTextColor: 'text-info',
                actionButtonColor: 'info',
                paymentIcon: faFileContract,
                paymentAction: 'Add Terms',
                saveButtonVariant: 'info',
                saveButtonText: 'Save Quotation',
                emptyMessage: 'Add items to create quotation'
            };
        }

        return config[formType] || {
            formIcon: faShoppingCart,
            totalLabel: 'Total Amount',
            totalBorderColor: 'border-primary',
            totalTextColor: 'text-primary',
            actionButtonColor: 'primary',
            paymentIcon: faReceipt,
            paymentAction: 'Add Payment',
            saveButtonVariant: 'success',
            saveButtonText: 'Save Invoice',
            emptyMessage: 'Add items to calculate total'
        };
    };

    const currentConfig = getFormTypeConfig();

    // ===== CUSTOM HOOKS =====

    // Items management hook - Initialize first to get real functions
    const {
        localItems,
        setLocalItems,
        totals,
        handleItemChange,
        addRow,
        deleteRow,
        updateTotals,
        calculateItemTotals
    } = useItemsManagement(items, onItemsChange, gstEnabled, 'without-tax');

    // Tax mode hook with real functions
    const {
        globalTaxMode,
        setGlobalTaxMode,
        handleGlobalTaxModeChange,
        initializeItemTaxMode
    } = useTaxMode(
        localItems,
        calculateItemTotals,
        onItemsChange,
        setLocalItems,
        updateTotals
    );

    // Search functionality hook
    const {
        itemSearches,
        itemSuggestions,
        showItemSuggestions,
        searchNotFound,
        searchLoading,
        handleItemSearch,
        handleItemSuggestionSelect
    } = useItemSearch(companyId);

    // Round-off calculations hook
    const {
        roundOffEnabled,
        setRoundOffEnabled,
        roundOffCalculation,
        roundOffDisplayInfo,
        finalTotalWithRoundOff,
        roundOffValue
    } = useRoundOff(totals, gstEnabled);

    // Bank accounts hook
    const {
        bankAccounts,
        setBankAccounts,
        loadingBankAccounts,
        loadBankAccounts
    } = useBankAccounts(companyId);

    // Party selection hook
    const {
        getSelectedParty,
        getPartyType,
        getPartyName,
        getPartyId,
        getSecondaryParty,
        getSecondaryPartyName,
        getSecondaryPartyType,
        validatePaymentRequirements
    } = usePartySelection(selectedCustomer, selectedSupplier, formType, addToast);

    // Payment management hook with quotation support
    const {
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
        handleDueDateChange
    } = usePaymentManagement(
        formType,
        companyId,
        finalTotalWithRoundOff,
        selectedCustomer,
        selectedSupplier,
        invoiceNumber,
        userId,
        currentConfig,
        bankAccounts
    );

    // Invoice save hook
    const { handleSaveWithTransaction } = useInvoiceSave(
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
        isQuotationsMode
    );

    // Overdue management hook (only for sales, not quotations)
    const {
        overdueSales,
        salesDueToday,
        overdueLoading,
        dueTodayLoading,
        getOverdueSummary
    } = useOverdueManagement(companyId);

    // ===== DERIVED VALUES =====
    const hasValidItems = totals.finalTotal > 0 || totals.subtotal > 0;
    const gridLayout = itemsTableLogic.calculateGridLayout ?
        itemsTableLogic.calculateGridLayout(hasValidItems, gstEnabled, totals.totalTax) :
        { payment: 3, tax: 3, total: 3, actions: 3 };
    const columnWidths = itemsTableLogic.getColumnWidths ?
        itemsTableLogic.getColumnWidths(gstEnabled) :
        { serial: '50px', item: '200px', qty: '80px', unit: '80px', price: '120px', discount: '100px', tax: '100px', amount: '120px', action: '60px', hsn: '100px' };

    // ===== HELPER FUNCTIONS =====

    // Enhanced payment handler for quotations
    const handlePayment = () => {
        if (isQuotationsMode) {
            // For quotations, different validation - just need items
            if (!hasValidItems) {
                addToast('Please add items to create quotation terms', 'warning');
                return;
            }
        } else {
            // For invoices, strict validation
            const validation = validatePaymentRequirements(hasValidItems, finalTotalWithRoundOff);
            if (!validation.valid) {
                return;
            }
        }

        setShowPaymentModal(true);
    };

    const handleIndividualTaxModeChange = (index, mode) => {
        console.log(`🔄 Changing item ${index + 1} tax mode to:`, mode);

        const newItems = [...localItems];
        const oldItem = newItems[index];

        newItems[index] = {
            ...oldItem,
            taxMode: mode,
            priceIncludesTax: mode === 'with-tax'
        };

        console.log(`📝 Item ${index + 1} before tax mode change:`, {
            itemName: oldItem.itemName,
            oldTaxMode: oldItem.taxMode,
            oldPriceIncludesTax: oldItem.priceIncludesTax,
            pricePerUnit: oldItem.pricePerUnit,
            oldAmount: oldItem.amount
        });

        // Recalculate item totals with new tax mode
        if (newItems[index].itemName && newItems[index].pricePerUnit > 0) {
            const recalculatedItem = calculateItemTotals(newItems[index], index, newItems, 'taxMode');
            newItems[index] = recalculatedItem;

            console.log(`✅ Item ${index + 1} after tax mode change:`, {
                itemName: recalculatedItem.itemName,
                newTaxMode: recalculatedItem.taxMode,
                newPriceIncludesTax: recalculatedItem.priceIncludesTax,
                pricePerUnit: recalculatedItem.pricePerUnit,
                newAmount: recalculatedItem.amount,
                taxableAmount: recalculatedItem.taxableAmount,
                totalTax: recalculatedItem.cgstAmount + recalculatedItem.sgstAmount
            });
        }

        setLocalItems(newItems);
        updateTotals(newItems);
        onItemsChange(newItems);
    };

    // Global tax mode change handler
    const handleGlobalTaxModeChangeWithLogging = (mode) => {
        console.log('🌍 UI: Changing global tax mode to:', mode);
        console.log('🌍 UI: Current items before change:', localItems.map(item => ({
            name: item.itemName,
            taxMode: item.taxMode,
            priceIncludesTax: item.priceIncludesTax,
            amount: item.amount,
            pricePerUnit: item.pricePerUnit
        })));

        const result = handleGlobalTaxModeChange(mode);

        // Force a re-render to ensure UI updates
        setTimeout(() => {
            console.log('🌍 UI: Tax mode changed, current items after change:', localItems.map(item => ({
                name: item.itemName,
                taxMode: item.taxMode,
                priceIncludesTax: item.priceIncludesTax,
                amount: item.amount,
                pricePerUnit: item.pricePerUnit
            })));
        }, 100);

        console.log('✅ UI: Global tax mode change result:', result);
        return result;
    };

    // ===== RENDER HELPERS =====

    // Table header with tax mode controls
    const renderTableHeader = () => {
        const currentTaxMode = globalTaxMode || 'without-tax';

        return (
            <thead className="table-light">
                <tr>
                    <th style={{ width: columnWidths.serial }}>#</th>
                    <th style={{ width: columnWidths.item }}>ITEM</th>
                    {gstEnabled && <th style={{ width: columnWidths.hsn }}>HSN CODE</th>}
                    <th style={{ width: columnWidths.qty }}>QTY</th>
                    <th style={{ width: columnWidths.unit }}>UNIT</th>
                    <th style={{ width: columnWidths.price }}>
                        <div className="d-flex flex-column align-items-center">
                            <span className="fw-bold">PRICE/UNIT</span>
                            {gstEnabled && (
                                <div className="mt-2">
                                    <ButtonGroup size="sm">
                                        <Button
                                            variant={currentTaxMode === 'with-tax' ? 'success' : 'outline-success'}
                                            size="sm"
                                            onClick={() => handleGlobalTaxModeChangeWithLogging('with-tax')}
                                            style={{ fontSize: '11px', padding: '3px 8px' }}
                                        >
                                            <small>With Tax</small>
                                        </Button>
                                        <Button
                                            variant={currentTaxMode === 'without-tax' ? 'primary' : 'outline-primary'}
                                            size="sm"
                                            onClick={() => handleGlobalTaxModeChangeWithLogging('without-tax')}
                                            style={{ fontSize: '11px', padding: '3px 8px' }}
                                        >
                                            <small>Without Tax</small>
                                        </Button>
                                    </ButtonGroup>
                                </div>
                            )}
                            {gstEnabled && (
                                <small className={`text-${currentTaxMode === 'with-tax' ? 'success' : 'primary'} mt-1`}>
                                    {currentTaxMode === 'with-tax' ? 'Price includes tax' : 'Price excludes tax'}
                                </small>
                            )}
                        </div>
                    </th>
                    <th style={{ width: columnWidths.discount }}>DISCOUNT</th>
                    {gstEnabled && <th style={{ width: columnWidths.tax }}>TAX</th>}
                    <th style={{ width: columnWidths.amount }}>AMOUNT</th>
                    <th style={{ width: columnWidths.action }}></th>
                </tr>
            </thead>
        );
    };

    // Item row renderer
    const renderItemRow = (item, index) => (
        <tr key={item.id || index}>
            <td className="text-center">{index + 1}</td>

            {/* Item Name with Search */}
            <td>
                <div className="position-relative">
                    <Form.Control
                        type="text"
                        value={itemSearches[index] || item.itemName || ''}
                        onChange={(e) => {
                            handleItemChange(index, 'itemName', e.target.value);
                            handleItemSearch(index, e.target.value);
                        }}
                        placeholder="Search or enter item name..."
                        size="sm"
                    />

                    {/* Search Loading */}
                    {searchLoading[index] && (
                        <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                            <FontAwesomeIcon icon={faSpinner} spin size="sm" />
                        </div>
                    )}

                    {/* Item Suggestions */}
                    {showItemSuggestions[index] && itemSuggestions[index]?.length > 0 && (
                        <div className="position-absolute w-100 suggestions-dropdown" style={{ zIndex: 1050, top: '100%' }}>
                            <div className="bg-white border rounded shadow-lg">
                                {itemSuggestions[index].slice(0, 5).map((suggestion) => (
                                    <div
                                        key={suggestion._id || suggestion.id}
                                        className="p-2 border-bottom cursor-pointer hover-bg-light"
                                        onClick={() => handleItemSuggestionSelect(
                                            index,
                                            suggestion,
                                            localItems,
                                            calculateItemTotals,
                                            onItemsChange,
                                            setLocalItems,
                                            updateTotals
                                        )}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="fw-bold">{suggestion.name}</div>
                                        <small className="text-muted">
                                            {suggestion.itemCode} | ₹{suggestion.salePrice} | Stock: {suggestion.currentStock}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Not Found Alert */}
                    {searchNotFound[index] && !searchLoading[index] && !showItemSuggestions[index] && (
                        <div className="position-absolute w-100" style={{ zIndex: 1040, top: '100%' }}>
                            <Alert variant="warning" className="mb-0 p-2">
                                <small>Item "{searchNotFound[index]}" not found</small>
                            </Alert>
                        </div>
                    )}
                </div>
            </td>

            {/* HSN Code */}
            {gstEnabled && (
                <td>
                    <Form.Control
                        type="text"
                        value={item.hsnCode || ''}
                        onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                        placeholder="HSN"
                        size="sm"
                    />
                </td>
            )}

            {/* Quantity */}
            <td>
                <Form.Control
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    size="sm"
                    min="0"
                    step="0.01"
                />
            </td>

            {/* Unit */}
            <td>
                <Form.Select
                    value={item.unit || 'PCS'}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    size="sm"
                >
                    {(itemsTableLogic.unitOptions || ['PCS', 'KG', 'GM', 'LTR', 'ML', 'BOX', 'PKT']).map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                    ))}
                </Form.Select>
            </td>

            {/* Price Per Unit with Individual Tax Mode */}
            <td>
                <div className="d-flex flex-column gap-1">
                    <Form.Control
                        type="number"
                        value={item.pricePerUnit || ''}
                        onChange={(e) => handleItemChange(index, 'pricePerUnit', e.target.value)}
                        placeholder="Price"
                        size="sm"
                        min="0"
                        step="0.01"
                    />
                    {gstEnabled && (
                        <Form.Select
                            value={item.taxMode || globalTaxMode}
                            onChange={(e) => handleIndividualTaxModeChange(index, e.target.value)}
                            size="sm"
                            style={{ fontSize: '11px' }}
                        >
                            <option value="with-tax">With Tax</option>
                            <option value="without-tax">Without Tax</option>
                        </Form.Select>
                    )}
                </div>
            </td>

            {/* Discount */}
            <td>
                <div className="d-flex gap-1">
                    <Form.Control
                        type="number"
                        value={item.discountPercent || ''}
                        onChange={(e) => handleItemChange(index, 'discountPercent', e.target.value)}
                        placeholder="%"
                        size="sm"
                        min="0"
                        max="100"
                        step="0.01"
                        style={{ width: '60px' }}
                    />
                    <Form.Control
                        type="number"
                        value={item.discountAmount || ''}
                        onChange={(e) => handleItemChange(index, 'discountAmount', e.target.value)}
                        placeholder="₹"
                        size="sm"
                        min="0"
                        step="0.01"
                        style={{ width: '70px' }}
                    />
                </div>
            </td>

            {/* Tax (GST) */}
            {gstEnabled && (
                <td>
                    <div className="d-flex flex-column gap-1">
                        <Form.Control
                            type="number"
                            value={item.cgstAmount || ''}
                            onChange={(e) => handleItemChange(index, 'cgstAmount', e.target.value)}
                            placeholder="CGST"
                            size="sm"
                            min="0"
                            step="0.01"
                        />
                        <Form.Control
                            type="number"
                            value={item.sgstAmount || ''}
                            onChange={(e) => handleItemChange(index, 'sgstAmount', e.target.value)}
                            placeholder="SGST"
                            size="sm"
                            min="0"
                            step="0.01"
                        />
                    </div>
                </td>
            )}

            {/* Amount with tax mode indicator */}
            <td className="text-end">
                <div className="d-flex flex-column align-items-end">
                    <strong>₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(item.amount || 0) : (item.amount || 0).toFixed(2)}</strong>
                    {gstEnabled && (
                        <small className={`text-${(item.taxMode || globalTaxMode) === 'with-tax' ? 'success' : 'primary'}`}>
                            {(item.taxMode || globalTaxMode) === 'with-tax' ? 'Inc. Tax' : 'Exc. Tax'}
                        </small>
                    )}
                </div>
            </td>

            {/* Action */}
            <td className="text-center">
                <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => deleteRow(index)}
                    disabled={localItems.length === 1}
                >
                    <FontAwesomeIcon icon={faTrash} size="xs" />
                </Button>
            </td>
        </tr>
    );

    // Totals row
    const renderTotalsRow = () => (
        <tr className="table-secondary">
            <td></td>
            <td className="fw-bold">TOTAL</td>
            {gstEnabled && <td></td>}
            <td className="text-center fw-bold">
                {(totals.totalQuantity || 0).toFixed(2)}
            </td>
            <td></td>
            <td></td>
            <td className="text-center fw-bold">
                ₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.totalDiscountAmount || 0) : (totals.totalDiscountAmount || 0).toFixed(2)}
            </td>
            {gstEnabled && (
                <td className="text-center">
                    <div className="d-flex flex-column gap-1">
                        <span className="fw-bold">₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.totalCGST || 0) : (totals.totalCGST || 0).toFixed(2)}</span>
                        <span className="fw-bold">₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.totalSGST || 0) : (totals.totalSGST || 0).toFixed(2)}</span>
                    </div>
                </td>
            )}
            <td className="text-center fw-bold text-success">
                ₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.finalTotal || 0) : (totals.finalTotal || 0).toFixed(2)}
            </td>
            <td></td>
        </tr>
    );

    // Overdue dashboard (only for sales, not quotations)
    const renderOverdueDashboard = () => {
        if (formType !== 'sales' || isQuotationsMode) return null;

        const overdueSummary = getOverdueSummary();

        if (overdueSummary.overdueCount === 0 && overdueSummary.dueTodayCount === 0) {
            return null;
        }

        return (
            <Alert variant="warning" className="mb-3">
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faClock} className="me-2" />
                        <strong>Payment Reminders</strong>
                    </div>
                    <div className="d-flex gap-3">
                        {overdueSummary.overdueCount > 0 && (
                            <div className="text-danger">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                                <strong>{overdueSummary.overdueCount}</strong> Overdue
                                <small className="ms-1">(₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(overdueSummary.totalOverdueAmount) : overdueSummary.totalOverdueAmount.toFixed(2)})</small>
                            </div>
                        )}
                        {overdueSummary.dueTodayCount > 0 && (
                            <div className="text-warning">
                                <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                                <strong>{overdueSummary.dueTodayCount}</strong> Due Today
                                <small className="ms-1">(₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(overdueSummary.totalDueTodayAmount) : overdueSummary.totalDueTodayAmount.toFixed(2)})</small>
                            </div>
                        )}
                    </div>
                </div>
            </Alert>
        );
    };

    // Party selection indicator
    const renderPartySelectionIndicator = () => {
        const result = getSelectedParty();
        const partyType = getPartyType();
        const partyName = getPartyName();
        const partyId = getPartyId();

        const secondaryParty = getSecondaryParty();
        const secondaryPartyName = getSecondaryPartyName();
        const secondaryPartyType = getSecondaryPartyType();

        if (!result) {
            return (
                <Alert variant="warning" className="mb-3">
                    <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        <div>
                            <strong>No Party Selected</strong>
                            <br />
                            <small>
                                Please select a {formType === 'purchase' ? 'supplier or customer' : 'customer or supplier'} to proceed with {isQuotationsMode ? 'quotation creation' : 'payments and save the invoice'}.
                                <br />
                                <em>You can select both if needed (e.g., selling to supplier or buying from customer).</em>
                            </small>
                        </div>
                    </div>
                </Alert>
            );
        }

        // Handle dual party selection
        if (result.type === 'both') {
            return (
                <Alert variant="info" className="mb-3">
                    <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faUser} className="me-2" />
                        <div className="flex-grow-1">
                            <strong>Multiple Parties Selected</strong>
                            <br />
                            <div className="mt-2">
                                <div className="d-flex align-items-center mb-1">
                                    <FontAwesomeIcon
                                        icon={partyType === 'customer' ? faUser : faBuilding}
                                        className="me-2 text-primary"
                                        size="sm"
                                    />
                                    <strong>Primary ({partyType}):</strong>
                                    <span className="ms-2">{partyName}</span>
                                    <small className="ms-2 text-muted">ID: {partyId}</small>
                                </div>
                                <div className="d-flex align-items-center">
                                    <FontAwesomeIcon
                                        icon={secondaryPartyType === 'customer' ? faUser : faBuilding}
                                        className="me-2 text-secondary"
                                        size="sm"
                                    />
                                    <strong>Secondary ({secondaryPartyType}):</strong>
                                    <span className="ms-2">{secondaryPartyName}</span>
                                </div>
                            </div>
                            <small className="text-muted mt-2 d-block">
                                {isQuotationsMode ? 'Quotation' : (formType === 'sales' ? 'Sales' : 'Purchase')} will be created for <strong>{partyName}</strong> (primary party).
                                <br />
                                <em>Secondary party info will be included for reference.</em>
                            </small>
                        </div>
                    </div>
                </Alert>
            );
        }

        // Single party selected
        return (
            <Alert variant="success" className="mb-3">
                <div className="d-flex align-items-center">
                    <FontAwesomeIcon
                        icon={partyType === 'customer' ? faUser : faBuilding}
                        className="me-2"
                    />
                    <div>
                        <strong>{partyType === 'customer' ? 'Customer' : 'Supplier'}:</strong> {partyName}
                        <br />
                        <small className="text-muted">
                            {isQuotationsMode ? 'Quotation' : (formType === 'sales' ? 'Sales' : 'Purchase')} will be created for this {partyType}.
                            <span className="ms-2">ID: {partyId}</span>
                        </small>

                        {/* Show cross-selling/buying message for non-quotations */}
                        {!isQuotationsMode && (formType === 'sales' && partyType === 'supplier') && (
                            <div className="mt-1">
                                <small className="text-info">
                                    <FontAwesomeIcon icon={faUser} className="me-1" />
                                    <strong>Cross-selling:</strong> Creating sales invoice for supplier.
                                </small>
                            </div>
                        )}

                        {!isQuotationsMode && (formType === 'purchase' && partyType === 'customer') && (
                            <div className="mt-1">
                                <small className="text-info">
                                    <FontAwesomeIcon icon={faBuilding} className="me-1" />
                                    <strong>Reverse purchasing:</strong> Creating purchase invoice from customer.
                                </small>
                            </div>
                        )}
                    </div>
                </div>
            </Alert>
        );
    };

    // Payment status indicator
    const renderPaymentStatus = () => {
        if (paymentData.amount > 0) {
            const selectedBank = bankAccounts.find(acc => acc._id === paymentData.bankAccountId);
            return (
                <div className="mt-2 p-2 bg-success bg-opacity-10 rounded border border-success border-opacity-25">
                    <small className="text-success d-flex align-items-center">
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                        <strong>{isQuotationsMode ? 'Terms Selected:' : 'Payment Selected:'}</strong>
                        <span className="ms-1">₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(paymentData.amount) : paymentData.amount.toFixed(2)}</span>
                        {selectedBank && (
                            <span className="ms-2 text-muted">
                                → {selectedBank.accountName}
                            </span>
                        )}
                    </small>
                    <div className="mt-1">
                        <small className="text-muted">
                            Method: {paymentData.paymentType} |
                            Party: {paymentData.partyName}
                            {paymentData.hasDueDate && (
                                <>
                                    {paymentData.dueDate && (
                                        <span className="text-warning ms-2">
                                            | <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                                            Due: {new Date(paymentData.dueDate).toLocaleDateString()}
                                        </span>
                                    )}
                                    {paymentData.creditDays > 0 && (
                                        <span className="text-info ms-2">
                                            | <FontAwesomeIcon icon={faClock} className="me-1" />
                                            {paymentData.creditDays} days credit
                                        </span>
                                    )}
                                </>
                            )}
                            |
                            <span className="text-info">
                                Will be recorded when {isQuotationsMode ? 'quotation is created' : 'invoice is created'}
                            </span>
                        </small>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Tax mode status
    const renderTaxModeStatus = () => {
        if (!gstEnabled) return null;

        const currentTaxMode = globalTaxMode || 'without-tax';
        const displayText = currentTaxMode === 'with-tax' ? 'With Tax' : 'Without Tax';
        const explanationText = currentTaxMode === 'with-tax'
            ? 'Prices entered include tax (tax will be extracted)'
            : 'Prices entered exclude tax (tax will be added)';

        const itemsWithDifferentModes = localItems.filter(item =>
            item.itemName &&
            item.taxMode &&
            item.taxMode !== currentTaxMode
        );

        return (
            <Alert variant="info" className="mb-3">
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faPercent} className="me-2" />
                        <div>
                            <strong>Current Tax Mode: </strong>
                            <span className={`badge bg-${currentTaxMode === 'with-tax' ? 'success' : 'primary'} ms-1`}>
                                {displayText}
                            </span>
                        </div>
                    </div>
                    <small className="text-muted">
                        {explanationText}
                    </small>
                </div>

                {itemsWithDifferentModes.length > 0 && (
                    <div className="mt-2 pt-2 border-top">
                        <small className="text-warning">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                            <strong>Mixed Tax Modes:</strong> Some items have individual tax mode settings different from global mode.
                        </small>
                        <div className="mt-1">
                            {itemsWithDifferentModes.map((item, index) => {
                                const itemDisplayText = item.taxMode === 'with-tax' ? 'With Tax' : 'Without Tax';
                                const originalIndex = localItems.findIndex(localItem =>
                                    localItem.id === item.id ||
                                    (localItem.itemName === item.itemName && localItem.pricePerUnit === item.pricePerUnit)
                                );

                                return (
                                    <span key={item.id || index} className="badge bg-warning text-dark me-1">
                                        {item.itemName || `Item ${originalIndex + 1}`}: {itemDisplayText}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Alert>
        );
    };

    // ===== MAIN RENDER =====
    return (
        <div className="items-table-with-totals">
            {/* Overdue Dashboard */}
            {renderOverdueDashboard()}

            {/* Party Selection Indicator */}
            {renderPartySelectionIndicator()}

            {/* Tax Mode Status */}
            {renderTaxModeStatus()}

            {/* Items Table Section */}
            <Card className="items-table-card mb-4">
                <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">
                            <FontAwesomeIcon icon={currentConfig.formIcon} className="me-2" />
                            Items & Details
                            {isQuotationsMode && (
                                <span className="badge bg-info ms-2">Quotation Mode</span>
                            )}
                        </h6>

                        <div className="d-flex gap-3 align-items-center">
                            {gstEnabled && (
                                <div className="d-flex align-items-center gap-2">
                                    <small className="text-muted">Global Mode:</small>
                                    <ButtonGroup size="sm">
                                        <Button
                                            variant={globalTaxMode === 'with-tax' ? 'success' : 'outline-success'}
                                            size="sm"
                                            onClick={() => handleGlobalTaxModeChangeWithLogging('with-tax')}
                                            style={{ fontSize: '11px', padding: '4px 8px' }}
                                        >
                                            With Tax
                                        </Button>
                                        <Button
                                            variant={globalTaxMode === 'without-tax' ? 'primary' : 'outline-primary'}
                                            size="sm"
                                            onClick={() => handleGlobalTaxModeChangeWithLogging('without-tax')}
                                            style={{ fontSize: '11px', padding: '4px 8px' }}
                                        >
                                            Without Tax
                                        </Button>
                                    </ButtonGroup>
                                </div>
                            )}

                            {/* Add Row Button */}
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={addRow}
                                className="add-row-btn"
                            >
                                <FontAwesomeIcon icon={faPlus} className="me-1" />
                                Add Row
                            </Button>
                        </div>
                    </div>
                </Card.Header>

                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table className="items-table mb-0" striped hover>
                            {renderTableHeader()}
                            <tbody>
                                {localItems.map((item, index) => renderItemRow(item, index))}
                                {renderTotalsRow()}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Totals and Actions Section */}
            <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                    <Row className="align-items-center g-4">
                        {/* Payment/Terms Button */}
                        {hasValidItems && (
                            <Col md={gridLayout.payment}>
                                <div className="text-center">
                                    <Button
                                        variant={paymentData.amount > 0 ? 'success' : currentConfig.actionButtonColor}
                                        size="lg"
                                        className="w-100 h-100 d-flex align-items-center justify-content-center flex-column border-2 border-dashed fw-semibold"
                                        style={{
                                            minHeight: '80px',
                                            borderRadius: '12px',
                                            fontSize: '13px'
                                        }}
                                        onClick={handlePayment}
                                        disabled={!hasValidItems || finalTotalWithRoundOff <= 0 || (!isQuotationsMode && !getSelectedParty())}
                                    >
                                        <FontAwesomeIcon
                                            icon={paymentData.amount > 0 ? faCheckCircle : currentConfig.paymentIcon}
                                            className="mb-1"
                                            size="lg"
                                        />
                                        <span className="small">
                                            {paymentData.amount > 0 ?
                                                (isQuotationsMode ? 'Update Terms' : 'Update Payment') :
                                                currentConfig.paymentAction
                                            }
                                        </span>
                                        <small className="text-muted">
                                            {paymentData.amount > 0
                                                ? `₹${itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(paymentData.amount) : paymentData.amount.toFixed(2)} Selected`
                                                : `₹${itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(finalTotalWithRoundOff) : finalTotalWithRoundOff.toFixed(2)}`
                                            }
                                        </small>
                                        {paymentData.hasDueDate && paymentData.amount > 0 && (
                                            <small className="text-light mt-1">
                                                {paymentData.dueDate && (
                                                    <span>
                                                        <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                                                        Due: {new Date(paymentData.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {paymentData.creditDays > 0 && !paymentData.dueDate && (
                                                    <span>
                                                        <FontAwesomeIcon icon={faClock} className="me-1" />
                                                        {paymentData.creditDays} days credit
                                                    </span>
                                                )}
                                            </small>
                                        )}
                                        {!isQuotationsMode && !getSelectedParty() && (
                                            <small className="text-warning mt-1">
                                                Select {formType === 'purchase' ? 'supplier or customer' : 'customer or supplier'} first
                                            </small>
                                        )}
                                    </Button>

                                    {/* Payment status indicator */}
                                    {renderPaymentStatus()}
                                </div>
                            </Col>
                        )}

                        {/* Tax Breakdown */}
                        {gstEnabled && totals.totalTax > 0 && (
                            <Col md={gridLayout.tax}>
                                <Card className="bg-light border-0 h-100">
                                    <Card.Body className="p-3">
                                        <div className="text-center mb-2">
                                            <FontAwesomeIcon icon={faPercent} className="me-2 text-info" />
                                            <span className="fw-bold text-secondary small">GST Breakdown</span>
                                            <div className="mt-1">
                                                <span className={`badge bg-${globalTaxMode === 'with-tax' ? 'success' : 'primary'} badge-sm`}>
                                                    {globalTaxMode === 'with-tax' ? 'With Tax Mode' : 'Without Tax Mode'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="small">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="text-muted">Subtotal:</span>
                                                <span className="fw-semibold">₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.subtotal || 0) : (totals.subtotal || 0).toFixed(2)}</span>
                                            </div>
                                            {totals.totalCGST > 0 && (
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="text-muted">CGST:</span>
                                                    <span className="fw-semibold text-info">₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.totalCGST) : totals.totalCGST.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {totals.totalSGST > 0 && (
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="text-muted">SGST:</span>
                                                    <span className="fw-semibold text-info">₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.totalSGST) : totals.totalSGST.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-muted">Total GST:</span>
                                                <span className="fw-semibold text-info">₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.totalTax || 0) : (totals.totalTax || 0).toFixed(2)}</span>
                                            </div>
                                            <hr className="my-2" />
                                            <div className="d-flex justify-content-between">
                                                <span className="fw-bold text-dark">Final Total:</span>
                                                <span className="fw-bold text-primary">₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.finalTotal || 0) : (totals.finalTotal || 0).toFixed(2)}</span>
                                            </div>
                                            {globalTaxMode === 'with-tax' && (
                                                <small className="text-success d-block mt-1 text-center">
                                                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                                    Tax included in entered prices
                                                </small>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        )}

                        {/* Total Section */}
                        <Col md={gridLayout.total}>
                            <Card className={`${hasValidItems ? currentConfig.totalBorderColor : 'border-secondary'} border-3 h-100`}>
                                <Card.Body className="p-3">
                                    <div className="text-center mb-3">
                                        <FontAwesomeIcon icon={currentConfig.formIcon} className="me-2 text-muted" />
                                        <span className="fw-bold text-secondary small">
                                            {currentConfig.totalLabel} {gstEnabled ? '(Inc. GST)' : '(No GST)'}
                                        </span>
                                        {gstEnabled && (
                                            <div className="mt-1">
                                                <span className={`badge bg-${globalTaxMode === 'with-tax' ? 'success' : 'primary'} badge-sm`}>
                                                    {globalTaxMode === 'with-tax' ? 'With Tax' : 'Without Tax'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`fw-bold ${hasValidItems ? currentConfig.totalTextColor : 'text-secondary'} h4 mb-3 text-center`}>
                                        ₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(finalTotalWithRoundOff) : finalTotalWithRoundOff.toFixed(2)}
                                    </div>

                                    {hasValidItems && (
                                        <div className="border-top pt-3">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <div className="d-flex align-items-center">
                                                    <FontAwesomeIcon icon={faCalculator} className="me-2 text-warning" size="sm" />
                                                    <span className="fw-semibold text-secondary small">Round Off</span>
                                                </div>
                                                <Form.Check
                                                    type="switch"
                                                    id="roundoff-switch"
                                                    checked={roundOffEnabled}
                                                    onChange={(e) => setRoundOffEnabled(e.target.checked)}
                                                    className="form-check-sm"
                                                />
                                            </div>

                                            {/* Round-off display */}
                                            {roundOffEnabled && roundOffDisplayInfo?.showRoundOffBreakdown && (
                                                <div className="mt-2 p-2 bg-warning bg-opacity-10 rounded">
                                                    <div className="d-flex justify-content-between small">
                                                        <span className="text-muted">{roundOffDisplayInfo.baseTotalLabel}:</span>
                                                        <span>₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(roundOffDisplayInfo.baseTotalAmount) : roundOffDisplayInfo.baseTotalAmount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between small">
                                                        <span className="text-muted">Round Off:</span>
                                                        <span className={`fw-bold ${roundOffDisplayInfo.roundOffColorClass}`}>
                                                            {roundOffDisplayInfo.roundOffLabel}₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(Math.abs(roundOffDisplayInfo.roundOffAmount)) : Math.abs(roundOffDisplayInfo.roundOffAmount).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <hr className="my-1" />
                                                    <div className="d-flex justify-content-between small fw-bold">
                                                        <span>Final Total:</span>
                                                        <span>₹{itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(roundOffDisplayInfo.finalTotalAmount) : roundOffDisplayInfo.finalTotalAmount.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {roundOffEnabled && roundOffDisplayInfo?.alreadyRoundedMessage && (
                                                <div className="mt-2 p-2 bg-success bg-opacity-10 rounded text-center">
                                                    <small className="text-success">
                                                        <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                                        {roundOffDisplayInfo.alreadyRoundedMessage}
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="small text-muted text-center mt-3">
                                        {!hasValidItems ? (
                                            <div className="text-center">
                                                <small className="text-muted">{currentConfig.emptyMessage}</small>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-1">
                                                    {gstEnabled && totals.totalTax > 0
                                                        ? `GST Applied (${globalTaxMode}) - Base: ₹${itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.subtotal) : totals.subtotal.toFixed(2)} + Tax: ₹${itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.totalTax) : totals.totalTax.toFixed(2)}`
                                                        : gstEnabled
                                                            ? `GST Enabled (${globalTaxMode}) - Calculating Tax... (₹${itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.subtotal) : totals.subtotal.toFixed(2)})`
                                                            : `Non-GST Transaction - ₹${itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.finalTotal) : totals.finalTotal.toFixed(2)}`
                                                    }
                                                </div>
                                                <div className="text-info">
                                                    <small>
                                                        {gstEnabled
                                                            ? `Base: ₹${itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.subtotal) : totals.subtotal.toFixed(2)} + GST: ₹${itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.totalTax) : totals.totalTax.toFixed(2)}`
                                                            : `Non-GST Total: ₹${itemsTableLogic.formatCurrency ? itemsTableLogic.formatCurrency(totals.finalTotal) : totals.finalTotal.toFixed(2)}`
                                                        }
                                                        {roundOffEnabled && roundOffValue !== 0 && ` + Round Off`}
                                                    </small>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Action Buttons */}
                        <Col md={gridLayout.actions}>
                            <div className="d-grid gap-2">
                                <Button
                                    variant="outline-info"
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-semibold border-2"
                                    onClick={onShare}
                                    disabled={!hasValidItems || finalTotalWithRoundOff <= 0}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <span>Share</span>
                                    <FontAwesomeIcon icon={faDownload} />
                                </Button>

                                {/* Save button */}
                                <Button
                                    variant={currentConfig.saveButtonVariant}
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-bold border-0 shadow"
                                    onClick={handleSaveWithTransaction}
                                    disabled={!hasValidItems || (!isQuotationsMode && !getSelectedParty())}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    <span>{currentConfig.saveButtonText}</span>
                                    {paymentData.amount > 0 && (
                                        <small className="ms-1 text-light-emphasis">
                                            + {isQuotationsMode ? 'Terms' : 'Payment'}
                                            {paymentData.hasDueDate && (
                                                <>
                                                    {paymentData.dueDate && (
                                                        <span className="ms-1">
                                                            (<FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                                                            Due: {new Date(paymentData.dueDate).toLocaleDateString()})
                                                        </span>
                                                    )}
                                                    {paymentData.creditDays > 0 && !paymentData.dueDate && (
                                                        <span className="ms-1">
                                                            (<FontAwesomeIcon icon={faClock} className="me-1" />
                                                            {paymentData.creditDays}d)
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </small>
                                    )}
                                    {!isQuotationsMode && !getSelectedParty() && (
                                        <small className="ms-1 text-warning">
                                            (Select {formType === 'purchase' ? 'Supplier or Customer' : 'Customer or Supplier'})
                                        </small>
                                    )}
                                </Button>

                                <Button
                                    variant="outline-secondary"
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-semibold border-2"
                                    onClick={onCancel}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                    <span>Cancel</span>
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Payment Modal */}
            <PaymentModal
                show={showPaymentModal}
                onHide={() => setShowPaymentModal(false)}
                currentConfig={currentConfig}
                finalTotalWithRoundOff={finalTotalWithRoundOff}
                paymentData={paymentData}
                setPaymentData={setPaymentData}
                handlePaymentAmountChange={handlePaymentAmountChange}
                handlePaymentTypeChange={handlePaymentTypeChange}
                handlePaymentSubmit={(paymentSubmitData) => {
                    return handlePaymentSubmit(paymentSubmitData);
                }}
                submittingPayment={submittingPayment}
                bankAccounts={bankAccounts}
                loadingBankAccounts={loadingBankAccounts}
                paymentHistory={paymentHistory}
                totals={totals}
                gstEnabled={gstEnabled}
                roundOffEnabled={roundOffEnabled}
                roundOffValue={roundOffValue}
                invoiceNumber={invoiceNumber}
                invoiceDate={invoiceDate}
                handleDueDateToggle={handleDueDateToggle}
                handleCreditDaysChange={handleCreditDaysChange}
                handleDueDateChange={handleDueDateChange}
                isQuotationsMode={isQuotationsMode}
            />
        </div>
    );
};

export default ItemsTableWithTotals;