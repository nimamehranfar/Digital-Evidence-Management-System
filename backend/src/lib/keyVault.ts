import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const clientCache: Record<string, SecretClient> = {};

export function getSecretClient(vaultUrl: string): SecretClient {
  if (!clientCache[vaultUrl]) {
    clientCache[vaultUrl] = new SecretClient(vaultUrl, new DefaultAzureCredential());
  }
  return clientCache[vaultUrl];
}

export async function readSecret(vaultUrl: string, name: string): Promise<string> {
  const c = getSecretClient(vaultUrl);
  const s = await c.getSecret(name);
  if (!s.value) throw new Error(`Key Vault secret has no value: ${name}`);
  return s.value;
}
