import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMoneyBillWave, 
  faUser, 
  faCalendarAlt, 
  faCreditCard,
  faSave,
  faSpinner,
  faArrowUp
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import paymentService from '../../../services/paymentService';

const PaymentOut = ({ currentCompany, currentUser, addToast }) => {
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    party: null,
    amount: '',
    paymentMethod: 'cash',
    description: '',
    referenceNumber: ''
  });

  // Component state
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingParties, setLoadingParties] = useState(true);
  const [errors, setErrors] = useState({});

  // Payment method options
  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: faMoneyBillWave },
    { value: 'upi', label: 'UPI', icon: faCreditCard },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: faCreditCard },
    { value: 'cheque', label: 'Cheque', icon: faCreditCard },
    { value: 'card', label: 'Card', icon: faCreditCard },
    { value: 'other', label: 'Other', icon: faCreditCard }
  ];

  // Fetch parties (customers and vendors) on component mount
  useEffect(() => {
    const fetchParties = async () => {
      try {
        setLoadingParties(true);
        const companyId = currentCompany?.id || currentCompany?._id;
        
        // Use the enhanced payment service to fetch parties
        const result = await paymentService.getPartiesForPayment(companyId, '', 'all');
        
        if (result.success && result.data) {
          // Format parties for react-select
          const formattedParties = result.data.map(party => ({
            value: party._id || party.id || party.value,
            label: `${party.displayName || party.name || party.label} (${party.type || party.partyType})`,
            type: party.type || party.partyType,
            data: party
          }));

          setParties(formattedParties);
        } else {
          console.warn('No parties found or failed to fetch:', result.message);
          setParties([]);
        }
      } catch (error) {
        console.error('Error fetching parties:', error);
        if (addToast) {
          addToast('Error loading parties. Please check your connection.', 'error');
        }
        setParties([]);
      } finally {
        setLoadingParties(false);
      }
    };

    fetchParties();
  }, [currentCompany, addToast]);

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle party selection
  const handlePartyChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      party: selectedOption
    }));
    
    if (errors.party) {
      setErrors(prev => ({
        ...prev,
        party: null
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.party) {
      newErrors.party = 'Party selection is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const companyId = currentCompany?.id || currentCompany?._id;
      
      const paymentData = {
        date: formData.date,
        partyId: formData.party.value,
        partyType: formData.party.type,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        description: formData.description,
        referenceNumber: formData.referenceNumber,
        type: 'payment_out',
        companyId
      };

      // Use the enhanced payment service for submission
      const response = await paymentService.createSimplePayment({
        ...paymentData,
        paymentType: 'payment_out',
        partyName: formData.party.label.split(' (')[0] // Extract name without type
      });

      if (response.success) {
        if (addToast) {
          addToast('Payment Out recorded successfully', 'success');
        }

        // Reset form
        setFormData({
          date: new Date().toISOString().split('T')[0],
          party: null,
          amount: '',
          paymentMethod: 'cash',
          description: '',
          referenceNumber: ''
        });
      } else {
        throw new Error(response.message || 'Failed to save payment');
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      if (addToast) {
        addToast(error.message || 'Error saving payment', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Custom styles for react-select
  const selectStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '38px',
      borderColor: errors.party ? '#dc3545' : state.isFocused ? '#86b7fe' : '#ced4da',
      boxShadow: state.isFocused 
        ? errors.party 
          ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)'
          : '0 0 0 0.2rem rgba(13, 110, 253, 0.25)'
        : null,
      '&:hover': {
        borderColor: errors.party ? '#dc3545' : '#86b7fe'
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#6c757d'
    })
  };

  return (
    <div className="payment-out-container">
      <Card className="shadow-sm">
        <Card.Header className="bg-danger text-white">
          <div className="d-flex align-items-center">
            <FontAwesomeIcon icon={faArrowUp} className="me-2" />
            <h5 className="mb-0">Payment Out</h5>
          </div>
        </Card.Header>
        
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              {/* Date Field */}
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Date *
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    isInvalid={!!errors.date}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.date}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              {/* Party Selection */}
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Select Party *
                  </Form.Label>
                  <Select
                    value={formData.party}
                    onChange={handlePartyChange}
                    options={parties}
                    isSearchable
                    placeholder="Search and select party..."
                    isLoading={loadingParties}
                    styles={selectStyles}
                    noOptionsMessage={() => loadingParties ? "Loading parties..." : "No parties found"}
                  />
                  {errors.party && (
                    <div className="invalid-feedback d-block">
                      {errors.party}
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              {/* Amount Field */}
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                    Amount *
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="Enter amount"
                    step="0.01"
                    min="0"
                    isInvalid={!!errors.amount}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.amount}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              {/* Payment Method */}
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                    Payment Method *
                  </Form.Label>
                  <Form.Select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    isInvalid={!!errors.paymentMethod}
                    required
                  >
                    {paymentMethods.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.paymentMethod}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              {/* Reference Number */}
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Find Invoice  </Form.Label>
                  <Form.Control
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleInputChange}
                    placeholder="Find Invoice "
                  />
                </Form.Group>
              </Col>

              {/* Description */}
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Payment description (optional)"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Submit Button */}
            <div className="d-flex justify-content-end mt-4">
              <Button 
                type="submit" 
                variant="danger" 
                disabled={loading}
                className="px-4"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                    Save Payment Out
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* No Company Warning */}
      {!currentCompany && (
        <Alert variant="warning" className="mt-3">
          <FontAwesomeIcon icon={faUser} className="me-2" />
          Please select a company to record payments.
        </Alert>
      )}
    </div>
  );
};

export default PaymentOut;