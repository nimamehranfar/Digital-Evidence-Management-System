// Toggle between mock and real API.
//
// IMPORTANT (final production requirement):
// Mock mode must NOT be switchable via URL params or browser storage.
// To enable mock mode, change this constant in code and redeploy.
export const USE_MOCK = false;

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || "http://localhost:7071",
  TIMEOUT: 30000,
  HEADERS: {
    "Content-Type": "application/json",
  },
};

export const mockDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));
