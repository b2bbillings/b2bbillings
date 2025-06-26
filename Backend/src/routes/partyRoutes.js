const express = require("express");
const {body, param, query} = require("express-validator");
const partyController = require("../controllers/partyController");
const validation = require("../middleware/validation");
const {authenticate, optionalAuth} = require("../middleware/authMiddleware");

const router = express.Router();

// Apply optional authentication to all party routes (for testing)
router.use(optionalAuth);

// Validation rules for party creation/update
const partyValidationRules = [
  body("name")
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s\.\-']+$/)
    .withMessage(
      "Name can only contain letters, spaces, dots, hyphens, and apostrophes"
    ),

  body("email")
    .optional({nullable: true, checkFalsy: true})
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("phoneNumber")
    .matches(/^[6-9]\d{9}$/)
    .withMessage(
      "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9"
    ),

  body("partyType")
    .isIn(["customer", "vendor", "supplier", "both"])
    .withMessage("Party type must be customer, vendor, supplier, or both"),

  body("companyName")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Company name cannot exceed 100 characters"),

  // GST validation with conditional logic
  body("gstType")
    .isIn(["unregistered", "regular", "composition"])
    .withMessage("GST type must be unregistered, regular, or composition"),

  body("gstNumber")
    .optional({nullable: true, checkFalsy: true})
    .custom((value, {req}) => {
      // Only validate GST number if type is not unregistered and value is provided
      if (req.body.gstType !== "unregistered" && value) {
        if (
          !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            value.toUpperCase()
          )
        ) {
          throw new Error(
            "Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)"
          );
        }
      }
      return true;
    }),

  // Financial fields
  body("creditLimit")
    .optional({nullable: true})
    .isFloat({min: 0})
    .withMessage("Credit limit must be zero or positive"),

  body("openingBalance")
    .optional({nullable: true})
    .isFloat({min: 0})
    .withMessage("Opening balance must be zero or positive"),

  body("country")
    .optional()
    .isLength({max: 50})
    .withMessage("Country name cannot exceed 50 characters"),

  // Home Address validation
  body("homeAddressLine")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 200})
    .withMessage("Home address line cannot exceed 200 characters"),

  body("homePincode")
    .optional({nullable: true, checkFalsy: true})
    .matches(/^[0-9]{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),

  body("homeState")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("State name cannot exceed 50 characters"),

  body("homeDistrict")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("District name cannot exceed 50 characters"),

  body("homeTaluka")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Taluka name cannot exceed 50 characters"),

  // Delivery Address validation
  body("deliveryAddressLine")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 200})
    .withMessage("Delivery address line cannot exceed 200 characters"),

  body("deliveryPincode")
    .optional({nullable: true, checkFalsy: true})
    .matches(/^[0-9]{6}$/)
    .withMessage("Delivery pincode must be exactly 6 digits"),

  body("deliveryState")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Delivery state name cannot exceed 50 characters"),

  body("deliveryDistrict")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Delivery district name cannot exceed 50 characters"),

  body("deliveryTaluka")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Delivery taluka name cannot exceed 50 characters"),

  body("sameAsHomeAddress")
    .optional()
    .isBoolean()
    .withMessage("Same as home address must be true or false"),

  // Phone numbers array validation
  body("phoneNumbers")
    .optional()
    .isArray()
    .withMessage("Phone numbers must be an array"),

  body("phoneNumbers.*.number")
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage(
      "Each phone number must be a valid 10-digit number starting with 6, 7, 8, or 9"
    ),

  body("phoneNumbers.*.label")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 20})
    .withMessage("Phone number label cannot exceed 20 characters"),

  // NEW FIELDS FOR IMPORTED DATA
  body("source")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Source cannot exceed 50 characters"),

  body("importedFrom")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Imported from cannot exceed 100 characters"),

  body("importedAt")
    .optional({nullable: true, checkFalsy: true})
    .isISO8601()
    .withMessage("Imported at must be a valid date"),

  body("isVerified")
    .optional()
    .isBoolean()
    .withMessage("Is verified must be true or false"),

  body("businessType")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Business type cannot exceed 100 characters"),

  body("contactPersonName")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Contact person name cannot exceed 100 characters"),

  body("website")
    .optional({nullable: true, checkFalsy: true})
    .isURL()
    .withMessage("Website must be a valid URL"),

  body("turnover")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Turnover cannot exceed 50 characters"),

  body("employees")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Employees cannot exceed 50 characters"),

  // ✅ NEW: Bidirectional linking fields validation
  body("linkedCompanyId")
    .optional({nullable: true, checkFalsy: true})
    .isMongoId()
    .withMessage("Linked company ID must be a valid MongoDB ObjectId"),

  body("isLinkedSupplier")
    .optional()
    .isBoolean()
    .withMessage("Is linked supplier must be true or false"),

  body("enableBidirectionalOrders")
    .optional()
    .isBoolean()
    .withMessage("Enable bidirectional orders must be true or false"),

  body("autoLinkByGST")
    .optional()
    .isBoolean()
    .withMessage("Auto link by GST must be true or false"),

  body("autoLinkByPhone")
    .optional()
    .isBoolean()
    .withMessage("Auto link by phone must be true or false"),

  body("autoLinkByEmail")
    .optional()
    .isBoolean()
    .withMessage("Auto link by email must be true or false"),

  body("externalCompanyId")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("External company ID cannot exceed 100 characters"),

  body("isExternalCompany")
    .optional()
    .isBoolean()
    .withMessage("Is external company must be true or false"),

  body("supplierCompanyData")
    .optional({nullable: true})
    .isObject()
    .withMessage("Supplier company data must be an object"),

  // ✅ NEW: Additional business fields validation
  body("businessCategory")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Business category cannot exceed 100 characters"),

  body("companyType")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Company type cannot exceed 50 characters"),

  body("incorporationDate")
    .optional({nullable: true, checkFalsy: true})
    .isISO8601()
    .withMessage("Incorporation date must be a valid date"),

  body("cinNumber")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 30})
    .withMessage("CIN number cannot exceed 30 characters"),

  body("authorizedCapital")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Authorized capital cannot exceed 50 characters"),

  body("paidUpCapital")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Paid up capital cannot exceed 50 characters"),

  body("establishedYear")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 10})
    .withMessage("Established year cannot exceed 10 characters"),

  body("description")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 500})
    .withMessage("Description cannot exceed 500 characters"),

  body("ownerInfo")
    .optional({nullable: true})
    .isObject()
    .withMessage("Owner info must be an object"),
];

