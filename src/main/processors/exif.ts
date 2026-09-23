/**
 * EXIF orientation helpers.
 *
 * Sharp reports the raw stored pixel dimensions. Photos from phones usually
 * carry an EXIF Orientation tag saying "these pixels must be rotated or
 * mirrored before display", so the raw size is often the transpose of what the
 * user actually sees. Any code that reasons about the picture as the user sees
 * it — the file list, resize axis decisions, size estimation — must go through
 * here, so one definition keeps them in agreement.
 */

/**
 * Orientation values 5-8 describe a 90°/270° rotation, which swaps the visible
 * width and height. 1-4 are upright or merely mirrored, so the axes stay put.
 */
export function orientationSwapsAxes(orientation?: number): boolean {
  return orientation !== undefined && orientation >= 5 && orientation <= 8;
}

/**
 * Convert raw pixel dimensions into visual (as-displayed) dimensions.
 *
 * @param width Raw width from `sharp().metadata()`
 * @param height Raw height from `sharp().metadata()`
 * @param orientation EXIF Orientation tag value, when present
 */
export function visualDimensions(
  width: number,
  height: number,
  orientation?: number,
): { width: number; height: number } {
  return orientationSwapsAxes(orientation)
    ? { width: height, height: width }
    : { width, height };
}
