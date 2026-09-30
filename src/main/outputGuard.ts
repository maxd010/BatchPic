import * as path from "path";

/**
 * Shared "do not silently replace a file we do not own" guard.
 *
 * Two callers need the same rule and must not drift apart:
 * - `SharpImageProcessor.processBatch` — manual export
 * - `FolderWatcher` — folder automation
 *
 * The guard covers two distinct hazards:
 *
 * 1. **A pre-existing file at the target.** Only relevant when the write lands
 *    outside our own folders (a format conversion writes next to the original,
 *    where a same-name file may be one the user created). That check stays in
 *    the processor, because it needs `fileExists` and the format-conversion
 *    condition; both are specific to the manual path.
 *
 * 2. **Two different inputs racing for one target** — `logo.jpg` and `logo.png`
 *    both converting to webp want `logo.webp`. The second write would silently
 *    destroy the first result. This part is shared, and it is what this module
 *    provides.
 *
 * A third hazard — re-writing *our own* previous output — is deliberately
 * allowed so re-exporting stays idempotent.
 */

/** Normalise a path for use as a claim key (Windows/macOS are case-insensitive). */
export function outputClaimKey(outputPath: string): string {
  return outputPath.toLowerCase();
}

/**
 * Record that `inputPath` is writing to `outputPath`.
 *
 * @returns the reason to skip this write, or `null` to proceed.
 *
 * Must stay synchronous: there can be no `await` between reading and writing
 * `claimedOutputs`, otherwise two concurrent tasks could both observe the path
 * as unclaimed. An input that claims the same path twice (the user re-copied
 * the same file into a watched folder) is fine — it would write byte-identical
 * output.
 */
export function claimOutputPath(
  outputPath: string,
  inputPath: string,
  claimedOutputs: Map<string, string>,
): string | null {
  const key = outputClaimKey(outputPath);
  const owner = claimedOutputs.get(key);

  if (owner !== undefined && owner !== inputPath) {
    return (
      `已有另一张图片导出到同一路径（源文件 ${path.basename(owner)}），` +
      "已跳过以避免互相覆盖"
    );
  }

  claimedOutputs.set(key, inputPath);
  return null;
}
