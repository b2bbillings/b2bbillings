import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Form,
  Modal
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { categoryService } from '../../../services/categoryService';
import itemService from '../../../services/itemService';
import companyService from '../../../services/companyService';
import authService from '../../../services/authService';
import './Items.css';

const Items = () => {
  // Basic states
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [itemName, setItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [gstRate, setGstRate] = useState('');
  
  // ✅ NEW: Stock-related states
  const [itemType, setItemType] = useState('product');
  const [unit, setUnit] = useState('PCS');
  const [buyPrice, setBuyPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal states
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // GST options
  const gstOptions = [
    { value: 0, label: '0%' },
    { value: 5, label: '5%' },
    { value: 12, label: '12%' },
    { value: 18, label: '18%' },
    { value: 28, label: '28%' }
  ];

  // Load data on component mount
  useEffect(() => {
    loadItems();
    loadCategories();
    loadCompanies();
  }, []);

  // API Functions
  const loadItems = async () => {
    setLoading(true);
    try {
      const user = authService.getCurrentUser();
      console.log('Current user object:', user); // Debug log
      
      // Try multiple ways to get company ID
      const companyId = user?.companyId || user?.company?._id || user?.company;
      
      if (!user) {
        setError('Please login to continue.');
        return;
      }
      
      if (!companyId) {
        console.error('Company not found for user:', user);
        // Don't block the UI, just show info that user needs to create a company
        setError('No company found. Please create a company first using the "+" button next to the company selection.');
        setItems([]); // Show empty list instead of blocking
        setLoading(false);
        return;
      }

      const result = await itemService.getItems(companyId);
      if (result.success) {
        setItems(result.data || []);
      } else {
        setError(result.message || 'Failed to load items');
      }
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await categoryService.getAllCategories();
      if (result.success) {
        setCategories(result.data || []);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadCompanies = async () => {
    try {
      const result = await companyService.getCompanies({ limit: 100 });
      console.log('Companies API response:', result); // Debug log
      
      // Handle different response structures
      if (result && result.success && result.data) {
        // Standard success response with data array
        const companiesData = Array.isArray(result.data) ? result.data : [];
        setCompanies(companiesData);
      } else if (result && Array.isArray(result)) {
        // Direct array response
        setCompanies(result);
      } else if (result && result.data && Array.isArray(result.data)) {
        // Response with data property
        setCompanies(result.data);
      } else {
        // Fallback to empty array
        console.warn('Unexpected companies response structure:', result);
        setCompanies([]);
      }
    } catch (err) {
      console.error('Error loading companies:', err);
      setCompanies([]); // Ensure companies is always an array
    }
  };

  // Reset form
  const resetForm = () => {
    setItemName('');
    setSelectedCategory('');
    setSelectedCompany('');
    setGstRate('');
    
    // ✅ NEW: Reset stock-related states
    setItemType('product');
    setUnit('PCS');
    setBuyPrice('');
    setSalePrice('');
    setOpeningStock('');
    setMinStockLevel('');
    setAsOfDate(new Date().toISOString().split('T')[0]);
    
    setError('');
    setSuccess('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!itemName.trim()) {
      setError('Item name is required');
      return;
    }
    
    if (!selectedCategory) {
      setError('Category is required');
      return;
    }
    
    if (!selectedCompany) {
      setError('Company is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentUser = authService.getCurrentUser();
      
      // Try multiple ways to get company ID
      const companyId = currentUser?.companyId || currentUser?.company?._id || currentUser?.company;
      
      if (!companyId) {
        setError('User company not found. Please select a company first.');
        return;
      }
      
      const itemData = {
        name: itemName.trim(),
        category: selectedCategory,
        unit: unit || "PCS",
        type: itemType || "product",
        gstRate: parseFloat(gstRate) || 0,
        buyPrice: parseFloat(buyPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        openingStock: parseFloat(openingStock) || 0,
        minStockLevel: parseFloat(minStockLevel) || 0,
        asOfDate: asOfDate || new Date().toISOString().split('T')[0],
        isActive: true,
        createdBy: currentUser.id
      };

      const result = await itemService.createItem(companyId, itemData);

      if (result.success) {
        setSuccess('Item created successfully!');
        resetForm();
        loadItems();
        setShowAddModal(false);
      } else {
        setError(result.message || 'Failed to create item');
      }
    } catch (err) {
      setError('Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  // Handle company creation
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    if (!companyPhone.trim()) {
      setError('Company phone number is required');
      return;
    }

    if (!/^[0-9]{10}$/.test(companyPhone.trim())) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser?.id) {
        setError('User not authenticated. Please login again.');
        return;
      }
      
      const companyData = {
        businessName: companyName.trim(),
        phoneNumber: companyPhone.trim(),
        owner: currentUser.id
      };

      const result = await companyService.createCompany(companyData);

      if (result.success) {
        setSuccess('Company created successfully!');
        setCompanyName('');
        setCompanyPhone('');
        setShowCreateCompanyModal(false);
        loadCompanies();
        setSelectedCompany(result.data._id);
      } else {
        setError(result.message || 'Failed to create company');
      }
    } catch (err) {
      setError('Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit item
  const handleEditItem = (item) => {
    setItemName(item.name);
    setSelectedCategory(item.category?._id || '');
    setSelectedCompany(item.company?._id || '');
    setGstRate(item.gstRate || '');
    setShowAddModal(true);
  };

  // Handle delete item
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await itemService.deleteItem(itemId);
      if (result.success) {
        setSuccess('Item deleted successfully!');
        loadItems();
      } else {
        setError(result.message || 'Failed to delete item');
      }
    } catch (err) {
      setError('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  // Close create company modal
  const closeCreateCompanyModal = () => {
    setShowCreateCompanyModal(false);
    setCompanyName('');
    setCompanyPhone('');
    setError('');
  };

  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">Item Management</h4>
            </Card.Header>

            <Card.Body>
              {/* Alerts */}
              {error && (
                <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="mb-3" dismissible onClose={() => setSuccess('')}>
                  {success}
                </Alert>
              )}

              {/* Show items or empty state */}
              {items.length === 0 ? (
                <div className="text-center py-5">
                  <h5 className="text-muted">No Items Available</h5>
                  <Button variant="primary" onClick={() => setShowAddModal(true)}>
                    Add Item
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="d-flex justify-content-between mb-3">
                    <h6>Items ({items.length})</h6>
                    <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                      Add Item
                    </Button>
                  </div>
                  <Row>
                    {items.map((item) => (
                      <Col md={6} lg={4} key={item._id} className="mb-3">
                        <Card>
                          <Card.Body>
                            <h6>{item.name}</h6>
                            <p><strong>Category:</strong> {item.category?.name || 'N/A'}</p>
                            <p><strong>Company:</strong> {item.company?.name || item.company?.companyName || 'N/A'}</p>
                            <p><strong>GST:</strong> {item.gstRate ? `${item.gstRate}%` : '0%'}</p>
                            <div className="d-flex gap-2 mt-3">
                              <Button size="sm" variant="outline-primary" onClick={() => handleEditItem(item)}>
                                <FontAwesomeIcon icon={faEdit} className="me-1" />
                                Edit
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => handleDeleteItem(item._id)}>
                                <FontAwesomeIcon icon={faTrash} className="me-1" />
                                Delete
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              {/* Add Item Form Modal */}
              <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
                <Modal.Header closeButton>
                  <Modal.Title>Add New Item</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                  <Modal.Body>
                    <Row>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Item Name *</Form.Label>
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
                          <Form.Label>Category *</Form.Label>
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
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Company *</Form.Label>
                          <div className="d-flex gap-2">
                            <Form.Select
                              value={selectedCompany}
                              onChange={(e) => setSelectedCompany(e.target.value)}
                              required
                              className="flex-grow-1"
                            >
                              <option value="">Select Company</option>
                              {Array.isArray(companies) && companies.map((company) => (
                                <option key={company._id} value={company._id}>
                                  {company.name || company.companyName || company.businessName}
                                </option>
                              ))}
                            </Form.Select>
                            <Button
                              variant="outline-primary"
                              onClick={() => setShowCreateCompanyModal(true)}
                            >
                              +
                            </Button>
                          </div>
                        </Form.Group>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>GST Rate</Form.Label>
                          <Form.Select
                            value={gstRate}
                            onChange={(e) => setGstRate(e.target.value)}
                          >
                            <option value="">Select GST rate</option>
                            {gstOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      {/* ✅ NEW: Stock and Pricing Fields */}
                      <Col xs={12}>
                        <hr className="my-3" />
                        <h6 className="text-muted mb-3">
                          Stock & Pricing Information
                        </h6>
                      </Col>

                      {/* Item Type & Unit */}
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
                            <option value="SET">SET - Sets</option>
                            <option value="BAG">BAG - Bags</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      {/* Pricing */}
                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Buy Price (₹)</Form.Label>
                          <Form.Control
                            type="number"
                            value={buyPrice}
                            onChange={(e) => setBuyPrice(e.target.value)}
                            placeholder="Enter buy price"
                            min="0"
                            step="0.01"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6} className="mb-3">
                        <Form.Group>
                          <Form.Label>Sale Price (₹)</Form.Label>
                          <Form.Control
                            type="number"
                            value={salePrice}
                            onChange={(e) => setSalePrice(e.target.value)}
                            placeholder="Enter sale price"
                            min="0"
                            step="0.01"
                          />
                        </Form.Group>
                      </Col>

                      {/* Stock Fields - Only show for products */}
                      {itemType === 'product' && (
                        <>
                          <Col md={4} className="mb-3">
                            <Form.Group>
                              <Form.Label>Opening Stock</Form.Label>
                              <Form.Control
                                type="number"
                                value={openingStock}
                                onChange={(e) => setOpeningStock(e.target.value)}
                                placeholder="Enter opening stock"
                                min="0"
                                step="1"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={4} className="mb-3">
                            <Form.Group>
                              <Form.Label>Min Stock Level</Form.Label>
                              <Form.Control
                                type="number"
                                value={minStockLevel}
                                onChange={(e) => setMinStockLevel(e.target.value)}
                                placeholder="Enter minimum stock"
                                min="0"
                                step="1"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={4} className="mb-3">
                            <Form.Group>
                              <Form.Label>As of Date</Form.Label>
                              <Form.Control
                                type="date"
                                value={asOfDate}
                                onChange={(e) => setAsOfDate(e.target.value)}
                              />
                            </Form.Group>
                          </Col>
                        </>
                      )}
                    </Row>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Item'}
                    </Button>
                  </Modal.Footer>
                </Form>
              </Modal>

              {/* Create Company Modal */}
              <Modal show={showCreateCompanyModal} onHide={closeCreateCompanyModal} centered>
                <Modal.Header closeButton>
                  <Modal.Title>Create New Company</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateCompany}>
                  <Modal.Body>
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
                    <Button variant="outline-secondary" onClick={closeCreateCompanyModal}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Company'}
                    </Button>
                  </Modal.Footer>
                </Form>
              </Modal>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Items;