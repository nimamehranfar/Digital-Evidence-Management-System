import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  SASProtocol,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const serviceCache: Record<string, BlobServiceClient> = {};

export function getBlobServiceClient(accountName: string): BlobServiceClient {
  if (!serviceCache[accountName]) {
    const url = `https://${accountName}.blob.core.windows.net`;
    serviceCache[accountName] = new BlobServiceClient(url, new DefaultAzureCredential());
  }
  return serviceCache[accountName];
}

export function getContainerClient(accountName: string, containerName: string): ContainerClient {
  return getBlobServiceClient(accountName).getContainerClient(containerName);
}

export type UploadInit = {
  blobUrl: string;
  blobPath: string;
  sasUrl: string;
  expiresOn: string;
};

export async function createUploadSas(
  accountName: string,
  containerName: string,
  blobPath: string,
  expiresInMinutes: number
): Promise<UploadInit> {
  const serviceClient = getBlobServiceClient(accountName);

  const now = new Date();
  const startsOn = new Date(now.getTime() - 2 * 60 * 1000);
  const expiresOn = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  // User delegation key requires Microsoft Entra auth.
  // Docs: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-create-user-delegation-sas-javascript
  const udk = await serviceClient.getUserDelegationKey(startsOn, expiresOn);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      protocol: SASProtocol.Https,
      permissions: BlobSASPermissions.parse("cw"), // create + write
      startsOn,
      expiresOn,
    },
    udk,
    accountName
  ).toString();

  const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}`;
  return {
    blobUrl,
    blobPath,
    sasUrl: `${blobUrl}?${sas}`,
    expiresOn: expiresOn.toISOString(),
  };
}

export type ReadInit = {
  blobUrl: string;
  blobPath: string;
  sasUrl: string;
  expiresOn: string;
};

export async function createReadSas(
  accountName: string,
  containerName: string,
  blobPath: string,
  expiresInMinutes: number
): Promise<ReadInit> {
  const serviceClient = getBlobServiceClient(accountName);

  const now = new Date();
  const startsOn = new Date(now.getTime() - 2 * 60 * 1000);
  const expiresOn = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  // User delegation key requires Microsoft Entra auth.
  const udk = await serviceClient.getUserDelegationKey(startsOn, expiresOn);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      protocol: SASProtocol.Https,
      permissions: BlobSASPermissions.parse("r"), // read
      startsOn,
      expiresOn,
    },
    udk,
    accountName
  ).toString();

  const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}`;
  return {
    blobUrl,
    blobPath,
    sasUrl: `${blobUrl}?${sas}`,
    expiresOn: expiresOn.toISOString(),
  };
}
