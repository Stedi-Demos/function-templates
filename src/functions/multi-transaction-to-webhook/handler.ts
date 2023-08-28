import z from "zod";
import { type CoreTransactionProcessedEvent } from "@stedi/integrations-sdk";
import { bucketsClient, mappingsClient, stashClient } from "@stedi/integrations-sdk/clients";
import { GetObjectCommand } from "@stedi/sdk-client-buckets";
import { MapDocumentCommand } from "@stedi/sdk-client-mappings";
import { DocumentType } from "@aws-sdk/types";
import { GetValueCommand } from "@stedi/sdk-client-stash";

const STASH_KEYSPACE_NAME= "destinations-configuration";

const DestinationConfigSchema = z.strictObject({
  webhookUrl: z.string(),
  mappingId: z.string().optional(),
  authorization: z.string().optional(),
});

type DestinationConfig = z.infer<typeof DestinationConfigSchema>;

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

  const bodyString = await getFile.body.transformToString();
  let body: unknown;
  try {
    body = JSON.parse(bodyString);
  } catch (e) {
    throw new Error("File is not a JSON file");
  }

  const destinationConfig = await loadDestinationConfig(
    event.detail.partnership.partnershipId,
    event.detail.transaction.transactionSetIdentifier
  );

  const webhookPayload =
    destinationConfig.mappingId === undefined
      ? bodyString
      : await invokeMapping(destinationConfig.mappingId, body);

  // send JSON to endpoint
  const result = await fetch(destinationConfig.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(destinationConfig.authorization && {
        Authorization: destinationConfig.authorization,
      }),
    },
    body: webhookPayload,
  });

  if (!result.ok) {
    throw new Error(
      `delivery to ${destinationConfig.webhookUrl} failed: ${result.statusText} (status code: ${result.status})`
    );
  }

  return { ok: result.ok, statusCode: result.status };
};

const loadDestinationConfig = async (
  partnershipId: string,
  transactionSettingId: string,
): Promise<DestinationConfig> => {
  // first look for configuration specific to transaction set and partnership
  const stashValueForPartnership = (await stashClient().send(new GetValueCommand({
    keyspaceName: STASH_KEYSPACE_NAME,
    key: `inbound|${transactionSettingId}|${partnershipId}`,
  }))).value;

  // if not found, look for configuration specific to transaction set
  const stashValue = stashValueForPartnership
    || (await stashClient().send(new GetValueCommand({
      keyspaceName: STASH_KEYSPACE_NAME,
      key: `inbound|${transactionSettingId}`,
    }))).value;

  const parsedValue = DestinationConfigSchema.safeParse(stashValue);
  if (!parsedValue.success) {
    throw new Error(
      `Invalid stash configuration for inbound transaction. partnershipId=${partnershipId}, transactionSet: ${transactionSettingId}`
    );
  }

  return parsedValue.data;
};

const invokeMapping = async (
  mappingId: string,
  input: unknown
): Promise<string> => {
  const mappingResult = await mappingsClient().send(
    new MapDocumentCommand({
      id: mappingId,
      content: input as DocumentType,
    })
  );

  if (!mappingResult.content) {
    throw new Error(
      `map (id=${mappingId}) operation did not return any content`
    );
  }

  return JSON.stringify(mappingResult.content);
};