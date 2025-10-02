import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Alert,
  Form,
  Modal,
  InputGroup,
  ListGroup,
  Dropdown,
  ButtonGroup,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrash,
  faFolder,
  faFolderOpen,
  faTag,
  faTags,
  faSearch,
  faFilter,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faKeyboard,
  faArrowRight,
  faArrowLeft,
  faList,
  faSave,
  faTimes,
  faChevronDown,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { categoryService, subCategoryService } from '../../../services/categoryService';
import authService from '../../../services/authService';
import './Category.css';

const Category = () => {
  // State management
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'list'

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [subCategoryName, setSubCategoryName] = useState('');
  const [subCategoryDescription, setSubCategoryDescription] = useState('');
  const [modalCategoryId, setModalCategoryId] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);

  // Search states for dropdowns
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [subCategorySearchTerm, setSubCategorySearchTerm] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  const [filteredCategoriesDropdown, setFilteredCategoriesDropdown] = useState([]);
  const [filteredSubCategoriesDropdown, setFilteredSubCategoriesDropdown] = useState([]);

  // List view states
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [categorySubcategories, setCategorySubcategories] = useState({});
  
  // Save functionality states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedData, setSavedData] = useState(null);

  // Dropdown positioning states
  const [categoryDropdownPosition, setCategoryDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [subCategoryDropdownPosition, setSubCategoryDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Keyboard navigation states
  const [categorySelectedIndex, setCategorySelectedIndex] = useState(-1);
  const [subCategorySelectedIndex, setSubCategorySelectedIndex] = useState(-1);
  const [subCategorySearchTerms, setSubCategorySearchTerms] = useState({});

  // ESC key handling
  const [escPressCount, setEscPressCount] = useState(0);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const escTimeoutRef = useRef(null);

  // Refs for form inputs
  const categorySelectRef = useRef(null);
  const subCategorySelectRef = useRef(null);
  const categoryNameInputRef = useRef(null);
  const categoryDescInputRef = useRef(null);
  const subCategoryNameInputRef = useRef(null);
  const subCategoryDescInputRef = useRef(null);
  const modalCategorySelectRef = useRef(null);
  const searchInputRef = useRef(null);
  const categorySearchRef = useRef(null);
  const subCategorySearchRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const subCategoryDropdownRef = useRef(null);

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load sub-categories when category is selected
  useEffect(() => {
    if (selectedCategory) {
      loadSubCategories(selectedCategory);
    } else {
      setSubCategories([]);
      setSelectedSubCategory('');
    }
  }, [selectedCategory]);

  // Filter categories based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.subcategories?.some(sub =>
          sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  }, [searchTerm, categories]);

  // Filter categories for dropdown search
  useEffect(() => {
    if (categorySearchTerm) {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
      );
      setFilteredCategoriesDropdown(filtered);
    } else {
      setFilteredCategoriesDropdown(categories);
    }
  }, [categorySearchTerm, categories]);

  // Filter subcategories for dropdown search
  useEffect(() => {
    if (subCategorySearchTerm) {
      const filtered = subCategories.filter(subCategory =>
        subCategory.name.toLowerCase().includes(subCategorySearchTerm.toLowerCase())
      );
      setFilteredSubCategoriesDropdown(filtered);
    } else {
      setFilteredSubCategoriesDropdown(subCategories);
    }
  }, [subCategorySearchTerm, subCategories]);

  // Filter categories for dropdown search
  useEffect(() => {
    if (categorySearchTerm) {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
      );
      setFilteredCategoriesDropdown(filtered);
    } else {
      setFilteredCategoriesDropdown(categories);
    }
  }, [categorySearchTerm, categories]);

  // Filter subcategories for dropdown search
  useEffect(() => {
    if (subCategorySearchTerm) {
      const filtered = subCategories.filter(subCategory =>
        subCategory.name.toLowerCase().includes(subCategorySearchTerm.toLowerCase())
      );
      setFilteredSubCategoriesDropdown(filtered);
    } else {
      setFilteredSubCategoriesDropdown(subCategories);
    }
  }, [subCategorySearchTerm, subCategories]);

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        handleEscPress();
      }
    };

    const handleEnterKey = (event) => {
      if (event.key === 'Enter') {
        handleEnterPress(event);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    document.addEventListener('keydown', handleEnterKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('keydown', handleEnterKey);
      if (escTimeoutRef.current) {
        clearTimeout(escTimeoutRef.current);
      }
    };
  }, [escPressCount, showCategoryModal, showSubCategoryModal]);

  // API Functions
  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await categoryService.getAllCategories();
      if (result.success) {
        const categoriesData = result.data || [];
        setCategories(categoriesData);
        setFilteredCategories(categoriesData);
      } else {
        setError(result.message || 'Failed to load categories');
      }
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubCategories = async (parentCategoryId) => {
    setLoading(true);
    try {
      const result = await subCategoryService.getSubCategoriesByParent(parentCategoryId);
      if (result.success) {
        setSubCategories(result.data || []);
      } else {
        setError(result.message || 'Failed to load sub-categories');
        setSubCategories([]);
      }
    } catch (err) {
      setError('Failed to load sub-categories');
      setSubCategories([]);
      console.error('Error loading sub-categories:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle ESC key press
  const handleEscPress = () => {
    // If modal is open, close it first
    if (showCategoryModal || showSubCategoryModal) {
      closeCategoryModal();
      closeSubCategoryModal();
      return;
    }

    setEscPressCount(prev => prev + 1);

    if (escPressCount === 0) {
      setShowExitAlert(true);
      
      // Reset ESC count after 3 seconds
      escTimeoutRef.current = setTimeout(() => {
        setEscPressCount(0);
        setShowExitAlert(false);
      }, 3000);
    } else if (escPressCount === 1) {
      // Second ESC press - exit form
      resetForm();
      setShowExitAlert(false);
      if (escTimeoutRef.current) {
        clearTimeout(escTimeoutRef.current);
      }
      setEscPressCount(0);
    }
  };

  // Handle Enter key press
  const handleEnterPress = (event) => {
    // Don't handle Enter if in a modal
    if (showCategoryModal || showSubCategoryModal) {
      return;
    }

    const activeElement = document.activeElement;
    
    if (activeElement === categorySelectRef.current) {
      // Move to sub-category select
      if (subCategorySelectRef.current) {
        subCategorySelectRef.current.focus();
      }
    } else if (activeElement === subCategorySelectRef.current) {
      // Move to first input if available
      if (categorySelectRef.current) {
        categorySelectRef.current.focus();
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedCategory('');
    setSelectedSubCategory('');
    setError('');
    setSuccess('');
    setCategorySearchTerm('');
    setSubCategorySearchTerm('');
    setShowCategoryDropdown(false);
    setShowSubCategoryDropdown(false);
  };

  // Handle category search and selection
  const handleCategorySearch = (value) => {
    setCategorySearchTerm(value);
    setShowCategoryDropdown(true);
    updateCategoryDropdownPosition();
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category._id);
    setCategorySearchTerm(category.name);
    setShowCategoryDropdown(false);
  };

  // Handle subcategory search and selection
  const handleSubCategorySearch = (value) => {
    setSubCategorySearchTerm(value);
    setShowSubCategoryDropdown(true);
    updateSubCategoryDropdownPosition();
  };

  const handleSubCategorySelect = (subCategory) => {
    setSelectedSubCategory(subCategory._id);
    setSubCategorySearchTerm(subCategory.name);
    setShowSubCategoryDropdown(false);
  };

  // Update dropdown positions
  const updateCategoryDropdownPosition = () => {
    if (categorySearchRef.current) {
      const rect = categorySearchRef.current.getBoundingClientRect();
      setCategoryDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const updateSubCategoryDropdownPosition = () => {
    if (subCategorySearchRef.current) {
      const rect = subCategorySearchRef.current.getBoundingClientRect();
      setSubCategoryDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Handle focus events with position updates
  const handleCategoryFocus = () => {
    setShowCategoryDropdown(true);
    setCategorySelectedIndex(-1);
    updateCategoryDropdownPosition();
  };

  const handleSubCategoryFocus = () => {
    if (selectedCategory) {
      setShowSubCategoryDropdown(true);
      setSubCategorySelectedIndex(-1);
      updateSubCategoryDropdownPosition();
    }
  };

  // Handle keyboard navigation
  const handleCategoryKeyDown = (e) => {
    if (!showCategoryDropdown || filteredCategoriesDropdown.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setCategorySelectedIndex(prev => {
          const newIndex = prev < filteredCategoriesDropdown.length - 1 ? prev + 1 : 0;
          // Scroll selected item into view
          setTimeout(() => scrollSelectedItemIntoView('category', newIndex), 0);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setCategorySelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : filteredCategoriesDropdown.length - 1;
          // Scroll selected item into view
          setTimeout(() => scrollSelectedItemIntoView('category', newIndex), 0);
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (categorySelectedIndex >= 0 && categorySelectedIndex < filteredCategoriesDropdown.length) {
          handleCategorySelect(filteredCategoriesDropdown[categorySelectedIndex]);
        }
        break;
      case 'Escape':
        setShowCategoryDropdown(false);
        setCategorySelectedIndex(-1);
        break;
    }
  };

  const handleSubCategoryKeyDown = (e) => {
    if (!showSubCategoryDropdown || filteredSubCategoriesDropdown.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSubCategorySelectedIndex(prev => {
          const newIndex = prev < filteredSubCategoriesDropdown.length - 1 ? prev + 1 : 0;
          // Scroll selected item into view
          setTimeout(() => scrollSelectedItemIntoView('subcategory', newIndex), 0);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSubCategorySelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : filteredSubCategoriesDropdown.length - 1;
          // Scroll selected item into view
          setTimeout(() => scrollSelectedItemIntoView('subcategory', newIndex), 0);
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (subCategorySelectedIndex >= 0 && subCategorySelectedIndex < filteredSubCategoriesDropdown.length) {
          handleSubCategorySelect(filteredSubCategoriesDropdown[subCategorySelectedIndex]);
        }
        break;
      case 'Escape':
        setShowSubCategoryDropdown(false);
        setSubCategorySelectedIndex(-1);
        break;
    }
  };

  // Scroll selected item into view
  const scrollSelectedItemIntoView = (type, index) => {
    const dropdownClass = type === 'category' ? '.portal-dropdown' : '.portal-dropdown';
    const dropdown = document.querySelector(dropdownClass);
    if (dropdown) {
      const items = dropdown.querySelectorAll('.dropdown-item-custom');
      if (items[index]) {
        items[index].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  };

  // Handle subcategory search in list view
  const handleSubCategoryListSearch = (categoryId, searchTerm) => {
    setSubCategorySearchTerms(prev => ({
      ...prev,
      [categoryId]: searchTerm
    }));
  };

  // Get filtered subcategories for list view search
  const getFilteredSubCategories = (subcategories, categoryId) => {
    const searchTerm = subCategorySearchTerms[categoryId] || '';
    if (!searchTerm) return subcategories;
    
    return subcategories.filter(subcat => 
      subcat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subcat.description && subcat.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Handle click outside to close dropdowns and update positions on scroll/resize
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside input fields and dropdowns
      const categoryInput = categorySearchRef.current;
      const subCategoryInput = subCategorySearchRef.current;
      const categoryDropdown = document.querySelector('.portal-dropdown');
      
      if (categoryInput && !categoryInput.contains(event.target) && 
          (!categoryDropdown || !categoryDropdown.contains(event.target))) {
        setShowCategoryDropdown(false);
      }
      
      if (subCategoryInput && !subCategoryInput.contains(event.target) && 
          (!categoryDropdown || !categoryDropdown.contains(event.target))) {
        setShowSubCategoryDropdown(false);
      }
    };

    const handleResize = () => {
      if (showCategoryDropdown) updateCategoryDropdownPosition();
      if (showSubCategoryDropdown) updateSubCategoryDropdownPosition();
    };

    const handleScroll = () => {
      if (showCategoryDropdown) updateCategoryDropdownPosition();
      if (showSubCategoryDropdown) updateSubCategoryDropdownPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showCategoryDropdown, showSubCategoryDropdown]);

  // Handle category expansion in list view
  const toggleCategoryExpansion = async (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
      // Load subcategories for this category if not already loaded
      if (!categorySubcategories[categoryId]) {
        await loadSubCategoriesForCategory(categoryId);
      }
    }
    setExpandedCategories(newExpanded);
  };

  // Load subcategories for a specific category in list view
  const loadSubCategoriesForCategory = async (categoryId) => {
    try {
      const result = await subCategoryService.getSubCategoriesByParent(categoryId);
      if (result.success) {
        setCategorySubcategories(prev => ({
          ...prev,
          [categoryId]: result.data || []
        }));
      }
    } catch (err) {
      console.error('Error loading subcategories for category:', err);
    }
  };

  // Handle save selection
  const handleSaveSelection = async () => {
    if (!selectedCategory && !selectedSubCategory) {
      setError('Please select at least a category');
      return;
    }

    // Get current user information
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      setError('User not authenticated. Please login again.');
      return;
    }

    const selectedCategoryData = categories.find(cat => cat._id === selectedCategory);
    const selectedSubCategoryData = subCategories.find(sub => sub._id === selectedSubCategory);

    const dataToSave = {
      category: selectedCategoryData ? {
        id: selectedCategoryData._id,
        name: selectedCategoryData.name,
        description: selectedCategoryData.description
      } : null,
      subCategory: selectedSubCategoryData ? {
        id: selectedSubCategoryData._id,
        name: selectedSubCategoryData.name,
        description: selectedSubCategoryData.description
      } : null,
      user: {
        id: currentUser.id || currentUser._id,
        name: currentUser.name || currentUser.username || currentUser.email,
        email: currentUser.email,
        role: currentUser.role || 'user'
      },
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Here you would typically save to your database
      // For now, we'll just show the modal and reset the form
      setSavedData(dataToSave);
      setShowSaveModal(true);
      
      // Reset form after successful save
      setTimeout(() => {
        resetForm();
        setShowSaveModal(false);
        setSuccess('Selection saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }, 2000);
      
    } catch (err) {
      setError('Failed to save selection');
      console.error('Error saving selection:', err);
    }
  };

  // Modal functions
  const openCategoryModal = () => {
    setCategoryName('');
    setCategoryDescription('');
    setEditingCategory(null);
    setShowCategoryModal(true);
    setTimeout(() => {
      if (categoryNameInputRef.current) {
        categoryNameInputRef.current.focus();
      }
    }, 100);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryName('');
    setCategoryDescription('');
    setEditingCategory(null);
  };

  const openSubCategoryModal = () => {
    setSubCategoryName('');
    setSubCategoryDescription('');
    setModalCategoryId(selectedCategory);
    setEditingSubCategory(null);
    setShowSubCategoryModal(true);
    setTimeout(() => {
      if (modalCategorySelectRef.current) {
        modalCategorySelectRef.current.focus();
      }
    }, 100);
  };

  const closeSubCategoryModal = () => {
    setShowSubCategoryModal(false);
    setSubCategoryName('');
    setSubCategoryDescription('');
    setModalCategoryId('');
    setEditingSubCategory(null);
  };

  // Handle category creation
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }

    // Get current user information
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      setError('User not authenticated. Please login again.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await categoryService.createCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        createdBy: {
          id: currentUser.id || currentUser._id,
          name: currentUser.name || currentUser.username || currentUser.email,
          email: currentUser.email,
          role: currentUser.role || 'user'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (result.success) {
        setSuccess('Category created successfully!');
        closeCategoryModal();
        await loadCategories();
        
        // Auto-select the newly created category
        if (result.data && result.data._id) {
          setSelectedCategory(result.data._id);
        }
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to create category');
      }
    } catch (err) {
      setError('Failed to create category');
      console.error('Error creating category:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle sub-category creation
  const handleCreateSubCategory = async (e) => {
    e.preventDefault();
    
    if (!subCategoryName.trim()) {
      setError('Sub-category name is required');
      return;
    }
    
    if (!modalCategoryId) {
      setError('Please select a category');
      return;
    }

    // Get current user information
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      setError('User not authenticated. Please login again.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await subCategoryService.createSubCategory({
        name: subCategoryName.trim(),
        description: subCategoryDescription.trim(),
        parentCategory: modalCategoryId,
        createdBy: {
          id: currentUser.id || currentUser._id,
          name: currentUser.name || currentUser.username || currentUser.email,
          email: currentUser.email,
          role: currentUser.role || 'user'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (result.success) {
        setSuccess('Sub-category created successfully!');
        closeSubCategoryModal();
        
        // Refresh sub-categories if the same category is selected
        if (selectedCategory === modalCategoryId) {
          await loadSubCategories(selectedCategory);
        }
        
        // Auto-select the newly created sub-category
        if (result.data && result.data._id) {
          setSelectedSubCategory(result.data._id);
        }
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to create sub-category');
      }
    } catch (err) {
      setError('Failed to create sub-category');
      console.error('Error creating sub-category:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="category-management-page">
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-gradient-primary text-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faFolder} className="me-3" size="lg" />
                  <h4 className="mb-0">Category & Sub-Category Management</h4>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant={viewMode === 'form' ? 'light' : 'outline-light'}
                    size="sm"
                    onClick={() => setViewMode('form')}
                  >
                    <FontAwesomeIcon icon={faEdit} className="me-1" />
                    Form
                  </Button>
                </div>
              </div>
            </Card.Header>
            
            {showExitAlert && (
              <Alert variant="warning" className="mb-0 border-0">
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                Press ESC again to exit without saving changes
              </Alert>
            )}
            
            {error && (
              <Alert variant="danger" className="mb-0 border-0 alert-dismissible" dismissible>
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert variant="success" className="mb-0 border-0 alert-dismissible" dismissible>
                <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                {success}
              </Alert>
            )}
          </Card>
        </Col>
      </Row>

      {/* Keyboard Shortcuts */}
      <Row className="mb-3">
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Body className="py-2">
              <div className="d-flex justify-content-center align-items-center gap-4 small">
                <span><FontAwesomeIcon icon={faKeyboard} className="me-1 text-primary" /> <strong>Shortcuts:</strong></span>
                <span><kbd>↑</kbd> Up</span>
                <span><kbd>↓</kbd> Down</span>
               <span><kbd>Enter</kbd> Select</span>
                <span><kbd>Esc</kbd> Cancel</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Action Buttons Row */}
      <Row className="mb-4">
        <Col className="text-center">
          <div className="d-flex justify-content-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={openCategoryModal}
              disabled={loading}
              className="px-4"
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Category
            </Button>
            <Button
              variant="success"
              size="lg"
              onClick={openSubCategoryModal}
              disabled={loading}
              className="px-4"
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Sub-Category
            </Button>
          </div>
        </Col>
      </Row>

      {/* Categories and Sub-Categories Tables */}
      <Row>
        {/* Categories Table */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-gradient-primary text-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-semibold">
                  <FontAwesomeIcon icon={faFolder} className="me-2" />
                  Categories
                </h5>
                <Badge bg="light" text="dark" className="fs-6">
                  {categories.length} Total
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" className="me-2" />
                  <span>Loading categories...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-5">
                  <FontAwesomeIcon icon={faFolder} size="3x" className="text-muted mb-3" />
                  <h6 className="text-muted">No categories found</h6>
                  <p className="text-muted mb-3">Create your first category to get started</p>
                  <Button variant="primary" onClick={openCategoryModal}>
                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                    Add Category
                  </Button>
                </div>
              ) : (
                <div className="excel-table-container">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th className="excel-header">S.No</th>
                        <th className="excel-header">Category Name</th>
                        <th className="excel-header">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category, index) => (
                        <tr 
                          key={category._id} 
                          className={`excel-row ${selectedCategory === category._id ? 'selected' : ''}`}
                          onClick={() => setSelectedCategory(category._id)}
                        >
                          <td className="excel-cell text-center">
                            <span className="serial-number">{index + 1}</span>
                          </td>
                          <td className="excel-cell">
                            <div className="d-flex align-items-center">
                              <FontAwesomeIcon icon={faFolder} className="me-2 text-primary" />
                              <span className="category-name">{category.name.charAt(0).toUpperCase() + category.name.slice(1)}</span>
                              {selectedCategory === category._id && (
                                <FontAwesomeIcon icon={faCheckCircle} className="ms-auto text-success" />
                              )}
                            </div>
                          </td>
                          <td className="excel-cell text-center">
                            <Badge 
                              bg={selectedCategory === category._id ? 'success' : 'secondary'} 
                              className="status-badge"
                            >
                              {selectedCategory === category._id ? 'Selected' : 'Available'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Sub-Categories Table */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-gradient-success text-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-semibold">
                  <FontAwesomeIcon icon={faFolderOpen} className="me-2" />
                  Sub-Categories
                </h5>
                <Badge bg="light" text="dark" className="fs-6">
                  {subCategories.length} Total
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {!selectedCategory ? (
                <div className="text-center py-5">
                  <FontAwesomeIcon icon={faArrowLeft} size="3x" className="text-muted mb-3" />
                  <h6 className="text-muted">Select a category first</h6>
                  <p className="text-muted">Choose a category from the left to view its sub-categories</p>
                </div>
              ) : loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="success" className="me-2" />
                  <span>Loading sub-categories...</span>
                </div>
              ) : subCategories.length === 0 ? (
                <div className="text-center py-5">
                  <FontAwesomeIcon icon={faFolderOpen} size="3x" className="text-muted mb-3" />
                  <h6 className="text-muted">No sub-categories found</h6>
                  <p className="text-muted mb-3">Create a sub-category for the selected category</p>
                  <Button variant="success" onClick={openSubCategoryModal}>
                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                    Add Sub-Category
                  </Button>
                </div>
              ) : (
                <div className="excel-table-container">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th className="excel-header">S.No</th>
                        <th className="excel-header">Sub-Category Name</th>
                        <th className="excel-header">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subCategories.map((subCategory, index) => (
                        <tr 
                          key={subCategory._id}
                          className={`excel-row ${selectedSubCategory === subCategory._id ? 'selected-sub' : ''}`}
                          onClick={() => setSelectedSubCategory(subCategory._id)}
                        >
                          <td className="excel-cell text-center">
                            <span className="serial-number">{index + 1}</span>
                          </td>
                          <td className="excel-cell">
                            <div className="d-flex align-items-center">
                              <FontAwesomeIcon icon={faFolderOpen} className="me-2 text-success" />
                              <span className="category-name">{subCategory.name.charAt(0).toUpperCase() + subCategory.name.slice(1)}</span>
                              {selectedSubCategory === subCategory._id && (
                                <FontAwesomeIcon icon={faCheckCircle} className="ms-auto text-success" />
                              )}
                            </div>
                          </td>
                          <td className="excel-cell text-center">
                            <Badge 
                              bg={selectedSubCategory === subCategory._id ? 'success' : 'secondary'} 
                              className="status-badge"
                            >
                              {selectedSubCategory === subCategory._id ? 'Selected' : 'Available'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>



      {/* Category Creation Form */}
      {viewMode === 'category' && (
        <>
          {/* Keyboard Shortcuts */}
          <Row className="mb-3">
            <Col>
              <Card className="shadow-sm border-0">
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-center align-items-center gap-4 small">
                    <span><kbd>Tab</kbd> Next Field</span>
                    <span><kbd>Shift+Tab</kbd> Previous Field</span>
                    <span><kbd>Ctrl+S</kbd> Save</span>
                    <span><kbd>Ctrl+R</kbd> Clear</span>
                    <span><kbd>Esc</kbd> Cancel</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Row>
            <Col lg={8} className="mx-auto">
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-gradient-primary text-white">
                  <h5 className="mb-0 fw-semibold">
                    <FontAwesomeIcon icon={faFolder} className="me-2" />
                    Create New Category
                  </h5>
                </Card.Header>
              <Card.Body className="p-4">
                <Form onSubmit={handleCreateCategory}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">
                          Category Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          placeholder="Enter category name"
                          maxLength={100}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={categoryDescription}
                          onChange={(e) => setCategoryDescription(e.target.value)}
                          placeholder="Enter category description"
                          maxLength={255}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-center gap-3 mt-4">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCategoryName('');
                        setCategoryDescription('');
                      }}
                      disabled={loading}
                    >
                      <FontAwesomeIcon icon={faTimes} className="me-1" />
                      Clear
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading || !categoryName.trim()}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-1" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faSave} className="me-1" />
                          Save Category
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        </>
      )}

      {/* Category Modal */}
      <Modal show={showCategoryModal} onHide={closeCategoryModal} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateCategory}>
          <Modal.Body className="p-4">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Category Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    ref={categoryNameInputRef}
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    maxLength={100}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Description</Form.Label>
                  <Form.Control
                    ref={categoryDescInputRef}
                    as="textarea"
                    rows={3}
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Enter category description"
                    maxLength={255}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={closeCategoryModal} disabled={loading}>
              <FontAwesomeIcon icon={faTimes} className="me-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !categoryName.trim()}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  {editingCategory ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="me-1" />
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Sub-Category Modal */}
      <Modal show={showSubCategoryModal} onHide={closeSubCategoryModal} size="lg">
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            {editingSubCategory ? 'Edit Sub-Category' : 'Create New Sub-Category'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSubCategory}>
          <Modal.Body className="p-4">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Parent Category <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    ref={modalCategorySelectRef}
                    value={modalCategoryId}
                    onChange={(e) => setModalCategoryId(e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Sub-Category Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    ref={subCategoryNameInputRef}
                    type="text"
                    value={subCategoryName}
                    onChange={(e) => setSubCategoryName(e.target.value)}
                    placeholder="Enter sub-category name"
                    maxLength={100}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Description</Form.Label>
                  <Form.Control
                    ref={subCategoryDescInputRef}
                    as="textarea"
                    rows={3}
                    value={subCategoryDescription}
                    onChange={(e) => setSubCategoryDescription(e.target.value)}
                    placeholder="Enter sub-category description"
                    maxLength={255}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={closeSubCategoryModal} disabled={loading}>
              <FontAwesomeIcon icon={faTimes} className="me-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              disabled={loading || !subCategoryName.trim() || !modalCategoryId}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  {editingSubCategory ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="me-1" />
                  {editingSubCategory ? 'Update Sub-Category' : 'Create Sub-Category'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Save Confirmation Modal */}
      <Modal show={showSaveModal} onHide={() => setShowSaveModal(false)} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
            Selection Saved Successfully!
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {savedData && (
            <div>
              <h6 className="mb-3">Saved Details:</h6>
              
              {savedData.category && (
                <div className="mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <FontAwesomeIcon icon={faFolder} className="me-2 text-primary" />
                    <strong>Category:</strong>
                  </div>
                  <div className="ps-4">
                    <div className="fw-medium">{savedData.category.name}</div>
                    {savedData.category.description && (
                      <small className="text-muted">{savedData.category.description}</small>
                    )}
                  </div>
                </div>
              )}
              
              {savedData.subCategory && (
                <div className="mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <FontAwesomeIcon icon={faFolderOpen} className="me-2 text-success" />
                    <strong>Sub-Category:</strong>
                  </div>
                  <div className="ps-4">
                    <div className="fw-medium">{savedData.subCategory.name}</div>
                    {savedData.subCategory.description && (
                      <small className="text-muted">{savedData.subCategory.description}</small>
                    )}
                  </div>
                </div>
              )}

              {savedData.user && (
                <div className="mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2 text-info" />
                    <strong>Added By:</strong>
                  </div>
                  <div className="ps-4">
                    <div className="fw-medium">{savedData.user.name}</div>
                    <small className="text-muted">{savedData.user.email}</small>
                    {savedData.user.role && (
                      <Badge bg="secondary" className="ms-2" size="sm">
                        {savedData.user.role}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-top">
                <small className="text-muted">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                  Saved on: {new Date(savedData.timestamp).toLocaleString()}
                </small>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button 
            variant="success" 
            onClick={() => setShowSaveModal(false)}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
            OK
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Portal Dropdowns - Rendered outside component hierarchy */}
      {showCategoryDropdown && filteredCategoriesDropdown.length > 0 && createPortal(
        <div 
          className="bg-white border rounded shadow-lg portal-dropdown"
          style={{
            position: 'absolute',
            top: categoryDropdownPosition.top,
            left: categoryDropdownPosition.left,
            width: categoryDropdownPosition.width,
            zIndex: 99999,
            maxHeight: '300px',
            overflowY: 'auto',
            border: '2px solid #667eea',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
          }}
        >
          {filteredCategoriesDropdown.map((category, index) => (
            <div
              key={category._id}
              className={`px-3 py-2 dropdown-item-custom ${index === categorySelectedIndex ? 'keyboard-selected' : ''}`}
              onClick={() => handleCategorySelect(category)}
              style={{
                cursor: 'pointer',
                backgroundColor: index === categorySelectedIndex ? '#e3f2fd' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (index !== categorySelectedIndex) {
                  e.target.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (index !== categorySelectedIndex) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div className="fw-medium">{category.name}</div>
              {category.description && (
                <small className="text-muted">{category.description}</small>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}

      {showSubCategoryDropdown && filteredSubCategoriesDropdown.length > 0 && selectedCategory && createPortal(
        <div 
          className="bg-white border rounded shadow-lg portal-dropdown"
          style={{
            position: 'absolute',
            top: subCategoryDropdownPosition.top,
            left: subCategoryDropdownPosition.left,
            width: subCategoryDropdownPosition.width,
            zIndex: 99999,
            maxHeight: '300px',
            overflowY: 'auto',
            border: '2px solid #667eea',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
          }}
        >
          {filteredSubCategoriesDropdown.map((subCategory, index) => (
            <div
              key={subCategory._id}
              className={`px-3 py-2 dropdown-item-custom ${index === subCategorySelectedIndex ? 'keyboard-selected' : ''}`}
              onClick={() => handleSubCategorySelect(subCategory)}
              style={{
                cursor: 'pointer',
                backgroundColor: index === subCategorySelectedIndex ? '#e8f5e8' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (index !== subCategorySelectedIndex) {
                  e.target.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (index !== subCategorySelectedIndex) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div className="fw-medium">{subCategory.name}</div>
              {subCategory.description && (
                <small className="text-muted">{subCategory.description}</small>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}

    </Container>
  );
};

export default Category;
