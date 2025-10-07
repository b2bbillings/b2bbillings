import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faPlus } from '@fortawesome/free-solid-svg-icons';

// Simple component to navigate to Add Company form
const AddCompanyButton = ({ 
  variant = "primary", 
  size = "md", 
  className = "", 
  children,
  style = {},
  showIcon = true 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    console.log("🏢 Add Company button clicked - navigating to test route");
    navigate('/test-add-company');
  };

  const baseStyles = {
    padding: size === "sm" ? "8px 12px" : size === "lg" ? "12px 20px" : "10px 16px",
    backgroundColor: variant === "primary" ? "#007bff" : variant === "success" ? "#28a745" : "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: size === "sm" ? "14px" : size === "lg" ? "18px" : "16px",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    ...style
  };

  const hoverStyles = {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
  };

  return (
    <button
      onClick={handleClick}
      className={`add-company-btn ${className}`}
      style={baseStyles}
      onMouseEnter={(e) => {
        Object.assign(e.target.style, hoverStyles);
      }}
      onMouseLeave={(e) => {
        Object.assign(e.target.style, baseStyles);
      }}
      title="Add New Company"
    >
      {showIcon && <FontAwesomeIcon icon={faBuilding} />}
      {children || "Add Company"}
    </button>
  );
};

export default AddCompanyButton;