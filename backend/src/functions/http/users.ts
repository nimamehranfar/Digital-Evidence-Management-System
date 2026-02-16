import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
import { requireAuth, requireRole } from "../../lib/auth";
import { safeHandler, handleOptions } from "./_middleware";
import { json, problem, readJson } from "../../lib/http";
import { getContainers } from "../../lib/cosmos";
import { UserCreateSchema } from "../../models/schemas";
import type { UserRecord } from "../../models/types";

function getGraphClient() {
  const tenantId = process.env.GRAPH_TENANT_ID || process.env.ENTRA_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return null;
  }

  const cred = new ClientSecretCredential(tenantId, clientId, clientSecret);
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const t = await cred.getToken("https://graph.microsoft.com/.default");
        if (!t?.token) throw new Error("Failed to acquire Graph token");
        return t.token;
      },
    },
  });
}

export async function usersCollection(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireRole(auth, ["admin"]);

    if (req.method === "GET") {
      const { users } = getContainers();
      const { resources } = await users.items.query<UserRecord>("SELECT * FROM c").fetchAll();
      return json(200, resources);
    }

    if (req.method === "POST") {
      const graph = getGraphClient();
      if (!graph) {
        return problem(
          501,
          "Graph user provisioning not configured",
          "Set GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, and GRAPH_TENANT_ID (or ENTRA_TENANT_ID) in Function App settings."
        );
      }

      const body = UserCreateSchema.parse(await readJson(req));

      const created = await graph.api("/users").post({
        accountEnabled: true,
        displayName: body.displayName,
        mailNickname: body.mailNickname,
        userPrincipalName: body.userPrincipalName,
        passwordProfile: {
          password: body.password,
          forceChangePasswordNextSignIn: body.forceChangePasswordNextSignIn ?? true,
        },
      });

      const record: UserRecord = {
        id: created.id,
        displayName: created.displayName,
        email: created.userPrincipalName,
        createdAt: new Date().toISOString(),
      };

      const { users } = getContainers();
      await users.items.upsert(record);

      return json(201, {
        id: created.id,
        displayName: created.displayName,
        userPrincipalName: created.userPrincipalName,
      });
    }

    return problem(405, "Method not allowed");
  });
}

app.http("Users", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "users",
  handler: usersCollection,
});
