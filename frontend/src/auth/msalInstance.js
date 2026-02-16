import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./msalConfig";

export const msalInstance = new PublicClientApplication(msalConfig);

// Keep a stable "active account" for silent token acquisition.
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
