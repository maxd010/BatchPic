# BatchPic 快速测试指南

## 最小化测试步骤

### 步骤 1: 启动应用
```bash
npm run dev
```

### 步骤 2: 打开浏览器控制台
- 按 `Cmd+Option+I` (macOS) 或 `Ctrl+Shift+I` (Windows)
- 切换到 "Console" 标签页

### 步骤 3: 验证 IPC 连接
在控制台粘贴并执行:
```javascript
// 快速诊断脚本
(async () => {
  console.log('🔍 开始诊断...\n');
  
  // 1. 检查 electronAPI
  console.log('1️⃣  检查 electronAPI:');
  if (!window.electronAPI) {
    console.error('❌ electronAPI 未定义!');
    return;
  }
  console.log('✅ electronAPI 已定义');
  
  // 2. 检查 processImages 方法
  console.log('\n2️⃣  检查 processImages 方法:');
  if (typeof window.electronAPI.processImages !== 'function') {
    console.error('❌ processImages 不是函数!');
    return;
  }
  console.log('✅ processImages 是函数');
  
  // 3. 测试空调用
  console.log('\n3️⃣  测试空调用 processImages([]):');
  try {
    const result = await window.electronAPI.processImages([], {});
    console.log('✅ IPC 调用成功');
    console.log('返回值:', result);
  } catch (error) {
    console.error('❌ IPC 调用失败:', error.message);
    console.error('完整错误:', error);
  }
  
  console.log('\n✨ 诊断完成');
})();
```

### 步骤 4: 查看主进程输出
- 查看运行 `npm run dev` 的终端
- 应该看到类似的日志:
```
Processing images: 0 files
Parameters: {}
Output directory created: /path/to/output
```

### 步骤 5: 拖入图片并导出
1. 从文件管理器拖入 1-3 张图片
2. 查看页面是否显示 "已选择 X 张图片"
3. 点击 "导出图片" 按钮
4. 观察:
   - 浏览器控制台是否有日志
   - 主进程终端是否有日志
   - 按钮是否显示进度

---

## 预期的日志输出

### 浏览器控制台应该显示:
```
Starting export with files: 3
Processing params: {resize: undefined, compression: {...}, format: undefined}
Export completed: {result: {...}, outputDirectory: '/path/to/output'}
```

### 主进程终端应该显示:
```
Processing images: 3 files
Parameters: {resize: undefined, compression: {...}, format: undefined}
Output directory created: /Users/martin/Library/Application Support/batchpic/output-20260219-171234
Processing progress: 33%
Processing progress: 66%
Processing progress: 100%
Processing completed: {successful: [...], failed: [], totalTime: 1234}
```

---

## 如果没有看到日志

### 检查清单:
- [ ] Electron DevTools 是否打开?
- [ ] 是否在正确的标签页 (Console)?
- [ ] 是否拖入了图片?
- [ ] 导出按钮是否可点击 (不是灰色)?
- [ ] 是否等待了足够的时间?

### 常见原因:
1. **electronAPI 未定义** → Preload 脚本未加载
2. **按钮无反应** → 没有拖入图片或 IPC 调用失败
3. **没有日志** → 日志被过滤或应用崩溃

---

## 获取完整的错误信息

如果出现错误，执行以下命令获取更详细的信息:

```javascript
// 在浏览器控制台执行
window.electronAPI.processImages([], {})
  .then(result => {
    console.log('成功:', result);
  })
  .catch(error => {
    console.error('错误名称:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('完整错误对象:', error);
  });
```

---

## 下一步

根据诊断结果:

1. **如果 electronAPI 未定义** → 检查 preload 脚本
2. **如果 IPC 调用失败** → 检查主进程的 IPC 处理器
3. **如果没有输出目录** → 检查 OutputManager 实现
4. **如果处理失败** → 检查 ImageProcessor 实现

提供诊断结果，我们可以快速定位问题!
