import { app, InvocationContext } from "@azure/functions";

export async function EvidenceBlobIngest(blob: Buffer, context: InvocationContext): Promise<void> {
    context.log(`Storage blob function processed blob "${context.triggerMetadata.name}" with size ${blob.length} bytes`);
}

app.storageBlob('EvidenceBlobIngest', {
    path: 'samples-workitems/{name}',
    connection: '',
    handler: EvidenceBlobIngest
});
