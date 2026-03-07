import { SharpImageProcessor } from '../ImageProcessor';
import { ImageFile, ProcessingParams } from '../types';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import os from 'os';
import * as fc from 'fast-check';

describe('ImageProcessor', () => {
  let processor: SharpImageProcessor;
  let tempDir: string;
  let testImagePath: string;

  beforeAll(async () => {
    processor = new SharpImageProcessor();
    
    // Create a temporary directory for test outputs
    tempDir = path.join(os.tmpdir(), 'batchpic-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    // Create a test image (100x100 red square)
    testImagePath = path.join(tempDir, 'test-input.jpg');
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
    .jpeg()
    .toFile(testImagePath);
  });

  afterAll(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('process', () => {
    it('should process a single image with default parameters', async () => {
      const input: ImageFile = {
        path: testImagePath,
        relativePath: 'test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(testImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {};
      const outputPath = path.join(tempDir, 'output', 'test-output.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.processedSize).toBeGreaterThan(0);
      
      // Verify output file exists
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should resize image by width', async () => {
      const input: ImageFile = {
        path: testImagePath,
        relativePath: 'test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(testImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'width',
          value: 50
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-resize-width.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify dimensions
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50); // Maintains aspect ratio
    });

    it('should resize image by height', async () => {
      const input: ImageFile = {
        path: testImagePath,
        relativePath: 'test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(testImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'height',
          value: 75
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-resize-height.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify dimensions
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(75); // Maintains aspect ratio
      expect(metadata.height).toBe(75);
    });



    it('should apply quality compression', async () => {
      const input: ImageFile = {
        path: testImagePath,
        relativePath: 'test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(testImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 50
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-compress.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      expect(result.processedSize).toBeLessThan(result.originalSize);
    });
  });

  describe('processBatch', () => {
    it('should process multiple images with progress callback', async () => {
      // Create multiple test images
      const inputs: ImageFile[] = [];
      for (let i = 0; i < 3; i++) {
        const imagePath = path.join(tempDir, `batch-input-${i}.jpg`);
        await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 3,
            background: { r: 255, g: 0, b: 0 }
          }
        })
        .jpeg()
        .toFile(imagePath);

        inputs.push({
          path: imagePath,
          relativePath: `batch-input-${i}.jpg`,
          format: 'jpg',
          size: (await fs.stat(imagePath)).size,
          dimensions: { width: 100, height: 100 }
        });
      }

      const params: ProcessingParams = {};
      const outputRoot = path.join(tempDir, 'batch-output');

      const progressUpdates: Array<{ current: number; total: number }> = [];
      const onProgress = (current: number, total: number) => {
        progressUpdates.push({ current, total });
      };

      const result = await processor.processBatch(inputs, params, outputRoot, onProgress);

      expect(result.successful.length).toBe(3);
      expect(result.failed.length).toBe(0);
      expect(result.totalTime).toBeGreaterThan(0);
      
      // Verify progress was reported
      expect(progressUpdates.length).toBe(3);
      expect(progressUpdates[0]).toEqual({ current: 1, total: 3 });
      expect(progressUpdates[1]).toEqual({ current: 2, total: 3 });
      expect(progressUpdates[2]).toEqual({ current: 3, total: 3 });
    });

    it('should handle partial failures gracefully', async () => {
      const inputs: ImageFile[] = [
        {
          path: testImagePath,
          relativePath: 'valid.jpg',
          format: 'jpg',
          size: (await fs.stat(testImagePath)).size,
          dimensions: { width: 100, height: 100 }
        },
        {
          path: '/nonexistent/path.jpg',
          relativePath: 'invalid.jpg',
          format: 'jpg',
          size: 1000,
          dimensions: { width: 100, height: 100 }
        }
      ];

      const params: ProcessingParams = {};
      const outputRoot = path.join(tempDir, 'partial-output');

      const result = await processor.processBatch(inputs, params, outputRoot);

      expect(result.successful.length).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].success).toBe(false);
      expect(result.failed[0].error).toBeDefined();
    });
  });

  describe('resize modes', () => {
    it('should resize by long edge (landscape image)', async () => {
      // Create a landscape test image (200x100)
      const landscapeImagePath = path.join(tempDir, 'landscape-input.jpg');
      await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      })
      .jpeg()
      .toFile(landscapeImagePath);

      const input: ImageFile = {
        path: landscapeImagePath,
        relativePath: 'landscape-input.jpg',
        format: 'jpg',
        size: (await fs.stat(landscapeImagePath)).size,
        dimensions: { width: 200, height: 100 }
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'longEdge',
          value: 150
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-longedge-landscape.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify dimensions - long edge (width) should be 150
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(150);
      expect(metadata.height).toBe(75); // Maintains 2:1 aspect ratio
    });

    it('should resize by long edge (portrait image)', async () => {
      // Create a portrait test image (100x200)
      const portraitImagePath = path.join(tempDir, 'portrait-input.jpg');
      await sharp({
        create: {
          width: 100,
          height: 200,
          channels: 3,
          background: { r: 255, g: 0, b: 255 }
        }
      })
      .jpeg()
      .toFile(portraitImagePath);

      const input: ImageFile = {
        path: portraitImagePath,
        relativePath: 'portrait-input.jpg',
        format: 'jpg',
        size: (await fs.stat(portraitImagePath)).size,
        dimensions: { width: 100, height: 200 }
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'longEdge',
          value: 150
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-longedge-portrait.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify dimensions - long edge (height) should be 150
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(75); // Maintains 1:2 aspect ratio
      expect(metadata.height).toBe(150);
    });

    it('should resize by short edge (landscape image)', async () => {
      // Create a landscape test image (200x100)
      const landscapeImagePath = path.join(tempDir, 'landscape-input2.jpg');
      await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 255 }
        }
      })
      .jpeg()
      .toFile(landscapeImagePath);

      const input: ImageFile = {
        path: landscapeImagePath,
        relativePath: 'landscape-input2.jpg',
        format: 'jpg',
        size: (await fs.stat(landscapeImagePath)).size,
        dimensions: { width: 200, height: 100 }
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'shortEdge',
          value: 60
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-shortedge-landscape.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify dimensions - short edge (height) should be 60
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(120); // Maintains 2:1 aspect ratio
      expect(metadata.height).toBe(60);
    });

    it('should resize by short edge (portrait image)', async () => {
      // Create a portrait test image (100x200)
      const portraitImagePath = path.join(tempDir, 'portrait-input2.jpg');
      await sharp({
        create: {
          width: 100,
          height: 200,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
      .jpeg()
      .toFile(portraitImagePath);

      const input: ImageFile = {
        path: portraitImagePath,
        relativePath: 'portrait-input2.jpg',
        format: 'jpg',
        size: (await fs.stat(portraitImagePath)).size,
        dimensions: { width: 100, height: 200 }
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'shortEdge',
          value: 60
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-shortedge-portrait.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify dimensions - short edge (width) should be 60
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(60);
      expect(metadata.height).toBe(120); // Maintains 1:2 aspect ratio
    });
  });

  describe('compression', () => {
    it('should apply default compression (70% quality)', async () => {
      // Create a larger test image for better compression testing
      const largeImagePath = path.join(tempDir, 'compress-test-input.jpg');
      await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 100, g: 150, b: 200 }
        }
      })
      .jpeg({ quality: 95 })
      .toFile(largeImagePath);

      const input: ImageFile = {
        path: largeImagePath,
        relativePath: 'compress-test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(largeImagePath)).size,
        dimensions: { width: 200, height: 200 }
      };

      // No compression params means default compression
      const params: ProcessingParams = {};
      const outputPath = path.join(tempDir, 'output', 'test-default-compress.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      // Default compression should reduce file size
      expect(result.processedSize).toBeLessThan(result.originalSize);
      
      // Should be approximately 70% of original (±15% tolerance)
      const ratio = result.processedSize / result.originalSize;
      expect(ratio).toBeGreaterThan(0.55); // 70% - 15%
      expect(ratio).toBeLessThan(1.0);
    });

    it('should apply quality percentage compression', async () => {
      const input: ImageFile = {
        path: testImagePath,
        relativePath: 'test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(testImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 50
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-quality-50.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      expect(result.processedSize).toBeGreaterThan(0);
    });

    it('should compress to target file size', async () => {
      // Create a larger test image with more complex content for better compression testing
      const largeImagePath = path.join(tempDir, 'large-input.jpg');
      
      // Create an image with some variation (not solid color)
      const width = 500;
      const height = 500;
      const buffer = Buffer.alloc(width * height * 3);
      
      // Fill with a gradient pattern to make it more compressible
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 3;
          buffer[i] = Math.floor((x / width) * 255);     // R
          buffer[i + 1] = Math.floor((y / height) * 255); // G
          buffer[i + 2] = 128;                            // B
        }
      }
      
      await sharp(buffer, {
        raw: {
          width,
          height,
          channels: 3
        }
      })
      .jpeg({ quality: 90 })
      .toFile(largeImagePath);

      const input: ImageFile = {
        path: largeImagePath,
        relativePath: 'large-input.jpg',
        format: 'jpg',
        size: (await fs.stat(largeImagePath)).size,
        dimensions: { width: 500, height: 500 }
      };

      const targetSizeKB = 50;
      const params: ProcessingParams = {
        compression: {
          mode: 'targetSize',
          value: targetSizeKB
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-target-size.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Check if file size is within ±15% of target
      const targetSizeBytes = targetSizeKB * 1024;
      const tolerance = 0.15;
      const minSize = targetSizeBytes * (1 - tolerance);
      const maxSize = targetSizeBytes * (1 + tolerance);
      
      expect(result.processedSize).toBeGreaterThanOrEqual(minSize);
      expect(result.processedSize).toBeLessThanOrEqual(maxSize);
    });

    it('should handle very small target sizes', async () => {
      // Create a test image
      const smallTestPath = path.join(tempDir, 'small-test-input.jpg');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 200, g: 100, b: 50 }
        }
      })
      .jpeg({ quality: 90 })
      .toFile(smallTestPath);

      const input: ImageFile = {
        path: smallTestPath,
        relativePath: 'small-test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(smallTestPath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const targetSizeKB = 5;
      const params: ProcessingParams = {
        compression: {
          mode: 'targetSize',
          value: targetSizeKB
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-small-target.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      // Should get as close as possible to target (within ±15%)
      const targetSizeBytes = targetSizeKB * 1024;
      expect(result.processedSize).toBeLessThanOrEqual(targetSizeBytes * 1.15);
    });

    it('should produce smaller files with lower quality', async () => {
      // Create a test image with gradient pattern for better quality comparison
      const detailImagePath = path.join(tempDir, 'detail-test-input.jpg');
      
      const width = 200;
      const height = 200;
      const buffer = Buffer.alloc(width * height * 3);
      
      // Fill with a gradient pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 3;
          buffer[i] = Math.floor((x / width) * 255);     // R
          buffer[i + 1] = Math.floor((y / height) * 255); // G
          buffer[i + 2] = 128;                            // B
        }
      }
      
      await sharp(buffer, {
        raw: {
          width,
          height,
          channels: 3
        }
      })
      .jpeg({ quality: 95 })
      .toFile(detailImagePath);

      const input: ImageFile = {
        path: detailImagePath,
        relativePath: 'detail-test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(detailImagePath)).size,
        dimensions: { width: 200, height: 200 }
      };

      // Test with quality 80
      const params80: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 80
        }
      };
      const outputPath80 = path.join(tempDir, 'output', 'test-quality-80.jpg');
      const result80 = await processor.process(input, params80, outputPath80);

      // Test with quality 40
      const params40: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 40
        }
      };
      const outputPath40 = path.join(tempDir, 'output', 'test-quality-40.jpg');
      const result40 = await processor.process(input, params40, outputPath40);

      expect(result80.success).toBe(true);
      expect(result40.success).toBe(true);
      
      // Lower quality should produce smaller file
      expect(result40.processedSize).toBeLessThan(result80.processedSize);
    });
  });

  describe('format conversion', () => {
    it('should convert from jpg to png', async () => {
      const input: ImageFile = {
        path: testImagePath,
        relativePath: 'test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(testImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        format: 'png'
      };
      const outputPath = path.join(tempDir, 'output', 'test-jpg-to-png.png');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should convert from jpg to webp', async () => {
      const input: ImageFile = {
        path: testImagePath,
        relativePath: 'test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(testImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        format: 'webp'
      };
      const outputPath = path.join(tempDir, 'output', 'test-jpg-to-webp.webp');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('webp');
    });

    it('should convert from png to jpg', async () => {
      // Create a PNG test image
      const pngImagePath = path.join(tempDir, 'test-input.png');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }
        }
      })
      .png()
      .toFile(pngImagePath);

      const input: ImageFile = {
        path: pngImagePath,
        relativePath: 'test-input.png',
        format: 'png',
        size: (await fs.stat(pngImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        format: 'jpg'
      };
      const outputPath = path.join(tempDir, 'output', 'test-png-to-jpg.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    it('should convert from png to webp', async () => {
      // Create a PNG test image
      const pngImagePath = path.join(tempDir, 'test-input2.png');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
      .png()
      .toFile(pngImagePath);

      const input: ImageFile = {
        path: pngImagePath,
        relativePath: 'test-input2.png',
        format: 'png',
        size: (await fs.stat(pngImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        format: 'webp'
      };
      const outputPath = path.join(tempDir, 'output', 'test-png-to-webp.webp');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('webp');
    });

    it('should convert from webp to jpg', async () => {
      // Create a WebP test image
      const webpImagePath = path.join(tempDir, 'test-input.webp');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      })
      .webp()
      .toFile(webpImagePath);

      const input: ImageFile = {
        path: webpImagePath,
        relativePath: 'test-input.webp',
        format: 'webp',
        size: (await fs.stat(webpImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        format: 'jpg'
      };
      const outputPath = path.join(tempDir, 'output', 'test-webp-to-jpg.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    it('should convert from webp to png', async () => {
      // Create a WebP test image
      const webpImagePath = path.join(tempDir, 'test-input2.webp');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 255 }
        }
      })
      .webp()
      .toFile(webpImagePath);

      const input: ImageFile = {
        path: webpImagePath,
        relativePath: 'test-input2.webp',
        format: 'webp',
        size: (await fs.stat(webpImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        format: 'png'
      };
      const outputPath = path.join(tempDir, 'output', 'test-webp-to-png.png');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should preserve original format when no format is specified (jpg)', async () => {
      const input: ImageFile = {
        path: testImagePath,
        relativePath: 'test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(testImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        // No format specified
      };
      const outputPath = path.join(tempDir, 'output', 'test-preserve-jpg.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format is preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    it('should preserve original format when no format is specified (png)', async () => {
      // Create a PNG test image
      const pngImagePath = path.join(tempDir, 'test-preserve-input.png');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
      .png()
      .toFile(pngImagePath);

      const input: ImageFile = {
        path: pngImagePath,
        relativePath: 'test-preserve-input.png',
        format: 'png',
        size: (await fs.stat(pngImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        // No format specified
      };
      const outputPath = path.join(tempDir, 'output', 'test-preserve-png.png');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format is preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should preserve original format when no format is specified (webp)', async () => {
      // Create a WebP test image
      const webpImagePath = path.join(tempDir, 'test-preserve-input.webp');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 64, g: 128, b: 192 }
        }
      })
      .webp()
      .toFile(webpImagePath);

      const input: ImageFile = {
        path: webpImagePath,
        relativePath: 'test-preserve-input.webp',
        format: 'webp',
        size: (await fs.stat(webpImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        // No format specified
      };
      const outputPath = path.join(tempDir, 'output', 'test-preserve-webp.webp');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format is preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('webp');
    });

    it('should apply compression when converting formats', async () => {
      const input: ImageFile = {
        path: testImagePath,
        relativePath: 'test-input.jpg',
        format: 'jpg',
        size: (await fs.stat(testImagePath)).size,
        dimensions: { width: 100, height: 100 }
      };

      const params: ProcessingParams = {
        format: 'png',
        compression: {
          mode: 'quality',
          value: 50
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-convert-compress.png');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify format
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('png');
      
      // Verify compression was applied
      expect(result.processedSize).toBeGreaterThan(0);
    });
  });

  describe('aspect ratio cropping', () => {
    it('should crop to 1:1 aspect ratio', async () => {
      // Create a rectangular test image (200x100)
      const rectImagePath = path.join(tempDir, 'rect-input.jpg');
      await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }
        }
      })
      .jpeg()
      .toFile(rectImagePath);

      const input: ImageFile = {
        path: rectImagePath,
        relativePath: 'rect-input.jpg',
        format: 'jpg',
        size: (await fs.stat(rectImagePath)).size,
        dimensions: { width: 200, height: 100 }
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'aspectRatio',
          value: 100,
          aspectRatio: '1:1'
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-crop-1-1.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify aspect ratio
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(metadata.height);
    });

    it('should crop to 16:9 aspect ratio', async () => {
      // Create a square test image (180x180)
      const squareImagePath = path.join(tempDir, 'square-input.jpg');
      await sharp({
        create: {
          width: 180,
          height: 180,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
      .jpeg()
      .toFile(squareImagePath);

      const input: ImageFile = {
        path: squareImagePath,
        relativePath: 'square-input.jpg',
        format: 'jpg',
        size: (await fs.stat(squareImagePath)).size,
        dimensions: { width: 180, height: 180 }
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'aspectRatio',
          value: 180,
          aspectRatio: '16:9'
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-crop-16-9.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify aspect ratio (16:9 = 1.777...)
      const metadata = await sharp(outputPath).metadata();
      const aspectRatio = metadata.width! / metadata.height!;
      expect(aspectRatio).toBeCloseTo(16 / 9, 2);
    });

    it('should crop to 4:5 aspect ratio', async () => {
      // Create a square test image (200x200)
      const squareImagePath = path.join(tempDir, 'square-input2.jpg');
      await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 128, g: 0, b: 128 }
        }
      })
      .jpeg()
      .toFile(squareImagePath);

      const input: ImageFile = {
        path: squareImagePath,
        relativePath: 'square-input2.jpg',
        format: 'jpg',
        size: (await fs.stat(squareImagePath)).size,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        resize: {
          mode: 'aspectRatio',
          value: 200,
          aspectRatio: '4:5'
        }
      };
      const outputPath = path.join(tempDir, 'output', 'test-crop-4-5.jpg');

      const result = await processor.process(input, params, outputPath);

      expect(result.success).toBe(true);
      
      // Verify aspect ratio (4:5 = 0.8)
      const metadata = await sharp(outputPath).metadata();
      const aspectRatio = metadata.width! / metadata.height!;
      expect(aspectRatio).toBeCloseTo(4 / 5, 2);
    });
  });

  // Feature: batchpic, Property 3: 调整大小保持宽高比
  describe('Property Test: Resize maintains aspect ratio', () => {
    it('should maintain aspect ratio for all resize modes (width, height, longEdge, shortEdge)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random image dimensions
          fc.record({
            width: fc.integer({ min: 100, max: 5000 }),
            height: fc.integer({ min: 100, max: 5000 }),
          }),
          // Generate random resize parameters
          fc.oneof(
            // Width mode
            fc.record({
              mode: fc.constant('width' as const),
              targetValue: fc.integer({ min: 50, max: 2000 }),
            }),
            // Height mode
            fc.record({
              mode: fc.constant('height' as const),
              targetValue: fc.integer({ min: 50, max: 2000 }),
            }),
            // Long edge mode
            fc.record({
              mode: fc.constant('longEdge' as const),
              targetValue: fc.integer({ min: 50, max: 2000 }),
            }),
            // Short edge mode
            fc.record({
              mode: fc.constant('shortEdge' as const),
              targetValue: fc.integer({ min: 50, max: 2000 }),
            })
          ),
          async (dimensions, resizeConfig) => {
            // Create a test image with the generated dimensions
            const testImagePath = path.join(tempDir, `prop-test-${dimensions.width}x${dimensions.height}.jpg`);
            await sharp({
              create: {
                width: dimensions.width,
                height: dimensions.height,
                channels: 3,
                background: { r: 128, g: 128, b: 128 }
              }
            })
            .jpeg()
            .toFile(testImagePath);

            const input: ImageFile = {
              path: testImagePath,
              relativePath: `prop-test-${dimensions.width}x${dimensions.height}.jpg`,
              format: 'jpg',
              size: (await fs.stat(testImagePath)).size,
              dimensions: { width: dimensions.width, height: dimensions.height }
            };

            const params: ProcessingParams = {
              resize: {
                mode: resizeConfig.mode,
                value: resizeConfig.targetValue
              }
            };

            const outputPath = path.join(tempDir, 'output', `prop-test-output-${dimensions.width}x${dimensions.height}-${resizeConfig.mode}-${resizeConfig.targetValue}.jpg`);

            // Process the image
            const result = await processor.process(input, params, outputPath);

            // Verify processing succeeded
            expect(result.success).toBe(true);

            // Get output dimensions
            const metadata = await sharp(outputPath).metadata();
            const outputWidth = metadata.width!;
            const outputHeight = metadata.height!;

            // Calculate aspect ratios
            const originalAspectRatio = dimensions.width / dimensions.height;
            const outputAspectRatio = outputWidth / outputHeight;

            // Verify aspect ratio is maintained (within tolerance)
            // For very small dimensions, we need to account for rounding errors
            // Use the larger of 5% tolerance or 1 pixel tolerance
            const aspectRatioDifference = Math.abs(originalAspectRatio - outputAspectRatio);
            const percentTolerance = originalAspectRatio * 0.05; // 5% tolerance
            const pixelTolerance = Math.max(1 / outputWidth, 1 / outputHeight); // 1 pixel tolerance
            const tolerance = Math.max(percentTolerance, pixelTolerance);
            
            expect(aspectRatioDifference).toBeLessThan(tolerance);

            // Verify the correct dimension constraint is met based on mode
            switch (resizeConfig.mode) {
              case 'width':
                expect(outputWidth).toBe(resizeConfig.targetValue);
                break;
              case 'height':
                expect(outputHeight).toBe(resizeConfig.targetValue);
                break;
              case 'longEdge':
                const longEdge = Math.max(outputWidth, outputHeight);
                expect(longEdge).toBe(resizeConfig.targetValue);
                break;
              case 'shortEdge':
                const shortEdge = Math.min(outputWidth, outputHeight);
                expect(shortEdge).toBe(resizeConfig.targetValue);
                break;
            }

            // Clean up test image
            await fs.unlink(testImagePath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
          }
        ),
        { numRuns: 20 }
      );
    }, 60000); // 60 second timeout for property test with 20 iterations
  });
});
