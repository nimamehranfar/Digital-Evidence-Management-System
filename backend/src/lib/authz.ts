import type { AuthContext, Role } from "./auth";
import { getUserRecord } from "./users";

/**
 * RBAC semantics (source-of-truth from your Part 2 report):
 * - admin: platform governance only. ZERO access to cases/evidence.
 * - detective: full CRUD across all depts/cases/evidence.
 * - case_officer: CRUD only within assigned department.
 * - prosecutor: read-only across all depts/cases/evidence.
 *
 * Multi-role is supported:
 * - If a user has ANY investigative role, they may use investigative endpoints.
 * - Having the admin role alone must not grant investigative access.
 */

export type InvestigativeRole = Exclude<Role, "admin">;

export function hasAnyRole(auth: AuthContext, roles: Role[]): boolean {
  return auth.roles.some((r) => roles.includes(r));
}

export function hasInvestigativeRole(auth: AuthContext): boolean {
  return hasAnyRole(auth, ["detective", "case_officer", "prosecutor"]);
}

export function requirePlatformAdmin(auth: AuthContext): void {
  if (!hasAnyRole(auth, ["admin"])) throw new Error("Missing required role. Need one of: admin");
}

export function requireInvestigativeRead(auth: AuthContext): void {
  if (!hasInvestigativeRole(auth)) throw new Error("Forbidden: requires investigative role");
}

export function requireInvestigativeWrite(auth: AuthContext): void {
  if (!hasAnyRole(auth, ["detective", "case_officer"])) throw new Error("Forbidden: requires write investigative role");
}

export function requireInvestigativeDelete(auth: AuthContext): void {
  if (!hasAnyRole(auth, ["detective", "case_officer"])) throw new Error("Forbidden: requires delete investigative role");
}

export async function getCaseOfficerDepartment(auth: AuthContext): Promise<string | null> {
  if (!hasAnyRole(auth, ["case_officer"])) return null;
  if (!auth.oid) throw new Error("Forbidden: missing oid claim");

  const record = await getUserRecord(auth.oid);
  const dept = record?.department ? String(record.department) : "";
  if (!dept) throw new Error("Forbidden: case_officer has no department assignment");
  return dept;
}

export async function assertDepartmentAccess(auth: AuthContext, departmentId: string): Promise<void> {
  requireInvestigativeRead(auth);
  if (hasAnyRole(auth, ["detective", "prosecutor"])) return;

  const dept = await getCaseOfficerDepartment(auth);
  if (!dept) throw new Error("Forbidden: department-scoped access required");
  if (dept !== departmentId) throw new Error("Forbidden: cross-department access denied");
}
