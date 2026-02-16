import { z } from "zod";

const EnvSchema = z.object({
  AZURE_STORAGE_ACCOUNT_NAME: z.string().min(1),
  EVIDENCE_CONTAINER_RAW: z.string().min(1),
  EVIDENCE_CONTAINER_DERIVED: z.string().min(1),

  COSMOS_ACCOUNT_ENDPOINT: z.string().url(),
  COSMOS_DATABASE_NAME: z.string().min(1),
  COSMOS_CONTAINER_USERS: z.string().min(1),
  COSMOS_CONTAINER_DEPARTMENTS: z.string().min(1),
  COSMOS_CONTAINER_CASES: z.string().min(1),
  COSMOS_CONTAINER_EVIDENCE: z.string().min(1),

  SEARCH_ENDPOINT: z.string().url(),
  SEARCH_INDEX_EVIDENCE: z.string().min(1),

  AI_VISION_ENDPOINT: z.string().url(),
  AI_VISION_KEY: z.string().optional(),
  AI_VISION_KEY_SECRET_NAME: z.string().optional(),

  KV_URI: z.string().url().optional(),

  ENTRA_TENANT_ID: z.string().min(1),
  ENTRA_API_AUDIENCE: z.string().min(1),

  // Comma-separated list
  CORS_ALLOWED_ORIGINS: z.string().optional(),

  // Optional Graph provisioning (admin-only)
  GRAPH_CLIENT_ID: z.string().optional(),
  GRAPH_CLIENT_SECRET: z.string().optional(),
  GRAPH_TENANT_ID: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Missing/invalid environment variables: ${msg}`);
  }
  cached = parsed.data;
  return cached;
}

export function corsAllowedOrigins(): string[] {
  const { CORS_ALLOWED_ORIGINS } = getEnv();
  if (!CORS_ALLOWED_ORIGINS) return [];
  return CORS_ALLOWED_ORIGINS.split(",").map((s: string) => s.trim()).filter(Boolean);
}
