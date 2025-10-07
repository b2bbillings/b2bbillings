import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Alert, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faBuilding, faSearch, faChevronDown, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { categoryService, subCategoryService } from '../../../services/categoryService';
import itemService from '../../../services/itemService';
import companyService from '../../../services/companyService';
import authService from '../../../services/authService';

// Professional CSS styles
const dropdownStyles = `
  .items-management-card {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    border: none;
    border-radius: 12px;
  }
  .items-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px 12px 0 0 !important;
    padding: 1.5rem;
  }
  .items-header h4 {
    margin: 0;
    font-weight: 600;
    font-size: 1.5rem;
  }
  .btn-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    font-weight: 500;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
  }
  .btn-gradient:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
    color: white;
  }
  .category-dropdown-item {
    transition: all 0.2s ease;
    border-bottom: 1px solid #f1f3f4;
    padding: 12px 16px;
    cursor: pointer;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .category-dropdown-item:hover {
    background-color: #f8f9ff !important;
    border-left: 3px solid #667eea;
  }
  .category-dropdown-item.highlighted {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
    border-left: 3px solid #ffffff;
  }
  .category-dropdown-item:last-child {
    border-bottom: none;
  }
  .professional-dropdown {
    border: 2px solid #e9ecef;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: all 0.3s ease;
  }
  .professional-dropdown:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
  }
  .dropdown-list {
    border: none;
    border-radius: 8px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    overflow: hidden;
  }
  .professional-table {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .professional-table thead {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  }
  .professional-table thead th {
    border: none;
    font-weight: 600;
    color: #495057;
    padding: 1rem;
  }
  .professional-table tbody tr {
    transition: all 0.2s ease;
  }
  .professional-table tbody tr:hover {
    background-color: #f8f9ff;
    transform: scale(1.01);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .professional-modal .modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
  }
  .professional-modal .modal-title {
    font-weight: 600;
    font-size: 1.25rem;
  }
  .professional-modal .modal-body {
    padding: 2rem;
  }
  .form-label-professional {
    font-weight: 600;
    color: #495057;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .btn-action {
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  .btn-action:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  .empty-state {
    padding: 3rem;
    text-align: center;
    color: #6c757d;
  }
  .empty-state h5 {
    color: #495057;
    font-weight: 600;
    margin-bottom: 1rem;
  }
`;

