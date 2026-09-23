/**
 * EXIF orientation regression tests (P0-1)
 *
 * 缺陷：加工管线没有 .rotate()，而默认又剥离元数据，于是手机竖拍照片导出后
 * 躺倒 90°；同时 FileScanner 落库的是未旋转的像素尺寸，导致 resize 的
 * longEdge / shortEdge 选错轴。
 *
 * 覆盖三层：
 *   - visualDimensions 纯函数（orientation 1-8 全表）
 *   - FileScanner 把 Orientation 折算进 dimensions
 *   - ImageProcessor 把方向烧进像素（含保留元数据时的标记归一化、无方向图的不回归）
 *
 * 取证：test-temp/review/probe-rotate.txt、verify-2026-09-23.txt
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';
import { FileScannerImpl } from '../FileScanner';
import { SharpImageProcessor } from '../ImageProcessor';
import { visualDimensions } from '../processors/exif';
import { ProcessingParams } from '../types';
import { removeDirWithRetry } from '../../test-support/fsCleanup';

const RAW_W = 200;
const RAW_H = 100;

/** 造一张"手机照片"：像素 RAW_W×RAW_H，带指定 EXIF Orientation。 */
async function createPhoto(
  filePath: string,
  width: number,
  height: number,
  orientation?: number,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  let pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 60, b: 60 },
    },
  });

  if (orientation !== undefined) {
    pipeline = pipeline.withMetadata({ orientation });
  }

  await pipeline.jpeg({ quality: 90 }).toFile(filePath);
}

