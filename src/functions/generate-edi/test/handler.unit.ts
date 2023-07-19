import test from "ava";
import { handler } from "../handler.js";
import { mockClient } from "@stedi/integrations-sdk/testing";
import { MapDocumentCommand, MappingsClient } from "@stedi/sdk-client-mappings";
import { GenerateEdiCommand, PartnersClient } from "@stedi/sdk-client-partners";
import { GenerateEdiInputEvent } from "../GenerateEdiInputEvent.js";
import { ZodError } from "zod";

const mappings = mockClient(MappingsClient);
const partners = mockClient(PartnersClient);

test.afterEach(() => {
  mappings.reset();
  partners.reset();
});

test.serial(
  "generates EDI without invoking mapping when no mapping id is provided",
  async (t) => {
    const inputEvent: GenerateEdiInputEvent = {
      partnershipId: "test-partnership",
      transactionGroups: [
        {
          transactionSettingId: "test-txn",
          transactions: [{ heading: { test: 1 } }],
        },
      ],
    };

    const expectedResponse = {
      edi: "test-edi-contents",
      artifactId: "test-output-file.edi",
      fileExecutionId: "test-file-execution",
    };

    partners
      .on(GenerateEdiCommand, {
        partnershipId: "test-partnership",
        transactionGroups: [
          {
            transactionSettingId: "test-txn",
            transactions: [{ heading: { test: 1 } }],
          },
        ],
      })
      .resolvesOnce(expectedResponse);

    const result = await handler(inputEvent);

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 0);

    const generateEdiCalls = partners.commandCalls(GenerateEdiCommand);
    t.assert(generateEdiCalls.length === 1);

    t.deepEqual(result, expectedResponse);
  },
);

test.serial(
  "generates EDI using custom filename and usage indicator when provided",
  async (t) => {
    const inputEvent: GenerateEdiInputEvent = {
      partnershipId: "test-partnership",
      filename: "test-file.edi",
      interchangeUsageIndicatorOverride: "T",
      transactionGroups: [
        {
          transactionSettingId: "test-txn",
          transactions: [{ heading: { test: 1 } }],
        },
      ],
    };

    const expectedResponse = {
      edi: "test-edi-contents",
      artifactId: "test-file.edi",
      fileExecutionId: "test-file-execution",
    };

    partners
    .on(GenerateEdiCommand, {
      partnershipId: "test-partnership",
      filename: "test-file.edi",
      interchangeUsageIndicatorOverride: "T",
      transactionGroups: [
        {
          transactionSettingId: "test-txn",
          transactions: [{ heading: { test: 1 } }],
        },
      ],
    })
    .resolvesOnce(expectedResponse);

    const result = await handler(inputEvent);

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 0);

    const generateEdiCalls = partners.commandCalls(GenerateEdiCommand);
    t.assert(generateEdiCalls.length === 1);

    t.deepEqual(result, expectedResponse);
  },
);

test.serial("generates EDI using mapped data when mapping id is provided", async (t) => {
  const inputEvent: GenerateEdiInputEvent = {
    partnershipId: "test-partnership",
    transactionGroups: [
      {
        transactionSettingId: "test-txn",
        mappingId: "test-mapping",
        transactions: { input: "to-be-mapped" },
      },
    ],
  };

  const expectedResponse = {
    edi: "test-edi-contents",
    artifactId: "test-output-file.edi",
    fileExecutionId: "test-file-execution",
  };

  mappings
  .on(MapDocumentCommand, {
    id: "test-mapping",
  })
  .resolvesOnce({
    content: [
      {
        heading: { test: 1 },
      },
    ],
  });

  partners
  .on(GenerateEdiCommand, {
    partnershipId: "test-partnership",
    transactionGroups: [
      {
        transactionSettingId: "test-txn",
        transactions: [{ heading: { test: 1 } }],
      },
    ],
  })
  .resolvesOnce(expectedResponse);

  const result = await handler(inputEvent);

  const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
  t.assert(invokeMappingCalls.length === 1);

  const generateEdiCalls = partners.commandCalls(GenerateEdiCommand);
  t.assert(generateEdiCalls.length === 1);

  t.deepEqual(result, expectedResponse);
});

test.serial("wraps mapped output in array if necessary", async (t) => {
  const inputEvent: GenerateEdiInputEvent = {
    partnershipId: "test-partnership",
    transactionGroups: [
      {
        transactionSettingId: "test-txn",
        mappingId: "test-mapping",
        transactions: { input: "to-be-mapped" },
      },
    ],
  };

  const expectedResponse = {
    edi: "test-edi-contents",
    artifactId: "test-output-file.edi",
    fileExecutionId: "test-file-execution",
  };

  mappings
    .on(MapDocumentCommand, {
      id: "test-mapping",
    })
    .resolvesOnce({
      content: {
        heading: { test: 1 },
      },
    });

  partners
    .on(GenerateEdiCommand, {
      partnershipId: "test-partnership",
      transactionGroups: [
        {
          transactionSettingId: "test-txn",
          transactions: [{ heading: { test: 1 } }],
        },
      ],
    })
    .resolvesOnce(expectedResponse);

  const result = await handler(inputEvent);

  const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
  t.assert(invokeMappingCalls.length === 1);

  const generateEdiCalls = partners.commandCalls(GenerateEdiCommand);
  t.assert(generateEdiCalls.length === 1);

  t.deepEqual(result, expectedResponse);
});

test.serial("throws zod error if input transaction groups is empty", async (t) => {
  const inputEvent: GenerateEdiInputEvent = {
    partnershipId: "test-partnership",
    transactionGroups: [],
  };

  const error = await t.throwsAsync(handler(inputEvent));
  const issues = (error as ZodError).issues;
  t.assert(
    issues.some(
      (issue) =>
        issue.message === "Array must contain at least 1 element(s)" &&
        issue.path.some((path) => path === "transactionGroups"),
    ),
  );

  const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
  t.assert(invokeMappingCalls.length === 0);

  const generateEdiCalls = partners.commandCalls(GenerateEdiCommand);
  t.assert(generateEdiCalls.length === 0);
});
