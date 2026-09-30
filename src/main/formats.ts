/**
 * Image format registry — the single source of truth for what BatchPic can
 * read and write.
 *
 * BatchPic adds no codec dependency of its own: everything listed below is
 * already compiled into the bundled sharp/libvips build (this one ships
 * mozjpeg, libpng/spng, libwebp, aom/libheif and libtiff). `sharp.format` is
 * the authority — an entry whose encoder is missing only blows up when the
 * first image is written, not at build time, so check `sharp.format` before
 * adding a format here.
 *
 * Input and output are two separate lists because they genuinely differ:
 *
 * - `gif` is **input-only**. sharp's cgif encoder exposes no `quality` control
 *   (only `colours` / `effort` / `dither`), so making it a target would
 *   silently void the smart / quality / targetSize modes. A GIF kept "as is"
 *   is therefore redirected to PNG — see `resolveOutputFormat`.
 * - `svg` is deliberately absent from both lists even though libvips can
 *   rasterise it. It carries no magic bytes, so the scanner's content check
 *   (which is what stops a renamed executable from reaching sharp) cannot
 *   recognise it, and it can pull in external resources. A poor trade for a
 *   bitmap batch tool.
 */

/** Formats BatchPic can decode. */
export const INPUT_FORMATS = [
  "jpg",
  "png",
  "webp",
  "tiff",
  "gif",
  "avif",
] as const;

/** Formats BatchPic can encode. */
export const OUTPUT_FORMATS = [
  "jpg",
  "png",
  "webp",
  "tiff",
  "avif",
] as const;

export type InputFormat = (typeof INPUT_FORMATS)[number];
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/**
 * What the format picker stores. `"original"` means "do not override"; the
 * processor then keeps the source format, subject to `resolveOutputFormat`.
 */
export type OutputFormatChoice = OutputFormat | "original";

/** Fallback used when the source format has no encoder (only `gif` today). */
export const NON_ENCODABLE_FALLBACK: OutputFormat = "png";

/**
 * Extensions accepted when scanning or watching, keyed by format.
 *
 * libvips advertises `.jpe` / `.jfif` for JPEG and both `.tif` / `.tiff` for
 * TIFF, and files using those spellings exist in the wild — so a format is
 * matched by any of its spellings rather than by one canonical string.
 */
export const INPUT_EXTENSIONS: Record<InputFormat, readonly string[]> = {
  jpg: ["jpg", "jpeg", "jpe", "jfif"],
  png: ["png"],
  webp: ["webp"],
  tiff: ["tif", "tiff"],
  gif: ["gif"],
  avif: ["avif"],
};

/**
 * Extension written for each format.
 *
 * Kept separate from `INPUT_EXTENSIONS` so both TIFF spellings collapse onto
 * `.tif`: a `scan.tif` kept "as is" then round-trips to `scan.tif` instead of
 * being renamed under the user's feet.
 */
export const OUTPUT_EXTENSION: Record<OutputFormat, string> = {
  jpg: "jpg",
  png: "png",
  webp: "webp",
  tiff: "tif",
  avif: "avif",
};

/**
 * MIME types the magic-byte check accepts, keyed by format. `file-type` reads
 * the file header, so a `.png` that is really a ZIP archive is rejected here
 * before sharp ever opens it.
 */
export const INPUT_MIME_TYPES: Record<InputFormat, readonly string[]> = {
  jpg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  tiff: ["image/tiff"],
  gif: ["image/gif"],
  avif: ["image/avif"],
};

/**
 * MIME type per dotted extension, derived from the tables above, for inlining
 * a local file as a `data:` URL in the preview.
 */
export const MIME_BY_EXTENSION: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = {};
  for (const format of INPUT_FORMATS) {
    for (const extension of INPUT_EXTENSIONS[format]) {
      map[`.${extension}`] = INPUT_MIME_TYPES[format][0];
    }
  }
  return map;
})();

/** Every extension we accept, dotted and lower-case. */
export const SUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set(
  Object.keys(MIME_BY_EXTENSION),
);

/** The same extensions without the dot, sorted — for the OS file dialog filter. */
export const ALL_INPUT_EXTENSIONS: readonly string[] = [
  ...SUPPORTED_EXTENSIONS,
]
  .map((extension) => extension.slice(1))
  .sort();

/** Every MIME type the magic-byte check accepts. */
export const SUPPORTED_MIME_TYPES: readonly string[] = INPUT_FORMATS.flatMap(
  (format) => [...INPUT_MIME_TYPES[format]],
);

export function isInputFormat(value: unknown): value is InputFormat {
  return (
    typeof value === "string" &&
    (INPUT_FORMATS as readonly string[]).includes(value)
  );
}

export function isOutputFormat(value: unknown): value is OutputFormat {
  return (
    typeof value === "string" &&
    (OUTPUT_FORMATS as readonly string[]).includes(value)
  );
}

export function isOutputFormatChoice(
  value: unknown,
): value is OutputFormatChoice {
  return value === "original" || isOutputFormat(value);
}

/** Extension (no dot) to write for a target format. */
export function extensionFor(outputFormat: OutputFormat): string {
  return OUTPUT_EXTENSION[outputFormat];
}

/**
 * Map sharp's `metadata().format` onto our vocabulary.
 *
 * Two spellings differ and both matter:
 * - sharp reports AVIF as `heif` — AVIF is a HEIF container, and sharp exposes
 *   the container's id, not the codec's.
 * - sharp reports JPEG as `jpeg`, while `ImageFile.format` (and the extension
 *   we write) uses `jpg`.
 *
 * Anything else is rejected rather than guessed at: `svg`, `pdf`, `vips`,
 * `magick` and friends are things this app never promised to process.
 */
export function normalizeFormat(raw: string | undefined): InputFormat | null {
  if (raw === "jpeg") return "jpg";
  if (raw === "heif") return "avif";
  return isInputFormat(raw) ? raw : null;
}

/**
 * Decide which format to encode into.
 *
 * `explicit` is the user's pick (absent means "keep the source format"). The
 * source format is only honoured when we can actually encode it; a GIF kept
 * "as is" lands on PNG, which is lossless and keeps its transparency, rather
 * than failing the write or silently degrading every compression mode.
 */
export function resolveOutputFormat(
  explicit: OutputFormat | undefined,
  inputFormat: InputFormat,
): OutputFormat {
  if (explicit) return explicit;
  return isOutputFormat(inputFormat) ? inputFormat : NON_ENCODABLE_FALLBACK;
}
