import * as fs from "fs/promises";
import * as path from "path";
import sharp from "sharp";
import fileTypePkg from "file-type";
import { FileScanner, ImageFile } from "./types.js";
import {
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  normalizeFormat,
} from "./formats.js";
import { visualDimensions } from "./processors/exif.js";

const { fromFile: fileTypeFromFile } = fileTypePkg;

export class FileScannerImpl implements FileScanner {
  async scan(paths: string[]): Promise<ImageFile[]> {
    const results: ImageFile[] = [];

    for (const inputPath of paths) {
      // Validate path before processing
      try {
        this.validatePath(inputPath);
      } catch (error) {
        console.error("[FileScanner] Path validation failed:", error);
        throw error;
      }

      const stat = await fs.stat(inputPath);

      if (stat.isFile()) {
        const imageFile = await this.processFile(
          inputPath,
          path.dirname(inputPath),
          path.dirname(inputPath),
        );
        if (imageFile) {
          results.push(imageFile);
        }
      } else if (stat.isDirectory()) {
        const files = await this.scanDirectory(inputPath, inputPath, inputPath);
        results.push(...files);
      }
    }

    return results;
  }

  private async scanDirectory(
    dirPath: string,
    rootPath: string,
    sourceRoot: string,
  ): Promise<ImageFile[]> {
    const results: ImageFile[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await this.scanDirectory(fullPath, rootPath, sourceRoot);
        results.push(...subFiles);
      } else if (entry.isFile()) {
        const imageFile = await this.processFile(fullPath, rootPath, sourceRoot);
        if (imageFile) {
          results.push(imageFile);
        }
      }
    }

    return results;
  }

  private async processFile(
    filePath: string,
    rootPath: string,
    sourceRoot: string,
  ): Promise<ImageFile | null> {
    const ext = path.extname(filePath).toLowerCase();

    // Skip unsupported formats silently
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return null;
    }

    // Validate file type by checking actual file content (magic bytes)
    const isValidImage = await this.validateImageFile(filePath);
    if (!isValidImage) {
      return null;
    }

    try {
      const [stat, metadata] = await Promise.all([
        fs.stat(filePath),
        sharp(filePath).metadata(),
      ]);

      if (!metadata.width || !metadata.height || !metadata.format) {
        return null;
      }

      // Normalize format name. sharp spells JPEG `jpeg` and reports AVIF as
      // `heif` (its container id); everything we do not promise to process
      // normalizes to null and is skipped.
      const format = normalizeFormat(metadata.format);
      if (!format) {
        return null;
      }

      // Calculate relative path
      const relativePath = path.relative(rootPath, filePath);

      // `metadata` gives raw pixel dimensions, which are sideways for EXIF
      // Orientation 5-8. Store the visual size instead: resize modes
      // (longEdge / shortEdge / aspectRatio) read `dimensions` to decide which
      // axis to constrain, and would otherwise constrain the wrong edge of
      // every portrait phone photo.
      return {
        path: filePath,
        relativePath,
        format,
        size: stat.size,
        dimensions: visualDimensions(
          metadata.width,
          metadata.height,
          metadata.orientation,
        ),
        sourceRoot,
      };
    } catch (error) {
      // Skip files that can't be processed (corrupted, etc.)
      return null;
    }
  }

  /**
   * Validates an image file by checking its actual MIME type using magic bytes
   * This prevents processing of malicious files disguised as images
   * @param filePath - The path to the file to validate
   * @returns true if the file is a valid image with allowed MIME type, false otherwise
   */
  private async validateImageFile(filePath: string): Promise<boolean> {
    try {
      const result = await fileTypeFromFile(filePath);

      // If file type cannot be determined, reject it
      if (!result) {
        console.warn(`Cannot determine file type: ${filePath}`);
        return false;
      }

      // Check if MIME type is in the allowed list
      if (!SUPPORTED_MIME_TYPES.includes(result.mime)) {
        console.warn(`Unsupported MIME type ${result.mime}: ${filePath}`);
        return false;
      }

      return true;
    } catch (error) {
      // If validation fails, skip the file silently
      console.warn(`Failed to validate file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Validates a file path for security concerns
   * Rejects paths containing ".." or "~" and ensures paths are absolute
   * @param filePath - The path to validate
   * @throws Error if path is suspicious or invalid
   */
  private validatePath(filePath: string): void {
    // Ensure path is absolute
    if (!path.isAbsolute(filePath)) {
      throw new Error(`Invalid path: path must be absolute (${filePath})`);
    }

    // Check for home directory shorthand
    if (filePath.includes("~")) {
      throw new Error(
        `Suspicious path detected: path contains "~" (${filePath})`,
      );
    }

    // Check for path traversal patterns
    // Split path into segments BEFORE normalization and check if any segment is exactly ".."
    // This allows filenames like "背....png" while blocking "../etc/passwd"
    const segments = filePath.split(path.sep);

    if (segments.includes("..")) {
      throw new Error(
        `Suspicious path detected: path contains ".." segment (${filePath})`,
      );
    }
  }
}