// Quick add validation rules (minimal validation for quick entry)
const quickAddValidationRules = [
  body("name")
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s\.\-']+$/)
    .withMessage(
      "Name can only contain letters, spaces, dots, hyphens, and apostrophes"
    ),

  body("phone")
    .matches(/^[6-9]\d{9}$/)
    .withMessage(
      "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9"
    ),

  body("type")
    .optional()
    .isIn(["customer", "vendor", "supplier", "both"])
    .withMessage("Party type must be customer, vendor, supplier, or both"),
];

// Update validation rules (similar to create but allows partial updates)
const updateValidationRules = [
  body("name")
    .optional()
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s\.\-']+$/)
    .withMessage(
      "Name can only contain letters, spaces, dots, hyphens, and apostrophes"
    ),

  body("email")
    .optional({nullable: true, checkFalsy: true})
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("phoneNumber")
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage(
      "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9"
    ),

  body("partyType")
    .optional()
    .isIn(["customer", "vendor", "supplier", "both"])
    .withMessage("Party type must be customer, vendor, supplier, or both"),

  body("companyName")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Company name cannot exceed 100 characters"),

  // GST validation for updates
  body("gstType")
    .optional()
    .isIn(["unregistered", "regular", "composition"])
    .withMessage("GST type must be unregistered, regular, or composition"),

  body("gstNumber")
    .optional({nullable: true, checkFalsy: true})
    .custom((value, {req}) => {
      // Only validate GST number if type is not unregistered and value is provided
      if (req.body.gstType !== "unregistered" && value) {
        if (
          !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            value.toUpperCase()
          )
        ) {
          throw new Error(
            "Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)"
          );
        }
      }
      return true;
    }),

  // Financial fields for updates
  body("creditLimit")
    .optional({nullable: true})
    .isFloat({min: 0})
    .withMessage("Credit limit must be zero or positive"),

  body("openingBalance")
    .optional({nullable: true})
    .isFloat({min: 0})
    .withMessage("Opening balance must be zero or positive"),

  // Address validation for updates
  body("homeAddressLine")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 200})
    .withMessage("Home address line cannot exceed 200 characters"),

  body("homePincode")
    .optional({nullable: true, checkFalsy: true})
    .matches(/^[0-9]{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),

  body("homeState")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("State name cannot exceed 50 characters"),

  body("homeDistrict")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("District name cannot exceed 50 characters"),

  body("homeTaluka")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Taluka name cannot exceed 50 characters"),

  body("deliveryAddressLine")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 200})
    .withMessage("Delivery address line cannot exceed 200 characters"),

  body("deliveryPincode")
    .optional({nullable: true, checkFalsy: true})
    .matches(/^[0-9]{6}$/)
    .withMessage("Delivery pincode must be exactly 6 digits"),

  body("deliveryState")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Delivery state name cannot exceed 50 characters"),

  body("deliveryDistrict")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Delivery district name cannot exceed 50 characters"),

  body("deliveryTaluka")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Delivery taluka name cannot exceed 50 characters"),

  body("sameAsHomeAddress")
    .optional()
    .isBoolean()
    .withMessage("Same as home address must be true or false"),

  // Phone numbers array validation for updates
  body("phoneNumbers")
    .optional()
    .isArray()
    .withMessage("Phone numbers must be an array"),

  body("phoneNumbers.*.number")
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage(
      "Each phone number must be a valid 10-digit number starting with 6, 7, 8, or 9"
    ),

  body("phoneNumbers.*.label")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 20})
    .withMessage("Phone number label cannot exceed 20 characters"),

  // NEW FIELDS FOR IMPORTED DATA (update validation)
  body("source")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Source cannot exceed 50 characters"),

  body("importedFrom")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Imported from cannot exceed 100 characters"),

  body("importedAt")
    .optional({nullable: true, checkFalsy: true})
    .isISO8601()
    .withMessage("Imported at must be a valid date"),

  body("isVerified")
    .optional()
    .isBoolean()
    .withMessage("Is verified must be true or false"),

  body("businessType")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Business type cannot exceed 100 characters"),

  body("contactPersonName")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Contact person name cannot exceed 100 characters"),

  body("website")
    .optional({nullable: true, checkFalsy: true})
    .isURL()
    .withMessage("Website must be a valid URL"),

  body("turnover")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Turnover cannot exceed 50 characters"),

  body("employees")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Employees cannot exceed 50 characters"),

  // ✅ NEW: Bidirectional linking fields validation for updates
  body("linkedCompanyId")
    .optional({nullable: true, checkFalsy: true})
    .isMongoId()
    .withMessage("Linked company ID must be a valid MongoDB ObjectId"),

  body("isLinkedSupplier")
    .optional()
    .isBoolean()
    .withMessage("Is linked supplier must be true or false"),

  body("enableBidirectionalOrders")
    .optional()
    .isBoolean()
    .withMessage("Enable bidirectional orders must be true or false"),

  body("autoLinkByGST")
    .optional()
    .isBoolean()
    .withMessage("Auto link by GST must be true or false"),

  body("autoLinkByPhone")
    .optional()
    .isBoolean()
    .withMessage("Auto link by phone must be true or false"),

  body("autoLinkByEmail")
    .optional()
    .isBoolean()
    .withMessage("Auto link by email must be true or false"),

  body("externalCompanyId")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("External company ID cannot exceed 100 characters"),

  body("isExternalCompany")
    .optional()
    .isBoolean()
    .withMessage("Is external company must be true or false"),

  body("supplierCompanyData")
    .optional({nullable: true})
    .isObject()
    .withMessage("Supplier company data must be an object"),

  // ✅ NEW: Additional business fields validation for updates
  body("businessCategory")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Business category cannot exceed 100 characters"),

  body("companyType")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Company type cannot exceed 50 characters"),

  body("incorporationDate")
    .optional({nullable: true, checkFalsy: true})
    .isISO8601()
    .withMessage("Incorporation date must be a valid date"),

  body("cinNumber")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 30})
    .withMessage("CIN number cannot exceed 30 characters"),

  body("authorizedCapital")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Authorized capital cannot exceed 50 characters"),

  body("paidUpCapital")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Paid up capital cannot exceed 50 characters"),

  body("establishedYear")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 10})
    .withMessage("Established year cannot exceed 10 characters"),

  body("description")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 500})
    .withMessage("Description cannot exceed 500 characters"),

  body("ownerInfo")
    .optional({nullable: true})
    .isObject()
    .withMessage("Owner info must be an object"),
];

