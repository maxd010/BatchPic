import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { OutputManager, ImageFile } from './types';

const execAsync = promisify(exec);

export class OutputManagerImpl implements OutputManager {
  /**
   * Validate that output directory is safe to write to
   * Prevents writing to system-critical directories
   * @param dirPath The directory path to validate
   * @throws Error if path is a system-critical directory
   */
  private validateOutputDirectorySafety(dirPath: string): void {
    const resolvedPath = path.resolve(dirPath);

    // Blacklist: prevent writing to system-critical directories
    // These are directories that should never be modified by user applications
    const forbiddenDirs = [
      '/etc',      // System configuration
      '/usr',      // System binaries and libraries
      '/bin',      // Essential binaries
      '/sbin',     // System binaries
      '/boot',     // Boot files
      '/sys',      // Kernel interface
      '/proc',     // Process information
      '/dev',      // Device files
      '/root',     // Root user home
    ];

    // Check if path starts with any forbidden directory
    const isForbidden = forbiddenDirs.some(forbiddenDir => {
      const normalizedForbidden = path.resolve(forbiddenDir);
      return resolvedPath === normalizedForbidden || 
             resolvedPath.startsWith(normalizedForbidden + path.sep);
    });

    if (isForbidden) {
      throw new Error(
        `Security: Cannot write to system-critical directory: ${resolvedPath}`
      );
    }

    // Additional safety: warn if outside user home (but don't block)
    // This allows temp directories for testing while logging suspicious activity
    const userHome = os.homedir();
    const resolvedHome = path.resolve(userHome);
    
    if (!resolvedPath.startsWith(resolvedHome)) {
      console.warn(
        `Warning: Output directory is outside user home. ` +
        `Path: ${resolvedPath}, User home: ${resolvedHome}`
      );
    }
  }

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

    // Security check: Validate output directory is within user home
    this.validateOutputDirectorySafety(outputPath);

    // Create the directory
    await fs.mkdir(outputPath, { recursive: true });

    // Verify write permissions
    try {
      await fs.access(outputPath, fs.constants.W_OK);
    } catch (error) {
      throw new Error(
        `Security: No write permission for output directory: ${outputPath}`
      );
    }

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
      console.error('Error opening directory:', error);
      throw new Error(`Failed to open directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
