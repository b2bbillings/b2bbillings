import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import itemService from '../../../services/itemService';
import categoryServiceModule from '../../../services/categoryService';
import brandService from '../../../services/brandService';
import authService from '../../../services/authService';

const { categoryService } = categoryServiceModule;

const AddItemModal = ({ show, onHide, onItemCreated }) => {
  // Form states
  const [itemName, setItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [gstRate, setGstRate] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [itemType, setItemType] = useState('product');
  const [unit, setUnit] = useState('PCS');
  const [buyPrice, setBuyPrice] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('');

  // Dropdown data
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // GST options
  const gstOptions = [
    { value: 0, label: '0%' },
    { value: 5, label: '5%' },
    { value: 12, label: '12%' },
    { value: 18, label: '18%' },
    { value: 28, label: '28%' }
  ];

  // Load categories and brands on mount
  useEffect(() => {
    if (show) {
      loadCategories();
      loadBrands();
    }
  }, [show]);

  const loadCategories = async () => {
    try {
      const result = await categoryService.getAllCategories();
      console.log('📂 Categories loaded:', result);
      if (result.success) {
        setCategories(result.data || []);
      } else if (Array.isArray(result)) {
        setCategories(result);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadBrands = async () => {
    try {
      const result = await brandService.getBrands();
      console.log('🏷️ Brands loaded:', result);
      if (result.success) {
        setBrands(result.data || []);
      } else if (Array.isArray(result)) {
        setBrands(result);
      }
    } catch (err) {
      console.error('Error loading brands:', err);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) {
      setError('Brand name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await brandService.createBrand({ name: newBrandName.trim() });
      
      if (response) {
        setSuccess('Brand created successfully!');
        setNewBrandName('');
        setShowBrandModal(false);
        
        // Reload brands and select the new one
        await loadBrands();
        
        // Find and select the newly created brand
        setTimeout(() => {
          const newBrand = brands.find(b => b.name === newBrandName.trim());
          if (newBrand) {
            setSelectedBrand(newBrand._id);
          }
        }, 500);
      }
    } catch (err) {
      console.error('Error creating brand:', err);
      setError('Failed to create brand');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await categoryService.createCategory({ name: newCategoryName.trim() });
      
      if (response && response.success) {
        setSuccess('Category created successfully!');
        setNewCategoryName('');
        setShowCategoryModal(false);
        
        // Reload categories and select the new one
        await loadCategories();
        
        // Find and select the newly created category
        setTimeout(() => {
          const newCategory = categories.find(c => c.name === newCategoryName.trim());
          if (newCategory) {
            setSelectedCategory(newCategory._id);
          }
        }, 500);
      }
    } catch (err) {
      console.error('Error creating category:', err);
      setError('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItemName('');
    setSelectedCategory('');
    setSelectedBrand('');
    setGstRate('');
    setSalePrice('');
    setItemType('product');
    setUnit('PCS');
    setBuyPrice('');
    setOpeningStock('');
    setMinStockLevel('');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      // Try multiple ways to get company ID
      let companyId = null;
      
      // Method 1: Check localStorage
      companyId = localStorage.getItem("currentCompanyId") || sessionStorage.getItem("currentCompanyId");
      
      // Method 2: Extract from URL (e.g., /companies/123/sales)
      if (!companyId) {
        const urlMatch = window.location.pathname.match(/\/companies\/([^\/]+)/);
        if (urlMatch && urlMatch[1]) {
          companyId = urlMatch[1];
          console.log('🔍 Extracted companyId from URL:', companyId);
        }
      }
      
      // Method 3: Get from user object
      if (!companyId) {
        const user = authService.getCurrentUser();
        companyId = user?.companyId || user?.company?._id || user?.company;
        if (companyId) {
          console.log('🔍 Extracted companyId from user:', companyId);
        }
      }

      console.log('🏢 Final companyId:', companyId);

      if (!companyId) {
        setError('Company ID not found. Please log in again or select a company.');
        console.error('❌ Could not find company ID from any source');
        return;
      }

      const itemData = {
        name: itemName,
        category: selectedCategory,
        brand: selectedBrand,
        gstRate: parseFloat(gstRate) || 0,
        salePrice: parseFloat(salePrice) || 0,
        type: itemType,
        unit: unit,
        buyPrice: parseFloat(buyPrice) || 0,
        openingStock: parseFloat(openingStock) || 0,
        minStockLevel: parseFloat(minStockLevel) || 0,
      };

      console.log('📤 Creating item with data:', itemData);

      const result = await itemService.createItem(companyId, itemData);
      
      console.log('✅ Item created:', result);

      if (result && (result.success || result.data)) {
        const createdItem = result.data || result;
        setSuccess('Item created successfully!');
        
        // Call parent callback with the new item
        if (onItemCreated) {
          onItemCreated(createdItem);
        }

        // Reset form and close modal after a short delay
        setTimeout(() => {
          resetForm();
          onHide();
        }, 1000);
      } else {
        setError(result.message || 'Failed to create item');
      }
    } catch (err) {
      console.error('❌ Error creating item:', err);
      setError(err.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <>
      <Modal show={show} onHide={handleClose} size="lg" backdrop="static">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>Add New Item</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Alerts */}
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                {success}
              </Alert>
            )}

            <Row>
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Item Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Enter item name"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Category <span className="text-danger">*</span></Form.Label>
                  <InputGroup>
                    <Form.Select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Button
                      variant="success"
                      onClick={() => setShowCategoryModal(true)}
                      title="Create New Category"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </Button>
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Brand <span className="text-danger">*</span></Form.Label>
                  <InputGroup>
                    <Form.Select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      required
                    >
                      <option value="">Select Brand</option>
                      {brands.map((brand) => (
                        <option key={brand._id} value={brand._id}>
                          {brand.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Button
                      variant="success"
                      onClick={() => setShowBrandModal(true)}
                      title="Create New Brand"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </Button>
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Item Type</Form.Label>
                  <Form.Select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                  >
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Unit</Form.Label>
                  <Form.Select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="PCS">PCS - Pieces</option>
                    <option value="KGS">KGS - Kilograms</option>
                    <option value="LTR">LTR - Litres</option>
                    <option value="MTR">MTR - Metres</option>
                    <option value="BOX">BOX - Boxes</option>
                    <option value="DOZ">DOZ - Dozen</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4} className="mb-3">
                <Form.Group>
                  <Form.Label>Buy Price (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </Col>

              <Col md={4} className="mb-3">
                <Form.Group>
                  <Form.Label>Sale Price (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </Col>

              <Col md={4} className="mb-3">
                <Form.Group>
                  <Form.Label>GST Rate</Form.Label>
                  <Form.Select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                  >
                    <option value="">No GST</option>
                    {gstOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              {itemType === 'product' && (
                <>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Opening Stock</Form.Label>
                      <Form.Control
                        type="number"
                        value={openingStock}
                        onChange={(e) => setOpeningStock(e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Min Stock Level</Form.Label>
                      <Form.Control
                        type="number"
                        value={minStockLevel}
                        onChange={(e) => setMinStockLevel(e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                </>
              )}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Item'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Create Brand Modal */}
      <Modal show={showBrandModal} onHide={() => setShowBrandModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create New Brand</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Brand Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Enter brand name"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateBrand();
                }
              }}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBrandModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleCreateBrand} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create Category Modal */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create New Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Category Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter category name"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateCategory();
                }
              }}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleCreateCategory} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AddItemModal;
