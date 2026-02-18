/**
 * evidenceBlobIngest.ts
 *
 * Blob-trigger that fires when a new file lands in the evidence-raw container.
 * Path pattern: {caseId}/{evidenceId}/{fileName}
 *
 * Processing branches (by fileType):
 *   image / pdf  → Azure AI Vision OCR (unchanged)
 *   text         → direct UTF-8 decode (was incorrectly calling Vision OCR)
 *   audio        → Azure AI Speech continuous recognition  (NEW – Problem 5)
 *   docx         → mammoth text extraction                 (NEW – Problem 5)
 *   video / file / office / other → no extraction; mark COMPLETED immediately
 */

import { app, InvocationContext } from "@azure/functions";
import { getEnv } from "../../config/env";
import { getContainers } from "../../lib/cosmos";
import type { Evidence } from "../../models/types";
import type { Case } from "../../models/types";
import { ocrRead } from "../../lib/vision";
import { transcribeAudio } from "../../lib/speech";
import { getSearchClients, EvidenceSearchDoc } from "../../lib/search";
import type { SearchIndexClient, SearchIndex, SearchField } from "@azure/search-documents";

// ─── mammoth is a pure-npm library; no Azure service or key required ──────────
// Install: npm install mammoth
// Types:   npm install --save-dev @types/mammoth  (or use inline any cast)
let mammoth: any;
try {
  // Dynamic require so a missing package produces a clear error at runtime
  // only when a .docx file is actually processed, not at cold start.
  mammoth = require("mammoth");
} catch (_) {
  mammoth = null;
}

// ─── search index lazy-init ───────────────────────────────────────────────────

let indexEnsured = false;
let ensureInFlight: Promise<void> | null = null;

async function ensureEvidenceIndex(indexClient: SearchIndexClient, indexName: string) {
  if (indexEnsured) return;
  if (ensureInFlight) return ensureInFlight;

  ensureInFlight = (async () => {
    try {
      await indexClient.getIndex(indexName);
      indexEnsured = true;
      return;
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (!msg.includes("404") && !msg.toLowerCase().includes("not found")) throw e;
    }

    const fields: SearchField[] = [
      { name: "id",          type: "Edm.String",              key: true, filterable: true, sortable: true },
      { name: "caseId",      type: "Edm.String",              filterable: true, sortable: true, facetable: true },
      { name: "department",  type: "Edm.String",              filterable: true, facetable: true },
      { name: "fileName",    type: "Edm.String",              searchable: true },
      { name: "fileType",    type: "Edm.String",              filterable: true, facetable: true },
      { name: "uploadedAt",  type: "Edm.DateTimeOffset",      filterable: true, sortable: true },
      { name: "uploadedBy",  type: "Edm.String",              filterable: true },
      { name: "status",      type: "Edm.String",              filterable: true, facetable: true },
      { name: "description", type: "Edm.String",              searchable: true, analyzerName: "en.lucene" },
      { name: "extractedText", type: "Edm.String",            searchable: true, analyzerName: "en.lucene" },
      {
        name: "tags",
        type: "Collection(Edm.String)",
        searchable: true,
        filterable: true,
        facetable: true,
      },
    ];

    const index: SearchIndex = { name: indexName, fields };
    await indexClient.createOrUpdateIndex(index);
    indexEnsured = true;
  })();

  return ensureInFlight;
}

function logJson(context: InvocationContext, event: string, data: Record<string, unknown>) {
  context.log(JSON.stringify({ event, ...data }));
}

// ─── main handler ─────────────────────────────────────────────────────────────

