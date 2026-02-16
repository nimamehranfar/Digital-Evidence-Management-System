import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { HttpRequest } from "@azure/functions";
import { getEnv } from "../config/env";

export type Role = "admin" | "detective" | "case_officer" | "prosecutor";

export type AuthContext = {
  oid?: string;
  tid?: string;
  upn?: string;
  name?: string;
  roles: Role[];
  raw: JWTPayload;
};

function getBearerToken(req: HttpRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

const jwksCache: Record<string, ReturnType<typeof createRemoteJWKSet>> = {};

function jwks(tenantId: string) {
  if (!jwksCache[tenantId]) {
    // v2 keys endpoint; works for tokens signed by the tenant
    const url = new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`);
    jwksCache[tenantId] = createRemoteJWKSet(url);
  }
  return jwksCache[tenantId];
}

function allowedIssuers(tenantId: string): string[] {
  // Azure CLI commonly returns v1-style issuer (sts.windows.net).
  // Browser/MSAL commonly returns v2-style issuer (login.microsoftonline.com/.../v2.0).
  return [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
  ];
}

export async function requireAuth(req: HttpRequest): Promise<AuthContext> {
  const env = getEnv();
  const token = getBearerToken(req);
  if (!token) throw new Error("Missing Authorization Bearer token");

  const { payload } = await jwtVerify(token, jwks(env.ENTRA_TENANT_ID), {
    audience: env.ENTRA_API_AUDIENCE,
    issuer: allowedIssuers(env.ENTRA_TENANT_ID),
  });

  const rolesRaw = payload.roles;
  const allowed: Role[] = ["admin", "detective", "case_officer", "prosecutor"];
  const roles: Role[] = Array.isArray(rolesRaw)
    ? (rolesRaw.filter((r) => typeof r === "string" && allowed.includes(r as Role)) as Role[])
    : [];

  return {
    oid: typeof payload.oid === "string" ? payload.oid : undefined,
    tid: typeof payload.tid === "string" ? payload.tid : undefined,
    upn:
        (typeof payload.preferred_username === "string" ? payload.preferred_username : undefined) ||
        (typeof payload.upn === "string" ? payload.upn : undefined),
    name: typeof payload.name === "string" ? payload.name : undefined,
    roles,
    raw: payload,
  };
}

export function requireRole(auth: AuthContext, allowed: Role[]): void {
  const ok = auth.roles.some((r) => allowed.includes(r));
  if (!ok) throw new Error(`Missing required role. Need one of: ${allowed.join(", ")}`);
}
