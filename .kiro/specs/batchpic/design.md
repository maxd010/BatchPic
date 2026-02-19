# 设计文档

## 概述

BatchPic 是一个基于 Electron 的跨平台桌面应用程序，专注于快速批量图片处理以满足交付要求。该应用程序采用单窗口、单页面设计，使用户能够在 30 秒内从启动到导出完成整个工作流程。

核心设计原则：
- **速度优先**: 默认值智能、即时反馈、零确认对话框
- **批量为王**: 所有操作都是批量的，永不进入单图编辑模式
- **本地处理**: 使用 libvips 进行高性能本地图片处理
- **简洁界面**: 单页面包含所有功能，无嵌套菜单或模态窗口

## 架构

### 技术栈

- **前端框架**: Electron + React
- **图片处理**: sharp (基于 libvips 的 Node.js 绑定)
- **状态管理**: React Context API
- **文件系统**: Node.js fs/promises
- **跨平台支持**: Windows 和 macOS

### 架构模式

BatchPic 采用简单的三层架构：

```
┌─────────────────────────────────────┐
│         UI Layer (React)            │
│  - 拖放区域                          │
│  - 参数控制面板                      │
│  - 预览显示                          │
│  - 导出按钮                          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Processing Layer (Node.js)     │
│  - 文件扫描器                        │
│  - 图片处理器                        │
│  - 模板管理器                        │
│  - 输出管理器                        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    Image Processing (sharp/libvips) │
│  - 调整大小                          │
│  - 压缩                              │
│  - 格式转换                          │
└─────────────────────────────────────┘
```

## 组件和接口

### 1. FileScanner（文件扫描器）

负责递归扫描文件夹并收集支持的图片文件。

```typescript
interface FileScanner {
  // 扫描输入路径（文件或文件夹）并返回图片文件列表
  scan(paths: string[]): Promise<ImageFile[]>
}

interface ImageFile {
  path: string           // 完整文件路径
  relativePath: string   // 相对于输入根目录的路径
  format: 'jpg' | 'png' | 'webp'
  size: number          // 文件大小（字节）
  dimensions: { width: number; height: number }
}
```

### 2. ImageProcessor（图片处理器）

执行实际的图片转换操作。

```typescript
interface ImageProcessor {
  // 处理单张图片
  process(input: ImageFile, params: ProcessingParams): Promise<ProcessedImage>
  
  // 批量处理多张图片
  processBatch(inputs: ImageFile[], params: ProcessingParams): Promise<ProcessingResult>
}

interface ProcessingParams {
  resize?: ResizeParams
  compression?: CompressionParams
  format?: 'jpg' | 'png' | 'webp'
}

interface ResizeParams {
  mode: 'width' | 'height' | 'longEdge' | 'shortEdge' | 'aspectRatio'
  value: number
  aspectRatio?: '1:1' | '4:5' | '16:9'  // 仅当 mode 为 'aspectRatio' 时
}

interface CompressionParams {
  mode: 'targetSize' | 'quality'
  value: number  // KB（targetSize）或百分比（quality）
}

interface ProcessedImage {
  outputPath: string
  originalSize: number
  processedSize: number
  success: boolean
  error?: string
}

interface ProcessingResult {
  successful: ProcessedImage[]
  failed: ProcessedImage[]
  totalTime: number
}
```

### 3. TemplateManager（模板管理器）

管理处理模板的保存和加载。

```typescript
interface TemplateManager {
  // 保存新模板
  save(name: string, params: ProcessingParams): Promise<void>
  
  // 加载所有模板
  loadAll(): Promise<Template[]>
  
  // 删除模板
  delete(id: string): Promise<void>
}

interface Template {
  id: string
  name: string
  params: ProcessingParams
  createdAt: Date
}
```

### 4. OutputManager（输出管理器）

管理输出目录创建和文件保存。

```typescript
interface OutputManager {
  // 创建输出目录结构
  createOutputDirectory(inputPaths: string[]): Promise<string>
  
  // 确定输出文件路径（保留目录结构）
  getOutputPath(inputFile: ImageFile, outputRoot: string, format: string): string
  
  // 打开输出目录
  openOutputDirectory(path: string): Promise<void>
}
```

### 5. UI Components（UI 组件）

#### MainWindow（主窗口）

单页面应用程序的根组件。

```typescript
interface MainWindowState {
  images: ImageFile[]
  processingParams: ProcessingParams
  templates: Template[]
  selectedTemplate?: string
  isProcessing: boolean
  processingProgress: number
  result?: ProcessingResult
}
```

#### DropZone（拖放区域）

接受文件和文件夹拖放。

```typescript
interface DropZoneProps {
  onFilesDropped: (paths: string[]) => void
  isEmpty: boolean
}
```

#### ParameterPanel（参数面板）

显示和控制处理参数。

```typescript
interface ParameterPanelProps {
  params: ProcessingParams
  onChange: (params: ProcessingParams) => void
  estimatedSize?: number  // 预估输出大小
}
```

