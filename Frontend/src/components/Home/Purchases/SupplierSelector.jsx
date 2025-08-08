import React, {useState, useRef, useEffect} from "react";
import {Form, ListGroup} from "react-bootstrap";

function SupplierSelector({suppliers, selectedSupplier, onSupplierSelection}) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const inputRef = useRef();

  // Filter suppliers based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = suppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(inputValue.toLowerCase()) ||
          (supplier.phone && supplier.phone.includes(inputValue)) ||
          (supplier.gstNumber &&
            supplier.gstNumber.toLowerCase().includes(inputValue.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuppliers([]);
      setShowSuggestions(false);
    }
  }, [inputValue, suppliers]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Call parent handler for custom entries
    const event = {
      target: {
        value: value,
        selectedSupplierData: null,
      },
    };
    onSupplierSelection(event);
  };

  // Handle supplier selection
  const handleSupplierSelect = (supplier) => {
    setInputValue(supplier.name);
    setShowSuggestions(false);

    const event = {
      target: {
        value: supplier.id.toString(),
        selectedSupplierData: supplier,
      },
    };
    onSupplierSelection(event);
  };

  // Set initial value if supplier is pre-selected
  useEffect(() => {
    if (selectedSupplier && suppliers.length > 0) {
      const supplier = suppliers.find(
        (s) => s.id.toString() === selectedSupplier
      );
      if (supplier) {
        setInputValue(supplier.name);
      }
    }
  }, [selectedSupplier, suppliers]);

  return (
    <div className="position-relative">
      <Form.Control
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() =>
          inputValue && setShowSuggestions(filteredSuppliers.length > 0)
        }
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="Search suppliers or enter supplier name..."
      />

      {showSuggestions && (
        <div className="suggestion-dropdown">
          <ListGroup variant="flush">
            {filteredSuppliers.map((supplier) => (
              <ListGroup.Item
                key={supplier.id}
                action
                onClick={() => handleSupplierSelect(supplier)}
                className="suggestion-item"
              >
                <div className="fw-semibold">{supplier.name}</div>
                <div className="small text-muted">
                  {supplier.phone && (
                    <span className="me-3">📞 {supplier.phone}</span>
                  )}
                  {supplier.city && (
                    <span className="me-3">📍 {supplier.city}</span>
                  )}
                  {supplier.gstNumber && <span>GST: {supplier.gstNumber}</span>}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
      )}
    </div>
  );
}

export default SupplierSelector;
