# BatchPic 导出功能问题诊断总结

## 问题描述
点击"导出图片"按钮后没有任何反应，无法处理图片。

## 根本原因
导出功能涉及复杂的 IPC 通信链路，任何一个环节失败都会导致无反应。问题可能出在以下任何一个地方：

1. **前端**: electronAPI 未定义或 handleExport 函数未执行
2. **IPC 通信**: preload 脚本未正确加载或 IPC 调用失败
3. **主进程**: IPC 处理器未注册或处理逻辑有错误
4. **文件系统**: 输出目录创建失败
5. **图片处理**: ImageProcessor 处理失败

## 必须验证的 5 个关键项

### ✅ 项目 1: electronAPI 可用性
**验证方法**: 在浏览器控制台执行
```javascript
console.log(window.electronAPI?.processImages);
```
**预期结果**: 应该返回一个函数 `ƒ processImages(files, params)`

### ✅ 项目 2: 文件已正确添加
**验证方法**: 拖入图片后查看页面
**预期结果**: 
- 页面显示 "已选择 X 张图片"
- 导出按钮是蓝色且可点击

### ✅ 项目 3: 前端日志输出
**验证方法**: 打开浏览器 DevTools，点击导出按钮
**预期结果**: 浏览器控制台显示
```
Starting export with files: X
Processing params: {...}
```

### ✅ 项目 4: IPC 消息接收
**验证方法**: 查看运行 `npm run dev` 的终端
**预期结果**: 主进程终端显示
```
Processing images: X files
Parameters: {...}
Output directory created: /path/to/output
```

### ✅ 项目 5: 输出目录创建
**验证方法**: 在终端执行
```bash
ls -la ~/Library/Application\ Support/batchpic/
```
**预期结果**: 看到类似 `output-20260219-171234` 的目录

## 快速诊断步骤

### 第 1 步: 启动应用
```bash
npm run dev
```

### 第 2 步: 打开浏览器 DevTools
- 按 `Cmd+Option+I` (macOS) 或 `Ctrl+Shift+I` (Windows)
- 切换到 "Console" 标签页

### 第 3 步: 执行诊断脚本
在浏览器控制台粘贴并执行:
```javascript
(async () => {
  console.log('🔍 BatchPic 诊断开始\n');
  console.log('1. electronAPI:', !!window.electronAPI ? '✅' : '❌');
  console.log('2. processImages:', typeof window.electronAPI?.processImages === 'function' ? '✅' : '❌');
  try {
    await window.electronAPI.processImages([], {});
    console.log('3. IPC 连接: ✅');
  } catch (e) {
    console.log('3. IPC 连接: ❌', e.message);
  }
  console.log('\n✨ 诊断完成');
})();
```

### 第 4 步: 拖入图片并导出
1. 拖入 1-3 张图片
2. 查看页面是否显示文件数量
3. 点击导出按钮
4. 观察浏览器控制台和主进程终端的日志

### 第 5 步: 检查输出目录
```bash
ls -la ~/Library/Application\ Support/batchpic/
```

## 可用的诊断文档

我已经为你创建了 4 个详细的诊断文档：

1. **VERIFICATION_CHECKLIST.md** - 5 个关键项的验证清单（推荐先看这个）
2. **QUICK_TEST.md** - 快速测试指南，最小化步骤
3. **DIAGNOSTIC_CHECKLIST.md** - 完整的诊断清单，包含所有检查项
4. **TROUBLESHOOTING.md** - 详细的故障排除指南，包含常见问题

## 下一步

1. **按照 VERIFICATION_CHECKLIST.md 中的 5 个关键项进行验证**
2. **执行快速诊断脚本，收集日志输出**
3. **根据失败的项目，查看对应的故障排除指南**
4. **提供诊断结果，我们可以快速定位问题**

## 需要提供的信息

当你完成诊断后，请提供：

1. **浏览器控制台的完整输出** (包括所有日志和错误)
2. **主进程终端的完整输出** (包括所有日志)
3. **诊断脚本的执行结果** (5 个项目的 ✅ 或 ❌)
4. **系统信息**:
   - 操作系统 (macOS/Windows/Linux)
   - Node 版本: `node --version`
   - npm 版本: `npm --version`
5. **你拖入的图片信息** (数量、格式、大小)
6. **你看到的具体现象** (按钮无反应、有错误消息等)

## 预期的完整工作流程

```
1. npm run dev
   ↓
2. Electron 应用启动
   ↓
3. 拖入图片
   ↓
4. 页面显示 "已选择 X 张图片"
   ↓
5. 点击导出按钮
   ↓
6. 浏览器控制台: "Starting export with files: X"
   ↓
7. 主进程终端: "Processing images: X files"
   ↓
8. 主进程终端: "Output directory created: /path/to/output"
   ↓
9. 浏览器控制台: "Export completed: {...}"
   ↓
10. 页面显示完成消息和 "打开输出文件夹" 按钮
```

## 常见问题速查表

| 症状 | 可能原因 | 检查项 |
|------|--------|--------|
| electronAPI 未定义 | Preload 脚本未加载 | 检查 src/main/preload.ts |
| 导出按钮灰色 | 没有选择图片 | 拖入图片后查看页面 |
| 没有前端日志 | handleExport 未执行 | 检查浏览器控制台错误 |
| 没有 IPC 日志 | IPC 调用失败 | 检查 preload 脚本名称 |
| 没有输出目录 | 输出目录创建失败 | 检查 OutputManager 实现 |

## 获取帮助

如果你已经按照上述步骤进行诊断，但仍然无法解决问题，请：

1. 查看 TROUBLESHOOTING.md 中的常见问题部分
2. 查看 DIAGNOSTIC_CHECKLIST.md 中的详细检查项
3. 提供完整的诊断信息，我们可以快速定位问题

记住：**详细的日志输出是快速解决问题的关键！**
