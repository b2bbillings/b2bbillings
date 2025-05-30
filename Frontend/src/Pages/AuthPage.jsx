import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightToBracket, faUserPlus } from '@fortawesome/free-solid-svg-icons'
import Login from '../components/Auth/Login'
import SignUp from '../components/Auth/SignUp'

// Image URLs for authentication components - using copyright-free images from Pexels
export const AUTH_IMAGES = {
    // Modern retail shop management with inventory/POS system
    signUp: "https://images.pexels.com/photos/6177607/pexels-photo-6177607.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    // Business professional with laptop working on shop management
    login: "https://images.pexels.com/photos/3987020/pexels-photo-3987020.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
}

// Inline styles object
const styles = {
    authCard: {
        borderRadius: '15px',
        overflow: 'hidden',
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)',
        margin: '2rem auto'
    },
    cardHeader: {
        background: 'transparent',
        borderBottom: 'none',
        padding: '1.5rem 1.5rem 0.5rem'
    },
    authToggle: {
        marginBottom: '1rem',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        borderRadius: '50px',
        overflow: 'hidden',
        display: 'inline-flex'
    },
    toggleBtn: {
        padding: '0.6rem 2.5rem',
        fontWeight: '600',
        border: 'none',
        transition: 'all 0.3s ease'
    },
    lightBtn: {
        backgroundColor: 'white',
        color: '#464646'
    },
    lightBtnHover: {
        backgroundColor: '#f8f9ff',
        color: '#5e60ce'
    },
    primaryBtn: {
        background: 'linear-gradient(135deg, #5e60ce 0%, #7400b8 100%)',
        color: 'white'
    }
};

function AuthPage({ onLogin }) {
    const [currentView, setCurrentView] = useState('login'); // 'login' or 'signup'
    const [hoverLight, setHoverLight] = useState(false); // Track hover state for light button

    const toggleView = () => {
        setCurrentView(currentView === 'login' ? 'signup' : 'login');
    }

    // Handle successful login/signup
    const handleAuthSuccess = () => {
        console.log("Authentication successful in AuthPage, calling onLogin");
        if (onLogin) {
            onLogin(); // This should trigger App.jsx to change routes
        } else {
            console.error("onLogin prop is not defined in AuthPage!");
        }
    };
    return (
        <div className="container">
            <div className="row justify-content-center">
                <div className="col-xxl-9 col-xl-10 col-lg-11 col-md-12">
                    <div className="card shadow-lg o-hidden border-0 my-5" style={styles.authCard}>
                        <div className="card-header bg-white border-0 pt-4 pb-0" style={styles.cardHeader}>
                            <div className="text-center">
                                <div style={styles.authToggle}>
                                    <button
                                        className={`btn ${currentView === 'login' ? 'primary-btn' : 'light-btn'}`}
                                        style={{
                                            ...styles.toggleBtn,
                                            ...(currentView === 'login' ? styles.primaryBtn :
                                                (hoverLight ? styles.lightBtnHover : styles.lightBtn))
                                        }}
                                        onClick={() => setCurrentView('login')}
                                        onMouseEnter={() => currentView !== 'login' && setHoverLight(true)}
                                        onMouseLeave={() => setHoverLight(false)}
                                    >
                                        <FontAwesomeIcon icon={faRightToBracket} className="me-2" /> Login
                                    </button>
                                    <button
                                        className={`btn ${currentView === 'signup' ? 'primary-btn' : 'light-btn'}`}
                                        style={{
                                            ...styles.toggleBtn,
                                            ...(currentView === 'signup' ? styles.primaryBtn :
                                                (hoverLight ? styles.lightBtnHover : styles.lightBtn))
                                        }}
                                        onClick={() => setCurrentView('signup')}
                                        onMouseEnter={() => currentView !== 'signup' && setHoverLight(true)}
                                        onMouseLeave={() => setHoverLight(false)}
                                    >
                                        <FontAwesomeIcon icon={faUserPlus} className="me-2" /> Sign Up
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {currentView === 'login' ? (
                                <Login
                                    onToggleView={toggleView}
                                    bgImage={AUTH_IMAGES.login}
                                    onLoginSuccess={handleAuthSuccess}
                                />
                            ) : (
                                <SignUp
                                    onToggleView={toggleView}
                                    bgImage={AUTH_IMAGES.signUp}
                                    onSignupSuccess={handleAuthSuccess}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthPage;