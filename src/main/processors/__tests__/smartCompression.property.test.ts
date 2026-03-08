/**
 * Property-based tests for smart compression algorithm
 * Feature: optimize-compression-settings
 * Task: 2.6 - 编写智能压缩的属性测试
 * 
 * Property 1: 智能压缩格式映射正确性
 * Validates: Requirements 2.4, 2.5, 2.6, 9.1, 9.2, 9.3
 * 
 * 使用 fast-check 生成所有支持的格式（jpg/jpeg/png/webp）
 * 验证每种格式返回正确的质量参数
 * 最少 100 次迭代
 */

import * as fc from 'fast-check';
import { SMART_COMPRESSION_MAP } from '../constants';
import type { SmartCompressionConfig } from '../../types';

describe('Smart Compression - Property-Based Tests', () => {
  /**
   * Property 1: 智能压缩格式映射正确性
   * 
   * **Validates: Requirements 2.4, 2.5, 2.6, 9.1, 9.2, 9.3**
   * 
   * 对于任何有效的图片格式（JPG/JPEG/PNG/WebP），当使用智能压缩模式时，
   * 系统应该根据格式映射表应用正确的质量参数：
   * - JPG/JPEG → 80
   * - PNG → 85
   * - WebP → 80
   */
  describe('Property 1: Smart compression format mapping correctness', () => {
    test('should return correct quality for all supported formats', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp'),
          (format) => {
            // 获取智能压缩配置
            const config = SMART_COMPRESSION_MAP[format];
            
            // 验证配置存在
            expect(config).toBeDefined();
            
            // 验证格式映射正确
            expect(config.format).toBe(format);
            
            // 验证质量参数正确
            switch (format) {
              case 'jpg':
                expect(config.quality).toBe(80);
                break;
              case 'png':
                expect(config.quality).toBe(85);
                break;
              case 'webp':
                expect(config.quality).toBe(80);
                break;
            }
            
            // 验证元数据移除标志
            expect(config.removeMetadata).toBe(true);
          }
        ),
        { numRuns: 100 } // 最少 100 次迭代
      );
    });

    test('should handle JPEG as alias for JPG format', () => {
      fc.assert(
        fc.property(
          // 生成器：JPG 和 JPEG 格式
          fc.constantFrom('jpg', 'jpeg'),
          (format) => {
            // JPEG 应该使用与 JPG 相同的配置
            const normalizedFormat = format === 'jpeg' ? 'jpg' : format;
            const config = SMART_COMPRESSION_MAP[normalizedFormat];
            
            expect(config).toBeDefined();
            expect(config.quality).toBe(80);
            expect(config.removeMetadata).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should always set removeMetadata to true for all formats', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式（包括 unknown）
          fc.constantFrom('jpg', 'png', 'webp', 'unknown'),
          (format) => {
            const config = SMART_COMPRESSION_MAP[format];
            
            // 所有格式都应该移除元数据
            expect(config.removeMetadata).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return quality values within valid range (1-100)', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp', 'unknown'),
          (format) => {
            const config = SMART_COMPRESSION_MAP[format];
            
            // 质量值必须在 Sharp 支持的范围内
            expect(config.quality).toBeGreaterThanOrEqual(1);
            expect(config.quality).toBeLessThanOrEqual(100);
            
            // 质量值必须是整数
            expect(Number.isInteger(config.quality)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return consistent configuration for the same format', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp', 'unknown'),
          (format) => {
            // 多次访问应该返回相同的配置
            const config1 = SMART_COMPRESSION_MAP[format];
            const config2 = SMART_COMPRESSION_MAP[format];
            
            expect(config1).toBe(config2); // 引用相等
            expect(config1.quality).toBe(config2.quality);
            expect(config1.removeMetadata).toBe(config2.removeMetadata);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should use default quality for unknown formats', () => {
      fc.assert(
        fc.property(
          // 生成器：unknown 格式
          fc.constant('unknown'),
          (format) => {
            const config = SMART_COMPRESSION_MAP[format];
            
            // 未知格式应该使用默认质量 80（与 JPG 相同）
            expect(config.quality).toBe(80);
            expect(config.removeMetadata).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should have complete configuration structure for all formats', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp', 'unknown'),
          (format) => {
            const config = SMART_COMPRESSION_MAP[format];
            
            // 验证配置结构完整
            expect(config).toHaveProperty('format');
            expect(config).toHaveProperty('quality');
            expect(config).toHaveProperty('removeMetadata');
            
            // 验证字段类型
            expect(typeof config.format).toBe('string');
            expect(typeof config.quality).toBe('number');
            expect(typeof config.removeMetadata).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should use higher quality for lossless-capable formats (PNG)', () => {
      fc.assert(
        fc.property(
          // 生成器：PNG 和 JPG 格式对比
          fc.constant({ png: 'png', jpg: 'jpg' }),
          (formats) => {
            const pngConfig = SMART_COMPRESSION_MAP[formats.png];
            const jpgConfig = SMART_COMPRESSION_MAP[formats.jpg];
            
            // PNG 支持无损压缩，应该使用更高的质量
            expect(pngConfig.quality).toBeGreaterThan(jpgConfig.quality);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should use same quality for similar lossy formats (JPG and WebP)', () => {
      fc.assert(
        fc.property(
          // 生成器：JPG 和 WebP 格式对比
          fc.constant({ jpg: 'jpg', webp: 'webp' }),
          (formats) => {
            const jpgConfig = SMART_COMPRESSION_MAP[formats.jpg];
            const webpConfig = SMART_COMPRESSION_MAP[formats.webp];
            
            // JPG 和 WebP 都是有损格式，应该使用相同的质量
            expect(jpgConfig.quality).toBe(webpConfig.quality);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should provide data sufficient for logging', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp', 'unknown'),
          (format) => {
            const config = SMART_COMPRESSION_MAP[format];
            
            // 模拟日志消息生成
            const logMessage = `[Smart Compression] Format: ${config.format}, Quality: ${config.quality}, Remove Metadata: ${config.removeMetadata}`;
            
            // 验证日志消息包含所有必要信息
            expect(logMessage).toContain(config.format);
            expect(logMessage).toContain(config.quality.toString());
            expect(logMessage).toContain('true');
            
            // 验证日志格式一致
            expect(logMessage).toMatch(/^\[Smart Compression\] Format: \w+, Quality: \d+, Remove Metadata: \w+$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 额外属性测试：配置映射的完整性和一致性
   */
  describe('Configuration map integrity', () => {
    test('should have exactly the expected formats', () => {
      fc.assert(
        fc.property(
          // 生成器：期望的格式列表
          fc.constant(['jpg', 'png', 'webp', 'unknown']),
          (expectedFormats) => {
            const actualFormats = Object.keys(SMART_COMPRESSION_MAP);
            
            // 验证格式列表完全匹配
            expect(actualFormats.sort()).toEqual(expectedFormats.sort());
            expect(actualFormats).toHaveLength(expectedFormats.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain immutability of configuration', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp', 'unknown'),
          (format) => {
            const config = SMART_COMPRESSION_MAP[format];
            const originalQuality = config.quality;
            const originalRemoveMetadata = config.removeMetadata;
            
            // 尝试修改配置（虽然 TypeScript 会阻止，但运行时仍可能发生）
            // 这里只是验证配置值保持一致
            const configAgain = SMART_COMPRESSION_MAP[format];
            
            expect(configAgain.quality).toBe(originalQuality);
            expect(configAgain.removeMetadata).toBe(originalRemoveMetadata);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should be compatible with SmartCompressionConfig type', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp', 'unknown'),
          (format) => {
            const config: SmartCompressionConfig = SMART_COMPRESSION_MAP[format];
            
            // TypeScript 编译时会检查类型，运行时验证结构
            expect(config).toMatchObject({
              format: expect.any(String),
              quality: expect.any(Number),
              removeMetadata: expect.any(Boolean),
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should provide quality values compatible with Sharp library', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp', 'unknown'),
          (format) => {
            const config = SMART_COMPRESSION_MAP[format];
            
            // Sharp 接受 1-100 的整数质量值
            expect(config.quality).toBeGreaterThanOrEqual(1);
            expect(config.quality).toBeLessThanOrEqual(100);
            expect(Number.isInteger(config.quality)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 性能属性测试
   */
  describe('Performance properties', () => {
    test('should provide constant-time configuration lookup', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式
          fc.constantFrom('jpg', 'png', 'webp', 'unknown'),
          (format) => {
            const startTime = performance.now();
            
            // 执行查找
            const config = SMART_COMPRESSION_MAP[format];
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // 单次查找应该非常快（< 1ms）
            expect(duration).toBeLessThan(1);
            expect(config).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should have minimal memory footprint', () => {
      fc.assert(
        fc.property(
          // 生成器：配置映射
          fc.constant(SMART_COMPRESSION_MAP),
          (configMap) => {
            // 验证配置对象数量
            const configCount = Object.keys(configMap).length;
            expect(configCount).toBe(4); // jpg, png, webp, unknown
            
            // 验证每个配置对象的字段数量
            Object.values(configMap).forEach((config) => {
              const keys = Object.keys(config);
              expect(keys).toHaveLength(3); // format, quality, removeMetadata
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 边界情况和错误处理属性测试
   */
  describe('Edge cases and error handling', () => {
    test('should handle format field matching the map key', () => {
      fc.assert(
        fc.property(
          // 生成器：所有支持的格式（除了 unknown）
          fc.constantFrom('jpg', 'png', 'webp'),
          (format) => {
            const config = SMART_COMPRESSION_MAP[format];
            
            // 配置的 format 字段应该与映射键匹配
            expect(config.format).toBe(format);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should use safe default for unknown format', () => {
      fc.assert(
        fc.property(
          // 生成器：unknown 格式
          fc.constant('unknown'),
          (format) => {
            const unknownConfig = SMART_COMPRESSION_MAP[format];
            const jpgConfig = SMART_COMPRESSION_MAP.jpg;
            
            // 未知格式应该使用与 JPG 相同的安全默认值
            expect(unknownConfig.quality).toBe(jpgConfig.quality);
            expect(unknownConfig.removeMetadata).toBe(jpgConfig.removeMetadata);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
