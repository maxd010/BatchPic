# Design Document: app-packaging-release

## Overview

本设计文档定义 BatchPic 应用的打包发布系统架构。BatchPic 是一个基于 Electron 的跨平台桌面应用,当前已具备核心功能,需要建立完整的打包发布流程以支持正式版本发布。

### 设计目标

1. **跨平台支持**: 为 macOS、Windows、Linux 三大平台生成原生安装包
2. **自动化构建**: 提供一键式构建和打包流程,减少人工操作
3. **可维护性**: 清晰的配置结构,易于理解和修改
4. **可扩展性**: 为未来的代码签名、自动更新等功能预留接口

### 技术栈

- **构建工具**: TypeScript Compiler (tsc) + Vite
- **打包工具**: electron-builder
- **包管理**: npm (已使用 ES Modules)
- **目标平台**: macOS (DMG/ZIP)、Windows (NSIS/Portable)

## Architecture

### 系统架构

打包发布系统采用三层架构:

```
┌─────────────────────────────────────────────────────────┐
│                    构建脚本层 (npm scripts)                │
│  - build: 完整构建                                         │
│  - package: 打包所有平台                                   │
│  - package:mac/win: 平台特定打包                           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    构建系统层 (Build System)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 主进程编译    │  │ 预加载脚本    │  │ 渲染进程构建  │  │
│  │ (tsc)        │  │ (tsc)        │  │ (Vite)       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                 ↓                 ↓            │
│  dist/main/        dist/preload/      dist/renderer/    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 打包系统层 (electron-builder)              │
│  ┌──────────────────────────┐  ┌──────────────────────┐ │
│  │      macOS 打包           │  │    Windows 打包       │ │
│  │      DMG + ZIP            │  │    NSIS + 便携版      │ │
│  └──────────────────────────┘  └──────────────────────┘ │
│                    ↓                      ↓              │
│              release/ (分发包输出目录)                     │
└─────────────────────────────────────────────────────────┘
```

### 构建流程

1. **清理阶段**: 删除旧的 dist/ 目录
2. **编译阶段**: 
   - 主进程: `tsc -p tsconfig.main.json` → dist/main/
   - 预加载: `tsc -p tsconfig.preload.json` → dist/preload/
   - 渲染进程: `vite build` → dist/renderer/
3. **验证阶段**: 检查必需文件是否存在
4. **打包阶段**: electron-builder 读取配置,生成平台特定安装包
5. **输出阶段**: 安装包输出到 release/ 目录

### 目录结构

```
BatchPic/
├── src/                          # 源代码
│   ├── main/                     # 主进程代码
│   ├── preload/                  # 预加载脚本
│   └── renderer/                 # 渲染进程代码
├── dist/                         # 构建产物 (临时)
│   ├── main/                     # 编译后的主进程
│   ├── preload/                  # 编译后的预加载脚本
│   └── renderer/                 # 构建后的渲染进程
├── release/                      # 打包产物 (最终分发包)
│   ├── mac/                      # macOS 安装包
│   └── win/                      # Windows 安装包
├── build/                        # 打包资源
│   ├── icons/                    # 应用图标
│   │   ├── icon.icns            # macOS 图标
│   │   └── icon.ico             # Windows 图标
│   └── background.png           # DMG 背景图 (可选)
├── package.json                  # 项目配置和脚本
├── electron-builder.json5        # electron-builder 配置
├── tsconfig.main.json           # 主进程 TS 配置
├── tsconfig.preload.json        # 预加载脚本 TS 配置
└── vite.config.ts               # Vite 配置
```

## Components and Interfaces

### 1. 构建系统 (Build System)

#### 职责
- 编译 TypeScript 代码为 JavaScript
- 构建渲染进程资源 (HTML/CSS/JS)
- 验证构建产物完整性

#### 接口

**输入**:
- `src/main/**/*.ts` - 主进程源代码
- `src/preload/**/*.ts` - 预加载脚本源代码
- `src/renderer/**/*` - 渲染进程源代码
- `tsconfig.*.json` - TypeScript 配置
- `vite.config.ts` - Vite 配置

