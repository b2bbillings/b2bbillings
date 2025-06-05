// Frontend/src/utils/networkUtils.js
export const checkNetworkStatus = async () => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        return response.ok;
    } catch (error) {
        return false;
    }
};

export const handleNetworkError = (error) => {
    if (!navigator.onLine) {
        return 'No internet connection. Please check your network and try again.';
    }

    if (error.message.includes('fetch')) {
        return 'Unable to connect to server. Please try again later.';
    }

    return error.message || 'An unexpected error occurred.';
};