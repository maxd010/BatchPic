# BatchPic 导出功能故障排除指南

## 问题: 点击"导出图片"按钮没有反应

### 根本原因分析

导出功能涉及以下几个关键环节，任何一个失败都会导致无反应:

```
用户点击按钮
    ↓
前端 handleExport 函数执行
    ↓
调用 window.electronAPI.processImages()
    ↓
IPC 消息发送到主进程
    ↓
主进程 process-images 处理器执行
    ↓
创建输出目录
    ↓
处理图片
    ↓
返回结果到前端
    ↓
前端更新 UI
```

---

## 必须验证的 5 个关键项

### ✅ 项目 1: electronAPI 可用性

**为什么重要**: 如果 electronAPI 未定义，IPC 调用会立即失败

**验证方法**:
```javascript
// 在浏览器控制台执行
console.log(window.electronAPI);
```

**预期结果**:
```javascript
{
  scanFiles: ƒ,
  processImages: ƒ,
  estimateFileSize: ƒ,
  saveTemplate: ƒ,
  loadTemplates: ƒ,
  deleteTemplate: ƒ,
  openOutputDirectory: ƒ,
  onProcessingProgress: ƒ
}
```

**如果失败**:
- 检查 `src/main/preload.ts` 是否存在
- 检查 `src/main/main.ts` 中的 preload 路径
- 重新编译: `npm run build:main`

---

### ✅ 项目 2: 文件已正确添加

**为什么重要**: 如果没有文件，导出按钮会被禁用

**验证方法**:
1. 拖入图片到应用
2. 查看页面是否显示 "已选择 X 张图片"
3. 查看导出按钮是否可点击 (不是灰色)

**预期结果**:
- 页面显示 "已选择 3 张图片"
- 导出按钮是蓝色且可点击

**如果失败**:
- 检查 `src/renderer/components/DropZone.tsx` 的拖放处理
- 检查 `src/main/FileScanner.ts` 的文件扫描逻辑

---

### ✅ 项目 3: 前端日志输出

**为什么重要**: 确认点击事件被触发

**验证方法**:
1. 打开浏览器 DevTools (Cmd+Option+I)
2. 切换到 Console 标签页
3. 点击导出按钮
4. 查看是否有日志输出

**预期结果**:
```
Starting export with files: 3
Processing params: {resize: undefined, compression: {...}, format: undefined}
```

**如果失败**:
- 检查 `src/renderer/components/MainWindow.tsx` 的 handleExport 函数
- 检查浏览器控制台是否有错误消息

---

### ✅ 项目 4: IPC 消息接收

**为什么重要**: 确认主进程收到了 IPC 消息

**验证方法**:
1. 查看运行 `npm run dev` 的终端
2. 点击导出按钮
3. 查看终端是否有日志输出

**预期结果**:
```
Processing images: 3 files
Parameters: {resize: undefined, compression: {...}, format: undefined}
Output directory created: /Users/martin/Library/Application Support/batchpic/output-20260219-171234
```

**如果失败**:
- 检查 `src/main/main.ts` 中的 IPC 处理器注册
- 检查 preload 脚本中的 IPC 调用名称是否匹配

---

### ✅ 项目 5: 输出目录创建

**为什么重要**: 确认文件系统操作成功

**验证方法**:
1. 点击导出按钮
2. 在终端执行:
```bash
ls -la ~/Library/Application\ Support/batchpic/
```

**预期结果**:
```
total 0
drwxr-xr-x  3 martin  staff   96 Feb 19 17:12 .
drwxr-xr-x  5 martin  staff  160 Feb 19 17:10 ..
drwxr-xr-x  3 martin  staff   96 Feb 19 17:12 output-20260219-171234
```

**如果失败**:
- 检查 `src/main/OutputManager.ts` 的目录创建逻辑
- 检查文件系统权限

---

## 完整的诊断流程

### 第 1 步: 启动应用
```bash
npm run dev
```

### 第 2 步: 验证 electronAPI
在浏览器控制台执行:
```javascript
console.log('electronAPI:', window.electronAPI);
console.log('processImages:', typeof window.electronAPI?.processImages);
```

### 第 3 步: 拖入图片
- 从文件管理器拖入 1-3 张图片
- 验证页面显示文件数量

### 第 4 步: 点击导出并收集日志
- 打开浏览器 DevTools
- 打开终端窗口
- 点击导出按钮
- 记录所有日志输出

### 第 5 步: 检查输出目录
```bash
ls -la ~/Library/Application\ Support/batchpic/
```

---

## 常见问题及解决方案

### Q1: 导出按钮是灰色的
**原因**: 没有选择图片
**解决方案**:
1. 确保已拖入图片
2. 查看页面是否显示 "已选择 X 张图片"
3. 如果没有显示，检查 DropZone 组件

### Q2: 点击按钮没有任何反应
**原因**: 可能是以下几个原因之一:
- electronAPI 未定义
- IPC 调用失败
- 前端代码有错误

**解决方案**:
1. 检查浏览器控制台是否有错误
2. 验证 electronAPI 是否可用
3. 查看主进程是否收到 IPC 消息

### Q3: 看到错误消息 "electronAPI is not defined"
**原因**: Preload 脚本未正确加载
**解决方案**:
1. 检查 `src/main/preload.ts` 是否存在
2. 检查 `src/main/main.ts` 中的 preload 路径是否正确
3. 重新编译: `npm run build:main`

### Q4: 主进程没有日志输出
**原因**: IPC 处理器未被调用
**解决方案**:
1. 检查 preload 脚本中的 IPC 调用名称
2. 检查主进程中的 `ipcMain.handle()` 名称是否匹配
3. 检查是否有 IPC 错误

### Q5: 处理失败，看到错误消息
**原因**: 图片处理过程中出错
**解决方案**:
1. 查看完整的错误消息
2. 检查 ImageProcessor 实现
3. 检查输入图片是否有效

---

## 调试技巧

### 1. 启用详细日志
在 `src/main/main.ts` 中添加:
```typescript
console.log('IPC Handler registered:', 'process-images');
```

### 2. 测试 IPC 连接
在浏览器控制台执行:
```javascript
window.electronAPI.processImages([], {})
  .then(r => console.log('Success:', r))
  .catch(e => console.error('Error:', e));
```

### 3. 检查文件权限
```bash
ls -la ~/Library/Application\ Support/
```

### 4. 查看 Electron 日志
```bash
# macOS
cat ~/Library/Logs/batchpic/main.log
```

---

## 如果仍然无法解决

请收集以下信息并提供:

1. **浏览器控制台的完整输出** (包括所有错误)
2. **主进程终端的完整输出** (包括所有日志)
3. **系统信息**:
   ```bash
   node --version
   npm --version
   uname -a
   ```
4. **你执行的具体步骤** (例如: 拖入了哪些文件)
5. **预期的行为** vs **实际的行为**

这样可以快速定位问题!
