import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { FileScanner, ImageFile } from './types';

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];

export class FileScannerImpl implements FileScanner {
  async scan(paths: string[]): Promise<ImageFile[]> {
    const results: ImageFile[] = [];
    
    for (const inputPath of paths) {
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
}
