import { getEnv } from "../config/env";
import { getContainers } from "./cosmos";
import type { Case, Evidence } from "../models/types";
import { getContainerClient } from "./storage";
import { getSearchClients } from "./search";

/**
 * Cascade delete semantics (required in Part 3):
 * - Delete department deletes all cases in department and all evidence under those cases.
 * - Delete case deletes all evidence under that case.
 *
 * Notes:
 * - Cosmos containers use partition keys:
 *   - cases: /department
 *   - evidence: /caseId
 * - This implementation also attempts to delete blobs (raw + derived) and Search docs.
 *   Search/blob deletions are best-effort to keep cascade robust.
 */

async function deleteSearchDocs(evidenceIds: string[]) {
  if (!evidenceIds.length) return;
  try {
    const { search } = getSearchClients();
    await search.deleteDocuments(
      evidenceIds.map((id) => ({ id })) as any
    );
  } catch {
    // Best effort.
  }
}

async function deleteEvidenceBlobs(evidences: Evidence[]) {
  if (!evidences.length) return;
  const env = getEnv();

  const raw = getContainerClient(env.AZURE_STORAGE_ACCOUNT_NAME, env.EVIDENCE_CONTAINER_RAW);
  const derived = getContainerClient(env.AZURE_STORAGE_ACCOUNT_NAME, env.EVIDENCE_CONTAINER_DERIVED);

  for (const ev of evidences) {
    try {
      if (ev.blobPathRaw) await raw.deleteBlob(ev.blobPathRaw);
    } catch {}
    try {
      // Convention: derived outputs stored under same prefix {caseId}/{evidenceId}/...
      const prefix = `${ev.caseId}/${ev.id}/`;
      for await (const b of derived.listBlobsFlat({ prefix })) {
        try {
          await derived.deleteBlob(b.name);
        } catch {}
      }
    } catch {}
  }
}

export async function cascadeDeleteEvidence(evidence: Evidence): Promise<void> {
  const { evidence: evidenceContainer } = getContainers();

  await deleteEvidenceBlobs([evidence]);
  await deleteSearchDocs([evidence.id]);

  // Cosmos delete requires partition key = caseId
  await evidenceContainer.item(evidence.id, evidence.caseId).delete();
}

export async function cascadeDeleteCase(caseId: string, departmentId: string): Promise<void> {
  const { cases, evidence: evidenceContainer } = getContainers();

  // Gather evidence under case (partitioned by caseId)
  const qEv = {
    query: "SELECT * FROM c WHERE c.caseId = @c",
    parameters: [{ name: "@c", value: caseId }],
  };
  const evRes = await evidenceContainer.items.query<Evidence>(qEv, { partitionKey: caseId }).fetchAll();
  const evidences = evRes.resources ?? [];

  await deleteEvidenceBlobs(evidences);
    await deleteSearchDocs(evidences.map((ev: Evidence) => ev.id));

  // Delete evidence docs
  for (const ev of evidences) {
    try {
      await evidenceContainer.item(ev.id, ev.caseId).delete();
    } catch {}
  }

  // Delete the case
  await cases.item(caseId, departmentId).delete();
}

export async function cascadeDeleteDepartment(departmentId: string): Promise<{ deletedCases: number; deletedEvidence: number }>{
  const { cases } = getContainers();

  // Query cases by department (partitioned)
  const q = {
    query: "SELECT * FROM c WHERE c.department = @d",
    parameters: [{ name: "@d", value: departmentId }],
  };
  const { resources } = await cases.items.query<Case>(q, { partitionKey: departmentId }).fetchAll();
  const deptCases = resources ?? [];

  let deletedEvidence = 0;
  for (const c of deptCases) {
    // Count evidence before deletion
    const { evidence: evidenceContainer } = getContainers();
    const evRes = await evidenceContainer.items
      .query<Evidence>({ query: "SELECT VALUE COUNT(1) FROM c WHERE c.caseId=@c", parameters: [{ name: "@c", value: c.id }] }, { partitionKey: c.id })
      .fetchAll();
    const count = (evRes.resources?.[0] as any) ?? 0;
    deletedEvidence += Number(count) || 0;

    await cascadeDeleteCase(c.id, departmentId);
  }

  return { deletedCases: deptCases.length, deletedEvidence };
}
