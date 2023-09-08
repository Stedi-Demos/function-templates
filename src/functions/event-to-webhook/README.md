# Event to webhook

Sends a POST http request with the contents of the input event to the configured destination URL.

## Configuration

### Environment variables

**WEBHOOK_URL**: Required. The location to send the transaction set.

**AUTHORIZATION**: Optional. Authorization HTTP header value to use when calling the webhook.

### Post-install instructions

1. Edit `package.json`, updating the `ava` test runner configuration to include a `WEBHOOK_URL` environment variable (required for running the included unit tests for the `event-to-webhook` template):

    ```bash
      "ava": {
        "environmentVariables": {
          "WEBHOOK_URL": "https://test-webhook.url"
        },
        // ...
      }
    ```

   _Note_: the `WEBHOOK_URL` configured for `ava` is only used when running unit tests and will not receive any actual requests.

2. If desired, run the unit tests for the `event-to-webhook` function template:

    ```bash
    npm run test
    ```

3. Edit the `.env` file as follows: below the existing `STEDI_API_KEY` entry, add the webhook url to send events to, and (optionally) the value to use as the authentication header to make authenticated calls (if your webhook destination requires authentication):

    ```bash
    STEDI_API_KEY=<YOUR_STEDI_API_KEY>
    WEBHOOK_URL=<YOUR_WEBHOOK_URL>
    AUTHORIZATION=<YOUR_OPTIONAL_AUTHENTICATION_HEADER_VALUE>
    ```

   _Note_: if you do not have a webhook available to use, you can use a webhook testing service like [webhook.site](https://webhook.site).

4. Deploy the function as shown in [step 7 of the function template deployment instructions](/README.md#deploying-function-templates)

### Post-deployment instructions

1. Add an [event binding](https://www.stedi.com/docs/core/consume-events-with-functions#subscribe-to-events) to link the `event-to-webhook` function to the events that you would like to send to your webhook:

    1. Navigate to the [Functions UI](https://www.stedi.com/app/functions)
    2. Select the link for the `event-to-webhook` function
    3. Click the `Add Event Binding` button
    4. Provide a name for the binding (for example: `all-processed-txns`)
    5. Select the event detail type for the events you would like to send to your webhook (for example: `transaction.processed`)
    6. If desired, configure additional event binding options for the event type you have selected (for example: `Direction: Received`)
    7. Click Done
