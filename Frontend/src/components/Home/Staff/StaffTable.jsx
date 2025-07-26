import React, {useState} from "react";
import {
  Table,
  Button,
  Badge,
  Pagination,
  Row,
  Col,
  Modal,
  Alert,
  Form,
  Spinner,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faUserTie,
  faEdit,
  faTrash,
  faEye,
  faSort,
  faUsers,
  faPlus,
  faExclamationTriangle,
  faTrashRestore,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Import the new StaffView component
import StaffView from "./StaffView";

function StaffTable({
  staff = [],
  loading = false,
  totalStaff = 0,
  currentPage = 1,
  totalPages = 1,
  sortField = "name",
  sortDirection = "asc",
  effectiveCompanyId,
  onSort,
  onPageChange,
  onShowDetails,
  onEditStaff,
  onDeleteStaff,
  onRestoreStaff,
  onShowAddModal,
  isDeletedView = false,
  addToast, // ✅ NEW: Pass addToast for StaffView
}) {
  // ✅ Enhanced Delete Modal State (Only for Active View)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStaffForDelete, setSelectedStaffForDelete] = useState(null);
  const [deleteType, setDeleteType] = useState("soft");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ NEW: StaffView Modal State
  const [showStaffView, setShowStaffView] = useState(false);
  const [selectedStaffForView, setSelectedStaffForView] = useState(null);

  // ✅ NEW: Handle View Details (replaces onShowDetails)
  const handleViewDetails = (staffMember) => {
    setSelectedStaffForView(staffMember);
    setShowStaffView(true);
  };

  // ✅ Delete Confirmation Handler
  const handleDeleteClick = (staffMember) => {
    setSelectedStaffForDelete(staffMember);
    setShowDeleteModal(true);
    setDeleteType("soft");
    setDeleteReason("");
  };

  // ✅ Enhanced Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!selectedStaffForDelete || !onDeleteStaff) return;

    setIsDeleting(true);
    try {
      // ✅ Call parent's delete handler with proper parameters
      await onDeleteStaff(selectedStaffForDelete, deleteType, deleteReason);

      setShowDeleteModal(false);
      setSelectedStaffForDelete(null);
      setDeleteReason("");
      setDeleteType("soft");
    } catch (error) {
      console.error("Delete error in StaffTable:", error);
      // Error is handled by parent, just reset loading state
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ Restore Handler
  const handleRestoreClick = async (staffMember) => {
    if (!onRestoreStaff) return;

    if (
      !window.confirm(`Are you sure you want to restore ${staffMember.name}?`)
    ) {
      return;
    }

    try {
      await onRestoreStaff(staffMember);
    } catch (error) {
      console.error("Restore error in StaffTable:", error);
    }
  };

  // ✅ NEW: Handle actions from StaffView
  const handleStaffViewEdit = (staffMember) => {
    setShowStaffView(false);
    if (onEditStaff) {
      onEditStaff(staffMember);
    }
  };

  const handleStaffViewDelete = (staffMember) => {
    setShowStaffView(false);
    handleDeleteClick(staffMember);
  };

  const handleStaffViewRestore = (staffMember) => {
    setShowStaffView(false);
    handleRestoreClick(staffMember);
  };

  // ✅ Badge Components
  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case "manager":
        return <Badge bg="primary">Manager</Badge>;
      case "admin":
        return <Badge bg="danger">Admin</Badge>;
      case "cashier":
        return <Badge bg="success">Cashier</Badge>;
      case "salesperson":
      case "sales":
        return <Badge bg="info">Sales</Badge>;
      case "accountant":
        return <Badge bg="warning">Accountant</Badge>;
      case "supervisor":
        return <Badge bg="dark">Supervisor</Badge>;
      case "inventory":
        return <Badge bg="secondary">Inventory</Badge>;
      default:
        return <Badge bg="secondary">{role || "Staff"}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    if (isDeletedView) {
      return <Badge bg="danger">Deleted</Badge>;
    }

    switch (status?.toLowerCase()) {
      case "active":
        return <Badge bg="success">Active</Badge>;
      case "inactive":
        return <Badge bg="warning">Inactive</Badge>;
      case "terminated":
        return <Badge bg="danger">Terminated</Badge>;
      case "on-leave":
        return <Badge bg="info">On Leave</Badge>;
      case "suspended":
        return <Badge bg="secondary">Suspended</Badge>;
      default:
        return <Badge bg="secondary">{status || "Unknown"}</Badge>;
    }
  };

  // ✅ Enhanced Pagination Component
  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    items.push(
      <Pagination.Prev
        key="prev"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      />
    );

    // First page if not in range
    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => onPageChange(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="start-ellipsis" />);
      }
    }

    // Page numbers
    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => onPageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    // Last page if not in range
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="end-ellipsis" />);
      }
      items.push(
        <Pagination.Item
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    // Next button
    items.push(
      <Pagination.Next
        key="next"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      />
    );

    return items;
  };

  // ✅ Enhanced Empty State Component
  const renderEmptyState = () => (
    <tr>
      <td colSpan="6" className="text-center py-5" style={{borderRadius: "0"}}>
        <div className="text-center">
          <FontAwesomeIcon
            icon={isDeletedView ? faTrash : faUsers}
            size="3x"
            className="text-muted mb-3"
          />
          <h6 className="text-muted mb-2">
            {isDeletedView
              ? "No deleted staff found"
              : "No staff members found"}
          </h6>
          <p className="text-muted small mb-3">
            {isDeletedView
              ? "No staff members have been deleted yet"
              : "Start by adding your first staff member"}
          </p>
          {!isDeletedView && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={onShowAddModal}
              disabled={!effectiveCompanyId}
              style={{borderRadius: "0"}}
            >
              <FontAwesomeIcon icon={faPlus} className="me-1" />
              Add Staff Member
            </Button>
          )}
        </div>
      </td>
    </tr>
  );

  // ✅ Enhanced Staff Row Component
  const renderStaffRow = (staffMember) => (
    <tr key={staffMember.id || staffMember._id}>
      <td style={{borderRadius: "0"}}>
        <div className="d-flex align-items-center">
          <div className="staff-avatar me-2">
            {staffMember.avatar || staffMember.profilePicture ? (
              <img
                src={staffMember.avatar || staffMember.profilePicture}
                alt={staffMember.name}
                width="36"
                height="36"
                className="rounded-circle"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextElementSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="avatar-placeholder bg-light text-primary d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: "36px",
                height: "36px",
                display:
                  staffMember.avatar || staffMember.profilePicture
                    ? "none"
                    : "flex",
              }}
            >
              <FontAwesomeIcon icon={faUserTie} />
            </div>
          </div>
          <div>
            <div className="fw-medium">{staffMember.name}</div>
            {staffMember.employeeId && (
              <small className="text-muted">ID: {staffMember.employeeId}</small>
            )}
          </div>
        </div>
      </td>
      <td style={{borderRadius: "0"}}>{getRoleBadge(staffMember.role)}</td>
      <td style={{borderRadius: "0"}}>
        <div>
          {staffMember.phone ||
            staffMember.phoneNumber ||
            staffMember.mobileNumbers?.[0] ||
            "Not provided"}
        </div>
        <div className="text-muted small">
          {staffMember.email || "Not provided"}
        </div>
      </td>
      <td style={{borderRadius: "0"}}>
        {isDeletedView
          ? // Show deletion date for deleted staff
            staffMember.deletedAt
            ? new Date(staffMember.deletedAt).toLocaleDateString()
            : "N/A"
          : // Show join date for active staff
          staffMember.joinDate ||
            staffMember.dateJoined ||
            staffMember.employment?.joinDate
          ? new Date(
              staffMember.joinDate ||
                staffMember.dateJoined ||
                staffMember.employment?.joinDate
            ).toLocaleDateString()
          : "N/A"}
      </td>
      <td style={{borderRadius: "0"}}>{getStatusBadge(staffMember.status)}</td>
      <td style={{borderRadius: "0"}}>
        <div className="d-flex justify-content-end gap-2">
          {/* ✅ Updated View Details Button */}
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleViewDetails(staffMember)}
            title="View Details"
            style={{borderRadius: "0"}}
          >
            <FontAwesomeIcon icon={faEye} />
          </Button>

          {/* ✅ Conditional Action Buttons based on view type */}
          {isDeletedView ? (
            // ✅ DELETED VIEW: Show Restore Button
            <Button
              variant="success"
              size="sm"
              onClick={() => handleRestoreClick(staffMember)}
              title="Restore Staff"
              style={{borderRadius: "0"}}
            >
              <FontAwesomeIcon icon={faUndo} />
            </Button>
          ) : (
            // ✅ ACTIVE VIEW: Show Edit and Delete Buttons
            <>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => onEditStaff(staffMember)}
                title="Edit Staff"
                style={{borderRadius: "0"}}
              >
                <FontAwesomeIcon icon={faEdit} />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDeleteClick(staffMember)}
                title="Delete Staff"
                style={{borderRadius: "0"}}
              >
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <>
      {/* ✅ Staff Count Info */}
      <Row className="mb-3">
        <Col className="text-end">
          <small className="text-muted">
            Showing {staff.length} of {totalStaff}{" "}
            {isDeletedView ? "deleted" : ""} staff members
          </small>
        </Col>
      </Row>

      {/* ✅ Main Table */}
      <div className="table-responsive">
        <Table className="align-middle staff-table" style={{borderRadius: "0"}}>
          <thead className="table-light">
            <tr>
              <th
                onClick={() => onSort("name")}
                className="sortable"
                style={{borderRadius: "0", cursor: "pointer"}}
              >
                Name
                {sortField === "name" && (
                  <FontAwesomeIcon
                    icon={faSort}
                    className={`ms-1 ${
                      sortDirection === "asc" ? "text-primary" : "text-danger"
                    }`}
                    size="xs"
                  />
                )}
              </th>
              <th
                onClick={() => onSort("role")}
                className="sortable"
                style={{borderRadius: "0", cursor: "pointer"}}
              >
                Role
                {sortField === "role" && (
                  <FontAwesomeIcon
                    icon={faSort}
                    className={`ms-1 ${
                      sortDirection === "asc" ? "text-primary" : "text-danger"
                    }`}
                    size="xs"
                  />
                )}
              </th>
              <th style={{borderRadius: "0"}}>Contact</th>
              <th
                onClick={() => onSort(isDeletedView ? "deletedAt" : "joinDate")}
                className="sortable"
                style={{borderRadius: "0", cursor: "pointer"}}
              >
                {isDeletedView ? "Deleted Date" : "Join Date"}
                {sortField === (isDeletedView ? "deletedAt" : "joinDate") && (
                  <FontAwesomeIcon
                    icon={faSort}
                    className={`ms-1 ${
                      sortDirection === "asc" ? "text-primary" : "text-danger"
                    }`}
                    size="xs"
                  />
                )}
              </th>
              <th
                onClick={() => onSort("status")}
                className="sortable"
                style={{borderRadius: "0", cursor: "pointer"}}
              >
                Status
                {sortField === "status" && (
                  <FontAwesomeIcon
                    icon={faSort}
                    className={`ms-1 ${
                      sortDirection === "asc" ? "text-primary" : "text-danger"
                    }`}
                    size="xs"
                  />
                )}
              </th>
              <th className="text-end" style={{borderRadius: "0"}}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  <Spinner
                    animation="border"
                    variant="primary"
                    size="sm"
                    className="me-2"
                  />
                  Loading {isDeletedView ? "deleted" : ""} staff...
                </td>
              </tr>
            ) : staff.length > 0 ? (
              staff.map(renderStaffRow)
            ) : (
              renderEmptyState()
            )}
          </tbody>
        </Table>
      </div>

      {/* ✅ Pagination */}
      {totalPages > 1 && (
        <Row className="mt-3">
          <Col className="d-flex justify-content-center">
            <Pagination className="mb-0">{renderPaginationItems()}</Pagination>
          </Col>
        </Row>
      )}

      {/* ✅ NEW: StaffView Modal */}
      <StaffView
        show={showStaffView}
        onHide={() => setShowStaffView(false)}
        staff={selectedStaffForView}
        onEdit={handleStaffViewEdit}
        onDelete={handleStaffViewDelete}
        onRestore={handleStaffViewRestore}
        isDeletedView={isDeletedView}
        addToast={addToast}
      />

      {/* ✅ Enhanced Delete Confirmation Modal (Only for Active View) */}
      {!isDeletedView && (
        <Modal
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          centered
          backdrop="static"
        >
          <Modal.Header closeButton style={{borderRadius: "0"}}>
            <Modal.Title>
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="text-warning me-2"
              />
              Confirm Delete Staff Member
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{borderRadius: "0"}}>
            {selectedStaffForDelete && (
              <>
                <Alert variant="warning" style={{borderRadius: "0"}}>
                  <strong>Warning:</strong> This action will remove the staff
                  member from your system.
                </Alert>

                <div className="mb-3 p-3 bg-light" style={{borderRadius: "0"}}>
                  <Row>
                    <Col>
                      <strong>Staff Member:</strong>{" "}
                      {selectedStaffForDelete.name}
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <strong>Employee ID:</strong>{" "}
                      {selectedStaffForDelete.employeeId || "Not assigned"}
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <strong>Role:</strong> {selectedStaffForDelete.role}
                    </Col>
                  </Row>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Delete Type:</Form.Label>
                  <div className="mt-2">
                    <Form.Check
                      type="radio"
                      id="soft-delete"
                      name="deleteType"
                      label="Soft Delete (Can be restored later)"
                      checked={deleteType === "soft"}
                      onChange={() => setDeleteType("soft")}
                      className="mb-2"
                    />
                    <Form.Check
                      type="radio"
                      id="hard-delete"
                      name="deleteType"
                      label="Permanent Delete (Cannot be undone)"
                      checked={deleteType === "hard"}
                      onChange={() => setDeleteType("hard")}
                      className="text-danger"
                    />
                  </div>
                  <Form.Text className="text-muted">
                    {deleteType === "soft"
                      ? "Staff member will be marked as inactive and can be restored later."
                      : "Staff member will be permanently removed from the database."}
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">
                    Reason for deletion (Optional):
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Enter reason for deletion..."
                    maxLength={500}
                    style={{borderRadius: "0"}}
                  />
                  <Form.Text className="text-muted">
                    {deleteReason.length}/500 characters
                  </Form.Text>
                </Form.Group>

                {deleteType === "hard" && (
                  <Alert variant="danger" style={{borderRadius: "0"}}>
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-2"
                    />
                    <strong>This action cannot be undone!</strong> All staff
                    data, including documents, performance records, and task
                    history will be permanently deleted.
                  </Alert>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer style={{borderRadius: "0"}}>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              style={{borderRadius: "0"}}
            >
              Cancel
            </Button>
            <Button
              variant={deleteType === "hard" ? "danger" : "warning"}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              style={{borderRadius: "0"}}
            >
              {isDeleting ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  Deleting...
                </>
              ) : (
                <>
                  <FontAwesomeIcon
                    icon={deleteType === "hard" ? faTrash : faTrashRestore}
                    className="me-1"
                  />
                  {deleteType === "hard" ? "Permanently Delete" : "Delete"}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}

export default StaffTable;
