import React from "react";
import {Container, Row, Col} from "react-bootstrap";

// ✅ Import all the necessary components
import PurchaseOrderTable from "./PurchaseOrderForm/PurchaseOrderTable";
import PurchaseOrderFilter from "./PurchaseOrderForm/PurchaseOrderFilter";
import PurchaseOrderSummary from "./PurchaseOrderForm/PurchaseOrderSummary";
import PurchaseOrderHeader from "./PurchaseOrderForm/PurchaseOrderHeader";

function PurchaseOrder({
  currentCompany,
  currentUser,
  onNavigate,
  onCompanyChange,
  isOnline,
  lastChecked,
  addToast,
  companyId: propCompanyId,
}) {
  // ✅ Get effective company ID
  const companyId = propCompanyId || currentCompany?.id || currentCompany?._id;

  return (
    <Container fluid>
      <Row>
        <Col>
          {/* ✅ Header Component */}
          <PurchaseOrderHeader
            currentCompany={currentCompany}
            currentUser={currentUser}
            isOnline={isOnline}
            lastChecked={lastChecked}
            addToast={addToast}
            companyId={companyId}
          />

          {/* ✅ Summary Component */}
          <Row className="mb-4">
            <Col>
              <PurchaseOrderSummary
                currentCompany={currentCompany}
                companyId={companyId}
                addToast={addToast}
              />
            </Col>
          </Row>

          {/* ✅ Filter Component */}
          <Row className="mb-4">
            <Col>
              <PurchaseOrderFilter companyId={companyId} addToast={addToast} />
            </Col>
          </Row>

          {/* ✅ Main Table Component - handles everything internally */}
          <PurchaseOrderTable
            companyId={companyId}
            addToast={addToast}
            currentUser={currentUser}
            currentCompany={currentCompany}
            onNavigate={onNavigate}
            isOnline={isOnline}
            lastChecked={lastChecked}
            // ✅ All functionality handled internally
            showHeader={true}
            enableActions={true}
            enableBulkActions={true}
            showBidirectionalColumns={true}
          />
        </Col>
      </Row>
    </Container>
  );
}

export default PurchaseOrder;
