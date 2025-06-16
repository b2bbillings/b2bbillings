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
import { useParams } from 'react-router-dom';
import './Parties.css';
import PartyHeader from './Party/PartyHeader';
import AddNewParty from './Party/AddNewParty';
import partyService from '../../services/partyService';
import paymentService from '../../services/paymentService';
import PayIn from './Party/PayIn';
import PayOut from './Party/PayOut';
import TransactionTable from './Party/TransactionTable';

function Parties() {
    // Get company ID from URL params
    const { companyId } = useParams();

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

    // Current company state - updated with actual company ID from URL
    const [currentCompany, setCurrentCompany] = useState({
        id: companyId,
        _id: companyId,
        name: 'Your Company Name',
    });

    // Update currentCompany when companyId changes
    useEffect(() => {
        if (companyId) {
            setCurrentCompany(prev => ({
                ...prev,
                id: companyId,
                _id: companyId
            }));
        }
    }, [companyId]);

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

    // Helper function to get transaction type based on payment data
    const getTransactionType = (paymentType, paymentMethod) => {
        if (paymentType === 'payment_in') {
            return 'Receipt Voucher';
        } else if (paymentType === 'payment_out') {
            return 'Payment Voucher';
        }
        return paymentMethod === 'cash' ? 'Cash Transaction' : 'Bank Transaction';
    };

    // Load transactions for selected party - FIXED VERSION
    const loadTransactions = async (partyId, options = {}) => {
        if (!partyId) {
            setTransactions([]);
            return;
        }

        // Check if company ID is available
        if (!companyId) {
            console.error('❌ Company ID is required for loading transactions');
            setError('Company ID is required. Please select a company.');
            setTransactions([]);
            return;
        }

        try {
            setIsLoadingTransactions(true);
            setError('');

            // Ensure search is always a string
            const searchValue = transactionSearchQuery || '';
            const searchString = typeof searchValue === 'string' ? searchValue : String(searchValue);

            const filters = {
                partyId: partyId,
                page: options.page || 1,
                limit: 20,
                search: searchString.trim(),
                sortBy: options.sortBy || 'paymentDate',
                sortOrder: options.sortOrder || 'desc'
            };

            console.log('🔄 Loading transactions for party:', partyId, filters);

            // Pass companyId as first parameter to paymentService.getPaymentHistory
            const response = await paymentService.getPaymentHistory(companyId, filters);

            if (response.success) {
                // Transform payment data to transaction format
                const transformedTransactions = (response.data || response.payments || []).map(payment => ({
                    id: payment._id || payment.id,
                    type: getTransactionType(payment.type || payment.paymentType, payment.paymentMethod),
                    number: payment.paymentNumber || payment.transactionId,
                    date: new Date(payment.paymentDate).toLocaleDateString('en-GB'),
                    total: payment.amount || payment.paymentAmount,
                    amount: payment.amount || payment.paymentAmount,
                    balance: payment.partyBalanceAfter || payment.balanceAfter,
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

                if (response.pagination) {
                    setTransactionsPagination({
                        currentPage: response.pagination.currentPage || 1,
                        totalPages: response.pagination.totalPages || 1,
                        totalRecords: response.pagination.totalRecords || sortedTransactions.length
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

    // Load parties from backend - FIXED VERSION
    const loadParties = async (options = {}) => {
        // Check if company ID is available
        if (!companyId) {
            console.error('❌ Company ID is required for loading parties');
            setError('Company ID is required. Please select a company.');
            setIsLoadingParties(false);
            return;
        }

        try {
            setIsLoadingParties(true);
            setError('');

            // Ensure search is always a string - ENHANCED FIX
            let searchValue = options.search;
            if (searchValue === undefined || searchValue === null) {
                searchValue = searchQuery || '';
            }

            // Convert to string and trim, handle all edge cases
            const searchString = String(searchValue).trim();

            // Construct filters object with proper data types
            const filters = {
                page: parseInt(options.page || currentPage, 10),
                limit: parseInt(partiesPerPage, 10),
                search: searchString, // Guaranteed to be a trimmed string
                partyType: options.partyType || (partyTypeFilter === 'all' ? null : partyTypeFilter),
                sortBy: String(sortConfig.key || 'createdAt'),
                sortOrder: String(sortConfig.direction || 'desc')
            };

            // Remove undefined values to avoid issues
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });

            console.log('🔄 Loading parties with filters:', filters);

            // Pass companyId as first parameter
            const response = await partyService.getParties(companyId, filters);

            if (response.success) {
                const normalizedParties = response.data.parties.map(normalizeParty);
                setParties(normalizedParties);

                // Update pagination info
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.total || 1);
                    setTotalParties(response.data.pagination.totalItems || normalizedParties.length);
                    setCurrentPage(response.data.pagination.current || 1);
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

    // Also update the search useEffect to handle edge cases
    useEffect(() => {
        if (companyId) {
            const searchTimeout = setTimeout(() => {
                setCurrentPage(1); // Reset to first page on search

                // Ensure searchQuery is properly handled
                let searchValue = searchQuery;
                if (searchValue === undefined || searchValue === null) {
                    searchValue = '';
                }
                const searchString = String(searchValue).trim();

                loadParties({
                    search: searchString,
                    page: 1
                });
            }, 500);

            return () => clearTimeout(searchTimeout);
        }
    }, [searchQuery, companyId]);

    // Update the filter/sort useEffect as well
    useEffect(() => {
        if (companyId) {
            setCurrentPage(1);
            loadParties({
                page: 1,
                partyType: partyTypeFilter === 'all' ? null : partyTypeFilter
            });
        }
    }, [partyTypeFilter, sortConfig, companyId]);

    // Handle delete party - FIXED VERSION
    const handleDeleteParty = async (party) => {
        if (!window.confirm(`Are you sure you want to delete "${party.name}"?`)) {
            return;
        }

        if (!companyId) {
            setError('Company ID is required. Please select a company.');
            return;
        }

        try {
            setIsLoading(true);
            console.log('🗑️ Deleting party:', party.id || party._id);

            // Pass companyId as first parameter
            const response = await partyService.deleteParty(companyId, party.id || party._id);

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

    // Initial load - FIXED VERSION
    useEffect(() => {
        if (companyId) {
            loadParties();
        }
    }, [companyId]);

    // Reload transactions when search query changes - FIXED VERSION
    useEffect(() => {
        if (selectedParty && companyId && transactionSearchQuery !== undefined) {
            const searchTimeout = setTimeout(() => {
                loadTransactions(selectedParty._id || selectedParty.id, { page: 1 });
            }, 500);

            return () => clearTimeout(searchTimeout);
        }
    }, [transactionSearchQuery, companyId]);

    // Reload transactions when refresh trigger changes - FIXED VERSION
    useEffect(() => {
        if (selectedParty && companyId && transactionRefreshTrigger > 0) {
            loadTransactions(selectedParty._id || selectedParty.id);
        }
    }, [transactionRefreshTrigger, companyId]);

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
        if (companyId) {
            loadTransactions(normalizedParty._id || normalizedParty.id);
        }
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

    // Handle refresh parties
    const handleRefreshParties = () => {
        if (companyId) {
            setCurrentPage(1);
            loadParties({ page: 1 });
        }
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
        if (companyId) {
            loadParties({ page: newPage });
        }
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

    // Early return if no company ID
    if (!companyId) {
        return (
            <div className="parties-layout bg-light min-vh-100 d-flex align-items-center justify-content-center">
                <Card className="border-0 bg-white text-center shadow-sm">
                    <Card.Body className="p-4">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" className="text-warning mb-3" />
                        <h6 className="text-muted" style={{ fontSize: '14px' }}>Company Required</h6>
                        <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                            Please select a company to view parties and transactions
                        </p>
                    </Card.Body>
                </Card>
            </div>
        );
    }

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

                            {/* Parties List with Scroll */}
                            <div
                                className="flex-grow-1 overflow-auto"
                                style={{
                                    maxHeight: 'calc(100vh - 350px)',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: 'rgba(0,0,0,0.3) transparent'
                                }}
                            >
                                {isLoadingParties ? (
                                    <div className="d-flex justify-content-center align-items-center py-5">
                                        <div className="text-center">
                                            <Spinner animation="border" size="sm" variant="primary" />
                                            <div className="mt-2 text-muted small">Loading parties...</div>
                                        </div>
                                    </div>
                                ) : parties.length === 0 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center py-5 px-3">
                                        <FontAwesomeIcon icon={faUser} size="2x" className="text-muted mb-3" />
                                        <h6 className="text-muted text-center mb-2" style={{ fontSize: '14px' }}>
                                            {searchQuery ? 'No parties found' : 'No parties yet'}
                                        </h6>
                                        <p className="text-muted text-center mb-3" style={{ fontSize: '12px' }}>
                                            {searchQuery
                                                ? 'Try adjusting your search terms'
                                                : 'Get started by adding your first party'
                                            }
                                        </p>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleOpenModal}
                                            className="px-3"
                                            style={{ fontSize: '12px' }}
                                        >
                                            <FontAwesomeIcon icon={faPlus} className="me-1" />
                                            Add Party
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="list-group list-group-flush">
                                        {parties.map((party) => {
                                            const isSelected = selectedParty && (selectedParty.id === party.id || selectedParty._id === party._id);
                                            return (
                                                <div
                                                    key={party.id || party._id}
                                                    className={`list-group-item list-group-item-action border-0 border-bottom px-3 py-2 ${isSelected
                                                            ? 'bg-primary text-white'
                                                            : 'bg-white'
                                                        }`}
                                                    style={{
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        minHeight: '70px'
                                                    }}
                                                    onClick={() => handlePartySelect(party)}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) {
                                                            e.target.classList.add('bg-light');
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            e.target.classList.remove('bg-light');
                                                        }
                                                    }}
                                                >
                                                    <Row className="align-items-center g-0">
                                                        <Col className="pe-2">
                                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                                <div className="flex-grow-1 me-2">
                                                                    <div
                                                                        className={`fw-semibold mb-1 ${isSelected ? 'text-white' : 'text-dark'
                                                                            }`}
                                                                        style={{
                                                                            fontSize: '13px',
                                                                            lineHeight: '1.2',
                                                                            wordBreak: 'break-word'
                                                                        }}
                                                                    >
                                                                        {party.name}
                                                                        <Badge
                                                                            bg={
                                                                                party.partyType === 'customer'
                                                                                    ? 'success'
                                                                                    : party.partyType === 'vendor'
                                                                                        ? 'warning'
                                                                                        : 'info'
                                                                            }
                                                                            className="ms-2"
                                                                            style={{ fontSize: '9px' }}
                                                                        >
                                                                            {party.partyType}
                                                                        </Badge>
                                                                    </div>
                                                                    <div
                                                                        className={`small ${isSelected ? 'text-white-50' : 'text-muted'
                                                                            }`}
                                                                        style={{ fontSize: '11px' }}
                                                                    >
                                                                        <FontAwesomeIcon icon={faPhone} className="me-1" />
                                                                        {party.phone}
                                                                    </div>
                                                                </div>

                                                                {/* Party Actions Dropdown */}
                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                    <Dropdown align="end">
                                                                        <Dropdown.Toggle
                                                                            variant="link"
                                                                            className="p-0 border-0 shadow-none text-decoration-none"
                                                                            style={{ fontSize: '12px' }}
                                                                        >
                                                                            <FontAwesomeIcon
                                                                                icon={faEllipsisV}
                                                                                className={isSelected ? 'text-white' : 'text-muted'}
                                                                                size="sm"
                                                                            />
                                                                        </Dropdown.Toggle>
                                                                        <Dropdown.Menu className="shadow-sm">
                                                                            <Dropdown.Item
                                                                                onClick={() => handleEditParty(party)}
                                                                                className="small"
                                                                                style={{ fontSize: '12px' }}
                                                                            >
                                                                                <FontAwesomeIcon icon={faEdit} className="me-2 text-primary" />
                                                                                Edit Party
                                                                            </Dropdown.Item>
                                                                            <Dropdown.Divider />
                                                                            <Dropdown.Item
                                                                                onClick={() => handleDeleteParty(party)}
                                                                                className="text-danger small"
                                                                                style={{ fontSize: '12px' }}
                                                                            >
                                                                                <FontAwesomeIcon icon={faTrash} className="me-2" />
                                                                                Delete Party
                                                                            </Dropdown.Item>
                                                                        </Dropdown.Menu>
                                                                    </Dropdown>
                                                                </div>
                                                            </div>

                                                            {/* Balance Amount */}
                                                            <div className="mt-1">
                                                                <span
                                                                    className={`fw-bold small ${isSelected
                                                                            ? 'text-white'
                                                                            : party.balance > 0
                                                                                ? 'text-success'
                                                                                : party.balance < 0
                                                                                    ? 'text-danger'
                                                                                    : 'text-secondary'
                                                                        }`}
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    ₹{formatCurrency(Math.abs(party.balance))}
                                                                    <small className={`ms-1 ${isSelected ? 'text-white-50' : 'text-muted'}`}>
                                                                        ({party.openingBalanceType})
                                                                    </small>
                                                                </span>
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
                                    <Row className="align-items-center g-2">
                                        <Col>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                disabled={currentPage <= 1}
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                style={{ fontSize: '11px' }}
                                            >
                                                Previous
                                            </Button>
                                        </Col>
                                        <Col xs="auto">
                                            <small className="text-muted" style={{ fontSize: '11px' }}>
                                                Page {currentPage} of {totalPages}
                                            </small>
                                        </Col>
                                        <Col xs="auto">
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                disabled={currentPage >= totalPages}
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                style={{ fontSize: '11px' }}
                                            >
                                                Next
                                            </Button>
                                        </Col>
                                    </Row>
                                </div>
                            )}

                            {/* Bottom Contact Info */}
                            <div className="p-2 border-top bg-light">
                                <Card className="border-0 bg-success bg-opacity-10">
                                    <Card.Body className="p-2 text-center">
                                        <FontAwesomeIcon icon={faPhone} className="text-success mb-1" />
                                        <div className="small text-muted" style={{ fontSize: '11px', lineHeight: '1.3' }}>
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
                                                <div className="flex-grow-1">
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
                                                            title="Edit Party"
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
                                                <div className="d-flex gap-2 flex-shrink-0">
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={handlePayIn}
                                                        className="px-3"
                                                        style={{ fontSize: '12px' }}
                                                    >
                                                        <FontAwesomeIcon icon={faArrowDown} className="me-1" />
                                                        Pay In
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={handlePayOut}
                                                        className="px-3"
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
                                <div className="p-3 h-100 overflow-hidden">
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
                                        companyId={companyId}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="h-100 d-flex align-items-center justify-content-center bg-light">
                                <Card className="border-0 bg-white text-center shadow-sm">
                                    <Card.Body className="p-5">
                                        <FontAwesomeIcon icon={faUser} size="3x" className="text-muted mb-3" />
                                        <h5 className="text-muted mb-2" style={{ fontSize: '16px' }}>Select a party to get started</h5>
                                        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                                            Choose a party from the list to view their details and transaction history
                                        </p>
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
                companyId={companyId}
            />

            {/* Payment Modals */}
            <PayIn
                show={showPayIn}
                onHide={() => setShowPayIn(false)}
                party={selectedParty}
                onPaymentRecorded={handlePaymentRecorded}
                currentCompany={currentCompany}
                companyId={companyId}
                currentUser={currentCompany} // Pass current user if available
            />

            <PayOut
                show={showPayOut}
                onHide={() => setShowPayOut(false)}
                party={selectedParty}
                onPaymentRecorded={handlePaymentRecorded}
                currentCompany={currentCompany}
                companyId={companyId}
                currentUser={currentCompany} // Pass current user if available
            />

            {/* Loading Overlay */}
            {isLoading && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{
                        zIndex: 9999,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <Card className="border-0 shadow-lg">
                        <Card.Body className="p-4 text-center">
                            <Spinner animation="border" variant="primary" className="mb-3" />
                            <h6 className="text-muted mb-0">Processing...</h6>
                        </Card.Body>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default Parties;