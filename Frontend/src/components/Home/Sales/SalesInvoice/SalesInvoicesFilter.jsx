import React from 'react';
import { Container, Row, Col, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarAlt,
    faChevronDown
} from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesFilter({
    dateRange,
    startDate,
    endDate,
    selectedFirm,
    dateRangeOptions,
    firmOptions,
    onDateRangeChange,
    onStartDateChange,
    onEndDateChange,
    onFirmChange
}) {
    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    const formatDateDisplay = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="filter-section bg-white border-bottom">
            <Container fluid>
                <div className="filter-container py-3">
                    <Row className="align-items-center g-3">
                        {/* Filter by label */}
                        <Col xs="auto">
                            <span className="filter-by-label">Filter by :</span>
                        </Col>

                        {/* Date Range Dropdown */}
                        <Col xs="auto">
                            <Dropdown className="date-range-dropdown">
                                <Dropdown.Toggle
                                    variant="outline-primary"
                                    size="sm"
                                    className="custom-dropdown-toggle"
                                    id="date-range-dropdown"
                                >
                                    {dateRange}
                                    <FontAwesomeIcon icon={faChevronDown} className="ms-2" />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    {dateRangeOptions?.map((option) => (
                                        <Dropdown.Item
                                            key={option}
                                            onClick={() => onDateRangeChange(option)}
                                            active={dateRange === option}
                                        >
                                            {option}
                                        </Dropdown.Item>
                                    ))}
                                </Dropdown.Menu>
                            </Dropdown>
                        </Col>

                        {/* Start Date */}
                        <Col xs="auto">
                            <InputGroup size="sm" className="date-input-group">
                                <InputGroup.Text className="date-icon-wrapper">
                                    <FontAwesomeIcon icon={faCalendarAlt} className="date-calendar-icon" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="date"
                                    value={formatDateForInput(startDate)}
                                    onChange={onStartDateChange}
                                    className="custom-date-input"
                                />
                            </InputGroup>
                        </Col>

                        {/* To label */}
                        <Col xs="auto">
                            <span className="to-label">To</span>
                        </Col>

                        {/* End Date */}
                        <Col xs="auto">
                            <Form.Control
                                type="date"
                                size="sm"
                                value={formatDateForInput(endDate)}
                                onChange={onEndDateChange}
                                className="custom-date-input-end"
                            />
                        </Col>

                        {/* Firm Dropdown */}
                        <Col xs="auto">
                            <Dropdown className="firm-dropdown">
                                <Dropdown.Toggle
                                    variant="outline-secondary"
                                    size="sm"
                                    className="custom-dropdown-toggle"
                                    id="firm-dropdown"
                                >
                                    {selectedFirm}
                                    <FontAwesomeIcon icon={faChevronDown} className="ms-2" />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    {firmOptions?.map((firm) => (
                                        <Dropdown.Item
                                            key={firm}
                                            onClick={() => onFirmChange(firm)}
                                            active={selectedFirm === firm}
                                        >
                                            {firm}
                                        </Dropdown.Item>
                                    ))}
                                </Dropdown.Menu>
                            </Dropdown>
                        </Col>
                    </Row>
                </div>
            </Container>
        </div>
    );
}

export default SalesInvoicesFilter;