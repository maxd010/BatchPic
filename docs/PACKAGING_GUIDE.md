# BatchPic 打包发布指南

## 概述

本文档提供 BatchPic 应用的完整打包发布流程指南。BatchPic 是一个基于 Electron 的跨平台桌面应用,支持 macOS 和 Windows 平台。

### 目标读者

- 开发者:需要构建和打包应用
- 发布管理员:负责版本发布和分发
- 维护者:需要理解构建流程

### 技术栈

- **构建工具**: TypeScript Compiler (tsc) + Vite
- **打包工具**: electron-builder
- **包管理**: npm (ES Modules)
- **目标平台**: macOS (DMG/ZIP)、Windows (NSIS/Portable)

### 文档结构

本文档包含以下章节:

1. **版本管理规范** - 语义化版本和版本号管理
2. **发布流程** - 完整的发布步骤和检查清单
3. **代码签名配置** - macOS 和 Windows 代码签名设置
4. **自动更新配置** - 应用自动更新机制
5. **常见问题** - 构建和打包问题排查
6. **附录** - 配置文件参考和工具链说明

---

## 目录

- [1. 版本管理规范](#1-版本管理规范)
- [2. 发布流程](#2-发布流程)
- [3. 代码签名配置](#3-代码签名配置)
- [4. 自动更新配置](#4-自动更新配置)
- [5. 常见问题](#5-常见问题)
- [6. 附录](#6-附录)

---

## 快速开始

### 前置要求

- Node.js 18+ 
- npm 9+
- macOS (用于打包 macOS 版本)
- Windows (用于打包 Windows 版本)

### 基本命令

```bash
# 完整构建
npm run build

# 打包所有平台
npm run package

# 打包仅 macOS 版本
npm run package:mac

# 打包仅 Windows 版本
npm run package:win

# 完整发布流程
npm run release
```

---

## 1. 版本管理规范

### 1.1 语义化版本 (Semantic Versioning)

BatchPic 遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/) 规范:

**版本格式**: `MAJOR.MINOR.PATCH`

- **MAJOR (主版本号)**: 不兼容的 API 修改
- **MINOR (次版本号)**: 向下兼容的功能性新增
- **PATCH (修订号)**: 向下兼容的问题修正

**示例**:
- `1.0.0` - 首个正式版本
- `1.1.0` - 新增功能,向下兼容
- `1.1.1` - Bug 修复
- `2.0.0` - 重大更新,可能不兼容

### 1.2 版本号更新流程

#### 步骤 1: 确定版本类型

根据变更内容确定版本号增量:

| 变更类型 | 版本增量 | 示例 |
|---------|---------|------|
| Bug 修复 | PATCH | 1.0.0 → 1.0.1 |
| 新增功能 | MINOR | 1.0.1 → 1.1.0 |
| 破坏性变更 | MAJOR | 1.1.0 → 2.0.0 |

#### 步骤 2: 更新 package.json

```bash
# 使用 npm version 命令自动更新版本号
npm version patch   # 修订号 +1
npm version minor   # 次版本号 +1
npm version major   # 主版本号 +1
```


**注意**: `npm version` 命令会:
1. 更新 `package.json` 中的版本号
2. 创建 Git commit
3. 创建 Git tag

#### 步骤 3: 更新变更日志

在 `CHANGELOG.md` 中记录本次版本的变更:

```markdown
## [1.1.0] - 2024-03-15

### 新增
- 批量图片压缩功能
- 支持 WebP 格式输出

### 修复
- 修复大文件处理内存溢出问题

### 变更
- 优化图片处理性能
```

### 1.3 预发布版本

用于测试和内部验证的版本:

```bash
# Alpha 版本 (内测)
npm version prerelease --preid=alpha
# 输出: 1.1.0-alpha.0

# Beta 版本 (公测)
npm version prerelease --preid=beta
# 输出: 1.1.0-beta.0

# RC 版本 (候选发布)
npm version prerelease --preid=rc
# 输出: 1.1.0-rc.0
```

---

## 2. 发布流程

### 2.1 完整发布步骤

#### 步骤 1: 准备发布

```bash
# 1. 确保工作区干净
git status

# 2. 拉取最新代码
git pull origin main

# 3. 安装依赖
npm install

# 4. 运行测试
npm test
```


#### 步骤 2: 更新版本号

```bash
# 根据变更类型选择合适的命令
npm version patch   # 或 minor / major
```

#### 步骤 3: 构建应用

```bash
# 完整构建
npm run build
```

**构建产物验证**:
- `dist/main/` - 主进程编译文件
- `dist/preload/` - 预加载脚本编译文件
- `dist/renderer/` - 渲染进程构建文件

#### 步骤 4: 打包应用

```bash
# 打包所有平台 (需要在对应平台上执行)
npm run package

# 或分别打包
npm run package:mac   # 在 macOS 上执行
npm run package:win   # 在 Windows 上执行
```

**打包产物验证**:
- `release/mac/*.dmg` - macOS DMG 镜像
- `release/mac/*.zip` - macOS ZIP 压缩包
- `release/win/*.exe` - Windows NSIS 安装器
- `release/win/*-portable.exe` - Windows 便携版

#### 步骤 5: 测试安装包

**macOS 测试**:
1. 挂载 DMG 文件
2. 拖拽应用到 Applications 文件夹
3. 启动应用,验证核心功能
4. 检查应用签名状态 (如果已配置)

**Windows 测试**:
1. 运行 NSIS 安装器
2. 完成安装流程
3. 启动应用,验证核心功能
4. 测试便携版是否可以直接运行


#### 步骤 6: 发布到 GitHub

```bash
# 推送代码和标签
git push origin main
git push origin --tags

# 创建 GitHub Release
# 1. 访问 GitHub 仓库的 Releases 页面
# 2. 点击 "Draft a new release"
# 3. 选择刚创建的版本标签
# 4. 填写 Release 标题和说明
# 5. 上传打包产物 (DMG, ZIP, EXE)
# 6. 发布 Release
```

### 2.2 发布检查清单

在发布前，使用此清单确保一切就绪:

#### 代码质量
- [ ] 所有测试通过 (`npm test`)
- [ ] 代码已通过 lint 检查
- [ ] 无 console.log 或调试代码残留
- [ ] 无已知的严重 bug

#### 版本管理
- [ ] 版本号已正确更新
- [ ] CHANGELOG.md 已更新
- [ ] Git 工作区干净 (无未提交的更改)
- [ ] 已创建版本标签

#### 构建验证
- [ ] 构建成功完成
- [ ] 所有必需文件存在于 dist/ 目录
- [ ] 无构建警告或错误

#### 打包验证
- [ ] macOS DMG 和 ZIP 文件已生成
- [ ] Windows NSIS 安装器和便携版已生成
- [ ] 安装包文件大小合理
- [ ] 安装包可以正常安装

#### 功能测试
- [ ] 应用可以正常启动
- [ ] 核心功能正常工作
- [ ] UI 显示正确
- [ ] 无明显性能问题

#### 文档
- [ ] README.md 已更新
- [ ] 用户文档已更新
- [ ] Release Notes 已准备

---

## 3. 代码签名配置

代码签名用于验证应用来源和完整性，提升用户信任度。


### 3.1 macOS 代码签名

#### 前置要求

1. **Apple Developer 账号** (99 USD/年)
2. **Developer ID Application 证书**
3. **开发环境**: macOS 系统

#### 获取证书

```bash
# 1. 登录 Apple Developer 网站
# 2. 进入 Certificates, Identifiers & Profiles
# 3. 创建 Developer ID Application 证书
# 4. 下载并安装证书到 Keychain
```

#### 配置签名

在 `electron-builder.json5` 中添加:

```json5
{
  mac: {
    identity: "Developer ID Application: Your Name (TEAM_ID)",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist"
  }
}
```

#### 创建 Entitlements 文件

`build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
</dict>
</plist>
```

#### 公证 (Notarization)

macOS 10.15+ 需要公证才能正常运行:

```bash
# 配置环境变量
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# electron-builder 会自动处理公证
npm run package:mac
```


### 3.2 Windows 代码签名

#### 前置要求

1. **代码签名证书** (从 DigiCert、Sectigo 等 CA 购买)
2. **证书文件** (.pfx 或 .p12 格式)
3. **证书密码**

#### 配置签名

在 `electron-builder.json5` 中添加:

```json5
{
  win: {
    certificateFile: "path/to/certificate.pfx",
    certificatePassword: process.env.WINDOWS_CERT_PASSWORD,
    signingHashAlgorithms: ["sha256"],
    rfc3161TimeStampServer: "http://timestamp.digicert.com"
  }
}
```

#### 使用环境变量

```bash
# 设置证书密码 (不要提交到代码库)
export WINDOWS_CERT_PASSWORD="your-certificate-password"

# 执行打包
npm run package:win
```

#### 安全建议

- ⚠️ **不要将证书文件提交到 Git**
- ⚠️ **不要在代码中硬编码密码**
- ✅ 使用环境变量或密钥管理服务
- ✅ 在 CI/CD 中使用加密的 secrets

---

## 4. 自动更新配置

自动更新让用户无需手动下载即可获取最新版本。

### 4.1 更新机制概述

Electron 使用 `electron-updater` 实现自动更新:

1. 应用启动时检查更新
2. 发现新版本时下载更新包
3. 提示用户安装更新
4. 重启应用完成更新

### 4.2 配置更新服务器

#### 选项 1: GitHub Releases (推荐)

最简单的方式，无需额外服务器:

```json5
{
  publish: {
    provider: "github",
    owner: "your-username",
    repo: "batchpic"
  }
}
```


#### 选项 2: 自定义服务器

```json5
{
  publish: {
    provider: "generic",
    url: "https://your-server.com/releases"
  }
}
```

### 4.3 实现自动更新

在主进程中添加更新逻辑:

```typescript
// src/main/updater.ts
import { autoUpdater } from 'electron-updater'
import { app, dialog } from 'electron'

export function setupAutoUpdater() {
  // 配置更新检查
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  
  // 检查更新
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${info.version}，是否下载？`,
      buttons: ['下载', '稍后']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })
  
  // 下载完成
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '更新已下载',
      message: '更新已下载完成，重启应用以安装',
      buttons: ['立即重启', '稍后']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })
  
  // 应用启动后检查更新
  app.whenReady().then(() => {
    autoUpdater.checkForUpdates()
  })
}
```

在主进程入口调用:

```typescript
// src/main/main.ts
import { setupAutoUpdater } from './updater.js'

app.whenReady().then(() => {
  setupAutoUpdater()
  // ... 其他初始化代码
})
```


### 4.4 发布更新

```bash
# 1. 更新版本号
npm version patch

# 2. 构建和打包
npm run package

# 3. 发布到 GitHub Releases
# - 上传所有平台的安装包
# - electron-updater 会自动读取 latest.yml/latest-mac.yml
```

### 4.5 测试自动更新

1. 发布一个测试版本 (如 1.0.0)
2. 安装并运行应用
3. 发布新版本 (如 1.0.1)
4. 重启应用，验证更新提示
5. 确认更新下载和安装流程

---

## 5. 常见问题

### 5.1 构建问题

#### 问题: TypeScript 编译错误

**症状**: 构建失败，提示类型错误

**解决方法**:
```bash
# 1. 检查 TypeScript 版本
npm list typescript

# 2. 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 3. 检查 tsconfig 配置
# 确保 include/exclude 路径正确
```

#### 问题: Vite 构建失败

**症状**: 渲染进程构建失败

**解决方法**:
```bash
# 1. 清理 Vite 缓存
rm -rf node_modules/.vite

# 2. 检查 vite.config.ts
# 确保 base 路径正确

# 3. 验证依赖版本兼容性
npm outdated
```

#### 问题: 构建产物缺失

**症状**: dist/ 目录中缺少文件

**解决方法**:
```bash
# 1. 检查构建脚本执行顺序
npm run build -- --verbose

