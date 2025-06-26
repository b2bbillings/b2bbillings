import React, {useState, useRef, useEffect} from "react";
import {Form, InputGroup, Button, Dropdown} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faTimes,
  faFilter,
  faUser,
  faBuilding,
  faTruck,
  faShoppingCart,
  faHeadset,
  faHistory,
} from "@fortawesome/free-solid-svg-icons";

function SearchBar({
  searchQuery = "",
  onSearchChange,
  placeholder = "Search conversations...",
  showFilters = false,
  filters = {},
  onFilterChange,
  showHistory = false,
  searchHistory = [],
  onHistorySelect,
  onHistoryClear,
  disabled = false,
  size = "md",
  className = "",
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  // Handle clear search
  const handleClear = () => {
    if (onSearchChange) {
      onSearchChange("");
    }
    inputRef.current?.focus();
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setShowDropdown(false);
      // Add to history if not already present
      if (
        showHistory &&
        onHistorySelect &&
        !searchHistory.includes(searchQuery.trim())
      ) {
        // This would typically be handled by parent component
        console.log("Add to search history:", searchQuery.trim());
      }
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    if (showHistory && searchHistory.length > 0) {
      setShowDropdown(true);
    }
  };

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding dropdown to allow clicks
    setTimeout(() => setShowDropdown(false), 150);
  };

  // Handle history item click
  const handleHistoryClick = (historyItem) => {
    if (onHistorySelect) {
      onHistorySelect(historyItem);
    }
    if (onSearchChange) {
      onSearchChange(historyItem);
    }
    setShowDropdown(false);
  };

  // Filter options
  const filterOptions = [
    {key: "all", label: "All Types", icon: faSearch},
    {key: "user", label: "Users", icon: faUser},
    {key: "company", label: "Companies", icon: faBuilding},
    {key: "supplier", label: "Suppliers", icon: faTruck},
    {key: "buyer", label: "Buyers", icon: faShoppingCart},
    {key: "support", label: "Support", icon: faHeadset},
  ];

  // Get active filter label
  const getActiveFilterLabel = () => {
    const activeFilter = filterOptions.find(
      (option) => option.key === filters?.type
    );
    return activeFilter ? activeFilter.label : "All Types";
  };

  // Get size classes
  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "form-control-sm";
      case "lg":
        return "form-control-lg";
      default:
        return "";
    }
  };

  return (
    <div className={`search-bar position-relative ${className}`}>
      <InputGroup className={getSizeClass()}>
        {/* Search Icon */}
        <InputGroup.Text className="bg-light border-end-0">
          <FontAwesomeIcon
            icon={faSearch}
            className={`text-muted ${isFocused ? "text-primary" : ""}`}
          />
        </InputGroup.Text>

        {/* Search Input */}
        <Form.Control
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={`border-start-0 ${showFilters ? "border-end-0" : ""}`}
          style={{
            backgroundColor: "transparent",
            boxShadow: isFocused ? "0 0 0 0.2rem rgba(0,123,255,.25)" : "none",
          }}
        />

        {/* Clear Button */}
        {searchQuery && (
          <InputGroup.Text
            className="bg-transparent border-start-0 border-end-0"
            style={{cursor: "pointer"}}
            onClick={handleClear}
            title="Clear search"
          >
            <FontAwesomeIcon icon={faTimes} className="text-muted" />
          </InputGroup.Text>
        )}

        {/* Filter Dropdown */}
        {showFilters && (
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="outline-secondary"
              className="border-start-0"
              title="Search filters"
            >
              <FontAwesomeIcon icon={faFilter} className="me-1" />
              {size !== "sm" && (
                <span className="d-none d-md-inline">
                  {getActiveFilterLabel()}
                </span>
              )}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Header>Search in:</Dropdown.Header>
              {filterOptions.map((option) => (
                <Dropdown.Item
                  key={option.key}
                  active={filters?.type === option.key}
                  onClick={() =>
                    onFilterChange &&
                    onFilterChange({...filters, type: option.key})
                  }
                >
                  <FontAwesomeIcon icon={option.icon} className="me-2" />
                  {option.label}
                </Dropdown.Item>
              ))}
              <Dropdown.Divider />
              <Dropdown.Item
                onClick={() => onFilterChange && onFilterChange({type: "all"})}
              >
                Clear Filters
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
      </InputGroup>

      {/* Search History Dropdown */}
      {showHistory && showDropdown && searchHistory.length > 0 && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
          style={{zIndex: 1000, maxHeight: "200px", overflowY: "auto"}}
        >
          <div className="p-2 border-bottom bg-light">
            <div className="d-flex align-items-center justify-content-between">
              <small className="text-muted fw-semibold">
                <FontAwesomeIcon icon={faHistory} className="me-1" />
                Recent Searches
              </small>
              {onHistoryClear && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-decoration-none"
                  onClick={onHistoryClear}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {searchHistory.slice(0, 5).map((item, index) => (
            <div
              key={index}
              className="p-2 hover-bg-light cursor-pointer border-bottom"
              onClick={() => handleHistoryClick(item)}
              style={{cursor: "pointer"}}
              onMouseEnter={(e) => e.target.classList.add("bg-light")}
              onMouseLeave={(e) => e.target.classList.remove("bg-light")}
            >
              <div className="d-flex align-items-center">
                <FontAwesomeIcon
                  icon={faHistory}
                  className="text-muted me-2"
                  size="sm"
                />
                <span className="text-truncate">{item}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom styles for hover effects */}
      <style jsx>{`
        .hover-bg-light:hover {
          background-color: #f8f9fa !important;
        }
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default SearchBar;
