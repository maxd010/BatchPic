export interface ElectronAPI {
  openFileDialog: () => Promise<string[]>;
  scanFiles: (paths: string[]) => Promise<ImageFile[]>;
  processImages: (files: ImageFile[], params: ProcessingParams) => Promise<{ result: ProcessingResult; outputDirectory: string }>;
  estimateFileSize: (filePath: string, params: ProcessingParams) => Promise<number>;
  saveTemplate: (name: string, params: ProcessingParams) => Promise<void>;
  loadTemplates: () => Promise<Template[]>;
  deleteTemplate: (id: string) => Promise<void>;
  openOutputDirectory: (path: string) => Promise<void>;
  loadImagePreview: (filePath: string) => Promise<string>;
  onProcessingProgress: (callback: (progress: number) => void) => () => void;
  
  // Auto-process on drop APIs (Requirements 2.3, 6.1)
  createOutputDirectory: (inputPaths: string[]) => Promise<string>;
  processImagesWithProgress: (
    files: ImageFile[],
    params: ProcessingParams,
    outputDir: string,
    onImageProcessed: (index: number, result: ProcessedImage) => void
  ) => Promise<ProcessingResult>;
}

export interface ImageFile {
  path: string;
  relativePath: string;
  format: 'jpg' | 'png' | 'webp';
  size: number;
  dimensions: { width: number; height: number };
}

export interface ProcessingParams {
  resize?: ResizeParams;
  compression?: CompressionParams;
  format?: 'jpg' | 'png' | 'webp';
}

export interface ResizeParams {
  mode: 'width' | 'height' | 'longEdge' | 'shortEdge' | 'aspectRatio';
  value: number;
  aspectRatio?: '1:1' | '4:5' | '16:9';
}

export interface CompressionParams {
  mode: 'targetSize' | 'quality';
  value: number;
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

export interface Template {
  id: string;
  name: string;
  params: ProcessingParams;
  createdAt: Date;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
