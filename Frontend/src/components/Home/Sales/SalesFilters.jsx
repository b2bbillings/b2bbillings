import React from 'react';
import { Row, Col, InputGroup, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faSortAmountDown, faSortAmountUp } from '@fortawesome/free-solid-svg-icons';

function SalesFilters({
    searchQuery = '',
    setSearchQuery = () => { },
    dateFilter = { from: '', to: '' },
    setDateFilter = () => { },
    statusFilter = 'all',
    setStatusFilter = () => { },
    paymentStatusFilter = 'all',
    setPaymentStatusFilter = () => { },
    sortConfig = { field: 'createdAt', direction: 'desc' },
    setSortConfig = () => { }
}) {

    const handleSortChange = (field) => {
        const newDirection = sortConfig.field === field && sortConfig.direction === 'desc' ? 'asc' : 'desc';
        setSortConfig({ field, direction: newDirection });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setDateFilter({ from: '', to: '' });
        setStatusFilter('all');
        setPaymentStatusFilter('all');
        setSortConfig({ field: 'createdAt', direction: 'desc' });
    };

    return (
        <div className="mb-4">
            {/* Search and Date Filters */}
            <Row className="mb-3">
                <Col md={6}>
                    <InputGroup>
                        <InputGroup.Text>
                            <FontAwesomeIcon icon={faSearch} />
                        </InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder="Search by customer name or invoice number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </InputGroup>
                </Col>
                <Col md={3}>
                    <Form.Control
                        type="date"
                        value={dateFilter.from || ''}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                        placeholder="From Date"
                    />
                </Col>
                <Col md={3}>
                    <Form.Control
                        type="date"
                        value={dateFilter.to || ''}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="To Date"
                    />
                </Col>
            </Row>

            {/* Status Filters and Sort */}
            <Row className="mb-3">
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="small text-muted mb-1">Status Filter</Form.Label>
                        <Form.Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            size="sm"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="small text-muted mb-1">Payment Status</Form.Label>
                        <Form.Select
                            value={paymentStatusFilter}
                            onChange={(e) => setPaymentStatusFilter(e.target.value)}
                            size="sm"
                        >
                            <option value="all">All Payments</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="overdue">Overdue</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label className="small text-muted mb-1">Sort By</Form.Label>
                        <Form.Select
                            value={sortConfig.field}
                            onChange={(e) => handleSortChange(e.target.value)}
                            size="sm"
                        >
                            <option value="createdAt">Date Created</option>
                            <option value="invoiceDate">Invoice Date</option>
                            <option value="customerName">Customer Name</option>
                            <option value="total">Amount</option>
                            <option value="invoiceNumber">Invoice Number</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3} className="d-flex align-items-end gap-2">
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleSortChange(sortConfig.field)}
                        title={`Sort ${sortConfig.direction === 'desc' ? 'Ascending' : 'Descending'}`}
                    >
                        <FontAwesomeIcon
                            icon={sortConfig.direction === 'desc' ? faSortAmountDown : faSortAmountUp}
                        />
                    </Button>
                    <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={clearFilters}
                        title="Clear all filters"
                    >
                        <FontAwesomeIcon icon={faFilter} className="me-1" />
                        Clear
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

export default SalesFilters;