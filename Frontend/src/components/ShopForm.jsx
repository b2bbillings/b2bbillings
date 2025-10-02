import React, { useState, useEffect } from 'react';
import apiConfig from '../config/api';

const ShopForm = () => {
  const [formData, setFormData] = useState({
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    shopName: '',
    shopPhone: '',
    alternatePhone: '',
    email: '',
    website: '',
    businessCategory: '',
    businessType: 'retail',
    businessModel: 'both',
    establishedYear: '',
    employeeCount: 1,
    gstNumber: '',
    panNumber: '',
    licenseNumber: '',
    trademarkNumber: '',
    address: {
      street: '',
      landmark: '',
      village: '',
      taluka: '',
      district: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    location: {
      type: 'Point',
      coordinates: [0, 0]
    },
    images: {
      shopFront: '',
      interior: [],
      logo: '',
      products: []
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
      creditFacility: false
    },
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      youtube: '',
      whatsapp: '',
      googleMaps: ''
    },
    delivery: {
      homeDelivery: false,
      deliveryRadius: 0,
      deliveryCharge: 0,
      freeDeliveryAbove: 0
    },
    description: '',
    specialOffers: []
  });

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingShop, setEditingShop] = useState(null);

  const businessCategories = [
    'Computer and IT',
    'Electronics', 
    'Electrical',
    'Automobiles',
    'Textiles',
    'Food & Beverage',
    'Healthcare',
    'Real Estate',
    'Other'
  ];

  const businessTypes = [
    'retail',
    'wholesale', 
    'manufacturing',
    'service',
    'distributor',
    'other'
  ];

  const businessModels = [
    'b2b',
    'b2c',
    'both'
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  // Fetch shops on component mount
  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiConfig.baseURL}/api/shops`);
      const data = await response.json();
      
      if (data.success) {
        setShops(data.data);
      } else {
        console.error('Failed to fetch shops:', data.message);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    if (!formData.ownerPhone.trim()) newErrors.ownerPhone = 'Owner phone is required';
    if (!formData.ownerEmail.trim()) newErrors.ownerEmail = 'Owner email is required';
    if (!formData.shopName.trim()) newErrors.shopName = 'Shop name is required';
    if (!formData.shopPhone.trim()) newErrors.shopPhone = 'Shop phone is required';
    if (!formData.businessCategory) newErrors.businessCategory = 'Business category is required';
    if (!formData.address.street.trim()) newErrors['address.street'] = 'Street address is required';
    if (!formData.address.state.trim()) newErrors['address.state'] = 'State is required';
    if (!formData.address.pincode.trim()) newErrors['address.pincode'] = 'Pincode is required';

    // Email validation
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (formData.ownerEmail && !emailRegex.test(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Please enter a valid email address';
    }
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (formData.ownerPhone && !phoneRegex.test(formData.ownerPhone.replace(/[^0-9]/g, ''))) {
      newErrors.ownerPhone = 'Please enter a valid 10-digit phone number';
    }
    if (formData.shopPhone && !phoneRegex.test(formData.shopPhone.replace(/[^0-9]/g, ''))) {
      newErrors.shopPhone = 'Please enter a valid 10-digit phone number';
    }

    // Pincode validation
    const pincodeRegex = /^[0-9]{6}$/;
    if (formData.address.pincode && !pincodeRegex.test(formData.address.pincode)) {
      newErrors['address.pincode'] = 'Please enter a valid 6-digit pincode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingShop 
        ? `${apiConfig.baseURL}/api/shops/${editingShop._id}`
        : `${apiConfig.baseURL}/api/shops`;
      
      const method = editingShop ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(editingShop ? 'Shop updated successfully!' : 'Shop created successfully!');
        resetForm();
        fetchShops();
        setCurrentStep(1);
      } else {
        setErrors({ submit: data.message || 'Failed to save shop' });
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred while saving the shop' });
      console.error('Error saving shop:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (shop) => {
    setEditingShop(shop);
    setFormData({
      ...shop,
      address: shop.address || {
        street: '', landmark: '', village: '', taluka: '', district: '',
        state: '', country: 'India', pincode: ''
      }
    });
    setCurrentStep(1);
    setSuccessMessage('');
    setErrors({});
  };

  const handleDelete = async (shopId) => {
    if (!window.confirm('Are you sure you want to delete this shop?')) {
      return;
    }

    try {
      const response = await fetch(`${apiConfig.baseURL}/api/shops/${shopId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Shop deleted successfully!');
        fetchShops();
      } else {
        setErrors({ submit: data.message || 'Failed to delete shop' });
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred while deleting the shop' });
      console.error('Error deleting shop:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      ownerName: '', ownerPhone: '', ownerEmail: '', shopName: '', shopPhone: '',
      alternatePhone: '', email: '', website: '', businessCategory: '',
      businessType: 'retail', businessModel: 'both', establishedYear: '',
      employeeCount: 1, gstNumber: '', panNumber: '', licenseNumber: '',
      trademarkNumber: '',
      address: {
        street: '', landmark: '', village: '', taluka: '', district: '',
        state: '', country: 'India', pincode: ''
      },
      location: { type: 'Point', coordinates: [0, 0] },
      images: { shopFront: '', interior: [], logo: '', products: [] },
      operatingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        sunday: { isOpen: false, openTime: '10:00', closeTime: '17:00' }
      },
      services: [], products: [],
      paymentMethods: {
        cash: true, card: false, upi: false, netBanking: false, creditFacility: false
      },
      socialMedia: {
        facebook: '', instagram: '', twitter: '', youtube: '', whatsapp: '', googleMaps: ''
      },
      delivery: {
        homeDelivery: false, deliveryRadius: 0, deliveryCharge: 0, freeDeliveryAbove: 0
      },
      description: '', specialOffers: []
    });
    setEditingShop(null);
    setErrors({});
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {editingShop ? 'Edit Shop' : 'Shop Registration'}
        </h1>
        <p className="text-gray-600">
          {editingShop ? 'Update shop information' : 'Add your business to our directory'}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
          <button 
            onClick={() => setSuccessMessage('')}
            className="float-right text-green-700 hover:text-green-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {errors.submit}
          <button 
            onClick={() => setErrors(prev => ({ ...prev, submit: '' }))}
            className="float-right text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {step}
              </div>
              <div className={`ml-2 text-sm font-medium
                ${currentStep >= step ? 'text-purple-600' : 'text-gray-500'}`}>
                {step === 1 && 'Basic Info'}
                {step === 2 && 'Address'}
                {step === 3 && 'Business Details'}
                {step === 4 && 'Additional Info'}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-4
                  ${currentStep > step ? 'bg-purple-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name *
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors.ownerName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter owner name"
                />
                {errors.ownerName && <p className="mt-1 text-sm text-red-600">{errors.ownerName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Phone *
                </label>
                <input
                  type="tel"
                  name="ownerPhone"
                  value={formData.ownerPhone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors.ownerPhone ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter owner phone number"
                />
                {errors.ownerPhone && <p className="mt-1 text-sm text-red-600">{errors.ownerPhone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Email *
                </label>
                <input
                  type="email"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors.ownerEmail ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter owner email"
                />
                {errors.ownerEmail && <p className="mt-1 text-sm text-red-600">{errors.ownerEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Name *
                </label>
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors.shopName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter shop name"
                />
                {errors.shopName && <p className="mt-1 text-sm text-red-600">{errors.shopName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Phone *
                </label>
                <input
                  type="tel"
                  name="shopPhone"
                  value={formData.shopPhone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors.shopPhone ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter shop phone number"
                />
                {errors.shopPhone && <p className="mt-1 text-sm text-red-600">{errors.shopPhone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter alternate phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter shop email"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter website URL"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Address Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Address Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <textarea
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  rows="3"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors['address.street'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter complete street address"
                />
                {errors['address.street'] && <p className="mt-1 text-sm text-red-600">{errors['address.street']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Landmark
                </label>
                <input
                  type="text"
                  name="address.landmark"
                  value={formData.address.landmark}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter landmark"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Village
                </label>
                <input
                  type="text"
                  name="address.village"
                  value={formData.address.village}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter village"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taluka
                </label>
                <input
                  type="text"
                  name="address.taluka"
                  value={formData.address.taluka}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter taluka"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District
                </label>
                <input
                  type="text"
                  name="address.district"
                  value={formData.address.district}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter district"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors['address.state'] ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select State</option>
                  {indianStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors['address.state'] && <p className="mt-1 text-sm text-red-600">{errors['address.state']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode *
                </label>
                <input
                  type="text"
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors['address.pincode'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter 6-digit pincode"
                />
                {errors['address.pincode'] && <p className="mt-1 text-sm text-red-600">{errors['address.pincode']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter country"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Business Details */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Business Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Category *
                </label>
                <select
                  name="businessCategory"
                  value={formData.businessCategory}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${errors.businessCategory ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Category</option>
                  {businessCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.businessCategory && <p className="mt-1 text-sm text-red-600">{errors.businessCategory}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Model
                </label>
                <select
                  name="businessModel"
                  value={formData.businessModel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {businessModels.map(model => (
                    <option key={model} value={model}>{model.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Established Year
                </label>
                <input
                  type="number"
                  name="establishedYear"
                  value={formData.establishedYear}
                  onChange={handleInputChange}
                  min="1900"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter establishment year"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Count
                </label>
                <input
                  type="number"
                  name="employeeCount"
                  value={formData.employeeCount}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter number of employees"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter GST number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter PAN number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter license number"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  maxLength="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter shop description"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.description.length}/1000 characters
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Additional Information */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Information</h2>
            
            {/* Payment Methods */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Payment Methods</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.keys(formData.paymentMethods).map(method => (
                  <label key={method} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name={`paymentMethods.${method}`}
                      checked={formData.paymentMethods[method]}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {method.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Social Media Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(formData.socialMedia).map(platform => (
                  <div key={platform}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {platform === 'googleMaps' ? 'Google Maps' : platform}
                    </label>
                    <input
                      type="url"
                      name={`socialMedia.${platform}`}
                      value={formData.socialMedia[platform]}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder={`Enter ${platform} URL`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Delivery Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="delivery.homeDelivery"
                    checked={formData.delivery.homeDelivery}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Offer Home Delivery</span>
                </label>

                {formData.delivery.homeDelivery && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Radius (km)
                      </label>
                      <input
                        type="number"
                        name="delivery.deliveryRadius"
                        value={formData.delivery.deliveryRadius}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter delivery radius"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Charge (₹)
                      </label>
                      <input
                        type="number"
                        name="delivery.deliveryCharge"
                        value={formData.delivery.deliveryCharge}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter delivery charge"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Free Delivery Above (₹)
                      </label>
                      <input
                        type="number"
                        name="delivery.freeDeliveryAbove"
                        value={formData.delivery.freeDeliveryAbove}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter minimum amount for free delivery"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-2 rounded-lg font-medium transition-colors
              ${currentStep === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Previous
          </button>

          <div className="flex space-x-4">
            {editingShop && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-lg font-medium transition-colors
                  ${isSubmitting 
                    ? 'bg-purple-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700'} text-white`}
              >
                {isSubmitting ? 'Saving...' : (editingShop ? 'Update Shop' : 'Create Shop')}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Shops List */}
      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Registered Shops</h2>
          <button
            onClick={fetchShops}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">Loading shops...</p>
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No shops registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <div key={shop._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">{shop.shopName}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(shop)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(shop._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Owner:</span> {shop.ownerName}</p>
                  <p><span className="font-medium">Phone:</span> {shop.shopPhone}</p>
                  <p><span className="font-medium">Category:</span> {shop.businessCategory}</p>
                  <p><span className="font-medium">Location:</span> {shop.address?.state}</p>
                  {shop.isVerified && (
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopForm;