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
