import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave,
    faShare,
    faTimes,
    faSignOutAlt,
    faPrint,
    faDownload,
    faSparkles
} from '@fortawesome/free-solid-svg-icons';

function ActionButtons({ onSave, onShare, onCancel, onExit, saving = false, disabled = false }) {
    // Enhanced theme colors
    const theme = {
        primary: "#6366f1",
        primaryLight: "#8b5cf6",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        secondary: "#6b7280",
        surface: "#ffffff",
        text: "#1e293b",
        textMuted: "#64748b",
        border: "#e2e8f0",
        shadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        shadowHover: "0 8px 30px rgba(0, 0, 0, 0.12)"
    };

    // Enhanced button styles
    const getButtonStyle = (variant = 'primary', size = 'normal') => {
        const baseStyle = {
            borderRadius: "12px",
            fontWeight: "600",
            fontSize: size === 'large' ? "16px" : "14px",
            padding: size === 'large' ? "14px 32px" : "10px 20px",
            border: "2px solid transparent",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
            overflow: "hidden",
            boxShadow: theme.shadow,
            textTransform: "none",
            letterSpacing: "0.025em"
        };

        const variants = {
            primary: {
                ...baseStyle,
                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`,
                color: "white",
                borderColor: theme.primary
            },
            success: {
                ...baseStyle,
                background: `linear-gradient(135deg, ${theme.success} 0%, #34d399 100%)`,
                color: "white",
                borderColor: theme.success
            },
            warning: {
                ...baseStyle,
                background: `linear-gradient(135deg, ${theme.warning} 0%, #fbbf24 100%)`,
                color: "white",
                borderColor: theme.warning
            },
            secondary: {
                ...baseStyle,
                background: theme.surface,
                color: theme.secondary,
                borderColor: theme.border
            },
            danger: {
                ...baseStyle,
                background: `linear-gradient(135deg, ${theme.danger} 0%, #f87171 100%)`,
                color: "white",
                borderColor: theme.danger
            }
        };

        return variants[variant] || variants.primary;
    };

    const handleMouseEnter = (e, variant) => {
        e.target.style.transform = "translateY(-2px)";
        e.target.style.boxShadow = theme.shadowHover;
    };

    const handleMouseLeave = (e) => {
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = theme.shadow;
    };

    return (
        <>
            {/* Enhanced Action Buttons Container */}
            <div 
                className="position-sticky bottom-0"
                style={{
                    background: `linear-gradient(to top, ${theme.surface} 0%, ${theme.surface} 70%, transparent 100%)`,
                    padding: "24px 0",
                    marginTop: "32px",
                    borderTop: `1px solid ${theme.border}`,
                    zIndex: 100
                }}
            >
                <div className="d-flex justify-content-between align-items-center">
                    {/* Left side - Exit Button */}
                    <div>
                        {onExit && (
                            <Button
                                onClick={onExit}
                                disabled={disabled}
                                style={getButtonStyle('secondary')}
                                onMouseEnter={(e) => handleMouseEnter(e, 'secondary')}
                                onMouseLeave={handleMouseLeave}
                                className="border-0"
                            >
                                <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                                Exit Form
                            </Button>
                        )}
                    </div>

                    {/* Right side - Action Buttons */}
                    <div className="d-flex align-items-center" style={{ gap: "16px" }}>
                        {/* Cancel Button */}
                        {onCancel && (
                            <Button
                                onClick={onCancel}
                                disabled={disabled}
                                style={getButtonStyle('danger')}
                                onMouseEnter={(e) => handleMouseEnter(e, 'danger')}
                                onMouseLeave={handleMouseLeave}
                                className="border-0"
                            >
                                <FontAwesomeIcon icon={faTimes} className="me-2" />
                                Cancel
                            </Button>
                        )}

                        {/* Document Actions Group */}
                        <div className="d-flex" style={{ gap: "8px" }}>
                            <Button
                                disabled={disabled}
                                style={{
                                    ...getButtonStyle('secondary'),
                                    padding: "10px 16px"
                                }}
                                onMouseEnter={(e) => handleMouseEnter(e, 'secondary')}
                                onMouseLeave={handleMouseLeave}
                                className="border-0"
                                title="Print Invoice"
                            >
                                <FontAwesomeIcon icon={faPrint} />
                            </Button>
                            <Button
                                disabled={disabled}
                                style={{
                                    ...getButtonStyle('secondary'),
                                    padding: "10px 16px"
                                }}
                                onMouseEnter={(e) => handleMouseEnter(e, 'secondary')}
                                onMouseLeave={handleMouseLeave}
                                className="border-0"
                                title="Download PDF"
                            >
                                <FontAwesomeIcon icon={faDownload} />
                            </Button>
                        </div>

                        {/* Share Button */}
                        <Button
                            onClick={onShare}
                            disabled={disabled}
                            style={getButtonStyle('warning')}
                            onMouseEnter={(e) => handleMouseEnter(e, 'warning')}
                            onMouseLeave={handleMouseLeave}
                            className="border-0"
                        >
                            <FontAwesomeIcon icon={faShare} className="me-2" />
                            Share Invoice
                        </Button>

                        {/* Primary Save Button */}
                        <Button
                            onClick={onSave}
                            disabled={disabled || saving}
                            style={{
                                ...getButtonStyle('success', 'large'),
                                minWidth: "180px",
                                background: saving 
                                    ? `linear-gradient(135deg, ${theme.secondary} 0%, #9ca3af 100%)`
                                    : `linear-gradient(135deg, ${theme.success} 0%, #34d399 100%)`
                            }}
                            onMouseEnter={saving ? undefined : (e) => handleMouseEnter(e, 'success')}
                            onMouseLeave={saving ? undefined : handleMouseLeave}
                            className="border-0"
                        >
                            <FontAwesomeIcon 
                                icon={saving ? faSparkles : faSave} 
                                className={`me-2 ${saving ? 'fa-spin' : ''}`}
                            />
                            {saving ? 'Saving Invoice...' : 'Save Invoice'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Enhanced Styles */}
            <style jsx>{`
                .btn:focus {
                    outline: none !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
                }

                .btn:disabled {
                    opacity: 0.6 !important;
                    cursor: not-allowed !important;
                    transform: none !important;
                }

                .btn:active {
                    transform: translateY(0) !important;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }

                .fa-spin {
                    animation: pulse 1.5s ease-in-out infinite;
                }
            `}</style>
        </>
    );
}

export default ActionButtons;