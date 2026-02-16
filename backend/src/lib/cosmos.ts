import { CosmosClient, Container, ItemDefinition } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { getEnv } from "../config/env";

const clientCache: Record<string, CosmosClient> = {};

function getClient(endpoint: string): CosmosClient {
  if (!clientCache[endpoint]) {
    // Cosmos JS SDK supports Entra auth via aadCredentials.
    clientCache[endpoint] = new CosmosClient({
      endpoint,
      aadCredentials: new DefaultAzureCredential(),
    });
  }
  return clientCache[endpoint];
}

export function getContainers() {
  const env = getEnv();
  const client = getClient(env.COSMOS_ACCOUNT_ENDPOINT);
  const db = client.database(env.COSMOS_DATABASE_NAME);
  return {
    users: db.container(env.COSMOS_CONTAINER_USERS),
    departments: db.container(env.COSMOS_CONTAINER_DEPARTMENTS),
    cases: db.container(env.COSMOS_CONTAINER_CASES),
    evidence: db.container(env.COSMOS_CONTAINER_EVIDENCE),
  } as const;
}

/**
 * Cosmos SDK v4 infers the partition key value from the document body.
 * This helper exists to keep call sites clean.
 */
export async function upsert<T extends ItemDefinition>(container: Container, item: T) {
  return container.items.upsert<T>(item);
}

/**
 * Read by id when you already know the partition key value.
 */
export async function readById<T extends ItemDefinition>(
    container: Container,
    id: string,
    partitionKeyValue: string
): Promise<T | null> {
  const { resource } = await container.item(id, partitionKeyValue).read<T>();
  return (resource ?? null) as T | null;
}
