import React, {useState, useEffect} from "react";
import {Modal, Button, Badge, Alert, Spinner} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSave,
  faUserTie,
  faTimes,
  faArrowLeft,
  faArrowRight,
  faUser,
  faHome,
  faFileAlt,
  faBriefcase,
  faKey,
  faShieldAlt,
  faCheck,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import {useNavigate} from "react-router-dom";

// Import Step Components
import StepNavigation from "./Steps/StepNavigation";
import BasicInformationStep from "./Steps/BasicInformationStep";
import AddressDetailsStep from "./Steps/AddressDetailsStep";
import EmploymentInfoStep from "./Steps/EmploymentInfoStep";
import DocumentsStep from "./Steps/DocumentsStep";
import SystemAccessStep from "./Steps/SystemAccessStep";
import AccountSetupStep from "./Steps/AccountSetupStep";

// Import Staff Service
import staffService from "../../../services/staffService";

import "./AddStaffModal.css";

function AddStaffModal({
  show,
  onHide,
  onSave,
  editMode = false,
  staffData = null,
}) {
  // Add navigation hook
  const navigate = useNavigate();

  // Current step in the wizard
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Basic Information
    name: "",
    role: "salesperson",
    post: "",
    mobileNumbers: [""],
    email: "",

    // Address Information
    address: {
      street: "",
      city: "",
      state: "",
      taluka: "",
      pincode: "",
    },

    // Employment Details
    employment: {
      joinDate: new Date().toISOString().split("T")[0],
      salary: "",
      department: "",
      employmentType: "full-time",
      reportingTo: "",
    },

    // Documents
    documents: [],

    // System Access
    permissions: [],

    // Emergency Contact
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },

    // Login Credentials (for new staff only)
    password: "",
    confirmPassword: "",

    // Profile
    avatar: null,
    employeeId: "",
    status: "active",
  });

  // Form validation
  const [errors, setErrors] = useState({});
  const [stepValidation, setStepValidation] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  // Configuration options (use staffService utility functions)
  const roleOptions = staffService.getAvailableRoles().map((role) => ({
    value: role,
    label: role.charAt(0).toUpperCase() + role.slice(1),
    color: getColorForRole(role),
  }));

  const postOptions = staffService.getAvailablePosts().map((post) => ({
    value: post,
    label: post.charAt(0).toUpperCase() + post.slice(1),
  }));

  const stateOptions = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Puducherry",
    "Chandigarh",
    "Dadra and Nagar Haveli",
    "Daman and Diu",
    "Lakshadweep",
    "Andaman and Nicobar Islands",
  ];

  const documentTypes = [
    "Aadhar Card",
    "PAN Card",
    "Voter ID",
    "Driving License",
    "Passport",
    "Bank Passbook",
    "Educational Certificate",
    "Experience Letter",
    "Relieving Letter",
    "Medical Certificate",
    "Police Verification",
    "Character Certificate",
    "Other",
  ];

  const permissionOptions = staffService
    .getAvailablePermissions()
    .map((permission) => ({
      value: permission,
      label:
        permission.charAt(0).toUpperCase() + permission.slice(1) + " Access",
      description: `Manage ${permission} related operations`,
    }));

  const departments = staffService.getAvailableDepartments();
  const employmentTypes = staffService.getEmploymentTypes();

  // Helper function to get role colors
  function getColorForRole(role) {
    const colors = {
      admin: "#dc3545",
      manager: "#fd7e14",
      supervisor: "#ffc107",
      cashier: "#20c997",
      salesperson: "#0dcaf0",
      inventory: "#6f42c1",
      accountant: "#198754",
      delivery: "#0d6efd",
      security: "#6c757d",
      cleaner: "#495057",
      technician: "#e83e8c",
    };
    return colors[role] || "#6c757d";
  }

  // Step configuration
  const steps = [
    {
      id: 1,
      title: "Basic Information",
      icon: faUser,
      description: "Employee personal details",
    },
    {
      id: 2,
      title: "Address Details",
      icon: faHome,
      description: "Contact and address information",
    },
    {
      id: 3,
      title: "Employment Info",
      icon: faBriefcase,
      description: "Job details and compensation",
    },
    {
      id: 4,
      title: "Documents",
      icon: faFileAlt,
      description: "Upload required documents",
    },
    {
      id: 5,
      title: "System Access",
      icon: faShieldAlt,
      description: "Permissions and access rights",
    },
    {
      id: 6,
      title: "Account Setup",
      icon: faKey,
      description: "Login credentials and final review",
    },
  ];

  // Initialize form data
  useEffect(() => {
    const initializeFormData = () => {
      if (editMode && staffData) {
        // Transform backend data to match frontend structure
        return {
          name: staffData.name || "",
          role: staffData.role || "salesperson",
          post: staffData.post || "",
          mobileNumbers:
            Array.isArray(staffData.mobileNumbers) &&
            staffData.mobileNumbers.length > 0
              ? staffData.mobileNumbers
              : [""],
          email: staffData.email || "",

          address: {
            street: staffData.address?.street || "",
            city: staffData.address?.city || "",
            state: staffData.address?.state || "",
            taluka: staffData.address?.taluka || "",
            pincode: staffData.address?.pincode || "",
          },

          employment: {
            joinDate: staffData.employment?.joinDate
              ? new Date(staffData.employment.joinDate)
                  .toISOString()
                  .split("T")[0]
              : new Date().toISOString().split("T")[0],
            salary: staffData.employment?.salary || "",
            department: staffData.employment?.department || "",
            employmentType: staffData.employment?.employmentType || "full-time",
            reportingTo: staffData.employment?.reportingTo || "",
          },

          documents: Array.isArray(staffData.documents)
            ? staffData.documents
            : [],
          permissions: Array.isArray(staffData.permissions)
            ? staffData.permissions
            : [],

          emergencyContact: {
            name: staffData.emergencyContact?.name || "",
            relationship: staffData.emergencyContact?.relationship || "",
            phone: staffData.emergencyContact?.phone || "",
          },

          password: "",
          confirmPassword: "",
          avatar: staffData.avatar || null,
          employeeId: staffData.employeeId || "",
          status: staffData.status || "active",
        };
      } else {
        // Reset form for new staff
        return {
          name: "",
          role: "salesperson",
          post: "",
          mobileNumbers: [""],
          email: "",
          address: {
            street: "",
            city: "",
            state: "",
            taluka: "",
            pincode: "",
          },
          employment: {
            joinDate: new Date().toISOString().split("T")[0],
            salary: "",
            department: "",
            employmentType: "full-time",
            reportingTo: "",
          },
          documents: [],
          permissions: [],
          emergencyContact: {
            name: "",
            relationship: "",
            phone: "",
          },
          password: "",
          confirmPassword: "",
          avatar: null,
          employeeId: "",
          status: "active",
        };
      }
    };

    setFormData(initializeFormData());
    setCurrentStep(1);
    setErrors({});
    setStepValidation({
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
    });
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsLoading(false);
  }, [show, editMode, staffData]);

  // ✅ PREVENT ACCIDENTAL DOUBLE FORM SUBMISSIONS
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isLoading) {
        e.preventDefault();
        e.returnValue =
          "Form submission in progress. Are you sure you want to leave?";
      }
    };

    const handleKeyDown = (e) => {
      // Prevent Enter key from submitting form multiple times
      if (e.key === "Enter" && isLoading) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLoading]);
  // Handle input changes with better safety checks
  const handleInputChange = (e) => {
    const {name, value, type, checked} = e.target;

    if (type === "checkbox") {
      if (name === "permissions") {
        const permissionValue = e.target.value;
        setFormData((prevState) => {
          const currentPermissions = prevState.permissions || [];
          const updatedPermissions = checked
            ? [...currentPermissions, permissionValue]
            : currentPermissions.filter((p) => p !== permissionValue);
          return {...prevState, permissions: updatedPermissions};
        });
      } else {
        setFormData((prevState) => ({...prevState, [name]: checked}));
      }
    } else {
      // Handle nested object properties
      if (name.includes(".")) {
        const [parentKey, childKey] = name.split(".");
        setFormData((prevState) => ({
          ...prevState,
          [parentKey]: {
            ...prevState[parentKey],
            [childKey]: value,
          },
        }));
      } else {
        setFormData((prevState) => ({...prevState, [name]: value}));
      }
    }

    // Clear specific error
    if (errors[name]) {
      setErrors((prev) => ({...prev, [name]: null}));
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null);
    }
  };

  // Mobile number handlers
  const handleMobileNumberChange = (index, value) => {
    const newMobileNumbers = [...formData.mobileNumbers];
    newMobileNumbers[index] = value;
    setFormData((prev) => ({...prev, mobileNumbers: newMobileNumbers}));

    if (errors.mobileNumbers) {
      setErrors((prev) => ({...prev, mobileNumbers: null}));
    }
  };

  const addMobileNumber = () => {
    setFormData((prev) => ({
      ...prev,
      mobileNumbers: [...prev.mobileNumbers, ""],
    }));
  };

  const removeMobileNumber = (index) => {
    if (formData.mobileNumbers.length > 1) {
      const newMobileNumbers = formData.mobileNumbers.filter(
        (_, i) => i !== index
      );
      setFormData((prev) => ({...prev, mobileNumbers: newMobileNumbers}));
    }
  };

  // Avatar handlers
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      setErrors((prev) => ({...prev, avatar: "Please select an image file"}));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData((prev) => ({...prev, avatar: e.target.result}));
      if (errors.avatar) {
        setErrors((prev) => ({...prev, avatar: null}));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({...prev, avatar: null}));
  };

  // Document handlers
  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newDocument = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: "",
          size: file.size,
          data: e.target.result,
          uploadDate: new Date().toISOString(),
        };

        setFormData((prev) => ({
          ...prev,
          documents: [...prev.documents, newDocument],
        }));
      };
      reader.readAsDataURL(file);
    });

    if (errors.documents) {
      setErrors((prev) => ({...prev, documents: null}));
    }
  };

  const handleAddDocumentsWithType = (newDocuments) => {
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ...newDocuments],
    }));

    if (errors.documents) {
      setErrors((prev) => ({...prev, documents: null}));
    }
  };

  const handleRemoveAllDocuments = () => {
    setFormData((prev) => ({
      ...prev,
      documents: [],
    }));
  };

  const handleDocumentTypeChange = (documentId, type) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) =>
        doc.id === documentId ? {...doc, type} : doc
      ),
    }));
  };

  const removeDocument = (documentId) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((doc) => doc.id !== documentId),
    }));
  };

  const viewDocument = (document) => {
    const newWindow = window.open();
    newWindow.document.write(`
            <html>
                <head><title>${document.name}</title></head>
                <body style="margin:0;padding:20px;text-align:center;">
                    <h3>${document.name}</h3>
                    ${
                      document.data.includes("data:image/")
                        ? `<img src="${document.data}" style="max-width:100%;height:auto;" />`
                        : `<embed src="${document.data}" width="100%" height="600px" />`
                    }
                </body>
            </html>
        `);
  };

  const downloadDocument = (document) => {
    const link = document.createElement("a");
    link.href = document.data;
    link.download = document.name;
    link.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Step validation with better safety checks
  const validateStep = (step) => {
    const newErrors = {};
    let isValid = true;

    switch (step) {
      case 1:
        // Basic Information validation
        if (!formData.name?.trim()) {
          newErrors.name = "Employee name is required";
          isValid = false;
        }

        const validMobileNumbers =
          formData.mobileNumbers?.filter((num) => num?.trim() !== "") || [];

        if (validMobileNumbers.length === 0) {
          newErrors.mobileNumbers = "At least one mobile number is required";
          isValid = false;
        } else {
          const invalidNumbers = validMobileNumbers.filter(
            (num) => !/^\d{10}$/.test(num?.trim() || "")
          );
          if (invalidNumbers.length > 0) {
            newErrors.mobileNumbers = "All mobile numbers must be 10 digits";
            isValid = false;
          }
        }

        if (
          formData.email &&
          formData.email.trim() &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
        ) {
          newErrors.email = "Please enter a valid email address";
          isValid = false;
        }
        break;

      case 2:
        // Address validation
        if (!formData.address?.street?.trim()) {
          newErrors["address.street"] = "Address is required";
          isValid = false;
        }
        if (!formData.address?.city?.trim()) {
          newErrors["address.city"] = "City is required";
          isValid = false;
        }
        if (!formData.address?.state?.trim()) {
          newErrors["address.state"] = "State is required";
          isValid = false;
        }
        break;

      case 3:
        // Employment validation
        if (!formData.employment?.joinDate) {
          newErrors["employment.joinDate"] = "Joining date is required";
          isValid = false;
        }
        if (
          formData.employment?.salary &&
          formData.employment.salary.toString().trim() &&
          isNaN(parseFloat(formData.employment.salary))
        ) {
          newErrors["employment.salary"] = "Please enter a valid salary amount";
          isValid = false;
        }
        break;

      case 4:
        // Documents are optional for now
        break;

      case 5:
        // Permissions are optional
        break;

      case 6:
        // Password validation
        if (!editMode) {
          if (!formData.password?.trim()) {
            newErrors.password = "Password is required";
            isValid = false;
          } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
            isValid = false;
          }

          if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
            isValid = false;
          }
        } else if (formData.password?.trim()) {
          if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
            isValid = false;
          }
          if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
            isValid = false;
          }
        }
        break;

      default:
        break;
    }

    setErrors((prev) => ({...prev, ...newErrors}));
    setStepValidation((prev) => ({...prev, [step]: isValid}));
    return isValid;
  };

  // Navigation handlers
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const previousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (step) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  // Update the handleSubmit function to handle both API call and parent callback
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    // ✅ PREVENT DOUBLE SUBMISSION
    if (isLoading) {
      console.warn("⚠️ Submit already in progress, ignoring duplicate call");
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    try {
      console.log("🚀 AddStaffModal.handleSubmit starting...");

      // Prepare data for API
      let dataToSave = {...formData};

      // Clean up mobile numbers
      dataToSave.mobileNumbers = dataToSave.mobileNumbers.filter(
        (num) => num.trim() !== ""
      );

      // Remove confirmPassword from data
      const {confirmPassword, avatar, ...apiData} = dataToSave;

      console.log("🔄 Cleaned data for API:", apiData);

      // ✅ ADDITIONAL VALIDATION - Check for response-like data
      if (apiData.success !== undefined || apiData.data !== undefined) {
        console.error(
          "❌ Invalid data format detected - response data in form!"
        );
        setSubmitError(
          "Invalid form data detected. Please refresh and try again."
        );
        setIsLoading(false);
        return;
      }

      // Validate data using staffService
      const validation = staffService.validateStaffData(apiData);
      if (!validation.isValid) {
        console.warn("❌ Validation failed:", validation.errors);
        setSubmitError(
          "Please fix the following errors: " + validation.errors.join(", ")
        );
        setIsLoading(false);
        return;
      }

      console.log("✅ Validation passed, making API call...");

      // ✅ MAKE THE API CALL HERE (Single source of truth)
      let result;
      if (editMode) {
        // Update existing staff
        console.log("🔄 Updating staff with ID:", staffData._id);
        result = await staffService.updateStaff(staffData._id, apiData);
      } else {
        // Create new staff
        console.log("🔄 Creating new staff...");
        result = await staffService.createStaff(apiData);
      }

      console.log("📤 API call completed:", {
        success: result?.success,
        hasData: !!result?.data,
        message: result?.message,
      });

      // ✅ HANDLE SUCCESS RESPONSE
      if (result && result.success) {
        console.log("✅ Operation successful!");
        setSubmitSuccess(true);

        // ✅ Call the parent component's onSave callback (for UI updates only)
        if (onSave) {
          console.log("🔄 Calling onSave callback for UI updates...");
          await onSave(result.data); // Pass the successful result
        }

        // Get company ID for navigation
        const companyId =
          localStorage.getItem("companyId") ||
          localStorage.getItem("currentCompany");

        // Close modal and redirect after a short delay to show success message
        setTimeout(() => {
          console.log("🔄 Closing modal and navigating...");
          onHide(); // Close modal first

          // Navigate to staff page with success message
          if (!editMode && companyId) {
            navigate(`/companies/${companyId}/staff`, {
              state: {
                message: `Employee ${
                  result.data?.data?.name || result.data?.name
                } created successfully!`,
                type: "success",
                employeeId:
                  result.data?.data?.employeeId || result.data?.employeeId,
              },
            });
          } else if (editMode && companyId) {
            navigate(`/companies/${companyId}/staff`, {
              state: {
                message: `Employee ${
                  result.data?.data?.name || result.data?.name
                } updated successfully!`,
                type: "success",
                employeeId:
                  result.data?.data?.employeeId || result.data?.employeeId,
              },
            });
          }
        }, 1500);
      } else {
        // ✅ HANDLE FAILURE RESPONSE
        console.error("❌ Operation failed:", result);
        setSubmitError(result?.message || "Failed to save staff member");
      }
    } catch (error) {
      console.error("❌ AddStaffModal.handleSubmit error:", error);

      let errorMessage = "An unexpected error occurred";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (editMode) {
        errorMessage = "Failed to update staff member";
      } else {
        errorMessage = "Failed to create staff member";
      }

      setSubmitError(errorMessage);
    } finally {
      console.log("🏁 AddStaffModal.handleSubmit completed");
      setIsLoading(false);
    }
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
            employmentTypes={employmentTypes}
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
            handleAddDocumentsWithType={handleAddDocumentsWithType}
            handleDocumentTypeChange={handleDocumentTypeChange}
            removeDocument={removeDocument}
            handleRemoveAllDocuments={handleRemoveAllDocuments}
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
      onHide={!isLoading ? onHide : undefined}
      size="xl"
      backdrop={isLoading ? "static" : true}
      keyboard={!isLoading}
      centered
      className="staff-modal-modern"
    >
      <Modal.Header closeButton={!isLoading} className="modern-modal-header">
        <Modal.Title className="modern-modal-title">
          <FontAwesomeIcon icon={faUserTie} className="me-2" />
          {editMode ? "Edit Employee" : "Add New Employee"}
          {editMode && formData.employeeId && (
            <Badge bg="secondary" className="ms-2">
              ID: {formData.employeeId}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0 modern-modal-body">
        {/* Show success message */}
        {submitSuccess && (
          <Alert variant="success" className="m-3 mb-0">
            <FontAwesomeIcon icon={faCheck} className="me-2" />
            {editMode
              ? "Employee updated successfully!"
              : "Employee created successfully!"}
          </Alert>
        )}

        {/* Show error message */}
        {submitError && (
          <Alert variant="danger" className="m-3 mb-0">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {submitError}
          </Alert>
        )}

        <StepNavigation
          currentStep={currentStep}
          totalSteps={totalSteps}
          steps={steps}
          stepValidation={stepValidation}
          goToStep={goToStep}
        />

        <div className="step-body-modern">
          <div className="container-fluid px-4 py-4">{renderStepContent()}</div>
        </div>
      </Modal.Body>

      <Modal.Footer className="modern-modal-footer">
        <div className="d-flex justify-content-between w-100">
          <Button
            variant="outline-secondary"
            onClick={previousStep}
            disabled={currentStep === 1 || isLoading}
            className="modern-btn"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Previous
          </Button>

          <div className="d-flex gap-2">
            <Button
              variant="secondary"
              onClick={onHide}
              className="modern-btn"
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faTimes} className="me-2" />
              Cancel
            </Button>

            {currentStep < totalSteps ? (
              <Button
                variant="primary"
                onClick={nextStep}
                className="modern-btn"
                disabled={isLoading}
              >
                Next
                <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={handleSubmit}
                className="modern-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    {editMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                    {editMode ? "Update Employee" : "Create Employee"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default AddStaffModal;
