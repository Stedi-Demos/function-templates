import { mappingsClient } from "@stedi/integrations-sdk/clients";
import { MapDocumentCommand } from "@stedi/sdk-client-mappings";
import {
  GenerateEdiInputEvent,
  GenerateEdiInputEventSchema,
  TransactionGroupInput,
} from "./GenerateEdiInputEvent.js";
import { DocumentType } from "@smithy/types";
import { resolveToken } from "@stedi/sdk-token-provider-aws-identity";

declare const X12UsageIndicator: {
  readonly INFORMATION: "I";
  readonly PRODUCTION: "P";
  readonly TEST: "T";
};

type X12UsageIndicator =
  (typeof X12UsageIndicator)[keyof typeof X12UsageIndicator];
interface TransactionGroup {
  transactionSettingId: string;
  transactions: DocumentType[];
}

interface GenerateEdiInput {
  partnershipId: string;
  transactionGroups: TransactionGroup[];
  interchangeUsageIndicatorOverride?: X12UsageIndicator | string;
  filename?: string;
}

const BASE_CORE_API_URL = "https://core.us.stedi.com/2023-08-01";
export const handler = async (event: unknown) => {
  const generateEdiInputEvent = GenerateEdiInputEventSchema.parse(event);
  const generateEdiInput = await processInputEvent(generateEdiInputEvent);

  const generateEdiUrl = `${BASE_CORE_API_URL}/x12/partnerships/${generateEdiInput.partnershipId}/generate-edi`;
  const overrides = generateEdiInput.interchangeUsageIndicatorOverride
    ? {
        interchangeUsageIndicator:
          generateEdiInput.interchangeUsageIndicatorOverride,
      }
    : undefined;
  const generateEdiPayload = {
    filename: generateEdiInput.filename,
    overrides,
    transactionGroups: generateEdiInput.transactionGroups,
  };

  const { token } = await resolveToken();
  const fetchResponse = await fetch(generateEdiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(generateEdiPayload),
  });

  if (!fetchResponse.ok) {
    const responseSummary = {
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
      body: await fetchResponse.text(),
    };

    throw new Error(
      `Failed to generate EDI: ${JSON.stringify(responseSummary, null, 2)}`,
    );
  }

  const result = await fetchResponse.json();
  console.log(JSON.stringify(result, null, 2));
  return result;
};

const processInputEvent = async (
  event: GenerateEdiInputEvent,
): Promise<GenerateEdiInput> => {
  // prepare `transactionGroups` input for use in GenerateEdi call:
  // - if input includes a mappingId, invoke the mapping
  // - if the (optionally mapped) input is not an array, wrap it in an array
  const transactionGroups = await Promise.all(
    event.transactionGroups.map(processTransactionGroupInput),
  );

  return {
    interchangeUsageIndicatorOverride: event.interchangeUsageIndicatorOverride,
    filename: event.filename,
    partnershipId: event.partnershipId,
    transactionGroups,
  };
};

const processTransactionGroupInput = async (
  transactionGroupInput: TransactionGroupInput,
): Promise<TransactionGroup> => {
  const transactionsInput = transactionGroupInput.mappingId
    ? await invokeMapping(
        transactionGroupInput.mappingId,
        transactionGroupInput.transactions,
      )
    : transactionGroupInput.transactions;

  // if transactions input is not array, wrap it in one for call to GenerateEdi
  const transactions: DocumentType[] = Array.isArray(transactionsInput)
    ? transactionsInput
    : [transactionsInput];

  return {
    transactionSettingId: transactionGroupInput.transactionSettingId,
    transactions,
  };
};

const invokeMapping = async (
  mappingId: string,
  input: unknown,
): Promise<DocumentType> => {
  const mappingResult = await mappingsClient().send(
    new MapDocumentCommand({
      id: mappingId,
      content: input as DocumentType,
    }),
  );

  if (!mappingResult.content) {
    throw new Error(
      `map (id=${mappingId}) operation did not return any content`,
    );
  }

  return mappingResult.content;
};
