import React from "react";
import {Modal, Button, Alert, Spinner, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faPrint,
  faExclamationTriangle,
  faDownload,
  faFileInvoice,
  faClipboardList,
  faBoxes,
  faTruck,
  faUser,
  faList,
} from "@fortawesome/free-solid-svg-icons";
import SalesOrder from "../../../../PrintComponents/SalesOrder";

const PrintModal = ({
  show,
  onHide,
  printData,
  printLoading,
  printError,
  bulkPrintMode,
  selectedOrderForPrint,
  selectedOrdersForBulkPrint = [],
  printTemplate = "standard",
  isInQuotationsMode = false,
  onPrint,
  onErrorDismiss,
  printComponentRef,
}) => {
  if (!show) return null;

  const getTemplateDisplayName = (template) => {
    const templateNames = {
      standard: "Standard",
      customer: "Customer",
      transporter: "Transporter",
      warehouse: "Warehouse",
      accounts: "Accounts",
      minimal: "Minimal",
    };
    return templateNames[template] || "Standard";
  };

  const getTemplateIcon = (template) => {
    const templateIcons = {
      standard: faClipboardList,
      customer: faUser,
      transporter: faTruck,
      warehouse: faBoxes,
      accounts: faFileInvoice,
      minimal: faList,
    };
    return templateIcons[template] || faClipboardList;
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      backdrop="static"
      className="print-modal"
    >
      <Modal.Header
        closeButton
        className="bg-info text-white print-modal-header"
      >
        <Modal.Title className="d-flex align-items-center">
          <FontAwesomeIcon icon={faPrint} className="me-2" />
          {bulkPrintMode
            ? `Print ${selectedOrdersForBulkPrint.length} Orders`
            : `Print ${isInQuotationsMode ? "Quotation" : "Sales Order"}`}

          {/* Order Number Badge */}
          {selectedOrderForPrint && !bulkPrintMode && (
            <Badge bg="light" text="dark" className="ms-2 order-badge">
              {selectedOrderForPrint.orderNumber || "No Order #"}
            </Badge>
          )}

          {/* Template Badge */}
          <Badge bg="secondary" className="ms-2 template-badge">
            <FontAwesomeIcon
              icon={getTemplateIcon(printTemplate)}
              className="me-1"
            />
            {getTemplateDisplayName(printTemplate)}
          </Badge>

          {/* Bulk Count Badge */}
          {bulkPrintMode && selectedOrdersForBulkPrint.length > 0 && (
            <Badge bg="warning" text="dark" className="ms-2 bulk-badge">
              {selectedOrdersForBulkPrint.length} Orders
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0 print-modal-body">
        {/* Error Display */}
        {printError && (
          <Alert variant="danger" className="m-3 print-error-alert">
            <div className="d-flex align-items-start">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="me-2 mt-1 flex-shrink-0"
              />
              <div className="flex-grow-1">
                <strong>Print Error:</strong>
                <div className="mt-1">{printError}</div>

                {/* Error Actions */}
                <div className="mt-3 d-flex gap-2">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={onErrorDismiss}
                  >
                    Dismiss
                  </Button>

                  {/* Retry Button */}
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => {
                      onErrorDismiss();
                      // Trigger retry logic if needed
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          </Alert>
        )}

        {/* Loading State */}
        {printLoading ? (
          <div className="text-center py-5 print-loading-container">
            <Spinner
              animation="border"
              variant="primary"
              size="lg"
              className="mb-3"
            />
            <h5 className="mt-3 text-muted loading-title">
              Preparing print data...
            </h5>
            <p className="text-muted loading-subtitle">
              {bulkPrintMode
                ? `Processing ${
                    selectedOrdersForBulkPrint.length
                  } orders with ${getTemplateDisplayName(
                    printTemplate
                  )} template...`
                : `Loading ${
                    selectedOrderForPrint?.orderNumber || "order"
                  } with ${getTemplateDisplayName(printTemplate)} template...`}
            </p>

            {/* Loading Progress Indicators */}
            <div className="loading-indicators mt-4">
              <div className="d-flex justify-content-center gap-4">
                <div className="loading-step">
                  <div className="step-icon">
                    <FontAwesomeIcon icon={faClipboardList} />
                  </div>
                  <small>Fetching Data</small>
                </div>
                <div className="loading-step">
                  <div className="step-icon">
                    <FontAwesomeIcon icon={faFileInvoice} />
                  </div>
                  <small>Applying Template</small>
                </div>
                <div className="loading-step">
                  <div className="step-icon">
                    <FontAwesomeIcon icon={faPrint} />
                  </div>
                  <small>Preparing Print</small>
                </div>
              </div>
            </div>
          </div>
        ) : printData ? (
          /* Print Preview */
          <div
            className="print-preview-container"
            style={{
              maxHeight: "70vh",
              overflow: "auto",
              backgroundColor: "#f8f9fa",
              padding: "20px",
            }}
          >
            {bulkPrintMode ? (
              /* Bulk Print Preview */
              <div ref={printComponentRef} className="bulk-print-container">
                {printData.orders?.map((orderData, index) => (
                  <div
                    key={`bulk-order-${index}`}
                    className="mb-4 page-break print-page"
                  >
                    {/* Page Header for Bulk Print */}
                    <div className="bulk-page-header d-print-none mb-3">
                      <small className="text-muted">
                        Page {index + 1} of {printData.orders.length} - Order:{" "}
                        {orderData.orderNumber || `Order ${index + 1}`}
                      </small>
                    </div>

                    {/* Print Component */}
                    <SalesOrder
                      orderData={orderData}
                      template={printTemplate}
                      isQuotation={isInQuotationsMode}
                      printMode={true}
                      bulkPrint={true}
                      pageNumber={index + 1}
                      totalPages={printData.orders.length}
                    />

                    {/* Page Break for Print */}
                    {index < printData.orders.length - 1 && (
                      <div
                        style={{pageBreakAfter: "always"}}
                        className="d-none d-print-block"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Single Order Print Preview */
              <div ref={printComponentRef} className="single-print-container">
                <div className="print-page">
                  {/* Preview Header */}
                  <div className="print-preview-header d-print-none mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Print Preview</strong>
                        <small className="text-muted ms-2">
                          {isInQuotationsMode ? "Quotation" : "Sales Order"}:
                          {selectedOrderForPrint?.orderNumber || "N/A"}
                        </small>
                      </div>
                      <Badge bg="info" className="template-preview-badge">
                        <FontAwesomeIcon
                          icon={getTemplateIcon(printTemplate)}
                          className="me-1"
                        />
                        {getTemplateDisplayName(printTemplate)} Template
                      </Badge>
                    </div>
                  </div>

                  {/* Print Component */}
                  <SalesOrder
                    orderData={printData.data || printData}
                    template={printTemplate}
                    isQuotation={isInQuotationsMode}
                    printMode={true}
                    bulkPrint={false}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No Data State */
          <div className="text-center py-5 no-data-container">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              size="3x"
              className="text-warning mb-3"
            />
            <h5 className="no-data-title">No Print Data Available</h5>
            <p className="text-muted no-data-subtitle">
              Unable to load print data for the selected order(s).
            </p>

            {/* Troubleshooting Tips */}
            <div className="troubleshooting-tips mt-4">
              <div className="alert alert-light">
                <strong>Troubleshooting Tips:</strong>
                <ul className="text-start mt-2 mb-0">
                  <li>Check your internet connection</li>
                  <li>Verify the order exists and is accessible</li>
                  <li>Try refreshing the page and attempting again</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
            </div>

            <div className="d-flex gap-2 justify-content-center mt-3">
              <Button variant="outline-primary" onClick={onHide}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onHide();
                  // Could trigger a retry mechanism here
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between print-modal-footer">
        {/* Left Side - Print Actions */}
        <div className="d-flex gap-2 print-actions">
          <Button
            variant="primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPrint();
            }}
            disabled={printLoading || !printData}
            className="print-button"
          >
            <FontAwesomeIcon icon={faPrint} className="me-1" />
            {printLoading ? "Preparing..." : "Print Now"}
          </Button>

          {/* Download PDF Button (if supported) */}
          {printData && !bulkPrintMode && (
            <Button
              variant="outline-success"
              onClick={() => {
                // Could implement PDF download logic here
                console.log("Download PDF functionality");
              }}
              className="download-button"
            >
              <FontAwesomeIcon icon={faDownload} className="me-1" />
              Download PDF
            </Button>
          )}
        </div>

        {/* Right Side - Modal Controls */}
        <div className="d-flex gap-2 modal-controls">
          {/* Print Info */}
          {printData && (
            <div className="print-info d-flex align-items-center me-3">
              <small className="text-muted">
                {bulkPrintMode
                  ? `${selectedOrdersForBulkPrint.length} orders ready`
                  : "Ready to print"}
              </small>
            </div>
          )}

          <Button variant="secondary" onClick={onHide} className="close-button">
            Close
          </Button>
        </div>
      </Modal.Footer>

      {/* Print-specific Styles */}
      <style jsx>{`
        .print-modal .modal-dialog {
          max-width: 95vw !important;
        }

        .print-modal-header {
          border-bottom: 3px solid rgba(255, 255, 255, 0.2);
        }

        .order-badge {
          font-size: 0.8rem !important;
          padding: 0.3em 0.6em !important;
        }

        .template-badge {
          font-size: 0.75rem !important;
          padding: 0.25em 0.5em !important;
        }

        .bulk-badge {
          font-size: 0.75rem !important;
          padding: 0.25em 0.5em !important;
          font-weight: 600 !important;
        }

        .print-error-alert {
          border-left: 4px solid #dc3545 !important;
        }

        .print-loading-container {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .loading-indicators {
          max-width: 400px;
        }

        .loading-step {
          text-align: center;
          opacity: 0.7;
        }

        .step-icon {
          width: 40px;
          height: 40px;
          border: 2px solid #dee2e6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
          color: #6c757d;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.7;
          }
        }

        .print-preview-container {
          background: #f8f9fa !important;
        }

        .print-page {
          background: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin: 0 auto;
          max-width: 210mm; /* A4 width */
          min-height: 297mm; /* A4 height */
        }

        .bulk-print-container .print-page {
          margin-bottom: 20px;
        }

        .bulk-page-header {
          padding: 10px 15px;
          background: #e9ecef;
          border-radius: 4px;
          border-left: 4px solid #007bff;
        }

        .print-preview-header {
          padding: 10px 15px;
          background: #e3f2fd;
          border-radius: 4px;
          border-left: 4px solid #2196f3;
        }

        .template-preview-badge {
          font-size: 0.75rem !important;
        }

        .no-data-container {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .no-data-title {
          color: #6c757d;
          margin-bottom: 15px;
        }

        .no-data-subtitle {
          font-size: 1.1rem;
          margin-bottom: 20px;
        }

        .troubleshooting-tips {
          max-width: 500px;
        }

        .print-modal-footer {
          border-top: 1px solid #dee2e6;
          background: #f8f9fa;
        }

        .print-button {
          min-width: 120px;
        }

        .download-button {
          min-width: 140px;
        }

        .close-button {
          min-width: 80px;
        }

        .print-info {
          font-size: 0.9rem;
        }

        /* Print-specific styles */
        @media print {
          .d-print-none {
            display: none !important;
          }

          .d-print-block {
            display: block !important;
          }

          .print-page {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: none !important;
            min-height: auto !important;
          }

          .bulk-print-container {
            background: white !important;
          }

          .print-preview-container {
            background: white !important;
            padding: 0 !important;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .print-modal .modal-dialog {
            max-width: 98vw !important;
            margin: 10px auto !important;
          }

          .print-modal-footer {
            flex-direction: column;
            gap: 10px;
          }

          .print-actions,
          .modal-controls {
            width: 100%;
            justify-content: center;
          }

          .template-badge,
          .bulk-badge {
            display: none; /* Hide on mobile to save space */
          }

          .print-page {
            max-width: 100% !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </Modal>
  );
};

export default PrintModal;
