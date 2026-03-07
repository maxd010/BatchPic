# Design Document: 压缩设置优化

## Overview

本设计文档描述了 BatchPic 图片批处理应用中压缩设置界面优化功能的技术实现方案。该功能通过引入智能压缩模式、优化用户界面和提供更直观的参数选择，提升用户体验和易用性。

### 核心目标

1. **简化用户决策**：通过智能压缩模式，让用户无需理解复杂的压缩参数即可获得良好的压缩效果
2. **提升交互体验**：将滑块改为预设按钮组，提供更快速、更明确的选择方式
3. **增强灵活性**：独立的元数据控制选项，满足不同场景的需求
4. **保持性能**：确保新功能不影响现有的图片处理性能

### 技术栈

- **前端框架**：React 18 + TypeScript
- **桌面框架**：Electron 28
- **图片处理**：Sharp 0.33
- **构建工具**：Vite 5
- **状态管理**：React Hooks (useState, useEffect)
- **持久化**：localStorage

### 设计原则

1. **向后兼容**：新功能不破坏现有的数据结构和处理逻辑
2. **渐进增强**：智能压缩作为默认选项，高级用户仍可使用手动模式
3. **性能优先**：界面响应流畅，参数变化使用防抖优化
4. **用户友好**：清晰的视觉反馈，直观的交互设计

---

## Architecture

### 系统架构

BatchPic 采用 Electron 的多进程架构，本功能涉及以下三个进程：

```
┌─────────────────────────────────────────────────────────────┐
│                      Renderer Process                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           ParameterPanel Component                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │ 尺寸标签页   │  │ 优化标签页   │  │ 格式标签页  │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │ │
│  │                                                        │ │
│  │  State Management (React Hooks)                       │ │
│  │  - compressionMode: 'smart' | 'quality' | ...         │ │
│  │  - qualityPreset: 60 | 70 | 75 | 80 | 85 | 90        │ │
│  │  - removeMetadata: boolean                            │ │
│  │                                                        │ │
│  │  localStorage Persistence                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ IPC (contextBridge)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Preload Script                         │
│  - Parameter validation                                      │
│  - Type conversion                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Main Process                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           ImageProcessor (Sharp)                       │ │
│  │                                                        │ │
│  │  Smart Compression Algorithm                          │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Format Detection → Quality Selection             │ │ │
│  │  │ JPG/JPEG  → quality: 80, removeMetadata: true    │ │ │
│  │  │ PNG       → quality: 85, removeMetadata: true    │ │ │
│  │  │ WebP      → quality: 80, removeMetadata: true    │ │ │
│  │  │ Unknown   → quality: 80, removeMetadata: true    │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  Quality-based Compression                            │ │
│  │  Target Size Compression (existing)                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 模块职责

#### 1. ParameterPanel Component (Renderer)
- **职责**：用户界面展示和交互处理
- **输入**：当前参数状态、输入文件列表
- **输出**：参数变化事件
- **关键功能**：
  - 标签页切换（尺寸/优化/格式）
  - 压缩模式选择（智能/按质量/按大小/不压缩）
  - 质量预设按钮组（60/70/75/80/85/90）
  - 元数据控制复选框
  - 参数持久化到 localStorage

#### 2. ImageProcessor (Main Process)
- **职责**：图片处理逻辑执行
- **输入**：图片文件、处理参数
- **输出**：处理后的图片文件
- **关键功能**：
  - 智能压缩算法（格式检测 + 质量选择）
  - 质量压缩（使用 Sharp 的质量参数）
  - 目标大小压缩（二分查找最优质量）
  - 元数据移除（Sharp 的 withMetadata 选项）

#### 3. Preload Script
- **职责**：进程间通信桥梁和参数验证
- **输入**：Renderer 的参数对象
- **输出**：验证后的参数对象
- **关键功能**：
  - 参数类型验证
  - 智能压缩模式转换为等效的质量模式参数

### 数据流

```
User Interaction
    ↓
ParameterPanel State Update
    ↓
useDebounce (300ms)
    ↓
onChange callback
    ↓
localStorage.setItem (500ms delay)
    ↓
Parent Component
    ↓
IPC to Main Process
    ↓
ImageProcessor.process()
    ↓
Sharp Pipeline
    ↓
