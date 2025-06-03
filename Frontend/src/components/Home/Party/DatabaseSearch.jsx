import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Card, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDatabase,
    faUser,
    faPhone,
    faEnvelope,
    faMapMarkerAlt,
    faBuilding,
    faIdCard,
    faWifi,
    faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

function DatabaseSearch({
    show,
    onHide,
    searchQuery,
    onSearchChange,
    searchResults,
    isSearching,
    onAddParty,
    onClose
}) {
    // Handle party selection and addition
    const handleSelectParty = (party) => {
        console.log('🎯 Selecting party from database:', party);

        // Convert external party format to internal format
        const partyData = {
            id: Date.now(), // Generate new ID
            name: party.name,
            phone: party.phone,
            whatsappNumber: party.phone,
            email: party.email,
            companyName: party.companyName || party.name,
            gstNumber: party.gstNumber || '',
            address: party.address || '',
            city: party.city || '',
            state: party.state || '',
            pincode: party.pincode || '',
            taluka: party.taluka || '',
            contactPersonName: party.contactPersonName || '',
            partyType: party.partyType || 'customer',
            country: 'INDIA',
            openingBalanceType: 'debit',
            openingBalance: 0,
            phoneNumbers: [{ number: party.phone, label: 'Primary' }],
            // Additional metadata
            source: party.source || 'Database Import',
            isVerified: party.isVerified || false,
            importedFrom: 'database',
            importedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        // Call the parent function to add the party
        if (typeof onAddParty === 'function') {
            onAddParty(partyData);
        } else {
            console.error('❌ onAddParty function not provided');
        }
    };

    return (
        <Modal show={show} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FontAwesomeIcon icon={faDatabase} className="me-2" />
                    Search Database
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* Search Input */}
                <Form.Group className="mb-3">
                    <Form.Label>Search Party</Form.Label>
                    <Form.Control
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Type name, phone, email, GST number, or company name..."
                        autoFocus
                    />
                    <Form.Text className="text-muted">
                        Start typing to search external databases...
                    </Form.Text>
                </Form.Group>

                {/* Loading State */}
                {isSearching && (
                    <div className="text-center py-3">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Searching databases...
                    </div>
                )}

                {/* Search Results */}
                {searchQuery.trim().length > 2 && searchResults.length > 0 && (
                    <Card>
                        <Card.Header>
                            <h6 className="mb-0">
                                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                            </h6>
                        </Card.Header>
                        <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {searchResults.map((party) => (
                                <ListGroup.Item
                                    key={party.id}
                                    action
                                    onClick={() => handleSelectParty(party)}
                                    className="cursor-pointer"
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="d-flex align-items-start">
                                        <div className="me-3">
                                            <FontAwesomeIcon
                                                icon={party.partyType === 'customer' ? faUser : faBuilding}
                                                className={`text-${party.partyType === 'customer' ? 'primary' : 'success'} fa-lg`}
                                            />
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center mb-1">
                                                <h6 className="mb-0 fw-bold">{party.name}</h6>
                                                {party.isVerified && (
                                                    <Badge bg="success" className="ms-2 small">
                                                        Verified
                                                    </Badge>
                                                )}
                                                <Badge
                                                    bg={party.partyType === 'customer' ? 'primary' : 'success'}
                                                    className="ms-2 small"
                                                >
                                                    {party.partyType?.charAt(0).toUpperCase() + party.partyType?.slice(1)}
                                                </Badge>
                                            </div>

                                            {party.companyName && party.companyName !== party.name && (
                                                <div className="text-muted mb-1 small">
                                                    <FontAwesomeIcon icon={faBuilding} className="me-1" />
                                                    {party.companyName}
                                                </div>
                                            )}

                                            <div className="small text-muted">
                                                {party.phone && (
                                                    <span className="me-3">
                                                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                        {party.phone}
                                                    </span>
                                                )}
                                                {party.email && (
                                                    <span className="me-3">
                                                        <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                                                        {party.email}
                                                    </span>
                                                )}
                                            </div>

                                            {party.address && (
                                                <div className="small text-muted mt-1">
                                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                                                    {party.city}, {party.state} - {party.pincode}
                                                </div>
                                            )}

                                            {party.gstNumber && (
                                                <div className="small text-muted mt-1">
                                                    <FontAwesomeIcon icon={faIdCard} className="me-1" />
                                                    GST: {party.gstNumber}
                                                </div>
                                            )}

                                            <div className="small text-muted mt-1">
                                                <em>Source: {party.source || 'Database'}</em>
                                            </div>
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Card>
                )}

                {/* No Results */}
                {searchQuery.trim().length > 2 && searchResults.length === 0 && !isSearching && (
                    <Alert variant="info">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        No parties found matching "{searchQuery}" in external databases.
                    </Alert>
                )}

                {/* Connection Status */}
                <div className="mt-3 text-center">
                    <small className="text-muted">
                        <FontAwesomeIcon icon={faWifi} className="me-1 text-success" />
                        Connected to external databases
                    </small>
                </div>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default DatabaseSearch;