import React from "react";
import {Row, Col, Form, InputGroup, Card} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCalendarAlt, faFilter} from "@fortawesome/free-solid-svg-icons";

function SalesInvoicesFilter({
  dateRange,
  startDate,
  endDate,
  dateRangeOptions,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange,
  mode = "invoices",
  documentType = "invoice",
}) {
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  };

  const isQuotations = mode === "quotations" || documentType === "quotation";
  
  // Enhanced styling theme object
  const modernTheme = {
    colors: {
      primary: '#6366f1',
      primaryLight: '#8b5cf6',
      primaryDark: '#4f46e5',
      background: '#ffffff',
      backgroundLight: '#f8fafc',
      border: '#e2e8f0',
      text: '#1e293b',
      textLight: '#64748b',
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
    <div 
      style={{
        background: modernTheme.colors.background,
        borderRadius: modernTheme.borderRadius.xl,
        boxShadow: modernTheme.colors.shadow,
        border: `1px solid ${modernTheme.colors.border}`,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Modern header with gradient */}
      <div 
        style={{
          background: `linear-gradient(135deg, ${modernTheme.colors.primary} 0%, ${modernTheme.colors.primaryLight} 100%)`,
          color: 'white',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: `${modernTheme.borderRadius.xl} ${modernTheme.borderRadius.xl} 0 0`
          }}
        />
        <FontAwesomeIcon icon={faFilter} className="me-3" style={{ fontSize: '1.1rem', position: 'relative', zIndex: 1 }} />
        <span style={{ fontWeight: '600', fontSize: '1rem', position: 'relative', zIndex: 1 }}>
          {isQuotations ? "Quotation" : "Invoice"} Filters
        </span>
      </div>

      {/* Modern body */}
      <div 
        style={{
          padding: '1.5rem',
          background: `linear-gradient(135deg, ${modernTheme.colors.background} 0%, ${modernTheme.colors.backgroundLight} 100%)`
        }}
      >
        <Row className="g-4">
          {/* Date Range Select */}
          <Col md={4}>
            <div style={{ marginBottom: '0.75rem' }}>
              <Form.Label 
                style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: modernTheme.colors.text, 
                  marginBottom: '0.5rem',
                  display: 'block'
                }}
              >
                Date Range
              </Form.Label>
              <div 
                style={{
                  position: 'relative',
                  background: modernTheme.colors.background,
                  borderRadius: modernTheme.borderRadius.lg,
                  border: `2px solid ${modernTheme.colors.border}`,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
                className="modern-select-wrapper"
              >
                <Form.Select
                  value={dateRange || "This Month"}
                  onChange={(e) => onDateRangeChange(e.target.value)}
                  style={{
                    border: 'none',
                    borderRadius: modernTheme.borderRadius.lg,
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: modernTheme.colors.text,
                    background: 'transparent'
                  }}
                  className="modern-select"
                >
                  {dateRangeOptions?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>
          </Col>

          {/* From Date */}
          <Col md={4}>
            <div style={{ marginBottom: '0.75rem' }}>
              <Form.Label 
                style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: modernTheme.colors.text, 
                  marginBottom: '0.5rem',
                  display: 'block'
                }}
              >
                From Date
              </Form.Label>
              <div 
                style={{
                  display: 'flex',
                  background: modernTheme.colors.background,
                  borderRadius: modernTheme.borderRadius.lg,
                  border: `2px solid ${modernTheme.colors.border}`,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
                className="modern-input-group"
              >
                <div 
                  style={{
                    background: `linear-gradient(135deg, ${modernTheme.colors.primary}15, ${modernTheme.colors.primaryLight}10)`,
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: modernTheme.colors.primary
                  }}
                >
                  <FontAwesomeIcon icon={faCalendarAlt} />
                </div>
                <Form.Control
                  type="date"
                  value={formatDate(startDate)}
                  onChange={onStartDateChange}
                  style={{
                    border: 'none',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    background: 'transparent'
                  }}
                  className="modern-date-input"
                />
              </div>
            </div>
          </Col>

          {/* To Date */}
          <Col md={4}>
            <div style={{ marginBottom: '0.75rem' }}>
              <Form.Label 
                style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: modernTheme.colors.text, 
                  marginBottom: '0.5rem',
                  display: 'block'
                }}
              >
                To Date
              </Form.Label>
              <div 
                style={{
                  display: 'flex',
                  background: modernTheme.colors.background,
                  borderRadius: modernTheme.borderRadius.lg,
                  border: `2px solid ${modernTheme.colors.border}`,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
                className="modern-input-group"
              >
                <div 
                  style={{
                    background: `linear-gradient(135deg, ${modernTheme.colors.primary}15, ${modernTheme.colors.primaryLight}10)`,
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: modernTheme.colors.primary
                  }}
                >
                  <FontAwesomeIcon icon={faCalendarAlt} />
                </div>
                <Form.Control
                  type="date"
                  value={formatDate(endDate)}
                  onChange={onEndDateChange}
                  style={{
                    border: 'none',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    background: 'transparent'
                  }}
                  className="modern-date-input"
                />
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <style>{`
        /* Modern form controls styling */
        .modern-select:focus,
        .modern-date-input:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .modern-select-wrapper:focus-within,
        .modern-input-group:focus-within {
          border-color: ${modernTheme.colors.primary};
          box-shadow: ${modernTheme.colors.shadow};
          transform: translateY(-1px);
        }

        .modern-select-wrapper:hover,
        .modern-input-group:hover {
          border-color: ${modernTheme.colors.primary};
          box-shadow: ${modernTheme.colors.shadow};
        }

        /* Custom select arrow styling */
        .modern-select {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236366f1' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.75rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 3rem !important;
        }

        /* Date input styling */
        .modern-date-input::-webkit-calendar-picker-indicator {
          filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(223deg) brightness(99%) contrast(96%);
          cursor: pointer;
        }

        /* Enhanced responsiveness */
        @media (max-width: 767.98px) {
          .g-4 > * {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }

          .modern-select,
          .modern-date-input {
            padding: 0.625rem 0.75rem !important;
            font-size: 0.85rem !important;
          }

          .modern-select {
            padding-right: 2.5rem !important;
          }
        }

        /* Smooth animations */
        .modern-select-wrapper,
        .modern-input-group {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modern-select,
        .modern-date-input {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}

export default SalesInvoicesFilter;
