import React from 'react';
import { ProgressBar, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import './StepNavigation.css'; // We'll create this CSS file next

function StepNavigation({ currentStep, totalSteps, steps, stepValidation, goToStep }) {
    return (
        <div className="steps-header-modern">
            <div className="container-fluid px-4 py-3">
                <div className="progress-wrapper-modern mb-3">
                    <ProgressBar
                        now={(currentStep / totalSteps) * 100}
                        className="custom-progress-modern"
                        variant="primary"
                    />
                </div>

                <Nav className="step-nav-modern justify-content-between">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`step-item-modern ${currentStep === step.id ? 'active' : ''} ${stepValidation[step.id] ? 'completed' : ''}`}
                            onClick={() => stepValidation[step.id] || currentStep > step.id ? goToStep(step.id) : null} // Allow navigation to completed or previous steps
                        >
                            <div className="step-circle-modern">
                                {stepValidation[step.id] && currentStep > step.id ? ( // Show check only if step is validated and we've moved past it or it's completed
                                    <FontAwesomeIcon icon={faCheck} />
                                ) : (
                                    <FontAwesomeIcon icon={step.icon} />
                                )}
                            </div>
                            <div className="step-info-modern">
                                <div className="step-title-modern">{step.title}</div>
                                <div className="step-description-modern">{step.description}</div>
                            </div>
                        </div>
                    ))}
                </Nav>
            </div>
        </div>
    );
}

export default StepNavigation;