// ✅ NEW: Enhanced linking validation rules (subset for linking operations)
const linkingValidationRules = [
  body("linkedCompanyId")
    .optional({nullable: true, checkFalsy: true})
    .isMongoId()
    .withMessage("Linked company ID must be a valid MongoDB ObjectId"),

  body("isLinkedSupplier")
    .optional()
    .isBoolean()
    .withMessage("Is linked supplier must be true or false"),

  body("enableBidirectionalOrders")
    .optional()
    .isBoolean()
    .withMessage("Enable bidirectional orders must be true or false"),

  body("autoLinkByGST")
    .optional()
    .isBoolean()
    .withMessage("Auto link by GST must be true or false"),

  body("autoLinkByPhone")
    .optional()
    .isBoolean()
    .withMessage("Auto link by phone must be true or false"),

  body("autoLinkByEmail")
    .optional()
    .isBoolean()
    .withMessage("Auto link by email must be true or false"),

  body("externalCompanyId")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("External company ID cannot exceed 100 characters"),

  body("isExternalCompany")
    .optional()
    .isBoolean()
    .withMessage("Is external company must be true or false"),

  body("supplierCompanyData")
    .optional({nullable: true})
    .isObject()
    .withMessage("Supplier company data must be an object"),

  body("businessCategory")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 100})
    .withMessage("Business category cannot exceed 100 characters"),

  body("companyType")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Company type cannot exceed 50 characters"),

  body("incorporationDate")
    .optional({nullable: true, checkFalsy: true})
    .isISO8601()
    .withMessage("Incorporation date must be a valid date"),

  body("cinNumber")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 30})
    .withMessage("CIN number cannot exceed 30 characters"),

  body("authorizedCapital")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Authorized capital cannot exceed 50 characters"),

  body("paidUpCapital")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 50})
    .withMessage("Paid up capital cannot exceed 50 characters"),

  body("establishedYear")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 10})
    .withMessage("Established year cannot exceed 10 characters"),

  body("description")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .isLength({max: 500})
    .withMessage("Description cannot exceed 500 characters"),

  body("ownerInfo")
    .optional({nullable: true})
    .isObject()
    .withMessage("Owner info must be an object"),
];

