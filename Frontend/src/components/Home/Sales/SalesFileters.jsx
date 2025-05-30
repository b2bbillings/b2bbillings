import React from 'react';
import { Row, Col, InputGroup, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

function SalesFilters({ searchQuery, setSearchQuery, dateFilter, setDateFilter }) {
    return (
        <Row className="mb-3">
            <Col md={6}>
                <InputGroup>
                    <Form.Control
                        type="text"
                        placeholder="Search by customer name or invoice number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <InputGroup.Text>
                        <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                </InputGroup>
            </Col>
            <Col md={3}>
                <Form.Control
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    placeholder="From Date"
                />
            </Col>
            <Col md={3}>
                <Form.Control
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="To Date"
                />
            </Col>
        </Row>
    );
}

export default SalesFilters;