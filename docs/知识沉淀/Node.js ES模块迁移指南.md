# Node.js ES 模块迁移指南

## 文档信息
- 创建时间: 2026-03-07
- 文档类型: Knowledge Driven (L2 理解型)
- 适用场景: TypeScript/Node.js 项目从 CommonJS 迁移到 ES 模块

---

## 问题背景

当 TypeScript 项目配置为输出 ES 模块 (`"module": "ES2020"`) 时,会遇到两个核心问题:

1. **模块导入路径必须包含扩展名**
2. **`__dirname` 和 `__filename` 不可用**

---

## 核心概念

### 为什么 ES 模块要求扩展名?

**CommonJS 时代**:
```javascript
const module = require('./FileScanner');  // 自动查找 .js, .json 等
```

**ES 模块时代**:
```javascript
import { FileScanner } from './FileScanner.js';  // 必须显式指定
```

**原因**:
- 性能: 避免文件系统的多次查找
- 明确性: 让模块解析更加确定和可预测
- 浏览器兼容: 浏览器 ES 模块也要求完整路径

### TypeScript 的特殊之处

**关键点**: 源码是 `.ts`,编译后是 `.js`,但 import 路径要写 `.js`

```typescript
// ❌ 错误 - 虽然源文件是 .ts
import { FileScanner } from './FileScanner';
import { FileScanner } from './FileScanner.ts';

// ✅ 正确 - 写编译后的扩展名
import { FileScanner } from './FileScanner.js';
```

**为什么这样设计?**
- TypeScript 不会重写 import 路径
- 编译后的代码必须能直接在 Node.js 中运行
- 保持 import 语句的"透明性"

---

## 解决方案

### 1. 修复模块导入路径

**问题**: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module`

**解决**:
```typescript
// 修改前
import { FileScannerImpl } from './FileScanner';
import { ImageFile } from './types';

// 修改后
import { FileScannerImpl } from './FileScanner.js';
import { ImageFile } from './types.js';
```

**批量查找命令**:
```bash
# 查找所有缺少 .js 扩展名的相对导入
grep -r "from '\\./" src/main --include="*.ts" | grep -v "\.js'"
```

### 2. 修复 __dirname 和 __filename

**问题**: `ReferenceError: __dirname is not defined`

**原因**: ES 模块没有 `__dirname` 和 `__filename` 全局变量

**解决**:
```typescript
// 添加这两行到文件顶部
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 然后就可以正常使用了
const preloadPath = path.join(__dirname, 'preload.js');
```

**工作原理**:
- `import.meta.url`: 当前模块的 file:// URL (如 `file:///path/to/file.js`)
- `fileURLToPath()`: 将 file:// URL 转换为文件系统路径
- `path.dirname()`: 获取目录路径

---

## 完整迁移清单

### 步骤 1: 检查 tsconfig 配置
```json
{
  "compilerOptions": {
    "module": "ES2020",        // 或 ESNext
    "target": "ES2020",
    "moduleResolution": "node"  // 保持 node 解析策略
  }
}
```

### 步骤 2: 修复所有相对导入
```bash
# 查找需要修复的文件
grep -r "from '\\./" src --include="*.ts" | grep -v "\.js'"
```

为每个相对导入添加 `.js` 扩展名。

### 步骤 3: 替换 __dirname 和 __filename
在使用这些变量的文件顶部添加:
```typescript
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### 步骤 4: 检查 package.json
```json
{
  "type": "module"  // 如果整个项目都是 ES 模块
}
```

⚠️ 注意: Electron 项目通常不需要设置 `"type": "module"`,因为主进程和渲染进程的模块系统可能不同。

---

## 常见陷阱

### 陷阱 1: 忘记修改测试文件
测试文件中的 import 也需要添加 `.js` 扩展名:
```typescript
// ❌ 错误
import { FileScanner } from './FileScanner';

// ✅ 正确
import { FileScanner } from './FileScanner.js';
```

### 陷阱 2: 动态 require 失效
```typescript
// ❌ ES 模块中不能用 require
const module = require('./module');

// ✅ 使用动态 import
const module = await import('./module.js');
```

### 陷阱 3: JSON 导入
```typescript
// ❌ 可能不工作
import data from './data.json';

// ✅ 使用 assert 或 fs
import data from './data.json' assert { type: 'json' };
// 或
import fs from 'fs/promises';
const data = JSON.parse(await fs.readFile('./data.json', 'utf-8'));
```

---

## 何时使用 ES 模块 vs CommonJS

### 使用 ES 模块 ✅
- 新项目
- 需要 tree-shaking
- 前后端代码共享
- 现代工具链 (Vite, esbuild)

### 继续使用 CommonJS ⚠️
- 老项目迁移成本高
- 依赖大量 CommonJS 包
- 需要动态 require
- 团队不熟悉 ES 模块

### 混合使用 🔄
- Electron 项目 (主进程 ES 模块,渲染进程可能不同)
- 渐进式迁移
- 使用 `.mjs` 和 `.cjs` 扩展名区分

---

## 调试技巧

### 查看编译后的代码
```bash
# 编译后检查 import 语句
cat dist/main/main.js | grep "from"
```

### 启用详细错误信息
```bash
# Node.js 显示完整堆栈
node --trace-warnings dist/main/main.js
```

### 验证模块解析
```bash
# 检查 Node.js 如何解析模块
node --experimental-loader=./loader.js dist/main/main.js
```

---

## 相关资源

### 官方文档
- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)

### 关键概念
- ES Modules vs CommonJS
- Module Resolution
- import.meta
- Dynamic Import

### 进阶学习
- 自定义 Loader
- Package.json exports 字段
- Conditional Exports
- Dual Package Hazard

---

## 总结

ES 模块迁移的两个核心修改:
1. **所有相对导入添加 `.js` 扩展名** (即使源文件是 `.ts`)
2. **用 `import.meta.url` + `fileURLToPath` 替代 `__dirname`**

记住: TypeScript 不会重写你的 import 路径,所以要写编译后的扩展名。
