import test from "ava";
import { mock } from "node:test";
import { handler } from "../handler.js";
import { sampleFileFailedEvent } from "@stedi/integrations-sdk/testing";

const event = sampleFileFailedEvent();

const sampleWebhookPayload = {
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "[Stedi Core] A file has failed to process",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "plain_text", text: "Bucket: test-bucket" },
        { type: "plain_text", text: "Key: 855.edi" },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: "*UNKNOWN_ERROR*: some message here" },
    },
  ],
};

test.afterEach.always(() => mock.reset());

test("delivers failure details to Slack", async (t) => {
  mock.method(
    global,
    // @ts-expect-error fetch is not yet present in @types/node
    "fetch",
    (info: RequestInfo, init?: RequestInit): Promise<Response> => {
      t.assert(
        info === "https://hooks.slack.com/services/ABC123/DEF456/GHI789"
      );

      t.deepEqual(JSON.parse(init?.body as string), sampleWebhookPayload);
      return Promise.resolve({ ok: true, status: 200 } as Response);
    }
  );

  const result = await handler(event);

  // @ts-expect-error fetch is not yet present in @types/node
  const { calls } = (fetch as { mock: { calls: unknown[] } }).mock;

  t.assert(calls.length === 1, "JSON payload was delivered to webhook");

  // t.assert(webhook.isDone(), "Message was delivered to Slack URL");
  t.deepEqual(result, {
    input: {
      bucketName: "test-bucket",
      key: "855.edi",
      type: "EDI/X12",
    },
    ok: true,
    statusCode: 200,
  });
});
