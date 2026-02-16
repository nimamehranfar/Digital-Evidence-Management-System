import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, requireRole } from "../../lib/auth";
import { getContainers } from "../../lib/cosmos";
import { readJson } from "../../lib/http";
import { CaseCreateSchema, CaseUpdateSchema, CaseNoteCreateSchema } from "../../models/schemas";
import type { Case, CaseNote } from "../../models/types";
import { safeHandler, handleOptions } from "./_middleware";
import { json, problem } from "../../lib/http";

async function findCaseById(caseId: string): Promise<Case | null> {
  const { cases } = getContainers();
  const q = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: caseId }],
  };
  const { resources } = await cases.items.query<Case>(q).fetchAll();
  return resources[0] ?? null;
}

export async function casesCollection(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);

    if (req.method === "GET") {
      const { cases } = getContainers();
      const dept = req.query.get("department");
      if (dept) {
        const q = {
          query: "SELECT * FROM c WHERE c.department = @d",
          parameters: [{ name: "@d", value: dept }],
        };
        const { resources } = await cases.items.query<Case>(q, { partitionKey: dept }).fetchAll();
        return json(200, resources);
      }

      const { resources } = await cases.items.query<Case>("SELECT * FROM c").fetchAll();
      return json(200, resources);
    }

    if (req.method === "POST") {
      requireRole(auth, ["admin", "detective", "case_officer"]);
      const body = CaseCreateSchema.parse(await readJson(req));

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

export async function caseItem(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    const caseId = req.params.caseId;
    if (!caseId) return problem(400, "Missing caseId");

    const { cases } = getContainers();

    if (req.method === "GET") {
      const found = await findCaseById(caseId);
      if (!found) return problem(404, "Case not found");
      return json(200, found);
    }

    if (req.method === "PATCH") {
      requireRole(auth, ["admin", "detective", "case_officer"]);
      const patch = CaseUpdateSchema.parse(await readJson(req));
      const found = await findCaseById(caseId);
      if (!found) return problem(404, "Case not found");
      const updated: Case = { ...found, ...patch, updatedAt: new Date().toISOString() };
      await cases.items.upsert(updated);
      return json(200, updated);
    }

    if (req.method === "DELETE") {
      requireRole(auth, ["admin"]);
      const found = await findCaseById(caseId);
      if (!found) return problem(404, "Case not found");
      await cases.item(caseId, found.department).delete();
      return json(200, { ok: true });
    }

    return problem(405, "Method not allowed");
  });
}

export async function caseNotes(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireRole(auth, ["admin", "detective", "case_officer", "prosecutor"]);

    const caseId = req.params.caseId;
    if (!caseId) return problem(400, "Missing caseId");

    const body = CaseNoteCreateSchema.parse(await readJson(req));
    const found = await findCaseById(caseId);
    if (!found) return problem(404, "Case not found");

    const note: CaseNote = {
      id: uuidv4(),
      text: body.text,
      createdAt: new Date().toISOString(),
      createdBy: auth.oid,
    };

    const updated: Case = { ...found, notes: [...(found.notes ?? []), note], updatedAt: new Date().toISOString() };
    const { cases } = getContainers();
    await cases.items.upsert(updated);
    return json(201, note);
  });
}

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
