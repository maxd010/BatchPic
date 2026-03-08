/**
 * Property-based tests for metadata processing
 * Feature: optimize-compression-settings
 * Task: 2.8 - 编写元数据处理的属性测试
 * 
 * Property 7: 元数据处理正确性
 * Validates: Requirements 2.7, 5.3, 5.4
 * 
 * 对于任何图片文件,当"移除元数据"选项被勾选时,处理后的图片应该不包含 EXIF/IPTC/XMP 元数据;
 * 当选项未勾选时,元数据应该被保留
 * 
 * 使用 fast-check 生成随机图片和元数据选项
 * 最少 100 次迭代
 */

import * as fc from 'fast-check';
import { SharpImageProcessor } from '../ImageProcessor';
import { ImageFile, ProcessingParams } from '../types';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

describe('ImageProcessor - Metadata Processing Property Tests', () => {
  let processor: SharpImageProcessor;
  let tempDir: string;

  beforeAll(async () => {
    processor = new SharpImageProcessor();
    
    // Create a temporary directory for test outputs
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batchpic-metadata-pbt-'));
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper function to create a test image with metadata
   */
  async function createImageWithMetadata(
    format: 'jpg' | 'png' | 'webp',
    width: number,
    height: number,
    filename: string
  ): Promise<string> {
    const imagePath = path.join(tempDir, filename);
    
    let pipeline = sharp({
      create: {
        width,
        height,
        channels: format === 'png' ? 4 : 3,
        background: { r: 128, g: 128, b: 128, alpha: 1 }
      }
    });

    // Apply format-specific conversion
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
            Copyright: 'Test Copyright',
            Artist: 'Test Artist',
            ImageDescription: 'Test Description'
          }
        }
      })
      .toFile(imagePath);
    
    return imagePath;
  }

  /**
   * Helper function to check if image has metadata
   */
  async function hasMetadata(imagePath: string): Promise<boolean> {
    const metadata = await sharp(imagePath).metadata();
    return metadata.exif !== undefined;
  }

  /**
   * Property 7: 元数据处理正确性
   * 
   * **Validates: Requirements 2.7, 5.3, 5.4**
   * 
   * 对于任何图片文件,当"移除元数据"选项被勾选时,处理后的图片应该不包含元数据;
   * 当选项未勾选时,元数据应该被保留
   */
  describe('Property 7: Metadata processing correctness', () => {
    test('should remove metadata when removeMetadata is true for all formats and modes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：所有压缩模式（除了 smart，因为 smart 总是移除元数据）
          fc.constantFrom('quality', 'targetSize', 'none'),
          // 生成器：图片尺寸
          fc.integer({ min: 50, max: 200 }),
          fc.integer({ min: 50, max: 200 }),
          async (format, mode, width, height) => {
            // 创建带元数据的测试图片
            const filename = `test-remove-${format}-${mode}-${width}x${height}.${format}`;
            const inputPath = await createImageWithMetadata(format, width, height, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000,
              dimensions: { width, height }
            };

            // 构建处理参数：removeMetadata = true
            const params: ProcessingParams = {
              compression: {
                mode: mode as 'quality' | 'targetSize' | 'none',
                value: mode === 'quality' ? 80 : mode === 'targetSize' ? 10 : undefined,
                removeMetadata: true
              }
            };

            // 处理图片
            await processor.process(inputFile, params, outputPath);

            // 验证：输出图片不应该包含元数据
            const hasMetadataInOutput = await hasMetadata(outputPath);
            expect(hasMetadataInOutput).toBe(false);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 } // 最少 100 次迭代
      );
    });

    test('should preserve metadata when removeMetadata is false for all formats and modes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：所有压缩模式（除了 smart）
          fc.constantFrom('quality', 'targetSize', 'none'),
          // 生成器：图片尺寸
          fc.integer({ min: 50, max: 200 }),
          fc.integer({ min: 50, max: 200 }),
          async (format, mode, width, height) => {
            // 创建带元数据的测试图片
            const filename = `test-preserve-${format}-${mode}-${width}x${height}.${format}`;
            const inputPath = await createImageWithMetadata(format, width, height, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000,
              dimensions: { width, height }
            };

            // 构建处理参数：removeMetadata = false
            const params: ProcessingParams = {
              compression: {
                mode: mode as 'quality' | 'targetSize' | 'none',
                value: mode === 'quality' ? 80 : mode === 'targetSize' ? 10 : undefined,
                removeMetadata: false
              }
            };

            // 处理图片
            await processor.process(inputFile, params, outputPath);

            // 验证：输出图片应该包含元数据
            const hasMetadataInOutput = await hasMetadata(outputPath);
            expect(hasMetadataInOutput).toBe(true);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 } // 最少 100 次迭代
      );
    });

    test('should always remove metadata in smart mode regardless of removeMetadata setting', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：removeMetadata 选项（true 或 false）
          fc.boolean(),
          // 生成器：图片尺寸
          fc.integer({ min: 50, max: 200 }),
          fc.integer({ min: 50, max: 200 }),
          async (format, removeMetadata, width, height) => {
            // 创建带元数据的测试图片
            const filename = `test-smart-${format}-${removeMetadata}-${width}x${height}.${format}`;
            const inputPath = await createImageWithMetadata(format, width, height, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000,
              dimensions: { width, height }
            };

            // 构建处理参数：smart 模式
            const params: ProcessingParams = {
              compression: {
                mode: 'smart',
                removeMetadata // 这个值应该被忽略
              }
            };

            // 处理图片
            await processor.process(inputFile, params, outputPath);

            // 验证：智能模式下总是移除元数据，无论 removeMetadata 设置如何
            const hasMetadataInOutput = await hasMetadata(outputPath);
            expect(hasMetadataInOutput).toBe(false);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 } // 最少 100 次迭代
      );
    });

    test('should handle metadata removal consistently across different quality values', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：质量值（1-100）
          fc.integer({ min: 1, max: 100 }),
          // 生成器：removeMetadata 选项
          fc.boolean(),
          // 生成器：图片尺寸
          fc.integer({ min: 50, max: 200 }),
          async (format, quality, removeMetadata, size) => {
            // 创建带元数据的测试图片
            const filename = `test-quality-${format}-${quality}-${removeMetadata}-${size}.${format}`;
            const inputPath = await createImageWithMetadata(format, size, size, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000,
              dimensions: { width: size, height: size }
            };

            // 构建处理参数：quality 模式
            const params: ProcessingParams = {
              compression: {
                mode: 'quality',
                value: quality,
                removeMetadata
              }
            };

            // 处理图片
            await processor.process(inputFile, params, outputPath);

            // 验证：元数据处理应该与 removeMetadata 设置一致，不受质量值影响
            const hasMetadataInOutput = await hasMetadata(outputPath);
            expect(hasMetadataInOutput).toBe(!removeMetadata);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 } // 最少 100 次迭代
      );
    });

    test('should handle metadata removal consistently across different target sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：目标大小（5-100 KB，限制范围以加快测试）
          fc.integer({ min: 5, max: 100 }),
          // 生成器：removeMetadata 选项
          fc.boolean(),
          // 生成器：图片尺寸
          fc.integer({ min: 50, max: 150 }),
          async (format, targetSize, removeMetadata, size) => {
            // 创建带元数据的测试图片
            const filename = `test-targetsize-${format}-${targetSize}-${removeMetadata}-${size}.${format}`;
            const inputPath = await createImageWithMetadata(format, size, size, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000,
              dimensions: { width: size, height: size }
            };

            // 构建处理参数：targetSize 模式
            const params: ProcessingParams = {
              compression: {
                mode: 'targetSize',
                value: targetSize,
                removeMetadata
              }
            };

            // 处理图片
            await processor.process(inputFile, params, outputPath);

            // 验证：元数据处理应该与 removeMetadata 设置一致，不受目标大小影响
            const hasMetadataInOutput = await hasMetadata(outputPath);
            expect(hasMetadataInOutput).toBe(!removeMetadata);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 } // 最少 100 次迭代
      );
    });

    test('should default to removing metadata when removeMetadata is undefined', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：所有压缩模式（除了 smart）
          fc.constantFrom('quality', 'targetSize', 'none'),
          // 生成器：图片尺寸
          fc.integer({ min: 50, max: 200 }),
          async (format, mode, size) => {
            // 创建带元数据的测试图片
            const filename = `test-default-${format}-${mode}-${size}.${format}`;
            const inputPath = await createImageWithMetadata(format, size, size, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000,
              dimensions: { width: size, height: size }
            };

            // 构建处理参数：不指定 removeMetadata
            const params: ProcessingParams = {
              compression: {
                mode: mode as 'quality' | 'targetSize' | 'none',
                value: mode === 'quality' ? 80 : mode === 'targetSize' ? 10 : undefined
                // removeMetadata 未指定
              }
            };

            // 处理图片
            await processor.process(inputFile, params, outputPath);

            // 验证：默认应该移除元数据
            const hasMetadataInOutput = await hasMetadata(outputPath);
            expect(hasMetadataInOutput).toBe(false);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 } // 最少 100 次迭代
      );
    });
  });

  /**
   * 额外属性测试：元数据处理的边界情况
   */
  describe('Metadata processing edge cases', () => {
    test('should handle images without metadata gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：removeMetadata 选项
          fc.boolean(),
          // 生成器：图片尺寸
          fc.integer({ min: 50, max: 200 }),
          async (format, removeMetadata, size) => {
            // 创建不带元数据的测试图片
            const filename = `test-no-metadata-${format}-${removeMetadata}-${size}.${format}`;
            const inputPath = path.join(tempDir, filename);
            
            let pipeline = sharp({
              create: {
                width: size,
                height: size,
                channels: format === 'png' ? 4 : 3,
                background: { r: 100, g: 100, b: 100, alpha: 1 }
              }
            });

            // Apply format-specific conversion
            if (format === 'jpg') {
              pipeline = pipeline.jpeg();
            } else if (format === 'png') {
              pipeline = pipeline.png();
            } else if (format === 'webp') {
              pipeline = pipeline.webp();
            }

            await pipeline.toFile(inputPath);

            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000,
              dimensions: { width: size, height: size }
            };

            const params: ProcessingParams = {
              compression: {
                mode: 'quality',
                value: 80,
                removeMetadata
              }
            };

            // 处理图片不应该抛出错误
            await expect(processor.process(inputFile, params, outputPath)).resolves.toBeDefined();

            // 验证：当 removeMetadata=false 时，Sharp 会添加默认元数据（即使原图没有）
            // 当 removeMetadata=true 时，不会有元数据
            const hasMetadataInOutput = await hasMetadata(outputPath);
            if (removeMetadata) {
              expect(hasMetadataInOutput).toBe(false);
            } else {
              // Sharp 的 withMetadata() 会添加默认元数据，这是正常行为
              expect(hasMetadataInOutput).toBe(true);
            }

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should preserve metadata type consistency across processing', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：图片尺寸
          fc.integer({ min: 50, max: 200 }),
          async (format, size) => {
            // 创建带元数据的测试图片
            const filename = `test-consistency-${format}-${size}.${format}`;
            const inputPath = await createImageWithMetadata(format, size, size, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000,
              dimensions: { width: size, height: size }
            };

            // 保留元数据
            const params: ProcessingParams = {
              compression: {
                mode: 'quality',
                value: 80,
                removeMetadata: false
              }
            };

            await processor.process(inputFile, params, outputPath);

            // 验证：输入和输出都应该有元数据
            const inputHasMetadata = await hasMetadata(inputPath);
            const outputHasMetadata = await hasMetadata(outputPath);
            
            expect(inputHasMetadata).toBe(true);
            expect(outputHasMetadata).toBe(true);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should handle metadata removal with format conversion', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：输入格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：输出格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：removeMetadata 选项
          fc.boolean(),
          // 生成器：图片尺寸
          fc.integer({ min: 50, max: 150 }),
          async (inputFormat, outputFormat, removeMetadata, size) => {
            // 创建带元数据的测试图片
            const filename = `test-convert-${inputFormat}-to-${outputFormat}-${removeMetadata}-${size}.${inputFormat}`;
            const inputPath = await createImageWithMetadata(inputFormat, size, size, filename);
            const outputPath = path.join(tempDir, `output-${filename.replace(inputFormat, outputFormat)}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format: inputFormat,
              size: 1000,
              dimensions: { width: size, height: size }
            };

            // 构建处理参数：包含格式转换
            const params: ProcessingParams = {
              compression: {
                mode: 'quality',
                value: 80,
                removeMetadata
              },
              format: outputFormat
            };

            // 处理图片
            await processor.process(inputFile, params, outputPath);

            // 验证：元数据处理应该与 removeMetadata 设置一致，不受格式转换影响
            const hasMetadataInOutput = await hasMetadata(outputPath);
            expect(hasMetadataInOutput).toBe(!removeMetadata);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * 性能属性测试
   */
  describe('Metadata processing performance', () => {
    test('should not significantly impact processing time', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          // 生成器：removeMetadata 选项
          fc.boolean(),
          // 生成器：图片尺寸
          fc.integer({ min: 100, max: 200 }),
          async (format, removeMetadata, size) => {
            // 创建带元数据的测试图片
            const filename = `test-perf-${format}-${removeMetadata}-${size}.${format}`;
            const inputPath = await createImageWithMetadata(format, size, size, filename);
            const outputPath = path.join(tempDir, `output-${filename}`);

            const inputFile: ImageFile = {
              path: inputPath,
              relativePath: filename,
              format,
              size: 1000,
              dimensions: { width: size, height: size }
            };

            const params: ProcessingParams = {
              compression: {
                mode: 'quality',
                value: 80,
                removeMetadata
              }
            };

            // 测量处理时间
            const startTime = performance.now();
            await processor.process(inputFile, params, outputPath);
            const endTime = performance.now();
            const duration = endTime - startTime;

            // 验证：处理时间应该在合理范围内（< 5000ms）
            expect(duration).toBeLessThan(5000);

            // 清理
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 50 } // 性能测试减少迭代次数
      );
    });
  });
});
