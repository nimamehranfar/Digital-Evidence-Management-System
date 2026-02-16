import { getEnv } from "../config/env";
import { readSecret } from "./keyVault";

export type OcrResult = {
  text: string;
  lines: Array<{ text: string; bbox?: number[] }>; // bbox: 8 numbers
  language?: string;
};

async function getVisionKey(): Promise<string> {
  const env = getEnv();
  if (env.AI_VISION_KEY && env.AI_VISION_KEY.trim()) return env.AI_VISION_KEY;
  if (!env.KV_URI || !env.AI_VISION_KEY_SECRET_NAME) {
    throw new Error("AI_VISION_KEY not set and no KV_URI/AI_VISION_KEY_SECRET_NAME configured");
  }
  return readSecret(env.KV_URI, env.AI_VISION_KEY_SECRET_NAME);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Uses Azure Vision v3.2 Read API (GA).
// Docs: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/how-to/call-read-api
export async function ocrRead(buffer: Buffer): Promise<OcrResult> {
  const env = getEnv();
  const key = await getVisionKey();

  const endpoint = env.AI_VISION_ENDPOINT.replace(/\/$/, "");
  const analyzeUrl = `${endpoint}/vision/v3.2/read/analyze`;

  const analyzeResp = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });

  if (!analyzeResp.ok) {
    const t = await analyzeResp.text();
    throw new Error(`Vision Read analyze failed: ${analyzeResp.status} ${t}`);
  }

  const opLoc = analyzeResp.headers.get("operation-location") || analyzeResp.headers.get("Operation-Location");
  if (!opLoc) throw new Error("Vision Read API missing Operation-Location header");

  // Poll results
  for (let i = 0; i < 20; i++) {
    await sleep(750);
    const r = await fetch(opLoc, { headers: { "Ocp-Apim-Subscription-Key": key } });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Vision Read analyzeResults failed: ${r.status} ${t}`);
    }
    const j = (await r.json()) as any;
    const status = j.status;
    if (status === "succeeded") {
      const lines: Array<{ text: string; bbox?: number[] }> = [];
      const pages = j.analyzeResult?.readResults || [];
      for (const p of pages) {
        for (const ln of p.lines || []) {
          lines.push({ text: ln.text, bbox: ln.boundingBox });
        }
      }
      const text = lines.map((l) => l.text).join("\n");
      return { text, lines, language: pages?.[0]?.language };
    }
    if (status === "failed") {
      throw new Error(`Vision Read failed: ${JSON.stringify(j)}`);
    }
  }

  throw new Error("Vision Read timed out waiting for OCR results");
}
