/**
 * Unit tests for image processing constants
 */

import {
  SMART_COMPRESSION_MAP,
  QUALITY_PRESETS,
  DEFAULT_QUALITY_PRESET,
  TARGET_SIZE_CONSTRAINTS,
  STORAGE_KEY,
  SETTINGS_VERSION,
} from '../constants';

describe('SMART_COMPRESSION_MAP', () => {
  test('should have configuration for JPG format', () => {
    expect(SMART_COMPRESSION_MAP.jpg).toBeDefined();
    expect(SMART_COMPRESSION_MAP.jpg.format).toBe('jpg');
    expect(SMART_COMPRESSION_MAP.jpg.quality).toBe(80);
    expect(SMART_COMPRESSION_MAP.jpg.removeMetadata).toBe(true);
  });

  test('should have configuration for PNG format', () => {
    expect(SMART_COMPRESSION_MAP.png).toBeDefined();
    expect(SMART_COMPRESSION_MAP.png.format).toBe('png');
    expect(SMART_COMPRESSION_MAP.png.quality).toBe(85);
    expect(SMART_COMPRESSION_MAP.png.removeMetadata).toBe(true);
  });

  test('should have configuration for WebP format', () => {
    expect(SMART_COMPRESSION_MAP.webp).toBeDefined();
    expect(SMART_COMPRESSION_MAP.webp.format).toBe('webp');
    expect(SMART_COMPRESSION_MAP.webp.quality).toBe(80);
    expect(SMART_COMPRESSION_MAP.webp.removeMetadata).toBe(true);
  });

  test('should have configuration for unknown format', () => {
    expect(SMART_COMPRESSION_MAP.unknown).toBeDefined();
    expect(SMART_COMPRESSION_MAP.unknown.format).toBe('unknown');
    expect(SMART_COMPRESSION_MAP.unknown.quality).toBe(80);
    expect(SMART_COMPRESSION_MAP.unknown.removeMetadata).toBe(true);
  });

  test('all configurations should have removeMetadata set to true', () => {
    const formats = ['jpg', 'png', 'webp', 'unknown'] as const;
    formats.forEach((format) => {
      expect(SMART_COMPRESSION_MAP[format].removeMetadata).toBe(true);
    });
  });

  test('quality values should be within valid range (1-100)', () => {
    const formats = ['jpg', 'png', 'webp', 'unknown'] as const;
    formats.forEach((format) => {
      const quality = SMART_COMPRESSION_MAP[format].quality;
      expect(quality).toBeGreaterThanOrEqual(1);
      expect(quality).toBeLessThanOrEqual(100);
    });
  });
});

describe('QUALITY_PRESETS', () => {
  test('should contain exactly 6 preset values', () => {
    expect(QUALITY_PRESETS).toHaveLength(6);
  });

  test('should contain the expected preset values', () => {
    expect(QUALITY_PRESETS).toEqual([60, 70, 75, 80, 85, 90]);
  });

  test('should be in ascending order', () => {
    for (let i = 1; i < QUALITY_PRESETS.length; i++) {
      expect(QUALITY_PRESETS[i]).toBeGreaterThan(QUALITY_PRESETS[i - 1]);
    }
  });

  test('all presets should be within valid range (1-100)', () => {
    QUALITY_PRESETS.forEach((preset) => {
      expect(preset).toBeGreaterThanOrEqual(1);
      expect(preset).toBeLessThanOrEqual(100);
    });
  });
});

describe('DEFAULT_QUALITY_PRESET', () => {
  test('should be 80', () => {
    expect(DEFAULT_QUALITY_PRESET).toBe(80);
  });

  test('should be one of the available presets', () => {
    expect(QUALITY_PRESETS).toContain(DEFAULT_QUALITY_PRESET);
  });
});

describe('TARGET_SIZE_CONSTRAINTS', () => {
  test('should have MIN value of 5', () => {
    expect(TARGET_SIZE_CONSTRAINTS.MIN).toBe(5);
  });

  test('should have MAX value of 10000', () => {
    expect(TARGET_SIZE_CONSTRAINTS.MAX).toBe(10000);
  });

  test('should have DEFAULT value of 200', () => {
    expect(TARGET_SIZE_CONSTRAINTS.DEFAULT).toBe(200);
  });

  test('DEFAULT should be within MIN and MAX range', () => {
    expect(TARGET_SIZE_CONSTRAINTS.DEFAULT).toBeGreaterThanOrEqual(
      TARGET_SIZE_CONSTRAINTS.MIN
    );
    expect(TARGET_SIZE_CONSTRAINTS.DEFAULT).toBeLessThanOrEqual(
      TARGET_SIZE_CONSTRAINTS.MAX
    );
  });

  test('MIN should be less than MAX', () => {
    expect(TARGET_SIZE_CONSTRAINTS.MIN).toBeLessThan(TARGET_SIZE_CONSTRAINTS.MAX);
  });
});

describe('STORAGE_KEY', () => {
  test('should be a non-empty string', () => {
    expect(typeof STORAGE_KEY).toBe('string');
    expect(STORAGE_KEY.length).toBeGreaterThan(0);
  });

  test('should have expected value', () => {
    expect(STORAGE_KEY).toBe('batchpic_compression_settings');
  });
});

describe('SETTINGS_VERSION', () => {
  test('should be a non-empty string', () => {
    expect(typeof SETTINGS_VERSION).toBe('string');
    expect(SETTINGS_VERSION.length).toBeGreaterThan(0);
  });

  test('should follow semantic versioning format', () => {
    // Basic semver pattern: X.Y.Z
    const semverPattern = /^\d+\.\d+\.\d+$/;
    expect(SETTINGS_VERSION).toMatch(semverPattern);
  });

  test('should have expected value', () => {
    expect(SETTINGS_VERSION).toBe('1.0.0');
  });
});