Output File
```

---

## Components and Interfaces

### 1. 类型定义扩展 (types.ts)

#### CompressionParams 扩展

```typescript
export interface CompressionParams {
  mode: 'smart' | 'quality' | 'targetSize' | 'none';
  value?: number;  // 质量预设 (60/70/75/80/85/90) 或目标大小 (KB)
  removeMetadata?: boolean;  // 是否移除元数据，默认 true
}
```

**设计说明**：
- 新增 `'smart'` 模式：智能压缩模式
- 新增 `'none'` 模式：不压缩模式
- `value` 改为可选：智能模式下不需要用户指定
- 新增 `removeMetadata` 字段：独立控制元数据移除

#### SmartCompressionConfig 类型

```typescript
export interface SmartCompressionConfig {
  format: 'jpg' | 'png' | 'webp' | 'unknown';
  quality: number;
  removeMetadata: boolean;
}
```

**用途**：智能压缩算法的配置对象

### 2. ParameterPanel 组件接口

#### Props 接口

```typescript
interface ParameterPanelProps {
  params: ProcessingParams;
  onChange: (params: ProcessingParams) => void;
  inputFiles: ImageFile[];
  estimatedSize?: number;
}
```

**保持不变**：现有接口完全兼容

#### 内部状态

```typescript
// 压缩模式状态
const [compressionMode, setCompressionMode] = useState<
  'smart' | 'quality' | 'targetSize' | 'none'
>('smart');

// 质量预设状态
const [qualityPreset, setQualityPreset] = useState<
  60 | 70 | 75 | 80 | 85 | 90
>(80);

// 目标大小状态（按大小模式）
const [targetSize, setTargetSize] = useState<number>(200);

// 元数据控制状态
const [removeMetadata, setRemoveMetadata] = useState<boolean>(true);
```

### 3. ImageProcessor 接口扩展

#### 智能压缩方法

```typescript
class SharpImageProcessor implements ImageProcessor {
  /**
   * 根据图片格式选择最优压缩参数
   */
  private getSmartCompressionConfig(
    format: 'jpg' | 'png' | 'webp'
  ): SmartCompressionConfig {
    // 实现见 Data Models 部分
  }

  /**
   * 应用压缩和格式转换（支持智能模式）
   */
  private applyCompressionAndFormat(
    pipeline: sharp.Sharp,
    format: 'jpg' | 'png' | 'webp',
    compression?: CompressionParams
  ): sharp.Sharp {
    // 实现见 Data Models 部分
  }
}
```

### 4. localStorage 持久化接口

#### 存储键

```typescript
const STORAGE_KEY = 'batchpic_compression_settings';
```

#### 存储数据结构

```typescript
interface StoredCompressionSettings {
  mode: 'smart' | 'quality' | 'targetSize' | 'none';
  qualityPreset?: 60 | 70 | 75 | 80 | 85 | 90;
  targetSize?: number;
  removeMetadata: boolean;
  version: string;  // 用于未来的数据迁移
}
```

#### 持久化函数

```typescript
// 保存设置
function saveSettings(settings: StoredCompressionSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// 加载设置
function loadSettings(): StoredCompressionSettings | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
```

---

## Data Models

### 1. 压缩模式数据模型

#### 模式枚举

```typescript
type CompressionMode = 'smart' | 'quality' | 'targetSize' | 'none';
```

#### 模式配置

```typescript
const COMPRESSION_MODES = {
  smart: {
    label: '智能压缩',
    description: '根据图片格式自动选择最优参数',
    default: true,
    showQualityControl: false,
    showTargetSizeControl: false,
    showMetadataControl: false,  // 智能模式下强制移除元数据
  },
  quality: {
    label: '按质量',
    description: '手动选择压缩质量',
    default: false,
    showQualityControl: true,
    showTargetSizeControl: false,
    showMetadataControl: true,
  },
  targetSize: {
    label: '按大小',
    description: '压缩至目标文件大小',
    default: false,
    showQualityControl: false,
    showTargetSizeControl: true,
    showMetadataControl: true,
  },
  none: {
    label: '不压缩',
    description: '保持原始质量',
    default: false,
    showQualityControl: false,
    showTargetSizeControl: false,
    showMetadataControl: true,
  },
} as const;
```

### 2. 质量预设数据模型

#### 预设值定义

```typescript
const QUALITY_PRESETS = [60, 70, 75, 80, 85, 90] as const;
type QualityPreset = typeof QUALITY_PRESETS[number];

const DEFAULT_QUALITY_PRESET: QualityPreset = 80;
```

#### 预设配置

```typescript
const QUALITY_PRESET_CONFIG = {
  60: { label: '60', description: '高压缩，文件最小' },
  70: { label: '70', description: '较高压缩' },
  75: { label: '75', description: '平衡压缩' },
  80: { label: '80', description: '推荐质量' },
  85: { label: '85', description: '高质量' },
  90: { label: '90', description: '极高质量' },
} as const;
```

### 3. 智能压缩算法数据模型

#### 格式-质量映射表

```typescript
const SMART_COMPRESSION_MAP: Record<
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
    format: 'jpg',  // 默认转为 JPG
    quality: 80,
    removeMetadata: true,
  },
};
```

#### 智能压缩算法实现

```typescript
class SharpImageProcessor implements ImageProcessor {
  /**
   * 获取智能压缩配置
   */
  private getSmartCompressionConfig(
    format: 'jpg' | 'png' | 'webp'
  ): SmartCompressionConfig {
    return SMART_COMPRESSION_MAP[format] || SMART_COMPRESSION_MAP.unknown;
  }

