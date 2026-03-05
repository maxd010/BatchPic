# Implementation Plan: auto-process-on-drop

## Overview

本实现计划将为 BatchPic 应用添加自动处理功能。用户拖拽图片后，系统将自动扫描文件、使用预设参数处理图片，并实时显示每张图片的处理进度。整个流程无需用户手动点击按钮，实现真正的"拖拽即处理"体验。

核心改进包括：
- 扩展 AppContext 以支持按图片的进度跟踪
- 修改 MainWindow 实现自动处理逻辑
- 扩展 IPC 通道支持细粒度进度回调
- 修改 ImageProcessor 支持并发处理和进度报告
- 创建 ProgressPanel 组件显示实时进度

## Tasks

- [ ] 1. 扩展 AppContext 状态管理
  - [x] 1.1 添加 ImageProgress 类型定义和状态字段
    - 在 `src/renderer/context/AppContext.tsx` 中添加 `ImageProgress` 接口
    - 添加 `imageProgress: ImageProgress[]` 状态字段
    - 添加 `autoProcessOnDrop: boolean` 状态字段（默认 true）
    - _Requirements: 3.1, 8.1_
  
  - [x] 1.2 实现进度管理方法
    - 实现 `initializeImageProgress(files: ImageFile[]): void` 方法
    - 实现 `updateImageProgress(index: number, progress: Partial<ImageProgress>): void` 方法
    - 实现 `setAutoProcessOnDrop(enabled: boolean): void` 方法
    - 确保状态转换遵循 pending → processing → (success | failed) 规则
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 12.2_
  
  - [ ]* 1.3 编写 AppContext 扩展的单元测试
    - 测试 `initializeImageProgress` 的正确性（空数组、单文件、多文件）
    - 测试 `updateImageProgress` 的状态转换规则
    - 测试非法状态转换被拒绝
    - _Requirements: 3.5, 12.2_

- [ ] 2. 扩展 IPC 通道和类型定义
  - [x] 2.1 更新类型定义
    - 在 `src/main/types.ts` 中添加 `ImageProgressCallback` 类型
    - 在 `src/renderer/types/electron.d.ts` 中扩展 `ElectronAPI` 接口
    - 添加 `createOutputDirectory` 和 `processImagesWithProgress` 方法签名
    - _Requirements: 2.3, 6.1_
  
  - [x] 2.2 实现 preload.ts 中的 IPC 桥接
    - 实现 `createOutputDirectory(inputPaths: string[]): Promise<string>` 方法
    - 实现 `processImagesWithProgress` 方法，注册 `image-processed` 事件监听器
    - 确保在 Promise 完成后清理事件监听器
    - _Requirements: 5.3, 6.1_
  
  - [x] 2.3 实现 main.ts 中的 IPC 处理器
    - 添加 `create-output-directory` IPC 处理器
    - 添加 `process-images-with-progress` IPC 处理器
    - 实现进度回调，通过 `event.sender.send('image-processed', ...)` 发送事件
    - _Requirements: 5.3, 6.1, 6.2_
  
  - [ ]* 2.4 编写 IPC 通信的集成测试
    - 测试 `create-output-directory` 正确创建目录
    - 测试 `process-images-with-progress` 正确发送进度事件
    - 测试事件监听器正确清理
    - _Requirements: 5.3, 6.1_

- [ ] 3. Checkpoint - 验证基础架构
  - 确保所有测试通过，询问用户是否有问题

- [ ] 4. 修改 ImageProcessor 支持细粒度进度
  - [x] 4.1 添加并发控制依赖
    - 安装 `p-limit` 库：`npm install p-limit`
    - 在 `ImageProcessor.ts` 中导入并配置并发限制
    - _Requirements: 5.1, 10.1_
  
  - [x] 4.2 修改 processBatch 方法
    - 更新 `processBatch` 方法签名，添加 `onProgress?: ImageProgressCallback` 参数
    - 实现并发处理逻辑（使用 p-limit 限制并发数为 CPU 核心数）
    - 在每张图片处理完成后调用 `onProgress` 回调
    - 确保失败的图片不中断批量处理
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.1_
  
  - [x] 4.3 添加大文件检测和处理
    - 检测图片像素数是否超过 1 亿（8000x8000）
    - 对超大图片自动缩小到安全尺寸
    - 记录警告日志
    - _Requirements: 10.3_
  
  - [ ]* 4.4 编写 ImageProcessor 的单元测试
    - 测试并发处理正确性
    - 测试进度回调被正确调用
    - 测试大文件自动缩小
    - 测试单张图片失败不影响其他图片
    - _Requirements: 5.1, 5.3, 5.4, 10.3_
  
  - [ ]* 4.5 编写批量处理的属性测试
    - **Property 6: Batch Processing Completeness**
    - **Validates: Requirements 12.1, 12.3, 5.5**
    - 验证所有图片都有最终状态（success 或 failed）
    - 验证成功数量 + 失败数量 = 输入文件数量

