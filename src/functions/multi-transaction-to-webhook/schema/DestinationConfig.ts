import z from "zod";

export const DestinationConfigSchema = z.strictObject({
  $schema: z.string().optional(),
  webhookUrl: z.string(),
  authorization: z.string().optional(),
  mappingId: z.string().optional(),
  mapAsGuideJson: z.boolean().default(true),
  mappingValidation: z.enum(["strict"]).optional(),
});

export type DestinationConfig = z.infer<typeof DestinationConfigSchema>;