  /**
   * 应用压缩和格式转换（支持智能模式）
   */
  private applyCompressionAndFormat(
    pipeline: sharp.Sharp,
    format: 'jpg' | 'png' | 'webp',
    compression?: CompressionParams
  ): sharp.Sharp {
    // 处理智能压缩模式
    if (compression?.mode === 'smart') {
      const config = this.getSmartCompressionConfig(format);
      console.log(`[Smart Compression] Format: ${format}, Quality: ${config.quality}`);
      
      // 应用智能选择的质量参数
      return this.applyFormatWithQuality(pipeline, format, config.quality);
    }

    // 处理不压缩模式
    if (compression?.mode === 'none') {
      // 使用最高质量（100）
      return this.applyFormatWithQuality(pipeline, format, 100);
    }

    // 处理质量模式
    if (compression?.mode === 'quality' && compression.value !== undefined) {
      return this.applyFormatWithQuality(pipeline, format, compression.value);
    }

    // 默认质量
    return this.applyFormatWithQuality(pipeline, format, 80);
  }

  /**
   * 应用格式转换和质量设置（支持元数据控制）
   */
  private applyFormatWithQuality(
    pipeline: sharp.Sharp,
    format: 'jpg' | 'png' | 'webp',
    quality: number,
    removeMetadata: boolean = true
  ): sharp.Sharp {
    // 元数据控制
    if (!removeMetadata) {
      pipeline = pipeline.withMetadata();
    }

    // 格式转换
    switch (format) {
      case 'jpg':
        return pipeline.jpeg({ 
          quality,
          mozjpeg: true,
          chromaSubsampling: '4:2:0'
        });
      case 'png':
        return pipeline.png({ 
          quality,
          compressionLevel: 6,
          adaptiveFiltering: false
        });
      case 'webp':
        return pipeline.webp({ 
          quality,
          effort: 4
        });
      default:
        return pipeline;
    }
  }
}
```

### 4. 参数转换数据模型

#### UI 状态到 ProcessingParams 转换

```typescript
function buildProcessingParams(
  compressionMode: CompressionMode,
  qualityPreset: QualityPreset,
  targetSize: number,
  removeMetadata: boolean,
  outputFormat: 'jpg' | 'png' | 'webp' | 'original'
): ProcessingParams {
  // 构建压缩参数
  let compression: CompressionParams | undefined;

  if (compressionMode === 'smart') {
    compression = {
      mode: 'smart',
      removeMetadata: true,  // 智能模式强制移除元数据
    };
  } else if (compressionMode === 'quality') {
    compression = {
      mode: 'quality',
      value: qualityPreset,
      removeMetadata,
    };
  } else if (compressionMode === 'targetSize') {
    compression = {
      mode: 'targetSize',
      value: targetSize,
      removeMetadata,
    };
  } else if (compressionMode === 'none') {
    compression = {
      mode: 'none',
      removeMetadata,
    };
  }

  return {
    compression,
    format: outputFormat === 'original' ? undefined : outputFormat,
  };
}
```

### 5. 向后兼容数据模型

#### 旧参数迁移

```typescript
function migrateOldCompressionParams(
  oldParams: CompressionParams
): CompressionParams {
  // 旧版本只有 'quality' 和 'targetSize' 模式
  if (oldParams.mode === 'quality' || oldParams.mode === 'targetSize') {
    return {
      ...oldParams,
      removeMetadata: oldParams.removeMetadata ?? true,  // 默认移除元数据
    };
  }

  // 无法识别的模式，使用智能压缩
  return {
    mode: 'smart',
    removeMetadata: true,
  };
}
```

---

## Correctness Properties

*属性（Property）是系统在所有有效执行中都应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: 智能压缩格式映射正确性

*对于任何* 有效的图片格式（JPG/JPEG/PNG/WebP），当使用智能压缩模式时，系统应该根据格式映射表应用正确的质量参数：JPG/JPEG → 80，PNG → 85，WebP → 80

**Validates: Requirements 2.4, 2.5, 2.6, 9.1, 9.2, 9.3**

### Property 2: 模式切换控件可见性

*对于任何* 压缩模式切换操作，切换后应该只显示该模式对应的参数控件，隐藏其他模式的控件

**Validates: Requirements 2.2, 3.1, 4.1, 6.4**

### Property 3: 质量预设选择反馈

*对于任何* 质量预设值（60/70/75/80/85/90），当用户点击该预设时，该按钮应该被高亮显示，其他预设按钮应该取消高亮

**Validates: Requirements 3.4**

### Property 4: 目标大小输入验证

*对于任何* 用户输入的目标大小值，系统应该验证其在有效范围内（5-10000 KB），超出范围的值应该被限制到边界值

**Validates: Requirements 4.3**

### Property 5: 目标大小压缩尝试

*对于任何* 有效的目标大小值和图片文件，系统应该尝试通过调整质量参数将图片压缩到目标大小附近（±15% 容差）

**Validates: Requirements 4.4**

### Property 6: 元数据控制可见性

*对于任何* 非智能压缩模式（按质量/按大小/不压缩），"移除元数据"复选框应该可见且可交互；在智能压缩模式下，该复选框应该被禁用并保持勾选状态

**Validates: Requirements 5.1, 5.5**

### Property 7: 元数据处理正确性

*对于任何* 图片文件，当"移除元数据"选项被勾选时，处理后的图片应该不包含 EXIF/IPTC/XMP 元数据；当选项未勾选时，元数据应该被保留

**Validates: Requirements 2.7, 5.3, 5.4**

### Property 8: 智能压缩自动移除元数据

*对于任何* 图片文件，当使用智能压缩模式时，系统应该自动移除所有元数据，无论用户的元数据控制设置如何

**Validates: Requirements 2.7**

### Property 9: 格式检测正确性

*对于任何* 有效的图片文件，智能压缩模式应该能够正确检测其格式（JPG/PNG/WebP），并应用相应的压缩配置

**Validates: Requirements 2.3**

### Property 10: 向后兼容参数转换

*对于任何* 旧版本的 CompressionParams 对象（只包含 'quality' 或 'targetSize' 模式），系统应该能够正确加载并转换为新的数据结构，保持功能不变

**Validates: Requirements 7.1, 7.3**

### Property 11: 智能模式参数转换

*对于任何* 使用智能压缩模式的处理请求，系统应该将其转换为等效的质量模式参数（根据格式选择质量值），以便底层处理逻辑能够正确执行

**Validates: Requirements 7.2**

### Property 12: 参数持久化往返

*对于任何* 有效的压缩设置（模式、质量预设、目标大小、元数据选项），保存到 localStorage 后再加载，应该得到相同的设置值

**Validates: Requirements 10.1, 10.2**

---

## Error Handling

### 1. 用户输入错误处理

#### 目标大小输入验证

```typescript
function validateTargetSize(value: number): number {
  const MIN_SIZE = 5;
  const MAX_SIZE = 10000;
  
  if (isNaN(value) || value < MIN_SIZE) {
    return MIN_SIZE;
  }
  
  if (value > MAX_SIZE) {
    return MAX_SIZE;
  }
  
  return Math.floor(value);  // 确保整数
}
```

**错误场景**：
- 用户输入非数字字符 → 使用最小值 5
- 用户输入负数或 0 → 使用最小值 5
- 用户输入超过 10000 → 使用最大值 10000
- 用户输入小数 → 向下取整

#### 质量预设验证

```typescript
function validateQualityPreset(value: number): QualityPreset {
  const VALID_PRESETS = [60, 70, 75, 80, 85, 90];
  
  if (VALID_PRESETS.includes(value)) {
    return value as QualityPreset;
  }
  
  // 找到最接近的预设值
  const closest = VALID_PRESETS.reduce((prev, curr) => 
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
  
  return closest as QualityPreset;
}
```

**错误场景**：
- 用户通过某种方式设置了非预设值 → 使用最接近的预设值

### 2. 图片处理错误处理

#### 格式检测失败

```typescript
private getSmartCompressionConfig(
  format: 'jpg' | 'png' | 'webp'
): SmartCompressionConfig {
  const config = SMART_COMPRESSION_MAP[format];
  
  if (!config) {
    console.warn(`[Smart Compression] Unknown format: ${format}, using default`);
    return SMART_COMPRESSION_MAP.unknown;
  }
  
  return config;
}
```

**错误场景**：
- 无法识别的图片格式 → 使用默认配置（JPG, quality: 80）
- 记录警告日志以便调试

#### 目标大小压缩失败

```typescript
private async compressToTargetSize(
  pipeline: sharp.Sharp,
  outputPath: string,
  format: 'jpg' | 'png' | 'webp',
  targetSizeKB: number
): Promise<void> {
  try {
    // 尝试压缩到目标大小
    // ... 二分查找逻辑 ...
    
  } catch (error) {
    console.error(`[Compression] Failed to compress to target size: ${error}`);
    
    // 降级策略：使用最大压缩（质量 1）
    const fallbackPipeline = sharp(inputBuffer);
    const fallbackOutput = this.applyFormatWithQuality(
      fallbackPipeline, 
      format, 
      1  // 最低质量
    );
    
    await fallbackOutput.toFile(outputPath);
    
    console.warn(`[Compression] Applied maximum compression as fallback`);
  }
}
```

**错误场景**：
- 目标大小过小，无法达到 → 应用最大压缩（质量 1）并记录警告
- 压缩过程中发生错误 → 使用降级策略，确保至少有输出文件

### 3. 持久化错误处理

#### localStorage 写入失败

```typescript
function saveSettings(settings: StoredCompressionSettings): void {
  try {
    const serialized = JSON.stringify(settings);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('[Settings] Failed to save to localStorage:', error);
    
    // 可能的原因：
    // 1. localStorage 已满
    // 2. 隐私模式禁用了 localStorage
    // 3. 序列化失败
    
    // 降级策略：仅在内存中保持设置，不影响当前使用
  }
}
```

**错误场景**：
- localStorage 配额已满 → 静默失败，不影响当前功能
- 浏览器隐私模式 → 静默失败，每次启动使用默认设置
- 序列化失败 → 记录错误，不影响当前功能

#### localStorage 读取失败

```typescript
function loadSettings(): StoredCompressionSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (!stored) {
      return null;  // 首次使用，没有保存的设置
    }
    
    const parsed = JSON.parse(stored);
    
    // 验证数据结构
    if (!isValidStoredSettings(parsed)) {
      console.warn('[Settings] Invalid stored settings, using defaults');
      return null;
    }
    
    return parsed;
    
  } catch (error) {
    console.error('[Settings] Failed to load from localStorage:', error);
    return null;  // 使用默认设置
  }
}

