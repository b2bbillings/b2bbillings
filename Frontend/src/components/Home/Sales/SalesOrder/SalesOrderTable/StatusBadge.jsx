import React from "react";
import {Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faTruck,
  faBoxes,
  faCheck,
  faExchangeAlt,
  faClipboardList,
  faSpinner,
  faExclamationTriangle,
  faInfoCircle,
  faBan,
  faFileInvoice,
  faUserClock,
  faShippingFast,
  faWarehouse,
  faHandshake,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Enhanced status configuration with more comprehensive mapping
const STATUS_CONFIG = {
  // ✅ Draft and initial states
  draft: {
    variant: "secondary",
    text: "Draft",
    icon: faEdit,
    color: "#6c757d",
    bgColor: "#f8f9fa",
    description: "Order is in draft state",
    priority: 1,
  },

  // ✅ Pending states
  pending: {
    variant: "warning",
    text: "Pending",
    icon: faClock,
    color: "#856404",
    bgColor: "#fff3cd",
    description: "Order is pending approval",
    priority: 2,
  },

  pending_approval: {
    variant: "warning",
    text: "Pending Approval",
    icon: faUserClock,
    color: "#856404",
    bgColor: "#fff3cd",
    description: "Waiting for approval",
    priority: 2,
  },

  pending_confirmation: {
    variant: "warning",
    text: "Pending Confirmation",
    icon: faExclamationTriangle,
    color: "#856404",
    bgColor: "#fff3cd",
    description: "Waiting for confirmation",
    priority: 2,
  },

  // ✅ Sent state (for auto-generated orders)
  sent: {
    variant: "info",
    text: "Sent",
    icon: faInfoCircle,
    color: "#0c5460",
    bgColor: "#d1ecf1",
    description: "Order has been sent",
    priority: 3,
  },

  // ✅ Confirmed states
  confirmed: {
    variant: "primary",
    text: "Confirmed",
    icon: faCheckCircle,
    color: "#084298",
    bgColor: "#cfe2ff",
    description: "Order has been confirmed",
    priority: 4,
  },

  // ✅ Approved states
  approved: {
    variant: "success",
    text: "Approved",
    icon: faCheckCircle,
    color: "#0f5132",
    bgColor: "#d1e7dd",
    description: "Order has been approved",
    priority: 5,
  },

  // ✅ Processing states
  processing: {
    variant: "info",
    text: "Processing",
    icon: faSpinner,
    color: "#0c5460",
    bgColor: "#d1ecf1",
    description: "Order is being processed",
    priority: 6,
    animated: true,
  },

  in_progress: {
    variant: "info",
    text: "In Progress",
    icon: faSpinner,
    color: "#0c5460",
    bgColor: "#d1ecf1",
    description: "Order is in progress",
    priority: 6,
    animated: true,
  },

  // ✅ Shipping states
  ready_to_ship: {
    variant: "info",
    text: "Ready to Ship",
    icon: faWarehouse,
    color: "#0c5460",
    bgColor: "#d1ecf1",
    description: "Order is ready for shipping",
    priority: 7,
  },

  shipped: {
    variant: "info",
    text: "Shipped",
    icon: faTruck,
    color: "#0c5460",
    bgColor: "#d1ecf1",
    description: "Order has been shipped",
    priority: 8,
  },

  in_transit: {
    variant: "info",
    text: "In Transit",
    icon: faShippingFast,
    color: "#0c5460",
    bgColor: "#d1ecf1",
    description: "Order is in transit",
    priority: 8,
  },

  out_for_delivery: {
    variant: "info",
    text: "Out for Delivery",
    icon: faTruck,
    color: "#0c5460",
    bgColor: "#d1ecf1",
    description: "Order is out for delivery",
    priority: 9,
  },

  // ✅ Delivery states
  delivered: {
    variant: "success",
    text: "Delivered",
    icon: faBoxes,
    color: "#0f5132",
    bgColor: "#d1e7dd",
    description: "Order has been delivered",
    priority: 10,
  },

  partially_delivered: {
    variant: "warning",
    text: "Partially Delivered",
    icon: faBoxes,
    color: "#856404",
    bgColor: "#fff3cd",
    description: "Order has been partially delivered",
    priority: 9,
  },

  // ✅ Completion states
  completed: {
    variant: "success",
    text: "Completed",
    icon: faCheck,
    color: "#0f5132",
    bgColor: "#d1e7dd",
    description: "Order has been completed",
    priority: 11,
  },

  fulfilled: {
    variant: "success",
    text: "Fulfilled",
    icon: faHandshake,
    color: "#0f5132",
    bgColor: "#d1e7dd",
    description: "Order has been fulfilled",
    priority: 11,
  },

  // ✅ Conversion states
  converted: {
    variant: "info",
    text: "Converted",
    icon: faExchangeAlt,
    color: "#0c5460",
    bgColor: "#d1ecf1",
    description: "Order has been converted",
    priority: 10,
  },

  invoiced: {
    variant: "success",
    text: "Invoiced",
    icon: faFileInvoice,
    color: "#0f5132",
    bgColor: "#d1e7dd",
    description: "Order has been invoiced",
    priority: 10,
  },

  // ✅ Cancellation states
  cancelled: {
    variant: "dark",
    text: "Cancelled",
    icon: faTimesCircle,
    color: "#495057",
    bgColor: "#e2e3e5",
    description: "Order has been cancelled",
    priority: 0,
  },

  canceled: {
    // Alternative spelling
    variant: "dark",
    text: "Cancelled",
    icon: faTimesCircle,
    color: "#495057",
    bgColor: "#e2e3e5",
    description: "Order has been cancelled",
    priority: 0,
  },

  deleted: {
    variant: "dark",
    text: "Deleted",
    icon: faBan,
    color: "#495057",
    bgColor: "#e2e3e5",
    description: "Order has been deleted",
    priority: 0,
  },

  rejected: {
    variant: "danger",
    text: "Rejected",
    icon: faTimesCircle,
    color: "#721c24",
    bgColor: "#f8d7da",
    description: "Order has been rejected",
    priority: 0,
  },

  // ✅ Special states
  on_hold: {
    variant: "warning",
    text: "On Hold",
    icon: faClock,
    color: "#856404",
    bgColor: "#fff3cd",
    description: "Order is on hold",
    priority: 3,
  },

  backordered: {
    variant: "warning",
    text: "Backordered",
    icon: faExclamationTriangle,
    color: "#856404",
    bgColor: "#fff3cd",
    description: "Order is backordered",
    priority: 4,
  },

  // ✅ Default fallback
  default: {
    variant: "secondary",
    text: "Unknown",
    icon: faClipboardList,
    color: "#6c757d",
    bgColor: "#f8f9fa",
    description: "Unknown status",
    priority: 0,
  },
};

const StatusBadge = ({
  status,
  priority = "normal",
  showIcon = true,
  showTooltip = true,
  size = "normal", // "sm", "normal", "lg"
  variant = null, // Override default variant
  className = "",
  style = {},
  animated = false,
  clickable = false,
  onClick,
  showDescription = false,
  customText = null,
  customIcon = null,
  // ✅ Enhanced props for better control
  compact = false,
  uppercase = false,
  outline = false,
  pill = false,
  glow = false,
  pulsing = false,
}) => {
  // ✅ Normalize status string
  const normalizedStatus = status
    ? status.toString().toLowerCase().trim()
    : "default";

  // ✅ Get status configuration
  const statusConfig = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.default;

  // ✅ Determine final variant
  const finalVariant = variant || statusConfig.variant;

  // ✅ Determine size class
  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "status-badge-sm";
      case "lg":
        return "status-badge-lg";
      default:
        return "status-badge-normal";
    }
  };

  // ✅ Determine priority styling
  const getPriorityClass = () => {
    if (priority === "high" || priority === "urgent") {
      return "status-badge-priority-high";
    } else if (priority === "low") {
      return "status-badge-priority-low";
    }
    return "";
  };

  // ✅ Build CSS classes
  const badgeClasses = [
    "status-badge-enhanced",
    getSizeClass(),
    getPriorityClass(),
    compact ? "status-badge-compact" : "",
    outline ? "status-badge-outline" : "",
    pill ? "status-badge-pill" : "",
    glow ? "status-badge-glow" : "",
    pulsing ? "status-badge-pulsing" : "",
    clickable ? "status-badge-clickable" : "",
    animated || statusConfig.animated ? "status-badge-animated" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // ✅ Determine display text
  const displayText = customText || statusConfig.text;
  const finalText = uppercase ? displayText.toUpperCase() : displayText;

  // ✅ Determine icon
  const displayIcon = customIcon || statusConfig.icon;

  // ✅ Handle click
  const handleClick = (e) => {
    if (clickable && onClick) {
      e.stopPropagation();
      onClick(status, statusConfig);
    }
  };

  // ✅ Build badge element
  const badgeElement = (
    <Badge
      bg={finalVariant}
      className={badgeClasses}
      style={{
        ...style,
        ...(outline && {
          backgroundColor: "transparent",
          border: `1px solid ${statusConfig.color}`,
          color: statusConfig.color,
        }),
        ...(glow && {
          boxShadow: `0 0 10px ${statusConfig.color}40`,
        }),
      }}
      onClick={handleClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleClick(e);
              }
            }
          : undefined
      }
    >
      {/* ✅ Icon */}
      {showIcon && displayIcon && (
        <FontAwesomeIcon
          icon={displayIcon}
          className={`me-1 status-icon ${
            animated || statusConfig.animated ? "fa-spin" : ""
          }`}
        />
      )}

      {/* ✅ Status Text */}
      <span className="status-text">{finalText}</span>

      {/* ✅ Priority Indicator */}
      {(priority === "high" || priority === "urgent") && (
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          className="ms-1 priority-indicator"
          style={{fontSize: "0.7em"}}
        />
      )}
    </Badge>
  );

  // ✅ Wrap with tooltip if enabled
  if (showTooltip && !showDescription) {
    return (
      <span title={statusConfig.description} className="status-badge-wrapper">
        {badgeElement}
      </span>
    );
  }

  // ✅ Show with description if enabled
  if (showDescription) {
    return (
      <div className="status-badge-with-description">
        {badgeElement}
        <small className="status-description text-muted d-block mt-1">
          {statusConfig.description}
        </small>
      </div>
    );
  }

  return badgeElement;
};

