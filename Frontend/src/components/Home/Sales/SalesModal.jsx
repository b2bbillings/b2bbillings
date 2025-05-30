import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Card, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faFileInvoice, faUserPlus, faUser } from '@fortawesome/free-solid-svg-icons';
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
    // Local state for party autocomplete
    const [partySearchQuery, setPartySearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredParties, setFilteredParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const inputRef = useRef(null);

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

    // Calculate invoice summary values
    const calculateSummaryValues = () => {
        const subtotal = formData.subtotal || 0;
        const gstAmount = formData.gstAmount || 0;
        const discountPercent = formData.discount || 0;
        const total = formData.total || 0;

        // Calculate discount amount
        const discountAmount = (subtotal * discountPercent) / 100;

        // For display purposes
        const subtotalAfterDiscount = subtotal - discountAmount;
        const finalTotal = total;

        return {
            subtotal,
            gstAmount,
            discountPercent,
            discountAmount,
            subtotalAfterDiscount,
            finalTotal
        };
    };

    // Form validation
    const isFormValid = () => {
        // 1. Check invoice date (required)
        if (!formData.invoiceDate || formData.invoiceDate.trim() === '') {
            return false;
        }

        // 2. Check invoice type (required)
        if (!formData.invoiceType || formData.invoiceType === '') {
            return false;
        }

        // 3. Check party selection or name
        if (!selectedParty && (!partySearchQuery || partySearchQuery.trim() === '')) {
            return false;
        }

        // 4. Check items (at least one item with product/service name)
        if (!formData.items || formData.items.length === 0) {
            return false;
        }

        const validItems = formData.items.filter(item =>
            item.productService && item.productService.trim() !== ''
        );

        if (validItems.length === 0) {
            return false;
        }

        return true;
    };

    // Handle party search input
    const handlePartySearchChange = (e) => {
        const value = e.target.value;
        console.log('📝 Party search input changed:', value);

        setPartySearchQuery(value);

        // Only clear selected party if we're typing something different
        if (selectedParty && value !== selectedParty.name) {
            setSelectedParty(null);
            // Clear party selection when typing
            onPartySelection({ target: { value: '' } });
        }
    };

    // Select party from suggestions
    const selectParty = (party) => {
        console.log('🎯 Selecting party:', party);

        setPartySearchQuery(party.name);
        setSelectedParty(party);
        setShowSuggestions(false);

        // Update parent component
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

    // Handle form submission
    const handleFormSubmit = (e) => {
        e.preventDefault();

        console.log('📝 Form submitted, validating...', formData);

        if (!isFormValid()) {
            console.log('❌ Form validation failed');
            alert('Please fill in all required fields:\n- Invoice Date\n- Invoice Type\n- Party Name\n- At least one item with product/service name');
            return;
        }

        console.log('✅ Form validation passed, calling onSaveInvoice');

        // If party is not from existing parties, create walk-in party data
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

    // Get calculated values
    const summaryValues = calculateSummaryValues();

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    {editingSale ? 'Edit Invoice' : 'Create New Invoice'}
                </Modal.Title>
                <Button
                    variant="link"
                    className="p-0 border-0 text-muted"
                    onClick={onHide}
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </Button>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                <Form onSubmit={handleFormSubmit}>
                    {/* Invoice Header */}
                    <Row className="mb-4">
                        <Col md={6}>
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
                            </Form.Group>
                        </Col>
                        <Col md={6}>
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
                        </Col>
                    </Row>

                    {/* Party Selection */}
                    <div className="mb-4">
                        <Row className="mb-3">
                            <Col md={8}>
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
                                        <div className="position-absolute w-100 mt-1" style={{ zIndex: 1050 }}>
                                            <Card className="border shadow-sm">
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
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">
                                        Invoice Type <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Select
                                        name="invoiceType"
                                        value={formData.invoiceType}
                                        onChange={onInputChange}
                                        className="form-input"
                                        required
                                    >
                                        <option value="">Select Type</option>
                                        <option value="gst">GST Invoice</option>
                                        <option value="non-gst">Non-GST Invoice</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </div>

                    {/* Items Section - Now using the full ItemsTable with ProductSelector */}
                    <div className="mb-4">
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

                                    {/* Subtotal (Before GST and Discount) */}
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Subtotal:</span>
                                        <span>₹{summaryValues.subtotal.toFixed(2)}</span>
                                    </div>

                                    {/* GST Section (Only for GST Invoices) */}
                                    {formData.invoiceType === 'gst' && summaryValues.gstAmount > 0 && (
                                        <div className="d-flex justify-content-between mb-2 text-info">
                                            <span>GST Amount:</span>
                                            <span>₹{summaryValues.gstAmount.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {/* Subtotal + GST (If GST Invoice) */}
                                    {formData.invoiceType === 'gst' && summaryValues.gstAmount > 0 && (
                                        <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                            <span className="fw-semibold">Subtotal + GST:</span>
                                            <span className="fw-semibold">₹{(summaryValues.subtotal + summaryValues.gstAmount).toFixed(2)}</span>
                                        </div>
                                    )}

                                    {/* Discount Section */}
                                    {summaryValues.discountPercent > 0 && (
                                        <>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>Discount ({summaryValues.discountPercent}%):</span>
                                                <div className="d-flex align-items-center">
                                                    <Form.Control
                                                        type="number"
                                                        name="discount"
                                                        value={formData.discount || 0}
                                                        onChange={onInputChange}
                                                        style={{ width: '60px' }}
                                                        className="form-input me-2"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                    />
                                                    <span>%</span>
                                                </div>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2 text-danger">
                                                <span>Discount Amount:</span>
                                                <span>-₹{summaryValues.discountAmount.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Discount Input (if no discount applied) */}
                                    {summaryValues.discountPercent === 0 && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Discount:</span>
                                            <div className="d-flex align-items-center">
                                                <Form.Control
                                                    type="number"
                                                    name="discount"
                                                    value={formData.discount || 0}
                                                    onChange={onInputChange}
                                                    style={{ width: '60px' }}
                                                    className="form-input me-2"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                />
                                                <span>%</span>
                                            </div>
                                        </div>
                                    )}

                                    <hr className="my-3" />

                                    {/* Final Total */}
                                    <div className="d-flex justify-content-between fw-bold mb-3">
                                        <span className="text-lg">Total Amount:</span>
                                        <span className="text-primary text-lg">₹{summaryValues.finalTotal.toFixed(2)}</span>
                                    </div>

                                    {/* Invoice Type and Pricing Info */}
                                    {formData.invoiceType && (
                                        <div className="text-center">
                                            <div className="mb-2">
                                                <small className="text-muted fw-semibold">
                                                    {formData.invoiceType === 'gst' ? 'GST Invoice' : 'Non-GST Invoice'}
                                                </small>
                                            </div>

                                            {/* Pricing Information */}
                                            <div className="small text-muted">
                                                {formData.invoiceType === 'gst' ? (
                                                    <>
                                                        <div>• Prices include GST</div>
                                                        <div>• GST calculated per item</div>
                                                        {summaryValues.discountPercent > 0 && (
                                                            <div>• Discount applied on final amount</div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div>• Prices without GST</div>
                                                        {summaryValues.discountPercent > 0 && (
                                                            <div>• Discount applied on subtotal</div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
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
                            type="submit"
                            className="px-4"
                            disabled={!isFormValid()}
                        >
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