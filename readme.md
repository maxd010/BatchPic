# BatchPic

图片交付准备工具 - 快速批量处理图片以满足交付要求

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **React** - UI 框架
- **TypeScript** - 类型安全
- **Sharp** - 高性能图片处理（基于 libvips）
- **Jest** - 测试框架
- **fast-check** - 基于属性的测试

## 开发

### 安装依赖

```bash
npm install
```

### 运行开发模式

```bash
npm run dev
```

### 运行测试

```bash
npm test
```

### 构建应用

```bash
npm run build
npm run package
```

## 项目结构

```
batchpic/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── main.ts
│   │   └── preload.ts
│   └── renderer/       # React 渲染进程
│       ├── main.tsx
│       ├── App.tsx
│       └── types/
├── dist/               # 构建输出
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 功能特性

- 拖放文件和文件夹
- 批量调整大小（保持宽高比）
- 批量压缩
- 格式转换（jpg、png、webp）
- 处理模板保存和重用
- 单窗口界面
- 本地处理（无需上传）

## 📚 文档

完整的项目文档请访问 [文档中心](docs/README.md)。

### 快速链接

- **设计文档**
  - [设计系统规范](docs/design/DESIGN_SYSTEM.md)
  - [布局优化说明](docs/design/LAYOUT_OPTIMIZATION.md)
  - [UI 优化总结](docs/design/UI_OPTIMIZATION_SUMMARY.md)

- **开发文档**
  - [开发环境配置](docs/development/SETUP.md)

- **测试文档**
  - [快速测试指南](docs/testing/QUICK_TEST.md)
  - [故障排除](docs/testing/TROUBLESHOOTING.md)
