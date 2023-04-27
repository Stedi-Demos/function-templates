import { BucketsClient } from "@stedi/sdk-client-buckets";
import { EDITranslateClient } from "@stedi/sdk-client-edi-translate";
import { GuidesClient } from "@stedi/sdk-client-guides";
import { PartnersClient } from "@stedi/sdk-client-partners";
import { StashClient } from "@stedi/sdk-client-stash";
import { mockClient } from "aws-sdk-client-mock";
import { MappingsClient } from "@stedi/sdk-client-mappings";
import { S3Client } from "@aws-sdk/client-s3";

/**
 * Creates a mocked Stedi BucketsClient
 *
 * @returns a mocked BucketsClient
 */
export const mockS3Client = () => {
  return mockClient(S3Client);
};

/**
 * Creates a mocked Stedi BucketsClient
 *
 * @returns a mocked BucketsClient
 */
export const mockBucketClient = () => {
  return mockClient(BucketsClient);
};

/**
 * Creates a mocked Stedi StashClient
 *
 * @returns a mocked StashClient
 */
export const mockStashClient = () => {
  return mockClient(StashClient);
};

/**
 * Creates a mocked Stedi TranslateClient
 *
 * @returns a mocked TranslateClient
 */
export const mockTranslateClient = () => {
  return mockClient(EDITranslateClient);
};

/**
 * Creates a mocked Stedi GuidesClient
 *
 * @returns a mocked GuidesClient
 */
export const mockGuideClient = () => {
  return mockClient(GuidesClient);
};

/**
 * Creates a mocked Stedi PartnersClient
 *
 * @returns a mocked PartnersClient
 */
export const mockPartnersClient = () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  return mockClient(PartnersClient as any);
};

export const mockMappingsClient = () => {
  return mockClient(MappingsClient);
};
