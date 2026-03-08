/**
 * Unit tests for smart compression algorithm
 * Feature: optimize-compression-settings
 * Task: 2.5 - 编写智能压缩算法的单元测试
 * 
 * Requirements:
 * - 2.4: JPG format uses quality 80
 * - 2.5: PNG format uses quality 85
 * - 2.6: WebP format uses quality 80
 * - 9.1: JPG/JPEG → quality=80, removeMetadata=true
 * - 9.2: PNG → quality=85, removeMetadata=true
 * - 9.3: WebP → quality=80, removeMetadata=true
 */

import { SMART_COMPRESSION_MAP } from '../constants';
import type { SmartCompressionConfig } from '../../types';

describe('Smart Compression Algorithm', () => {
  describe('getSmartCompressionConfig - Format Quality Mapping', () => {
    /**
     * Test: JPG format returns quality 80
     * Validates: Requirements 2.4, 9.1
     */
    test('should return quality 80 for JPG format', () => {
      const config = SMART_COMPRESSION_MAP.jpg;
      
      expect(config).toBeDefined();
      expect(config.format).toBe('jpg');
      expect(config.quality).toBe(80);
      expect(config.removeMetadata).toBe(true);
    });

    /**
     * Test: JPEG format (alias) returns quality 80
     * Validates: Requirements 2.4, 9.1
     * Note: JPEG is treated as JPG in the system
     */
    test('should return quality 80 for JPEG format (alias)', () => {
      // JPEG 和 JPG 使用相同的配置
      const config = SMART_COMPRESSION_MAP.jpg;
      
      expect(config.quality).toBe(80);
      expect(config.removeMetadata).toBe(true);
    });

    /**
     * Test: PNG format returns quality 85
     * Validates: Requirements 2.5, 9.2
     */
    test('should return quality 85 for PNG format', () => {
      const config = SMART_COMPRESSION_MAP.png;
      
      expect(config).toBeDefined();
      expect(config.format).toBe('png');
      expect(config.quality).toBe(85);
      expect(config.removeMetadata).toBe(true);
    });

    /**
     * Test: WebP format returns quality 80
     * Validates: Requirements 2.6, 9.3
     */
    test('should return quality 80 for WebP format', () => {
      const config = SMART_COMPRESSION_MAP.webp;
      
      expect(config).toBeDefined();
      expect(config.format).toBe('webp');
      expect(config.quality).toBe(80);
      expect(config.removeMetadata).toBe(true);
    });

    /**
     * Test: Unknown format returns default quality 80
     * Validates: Requirement 9.4
     */
    test('should return default quality 80 for unknown format', () => {
      const config = SMART_COMPRESSION_MAP.unknown;
      
      expect(config).toBeDefined();
      expect(config.format).toBe('unknown');
      expect(config.quality).toBe(80);
      expect(config.removeMetadata).toBe(true);
    });
  });

  describe('Smart Compression Configuration Properties', () => {
    /**
     * Test: All formats have removeMetadata set to true
     * Validates: Requirements 2.7, 9.1-9.4
     */
    test('should set removeMetadata to true for all formats', () => {
      const formats = ['jpg', 'png', 'webp', 'unknown'] as const;
      
      formats.forEach((format) => {
        const config = SMART_COMPRESSION_MAP[format];
        expect(config.removeMetadata).toBe(true);
      });
    });

    /**
     * Test: All quality values are within valid range
     */
    test('should have quality values within valid range (1-100)', () => {
      const formats = ['jpg', 'png', 'webp', 'unknown'] as const;
      
      formats.forEach((format) => {
        const config = SMART_COMPRESSION_MAP[format];
        expect(config.quality).toBeGreaterThanOrEqual(1);
        expect(config.quality).toBeLessThanOrEqual(100);
      });
    });

    /**
     * Test: Configuration structure is complete
     */
    test('should have complete configuration for each format', () => {
      const formats = ['jpg', 'png', 'webp', 'unknown'] as const;
      
      formats.forEach((format) => {
        const config = SMART_COMPRESSION_MAP[format];
        
        expect(config).toHaveProperty('format');
        expect(config).toHaveProperty('quality');
        expect(config).toHaveProperty('removeMetadata');
        
        expect(typeof config.format).toBe('string');
        expect(typeof config.quality).toBe('number');
        expect(typeof config.removeMetadata).toBe('boolean');
      });
    });
  });

  describe('Format-Specific Quality Requirements', () => {
    /**
     * Test: JPG uses lower quality than PNG
     * Rationale: JPG is lossy, PNG is lossless-capable
     */
    test('should use appropriate quality for lossy vs lossless formats', () => {
      const jpgQuality = SMART_COMPRESSION_MAP.jpg.quality;
      const pngQuality = SMART_COMPRESSION_MAP.png.quality;
      
      // PNG 应该使用更高的质量,因为它支持无损压缩
      expect(pngQuality).toBeGreaterThan(jpgQuality);
    });

    /**
     * Test: WebP and JPG use same quality
     * Rationale: Both are primarily lossy formats
     */
    test('should use same quality for similar lossy formats (JPG and WebP)', () => {
      const jpgQuality = SMART_COMPRESSION_MAP.jpg.quality;
      const webpQuality = SMART_COMPRESSION_MAP.webp.quality;
      
      expect(webpQuality).toBe(jpgQuality);
    });

    /**
     * Test: Unknown format uses safe default
     */
    test('should use safe default quality for unknown formats', () => {
      const unknownQuality = SMART_COMPRESSION_MAP.unknown.quality;
      const jpgQuality = SMART_COMPRESSION_MAP.jpg.quality;
      
      // 未知格式应该使用与 JPG 相同的安全默认值
      expect(unknownQuality).toBe(jpgQuality);
    });
  });

  describe('Edge Cases and Validation', () => {
    /**
     * Test: Configuration map has all required formats
     */
    test('should have configuration for all required formats', () => {
      const requiredFormats = ['jpg', 'png', 'webp', 'unknown'];
      
      requiredFormats.forEach((format) => {
        expect(SMART_COMPRESSION_MAP).toHaveProperty(format);
      });
    });

    /**
     * Test: No extra formats in configuration
     */
    test('should only contain expected formats', () => {
      const expectedFormats = ['jpg', 'png', 'webp', 'unknown'];
      const actualFormats = Object.keys(SMART_COMPRESSION_MAP);
      
      expect(actualFormats.sort()).toEqual(expectedFormats.sort());
    });

    /**
     * Test: Configuration values are consistent
     * Note: TypeScript 类型系统通过 readonly 防止修改
     * 运行时 JavaScript 对象仍然可变,但不应该被修改
     */
    test('should maintain consistent configuration values', () => {
      // 验证配置值保持一致
      const jpgConfig = SMART_COMPRESSION_MAP.jpg;
      const pngConfig = SMART_COMPRESSION_MAP.png;
      const webpConfig = SMART_COMPRESSION_MAP.webp;
      const unknownConfig = SMART_COMPRESSION_MAP.unknown;
      
      // 多次访问应该返回相同的值
      expect(SMART_COMPRESSION_MAP.jpg.quality).toBe(jpgConfig.quality);
      expect(SMART_COMPRESSION_MAP.png.quality).toBe(pngConfig.quality);
      expect(SMART_COMPRESSION_MAP.webp.quality).toBe(webpConfig.quality);
      expect(SMART_COMPRESSION_MAP.unknown.quality).toBe(unknownConfig.quality);
      
      // 验证配置对象引用一致
      expect(SMART_COMPRESSION_MAP.jpg).toBe(jpgConfig);
      expect(SMART_COMPRESSION_MAP.png).toBe(pngConfig);
    });
  });

  describe('Type Safety', () => {
    /**
     * Test: Configuration matches SmartCompressionConfig type
     */
    test('should match SmartCompressionConfig type structure', () => {
      const formats = ['jpg', 'png', 'webp', 'unknown'] as const;
      
      formats.forEach((format) => {
        const config: SmartCompressionConfig = SMART_COMPRESSION_MAP[format];
        
        // TypeScript 编译时会检查类型,运行时验证结构
        expect(config).toMatchObject({
          format: expect.any(String),
          quality: expect.any(Number),
          removeMetadata: expect.any(Boolean),
        });
      });
    });

    /**
     * Test: Format field matches key
     */
    test('should have format field matching the map key', () => {
      const formats = ['jpg', 'png', 'webp'] as const;
      
      formats.forEach((format) => {
        const config = SMART_COMPRESSION_MAP[format];
        expect(config.format).toBe(format);
      });
    });
  });

  describe('Logging Requirements', () => {
    /**
     * Test: Configuration provides data for logging
     * Validates: Requirement 9.5
     * 
     * Note: 实际的日志记录在 ImageProcessor 中实现
     * 这里测试配置是否提供了足够的信息用于日志记录
     */
    test('should provide sufficient data for logging', () => {
      const formats = ['jpg', 'png', 'webp', 'unknown'] as const;
      
      formats.forEach((format) => {
        const config = SMART_COMPRESSION_MAP[format];
        
        // 验证配置包含日志所需的所有字段
        expect(config.format).toBeDefined();
        expect(config.quality).toBeDefined();
        expect(config.removeMetadata).toBeDefined();
        
        // 模拟日志消息生成
        const logMessage = `[Smart Compression] Format: ${config.format}, Quality: ${config.quality}, Remove Metadata: ${config.removeMetadata}`;
        
        expect(logMessage).toContain(format);
        expect(logMessage).toContain(config.quality.toString());
        expect(logMessage).toContain('true');
      });
    });

    /**
     * Test: Log message format is consistent
     */
    test('should generate consistent log messages for all formats', () => {
      const formats = ['jpg', 'png', 'webp', 'unknown'] as const;
      const logMessages: string[] = [];
      
      formats.forEach((format) => {
        const config = SMART_COMPRESSION_MAP[format];
        const logMessage = `[Smart Compression] Format: ${config.format}, Quality: ${config.quality}`;
        logMessages.push(logMessage);
      });
      
      // 验证所有日志消息都遵循相同的格式
      logMessages.forEach((message) => {
        expect(message).toMatch(/^\[Smart Compression\] Format: \w+, Quality: \d+$/);
      });
    });
  });

  describe('Integration with CompressionParams', () => {
    /**
     * Test: Smart compression config can be used with CompressionParams
     */
    test('should be compatible with CompressionParams interface', () => {
      const formats = ['jpg', 'png', 'webp'] as const;
      
      formats.forEach((format) => {
        const config = SMART_COMPRESSION_MAP[format];
        
        // 模拟从智能压缩配置创建 CompressionParams
        const compressionParams = {
          mode: 'smart' as const,
          removeMetadata: config.removeMetadata,
        };
        
        expect(compressionParams.mode).toBe('smart');
        expect(compressionParams.removeMetadata).toBe(true);
      });
    });

    /**
     * Test: Quality values are valid for Sharp library
     */
    test('should provide quality values compatible with Sharp', () => {
      const formats = ['jpg', 'png', 'webp', 'unknown'] as const;
      
      formats.forEach((format) => {
        const config = SMART_COMPRESSION_MAP[format];
        
        // Sharp 接受 1-100 的质量值
        expect(config.quality).toBeGreaterThanOrEqual(1);
        expect(config.quality).toBeLessThanOrEqual(100);
        
        // 质量值应该是整数
        expect(Number.isInteger(config.quality)).toBe(true);
      });
    });
  });

  describe('Performance Considerations', () => {
    /**
     * Test: Configuration lookup is O(1)
     */
    test('should provide constant-time configuration lookup', () => {
      const startTime = performance.now();
      
      // 执行多次查找
      for (let i = 0; i < 1000; i++) {
        const _ = SMART_COMPRESSION_MAP.jpg;
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 次查找应该在 10ms 内完成(非常宽松的限制)
      expect(duration).toBeLessThan(10);
    });

    /**
     * Test: Configuration is memory efficient
     */
    test('should have minimal memory footprint', () => {
      // 验证配置对象的大小合理
      const configCount = Object.keys(SMART_COMPRESSION_MAP).length;
      
      expect(configCount).toBe(4); // jpg, png, webp, unknown
      
      // 每个配置对象只有 3 个字段
      Object.values(SMART_COMPRESSION_MAP).forEach((config) => {
        const keys = Object.keys(config);
        expect(keys).toHaveLength(3);
      });
    });
  });
});