function isValidStoredSettings(data: any): data is StoredCompressionSettings {
  return (
    data &&
    typeof data === 'object' &&
    ['smart', 'quality', 'targetSize', 'none'].includes(data.mode) &&
    typeof data.removeMetadata === 'boolean'
  );
}
```

**错误场景**：
- localStorage 中的数据损坏 → 使用默认设置
- 数据结构不匹配（版本升级） → 使用默认设置
- JSON 解析失败 → 使用默认设置

### 4. 边界情况处理

#### 空文件列表

```typescript
// 在 ParameterPanel 中
if (inputFiles.length === 0) {
  // 禁用所有参数控件
  // 显示提示信息："请先选择图片文件"
}
```

#### 极端质量值

```typescript
// 确保质量值在有效范围内
function clampQuality(quality: number): number {
  return Math.max(1, Math.min(100, quality));
}
```

#### 元数据不存在

```typescript
// Sharp 会自动处理没有元数据的图片
// 调用 withMetadata() 时，如果原图没有元数据，不会报错
```

---

## Testing Strategy

### 测试方法论

本功能采用**双重测试策略**：单元测试（Unit Tests）+ 属性测试（Property-Based Tests）

- **单元测试**：验证特定示例、边界情况和错误条件
- **属性测试**：验证跨所有输入的通用属性
- **互补性**：单元测试捕获具体 bug，属性测试验证通用正确性

### 1. 单元测试策略

#### 测试框架

- **框架**：Jest 29
- **React 测试**：@testing-library/react
- **用户交互**：@testing-library/user-event

#### 测试组织

```
src/__tests__/
├── components/
│   └── ParameterPanel.test.tsx          # UI 组件测试
├── main/
│   ├── ImageProcessor.smart.test.ts     # 智能压缩算法测试
│   ├── ImageProcessor.metadata.test.ts  # 元数据处理测试
│   └── types.test.ts                    # 类型转换测试
└── utils/
    └── storage.test.ts                  # 持久化测试
