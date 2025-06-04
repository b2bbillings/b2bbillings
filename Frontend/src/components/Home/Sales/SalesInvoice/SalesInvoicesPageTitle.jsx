import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faChevronDown } from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesPageTitle({ onAddSale }) {
    return (
        <div className="page-title-section bg-white border-bottom py-3">
            <Container fluid>
                <Row className="align-items-center">
                    <Col>
                        <div className="d-flex align-items-center">
                            <h4 className="page-title-text mb-0 me-2">Sale Invoices</h4>
                            <FontAwesomeIcon icon={faChevronDown} className="text-muted small" />
                        </div>
                    </Col>
                    <Col xs="auto">
                        <Button
                            variant="danger"
                            size="sm"
                            className="add-sale-btn d-flex align-items-center"
                            onClick={onAddSale}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            Add Sale
                        </Button>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default SalesInvoicesPageTitle;