import React from 'react';
import { Row, Col, Card, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserCircle,
    faPhone,
    faEnvelope,
    faMapMarkerAlt,
    faIdCard,
    faComments,
    faUserCheck,
    faBuilding
} from '@fortawesome/free-solid-svg-icons';

function PartyProfile({ party, partyTransactions }) {
    const getPartyTypeIcon = () => {
        return party?.partyType === 'supplier' ? faBuilding : faUserCheck;
    };

    const getPartyTypeBadge = () => {
        return party?.partyType === 'supplier' ?
            <Badge bg="info">Supplier</Badge> :
            <Badge bg="success">Customer</Badge>;
    };

    return (
        <div className="p-4">
            <h4 className="mb-3">Party Profile</h4>
            <Row>
                <Col md={6}>
                    <Card className="h-100">
                        <Card.Header>
                            <h6 className="mb-0">
                                <FontAwesomeIcon icon={faUserCircle} className="me-2" />
                                Basic Information
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="text-center mb-4">
                                <div className="party-avatar-xl mx-auto mb-3">
                                    <FontAwesomeIcon
                                        icon={party.isRunningCustomer ? faUserCheck : getPartyTypeIcon()}
                                        className={party.isRunningCustomer ? "text-warning" : "text-primary"}
                                        size="4x"
                                    />
                                </div>
                                <h5>{party.name}</h5>
                                <p className="text-muted">
                                    {getPartyTypeBadge()}
                                    {party.isRunningCustomer && (
                                        <Badge bg="warning" className="ms-2 text-dark">
                                            Running Customer
                                        </Badge>
                                    )}
                                </p>
                            </div>
                            
                            <div className="profile-info">
                                <div className="profile-item d-flex mb-3">
                                    <div className="profile-label text-muted" style={{ width: "120px" }}>
                                        ID:
                                    </div>
                                    <div className="profile-value fw-semibold">
                                        {party.id}
                                    </div>
                                </div>
                                
                                <div className="profile-item d-flex mb-3">
                                    <div className="profile-label text-muted" style={{ width: "120px" }}>
                                        Added On:
                                    </div>
                                    <div className="profile-value">
                                        {new Date(party.createdAt || Date.now()).toLocaleDateString()}
                                    </div>
                                </div>
                                
                                <div className="profile-item d-flex mb-3">
                                    <div className="profile-label text-muted" style={{ width: "120px" }}>
                                        Status:
                                    </div>
                                    <div className="profile-value">
                                        <Badge bg="success">Active</Badge>
                                    </div>
                                </div>
                                
                                <div className="profile-item d-flex mb-3">
                                    <div className="profile-label text-muted" style={{ width: "120px" }}>
                                        Transaction Count:
                                    </div>
                                    <div className="profile-value">
                                        {partyTransactions.length}
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={6}>
                    <Card className="h-100">
                        <Card.Header>
                            <h6 className="mb-0">
                                <FontAwesomeIcon icon={faPhone} className="me-2" />
                                Contact Information
                            </h6>
                        </Card.Header>
                        <Card.Body>
                            {party.whatsappNumber && (
                                <div className="contact-item mb-3">
                                    <FontAwesomeIcon icon={faComments} className="me-2 text-success" />
                                    <strong>WhatsApp:</strong>
                                    <span className="ms-2">{party.whatsappNumber}</span>
                                </div>
                            )}

                            {party.phone && party.phone !== party.whatsappNumber && (
                                <div className="contact-item mb-3">
                                    <FontAwesomeIcon icon={faPhone} className="me-2 text-info" />
                                    <strong>Phone:</strong>
                                    <span className="ms-2">{party.phone}</span>
                                </div>
                            )}

                            {party.phoneNumbers && party.phoneNumbers.length > 0 && (
                                <div className="mb-3">
                                    <h6>Additional Phone Numbers:</h6>
                                    {party.phoneNumbers.map((phone, index) => (
                                        phone.number && (
                                            <div key={index} className="contact-item mb-2">
                                                <FontAwesomeIcon icon={faPhone} className="me-2 text-info" />
                                                <strong>{phone.label || 'Phone'}:</strong>
                                                <span className="ms-2">{phone.number}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}

                            {party.email && (
                                <div className="contact-item mb-3">
                                    <FontAwesomeIcon icon={faEnvelope} className="me-2 text-warning" />
                                    <strong>Email:</strong>
                                    <span className="ms-2">{party.email}</span>
                                </div>
                            )}

                            {party.gstNumber && (
                                <div className="contact-item mb-3">
                                    <FontAwesomeIcon icon={faIdCard} className="me-2 text-danger" />
                                    <strong>GST Number:</strong>
                                    <span className="ms-2">{party.gstNumber}</span>
                                </div>
                            )}
                            
                            <hr />
                            
                            <h6>Address Information</h6>
                            
                            {party.address && (
                                <div className="contact-item mb-3 mt-3">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-secondary align-self-start" />
                                    <div>
                                        <strong>Address:</strong>
                                        <div className="mt-1 text-muted">
                                            {party.address}
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="contact-details mt-3">
                                {party.city && (
                                    <div className="d-flex mb-2">
                                        <div className="text-muted" style={{ width: '100px' }}>City:</div>
                                        <div>{party.city}</div>
                                    </div>
                                )}
                                
                                {party.taluka && (
                                    <div className="d-flex mb-2">
                                        <div className="text-muted" style={{ width: '100px' }}>Taluka:</div>
                                        <div>{party.taluka}</div>
                                    </div>
                                )}
                                
                                {party.state && (
                                    <div className="d-flex mb-2">
                                        <div className="text-muted" style={{ width: '100px' }}>State:</div>
                                        <div>{party.state}</div>
                                    </div>
                                )}
                                
                                {party.pincode && (
                                    <div className="d-flex mb-2">
                                        <div className="text-muted" style={{ width: '100px' }}>Pin Code:</div>
                                        <div>{party.pincode}</div>
                                    </div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default PartyProfile;