```

#### 单元测试重点

**UI 组件测试（ParameterPanel.test.tsx）**：
- 默认状态渲染（智能压缩模式、默认预设值）
- 标签页标题显示"优化"而非"压缩"
- 模式切换后显示/隐藏相应控件
- 质量预设按钮点击和高亮
- 元数据复选框在不同模式下的状态
- 目标大小输入验证（边界值：5, 10000）
- 防抖机制（300ms）

**智能压缩算法测试（ImageProcessor.smart.test.ts）**：
- JPG 格式 → 质量 80
- PNG 格式 → 质量 85
- WebP 格式 → 质量 80
- 未知格式 → 默认质量 80
- 日志记录验证

**元数据处理测试（ImageProcessor.metadata.test.ts）**：
- 智能模式强制移除元数据
- 手动模式勾选时移除元数据
- 手动模式未勾选时保留元数据
- 验证 EXIF/IPTC/XMP 数据的存在性

**持久化测试（storage.test.ts）**：
- 保存设置到 localStorage
- 从 localStorage 加载设置
- 首次使用时使用默认设置
- 数据损坏时使用默认设置
- localStorage 不可用时的降级处理

### 2. 属性测试策略

#### 测试框架

- **框架**：fast-check 3.15
- **配置**：每个属性测试运行 **最少 100 次迭代**

#### 属性测试标签格式

```typescript
/**
 * Feature: optimize-compression-settings, Property 1: 智能压缩格式映射正确性
 */
