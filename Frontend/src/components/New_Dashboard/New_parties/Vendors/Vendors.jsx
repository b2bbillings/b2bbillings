import React, { useState, useEffect, useRef } from 'react';
import './Vendors.css';
import { vendorService } from '../../../../services/customerVendorService';

const Vendors = () => {
  const [formData, setFormData] = useState({
    // Basic Details
    linkCustomer: '',
    name: '',
    phone: '',
    alternatePhone: '',
    email: '',
    webLink: '',
    
    // Company Details
    company: '',
    copyToVendorName: false,
    gstType: 'unregistered', // 'regular', 'composition', 'unregistered'
    gstin: '',
    
    // Billing Address
    billingCountry: 'India',
    billingShopAddress: '',
    billingPincode: '',
    billingVillageColony: '',
    billingTahsilTaluka: '',
    billingDistrict: '',
    billingState: '',
    
    // Shipping Address
    shippingAddress: '',
    shippingPincode: '',
    shippingVillageColony: '',
    shippingTahsilTaluka: '',
    shippingDistrict: '',
    shippingState: '',
    sameAsBilling: false,
    
    // Optional Details - Opening Balance
    openingBalanceType: 'debit', // 'debit' or 'credit'
    openingBalanceAmount: 0,
    minBalance: 0,
    
    // Additional
    notes: ''
  });

  const [customers] = useState([
    { id: 1, name: 'John Doe', company: 'ABC Corp' },
    { id: 2, name: 'Jane Smith', company: 'XYZ Ltd' },
    { id: 3, name: 'Mike Johnson', company: 'Tech Solutions' }
  ]);

  const [showAlternatePhone, setShowAlternatePhone] = useState(false);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Search functionality states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  // Duplicate checking states
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  // Loading and notification states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Notification handler
  const showNotification = (message, type = 'success', duration = 5000) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, duration);
  };

  // Check balance warning when amounts change
  useEffect(() => {
    const currentBalance = formData.openingBalanceType === 'debit' 
      ? formData.openingBalanceAmount 
      : -formData.openingBalanceAmount;
    
    if (formData.minBalance > 0 && Math.abs(currentBalance) <= formData.minBalance) {
      setShowBalanceWarning(true);
    } else {
      setShowBalanceWarning(false);
    }
  }, [formData.openingBalanceAmount, formData.openingBalanceType, formData.minBalance]);

  // Capitalize first letter of each word
  const capitalizeFirstLetter = (str) => {
    if (!str) return str;
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Debounced duplicate checking
  const checkDuplicatePhone = async (phone) => {
    if (!phone || phone.length < 10) {
      setPhoneError('');
      return;
    }

    setIsCheckingPhone(true);
    try {
      const response = await vendorService.checkPhoneExists(phone);
      if (response.exists) {
        setPhoneError('This phone number is already registered');
      } else {
        setPhoneError('');
      }
    } catch (error) {
      console.error('Error checking phone:', error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const checkDuplicateEmail = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailError('');
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await vendorService.checkEmailExists(email);
      if (response.exists) {
        setEmailError('This email is already registered');
      } else {
        setEmailError('');
      }
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Real-time search with API and debouncing
  const performSearch = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await vendorService.searchVendors(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const indianStates = [
    { code: '35', name: 'Andaman and Nicobar Islands' },
    { code: '28', name: 'Andhra Pradesh' },
    { code: '37', name: 'Andhra Pradesh (New)' },
    { code: '12', name: 'Arunachal Pradesh' },
    { code: '18', name: 'Assam' },
    { code: '10', name: 'Bihar' },
    { code: '04', name: 'Chandigarh' },
    { code: '22', name: 'Chhattisgarh' },
    { code: '26', name: 'Dadra and Nagar Haveli' },
    { code: '25', name: 'Daman and Diu' },
    { code: '07', name: 'Delhi' },
    { code: '30', name: 'Goa' },
    { code: '24', name: 'Gujarat' },
    { code: '06', name: 'Haryana' },
    { code: '02', name: 'Himachal Pradesh' },
    { code: '01', name: 'Jammu and Kashmir' },
    { code: '20', name: 'Jharkhand' },
    { code: '29', name: 'Karnataka' },
    { code: '32', name: 'Kerala' },
    { code: '31', name: 'Lakshadweep' },
    { code: '23', name: 'Madhya Pradesh' },
    { code: '27', name: 'Maharashtra' },
    { code: '14', name: 'Manipur' },
    { code: '17', name: 'Meghalaya' },
    { code: '15', name: 'Mizoram' },
    { code: '13', name: 'Nagaland' },
    { code: '21', name: 'Odisha' },
    { code: '34', name: 'Puducherry' },
    { code: '03', name: 'Punjab' },
    { code: '08', name: 'Rajasthan' },
    { code: '11', name: 'Sikkim' },
    { code: '33', name: 'Tamil Nadu' },
    { code: '36', name: 'Telangana' },
    { code: '16', name: 'Tripura' },
    { code: '05', name: 'Uttarakhand' },
    { code: '09', name: 'Uttar Pradesh' },
    { code: '19', name: 'West Bengal' }
  ];

  // Search functionality with real API
  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 2) {
      setIsSearching(true);
      try {
        const response = await vendorService.searchVendors(query);
        if (response.success) {
          setSearchResults(response.data);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
    }
  };

  const handleSelectVendor = async (vendor) => {
    try {
      // Get full vendor details for display only (no auto-fill)
      const response = await vendorService.getVendor(vendor.id);
      if (response.success) {
        const vendorData = response.data;
        
        // Just show information instead of auto-filling form
        const vendorInfo = `
Vendor Information:
Name: ${vendorData.name || 'N/A'}
Company: ${vendorData.company || 'N/A'}
Phone: ${vendorData.phone || 'N/A'}
${vendorData.alternatePhone ? `Alt Phone: ${vendorData.alternatePhone}` : ''}
Email: ${vendorData.email || 'N/A'}
${vendorData.webLink ? `Website: ${vendorData.webLink}` : ''}
GST Type: ${vendorData.gstType || 'Unregistered'}
${vendorData.gstin ? `GSTIN: ${vendorData.gstin}` : ''}
Billing Address: ${vendorData.billingAddress ? `${vendorData.billingAddress.shopAddress || ''}, ${vendorData.billingAddress.villageColony || ''}, ${vendorData.billingAddress.district || ''}, ${vendorData.billingAddress.state || ''}` : 'Not provided'}
Opening Balance: ${vendorData.openingBalance ? `${vendorData.openingBalance.type} ${vendorData.openingBalance.amount}` : '0'}
        `.trim();
        
        showNotification(`Vendor found! ${vendorInfo}`, 'info', 8000);
      }
      setShowSearchResults(false);
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      showNotification('Error loading vendor details', 'error');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    // Reset form to empty state
    setFormData({
      linkCustomer: '',
      name: '',
      phone: '',
      alternatePhone: '',
      email: '',
      webLink: '',
      company: '',
      copyToVendorName: false,
      gstType: 'unregistered',
      gstin: '',
      billingCountry: 'India',
      billingShopAddress: '',
      billingPincode: '',
      billingVillageColony: '',
      billingTahsilTaluka: '',
      billingDistrict: '',
      billingState: '',
      shippingAddress: '',
      shippingPincode: '',
      shippingVillageColony: '',
      shippingTahsilTaluka: '',
      shippingDistrict: '',
      shippingState: '',
      sameAsBilling: false,
      openingBalanceType: 'debit',
      openingBalanceAmount: 0,
      minBalance: 0,
      notes: ''
    });
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Clear search timeout on unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Capitalize text fields
    let processedValue = value;
    const textFields = ['name', 'company', 'billingShopAddress', 'billingVillageColony', 'billingTahsilTaluka', 'billingDistrict', 'shippingAddress', 'shippingVillageColony', 'shippingTahsilTaluka', 'shippingDistrict'];
    
    if (textFields.includes(name) && type !== 'checkbox') {
      processedValue = capitalizeFirstLetter(value);
    }
    
    if (name === 'sameAsBilling' && checked) {
      // Copy billing address to shipping address
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        shippingAddress: prev.billingShopAddress,
        shippingPincode: prev.billingPincode,
        shippingVillageColony: prev.billingVillageColony,
        shippingTahsilTaluka: prev.billingTahsilTaluka,
        shippingDistrict: prev.billingDistrict,
        shippingState: prev.billingState
      }));
    } else if (name === 'copyToVendorName' && checked) {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        name: prev.company
      }));
    } else if (name === 'company' && formData.copyToVendorName) {
      setFormData(prev => ({
        ...prev,
        [name]: processedValue,
        name: processedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : processedValue
      }));
    }
    
    // Check for duplicates on phone and email
    if (name === 'phone' && processedValue.length >= 10) {
      setTimeout(() => checkDuplicatePhone(processedValue), 500);
    }
    if (name === 'email' && processedValue.includes('@')) {
      setTimeout(() => checkDuplicateEmail(processedValue), 500);
    }
  };

  const handleCustomerLink = (customerId) => {
    const selectedCustomer = customers.find(customer => customer.id === parseInt(customerId));
    if (selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        linkCustomer: customerId,
        name: selectedCustomer.name,
        company: selectedCustomer.company
      }));
    }
  };

  const closeBalanceWarning = () => {
    setShowBalanceWarning(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const vendorData = {
        name: formData.name,
        phone: formData.phone,
        alternatePhone: formData.alternatePhone || undefined,
        email: formData.email || undefined,
        webLink: formData.webLink || undefined,
        company: formData.company || undefined,
        copyToVendorName: formData.copyToVendorName,
        gstType: formData.gstType,
        gstin: formData.gstType !== 'unregistered' ? formData.gstin : undefined,
        billingAddress: {
          country: formData.billingCountry,
          shopAddress: formData.billingShopAddress,
          pincode: formData.billingPincode,
          villageColony: formData.billingVillageColony,
          tahsilTaluka: formData.billingTahsilTaluka,
          district: formData.billingDistrict,
          state: formData.billingState
        },
        shippingAddress: {
          sameAsBilling: formData.sameAsBilling,
          address: formData.sameAsBilling ? formData.billingShopAddress : formData.shippingAddress,
          pincode: formData.sameAsBilling ? formData.billingPincode : formData.shippingPincode,
          villageColony: formData.sameAsBilling ? formData.billingVillageColony : formData.shippingVillageColony,
          tahsilTaluka: formData.sameAsBilling ? formData.billingTahsilTaluka : formData.shippingTahsilTaluka,
          district: formData.sameAsBilling ? formData.billingDistrict : formData.shippingDistrict,
          state: formData.sameAsBilling ? formData.billingState : formData.shippingState
        },
        openingBalance: {
          type: formData.openingBalanceType,
          amount: parseFloat(formData.openingBalanceAmount) || 0
        },
        minBalance: parseFloat(formData.minBalance) || 0,
        notes: formData.notes || undefined
      };
      
      console.log('Submitting Vendor Data:', vendorData);
      
      const response = await vendorService.createVendor(vendorData);
      
      if (response.success) {
        // Show success popup
        setSuccessMessage('Vendor created successfully!');
        setShowSuccessPopup(true);
        
        showNotification('Vendor created successfully!', 'success');
        // Reset form
        setFormData({
          linkCustomer: '',
          name: '',
          phone: '',
          alternatePhone: '',
          email: '',
          webLink: '',
          company: '',
          copyToVendorName: false,
          gstType: 'unregistered',
          gstin: '',
          billingCountry: 'India',
          billingShopAddress: '',
          billingPincode: '',
          billingVillageColony: '',
          billingTahsilTaluka: '',
          billingDistrict: '',
          billingState: '',
          shippingAddress: '',
          shippingPincode: '',
          shippingVillageColony: '',
          shippingTahsilTaluka: '',
          shippingDistrict: '',
          shippingState: '',
          sameAsBilling: false,
          openingBalanceType: 'debit',
          openingBalanceAmount: 0,
          minBalance: 0,
          notes: ''
        });
        setShowAlternatePhone(false);
        clearSearch();
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      const errorMessage = error.message || 'Failed to create vendor. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="vendors-container">
      {/* Balance Warning Popup */}
      {showBalanceWarning && (
        <div className="balance-warning-overlay">
          <div className="balance-warning-popup">
            <div className="warning-icon">⚠️</div>
            <h3>Balance Alert!</h3>
            <p>
              The current balance (₹{formData.openingBalanceType === 'debit' ? formData.openingBalanceAmount : -formData.openingBalanceAmount}) 
              is at or below the minimum balance threshold of ₹{formData.minBalance}.
            </p>
            <p className="warning-subtext">
              {formData.openingBalanceType === 'debit' 
                ? 'Receivable amount is running low.' 
                : 'Payable expenses are exceeding the minimum threshold.'}
            </p>
            <div className="warning-actions">
              <button 
                type="button" 
                onClick={closeBalanceWarning}
                className="btn-warning-ok"
              >
                OK, Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="search-section" ref={searchRef}>
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="🔍 Search existing vendors by name, phone, email, or company..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="clear-search-btn"
                title="Clear search and create new"
              >
                ✕
              </button>
            )}
          </div>
          
          {isSearching && (
            <div className="search-loading">
              <div className="loading-spinner"></div>
              Searching...
            </div>
          )}
          
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results">
              <div className="search-results-header">
                Found {searchResults.length} vendor(s) - Click to view details
              </div>
              <div className="search-results-body">
                {searchResults.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="search-result-item"
                    onClick={() => handleSelectVendor(vendor)}
                  >
                    <div className="result-main">
                      <div className="result-left">
                        <div className="result-name">
                          🏪 {vendor.name}
                          <span className="result-type">Vendor</span>
                        </div>
                        {vendor.company && (
                          <div className="result-company">
                            🏢 {vendor.company}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="result-details">
                      <div className="result-contact">
                        <span className="result-phone">📱 {vendor.phone}</span>
                        {vendor.email && (
                          <span className="result-email">📧 {vendor.email}</span>
                        )}
                      </div>
                      <div className="result-business">
                        <span className="result-gst">📄 GST: {vendor.gstType}</span>
                        {vendor.gstin && (
                          <span className="result-gstin">🔢 {vendor.gstin}</span>
                        )}
                      </div>
                      {vendor.billingAddress && (
                        <div className="result-address">
                          📍 {vendor.billingAddress.district}, {vendor.billingAddress.state}
                        </div>
                      )}
                      {vendor.openingBalance && (
                        <div className="result-balance">
                          💰 Balance: {vendor.openingBalance.type} ₹{vendor.openingBalance.amount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {showSearchResults && searchResults.length === 0 && !isSearching && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-text">No vendors found</div>
              <div className="no-results-subtext">Continue filling the form to create a new vendor</div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="vendors-form">
        {/* Basic Details Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>✏️ Basic Details</h3>
          </div>
          <div className="form-grid compact-grid">
            <div className="form-group">
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Vendor Name *"
              />
            </div>
            <div className="form-group phone-group">
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="Mobile Number *"
                className={phoneError ? 'error' : ''}
              />
              <button 
                type="button" 
                className="add-phone-btn"
                onClick={() => setShowAlternatePhone(!showAlternatePhone)}
                title="Add alternate mobile number"
              >
                +
              </button>
              {isCheckingPhone && <div className="checking-status">Checking...</div>}
              {phoneError && <div className="error-message">{phoneError}</div>}
            </div>
            {showAlternatePhone && (
              <div className="form-group">
                <input
                  type="tel"
                  id="alternatePhone"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleInputChange}
                  placeholder="Alternate Mobile Number"
                />
              </div>
            )}
            <div className="form-group">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email Address"
                className={emailError ? 'error' : ''}
              />
              {isCheckingEmail && <div className="checking-status">Checking...</div>}
              {emailError && <div className="error-message">{emailError}</div>}
            </div>
            <div className="form-group">
              <input
                type="url"
                id="webLink"
                name="webLink"
                value={formData.webLink}
                onChange={handleInputChange}
                placeholder="Website Link"
              />
            </div>
          </div>
        </div>

        {/* Company Details Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>🏢 Company Details</h3>
          </div>
          <div className="form-grid compact-grid">
            <div className="form-group">
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="Company Name"
              />
            </div>
            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="copyToVendorName"
                  name="copyToVendorName"
                  checked={formData.copyToVendorName}
                  onChange={handleInputChange}
                />
                <label htmlFor="copyToVendorName">Copy to vendor name?</label>
              </div>
            </div>
            <div className="form-group gst-dropdown">
              <select
                id="gstType"
                name="gstType"
                value={formData.gstType}
                onChange={handleInputChange}
              >
                <option value="unregistered">GST → Unregistered</option>
                <option value="regular">GST → Regular</option>
                <option value="composition">GST → Composition</option>
              </select>
            </div>
            {(formData.gstType === 'regular' || formData.gstType === 'composition') && (
              <div className="form-group gstin-field">
                <input
                  type="text"
                  id="gstin"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleInputChange}
                  placeholder="Enter GSTIN Number *"
                  pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                  required={formData.gstType !== 'unregistered'}
                />
              </div>
            )}
          </div>
        </div>

        {/* Billing Address Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>📍 Billing Address</h3>
          </div>
          <div className="form-grid compact-grid">
            <div className="form-group full-width">
              <input
                type="text"
                id="billingShopAddress"
                name="billingShopAddress"
                value={formData.billingShopAddress}
                onChange={handleInputChange}
                placeholder="Shop Address *"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="billingPincode"
                name="billingPincode"
                value={formData.billingPincode}
                onChange={handleInputChange}
                placeholder="PIN Code *"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="billingVillageColony"
                name="billingVillageColony"
                value={formData.billingVillageColony}
                onChange={handleInputChange}
                placeholder="Village/Colony"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="billingTahsilTaluka"
                name="billingTahsilTaluka"
                value={formData.billingTahsilTaluka}
                onChange={handleInputChange}
                placeholder="Tahsil/Taluka"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="billingDistrict"
                name="billingDistrict"
                value={formData.billingDistrict}
                onChange={handleInputChange}
                placeholder="District"
              />
            </div>
            <div className="form-group">
              <select
                id="billingState"
                name="billingState"
                value={formData.billingState}
                onChange={handleInputChange}
              >
                <option value="">State</option>
                {indianStates.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Shipping Address Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>🚚 Shipping Address</h3>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="sameAsBilling"
                name="sameAsBilling"
                checked={formData.sameAsBilling}
                onChange={handleInputChange}
              />
              <label htmlFor="sameAsBilling">Same as billing address</label>
            </div>
          </div>
          <div className="form-grid compact-grid">
            <div className="form-group full-width">
              <input
                type="text"
                id="shippingAddress"
                name="shippingAddress"
                value={formData.sameAsBilling ? formData.billingShopAddress : formData.shippingAddress}
                onChange={handleInputChange}
                placeholder="Shipping Address"
                readOnly={formData.sameAsBilling}
                style={{ opacity: formData.sameAsBilling ? 0.7 : 1 }}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="shippingPincode"
                name="shippingPincode"
                value={formData.sameAsBilling ? formData.billingPincode : formData.shippingPincode}
                onChange={handleInputChange}
                placeholder="PIN Code"
                readOnly={formData.sameAsBilling}
                style={{ opacity: formData.sameAsBilling ? 0.7 : 1 }}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="shippingVillageColony"
                name="shippingVillageColony"
                value={formData.sameAsBilling ? formData.billingVillageColony : formData.shippingVillageColony}
                onChange={handleInputChange}
                placeholder="Village/Colony"
                readOnly={formData.sameAsBilling}
                style={{ opacity: formData.sameAsBilling ? 0.7 : 1 }}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="shippingTahsilTaluka"
                name="shippingTahsilTaluka"
                value={formData.sameAsBilling ? formData.billingTahsilTaluka : formData.shippingTahsilTaluka}
                onChange={handleInputChange}
                placeholder="Tahsil/Taluka"
                readOnly={formData.sameAsBilling}
                style={{ opacity: formData.sameAsBilling ? 0.7 : 1 }}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="shippingDistrict"
                name="shippingDistrict"
                value={formData.sameAsBilling ? formData.billingDistrict : formData.shippingDistrict}
                onChange={handleInputChange}
                placeholder="District"
                readOnly={formData.sameAsBilling}
                style={{ opacity: formData.sameAsBilling ? 0.7 : 1 }}
              />
            </div>
            <div className="form-group">
              <select
                id="shippingState"
                name="shippingState"
                value={formData.sameAsBilling ? formData.billingState : formData.shippingState}
                onChange={handleInputChange}
                disabled={formData.sameAsBilling}
                style={{ opacity: formData.sameAsBilling ? 0.7 : 1 }}
              >
                <option value="">State</option>
                {indianStates.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Opening Balance Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>💰 Opening Balance</h3>
          </div>
          
          <div className="balance-section">
            <div className="balance-row">
              <div className="form-group balance-type">
                <label>Balance Type</label>
                <select
                  id="openingBalanceType"
                  name="openingBalanceType"
                  value={formData.openingBalanceType}
                  onChange={handleInputChange}
                  className="balance-dropdown"
                >
                  <option value="debit">Debit (Receivable Amount)</option>
                  <option value="credit">Credit (Payable Amount)</option>
                </select>
              </div>
              <div className="form-group balance-amount">
                <label>
                  {formData.openingBalanceType === 'debit' ? 'Receivable Amount' : 'Payable Amount'}
                </label>
                <input
                  type="number"
                  id="openingBalanceAmount"
                  name="openingBalanceAmount"
                  value={formData.openingBalanceAmount}
                  onChange={handleInputChange}
                  placeholder="Amount (₹)"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group min-balance">
                <label>Minimum Balance</label>
                <input
                  type="number"
                  id="minBalance"
                  name="minBalance"
                  value={formData.minBalance}
                  onChange={handleInputChange}
                  placeholder="Min Balance (₹)"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div className="balance-info">
              <div className="balance-display">
                <span className="balance-label">Current Balance:</span>
                <span className={`balance-value ${formData.openingBalanceType === 'debit' ? 'positive' : 'negative'}`}>
                  ₹{formData.openingBalanceType === 'debit' ? '+' : '-'}{formData.openingBalanceAmount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>📝 Notes</h3>
          </div>
          <div className="form-group full-width">
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Enter any additional notes or comments about the vendor"
              rows={3}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Vendor'}
          </button>
        </div>
      </form>

      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification({ show: false, message: '', type: '' })}>
            ×
          </button>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="popup-overlay">
          <div className="popup-content success">
            <div className="popup-header">
              <h3>✅ Success</h3>
            </div>
            <div className="popup-body">
              <p>{successMessage}</p>
            </div>
            <div className="popup-actions">
              <button 
                type="button" 
                onClick={() => setShowSuccessPopup(false)}
                className="btn-primary"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;