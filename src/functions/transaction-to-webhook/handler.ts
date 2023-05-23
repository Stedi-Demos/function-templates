import { type CoreTransactionProcessedEvent } from "@stedi/integrations-sdk";
import { bucketsClient } from "@stedi/integrations-sdk/clients";
import { GetObjectCommand } from "@stedi/sdk-client-buckets";

export const handler = async (event: CoreTransactionProcessedEvent) => {
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

  if (process.env.WEBHOOK_URL === undefined) {
    throw new Error("WEBHOOK_URL is not defined");
  }

  // send JSON to endpoint
  const result = await fetch(process.env.WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.AUTHORIZATION && {
        Authorization: process.env.AUTHORIZATION,
      }),
    },
    body,
  });

  return { ok: result.ok, statusCode: result.status };
};
