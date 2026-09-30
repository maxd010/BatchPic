import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import sharp from "sharp";
import {
  FolderWatcher,
  FOLDER_WATCH_EVENT,
  type FolderWatchEvent,
} from "../FolderWatcher";
import type {
  ImageProcessor,
  ProcessedImage,
  ProcessingParams,
} from "../types";
import { removeDirWithRetry } from "../../test-support/fsCleanup";

/** Short windows so the suite does not sit on 1.5s debounces. */
const DEBOUNCE_MS = 50;
const STABLE_RECHECK_MS = 30;

const DEFAULT_PARAMS: ProcessingParams = { compression: { mode: "smart" } };

async function makePngBuffer(): Promise<Buffer> {
  return sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  })
    .png()
    .toBuffer();
}

/** A second format, so two files can share a base name but differ by extension. */
async function makeJpegBuffer(): Promise<Buffer> {
  return sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 40, g: 90, b: 200 },
    },
  })
    .jpeg()
    .toBuffer();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5000,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await sleep(40);
  }
  throw new Error("waitFor: 条件未在超时内满足");
}

/** Stands in for SharpImageProcessor: records calls, writes a placeholder. */
function createRecordingProcessor() {
  const processed: Array<{ input: string; output: string }> = [];
  const processor: ImageProcessor = {
    process: async (input, _params, outputPath): Promise<ProcessedImage> => {
      await fs.writeFile(outputPath, "output");
      processed.push({ input: input.path, output: outputPath });
      return {
        outputPath,
        originalSize: input.size,
        processedSize: 6,
        success: true,
      };
    },
    processBatch: async () => ({ successful: [], failed: [], totalTime: 0 }),
  };
  return { processor, processed };
}

