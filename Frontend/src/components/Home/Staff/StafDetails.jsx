import React from 'react';
import { Modal, Button, Row, Col, Badge, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserTie,
    faIdCard,
    faPhone,
    faEnvelope,
    faMapMarkerAlt,
    faCalendarAlt,
    faRupeeSign,
    faShieldAlt,
    faEdit,
    faTrash,
    faTimes,
    faClock,
    faCheckCircle,
    faTimesCircle,
    faUserShield
} from '@fortawesome/free-solid-svg-icons';
import './StaffDetails.css';

function StaffDetails({ show, onHide, staff, onEdit, onDelete }) {
    if (!staff) {
        return null;
    }

    // Get role badge
    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return <Badge bg="danger">Admin</Badge>;
            case 'manager':
                return <Badge bg="primary">Manager</Badge>;
            case 'cashier':
                return <Badge bg="success">Cashier</Badge>;
            case 'salesperson':
                return <Badge bg="info">Sales Person</Badge>;
            case 'inventory':
                return <Badge bg="warning">Inventory Manager</Badge>;
            case 'delivery':
                return <Badge bg="secondary">Delivery Person</Badge>;
            default:
                return <Badge bg="secondary">{role}</Badge>;
        }
    };

    // Get permission name
    const getPermissionName = (permission) => {
        const permissionMap = {
            'dashboard': 'Dashboard Access',
            'sales': 'Sales Management',
            'purchases': 'Purchase Management',
            'inventory': 'Inventory Management',
            'customers': 'Customer Management',
            'suppliers': 'Supplier Management',
            'staff': 'Staff Management',
            'reports': 'Reports Access',
            'settings': 'Settings Access'
        };

        return permissionMap[permission] || permission;
    };

    // Format date
    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    // Get ID proof name
    const getIdProofName = (idType) => {
        const idMap = {
            'aadhar': 'Aadhar Card',
            'pan': 'PAN Card',
            'voter': 'Voter ID',
            'driving': 'Driving License',
            'passport': 'Passport'
        };

        return idMap[idType] || idType;
    };

    const handleEdit = () => {
        onHide();
        if (onEdit) onEdit(staff);
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${staff.name}?`)) {
            onHide();
            if (onDelete) onDelete(staff.id);
        }
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="lg"
            centered
            className="staff-details-modal"
        >
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="w-100">
                    <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex align-items-center">
                            <div className="staff-avatar-large me-3">
                                {staff.avatar ? (
                                    <img
                                        src={staff.avatar}
                                        alt={staff.name}
                                        className="rounded-circle"
                                        width="60"
                                        height="60"
                                    />
                                ) : (
                                    <div className="avatar-placeholder-large rounded-circle d-flex align-items-center justify-content-center text-primary">
                                        <FontAwesomeIcon icon={faUserTie} size="2x" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="mb-1">{staff.name}</h4>
                                <div>
                                    {getRoleBadge(staff.role)}
                                    <span className="ms-2 text-muted small">
                                        <FontAwesomeIcon icon={faClock} className="me-1" />
                                        Joined on {formatDate(staff.joinDate)}
                                    </span>
                                    <span className="ms-2">
                                        {staff.status === 'active'
                                            ? <Badge bg="success" pill><FontAwesomeIcon icon={faCheckCircle} className="me-1" />Active</Badge>
                                            : <Badge bg="secondary" pill><FontAwesomeIcon icon={faTimesCircle} className="me-1" />Inactive</Badge>
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={handleEdit}
                            >
                                <FontAwesomeIcon icon={faEdit} className="me-1" />
                                Edit
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={handleDelete}
                            >
                                <FontAwesomeIcon icon={faTrash} className="me-1" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="pt-0">
                <Row className="mt-4">
                    <Col md={6}>
                        <div className="info-section mb-4">
                            <h5 className="section-title">
                                <FontAwesomeIcon icon={faIdCard} className="me-2 text-primary" />
                                Contact Information
                            </h5>
                            <ListGroup variant="flush" className="info-list">
                                {staff.phone && (
                                    <ListGroup.Item className="px-0">
                                        <div className="d-flex">
                                            <div className="info-label">
                                                <FontAwesomeIcon icon={faPhone} className="text-muted me-2" />
                                                Phone:
                                            </div>
                                            <div className="info-value ms-2">
                                                {staff.phone}
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                )}

                                {staff.email && (
                                    <ListGroup.Item className="px-0">
                                        <div className="d-flex">
                                            <div className="info-label">
                                                <FontAwesomeIcon icon={faEnvelope} className="text-muted me-2" />
                                                Email:
                                            </div>
                                            <div className="info-value ms-2">
                                                {staff.email}
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                )}

                                {staff.address && (
                                    <ListGroup.Item className="px-0">
                                        <div className="d-flex">
                                            <div className="info-label">
                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-muted me-2" />
                                                Address:
                                            </div>
                                            <div className="info-value ms-2">
                                                {staff.address}
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </div>

                        <div className="info-section mb-4">
                            <h5 className="section-title">
                                <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-primary" />
                                Employment Details
                            </h5>
                            <ListGroup variant="flush" className="info-list">
                                <ListGroup.Item className="px-0">
                                    <div className="d-flex">
                                        <div className="info-label">Join Date:</div>
                                        <div className="info-value ms-2">
                                            {formatDate(staff.joinDate)}
                                        </div>
                                    </div>
                                </ListGroup.Item>

                                {staff.salary && (
                                    <ListGroup.Item className="px-0">
                                        <div className="d-flex">
                                            <div className="info-label">
                                                <FontAwesomeIcon icon={faRupeeSign} className="text-muted me-1" />
                                                Salary:
                                            </div>
                                            <div className="info-value ms-2">
                                                ₹ {staff.salary.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </div>
                    </Col>

                    <Col md={6}>
                        <div className="info-section mb-4">
                            <h5 className="section-title">
                                <FontAwesomeIcon icon={faIdCard} className="me-2 text-primary" />
                                Identification
                            </h5>

                            <ListGroup variant="flush" className="info-list">
                                {staff.idProof && staff.idNumber && (
                                    <ListGroup.Item className="px-0">
                                        <div className="d-flex">
                                            <div className="info-label">
                                                {getIdProofName(staff.idProof)}:
                                            </div>
                                            <div className="info-value ms-2">
                                                {staff.idNumber}
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </div>

                        <div className="info-section mb-4">
                            <h5 className="section-title">
                                <FontAwesomeIcon icon={faPhone} className="me-2 text-primary" />
                                Emergency Contact
                            </h5>

                            <ListGroup variant="flush" className="info-list">
                                {staff.emergencyContactName && (
                                    <ListGroup.Item className="px-0">
                                        <div className="d-flex">
                                            <div className="info-label">Name:</div>
                                            <div className="info-value ms-2">
                                                {staff.emergencyContactName}
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                )}

                                {staff.emergencyContact && (
                                    <ListGroup.Item className="px-0">
                                        <div className="d-flex">
                                            <div className="info-label">Phone:</div>
                                            <div className="info-value ms-2">
                                                {staff.emergencyContact}
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </div>
                    </Col>
                </Row>

                <div className="info-section mt-2">
                    <h5 className="section-title">
                        <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-primary" />
                        System Access & Permissions
                    </h5>

                    <div className="permissions-container">
                        {staff.permissions && staff.permissions.length > 0 ? (
                            <div className="permission-badges">
                                {staff.permissions.map(permission => (
                                    <Badge
                                        key={permission}
                                        bg="light"
                                        text="dark"
                                        className="permission-badge"
                                    >
                                        <FontAwesomeIcon icon={faUserShield} className="text-primary me-1" />
                                        {getPermissionName(permission)}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted">No specific permissions assigned</div>
                        )}
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    <FontAwesomeIcon icon={faTimes} className="me-1" />
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default StaffDetails;