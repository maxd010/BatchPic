# 应用启动错误记录

## 错误记录时间
2026-03-07

## 错误详情

### 错误 1: 模块未找到错误

**错误类型**: `Error [ERR_MODULE_NOT_FOUND]`

**错误信息**:
```
Cannot find module '/Users/martin/Documents/Github/BatchPic/dist/main/FileScanner' 
imported from /Users/martin/Documents/Github/BatchPic/dist/main/main.js
```

**完整堆栈**:
```
App threw an error during load
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/martin/Documents/Github/BatchPic/dist/main/FileScanner' imported from /Users/martin/Documents/Github/BatchPic/dist/main/main.js
    at new NodeError (node:internal/errors:405:5)
    at finalizeResolution (node:internal/modules/esm/resolve:294:11)
    at moduleResolve (node:internal/modules/esm/resolve:919:10)
    at defaultResolve (node:internal/modules/esm/resolve:1105:11)
    at nextResolve (node:internal/modules/esm/loader:166:28)
    at ESMLoader.resolve (node:internal/modules/esm/loader:840:30)
    at ESMLoader.getModuleJob (node:internal/modules/esm/loader:429:18)
    at ModuleWrap.<anonymous> (node:internal/modules/esm/module_job:77:40)
    at link (node:internal/modules/esm/module_job:76:36)
```

**问题分析**:
- 主进程尝试导入 `FileScanner` 模块时失败
- 路径缺少文件扩展名 `.js`
- TypeScript 编译后的 ES 模块导入需要完整的文件扩展名

**可能原因**:
1. `main.ts` 中的 import 语句缺少 `.js` 扩展名
2. TypeScript 配置可能需要调整模块解析策略
3. 编译输出的 import 语句未自动添加扩展名

**影响范围**:
- 应用无法启动
- 主进程加载失败
- Electron 窗口无法打开

**优先级**: 🔴 高 - 阻塞应用启动

---

## 待解决问题列表

- [x] 错误 1: 修复模块导入路径缺少扩展名的问题 ✅ 已解决

---

### 错误 2: __dirname 未定义

**错误类型**: `ReferenceError: __dirname is not defined`

**错误信息**:
```
(node:39882) UnhandledPromiseRejectionWarning: ReferenceError: __dirname is not defined
    at createWindow (file:///Users/martin/Documents/Github/BatchPic/dist/main/main.js:17:32)
```

**问题分析**:
- ES 模块中不存在 `__dirname` 和 `__filename` 全局变量
- 这些是 CommonJS 特有的变量
- 需要使用 `import.meta.url` 和 `fileURLToPath` 来获取当前文件路径

**可能原因**:
1. 代码从 CommonJS 迁移到 ES 模块时未更新路径获取方式
2. `main.ts` 中使用了 `__dirname` 但在 ES 模块环境下运行

**影响范围**:
- 应用无法创建窗口
- preload 脚本路径无法解析
- 可能影响所有使用 `__dirname` 的地方

**优先级**: 🔴 高 - 阻塞应用启动

- [ ] 错误 2: 修复 ES 模块中 __dirname 未定义的问题 ✅ 已解决

---

## 解决方案总结

### 问题 1 & 2: ES 模块迁移问题

**根本原因**: 项目使用 ES2020 模块系统,但代码仍使用 CommonJS 的写法

**解决方案**:
1. 所有相对路径 import 添加 `.js` 扩展名
2. 使用 `import.meta.url` + `fileURLToPath` 替代 `__dirname`

**修改文件**:
- `src/main/main.ts`
- `src/main/FileScanner.ts`
- `src/main/ImageProcessor.ts`
- `src/main/OutputManager.ts`
- `src/main/TemplateManager.ts`

**详细文档**: 参见 `docs/知识沉淀/Node.js ES模块迁移指南.md`

**验证**: 应用成功启动,无错误信息

---

## 预防措施

为避免将来出现同样问题:

1. **新增文件时**: 记得所有相对导入使用 `.js` 扩展名
2. **使用路径时**: 优先使用 `import.meta.url` 而非 `__dirname`
3. **代码审查**: 检查是否有遗漏的 CommonJS 写法
4. **测试文件**: 测试文件的 import 也需要 `.js` 扩展名

**快速检查命令**:
```bash
# 查找缺少 .js 的导入
grep -r "from '\\./" src/main --include="*.ts" | grep -v "\.js'"

# 查找使用 __dirname 的地方
grep -r "__dirname" src/main --include="*.ts"
```

---

## 运行时错误

### 错误 3: IPC 通信失败 - scanFiles 未定义

**发生时间**: 2026-03-07 (应用运行时)

**错误类型**: `TypeError: Cannot read properties of undefined (reading 'scanFiles')`

**错误信息**:
```
Failed to scan files: TypeError: Cannot read properties of undefined (reading 'scanFiles')
at MainWindow.tsx:98:53
at DropZone.tsx:89:7
```

**根本原因**: Preload 脚本使用 ES Module 编译,但 Electron 要求 CommonJS 格式

**解决方案**: 
- 创建独立的 `tsconfig.preload.json` 配置
- 将 preload.ts 编译为 CommonJS
- 修改构建脚本支持双配置编译

**状态**: ✅ 已解决 (2026-03-07)

**相关文档**: 
- [技术债文档](../业务文档/BatchPic/技术债.md)
- [Node.js ES模块迁移指南](../知识沉淀/Node.js%20ES模块迁移指南.md)
