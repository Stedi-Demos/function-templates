# Generate EDI

Generates an outbound EDI document to send to a trading partner using the [GenerateEdi API](https://www.stedi.com/docs/core/parsing-and-generating-edi#generate-and-send-edi). Optionally transforms the input to the guide JSON schema shape using a Stedi Mapping. 

## Configuration

### Environment variables

N/A

### Post-install instructions

1. If desired, run the unit tests for the `event-to-webhook` function template:

    ```bash
    npm run test
    ```

2. Deploy the function as shown in [step 7 of the function template deployment instructions](/README.md#deploying-function-templates)

### Post-deployment instructions

N/A

## Invoking the function

For complete details on invoking functions, please refer to the documentation here: https://www.stedi.com/docs/functions/invoking.

### Input payload

The `generate-edi` function requires an input payload that is similar to the input payload used by [Core's Generate API](https://www.stedi.com/docs/core/parsing-and-generating-edi#runtime-data-required-to-generate-edi), with the two main differences for the `generate-edi` function payload: 
- the partnershipId to be used for generating / delivering the EDI file is required
- each item in the `transactionGroups` array can include an optional mappingId attribute (can be used to transform the input to the required guide-JSON shape)

```json
  {
    "partnershipId": "my-partnership-id",
    "filename": "my-output-file.edi",
    "transactionGroups": [
      {
        "transactionSettingId": "005010-850",
         "mappingId": "ABC123DEF",
        "transactions": [
          {
            "sample-input": "custom payload object, used as input to mapping"
          }
        ]
      }
    ]
  }
```

### Example invocation via cURL

```bash
  curl \
    --request POST \
    --header "Authorization: Key ${STEDI_API_KEY}" \
    --header "X-Amz-Invocation-Type: RequestResponse" \
    "https://functions.cloud.us.stedi.com/2021-11-16/functions/generate-edi/invocations" \
    --data-raw '{
  "partnershipId": "acme_coyote-suppliers",
  "filename": "my-output-file.edi",
  "transactionGroups": [
    {
      "transactionSettingId": "005010-850",
      "mappingId": "ABC123DEF",
      "transactions": [
        {
          "orderDetails": {
            "internalOrderNumber": "ACME-4567",
            "orderNumber": "PO-01566",
            "orderType": "drop-ship",
            "orderDate": "2023-07-28T18:25:43Z",
            "orderMemo": "Thank you for your business",
            "orderAdminContact": {
              "name": "Marvin Acme",
              "address": {
                "street1": "123 Main Street",
                "city": "Fairfield",
                "state": "NJ",
                "zip": "07004",
                "country": "US"
              },
              "phone": "973-555-1212",
              "email": "marvin@acme.com"
            }
          },
          "shippingDetails": {
            "carrier": "FedEx Home Delivery"
          },
          "shipTo": {
            "customerId": "123",
            "name": "Wile E Coyote",
            "address": {
              "street1": "111 Canyon Court",
              "city": "Phoenix",
              "state": "AZ",
              "zip": "85001",
              "country": "US"
            }
          },
          "items": [
            {
              "id": "item-1",
              "quantity": 8,
              "unitCode": "EA",
              "price": 400,
              "vendorPartNumber": "VND1234567",
              "sku": "ACM/8900-400",
              "description": "400 pound anvil"
            },
            {
              "id": "item-2",
              "quantity": 4,
              "unitCode": "EA",
              "price": 125,
              "vendorPartNumber": "VND000111222",
              "sku": "ACM/1100-001",
              "description": "Detonator"
            }
          ]
        }
      ]
    }
  ]
}
' | base64 -d
  
  {
    "$metadata": {
      "httpStatusCode": 200,
      "requestId": "request-uuid-abc123",
      "attempts": 1,
      "totalRetryDelay": 0
    },
    "artifactId": "artifact-id",
    "edi": "ISA*00*          *00*          *ZZ*COYOTE         *ZZ*ACME           *230728*1825*U*00501*000002073*1*P*>~GS*PO*COYOTE*ACME*20230728*182543*000002073*X*005010~ST*850*0001~BEG*00*DS*PO-01566**20230728~REF*CO*ACME-4567~REF*ZZ*Thank you for your business~PER*OC*Marvin Acme*TE*973-555-1212*EM*marvin@acme.com~TD5****ZZ*FHD~N1*ST*Wile E Coyote*92*123~N3*111 Canyon Court~N4*Phoenix*AZ*85001*US~PO1*item-1*0008*EA*400**VC*VND1234567*SK*ACM/8900-400~PID*F****400 pound anvil~PO1*item-2*0004*EA*125**VC*VND000111222*SK*ACM/1100-001~PID*F****Detonator~CTT*2~AMT*TT*3700~SE*16*0001~GE*1*000002073~IEA*1*000002073~"
    "fileExecutionId": "file-execution-id"
    }
```
