# BatchPic 项目结构

> 最后更新：2026-03-07

## 目录树

```
BatchPic/
├── .git/                   # Git 版本控制
├── .kiro/                  # Kiro AI 配置
│   ├── specs/              # 功能规格文档
│   └── steering/           # AI 协作规则
├── build/                  # 构建资源
│   └── icons/              # 应用图标
├── dist/                   # 构建输出（.gitignore）
│   ├── main/               # 主进程构建产物
│   ├── preload/            # Preload 脚本构建产物
│   └── renderer/           # 渲染进程构建产物
├── docs/                   # 📚 项目文档
│   ├── development/        # 开发文档
│   │   ├── SETUP.md
│   │   └── AUTO_PROCESS_GUIDE.md
│   ├── testing/            # 测试文档
│   │   ├── QUICK_TEST.md
│   │   └── TROUBLESHOOTING.md
│   ├── deployment/         # 部署文档
│   │   └── PACKAGING_GUIDE.md
│   ├── design/             # 设计文档（预留）
│   ├── 业务文档/           # 业务驱动文档
│   │   └── BatchPic/
│   │       ├── 技术债.md
│   │       ├── 性能监控实现.md
│   │       ├── 性能优化总结.md
│   │       └── 目录结构整理总结.md
│   ├── 知识沉淀/           # 知识驱动文档
│   │   └── Node.js ES模块迁移指南.md
│   └── README.md           # 文档索引
├── node_modules/           # 依赖包（.gitignore）
├── release/                # 发布产物（.gitignore）
├── src/                    # 📦 源代码
│   ├── __tests__/          # 系统级集成测试
│   │   ├── build-system.test.ts
│   │   ├── build-system.property.test.ts
│   │   ├── package-system.test.ts
│   │   ├── package-system.property.test.ts
│   │   ├── script-system.test.ts
│   │   ├── script-system.property.test.ts
│   │   └── documentation.test.ts
│   ├── main/               # Electron 主进程
│   │   ├── __tests__/      # 主进程单元测试
│   │   │   ├── FileScanner.test.ts
│   │   │   ├── ImageProcessor.test.ts
│   │   │   ├── OutputManager.test.ts
│   │   │   ├── preload.test.ts
│   │   │   ├── setup.test.ts
│   │   │   └── TemplateManager.test.ts
│   │   ├── FileScanner.ts
│   │   ├── ImageProcessor.ts
│   │   ├── OutputManager.ts
│   │   ├── TemplateManager.ts
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   └── types.ts
│   ├── renderer/           # React 渲染进程
│   │   ├── components/     # React 组件
│   │   │   ├── __tests__/  # 组件测试
│   │   │   │   ├── DropZone.test.tsx
│   │   │   │   ├── ErrorReportDialog.test.tsx
│   │   │   │   ├── MainWindow.test.tsx
│   │   │   │   ├── NotificationContainer.test.tsx
│   │   │   │   ├── ParameterPanel.test.tsx
│   │   │   │   ├── PreviewPanel.test.tsx
│   │   │   │   └── TemplateSelector.test.tsx
│   │   │   ├── DropZone.tsx / .css
│   │   │   ├── ErrorReportDialog.tsx / .css
│   │   │   ├── FullScreenPreview.tsx / .css
│   │   │   ├── Icons.tsx
│   │   │   ├── MainWindow.tsx / .css
│   │   │   ├── NotificationContainer.tsx / .css
│   │   │   ├── ParameterPanel.tsx / .css
│   │   │   ├── PreviewPanel.tsx / .css
│   │   │   ├── ProgressPanel.tsx / .css
│   │   │   └── TemplateSelector.tsx / .css
│   │   ├── context/        # React Context
│   │   │   ├── __tests__/  # Context 测试
│   │   │   │   └── AppContext.test.tsx
│   │   │   └── AppContext.tsx
│   │   ├── hooks/          # 自定义 Hooks
│   │   │   └── useDebounce.ts
│   │   ├── types/          # TypeScript 类型定义
│   │   │   └── electron.d.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── setupTests.ts       # Jest 测试配置
├── .gitignore              # Git 忽略规则
├── electron-builder.json5  # Electron Builder 配置
├── index.html              # 应用入口 HTML
├── jest.config.js          # Jest 测试配置
├── package.json            # 项目配置
├── package-lock.json       # 依赖锁定文件
├── readme.md               # 项目说明
├── REFACTOR_PLAN.md        # 重构计划
├── PROJECT_STRUCTURE.md    # 本文档
├── tsconfig.json           # TypeScript 配置（渲染进程）
├── tsconfig.main.json      # TypeScript 配置（主进程）
├── tsconfig.preload.json   # TypeScript 配置（Preload）
└── vite.config.ts          # Vite 构建配置
```

## 目录说明

### 源代码组织 (`src/`)

#### 测试文件组织原则

1. **系统级测试** (`src/__tests__/`)
   - 跨模块的集成测试
   - 构建系统测试
   - 包管理系统测试
   - 文档完整性测试

2. **模块级测试** (`src/*/__tests__/`)
   - 每个模块的单元测试放在该模块的 `__tests__/` 子目录
   - 测试文件与源代码就近放置，便于维护
   - 命名规则：`[SourceFileName].test.[ts|tsx]`

#### 主进程 (`src/main/`)

负责 Electron 主进程逻辑：

- `main.ts` - 应用入口，窗口管理
- `preload.ts` - Preload 脚本，桥接主进程和渲染进程
- `FileScanner.ts` - 文件扫描功能
- `ImageProcessor.ts` - 图片处理核心逻辑
- `OutputManager.ts` - 输出文件管理
- `TemplateManager.ts` - 处理模板管理
- `types.ts` - 主进程类型定义

