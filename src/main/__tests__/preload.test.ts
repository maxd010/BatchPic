/**
 * Tests for IPC parameter validation in preload.ts
 * Validates Requirement 11.4: Parameter type and validity validation
 */

// Mock electron modules
const mockInvoke = jest.fn();
const mockOn = jest.fn();
const mockRemoveListener = jest.fn();

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn((apiKey, api) => {
      // Store the API for testing
      (global as any).electronAPI = api;
    })
  },
  ipcRenderer: {
    invoke: mockInvoke,
    on: mockOn,
    removeListener: mockRemoveListener
  }
}));

// Import after mocking
import '../preload';

describe('IPC Parameter Validation', () => {
  let electronAPI: any;

  beforeEach(() => {
    electronAPI = (global as any).electronAPI;
    jest.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
  });

  describe('scanFiles validation', () => {
    it('should accept valid file paths array', async () => {
      const paths = ['/path/to/file1.jpg', '/path/to/file2.png'];
      await electronAPI.scanFiles(paths);
      expect(mockInvoke).toHaveBeenCalledWith('scan-files', paths);
    });

    it('should reject non-array paths', () => {
      expect(() => electronAPI.scanFiles('not-an-array')).toThrow('paths must be an array');
    });

    it('should reject empty array', () => {
      expect(() => electronAPI.scanFiles([])).toThrow('paths cannot be empty');
    });

    it('should reject array with non-string elements', () => {
      expect(() => electronAPI.scanFiles([123, 456])).toThrow('paths[0] must be a string');
    });

    it('should reject array with empty strings', () => {
      expect(() => electronAPI.scanFiles(['  ', 'valid'])).toThrow('paths[0] cannot be empty');
    });
  });

  describe('processImages validation', () => {
    const validFile = {
      path: '/path/to/image.jpg',
      relativePath: 'image.jpg',
      format: 'jpg',
      size: 1024,
      dimensions: { width: 800, height: 600 }
    };

    const validParams = {
      compression: { mode: 'quality', value: 70 }
    };

    it('should accept valid files and params', async () => {
      await electronAPI.processImages([validFile], validParams);
      expect(mockInvoke).toHaveBeenCalledWith('process-images', [validFile], validParams);
    });

    it('should reject non-array files', () => {
      expect(() => electronAPI.processImages('not-array', validParams)).toThrow('files must be an array');
    });

    it('should reject empty files array', () => {
      expect(() => electronAPI.processImages([], validParams)).toThrow('files cannot be empty');
    });

    it('should reject file without required fields', () => {
      const invalidFile = { path: '/test.jpg' };
      expect(() => electronAPI.processImages([invalidFile], validParams)).toThrow();
    });

    it('should reject file with invalid format', () => {
      const invalidFile = { ...validFile, format: 'bmp' };
      expect(() => electronAPI.processImages([invalidFile], validParams)).toThrow('format must be one of: jpg, png, webp');
    });

    it('should reject file with negative size', () => {
      const invalidFile = { ...validFile, size: -100 };
      expect(() => electronAPI.processImages([invalidFile], validParams)).toThrow('size must be >= 0');
    });

    it('should reject file with invalid dimensions', () => {
      const invalidFile = { ...validFile, dimensions: { width: 0, height: 600 } };
      expect(() => electronAPI.processImages([invalidFile], validParams)).toThrow('width must be >= 1');
    });

    it('should reject non-object params', () => {
      expect(() => electronAPI.processImages([validFile], 'not-object')).toThrow('params must be an object');
    });

    it('should reject null params', () => {
      expect(() => electronAPI.processImages([validFile], null)).toThrow('params must be an object');
    });
  });

  describe('ProcessingParams validation', () => {
    const validFile = {
      path: '/path/to/image.jpg',
      relativePath: 'image.jpg',
      format: 'jpg',
      size: 1024,
      dimensions: { width: 800, height: 600 }
    };

    it('should accept valid compression params', async () => {
      const params = { compression: { mode: 'quality', value: 70 } };
      await electronAPI.processImages([validFile], params);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should reject quality value > 100', () => {
      const params = { compression: { mode: 'quality', value: 150 } };
      expect(() => electronAPI.processImages([validFile], params)).toThrow('value must be <= 100');
    });

    it('should reject quality value < 0', () => {
      const params = { compression: { mode: 'quality', value: -10 } };
      expect(() => electronAPI.processImages([validFile], params)).toThrow('value must be >= 0');
    });

    it('should accept valid resize params', async () => {
      const params = { resize: { mode: 'width', value: 1920 } };
      await electronAPI.processImages([validFile], params);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should reject invalid resize mode', () => {
      const params = { resize: { mode: 'invalid', value: 1920 } };
      expect(() => electronAPI.processImages([validFile], params)).toThrow('mode must be one of');
    });

    it('should reject resize value < 1', () => {
      const params = { resize: { mode: 'width', value: 0 } };
      expect(() => electronAPI.processImages([validFile], params)).toThrow('value must be >= 1');
    });

    it('should require aspectRatio when mode is aspectRatio', () => {
      const params = { resize: { mode: 'aspectRatio', value: 1920 } };
      expect(() => electronAPI.processImages([validFile], params)).toThrow('aspectRatio must be one of');
    });

    it('should accept valid aspectRatio', async () => {
      const params = { resize: { mode: 'aspectRatio', value: 1920, aspectRatio: '16:9' } };
      await electronAPI.processImages([validFile], params);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should reject invalid format', () => {
      const params = { format: 'bmp' };
      expect(() => electronAPI.processImages([validFile], params)).toThrow('format must be one of: jpg, png, webp');
    });

    it('should accept valid format', async () => {
      const params = { format: 'webp' };
      await electronAPI.processImages([validFile], params);
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe('estimateFileSize validation', () => {
    const validParams = { compression: { mode: 'quality', value: 70 } };

    it('should accept valid filePath and params', async () => {
      await electronAPI.estimateFileSize('/path/to/file.jpg', validParams);
      expect(mockInvoke).toHaveBeenCalledWith('estimate-file-size', '/path/to/file.jpg', validParams);
    });

    it('should reject non-string filePath', () => {
      expect(() => electronAPI.estimateFileSize(123, validParams)).toThrow('filePath must be a string');
    });

    it('should reject empty filePath', () => {
      expect(() => electronAPI.estimateFileSize('  ', validParams)).toThrow('filePath cannot be empty');
    });
  });

  describe('saveTemplate validation', () => {
    const validParams = { compression: { mode: 'quality', value: 70 } };

    it('should accept valid name and params', async () => {
      await electronAPI.saveTemplate('My Template', validParams);
      expect(mockInvoke).toHaveBeenCalledWith('save-template', 'My Template', validParams);
    });

    it('should reject non-string name', () => {
      expect(() => electronAPI.saveTemplate(123, validParams)).toThrow('name must be a string');
    });

    it('should reject empty name', () => {
      expect(() => electronAPI.saveTemplate('  ', validParams)).toThrow('name cannot be empty');
    });
  });

  describe('deleteTemplate validation', () => {
    it('should accept valid id', async () => {
      await electronAPI.deleteTemplate('template-123');
      expect(mockInvoke).toHaveBeenCalledWith('delete-template', 'template-123');
    });

    it('should reject non-string id', () => {
      expect(() => electronAPI.deleteTemplate(123)).toThrow('id must be a string');
    });

    it('should reject empty id', () => {
      expect(() => electronAPI.deleteTemplate('  ')).toThrow('id cannot be empty');
    });
  });

  describe('openOutputDirectory validation', () => {
    it('should accept valid path', async () => {
      await electronAPI.openOutputDirectory('/path/to/output');
      expect(mockInvoke).toHaveBeenCalledWith('open-output-directory', '/path/to/output');
    });

    it('should reject non-string path', () => {
      expect(() => electronAPI.openOutputDirectory(123)).toThrow('path must be a string');
    });

    it('should reject empty path', () => {
      expect(() => electronAPI.openOutputDirectory('  ')).toThrow('path cannot be empty');
    });
  });

  describe('loadImagePreview validation', () => {
    it('should accept valid filePath', async () => {
      await electronAPI.loadImagePreview('/path/to/image.jpg');
      expect(mockInvoke).toHaveBeenCalledWith('load-image-preview', '/path/to/image.jpg');
    });

    it('should reject non-string filePath', () => {
      expect(() => electronAPI.loadImagePreview(123)).toThrow('filePath must be a string');
    });

    it('should reject empty filePath', () => {
      expect(() => electronAPI.loadImagePreview('  ')).toThrow('filePath cannot be empty');
    });
  });

  describe('onProcessingProgress validation', () => {
    it('should accept valid callback', () => {
      const callback = jest.fn();
      const unsubscribe = electronAPI.onProcessingProgress(callback);
      expect(mockOn).toHaveBeenCalledWith('processing-progress', expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('should reject non-function callback', () => {
      expect(() => electronAPI.onProcessingProgress('not-a-function')).toThrow('callback must be a function');
    });

    it('should reject null callback', () => {
      expect(() => electronAPI.onProcessingProgress(null)).toThrow('callback must be a function');
    });
  });

  describe('createOutputDirectory validation', () => {
    it('should accept valid inputPaths', async () => {
      const paths = ['/path/to/file1.jpg', '/path/to/file2.png'];
      await electronAPI.createOutputDirectory(paths);
      expect(mockInvoke).toHaveBeenCalledWith('create-output-directory', paths);
    });

    it('should reject non-array inputPaths', () => {
      expect(() => electronAPI.createOutputDirectory('not-array')).toThrow('paths must be an array');
    });

    it('should reject empty array', () => {
      expect(() => electronAPI.createOutputDirectory([])).toThrow('paths cannot be empty');
    });
  });

  describe('processImagesWithProgress validation', () => {
    const validFile = {
      path: '/path/to/image.jpg',
      relativePath: 'image.jpg',
      format: 'jpg',
      size: 1024,
      dimensions: { width: 800, height: 600 }
    };

    const validParams = { compression: { mode: 'quality', value: 70 } };
    const validOutputDir = '/path/to/output';
    const validCallback = jest.fn();

    it('should accept all valid parameters', async () => {
      mockInvoke.mockResolvedValueOnce({ successful: [], failed: [], totalTime: 0 });
      
      await electronAPI.processImagesWithProgress(
        [validFile],
        validParams,
        validOutputDir,
        validCallback
      );

      expect(mockOn).toHaveBeenCalledWith('image-processed', expect.any(Function));
      expect(mockInvoke).toHaveBeenCalledWith(
        'process-images-with-progress',
        [validFile],
        validParams,
        validOutputDir
      );
    });

    it('should reject invalid files', () => {
      expect(() => 
        electronAPI.processImagesWithProgress('not-array', validParams, validOutputDir, validCallback)
      ).toThrow('files must be an array');
    });

    it('should reject invalid params', () => {
      expect(() =>
        electronAPI.processImagesWithProgress([validFile], null, validOutputDir, validCallback)
      ).toThrow('params must be an object');
    });

    it('should reject invalid outputDir', () => {
      expect(() =>
        electronAPI.processImagesWithProgress([validFile], validParams, 123, validCallback)
      ).toThrow('outputDir must be a string');
    });

    it('should reject invalid callback', () => {
      expect(() =>
        electronAPI.processImagesWithProgress([validFile], validParams, validOutputDir, 'not-function')
      ).toThrow('onImageProcessed must be a function');
    });

    it('should clean up listener after completion', async () => {
      mockInvoke.mockResolvedValueOnce({ successful: [], failed: [], totalTime: 0 });
      
      await electronAPI.processImagesWithProgress(
        [validFile],
        validParams,
        validOutputDir,
        validCallback
      );

      expect(mockRemoveListener).toHaveBeenCalledWith('image-processed', expect.any(Function));
    });
  });

  describe('Edge cases and security', () => {
    it('should reject NaN in number fields', () => {
      const validFile = {
        path: '/path/to/image.jpg',
        relativePath: 'image.jpg',
        format: 'jpg',
        size: NaN,
        dimensions: { width: 800, height: 600 }
      };
      const validParams = { compression: { mode: 'quality', value: 70 } };
      
      expect(() => electronAPI.processImages([validFile], validParams)).toThrow('must be a valid number');
    });

    it('should reject Infinity in number fields', () => {
      const validFile = {
        path: '/path/to/image.jpg',
        relativePath: 'image.jpg',
        format: 'jpg',
        size: 1024,
        dimensions: { width: Infinity, height: 600 }
      };
      const validParams = { compression: { mode: 'quality', value: 70 } };
      
      expect(() => electronAPI.processImages([validFile], validParams)).toThrow('must be a valid number');
    });

    it('should handle multiple validation errors gracefully', () => {
      const invalidFile = {
        path: 123, // Should be string
        relativePath: '',
        format: 'invalid',
        size: -1,
        dimensions: { width: 0, height: -1 }
      };
      const validParams = { compression: { mode: 'quality', value: 70 } };
      
      // Should fail on first validation error
      expect(() => electronAPI.processImages([invalidFile], validParams)).toThrow();
    });
  });
});
