import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const BookTrialRequestSchema = z.object({
  classSessionId: z.string().min(1, "Class session ID is required"),
  classRatio: z.string().optional(),
  notes: z.string().optional(),
});

export class BookTrialRequestDto extends createZodDto(BookTrialRequestSchema) {}
