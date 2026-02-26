import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import {
  ImageFile,
  ImageProcessor,
  ProcessingParams,
  ProcessedImage,
  ProcessingResult,
  ProgressCallback,
} from './types';

export class SharpImageProcessor implements ImageProcessor {
  constructor() {
    // Configure Sharp for better performance
    sharp.cache({ memory: 50, files: 20, items: 100 });
    sharp.concurrency(4); // Limit concurrent operations
  }

  /**
   * Process a single image with the given parameters
   */
  async process(
    input: ImageFile,
    params: ProcessingParams,
    outputPath: string
  ): Promise<ProcessedImage> {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Start with sharp instance with performance options
      let pipeline = sharp(input.path, {
        failOnError: false,
        limitInputPixels: 268402689, // ~16k x 16k max
      });

      // Apply resize if specified
      if (params.resize) {
        pipeline = this.applyResize(pipeline, input.dimensions, params.resize);
      }

      // Determine output format
      const outputFormat = params.format || input.format;

      // Handle target size compression separately (requires iteration)
      if (params.compression?.mode === 'targetSize') {
        const targetSizeKB = params.compression.value;
        await this.compressToTargetSize(
          pipeline,
          outputPath,
          outputFormat,
          targetSizeKB
        );
      } else {
        // Apply compression and format conversion
        pipeline = this.applyCompressionAndFormat(pipeline, outputFormat, params.compression);
        
        // Convert to buffer first then write (more reliable than toFile)
        const buffer = await pipeline.toBuffer();
        await fs.writeFile(outputPath, buffer);
      }

      // Get file sizes
      const stats = await fs.stat(outputPath);
      const processedSize = stats.size;

      return {
        outputPath,
        originalSize: input.size,
        processedSize,
        success: true,
      };
    } catch (error) {
      return {
        outputPath,
        originalSize: input.size,
        processedSize: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process multiple images in batch with progress reporting
   */
  async processBatch(
    inputs: ImageFile[],
    params: ProcessingParams,
    outputRoot: string,
    onProgress?: ProgressCallback
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const successful: ProcessedImage[] = [];
    const failed: ProcessedImage[] = [];

    // Process images sequentially
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      
      // Determine output format
      const outputFormat = params.format || input.format;
      
      // Build output path preserving directory structure
      const outputPath = this.getOutputPath(input, outputRoot, outputFormat);

      // Process the image
      const result = await this.process(input, params, outputPath);

      if (result.success) {
        successful.push(result);
      } else {
        failed.push(result);
      }
      
      // Report progress
      if (onProgress) {
        onProgress(i + 1, inputs.length);
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      successful,
      failed,
      totalTime,
    };
  }

  /**
   * Apply resize transformation based on resize parameters
   */
  private applyResize(
    pipeline: sharp.Sharp,
    originalDimensions: { width: number; height: number },
    resize: ProcessingParams['resize']
  ): sharp.Sharp {
    if (!resize) return pipeline;

    const { mode, value, aspectRatio } = resize;

    switch (mode) {
      case 'width':
        return pipeline.resize({ width: value });

      case 'height':
        return pipeline.resize({ height: value });

      case 'longEdge': {
        const isLandscape = originalDimensions.width >= originalDimensions.height;
        return pipeline.resize(
          isLandscape ? { width: value } : { height: value }
        );
      }

      case 'shortEdge': {
        const isLandscape = originalDimensions.width >= originalDimensions.height;
        return pipeline.resize(
          isLandscape ? { height: value } : { width: value }
        );
      }

      case 'aspectRatio': {
        if (!aspectRatio) return pipeline;
        
        const [targetWidth, targetHeight] = this.parseAspectRatio(aspectRatio);
        const targetRatio = targetWidth / targetHeight;
        const currentRatio = originalDimensions.width / originalDimensions.height;

        // Calculate dimensions to fit the target aspect ratio
        let width: number;
        let height: number;

        if (currentRatio > targetRatio) {
          // Image is wider than target ratio - crop width
          height = originalDimensions.height;
          width = Math.round(height * targetRatio);
        } else {
          // Image is taller than target ratio - crop height
          width = originalDimensions.width;
          height = Math.round(width / targetRatio);
        }

        return pipeline.resize(width, height, {
          fit: 'cover',
          position: 'center',
        });
      }

      default:
        return pipeline;
    }
  }

  /**
   * Apply compression and format conversion
   * For targetSize mode, this method is not used - see compressToTargetSize instead
   */
  private applyCompressionAndFormat(
    pipeline: sharp.Sharp,
    format: 'jpg' | 'png' | 'webp',
    compression?: ProcessingParams['compression']
  ): sharp.Sharp {
    // Default compression: 70% quality (approximately -30% file size)
    const defaultQuality = 70;

    if (compression?.mode === 'quality') {
      // Use specified quality percentage
      const quality = compression.value;
      return this.applyFormatWithQuality(pipeline, format, quality);
    } else {
      // No compression specified or targetSize mode, use default
      return this.applyFormatWithQuality(pipeline, format, defaultQuality);
    }
  }

  /**
   * Compress image to target file size using iterative quality adjustment
   * Uses binary search to find the optimal quality setting
   * Optimized to reuse resized buffer
   */
  private async compressToTargetSize(
    pipeline: sharp.Sharp,
    outputPath: string,
    format: 'jpg' | 'png' | 'webp',
    targetSizeKB: number
  ): Promise<void> {
    const targetSizeBytes = targetSizeKB * 1024;
    const tolerance = 0.15; // ±15% tolerance
    const minAcceptableSize = targetSizeBytes * (1 - tolerance);
    const maxAcceptableSize = targetSizeBytes * (1 + tolerance);
    
    let minQuality = 1;
    let maxQuality = 100;
    let bestQuality = 70;
    let bestSize = 0;
    let bestBuffer: Buffer | null = null;
    let iterations = 0;
    const maxIterations = 7; // Reduced iterations for faster processing

    // Get the resized/processed buffer once (without format conversion)
    const inputBuffer = await pipeline.toBuffer();

    while (iterations < maxIterations && minQuality <= maxQuality) {
      iterations++;
      
      // Try current quality
      const currentQuality = Math.round((minQuality + maxQuality) / 2);
      
      // Create a new pipeline from the buffer with format and quality
      let testPipeline = sharp(inputBuffer);
      testPipeline = this.applyFormatWithQuality(testPipeline, format, currentQuality);
      
      // Get buffer to check size
      const outputBuffer = await testPipeline.toBuffer();
      const currentSize = outputBuffer.length;

      // Check if we're within tolerance
      if (currentSize >= minAcceptableSize && currentSize <= maxAcceptableSize) {
        // Found acceptable quality, write to file
        await fs.writeFile(outputPath, outputBuffer);
        return;
      }

      // Update best result
      if (!bestBuffer || Math.abs(currentSize - targetSizeBytes) < Math.abs(bestSize - targetSizeBytes)) {
        bestQuality = currentQuality;
        bestSize = currentSize;
        bestBuffer = outputBuffer;
      }

      // Adjust quality range based on result
      if (currentSize > maxAcceptableSize) {
        // File too large, reduce quality
        maxQuality = currentQuality - 1;
      } else {
        // File too small, increase quality
        minQuality = currentQuality + 1;
      }
    }

    // Use the best result we found
    if (bestBuffer) {
      await fs.writeFile(outputPath, bestBuffer);
    } else {
      // Fallback: use default quality
      let finalPipeline = sharp(inputBuffer);
      finalPipeline = this.applyFormatWithQuality(finalPipeline, format, 70);
      await finalPipeline.toFile(outputPath);
    }
  }

  /**
   * Apply format conversion with quality setting and performance optimizations
   */
  private applyFormatWithQuality(
    pipeline: sharp.Sharp,
    format: 'jpg' | 'png' | 'webp',
    quality: number
  ): sharp.Sharp {
    switch (format) {
      case 'jpg':
        return pipeline.jpeg({ 
          quality,
          mozjpeg: true, // Use mozjpeg for better compression
          chromaSubsampling: '4:2:0'
        });
      case 'png':
        return pipeline.png({ 
          quality,
          compressionLevel: 6, // Balance between speed and compression
          adaptiveFiltering: false // Faster encoding
        });
      case 'webp':
        return pipeline.webp({ 
          quality,
          effort: 4 // Balance between speed and compression (0-6, default 4)
        });
      default:
        return pipeline;
    }
  }

  /**
   * Parse aspect ratio string to width/height values
   */
  private parseAspectRatio(aspectRatio: '1:1' | '4:5' | '16:9'): [number, number] {
    switch (aspectRatio) {
      case '1:1':
        return [1, 1];
      case '4:5':
        return [4, 5];
      case '16:9':
        return [16, 9];
      default:
        return [1, 1];
    }
  }

  /**
   * Get output path preserving directory structure
   */
  private getOutputPath(
    input: ImageFile,
    outputRoot: string,
    format: 'jpg' | 'png' | 'webp'
  ): string {
    const parsedPath = path.parse(input.relativePath);
    const outputFileName = `${parsedPath.name}.${format}`;
    return path.join(outputRoot, parsedPath.dir, outputFileName);
  }
}
