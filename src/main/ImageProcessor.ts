import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import {
  ImageFile,
  ImageProcessor,
  ProcessingParams,
  ProcessedImage,
  ProcessingResult,
  ImageProgressCallback,
} from './types';
import { SMART_COMPRESSION_MAP } from './processors/constants';

let pLimit: any;

async function initPLimit() {
  if (!pLimit) {
    pLimit = (await import('p-limit')).default;
  }
  return pLimit;
}

export class SharpImageProcessor implements ImageProcessor {
  private concurrencyLimit: number;

  constructor() {
    // Configure Sharp for better performance
    sharp.cache({ memory: 50, files: 20, items: 100 });
    
    // Set concurrency limit to CPU core count (Requirements 5.1, 10.1)
    this.concurrencyLimit = os.cpus().length;
    sharp.concurrency(this.concurrencyLimit);
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
      // Check for large images (Requirements 10.3)
      const totalPixels = input.dimensions.width * input.dimensions.height;
      const MAX_PIXELS = 100_000_000; // 100 million pixels (e.g., 10000x10000)
      
      if (totalPixels > MAX_PIXELS) {
        console.warn(`Large image detected: ${input.relativePath} (${totalPixels} pixels)`);
        
        // Auto-scale down to safe size
        const scale = Math.sqrt(MAX_PIXELS / totalPixels);
        params = {
          ...params,
          resize: {
            mode: 'width',
            value: Math.floor(input.dimensions.width * scale)
          }
        };
      }

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
        const removeMetadata = params.compression.removeMetadata ?? true;
        await this.compressToTargetSize(
          pipeline,
          outputPath,
          outputFormat,
          targetSizeKB,
          removeMetadata
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
   * Process multiple images in batch with concurrent processing and fine-grained progress
   * (Requirements 5.1, 5.2, 5.3, 5.4, 10.1)
   */
  async processBatch(
    inputs: ImageFile[],
    params: ProcessingParams,
    outputRoot: string,
    onProgress?: ImageProgressCallback
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const successful: ProcessedImage[] = [];
    const failed: ProcessedImage[] = [];

    // Performance monitoring: Log batch processing start (Requirements 10.1, 10.5)
    console.log(`[Performance] Starting batch processing: ${inputs.length} images`);
    console.log(`[Performance] Concurrency limit: ${this.concurrencyLimit} (CPU cores: ${os.cpus().length})`);
    
    // Log initial memory usage
    const initialMemory = process.memoryUsage();
    console.log(`[Performance] Initial memory usage: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    // Create concurrency limiter (Requirements 5.1, 10.1)
    const pLimitFn = await initPLimit();
    const limit = pLimitFn(this.concurrencyLimit);

    // Track individual image processing times
    const processingTimes: number[] = [];

    // Process images concurrently with limited concurrency
    const tasks = inputs.map((input, index) =>
      limit(async () => {
        const imageStartTime = Date.now();
        
        try {
          // Determine output format
          const outputFormat = params.format || input.format;
          
          // Build output path preserving directory structure
          const outputPath = this.getOutputPath(input, outputRoot, outputFormat);

          // Process the image (Requirements 5.2)
          const result = await this.process(input, params, outputPath);

          // Track processing time
          const imageProcessingTime = Date.now() - imageStartTime;
          processingTimes.push(imageProcessingTime);

          // Categorize result (Requirements 5.4)
          if (result.success) {
            successful.push(result);
          } else {
            failed.push(result);
          }
          
          // Report per-image progress (Requirements 5.3)
          if (onProgress) {
            onProgress(index, inputs.length, result);
          }

          return result;
        } catch (error) {
          // Track processing time even for failures
          const imageProcessingTime = Date.now() - imageStartTime;
          processingTimes.push(imageProcessingTime);

          // Handle unexpected errors (Requirements 5.4)
          const failedResult: ProcessedImage = {
            outputPath: '',
            originalSize: input.size,
            processedSize: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
          failed.push(failedResult);
          
          // Report failure (Requirements 5.3)
          if (onProgress) {
            onProgress(index, inputs.length, failedResult);
          }

          return failedResult;
        }
      })
    );

    // Wait for all tasks to complete
    await Promise.all(tasks);

    const totalTime = Date.now() - startTime;

    // Performance monitoring: Log batch processing results (Requirements 10.1, 10.5)
    console.log(`[Performance] Batch processing completed in ${totalTime}ms`);
    
    // Calculate and log average processing time per image
    if (processingTimes.length > 0) {
      const avgTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      const minTime = Math.min(...processingTimes);
      const maxTime = Math.max(...processingTimes);
      
      console.log(`[Performance] Average time per image: ${avgTime.toFixed(2)}ms`);
      console.log(`[Performance] Min/Max time: ${minTime}ms / ${maxTime}ms`);
      
      // Warn if average time exceeds requirement (500ms for 1920x1080 @ 70% quality)
      if (avgTime > 500) {
        console.warn(`[Performance] Warning: Average processing time (${avgTime.toFixed(2)}ms) exceeds 500ms target`);
      }
    }
    
    // Log final memory usage
    const finalMemory = process.memoryUsage();
    const memoryDelta = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    console.log(`[Performance] Final memory usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB (${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(2)} MB)`);
    
    // Log success/failure statistics
    console.log(`[Performance] Results: ${successful.length} successful, ${failed.length} failed`);

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
        // Handle smart compression mode (Requirement 2.4-2.6, 7.2)
        if (compression?.mode === 'smart') {
          const config = this.getSmartCompressionConfig(format);
          console.log(`[Smart Compression] Format: ${format}, Quality: ${config.quality}`);
          // Smart mode always removes metadata (Requirement 2.7)
          return this.applyFormatWithQuality(pipeline, format, config.quality, true);
        }

        // Handle no compression mode (quality 100)
        if (compression?.mode === 'none') {
          console.log(`[No Compression] Using quality 100 for format: ${format}`);
          // Respect user's metadata setting (Requirement 5.3, 5.4)
          const removeMetadata = compression.removeMetadata ?? true;
          return this.applyFormatWithQuality(pipeline, format, 100, removeMetadata);
        }

        // Handle quality mode
        if (compression?.mode === 'quality' && compression.value !== undefined) {
          // Respect user's metadata setting (Requirement 5.3, 5.4)
          const removeMetadata = compression.removeMetadata ?? true;
          return this.applyFormatWithQuality(pipeline, format, compression.value, removeMetadata);
        }

        // Default compression: 70% quality (approximately -30% file size)
        const defaultQuality = 70;
        const removeMetadata = compression?.removeMetadata ?? true;
        return this.applyFormatWithQuality(pipeline, format, defaultQuality, removeMetadata);
      }
  /**
   * Get smart compression configuration based on image format
   *
   * This method implements the smart compression algorithm that automatically
   * selects optimal quality parameters based on the input image format.
   *
   * Requirements:
   * - 2.3: Smart compression mode auto-detects input image format
   * - 9.4: Unknown formats use default parameters
   * - 9.5: Log applied parameters in smart compression mode
   *
   * @param format - The detected image format
   * @returns Smart compression configuration with quality and metadata settings
   */
  /**
     * Get smart compression configuration based on image format
     *
     * This method implements the smart compression algorithm that automatically
     * selects optimal quality parameters based on the input image format.
     *
     * Requirements:
     * - 2.3: Smart compression mode auto-detects input image format
     * - 9.4: Unknown formats use default parameters
     * - 9.5: Log applied parameters in smart compression mode
     *
     * @param format - The detected image format
     * @returns Smart compression configuration with quality and metadata settings
     */
    private getSmartCompressionConfig(
        format: 'jpg' | 'png' | 'webp'
      ): { quality: number; removeMetadata: boolean } {
        // Get configuration for the format from the smart compression map
        const config = SMART_COMPRESSION_MAP[format];

        if (!config) {
          // Unknown format - use default configuration (Requirement 9.4)
          console.warn(`[Smart Compression] Unknown format: ${format}, using default quality 80`);
          return { quality: 80, removeMetadata: true };
        }

        // Log the selected configuration (Requirement 9.5)
        console.log(`[Smart Compression] Format: ${format}, Quality: ${config.quality}`);

        // Return only quality and removeMetadata (exclude format field)
        return {
          quality: config.quality,
          removeMetadata: config.removeMetadata,
        };
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
      targetSizeKB: number,
      removeMetadata: boolean = true
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
        testPipeline = this.applyFormatWithQuality(testPipeline, format, currentQuality, removeMetadata);

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
        finalPipeline = this.applyFormatWithQuality(finalPipeline, format, 70, removeMetadata);
        await finalPipeline.toFile(outputPath);
      }
    }

  /**
   * Apply format conversion with quality setting and performance optimizations
   */
  private applyFormatWithQuality(
      pipeline: sharp.Sharp,
      format: 'jpg' | 'png' | 'webp',
      quality: number,
      removeMetadata: boolean = true
    ): sharp.Sharp {
      // Metadata control (Requirements 2.7, 5.3, 5.4)
      // When removeMetadata is false, preserve original metadata
      if (!removeMetadata) {
        pipeline = pipeline.withMetadata();
      }

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
