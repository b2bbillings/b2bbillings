import {useState, useEffect, useCallback, useRef} from "react";

/**
 * Custom hook for detecting online/offline status
 */
export const useOnlineStatus = ({
  checkInterval = 30000,
  pingUrl = "/api/health",
  timeout = 5000,
  enablePeriodicCheck = true,
} = {}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastChecked, setLastChecked] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState("unknown");
  const [latency, setLatency] = useState(null);

  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const checkConnectivity = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsChecking(true);
      }

      const startTime = Date.now();

      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        const response = await fetch(pingUrl, {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: abortControllerRef.current.signal,
          ...(AbortSignal.timeout
            ? {signal: AbortSignal.timeout(timeout)}
            : {}),
        });

        const endTime = Date.now();
        const responseLatency = endTime - startTime;
        const isConnected = response.ok;

        setIsOnline(isConnected);
        setLastChecked(new Date());
        setLatency(responseLatency);

        if (isConnected) {
          if (responseLatency < 200) {
            setConnectionQuality("excellent");
          } else if (responseLatency < 500) {
            setConnectionQuality("good");
          } else if (responseLatency < 1000) {
            setConnectionQuality("fair");
          } else {
            setConnectionQuality("poor");
          }
        } else {
          setConnectionQuality("offline");
        }

        return {
          isOnline: isConnected,
          latency: responseLatency,
          quality: isConnected
            ? responseLatency < 500
              ? "good"
              : "poor"
            : "offline",
        };
      } catch (error) {
        if (error.name === "AbortError") {
          return {isOnline, latency, quality: connectionQuality};
        }

        const fallbackOnline = navigator.onLine;
        setIsOnline(fallbackOnline);
        setLastChecked(new Date());
        setConnectionQuality(fallbackOnline ? "unknown" : "offline");
        setLatency(null);

        return {
          isOnline: fallbackOnline,
          latency: null,
          quality: fallbackOnline ? "unknown" : "offline",
        };
      } finally {
        if (!silent) {
          setIsChecking(false);
        }
        abortControllerRef.current = null;
      }
    },
    [pingUrl, timeout]
  );

  const recheckConnectivity = useCallback(() => {
    return checkConnectivity(false);
  }, [checkConnectivity]);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality("unknown");
      checkConnectivity(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality("offline");
      setLatency(null);
      setLastChecked(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      checkConnectivity(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnectivity]);

  // Periodic connectivity check
  useEffect(() => {
    if (!enablePeriodicCheck || !isOnline) {
      return;
    }

    intervalRef.current = setInterval(() => {
      checkConnectivity(true);
    }, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkConnectivity, checkInterval, enablePeriodicCheck, isOnline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Page visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline) {
        checkConnectivity(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkConnectivity, isOnline]);

  return {
    isOnline,
    isOffline: !isOnline,
    lastChecked,
    isChecking,
    latency,
    connectionQuality,
    recheckConnectivity,
    isConnectionGood:
      connectionQuality === "excellent" || connectionQuality === "good",
    isConnectionPoor:
      connectionQuality === "poor" || connectionQuality === "fair",
    statusText: isOnline
      ? `Online${latency ? ` (${latency}ms)` : ""}`
      : "Offline",
    qualityText:
      {
        excellent: "Excellent Connection",
        good: "Good Connection",
        fair: "Fair Connection",
        poor: "Poor Connection",
        offline: "No Connection",
        unknown: "Connection Status Unknown",
      }[connectionQuality] || "Unknown",
    statusColor:
      {
        excellent: "success",
        good: "success",
        fair: "warning",
        poor: "warning",
        offline: "danger",
        unknown: "secondary",
      }[connectionQuality] || "secondary",
  };
};

export default useOnlineStatus;

export const getConnectionIcon = (quality) => {
  const icons = {
    excellent: "wifi",
    good: "wifi",
    fair: "wifi",
    poor: "wifi",
    offline: "wifi-off",
    unknown: "question-circle",
  };
  return icons[quality] || "question-circle";
};

export const getConnectionBars = (quality) => {
  const bars = {
    excellent: 4,
    good: 3,
    fair: 2,
    poor: 1,
    offline: 0,
    unknown: 0,
  };
  return bars[quality] || 0;
};

export const ConnectionIndicator = ({
  hook = useOnlineStatus(),
  showText = true,
  showLatency = false,
  className = "",
}) => {
  const {
    isOnline,
    connectionQuality,
    latency,
    statusText,
    qualityText,
    statusColor,
  } = hook;

  return (
    <div className={`connection-indicator ${className}`}>
      <span className={`badge bg-${statusColor}`}>
        <i
          className={`fas fa-${getConnectionIcon(connectionQuality)} me-1`}
        ></i>
        {showText && statusText}
        {showLatency && latency && ` (${latency}ms)`}
      </span>
      {connectionQuality !== "unknown" && (
        <small className="text-muted d-block">{qualityText}</small>
      )}
    </div>
  );
};
