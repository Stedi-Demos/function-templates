# Failure to Slack

Sends details from `file.failed` events to a Slack webhook.

## Configuration

### Environment variables

**SLACK_URL**: Required. The location to send the transaction set.

### Post-install instructions

1. Edit `package.json`, updating the `ava` test runner configuration to include the `SLACK_URL` environment variable shown below (required for running the included unit tests for the `failure-to-slack` template):

    ```bash
      "ava": {
        "environmentVariables": {
          "SLACK_URL": "https://hooks.slack.com/services/ABC123/DEF456/GHI789"
        },
        // ...
      }
    ```

   _Note_: the `SLACK_URL` configured for `ava` is only used when running unit tests and will not receive any actual requests.

2. If desired, run the unit tests for the `failure-to-slack` function template:

    ```bash
    npm run test
    ```

3. Edit the `.env` file as follows: below the existing `STEDI_API_KEY` entry, add the Slack url to send `file.failed` event details to:

    ```bash
    STEDI_API_KEY=<YOUR_STEDI_API_KEY>
    SLACK_URL=<YOUR_SLACK_WEBHOOK_URL>
    ```

4. Deploy the function as shown in [step 7 of the function template deployment instructions](/README.md#deploying-function-templates)

### Post-deployment instructions

1. Add an [event binding](https://www.stedi.com/docs/core/consume-events-with-functions#subscribe-to-events) to link the `failure-to-slack` function to the `file.failed` events that are emitted by Core:

    1. Navigate to the [Functions UI](https://www.stedi.com/app/functions)
    2. Select the link for the `failure-to-slack` function
    3. Click the `Add Event Binding` button
    4. Provide a name for the binding (for example: `all-failed-files`)
    5. Select the `file.failed` Detail Type
    6. Click Done
