import { type FileFailed } from "@stedi/integrations-sdk";

export const handler = async (event: FileFailed) => {
  const {
    detail: { input, errors },
  } = event;

  if (process.env.SLACK_URL === undefined)
    throw new Error("SLACK_URL is not defined");

  const result = await fetch(process.env.SLACK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `[Stedi Core] A file has failed to process`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "plain_text",
              text: `Bucket: ${input.bucketName}`,
            },
            {
              type: "plain_text",
              text: `Key: ${input.key}`,
            },
          ],
        },
        ...errors.map((error) => ({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${error.faultCode}*: ${error.message}`,
          },
        })),
      ],
    }),
  });

  return { ok: result.ok, statusCode: result.status, input };
};