// ✅ Enhanced Status Badge with Confirmation Logic
export const ConfirmationStatusBadge = ({order, ...props}) => {
  // ✅ Enhanced confirmation detection logic
  const needsConfirmation = Boolean(
    order.isAutoGenerated &&
      order.generatedFrom === "purchase_order" &&
      (order.status === "sent" || order.status === "draft") &&
      !order.confirmedAt &&
      !order.isConfirmed &&
      order.status !== "confirmed"
  );

  const isConfirmed = Boolean(
    order.isAutoGenerated &&
      order.generatedFrom === "purchase_order" &&
      (order.status === "confirmed" || order.confirmedAt || order.isConfirmed)
  );

  // ✅ Return appropriate badge based on confirmation status
  if (needsConfirmation) {
    return (
      <StatusBadge
        status="pending_confirmation"
        priority="high"
        pulsing={true}
        glow={true}
        showDescription={true}
        customText="Needs Confirmation"
        customIcon={faExclamationTriangle}
        {...props}
      />
    );
  }

  if (isConfirmed) {
    return (
      <div className="d-flex flex-column gap-1">
        <StatusBadge
          status="confirmed"
          showIcon={true}
          customText="Confirmed"
          customIcon={faCheckCircle}
          {...props}
        />
        {order.confirmedAt && (
          <small className="text-muted confirmation-date">
            {new Date(order.confirmedAt).toLocaleDateString("en-GB")}
          </small>
        )}
        {order.confirmedBy && (
          <small className="text-muted confirmation-by">
            By: {order.confirmedBy}
          </small>
        )}
      </div>
    );
  }

  // ✅ Return regular status badge
  return <StatusBadge status={order.status} {...props} />;
};

