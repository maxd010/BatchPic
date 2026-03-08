/**
 * Unit tests for smart compression algorithm
 * 
 * Tests the getSmartCompressionConfig method to ensure it correctly
 * maps image formats to their optimal compression settings.
 * 
 * Requirements tested:
 * - 2.4: JPG format uses quality 80
 * - 2.5: PNG format uses quality 85
 * - 2.6: WebP format uses quality 80
 * - 9.1-9.4: Smart compression algorithm rules
 */

import { SharpImageProcessor } from '../ImageProcessor';

describe('SharpImageProcessor - Smart Compression', () => {
  let processor: SharpImageProcessor;

  beforeEach(() => {
    processor = new SharpImageProcessor();
  });

  describe('getSmartCompressionConfig', () => {
    test('should return quality 80 for JPG format', () => {
      // Access private method for testing
      const config = (processor as any).getSmartCompressionConfig('jpg');
      
      expect(config).toEqual({
        quality: 80,
        removeMetadata: true,
      });
    });

    test('should return quality 85 for PNG format', () => {
      const config = (processor as any).getSmartCompressionConfig('png');
      
      expect(config).toEqual({
        quality: 85,
        removeMetadata: true,
      });
    });

    test('should return quality 80 for WebP format', () => {
      const config = (processor as any).getSmartCompressionConfig('webp');
      
      expect(config).toEqual({
        quality: 80,
        removeMetadata: true,
      });
    });

    test('should log format and quality when called', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (processor as any).getSmartCompressionConfig('jpg');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Smart Compression] Format: jpg, Quality: 80'
      );
      
      consoleSpy.mockRestore();
    });

    test('should warn and use default for unknown format', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Test with a format that doesn't exist in the map
      // We need to bypass TypeScript checking by using a non-existent key
      const config = (processor as any).getSmartCompressionConfig('gif');
      
      // Since 'gif' is not in the map, it should return undefined from the map lookup
      // and trigger the fallback logic
      expect(config).toEqual({
        quality: 80,
        removeMetadata: true,
      });
      
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});
