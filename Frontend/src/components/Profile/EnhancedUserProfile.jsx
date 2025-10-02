import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Tab, Tabs, Alert, Spinner, Image } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faEnvelope, faPhone, faCamera, faLock, faSave, faEdit,
  faMapMarkerAlt, faCalendarAlt, faBuilding, faEye, faEyeSlash,
  faCheckCircle, faExclamationTriangle, faUpload, faTrash, faStore,
  faGlobe, faMapPin, faCity, faFlag, faTimes
} from '@fortawesome/free-solid-svg-icons';
import profileService from '../../services/profileService';
import authService from '../../services/authService';
import pincodeService from '../../services/pincodeService';
import '../../styles/ProfileSystem.css';

import ImageCropModal from './ImageCropModal';

const EnhancedUserProfile = ({ isOpen, onClose, addToast }) => {
  // State management
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('personal');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  const fileInputRef = useRef(null);

  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    profile: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      profileImage: '',
      designation: '',
      department: ''
    },
    address: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    company: {
      name: '',
      designation: '',
      department: ''
    },
    businessInfo: {
      businessCategory: '',
      ownerName: '',
      shopName: '',
      businessPhone: '',
      businessEmail: '',
      website: '',
      shopAddress: '',
      pincode: '',
      villageColony: '',
      tahsilTaluka: '',
      district: '',
      state: '',
      gstNumber: '',
      businessType: '',
      yearEstablished: '',
      employeeCount: '',
      annualTurnover: '',
      businessDescription: ''
    }
  });

  // Password data state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load profile data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  // Load user profile
  const loadProfile = async () => {
    setIsLoading(true);
    try {
      console.log('Loading user profile...');
      
      // Try to get profile from profileService
      let result = await profileService.getUserProfile();
      console.log('Profile service result:', result);

      if (result && result.success && result.data) {
        const userData = result.data;
        setProfile(userData);
        
        // Update form data with profile information
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
          profile: {
            firstName: userData.profile?.firstName || '',
            lastName: userData.profile?.lastName || '',
            dateOfBirth: userData.profile?.dateOfBirth ? 
              new Date(userData.profile.dateOfBirth).toISOString().split('T')[0] : '',
            gender: userData.profile?.gender || '',
            profileImage: userData.profile?.profileImage || '',
            designation: userData.profile?.designation || '',
            department: userData.profile?.department || ''
          },
          address: {
            street: userData.profile?.address?.street || '',
            city: userData.profile?.address?.city || '',
            state: userData.profile?.address?.state || '',
            country: userData.profile?.address?.country || 'India',
            pincode: userData.profile?.address?.pincode || ''
          },
          company: {
            name: userData.companyName || '',
            designation: userData.profile?.designation || '',
            department: userData.profile?.department || ''
          },
          businessInfo: {
            businessCategory: userData.businessInfo?.businessCategory || '',
            ownerName: userData.businessInfo?.ownerName || '',
            shopName: userData.businessInfo?.shopName || '',
            businessPhone: userData.businessInfo?.businessPhone || '',
            businessEmail: userData.businessInfo?.businessEmail || '',
            website: userData.businessInfo?.website || '',
            shopAddress: userData.businessInfo?.shopAddress || '',
            pincode: userData.businessInfo?.pincode || '',
            villageColony: userData.businessInfo?.villageColony || '',
            tahsilTaluka: userData.businessInfo?.tahsilTaluka || '',
            district: userData.businessInfo?.district || '',
            state: userData.businessInfo?.state || '',
            gstNumber: userData.businessInfo?.gstNumber || '',
            businessType: userData.businessInfo?.businessType || '',
            yearEstablished: userData.businessInfo?.yearEstablished || '',
            employeeCount: userData.businessInfo?.employeeCount || '',
            annualTurnover: userData.businessInfo?.annualTurnover || '',
            businessDescription: userData.businessInfo?.businessDescription || ''
          }
        });

        addToast?.('Profile loaded successfully', 'success');
      } else {
        // Fallback to current user from auth service
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          handleFallbackProfile(currentUser);
        } else {
          throw new Error('No user data available');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      addToast?.('Failed to load profile: ' + error.message, 'error');
      
      // Try fallback
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        handleFallbackProfile(currentUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle fallback profile data
  const handleFallbackProfile = (userData) => {
    console.log('Using fallback profile data:', userData);
    setProfile(userData);
    setFormData({
      name: userData.name || userData.username || '',
      email: userData.email || '',
      phone: userData.phone || userData.phoneNumber || '',
      bio: userData.bio || '',
      profile: {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        dateOfBirth: userData.dateOfBirth ? 
          new Date(userData.dateOfBirth).toISOString().split('T')[0] : '',
        gender: userData.gender || '',
        profileImage: userData.profileImage || userData.avatar || '',
        designation: userData.designation || '',
        department: userData.department || ''
      },
      address: {
        street: userData.address?.street || '',
        city: userData.address?.city || '',
        state: userData.address?.state || '',
        country: userData.address?.country || 'India',
        pincode: userData.address?.pincode || ''
      },
      company: {
        name: userData.companyName || '',
        designation: userData.designation || '',
        department: userData.department || ''
      }
    });
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...prev[keys[0]],
            [keys[1]]: value
          }
        };
      } else if (keys.length === 3) {
        return {
          ...prev,
          [keys[0]]: {
            ...prev[keys[0]],
            [keys[1]]: {
              ...prev[keys[0]][keys[1]],
              [keys[2]]: value
            }
          }
        };
      }
      return prev;
    });
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle pincode change and auto-fill location
  const handlePincodeChange = async (field, value) => {
    // Update the pincode field first
    handleInputChange(field, value);
    
    // Auto-fill location if it's a valid 6-digit pincode
    if (value && value.length === 6 && /^[1-9][0-9]{5}$/.test(value)) {
      setIsPincodeLoading(true);
      try {
        const result = await pincodeService.getLocationByPincode(value);
        if (result.success && result.data) {
          const location = result.data;
          
          // Determine which prefix to use based on the field
          const prefix = field.includes('businessInfo') ? 'businessInfo' : 'address';
          
          // Auto-fill location fields
          if (prefix === 'businessInfo') {
            handleInputChange('businessInfo.villageColony', location.village || '');
            handleInputChange('businessInfo.tahsilTaluka', location.taluka || '');
            handleInputChange('businessInfo.district', location.district || '');
            handleInputChange('businessInfo.state', location.state || '');
          } else {
            handleInputChange('address.city', location.village || '');
            handleInputChange('address.state', location.state || '');
          }
          
          addToast?.(`Location auto-filled from pincode ${value}`, 'success');
        }
      } catch (error) {
        console.error('❌ Pincode auto-fill failed:', error);
        addToast?.(`Could not auto-fill location for pincode ${value}`, 'warning');
      } finally {
        setIsPincodeLoading(false);
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (formData.email && !profileService.validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.phone && !profileService.validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle avatar selection
  const handleAvatarSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        addToast?.('Please select a valid image file (JPEG, PNG, or WebP)', 'error');
        return;
      }
      
      // Validate file size (10MB max for cropping)
      if (file.size > 10 * 1024 * 1024) {
        addToast?.('Image size should be less than 10MB', 'error');
        return;
      }
      
      // Create preview for cropping
      const reader = new FileReader();
      reader.onload = (e) => {
        setCropImage(e.target.result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle crop completion
  const handleCropComplete = (croppedBlob) => {
    setCroppedImageBlob(croppedBlob);
    
    // Create preview from cropped blob
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
    };
    reader.readAsDataURL(croppedBlob);
    
    // Convert blob to file for upload
    const croppedFile = new File([croppedBlob], 'profile-image.jpg', {
      type: 'image/jpeg',
      lastModified: new Date().getTime()
    });
    setSelectedAvatar(croppedFile);
  };

  // Upload avatar
  const uploadAvatar = async () => {
    if (!selectedAvatar) return null;
    
    try {
      console.log('Uploading avatar:', selectedAvatar);
      const result = await profileService.updateAvatar(selectedAvatar);
      if (result && result.success) {
        return result.data?.avatarUrl || result.data?.profileImageUrl;
      } else {
        throw new Error(result.error || result.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      addToast?.('Failed to upload avatar: ' + error.message, 'error');
      return null;
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!validateForm()) {
      addToast?.('Please fix the errors before saving', 'error');
      return;
    }

    setIsSaving(true);
    try {
      // Upload avatar if selected
      let avatarUrl = formData.profile.profileImage;
      if (selectedAvatar) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      // Prepare update data
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        profile: {
          ...formData.profile,
          profileImage: avatarUrl,
          address: formData.address
        },
        companyName: formData.company.name
      };

      console.log('Updating profile with data:', updateData);
      
      const result = await profileService.updateProfile(updateData);
      
      if (result && result.success) {
        setProfile(result.data);
        setIsEditing(false);
        setSelectedAvatar(null);
        setAvatarPreview(null);
        addToast?.('Profile updated successfully', 'success');
        
        // Reload profile to get fresh data
        await loadProfile();
      } else {
        throw new Error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      addToast?.('Failed to update profile: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      addToast?.('All password fields are required', 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast?.('New passwords do not match', 'error');
      return;
    }

    const passwordValidation = profileService.validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      addToast?.('Password must be at least 8 characters with uppercase, lowercase, number and special character', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const result = await profileService.changePassword(passwordData);
      
      if (result && result.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
        addToast?.('Password changed successfully', 'success');
      } else {
        throw new Error(result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      addToast?.('Failed to change password: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Get avatar URL
  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (formData.profile.profileImage) return formData.profile.profileImage;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=0d6efd&color=fff&size=128`;
  };

  // Calculate profile completion
  const getProfileCompletion = () => {
    const fields = [
      formData.name, formData.email, formData.phone,
      formData.profile.firstName, formData.profile.lastName,
      formData.profile.dateOfBirth, formData.address.city,
      formData.address.state, formData.profile.designation
    ];
    
    const completed = fields.filter(field => field && field.toString().trim()).length;
    return Math.round((completed / fields.length) * 100);
  };

  if (!isOpen) return null;

  return (
    <Modal show={isOpen} onHide={onClose} size="lg" centered className="profile-modal">
      <Modal.Header closeButton className="border-0">
        <Modal.Title className="d-flex align-items-center">
          <FontAwesomeIcon icon={faUser} className="me-2" />
          User Profile
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {isLoading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-2">Loading profile...</p>
          </div>
        ) : (
          <div>
            {/* Profile completion indicator */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted fw-medium">Profile Completion</span>
                <span className="badge bg-primary">{getProfileCompletion()}%</span>
              </div>
              <div className="profile-completion-bar">
                <div 
                  className="profile-completion-progress" 
                  style={{ width: `${getProfileCompletion()}%` }}
                />
              </div>
            </div>

            {/* Avatar section */}
            <div className="text-center mb-4">
              <div className="profile-avatar-container">
                <Image
                  src={getAvatarUrl()}
                  alt="Profile"
                  className="profile-avatar"
                />
                {isEditing && (
                  <div
                    className="profile-avatar-upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FontAwesomeIcon icon={faCamera} size="sm" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarSelect}
              />
              <div className="mt-2">
                <h5 className="mb-1">{formData.name || 'User'}</h5>
                <p className="text-muted mb-0">{formData.profile.designation || 'No designation'}</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="profile-tabs mb-3">
              {/* Personal Information Tab */}
              <Tab eventKey="personal" title="Personal Info">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faUser} className="me-2" />
                        Full Name *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors.name}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                        Email *
                      </Form.Label>
                      <Form.Control
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors.email}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.profile.firstName}
                        onChange={(e) => handleInputChange('profile.firstName', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.profile.lastName}
                        onChange={(e) => handleInputChange('profile.lastName', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faPhone} className="me-2" />
                        Phone
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors.phone}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phone}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                        Date of Birth
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.profile.dateOfBirth}
                        onChange={(e) => handleInputChange('profile.dateOfBirth', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gender</Form.Label>
                      <Form.Select
                        value={formData.profile.gender}
                        onChange={(e) => handleInputChange('profile.gender', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faBuilding} className="me-2" />
                        Designation
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.profile.designation}
                        onChange={(e) => handleInputChange('profile.designation', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Bio</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                  />
                </Form.Group>
              </Tab>

              {/* Address Tab */}
              <Tab eventKey="address" title="Address">
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    Street Address
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleInputChange('address.street', e.target.value)}
                    disabled={!isEditing}
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>City</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => handleInputChange('address.city', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>State</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => handleInputChange('address.state', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pincode</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.address.pincode}
                        onChange={(e) => handleInputChange('address.pincode', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country</Form.Label>
                      <Form.Select
                        value={formData.address.country}
                        onChange={(e) => handleInputChange('address.country', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="India">India</option>
                        <option value="USA">USA</option>
                        <option value="UK">UK</option>
                        <option value="Canada">Canada</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              {/* Company Tab */}
              <Tab eventKey="company" title="Company">
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FontAwesomeIcon icon={faBuilding} className="me-2" />
                    Company Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.company.name}
                    onChange={(e) => handleInputChange('company.name', e.target.value)}
                    disabled={!isEditing}
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Department</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.profile.department}
                        onChange={(e) => handleInputChange('profile.department', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Designation</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.profile.designation}
                        onChange={(e) => handleInputChange('profile.designation', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              {/* Business Information Tab */}
              <Tab eventKey="business" title={
                <span>
                  <FontAwesomeIcon icon={faStore} className="me-2" />
                  Business
                </span>
              }>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faStore} className="me-2" />
                        Business Category *
                      </Form.Label>
                      <Form.Select
                        value={formData.businessInfo.businessCategory}
                        onChange={(e) => handleInputChange('businessInfo.businessCategory', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors['businessInfo.businessCategory']}
                      >
                        <option value="">Select Category</option>
                        <option value="retail">Retail</option>
                        <option value="wholesale">Wholesale</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="services">Services</option>
                        <option value="trading">Trading</option>
                        <option value="distribution">Distribution</option>
                        <option value="ecommerce">E-commerce</option>
                        <option value="agriculture">Agriculture</option>
                        <option value="textiles">Textiles</option>
                        <option value="electronics">Electronics</option>
                        <option value="food_beverage">Food & Beverage</option>
                        <option value="automotive">Automotive</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="education">Education</option>
                        <option value="construction">Construction</option>
                        <option value="real_estate">Real Estate</option>
                        <option value="other">Other</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors['businessInfo.businessCategory']}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faUser} className="me-2" />
                        Owner Name *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.businessInfo.ownerName}
                        onChange={(e) => handleInputChange('businessInfo.ownerName', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors['businessInfo.ownerName']}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors['businessInfo.ownerName']}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faBuilding} className="me-2" />
                        Shop Name *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.businessInfo.shopName}
                        onChange={(e) => handleInputChange('businessInfo.shopName', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors['businessInfo.shopName']}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors['businessInfo.shopName']}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faPhone} className="me-2" />
                        Business Phone *
                      </Form.Label>
                      <Form.Control
                        type="tel"
                        value={formData.businessInfo.businessPhone}
                        onChange={(e) => handleInputChange('businessInfo.businessPhone', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors['businessInfo.businessPhone']}
                        placeholder="+91 XXXXX XXXXX"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors['businessInfo.businessPhone']}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                        Business Email *
                      </Form.Label>
                      <Form.Control
                        type="email"
                        value={formData.businessInfo.businessEmail}
                        onChange={(e) => handleInputChange('businessInfo.businessEmail', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors['businessInfo.businessEmail']}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors['businessInfo.businessEmail']}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faGlobe} className="me-2" />
                        Website
                      </Form.Label>
                      <Form.Control
                        type="url"
                        value={formData.businessInfo.website}
                        onChange={(e) => handleInputChange('businessInfo.website', e.target.value)}
                        disabled={!isEditing}
                        placeholder="https://example.com"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    Shop Address *
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.businessInfo.shopAddress}
                    onChange={(e) => handleInputChange('businessInfo.shopAddress', e.target.value)}
                    disabled={!isEditing}
                    isInvalid={!!errors['businessInfo.shopAddress']}
                    placeholder="Enter complete shop address"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['businessInfo.shopAddress']}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faMapPin} className="me-2" />
                        PIN Code *
                        {isPincodeLoading && (
                          <Spinner size="sm" className="ms-2" />
                        )}
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.businessInfo.pincode}
                        onChange={(e) => handlePincodeChange('businessInfo.pincode', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors['businessInfo.pincode']}
                        placeholder="000000"
                        maxLength={6}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors['businessInfo.pincode']}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        Enter 6-digit PIN code for auto-fill location
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faCity} className="me-2" />
                        Village/Colony
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.businessInfo.villageColony}
                        onChange={(e) => handleInputChange('businessInfo.villageColony', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tahsil/Taluka</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.businessInfo.tahsilTaluka}
                        onChange={(e) => handleInputChange('businessInfo.tahsilTaluka', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>District</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.businessInfo.district}
                        onChange={(e) => handleInputChange('businessInfo.district', e.target.value)}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faFlag} className="me-2" />
                        State *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.businessInfo.state}
                        onChange={(e) => handleInputChange('businessInfo.state', e.target.value)}
                        disabled={!isEditing}
                        isInvalid={!!errors['businessInfo.state']}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors['businessInfo.state']}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>GST Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.businessInfo.gstNumber}
                        onChange={(e) => handleInputChange('businessInfo.gstNumber', e.target.value)}
                        disabled={!isEditing}
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                      />
                      <Form.Text className="text-muted">
                        Optional: Enter 15-digit GST number
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Business Type</Form.Label>
                      <Form.Select
                        value={formData.businessInfo.businessType}
                        onChange={(e) => handleInputChange('businessInfo.businessType', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Select Type</option>
                        <option value="proprietorship">Sole Proprietorship</option>
                        <option value="partnership">Partnership</option>
                        <option value="llp">Limited Liability Partnership (LLP)</option>
                        <option value="pvt_ltd">Private Limited Company</option>
                        <option value="public_ltd">Public Limited Company</option>
                        <option value="opc">One Person Company (OPC)</option>
                        <option value="cooperative">Cooperative Society</option>
                        <option value="trust">Trust</option>
                        <option value="society">Society</option>
                        <option value="other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Year Established</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.businessInfo.yearEstablished}
                        onChange={(e) => handleInputChange('businessInfo.yearEstablished', e.target.value)}
                        disabled={!isEditing}
                        min="1900"
                        max={new Date().getFullYear()}
                        placeholder={new Date().getFullYear()}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Employee Count</Form.Label>
                      <Form.Select
                        value={formData.businessInfo.employeeCount}
                        onChange={(e) => handleInputChange('businessInfo.employeeCount', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Select Range</option>
                        <option value="1">1</option>
                        <option value="2-5">2-5</option>
                        <option value="6-10">6-10</option>
                        <option value="11-25">11-25</option>
                        <option value="26-50">26-50</option>
                        <option value="51-100">51-100</option>
                        <option value="101-250">101-250</option>
                        <option value="251-500">251-500</option>
                        <option value="500+">500+</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Annual Turnover</Form.Label>
                      <Form.Select
                        value={formData.businessInfo.annualTurnover}
                        onChange={(e) => handleInputChange('businessInfo.annualTurnover', e.target.value)}
                        disabled={!isEditing}
                      >
                        <option value="">Select Range</option>
                        <option value="0-1L">0 - ₹1 Lakh</option>
                        <option value="1-5L">₹1 - ₹5 Lakh</option>
                        <option value="5-10L">₹5 - ₹10 Lakh</option>
                        <option value="10-25L">₹10 - ₹25 Lakh</option>
                        <option value="25-50L">₹25 - ₹50 Lakh</option>
                        <option value="50L-1Cr">₹50 Lakh - ₹1 Crore</option>
                        <option value="1-5Cr">₹1 - ₹5 Crore</option>
                        <option value="5-10Cr">₹5 - ₹10 Crore</option>
                        <option value="10Cr+">₹10 Crore+</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Business Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.businessInfo.businessDescription}
                    onChange={(e) => handleInputChange('businessInfo.businessDescription', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Describe your business, products, and services..."
                  />
                </Form.Group>
              </Tab>

              {/* Security Tab */}
              <Tab eventKey="security" title="Security">
                <div className="mb-3">
                  <Button
                    variant="outline-primary"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                  >
                    <FontAwesomeIcon icon={faLock} className="me-2" />
                    Change Password
                  </Button>
                </div>

                {showPasswordForm && (
                  <div className="border rounded p-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Current Password</Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          placeholder="Enter current password"
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          <FontAwesomeIcon icon={showPasswords.current ? faEyeSlash : faEye} />
                        </Button>
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>New Password</Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Enter new password"
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          <FontAwesomeIcon icon={showPasswords.new ? faEyeSlash : faEye} />
                        </Button>
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Confirm New Password</Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm new password"
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          <FontAwesomeIcon icon={showPasswords.confirm ? faEyeSlash : faEye} />
                        </Button>
                      </div>
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        onClick={handlePasswordChange}
                        disabled={isSaving}
                      >
                        {isSaving ? <Spinner size="sm" className="me-2" /> : null}
                        Change Password
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Tab>
            </Tabs>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          <div>
            {!isEditing ? (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                <FontAwesomeIcon icon={faEdit} className="me-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="d-flex gap-2">
                <Button
                  variant="success"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? <Spinner size="sm" className="me-2" /> : <FontAwesomeIcon icon={faSave} className="me-2" />}
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedAvatar(null);
                    setAvatarPreview(null);
                    loadProfile(); // Reload original data
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} className="me-2" />
              Close
            </Button>
          </div>
        </div>
      </Modal.Footer>
      
      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        imageSrc={cropImage}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        circularCrop={true}
      />
    </Modal>
  );
};

export default EnhancedUserProfile;