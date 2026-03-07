import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import * as fileType from 'file-type';
import { FileScanner, ImageFile } from './types.js';

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class FileScannerImpl implements FileScanner {
  async scan(paths: string[]): Promise<ImageFile[]> {
      const results: ImageFile[] = [];

      for (const inputPath of paths) {
        // Validate path before processing
        this.validatePath(inputPath);

        const stat = await fs.stat(inputPath);

        if (stat.isFile()) {
          const imageFile = await this.processFile(inputPath, path.dirname(inputPath));
          if (imageFile) {
            results.push(imageFile);
          }
        } else if (stat.isDirectory()) {
          const files = await this.scanDirectory(inputPath, inputPath);
          results.push(...files);
        }
      }

      return results;
    }


  private async scanDirectory(dirPath: string, rootPath: string): Promise<ImageFile[]> {
    const results: ImageFile[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await this.scanDirectory(fullPath, rootPath);
        results.push(...subFiles);
      } else if (entry.isFile()) {
        const imageFile = await this.processFile(fullPath, rootPath);
        if (imageFile) {
          results.push(imageFile);
        }
      }
    }
    
    return results;
  }

  private async processFile(filePath: string, rootPath: string): Promise<ImageFile | null> {
    const ext = path.extname(filePath).toLowerCase();
    
    // Skip unsupported formats silently
    if (!SUPPORTED_FORMATS.includes(ext)) {
      return null;
    }

    // Validate file type by checking actual file content (magic bytes)
    const isValidImage = await this.validateImageFile(filePath);
    if (!isValidImage) {
      return null;
    }
    
    try {
      const stat = await fs.stat(filePath);
      const metadata = await sharp(filePath).metadata();
      
      if (!metadata.width || !metadata.height || !metadata.format) {
        return null;
      }
      
      // Normalize format name
      let format: 'jpg' | 'png' | 'webp';
      if (metadata.format === 'jpeg') {
        format = 'jpg';
      } else if (metadata.format === 'png' || metadata.format === 'webp') {
        format = metadata.format;
      } else {
        return null;
      }
      
      // Calculate relative path
      const relativePath = path.relative(rootPath, filePath);
      
      return {
        path: filePath,
        relativePath,
        format,
        size: stat.size,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        }
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
        const result = await fileType.fromFile(filePath);
        
        // If file type cannot be determined, reject it
        if (!result) {
          console.warn(`Cannot determine file type: ${filePath}`);
          return false;
        }
        
        // Check if MIME type is in the allowed list
        if (!ALLOWED_MIME_TYPES.includes(result.mime)) {
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
      // Check for path traversal patterns
      if (filePath.includes('..')) {
        throw new Error(`Suspicious path detected: path contains ".." (${filePath})`);
      }

      // Check for home directory shorthand
      if (filePath.includes('~')) {
        throw new Error(`Suspicious path detected: path contains "~" (${filePath})`);
      }

      // Ensure path is absolute
      if (!path.isAbsolute(filePath)) {
        throw new Error(`Invalid path: path must be absolute (${filePath})`);
      }
    }

}
