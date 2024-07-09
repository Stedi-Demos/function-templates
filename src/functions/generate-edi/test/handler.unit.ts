import test from "ava";
import { handler } from "../handler.js";
import { mockClient, testJwt } from "@stedi/integrations-sdk/testing";
import { MapDocumentCommand, MappingsClient } from "@stedi/sdk-client-mappings";
import { GenerateEdiInputEvent } from "../GenerateEdiInputEvent.js";
import { ZodError } from "zod";
import { mock } from "node:test";
import { GetTokenForIAMCommand, TokensClient } from "@stedi/sdk-client-tokens";

const mappings = mockClient(MappingsClient);
const tokens = mockClient(TokensClient);
tokens.on(GetTokenForIAMCommand, {}).resolves({
  id_token: testJwt,
});

test.afterEach.always(() => {
  mock.reset();
  mappings.reset();
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

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        t.deepEqual(init.headers, {
          Authorization: `Bearer ${testJwt}`,
          "Content-Type": "application/json",
        });

        return Promise.resolve({
          ok: true,
          statusText: "created",
          status: 201,
          text: async () => Promise.resolve("unused"),
          json: async () => Promise.resolve(expectedResponse),
        } as Response);
      },
    );

    const result = await handler(inputEvent);

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 0);

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: {
            calls: { arguments: string | object[] | { method: string }[] }[];
          };
        }
      ).mock;
    t.assert(calls.length === 1, "one fetch call is made");
    t.assert(
      calls[0]?.arguments?.[0] ===
        `https://core.us.stedi.com/2023-08-01/x12/partnerships/${inputEvent.partnershipId}/generate-edi`,
      "generate edi url includes partnership id",
    );
    t.assert(
      (calls[0]?.arguments?.[1] as any)?.body ===
        JSON.stringify({ transactionGroups: inputEvent.transactionGroups }),
      "generate-edi request includes expected guide JSON input",
    );

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

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        t.deepEqual(init.headers, {
          Authorization: `Bearer ${testJwt}`,
          "Content-Type": "application/json",
        });

        return Promise.resolve({
          ok: true,
          statusText: "created",
          status: 201,
          text: async () => Promise.resolve("unused"),
          json: async () => Promise.resolve(expectedResponse),
        } as Response);
      },
    );

    const result = await handler(inputEvent);

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 0);

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: {
            calls: { arguments: string | object[] | { method: string }[] }[];
          };
        }
      ).mock;
    t.assert(calls.length === 1, "one fetch call is made");
    t.assert(
      calls[0]?.arguments?.[0] ===
        `https://core.us.stedi.com/2023-08-01/x12/partnerships/${inputEvent.partnershipId}/generate-edi`,
      "generate edi url includes partnership id",
    );
    t.assert(
      (calls[0]?.arguments?.[1] as any)?.body ===
        JSON.stringify({
          filename: inputEvent.filename,
          overrides: {
            interchangeUsageIndicator:
              inputEvent.interchangeUsageIndicatorOverride,
          },
          transactionGroups: inputEvent.transactionGroups,
        }),
      "generate-edi request includes expected guide JSON input",
    );

    t.deepEqual(result, expectedResponse);
  },
);

test.serial(
  "generates EDI using mapped data when mapping id is provided",
  async (t) => {
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

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        t.deepEqual(init.headers, {
          Authorization: `Bearer ${testJwt}`,
          "Content-Type": "application/json",
        });

        return Promise.resolve({
          ok: true,
          statusText: "created",
          status: 201,
          text: async () => Promise.resolve("unused"),
          json: async () => Promise.resolve(expectedResponse),
        } as Response);
      },
    );

    const result = await handler(inputEvent);

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 1);

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: {
            calls: { arguments: string | object[] | { method: string }[] }[];
          };
        }
      ).mock;
    t.assert(calls.length === 1, "one fetch call is made");
    t.assert(
      calls[0]?.arguments?.[0] ===
        `https://core.us.stedi.com/2023-08-01/x12/partnerships/${inputEvent.partnershipId}/generate-edi`,
      "generate edi url includes partnership id",
    );
    t.assert(
      (calls[0]?.arguments?.[1] as any)?.body ===
        JSON.stringify({
          transactionGroups: [
            {
              transactionSettingId: "test-txn",
              transactions: [
                {
                  heading: { test: 1 },
                },
              ],
            },
          ],
        }),
      "generate-edi request includes expected guide JSON input",
    );

    t.deepEqual(result, expectedResponse);
  },
);

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

  mock.method(
    global,
    // @ts-expect-error fetch is not yet present in @types/node
    "fetch",
    (input: RequestInfo, init: RequestInit): Promise<Response> => {
      t.deepEqual(init.headers, {
        Authorization: `Bearer ${testJwt}`,
        "Content-Type": "application/json",
      });

      return Promise.resolve({
        ok: true,
        statusText: "created",
        status: 201,
        text: async () => Promise.resolve("unused"),
        json: async () => Promise.resolve(expectedResponse),
      } as Response);
    },
  );

  const result = await handler(inputEvent);

  const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
  t.assert(invokeMappingCalls.length === 1);

  const { calls } =
    (
      // @ts-expect-error fetch is not yet present in @types/node
      fetch as {
        mock: {
          calls: { arguments: string | object[] | { method: string }[] }[];
        };
      }
    ).mock;
  t.assert(calls.length === 1, "one fetch call is made");
  t.assert(
    calls[0]?.arguments?.[0] ===
    `https://core.us.stedi.com/2023-08-01/x12/partnerships/${inputEvent.partnershipId}/generate-edi`,
    "generate edi url includes partnership id",
  );
  t.assert(
    (calls[0]?.arguments?.[1] as any)?.body ===
    JSON.stringify({
      transactionGroups: [
        {
          transactionSettingId: "test-txn",
          transactions: [
            {
              heading: { test: 1 },
            },
          ],
        },
      ],
    }),
    "generate-edi request includes expected guide JSON input",
  );

  t.deepEqual(result, expectedResponse);
});

test.serial(
  "throws zod error if input transaction groups is empty",
  async (t) => {
    const inputEvent: GenerateEdiInputEvent = {
      partnershipId: "test-partnership",
      transactionGroups: [],
    };

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        t.deepEqual(init.headers, {
          Authorization: `Bearer ${testJwt}`,
          "Content-Type": "application/json",
        });

        return Promise.resolve({
          ok: true,
          statusText: "created",
          status: 201,
          text: async () => Promise.resolve("unused"),
          json: async () => Promise.resolve({}),
        } as Response);
      },
    );

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

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: {
            calls: { arguments: string | object[] | { method: string }[] }[];
          };
        }
      ).mock;
    t.assert(calls.length === 0, "no fetch calls are made");
  },
);
