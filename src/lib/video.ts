import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { writeFile, readFile, unlink } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import sharp from "sharp";
import { extFromMime } from "@/lib/mime";

const execFileAsync = promisify(execFile);

export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

// Same shape as ProcessedImage so the upload route treats both uniformly.
export interface ProcessedVideo {
  originalBuffer: Buffer; // unchanged — videos are already compressed, no re-encode
  thumbBuffer: Buffer; // WebP poster frame, sized like image thumbnails
  width: number;
  height: number;
  mimeType: string;
  ext: string;
}

function ffmpegMissing(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ENOENT"
  );
}

export async function processVideo(input: Buffer, mimeType: string): Promise<ProcessedVideo> {
  if (input.length > MAX_VIDEO_BYTES) {
    throw new Error("Video too large (max 200 MB)");
  }
  if (!ALLOWED_VIDEO_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported video format: ${mimeType}`);
  }

  const ext = extFromMime(mimeType);
  const base = path.join(os.tmpdir(), `linse-${randomUUID()}`);
  const inPath = `${base}.${ext}`;
  const framePath = `${base}.png`;

  try {
    await writeFile(inPath, input);

    // Probe the first video stream for native dimensions.
    let width = 0;
    let height = 0;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "json",
        inPath,
      ]);
      const probe = JSON.parse(stdout) as { streams?: { width?: number; height?: number }[] };
      width = probe.streams?.[0]?.width ?? 0;
      height = probe.streams?.[0]?.height ?? 0;
    } catch (err) {
      if (ffmpegMissing(err)) throw new Error("Video processing unavailable (ffmpeg not installed)");
      throw new Error("Could not read video — it may be corrupt or unsupported");
    }

    // Extract the first frame as a PNG, then convert to a WebP thumbnail that
    // matches the image pipeline (600px wide, quality 80).
    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-ss", "0",
        "-i", inPath,
        "-frames:v", "1",
        "-an",
        "-f", "image2",
        framePath,
      ]);
    } catch (err) {
      if (ffmpegMissing(err)) throw new Error("Video processing unavailable (ffmpeg not installed)");
      throw new Error("Could not generate video thumbnail");
    }

    const frame = await readFile(framePath);
    const thumbBuffer = await sharp(frame)
      .resize({ width: 600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return { originalBuffer: input, thumbBuffer, width, height, mimeType, ext };
  } finally {
    await Promise.allSettled([unlink(inPath), unlink(framePath)]);
  }
}