// ✅ Source Badge Component
export const SourceBadge = ({order, showDetails = true, ...props}) => {
  // ✅ Determine order source
  const isFromPurchaseOrder = Boolean(
    order.isAutoGenerated === true &&
      order.sourceOrderId &&
      order.sourceOrderType === "purchase_order"
  );

  if (isFromPurchaseOrder) {
    return (
      <div className="d-flex flex-column align-items-start gap-1">
        <StatusBadge
          status="from_po"
          variant="info"
          customText="From Purchase Order"
          customIcon={faExchangeAlt}
          size="sm"
          {...props}
        />
        {showDetails && order.sourceOrderNumber && (
          <small className="text-muted source-details">
            Source: {order.sourceOrderNumber}
          </small>
        )}
        {showDetails && order.sourceCompanyId && (
          <small className="text-muted source-company">
            Company: {order.sourceCompanyId}
          </small>
        )}
      </div>
    );
  }

  return (
    <StatusBadge
      status="manual"
      variant="success"
      customText="Self Created"
      customIcon={faEdit}
      size="sm"
      {...props}
    />
  );
};

// ✅ Priority Badge Component
export const PriorityBadge = ({priority = "normal", ...props}) => {
  const priorityConfig = {
    low: {
      variant: "secondary",
      text: "Low",
      icon: faInfoCircle,
      color: "#6c757d",
    },
    normal: {
      variant: "primary",
      text: "Normal",
      icon: faInfoCircle,
      color: "#0d6efd",
    },
    high: {
      variant: "warning",
      text: "High",
      icon: faExclamationTriangle,
      color: "#ffc107",
    },
    urgent: {
      variant: "danger",
      text: "Urgent",
      icon: faExclamationTriangle,
      color: "#dc3545",
    },
  };

  const config = priorityConfig[priority] || priorityConfig.normal;

  return (
    <StatusBadge
      status={priority}
      variant={config.variant}
      customText={config.text}
      customIcon={config.icon}
      size="sm"
      {...props}
    />
  );
};

