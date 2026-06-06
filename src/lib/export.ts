import { copyFile, readdir, unlink } from "fs/promises";
import { prisma } from "@/lib/db";
import { extFromMime } from "@/lib/mime";
import {
  deletePhotoFiles,
  ensureExportDir,
  exportPath,
  originalRelPath,
  storagePath,
} from "@/lib/storage";

export type ExportMode = "copy" | "move";

export interface ExportResult {
  exported: number; // files written to the folder
  skipped: number; // photos whose original was missing on disk
  deleted: number; // originals removed from the app (move only)
  folder: string; // the per-event folder name under EXPORT_DIR
}

// Files this feature writes look like "001.jpg" / "042.mp4". Only files matching
// this shape are pruned on re-export, so anything else in the folder is left alone.
const NUMBERED_FILE = /^\d+\.[^.]+$/;

// Turns an event name into one safe path segment: strips path separators and
// control chars, collapses whitespace, trims. Falls back to the (unique,
// url-safe) slug when nothing usable remains.
export function exportFolderName(eventName: string, slug: string): string {
  const cleaned = eventName
    .replace(/[/\\]/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || slug;
}

// Copies an event's original media into EXPORT_DIR/<event name>/ as zero-padded,
// upload-ordered files (001.jpg, 002.mp4, …). Idempotent: previously-exported
// numbered files are pruned first so the folder mirrors the current set. When
// mode is "move", the successfully-exported originals are then removed from the
// app — DB rows (cascading to tags/likes/comments) plus stored files — mirroring
// the bulk-delete route. Originals are reconstructed via originalRelPath() (same
// read path as the ZIP download), so they track the current UPLOAD_DIR.
export async function exportEventOriginals(opts: {
  eventId: string;
  eventName: string;
  slug: string;
  mode: ExportMode;
}): Promise<ExportResult> {
  const { eventId, eventName, slug, mode } = opts;
  const folder = exportFolderName(eventName, slug);

  const photos = await prisma.photo.findMany({
    where: { eventId },
    orderBy: { uploadedAt: "asc" },
    select: { id: true, mimeType: true, storagePath: true, thumbPath: true },
  });

  await ensureExportDir(folder);

  // Prune prior numbered exports so a re-run reflects the current set exactly.
  const existing = await readdir(exportPath(folder)).catch(() => [] as string[]);
  await Promise.allSettled(
    existing
      .filter((f) => NUMBERED_FILE.test(f))
      .map((f) => unlink(exportPath(folder, f))),
  );

  const width = Math.max(3, String(photos.length).length);
  const exported: { id: string; storagePath: string; thumbPath: string }[] = [];
  let skipped = 0;
  let seq = 0;

  for (const photo of photos) {
    const ext = extFromMime(photo.mimeType);
    const src = storagePath(...originalRelPath(eventId, photo.id, ext));
    const candidate = seq + 1;
    const dest = exportPath(folder, `${String(candidate).padStart(width, "0")}.${ext}`);
    try {
      await copyFile(src, dest);
      seq = candidate; // keep numbering contiguous over files that actually exist
      exported.push(photo);
    } catch {
      skipped += 1; // source missing on disk — skip, like the ZIP stream does
    }
  }

  let deleted = 0;
  if (mode === "move" && exported.length > 0) {
    const ids = exported.map((p) => p.id);
    await prisma.photo.deleteMany({ where: { id: { in: ids } } });
    await Promise.allSettled(
      exported.map((p) => deletePhotoFiles(p.storagePath, p.thumbPath)),
    );
    deleted = ids.length;
  }

  return { exported: exported.length, skipped, deleted, folder };
}
