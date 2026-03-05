# Requirements Document: auto-process-on-drop

## Introduction

本需求文档定义了 BatchPic 应用的自动处理功能。该功能旨在优化用户工作流程，实现拖拽图片后立即自动处理，使用预设参数，按图片展示处理进度，全程无需用户干预。这将显著提升批量图片处理的效率和用户体验。

## Glossary

- **System**: BatchPic 应用的整体系统
- **DropZone**: 接收用户拖拽文件的 UI 区域
- **ImageProcessor**: 负责图片处理的核心模块
- **ProgressPanel**: 显示图片处理进度的 UI 组件
- **IPC_Bridge**: Electron 主进程与渲染进程之间的通信桥梁
- **AppContext**: React 应用的全局状态管理
- **DEFAULT_PARAMS**: 预设的图片处理参数（质量 70%，保持原始尺寸和格式）
- **ImageProgress**: 单张图片的处理进度状态
- **ProcessingResult**: 批量处理的最终结果
- **OutputDirectory**: 存储处理后图片的输出目录

## Requirements

### Requirement 1: 文件扫描与识别

**User Story:** 作为用户，我希望拖拽文件或文件夹后系统能自动识别所有图片文件，这样我就不需要手动选择每张图片。

#### Acceptance Criteria

1. WHEN 用户拖拽一个或多个文件路径到 DropZone，THE System SHALL 扫描所有路径并识别支持的图片文件
2. WHEN 用户拖拽文件夹到 DropZone，THE System SHALL 递归扫描文件夹内的所有图片文件
3. WHEN 扫描完成，THE System SHALL 将识别的图片文件添加到输入文件列表
4. WHEN 扫描过程中遇到不支持的文件格式，THE System SHALL 跳过该文件并继续扫描
5. IF 扫描失败，THEN THE System SHALL 显示错误通知并保持当前状态不变

### Requirement 2: 自动处理触发

**User Story:** 作为用户，我希望拖拽图片后系统立即自动处理，这样我就不需要点击额外的按钮。

#### Acceptance Criteria

1. WHEN 文件扫描成功完成且自动处理开关启用，THE System SHALL 立即触发批量图片处理
2. WHEN 触发自动处理，THE System SHALL 使用 DEFAULT_PARAMS 作为处理参数
3. WHEN 触发自动处理，THE System SHALL 创建输出目录用于存储处理后的图片
4. WHEN 自动处理开关禁用，THE System SHALL 仅扫描文件而不触发处理
5. THE System SHALL 在触发自动处理前显示通知："已为你准备好一个可直接使用的版本"

### Requirement 3: 按图片进度跟踪

**User Story:** 作为用户，我希望看到每张图片的处理状态和进度，这样我就能知道哪些图片已完成、哪些正在处理、哪些失败了。

#### Acceptance Criteria

1. WHEN 文件扫描完成，THE System SHALL 为每张图片初始化进度状态为 'pending'
2. WHEN 开始处理某张图片，THE System SHALL 更新该图片的状态为 'processing'
3. WHEN 某张图片处理成功，THE System SHALL 更新该图片的状态为 'success' 并记录输出路径和文件大小
4. WHEN 某张图片处理失败，THE System SHALL 更新该图片的状态为 'failed' 并记录错误信息
5. THE System SHALL 确保每张图片的进度状态只能按照 pending → processing → (success | failed) 的顺序转换

### Requirement 4: 实时进度显示

**User Story:** 作为用户，我希望在处理过程中实时看到进度更新，这样我就能了解处理的当前状态。

#### Acceptance Criteria

1. WHEN 处理过程中，THE ProgressPanel SHALL 显示所有图片的进度列表
2. WHEN 图片状态更新，THE ProgressPanel SHALL 立即反映状态变化（pending/processing/success/failed）
3. WHEN 图片处理成功，THE ProgressPanel SHALL 显示原始文件大小、处理后文件大小和压缩比例
4. WHEN 图片处理失败，THE ProgressPanel SHALL 显示错误信息
5. WHEN 所有图片处理完成，THE ProgressPanel SHALL 显示总计统计（成功数量、失败数量）

### Requirement 5: 批量处理执行

**User Story:** 作为用户，我希望系统能高效地批量处理多张图片，这样我就能快速完成大量图片的处理任务。

#### Acceptance Criteria

1. WHEN 执行批量处理，THE ImageProcessor SHALL 使用并发处理以提升处理速度
2. WHEN 处理单张图片，THE ImageProcessor SHALL 应用指定的处理参数（质量、尺寸、格式）
3. WHEN 单张图片处理完成，THE IPC_Bridge SHALL 立即发送进度事件到渲染进程
4. WHEN 某张图片处理失败，THE System SHALL 继续处理下一张图片而不中断整个批量处理
5. WHEN 所有图片处理完成，THE System SHALL 返回完整的处理结果（成功列表、失败列表、总耗时）