describe('EXIF orientation', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batchpic-exif-'));
  });

  afterAll(async () => {
    // 本套件会产出 .webp，Windows 下必须走带重试的清理，否则套件在 afterAll 判失败
    await removeDirWithRetry(tempDir);
  });

  describe('visualDimensions', () => {
    it('swaps the axes for orientation 5-8 and only those', () => {
      // 1-4 是正立或镜像，宽高不变；5-8 含 90°/270° 旋转，宽高互换
      const expectations: Record<number, { width: number; height: number }> = {
        1: { width: RAW_W, height: RAW_H },
        2: { width: RAW_W, height: RAW_H },
        3: { width: RAW_W, height: RAW_H },
        4: { width: RAW_W, height: RAW_H },
        5: { width: RAW_H, height: RAW_W },
        6: { width: RAW_H, height: RAW_W },
        7: { width: RAW_H, height: RAW_W },
        8: { width: RAW_H, height: RAW_W },
      };

      for (const [orientation, expected] of Object.entries(expectations)) {
        expect({
          orientation,
          dimensions: visualDimensions(RAW_W, RAW_H, Number(orientation)),
        }).toEqual({ orientation, dimensions: expected });
      }
    });

    it('leaves dimensions untouched when the tag is absent', () => {
      expect(visualDimensions(RAW_W, RAW_H)).toEqual({
        width: RAW_W,
        height: RAW_H,
      });
    });
  });

  describe('FileScanner', () => {
    it('records portrait dimensions for an orientation=6 photo', async () => {
      const scanner = new FileScannerImpl();
      const photoPath = path.join(tempDir, 'scan-portrait.jpg');
      await createPhoto(photoPath, RAW_W, RAW_H, 6);

      const [file] = await scanner.scan([photoPath]);

      // 原始像素 200x100（横），EXIF 要求转 90° → 用户看到的是 100x200（竖）
      expect(file.dimensions).toEqual({ width: RAW_H, height: RAW_W });
    });

    it('keeps raw dimensions when there is no orientation tag', async () => {
      const scanner = new FileScannerImpl();
      const photoPath = path.join(tempDir, 'scan-plain.jpg');
      await createPhoto(photoPath, RAW_W, RAW_H);

      const [file] = await scanner.scan([photoPath]);

      expect(file.dimensions).toEqual({ width: RAW_W, height: RAW_H });
    });
  });

  describe('ImageProcessor', () => {
    let processor: SharpImageProcessor;
    let scanner: FileScannerImpl;

    beforeAll(() => {
      processor = new SharpImageProcessor();
      scanner = new FileScannerImpl();
    });

    const qualityParams: ProcessingParams = {
      compression: { mode: 'quality', value: 85 },
    };

    it('exports a portrait result for a portrait phone photo (longEdge)', async () => {
      const photoPath = path.join(tempDir, 'proc-longedge.jpg');
      await createPhoto(photoPath, RAW_W, RAW_H, 6);

      // 走真实链路：扫描 → 加工，两个修复必须一致才成立
      const [input] = await scanner.scan([photoPath]);
      const outputPath = path.join(tempDir, 'out-longedge.jpg');

      const result = await processor.process(
        input,
        {
          ...qualityParams,
          resize: { mode: 'longEdge', value: 100 },
        },
        outputPath,
      );

      expect(result.success).toBe(true);

      const meta = await sharp(outputPath).metadata();
      // 视觉尺寸 100x200（竖），限制长边 100 → 50x100；若选错轴会得到 100x50
      expect({ width: meta.width, height: meta.height }).toEqual({
        width: 50,
        height: 100,
      });
      expect(meta.orientation).toBeUndefined();
    });

    it('bakes orientation into pixels even without any resize', async () => {
      const photoPath = path.join(tempDir, 'proc-noresize.jpg');
      await createPhoto(photoPath, RAW_W, RAW_H, 6);

      const [input] = await scanner.scan([photoPath]);
      const outputPath = path.join(tempDir, 'out-noresize.jpg');

      const result = await processor.process(input, qualityParams, outputPath);

      expect(result.success).toBe(true);

      const meta = await sharp(outputPath).metadata();
      expect({ width: meta.width, height: meta.height }).toEqual({
        width: RAW_H,
        height: RAW_W,
      });
    });

    it('normalises the orientation tag when metadata is preserved', async () => {
      const photoPath = path.join(tempDir, 'proc-keepmeta.jpg');
      await createPhoto(photoPath, RAW_W, RAW_H, 6);

      const [input] = await scanner.scan([photoPath]);
      const outputPath = path.join(tempDir, 'out-keepmeta.jpg');

      const result = await processor.process(
        input,
        {
          compression: { mode: 'quality', value: 85, removeMetadata: false },
        },
        outputPath,
      );

      expect(result.success).toBe(true);

      const meta = await sharp(outputPath).metadata();
      expect({ width: meta.width, height: meta.height }).toEqual({
        width: RAW_H,
        height: RAW_W,
      });
      // 像素已经转过，标记必须被归一化（1 或缺失），否则看图软件会再转一次
      expect([undefined, 1]).toContain(meta.orientation);
    });

    it('leaves images without an orientation tag unrotated', async () => {
      const photoPath = path.join(tempDir, 'proc-plain.jpg');
      await createPhoto(photoPath, 300, 150);

      const [input] = await scanner.scan([photoPath]);
      const outputPath = path.join(tempDir, 'out-plain.jpg');

      const result = await processor.process(
        input,
        {
          ...qualityParams,
          resize: { mode: 'longEdge', value: 100 },
        },
        outputPath,
      );

      expect(result.success).toBe(true);

      const meta = await sharp(outputPath).metadata();
      // 300x150 横图，长边 100 → 100x50，不能被误转
      expect({ width: meta.width, height: meta.height }).toEqual({
        width: 100,
        height: 50,
      });
    });

    it(
      'applies orientation in targetSize mode too (buffer round-trip)',
      async () => {
        const photoPath = path.join(tempDir, 'proc-targetsize.jpg');
        await createPhoto(photoPath, RAW_W, RAW_H, 6);

        const [input] = await scanner.scan([photoPath]);
        const outputPath = path.join(tempDir, 'out-targetsize.jpg');

        const result = await processor.process(
          input,
          { compression: { mode: 'targetSize', value: 50 } },
          outputPath,
        );

        expect(result.success).toBe(true);

        const meta = await sharp(outputPath).metadata();
        expect({ width: meta.width, height: meta.height }).toEqual({
          width: RAW_H,
          height: RAW_W,
        });
        expect(meta.orientation).toBeUndefined();
      },
      30000,
    );

    it('applies orientation to webp output', async () => {
      const photoPath = path.join(tempDir, 'proc-webp.jpg');
      await createPhoto(photoPath, RAW_W, RAW_H, 8);

      const [input] = await scanner.scan([photoPath]);
      const outputPath = path.join(tempDir, 'out-webp.webp');

      const result = await processor.process(
        input,
        { ...qualityParams, format: 'webp' },
        outputPath,
      );

      expect(result.success).toBe(true);

      const meta = await sharp(outputPath).metadata();
      // orientation=8 同样是 90° 旋转，视觉尺寸仍是 100x200
      expect({ width: meta.width, height: meta.height }).toEqual({
        width: RAW_H,
        height: RAW_W,
      });
      expect(meta.format).toBe('webp');
    });
  });
});
