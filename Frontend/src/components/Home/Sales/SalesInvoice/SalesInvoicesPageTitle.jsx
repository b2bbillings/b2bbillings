import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faChevronDown, faReceipt } from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesPageTitle({ onAddSale }) {
    return (
        <>
            <div className="page-title-section">
                <Container fluid>
                    <Row className="align-items-center">
                        <Col>
                            <div className="d-flex align-items-center">
                                <div className="page-icon">
                                    <FontAwesomeIcon icon={faReceipt} />
                                </div>
                                <div className="page-title-content">
                                    <h4 className="page-title-text mb-0">Sale Invoices</h4>
                                    <small className="page-subtitle text-muted">
                                        Manage your sales transactions
                                    </small>
                                </div>
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className="page-dropdown-icon ms-2"
                                />
                            </div>
                        </Col>
                        <Col xs="auto">
                            <Button
                                variant="primary"
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

            {/* Enhanced Purple Theme Styles */}
            <style>
                {`
                .page-title-section {
                    background: linear-gradient(135deg, rgba(108, 99, 255, 0.02) 0%, rgba(156, 136, 255, 0.02) 100%);
                    border-bottom: 1px solid rgba(108, 99, 255, 0.1);
                    padding: 1.25rem 0;
                    margin-bottom: 1.5rem;
                    backdrop-filter: blur(10px);
                }

                .page-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.2rem;
                    margin-right: 1rem;
                    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);
                    transition: all 0.3s ease;
                }

                .page-icon:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);
                }

                .page-title-content {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .page-title-text {
                    font-weight: 700;
                    color: #2d3748;
                    font-size: 1.5rem;
                    line-height: 1.2;
                    margin-bottom: 0.25rem !important;
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .page-subtitle {
                    font-size: 0.8rem;
                    color: #6b7280;
                    font-weight: 500;
                    letter-spacing: 0.3px;
                }

                .page-dropdown-icon {
                    color: #9ca3af;
                    font-size: 0.7rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    opacity: 0.6;
                }

                .page-dropdown-icon:hover {
                    color: #6c63ff;
                    opacity: 1;
                    transform: translateY(1px);
                }

                .add-sale-btn {
                    background: linear-gradient(135deg, #6c63ff 0%, #9c88ff 100%);
                    border: none;
                    border-radius: 8px;
                    padding: 0.6rem 1.2rem;
                    font-weight: 600;
                    font-size: 0.85rem;
                    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);
                    transition: all 0.3s ease;
                    text-transform: none;
                    letter-spacing: 0.3px;
                }

                .add-sale-btn:hover {
                    background: linear-gradient(135deg, #5a52d5 0%, #8a7ae8 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(108, 99, 255, 0.3);
                    border: none;
                }

                .add-sale-btn:focus {
                    background: linear-gradient(135deg, #5a52d5 0%, #8a7ae8 100%);
                    box-shadow: 0 0 0 0.2rem rgba(108, 99, 255, 0.25);
                    border: none;
                }

                .add-sale-btn:active {
                    background: linear-gradient(135deg, #4c46c7 0%, #7c6cda 100%);
                    transform: translateY(0);
                    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.2);
                    border: none;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .page-title-section {
                        padding: 1rem 0;
                        margin-bottom: 1rem;
                    }

                    .page-icon {
                        width: 40px;
                        height: 40px;
                        font-size: 1rem;
                        margin-right: 0.75rem;
                    }

                    .page-title-text {
                        font-size: 1.3rem;
                    }

                    .page-subtitle {
                        font-size: 0.75rem;
                    }

                    .add-sale-btn {
                        padding: 0.5rem 1rem;
                        font-size: 0.8rem;
                    }

                    .page-dropdown-icon {
                        font-size: 0.6rem;
                    }
                }

                @media (max-width: 576px) {
                    .page-title-section {
                        padding: 0.75rem 0;
                    }

                    .page-icon {
                        width: 36px;
                        height: 36px;
                        font-size: 0.9rem;
                        margin-right: 0.5rem;
                    }

                    .page-title-text {
                        font-size: 1.2rem;
                    }

                    .page-subtitle {
                        font-size: 0.7rem;
                    }

                    .add-sale-btn {
                        padding: 0.45rem 0.8rem;
                        font-size: 0.75rem;
                    }

                    /* Stack on very small screens */
                    .page-title-section .row {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .page-title-section .col:first-child {
                        order: 1;
                    }

                    .page-title-section .col:last-child {
                        order: 2;
                        align-self: flex-start;
                    }
                }

                /* Animations */
                @keyframes fadeInDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .page-title-section {
                    animation: fadeInDown 0.5s ease-out;
                }

                .page-icon {
                    animation: fadeInDown 0.6s ease-out;
                }

                .page-title-content {
                    animation: fadeInDown 0.7s ease-out;
                }

                .add-sale-btn {
                    animation: fadeInDown 0.8s ease-out;
                }

                /* Enhanced Purple Theme Integration */
                .page-title-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #6c63ff 0%, #9c88ff 50%, #b794f6 100%);
                    opacity: 0.6;
                }

                /* Hover Effects for Interactive Elements */
                .page-title-content:hover .page-title-text {
                    background: linear-gradient(135deg, #5a52d5 0%, #8a7ae8 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                /* Focus States */
                .add-sale-btn:focus-visible {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.25);
                }

                /* Active States */
                .page-dropdown-icon:active {
                    transform: translateY(2px);
                }

                /* Loading Animation (for future use) */
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }

                .page-icon.loading {
                    animation: pulse 1.5s ease-in-out infinite;
                }
                `}
            </style>
        </>
    );
}

export default SalesInvoicesPageTitle;