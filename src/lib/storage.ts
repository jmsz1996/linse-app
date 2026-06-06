import { mkdir, writeFile as fsWriteFile, readFile as fsReadFile, unlink } from "fs/promises";
import path from "path";
import { env } from "@/lib/env";

export function storagePath(...parts: string[]): string {
  return path.join(env.UPLOAD_DIR, ...parts);
}

export async function ensureDir(...parts: string[]): Promise<void> {
  await mkdir(storagePath(...parts), { recursive: true });
}

export async function writeStorageFile(relPath: string[], data: Buffer): Promise<void> {
  await ensureDir(...relPath.slice(0, -1));
  await fsWriteFile(storagePath(...relPath), data);
}

export async function readStorageFile(relPath: string[]): Promise<Buffer> {
  return fsReadFile(storagePath(...relPath));
}

// Permanently removes a photo's stored files. Missing files are ignored so a
// hard delete still succeeds if a file was already gone.
export async function deletePhotoFiles(storagePath: string, thumbPath: string): Promise<void> {
  await Promise.allSettled([unlink(storagePath), unlink(thumbPath)]);
}

export function originalRelPath(eventId: string, photoId: string, ext: string): string[] {
  return ["events", eventId, "originals", `${photoId}.${ext}`];
}

export function thumbRelPath(eventId: string, photoId: string): string[] {
  return ["events", eventId, "thumbs", `${photoId}.webp`];
}
