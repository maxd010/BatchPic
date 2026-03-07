# Requirements Document

## Introduction

本文档定义 BatchPic 应用的打包发布流程和规范。BatchPic 是一个基于 Electron 的跨平台桌面应用,用于批量处理图片。当前项目已具备基本功能,需要建立完整的打包发布流程,以便发布第一个正式版本并支持后续的持续发布。

## Glossary

- **Build_System**: 构建系统,负责编译 TypeScript 代码和打包资源文件
- **Package_System**: 打包系统,使用 electron-builder 将应用打包为可分发的安装包
- **Release_Manager**: 发布管理器,负责版本管理、变更日志生成和发布流程
- **Version_Number**: 版本号,遵循语义化版本规范 (Semantic Versioning)
- **Distribution_Package**: 分发包,最终用户下载安装的文件 (如 .dmg, .exe, .AppImage)
- **Code_Signing**: 代码签名,用于验证应用来源和完整性的数字签名
- **Auto_Updater**: 自动更新器,检测和安装应用更新的机制
- **Build_Artifact**: 构建产物,构建过程生成的文件 (如编译后的 JS 文件、打包后的安装包)
- **CI_Pipeline**: 持续集成流水线,自动化构建、测试和发布的流程
- **Release_Channel**: 发布渠道,如 stable (稳定版)、beta (测试版)、alpha (内测版)

## Requirements

### Requirement 1: 构建配置

**User Story:** 作为开发者,我希望有完整的构建配置,以便能够正确编译和打包应用的所有组件

#### Acceptance Criteria

1. THE Build_System SHALL 编译主进程 TypeScript 代码到 dist/main 目录
2. THE Build_System SHALL 编译预加载脚本 TypeScript 代码到 dist/preload 目录
3. THE Build_System SHALL 使用 Vite 构建渲染进程代码到 dist/renderer 目录
4. WHEN 构建完成时, THE Build_System SHALL 验证所有必需文件存在
5. THE Build_System SHALL 在构建前清理旧的构建产物
6. WHEN 构建失败时, THE Build_System SHALL 输出清晰的错误信息并返回非零退出码

### Requirement 2: Electron Builder 配置

**User Story:** 作为开发者,我希望配置 electron-builder,以便为不同平台生成正确的安装包

#### Acceptance Criteria

1. THE Package_System SHALL 支持 macOS 平台打包 (DMG 和 ZIP 格式)
2. THE Package_System SHALL 支持 Windows 平台打包 (NSIS 安装器和便携版)
3. THE Package_System SHALL 包含应用图标 (macOS: .icns, Windows: .ico)
4. THE Package_System SHALL 配置应用元数据 (名称、描述、作者、版权信息)
5. THE Package_System SHALL 指定需要打包的文件和需要排除的文件
6. THE Package_System SHALL 配置应用分类和文件关联
7. WHEN 打包 macOS 应用时, THE Package_System SHALL 配置 DMG 窗口样式和背景
8. WHEN 打包 Windows 应用时, THE Package_System SHALL 配置安装器界面和快捷方式
9. THE Package_System SHALL 将构建产物输出到 release 目录

### Requirement 3: 构建脚本

**User Story:** 作为开发者,我希望有便捷的构建脚本,以便快速执行常见的构建和发布任务

#### Acceptance Criteria

1. THE Build_System SHALL 提供 npm run build 脚本用于完整构建
2. THE Build_System SHALL 提供 npm run package 脚本用于打包应用
3. THE Build_System SHALL 提供 npm run package:mac 脚本用于仅打包 macOS 版本
4. THE Build_System SHALL 提供 npm run package:win 脚本用于仅打包 Windows 版本
5. THE Build_System SHALL 提供 npm run release 脚本用于执行完整发布流程
6. WHEN 执行打包脚本时, THE Build_System SHALL 自动执行构建步骤
7. WHEN 脚本执行失败时, THE Build_System SHALL 输出清晰的错误信息

### Requirement 4: 文档

**User Story:** 作为开发者,我希望有完整的打包发布文档,以便理解和执行发布流程

#### Acceptance Criteria

1. THE Release_Manager SHALL 提供打包发布指南文档
2. THE Release_Manager SHALL 在文档中说明版本管理规范
3. THE Release_Manager SHALL 在文档中说明发布流程步骤
4. THE Release_Manager SHALL 在文档中说明如何配置代码签名
5. THE Release_Manager SHALL 在文档中说明如何配置自动更新
6. THE Release_Manager SHALL 在文档中说明常见问题的解决方法
7. THE Release_Manager SHALL 在文档中提供发布检查清单
