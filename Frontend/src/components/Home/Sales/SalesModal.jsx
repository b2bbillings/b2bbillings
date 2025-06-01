import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Card, ListGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faFileInvoice,
    faUserPlus,
    faUser,
    faToggleOn,
    faToggleOff,
    faRocket,
    faPlus
} from '@fortawesome/free-solid-svg-icons';
import ItemsTable from './ItemsTable';

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
    // Local state for party search
    const [partySearchQuery, setPartySearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredParties, setFilteredParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null);

    // Refs
    const partyInputRef = useRef(null);

    // Calculate invoice totals based on items
    const calculateInvoiceSummary = () => {
        if (!formData.items || formData.items.length === 0) {
            return {
                subtotal: 0,
                totalGST: 0,
                totalAfterDiscount: 0,
                finalTotal: 0
            };
        }

        let subtotal = 0;
        let totalGST = 0;

        formData.items.forEach(item => {
            const quantity = parseFloat(item.quantity || 0);
            const price = parseFloat(item.price || 0);
            const gstRate = parseFloat(item.gstRate || 0);
            const itemTotal = quantity * price;

            if (formData.invoiceType === 'gst' && gstRate > 0) {
                const isItemTaxInclusive = item.taxInclusive !== undefined ? item.taxInclusive : false;

                if (isItemTaxInclusive) {
                    // Tax inclusive: extract GST from total
                    const baseAmount = itemTotal / (1 + gstRate / 100);
                    const gstAmount = itemTotal - baseAmount;
                    subtotal += baseAmount;
                    totalGST += gstAmount;
                } else {
                    // Tax exclusive: add GST to base amount
                    const gstAmount = (itemTotal * gstRate) / 100;
                    subtotal += itemTotal;
                    totalGST += gstAmount;
                }
            } else {
                // Non-GST or no GST rate
                subtotal += itemTotal;
            }
        });

        // Apply discount
        const discountRate = parseFloat(formData.discount || 0);
        const discountAmount = (subtotal * discountRate) / 100;
        const totalAfterDiscount = subtotal - discountAmount;

        // Final total includes GST (for tax exclusive) or is same as discounted total (for tax inclusive)
        const finalTotal = totalAfterDiscount + totalGST;

        return {
            subtotal: subtotal.toFixed(2),
            totalGST: totalGST.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            totalAfterDiscount: totalAfterDiscount.toFixed(2),
            finalTotal: finalTotal.toFixed(2)
        };
    };

    // Get calculated summary
    const invoiceSummary = calculateInvoiceSummary();

    // Update formData totals when items or discount changes
    useEffect(() => {
        const summary = calculateInvoiceSummary();

        // Update parent component's formData with calculated totals
        if (parseFloat(formData.subtotal || 0) !== parseFloat(summary.subtotal) ||
            parseFloat(formData.total || 0) !== parseFloat(summary.finalTotal)) {

            // Use setTimeout to avoid direct state mutation during render
            setTimeout(() => {
                onInputChange({
                    target: { name: 'subtotal', value: summary.subtotal }
                });
                onInputChange({
                    target: { name: 'total', value: summary.finalTotal }
                });
                onInputChange({
                    target: { name: 'gstAmount', value: summary.totalGST }
                });
            }, 0);
        }
    }, [formData.items, formData.discount, formData.invoiceType]);

    // Initialize when modal opens
    useEffect(() => {
        if (show) {
            console.log('🎬 SalesModal opened');

            if (editingSale && formData.selectedParty) {
                const party = parties.find(p => p.id.toString() === formData.selectedParty);
                if (party && (!selectedParty || selectedParty.id !== party.id)) {
                    console.log('📝 Setting party for editing:', party);
                    setPartySearchQuery(party.name);
                    setSelectedParty(party);
                }
            } else if (!editingSale) {
                console.log('📝 Resetting for new invoice');
                setPartySearchQuery('');
                setSelectedParty(null);
                setShowSuggestions(false);
            }
        }
    }, [show, editingSale]);

    // Filter parties when search query changes
    useEffect(() => {
        if (partySearchQuery.trim() && !selectedParty) {
            const filtered = parties
                .filter(party => {
                    const searchTerm = partySearchQuery.toLowerCase();
                    return (
                        party.name.toLowerCase().includes(searchTerm) ||
                        (party.phone && party.phone.toLowerCase().includes(searchTerm)) ||
                        (party.email && party.email.toLowerCase().includes(searchTerm))
                    );
                })
                .slice(0, 5);

            setFilteredParties(filtered);
            setShowSuggestions(true);
        } else {
            setFilteredParties([]);
            setShowSuggestions(false);
        }
    }, [partySearchQuery, parties, selectedParty]);

    // Handle party search input change
    const handlePartySearchChange = (e) => {
        const value = e.target.value;
        console.log('📝 Party search changed:', value);

        setPartySearchQuery(value);

        if (selectedParty && value.trim() !== selectedParty.name.trim()) {
            console.log('📝 Clearing selected party as name changed');
            setSelectedParty(null);

            onPartySelection({
                target: {
                    name: 'selectedParty',
                    value: ''
                }
            });
        }

        if (value.trim() && !selectedParty) {
            setShowSuggestions(true);
        } else if (!value.trim()) {
            setShowSuggestions(false);
        }
    };

    // Select party from suggestions
    const handlePartySelect = (party, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('🎯 Party selected:', party);

        setPartySearchQuery(party.name);
        setSelectedParty(party);
        setShowSuggestions(false);

        setTimeout(() => {
            onPartySelection({
                target: {
                    name: 'selectedParty',
                    value: party.id.toString(),
                    selectedPartyData: party
                }
            });
        }, 0);
    };

    // Handle input focus
    const handleInputFocus = () => {
        if (partySearchQuery.trim() && !selectedParty) {
            console.log('📝 Input focused, showing suggestions');
            setShowSuggestions(true);
        }
    };

    // Handle invoice type toggle
    const handleInvoiceTypeToggle = () => {
        const newType = formData.invoiceType === 'gst' ? 'non-gst' : 'gst';
        onInputChange({
            target: {
                name: 'invoiceType',
                value: newType
            }
        });
    };

    // Handle Add as Permanent Party
    const handleAddPermanentParty = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('🎯 Add as Permanent Party clicked');
        setShowSuggestions(false);

        if (typeof onShowAddPartyModal === 'function') {
            onShowAddPartyModal(partySearchQuery.trim());
        } else {
            console.error('❌ onShowAddPartyModal is not a function');
            alert('Add party function not available');
        }
    };

    // Handle discount change
    const handleDiscountChange = (e) => {
        const discountValue = parseFloat(e.target.value) || 0;

        // Ensure discount is within valid range
        if (discountValue >= 0 && discountValue <= 100) {
            onInputChange({
                target: {
                    name: 'discount',
                    value: discountValue
                }
            });
        }
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('📝 Form submitted');

        // Basic validation
        if (!formData.invoiceDate) {
            alert('Please select invoice date');
            return;
        }

        if (!selectedParty && !partySearchQuery.trim()) {
            alert('Please select or enter a party name');
            return;
        }

        if (!formData.items || formData.items.length === 0) {
            alert('Please add at least one item');
            return;
        }

        // Validate items have required data
        const invalidItems = formData.items.filter(item =>
            !item.productService || !item.quantity || !item.price
        );

        if (invalidItems.length > 0) {
            alert('Please fill in all item details (product, quantity, and price)');
            return;
        }

        onSaveInvoice(e);
    };

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (partyInputRef.current && !partyInputRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                    {editingSale ? 'Edit Invoice' : 'Create New Invoice'}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Row className="mb-4">
                        {/* Left Column - Party Details */}
                        <Col md={6}>
                            {/* Invoice Type Toggle */}
                            <div className="mb-3">
                                <Form.Label className="fw-semibold">Invoice Type</Form.Label>
                                <div>
                                    <Button
                                        variant="outline-primary"
                                        onClick={handleInvoiceTypeToggle}
                                        className="d-flex align-items-center gap-2"
                                        type="button"
                                    >
                                        <FontAwesomeIcon
                                            icon={formData.invoiceType === 'gst' ? faToggleOn : faToggleOff}
                                            className={formData.invoiceType === 'gst' ? 'text-success' : 'text-muted'}
                                        />
                                        {formData.invoiceType === 'gst' ? 'GST Invoice' : 'Non-GST Invoice'}
                                    </Button>
                                </div>
                            </div>

                            {/* Party Name */}
                            <div className="mb-3 position-relative" ref={partyInputRef}>
                                <Form.Label className="fw-semibold">
                                    Party Name <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={partySearchQuery}
                                    onChange={handlePartySearchChange}
                                    onFocus={handleInputFocus}
                                    placeholder="Type party name to search..."
                                    autoComplete="off"
                                />

                                {/* Party Suggestions Dropdown */}
                                {showSuggestions && (
                                    <div
                                        className="position-absolute w-100 mt-1"
                                        style={{ zIndex: 1070 }}
                                    >
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
                                                                    onClick={(e) => handlePartySelect(party, e)}
                                                                    className="cursor-pointer"
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <div className="d-flex align-items-center">
                                                                        <FontAwesomeIcon
                                                                            icon={faUser}
                                                                            className="text-muted me-3"
                                                                        />
                                                                        <div>
                                                                            <div className="fw-semibold">{party.name}</div>
                                                                            <small className="text-muted">
                                                                                {party.phone || 'No phone'}
                                                                                {party.email && ` • ${party.email}`}
                                                                            </small>
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
                                                        <div className="p-4 text-center">
                                                            <FontAwesomeIcon icon={faUser} size="3x" className="text-muted mb-3" />
                                                            <div className="mb-2">
                                                                <strong>"{partySearchQuery}"</strong> - New Party
                                                            </div>
                                                            <small className="text-muted d-block mb-4">
                                                                This party doesn't exist in your database
                                                            </small>

                                                            <div className="d-grid">
                                                                <Button
                                                                    variant="primary"
                                                                    onClick={handleAddPermanentParty}
                                                                    type="button"
                                                                >
                                                                    <FontAwesomeIcon icon={faUserPlus} className="me-2" />
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
                                        <Badge bg="success" className="p-2">
                                            <FontAwesomeIcon icon={faUser} className="me-2" />
                                            ✓ {selectedParty.name} selected
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </Col>

                        {/* Right Column - Invoice Details */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Invoice Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="invoiceNumber"
                                    value={formData.invoiceNumber}
                                    onChange={onInputChange}
                                    placeholder="Auto-generated"
                                    readOnly
                                    className="bg-light"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Invoice Date <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    name="invoiceDate"
                                    value={formData.invoiceDate}
                                    onChange={onInputChange}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Items Section */}
                    <div className="mb-4">
                        <h6 className="fw-bold mb-3">Items</h6>
                        <ItemsTable
                            items={formData.items}
                            onItemChange={onItemChange}
                            onAddItem={onAddItem}
                            onRemoveItem={onRemoveItem}
                            invoiceType={formData.invoiceType}
                        />
                    </div>

                    {/* Notes and Summary */}
                    <Row>
                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label>Notes</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="notes"
                                    value={formData.notes || ''}
                                    onChange={onInputChange}
                                    placeholder="Any additional notes..."
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            {/* Enhanced Summary Card */}
                            <Card className="bg-light border">
                                <Card.Body>
                                    <h6 className="fw-bold mb-3 text-primary">
                                        <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                                        Invoice Summary
                                    </h6>

                                    {/* Subtotal */}
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Subtotal:</span>
                                        <span className="fw-semibold">₹{invoiceSummary.subtotal}</span>
                                    </div>

                                    {/* GST Amount - Only show for GST invoices */}
                                    {formData.invoiceType === 'gst' && parseFloat(invoiceSummary.totalGST) > 0 && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-success">
                                                <small>GST Amount:</small>
                                            </span>
                                            <span className="fw-semibold text-success">₹{invoiceSummary.totalGST}</span>
                                        </div>
                                    )}

                                    {/* Discount */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span>Discount:</span>
                                        <div className="d-flex align-items-center gap-1">
                                            <Form.Control
                                                type="number"
                                                name="discount"
                                                value={formData.discount || 0}
                                                onChange={handleDiscountChange}
                                                style={{ width: '60px' }}
                                                className="text-center"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                size="sm"
                                            />
                                            <span className="text-muted">%</span>
                                            {parseFloat(invoiceSummary.discountAmount) > 0 && (
                                                <small className="text-danger ms-1">
                                                    (-₹{invoiceSummary.discountAmount})
                                                </small>
                                            )}
                                        </div>
                                    </div>

                                    <hr className="my-2" />

                                    {/* Final Total */}
                                    <div className="d-flex justify-content-between fw-bold fs-5">
                                        <span>Total:</span>
                                        <span className="text-primary">₹{invoiceSummary.finalTotal}</span>
                                    </div>

                                    {/* Summary Statistics */}
                                    <hr className="my-2" />
                                    <div className="text-center">
                                        <small className="text-muted">
                                            {formData.items?.length || 0} item{(formData.items?.length || 0) !== 1 ? 's' : ''}
                                            {formData.invoiceType === 'gst' && (
                                                <span className="d-block">
                                                    {formData.invoiceType.toUpperCase()} Invoice
                                                </span>
                                            )}
                                        </small>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Action Buttons */}
                    <div className="d-flex gap-3 justify-content-end mt-4">
                        <Button variant="outline-secondary" onClick={onHide} type="button">
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                            {editingSale ? 'Update Invoice' : 'Create Invoice'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

export default SalesModal;