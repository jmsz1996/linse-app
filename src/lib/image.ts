import sharp from "sharp";

export const ALLOWED_SHARP_FORMATS = [
  "jpeg",
  "png",
  "webp",
  "heif", // covers HEIC (iPhone default) and HEIF
  "avif",
  "gif",
  "tiff",
  "bmp",
];

export const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export interface ProcessedImage {
  originalBuffer: Buffer;
  thumbBuffer: Buffer;
  width: number;
  height: number;
  mimeType: string; // "image/jpeg" or "image/png"
  ext: string;      // "jpg" or "png"
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length > MAX_BYTES) {
    throw new Error("File too large (max 25 MB)");
  }

  const meta = await sharp(input).metadata(); // throws on invalid/corrupt image

  if (!meta.format || !ALLOWED_SHARP_FORMATS.includes(meta.format)) {
    throw new Error(`Unsupported image format: ${meta.format ?? "unknown"}`);
  }

  // PNG → PNG (preserve transparency); everything else → JPEG for universal browser support
  // HEIC/BMP/GIF/AVIF/TIFF are not reliably renderable as <img> across all browsers
  const outputFormat = meta.format === "png" ? "png" : "jpeg";
  const ext = outputFormat === "png" ? "png" : "jpg";
  const mimeType = outputFormat === "png" ? "image/png" : "image/jpeg";

  const originalBuffer = await sharp(input)
    .rotate()               // auto-rotate based on EXIF orientation
    .toFormat(outputFormat, outputFormat === "jpeg" ? { quality: 92 } : {})
    .toBuffer();            // withMetadata() omitted = strip ALL metadata by default

  const { width, height } = await sharp(originalBuffer).metadata();

  const thumbBuffer = await sharp(originalBuffer)
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    originalBuffer,
    thumbBuffer,
    width: width!,
    height: height!,
    mimeType,
    ext,
  };
}
