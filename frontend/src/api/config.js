// Single switch for all frontend API wiring.
// IMPORTANT: For final production demo, mocking is HARD-CODED here.
// To change mock/real mode, edit this file and rebuild/redeploy.
//
// Rules:
// - No URL / localStorage toggles (avoids accidental demo mistakes).
// - Mocks must mirror real API contracts exactly.
export const USE_MOCK = false;

// Base URL for real mode (APIM front door). Must be set in build env.
export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");

export function buildApiUrl(path) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE_URL}${path}`;
}
