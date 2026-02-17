import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { USE_MOCK } from "../api/config";
import * as authApi from "../api/authApi";
import { msalInstance, ensureActiveAccount } from "../auth/msalInstance";
import { EventType } from "@azure/msal-browser";

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authTick, setAuthTick] = useState(0);

  // Real-mode: listen to MSAL events so we can refresh /api/auth/me after login/logout.
  useEffect(() => {
    if (USE_MOCK) return;

    const callbackId = msalInstance.addEventCallback((event) => {
      // Keep active account stable (helps silent token acquisition).
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
        msalInstance.setActiveAccount(event.payload.account);
      }

      // Any account or auth change should trigger a reload.
      const shouldTick =
        event.eventType === EventType.LOGIN_SUCCESS ||
        event.eventType === EventType.LOGOUT_SUCCESS ||
        event.eventType === EventType.ACCOUNT_ADDED ||
        event.eventType === EventType.ACCOUNT_REMOVED;

      if (shouldTick) setAuthTick((t) => t + 1);
    });

    // Best-effort: ensure we have an active account on first mount.
    ensureActiveAccount().catch(() => {});

    return () => {
      if (callbackId) msalInstance.removeEventCallback(callbackId);
    };
  }, []);

  // Load user from /api/auth/me (real) or localStorage (mock).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAuthError("");

      try {
        const u = await authApi.getCurrentUser();
        if (!cancelled) setUser(u);
      } catch (e) {
        if (!cancelled) {
          setUser(null);

          // Surface a useful error for the login page.
          const status = e?.status;
          const code = e?.code;
          const msg = String(e?.message || "");

          if (code === "interaction_required" || msg === "interaction_required") {
            setAuthError(
              "Signed into Microsoft, but a new consent/interaction is required to get an API token. Click 'Try sign-in again'."
            );
          } else if (status === 401) {
            setAuthError("Unauthorized (401): your sign-in did not produce a valid API token for this backend.");
          } else if (status === 403) {
            setAuthError("Forbidden (403): your account is not authorized for this app/API (or role mapping is missing).");
          } else if (msg) {
            setAuthError(msg);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (USE_MOCK) {
      load();
      return () => {
        cancelled = true;
      };
    }

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      setUser(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    // Ensure active account exists before calling backend (token acquisition needs it).
    ensureActiveAccount()
      .catch(() => {})
      .finally(() => load());

    return () => {
      cancelled = true;
    };
  }, [authTick]);

  const roles = useMemo(() => {
    const r = user?.roles;
    return Array.isArray(r) ? r : [];
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isDetective = roles.includes("detective");
  const isCaseOfficer = roles.includes("case_officer");
  const isProsecutor = roles.includes("prosecutor");

  const isInvestigative = isDetective || isCaseOfficer || isProsecutor;

  function canAccessDepartment(deptId) {
    if (!deptId) return false;
    if (isDetective || isProsecutor) return true;
    if (isCaseOfficer) return user?.department === deptId;
    return false; // admin has zero investigative access
  }

  function canCreateOrEditCases() {
    return isDetective || isCaseOfficer;
  }

  function canDeleteCases() {
    return isDetective || isCaseOfficer;
  }

  function canAddEvidence() {
    return isDetective || isCaseOfficer;
  }

  function canDeleteEvidence() {
    return isDetective || isCaseOfficer;
  }

  function canManageDepartments() {
    return isAdmin;
  }

  function canManageUsers() {
    return isAdmin;
  }

  async function login(mockOptions) {
    setAuthError("");
    if (USE_MOCK) {
      const u = await authApi.login(mockOptions);
      setUser(u);
      return u;
    }
    return authApi.login(); // redirect
  }

  async function logout() {
    if (USE_MOCK) {
      await authApi.logout();
      setUser(null);
      return;
    }
    return authApi.logout(); // redirect
  }

  const value = {
    user,
    loading,
    authError,

    roles,
    isAdmin,
    isDetective,
    isCaseOfficer,
    isProsecutor,
    isInvestigative,

    login,
    logout,

    canAccessDepartment,
    canCreateOrEditCases,
    canDeleteCases,
    canAddEvidence,
    canDeleteEvidence,
    canManageDepartments,
    canManageUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
