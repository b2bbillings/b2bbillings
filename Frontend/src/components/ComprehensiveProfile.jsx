import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Nav, Tab, Form, Button, Row, Col, Alert, ProgressBar, Card, Image, Spinner, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, faEnvelope, faPhone, faMapMarkerAlt, faBriefcase, 
  faBuilding, faCamera, faSave, faTimes, faEdit, faCheck,
  faShieldAlt, faChartLine, faGlobe, faUpload, faTrash,
  faStore, faUsers, faCog, faEye, faEyeSlash, faImage
} from '@fortawesome/free-solid-svg-icons';
import profileService from '../services/profileService';
import { pincodeService } from '../services/pincodeService';
import '../styles/ProfileSystem.css';

/**
 * ============================================
 * 🎯 COMPREHENSIVE PROFILE COMPONENT
 * ============================================
 * Complete profile management system with:
 * - Personal, Contact, Address, Business, Professional sections
 * - Image uploads (profile, cover, business images)
 * - Form validation and real-time updates
 * - Progress tracking
 * - Responsive design with Bootstrap
 */

const ComprehensiveProfile = ({ 
  isOpen = false, 
  onClose = () => {}, 
  addToast = () => {},
  initialTab = 'personal',
  readonly = false 
}) => {
  // ============================================
  // 📊 STATE MANAGEMENT
  // ============================================
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    profileType: 'personal',
    personalInfo: {
      firstName: '',
      lastName: '',
      middleName: '',
      displayName: '',
      dateOfBirth: '',
      nationality: 'Indian',
      bio: '',
      profileImage: '',
      coverImage: ''
    },
    contactInfo: {
      primaryEmail: '',
      alternateEmail: '',
      primaryPhone: '',
      alternatePhone: '',
      landlineNumber: '',
      whatsappNumber: '',
      linkedinProfile: '',
      website: ''
    },
    addressInfo: {
      permanent: {
        street: '',
        landmark: '',
        village: '',
        taluka: '',
        district: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      current: {
        street: '',
        landmark: '',
        village: '',
        taluka: '',
        district: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      isSameAddress: true
    },
    professionalInfo: {
      designation: '',
      department: '',
      companyName: '',
      employeeId: '',
      joiningDate: '',
      experience: '',
      salary: {
        amount: '',
        currency: 'INR'
      },
      skills: [],
      certifications: [],
      education: []
    },
    businessInfo: {
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
      businessName: '',
      shopName: '',
      businessCategory: '',
      businessType: 'retail',
      businessModel: 'both',
      establishedYear: '',
      employeeCount: 1,
      businessPhone: '',
      businessEmail: '',
      businessWebsite: '',
      gstNumber: '',
      panNumber: '',
      licenseNumber: '',
      trademarkNumber: '',
      cinNumber: '',
      businessAddress: {
        street: '',
        landmark: '',
        village: '',
        taluka: '',
        district: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      operatingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        sunday: { isOpen: false, openTime: '10:00', closeTime: '17:00' }
      },
      services: [],
      products: [],
      paymentMethods: {
        cash: true,
        card: false,
        upi: false,
        netBanking: false,
        creditFacility: false,
        emi: false
      },
      delivery: {
        homeDelivery: false,
        deliveryRadius: 0,
        deliveryCharge: 0,
        freeDeliveryAbove: 0,
        estimatedDeliveryTime: ''
      },
      images: {
        logo: '',
        shopFront: '',
        interior: [],
        products: []
      },
      specialOffers: [],
      isVerified: false,
      verificationStatus: 'pending',
      verificationDocuments: []
    },
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      youtube: '',
      whatsapp: '',
      googleMaps: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: '',
      address: ''
    },
    preferences: {
      language: 'english',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      theme: 'light'
    }
  });

  // Refs for file inputs
  const profileImageRef = useRef(null);
  const coverImageRef = useRef(null);
  const businessLogoRef = useRef(null);
  const shopFrontRef = useRef(null);
  const interiorImagesRef = useRef(null);
  const productImagesRef = useRef(null);

  // ============================================
  // 📚 CONSTANTS & OPTIONS
  // ============================================
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 
    'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Puducherry', 
    'Andaman and Nicobar Islands'
  ];

  const businessCategories = [
    // 'Computer and IT', 'Electronics', 'Electrical', 'Automobiles', 'Textiles',
    // 'Food & Beverage', 'Healthcare', 'Real Estate', 'Retail', 'Wholesale',
    // 'Manufacturing', 'Services', 'Education', 'Construction', 'Transport',
    // 'Agriculture', 'Automotive', 'Software', 'Finance', 'Hospitality',
    // 'Beauty & Wellness', 'Sports & Fitness', 'Other'
  ];

  const businessTypes = ['retail', 'wholesale', 'manufacturing', 'service', 'distributor', 'other'];
  const businessModels = ['b2b', 'b2c', 'both'];
  const relationshipTypes = ['parent', 'spouse', 'sibling', 'friend', 'colleague', 'relative', 'other'];

  // ============================================
  // 🔄 LIFECYCLE & DATA LOADING
  // ============================================
  // Load profile data when the component mounts so the main page shows DB values.
  // Also reload when the component becomes open (if used as a modal elsewhere).
  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isOpen) loadProfileData();
  }, [isOpen]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading profile data from database...');
      
      const response = await profileService.getProfile();
      console.log('📡 API Response:', response);
      
      if (response.success && response.data) {
        const { user: userData, profile: profileData } = response.data;
        console.log('👤 User data:', userData);
        console.log('📋 Profile data from DB:', profileData);
        
        setUser(userData);
        setProfile(profileData);
        
        // Use database data directly with minimal processing
        if (profileData) {
          setFormData(prevState => {
            const updatedData = {
              ...prevState,
              ...profileData,
              // Ensure nested objects exist and merge with database data
              personalInfo: { ...prevState.personalInfo, ...profileData.personalInfo },
              contactInfo: { ...prevState.contactInfo, ...profileData.contactInfo },
              addressInfo: { 
                ...prevState.addressInfo, 
                ...profileData.addressInfo,
                permanent: { ...prevState.addressInfo?.permanent, ...profileData.addressInfo?.permanent },
                current: { ...prevState.addressInfo?.current, ...profileData.addressInfo?.current }
              },
              professionalInfo: { ...prevState.professionalInfo, ...profileData.professionalInfo },
              businessInfo: { 
                ...prevState.businessInfo, 
                ...profileData.businessInfo,
                businessAddress: { ...prevState.businessInfo?.businessAddress, ...profileData.businessInfo?.businessAddress }
              },
              socialMedia: { ...prevState.socialMedia, ...profileData.socialMedia },
              emergencyContact: { ...prevState.emergencyContact, ...profileData.emergencyContact },
              preferences: { 
                ...prevState.preferences, 
                ...profileData.preferences
              }
            };
            
            console.log('✅ Form data updated with database values:', updatedData);
            return updatedData;
          });
          
          addToast('Profile data loaded from database', 'success');
        } else {
          console.log('ℹ️ No profile data in database, using defaults');
          addToast('No existing profile data found', 'info');
        }
      } else {
        console.error('❌ Failed to load profile:', response);
        addToast('Failed to load profile data', 'error');
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      addToast('Error loading profile data', 'error');
    } finally {
      setLoading(false);
    }
  };



  // ============================================
  // 🔧 HELPER FUNCTIONS
  // ============================================
  const capitalizeInput = (value) => {
    if (!value || typeof value !== 'string') return value;
    return value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // ============================================
  // 🎯 EVENT HANDLERS
  // ============================================
  const handleInputChange = useCallback((section, field, value) => {
    let processedValue = value;
    let fieldError = null;
    
    // Auto-capitalize names and address fields (first letter of each word)
    if (section === 'personalInfo' && ['firstName', 'lastName', 'middleName', 'displayName'].includes(field)) {
      processedValue = capitalizeInput(value);
    }
    if (section === 'addressInfo' && ['street', 'landmark', 'village', 'taluka', 'district', 'city', 'state'].includes(field)) {
      processedValue = capitalizeInput(value);
    }
    if (section === 'businessInfo' && ['ownerName', 'businessName', 'shopName'].includes(field)) {
      processedValue = capitalizeInput(value);
    }
    if (section === 'emergencyContact' && ['name'].includes(field)) {
      processedValue = capitalizeInput(value);
    }
    
    // Phone number validation (exactly 10 digits)
    if (['primaryPhone', 'alternatePhone', 'whatsappNumber'].includes(field)) {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
      if (processedValue.length > 0 && processedValue.length !== 10) {
        fieldError = 'Phone number must be exactly 10 digits';
      }
    }
    
    // Landline number validation (up to 11 digits with STD code)
    if (field === 'landlineNumber') {
      processedValue = value.replace(/\D/g, '').slice(0, 11);
      if (processedValue.length > 0 && processedValue.length < 6) {
        fieldError = 'Landline number must be at least 6 digits';
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: processedValue
      }
    }));
    setIsDirty(true);
    
    // Handle field errors
    if (fieldError) {
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: fieldError
      }));
    } else if (errors[`${section}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${field}`];
        return newErrors;
      });
    }
  }, [errors]);

  const handleNestedInputChange = useCallback((section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
    setIsDirty(true);
  }, []);

  const handleArrayAdd = useCallback((section, field, newItem) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: [...prev[section][field], newItem]
      }
    }));
    setIsDirty(true);
  }, []);

  const handleArrayRemove = useCallback((section, field, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: prev[section][field].filter((_, i) => i !== index)
      }
    }));
    setIsDirty(true);
  }, []);

  const handlePincodeChange = async (section, subsection, value) => {
    // Only allow 6 digits for pincode
    const processedValue = value.replace(/\D/g, '').slice(0, 6);
    handleNestedInputChange(section, subsection, 'pincode', processedValue);
    
    if (processedValue.length === 6) {
      try {
        const locationData = await pincodeService.getLocationByPincode(processedValue);
        if (locationData) {
          // Auto-fill location data with capitalization
          const updates = {
            city: capitalizeInput(locationData.city || locationData.District),
            state: capitalizeInput(locationData.state || locationData.State),
            district: capitalizeInput(locationData.district || locationData.District)
          };
          
          Object.entries(updates).forEach(([field, val]) => {
            if (val) {
              handleNestedInputChange(section, subsection, field, val);
            }
          });
          
          addToast('Location details auto-filled from pincode', 'success');
        }
      } catch (error) {
        console.error('Error fetching pincode data:', error);
      }
    }
  };



  const handleImageUpload = async (imageType, files) => {
    console.log('Image upload not implemented in simplified version');
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Basic validation based on profile type
    if (formData.profileType === 'business' || formData.profileType === 'shop') {
      if (!formData.businessInfo.businessName) {
        newErrors['businessInfo.businessName'] = 'Business name is required';
      }
      if (!formData.businessInfo.businessCategory) {
        newErrors['businessInfo.businessCategory'] = 'Business category is required';
      }
      if (!formData.businessInfo.ownerName) {
        newErrors['businessInfo.ownerName'] = 'Owner name is required';
      }
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.contactInfo.primaryEmail && !emailRegex.test(formData.contactInfo.primaryEmail)) {
      newErrors['contactInfo.primaryEmail'] = 'Invalid email format';
    }
    
    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (formData.contactInfo.primaryPhone && !phoneRegex.test(formData.contactInfo.primaryPhone)) {
      newErrors['contactInfo.primaryPhone'] = 'Invalid phone number format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      addToast('Please fix the errors before saving', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await profileService.updateProfile(formData);
      
      if (response.success) {
        setProfile(response.data.profile);
        setIsDirty(false);
        addToast('Profile updated successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      addToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setIsDirty(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  // ============================================
  // 🎨 RENDER HELPER COMPONENTS
  // ============================================
  const ProgressIndicator = () => (
    <div className="profile-completion-bar mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-bold">Profile Completion</span>
        <Badge bg="primary">Profile</Badge>
      </div>
      <ProgressBar 
        now={50} 
        variant="info"
        className="profile-completion-progress"
      />
    </div>
  );

  const ImageUploadComponent = ({ 
    label, 
    imageType, 
    currentImage, 
    inputRef, 
    multiple = false,
    accept = "image/*"
  }) => (
    <div className="image-upload-container mb-3">
      <Form.Label className="fw-bold">{label}</Form.Label>
      <div className="image-upload-area border rounded p-3 text-center">
        {currentImage && (
          <div className="current-image mb-2">
            {Array.isArray(currentImage) ? (
              <div className="image-grid">
                {currentImage.map((img, index) => (
                  <Image key={index} src={img} alt={label} thumbnail className="upload-thumbnail" />
                ))}
              </div>
            ) : (
              <Image src={currentImage} alt={label} thumbnail className="upload-thumbnail" />
            )}
          </div>
        )}
        <input
          type="file"
          ref={inputRef}
          onChange={(e) => handleImageUpload(imageType, multiple ? Array.from(e.target.files) : e.target.files[0])}
          accept={accept}
          multiple={multiple}
          style={{ display: 'none' }}
        />
        <Button 
          variant="outline-primary" 
          onClick={() => inputRef.current?.click()}
          disabled={uploadingImages}
        >
          <FontAwesomeIcon icon={faUpload} className="me-2" />
          {uploadingImages ? 'Uploading...' : `Upload ${label}`}
        </Button>
      </div>
    </div>
  );

  const OperatingHoursComponent = () => (
    <Card className="mb-3">
      <Card.Header>
        <FontAwesomeIcon icon={faCog} className="me-2" />
        Operating Hours
      </Card.Header>
      <Card.Body>
        {Object.entries(formData.businessInfo.operatingHours).map(([day, hours]) => (
          <Row key={day} className="mb-2 align-items-center">
            <Col md={2}>
              <Form.Label className="text-capitalize fw-bold">{day}</Form.Label>
            </Col>
            <Col md={2}>
              <Form.Check
                type="checkbox"
                label="Open"
                checked={hours.isOpen}
                onChange={(e) => handleNestedInputChange('businessInfo', 'operatingHours', day, {
                  ...hours,
                  isOpen: e.target.checked
                })}
              />
            </Col>
            <Col md={4}>
              <Form.Control
                type="time"
                value={hours.openTime}
                onChange={(e) => handleNestedInputChange('businessInfo', 'operatingHours', day, {
                  ...hours,
                  openTime: e.target.value
                })}
                disabled={!hours.isOpen}
              />
            </Col>
            <Col md={4}>
              <Form.Control
                type="time"
                value={hours.closeTime}
                onChange={(e) => handleNestedInputChange('businessInfo', 'operatingHours', day, {
                  ...hours,
                  closeTime: e.target.value
                })}
                disabled={!hours.isOpen}
              />
            </Col>
          </Row>
        ))}
      </Card.Body>
    </Card>
  );

  // ============================================
  // 🗂️ TAB CONTENT COMPONENTS
  // ============================================

  const PersonalInfoTab = () => (
    <div className="tab-content-section">
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">
              <FontAwesomeIcon icon={faUser} className="me-2" />
              First Name *
            </Form.Label>
            <Form.Control
              type="text"
              value={formData.personalInfo.firstName}
              onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
              placeholder="Enter first name"
              isInvalid={!!errors['personalInfo.firstName']}
              className="profile-form-control"
            />
            <Form.Control.Feedback type="invalid">
              {errors['personalInfo.firstName']}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Last Name *</Form.Label>
            <Form.Control
              type="text"
              value={formData.personalInfo.lastName}
              onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
              placeholder="Enter last name"
              isInvalid={!!errors['personalInfo.lastName']}
              className="profile-form-control"
            />
            <Form.Control.Feedback type="invalid">
              {errors['personalInfo.lastName']}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Middle Name</Form.Label>
            <Form.Control
              type="text"
              value={formData.personalInfo.middleName}
              onChange={(e) => handleInputChange('personalInfo', 'middleName', e.target.value)}
              placeholder="Enter middle name"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Display Name</Form.Label>
            <Form.Control
              type="text"
              value={formData.personalInfo.displayName}
              onChange={(e) => handleInputChange('personalInfo', 'displayName', e.target.value)}
              placeholder="Enter display name"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Date of Birth</Form.Label>
            <Form.Control
              type="date"
              value={formData.personalInfo.dateOfBirth}
              onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
              className="profile-form-control"
            />
          </Form.Group>
        </Col>

      </Row>

      <Form.Group className="mb-3">
        <Form.Label className="profile-form-label">Bio</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          value={formData.personalInfo.bio}
          onChange={(e) => handleInputChange('personalInfo', 'bio', e.target.value)}
          placeholder="Tell us about yourself..."
          maxLength={1000}
          className="profile-form-control"
        />
        <Form.Text className="text-muted">
          {formData.personalInfo.bio.length}/1000 characters
        </Form.Text>
      </Form.Group>

      <Row>
        <Col md={6}>
          <ImageUploadComponent
            label="Profile Image"
            imageType="profileImage"
            currentImage={formData.personalInfo.profileImage}
            inputRef={profileImageRef}
          />
        </Col>
        <Col md={6}>
          <ImageUploadComponent
            label="Cover Image"
            imageType="coverImage"
            currentImage={formData.personalInfo.coverImage}
            inputRef={coverImageRef}
          />
        </Col>
      </Row>
    </div>
  );

  const ContactInfoTab = () => (
    <div className="tab-content-section">
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">
              <FontAwesomeIcon icon={faEnvelope} className="me-2" />
              Primary Email *
            </Form.Label>
            <Form.Control
              type="email"
              value={formData.contactInfo.primaryEmail}
              onChange={(e) => handleInputChange('contactInfo', 'primaryEmail', e.target.value)}
              placeholder="Enter primary email"
              isInvalid={!!errors['contactInfo.primaryEmail']}
              className="profile-form-control"
            />
            <Form.Control.Feedback type="invalid">
              {errors['contactInfo.primaryEmail']}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Alternate Email</Form.Label>
            <Form.Control
              type="email"
              value={formData.contactInfo.alternateEmail}
              onChange={(e) => handleInputChange('contactInfo', 'alternateEmail', e.target.value)}
              placeholder="Enter alternate email"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">
              <FontAwesomeIcon icon={faPhone} className="me-2" />
              Primary Phone *
            </Form.Label>
            <Form.Control
              type="tel"
              value={formData.contactInfo.primaryPhone}
              onChange={(e) => handleInputChange('contactInfo', 'primaryPhone', e.target.value)}
              placeholder="Enter 10-digit mobile number"
              maxLength="10"
              pattern="[0-9]{10}"
              isInvalid={!!errors['contactInfo.primaryPhone']}
              className="profile-form-control"
            />
            <Form.Text className="text-muted">
              Only 10 digits allowed
            </Form.Text>
            <Form.Control.Feedback type="invalid">
              {errors['contactInfo.primaryPhone']}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Alternate Phone</Form.Label>
            <Form.Control
              type="tel"
              value={formData.contactInfo.alternatePhone}
              onChange={(e) => handleInputChange('contactInfo', 'alternatePhone', e.target.value)}
              placeholder="Enter alternate phone"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Landline Number</Form.Label>
            <Form.Control
              type="tel"
              value={formData.contactInfo.landlineNumber}
              onChange={(e) => handleInputChange('contactInfo', 'landlineNumber', e.target.value)}
              placeholder="Enter 10-digit landline number"
              maxLength="10"
              pattern="[0-9]{10}"
              className="profile-form-control"
            />
            <Form.Text className="text-muted">
              Only 10 digits allowed
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">WhatsApp Number</Form.Label>
            <Form.Control
              type="tel"
              value={formData.contactInfo.whatsappNumber}
              onChange={(e) => handleInputChange('contactInfo', 'whatsappNumber', e.target.value)}
              placeholder="Enter WhatsApp number"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">LinkedIn Profile</Form.Label>
            <Form.Control
              type="url"
              value={formData.contactInfo.linkedinProfile}
              onChange={(e) => handleInputChange('contactInfo', 'linkedinProfile', e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">
              <FontAwesomeIcon icon={faGlobe} className="me-2" />
              Website
            </Form.Label>
            <Form.Control
              type="url"
              value={formData.contactInfo.website}
              onChange={(e) => handleInputChange('contactInfo', 'website', e.target.value)}
              placeholder="https://yourwebsite.com"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
      </Row>
    </div>
  );

  const AddressInfoTab = () => (
    <div className="tab-content-section">
      <Form.Group className="mb-4">
        <Form.Check
          type="checkbox"
          label="Current address is same as permanent address"
          checked={formData.addressInfo.isSameAddress}
          onChange={(e) => handleInputChange('addressInfo', 'isSameAddress', e.target.checked)}
          className="fw-bold"
        />
      </Form.Group>

      <Card className="mb-4">
        <Card.Header>
          <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
          Permanent Address
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label className="profile-form-label">Street Address</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.addressInfo.permanent.street}
                  onChange={(e) => handleNestedInputChange('addressInfo', 'permanent', 'street', e.target.value)}
                  placeholder="Enter street address"
                  className="profile-form-control"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="profile-form-label">Landmark</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.addressInfo.permanent.landmark}
                  onChange={(e) => handleNestedInputChange('addressInfo', 'permanent', 'landmark', e.target.value)}
                  placeholder="Enter landmark"
                  className="profile-form-control"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="profile-form-label">Village</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.addressInfo.permanent.village}
                  onChange={(e) => handleNestedInputChange('addressInfo', 'permanent', 'village', e.target.value)}
                  placeholder="Enter village"
                  className="profile-form-control"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="profile-form-label">Taluka</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.addressInfo.permanent.taluka}
                  onChange={(e) => handleNestedInputChange('addressInfo', 'permanent', 'taluka', e.target.value)}
                  placeholder="Enter taluka"
                  className="profile-form-control"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="profile-form-label">District</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.addressInfo.permanent.district}
                  onChange={(e) => handleNestedInputChange('addressInfo', 'permanent', 'district', e.target.value)}
                  placeholder="Enter district"
                  className="profile-form-control"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="profile-form-label">Pincode</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.addressInfo.permanent.pincode}
                  onChange={(e) => handlePincodeChange('addressInfo', 'permanent', e.target.value)}
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className="profile-form-control"
                />
                <Form.Text className="text-muted">
                  Enter 6-digit pincode to auto-fill address details
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="profile-form-label">City</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.addressInfo.permanent.city}
                  onChange={(e) => handleNestedInputChange('addressInfo', 'permanent', 'city', e.target.value)}
                  placeholder="Enter city"
                  className="profile-form-control"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="profile-form-label">State</Form.Label>
                <Form.Select
                  value={formData.addressInfo.permanent.state}
                  onChange={(e) => handleNestedInputChange('addressInfo', 'permanent', 'state', e.target.value)}
                  className="profile-form-control"
                >
                  <option value="">Select State</option>
                  {indianStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {!formData.addressInfo.isSameAddress && (
        <Card className="mb-4">
          <Card.Header>
            <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
            Current Address
          </Card.Header>
          <Card.Body>
            {/* Similar structure as permanent address */}
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="profile-form-label">Street Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.addressInfo.current.street}
                    onChange={(e) => handleNestedInputChange('addressInfo', 'current', 'street', e.target.value)}
                    placeholder="Enter street address"
                    className="profile-form-control"
                  />
                </Form.Group>
              </Col>
            </Row>
            {/* Add other current address fields similar to permanent address */}
          </Card.Body>
        </Card>
      )}
    </div>
  );

  const SecuritySettingsTab = () => (
    <div className="tab-content-section">
      <Card>
        <Card.Header>
          <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
          Security & Privacy Settings
        </Card.Header>
        <Card.Body>
          <p>Security settings will be available soon.</p>
        </Card.Body>
      </Card>
    </div>
  );

  const BusinessInfoTab = () => (
    <div className="tab-content-section">
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">
              <FontAwesomeIcon icon={faUser} className="me-2" />
              Owner Name *
            </Form.Label>
            <Form.Control
              type="text"
              value={formData.businessInfo.ownerName}
              onChange={(e) => handleInputChange('businessInfo', 'ownerName', e.target.value)}
              placeholder="Enter owner name"
              isInvalid={!!errors['businessInfo.ownerName']}
              className="profile-form-control"
            />
            <Form.Control.Feedback type="invalid">
              {errors['businessInfo.ownerName']}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">
              <FontAwesomeIcon icon={faStore} className="me-2" />
              Business Name *
            </Form.Label>
            <Form.Control
              type="text"
              value={formData.businessInfo.businessName}
              onChange={(e) => handleInputChange('businessInfo', 'businessName', e.target.value)}
              placeholder="Enter business name"
              isInvalid={!!errors['businessInfo.businessName']}
              className="profile-form-control"
            />
            <Form.Control.Feedback type="invalid">
              {errors['businessInfo.businessName']}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Business Category *</Form.Label>
            <Form.Select
              value={formData.businessInfo.businessCategory}
              onChange={(e) => handleInputChange('businessInfo', 'businessCategory', e.target.value)}
              isInvalid={!!errors['businessInfo.businessCategory']}
              className="profile-form-control"
            >
              <option value="">Select Category</option>
              {businessCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {errors['businessInfo.businessCategory']}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Business Type</Form.Label>
            <Form.Select
              value={formData.businessInfo.businessType}
              onChange={(e) => handleInputChange('businessInfo', 'businessType', e.target.value)}
              className="profile-form-control"
            >
              {businessTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Business Model</Form.Label>
            <Form.Select
              value={formData.businessInfo.businessModel}
              onChange={(e) => handleInputChange('businessInfo', 'businessModel', e.target.value)}
              className="profile-form-control"
            >
              {businessModels.map(model => (
                <option key={model} value={model}>{model.toUpperCase()}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Business Phone</Form.Label>
            <Form.Control
              type="tel"
              value={formData.businessInfo.businessPhone}
              onChange={(e) => handleInputChange('businessInfo', 'businessPhone', e.target.value)}
              placeholder="Enter business phone"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Business Email</Form.Label>
            <Form.Control
              type="email"
              value={formData.businessInfo.businessEmail}
              onChange={(e) => handleInputChange('businessInfo', 'businessEmail', e.target.value)}
              placeholder="Enter business email"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">Business Website</Form.Label>
            <Form.Control
              type="url"
              value={formData.businessInfo.businessWebsite}
              onChange={(e) => handleInputChange('businessInfo', 'businessWebsite', e.target.value)}
              placeholder="https://yourwebsite.com"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">GST Number</Form.Label>
            <Form.Control
              type="text"
              value={formData.businessInfo.gstNumber}
              onChange={(e) => handleInputChange('businessInfo', 'gstNumber', e.target.value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">PAN Number</Form.Label>
            <Form.Control
              type="text"
              value={formData.businessInfo.panNumber}
              onChange={(e) => handleInputChange('businessInfo', 'panNumber', e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="profile-form-label">License Number</Form.Label>
            <Form.Control
              type="text"
              value={formData.businessInfo.licenseNumber}
              onChange={(e) => handleInputChange('businessInfo', 'licenseNumber', e.target.value)}
              placeholder="Enter license number"
              className="profile-form-control"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <ImageUploadComponent
            label="Business Logo"
            imageType="businessLogo"
            currentImage={formData.businessInfo.images.logo}
            inputRef={businessLogoRef}
          />
        </Col>
        <Col md={6}>
          <ImageUploadComponent
            label="Shop Front Image"
            imageType="shopFrontImage"
            currentImage={formData.businessInfo.images.shopFront}
            inputRef={shopFrontRef}
          />
        </Col>
      </Row>

      <OperatingHoursComponent />
    </div>
  );

  // ============================================
  // 🎭 MAIN RENDER
  // ============================================
  if (loading) {
    return (
      <Modal show={isOpen} onHide={onClose} size="lg" centered className="profile-modal">
        <Modal.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading profile data...</p>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Modal 
      show={isOpen} 
      onHide={handleClose} 
      size="xl" 
      centered 
      className="profile-modal"
      backdrop="static"
    >
      <Modal.Header className="profile-modal-header">
        <Modal.Title className="profile-modal-title">
          <FontAwesomeIcon icon={faUser} className="me-2" />
          Comprehensive Profile Management
        </Modal.Title>
        <Button
          variant="link"
          onClick={handleClose}
          className="btn-close profile-close-btn"
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faTimes} />
        </Button>
      </Modal.Header>

      <Modal.Body className="profile-modal-body">
        <ProgressIndicator />

        {/* Profile Type Selector */}
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={8}>
                <Form.Group>
                  <Form.Label className="fw-bold">Profile Type</Form.Label>
                  <Form.Select
                    value={formData.profileType}
                    onChange={(e) => handleInputChange('', 'profileType', e.target.value)}
                    className="profile-form-control"
                  >
                    <option value="personal">Personal Profile</option>
                    <option value="business">Business Profile</option>
                    <option value="shop">Shop Profile</option>
                    <option value="professional">Professional Profile</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <div className="text-end">
                  <Badge 
                    bg="info"
                    className="fs-6"
                  >
                    <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
                    Pending
                  </Badge>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Navigation Tabs */}
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="pills" className="profile-tabs mb-4">
            <Nav.Item>
              <Nav.Link eventKey="personal">
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Personal
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="contact">
                <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                Contact
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="address">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                Address
              </Nav.Link>
            </Nav.Item>
            {(formData.profileType === 'business' || formData.profileType === 'shop') && (
              <Nav.Item>
                <Nav.Link eventKey="business">
                  <FontAwesomeIcon icon={faStore} className="me-2" />
                  Business
                </Nav.Link>
              </Nav.Item>
            )}
            {formData.profileType === 'professional' && (
              <Nav.Item>
                <Nav.Link eventKey="professional">
                  <FontAwesomeIcon icon={faBriefcase} className="me-2" />
                  Professional
                </Nav.Link>
              </Nav.Item>
            )}
            <Nav.Item>
              <Nav.Link eventKey="social">
                <FontAwesomeIcon icon={faGlobe} className="me-2" />
                Social
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="settings">
                <FontAwesomeIcon icon={faCog} className="me-2" />
                Settings
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            <Tab.Pane eventKey="personal">
              <PersonalInfoTab />
            </Tab.Pane>
            <Tab.Pane eventKey="contact">
              <ContactInfoTab />
            </Tab.Pane>
            <Tab.Pane eventKey="address">
              <AddressInfoTab />
            </Tab.Pane>
            <Tab.Pane eventKey="business">
              <BusinessInfoTab />
            </Tab.Pane>
            <Tab.Pane eventKey="social">
              <div className="tab-content-section">
                <h5>Social Media Links</h5>
                <p className="text-muted">Connect your social media profiles</p>
                {/* Add social media form fields */}
              </div>
            </Tab.Pane>
            <Tab.Pane eventKey="settings">
              <SecuritySettingsTab />
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>

        {/* Error Display */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="danger" className="mb-3">
            <h6>Please fix the following errors:</h6>
            <ul className="mb-0">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="profile-modal-footer">
        <div className="d-flex justify-content-between align-items-center w-100">
          <div>
            {isDirty && (
              <Badge bg="warning" className="me-2">
                <FontAwesomeIcon icon={faEdit} className="me-1" />
                Unsaved Changes
              </Badge>
            )}

          </div>
          <div>
            <Button
              variant="secondary"
              onClick={handleClose}
              className="me-2"
              disabled={saving}
            >
              <FontAwesomeIcon icon={faTimes} className="me-2" />
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="profile-btn-primary"
            >
              {saving ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="me-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ComprehensiveProfile;