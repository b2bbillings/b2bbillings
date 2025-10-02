/**
 * ============================================
 * 🎯 COMPREHENSIVE PROFILE PAGE
 * ============================================
 * Modern, responsive profile management with:
 * - Personal, Contact, Business, Professional, Security tabs
 * - Image uploads with preview
 * - Real-time validation
 * - Progress tracking
 * - Beautiful animations and design
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Tab, 
  Nav, 
  Form, 
  Button, 
  Alert, 
  Badge, 
  ProgressBar,
  Modal,
  Spinner,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faBuilding,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faLock,
  faCamera,
  faEdit,
  faSave,
  faTimes,
  faCheck,
  faEye,
  faEyeSlash,
  faUpload,
  faTrash,
  faUserTie,
  faGlobe,
  faCalendar,
  faIdCard,
  faBriefcase,
  faGraduationCap,
  faCertificate,
  faStore,
  faIndustry,
  faChartLine,
  faShield,
  faCog,
  faImage,
  faFileImage,
  faArrowLeft,
  faSignOutAlt,
  faBars,
  faSpinner,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';

// Services
import { profileService } from '../services/profileService';
import authService from '../services/authService';

// Styles
import '../styles/ProfileSystem.css';

const ProfilePage = ({ addToast = () => {}, onClose = null, currentUser = null, onLogout = null, onNavigateBack = null, isFullscreen = false }) => {
  // ============================================
  // 📊 STATE MANAGEMENT
  // ============================================
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  
  // Individual edit modes for each section
  const [isPersonalEdit, setIsPersonalEdit] = useState(false);
  const [isContactEdit, setIsContactEdit] = useState(false);
  const [isAddressEdit, setIsAddressEdit] = useState(false);
  const [isBusinessEdit, setIsBusinessEdit] = useState(false);
  const [isSecurityEdit, setIsSecurityEdit] = useState(false);
  
  // Navigation and fullscreen
  const navigate = useNavigate();

  // Form data state - comprehensive profile structure
  const [formData, setFormData] = useState({
    profileType: 'personal',
    personalInfo: {
      firstName: '',
      lastName: '',
      middleName: '',
      displayName: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
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
      businessCategory: [],
      businessCategoryOther: '',
      businessType: [],
      businessTypeOther: '',
      establishedYear: '',
      employeeCount: 1,
      businessPhone: '',
      businessEmail: '',
      businessWebsite: '',
      gstNumber: '',
      panNumber: '',
      licenseNumber: '',
      businessAddress: {
        street: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      images: {
        logo: '',
        shopFront: '',
        interior: []
      }
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
      theme: 'light',
      notifications: {
        email: true,
        sms: true,
        push: true
      },
      privacy: {
        profileVisibility: 'connections-only',
        showEmail: false,
        showPhone: false
      }
    }
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // File input refs
  const profileImageRef = useRef(null);
  const coverImageRef = useRef(null);
  const businessLogoRef = useRef(null);

  // ============================================
  // 📚 CONSTANTS & OPTIONS
  // ============================================
  const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 
    'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Puducherry', 
    'Andaman and Nicobar Islands'
  ];

  const BUSINESS_CATEGORIES = [
    'Computer and IT', 'Electronics', 'Electrical', 'Automobiles', 'Textiles', 
    'Food & Beverage', 'Healthcare', 'Real Estate', 'Retail', 'Wholesale', 
    'Manufacturing', 'Services', 'Education', 'Construction', 'Transport', 
    'Agriculture', 'Automotive', 'Software', 'Finance', 'Hospitality', 
    'Beauty & Wellness', 'Sports & Fitness'
  ];

  const BUSINESS_TYPES = [
    'Retail', 'Wholesale', 'Manufacturing', 'Service', 'Distributor'
  ];

  const RELATIONSHIP_OPTIONS = [
    'Father', 'Mother', 'Spouse', 'Brother', 'Sister', 'Son', 'Daughter',
    'Friend', 'Colleague', 'Other'
  ];

  // ============================================
  // 🔄 LIFECYCLE & DATA LOADING
  // ============================================
  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    calculateCompletionPercentage();
  }, [formData]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        addToast('Please login to view profile', 'error');
        return;
      }
      
      setUser(currentUser);

      // Get profile data
      const profileResponse = await profileService.getUserProfile();
      
      if (profileResponse.success && profileResponse.data) {
        const profileData = profileResponse.data;
        setProfile(profileData);
        
        // Merge user and profile data into form
        setFormData({
          ...formData,
          personalInfo: {
            ...formData.personalInfo,
            firstName: profileData.personalInfo?.firstName || currentUser.name?.split(' ')[0] || '',
            lastName: profileData.personalInfo?.lastName || currentUser.name?.split(' ').slice(1).join(' ') || '',
            displayName: profileData.personalInfo?.displayName || currentUser.name || '',
            bio: profileData.personalInfo?.bio || '',
            profileImage: profileData.personalInfo?.profileImage || currentUser.avatar || '',
            ...profileData.personalInfo
          },
          contactInfo: {
            ...formData.contactInfo,
            primaryEmail: profileData.contactInfo?.primaryEmail || currentUser.email || '',
            primaryPhone: profileData.contactInfo?.primaryPhone || currentUser.phone || '',
            ...profileData.contactInfo
          },
          addressInfo: profileData.addressInfo || formData.addressInfo,
          professionalInfo: profileData.professionalInfo || formData.professionalInfo,
          businessInfo: normalizeBusinessInfo(profileData.businessInfo),
          emergencyContact: profileData.emergencyContact || formData.emergencyContact,
          preferences: profileData.preferences || formData.preferences,
          profileType: profileData.profileType || 'personal'
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      addToast('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 📊 COMPLETION CALCULATION
  // ============================================
  const calculateCompletionPercentage = () => {
    let totalFields = 0;
    let filledFields = 0;

    // Helper function to count fields recursively
    const countFields = (obj, prefix = '') => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            countFields(value, `${prefix}${key}.`);
          } else if (key !== 'isSameAddress' && key !== 'profileType') {
            totalFields++;
            if (value && value !== '' && value !== 0 && !(Array.isArray(value) && value.length === 0)) {
              filledFields++;
            }
          }
        }
      }
    };

    // Count important sections
    countFields(formData.personalInfo);
    countFields(formData.contactInfo);
    countFields(formData.addressInfo.permanent);
    if (!formData.addressInfo.isSameAddress) {
      countFields(formData.addressInfo.current);
    }

    if (formData.profileType === 'business' || formData.profileType === 'shop') {
      countFields(formData.businessInfo);
    }
    
    if (formData.profileType === 'professional') {
      countFields(formData.professionalInfo);
    }

    const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    setCompletionPercentage(percentage);
  };

  // ============================================
  // 📝 FORM HANDLING
  // ============================================
  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setIsDirty(true);
    setErrors(prev => ({
      ...prev,
      [`${section}.${field}`]: ''
    }));
  };

  const handleNestedInputChange = (section, subsection, field, value) => {
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
    setErrors(prev => ({
      ...prev,
      [`${section}.${subsection}.${field}`]: ''
    }));
  };

  // ============================================
  // ☑️ CHECKBOX HANDLING FOR MULTI-SELECT
  // ============================================
  const handleCheckboxChange = (section, field, value, isChecked) => {
    setFormData(prev => {
      const currentArray = prev[section][field] || [];
      let newArray;
      
      if (isChecked) {
        // Add value if checked and not already present
        newArray = currentArray.includes(value) ? currentArray : [...currentArray, value];
      } else {
        // Remove value if unchecked
        newArray = currentArray.filter(item => item !== value);
      }
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      };
    });
    setIsDirty(true);
    setErrors(prev => ({
      ...prev,
      [`${section}.${field}`]: ''
    }));
  };

  // ============================================
  // � DATA NORMALIZATION
  // ============================================
  const normalizeBusinessInfo = (businessInfo) => {
    if (!businessInfo) return formData.businessInfo;
    
    return {
      ...businessInfo,
      businessCategory: Array.isArray(businessInfo.businessCategory) 
        ? businessInfo.businessCategory 
        : businessInfo.businessCategory 
          ? [businessInfo.businessCategory] 
          : [],
      businessType: Array.isArray(businessInfo.businessType) 
        ? businessInfo.businessType 
        : businessInfo.businessType 
          ? [businessInfo.businessType] 
          : [],
      businessCategoryOther: businessInfo.businessCategoryOther || '',
      businessTypeOther: businessInfo.businessTypeOther || ''
    };
  };

  // ============================================
  // �🔒 PASSWORD MANAGEMENT
  // ============================================
  const handlePasswordChange = async () => {
    try {
      // Validation
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        addToast('All password fields are required', 'error');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        addToast('New passwords do not match', 'error');
        return;
      }

      if (passwordData.newPassword.length < 8) {
        addToast('New password must be at least 8 characters long', 'error');
        return;
      }

      setSaving(true);
      
      const response = await profileService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.success) {
        addToast('Password changed successfully', 'success');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        addToast(response.message || 'Failed to change password', 'error');
      }
    } catch (error) {
      console.error('Password change error:', error);
      addToast('Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // 📷 IMAGE UPLOAD HANDLING
  // ============================================
  const handleImageUpload = async (imageType, file) => {
    if (!file) return;

    try {
      setUploadingImage(true);
      
      const response = await profileService.updateAvatar(file);
      
      if (response.success) {
        const imageUrl = response.data.avatarUrl || response.data.profileImageUrl;
        
        if (imageType === 'profile') {
          handleInputChange('personalInfo', 'profileImage', imageUrl);
        } else if (imageType === 'cover') {
          handleInputChange('personalInfo', 'coverImage', imageUrl);
        } else if (imageType === 'businessLogo') {
          handleNestedInputChange('businessInfo', 'images', 'logo', imageUrl);
        }
        
        addToast('Image uploaded successfully', 'success');
      } else {
        addToast(response.message || 'Failed to upload image', 'error');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      addToast('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // ============================================
  // 💾 SAVE PROFILE
  // ============================================
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Basic validation
      const newErrors = {};
      
      if (!formData.personalInfo.firstName?.trim()) {
        newErrors['personalInfo.firstName'] = 'First name is required';
      }
      
      if (!formData.contactInfo.primaryEmail?.trim()) {
        newErrors['contactInfo.primaryEmail'] = 'Primary email is required';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        addToast('Please fix the errors before saving', 'error');
        return;
      }

      const response = await profileService.updateProfile(formData);
      
      if (response.success) {
        addToast('Profile updated successfully', 'success');
        setIsDirty(false);
        setProfile(response.data);
      } else {
        addToast(response.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      addToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // 🔄 SECTION-SPECIFIC SAVE HANDLERS
  // ============================================
  const handleSavePersonalInfo = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validate personal info
      const newErrors = {};
      if (!formData.personalInfo.firstName?.trim()) {
        newErrors['personalInfo.firstName'] = 'First name is required';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        addToast('Please fix the errors before saving', 'error');
        return;
      }

      // Create update data with only personal info
      const updateData = {
        personalInfo: formData.personalInfo
      };

      const response = await profileService.updateProfile(updateData);
      
      if (response.success) {
        addToast('Personal information updated successfully', 'success');
        setIsPersonalEdit(false);
        setIsDirty(false);
        // Update form data with response
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            personalInfo: response.data.personalInfo || prev.personalInfo
          }));
        }
      } else {
        addToast(response.message || 'Failed to update personal information', 'error');
      }
    } catch (error) {
      console.error('Save personal info error:', error);
      addToast('Failed to save personal information', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContactInfo = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validate contact info
      const newErrors = {};
      if (!formData.contactInfo.primaryEmail?.trim()) {
        newErrors['contactInfo.primaryEmail'] = 'Primary email is required';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        addToast('Please fix the errors before saving', 'error');
        return;
      }

      // Create update data with only contact info
      const updateData = {
        contactInfo: formData.contactInfo
      };

      const response = await profileService.updateProfile(updateData);
      
      if (response.success) {
        addToast('Contact information updated successfully', 'success');
        setIsContactEdit(false);
        setIsDirty(false);
        // Update form data with response
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            contactInfo: response.data.contactInfo || prev.contactInfo
          }));
        }
      } else {
        addToast(response.message || 'Failed to update contact information', 'error');
      }
    } catch (error) {
      console.error('Save contact info error:', error);
      addToast('Failed to save contact information', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddressInfo = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Create update data with only address info
      const updateData = {
        addressInfo: formData.addressInfo
      };

      const response = await profileService.updateProfile(updateData);
      
      if (response.success) {
        addToast('Address information updated successfully', 'success');
        setIsAddressEdit(false);
        setIsDirty(false);
        // Update form data with response
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            addressInfo: response.data.addressInfo || prev.addressInfo
          }));
        }
      } else {
        addToast(response.message || 'Failed to update address information', 'error');
      }
    } catch (error) {
      console.error('Save address info error:', error);
      addToast('Failed to save address information', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessInfo = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Create update data with only business info
      const updateData = {
        businessInfo: formData.businessInfo
      };

      const response = await profileService.updateProfile(updateData);
      
      if (response.success) {
        addToast('Business information updated successfully', 'success');
        setIsBusinessEdit(false);
        setIsDirty(false);
        // Update form data with response
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            businessInfo: response.data.businessInfo || prev.businessInfo
          }));
        }
      } else {
        addToast(response.message || 'Failed to update business information', 'error');
      }
    } catch (error) {
      console.error('Save business info error:', error);
      addToast('Failed to save business information', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurityInfo = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Create update data with only preferences (security settings)
      const updateData = {
        preferences: formData.preferences
      };

      const response = await profileService.updateProfile(updateData);
      
      if (response.success) {
        addToast('Security settings updated successfully', 'success');
        setIsSecurityEdit(false);
        setIsDirty(false);
        // Update form data with response
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            preferences: response.data.preferences || prev.preferences
          }));
        }
      } else {
        addToast(response.message || 'Failed to update security settings', 'error');
      }
    } catch (error) {
      console.error('Save security info error:', error);
      addToast('Failed to save security settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // 🎨 RENDER METHODS
  // ============================================

  // Helper function to render field displays
  const renderFieldDisplay = (label, value, icon = null) => (
    <div className="profile-field-display mb-3">
      <div className="field-label">
        {icon && <FontAwesomeIcon icon={icon} className="me-2 text-muted" />}
        <strong>{label}:</strong>
      </div>
      <div className="field-value">
        {value || <span className="text-muted">Not provided</span>}
      </div>
    </div>
  );

  const renderFieldInput = (label, value, onChange, type = "text", options = null, placeholder = "", required = false, icon = null) => (
    <Form.Group className="mb-3">
      <Form.Label>
        {icon && <FontAwesomeIcon icon={icon} className="me-2" />}
        {label} {required && <span className="text-danger">*</span>}
      </Form.Label>
      {type === "select" ? (
        <Form.Select value={value} onChange={onChange}>
          <option value="">Select {label.toLowerCase()}</option>
          {options?.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Form.Select>
      ) : type === "textarea" ? (
        <Form.Control
          as="textarea"
          rows={3}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      ) : (
        <Form.Control
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </Form.Group>
  );

  const renderCustomCheckbox = (label, checked, onChange, className = "mb-3") => {
    const handleChange = (e) => {
      onChange(e);
      setIsDirty(true);
    };

    const handleClick = () => {
      handleChange({target: {checked: !checked}});
    };

    return (
      <div className={`custom-checkbox form-check ${className}`}>
        <input
          className="form-check-input"
          type="checkbox"
          checked={checked}
          onChange={handleChange}
        />
        <div className="custom-checkbox-icon" onClick={handleClick}>
          {checked && <FontAwesomeIcon icon={faCheck} size="sm" />}
        </div>
        <label className="form-check-label" onClick={handleClick}>
          {label}
        </label>
      </div>
    );
  };

  const renderCustomSwitch = (label, checked, onChange, icon = null, className = "mb-2") => {
    const handleChange = (e) => {
      onChange(e);
      setIsDirty(true);
    };

    const handleClick = () => {
      handleChange({target: {checked: !checked}});
    };

    return (
      <div className={`custom-switch ${className}`}>
        <input
          className="custom-switch-input"
          type="checkbox"
          checked={checked}
          onChange={handleChange}
        />
        <div className="custom-switch-slider" onClick={handleClick}>
          {icon && <FontAwesomeIcon icon={icon} className="switch-icon" />}
        </div>
        <label className="custom-switch-label" onClick={handleClick}>
          {label}
        </label>
      </div>
    );
  };

  const MultiSelectDropdown = ({ label, selectedValues, options, section, field, otherField = null, icon = null }) => {
    const selectedArray = Array.isArray(selectedValues) ? selectedValues : [];
    const otherValue = otherField ? formData[section][otherField] : '';
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    const getDisplayText = () => {
      if (selectedArray.length === 0) {
        return `Select ${label.toLowerCase()}`;
      }
      if (selectedArray.length === 1) {
        return selectedArray[0] === 'Other' && otherValue ? otherValue : selectedArray[0];
      }
      return `${selectedArray.length} selected`;
    };
    
    const handleOptionToggle = (option, isChecked) => {
      handleCheckboxChange(section, field, option, isChecked);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, [isOpen]);
    
    return (
      <Form.Group className="mb-3">
        <Form.Label>
          {icon && <FontAwesomeIcon icon={icon} className="me-2" />}
          {label}
        </Form.Label>
        <div className="multi-select-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
          <div 
            className={`form-select multi-select-trigger ${isOpen ? 'open' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: isOpen ? '#e9ecef' : 'white'
            }}
          >
            <span style={{ color: selectedArray.length === 0 ? '#6c757d' : '#212529' }}>
              {getDisplayText()}
            </span>
            <FontAwesomeIcon 
              icon={isOpen ? faChevronUp : faChevronDown} 
              className="dropdown-arrow"
              style={{ color: '#6c757d', fontSize: '0.875rem' }}
            />
          </div>
          
          {isOpen && (
            <div 
              className="multi-select-menu"
              style={{
                position: 'absolute',
                zIndex: 1000,
                width: '100%',
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: 'white',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem',
                boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                marginTop: '2px',
                left: 0,
                top: '100%'
              }}
            >
              {options.map(option => (
                <div 
                  key={option}
                  className="multi-select-option"
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background-color 0.15s ease-in-out'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Form.Check
                    type="checkbox"
                    id={`${field}-${option}`}
                    label={option}
                    checked={selectedArray.includes(option)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleOptionToggle(option, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ margin: 0, width: '100%' }}
                  />
                </div>
              ))}
              <div 
                className="multi-select-option"
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'column',
                  borderTop: '1px solid #dee2e6'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                  <Form.Check
                    type="checkbox"
                    id={`${field}-other`}
                    label="Other"
                    checked={selectedArray.includes('Other')}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleOptionToggle('Other', e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ margin: 0, width: '100%' }}
                  />
                </div>
                {selectedArray.includes('Other') && otherField && (
                  <Form.Control
                    type="text"
                    size="sm"
                    placeholder={`Enter custom ${label.toLowerCase()}`}
                    value={otherValue}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleInputChange(section, otherField, e.target.value);
                    }}
                    className="mt-2"
                    style={{ width: '100%' }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                  />
                )}
              </div>
              
              {/* Done button to close dropdown */}
              <div 
                style={{
                  padding: '8px 12px',
                  borderTop: '2px solid #dee2e6',
                  backgroundColor: '#f8f9fa',
                  textAlign: 'center'
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  style={{ fontSize: '0.875rem', padding: '4px 12px' }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </Form.Group>
    );
  };

  const renderMultiSelectDropdown = (label, selectedValues, options, section, field, otherField = null, icon = null) => {
    return (
      <MultiSelectDropdown
        label={label}
        selectedValues={selectedValues}
        options={options}
        section={section}
        field={field}
        otherField={otherField}
        icon={icon}
      />
    );
  };
  
  const renderProfileHeader = () => (
    <Card className="profile-header-card mb-4">
      <div className="profile-cover-image" style={{
        backgroundImage: formData.personalInfo.coverImage ? 
          `url(${formData.personalInfo.coverImage})` : 
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        height: '200px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        <Button 
          variant="outline-light" 
          size="sm" 
          className="position-absolute top-0 end-0 m-3"
          onClick={() => coverImageRef.current?.click()}
        >
          <FontAwesomeIcon icon={faCamera} /> Change Cover
        </Button>
        <input
          type="file"
          ref={coverImageRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={(e) => handleImageUpload('cover', e.target.files[0])}
        />
      </div>
      
      <Card.Body className="pt-0">
        <Row className="align-items-end">
          <Col md={2}>
            <div className="profile-avatar-container position-relative" style={{ marginTop: '-60px' }}>
              <img
                src={formData.personalInfo.profileImage || 
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.personalInfo.displayName || 'User')}&background=007bff&color=fff&size=120`}
                alt="Profile"
                className={`profile-avatar ${uploadingImage ? 'loading' : ''}`}
                onError={(e) => {
                  console.log('Image failed to load:', e.target.src);
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.personalInfo.displayName || 'User')}&background=007bff&color=fff&size=120`;
                }}
                onLoad={(e) => {
                  console.log('Image loaded successfully:', e.target.src);
                }}
              />
              <Button
                variant="primary"
                size="sm"
                className="position-absolute bottom-0 end-0"
                onClick={() => profileImageRef.current?.click()}
                disabled={uploadingImage}
                title="Change profile picture"
              >
                {uploadingImage ? (
                  <FontAwesomeIcon icon={faSpinner} spin size="sm" />
                ) : (
                  <FontAwesomeIcon icon={faCamera} size="sm" />
                )}
              </Button>
              <input
                type="file"
                ref={profileImageRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={(e) => handleImageUpload('profile', e.target.files[0])}
              />
            </div>
          </Col>
          <Col md={7}>
            <h3 className="mb-1">
              {formData.personalInfo.displayName || 
               `${formData.personalInfo.firstName} ${formData.personalInfo.lastName}`.trim() || 
               user?.name || 'User'}
            </h3>
            <p className="text-muted mb-2">
              {formData.professionalInfo.designation || 'Profile User'}
              {formData.professionalInfo.companyName && (
                <span> at {formData.professionalInfo.companyName}</span>
              )}
            </p>
            <div className="d-flex gap-2 mb-2">
              <Badge bg="primary">{formData.profileType.charAt(0).toUpperCase() + formData.profileType.slice(1)}</Badge>
              {completionPercentage >= 80 && <Badge bg="success">Complete Profile</Badge>}
              {formData.businessInfo.gstNumber && <Badge bg="info">GST Verified</Badge>}
            </div>
          </Col>
          <Col md={3} className="text-end">
            <div className="mb-2">
              <small className="text-muted">Profile Completion</small>
              <div className="d-flex align-items-center gap-2">
                <ProgressBar 
                  now={completionPercentage} 
                  className="flex-grow-1" 
                  style={{ height: '8px' }}
                  variant={completionPercentage >= 80 ? 'success' : completionPercentage >= 50 ? 'warning' : 'danger'}
                />
                <small className="fw-bold">{completionPercentage}%</small>
              </div>
            </div>
            {onClose && (
              <Button variant="outline-secondary" size="sm" onClick={onClose}>
                <FontAwesomeIcon icon={faTimes} /> Close
              </Button>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  const renderPersonalInfoTab = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><FontAwesomeIcon icon={faUser} /> Personal Information</h5>
        <Button
          variant={isPersonalEdit ? "success" : "outline-primary"}
          size="sm"
          onClick={isPersonalEdit ? handleSavePersonalInfo : () => setIsPersonalEdit(true)}
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-1" />
              Saving...
            </>
          ) : isPersonalEdit ? (
            <>
              <FontAwesomeIcon icon={faSave} className="me-1" />
              Save Changes
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faEdit} className="me-1" />
              Edit
            </>
          )}
        </Button>
      </Card.Header>
      <Card.Body>
        {isPersonalEdit ? (
          // Edit Mode
          <>
            <Row>
              <Col md={6}>
                {renderFieldInput(
                  "First Name", 
                  formData.personalInfo.firstName,
                  (e) => handleInputChange('personalInfo', 'firstName', e.target.value),
                  "text",
                  null,
                  "Enter First Name",
                  true,
                  faUser
                )}
                {errors['personalInfo.firstName'] && (
                  <div className="text-danger small mb-2">{errors['personalInfo.firstName']}</div>
                )}
              </Col>
              <Col md={6}>
                {renderFieldInput(
                  "Last Name", 
                  formData.personalInfo.lastName,
                  (e) => handleInputChange('personalInfo', 'lastName', e.target.value),
                  "text",
                  null,
                  "Enter Last Name"
                )}
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                {renderFieldInput(
                  "Display Name", 
                  formData.personalInfo.displayName,
                  (e) => handleInputChange('personalInfo', 'displayName', e.target.value),
                  "text",
                  null,
                  "How you want to be displayed"
                )}
              </Col>
              <Col md={6}>
                {renderFieldInput(
                  "Date of Birth", 
                  formData.personalInfo.dateOfBirth,
                  (e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value),
                  "date"
                )}
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                {renderFieldInput(
                  "Gender", 
                  formData.personalInfo.gender,
                  (e) => handleInputChange('personalInfo', 'gender', e.target.value),
                  "select",
                  ['Male', 'Female', 'Other', 'Prefer not to say']
                )}
              </Col>
              <Col md={4}>
                {renderFieldInput(
                  "Marital Status", 
                  formData.personalInfo.maritalStatus,
                  (e) => handleInputChange('personalInfo', 'maritalStatus', e.target.value),
                  "select",
                  ['Single', 'Married', 'Divorced', 'Widowed']
                )}
              </Col>
              <Col md={4}>
                {renderFieldInput(
                  "Nationality", 
                  formData.personalInfo.nationality,
                  (e) => handleInputChange('personalInfo', 'nationality', e.target.value),
                  "text",
                  null,
                  "Enter Nationality"
                )}
              </Col>
            </Row>
            
            <Row>
              <Col md={12}>
                {renderFieldInput(
                  "Bio", 
                  formData.personalInfo.bio,
                  (e) => handleInputChange('personalInfo', 'bio', e.target.value),
                  "textarea",
                  null,
                  "Tell Us About Yourself..."
                )}
              </Col>
            </Row>
          </>
          ) : (
          // View Mode
          <>
            <Row>
              <Col md={6}>
                {renderFieldDisplay("First Name", formData.personalInfo.firstName, faUser)}
              </Col>
              <Col md={6}>
                {renderFieldDisplay("Last Name", formData.personalInfo.lastName)}
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                {renderFieldDisplay("Display Name", formData.personalInfo.displayName)}
              </Col>
              <Col md={6}>
                {renderFieldDisplay("Date of Birth", formData.personalInfo.dateOfBirth ? new Date(formData.personalInfo.dateOfBirth).toLocaleDateString() : null, faCalendar)}
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                {renderFieldDisplay("Gender", formData.personalInfo.gender)}
              </Col>
              <Col md={4}>
                {renderFieldDisplay("Marital Status", formData.personalInfo.maritalStatus)}
              </Col>
              <Col md={4}>
                {renderFieldDisplay("Nationality", formData.personalInfo.nationality, faGlobe)}
              </Col>
            </Row>
            
            {formData.personalInfo.bio && (
              <Row>
                <Col md={12}>
                  {renderFieldDisplay("Bio", formData.personalInfo.bio)}
                </Col>
              </Row>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderPersonalInfoTabOld = () => (
    <Card>
      <Card.Header>
        <h5><FontAwesomeIcon icon={faUser} /> Personal Information</h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>First Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.personalInfo.firstName}
                onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
                isInvalid={!!errors['personalInfo.firstName']}
                placeholder="Enter First Name"
              />
              <Form.Control.Feedback type="invalid">
                {errors['personalInfo.firstName']}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.personalInfo.lastName}
                onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
                placeholder="Enter Last Name"
              />
            </Form.Group>
          </Col>
        </Row>
        
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Display Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.personalInfo.displayName}
                onChange={(e) => handleInputChange('personalInfo', 'displayName', e.target.value)}
                placeholder="How you want to be displayed"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Date of Birth</Form.Label>
              <Form.Control
                type="date"
                value={formData.personalInfo.dateOfBirth}
                onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Gender</Form.Label>
              <Form.Select
                value={formData.personalInfo.gender}
                onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Marital Status</Form.Label>
              <Form.Select
                value={formData.personalInfo.maritalStatus}
                onChange={(e) => handleInputChange('personalInfo', 'maritalStatus', e.target.value)}
              >
                <option value="">Select Status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Nationality</Form.Label>
              <Form.Control
                type="text"
                value={formData.personalInfo.nationality}
                onChange={(e) => handleInputChange('personalInfo', 'nationality', e.target.value)}
                placeholder="Nationality"
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Bio</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={formData.personalInfo.bio}
            onChange={(e) => handleInputChange('personalInfo', 'bio', e.target.value)}
            placeholder="Tell Us About Yourself..."
            maxLength={500}
          />
          <Form.Text className="text-muted">
            {formData.personalInfo.bio?.length || 0}/500 characters
          </Form.Text>
        </Form.Group>
      </Card.Body>
    </Card>
  );

  const renderContactInfoTab = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><FontAwesomeIcon icon={faEnvelope} /> Contact Information</h5>
        <Button
          variant={isContactEdit ? "success" : "outline-primary"}
          size="sm"
          onClick={isContactEdit ? handleSaveContactInfo : () => setIsContactEdit(true)}
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-1" />
              Saving...
            </>
          ) : isContactEdit ? (
            <>
              <FontAwesomeIcon icon={faSave} className="me-1" />
              Save Changes
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faEdit} className="me-1" />
              Edit
            </>
          )}
        </Button>
      </Card.Header>
      <Card.Body>
        {isContactEdit ? (
          // Edit Mode
          <>
            <Row>
              <Col md={6}>
                {renderFieldInput(
                  "Primary Email", 
                  formData.contactInfo.primaryEmail,
                  (e) => handleInputChange('contactInfo', 'primaryEmail', e.target.value),
                  "email",
                  null,
                  "your@email.com",
                  true,
                  faEnvelope
                )}
                {errors['contactInfo.primaryEmail'] && (
                  <div className="text-danger small mb-2">{errors['contactInfo.primaryEmail']}</div>
                )}
              </Col>
              <Col md={6}>
                {renderFieldInput(
                  "Alternate Email", 
                  formData.contactInfo.alternateEmail,
                  (e) => handleInputChange('contactInfo', 'alternateEmail', e.target.value),
                  "email",
                  null,
                  "alternate@email.com"
                )}
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                {renderFieldInput(
                  "Primary Phone", 
                  formData.contactInfo.primaryPhone,
                  (e) => handleInputChange('contactInfo', 'primaryPhone', e.target.value),
                  "tel",
                  null,
                  "9876543210",
                  false,
                  faPhone
                )}
              </Col>
              <Col md={4}>
                {renderFieldInput(
                  "Alternate Phone", 
                  formData.contactInfo.alternatePhone,
                  (e) => handleInputChange('contactInfo', 'alternatePhone', e.target.value),
                  "tel",
                  null,
                  "9876543210"
                )}
              </Col>
              <Col md={4}>
                {renderFieldInput(
                  "WhatsApp Number", 
                  formData.contactInfo.whatsappNumber,
                  (e) => handleInputChange('contactInfo', 'whatsappNumber', e.target.value),
                  "tel",
                  null,
                  "9876543210"
                )}
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                {renderFieldInput(
                  "LinkedIn Profile", 
                  formData.contactInfo.linkedinProfile,
                  (e) => handleInputChange('contactInfo', 'linkedinProfile', e.target.value),
                  "url",
                  null,
                  "https://linkedin.com/in/yourprofile"
                )}
              </Col>
              <Col md={6}>
                {renderFieldInput(
                  "Website", 
                  formData.contactInfo.website,
                  (e) => handleInputChange('contactInfo', 'website', e.target.value),
                  "url",
                  null,
                  "https://yourwebsite.com",
                  false,
                  faGlobe
                )}
              </Col>
            </Row>
          </>
          ) : (
          // View Mode
          <>
            <Row>
              <Col md={6}>
                {renderFieldDisplay("Primary Email", formData.contactInfo.primaryEmail, faEnvelope)}
              </Col>
              <Col md={6}>
                {renderFieldDisplay("Alternate Email", formData.contactInfo.alternateEmail)}
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                {renderFieldDisplay("Primary Phone", formData.contactInfo.primaryPhone, faPhone)}
              </Col>
              <Col md={4}>
                {renderFieldDisplay("Alternate Phone", formData.contactInfo.alternatePhone)}
              </Col>
              <Col md={4}>
                {renderFieldDisplay("WhatsApp Number", formData.contactInfo.whatsappNumber)}
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                {renderFieldDisplay("LinkedIn Profile", formData.contactInfo.linkedinProfile && (
                  <a href={formData.contactInfo.linkedinProfile} target="_blank" rel="noopener noreferrer">
                    {formData.contactInfo.linkedinProfile}
                  </a>
                ))}
              </Col>
              <Col md={6}>
                {renderFieldDisplay("Website", formData.contactInfo.website && (
                  <a href={formData.contactInfo.website} target="_blank" rel="noopener noreferrer">
                    {formData.contactInfo.website}
                  </a>
                ), faGlobe)}
              </Col>
            </Row>
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderAddressTab = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><FontAwesomeIcon icon={faMapMarkerAlt} /> Address Information</h5>
        <Button
          variant={isAddressEdit ? "success" : "outline-primary"}
          size="sm"
          onClick={isAddressEdit ? handleSaveAddressInfo : () => setIsAddressEdit(true)}
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-1" />
              Saving...
            </>
          ) : isAddressEdit ? (
            <>
              <FontAwesomeIcon icon={faSave} className="me-1" />
              Save Changes
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faEdit} className="me-1" />
              Edit
            </>
          )}
        </Button>
      </Card.Header>
      <Card.Body>
        {isAddressEdit ? (
          // Edit Mode
          <>
            <h6 className="mb-3">Permanent Address</h6>
            <Row>
              <Col md={6}>
                {renderFieldInput(
                  "Street Address", 
                  formData.addressInfo.permanent.street,
                  (e) => handleNestedInputChange('addressInfo', 'permanent', 'street', e.target.value),
                  "text",
                  null,
                  "Enter Street Address",
                  false,
                  faMapMarkerAlt
                )}
              </Col>
              <Col md={6}>
                {renderFieldInput(
                  "Landmark", 
                  formData.addressInfo.permanent.landmark,
                  (e) => handleNestedInputChange('addressInfo', 'permanent', 'landmark', e.target.value),
                  "text",
                  null,
                  "Near landmark"
                )}
              </Col>
            </Row>

            <Row>
              <Col md={3}>
                {renderFieldInput(
                  "Village", 
                  formData.addressInfo.permanent.village,
                  (e) => handleNestedInputChange('addressInfo', 'permanent', 'village', e.target.value),
                  "text",
                  null,
                  "Village"
                )}
              </Col>
              <Col md={3}>
                {renderFieldInput(
                  "Taluka", 
                  formData.addressInfo.permanent.taluka,
                  (e) => handleNestedInputChange('addressInfo', 'permanent', 'taluka', e.target.value),
                  "text",
                  null,
                  "Taluka"
                )}
              </Col>
              <Col md={3}>
                {renderFieldInput(
                  "District", 
                  formData.addressInfo.permanent.district,
                  (e) => handleNestedInputChange('addressInfo', 'permanent', 'district', e.target.value),
                  "text",
                  null,
                  "District"
                )}
              </Col>
              <Col md={3}>
                {renderFieldInput(
                  "City", 
                  formData.addressInfo.permanent.city,
                  (e) => handleNestedInputChange('addressInfo', 'permanent', 'city', e.target.value),
                  "text",
                  null,
                  "City"
                )}
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                {renderFieldInput(
                  "State", 
                  formData.addressInfo.permanent.state,
                  (e) => handleNestedInputChange('addressInfo', 'permanent', 'state', e.target.value),
                  "select",
                  INDIAN_STATES
                )}
              </Col>
              <Col md={4}>
                {renderFieldInput(
                  "Pincode", 
                  formData.addressInfo.permanent.pincode,
                  (e) => handleNestedInputChange('addressInfo', 'permanent', 'pincode', e.target.value),
                  "text",
                  null,
                  "123456"
                )}
              </Col>
              <Col md={4}>
                {renderFieldInput(
                  "Country", 
                  formData.addressInfo.permanent.country,
                  (e) => handleNestedInputChange('addressInfo', 'permanent', 'country', e.target.value),
                  "text",
                  null,
                  "Country"
                )}
              </Col>
            </Row>

            {renderCustomCheckbox(
              "Current address is same as permanent address",
              formData.addressInfo.isSameAddress,
              (e) => handleInputChange('addressInfo', 'isSameAddress', e.target.checked)
            )}

            {!formData.addressInfo.isSameAddress && (
              <>
                <h6 className="mb-3 mt-4">Current Address</h6>
                <Row>
                  <Col md={6}>
                    {renderFieldInput(
                      "Street Address", 
                      formData.addressInfo.current.street,
                      (e) => handleNestedInputChange('addressInfo', 'current', 'street', e.target.value),
                      "text",
                      null,
                      "Enter street address"
                    )}
                  </Col>
                  <Col md={6}>
                    {renderFieldInput(
                      "Landmark", 
                      formData.addressInfo.current.landmark,
                      (e) => handleNestedInputChange('addressInfo', 'current', 'landmark', e.target.value),
                      "text",
                      null,
                      "Near landmark"
                    )}
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    {renderFieldInput(
                      "City", 
                      formData.addressInfo.current.city,
                      (e) => handleNestedInputChange('addressInfo', 'current', 'city', e.target.value),
                      "text",
                      null,
                      "City"
                    )}
                  </Col>
                  <Col md={4}>
                    {renderFieldInput(
                      "State", 
                      formData.addressInfo.current.state,
                      (e) => handleNestedInputChange('addressInfo', 'current', 'state', e.target.value),
                      "select",
                      INDIAN_STATES
                    )}
                  </Col>
                  <Col md={4}>
                    {renderFieldInput(
                      "Pincode", 
                      formData.addressInfo.current.pincode,
                      (e) => handleNestedInputChange('addressInfo', 'current', 'pincode', e.target.value),
                      "text",
                      null,
                      "123456"
                    )}
                  </Col>
                </Row>
              </>
            )}
          </>
          ) : (
          // View Mode
          <>
            <h6 className="mb-3">Permanent Address</h6>
            <Row>
              <Col md={6}>
                {renderFieldDisplay("Street Address", formData.addressInfo.permanent.street, faMapMarkerAlt)}
              </Col>
              <Col md={6}>
                {renderFieldDisplay("Landmark", formData.addressInfo.permanent.landmark)}
              </Col>
            </Row>

            <Row>
              <Col md={3}>
                {renderFieldDisplay("Village", formData.addressInfo.permanent.village)}
              </Col>
              <Col md={3}>
                {renderFieldDisplay("Taluka", formData.addressInfo.permanent.taluka)}
              </Col>
              <Col md={3}>
                {renderFieldDisplay("District", formData.addressInfo.permanent.district)}
              </Col>
              <Col md={3}>
                {renderFieldDisplay("City", formData.addressInfo.permanent.city)}
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                {renderFieldDisplay("State", formData.addressInfo.permanent.state)}
              </Col>
              <Col md={4}>
                {renderFieldDisplay("Pincode", formData.addressInfo.permanent.pincode)}
              </Col>
              <Col md={4}>
                {renderFieldDisplay("Country", formData.addressInfo.permanent.country, faGlobe)}
              </Col>
            </Row>

            <div className="profile-field-display mb-3">
              <div className="field-label">
                <FontAwesomeIcon icon={faCheck} className="me-2 text-muted" />
                <strong>Address Status:</strong>
              </div>
              <div className="field-value">
                {formData.addressInfo.isSameAddress ? 
                  "Current address is same as permanent address" : 
                  "Current address is different from permanent address"
                }
              </div>
            </div>

            {!formData.addressInfo.isSameAddress && (
              <>
                <h6 className="mb-3 mt-4">Current Address</h6>
                <Row>
                  <Col md={6}>
                    {renderFieldDisplay("Street Address", formData.addressInfo.current.street)}
                  </Col>
                  <Col md={6}>
                    {renderFieldDisplay("Landmark", formData.addressInfo.current.landmark)}
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    {renderFieldDisplay("City", formData.addressInfo.current.city)}
                  </Col>
                  <Col md={4}>
                    {renderFieldDisplay("State", formData.addressInfo.current.state)}
                  </Col>
                  <Col md={4}>
                    {renderFieldDisplay("Pincode", formData.addressInfo.current.pincode)}
                  </Col>
                </Row>
              </>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderBusinessTab = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><FontAwesomeIcon icon={faBuilding} /> Business Information</h5>
        <Button
          variant={isBusinessEdit ? "success" : "outline-primary"}
          size="sm"
          onClick={isBusinessEdit ? handleSaveBusinessInfo : () => setIsBusinessEdit(true)}
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-1" />
              Saving...
            </>
          ) : isBusinessEdit ? (
            <>
              <FontAwesomeIcon icon={faSave} className="me-1" />
              Save Changes
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faEdit} className="me-1" />
              Edit
            </>
          )}
        </Button>
      </Card.Header>
      <Card.Body>
        {isBusinessEdit ? (
          // Edit Mode
          <>
            <Row>
              <Col md={6}>
                {renderFieldInput(
                  "Business Name", 
                  formData.businessInfo.businessName,
                  (e) => handleInputChange('businessInfo', 'businessName', e.target.value),
                  "text",
                  null,
                  "Your Business Name",
                  false,
                  faBuilding
                )}
              </Col>
              <Col md={6}>
                {renderFieldInput(
                  "Shop Name", 
                  formData.businessInfo.shopName,
                  (e) => handleInputChange('businessInfo', 'shopName', e.target.value),
                  "text",
                  null,
                  "Your Shop Name",
                  false,
                  faStore
                )}
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                {renderMultiSelectDropdown(
                  "Business Categories", 
                  formData.businessInfo.businessCategory,
                  BUSINESS_CATEGORIES,
                  'businessInfo',
                  'businessCategory',
                  'businessCategoryOther',
                  faIndustry
                )}
              </Col>
              <Col md={6}>
                {renderMultiSelectDropdown(
                  "Business Types", 
                  formData.businessInfo.businessType,
                  BUSINESS_TYPES,
                  'businessInfo',
                  'businessType',
                  'businessTypeOther'
                )}
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                {renderFieldInput(
                  "Established Year", 
                  formData.businessInfo.establishedYear,
                  (e) => handleInputChange('businessInfo', 'establishedYear', e.target.value),
                  "number",
                  null,
                  "2020",
                  false,
                  faCalendar
                )}
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                {renderFieldInput(
                  "GST Number", 
                  formData.businessInfo.gstNumber,
                  (e) => handleInputChange('businessInfo', 'gstNumber', e.target.value),
                  "text",
                  null,
                  "22AAAAA0000A1Z5",
                  false,
                  faIdCard
                )}
              </Col>
              <Col md={6}>
                {renderFieldInput(
                  "PAN Number", 
                  formData.businessInfo.panNumber,
                  (e) => handleInputChange('businessInfo', 'panNumber', e.target.value),
                  "text",
                  null,
                  "ABCDE1234F",
                  false,
                  faIdCard
                )}
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                {renderFieldInput(
                  "Business Phone", 
                  formData.businessInfo.businessPhone,
                  (e) => handleInputChange('businessInfo', 'businessPhone', e.target.value),
                  "tel",
                  null,
                  "9876543210",
                  false,
                  faPhone
                )}
              </Col>
              <Col md={6}>
                {renderFieldInput(
                  "Business Email", 
                  formData.businessInfo.businessEmail,
                  (e) => handleInputChange('businessInfo', 'businessEmail', e.target.value),
                  "email",
                  null,
                  "business@company.com",
                  false,
                  faEnvelope
                )}
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                {renderFieldInput(
                  "Business Website", 
                  formData.businessInfo.businessWebsite,
                  (e) => handleInputChange('businessInfo', 'businessWebsite', e.target.value),
                  "url",
                  null,
                  "https://yourbusiness.com",
                  false,
                  faGlobe
                )}
              </Col>
            </Row>

            {/* Business Logo Upload */}
            <Form.Group className="mb-3">
              <Form.Label>
                <FontAwesomeIcon icon={faImage} className="me-2" />
                Business Logo
              </Form.Label>
              <div className="d-flex align-items-center gap-3">
                {formData.businessInfo.images?.logo && (
                  <img
                    src={formData.businessInfo.images.logo}
                    alt="Business Logo"
                    style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                    className="rounded border"
                  />
                )}
                <Button
                  variant="outline-primary"
                  onClick={() => businessLogoRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <FontAwesomeIcon icon={uploadingImage ? faSpinner : faUpload} spin={uploadingImage} />
                  {uploadingImage ? ' Uploading...' : ' Upload Logo'}
                </Button>
                <input
                  type="file"
                  ref={businessLogoRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={(e) => handleImageUpload('businessLogo', e.target.files[0])}
                />
              </div>
            </Form.Group>
          </>
          ) : (
          // View Mode
          <>
            <Row>
              <Col md={6}>
                {renderFieldDisplay("Business Name", formData.businessInfo.businessName, faBuilding)}
              </Col>
              <Col md={6}>
                {renderFieldDisplay("Shop Name", formData.businessInfo.shopName, faStore)}
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                {renderFieldDisplay("Business Categories", 
                  Array.isArray(formData.businessInfo.businessCategory) && formData.businessInfo.businessCategory.length > 0
                    ? formData.businessInfo.businessCategory.join(', ') + 
                      (formData.businessInfo.businessCategoryOther ? `, ${formData.businessInfo.businessCategoryOther}` : '')
                    : 'Not specified', 
                  faIndustry
                )}
              </Col>
              <Col md={6}>
                {renderFieldDisplay("Business Types", 
                  Array.isArray(formData.businessInfo.businessType) && formData.businessInfo.businessType.length > 0
                    ? formData.businessInfo.businessType.join(', ') + 
                      (formData.businessInfo.businessTypeOther ? `, ${formData.businessInfo.businessTypeOther}` : '')
                    : 'Not specified'
                )}
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                {renderFieldDisplay("Established Year", formData.businessInfo.establishedYear, faCalendar)}
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                {renderFieldDisplay("GST Number", formData.businessInfo.gstNumber, faIdCard)}
              </Col>
              <Col md={6}>
                {renderFieldDisplay("PAN Number", formData.businessInfo.panNumber, faIdCard)}
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                {renderFieldDisplay("Business Phone", formData.businessInfo.businessPhone, faPhone)}
              </Col>
              <Col md={6}>
                {renderFieldDisplay("Business Email", formData.businessInfo.businessEmail, faEnvelope)}
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                {renderFieldDisplay("Business Website", formData.businessInfo.businessWebsite && (
                  <a href={formData.businessInfo.businessWebsite} target="_blank" rel="noopener noreferrer">
                    {formData.businessInfo.businessWebsite}
                  </a>
                ), faGlobe)}
              </Col>
            </Row>

            {/* Business Logo Display */}
            {formData.businessInfo.images?.logo && (
              <div className="profile-field-display mb-3">
                <div className="field-label">
                  <FontAwesomeIcon icon={faImage} className="me-2 text-muted" />
                  <strong>Business Logo:</strong>
                </div>
                <div className="field-value">
                  <img
                    src={formData.businessInfo.images.logo}
                    alt="Business Logo"
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    className="rounded border mt-2"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderSecurityTab = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><FontAwesomeIcon icon={faLock} /> Security Settings</h5>
        <Button
          variant={isSecurityEdit ? "success" : "outline-primary"}
          size="sm"
          onClick={isSecurityEdit ? handleSaveSecurityInfo : () => setIsSecurityEdit(true)}
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-1" />
              Saving...
            </>
          ) : isSecurityEdit ? (
            <>
              <FontAwesomeIcon icon={faSave} className="me-1" />
              Save Changes
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faEdit} className="me-1" />
              Edit
            </>
          )}
        </Button>
      </Card.Header>
      <Card.Body>
        {/* Password Management - Always Available */}
        <div className="security-section">
          <h6>Password Management</h6>
          <p className="text-muted mb-3">
            Keep your account secure by using a strong password and changing it regularly.
          </p>
          
          <Button
            variant="outline-primary"
            onClick={() => setShowPasswordModal(true)}
          >
            <FontAwesomeIcon icon={faLock} /> Change Password
          </Button>
        </div>

        <hr className="my-4" />

        {isSecurityEdit ? (
          // Edit Mode
          <>
            <div className="security-section">
              <h6>Privacy Settings</h6>
              {renderCustomSwitch(
                "Show email to other users",
                formData.preferences.privacy.showEmail,
                (e) => handleNestedInputChange('preferences', 'privacy', 'showEmail', e.target.checked),
                faEnvelope
              )}
              {renderCustomSwitch(
                "Show phone number to other users",
                formData.preferences.privacy.showPhone,
                (e) => handleNestedInputChange('preferences', 'privacy', 'showPhone', e.target.checked),
                faPhone
              )}
              {renderFieldInput(
                "Profile Visibility", 
                formData.preferences.privacy.profileVisibility,
                (e) => handleNestedInputChange('preferences', 'privacy', 'profileVisibility', e.target.value),
                "select",
                ['public', 'connections-only', 'private'],
                "",
                false,
                faEye
              )}
            </div>

            <hr className="my-4" />

            <div className="security-section">
              <h6>Notification Preferences</h6>
              {renderCustomSwitch(
                "Email notifications",
                formData.preferences.notifications.email,
                (e) => handleNestedInputChange('preferences', 'notifications', 'email', e.target.checked),
                faEnvelope
              )}
              {renderCustomSwitch(
                "SMS notifications",
                formData.preferences.notifications.sms,
                (e) => handleNestedInputChange('preferences', 'notifications', 'sms', e.target.checked),
                faPhone
              )}
              {renderCustomSwitch(
                "Push notifications",
                formData.preferences.notifications.push,
                (e) => handleNestedInputChange('preferences', 'notifications', 'push', e.target.checked),
                faShield
              )}
            </div>
          </>
          ) : (
          // View Mode
          <>
            <div className="security-section">
              <h6>Privacy Settings</h6>
              <Row>
                <Col md={6}>
                  {renderFieldDisplay("Show Email to Others", formData.preferences.privacy.showEmail ? "Yes" : "No", faEnvelope)}
                </Col>
                <Col md={6}>
                  {renderFieldDisplay("Show Phone to Others", formData.preferences.privacy.showPhone ? "Yes" : "No", faPhone)}
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  {renderFieldDisplay("Profile Visibility", 
                    formData.preferences.privacy.profileVisibility === 'public' ? 'Public - Everyone can see' :
                    formData.preferences.privacy.profileVisibility === 'connections-only' ? 'Connections Only' :
                    formData.preferences.privacy.profileVisibility === 'private' ? 'Private - Only me' :
                    formData.preferences.privacy.profileVisibility || 'Not set',
                    faEye
                  )}
                </Col>
              </Row>
            </div>

            <hr className="my-4" />

            <div className="security-section">
              <h6>Notification Preferences</h6>
              <Row>
                <Col md={4}>
                  {renderFieldDisplay("Email Notifications", formData.preferences.notifications.email ? "Enabled" : "Disabled", faEnvelope)}
                </Col>
                <Col md={4}>
                  {renderFieldDisplay("SMS Notifications", formData.preferences.notifications.sms ? "Enabled" : "Disabled", faPhone)}
                </Col>
                <Col md={4}>
                  {renderFieldDisplay("Push Notifications", formData.preferences.notifications.push ? "Enabled" : "Disabled", faShield)}
                </Col>
              </Row>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderPasswordModal = () => (
    <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Change Password</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Current Password</Form.Label>
          <div className="input-group">
            <Form.Control
              type={showPasswords.current ? "text" : "password"}
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Enter Current Password"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
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
              placeholder="Enter New Password"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
            >
              <FontAwesomeIcon icon={showPasswords.new ? faEyeSlash : faEye} />
            </Button>
          </div>
          <Form.Text className="text-muted">
            Password must be at least 8 characters long
          </Form.Text>
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
              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
            >
              <FontAwesomeIcon icon={showPasswords.confirm ? faEyeSlash : faEye} />
            </Button>
          </div>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handlePasswordChange}
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-2" />
              Changing...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCheck} /> Change Password
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  // ============================================
  // 🎨 MAIN RENDER
  // ============================================
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading profile...</p>
        </div>
      </Container>
    );
  }

  return (
    <div className={isFullscreen ? "fullscreen-profile-page" : "profile-page-container"}>
      {isFullscreen && (
        <>
          {/* Fullscreen Navigation Header */}
          <div className="fullscreen-nav-header">
            <Container fluid>
              <div className="d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center">
                  <Button 
                    variant="outline-primary" 
                    className="me-3"
                    onClick={() => onClose ? onClose() : navigate('/')}
                  >
                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                    Close
                  </Button>
                  <h4 className="mb-0 text-primary fw-bold">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    My Profile
                  </h4>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {user?.name && (
                    <span className="text-muted me-3">
                      Welcome, {user.name.split(' ')[0]}
                    </span>
                  )}
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => {
                      if (onLogout) {
                        onLogout();
                      } else {
                        authService.logout();
                        navigate('/auth');
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="me-1" />
                    Logout
                  </Button>
                </div>
              </div>
            </Container>
          </div>
        </>
      )}

      {/* Profile Content */}
      <Container fluid className={`profile-page py-4 ${isFullscreen ? 'fullscreen-content' : ''}`}>
        {renderProfileHeader()}

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Row>
          <Col lg={3}>
            <Card className="nav-tabs-card">
              <Card.Body className="p-0">
                <Nav variant="pills" className="flex-column profile-nav">
                  <Nav.Item>
                    <Nav.Link eventKey="personal">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      Personal Info
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
                  <Nav.Item>
                    <Nav.Link eventKey="business">
                      <FontAwesomeIcon icon={faBuilding} className="me-2" />
                      Business
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="security">
                      <FontAwesomeIcon icon={faLock} className="me-2" />
                      Security
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={9}>
            <Tab.Content>
              <Tab.Pane eventKey="personal">
                {renderPersonalInfoTab()}
              </Tab.Pane>
              <Tab.Pane eventKey="contact">
                {renderContactInfoTab()}
              </Tab.Pane>
              <Tab.Pane eventKey="address">
                {renderAddressTab()}
              </Tab.Pane>
              <Tab.Pane eventKey="business">
                {renderBusinessTab()}
              </Tab.Pane>
              <Tab.Pane eventKey="security">
                {renderSecurityTab()}
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>

        {renderPasswordModal()}
      </Container>
    </div>
  );
};

export default ProfilePage;