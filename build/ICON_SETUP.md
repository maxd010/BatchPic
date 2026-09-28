# 图标资源配置完成

## 任务状态

✅ **任务 2.4: 准备应用图标资源** - 已完成

## 已完成的工作

### 1. 目录结构
```
build/
└── icons/
    ├── icon-source.png     # 图标主源文件 (1024x1024, 带 alpha)
    ├── generate-icons.mjs  # 生成脚本 (推荐, 跨平台, 用 sharp)
    ├── generate-icons.sh   # 生成脚本 (旧, 需 ImageMagick + macOS)
    ├── icon.icns           # macOS 应用图标 (生成产物)
    ├── icon.ico            # Windows 应用图标 (生成产物)
    ├── icon-source.svg     # 早期占位符图标的 SVG 源 (已废弃)
    └── README.md           # 详细使用文档
```

### 2. 生成的图标文件

**macOS 图标 (icon.icns)**
- 格式: Apple Icon Image (.icns)
- 大小: 约 1087KB
- 包含尺寸: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- 状态: ✅ 已生成并验证

**Windows 图标 (icon.ico)**
- 格式: Windows Icon (.ico)
- 大小: 约 144KB
- 包含尺寸: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256（256 用 PNG 存，其余用 DIB）
- 状态: ✅ 已生成并验证

### 3. electron-builder 配置

配置文件 `electron-builder.json5` 已正确引用图标路径:

```json5
mac: {
  icon: "build/icons/icon.icns",
  // ...
},
win: {
  icon: "build/icons/icon.ico",
  // ...
}
```

## 关于旧的占位符图标

目录里还留着一份最初的占位符图标 `icon-source.svg`（紫色背景 #4F46E5、白色图片框架、
山峰与太阳、底部三个点表示「批量」）。**已由 `icon-source.png` 取代**，保留仅作历史记录，
生成脚本已改为读 PNG。

## 后续步骤

### 替换图标

1. **准备源图片**
   - 尺寸: 1024x1024 像素
   - 格式: PNG（带透明通道）
   - 设计要求: 简洁、高对比度、边缘留白

2. **替换源文件**

   ```bash
   # 用新图覆盖 build/icons/icon-source.png 即可
   ```

3. **重新生成图标**

   ```bash
   node build/icons/generate-icons.mjs
   ```

### 验证图标

执行打包命令验证图标显示:

```bash
# 打包 macOS 版本
npm run package:mac

# 打包 Windows 版本
npm run package:win
```

## 技术说明

### 图标生成工具

**当前** `generate-icons.mjs` 使用的工具:
- **sharp**: 缩放源图并编码 PNG（项目已有依赖，无需额外安装，Windows 上也能出 .icns）

旧的 `generate-icons.sh` 使用的工具（已不推荐）:
- **ImageMagick** (`convert`): 缩放并生成多尺寸图 / .ico
- **iconutil** (macOS): 打包 PNG 为 .icns 文件

### 图标规格

符合 electron-builder 和各平台要求:
- macOS: 包含 Retina 显示屏所需的 @2x 尺寸
- Windows: 包含从任务栏到大图标的所有常用尺寸
- 格式正确: 通过 `file` 命令验证

## 相关文档

- `build/icons/README.md` - 详细的图标生成和替换指南
- `electron-builder.json5` - 打包配置文件
- `.kiro/specs/app-packaging-release/requirements.md` - 需求文档 (Requirement 2.3)

## 验证清单

- [x] 创建 build/icons/ 目录
- [x] 生成 macOS 图标 (icon.icns)
- [x] 生成 Windows 图标 (icon.ico)
- [x] 验证图标文件格式正确
- [x] 确认 electron-builder 配置引用正确
- [x] 提供图标替换文档和工具
- [x] 提供跨平台生成脚本 (generate-icons.mjs，2026-09-28 新增)
- [x] 图标文件被 Git 正确追踪

---

**创建时间**: 2024-03-07  
**最后更新**: 2026-09-28（图标源由 `icon-source.svg` 换成 `icon-source.png`，重出 ico/icns）  
**任务编号**: 2.4  
**状态**: ✅ 完成
