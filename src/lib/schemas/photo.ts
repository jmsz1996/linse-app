import { z } from "zod";

export const uploadPhotoSchema = z.object({
  tagIds: z.array(z.string().min(1)).max(10).default([]),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;
