// Backend/src/utils/validation.js
const validator = require("validator");
const logger = require("../config/logger");

// Sanitize input data
const sanitizeInput = (data) => {
  if (!data || typeof data !== "object") return data;

  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      // Remove potentially dangerous characters
      sanitized[key] = validator.escape(value.trim());
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? validator.escape(item.trim()) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// Validate input based on rules
const validateInput = (data, rules) => {
  const errors = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field];

    // Required field check
    if (fieldRules.required && (!value || value === "")) {
      errors.push({
        field,
        message: `${field} is required`,
        code: "REQUIRED_FIELD",
      });
      continue;
    }

    // Skip other validations if field is empty and not required
    if (!value && !fieldRules.required) continue;

    // String length validations
    if (fieldRules.minLength && value.length < fieldRules.minLength) {
      errors.push({
        field,
        message: `${field} must be at least ${fieldRules.minLength} characters`,
        code: "MIN_LENGTH",
      });
    }

    if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
      errors.push({
        field,
        message: `${field} must not exceed ${fieldRules.maxLength} characters`,
        code: "MAX_LENGTH",
      });
    }

    // Email validation
    if (fieldRules.email && !validator.isEmail(value)) {
      errors.push({
        field,
        message: `${field} must be a valid email address`,
        code: "INVALID_EMAIL",
      });
    }

    // Phone number validation (Indian format)
    if (fieldRules.phoneNumber && !validator.isMobilePhone(value, "en-IN")) {
      errors.push({
        field,
        message: `${field} must be a valid phone number`,
        code: "INVALID_PHONE",
      });
    }

    // Strong password validation
    if (fieldRules.strongPassword) {
      if (
        !validator.isStrongPassword(value, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        })
      ) {
        errors.push({
          field,
          message: `${field} must contain at least 8 characters with uppercase, lowercase, number and special character`,
          code: "WEAK_PASSWORD",
        });
      }
    }
  }

  return errors;
};

module.exports = {
  sanitizeInput,
  validateInput,
};
