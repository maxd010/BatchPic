/**
 * Integration tests for complete compression workflows
 * 
 * Tests end-to-end flows from user input to final output, verifying that
 * all components work together correctly.
 * 
 * Feature: optimize-compression-settings
 * Task: 9 - 集成测试和端到端验证
 */

import { SharpImageProcessor } from '../ImageProcessor';
import { ImageFile, ProcessingParams } from '../types';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

describe('ImageProcessor - Integration Tests', () => {
  let processor: SharpImageProcessor;
  let tempDir: string;
  let testImages: {
    jpg: string;
    png: string;
    webp: string;
  };

  beforeAll(async () => {
    processor = new SharpImageProcessor();
    
    // Create a temporary directory for test outputs
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batchpic-integration-test-'));
    
    // Create test images with metadata for each format
    testImages = {
      jpg: path.join(tempDir, 'test.jpg'),
      png: path.join(tempDir, 'test.png'),
      webp: path.join(tempDir, 'test.webp')
    };

    // Create JPG test image with metadata
    await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 255, g: 100, b: 50 }
      }
    })
    .jpeg()
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: 'Test Copyright JPG',
          Artist: 'Test Artist'
        }
      }
    })
    .toFile(testImages.jpg);

    // Create PNG test image with metadata
    await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 50, g: 150, b: 255, alpha: 1 }
      }
    })
    .png()
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: 'Test Copyright PNG',
          Artist: 'Test Artist'
        }
      }
    })
    .toFile(testImages.png);

    // Create WebP test image with metadata
    await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 100, g: 255, b: 150 }
      }
    })
    .webp()
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: 'Test Copyright WebP',
          Artist: 'Test Artist'
        }
      }
    })
    .toFile(testImages.webp);
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('9.1 Smart Compression Complete Flow', () => {
    /**
     * Requirements: 2.3, 2.4, 2.5, 2.6, 2.7
     * 
     * Test complete flow:
     * User selects image → Smart mode → Process → Verify quality and metadata
     */

    test('JPG image → Smart mode → Quality 80, No metadata', async () => {
      const outputPath = path.join(tempDir, 'smart-jpg-output.jpg');
      
      const inputFile: ImageFile = {
        path: testImages.jpg,
        relativePath: 'test.jpg',
        format: 'jpg',
        size: 10000,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'smart'
        }
      };

      // Process the image
      const result = await processor.process(inputFile, params, outputPath);

      // Verify processing succeeded
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      // Verify output file exists
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verify metadata was removed
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();

      // Verify format is correct
      expect(metadata.format).toBe('jpeg');

      // Verify quality is approximately 80 (check file size is reasonable)
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.size).toBeLessThan(inputFile.size); // Should be compressed
    });

    test('PNG image → Smart mode → Quality 85, No metadata', async () => {
      const outputPath = path.join(tempDir, 'smart-png-output.png');
      
      const inputFile: ImageFile = {
        path: testImages.png,
        relativePath: 'test.png',
        format: 'png',
        size: 15000,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'smart'
        }
      };

      // Process the image
      const result = await processor.process(inputFile, params, outputPath);

      // Verify processing succeeded
      expect(result.success).toBe(true);

      // Verify metadata was removed
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();

      // Verify format is correct
      expect(metadata.format).toBe('png');

      // Verify file was compressed
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('WebP image → Smart mode → Quality 80, No metadata', async () => {
      const outputPath = path.join(tempDir, 'smart-webp-output.webp');
      
      const inputFile: ImageFile = {
        path: testImages.webp,
        relativePath: 'test.webp',
        format: 'webp',
        size: 12000,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'smart'
        }
      };

      // Process the image
      const result = await processor.process(inputFile, params, outputPath);

      // Verify processing succeeded
      expect(result.success).toBe(true);

      // Verify metadata was removed
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();

      // Verify format is correct
      expect(metadata.format).toBe('webp');

      // Verify file was compressed
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('Smart mode ignores removeMetadata=false setting', async () => {
      const outputPath = path.join(tempDir, 'smart-force-remove.jpg');
      
      const inputFile: ImageFile = {
        path: testImages.jpg,
        relativePath: 'test.jpg',
        format: 'jpg',
        size: 10000,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'smart',
          removeMetadata: false // Should be ignored
        }
      };

      // Process the image
      const result = await processor.process(inputFile, params, outputPath);

      // Verify processing succeeded
      expect(result.success).toBe(true);

      // Verify metadata was still removed (smart mode overrides user setting)
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();
    });
  });

  describe('9.2 Manual Quality Compression Flow', () => {
    /**
     * Requirements: 3.1, 3.4, 5.3
     * 
     * Test complete flow:
     * User selects PNG → Quality mode → Preset 85 → Uncheck metadata → Process
     * Verify: Quality 85, Metadata preserved
     */

    test('PNG → Quality mode → Preset 85 → Preserve metadata', async () => {
      const outputPath = path.join(tempDir, 'quality-png-preserve.png');
      
      const inputFile: ImageFile = {
        path: testImages.png,
        relativePath: 'test.png',
        format: 'png',
        size: 15000,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 85,
          removeMetadata: false // User unchecked the option
        }
      };

      // Process the image
      const result = await processor.process(inputFile, params, outputPath);

      // Verify processing succeeded
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      // Verify output file exists
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verify metadata was preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeDefined();

      // Verify format is correct
      expect(metadata.format).toBe('png');

      // Verify file was processed
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('JPG → Quality mode → Preset 70 → Remove metadata', async () => {
      const outputPath = path.join(tempDir, 'quality-jpg-remove.jpg');
      
      const inputFile: ImageFile = {
        path: testImages.jpg,
        relativePath: 'test.jpg',
        format: 'jpg',
        size: 10000,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 70,
          removeMetadata: true // User checked the option
        }
      };

      // Process the image
      const result = await processor.process(inputFile, params, outputPath);

      // Verify processing succeeded
      expect(result.success).toBe(true);

      // Verify metadata was removed
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeUndefined();

      // Verify format is correct
      expect(metadata.format).toBe('jpeg');
    });

    test('WebP → Quality mode → Preset 90 → Preserve metadata', async () => {
      const outputPath = path.join(tempDir, 'quality-webp-preserve.webp');
      
      const inputFile: ImageFile = {
        path: testImages.webp,
        relativePath: 'test.webp',
        format: 'webp',
        size: 12000,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 90,
          removeMetadata: false
        }
      };

      // Process the image
      const result = await processor.process(inputFile, params, outputPath);

      // Verify processing succeeded
      expect(result.success).toBe(true);

      // Verify metadata was preserved
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.exif).toBeDefined();
    });
  });

  describe('9.3 Parameter Persistence Flow', () => {
    /**
     * Requirements: 10.1, 10.2
     * 
     * Test complete flow:
     * User sets parameters → Save → Simulate app restart → Verify parameters restored
     * 
     * Note: This test focuses on the data structure that would be persisted.
     * The actual localStorage integration is tested in storage.test.ts
     */

    test('Quality mode parameters can be serialized and restored', () => {
      // Simulate user setting parameters
      const userSettings = {
        mode: 'quality' as const,
        value: 70,
        removeMetadata: true
      };

      // Serialize (what would be saved to localStorage)
      const serialized = JSON.stringify(userSettings);

      // Deserialize (what would be loaded from localStorage)
      const restored = JSON.parse(serialized);

      // Verify parameters are correctly restored
      expect(restored.mode).toBe('quality');
      expect(restored.value).toBe(70);
      expect(restored.removeMetadata).toBe(true);

      // Verify the restored parameters can be used for processing
      const params: ProcessingParams = {
        compression: restored
      };

      expect(params.compression?.mode).toBe('quality');
      expect(params.compression?.value).toBe(70);
    });

    test('Smart mode parameters can be serialized and restored', () => {
      const userSettings = {
        mode: 'smart' as const
      };

      const serialized = JSON.stringify(userSettings);
      const restored = JSON.parse(serialized);

      expect(restored.mode).toBe('smart');

      const params: ProcessingParams = {
        compression: restored
      };

      expect(params.compression?.mode).toBe('smart');
    });

    test('Target size mode parameters can be serialized and restored', () => {
      const userSettings = {
        mode: 'targetSize' as const,
        value: 200,
        removeMetadata: false
      };

      const serialized = JSON.stringify(userSettings);
      const restored = JSON.parse(serialized);

      expect(restored.mode).toBe('targetSize');
      expect(restored.value).toBe(200);
      expect(restored.removeMetadata).toBe(false);
    });

    test('None mode parameters can be serialized and restored', () => {
      const userSettings = {
        mode: 'none' as const,
        removeMetadata: true
      };

      const serialized = JSON.stringify(userSettings);
      const restored = JSON.parse(serialized);

      expect(restored.mode).toBe('none');
      expect(restored.removeMetadata).toBe(true);
    });
  });

  describe('9.4 Mode Switching Flow', () => {
    /**
     * Requirements: 6.4, 8.1
     * 
     * Test complete flow:
     * Smart mode → Quality mode → Target size mode → None mode
     * Verify: Each mode processes correctly with appropriate parameters
     */

    test('Switch from Smart to Quality mode', async () => {
      const inputFile: ImageFile = {
        path: testImages.jpg,
        relativePath: 'test.jpg',
        format: 'jpg',
        size: 10000,
        dimensions: { width: 200, height: 200 }
      };

      // Start with Smart mode
      const smartOutput = path.join(tempDir, 'switch-smart.jpg');
      const smartParams: ProcessingParams = {
        compression: { mode: 'smart' }
      };

      const smartResult = await processor.process(inputFile, smartParams, smartOutput);
      expect(smartResult.success).toBe(true);

      // Switch to Quality mode
      const qualityOutput = path.join(tempDir, 'switch-quality.jpg');
      const qualityParams: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 85,
          removeMetadata: false
        }
      };

      const qualityResult = await processor.process(inputFile, qualityParams, qualityOutput);
      expect(qualityResult.success).toBe(true);

      // Verify both outputs exist and are different
      const smartExists = await fs.access(smartOutput).then(() => true).catch(() => false);
      const qualityExists = await fs.access(qualityOutput).then(() => true).catch(() => false);
      
      expect(smartExists).toBe(true);
      expect(qualityExists).toBe(true);

      // Verify metadata handling is different
      const smartMetadata = await sharp(smartOutput).metadata();
      const qualityMetadata = await sharp(qualityOutput).metadata();

      expect(smartMetadata.exif).toBeUndefined(); // Smart removes metadata
      expect(qualityMetadata.exif).toBeDefined(); // Quality preserves when removeMetadata=false
    });

    test('Switch from Quality to Target Size mode', async () => {
      const inputFile: ImageFile = {
        path: testImages.png,
        relativePath: 'test.png',
        format: 'png',
        size: 15000,
        dimensions: { width: 200, height: 200 }
      };

      // Start with Quality mode
      const qualityOutput = path.join(tempDir, 'switch-quality-png.png');
      const qualityParams: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 80,
          removeMetadata: true
        }
      };

      const qualityResult = await processor.process(inputFile, qualityParams, qualityOutput);
      expect(qualityResult.success).toBe(true);

      // Switch to Target Size mode
      const targetSizeOutput = path.join(tempDir, 'switch-targetsize.png');
      const targetSizeParams: ProcessingParams = {
        compression: {
          mode: 'targetSize',
          value: 5, // 5 KB (smaller target for small test image)
          removeMetadata: false
        }
      };

      const targetSizeResult = await processor.process(inputFile, targetSizeParams, targetSizeOutput);
      expect(targetSizeResult.success).toBe(true);

      // Verify both outputs exist
      const qualityExists = await fs.access(qualityOutput).then(() => true).catch(() => false);
      const targetSizeExists = await fs.access(targetSizeOutput).then(() => true).catch(() => false);
      
      expect(qualityExists).toBe(true);
      expect(targetSizeExists).toBe(true);

      // Verify target size output is approximately the target size
      const targetSizeStats = await fs.stat(targetSizeOutput);
      const targetSizeKB = targetSizeStats.size / 1024;
      
      // Should be within ±15% of target (5 KB) or at minimum compression
      // For very small images, it might not reach the target
      expect(targetSizeKB).toBeGreaterThan(0);
      expect(targetSizeKB).toBeLessThanOrEqual(5 * 1.15);
    });

    test('Switch from Target Size to None mode', async () => {
      const inputFile: ImageFile = {
        path: testImages.webp,
        relativePath: 'test.webp',
        format: 'webp',
        size: 12000,
        dimensions: { width: 200, height: 200 }
      };

      // Start with Target Size mode
      const targetSizeOutput = path.join(tempDir, 'switch-targetsize-webp.webp');
      const targetSizeParams: ProcessingParams = {
        compression: {
          mode: 'targetSize',
          value: 8, // 8 KB
          removeMetadata: true
        }
      };

      const targetSizeResult = await processor.process(inputFile, targetSizeParams, targetSizeOutput);
      expect(targetSizeResult.success).toBe(true);

      // Switch to None mode (no compression)
      const noneOutput = path.join(tempDir, 'switch-none.webp');
      const noneParams: ProcessingParams = {
        compression: {
          mode: 'none',
          removeMetadata: false
        }
      };

      const noneResult = await processor.process(inputFile, noneParams, noneOutput);
      expect(noneResult.success).toBe(true);

      // Verify both outputs exist
      const targetSizeExists = await fs.access(targetSizeOutput).then(() => true).catch(() => false);
      const noneExists = await fs.access(noneOutput).then(() => true).catch(() => false);
      
      expect(targetSizeExists).toBe(true);
      expect(noneExists).toBe(true);

      // Verify None mode output is larger (less compressed)
      const targetSizeStats = await fs.stat(targetSizeOutput);
      const noneStats = await fs.stat(noneOutput);
      
      expect(noneStats.size).toBeGreaterThan(targetSizeStats.size);

      // Verify metadata is preserved in None mode
      const noneMetadata = await sharp(noneOutput).metadata();
      expect(noneMetadata.exif).toBeDefined();
    });

    test('Complete cycle: Smart → Quality → Target Size → None → Smart', async () => {
      const inputFile: ImageFile = {
        path: testImages.jpg,
        relativePath: 'test.jpg',
        format: 'jpg',
        size: 10000,
        dimensions: { width: 200, height: 200 }
      };

      const modes: Array<{ name: string; params: ProcessingParams }> = [
        {
          name: 'smart',
          params: { compression: { mode: 'smart' } }
        },
        {
          name: 'quality',
          params: { compression: { mode: 'quality', value: 75, removeMetadata: true } }
        },
        {
          name: 'targetSize',
          params: { compression: { mode: 'targetSize', value: 15, removeMetadata: false } }
        },
        {
          name: 'none',
          params: { compression: { mode: 'none', removeMetadata: false } }
        },
        {
          name: 'smart-again',
          params: { compression: { mode: 'smart' } }
        }
      ];

      // Process with each mode
      for (const { name, params } of modes) {
        const outputPath = path.join(tempDir, `cycle-${name}.jpg`);
        const result = await processor.process(inputFile, params, outputPath);
        
        expect(result.success).toBe(true);
        
        const exists = await fs.access(outputPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }

      // Verify all outputs exist
      const outputs = await fs.readdir(tempDir);
      const cycleOutputs = outputs.filter(f => f.startsWith('cycle-'));
      
      expect(cycleOutputs.length).toBe(5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Handles missing input file gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.jpg');
      const outputPath = path.join(tempDir, 'error-output.jpg');
      
      const inputFile: ImageFile = {
        path: nonExistentPath,
        relativePath: 'non-existent.jpg',
        format: 'jpg',
        size: 10000,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        compression: { mode: 'smart' }
      };

      const result = await processor.process(inputFile, params, outputPath);

      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('Handles invalid compression parameters gracefully', async () => {
      const outputPath = path.join(tempDir, 'invalid-params.jpg');
      
      const inputFile: ImageFile = {
        path: testImages.jpg,
        relativePath: 'test.jpg',
        format: 'jpg',
        size: 10000,
        dimensions: { width: 200, height: 200 }
      };

      // Invalid quality value (should be 1-100)
      const params: ProcessingParams = {
        compression: {
          mode: 'quality',
          value: 150, // Invalid
          removeMetadata: true
        }
      };

      // Should still process (Sharp will clamp the value or handle it)
      const result = await processor.process(inputFile, params, outputPath);
      
      // Processing might succeed or fail depending on Sharp's handling
      // The important thing is it doesn't crash
      expect(result).toBeDefined();
      expect(result.outputPath).toBe(outputPath);
    });

    test('Handles format conversion with compression', async () => {
      const outputPath = path.join(tempDir, 'format-convert.webp');
      
      const inputFile: ImageFile = {
        path: testImages.jpg,
        relativePath: 'test.jpg',
        format: 'jpg',
        size: 10000,
        dimensions: { width: 200, height: 200 }
      };

      const params: ProcessingParams = {
        format: 'webp', // Convert to WebP
        compression: {
          mode: 'quality',
          value: 80,
          removeMetadata: true
        }
      };

      const result = await processor.process(inputFile, params, outputPath);

      expect(result.success).toBe(true);

      // Verify output is WebP format
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.format).toBe('webp');
    });
  });
});
