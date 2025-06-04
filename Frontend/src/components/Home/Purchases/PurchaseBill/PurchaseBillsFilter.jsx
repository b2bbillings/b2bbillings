import React from 'react';
import { Row, Col, Card, Button, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faPrint } from '@fortawesome/free-solid-svg-icons';

function PurchaseBillsFilter({
    dateRange,
    startDate,
    endDate,
    selectedFirm,
    dateRangeOptions,
    firmOptions,
    onDateRangeChange,
    onStartDateChange,
    onEndDateChange,
    onFirmChange,
    onExcelExport,
    onPrint
}) {
    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    return (
        <Row className="mb-4">
            <Col lg={8}>
                <Card className="filter-card">
                    <Card.Body className="py-3">
                        <Row className="align-items-center">
                            <Col md={3}>
                                <Dropdown>
                                    <Dropdown.Toggle
                                        variant="outline-secondary"
                                        size="sm"
                                        className="w-100 text-start"
                                    >
                                        {dateRange}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        {dateRangeOptions.map((option) => (
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

                            <Col md={2} className="text-center">
                                <span className="text-muted small">Between</span>
                            </Col>

                            <Col md={2}>
                                <InputGroup size="sm">
                                    <Form.Control
                                        type="date"
                                        value={formatDateForInput(startDate)}
                                        onChange={onStartDateChange}
                                    />
                                </InputGroup>
                            </Col>

                            <Col md={1} className="text-center">
                                <span className="text-muted">To</span>
                            </Col>

                            <Col md={2}>
                                <InputGroup size="sm">
                                    <Form.Control
                                        type="date"
                                        value={formatDateForInput(endDate)}
                                        onChange={onEndDateChange}
                                    />
                                </InputGroup>
                            </Col>

                            <Col md={2}>
                                <Dropdown>
                                    <Dropdown.Toggle
                                        variant="outline-secondary"
                                        size="sm"
                                        className="w-100 text-start"
                                    >
                                        {selectedFirm}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        {firmOptions.map((firm) => (
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
                    </Card.Body>
                </Card>
            </Col>

            <Col lg={4}>
                <div className="d-flex gap-2 justify-content-end">
                    <Button
                        variant="outline-success"
                        size="sm"
                        onClick={onExcelExport}
                    >
                        <FontAwesomeIcon icon={faFileExcel} className="me-2" />
                        Excel Report
                    </Button>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={onPrint}
                    >
                        <FontAwesomeIcon icon={faPrint} className="me-2" />
                        Print
                    </Button>
                </div>
            </Col>
        </Row>
    );
}

export default PurchaseBillsFilter;