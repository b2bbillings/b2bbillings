import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, InputGroup, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faSearch,
    faUserTie,
    faEdit,
    faTrash,
    faUserShield,
    faEye,
    faSort,
    faFilter,
    faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import AddStaffModal from './Staff/AddStaffModal';
import StaffDetails from './Staff/StafDetails';
import './StaffManagement.css';

function StaffManagement() {
    // State management
    const [staff, setStaff] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [sortField, setSortField] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    // Fetch staff data (placeholder for API call)
    useEffect(() => {
        // This would be an API call in production
        const mockData = [
            {
                id: 1,
                name: 'John Smith',
                role: 'manager',
                phone: '9876543210',
                email: 'john@example.com',
                joinDate: '2023-01-15',
                salary: 45000,
                address: '123 Main St, City',
                status: 'active',
                idProof: 'ABCDE1234F',
                emergencyContact: '9876543210',
                permissions: ['sales', 'inventory', 'reports', 'staff', 'settings'],
                avatar: null
            },
            {
                id: 2,
                name: 'Sarah Johnson',
                role: 'cashier',
                phone: '8765432109',
                email: 'sarah@example.com',
                joinDate: '2023-03-10',
                salary: 28000,
                address: '456 Oak St, Town',
                status: 'active',
                idProof: 'FGHIJ5678K',
                emergencyContact: '8765432109',
                permissions: ['sales', 'inventory'],
                avatar: null
            },
            {
                id: 3,
                name: 'Raj Patel',
                role: 'salesperson',
                phone: '7654321098',
                email: 'raj@example.com',
                joinDate: '2023-02-20',
                salary: 25000,
                address: '789 Pine St, Village',
                status: 'inactive',
                idProof: 'LMNOP6789Q',
                emergencyContact: '7654321098',
                permissions: ['sales'],
                avatar: null
            }
        ];

        setStaff(mockData);
    }, []);

    // Handle showing the add modal
    const handleShowAddModal = () => {
        setSelectedStaff(null);
        setEditMode(false);
        setShowAddModal(true);
    };

    // Handle showing the edit modal
    const handleEditStaff = (staffMember) => {
        setSelectedStaff(staffMember);
        setEditMode(true);
        setShowAddModal(true);
    };

    // Handle showing staff details
    const handleShowDetails = (staffMember) => {
        setSelectedStaff(staffMember);
        setShowDetailsModal(true);
    };

    // Handle deleting staff
    const handleDeleteStaff = (staffId) => {
        if (window.confirm("Are you sure you want to delete this staff member?")) {
            setStaff(prevStaff => prevStaff.filter(s => s.id !== staffId));
        }
    };

    // Handle saving new or edited staff
    const handleSaveStaff = (staffData) => {
        if (editMode) {
            // Update existing staff member
            setStaff(prevStaff =>
                prevStaff.map(s => s.id === selectedStaff.id ? { ...s, ...staffData } : s)
            );
        } else {
            // Add new staff member
            const newStaff = {
                id: Date.now(),
                ...staffData,
                status: 'active'
            };
            setStaff(prevStaff => [...prevStaff, newStaff]);
        }
        setShowAddModal(false);
    };

    // Handle sorting
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Filter and sort staff data
    const filteredStaff = staff
        .filter(s => {
            // Apply role filter
            if (filterRole !== 'all' && s.role !== filterRole) return false;

            // Apply search filter
            return s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.phone.includes(searchQuery);
        })
        .sort((a, b) => {
            // Apply sorting
            if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
            if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

    // Get role badge
    const getRoleBadge = (role) => {
        switch (role) {
            case 'manager':
                return <Badge bg="primary">Manager</Badge>;
            case 'admin':
                return <Badge bg="danger">Admin</Badge>;
            case 'cashier':
                return <Badge bg="success">Cashier</Badge>;
            case 'salesperson':
                return <Badge bg="info">Sales</Badge>;
            default:
                return <Badge bg="secondary">{role}</Badge>;
        }
    };

    // Get status badge
    const getStatusBadge = (status) => {
        return status === 'active'
            ? <Badge bg="success">Active</Badge>
            : <Badge bg="secondary">Inactive</Badge>;
    };

    return (
        <Container fluid className="py-3">
            <Card className="shadow-sm">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0">
                        <FontAwesomeIcon icon={faUserTie} className="text-primary me-2" />
                        Staff Management
                    </h5>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleShowAddModal}
                        className="d-flex align-items-center"
                    >
                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                        Add Staff
                    </Button>
                </Card.Header>
                <Card.Body>
                    <Row className="mb-3 g-3">
                        <Col md={6} lg={4}>
                            <InputGroup>
                                <InputGroup.Text>
                                    <FontAwesomeIcon icon={faSearch} />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search by name, email or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={3} lg={2}>
                            <Form.Select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="h-100"
                            >
                                <option value="all">All Roles</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                                <option value="cashier">Cashier</option>
                                <option value="salesperson">Sales</option>
                            </Form.Select>
                        </Col>
                    </Row>

                    <div className="table-responsive">
                        <Table hover className="align-middle staff-table">
                            <thead className="table-light">
                                <tr>
                                    <th onClick={() => handleSort('name')} className="sortable">
                                        Name
                                        {sortField === 'name' && (
                                            <FontAwesomeIcon
                                                icon={faSort}
                                                className={`ms-1 ${sortDirection === 'asc' ? 'text-primary' : 'text-danger'}`}
                                                size="xs"
                                            />
                                        )}
                                    </th>
                                    <th onClick={() => handleSort('role')} className="sortable">
                                        Role
                                        {sortField === 'role' && (
                                            <FontAwesomeIcon
                                                icon={faSort}
                                                className={`ms-1 ${sortDirection === 'asc' ? 'text-primary' : 'text-danger'}`}
                                                size="xs"
                                            />
                                        )}
                                    </th>
                                    <th>Contact</th>
                                    <th onClick={() => handleSort('joinDate')} className="sortable">
                                        Join Date
                                        {sortField === 'joinDate' && (
                                            <FontAwesomeIcon
                                                icon={faSort}
                                                className={`ms-1 ${sortDirection === 'asc' ? 'text-primary' : 'text-danger'}`}
                                                size="xs"
                                            />
                                        )}
                                    </th>
                                    <th>Status</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.length > 0 ? (
                                    filteredStaff.map(staffMember => (
                                        <tr key={staffMember.id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="staff-avatar me-2">
                                                        {staffMember.avatar ? (
                                                            <img
                                                                src={staffMember.avatar}
                                                                alt={staffMember.name}
                                                                className="rounded-circle"
                                                                width="36"
                                                                height="36"
                                                            />
                                                        ) : (
                                                            <div className="avatar-placeholder rounded-circle bg-light text-primary d-flex align-items-center justify-content-center">
                                                                <FontAwesomeIcon icon={faUserTie} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {staffMember.name}
                                                </div>
                                            </td>
                                            <td>{getRoleBadge(staffMember.role)}</td>
                                            <td>
                                                <div>{staffMember.phone}</div>
                                                <div className="text-muted small">{staffMember.email}</div>
                                            </td>
                                            <td>{new Date(staffMember.joinDate).toLocaleDateString()}</td>
                                            <td>{getStatusBadge(staffMember.status)}</td>
                                            <td>
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        onClick={() => handleShowDetails(staffMember)}
                                                        title="View Details"
                                                    >
                                                        <FontAwesomeIcon icon={faEye} />
                                                    </Button>
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        onClick={() => handleEditStaff(staffMember)}
                                                        title="Edit Staff"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Button>
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        className="text-danger"
                                                        onClick={() => handleDeleteStaff(staffMember.id)}
                                                        title="Delete Staff"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4">
                                            <div className="text-muted">No staff members found</div>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="mt-2"
                                                onClick={handleShowAddModal}
                                            >
                                                <FontAwesomeIcon icon={faPlus} className="me-1" />
                                                Add Staff Member
                                            </Button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Add/Edit Staff Modal */}
            <AddStaffModal
                show={showAddModal}
                onHide={() => setShowAddModal(false)}
                onSave={handleSaveStaff}
                editMode={editMode}
                staffData={selectedStaff}
            />

            {/* Staff Details Modal */}
            <StaffDetails
                show={showDetailsModal}
                onHide={() => setShowDetailsModal(false)}
                onEdit={handleEditStaff}
                onDelete={handleDeleteStaff}
                staff={selectedStaff}
            />
        </Container>
    );
}

export default StaffManagement;