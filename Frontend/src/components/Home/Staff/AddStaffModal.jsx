import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave, faUserTie, faTimes, faArrowLeft, faArrowRight,
    faUser, faHome, faFileAlt, faBriefcase, faKey, faShieldAlt, faCheck
} from '@fortawesome/free-solid-svg-icons';

// Import Step Components
import StepNavigation from './Steps/StepNavigation';
import BasicInformationStep from './Steps/BasicInformationStep';
import AddressDetailsStep from './Steps/AddressDetailsStep';
import EmploymentInfoStep from './Steps/EmploymentInfoStep';
import DocumentsStep from './Steps/DocumentsStep';
import SystemAccessStep from './Steps/SystemAccessStep';
import AccountSetupStep from './Steps/AccountSetupStep';

import './AddStaffModal.css';

function AddStaffModal({ show, onHide, onSave, editMode = false, staffData = null }) {
    // Current step in the wizard
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 6;

    // Form state
    const [formData, setFormData] = useState({
        // Basic Information
        name: '',
        role: 'salesperson',
        post: '',
        mobileNumbers: [''],
        email: '',

        // Address Information
        address: '',
        city: '',
        state: '',
        taluka: '',
        pincode: '',

        // Employment Details
        joinDate: new Date().toISOString().split('T')[0],
        salary: '',
        department: '',
        reportingTo: '',

        // Documents
        documents: [],

        // System Access
        permissions: [],

        // Login Credentials
        password: '',
        confirmPassword: '',

        // Profile
        avatar: null,
        employeeId: '',
        status: 'active'
    });

    // Form validation
    const [errors, setErrors] = useState({});
    const [stepValidation, setStepValidation] = useState({
        1: false, 2: false, 3: false, 4: false, 5: false, 6: false
    });

    // Configuration options
    const roleOptions = [
        { value: 'admin', label: 'Admin', color: '#dc3545' },
        { value: 'manager', label: 'Manager', color: '#fd7e14' },
        { value: 'supervisor', label: 'Supervisor', color: '#ffc107' },
        { value: 'cashier', label: 'Cashier', color: '#20c997' },
        { value: 'salesperson', label: 'Sales Person', color: '#0dcaf0' },
        { value: 'inventory', label: 'Inventory Manager', color: '#6f42c1' },
        { value: 'accountant', label: 'Accountant', color: '#198754' },
        { value: 'delivery', label: 'Delivery Person', color: '#0d6efd' },
        { value: 'security', label: 'Security Guard', color: '#6c757d' },
        { value: 'cleaner', label: 'Cleaner', color: '#495057' },
        { value: 'technician', label: 'Technician', color: '#e83e8c' }
    ];

    const postOptions = [
        { value: 'junior', label: 'Junior' },
        { value: 'senior', label: 'Senior' },
        { value: 'assistant', label: 'Assistant' },
        { value: 'executive', label: 'Executive' },
        { value: 'officer', label: 'Officer' },
        { value: 'head', label: 'Head' },
        { value: 'lead', label: 'Lead' },
        { value: 'trainee', label: 'Trainee' }
    ];

    const stateOptions = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
        'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
        'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
        'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
        'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
        'Ladakh', 'Puducherry', 'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu',
        'Lakshadweep', 'Andaman and Nicobar Islands'
    ];

    const documentTypes = [
        'Aadhar Card', 'PAN Card', 'Voter ID', 'Driving License', 'Passport',
        'Bank Passbook', 'Educational Certificate', 'Experience Letter',
        'Relieving Letter', 'Medical Certificate', 'Police Verification',
        'Character Certificate', 'Other'
    ];

    const permissionOptions = [
        { value: 'dashboard', label: 'Dashboard Access', description: 'View dashboard and analytics' },
        { value: 'sales', label: 'Sales Management', description: 'Create and manage sales transactions' },
        { value: 'purchases', label: 'Purchase Management', description: 'Handle purchase orders and suppliers' },
        { value: 'inventory', label: 'Inventory Management', description: 'Manage stock and inventory operations' },
        { value: 'customers', label: 'Customer Management', description: 'Manage customer relationships' },
        { value: 'suppliers', label: 'Supplier Management', description: 'Handle supplier information' },
        { value: 'staff', label: 'Staff Management', description: 'Manage employee records and access' },
        { value: 'reports', label: 'Reports Access', description: 'Generate and view business reports' },
        { value: 'settings', label: 'Settings Access', description: 'Configure system settings' }
    ];

    const departments = [
        'Sales', 'Marketing', 'Finance', 'Operations', 'Human Resources',
        'IT', 'Customer Service', 'Inventory', 'Security', 'Administration'
    ];

    // Step configuration
    const steps = [
        {
            id: 1,
            title: 'Basic Information',
            icon: faUser,
            description: 'Employee personal details'
        },
        {
            id: 2,
            title: 'Address Details',
            icon: faHome,
            description: 'Contact and address information'
        },
        {
            id: 3,
            title: 'Employment Info',
            icon: faBriefcase,
            description: 'Job details and compensation'
        },
        {
            id: 4,
            title: 'Documents',
            icon: faFileAlt,
            description: 'Upload required documents'
        },
        {
            id: 5,
            title: 'System Access',
            icon: faShieldAlt,
            description: 'Permissions and access rights'
        },
        {
            id: 6,
            title: 'Account Setup',
            icon: faKey,
            description: 'Login credentials and final review'
        }
    ];

    // Generate Employee ID
    const generateEmployeeId = () => {
        const prefix = 'EMP';
        const year = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}${year}${random}`;
    };

    // Initialize form data
    useEffect(() => {
        if (editMode && staffData) {
            const staffToEdit = { ...staffData };
            if (!staffToEdit.permissions) staffToEdit.permissions = [];
            if (!staffToEdit.mobileNumbers) staffToEdit.mobileNumbers = [''];
            if (!staffToEdit.documents) staffToEdit.documents = [];

            setFormData({
                ...formData,
                ...staffToEdit,
                password: '',
                confirmPassword: ''
            });
        } else {
            setFormData({
                name: '',
                role: 'salesperson',
                post: '',
                mobileNumbers: [''],
                email: '',
                address: '',
                city: '',
                state: '',
                taluka: '',
                pincode: '',
                joinDate: new Date().toISOString().split('T')[0],
                salary: '',
                department: '',
                reportingTo: '',
                documents: [],
                permissions: [],
                password: '',
                confirmPassword: '',
                avatar: null,
                employeeId: '',
                status: 'active'
            });
        }

        setCurrentStep(1);
        setErrors({});
        setStepValidation({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false });
    }, [show, editMode, staffData]);

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            if (name === 'permissions') {
                const permissionValue = e.target.value;
                setFormData(prevState => {
                    const updatedPermissions = checked
                        ? [...prevState.permissions, permissionValue]
                        : prevState.permissions.filter(p => p !== permissionValue);
                    return { ...prevState, permissions: updatedPermissions };
                });
            } else {
                setFormData(prevState => ({ ...prevState, [name]: checked }));
            }
        } else {
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }

        // Clear specific error
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Mobile number handlers
    const handleMobileNumberChange = (index, value) => {
        const newMobileNumbers = [...formData.mobileNumbers];
        newMobileNumbers[index] = value;
        setFormData(prev => ({ ...prev, mobileNumbers: newMobileNumbers }));

        if (errors.mobileNumbers) {
            setErrors(prev => ({ ...prev, mobileNumbers: null }));
        }
    };

    const addMobileNumber = () => {
        setFormData(prev => ({
            ...prev,
            mobileNumbers: [...prev.mobileNumbers, '']
        }));
    };

    const removeMobileNumber = (index) => {
        if (formData.mobileNumbers.length > 1) {
            const newMobileNumbers = formData.mobileNumbers.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, mobileNumbers: newMobileNumbers }));
        }
    };

    // Avatar handlers
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            setErrors(prev => ({ ...prev, avatar: 'Please select an image file' }));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setFormData(prev => ({ ...prev, avatar: e.target.result }));
            if (errors.avatar) {
                setErrors(prev => ({ ...prev, avatar: null }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAvatar = () => {
        setFormData(prev => ({ ...prev, avatar: null }));
    };

    // Document handlers
    const handleDocumentUpload = (e) => {
        const files = Array.from(e.target.files);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newDocument = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    type: '',
                    size: file.size,
                    data: e.target.result,
                    uploadDate: new Date().toISOString()
                };

                setFormData(prev => ({
                    ...prev,
                    documents: [...prev.documents, newDocument]
                }));
            };
            reader.readAsDataURL(file);
        });

        if (errors.documents) {
            setErrors(prev => ({ ...prev, documents: null }));
        }
    };

    // New handler for adding documents with type pre-assigned
    const handleAddDocumentsWithType = (newDocuments) => {
        setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, ...newDocuments]
        }));

        if (errors.documents) {
            setErrors(prev => ({ ...prev, documents: null }));
        }
    };

    const handleRemoveAllDocuments = () => {
        setFormData(prev => ({
            ...prev,
            documents: []
        }));
    };

    const handleDocumentTypeChange = (documentId, type) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.map(doc =>
                doc.id === documentId ? { ...doc, type } : doc
            )
        }));
    };

    const removeDocument = (documentId) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter(doc => doc.id !== documentId)
        }));
    };

    const viewDocument = (document) => {
        const newWindow = window.open();
        newWindow.document.write(`
            <html>
                <head><title>${document.name}</title></head>
                <body style="margin:0;padding:20px;text-align:center;">
                    <h3>${document.name}</h3>
                    ${document.data.includes('data:image/')
                ? `<img src="${document.data}" style="max-width:100%;height:auto;" />`
                : `<embed src="${document.data}" width="100%" height="600px" />`
            }
                </body>
            </html>
        `);
    };

    const downloadDocument = (document) => {
        const link = document.createElement('a');
        link.href = document.data;
        link.download = document.name;
        link.click();
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Step validation
    const validateStep = (step) => {
        const newErrors = {};
        let isValid = true;

        switch (step) {
            case 1:
                if (!formData.name.trim()) {
                    newErrors.name = 'Employee name is required';
                    isValid = false;
                }
                const validMobileNumbers = formData.mobileNumbers.filter(num => num.trim() !== '');
                if (validMobileNumbers.length === 0) {
                    newErrors.mobileNumbers = 'At least one mobile number is required';
                    isValid = false;
                } else {
                    const invalidNumbers = validMobileNumbers.filter(num => !/^\d{10}$/.test(num));
                    if (invalidNumbers.length > 0) {
                        newErrors.mobileNumbers = 'All mobile numbers must be 10 digits';
                        isValid = false;
                    }
                }
                if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                    newErrors.email = 'Please enter a valid email address';
                    isValid = false;
                }
                break;

            case 2:
                if (!formData.address.trim()) {
                    newErrors.address = 'Address is required';
                    isValid = false;
                }
                if (!formData.city.trim()) {
                    newErrors.city = 'City is required';
                    isValid = false;
                }
                if (!formData.state.trim()) {
                    newErrors.state = 'State is required';
                    isValid = false;
                }
                break;

            case 3:
                if (!formData.joinDate) {
                    newErrors.joinDate = 'Joining date is required';
                    isValid = false;
                }
                if (formData.salary && isNaN(parseFloat(formData.salary))) {
                    newErrors.salary = 'Please enter a valid salary amount';
                    isValid = false;
                }
                break;

            case 4:
                if (formData.documents.length === 0) {
                    newErrors.documents = 'At least one document is required';
                    isValid = false;
                } else {
                    const documentsWithoutType = formData.documents.filter(doc => !doc.type);
                    if (documentsWithoutType.length > 0) {
                        newErrors.documents = 'Please specify type for all uploaded documents';
                        isValid = false;
                    }
                }
                break;

            case 5:
                // Permissions are optional
                break;

            case 6:
                if (!editMode) {
                    if (!formData.password) {
                        newErrors.password = 'Password is required';
                        isValid = false;
                    } else if (formData.password.length < 6) {
                        newErrors.password = 'Password must be at least 6 characters';
                        isValid = false;
                    }

                    if (formData.password !== formData.confirmPassword) {
                        newErrors.confirmPassword = 'Passwords do not match';
                        isValid = false;
                    }
                } else if (formData.password) {
                    if (formData.password.length < 6) {
                        newErrors.password = 'Password must be at least 6 characters';
                        isValid = false;
                    }
                    if (formData.password !== formData.confirmPassword) {
                        newErrors.confirmPassword = 'Passwords do not match';
                        isValid = false;
                    }
                }
                break;
        }

        setErrors(prev => ({ ...prev, ...newErrors }));
        setStepValidation(prev => ({ ...prev, [step]: isValid }));
        return isValid;
    };

    // Navigation handlers
    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps));
        }
    };

    const previousStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const goToStep = (step) => {
        if (step < currentStep || validateStep(currentStep)) {
            setCurrentStep(step);
        }
    };

    // Form submission
    const handleSubmit = () => {
        if (!validateStep(currentStep)) return;

        let dataToSave = { ...formData };
        if (!editMode) {
            dataToSave.employeeId = generateEmployeeId();
        }

        dataToSave.mobileNumbers = dataToSave.mobileNumbers.filter(num => num.trim() !== '');
        const { confirmPassword, ...finalData } = dataToSave;

        onSave(finalData);
    };

    // Render step content using individual components
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <BasicInformationStep
                        formData={formData}
                        handleInputChange={handleInputChange}
                        errors={errors}
                        mobileNumbers={formData.mobileNumbers}
                        handleMobileNumberChange={handleMobileNumberChange}
                        addMobileNumber={addMobileNumber}
                        removeMobileNumber={removeMobileNumber}
                        roleOptions={roleOptions}
                        postOptions={postOptions}
                        avatar={formData.avatar}
                        handleAvatarChange={handleAvatarChange}
                        handleRemoveAvatar={handleRemoveAvatar}
                    />
                );
            case 2:
                return (
                    <AddressDetailsStep
                        formData={formData}
                        handleInputChange={handleInputChange}
                        errors={errors}
                        stateOptions={stateOptions}
                    />
                );
            case 3:
                return (
                    <EmploymentInfoStep
                        formData={formData}
                        handleInputChange={handleInputChange}
                        errors={errors}
                        departments={departments}
                    />
                );
            case 4:
                return (
                    <DocumentsStep
                        formData={formData}
                        handleInputChange={handleInputChange}
                        errors={errors}
                        documents={formData.documents}
                        handleDocumentUpload={handleDocumentUpload}
                        handleAddDocumentsWithType={handleAddDocumentsWithType} // New handler
                        handleDocumentTypeChange={handleDocumentTypeChange}
                        removeDocument={removeDocument}
                        handleRemoveAllDocuments={handleRemoveAllDocuments} // New handler
                        viewDocument={viewDocument}
                        downloadDocument={downloadDocument}
                        formatFileSize={formatFileSize}
                        documentTypes={documentTypes}
                    />
                );
            case 5:
                return (
                    <SystemAccessStep
                        formData={formData}
                        handleInputChange={handleInputChange}
                        errors={errors}
                        permissions={formData.permissions}
                        permissionOptions={permissionOptions}
                    />
                );
            case 6:
                return (
                    <AccountSetupStep
                        formData={formData}
                        handleInputChange={handleInputChange}
                        errors={errors}
                        editMode={editMode}
                        roleOptions={roleOptions}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="xl"
            backdrop="static"
            keyboard={false}
            centered
            className="staff-modal-modern"
        >
            <Modal.Header closeButton className="modern-modal-header">
                <Modal.Title className="modern-modal-title">
                    <FontAwesomeIcon icon={faUserTie} className="me-2" />
                    {editMode ? 'Edit Employee' : 'Add New Employee'}
                    {editMode && formData.employeeId && (
                        <Badge bg="secondary" className="ms-2">
                            ID: {formData.employeeId}
                        </Badge>
                    )}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-0 modern-modal-body">
                <StepNavigation
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    steps={steps}
                    stepValidation={stepValidation}
                    goToStep={goToStep}
                />

                <div className="step-body-modern">
                    <div className="container-fluid px-4 py-4">
                        {renderStepContent()}
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer className="modern-modal-footer">
                <div className="d-flex justify-content-between w-100">
                    <Button
                        variant="outline-secondary"
                        onClick={previousStep}
                        disabled={currentStep === 1}
                        className="modern-btn"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                        Previous
                    </Button>

                    <div className="d-flex gap-2">
                        <Button variant="secondary" onClick={onHide} className="modern-btn">
                            <FontAwesomeIcon icon={faTimes} className="me-2" />
                            Cancel
                        </Button>

                        {currentStep < totalSteps ? (
                            <Button
                                variant="primary"
                                onClick={nextStep}
                                className="modern-btn"
                            >
                                Next
                                <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                            </Button>
                        ) : (
                            <Button
                                variant="success"
                                onClick={handleSubmit}
                                className="modern-btn"
                            >
                                <FontAwesomeIcon icon={faSave} className="me-2" />
                                {editMode ? 'Update Employee' : 'Create Employee'}
                            </Button>
                        )}
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
}

export default AddStaffModal;