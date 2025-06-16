import React, { useRef } from 'react';
import { Card, Table, Button, Form, Row, Col, Alert, ButtonGroup, Spinner } from 'react-bootstrap';
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
    faFileContract
} from '@fortawesome/free-solid-svg-icons';

// Import only the hooks we need
import {
    useItemsManagement,
    useItemSearch,
    useRoundOff,
    useTaxMode,
    usePartySelection
} from '../SalesInvoice/SalesForm/itemsTableWithTotals/ItemsTableHooks';
import itemsTableLogic from '../SalesInvoice/SalesForm/itemsTableWithTotals/itemsTableLogic';

const QuotationItemsTable = ({
    items = [],
    onItemsChange,
    categories = [],
    inventoryItems = [],
    companyId,
    gstEnabled = true,
    formType = 'sales',
    onSave,
    onShare,
    onCancel,
    selectedCustomer = null,
    selectedSupplier = null,
    invoiceNumber = '',
    invoiceDate = '',
    userId = null,
    addToast,
    mode = 'quotations',
    documentType = 'quotation',
    documentLabels = {},
    disabled = false,
    loading = false,
    saving = false
}) => {
    // ===== REFS =====
    const searchTimeouts = useRef({});

    // ===== CONFIGURATION =====
    const config = itemsTableLogic.getFormConfig();
    const currentConfig = config[formType];

    // ===== CUSTOM HOOKS =====

    // Initialize placeholder functions
    const placeholderFunctions = {
        setLocalItems: () => { },
        calculateItemTotals: () => { },
        onItemsChange: () => { },
        updateTotals: () => { }
    };

    // Tax mode hook
    const {
        globalTaxMode: initialGlobalTaxMode,
        setGlobalTaxMode,
        handleGlobalTaxModeChange: initialHandleGlobalTaxModeChange
    } = useTaxMode(
        [],
        placeholderFunctions.calculateItemTotals,
        placeholderFunctions.onItemsChange,
        placeholderFunctions.setLocalItems,
        placeholderFunctions.updateTotals
    );

    // Items management hook
    const {
        localItems,
        setLocalItems,
        totals,
        handleItemChange,
        addRow,
        deleteRow,
        updateTotals,
        calculateItemTotals
    } = useItemsManagement(items, onItemsChange, gstEnabled, initialGlobalTaxMode);

    // Re-initialize tax mode hook with actual functions
    const {
        globalTaxMode,
        handleGlobalTaxModeChange
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
        roundOffDisplayInfo,
        finalTotalWithRoundOff,
        roundOffValue
    } = useRoundOff(totals, gstEnabled);

    // Party selection hook
    const {
        getSelectedParty,
        getPartyType,
        getPartyName,
        getPartyId
    } = usePartySelection(selectedCustomer, selectedSupplier, formType, addToast);

    // ===== DERIVED VALUES =====
    const hasValidItems = totals.finalTotal > 0 || totals.subtotal > 0;
    const isDisabled = disabled || loading || saving;

    // ✅ Simplified column widths for 6 columns only
    const columnWidths = {
        serial: '8%',
        item: '40%',
        qty: '15%',
        price: '25%',
        amount: '15%',
        action: '7%'
    };

    // ✅ Custom styles object (converted from styled-jsx)
    const customStyles = {
        quotationColor: '#0ea5e9',
        quotationRgb: '14, 165, 233'
    };

    // ===== HELPER FUNCTIONS =====

    // ✅ Fixed individual tax mode change
    const handleIndividualTaxModeChange = (index, mode) => {
        if (isDisabled) return;

        console.log(`🔄 Changing item ${index + 1} tax mode to:`, mode);

        const newItems = [...localItems];
        const oldItem = newItems[index];

        // Update the item with new tax mode
        newItems[index] = {
            ...oldItem,
            taxMode: mode,
            priceIncludesTax: mode === 'with-tax'
        };

        // Recalculate item totals with new tax mode
        if (newItems[index].itemName && newItems[index].pricePerUnit > 0) {
            const recalculatedItem = calculateItemTotals(newItems[index], index, newItems, 'taxMode');
            newItems[index] = recalculatedItem;
        }

        // Update state and trigger callbacks
        setLocalItems(newItems);
        updateTotals(newItems);
        onItemsChange(newItems);

        console.log(`✅ Item ${index + 1} tax mode changed to ${mode}:`, newItems[index]);
    };

    // ✅ Fixed global tax mode change handler
    const handleGlobalTaxModeChangeWithLogging = (mode) => {
        if (isDisabled) return;

        console.log('🌍 UI: Changing global tax mode to:', mode);

        try {
            // Update global tax mode
            setGlobalTaxMode(mode);

            // Update all items to use the new global tax mode
            const updatedItems = localItems.map((item, index) => {
                const updatedItem = {
                    ...item,
                    taxMode: mode,
                    priceIncludesTax: mode === 'with-tax'
                };

                // Recalculate totals if item has valid data
                if (updatedItem.itemName && updatedItem.pricePerUnit > 0) {
                    return calculateItemTotals(updatedItem, index, localItems, 'taxMode');
                }

                return updatedItem;
            });

            // Update state
            setLocalItems(updatedItems);
            updateTotals(updatedItems);
            onItemsChange(updatedItems);

            console.log('✅ UI: Global tax mode change completed:', mode);
            return { success: true, mode };
        } catch (error) {
            console.error('❌ Error changing global tax mode:', error);
            return { success: false, error };
        }
    };

    // Handle save with simplified data structure
    const handleSaveQuotation = async () => {
        if (isDisabled) return;

        try {
            const quotationData = {
                items: localItems.filter(item =>
                    item.itemName &&
                    parseFloat(item.quantity) > 0 &&
                    parseFloat(item.pricePerUnit) > 0
                ),
                totals: {
                    finalTotal: finalTotalWithRoundOff,
                    subtotal: totals.subtotal || 0,
                    totalTax: totals.totalTax || 0,
                    totalCGST: totals.totalCGST || 0,
                    totalSGST: totals.totalSGST || 0,
                    totalAmount: totals.finalTotal || 0,
                    totalQuantity: totals.totalQuantity || 0,
                    roundOffValue: roundOffValue || 0,
                    roundOffEnabled: roundOffEnabled
                },
                globalTaxMode,
                gstEnabled,
                documentType,
                mode
            };

            if (onSave) {
                const result = await onSave(quotationData);
                return result;
            }
        } catch (error) {
            console.error('❌ Error saving quotation:', error);
            addToast?.(error.message || 'Failed to save quotation', 'error');
        }
    };

    // Handle item change with disabled check
    const handleItemChangeWithCheck = (index, field, value) => {
        if (isDisabled) return;
        handleItemChange(index, field, value);
    };

    // Handle item search with disabled check
    const handleItemSearchWithCheck = (index, value) => {
        if (isDisabled) return;
        handleItemSearch(index, value);
    };

    // Handle add row with disabled check
    const handleAddRowWithCheck = () => {
        if (isDisabled) return;
        addRow();
    };

    // Handle delete row with disabled check
    const handleDeleteRowWithCheck = (index) => {
        if (isDisabled) return;
        deleteRow(index);
    };

    // ===== RENDER HELPERS =====

    // ✅ Table header with tax mode buttons in PRICE column
    const renderTableHeader = () => {
        const currentTaxMode = globalTaxMode || 'without-tax';

        return (
            <thead className="table-light">
                <tr>
                    <th style={{ width: columnWidths.serial }} className="text-center">#</th>
                    <th style={{ width: columnWidths.item }}>PRODUCT NAME</th>
                    <th style={{ width: columnWidths.qty }} className="text-center">QUANTITY</th>
                    <th style={{ width: columnWidths.price }} className="text-center">
                        <div className="d-flex flex-column align-items-center gap-1">
                            <span>PRICE</span>
                            {gstEnabled && (
                                <ButtonGroup size="sm" style={{ fontSize: '10px' }}>
                                    <Button
                                        variant={currentTaxMode === 'with-tax' ? 'success' : 'outline-success'}
                                        size="sm"
                                        onClick={() => handleGlobalTaxModeChangeWithLogging('with-tax')}
                                        style={{
                                            fontSize: '9px',
                                            padding: '2px 6px',
                                            minWidth: '45px',
                                            fontWeight: '600'
                                        }}
                                        disabled={isDisabled}
                                    >
                                        With Tax
                                    </Button>
                                    <Button
                                        variant={currentTaxMode === 'without-tax' ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        onClick={() => handleGlobalTaxModeChangeWithLogging('without-tax')}
                                        style={{
                                            fontSize: '9px',
                                            padding: '2px 6px',
                                            minWidth: '55px',
                                            fontWeight: '600'
                                        }}
                                        disabled={isDisabled}
                                    >
                                        Without Tax
                                    </Button>
                                </ButtonGroup>
                            )}
                            {gstEnabled && (
                                <small
                                    className={`text-${currentTaxMode === 'with-tax' ? 'success' : 'primary'}`}
                                    style={{ fontSize: '10px' }}
                                >
                                    {currentTaxMode === 'with-tax' ? 'Price includes tax' : 'Price excludes tax'}
                                </small>
                            )}
                        </div>
                    </th>
                    <th style={{ width: columnWidths.amount }} className="text-center">AMOUNT</th>
                    <th style={{ width: columnWidths.action }} className="text-center">ACTION</th>
                </tr>
            </thead>
        );
    };

    // ✅ Fixed item row with working dropdown
    const renderItemRow = (item, index) => (
        <tr key={item.id || index}>
            {/* Serial Number */}
            <td className="text-center align-middle">{index + 1}</td>

            {/* Product Name with Search */}
            <td>
                <div className="position-relative">
                    <Form.Control
                        type="text"
                        value={itemSearches[index] || item.itemName || ''}
                        onChange={(e) => {
                            handleItemChangeWithCheck(index, 'itemName', e.target.value);
                            handleItemSearchWithCheck(index, e.target.value);
                        }}
                        placeholder="Search or enter product name..."
                        size="sm"
                        disabled={isDisabled}
                    />

                    {/* Search Loading */}
                    {searchLoading[index] && (
                        <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                            <FontAwesomeIcon icon={faSpinner} spin size="sm" />
                        </div>
                    )}

                    {/* Item Suggestions */}
                    {showItemSuggestions[index] && itemSuggestions[index]?.length > 0 && !isDisabled && (
                        <div
                            className="position-absolute w-100 bg-white border rounded shadow-lg"
                            style={{
                                zIndex: 1050,
                                top: '100%',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}
                        >
                            {itemSuggestions[index].slice(0, 5).map((suggestion) => (
                                <div
                                    key={suggestion._id || suggestion.id}
                                    className="p-2 border-bottom"
                                    onClick={() => handleItemSuggestionSelect(
                                        index,
                                        suggestion,
                                        localItems,
                                        calculateItemTotals,
                                        onItemsChange,
                                        setLocalItems,
                                        updateTotals
                                    )}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                >
                                    <div className="fw-bold">{suggestion.name}</div>
                                    <small className="text-muted">
                                        ₹{suggestion.salePrice} | Stock: {suggestion.currentStock}
                                    </small>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Not Found Alert */}
                    {searchNotFound[index] && !searchLoading[index] && !showItemSuggestions[index] && (
                        <div className="position-absolute w-100" style={{ zIndex: 1040, top: '100%' }}>
                            <Alert variant="warning" className="mb-0 p-2">
                                <small>Product "{searchNotFound[index]}" not found</small>
                            </Alert>
                        </div>
                    )}
                </div>
            </td>

            {/* Quantity */}
            <td>
                <Form.Control
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => handleItemChangeWithCheck(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    size="sm"
                    min="0"
                    step="0.01"
                    className="text-center"
                    disabled={isDisabled}
                />
            </td>

            {/* Price with Tax Mode Dropdown */}
            <td>
                <div className="d-flex flex-column gap-1">
                    <Form.Control
                        type="number"
                        value={item.pricePerUnit || ''}
                        onChange={(e) => handleItemChangeWithCheck(index, 'pricePerUnit', e.target.value)}
                        placeholder="Price"
                        size="sm"
                        min="0"
                        step="0.01"
                        disabled={isDisabled}
                    />
                    {/* ✅ Fixed individual tax mode dropdown */}
                    {gstEnabled && (
                        <Form.Select
                            value={item.taxMode || globalTaxMode || 'without-tax'}
                            onChange={(e) => {
                                console.log(`🔄 Dropdown change for item ${index + 1}:`, e.target.value);
                                handleIndividualTaxModeChange(index, e.target.value);
                            }}
                            size="sm"
                            style={{
                                fontSize: '11px',
                                minHeight: '28px'
                            }}
                            disabled={isDisabled}
                        >
                            <option value="with-tax">With Tax</option>
                            <option value="without-tax">Without Tax</option>
                        </Form.Select>
                    )}
                </div>
            </td>

            {/* Amount */}
            <td className="text-center align-middle">
                <div className="d-flex flex-column align-items-center">
                    <strong style={{ color: customStyles.quotationColor }}>
                        ₹{itemsTableLogic.formatCurrency(item.amount || 0)}
                    </strong>
                    {gstEnabled && (
                        <small className={`text-${(item.taxMode || globalTaxMode) === 'with-tax' ? 'success' : 'primary'}`}>
                            {(item.taxMode || globalTaxMode) === 'with-tax' ? 'Inc. Tax' : 'Exc. Tax'}
                        </small>
                    )}
                </div>
            </td>

            {/* Action */}
            <td className="text-center align-middle">
                <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDeleteRowWithCheck(index)}
                    disabled={localItems.length === 1 || isDisabled}
                    title="Remove Product"
                    style={{ opacity: (localItems.length === 1 || isDisabled) ? 0.7 : 1 }}
                >
                    <FontAwesomeIcon icon={faTrash} size="xs" />
                </Button>
            </td>
        </tr>
    );

    // ✅ Simplified totals row
    const renderTotalsRow = () => (
        <tr className="table-secondary">
            <td></td>
            <td className="fw-bold">TOTAL</td>
            <td className="text-center fw-bold">
                {(totals.totalQuantity || 0).toFixed(2)}
            </td>
            <td></td>
            <td className="text-center fw-bold" style={{ color: customStyles.quotationColor }}>
                ₹{itemsTableLogic.formatCurrency(totals.finalTotal || 0)}
            </td>
            <td></td>
        </tr>
    );

    // ===== MAIN RENDER =====
    return (
        <div className="quotation-items-table">
            {/* ✅ Clean Items Table Section */}
            <Card
                className="items-table-card mb-4"
                style={{ borderLeft: `4px solid ${customStyles.quotationColor}` }}
            >
                <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">
                            <FontAwesomeIcon icon={faFileContract} className="me-2" />
                            {documentLabels.documentName || 'Items'} & Details
                            {saving && (
                                <Spinner animation="border" size="sm" className="ms-2" />
                            )}
                        </h6>

                        {/* Add Row Button */}
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={handleAddRowWithCheck}
                            className="add-row-btn"
                            disabled={isDisabled}
                            style={{ opacity: isDisabled ? 0.7 : 1 }}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-1" />
                            Add Product
                        </Button>
                    </div>
                </Card.Header>

                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table
                            className="items-table mb-0"
                            striped
                            hover
                            style={{
                                '--bs-table-hover-color': `rgba(${customStyles.quotationRgb}, 0.075)`
                            }}
                        >
                            {renderTableHeader()}
                            <tbody>
                                {localItems.map((item, index) => renderItemRow(item, index))}
                                {renderTotalsRow()}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* ✅ Simplified Totals and Actions Section */}
            <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                    <Row className="align-items-center g-4">
                        {/* Total Section */}
                        <Col md={8}>
                            <Card
                                className={`${hasValidItems ? 'border-3' : 'border-2'} h-100`}
                                style={{
                                    borderColor: hasValidItems ? customStyles.quotationColor : '#6c757d'
                                }}
                            >
                                <Card.Body className="p-3">
                                    <div className="text-center mb-3">
                                        <FontAwesomeIcon icon={faFileContract} className="me-2 text-muted" />
                                        <span className="fw-bold text-secondary small">
                                            {documentLabels.documentName || 'Quotation'} Total {gstEnabled ? '(Inc. GST)' : '(No GST)'}
                                        </span>
                                        {gstEnabled && (
                                            <div className="mt-1">
                                                <span
                                                    className={`badge ${globalTaxMode === 'with-tax' ? 'bg-success' : 'bg-primary'} badge-sm`}
                                                >
                                                    {globalTaxMode === 'with-tax' ? 'With Tax' : 'Without Tax'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className={`fw-bold h4 mb-3 text-center`}
                                        style={{
                                            color: hasValidItems ? customStyles.quotationColor : '#6c757d'
                                        }}
                                    >
                                        ₹{itemsTableLogic.formatCurrency(finalTotalWithRoundOff)}
                                    </div>

                                    {hasValidItems && gstEnabled && totals.totalTax > 0 && (
                                        <div className="small text-center">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="text-muted">Base Amount:</span>
                                                <span>₹{itemsTableLogic.formatCurrency(totals.subtotal || 0)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="text-muted">GST:</span>
                                                <span style={{ color: customStyles.quotationColor }}>
                                                    ₹{itemsTableLogic.formatCurrency(totals.totalTax || 0)}
                                                </span>
                                            </div>
                                            <hr className="my-2" />
                                            <div className="d-flex justify-content-between">
                                                <span className="fw-bold">Total:</span>
                                                <span className="fw-bold text-success">
                                                    ₹{itemsTableLogic.formatCurrency(totals.finalTotal || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Round-off section */}
                                    {hasValidItems && (
                                        <div className="border-top pt-3 mt-3">
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
                                                    disabled={isDisabled}
                                                    style={{ opacity: isDisabled ? 0.7 : 1 }}
                                                />
                                            </div>

                                            {roundOffEnabled && roundOffDisplayInfo.showRoundOffBreakdown && (
                                                <div className="mt-2 p-2 bg-warning bg-opacity-10 rounded">
                                                    <div className="d-flex justify-content-between small">
                                                        <span className="text-muted">Before Round Off:</span>
                                                        <span>₹{itemsTableLogic.formatCurrency(roundOffDisplayInfo.baseTotalAmount)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between small">
                                                        <span className="text-muted">Round Off:</span>
                                                        <span className={`fw-bold ${roundOffDisplayInfo.roundOffColorClass}`}>
                                                            {roundOffDisplayInfo.roundOffLabel}₹{itemsTableLogic.formatCurrency(Math.abs(roundOffDisplayInfo.roundOffAmount))}
                                                        </span>
                                                    </div>
                                                    <hr className="my-1" />
                                                    <div className="d-flex justify-content-between small fw-bold">
                                                        <span>Final Total:</span>
                                                        <span>₹{itemsTableLogic.formatCurrency(roundOffDisplayInfo.finalTotalAmount)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="small text-muted text-center mt-3">
                                        {!hasValidItems ? (
                                            <small className="text-muted">Add products to see total</small>
                                        ) : (
                                            <div style={{ color: customStyles.quotationColor }}>
                                                <small>
                                                    {gstEnabled
                                                        ? `Base: ₹${itemsTableLogic.formatCurrency(totals.subtotal)} + GST: ₹${itemsTableLogic.formatCurrency(totals.totalTax)}`
                                                        : `Total: ₹${itemsTableLogic.formatCurrency(totals.finalTotal)}`
                                                    }
                                                </small>
                                            </div>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Action Buttons */}
                        <Col md={4}>
                            <div className="d-grid gap-2">
                                <Button
                                    variant="outline-info"
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-semibold border-2"
                                    onClick={onShare}
                                    disabled={!hasValidItems || finalTotalWithRoundOff <= 0 || isDisabled}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        opacity: (!hasValidItems || finalTotalWithRoundOff <= 0 || isDisabled) ? 0.7 : 1
                                    }}
                                >
                                    <span>{documentLabels.shareAction || 'Share'}</span>
                                    <FontAwesomeIcon icon={faDownload} />
                                </Button>

                                <Button
                                    variant="success"
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-bold border-0 shadow"
                                    onClick={handleSaveQuotation}
                                    disabled={!hasValidItems || isDisabled}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        opacity: (!hasValidItems || isDisabled) ? 0.7 : 1
                                    }}
                                >
                                    {saving ? (
                                        <>
                                            <Spinner animation="border" size="sm" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faSave} />
                                            <span>{documentLabels.saveAction || 'Save Quotation'}</span>
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="outline-secondary"
                                    size="lg"
                                    className="d-flex align-items-center justify-content-center gap-2 fw-semibold border-2"
                                    onClick={onCancel}
                                    disabled={saving}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        opacity: saving ? 0.7 : 1
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
        </div>
    );
};

export default QuotationItemsTable;