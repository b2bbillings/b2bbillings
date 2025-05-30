import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Layout from './Layout/Layout';
import HomePage from './Pages/HomePage';
import AuthPage from './Pages/AuthPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    console.log("Login successful in App component");
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <div className="App">
        {isLoggedIn ? (
          <Layout onLogout={handleLogout}>
            <HomePage />
          </Layout>
        ) : (
          <AuthPage onLogin={handleLogin} />
        )}
      </div>
    </Router>
  );
}

export default App;