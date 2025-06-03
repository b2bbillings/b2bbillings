import React, { useRef, useState } from 'react';
import { Form, Button, Card, Row, Col, Alert, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileUpload, faFile, faEye, faDownload,
    faTrash, faExclamationTriangle, faPlus
} from '@fortawesome/free-solid-svg-icons';
// import './DocumentsStep.css';

function DocumentsStep({
    documents,
    handleDocumentUpload,
    handleDocumentTypeChange,
    removeDocument,
    handleAddDocumentsWithType, // New prop from parent
    handleRemoveAllDocuments, // New prop from parent
    viewDocument,
    downloadDocument,
    formatFileSize,
    documentTypes,
    errors
}) {
    const documentInputRef = useRef(null);
    const [selectedDocType, setSelectedDocType] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    // Modified handler to directly apply document type during upload
    const handleTypedDocumentUpload = async (event) => {
        if (!selectedDocType) {
            alert("Please select a document type first");
            return;
        }

        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsUploading(true);

        try {
            // Create document objects with the selected type
            const newDocs = [];

            for (const file of files) {
                const docId = Date.now() + Math.random();

                // Read file as data URL
                const dataUrl = await readFileAsDataURL(file);

                // Create new document with type already assigned
                const newDocument = {
                    id: docId,
                    name: file.name,
                    type: selectedDocType, // Pre-assign the selected type
                    size: file.size,
                    data: dataUrl,
                    uploadDate: new Date().toISOString()
                };

                newDocs.push(newDocument);
            }

            // Now use the parent component's handler to add these documents
            handleAddDocumentsWithType(newDocs);

            // Reset input and selected type
            event.target.value = '';
            setSelectedDocType("");
        } catch (error) {
            console.error("Error uploading documents:", error);
        } finally {
            setIsUploading(false);
        }
    };

    // Function to read a file as data URL (promise-based)
    const readFileAsDataURL = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    };

    // Group documents by type
    const groupedDocuments = documents.reduce((groups, doc) => {
        const type = doc.type || "Uncategorized";
        if (!groups[type]) groups[type] = [];
        groups[type].push(doc);
        return groups;
    }, {});

    return (
        <div className="step-content-modern">
            <Card className="mb-4">
                <Card.Body>
                    <h6 className="text-primary mb-4">Add New Document</h6>

                    <Row className="align-items-end mb-4">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>1. Select Document Type <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                    value={selectedDocType}
                                    onChange={(e) => setSelectedDocType(e.target.value)}
                                    disabled={isUploading}
                                >
                                    <option value="">Choose document type...</option>
                                    {documentTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>2. Upload Document File <span className="text-danger">*</span></Form.Label>
                                <InputGroup>
                                    <input
                                        type="file"
                                        ref={documentInputRef}
                                        onChange={handleTypedDocumentUpload}
                                        className="d-none"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        disabled={isUploading}
                                    />
                                    <Button
                                        variant="primary"
                                        onClick={() => documentInputRef.current.click()}
                                        disabled={!selectedDocType || isUploading}
                                        className="w-100"
                                    >
                                        <FontAwesomeIcon icon={faFileUpload} className="me-2" />
                                        {isUploading ? "Uploading..." :
                                            selectedDocType ? `Upload ${selectedDocType}` : 'Select Type First'}
                                    </Button>
                                </InputGroup>
                                <Form.Text className="text-muted">
                                    Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    {errors.documents && (
                        <Alert variant="danger" className="mb-4">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                            {errors.documents}
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            {documents.length > 0 && (
                <Card>
                    <Card.Body>
                        <h6 className="mb-4">Uploaded Documents ({documents.length})</h6>

                        {/* Show documents grouped by type */}
                        {Object.entries(groupedDocuments).map(([type, docs]) => (
                            <div key={type} className="document-group mb-4">
                                <h6 className="document-group-title">
                                    <span className="badge bg-primary me-2">{docs.length}</span>
                                    {type}
                                </h6>

                                {docs.map(document => (
                                    <Card key={document.id} className="document-card mb-3">
                                        <Card.Body>
                                            <Row className="align-items-center">
                                                <Col md={6}>
                                                    <div className="d-flex align-items-center">
                                                        <FontAwesomeIcon icon={faFile} className="text-primary me-3" size="2x" />
                                                        <div>
                                                            <h6 className="mb-1">{document.name}</h6>
                                                            <small className="text-muted">
                                                                {formatFileSize(document.size)}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </Col>
                                                <Col md={3}>
                                                    <Form.Select
                                                        value={document.type || ""}
                                                        onChange={(e) => handleDocumentTypeChange(document.id, e.target.value)}
                                                        size="sm"
                                                    >
                                                        <option value="">Select Document Type</option>
                                                        {documentTypes.map(type => (
                                                            <option key={type} value={type}>{type}</option>
                                                        ))}
                                                    </Form.Select>
                                                </Col>
                                                <Col md={3}>
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <Button variant="outline-info" size="sm" onClick={() => viewDocument(document)}>
                                                            <FontAwesomeIcon icon={faEye} />
                                                        </Button>
                                                        <Button variant="outline-success" size="sm" onClick={() => downloadDocument(document)}>
                                                            <FontAwesomeIcon icon={faDownload} />
                                                        </Button>
                                                        <Button variant="outline-danger" size="sm" onClick={() => removeDocument(document.id)}>
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </Button>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        ))}

                        {/* Add bulk action buttons if needed */}
                        {documents.length > 1 && (
                            <div className="d-flex justify-content-end mt-3">
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="me-2"
                                    onClick={handleRemoveAllDocuments}
                                >
                                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                                    Remove All
                                </Button>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            )}

            {/* If no documents, show empty state with action button */}
            {documents.length === 0 && (
                <div className="text-center py-5 bg-light rounded">
                    <FontAwesomeIcon icon={faFile} size="3x" className="text-secondary mb-3" />
                    <h5>No Documents Uploaded</h5>
                    <p className="text-muted mb-4">Select a document type above and upload files</p>
                    <Button
                        variant="primary"
                        onClick={() => {
                            if (!selectedDocType) {
                                alert("Please select a document type first");
                            } else {
                                documentInputRef.current.click();
                            }
                        }}
                        disabled={isUploading}
                    >
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Add Document
                    </Button>
                </div>
            )}
        </div>
    );
}

export default DocumentsStep;