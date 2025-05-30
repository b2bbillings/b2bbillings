import { useState } from 'react';
import './SignUp.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faPhone, faSignInAlt, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

function SignUp({ onToggleView, bgImage, onSignupSuccess }) {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
    });

    const [generatedUsername, setGeneratedUsername] = useState('');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1); // Step 1: Personal Info, Step 2: Password
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

    const validateStep1 = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
            newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
        }

        return newErrors;
    };

    const validateStep2 = () => {
        const newErrors = {};

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        return newErrors;
    };

    const handleNext = (e) => {
        e.preventDefault();
        const errors = validateStep1();

        if (Object.keys(errors).length === 0) {
            // Generate username based on email and name
            const emailPrefix = formData.email.split('@')[0];
            const namePart = formData.fullName.toLowerCase().replace(/\s/g, '').substring(0, 3);
            const randomDigits = Math.floor(1000 + Math.random() * 9000);
            const username = `${namePart}${emailPrefix.substring(0, 3)}${randomDigits}`;

            setGeneratedUsername(username);
            setStep(2);
        } else {
            setErrors(errors);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateStep2();

        if (Object.keys(validationErrors).length === 0) {
            setIsSubmitting(true);

            // Create final data object with generated username
            const finalData = {
                ...formData,
                username: generatedUsername
            };

            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));

                // In a real app, you would register the user with an API
                console.log('Registration successful:', finalData);

                // Show success message
                alert(`Account created successfully!\nYour username is: ${generatedUsername}\nYou can log in using your username, email, or phone number.`);

                // Reset form
                setFormData({
                    fullName: '',
                    email: '',
                    phoneNumber: '',
                    password: '',
                    confirmPassword: ''
                });
                setGeneratedUsername('');
                setStep(1);
                setShowPassword(false);
                setShowConfirmPassword(false);

                // Trigger callback for parent component
                if (onSignupSuccess) {
                    onSignupSuccess();
                }
            } catch (error) {
                console.error('Registration failed:', error);
                setErrors({ general: 'Registration failed. Please try again.' });
            } finally {
                setIsSubmitting(false);
            }
        } else {
            setErrors(validationErrors);
        }
    };

    const handleBack = () => {
        setStep(1);
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
                        <h1 className="h3 text-gray-900 mb-4 fw-bold">Create Your Account</h1>
                        <p className="text-muted mb-4">Join our platform to manage your shop efficiently</p>
                    </div>

                    <div className="steps-indicator mb-4">
                        <div className="d-flex justify-content-center">
                            <div className={`step-circle ${step === 1 ? 'active' : 'completed'}`}>1</div>
                            <div className="step-line"></div>
                            <div className={`step-circle ${step === 2 ? 'active' : ''}`}>2</div>
                        </div>
                        <div className="d-flex justify-content-center mt-2">
                            <div className="step-label me-5">Personal Info</div>
                            <div className="step-label">Security</div>
                        </div>
                    </div>

                    {errors.general && (
                        <div className="alert alert-danger mb-4">
                            {errors.general}
                        </div>
                    )}

                    {step === 1 ? (
                        <form className="user auth-form" onSubmit={handleNext}>
                            <div className="mb-4 input-group">
                                <span className="input-group-text">
                                    <FontAwesomeIcon icon={faUser} />
                                </span>
                                <input
                                    type="text"
                                    className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
                                    id="fullName"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Full Name"
                                />
                                {errors.fullName && (
                                    <div className="invalid-feedback">{errors.fullName}</div>
                                )}
                            </div>

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
                                />
                                {errors.email && (
                                    <div className="invalid-feedback">{errors.email}</div>
                                )}
                            </div>

                            <div className="mb-4 input-group">
                                <span className="input-group-text">
                                    <FontAwesomeIcon icon={faPhone} />
                                </span>
                                <input
                                    type="tel"
                                    className={`form-control ${errors.phoneNumber ? 'is-invalid' : ''}`}
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    placeholder="Phone Number"
                                />
                                {errors.phoneNumber && (
                                    <div className="invalid-feedback">{errors.phoneNumber}</div>
                                )}
                            </div>

                            <div className="d-grid gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-lg btn-block rounded-pill"
                                >
                                    Continue to Security
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form className="user auth-form" onSubmit={handleSubmit}>
                            <div className="alert alert-info mb-4">
                                <small>Your username will be: <strong>{generatedUsername}</strong></small>
                                <div className="mt-1"><small>You can log in with your username, email, or phone number.</small></div>
                            </div>

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
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            tabIndex="-1"
                                        >
                                            <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                                        </button>
                                        {errors.confirmPassword && (
                                            <div className="invalid-feedback">{errors.confirmPassword}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex gap-2 mt-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-lg flex-grow-1 rounded-pill"
                                    onClick={handleBack}
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-lg flex-grow-1 rounded-pill"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faSignInAlt} className="me-2" /> Create Account
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

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