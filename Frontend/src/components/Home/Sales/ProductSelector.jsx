import React, {useState, useEffect, useRef} from "react";
import {Form, Dropdown, ListGroup, Spinner} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSearch, faBox, faCog} from "@fortawesome/free-solid-svg-icons";

function ProductSelector({
  value = "",
  onChange,
  placeholder = "Search products or enter custom item...",
  companyId,
  addToast,
  allowCustom = true,
  className = "",
}) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load products on mount
  useEffect(() => {
    if (companyId) {
      loadProducts();
    }
  }, [companyId]);

  // Filter products based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  // Load products from inventory
  const loadProducts = async () => {
    try {
      setIsLoading(true);

      // TODO: Replace with actual inventory service
      // For now, simulate loading with dummy data
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dummyProducts = [
        {
          id: "1",
          name: "Laptop Computer",
          sku: "LAP001",
          price: 45000,
          gstRate: 18,
          unit: "pcs",
          category: "Electronics",
          currentStock: 15,
        },
        {
          id: "2",
          name: "Office Chair",
          sku: "CHR001",
          price: 8500,
          gstRate: 18,
          unit: "pcs",
          category: "Furniture",
          currentStock: 25,
        },
        {
          id: "3",
          name: "Consulting Service",
          sku: "SRV001",
          price: 2000,
          gstRate: 18,
          unit: "hour",
          category: "Services",
          isService: true,
        },
        {
          id: "4",
          name: "Mobile Phone",
          sku: "MOB001",
          price: 25000,
          gstRate: 18,
          unit: "pcs",
          category: "Electronics",
          currentStock: 8,
        },
      ];

      setProducts(dummyProducts);
      setFilteredProducts(dummyProducts);
    } catch (error) {
      console.error("Error loading products:", error);
      addToast?.("Failed to load products", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setSearchTerm(inputValue);
    setShowDropdown(true);
    setSelectedProduct(null);

    // Create a synthetic event for compatibility
    const syntheticEvent = {
      target: {
        value: inputValue,
        selectedProduct: null,
      },
    };

    onChange?.(syntheticEvent);
  };

  // Handle product selection
  const handleProductSelect = (product) => {
    setSearchTerm(product.name);
    setSelectedProduct(product);
    setShowDropdown(false);

    // Create a synthetic event with selected product
    const syntheticEvent = {
      target: {
        value: product.name,
        selectedProduct: product,
      },
    };

    onChange?.(syntheticEvent);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`product-selector ${className}`} ref={dropdownRef}>
      <div className="position-relative">
        <Form.Control
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="product-selector-input"
        />

        {isLoading && (
          <div className="position-absolute top-50 end-0 translate-middle-y me-2">
            <Spinner size="sm" />
          </div>
        )}

        {showDropdown && (
          <div
            className="product-dropdown position-absolute w-100 bg-white border rounded shadow-lg mt-1"
            style={{zIndex: 1050, maxHeight: "300px", overflowY: "auto"}}
          >
            {filteredProducts.length > 0 ? (
              <ListGroup variant="flush">
                {filteredProducts.map((product) => (
                  <ListGroup.Item
                    key={product.id}
                    action
                    onClick={() => handleProductSelect(product)}
                    className="product-item"
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={product.isService ? faCog : faBox}
                            className="me-2 text-muted"
                          />
                          <div>
                            <div className="fw-semibold">{product.name}</div>
                            <small className="text-muted">
                              {product.sku} • {product.category}
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold">
                          ₹{product.price.toLocaleString()}
                        </div>
                        <small className="text-muted">
                          {product.isService
                            ? "Service"
                            : `Stock: ${product.currentStock}`}
                        </small>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : searchTerm ? (
              <div className="p-3 text-center text-muted">
                <div>No products found for "{searchTerm}"</div>
                {allowCustom && (
                  <small className="d-block mt-2">
                    Press Enter to add as custom item
                  </small>
                )}
              </div>
            ) : (
              <div className="p-3 text-center text-muted">
                <FontAwesomeIcon icon={faSearch} className="mb-2" />
                <div>Start typing to search products</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductSelector;
