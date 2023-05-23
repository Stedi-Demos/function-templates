export const handler = async (event: unknown) => {
  console.log(JSON.stringify(event, null, 2));

  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("WEBHOOK_URL is not defined");
  }

  const params: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.AUTHORIZATION && {
        Authorization: process.env.AUTHORIZATION,
      }),
    },
    body: JSON.stringify(event),
  };

  const result = await fetch(webhookUrl, params);

  if (!result.ok) {
    throw new Error(
      `delivery to ${webhookUrl} failed: ${result.statusText} (status code: ${result.status})`
    );
  }

  return { ok: result.ok, statusCode: result.status };
};