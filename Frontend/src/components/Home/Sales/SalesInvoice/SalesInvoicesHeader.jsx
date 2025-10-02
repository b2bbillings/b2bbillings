import React, { useState } from "react";
import {
  Navbar,
  Container,
  Row,
  Col,
  InputGroup,
  Form,
  Button,
  ButtonGroup,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faEllipsisH,
  faCog,
  faClipboardList,
  faFilter,
  faFileInvoice,
} from "@fortawesome/free-solid-svg-icons";
import {useNavigate, useParams} from "react-router-dom";
import BillForm from "../../../Bills/BillForm";

function SalesInvoicesHeader({
  searchTerm,
  onSearchChange,
  onAddSale,
  onAddPurchase,
  onMoreOptions,
  onSettings,
  pageTitle = "Sales Invoices",
  companyId: propCompanyId,
  currentCompany,
  addToast,
  onNavigate,
  showFilters,
  onToggleFilters,
}) {
  const navigate = useNavigate();
  const {companyId: urlCompanyId} = useParams();
  const [showBillForm, setShowBillForm] = useState(false);

  const getCompanyId = () => {
    return (
      propCompanyId || urlCompanyId || currentCompany?.id || currentCompany?._id
    );
  };

  const handleAddSale = (e) => {
    e.preventDefault();
    const effectiveCompanyId = getCompanyId();

    if (!effectiveCompanyId) {
      addToast?.(
        "Please select a company first to create a sales invoice",
        "warning"
      );
      return;
    }

    try {
      if (onNavigate && typeof onNavigate === "function") {
        onNavigate("createSalesInvoice");
      } else if (onAddSale && typeof onAddSale === "function") {
        onAddSale();
      } else {
        const targetUrl = `/companies/${effectiveCompanyId}/sales-invoices/add`;
        navigate(targetUrl);
      }
      addToast?.("Opening sales invoice form...", "info");
    } catch (error) {
      addToast?.("Failed to open sales invoice form", "error");
    }
  };

  const handleAddPurchase = (e) => {
    e.preventDefault();
    const effectiveCompanyId = getCompanyId();

    if (!effectiveCompanyId) {
      addToast?.(
        "Please select a company first to create a purchase",
        "warning"
      );
      return;
    }

    try {
      if (onNavigate && typeof onNavigate === "function") {
        onNavigate("createPurchase");
      } else if (onAddPurchase && typeof onAddPurchase === "function") {
        onAddPurchase();
      } else {
        navigate(`/companies/${effectiveCompanyId}/purchases/add`);
      }
      addToast?.("Opening purchase form...", "info");
    } catch (error) {
      addToast?.("Failed to open purchase form", "error");
    }
  };

  const handleCreateBill = (e) => {
    e.preventDefault();
    const effectiveCompanyId = getCompanyId();

    if (!effectiveCompanyId) {
      addToast?.(
        "Please select a company first to create a bill",
        "warning"
      );
      return;
    }

    setShowBillForm(true);
    addToast?.("Opening bill form...", "info");
  };

  const handleBillFormClose = () => {
    setShowBillForm(false);
  };

  const handleBillFormSave = (billData) => {
    addToast?.("Bill created successfully!", "success");
    setShowBillForm(false);
    // Optionally refresh the page or update the list
  };

  const handleMoreOptions = (e) => {
    e.preventDefault();
    if (onMoreOptions && typeof onMoreOptions === "function") {
      onMoreOptions();
    } else {
      addToast?.("More options menu coming soon!", "info");
    }
  };

  const handleSettings = (e) => {
    e.preventDefault();
    if (onSettings && typeof onSettings === "function") {
      onSettings();
    } else {
      const effectiveCompanyId = getCompanyId();
      if (effectiveCompanyId) {
        if (onNavigate && typeof onNavigate === "function") {
          onNavigate("settings");
        } else {
          navigate(`/companies/${effectiveCompanyId}/settings`);
        }
      } else {
        addToast?.("Please select a company first", "warning");
      }
    }
  };

  // Enhanced styling theme object
  const modernTheme = {
    colors: {
      primary: '#6366f1',
      primaryLight: '#8b5cf6',
      primaryDark: '#4f46e5',
      success: '#10b981',
      successDark: '#059669',
      background: '#ffffff',
      backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: '#e2e8f0',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    },
    borderRadius: {
      sm: '0.375rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem'
    }
  };

  return (
    <div>
      <div
        style={{
          background: modernTheme.colors.background,
          borderRadius: modernTheme.borderRadius.lg,
          boxShadow: modernTheme.colors.shadow,
          border: `1px solid ${modernTheme.colors.border}`,
          overflow: 'hidden'
        }}
      >
        <Container fluid className="p-0">
          <Row className="w-100 align-items-center g-0" style={{ minHeight: '70px' }}>
            {/* Search Section - Enhanced */}
            <Col lg={6} md={7} className="p-3">
              <div 
                style={{
                  background: `linear-gradient(135deg, ${modernTheme.colors.background} 0%, #f8fafc 100%)`,
                  borderRadius: modernTheme.borderRadius.lg,
                  padding: '0.5rem',
                  border: `1px solid ${modernTheme.colors.border}`,
                  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <InputGroup>
                  <InputGroup.Text
                    style={{
                      background: `linear-gradient(135deg, ${modernTheme.colors.primary}15, ${modernTheme.colors.primaryLight}10)`,
                      border: 'none',
                      borderRadius: `${modernTheme.borderRadius.md} 0 0 ${modernTheme.borderRadius.md}`,
                      color: modernTheme.colors.primary
                    }}
                  >
                    <FontAwesomeIcon icon={faSearch} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search invoices, customers, items..."
                    value={searchTerm || ""}
                    onChange={onSearchChange}
                    style={{
                      border: 'none',
                      borderRadius: `0 ${modernTheme.borderRadius.md} ${modernTheme.borderRadius.md} 0`,
                      fontSize: '0.95rem',
                      padding: '0.75rem 1rem'
                    }}
                    className="modern-search-input"
                  />
                </InputGroup>
              </div>
            </Col>

            {/* Action Buttons Section - Enhanced */}
            <Col lg={6} md={5} className="p-3">
              <div className="d-flex justify-content-end gap-3 flex-wrap align-items-center">
                {/* Filter Button */}
                <Button
                  size="sm"
                  className={`modern-filter-btn d-flex align-items-center px-3 py-2 fw-semibold ${showFilters ? 'active' : ''}`}
                  onClick={onToggleFilters}
                  style={{
                    background: showFilters 
                      ? `linear-gradient(135deg, ${modernTheme.colors.primary} 0%, ${modernTheme.colors.primaryLight} 100%)` 
                      : 'transparent',
                    border: `2px solid ${modernTheme.colors.primary}`,
                    borderRadius: modernTheme.borderRadius.lg,
                    color: showFilters ? 'white' : modernTheme.colors.primary,
                    fontSize: '0.9rem',
                    boxShadow: showFilters ? modernTheme.colors.shadow : 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FontAwesomeIcon icon={faFilter} className="me-2" />
                  <span className="d-none d-sm-inline">Filter</span>
                </Button>
                
                {/* Add Sales Invoice Button */}
                <Button
                  size="sm"
                  className="modern-primary-btn d-flex align-items-center px-4 py-2 fw-semibold"
                  onClick={handleAddSale}
                  disabled={!getCompanyId()}
                  style={{
                    background: `linear-gradient(135deg, ${modernTheme.colors.primary} 0%, ${modernTheme.colors.primaryLight} 100%)`,
                    border: 'none',
                    borderRadius: modernTheme.borderRadius.lg,
                    color: 'white',
                    fontSize: '0.9rem',
                    boxShadow: modernTheme.colors.shadow,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                  <span className="d-none d-sm-inline">Add Sale</span>
                  <span className="d-sm-none">Add</span>
                </Button>

                {/* Add Purchase Button */}
                <Button
                  size="sm"
                  className="modern-success-btn d-flex align-items-center px-4 py-2 fw-semibold"
                  onClick={handleAddPurchase}
                  disabled={!getCompanyId()}
                  style={{
                    background: `linear-gradient(135deg, ${modernTheme.colors.success} 0%, ${modernTheme.colors.successDark} 100%)`,
                    border: 'none',
                    borderRadius: modernTheme.borderRadius.lg,
                    color: 'white',
                    fontSize: '0.9rem',
                    boxShadow: modernTheme.colors.shadow,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  <span className="d-none d-sm-inline">Add Purchase</span>
                  <span className="d-sm-none">Purchase</span>
                </Button>

                {/* Create Bill Button */}
                <Button
                  size="sm"
                  className="modern-info-btn d-flex align-items-center px-4 py-2 fw-semibold"
                  onClick={handleCreateBill}
                  disabled={!getCompanyId()}
                  style={{
                    background: `linear-gradient(135deg, ${modernTheme.colors.info} 0%, ${modernTheme.colors.infoDark} 100%)`,
                    border: 'none',
                    borderRadius: modernTheme.borderRadius.lg,
                    color: 'white',
                    fontSize: '0.9rem',
                    boxShadow: modernTheme.colors.shadow,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                  <span className="d-none d-sm-inline">Create Bill</span>
                  <span className="d-sm-none">Bill</span>
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <style>{`
        /* Modern search input styling */
        .modern-search-input:focus {
          border-color: ${modernTheme.colors.primary} !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
          outline: none;
        }

        .modern-search-input::placeholder {
          color: #94a3b8;
          font-style: italic;
        }

        /* Modern button hover effects */
        .modern-primary-btn:hover {
          background: linear-gradient(135deg, ${modernTheme.colors.primaryDark} 0%, #7c3aed 100%) !important;
          transform: translateY(-2px);
          box-shadow: ${modernTheme.colors.shadowLg} !important;
        }

        .modern-primary-btn:active {
          transform: translateY(0);
        }

        .modern-success-btn:hover {
          background: linear-gradient(135deg, ${modernTheme.colors.successDark} 0%, #047857 100%) !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3) !important;
        }

        .modern-success-btn:active {
          transform: translateY(0);
        }

        .modern-outline-btn:hover {
          background: ${modernTheme.colors.primary} !important;
          color: white !important;
          transform: translateY(-1px);
          box-shadow: ${modernTheme.colors.shadow} !important;
        }

        .modern-outline-btn:active {
          transform: translateY(0);
        }

        .modern-filter-btn:hover {
          background: linear-gradient(135deg, ${modernTheme.colors.primary} 0%, ${modernTheme.colors.primaryLight} 100%) !important;
          color: white !important;
          transform: translateY(-2px);
          box-shadow: ${modernTheme.colors.shadowLg} !important;
        }

        .modern-filter-btn:active {
          transform: translateY(0);
        }

        .modern-filter-btn.active {
          background: linear-gradient(135deg, ${modernTheme.colors.primary} 0%, ${modernTheme.colors.primaryLight} 100%) !important;
          color: white !important;
          box-shadow: ${modernTheme.colors.shadow} !important;
        }

        /* Disabled state */
        .modern-primary-btn:disabled,
        .modern-success-btn:disabled {
          opacity: 0.6;
          transform: none !important;
          box-shadow: none !important;
          cursor: not-allowed;
        }

        /* Enhanced responsive design */
        @media (max-width: 991.98px) {
          .gap-3 {
            gap: 0.75rem !important;
          }
        }

        @media (max-width: 767.98px) {
          .gap-3 {
            gap: 0.5rem !important;
          }

          .modern-primary-btn,
          .modern-success-btn {
            padding: 0.5rem 0.75rem !important;
            font-size: 0.85rem !important;
          }

          .modern-outline-btn {
            min-width: 36px !important;
            height: 36px !important;
          }
        }

        @media (max-width: 575.98px) {
          .d-flex.justify-content-end {
            justify-content: center !important;
          }

          .flex-wrap {
            justify-content: center;
          }

          .modern-primary-btn,
          .modern-success-btn {
            flex: 1;
            min-width: 120px;
          }
        }

        /* Animation for smooth interactions */
        .modern-primary-btn,
        .modern-success-btn,
        .modern-outline-btn {
          position: relative;
          overflow: hidden;
        }

        .modern-primary-btn::before,
        .modern-success-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .modern-primary-btn:hover::before,
        .modern-success-btn:hover::before {
          left: 100%;
        }
      `}</style>

      {/* Bill Form Modal */}
      {showBillForm && (
        <BillForm
          show={showBillForm}
          onHide={handleBillFormClose}
          onSave={handleBillFormSave}
          companyId={getCompanyId()}
          currentUser={currentCompany}
          addToast={addToast}
        />
      )}
    </div>
  );
}

export default SalesInvoicesHeader;
