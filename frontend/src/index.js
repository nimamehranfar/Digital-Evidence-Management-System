import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { USE_MOCK } from "./api/config";
import { msalInstance } from "./auth/msalInstance";

async function bootstrap() {
  // In real mode we must finalize any MSAL redirect BEFORE rendering,
  // so the app can silently acquire tokens and call /api/auth/me.
  if (!USE_MOCK) {
    await msalInstance.initialize();
    const result = await msalInstance.handleRedirectPromise();

    if (result?.account) {
      msalInstance.setActiveAccount(result.account);
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) msalInstance.setActiveAccount(accounts[0]);
    }
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();

reportWebVitals();
