import React from 'react';
import { Alert, Container, Button, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faRefresh, faHome, faBug } from '@fortawesome/free-solid-svg-icons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null,
            errorId: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { 
            hasError: true, 
            errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
        };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
        
        this.setState({
            error,
            errorInfo
        });

        // You can also log the error to an error reporting service here
        // Example: errorReportingService.logError(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null,
            errorId: null
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom error UI
            const isDevelopment = process.env.NODE_ENV === 'development';

            return (
                <Container className="mt-5">
                    <Card className="border-danger shadow">
                        <Card.Header className="bg-danger text-white">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                            <strong>Something went wrong!</strong>
                        </Card.Header>
                        <Card.Body className="text-center">
                            <div className="mb-4">
                                <FontAwesomeIcon 
                                    icon={faExclamationTriangle} 
                                    size="3x" 
                                    className="text-danger mb-3" 
                                />
                                <h4 className="text-danger">Oops! An unexpected error occurred</h4>
                                <p className="text-muted">
                                    We're sorry for the inconvenience. Please try one of the options below.
                                </p>
                            </div>

                            {/* Error details in development */}
                            {isDevelopment && this.state.error && (
                                <Alert variant="warning" className="text-start mb-4">
                                    <Alert.Heading>
                                        <FontAwesomeIcon icon={faBug} className="me-2" />
                                        Development Error Details
                                    </Alert.Heading>
                                    <hr />
                                    <div style={{ fontSize: '0.9rem' }}>
                                        <strong>Error:</strong> {this.state.error.toString()}
                                        <br />
                                        <strong>Error ID:</strong> {this.state.errorId}
                                        {this.state.errorInfo && (
                                            <>
                                                <br />
                                                <strong>Component Stack:</strong>
                                                <pre style={{ 
                                                    fontSize: '0.8rem', 
                                                    marginTop: '0.5rem',
                                                    backgroundColor: '#f8f9fa',
                                                    padding: '0.5rem',
                                                    borderRadius: '0.25rem',
                                                    maxHeight: '200px',
                                                    overflow: 'auto'
                                                }}>
                                                    {this.state.errorInfo.componentStack}
                                                </pre>
                                            </>
                                        )}
                                    </div>
                                </Alert>
                            )}

                            <div className="d-flex gap-2 justify-content-center flex-wrap">
                                <Button 
                                    variant="primary" 
                                    onClick={this.handleRetry}
                                    className="px-4"
                                >
                                    <FontAwesomeIcon icon={faRefresh} className="me-2" />
                                    Try Again
                                </Button>
                                
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={this.handleReload}
                                    className="px-4"
                                >
                                    <FontAwesomeIcon icon={faRefresh} className="me-2" />
                                    Reload Page
                                </Button>
                                
                                <Button 
                                    variant="outline-primary" 
                                    onClick={this.handleGoHome}
                                    className="px-4"
                                >
                                    <FontAwesomeIcon icon={faHome} className="me-2" />
                                    Go Home
                                </Button>
                            </div>

                            {!isDevelopment && (
                                <div className="mt-4">
                                    <small className="text-muted">
                                        Error ID: <code>{this.state.errorId}</code>
                                        <br />
                                        Please include this ID when reporting the issue.
                                    </small>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;