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
import { getEnv } from "../../config/env";
import { createReadSas, createUploadSas, getContainerClient } from "../../lib/storage";
import { readJson, getQuery } from "../../lib/http";
import {
  EvidenceUploadInitSchema,
  EvidenceUploadConfirmSchema,
  EvidenceSearchSchema,
  EvidenceTagsUpdateSchema,
} from "../../models/schemas";
import type { Evidence } from "../../models/types";
import { safeHandler, handleOptions } from "./_middleware";
import { json, problem } from "../../lib/http";
import { getSearchClients } from "../../lib/search";
import { cascadeDeleteEvidence } from "../../lib/cascadeDelete";
import type { Case } from "../../models/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

function guessFileType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["png", "jpg", "jpeg", "bmp", "tif", "tiff", "gif", "webp"].includes(ext)) return "image";
  if (["wav", "mp3", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "video";
  if (["txt", "log", "csv", "json", "xml"].includes(ext)) return "text";
  // DOCX/PPTX/XLSX support (Problem 5 – document extraction via mammoth)
  if (["docx"].includes(ext)) return "docx";
  if (["pptx", "xlsx"].includes(ext)) return "office";
  return "file";
}

async function findEvidenceById(evidenceId: string): Promise<Evidence | null> {
  const { evidence } = getContainers();
  const q = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: evidenceId }],
  };
  const { resources } = await evidence.items.query<Evidence>(q).fetchAll();
  return resources[0] ?? null;
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

// ─── upload-init ──────────────────────────────────────────────────────────────

export async function uploadInit(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeWrite(auth);

    const env = getEnv();
    const body = EvidenceUploadInitSchema.parse(await readJson(req));

    // Validate case exists and caller has access to its department.
    const theCase = await findCaseById(body.caseId);
    if (!theCase) return problem(404, "Case not found");
    await assertDepartmentAccess(auth, theCase.department);

    const evidenceId = uuidv4();
    const safeFileName = sanitizeFileName(body.fileName);
    const blobPath = `${body.caseId}/${evidenceId}/${safeFileName}`;

    const { uploadUrl, expiresOn } = await createUploadSas(
      env.AZURE_STORAGE_ACCOUNT_NAME,
      env.EVIDENCE_CONTAINER_RAW,
      blobPath
    );

    return json(200, {
      evidenceId,
      uploadUrl,
      sasUrl: uploadUrl, // legacy alias; frontend normalises either field
      blobPath,
      expiresOn,
    });
  });
}

// ─── upload-confirm ───────────────────────────────────────────────────────────

export async function uploadConfirm(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeWrite(auth);

    const env = getEnv();
    const body = EvidenceUploadConfirmSchema.parse(await readJson(req));

    const theCase = await findCaseById(body.caseId);
    if (!theCase) return problem(404, "Case not found");
    await assertDepartmentAccess(auth, theCase.department);

    // Reconstruct fileName from the blob path already known on the client.
    // The client should send the same blobPath it received from upload-init.
    // We cannot infer the filename here reliably, so we accept it from the body
    // or fall back to a generated name.
    const blobPath = `${body.caseId}/${body.evidenceId}/`;

    const containerClient = getContainerClient(
      env.AZURE_STORAGE_ACCOUNT_NAME,
      env.EVIDENCE_CONTAINER_RAW
    );

    // Find the actual blob by listing blobs whose name starts with the prefix.
    let actualBlobPath = "";
    let actualFileName = "unknown";
    for await (const blob of containerClient.listBlobsFlat({
      prefix: `${body.caseId}/${body.evidenceId}/`,
    })) {
      actualBlobPath = blob.name;
      actualFileName = blob.name.split("/").pop() ?? "unknown";
      break;
    }

    if (!actualBlobPath) {
      return problem(400, "Blob not found for this evidenceId — upload may not have completed");
    }

    const fileType = guessFileType(actualFileName);
    const blobUrlRaw = `https://${env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${env.EVIDENCE_CONTAINER_RAW}/${actualBlobPath}`;

    const userTags = body.userTags ?? [];

    const evidence: Evidence = {
      id: body.evidenceId,
      caseId: body.caseId,
      department: theCase.department,
      fileName: actualFileName,
      fileType,
      blobPathRaw: actualBlobPath,
      blobUrlRaw,
      uploadedAt: new Date().toISOString(),
      uploadedBy: auth.oid,
      description: body.description,
      userTags,
      tags: userTags,
      status: "UPLOADED",
      statusUpdatedAt: new Date().toISOString(),
    };

    const { evidence: evidenceContainer } = getContainers();
    await evidenceContainer.items.create(evidence);

    return json(201, evidence);
  });
}

