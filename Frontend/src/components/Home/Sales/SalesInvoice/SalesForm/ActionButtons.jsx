import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave,
    faShare,
    faTimes,
    faSignOutAlt,
    faPrint,
    faDownload
} from '@fortawesome/free-solid-svg-icons';

function ActionButtons({ onSave, onShare, onCancel, onExit }) {
    return (
        <div className="d-flex justify-content-between align-items-center mt-4">
            {/* Left side - Exit */}
            <div>
                {onExit && (
                    <Button variant="outline-secondary" onClick={onExit}>
                        <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                        Exit
                    </Button>
                )}
            </div>

            {/* Right side - Main actions */}
            <div className="d-flex gap-3">
                {onCancel && (
                    <Button variant="outline-secondary" onClick={onCancel}>
                        <FontAwesomeIcon icon={faTimes} className="me-2" />
                        Cancel
                    </Button>
                )}

                <ButtonGroup>
                    <Button variant="outline-info">
                        <FontAwesomeIcon icon={faPrint} className="me-2" />
                        Print
                    </Button>
                    <Button variant="outline-primary">
                        <FontAwesomeIcon icon={faDownload} className="me-2" />
                        Download
                    </Button>
                </ButtonGroup>

                <Button variant="warning" onClick={onShare}>
                    <FontAwesomeIcon icon={faShare} className="me-2" />
                    Share
                </Button>

                <Button variant="success" onClick={onSave} size="lg">
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                    Save Invoice
                </Button>
            </div>
        </div>
    );
}

export default ActionButtons;