// ✅ NEW: Supplier linking validation rules
const supplierLinkingValidationRules = [
  body("supplierId")
    .isMongoId()
    .withMessage("Supplier ID must be a valid MongoDB ObjectId"),

  body("companyId")
    .isMongoId()
    .withMessage("Company ID must be a valid MongoDB ObjectId"),

  body("enableBidirectionalOrders")
    .optional()
    .isBoolean()
    .withMessage("Enable bidirectional orders must be true or false"),
];

// Parameter validation for routes with ID
const idValidationRules = [
  param("id").isMongoId().withMessage("Invalid party ID format"),
];

// Phone number parameter validation
const phoneValidationRules = [
  param("phoneNumber")
    .matches(/^[6-9]\d{9}$/)
    .withMessage(
      "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9"
    ),
];

// Query parameter validation for search and filtering
const queryValidationRules = [
  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 100})
    .withMessage("Limit must be between 1 and 100"),

  query("search")
    .optional()
    .trim()
    .isLength({max: 100})
    .withMessage("Search query cannot exceed 100 characters"),

  query("type")
    .optional()
    .isIn(["all", "customer", "vendor", "supplier", "both"])
    .withMessage(
      "Type filter must be all, customer, vendor, supplier, or both"
    ),

  query("sortBy")
    .optional()
    .isIn([
      "name",
      "createdAt",
      "updatedAt",
      "currentBalance",
      "partyType",
      "creditLimit",
      "gstType",
    ])
    .withMessage(
      "Sort by must be name, createdAt, updatedAt, currentBalance, partyType, creditLimit, or gstType"
    ),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  // ✅ NEW: Include linked filter
  query("includeLinked")
    .optional()
    .isBoolean()
    .withMessage("Include linked must be true or false"),
];

// Search parameter validation (for /search/:query route)
const searchValidationRules = [
  param("query")
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Search query must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\.\-@]+$/)
    .withMessage("Search query contains invalid characters"),

  query("type")
    .optional()
    .isIn(["all", "customer", "vendor", "supplier", "both"])
    .withMessage(
      "Type filter must be all, customer, vendor, supplier, or both"
    ),

  query("limit")
    .optional()
    .isInt({min: 1, max: 50})
    .withMessage("Limit must be between 1 and 50"),
];

// NEW VALIDATION RULES FOR DATABASE SEARCH COMPONENT

