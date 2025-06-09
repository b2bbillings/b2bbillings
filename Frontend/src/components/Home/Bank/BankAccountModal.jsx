import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom'; // ✅ Added for URL params
import bankAccountService from '../../../services/bankAccountService';

function BankAccountModal({ show, onHide, editingAccount, formData, onInputChange, onSaveAccount }) {
    // ✅ Get company ID from URL params
    const { companyId } = useParams();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);
    const [validatingAccount, setValidatingAccount] = useState(false);

    // Real-time validation state
    const [fieldValidation, setFieldValidation] = useState({
        accountName: { isValid: true, message: '' },
        accountNumber: { isValid: true, message: '' },
        ifscCode: { isValid: true, message: '' },
        upiId: { isValid: true, message: '' }
    });

    // ✅ ENHANCED: Better company ID resolution with fallbacks
    const getEffectiveCompanyId = () => {
        // Try multiple sources for company ID
        const sources = [
            companyId, // From URL params (highest priority)
            localStorage.getItem('selectedCompanyId'),
            sessionStorage.getItem('companyId')
        ];

        // Try parsing currentCompany from localStorage
        try {
            const currentCompanyStr = localStorage.getItem('currentCompany');
            if (currentCompanyStr) {
                const currentCompany = JSON.parse(currentCompanyStr);
                const companyIdFromStorage = currentCompany.id || currentCompany._id;
                if (companyIdFromStorage) {
                    sources.unshift(companyIdFromStorage); // Add to beginning
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to parse currentCompany from localStorage:', error);
        }

        // Return the first valid company ID
        for (const source of sources) {
            if (source && source.trim() !== '') {
                return source;
            }
        }

        console.warn('⚠️ No valid company ID found for BankAccountModal');
        return null;
    };

    // Validate IFSC code in real-time
    const validateIFSC = (value) => {
        if (!value) return { isValid: true, message: '' };
        const isValid = bankAccountService.validateIFSC(value);
        return {
            isValid,
            message: isValid ? '' : 'Invalid IFSC code format (e.g., SBIN0001234)'
        };
    };

    // Validate UPI ID in real-time
    const validateUPI = (value) => {
        if (!value) return { isValid: true, message: '' };
        const isValid = bankAccountService.validateUPI(value);
        return {
            isValid,
            message: isValid ? '' : 'Invalid UPI ID format (e.g., user@paytm)'
        };
    };

    // Handle input change with validation
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const inputValue = type === 'checkbox' ? checked : value;

        // Call parent onChange
        onInputChange(e);

        // Real-time validation
        if (name === 'ifscCode') {
            const validation = validateIFSC(inputValue.toUpperCase());
            setFieldValidation(prev => ({
                ...prev,
                ifscCode: validation
            }));
        } else if (name === 'upiId') {
            const validation = validateUPI(inputValue.toLowerCase());
            setFieldValidation(prev => ({
                ...prev,
                upiId: validation
            }));
        }

        // Clear general errors
        if (error) setError('');
        if (validationErrors.length > 0) setValidationErrors([]);
    };

    // ✅ UPDATED: Validate account details with backend using effective company ID
    const validateAccountDetails = async () => {
        const effectiveCompanyId = getEffectiveCompanyId();

        if (!effectiveCompanyId || !formData.accountName) return;

        setValidatingAccount(true);
        try {
            const response = await bankAccountService.validateAccountDetails(effectiveCompanyId, {
                accountName: formData.accountName,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode
            });

            if (!response.isValid) {
                setValidationErrors(response.errors || []);
            } else {
                setValidationErrors([]);
            }
        } catch (error) {
            console.error('❌ Validation error:', error);
        } finally {
            setValidatingAccount(false);
        }
    };

    // Debounced validation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.accountName && show) {
                validateAccountDetails();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.accountName, formData.accountNumber, formData.ifscCode, show, companyId]);

    // ✅ UPDATED: Handle form submission with better company ID resolution
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setValidationErrors([]);

        try {
            // ✅ Use effective company ID with fallbacks
            const effectiveCompanyId = getEffectiveCompanyId();

            if (!effectiveCompanyId) {
                throw new Error('Company selection required. Please navigate to a valid company URL or select a company.');
            }

            console.log('💾 Saving account with company ID:', effectiveCompanyId);

            // Client-side validation
            const errors = [];

            if (!formData.accountName?.trim()) {
                errors.push('Account name is required');
            }

            if ((formData.printUpiQrCodes || formData.printBankDetails) && !formData.accountNumber?.trim()) {
                errors.push('Account number is required when print settings are enabled');
            }

            if (formData.ifscCode && !fieldValidation.ifscCode.isValid) {
                errors.push('Please enter a valid IFSC code');
            }

            if (formData.upiId && !fieldValidation.upiId.isValid) {
                errors.push('Please enter a valid UPI ID');
            }

            if (errors.length > 0) {
                setValidationErrors(errors);
                setLoading(false);
                return;
            }

            // Prepare data for API
            const accountData = {
                accountName: formData.accountName.trim(),
                accountNumber: formData.accountNumber?.trim() || '',
                bankName: formData.bankName?.trim() || '',
                branchName: formData.branchName?.trim() || '',
                ifscCode: formData.ifscCode?.toUpperCase().trim() || '',
                accountType: formData.accountType || 'savings',
                accountHolderName: formData.accountHolderName?.trim() || '',
                type: formData.type || 'bank',
                openingBalance: parseFloat(formData.openingBalance) || 0,
                asOfDate: formData.asOfDate || new Date().toISOString().split('T')[0],
                printUpiQrCodes: Boolean(formData.printUpiQrCodes),
                printBankDetails: Boolean(formData.printBankDetails),
                upiId: formData.upiId?.toLowerCase().trim() || ''
            };

            console.log('📤 Sending account data:', {
                companyId: effectiveCompanyId,
                accountName: accountData.accountName,
                type: accountData.type,
                isUpdate: !!editingAccount
            });

            let response;
            if (editingAccount) {
                // Update existing account
                response = await bankAccountService.updateBankAccount(
                    effectiveCompanyId,
                    editingAccount._id || editingAccount.id,
                    accountData
                );
            } else {
                // Create new account
                response = await bankAccountService.createBankAccount(effectiveCompanyId, accountData);
            }

            console.log('✅ Account saved successfully:', response);

            // Call parent success handler
            await onSaveAccount(response.data);

            // Close modal
            onHide();

        } catch (error) {
            console.error('❌ Error saving account:', error);

            if (error.response?.data?.errors) {
                // Backend validation errors
                setValidationErrors(error.response.data.errors.map(err =>
                    typeof err === 'string' ? err : err.message || err.msg
                ));
            } else if (error.response?.data?.message) {
                // Backend error message
                setError(error.response.data.message);
            } else {
                // Generic error
                setError(error.message || 'Failed to save account. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Reset validation on modal close
    useEffect(() => {
        if (!show) {
            setError('');
            setValidationErrors([]);
            setFieldValidation({
                accountName: { isValid: true, message: '' },
                accountNumber: { isValid: true, message: '' },
                ifscCode: { isValid: true, message: '' },
                upiId: { isValid: true, message: '' }
            });
        }
    }, [show]);

    // ✅ DEBUG: Log company ID state when modal opens
    useEffect(() => {
        if (show) {
            const effectiveCompanyId = getEffectiveCompanyId();
            console.log('🔍 BankAccountModal Debug:', {
                modalOpen: show,
                companyIdFromURL: companyId,
                effectiveCompanyId: effectiveCompanyId,
                hasValidCompanyId: !!effectiveCompanyId,
                editingAccount: !!editingAccount,
                formData: {
                    accountName: formData?.accountName,
                    type: formData?.type
                }
            });
        }
    }, [show, companyId, editingAccount]);

    return (
        <Modal show={show} onHide={onHide} centered size="lg" className="bank-modal">
            <Modal.Header closeButton>
                <Modal.Title>
                    {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleFormSubmit}>
                <Modal.Body>
                    {/* ✅ ENHANCED: Better error alerts with company ID info */}
                    {error && (
                        <Alert variant="danger" className="mb-3">
                            <strong>Error:</strong> {error}
                            {error.includes('Company selection') && (
                                <div className="mt-2">
                                    <small className="text-muted d-block">
                                        Current URL company ID: {companyId || 'Not found'}
                                    </small>
                                    <small className="text-muted d-block">
                                        Effective company ID: {getEffectiveCompanyId() || 'Not resolved'}
                                    </small>
                                </div>
                            )}
                        </Alert>
                    )}

                    {validationErrors.length > 0 && (
                        <Alert variant="warning" className="mb-3">
                            <strong>Please fix the following issues:</strong>
                            <ul className="mb-0 mt-2">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}

                    {validatingAccount && (
                        <Alert variant="info" className="mb-3">
                            <Spinner animation="border" size="sm" className="me-2" />
                            Validating account details...
                        </Alert>
                    )}

                    {/* ✅ DEBUG: Show company ID info in development */}
                    {process.env.NODE_ENV === 'development' && (
                        <Alert variant="light" className="mb-3 small">
                            <strong>Debug Info:</strong> Company ID: {getEffectiveCompanyId() || 'None'}
                            (Source: {companyId ? 'URL' : 'localStorage'})
                        </Alert>
                    )}

                    {/* Top Row - Basic Info */}
                    <Row className="g-3 mb-4">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Account Display Name *</Form.Label>
                                <Form.Control
                                    name="accountName"
                                    value={formData.accountName || ''}
                                    onChange={handleInputChange}
                                    placeholder="Enter display name"
                                    required
                                    isInvalid={!fieldValidation.accountName.isValid}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {fieldValidation.accountName.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Account Type</Form.Label>
                                <Form.Select
                                    name="accountType"
                                    value={formData.accountType || 'savings'}
                                    onChange={handleInputChange}
                                >
                                    {bankAccountService.getAccountTypes().map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Category</Form.Label>
                                <Form.Select
                                    name="type"
                                    value={formData.type || 'bank'}
                                    onChange={handleInputChange}
                                >
                                    {bankAccountService.getAccountCategories().map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="g-3 mb-4">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Opening Balance</Form.Label>
                                <Form.Control
                                    name="openingBalance"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.openingBalance || 0}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>As of Date</Form.Label>
                                <Form.Control
                                    name="asOfDate"
                                    type="date"
                                    value={formData.asOfDate || new Date().toISOString().split('T')[0]}
                                    onChange={handleInputChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Account Holder Name</Form.Label>
                                <Form.Control
                                    name="accountHolderName"
                                    value={formData.accountHolderName || ''}
                                    onChange={handleInputChange}
                                    placeholder="Enter account holder name"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Checkboxes */}
                    <Row className="g-3 mb-4">
                        <Col md={6}>
                            <Form.Check
                                type="checkbox"
                                name="printUpiQrCodes"
                                label="Print UPI QR Code on Invoices"
                                checked={formData.printUpiQrCodes || false}
                                onChange={handleInputChange}
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Check
                                type="checkbox"
                                name="printBankDetails"
                                label="Print bank details on invoices"
                                checked={formData.printBankDetails || false}
                                onChange={handleInputChange}
                            />
                        </Col>
                    </Row>

                    {/* Dynamic Fields - Shows ONLY when checkboxes are selected */}
                    {(formData.printUpiQrCodes || formData.printBankDetails) && (
                        <>
                            {/* Bank Details Row */}
                            <Row className="g-3 mb-3">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Account Number *</Form.Label>
                                        <Form.Control
                                            name="accountNumber"
                                            value={formData.accountNumber || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter account number"
                                            required={formData.printUpiQrCodes || formData.printBankDetails}
                                            isInvalid={!fieldValidation.accountNumber.isValid}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {fieldValidation.accountNumber.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>IFSC Code</Form.Label>
                                        <Form.Control
                                            name="ifscCode"
                                            value={formData.ifscCode || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter IFSC code"
                                            style={{ textTransform: 'uppercase' }}
                                            isInvalid={!fieldValidation.ifscCode.isValid}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {fieldValidation.ifscCode.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Bank Name</Form.Label>
                                        <Form.Control
                                            name="bankName"
                                            value={formData.bankName || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter bank name"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Branch Name</Form.Label>
                                        <Form.Control
                                            name="branchName"
                                            value={formData.branchName || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter branch name"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* UPI Row - Only show if UPI QR is enabled */}
                            {formData.printUpiQrCodes && (
                                <Row className="g-3 mb-4">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>UPI ID for QR Codes</Form.Label>
                                            <Form.Control
                                                name="upiId"
                                                value={formData.upiId || ''}
                                                onChange={handleInputChange}
                                                placeholder="Enter UPI ID (e.g., business@paytm)"
                                                isInvalid={!fieldValidation.upiId.isValid}
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldValidation.upiId.message}
                                            </Form.Control.Feedback>
                                            <Form.Text className="text-muted">
                                                This will be used to generate QR codes for payments
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <div>
                        <small className="text-muted">* Required fields</small>
                    </div>
                    <div>
                        <Button
                            variant="outline-secondary"
                            onClick={onHide}
                            className="me-2"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={loading || validatingAccount || !getEffectiveCompanyId()}
                        >
                            {loading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    {editingAccount ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                editingAccount ? 'Update Account' : 'Create Account'
                            )}
                        </Button>
                    </div>
                </Modal.Footer>
            </Form>

            {/* Custom Styles */}
            <style jsx>{`
                .bank-modal .modal-header {
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    color: white;
                    border-bottom: none;
                }
                
                .bank-modal .modal-header .btn-close {
                    filter: invert(1);
                }
                
                .bank-modal .form-label {
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 6px;
                    font-size: 0.9rem;
                }
                
                .bank-modal .form-control,
                .bank-modal .form-select {
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    padding: 10px 12px;
                    transition: border-color 0.2s ease;
                    font-size: 0.9rem;
                }
                
                .bank-modal .form-control:focus,
                .bank-modal .form-select:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                }
                
                .bank-modal .form-control.is-invalid {
                    border-color: #dc3545;
                }
                
                .bank-modal .form-check-label {
                    font-weight: 500;
                    color: #555;
                }
                
                .bank-modal .btn-primary {
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    border: none;
                    padding: 10px 24px;
                    font-weight: 600;
                }
                
                .bank-modal .btn-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
                }
                
                .bank-modal .btn-primary:disabled {
                    opacity: 0.7;
                    transform: none;
                }
                
                @media (max-width: 768px) {
                    .bank-modal .modal-dialog {
                        margin: 1rem;
                        max-width: calc(100% - 2rem);
                    }
                }
            `}</style>
        </Modal>
    );
}

export default BankAccountModal;