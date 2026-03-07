# Implementation Plan: app-packaging-release

## Overview

本任务列表用于实现 BatchPic 应用的打包发布系统。基于 Electron + TypeScript 技术栈,为 macOS 和 Windows 平台建立完整的构建、打包和发布流程。

## Tasks

- [-] 1. 配置构建系统
  - 创建 TypeScript 编译配置文件 (tsconfig.main.json, tsconfig.preload.json)
  - 配置 Vite 构建渲染进程
  - 在 package.json 中添加构建脚本 (clean, build, build:main, build:preload, build:renderer)
  - 实现构建前清理逻辑
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 1.1 编写构建系统单元测试
  - 测试构建脚本是否正确定义
  - 测试构建前清理功能
  - 测试 TypeScript 编译错误处理
  - _Requirements: 1.4, 1.6_

- [x] 1.2 编写构建系统属性测试
  - **Property 1: 构建输出目录正确性**
  - **Validates: Requirements 1.1, 1.2, 1.3**
  - **Property 2: 构建前清理**
  - **Validates: Requirements 1.5**
  - **Property 4: 构建失败错误处理**
  - **Validates: Requirements 1.6**

- [ ] 2. 配置 electron-builder
  - [~] 2.1 创建 electron-builder.json5 配置文件
    - 配置应用元数据 (appId, productName, copyright)
    - 配置目录结构 (output, buildResources)
    - 配置文件包含和排除规则
    - _Requirements: 2.4, 2.5_
  
  - [~] 2.2 配置 macOS 打包选项
    - 配置 DMG 和 ZIP 目标格式
    - 配置应用图标路径 (build/icons/icon.icns)
    - 配置应用分类
    - 配置 DMG 窗口样式
    - _Requirements: 2.1, 2.3, 2.6, 2.7_
  
  - [~] 2.3 配置 Windows 打包选项
    - 配置 NSIS 安装器和便携版
    - 配置应用图标路径 (build/icons/icon.ico)
    - 配置安装器界面和快捷方式
    - _Requirements: 2.2, 2.3, 2.6, 2.8_
  
  - [~] 2.4 准备应用图标资源
    - 创建 build/icons/ 目录
    - 准备 macOS 图标 (icon.icns)
    - 准备 Windows 图标 (icon.ico)
    - _Requirements: 2.3_

- [~] 2.5 编写打包系统单元测试
  - 测试配置文件包含所有必需元数据
  - 测试所有目标平台配置存在
  - 测试图标路径正确性
  - 测试平台特定配置完整性
  - _Requirements: 2.4, 2.6, 2.7, 2.8_

- [~] 2.6 编写打包系统属性测试
  - **Property 5: 跨平台打包支持**
  - **Validates: Requirements 2.1, 2.2**
  - **Property 8: 文件过滤正确性**
  - **Validates: Requirements 2.5**
  - **Property 10: 打包输出目录**
  - **Validates: Requirements 2.9**

- [~] 3. 配置打包脚本
  - 在 package.json 中添加 package 脚本 (打包所有平台)
  - 在 package.json 中添加 package:mac 脚本 (仅打包 macOS)
  - 在 package.json 中添加 package:win 脚本 (仅打包 Windows)
  - 在 package.json 中添加 release 脚本 (完整发布流程)
  - 确保打包脚本自动触发构建
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [~] 3.1 编写脚本系统测试
  - 测试所有打包脚本正确定义
  - 测试脚本失败时的错误处理
  - _Requirements: 3.7_

- [~] 3.2 编写脚本系统属性测试
  - **Property 11: 打包前自动构建**
  - **Validates: Requirements 3.6**
  - **Property 12: 脚本失败错误处理**
  - **Validates: Requirements 3.7**

- [~] 4. Checkpoint - 验证构建和打包流程
  - 执行完整构建,确保所有文件正确输出到 dist/ 目录
  - 执行 macOS 打包,验证 DMG 和 ZIP 文件生成
  - 执行 Windows 打包,验证 NSIS 安装器和便携版生成
  - 确保所有测试通过,询问用户是否有问题

- [ ] 5. 创建打包发布文档
  - [~] 5.1 创建 docs/PACKAGING_GUIDE.md 文档
    - 编写文档概述和目录结构
    - _Requirements: 4.1_
  
  - [~] 5.2 编写版本管理规范章节
    - 说明语义化版本规范
    - 说明版本号更新流程
    - _Requirements: 4.2_
  
  - [~] 5.3 编写发布流程步骤章节
    - 说明完整的发布流程
    - 提供发布检查清单
    - _Requirements: 4.3, 4.7_
  
  - [~] 5.4 编写代码签名配置章节
    - 说明 macOS 代码签名配置
    - 说明 Windows 代码签名配置
    - _Requirements: 4.4_
  
  - [~] 5.5 编写自动更新配置章节
    - 说明自动更新机制
    - 提供配置示例
    - _Requirements: 4.5_
  
  - [~] 5.6 编写常见问题解决章节
    - 列出常见构建错误及解决方法
    - 列出常见打包错误及解决方法
    - _Requirements: 4.6_

- [~] 5.7 编写文档测试
  - 测试文档文件存在
  - 测试文档包含所有必需章节
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [~] 6. Final Checkpoint - 完整验证
  - 运行所有测试,确保测试通过
  - 在 macOS 上执行完整打包流程,验证安装包可用
  - 在 Windows 上执行完整打包流程,验证安装包可用
  - 验证文档完整性和准确性
  - 询问用户是否有问题或需要调整

## Notes

- 任务标记 `*` 为可选任务,可跳过以加快 MVP 交付
- 每个任务都引用了具体的需求编号,确保可追溯性
- Checkpoint 任务用于阶段性验证,确保增量进展
- 属性测试验证通用正确性属性,单元测试验证具体示例和边界情况
- 本项目仅支持 macOS 和 Windows 平台,已移除 Linux 支持
