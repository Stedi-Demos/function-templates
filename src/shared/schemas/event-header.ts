import * as z from "zod";

export const EventHeaderSchema = z.object({
  version: z.string(),
  id: z.string(),
  time: z.string(),
  region: z.string(),
  resources: z.array(z.string()),
});
