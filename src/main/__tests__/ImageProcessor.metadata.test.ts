/**
 * Unit tests for metadata control logic
 * 
 * Tests the metadata removal/preservation functionality in image processing.
 * 
 * Requirements tested:
 * - 2.7: Smart compression mode automatically removes metadata
 * - 5.3: User can preserve metadata when unchecked
 * - 5.4: User can remove metadata when checked
 * 
 * Feature: optimize-compression-settings
 * Task: 2.4 - 实现元数据控制逻辑
 */

import { SharpImageProcessor } from '../ImageProcessor';
import { ImageFile, ProcessingParams } from '../types';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

describe('SharpImageProcessor - Metadata Control', () => {
  let processor: SharpImageProcessor;
  let tempDir: string;
  let testImagePath: string;

  beforeAll(async () => {
    processor = new SharpImageProcessor();
    
    // Create a temporary directory for test outputs
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batchpic-metadata-test-'));
    
    // Create a test image with metadata
    testImagePath = path.join(tempDir, 'test-with-metadata.jpg');
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
    .jpeg()
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: 'Test Copyright',
          Artist: 'Test Artist'
        }
      }
    })
    .toFile(testImagePath);
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Smart Compression Mode', () => {
    test('should remove metadata in smart mode (Requirement 2.7)', async () => {
      const outputPath = path.join(tempDir, 'smart-output.jpg');
      
      const inputFile: ImageFile = {
        path: testImagePath,
        relativePath: 'test-with-metadata.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'smart'
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that output file exists
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Check that metadata was removed
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();
    });

    test('should remove metadata in smart mode even if removeMetadata is false', async () => {
      const outputPath = path.join(tempDir, 'smart-force-remove.jpg');
      
      const inputFile: ImageFile = {
        path: testImagePath,
        relativePath: 'test-with-metadata.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'smart',
          removeMetadata: false // This should be ignored in smart mode
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was still removed (smart mode overrides user setting)
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();
    });
  });

  describe('Quality Mode', () => {
    test('should remove metadata when removeMetadata is true (Requirement 5.4)', async () => {
      const outputPath = path.join(tempDir, 'quality-remove.jpg');
      
      const inputFile: ImageFile = {
        path: testImagePath,
        relativePath: 'test-with-metadata.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 80,
          removeMetadata: true
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was removed
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();
    });

    test('should preserve metadata when removeMetadata is false (Requirement 5.3)', async () => {
      const outputPath = path.join(tempDir, 'quality-preserve.jpg');
      
      const inputFile: ImageFile = {
        path: testImagePath,
        relativePath: 'test-with-metadata.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 80,
          removeMetadata: false
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeDefined();
    });

    test('should default to removing metadata when removeMetadata is undefined', async () => {
      const outputPath = path.join(tempDir, 'quality-default.jpg');
      
      const inputFile: ImageFile = {
        path: testImagePath,
        relativePath: 'test-with-metadata.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 80
          // removeMetadata not specified
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was removed by default
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();
    });
  });

  describe('Target Size Mode', () => {
    test('should remove metadata when removeMetadata is true', async () => {
      const outputPath = path.join(tempDir, 'targetsize-remove.jpg');
      
      const inputFile: ImageFile = {
        path: testImagePath,
        relativePath: 'test-with-metadata.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'targetSize',
          value: 5, // 5 KB
          removeMetadata: true
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was removed
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();
    });

    test('should preserve metadata when removeMetadata is false', async () => {
      const outputPath = path.join(tempDir, 'targetsize-preserve.jpg');
      
      const inputFile: ImageFile = {
        path: testImagePath,
        relativePath: 'test-with-metadata.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'targetSize',
          value: 5, // 5 KB
          removeMetadata: false
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeDefined();
    });
  });

  describe('None Mode', () => {
    test('should remove metadata when removeMetadata is true', async () => {
      const outputPath = path.join(tempDir, 'none-remove.jpg');
      
      const inputFile: ImageFile = {
        path: testImagePath,
        relativePath: 'test-with-metadata.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'none',
          removeMetadata: true
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was removed
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();
    });

    test('should preserve metadata when removeMetadata is false', async () => {
      const outputPath = path.join(tempDir, 'none-preserve.jpg');
      
      const inputFile: ImageFile = {
        path: testImagePath,
        relativePath: 'test-with-metadata.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'none',
          removeMetadata: false
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle images without metadata gracefully', async () => {
      // Create an image without metadata
      const noMetadataPath = path.join(tempDir, 'no-metadata.jpg');
      await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }
        }
      })
      .jpeg()
      .toFile(noMetadataPath);

      const outputPath = path.join(tempDir, 'no-metadata-output.jpg');
      
      const inputFile: ImageFile = {
        path: noMetadataPath,
        relativePath: 'no-metadata.jpg',
        format: 'jpg',
        size: 500,
        dimensions: { width: 50, height: 50 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 80,
          removeMetadata: false // Try to preserve non-existent metadata
        }
      };

      // Should not throw error
      await expect(processor.process(inputFile, params, outputPath)).resolves.toBeDefined();
    });

    test('should work with PNG format', async () => {
      // Create a PNG with metadata
      const pngPath = path.join(tempDir, 'test-png.png');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 }
        }
      })
      .png()
      .withMetadata({
        exif: {
          IFD0: {
            Copyright: 'PNG Test'
          }
        }
      })
      .toFile(pngPath);

      const outputPath = path.join(tempDir, 'png-preserve.png');
      
      const inputFile: ImageFile = {
        path: pngPath,
        relativePath: 'test-png.png',
        format: 'png',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 85,
          removeMetadata: false
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeDefined();
    });

    test('should work with WebP format', async () => {
      // Create a WebP with metadata
      const webpPath = path.join(tempDir, 'test-webp.webp');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      })
      .webp()
      .withMetadata({
        exif: {
          IFD0: {
            Copyright: 'WebP Test'
          }
        }
      })
      .toFile(webpPath);

      const outputPath = path.join(tempDir, 'webp-preserve.webp');
      
      const inputFile: ImageFile = {
        path: webpPath,
        relativePath: 'test-webp.webp',
        format: 'webp',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 80,
          removeMetadata: false
        }
      };

      await processor.process(inputFile, params, outputPath);

      // Check that metadata was preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeDefined();
    });
  });
});
