# 应用图标资源

本目录包含 BatchPic 应用的图标资源文件。

## 文件说明

- `icon-source.svg` - 图标源文件 (SVG 格式)
- `icon.icns` - macOS 应用图标 (需要生成)
- `icon.ico` - Windows 应用图标 (需要生成)

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

### 方法 1: 使用在线工具 (推荐)

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

# 2. 从 SVG 生成 PNG
convert icon-source.svg -resize 1024x1024 icon-1024.png

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
convert icon-source.svg -resize 256x256 -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### 方法 3: 使用 electron-icon-builder (推荐用于 Electron 项目)

```bash
# 1. 安装工具
npm install -g electron-icon-builder

# 2. 准备 1024x1024 的 PNG 图片
convert icon-source.svg -resize 1024x1024 icon.png

# 3. 生成所有平台图标
electron-icon-builder --input=./icon.png --output=./

# 4. 清理临时文件
rm icon.png
```

## 占位符图标

当前目录包含一个基本的占位符 SVG 图标 (`icon-source.svg`)。在正式发布前,请替换为您的正式应用图标。

占位符图标设计:
- 紫色背景 (#4F46E5)
- 白色图片框架
- 山峰和太阳图案
- 底部三个点表示"批量"处理

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
