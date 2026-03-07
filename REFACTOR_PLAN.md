# BatchPic 目录结构整理计划

## 当前问题

1. **测试文件分散**
   - `src/__tests__/` - 系统级测试
   - `src/main/*.test.ts` - 主进程单元测试
   - `src/renderer/components/*.test.tsx` - 组件测试
   - `src/renderer/context/*.test.tsx` - Context 测试

2. **文档结构混乱**
   - 根目录有独立文档（`AUTO_PROCESS_GUIDE.md`、`PACKAGING_GUIDE.md`）
   - `docs/业务文档/BatchPic/` 有重复内容
   - README 中提到的 `docs/design/` 目录不存在

3. **缺少明确的模块边界**
   - 工具函数没有独立目录
   - 类型定义分散

## 整理方案

### 1. 统一测试文件组织

**目标结构**：
```
src/
├── __tests__/              # 保留：系统级集成测试
│   ├── build-system.test.ts
│   ├── package-system.test.ts
│   └── ...
├── main/
│   ├── __tests__/          # 新建：主进程单元测试
│   │   ├── FileScanner.test.ts
│   │   ├── ImageProcessor.test.ts
│   │   └── ...
│   └── ...
└── renderer/
    ├── components/
    │   ├── __tests__/      # 新建：组件测试
    │   │   ├── DropZone.test.tsx
    │   │   └── ...
    │   └── ...
    └── context/
        ├── __tests__/      # 新建：Context 测试
        │   └── AppContext.test.tsx
        └── ...
```

### 2. 优化文档结构

**目标结构**：
```
docs/
├── README.md               # 文档索引
├── design/                 # 新建：设计文档
│   ├── DESIGN_SYSTEM.md
│   ├── LAYOUT_OPTIMIZATION.md
│   └── UI_OPTIMIZATION_SUMMARY.md
├── development/            # 保留：开发文档
│   ├── SETUP.md
│   └── AUTO_PROCESS_GUIDE.md  # 移动
├── testing/                # 保留：测试文档
│   ├── QUICK_TEST.md
│   └── TROUBLESHOOTING.md
├── deployment/             # 新建：部署文档
│   └── PACKAGING_GUIDE.md  # 移动
├── 业务文档/
│   └── BatchPic/
│       ├── 技术债.md
│       ├── 性能监控实现.md
│       └── 性能优化总结.md
└── 知识沉淀/
    └── Node.js ES模块迁移指南.md
```

### 3. 添加工具函数目录（如需要）

```
src/
├── main/
│   ├── utils/              # 新建：主进程工具函数
│   └── ...
└── renderer/
    ├── utils/              # 新建：渲染进程工具函数
    └── ...
```

## 执行步骤

### 阶段 1：整理测试文件（优先级：高）
- [ ] 创建 `src/main/__tests__/` 目录
- [ ] 移动主进程测试文件
- [ ] 创建 `src/renderer/components/__tests__/` 目录
- [ ] 移动组件测试文件
- [ ] 创建 `src/renderer/context/__tests__/` 目录
- [ ] 移动 Context 测试文件
- [ ] 验证测试仍然可以运行

### 阶段 2：整理文档结构（优先级：中）
- [ ] 创建 `docs/design/` 目录
- [ ] 创建 `docs/deployment/` 目录
- [ ] 移动 `AUTO_PROCESS_GUIDE.md` 到 `docs/development/`
- [ ] 移动 `PACKAGING_GUIDE.md` 到 `docs/deployment/`
- [ ] 更新 README 中的文档链接
- [ ] 删除或合并重复文档

### 阶段 3：优化代码组织（优先级：低）
- [ ] 评估是否需要 utils 目录
- [ ] 如需要，创建并迁移工具函数
- [ ] 更新导入路径

## 风险控制

1. **测试文件移动**：移动后需要更新 Jest 配置（如果有路径相关配置）
2. **文档移动**：需要更新所有文档链接
3. **导入路径**：如果移动代码文件，需要更新所有导入语句

## 验证清单

- [ ] 所有测试通过：`npm test`
- [ ] 应用可以正常启动：`npm run dev`
- [ ] 应用可以正常构建：`npm run build`
- [ ] 文档链接全部有效
- [ ] Git 历史保持清晰（使用 `git mv` 而不是删除+创建）
