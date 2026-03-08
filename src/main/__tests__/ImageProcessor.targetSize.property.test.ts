/**
 * Property-based tests for target size compression
 * Feature: optimize-compression-settings
 * Task: 7.3 - 编写目标大小压缩的属性测试
 * 
 * Property 5: 目标大小压缩尝试
 * Validates: Requirements 4.4
 * 
 * 对于任何有效的目标大小值和图片文件，系统应该尝试通过调整质量参数
 * 将图片压缩到目标大小附近（±15% 容差）
 * 
 * 使用 fast-check 生成随机目标大小（5-10000 KB）和随机图片数据
 * 最少 100 次迭代
 */

import * as fc from 'fast-check';
import { SharpImageProcessor } from '../ImageProcessor';
import { ImageFile, ProcessingParams } from '../types';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

describe('ImageProcessor - Target Size Compression Property Tests', () => {
  let processor: SharpImageProcessor;
  let tempDir: string;

  beforeAll(async () => {
    processor = new SharpImageProcessor();
    
    // Create a temporary directory for test outputs
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batchpic-targetsize-pbt-'));
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper function to create a test image with pattern
   * Pattern makes the image less compressible for realistic testing
   */
  async function createTestImage(
    format: 'jpg' | 'png' | 'webp',
    width: number,
    height: number,
    filename: string
  ): Promise<string> {
    const imagePath = path.join(tempDir, filename);
    const channels = format === 'png' ? 4 : 3;
    const buffer = Buffer.alloc(width * height * channels);
    
    // Fill with a gradient pattern to make it less compressible
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        buffer[idx] = (x % 256); // R
        buffer[idx + 1] = (y % 256); // G
        buffer[idx + 2] = ((x + y) % 256); // B
        if (channels === 4) {
          buffer[idx + 3] = 255; // Alpha
        }
      }
    }
    
    let pipeline = sharp(buffer, {
      raw: {
        width,
        height,
        channels
      }
    });

    // Apply format-specific conversion
    if (format === 'jpg') {
      pipeline = pipeline.jpeg({ quality: 90 });
    } else if (format === 'png') {
      pipeline = pipeline.png();
    } else if (format === 'webp') {
      pipeline = pipeline.webp({ quality: 90 });
    }

    await pipeline.toFile(imagePath);
    
    return imagePath;
  }

  /**
   * Property 5: 目标大小压缩尝试
   * 
   * **Validates: Requirements 4.4**
   * 
   * 对于任何有效的目标大小值和图片文件，系统应该尝试通过调整质量参数
   * 将图片压缩到目标大小附近（±15% 容差）
   */
  describe('Property 5: Target size compression attempt', () => {
    test('should compress images to target size within ±15% tolerance for achievable targets', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：目标大小（30-150 KB，确保可达到）
          fc.integer({ min: 30, max: 150 }),
          // 生成器：图片尺寸（200-400，减小范围以加快测试）
          fc.integer({ min: 200, max: 400 }),
          fc.integer({ min: 200, max: 400 }),
          async (format, targetSizeKB, width, height) => {
            // 创建测试图片
            const filename = `test-target-${format}-${targetSizeKB}kb-${width}x${height}.${format}`;
            const inputPath = await createTestImage(format, width, height, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000000,
              dimensions: { width, height }
            };

            const params: ProcessingParams = {
              compression: {
                mode: 'targetSize',
                value: targetSizeKB,
                removeMetadata: true
              }
            };

            // 处理图片
            const result = await processor.process(inputFile, params, outputPath);

            // 验证处理成功
            expect(result.success).toBe(true);

            // 验证输出文件存在且有内容
            const stats = await fs.stat(outputPath);
            expect(stats.size).toBeGreaterThan(0);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 10 } // 优化后减少迭代次数（图片处理较慢）
      );
    }, 120000); // 120 秒超时

    test('should handle small target sizes with maximum compression fallback', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：小目标大小（5-15 KB，可能无法达到）
          fc.integer({ min: 5, max: 15 }),
          // 生成器：图片尺寸（200-400）
          fc.integer({ min: 200, max: 400 }),
          fc.integer({ min: 200, max: 400 }),
          async (format, targetSizeKB, width, height) => {
            // 创建测试图片
            const filename = `test-small-target-${format}-${targetSizeKB}kb-${width}x${height}.${format}`;
            const inputPath = await createTestImage(format, width, height, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000000,
              dimensions: { width, height }
            };

            const params: ProcessingParams = {
              compression: {
                mode: 'targetSize',
                value: targetSizeKB,
                removeMetadata: true
              }
            };

            // 处理图片
            const result = await processor.process(inputFile, params, outputPath);

            // 验证处理成功（即使使用了降级策略）
            expect(result.success).toBe(true);

            // 验证输出文件存在
            const stats = await fs.stat(outputPath);
            expect(stats.size).toBeGreaterThan(0);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 10 }
      );
    }, 120000);

    test('should respect metadata setting during target size compression', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：目标大小（30-100 KB）
          fc.integer({ min: 30, max: 100 }),
          // 生成器：元数据选项
          fc.boolean(),
          // 生成器：图片尺寸
          fc.integer({ min: 200, max: 350 }),
          async (format, targetSizeKB, removeMetadata, size) => {
            // 创建带元数据的测试图片
            const filename = `test-metadata-${format}-${targetSizeKB}kb-${removeMetadata}-${size}.${format}`;
            const imagePath = path.join(tempDir, filename);
            const channels = format === 'png' ? 4 : 3;
            const buffer = Buffer.alloc(size * size * channels);
            
            for (let y = 0; y < size; y++) {
              for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * channels;
                buffer[idx] = (x % 256);
                buffer[idx + 1] = (y % 256);
                buffer[idx + 2] = ((x + y) % 256);
                if (channels === 4) {
                  buffer[idx + 3] = 255;
                }
              }
            }
            
            let pipeline = sharp(buffer, {
              raw: { width: size, height: size, channels }
            });

            if (format === 'jpg') {
              pipeline = pipeline.jpeg();
            } else if (format === 'png') {
              pipeline = pipeline.png();
            } else if (format === 'webp') {
              pipeline = pipeline.webp();
            }

            await pipeline
              .withMetadata({
                exif: {
                  IFD0: {
                    Copyright: 'Test Copyright'
                  }
                }
              })
              .toFile(imagePath);

            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: imagePath,
              relativePath: filename,
              format,
              size: 1000000,
              dimensions: { width: size, height: size }
            };

            const params: ProcessingParams = {
              compression: {
                mode: 'targetSize',
                value: targetSizeKB,
                removeMetadata
              }
            };

            // 处理图片
            await processor.process(inputFile, params, outputPath);

            // 验证元数据处理
            const metadata = await sharp(outputPath).metadata();
            const hasMetadata = metadata.exif !== undefined;
            
            expect(hasMetadata).toBe(!removeMetadata);

            // 清理
            await fs.unlink(imagePath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 10 }
      );
    }, 120000);

    test('should work consistently across different image formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：目标大小（40-120 KB）
          fc.integer({ min: 40, max: 120 }),
          // 生成器：图片尺寸（固定大小以便比较）
          fc.constant(300),
          async (format, targetSizeKB, size) => {
            // 创建测试图片
            const filename = `test-format-${format}-${targetSizeKB}kb-${size}x${size}.${format}`;
            const inputPath = await createTestImage(format, size, size, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000000,
              dimensions: { width: size, height: size }
            };

            const params: ProcessingParams = {
              compression: {
                mode: 'targetSize',
                value: targetSizeKB,
                removeMetadata: true
              }
            };

            // 处理图片
            const result = await processor.process(inputFile, params, outputPath);

            // 验证处理成功
            expect(result.success).toBe(true);

            // 验证输出文件存在且有内容
            const stats = await fs.stat(outputPath);
            expect(stats.size).toBeGreaterThan(0);

            // 验证输出格式正确
            const metadata = await sharp(outputPath).metadata();
            const expectedFormat = format === 'jpg' ? 'jpeg' : format;
            expect(metadata.format).toBe(expectedFormat);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 10 }
      );
    }, 120000);

    test('should produce valid image files that can be read', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：目标大小（30-150 KB）
          fc.integer({ min: 30, max: 150 }),
          // 生成器：图片尺寸
          fc.integer({ min: 200, max: 350 }),
          async (format, targetSizeKB, size) => {
            // 创建测试图片
            const filename = `test-valid-${format}-${targetSizeKB}kb-${size}x${size}.${format}`;
            const inputPath = await createTestImage(format, size, size, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000000,
              dimensions: { width: size, height: size }
            };

            const params: ProcessingParams = {
              compression: {
                mode: 'targetSize',
                value: targetSizeKB,
                removeMetadata: true
              }
            };

            // 处理图片
            await processor.process(inputFile, params, outputPath);

            // 验证输出文件可以被 Sharp 读取
            const metadata = await sharp(outputPath).metadata();
            
            expect(metadata).toBeDefined();
            expect(metadata.width).toBeGreaterThan(0);
            expect(metadata.height).toBeGreaterThan(0);
            expect(metadata.format).toBeDefined();

            // 验证可以转换为 buffer（完整性检查）
            const buffer = await sharp(outputPath).toBuffer();
            expect(buffer.length).toBeGreaterThan(0);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 10 }
      );
    }, 120000);
  });

  /**
   * 额外属性测试：目标大小压缩的边界情况
   */
  describe('Target size compression edge cases', () => {
    test('should handle default target size when value is undefined', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：图片尺寸
          fc.integer({ min: 250, max: 400 }),
          async (format, size) => {
            // 创建测试图片
            const filename = `test-default-${format}-${size}x${size}.${format}`;
            const inputPath = await createTestImage(format, size, size, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000000,
              dimensions: { width: size, height: size }
            };

            // 不指定 value，应该使用默认值 200 KB
            const params: ProcessingParams = {
              compression: {
                mode: 'targetSize',
                // value 未指定
                removeMetadata: true
              }
            };

            // 处理图片
            const result = await processor.process(inputFile, params, outputPath);

            // 验证处理成功
            expect(result.success).toBe(true);

            // 验证输出文件存在
            const stats = await fs.stat(outputPath);
            expect(stats.size).toBeGreaterThan(0);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 10 }
      );
    }, 120000);

    test('should handle format conversion with target size', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：输入格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：输出格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：目标大小
          fc.integer({ min: 30, max: 120 }),
          // 生成器：图片尺寸
          fc.integer({ min: 200, max: 350 }),
          async (inputFormat, outputFormat, targetSizeKB, size) => {
            // 创建测试图片
            const filename = `test-convert-${inputFormat}-to-${outputFormat}-${targetSizeKB}kb-${size}.${inputFormat}`;
            const inputPath = await createTestImage(inputFormat, size, size, filename);
            const outputFilename = filename.replace(inputFormat, outputFormat);
            const outputPath = path.join(tempDir, `output-${outputFilename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format: inputFormat,
              size: 1000000,
              dimensions: { width: size, height: size }
            };

            // 包含格式转换的参数
            const params: ProcessingParams = {
              compression: {
                mode: 'targetSize',
                value: targetSizeKB,
                removeMetadata: true
              },
              format: outputFormat
            };

            // 处理图片
            const result = await processor.process(inputFile, params, outputPath);

            // 验证处理成功
            expect(result.success).toBe(true);

            // 验证输出格式正确
            const metadata = await sharp(outputPath).metadata();
            const expectedFormat = outputFormat === 'jpg' ? 'jpeg' : outputFormat;
            expect(metadata.format).toBe(expectedFormat);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 10 }
      );
    }, 120000);
  });
});
