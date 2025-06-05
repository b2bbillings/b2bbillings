import { useState } from 'react';
import './SignUp.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faPhone, faSignInAlt, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import authService from '../../services/authService';

function SignUp({ onToggleView, bgImage, onSignupSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
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

        if (!formData.name.trim()) {
            newErrors.name = 'Full name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
            newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        } else if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one letter and one number';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
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

        // Proceed with signup
        setIsSubmitting(true);

        try {
            console.log('📝 Attempting signup...', formData.email);

            const signupData = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                password: formData.password,
                phone: formData.phone.trim()
            };

            const response = await authService.signup(signupData);

            if (response.success) {
                console.log('✅ Signup successful:', response.data);

                // Store token and user data
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                // Show success message
                alert(`Account created successfully!\nWelcome ${response.data.user.name}!\nYou are now logged in.`);

                // Reset form
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: ''
                });
                setShowPassword(false);
                setShowConfirmPassword(false);

                // Call the onSignupSuccess callback with user data
                if (onSignupSuccess) {
                    onSignupSuccess(response.data.user);
                }
            } else {
                setErrors({ general: response.message || 'Signup failed. Please try again.' });
            }
        } catch (error) {
            console.error('❌ Signup error:', error);
            setErrors({ general: 'Signup failed. Please check your information and try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Demo user data function
    const fillDemoData = () => {
        setFormData({
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '1234567890',
            password: 'demo123',
            confirmPassword: 'demo123'
        });
    };

    return (
        <div className="row">
            <div
                className="col-lg-5 d-none d-lg-block bg-register-image"
                style={{ background: `url("${bgImage}")` }}
            />
            <div className="col-lg-7">
                <div className="p-lg-5 p-4">
                    <div className="text-center">
                        <h1 className="h3 text-gray-900 mb-2 fw-bold">Create Your Account</h1>
                        <p className="text-muted mb-4">Join us to start managing your business</p>
                    </div>

                    {/* General Error Message */}
                    {errors.general && (
                        <div className="alert alert-danger mb-4" role="alert">
                            {errors.general}
                        </div>
                    )}

                    <form className="user auth-form" onSubmit={handleSubmit}>
                        {/* Full Name Input */}
                        <div className="mb-4 input-group">
                            <span className="input-group-text">
                                <FontAwesomeIcon icon={faUser} />
                            </span>
                            <input
                                type="text"
                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Full Name"
                                autoComplete="name"
                                disabled={isSubmitting}
                            />
                            {errors.name && (
                                <div className="invalid-feedback">{errors.name}</div>
                            )}
                        </div>

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
                                placeholder="Email Address"
                                autoComplete="email"
                                disabled={isSubmitting}
                            />
                            {errors.email && (
                                <div className="invalid-feedback">{errors.email}</div>
                            )}
                        </div>

                        {/* Phone Input */}
                        <div className="mb-4 input-group">
                            <span className="input-group-text">
                                <FontAwesomeIcon icon={faPhone} />
                            </span>
                            <input
                                type="tel"
                                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Phone Number"
                                autoComplete="tel"
                                disabled={isSubmitting}
                            />
                            {errors.phone && (
                                <div className="invalid-feedback">{errors.phone}</div>
                            )}
                        </div>

                        {/* Password Input */}
                        <div className="row">
                            <div className="col-sm-6 mb-4">
                                <div className="input-group">
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
                                        autoComplete="new-password"
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
                            </div>

                            <div className="col-sm-6 mb-4">
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <FontAwesomeIcon icon={faLock} />
                                    </span>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm Password"
                                        autoComplete="new-password"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex="-1"
                                        disabled={isSubmitting}
                                    >
                                        <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                                    </button>
                                    {errors.confirmPassword && (
                                        <div className="invalid-feedback">{errors.confirmPassword}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="alert alert-info mb-4">
                            <small>
                                <strong>Password Requirements:</strong><br />
                                • At least 6 characters long<br />
                                • Must contain at least one letter and one number
                            </small>
                        </div>

                        {/* Create Account Button */}
                        <div className="d-grid gap-2 mb-3">
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-block rounded-pill"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faSignInAlt} className="me-2" /> Create Account
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Demo Data Button */}
                        <div className="d-grid gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm rounded-pill"
                                onClick={fillDemoData}
                                disabled={isSubmitting}
                            >
                                Fill Demo Data
                            </button>
                        </div>
                    </form>

                    <hr className="my-4" />

                    {/* Toggle to Login */}
                    <div className="text-center mt-2">
                        <a
                            className="small text-decoration-none"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (onToggleView) onToggleView();
                            }}
                        >
                            Already have an account? Login!
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Set default prop with a better copyright-free image for shop management
SignUp.defaultProps = {
    bgImage: "https://images.pexels.com/photos/6177607/pexels-photo-6177607.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
};

export default SignUp;