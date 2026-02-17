import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { USE_MOCK } from "../api/config";
import * as authApi from "../api/authApi";
import { msalInstance, ensureActiveAccount } from "../auth/msalInstance";

const AuthContext = createContext();

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [authError, setAuthError] = useState("");
  // Bump this to re-run the /api/auth/me effect
  const [authTick, setAuthTick] = useState(0);
  const initialLoadDone = useRef(false);

  // ---------------------------------------------------------------------------
  // Real mode: listen for MSAL account changes via localStorage events.
  // This is cross-tab safe and doesn't require the @azure/msal-react event bus.
  // We deliberately do NOT add a MSAL event callback here — doing so in React
  // 19 StrictMode caused double-loads and is unnecessary given our bootstrap.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (USE_MOCK) return;

    function onStorage(e) {
      // MSAL writes account changes to localStorage keys
      if (e.key && (e.key.includes("login") || e.key.includes("account"))) {
        setAuthTick((t) => t + 1);
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ---------------------------------------------------------------------------
  // Load current user from /api/auth/me (real) or mock store.
  // Runs on mount and whenever authTick changes.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAuthError("");

      try {
        const u = await authApi.getCurrentUser();
        if (!cancelled) {
          setUser(u);
          initialLoadDone.current = true;
        }
      } catch (e) {
        if (cancelled) return;

        setUser(null);
        initialLoadDone.current = true;

        const status = e?.status;
        const code   = e?.code || "";
        const msg    = String(e?.message || "");

        if (status === 401 || status === 403) {
          // Token was accepted by MSAL but rejected by backend (wrong audience,
          // missing role, misconfigured APIM policy, etc.)
          setAuthError(
            status === 401
              ? "Unauthorized (401): your account produced a token but the API rejected it. " +
                "Verify REACT_APP_ENTRA_API_SCOPE and APIM audience configuration."
              : "Forbidden (403): signed in successfully but your account has no app role assigned. " +
                "Ask an admin to assign a role in the Entra ID portal."
          );
        } else if (
          code === "interaction_required" ||
          msg.includes("interaction_required") ||
          code === "timeout"
        ) {
          // interaction_required means the silent token refresh needs a new redirect.
          // acquireToken() in msalInstance already triggers acquireTokenRedirect, so
          // by the time we catch here the browser is already navigating away.
          // We set a message for the brief window before the redirect.
          if (!code.includes("timeout")) {
            setAuthError("Re-authenticating with Microsoft — please wait…");
          } else {
            setAuthError(
              "Request timed out. Check your network connection and try again."
            );
          }
        } else if (msg) {
          setAuthError(msg);
        } else {
          setAuthError("Could not connect to the API. Check REACT_APP_API_BASE_URL and network/CORS settings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // --- MOCK MODE ---
    if (USE_MOCK) {
      load();
      return () => { cancelled = true; };
    }

    // --- REAL MODE ---
    // Only call /api/auth/me if there is at least one MSAL account in cache.
    // If no accounts: user is not signed in — show login page immediately.
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      setUser(null);
      setLoading(false);
      return () => { cancelled = true; };
    }

    // Ensure active account is set then load
    ensureActiveAccount()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) load();
      });

    return () => { cancelled = true; };
  }, [authTick]);

  // ---------------------------------------------------------------------------
  // Derived role flags
  // ---------------------------------------------------------------------------
  const roles = useMemo(() => {
    const r = user?.roles;
    return Array.isArray(r) ? r : [];
  }, [user]);

  const isAdmin       = roles.includes("admin");
  const isDetective   = roles.includes("detective");
  const isCaseOfficer = roles.includes("case_officer");
  const isProsecutor  = roles.includes("prosecutor");
  const isInvestigative = isDetective || isCaseOfficer || isProsecutor;

  // ---------------------------------------------------------------------------
  // Permission helpers
  // ---------------------------------------------------------------------------
  function canAccessDepartment(deptId) {
    if (!deptId) return false;
    if (isDetective || isProsecutor) return true;
    if (isCaseOfficer) return user?.department === deptId;
    return false;
  }
  function canCreateOrEditCases()  { return isDetective || isCaseOfficer; }
  function canDeleteCases()         { return isDetective || isCaseOfficer; }
  function canAddEvidence()         { return isDetective || isCaseOfficer; }
  function canDeleteEvidence()      { return isDetective || isCaseOfficer; }
  function canManageDepartments()   { return isAdmin; }
  function canManageUsers()         { return isAdmin; }

  // ---------------------------------------------------------------------------
  // Login / logout actions
  // ---------------------------------------------------------------------------
  async function login(mockOptions) {
    setAuthError("");
    if (USE_MOCK) {
      const u = await authApi.login(mockOptions);
      setUser(u);
      return u;
    }
    return authApi.login(); // triggers MSAL redirect — page navigates away
  }

  async function logout() {
    if (USE_MOCK) {
      await authApi.logout();
      setUser(null);
      return;
    }
    setUser(null);
    return authApi.logout(); // triggers MSAL redirect — page navigates away
  }

  /**
   * Re-triggers the MSAL silent-then-interactive token flow.
   * Call this from the LoginPage "Try again" button.
   */
  function retryAuth() {
    setAuthError("");
    setAuthTick((t) => t + 1);
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
    retryAuth,
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
