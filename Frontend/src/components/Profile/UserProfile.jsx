import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Edit3, Save, X, Eye, EyeOff, CheckCircle, 
  AlertCircle, Building, MapPin, Briefcase, Loader2, Shield, Lock 
} from 'lucide-react';
import profileService from '../../services/profileService';

import ImageCropModal from './ImageCropModal';
import '../../styles/ProfileSystem.css';

const UserProfile = ({ isOpen, onClose, onToast }) => {
  console.log('UserProfile rendered with props:', { isOpen, onClose: !!onClose, onToast: !!onToast });

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [activeTab, setActiveTab] = useState('personal');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
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
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    console.log('🔧 UserProfile isOpen changed:', isOpen);
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  // Track component lifecycle
  useEffect(() => {
    console.log('🔧 UserProfile component mounted');
    return () => {
      console.log('🔧 UserProfile component unmounting');
    };
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setErrors({});
    
    try {
      console.log('Loading profile...');
      const result = await profileService.getProfile();
      
      if (result.success) {
        console.log('Profile loaded:', result.data);
        setProfile(result.data);
        setFormData({
          name: result.data.name || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          bio: result.data.profile?.bio || '',
          address: {
            street: result.data.profile?.address?.street || '',
            city: result.data.profile?.address?.city || '',
            state: result.data.profile?.address?.state || '',
            country: result.data.profile?.address?.country || 'India',
            pincode: result.data.profile?.address?.pincode || ''
          },
          company: {
            name: result.data.companyName || '',
            designation: result.data.profile?.designation || '',
            department: result.data.profile?.department || ''
          }
        });
        // Temporarily removed success toast to test auto-close issue
        // if (onToast) onToast('Profile loaded successfully', 'success');
      } else {
        console.error('Failed to load profile:', result.error);
        handleFallbackProfile(result);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      handleFallbackProfile({ isServerError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFallbackProfile = (result) => {
    const fallbackProfile = {
      name: 'User Name',
      email: 'user@example.com',
      phone: '',
      profile: {
        bio: '',
        address: { street: '', city: '', state: '', country: 'India', pincode: '' },
        designation: '',
        department: ''
      },
      companyName: ''
    };
    setProfile(fallbackProfile);
    setFormData({
      name: fallbackProfile.name,
      email: fallbackProfile.email,
      phone: fallbackProfile.phone,
      bio: fallbackProfile.profile.bio,
      address: fallbackProfile.profile.address,
      company: {
        name: fallbackProfile.companyName,
        designation: fallbackProfile.profile.designation,
        department: fallbackProfile.profile.department
      }
    });
    const errorMessage = result.isServerError 
      ? 'Server unavailable. You can edit your profile, but changes may not save until the server is back online.'
      : result.error || 'Failed to load profile';
    setErrors({ general: errorMessage });
    if (onToast) onToast(errorMessage, result.isServerError ? 'warning' : 'error');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const fieldParts = field.split('.');
      let current = newData;
      for (let i = 0; i < fieldParts.length - 1; i++) {
        if (!current[fieldParts[i]]) current[fieldParts[i]] = {};
        current = current[fieldParts[i]];
      }
      current[fieldParts[fieldParts.length - 1]] = value;
      return newData;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    if (formData.address.pincode && !/^\d{6}$/.test(formData.address.pincode)) {
      newErrors['address.pincode'] = 'Please enter a valid 6-digit pincode';
    }
    return newErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      if (onToast) onToast('Please correct the errors in the form', 'error');
      return;
    }
    
    setIsSaving(true);
    setErrors({});
    
    try {
      console.log('Saving profile data:', formData);
      const result = await profileService.updateProfile(formData);
      
      if (result.success) {
        console.log('Profile saved:', result.data);
        setProfile(result.data);
        setIsEditing(false);
        if (onToast) onToast(result.message || 'Profile updated successfully', 'success');
        // Removed automatic close - let user manually close the modal
      } else {
        console.error('Failed to save profile:', result.error);
        setErrors({ general: result.error });
        if (onToast) onToast(result.error || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({ general: 'Failed to save profile due to server error' });
      if (onToast) onToast('Failed to save profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setErrors({ password: 'All password fields are required' });
      if (onToast) onToast('All password fields are required', 'error');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors({ password: 'New passwords do not match' });
      if (onToast) onToast('New passwords do not match', 'error');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters long' });
      if (onToast) onToast('Password must be at least 8 characters long', 'error');
      return;
    }
    
    try {
      const result = await profileService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (result.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
        setErrors({});
        if (onToast) onToast(result.message || 'Password changed successfully', 'success');
      } else {
        setErrors({ password: result.error });
        if (onToast) onToast(result.error || 'Failed to change password', 'error');
      }
    } catch (error) {
      setErrors({ password: 'Failed to change password due to server error' });
      if (onToast) onToast('Failed to change password', 'error');
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowPasswordForm(false);
    setErrors({});
  };

  if (!isOpen) {
    console.log('UserProfile not rendering - isOpen is false');
    return null;
  }

  return (
    <>
      <style>
        {`
          .profile-modal-overlay {
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            padding: 16px;
          }

          .profile-modal {
            background-color: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            width: 100%;
            max-width: 896px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(0, 0, 0, 0.1);
            animation: fadeIn 0.3s ease-in;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .profile-header {
            background: linear-gradient(to right, #4f46e5, #7c3aed);
            color: white;
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 20px;
            font-weight: 600;
          }

          .close-btn {
            background: none;
            border: none;
            color: white;
            padding: 8px;
            border-radius: 50%;
            cursor: pointer;
            transition: color 0.2s;
          }

          .close-btn:hover:not(:disabled) {
            color: #e5e7eb;
          }

          .close-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .profile-tabs {
            display: flex;
            background-color: rgba(243, 244, 246, 0.8);
            border-bottom: 1px solid #e5e7eb;
            overflow-x: auto;
          }

          .tab-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            font-size: 14px;
            font-weight: 500;
            color: #4b5563;
            background: none;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
          }

          .tab-btn:hover {
            color: #7c3aed;
            background-color: rgba(221, 214, 254, 0.3);
          }

          .tab-btn[aria-selected="true"] {
            color: #7c3aed;
            border-bottom: 2px solid #7c3aed;
            background-color: rgba(221, 214, 254, 0.5);
          }

          .profile-content {
            padding: 24px;
            overflow-y: auto;
            max-height: 70vh;
          }

          .content-wrapper {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 64px 0;
            color: #4b5563;
          }

          .spinner {
            width: 32px;
            height: 32px;
            border: 4px solid #7c3aed;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .spinner-sm {
            width: 16px;
            height: 16px;
            border: 2px solid white;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-right: 8px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .error-message {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: #fef2f2;
            color: #b91c1c;
            padding: 16px;
            border-radius: 8px;
            font-size: 14px;
          }

          .retry-btn {
            margin-left: 16px;
            background-color: #fee2e2;
            color: #b91c1c;
            padding: 4px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
          }

          .retry-btn:hover {
            background-color: #fecaca;
          }

          .profile-section {
            background-color: rgba(255, 255, 255, 0.7);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
          }

          .edit-btn, .save-btn, .cancel-btn, .change-password-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .edit-btn {
            background-color: #ddd6fe;
            color: #7c3aed;
            border: none;
          }

          .edit-btn:hover {
            background-color: #c4b5fd;
          }

          .save-btn {
            background-color: #7c3aed;
            color: white;
            border: none;
          }

          .save-btn:hover:not(:disabled) {
            background-color: #6d28d9;
          }

          .cancel-btn {
            background-color: #f3f4f6;
            color: #4b5563;
            border: none;
          }

          .cancel-btn:hover:not(:disabled) {
            background-color: #e5e7eb;
          }

          .save-btn:disabled, .cancel-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .change-password-btn {
            background-color: #ddd6fe;
            color: #7c3aed;
            border: none;
          }

          .change-password-btn:hover {
            background-color: #c4b5fd;
          }

          .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
          }

          .form-group.full-width {
            grid-column: 1 / -1;
          }

          .form-group label {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 4px;
          }

          .form-group label .required {
            color: #b91c1c;
          }

          .form-group input, .form-group textarea {
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background-color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            transition: all 0.2s;
          }

          .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: #7c3aed;
            box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
          }

          .form-group input:disabled, .form-group textarea:disabled {
            background-color: #f3f4f6;
            cursor: not-allowed;
          }

          .form-group .input-error {
            border-color: #b91c1c;
          }

          .field-error {
            color: #b91c1c;
            font-size: 12px;
            margin-top: 4px;
          }

          .password-form {
            max-width: 400px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .password-input {
            position: relative;
            display: flex;
            align-items: center;
          }

          .password-input input {
            width: 100%;
            padding-right: 40px;
          }

          .password-toggle {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #4b5563;
            cursor: pointer;
            transition: color 0.2s;
          }

          .password-toggle:hover {
            color: #7c3aed;
          }

          .password-actions {
            display: flex;
            gap: 8px;
          }

          @media (max-width: 768px) {
            .profile-modal {
              margin: 16px;
            }

            .form-grid {
              grid-template-columns: 1fr;
            }

            .profile-tabs {
              flex-wrap: nowrap;
            }

            .tab-btn {
              flex: 1;
              text-align: center;
            }
          }
        `}
      </style>
      <div 
        className="profile-modal-overlay"
        onClick={(e) => {
          console.log('🔧 Overlay clicked:', e.target);
          // Prevent backdrop clicks from closing modal for now
          e.stopPropagation();
        }}
      >
        <div 
          className="profile-modal"
          onClick={(e) => {
            console.log('🔧 Modal clicked:', e.target);
            e.stopPropagation();
          }}
        >
          <div className="profile-header">
            <h2 className="header-title">
              <User size={20} />
              User Profile
            </h2>
            <button 
              className="close-btn"
              onClick={onClose}
              disabled={isSaving}
              aria-label="Close profile modal"
            >
              <X size={20} />
            </button>
          </div>

          <div className="profile-tabs">
            {['personal', 'company', 'security'].map(tab => (
              <button 
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleTabChange(tab)}
                aria-selected={activeTab === tab}
              >
                {tab === 'personal' && <User size={16} />}
                {tab === 'company' && <Building size={16} />}
                {tab === 'security' && <Shield size={16} />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="profile-content">
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading profile...</p>
              </div>
            ) : (
              <div className="content-wrapper">
                {errors.general && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    <span>{errors.general}</span>
                    <button 
                      className="retry-btn"
                      onClick={loadProfile}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {activeTab === 'personal' && (
                  <div className="profile-section">
                    <div className="section-header">
                      <h3 className="section-title">
                        <User size={18} />
                        Personal Information
                      </h3>
                      {!isEditing ? (
                        <button 
                          className="edit-btn"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit3 size={16} />
                          Edit
                        </button>
                      ) : (
                        <div className="edit-actions">
                          <button 
                            className="cancel-btn"
                            onClick={() => {
                              setIsEditing(false);
                              setErrors({});
                              if (profile) {
                                setFormData({
                                  name: profile.name || '',
                                  email: profile.email || '',
                                  phone: profile.phone || '',
                                  bio: profile.profile?.bio || '',
                                  address: {
                                    street: profile.profile?.address?.street || '',
                                    city: profile.profile?.address?.city || '',
                                    state: profile.profile?.address?.state || '',
                                    country: profile.profile?.address?.country || 'India',
                                    pincode: profile.profile?.address?.pincode || ''
                                  },
                                  company: {
                                    name: profile.companyName || '',
                                    designation: profile.profile?.designation || '',
                                    department: profile.profile?.department || ''
                                  }
                                });
                              }
                            }}
                            disabled={isSaving}
                          >
                            <X size={16} />
                            Cancel
                          </button>
                          <button 
                            className="save-btn"
                            onClick={handleSave}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <div className="spinner-sm"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save size={16} />
                                Save
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Full Name <span className="required">*</span></label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          disabled={!isEditing}
                          className={errors.name ? 'input-error' : ''}
                          placeholder="Enter your full name"
                        />
                        {errors.name && <span className="field-error">{errors.name}</span>}
                      </div>
                      <div className="form-group">
                        <label>Email <span className="required">*</span></label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          disabled={!isEditing}
                          className={errors.email ? 'input-error' : ''}
                          placeholder="your.email@company.com"
                        />
                        {errors.email && <span className="field-error">{errors.email}</span>}
                      </div>
                      <div className="form-group">
                        <label>Phone</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          disabled={!isEditing}
                          className={errors.phone ? 'input-error' : ''}
                          placeholder="9876543210"
                        />
                        {errors.phone && <span className="field-error">{errors.phone}</span>}
                      </div>
                      <div className="form-group full-width">
                        <label>Bio</label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                          disabled={!isEditing}
                          rows="3"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Street Address</label>
                        <input
                          type="text"
                          value={formData.address.street}
                          onChange={(e) => handleInputChange('address.street', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Building number, street name"
                        />
                      </div>
                      <div className="form-group">
                        <label>City</label>
                        <input
                          type="text"
                          value={formData.address.city}
                          onChange={(e) => handleInputChange('address.city', e.target.value)}
                          disabled={!isEditing}
                          placeholder="City"
                        />
                      </div>
                      <div className="form-group">
                        <label>State</label>
                        <input
                          type="text"
                          value={formData.address.state}
                          onChange={(e) => handleInputChange('address.state', e.target.value)}
                          disabled={!isEditing}
                          placeholder="State"
                        />
                      </div>
                      <div className="form-group">
                        <label>Pincode</label>
                        <input
                          type="text"
                          value={formData.address.pincode}
                          onChange={(e) => handleInputChange('address.pincode', e.target.value)}
                          disabled={!isEditing}
                          className={errors['address.pincode'] ? 'input-error' : ''}
                          placeholder="123456"
                        />
                        {errors['address.pincode'] && <span className="field-error">{errors['address.pincode']}</span>}
                      </div>
                      <div className="form-group">
                        <label>Country</label>
                        <input
                          type="text"
                          value={formData.address.country}
                          onChange={(e) => handleInputChange('address.country', e.target.value)}
                          disabled={!isEditing}
                          placeholder="India"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'company' && (
                  <div className="profile-section">
                    <div className="section-header">
                      <h3 className="section-title">
                        <Building size={18} />
                        Company Information
                      </h3>
                      {!isEditing ? (
                        <button 
                          className="edit-btn"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit3 size={16} />
                          Edit
                        </button>
                      ) : (
                        <div className="edit-actions">
                          <button 
                            className="cancel-btn"
                            onClick={() => {
                              setIsEditing(false);
                              setErrors({});
                              if (profile) {
                                setFormData({
                                  name: profile.name || '',
                                  email: profile.email || '',
                                  phone: profile.phone || '',
                                  bio: profile.profile?.bio || '',
                                  address: {
                                    street: profile.profile?.address?.street || '',
                                    city: profile.profile?.address?.city || '',
                                    state: profile.profile?.address?.state || '',
                                    country: profile.profile?.address?.country || 'India',
                                    pincode: profile.profile?.address?.pincode || ''
                                  },
                                  company: {
                                    name: profile.companyName || '',
                                    designation: profile.profile?.designation || '',
                                    department: profile.profile?.department || ''
                                  }
                                });
                              }
                            }}
                            disabled={isSaving}
                          >
                            <X size={16} />
                            Cancel
                          </button>
                          <button 
                            className="save-btn"
                            onClick={handleSave}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <div className="spinner-sm"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save size={16} />
                                Save
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Company Name</label>
                        <input
                          type="text"
                          value={formData.company.name}
                          onChange={(e) => handleInputChange('company.name', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Your company name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Designation</label>
                        <input
                          type="text"
                          value={formData.company.designation}
                          onChange={(e) => handleInputChange('company.designation', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Your job title"
                        />
                      </div>
                      <div className="form-group">
                        <label>Department</label>
                        <input
                          type="text"
                          value={formData.company.department}
                          onChange={(e) => handleInputChange('company.department', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Your department"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="profile-section">
                    <div className="section-header">
                      <h3 className="section-title">
                        <Shield size={18} />
                        Security
                      </h3>
                      <button 
                        className="change-password-btn"
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                      >
                        <Lock size={16} />
                        {showPasswordForm ? 'Cancel' : 'Change Password'}
                      </button>
                    </div>
                    {showPasswordForm && (
                      <div className="password-form">
                        {errors.password && (
                          <div className="error-message">
                            <AlertCircle size={16} />
                            <span>{errors.password}</span>
                          </div>
                        )}
                        <div className="form-group">
                          <label>Current Password</label>
                          <div className="password-input">
                            <input
                              type={showPasswords.current ? 'text' : 'password'}
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData(prev => ({
                                ...prev,
                                currentPassword: e.target.value
                              }))}
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('current')}
                              className="password-toggle"
                            >
                              {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>New Password</label>
                          <div className="password-input">
                            <input
                              type={showPasswords.new ? 'text' : 'password'}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData(prev => ({
                                ...prev,
                                newPassword: e.target.value
                              }))}
                              placeholder="Enter new password"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('new')}
                              className="password-toggle"
                            >
                              {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Confirm New Password</label>
                          <div className="password-input">
                            <input
                              type={showPasswords.confirm ? 'text' : 'password'}
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData(prev => ({
                                ...prev,
                                confirmPassword: e.target.value
                              }))}
                              placeholder="Confirm new password"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('confirm')}
                              className="password-toggle"
                            >
                              {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="password-actions">
                          <button 
                            className="cancel-btn"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                              setErrors({ ...errors, password: null });
                            }}
                          >
                            <X size={16} />
                            Cancel
                          </button>
                          <button 
                            className="save-btn"
                            onClick={handlePasswordChange}
                          >
                            <Lock size={16} />
                            Change Password
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;