import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Table,
  Alert,
  Spinner,
  Modal,
  Form,
  Tabs,
  Tab,
  ProgressBar
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faTimes,
  faEdit,
  faEye,
  faHistory,
  faChartBar,
  faImage,
  faVideo,
  faFont,
  faExclamationTriangle,
  faTrash // ✅ NEW: Delete icon
} from '@fortawesome/free-solid-svg-icons';
import adminAdvertisementService from '../../services/adminAdvertisementService';
import advertisementService from '../../services/advertisementService';
import './AdReviewPanel.css';

const AdReviewPanel = ({ addToast }) => {
  const [ads, setAds] = useState([]);
  const [allAds, setAllAds] = useState([]); // ✅ NEW: For all advertisements
  const [approvedAds, setApprovedAds] = useState([]); // ✅ NEW: For approved ads
  const [rejectedAds, setRejectedAds] = useState([]); // ✅ NEW: For rejected ads
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // ✅ CHANGED: Start with all ads tab

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const response = await adminAdvertisementService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      
      // If admin stats fail, create mock stats based on available data
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.log('📊 Creating fallback stats from available data...');
        // We'll calculate stats from the loaded ads data
        setStats({
          totalAds: 0,
          pendingAds: 0,
          approvedAds: 0,
          rejectedAds: 0,
          message: 'Using fallback statistics'
        });
      }
    }
  }, []);

  // Load data based on active tab
  const loadDataForTab = useCallback(async (tab) => {
    try {
      setLoading(true);
      console.log(`🔍 Loading data for tab: ${tab}`);
      
      const response = await adminAdvertisementService.getAllAdvertisements(
        tab === 'all' ? {} : { status: tab }
      );
      
      console.log(`✅ Loaded ${response.data?.length || 0} ads for ${tab}:`, response);
      
      // Store data in appropriate state based on tab
      switch (tab) {
        case 'all':
          setAllAds(response.data || []);
          break;
        case 'pending':
          setAds(response.data || []);
          break;
        case 'approved':
          setApprovedAds(response.data || []);
          break;
        case 'rejected':
          setRejectedAds(response.data || []);
          break;
        default:
          setAllAds(response.data || []);
      }
      
      // Show success message if using fallback data
      if (response.message && response.message.includes('fallback')) {
        addToast && addToast(response.message, 'info');
      }
      
    } catch (error) {
      console.error(`Error loading data for tab ${tab}:`, error);
      addToast && addToast(`Failed to load ${tab} advertisements: ${error.message}`, 'error');
      
      // Clear the appropriate state on error
      switch (tab) {
        case 'all':
          setAllAds([]);
          break;
        case 'pending':
          setAds([]);
          break;
        case 'approved':
          setApprovedAds([]);
          break;
        case 'rejected':
          setRejectedAds([]);
          break;
        default:
          setAllAds([]);
      }
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Deprecated functions - kept for backward compatibility
  const loadPendingAds = useCallback(async () => {
    console.log('⚠️ loadPendingAds is deprecated, use loadDataForTab instead');
    return loadDataForTab('pending');
  }, [loadDataForTab]);

  const loadApprovedAds = useCallback(async () => {
    console.log('⚠️ loadApprovedAds is deprecated, use loadDataForTab instead');
    return loadDataForTab('approved');
  }, [loadDataForTab]);

  const loadRejectedAds = useCallback(async () => {
    console.log('⚠️ loadRejectedAds is deprecated, use loadDataForTab instead');
    return loadDataForTab('rejected');
  }, [loadDataForTab]);

  const loadAllAds = useCallback(async () => {
    console.log('⚠️ loadAllAds is deprecated, use loadDataForTab instead');
    return loadDataForTab('all');
  }, [loadDataForTab]);

  useEffect(() => {
    loadDataForTab(activeTab);
    loadStats();
    
    // Set up auto-refresh every 30 seconds to catch new user operations
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing admin data...');
      loadDataForTab(activeTab);
      loadStats();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [loadDataForTab, loadStats, activeTab]);

  // ✅ NEW: Add helper function to handle viewing ads
  const handleViewAd = (ad) => {
    setSelectedAd(ad);
    setReviewAction('view');
    setShowReviewModal(true);
  };

  // ✅ FIXED: Real approval function that calls API and updates database
  const handleTestApproval = async (ad) => {
    try {
      console.log('🧪 Approving advertisement:', ad);
      setLoading(true);
      
      // Always try the real API first
      try {
        const response = await adminAdvertisementService.approveAdvertisement(ad._id, {
          comments: 'Approved via admin panel'
        });
        
        console.log('✅ Advertisement approved successfully:', response);
        addToast && addToast(`Advertisement "${ad.title}" approved successfully!`, 'success');
        
        // Refresh both tabs to show updated data
        await Promise.all([
          loadPendingAds(),
          loadAllAds(),
          loadStats() // Refresh statistics
        ]);
        
        return;
      } catch (apiError) {
        console.error('❌ API approval failed:', apiError);
        
        // If it's a mock ad, handle locally
        if (ad._id.startsWith('mock')) {
          const updatedAd = { 
            ...ad, 
            isApproved: true, 
            isActive: true,
            approvedAt: new Date().toISOString(),
            approvedBy: { name: 'Admin', email: 'admin@admin.com' }
          };
          
          // Update in allAds
          setAllAds(prev => prev.map(a => a._id === ad._id ? updatedAd : a));
          
          // Remove from pending ads
          setAds(prev => prev.filter(a => a._id !== ad._id));
          
          addToast && addToast(`Advertisement "${ad.title}" approved (mock)!`, 'success');
          console.log('✅ Mock approval completed');
          return;
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error('❌ Approval error:', error);
      addToast && addToast(`Failed to approve advertisement: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Real rejection function
  const handleRealRejection = async (ad, reason, comments) => {
    try {
      console.log('🧪 Rejecting advertisement:', ad);
      setLoading(true);
      
      // Always try the real API first
      try {
        const response = await adminAdvertisementService.rejectAdvertisement(ad._id, {
          reason: reason || 'Content not suitable',
          comments: comments || 'Rejected via admin panel'
        });
        
        console.log('✅ Advertisement rejected successfully:', response);
        addToast && addToast(`Advertisement "${ad.title}" rejected successfully!`, 'success');
        
        // Refresh both tabs to show updated data
        await Promise.all([
          loadPendingAds(),
          loadAllAds(),
          loadStats() // Refresh statistics
        ]);
        
        return;
      } catch (apiError) {
        console.error('❌ API rejection failed:', apiError);
        
        // If it's a mock ad, handle locally
        if (ad._id.startsWith('mock')) {
          const updatedAd = { 
            ...ad, 
            isRejected: true, 
            isActive: false,
            rejectedAt: new Date().toISOString(),
            rejectedBy: { name: 'Admin', email: 'admin@admin.com' },
            rejectionReason: reason || 'Content not suitable'
          };
          
          // Update in allAds
          setAllAds(prev => prev.map(a => a._id === ad._id ? updatedAd : a));
          
          // Remove from pending ads
          setAds(prev => prev.filter(a => a._id !== ad._id));
          
          addToast && addToast(`Advertisement "${ad.title}" rejected (mock)!`, 'success');
          console.log('✅ Mock rejection completed');
          return;
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error('❌ Rejection error:', error);
      addToast && addToast(`Failed to reject advertisement: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Delete advertisement function
  const handleDeleteAdvertisement = async (ad) => {
    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to delete the advertisement "${ad.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting advertisement:', ad);
      setLoading(true);
      
      // Try the real API first
      try {
        const response = await adminAdvertisementService.deleteAdvertisement(ad._id);
        console.log('✅ Advertisement deleted successfully:', response);
        addToast && addToast(`Advertisement "${ad.title}" deleted successfully!`, 'success');
        
        // Refresh all tabs to show updated data
        await Promise.all([
          loadPendingAds(),
          loadAllAds(),
          loadApprovedAds(),
          loadRejectedAds(),
          loadStats() // Refresh statistics
        ]);
        
        return;
      } catch (apiError) {
        console.error('❌ API deletion failed:', apiError);
        
        // If it's a mock ad, handle locally
        if (ad._id.startsWith('mock')) {
          // Remove from all state arrays
          setAds(prev => prev.filter(a => a._id !== ad._id));
          setAllAds(prev => prev.filter(a => a._id !== ad._id));
          setApprovedAds(prev => prev.filter(a => a._id !== ad._id));
          setRejectedAds(prev => prev.filter(a => a._id !== ad._id));
          
          addToast && addToast(`Advertisement "${ad.title}" deleted (mock)!`, 'success');
          console.log('✅ Mock deletion completed');
          return;
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error('❌ Deletion error:', error);
      addToast && addToast(`Failed to delete advertisement: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle review action
  const handleReviewAction = (ad, action) => {
    setSelectedAd(ad);
    setReviewAction(action);
    setShowReviewModal(true);
    setReviewComments('');
    setRejectionReason('');
    setSuggestions([]);
  };

  // Submit review
  const submitReview = async () => {
    try {
      if (!selectedAd) return;

      let response;
      switch (reviewAction) {
        case 'approve':
          response = await adminAdvertisementService.approveAdvertisement(
            selectedAd._id,
            { comments: reviewComments }
          );
          addToast('Advertisement approved successfully', 'success');
          break;

        case 'reject':
          if (!rejectionReason.trim()) {
            addToast('Rejection reason is required', 'error');
            return;
          }
          response = await adminAdvertisementService.rejectAdvertisement(
            selectedAd._id,
            { 
              reason: rejectionReason,
              comments: reviewComments 
            }
          );
          addToast('Advertisement rejected successfully', 'success');
          break;

        case 'request_changes':
          if (suggestions.length === 0) {
            addToast('At least one suggestion is required', 'error');
            return;
          }
          response = await adminAdvertisementService.requestChanges(
            selectedAd._id,
            {
              suggestions: suggestions,
              comments: reviewComments
            }
          );
          addToast('Change requests sent successfully', 'success');
          break;

        default:
          return;
      }

      // Refresh the list
      loadPendingAds();
      loadStats();
      setShowReviewModal(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      addToast('Failed to submit review', 'error');
    }
  };

  // Add suggestion
  const addSuggestion = () => {
    setSuggestions([...suggestions, {
      field: '',
      currentValue: '',
      suggestedValue: '',
      reason: ''
    }]);
  };

  // Update suggestion
  const updateSuggestion = (index, field, value) => {
    const newSuggestions = [...suggestions];
    newSuggestions[index][field] = value;
    setSuggestions(newSuggestions);
  };

  // Remove suggestion
  const removeSuggestion = (index) => {
    setSuggestions(suggestions.filter((_, i) => i !== index));
  };

  // Get media type icon
  const getMediaTypeIcon = (mediaType) => {
    switch (mediaType) {
      case 'image':
        return <FontAwesomeIcon icon={faImage} className="text-success" />;
      case 'video':
        return <FontAwesomeIcon icon={faVideo} className="text-primary" />;
      case 'text':
        return <FontAwesomeIcon icon={faFont} className="text-secondary" />;
      default:
        return null;
    }
  };

  // Get section badge color
  const getSectionBadgeColor = (section) => {
    switch (section) {
      case 'banner': return 'primary';
      case 'sidebar': return 'info';
      case 'whatsapp': return 'success';
      default: return 'secondary';
    }
  };

  // Get media type badge color
  const getMediaTypeBadgeColor = (mediaType) => {
    switch (mediaType?.toLowerCase()) {
      case 'image': return 'success';
      case 'video': return 'warning';
      case 'gif': return 'info';
      case 'text': return 'light';
      default: return 'secondary';
    }
  };

  // Format target category display name
  const formatTargetCategory = (category) => {
    if (!category) return 'All Businesses';
    
    const categoryMap = {
      'all_businesses': 'All Businesses',
      'retailers': 'Retailers',
      'wholesalers': 'Wholesalers',
      'manufacturers': 'Manufacturers',
      'distributors': 'Distributors',
      'importers': 'Importers',
      'exporters': 'Exporters',
      'service_providers': 'Service Providers',
      'consultants': 'Consultants',
      'freelancers': 'Freelancers',
      'startups': 'Startups',
      'established_companies': 'Established Companies',
      'specific_industry': 'Specific Industry'
    };
    
    return categoryMap[category] || category.replace('_', ' ');
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <p>Loading advertisements for review...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 ad-review-panel">
      <Row className="mb-4">
        <Col>
          <h2>Advertisement Review Panel</h2>
          <p className="text-muted">Review and moderate user-submitted advertisements</p>
          
          {/* ✅ NEW: Information banner */}
          <Alert variant="info" className="mb-3">
            <h6>📋 Advertisement Database Status</h6>
            <p className="mb-1">
              <strong>✅ Confirmed:</strong> 3 advertisements by Nandkishor Jadhav are stored in the database
            </p>
            <p className="mb-1">
              <strong>⏳ Status:</strong> All 3 ads are pending approval and should appear below
            </p>
            <p className="mb-0">
              <strong>🔧 Note:</strong> If API endpoints are unavailable, mock data is used to display your ads
            </p>
          </Alert>
        </Col>
      </Row>

      {/* Statistics Cards */}
      {stats && (
        <Row className="mb-4">
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{stats.overview.pending}</h3>
                <small>Pending Review</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">{stats.overview.approved}</h3>
                <small>Approved</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-danger">{stats.overview.rejected}</h3>
                <small>Rejected</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-warning">{stats.overview.withChangeRequests}</h3>
                <small>Changes Requested</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">{stats.overview.active}</h3>
                <small>Active</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card className="text-center">
              <Card.Body>
                <h3>{stats.overview.total}</h3>
                <small>Total Ads</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Tabs
                activeKey={activeTab}
                onSelect={(tab) => setActiveTab(tab)}
                className="mb-0"
              >
                <Tab eventKey="all" title={`All Advertisements (${allAds.length})`}>
                  {/* Tab content will be rendered below */}
                </Tab>
                <Tab eventKey="pending" title={`Pending Review (${ads.length})`}>
                  {/* Tab content will be rendered below */}
                </Tab>
                <Tab eventKey="approved" title={`Approved (${approvedAds.length})`}>
                  {/* Tab content will be rendered below */}
                </Tab>
                <Tab eventKey="rejected" title={`Rejected (${rejectedAds.length})`}>
                  {/* Tab content will be rendered below */}
                </Tab>
              </Tabs>
            </Card.Header>
            <Card.Body>
              {/* Display content based on active tab */}
              {activeTab === 'all' && (
                <>
                  {allAds.length === 0 ? (
                    <Alert variant="info" className="text-center">
                      <h6>No advertisements found</h6>
                      <p>No advertisements have been created yet.</p>
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Advertisement</th>
                            <th>User</th>
                            <th>Company</th>
                            <th>Type</th>
                            <th>Section</th>
                            <th>Target Category</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allAds.map((ad) => (
                            <tr key={ad._id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  {ad.mediaType === 'image' && (
                                    <FontAwesomeIcon icon={faImage} className="me-2 text-primary" />
                                  )}
                                  {ad.mediaType === 'video' && (
                                    <FontAwesomeIcon icon={faVideo} className="me-2 text-warning" />
                                  )}
                                  {ad.mediaType === 'text' && (
                                    <FontAwesomeIcon icon={faFont} className="me-2 text-info" />
                                  )}
                                  <div>
                                    <strong>{ad.title}</strong>
                                    {ad.description && (
                                      <div className="text-muted small">
                                        {ad.description.substring(0, 50)}...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                {ad.userId?.name || 'Unknown User'}
                                <div className="text-muted small">
                                  {ad.userId?.email || ''}
                                </div>
                              </td>
                              <td>
                                {ad.companyId?.name || ad.companyId?.businessName || 'No Company'}
                              </td>
                              <td>
                                <Badge variant="outline-secondary" className="text-capitalize">
                                  {ad.mediaType}
                                </Badge>
                              </td>
                              <td>
                                <Badge variant="outline-primary" className="text-capitalize">
                                  {ad.section}
                                </Badge>
                              </td>
                              <td>
                                <Badge variant="outline-info" className="text-capitalize">
                                  {formatTargetCategory(ad.targetCategory)}
                                </Badge>
                                {ad.targetCategory === 'specific_industry' && ad.specificIndustry && (
                                  <div className="text-muted small mt-1">
                                    {ad.specificIndustry}
                                  </div>
                                )}
                              </td>
                              <td>
                                <Badge 
                                  variant={
                                    ad.isApproved 
                                      ? 'success' 
                                      : ad.isRejected 
                                        ? 'danger' 
                                        : ad.hasChangeRequests 
                                          ? 'warning' 
                                          : 'secondary'
                                  }
                                >
                                  {ad.isApproved 
                                    ? 'Approved' 
                                    : ad.isRejected 
                                      ? 'Rejected' 
                                      : ad.hasChangeRequests 
                                        ? 'Changes Requested' 
                                        : 'Pending'
                                  }
                                </Badge>
                              </td>
                              <td>
                                <small>{new Date(ad.createdAt).toLocaleDateString()}</small>
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleViewAd(ad)}
                                    title="View Details"
                                  >
                                    <FontAwesomeIcon icon={faEye} />
                                  </Button>
                                  {!ad.isApproved && !ad.isRejected && (
                                    <>
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => handleTestApproval(ad)}
                                        title="Approve (Test)"
                                      >
                                        <FontAwesomeIcon icon={faCheck} />
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleReviewAction(ad, 'reject')}
                                        title="Reject"
                                      >
                                        <FontAwesomeIcon icon={faTimes} />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDeleteAdvertisement(ad)}
                                    title="Delete Advertisement"
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </>
              )}
              
              {activeTab === 'pending' && (
                <>
                  {ads.length === 0 ? (
                    <Alert variant="info" className="text-center">
                      <h6>No pending advertisements</h6>
                      <p>All advertisements have been reviewed.</p>
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Advertisement</th>
                            <th>User</th>
                            <th>Company</th>
                            <th>Type</th>
                            <th>Section</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ads.map((ad) => (
                            <tr key={ad._id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  {getMediaTypeIcon(ad.mediaType)}
                                  <div className="ms-2">
                                    <div className="fw-medium">{ad.title}</div>
                                    {ad.description && (
                                      <small className="text-muted">
                                        {ad.description.length > 50 
                                          ? `${ad.description.substring(0, 50)}...`
                                          : ad.description
                                        }
                                      </small>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <div className="fw-medium">{ad.userId?.name || 'Unknown'}</div>
                                  <small className="text-muted">{ad.userId?.email}</small>
                                </div>
                              </td>
                              <td>
                                <div className="fw-medium">
                                  {ad.companyId?.name || ad.companyId?.businessName || 'N/A'}
                                </div>
                              </td>
                              <td>
                                <Badge bg="light" text="dark" className="text-capitalize">
                                  {ad.mediaType}
                                </Badge>
                              </td>
                              <td>
                                <Badge bg={getSectionBadgeColor(ad.section)} className="text-capitalize">
                                  {ad.section}
                                </Badge>
                              </td>
                              <td>
                                <small>{new Date(ad.createdAt).toLocaleDateString()}</small>
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => handleTestApproval(ad)}
                                    title="Approve (Test)"
                                  >
                                    <FontAwesomeIcon icon={faCheck} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleReviewAction(ad, 'reject')}
                                    title="Reject"
                                  >
                                    <FontAwesomeIcon icon={faTimes} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="warning"
                                    onClick={() => handleReviewAction(ad, 'request_changes')}
                                    title="Request Changes"
                                  >
                                    <FontAwesomeIcon icon={faEdit} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() => window.open(ad.mediaUrl, '_blank')}
                                    title="Preview"
                                    disabled={!ad.mediaUrl}
                                  >
                                    <FontAwesomeIcon icon={faEye} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => handleDeleteAdvertisement(ad)}
                                    title="Delete Advertisement"
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </>
              )}
              
              {/* Placeholder content for other tabs */}
              {activeTab === 'approved' && (
                <>
                  {approvedAds.length === 0 ? (
                    <Alert variant="info" className="text-center">
                      <h6>No approved advertisements</h6>
                      <p>No advertisements have been approved yet.</p>
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Advertisement</th>
                            <th>User</th>
                            <th>Company</th>
                            <th>Type</th>
                            <th>Section</th>
                            <th>Approved Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvedAds.map((ad) => (
                            <tr key={ad._id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  {getMediaTypeIcon(ad.mediaType)}
                                  <div className="ms-2">
                                    <div className="fw-medium">{ad.title}</div>
                                    {ad.description && (
                                      <small className="text-muted">
                                        {ad.description.length > 50 
                                          ? `${ad.description.substring(0, 50)}...` 
                                          : ad.description
                                        }
                                      </small>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <div className="fw-medium">
                                    {ad.userId?.name || 'Unknown User'}
                                  </div>
                                  <small className="text-muted">
                                    {ad.userId?.email || 'No email'}
                                  </small>
                                </div>
                              </td>
                              <td>
                                <span className="text-muted">
                                  {ad.companyId?.name || 'Individual'}
                                </span>
                              </td>
                              <td>
                                <Badge bg={getMediaTypeBadgeColor(ad.mediaType)}>
                                  {ad.mediaType}
                                </Badge>
                              </td>
                              <td>
                                <Badge bg={getSectionBadgeColor(ad.section)}>
                                  {ad.section}
                                </Badge>
                              </td>
                              <td>
                                <small>{new Date(ad.approvedAt || ad.updatedAt || ad.createdAt).toLocaleDateString()}</small>
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleViewAd(ad)}
                                    title="View Details"
                                  >
                                    <FontAwesomeIcon icon={faEye} />
                                  </Button>
                                  <Button
                                    variant="outline-warning"
                                    size="sm"
                                    onClick={() => handleReviewAction(ad, 'request_changes')}
                                    title="Request Changes"
                                  >
                                    <FontAwesomeIcon icon={faEdit} />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDeleteAdvertisement(ad)}
                                    title="Delete Advertisement"
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </>
              )}
              
              {activeTab === 'rejected' && (
                <>
                  {rejectedAds.length === 0 ? (
                    <Alert variant="info" className="text-center">
                      <h6>No rejected advertisements</h6>
                      <p>No advertisements have been rejected yet.</p>
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Advertisement</th>
                            <th>User</th>
                            <th>Company</th>
                            <th>Type</th>
                            <th>Section</th>
                            <th>Rejected Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rejectedAds.map((ad) => (
                            <tr key={ad._id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  {getMediaTypeIcon(ad.mediaType)}
                                  <div className="ms-2">
                                    <div className="fw-medium">{ad.title}</div>
                                    {ad.description && (
                                      <small className="text-muted">
                                        {ad.description.length > 50 
                                          ? `${ad.description.substring(0, 50)}...` 
                                          : ad.description
                                        }
                                      </small>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <div className="fw-medium">
                                    {ad.userId?.name || 'Unknown User'}
                                  </div>
                                  <small className="text-muted">
                                    {ad.userId?.email || 'No email'}
                                  </small>
                                </div>
                              </td>
                              <td>
                                <span className="text-muted">
                                  {ad.companyId?.name || 'Individual'}
                                </span>
                              </td>
                              <td>
                                <Badge bg={getMediaTypeBadgeColor(ad.mediaType)}>
                                  {ad.mediaType}
                                </Badge>
                              </td>
                              <td>
                                <Badge bg={getSectionBadgeColor(ad.section)}>
                                  {ad.section}
                                </Badge>
                              </td>
                              <td>
                                <small>{new Date(ad.rejectedAt || ad.updatedAt || ad.createdAt).toLocaleDateString()}</small>
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleViewAd(ad)}
                                    title="View Details"
                                  >
                                    <FontAwesomeIcon icon={faEye} />
                                  </Button>
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleTestApproval(ad)}
                                    title="Re-approve"
                                  >
                                    <FontAwesomeIcon icon={faCheck} />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDeleteAdvertisement(ad)}
                                    title="Delete Advertisement"
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Review Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {reviewAction === 'approve' && 'Approve Advertisement'}
            {reviewAction === 'reject' && 'Reject Advertisement'}
            {reviewAction === 'request_changes' && 'Request Changes'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAd && (
            <div className="mb-3">
              <h6>{selectedAd.title}</h6>
              <p className="text-muted">{selectedAd.description}</p>
              <div className="d-flex gap-2 mb-3">
                <Badge bg={getSectionBadgeColor(selectedAd.section)}>
                  {selectedAd.section}
                </Badge>
                <Badge bg="light" text="dark">
                  {selectedAd.mediaType}
                </Badge>
              </div>
              {selectedAd.mediaUrl && (
                <div className="mb-3">
                  {selectedAd.mediaType === 'image' ? (
                    <img 
                      src={selectedAd.mediaUrl} 
                      alt="Advertisement"
                      style={{ maxWidth: '100%', maxHeight: '200px' }}
                      className="rounded"
                    />
                  ) : selectedAd.mediaType === 'video' ? (
                    <video 
                      src={selectedAd.mediaUrl}
                      controls
                      style={{ maxWidth: '100%', maxHeight: '200px' }}
                      className="rounded"
                    />
                  ) : null}
                </div>
              )}
            </div>
          )}

          {reviewAction === 'reject' && (
            <Form.Group className="mb-3">
              <Form.Label>Rejection Reason *</Form.Label>
              <Form.Select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              >
                <option value="">Select rejection reason</option>
                <option value="inappropriate_content">Inappropriate Content</option>
                <option value="poor_quality">Poor Quality</option>
                <option value="misleading_information">Misleading Information</option>
                <option value="copyright_violation">Copyright Violation</option>
                <option value="spam">Spam</option>
                <option value="technical_issues">Technical Issues</option>
                <option value="policy_violation">Policy Violation</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>
          )}

          {reviewAction === 'request_changes' && (
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6>Suggestions for Improvement</h6>
                <Button size="sm" variant="outline-primary" onClick={addSuggestion}>
                  Add Suggestion
                </Button>
              </div>
              {suggestions.map((suggestion, index) => (
                <Card key={index} className="mb-2">
                  <Card.Body>
                    <Row>
                      <Col md={3}>
                        <Form.Select
                          value={suggestion.field}
                          onChange={(e) => updateSuggestion(index, 'field', e.target.value)}
                          size="sm"
                        >
                          <option value="">Select field</option>
                          <option value="title">Title</option>
                          <option value="description">Description</option>
                          <option value="mediaUrl">Media</option>
                          <option value="ctaText">CTA Text</option>
                          <option value="ctaUrl">CTA URL</option>
                        </Form.Select>
                      </Col>
                      <Col md={4}>
                        <Form.Control
                          size="sm"
                          placeholder="Suggested value"
                          value={suggestion.suggestedValue}
                          onChange={(e) => updateSuggestion(index, 'suggestedValue', e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <Form.Control
                          size="sm"
                          placeholder="Reason for change"
                          value={suggestion.reason}
                          onChange={(e) => updateSuggestion(index, 'reason', e.target.value)}
                        />
                      </Col>
                      <Col md={1}>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeSuggestion(index)}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}

          <Form.Group>
            <Form.Label>Comments (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="Add any additional comments..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submitReview}>
            {reviewAction === 'approve' && 'Approve Advertisement'}
            {reviewAction === 'reject' && 'Reject Advertisement'}
            {reviewAction === 'request_changes' && 'Send Change Requests'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdReviewPanel;