import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { OutputManagerImpl } from './OutputManager';
import type { ImageFile } from './types';

describe('OutputManager', () => {
  let outputManager: OutputManagerImpl;
  let tempDir: string;

  beforeEach(async () => {
    outputManager = new OutputManagerImpl();
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'batchpic-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createOutputDirectory', () => {
    it('should create output directory with timestamp for single file', async () => {
      // Create a test file
      const testFile = path.join(tempDir, 'test.jpg');
      await fs.writeFile(testFile, 'test');

      const outputPath = await outputManager.createOutputDirectory([testFile]);

      // Verify directory was created
      const stats = await fs.stat(outputPath);
      expect(stats.isDirectory()).toBe(true);

      // Verify naming format: {baseName}-processed-{timestamp}
      const dirName = path.basename(outputPath);
      expect(dirName).toMatch(/^.+-processed-\d{8}-\d{6}$/);
    });

    it('should create output directory with timestamp for folder', async () => {
      // Create a test folder
      const testFolder = path.join(tempDir, 'photos');
      await fs.mkdir(testFolder);

      const outputPath = await outputManager.createOutputDirectory([testFolder]);

      // Verify directory was created
      const stats = await fs.stat(outputPath);
      expect(stats.isDirectory()).toBe(true);

      // Verify naming includes folder name
      const dirName = path.basename(outputPath);
      expect(dirName).toMatch(/^photos-processed-\d{8}-\d{6}$/);
    });

    it('should create output directory in same parent as input', async () => {
      const testFolder = path.join(tempDir, 'photos');
      await fs.mkdir(testFolder);

      const outputPath = await outputManager.createOutputDirectory([testFolder]);

      // Verify output is in same parent directory
      expect(path.dirname(outputPath)).toBe(tempDir);
    });

    it('should throw error for empty input paths', async () => {
      await expect(outputManager.createOutputDirectory([])).rejects.toThrow('No input paths provided');
    });

    it('should create unique directories for multiple calls', async () => {
      const testFile = path.join(tempDir, 'test.jpg');
      await fs.writeFile(testFile, 'test');

      const outputPath1 = await outputManager.createOutputDirectory([testFile]);
      
      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const outputPath2 = await outputManager.createOutputDirectory([testFile]);

      expect(outputPath1).not.toBe(outputPath2);
    });
  });

  describe('getOutputPath', () => {
    it('should preserve directory structure', () => {
      const inputFile: ImageFile = {
        path: '/source/photos/vacation/beach.jpg',
        relativePath: 'vacation/beach.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const outputRoot = '/output';
      const outputPath = outputManager.getOutputPath(inputFile, outputRoot, 'jpg');

      expect(outputPath).toBe(path.join('/output', 'vacation', 'beach.jpg'));
    });

    it('should change file extension based on format', () => {
      const inputFile: ImageFile = {
        path: '/source/photo.jpg',
        relativePath: 'photo.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const outputRoot = '/output';
      const outputPath = outputManager.getOutputPath(inputFile, outputRoot, 'webp');

      expect(outputPath).toBe(path.join('/output', 'photo.webp'));
    });

    it('should handle nested directory structures', () => {
      const inputFile: ImageFile = {
        path: '/source/a/b/c/d/photo.png',
        relativePath: 'a/b/c/d/photo.png',
        format: 'png',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const outputRoot = '/output';
      const outputPath = outputManager.getOutputPath(inputFile, outputRoot, 'png');

      expect(outputPath).toBe(path.join('/output', 'a', 'b', 'c', 'd', 'photo.png'));
    });

    it('should handle files in root directory', () => {
      const inputFile: ImageFile = {
        path: '/source/photo.jpg',
        relativePath: 'photo.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const outputRoot = '/output';
      const outputPath = outputManager.getOutputPath(inputFile, outputRoot, 'jpg');

      expect(outputPath).toBe(path.join('/output', 'photo.jpg'));
    });

    it('should preserve filename but change extension', () => {
      const inputFile: ImageFile = {
        path: '/source/my-photo-2024.jpg',
        relativePath: 'my-photo-2024.jpg',
        format: 'jpg',
        size: 1000,
        dimensions: { width: 100, height: 100 }
      };

      const outputRoot = '/output';
      const outputPath = outputManager.getOutputPath(inputFile, outputRoot, 'png');

      expect(path.basename(outputPath)).toBe('my-photo-2024.png');
    });
  });

  describe('openOutputDirectory', () => {
    it('should throw error for non-existent directory', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist');
      
      await expect(outputManager.openOutputDirectory(nonExistentPath))
        .rejects.toThrow('Directory does not exist');
    });

    it('should throw error for file path instead of directory', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'test');

      await expect(outputManager.openOutputDirectory(testFile))
        .rejects.toThrow('Path is not a directory');
    });

    // Note: We cannot easily test the actual opening of directories in automated tests
    // as it requires interaction with the OS file explorer. The implementation
    // uses platform-specific commands (explorer, open, xdg-open) which would
    // open actual windows during testing.
    
    // Manual testing should verify:
    // - Windows: explorer command opens File Explorer
    // - macOS: open command opens Finder
    // - Linux: xdg-open command opens file manager
  });
});
