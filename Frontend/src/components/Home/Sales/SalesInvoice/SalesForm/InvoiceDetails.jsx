import React, { useRef } from 'react';
import { Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoice, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

function InvoiceDetails({ 
    invoiceNumber, 
    invoiceDate, 
    invoiceType,
    onInvoiceNumberChange, 
    onInvoiceDateChange
}) {
    const dateInputRef = useRef(null);

    // Handle clicking on the entire date input group
    const handleDateInputGroupClick = () => {
        if (dateInputRef.current) {
            dateInputRef.current.focus();
            dateInputRef.current.showPicker(); // Opens date picker on supported browsers
        }
    };

    // Handle keyboard navigation for date input
    const handleDateInputKeyDown = (e) => {
        // Allow normal date input keyboard navigation
        if (e.key === 'Enter') {
            e.target.blur(); // Close date picker if open
        }
        // Arrow keys, Tab, etc. work normally for date input
    };

    return (
        <div className="h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <small className="text-primary fw-semibold">Invoice Details</small>
            </div>

            {/* Invoice Number */}
            <div className="mb-3">
                <Form.Label className="text-muted small mb-1">Invoice Number</Form.Label>
                <div className="input-group input-group-sm">
                    <span className="input-group-text">
                        <FontAwesomeIcon icon={faFileInvoice} size="sm" />
                    </span>
                    <Form.Control
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => onInvoiceNumberChange(e.target.value)}
                        className="fw-semibold"
                        size="sm"
                        style={{ 
                            backgroundColor: invoiceType === 'gst' ? '#e8f5e8' : '#e8f2ff',
                            color: invoiceType === 'gst' ? '#155724' : '#004085'
                        }}
                    />
                </div>
                <small className="text-muted">
                    Format: {invoiceType === 'gst' ? 'GST-YYYYMMDD-XXXX' : 'INV-YYYYMMDD-XXXX'}
                </small>
            </div>

            {/* Invoice Date - Fully Clickable */}
            <div className="mb-3">
                <Form.Label className="text-muted small mb-1">Invoice Date</Form.Label>
                <div 
                    className="input-group input-group-sm"
                    style={{ cursor: 'pointer' }}
                    onClick={handleDateInputGroupClick}
                >
                    <span 
                        className="input-group-text"
                        style={{ cursor: 'pointer' }}
                        onClick={handleDateInputGroupClick}
                    >
                        <FontAwesomeIcon icon={faCalendarAlt} size="sm" />
                    </span>
                    <Form.Control
                        ref={dateInputRef}
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => onInvoiceDateChange(e.target.value)}
                        onKeyDown={handleDateInputKeyDown}
                        size="sm"
                        required
                        style={{ cursor: 'pointer' }}
                        className="date-input-clickable"
                    />
                </div>
            </div>

            {/* Invoice Info - Simplified */}
            <div className="mt-3 p-2 rounded" style={{ 
                backgroundColor: invoiceType === 'gst' ? '#d4edda' : '#d1ecf1',
                fontSize: '11px'
            }}>
                <div className="fw-semibold mb-1">
                    {invoiceType === 'gst' ? '🏢 GST Invoice' : '📄 Regular Invoice'}
                </div>
                <div className="text-muted">
                    {invoiceType === 'gst' 
                        ? 'Tax calculations will include GST rates'
                        : 'Simple invoice without GST calculations'
                    }
                </div>
            </div>
        </div>
    );
}

export default InvoiceDetails;