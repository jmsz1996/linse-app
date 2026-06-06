import { z } from "zod";

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(500, "Too long"),
});

export type CommentInput = z.infer<typeof commentSchema>;
