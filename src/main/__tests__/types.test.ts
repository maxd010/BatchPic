/**
 * Unit tests for type definitions
 * Feature: optimize-compression-settings
 * Task: 1 - 扩展类型定义和数据模型
 */

import type {
  CompressionParams,
  QualityPreset,
  SmartCompressionConfig,
  StoredCompressionSettings,
} from '../types.js';

describe('Type Definitions', () => {
  describe('CompressionParams', () => {
    it('should accept smart mode without value', () => {
      const params: CompressionParams = {
        mode: 'smart',
        removeMetadata: true,
      };
      
      expect(params.mode).toBe('smart');
      expect(params.value).toBeUndefined();
      expect(params.removeMetadata).toBe(true);
    });

    it('should accept quality mode with preset value', () => {
      const params: CompressionParams = {
        mode: 'quality',
        value: 80,
        removeMetadata: false,
      };
      
      expect(params.mode).toBe('quality');
      expect(params.value).toBe(80);
      expect(params.removeMetadata).toBe(false);
    });

    it('should accept targetSize mode with KB value', () => {
      const params: CompressionParams = {
        mode: 'targetSize',
        value: 200,
        removeMetadata: true,
      };
      
      expect(params.mode).toBe('targetSize');
      expect(params.value).toBe(200);
    });

    it('should accept none mode without value', () => {
      const params: CompressionParams = {
        mode: 'none',
        removeMetadata: false,
      };
      
      expect(params.mode).toBe('none');
      expect(params.value).toBeUndefined();
    });

    it('should default removeMetadata to undefined when not specified', () => {
      const params: CompressionParams = {
        mode: 'smart',
      };
      
      expect(params.removeMetadata).toBeUndefined();
    });
  });

  describe('QualityPreset', () => {
    it('should accept all valid preset values', () => {
      const presets: QualityPreset[] = [60, 70, 75, 80, 85, 90];
      
      presets.forEach(preset => {
        expect([60, 70, 75, 80, 85, 90]).toContain(preset);
      });
    });
  });

  describe('SmartCompressionConfig', () => {
    it('should define config for JPG format', () => {
      const config: SmartCompressionConfig = {
        format: 'jpg',
        quality: 80,
        removeMetadata: true,
      };
      
      expect(config.format).toBe('jpg');
      expect(config.quality).toBe(80);
      expect(config.removeMetadata).toBe(true);
    });

    it('should define config for PNG format', () => {
      const config: SmartCompressionConfig = {
        format: 'png',
        quality: 85,
        removeMetadata: true,
      };
      
      expect(config.format).toBe('png');
      expect(config.quality).toBe(85);
    });

    it('should define config for WebP format', () => {
      const config: SmartCompressionConfig = {
        format: 'webp',
        quality: 80,
        removeMetadata: true,
      };
      
      expect(config.format).toBe('webp');
      expect(config.quality).toBe(80);
    });

    it('should define config for unknown format', () => {
      const config: SmartCompressionConfig = {
        format: 'unknown',
        quality: 80,
        removeMetadata: true,
      };
      
      expect(config.format).toBe('unknown');
    });
  });

  describe('StoredCompressionSettings', () => {
    it('should store smart mode settings', () => {
      const settings: StoredCompressionSettings = {
        mode: 'smart',
        removeMetadata: true,
        version: '1.0',
      };
      
      expect(settings.mode).toBe('smart');
      expect(settings.qualityPreset).toBeUndefined();
      expect(settings.targetSize).toBeUndefined();
      expect(settings.version).toBe('1.0');
    });

    it('should store quality mode settings with preset', () => {
      const settings: StoredCompressionSettings = {
        mode: 'quality',
        qualityPreset: 80,
        removeMetadata: false,
        version: '1.0',
      };
      
      expect(settings.mode).toBe('quality');
      expect(settings.qualityPreset).toBe(80);
      expect(settings.removeMetadata).toBe(false);
    });

    it('should store targetSize mode settings', () => {
      const settings: StoredCompressionSettings = {
        mode: 'targetSize',
        targetSize: 200,
        removeMetadata: true,
        version: '1.0',
      };
      
      expect(settings.mode).toBe('targetSize');
      expect(settings.targetSize).toBe(200);
    });

    it('should store none mode settings', () => {
      const settings: StoredCompressionSettings = {
        mode: 'none',
        removeMetadata: false,
        version: '1.0',
      };
      
      expect(settings.mode).toBe('none');
    });
  });

  describe('Backward Compatibility', () => {
    it('should support old quality mode format', () => {
      // 旧版本格式：mode 只有 'quality' 和 'targetSize'，value 必填
      const oldParams: CompressionParams = {
        mode: 'quality',
        value: 75,
      };
      
      expect(oldParams.mode).toBe('quality');
      expect(oldParams.value).toBe(75);
      // removeMetadata 可选，默认应为 undefined
      expect(oldParams.removeMetadata).toBeUndefined();
    });

    it('should support old targetSize mode format', () => {
      const oldParams: CompressionParams = {
        mode: 'targetSize',
        value: 150,
      };
      
      expect(oldParams.mode).toBe('targetSize');
      expect(oldParams.value).toBe(150);
    });

    it('should allow old params to be assigned to new type', () => {
      // 测试旧版本参数可以赋值给新类型
      const oldQualityParams = {
        mode: 'quality' as const,
        value: 80,
      };
      
      const oldTargetSizeParams = {
        mode: 'targetSize' as const,
        value: 200,
      };
      
      // 这些赋值应该不会产生类型错误
      const newParams1: CompressionParams = oldQualityParams;
      const newParams2: CompressionParams = oldTargetSizeParams;
      
      expect(newParams1.mode).toBe('quality');
      expect(newParams2.mode).toBe('targetSize');
    });

    it('should allow adding removeMetadata to old params', () => {
      // 测试可以为旧参数添加 removeMetadata 字段
      const oldParams: CompressionParams = {
        mode: 'quality',
        value: 75,
      };
      
      const migratedParams: CompressionParams = {
        ...oldParams,
        removeMetadata: true,
      };
      
      expect(migratedParams.mode).toBe('quality');
      expect(migratedParams.value).toBe(75);
      expect(migratedParams.removeMetadata).toBe(true);
    });
  });

  describe('Type Constraints', () => {
    it('should only accept valid compression modes', () => {
      // 测试只接受有效的模式值
      const validModes: Array<CompressionParams['mode']> = [
        'smart',
        'quality',
        'targetSize',
        'none',
      ];
      
      validModes.forEach(mode => {
        const params: CompressionParams = { mode };
        expect(['smart', 'quality', 'targetSize', 'none']).toContain(params.mode);
      });
    });

    it('should only accept valid quality preset values', () => {
      // 测试只接受有效的预设值
      const validPresets: QualityPreset[] = [60, 70, 75, 80, 85, 90];
      
      validPresets.forEach(preset => {
        const params: CompressionParams = {
          mode: 'quality',
          value: preset,
        };
        expect([60, 70, 75, 80, 85, 90]).toContain(params.value);
      });
    });

    it('should accept boolean values for removeMetadata', () => {
      // 测试 removeMetadata 只接受布尔值
      const withTrue: CompressionParams = {
        mode: 'smart',
        removeMetadata: true,
      };
      
      const withFalse: CompressionParams = {
        mode: 'quality',
        value: 80,
        removeMetadata: false,
      };
      
      expect(typeof withTrue.removeMetadata).toBe('boolean');
      expect(typeof withFalse.removeMetadata).toBe('boolean');
    });

    it('should accept valid format values in SmartCompressionConfig', () => {
      // 测试 SmartCompressionConfig 只接受有效的格式
      const validFormats: Array<SmartCompressionConfig['format']> = [
        'jpg',
        'png',
        'webp',
        'unknown',
      ];
      
      validFormats.forEach(format => {
        const config: SmartCompressionConfig = {
          format,
          quality: 80,
          removeMetadata: true,
        };
        expect(['jpg', 'png', 'webp', 'unknown']).toContain(config.format);
      });
    });

    it('should require version field in StoredCompressionSettings', () => {
      // 测试 StoredCompressionSettings 必须包含 version 字段
      const settings: StoredCompressionSettings = {
        mode: 'smart',
        removeMetadata: true,
        version: '1.0',
      };
      
      expect(settings.version).toBeDefined();
      expect(typeof settings.version).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all quality presets in quality mode', () => {
      // 测试所有质量预设值都可以正常使用
      const presets: QualityPreset[] = [60, 70, 75, 80, 85, 90];
      
      presets.forEach(preset => {
        const params: CompressionParams = {
          mode: 'quality',
          value: preset,
          removeMetadata: true,
        };
        
        expect(params.value).toBe(preset);
      });
    });

    it('should handle targetSize with various KB values', () => {
      // 测试目标大小模式支持各种 KB 值
      const sizes = [5, 50, 200, 1000, 10000];
      
      sizes.forEach(size => {
        const params: CompressionParams = {
          mode: 'targetSize',
          value: size,
          removeMetadata: false,
        };
        
        expect(params.value).toBe(size);
      });
    });

    it('should handle smart mode with and without removeMetadata', () => {
      // 测试智能模式可以有或没有 removeMetadata 字段
      const withMetadata: CompressionParams = {
        mode: 'smart',
        removeMetadata: true,
      };
      
      const withoutMetadata: CompressionParams = {
        mode: 'smart',
      };
      
      expect(withMetadata.removeMetadata).toBe(true);
      expect(withoutMetadata.removeMetadata).toBeUndefined();
    });

    it('should handle none mode correctly', () => {
      // 测试不压缩模式
      const noneMode: CompressionParams = {
        mode: 'none',
        removeMetadata: false,
      };
      
      expect(noneMode.mode).toBe('none');
      expect(noneMode.value).toBeUndefined();
      expect(noneMode.removeMetadata).toBe(false);
    });
  });
});