- [ ] 5. 实现 MainWindow 自动处理逻辑
  - [x] 5.1 实现 autoProcessImages 函数
    - 在 `MainWindow.tsx` 中创建 `autoProcessImages` 函数
    - 实现创建输出目录逻辑
    - 实现进度回调函数 `onImageProcessed`
    - 实现批量处理调用和结果处理
    - 实现完成通知和错误报告显示
    - _Requirements: 2.1, 2.2, 2.3, 5.5, 7.1, 7.2, 7.3_
  
  - [x] 5.2 修改 handleFilesDropped 函数
    - 在文件扫描完成后调用 `initializeImageProgress`
    - 显示准备通知："已为你准备好一个可直接使用的版本"
    - 检查 `autoProcessOnDrop` 开关，如果启用则调用 `autoProcessImages`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.4, 2.5, 3.1_
  
  - [x] 5.3 添加自动处理开关 UI
    - 在 MainWindow 中添加自动处理开关（Toggle/Checkbox）
    - 绑定到 `state.autoProcessOnDrop` 状态
    - 实现切换逻辑
    - _Requirements: 8.1, 8.2, 8.3, 8.5_
  
  - [ ]* 5.4 编写 MainWindow 的集成测试
    - 测试拖拽文件后自动处理被触发
    - 测试自动处理开关禁用时不触发处理
    - 测试进度状态正确更新
    - 测试完成通知正确显示
    - _Requirements: 2.1, 2.4, 8.2, 8.3, 7.1, 7.2_

- [ ] 6. 创建 ProgressPanel 组件
  - [x] 6.1 创建 ProgressPanel 组件基础结构
    - 创建 `src/renderer/components/ProgressPanel.tsx` 文件
    - 创建 `src/renderer/components/ProgressPanel.css` 文件
    - 定义 `ProgressPanelProps` 接口
    - 实现基础组件结构（header + list）
    - _Requirements: 4.1_
  
  - [x] 6.2 实现进度列表渲染
    - 实现进度项列表渲染
    - 根据状态显示不同图标（pending/processing/success/failed）
    - 显示文件名和状态信息
    - 对于成功的图片，显示原始大小、处理后大小和压缩比例
    - 对于失败的图片，显示错误信息
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 6.3 实现进度统计显示
    - 在 header 中显示总进度（已完成/总数）
    - 显示成功和失败数量
    - 根据处理状态动态更新
    - _Requirements: 4.5_
  
  - [ ] 6.4 添加性能优化
    - 使用 `React.memo` 优化组件渲染
    - 实现自定义比较函数避免不必要的重渲染
    - 考虑虚拟滚动（如果图片数量 > 100）
    - _Requirements: 10.2, 10.4_
  
  - [x] 6.5 设计和实现 CSS 样式
    - 设计进度面板布局和样式
    - 实现状态图标和颜色
    - 实现响应式设计
    - 添加动画效果（processing 状态的 spinner）
    - _Requirements: 4.1, 4.2_
  
  - [ ]* 6.6 编写 ProgressPanel 的单元测试
    - 测试空列表不显示
    - 测试进度项正确渲染
    - 测试统计数据正确计算
    - 测试不同状态的图标和样式
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 6.7 编写 ProgressPanel 显示完整性的属性测试
    - **Property 18: ProgressPanel Display Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
    - 验证所有图片都被显示
    - 验证成功图片显示文件大小和压缩比例

- [ ] 7. 集成 ProgressPanel 到 MainWindow
  - [ ] 7.1 在 MainWindow 中导入和使用 ProgressPanel
    - 在 `MainWindow.tsx` 中导入 `ProgressPanel` 组件
    - 传递 `imageProgress` 和 `isProcessing` props
    - 调整布局以容纳进度面板
    - _Requirements: 4.1_
  
  - [ ]* 7.2 编写端到端集成测试
    - 测试完整的拖拽到处理完成流程
    - 验证进度面板正确显示和更新
    - 验证所有中间状态正确
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.5, 7.1_

