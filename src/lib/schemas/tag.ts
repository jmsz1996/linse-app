import { z } from "zod";

export const TAG_COLORS = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
] as const;

const tagColorValues = TAG_COLORS.map((c) => c.value) as [string, ...string[]];

export const createTagSchema = z.object({
  label: z.string().min(1, "Label is required").max(50).trim(),
  color: z.enum(tagColorValues).nullable().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateTagSchema = createTagSchema.partial();

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