# 2. 验证 tsconfig 的 outDir 配置
# 3. 检查文件是否被 .gitignore 排除
```


### 5.2 打包问题

#### 问题: electron-builder 找不到图标

**症状**: 打包失败，提示图标文件不存在

**解决方法**:
```bash
# 1. 验证图标文件存在
ls -la build/icons/

# 2. 检查 electron-builder.json5 中的路径
# 确保路径相对于项目根目录

# 3. 验证图标格式
# macOS: .icns (512x512)
# Windows: .ico (256x256)
```

#### 问题: macOS 打包后无法打开

**症状**: 双击应用提示"已损坏"

**解决方法**:
```bash
# 临时解决 (开发阶段)
xattr -cr /Applications/BatchPic.app

# 长期解决: 配置代码签名和公证
# 参考第 3 章节
```

#### 问题: Windows 安装器被杀毒软件拦截

**症状**: 安装时提示病毒或恶意软件

**解决方法**:
- ✅ 配置代码签名 (参考 3.2 节)
- ✅ 向杀毒软件厂商提交误报申诉
- ✅ 提供 ZIP 便携版作为备选

#### 问题: 打包体积过大

**症状**: 安装包超过 100MB

**解决方法**:
```json5
// electron-builder.json5
{
  files: [
    "dist/**/*",
    "!dist/**/*.map",  // 排除 source map
    "!dist/**/*.ts"    // 排除 TypeScript 源文件
  ],
  asarUnpack: [
    // 仅解包必需的文件
  ]
}
```

### 5.3 运行时问题

#### 问题: 应用启动白屏

**症状**: 应用启动后显示空白页面

**解决方法**:
```typescript
// 检查主进程加载路径
if (app.isPackaged) {
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
} else {
  mainWindow.loadURL('http://localhost:5173')
}
```


#### 问题: 自动更新不工作

**症状**: 应用无法检测到新版本

**解决方法**:
```bash
# 1. 验证 publish 配置
# 2. 检查 GitHub Release 是否包含 latest.yml
# 3. 确保版本号正确递增
# 4. 查看控制台日志

