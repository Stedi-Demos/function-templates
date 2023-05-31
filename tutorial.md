# Deploying the event-to-webhook function

1. Install the latest version of the [Stedi CLI](https://www.npmjs.com/package/@stedi/cli) (`^2.0.5`):

    ```bash
    npm install --global @stedi/cli@latest
    ```

   If you've installed the CLI previously, be sure to update it to the latest version:

    ```bash
    npm update --global @stedi/cli
    ```

2. Use `stedi integrations init` CLI command to create and initialize a new Stedi Integrations SDK project (choose a path that does not exist yet -- it will be created):

    ```bash
    stedi integrations init --path=<PATH_TO_PROJECT_DIRECTORY>
    ```

3. Change directories to newly created SDK project directory:

    ```bash
    cd <PATH_TO_PROJECT_DIRECTORY>
    ```

4. Install SDK project dependencies

    ```bash
    npm install
    ```

5. Install the `event-to-webhook`  function template from the [Stedi-Demos/function-templates](https://github.com/Stedi-Demos/function-templates) repo:

    ```bash
    npm run install-template event-to-webhook
    ```

6. Edit `package.json`, updating the `ava` test runner configuration to include a `WEBHOOK_URL` environment variable (required for running the included unit tests for the `event-to-webhook` template):

    ```bash
      "ava": {
        "environmentVariables": {
          "WEBHOOK_URL": "https://test-webhook.url"
        },
        // ...
      }
    ```

   _Note_: the `WEBHOOK_URL` configured for `ava` is only used when running unit tests and will not receive any actual requests.

7. Run the tests for the `event-to-webhook` function template (there should be 2 passing tests):

    ```bash
    npm run test
    ```

8. Edit the `.env` file to add your [Stedi API key](https://www.stedi.com/docs/accounts-and-billing/authentication#creating-an-api-key), the webhook url to send events to, and (optionally) the value to use as the authentication header to make authenticated calls (if your webhook destination requires authentication):

    ```bash
    STEDI_API_KEY=<YOUR_STEDI_API_KEY>
    WEBHOOK_URL=<YOUR_WEBHOOK_URL>
    AUTHORIZATION=<YOUR_OPTIONAL_AUTHENTICATION_HEADER_VALUE>
    ```

   _Note_: if you do not have a webhook available to use, you can use a webhook testing service like [webhook.site](https://webhook.site).

9. Deploy the function to your Stedi account:

    ```bash
    npm run deploy
    ```

10. Add the [event binding](https://www.stedi.com/docs/core/consume-events-with-functions#subscribe-to-events) to link the `event-to-webhook` function to the `transaction.processed` events that are emitted by Core:

    1. Navigate to the [Functions UI](https://www.stedi.com/app/functions)
    2. Select the link for the `event-to-webhook` function
    3. Click the `Add Event Binding` button
    4. Provide a name for the binding (for example: `all-processed-txns`)
    5. Select the `transaction.processed` Detail Type
    6. Click Done

You are done!

To test the function, you can upload a new inbound test file to Core and verify that the payload successfully reaches your webhook.

Note that the webhook event does not include the full transaction payload. A pointer to the bucket name and object path associated with the full JSON transaction payload can be found in the `detail.output` attribute. For example:

```bash
    "output": {
      "type": "STEDI/GUIDE-JSON",
      "bucketName": "<YOUR_CORE_BUCKET_NAME>",
      "key": "<PATH>/<TO>/<FILENAME>.json"
    }
```
