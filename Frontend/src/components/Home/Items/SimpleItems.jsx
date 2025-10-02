import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Alert, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faBuilding, faSearch, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { categoryService, subCategoryService } from '../../../services/categoryService';

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
  const [companyPhone, setCompanyPhone] = useState('');
  
  // UI states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // GST options
  const gstOptions = [
    { value: 0, label: '0%' },
    { value: 5, label: '5%' },
    { value: 12, label: '12%' },
    { value: 18, label: '18%' },
    { value: 28, label: '28%' }
  ];

  // Load data from localStorage and fetch categories
  useEffect(() => {
    const savedItems = localStorage.getItem('simpleItems');
    const savedCompanies = localStorage.getItem('simpleCompanies');
    
    if (savedItems) {
      setItems(JSON.parse(savedItems));
    }
    
    if (savedCompanies) {
      setCompanies(JSON.parse(savedCompanies));
    }
    
    // Load categories from backend
    loadCategories();
  }, []);

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

  // Save to localStorage
  const saveItems = (newItems) => {
    setItems(newItems);
    localStorage.setItem('simpleItems', JSON.stringify(newItems));
  };

  const saveCompanies = (newCompanies) => {
    setCompanies(newCompanies);
    localStorage.setItem('simpleCompanies', JSON.stringify(newCompanies));
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
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearch.toLowerCase())
  );

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
    setSelectedCompany(company.id.toString());
    setCompanySearch(company.name);
    setShowCompanyDropdown(false);
    setCompanyHighlightedIndex(-1);
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
  const handleItemSubmit = (e) => {
    e.preventDefault();
    
    if (!itemName.trim() || !selectedCategory || !selectedCompany) {
      setError('Please fill in all required fields');
      return;
    }

    const company = companies.find(c => c.id === parseInt(selectedCompany));
    const category = categories.find(c => c._id === selectedCategory);
    const subcategory = selectedSubcategory ? subcategories.find(s => s._id === selectedSubcategory) : null;
    
    const newItem = {
      id: editingItem ? editingItem.id : Date.now(),
      name: itemName.trim(),
      category: category,
      subcategory: subcategory,
      company: company,
      gstRate: parseFloat(gstRate) || 0,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
    };

    let newItems;
    if (editingItem) {
      newItems = items.map(item => item.id === editingItem.id ? newItem : item);
      setSuccess('Item updated successfully!');
    } else {
      newItems = [...items, newItem];
      setSuccess('Item created successfully!');
    }
    
    saveItems(newItems);
    closeItemModal();
  };

  // Handle company creation
  const handleCompanySubmit = (e) => {
    e.preventDefault();
    
    if (!companyName.trim() || !companyPhone.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!/^[0-9]{10}$/.test(companyPhone.trim())) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    const newCompany = {
      id: Date.now(),
      name: companyName.trim(),
      phone: companyPhone.trim(),
      createdAt: new Date().toISOString()
    };

    const newCompanies = [...companies, newCompany];
    saveCompanies(newCompanies);
    setSelectedCompany(newCompany.id.toString());
    setSuccess('Company created successfully!');
    closeCompanyModal();
  };

  // Handle item deletion
  const handleDeleteItem = (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const newItems = items.filter(item => item.id !== itemId);
      saveItems(newItems);
      setSuccess('Item deleted successfully!');
    }
  };

  // Modal controls
  const openItemModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setItemName(item.name);
      setSelectedCategory(item.category._id);
      setCategorySearch(item.category.name);
      setSelectedSubcategory(item.subcategory?._id || '');
      setSubcategorySearch(item.subcategory?.name || '');
      setSelectedCompany(item.company.id.toString());
      setCompanySearch(item.company.name);
      setGstRate(item.gstRate.toString());
      // Load subcategories for editing
      if (item.category._id) {
        loadSubcategories(item.category._id);
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
    setCompanyPhone('');
    setError('');
    setShowCompanyModal(true);
  };

  const closeCompanyModal = () => {
    setShowCompanyModal(false);
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
              <div>
                <Button 
                  variant="light" 
                  className="me-3 px-4 py-2"
                  onClick={openCompanyModal}
                  style={{ fontWeight: '500', borderRadius: '8px' }}
                >
                  <FontAwesomeIcon icon={faBuilding} className="me-2" />
                  Add Company
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

              {items.length === 0 ? (
                <div className="empty-state">
                  <FontAwesomeIcon icon={faPlus} size="3x" className="text-muted mb-3" />
                  <h5>No items found</h5>
                  <p className="text-muted">
                    {companies.length === 0 
                      ? "Create a company first, then add items to get started."
                      : "Click 'Add Item' to create your first item."
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
                      <th>Company</th>
                      <th>GST Rate</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>{item.name}</td>
                        <td>{item.category?.name}</td>
                        <td>{item.subcategory?.name || '-'}</td>
                        <td>
                          <div>
                            <strong>{item.company?.name}</strong>
                            <br />
                            <small className="text-muted">{item.company?.phone}</small>
                          </div>
                        </td>
                        <td>{item.gstRate}%</td>
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
                            onClick={() => handleDeleteItem(item.id)}
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
                  <div className="position-relative">
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
                </Form.Group>
              </Col>
              
              <Col lg={6} md={12} className="mb-4">
                <Form.Group>
                  <Form.Label className="form-label-professional">Subcategory</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      ref={subcategoryInputRef}
                      type="text"
                      placeholder={!selectedCategory ? "Select category first..." : "Search subcategories..."}
                      value={subcategorySearch}
                      onChange={handleSubcategorySearchChange}
                      onFocus={handleSubcategoryFocus}
                      onKeyDown={handleSubcategoryKeyDown}
                      disabled={!selectedCategory || subcategories.length === 0}
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
                  {!selectedCategory && (
                    <Form.Text className="text-muted">
                      Select a category first to see subcategories
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              
              <Col lg={6} md={12} className="mb-4">
                <Form.Group>
                  <Form.Label className="form-label-professional">Company *</Form.Label>
                  <div className="d-flex gap-3">
                    <div className="flex-grow-1 position-relative">
                      <Form.Control
                        ref={companyInputRef}
                        type="text"
                        placeholder="Search and select company..."
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
                              key={company.id}
                              className={`p-2 category-dropdown-item ${
                                index === companyHighlightedIndex ? 'highlighted' : ''
                              }`}
                              onClick={() => selectCompany(company)}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setCompanyHighlightedIndex(index)}
                            >
                              <div>
                                <strong>{company.name}</strong>
                                <br />
                                <small className="text-muted">{company.phone}</small>
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
                </Form.Group>
              </Col>
              
              <Col lg={12} md={12} className="mb-4">
                <Form.Group>
                  <Form.Label className="form-label-professional">GST Rate</Form.Label>
                  <Form.Select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="professional-dropdown"
                  >
                    <option value="">Select GST Rate</option>
                    {gstOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
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

      {/* Company Modal */}
      <Modal show={showCompanyModal} onHide={closeCompanyModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Company</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCompanySubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form.Group className="mb-3">
              <Form.Label>Company Name *</Form.Label>
              <Form.Control
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                required
                autoFocus
              />
            </Form.Group>
            
            <Form.Group>
              <Form.Label>Phone Number *</Form.Label>
              <Form.Control
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="Enter 10-digit phone number"
                pattern="[0-9]{10}"
                maxLength="10"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeCompanyModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Company
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      </Container>
    </>
  );
};

export default SimpleItems;
