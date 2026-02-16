import type { Role } from "../lib/auth";

export type Department = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
};

export type CaseNote = {
  id: string;
  text: string;
  createdAt: string;
  createdBy?: string;
};

export type Case = {
  id: string;
  department: string; // partition key for Cosmos container cases
  title: string;
  description?: string;
  status: "OPEN" | "CLOSED" | "ON_HOLD";
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  notes?: CaseNote[];
};

export type EvidenceStatus = "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type Evidence = {
  id: string;
  caseId: string; // partition key for Cosmos container evidence
  department?: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  contentType?: string;

  blobPathRaw: string;
  blobUrlRaw: string;

  uploadedAt: string;
  uploadedBy?: string;

  description?: string;
  userTags?: string[];
  autoTags?: string[];
  tags?: string[];

  status: EvidenceStatus;
  statusUpdatedAt: string;

  // Processing outputs
  extractedText?: string;
  ocrLanguage?: string;
  ocrLines?: number;

  processingError?: string;
  processedAt?: string;
};

export type UserRecord = {
  id: string;
  displayName?: string;
  email?: string;
  roles?: Role[];
  department?: string;
  createdAt: string;
};
