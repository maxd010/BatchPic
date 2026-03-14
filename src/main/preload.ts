import { contextBridge, ipcRenderer } from "electron";

// ============================================================================
// Parameter Validation Functions (Requirement 11.4)
// ============================================================================

/**
 * Validates that a value is a non-empty array
 */
function validateArray(value: any, fieldName: string): void {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array`);
  }
  if (value.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
}

/**
 * Validates that a value is a non-empty string
 */
function validateString(value: any, fieldName: string): void {
  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} must be a string`);
  }
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
}

/**
 * Validates that a value is a number within a specified range
 */
function validateNumber(
  value: any,
  fieldName: string,
  min?: number,
  max?: number,
): void {
  if (typeof value !== "number") {
    throw new TypeError(`${fieldName} must be a number`);
  }
  if (isNaN(value) || !isFinite(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (min !== undefined && value < min) {
    throw new RangeError(`${fieldName} must be >= ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new RangeError(`${fieldName} must be <= ${max}`);
  }
}

/**
 * Validates that a value is a valid object (not null, not array)
 */
function validateObject(value: any, fieldName: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an object`);
  }
}

/**
 * Validates file paths array
 */
function validateFilePaths(paths: any): void {
  validateArray(paths, "paths");
  paths.forEach((path: any, index: number) => {
    validateString(path, `paths[${index}]`);
  });
}

/**
 * Validates ImageFile object
 */
function validateImageFile(file: any, index: number): void {
  const prefix = `files[${index}]`;
  validateObject(file, prefix);

  // Required fields
  validateString(file.path, `${prefix}.path`);
  validateString(file.relativePath, `${prefix}.relativePath`);
  validateNumber(file.size, `${prefix}.size`, 0);

  // Format validation
  const validFormats = ["jpg", "png", "webp"];
  if (!validFormats.includes(file.format)) {
    throw new Error(
      `${prefix}.format must be one of: ${validFormats.join(", ")}`,
    );
  }

  // Dimensions validation
  validateObject(file.dimensions, `${prefix}.dimensions`);
  validateNumber(file.dimensions.width, `${prefix}.dimensions.width`, 1);
  validateNumber(file.dimensions.height, `${prefix}.dimensions.height`, 1);
}

/**
 * Validates ImageFile array
 */
function validateImageFiles(files: any): void {
  validateArray(files, "files");
  files.forEach((file: any, index: number) => {
    validateImageFile(file, index);
  });
}

/**
 * Validates ResizeParams object
 */
function validateResizeParams(resize: any): void {
  validateObject(resize, "params.resize");

  // Mode validation
  const validModes = [
    "scale",
    "width",
    "height",
    "longEdge",
    "shortEdge",
    "aspectRatio",
  ];
  if (!validModes.includes(resize.mode)) {
    throw new Error(
      `params.resize.mode must be one of: ${validModes.join(", ")}`,
    );
  }

  // Value validation
  validateNumber(resize.value, "params.resize.value", 1);

  // AspectRatio validation (only required when mode is 'aspectRatio')
  if (resize.mode === "aspectRatio") {
    const validRatios = ["1:1", "4:5", "16:9"];
    if (!validRatios.includes(resize.aspectRatio)) {
      throw new Error(
        `params.resize.aspectRatio must be one of: ${validRatios.join(", ")}`,
      );
    }
  }
}

/**
 * Validates CompressionParams object
 */
function validateCompressionParams(compression: any): void {
  validateObject(compression, "params.compression");

  // Mode validation
  const validModes = ["smart", "quality", "targetSize", "none"];
  if (!validModes.includes(compression.mode)) {
    throw new Error(
      `params.compression.mode must be one of: ${validModes.join(", ")}`,
    );
  }

  // Value validation based on mode
  if (compression.mode === "quality") {
    validateNumber(compression.value, "params.compression.value", 0, 100);
  } else if (compression.mode === "targetSize") {
    validateNumber(compression.value, "params.compression.value", 1);
  }
  // smart and none modes don't require value validation
}

/**
 * Validates ProcessingParams object
 */
function validateProcessingParams(params: any): void {
  validateObject(params, "params");

  // Optional resize validation
  if (params.resize !== undefined && params.resize !== null) {
    validateResizeParams(params.resize);
  }

  // Optional compression validation
  if (params.compression !== undefined && params.compression !== null) {
    validateCompressionParams(params.compression);
  }

  // Optional format validation
  if (params.format !== undefined && params.format !== null) {
    const validFormats = ["jpg", "png", "webp"];
    if (!validFormats.includes(params.format)) {
      throw new Error(
        `params.format must be one of: ${validFormats.join(", ")}`,
      );
    }
  }
}

/**
 * Validates callback function
 */
function validateCallback(callback: any, fieldName: string): void {
  if (typeof callback !== "function") {
    throw new TypeError(`${fieldName} must be a function`);
  }
}

// ============================================================================
// Exposed API with Parameter Validation
// ============================================================================

// Startup debug log removed to reduce unnecessary initialization overhead.

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // File operations
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),

  scanFiles: (paths: string[]) => {
    validateFilePaths(paths);
    return ipcRenderer.invoke("scan-files", paths);
  },

  // Image processing
  processImages: (files: any[], params: any) => {
    validateImageFiles(files);
    validateProcessingParams(params);
    return ipcRenderer.invoke("process-images", files, params);
  },

  estimateFileSize: (filePath: string, params: any) => {
    validateString(filePath, "filePath");
    validateProcessingParams(params);
    return ipcRenderer.invoke("estimate-file-size", filePath, params);
  },

  // Template management
  saveTemplate: (name: string, params: any) => {
    validateString(name, "name");
    validateProcessingParams(params);
    return ipcRenderer.invoke("save-template", name, params);
  },

  loadTemplates: () => ipcRenderer.invoke("load-templates"),

  deleteTemplate: (id: string) => {
    validateString(id, "id");
    return ipcRenderer.invoke("delete-template", id);
  },

  // Output management
  openOutputDirectory: (path: string) => {
    validateString(path, "path");
    return ipcRenderer.invoke("open-output-directory", path);
  },

  // Image preview
  loadImagePreview: (filePath: string) => {
    validateString(filePath, "filePath");
    return ipcRenderer.invoke("load-image-preview", filePath);
  },

  // Progress updates
  onProcessingProgress: (callback: (progress: number) => void) => {
    validateCallback(callback, "callback");
    const listener = (_event: any, progress: number) => callback(progress);
    ipcRenderer.on("processing-progress", listener);
    return () => ipcRenderer.removeListener("processing-progress", listener);
  },

  // Auto-process on drop APIs (Requirements 2.3, 5.3, 6.1)
  createOutputDirectory: (inputPaths: string[]) => {
    validateFilePaths(inputPaths);
    return ipcRenderer.invoke("create-output-directory", inputPaths);
  },

  processImagesWithProgress: (
    files: any[],
    params: any,
    outputDir: string,
    onImageProcessed: (index: number, result: any) => void,
  ) => {
    // Validate all parameters (Requirement 11.4)
    validateImageFiles(files);
    validateProcessingParams(params);
    validateString(outputDir, "outputDir");
    validateCallback(onImageProcessed, "onImageProcessed");

    // Register progress listener (Requirements 5.3)
    const progressHandler = (_event: any, index: number, result: any) => {
      onImageProcessed(index, result);
    };
    ipcRenderer.on("image-processed", progressHandler);

    // Invoke processing request
    const resultPromise = ipcRenderer.invoke(
      "process-images-with-progress",
      files,
      params,
      outputDir,
    );

    // Clean up listener when promise completes (Requirements 2.2)
    resultPromise.finally(() => {
      ipcRenderer.removeListener("image-processed", progressHandler);
    });

    return resultPromise;
  },
});

// Startup debug log removed to reduce unnecessary initialization overhead.
