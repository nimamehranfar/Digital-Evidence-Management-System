// Toggle between mock and real API.
//
// Mock mode is used for local demos without Azure.
// Real mode uses Entra ID (MSAL) + APIM.
//
// Toggle order:
// 1) URL param: ?mock=1 or ?mock=true (force mock), ?mock=0 (force real)
// 2) localStorage key: USE_MOCK=true|false
// 3) default: false (real)
export const USE_MOCK = (() => {
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.has("mock")) {
      const v = (qs.get("mock") || "").toLowerCase();
      if (v === "0" || v === "false" || v === "no") return false;
      return true;
    }
    const stored = localStorage.getItem("USE_MOCK");
    if (stored !== null) return stored === "true";
  } catch (_) {
    // ignore
  }
  return false;
})();

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || "http://localhost:7071",
  TIMEOUT: 30000,
  HEADERS: {
    "Content-Type": "application/json",
  },
};

export const mockDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));
