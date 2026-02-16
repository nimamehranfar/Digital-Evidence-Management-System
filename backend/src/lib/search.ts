import { DefaultAzureCredential } from "@azure/identity";
import { SearchClient, SearchIndexClient } from "@azure/search-documents";
import { getEnv } from "../config/env";

export type EvidenceSearchDoc = {
  id: string;
  caseId: string;
  department?: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  uploadedBy?: string;
  status: string;
  description?: string;
  tags?: string[];
  extractedText?: string;
};

let cached: {
  search: SearchClient<EvidenceSearchDoc>;
  index: SearchIndexClient;
} | null = null;

export function getSearchClients() {
  if (cached) return cached;
  const env = getEnv();
  const cred = new DefaultAzureCredential();
  cached = {
    search: new SearchClient<EvidenceSearchDoc>(env.SEARCH_ENDPOINT, env.SEARCH_INDEX_EVIDENCE, cred),
    index: new SearchIndexClient(env.SEARCH_ENDPOINT, cred),
  };
  return cached;
}
