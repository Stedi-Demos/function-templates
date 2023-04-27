import s3 from "@aws-sdk/client-s3";
import { TransactionProcessed } from "../../shared/schemas/event-transaction-processed.js";

export const handler = async (event: TransactionProcessed) => {
  // get bucket reference for the JSON version of EDI Transaction Set
  const {
    detail: { output },
  } = event;

  // retrieve the file contents using bucket reference
  const client = new s3.S3Client({});
  const getFile = await client.send(
    new s3.GetObjectCommand({ Bucket: output.bucketName, Key: output.key })
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
