import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { USE_MOCK } from "./api/config";
import { msalInstance } from "./auth/msalInstance";

/**
 * Clears MSAL interaction-in-progress keys from both sessionStorage and localStorage.
 *
 * MSAL v3 uses a lock key named "<clientId>.interaction.status" in sessionStorage.
 * MSAL v2 used "msal.interaction.status".
 * We clear both patterns to be version-agnostic and to recover from any stale state
 * left by a previous tab/redirect that was interrupted.
 *
 * This is called BEFORE handleRedirectPromise() so a stuck lock never prevents
 * the redirect result from being processed.
 */
function clearMsalInteractionLocks() {
  const clear = (store) => {
    if (!store) return;
    const toRemove = [];
    try {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (!k) continue;
        // Match any key that looks like an MSAL interaction lock
        if (
          k.includes("interaction.status") ||
          k.includes("interaction_status") ||
          k.includes(".request.state") ||
          k.includes(".request.params") ||
          k.endsWith(".interaction")
        ) {
          toRemove.push(k);
        }
      }
    } catch (_) {
      // storageLength throws in some sandboxed environments — ignore
    }
    toRemove.forEach((k) => {
      try { store.removeItem(k); } catch (_) { /* ignore */ }
    });
  };
  try { clear(window.sessionStorage); } catch (_) { /* ignore */ }
  try { clear(window.localStorage); } catch (_) { /* ignore */ }
}

async function bootstrap() {
  if (!USE_MOCK) {
    // 1. Initialize MSAL (loads config, validates options)
    await msalInstance.initialize();

    // 2. Clear any stale interaction locks from a previous unfinished redirect
    clearMsalInteractionLocks();

    // 3. Process the redirect result (if any) — MUST happen before first render
    //    so that tokens are in cache before AuthContext tries acquireTokenSilent.
    try {
      const result = await msalInstance.handleRedirectPromise();
      if (result?.account) {
        // The redirect returned an account — set it as active immediately.
        msalInstance.setActiveAccount(result.account);
      }
    } catch (redirectError) {
      // handleRedirectPromise can throw on:
      //   - hash_empty_error: normal page load (no hash in URL) — ignore
      //   - state_not_found: stale state in storage — ignore and continue
      //   - Any other error: log and continue; the user will see a login screen
      const code = redirectError?.errorCode || redirectError?.name || "";
      if (
        !code.includes("hash_empty") &&
        !code.includes("no_state") &&
        !code.includes("state_not_found")
      ) {
        console.warn("[MSAL bootstrap] handleRedirectPromise error:", redirectError);
      }
    }

    // 4. If no active account was set by the redirect result, pick the first cached one.
    //    This covers the "already signed in, hard reload" case.
    if (!msalInstance.getActiveAccount()) {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
      }
    }
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap().catch((err) => {
  // Last-resort: if bootstrap itself crashes (e.g. MSAL config error),
  // render App anyway so the user sees a meaningful error rather than a blank page.
  console.error("[bootstrap] Fatal error:", err);
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

reportWebVitals();
