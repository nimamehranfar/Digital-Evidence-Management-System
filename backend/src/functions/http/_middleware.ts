import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { corsAllowedOrigins } from "../../config/env";
import { json, problem } from "../../lib/http";

export function withCors(req: HttpRequest, resp: HttpResponseInit): HttpResponseInit {
  const origins = corsAllowedOrigins();
  const origin = req.headers.get("origin") || "";
  const allowOrigin = origins.includes(origin) ? origin : origins.length ? origins[0] : "";

  const headers: Record<string, string> = {};

  // HttpResponseInit.headers can be a plain object, a Headers instance, or undefined.
  const h: any = resp.headers as any;
  if (h) {
    if (typeof h.entries === "function") {
      for (const [k, v] of h.entries()) headers[String(k)] = String(v);
    } else {
      for (const [k, v] of Object.entries(h)) headers[String(k)] = String(v);
    }
  }

  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
    headers["Vary"] = "Origin";
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS";
  }

  return { ...resp, headers };
}

export async function handleOptions(req: HttpRequest): Promise<HttpResponseInit> {
  return withCors(req, { status: 204, body: "" });
}

export async function safeHandler(
  req: HttpRequest,
  context: InvocationContext,
  handler: () => Promise<HttpResponseInit>
): Promise<HttpResponseInit> {
  try {
    const resp = await handler();
    return withCors(req, resp);
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Unknown error";
    context.error(msg);

    const status =
      msg.includes("Missing Authorization") ? 401 :
      msg.includes("Missing required role") ? 403 :
      msg.startsWith("Forbidden") ? 403 :
      500;
    return withCors(req, problem(status, "Request failed", msg));
  }
}

export function ok(req: HttpRequest, body: unknown): HttpResponseInit {
  return withCors(req, json(200, body));
}
