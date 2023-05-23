import test from "ava";
import { handler } from "../handler.js";
import {
  mockClient,
  sampleTransactionProcessedEvent,
} from "@stedi/integrations-sdk/testing";
import { BucketsClient, GetObjectCommand } from "@stedi/sdk-client-buckets";
import { Readable } from "node:stream";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { mock } from "node:test";

const event = sampleTransactionProcessedEvent();

const sampleEDIAsJSON = { heading: { test: 1 } };
const buckets = mockClient(BucketsClient);

test.afterEach(() => {
  buckets.reset();
  mock.reset();
});

test.serial("delivers EDI as JSON to webhook url", async (t) => {
  buckets
    .on(GetObjectCommand, {
      bucketName: event.detail.output.bucketName,
      key: event.detail.output.key,
    })
    .resolvesOnce({
      body: sdkStreamMixin(
        Readable.from([
          new TextEncoder().encode(JSON.stringify(sampleEDIAsJSON)),
        ])
      ),
    });

  mock.method(
    global,
    // @ts-expect-error fetch is not yet present in @types/node
    "fetch",
    (_input: RequestInfo, init: RequestInit): Promise<Response> => {
      t.assert(
        init.body === JSON.stringify(sampleEDIAsJSON),
        "JSON payload was delivered to webhook"
      );
      t.deepEqual(init.headers, {
        "Content-Type": "application/json",
      });
      return Promise.resolve({ ok: true, status: 201 } as Response);
    }
  );

  const result = await handler(event);

  // @ts-expect-error fetch is not yet present in @types/node
  const { calls } = (fetch as { mock: { calls: unknown[] } }).mock;

  t.assert(calls.length === 1, "JSON payload was delivered to webhook");

  t.deepEqual(result, {
    ok: true,
    statusCode: 201,
  });
});

test.serial(
  "delivers EDI as JSON to authenticated webhook url when env var is set",
  async (t) => {
    // add AUTHENTICATION env var for this test
    process.env.AUTHORIZATION = "my-auth-key";

    buckets
      .on(GetObjectCommand, {
        bucketName: event.detail.output.bucketName,
        key: event.detail.output.key,
      })
      .resolvesOnce({
        body: sdkStreamMixin(
          Readable.from([
            new TextEncoder().encode(JSON.stringify(sampleEDIAsJSON)),
          ])
        ),
      });

    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (_input: RequestInfo, init: RequestInit): Promise<Response> => {
        t.assert(
          init.body === JSON.stringify(sampleEDIAsJSON),
          "JSON payload was delivered to webhook"
        );
        t.deepEqual(init.headers, {
          "Content-Type": "application/json",
          Authorization: "my-auth-key",
        });
        return Promise.resolve({ ok: true, status: 201 } as Response);
      }
    );

    const result = await handler(event);

    // @ts-expect-error fetch is not yet present in @types/node
    const { calls } = (fetch as { mock: { calls: unknown[] } }).mock;

    t.assert(calls.length === 1, "JSON payload was delivered to webhook");

    t.deepEqual(result, {
      ok: true,
      statusCode: 201,
    });
  }
);

test.serial("throws if JSON file body is empty", async (t) => {
  buckets
    .on(GetObjectCommand, {
      bucketName: event.detail.output.bucketName,
      key: event.detail.output.key,
    })
    .resolvesOnce({
      body: undefined,
    });

  mock.method(
    global,
    // @ts-expect-error fetch is not yet present in @types/node
    "fetch"
  );

  const error = await t.throwsAsync(handler(event));
  t.assert(error?.message === "Failed to retrieve file from Bucket");

  // @ts-expect-error fetch is not yet present in @types/node
  const { calls } = (fetch as { mock: { calls: unknown[] } }).mock;

  t.assert(calls.length === 0, "webhook delivery not attempted for empty file");
});