**输出**:
- `dist/main/**/*.js` - 编译后的主进程代码
- `dist/preload/**/*.js` - 编译后的预加载脚本
- `dist/renderer/**/*` - 构建后的渲染进程资源

**错误处理**:
- TypeScript 编译错误 → 输出错误信息,返回非零退出码
- Vite 构建错误 → 输出错误信息,返回非零退出码
- 文件缺失 → 输出缺失文件列表,返回非零退出码

### 2. 打包系统 (Package System)

#### 职责
- 读取 electron-builder 配置
- 为目标平台生成安装包
- 处理平台特定的打包需求 (图标、签名、安装器配置等)

#### 接口

**输入**:
- `dist/**/*` - 构建产物
- `build/icons/*` - 应用图标
- `electron-builder.json5` - 打包配置
- `package.json` - 应用元数据

**输出**:
- `release/mac/*.dmg` - macOS DMG 镜像
- `release/mac/*.zip` - macOS ZIP 压缩包
- `release/win/*.exe` - Windows NSIS 安装器
- `release/win/*-portable.exe` - Windows 便携版

**配置项**:
```typescript
interface ElectronBuilderConfig {
  appId: string                    // 应用唯一标识
  productName: string              // 应用显示名称
  directories: {
    output: string                 // 输出目录
    buildResources: string         // 构建资源目录
  }
  files: string[]                  // 需要打包的文件
  extraResources: string[]         // 额外资源文件
  mac: MacConfig                   // macOS 配置
  win: WindowsConfig               // Windows 配置
  linux: LinuxConfig               // Linux 配置
}
```

### 3. 脚本系统 (Script System)

#### 职责
- 提供统一的命令行接口
- 编排构建和打包流程
- 处理跨平台差异

#### npm scripts 定义

```json
{
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

## Data Models

### 1. 应用元数据 (Application Metadata)

```typescript
interface AppMetadata {
  name: string                     // 包名 (小写,无空格)
  version: string                  // 版本号 (语义化版本)
  description: string              // 应用描述
  author: string | AuthorObject    // 作者信息
  license: string                  // 许可证类型
  homepage: string                 // 项目主页
  repository: RepositoryObject     // 代码仓库
}

interface AuthorObject {
  name: string
  email?: string
  url?: string
}

interface RepositoryObject {
  type: string                     // 如 "git"
  url: string                      // 仓库 URL
}
```

### 2. 构建配置 (Build Configuration)

```typescript
interface BuildConfig {
  // TypeScript 配置
  typescript: {
    main: TSConfig                 // 主进程配置
    preload: TSConfig              // 预加载脚本配置
  }
  
  // Vite 配置
  vite: ViteConfig                 // 渲染进程配置
  
  // 输出目录
  output: {
    main: string                   // 主进程输出目录
    preload: string                // 预加载脚本输出目录
    renderer: string               // 渲染进程输出目录
  }
}

interface TSConfig {
  compilerOptions: {
    target: string                 // 编译目标 (如 "ES2020")
    module: string                 // 模块系统 (如 "ESNext")
    outDir: string                 // 输出目录
    rootDir: string                // 根目录
    moduleResolution: string       // 模块解析策略
    esModuleInterop: boolean       // ES 模块互操作
    skipLibCheck: boolean          // 跳过库检查
  }
  include: string[]                // 包含的文件
  exclude: string[]                // 排除的文件
}
```

### 3. 打包配置 (Package Configuration)

```typescript
interface PackageConfig {
  appId: string                    // 应用 ID (如 "com.example.batchpic")
  productName: string              // 产品名称 (如 "BatchPic")
  copyright: string                // 版权信息
  
  directories: {
    output: string                 // 输出目录 (如 "release")
    buildResources: string         // 构建资源目录 (如 "build")
  }
  
  files: string[]                  // 需要打包的文件模式
  extraResources: string[]         // 额外资源文件
  
  mac: MacPackageConfig
  win: WindowsPackageConfig
}

interface MacPackageConfig {
  target: string[]                 // 目标格式 (如 ["dmg", "zip"])
  icon: string                     // 图标路径
  category: string                 // 应用分类
  hardenedRuntime: boolean         // 强化运行时
  gatekeeperAssess: boolean        // Gatekeeper 评估
  entitlements?: string            // 权限文件路径
  entitlementsInherit?: string     // 继承权限文件路径
  dmg?: {
    background?: string            // DMG 背景图
    window: {
      width: number
      height: number
    }
    contents: Array<{
      x: number
      y: number
      type: string
      path?: string
    }>
  }
}

