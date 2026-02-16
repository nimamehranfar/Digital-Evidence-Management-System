import { z } from "zod";

export const DepartmentCreateSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const DepartmentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const CaseCreateSchema = z.object({
  id: z.string().min(1).optional(),
  department: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED", "ON_HOLD"]).optional(),
});

export const CaseUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED", "ON_HOLD"]).optional(),
});

export const CaseNoteCreateSchema = z.object({
  text: z.string().min(1),
});

export const EvidenceUploadInitSchema = z.object({
  caseId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1).optional(),
  fileSize: z.number().int().positive().optional(),
});

export const EvidenceUploadConfirmSchema = z.object({
  evidenceId: z.string().min(1),
  caseId: z.string().min(1),
  description: z.string().optional(),
  userTags: z.array(z.string().min(1)).optional(),
});

export const EvidenceSearchSchema = z.object({
  q: z.string().optional(),
  caseId: z.string().optional(),
  status: z.string().optional(),
  tag: z.string().optional(),
  top: z.string().optional(),
  skip: z.string().optional(),
});

export const UserCreateSchema = z.object({
  displayName: z.string().min(1),
  mailNickname: z.string().min(1),
  userPrincipalName: z.string().min(1),
  password: z.string().min(8),
  forceChangePasswordNextSignIn: z.boolean().optional(),
});

export const UserUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
});
