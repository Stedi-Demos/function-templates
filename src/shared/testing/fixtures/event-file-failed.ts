import { FileFailed } from "../../schemas/event-file-failed.js";

export const sampleFileFailedEvent = (): FileFailed => ({
  version: "0",
  id: "xxx-05d4-b198-2fde-7ededc63b103",
  "detail-type": "file.failed",
  source: "stedi.core",
  region: "us-east-1",
  resources: [],
  time: "2021-11-12T00:00:00Z",
  detail: {
    version: "2023-02-13",
    fileId: "123ABC",
    direction: "RECEIVED",
    envelopes: {
      interchange: {
        acknowledgmentRequestedCode: "0",
        controlNumber: 1746,
        date: "220914",
        receiverId: "THISISME",
        receiverQualifier: "ZZ",
        senderId: "ANOTHERMERCH",
        senderQualifier: "ZZ",
        time: "2022",
        usageIndicatorCode: "T",
        versionNumberCode: "00501",
      },
    },
    input: {
      type: "EDI/X12",
      bucketName: "test-bucket",
      key: "855.edi",
    },
    errors: [
      {
        message: "some message here",
        faultCode: "UNKNOWN_ERROR",
      },
    ],
  },
});
