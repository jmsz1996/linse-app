import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  LINSE_SECRET: z.string().min(32),
  HOST_ADMIN_EMAIL: z.string().email(),
  HOST_ADMIN_PASSWORD: z.string().min(8),
  UPLOAD_DIR: z.string().default("/data/uploads"),
  EXPORT_DIR: z.string().default("/data/exports"),
});

type Env = z.infer<typeof schema>;

let cached: Env | undefined;

function parse(): Env {
  if (cached) return cached;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.flatten().fieldErrors;
    throw new Error(
      "Invalid environment variables:\n" +
        Object.entries(issues)
          .map(([k, v]) => `  ${k}: ${v?.join(", ")}`)
          .join("\n"),
    );
  }
  cached = result.data;
  return cached;
}

export const env = new Proxy({} as Env, {
  get(_target, key) {
    return parse()[key as keyof Env];
  },
});
