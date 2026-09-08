import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ChildItemSchema = z.object({
  name: z.string().min(2, "Swimmer name is required"),
  age: z.coerce.number().min(0, "Invalid age").max(120, "Invalid age"),
  skillLevel: z.string().optional(),
});

export const SubmitTrialRequestSchema = z
  .object({
    parentName: z.string().min(2, "Name is required"),
    parentPhone: z
      .string()
      .refine((val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
      }, "Please enter a valid 10-digit North American phone number"),
    parentEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
    childName: z.string().optional(),
    childAge: z.coerce.number().min(0).max(120).optional(),
    children: z.array(ChildItemSchema).min(1).max(5).optional(),
    siblingPreference: z.enum(["simultaneous", "flexible"]).optional(),
    timePreference: z.string().optional(),
    timePreferences: z.array(z.string()).optional(),
    preferredDates: z
      .array(z.string().min(1))
      .max(5, "Select up to 5 preferred dates")
      .optional()
      .default([]),
    locationId: z.string().optional(),
    locationSlug: z.string().optional(),
    notes: z.string().optional(),
    cookieId: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.children && data.children.length > 0) ||
      (Boolean(data.childName && data.childName.trim().length >= 2) && data.childAge !== undefined),
    {
      message: "At least one swimmer name and age must be provided",
      path: ["children"],
    },
  );

export class SubmitTrialRequestDto extends createZodDto(
  SubmitTrialRequestSchema,
) {}

export const GetTrialDatesQuerySchema = z
  .object({
    locationId: z.string().optional(),
    locationSlug: z.string().optional(),
  })
  .refine((data) => Boolean(data.locationId?.trim() || data.locationSlug?.trim()), {
    message: "A location (locationSlug or locationId) is required to view trial dates",
  });

export class GetTrialDatesQueryDto extends createZodDto(
  GetTrialDatesQuerySchema,
) {}
