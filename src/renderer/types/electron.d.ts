export interface ElectronAPI {
  scanFiles: (paths: string[]) => Promise<ImageFile[]>;
  processImages: (files: ImageFile[], params: ProcessingParams) => Promise<{ result: ProcessingResult; outputDirectory: string }>;
  estimateFileSize: (filePath: string, params: ProcessingParams) => Promise<number>;
  saveTemplate: (name: string, params: ProcessingParams) => Promise<void>;
  loadTemplates: () => Promise<Template[]>;
  deleteTemplate: (id: string) => Promise<void>;
  openOutputDirectory: (path: string) => Promise<void>;
  onProcessingProgress: (callback: (progress: number) => void) => void;
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
