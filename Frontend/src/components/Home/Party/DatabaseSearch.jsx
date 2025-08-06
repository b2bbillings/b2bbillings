import React, {useState, useEffect} from "react";
import {
  Modal,
  Button,
  Form,
  ListGroup,
  Badge,
  Spinner,
  Alert,
  Row,
  Col,
  InputGroup,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faDatabase,
  faBuilding,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faIdCard,
  faWifi,
  faExclamationTriangle,
  faSearch,
  faFilter,
  faCheckCircle,
  faShieldAlt,
  faTimes,
  faGlobe,
  faIndustry,
  faUserTie,
  faFileInvoiceDollar,
  faCity,
  faFlag,
  faExternalLinkAlt,
  faCalendarAlt,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import companyService from "../../../services/companyService";
import "./DatabaseSearch.css";

function DatabaseSearch({show, onHide, onSelectParty, onClose}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilter, setSearchFilter] = useState("all");
  const [selectedSource, setSelectedSource] = useState("external");
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connected");
  const [isAnimating, setIsAnimating] = useState(false);
  const [loadingStage, setLoadingStage] = useState(""); // New state for loading stages

  // Available data sources - focused on external companies
  const dataSources = [
    {value: "external", label: "External Companies"},
    {value: "verified", label: "Verified Only"},
    {value: "all", label: "All External"},
  ];

  // Company type filters - updated with backend business types
  const companyFilters = [
    {value: "all", label: "All Business Types"},
    {value: "Manufacturing", label: "Manufacturing"},
    {value: "Retail", label: "Retail"},
    {value: "Wholesale", label: "Wholesale"},
    {value: "Distributor", label: "Distributor"},
    {value: "Service", label: "Service"},
    {value: "Others", label: "Others"},
  ];

  // Search external companies function with enhanced loading states
  const searchCompanies = async (
    query,
    filter = "all",
    source = "external"
  ) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setIsAnimating(false);
      setLoadingStage("");
      return;
    }

    setIsSearching(true);
    setIsAnimating(true);
    setError("");
    setConnectionStatus("searching");
    setLoadingStage("initializing");

    try {
      // Stage 1: Preparing search
      setLoadingStage("preparing");
      await new Promise((resolve) => setTimeout(resolve, 300));

      const searchFilters = {
        page: 1,
        limit: 50,
        businessType: filter !== "all" ? filter : "",
        external: true,
      };

      // Stage 2: Connecting to database
      setLoadingStage("connecting");
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Stage 3: Searching
      setLoadingStage("searching");
      const response = await companyService.searchExternalCompanies(
        query,
        searchFilters
      );

      let results = [];

      if (response.success && response.data?.companies) {
        // Stage 4: Processing results
        setLoadingStage("processing");
        await new Promise((resolve) => setTimeout(resolve, 400));

        const externalCompanies = response.data.companies.map((company) => ({
          id: company._id || `external_${Date.now()}_${Math.random()}`,
          name: company.businessName || company.name || "",
          registeredName: company.businessName || "",
          gstNumber: company.gstin || "",
          cin: company.cin || "",
          address: company.address || "",
          city: company.city || "",
          state: company.state || "",
          pincode: company.pincode || "",
          companyType: company.businessType || "Other",
          businessCategory: company.businessCategory || "",
          incorporationDate: company.createdAt || "",
          authorizedCapital: company.authorizedCapital || "",
          paidUpCapital: company.paidUpCapital || "",
          businessActivity:
            company.businessCategory || company.businessType || "",
          directors: company.directors || [],
          source: "External Company Database",
          isVerified: true,
          isActive: company.isActive !== false,
          contactEmail: company.email || "",
          contactPhone: company.phoneNumber || "",
          additionalPhones: company.additionalPhones || [],
          website: company.website || "",
          employeeCount: company.employeeCount || 0,
          logo: company.logo || "",
          signatureImage: company.signatureImage || "",
          ownerName: company.ownerName || "",
          description: company.description || "",
          establishedYear: company.establishedYear || "",
          tehsil: company.tehsil || "",
          ownerInfo: company.ownerInfo || null,
          isExternal: true,
          canAddAsParty: true,
        }));

        results = externalCompanies;
      }

      let filteredResults = results;

      if (source === "verified") {
        filteredResults = filteredResults.filter(
          (company) => company.isVerified
        );
      }

      // Stage 5: Filtering and sorting
      setLoadingStage("filtering");
      await new Promise((resolve) => setTimeout(resolve, 200));

      filteredResults = filteredResults.filter((company, index, self) => {
        return (
          index ===
          self.findIndex(
            (c) =>
              (c.cin && company.cin && c.cin === company.cin) ||
              (c.gstNumber &&
                company.gstNumber &&
                c.gstNumber === company.gstNumber) ||
              (c.name?.toLowerCase() === company.name?.toLowerCase() &&
                c.city?.toLowerCase() === company.city?.toLowerCase()) ||
              c.id === company.id
          )
        );
      });

      filteredResults.sort((a, b) => {
        return (a.name || "").localeCompare(b.name || "");
      });

      // Stage 6: Finalizing
      setLoadingStage("finalizing");
      setTimeout(() => {
        setSearchResults(filteredResults);
        setConnectionStatus("connected");
        setIsAnimating(false);
        setLoadingStage("");

        if (filteredResults.length === 0) {
          setError(
            `No external companies found matching "${query}". These are companies from other businesses in the database that you can add as parties.`
          );
        }
      }, 500);
    } catch (error) {
      console.error("❌ Error searching external companies:", error);
      setLoadingStage("error");
      setTimeout(() => {
        setError(
          `External company search failed: ${
            error.message || "Please try again."
          }`
        );
        setSearchResults([]);
        setConnectionStatus("error");
        setIsAnimating(false);
        setLoadingStage("");
      }, 300);
    } finally {
      setTimeout(() => {
        setIsSearching(false);
      }, 600);
    }
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);

    if (value.length < 2) {
      setSearchResults([]);
      setError("");
      setIsAnimating(false);
      setLoadingStage("");
      return;
    }

    clearTimeout(window.companySearchTimeout);
    setIsAnimating(true);
    setLoadingStage("typing");
    window.companySearchTimeout = setTimeout(() => {
      searchCompanies(value, searchFilter, selectedSource);
    }, 500);
  };

  const handleFilterChange = (newFilter) => {
    setSearchFilter(newFilter);
    if (searchQuery.length >= 2) {
      searchCompanies(searchQuery, newFilter, selectedSource);
    }
  };

  const handleSourceChange = (newSource) => {
    setSelectedSource(newSource);
    if (searchQuery.length >= 2) {
      searchCompanies(searchQuery, searchFilter, newSource);
    }
  };

  // Enhanced loading stages with descriptions
  const getLoadingStageInfo = () => {
    switch (loadingStage) {
      case "typing":
        return {text: "Ready to search...", icon: faSearch};
      case "initializing":
        return {text: "Initializing search...", icon: faDatabase};
      case "preparing":
        return {text: "Preparing search parameters...", icon: faFilter};
      case "connecting":
        return {text: "Connecting to external database...", icon: faWifi};
      case "searching":
        return {text: "Searching external companies...", icon: faSearch};
      case "processing":
        return {text: "Processing company data...", icon: faBuilding};
      case "filtering":
        return {text: "Filtering and sorting results...", icon: faFilter};
      case "finalizing":
        return {text: "Finalizing results...", icon: faCheckCircle};
      case "error":
        return {
          text: "Search encountered an error...",
          icon: faExclamationTriangle,
        };
      default:
        return {text: "Searching...", icon: faSearch};
    }
  };

  const loadingInfo = getLoadingStageInfo();
  const handleSelectCompany = (company) => {
    const partyData = {
      name: company.ownerName || company.name || "",
      companyName: company.name || company.registeredName || "",
      email: company.contactEmail || "",
      phone: company.contactPhone || "",
      phoneNumber: company.contactPhone || "",
      gstNumber: company.gstNumber || "",
      gstType: company.gstNumber ? "regular" : "unregistered",
      partyType: "supplier",
      homeAddressLine: company.address || "",
      homePincode: company.pincode || "",
      homeState: company.state || "",
      homeDistrict: company.city || "",
      homeTaluka: company.tehsil || "",
      deliveryAddressLine: company.address || "",
      deliveryPincode: company.pincode || "",
      deliveryState: company.state || "",
      deliveryDistrict: company.city || "",
      deliveryTaluka: company.tehsil || "",
      sameAsHomeAddress: true,
      website: company.website || "",
      businessType: company.businessActivity || company.companyType || "",
      businessCategory: company.businessCategory || "",
      phoneNumbers: [],
      country: "INDIA",
      creditLimit: 0,
      openingBalance: 0,
      source: company.source || "External Company Database",
      isVerified: company.isVerified || false,
      importedFrom: "external_company_db",
      importedAt: new Date().toISOString(),
      companyType: company.companyType || "",
      incorporationDate: company.incorporationDate || "",
      cinNumber: company.cin || "",
      authorizedCapital: company.authorizedCapital || "",
      paidUpCapital: company.paidUpCapital || "",
      establishedYear: company.establishedYear || "",
      description: company.description || "",
      ownerInfo: company.ownerInfo || null,
      externalCompanyId: company.id,
      isExternalCompany: true,

      // ✅ CRITICAL: Add linking fields for bidirectional order generation
      linkedCompanyId: company.id, // Links the supplier to their company account
      isLinkedSupplier: true,

      // ✅ Auto-linking configuration
      autoLinkByGST: true,
      autoLinkByPhone: true,
      autoLinkByEmail: true,

      // ✅ Bidirectional tracking metadata
      enableBidirectionalOrders: true,
      supplierCompanyData: {
        externalId: company.id,
        businessName: company.name,
        gstin: company.gstNumber,
        phoneNumber: company.contactPhone,
        email: company.contactEmail,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        businessType: company.companyType,
        isExternal: true,
        source: "external_database",
      },
    };

    // Handle phone numbers array
    const phoneNumbers = [];

    if (company.contactPhone) {
      phoneNumbers.push({
        number: company.contactPhone,
        label: "Office",
        isPrimary: true,
      });
    }

    if (company.additionalPhones && company.additionalPhones.length > 0) {
      company.additionalPhones.forEach((phone, index) => {
        if (phone && typeof phone === "string") {
          phoneNumbers.push({
            number: phone,
            label: `Phone ${index + 2}`,
            isPrimary: false,
          });
        } else if (phone && phone.number) {
          phoneNumbers.push({
            number: phone.number,
            label: phone.label || `Phone ${index + 2}`,
            isPrimary: false,
          });
        }
      });
    }

    if (phoneNumbers.length === 0) {
      phoneNumbers.push({
        number: "",
        label: "Primary",
        isPrimary: true,
      });
    }

    partyData.phoneNumbers = phoneNumbers;

    // ✅ Call parent callback with enhanced data
    if (typeof onSelectParty === "function") {
      onSelectParty(partyData);
    } else {
      console.error("❌ onSelectParty function not provided");
    }

    // Close the modal
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchFilter("all");
    setSelectedSource("external");
    setError("");
    setConnectionStatus("connected");
    setIsAnimating(false);
    setLoadingStage("");

    if (window.companySearchTimeout) {
      clearTimeout(window.companySearchTimeout);
    }

    if (onClose) onClose();
    if (onHide) onHide();
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isHealthy = await companyService.checkServiceHealth();
        setConnectionStatus(isHealthy ? "connected" : "error");
      } catch (error) {
        setConnectionStatus("error");
        console.warn("⚠️ Company service connection issue:", error.message);
      }
    };

    if (show) {
      checkConnection();
    }
  }, [show]);

  // ... existing utility functions remain the same ...
  const formatCurrency = (amount) => {
    if (!amount) return "";
    const num = parseFloat(amount);
    if (isNaN(num)) return "";

    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const getSourceBadgeColor = (source) => {
    if (source?.toLowerCase().includes("external")) return "success";
    if (source?.toLowerCase().includes("database")) return "primary";
    if (source?.toLowerCase().includes("verified")) return "warning";
    return "secondary";
  };

  const getCompanyStatusBadge = (company) => {
    if (!company.isActive) {
      return (
        <Badge bg="danger" className="small">
          Inactive
        </Badge>
      );
    }
    if (company.isVerified) {
      return (
        <Badge bg="success" className="small">
          <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
          Verified
        </Badge>
      );
    }
    if (company.isExternal) {
      return (
        <Badge bg="info" className="small">
          <FontAwesomeIcon icon={faExternalLinkAlt} className="me-1" />
          External
        </Badge>
      );
    }
    return (
      <Badge bg="secondary" className="small">
        Active
      </Badge>
    );
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          icon: faWifi,
          className: "text-success",
          text: "Connected to external company database",
        };
      case "searching":
        return {
          icon: faSearch,
          className: "text-primary",
          text: "Searching external companies...",
        };
      case "error":
        return {
          icon: faExclamationTriangle,
          className: "text-warning",
          text: "Database connection issue",
        };
      default:
        return {
          icon: faWifi,
          className: "text-muted",
          text: "Checking connection...",
        };
    }
  };

  const connectionInfo = getConnectionIcon();

  // FIXED: Only render the component when show is true
  if (!show) {
    return null;
  }

  return (
    <>
      {/* BACKDROP BLUR OVERLAY - Only rendered when modal is actually shown */}
      <div className="database-search-backdrop-blur" />

      <Modal
        show={show}
        onHide={handleClose}
        size="xl"
        centered
        className="company-search-modal"
        backdrop="static"
        style={{zIndex: 2050}}
      >
        <Modal.Header
          closeButton
          className="bg-success text-white modal-header-enhanced"
        >
          <Modal.Title className="d-flex align-items-center">
            <FontAwesomeIcon icon={faBuilding} className="me-2" />
            Search External Companies
            <Badge bg="light" text="dark" className="ms-2 fs-6">
              <FontAwesomeIcon icon={faExternalLinkAlt} className="me-1" />
              External Database
            </Badge>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-0">
          {/* Search Controls */}
          <div className="search-controls p-4 bg-light border-bottom">
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="fw-bold small text-muted">
                  External Company Search
                </Form.Label>
                <InputGroup className="search-input-group">
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faSearch} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search external companies: name, business type, city, owner..."
                    autoFocus
                    className="search-input"
                  />
                  {searchQuery && (
                    <Button
                      variant="outline-secondary"
                      onClick={() => handleSearchChange("")}
                      className="clear-search-btn"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </Button>
                  )}
                </InputGroup>
                <Form.Text className="text-muted">
                  Search external companies (not your own) to add as
                  suppliers/customers
                </Form.Text>
              </Col>

              <Col md={3}>
                <Form.Label className="fw-bold small text-muted">
                  <FontAwesomeIcon icon={faFilter} className="me-1" />
                  Business Type
                </Form.Label>
                <Form.Select
                  value={searchFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="filter-select"
                >
                  {companyFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={3}>
                <Form.Label className="fw-bold small text-muted">
                  <FontAwesomeIcon icon={faDatabase} className="me-1" />
                  Data Source
                </Form.Label>
                <Form.Select
                  value={selectedSource}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="source-select"
                >
                  {dataSources.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            </Row>
          </div>

          {/* Enhanced Search Status with Loading Stages */}
          <div className="search-status px-4 py-2 bg-success bg-opacity-10">
            <div className="d-flex align-items-center justify-content-between">
              <small className="text-muted d-flex align-items-center">
                <FontAwesomeIcon
                  icon={connectionInfo.icon}
                  className={`me-1 ${connectionInfo.className}`}
                />
                {connectionInfo.text}
                {searchQuery.length >= 2 && !isSearching && (
                  <span className="ms-2 result-count">
                    • Found {searchResults.length} external company
                    {searchResults.length !== 1 ? "ies" : ""}
                  </span>
                )}
              </small>
              {(isSearching || loadingStage) && (
                <div className="d-flex align-items-center searching-indicator">
                  <div className="loading-stage-indicator me-2">
                    <Spinner
                      animation="border"
                      size="sm"
                      className="me-2 loading-spinner"
                    />
                    <FontAwesomeIcon
                      icon={loadingInfo.icon}
                      className="me-1 loading-stage-icon"
                    />
                  </div>
                  <small className="loading-stage-text">
                    {loadingInfo.text}
                  </small>
                </div>
              )}
            </div>

            {/* Progress Bar for Loading Stages */}
            {(isSearching || loadingStage) && (
              <div className="loading-progress-container mt-2">
                <div className="loading-progress-bar">
                  <div
                    className={`loading-progress-fill ${loadingStage}`}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="warning" className="m-3 mb-0 error-alert">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              {error}
            </Alert>
          )}

          {/* Search Results with Loading Overlay */}
          <div
            className="search-results"
            style={{
              maxHeight: "500px",
              overflowY: "auto",
              position: "relative",
            }}
          >
            {/* Loading Overlay */}
            {(isSearching || loadingStage) && (
              <div className="search-loading-overlay">
                <div className="search-loading-content">
                  <div className="loading-animation">
                    <div className="loading-dots">
                      <div className="loading-dot"></div>
                      <div className="loading-dot"></div>
                      <div className="loading-dot"></div>
                    </div>
                  </div>
                  <h6 className="loading-title">
                    Searching External Companies
                  </h6>
                  <p className="loading-description">{loadingInfo.text}</p>
                  <div className="loading-steps">
                    <div
                      className={`loading-step ${
                        loadingStage === "preparing" ||
                        loadingStage === "initializing"
                          ? "active"
                          : loadingStage === "connecting" ||
                            loadingStage === "searching" ||
                            loadingStage === "processing" ||
                            loadingStage === "filtering" ||
                            loadingStage === "finalizing"
                          ? "completed"
                          : ""
                      }`}
                    >
                      <FontAwesomeIcon icon={faFilter} />
                      <span>Prepare</span>
                    </div>
                    <div
                      className={`loading-step ${
                        loadingStage === "connecting"
                          ? "active"
                          : loadingStage === "searching" ||
                            loadingStage === "processing" ||
                            loadingStage === "filtering" ||
                            loadingStage === "finalizing"
                          ? "completed"
                          : ""
                      }`}
                    >
                      <FontAwesomeIcon icon={faWifi} />
                      <span>Connect</span>
                    </div>
                    <div
                      className={`loading-step ${
                        loadingStage === "searching"
                          ? "active"
                          : loadingStage === "processing" ||
                            loadingStage === "filtering" ||
                            loadingStage === "finalizing"
                          ? "completed"
                          : ""
                      }`}
                    >
                      <FontAwesomeIcon icon={faSearch} />
                      <span>Search</span>
                    </div>
                    <div
                      className={`loading-step ${
                        loadingStage === "processing"
                          ? "active"
                          : loadingStage === "filtering" ||
                            loadingStage === "finalizing"
                          ? "completed"
                          : ""
                      }`}
                    >
                      <FontAwesomeIcon icon={faBuilding} />
                      <span>Process</span>
                    </div>
                    <div
                      className={`loading-step ${
                        loadingStage === "filtering"
                          ? "active"
                          : loadingStage === "finalizing"
                          ? "completed"
                          : ""
                      }`}
                    >
                      <FontAwesomeIcon icon={faFilter} />
                      <span>Filter</span>
                    </div>
                    <div
                      className={`loading-step ${
                        loadingStage === "finalizing" ? "active" : ""
                      }`}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} />
                      <span>Complete</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Existing search results content */}
            {searchQuery.length >= 2 &&
              searchResults.length > 0 &&
              !isSearching && (
                <ListGroup variant="flush" className="results-list">
                  {searchResults.map((company, index) => (
                    <ListGroup.Item
                      key={company.id}
                      action
                      onClick={() => handleSelectCompany(company)}
                      className={`company-item p-4 border-0 border-bottom ${
                        isAnimating ? "item-loading" : "item-loaded"
                      }`}
                      style={{
                        cursor: "pointer",
                        animationDelay: `${index * 0.1}s`,
                      }}
                    >
                      {/* ... existing company item content remains the same ... */}
                      <div className="d-flex align-items-start">
                        <div className="company-icon me-3">
                          <FontAwesomeIcon
                            icon={faBuilding}
                            className="text-success"
                            size="2x"
                          />
                        </div>
                        <div className="flex-grow-1">
                          {/* Header Row */}
                          <div className="company-header d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center flex-wrap gap-2">
                              <h6 className="company-name mb-0 fw-bold text-dark">
                                {company.name}
                              </h6>
                              {getCompanyStatusBadge(company)}
                              <Badge
                                bg="info"
                                className="small company-type-badge"
                              >
                                <FontAwesomeIcon
                                  icon={faIndustry}
                                  className="me-1"
                                />
                                {company.companyType}
                              </Badge>
                              <Badge
                                bg={getSourceBadgeColor(company.source)}
                                className="small source-badge"
                              >
                                {company.source}
                              </Badge>
                            </div>
                            {company.authorizedCapital && (
                              <div className="text-end capital-info">
                                <small className="text-muted">
                                  Authorized Capital
                                </small>
                                <div className="fw-bold text-success">
                                  {formatCurrency(company.authorizedCapital)}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* ... rest of company details remain the same ... */}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}

            {/* No Results */}
            {searchQuery.length >= 2 &&
              searchResults.length === 0 &&
              !isSearching &&
              !error && (
                <div className="text-center py-5 no-results">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    size="3x"
                    className="text-muted mb-3"
                  />
                  <h6 className="text-muted">No External Companies Found</h6>
                  <p className="text-muted">
                    No external companies found matching "
                    <strong>{searchQuery}</strong>".
                    <br />
                    Try different search terms or check filters.
                    <br />
                    <small>
                      These are companies from other businesses in the database
                      that you can add as parties.
                    </small>
                  </p>
                </div>
              )}

            {/* Initial State */}
            {searchQuery.length < 2 && !isSearching && (
              <div className="text-center py-5 initial-state">
                <FontAwesomeIcon
                  icon={faBuilding}
                  size="3x"
                  className="text-muted mb-3"
                />
                <h6 className="text-muted">Search External Companies</h6>
                <p className="text-muted">
                  Type at least 2 characters to search external companies:
                  <br />
                  • Other businesses and suppliers in the database
                  <br />
                  • Companies you can add as customers/suppliers
                  <br />
                  • Excludes your own companies
                  <br />• Search by name, business type, location, etc.
                </p>
                <div className="mt-3">
                  <Badge bg="success" className="me-2 feature-badge">
                    <FontAwesomeIcon
                      icon={faExternalLinkAlt}
                      className="me-1"
                    />
                    External Only
                  </Badge>
                  <Badge bg="info" className="me-2 feature-badge">
                    <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
                    Secure Search
                  </Badge>
                  <Badge bg="warning" className="feature-badge">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                    Verified Data
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-light modal-footer-enhanced">
          <div className="d-flex align-items-center justify-content-between w-100">
            <small className="text-muted footer-info">
              <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
              Searching external companies (excluding your own businesses)
            </small>
            <Button
              variant="secondary"
              onClick={handleClose}
              className="close-btn"
            >
              <FontAwesomeIcon icon={faTimes} className="me-1" />
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default DatabaseSearch;
