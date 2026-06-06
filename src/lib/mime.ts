// Maps a stored photo/video mimeType to the on-disk file extension used by
// originalRelPath(). Keep in sync with the formats processImage()/processVideo()
// are allowed to emit.
export function extFromMime(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "jpg"; // image/jpeg
  }
}

export function isVideoMime(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}
