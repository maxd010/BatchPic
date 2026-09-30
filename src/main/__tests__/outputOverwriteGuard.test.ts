/**
 * Output overwrite guard regression tests (P0-2)
 *
 * 缺陷：换格式输出写回源目录、只换扩展名，且**没有任何存在性探测** ——
 * 用户自己的文件会被转换结果无声吃掉。实测：64x64 / 200B 的 logo.png
 * 被 400x400 / 272B 的转换结果覆盖，文件名与位置都不变，无任何提示。
 *
 * 现在的规则（用户拍板）：
 *   - 默认不覆盖。换格式写回源目录时目标已存在 → 跳过并计入 failed，原文件不动。
 *   - 勾选「允许覆盖同名文件」（`params.overwriteExisting === true`）→ 恢复覆盖。
 *   - `{folder}-processed` 是应用自己的产物目录，照常覆盖 —— 重复导出保持幂等，
 *     不会累积 `-1` / `-2` 副本。
 *   - 同一次运行内两个不同输入争抢同一目标路径 → 后者跳过并点名占用者。
 *     这一条与开关无关：用户开的是「覆盖既有文件」，不是「允许自己的两件产物互相覆盖」。
 *
 * 取证：`test-temp/review/p0-2-*.txt`
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';
import { SharpImageProcessor } from '../ImageProcessor';
import { ImageFile, ProcessingParams } from '../types';
import { removeDirWithRetry } from '../../test-support/fsCleanup';

// `processBatch` 用 `await import("p-limit")` 做并发限流，而本环境里 p-limit@7 是
// 纯 ESM，jest 的运行时吃不下它（`SyntaxError: Cannot use import statement outside a
// module`），于是 processBatch 一进来就抛。
// 这里把限流器换成直通实现：本套件验证的是输出路径冲突判定，不是并发调度；直通不
// 影响断言有效性 —— 每个任务在第一次 await 之前同步认领目标路径，顺序仍等于输入顺序。
// 该 require 发生在 processBatch 运行期（不是模块加载期），所以不依赖 jest.mock 提升。
jest.mock('p-limit', () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

const SRC_W = 120;
const SRC_H = 80;

/** 尺寸刻意与源图不同，便于判断既有文件有没有被换掉。 */
const EXISTING_W = 7;
const EXISTING_H = 7;

/** 跨格式：jpg -> png，会写回源目录、只换扩展名。 */
const CONVERT_TO_PNG: ProcessingParams = {
  format: 'png',
  compression: { mode: 'quality', value: 70, removeMetadata: true },
};

/** 造一张源图，返回不带 sourceRoot 的 ImageFile。 */
async function makeInput(
  filePath: string,
  format: 'jpg' | 'png' | 'webp' = 'jpg',
  sourceRoot?: string,
): Promise<ImageFile> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  await sharp({
    create: {
      width: SRC_W,
      height: SRC_H,
      channels: 3,
      background: { r: 20, g: 140, b: 90 },
    },
  })
    .toFormat(format)
    .toFile(filePath);

  const stats = await fs.stat(filePath);

  return {
    path: filePath,
    relativePath: path.basename(filePath),
    format,
    size: stats.size,
    dimensions: { width: SRC_W, height: SRC_H },
    sourceRoot,
  };
}

/** 造一张"用户既有文件"。 */
async function makeExisting(
  filePath: string,
  format: 'jpg' | 'png' | 'webp' = 'png',
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  await sharp({
    create: {
      width: EXISTING_W,
      height: EXISTING_H,
      channels: 3,
      background: { r: 240, g: 240, b: 20 },
    },
  })
    .toFormat(format)
    .toFile(filePath);
}

async function dims(filePath: string) {
  const meta = await sharp(filePath).metadata();
  return { width: meta.width, height: meta.height, format: meta.format };
}