interface WindowsPackageConfig {
  target: Array<{
    target: string                 // 目标格式 (如 "nsis", "portable")
    arch: string[]                 // 架构 (如 ["x64", "ia32"])
  }>
  icon: string                     // 图标路径
  artifactName: string             // 产物命名模式
  nsis?: {
    oneClick: boolean              // 一键安装
    perMachine: boolean            // 为所有用户安装
    allowToChangeInstallationDirectory: boolean
    createDesktopShortcut: boolean
    createStartMenuShortcut: boolean
  }
}


```

### 4. 构建产物 (Build Artifacts)

```typescript
interface BuildArtifacts {
  timestamp: Date                  // 构建时间
  version: string                  // 版本号
  
  compiled: {
    main: string[]                 // 主进程编译文件列表
    preload: string[]              // 预加载脚本编译文件列表
    renderer: string[]             // 渲染进程构建文件列表
  }
  
  packages: {
    mac?: PackageArtifact[]        // macOS 安装包
    win?: PackageArtifact[]        // Windows 安装包
  }
}

interface PackageArtifact {
  file: string                     // 文件名
  path: string                     // 完整路径
  size: number                     // 文件大小 (字节)
  format: string                   // 格式 (如 "dmg", "exe", "AppImage")
  arch: string                     // 架构 (如 "x64", "arm64")
  checksum?: {
    sha256: string                 // SHA-256 校验和
    sha512: string                 // SHA-512 校验和
  }
}
```


## Correctness Properties

*属性(Property)是一个特征或行为,应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: 构建输出目录正确性

*对于任何*有效的源代码和构建配置,执行完整构建后,主进程代码应输出到 dist/main/,预加载脚本应输出到 dist/preload/,渲染进程资源应输出到 dist/renderer/

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: 构建前清理

*对于任何*构建操作,在开始编译前,旧的 dist/ 目录应被完全删除

**Validates: Requirements 1.5**

### Property 3: 构建产物验证

*对于任何*成功的构建操作,所有必需的文件(main.js, preload.js, index.html)应存在于其对应的输出目录中

**Validates: Requirements 1.4**

### Property 4: 构建失败错误处理

*对于任何*导致编译失败的源代码,构建系统应返回非零退出码并输出包含错误位置和原因的信息

**Validates: Requirements 1.6**

### Property 5: 跨平台打包支持

*对于任何*目标平台(macOS/Windows),打包系统应能够生成该平台的所有指定格式的安装包

**Validates: Requirements 2.1, 2.2**

### Property 6: 应用图标包含

*对于任何*平台的打包操作,生成的安装包应包含该平台对应格式的应用图标(macOS: .icns, Windows: .ico)

**Validates: Requirements 2.3**

### Property 7: 应用元数据完整性

*对于任何*打包操作,生成的安装包应包含完整的应用元数据(名称、描述、作者、版权信息)

**Validates: Requirements 2.4**

### Property 8: 文件过滤正确性

*对于任何*打包操作,生成的安装包应只包含配置中指定的文件,并排除配置中标记为排除的文件

**Validates: Requirements 2.5**

### Property 9: 平台特定配置存在

*对于任何*目标平台,electron-builder 配置应包含该平台特定的打包选项(macOS: DMG 配置, Windows: NSIS 配置)

**Validates: Requirements 2.6, 2.7, 2.8**

### Property 10: 打包输出目录

*对于任何*打包操作,所有生成的安装包应输出到 release/ 目录下对应的平台子目录中

**Validates: Requirements 2.9**

### Property 11: 打包前自动构建

*对于任何*打包脚本(package, package:mac, package:win),执行时应自动触发完整的构建流程

**Validates: Requirements 3.6**

### Property 12: 脚本失败错误处理

*对于任何*执行失败的构建或打包脚本,应输出清晰的错误信息说明失败原因

**Validates: Requirements 3.7**

## Error Handling

### 构建阶段错误处理

#### TypeScript 编译错误

**错误类型**:
- 语法错误
- 类型错误
- 模块解析错误
- 配置错误

**处理策略**:
1. 捕获 tsc 的标准错误输出
2. 解析错误信息,提取文件路径、行号、错误类型
3. 格式化输出,突出显示错误位置
4. 返回非零退出码 (1)
5. 不继续后续构建步骤

**错误信息格式**:
```
[构建失败] TypeScript 编译错误

