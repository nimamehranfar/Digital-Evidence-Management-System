/**
 * Central API configuration.
 *
 * USE_MOCK is a hardcoded constant — it cannot be toggled via URL params,
 * localStorage, or any runtime mechanism. Change the value here and rebuild.
 * Default for production: false (real mode).
 */
export const USE_MOCK = false;

const baseUrl = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");

export const API_CONFIG = {
  BASE_URL: baseUrl,
  TIMEOUT: 30000,
  HEADERS: {
    "Content-Type": "application/json",
  },
};

/**
 * Utility used by all mock API files to simulate network latency.
 * Kept here so every mock file can `import { mockDelay } from "../config"`.
 */
export const mockDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
