import {
  mappingsClient,
  partnersClient,
} from "@stedi/integrations-sdk/clients";
import { MapDocumentCommand } from "@stedi/sdk-client-mappings";
import {
  GenerateEdiInputEvent,
  GenerateEdiInputEventSchema,
  TransactionGroupInput,
} from "./GenerateEdiInputEvent.js";
import {
  GenerateEdiCommand,
  GenerateEdiInput,
  TransactionGroup,
} from "@stedi/sdk-client-partners";
import { DocumentType } from "@aws-sdk/types";

export const handler = async (event: unknown) => {
  const generateEdiInputEvent = GenerateEdiInputEventSchema.parse(event);
  const generateEdiInput = await processInputEvent(generateEdiInputEvent);

  const result = await partnersClient().send(
    new GenerateEdiCommand(generateEdiInput),
  );

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