#### 渲染进程 (`src/renderer/`)

负责 React UI 渲染：

- `components/` - React 组件
  - 每个组件包含 `.tsx` 和 `.css` 文件
  - 组件测试放在 `__tests__/` 子目录
- `context/` - React Context（全局状态管理）
- `hooks/` - 自定义 React Hooks
- `types/` - 渲染进程类型定义
- `App.tsx` - 根组件
- `main.tsx` - React 应用入口
- `index.css` - 全局样式

### 文档组织 (`docs/`)

#### 文档分类

1. **开发文档** (`development/`)
   - 环境配置、开发指南、功能说明

2. **测试文档** (`testing/`)
   - 测试指南、故障排除

3. **部署文档** (`deployment/`)
   - 打包、发布、部署流程

4. **设计文档** (`design/`)
   - UI/UX 设计、架构设计（预留）

5. **业务文档** (`业务文档/`)
   - 项目特定的业务文档
   - 技术债务跟踪
   - 性能优化记录

6. **知识沉淀** (`知识沉淀/`)
   - 通用技术知识
   - 可复用的经验总结

#### 文档命名规范

- 使用中文命名，提高可读性
- 专有技术名词保留英文（如 Node.js、Git、API）
- 避免缩写，使用完整词汇
- 文件名应直观表达内容

### 配置文件

#### TypeScript 配置

- `tsconfig.json` - 渲染进程 TypeScript 配置
- `tsconfig.main.json` - 主进程 TypeScript 配置
- `tsconfig.preload.json` - Preload 脚本 TypeScript 配置

#### 构建配置

- `vite.config.ts` - Vite 构建配置（渲染进程）
- `electron-builder.json5` - Electron 打包配置

#### 测试配置

- `jest.config.js` - Jest 测试框架配置
- `src/setupTests.ts` - Jest 测试环境设置

## 模块依赖关系

```
┌─────────────────────────────────────────┐
│           Electron 主进程                │
│  ┌─────────────────────────────────┐   │
│  │ main.ts (窗口管理、IPC 通信)     │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │ preload.ts (API 桥接)            │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │ 业务模块                         │   │
│  │ - FileScanner                    │   │
│  │ - ImageProcessor                 │   │
│  │ - OutputManager                  │   │
│  │ - TemplateManager                │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                  ↕ IPC
┌─────────────────────────────────────────┐
│          React 渲染进程                  │
│  ┌─────────────────────────────────┐   │
│  │ App.tsx (根组件)                 │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │ AppContext (全局状态)            │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │ UI 组件                          │   │
│  │ - MainWindow                     │   │
│  │ - DropZone                       │   │
│  │ - ParameterPanel                 │   │
│  │ - ProgressPanel                  │   │
│  │ - PreviewPanel                   │   │
│  │ - TemplateSelector               │   │
│  │ - NotificationContainer          │   │
│  │ - ErrorReportDialog              │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 开发工作流

### 添加新功能

1. **主进程功能**
   ```
   src/main/NewFeature.ts
   src/main/__tests__/NewFeature.test.ts
   ```

2. **渲染进程组件**
   ```
   src/renderer/components/NewComponent.tsx
   src/renderer/components/NewComponent.css
   src/renderer/components/__tests__/NewComponent.test.tsx
   ```

3. **文档**
   ```
   docs/development/NEW_FEATURE_GUIDE.md
   ```

### 测试策略

1. **单元测试** - 测试单个函数/组件
   - 位置：`src/*/__tests__/`
   - 运行：`npm test`

2. **集成测试** - 测试模块间交互
   - 位置：`src/__tests__/`
   - 运行：`npm test`

3. **端到端测试** - 测试完整用户流程
   - 未来规划

## 最佳实践

### 文件组织

1. ✅ 测试文件与源代码就近放置
2. ✅ 每个组件包含 `.tsx` 和 `.css` 文件
3. ✅ 类型定义集中在 `types/` 目录
4. ✅ 工具函数放在 `utils/` 目录（未来规划）

### 命名规范

1. **组件** - PascalCase (`MainWindow.tsx`)
2. **工具函数** - camelCase (`formatDate.ts`)
3. **常量** - UPPER_SNAKE_CASE (`API_BASE_URL.ts`)
4. **测试文件** - `[SourceFileName].test.[ts|tsx]`

### 导入顺序

```typescript
// 1. 外部依赖
import React from 'react'
import { useState } from 'react'

// 2. 内部模块（绝对路径）
import { Button } from '@/components/Button'

// 3. 相对路径导入
import { helper } from './utils/helper.js'
import styles from './styles.module.css'

// 4. 类型导入
import type { User } from './types.js'
```

## 维护指南

### 定期检查

- [ ] 每月检查依赖更新
- [ ] 每季度审查目录结构
- [ ] 每半年清理技术债

### 文档更新

- [ ] 新功能必须更新文档
- [ ] 重构后更新架构文档
- [ ] 定期同步 README

### 技术债管理

- 记录在 `docs/业务文档/BatchPic/技术债.md`
- 定期评估优先级
- 计划清理时间

## 相关文档

- [项目说明](readme.md)
- [重构计划](REFACTOR_PLAN.md)
- [目录结构整理总结](docs/业务文档/BatchPic/目录结构整理总结.md)
- [开发环境配置](docs/development/SETUP.md)
- [测试指南](docs/testing/QUICK_TEST.md)
