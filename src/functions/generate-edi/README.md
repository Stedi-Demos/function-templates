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

2. Deploy the function as shown in [step 8 of the function template deployment instructions](/README.md#deploying-function-templates)

### Post-deployment instructions

N/A