describe("FolderWatcher", () => {
  let root: string;
  let watchDir: string;
  let outDir: string;
  let watcher: FolderWatcher | null = null;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "batchpic-watch-"));
    watchDir = path.join(root, "incoming");
    outDir = path.join(root, "processed");
    await fs.mkdir(watchDir, { recursive: true });
    await fs.mkdir(outDir, { recursive: true });
  });

  afterEach(async () => {
    watcher?.stop();
    watcher = null;
    // sharp 会持有输入文件的句柄，Windows 上直接 fs.rm 会 EBUSY 并耗到超时；
    // removeDirWithRetry 先释放 sharp 缓存再带重试删除，失败降级为警告。
    await removeDirWithRetry(root);
  }, 15000);

  async function startWatching(overrides: Partial<{ outputPath: string }> = {}) {
    const { processor, processed } = createRecordingProcessor();
    const events: FolderWatchEvent[] = [];

    watcher = new FolderWatcher(processor);
    watcher.on(FOLDER_WATCH_EVENT, (event: FolderWatchEvent) =>
      events.push(event),
    );

    await watcher.start({
      watchPath: watchDir,
      outputPath: overrides.outputPath ?? outDir,
      params: DEFAULT_PARAMS,
      debounceMs: DEBOUNCE_MS,
      stableRecheckMs: STABLE_RECHECK_MS,
    });

    return { processed, events };
  }

  describe("lifecycle", () => {
    it("reports the watched paths while running", async () => {
      await startWatching();

      const status = watcher!.getStatus();
      expect(status.isWatching).toBe(true);
      expect(status.watchPath).toBe(watchDir);
      expect(status.outputPath).toBe(outDir);
    });

    it("reports idle after stop", async () => {
      await startWatching();
      watcher!.stop();

      const status = watcher!.getStatus();
      expect(status.isWatching).toBe(false);
      expect(status.watchPath).toBeNull();
    });

    it("throws when the watched directory does not exist", async () => {
      const { processor } = createRecordingProcessor();
      watcher = new FolderWatcher(processor);

      await expect(
        watcher.start({
          watchPath: path.join(root, "missing"),
          outputPath: outDir,
          params: DEFAULT_PARAMS,
        }),
      ).rejects.toThrow(/监听目录不存在/);
    });

    it("creates the output directory when missing", async () => {
      const { processor } = createRecordingProcessor();
      watcher = new FolderWatcher(processor);
      const freshOutput = path.join(root, "not-yet-created");

      await watcher.start({
        watchPath: watchDir,
        outputPath: freshOutput,
        params: DEFAULT_PARAMS,
      });

      const stats = await fs.stat(freshOutput);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe("detection", () => {
    it("processes a newly added image", async () => {
      const { processed } = await startWatching();

      await fs.writeFile(path.join(watchDir, "a.png"), await makePngBuffer());
      await waitFor(() => processed.length === 1);

      expect(processed[0].input).toBe(path.join(watchDir, "a.png"));
      expect(processed[0].output).toBe(path.join(outDir, "a.png"));
    });

    it("keeps the base name but follows the configured target format", async () => {
      const { processor, processed } = createRecordingProcessor();
      watcher = new FolderWatcher(processor);

      await watcher.start({
        watchPath: watchDir,
        outputPath: outDir,
        params: { format: "webp" },
        debounceMs: DEBOUNCE_MS,
        stableRecheckMs: STABLE_RECHECK_MS,
      });

      await fs.writeFile(path.join(watchDir, "shot.png"), await makePngBuffer());
      await waitFor(() => processed.length === 1);

      expect(processed[0].output).toBe(path.join(outDir, "shot.webp"));
    });

    it("emits a success event with sizes", async () => {
      const { events } = await startWatching();

      await fs.writeFile(path.join(watchDir, "a.png"), await makePngBuffer());
      await waitFor(() => events.length === 1);

      expect(events[0].success).toBe(true);
      expect(events[0].outputSize).toBeGreaterThan(0);
      expect(events[0].sourceFile).toBe(path.join(watchDir, "a.png"));
      expect(events[0].timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it("collapses a burst of writes into a single processing run", async () => {
      const { processed } = await startWatching();
      const target = path.join(watchDir, "burst.png");
      const buffer = await makePngBuffer();

      for (let attempt = 0; attempt < 3; attempt++) {
        await fs.writeFile(target, buffer);
        await sleep(15);
      }

      await waitFor(() => processed.length >= 1);
      // Give any spurious extra runs a chance to show up before asserting.
      await sleep(300);

      expect(processed).toHaveLength(1);
    });
  });

  describe("filtering", () => {
    it("ignores unsupported extensions", async () => {
      const { processed } = await startWatching();

      await fs.writeFile(path.join(watchDir, "notes.txt"), "hello");
      await fs.writeFile(path.join(watchDir, "anim.gif"), "GIF89a");
      await sleep(400);

      expect(processed).toHaveLength(0);
    });

    it("ignores partially downloaded files", async () => {
      const { processed } = await startWatching();

      await fs.writeFile(path.join(watchDir, "photo.png.crdownload"), "partial");
      await sleep(400);

      expect(processed).toHaveLength(0);
    });

    it("rejects the output folder being the same as the watched folder", async () => {
      // Regression guard: this configuration used to be accepted and then
      // silently dropped every file, because the "ignore our own output" rule
      // matched the source files too. The watch looked started but did nothing.
      const { processor } = createRecordingProcessor();
      watcher = new FolderWatcher(processor);

      await expect(
        watcher.start({
          watchPath: watchDir,
          outputPath: watchDir,
          params: DEFAULT_PARAMS,
          debounceMs: DEBOUNCE_MS,
          stableRecheckMs: STABLE_RECHECK_MS,
        }),
      ).rejects.toThrow(/不能相同/);
    });

    it("processes files when the output folder is nested in the watched folder", async () => {
      // Nested is fine: watching is non-recursive, so output written into the
      // subfolder never comes back as an event.
      const nestedOutput = path.join(watchDir, "out");
      const { processed } = await startWatching({ outputPath: nestedOutput });

      await fs.writeFile(path.join(watchDir, "a.png"), await makePngBuffer());
      await waitFor(() => processed.length === 1);

      expect(processed[0].output).toBe(path.join(nestedOutput, "a.png"));

      // Were the nested output picked up again, this would be 2.
      await sleep(300);
      expect(processed).toHaveLength(1);
    });
  });

  describe("output claims", () => {
    it("blocks a second source from overwriting the same output target", async () => {
      // Regression guard: the watch path used to call the processor directly,
      // bypassing the claim check that the manual batch applies, so logo.jpg
      // and logo.png would silently overwrite each other's logo.webp.
      const events: FolderWatchEvent[] = [];
      const { processor, processed } = createRecordingProcessor();
      watcher = new FolderWatcher(processor);
      watcher.on(FOLDER_WATCH_EVENT, (event: FolderWatchEvent) =>
        events.push(event),
      );

      await watcher.start({
        watchPath: watchDir,
        outputPath: outDir,
        params: { format: "webp" },
        debounceMs: DEBOUNCE_MS,
        stableRecheckMs: STABLE_RECHECK_MS,
      });

      // Both resolve to <out>/logo.webp.
      await fs.writeFile(path.join(watchDir, "logo.png"), await makePngBuffer());
      await waitFor(() => events.length === 1);

      await fs.writeFile(path.join(watchDir, "logo.jpg"), await makeJpegBuffer());
      await waitFor(() => events.length === 2);

      const blocked = events.find((event) => !event.success);
      expect(blocked).toBeDefined();
      expect(blocked!.error).toMatch(/同一路径/);
      // Only the first source actually reached the processor.
      expect(processed).toHaveLength(1);
    });

    it("re-processing the same source stays idempotent", async () => {
      const { processed } = await startWatching();
      const target = path.join(watchDir, "same.png");
      const buffer = await makePngBuffer();

      await fs.writeFile(target, buffer);
      await waitFor(() => processed.length === 1);

      // Re-copying one file into the watched folder must not be refused as a
      // conflict with itself.
      await sleep(150);
      await fs.writeFile(target, buffer);
      await waitFor(() => processed.length === 2);

      expect(processed[0].output).toBe(processed[1].output);
    });
  });

  describe("failure handling", () => {
    it("emits a failure event when processing throws", async () => {
      const events: FolderWatchEvent[] = [];
      const processor: ImageProcessor = {
        process: async () => {
          throw new Error("编码失败");
        },
        processBatch: async () => ({
          successful: [],
          failed: [],
          totalTime: 0,
        }),
      };

      watcher = new FolderWatcher(processor);
      watcher.on(FOLDER_WATCH_EVENT, (event: FolderWatchEvent) =>
        events.push(event),
      );
      await watcher.start({
        watchPath: watchDir,
        outputPath: outDir,
        params: DEFAULT_PARAMS,
        debounceMs: DEBOUNCE_MS,
        stableRecheckMs: STABLE_RECHECK_MS,
      });

      // Valid PNG so metadata parsing succeeds and we reach the processor.
      await fs.writeFile(path.join(watchDir, "a.png"), await makePngBuffer());
      await waitFor(() => events.length === 1);

      expect(events[0].success).toBe(false);
      expect(events[0].error).toContain("编码失败");
    });

    it("stops delivering results once stopped", async () => {
      const { processed } = await startWatching();
      watcher!.stop();

      await fs.writeFile(path.join(watchDir, "later.png"), await makePngBuffer());
      await sleep(400);

      expect(processed).toHaveLength(0);
    });
  });
});