// ─── evidence list ────────────────────────────────────────────────────────────

export async function evidenceList(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeRead(auth);

    const { evidence } = getContainers();
    const caseId = req.query.get("caseId");

    const officerDept = await getCaseOfficerDepartment(auth);

    if (caseId) {
      const q = {
        query: "SELECT * FROM c WHERE c.caseId = @caseId",
        parameters: [{ name: "@caseId", value: caseId }],
      };
      const { resources } = await evidence.items
        .query<Evidence>(q, { partitionKey: caseId })
        .fetchAll();
      const filtered = officerDept
        ? resources.filter((e) => e.department === officerDept)
        : resources;
      return json(200, filtered);
    }

    if (officerDept) {
      const q = {
        query: "SELECT * FROM c WHERE c.department = @dept",
        parameters: [{ name: "@dept", value: officerDept }],
      };
      const { resources } = await evidence.items.query<Evidence>(q).fetchAll();
      return json(200, resources);
    }

    const { resources } = await evidence.items.query<Evidence>("SELECT * FROM c").fetchAll();
    return json(200, resources);
  });
}

// ─── evidence by id  (GET) and delete (DELETE) — merged into one registration ─
//
// WHY MERGED: Azure Functions v4 programming model does not support two
// separate app.http() calls sharing the same route template, even if their
// method arrays are disjoint.  The second registration is silently ignored at
// startup, causing a 404 for whichever HTTP method it was meant to handle.
// Solution: one registration with methods ["GET","DELETE","OPTIONS"] and a
// single handler that dispatches on req.method.

async function evidenceByIdOrDelete(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);

    const evidenceId = req.params.evidenceId;
    if (!evidenceId) return problem(400, "Missing evidenceId");

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      requireInvestigativeRead(auth);
      const found = await findEvidenceById(evidenceId);
      if (!found) return problem(404, "Evidence not found");
      if (found.department) await assertDepartmentAccess(auth, found.department);
      return json(200, found);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      requireInvestigativeDelete(auth);
      const found = await findEvidenceById(evidenceId);
      if (!found) return problem(404, "Evidence not found");
      if (found.department) await assertDepartmentAccess(auth, found.department);
      await cascadeDeleteEvidence(found);
      return json(200, { ok: true, deletedEvidenceId: found.id });
    }

    return problem(405, "Method not allowed");
  });
}

// ─── evidence status ──────────────────────────────────────────────────────────

export async function evidenceStatus(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeRead(auth);

    const evidenceId = req.params.evidenceId;
    if (!evidenceId) return problem(400, "Missing evidenceId");

    const found = await findEvidenceById(evidenceId);
    if (!found) return problem(404, "Evidence not found");
    if (found.department) await assertDepartmentAccess(auth, found.department);

    return json(200, {
      evidenceId: found.id,
      status: found.status,
      statusUpdatedAt: found.statusUpdatedAt,
      processingError: found.processingError,
      processedAt: found.processedAt,
    });
  });
}

// ─── read URL (SAS for download) ──────────────────────────────────────────────

export async function evidenceReadUrl(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeRead(auth);

    const evidenceId = req.params.evidenceId;
    if (!evidenceId) return problem(400, "Missing evidenceId");

    const found = await findEvidenceById(evidenceId);
    if (!found) return problem(404, "Evidence not found");
    if (found.department) await assertDepartmentAccess(auth, found.department);

    const env = getEnv();
    const { readUrl, expiresOn } = await createReadSas(
      env.AZURE_STORAGE_ACCOUNT_NAME,
      env.EVIDENCE_CONTAINER_RAW,
      found.blobPathRaw
    );

    return json(200, { readUrl, expiresOn });
  });
}

