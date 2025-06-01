import React from 'react';
import { Alert, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faTimes, faFileExport } from '@fortawesome/free-solid-svg-icons';

function BulkActionsBar({ selectedCount, onBulkDelete, onClearSelection, onBulkExport }) {
    return (
        <Alert variant="primary" className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center">
                <strong className="me-3">{selectedCount} item(s) selected</strong>
                <div className="d-flex gap-2">
                    <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={onBulkDelete}
                        className="d-flex align-items-center"
                    >
                        <FontAwesomeIcon icon={faTrash} className="me-1" />
                        Delete Selected
                    </Button>
                    {onBulkExport && (
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={onBulkExport}
                            className="d-flex align-items-center"
                        >
                            <FontAwesomeIcon icon={faFileExport} className="me-1" />
                            Export Selected
                        </Button>
                    )}
                </div>
            </div>
            <Button
                variant="outline-secondary"
                size="sm"
                onClick={onClearSelection}
                className="d-flex align-items-center"
            >
                <FontAwesomeIcon icon={faTimes} className="me-1" />
                Clear Selection
            </Button>
        </Alert>
    );
}

export default BulkActionsBar;