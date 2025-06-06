import React from 'react';
import { Spinner } from 'react-bootstrap';

function Loading({ message = 'Loading...', size = 'md' }) {
    return (
        <div className="d-flex flex-column align-items-center justify-content-center p-4">
            <Spinner animation="border" variant="primary" size={size} />
            <div className="mt-2 text-muted">{message}</div>
        </div>
    );
}

export default Loading;