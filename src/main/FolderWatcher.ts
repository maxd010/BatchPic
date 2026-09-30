import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { EventEmitter } from "events";
import sharp from "sharp";
import type { ImageFile, ImageProcessor, ProcessingParams } from "./types.js";
import { visualDimensions } from "./processors/exif.js";
import { claimOutputPath } from "./outputGuard.js";

/**
 * Folder watcher ("folder automation").
 *
 * Design mirrors ND-ImgConverter's engine::watcher, adapted to BatchPic:
 * - a debounce window waits for a file to finish being written before touching
 *   it (large copies fire fs.watch repeatedly);
 * - watching is non-recursive;
 * - anything landing inside the output folder is ignored, otherwise our own
 *   output would re-trigger the watcher in a loop;
 * - only the three formats BatchPic supports are picked up.
 *
 * The ND original debounces a flat 1500 ms and then processes unconditionally.
 * That still races a slow copy that outlives the window, so this version adds a
 * size-stability re-check: the file must report the same size twice before it
 * is handed to the processor.
 */

/** Formats BatchPic can read. */
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/** Partial-download / temp artefacts that must never be picked up. */
const IGNORED_SUFFIXES = [".tmp", ".crdownload", ".part", ".partial", ".download"];

/** Wait this long after the last change event (aligned with ND-ImgConverter). */
const DEFAULT_DEBOUNCE_MS = 1500;

/** Re-check interval while a file is still growing. */
const STABLE_RECHECK_MS = 500;

export const FOLDER_WATCH_EVENT = "watch-event";

/** Emitted when the underlying fs.watch handle reports an error. */
export const FOLDER_WATCH_ERROR_EVENT = "watch-error";

export interface FolderWatchConfig {
  /** Directory to watch for newly added images. */
  watchPath: string;
  /** Directory processed images are written to. */
  outputPath: string;
  /** Processing parameters applied to every detected image. */
  params: ProcessingParams;
  /** Override the debounce window (tests use a short one). */
  debounceMs?: number;
  /** Override the size-stability re-check interval (tests use a short one). */
  stableRecheckMs?: number;
}

export interface FolderWatchEvent {
  sourceFile: string;
  outputFile?: string;
  outputSize?: number;
  originalSize?: number;
  success: boolean;
  error?: string;
  /** Local wall-clock stamp, e.g. "14:05:09". */
  timestamp: string;
}

export interface FolderWatchStatus {
  isWatching: boolean;
  watchPath: string | null;
  outputPath: string | null;
}