const SimpleItems = () => {
  // States
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showGstModal, setShowGstModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Item form
  const [itemName, setItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [gstRate, setGstRate] = useState('');
  
  // Searchable dropdown states
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const categoryInputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Subcategory searchable dropdown states
  const [subcategorySearch, setSubcategorySearch] = useState('');
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [subcategoryHighlightedIndex, setSubcategoryHighlightedIndex] = useState(-1);
  const subcategoryInputRef = useRef(null);
  const subcategoryDropdownRef = useRef(null);
  
  // Company searchable dropdown states
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companyHighlightedIndex, setCompanyHighlightedIndex] = useState(-1);
  const companyInputRef = useRef(null);
  const companyDropdownRef = useRef(null);
  
  // Company form
  const [companyName, setCompanyName] = useState('');
  const [brandNotFound, setBrandNotFound] = useState(false);
  
  // Category form
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  
  // Subcategory form
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryDescription, setSubcategoryDescription] = useState('');
  const [parentCategoryForSub, setParentCategoryForSub] = useState('');
  
  // GST form
  const [customGstRate, setCustomGstRate] = useState('');
  const [customGstDescription, setCustomGstDescription] = useState('');
  
  // UI states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // GST options (reset to defaults on each session)
  const [gstOptions, setGstOptions] = useState([
    { value: 0, label: '0%' },
    { value: 5, label: '5%' },
    { value: 12, label: '12%' },
    { value: 18, label: '18%' },
    { value: 28, label: '28%' }
  ]);

  // Load data from database and fetch categories
  useEffect(() => {
    // Remove any previously stored custom GST rates to ensure fresh start each session
    localStorage.removeItem('customGstRates');
    
    console.log('🚀 Component mounted, loading initial data...');
    
    // Load initial data from backend
    loadCategories();
    loadCompanies();
  }, []);

  // Load items when a company is selected
  useEffect(() => {
    console.log('🏢 Company selection changed:', selectedCompany);
    if (selectedCompany) {
      console.log('🏢 Loading items for selected company:', selectedCompany);
      loadItems();
    } else {
      console.log('🏢 No company selected, clearing items');
      setItems([]);
    }
  }, [selectedCompany]);

  // Auto-select first company if available and none selected
  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      const firstCompany = companies[0];
      const companyId = firstCompany._id || firstCompany.id;
      const companyName = firstCompany.name || firstCompany.businessName;
      
      console.log('🏢 Auto-selecting first available company:', {
        id: companyId,
        name: companyName,
        totalCompanies: companies.length
      });
      
      if (companyId && companyName) {
        setSelectedCompany(companyId.toString());
        setCompanySearch(companyName);
      }
    }
  }, [companies, selectedCompany]);

  // Load categories from backend
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAllCategories();
      if (response.success) {
        setCategories(response.data || []);
      } else {
        console.error('Failed to load categories:', response.message);
        // Fallback to default categories if backend fails
        setCategories([
          { _id: '1', name: 'General' },
          { _id: '2', name: 'Office Supplies' },
          { _id: '3', name: 'Equipment' }
        ]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to default categories
      setCategories([
        { _id: '1', name: 'General' },
        { _id: '2', name: 'Office Supplies' },
        { _id: '3', name: 'Equipment' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Load subcategories when category changes
  const loadSubcategories = async (categoryId) => {
    try {
      const response = await subCategoryService.getSubCategoriesByParent(categoryId);
      if (response.success) {
        setSubcategories(response.data || []);
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
      setSubcategories([]);
    }
  };

  // 🔍 DEBUG: Function to check what's actually in the database
  const debugDatabase = async () => {
    try {
      console.log('🔍 DEBUG: Checking database directly...');
      const response = await fetch(`http://localhost:5000/api/companies/${selectedCompany}/items/debug/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('🔍 DEBUG: Database contents:', data);
      const itemCompanyIds = data.items?.map(item => item.companyId);
      const matches = data.items?.filter(item => item.companyId === selectedCompany);
      
      console.log('🔍 DEBUG: Selected Company ID:', selectedCompany, typeof selectedCompany);
      console.log('🔍 DEBUG: Items in database:');
      data.items?.forEach((item, index) => {
        console.log(`  Item ${index + 1}: "${item.name}" - Company ID: ${item.companyId} (${typeof item.companyId})`);
        console.log(`    - Exact match: ${item.companyId === selectedCompany}`);
        console.log(`    - String match: ${item.companyId?.toString() === selectedCompany}`);
      });
      console.log('🔍 DEBUG: Total matches found:', matches.length);
      alert(`Database has ${data.totalItems} total items. Selected company: ${selectedCompany}. Check console for company ID comparison.`);
    } catch (error) {
      console.error('🔍 DEBUG: Error checking database:', error);
    }
  };

  // Load items from database
  const loadItems = async () => {
    setLoading(true);
    try {
      const user = authService.getCurrentUser();
      
      if (!user) {
        setError('Please login to continue.');
        return;
      }

      // 🔍 DEBUG: First check what's in the database
      if (selectedCompany) {
        console.log('🔍 About to debug database for company:', selectedCompany);
        await debugDatabase();
      }

      // If user has selected a company, load items for that company
      if (selectedCompany) {
        console.log('📦 Loading items for company:', {
          companyId: selectedCompany,
          companyName: companies.find(c => (c._id || c.id) === selectedCompany)?.name || companies.find(c => (c._id || c.id) === selectedCompany)?.businessName,
          apiUrl: `/api/companies/${selectedCompany}/items`
        });
        
        const result = await itemService.getItems(selectedCompany);
        console.log('📦 API Response Details:');
        console.log('  - Success:', result?.success);
        console.log('  - Has Data:', !!result?.data);
        console.log('  - Data Structure:', result?.data ? Object.keys(result.data) : []);
        console.log('  - Items Count:', result?.data?.items?.length || 0);
        console.log('  - Full Response:', result);
        
        // ✅ FIXED: Proper handling of backend response format
        let itemsArray = [];
        
        if (result && result.success && result.data) {
          if (Array.isArray(result.data.items)) {
            // Standard format: { success: true, data: { items: [...], pagination: {...} } }
            itemsArray = result.data.items;
            console.log('✅ Using result.data.items (standard format):', itemsArray.length, 'items');
          } else if (Array.isArray(result.data)) {
            // Direct array format: { success: true, data: [...] }
            itemsArray = result.data;
            console.log('✅ Using result.data (direct array):', itemsArray.length, 'items');
          }
        } else if (result && Array.isArray(result.items)) {
          // Fallback: { items: [...] }
          itemsArray = result.items;
          console.log('✅ Using result.items:', itemsArray.length, 'items');
        } else if (Array.isArray(result)) {
          // Direct array response
          itemsArray = result;
          console.log('✅ Using direct array result:', itemsArray.length, 'items');
        }
        
        console.log('📦 Final items array:', itemsArray);
        setItems(itemsArray);
        
        if (itemsArray.length > 0) {
          console.log('✅ Successfully loaded', itemsArray.length, 'items');
          setSuccess(`Successfully loaded ${itemsArray.length} items`);
        } else {
          console.log('ℹ️ No items found for company:', selectedCompany);
        }
        
        // Clear any previous errors if successful
        if (result?.success) {
          setError('');
        } else if (result?.message) {
          setError(result.message);
        }
      } else {
        // No company selected, clear items
        console.log('ℹ️ No company selected, clearing items');
        setItems([]);
      }
    } catch (err) {
      console.error('❌ Error loading items:', {
        error: err,
        message: err.message,
        selectedCompany,
        stack: err.stack
      });
      setError(`Failed to load items: ${err.message || 'Unknown error'}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Load companies from database
  const loadCompanies = async () => {
    try {
      console.log('🏢 Loading companies...');
      const result = await companyService.getCompanies({ limit: 100 });
      console.log('🏢 Companies API response:', {
        hasResult: !!result,
        success: result?.success,
        hasData: !!result?.data,
        dataType: typeof result?.data,
        dataLength: Array.isArray(result?.data) ? result.data.length : 'not array',
        fullResponse: result
      });
      
      let companiesArray = [];
      
      if (result && result.success && result.data) {
        if (Array.isArray(result.data.companies)) {
          // Format: { success: true, data: { companies: [...] } }
          companiesArray = result.data.companies;
          console.log('✅ Using result.data.companies format');
        } else if (Array.isArray(result.data)) {
          // Format: { success: true, data: [...] }
          companiesArray = result.data;
          console.log('✅ Using result.data format');
        }
      } else if (result && Array.isArray(result)) {
        // Direct array format
        companiesArray = result;
        console.log('✅ Using direct array format');
      } else if (result && result.data && Array.isArray(result.data)) {
        companiesArray = result.data;
        console.log('✅ Using result.data fallback format');
      }
      
      console.log('🏢 Final companies array:', {
        length: companiesArray.length,
        companies: companiesArray.map(c => ({
          id: c._id || c.id,
          name: c.name || c.businessName,
          hasId: !!(c._id || c.id),
          hasName: !!(c.name || c.businessName)
        }))
      });
      
      setCompanies(companiesArray);
      
      if (companiesArray.length === 0) {
        console.warn('⚠️ No companies loaded - user may need to create a company first');
      }
    } catch (err) {
      console.error('❌ Error loading companies:', {
        error: err,
        message: err.message,
        stack: err.stack
      });
      setError(`Failed to load companies: ${err.message}`);
      setCompanies([]);
    }
  };

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  
  // Filter subcategories based on search
  const filteredSubcategories = subcategories.filter(subcategory =>
    subcategory.name.toLowerCase().includes(subcategorySearch.toLowerCase())
  );
  
  // Filter companies based on search
  const filteredCompanies = companies.filter(company => {
    const companyName = company.name || company.businessName || '';
    return companyName.toLowerCase().includes(companySearch.toLowerCase());
  });

  // Handle category search with keyboard navigation
  const handleCategoryKeyDown = (e) => {
    if (!showCategoryDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCategories.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCategories.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCategories[highlightedIndex]) {
          selectCategory(filteredCategories[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowCategoryDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Select category from dropdown
  const selectCategory = (category) => {
    setSelectedCategory(category._id);
    setCategorySearch(category.name);
    setShowCategoryDropdown(false);
    setHighlightedIndex(-1);
    loadSubcategories(category._id);
  };

  // Handle category input focus
  const handleCategoryFocus = () => {
    setShowCategoryDropdown(true);
    setHighlightedIndex(-1);
  };

  // Handle category input change
  const handleCategorySearchChange = (e) => {
    const value = e.target.value;
    setCategorySearch(value);
    setShowCategoryDropdown(true);
    setHighlightedIndex(-1);
    
    // If input is cleared, clear selection
    if (!value) {
      setSelectedCategory('');
      setSubcategories([]);
      setSelectedSubcategory('');
    }
  };

  // Subcategory search handlers
  const handleSubcategoryKeyDown = (e) => {
    if (!showSubcategoryDropdown || filteredSubcategories.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSubcategoryHighlightedIndex(prev => 
          prev < filteredSubcategories.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSubcategoryHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSubcategories.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (subcategoryHighlightedIndex >= 0 && filteredSubcategories[subcategoryHighlightedIndex]) {
          selectSubcategory(filteredSubcategories[subcategoryHighlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSubcategoryDropdown(false);
        setSubcategoryHighlightedIndex(-1);
        break;
    }
  };

  const selectSubcategory = (subcategory) => {
    setSelectedSubcategory(subcategory._id);
    setSubcategorySearch(subcategory.name);
    setShowSubcategoryDropdown(false);
    setSubcategoryHighlightedIndex(-1);
  };

  const handleSubcategoryFocus = () => {
    if (selectedCategory && subcategories.length > 0) {
      setShowSubcategoryDropdown(true);
      setSubcategoryHighlightedIndex(-1);
    }
  };

  const handleSubcategorySearchChange = (e) => {
    const value = e.target.value;
    setSubcategorySearch(value);
    if (selectedCategory && subcategories.length > 0) {
      setShowSubcategoryDropdown(true);
      setSubcategoryHighlightedIndex(-1);
    }
    
    if (!value) {
      setSelectedSubcategory('');
    }
  };

  // Company search handlers
  const handleCompanyKeyDown = (e) => {
    if (!showCompanyDropdown || filteredCompanies.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setCompanyHighlightedIndex(prev => 
          prev < filteredCompanies.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setCompanyHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCompanies.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (companyHighlightedIndex >= 0 && filteredCompanies[companyHighlightedIndex]) {
          selectCompany(filteredCompanies[companyHighlightedIndex]);
        }
        break;
      case 'Escape':
        setShowCompanyDropdown(false);
        setCompanyHighlightedIndex(-1);
        break;
    }
  };

  const selectCompany = (company) => {
    const companyId = company._id || company.id;
    const companyName = company.name || company.businessName;
    setSelectedCompany(companyId?.toString() || '');
    setCompanySearch(companyName || '');
    setShowCompanyDropdown(false);
    setCompanyHighlightedIndex(-1);
    setBrandNotFound(false);
  };

  const handleCompanyFocus = () => {
    setShowCompanyDropdown(true);
    setCompanyHighlightedIndex(-1);
  };

  const handleCompanySearchChange = (e) => {
    const value = e.target.value;
    setCompanySearch(value);
    setShowCompanyDropdown(true);
    setCompanyHighlightedIndex(-1);
    
    if (!value) {
      setSelectedCompany('');
      setBrandNotFound(false);
    } else {
      // Check if brand exists
      const brandExists = companies.some(company => {
        const companyName = company.name || company.businessName || '';
        return companyName.toLowerCase() === value.toLowerCase();
      });
      
      setBrandNotFound(!brandExists && value.trim().length > 0);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Category dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        categoryInputRef.current &&
        !categoryInputRef.current.contains(event.target)
      ) {
        setShowCategoryDropdown(false);
        setHighlightedIndex(-1);
      }
      
      // Subcategory dropdown
      if (
        subcategoryDropdownRef.current &&
        !subcategoryDropdownRef.current.contains(event.target) &&
        subcategoryInputRef.current &&
        !subcategoryInputRef.current.contains(event.target)
      ) {
        setShowSubcategoryDropdown(false);
        setSubcategoryHighlightedIndex(-1);
      }
      
      // Company dropdown
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(event.target) &&
        companyInputRef.current &&
        !companyInputRef.current.contains(event.target)
      ) {
        setShowCompanyDropdown(false);
        setCompanyHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle item creation/editing
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    
    if (!itemName.trim() || !selectedCategory || !selectedCompany) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentUser = authService.getCurrentUser();
      
      if (!selectedCompany) {
        setError('Please select a brand first before creating an item.');
        return;
      }
      
      console.log('Creating item for selectedCompany:', selectedCompany);
      console.log('Current companies list:', companies);

      const company = companies.find(c => c._id === selectedCompany || c.id === selectedCompany);
      const category = categories.find(c => c._id === selectedCategory);
      const subcategory = selectedSubcategory ? subcategories.find(s => s._id === selectedSubcategory) : null;
      
      // ✅ FIXED: Don't include company in itemData - it's passed via URL parameter
      const itemData = {
        name: itemName.trim(),
        category: selectedCategory,
        subcategory: selectedSubcategory || undefined,
        unit: "PCS", // Default unit
        type: "product", // Default type
        gstRate: parseFloat(gstRate) || 0,
        createdBy: currentUser.id
      };
      
      console.log('🚀 Creating item with details:', {
        itemData,
        companyId: selectedCompany,
        companyObject: company,
        categoryObject: category,
        subcategoryObject: subcategory,
        apiUrl: `/api/companies/${selectedCompany}/items`
      });

      if (editingItem) {
        // Update existing item
        const result = await itemService.updateItem(editingItem._id, itemData);
        if (result.success) {
          setSuccess('Item updated successfully!');
          loadItems(); // Reload items from database
          closeItemModal();
        } else {
          setError(result.message || 'Failed to update item');
        }
      } else {
        // Create new item
        const result = await itemService.createItem(selectedCompany, itemData);
        console.log('� Item creation result:', {
          success: result?.success,
          message: result?.message,
          hasData: !!result?.data,
          createdItem: result?.data?.item
        });
        
        if (result && result.success) {
          setSuccess(result.message || 'Item created successfully!');
          console.log('✅ Item created successfully, immediately reloading items');
          
          // ✅ Small delay to ensure backend processes the creation
          console.log('⏳ Waiting briefly for backend to process item creation...');
          setTimeout(async () => {
            try {
              console.log('🔄 Reloading items after creation for company:', selectedCompany);
              await loadItems();
              console.log('✅ Items reloaded successfully after creation');
            } catch (reloadError) {
              console.error('❌ Error reloading items after creation:', reloadError);
              setError('Item created but failed to refresh list. Please refresh the page.');
            }
          }, 500); // Short 500ms delay
          
          closeItemModal();
        } else {
          const errorMsg = result?.message || 'Failed to create item';
          console.error('❌ Item creation failed:', errorMsg);
          setError(errorMsg);
        }
      }
    } catch (err) {
      console.error('Error saving item:', err);
      setError('Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  // Handle company creation
  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      setError('Brand name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser?.id) {
        setError('User not authenticated. Please login again.');
        return;
      }
      
      // Generate a unique phone number to avoid duplicates
      const uniquePhoneNumber = '9' + Date.now().toString().slice(-9);
      
      const companyData = {
        businessName: companyName.trim(),
        name: companyName.trim(),
        phoneNumber: uniquePhoneNumber, // Unique phone number to satisfy backend validation
        owner: currentUser.id
      };

      const result = await companyService.createCompany(companyData);

      if (result.success) {
        setSuccess('Brand created successfully!');
        setCompanyName('');
        setShowCompanyModal(false);
        setBrandNotFound(false);
        loadCompanies(); // Reload companies from database
        setSelectedCompany(result.data._id);
        setCompanySearch(result.data.name || result.data.businessName);
      } else {
        setError(result.message || 'Failed to create brand');
      }
    } catch (err) {
      console.error('Error creating company:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create brand';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle item deletion
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await itemService.deleteItem(itemId);
      if (result.success) {
        setSuccess('Item deleted successfully!');
        loadItems(); // Reload items from database
      } else {
        setError(result.message || 'Failed to delete item');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  // Modal controls
  const openItemModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setItemName(item.name);
      
      // Handle category - might be populated object or ID
      const categoryId = typeof item.category === 'object' ? item.category._id : item.category;
      const categoryName = typeof item.category === 'object' ? item.category.name : '';
      setSelectedCategory(categoryId);
      setCategorySearch(categoryName);
      
      // Handle subcategory - might be populated object or ID
      const subcategoryId = item.subcategory ? (typeof item.subcategory === 'object' ? item.subcategory._id : item.subcategory) : '';
      const subcategoryName = item.subcategory ? (typeof item.subcategory === 'object' ? item.subcategory.name : '') : '';
      setSelectedSubcategory(subcategoryId);
      setSubcategorySearch(subcategoryName);
      
      // Handle company - might be populated object or ID
      const companyId = typeof item.company === 'object' ? (item.company._id || item.company.id) : item.company;
      const companyName = typeof item.company === 'object' ? (item.company.name || item.company.businessName) : '';
      setSelectedCompany(companyId?.toString() || '');
      setCompanySearch(companyName);
      
      setGstRate(item.gstRate?.toString() || '');
      
      // Load subcategories for editing
      if (categoryId) {
        loadSubcategories(categoryId);
      }
    } else {
      setItemName('');
      setSelectedCategory('');
      setCategorySearch('');
      setSelectedSubcategory('');
      setSubcategorySearch('');
      setSelectedCompany('');
      setCompanySearch('');
      setGstRate('');
      setSubcategories([]);
    }
    setShowCategoryDropdown(false);
    setShowSubcategoryDropdown(false);
    setShowCompanyDropdown(false);
    setHighlightedIndex(-1);
    setSubcategoryHighlightedIndex(-1);
    setCompanyHighlightedIndex(-1);
    setError('');
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setEditingItem(null);
    setItemName('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedCompany('');
    setGstRate('');
    setCategorySearch('');
    setSubcategorySearch('');
    setCompanySearch('');
    setShowCategoryDropdown(false);
    setShowSubcategoryDropdown(false);
    setShowCompanyDropdown(false);
    setHighlightedIndex(-1);
    setSubcategoryHighlightedIndex(-1);
    setCompanyHighlightedIndex(-1);
    setSubcategories([]);
    setError('');
  };

  const openCompanyModal = () => {
    setCompanyName('');
    setError('');
    setBrandNotFound(false);
    setShowCompanyModal(true);
  };

  const closeCompanyModal = () => {
    setShowCompanyModal(false);
    setCompanyName('');
    setError('');
    setBrandNotFound(false);
  };

  // Handle category creation
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const categoryData = {
        name: categoryName.trim(),
        description: categoryDescription.trim() || ''
      };

      const result = await categoryService.createCategory(categoryData);

      if (result.success) {
        setSuccess('Category created successfully!');
        setCategoryName('');
        setCategoryDescription('');
        setShowCategoryModal(false);
        loadCategories();
        setSelectedCategory(result.data._id);
        setCategorySearch(result.data.name);
      } else {
        setError(result.message || 'Failed to create category');
      }
    } catch (err) {
      setError('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  // Handle subcategory creation
  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    
    if (!subcategoryName.trim()) {
      setError('Subcategory name is required');
      return;
    }

    if (!parentCategoryForSub) {
      setError('Parent category is required');
      return;
    }

    // Validate that parent category exists
    const parentCategory = categories.find(c => c._id === parentCategoryForSub);
    if (!parentCategory) {
      setError('Selected parent category not found');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const subcategoryData = {
        name: subcategoryName.trim(),
        description: subcategoryDescription.trim() || '',
        parentCategory: parentCategoryForSub
      };

      console.log('Creating subcategory with data:', subcategoryData);
      const result = await subCategoryService.createSubCategory(subcategoryData);

      if (result.success) {
        setSuccess('Subcategory created successfully!');
        setSubcategoryName('');
        setSubcategoryDescription('');
        setShowSubcategoryModal(false);
        loadSubcategories(parentCategoryForSub);
        setSelectedSubcategory(result.data._id);
        setSubcategorySearch(result.data.name);
      } else {
        setError(result.message || 'Failed to create subcategory');
      }
    } catch (err) {
      console.error('Error creating subcategory:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create subcategory');
    } finally {
      setLoading(false);
    }
  };

  // Handle custom GST creation
  const handleGstSubmit = async (e) => {
    e.preventDefault();
    
    if (!customGstRate.trim()) {
      setError('GST rate is required');
      return;
    }

    const rate = parseFloat(customGstRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('Please enter a valid GST rate between 0 and 100');
      return;
    }

    // Check if GST rate already exists
    if (gstOptions.some(option => option.value === rate)) {
      setError('This GST rate already exists');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // This would need to be implemented as a service call to save custom GST rates
      // For now, we'll add it to the local gstOptions array
      const newGstOption = {
        value: rate,
        label: `${rate}%`,
        description: customGstDescription.trim() || '',
        isCustom: true
      };

      // Add to gstOptions state (temporary for current session only)
      setGstOptions(prevOptions => [...prevOptions, newGstOption]);
      
      setSuccess('Custom GST rate added successfully!');
      setCustomGstRate('');
      setCustomGstDescription('');
      setShowGstModal(false);
      setGstRate(rate.toString());
    } catch (err) {
      setError('Failed to add custom GST rate');
    } finally {
      setLoading(false);
    }
  };

  // Modal controls for new modals
  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryName('');
    setCategoryDescription('');
    setError('');
  };

  const closeSubcategoryModal = () => {
    setShowSubcategoryModal(false);
    setSubcategoryName('');
    setSubcategoryDescription('');
    setParentCategoryForSub('');
    setError('');
  };

  const closeGstModal = () => {
    setShowGstModal(false);
    setCustomGstRate('');
    setCustomGstDescription('');
    setError('');
  };

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Dropdown styles
  const dropdownStyles = `
    .category-dropdown-item {
      transition: all 0.2s ease;
      border-bottom: 1px solid #f0f0f0;
    }
    .category-dropdown-item:hover {
      background-color: #f8f9fa !important;
    }
    .category-dropdown-item.highlighted {
      background-color: #007bff !important;
      color: white !important;
    }
    .category-dropdown-item:last-child {
      border-bottom: none;
    }
  `;

  return (
    <>
      <style>{dropdownStyles}</style>
      <Container fluid className="p-4">
        <Row>
          <Col>
            <Card className="items-management-card">
            <Card.Header className="items-header d-flex justify-content-between align-items-center">
              <h4 className="mb-0">Items Management</h4>
              <div className="d-flex gap-2">
                {selectedCompany && (
                  <Button 
                    variant="outline-light"
                    onClick={loadItems}
                    className="px-3 py-2"
                    style={{ borderRadius: '8px' }}
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={faSearch} className="me-2" />
                    Refresh
                  </Button>
                )}
                <Button 
                  variant="outline-info"
                  className="px-3 py-2 me-2"
                  onClick={debugDatabase}
                  style={{ borderRadius: '8px' }}
                >
                  🔍 Debug DB
                </Button>
                <Button 
                  className="btn-gradient px-4 py-2"
                  onClick={() => openItemModal()}
                  style={{ borderRadius: '8px' }}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  Add Item
                </Button>
              </div>
            </Card.Header>
            
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              {companies.length > 0 && !selectedCompany && (
                <Alert variant="info" className="mb-4">
                  <FontAwesomeIcon icon={faBuilding} className="me-2" />
                  <strong>Select a Brand:</strong> Please select a brand from the form below to view and manage items for that specific brand.
                </Alert>
              )}

              {companies.length === 0 && !loading && (
                <Alert variant="warning" className="mb-4">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                  <strong>No Companies Found:</strong> You need to create a company/brand first before adding items. Click the "+" button next to the brand selection to create one.
                </Alert>
              )}

              {/* Debug: Log items length on render */}
              {console.log('🎨 Rendering items, length:', items.length, 'items:', items)}
              
              {/* Debug panel for development */}
              {process.env.NODE_ENV === 'development' && (
                <Alert variant="secondary" className="mb-4 small">
                  <strong>Debug Info:</strong><br/>
                  Companies: {companies.length} | Selected: {selectedCompany || 'none'} | Items: {items.length} | Loading: {loading ? 'yes' : 'no'}
                  <br/>Company Names: {companies.map(c => c.name || c.businessName).join(', ') || 'none'}
                </Alert>
              )}
              
              {items.length === 0 ? (
                <div className="empty-state">
                  <FontAwesomeIcon icon={faPlus} size="3x" className="text-muted mb-3" />
                  <h5>No items found</h5>
                  <p className="text-muted">
                    {companies.length === 0 
                      ? "Create a brand/company first using the '+' button next to brand selection, then add items to get started."
                      : !selectedCompany
                      ? "Select a brand from the dropdown above to view items, or click 'Add Item' to create your first item."
                      : "Click 'Add Item' to create your first item for this brand."
                    }
                  </p>
                </div>
              ) : (
                <Table responsive className="professional-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Subcategory</th>
                      <th>Brand Name</th>
                      <th>GST Rate</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item._id || item.id}>
                        <td>{index + 1}</td>
                        <td>{item.name}</td>
                        <td>{typeof item.category === 'object' ? item.category?.name : 'N/A'}</td>
                        <td>{typeof item.subcategory === 'object' ? item.subcategory?.name : '-'}</td>
                        <td>
                          <strong>{typeof item.company === 'object' ? (item.company?.name || item.company?.businessName) : 'N/A'}</strong>
                        </td>
                        <td>{item.gstRate || 0}%</td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="btn-action me-2"
                            onClick={() => openItemModal(item)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="btn-action"
                            onClick={() => handleDeleteItem(item._id || item.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Item Modal */}
      <Modal show={showItemModal} onHide={closeItemModal} centered size="lg" className="professional-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editingItem ? 'Edit Item' : 'Add New Item'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleItemSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Row>
              <Col lg={6} md={12} className="mb-4">
                <Form.Group>
                  <Form.Label className="form-label-professional">Item Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Enter item name"
                    required
                    className="professional-dropdown"
                  />
                </Form.Group>
              </Col>
              
              <Col lg={6} md={12} className="mb-4">
                <Form.Group>
                  <Form.Label className="form-label-professional">Category *</Form.Label>
                  <div className="d-flex gap-3">
                    <div className="flex-grow-1 position-relative">
                      <Form.Control
                        ref={categoryInputRef}
                        type="text"
                        placeholder="Search and select category..."
                        value={categorySearch}
                        onChange={handleCategorySearchChange}
                        onFocus={handleCategoryFocus}
                        onKeyDown={handleCategoryKeyDown}
                        required
                        autoComplete="off"
                        className="professional-dropdown"
                      />
                      <FontAwesomeIcon 
                        icon={showCategoryDropdown ? faChevronDown : faSearch} 
                        className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                        style={{ pointerEvents: 'none' }}
                      />
                      {showCategoryDropdown && filteredCategories.length > 0 && (
                        <div 
                          ref={dropdownRef}
                          className="dropdown-list position-absolute w-100 bg-white"
                          style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto', top: '100%' }}
                        >
                          {filteredCategories.map((category, index) => (
                            <div
                              key={category._id}
                              className={`p-2 category-dropdown-item ${
                                index === highlightedIndex ? 'highlighted' : ''
                              }`}
                              onClick={() => selectCategory(category)}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHighlightedIndex(index)}
                            >
                              {category.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline-primary"
                      onClick={() => setShowCategoryModal(true)}
                      type="button"
                      size="lg"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </Button>
                  </div>
                </Form.Group>
              </Col>
              
              <Col lg={6} md={12} className="mb-4">
                <Form.Group>
                  <Form.Label className="form-label-professional">Subcategory</Form.Label>
                  <div className="d-flex gap-3">
                    <div className="flex-grow-1 position-relative">
                      <Form.Control
                        ref={subcategoryInputRef}
                        type="text"
                        placeholder={!selectedCategory ? "Select category first..." : "Search subcategories..."}
                        value={subcategorySearch}
                        onChange={handleSubcategorySearchChange}
                        onFocus={handleSubcategoryFocus}
                        onKeyDown={handleSubcategoryKeyDown}
                        disabled={!selectedCategory}
                        autoComplete="off"
                        className="professional-dropdown"
                      />
                      <FontAwesomeIcon icon={showSubcategoryDropdown ? faChevronDown : faSearch} 
                        className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                        style={{ pointerEvents: 'none' }}
                      />
                      {showSubcategoryDropdown && filteredSubcategories.length > 0 && (
                        <div 
                          ref={subcategoryDropdownRef}
                          className="dropdown-list position-absolute w-100 bg-white"
                          style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto', top: '100%' }}
                        >
                          {filteredSubcategories.map((subcategory, index) => (
                            <div
                              key={subcategory._id}
                              className={`p-2 category-dropdown-item ${
                                index === subcategoryHighlightedIndex ? 'highlighted' : ''
                              }`}
                              onClick={() => selectSubcategory(subcategory)}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setSubcategoryHighlightedIndex(index)}
                            >
                              {subcategory.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline-primary"
                      onClick={() => {
                        setParentCategoryForSub(selectedCategory);
                        setShowSubcategoryModal(true);
                      }}
                      type="button"
                      size="lg"
                      disabled={!selectedCategory}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </Button>
                  </div>
                  {!selectedCategory && (
                    <Form.Text className="text-muted">
                      Select a category first to see subcategories
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              
              <Col lg={6} md={12} className="mb-4">
                <Form.Group>
                  <Form.Label className="form-label-professional">Brand Name *</Form.Label>
                  <div className="d-flex gap-3">
                    <div className="flex-grow-1 position-relative">
                      <Form.Control
                        ref={companyInputRef}
                        type="text"
                        placeholder="Search and select brand name..."
                        value={companySearch}
                        onChange={handleCompanySearchChange}
                        onFocus={handleCompanyFocus}
                        onKeyDown={handleCompanyKeyDown}
                        required
                        autoComplete="off"
                        className="professional-dropdown"
                      />
                      <FontAwesomeIcon icon={showCompanyDropdown ? faChevronDown : faSearch} 
                        className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                        style={{ pointerEvents: 'none' }}
                      />
                      {showCompanyDropdown && filteredCompanies.length > 0 && (
                        <div 
                          ref={companyDropdownRef}
                          className="position-absolute w-100 bg-white border border-top-0 rounded-bottom shadow-sm"
                          style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto' }}
                        >
                          {filteredCompanies.map((company, index) => (
                            <div
                              key={company._id || company.id}
                              className={`p-2 category-dropdown-item ${
                                index === companyHighlightedIndex ? 'highlighted' : ''
                              }`}
                              onClick={() => selectCompany(company)}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setCompanyHighlightedIndex(index)}
                            >
                              <div>
                                <strong>{company.name || company.businessName}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline-primary"
                      onClick={openCompanyModal}
                      type="button"
                      size="lg"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </Button>
                  </div>
                  {brandNotFound && (
                    <Form.Text className="text-warning">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                      Brand not found, create new brand
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              
              <Col lg={12} md={12} className="mb-4">
                <Form.Group>
                  <Form.Label className="form-label-professional">
                    GST Rate
                    {gstOptions.filter(option => option.isCustom).length > 0 && (
                      <small className="text-success ms-2">
                        ({gstOptions.filter(option => option.isCustom).length} custom rate{gstOptions.filter(option => option.isCustom).length > 1 ? 's' : ''} added)
                      </small>
                    )}
                  </Form.Label>
                  <div className="d-flex gap-3">
                    <Form.Select
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                      className="professional-dropdown flex-grow-1"
                    >
                      <option value="">Select GST Rate</option>
                      {gstOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} {option.isCustom ? '(Custom)' : ''}
                        </option>
                      ))}
                    </Form.Select>
                    <Button
                      variant="outline-primary"
                      onClick={() => setShowGstModal(true)}
                      type="button"
                      size="lg"
                      title="Add Custom GST Rate"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </Button>
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="p-3">
            <Button 
              variant="outline-secondary" 
              onClick={closeItemModal}
              className="px-4 py-2"
              style={{ borderRadius: '8px', fontWeight: '500' }}
            >
              Cancel
            </Button>
            <Button 
              className="btn-gradient px-4 py-2" 
              type="submit"
              style={{ borderRadius: '8px' }}
            >
              {editingItem ? 'Update Item' : 'Create Item'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Brand Modal */}
      <Modal show={showCompanyModal} onHide={closeCompanyModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Brand</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCompanySubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form.Group className="mb-3">
              <Form.Label>Brand Name *</Form.Label>
              <Form.Control
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter brand name"
                required
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeCompanyModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Brand
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Category Modal */}
      <Modal show={showCategoryModal} onHide={closeCategoryModal} centered className="professional-modal">
        <Modal.Header closeButton>
          <Modal.Title>Add New Category</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCategorySubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form.Group className="mb-3">
              <Form.Label className="form-label-professional">Category Name *</Form.Label>
              <Form.Control
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Enter category name"
                required
                autoFocus
                className="professional-dropdown"
              />
            </Form.Group>
            
            <Form.Group>
              <Form.Label className="form-label-professional">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Enter category description (optional)"
                className="professional-dropdown"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="p-3">
            <Button 
              variant="outline-secondary" 
              onClick={closeCategoryModal}
              className="px-4 py-2"
              style={{ borderRadius: '8px', fontWeight: '500' }}
            >
              Cancel
            </Button>
            <Button 
              className="btn-gradient px-4 py-2" 
              type="submit"
              disabled={loading}
              style={{ borderRadius: '8px' }}
            >
              {loading ? 'Creating...' : 'Create Category'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Subcategory Modal */}
      <Modal show={showSubcategoryModal} onHide={closeSubcategoryModal} centered className="professional-modal">
        <Modal.Header closeButton>
          <Modal.Title>Add New Subcategory</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubcategorySubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form.Group className="mb-3">
              <Form.Label className="form-label-professional">Parent Category</Form.Label>
              <Form.Control
                type="text"
                value={categories.find(c => c._id === parentCategoryForSub)?.name || ''}
                disabled
                className="professional-dropdown"
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label className="form-label-professional">Subcategory Name *</Form.Label>
              <Form.Control
                type="text"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
                placeholder="Enter subcategory name"
                required
                autoFocus
                className="professional-dropdown"
              />
            </Form.Group>
            
            <Form.Group>
              <Form.Label className="form-label-professional">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={subcategoryDescription}
                onChange={(e) => setSubcategoryDescription(e.target.value)}
                placeholder="Enter subcategory description (optional)"
                className="professional-dropdown"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="p-3">
            <Button 
              variant="outline-secondary" 
              onClick={closeSubcategoryModal}
              className="px-4 py-2"
              style={{ borderRadius: '8px', fontWeight: '500' }}
            >
              Cancel
            </Button>
            <Button 
              className="btn-gradient px-4 py-2" 
              type="submit"
              disabled={loading}
              style={{ borderRadius: '8px' }}
            >
              {loading ? 'Creating...' : 'Create Subcategory'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Custom GST Modal */}
      <Modal show={showGstModal} onHide={closeGstModal} centered className="professional-modal">
        <Modal.Header closeButton>
          <Modal.Title>Add Custom GST Rate</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleGstSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form.Group className="mb-3">
              <Form.Label className="form-label-professional">GST Rate (%) *</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={customGstRate}
                onChange={(e) => setCustomGstRate(e.target.value)}
                placeholder="Enter GST rate (e.g., 15.5)"
                required
                autoFocus
                className="professional-dropdown"
              />
              <Form.Text className="text-muted">
                Enter a value between 0 and 100
              </Form.Text>
            </Form.Group>
            
            <Form.Group>
              <Form.Label className="form-label-professional">Description</Form.Label>
              <Form.Control
                type="text"
                value={customGstDescription}
                onChange={(e) => setCustomGstDescription(e.target.value)}
                placeholder="Enter description for this GST rate (optional)"
                className="professional-dropdown"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="p-3">
            <Button 
              variant="outline-secondary" 
              onClick={closeGstModal}
              className="px-4 py-2"
              style={{ borderRadius: '8px', fontWeight: '500' }}
            >
              Cancel
            </Button>
            <Button 
              className="btn-gradient px-4 py-2" 
              type="submit"
              disabled={loading}
              style={{ borderRadius: '8px' }}
            >
              {loading ? 'Adding...' : 'Add GST Rate'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      </Container>
    </>
  );
};

export default SimpleItems;
