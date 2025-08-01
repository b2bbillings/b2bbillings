// Frontend/src/components/GlobalLoading.jsx

import React from "react";

function GlobalLoading({message = "Loading Shop Management System..."}) {
  return (
    <div className="global-loading-overlay">
      <div className="global-loading-content">
        <div className="logo-animation mb-4">
          <div className="logo-icon">
            <i className="fas fa-store"></i>
          </div>
          <div className="logo-text">Shop Management</div>
        </div>

        <div className="loading-animation mb-3">
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>

        <div className="loading-message">{message}</div>

        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <style jsx>{`
        .global-loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.5s ease-out;
        }

        .global-loading-content {
          text-align: center;
          color: white;
          animation: slideInUp 0.8s ease-out;
        }

        .logo-animation {
          animation: logoFloat 3s ease-in-out infinite;
        }

        .logo-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          background: rgba(255, 255, 255, 0.2);
          width: 100px;
          height: 100px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
          animation: iconPulse 2s ease-in-out infinite;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .loading-animation {
          width: 300px;
          margin: 0 auto;
        }

        .loading-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .loading-progress {
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 255, 255, 1) 50%,
            rgba(255, 255, 255, 0.8) 100%
          );
          animation: progressSlide 2s ease-in-out infinite;
        }

        .loading-message {
          font-size: 1rem;
          margin-bottom: 1rem;
          opacity: 0.9;
          animation: textGlow 2s ease-in-out infinite;
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.8);
          animation: dotWave 1.4s ease-in-out infinite both;
        }

        .loading-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }
        .loading-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }
        .loading-dots span:nth-child(3) {
          animation-delay: 0s;
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes logoFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes iconPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 20px rgba(255, 255, 255, 0);
          }
        }

        @keyframes progressSlide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes textGlow {
          0%,
          100% {
            opacity: 0.9;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes dotWave {
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

        /* Responsive design */
        @media (max-width: 576px) {
          .logo-icon {
            width: 80px;
            height: 80px;
            font-size: 3rem;
          }

          .logo-text {
            font-size: 1.2rem;
          }

          .loading-animation {
            width: 250px;
          }

          .loading-message {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}

export default GlobalLoading;
