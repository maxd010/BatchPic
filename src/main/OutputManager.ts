import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { OutputManager, ImageFile } from './types';

const execAsync = promisify(exec);

export class OutputManagerImpl implements OutputManager {
  /**
   * Create output directory with timestamp
   * Format: {inputBaseName}-processed-{timestamp}
   * Example: photos-processed-20240115-143022
   */
  async createOutputDirectory(inputPaths: string[]): Promise<string> {
    if (inputPaths.length === 0) {
      throw new Error('No input paths provided');
    }

    // Determine base name from first input path
    const firstPath = inputPaths[0];
    const stats = await fs.stat(firstPath);
    
    let baseName: string;
    let baseDir: string;
    
    if (stats.isDirectory()) {
      baseName = path.basename(firstPath);
      baseDir = path.dirname(firstPath);
    } else {
      // For files, use the parent directory name
      baseDir = path.dirname(firstPath);
      baseName = path.basename(baseDir);
    }

    // Create timestamp: YYYYMMDD-HHMMSS
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '-')
      .slice(0, 15); // YYYYMMDD-HHMMSS

    // Create output directory name
    const outputDirName = `${baseName}-processed-${timestamp}`;
    const outputPath = path.join(baseDir, outputDirName);

    // Create the directory
    await fs.mkdir(outputPath, { recursive: true });

    return outputPath;
  }

  /**
   * Calculate output file path preserving directory structure
   * @param inputFile The input image file
   * @param outputRoot The root output directory
   * @param format The output format (jpg, png, webp)
   * @returns The full output path
   */
  getOutputPath(inputFile: ImageFile, outputRoot: string, format: string): string {
    // Get the relative path without extension
    const parsedPath = path.parse(inputFile.relativePath);
    const relativeDir = parsedPath.dir;
    const baseName = parsedPath.name;

    // Construct output path with new format extension
    const outputFileName = `${baseName}.${format}`;
    const outputPath = path.join(outputRoot, relativeDir, outputFileName);

    return outputPath;
  }

  /**
   * Open output directory in system file explorer (cross-platform)
   * @param dirPath The directory path to open
   */
  async openOutputDirectory(dirPath: string): Promise<void> {
    // Verify directory exists
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${dirPath}`);
      }
    } catch (error: any) {
      if (error.message && error.message.includes('Path is not a directory')) {
        throw error;
      }
      throw new Error(`Directory does not exist: ${dirPath}`);
    }

    // Open directory based on platform
    const platform = process.platform;
    
    try {
      if (platform === 'win32') {
        // Windows: use explorer
        await execAsync(`explorer "${dirPath}"`);
      } else if (platform === 'darwin') {
        // macOS: use open
        await execAsync(`open "${dirPath}"`);
      } else {
        // Linux: use xdg-open
        await execAsync(`xdg-open "${dirPath}"`);
      }
    } catch (error) {
      throw new Error(`Failed to open directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
