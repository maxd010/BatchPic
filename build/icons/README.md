# 应用图标资源

本目录包含 BatchPic 应用的图标资源文件。

## 文件说明

- `icon-source.png` - **图标主源文件**（1024x1024、带 alpha 的 PNG）。换图标只需替换它再重新生成。
- `generate-icons.mjs` - **推荐的生成脚本**（跨平台，只用项目已有的 `sharp` 依赖）
- `icon.icns` - macOS 应用图标（**生成产物，勿手改**）
- `icon.ico` - Windows 应用图标（**生成产物，勿手改**）
- `generate-icons.sh` - 旧的生成脚本（需 ImageMagick，且 .icns 只能在 macOS 上生成；已不推荐）

## 图标规格要求

### macOS (.icns)
需要包含以下尺寸:
- 16x16
- 32x32
- 64x64
- 128x128
- 256x256
- 512x512
- 1024x1024 (Retina)

### Windows (.ico)
需要包含以下尺寸:
- 16x16
- 32x32
- 48x48
- 64x64
- 128x128
- 256x256

## 生成图标文件

### 方法 0: 用仓库自带脚本 (推荐)

```bash
node build/icons/generate-icons.mjs
```

只用项目已有的 `sharp` 依赖 —— **不需要 ImageMagick，跨平台，Windows 上也能生成 .icns**。

产物存法与历史文件保持一致，改动前请先明白为什么：

- `icon.ico`：256 用 PNG 存，128/64/48/32/16 用 DIB（BITMAPINFOHEADER + BGRA + AND 掩码）存。
  256 也用 DIB 会让文件暴涨；小尺寸用 PNG 则在老工具里兼容性差。
- `icon.icns`：16/32/64/128/256/512/1024 全部用 PNG 块（`icp4`/`icp5`/`ic07`~`ic10` 及 @2x 别名）。

### 方法 1: 使用在线工具

**生成 .icns (macOS)**
1. 访问 https://cloudconvert.com/png-to-icns
2. 上传 512x512 或 1024x1024 的 PNG 图片
3. 下载生成的 .icns 文件
4. 将文件重命名为 `icon.icns` 并放置在此目录

**生成 .ico (Windows)**
1. 访问 https://cloudconvert.com/png-to-ico
2. 上传 256x256 的 PNG 图片
3. 下载生成的 .ico 文件
4. 将文件重命名为 `icon.ico` 并放置在此目录

### 方法 2: 使用命令行工具

**macOS 用户生成 .icns**

```bash
# 1. 安装 ImageMagick (如果未安装)
brew install imagemagick

# 2. 用主源 PNG 准备 1024x1024（icon-source.png 本身即是这个尺寸）
convert icon-source.png -resize 1024x1024 icon-1024.png

# 3. 创建 iconset 目录
mkdir icon.iconset

# 4. 生成各种尺寸
sips -z 16 16     icon-1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png

# 5. 生成 .icns 文件
iconutil -c icns icon.iconset -o icon.icns

# 6. 清理临时文件
rm -rf icon.iconset icon-1024.png
```

**生成 .ico (跨平台)**

```bash
# 使用 ImageMagick
convert icon-source.png -resize 256x256 -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### 方法 3: 使用 electron-icon-builder (推荐用于 Electron 项目)

```bash
# 1. 安装工具
npm install -g electron-icon-builder

# 2. 准备 1024x1024 的 PNG 图片
convert icon-source.png -resize 1024x1024 icon.png

# 3. 生成所有平台图标
electron-icon-builder --input=./icon.png --output=./

# 4. 清理临时文件
rm icon.png
```

## 设计建议

1. **简洁明了**: 图标应该在小尺寸下也能清晰识别
2. **品牌一致**: 使用与应用 UI 一致的配色方案
3. **避免文字**: 小尺寸下文字难以辨认
4. **高对比度**: 确保在浅色和深色背景下都清晰可见
5. **圆角处理**: macOS 会自动应用圆角,设计时考虑边缘留白

## 验证图标

生成图标后,可以通过以下方式验证:

**macOS**
```bash
# 查看 .icns 文件内容
iconutil -c iconset icon.icns -o test.iconset
ls -la test.iconset/
rm -rf test.iconset
```

**Windows**
- 在 Windows 资源管理器中查看 .ico 文件缩略图
- 使用 IrfanView 等工具打开查看各个尺寸

## 故障排除

### 图标未显示
- 确保文件名完全匹配: `icon.icns` 和 `icon.ico`
- 检查文件权限是否正确
- 清理构建缓存后重新打包

### 图标模糊
- 确保源图片分辨率足够高 (至少 1024x1024)
- 检查是否包含所有必需的尺寸
- 避免使用 JPEG 格式,使用 PNG 保持透明度

### macOS 图标不显示
- 检查 .icns 文件是否包含所有必需尺寸
- 尝试清理 macOS 图标缓存: `sudo rm -rf /Library/Caches/com.apple.iconservices.store`
- 重启 Finder: `killall Finder`

## 参考资源

- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Windows App Icon Guidelines](https://learn.microsoft.com/en-us/windows/apps/design/style/iconography/app-icon-design)
- [Electron Icon Requirements](https://www.electron.build/icons)

## 变更记录

- 2026-09-30：重出图标；删除已废弃的 `icon-source.svg`（最初的占位符图标，自 2026-09-28
  起生成脚本已改读 `icon-source.png`）。
- 2026-09-28：图标源由 `icon-source.svg` 换成 `icon-source.png`，生成脚本改为
  `generate-icons.mjs`（跨平台，只用 sharp）。