// ✅ Export individual components and default
export default StatusBadge;

// ✅ Component styles (inject into parent component or separate CSS file)
export const StatusBadgeStyles = `
  /* ✅ Base Status Badge Styles */
  .status-badge-enhanced {
    font-weight: 600 !important;
    letter-spacing: 0.025em;
    transition: all 0.2s ease !important;
    border: none !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    white-space: nowrap !important;
    user-select: none !important;
  }

  /* ✅ Size Variants */
  .status-badge-sm {
    font-size: 0.7rem !important;
    padding: 0.2em 0.4em !important;
    line-height: 1.2 !important;
  }

  .status-badge-normal {
    font-size: 0.75rem !important;
    padding: 0.3em 0.6em !important;
    line-height: 1.2 !important;
  }

  .status-badge-lg {
    font-size: 0.85rem !important;
    padding: 0.4em 0.8em !important;
    line-height: 1.3 !important;
  }

  /* ✅ Compact Mode */
  .status-badge-compact {
    padding: 0.15em 0.3em !important;
    font-size: 0.65rem !important;
  }

  /* ✅ Outline Style */
  .status-badge-outline {
    background-color: transparent !important;
    border-width: 1px !important;
    border-style: solid !important;
  }

  /* ✅ Pill Style */
  .status-badge-pill {
    border-radius: 50rem !important;
  }

  /* ✅ Glow Effect */
  .status-badge-glow {
    animation: statusGlow 2s ease-in-out infinite alternate;
  }

  @keyframes statusGlow {
    from {
      box-shadow: 0 0 5px currentColor;
    }
    to {
      box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
    }
  }

  /* ✅ Pulsing Animation */
  .status-badge-pulsing {
    animation: statusPulse 1.5s ease-in-out infinite;
  }

  @keyframes statusPulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* ✅ Clickable State */
  .status-badge-clickable {
    cursor: pointer !important;
    transition: transform 0.1s ease !important;
  }

  .status-badge-clickable:hover {
    transform: translateY(-1px) scale(1.02) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  }

  .status-badge-clickable:active {
    transform: translateY(0) scale(0.98) !important;
  }

  /* ✅ Priority Indicators */
  .status-badge-priority-high {
    border-left: 3px solid #dc3545 !important;
    position: relative;
  }

  .status-badge-priority-high::before {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 6px;
    height: 6px;
    background: #dc3545;
    border-radius: 50%;
    animation: priorityBlink 1s ease-in-out infinite;
  }

  @keyframes priorityBlink {
    0%, 100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }

  .status-badge-priority-low {
    opacity: 0.8;
  }

  /* ✅ Animated Icon */
  .status-badge-animated .status-icon {
    animation: iconSpin 2s linear infinite;
  }

  @keyframes iconSpin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* ✅ Status Text */
  .status-text {
    font-weight: inherit !important;
  }

  /* ✅ Priority Indicator */
  .priority-indicator {
    animation: priorityAlert 0.8s ease-in-out infinite;
  }

  @keyframes priorityAlert {
    0%, 100% {
      opacity: 0.7;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  /* ✅ Status Badge Wrapper */
  .status-badge-wrapper {
    display: inline-block;
    position: relative;
  }

  /* ✅ Status Badge with Description */
  .status-badge-with-description {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .status-description {
    font-size: 0.7rem !important;
    font-style: italic;
    max-width: 150px;
    line-height: 1.2;
  }

  /* ✅ Confirmation-specific Styles */
  .confirmation-date,
  .confirmation-by {
    font-size: 0.65rem !important;
    line-height: 1.1;
  }

  /* ✅ Source Details */
  .source-details,
  .source-company {
    font-size: 0.65rem !important;
    line-height: 1.1;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ✅ Responsive Design */
  @media (max-width: 768px) {
    .status-badge-enhanced {
      font-size: 0.65rem !important;
      padding: 0.2em 0.4em !important;
    }

    .status-badge-lg {
      font-size: 0.75rem !important;
      padding: 0.3em 0.6em !important;
    }

    .status-description,
    .source-details,
    .source-company,
    .confirmation-date,
    .confirmation-by {
      font-size: 0.6rem !important;
    }
  }

  /* ✅ Print Styles */
  @media print {
    .status-badge-enhanced {
      background: transparent !important;
      border: 1px solid #000 !important;
      color: #000 !important;
      box-shadow: none !important;
      animation: none !important;
    }

    .status-badge-glow,
    .status-badge-pulsing,
    .status-badge-animated {
      animation: none !important;
    }
  }

  /* ✅ Dark Mode Support */
  @media (prefers-color-scheme: dark) {
    .status-badge-enhanced {
      filter: brightness(1.1);
    }

    .status-description,
    .source-details,
    .source-company,
    .confirmation-date,
    .confirmation-by {
      color: #adb5bd !important;
    }
  }

  /* ✅ High Contrast Mode */
  @media (prefers-contrast: high) {
    .status-badge-enhanced {
      border: 2px solid currentColor !important;
      font-weight: 700 !important;
    }
  }

  /* ✅ Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .status-badge-enhanced,
    .status-badge-glow,
    .status-badge-pulsing,
    .status-badge-animated,
    .status-icon,
    .priority-indicator {
      animation: none !important;
      transition: none !important;
    }
  }
`;
