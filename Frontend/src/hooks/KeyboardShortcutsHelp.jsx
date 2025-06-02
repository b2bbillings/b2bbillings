import React from 'react';
import { Modal, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKeyboard, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

function KeyboardShortcutsHelp({ show, onHide, shortcuts = {} }) {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faKeyboard} className="me-2" />
          Keyboard Shortcuts
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="alert alert-info">
            <FontAwesomeIcon icon={faQuestionCircle} className="me-2" />
            Use these keyboard shortcuts to speed up your workflow.
          </div>
        </div>
        
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Shortcut</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {/* Navigation shortcuts */}
            <tr>
              <td><KeyCombo combo="Alt + ↓" /></td>
              <td>Navigate to next field</td>
            </tr>
            <tr>
              <td><KeyCombo combo="Alt + ↑" /></td>
              <td>Navigate to previous field</td>
            </tr>
            <tr>
              <td><KeyCombo combo="Ctrl + Home" /></td>
              <td>Navigate to first field</td>
            </tr>
            <tr>
              <td><KeyCombo combo="Ctrl + End" /></td>
              <td>Navigate to last field</td>
            </tr>
            <tr>
              <td><KeyCombo combo="Esc" /></td>
              <td>Close modal / Cancel</td>
            </tr>
            
            {/* Custom shortcuts */}
            {Object.entries(shortcuts).map(([combo, description], index) => (
              <tr key={index}>
                <td><KeyCombo combo={combo} /></td>
                <td>{description}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
    </Modal>
  );
}

// Helper component for keyboard combo display
function KeyCombo({ combo }) {
  const keys = combo.split('+').map(key => key.trim());
  
  return (
    <div className="d-flex align-items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <Badge bg="secondary" className="p-2">{key}</Badge>
          {index < keys.length - 1 && <span>+</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export default KeyboardShortcutsHelp;