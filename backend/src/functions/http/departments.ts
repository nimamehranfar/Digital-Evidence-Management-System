import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, requireRole } from "../../lib/auth";
import { getContainers } from "../../lib/cosmos";
import { readJson } from "../../lib/http";
import { DepartmentCreateSchema, DepartmentUpdateSchema } from "../../models/schemas";
import type { Department } from "../../models/types";
import { safeHandler, handleOptions } from "./_middleware";
import { json, problem } from "../../lib/http";
import { cascadeDeleteDepartment } from "../../lib/cascadeDelete";

export async function departmentsCollection(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);

    if (req.method === "GET") {
      const { departments } = getContainers();
      const q = "SELECT * FROM c";
      const { resources } = await departments.items.query<Department>(q).fetchAll();
      return json(200, resources);
    }

    if (req.method === "POST") {
      requireRole(auth, ["admin"]);
      const body = DepartmentCreateSchema.parse(await readJson(req));

      const dept: Department = {
        id: body.id ?? uuidv4(),
        name: body.name,
        description: body.description,
        createdAt: new Date().toISOString(),
        createdBy: auth.oid,
      };

      const { departments } = getContainers();
      await departments.items.create(dept);
      return json(201, dept);
    }

    return problem(405, "Method not allowed");
  });
}

export async function departmentsItem(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    const deptId = req.params.id;
    if (!deptId) return problem(400, "Missing department id");

    const { departments } = getContainers();

    if (req.method === "PATCH") {
      requireRole(auth, ["admin"]);
      const patch = DepartmentUpdateSchema.parse(await readJson(req));
      const { resource } = await departments.item(deptId, deptId).read<Department>();
      if (!resource) return problem(404, "Department not found");
      const updated: Department = { ...resource, ...patch };
      await departments.items.upsert(updated);
      return json(200, updated);
    }

    if (req.method === "DELETE") {
      requireRole(auth, ["admin"]);
      const { deletedCases, deletedEvidence } = await cascadeDeleteDepartment(deptId);
      await departments.item(deptId, deptId).delete();
      return json(200, { ok: true, deletedDepartmentId: deptId, deletedCases, deletedEvidence });
    }

    return problem(405, "Method not allowed");
  });
}

app.http("Departments", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "departments",
  handler: departmentsCollection,
});

app.http("DepartmentById", {
  methods: ["PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "departments/{id}",
  handler: departmentsItem,
});
