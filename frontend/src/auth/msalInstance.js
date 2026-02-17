import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./msalConfig";

/**
 * Singleton MSAL PublicClientApplication.
 *
 * Created once at module load time.  initialize() is called in index.js
 * BEFORE React renders so that handleRedirectPromise() runs synchronously
 * relative to the first render.
 */
export const msalInstance = new PublicClientApplication(msalConfig);

/**
 * Ensures there is an active account for silent token acquisition.
 * Returns the active account (or null if none is available).
 */
export async function ensureActiveAccount() {
  const current = msalInstance.getActiveAccount();
  if (current) return current;

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
    return accounts[0];
  }
  return null;
}

/**
 * Acquires an access token for the API scope using the silent flow.
 *
 * If the silent flow throws InteractionRequiredAuthError (consent needed,
 * MFA required, or token cache expired/missing) we call acquireTokenRedirect.
 * That sends the user to Microsoft with the existing SSO session — they
 * typically don't see a login prompt, just a brief redirect — and return with
 * a fresh token.  The Promise never resolves because the page navigates away;
 * callers should treat the returned Promise as fire-and-forget in that case.
 *
 * Returns the access token string, or null if no account is signed in.
 * Throws for non-interaction errors (network, config, etc.).
 */
export async function acquireToken() {
  const account = await ensureActiveAccount();
  if (!account) return null;

  try {
    const result = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return result.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      // Trigger redirect to Microsoft using the existing SSO session.
      // This resolves consent / MFA prompts without a full re-login.
      await msalInstance.acquireTokenRedirect({
        ...loginRequest,
        account,
      });
      // acquireTokenRedirect navigates the browser away — never reaches here.
      return null;
    }
    throw e;
  }
}
