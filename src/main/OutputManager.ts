import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import type { OutputManager, ImageFile } from "./types.js";

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
      "/etc", // System configuration
      "/usr", // System binaries and libraries
      "/bin", // Essential binaries
      "/sbin", // System binaries
      "/boot", // Boot files
      "/sys", // Kernel interface
      "/proc", // Process information
      "/dev", // Device files
      "/root", // Root user home
    ];

    // Check if path starts with any forbidden directory
    const isForbidden = forbiddenDirs.some((forbiddenDir) => {
      const normalizedForbidden = path.resolve(forbiddenDir);
      return (
        resolvedPath === normalizedForbidden ||
        resolvedPath.startsWith(normalizedForbidden + path.sep)
      );
    });

    if (isForbidden) {
      throw new Error(
        `Security: Cannot write to system-critical directory: ${resolvedPath}`,
      );
    }

    // Additional safety: warn if outside user home (but don't block)
    // This allows temp directories for testing while logging suspicious activity
    const userHome = os.homedir();
    const resolvedHome = path.resolve(userHome);

    if (!resolvedPath.startsWith(resolvedHome)) {
      console.warn(
        `Warning: Output directory is outside user home. ` +
          `Path: ${resolvedPath}, User home: ${resolvedHome}`,
      );
    }
  }

  /**
   * Create or reuse the output directories for the given input paths.
   * When the inputs are one or more folders, each folder gets its own
   * "{folderName}-processed" sibling directory so results stay separated.
   * Returns the common parent directory so the UI can reveal all outputs.
   */
  async createOutputDirectory(inputPaths: string[]): Promise<string> {
    if (inputPaths.length === 0) {
      throw new Error("No input paths provided");
    }

    const sourceRoots = new Set<string>();

    for (const inputPath of inputPaths) {
      const stats = await fs.stat(inputPath);
      if (stats.isDirectory()) {
        sourceRoots.add(inputPath);
      } else {
        sourceRoots.add(path.dirname(inputPath));
      }
    }

    // Create a dedicated output directory for each distinct source folder.
    for (const sourceRoot of sourceRoots) {
      const outputPath = this.getOutputDirectoryForSource(sourceRoot);

      // Security check: Validate output directory is within user home
      this.validateOutputDirectorySafety(outputPath);

      // Create the directory
      await fs.mkdir(outputPath, { recursive: true });

      // Verify write permissions
      try {
        await fs.access(outputPath, fs.constants.W_OK);
      } catch (error) {
        throw new Error(
          `Security: No write permission for output directory: ${outputPath}`,
        );
      }
    }

    // Return the common parent directory so the UI can reveal all outputs.
    return this.getCommonParent([...sourceRoots]);
  }

  /**
   * Get the deepest common parent directory of the given paths.
   */
  private getCommonParent(paths: string[]): string {
    if (paths.length === 0) {
      throw new Error("No paths provided");
    }
    if (paths.length === 1) {
      return path.dirname(paths[0]);
    }

    const normalized = paths.map((p) => path.resolve(p));
    const splitPaths = normalized.map((p) => p.split(path.sep));
    const first = splitPaths[0];
    const common: string[] = [];

    for (let i = 0; i < first.length; i++) {
      const segment = first[i];
      if (splitPaths.every((parts) => parts[i] === segment)) {
        common.push(segment);
      } else {
        break;
      }
    }

    const commonPath = common.join(path.sep) || path.sep;
    return commonPath;
  }

  /**
   * Calculate output file path based on whether format conversion occurs.
   *
   * Routing rules (decided with product):
   * - Different format (e.g. jpg -> png): write to the SAME directory as the
   *   original file, keeping the same base name and only changing the
   *   extension. Cannot collide with the original because extensions differ;
   *   any pre-existing same-name target is overwritten.
   * - Same format (e.g. jpg -> jpg): write to the "-processed" folder to
   *   avoid overwriting the original. When the file was dropped as a folder,
   *   results go to that folder's own "{folderName}-processed" directory;
   *   otherwise fall back to outputRoot.
   *
   * @param inputFile The input image file
   * @param outputRoot The root output directory (used as fallback when the
   *        file has no sourceRoot, e.g. individual files from the file dialog)
   * @param format The output format (jpg, png, webp)
   * @returns The full output path
   */
  getOutputPath(
    inputFile: ImageFile,
    outputRoot: string,
    format: string,
  ): string {
    // Different format: write next to the original, only extension differs.
    if (inputFile.format !== format) {
      const originalParsed = path.parse(inputFile.path);
      return path.join(originalParsed.dir, `${originalParsed.name}.${format}`);
    }

    // Same format: write to the -processed folder to avoid clobbering the
    // original.
    const outputDir = inputFile.sourceRoot
      ? this.getOutputDirectoryForSource(inputFile.sourceRoot)
      : outputRoot;

    // Get the relative path without extension
    const parsedPath = path.parse(inputFile.relativePath);
    const relativeDir = parsedPath.dir;
    const baseName = parsedPath.name;

    // Construct output path with new format extension
    const outputFileName = `${baseName}.${format}`;
    const outputPath = path.join(outputDir, relativeDir, outputFileName);

    return outputPath;
  }

  /**
   * Resolve the output directory for a given source folder.
   * Format: {sourceFolderName}-processed (sibling of the source folder)
   * @param sourceRoot The source folder path
   * @returns The dedicated output directory for that folder
   */
  getOutputDirectoryForSource(sourceRoot: string): string {
    const baseName = path.basename(sourceRoot);
    const baseDir = path.dirname(sourceRoot);
    return path.join(baseDir, `${baseName}-processed`);
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
      if (error.message && error.message.includes("Path is not a directory")) {
        throw error;
      }
      throw new Error(`Directory does not exist: ${dirPath}`);
    }

    // Open directory based on platform
    const platform = process.platform;

    try {
      if (platform === "win32") {
        // Windows: use explorer
        await execAsync(`explorer "${dirPath}"`);
      } else if (platform === "darwin") {
        // macOS: use open
        await execAsync(`open "${dirPath}"`);
      } else {
        // Linux: use xdg-open
        await execAsync(`xdg-open "${dirPath}"`);
      }
    } catch (error) {
      console.error("Error opening directory:", error);
      throw new Error(
        `Failed to open directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
