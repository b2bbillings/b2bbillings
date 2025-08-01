// Frontend/src/components/Loading.jsx

import React from "react";
import {Spinner} from "react-bootstrap";

function Loading({
  message = "Loading...",
  size = "md",
  variant = "primary",
  showPulse = false,
  customAnimation = false,
}) {
  return (
    <div className="loading-container d-flex flex-column align-items-center justify-content-center p-4">
      {customAnimation ? (
        // ✅ Custom animated loading dots
        <div className="custom-loading-animation mb-3">
          <div className="loading-dots">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
        </div>
      ) : (
        // ✅ Bootstrap spinner with pulse effect
        <div
          className={`spinner-container ${showPulse ? "pulse-animation" : ""}`}
        >
          <Spinner
            animation="border"
            variant={variant}
            size={size}
            className="loading-spinner"
          />
        </div>
      )}

      <div className="loading-message mt-2 text-muted text-center">
        {message}
      </div>

      {/* ✅ Enhanced CSS animations */}
      <style jsx>{`
        .loading-container {
          min-height: 200px;
          animation: fadeInUp 0.6s ease-out;
        }

        .spinner-container {
          position: relative;
        }

        .loading-spinner {
          animation: spinnerPulse 2s ease-in-out infinite;
        }

        .pulse-animation {
          animation: pulseGlow 2s ease-in-out infinite;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spinnerPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(13, 110, 253, 0);
          }
        }

        /* Custom loading dots animation */
        .custom-loading-animation {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .loading-dots {
          display: flex;
          gap: 8px;
        }

        .loading-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007bff, #0056b3);
          animation: dotBounce 1.4s ease-in-out infinite both;
        }

        .loading-dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        .loading-dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        .loading-dot:nth-child(3) {
          animation-delay: 0s;
        }

        @keyframes dotBounce {
          0%,
          80%,
          100% {
            transform: scale(0.8) translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2) translateY(-10px);
            opacity: 1;
          }
        }

        .loading-message {
          font-size: 0.9rem;
          font-weight: 500;
          animation: textFade 2s ease-in-out infinite;
        }

        @keyframes textFade {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 576px) {
          .loading-container {
            min-height: 150px;
            padding: 2rem;
          }

          .loading-dot {
            width: 10px;
            height: 10px;
          }

          .loading-message {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Loading;
