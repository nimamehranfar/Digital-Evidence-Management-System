/**
 * MSAL configuration for Workforce Entra ID (redirect flow).
 *
 * Key behaviour decisions:
 * - navigateToLoginRequestUrl: FALSE
 *   If true, after redirect MSAL tries to re-navigate the browser to the URL that
 *   originally started the login (usually /login). The app then stays on /login and
 *   never reaches the dashboard because the AuthContext redirect-back logic runs first.
 *   With false, after processing handleRedirectPromise() the app simply stays on whatever
 *   URL the SWA redirected to (always /index.html → React Router handles it from there).
 *
 * - storeAuthStateInCookie: true
 *   Safari and some corporate proxies block third-party cookies / localStorage writes during
 *   cross-origin redirects. Enabling the cookie fallback prevents the auth state from being
 *   lost mid-redirect on those browsers.
 *
 * - cacheLocation: "localStorage"
 *   Tokens survive tab closure / refresh. SessionStorage is safer but breaks refresh flows.
 *
 * CRA: REACT_APP_* values are baked into the bundle at build time. For Azure Static Web Apps,
 * inject via GitHub Secrets during the build step. A window.__DEMS_CONFIG__ override is
 * provided for emergency runtime injection only (not the standard path).
 */

function readRuntimeConfig() {
  try {
    return window.__DEMS_CONFIG__ || {};
  } catch (_) {
    return {};
  }
}

const rt = readRuntimeConfig();

export const DEMS_AUTH_CONFIG = {
  clientId:
    process.env.REACT_APP_ENTRA_CLIENT_ID ||
    rt.REACT_APP_ENTRA_CLIENT_ID ||
    "",
  authority:
    process.env.REACT_APP_ENTRA_AUTHORITY ||
    rt.REACT_APP_ENTRA_AUTHORITY ||
    "",
  tenantId:
    process.env.REACT_APP_ENTRA_TENANT_ID ||
    rt.REACT_APP_ENTRA_TENANT_ID ||
    "",
  apiScope:
    process.env.REACT_APP_ENTRA_API_SCOPE ||
    rt.REACT_APP_ENTRA_API_SCOPE ||
    "",
};

export const msalConfig = {
  auth: {
    clientId: DEMS_AUTH_CONFIG.clientId,
    authority: DEMS_AUTH_CONFIG.authority,
    // SWA always lands on origin root after redirect; React Router handles the rest.
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin + "/login",
    // CRITICAL: false so post-redirect navigation is handled by our AuthContext,
    // not by MSAL trying to go back to the originating URL (which was /login).
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage",
    // true = cookie fallback for Safari / restricted environments
    storeAuthStateInCookie: true,
  },
  system: {
    // Reduce console noise from MSAL in production builds
    loggerOptions: {
      logLevel: 3, // Warning
      loggerCallback: () => {},
      piiLoggingEnabled: false,
    },
  },
};

/** The scopes we request when acquiring a token for the backend API. */
export const loginRequest = {
  scopes: [DEMS_AUTH_CONFIG.apiScope].filter(Boolean),
  // force the configured tenant so guest/MSA users target the right directory
  authority: DEMS_AUTH_CONFIG.authority || undefined,
};