# 开启调试日志
autoUpdater.logger = require('electron-log')
autoUpdater.logger.transports.file.level = 'debug'
```

#### 问题: 文件路径错误

**症状**: 无法读取资源文件

**解决方法**:
```typescript
// 使用正确的路径解析
import { app } from 'electron'
import path from 'path'

// 开发环境
const resourcePath = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets')
```

---

## 6. 附录

### 6.1 配置文件参考

#### package.json 关键配置

```json
{
  "name": "batchpic",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/main/main.js",
  "scripts": {
    "clean": "rimraf dist release",
    "build": "npm run clean && npm run build:main && npm run build:preload && npm run build:renderer",
    "build:main": "tsc -p tsconfig.main.json",
    "build:preload": "tsc -p tsconfig.preload.json",
    "build:renderer": "vite build",
    "package": "npm run build && electron-builder",
    "package:mac": "npm run build && electron-builder --mac",
    "package:win": "npm run build && electron-builder --win",
    "release": "npm run package"
  }
}
```


#### electron-builder.json5 完整示例

```json5
{
  appId: "com.example.batchpic",
  productName: "BatchPic",
  copyright: "Copyright © 2024 Your Name",
  
  directories: {
    output: "release",
    buildResources: "build"
  },
  
  files: [
    "dist/**/*",
    "package.json"
  ],
  
  mac: {
    target: ["dmg", "zip"],
    icon: "build/icons/icon.icns",
    category: "public.app-category.graphics-design",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    dmg: {
      window: {
        width: 540,
        height: 380
      },
      contents: [
        {
          x: 140,
          y: 180,
          type: "file"
        },
        {
          x: 400,
          y: 180,
          type: "link",
          path: "/Applications"
        }
      ]
    }
  },
  
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      },
      {
        target: "portable",
        arch: ["x64"]
      }
    ],
    icon: "build/icons/icon.ico",
    artifactName: "${productName}-${version}-${arch}.${ext}",
    nsis: {
      oneClick: false,
      perMachine: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true
    }
  }
}
```

### 6.2 工具链说明

#### TypeScript Compiler (tsc)

- **用途**: 编译主进程和预加载脚本
- **配置**: tsconfig.main.json, tsconfig.preload.json
- **输出**: JavaScript + 类型声明文件

#### Vite

- **用途**: 构建渲染进程
- **配置**: vite.config.ts
- **特点**: 快速 HMR、ES Modules 原生支持


#### electron-builder

- **用途**: 打包 Electron 应用
- **配置**: electron-builder.json5
- **支持平台**: macOS, Windows, Linux
- **输出格式**: DMG, ZIP, NSIS, Portable, AppImage, etc.

### 6.3 目录结构说明

```
BatchPic/
├── src/                          # 源代码
│   ├── main/                     # 主进程 (Node.js)
│   │   ├── main.ts              # 主进程入口
│   │   └── updater.ts           # 自动更新逻辑
│   ├── preload/                  # 预加载脚本 (桥接层)
│   │   └── preload.ts           # 预加载脚本入口
│   └── renderer/                 # 渲染进程 (Web)
│       ├── index.html           # HTML 入口
│       └── main.ts              # 渲染进程入口
├── dist/                         # 构建产物 (临时)
│   ├── main/                     # 编译后的主进程
│   ├── preload/                  # 编译后的预加载脚本
│   └── renderer/                 # 构建后的渲染进程
├── release/                      # 打包产物 (最终分发)
│   ├── mac/                      # macOS 安装包
│   │   ├── *.dmg                # DMG 镜像
│   │   └── *.zip                # ZIP 压缩包
│   └── win/                      # Windows 安装包
│       ├── *.exe                # NSIS 安装器
│       └── *-portable.exe       # 便携版
├── build/                        # 打包资源
│   └── icons/                    # 应用图标
│       ├── icon.icns            # macOS 图标
│       └── icon.ico             # Windows 图标
├── package.json                  # 项目配置
├── electron-builder.json5        # 打包配置
├── tsconfig.main.json           # 主进程 TS 配置
├── tsconfig.preload.json        # 预加载脚本 TS 配置
└── vite.config.ts               # Vite 配置
```

### 6.4 相关资源

#### 官方文档

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-builder 文档](https://www.electron.build/)
- [electron-updater 文档](https://www.electron.build/auto-update)
- [Vite 官方文档](https://vitejs.dev/)


#### 社区资源

- [Electron Forge](https://www.electronforge.io/) - 另一个打包工具
- [electron-vite](https://electron-vite.org/) - Vite 集成方案
- [Awesome Electron](https://github.com/sindresorhus/awesome-electron) - 资源列表

#### 代码签名资源

- [Apple Developer](https://developer.apple.com/) - macOS 签名和公证
- [DigiCert](https://www.digicert.com/) - Windows 代码签名证书
- [Sectigo](https://sectigo.com/) - Windows 代码签名证书

### 6.5 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| 1.0.0 | 2024-03-15 | 初始版本 |

---

## 总结

本文档涵盖了 BatchPic 应用的完整打包发布流程，包括:

1. **版本管理** - 遵循语义化版本规范
2. **发布流程** - 从构建到发布的完整步骤
3. **代码签名** - macOS 和 Windows 平台的签名配置
4. **自动更新** - 实现应用自动更新机制
5. **问题排查** - 常见问题的解决方法

### 快速参考

```bash
# 开发构建
npm run build

# 打包 macOS
npm run package:mac

# 打包 Windows
npm run package:win

# 完整发布
npm version patch
npm run release
git push origin main --tags
```

### 获取帮助

如遇到问题:
1. 查看本文档的"常见问题"章节
2. 检查官方文档
3. 在项目 Issues 中搜索类似问题
4. 提交新的 Issue 并附上详细信息

---

**文档版本**: 1.0.0  
**最后更新**: 2024-03-15  
**维护者**: BatchPic 开发团队
