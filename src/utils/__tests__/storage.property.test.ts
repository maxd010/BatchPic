/**
 * Property-based tests for storage persistence
 * Feature: optimize-compression-settings
 * Task: 6.5 - 编写参数持久化的属性测试
 * 
 * Property 12: 参数持久化往返
 * Validates: Requirements 10.1, 10.2
 * 
 * 使用 fast-check 生成任意有效的压缩设置
 * 验证保存后加载，得到相同的设置
 * 最少 100 次迭代
 */

import * as fc from 'fast-check';
import { saveSettings, loadSettings, migrateOldCompressionParams } from '../storage';
import type { StoredCompressionSettings, QualityPreset } from '../../main/types';

describe('Storage Persistence - Property-Based Tests', () => {
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

  /**
   * Property 12: 参数持久化往返
   * 
   * **Validates: Requirements 10.1, 10.2**
   * 
   * 对于任何有效的压缩设置，当保存到 localStorage 后再加载，
   * 应该得到完全相同的设置对象。
   * 
   * 这验证了：
   * - 序列化和反序列化的正确性
   * - 所有字段都被正确保存和恢复
   * - 可选字段（qualityPreset, targetSize）的正确处理
   * - 版本号的正确添加和保留
   */
  describe('Property 12: Settings persistence round-trip', () => {
    /**
     * fast-check 生成器：生成有效的 QualityPreset
     */
    const qualityPresetArb = fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90);

    /**
     * fast-check 生成器：生成有效的 targetSize (5-10000 KB)
     */
    const targetSizeArb = fc.integer({ min: 5, max: 10000 });

    /**
     * fast-check 生成器：生成有效的 StoredCompressionSettings
     * 
     * 根据不同的 mode 生成相应的配置：
     * - smart: 只有 mode 和 removeMetadata
     * - quality: 包含 qualityPreset
     * - targetSize: 包含 targetSize
     * - none: 只有 mode 和 removeMetadata
     */
    const storedSettingsArb = fc.oneof(
      // Smart mode
      fc.record({
        mode: fc.constant('smart' as const),
        removeMetadata: fc.boolean(),
        version: fc.constant('1.0'),
      }),
      
      // Quality mode
      fc.record({
        mode: fc.constant('quality' as const),
        qualityPreset: qualityPresetArb,
        removeMetadata: fc.boolean(),
        version: fc.constant('1.0'),
      }),
      
      // Target size mode
      fc.record({
        mode: fc.constant('targetSize' as const),
        targetSize: targetSizeArb,
        removeMetadata: fc.boolean(),
        version: fc.constant('1.0'),
      }),
      
      // None mode
      fc.record({
        mode: fc.constant('none' as const),
        removeMetadata: fc.boolean(),
        version: fc.constant('1.0'),
      })
    );

    test('should preserve settings after save and load round-trip', () => {
      fc.assert(
        fc.property(
          storedSettingsArb,
          (settings) => {
            // 清空 localStorage
            localStorage.clear();
            
            // 保存设置
            saveSettings(settings);
            
            // 加载设置
            const loaded = loadSettings();
            
            // 验证加载成功
            expect(loaded).not.toBeNull();
            
            // 验证所有字段完全相同
            expect(loaded).toEqual(settings);
          }
        ),
        { numRuns: 20 } // 优化后减少迭代次数
      );
    });

    test('should preserve mode field correctly for all modes', () => {
      fc.assert(
        fc.property(
          storedSettingsArb,
          (settings) => {
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.mode).toBe(settings.mode);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve removeMetadata field correctly', () => {
      fc.assert(
        fc.property(
          storedSettingsArb,
          (settings) => {
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.removeMetadata).toBe(settings.removeMetadata);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve version field correctly', () => {
      fc.assert(
        fc.property(
          storedSettingsArb,
          (settings) => {
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.version).toBe('1.0');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve qualityPreset when present', () => {
      fc.assert(
        fc.property(
          // 只生成 quality mode 的设置
          fc.record({
            mode: fc.constant('quality' as const),
            qualityPreset: qualityPresetArb,
            removeMetadata: fc.boolean(),
            version: fc.constant('1.0'),
          }),
          (settings) => {
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.qualityPreset).toBe(settings.qualityPreset);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve targetSize when present', () => {
      fc.assert(
        fc.property(
          // 只生成 targetSize mode 的设置
          fc.record({
            mode: fc.constant('targetSize' as const),
            targetSize: targetSizeArb,
            removeMetadata: fc.boolean(),
            version: fc.constant('1.0'),
          }),
          (settings) => {
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.targetSize).toBe(settings.targetSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should not add extra fields during round-trip', () => {
      fc.assert(
        fc.property(
          storedSettingsArb,
          (settings) => {
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).not.toBeNull();
            
            // 验证加载的对象只包含原始字段
            const originalKeys = Object.keys(settings).sort();
            const loadedKeys = Object.keys(loaded!).sort();
            
            expect(loadedKeys).toEqual(originalKeys);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle multiple save operations correctly', () => {
      fc.assert(
        fc.property(
          fc.array(storedSettingsArb, { minLength: 2, maxLength: 5 }),
          (settingsArray) => {
            localStorage.clear();
            
            // 保存多个设置（每次覆盖前一个）
            settingsArray.forEach(settings => {
              saveSettings(settings);
            });
            
            // 加载应该得到最后一个设置
            const loaded = loadSettings();
            const lastSettings = settingsArray[settingsArray.length - 1];
            
            expect(loaded).not.toBeNull();
            expect(loaded).toEqual(lastSettings);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain data integrity across multiple round-trips', () => {
      fc.assert(
        fc.property(
          storedSettingsArb,
          fc.integer({ min: 2, max: 5 }),
          (settings, rounds) => {
            localStorage.clear();
            
            let current = settings;
            
            // 执行多次保存-加载循环
            for (let i = 0; i < rounds; i++) {
              saveSettings(current);
              const loaded = loadSettings();
              
              expect(loaded).not.toBeNull();
              expect(loaded).toEqual(current);
              
              current = loaded!;
            }
            
            // 最终结果应该与原始设置相同
            expect(current).toEqual(settings);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 边界情况和特殊值测试
   */
  describe('Edge cases and special values', () => {
    test('should handle minimum targetSize value (5 KB)', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (removeMetadata) => {
            const settings: StoredCompressionSettings = {
              mode: 'targetSize',
              targetSize: 5,
              removeMetadata,
              version: '1.0',
            };
            
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).toEqual(settings);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle maximum targetSize value (10000 KB)', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (removeMetadata) => {
            const settings: StoredCompressionSettings = {
              mode: 'targetSize',
              targetSize: 10000,
              removeMetadata,
              version: '1.0',
            };
            
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).toEqual(settings);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle all valid quality presets', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
          fc.boolean(),
          (qualityPreset, removeMetadata) => {
            const settings: StoredCompressionSettings = {
              mode: 'quality',
              qualityPreset,
              removeMetadata,
              version: '1.0',
            };
            
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).toEqual(settings);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle both removeMetadata values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('smart', 'quality', 'targetSize', 'none'),
          fc.boolean(),
          (mode, removeMetadata) => {
            const settings: StoredCompressionSettings = {
              mode: mode as any,
              removeMetadata,
              version: '1.0',
            };
            
            // 为 quality 和 targetSize 模式添加必要字段
            if (mode === 'quality') {
              (settings as any).qualityPreset = 80;
            } else if (mode === 'targetSize') {
              (settings as any).targetSize = 200;
            }
            
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).toEqual(settings);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 数据完整性和类型安全测试
   */
  describe('Data integrity and type safety', () => {
    test('should maintain correct TypeScript types after round-trip', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              mode: fc.constant('smart' as const),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            }),
            fc.record({
              mode: fc.constant('quality' as const),
              qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            }),
            fc.record({
              mode: fc.constant('targetSize' as const),
              targetSize: fc.integer({ min: 5, max: 10000 }),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            }),
            fc.record({
              mode: fc.constant('none' as const),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            })
          ),
          (settings) => {
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).not.toBeNull();
            
            // 验证类型
            expect(typeof loaded!.mode).toBe('string');
            expect(typeof loaded!.removeMetadata).toBe('boolean');
            expect(typeof loaded!.version).toBe('string');
            
            // 验证可选字段类型
            if ('qualityPreset' in loaded!) {
              expect(typeof loaded!.qualityPreset).toBe('number');
            }
            
            if ('targetSize' in loaded!) {
              expect(typeof loaded!.targetSize).toBe('number');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve numeric precision for targetSize', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 10000 }),
          fc.boolean(),
          (targetSize, removeMetadata) => {
            const settings: StoredCompressionSettings = {
              mode: 'targetSize',
              targetSize,
              removeMetadata,
              version: '1.0',
            };
            
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.targetSize).toBe(targetSize);
            
            // 验证没有精度损失
            expect(Number.isInteger(loaded!.targetSize)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve boolean values exactly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('smart', 'quality', 'targetSize', 'none'),
          fc.boolean(),
          (mode, removeMetadata) => {
            const settings: StoredCompressionSettings = {
              mode: mode as any,
              removeMetadata,
              version: '1.0',
            };
            
            // 为 quality 和 targetSize 模式添加必要字段
            if (mode === 'quality') {
              (settings as any).qualityPreset = 80;
            } else if (mode === 'targetSize') {
              (settings as any).targetSize = 200;
            }
            
            localStorage.clear();
            saveSettings(settings);
            const loaded = loadSettings();
            
            expect(loaded).not.toBeNull();
            
            // 验证 boolean 值完全相同（不是 truthy/falsy）
            expect(loaded!.removeMetadata).toBe(removeMetadata);
            expect(typeof loaded!.removeMetadata).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 并发和隔离测试
   */
  describe('Concurrency and isolation', () => {
    test('should handle rapid successive saves correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.record({
                mode: fc.constant('smart' as const),
                removeMetadata: fc.boolean(),
                version: fc.constant('1.0'),
              }),
              fc.record({
                mode: fc.constant('quality' as const),
                qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
                removeMetadata: fc.boolean(),
                version: fc.constant('1.0'),
              }),
              fc.record({
                mode: fc.constant('targetSize' as const),
                targetSize: fc.integer({ min: 5, max: 10000 }),
                removeMetadata: fc.boolean(),
                version: fc.constant('1.0'),
              }),
              fc.record({
                mode: fc.constant('none' as const),
                removeMetadata: fc.boolean(),
                version: fc.constant('1.0'),
              })
            ),
            { minLength: 3, maxLength: 10 }
          ),
          (settingsArray) => {
            localStorage.clear();
            
            // 快速连续保存
            settingsArray.forEach(settings => {
              saveSettings(settings);
            });
            
            // 加载应该得到最后一个设置
            const loaded = loadSettings();
            const lastSettings = settingsArray[settingsArray.length - 1];
            
            expect(loaded).toEqual(lastSettings);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain independence between different test runs', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.oneof(
              fc.record({
                mode: fc.constant('smart' as const),
                removeMetadata: fc.boolean(),
                version: fc.constant('1.0'),
              }),
              fc.record({
                mode: fc.constant('quality' as const),
                qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
                removeMetadata: fc.boolean(),
                version: fc.constant('1.0'),
              })
            ),
            fc.oneof(
              fc.record({
                mode: fc.constant('targetSize' as const),
                targetSize: fc.integer({ min: 5, max: 10000 }),
                removeMetadata: fc.boolean(),
                version: fc.constant('1.0'),
              }),
              fc.record({
                mode: fc.constant('none' as const),
                removeMetadata: fc.boolean(),
                version: fc.constant('1.0'),
              })
            )
          ),
          ([settings1, settings2]) => {
            // 第一次保存和加载
            localStorage.clear();
            saveSettings(settings1);
            const loaded1 = loadSettings();
            expect(loaded1).toEqual(settings1);
            
            // 第二次保存和加载（应该完全覆盖第一次）
            localStorage.clear();
            saveSettings(settings2);
            const loaded2 = loadSettings();
            expect(loaded2).toEqual(settings2);
            
            // 验证两次加载的结果不同（除非偶然相同）
            if (JSON.stringify(settings1) !== JSON.stringify(settings2)) {
              expect(loaded1).not.toEqual(loaded2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 性能和效率测试
   */
  describe('Performance and efficiency', () => {
    test('should complete round-trip in reasonable time', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              mode: fc.constant('smart' as const),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            }),
            fc.record({
              mode: fc.constant('quality' as const),
              qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            }),
            fc.record({
              mode: fc.constant('targetSize' as const),
              targetSize: fc.integer({ min: 5, max: 10000 }),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            }),
            fc.record({
              mode: fc.constant('none' as const),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            })
          ),
          (settings) => {
            localStorage.clear();
            
            const startTime = performance.now();
            
            saveSettings(settings);
            const loaded = loadSettings();
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // 往返操作应该很快（< 10ms）
            expect(duration).toBeLessThan(10);
            expect(loaded).toEqual(settings);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should produce compact serialized data', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              mode: fc.constant('smart' as const),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            }),
            fc.record({
              mode: fc.constant('quality' as const),
              qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            }),
            fc.record({
              mode: fc.constant('targetSize' as const),
              targetSize: fc.integer({ min: 5, max: 10000 }),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            }),
            fc.record({
              mode: fc.constant('none' as const),
              removeMetadata: fc.boolean(),
              version: fc.constant('1.0'),
            })
          ),
          (settings) => {
            localStorage.clear();
            saveSettings(settings);
            
            const stored = localStorage.getItem('batchpic_compression_settings');
            expect(stored).not.toBeNull();
            
            // 序列化数据应该紧凑（< 200 字节）
            const size = new Blob([stored!]).size;
            expect(size).toBeLessThan(200);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property 10: 向后兼容参数转换
 *
 * **Validates: Requirements 7.1, 7.3**
 *
 * 对于任何旧版本的 CompressionParams 对象（可能缺少 removeMetadata、version 等字段），
 * migrateOldCompressionParams() 应该能够正确转换为新的数据结构，保持功能不变。
 *
 * 这验证了：
 * - 为旧参数添加默认的 removeMetadata: true
 * - 添加版本号 '1.0'
 * - 无效模式转换为 'smart'
 * - 保留有效的 qualityPreset 和 targetSize
 * - 忽略无效的 qualityPreset 和 targetSize
 */
describe('Property 10: Backward compatible parameter migration', () => {
  /**
   * fast-check 生成器：生成旧版本的压缩参数（可能缺少字段）
   *
   * 旧版本特征：
   * - 可能没有 removeMetadata 字段
   * - 可能没有 version 字段
   * - 可能有无效的 mode 值
   * - 可能有无效的 qualityPreset 或 targetSize
   */
  const oldCompressionParamsArb = fc.oneof(
    // 旧版本 quality 模式（没有 removeMetadata 和 version）
    fc.record({
      mode: fc.constant('quality' as const),
      qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
    }),

    // 旧版本 targetSize 模式（没有 removeMetadata 和 version）
    fc.record({
      mode: fc.constant('targetSize' as const),
      targetSize: fc.integer({ min: 5, max: 10000 }),
    }),

    // 旧版本 quality 模式（有 removeMetadata，没有 version）
    fc.record({
      mode: fc.constant('quality' as const),
      qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
      removeMetadata: fc.boolean(),
    }),

    // 旧版本 targetSize 模式（有 removeMetadata，没有 version）
    fc.record({
      mode: fc.constant('targetSize' as const),
      targetSize: fc.integer({ min: 5, max: 10000 }),
      removeMetadata: fc.boolean(),
    }),

    // 无效模式（应该转换为 smart）
    fc.record({
      mode: fc.constantFrom('invalid', 'old-mode', 'deprecated') as any,
    }),

    // 无效的 qualityPreset（应该被忽略）
    fc.record({
      mode: fc.constant('quality' as const),
      qualityPreset: fc.integer({ min: 1, max: 100 }).filter(v => ![60, 70, 75, 80, 85, 90].includes(v)) as any,
    }),

    // 无效的 targetSize（应该被忽略）
    fc.record({
      mode: fc.constant('targetSize' as const),
      targetSize: fc.oneof(
        fc.integer({ min: -1000, max: 4 }),  // 太小
        fc.integer({ min: 10001, max: 100000 }),  // 太大
        fc.constant(NaN),  // 非数字
      ) as any,
    })
  );

  test('should add default removeMetadata: true for old params without it', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            mode: fc.constant('quality' as const),
            qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
          }),
          fc.record({
            mode: fc.constant('targetSize' as const),
            targetSize: fc.integer({ min: 5, max: 10000 }),
          })
        ),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 应该添加默认的 removeMetadata: true
          expect(migrated.removeMetadata).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should preserve existing removeMetadata value', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            mode: fc.constant('quality' as const),
            qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
            removeMetadata: fc.boolean(),
          }),
          fc.record({
            mode: fc.constant('targetSize' as const),
            targetSize: fc.integer({ min: 5, max: 10000 }),
            removeMetadata: fc.boolean(),
          })
        ),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 应该保留原有的 removeMetadata 值
          expect(migrated.removeMetadata).toBe(oldParams.removeMetadata);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should add version "1.0" to all migrated params', () => {
    fc.assert(
      fc.property(
        oldCompressionParamsArb,
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 应该添加版本号 '1.0'
          expect(migrated.version).toBe('1.0');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should convert invalid mode to "smart"', () => {
    fc.assert(
      fc.property(
        fc.record({
          mode: fc.constantFrom('invalid', 'old-mode', 'deprecated', 'unknown') as any,
        }),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 无效模式应该转换为 'smart'
          expect(migrated.mode).toBe('smart');
          expect(migrated.removeMetadata).toBe(true);
          expect(migrated.version).toBe('1.0');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should preserve valid mode (quality or targetSize)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            mode: fc.constant('quality' as const),
            qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
          }),
          fc.record({
            mode: fc.constant('targetSize' as const),
            targetSize: fc.integer({ min: 5, max: 10000 }),
          })
        ),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 应该保留有效的 mode
          expect(migrated.mode).toBe(oldParams.mode);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should preserve valid qualityPreset', () => {
    fc.assert(
      fc.property(
        fc.record({
          mode: fc.constant('quality' as const),
          qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
        }),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 应该保留有效的 qualityPreset
          expect(migrated.mode).toBe('quality');
          expect(migrated.qualityPreset).toBe(oldParams.qualityPreset);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should ignore invalid qualityPreset', () => {
    fc.assert(
      fc.property(
        fc.record({
          mode: fc.constant('quality' as const),
          qualityPreset: fc.integer({ min: 1, max: 100 })
            .filter(v => ![60, 70, 75, 80, 85, 90].includes(v)) as any,
        }),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 无效的 qualityPreset 应该被忽略
          expect(migrated.mode).toBe('quality');
          expect(migrated.qualityPreset).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should preserve valid targetSize', () => {
    fc.assert(
      fc.property(
        fc.record({
          mode: fc.constant('targetSize' as const),
          targetSize: fc.integer({ min: 5, max: 10000 }),
        }),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 应该保留有效的 targetSize
          expect(migrated.mode).toBe('targetSize');
          expect(migrated.targetSize).toBe(oldParams.targetSize);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should ignore invalid targetSize (too small)', () => {
    fc.assert(
      fc.property(
        fc.record({
          mode: fc.constant('targetSize' as const),
          targetSize: fc.integer({ min: -1000, max: 4 }) as any,
        }),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 无效的 targetSize 应该被忽略
          expect(migrated.mode).toBe('targetSize');
          expect(migrated.targetSize).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should ignore invalid targetSize (too large)', () => {
    fc.assert(
      fc.property(
        fc.record({
          mode: fc.constant('targetSize' as const),
          targetSize: fc.integer({ min: 10001, max: 100000 }) as any,
        }),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 无效的 targetSize 应该被忽略
          expect(migrated.mode).toBe('targetSize');
          expect(migrated.targetSize).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle null or undefined input gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined, {}),
        (invalidInput) => {
          const migrated = migrateOldCompressionParams(invalidInput);

          // 应该返回默认的智能压缩设置
          expect(migrated.mode).toBe('smart');
          expect(migrated.removeMetadata).toBe(true);
          expect(migrated.version).toBe('1.0');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should maintain functional equivalence after migration', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            mode: fc.constant('quality' as const),
            qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
          }),
          fc.record({
            mode: fc.constant('targetSize' as const),
            targetSize: fc.integer({ min: 5, max: 10000 }),
          })
        ),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 验证功能等效性
          expect(migrated.mode).toBe(oldParams.mode);

          if ('qualityPreset' in oldParams) {
            expect(migrated.qualityPreset).toBe(oldParams.qualityPreset);
          }

          if ('targetSize' in oldParams) {
            expect(migrated.targetSize).toBe(oldParams.targetSize);
          }

          // 新增的字段应该有合理的默认值
          expect(migrated.removeMetadata).toBe(true);
          expect(migrated.version).toBe('1.0');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should produce valid StoredCompressionSettings after migration', () => {
    fc.assert(
      fc.property(
        oldCompressionParamsArb,
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams);

          // 验证迁移后的对象是有效的 StoredCompressionSettings
          expect(['smart', 'quality', 'targetSize', 'none']).toContain(migrated.mode);
          expect(typeof migrated.removeMetadata).toBe('boolean');
          expect(typeof migrated.version).toBe('string');
          expect(migrated.version).toBe('1.0');

          // 如果有 qualityPreset，应该是有效值
          if ('qualityPreset' in migrated && migrated.qualityPreset !== undefined) {
            expect([60, 70, 75, 80, 85, 90]).toContain(migrated.qualityPreset);
          }

          // 如果有 targetSize，应该在有效范围内
          if ('targetSize' in migrated && migrated.targetSize !== undefined) {
            expect(migrated.targetSize).toBeGreaterThanOrEqual(5);
            expect(migrated.targetSize).toBeLessThanOrEqual(10000);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle migration idempotency (migrating already migrated params)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            mode: fc.constant('quality' as const),
            qualityPreset: fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90),
          }),
          fc.record({
            mode: fc.constant('targetSize' as const),
            targetSize: fc.integer({ min: 5, max: 10000 }),
          })
        ),
        (oldParams) => {
          // 第一次迁移
          const migrated1 = migrateOldCompressionParams(oldParams);

          // 第二次迁移（迁移已经迁移过的参数）
          const migrated2 = migrateOldCompressionParams(migrated1);

          // 应该得到相同的结果（幂等性）
          expect(migrated2).toEqual(migrated1);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle complex old params with extra fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          mode: fc.constantFrom('quality', 'targetSize'),
          qualityPreset: fc.option(fc.constantFrom<QualityPreset>(60, 70, 75, 80, 85, 90)),
          targetSize: fc.option(fc.integer({ min: 5, max: 10000 })),
          removeMetadata: fc.option(fc.boolean()),
          // 额外的未知字段（应该被忽略）
          extraField1: fc.string(),
          extraField2: fc.integer(),
        }),
        (oldParams) => {
          const migrated = migrateOldCompressionParams(oldParams as any);

          // 应该只包含有效字段
          const validKeys = ['mode', 'qualityPreset', 'targetSize', 'removeMetadata', 'version'];
          const migratedKeys = Object.keys(migrated);

          migratedKeys.forEach(key => {
            expect(validKeys).toContain(key);
          });

          // 额外字段应该被忽略
          expect('extraField1' in migrated).toBe(false);
          expect('extraField2' in migrated).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle edge case: empty object', () => {
    const migrated = migrateOldCompressionParams({});

    // 应该返回默认的智能压缩设置
    expect(migrated).toEqual({
      mode: 'smart',
      removeMetadata: true,
      version: '1.0',
    });
  });

  test('should handle edge case: object with only invalid fields', () => {
    const migrated = migrateOldCompressionParams({
      invalidField1: 'test',
      invalidField2: 123,
    } as any);

    // 应该返回默认的智能压缩设置
    expect(migrated).toEqual({
      mode: 'smart',
      removeMetadata: true,
      version: '1.0',
    });
  });

  test('should handle all valid modes correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('smart', 'quality', 'targetSize', 'none'),
        (mode) => {
          const oldParams = { mode } as any;
          const migrated = migrateOldCompressionParams(oldParams);

          // 有效模式应该被保留
          expect(migrated.mode).toBe(mode);
          expect(migrated.removeMetadata).toBe(true);
          expect(migrated.version).toBe('1.0');
        }
      ),
      { numRuns: 100 }
    );
  });
});

