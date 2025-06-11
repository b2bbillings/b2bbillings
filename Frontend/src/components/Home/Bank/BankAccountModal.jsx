import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import bankAccountService from '../../../services/bankAccountService';

function BankAccountModal({ show, onHide, editingAccount, formData, onInputChange, onSaveAccount }) {
    // ✅ Get company ID from URL params
    const { companyId } = useParams();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);
    const [validatingAccount, setValidatingAccount] = useState(false);

    // ✅ Local form state to ensure inputs are controlled
    const [localFormData, setLocalFormData] = useState({
        accountName: '',
        type: 'bank',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branchName: '',
        upiId: '',
        mobileNumber: '',
        openingBalance: 0,
        asOfDate: new Date().toISOString().split('T')[0],
        isActive: true,
        accountType: 'savings',
        accountHolderName: '',
        printUpiQrCodes: false,
        printBankDetails: true
    });

    // Real-time validation state
    const [fieldValidation, setFieldValidation] = useState({
        accountName: { isValid: true, message: '' },
        accountNumber: { isValid: true, message: '' },
        ifscCode: { isValid: true, message: '' },
        upiId: { isValid: true, message: '' },
        mobileNumber: { isValid: true, message: '' }
    });

    // ✅ Account type options
    const accountTypeOptions = [
        { value: 'bank', label: '🏦 Bank Account' },
        { value: 'upi', label: '📱 UPI Account' }
    ];

    // ✅ Sync with parent form data when modal opens or editingAccount changes
    useEffect(() => {
        if (show) {
            if (editingAccount) {
                // Editing mode - populate with existing data
                setLocalFormData({
                    accountName: editingAccount.accountName || '',
                    type: editingAccount.type || 'bank',
                    bankName: editingAccount.bankName || '',
                    accountNumber: editingAccount.accountNumber || '',
                    ifscCode: editingAccount.ifscCode || '',
                    branchName: editingAccount.branchName || '',
                    upiId: editingAccount.upiId || '',
                    mobileNumber: editingAccount.mobileNumber || '',
                    openingBalance: editingAccount.openingBalance || 0,
                    asOfDate: editingAccount.asOfDate
                        ? new Date(editingAccount.asOfDate).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0],
                    isActive: editingAccount.isActive !== undefined ? editingAccount.isActive : true,
                    accountType: editingAccount.accountType || 'savings',
                    accountHolderName: editingAccount.accountHolderName || '',
                    printUpiQrCodes: editingAccount.printUpiQrCodes || false,
                    printBankDetails: editingAccount.printBankDetails !== undefined ? editingAccount.printBankDetails : true
                });
            } else {
                // New account mode - use defaults or parent form data
                setLocalFormData({
                    accountName: formData?.accountName || '',
                    type: formData?.type || 'bank',
                    bankName: formData?.bankName || '',
                    accountNumber: formData?.accountNumber || '',
                    ifscCode: formData?.ifscCode || '',
                    branchName: formData?.branchName || '',
                    upiId: formData?.upiId || '',
                    mobileNumber: formData?.mobileNumber || '',
                    openingBalance: formData?.openingBalance || 0,
                    asOfDate: formData?.asOfDate || new Date().toISOString().split('T')[0],
                    isActive: formData?.isActive !== undefined ? formData.isActive : true,
                    accountType: formData?.accountType || 'savings',
                    accountHolderName: formData?.accountHolderName || '',
                    printUpiQrCodes: formData?.printUpiQrCodes || false,
                    printBankDetails: formData?.printBankDetails !== undefined ? formData.printBankDetails : true
                });
            }
        }
    }, [show, editingAccount, formData]);

    // ✅ Enhanced company ID resolution with fallbacks
    const getEffectiveCompanyId = () => {
        const sources = [
            companyId,
            localStorage.getItem('selectedCompanyId'),
            sessionStorage.getItem('companyId')
        ];

        try {
            const currentCompanyStr = localStorage.getItem('currentCompany');
            if (currentCompanyStr) {
                const currentCompany = JSON.parse(currentCompanyStr);
                const companyIdFromStorage = currentCompany.id || currentCompany._id;
                if (companyIdFromStorage) {
                    sources.unshift(companyIdFromStorage);
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to parse currentCompany from localStorage:', error);
        }

        for (const source of sources) {
            if (source && source.trim() !== '') {
                return source;
            }
        }

        console.warn('⚠️ No valid company ID found for BankAccountModal');
        return null;
    };

    // ✅ Validate IFSC code in real-time
    const validateIFSC = (value) => {
        if (!value) return { isValid: true, message: '' };
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        const isValid = ifscRegex.test(value.toUpperCase());
        return {
            isValid,
            message: isValid ? '' : 'Invalid IFSC code format (e.g., SBIN0001234)'
        };
    };

    // ✅ Validate UPI ID in real-time
    const validateUPI = (value) => {
        if (!value) return { isValid: true, message: '' };
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        const isValid = upiRegex.test(value);
        return {
            isValid,
            message: isValid ? '' : 'Invalid UPI ID format (e.g., user@paytm)'
        };
    };

    // ✅ Validate mobile number in real-time
    const validateMobile = (value) => {
        if (!value) return { isValid: true, message: '' };
        const mobileRegex = /^[6-9]\d{9}$/;
        const isValid = mobileRegex.test(value);
        return {
            isValid,
            message: isValid ? '' : 'Invalid mobile number (10 digits starting with 6-9)'
        };
    };

    // ✅ Handle input change with validation
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const inputValue = type === 'checkbox' ? checked : value;

        // Update local form data
        setLocalFormData(prev => ({
            ...prev,
            [name]: inputValue
        }));

        // Also call parent onChange if provided
        if (onInputChange) {
            onInputChange(e);
        }

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
        } else if (name === 'mobileNumber') {
            const validation = validateMobile(inputValue);
            setFieldValidation(prev => ({
                ...prev,
                mobileNumber: validation
            }));
        }

        // Clear general errors
        if (error) setError('');
        if (validationErrors.length > 0) setValidationErrors([]);
    };

    // ✅ Validate account details with backend
    const validateAccountDetails = async () => {
        const effectiveCompanyId = getEffectiveCompanyId();

        if (!effectiveCompanyId || !localFormData.accountName) return;

        setValidatingAccount(true);
        try {
            const response = await bankAccountService.validateAccountDetails(effectiveCompanyId, {
                accountName: localFormData.accountName,
                accountNumber: localFormData.accountNumber,
                ifscCode: localFormData.ifscCode,
                upiId: localFormData.upiId,
                type: localFormData.type
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
            if (localFormData.accountName && show) {
                validateAccountDetails();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [localFormData.accountName, localFormData.accountNumber, localFormData.ifscCode, localFormData.upiId, localFormData.type, show]);

    // ✅ Handle form submission
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setValidationErrors([]);

        try {
            const effectiveCompanyId = getEffectiveCompanyId();

            if (!effectiveCompanyId) {
                throw new Error('Company selection required. Please navigate to a valid company URL or select a company.');
            }



            // Client-side validation
            const errors = [];

            if (!localFormData.accountName?.trim()) {
                errors.push('Account display name is required');
            }

            if (!localFormData.type) {
                errors.push('Account type is required');
            }

            if (localFormData.type === 'bank') {
                if (!localFormData.bankName?.trim()) {
                    errors.push('Bank name is required for bank accounts');
                }
                if (!localFormData.accountNumber?.trim()) {
                    errors.push('Account number is required for bank accounts');
                }
                if (!localFormData.ifscCode?.trim()) {
                    errors.push('IFSC code is required for bank accounts');
                }
                if (localFormData.ifscCode && !fieldValidation.ifscCode.isValid) {
                    errors.push('Please enter a valid IFSC code');
                }
            } else if (localFormData.type === 'upi') {
                if (!localFormData.bankName?.trim()) {
                    errors.push('Bank name is required for UPI accounts');
                }
                if (!localFormData.accountNumber?.trim()) {
                    errors.push('Account number is required for UPI accounts');
                }
                if (!localFormData.ifscCode?.trim()) {
                    errors.push('IFSC code is required for UPI accounts');
                }
                if (localFormData.ifscCode && !fieldValidation.ifscCode.isValid) {
                    errors.push('Please enter a valid IFSC code');
                }
                if (!localFormData.upiId?.trim()) {
                    errors.push('UPI ID is required for UPI accounts');
                }
                if (!localFormData.mobileNumber?.trim()) {
                    errors.push('Mobile number is required for UPI accounts');
                }
                if (localFormData.upiId && !fieldValidation.upiId.isValid) {
                    errors.push('Please enter a valid UPI ID');
                }
                if (localFormData.mobileNumber && !fieldValidation.mobileNumber.isValid) {
                    errors.push('Please enter a valid mobile number');
                }
            }

            if (errors.length > 0) {
                setValidationErrors(errors);
                setLoading(false);
                return;
            }

            // Prepare account data
            const accountData = {
                accountName: localFormData.accountName?.trim() || '',
                type: localFormData.type || 'bank',
                bankName: localFormData.bankName?.trim() || '',
                accountNumber: localFormData.accountNumber?.trim() || '',
                ifscCode: localFormData.ifscCode?.toUpperCase().trim() || '',
                branchName: localFormData.branchName?.trim() || '',
                openingBalance: parseFloat(localFormData.openingBalance) || 0,
                asOfDate: localFormData.asOfDate || new Date().toISOString().split('T')[0],
                isActive: localFormData.isActive !== undefined ? Boolean(localFormData.isActive) : true,
                accountType: localFormData.accountType || 'savings',
                accountHolderName: localFormData.accountHolderName?.trim() || '',
                printUpiQrCodes: Boolean(localFormData.printUpiQrCodes),
                printBankDetails: Boolean(localFormData.printBankDetails)
            };

            // Add UPI fields for UPI accounts
            if (localFormData.type === 'upi') {
                accountData.upiId = localFormData.upiId?.toLowerCase().trim() || '';
                accountData.mobileNumber = localFormData.mobileNumber?.trim() || '';
            }



            let response;
            if (editingAccount) {
                response = await bankAccountService.updateBankAccount(
                    effectiveCompanyId,
                    editingAccount._id || editingAccount.id,
                    accountData
                );
            } else {
                response = await bankAccountService.createBankAccount(effectiveCompanyId, accountData);
            }

            // Call parent success handler
            await onSaveAccount(response.data);

            // Close modal
            onHide();

        } catch (error) {
            console.error('❌ Error saving account:', error);

            if (error.response?.data?.errors) {
                setValidationErrors(error.response.data.errors.map(err =>
                    typeof err === 'string' ? err : err.message || err.msg
                ));
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
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
                upiId: { isValid: true, message: '' },
                mobileNumber: { isValid: true, message: '' }
            });
        }
    }, [show]);

    return (
        <>
            <Modal show={show} onHide={onHide} centered size="lg" className="bank-account-modal">
                <Modal.Header closeButton className="bg-gradient-primary">
                    <Modal.Title className="text-white fw-bold">
                        {editingAccount ? '✏️ Edit Account' : '➕ Add New Account'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleFormSubmit}>
                    <Modal.Body className="p-4">
                        {/* Error Alerts */}
                        {error && (
                            <Alert variant="danger" className="mb-3 alert-custom">
                                <div className="d-flex align-items-center">
                                    <span className="me-2">⚠️</span>
                                    <div>
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
                                    </div>
                                </div>
                            </Alert>
                        )}

                        {validationErrors.length > 0 && (
                            <Alert variant="warning" className="mb-3 alert-custom">
                                <div className="d-flex align-items-start">
                                    <span className="me-2 mt-1">📋</span>
                                    <div>
                                        <strong>Please fix the following issues:</strong>
                                        <ul className="mb-0 mt-2">
                                            {validationErrors.map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </Alert>
                        )}

                        {validatingAccount && (
                            <Alert variant="info" className="mb-3 alert-custom">
                                <div className="d-flex align-items-center">
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    <span>Validating account details...</span>
                                </div>
                            </Alert>
                        )}

                        {/* Account Type Selection */}
                        <div className="form-section mb-4">
                            <h6 className="section-title">Account Information</h6>
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-custom">Account Type *</Form.Label>
                                        <Form.Select
                                            name="type"
                                            value={localFormData.type || 'bank'}
                                            onChange={handleInputChange}
                                            required
                                            className="form-control-custom"
                                        >
                                            {accountTypeOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-custom">Account Display Name *</Form.Label>
                                        <Form.Control
                                            name="accountName"
                                            value={localFormData.accountName || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter display name for this account"
                                            required
                                            className="form-control-custom"
                                            isInvalid={!fieldValidation.accountName.isValid}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {fieldValidation.accountName.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>

                        {/* Bank Account Fields */}
                        <div className="form-section mb-4">
                            <h6 className="section-title">Bank Details</h6>
                            <Row className="g-3 mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-custom">Bank Name *</Form.Label>
                                        <Form.Control
                                            name="bankName"
                                            value={localFormData.bankName || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter bank name"
                                            required
                                            className="form-control-custom"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-custom">Account Number *</Form.Label>
                                        <Form.Control
                                            name="accountNumber"
                                            value={localFormData.accountNumber || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter account number"
                                            required
                                            className="form-control-custom"
                                            isInvalid={!fieldValidation.accountNumber.isValid}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {fieldValidation.accountNumber.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-custom">IFSC Code *</Form.Label>
                                        <Form.Control
                                            name="ifscCode"
                                            value={localFormData.ifscCode || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter IFSC code (e.g., SBIN0001234)"
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                            className="form-control-custom"
                                            isInvalid={!fieldValidation.ifscCode.isValid}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {fieldValidation.ifscCode.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-custom">Branch Name</Form.Label>
                                        <Form.Control
                                            name="branchName"
                                            value={localFormData.branchName || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter branch name"
                                            className="form-control-custom"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>

                        {/* UPI Fields */}
                        {localFormData.type === 'upi' && (
                            <div className="form-section mb-4">
                                <h6 className="section-title">UPI Details</h6>
                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="form-label-custom">UPI ID *</Form.Label>
                                            <Form.Control
                                                name="upiId"
                                                value={localFormData.upiId || ''}
                                                onChange={handleInputChange}
                                                placeholder="Enter UPI ID (e.g., business@paytm)"
                                                required
                                                className="form-control-custom"
                                                isInvalid={!fieldValidation.upiId.isValid}
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldValidation.upiId.message}
                                            </Form.Control.Feedback>
                                            <Form.Text className="text-muted">
                                                Used for receiving payments via UPI
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="form-label-custom">Mobile Number *</Form.Label>
                                            <Form.Control
                                                name="mobileNumber"
                                                value={localFormData.mobileNumber || ''}
                                                onChange={handleInputChange}
                                                placeholder="Enter mobile number (10 digits)"
                                                maxLength="10"
                                                required
                                                className="form-control-custom"
                                                isInvalid={!fieldValidation.mobileNumber.isValid}
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {fieldValidation.mobileNumber.message}
                                            </Form.Control.Feedback>
                                            <Form.Text className="text-muted">
                                                Mobile number linked to UPI ID
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </div>
                        )}

                        {/* Opening Balance */}
                        <div className="form-section">
                            <h6 className="section-title">Opening Balance</h6>
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-custom">Opening Balance</Form.Label>
                                        <Form.Control
                                            name="openingBalance"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={localFormData.openingBalance || 0}
                                            onChange={handleInputChange}
                                            placeholder="0.00"
                                            className="form-control-custom"
                                        />
                                        <Form.Text className="text-muted">
                                            Current balance in this account
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="form-label-custom">As of Date</Form.Label>
                                        <Form.Control
                                            name="asOfDate"
                                            type="date"
                                            value={localFormData.asOfDate || new Date().toISOString().split('T')[0]}
                                            onChange={handleInputChange}
                                            max={new Date().toISOString().split('T')[0]}
                                            className="form-control-custom"
                                        />
                                        <Form.Text className="text-muted">
                                            Date of the opening balance
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>
                    </Modal.Body>

                    <Modal.Footer className="modal-footer-custom">
                        <div className="d-flex justify-content-between align-items-center w-100">
                            <small className="text-muted">* Required fields</small>
                            <div>
                                <Button
                                    variant="outline-secondary"
                                    onClick={onHide}
                                    className="me-3 btn-custom-outline"
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={loading || validatingAccount || !getEffectiveCompanyId()}
                                    className="btn-custom-primary"
                                >
                                    {loading ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            {editingAccount ? 'Updating...' : 'Creating...'}
                                        </>
                                    ) : (
                                        <>
                                            {editingAccount ? '💾 Update Account' : '➕ Create Account'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Enhanced Styling */}
            <style>{`
                .bank-account-modal .modal-content {
                    border: none;
                    border-radius: 1rem;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                    overflow: hidden;
                }
                
                .bank-account-modal .bg-gradient-primary {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border-bottom: none;
                }
                
                .bank-account-modal .modal-header .btn-close {
                    filter: brightness(0) invert(1);
                    opacity: 0.8;
                }
                
                .bank-account-modal .modal-header .btn-close:hover {
                    opacity: 1;
                }
                
                .bank-account-modal .form-section {
                    background: #f8f9fa;
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    border: 1px solid #e9ecef;
                }
                
                .bank-account-modal .section-title {
                    color: #495057;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid #6366f1;
                    display: inline-block;
                }
                
                .bank-account-modal .form-label-custom {
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                    display: block;
                }
                
                .bank-account-modal .form-control-custom,
                .bank-account-modal .form-select {
                    border: 2px solid #e5e7eb;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1rem;
                    font-size: 0.875rem;
                    background-color: #ffffff;
                    transition: all 0.2s ease;
                    color: #1f2937;
                }
                
                .bank-account-modal .form-control-custom:focus,
                .bank-account-modal .form-select:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                    background-color: #ffffff;
                    color: #1f2937;
                    outline: none;
                }
                
                .bank-account-modal .form-control-custom::placeholder {
                    color: #9ca3af;
                    opacity: 1;
                }
                
                .bank-account-modal .form-control.is-invalid,
                .bank-account-modal .form-control-custom.is-invalid {
                    border-color: #ef4444;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }
                
                .bank-account-modal .alert-custom {
                    border: none;
                    border-radius: 0.75rem;
                    border-left: 4px solid;
                }
                
                .bank-account-modal .alert-danger {
                    background-color: #fef2f2;
                    color: #991b1b;
                    border-left-color: #ef4444;
                }
                
                .bank-account-modal .alert-warning {
                    background-color: #fffbeb;
                    color: #92400e;
                    border-left-color: #f59e0b;
                }
                
                .bank-account-modal .alert-info {
                    background-color: #eff6ff;
                    color: #1e40af;
                    border-left-color: #3b82f6;
                }
                
                .bank-account-modal .modal-footer-custom {
                    background-color: #f8f9fa;
                    border-top: 1px solid #e9ecef;
                    padding: 1.25rem 1.5rem;
                }
                
                .bank-account-modal .btn-custom-primary {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border: none;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    font-weight: 600;
                    color: white;
                    transition: all 0.2s ease;
                }
                
                .bank-account-modal .btn-custom-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                    background: linear-gradient(135deg, #5b5bf6 0%, #7c3aed 100%);
                }
                
                .bank-account-modal .btn-custom-primary:disabled {
                    opacity: 0.6;
                    transform: none;
                    box-shadow: none;
                }
                
                .bank-account-modal .btn-custom-outline {
                    border: 2px solid #d1d5db;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    font-weight: 600;
                    color: #6b7280;
                    background: white;
                    transition: all 0.2s ease;
                }
                
                .bank-account-modal .btn-custom-outline:hover:not(:disabled) {
                    border-color: #9ca3af;
                    color: #374151;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                
                .bank-account-modal .form-text {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 0.25rem;
                }
                
                /* Input autofill styling */
                .bank-account-modal .form-control-custom:-webkit-autofill,
                .bank-account-modal .form-control-custom:-webkit-autofill:hover,
                .bank-account-modal .form-control-custom:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
                    -webkit-text-fill-color: #1f2937;
                    transition: background-color 5000s ease-in-out 0s;
                }
                
                /* Responsive Design */
                @media (max-width: 768px) {
                    .bank-account-modal .modal-dialog {
                        margin: 0.5rem;
                        max-width: calc(100% - 1rem);
                    }

                    .bank-account-modal .modal-body {
                        padding: 1rem;
                    }

                    .bank-account-modal .form-section {
                        padding: 1rem;
                    }

                    .bank-account-modal .form-control-custom,
                    .bank-account-modal .form-select {
                        font-size: 16px; /* Prevents zoom on iOS */
                        padding: 0.875rem 1rem;
                    }
                    
                    .bank-account-modal .modal-footer-custom {
                        padding: 1rem;
                    }
                    
                    .bank-account-modal .btn-custom-primary,
                    .bank-account-modal .btn-custom-outline {
                        padding: 0.625rem 1.25rem;
                        font-size: 0.875rem;
                    }
                }

                /* Animation for UPI section */
                .bank-account-modal .form-section {
                    animation: fadeInUp 0.3s ease-out;
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
}

export default BankAccountModal;