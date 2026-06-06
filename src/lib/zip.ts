import { Zip, ZipPassThrough } from "fflate";
import { readStorageFile, originalRelPath } from "@/lib/storage";
import { extFromMime } from "@/lib/mime";

interface ZipPhoto {
  id: string;
  mimeType: string;
}

// Streams a ZIP of photo originals straight to the client (Content-Disposition:
// attachment), reading + appending one image per `pull` so the consumer's
// backpressure bounds memory to roughly a single image at a time. Originals are
// already compressed (JPEG/PNG/video), so entries are stored uncompressed.
//
// The caller is responsible for selecting/filtering/ordering `photos` (e.g. the
// guest route drops hidden ones; the admin route includes everything).
export function streamPhotosZip(opts: {
  photos: ZipPhoto[];
  eventId: string;
  filenamePrefix: string; // used for both entry names and the download filename
}): Response {
  const { photos, eventId, filenamePrefix } = opts;

  let idx = 0;
  let count = 0;
  let ended = false;
  let cancelled = false;

  let controllerRef: ReadableStreamDefaultController<Uint8Array>;
  const zip = new Zip((err, chunk, final) => {
    if (err) {
      controllerRef.error(err);
      return;
    }
    controllerRef.enqueue(chunk);
    if (final) controllerRef.close();
  });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
    async pull() {
      while (true) {
        if (cancelled) return;
        if (idx >= photos.length) {
          if (!ended) {
            ended = true;
            zip.end();
          }
          return;
        }
        const photo = photos[idx++];
        const ext = extFromMime(photo.mimeType);
        let buf: Buffer;
        try {
          buf = await readStorageFile(originalRelPath(eventId, photo.id, ext));
        } catch {
          continue; // file missing on disk — skip, keep numbering contiguous
        }
        count += 1;
        const name = `${filenamePrefix}-${String(count).padStart(2, "0")}.${ext}`;
        const entry = new ZipPassThrough(name);
        zip.add(entry);
        entry.push(new Uint8Array(buf), true);
        return; // one entry per pull
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filenamePrefix}-photos.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
