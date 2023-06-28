import { type CoreTransactionProcessedEvent } from "@stedi/integrations-sdk";
import { bucketsClient, mappingsClient } from "@stedi/integrations-sdk/clients";
import { GetObjectCommand } from "@stedi/sdk-client-buckets";
import { MapDocumentCommand } from "@stedi/sdk-client-mappings";

export const handler = async (event: CoreTransactionProcessedEvent) => {
  // fail fast if WEBHOOK_URL env var is not defined
  if (process.env.WEBHOOK_URL === undefined) {
    throw new Error("WEBHOOK_URL is not defined");
  }

  // get bucket reference for the JSON version of EDI Transaction Set
  const {
    detail: { output },
  } = event;

  // retrieve the file contents using bucket reference
  const client = bucketsClient();
  const getFile = await client.send(
    new GetObjectCommand({ bucketName: output.bucketName, key: output.key })
  );

  if (getFile.body === undefined) {
    throw new Error("Failed to retrieve file from Bucket");
  }

  const body = await getFile.body.transformToString();

  const webhookPayload =
    process.env.MAPPING_ID === undefined
      ? body
      : await invokeMapping(process.env.MAPPING_ID, body);

  // send JSON to endpoint
  const result = await fetch(process.env.WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.AUTHORIZATION && {
        Authorization: process.env.AUTHORIZATION,
      }),
    },
    body: webhookPayload,
  });

  return { ok: result.ok, statusCode: result.status };
};

const invokeMapping = async (
  mappingId: string,
  input: string
): Promise<string> => {
  const mappingResult = await mappingsClient().send(
    new MapDocumentCommand({
      id: mappingId,
      content: input,
    })
  );

  if (!mappingResult.content) {
    throw new Error(
      `map (id=${mappingId}) operation did not return any content`
    );
  }

  return JSON.stringify(mappingResult.content);
};
