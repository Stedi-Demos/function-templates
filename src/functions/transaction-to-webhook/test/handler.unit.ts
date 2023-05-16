import test from "ava";
import { handler } from "../handler.js";
import {
  mockClient,
  sampleTransactionProcessedEvent,
} from "@stedi/integrations-sdk/testing";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { mock } from "node:test";

const event = sampleTransactionProcessedEvent();

const sampleEDIAsJSON = { heading: { test: 1 } };
const buckets = mockClient(S3Client);

test.before(() => {
  buckets
    .on(GetObjectCommand, {
      Bucket: event.detail.output.bucketName,
      Key: event.detail.output.key,
    })
    .resolvesOnce({
      Body: sdkStreamMixin(
        Readable.from([
          new TextEncoder().encode(JSON.stringify(sampleEDIAsJSON)),
        ])
      ),
    });
});

test.afterEach(() => mock.reset());

test("delivers EDI as JSON to webhook url", async (t) => {
  mock.method(
    global,
    // @ts-expect-error fetch is not yet present in @types/node
    "fetch",
    (_input: RequestInfo, init: RequestInit): Promise<Response> => {
      t.assert(
        init?.body === JSON.stringify(sampleEDIAsJSON),
        "JSON payload was delivered to webhook"
      );
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
