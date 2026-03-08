/**
 * Constants for image processing
 * 
 * This file contains configuration constants for the image processor,
 * including smart compression mappings and quality presets.
 */

import type { SmartCompressionConfig, QualityPreset } from '../types';

/**
 * Smart compression configuration mapping
 * 
 * Maps image formats to their optimal compression settings.
 * Used by the smart compression mode to automatically select
 * the best quality parameters based on image format.
 * 
 * Requirements:
 * - 2.4: JPG format uses quality 80
 * - 2.5: PNG format uses quality 85
 * - 2.6: WebP format uses quality 80
 * - 9.1-9.4: Smart compression algorithm rules
 */
export const SMART_COMPRESSION_MAP: Record<
  'jpg' | 'png' | 'webp' | 'unknown',
  SmartCompressionConfig
> = {
  jpg: {
    format: 'jpg',
    quality: 80,
    removeMetadata: true,
  },
  png: {
    format: 'png',
    quality: 85,
    removeMetadata: true,
  },
  webp: {
    format: 'webp',
    quality: 80,
    removeMetadata: true,
  },
  unknown: {
    format: 'unknown',
    quality: 80,
    removeMetadata: true,
  },
};

/**
 * Available quality presets for manual quality mode
 */
export const QUALITY_PRESETS: readonly QualityPreset[] = [60, 70, 75, 80, 85, 90] as const;

/**
 * Default quality preset
 */
export const DEFAULT_QUALITY_PRESET: QualityPreset = 80;

/**
 * Target size constraints (in KB)
 */
export const TARGET_SIZE_CONSTRAINTS = {
  MIN: 5,
  MAX: 10000,
  DEFAULT: 200,
} as const;

/**
 * localStorage key for compression settings persistence
 */
export const STORAGE_KEY = 'batchpic_compression_settings';

/**
 * Settings version for data migration
 */
export const SETTINGS_VERSION = '1.0.0';
