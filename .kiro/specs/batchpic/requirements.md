# 需求文档

## 简介

BatchPic 是一个图片交付准备工具，旨在帮助用户快速批量处理图片以满足交付要求。该工具专注于速度和简洁性，使用户能够在从启动到导出的 30 秒内完成调整大小、压缩和格式转换。BatchPic 不是图片编辑器 - 它是一个交付准备工具，批量处理文件而不进入单图片编辑视图。

## 术语表

- **BatchPic**: 图片交付准备应用程序
- **Processing_Template（处理模板）**: 可重复使用的尺寸、压缩和格式参数组合
- **Output_Directory（输出目录）**: 自动创建的用于保存处理后图片的目录
- **Delivery_Requirements（交付要求）**: 平台或客户对图片尺寸、文件大小或格式的规范
- **Batch_Operation（批量操作）**: 使用相同参数一次性处理多张图片
- **Source_Image（源图片）**: 用户提供的用于处理的原始图片文件
- **Processed_Image（处理后图片）**: 根据用户指定参数转换后的图片

## 需求

### 需求 1: 文件输入与组织

**用户故事:** 作为用户，我希望能够拖放图片文件或文件夹到应用程序中，以便无需浏览文件对话框即可快速开始处理。

#### 验收标准

1. WHEN 用户拖入单个图片文件到应用程序时，THE BatchPic SHALL 接受该文件并准备处理
2. WHEN 用户拖入文件夹到应用程序时，THE BatchPic SHALL 递归扫描所有子目录并收集所有支持的图片文件
3. WHEN 从文件夹收集图片时，THE BatchPic SHALL 保留原始目录结构用于输出
4. THE BatchPic SHALL 支持 jpg、png 和 webp 格式作为输入
5. WHEN 遇到不支持的文件类型时，THE BatchPic SHALL 跳过它们而不显示错误

### 需求 2: 批量调整大小操作

**用户故事:** 作为用户，我希望在保持宽高比的同时调整多张图片的大小，以便满足交付尺寸要求。

#### 验收标准

1. WHEN 用户指定目标宽度时，THE BatchPic SHALL 按比例调整所有图片以匹配该宽度
2. WHEN 用户指定目标高度时，THE BatchPic SHALL 按比例调整所有图片以匹配该高度
3. WHEN 用户指定长边尺寸时，THE BatchPic SHALL 调整所有图片使其最长边匹配该尺寸
4. WHEN 用户指定短边尺寸时，THE BatchPic SHALL 调整所有图片使其最短边匹配该尺寸
5. WHERE 用户选择固定宽高比（1:1、4:5 或 16:9）时，THE BatchPic SHALL 裁剪图片以匹配该比例
6. THE BatchPic SHALL NOT 允许自由拉伸或任意裁剪导致宽高比失真

### 需求 3: 批量压缩

**用户故事:** 作为用户，我希望压缩图片以满足文件大小要求，以便交付符合平台限制的图片。

#### 验收标准

1. WHEN 用户指定目标文件大小（KB）时，THE BatchPic SHALL 将每张图片压缩到大约该大小
2. WHEN 用户指定质量百分比时，THE BatchPic SHALL 使用该质量级别压缩每张图片
3. WHEN 应用压缩时，THE BatchPic SHALL 实时显示原始文件大小和预估输出文件大小
4. THE BatchPic SHALL NOT 向用户暴露复杂的编码参数
5. WHEN 未指定压缩时，THE BatchPic SHALL 应用默认压缩，从原始大小减少 30%

### 需求 4: 格式转换

**用户故事:** 作为用户，我希望在常见格式之间转换图片，以便以所需格式交付图片。

#### 验收标准

1. THE BatchPic SHALL 支持 jpg、png 和 webp 作为输入格式
2. THE BatchPic SHALL 支持 jpg、png 和 webp 作为输出格式
3. WHEN 用户选择输出格式时，THE BatchPic SHALL 将所有图片转换为该格式
4. WHEN 未指定输出格式时，THE BatchPic SHALL 保留每张图片的原始格式
5. THE BatchPic SHALL NOT 在 MVP 中支持 PSD、TIFF 或 HEIC 格式

### 需求 5: 处理模板