文件: src/main/main.ts:42:15
错误: Type 'string' is not assignable to type 'number'

  40 | function processImage(width: number) {
  41 |   const size = "100";
> 42 |   return processImage(size);
     |                       ^^^^
  43 | }

提示: 检查变量类型是否匹配函数参数要求
```

#### Vite 构建错误

**错误类型**:
- 模块导入错误
- 插件错误
- 资源加载错误
- 配置错误

**处理策略**:
1. 捕获 Vite 的错误输出
2. 识别错误类型(模块、插件、资源等)
3. 提供上下文信息和可能的解决方案
4. 返回非零退出码 (1)

#### 文件验证错误

**错误类型**:
- 必需文件缺失
- 文件权限问题
- 磁盘空间不足

**处理策略**:
```typescript
interface ValidationError {
  type: 'missing_file' | 'permission' | 'disk_space'
  file?: string
  message: string
  suggestion: string
}

function validateBuildArtifacts(): ValidationError[] {
  const errors: ValidationError[] = []
  const requiredFiles = [
    'dist/main/main.js',
    'dist/preload/preload.js',
    'dist/renderer/index.html'
  ]
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      errors.push({
        type: 'missing_file',
        file,
        message: `必需文件不存在: ${file}`,
        suggestion: '检查构建配置和源文件是否正确'
      })
    }
  }
  
  return errors
}
```

### 打包阶段错误处理

#### electron-builder 错误

**错误类型**:
- 配置错误
- 图标文件缺失或格式错误
- 平台不支持
- 签名错误(如果配置了代码签名)
- 网络错误(下载依赖时)

**处理策略**:
1. 捕获 electron-builder 的详细错误输出
2. 根据错误类型提供针对性建议
3. 对于可恢复的错误(如网络错误),提供重试选项
4. 返回非零退出码 (1)

**常见错误处理**:

```typescript
interface PackageError {
  code: string
  message: string
  platform?: string
  suggestion: string
}

