import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Card,
  ProgressBar,
  Badge,
  Spinner
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUpload,
  faImage,
  faVideo,
  faFont,
  faTimes,
  faCheck,
  faPlay,
  faPause
} from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import advertisementService from '../../services/advertisementService';
import './AdUploadModal.css';

const AdUploadModal = ({
  show,
  onHide,
  onAdCreated,
  onAdUpdated,
  addToast,
  currentUser,
  currentCompany,
  existingAd
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mediaType: 'image',
    section: 'banner',
    priority: 5,
    targetCategory: 'all_businesses',
    specificIndustry: '',
    ctaText: '',
    ctaUrl: '',
    startDate: '',
    endDate: '',
    budget: '',
    autoPlay: true,
    muted: true,
    showControls: true
  });

  // Prefill when editing
  React.useEffect(() => {
    if (existingAd) {
      setFormData(prev => ({
        ...prev,
        title: existingAd.title || '',
        description: existingAd.description || '',
        mediaType: existingAd.mediaType || 'image',
        section: existingAd.section || 'banner',
        priority: existingAd.priority || 5,
        targetCategory: existingAd.targetCategory || 'all_businesses',
        specificIndustry: existingAd.specificIndustry || '',
        ctaText: existingAd.ctaText || '',
        ctaUrl: existingAd.ctaUrl || '',
        startDate: existingAd.startDate ? new Date(existingAd.startDate).toISOString().substring(0,10) : '',
        endDate: existingAd.endDate ? new Date(existingAd.endDate).toISOString().substring(0,10) : '',
        budget: existingAd.budget || ''
      }));

      if (existingAd.mediaUrl) {
        setPreview(existingAd.mediaUrl.startsWith('/') ? existingAd.mediaUrl : existingAd.mediaUrl);
      }
    }
  }, [existingAd]);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Reset form when modal is closed
  const handleClose = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      mediaType: 'image',
      section: 'banner',
      priority: 5,
      targetCategory: 'all_businesses',
      specificIndustry: '',
      ctaText: '',
      ctaUrl: '',
      startDate: '',
      endDate: '',
      budget: '',
      autoPlay: true,
      muted: true,
      showControls: true
    });
    setFile(null);
    setPreview(null);
    setUploading(false);
    setUploadProgress(0);
    setErrors({});
    setIsSubmitting(false);
    onHide();
  }, [onHide]);

  // Handle form field changes
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [errors]);

  // Handle file selection
  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file
    const validationErrors = advertisementService.validateFile(selectedFile, formData.section);
    if (validationErrors.length > 0) {
      setErrors({ file: validationErrors.join(', ') });
      return;
    }

    setFile(selectedFile);
    setErrors(prev => ({ ...prev, file: '' }));

    // Create preview
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('video/')) {
      const videoURL = URL.createObjectURL(selectedFile);
      setPreview(videoURL);
    }
  }, [formData.section]);

  // Handle drag and drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] }
      };
      handleFileSelect(fakeEvent);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (formData.mediaType !== 'text' && !file && (!existingAd || !existingAd.mediaUrl)) {
      newErrors.file = 'Media file is required for image and video ads';
    }

    if (!formData.targetCategory) {
      newErrors.targetCategory = 'Target category is required';
    }

    if (formData.targetCategory === 'specific_industry' && !formData.specificIndustry.trim()) {
      newErrors.specificIndustry = 'Specific industry is required when target category is specific industry';
    }

    if (formData.ctaUrl && !isValidUrl(formData.ctaUrl)) {
      newErrors.ctaUrl = 'Please enter a valid URL';
    }

    if (formData.budget && (isNaN(formData.budget) || parseFloat(formData.budget) < 0)) {
      newErrors.budget = 'Budget must be a positive number';
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, file]);

  // Helper function to validate URL
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaUrl = existingAd?.mediaUrl || ''; // ✅ Preserve existing media URL
      let mediaSize = existingAd?.mediaSize || 0; // ✅ Preserve existing media size
      let mediaFormat = existingAd?.mediaFormat || ''; // ✅ Preserve existing media format

      // Upload media file if provided (user wants to change media)
      if (file && formData.mediaType !== 'text') {
        setUploading(true);
        const uploadResult = await advertisementService.uploadAdMedia(file, existingAd?._id);
        mediaUrl = uploadResult.data.mediaUrl;
        mediaSize = uploadResult.data.mediaSize;
        mediaFormat = uploadResult.data.mediaFormat;
        setUploading(false);
      }

      const adData = {
        ...formData,
        mediaUrl,
        mediaSize,
        mediaFormat,
        budget: formData.budget ? parseFloat(formData.budget) : 0
      };

      let result;
      if (existingAd) {
        result = await advertisementService.updateAd(existingAd._id, adData);
      } else {
        result = await advertisementService.createAd(adData);
      }

      // Show detailed success feedback
      if (addToast) {
        const successMessage = `✅ Advertisement "${formData.title}" created successfully!`;
        const statusMessage = result.data.isApproved 
          ? ' It is now live and visible to users.' 
          : ' It will be reviewed by administrators before going live.';
        
        addToast(successMessage + statusMessage, 'success');
      }

      // Call appropriate parent callback with ad data
      if (existingAd) {
        if (onAdUpdated) onAdUpdated(result.data);
      } else {
        if (onAdCreated) onAdCreated(result.data);
      }

      // Close modal after a brief delay to show success state
      setTimeout(() => {
        handleClose();
      }, 500);
      
    } catch (error) {
      console.error('Error creating advertisement:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to create advertisement';
      
      if (error.response?.status === 413) {
        errorMessage = 'File size is too large. Please choose a smaller file.';
      } else if (error.response?.status === 415) {
        errorMessage = 'File type not supported. Please choose a valid image or video file.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (addToast) {
        addToast(`❌ ${errorMessage}`, 'error');
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
  };

  // Get section info
  const getSectionInfo = (section) => {
    const info = {
      banner: {
        name: 'Main Banner',
        description: 'Large banner ad displayed prominently',
        maxSize: '10MB',
        dimensions: '1200x300px recommended'
      },
      sidebar: {
        name: 'Right Sidebar',
        description: 'Smaller ad displayed in the sidebar',
        maxSize: '5MB',
        dimensions: '300x250px recommended'
      },
      whatsapp: {
        name: 'WhatsApp Section',
        description: 'Compact ad in chat-like section',
        maxSize: '3MB',
        dimensions: '280x150px recommended'
      }
    };
    return info[section] || info.banner;
  };

  const sectionInfo = getSectionInfo(formData.section);

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      backdrop="static"
      keyboard={false}
      className="ad-upload-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faUpload} className="me-2" />
          Create New Advertisement
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {errors.submit && (
            <Alert variant="danger" className="mb-3">
              {errors.submit}
            </Alert>
          )}

          <Row>
            {/* Left Column - Form Fields */}
            <Col md={6}>
              {/* Basic Information */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Basic Information</h6>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Title *</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      isInvalid={!!errors.title}
                      placeholder="Enter ad title"
                      maxLength={100}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.title}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      {formData.title.length}/100 characters
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      isInvalid={!!errors.description}
                      placeholder="Enter ad description"
                      maxLength={500}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.description}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      {formData.description.length}/500 characters
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>

              {/* Media Type and Section */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Ad Placement & Type</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Media Type *</Form.Label>
                        <Form.Select
                          name="mediaType"
                          value={formData.mediaType}
                          onChange={handleInputChange}
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                          <option value="text">Text Only</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Section *</Form.Label>
                        <Form.Select
                          name="section"
                          value={formData.section}
                          onChange={handleInputChange}
                        >
                          <option value="banner">Main Banner</option>
                          <option value="sidebar">Right Sidebar</option>
                          <option value="whatsapp">WhatsApp Section</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Alert variant="info" className="mb-0">
                    <strong>{sectionInfo.name}</strong><br />
                    {sectionInfo.description}<br />
                    <small>
                      Max file size: {sectionInfo.maxSize} | 
                      Recommended: {sectionInfo.dimensions}
                    </small>
                  </Alert>
                </Card.Body>
              </Card>

              {/* Target Audience Category */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Target Audience</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Target Category *</Form.Label>
                        <Form.Select
                          name="targetCategory"
                          value={formData.targetCategory}
                          onChange={handleInputChange}
                          isInvalid={!!errors.targetCategory}
                        >
                          <option value="all_businesses">All Businesses</option>
                          <option value="retailers">Retailers</option>
                          <option value="wholesalers">Wholesalers</option>
                          <option value="manufacturers">Manufacturers</option>
                          <option value="distributors">Distributors</option>
                          <option value="importers">Importers</option>
                          <option value="exporters">Exporters</option>
                          <option value="service_providers">Service Providers</option>
                          <option value="consultants">Consultants</option>
                          <option value="freelancers">Freelancers</option>
                          <option value="startups">Startups</option>
                          <option value="established_companies">Established Companies</option>
                          <option value="specific_industry">Specific Industry</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.targetCategory}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          Choose which type of businesses you want to show your advertisement to
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Specific Industry Input - Show only when targetCategory is 'specific_industry' */}
                  {formData.targetCategory === 'specific_industry' && (
                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Specific Industry *</Form.Label>
                          <Form.Control
                            type="text"
                            name="specificIndustry"
                            value={formData.specificIndustry}
                            onChange={handleInputChange}
                            isInvalid={!!errors.specificIndustry}
                            placeholder="e.g., Textile Manufacturing, Food Processing, IT Services"
                            maxLength={100}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.specificIndustry}
                          </Form.Control.Feedback>
                          <Form.Text className="text-muted">
                            Enter the specific industry you want to target
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  )}

                  <Alert variant="success" className="mb-0">
                    <small>
                      <strong>Tip:</strong> Targeting specific categories helps your ad reach the most relevant audience, 
                      improving engagement and return on investment.
                    </small>
                  </Alert>
                </Card.Body>
              </Card>
            </Col>

            {/* Right Column - Media Upload and Preview */}
            <Col md={6}>
              {/* Media Upload */}
              {formData.mediaType !== 'text' && (
                <Card className="mb-3">
                  <Card.Header>
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={formData.mediaType === 'image' ? faImage : faVideo} className="me-2" />
                      {existingAd ? 'Update Media (Optional)' : 'Media Upload *'}
                    </h6>
                    {existingAd && (
                      <small className="text-muted">
                        Current media will be kept if no new file is uploaded
                      </small>
                    )}
                  </Card.Header>
                  <Card.Body>
                    {!file && existingAd && preview ? (
                      // Show current media when editing
                      <div className="current-media-preview mb-3">
                        <div className="preview-header d-flex justify-content-between align-items-center mb-2">
                          <Badge bg="info">
                            <FontAwesomeIcon icon={faCheck} className="me-1" />
                            Current Media
                          </Badge>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Change Media
                          </Button>
                        </div>
                        
                        {preview && (
                          <div className="preview-content">
                            {formData.mediaType === 'image' ? (
                              <img
                                src={preview}
                                alt="Current Advertisement"
                                className="img-fluid rounded"
                                style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <video
                                src={preview}
                                className="w-100 rounded"
                                style={{ maxHeight: '200px' }}
                                controls
                                muted
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ) : !file ? (
                      <div
                        className="file-drop-zone"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FontAwesomeIcon icon={faUpload} size="2x" className="mb-2 text-muted" />
                        <p className="mb-2">
                          {existingAd 
                            ? `Upload new ${formData.mediaType} to replace current media`
                            : `Drop your ${formData.mediaType} here or click to browse`
                          }
                        </p>
                        <small className="text-muted">
                          Max size: {sectionInfo.maxSize}
                        </small>
                      </div>
                    ) : (
                      <div className="file-preview">
                        <div className="preview-header d-flex justify-content-between align-items-center mb-2">
                          <Badge bg="success">
                            <FontAwesomeIcon icon={faCheck} className="me-1" />
                            File Selected
                          </Badge>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => {
                              setFile(null);
                              setPreview(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </Button>
                        </div>
                        
                        {preview && (
                          <div className="preview-content">
                            {formData.mediaType === 'image' ? (
                              <img
                                src={preview}
                                alt="Preview"
                                className="img-fluid rounded"
                                style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <video
                                ref={videoRef}
                                src={preview}
                                className="w-100 rounded"
                                style={{ maxHeight: '200px' }}
                                controls
                                muted
                              />
                            )}
                          </div>
                        )}
                        
                        <div className="file-info mt-2">
                          <small className="text-muted">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </small>
                        </div>
                      </div>
                    )}

                    <Form.Control
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept={formData.mediaType === 'image' ? 'image/*' : 'video/*'}
                      className="d-none"
                    />

                    {errors.file && (
                      <Alert variant="danger" className="mt-2 mb-0">
                        {errors.file}
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              )}

              {/* Video Settings */}
              {formData.mediaType === 'video' && (
                <Card className="mb-3">
                  <Card.Header>
                    <h6 className="mb-0">Video Settings</h6>
                  </Card.Header>
                  <Card.Body>
                    <Form.Check
                      type="switch"
                      id="autoPlay"
                      name="autoPlay"
                      label="Auto Play"
                      checked={formData.autoPlay}
                      onChange={handleInputChange}
                      className="mb-2"
                    />
                    <Form.Check
                      type="switch"
                      id="muted"
                      name="muted"
                      label="Muted by default"
                      checked={formData.muted}
                      onChange={handleInputChange}
                      className="mb-2"
                    />
                    <Form.Check
                      type="switch"
                      id="showControls"
                      name="showControls"
                      label="Show controls"
                      checked={formData.showControls}
                      onChange={handleInputChange}
                    />
                  </Card.Body>
                </Card>
              )}

              {/* Additional Settings */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Additional Settings</h6>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Priority (1-10)</Form.Label>
                    <Form.Range
                      name="priority"
                      min={1}
                      max={10}
                      value={formData.priority}
                      onChange={handleInputChange}
                    />
                    <div className="d-flex justify-content-between">
                      <small>Low (1)</small>
                      <strong>{formData.priority}</strong>
                      <small>High (10)</small>
                    </div>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Start Date</Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>End Date</Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleInputChange}
                          isInvalid={!!errors.endDate}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.endDate}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-0">
                    <Form.Label>Budget (Optional)</Form.Label>
                    <Form.Control
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      isInvalid={!!errors.budget}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.budget}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Card.Body>
              </Card>

              {/* Call to Action */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Call to Action</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>CTA Text</Form.Label>
                        <Form.Control
                          type="text"
                          name="ctaText"
                          value={formData.ctaText}
                          onChange={handleInputChange}
                          placeholder="Learn More"
                          maxLength={50}
                        />
                        <Form.Text className="text-muted">
                          {formData.ctaText.length}/50 characters
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>CTA URL</Form.Label>
                        <Form.Control
                          type="url"
                          name="ctaUrl"
                          value={formData.ctaUrl}
                          onChange={handleInputChange}
                          isInvalid={!!errors.ctaUrl}
                          placeholder="https://example.com"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.ctaUrl}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Upload Progress */}
          {uploading && (
            <Card className="mt-3">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span>Uploading media...</span>
                </div>
                <ProgressBar 
                  now={uploadProgress} 
                  label={`${uploadProgress}%`}
                  className="mt-2"
                />
              </Card.Body>
            </Card>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={isSubmitting || uploading}
          >
            {isSubmitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Creating...
              </>
            ) : (
              'Create Advertisement'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

AdUploadModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onAdCreated: PropTypes.func,
  addToast: PropTypes.func,
  currentUser: PropTypes.object,
  currentCompany: PropTypes.object
};

export default AdUploadModal;