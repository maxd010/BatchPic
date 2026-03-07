#!/bin/bash

# BatchPic 图标生成脚本
# 从 SVG 源文件生成 macOS (.icns) 和 Windows (.ico) 图标

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🎨 BatchPic 图标生成工具"
echo "=========================="
echo ""

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    if ! command -v convert &> /dev/null; then
        missing_deps+=("ImageMagick")
    fi
    
    if ! command -v iconutil &> /dev/null && [[ "$OSTYPE" == "darwin"* ]]; then
        echo "⚠️  警告: iconutil 未找到 (macOS 系统工具)"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo "❌ 缺少依赖: ${missing_deps[*]}"
        echo ""
        echo "请安装 ImageMagick:"
        echo "  macOS:   brew install imagemagick"
        echo "  Ubuntu:  sudo apt-get install imagemagick"
        echo "  Windows: 从 https://imagemagick.org/script/download.php 下载"
        exit 1
    fi
}

# 生成 PNG 图片
generate_png() {
    local size=$1
    local output=$2
    
    echo "  生成 ${size}x${size} PNG..."
    convert icon-source.svg -resize ${size}x${size} -background none "$output"
}

# 生成 macOS .icns 文件
generate_icns() {
    echo ""
    echo "📱 生成 macOS 图标 (icon.icns)..."
    
    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo "⚠️  跳过: 仅在 macOS 上支持生成 .icns 文件"
        echo "   请在 macOS 系统上运行此脚本,或使用在线工具生成"
        return
    fi
    
    # 创建临时目录
    mkdir -p icon.iconset
    
    # 生成各种尺寸
    generate_png 16 icon.iconset/icon_16x16.png
    generate_png 32 icon.iconset/icon_16x16@2x.png
    generate_png 32 icon.iconset/icon_32x32.png
    generate_png 64 icon.iconset/icon_32x32@2x.png
    generate_png 128 icon.iconset/icon_128x128.png
    generate_png 256 icon.iconset/icon_128x128@2x.png
    generate_png 256 icon.iconset/icon_256x256.png
    generate_png 512 icon.iconset/icon_256x256@2x.png
    generate_png 512 icon.iconset/icon_512x512.png
    generate_png 1024 icon.iconset/icon_512x512@2x.png
    
    # 生成 .icns 文件
    echo "  打包为 .icns 文件..."
    iconutil -c icns icon.iconset -o icon.icns
    
    # 清理临时文件
    rm -rf icon.iconset
    
    echo "✅ macOS 图标生成完成: icon.icns"
}

# 生成 Windows .ico 文件
generate_ico() {
    echo ""
    echo "🪟 生成 Windows 图标 (icon.ico)..."
    
    # 使用 ImageMagick 生成包含多个尺寸的 .ico 文件
    convert icon-source.svg \
        -resize 256x256 \
        -define icon:auto-resize=256,128,64,48,32,16 \
        icon.ico
    
    echo "✅ Windows 图标生成完成: icon.ico"
}

# 验证生成的文件
verify_icons() {
    echo ""
    echo "🔍 验证生成的图标..."
    
    if [ -f "icon.icns" ]; then
        local size=$(du -h icon.icns | cut -f1)
        echo "  ✓ icon.icns ($size)"
    else
        echo "  ✗ icon.icns 未生成"
    fi
    
    if [ -f "icon.ico" ]; then
        local size=$(du -h icon.ico | cut -f1)
        echo "  ✓ icon.ico ($size)"
    else
        echo "  ✗ icon.ico 未生成"
    fi
}

# 主流程
main() {
    # 检查源文件
    if [ ! -f "icon-source.svg" ]; then
        echo "❌ 错误: 找不到 icon-source.svg"
        echo "   请确保在 build/icons/ 目录下运行此脚本"
        exit 1
    fi
    
    # 检查依赖
    check_dependencies
    
    # 生成图标
    generate_icns
    generate_ico
    
    # 验证结果
    verify_icons
    
    echo ""
    echo "🎉 图标生成完成!"
    echo ""
    echo "下一步:"
    echo "  1. 检查生成的图标文件"
    echo "  2. 运行 'npm run package' 打包应用"
    echo "  3. 验证打包后的应用图标显示正确"
}

main