const errorHandlers: Record<string, (error: any) => PackageError> = {
  'ICON_NOT_FOUND': (error) => ({
    code: 'ICON_NOT_FOUND',
    message: `找不到图标文件: ${error.file}`,
    platform: error.platform,
    suggestion: '确保 build/icons/ 目录包含所有平台的图标文件'
  }),
  
  'INVALID_CONFIG': (error) => ({
    code: 'INVALID_CONFIG',
    message: `配置错误: ${error.details}`,
    suggestion: '检查 electron-builder.json5 配置文件格式是否正确'
  }),
  
  'PLATFORM_NOT_SUPPORTED': (error) => ({
    code: 'PLATFORM_NOT_SUPPORTED',
    message: `当前平台不支持打包 ${error.targetPlatform}`,
    platform: error.targetPlatform,
    suggestion: '在对应的操作系统上执行打包,或使用 CI/CD 进行跨平台构建'
  }),
  
  'NETWORK_ERROR': (error) => ({
    code: 'NETWORK_ERROR',
    message: `网络错误: ${error.details}`,
    suggestion: '检查网络连接,或配置代理。可以使用 --offline 参数跳过在线检查'
  })
}
```

#### 磁盘空间不足

**检测时机**: 打包前检查可用空间

**处理策略**:
```typescript
function checkDiskSpace(): boolean {
  const requiredSpace = 500 * 1024 * 1024 // 500 MB
  const availableSpace = getAvailableDiskSpace()
  
  if (availableSpace < requiredSpace) {
    console.error(`
[打包失败] 磁盘空间不足

需要: ${formatBytes(requiredSpace)}
可用: ${formatBytes(availableSpace)}

建议:
1. 清理 node_modules 和 dist 目录
2. 删除旧的 release 文件
3. 清理系统临时文件
    `)
    return false
  }
  
  return true
}
```

### 错误恢复策略

#### 自动重试

适用场景:
- 网络错误
- 临时文件锁定
- 资源暂时不可用

```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      if (isRetryableError(error)) {
        console.log(`操作失败,${delay}ms 后重试 (${i + 1}/${maxRetries})...`)
        await sleep(delay)
        delay *= 2 // 指数退避
      } else {
        throw error
      }
    }
  }
  
  throw new Error('不应该到达这里')
}
```

#### 部分失败处理

场景: 多平台打包时,某个平台失败不应影响其他平台

```typescript
async function packageAllPlatforms() {
  const platforms = ['mac', 'win']
  const results = await Promise.allSettled(
    platforms.map(platform => packagePlatform(platform))
  )
  
  const succeeded: string[] = []
  const failed: Array<{ platform: string; error: Error }> = []
  
  results.forEach((result, index) => {
    const platform = platforms[index]
    if (result.status === 'fulfilled') {
      succeeded.push(platform)
    } else {
      failed.push({ platform, error: result.reason })
    }
  })
  
  // 输出结果摘要
  console.log(`\n打包完成: ${succeeded.length} 成功, ${failed.length} 失败\n`)
  
  if (succeeded.length > 0) {
    console.log('✓ 成功的平台:', succeeded.join(', '))
  }
  
  if (failed.length > 0) {
    console.error('✗ 失败的平台:')
    failed.forEach(({ platform, error }) => {
      console.error(`  ${platform}: ${error.message}`)
    })
    process.exit(1)
  }
}
```

### 日志记录

#### 日志级别

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}
  
  debug(message: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args)
    }
  }
  
  warn(message: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }
  
  error(message: string, error?: Error) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`)
      if (error) {
        console.error(error.stack)
      }
    }
  }
}
```

#### 构建日志

记录内容:
- 构建开始时间
- 各阶段耗时
- 编译的文件数量
- 生成的文件大小
- 警告和错误

```typescript
interface BuildLog {
  startTime: Date
  endTime?: Date
  duration?: number
  stages: Array<{
    name: string
    startTime: Date
    endTime: Date
    duration: number
    filesProcessed: number
    warnings: string[]
    errors: string[]
  }>
  artifacts: Array<{
    path: string
    size: number
  }>
}
```

## Testing Strategy

### 测试方法论

本项目采用**双重测试策略**:

1. **单元测试 (Unit Tests)**: 验证特定示例、边界情况和错误条件
2. **属性测试 (Property-Based Tests)**: 验证跨所有输入的通用属性

两种测试方法互补:
- 单元测试捕获具体的 bug 和已知的边界情况
- 属性测试通过随机化验证通用正确性

### 属性测试配置

**测试库**: fast-check (已在项目依赖中)

**配置要求**:
- 每个属性测试最少运行 100 次迭代
- 每个测试必须引用设计文档中的属性编号
- 标签格式: `Feature: app-packaging-release, Property {number}: {property_text}`

### 测试范围

#### 1. 构建系统测试

**单元测试**:

```typescript
describe('Build System', () => {
  describe('构建脚本', () => {
    it('应该在 package.json 中定义 build 脚本', () => {
      const pkg = require('../package.json')
      expect(pkg.scripts.build).toBeDefined()
    })
    
    it('应该在 package.json 中定义所有平台打包脚本', () => {
      const pkg = require('../package.json')
      expect(pkg.scripts.package).toBeDefined()
      expect(pkg.scripts['package:mac']).toBeDefined()
      expect(pkg.scripts['package:win']).toBeDefined()
    })
  })
  
  describe('构建清理', () => {
    it('应该在构建前删除旧的 dist 目录', async () => {
      // 创建旧文件
      await fs.mkdir('dist/main', { recursive: true })
      await fs.writeFile('dist/main/old.js', 'old content')
      
      // 执行构建
      await runBuild()
      
      // 验证旧文件不存在
      expect(fs.existsSync('dist/main/old.js')).toBe(false)
    })
  })
  
  describe('错误处理', () => {
    it('应该在 TypeScript 编译错误时返回非零退出码', async () => {
      // 创建有语法错误的文件
      await fs.writeFile('src/main/error.ts', 'const x: number = "string"')
      
      // 执行构建
      const result = await runBuildWithErrorCapture()
      
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('Type \'string\' is not assignable')
    })
  })
})
```

**属性测试**:

```typescript
import fc from 'fast-check'

