import { HttpRequest, HttpResponseInit } from "@azure/functions";

export function json(status: number, body: unknown, headers?: Record<string, string>): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
}

export function problem(status: number, title: string, detail?: string): HttpResponseInit {
  return json(status, {
    error: {
      title,
      detail,
      status,
    },
  });
}

export async function readJson<T = unknown>(req: HttpRequest): Promise<T> {
  const text = await req.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function getQuery(req: HttpRequest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of req.query.entries()) out[k] = v;
  return out;
}
