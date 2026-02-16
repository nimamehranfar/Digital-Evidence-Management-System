import { app, InvocationContext } from "@azure/functions";
import { getEnv } from "../../config/env";
import { getContainers } from "../../lib/cosmos";
import type { Evidence } from "../../models/types";
import { ocrRead } from "../../lib/vision";
import { getSearchClients, EvidenceSearchDoc } from "../../lib/search";
import type { SearchIndexClient, SearchIndex, SearchField } from "@azure/search-documents";

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
      // fallthrough to create
      if (!msg.includes("404") && !msg.toLowerCase().includes("not found")) {
        throw e;
      }
    }

    // @azure/search-documents v12.x uses plain field descriptors (interfaces), not constructors.
    // Use explicit OData field types (Edm.*) for compatibility.
    const fields: SearchField[] = [
      { name: "id", type: "Edm.String", key: true, filterable: true, sortable: true },
      { name: "caseId", type: "Edm.String", filterable: true, sortable: true, facetable: true },
      { name: "department", type: "Edm.String", filterable: true, facetable: true },
      { name: "fileName", type: "Edm.String", searchable: true },
      { name: "fileType", type: "Edm.String", filterable: true, facetable: true },
      { name: "uploadedAt", type: "Edm.DateTimeOffset", filterable: true, sortable: true },
      { name: "uploadedBy", type: "Edm.String", filterable: true },
      { name: "status", type: "Edm.String", filterable: true, facetable: true },
      { name: "description", type: "Edm.String", searchable: true, analyzerName: "en.lucene" },
      { name: "extractedText", type: "Edm.String", searchable: true, analyzerName: "en.lucene" },
      {
        name: "tags",
        type: "Collection(Edm.String)",
        searchable: true,
        filterable: true,
        facetable: true,
      },
    ];

    const index: SearchIndex = {
      name: indexName,
      fields,
    };

    // createOrUpdateIndex avoids a race if another instance creates the index first.
    await indexClient.createOrUpdateIndex(index);
    indexEnsured = true;
  })();

  return ensureInFlight;
}

function logJson(context: InvocationContext, event: string, data: Record<string, unknown>) {
  context.log(JSON.stringify({ event, ...data }));
}

export async function evidenceBlobIngest(blob: Buffer, context: InvocationContext): Promise<void> {
  const env = getEnv();

  const blobName = String(context.triggerMetadata?.name || "");
  const caseId = String((context.triggerMetadata as any)?.caseId || "");
  const evidenceId = String((context.triggerMetadata as any)?.evidenceId || "");

  logJson(context, "evidence_blob_ingest_start", { blobName, size: blob.length, caseId, evidenceId });

  if (!evidenceId) {
    context.warn("Missing evidenceId in blob trigger metadata. Check blob path binding.");
    return;
  }

  const { evidence: evidenceContainer } = getContainers();

  // Load evidence record
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

  if (item.status === "COMPLETED" && item.processedAt) {
    logJson(context, "evidence_blob_ingest_idempotent_skip", { evidenceId, status: item.status });
    return;
  }

  // Mark PROCESSING
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

    if (processing.fileType === "pdf" || processing.fileType === "image" || processing.fileType === "text") {
      const ocr = await ocrRead(blob);
      extractedText = ocr.text;
      ocrLines = ocr.lines.length;
      ocrLanguage = ocr.language;
    }

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

    // Index to Cognitive Search (RBAC via managed identity)
    const { search, index } = getSearchClients();
    await ensureEvidenceIndex(index, env.SEARCH_INDEX_EVIDENCE);

    const doc: EvidenceSearchDoc = {
      id: completed.id,
      caseId: completed.caseId,
      department: completed.department,
      fileName: completed.fileName,
      fileType: completed.fileType,
      uploadedAt: completed.uploadedAt,
      uploadedBy: completed.uploadedBy,
      status: completed.status,
      description: completed.description,
      tags: completed.tags,
      extractedText: completed.extractedText,
    };

    await search.mergeOrUploadDocuments([doc]);

    logJson(context, "evidence_blob_ingest_success", { evidenceId, ocrLines });
  } catch (e: any) {
    const statusCode = e?.statusCode ?? e?.status ?? e?.response?.status;
    const code = e?.code;
    const name = e?.name;
    const msg = e?.message ? String(e.message) : "Unknown processing error";

    // Try to extract response body if present (Search SDK often has it)
    let respBody: string | undefined;
    try {
      if (e?.response?.bodyAsText) respBody = String(e.response.bodyAsText);
      else if (e?.response?.body) respBody = JSON.stringify(e.response.body);
    } catch {}

    const detailed = [
      msg,
      statusCode ? `status=${statusCode}` : undefined,
      code ? `code=${code}` : undefined,
      name ? `name=${name}` : undefined,
      respBody ? `response=${respBody}` : undefined,
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
