import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for detecting online/offline status with enhanced features
 * @param {Object} options - Configuration options
 * @param {number} options.checkInterval - Interval in ms to check connectivity (default: 30000)
 * @param {string} options.pingUrl - URL to ping for connectivity check (default: '/api/health')
 * @param {number} options.timeout - Request timeout in ms (default: 5000)
 * @param {boolean} options.enablePeriodicCheck - Enable periodic connectivity checks (default: true)
 * @returns {Object} Online status information
 */
export const useOnlineStatus = ({
    checkInterval = 30000, // 30 seconds
    pingUrl = '/api/health',
    timeout = 5000, // 5 seconds
    enablePeriodicCheck = true
} = {}) => {
    // ✅ State management
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastChecked, setLastChecked] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState('unknown'); // 'good', 'poor', 'offline', 'unknown'
    const [latency, setLatency] = useState(null);

    // ✅ Refs for cleanup
    const intervalRef = useRef(null);
    const abortControllerRef = useRef(null);

    // ✅ Enhanced connectivity check with latency measurement
    const checkConnectivity = useCallback(async (silent = false) => {
        if (!silent) {
            setIsChecking(true);
        }

        const startTime = Date.now();

        try {
            // Cancel any ongoing request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller
            abortControllerRef.current = new AbortController();

            // Make a lightweight request to check connectivity
            const response = await fetch(pingUrl, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                signal: abortControllerRef.current.signal,
                // Add timeout using AbortSignal.timeout if available, fallback to manual timeout
                ...(AbortSignal.timeout ? { signal: AbortSignal.timeout(timeout) } : {})
            });

            const endTime = Date.now();
            const responseLatency = endTime - startTime;

            const isConnected = response.ok;

            // ✅ Update states
            setIsOnline(isConnected);
            setLastChecked(new Date());
            setLatency(responseLatency);

            // ✅ Determine connection quality based on latency
            if (isConnected) {
                if (responseLatency < 200) {
                    setConnectionQuality('excellent');
                } else if (responseLatency < 500) {
                    setConnectionQuality('good');
                } else if (responseLatency < 1000) {
                    setConnectionQuality('fair');
                } else {
                    setConnectionQuality('poor');
                }
            } else {
                setConnectionQuality('offline');
            }

            console.log(`🌐 Connectivity check: ${isConnected ? 'Online' : 'Offline'} (${responseLatency}ms)`);

            return {
                isOnline: isConnected,
                latency: responseLatency,
                quality: isConnected ? (responseLatency < 500 ? 'good' : 'poor') : 'offline'
            };

        } catch (error) {
            // ✅ Handle different types of errors
            if (error.name === 'AbortError') {
                console.log('🔄 Connectivity check aborted');
                return { isOnline, latency, quality: connectionQuality };
            }

            console.warn('❌ Connectivity check failed:', error.message);

            // ✅ Fallback to navigator.onLine
            const fallbackOnline = navigator.onLine;
            setIsOnline(fallbackOnline);
            setLastChecked(new Date());
            setConnectionQuality(fallbackOnline ? 'unknown' : 'offline');
            setLatency(null);

            return {
                isOnline: fallbackOnline,
                latency: null,
                quality: fallbackOnline ? 'unknown' : 'offline'
            };

        } finally {
            if (!silent) {
                setIsChecking(false);
            }
            abortControllerRef.current = null;
        }
    }, [pingUrl, timeout]);

    // ✅ Manual connectivity check function
    const recheckConnectivity = useCallback(() => {
        return checkConnectivity(false);
    }, [checkConnectivity]);

    // ✅ Handle browser online/offline events
    useEffect(() => {
        const handleOnline = () => {
            console.log('🌐 Browser detected online');
            setIsOnline(true);
            setConnectionQuality('unknown');
            // Verify with actual connectivity check
            checkConnectivity(true);
        };

        const handleOffline = () => {
            console.log('📵 Browser detected offline');
            setIsOnline(false);
            setConnectionQuality('offline');
            setLatency(null);
            setLastChecked(new Date());
        };

        // ✅ Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // ✅ Initial check
        if (navigator.onLine) {
            checkConnectivity(true);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkConnectivity]);

    // ✅ Periodic connectivity check
    useEffect(() => {
        if (!enablePeriodicCheck || !isOnline) {
            return;
        }

        console.log(`🔄 Starting periodic connectivity check every ${checkInterval}ms`);

        intervalRef.current = setInterval(() => {
            checkConnectivity(true); // Silent check
        }, checkInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [checkConnectivity, checkInterval, enablePeriodicCheck, isOnline]);

    // ✅ Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cancel any ongoing request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Clear interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // ✅ Page visibility change handler (check when page becomes visible)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && isOnline) {
                console.log('👁️ Page became visible, checking connectivity');
                checkConnectivity(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkConnectivity, isOnline]);

    // ✅ Return hook data
    return {
        // ✅ Basic status
        isOnline,
        isOffline: !isOnline,

        // ✅ Enhanced information
        lastChecked,
        isChecking,
        latency,
        connectionQuality,

        // ✅ Helper functions
        recheckConnectivity,

        // ✅ Status helpers
        isConnectionGood: connectionQuality === 'excellent' || connectionQuality === 'good',
        isConnectionPoor: connectionQuality === 'poor' || connectionQuality === 'fair',

        // ✅ Human readable status
        statusText: isOnline
            ? `Online${latency ? ` (${latency}ms)` : ''}`
            : 'Offline',

        qualityText: {
            'excellent': 'Excellent Connection',
            'good': 'Good Connection',
            'fair': 'Fair Connection',
            'poor': 'Poor Connection',
            'offline': 'No Connection',
            'unknown': 'Connection Status Unknown'
        }[connectionQuality] || 'Unknown',

        // ✅ Color indicators for UI
        statusColor: {
            'excellent': 'success',
            'good': 'success',
            'fair': 'warning',
            'poor': 'warning',
            'offline': 'danger',
            'unknown': 'secondary'
        }[connectionQuality] || 'secondary'
    };
};

// ✅ Export as default for convenience
export default useOnlineStatus;

// ✅ Additional utility functions
export const getConnectionIcon = (quality) => {
    const icons = {
        'excellent': 'wifi',
        'good': 'wifi',
        'fair': 'wifi',
        'poor': 'wifi',
        'offline': 'wifi-off',
        'unknown': 'question-circle'
    };
    return icons[quality] || 'question-circle';
};

export const getConnectionBars = (quality) => {
    const bars = {
        'excellent': 4,
        'good': 3,
        'fair': 2,
        'poor': 1,
        'offline': 0,
        'unknown': 0
    };
    return bars[quality] || 0;
};

// ✅ React component for displaying connection status
export const ConnectionIndicator = ({
    hook = useOnlineStatus(),
    showText = true,
    showLatency = false,
    className = ''
}) => {
    const {
        isOnline,
        connectionQuality,
        latency,
        statusText,
        qualityText,
        statusColor
    } = hook;

    return (
        <div className={`connection-indicator ${className}`}>
            <span className={`badge bg-${statusColor}`}>
                <i className={`fas fa-${getConnectionIcon(connectionQuality)} me-1`}></i>
                {showText && statusText}
                {showLatency && latency && ` (${latency}ms)`}
            </span>
            {connectionQuality !== 'unknown' && (
                <small className="text-muted d-block">
                    {qualityText}
                </small>
            )}
        </div>
    );
};