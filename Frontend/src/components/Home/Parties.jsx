import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Form, InputGroup, Badge, Dropdown, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faEdit,
    faPhone,
    faEnvelope,
    faMapMarkerAlt,
    faBuilding,
    faUser,
    faEllipsisV,
    faArrowUp,
    faArrowDown,
    faFilter,
    faSort,
    faSortUp,
    faSortDown,
    faTrash,
    faExclamationTriangle,
    faCheckCircle,
    faPlus
} from '@fortawesome/free-solid-svg-icons';
import './Parties.css';
import PartyHeader from './Party/PartyHeader';
import AddNewParty from './Party/AddNewParty';
import partyService from '../../services/partyService';
import paymentService from '../../services/paymentService';
import PayIn from './Party/PayIn';
import PayOut from './Party/PayOut';
import TransactionTable from './Party/TransactionTable';

function Parties() {
    // State for managing parties
    const [parties, setParties] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null);

    // Loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingParties, setIsLoadingParties] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingParty, setEditingParty] = useState(null);
    const [showPayIn, setShowPayIn] = useState(false);
    const [showPayOut, setShowPayOut] = useState(false);
    
    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [transactionSearchQuery, setTransactionSearchQuery] = useState('');

    // Filter states
    const [partyTypeFilter, setPartyTypeFilter] = useState('all'); // all, customer, vendor, both

    // Sorting states
    const [sortConfig, setSortConfig] = useState({
        key: 'createdAt',
        direction: 'desc'
    });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalParties, setTotalParties] = useState(0);
    const partiesPerPage = 20;

    // Transaction states - for TransactionTable component
    const [transactions, setTransactions] = useState([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [transactionsPagination, setTransactionsPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0
    });

    // Transaction refresh trigger
    const [transactionRefreshTrigger, setTransactionRefreshTrigger] = useState(0);

    // Current company state (you might get this from a context or prop)
    const [currentCompany, setCurrentCompany] = useState({
        id: '507f1f77bcf86cd799439012',
        _id: '507f1f77bcf86cd799439012',
        name: 'Your Company Name',
        // Add other company details as needed
    });

    // Helper function to format currency safely
    const formatCurrency = (amount) => {
        const numericAmount = parseFloat(amount) || 0;
        return numericAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Helper function to normalize party data
    const normalizeParty = (party) => {
        return {
            id: party._id || party.id,
            _id: party._id || party.id,
            name: party.name || '',
            phone: party.phoneNumber || party.phone || '',
            phoneNumber: party.phoneNumber || party.phone || '',
            email: party.email || '',
            address: party.homeAddress?.addressLine || party.homeAddressLine || party.address || '',
            partyType: party.partyType || 'customer',
            balance: parseFloat(party.currentBalance || party.balance || party.openingBalance) || 0,
            currentBalance: parseFloat(party.currentBalance || party.balance || party.openingBalance) || 0,
            openingBalance: parseFloat(party.openingBalance) || 0,
            openingBalanceType: party.openingBalanceType || 'debit',
            companyName: party.companyName || '',
            gstNumber: party.gstNumber || '',
            country: party.country || 'INDIA',
            
            // Address fields
            homeAddressLine: party.homeAddress?.addressLine || party.homeAddressLine || '',
            homePincode: party.homeAddress?.pincode || party.homePincode || '',
            homeState: party.homeAddress?.state || party.homeState || '',
            homeDistrict: party.homeAddress?.district || party.homeDistrict || '',
            homeTaluka: party.homeAddress?.taluka || party.homeTaluka || '',
            
            deliveryAddressLine: party.deliveryAddress?.addressLine || party.deliveryAddressLine || '',
            deliveryPincode: party.deliveryAddress?.pincode || party.deliveryPincode || '',
            deliveryState: party.deliveryAddress?.state || party.deliveryState || '',
            deliveryDistrict: party.deliveryAddress?.district || party.deliveryDistrict || '',
            deliveryTaluka: party.deliveryAddress?.taluka || party.deliveryTaluka || '',
            sameAsHomeAddress: party.sameAsHomeAddress || false,
            
            phoneNumbers: party.phoneNumbers || [],
            isActive: party.isActive !== false,
            createdAt: party.createdAt,
            updatedAt: party.updatedAt
        };
    };

    // Load transactions for selected party - for TransactionTable component
    const loadTransactions = async (partyId, options = {}) => {
        if (!partyId) {
            setTransactions([]);
            return;
        }

        try {
            setIsLoadingTransactions(true);
            setError('');

            const filters = {
                partyId: partyId,
                page: options.page || 1,
                limit: 20,
                search: transactionSearchQuery,
                sortBy: options.sortBy || 'paymentDate',
                sortOrder: options.sortOrder || 'desc'
            };

            console.log('🔄 Loading transactions for party:', partyId, filters);

            const response = await paymentService.getPayments(filters);

            if (response.success) {
                // Transform payment data to transaction format
                const transformedTransactions = response.data.payments.map(payment => ({
                    id: payment._id || payment.id,
                    type: getTransactionType(payment.type, payment.paymentMethod),
                    number: payment.paymentNumber,
                    date: new Date(payment.paymentDate).toLocaleDateString('en-GB'),
                    total: payment.amount,
                    amount: payment.amount,
                    balance: payment.partyBalanceAfter,
                    paymentMethod: payment.paymentMethod,
                    reference: payment.reference,
                    notes: payment.notes,
                    status: payment.status,
                    createdAt: payment.createdAt,
                    paymentDate: payment.paymentDate,
                    originalPayment: payment
                }));

                // Sort transactions by date (recent first)
                const sortedTransactions = transformedTransactions.sort((a, b) => {
                    const dateA = new Date(a.paymentDate);
                    const dateB = new Date(b.paymentDate);
                    return dateB - dateA;
                });

                setTransactions(sortedTransactions);
                
                if (response.data.pagination) {
                    setTransactionsPagination({
                        currentPage: response.data.pagination.currentPage,
                        totalPages: response.data.pagination.totalPages,
                        totalRecords: response.data.pagination.totalRecords
                    });
                }

                console.log('✅ Transactions loaded and sorted (recent first):', sortedTransactions.length);
            } else {
                throw new Error(response.message || 'Failed to load transactions');
            }
        } catch (error) {
            console.error('❌ Error loading transactions:', error);
            setError('Failed to load transactions: ' + error.message);
            setTransactions([]);
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    // Helper function to get transaction type based on payment data
    const getTransactionType = (paymentType, paymentMethod) => {
        if (paymentType === 'payment_in') {
            return 'Receipt Voucher';
        } else if (paymentType === 'payment_out') {
            return 'Payment Voucher';
        }
        return paymentMethod === 'cash' ? 'Cash Transaction' : 'Bank Transaction';
    };

    // Load parties from backend
    const loadParties = async (options = {}) => {
        try {
            setIsLoadingParties(true);
            setError('');

            const filters = {
                page: options.page || currentPage,
                limit: partiesPerPage,
                search: options.search || searchQuery,
                partyType: options.partyType || (partyTypeFilter === 'all' ? undefined : partyTypeFilter),
                sortBy: sortConfig.key,
                sortOrder: sortConfig.direction
            };

            console.log('🔄 Loading parties with filters:', filters);

            const response = await partyService.getParties(filters);

            if (response.success) {
                const normalizedParties = response.data.parties.map(normalizeParty);
                setParties(normalizedParties);
                
                // Update pagination info
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.total);
                    setTotalParties(response.data.pagination.totalItems);
                    setCurrentPage(response.data.pagination.current);
                }

                // Select first party if none selected
                if (normalizedParties.length > 0 && !selectedParty) {
                    setSelectedParty(normalizedParties[0]);
                    // Load transactions for the first party
                    loadTransactions(normalizedParties[0]._id || normalizedParties[0].id);
                }

                console.log('✅ Parties loaded:', normalizedParties.length);
            } else {
                throw new Error(response.message || 'Failed to load parties');
            }
        } catch (error) {
            console.error('❌ Error loading parties:', error);
            setError('Failed to load parties: ' + error.message);
        } finally {
            setIsLoadingParties(false);
        }
    };

    // Search parties with debouncing
    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            setCurrentPage(1); // Reset to first page on search
            loadParties({ search: searchQuery, page: 1 });
        }, 500);

        return () => clearTimeout(searchTimeout);
    }, [searchQuery]);

    // Reload when filters or sorting change
    useEffect(() => {
        setCurrentPage(1);
        loadParties({ page: 1 });
    }, [partyTypeFilter, sortConfig]);

    // Initial load
    useEffect(() => {
        loadParties();
    }, []);

    // Reload transactions when search query changes
    useEffect(() => {
        if (selectedParty && transactionSearchQuery !== undefined) {
            const searchTimeout = setTimeout(() => {
                loadTransactions(selectedParty._id || selectedParty.id, { page: 1 });
            }, 500);

            return () => clearTimeout(searchTimeout);
        }
    }, [transactionSearchQuery]);

    // Reload transactions when refresh trigger changes
    useEffect(() => {
        if (selectedParty && transactionRefreshTrigger > 0) {
            loadTransactions(selectedParty._id || selectedParty.id);
        }
    }, [transactionRefreshTrigger]);

    // Clear alerts after 5 seconds
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError('');
                setSuccess('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Handle sorting
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Handle party selection
    const handlePartySelect = (party) => {
        const normalizedParty = normalizeParty(party);
        setSelectedParty(normalizedParty);

        // Load actual transactions from backend
        loadTransactions(normalizedParty._id || normalizedParty.id);
    };

    // Get sort icon for a specific column
    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return faSort;
        }
        return sortConfig.direction === 'asc' ? faSortUp : faSortDown;
    };

    // Modal handlers
    const handleOpenModal = () => {
        setEditingParty(null);
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingParty(null);
    };

    // Handle edit party
    const handleEditParty = (party) => {
        setEditingParty(normalizeParty(party));
        setShowAddModal(true);
    };

    // Handle save party with backend integration
    const handleSaveParty = async (partyData, isQuickAdd = false, isEdit = false) => {
        try {
            console.log('💾 Handling save party:', { partyData, isQuickAdd, isEdit });

            const normalizedParty = normalizeParty(partyData);

            if (isEdit) {
                // Update existing party in local state
                setParties(prevParties =>
                    prevParties.map(party =>
                        (party.id === normalizedParty.id || party._id === normalizedParty._id) ? normalizedParty : party
                    )
                );

                // Update selected party if it's the one being edited
                if (selectedParty && (selectedParty.id === normalizedParty.id || selectedParty._id === normalizedParty._id)) {
                    setSelectedParty(normalizedParty);
                }

                setSuccess('Party updated successfully!');
            } else {
                // Add new party to local state
                setParties(prevParties => [normalizedParty, ...prevParties]);
                setTotalParties(prev => prev + 1);

                // Select the new party
                setSelectedParty(normalizedParty);

                if (isQuickAdd) {
                    setSuccess('Quick customer added successfully!');
                } else {
                    setSuccess('Party added successfully!');
                }
            }

            handleCloseModal();

        } catch (error) {
            console.error('❌ Error in handleSaveParty:', error);
            setError('Error saving party: ' + error.message);
        }
    };

    // Handle delete party
    const handleDeleteParty = async (party) => {
        if (!window.confirm(`Are you sure you want to delete "${party.name}"?`)) {
            return;
        }

        try {
            setIsLoading(true);
            console.log('🗑️ Deleting party:', party.id || party._id);

            const response = await partyService.deleteParty(party.id || party._id);

            if (response.success) {
                // Remove from local state
                setParties(prevParties => 
                    prevParties.filter(p => p.id !== party.id && p._id !== party._id)
                );
                setTotalParties(prev => prev - 1);

                // Clear selection if deleted party was selected
                if (selectedParty && (selectedParty.id === party.id || selectedParty._id === party._id)) {
                    setSelectedParty(null);
                    setTransactions([]);
                }

                setSuccess('Party deleted successfully!');
            } else {
                throw new Error(response.message || 'Failed to delete party');
            }
        } catch (error) {
            console.error('❌ Error deleting party:', error);
            setError('Failed to delete party: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle refresh parties
    const handleRefreshParties = () => {
        setCurrentPage(1);
        loadParties({ page: 1 });
    };

    // Handle payment actions
    const handlePayIn = () => {
        if (selectedParty) {
            setShowPayIn(true);
        }
    };

    const handlePayOut = () => {
        if (selectedParty) {
            setShowPayOut(true);
        }
    };

    // Handle payment recorded callback
    const handlePaymentRecorded = (paymentData, updatedParty) => {
        console.log('💰 Payment recorded:', paymentData);
        
        // Update party in local state
        if (updatedParty) {
            const normalizedUpdatedParty = normalizeParty(updatedParty);
            
            setParties(prevParties =>
                prevParties.map(party =>
                    (party.id === normalizedUpdatedParty.id || party._id === normalizedUpdatedParty._id) 
                        ? normalizedUpdatedParty 
                        : party
                )
            );

            // Update selected party
            if (selectedParty && (selectedParty.id === normalizedUpdatedParty.id || selectedParty._id === normalizedUpdatedParty._id)) {
                setSelectedParty(normalizedUpdatedParty);
            }
        }

        // Show success message
        const paymentType = paymentData.type === 'payment_in' ? 'received' : 'made';
        setSuccess(`Payment of ₹${paymentData.amount} ${paymentType} successfully!`);

        // Close payment modals
        setShowPayIn(false);
        setShowPayOut(false);

        // Trigger transaction refresh
        setTransactionRefreshTrigger(prev => prev + 1);
    };

    // Handle pagination
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        loadParties({ page: newPage });
    };

    // PartyHeader event handlers
    const handleAddSale = () => {
        console.log('Add Sale clicked');
        // TODO: Implement add sale functionality
    };

    const handleAddPurchase = () => {
        console.log('Add Purchase clicked');
        // TODO: Implement add purchase functionality
    };

    const handleMoreOptions = () => {
        console.log('More options clicked');
        // TODO: Implement more options
    };

    const handleSettings = () => {
        console.log('Settings clicked');
        // TODO: Implement settings
    };

    const handleExportParties = () => {
        console.log('Export parties clicked');
        // TODO: Implement export functionality
    };

    return (
        <div className="parties-layout bg-light min-vh-100" style={{ fontSize: '13px' }}>
            {/* Party Header Component */}
            <PartyHeader
                activeType={partyTypeFilter}
                onTypeChange={setPartyTypeFilter}
                transactionSearchQuery={transactionSearchQuery}
                onTransactionSearchChange={setTransactionSearchQuery}
                totalParties={totalParties}
                onAddParty={handleOpenModal}
                onAddSale={handleAddSale}
                onAddPurchase={handleAddPurchase}
                onRefreshParties={handleRefreshParties}
                isLoadingParties={isLoadingParties}
                onMoreOptions={handleMoreOptions}
                onSettings={handleSettings}
                onExportParties={handleExportParties}
            />

            {/* Error/Success Alerts */}
            {error && (
                <Alert variant="danger" className="m-3 mb-0" dismissible onClose={() => setError('')}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" className="m-3 mb-0" dismissible onClose={() => setSuccess('')}>
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    {success}
                </Alert>
            )}

            {/* Main Content */}
            <Container fluid className="p-0">
                <Row className="g-0" style={{ height: 'calc(100vh - 160px)' }}>
                    {/* Left Sidebar - Parties List */}
                    <Col xl={3} lg={4} md={5} className="bg-white border-end">
                        <div className="h-100 d-flex flex-column">
                            {/* Search Party */}
                            <div className="p-2 border-bottom bg-light">
                                <InputGroup size="sm">
                                    <InputGroup.Text className="bg-white border-end-0 rounded-start-pill">
                                        <FontAwesomeIcon icon={faSearch} className="text-muted" size="sm" />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search Party Name"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="border-start-0 rounded-end-pill"
                                        style={{ fontSize: '13px' }}
                                    />
                                </InputGroup>
                            </div>

                            {/* Parties List Header */}
                            <div className="bg-light border-bottom px-2 py-1">
                                <Row className="align-items-center">
                                    <Col>
                                        <small
                                            className="text-muted fw-bold text-uppercase d-flex align-items-center cursor-pointer"
                                            style={{ fontSize: '11px' }}
                                            onClick={() => handleSort('name')}
                                        >
                                            <FontAwesomeIcon icon={faFilter} className="me-1" size="xs" />
                                            Party Name
                                            <FontAwesomeIcon
                                                icon={getSortIcon('name')}
                                                className="ms-auto"
                                                size="xs"
                                            />
                                        </small>
                                    </Col>
                                    <Col xs="auto">
                                        <small
                                            className="text-muted fw-bold text-uppercase d-flex align-items-center cursor-pointer"
                                            style={{ fontSize: '11px' }}
                                            onClick={() => handleSort('balance')}
                                        >
                                            Amount
                                            <FontAwesomeIcon
                                                icon={getSortIcon('balance')}
                                                className="ms-1"
                                                size="xs"
                                            />
                                        </small>
                                    </Col>
                                </Row>
                            </div>

                            {/* Parties List */}
                            <div className="flex-grow-1 parties-list-container">
                                {isLoadingParties ? (
                                    <div className="d-flex justify-content-center align-items-center h-100">
                                        <Spinner animation="border" size="sm" />
                                        <span className="ms-2">Loading parties...</span>
                                    </div>
                                ) : parties.length === 0 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100 p-3">
                                        <FontAwesomeIcon icon={faUser} size="2x" className="text-muted mb-2" />
                                        <p className="text-muted text-center" style={{ fontSize: '13px' }}>
                                            {searchQuery ? 'No parties found matching your search' : 'No parties found'}
                                        </p>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={handleOpenModal}
                                            style={{ fontSize: '12px' }}
                                        >
                                            <FontAwesomeIcon icon={faPlus} className="me-1" />
                                            Add First Party
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="border-0">
                                        {parties.map((party) => {
                                            const isSelected = selectedParty && (selectedParty.id === party.id || selectedParty._id === party._id);
                                            return (
                                                <div
                                                    key={party.id || party._id}
                                                    className={`border-0 border-bottom party-item p-2 position-relative ${
                                                        isSelected
                                                            ? 'bg-primary bg-opacity-75 text-white'
                                                            : 'bg-white'
                                                    }`}
                                                    style={{
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s ease'
                                                    }}
                                                    onClick={() => handlePartySelect(party)}
                                                >
                                                    <Row className="align-items-center">
                                                        <Col>
                                                            <div className="d-flex justify-content-between align-items-start">
                                                                <div className="flex-grow-1">
                                                                    <div
                                                                        className={`fw-bold mb-1 ${
                                                                            isSelected ? 'text-white' : 'text-dark'
                                                                        }`}
                                                                        style={{ fontSize: '13px' }}
                                                                    >
                                                                        {party.name}
                                                                        <Badge 
                                                                            bg={party.partyType === 'customer' ? 'success' : party.partyType === 'vendor' ? 'warning' : 'info'} 
                                                                            className="ms-2" 
                                                                            style={{ fontSize: '10px' }}
                                                                        >
                                                                            {party.partyType}
                                                                        </Badge>
                                                                    </div>
                                                                    <small
                                                                        className={
                                                                            isSelected ? 'text-white text-opacity-75' : 'text-muted'
                                                                        }
                                                                        style={{ fontSize: '11px' }}
                                                                    >
                                                                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                                        {party.phone}
                                                                    </small>
                                                                </div>
                                                                
                                                                {/* Party Actions */}
                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                    <Dropdown align="end">
                                                                        <Dropdown.Toggle
                                                                            variant="link"
                                                                            className="p-0 border-0 shadow-none bg-transparent"
                                                                            style={{ fontSize: '12px' }}
                                                                        >
                                                                            <FontAwesomeIcon 
                                                                                icon={faEllipsisV} 
                                                                                className={isSelected ? 'text-white' : 'text-muted'} 
                                                                                size="sm" 
                                                                            />
                                                                        </Dropdown.Toggle>
                                                                        <Dropdown.Menu>
                                                                            <Dropdown.Item 
                                                                                onClick={() => handleEditParty(party)}
                                                                                style={{ fontSize: '12px' }}
                                                                            >
                                                                                <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                                                Edit
                                                                            </Dropdown.Item>
                                                                            <Dropdown.Divider />
                                                                            <Dropdown.Item 
                                                                                onClick={() => handleDeleteParty(party)}
                                                                                className="text-danger"
                                                                                style={{ fontSize: '12px' }}
                                                                            >
                                                                                <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                                                Delete
                                                                            </Dropdown.Item>
                                                                        </Dropdown.Menu>
                                                                    </Dropdown>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="mt-1">
                                                                <div
                                                                    className={`fw-bold ${
                                                                        isSelected
                                                                            ? 'text-white'
                                                                            : party.balance > 0
                                                                            ? 'text-success'
                                                                            : party.balance < 0
                                                                            ? 'text-danger'
                                                                            : 'text-secondary'
                                                                    }`}
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    ₹{formatCurrency(party.balance)}
                                                                    <small className="ms-1 opacity-75">
                                                                        ({party.openingBalanceType})
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="p-2 border-top bg-light">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            disabled={currentPage <= 1}
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            style={{ fontSize: '11px' }}
                                        >
                                            Previous
                                        </Button>
                                        <small className="text-muted" style={{ fontSize: '11px' }}>
                                            Page {currentPage} of {totalPages}
                                        </small>
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            disabled={currentPage >= totalPages}
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            style={{ fontSize: '11px' }}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Bottom Contact Info */}
                            <div className="p-2 border-top bg-light">
                                <Card className="border-0 bg-success bg-opacity-10 text-center">
                                    <Card.Body className="p-2">
                                        <FontAwesomeIcon icon={faPhone} className="text-success mb-1" />
                                        <div className="small text-muted" style={{ fontSize: '11px' }}>
                                            Use contacts from your Phone or Gmail to{' '}
                                            <strong className="text-dark">quickly create parties.</strong>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </div>
                        </div>
                    </Col>

                    {/* Right Content Area - Party Details with TransactionTable */}
                    <Col xl={9} lg={8} md={7}>
                        {selectedParty ? (
                            <div className="h-100 bg-white">
                                {/* Party Header */}
                                <div className="border-bottom p-3 bg-light">
                                    <Row className="align-items-center">
                                        <Col>
                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                <div>
                                                    <h5 className="mb-1 fw-bold d-flex align-items-center" style={{ fontSize: '16px' }}>
                                                        {selectedParty.name}
                                                        <Badge 
                                                            bg={selectedParty.partyType === 'customer' ? 'success' : selectedParty.partyType === 'vendor' ? 'warning' : 'info'} 
                                                            className="ms-2" 
                                                            style={{ fontSize: '11px' }}
                                                        >
                                                            {selectedParty.partyType}
                                                        </Badge>
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            className="p-1 ms-2 text-primary"
                                                            onClick={() => handleEditParty(selectedParty)}
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} size="sm" />
                                                        </Button>
                                                    </h5>
                                                    <div className="text-muted" style={{ fontSize: '12px' }}>
                                                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                        {selectedParty.phone}
                                                        {selectedParty.email && (
                                                            <>
                                                                <span className="mx-2">|</span>
                                                                <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                                                                {selectedParty.email}
                                                            </>
                                                        )}
                                                        {selectedParty.address && (
                                                            <>
                                                                <span className="mx-2">|</span>
                                                                <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                                                                {selectedParty.address}
                                                            </>
                                                        )}
                                                    </div>
                                                    {selectedParty.companyName && (
                                                        <div className="text-muted mt-1" style={{ fontSize: '12px' }}>
                                                            <FontAwesomeIcon icon={faBuilding} className="me-1" />
                                                            {selectedParty.companyName}
                                                            {selectedParty.gstNumber && (
                                                                <span className="ms-2">GST: {selectedParty.gstNumber}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={handlePayIn}
                                                        className="px-2 border-2"
                                                        style={{ fontSize: '12px' }}
                                                    >
                                                        <FontAwesomeIcon icon={faArrowDown} className="me-1" />
                                                        Pay In
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={handlePayOut}
                                                        className="px-2 border-2"
                                                        style={{ fontSize: '12px' }}
                                                    >
                                                        <FontAwesomeIcon icon={faArrowUp} className="me-1" />
                                                        Pay Out
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>

                                {/* TransactionTable Component */}
                                <div className="p-3 h-100">
                                    <TransactionTable
                                        selectedParty={selectedParty}
                                        transactions={transactions}
                                        isLoadingTransactions={isLoadingTransactions}
                                        transactionsPagination={transactionsPagination}
                                        transactionSearchQuery={transactionSearchQuery}
                                        setTransactionSearchQuery={setTransactionSearchQuery}
                                        onLoadTransactions={loadTransactions}
                                        onPayIn={handlePayIn}
                                        onPayOut={handlePayOut}
                                        formatCurrency={formatCurrency}
                                        refreshTrigger={transactionRefreshTrigger}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="h-100 d-flex align-items-center justify-content-center bg-light">
                                <Card className="border-0 bg-white text-center shadow-sm">
                                    <Card.Body className="p-4">
                                        <FontAwesomeIcon icon={faUser} size="2x" className="text-muted mb-3" />
                                        <h6 className="text-muted" style={{ fontSize: '14px' }}>Select a party to view details</h6>
                                        <p className="text-muted mb-0" style={{ fontSize: '12px' }}>Choose a party from the list to see their information and transactions</p>
                                    </Card.Body>
                                </Card>
                            </div>
                        )}
                    </Col>
                </Row>
            </Container>

            {/* Add Party Modal */}
            <AddNewParty
                show={showAddModal}
                onHide={handleCloseModal}
                editingParty={editingParty}
                onSaveParty={handleSaveParty}
                isQuickAdd={false}
            />

            {/* Payment Modals */}
            <PayIn
                show={showPayIn}
                onHide={() => setShowPayIn(false)}
                party={selectedParty}
                onPaymentRecorded={handlePaymentRecorded}
                currentCompany={currentCompany}
            />

            <PayOut
                show={showPayOut}
                onHide={() => setShowPayOut(false)}
                party={selectedParty}
                onPaymentRecorded={handlePaymentRecorded}
                currentCompany={currentCompany}
            />

            {/* Loading Overlay */}
            {isLoading && (
                <div 
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50" 
                    style={{ zIndex: 9999 }}
                >
                    <div className="bg-white rounded p-3 text-center">
                        <Spinner animation="border" className="mb-2" />
                        <div>Processing...</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Parties;