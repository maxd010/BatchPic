/**
 * 持久化工具函数单元测试
 */

import { saveSettings, loadSettings, isValidStoredSettings, migrateOldCompressionParams } from '../storage';
import type { StoredCompressionSettings } from '../../main/types';

describe('storage utils', () => {
  // 保存原始的 localStorage
  let originalLocalStorage: Storage;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // 保存原始 localStorage
    originalLocalStorage = global.localStorage;

    // 创建新的 localStorage mock
    localStorageMock = {};
    global.localStorage = {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        Object.keys(localStorageMock).forEach(key => delete localStorageMock[key]);
      },
      key: (index: number) => Object.keys(localStorageMock)[index] || null,
      length: Object.keys(localStorageMock).length,
    } as Storage;
  });

  afterEach(() => {
    // 恢复原始 localStorage
    global.localStorage = originalLocalStorage;
  });

  describe('isValidStoredSettings', () => {
    it('should return true for valid smart mode settings', () => {
      const settings: StoredCompressionSettings = {
        mode: 'smart',
        removeMetadata: true,
        version: '1.0',
      };

      expect(isValidStoredSettings(settings)).toBe(true);
    });

    it('should return true for valid quality mode settings', () => {
      const settings: StoredCompressionSettings = {
        mode: 'quality',
        qualityPreset: 80,
        removeMetadata: false,
        version: '1.0',
      };

      expect(isValidStoredSettings(settings)).toBe(true);
    });

    it('should return true for valid targetSize mode settings', () => {
      const settings: StoredCompressionSettings = {
        mode: 'targetSize',
        targetSize: 200,
        removeMetadata: true,
        version: '1.0',
      };

      expect(isValidStoredSettings(settings)).toBe(true);
    });

    it('should return true for valid none mode settings', () => {
      const settings: StoredCompressionSettings = {
        mode: 'none',
        removeMetadata: false,
        version: '1.0',
      };

      expect(isValidStoredSettings(settings)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidStoredSettings(null)).toBe(false);
      expect(isValidStoredSettings(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isValidStoredSettings('string')).toBe(false);
      expect(isValidStoredSettings(123)).toBe(false);
      expect(isValidStoredSettings(true)).toBe(false);
    });

    it('should return false for invalid mode', () => {
      const settings = {
        mode: 'invalid',
        removeMetadata: true,
        version: '1.0',
      };

      expect(isValidStoredSettings(settings)).toBe(false);
    });

    it('should return false for missing removeMetadata', () => {
      const settings = {
        mode: 'smart',
        version: '1.0',
      };

      expect(isValidStoredSettings(settings)).toBe(false);
    });

    it('should return false for invalid removeMetadata type', () => {
      const settings = {
        mode: 'smart',
        removeMetadata: 'true',
        version: '1.0',
      };

      expect(isValidStoredSettings(settings)).toBe(false);
    });

    it('should return false for invalid qualityPreset', () => {
      const settings = {
        mode: 'quality',
        qualityPreset: 50, // 不在预设值中
        removeMetadata: true,
        version: '1.0',
      };

      expect(isValidStoredSettings(settings)).toBe(false);
    });

    it('should return false for targetSize out of range', () => {
      const settingsTooSmall = {
        mode: 'targetSize',
        targetSize: 3, // < 5
        removeMetadata: true,
        version: '1.0',
      };

      const settingsTooLarge = {
        mode: 'targetSize',
        targetSize: 15000, // > 10000
        removeMetadata: true,
        version: '1.0',
      };

      expect(isValidStoredSettings(settingsTooSmall)).toBe(false);
      expect(isValidStoredSettings(settingsTooLarge)).toBe(false);
    });

    it('should return false for missing version', () => {
      const settings = {
        mode: 'smart',
        removeMetadata: true,
      };

      expect(isValidStoredSettings(settings)).toBe(false);
    });

    it('should return true for all valid quality presets', () => {
      const validPresets = [60, 70, 75, 80, 85, 90];

      validPresets.forEach(preset => {
        const settings: StoredCompressionSettings = {
          mode: 'quality',
          qualityPreset: preset as any,
          removeMetadata: true,
          version: '1.0',
        };

        expect(isValidStoredSettings(settings)).toBe(true);
      });
    });
  });

  describe('saveSettings', () => {
    it('should save settings to localStorage', () => {
      const settings: StoredCompressionSettings = {
        mode: 'smart',
        removeMetadata: true,
        version: '1.0',
      };

      saveSettings(settings);

      const stored = localStorage.getItem('batchpic_compression_settings');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.mode).toBe('smart');
      expect(parsed.removeMetadata).toBe(true);
      expect(parsed.version).toBe('1.0');
    });

    it('should save quality mode settings with qualityPreset', () => {
      const settings: StoredCompressionSettings = {
        mode: 'quality',
        qualityPreset: 85,
        removeMetadata: false,
        version: '1.0',
      };

      saveSettings(settings);

      const stored = localStorage.getItem('batchpic_compression_settings');
      const parsed = JSON.parse(stored!);

      expect(parsed.mode).toBe('quality');
      expect(parsed.qualityPreset).toBe(85);
      expect(parsed.removeMetadata).toBe(false);
    });

    it('should save targetSize mode settings with targetSize', () => {
      const settings: StoredCompressionSettings = {
        mode: 'targetSize',
        targetSize: 500,
        removeMetadata: true,
        version: '1.0',
      };

      saveSettings(settings);

      const stored = localStorage.getItem('batchpic_compression_settings');
      const parsed = JSON.parse(stored!);

      expect(parsed.mode).toBe('targetSize');
      expect(parsed.targetSize).toBe(500);
    });

    it('should overwrite existing settings', () => {
      const settings1: StoredCompressionSettings = {
        mode: 'smart',
        removeMetadata: true,
        version: '1.0',
      };

      const settings2: StoredCompressionSettings = {
        mode: 'quality',
        qualityPreset: 70,
        removeMetadata: false,
        version: '1.0',
      };

      saveSettings(settings1);
      saveSettings(settings2);

      const stored = localStorage.getItem('batchpic_compression_settings');
      const parsed = JSON.parse(stored!);

      expect(parsed.mode).toBe('quality');
      expect(parsed.qualityPreset).toBe(70);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      const settings: StoredCompressionSettings = {
        mode: 'smart',
        removeMetadata: true,
        version: '1.0',
      };

      // 应该不抛出错误
      expect(() => saveSettings(settings)).not.toThrow();

      // 恢复原始方法
      localStorage.setItem = originalSetItem;
    });
  });

  describe('loadSettings', () => {
    it('should return null when no settings are stored', () => {
      // 确保 localStorage 是空的
      localStorage.clear();
      
      const loaded = loadSettings();
      expect(loaded).toBeNull();
    });

    it('should load saved settings correctly', () => {
      const settings: StoredCompressionSettings = {
        mode: 'quality',
        qualityPreset: 80,
        removeMetadata: true,
        version: '1.0',
      };

      saveSettings(settings);
      const loaded = loadSettings();

      expect(loaded).not.toBeNull();
      expect(loaded!.mode).toBe('quality');
      expect(loaded!.qualityPreset).toBe(80);
      expect(loaded!.removeMetadata).toBe(true);
    });

    it('should return null for corrupted data', () => {
      // 存储无效的 JSON
      localStorage.setItem('batchpic_compression_settings', 'invalid json{');

      const loaded = loadSettings();
      expect(loaded).toBeNull();
    });

    it('should return null for invalid data structure', () => {
      // 存储不符合接口的数据
      const invalidData = {
        mode: 'invalid_mode',
        removeMetadata: 'not_boolean',
      };

      localStorage.setItem('batchpic_compression_settings', JSON.stringify(invalidData));

      const loaded = loadSettings();
      expect(loaded).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.getItem to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error('SecurityError');
      };

      // 应该不抛出错误，返回 null
      const loaded = loadSettings();
      expect(loaded).toBeNull();

      // 恢复原始方法
      localStorage.getItem = originalGetItem;
    });

    it('should perform round-trip correctly for all modes', () => {
      const testCases: StoredCompressionSettings[] = [
        {
          mode: 'smart',
          removeMetadata: true,
          version: '1.0',
        },
        {
          mode: 'quality',
          qualityPreset: 75,
          removeMetadata: false,
          version: '1.0',
        },
        {
          mode: 'targetSize',
          targetSize: 300,
          removeMetadata: true,
          version: '1.0',
        },
        {
          mode: 'none',
          removeMetadata: false,
          version: '1.0',
        },
      ];

      testCases.forEach(settings => {
        localStorage.clear();
        saveSettings(settings);
        const loaded = loadSettings();

        expect(loaded).toEqual(settings);
      });
    });
  });

  describe('migrateOldCompressionParams', () => {
    it('should return default settings for null or undefined input', () => {
      const resultNull = migrateOldCompressionParams(null);
      const resultUndefined = migrateOldCompressionParams(undefined);

      expect(resultNull).toEqual({
        mode: 'smart',
        removeMetadata: true,
        version: '1.0',
      });

      expect(resultUndefined).toEqual({
        mode: 'smart',
        removeMetadata: true,
        version: '1.0',
      });
    });

    it('should return default settings for non-object input', () => {
      const resultString = migrateOldCompressionParams('invalid');
      const resultNumber = migrateOldCompressionParams(123);
      const resultBoolean = migrateOldCompressionParams(true);

      [resultString, resultNumber, resultBoolean].forEach(result => {
        expect(result).toEqual({
          mode: 'smart',
          removeMetadata: true,
          version: '1.0',
        });
      });
    });

    it('should add default removeMetadata: true for old params without it', () => {
      const oldParams = {
        mode: 'quality',
        qualityPreset: 80,
      };

      const migrated = migrateOldCompressionParams(oldParams);

      expect(migrated.removeMetadata).toBe(true);
      expect(migrated.version).toBe('1.0');
    });

    it('should preserve existing removeMetadata value', () => {
      const oldParamsTrue = {
        mode: 'quality',
        qualityPreset: 80,
        removeMetadata: true,
      };

      const oldParamsFalse = {
        mode: 'quality',
        qualityPreset: 80,
        removeMetadata: false,
      };

      const migratedTrue = migrateOldCompressionParams(oldParamsTrue);
      const migratedFalse = migrateOldCompressionParams(oldParamsFalse);

      expect(migratedTrue.removeMetadata).toBe(true);
      expect(migratedFalse.removeMetadata).toBe(false);
    });

    it('should convert unrecognized mode to smart mode', () => {
      const oldParams = {
        mode: 'unknown_mode',
        qualityPreset: 80,
      };

      const migrated = migrateOldCompressionParams(oldParams);

      expect(migrated.mode).toBe('smart');
      expect(migrated.removeMetadata).toBe(true);
      expect(migrated.version).toBe('1.0');
    });

    it('should preserve valid mode values', () => {
      const validModes = ['smart', 'quality', 'targetSize', 'none'];

      validModes.forEach(mode => {
        const oldParams = { mode };
        const migrated = migrateOldCompressionParams(oldParams);

        expect(migrated.mode).toBe(mode);
      });
    });

    it('should migrate quality mode with qualityPreset', () => {
      const oldParams = {
        mode: 'quality',
        qualityPreset: 85,
      };

      const migrated = migrateOldCompressionParams(oldParams);

      expect(migrated).toEqual({
        mode: 'quality',
        qualityPreset: 85,
        removeMetadata: true,
        version: '1.0',
      });
    });

    it('should migrate targetSize mode with targetSize', () => {
      const oldParams = {
        mode: 'targetSize',
        targetSize: 200,
      };

      const migrated = migrateOldCompressionParams(oldParams);

      expect(migrated).toEqual({
        mode: 'targetSize',
        targetSize: 200,
        removeMetadata: true,
        version: '1.0',
      });
    });

    it('should ignore invalid qualityPreset values', () => {
      const oldParams = {
        mode: 'quality',
        qualityPreset: 50, // 不在预设值中
      };

      const migrated = migrateOldCompressionParams(oldParams);

      expect(migrated.qualityPreset).toBeUndefined();
      expect(migrated.mode).toBe('quality');
    });

    it('should accept all valid qualityPreset values', () => {
      const validPresets = [60, 70, 75, 80, 85, 90];

      validPresets.forEach(preset => {
        const oldParams = {
          mode: 'quality',
          qualityPreset: preset,
        };

        const migrated = migrateOldCompressionParams(oldParams);

        expect(migrated.qualityPreset).toBe(preset);
      });
    });

    it('should ignore targetSize out of valid range', () => {
      const oldParamsTooSmall = {
        mode: 'targetSize',
        targetSize: 3, // < 5
      };

      const oldParamsTooLarge = {
        mode: 'targetSize',
        targetSize: 15000, // > 10000
      };

      const migratedSmall = migrateOldCompressionParams(oldParamsTooSmall);
      const migratedLarge = migrateOldCompressionParams(oldParamsTooLarge);

      expect(migratedSmall.targetSize).toBeUndefined();
      expect(migratedLarge.targetSize).toBeUndefined();
    });

    it('should accept targetSize within valid range', () => {
      const testCases = [5, 100, 200, 500, 1000, 10000];

      testCases.forEach(size => {
        const oldParams = {
          mode: 'targetSize',
          targetSize: size,
        };

        const migrated = migrateOldCompressionParams(oldParams);

        expect(migrated.targetSize).toBe(size);
      });
    });

    it('should handle complex old params with multiple fields', () => {
      const oldParams = {
        mode: 'quality',
        qualityPreset: 80,
        removeMetadata: false,
        targetSize: 200, // 应该被忽略，因为 mode 是 quality
      };

      const migrated = migrateOldCompressionParams(oldParams);

      expect(migrated).toEqual({
        mode: 'quality',
        qualityPreset: 80,
        targetSize: 200, // 迁移函数会保留所有有效字段
        removeMetadata: false,
        version: '1.0',
      });
    });

    it('should add version 1.0 to all migrated params', () => {
      const testCases = [
        { mode: 'smart' },
        { mode: 'quality', qualityPreset: 80 },
        { mode: 'targetSize', targetSize: 200 },
        { mode: 'none' },
      ];

      testCases.forEach(oldParams => {
        const migrated = migrateOldCompressionParams(oldParams);
        expect(migrated.version).toBe('1.0');
      });
    });

    it('should handle empty object', () => {
      const oldParams = {};
      const migrated = migrateOldCompressionParams(oldParams);

      expect(migrated).toEqual({
        mode: 'smart',
        removeMetadata: true,
        version: '1.0',
      });
    });

    it('should handle params with extra unknown fields', () => {
      const oldParams = {
        mode: 'quality',
        qualityPreset: 80,
        unknownField: 'should be ignored',
        anotherField: 123,
      };

      const migrated = migrateOldCompressionParams(oldParams);

      expect(migrated).toEqual({
        mode: 'quality',
        qualityPreset: 80,
        removeMetadata: true,
        version: '1.0',
      });
    });
  });

  describe('Processing Settings (Full Parameters)', () => {
    describe('isValidProcessingSettings', () => {
      it('should return true for valid complete settings', () => {
        const settings = {
          resizeMode: 'none' as const,
          compressionMode: 'smart' as const,
          removeMetadata: true,
          outputFormat: 'original' as const,
          version: '1.0',
        };

        const { isValidProcessingSettings } = require('../storage');
        expect(isValidProcessingSettings(settings)).toBe(true);
      });

      it('should return true for settings with resize parameters', () => {
        const settings = {
          resizeMode: 'scale' as const,
          resizeValue: 50,
          compressionMode: 'quality' as const,
          qualityPreset: 80 as const,
          removeMetadata: false,
          outputFormat: 'jpg' as const,
          version: '1.0',
        };

        const { isValidProcessingSettings } = require('../storage');
        expect(isValidProcessingSettings(settings)).toBe(true);
      });

      it('should return false for invalid resizeMode', () => {
        const settings = {
          resizeMode: 'invalid',
          compressionMode: 'smart',
          removeMetadata: true,
          outputFormat: 'original',
          version: '1.0',
        };

        const { isValidProcessingSettings } = require('../storage');
        expect(isValidProcessingSettings(settings)).toBe(false);
      });

      it('should return false for invalid outputFormat', () => {
        const settings = {
          resizeMode: 'none',
          compressionMode: 'smart',
          removeMetadata: true,
          outputFormat: 'invalid',
          version: '1.0',
        };

        const { isValidProcessingSettings } = require('../storage');
        expect(isValidProcessingSettings(settings)).toBe(false);
      });
    });

    describe('saveProcessingSettings', () => {
      it('should save complete processing settings', () => {
        const settings = {
          resizeMode: 'scale' as const,
          resizeValue: 75,
          compressionMode: 'quality' as const,
          qualityPreset: 85 as const,
          removeMetadata: false,
          outputFormat: 'webp' as const,
          version: '1.0',
        };

        const { saveProcessingSettings } = require('../storage');
        saveProcessingSettings(settings);

        const stored = localStorage.getItem('batchpic_processing_settings');
        expect(stored).not.toBeNull();

        const parsed = JSON.parse(stored!);
        expect(parsed).toEqual(settings);
      });

      it('should overwrite existing processing settings', () => {
        const settings1 = {
          resizeMode: 'none' as const,
          compressionMode: 'smart' as const,
          removeMetadata: true,
          outputFormat: 'original' as const,
          version: '1.0',
        };

        const settings2 = {
          resizeMode: 'width' as const,
          resizeValue: 1920,
          compressionMode: 'targetSize' as const,
          targetSize: 200,
          removeMetadata: false,
          outputFormat: 'jpg' as const,
          version: '1.0',
        };

        const { saveProcessingSettings } = require('../storage');
        saveProcessingSettings(settings1);
        saveProcessingSettings(settings2);

        const stored = localStorage.getItem('batchpic_processing_settings');
        const parsed = JSON.parse(stored!);

        expect(parsed).toEqual(settings2);
      });
    });

    describe('loadProcessingSettings', () => {
      it('should return null when no settings are stored', () => {
        localStorage.clear();
        
        const { loadProcessingSettings } = require('../storage');
        const loaded = loadProcessingSettings();
        expect(loaded).toBeNull();
      });

      it('should load saved processing settings correctly', () => {
        const settings = {
          resizeMode: 'longEdge' as const,
          resizeValue: 2048,
          compressionMode: 'quality' as const,
          qualityPreset: 90 as const,
          removeMetadata: true,
          outputFormat: 'png' as const,
          version: '1.0',
        };

        const { saveProcessingSettings, loadProcessingSettings } = require('../storage');
        saveProcessingSettings(settings);
        const loaded = loadProcessingSettings();

        expect(loaded).toEqual(settings);
      });

      it('should return null for invalid processing settings', () => {
        const invalidData = {
          resizeMode: 'invalid',
          compressionMode: 'smart',
          removeMetadata: true,
          outputFormat: 'original',
          version: '1.0',
        };

        localStorage.setItem('batchpic_processing_settings', JSON.stringify(invalidData));

        const { loadProcessingSettings } = require('../storage');
        const loaded = loadProcessingSettings();
        expect(loaded).toBeNull();
      });
    });
  });
});
