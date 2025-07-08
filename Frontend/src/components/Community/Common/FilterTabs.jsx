import React from "react";
import {Nav, Badge} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faComments,
  faTruck,
  faShoppingCart,
  faHeadset,
  faUser,
  faBuilding,
} from "@fortawesome/free-solid-svg-icons";

function FilterTabs({
  activeTab,
  onTabChange,
  tabs = [],
  variant = "pills",
  size = "md",
  showCounts = true,
  className = "",
}) {
  // Get icon for tab type
  const getTabIcon = (iconName) => {
    switch (iconName) {
      case "faComments":
        return faComments;
      case "faTruck":
        return faTruck;
      case "faShoppingCart":
        return faShoppingCart;
      case "faHeadset":
        return faHeadset;
      case "faUser":
        return faUser;
      case "faBuilding":
        return faBuilding;
      default:
        return faComments;
    }
  };

  // Get appropriate variant class for active state
  const getActiveVariant = (tab) => {
    if (tab.color) {
      return `bg-${tab.color} text-white`;
    }
    return variant === "pills"
      ? "bg-primary text-white"
      : "text-primary border-primary";
  };

  // Get inactive variant class
  const getInactiveVariant = (tab) => {
    if (variant === "pills") {
      return "text-muted bg-light";
    }
    return "text-muted";
  };

  // Handle tab click
  const handleTabClick = (tab) => {
    if (onTabChange && !tab.disabled) {
      onTabChange(tab.key || tab.id);
    }
  };

  return (
    <div className={`filter-tabs ${className}`}>
      <Nav
        variant={variant}
        className={`${variant === "pills" ? "nav-pills" : "nav-tabs"} ${
          size === "sm" ? "nav-sm" : size === "lg" ? "nav-lg" : ""
        }`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === (tab.key || tab.id);
          const hasIcon = tab.icon;
          const hasCount =
            showCounts && tab.count !== undefined && tab.count !== null;

          return (
            <Nav.Item key={tab.key || tab.id} className="flex-fill">
              <Nav.Link
                active={isActive}
                onClick={() => handleTabClick(tab)}
                disabled={tab.disabled}
                className={`
                                    text-center position-relative
                                    ${
                                      isActive
                                        ? getActiveVariant(tab)
                                        : getInactiveVariant(tab)
                                    }
                                    ${tab.disabled ? "disabled" : ""}
                                    ${
                                      size === "sm"
                                        ? "py-2 px-3"
                                        : size === "lg"
                                        ? "py-3 px-4"
                                        : "py-2 px-3"
                                    }
                                `}
                style={{
                  cursor: tab.disabled ? "not-allowed" : "pointer",
                  opacity: tab.disabled ? 0.6 : 1,
                  fontSize:
                    size === "sm"
                      ? "0.875rem"
                      : size === "lg"
                      ? "1.1rem"
                      : "1rem",
                }}
                title={tab.tooltip || tab.label}
              >
                <div className="d-flex flex-column align-items-center">
                  {/* Icon */}
                  {hasIcon && (
                    <div className="mb-1">
                      <FontAwesomeIcon
                        icon={getTabIcon(tab.icon)}
                        size={
                          size === "sm"
                            ? "sm"
                            : size === "lg"
                            ? "lg"
                            : undefined
                        }
                      />
                    </div>
                  )}

                  {/* Label */}
                  <div className={`${size === "sm" ? "small" : ""}`}>
                    {tab.label}
                  </div>

                  {/* Count Badge */}
                  {hasCount && tab.count > 0 && (
                    <Badge
                      bg={isActive ? "light" : tab.color || "primary"}
                      text={isActive ? "dark" : "white"}
                      className="mt-1"
                      style={{
                        fontSize: size === "sm" ? "0.7rem" : "0.75rem",
                        minWidth: size === "sm" ? "18px" : "20px",
                      }}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </Badge>
                  )}

                  {/* Notification Dot for unread */}
                  {tab.hasUnread && !hasCount && (
                    <div
                      className="position-absolute bg-danger rounded-circle"
                      style={{
                        width: "8px",
                        height: "8px",
                        top: "5px",
                        right: "10px",
                      }}
                    />
                  )}
                </div>
              </Nav.Link>
            </Nav.Item>
          );
        })}
      </Nav>

      {/* Active tab indicator line (for tabs variant) */}
      {variant === "tabs" && (
        <style>{`
          .nav-tabs .nav-link.active {
            border-bottom: 3px solid var(--bs-primary);
            background-color: transparent;
          }
        `}</style>
      )}
    </div>
  );
}

// Default tabs configuration for common use cases
FilterTabs.defaultProps = {
  tabs: [
    {
      key: "all",
      label: "All Chats",
      icon: "faComments",
      color: "primary",
      count: 0,
    },
    {
      key: "suppliers",
      label: "Suppliers",
      icon: "faTruck",
      color: "success",
      count: 0,
    },
    {
      key: "buyers",
      label: "Buyers",
      icon: "faShoppingCart",
      color: "info",
      count: 0,
    },
    {
      key: "support",
      label: "Support",
      icon: "faHeadset",
      color: "warning",
      count: 0,
    },
  ],
};

export default FilterTabs;
