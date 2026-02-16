import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
import { requireAuth, requireRole } from "../../lib/auth";
import { safeHandler, handleOptions } from "./_middleware";
import { json, problem, readJson } from "../../lib/http";
import { getContainers } from "../../lib/cosmos";
import { UserCreateSchema, UserUpdateSchema } from "../../models/schemas";
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
      // This endpoint is optional. Recommended production workflow is Entra Portal invitation + App Role assignment.
      // Keep this endpoint for completeness, but it requires GRAPH_* settings and suitable Graph permissions.
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

export async function usersItem(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);
    requireRole(auth, ["admin"]);

    const oid = req.params.oid;
    if (!oid) return problem(400, "Missing user oid");

    if (req.method === "PATCH") {
      const patch = UserUpdateSchema.parse(await readJson(req));

      const { users } = getContainers();
      const { resource } = await users.item(oid, oid).read<UserRecord>();
      const existing = (resource ?? null) as UserRecord | null;

      const updated: UserRecord = {
        id: oid,
        displayName: patch.displayName ?? existing?.displayName,
        email: patch.email ?? existing?.email,
        department: patch.department ?? existing?.department,
        roles: existing?.roles,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };

      await users.items.upsert(updated);
      return json(200, updated);
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

app.http("UserByOid", {
  methods: ["PATCH", "OPTIONS"],
  authLevel: "anonymous",
  route: "users/{oid}",
  handler: usersItem,
});