#### PreviewPanel（预览面板）

显示第一张图片的处理效果预览。

```typescript
interface PreviewPanelProps {
  originalImage?: ImageFile
  params: ProcessingParams
}
```

#### TemplateSelector（模板选择器）

显示和选择保存的模板。

```typescript
interface TemplateSelectorProps {
  templates: Template[]
  selectedId?: string
  onSelect: (id: string) => void
  onSave: (name: string, params: ProcessingParams) => void
  onDelete: (id: string) => void
}
```

## 数据模型

### 应用程序状态

应用程序使用 React Context 管理全局状态：

```typescript
interface AppState {
  // 输入文件
  inputFiles: ImageFile[]
  
  // 处理参数（带默认值）
  processingParams: ProcessingParams
  
  // 模板
  templates: Template[]
  selectedTemplateId?: string
  
  // 处理状态
  isProcessing: boolean
  progress: number  // 0-100
  
  // 结果
  result?: ProcessingResult
  outputDirectory?: string
}

// 默认处理参数
const DEFAULT_PARAMS: ProcessingParams = {
  resize: undefined,  // 保持原始尺寸
  compression: {
    mode: 'quality',
    value: 70  // 约 -30% 压缩
  },
  format: undefined  // 保持原始格式
}
```

### 持久化存储

模板存储在本地 JSON 文件中：

```typescript
// 存储位置: userData/templates.json
interface TemplateStorage {
  templates: Template[]
  version: string
}
```

### 文件系统结构

输出目录结构保留输入的目录层次：

```
输入:
  /Users/john/photos/
    ├── vacation/
    │   ├── beach.jpg
    │   └── sunset.png
    └── work/
        └── presentation.jpg

输出:
  /Users/john/photos-processed-20240115-143022/
    ├── vacation/
    │   ├── beach.jpg
    │   └── sunset.jpg  (如果转换为 jpg)
    └── work/
        └── presentation.jpg
```


## 正确性属性

属性是关于系统应该做什么的特征或行为的正式陈述，应该在系统的所有有效执行中保持为真。属性是人类可读规范和机器可验证正确性保证之间的桥梁。

### 属性 1: 递归文件夹扫描保留结构

*对于任何* 包含嵌套子目录和图片文件的文件夹，扫描该文件夹应该找到所有支持格式的图片文件，并且输出目录结构应该与输入目录结构完全匹配。

**验证需求: 1.2, 1.3, 6.2**

### 属性 2: 不支持的文件被跳过

*对于任何* 包含支持和不支持文件类型混合的文件列表，扫描操作应该只收集支持的图片文件（jpg、png、webp）并静默跳过其他文件。

**验证需求: 1.5**

### 属性 3: 调整大小保持宽高比

*对于任何* 图片和任何调整大小参数（目标宽度、高度、长边或短边），调整大小后的图片应该匹配指定的尺寸约束，并且宽高比应该与原始图片相同（除非使用固定宽高比裁剪）。

**验证需求: 2.1, 2.2, 2.3, 2.4, 2.6**

### 属性 4: 固定宽高比裁剪

*对于任何* 图片和任何固定宽高比（1:1、4:5、16:9），裁剪后的图片应该精确匹配该宽高比。

**验证需求: 2.5**

### 属性 5: 目标大小压缩

*对于任何* 图片和目标文件大小，压缩后的图片文件大小应该在目标大小的合理范围内（±15%）。

**验证需求: 3.1**

### 属性 6: 质量级别压缩

*对于任何* 图片和质量百分比（0-100），压缩应该使用指定的质量参数，并且较高的质量值应该产生较大的文件大小。

**验证需求: 3.2**

### 属性 7: 默认压缩行为

*对于任何* 未指定压缩参数的图片，应用默认压缩后的文件大小应该约为原始大小的 70%（±15%）。

**验证需求: 3.5**

### 属性 8: 格式转换和保留

*对于任何* 图片，如果指定了输出格式，则输出应该是该格式；如果未指定输出格式，则输出应该保持原始格式。

**验证需求: 4.3, 4.4**

### 属性 9: 模板持久化往返

*对于任何* 有效的处理参数组合，保存为模板然后加载该模板应该产生相同的参数值。

**验证需求: 5.2, 5.3**

### 属性 10: 输出目录自动创建

*对于任何* 处理操作，应该自动创建一个唯一的输出目录，并且所有处理后的图片应该保存在该目录中。

**验证需求: 6.1**

### 属性 11: 源文件不被修改

*对于任何* 处理操作，所有源图片文件应该保持不变（相同的内容、大小和修改时间）。

**验证需求: 6.3**

### 属性 12: 输出文件命名

*对于任何* 图片和输出格式，输出文件名应该是原始文件名加上适当的格式扩展名。

**验证需求: 6.4**

### 属性 13: 参数更改即时反馈

