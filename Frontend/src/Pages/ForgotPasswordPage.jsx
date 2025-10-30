import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ForgotPassword from "../components/Auth/ForgotPassword";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleBackToLogin = () => {
    navigate("/login", { replace: true });
  };

  return (
    <ForgotPassword 
      onBackToLogin={handleBackToLogin}
      bgImage="https://images.pexels.com/photos/3987020/pexels-photo-3987020.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
    />
  );
};

export default ForgotPasswordPage;
