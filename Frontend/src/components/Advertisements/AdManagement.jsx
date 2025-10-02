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
  Dropdown
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faPlay,
  faPause,
  faChartBar,
  faImage,
  faVideo,
  faFont,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import AdUploadModal from '../Advertisements/AdUploadModal';
import AdAnalyticsModal from '../Advertisements/AdAnalyticsModal';
import advertisementService from '../../services/advertisementService';
import './AdManagement.css';

const AdManagement = ({ 
  addToast = (message, type) => console.log(`Toast: ${type} - ${message}`), 
  currentUser, 
  currentCompany 
}) => {
  // Debug logging
  console.log('AdManagement component rendering with props:', { currentUser, currentCompany });

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsAdId, setAnalyticsAdId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAd, setDeletingAd] = useState(null);
  const [error, setError] = useState('');

  // Simple render test
  if (!currentUser) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <h5>Authentication Required</h5>
          <p>Please log in to manage your advertisements.</p>
        </Alert>
      </Container>
    );
  }

  // Load user's advertisements
  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading all ads, will filter by section:', selectedSection);
      
      // Always load all user ads, then filter on frontend
      const response = await advertisementService.getUserAds();
      
      console.log('Loaded all ads:', response);
      setAds(response.data || []);
    } catch (error) {
      console.error('Error loading ads:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load advertisements';
      setError(errorMessage);
      
      if (addToast) {
        addToast(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [addToast]); // ✅ Removed selectedSection dependency to avoid re-loading on section change

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  // Handle ad creation
  const handleAdCreated = useCallback((newAd) => {
    console.log('New ad created:', newAd);
    
    // Add new ad to the beginning of the list
    setAds(prev => [newAd, ...prev]);
    
    // Close the upload modal
    setShowUploadModal(false);
    setEditingAd(null);
    
    // Show success notification
    if (addToast) {
      addToast(
        `Advertisement "${newAd.title}" created successfully! ${
          newAd.isApproved ? 'It is now live.' : 'It will be reviewed before going live.'
        }`,
        'success'
      );
    }
    
    // Reload ads to get the latest data
    setTimeout(() => {
      loadAds();
    }, 1000);
  }, [addToast, loadAds]);

  // Handle ad deletion
  const handleDeleteClick = useCallback((ad) => {
    setDeletingAd(ad);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingAd) return;

    try {
      await advertisementService.deleteAd(deletingAd._id);
      setAds(prev => prev.filter(ad => ad._id !== deletingAd._id));
      
      if (addToast) {
        addToast('Advertisement deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting ad:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete advertisement';
      
      if (addToast) {
        addToast(errorMessage, 'error');
      }
    } finally {
      setShowDeleteModal(false);
      setDeletingAd(null);
    }
  }, [deletingAd, addToast]);

  // Handle ad status toggle
  const handleStatusToggle = useCallback(async (ad) => {
    try {
      const updatedAd = await advertisementService.updateAd(ad._id, {
        isActive: !ad.isActive
      });
      
      setAds(prev => prev.map(a => a._id === ad._id ? updatedAd.data : a));
      
      if (addToast) {
        addToast(
          `Advertisement ${updatedAd.data.isActive ? 'activated' : 'deactivated'} successfully`,
          'success'
        );
      }
    } catch (error) {
      console.error('Error updating ad status:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update advertisement';
      
      if (addToast) {
        addToast(errorMessage, 'error');
      }
    }
  }, [addToast]);

  // Get status badge
  const getStatusBadge = (ad) => {
    if (!ad.isActive) {
      return <Badge bg="secondary">Inactive</Badge>;
    } else if (ad.isRejected) {
      return <Badge bg="danger">Rejected</Badge>;
    } else if (ad.hasChangeRequests) {
      return <Badge bg="warning">Changes Requested</Badge>;
    } else if (!ad.isApproved) {
      return <Badge bg="info">Pending Approval</Badge>;
    } else if (ad.isBlocked) {
      return <Badge bg="danger">Blocked</Badge>;
    } else {
      return <Badge bg="success">Active</Badge>;
    }
  };

  // Get status message for user
  const getStatusMessage = (ad) => {
    if (ad.isRejected) {
      let rejectionDetails = ad.rejectionReason || 'Please check with admin for details.';
      
      // If there's review history, get the latest rejection details
      if (ad.reviewHistory && ad.reviewHistory.length > 0) {
        const latestRejection = ad.reviewHistory
          .filter(review => review.action === 'rejected')
          .pop();
        
        if (latestRejection && latestRejection.comments) {
          rejectionDetails = latestRejection.comments;
        }
      }
      
      return {
        type: 'danger',
        message: 'Your advertisement was rejected.',
        details: rejectionDetails
      };
    } else if (ad.hasChangeRequests) {
      const latestRequest = ad.changeRequests && ad.changeRequests.length > 0 
        ? ad.changeRequests[ad.changeRequests.length - 1] 
        : null;
      
      let feedbackText = 'Please review the admin feedback and make the necessary changes.';
      
      if (latestRequest) {
        const suggestions = latestRequest.suggestions || [];
        const comments = latestRequest.comments;
        
        if (suggestions.length > 0) {
          feedbackText = `Admin suggestions: ${suggestions.join(', ')}`;
          if (comments) {
            feedbackText += `. Additional comments: ${comments}`;
          }
        } else if (comments) {
          feedbackText = `Admin feedback: ${comments}`;
        }
      }
      
      return {
        type: 'warning',
        message: 'Your advertisement needs some changes to be approved.',
        details: feedbackText
      };
    } else if (!ad.isApproved) {
      return {
        type: 'info',
        message: 'Your advertisement is pending approval.',
        details: 'It will be reviewed by our team and will go live once approved.'
      };
    } else if (ad.isApproved && ad.isActive) {
      return {
        type: 'success',
        message: 'Your advertisement is approved and active.',
        details: 'It is currently visible to users in the selected section.'
      };
    } else {
      return null;
    }
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
      case 'banner':
        return 'primary';
      case 'sidebar':
        return 'info';
      case 'whatsapp':
        return 'success';
      default:
        return 'secondary';
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

  // Filter ads by section
  const filteredAds = selectedSection === 'all' 
    ? ads 
    : ads.filter(ad => ad.section === selectedSection);

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <p>Loading advertisements...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 ad-management">
      {/* Debug info - remove in production */}
      <Alert variant="info" className="mb-3">
        <strong>Ad Management</strong> - Component loaded successfully!
        <br />
        <small>User: {currentUser?.email || 'Not logged in'}</small>
        <br />
        <small>Selected Section: {selectedSection}</small>
        <br />
        <small>Total Ads: {ads.length}</small>
      </Alert>

      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">My Advertisements</h5>
                <small className="text-muted">
                  Manage your advertising campaigns across different sections
                </small>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowUploadModal(true)}
                className="d-flex align-items-center gap-2"
              >
                <FontAwesomeIcon icon={faPlus} />
                Create Ad
              </Button>
            </Card.Header>

            <Card.Body>
              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}

              {/* Section Filter */}
              <div className="mb-3">
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    variant={selectedSection === 'all' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setSelectedSection('all')}
                  >
                    All Sections ({ads.length})
                  </Button>
                  <Button
                    variant={selectedSection === 'banner' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setSelectedSection('banner')}
                  >
                    Banner ({ads.filter(ad => ad.section === 'banner').length})
                  </Button>
                  <Button
                    variant={selectedSection === 'sidebar' ? 'info' : 'outline-info'}
                    size="sm"
                    onClick={() => setSelectedSection('sidebar')}
                  >
                    Sidebar ({ads.filter(ad => ad.section === 'sidebar').length})
                  </Button>
                  <Button
                    variant={selectedSection === 'whatsapp' ? 'success' : 'outline-success'}
                    size="sm"
                    onClick={() => setSelectedSection('whatsapp')}
                  >
                    WhatsApp ({ads.filter(ad => ad.section === 'whatsapp').length})
                  </Button>
                </div>
              </div>

              {/* Status Messages for ads needing attention */}
              {filteredAds.some(ad => ad.hasChangeRequests || ad.isRejected) && (
                <Alert variant="warning" className="mb-3">
                  <Alert.Heading className="h6">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    Action Required
                  </Alert.Heading>
                  <p className="mb-2">Some of your advertisements need attention:</p>
                  <ul className="mb-0">
                    {filteredAds.filter(ad => ad.hasChangeRequests).map(ad => (
                      <li key={`changes-${ad._id}`}>
                        <strong>{ad.title}</strong> - Changes requested by admin. Please edit and resubmit.
                      </li>
                    ))}
                    {filteredAds.filter(ad => ad.isRejected).map(ad => (
                      <li key={`rejected-${ad._id}`}>
                        <strong>{ad.title}</strong> - Rejected. Reason: {ad.rejectionReason || 'Contact admin for details.'}
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {/* Advertisements Table */}
              {filteredAds.length === 0 ? (
                <Alert variant="info" className="text-center">
                  <h6>No advertisements found</h6>
                  <p className="mb-3">
                    {selectedSection === 'all' 
                      ? "You haven't created any advertisements yet."
                      : `No advertisements in the ${selectedSection} section.`
                    }
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowUploadModal(true)}
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Create Your First Ad
                  </Button>
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Section</th>
                        <th>Target Category</th>
                        <th>Status</th>
                        <th>Impressions</th>
                        <th>Clicks</th>
                        <th>CTR</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAds.map((ad) => (
                        <tr key={ad._id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {getMediaTypeIcon(ad.mediaType)}
                              <div>
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
                            <Badge bg="info" className="text-capitalize">
                              {formatTargetCategory(ad.targetCategory)}
                            </Badge>
                            {ad.targetCategory === 'specific_industry' && ad.specificIndustry && (
                              <div className="text-muted small mt-1">
                                {ad.specificIndustry}
                              </div>
                            )}
                          </td>
                          <td>{getStatusBadge(ad)}</td>
                          <td>{ad.impressions || 0}</td>
                          <td>{ad.clicks || 0}</td>
                          <td>
                            {ad.impressions > 0 
                              ? `${((ad.clicks / ad.impressions) * 100).toFixed(1)}%`
                              : '0%'
                            }
                          </td>
                          <td>
                            <small className="text-muted">
                              {new Date(ad.createdAt).toLocaleDateString()}
                            </small>
                          </td>
                          <td>
                            <Dropdown align="end">
                              <Dropdown.Toggle variant="outline-secondary" size="sm" className="actions-toggle">
                                Actions
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item
                                  onClick={() => handleStatusToggle(ad)}
                                >
                                  <FontAwesomeIcon 
                                    icon={ad.isActive ? faPause : faPlay} 
                                    className="me-2" 
                                  />
                                  {ad.isActive ? 'Deactivate' : 'Activate'}
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() => {
                                    setAnalyticsAdId(ad._id);
                                    setShowAnalyticsModal(true);
                                  }}
                                >
                                  <FontAwesomeIcon icon={faChartBar} className="me-2" />
                                  Analytics
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() => {
                                    setEditingAd(ad);
                                    setShowUploadModal(true);
                                  }}
                                >
                                  <FontAwesomeIcon icon={faEdit} className="me-2" />
                                  Edit
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  onClick={() => handleDeleteClick(ad)}
                                  className="text-danger"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="me-2" />
                                  Delete
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Upload Modal */}
      <AdUploadModal
        show={showUploadModal}
        onHide={() => {
          setShowUploadModal(false);
          setEditingAd(null);
        }}
        onAdCreated={handleAdCreated}
        onAdUpdated={(updatedAd) => {
          setAds(prev => prev.map(a => a._id === updatedAd._id ? updatedAd : a));
          setShowUploadModal(false);
          setEditingAd(null);
          if (addToast) addToast('Advertisement updated successfully', 'success');
        }}
        existingAd={editingAd}
        addToast={addToast}
        currentUser={currentUser}
        currentCompany={currentCompany}
      />

      <AdAnalyticsModal
        show={showAnalyticsModal}
        onHide={() => setShowAnalyticsModal(false)}
        adId={analyticsAdId}
      />

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this advertisement?</p>
          {deletingAd && (
            <div className="p-3 bg-light rounded">
              <strong>{deletingAd.title}</strong>
              <br />
              <small className="text-muted">
                Section: {deletingAd.section} | Type: {deletingAd.mediaType}
              </small>
            </div>
          )}
          <p className="text-danger mt-2 mb-0">
            <small>This action cannot be undone.</small>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            <FontAwesomeIcon icon={faTrash} className="me-2" />
            Delete Advertisement
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

AdManagement.propTypes = {
  addToast: PropTypes.func,
  currentUser: PropTypes.object,
  currentCompany: PropTypes.object
};

export default AdManagement;