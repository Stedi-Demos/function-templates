import * as z from "zod";
import { EventHeaderSchema } from "./event-header.js";
import { EventInterchangeSchema } from "./event-interchange.js";

export const FileFailedSchema = EventHeaderSchema.extend({
  source: z.literal("stedi.core"),
  "detail-type": z.literal("file.failed"),
  detail: z.object({
    version: z.literal("2023-02-13"),
    fileId: z.string(),
    direction: z.literal("SENT").or(z.literal("RECEIVED")),
    envelopes: z.object({
      interchange: EventInterchangeSchema,
    }),
    input: z.object({
      type: z.string(),
      bucketName: z.string(),
      key: z.string(),
    }),
    errors: z.array(
      z.object({
        message: z.string(),
        faultCode: z.string(),
      })
    ),
  }),
});

export type FileFailed = z.infer<typeof FileFailedSchema>;
