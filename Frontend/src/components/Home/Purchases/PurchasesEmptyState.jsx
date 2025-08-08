import React from "react";
import {Button} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus} from "@fortawesome/free-solid-svg-icons";

function PurchasesEmptyState({onCreatePurchase}) {
  return (
    <div className="empty-state-container">
      <div className="empty-state-content text-center">
        <h2 className="mt-4">Start Managing Your Purchases</h2>
        <p className="text-muted mb-4">
          Create your first purchase order and start tracking your inventory
          procurement.
          <br />
          Manage suppliers, track deliveries, and control your spending
          efficiently!
        </p>

        <div className="empty-state-image-container mb-4">
          <div className="text-muted" style={{fontSize: "6rem"}}>
            <FontAwesomeIcon icon={faPlus} className="me-3" />
            📦
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="create-purchase-btn"
          onClick={onCreatePurchase}
        >
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Create Your First Purchase Order
        </Button>
      </div>
    </div>
  );
}

export default PurchasesEmptyState;
