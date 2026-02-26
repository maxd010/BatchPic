# BatchPic 导出功能诊断清单

## 1. 前端连接检查

### 1.1 检查 electronAPI 是否可用
**在浏览器控制台执行**:
```javascript
console.log('electronAPI:', window.electronAPI);
console.log('processImages:', window.electronAPI?.processImages);
```

**预期结果**: 
- 应该看到 `electronAPI` 对象
- 应该看到 `processImages` 是一个函数

**验证方式**: 
- 打开 Electron 开发者工具 (DevTools)
- 在控制台标签页粘贴上述代码
- 检查输出

---

## 2. 文件选择检查

### 2.1 检查是否成功添加了图片
**在浏览器控制台执行**:
```javascript
// 这需要访问 React 组件状态，可以通过以下方式检查
// 查看页面上是否显示 "已选择 X 张图片"
```

**预期结果**: 
- 页面上应该显示 "已选择 X 张图片"
- 导出按钮应该是启用状态（不是灰色）

**验证方式**:
- 拖入图片后，查看页面是否显示文件数量
- 查看导出按钮是否可点击

---

## 3. 导出按钮点击检查

### 3.1 检查点击事件是否触发
**在浏览器控制台执行**:
```javascript
// 添加一个临时的日志拦截器
const originalLog = console.log;
console.log = function(...args) {
  if (args[0]?.includes?.('Starting export') || args[0]?.includes?.('Export')) {
    console.error('EXPORT LOG:', ...args);
  }
  originalLog.apply(console, args);
};
```

**预期结果**: 
- 点击导出按钮后，应该在控制台看到 "Starting export with files: X"

**验证方式**:
- 在控制台执行上述代码
- 点击导出按钮
- 查看是否有日志输出

---

## 4. IPC 通信检查

### 4.1 检查主进程是否收到 IPC 消息
**查看 Electron 主进程输出**:
- 打开终端，查看 `npm run dev` 的输出
- 点击导出按钮后，应该看到主进程的日志

**预期结果**:
```
Processing images: X files
Parameters: {...}
Output directory created: /path/to/output
Processing progress: 0%
Processing progress: 100%
Processing completed: {...}
```

**验证方式**:
- 在运行 `npm run dev` 的终端中查看输出
- 点击导出按钮
- 检查是否有上述日志

---

## 5. 输出目录检查

### 5.1 检查输出目录是否被创建
**在终端执行**:
```bash
# 查看用户的临时目录
ls -la ~/Library/Application\ Support/batchpic/

# 或查看系统临时目录
ls -la /tmp/ | grep batchpic
```

**预期结果**: 
- 应该看到一个名称类似 `output-YYYYMMDD-HHMMSS` 的目录
- 目录中应该包含处理后的图片

**验证方式**:
- 点击导出按钮后
- 在终端执行上述命令
- 检查是否有新的输出目录

---

## 6. 错误消息检查

### 6.1 检查浏览器控制台是否有错误
**在浏览器 DevTools 中**:
- 打开 Console 标签页
- 查看是否有红色的错误消息
- 特别查找 "Failed to process images" 或其他错误

**预期结果**: 
- 不应该有错误消息
- 如果有错误，应该显示具体的错误信息

**验证方式**:
- 打开 DevTools
- 点击导出按钮
- 查看 Console 标签页

---

## 7. 主进程错误检查

### 7.1 检查主进程是否有错误
**在终端中查看**:
- 运行 `npm run dev` 的终端输出
- 查找 "Error processing images" 或其他错误

**预期结果**: 
- 不应该有错误消息
- 如果有错误，应该显示具体的错误信息

**验证方式**:
- 查看 `npm run dev` 的终端输出
- 点击导出按钮
- 检查是否有错误日志

---

## 8. 完整的诊断步骤

### 按顺序执行以下步骤:

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **打开 DevTools**
   - Electron 应该自动打开 DevTools
   - 如果没有，按 `Cmd+Option+I` (macOS) 或 `Ctrl+Shift+I` (Windows/Linux)

3. **在浏览器控制台验证 electronAPI**
   ```javascript
   console.log('electronAPI:', window.electronAPI);
   ```

4. **拖入图片**
   - 从文件管理器拖入一张或多张图片到应用

5. **验证文件已添加**
   - 查看页面是否显示 "已选择 X 张图片"
   - 查看导出按钮是否可点击

6. **点击导出按钮**
   - 观察浏览器控制台
   - 观察主进程终端输出

7. **收集日志**
   - 复制浏览器控制台的所有输出
   - 复制主进程终端的所有输出
   - 提供给开发者

---

## 9. 常见问题及解决方案

### 问题: electronAPI 未定义
**原因**: Preload 脚本未正确加载
**解决方案**:
- 检查 `src/main/preload.ts` 是否存在
- 检查 `src/main/main.ts` 中的 preload 路径是否正确
- 重新编译: `npm run build:main`

### 问题: 导出按钮灰色（禁用）
**原因**: 没有选择图片或正在处理
**解决方案**:
- 确保已拖入图片
- 等待任何正在进行的处理完成

### 问题: 看不到任何日志
**原因**: 日志级别可能被过滤
**解决方案**:
- 在浏览器 DevTools 中，确保 Console 过滤器设置为 "All levels"
- 检查是否有其他浏览器扩展干扰

### 问题: IPC 消息未收到
**原因**: IPC 处理器未正确注册
**解决方案**:
- 检查 `src/main/main.ts` 中的 `ipcMain.handle()` 调用
- 确保处理器名称与 preload 脚本中的名称匹配

---

## 10. 快速诊断脚本

**在浏览器控制台执行以下脚本进行快速诊断**:

```javascript
console.log('=== BatchPic 诊断 ===');
console.log('1. electronAPI 可用:', !!window.electronAPI);
console.log('2. processImages 可用:', typeof window.electronAPI?.processImages === 'function');
console.log('3. scanFiles 可用:', typeof window.electronAPI?.scanFiles === 'function');
console.log('4. onProcessingProgress 可用:', typeof window.electronAPI?.onProcessingProgress === 'function');

// 测试 IPC 连接
if (window.electronAPI?.processImages) {
  console.log('5. 尝试测试 IPC 连接...');
  window.electronAPI.processImages([], {})
    .then(() => console.log('✓ IPC 连接成功'))
    .catch(err => console.log('✗ IPC 连接失败:', err.message));
}
```

---

## 11. 提交诊断信息

当你完成上述检查后，请提供以下信息:

1. **浏览器控制台输出** (复制粘贴所有日志)
2. **主进程终端输出** (复制粘贴所有日志)
3. **你看到的具体现象** (例如: 按钮无反应、有错误消息等)
4. **你执行的步骤** (例如: 拖入了 3 张 JPG 图片)
5. **系统信息** (macOS/Windows/Linux, Node 版本等)

这样可以帮助快速定位问题！
