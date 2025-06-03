import React from 'react';
import { Card, Row, Col, InputGroup, Form, ButtonGroup, Button, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faDownload, faTimes } from '@fortawesome/free-solid-svg-icons';

function PartyFilters({
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterLocation,
    setFilterLocation,
    activeLocationFilter,
    setActiveLocationFilter,
    locationOptions,
    filteredParties,
    totalParties,
    showDatabaseSearch,
    setShowDatabaseSearch,
    onClearFilters
}) {
    return (
        <Card className="mb-4 border-0 shadow-sm">
            <Card.Body className="p-3">
                <Row className="align-items-center mb-2">
                    <Col md={6}>
                        <InputGroup>
                            <InputGroup.Text className="bg-light border-end-0">
                                <FontAwesomeIcon icon={faSearch} className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search parties by name, phone, email, city..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-start-0"
                            />
                        </InputGroup>
                    </Col>
                    <Col md={3}>
                        <Form.Select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="form-input"
                        >
                            <option value="all">All Party Types</option>
                            <option value="customer">Regular Customers</option>
                            <option value="running">Running Customers</option>
                            <option value="supplier">Suppliers</option>
                        </Form.Select>
                    </Col>
                    <Col md={3}>
                        <Button
                            variant="outline-primary"
                            onClick={() => setShowDatabaseSearch(!showDatabaseSearch)}
                            className="w-100"
                        >
                            <FontAwesomeIcon icon={faDownload} className="me-2" />
                            Import from Database
                        </Button>
                    </Col>
                </Row>

                {/* Location filters */}
                <Row className="mt-2">
                    <Col md={3} className="d-flex align-items-center">
                        <Form.Label className="mb-0 me-2 text-nowrap small">Filter by:</Form.Label>
                        <ButtonGroup size="sm">
                            <Button
                                variant={activeLocationFilter === 'city' ? 'primary' : 'outline-primary'}
                                onClick={() => {
                                    setActiveLocationFilter('city');
                                    setFilterLocation('all');
                                }}
                                className="px-2"
                            >
                                City
                            </Button>
                            <Button
                                variant={activeLocationFilter === 'taluka' ? 'primary' : 'outline-primary'}
                                onClick={() => {
                                    setActiveLocationFilter('taluka');
                                    setFilterLocation('all');
                                }}
                                className="px-2"
                            >
                                Taluka
                            </Button>
                            <Button
                                variant={activeLocationFilter === 'state' ? 'primary' : 'outline-primary'}
                                onClick={() => {
                                    setActiveLocationFilter('state');
                                    setFilterLocation('all');
                                }}
                                className="px-2"
                            >
                                State
                            </Button>
                        </ButtonGroup>
                    </Col>
                    <Col md={7}>
                        {activeLocationFilter && (
                            <Form.Select
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                size="sm"
                            >
                                <option value="all">All {activeLocationFilter === 'city' ? 'Cities' :
                                    activeLocationFilter === 'taluka' ? 'Talukas' : 'States'}</option>
                                {locationOptions[`${activeLocationFilter}s`]?.map((location) => (
                                    <option key={location} value={location}>
                                        {location}
                                    </option>
                                ))}
                            </Form.Select>
                        )}
                    </Col>
                    <Col md={2}>
                        <div className="text-muted text-end small">
                            {filteredParties.length} of {totalParties} parties
                        </div>
                    </Col>
                </Row>

                {/* Display active filters */}
                {(filterType !== 'all' || filterLocation !== 'all' || searchQuery) && (
                    <Row className="mt-2">
                        <Col>
                            <div className="d-flex gap-2 align-items-center">
                                <small className="text-muted">Active filters:</small>
                                {filterType !== 'all' && (
                                    <Badge bg="info" className="d-flex align-items-center">
                                        Type: {filterType === 'customer' ? 'Customers' :
                                            filterType === 'running' ? 'Running Customers' : 'Suppliers'}
                                        <Button
                                            variant="link"
                                            className="p-0 ms-1 text-white"
                                            size="sm"
                                            onClick={() => setFilterType('all')}
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </Button>
                                    </Badge>
                                )}
                                {filterLocation !== 'all' && (
                                    <Badge bg="info" className="d-flex align-items-center">
                                        {activeLocationFilter}: {filterLocation}
                                        <Button
                                            variant="link"
                                            className="p-0 ms-1 text-white"
                                            size="sm"
                                            onClick={() => setFilterLocation('all')}
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </Button>
                                    </Badge>
                                )}
                                {searchQuery && (
                                    <Badge bg="info" className="d-flex align-items-center">
                                        Search: {searchQuery}
                                        <Button
                                            variant="link"
                                            className="p-0 ms-1 text-white"
                                            size="sm"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </Button>
                                    </Badge>
                                )}
                                <Button
                                    variant="link"
                                    className="ms-auto p-0 text-muted"
                                    size="sm"
                                    onClick={onClearFilters}
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        </Col>
                    </Row>
                )}
            </Card.Body>
        </Card>
    );
}

export default PartyFilters;