- [ ] 8. Checkpoint - 验证核心功能
  - 确保所有测试通过，询问用户是否有问题

- [ ] 9. 实现错误处理和安全性
  - [ ] 9.1 添加文件路径验证
    - 在 `FileScanner.ts` 中实现 `validatePath` 函数
    - 检查路径是否包含 ".." 或 "~"
    - 检查是否为绝对路径
    - 在扫描文件前调用验证
    - _Requirements: 11.1_
  
  - [ ] 9.2 添加文件类型验证
    - 安装 `file-type` 库：`npm install file-type`
    - 在 `FileScanner.ts` 中实现 `validateImageFile` 函数
    - 验证文件 MIME 类型
    - 只允许 image/jpeg, image/png, image/webp
    - _Requirements: 11.2_
  
  - [ ] 9.3 添加输出目录安全检查
    - 在 `OutputManager.ts` 中添加目录权限检查
    - 确保输出目录在用户主目录内
    - 检查写入权限
    - _Requirements: 6.2, 11.3_
  
  - [ ] 9.4 添加 IPC 参数验证
    - 在 `preload.ts` 中验证所有 IPC 参数类型
    - 拒绝无效参数并抛出错误
    - _Requirements: 11.4_
  
  - [ ] 9.5 实现错误处理逻辑
    - 实现文件扫描失败的错误处理
    - 实现输出目录创建失败的错误处理
    - 实现 IPC 通信失败的错误处理
    - 确保错误不影响应用状态一致性
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 12.1_
  
  - [ ]* 9.6 编写错误处理的单元测试
    - 测试路径验证拒绝可疑路径
    - 测试文件类型验证拒绝不支持的格式
    - 测试输出目录安全检查
    - 测试 IPC 参数验证
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 9.7 编写错误隔离的属性测试
    - **Property 11: Error Isolation**
    - **Validates: Requirements 5.4, 9.2**
    - 验证单张图片失败不影响其他图片处理
    - 验证失败图片被正确记录

- [ ] 10. 实现设置持久化
  - [ ] 10.1 添加设置存储逻辑
    - 在 `AppContext.tsx` 中实现设置保存到 localStorage
    - 在应用启动时加载设置
    - 持久化 `autoProcessOnDrop` 状态
    - _Requirements: 8.4_
  
  - [ ]* 10.2 编写设置持久化的属性测试
    - **Property 17: Settings Persistence Round-Trip**
    - **Validates: Requirements 8.4**
    - 验证保存后加载的设置与原始设置一致

- [ ] 11. 性能优化和最终调整
  - [ ] 11.1 实现进度更新节流
    - 在 `MainWindow.tsx` 中使用 lodash 的 `throttle` 函数
    - 限制进度更新频率为每 100ms 一次
    - _Requirements: 10.2_
  
  - [ ] 11.2 优化组件渲染性能
    - 使用 `useCallback` 和 `useMemo` 优化 MainWindow
    - 确保 ProgressPanel 使用 `React.memo`
    - _Requirements: 10.4_
  
  - [ ] 11.3 添加性能监控日志
    - 记录批量处理总耗时
    - 记录单张图片平均处理时间
    - 记录内存使用情况（如果可能）
    - _Requirements: 10.1, 10.5_

- [ ] 12. 最终测试和文档
  - [ ]* 12.1 运行完整测试套件
    - 运行所有单元测试
    - 运行所有属性测试
    - 运行所有集成测试
    - 确保测试覆盖率 > 80%
  
  - [ ]* 12.2 手动测试关键场景
    - 测试拖拽单个文件
    - 测试拖拽文件夹
    - 测试拖拽多个文件
    - 测试自动处理开关
    - 测试错误场景（无效文件、权限问题等）
    - 测试大量图片（> 100 张）
  
  - [ ] 12.3 更新文档
    - 更新 README.md 说明新功能
    - 添加使用说明和截图
    - 记录已知限制和未来改进

- [ ] 13. Final Checkpoint - 完成验证
  - 确保所有测试通过，所有功能正常工作，询问用户是否满意

## Notes

- 任务标记 `*` 的为可选测试任务，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号，确保可追溯性
- Checkpoint 任务用于阶段性验证，确保增量开发的质量
- 属性测试验证系统的不变性质，提供更强的正确性保证
- 建议按顺序执行任务，每完成一个任务 commit 一次代码