// ─── evidence search ──────────────────────────────────────────────────────────

export async function evidenceSearch(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeRead(auth);

    const params = EvidenceSearchSchema.parse(Object.fromEntries(req.query.entries()));

    const { q, caseId, status, tag } = params;
    const top = params.top ? parseInt(params.top, 10) : 20;
    const skip = params.skip ? parseInt(params.skip, 10) : 0;

    const officerDept = await getCaseOfficerDepartment(auth);

    const filters: string[] = [];
    if (officerDept) filters.push(`department eq '${officerDept}'`);
    if (caseId) filters.push(`caseId eq '${caseId}'`);
    if (status) filters.push(`status eq '${status}'`);
    if (tag) filters.push(`tags/any(t: t eq '${tag}')`);

    const { search } = getSearchClients();
    const result = await search.search(q ?? "*", {
      filter: filters.length ? filters.join(" and ") : undefined,
      top,
      skip,
      includeTotalCount: true,
    });

    const docs: any[] = [];
    for await (const r of result.results) {
      docs.push(r.document);
    }

    return json(200, {
      count: result.count ?? docs.length,
      results: docs,
    });
  });
}

// ─── PATCH tags ───────────────────────────────────────────────────────────────
//
// PATCH /api/evidence/id/{evidenceId}/tags
// Body: { "userTags": ["tag1", "tag2"] }
// Allows updating the userTags array after upload (e.g. from the detail modal).
// Enforces same write RBAC as other mutating evidence operations.

async function evidenceTagsUpdate(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireInvestigativeWrite(auth);

    const evidenceId = req.params.evidenceId;
    if (!evidenceId) return problem(400, "Missing evidenceId");

    const body = EvidenceTagsUpdateSchema.parse(await readJson(req));

    const found = await findEvidenceById(evidenceId);
    if (!found) return problem(404, "Evidence not found");
    if (found.department) await assertDepartmentAccess(auth, found.department);

    const updated: Evidence = {
      ...found,
      userTags: body.userTags,
      // tags is the combined field; preserve autoTags already set by pipeline
      tags: [...(found.autoTags ?? []), ...body.userTags],
    };

    const { evidence } = getContainers();
    await evidence.items.upsert(updated);

    // Sync updated tags to Search index so filter/facet stays consistent.
    try {
      const { search } = getSearchClients();
      await search.mergeOrUploadDocuments([
        {
          id: updated.id,
          caseId: updated.caseId,
          department: updated.department,
          fileName: updated.fileName,
          fileType: updated.fileType,
          uploadedAt: updated.uploadedAt,
          uploadedBy: updated.uploadedBy,
          status: updated.status,
          description: updated.description,
          tags: updated.tags,
          extractedText: updated.extractedText,
        },
      ]);
    } catch (_) {
      // Search sync failure is non-fatal; Cosmos is the source of truth.
    }

    return json(200, updated);
  });
}

// ─── app registrations ────────────────────────────────────────────────────────

app.http("EvidenceUploadInit", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "evidence/upload-init",
  handler: uploadInit,
});

app.http("EvidenceUploadConfirm", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "evidence/upload-confirm",
  handler: uploadConfirm,
});

app.http("EvidenceList", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "evidence",
  handler: evidenceList,
});

// IMPORTANT: GET and DELETE are combined into ONE registration.
// Splitting them into two app.http() calls with the same route
// causes the v4 runtime to ignore one silently → 404.
app.http("EvidenceByIdOrDelete", {
  methods: ["GET", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "evidence/id/{evidenceId}",
  handler: evidenceByIdOrDelete,
});

app.http("EvidenceSearch", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "evidence/search",
  handler: evidenceSearch,
});

app.http("EvidenceStatus", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "evidence/id/{evidenceId}/status",
  handler: evidenceStatus,
});

app.http("EvidenceReadUrl", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "evidence/id/{evidenceId}/read-url",
  handler: evidenceReadUrl,
});

app.http("EvidenceTagsUpdate", {
  methods: ["PATCH", "OPTIONS"],
  authLevel: "anonymous",
  route: "evidence/id/{evidenceId}/tags",
  handler: evidenceTagsUpdate,
});
