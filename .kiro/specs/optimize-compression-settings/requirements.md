# Requirements Document

## Introduction

本文档定义了 BatchPic 图片批处理应用中压缩设置界面优化功能的需求。该功能旨在通过引入智能压缩模式、优化用户界面标题和提供更直观的参数选择,提升用户体验和易用性。

## Glossary

- **Compression_Settings_Panel**: 压缩设置面板,用户配置图片压缩参数的界面组件
- **Smart_Compression**: 智能压缩模式,系统根据图片格式自动选择最优压缩参数的功能
- **Quality_Preset**: 质量预设档位,预定义的压缩质量选项(60/70/75/80/85/90)
- **Target_Size**: 目标文件大小,用户指定的压缩后文件大小上限(单位:KB)
- **Metadata**: 图片元数据,包括 EXIF、IPTC、XMP 等信息
- **Image_Processor**: 图片处理器,负责执行图片压缩、格式转换等操作的后端模块
- **Parameter_Panel**: 参数面板,包含尺寸、压缩、格式三个标签页的主控制面板

## Requirements

### Requirement 1: 修改压缩设置标题

**User Story:** 作为用户,我希望看到更符合直觉的界面标题,以便更好地理解功能用途

#### Acceptance Criteria

1. THE Compression_Settings_Panel SHALL 将标题从 "压缩" 修改为 "优化"
2. THE Compression_Settings_Panel SHALL 在标签页图标和文本中使用 "优化" 术语
3. THE Compression_Settings_Panel SHALL 保持标签页在 Parameter_Panel 中的位置不变

### Requirement 2: 实现智能压缩模式

**User Story:** 作为用户,我希望有一个智能压缩选项,这样我就不需要手动选择复杂的参数

#### Acceptance Criteria

1. THE Compression_Settings_Panel SHALL 提供 "智能压缩" 作为默认压缩模式选项
2. WHEN 用户选择智能压缩模式, THE Compression_Settings_Panel SHALL 隐藏所有手动参数输入控件
3. WHEN 智能压缩模式被激活, THE Image_Processor SHALL 自动检测输入图片的格式(PNG/JPG/WebP)
4. WHEN 图片格式为 JPG, THE Image_Processor SHALL 应用质量参数 80
5. WHEN 图片格式为 PNG, THE Image_Processor SHALL 应用质量参数 85
6. WHEN 图片格式为 WebP, THE Image_Processor SHALL 应用质量参数 80
7. WHEN 智能压缩模式被激活, THE Image_Processor SHALL 自动移除图片 Metadata
8. THE Compression_Settings_Panel SHALL 在智能压缩选项上显示 "(默认)" 标识

### Requirement 3: 提供质量预设档位

**User Story:** 作为用户,我希望从预设的质量档位中选择,而不是使用滑块,以便更快速地做出决策

#### Acceptance Criteria

1. WHEN 用户选择 "按质量" 压缩模式, THE Compression_Settings_Panel SHALL 显示质量预设选择器
2. THE Compression_Settings_Panel SHALL 提供以下质量预设选项: 60, 70, 75, 80, 85, 90
3. THE Compression_Settings_Panel SHALL 将质量预设显示为按钮组形式
4. WHEN 用户点击某个质量预设, THE Compression_Settings_Panel SHALL 高亮显示该选项
5. THE Compression_Settings_Panel SHALL 移除原有的 1-100 连续滑块控件
6. THE Compression_Settings_Panel SHALL 默认选中质量预设 80

### Requirement 4: 优化目标大小设置

**User Story:** 作为用户,我希望能够指定目标文件大小,以便控制输出文件的存储空间

#### Acceptance Criteria

1. WHEN 用户选择 "按大小" 压缩模式, THE Compression_Settings_Panel SHALL 显示目标大小输入框
2. THE Compression_Settings_Panel SHALL 将目标大小输入框的默认值设置为 200 KB
3. THE Compression_Settings_Panel SHALL 允许用户输入 5 到 10000 之间的整数值
4. WHEN 用户输入目标大小, THE Image_Processor SHALL 尝试将图片压缩至指定大小
5. IF 图片无法压缩至目标大小, THEN THE Image_Processor SHALL 应用最大压缩并记录警告信息

