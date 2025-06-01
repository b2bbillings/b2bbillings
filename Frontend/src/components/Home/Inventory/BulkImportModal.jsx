import React, { useState } from 'react';
import { Modal, Form, Button, Alert, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUpload,
    faTimes,
    faDownload,
    faFileExcel,
    faCheckCircle,
    faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

function BulkImportModal({ show, onHide, categories, onProductsImported }) {
    const [importFile, setImportFile] = useState(null);
    const [importData, setImportData] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImportFile(file);
            parseCSVFile(file);
        }
    };

    const parseCSVFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const csvData = e.target.result;
            const lines = csvData.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

            const data = [];
            const errors = [];

            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                    const row = {};

                    headers.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });

                    // Validate row
                    const rowErrors = validateImportRow(row, i + 1);
                    if (rowErrors.length > 0) {
                        errors.push(...rowErrors);
                    }

                    data.push({ ...row, rowNumber: i + 1, isValid: rowErrors.length === 0 });
                }
            }

            setImportData(data);
            setImportErrors(errors);
        };
        reader.readAsText(file);
    };

    const validateImportRow = (row, rowNumber) => {
        const errors = [];

        if (!row.Name || row.Name.trim() === '') {
            errors.push({ row: rowNumber, field: 'Name', message: 'Product name is required' });
        }

        if (!row.Category || !categories.find(c => c.name === row.Category)) {
            errors.push({ row: rowNumber, field: 'Category', message: 'Invalid or missing category' });
        }

        if (!row.Price || isNaN(parseFloat(row.Price)) || parseFloat(row.Price) < 0) {
            errors.push({ row: rowNumber, field: 'Price', message: 'Valid price is required' });
        }

        if (row['Current Stock'] && isNaN(parseFloat(row['Current Stock']))) {
            errors.push({ row: rowNumber, field: 'Current Stock', message: 'Stock must be a number' });
        }

        return errors;
    };

    const handleImport = () => {
        if (importErrors.length > 0) {
            alert('Please fix all errors before importing');
            return;
        }

        setIsProcessing(true);

        const validProducts = importData.filter(row => row.isValid).map(row => ({
            id: Date.now() + Math.random(),
            name: row.Name,
            sku: generateSKU(row.Name),
            category: row.Category,
            price: parseFloat(row.Price) || 0,
            gstRate: parseFloat(row['GST Rate']) || 18,
            unit: row.Unit || 'piece',
            currentStock: parseFloat(row['Current Stock']) || 0,
            minStockLevel: parseFloat(row['Min Stock']) || 10,
            description: row.Description || '',
            isService: row.Type === 'Service',
            isActive: true,
            createdAt: new Date().toISOString()
        }));

        setTimeout(() => {
            onProductsImported(validProducts);
            setIsProcessing(false);
            handleClose();
            alert(`Successfully imported ${validProducts.length} products!`);
        }, 1500);
    };

    const generateSKU = (name) => {
        const base = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        const timestamp = Date.now().toString().slice(-3);
        return `${base}-${timestamp}`;
    };

    const handleClose = () => {
        setImportFile(null);
        setImportData([]);
        setImportErrors([]);
        setIsProcessing(false);
        onHide();
    };

    const downloadTemplate = () => {
        const headers = ['Name', 'Category', 'Price', 'GST Rate', 'Unit', 'Current Stock', 'Min Stock', 'Description', 'Type'];
        const sampleData = [
            ['Laptop Dell Inspiron', 'Electronics', '45000', '18', 'piece', '10', '5', 'Dell Inspiron 15 Laptop', 'Product'],
            ['Office Chair', 'Furniture', '8500', '12', 'piece', '15', '10', 'Executive Office Chair', 'Product'],
            ['Consultation Service', 'Services', '2000', '18', 'hour', '', '', 'Business Consultation', 'Service']
        ];

        const csvContent = [
            headers.join(','),
            ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'product_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    <FontAwesomeIcon icon={faUpload} className="me-2 text-primary" />
                    Bulk Import Products
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                {!importFile ? (
                    <>
                        {/* Upload Section */}
                        <div className="import-zone mb-4">
                            <div className="text-center">
                                <FontAwesomeIcon icon={faFileExcel} className="text-muted mb-3" size="3x" />
                                <h5>Upload CSV File</h5>
                                <p className="text-muted mb-3">
                                    Select a CSV file containing your product data
                                </p>
                                <Form.Control
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="mb-3"
                                />
                            </div>
                        </div>

                        {/* Download Template */}
                        <div className="text-center mb-4">
                            <Button
                                variant="outline-primary"
                                onClick={downloadTemplate}
                            >
                                <FontAwesomeIcon icon={faDownload} className="me-2" />
                                Download CSV Template
                            </Button>
                        </div>

                        {/* Instructions */}
                        <Alert variant="info">
                            <h6 className="fw-semibold mb-2">CSV Format Requirements:</h6>
                            <ul className="mb-0">
                                <li><strong>Required:</strong> Name, Category, Price</li>
                                <li><strong>Optional:</strong> GST Rate, Unit, Current Stock, Min Stock, Description</li>
                                <li><strong>Categories:</strong> Must match existing categories</li>
                                <li><strong>Type:</strong> "Product" or "Service" (default: Product)</li>
                            </ul>
                        </Alert>

                        {/* Available Categories */}
                        <div className="mb-3">
                            <h6 className="fw-semibold mb-2">Available Categories:</h6>
                            <div className="d-flex flex-wrap gap-1">
                                {categories.filter(c => c.isActive).map(category => (
                                    <Badge key={category.id} bg="light" text="dark">
                                        {category.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Import Preview */}
                        <div className="mb-4">
                            <h6 className="fw-semibold mb-3">
                                Import Preview - {importFile.name}
                                <Badge bg="secondary" className="ms-2">
                                    {importData.length} rows
                                </Badge>
                            </h6>

                            {/* Errors */}
                            {importErrors.length > 0 && (
                                <Alert variant="danger" className="mb-3">
                                    <h6 className="fw-semibold mb-2">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                        {importErrors.length} Error(s) Found:
                                    </h6>
                                    <ul className="mb-0">
                                        {importErrors.slice(0, 5).map((error, index) => (
                                            <li key={index}>
                                                Row {error.row}, {error.field}: {error.message}
                                            </li>
                                        ))}
                                        {importErrors.length > 5 && (
                                            <li>...and {importErrors.length - 5} more errors</li>
                                        )}
                                    </ul>
                                </Alert>
                            )}

                            {/* Success Message */}
                            {importErrors.length === 0 && importData.length > 0 && (
                                <Alert variant="success" className="mb-3">
                                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                    All {importData.length} products are valid and ready to import!
                                </Alert>
                            )}

                            {/* Preview Table */}
                            {importData.length > 0 && (
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <Table striped bordered hover size="sm">
                                        <thead>
                                            <tr>
                                                <th>Status</th>
                                                <th>Name</th>
                                                <th>Category</th>
                                                <th>Price</th>
                                                <th>Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importData.slice(0, 10).map((row, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <Badge bg={row.isValid ? 'success' : 'danger'}>
                                                            {row.isValid ? 'Valid' : 'Error'}
                                                        </Badge>
                                                    </td>
                                                    <td>{row.Name}</td>
                                                    <td>{row.Category}</td>
                                                    <td>₹{row.Price}</td>
                                                    <td>{row['Current Stock'] || '0'}</td>
                                                </tr>
                                            ))}
                                            {importData.length > 10 && (
                                                <tr>
                                                    <td colSpan="5" className="text-center text-muted">
                                                        ...and {importData.length - 10} more rows
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Action Buttons */}
                <div className="d-flex gap-3 justify-content-end">
                    <Button
                        variant="outline-secondary"
                        onClick={handleClose}
                        className="px-4"
                        disabled={isProcessing}
                    >
                        <FontAwesomeIcon icon={faTimes} className="me-2" />
                        Cancel
                    </Button>

                    {importFile && (
                        <>
                            <Button
                                variant="outline-primary"
                                onClick={() => setImportFile(null)}
                                disabled={isProcessing}
                            >
                                Choose Different File
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleImport}
                                disabled={importErrors.length > 0 || isProcessing}
                                className="px-4"
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faUpload} className="me-2" />
                                        Import {importData.filter(row => row.isValid).length} Products
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default BulkImportModal;