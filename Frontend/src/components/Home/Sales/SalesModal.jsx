import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Card, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faFileInvoice, faUserPlus, faUser, faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';
import ItemsTable from './ItemsTable';
import PaymentModal from './PaymentModal';

function SalesModal({
    show,
    onHide,
    editingSale,
    formData,
    parties,
    onInputChange,
    onPartySelection,
    onItemChange,
    onAddItem,
    onRemoveItem,
    onSaveInvoice,
    onShowAddPartyModal
}) {
    // Local state for party autocomplete
    const [partySearchQuery, setPartySearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredParties, setFilteredParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Payment modal states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [createdInvoiceData, setCreatedInvoiceData] = useState(null);

    const inputRef = useRef(null);

    // Generate invoice number based on type
    const generateInvoiceNumber = (invoiceType) => {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);

        if (invoiceType === 'gst') {
            return `GST-${year}${month}${day}-${random}`;
        } else {
            return `INV-${year}${month}${day}-${random}`;
        }
    };

    // Handle invoice type toggle
    const handleInvoiceTypeToggle = () => {
        const newType = formData.invoiceType === 'gst' ? 'non-gst' : 'gst';
        const newInvoiceNumber = generateInvoiceNumber(newType);

        onInputChange({
            target: {
                name: 'invoiceType',
                value: newType
            }
        });

        onInputChange({
            target: {
                name: 'invoiceNumber',
                value: newInvoiceNumber
            }
        });
    };

    // Debug log
    useEffect(() => {
        console.log('📊 SalesModal state:', {
            partySearchQuery,
            selectedParty,
            showSuggestions,
            filteredPartiesCount: filteredParties.length,
            totalParties: parties.length,
            isInitialized,
            editingSale
        });
    }, [partySearchQuery, selectedParty, showSuggestions, filteredParties, parties, isInitialized, editingSale]);

    // Initialize only once when modal opens
    useEffect(() => {
        if (show && !isInitialized) {
            console.log('🎬 Initializing modal for:', editingSale ? 'edit' : 'new');

            if (editingSale && formData.selectedParty) {
                const party = parties.find(p => p.id.toString() === formData.selectedParty);
                if (party) {
                    console.log('🔄 Setting party from edit mode:', party);
                    setPartySearchQuery(party.name);
                    setSelectedParty(party);
                }
            } else {
                // Reset for new invoice
                console.log('🆕 Resetting for new invoice');
                setPartySearchQuery('');
                setSelectedParty(null);
                setShowSuggestions(false);
            }
            setIsInitialized(true);
        } else if (!show) {
            // Reset initialization when modal closes
            setIsInitialized(false);
        }
    }, [show, editingSale, formData.selectedParty, parties, isInitialized]);

    // Filter parties based on search query
    useEffect(() => {
        if (!isInitialized) return; // Don't filter until initialized

        console.log('🔍 Filtering parties with query:', partySearchQuery);

        if (partySearchQuery.trim() && !selectedParty) {
            const filtered = parties
                .filter(party => {
                    // Check if party has partyType and filter by customer
                    const isCustomer = !party.partyType || party.partyType === 'customer';

                    if (!isCustomer) return false;

                    const searchTerm = partySearchQuery.toLowerCase();
                    return (
                        party.name.toLowerCase().includes(searchTerm) ||
                        (party.phone && party.phone.toLowerCase().includes(searchTerm)) ||
                        (party.whatsappNumber && party.whatsappNumber.toLowerCase().includes(searchTerm)) ||
                        (party.email && party.email.toLowerCase().includes(searchTerm))
                    );
                })
                .slice(0, 5); // Limit to 5 suggestions

            console.log('✅ Filtered parties:', filtered);
            setFilteredParties(filtered);
            setShowSuggestions(filtered.length > 0 || partySearchQuery.trim().length > 0);
        } else {
            setFilteredParties([]);
            setShowSuggestions(false);
        }
    }, [partySearchQuery, parties, selectedParty, isInitialized]);

    // Calculate summary values
    const calculateSummaryValues = () => {
        let subtotal = 0;
        let totalGstAmount = 0;

        // Calculate from items array
        if (formData.items && formData.items.length > 0) {
            formData.items.forEach(item => {
                if (item.productService && item.quantity && item.price) {
                    const quantity = parseFloat(item.quantity) || 0;
                    const price = parseFloat(item.price) || 0;
                    const gstRate = parseFloat(item.gstRate) || 0;

                    const itemTotal = quantity * price;

                    // For subtotal calculation
                    if (formData.invoiceType === 'gst' && gstRate > 0 && item.taxInclusive) {
                        // If tax inclusive, extract the base amount (without GST)
                        const baseAmount = itemTotal / (1 + gstRate / 100);
                        subtotal += baseAmount;

                        // GST amount is the difference
                        totalGstAmount += (itemTotal - baseAmount);
                    } else {
                        // If tax exclusive or non-GST invoice
                        subtotal += itemTotal;

                        // Calculate GST on top for exclusive items
                        if (formData.invoiceType === 'gst' && gstRate > 0 && !item.taxInclusive) {
                            totalGstAmount += (itemTotal * gstRate) / 100;
                        }
                    }
                }
            });
        }

        const discountPercent = parseFloat(formData.discount) || 0;
        const discountAmount = (subtotal * discountPercent) / 100;
        const subtotalAfterDiscount = subtotal - discountAmount;

        // For GST invoices, calculate GST on discounted amount
        let finalGstAmount = 0;
        if (formData.invoiceType === 'gst' && totalGstAmount > 0) {
            finalGstAmount = totalGstAmount - (totalGstAmount * discountPercent) / 100;
        }

        const finalTotal = subtotalAfterDiscount + finalGstAmount;

        return {
            subtotal,
            gstAmount: finalGstAmount,
            discountPercent,
            discountAmount,
            subtotalAfterDiscount,
            finalTotal
        };
    };

    // Form validation
    const isFormValid = () => {
        if (!formData.invoiceDate || formData.invoiceDate.trim() === '') return false;
        if (!formData.invoiceType || formData.invoiceType === '') return false;
        if (!selectedParty && (!partySearchQuery || partySearchQuery.trim() === '')) return false;
        if (!formData.items || formData.items.length === 0) return false;

        const validItems = formData.items.filter(item =>
            item.productService && item.productService.trim() !== ''
        );

        return validItems.length > 0;
    };

    // Handle party search input
    const handlePartySearchChange = (e) => {
        const value = e.target.value;
        console.log('📝 Party search input changed:', value);

        setPartySearchQuery(value);

        if (selectedParty && value !== selectedParty.name) {
            setSelectedParty(null);
            onPartySelection({ target: { value: '' } });
        }
    };

    // Select party from suggestions
    const selectParty = (party) => {
        console.log('🎯 Selecting party:', party);

        setPartySearchQuery(party.name);
        setSelectedParty(party);
        setShowSuggestions(false);

        onPartySelection({
            target: {
                value: party.id.toString(),
                selectedPartyData: party
            }
        });

        console.log('✅ Party selected successfully');
    };

    // Handle input focus
    const handleInputFocus = () => {
        console.log('🎯 Input focused, query:', partySearchQuery, 'selectedParty:', selectedParty);
        if (partySearchQuery && !selectedParty) {
            setShowSuggestions(true);
        }
    };

    // Handle clicking outside to close suggestions
    const handleClickOutside = (e) => {
        if (inputRef.current && !inputRef.current.contains(e.target)) {
            console.log('👆 Clicked outside, closing suggestions');
            setShowSuggestions(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Enhanced form submission handler
    const handleFormSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('📝 Form submitted explicitly by Create Invoice button, validating...', formData);

        if (!isFormValid()) {
            console.log('❌ Form validation failed');
            alert('Please fill in all required fields:\n- Invoice Date\n- Invoice Type\n- Party Name\n- At least one item with product/service name');
            return;
        }

        console.log('✅ Form validation passed, calling onSaveInvoice');

        if (!selectedParty && partySearchQuery.trim()) {
            onPartySelection({
                target: {
                    value: 'walk-in',
                    selectedPartyData: {
                        name: partySearchQuery.trim(),
                        phone: '',
                        email: '',
                        address: ''
                    }
                }
            });
        }

        onSaveInvoice(e);
    };

    // Prevent form submission from other events
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.target.type !== 'submit') {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    // Enhanced Create Invoice button handler
    const handleCreateInvoiceClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('🎯 Create Invoice button clicked explicitly');

        if (!isFormValid()) {
            console.log('❌ Form validation failed');
            alert('Please fill in all required fields:\n- Invoice Date\n- Invoice Type\n- Party Name\n- At least one item with product/service name');
            return;
        }

        console.log('✅ Form validation passed, creating invoice and opening payment modal');

        if (!selectedParty && partySearchQuery.trim()) {
            onPartySelection({
                target: {
                    value: 'walk-in',
                    selectedPartyData: {
                        name: partySearchQuery.trim(),
                        phone: '',
                        email: '',
                        address: ''
                    }
                }
            });
        }

        const summaryValues = calculateSummaryValues();
        const invoiceData = {
            id: Date.now(),
            invoiceNumber: formData.invoiceNumber,
            invoiceDate: formData.invoiceDate,
            partyName: selectedParty ? selectedParty.name : partySearchQuery.trim(),
            partyPhone: selectedParty ? (selectedParty.phone || selectedParty.whatsappNumber) : '',
            partyEmail: selectedParty ? selectedParty.email : '',
            items: formData.items,
            subtotal: summaryValues.subtotal,
            gstAmount: summaryValues.gstAmount,
            discountAmount: summaryValues.discountAmount,
            finalTotal: summaryValues.finalTotal,
            invoiceType: formData.invoiceType,
            notes: formData.notes,
            payments: []
        };

        onSaveInvoice(e);
        setCreatedInvoiceData(invoiceData);
        setShowPaymentModal(true);
        onHide();
    };

    // Handle payment save
    const handleSavePayment = (paymentData) => {
        console.log('💰 Saving payment data:', paymentData);
        alert('Payment data saved successfully!');
        setShowPaymentModal(false);
        setCreatedInvoiceData(null);
    };

    // Handle reminder setup
    const handleSetReminder = (reminderData) => {
        console.log('🔔 Setting reminder:', reminderData);
        alert(`Reminder set for ${new Date(reminderData.reminderDate).toLocaleDateString()} at ${reminderData.reminderTime}`);
    };

    // Get calculated values
    const summaryValues = calculateSummaryValues();

    return (
        <>
            <Modal show={show} onHide={onHide} size="xl" centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingSale ? 'Edit Invoice' : 'Create New Invoice'}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body className="px-4 pb-4">
                    <Form onSubmit={handleFormSubmit} onKeyDown={handleKeyDown} autoComplete="off">
                        {/* New Layout: GST Toggle and Invoice Details */}
                        <Row className="mb-4">
                            {/* Left Side: GST Toggle and Bill To */}
                            <Col md={6}>
                                {/* GST/Non-GST Toggle */}
                                <div className="mb-4">
                                    <Form.Label className="fw-semibold d-block mb-2">Invoice Type</Form.Label>
                                    <div className="d-flex align-items-center gap-3">
                                        <Button
                                            variant={formData.invoiceType === 'non-gst' ? 'outline-secondary' : 'outline-primary'}
                                            className="d-flex align-items-center gap-2"
                                            onClick={handleInvoiceTypeToggle}
                                            type="button"
                                        >
                                            <FontAwesomeIcon
                                                icon={formData.invoiceType === 'gst' ? faToggleOn : faToggleOff}
                                                size="lg"
                                                className={formData.invoiceType === 'gst' ? 'text-success' : 'text-muted'}
                                            />
                                            {formData.invoiceType === 'gst' ? 'GST Invoice' : 'Non-GST Invoice'}
                                        </Button>
                                        {formData.invoiceType === 'gst' && (
                                            <small className="text-success fw-semibold">
                                                ✓ Tax calculations enabled
                                            </small>
                                        )}
                                    </div>
                                </div>

                                {/* Bill To Section */}
                                <div className="mb-3">
                                    <h6 className="fw-bold text-primary mb-3">Bill To</h6>
                                    <Form.Group className="position-relative" ref={inputRef}>
                                        <Form.Label className="fw-semibold">
                                            Party Name <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={partySearchQuery}
                                            onChange={handlePartySearchChange}
                                            onFocus={handleInputFocus}
                                            placeholder="Type party name to search existing parties..."
                                            className="form-input"
                                            autoComplete="off"
                                        />

                                        {/* Party Suggestions Dropdown */}
                                        {showSuggestions && (
                                            <div className="position-absolute w-100 mt-1" style={{ zIndex: 1070 }}>
                                                <Card className="border shadow-lg">
                                                    <Card.Body className="p-0">
                                                        {filteredParties.length > 0 ? (
                                                            <>
                                                                <div className="px-3 py-2 bg-light border-bottom">
                                                                    <small className="text-muted fw-semibold">Existing Parties</small>
                                                                </div>
                                                                <ListGroup variant="flush">
                                                                    {filteredParties.map((party) => (
                                                                        <ListGroup.Item
                                                                            key={party.id}
                                                                            action
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                console.log('🖱️ Party clicked:', party);
                                                                                selectParty(party);
                                                                            }}
                                                                            className="d-flex align-items-center py-2 cursor-pointer"
                                                                            style={{ cursor: 'pointer' }}
                                                                        >
                                                                            <FontAwesomeIcon
                                                                                icon={faUser}
                                                                                className="text-muted me-3"
                                                                            />
                                                                            <div className="flex-grow-1">
                                                                                <div className="fw-semibold">{party.name}</div>
                                                                                <div className="small text-muted">
                                                                                    {party.phone || party.whatsappNumber || 'No phone'}
                                                                                    {party.email && ` • ${party.email}`}
                                                                                    {party.city && ` • ${party.city}`}
                                                                                </div>
                                                                            </div>
                                                                        </ListGroup.Item>
                                                                    ))}
                                                                </ListGroup>
                                                            </>
                                                        ) : partySearchQuery.trim() && (
                                                            <>
                                                                <div className="px-3 py-2 bg-light border-bottom">
                                                                    <small className="text-muted">No existing party found</small>
                                                                </div>
                                                                <div className="p-3 text-center">
                                                                    <div className="mb-2">
                                                                        <FontAwesomeIcon icon={faUser} size="2x" className="text-muted" />
                                                                    </div>
                                                                    <div className="mb-2">
                                                                        <strong>"{partySearchQuery}"</strong> - New Party
                                                                    </div>
                                                                    <small className="text-muted">
                                                                        This will be saved as a walk-in party
                                                                    </small>
                                                                    <div className="mt-3">
                                                                        <Button
                                                                            variant="outline-primary"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setShowSuggestions(false);
                                                                                onShowAddPartyModal();
                                                                            }}
                                                                            type="button"
                                                                        >
                                                                            <FontAwesomeIcon icon={faUserPlus} className="me-1" />
                                                                            Add as Permanent Party
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </Card.Body>
                                                </Card>
                                            </div>
                                        )}

                                        {/* Selected Party Display */}
                                        {selectedParty && (
                                            <div className="mt-2">
                                                <div className="d-flex align-items-center p-2 bg-success bg-opacity-10 border border-success border-opacity-25 rounded">
                                                    <FontAwesomeIcon icon={faUser} className="text-success me-2" />
                                                    <div className="flex-grow-1">
                                                        <div className="fw-semibold text-success">
                                                            ✓ {selectedParty.name}
                                                        </div>
                                                        <small className="text-muted">
                                                            {selectedParty.phone || selectedParty.whatsappNumber || 'No phone'}
                                                            {selectedParty.email && ` • ${selectedParty.email}`}
                                                        </small>
                                                    </div>
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setSelectedParty(null);
                                                            setPartySearchQuery('');
                                                            onPartySelection({ target: { value: '' } });
                                                        }}
                                                        type="button"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes} />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Form.Group>
                                </div>
                            </Col>

                            {/* Right Side: Invoice Number and Date */}
                            <Col md={6}>
                                <div className="d-flex flex-column h-100 justify-content-start">
                                    {/* Change from Row to vertical stacking */}
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Invoice Number</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="invoiceNumber"
                                            value={formData.invoiceNumber}
                                            onChange={onInputChange}
                                            placeholder="Auto-generated"
                                            readOnly
                                            className="bg-light"
                                        />
                                        <Form.Text className="text-muted">
                                            {formData.invoiceType === 'gst' ? 'GST Invoice Format' : 'Standard Invoice Format'}
                                        </Form.Text>
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">
                                            Invoice Date <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="date"
                                            name="invoiceDate"
                                            value={formData.invoiceDate}
                                            onChange={onInputChange}
                                            className="form-input"
                                            required
                                        />
                                    </Form.Group>
                                </div>
                            </Col>
                        </Row>

                        {/* Items Section */}
                        <div className="mb-4" style={{ position: 'relative', zIndex: 1 }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="fw-bold mb-0">Items</h6>
                            </div>
                            <ItemsTable
                                items={formData.items}
                                onItemChange={onItemChange}
                                onAddItem={onAddItem}
                                onRemoveItem={onRemoveItem}
                                invoiceType={formData.invoiceType}
                            />
                        </div>

                        {/* Totals and Notes */}
                        <Row>
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">Notes</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        name="notes"
                                        value={formData.notes || ''}
                                        onChange={onInputChange}
                                        placeholder="Any additional notes for this invoice..."
                                        className="form-input"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Card className="bg-light border-0 shadow-sm">
                                    <Card.Body>
                                        <h6 className="fw-bold mb-3 text-center">Invoice Summary</h6>

                                        {/* Subtotal */}
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>
                                                {formData.invoiceType === 'gst' ? 'Base Amount:' : 'Subtotal:'}
                                                {formData.invoiceType === 'gst' && (
                                                    <small className="text-muted d-block">
                                                        (Tax {formData.items?.some(item => item.taxInclusive) ? 'Exclusive' : 'Exclusive'} base)
                                                    </small>
                                                )}
                                            </span>
                                            <span>₹{summaryValues.subtotal.toFixed(2)}</span>
                                        </div>

                                        {/* Discount */}
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Discount:</span>
                                            <div className="d-flex align-items-center">
                                                <Form.Control
                                                    type="number"
                                                    name="discount"
                                                    value={formData.discount || 0}
                                                    onChange={onInputChange}
                                                    style={{ width: '70px' }}
                                                    className="form-input me-2"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                />
                                                <span>%</span>
                                            </div>
                                        </div>

                                        {summaryValues.discountPercent > 0 && (
                                            <div className="d-flex justify-content-between mb-2 text-danger">
                                                <span>Discount Amount:</span>
                                                <span>-₹{summaryValues.discountAmount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {summaryValues.discountPercent > 0 && (
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>After Discount:</span>
                                                <span>₹{summaryValues.subtotalAfterDiscount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {/* GST */}
                                        {formData.invoiceType === 'gst' && summaryValues.gstAmount > 0 && (
                                            <div className="d-flex justify-content-between mb-2 text-info">
                                                <span>
                                                    GST Amount:
                                                    <small className="text-muted d-block">
                                                        (Calculated per item rates)
                                                    </small>
                                                </span>
                                                <span>₹{summaryValues.gstAmount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        <hr className="my-3" />

                                        {/* Final Total */}
                                        <div className="d-flex justify-content-between fw-bold mb-3">
                                            <span className="text-lg">Total Amount:</span>
                                            <span className="text-primary text-lg">₹{summaryValues.finalTotal.toFixed(2)}</span>
                                        </div>

                                        {/* Invoice Type Info
                                        {formData.invoiceType && (
                                            <div className="text-center">
                                                <div className="mb-2">
                                                    <small className="text-muted fw-semibold">
                                                        {formData.invoiceType === 'gst' ? 'GST Invoice' : 'Non-GST Invoice'}
                                                    </small>
                                                </div>

                                                <div className="small text-muted">
                                                    {formData.invoiceType === 'gst' ? (
                                                        <>
                                                            {formData.items?.some(item => item.taxInclusive) && (
                                                                <div>• Some items have tax inclusive pricing</div>
                                                            )}
                                                            {formData.items?.some(item => !item.taxInclusive) && (
                                                                <div>• Some items have tax exclusive pricing</div>
                                                            )}
                                                            <div>• GST calculated per item</div>
                                                            {summaryValues.discountPercent > 0 && (
                                                                <div>• Discount applied to base amounts</div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div>• Simple invoice without GST</div>
                                                            {summaryValues.discountPercent > 0 && (
                                                                <div>• Discount applied on subtotal</div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )} */}

                                        {/* Tax Summary for GST Invoices */}
                                        {formData.invoiceType === 'gst' && formData.items?.length > 0 && (
                                            <>
                                                <hr className="my-2" />
                                                <div className="small text-muted">
                                                    <div className="fw-semibold mb-1">Tax Breakdown:</div>
                                                    {formData.items
                                                        .filter(item => item.productService && item.gstRate > 0)
                                                        .reduce((acc, item) => {
                                                            const rate = item.gstRate;
                                                            const existing = acc.find(g => g.rate === rate);
                                                            const quantity = parseFloat(item.quantity) || 0;
                                                            const price = parseFloat(item.price) || 0;
                                                            const itemTotal = quantity * price;

                                                            let gstAmount = 0;
                                                            if (item.taxInclusive) {
                                                                gstAmount = itemTotal - (itemTotal / (1 + rate / 100));
                                                            } else {
                                                                gstAmount = (itemTotal * rate) / 100;
                                                            }

                                                            const discountPercent = parseFloat(formData.discount) || 0;
                                                            gstAmount = gstAmount - (gstAmount * discountPercent) / 100;

                                                            if (existing) {
                                                                existing.amount += gstAmount;
                                                            } else {
                                                                acc.push({ rate, amount: gstAmount });
                                                            }
                                                            return acc;
                                                        }, [])
                                                        .map(gst => (
                                                            <div key={gst.rate} className="d-flex justify-content-between">
                                                                <span>GST {gst.rate}%:</span>
                                                                <span>₹{gst.amount.toFixed(2)}</span>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* Action Buttons */}
                        <div className="d-flex gap-3 justify-content-end mt-4">
                            <Button
                                variant="outline-secondary"
                                onClick={onHide}
                                className="px-4"
                                type="button"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleCreateInvoiceClick}
                                className="px-4"
                                disabled={!isFormValid()}
                                type="button"
                            >
                                <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                                {editingSale ? 'Update Invoice' : 'Create Invoice'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Payment Modal */}
            <PaymentModal
                show={showPaymentModal}
                onHide={() => setShowPaymentModal(false)}
                invoiceData={createdInvoiceData}
                onSavePayment={handleSavePayment}
                onSetReminder={handleSetReminder}
            />
        </>
    );
}

export default SalesModal;