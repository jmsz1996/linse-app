import { z } from "zod";

export const slugSchema = z
  .string()
  .min(3, "At least 3 characters")
  .max(60, "At most 60 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Lowercase letters, numbers, hyphens only — no leading/trailing/consecutive hyphens"
  );

const baseEventSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: slugSchema,
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  // Total upload cap across all guests, in MB. 0 = unlimited.
  storageLimitMb: z.number().int().min(0).max(102400).optional(),
  allowVideos: z.boolean().optional(),
  commentLimitPerHour: z.number().int().min(1).max(1000).optional(),
  description: z.string().max(500).nullable().optional(),
  footer: z.string().max(200).nullable().optional(),
  // Per-event access password. null clears it (public); a string sets it.
  // The admin form sends `null` (not "") when the field is blank.
  accessPassword: z
    .string()
    .min(4, "At least 4 characters")
    .max(128, "At most 128 characters")
    .nullable()
    .optional(),
});

export const createEventSchema = baseEventSchema.refine(
  ({ startsAt, endsAt }) =>
    !startsAt || !endsAt || new Date(endsAt) > new Date(startsAt),
  { message: "End date must be after start date", path: ["endsAt"] }
);

export const updateEventSchema = baseEventSchema.partial().refine(
  ({ startsAt, endsAt }) =>
    !startsAt || !endsAt || new Date(endsAt) > new Date(startsAt),
  { message: "End date must be after start date", path: ["endsAt"] }
);

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