describe('Build System Properties', () => {
  /**
   * Feature: app-packaging-release, Property 1: 构建输出目录正确性
   * 对于任何有效的源代码和构建配置,执行完整构建后,
   * 主进程代码应输出到 dist/main/,预加载脚本应输出到 dist/preload/,
   * 渲染进程资源应输出到 dist/renderer/
   */
  it('Property 1: 所有组件应输出到正确的目录', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          mainFiles: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          preloadFiles: fc.array(fc.string(), { minLength: 1, maxLength: 3 }),
          rendererFiles: fc.array(fc.string(), { minLength: 1, maxLength: 10 })
        }),
        async ({ mainFiles, preloadFiles, rendererFiles }) => {
          // 创建源文件
          await createSourceFiles({ mainFiles, preloadFiles, rendererFiles })
          
          // 执行构建
          await runBuild()
          
          // 验证输出目录
          expect(fs.existsSync('dist/main')).toBe(true)
          expect(fs.existsSync('dist/preload')).toBe(true)
          expect(fs.existsSync('dist/renderer')).toBe(true)
          
          // 验证文件存在
          for (const file of mainFiles) {
            expect(fs.existsSync(`dist/main/${file}.js`)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * Feature: app-packaging-release, Property 2: 构建前清理
   * 对于任何构建操作,在开始编译前,旧的 dist/ 目录应被完全删除
   */
  it('Property 2: 构建前应清理旧的构建产物', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
        async (oldFiles) => {
          // 创建旧文件
          await fs.mkdir('dist/main', { recursive: true })
          for (const file of oldFiles) {
            await fs.writeFile(`dist/main/${file}`, 'old content')
          }
          
          // 执行构建
          await runBuild()
          
          // 验证旧文件不存在
          for (const file of oldFiles) {
            expect(fs.existsSync(`dist/main/${file}`)).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * Feature: app-packaging-release, Property 4: 构建失败错误处理
   * 对于任何导致编译失败的源代码,构建系统应返回非零退出码
   * 并输出包含错误位置和原因的信息
   */
  it('Property 4: 编译错误应返回非零退出码', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileName: fc.string(),
          errorType: fc.constantFrom('type-error', 'syntax-error', 'import-error')
        }),
        async ({ fileName, errorType }) => {
          // 创建有错误的源文件
          const errorCode = generateErrorCode(errorType)
          await fs.writeFile(`src/main/${fileName}.ts`, errorCode)
          
          // 执行构建
          const result = await runBuildWithErrorCapture()
          
          // 验证退出码和错误信息
          expect(result.exitCode).not.toBe(0)
          expect(result.stderr.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

#### 2. 打包系统测试

**单元测试**:

```typescript
describe('Package System', () => {
  describe('配置验证', () => {
    it('应该包含所有必需的应用元数据', () => {
      const config = loadElectronBuilderConfig()
      
      expect(config.appId).toBeDefined()
      expect(config.productName).toBeDefined()
      expect(config.copyright).toBeDefined()
    })
    
    it('应该配置所有目标平台', () => {
      const config = loadElectronBuilderConfig()
      
      expect(config.mac).toBeDefined()
      expect(config.win).toBeDefined()
    })
    
    it('应该指定正确的图标路径', () => {
      const config = loadElectronBuilderConfig()
      
      expect(config.mac.icon).toBe('build/icons/icon.icns')
      expect(config.win.icon).toBe('build/icons/icon.ico')
    })
  })
  
  describe('平台特定配置', () => {
    it('macOS 配置应包含 DMG 设置', () => {
      const config = loadElectronBuilderConfig()
      
      expect(config.mac.target).toContain('dmg')
      expect(config.mac.target).toContain('zip')
      expect(config.mac.dmg).toBeDefined()
    })
    
    it('Windows 配置应包含 NSIS 设置', () => {
      const config = loadElectronBuilderConfig()
      
      expect(config.win.target.some(t => t.target === 'nsis')).toBe(true)
      expect(config.win.nsis).toBeDefined()
    })
    

  })
})
```

**属性测试**:

```typescript
describe('Package System Properties', () => {
  /**
   * Feature: app-packaging-release, Property 5: 跨平台打包支持
   * 对于任何目标平台(macOS/Windows),打包系统应能够
   * 生成该平台的所有指定格式的安装包
   */
  it('Property 5: 应支持所有目标平台的打包', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('mac', 'win'),
        async (platform) => {
          // 执行平台特定打包
          await runPackage(platform)
          
          // 验证输出文件存在
          const expectedFormats = getExpectedFormats(platform)
          for (const format of expectedFormats) {
            const files = await glob(`release/${platform}/*.${format}`)
            expect(files.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * Feature: app-packaging-release, Property 8: 文件过滤正确性
   * 对于任何打包操作,生成的安装包应只包含配置中指定的文件,
   * 并排除配置中标记为排除的文件
   */
  it('Property 8: 打包应正确过滤文件', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          includedFiles: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          excludedFiles: fc.array(fc.string(), { minLength: 1, maxLength: 5 })
        }),
        async ({ includedFiles, excludedFiles }) => {
          // 创建测试文件
          for (const file of includedFiles) {
            await fs.writeFile(`dist/${file}`, 'included')
          }
          for (const file of excludedFiles) {
            await fs.writeFile(`dist/${file}`, 'excluded')
          }
          
          // 配置文件过滤规则
          await updatePackageConfig({
            files: includedFiles.map(f => `dist/${f}`),
            exclude: excludedFiles.map(f => `dist/${f}`)
          })
          
          // 执行打包
          await runPackage('mac')
          
          // 验证打包内容
          const packageContents = await extractPackageContents('release/mac/*.dmg')
          
          for (const file of includedFiles) {
            expect(packageContents).toContain(file)
          }
          for (const file of excludedFiles) {
            expect(packageContents).not.toContain(file)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * Feature: app-packaging-release, Property 10: 打包输出目录
   * 对于任何打包操作,所有生成的安装包应输出到 release/ 目录下
   * 对应的平台子目录中
   */
  it('Property 10: 所有安装包应输出到正确目录', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('mac', 'win'),
        async (platform) => {
          // 执行打包
          await runPackage(platform)
          
          // 验证输出目录
          expect(fs.existsSync(`release/${platform}`)).toBe(true)
          
          // 验证至少有一个安装包文件
          const files = await fs.readdir(`release/${platform}`)
          expect(files.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

#### 3. 文档测试

**单元测试**:

```typescript
describe('Documentation', () => {
  it('应该存在打包发布指南文档', () => {
    expect(fs.existsSync('docs/PACKAGING_GUIDE.md')).toBe(true)
  })
  
  it('文档应包含所有必需章节', () => {
    const doc = fs.readFileSync('docs/PACKAGING_GUIDE.md', 'utf-8')
    
    expect(doc).toMatch(/版本管理/i)
    expect(doc).toMatch(/发布流程/i)
    expect(doc).toMatch(/代码签名/i)
    expect(doc).toMatch(/自动更新/i)
    expect(doc).toMatch(/常见问题/i)
    expect(doc).toMatch(/检查清单/i)
  })
})
```

### 测试环境

#### 本地测试

```bash
# 运行所有测试
npm test

# 运行特定测试套件
npm test -- build.test.ts

# 运行属性测试
npm test -- --testNamePattern="Property"

# 生成覆盖率报告
npm test -- --coverage
```

#### CI/CD 测试

在 CI 环境中,应该:
1. 运行所有单元测试和属性测试
2. 验证构建配置的有效性
3. 执行实际的构建和打包(在对应平台上)
4. 验证生成的安装包可以正常安装和运行

### 测试覆盖率目标

- 构建脚本: 90%+
- 配置验证: 100%
- 错误处理: 80%+
- 整体覆盖率: 85%+

### 持续测试

- 每次提交前运行单元测试
- 每次 PR 运行完整测试套件
- 每日运行完整的构建和打包测试
- 发布前运行所有测试并验证安装包

