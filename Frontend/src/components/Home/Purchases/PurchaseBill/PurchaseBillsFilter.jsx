import React from "react";
import {Row, Col, Form, InputGroup, Card} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCalendarAlt, faFilter} from "@fortawesome/free-solid-svg-icons";

function PurchaseBillsFilter({
  dateRange,
  startDate,
  endDate,
  dateRangeOptions,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange,
  mode = "bills",
  documentType = "bill",
}) {
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  };

  const isPurchaseBills = mode === "bills" || documentType === "bill";
  const theme = isPurchaseBills ? "purple" : "orange";

  return (
    <Card
      className={`border-0 shadow-sm mb-3 ${theme}-theme`}
      style={{borderRadius: 0}}
    >
      <Card.Header className="bg-light border-0 py-2" style={{borderRadius: 0}}>
        <FontAwesomeIcon icon={faFilter} className={`me-2 text-${theme}`} />
        <span className="fw-semibold">
          {isPurchaseBills ? "Purchase Bills" : "Purchase Orders"} Filters
        </span>
      </Card.Header>

      <Card.Body className="py-3" style={{borderRadius: 0}}>
        <Row className="g-3">
          <Col md={4}>
            <Form.Label className="small text-muted mb-1">
              Date Range
            </Form.Label>
            <Form.Select
              size="sm"
              value={dateRange || "This Month"}
              onChange={(e) => onDateRangeChange(e.target.value)}
              style={{borderRadius: 0}}
            >
              {dateRangeOptions?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={4}>
            <Form.Label className="small text-muted mb-1">From Date</Form.Label>
            <InputGroup size="sm">
              <InputGroup.Text style={{borderRadius: 0}}>
                <FontAwesomeIcon icon={faCalendarAlt} />
              </InputGroup.Text>
              <Form.Control
                type="date"
                value={formatDate(startDate)}
                onChange={onStartDateChange}
                style={{borderRadius: 0}}
              />
            </InputGroup>
          </Col>

          <Col md={4}>
            <Form.Label className="small text-muted mb-1">To Date</Form.Label>
            <InputGroup size="sm">
              <InputGroup.Text style={{borderRadius: 0}}>
                <FontAwesomeIcon icon={faCalendarAlt} />
              </InputGroup.Text>
              <Form.Control
                type="date"
                value={formatDate(endDate)}
                onChange={onEndDateChange}
                style={{borderRadius: 0}}
              />
            </InputGroup>
          </Col>
        </Row>
      </Card.Body>

      <style jsx>{`
        .purple-theme {
          border-left: 3px solid #6366f1;
          background: rgba(99, 102, 241, 0.02);
        }
        .orange-theme {
          border-left: 3px solid #f59e0b;
          background: rgba(245, 158, 11, 0.02);
        }
        .text-purple {
          color: #6366f1;
        }
        .text-orange {
          color: #f59e0b;
        }
      `}</style>
    </Card>
  );
}

export default PurchaseBillsFilter;
