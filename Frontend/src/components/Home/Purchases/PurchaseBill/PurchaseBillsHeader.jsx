import React from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faPlus } from '@fortawesome/free-solid-svg-icons';

function PurchaseBillsHeader({ onUploadBill, onAddPurchase }) {
    return (
        <Row className="mb-4">
            <Col>
                <div className="d-flex justify-content-between align-items-center">
                    <h2 className="page-title mb-0">Purchase Bills</h2>
                    <div className="d-flex gap-2">
                        <Button
                            variant="outline-primary"
                            size="sm"
                            className="d-flex align-items-center"
                            onClick={onUploadBill}
                        >
                            <FontAwesomeIcon icon={faUpload} className="me-2" />
                            Upload Bill
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            className="d-flex align-items-center"
                            onClick={onAddPurchase}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            Add Purchase
                        </Button>
                    </div>
                </div>
            </Col>
        </Row>
    );
}

export default PurchaseBillsHeader;