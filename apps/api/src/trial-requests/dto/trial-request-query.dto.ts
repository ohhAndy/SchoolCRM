import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const TrialRequestQuerySchema = z.object({
  status: z
    .enum(["pending", "approved", "declined", "spam", "all"])
    .optional()
    .default("all"),
  locationId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export class TrialRequestQueryDto extends createZodDto(
  TrialRequestQuerySchema,
) {}
