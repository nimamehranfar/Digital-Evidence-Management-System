// Toggle between mock and real API
export const USE_MOCK = true;

// Real API configuration
export const API_CONFIG = {
    BASE_URL: process.env.REACT_APP_API_BASE_URL || "http://localhost:7071",
    TIMEOUT: 30000,
    HEADERS: {
        "Content-Type": "application/json"
    }
};

// Helper function for API delays in mock
export const mockDelay = (ms = 500) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};