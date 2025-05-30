import { useState } from 'react';
import { Tab, Tabs, Card, Row, Col, Form, InputGroup, Button, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faPlay,
    faCalendarAlt,
    faSearch,
    faFilter,
    faPrint,
    faFileExport,
    faEye,
    faEdit
} from '@fortawesome/free-solid-svg-icons';
import './DayBook.css';

function DayBook() {
    const [activeTab, setActiveTab] = useState('daily');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');

    // UI rendering methods
    const renderDailyTransactions = () => (
        <>
            <Row className="mb-4">
                <Col md={4}>
                    <Form.Group>
                        <Form.Label>Select Date</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                            <InputGroup.Text>
                                <FontAwesomeIcon icon={faCalendarAlt} />
                            </InputGroup.Text>
                        </InputGroup>
                    </Form.Group>
                </Col>
                <Col md={8}>
                    <div className="d-flex justify-content-end align-items-end h-100">
                        <InputGroup className="search-bar me-2">
                            <Form.Control
                                type="text"
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Button variant="outline-secondary">
                                <FontAwesomeIcon icon={faSearch} />
                            </Button>
                        </InputGroup>
                        <Button variant="outline-secondary">
                            <FontAwesomeIcon icon={faFilter} className="me-2" /> Filter
                        </Button>
                    </div>
                </Col>
            </Row>

            <Row className="mb-4 summary-cards">
                <Col md={4}>
                    <Card className="summary-card income-card">
                        <Card.Body>
                            <h6 className="card-subtitle mb-2 text-muted">Total Income</h6>
                            <h3 className="card-value">₹0.00</h3>
                            <div className="card-indicator">
                                <span className="indicator up">↑ 0.0%</span>
                                <span className="indicator-text">from yesterday</span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="summary-card expense-card">
                        <Card.Body>
                            <h6 className="card-subtitle mb-2 text-muted">Total Expenses</h6>
                            <h3 className="card-value">₹0.00</h3>
                            <div className="card-indicator">
                                <span className="indicator down">↓ 0.0%</span>
                                <span className="indicator-text">from yesterday</span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="summary-card balance-card">
                        <Card.Body>
                            <h6 className="card-subtitle mb-2 text-muted">Daily Net Balance</h6>
                            <h3 className="card-value text-success">₹0.00</h3>
                            <div className="card-indicator">
                                <span className="indicator up">↑ 0.0%</span>
                                <span className="indicator-text">of total income</span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <div className="table-responsive">
                <Table hover className="transaction-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Description</th>
                            <th>Customer/Vendor</th>
                            <th className="text-end">Credit (₹)</th>
                            <th className="text-end">Debit (₹)</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* We'll add real data fetching in the future */}
                        <tr>
                            <td colSpan="6" className="text-center py-3 text-muted">
                                Loading transactions...
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colSpan="3">Total</th>
                            <th className="text-end text-success">₹0.00</th>
                            <th className="text-end text-danger">₹0.00</th>
                            <th></th>
                        </tr>
                    </tfoot>
                </Table>
            </div>
        </>
    );

    const renderAllTransactions = () => (
        <div className="text-center py-5">
            <p>All transactions history would be displayed here.</p>
            <p>This tab will show all transactions across multiple days with filtering options.</p>
        </div>
    );

    const renderCashBank = () => (
        <div className="text-center py-5">
            <p>Cash and Bank Account details would be displayed here.</p>
            <p>This section will show current bank balances and cash in hand.</p>
        </div>
    );

    return (
        <div className="container-fluid px-4">
            <div className="page-banner mb-4">
                <div className="banner-content">
                    <div className="banner-icon">💼</div>
                    <h5>Manage your day-to-day financial activities with ease</h5>
                    <button className="btn btn-light btn-sm ms-3">Learn more 🔍</button>
                </div>
            </div>

            {/* Page heading */}
            <div className="page-header d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center">
                    <h1 className="h3 mb-0 text-gray-800 fw-bold">Day Book</h1>
                    <span className="video-badge ms-2">
                        <FontAwesomeIcon icon={faPlay} className="text-primary" />
                    </span>
                </div>

                <div className="d-flex">
                    <button className="btn btn-outline-secondary me-2">
                        <FontAwesomeIcon icon={faPrint} className="me-2" />
                        Print
                    </button>
                    <button className="btn btn-outline-secondary me-2">
                        <FontAwesomeIcon icon={faFileExport} className="me-2" />
                        Export
                    </button>
                    <button className="btn btn-primary">
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        New Transaction
                    </button>
                </div>
            </div>

            <Card className="mb-4 border-0 shadow-sm">
                <Card.Body>
                    <Tabs
                        activeKey={activeTab}
                        onSelect={(k) => setActiveTab(k)}
                        className="mb-4 nav-tabs-custom"
                    >
                        <Tab eventKey="daily" title="Daily Summary">
                            {renderDailyTransactions()}
                        </Tab>
                        <Tab eventKey="transactions" title="All Transactions">
                            {renderAllTransactions()}
                        </Tab>
                        <Tab eventKey="cashbank" title="Cash & Bank">
                            {renderCashBank()}
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>
        </div>
    );
}

export default DayBook;