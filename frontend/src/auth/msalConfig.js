// MSAL configuration for Workforce Entra ID (redirect flow).
//
// This project uses CRA (Create React App): REACT_APP_* values are baked into the
// build output at compile-time. In Azure Static Web Apps, these values must be
// supplied during the GitHub Actions build (via secrets -> env).
//
// We do NOT invent new env var names. If env vars are missing at runtime,
// login must fail gracefully (no crash).

function readRuntimeConfig() {
  // Optional runtime override (mainly for debugging). If not present, env vars are used.
  // Do NOT rely on this for production; SWA should inject REACT_APP_* at build time.
  try {
    return window.__DEMS_CONFIG__ || {};
  } catch (_) {
    return {};
  }
}

const runtime = readRuntimeConfig();

export const DEMS_AUTH_CONFIG = {
  clientId: process.env.REACT_APP_ENTRA_CLIENT_ID || runtime.REACT_APP_ENTRA_CLIENT_ID,
  authority: process.env.REACT_APP_ENTRA_AUTHORITY || runtime.REACT_APP_ENTRA_AUTHORITY,
  apiScope: process.env.REACT_APP_ENTRA_API_SCOPE || runtime.REACT_APP_ENTRA_API_SCOPE,
};

export const msalConfig = {
  auth: {
    clientId: DEMS_AUTH_CONFIG.clientId,
    authority: DEMS_AUTH_CONFIG.authority,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: [DEMS_AUTH_CONFIG.apiScope].filter(Boolean),
};
