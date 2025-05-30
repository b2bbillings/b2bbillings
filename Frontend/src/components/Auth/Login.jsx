import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faSignInAlt, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

function Login({ onToggleView, bgImage, onLoginSuccess }) {
    const [formData, setFormData] = useState({
        username: '',
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

        if (!formData.username.trim()) {
            newErrors.username = 'Username, email, or phone number is required';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        return newErrors;
    };

    // In Login.jsx, update the handleSubmit function:

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Reset errors
        setErrors({});

        // Validate form
        let hasErrors = false;
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = "Username is required";
            hasErrors = true;
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
            hasErrors = true;
        }

        if (hasErrors) {
            setErrors(newErrors);
            return;
        }

        // Proceed with login
        setIsSubmitting(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // In a real app, you would verify credentials with an API
            // For demo, we'll just consider the login successful
            console.log('Login successful:', formData);

            // Call the onLoginSuccess callback if provided
            if (onLoginSuccess) { // Change from props.onLoginSuccess to onLoginSuccess
                onLoginSuccess();
            }
        } catch (error) {
            console.error('Login failed:', error);
            setErrors({ general: 'Login failed. Please check your credentials.' });
        } finally {
            setIsSubmitting(false);
        }
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

                    <form className="user auth-form" onSubmit={handleSubmit}>
                        <div className="mb-4 input-group">
                            <span className="input-group-text">
                                <FontAwesomeIcon icon={faUser} />
                            </span>
                            <input
                                type="text"
                                className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Username, Email, or Phone Number"
                                autoComplete="username email"
                            />
                            {errors.username && (
                                <div className="invalid-feedback">{errors.username}</div>
                            )}
                        </div>

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
                                placeholder="Password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                            {errors.password && (
                                <div className="invalid-feedback">{errors.password}</div>
                            )}
                        </div>

                        <div className="mb-4 form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="rememberMe"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleChange}
                            />
                            <label className="form-check-label" htmlFor="rememberMe">
                                Remember me
                            </label>
                            <a href="#" className="float-end small text-decoration-none">Forgot Password?</a>
                        </div>

                        <div className="d-grid gap-2">
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
                    </form>
                    <hr className="my-4" />

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

                    {/* <div className="mt-4 text-center">
                        <div className="divider-text">OR</div>
                        <div className="d-grid gap-2 mt-3">
                            <button type="button" className="btn btn-outline-secondary rounded-pill">
                                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg" alt="Google" width="18" height="18" className="me-2" />
                                Continue with Google
                            </button>
                        </div>
                    </div> */}
                </div>
            </div>
        </div>
    );
}


Login.defaultProps = {
    bgImage: "https://images.pexels.com/photos/3987020/pexels-photo-3987020.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
};
export default Login;