### Requirement 5: 独立的元数据控制

**User Story:** 作为用户,我希望能够独立控制是否移除图片元数据,以便在需要时保留 EXIF 等信息

#### Acceptance Criteria

1. THE Compression_Settings_Panel SHALL 在所有压缩模式下显示 "移除元数据" 复选框选项
2. THE Compression_Settings_Panel SHALL 默认勾选 "移除元数据" 选项
3. WHEN 用户取消勾选 "移除元数据", THE Image_Processor SHALL 在处理图片时保留原始 Metadata
4. WHEN 用户勾选 "移除元数据", THE Image_Processor SHALL 移除图片中的 EXIF、IPTC、XMP 等元数据
5. WHEN 智能压缩模式被激活, THE Compression_Settings_Panel SHALL 禁用 "移除元数据" 复选框并保持勾选状态

### Requirement 6: 压缩模式选项重组

**User Story:** 作为用户,我希望看到清晰组织的压缩模式选项,以便快速理解和选择

#### Acceptance Criteria

1. THE Compression_Settings_Panel SHALL 提供以下压缩模式选项: "智能压缩"、"按质量"、"按大小"、"不压缩"
2. THE Compression_Settings_Panel SHALL 将压缩模式选项显示为按钮组形式
3. THE Compression_Settings_Panel SHALL 默认选中 "智能压缩" 模式
4. WHEN 用户切换压缩模式, THE Compression_Settings_Panel SHALL 立即更新显示的参数控件
5. THE Compression_Settings_Panel SHALL 在模式按钮上提供 tooltip 说明

### Requirement 7: 向后兼容性

**User Story:** 作为开发者,我希望新功能不破坏现有的处理逻辑,以便平滑升级

#### Acceptance Criteria

1. THE Image_Processor SHALL 保持现有的 CompressionParams 数据结构兼容性
2. WHEN 智能压缩模式被使用, THE Image_Processor SHALL 将其转换为等效的 quality 模式参数
3. THE Compression_Settings_Panel SHALL 能够正确加载和显示旧版本保存的压缩参数
4. THE Image_Processor SHALL 保持现有的图片处理性能水平

### Requirement 8: 用户界面响应性

**User Story:** 作为用户,我希望界面响应流畅,以便获得良好的交互体验

#### Acceptance Criteria

1. WHEN 用户切换压缩模式, THE Compression_Settings_Panel SHALL 在 100ms 内更新界面
2. WHEN 用户修改参数, THE Compression_Settings_Panel SHALL 使用防抖机制(300ms)更新预估大小
3. THE Compression_Settings_Panel SHALL 在参数变化时平滑过渡界面元素
4. THE Compression_Settings_Panel SHALL 在所有交互元素上提供视觉反馈(hover/active 状态)

### Requirement 9: 智能压缩算法规则

**User Story:** 作为开发者,我需要明确的智能压缩算法规则,以便正确实现功能

#### Acceptance Criteria

1. WHEN 输入图片格式为 JPG 或 JPEG, THE Image_Processor SHALL 应用以下参数: quality=80, removeMetadata=true
2. WHEN 输入图片格式为 PNG, THE Image_Processor SHALL 应用以下参数: quality=85, removeMetadata=true
3. WHEN 输入图片格式为 WebP, THE Image_Processor SHALL 应用以下参数: quality=80, removeMetadata=true
4. WHEN 输入图片格式无法识别, THE Image_Processor SHALL 应用默认参数: quality=80, removeMetadata=true
5. THE Image_Processor SHALL 在智能压缩模式下记录所应用的实际参数到日志

### Requirement 10: 参数持久化

**User Story:** 作为用户,我希望我的参数选择能够被记住,以便下次使用时无需重新配置

#### Acceptance Criteria

1. WHEN 用户修改压缩模式或参数, THE Compression_Settings_Panel SHALL 将设置保存到本地存储
2. WHEN 应用启动, THE Compression_Settings_Panel SHALL 从本地存储加载上次使用的设置
3. IF 本地存储中没有保存的设置, THEN THE Compression_Settings_Panel SHALL 使用默认设置(智能压缩模式)
4. THE Compression_Settings_Panel SHALL 在设置变化后 500ms 内完成持久化操作