test('smart compression applies correct quality for all formats', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('jpg', 'jpeg', 'png', 'webp'),
      (format) => {
        // 测试逻辑
      }
    ),
    { numRuns: 100 }
  );
});
```

#### 属性测试重点

**Property 1: 智能压缩格式映射正确性**
```typescript
// 生成器：所有支持的格式
fc.constantFrom('jpg', 'jpeg', 'png', 'webp')

// 断言：格式 → 质量映射正确
expect(getQualityForFormat(format)).toBe(expectedQuality)
```

**Property 2: 模式切换控件可见性**
```typescript
// 生成器：所有压缩模式
fc.constantFrom('smart', 'quality', 'targetSize', 'none')

// 断言：切换到模式 M 后，只有 M 的控件可见
expect(getVisibleControls(mode)).toEqual(expectedControls)
```

**Property 3: 质量预设选择反馈**
```typescript
// 生成器：所有质量预设
fc.constantFrom(60, 70, 75, 80, 85, 90)

// 断言：点击预设 P 后，P 被高亮，其他未高亮
expect(getHighlightedPreset()).toBe(clickedPreset)
```

**Property 4: 目标大小输入验证**
```typescript
// 生成器：任意整数
fc.integer()

// 断言：验证后的值在 [5, 10000] 范围内
const validated = validateTargetSize(input)
expect(validated).toBeGreaterThanOrEqual(5)
expect(validated).toBeLessThanOrEqual(10000)
```

**Property 5: 目标大小压缩尝试**
```typescript
// 生成器：有效的目标大小 (5-10000)
fc.integer({ min: 5, max: 10000 })

// 生成器：随机图片数据
fc.uint8Array({ minLength: 1000, maxLength: 100000 })

// 断言：压缩后的大小在目标大小的 ±15% 范围内
const outputSize = await compressToTargetSize(image, targetKB)
expect(outputSize).toBeGreaterThanOrEqual(targetKB * 0.85 * 1024)
expect(outputSize).toBeLessThanOrEqual(targetKB * 1.15 * 1024)
```

**Property 6: 元数据控制可见性**
```typescript
// 生成器：所有压缩模式
fc.constantFrom('smart', 'quality', 'targetSize', 'none')

