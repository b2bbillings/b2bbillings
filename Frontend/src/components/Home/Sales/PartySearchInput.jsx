import React from 'react';
import { Form, Card, ListGroup, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUserPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

function PartySearchInput({
    partySearchQuery,
    showSuggestions,
    filteredParties,
    selectedParty,
    activeSuggestionIndex,
    onPartySearchChange,
    onSelectParty,
    onInputFocus,
    onKeyDown,
    onSuggestionKeyDown,
    onShowAddPartyModal,
    onRemoveParty,
    inputRef,
    suggestionRefs
}) {
    return (
        <Form.Group className="position-relative">
            <Form.Label htmlFor="party-search-input" className="fw-semibold">
                Party Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
                id="party-search-input"
                ref={inputRef}
                type="text"
                value={partySearchQuery}
                onChange={onPartySearchChange}
                onFocus={onInputFocus}
                onKeyDown={onKeyDown}
                placeholder="Type party name to search existing parties..."
                className="form-input"
                autoComplete="off"
                aria-describedby="party-search-help"
                aria-expanded={showSuggestions}
                aria-haspopup="listbox"
                role="combobox"
                aria-activedescendant={
                    activeSuggestionIndex >= 0
                        ? `suggestion-${activeSuggestionIndex}`
                        : undefined
                }
            />
            <div id="party-search-help" className="sr-only">
                Use arrow keys to navigate suggestions, Enter to select
            </div>

            {/* Party Suggestions Dropdown */}
            {showSuggestions && (
                <div
                    className="position-absolute w-100 mt-1"
                    style={{ zIndex: 1070 }}
                    role="listbox"
                    aria-label="Party suggestions"
                >
                    <Card className="border shadow-lg">
                        <Card.Body className="p-0">
                            {filteredParties.length > 0 ? (
                                <>
                                    <div className="px-3 py-2 bg-light border-bottom">
                                        <small className="text-muted fw-semibold">Existing Parties</small>
                                    </div>
                                    <ListGroup variant="flush">
                                        {filteredParties.map((party, index) => (
                                            <ListGroup.Item
                                                key={party.id}
                                                id={`suggestion-${index}`}
                                                ref={el => suggestionRefs.current[index] = el}
                                                action
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('🖱️ Party clicked:', party);
                                                    selectParty(party);
                                                }}
                                                onKeyDown={(e) => handleSuggestionKeyDown(e, index, party)}
                                                className={`d-flex align-items-center py-2 cursor-pointer ${index === activeSuggestionIndex ? 'bg-primary text-white' : ''
                                                    }`}
                                                style={{ cursor: 'pointer' }}
                                                tabIndex={index === activeSuggestionIndex ? 0 : -1}
                                                role="option"
                                                aria-selected={index === activeSuggestionIndex}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faUser}
                                                    className={`me-3 ${index === activeSuggestionIndex ? 'text-white' : 'text-muted'}`}
                                                    aria-hidden="true"
                                                />
                                                <div className="flex-grow-1">
                                                    <div className="fw-semibold">{party.name}</div>
                                                    <div className="small text-muted">
                                                        {party.phone || party.whatsappNumber || 'No phone'}
                                                        {party.email && ` • ${party.email}`}
                                                        {party.city && ` • ${party.city}`}
                                                        {party.isRunningCustomer && (
                                                            <span className="text-warning ms-2">
                                                                <FontAwesomeIcon icon={faRocket} className="me-1" />
                                                                Running Customer
                                                            </span>
                                                        )}
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
                                        <div className="mb-3">
                                            <FontAwesomeIcon icon={faUser} size="3x" className="text-muted mb-3" aria-hidden="true" />
                                        </div>
                                        <div className="mb-2">
                                            <strong>"{partySearchQuery}"</strong> - New Party
                                        </div>
                                        <small className="text-muted d-block mb-4">
                                            This party doesn't exist in your database
                                        </small>

                                        {/* Enhanced Options */}
                                        <div className="d-grid gap-2">
                                            {/* Full Party Form Button */}
                                            <Button
                                                variant="primary"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setShowSuggestions(false);

                                                    // Pre-fill the party name in the quick party modal
                                                    onShowAddPartyModal(partySearchQuery.trim());
                                                }}
                                                type="button"
                                                className="d-flex align-items-center justify-content-center"
                                                aria-label="Add as permanent party with full details"
                                            >
                                                <FontAwesomeIcon icon={faUserPlus} className="me-2" aria-hidden="true" />
                                                Add Complete Party Details
                                            </Button>

                                            {/* Quick Running Customer Button */}
                                            <Button
                                                variant="warning"
                                                className="text-dark d-flex align-items-center justify-content-center"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setShowSuggestions(false);

                                                    // Create a quick running customer
                                                    const quickCustomer = {
                                                        id: Date.now(),
                                                        name: partySearchQuery.trim(),
                                                        phone: '',
                                                        whatsappNumber: '',
                                                        partyType: 'customer',
                                                        isRunningCustomer: true,
                                                        email: '',
                                                        address: '',
                                                        city: '',
                                                        pincode: '',
                                                        gstNumber: '',
                                                        phoneNumbers: [],
                                                        createdAt: new Date().toISOString()
                                                    };

                                                    // Add to parties and select
                                                    selectParty(quickCustomer);

                                                    // Also trigger the onPartySelection for parent component
                                                    onPartySelection({
                                                        target: {
                                                            value: 'quick-customer',
                                                            selectedPartyData: quickCustomer,
                                                            isNewQuickCustomer: true
                                                        }
                                                    });
                                                }}
                                                type="button"
                                                aria-label="Add as quick running customer"
                                            >
                                                <FontAwesomeIcon icon={faRocket} className="me-2" aria-hidden="true" />
                                                Quick Running Customer
                                            </Button>

                                            {/* Walk-in Party Option */}
                                            <Button
                                                variant="outline-secondary"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setShowSuggestions(false);

                                                    // Create walk-in party (original functionality)
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

                                                    // Continue with invoice creation
                                                    invoiceDateRef.current?.focus();
                                                }}
                                                type="button"
                                                className="d-flex align-items-center justify-content-center"
                                                aria-label="Continue as walk-in party"
                                            >
                                                <FontAwesomeIcon icon={faUser} className="me-2" aria-hidden="true" />
                                                Continue as Walk-in
                                            </Button>
                                        </div>

                                        <div className="mt-3">
                                            <small className="text-muted">
                                                Choose how you want to save this party for future reference
                                            </small>
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
                        <FontAwesomeIcon icon={faUser} className="text-success me-2" aria-hidden="true" />
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
                            onClick={onRemoveParty}
                            type="button"
                            aria-label="Remove selected party"
                        >
                            <FontAwesomeIcon icon={faTimes} aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            )}
        </Form.Group>
    );
}

export default PartySearchInput;