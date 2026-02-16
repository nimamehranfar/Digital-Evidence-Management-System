import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, requireRole } from "../../lib/auth";
import { getContainers } from "../../lib/cosmos";
import { getEnv } from "../../config/env";
import { createUploadSas, getContainerClient } from "../../lib/storage";
import { readJson, getQuery } from "../../lib/http";
import {
  EvidenceUploadInitSchema,
  EvidenceUploadConfirmSchema,
  EvidenceSearchSchema,
} from "../../models/schemas";
import type { Evidence } from "../../models/types";
import { safeHandler, handleOptions } from "./_middleware";
import { json, problem } from "../../lib/http";
import { getSearchClients } from "../../lib/search";

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

export async function uploadInit(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireRole(auth, ["admin", "detective", "case_officer"]);

    const env = getEnv();
    const body = EvidenceUploadInitSchema.parse(await readJson(req));

    const evidenceId = uuidv4();
    const safeName = sanitizeFileName(body.fileName);
    const blobPath = `${body.caseId}/${evidenceId}/${safeName}`;

    const sas = await createUploadSas(env.AZURE_STORAGE_ACCOUNT_NAME, env.EVIDENCE_CONTAINER_RAW, blobPath, 10);

    const item: Evidence = {
      id: evidenceId,
      caseId: body.caseId,
      fileName: body.fileName,
      fileType: guessFileType(body.fileName),
      fileSize: body.fileSize,
      contentType: body.contentType,

      blobPathRaw: blobPath,
      blobUrlRaw: sas.blobUrl,

      uploadedAt: new Date().toISOString(),
      uploadedBy: auth.oid,

      status: "UPLOADED",
      statusUpdatedAt: new Date().toISOString(),
    };

    const { evidence } = getContainers();
    await evidence.items.create(item);

    return json(200, {
      evidenceId,
      caseId: body.caseId,
      blobPath,
      uploadUrl: sas.sasUrl,
      expiresOn: sas.expiresOn,
    });
  });
}

export async function uploadConfirm(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireRole(auth, ["admin", "detective", "case_officer"]);

    const env = getEnv();
    const body = EvidenceUploadConfirmSchema.parse(await readJson(req));

    const found = await findEvidenceById(body.evidenceId);
    if (!found) return problem(404, "Evidence not found");
    if (found.caseId !== body.caseId) return problem(400, "caseId mismatch");

    // Validate blob exists
    const container = getContainerClient(env.AZURE_STORAGE_ACCOUNT_NAME, env.EVIDENCE_CONTAINER_RAW);
    const blob = container.getBlobClient(found.blobPathRaw);
    const exists = await blob.exists();
    if (!exists) return problem(400, "Upload not found in blob storage", `Missing blob: ${found.blobPathRaw}`);

    const updated: Evidence = {
      ...found,
      description: body.description,
      userTags: body.userTags,
      tags: Array.from(new Set([...(body.userTags ?? []), ...(found.autoTags ?? [])])),
      statusUpdatedAt: new Date().toISOString(),
    };

    const { evidence } = getContainers();
    await evidence.items.upsert(updated);

    return json(200, updated);
  });
}

export async function evidenceList(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    await requireAuth(req);
    const { evidence } = getContainers();
    const caseId = req.query.get("caseId");
    if (caseId) {
      const q = {
        query: "SELECT * FROM c WHERE c.caseId = @c ORDER BY c.uploadedAt DESC",
        parameters: [{ name: "@c", value: caseId }],
      };
      const { resources } = await evidence.items.query<Evidence>(q, { partitionKey: caseId }).fetchAll();
      return json(200, resources);
    }

    const { resources } = await evidence.items
      .query<Evidence>("SELECT * FROM c ORDER BY c.uploadedAt DESC")
      .fetchAll();

    return json(200, resources);
  });
}

export async function evidenceById(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    await requireAuth(req);
    const evidenceId = req.params.evidenceId;
    if (!evidenceId) return problem(400, "Missing evidenceId");
    const found = await findEvidenceById(evidenceId);
    if (!found) return problem(404, "Evidence not found");
    return json(200, found);
  });
}

export async function evidenceStatus(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    await requireAuth(req);
    const evidenceId = req.params.evidenceId;
    if (!evidenceId) return problem(400, "Missing evidenceId");
    const found = await findEvidenceById(evidenceId);
    if (!found) return problem(404, "Evidence not found");
    return json(200, {
      id: found.id,
      caseId: found.caseId,
      status: found.status,
      statusUpdatedAt: found.statusUpdatedAt,
      processingError: found.processingError,
      processedAt: found.processedAt,
    });
  });
}

export async function evidenceSearch(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    await requireAuth(req);

    const q = EvidenceSearchSchema.parse(getQuery(req));
    const top = Math.min(parseInt(q.top ?? "20", 10) || 20, 100);
    const skip = Math.max(parseInt(q.skip ?? "0", 10) || 0, 0);

    const filters: string[] = [];
    if (q.caseId) filters.push(`caseId eq '${q.caseId.replace(/'/g, "''")}'`);
    if (q.status) filters.push(`status eq '${q.status.replace(/'/g, "''")}'`);
    if (q.tag) filters.push(`tags/any(t: t eq '${q.tag.replace(/'/g, "''")}')`);

    const { search } = getSearchClients();
    const result = await search.search(q.q ?? "*", {
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

app.http("EvidenceById", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "evidence/{evidenceId}",
  handler: evidenceById,
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
  route: "evidence/{evidenceId}/status",
  handler: evidenceStatus,
});
