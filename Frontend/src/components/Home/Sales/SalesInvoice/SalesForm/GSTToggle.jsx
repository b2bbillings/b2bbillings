import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';

function GSTToggle({ gstEnabled, onChange, invoiceType }) {
    const handleToggle = () => {
        onChange(!gstEnabled);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
        }
    };

    return (
        <div className="d-flex align-items-center gap-2 mb-2">
            <FontAwesomeIcon 
                icon={gstEnabled ? faToggleOn : faToggleOff} 
                className={`fs-5 ${gstEnabled ? 'text-success' : 'text-muted'}`}
                style={{ cursor: 'pointer' }}
                onClick={handleToggle}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-label={`${gstEnabled ? 'Disable' : 'Enable'} GST`}
                aria-pressed={gstEnabled}
            />
            <span className="fw-semibold small">
                {gstEnabled ? 'GST' : 'Non-GST'}
            </span>
            <span className={`badge ${invoiceType === 'gst' ? 'bg-success' : 'bg-secondary'} ms-1`}>
                {invoiceType === 'gst' ? 'GST' : 'INV'}
            </span>
        </div>
    );
}

export default GSTToggle;