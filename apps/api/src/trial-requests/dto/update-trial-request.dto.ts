import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpdateTrialRequestStatusSchema = z.object({
  status: z.enum(["pending", "approved", "declined", "spam"]),
});

export class UpdateTrialRequestStatusDto extends createZodDto(
  UpdateTrialRequestStatusSchema,
) {}

export const UpdateTrialRequestNotesSchema = z.object({
  notes: z.string().nullable().optional(),
});

export class UpdateTrialRequestNotesDto extends createZodDto(
  UpdateTrialRequestNotesSchema,
) {}
