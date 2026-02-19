# BatchPic 导出功能验证清单

## 必须验证的 5 个关键项

### 1️⃣ electronAPI 可用性
```javascript
// 在浏览器控制台执行
window.electronAPI?.processImages
// 应该返回: ƒ processImages(files, params)
```
✅ **验证**: 返回一个函数
❌ **失败**: 返回 undefined 或错误

---

### 2️⃣ 文件已添加
- 拖入图片后，页面应显示 "已选择 X 张图片"
- 导出按钮应该是蓝色且可点击

✅ **验证**: 看到文件数量和可点击的按钮
❌ **失败**: 按钮是灰色或没有显示文件数量

---

### 3️⃣ 前端日志输出
```
点击导出按钮后，浏览器控制台应显示:
Starting export with files: X
Processing params: {...}
```

✅ **验证**: 看到上述日志
❌ **失败**: 没有日志或有错误消息

---

### 4️⃣ IPC 消息接收
```
在运行 npm run dev 的终端中应显示:
Processing images: X files
Parameters: {...}
Output directory created: /path/to/output
```

✅ **验证**: 看到上述日志
❌ **失败**: 没有日志或有错误消息

---

### 5️⃣ 输出目录创建
```bash
ls -la ~/Library/Application\ Support/batchpic/
```

应该看到类似 `output-20260219-171234` 的目录

✅ **验证**: 看到输出目录
❌ **失败**: 目录不存在或为空

---

## 快速诊断脚本

在浏览器控制台执行:

```javascript
(async () => {
  console.log('🔍 BatchPic 诊断开始\n');
  
  // 检查 1: electronAPI
  console.log('1. electronAPI:', !!window.electronAPI ? '✅' : '❌');
  
  // 检查 2: processImages
  console.log('2. processImages:', typeof window.electronAPI?.processImages === 'function' ? '✅' : '❌');
  
  // 检查 3: IPC 连接
  try {
    await window.electronAPI.processImages([], {});
    console.log('3. IPC 连接: ✅');
  } catch (e) {
    console.log('3. IPC 连接: ❌', e.message);
  }
  
  console.log('\n✨ 诊断完成');
})();
```

---

## 如何收集诊断信息

1. **打开 DevTools**: Cmd+Option+I (macOS)
2. **切换到 Console**: 点击 Console 标签
3. **执行诊断脚本**: 复制粘贴上述代码
4. **记录输出**: 截图或复制所有输出
5. **查看主进程日志**: 查看 `npm run dev` 的终端输出

---

## 预期的完整流程

```
1. npm run dev
   ↓
2. 应用启动，Electron 窗口打开
   ↓
3. 拖入图片
   ↓
4. 页面显示 "已选择 X 张图片"
   ↓
5. 点击导出按钮
   ↓
6. 浏览器控制台显示: "Starting export with files: X"
   ↓
7. 主进程终端显示: "Processing images: X files"
   ↓
8. 主进程终端显示: "Output directory created: /path/to/output"
   ↓
9. 浏览器控制台显示: "Export completed: {...}"
   ↓
10. 页面显示完成消息和 "打开输出文件夹" 按钮
```

---

## 如果某个步骤失败

| 失败步骤 | 可能原因 | 检查项 |
|---------|--------|--------|
| 2 | Electron 未启动 | 检查终端是否有错误 |
| 4 | 文件扫描失败 | 检查 FileScanner 实现 |
| 6 | 前端代码错误 | 检查浏览器控制台错误 |
| 7 | IPC 调用失败 | 检查 preload 脚本 |
| 8 | 输出目录创建失败 | 检查 OutputManager 实现 |
| 9 | 图片处理失败 | 检查 ImageProcessor 实现 |

---

## 提交诊断信息时请包含

1. 完整的浏览器控制台输出
2. 完整的主进程终端输出
3. 系统信息 (macOS/Windows/Linux)
4. Node 版本: `node --version`
5. npm 版本: `npm --version`
6. 你拖入的图片信息 (数量、格式、大小)
7. 你看到的具体现象 (按钮无反应、有错误等)
