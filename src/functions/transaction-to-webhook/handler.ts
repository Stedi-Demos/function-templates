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

  if (getFile.Body === undefined)
    throw new Error("Failed to retrieve file from Bucket");

  const body = await getFile.Body.transformToString();

  // send JSON to endpoint
  const result = await fetch("https://example.com/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  return { ok: result.ok, statusCode: result.status };
};