### Requirement 6: 输出目录管理

**User Story:** 作为用户，我希望处理后的图片自动保存到有组织的输出目录，这样我就能轻松找到处理结果。

#### Acceptance Criteria

1. WHEN 开始自动处理，THE System SHALL 创建带时间戳的输出目录
2. WHEN 创建输出目录，THE System SHALL 确保目录位于用户主目录内
3. WHEN 处理图片，THE System SHALL 保持原始的文件名和相对路径结构
4. IF 输出目录创建失败，THEN THE System SHALL 显示错误通知并终止处理
5. WHEN 图片处理成功，THE System SHALL 将处理后的图片写入输出目录

### Requirement 7: 处理完成通知

**User Story:** 作为用户，我希望在处理完成后收到明确的通知，这样我就能知道任务已完成并了解处理结果。

#### Acceptance Criteria

1. WHEN 所有图片处理完成且全部成功，THE System SHALL 显示成功通知："处理完成：N 张图片已导出"
2. WHEN 所有图片处理完成但有失败，THE System SHALL 显示警告通知："处理完成：N 成功，M 失败"
3. WHEN 处理完成且有失败，THE System SHALL 自动显示错误报告对话框
4. WHEN 处理过程中发生致命错误，THE System SHALL 显示错误通知并说明失败原因
5. THE System SHALL 在通知中使用适当的持续时间（成功 5 秒，错误 5 秒）

### Requirement 8: 自动处理开关

**User Story:** 作为用户，我希望能够控制是否启用自动处理功能，这样我就能根据需要选择手动或自动模式。

#### Acceptance Criteria

1. THE System SHALL 提供自动处理开关设置
2. WHEN 自动处理开关启用，THE System SHALL 在文件扫描完成后立即触发处理
3. WHEN 自动处理开关禁用，THE System SHALL 仅扫描文件并等待用户手动触发处理
4. THE System SHALL 持久化自动处理开关的状态
5. THE System SHALL 在 UI 中清晰显示自动处理开关的当前状态

### Requirement 9: 错误处理与恢复

**User Story:** 作为用户，我希望系统能妥善处理各种错误情况，这样我就能了解问题所在并采取相应措施。

#### Acceptance Criteria

1. IF 文件扫描失败，THEN THE System SHALL 显示错误通知并保持当前状态
2. IF 单张图片处理失败，THEN THE System SHALL 记录错误信息并继续处理其他图片
3. IF 输出目录创建失败，THEN THE System SHALL 显示错误通知并终止处理
4. IF IPC 通信失败，THEN THE System SHALL 显示错误通知并设置处理状态为未处理
5. WHEN 处理过程中遇到内存不足，THE System SHALL 记录警告并尝试继续处理

### Requirement 10: 性能优化

**User Story:** 作为用户，我希望系统能高效处理大量图片而不卡顿，这样我就能流畅地完成批量处理任务。

#### Acceptance Criteria

1. WHEN 批量处理图片，THE ImageProcessor SHALL 限制并发数量为 CPU 核心数
2. WHEN 更新进度状态，THE System SHALL 使用节流机制避免过度渲染
3. WHEN 处理超大图片（> 1 亿像素），THE System SHALL 自动缩小到安全尺寸
4. WHEN 显示大量进度项，THE ProgressPanel SHALL 使用性能优化的渲染策略
5. THE System SHALL 确保单张图片处理时间 < 500ms（1920x1080, 质量 70%）

### Requirement 11: 安全性保障

**User Story:** 作为用户，我希望系统能安全地处理我的文件，这样我就不用担心数据泄露或系统破坏。

#### Acceptance Criteria

1. WHEN 接收文件路径，THE System SHALL 验证路径的合法性并拒绝可疑路径
2. WHEN 扫描文件，THE System SHALL 验证文件类型并只处理支持的图片格式
3. WHEN 创建输出目录，THE System SHALL 确保目录位于用户主目录内
4. WHEN 处理 IPC 消息，THE System SHALL 验证所有参数的类型和有效性
5. THE System SHALL 避免覆盖现有文件

### Requirement 12: 状态一致性

**User Story:** 作为开发者，我希望系统状态始终保持一致，这样应用就能稳定可靠地运行。

#### Acceptance Criteria

1. WHEN 批量处理完成，THE System SHALL 确保所有图片都有最终状态（success 或 failed）
2. WHEN 更新进度状态，THE System SHALL 确保状态转换遵循合法的状态机规则
3. WHEN 处理结果返回，THE System SHALL 确保成功数量 + 失败数量 = 输入文件数量
4. WHEN 图片处理成功，THE System SHALL 确保输出文件存在于文件系统中
5. WHEN 进度回调触发，THE System SHALL 确保每张图片的回调被调用恰好一次

