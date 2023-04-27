import { TransactionProcessed } from "../../schemas/event-transaction-processed.js";

export const sampleTransactionProcessedEvent = (): TransactionProcessed => ({
  id: "xxx-05d4-b198-2fde-7ededc63b103",
  "detail-type": "transaction.processed",
  source: "stedi.core",
  time: "2021-11-12T00:00:00Z",
  version: "0",
  region: "us-east-1",
  resources: [],
  detail: {
    version: "2023-02-13",
    direction: "SENT",
    envelopes: {
      interchange: {
        acknowledgmentRequestedCode: "0",
        controlNumber: 1746,
        date: "2022-09-14",
        receiverId: "THISISME",
        receiverQualifier: "ZZ",
        senderId: "ANOTHERMERCH",
        senderQualifier: "ZZ",
        time: "20:22",
        usageIndicatorCode: "T",
        versionNumberCode: "00501",
      },
      functionalGroup: {
        applicationReceiverCode: "THISISME",
        applicationSenderCode: "ANOTHERMERCH",
        controlNumber: 1746,
        date: "2022-09-14",
        functionalIdentifierCode: "PR",
        release: "005010",
        responsibleAgencyCode: "X",
        time: "20:22:22",
      },
    },
    metadata: {
      processedAt: "2023-03-14T19:19:17.950Z",
    },
    transaction: {
      id: "a542c152-87c5-4916-848d-e60d47fe0e34",
      controlNumber: 1,
      transactionSetIdentifier: "855",
    },
    input: {
      type: "EDI/X12",
      bucketName: "xxxxxxx-sftp",
      key: "trading-partner/xxxx/xxxx.edi",
    },
    output: {
      type: "STEDI/GUIDE-JSON",
      bucketName: "stedi-default-engine-artifacts-xxxxx",
      key: "123ABC/1746-1746-1.json",
    },
    partnership: {
      partnershipId: "ThisIsMe-AnotherMerch",
      sender: {
        isa: {
          qualifier: "ZZ",
          id: "ANOTHERMERCH",
        },
        profileId: "321",
      },
      receiver: {
        isa: {
          qualifier: "ZZ",
          id: "THISISME",
        },
        profileId: "123",
      },
    },
  },
});
