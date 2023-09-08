# Multi transaction to webhook

Sends a POST http request with the body of the transaction set to the configured destination URL. Optionally transforms the transaction set to a different shape using a Stedi Mapping. Supports separate webhook URLs and mapping IDs on a per-transaction set basis (which can be further scoped to a specific partnership).

## Configuration

### Stash key/value store

This function uses [Stash](https://www.stedi.com/docs/stash/index) to store configuration data for the webhook(s) to call when transactions are processed, including: 

- `webhookUrl`: Required. The location to send the transaction set.
- `authorization`: Optional. Authorization HTTP header value to use when calling the webhook.
- `mappingId`: Optional. A Mapping to transform the transaction set prior to sending to the webhook.
- `mapAsGuideJson`: Optional (Default=`true`). If enabled, the individual transaction details are wrapped in a `transactionSets` array when the mapping is invoked. This can be used to align the contents of a single transaction with the schema of a [Stedi Guide](https://www.stedi.com/docs/operate/guide-json). 
- `mappingValidation`: Optional. If set to `strict`, mapping input and output will be [validated against their corresponding schemas](https://www.stedi.com/docs/mappings/transform-json-documents#enable-payload-validation)

### Webhook configuration schema

The JSON schema for the webhook configuration entries stored in Stash can be found here: [schema/destination-config.json](https://github.com/Stedi-Demos/function-templates/blob/main/src/functions/multi-transaction-to-webhook/schema/destination-config.json)

### Post-install instructions

1. If desired, run the unit tests for the `transaction-to-webhook` function template:

    ```bash
    npm run test
    ```
2. Create `destinations-configuration` Stash keyspace

   1. Navigate to the [Stash UI](https://www.stedi.com/app/stash)
   2. Select the link to `Add a keyspace`
   3. Enter `destinations-configuration` as the keyspace name
   4. Click `Create Keyspace`
   5. After the keyspace has been created, click on the [keyspace name](https://www.stedi.com/app/stash/keyspace/destinations-configuration) to add your first configuration value
   6. Click `Add key` to add a new configuration entry
   7. The keyname must use one of the following conventions: `inbound|<TRANSACTION_SET_ID>` or `inbound|<TRANSACTION_SET_ID>|<PARTNERSHIP_ID>`. This allows the flexibility of using different webhook configurations for each transaction set, as well as further scoping the configuration to a specific transaction set and partnership. For example, to configure a webhook for all [850 Purchase Orders](https://www.stedi.com/edi/x12/transaction-set/850) for the `acme_amazon` partnership, the key would be:
      ```text
      inbound|850|acme_amazon
      ```
   8. The value must conform to the JSON schema mentioned above (`webhookUrl` is required, and all other attributes are optional). For example:
      ```json
      {
         "$schema": "https://github.com/Stedi-Demos/function-templates/blob/main/src/functions/multi-transaction-to-webhook/schema/destination-config.json",
         "webhookUrl": "https://webhook.site/<YOUR_WEBHOOK_UUID>"
      }
      ```

   _Note_: if you do not have a webhook available to use, you can use a webhook testing service like [webhook.site](https://webhook.site).

3. Deploy the function as shown in [step 7 of the function template deployment instructions](/README.md#deploying-function-templates)

### Post-deployment instructions

1. Add an [event binding](https://www.stedi.com/docs/core/consume-events-with-functions#subscribe-to-events) to link the `multi-transaction-to-webhook` function to the `transaction.processed.v2` events that are emitted by Core:

    1. Navigate to the [Functions UI](https://www.stedi.com/app/functions)
    2. Select the link for the `multi-transaction-to-webhook` function
    3. Click the `Add Event Binding` button
    4. Provide a name for the binding (for example: `all-processed-txns`)
    5. Select the `transaction.processed.v2` Detail Type
    6. Select the `INBOUND` Direction
    7. Click Done
