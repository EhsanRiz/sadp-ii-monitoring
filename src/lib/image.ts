/**
 * Client-side image downscaling for field photos.
 *
 * Phone/tablet cameras produce 3–12 MB images. Storing those raw in the
 * IndexedDB offline queue can blow the browser's storage quota after a day of
 * visits, and they're slow to upload on rural LTE. We downscale to a sensible
 * max dimension and re-encode as JPEG before queueing/uploading.
 *
 * Safety: on ANY failure (e.g. HEIC that the browser's canvas can't decode, or
 * no canvas support) we return the ORIGINAL file untouched — never lose a
 * photo to compression. We also keep the original if compression somehow makes
 * it larger.
 */

export interface CompressOptions {
  /** Longest-edge cap in pixels. */
  maxDimension?: number;
  /** JPEG quality 0–1. */
  quality?: number;
}

const DEFAULTS = { maxDimension: 1600, quality: 0.8 };
/** Files below this size aren't worth re-encoding. */
const SKIP_BELOW_BYTES = 300 * 1024;
/**
 * Hard cap on how long decode+encode may take before we give up and keep the
 * original file. On some Android tablets `createImageBitmap` / `canvas.toBlob`
 * can stall on a large or odd-format photo and never settle — which left the
 * "Adding…" spinner spinning forever offline. Falling back to the original
 * file keeps the capture flow moving (it still gets queued/uploaded).
 */
const COMPRESS_TIMEOUT_MS = 10_000;

const COMPRESS_TIMED_OUT = Symbol('compress-timed-out');

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const maxDimension = opts.maxDimension ?? DEFAULTS.maxDimension;
  const quality = opts.quality ?? DEFAULTS.quality;

  if (typeof document === 'undefined') return file;
  if (!file.type.startsWith('image/')) return file;
  if (file.size < SKIP_BELOW_BYTES) return file;

  try {
    // Race the actual work against a timeout so a stalled decode can't hang
    // the caller. On timeout we return the original file untouched.
    const outcome = await Promise.race([
      encodeDownscaled(file, maxDimension, quality),
      new Promise<typeof COMPRESS_TIMED_OUT>((resolve) =>
        setTimeout(() => resolve(COMPRESS_TIMED_OUT), COMPRESS_TIMEOUT_MS),
      ),
    ]);
    if (outcome === COMPRESS_TIMED_OUT || outcome === null) return file;
    return outcome;
  } catch {
    return file; // decode unsupported (e.g. HEIC on Chrome) — keep original
  }
}

/**
 * The actual decode → downscale → re-encode. Returns the new File, or null if
 * compression isn't worthwhile / possible (caller keeps the original).
 */
async function encodeDownscaled(
  file: File,
  maxDimension: number,
  quality: number,
): Promise<File | null> {
  // `imageOrientation: 'from-image'` bakes in EXIF rotation so portrait
  // phone photos don't come out sideways. Cast because older TS DOM libs
  // don't list the option.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  } as ImageBitmapOptions);

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob || blob.size >= file.size) return null; // no win — keep original

  const base = file.name.replace(/\.[^.]+$/, '') || `photo-${Date.now()}`;
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}
