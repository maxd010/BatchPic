import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';
import * as fc from 'fast-check';
import { FileScannerImpl } from '../FileScanner';

describe('FileScanner', () => {
  let scanner: FileScannerImpl;
  let tempDir: string;

  beforeEach(async () => {
    scanner = new FileScannerImpl();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batchpic-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const createTestImage = async (filePath: string, width: number, height: number, format: 'jpeg' | 'png' | 'webp') => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
      .toFormat(format)
      .toFile(filePath);
  };

  describe('path validation', () => {
    it('should reject paths containing ".." as path segment', async () => {
      // Construct a path with ".." that won't be normalized by path.join
      const maliciousPath = tempDir + path.sep + '..' + path.sep + 'etc' + path.sep + 'passwd';

      await expect(scanner.scan([maliciousPath])).rejects.toThrow(
        'Suspicious path detected: path contains ".." segment'
      );
    });

    it('should reject paths containing "~"', async () => {
      // Create an absolute path with "~" in it (not at the start)
      const tildePathUnix = path.join(tempDir, '~user', 'images');

      await expect(scanner.scan([tildePathUnix])).rejects.toThrow(
        'Suspicious path detected: path contains "~"'
      );
    });

    it('should reject relative paths', async () => {
      const relativePath = './images/test.jpg';

      await expect(scanner.scan([relativePath])).rejects.toThrow(
        'Invalid path: path must be absolute'
      );
    });

    it('should accept valid absolute paths', async () => {
      const validPath = path.join(tempDir, 'test.jpg');
      await createTestImage(validPath, 100, 100, 'jpeg');

      const results = await scanner.scan([validPath]);

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(validPath);
    });

    it('should validate all paths in batch before processing', async () => {
      const validPath = path.join(tempDir, 'valid.jpg');
      // Construct a path with ".." that won't be normalized by path.join
      const invalidPath = tempDir + path.sep + '..' + path.sep + 'malicious.jpg';

      await createTestImage(validPath, 100, 100, 'jpeg');

      // Should fail on the invalid path (contains ".." as a path segment)
      await expect(scanner.scan([validPath, invalidPath])).rejects.toThrow(
        'Suspicious path detected'
      );
    });

    it('should handle paths with legitimate ".." in directory names', async () => {
      // Create a directory with ".." in its name (not as path traversal)
      const dirWithDots = path.join(tempDir, 'folder..name');
      const imagePath = path.join(dirWithDots, 'test.jpg');
      await createTestImage(imagePath, 100, 100, 'jpeg');

      // After fix: This should be ACCEPTED because ".." is in the directory name, not a path segment
      const results = await scanner.scan([imagePath]);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(imagePath);
    });

    it('should accept filenames with multiple dots like "背....png"', async () => {
      // Test case for the reported bug: long filename with multiple dots
      const longFileName = 'jimeng-2026-02-08-9367-将图中的男孩变成超人，穿着经典的红蓝色超人紧身衣和披风，保持他的面部特征不变。背....png';
      const imagePath = path.join(tempDir, longFileName);
      await createTestImage(imagePath, 100, 100, 'png');

      // Should be accepted - dots in filename are legitimate
      const results = await scanner.scan([imagePath]);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(imagePath);
      expect(results[0].format).toBe('png');
    });
  });

  describe('single file scanning', () => {
    it('should scan a single JPG file', async () => {
      const filePath = path.join(tempDir, 'test.jpg');
      await createTestImage(filePath, 100, 200, 'jpeg');

      const results = await scanner.scan([filePath]);

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(filePath);
      expect(results[0].format).toBe('jpg');
      expect(results[0].dimensions).toEqual({ width: 100, height: 200 });
      expect(results[0].size).toBeGreaterThan(0);
    });

    it('should scan a single PNG file', async () => {
      const filePath = path.join(tempDir, 'test.png');
      await createTestImage(filePath, 150, 150, 'png');

      const results = await scanner.scan([filePath]);

      expect(results).toHaveLength(1);
      expect(results[0].format).toBe('png');
      expect(results[0].dimensions).toEqual({ width: 150, height: 150 });
    });

    it('should scan a single WebP file', async () => {
      const filePath = path.join(tempDir, 'test.webp');
      await createTestImage(filePath, 200, 100, 'webp');

      const results = await scanner.scan([filePath]);

      expect(results).toHaveLength(1);
      expect(results[0].format).toBe('webp');
      expect(results[0].dimensions).toEqual({ width: 200, height: 100 });
    });
  });

  describe('directory scanning', () => {
    it('should recursively scan directories', async () => {
      // Create nested directory structure
      await createTestImage(path.join(tempDir, 'image1.jpg'), 100, 100, 'jpeg');
      await createTestImage(path.join(tempDir, 'subfolder', 'image2.png'), 200, 200, 'png');
      await createTestImage(path.join(tempDir, 'subfolder', 'nested', 'image3.webp'), 300, 300, 'webp');

      const results = await scanner.scan([tempDir]);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.format).sort()).toEqual(['jpg', 'png', 'webp']);
    });

    it('should preserve directory structure in relative paths', async () => {
      await createTestImage(path.join(tempDir, 'root.jpg'), 100, 100, 'jpeg');
      await createTestImage(path.join(tempDir, 'sub', 'nested.jpg'), 100, 100, 'jpeg');

      const results = await scanner.scan([tempDir]);

      expect(results).toHaveLength(2);
      const rootImage = results.find(r => r.relativePath === 'root.jpg');
      const nestedImage = results.find(r => r.relativePath === path.join('sub', 'nested.jpg'));
      
      expect(rootImage).toBeDefined();
      expect(nestedImage).toBeDefined();
    });
  });

  describe('unsupported file handling', () => {
    it('should skip unsupported file types silently', async () => {
      await createTestImage(path.join(tempDir, 'valid.jpg'), 100, 100, 'jpeg');
      await fs.writeFile(path.join(tempDir, 'text.txt'), 'not an image');
      await fs.writeFile(path.join(tempDir, 'data.json'), '{}');

      const results = await scanner.scan([tempDir]);

      expect(results).toHaveLength(1);
      expect(results[0].relativePath).toBe('valid.jpg');
    });

    it('should handle .jpeg extension as jpg format', async () => {
      const filePath = path.join(tempDir, 'test.jpeg');
      await createTestImage(filePath, 100, 100, 'jpeg');

      const results = await scanner.scan([filePath]);

      expect(results).toHaveLength(1);
      expect(results[0].format).toBe('jpg');
    });
  });

  describe('edge cases', () => {
    it('should handle empty directories', async () => {
      const results = await scanner.scan([tempDir]);
      expect(results).toHaveLength(0);
    });

    it('should handle multiple input paths', async () => {
      const dir1 = path.join(tempDir, 'dir1');
      const dir2 = path.join(tempDir, 'dir2');
      
      await createTestImage(path.join(dir1, 'image1.jpg'), 100, 100, 'jpeg');
      await createTestImage(path.join(dir2, 'image2.png'), 100, 100, 'png');

      const results = await scanner.scan([dir1, dir2]);

      expect(results).toHaveLength(2);
    });

    it('should handle deeply nested directories', async () => {
      // Create a 5-level deep structure
      const deepPath = path.join(tempDir, 'level1', 'level2', 'level3', 'level4', 'level5');
      await createTestImage(path.join(deepPath, 'deep.jpg'), 100, 100, 'jpeg');

      const results = await scanner.scan([tempDir]);

      expect(results).toHaveLength(1);
      expect(results[0].relativePath).toBe(path.join('level1', 'level2', 'level3', 'level4', 'level5', 'deep.jpg'));
    });

    it('should handle files with special characters in names', async () => {
      const specialNames = ['image-1.jpg', 'image_2.png', 'image 3.webp'];
      
      for (const name of specialNames) {
        await createTestImage(path.join(tempDir, name), 100, 100, 
          name.endsWith('.jpg') ? 'jpeg' : name.endsWith('.png') ? 'png' : 'webp');
      }

      const results = await scanner.scan([tempDir]);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.relativePath).sort()).toEqual(specialNames.sort());
    });
  });

  describe('property-based tests', () => {
    // Feature: batchpic, Property 1: 递归文件夹扫描保留结构
    // Validates: Requirements 1.2, 1.3, 6.2
    it('should preserve directory structure for any nested folder layout', async () => {
      // Generator for directory structure: array of relative paths
      const directoryStructureArb = fc.array(
        fc.record({
          relativePath: fc.array(
            fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
            { minLength: 1, maxLength: 3 }
          ).map(parts => parts.join(path.sep)),
          format: fc.constantFrom('jpeg', 'png', 'webp')
        }),
        { minLength: 1, maxLength: 10 }
      );

      await fc.assert(
        fc.asyncProperty(
          directoryStructureArb,
          async (structure) => {
            const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pbt-scan-'));
            
            try {
              // Create all images according to structure
              const expectedPaths = new Set<string>();
              for (const item of structure) {
                const fullPath = path.join(testDir, item.relativePath, `image.${item.format === 'jpeg' ? 'jpg' : item.format}`);
                await createTestImage(fullPath, 100, 100, item.format as 'jpeg' | 'png' | 'webp');
                expectedPaths.add(path.relative(testDir, fullPath));
              }

              // Scan the directory
              const results = await scanner.scan([testDir]);

              // Verify all images were found
              expect(results.length).toBe(expectedPaths.size);

              // Verify relative paths match the structure
              const resultPaths = new Set(results.map(r => r.relativePath));
              expect(resultPaths).toEqual(expectedPaths);

              // Verify all paths are relative and preserve structure
              for (const result of results) {
                expect(path.isAbsolute(result.relativePath)).toBe(false);
                expect(result.path).toBe(path.join(testDir, result.relativePath));
              }
            } finally {
              await fs.rm(testDir, { recursive: true, force: true });
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    // Feature: batchpic, Property 2: 不支持的文件被跳过
    // Validates: Requirements 1.5
    it('should skip unsupported files for any mix of file types', async () => {
      const fileListArb = fc.array(
        fc.record({
          name: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          extension: fc.constantFrom('.jpg', '.png', '.webp', '.txt', '.pdf', '.doc', '.json', '.xml')
        }),
        { minLength: 1, maxLength: 15 }
      );

      await fc.assert(
        fc.asyncProperty(
          fileListArb,
          async (files) => {
            const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pbt-skip-'));
            
            try {
              let expectedImageCount = 0;
              
              for (const file of files) {
                const fileName = `${file.name}${file.extension}`;
                const filePath = path.join(testDir, fileName);
                
                if (['.jpg', '.png', '.webp'].includes(file.extension)) {
                  const format = file.extension === '.jpg' ? 'jpeg' : file.extension.slice(1) as 'png' | 'webp';
                  await createTestImage(filePath, 100, 100, format);
                  expectedImageCount++;
                } else {
                  // Create non-image file
                  await fs.writeFile(filePath, 'dummy content');
                }
              }

              const results = await scanner.scan([testDir]);

              // Only supported image files should be in results
              expect(results.length).toBe(expectedImageCount);
              
              // All results should be supported formats
              for (const result of results) {
                expect(['jpg', 'png', 'webp']).toContain(result.format);
              }
            } finally {
              await fs.rm(testDir, { recursive: true, force: true });
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });
});