export async function evidenceBlobIngest(blob: Buffer, context: InvocationContext): Promise<void> {
  const env = getEnv();

  const blobName   = String(context.triggerMetadata?.name ?? "");
  const caseId     = String((context.triggerMetadata as any)?.caseId     ?? "");
  const evidenceId = String((context.triggerMetadata as any)?.evidenceId ?? "");

  logJson(context, "evidence_blob_ingest_start", { blobName, size: blob.length, caseId, evidenceId });

  if (!evidenceId) {
    context.warn("Missing evidenceId in blob trigger metadata. Check blob path binding.");
    return;
  }

  const { evidence: evidenceContainer, cases: casesContainer } = getContainers();

  // Load evidence record from Cosmos
  const q = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: evidenceId }],
  };
  const { resources } = await evidenceContainer.items.query<Evidence>(q).fetchAll();
  const item = resources[0];

  if (!item) {
    context.warn(`No evidence record found for evidenceId=${evidenceId}. Skipping.`);
    return;
  }

  // Backfill department if missing
  if (!item.department) {
    const qc = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: item.caseId }],
    };
    const caseRes = await casesContainer.items.query<Case>(qc).fetchAll();
    const theCase = caseRes.resources?.[0];
    if (theCase?.department) {
      item.department = theCase.department;
      await evidenceContainer.items.upsert(item);
    }
  }

  // Idempotency guard
  if (item.status === "COMPLETED" && item.processedAt) {
    logJson(context, "evidence_blob_ingest_idempotent_skip", { evidenceId, status: item.status });
    return;
  }

  // Transition → PROCESSING
  const processing: Evidence = {
    ...item,
    status: "PROCESSING",
    statusUpdatedAt: new Date().toISOString(),
    processingError: undefined,
  };
  await evidenceContainer.items.upsert(processing);

  try {
    let extractedText: string | undefined;
    let ocrLines: number | undefined;
    let ocrLanguage: string | undefined;

    const ft = processing.fileType;

    // ── image or PDF → Azure AI Vision OCR ───────────────────────────────────
    if (ft === "image" || ft === "pdf") {
      const ocr = await ocrRead(blob);
      extractedText = ocr.text;
      ocrLines      = ocr.lines.length;
      ocrLanguage   = ocr.language;
      logJson(context, "evidence_ocr_complete", { evidenceId, ocrLines });
    }

    // ── plain text → direct UTF-8 decode (Vision OCR cannot process text files)
    else if (ft === "text") {
      extractedText = blob.toString("utf-8");
      logJson(context, "evidence_text_decode", { evidenceId, chars: extractedText.length });
    }

    // ── audio → Azure AI Speech continuous recognition ────────────────────────
    else if (ft === "audio") {
      if (!env.SPEECH_KEY || !env.SPEECH_REGION) {
        context.warn(
          "SPEECH_KEY / SPEECH_REGION not configured. " +
          "Audio evidence stored without transcription. " +
          "See docs for Azure AI Speech setup."
        );
        // Still mark COMPLETED so the upload doesn't stay stuck in PROCESSING.
      } else {
        const result = await transcribeAudio(blob);
        extractedText = result.text;
        logJson(context, "evidence_speech_transcribed", { evidenceId, segments: result.segments, chars: extractedText.length });
      }
    }

    // ── DOCX → mammoth text extraction ───────────────────────────────────────
    else if (ft === "docx") {
      if (!mammoth) {
        context.warn(
          "mammoth npm package not found. " +
          "Run: npm install mammoth in the backend directory. " +
          "DOCX evidence stored without text extraction."
        );
      } else {
        const result = await mammoth.extractRawText({ buffer: blob });
        const text = result.value ?? "";
        extractedText = text;
        logJson(context, "evidence_docx_extracted", { evidenceId, chars: text.length });
      }
    }

    // ── video / office / file → no extraction; just mark completed ───────────
    else {
      logJson(context, "evidence_no_extraction", { evidenceId, fileType: ft });
    }

    // Transition → COMPLETED
    const completed: Evidence = {
      ...processing,
      extractedText,
      ocrLines,
      ocrLanguage,
      status: "COMPLETED",
      statusUpdatedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    await evidenceContainer.items.upsert(completed);

    // Push to Azure AI Search
    const { search, index } = getSearchClients();
    await ensureEvidenceIndex(index, env.SEARCH_INDEX_EVIDENCE);

    const doc: EvidenceSearchDoc = {
      id:            completed.id,
      caseId:        completed.caseId,
      department:    completed.department,
      fileName:      completed.fileName,
      fileType:      completed.fileType,
      uploadedAt:    completed.uploadedAt,
      uploadedBy:    completed.uploadedBy,
      status:        completed.status,
      description:   completed.description,
      tags:          completed.tags,
      extractedText: completed.extractedText,
    };

    await search.mergeOrUploadDocuments([doc]);
    logJson(context, "evidence_blob_ingest_success", { evidenceId, fileType: ft });

  } catch (e: any) {
    const statusCode = e?.statusCode ?? e?.status ?? e?.response?.status;
    const code       = e?.code;
    const name       = e?.name;
    const msg        = e?.message ? String(e.message) : "Unknown processing error";

    let respBody: string | undefined;
    try {
      if (e?.response?.bodyAsText)  respBody = String(e.response.bodyAsText);
      else if (e?.response?.body)   respBody = JSON.stringify(e.response.body);
    } catch {}

    const detailed = [
      msg,
      statusCode ? `status=${statusCode}` : undefined,
      code       ? `code=${code}`         : undefined,
      name       ? `name=${name}`         : undefined,
      respBody   ? `response=${respBody}` : undefined,
    ].filter(Boolean).join(" | ");

    context.error(detailed);

    const failed: Evidence = {
      ...processing,
      status: "FAILED",
      statusUpdatedAt: new Date().toISOString(),
      processingError: detailed,
    };
    await evidenceContainer.items.upsert(failed);
    logJson(context, "evidence_blob_ingest_failed", { evidenceId, error: detailed });

    throw e;
  }
}

app.storageBlob("EvidenceBlobIngest", {
  path: "%EVIDENCE_CONTAINER_RAW%/{caseId}/{evidenceId}/{fileName}",
  connection: "AzureWebJobsStorage",
  handler: evidenceBlobIngest,
});
