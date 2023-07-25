import test from "ava";
import { handler } from "../handler.js";
import { sampleTransactionProcessedEvent } from "@stedi/integrations-sdk/testing";
import { mock } from "node:test";

const event = sampleTransactionProcessedEvent();

test.afterEach(() => mock.reset());

test("delivers event to webhook url", async (t) => {
  mock.method(
    global,
    // @ts-expect-error fetch is not yet present in @types/node
    "fetch",
    (_input: RequestInfo, init: RequestInit): Promise<Response> => {
      t.assert(
        init.body === JSON.stringify(event),
        "event was delivered to webhook"
      );
      t.deepEqual(init.headers, {
        "Content-Type": "application/json",
      });
      return Promise.resolve({ ok: true, status: 200 } as Response);
    }
  );

  const result = await handler(event);

  // @ts-expect-error fetch is not yet present in @types/node
  const { calls } = (fetch as { mock: { calls: unknown[] } }).mock;

  t.assert(calls.length === 1, "event was delivered to webhook");

  t.deepEqual(result, {
    ok: true,
    statusCode: 200,
  });
});

test("delivers event to authenticated webhook url when env var is set", async (t) => {
  // add AUTHENTICATION env var for this test
  process.env.AUTHORIZATION = "my-auth-key";

  mock.method(
    global,
    // @ts-expect-error fetch is not yet present in @types/node
    "fetch",
    (_input: RequestInfo, init: RequestInit): Promise<Response> => {
      t.assert(
        init.body === JSON.stringify(event),
        "event was delivered to webhook"
      );
      t.deepEqual(init.headers, {
        "Content-Type": "application/json",
        Authorization: "my-auth-key",
      });
      return Promise.resolve({ ok: true, status: 200 } as Response);
    }
  );

  const result = await handler(event);

  // @ts-expect-error fetch is not yet present in @types/node
  const { calls } = (fetch as { mock: { calls: unknown[] } }).mock;

  t.assert(calls.length === 1, "event was delivered to webhook");

  t.deepEqual(result, {
    ok: true,
    statusCode: 200,
  });
});

test.serial(
  "throws if webhook returns a non-successful response",
  async (t) => {
    mock.method(
      global,
      // @ts-expect-error fetch is not yet present in @types/node
      "fetch",
      (_input: RequestInfo, init: RequestInit): Promise<Response> => {
        t.assert(
          init.body === JSON.stringify(event),
          "event was delivered to webhook"
        );
        t.deepEqual(init.headers, {
          "Content-Type": "application/json",
        });
        return Promise.resolve({ ok: false, status: 422, statusText: "Unprocessable Entity" } as Response);
      }
    );

    const error = await t.throwsAsync(handler(event));
    const webhookUrl = process.env.WEBHOOK_URL;
    t.assert(error?.message === `delivery to ${webhookUrl} failed: Unprocessable Entity (status code: 422)`);
  }
);

