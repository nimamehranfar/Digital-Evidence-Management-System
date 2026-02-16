// MSAL configuration for Workforce Entra ID (redirect flow).
//
// Env vars (must exist):
// - REACT_APP_ENTRA_CLIENT_ID
// - REACT_APP_ENTRA_AUTHORITY
// - REACT_APP_ENTRA_API_SCOPE
//
// NOTE: We do NOT invent new env vars. Redirect URI defaults to window.location.origin.
export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_ENTRA_CLIENT_ID,
    authority: process.env.REACT_APP_ENTRA_AUTHORITY,
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
  scopes: [process.env.REACT_APP_ENTRA_API_SCOPE].filter(Boolean),
};
