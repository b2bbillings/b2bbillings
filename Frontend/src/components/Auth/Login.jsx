import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faSignInAlt, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import authService from '../../services/authService';

function Login({ onToggleView, bgImage, onLoginSuccess }) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        return newErrors;
    };

const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setErrors({});

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
    }

    // Proceed with login
    setIsSubmitting(true);

    try {
        console.log('🔐 Attempting login for:', formData.email);

        const response = await authService.login({
            email: formData.email,
            password: formData.password
        });

        if (response.success && response.data) {
            console.log('✅ Login successful:', response.data.user);

            // Store token and user data
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Small delay to ensure localStorage is written
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify the data was stored
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            
            if (!storedToken || !storedUser) {
                throw new Error('Failed to store authentication data');
            }

            console.log('✅ Authentication data stored successfully');

            // Call the onLoginSuccess callback with user data
            if (onLoginSuccess) {
                onLoginSuccess(response.data.user);
            }
        } else {
            setErrors({ general: response.message || 'Login failed. Please try again.' });
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        setErrors({ general: error.message || 'Login failed. Please check your credentials and try again.' });
    } finally {
        setIsSubmitting(false);
    }
};

    // Demo credentials function
    const fillDemoCredentials = () => {
        setFormData({
            ...formData,
            email: 'demo@shopmanager.com',
            password: 'demo123'
        });
    };

    return (
        <div className="row">
            <div
                className="col-lg-5 d-none d-lg-block bg-login-image"
                style={{ background: `url("${bgImage}")` }}
            />
            <div className="col-lg-7">
                <div className="p-lg-5 p-4">
                    <div className="text-center">
                        <h1 className="h3 text-gray-900 mb-4 fw-bold">Welcome Back!</h1>
                        <p className="text-muted mb-4">Enter your credentials to access your account</p>
                    </div>

                    {/* General error message */}
                    {errors.general && (
                        <div className="alert alert-danger" role="alert">
                            {errors.general}
                        </div>
                    )}

                    <form className="user auth-form" onSubmit={handleSubmit}>
                        {/* Email Input */}
                        <div className="mb-4 input-group">
                            <span className="input-group-text">
                                <FontAwesomeIcon icon={faEnvelope} />
                            </span>
                            <input
                                type="email"
                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email address"
                                autoComplete="email"
                                disabled={isSubmitting}
                            />
                            {errors.email && (
                                <div className="invalid-feedback">{errors.email}</div>
                            )}
                        </div>

                        {/* Password Input */}
                        <div className="mb-4 input-group">
                            <span className="input-group-text">
                                <FontAwesomeIcon icon={faLock} />
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                                disabled={isSubmitting}
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                            {errors.password && (
                                <div className="invalid-feedback">{errors.password}</div>
                            )}
                        </div>

                        {/* Remember Me Checkbox */}
                        <div className="mb-4 form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="rememberMe"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleChange}
                                disabled={isSubmitting}
                            />
                            <label className="form-check-label" htmlFor="rememberMe">
                                Remember me
                            </label>
                        </div>

                        {/* Login Button */}
                        <div className="d-grid gap-2 mb-3">
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-block rounded-pill"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Logging in...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faSignInAlt} className="me-2" /> Log In
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Demo Credentials Button */}
                        <div className="d-grid gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm rounded-pill"
                                onClick={fillDemoCredentials}
                                disabled={isSubmitting}
                            >
                                Use Demo Credentials
                            </button>
                        </div>
                    </form>

                    <hr className="my-4" />

                    {/* Toggle to Sign Up */}
                    <div className="text-center mt-2">
                        <a
                            className="small text-decoration-none"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (onToggleView) onToggleView();
                            }}
                        >
                            Don't have an account? Sign Up!
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

Login.defaultProps = {
    bgImage: "https://images.pexels.com/photos/3987020/pexels-photo-3987020.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
};

export default Login;