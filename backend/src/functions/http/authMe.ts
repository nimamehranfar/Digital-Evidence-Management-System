import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { requireAuth } from "../../lib/auth";
import { safeHandler, handleOptions } from "./_middleware";
import { json } from "../../lib/http";

export async function authMe(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    return json(200, {
      id: auth.oid,
      tenantId: auth.tid,
      username: auth.upn,
      name: auth.name,
      roles: auth.roles,
    });
  });
}

app.http("AuthMe", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/me",
  handler: authMe,
});
