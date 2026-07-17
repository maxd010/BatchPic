// Core types for BatchPic

export interface ImageFile {
  path: string; // Full file path
  relativePath: string; // Relative path from input root
  format: "jpg" | "png" | "webp";
  size: number; // File size in bytes
  dimensions: { width: number; height: number };
  sourceRoot?: string; // The top-level folder this file was scanned from (when dropped as a folder)
}

export interface FileScanner {
  scan(paths: string[]): Promise<ImageFile[]>;
}

// Image processing types

export interface ResizeParams {
  mode: "scale" | "width" | "height" | "longEdge" | "shortEdge" | "aspectRatio";
  value: number;
  aspectRatio?: "1:1" | "4:5" | "16:9"; // Only when mode is 'aspectRatio'
}

export interface CompressionParams {
  mode: "smart" | "quality" | "targetSize" | "none";
  value?: number; // KB for targetSize, quality preset for quality mode (optional for smart/none)
  removeMetadata?: boolean; // Whether to remove image metadata (default: true)
}

// Quality preset type for quality mode (10-100)
export type QualityPreset = number;

// Smart compression configuration
export interface SmartCompressionConfig {
  format: "jpg" | "png" | "webp" | "unknown";
  quality: number;
  removeMetadata: boolean;
}

// Stored compression settings for persistence
export interface StoredCompressionSettings {
  mode: "smart" | "quality" | "targetSize" | "none";
  qualityPreset?: QualityPreset;
  targetSize?: number;
  removeMetadata: boolean;
  version: string; // For future data migration
}

// Stored processing settings for full parameter persistence
export interface StoredProcessingSettings {
  // Resize settings
  resizeMode: ResizeParams["mode"] | "none";
  resizeValue?: number;
  aspectRatio?: "1:1" | "4:5" | "16:9";

  // Compression settings
  compressionMode: CompressionParams["mode"];
  qualityPreset?: QualityPreset;
  targetSize?: number;
  removeMetadata: boolean;

  // Format settings
  outputFormat: "jpg" | "png" | "webp" | "original";

  version: string; // For future data migration
}

export interface ProcessingParams {
  resize?: ResizeParams;
  compression?: CompressionParams;
  format?: "jpg" | "png" | "webp";
}

export interface ProcessedImage {
  outputPath: string;
  originalSize: number;
  processedSize: number;
  success: boolean;
  error?: string;
}

export interface ProcessingResult {
  successful: ProcessedImage[];
  failed: ProcessedImage[];
  totalTime: number;
}

export type ProgressCallback = (current: number, total: number) => void;

// Image progress callback for fine-grained progress tracking (Requirements 5.3)
export type ImageProgressCallback = (
  currentIndex: number,
  total: number,
  processedImage: ProcessedImage,
) => void;

export interface ImageProcessor {
  // Process a single image
  process(
    input: ImageFile,
    params: ProcessingParams,
    outputPath: string,
  ): Promise<ProcessedImage>;

  // Process multiple images with progress callback
  processBatch(
    inputs: ImageFile[],
    params: ProcessingParams,
    outputRoot: string,
    onProgress?: ImageProgressCallback,
  ): Promise<ProcessingResult>;
}

// Output management types

export interface OutputManager {
  // Create output directory with timestamp
  createOutputDirectory(inputPaths: string[]): Promise<string>;

  // Calculate output file path (preserving directory structure)
  getOutputPath(
    inputFile: ImageFile,
    outputRoot: string,
    format: string,
  ): string;

  // Open output directory (cross-platform)
  openOutputDirectory(path: string): Promise<void>;
}

// Template management types

export interface Template {
  id: string;
  name: string;
  params: ProcessingParams;
  createdAt: Date;
}

export interface TemplateManager {
  // Save a new template
  save(name: string, params: ProcessingParams): Promise<void>;

  // Load all templates
  loadAll(): Promise<Template[]>;

  // Delete a template
  delete(id: string): Promise<void>;
}
