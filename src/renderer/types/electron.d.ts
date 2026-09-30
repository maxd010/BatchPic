import type { InputFormat, OutputFormat } from '../../main/formats';

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

  // Preview window APIs
  openPreviewWindow: (data: { originalPath: string; outputPath?: string; filename: string }) => Promise<void>;
  getPreviewData: () => Promise<{ originalPath: string; outputPath?: string; filename: string } | null>;

  // Folder automation (watch folder)
  openDirectoryDialog: () => Promise<string | null>;
  startFolderWatch: (config: FolderWatchConfig) => Promise<FolderWatchStatus>;
  stopFolderWatch: () => Promise<FolderWatchStatus>;
  getFolderWatchStatus: () => Promise<FolderWatchStatus>;
  onFolderWatchEvent: (callback: (event: FolderWatchEvent) => void) => () => void;
  onFolderWatchError: (callback: (payload: { message: string }) => void) => () => void;
}

/** Configuration handed to the main process when starting a watch. */
export interface FolderWatchConfig {
  watchPath: string;
  outputPath: string;
  params: ProcessingParams;
}

export interface FolderWatchStatus {
  isWatching: boolean;
  watchPath: string | null;
  outputPath: string | null;
}

/** One processed-file notification emitted while watching. */
export interface FolderWatchEvent {
  sourceFile: string;
  outputFile?: string;
  outputSize?: number;
  originalSize?: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface ImageFile {
  path: string;
  relativePath: string;
  format: InputFormat;
  size: number;
  dimensions: { width: number; height: number };
  sourceRoot?: string;
}

export interface ProcessingParams {
  resize?: ResizeParams;
  compression?: CompressionParams;
  /** Target format; absent means "keep the source format". */
  format?: OutputFormat;
  /** Replace an existing file at the output path. Defaults to false. */
  overwriteExisting?: boolean;
}

export interface ResizeParams {
  mode: 'scale' | 'width' | 'height' | 'longEdge' | 'shortEdge' | 'aspectRatio';
  value: number;
  aspectRatio?: '1:1' | '4:5' | '16:9';
}

export interface CompressionParams {
  mode: 'smart' | 'quality' | 'targetSize' | 'none';
  value?: number;
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
