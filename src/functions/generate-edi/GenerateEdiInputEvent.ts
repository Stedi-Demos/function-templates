import * as z from "zod";

const X12UsageIndicator = z.enum(["I", "P", "T"]);

const TransactionGroupInputSchema = z.strictObject({
  transactionSettingId: z.string(),
  mappingId: z.string().optional(),
  transactions: z.unknown(),
});

export const GenerateEdiInputEventSchema = z.strictObject({
  transactionGroups: z.array(TransactionGroupInputSchema).min(1),
  interchangeUsageIndicatorOverride: X12UsageIndicator.optional(),
  filename: z.string().optional(),
  partnershipId: z.string(),
});

export type TransactionGroupInput = z.infer<typeof TransactionGroupInputSchema>;

export type GenerateEdiInputEvent = z.infer<typeof GenerateEdiInputEventSchema>;
