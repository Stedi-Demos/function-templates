import { type CoreTransactionProcessedV2Event } from "@stedi/integrations-sdk";
import { mappingsClient, stashClient } from "@stedi/integrations-sdk/clients";
import {
  MapDocumentCommand,
  MapDocumentCommandOutput,
  MappingFailedException,
} from "@stedi/sdk-client-mappings";
import { DocumentType } from "@aws-sdk/types";
import { GetValueCommand } from "@stedi/sdk-client-stash";
import { resolveToken } from "@stedi/sdk-token-provider-aws-identity";
import {
  DestinationConfig,
  DestinationConfigSchema,
} from "./schema/DestinationConfig.js";

const STASH_KEYSPACE_NAME = "destinations-configuration";

export const getAuthToken = async () => await resolveToken();

export const handler = async (event: CoreTransactionProcessedV2Event) => {
  // get artifact url for the JSON version of EDI Transaction Set
  const outputArtifactUrl = extractOutputArtifactUrl(event);

  // get auth token to use when fetching output artifact
  const { token } = await getAuthToken();

  // fetch output artifact
  const outputArtifactFetchResult = await fetch(outputArtifactUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!outputArtifactFetchResult.ok) {
    const artifactResponseSummary = {
      statusText: outputArtifactFetchResult.statusText,
      statusCode: outputArtifactFetchResult.status,
      responseText: await outputArtifactFetchResult.text(),
    };

    throw new Error(
      `Failed to retrieve output artifact: ${JSON.stringify(
        artifactResponseSummary,
        null,
        2,
      )}`,
    );
  }

  // extract artifact JSON from fetch response body
  const body = await outputArtifactFetchResult.json();

  // load destination config for transaction set / partnership
  const destinationConfig = await loadDestinationConfig(
    event.detail.partnership.partnershipId,
    event.detail.x12.metadata.transaction.transactionSetIdentifier,
  );

  // prepare string payload to send to destination webhook (with mapping optionally applied)
  const webhookPayload =
    destinationConfig.mappingId === undefined
      ? JSON.stringify(body)
      : await mappingResultAsString(destinationConfig, body);

  // send stringified JSON to endpoint
  const destinationWebhookFetchResult = await fetch(
    destinationConfig.webhookUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(destinationConfig.authorization && {
          Authorization: destinationConfig.authorization,
        }),
      },
      body: webhookPayload,
    },
  );

  const destinationWebhookResponseSummary = {
    statusText: destinationWebhookFetchResult.statusText,
    statusCode: destinationWebhookFetchResult.status,
    responseText: await destinationWebhookFetchResult.text(),
  };

  if (!destinationWebhookFetchResult.ok) {
    throw new Error(
      `delivery to ${destinationConfig.webhookUrl} failed: ${JSON.stringify(
        destinationWebhookResponseSummary,
      )}`,
    );
  }

  return destinationWebhookResponseSummary;
};

const extractOutputArtifactUrl = (
  event: CoreTransactionProcessedV2Event,
): string => {
  const filteredOutputArtifacts = event.detail.artifacts.filter(
    (artifact) => artifact.usage === "output",
  );

  if (filteredOutputArtifacts.length !== 1) {
    throw new Error(
      `Expected exactly 1 output artifact in event, received ${filteredOutputArtifacts.length}`,
    );
  }

  const outputArtifactUrl = filteredOutputArtifacts[0]?.url;
  if (!outputArtifactUrl) {
    throw new Error("Unable to extract output artifact url from event");
  }

  return outputArtifactUrl;
};

const loadDestinationConfig = async (
  partnershipId: string,
  transactionSettingId: string,
): Promise<DestinationConfig> => {
  // first look for configuration specific to transaction set and partnership
  const partnershipScopedStashKey = `inbound|${transactionSettingId}|${partnershipId}`;
  const stashValueForPartnership = (
    await stashClient().send(
      new GetValueCommand({
        keyspaceName: STASH_KEYSPACE_NAME,
        key: partnershipScopedStashKey,
      }),
    )
  ).value;

  // if not found, look for configuration specific to transaction set
  const transactionSetScopedStashKey = `inbound|${transactionSettingId}`;
  const stashValue =
    stashValueForPartnership ||
    (
      await stashClient().send(
        new GetValueCommand({
          keyspaceName: STASH_KEYSPACE_NAME,
          key: transactionSetScopedStashKey,
        }),
      )
    ).value;

  if (!stashValue) {
    const destinationConfigHintMessage = `Add destination config to '${STASH_KEYSPACE_NAME}' stash keyspace using one of the following keys: '${partnershipScopedStashKey}' or '${transactionSetScopedStashKey}'`;
    throw new Error(
      `No matching stash configuration found for inbound transaction: partnershipId=${partnershipId}, transactionSet=${transactionSettingId}. ${destinationConfigHintMessage}`,
    );
  }

  const parseResult = DestinationConfigSchema.safeParse(stashValue);
  if (!parseResult.success) {
    const parseErrorDetails = `Configuration parsing errors: ${JSON.stringify(
      parseResult.error.issues,
    )}`;
    throw new Error(
      `Invalid stash configuration for inbound transaction: partnershipId=${partnershipId}, transactionSet=${transactionSettingId}. ${parseErrorDetails}`,
    );
  }

  return parseResult.data;
};

const mappingResultAsString = async (
  destinationConfig: DestinationConfig,
  input: unknown,
): Promise<string> => {
  // optionally wrap input in `transactionSets` array to conform to guideJson
  const mappingInput = destinationConfig.mapAsGuideJson
    ? { transactionSets: [input] }
    : input;

  const mappingResult = await invokeMapping(destinationConfig, mappingInput);

  if (!mappingResult.content) {
    throw new Error(
      `map (id=${destinationConfig.mappingId}) operation did not return any content`,
    );
  }

  return JSON.stringify(mappingResult.content);
};

const invokeMapping = async (
  destinationConfig: DestinationConfig,
  input: unknown,
): Promise<MapDocumentCommandOutput> => {
  try {
    return await mappingsClient().send(
      new MapDocumentCommand({
        id: destinationConfig.mappingId,
        content: input as DocumentType,
        validationMode: destinationConfig.mappingValidation,
      }),
    );
  } catch (e) {
    // If strict mode mapping fails validation, include validation errors in thrown error
    if (e instanceof MappingFailedException && e.code === "validation_failed") {
      const validationErrorDetails = `Validation errors: ${JSON.stringify(
        e.validationErrors,
      )}`;
      throw new Error(
        `Strict mapping validation failed: ${e.message} ${validationErrorDetails}`,
      );
    }

    throw e;
  }
};
