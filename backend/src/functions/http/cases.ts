import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../../lib/auth";
import {
  assertDepartmentAccess,
  getCaseOfficerDepartment,
  requireInvestigativeDelete,
  requireInvestigativeRead,
  requireInvestigativeWrite,
} from "../../lib/authz";
import { getContainers } from "../../lib/cosmos";
import { readJson } from "../../lib/http";
import { CaseCreateSchema, CaseUpdateSchema, CaseNoteCreateSchema } from "../../models/schemas";
import type { Case, CaseNote } from "../../models/types";
import { safeHandler, handleOptions } from "./_middleware";
import { json, problem } from "../../lib/http";
import { cascadeDeleteCase } from "../../lib/cascadeDelete";

async function ensureDepartmentExists(deptId: string): Promise<void> {
  const { departments } = getContainers();
  const { resource } = await departments.item(deptId, deptId).read();
  if (!resource) throw new Error("Forbidden: department not found");
}

async function findCaseById(caseId: string): Promise<Case | null> {
  const { cases } = getContainers();
  const q = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: caseId }],
  };
  const { resources } = await cases.items.query<Case>(q).fetchAll();
  return resources[0] ?? null;
}

export async function casesCollection(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeRead(auth);

    if (req.method === "GET") {
      const { cases } = getContainers();
      const dept = req.query.get("department");

      const officerDept = await getCaseOfficerDepartment(auth);
      const effectiveDept = officerDept ?? dept ?? null;

      if (officerDept && dept && dept !== officerDept) {
        throw new Error("Forbidden: cross-department access denied");
      }

      if (dept) {
        const q = {
          query: "SELECT * FROM c WHERE c.department = @d",
          parameters: [{ name: "@d", value: dept }],
        };
        const { resources } = await cases.items
          .query<Case>(q, { partitionKey: dept })
          .fetchAll();
        return json(200, resources);
      }

      if (effectiveDept) {
        const q = {
          query: "SELECT * FROM c WHERE c.department = @d",
          parameters: [{ name: "@d", value: effectiveDept }],
        };
        const { resources } = await cases.items
          .query<Case>(q, { partitionKey: effectiveDept })
          .fetchAll();
        return json(200, resources);
      }

      const { resources } = await cases.items.query<Case>("SELECT * FROM c").fetchAll();
      return json(200, resources);
    }

    if (req.method === "POST") {
      requireInvestigativeWrite(auth);
      const body = CaseCreateSchema.parse(await readJson(req));

      await ensureDepartmentExists(body.department);
      await assertDepartmentAccess(auth, body.department);

      const item: Case = {
        id: body.id ?? uuidv4(),
        department: body.department,
        title: body.title,
        description: body.description,
        status: body.status ?? "OPEN",
        createdAt: new Date().toISOString(),
        createdBy: auth.oid,
        notes: [],
      };

      const { cases } = getContainers();
      await cases.items.create(item);
      return json(201, item);
    }

    return problem(405, "Method not allowed");
  });
}

export async function caseItem(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeRead(auth);

    const caseId = req.params.caseId;
    if (!caseId) return problem(400, "Missing caseId");

    const { cases } = getContainers();

    if (req.method === "GET") {
      const found = await findCaseById(caseId);
      if (!found) return problem(404, "Case not found");
      await assertDepartmentAccess(auth, found.department);
      return json(200, found);
    }

    if (req.method === "PATCH") {
      requireInvestigativeWrite(auth);
      const patch = CaseUpdateSchema.parse(await readJson(req));
      const found = await findCaseById(caseId);
      if (!found) return problem(404, "Case not found");

      await assertDepartmentAccess(auth, found.department);
      const updated: Case = { ...found, ...patch, updatedAt: new Date().toISOString() };
      await cases.items.upsert(updated);
      return json(200, updated);
    }

    if (req.method === "DELETE") {
      requireInvestigativeDelete(auth);
      const found = await findCaseById(caseId);
      if (!found) return problem(404, "Case not found");

      await assertDepartmentAccess(auth, found.department);
      await cascadeDeleteCase(found.id, found.department);
      return json(200, { ok: true, deletedCaseId: found.id });
    }

    return problem(405, "Method not allowed");
  });
}

// ─── POST /api/cases/{caseId}/notes ──────────────────────────────────────────

export async function caseNotes(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeWrite(auth);

    const caseId = req.params.caseId;
    if (!caseId) return problem(400, "Missing caseId");

    const body = CaseNoteCreateSchema.parse(await readJson(req));
    const found = await findCaseById(caseId);
    if (!found) return problem(404, "Case not found");

    await assertDepartmentAccess(auth, found.department);

    const note: CaseNote = {
      id: uuidv4(),
      text: body.text,
      createdAt: new Date().toISOString(),
      createdBy: auth.oid,
    };

    const updated: Case = {
      ...found,
      notes: [...(found.notes ?? []), note],
      updatedAt: new Date().toISOString(),
    };
    const { cases } = getContainers();
    await cases.items.upsert(updated);
    return json(201, note);
  });
}

// ─── DELETE /api/cases/{caseId}/notes/{noteId} ───────────────────────────────
//
// Removes a single note from the case's embedded notes array and upserts the
// case document back to Cosmos.  Same RBAC as note creation: detective or
// case_officer (scoped to department).  Prosecutor is read-only and cannot
// delete notes.

async function caseNoteDelete(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    // Same write access requirement as creating a note.
    requireInvestigativeWrite(auth);

    const caseId = req.params.caseId;
    const noteId = req.params.noteId;
    if (!caseId) return problem(400, "Missing caseId");
    if (!noteId) return problem(400, "Missing noteId");

    const found = await findCaseById(caseId);
    if (!found) return problem(404, "Case not found");

    await assertDepartmentAccess(auth, found.department);

    const existingNotes = found.notes ?? [];
    const noteExists = existingNotes.some((n) => n.id === noteId);
    if (!noteExists) return problem(404, "Note not found");

    const updated: Case = {
      ...found,
      notes: existingNotes.filter((n) => n.id !== noteId),
      updatedAt: new Date().toISOString(),
    };

    const { cases } = getContainers();
    await cases.items.upsert(updated);

    return json(200, { ok: true, deletedNoteId: noteId, caseId });
  });
}

// ─── app registrations ────────────────────────────────────────────────────────

app.http("Cases", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "cases",
  handler: casesCollection,
});

app.http("CaseById", {
  methods: ["GET", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "cases/{caseId}",
  handler: caseItem,
});

app.http("CaseNotes", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "cases/{caseId}/notes",
  handler: caseNotes,
});

app.http("CaseNoteDelete", {
  methods: ["DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "cases/{caseId}/notes/{noteId}",
  handler: caseNoteDelete,
});