*对于任何* 参数更改（尺寸、压缩、格式），UI 应该立即更新预览和文件大小估算，无需用户手动刷新。

**验证需求: 7.4, 8.4**

### 属性 14: 默认参数自动应用

*对于任何* 拖入的图片批次，应该自动应用默认参数（原始尺寸、70% 质量压缩、原始格式），无需用户配置。

**验证需求: 8.1**

### 属性 15: UI 响应性与进度反馈

*对于任何* 批量处理操作（包括大批量），UI 应该保持响应并显示处理进度，不应该冻结或阻塞用户交互。

**验证需求: 9.5**

### 属性 16: 导出无确认对话框

*对于任何* 导出操作，点击导出按钮应该立即开始处理，不显示任何确认对话框或"您确定吗"提示。

**验证需求: 10.2**

### 属性 17: 部分失败继续处理

*对于任何* 包含一些会失败的图片的批次，处理应该继续处理所有剩余图片，并在最后报告所有失败。

**验证需求: 10.5**

## 错误处理

### 文件系统错误

- **权限错误**: 如果无法读取输入文件或写入输出目录，跳过该文件并在最终报告中记录错误
- **磁盘空间不足**: 在开始处理前检查可用磁盘空间，如果不足则警告用户
- **文件不存在**: 如果在处理前文件被删除，跳过该文件并继续

### 图片处理错误

- **损坏的图片**: 如果图片文件损坏无法读取，跳过该文件并在报告中标记
- **不支持的格式**: 静默跳过不支持的格式，不显示错误消息
- **内存不足**: 如果单个图片太大导致内存不足，跳过该图片并记录错误

### 用户输入错误

- **无效参数**: 如果用户输入无效的尺寸或质量值，显示内联验证错误并阻止处理
- **空批次**: 如果没有选择图片，禁用导出按钮
- **模板名称冲突**: 如果模板名称已存在，提示用户选择不同的名称或覆盖

### 错误报告

所有错误应该在处理完成后在单个摘要对话框中报告：

```
处理完成
成功: 45 张图片
失败: 3 张图片

失败详情:
- photo1.jpg: 文件损坏
- photo2.png: 权限被拒绝
- photo3.webp: 磁盘空间不足
```

## 测试策略

### 双重测试方法

BatchPic 将使用单元测试和基于属性的测试的组合来确保全面覆盖：

- **单元测试**: 验证特定示例、边缘情况和错误条件
- **属性测试**: 验证所有输入的通用属性

### 单元测试

单元测试应该专注于：

1. **特定示例**: 
   - 拖放单个 JPG 文件
   - 支持的每种格式（jpg、png、webp）
   - 每种固定宽高比（1:1、4:5、16:9）
   - 模板保存和加载

2. **边缘情况**:
   - 空文件夹
   - 非常大的图片（> 50MB）
   - 非常小的图片（< 1KB）
   - 深度嵌套的目录结构（> 10 层）
   - 特殊字符的文件名

3. **错误条件**:
   - 损坏的图片文件
   - 只读输出目录
   - 磁盘空间不足
   - 无效的用户输入

4. **集成点**:
   - Electron 主进程和渲染进程通信
   - 文件系统操作
   - UI 组件交互

### 基于属性的测试

基于属性的测试将使用 **fast-check**（JavaScript/TypeScript 的属性测试库）来验证正确性属性。

每个属性测试应该：
- 运行最少 100 次迭代（由于随机化）
- 使用注释标签引用设计文档属性
- 生成随机但有效的输入数据

标签格式: `// Feature: batchpic, Property {number}: {property_text}`

示例属性测试结构：

```typescript
// Feature: batchpic, Property 3: 调整大小保持宽高比
test('resize maintains aspect ratio', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        width: fc.integer({ min: 100, max: 5000 }),
        height: fc.integer({ min: 100, max: 5000 }),
        targetWidth: fc.integer({ min: 50, max: 2000 })
      }),
      async ({ width, height, targetWidth }) => {
        const originalAspectRatio = width / height
        const resized = await resizeImage({ width, height }, { mode: 'width', value: targetWidth })
        const newAspectRatio = resized.width / resized.height
        
        expect(resized.width).toBe(targetWidth)
        expect(Math.abs(originalAspectRatio - newAspectRatio)).toBeLessThan(0.01)
      }
    ),
    { numRuns: 100 }
  )
})
```

### 测试覆盖率目标

- 核心处理逻辑: > 90% 代码覆盖率
- UI 组件: > 70% 代码覆盖率
- 错误处理路径: > 80% 代码覆盖率

### 性能测试

虽然不是自动化测试套件的一部分，但应该手动验证：

- 100 张图片批次应该在 < 30 秒内处理完成
- UI 应该在 < 2 秒内启动
- 参数更改应该在 < 100ms 内更新预览

### 跨平台测试

所有测试应该在以下平台上运行：
- Windows 10/11
- macOS 12+

使用 CI/CD 管道在两个平台上自动运行测试。
