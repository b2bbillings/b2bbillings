import React, { useRef } from 'react';
import { Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faFileInvoice, 
    faCalendarAlt, 
    faInfoCircle,
    faCheckCircle,
    faCertificate
} from '@fortawesome/free-solid-svg-icons';

function InvoiceDetails({ 
    invoiceNumber, 
    invoiceDate, 
    invoiceType,
    onInvoiceNumberChange, 
    onInvoiceDateChange
}) {
    const dateInputRef = useRef(null);

    // Enhanced theme colors
    const theme = {
        primary: "#6366f1",
        primaryLight: "#8b5cf6",
        success: "#10b981",
        info: "#06b6d4",
        surface: "#ffffff",
        text: "#1e293b",
        textMuted: "#64748b",
        border: "#e2e8f0",
        borderLight: "#f1f5f9",
        shadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        gstColor: "#059669",
        gstBg: "#ecfdf5",
        gstBorder: "#a7f3d0",
        regularColor: "#0284c7",
        regularBg: "#eff6ff",
        regularBorder: "#93c5fd"
    };

    // Handle clicking on the entire date input group
    const handleDateInputGroupClick = () => {
        if (dateInputRef.current) {
            dateInputRef.current.focus();
            dateInputRef.current.showPicker();
        }
    };

    // Handle keyboard navigation for date input
    const handleDateInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    // Enhanced input styles
    const getInputStyle = (isDate = false) => ({
        borderRadius: "12px",
        border: `2px solid ${theme.border}`,
        fontSize: "14px",
        fontWeight: "600",
        padding: "12px 16px",
        height: "48px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        backgroundColor: theme.surface,
        color: theme.text,
        cursor: isDate ? 'pointer' : 'text'
    });

    const getInputGroupTextStyle = (isDate = false) => ({
        borderRadius: "12px 0 0 12px",
        border: `2px solid ${theme.border}`,
        borderRight: 'none',
        backgroundColor: theme.borderLight,
        color: theme.primary,
        padding: "12px 16px",
        transition: "all 0.3s ease",
        cursor: isDate ? 'pointer' : 'default'
    });

    return (
        <>
            <div className="h-100">
                {/* Enhanced Header */}
                <div 
                    className="d-flex justify-content-between align-items-center mb-4"
                    style={{
                        padding: "16px 20px",
                        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`,
                        borderRadius: "16px",
                        color: "white",
                        boxShadow: theme.shadow
                    }}
                >
                    <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faFileInvoice} className="me-3" size="lg" />
                        <div>
                            <div className="fw-bold" style={{ fontSize: "16px" }}>Invoice Details</div>
                            <small style={{ opacity: 0.9 }}>Configure your invoice information</small>
                        </div>
                    </div>
                    <FontAwesomeIcon 
                        icon={invoiceType === 'gst' ? faCertificate : faCheckCircle} 
                        size="lg" 
                        style={{ opacity: 0.8 }}
                    />
                </div>

                {/* Enhanced Invoice Number Field */}
                <div className="mb-4">
                    <Form.Label 
                        className="fw-bold mb-3"
                        style={{ 
                            color: theme.text, 
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center"
                        }}
                    >
                        <FontAwesomeIcon icon={faFileInvoice} className="me-2" style={{color: theme.primary}} />
                        Invoice Number
                    </Form.Label>
                    <div className="input-group">
                        <span 
                            className="input-group-text"
                            style={getInputGroupTextStyle()}
                        >
                            <FontAwesomeIcon 
                                icon={invoiceType === 'gst' ? faCertificate : faFileInvoice} 
                                style={{ color: invoiceType === 'gst' ? theme.gstColor : theme.regularColor }}
                            />
                        </span>
                        <Form.Control
                            type="text"
                            value={invoiceNumber}
                            onChange={(e) => onInvoiceNumberChange(e.target.value)}
                            style={{
                                ...getInputStyle(),
                                borderRadius: "0 12px 12px 0",
                                borderLeft: 'none',
                                backgroundColor: invoiceType === 'gst' ? theme.gstBg : theme.regularBg,
                                color: invoiceType === 'gst' ? theme.gstColor : theme.regularColor,
                                fontFamily: 'monospace'
                            }}
                            placeholder={invoiceType === 'gst' ? 'GST-YYYYMMDD-XXXX' : 'INV-YYYYMMDD-XXXX'}
                        />
                    </div>
                    <div 
                        className="mt-2 px-3 py-2 rounded-pill d-inline-flex align-items-center"
                        style={{ 
                            backgroundColor: invoiceType === 'gst' ? theme.gstBg : theme.regularBg,
                            color: invoiceType === 'gst' ? theme.gstColor : theme.regularColor,
                            fontSize: "12px",
                            fontWeight: "500"
                        }}
                    >
                        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                        Format: {invoiceType === 'gst' ? 'GST-YYYYMMDD-XXXX' : 'INV-YYYYMMDD-XXXX'}
                    </div>
                </div>

                {/* Enhanced Invoice Date Field */}
                <div className="mb-4">
                    <Form.Label 
                        className="fw-bold mb-3"
                        style={{ 
                            color: theme.text, 
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center"
                        }}
                    >
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-2" style={{color: theme.info}} />
                        Invoice Date
                    </Form.Label>
                    <div 
                        className="input-group"
                        style={{ cursor: 'pointer' }}
                        onClick={handleDateInputGroupClick}
                    >
                        <span 
                            className="input-group-text"
                            style={getInputGroupTextStyle(true)}
                            onClick={handleDateInputGroupClick}
                        >
                            <FontAwesomeIcon 
                                icon={faCalendarAlt}
                                style={{ color: theme.info }}
                            />
                        </span>
                        <Form.Control
                            ref={dateInputRef}
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => onInvoiceDateChange(e.target.value)}
                            onKeyDown={handleDateInputKeyDown}
                            required
                            style={{
                                ...getInputStyle(true),
                                borderRadius: "0 12px 12px 0",
                                borderLeft: 'none'
                            }}
                            className="date-input-clickable"
                        />
                    </div>
                </div>

                {/* Enhanced Invoice Type Info Card */}
                <div 
                    className="mt-4 p-4 rounded-3"
                    style={{ 
                        background: `linear-gradient(135deg, ${invoiceType === 'gst' ? theme.gstBg : theme.regularBg} 0%, ${theme.surface} 100%)`,
                        border: `2px solid ${invoiceType === 'gst' ? theme.gstBorder : theme.regularBorder}`,
                        boxShadow: theme.shadow
                    }}
                >
                    <div className="d-flex align-items-center mb-3">
                        <div 
                            className="rounded-circle d-flex align-items-center justify-content-center me-3"
                            style={{
                                width: "48px",
                                height: "48px",
                                backgroundColor: invoiceType === 'gst' ? theme.gstColor : theme.regularColor,
                                color: "white"
                            }}
                        >
                            <FontAwesomeIcon 
                                icon={invoiceType === 'gst' ? faCertificate : faFileInvoice} 
                                size="lg"
                            />
                        </div>
                        <div>
                            <div 
                                className="fw-bold mb-1"
                                style={{ 
                                    fontSize: "16px",
                                    color: invoiceType === 'gst' ? theme.gstColor : theme.regularColor
                                }}
                            >
                                {invoiceType === 'gst' ? 'GST Invoice' : 'Regular Invoice'}
                            </div>
                            <div style={{ color: theme.textMuted, fontSize: "13px" }}>
                                {invoiceType === 'gst' 
                                    ? 'Tax calculations include GST rates and compliance'
                                    : 'Simple invoice without GST tax calculations'
                                }
                            </div>
                        </div>
                    </div>
                    
                    {/* Feature List */}
                    <div className="small">
                        <div className="d-flex align-items-center mb-2">
                            <FontAwesomeIcon 
                                icon={faCheckCircle} 
                                className="me-2"
                                style={{ color: invoiceType === 'gst' ? theme.gstColor : theme.regularColor }}
                            />
                            <span style={{ color: theme.textMuted }}>
                                {invoiceType === 'gst' 
                                    ? 'CGST & SGST calculations included'
                                    : 'Simplified tax-free invoicing'
                                }
                            </span>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                            <FontAwesomeIcon 
                                icon={faCheckCircle} 
                                className="me-2"
                                style={{ color: invoiceType === 'gst' ? theme.gstColor : theme.regularColor }}
                            />
                            <span style={{ color: theme.textMuted }}>
                                {invoiceType === 'gst' 
                                    ? 'HSN code validation'
                                    : 'Quick invoice generation'
                                }
                            </span>
                        </div>
                        <div className="d-flex align-items-center">
                            <FontAwesomeIcon 
                                icon={faCheckCircle} 
                                className="me-2"
                                style={{ color: invoiceType === 'gst' ? theme.gstColor : theme.regularColor }}
                            />
                            <span style={{ color: theme.textMuted }}>
                                {invoiceType === 'gst' 
                                    ? 'Government compliance ready'
                                    : 'Perfect for small transactions'
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Styles */}
            <style jsx>{`
                .date-input-clickable::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    opacity: 0.8;
                }

                .input-group:focus-within .input-group-text {
                    border-color: ${theme.primary} !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
                }

                .form-control:focus {
                    border-color: ${theme.primary} !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
                    outline: none !important;
                }

                .input-group:hover .input-group-text {
                    background-color: ${theme.border} !important;
                    transform: translateY(-1px);
                }

                .input-group:hover .form-control {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
                }
            `}</style>
        </>
    );
}

export default InvoiceDetails;