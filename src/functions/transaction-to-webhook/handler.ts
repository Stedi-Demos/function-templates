import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { type TransactionProcessed } from "@stedi/integrations-sdk";

export const handler = async (event: TransactionProcessed) => {
  // get bucket reference for the JSON version of EDI Transaction Set
  const {
    detail: { output },
  } = event;

  // retrieve the file contents using bucket reference
  const client = new S3Client({});
  const getFile = await client.send(
    new GetObjectCommand({ Bucket: output.bucketName, Key: output.key })
  );

  if (getFile.Body === undefined) {
    throw new Error("Failed to retrieve file from Bucket");
  }

  const body = await getFile.Body.transformToString();

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