describe('output overwrite guard (P0-2)', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batchpic-overwrite-'));
  });

  afterAll(async () => {
    // 本套件会产出 .webp / .png，Windows 下必须走带重试的清理，
    // 否则套件会在 afterAll 因 EBUSY 判失败。
    await removeDirWithRetry(tempDir);
  });

  it('skips instead of replacing an existing file when overwriting is off', async () => {
    const dir = path.join(tempDir, 'skip-existing');
    const input = await makeInput(path.join(dir, 'logo.jpg'), 'jpg');
    const target = path.join(dir, 'logo.png');
    await makeExisting(target, 'png');

    const before = await fs.readFile(target);

    const processor = new SharpImageProcessor();
    const result = await processor.processBatch(
      [input],
      CONVERT_TO_PNG,
      path.join(tempDir, 'unused-root'),
    );

    expect(result.successful.length).toBe(0);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].success).toBe(false);
    expect(result.failed[0].processedSize).toBe(0);
    expect(result.failed[0].error).toContain('已存在');

    // 用户的文件一个字节都没动
    const after = await fs.readFile(target);
    expect(after.equals(before)).toBe(true);
    expect(await dims(target)).toEqual({
      width: EXISTING_W,
      height: EXISTING_H,
      format: 'png',
    });
  });

  it('replaces the existing file once the user opts in', async () => {
    const dir = path.join(tempDir, 'allow-overwrite');
    const input = await makeInput(path.join(dir, 'logo.jpg'), 'jpg');
    const target = path.join(dir, 'logo.png');
    await makeExisting(target, 'png');

    const processor = new SharpImageProcessor();
    const result = await processor.processBatch(
      [input],
      { ...CONVERT_TO_PNG, overwriteExisting: true },
      path.join(tempDir, 'unused-root'),
    );

    expect(result.failed.length).toBe(0);
    expect(result.successful.length).toBe(1);

    // 这次确实被换成了源图的尺寸
    expect(await dims(target)).toEqual({
      width: SRC_W,
      height: SRC_H,
      format: 'png',
    });
  });

  it('writes normally when nothing is in the way', async () => {
    const dir = path.join(tempDir, 'no-collision');
    const input = await makeInput(path.join(dir, 'photo.jpg'), 'jpg');

    const processor = new SharpImageProcessor();
    const result = await processor.processBatch(
      [input],
      CONVERT_TO_PNG,
      path.join(tempDir, 'unused-root'),
    );

    expect(result.failed.length).toBe(0);
    expect(result.successful.length).toBe(1);

    const meta = await sharp(path.join(dir, 'photo.png')).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(SRC_W);
  });

  it('keeps re-exporting into the {folder}-processed directory idempotent', async () => {
    const sourceRoot = path.join(tempDir, 'idempotent-src');
    const input = await makeInput(
      path.join(sourceRoot, 'shot.jpg'),
      'jpg',
      sourceRoot,
    );
    const processedDir = path.join(tempDir, 'idempotent-src-processed');
    const sameFormat: ProcessingParams = {
      format: 'jpg',
      compression: { mode: 'quality', value: 70, removeMetadata: true },
    };

    const processor = new SharpImageProcessor();

    const first = await processor.processBatch(
      [input],
      sameFormat,
      path.join(tempDir, 'unused-root'),
    );
    expect(first.successful.length).toBe(1);
    expect(first.failed.length).toBe(0);

    const outPath = path.join(processedDir, 'shot.jpg');
    const firstBytes = await fs.readFile(outPath);

    // 第二次导出：产物目录是应用自己的地盘，必须照常覆盖而不是跳过
    const second = await processor.processBatch(
      [input],
      sameFormat,
      path.join(tempDir, 'unused-root'),
    );
    expect(second.failed.length).toBe(0);
    expect(second.successful.length).toBe(1);

    const secondBytes = await fs.readFile(outPath);
    expect(secondBytes.equals(firstBytes)).toBe(true);

    // 没有累积 -1 / -2 副本
    expect(await fs.readdir(processedDir)).toEqual(['shot.jpg']);
  });

  it('flags a same-target collision between two different inputs in one run', async () => {
    const dir = path.join(tempDir, 'in-run-collision');
    const jpg = await makeInput(path.join(dir, 'logo.jpg'), 'jpg');
    const png = await makeInput(path.join(dir, 'logo.png'), 'png');

    // 两张都转 webp -> 都想要 logo.webp
    const params: ProcessingParams = {
      format: 'webp',
      compression: { mode: 'quality', value: 70, removeMetadata: true },
    };

    const processor = new SharpImageProcessor();
    const result = await processor.processBatch(
      [jpg, png],
      params,
      path.join(tempDir, 'unused-root'),
    );

    // 谁先认领取决于并发调度，所以只断言"恰好一张被跳过"、不假定是哪张
    expect(result.successful.length).toBe(1);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].error).toContain('同一路径');

    const names = await fs.readdir(dir);
    expect(names).toContain('logo.webp');
  });

  it('still flags an in-run same-target collision when overwriting is enabled', async () => {
    const dir = path.join(tempDir, 'in-run-collision-overwrite');
    const jpg = await makeInput(path.join(dir, 'pic.jpg'), 'jpg');
    const png = await makeInput(path.join(dir, 'pic.png'), 'png');

    const params: ProcessingParams = {
      format: 'webp',
      compression: { mode: 'quality', value: 70, removeMetadata: true },
      // 「允许覆盖」指的是覆盖既有文件，不是允许自己的两件产物互相覆盖
      overwriteExisting: true,
    };

    const processor = new SharpImageProcessor();
    const result = await processor.processBatch(
      [jpg, png],
      params,
      path.join(tempDir, 'unused-root'),
    );

    expect(result.successful.length).toBe(1);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].error).toContain('同一路径');
  });

  it('treats the same input appearing twice as one target, not a collision', async () => {
    const dir = path.join(tempDir, 'duplicate-input');
    const input = await makeInput(path.join(dir, 'dup.jpg'), 'jpg');

    const params: ProcessingParams = {
      format: 'webp',
      compression: { mode: 'quality', value: 70, removeMetadata: true },
    };

    const processor = new SharpImageProcessor();
    const result = await processor.processBatch(
      [input, { ...input }],
      params,
      path.join(tempDir, 'unused-root'),
    );

    // 同一个文件被拖两次，写出的是逐字节相同的内容，算不上冲突
    expect(result.failed.length).toBe(0);
    expect(result.successful.length).toBe(2);
  });

  // 大小写不敏感是 Windows / macOS 的文件系统行为，Linux 上 LOGO.png 与
  // logo.png 是两个不同的文件，这条断言不成立。
  const itCaseInsensitive = process.platform === 'win32' ? it : it.skip;

  itCaseInsensitive(
    'treats LOGO.png and logo.png as the same target on case-insensitive filesystems',
    async () => {
      const dir = path.join(tempDir, 'case-insensitive');
      const input = await makeInput(path.join(dir, 'LOGO.jpg'), 'jpg');
      const target = path.join(dir, 'logo.png');
      await makeExisting(target, 'png');

      const before = await fs.readFile(target);

      const processor = new SharpImageProcessor();
      const result = await processor.processBatch(
        [input],
        CONVERT_TO_PNG,
        path.join(tempDir, 'unused-root'),
      );

      expect(result.failed.length).toBe(1);
      expect(result.successful.length).toBe(0);

      const after = await fs.readFile(target);
      expect(after.equals(before)).toBe(true);
    },
  );
});
