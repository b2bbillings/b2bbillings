import React from "react";
import {Form, Row, Col, Card} from "react-bootstrap";

function AddressDetailsStep({
  formData,
  handleInputChange,
  errors,
  stateOptions,
}) {
  return (
    <div className="step-content-modern">
      <Card>
        <Card.Body>
          <h6 className="text-primary mb-4">Address Information</h6>

          <Form.Group className="mb-4">
            <Form.Label>
              Full Address <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="address.street"
              value={formData.address?.street || ""}
              onChange={handleInputChange}
              isInvalid={!!errors["address.street"]}
              placeholder="Enter complete street address"
            />
            <Form.Control.Feedback type="invalid">
              {errors["address.street"]}
            </Form.Control.Feedback>
          </Form.Group>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>
                  City <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="address.city"
                  value={formData.address?.city || ""}
                  onChange={handleInputChange}
                  isInvalid={!!errors["address.city"]}
                  placeholder="Enter city"
                />
                <Form.Control.Feedback type="invalid">
                  {errors["address.city"]}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>
                  State <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="address.state"
                  value={formData.address?.state || ""}
                  onChange={handleInputChange}
                  isInvalid={!!errors["address.state"]}
                >
                  <option value="">Select State</option>
                  {stateOptions.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors["address.state"]}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Taluka/District</Form.Label>
                <Form.Control
                  type="text"
                  name="address.taluka"
                  value={formData.address?.taluka || ""}
                  onChange={handleInputChange}
                  placeholder="Enter taluka/district"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>PIN Code</Form.Label>
                <Form.Control
                  type="text"
                  name="address.pincode"
                  value={formData.address?.pincode || ""}
                  onChange={handleInputChange}
                  isInvalid={!!errors["address.pincode"]}
                  maxLength={6}
                  placeholder="Enter 6-digit PIN code"
                />
                <Form.Control.Feedback type="invalid">
                  {errors["address.pincode"]}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}

export default AddressDetailsStep;
