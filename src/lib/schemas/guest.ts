import { z } from "zod";

export const registerGuestSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(50, "Name too long"),
});

export type RegisterGuestInput = z.infer<typeof registerGuestSchema>;
