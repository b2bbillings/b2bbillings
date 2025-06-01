import React from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faTags } from '@fortawesome/free-solid-svg-icons';

function CategoryModal({
    show,
    onHide,
    categoryFormData,
    onCategoryInputChange,
    onSaveCategory
}) {
    return (
        <Modal show={show} onHide={onHide} size="md" centered>
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    <FontAwesomeIcon icon={faTags} className="me-2 text-primary" />
                    Add New Category
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                <Form onSubmit={onSaveCategory} autoComplete="off">
                    <Row className="mb-4">
                        <Col md={12}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">
                                    Category Name <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={categoryFormData.name}
                                    onChange={onCategoryInputChange}
                                    placeholder="Enter category name"
                                    className="form-input"
                                    required
                                />
                                <Form.Text className="text-muted">
                                    Choose a clear, descriptive name for your category
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="description"
                                    value={categoryFormData.description}
                                    onChange={onCategoryInputChange}
                                    placeholder="Brief description of this category..."
                                    className="form-input"
                                />
                                <Form.Text className="text-muted">
                                    Optional: Add details about what products belong to this category
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="switch"
                                    id="categoryIsActive"
                                    name="isActive"
                                    checked={categoryFormData.isActive}
                                    onChange={onCategoryInputChange}
                                    label="Category is active"
                                    className="mb-2"
                                />
                                <Form.Text className="text-muted">
                                    Inactive categories won't appear in product forms
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Example Categories */}
                    <div className="mb-4 p-3 bg-light rounded">
                        <h6 className="fw-semibold mb-2 text-muted">
                            <FontAwesomeIcon icon={faTags} className="me-2" />
                            Category Examples
                        </h6>
                        <div className="small text-muted">
                            <div className="row">
                                <div className="col-6">
                                    • Electronics<br />
                                    • Furniture<br />
                                    • Stationery<br />
                                    • Clothing
                                </div>
                                <div className="col-6">
                                    • Food & Beverage<br />
                                    • Health & Beauty<br />
                                    • Sports & Fitness<br />
                                    • Services
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-flex gap-3 justify-content-end">
                        <Button
                            variant="outline-secondary"
                            onClick={onHide}
                            className="px-4"
                            type="button"
                        >
                            <FontAwesomeIcon icon={faTimes} className="me-2" />
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            className="px-4"
                            disabled={!categoryFormData.name.trim()}
                        >
                            <FontAwesomeIcon icon={faSave} className="me-2" />
                            Save Category
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

export default CategoryModal;