/** True when `candidate` is `root` itself or nested inside it. */
function isInside(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** Map sharp's format string onto the three formats we support. */
function normalizeFormat(raw: string | undefined): ImageFile["format"] | null {
  if (raw === "jpeg" || raw === "jpg") return "jpg";
  if (raw === "png") return "png";
  if (raw === "webp") return "webp";
  return null;
}

function timestampNow(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export class FolderWatcher extends EventEmitter {
  private watcher: fs.FSWatcher | null = null;
  private config: FolderWatchConfig | null = null;
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly lastSizes = new Map<string, number>();
  private readonly inFlight = new Set<string>();
  /**
   * Output paths claimed during this watch session, so two different sources
   * cannot quietly fight over one target. Reset on stop(); see
   * `outputGuard.ts` for the rule shared with the manual export path.
   */
  private readonly claimedOutputs = new Map<string, string>();

  constructor(private readonly processor: ImageProcessor) {
    super();
  }

  isWatching(): boolean {
    return this.watcher !== null;
  }

  getStatus(): FolderWatchStatus {
    return {
      isWatching: this.isWatching(),
      watchPath: this.config?.watchPath ?? null,
      outputPath: this.config?.outputPath ?? null,
    };
  }

  /**
   * Begin watching `config.watchPath`. Calling this while already watching
   * replaces the previous watch instead of stacking a second one.
   */
  async start(config: FolderWatchConfig): Promise<FolderWatchStatus> {
    this.stop();

    const watchPath = path.resolve(config.watchPath);
    const outputPath = path.resolve(config.outputPath);
    const debounceMs = config.debounceMs ?? DEFAULT_DEBOUNCE_MS;

    const stats = await fsp.stat(watchPath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      throw new Error(`监听目录不存在或不是目录：${watchPath}`);
    }

    // Reject this up front instead of failing silently afterwards.
    //
    // `shouldConsider` ignores anything inside the output folder so the
    // watcher's own output cannot re-trigger it. When both folders are the
    // same, that guard also swallows every source file, so the watch would run
    // forever doing nothing and the UI would give no reason why.
    if (outputPath === watchPath) {
      throw new Error(
        "监听目录与输出目录不能相同：否则每个文件都会被当作自身产物跳过",
      );
    }

    // The output folder must exist before the first file lands.
    await fsp.mkdir(outputPath, { recursive: true });

    this.config = {
      watchPath,
      outputPath,
      params: config.params,
      debounceMs,
      stableRecheckMs: config.stableRecheckMs ?? STABLE_RECHECK_MS,
    };

    this.watcher = fs.watch(watchPath, { recursive: false }, (_eventType, filename) => {
      // `filename` is not guaranteed on every platform; without it we cannot
      // tell which file changed, so skip rather than process the whole folder.
      if (!filename) return;
      this.schedule(path.join(watchPath, String(filename)));
    });

    this.watcher.on("error", (error) => {
      this.emit(FOLDER_WATCH_ERROR_EVENT, error);
      this.stop();
    });

    return this.getStatus();
  }

  /** Stop watching and drop every pending debounce. Safe to call repeatedly. */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.lastSizes.clear();
    this.claimedOutputs.clear();
    this.config = null;
  }

  /** Cheap pre-filter before we spend a timer on a path. */
  private shouldConsider(filePath: string): boolean {
    if (!this.config) return false;

    const lower = filePath.toLowerCase();
    if (IGNORED_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return false;

    if (!SUPPORTED_EXTENSIONS.has(path.extname(lower))) return false;

    // Our own output re-fires the watcher; ignore it or the batch loops.
    if (isInside(path.resolve(filePath), this.config.outputPath)) return false;

    return true;
  }

  /** Debounce per path: every new event restarts that file's timer. */
  private schedule(filePath: string): void {
    if (!this.shouldConsider(filePath)) return;

    const existing = this.timers.get(filePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.timers.delete(filePath);
      void this.settle(filePath);
    }, this.config?.debounceMs ?? DEFAULT_DEBOUNCE_MS);

    // Never hold the process open just for a pending debounce.
    timer.unref?.();
    this.timers.set(filePath, timer);
  }

  /**
   * Wait until the file stops growing, then process it.
   *
   * A copy that outlives the debounce window would otherwise be handed to sharp
   * mid-write and fail; requiring two identical size readings closes that race.
   */
  private async settle(filePath: string): Promise<void> {
    if (!this.config) return;

    let size: number;
    try {
      const stats = await fsp.stat(filePath);
      if (!stats.isFile()) return;
      size = stats.size;
    } catch {
      // Removed or renamed during the debounce window — nothing to do.
      this.lastSizes.delete(filePath);
      return;
    }

    if (this.lastSizes.get(filePath) !== size) {
      this.lastSizes.set(filePath, size);
      const timer = setTimeout(() => {
        this.timers.delete(filePath);
        void this.settle(filePath);
      }, this.config.stableRecheckMs ?? STABLE_RECHECK_MS);
      timer.unref?.();
      this.timers.set(filePath, timer);
      return;
    }

    this.lastSizes.delete(filePath);
    await this.processFile(filePath, size);
  }

  private async processFile(filePath: string, size: number): Promise<void> {
    if (!this.config) return;
    if (this.inFlight.has(filePath)) return;

    this.inFlight.add(filePath);
    const { outputPath, params } = this.config;

    try {
      const metadata = await sharp(filePath).metadata();
      const format = normalizeFormat(metadata.format);
      if (!format || !metadata.width || !metadata.height) {
        throw new Error("无法识别或不支持的图片格式");
      }

      const imageFile: ImageFile = {
        path: filePath,
        relativePath: path.basename(filePath),
        format,
        size,
        // Visual size, so longEdge/shortEdge pick the same axis as a manual export.
        dimensions: visualDimensions(metadata.width, metadata.height, metadata.orientation),
      };

      // Keep the base name; the extension follows the configured target format.
      const targetFormat = params.format ?? format;
      const parsed = path.parse(filePath);
      const targetPath = path.join(outputPath, `${parsed.name}.${targetFormat}`);

      // Same guard as the manual batch. The output folder is ours, so an
      // existing file there is overwritable (re-feeding one source stays
      // idempotent) — only a claim by a *different* source is a conflict, e.g.
      // logo.jpg and logo.png both resolving to logo.webp, where the second
      // write would silently destroy the first one's result.
      const conflict = claimOutputPath(
        targetPath,
        filePath,
        this.claimedOutputs,
      );
      if (conflict) {
        this.emit(FOLDER_WATCH_EVENT, {
          sourceFile: filePath,
          originalSize: size,
          success: false,
          error: conflict,
          timestamp: timestampNow(),
        } satisfies FolderWatchEvent);
        return;
      }

      const result = await this.processor.process(imageFile, params, targetPath);

      this.emit(FOLDER_WATCH_EVENT, {
        sourceFile: filePath,
        outputFile: result.success ? result.outputPath : undefined,
        outputSize: result.success ? result.processedSize : undefined,
        originalSize: size,
        success: result.success,
        error: result.error,
        timestamp: timestampNow(),
      } satisfies FolderWatchEvent);
    } catch (error) {
      this.emit(FOLDER_WATCH_EVENT, {
        sourceFile: filePath,
        originalSize: size,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: timestampNow(),
      } satisfies FolderWatchEvent);
    } finally {
      this.inFlight.delete(filePath);
    }
  }
}
