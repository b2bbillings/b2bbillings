import React from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

function InventoryEmptyState({ onCreateProduct }) {
    return (
        <div className="empty-state-container">
            <div className="empty-state-content text-center">
                <h2 className="mt-4">Start Building Your Inventory</h2>
                <p className="text-muted mb-4">
                    Add your first product to start managing your inventory.
                    <br />
                    Track stock levels, manage categories, and optimize your operations!
                </p>

                <div className="empty-state-image-container mb-4">
                    <div className="text-muted" style={{ fontSize: '6rem' }}>
                        📦
                    </div>
                </div>

                <Button
                    variant="primary"
                    size="lg"
                    className="create-product-btn"
                    onClick={onCreateProduct}
                >
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Add Your First Product
                </Button>
            </div>
        </div>
    );
}

export default InventoryEmptyState;