import React from 'react';
import { Table, Badge, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faBuilding,
    faRocket,
    faPhone,
    faEnvelope,
    faEllipsisV,
    faEye,
    faEdit,
    faTrash
} from '@fortawesome/free-solid-svg-icons';

function PartiesList({ parties, onViewDetails, onEditParty, onDeleteParty }) {
    return (
        <div className="parties-list-container">
            <div className="table-responsive">
                <Table hover className="parties-table">
                    <thead className="table-light">
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Contact</th>
                            <th>Location</th>
                            <th>GST</th>
                            <th width="50">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parties.map((party) => (
                            <tr
                                key={party.id}
                                className="party-row-clickable"
                                style={{ cursor: 'pointer' }}
                            >
                                <td onClick={() => onViewDetails(party)}>
                                    <div className="d-flex align-items-center">
                                        <div className="party-avatar me-3">
                                            <FontAwesomeIcon
                                                icon={party.isRunningCustomer ? faRocket : (party.partyType === 'customer' ? faUser : faBuilding)}
                                                className={party.isRunningCustomer ? "text-warning" : "text-muted"}
                                            />
                                        </div>
                                        <div>
                                            <div className="fw-semibold">
                                                {party.name}
                                                {party.isRunningCustomer && (
                                                    <Badge bg="warning" className="ms-2 text-dark">
                                                        Running
                                                    </Badge>
                                                )}
                                            </div>
                                            {party.email && (
                                                <small className="text-muted">
                                                    <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                                                    {party.email}
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td onClick={() => onViewDetails(party)}>
                                    <Badge
                                        bg={party.partyType === 'customer' ? 'primary' : 'success'}
                                        className="party-type-badge"
                                    >
                                        {party.partyType === 'customer' ? 'Customer' : 'Supplier'}
                                    </Badge>
                                    {party.isRunningCustomer && (
                                        <div className="mt-1">
                                            <small className="text-warning">
                                                <FontAwesomeIcon icon={faRocket} className="me-1" />
                                                Quick Entry
                                            </small>
                                        </div>
                                    )}
                                </td>
                                <td onClick={() => onViewDetails(party)}>
                                    <div className="contact-info">
                                        {party.whatsappNumber && (
                                            <div className="text-muted mb-1">
                                                <FontAwesomeIcon icon={faPhone} className="me-1 text-success" />
                                                <small className="text-success">WhatsApp:</small> {party.whatsappNumber}
                                            </div>
                                        )}
                                        {party.phoneNumbers && party.phoneNumbers.length > 0 && (
                                            party.phoneNumbers.slice(0, 2).map((phone, index) => (
                                                phone.number && (
                                                    <div key={index} className="text-muted">
                                                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                        {phone.label && <small>{phone.label}:</small>} {phone.number}
                                                    </div>
                                                )
                                            ))
                                        )}
                                        {party.phoneNumbers && party.phoneNumbers.length > 2 && (
                                            <small className="text-muted">+{party.phoneNumbers.length - 2} more</small>
                                        )}
                                    </div>
                                </td>
                                <td onClick={() => onViewDetails(party)}>
                                    <div>
                                        {party.city && (
                                            <span className="text-muted">{party.city}</span>
                                        )}
                                        {party.taluka && party.city && (
                                            <span className="text-muted">, </span>
                                        )}
                                        {party.taluka && (
                                            <span className="text-muted">{party.taluka}</span>
                                        )}
                                        {party.state && (party.city || party.taluka) && (
                                            <div className="small text-muted">{party.state}</div>
                                        )}
                                        {!party.city && !party.taluka && !party.state && (
                                            <span className="text-muted">-</span>
                                        )}
                                        {party.pincode && (
                                            <div>
                                                <small className="text-muted">PIN: {party.pincode}</small>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td onClick={() => onViewDetails(party)}>
                                    <span className="text-muted">{party.gstNumber || '-'}</span>
                                </td>
                                <td>
                                    <Dropdown>
                                        <Dropdown.Toggle
                                            variant="link"
                                            className="p-0 border-0 text-muted"
                                            id={`dropdown-${party.id}`}
                                        >
                                            <FontAwesomeIcon icon={faEllipsisV} />
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            <Dropdown.Item onClick={() => onViewDetails(party)}>
                                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                                View Details
                                            </Dropdown.Item>
                                            <Dropdown.Item onClick={() => onEditParty(party)}>
                                                <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                Edit
                                            </Dropdown.Item>
                                            <Dropdown.Item
                                                onClick={() => onDeleteParty(party.id)}
                                                className="text-danger"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                Delete
                                            </Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </div>
    );
}

export default PartiesList;