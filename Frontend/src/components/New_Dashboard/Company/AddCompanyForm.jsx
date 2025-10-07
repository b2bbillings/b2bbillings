import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faUpload,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faGlobe,
  faIdCard,
  faCalendarAlt,
  faCalculator,
  faInfoCircle,
  faCheck,
  faTrash,
  faPlus,
  faTimes,
  faSpinner,
  faCertificate,
} from "@fortawesome/free-solid-svg-icons";
import companyService from "../../services/companyService";
import "./ContentDisplay.css";

const AddCompanyForm = ({ onClose }) => {
  console.log("🏢 AddCompanyForm component is rendering!");

  // Enhanced state management
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [stepValidationMessage, setStepValidationMessage] = useState('');
  
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    logo: null,
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    mobileNumber: '',
    telephoneNumber: '',
    email: '',
    website: '',
    customFields: [{ title: '', value: '' }],
    gstNumber: '',
    panNumber: '',
    registrationNumber: '',
    financialYearStart: '',
    financialYearEnd: '',
    currency: 'INR',
    companyType: 'Private Limited'
  });

  const [logoPreview, setLogoPreview] = useState(null);

  // Form steps configuration
  const formSteps = [
    { id: 1, title: 'Basic Info', icon: faBuilding },
    { id: 2, title: 'Address', icon: faMapMarkerAlt },
    { id: 3, title: 'Contact', icon: faPhone },
    { id: 4, title: 'Custom Fields', icon: faPlus },
    { id: 5, title: 'Credentials', icon: faIdCard },
    { id: 6, title: 'Financial', icon: faCalculator },
    { id: 7, title: 'Review', icon: faCheck }
  ];

  // Calculate form completion progress
  const calculateProgress = useCallback(() => {
    const totalFields = Object.keys(formData).length;
    let filledFields = 0;

    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'customFields') {
        // Custom fields are optional, count only if they have content
        const hasValidCustomFields = value.some(field => field.title && field.value);
        if (hasValidCustomFields) filledFields++;
      } else if (value && value !== '') {
        filledFields++;
      }
    });

    return Math.round((filledFields / totalFields) * 100);
  }, [formData]);

  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (Object.values(formData).some(val => val !== '' && val !== null)) {
        setAutoSaving(true);
        localStorage.setItem('addCompanyFormData', JSON.stringify(formData));
        setTimeout(() => {
          setAutoSaving(false);
          setLastSaved(new Date().toLocaleTimeString());
        }, 1000);
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [formData]);

  // Load saved data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('addCompanyFormData');
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  }, []);

  // Update progress when form data changes
  useEffect(() => {
    setProgress(calculateProgress());
  }, [formData, calculateProgress]);

  // Validation functions
  const validateField = (fieldName, value) => {
    const errors = { ...validationErrors };
    
    switch (fieldName) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
      case 'mobileNumber':
        if (value && !/^[6-9]\d{9}$/.test(value)) {
          errors.mobileNumber = 'Please enter a valid 10-digit mobile number';
        } else {
          delete errors.mobileNumber;
        }
        break;
      case 'pincode':
        if (value && !/^\d{6}$/.test(value)) {
          errors.pincode = 'Please enter a valid 6-digit PIN code';
        } else {
          delete errors.pincode;
        }
        break;
      case 'gstNumber':
        if (value && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
          errors.gstNumber = 'Please enter a valid GST number';
        } else {
          delete errors.gstNumber;
        }
        break;
      case 'panNumber':
        if (value && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          errors.panNumber = 'Please enter a valid PAN number';
        } else {
          delete errors.panNumber;
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(errors);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Real-time validation
    validateField(field, value);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, logo: file }));
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      customFields: [...prev.customFields, { title: '', value: '' }]
    }));
  };

  const removeCustomField = (index) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
  };

  const updateCustomField = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare form data for API
      const apiData = {
        name: formData.name,
        logo: logoPreview, // base64 string if logo exists
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        country: formData.country || 'India',
        pincode: formData.pincode,
        mobileNumber: formData.mobileNumber,
        telephoneNumber: formData.telephoneNumber,
        email: formData.email,
        website: formData.website,
        customFields: formData.customFields.filter(field => field.title && field.value),
        gstNumber: formData.gstNumber,
        panNumber: formData.panNumber,
        registrationNumber: formData.registrationNumber,
        financialYearStart: formData.financialYearStart,
        financialYearEnd: formData.financialYearEnd,
        currency: formData.currency,
        companyType: formData.companyType
      };

      console.log('🏢 Submitting company data:', apiData);

      // Submit to backend API using service
      const result = await companyService.createCompanyFromForm(apiData);

      console.log('✅ Company created successfully:', result.data);
      
      // Clear saved data after successful submission
      localStorage.removeItem('addCompanyFormData');
      
      // Show success message
      alert(`✅ Company "${result.data.businessName}" has been created successfully!`);
      
      if (onClose) onClose();
    } catch (error) {
      console.error('❌ Error submitting company form:', error);
      
      // Handle specific error types
      if (error.message.includes('Authentication')) {
        alert('❌ Authentication failed. Please login again.');
        // Optionally redirect to login
      } else if (error.message.includes('already exists')) {
        alert(`❌ ${error.message}`);
      } else {
        alert(`❌ Error creating company: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key - show confirmation dialog
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowExitConfirmation(true);
        return;
      }
      
      // Enter key - move to next input field (prevent form submission)
      if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
        e.preventDefault();
        const formInputs = document.querySelectorAll('input, select, textarea');
        const currentIndex = Array.from(formInputs).indexOf(e.target);
        
        if (currentIndex < formInputs.length - 1) {
          formInputs[currentIndex + 1].focus();
        } else {
          // If last field, validate and move to next step or submit
          if (currentStep < 7) {
            if (validateCurrentStep()) {
              setCurrentStep(prev => prev + 1);
              setStepValidationMessage(''); // Clear validation message on successful navigation
              setTimeout(() => {
                const nextStepInputs = document.querySelectorAll('input, select, textarea');
                if (nextStepInputs.length > 0) {
                  nextStepInputs[0].focus();
                }
              }, 100);
            }
          }
        }
        return;
      }
      
      // Arrow key navigation for steps
      if (e.key === 'ArrowRight' && currentStep < 7) {
        if (validateCurrentStep()) {
          setCurrentStep(prev => prev + 1);
          setStepValidationMessage(''); // Clear validation message on successful navigation
        }
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep(prev => prev - 1);
        setStepValidationMessage(''); // Clear validation message when going back
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);
  
  // Validate mandatory fields for each step
  const validateCurrentStep = () => {
    const errors = [];
    
    switch (currentStep) {
      case 1: // Basic Information
        if (!formData.name.trim()) {
          errors.push('Company Name is required');
        }
        break;
      case 2: // Address
        if (!formData.addressLine1.trim()) {
          errors.push('Address Line 1 is required');
        }
        if (!formData.city.trim()) {
          errors.push('City is required');
        }
        if (!formData.state.trim()) {
          errors.push('State is required');
        }
        if (!formData.pincode.trim()) {
          errors.push('PIN Code is required');
        }
        break;
      case 3: // Contact Details
        if (!formData.mobileNumber.trim()) {
          errors.push('Mobile Number is required');
        }
        if (!formData.email.trim()) {
          errors.push('Email Address is required');
        }
        break;
      case 4: // Custom Fields (optional)
        // No mandatory validation for custom fields
        break;
      case 5: // Credentials (optional)
        // No mandatory validation for credentials
        break;
      case 6: // Financial (optional)
        // No mandatory validation for financial info
        break;
      default:
        break;
    }
    
    if (errors.length > 0) {
      setStepValidationMessage('Please fill in the required fields: ' + errors.join(', '));
      setTimeout(() => setStepValidationMessage(''), 5000);
      return false;
    }
    
    // Check for format validation errors only for current step fields with values
    const currentStepFormatErrors = [];
    
    switch (currentStep) {
      case 1: // Basic Information
        // No format validation needed for step 1
        break;
      case 2: // Address
        if (formData.pincode && validationErrors.pincode) {
          currentStepFormatErrors.push(validationErrors.pincode);
        }
        break;
      case 3: // Contact Details
        if (formData.email && validationErrors.email) {
          currentStepFormatErrors.push(validationErrors.email);
        }
        if (formData.mobileNumber && validationErrors.mobileNumber) {
          currentStepFormatErrors.push(validationErrors.mobileNumber);
        }
        break;
      case 5: // Credentials
        if (formData.gstNumber && validationErrors.gstNumber) {
          currentStepFormatErrors.push(validationErrors.gstNumber);
        }
        if (formData.panNumber && validationErrors.panNumber) {
          currentStepFormatErrors.push(validationErrors.panNumber);
        }
        break;
      default:
        break;
    }
    
    if (currentStepFormatErrors.length > 0) {
      setStepValidationMessage('Please fix the following errors: ' + currentStepFormatErrors.join(', '));
      setTimeout(() => setStepValidationMessage(''), 5000);
      return false;
    }
    
    // Clear any existing validation message if validation passes
    setStepValidationMessage('');
    
    return true;
  };

  // Handle exit confirmation
  const handleExitConfirmation = (confirmed) => {
    if (confirmed) {
      // Clear saved data if user confirms exit
      localStorage.removeItem('addCompanyFormData');
      navigate('/');
    }
    setShowExitConfirmation(false);
  };

  const nextStep = () => {
    if (currentStep < 7 && validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
      setStepValidationMessage(''); // Clear any validation message on successful step change
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setStepValidationMessage(''); // Clear validation message when going back
    }
  };

  const renderFormSection = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="form-section">
            <h3><FontAwesomeIcon icon={faBuilding} /> Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div className="form-group logo-upload">
                <label>Company Logo</label>
                <div className="logo-upload-area">
                  {logoPreview ? (
                    <div className="logo-preview">
                      <img src={logoPreview} alt="Logo preview" />
                      <button
                        type="button"
                        className="remove-logo"
                        onClick={() => {
                          setLogoPreview(null);
                          setFormData(prev => ({ ...prev, logo: null }));
                        }}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ) : (
                    <label className="upload-label">
                      <FontAwesomeIcon icon={faUpload} />
                      <span>Click to upload logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="form-section">
            <h3><FontAwesomeIcon icon={faMapMarkerAlt} /> Address Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Address Line 1 *</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                  placeholder="Street address"
                  required
                />
                {validationErrors.addressLine1 && (
                  <span className="error-message">{validationErrors.addressLine1}</span>
                )}
              </div>
              <div className="form-group">
                <label>Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                  placeholder="Apartment, suite, etc."
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                  required
                />
              </div>
              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
                  required
                />
              </div>
              <div className="form-group">
                <label>PIN Code *</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  placeholder="PIN Code"
                  required
                />
                {validationErrors.pincode && (
                  <span className="error-message">{validationErrors.pincode}</span>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="form-section">
            <h3><FontAwesomeIcon icon={faPhone} /> Contact Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                  placeholder="Mobile number"
                  required
                />
                {validationErrors.mobileNumber && (
                  <span className="error-message">{validationErrors.mobileNumber}</span>
                )}
              </div>
              <div className="form-group">
                <label>Telephone Number</label>
                <input
                  type="tel"
                  value={formData.telephoneNumber}
                  onChange={(e) => handleInputChange('telephoneNumber', e.target.value)}
                  placeholder="Telephone number"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Email address"
                  required
                />
                {validationErrors.email && (
                  <span className="error-message">{validationErrors.email}</span>
                )}
              </div>
              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="Website URL"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="form-section">
            <h3><FontAwesomeIcon icon={faPlus} /> Custom Fields</h3>
            <div className="custom-fields-container">
              {formData.customFields.map((field, index) => (
                <div key={index} className="custom-field-row">
                  <div className="form-group">
                    <input
                      type="text"
                      value={field.title}
                      onChange={(e) => updateCustomField(index, 'title', e.target.value)}
                      placeholder="Field title"
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                      placeholder="Field value"
                    />
                  </div>
                  <button
                    type="button"
                    className="remove-field-btn"
                    onClick={() => removeCustomField(index)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-field-btn"
                onClick={addCustomField}
              >
                <FontAwesomeIcon icon={faPlus} /> Add Custom Field
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="form-section">
            <h3><FontAwesomeIcon icon={faIdCard} /> Company Credentials</h3>
            <div className="form-row">
              <div className="form-group">
          <label>GST Type</label>
          <select
            value={formData.gstType}
            onChange={(e) => handleInputChange('gstType', e.target.value)}
          >
            <option value="">Select GST Type</option>
            <option value="Regular">Regular</option>
            <option value="Composition">Composition</option>
            <option value="Unregistered">Unregistered</option>
          </select>
              </div>
              <div className="form-group">
          <label>GST Number</label>
          <input
            type="text"
            value={formData.gstNumber}
            onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
            placeholder="GST Number"
            disabled={formData.gstType === 'Unregistered'}
          />
          {validationErrors.gstNumber && (
            <span className="error-message">{validationErrors.gstNumber}</span>
          )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
          <label>PAN Number</label>
          <input
            type="text"
            value={formData.panNumber}
            onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
            placeholder="PAN Number"
          />
          {validationErrors.panNumber && (
            <span className="error-message">{validationErrors.panNumber}</span>
          )}
              </div>
              
            </div>
            <div className="form-row">
              <div className="form-group">
          <label>Company Type</label>
          <select
            value={formData.companyType}
            onChange={(e) => handleInputChange('companyType', e.target.value)}
          >
            <option value="Private Limited">Private Limited</option>
            <option value="Public Limited">Public Limited</option>
            <option value="Partnership">Partnership</option>
            <option value="LLP">LLP</option>
            <option value="Sole Proprietorship">Sole Proprietorship</option>
          </select>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="form-section">
            <h3><FontAwesomeIcon icon={faCalculator} /> Financial Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Financial Year Start</label>
                <input
                  type="date"
                  value={formData.financialYearStart}
                  onChange={(e) => handleInputChange('financialYearStart', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Financial Year End</label>
                <input
                  type="date"
                  value={formData.financialYearEnd}
                  onChange={(e) => handleInputChange('financialYearEnd', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Base Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="form-section">
            <h3><FontAwesomeIcon icon={faCheck} /> Review & Submit</h3>
            <div className="review-container">
              <div className="review-section">
                <h4>Basic Information</h4>
                <p><strong>Company Name:</strong> {formData.name || 'Not provided'}</p>
                <p><strong>Logo:</strong> {formData.logo ? 'Uploaded' : 'Not uploaded'}</p>
              </div>
              <div className="review-section">
                <h4>Address</h4>
                <p>{formData.addressLine1 || 'Not provided'}</p>
                {formData.addressLine2 && <p>{formData.addressLine2}</p>}
                <p>{formData.city}, {formData.state} - {formData.pincode}</p>
              </div>
              <div className="review-section">
                <h4>Contact Details</h4>
                <p><strong>Mobile:</strong> {formData.mobileNumber || 'Not provided'}</p>
                <p><strong>Email:</strong> {formData.email || 'Not provided'}</p>
                {formData.website && <p><strong>Website:</strong> {formData.website}</p>}
              </div>
              {formData.gstNumber && (
                <div className="review-section">
                  <h4>Credentials</h4>
                  <p><strong>GST:</strong> {formData.gstNumber}</p>
                  <p><strong>PAN:</strong> {formData.panNumber}</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="add-company-content">
        <div className="content-header">
          <div className="content-title">
            <FontAwesomeIcon icon={faBuilding} className="content-icon" />
            <h2>Add New Company</h2>
          </div>
          <div className="content-subtitle">
            Fill in the details below to create a new company profile
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-header">
            <div className="progress-info">
              <span className="progress-text">Form Progress</span>
              <span className="progress-percentage">{Math.round(progress)}% Complete</span>
            </div>
            {autoSaving && (
              <div className="auto-save-indicator">
                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                <span>Auto-saving...</span>
              </div>
            )}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="form-steps">
            {[
              { icon: faBuilding, label: 'Basic Info', step: 1 },
              { icon: faMapMarkerAlt, label: 'Address', step: 2 },
              { icon: faPhone, label: 'Contact', step: 3 },
              { icon: faPlus, label: 'Custom Fields', step: 4 },
              { icon: faCertificate, label: 'Credentials', step: 5 },
              { icon: faCalculator, label: 'Financial', step: 6 },
              { icon: faCheck, label: 'Review', step: 7 }
            ].map((step, index) => (
              <div 
                key={step.step}
                className={`step-indicator ${currentStep >= step.step ? 'active' : ''} ${currentStep === step.step ? 'current' : ''}`}
                onClick={() => {
                  // Only allow moving forward if current step is valid, always allow backward
                  if (step.step <= currentStep) {
                    // Allow backward navigation always
                    setCurrentStep(step.step);
                    setStepValidationMessage(''); // Clear validation message
                  } else if (validateCurrentStep()) {
                    // Allow forward navigation only if validation passes
                    setCurrentStep(step.step);
                    setStepValidationMessage(''); // Clear validation message on successful navigation
                  }
                }}
              >
                <div className="step-icon">
                  <FontAwesomeIcon icon={step.icon} />
                </div>
                <span className="step-label">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Message */}
        {stepValidationMessage && (
          <div className="validation-message-container">
            <div className="validation-message error">
              <FontAwesomeIcon icon={faInfoCircle} />
              <span>{stepValidationMessage}</span>
            </div>
          </div>
        )}

        <div className="content-body">
          <form className="company-form" onSubmit={(e) => { e.preventDefault(); /* Prevent default form submission */ }}>
            {renderFormSection()}

            {/* Navigation Buttons */}
            <div className="form-navigation">
              <button
                type="button"
                className="nav-btn prev-btn"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Previous
              </button>
              
              <div className="step-info">
                Step {currentStep} of 7
              </div>

              {currentStep < 7 ? (
                <button
                  type="button"
                  className="nav-btn next-btn"
                  onClick={nextStep}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  className="nav-btn submit-btn"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} />
                      Submit
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {lastSaved && (
            <div className="last-saved">
              Last saved: {lastSaved}
            </div>
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-header">
              <FontAwesomeIcon icon={faInfoCircle} className="warning-icon" />
              <h3>Confirm Exit</h3>
            </div>
            <div className="confirmation-body">
              <p>Are you sure you want to go back to home?</p>
              <p className="warning-text">Your unsaved changes will be lost.</p>
            </div>
            <div className="confirmation-actions">
              <button 
                className="confirm-btn cancel-btn"
                onClick={() => handleExitConfirmation(false)}
              >
                No, Continue
              </button>
              <button 
                className="confirm-btn exit-btn"
                onClick={() => handleExitConfirmation(true)}
              >
                Yes, Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddCompanyForm;