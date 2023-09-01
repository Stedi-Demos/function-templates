import test from "ava";
import { handler } from "../handler.js";
import {
  mockClient,
  samplePartnershipId,
  sampleTransactionProcessedV2Event,
  sampleTransactionSetIdentifier,
  sampleOutputArtifactUrl,
  testJwt,
} from "@stedi/integrations-sdk/testing";
import { mock } from "node:test";
import {
  MapDocumentCommand,
  MappingFailedException,
  MappingsClient,
} from "@stedi/sdk-client-mappings";
import { GetTokenForIAMCommand, TokensClient } from "@stedi/sdk-client-tokens";
import { GetValueCommand, StashClient } from "@stedi/sdk-client-stash";

const event = sampleTransactionProcessedV2Event();

const sampleEDIAsJSON = { heading: { test: 1 } };
const mappings = mockClient(MappingsClient);
const stash = mockClient(StashClient);
const tokens = mockClient(TokensClient);

test.afterEach.always(() => {
  mappings.reset();
  mock.reset();
  stash.reset();
  tokens.reset();
});

const authHeaderIfEnvVarSet = () =>
  process.env.AUTHORIZATION ? { Authorization: process.env.AUTHORIZATION } : {};

test.serial("delivers EDI as guide JSON to webhook url", async (t) => {
  tokens.on(GetTokenForIAMCommand, {}).resolvesOnce({
    id_token: testJwt,
  });

  stash
    .on(GetValueCommand, {
      keyspaceName: "destinations-configuration",
      key: `inbound|${sampleTransactionSetIdentifier}|${samplePartnershipId}`,
    })
    .resolvesOnce({
      value: {
        webhookUrl: "test-webhook",
      },
    });

  mock.method(
    global,
    // @ts-expect-error fetch is not yet present in @types/node
    "fetch",
    (input: RequestInfo, init: RequestInit): Promise<Response> => {
      if (init.method === "GET") {
        t.assert(input === sampleOutputArtifactUrl);
        t.deepEqual(init.headers, {
          Authorization: `Bearer ${testJwt}`,
        });

        return Promise.resolve({
          ok: true,
          text: async () => Promise.resolve("unused"),
          json: async () => Promise.resolve(sampleEDIAsJSON),
        } as Response);
      }

      t.assert(
        init.body === JSON.stringify(sampleEDIAsJSON),
        "JSON payload was delivered to webhook",
      );
      t.deepEqual(init.headers, {
        "Content-Type": "application/json",
        ...authHeaderIfEnvVarSet(),
      });
      return Promise.resolve({
        ok: true,
        statusText: "created",
        status: 201,
        text: async () => Promise.resolve("result"),
      } as Response);
    },
  );

  const result = await handler(event);

  const { calls } =
  (
    // @ts-expect-error fetch is not yet present in @types/node
    fetch as {
      mock: { calls: { arguments: string | { method: string }[] }[] };
    }
  ).mock;
  t.assert(
    calls.length === 2,
    "two fetch calls are made (one to retrieve artifact, one to post JSON payload to webhook)",
  );
  t.assert(
    calls[0]?.arguments?.[0] === sampleOutputArtifactUrl,
    "first fetch call retrieves output artifact",
  );
  t.assert(
    calls[1]?.arguments?.[0] === "test-webhook",
    "second fetch call posts to webhook",
  );

  const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
  t.assert(invokeMappingCalls.length === 0);

  t.deepEqual(result, {
    statusText: "created",
    statusCode: 201,
    responseText: "result",
  });
});

test.serial(
  "delivers EDI as transformed JSON to webhook url when mappingId is configured",
  async (t) => {
    tokens.on(GetTokenForIAMCommand, {}).resolvesOnce({
      id_token: testJwt,
    });

    stash
      .on(GetValueCommand, {
        keyspaceName: "destinations-configuration",
        key: `inbound|${sampleTransactionSetIdentifier}|${samplePartnershipId}`,
      })
      .resolvesOnce({
        value: {
          webhookUrl: "test-webhook",
          mappingId: "test-mapping",
          mapAsGuideJson: false,
        },
      });

    const customMappingOutput = {
      custom: "payload",
    };

    mappings
      .on(MapDocumentCommand, {
        id: "test-mapping",
        content: sampleEDIAsJSON,
      })
      .resolvesOnce({
        content: customMappingOutput,
      });

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        if (init.method === "GET") {
          t.assert(input === sampleOutputArtifactUrl);
          t.deepEqual(init.headers, {
            Authorization: `Bearer ${testJwt}`,
          });

          return Promise.resolve({
            ok: true,
            text: async () => Promise.resolve("unused"),
            json: async () => Promise.resolve(sampleEDIAsJSON),
          } as Response);
        }

        t.assert(
          init.body === JSON.stringify(customMappingOutput),
          "JSON payload was delivered to webhook",
        );
        t.deepEqual(init.headers, {
          "Content-Type": "application/json",
          ...authHeaderIfEnvVarSet(),
        });
        return Promise.resolve({
          ok: true,
          statusText: "created",
          status: 201,
          text: async () => Promise.resolve("result"),
        } as Response);
      },
    );

    const result = await handler(event);

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: { calls: { arguments: string | { method: string }[] }[] };
        }
      ).mock;
    t.assert(
      calls.length === 2,
      "two fetch calls are made (one to retrieve artifact, one to post JSON payload to webhook)",
    );
    t.assert(
      calls[0]?.arguments?.[0] === sampleOutputArtifactUrl,
      "first fetch call retrieves output artifact",
    );
    t.assert(
      calls[1]?.arguments?.[0] === "test-webhook",
      "second fetch call posts to webhook",
    );

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 1);

    t.deepEqual(result, {
      statusText: "created",
      statusCode: 201,
      responseText: "result",
    });
  },
);

test.serial(
  "sends guide JSON output wrapped in `transactionSets` array as input to mapping by default",
  async (t) => {
    tokens.on(GetTokenForIAMCommand, {}).resolvesOnce({
      id_token: testJwt,
    });

    stash
      .on(GetValueCommand, {
        keyspaceName: "destinations-configuration",
        key: `inbound|${sampleTransactionSetIdentifier}|${samplePartnershipId}`,
      })
      .resolvesOnce({
        value: {
          webhookUrl: "test-webhook",
          mappingId: "test-mapping",
        },
      });

    const customMappingOutput = {
      custom: "payload",
    };

    mappings
      .on(MapDocumentCommand, {
        id: "test-mapping",
        content: {
          transactionSets: [sampleEDIAsJSON],
        },
      })
      .resolvesOnce({
        content: customMappingOutput,
      });

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        if (init.method === "GET") {
          t.assert(input === sampleOutputArtifactUrl);
          t.deepEqual(init.headers, {
            Authorization: `Bearer ${testJwt}`,
          });

          return Promise.resolve({
            ok: true,
            text: async () => Promise.resolve("unused"),
            json: async () => Promise.resolve(sampleEDIAsJSON),
          } as Response);
        }

        t.assert(
          init.body === JSON.stringify(customMappingOutput),
          "JSON payload was delivered to webhook",
        );
        t.deepEqual(init.headers, {
          "Content-Type": "application/json",
          ...authHeaderIfEnvVarSet(),
        });
        return Promise.resolve({
          ok: true,
          statusText: "created",
          status: 201,
          text: async () => Promise.resolve("result"),
        } as Response);
      },
    );

    const result = await handler(event);

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: { calls: { arguments: string | { method: string }[] }[] };
        }
      ).mock;
    t.assert(
      calls.length === 2,
      "two fetch calls are made (one to retrieve artifact, one to post JSON payload to webhook)",
    );
    t.assert(
      calls[0]?.arguments?.[0] === sampleOutputArtifactUrl,
      "first fetch call retrieves output artifact",
    );
    t.assert(
      calls[1]?.arguments?.[0] === "test-webhook",
      "second fetch call posts to webhook",
    );

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 1);

    t.deepEqual(result, {
      statusText: "created",
      statusCode: 201,
      responseText: "result",
    });
  },
);

test.serial(
  "invokes mapping with strict validation when `mappingValidation` is `strict`",
  async (t) => {
    tokens.on(GetTokenForIAMCommand, {}).resolvesOnce({
      id_token: testJwt,
    });

    stash
      .on(GetValueCommand, {
        keyspaceName: "destinations-configuration",
        key: `inbound|${sampleTransactionSetIdentifier}|${samplePartnershipId}`,
      })
      .resolvesOnce({
        value: {
          webhookUrl: "test-webhook",
          mappingId: "test-mapping",
          mappingValidation: "strict",
        },
      });

    const customMappingOutput = {
      custom: "payload",
    };

    mappings
      .on(MapDocumentCommand, {
        id: "test-mapping",
        content: {
          transactionSets: [sampleEDIAsJSON],
        },
        validationMode: "strict",
      })
      .resolvesOnce({
        content: customMappingOutput,
      });

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        if (init.method === "GET") {
          t.assert(input === sampleOutputArtifactUrl);
          t.deepEqual(init.headers, {
            Authorization: `Bearer ${testJwt}`,
          });

          return Promise.resolve({
            ok: true,
            text: async () => Promise.resolve("unused"),
            json: async () => Promise.resolve(sampleEDIAsJSON),
          } as Response);
        }

        t.assert(
          init.body === JSON.stringify(customMappingOutput),
          "JSON payload was delivered to webhook",
        );
        t.deepEqual(init.headers, {
          "Content-Type": "application/json",
          ...authHeaderIfEnvVarSet(),
        });
        return Promise.resolve({
          ok: true,
          statusText: "created",
          status: 201,
          text: async () => Promise.resolve("result"),
        } as Response);
      },
    );

    const result = await handler(event);

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: { calls: { arguments: string | { method: string }[] }[] };
        }
      ).mock;
    t.assert(
      calls.length === 2,
      "two fetch calls are made (one to retrieve artifact, one to post JSON payload to webhook)",
    );
    t.assert(
      calls[0]?.arguments?.[0] === sampleOutputArtifactUrl,
      "first fetch call retrieves output artifact",
    );
    t.assert(
      calls[1]?.arguments?.[0] === "test-webhook",
      "second fetch call posts to webhook",
    );

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 1);

    t.deepEqual(result, {
      statusText: "created",
      statusCode: 201,
      responseText: "result",
    });
  },
);

test.serial(
  "thrown error includes mapping validation errors when strict mapping validation fails",
  async (t) => {
    tokens.on(GetTokenForIAMCommand, {}).resolvesOnce({
      id_token: testJwt,
    });

    stash
      .on(GetValueCommand, {
        keyspaceName: "destinations-configuration",
        key: `inbound|${sampleTransactionSetIdentifier}|${samplePartnershipId}`,
      })
      .resolvesOnce({
        value: {
          webhookUrl: "test-webhook",
          mappingId: "test-mapping",
          mappingValidation: "strict",
        },
      });

    const mappingException = {
      code: "validation_failed",
      message:
        "Strict mapping validation failed: The output of the mapping does not conform to the specified target JSON Schema.",
      validationErrors: {
        source: {
          errors: [
            {
              code: "type",
              jsonPointer: "/heading/test",
              jsonSchemaPointer: "#/properties/heading/properties/test/type",
              message: "must be number",
            },
          ],
          mappingInput: { transactionSets: [sampleEDIAsJSON] },
        },
        target: undefined,
      },
      $metadata: {},
    };

    mappings
      .on(MapDocumentCommand, {
        id: "test-mapping",
        content: {
          transactionSets: [sampleEDIAsJSON],
        },
        validationMode: "strict",
      })
      .rejectsOnce(new MappingFailedException(mappingException));

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        t.assert(input === sampleOutputArtifactUrl);
        t.deepEqual(init.headers, {
          Authorization: `Bearer ${testJwt}`,
        });

        return Promise.resolve({
          ok: true,
          text: async () => Promise.resolve("unused"),
          json: async () => Promise.resolve(sampleEDIAsJSON),
        } as Response);
      },
    );

    const error = await t.throwsAsync(handler(event));

    const expectedErrorMessagePrefix = "Strict mapping validation failed:";
    const expectedErrorMessage = `${expectedErrorMessagePrefix} ${
      mappingException.message
    } Validation errors: ${JSON.stringify(mappingException.validationErrors)}`;
    t.assert(error?.message === expectedErrorMessage);

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: { calls: { arguments: string | { method: string }[] }[] };
        }
      ).mock;
    t.assert(
      calls.length === 1,
      "one fetch call is made (to retrieve artifact)",
    );
    t.assert(
      calls[0]?.arguments?.[0] === sampleOutputArtifactUrl,
      "fetch call retrieves output artifact",
    );

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 1);
  },
);

test.serial(
  "thrown error includes stash schema validation errors when stash config entry is malformed",
  async (t) => {
    tokens.on(GetTokenForIAMCommand, {}).resolvesOnce({
      id_token: testJwt,
    });

    stash
      .on(GetValueCommand, {
        keyspaceName: "destinations-configuration",
        key: `inbound|${sampleTransactionSetIdentifier}|${samplePartnershipId}`,
      })
      .resolvesOnce({
        value: {
          webhookUrls: "test-webhook",
        },
      });

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        t.assert(input === sampleOutputArtifactUrl);
        t.deepEqual(init.headers, {
          Authorization: `Bearer ${testJwt}`,
        });

        return Promise.resolve({
          ok: true,
          text: async () => Promise.resolve("unused"),
          json: async () => Promise.resolve(sampleEDIAsJSON),
        } as Response);
      },
    );

    const error = await t.throwsAsync(handler(event));

    const expectedParsingErrors = [
      {
        code: "invalid_type",
        expected: "string",
        received: "undefined",
        path: ["webhookUrl"],
        message: "Required",
      },
      {
        code: "unrecognized_keys",
        keys: ["webhookUrls"],
        path: [],
        message: "Unrecognized key(s) in object: 'webhookUrls'",
      },
    ];
    const expectedErrorPrefix = `Invalid stash configuration for inbound transaction: partnershipId=${samplePartnershipId}, transactionSet=${sampleTransactionSetIdentifier}.`;
    const expectedErrorDetails = `Configuration parsing errors: ${JSON.stringify(expectedParsingErrors)}`;
    const expectedErrorMessage = `${expectedErrorPrefix} ${expectedErrorDetails}`;
    t.assert(error?.message === expectedErrorMessage);

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: { calls: { arguments: string | { method: string }[] }[] };
        }
      ).mock;
    t.assert(
      calls.length === 1,
      "one fetch call is made (to retrieve artifact)",
    );
    t.assert(
      calls[0]?.arguments?.[0] === sampleOutputArtifactUrl,
      "fetch call retrieves output artifact",
    );

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 0);
  },
);

test.serial(
  "thrown error includes details about stash keyspace and keys to configure when lookup fails",
  async (t) => {
    tokens.on(GetTokenForIAMCommand, {}).resolvesOnce({
      id_token: testJwt,
    });

    stash
    .on(GetValueCommand, {
      keyspaceName: "destinations-configuration",
      key: `inbound|${sampleTransactionSetIdentifier}|${samplePartnershipId}`,
    })
    .resolvesOnce({ value: undefined })
    .on(GetValueCommand, {
      keyspaceName: "destinations-configuration",
      key: `inbound|${sampleTransactionSetIdentifier}`,
    })
    .resolvesOnce({ value: undefined });

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (input: RequestInfo, init: RequestInit): Promise<Response> => {
        t.assert(input === sampleOutputArtifactUrl);
        t.deepEqual(init.headers, {
          Authorization: `Bearer ${testJwt}`,
        });

        return Promise.resolve({
          ok: true,
          text: async () => Promise.resolve("unused"),
          json: async () => Promise.resolve(sampleEDIAsJSON),
        } as Response);
      },
    );

    const error = await t.throwsAsync(handler(event));

    const partnershipScopedStashKey = `inbound|${sampleTransactionSetIdentifier}|${samplePartnershipId}`;
    const transactionSetScopedStashKey = `inbound|${sampleTransactionSetIdentifier}`;
    const expectedErrorPrefix = `No matching stash configuration found for inbound transaction: partnershipId=${samplePartnershipId}, transactionSet=${sampleTransactionSetIdentifier}.`;
    const expectedErrorDetails = `Add destination config to 'destinations-configuration' stash keyspace using one of the following keys: '${partnershipScopedStashKey}' or '${transactionSetScopedStashKey}'`;
    const expectedErrorMessage = `${expectedErrorPrefix} ${expectedErrorDetails}`;
    t.assert(error?.message === expectedErrorMessage);

    const { calls } =
      (
        // @ts-expect-error fetch is not yet present in @types/node
        fetch as {
          mock: { calls: { arguments: string | { method: string }[] }[] };
        }
      ).mock;
    t.assert(
      calls.length === 1,
      "one fetch call is made (to retrieve artifact)",
    );
    t.assert(
      calls[0]?.arguments?.[0] === sampleOutputArtifactUrl,
      "fetch call retrieves output artifact",
    );

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 0);
  },
);