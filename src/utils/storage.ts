/**
 * 处理参数持久化工具
 * 
 * 提供 localStorage 的保存和加载功能，用于持久化用户的所有处理参数。
 * 包含数据验证和错误处理，确保在 localStorage 不可用时静默失败。
 */

import type { StoredCompressionSettings, StoredProcessingSettings } from '../main/types.js';

/**
 * localStorage 存储键
 */
const STORAGE_KEY = 'batchpic_compression_settings'; // 保留旧键用于兼容
const STORAGE_KEY_PROCESSING = 'batchpic_processing_settings';   // 新的完整参数存储键

/**
 * 当前数据版本（用于未来的数据迁移）
 */
const CURRENT_VERSION = '1.0';

/**
 * 验证存储的数据是否符合 StoredCompressionSettings 接口
 * 
 * @param data - 待验证的数据
 * @returns 数据是否有效
 */
export function isValidStoredSettings(data: any): data is StoredCompressionSettings {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // 验证 mode 字段
  const validModes = ['smart', 'quality', 'targetSize', 'none'];
  if (!validModes.includes(data.mode)) {
    return false;
  }

  // 验证 removeMetadata 字段
  if (typeof data.removeMetadata !== 'boolean') {
    return false;
  }

  // 验证 qualityPreset 字段（可选）
  if (data.qualityPreset !== undefined) {
    const validPresets = [60, 70, 75, 80, 85, 90];
    if (!validPresets.includes(data.qualityPreset)) {
      return false;
    }
  }

  // 验证 targetSize 字段（可选）
  if (data.targetSize !== undefined) {
    if (typeof data.targetSize !== 'number' || data.targetSize < 5 || data.targetSize > 10000) {
      return false;
    }
  }

  // 验证 version 字段
  if (typeof data.version !== 'string') {
    return false;
  }

  return true;
}

/**
 * 保存压缩设置到 localStorage
 * 
 * @param settings - 要保存的压缩设置
 * 
 * 错误处理：
 * - localStorage 配额已满 → 静默失败
 * - 浏览器隐私模式 → 静默失败
 * - 序列化失败 → 静默失败
 */
export function saveSettings(settings: StoredCompressionSettings): void {
  try {
    // 确保版本号正确
    const settingsWithVersion = {
      ...settings,
      version: CURRENT_VERSION,
    };

    const serialized = JSON.stringify(settingsWithVersion);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    // 静默失败，不影响应用运行
    console.error('[Settings] Failed to save to localStorage:', error);
  }
}

/**
 * 从 localStorage 加载压缩设置
 * 
 * @returns 加载的压缩设置，如果不存在或无效则返回 null
 * 
 * 错误处理：
 * - localStorage 中没有数据 → 返回 null
 * - 数据损坏或格式不正确 → 返回 null
 * - JSON 解析失败 → 返回 null
 */