// 断言：智能模式下禁用，其他模式下启用
const isEnabled = isMetadataControlEnabled(mode)
expect(isEnabled).toBe(mode !== 'smart')
```

**Property 7: 元数据处理正确性**
```typescript
// 生成器：随机图片（带元数据）
fc.record({
  data: fc.uint8Array({ minLength: 1000 }),
  hasMetadata: fc.constant(true)
})

// 生成器：元数据选项
fc.boolean()

// 断言：勾选时无元数据，未勾选时有元数据
const output = await processImage(image, { removeMetadata })
expect(hasMetadata(output)).toBe(!removeMetadata)
```

**Property 9: 格式检测正确性**
```typescript
// 生成器：不同格式的图片文件
fc.record({
  format: fc.constantFrom('jpg', 'png', 'webp'),
  data: fc.uint8Array({ minLength: 1000 })
})

// 断言：检测到的格式与实际格式一致
const detected = detectFormat(imageFile)
expect(detected).toBe(imageFile.format)
```

**Property 10: 向后兼容参数转换**
```typescript
// 生成器：旧版本的 CompressionParams
fc.record({
  mode: fc.constantFrom('quality', 'targetSize'),
  value: fc.integer({ min: 1, max: 100 })
})

// 断言：转换后的参数功能等效
const migrated = migrateOldParams(oldParams)
expect(migrated.mode).toBe(oldParams.mode)
expect(migrated.value).toBe(oldParams.value)
expect(migrated.removeMetadata).toBe(true)  // 默认值
```

**Property 12: 参数持久化往返**
```typescript
// 生成器：任意有效的压缩设置
fc.record({
  mode: fc.constantFrom('smart', 'quality', 'targetSize', 'none'),
  qualityPreset: fc.constantFrom(60, 70, 75, 80, 85, 90),
  targetSize: fc.integer({ min: 5, max: 10000 }),
  removeMetadata: fc.boolean()
})

// 断言：保存后加载，得到相同的设置
saveSettings(settings)
const loaded = loadSettings()
expect(loaded).toEqual(settings)
```

### 3. 集成测试策略

#### 端到端流程测试

**测试场景 1：智能压缩完整流程**
1. 用户选择图片文件（JPG）
2. 选择智能压缩模式
3. 点击处理按钮
4. 验证输出文件：质量 80，无元数据

**测试场景 2：手动质量压缩流程**
1. 用户选择图片文件（PNG）
2. 选择"按质量"模式
3. 选择质量预设 85
4. 取消勾选"移除元数据"
5. 点击处理按钮
6. 验证输出文件：质量 85，保留元数据

**测试场景 3：参数持久化流程**
1. 用户设置参数（按质量，预设 70）
2. 关闭应用
3. 重新打开应用
4. 验证参数已恢复（按质量，预设 70）

### 4. 性能测试

虽然性能测试不在单元测试范围内，但需要在开发过程中手动验证：

**性能指标**：
- UI 模式切换响应时间 < 100ms
- 参数防抖延迟 = 300ms
- 持久化延迟 = 500ms
- 图片处理性能保持现有水平（1920x1080 @ 70% quality < 500ms）

**性能测试方法**：
- 使用 Chrome DevTools Performance 面板
- 使用 console.time/timeEnd 测量关键操作
- 使用 React DevTools Profiler 分析组件渲染

### 5. 测试覆盖率目标

- **代码覆盖率**：≥ 80%
- **分支覆盖率**：≥ 75%
- **关键路径覆盖率**：100%（智能压缩算法、元数据处理、持久化）

### 6. 测试执行

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 监视模式（开发时）
npm run test:watch

# 运行特定测试文件
npm test -- ParameterPanel.test.tsx
```

---

## 实施计划

### Phase 1: 类型定义和数据模型（1-2 小时）

1. 扩展 `CompressionParams` 类型
2. 定义智能压缩相关类型
3. 定义持久化数据结构
4. 编写类型测试

### Phase 2: 智能压缩算法（2-3 小时）

1. 实现格式检测逻辑
2. 实现智能压缩配置映射
3. 修改 `applyCompressionAndFormat` 方法
4. 添加日志记录
5. 编写单元测试和属性测试

### Phase 3: UI 组件修改（3-4 小时）

