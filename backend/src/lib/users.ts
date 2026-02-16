import type { UserRecord } from "../models/types";
import { getContainers } from "./cosmos";

/**
 * Users container stores app-local metadata keyed by Entra user's object id (oid).
 * Partition key is /id (same value as id).
 */

export async function getUserRecord(oid: string): Promise<UserRecord | null> {
  const { users } = getContainers();
  try {
    const { resource } = await users.item(oid, oid).read<UserRecord>();
    return (resource ?? null) as UserRecord | null;
  } catch {
    return null;
  }
}

export async function upsertUserRecord(record: UserRecord): Promise<UserRecord> {
  const { users } = getContainers();
  await users.items.upsert(record);
  return record;
}