export function loadSettings(): StoredCompressionSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      // 首次使用，没有保存的设置
      return null;
    }

    const parsed = JSON.parse(stored);

    // 验证数据结构
    if (!isValidStoredSettings(parsed)) {
      console.warn('[Settings] Invalid stored settings, using defaults');
      return null;
    }

    return parsed;
  } catch (error) {
    // 解析失败或其他错误，使用默认设置
    console.error('[Settings] Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * 迁移旧版本的压缩参数到新格式
 * 
 * 处理向后兼容性：
 * - 为旧参数添加默认的 removeMetadata: true
 * - 无法识别的模式转换为智能模式
 * - 添加版本号 '1.0'
 * 
 * @param oldParams - 旧版本的压缩参数
 * @returns 迁移后的 StoredCompressionSettings
 */
export function migrateOldCompressionParams(oldParams: any): StoredCompressionSettings {
  // 默认设置：智能压缩模式
  const defaultSettings: StoredCompressionSettings = {
    mode: 'smart',
    removeMetadata: true,
    version: CURRENT_VERSION,
  };

  // 如果输入无效，返回默认设置
  if (!oldParams || typeof oldParams !== 'object') {
    return defaultSettings;
  }

  // 验证并迁移 mode
  const validModes = ['smart', 'quality', 'targetSize', 'none'];
  const mode = validModes.includes(oldParams.mode) ? oldParams.mode : 'smart';

  // 基础迁移结果
  const migrated: StoredCompressionSettings = {
    mode,
    removeMetadata: oldParams.removeMetadata ?? true, // 旧版本默认移除元数据
    version: CURRENT_VERSION,
  };

  // 迁移 qualityPreset（如果存在）
  if (oldParams.qualityPreset !== undefined) {
    const validPresets = [60, 70, 75, 80, 85, 90];
    if (validPresets.includes(oldParams.qualityPreset)) {
      migrated.qualityPreset = oldParams.qualityPreset;
    }
  }

  // 迁移 targetSize（如果存在）
  if (oldParams.targetSize !== undefined) {
    if (typeof oldParams.targetSize === 'number' && 
        oldParams.targetSize >= 5 && 
        oldParams.targetSize <= 10000) {
      migrated.targetSize = oldParams.targetSize;
    }
  }

  return migrated;
}

/**
 * 验证存储的完整处理参数是否有效
 */
export function isValidProcessingSettings(data: any): data is StoredProcessingSettings {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // 验证 resizeMode
  const validResizeModes = ['none', 'scale', 'width', 'height', 'longEdge', 'shortEdge', 'aspectRatio'];
  if (!validResizeModes.includes(data.resizeMode)) {
    return false;
  }

  // 验证 resizeValue（可选）
  if (data.resizeValue !== undefined && typeof data.resizeValue !== 'number') {
    return false;
  }

  // 验证 aspectRatio（可选）
  if (data.aspectRatio !== undefined) {
    const validRatios = ['1:1', '4:5', '16:9'];
    if (!validRatios.includes(data.aspectRatio)) {
      return false;
    }
  }

  // 验证 compressionMode
  const validCompressionModes = ['smart', 'quality', 'targetSize', 'none'];
  if (!validCompressionModes.includes(data.compressionMode)) {
    return false;
  }

  // 验证 qualityPreset（可选）
  if (data.qualityPreset !== undefined) {
    const validPresets = [60, 70, 75, 80, 85, 90];
    if (!validPresets.includes(data.qualityPreset)) {
      return false;
    }
  }

  // 验证 targetSize（可选）
  if (data.targetSize !== undefined) {
    if (typeof data.targetSize !== 'number' || data.targetSize < 5 || data.targetSize > 10000) {
      return false;
    }
  }

  // 验证 removeMetadata
  if (typeof data.removeMetadata !== 'boolean') {
    return false;
  }

  // 验证 outputFormat
  const validFormats = ['jpg', 'png', 'webp', 'original'];
  if (!validFormats.includes(data.outputFormat)) {
    return false;
  }

  // 验证 version
  if (typeof data.version !== 'string') {
    return false;
  }

  return true;
}

/**
 * 保存完整处理参数到 localStorage
 */
export function saveProcessingSettings(settings: StoredProcessingSettings): void {
  try {
    const settingsWithVersion = {
      ...settings,
      version: CURRENT_VERSION,
    };

    const serialized = JSON.stringify(settingsWithVersion);
    localStorage.setItem(STORAGE_KEY_PROCESSING, serialized);
  } catch (error) {
    console.error('[Settings] Failed to save processing settings:', error);
  }
}

/**
 * 从 localStorage 加载完整处理参数
 */
export function loadProcessingSettings(): StoredProcessingSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROCESSING);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    if (!isValidProcessingSettings(parsed)) {
      console.warn('[Settings] Invalid stored processing settings, using defaults');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[Settings] Failed to load processing settings:', error);
    return null;
  }
}