**用户故事:** 作为用户，我希望保存并重用处理参数组合，以便快速将相同设置应用于未来的批次。

#### 验收标准

1. WHEN 用户配置尺寸、压缩和格式参数时，THE BatchPic SHALL 提供将这些参数保存为 Processing_Template 的选项
2. WHEN 用户保存 Processing_Template 时，THE BatchPic SHALL 将其存储在应用程序内以供将来使用
3. WHEN 用户选择已保存的 Processing_Template 时，THE BatchPic SHALL 将所有保存的参数应用于当前批次
4. THE BatchPic SHALL 允许用户创建具有不同参数组合的多个 Processing_Template
5. WHEN 选择 Processing_Template 时，THE BatchPic SHALL 在 UI 中显示模板的参数

### 需求 6: 输出管理

**用户故事:** 作为用户，我希望处理后的图片以有组织的方式保存，以便轻松定位和交付它们而不会混淆。

#### 验收标准

1. WHEN 启动处理时，THE BatchPic SHALL 自动创建 Output_Directory
2. WHEN 从嵌套文件夹处理图片时，THE BatchPic SHALL 在 Output_Directory 中保留原始目录结构
3. THE BatchPic SHALL NOT 在处理期间覆盖 Source_Images
4. WHEN 保存 Processed_Images 时，THE BatchPic SHALL 使用原始文件名加上适当的输出格式扩展名
5. WHEN 处理完成时，THE BatchPic SHALL 提供直接链接以打开 Output_Directory

### 需求 7: 单窗口界面

**用户故事:** 作为用户，我希望所有处理选项在单个屏幕上可见，以便在 30 秒内完成任务而无需浏览多个页面。

#### 验收标准

1. THE BatchPic SHALL 在单个主页上显示所有处理选项
2. THE BatchPic SHALL NOT 使用多页导航、模态编辑窗口或嵌套菜单树
3. WHEN 应用程序启动时，THE BatchPic SHALL 显示拖放区域、尺寸选项、压缩选项、格式选项、模板选择和开始按钮
4. THE BatchPic SHALL 为所有参数更改提供即时视觉反馈
5. WHEN 图片被拖入应用程序时，THE BatchPic SHALL 显示处理效果的预览

### 需求 8: 默认处理行为

**用户故事:** 作为用户，我希望在拖入图片时立即应用合理的默认值，以便无需配置每个参数即可快速导出。

#### 验收标准

1. WHEN 图片被拖入应用程序时，THE BatchPic SHALL 自动应用默认参数：原始尺寸、-30% 压缩和原始格式
2. WHEN 应用默认参数时，THE BatchPic SHALL 显示确认可直接使用版本的通知
3. THE BatchPic SHALL 允许用户在导出前修改任何默认参数
4. WHEN 参数更改时，THE BatchPic SHALL 实时更新预览和文件大小估算
5. THE BatchPic SHALL NOT 要求用户在导出前确认或批准默认设置

### 需求 9: 本地处理

**用户故事:** 作为用户，我希望所有图片处理都在本地机器上进行，以便我的图片保持私密且处理速度快。

#### 验收标准

1. THE BatchPic SHALL 在本地处理所有图片而不上传到外部服务器
2. THE BatchPic SHALL 使用 libvips 或 ImageMagick 进行图片处理操作
3. THE BatchPic SHALL 作为单进程单窗口运行
4. THE BatchPic SHALL 支持 Windows 和 macOS 操作系统
5. WHEN 处理大批量图片时，THE BatchPic SHALL 提供进度反馈而不阻塞 UI

### 需求 10: 快速导出工作流

**用户故事:** 作为用户，我希望通过单击一个按钮导出处理后的图片，以便快速完成交付准备。

#### 验收标准

1. THE BatchPic SHALL 提供单个突出的"导出图片"按钮以启动处理
2. WHEN 单击导出按钮时，THE BatchPic SHALL 处理所有图片而不显示确认对话框
3. WHEN 处理完成时，THE BatchPic SHALL 显示完成消息并提供打开 Output_Directory 的链接
4. THE BatchPic SHALL NOT 在导出期间显示"您确定吗"提示或不必要的中断
5. WHEN 任何图片处理失败时，THE BatchPic SHALL 继续处理剩余图片并在最后报告失败