// Search query validation for GET /api/parties/search
const searchQueryValidationRules = [
  query("search")
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Search query must be between 2 and 100 characters"),

  query("type")
    .optional()
    .isIn(["all", "customer", "vendor", "supplier", "both"])
    .withMessage(
      "Type filter must be all, customer, vendor, supplier, or both"
    ),

  query("limit")
    .optional()
    .isInt({min: 1, max: 50})
    .withMessage("Limit must be between 1 and 50"),

  query("page")
    .optional()
    .isInt({min: 1})
    .withMessage("Page must be a positive integer"),

  // ✅ NEW: Include linked filter
  query("includeLinked")
    .optional()
    .isBoolean()
    .withMessage("Include linked must be true or false"),
];

// External search validation rules
const externalSearchValidationRules = [
  body("query")
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Search query must be between 2 and 100 characters"),

  body("filter")
    .optional()
    .isIn(["all", "customer", "vendor", "supplier"])
    .withMessage("Filter must be all, customer, vendor, or supplier"),

  body("source")
    .optional()
    .isIn(["all", "local", "government", "trade", "verified"])
    .withMessage("Source must be all, local, government, trade, or verified"),

  body("limit")
    .optional()
    .isInt({min: 1, max: 20})
    .withMessage("Limit must be between 1 and 20"),
];

// Company search validation rules
const companySearchValidationRules = [
  query("q")
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Search query must be between 2 and 100 characters"),

  query("limit")
    .optional()
    .isInt({min: 1, max: 20})
    .withMessage("Limit must be between 1 and 20"),
];

// Routes with validation and error handling

// ✅ NEW: Enhanced party creation with linking support
router.post(
  "/create-with-linking",
  partyValidationRules.concat(linkingValidationRules),
  validation.handleValidationErrors,
  partyController.createPartyWithLinking || partyController.createParty
);

// Create new party (regular endpoint)
router.post(
  "/",
  partyValidationRules,
  validation.handleValidationErrors,
  partyController.createParty
);

// Create quick party
router.post(
  "/quick",
  quickAddValidationRules,
  validation.handleValidationErrors,
  partyController.createQuickParty
);

// ✅ NEW: Link supplier to company
router.post(
  "/link-supplier",
  supplierLinkingValidationRules,
  validation.handleValidationErrors,
  partyController.linkSupplierToCompany || partyController.createParty
);

// ✅ NEW: Get suppliers with linked companies
router.get(
  "/linked-suppliers",
  queryValidationRules,
  validation.handleValidationErrors,
  partyController.getSuppliersWithLinkedCompanies ||
    partyController.getAllParties
);

// NEW ROUTES FOR DATABASE SEARCH COMPONENT

// Search parties (GET version for DatabaseSearch component)
router.get(
  "/search",
  searchQueryValidationRules,
  validation.handleValidationErrors,
  partyController.searchPartiesGet
);

// Search external databases
router.post(
  "/search/external",
  externalSearchValidationRules,
  validation.handleValidationErrors,
  partyController.searchExternalDatabase
);

// Search companies for auto-complete
router.get(
  "/search/companies",
  companySearchValidationRules,
  validation.handleValidationErrors,
  partyController.searchCompanies
);

// Check if phone number exists
router.get(
  "/check-phone/:phoneNumber",
  phoneValidationRules,
  validation.handleValidationErrors,
  partyController.checkPhoneExists
);

// Get party statistics (before other GET routes to avoid conflicts)
router.get("/stats", partyController.getPartyStats);

// Search parties with parameter (existing route - keep for backward compatibility)
router.get(
  "/search/:query",
  searchValidationRules,
  validation.handleValidationErrors,
  partyController.searchParties
);

// Get all parties with filtering and pagination
router.get(
  "/",
  queryValidationRules,
  validation.handleValidationErrors,
  partyController.getAllParties
);

// Get party by ID
router.get(
  "/:id",
  idValidationRules,
  validation.handleValidationErrors,
  partyController.getPartyById
);

// ✅ NEW: Enhanced party update with linking support
router.put(
  "/:id/update-with-linking",
  idValidationRules
    .concat(updateValidationRules)
    .concat(linkingValidationRules),
  validation.handleValidationErrors,
  partyController.updatePartyWithLinking || partyController.updateParty
);

// Update party (regular endpoint)
router.put(
  "/:id",
  idValidationRules.concat(updateValidationRules),
  validation.handleValidationErrors,
  partyController.updateParty
);

// Delete party (soft delete)
router.delete(
  "/:id",
  idValidationRules,
  validation.handleValidationErrors,
  partyController.deleteParty
);

module.exports = router;
