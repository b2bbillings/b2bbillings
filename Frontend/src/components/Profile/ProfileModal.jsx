import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, Camera, Lock, Save, X, 
  Edit3, MapPin, Calendar, Shield, Eye, EyeOff, CheckCircle, AlertCircle,
  Bell, Globe, Settings, Building, Users, CreditCard, Upload, Image,
  Briefcase, Heart, UserCheck, Star, Award, Target
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import apiConfig from '../../config/api';
import authService from '../../services/authService';
import ImageCropModal from './ImageCropModal';
import '../../styles/ProfileSystem.css';

const ProfileModal = ({ isOpen = true, onClose = () => {}, currentUser = {}, addToast = (msg, type) => console.log(msg, type) }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [userShops, setUserShops] = useState([]);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    companyAddress: '',
    gstNumber: '',
    avatar: '',
    profile: {
      firstName: '',
      lastName: '',
      middleName: '',
      bio: '',
      dateOfBirth: '',
      gender: '',
      
      // Contact Information
      alternateEmail: '',
      alternatePhone: '',
      whatsappNumber: '',
      
      // Address Information
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      
      // Professional Information
      designation: '',
      department: '',
      employeeId: '',
      joiningDate: '',
      experience: 0,
      
      // Skills and Interests
      skills: [],
      interests: [],
      
      // Social Links
      socialLinks: {
        linkedin: '',
        twitter: '',
        github: '',
        website: '',
        instagram: '',
        facebook: ''
      },
      
      // Emergency Contact
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
        email: ''
      },
      
      // Preferences
      language: 'english',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      theme: 'light',
      notifications: {
        email: true,
        sms: true,
        push: true,
        marketing: false
      }
    }
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Get authenticated user info
  const getAuthenticatedUser = () => {
    const authUser = authService.getCurrentUser();
    return authUser || currentUser;
  };

  // Calculate profile completeness
  const calculateProfileCompleteness = (userData) => {
    const requiredFields = [
      'name', 'email', 'phone',
      'profile.firstName', 'profile.lastName',
      'profile.dateOfBirth', 'profile.gender',
      'profile.address.city', 'profile.address.state',
      'profile.designation'
    ];
    
    let filledFields = 0;
    
    requiredFields.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], userData);
      if (value && value.toString().trim()) {
        filledFields++;
      }
    });
    
    return Math.round((filledFields / requiredFields.length) * 100);
  };

  // Handle avatar selection
  const handleAvatarSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        addToast('Please select a valid image file (JPEG, PNG, or WebP)', 'error');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        addToast('Image size should be less than 5MB', 'error');
        return;
      }
      
      setSelectedAvatar(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload avatar
  const uploadAvatar = async () => {
    if (!selectedAvatar) return null;
    
    try {
      const formData = new FormData();
      formData.append('avatar', selectedAvatar);
      
      const authUser = getAuthenticatedUser();
      const userId = authUser?._id || authUser?.id;
      const token = authService.getToken();
      
      const response = await fetch(`${apiConfig.baseURL}/api/users/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.avatarUrl;
      } else {
        throw new Error(data.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
      addToast('Failed to upload avatar', 'error');
      return null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
    }
  }, [isOpen]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Get current authenticated user
      const authUser = getAuthenticatedUser();
      const userId = authUser?._id || authUser?.id;
      
      if (!userId) {
        addToast('User not authenticated', 'error');
        return;
      }

      // Fetch user profile with shops
      const token = authService.getToken();
      const response = await fetch(`${apiConfig.baseURL}/api/users/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.data.user);
        setUserShops(data.data.shops || []);
        
        // Calculate profile completeness
        const completeness = calculateProfileCompleteness(data.data.user);
        setProfileCompleteness(completeness);
        
        // Populate form data with complete User schema mapping
        setFormData({
          name: data.data.user.name || '',
          email: data.data.user.email || '',
          phone: data.data.user.phone || '',
          companyName: data.data.user.companyName || '',
          companyAddress: data.data.user.companyAddress || '',
          gstNumber: data.data.user.gstNumber || '',
          avatar: data.data.user.avatar || '',
          profile: {
            firstName: data.data.user.profile?.firstName || '',
            lastName: data.data.user.profile?.lastName || '',
            middleName: data.data.user.profile?.middleName || '',
            bio: data.data.user.profile?.bio || '',
            dateOfBirth: data.data.user.profile?.dateOfBirth ? data.data.user.profile.dateOfBirth.split('T')[0] : '',
            gender: data.data.user.profile?.gender || '',
            
            // Contact Information
            alternateEmail: data.data.user.profile?.alternateEmail || '',
            alternatePhone: data.data.user.profile?.alternatePhone || '',
            whatsappNumber: data.data.user.profile?.whatsappNumber || '',
            
            // Address Information
            address: {
              street: data.data.user.profile?.address?.street || '',
              city: data.data.user.profile?.address?.city || '',
              state: data.data.user.profile?.address?.state || '',
              pincode: data.data.user.profile?.address?.pincode || '',
              country: data.data.user.profile?.address?.country || 'India'
            },
            
            // Professional Information
            designation: data.data.user.profile?.designation || '',
            department: data.data.user.profile?.department || '',
            employeeId: data.data.user.profile?.employeeId || '',
            joiningDate: data.data.user.profile?.joiningDate ? data.data.user.profile.joiningDate.split('T')[0] : '',
            experience: data.data.user.profile?.experience || 0,
            
            // Skills and Interests
            skills: data.data.user.profile?.skills || [],
            interests: data.data.user.profile?.interests || [],
            
            // Social Links
            socialLinks: {
              linkedin: data.data.user.profile?.socialLinks?.linkedin || '',
              twitter: data.data.user.profile?.socialLinks?.twitter || '',
              github: data.data.user.profile?.socialLinks?.github || '',
              website: data.data.user.profile?.socialLinks?.website || '',
              instagram: data.data.user.profile?.socialLinks?.instagram || '',
              facebook: data.data.user.profile?.socialLinks?.facebook || ''
            },
            
            // Emergency Contact
            emergencyContact: {
              name: data.data.user.profile?.emergencyContact?.name || '',
              relationship: data.data.user.profile?.emergencyContact?.relationship || '',
              phone: data.data.user.profile?.emergencyContact?.phone || '',
              email: data.data.user.profile?.emergencyContact?.email || ''
            },
            
            // Preferences
            language: data.data.user.profile?.language || 'english',
            timezone: data.data.user.profile?.timezone || 'Asia/Kolkata',
            currency: data.data.user.profile?.currency || 'INR',
            theme: data.data.user.profile?.theme || 'light',
            notifications: {
              email: data.data.user.profile?.notifications?.email ?? true,
              sms: data.data.user.profile?.notifications?.sms ?? true,
              push: data.data.user.profile?.notifications?.push ?? true,
              marketing: data.data.user.profile?.notifications?.marketing ?? false
            }
          }
        });

        addToast('Profile loaded successfully', 'success');
      } else {
        addToast(data.message || 'Failed to load profile data', 'error');
        
        // Fallback to current user data if available
        if (authUser) {
          setFormData(prevData => ({
            ...prevData,
            name: authUser.name || '',
            email: authUser.email || '',
            phone: authUser.phone || ''
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      addToast('Failed to load profile data', 'error');
      
      // Fallback to current user data
      const authUser = getAuthenticatedUser();
      if (authUser) {
        setFormData(prevData => ({
          ...prevData,
          name: authUser.name || '',
          email: authUser.email || '',
          phone: authUser.phone || ''
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Get current authenticated user
      const authUser = getAuthenticatedUser();
      const userId = authUser?._id || authUser?.id;
      
      if (!userId) {
        addToast('User not authenticated', 'error');
        return;
      }

      // Validate required fields
      if (!formData.name || !formData.email) {
        addToast('Name and email are required', 'error');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        addToast('Please enter a valid email address', 'error');
        return;
      }

      // Validate phone number
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        addToast('Please enter a valid 10-digit phone number', 'error');
        return;
      }

      let updatedFormData = { ...formData };

      // Upload avatar if selected
      if (selectedAvatar) {
        const avatarUrl = await uploadAvatar();
        if (avatarUrl) {
          updatedFormData.avatar = avatarUrl;
        }
      }

      const token = authService.getToken();
      const response = await fetch(`${apiConfig.baseURL}/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedFormData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.data);
        setIsEditing(false);
        setSelectedAvatar(null);
        setAvatarPreview(null);
        
        // Recalculate profile completeness
        const completeness = calculateProfileCompleteness(data.data);
        setProfileCompleteness(completeness);
        
        addToast('Profile updated successfully', 'success');
        
        // Update auth service current user if needed
        if (authUser) {
          const updatedUser = { ...authUser, ...updatedFormData };
          authService.updateCurrentUser(updatedUser);
        }
      } else {
        addToast(data.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      addToast('Failed to save profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        addToast('All password fields are required', 'error');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        addToast('New passwords do not match', 'error');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        addToast('New password must be at least 6 characters', 'error');
        return;
      }

      setIsChangingPassword(true);
      
      const authUser = getAuthenticatedUser();
      const userId = authUser?._id || authUser?.id;
      
      if (!userId) {
        addToast('User not authenticated', 'error');
        return;
      }

      const token = authService.getToken();
      const response = await fetch(`${apiConfig.baseURL}/api/users/${userId}/change-password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordFields(false);
        addToast('Password changed successfully', 'success');
      } else {
        addToast(data.message || 'Failed to change password', 'error');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      addToast('Failed to change password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleInputChange = (field, value) => {
    const fieldParts = field.split('.');
    
    setFormData(prevData => {
      const newData = { ...prevData };
      let current = newData;
      
      // Navigate to the nested field
      for (let i = 0; i < fieldParts.length - 1; i++) {
        if (!current[fieldParts[i]]) {
          current[fieldParts[i]] = {};
        }
        current = current[fieldParts[i]];
      }
      
      // Set the value
      current[fieldParts[fieldParts.length - 1]] = value;
      
      return newData;
    });
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle skills array
  const handleSkillAdd = (skill) => {
    if (skill && !formData.profile.skills.includes(skill)) {
      handleInputChange('profile.skills', [...formData.profile.skills, skill]);
    }
  };

  const handleSkillRemove = (skillToRemove) => {
    handleInputChange('profile.skills', formData.profile.skills.filter(skill => skill !== skillToRemove));
  };

  // Handle interests array
  const handleInterestAdd = (interest) => {
    if (interest && !formData.profile.interests.includes(interest)) {
      handleInputChange('profile.interests', [...formData.profile.interests, interest]);
    }
  };

  const handleInterestRemove = (interestToRemove) => {
    handleInputChange('profile.interests', formData.profile.interests.filter(interest => interest !== interestToRemove));
  };

  // Reset editing state
  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedAvatar(null);
    setAvatarPreview(null);
    loadUserProfile(); // Reload original data
  };

  // Handle tab navigation with keyboard
  const handleTabKeyPress = (e, tabName) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(tabName);
    }
  };

  const getUserAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (formData.avatar) return formData.avatar;
    if (user?.avatar) return user.avatar;
    const displayName = formData.name || user?.name || currentUser?.name || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6f42c1&color=fff&size=200&bold=true&format=svg`;
  };

  // Get profile completion color
  const getCompletionColor = (percentage) => {
    if (percentage >= 80) return '#10b981'; // green
    if (percentage >= 60) return '#f59e0b'; // yellow
    if (percentage >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const tabs = [
    { id: 'personal', label: 'Profile', icon: User },
    { id: 'shops', label: 'My Shops', icon: Building },
    // { id: 'preferences', label: 'Preferences', icon: Settings },
    // { id: 'security', label: 'Security', icon: Shield },
  ];

  if (!isOpen) return null;

  return (
    <div className="profile-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="profile-modal">
        {/* Enhanced Header with Profile Completeness */}
        <div className="profile-header">
          <div className="profile-header-content">
            {/* Avatar Section */}
            <div className="profile-avatar-section">
              <div className="profile-avatar-wrapper">
                <img 
                  src={getUserAvatarUrl()} 
                  alt="Profile" 
                  className="profile-avatar"
                />
                {isEditing && (
                  <label className="avatar-upload-btn" title="Change profile picture">
                    <Camera size={16} />
                    <input
                      type="file"
                      ref={fileInputRef}
                      hidden
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarSelect}
                    />
                  </label>
                )}
                {selectedAvatar && (
                  <div className="avatar-preview-badge">
                    <CheckCircle size={16} />
                  </div>
                )}
              </div>
              
              {/* Profile Completeness Indicator */}
              <div className="profile-completeness">
                <div className="completeness-circle">
                  <svg viewBox="0 0 36 36" className="completeness-svg">
                    <path
                      className="circle-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="circle-progress"
                      strokeDasharray={`${profileCompleteness}, 100`}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      style={{ stroke: getCompletionColor(profileCompleteness) }}
                    />
                  </svg>
                  <div className="completeness-text">{profileCompleteness}%</div>
                </div>
                <span className="completeness-label">Profile Complete</span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="profile-header-info">
              <h1 className="profile-name">
                {formData.name || user?.name || currentUser?.name || 'User'}
              </h1>
              <p className="profile-role">
                <Building size={16} />
                {formData.profile.designation || user?.profile?.designation || 'Role not specified'}
              </p>
              <p className="profile-company">
                {formData.companyName || user?.companyName || 'Company not specified'}
              </p>
              
              {/* Quick Stats */}
              <div className="profile-stats">
                <div className="stat-item">
                  <Users size={14} />
                  <span>{userShops.length} Shop{userShops.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="stat-item">
                  <Calendar size={14} />
                  <span>
                    {formData.profile.joiningDate 
                      ? `Joined ${new Date(formData.profile.joiningDate).toLocaleDateString()}`
                      : 'Join date not set'
                    }
                  </span>
                </div>
                <div className="stat-item">
                  <Award size={14} />
                  <span>{formData.profile.experience || 0} years experience</span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="profile-header-actions">
              {!isEditing ? (
                <button 
                  className="edit-btn"
                  onClick={() => setIsEditing(true)}
                  title="Edit Profile"
                >
                  <Edit3 size={18} />
                  Edit Profile
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    className="btn-cancel"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button 
                    className="btn-save"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="loading-spinner"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
              
              <button 
                className="close-btn"
                onClick={onClose}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
            onKeyDown={(e) => handleTabKeyPress(e, 'personal')}
          >
            <User size={16} />
            Personal
          </button>
          <button 
            className={`profile-tab ${activeTab === 'professional' ? 'active' : ''}`}
            onClick={() => setActiveTab('professional')}
            onKeyDown={(e) => handleTabKeyPress(e, 'professional')}
          >
            <Briefcase size={16} />
            Professional
          </button>
          <button 
            className={`profile-tab ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
            onKeyDown={(e) => handleTabKeyPress(e, 'contact')}
          >
            <Phone size={16} />
            Contact
          </button>
          <button 
            className={`profile-tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
            onKeyDown={(e) => handleTabKeyPress(e, 'preferences')}
          >
            <Settings size={16} />
            Preferences
          </button>
          <button 
            className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            onKeyDown={(e) => handleTabKeyPress(e, 'security')}
          >
            <Shield size={16} />
            Security
          </button>
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner large"></div>
              <p>Loading profile...</p>
            </div>
          ) : (
            <>
              {/* Personal Information Tab */}
              {activeTab === 'personal' && (
                <div className="tab-content">
                  <div className="content-section">
                    <h3 className="section-title">
                      <User size={18} />
                      Basic Information
                    </h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">
                          Full Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email Address <span className="required">*</span></label>
                        <input
                          type="email"
                          className="form-input"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          disabled={!isEditing}
                          placeholder="your.email@company.com"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Phone Number <span className="required">*</span></label>
                        <input
                          type="tel"
                          className="form-input"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          disabled={!isEditing}
                          placeholder="9876543210"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Date of Birth</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.profile.dateOfBirth}
                          onChange={(e) => handleInputChange('profile.dateOfBirth', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Gender</label>
                        <select
                          className="form-input"
                          value={formData.profile.gender}
                          onChange={(e) => handleInputChange('profile.gender', e.target.value)}
                          disabled={!isEditing}
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Bio</label>
                      <textarea
                        className="form-textarea"
                        value={formData.profile.bio}
                        onChange={(e) => handleInputChange('profile.bio', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Tell us about yourself..."
                        rows="4"
                      />
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="content-section">
                    <h3 className="section-title">
                      <MapPin size={18} />
                      Address Information
                    </h3>
                    
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label className="form-label">Street Address</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.address.street}
                          onChange={(e) => handleInputChange('profile.address.street', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Building number, street name"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">City</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.address.city}
                          onChange={(e) => handleInputChange('profile.address.city', e.target.value)}
                          disabled={!isEditing}
                          placeholder="City"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">State</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.address.state}
                          onChange={(e) => handleInputChange('profile.address.state', e.target.value)}
                          disabled={!isEditing}
                          placeholder="State"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Pincode</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.address.pincode}
                          onChange={(e) => handleInputChange('profile.address.pincode', e.target.value)}
                          disabled={!isEditing}
                          placeholder="123456"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Country</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.address.country}
                          onChange={(e) => handleInputChange('profile.address.country', e.target.value)}
                          disabled={!isEditing}
                          placeholder="India"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Information Tab */}
              {activeTab === 'professional' && (
                <div className="tab-content">
                  <div className="content-section">
                    <h3 className="section-title">
                      <Building size={18} />
                      Company Information
                    </h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.companyName}
                          onChange={(e) => handleInputChange('companyName', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Your company name"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">GST Number</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.gstNumber}
                          onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                          disabled={!isEditing}
                          placeholder="22AAAAA0000A1Z5"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Company Address</label>
                      <textarea
                        className="form-textarea"
                        value={formData.companyAddress}
                        onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Complete company address"
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="content-section">
                    <h3 className="section-title">
                      <Briefcase size={18} />
                      Professional Details
                    </h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Designation</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.designation}
                          onChange={(e) => handleInputChange('profile.designation', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Your job title"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Department</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.department}
                          onChange={(e) => handleInputChange('profile.department', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Your department"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Employee ID</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.employeeId}
                          onChange={(e) => handleInputChange('profile.employeeId', e.target.value)}
                          disabled={!isEditing}
                          placeholder="EMP001"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Joining Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.profile.joiningDate}
                          onChange={(e) => handleInputChange('profile.joiningDate', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Experience (Years)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={formData.profile.experience}
                          onChange={(e) => handleInputChange('profile.experience', parseInt(e.target.value) || 0)}
                          disabled={!isEditing}
                          min="0"
                          max="50"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="content-section">
                    <h3 className="section-title">
                      <Star size={18} />
                      Skills & Expertise
                    </h3>
                    
                    <div className="skills-container">
                      <div className="skills-list">
                        {formData.profile.skills.map((skill, index) => (
                          <span key={index} className="skill-tag">
                            {skill}
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleSkillRemove(skill)}
                                className="skill-remove"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      
                      {isEditing && (
                        <div className="skill-input-group">
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Add a skill and press Enter"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSkillAdd(e.target.value.trim());
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information Tab */}
              {activeTab === 'contact' && (
                <div className="tab-content">
                  <div className="content-section">
                    <h3 className="section-title">
                      <Phone size={18} />
                      Contact Details
                    </h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Alternate Email</label>
                        <input
                          type="email"
                          className="form-input"
                          value={formData.profile.alternateEmail}
                          onChange={(e) => handleInputChange('profile.alternateEmail', e.target.value)}
                          disabled={!isEditing}
                          placeholder="alternate@email.com"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Alternate Phone</label>
                        <input
                          type="tel"
                          className="form-input"
                          value={formData.profile.alternatePhone}
                          onChange={(e) => handleInputChange('profile.alternatePhone', e.target.value)}
                          disabled={!isEditing}
                          placeholder="9876543210"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">WhatsApp Number</label>
                        <input
                          type="tel"
                          className="form-input"
                          value={formData.profile.whatsappNumber}
                          onChange={(e) => handleInputChange('profile.whatsappNumber', e.target.value)}
                          disabled={!isEditing}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="content-section">
                    <h3 className="section-title">
                      <Globe size={18} />
                      Social Links
                    </h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">LinkedIn</label>
                        <input
                          type="url"
                          className="form-input"
                          value={formData.profile.socialLinks.linkedin}
                          onChange={(e) => handleInputChange('profile.socialLinks.linkedin', e.target.value)}
                          disabled={!isEditing}
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">GitHub</label>
                        <input
                          type="url"
                          className="form-input"
                          value={formData.profile.socialLinks.github}
                          onChange={(e) => handleInputChange('profile.socialLinks.github', e.target.value)}
                          disabled={!isEditing}
                          placeholder="https://github.com/username"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Website</label>
                        <input
                          type="url"
                          className="form-input"
                          value={formData.profile.socialLinks.website}
                          onChange={(e) => handleInputChange('profile.socialLinks.website', e.target.value)}
                          disabled={!isEditing}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Twitter</label>
                        <input
                          type="url"
                          className="form-input"
                          value={formData.profile.socialLinks.twitter}
                          onChange={(e) => handleInputChange('profile.socialLinks.twitter', e.target.value)}
                          disabled={!isEditing}
                          placeholder="https://twitter.com/username"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="content-section">
                    <h3 className="section-title">
                      <Heart size={18} />
                      Emergency Contact
                    </h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Contact Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.emergencyContact.name}
                          onChange={(e) => handleInputChange('profile.emergencyContact.name', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Emergency contact name"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Relationship</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.profile.emergencyContact.relationship}
                          onChange={(e) => handleInputChange('profile.emergencyContact.relationship', e.target.value)}
                          disabled={!isEditing}
                          placeholder="e.g., Spouse, Parent, Sibling"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="tel"
                          className="form-input"
                          value={formData.profile.emergencyContact.phone}
                          onChange={(e) => handleInputChange('profile.emergencyContact.phone', e.target.value)}
                          disabled={!isEditing}
                          placeholder="9876543210"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-input"
                          value={formData.profile.emergencyContact.email}
                          onChange={(e) => handleInputChange('profile.emergencyContact.email', e.target.value)}
                          disabled={!isEditing}
                          placeholder="emergency@email.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="tab-content">
                  <div className="content-section">
                    <h3 className="section-title">
                      <Settings size={18} />
                      General Preferences
                    </h3>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Language</label>
                        <select
                          className="form-input"
                          value={formData.profile.language}
                          onChange={(e) => handleInputChange('profile.language', e.target.value)}
                          disabled={!isEditing}
                        >
                          <option value="english">English</option>
                          <option value="hindi">Hindi</option>
                          <option value="gujarati">Gujarati</option>
                          <option value="marathi">Marathi</option>
                          <option value="tamil">Tamil</option>
                          <option value="telugu">Telugu</option>
                          <option value="kannada">Kannada</option>
                          <option value="bengali">Bengali</option>
                          <option value="punjabi">Punjabi</option>
                          <option value="malayalam">Malayalam</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Timezone</label>
                        <select
                          className="form-input"
                          value={formData.profile.timezone}
                          onChange={(e) => handleInputChange('profile.timezone', e.target.value)}
                          disabled={!isEditing}
                        >
                          <option value="Asia/Kolkata">India Standard Time (IST)</option>
                          <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                          <option value="UTC">Coordinated Universal Time (UTC)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Currency</label>
                        <select
                          className="form-input"
                          value={formData.profile.currency}
                          onChange={(e) => handleInputChange('profile.currency', e.target.value)}
                          disabled={!isEditing}
                        >
                          <option value="INR">Indian Rupee (₹)</option>
                          <option value="USD">US Dollar ($)</option>
                          <option value="EUR">Euro (€)</option>
                          <option value="GBP">British Pound (£)</option>
                          <option value="AED">UAE Dirham (د.إ)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Theme</label>
                        <select
                          className="form-input"
                          value={formData.profile.theme}
                          onChange={(e) => handleInputChange('profile.theme', e.target.value)}
                          disabled={!isEditing}
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto (System)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="content-section">
                    <h3 className="section-title">
                      <Bell size={18} />
                      Notification Preferences
                    </h3>
                    
                    <div className="notification-options">
                      <div className="notification-item">
                        <div className="notification-info">
                          <h4>Email Notifications</h4>
                          <p>Receive notifications via email</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={formData.profile.notifications.email}
                            onChange={(e) => handleInputChange('profile.notifications.email', e.target.checked)}
                            disabled={!isEditing}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <h4>SMS Notifications</h4>
                          <p>Receive notifications via SMS</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={formData.profile.notifications.sms}
                            onChange={(e) => handleInputChange('profile.notifications.sms', e.target.checked)}
                            disabled={!isEditing}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <h4>Push Notifications</h4>
                          <p>Receive push notifications in browser</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={formData.profile.notifications.push}
                            onChange={(e) => handleInputChange('profile.notifications.push', e.target.checked)}
                            disabled={!isEditing}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <h4>Marketing Communications</h4>
                          <p>Receive promotional emails and updates</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={formData.profile.notifications.marketing}
                            onChange={(e) => handleInputChange('profile.notifications.marketing', e.target.checked)}
                            disabled={!isEditing}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="tab-content">
                  <div className="content-section">
                    <h3 className="section-title">
                      <Shield size={18} />
                      Account Security
                    </h3>
                    
                    <div className="security-info">
                      <div className="security-status">
                        <div className="status-item">
                          <CheckCircle size={16} className="status-icon success" />
                          <span>Email Verified</span>
                        </div>
                        <div className="status-item">
                          <CheckCircle size={16} className="status-icon success" />
                          <span>Strong Password</span>
                        </div>
                        <div className="status-item">
                          <AlertCircle size={16} className="status-icon warning" />
                          <span>Two-Factor Authentication (Recommended)</span>
                        </div>
                      </div>
                    </div>

                    {/* Password Change Section */}
                    <div className="password-section">
                      <div className="password-header">
                        <h4>Change Password</h4>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setShowPasswordFields(!showPasswordFields)}
                        >
                          <Lock size={16} />
                          {showPasswordFields ? 'Cancel' : 'Change Password'}
                        </button>
                      </div>

                      {showPasswordFields && (
                        <div className="password-form">
                          <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <div className="password-input">
                              <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                className="form-input"
                                value={passwordData.currentPassword}
                                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                                placeholder="Enter current password"
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div className="password-input">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                className="form-input"
                                value={passwordData.newPassword}
                                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                                placeholder="Enter new password"
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <div className="password-input">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-input"
                                value={passwordData.confirmPassword}
                                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                                placeholder="Confirm new password"
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="password-actions">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={handleChangePassword}
                              disabled={isChangingPassword}
                            >
                              {isChangingPassword ? (
                                <>
                                  <div className="loading-spinner"></div>
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Lock size={16} />
                                  Update Password
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Enhanced Inline Styles */}
      <style jsx>{`
        .profile-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .profile-modal {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.95) 0%, 
            rgba(255, 255, 255, 0.9) 100%
          );
          border-radius: 24px;
          width: 100%;
          max-width: 1200px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 
            0 25px 50px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .profile-header {
          background: linear-gradient(135deg, 
            #667eea 0%, 
            #764ba2 50%, 
            #6f42c1 100%
          );
          color: white;
          padding: 30px;
          position: relative;
          overflow: hidden;
        }

        .profile-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, 
            rgba(255, 255, 255, 0.1) 0%, 
            transparent 50%, 
            rgba(255, 255, 255, 0.1) 100%
          );
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }

        .profile-header-content {
          display: flex;
          align-items: flex-start;
          gap: 30px;
          position: relative;
          z-index: 1;
        }

        .profile-avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .profile-avatar-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
        }

        .profile-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .profile-avatar:hover {
          transform: scale(1.05);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .avatar-upload-btn {
          position: absolute;
          bottom: 5px;
          right: 5px;
          background: linear-gradient(135deg, #6f42c1, #5a34a1);
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .avatar-upload-btn:hover {
          transform: scale(1.1);
          background: linear-gradient(135deg, #5a34a1, #4a2c87);
        }

        .avatar-preview-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .profile-completeness {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .completeness-circle {
          position: relative;
          width: 60px;
          height: 60px;
        }

        .completeness-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .circle-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.2);
          stroke-width: 3;
        }

        .circle-progress {
          fill: none;
          stroke-width: 3;
          stroke-linecap: round;
          transition: stroke-dasharray 0.5s ease;
        }

        .completeness-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          font-weight: 600;
          color: white;
        }

        .completeness-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
        }

        .profile-header-info {
          flex: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .profile-role {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 6px 0;
        }

        .profile-company {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 20px 0;
        }

        .profile-stats {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .profile-header-actions {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .edit-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .edit-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .edit-actions {
          display: flex;
          gap: 8px;
        }

        .btn-cancel {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .btn-save {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .profile-tabs {
          display: flex;
          background: rgba(248, 250, 252, 0.8);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          overflow-x: auto;
        }

        .profile-tab {
          background: none;
          border: none;
          padding: 16px 24px;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .profile-tab:hover {
          color: #6f42c1;
          background: rgba(111, 66, 193, 0.05);
        }

        .profile-tab.active {
          color: #6f42c1;
          border-bottom-color: #6f42c1;
          background: rgba(111, 66, 193, 0.1);
        }

        .profile-content {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        .tab-content {
          padding: 30px;
          max-width: 100%;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          color: #64748b;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid #6f42c1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-spinner.large {
          width: 40px;
          height: 40px;
          border-width: 3px;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .content-section {
          background: rgba(255, 255, 255, 0.7);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .content-section:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid rgba(111, 66, 193, 0.1);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 4px;
        }

        .required {
          color: #ef4444;
        }

        .form-input,
        .form-textarea {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #6f42c1;
          box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.1);
          background: white;
        }

        .form-input:disabled,
        .form-textarea:disabled {
          background: rgba(248, 250, 252, 0.8);
          color: #64748b;
          cursor: not-allowed;
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .skills-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .skill-tag {
          background: linear-gradient(135deg, #6f42c1, #5a34a1);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .skill-remove {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          transition: all 0.2s ease;
        }

        .skill-remove:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .skill-input-group {
          max-width: 300px;
        }

        .notification-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .notification-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .notification-info h4 {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .notification-info p {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #e2e8f0;
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input:checked + .toggle-slider {
          background-color: #6f42c1;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .security-info {
          margin-bottom: 24px;
        }

        .security-status {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }

        .status-icon {
          flex-shrink: 0;
        }

        .status-icon.success {
          color: #10b981;
        }

        .status-icon.warning {
          color: #f59e0b;
        }

        .password-section {
          margin-top: 24px;
        }

        .password-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .password-header h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .btn-secondary {
          background: rgba(111, 66, 193, 0.1);
          color: #6f42c1;
          border: 1px solid rgba(111, 66, 193, 0.2);
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          background: rgba(111, 66, 193, 0.15);
          transform: translateY(-1px);
        }

        .password-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 400px;
        }

        .password-input {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .password-toggle:hover {
          color: #6f42c1;
          background: rgba(111, 66, 193, 0.1);
        }

        .password-actions {
          display: flex;
          gap: 12px;
          margin-top: 10px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #6f42c1, #5a34a1);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(111, 66, 193, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .profile-modal {
            margin: 10px;
            max-height: 95vh;
          }

          .profile-header {
            padding: 20px;
          }

          .profile-header-content {
            flex-direction: column;
            gap: 20px;
            text-align: center;
          }

          .profile-stats {
            justify-content: center;
          }

          .profile-tabs {
            flex-wrap: wrap;
          }

          .profile-tab {
            flex: 1;
            min-width: auto;
            padding: 12px;
            font-size: 12px;
          }

          .tab-content {
            padding: 20px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .edit-actions {
            flex-direction: column;
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .profile-modal-backdrop {
            padding: 0;
          }

          .profile-modal {
            height: 100vh;
            border-radius: 0;
            margin: 0;
          }

          .profile-header {
            border-radius: 0;
          }

          .profile-avatar-wrapper {
            width: 80px;
            height: 80px;
          }

          .profile-name {
            font-size: 20px;
          }
        }

        /* Focus styles for accessibility */
        .profile-tab:focus,
        .edit-btn:focus,
        .btn-cancel:focus,
        .btn-save:focus,
        .btn-primary:focus,
        .btn-secondary:focus,
        .close-btn:focus {
          outline: 3px solid rgba(111, 66, 193, 0.3);
          outline-offset: 2px;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .content-section {
            border: 2px solid #000;
          }

          .form-input,
          .form-textarea {
            border: 2px solid #000;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfileModal;