1. 修改标签页标题（"压缩" → "优化"）
2. 添加智能压缩模式选项
3. 将质量滑块改为预设按钮组
4. 添加元数据控制复选框
5. 实现模式切换逻辑
6. 编写组件测试

### Phase 4: 参数持久化（1-2 小时）

1. 实现 localStorage 保存/加载函数
2. 添加防抖延迟（500ms）
3. 实现数据验证和迁移
4. 编写持久化测试

### Phase 5: 集成和测试（2-3 小时）

1. 集成所有模块
2. 运行完整测试套件
3. 修复发现的问题
4. 验证性能指标
5. 端到端测试

### Phase 6: 文档和发布（1 小时）

1. 更新用户文档
2. 更新 CHANGELOG
3. 代码审查
4. 发布新版本

**总预计时间**：10-15 小时

---

## 风险和缓解措施

### 风险 1：向后兼容性破坏

**描述**：新的数据结构可能导致旧版本保存的参数无法加载

**影响**：用户升级后丢失之前的设置

**缓解措施**：
- 实现数据迁移逻辑
- 保持旧的 `mode` 值（'quality', 'targetSize'）兼容
- 添加版本号字段，支持未来的数据迁移
- 充分测试旧数据加载场景

### 风险 2：智能压缩质量不符合预期

**描述**：自动选择的质量参数可能不适合某些特定图片

**影响**：用户对输出质量不满意

**缓解措施**：
- 提供手动模式作为备选
- 在文档中说明智能模式的适用场景
- 收集用户反馈，调整质量参数
- 考虑未来添加"智能+"模式（更高质量）

### 风险 3：localStorage 不可用

**描述**：某些浏览器环境（隐私模式、企业策略）可能禁用 localStorage

**影响**：参数无法持久化，每次启动都使用默认设置

**缓解措施**：
- 静默处理 localStorage 错误
- 在内存中保持当前会话的设置
- 不影响核心功能的使用
- 考虑未来支持其他持久化方式（文件系统）

### 风险 4：性能回归

**描述**：新增的逻辑可能影响图片处理性能

**影响**：用户体验下降

**缓解措施**：
- 智能压缩逻辑非常简单（格式映射查找）
- 不增加额外的图片处理步骤
- 性能测试验证
- 如有问题，优化关键路径

### 风险 5：UI 复杂度增加

**描述**：新增的选项和模式可能让界面变得复杂

**影响**：用户学习成本增加

**缓解措施**：
- 智能压缩作为默认选项，简化大多数用户的使用
- 提供清晰的 tooltip 说明
- 保持界面布局简洁
- 用户测试验证易用性

---

## 未来扩展

### 1. 智能压缩增强

- **自适应质量**：根据图片内容（复杂度、噪点）动态调整质量
- **批量优化**：分析整个批次的图片特征，选择最优参数
- **学习用户偏好**：记录用户的手动调整，优化智能算法

### 2. 更多压缩模式

- **智能+模式**：更高质量的智能压缩（PNG → 90, JPG → 85）
- **极限压缩模式**：最小文件大小优先
- **无损压缩模式**：PNG 无损优化

### 3. 元数据选择性保留

- **保留特定字段**：允许用户选择保留哪些元数据（如版权信息）
- **元数据编辑**：在处理过程中修改元数据

### 4. 预设管理

- **保存自定义预设**：用户可以保存常用的参数组合
- **预设分享**：导出/导入预设配置

### 5. 批量处理优化

- **分组处理**：不同类型的图片使用不同的参数
- **条件处理**：根据文件大小、尺寸自动选择参数

---

## 参考资料

### 技术文档

- [Sharp 文档](https://sharp.pixelplumbing.com/)
- [React Testing Library](https://testing-library.com/react)
- [fast-check 文档](https://fast-check.dev/)
- [Electron IPC 通信](https://www.electronjs.org/docs/latest/tutorial/ipc)

### 相关规范

- [EXIF 规范](https://www.exif.org/)
- [IPTC 规范](https://iptc.org/standards/photo-metadata/)
- [XMP 规范](https://www.adobe.com/devnet/xmp.html)

### 设计参考

- [Material Design - Selection Controls](https://m3.material.io/components/selection-controls)
- [Human Interface Guidelines - Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)

---

**文档版本**：1.0  
**最后更新**：2025-01-XX  
**作者**：Kiro AI Assistant
