# Transaction to webhook

Sends a POST http request with the body of the transaction set to the configured destination URL. Optionally transforms the transaction set to a different shape using a Stedi Mapping.

## Configuration

### Environment variables

**STEDI_API_KEY**: Required. An API Key to access Stedi resources.

**WEBHOOK_URL**: Required. The location to send the transaction set.

**MAPPING_ID**: Optional. A Mapping to transform the transaction set prior to sending to the webhook.

**AUTHORIZATION**: Optional. Authorization HTTP header value to use when calling the webhook.
