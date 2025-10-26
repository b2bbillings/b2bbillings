import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMoneyBillWave, 
  faUser, 
  faCalendarAlt, 
  faCreditCard,
  faSave,
  faSpinner,
  faArrowUp,
  faInfoCircle,
  faFileInvoice
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import paymentService from '../../../services/paymentService';
import { customerService, vendorService } from '../../../services/customerVendorService';

const PaymentOut = ({ currentCompany, currentUser, addToast }) => {
  // Refs for form fields navigation
  const dateRef = useRef(null);
  const partyRef = useRef(null);
  const amountRef = useRef(null);
  const paymentMethodRef = useRef(null);
  const referenceNumberRef = useRef(null);
  const descriptionRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    party: null,
    amount: '',
    paymentMethod: 'cash',
    description: '',
    referenceNumber: '',
    selectedInvoice: null
  });

  // Component state
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingParties, setLoadingParties] = useState(true);
  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedPaymentData, setSavedPaymentData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Payment method options
  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: faMoneyBillWave },
    { value: 'upi', label: 'UPI', icon: faCreditCard },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: faCreditCard },
    { value: 'cheque', label: 'Cheque', icon: faCreditCard },
    { value: 'card', label: 'Card', icon: faCreditCard },
    { value: 'other', label: 'Other', icon: faCreditCard }
  ];

  // Fetch all parties (customers, vendors, and end customers) on component mount
  useEffect(() => {
    const fetchAllParties = async () => {
      try {
        setLoadingParties(true);
        const token = localStorage.getItem('token');
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        
        // Fetch customers, vendors, and end customers in parallel
        const [customersResponse, vendorsResponse, endCustomersResponse] = await Promise.allSettled([
          customerService.getAllCustomers(),
          vendorService.getAllVendors(),
          fetch(`${API_BASE_URL}/end-customers`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            }
          }).then(res => res.json())
        ]);

        const allParties = [];

        // Process customers
        if (customersResponse.status === 'fulfilled' && customersResponse.value) {
          const customers = Array.isArray(customersResponse.value) 
            ? customersResponse.value 
            : customersResponse.value.data || [];
          
          customers.forEach(customer => {
            allParties.push({
              value: customer._id || customer.id,
              label: `${customer.name || customer.customerName} (Customer)`,
              type: 'customer',
              data: customer,
              phone: customer.phone,
              email: customer.email
            });
          });
        }

        // Process vendors
        if (vendorsResponse.status === 'fulfilled' && vendorsResponse.value) {
          const vendors = Array.isArray(vendorsResponse.value) 
            ? vendorsResponse.value 
            : vendorsResponse.value.data || [];
          
          vendors.forEach(vendor => {
            allParties.push({
              value: vendor._id || vendor.id,
              label: `${vendor.name || vendor.vendorName} (Vendor)`,
              type: 'vendor',
              data: vendor,
              phone: vendor.phone,
              email: vendor.email
            });
          });
        }

        // Process end customers
        if (endCustomersResponse.status === 'fulfilled' && endCustomersResponse.value) {
          const endCustomers = Array.isArray(endCustomersResponse.value) 
            ? endCustomersResponse.value 
            : endCustomersResponse.value.data || [];
          
          endCustomers.forEach(endCustomer => {
            allParties.push({
              value: endCustomer._id || endCustomer.id,
              label: `${endCustomer.customerName || endCustomer.name} (End Customer)`,
              type: 'end_customer',
              data: endCustomer,
              phone: endCustomer.whatsapp
            });
          });
        }

        // Sort parties alphabetically by label
        allParties.sort((a, b) => a.label.localeCompare(b.label));

        setParties(allParties);
        
        if (allParties.length === 0) {
          console.warn('No parties found');
          if (addToast) {
            addToast('No parties found. Please add customers, vendors, or end customers first.', 'info');
          }
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

    if (currentCompany) {
      fetchAllParties();
    }
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

  // Handle Enter key to move to next field
  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        // For react-select components
        if (nextRef.current.focus) {
          nextRef.current.focus();
        }
        // For regular input elements
        else if (nextRef.current.select) {
          nextRef.current.select();
        }
        // For submit button
        else if (nextRef.current.click) {
          nextRef.current.click();
        }
      }
    }
  };

  // Handle party selection
  const handlePartyChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      party: selectedOption,
      selectedInvoice: null, // Reset invoice when party changes
      amount: '' // Reset amount when party changes
    }));
    
    if (errors.party) {
      setErrors(prev => ({
        ...prev,
        party: null
      }));
    }

    // Fetch invoices for the selected party
    if (selectedOption) {
      fetchInvoicesForParty(selectedOption.value);
    } else {
      setInvoices([]);
    }
  };

  // Fetch invoices for selected party (purchase invoices for payment out)
  const fetchInvoicesForParty = async (partyId) => {
    setLoadingInvoices(true);
    try {
      const companyId = currentCompany?.id || currentCompany?._id;
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const response = await fetch(
        `${API_BASE_URL}/payments/pending-purchase-invoices/${partyId}?companyId=${companyId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success && data.invoices) {
        const invoiceOptions = data.invoices.map(invoice => ({
          value: invoice._id || invoice.id,
          label: `${invoice.invoiceNumber || invoice.orderNumber} - ₹${parseFloat(invoice.dueAmount || invoice.totalAmount || 0).toLocaleString('en-IN')} Due`,
          invoice: invoice,
          invoiceNumber: invoice.invoiceNumber || invoice.orderNumber,
          dueAmount: invoice.dueAmount || invoice.totalAmount || 0,
          totalAmount: invoice.totalAmount || 0,
          invoiceDate: invoice.invoiceDate || invoice.orderDate
        }));
        setInvoices(invoiceOptions);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
      if (addToast) {
        addToast('Failed to load invoices', 'error');
      }
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Handle invoice selection
  const handleInvoiceChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      selectedInvoice: selectedOption,
      amount: selectedOption ? selectedOption.dueAmount.toString() : prev.amount,
      referenceNumber: selectedOption ? selectedOption.invoiceNumber : ''
    }));
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
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Prepare payment data matching backend requirements
      const paymentData = {
        date: formData.date,
        partyId: formData.party.value,
        partyName: formData.party.label.split(' (')[0], // Extract name without type
        partyType: formData.party.type,
        type: 'payment_out',
        paymentType: 'payment_out',
        companyId: companyId,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber || '',
        description: formData.description || ''
      };

      // Add invoice information if an invoice was selected
      if (formData.selectedInvoice) {
        paymentData.purchaseInvoiceId = formData.selectedInvoice.value;
        paymentData.invoiceNumber = formData.selectedInvoice.invoiceNumber;
        paymentData.referenceNumber = formData.selectedInvoice.invoiceNumber; // Use invoice number as reference
      }

      // For non-cash payments, bank account is optional but can be added later
      if (formData.paymentMethod !== 'cash' && formData.bankAccountId) {
        paymentData.bankAccountId = formData.bankAccountId;
      }

      // Make direct API call to backend
      const response = await fetch(`${API_BASE_URL}/payments/payment-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save payment');
      }

      if (result.success) {
        // Show success modal with payment details
        setSavedPaymentData({
          paymentNumber: result.data?.paymentNumber || 'N/A',
          partyName: formData.party?.label || 'N/A',
          amount: formData.amount,
          paymentMethod: formData.paymentMethod,
          date: formData.date,
          description: formData.description,
          referenceNumber: formData.referenceNumber
        });
        setShowSuccessModal(true);

        // Reset form
        setFormData({
          date: new Date().toISOString().split('T')[0],
          party: null,
          amount: '',
          paymentMethod: 'cash',
          description: '',
          referenceNumber: '',
          selectedInvoice: null
        });
        setInvoices([]);
      } else {
        throw new Error(result.message || 'Failed to save payment');
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
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#0d6efd' 
        : state.isFocused 
        ? '#e7f3ff' 
        : 'white',
      color: state.isSelected ? 'white' : '#212529',
      cursor: 'pointer',
      padding: '8px 12px'
    })
  };

  // Group parties by type for better organization
  const groupedParties = [
    {
      label: 'Customers',
      options: parties.filter(p => p.type === 'customer')
    },
    {
      label: 'Vendors',
      options: parties.filter(p => p.type === 'vendor')
    },
    {
      label: 'End Customers',
      options: parties.filter(p => p.type === 'end_customer')
    }
  ].filter(group => group.options.length > 0); // Only show groups that have options

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
                    ref={dateRef}
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, partyRef)}
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
                    ref={partyRef}
                    value={formData.party}
                    onChange={handlePartyChange}
                    options={groupedParties.length > 0 ? groupedParties : parties}
                    isSearchable
                    placeholder="Search and select party..."
                    isLoading={loadingParties}
                    styles={selectStyles}
                    onKeyDown={(e) => handleKeyDown(e, amountRef)}
                    openMenuOnClick={true}
                    openMenuOnFocus={true}
                    noOptionsMessage={() => loadingParties ? "Loading parties..." : "No parties found. Add customers, vendors, or end customers first."}
                    formatGroupLabel={(data) => (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        color: '#495057',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        padding: '4px 0'
                      }}>
                        <span>{data.label}</span>
                        <span style={{
                          backgroundColor: '#e9ecef',
                          borderRadius: '10px',
                          padding: '2px 8px',
                          fontSize: '0.75rem'
                        }}>
                          {data.options.length}
                        </span>
                      </div>
                    )}
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
                    ref={amountRef}
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, paymentMethodRef)}
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
                    ref={paymentMethodRef}
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, referenceNumberRef)}
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
              {/* Invoice Selection */}
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                    Select Invoice (Optional)
                  </Form.Label>
                  <Select
                    value={formData.selectedInvoice}
                    onChange={handleInvoiceChange}
                    options={invoices}
                    isSearchable
                    placeholder={
                      !formData.party 
                        ? "Select a party first to see their invoices..."
                        : loadingInvoices 
                        ? "Loading invoices..." 
                        : invoices.length === 0 
                        ? "No pending invoices found"
                        : "Search and select an invoice..."
                    }
                    isLoading={loadingInvoices}
                    isDisabled={!formData.party || loadingInvoices}
                    styles={selectStyles}
                    isClearable
                    noOptionsMessage={() => 
                      !formData.party 
                        ? "Select a party first" 
                        : "No pending invoices found"
                    }
                    formatOptionLabel={(option) => (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '4px 0'
                      }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#212529' }}>
                            {option.invoiceNumber}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                            Date: {new Date(option.invoiceDate).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '600', color: '#dc3545' }}>
                            ₹{parseFloat(option.dueAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                            Due Amount
                          </div>
                        </div>
                      </div>
                    )}
                  />
                  <Form.Text className="text-muted">
                    Select an invoice to automatically fill the amount with the due amount
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              {/* Reference Number */}
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Reference Number</Form.Label>
                  <Form.Control
                    ref={referenceNumberRef}
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, descriptionRef)}
                    placeholder="Enter reference number (optional)"
                  />
                </Form.Group>
              </Col>

              {/* Description */}
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    ref={descriptionRef}
                    as="textarea"
                    rows={1}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, submitButtonRef)}
                    placeholder="Payment description (optional)"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Keyboard Shortcut Info */}
            <div className="mt-3 mb-3">
              <Alert variant="info" className="py-2 px-3 mb-0" style={{ 
                fontSize: '0.875rem',
                backgroundColor: '#e7f3ff',
                borderColor: '#b3d9ff',
                color: '#004085'
              }}>
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  <span>
                    <strong>Quick Tip:</strong> Press <kbd style={{
                      backgroundColor: '#f8f9fa',
                      border: '2px solid #495057',
                      borderRadius: '5px',
                      padding: '4px 10px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: '#212529',
                      boxShadow: '0 3px 0 #adb5bd, 0 4px 6px rgba(0,0,0,0.2)',
                      display: 'inline-block',
                      marginLeft: '4px',
                      marginRight: '4px'
                    }}>Enter ↵</kbd> to move to the next field for faster data entry
                  </span>
                </div>
              </Alert>
            </div>

            {/* Submit Button */}
            <div className="d-flex justify-content-end mt-4">
              <Button 
                ref={submitButtonRef}
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

      {/* Success Modal */}
      {showSuccessModal && savedPaymentData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease-out',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              padding: '30px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'white',
                borderRadius: '50%',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#dc3545" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: '600',
                margin: '0'
              }}>Payment Sent!</h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '14px',
                margin: '10px 0 0'
              }}>Payment has been successfully recorded</p>
            </div>

            {/* Payment Details */}
            <div style={{ padding: '30px' }}>
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px', fontWeight: '500' }}>
                    Payment Number
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc3545' }}>
                    {savedPaymentData.paymentNumber}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '15px', marginTop: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Party Name</div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#212529' }}>
                        {savedPaymentData.partyName}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Amount</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc3545' }}>
                        ₹{parseFloat(savedPaymentData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Payment Method</div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#212529', textTransform: 'capitalize' }}>
                        {savedPaymentData.paymentMethod.replace('_', ' ')}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Date</div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#212529' }}>
                        {new Date(savedPaymentData.date).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {savedPaymentData.description && (
                  <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '15px', marginTop: '15px' }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Description</div>
                    <div style={{ fontSize: '14px', color: '#495057' }}>{savedPaymentData.description}</div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSavedPaymentData(null);
                }}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
              >
                Add Another Payment
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default PaymentOut;