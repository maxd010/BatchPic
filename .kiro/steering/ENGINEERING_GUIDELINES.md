# JavaScript 项目工程指导原则

> 适用于所有新建 JavaScript/TypeScript 项目的通用工程规范

---

## 一、模块系统规范

### 1.1 统一使用 ES Modules (ESM)

**核心原则**：所有 JavaScript/TypeScript 代码必须使用 ES Modules，禁止使用 CommonJS。

**Why**：
- ECMAScript 官方标准，生态兼容性好
- 支持静态依赖分析，构建优化能力强
- 浏览器原生支持，运行时性能更优
- Tree Shaking、Code Splitting 等现代优化依赖 ESM

**正确写法**：
```javascript
// 导入
import { foo } from './foo.js'
import bar from './bar.js'
import * as utils from './utils.js'

// 导出
export function baz() {}
export const config = {}
export default class Example {}
```

**禁止写法**：
```javascript
// ❌ CommonJS 语法
const foo = require('./foo')
module.exports = {}
exports.bar = function() {}
```

### 1.2 项目配置要求

**package.json 必须声明**：
```json
{
  "type": "module"
}
```

**作用**：
- `.js` 文件默认使用 ES Modules
- Node.js 与浏览器模块语义保持一致
- 构建工具能够进行静态依赖分析

### 1.3 文件扩展名规则

**必须使用显式扩展名**：
```javascript
// ✅ 正确
import { helper } from './utils/helper.js'

// ❌ 错误
import { helper } from './utils/helper'
```

**Why**：
- 浏览器原生 ESM 需要完整路径
- 与现代构建工具保持一致
- 减少运行环境差异
- 避免模块解析歧义

### 1.4 动态加载规则

**使用 ESM 动态导入**：
```javascript
// ✅ 正确
const module = await import('./module.js')

// ❌ 错误
const module = require('./module')
```

**优势**：
- 支持代码分割 (Code Splitting)
- 支持懒加载 (Lazy Loading)
- 更好的构建优化
- 异步加载，不阻塞主线程

---

## 二、构建工具选择

### 2.1 推荐工具链

**优先选择原生 ESM 优先的现代工具**：

| 工具 | 适用场景 | 特点 |
|------|---------|------|
| **Vite** | 现代 Web 应用 | 极速冷启动、HMR、开箱即用 |
| **Rollup** | 库开发、打包 | 专注打包、Tree Shaking 优秀 |
| **esbuild** | 高性能构建 | Go 编写、速度极快 |

**避免**：
- 配置复杂、历史包袱重的工具
- 不支持 ESM 的构建系统
- 已停止维护的工具链

### 2.2 构建配置原则

- 优先使用工具默认配置
- 配置文件保持简洁
- 避免过度定制
- 文档化特殊配置原因

---

## 三、依赖管理原则

### 3.1 依赖选择标准

**优先选择**：
- ✅ 原生 ESM-first 库
- ✅ 支持 Tree Shaking
- ✅ 维护活跃（近 6 个月有更新）
- ✅ 文档完整
- ✅ TypeScript 类型支持
- ✅ 社区认可度高

**避免**：
- ❌ 仅支持 CommonJS 的库
- ❌ 已停止维护的库（>2 年无更新）
- ❌ 历史兼容包袱重的库
- ❌ 无文档或文档过时
- ❌ 体积过大且无法 Tree Shake

### 3.2 依赖引入流程

**引入新依赖前必须评估**：

1. **必要性**：是否真的需要？能否用原生 API 实现？
2. **替代方案**：是否有更轻量/现代的替代品？
3. **维护状态**：最后更新时间、Issue 响应速度
4. **体积影响**：打包后体积增加多少？
5. **安全性**：是否有已知漏洞？

**评估模板**：
```markdown
## 依赖引入评估：[包名]

- **用途**：解决什么问题
- **替代方案**：考虑过哪些方案
- **选择理由**：为什么选这个
- **体积**：打包后增加 XX KB
- **维护状态**：最后更新 YYYY-MM-DD
- **风险**：已知问题或限制
```

### 3.3 依赖更新策略

- 定期检查依赖更新（建议每月一次）
- 优先更新安全补丁
- 主版本更新前评估 Breaking Changes
- 使用 `package-lock.json` 或 `pnpm-lock.yaml` 锁定版本

---

## 四、代码组织规范

### 4.1 目录结构

**推荐结构**（根据项目类型调整）：
```
project/
├── src/                # 源代码
│   ├── components/     # 组件
│   ├── utils/          # 工具函数
│   ├── services/       # 业务逻辑/API
│   ├── types/          # TypeScript 类型定义
│   └── main.js         # 入口文件
├── public/             # 静态资源
├── tests/              # 测试文件
├── docs/               # 文档
├── package.json
└── vite.config.js      # 构建配置
```

### 4.2 文件命名规范

- **组件**：PascalCase（`UserProfile.jsx`）
- **工具函数**：camelCase（`formatDate.js`）
- **常量**：UPPER_SNAKE_CASE（`API_BASE_URL.js`）
- **类型定义**：PascalCase（`User.types.ts`）

### 4.3 导入顺序

```javascript
// 1. 外部依赖
import React from 'react'
import { useState } from 'react'

// 2. 内部模块（绝对路径）
import { Button } from '@/components/Button'

// 3. 相对路径导入
import { helper } from './utils/helper.js'
import styles from './styles.module.css'

// 4. 类型导入（TypeScript）
import type { User } from './types.js'
```

---

## 五、技术选型原则

### 5.1 总体原则

项目技术体系遵循以下优先级：

1. **标准优先**：优先使用 Web 标准、ECMAScript 标准
2. **简单优先**：能用简单方案解决就不用复杂方案
3. **现代优先**：优先采用现代技术，避免历史包袱
4. **维护优先**：选择维护活跃、社区健康的技术

### 5.2 技术选型决策模板

```markdown
## 技术选型：[技术名称]

### 背景
- 要解决什么问题
- 当前痛点

### 方案对比
| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| A    |      |      |         |
| B    |      |      |         |

### 决策
- **选择**：方案 X
- **理由**：...
- **风险**：...
- **备选方案**：如果 X 不行，考虑 Y

### 实施计划
- [ ] 步骤 1
- [ ] 步骤 2
```

### 5.3 禁止引入的技术类型

- ❌ 仅支持 CommonJS 的新依赖
- ❌ 已被标准替代的库（如 Moment.js → 原生 Intl/date-fns）
- ❌ 不再维护的框架
- ❌ 需要复杂兼容层的历史工具
- ❌ 过度封装、黑盒化的工具

---

## 六、代码质量标准

### 6.1 基本要求

- **可读性**：代码即文档，命名清晰，逻辑简单
- **可维护性**：模块职责单一，耦合度低
- **可测试性**：函数纯度高，依赖可注入
- **性能**：避免不必要的计算和渲染
- **安全性**：输入验证，输出转义

### 6.2 代码审查清单

**提交代码前自查**：
- [ ] 是否有未使用的导入？
- [ ] 是否有 console.log 遗留？
- [ ] 是否有硬编码的配置？
- [ ] 是否处理了错误情况？
- [ ] 是否考虑了边界条件？
- [ ] 是否有重复代码可以抽取？
- [ ] 命名是否清晰表达意图？

---

## 七、例外处理机制

### 7.1 例外规则

若必须使用不符合规范的技术（如 CommonJS 依赖），需满足：

1. **无可替代方案**：经过充分调研，确实无替代品
2. **使用适配层隔离**：不让历史技术污染新代码
3. **文档记录**：在技术文档中说明原因和影响
4. **标记技术债**：计划未来替换时间

### 7.2 技术债管理

**技术债文档模板**：
```markdown
## 技术债：[描述]

- **引入时间**：YYYY-MM-DD
- **原因**：为什么引入
- **影响范围**：影响哪些模块
- **替换方案**：未来如何解决
- **优先级**：高/中/低
- **预计解决时间**：YYYY-MM
```

---

## 八、架构目标

### 8.1 长期目标

- **一致性**：代码风格、模块组织保持一致
- **可优化**：支持 Tree Shaking、Code Splitting 等现代优化
- **可扩展**：易于添加新功能，不破坏现有结构
- **低债务**：技术债务可控，定期清理
- **高效率**：开发、构建、部署流程简洁高效

### 8.2 架构演进原则

- **渐进式**：避免大规模重写，小步迭代
- **可回滚**：重要变更可快速回退
- **有度量**：用数据驱动架构决策（性能、体积、开发效率）
- **有文档**：架构决策有记录，方便回溯

---

## 九、最佳实践

### 9.1 性能优化

- 使用动态导入实现代码分割
- 避免不必要的依赖引入
- 使用 Tree Shaking 移除死代码
- 图片、字体等资源按需加载
- 使用 CDN 加速静态资源

### 9.2 安全实践

- 输入验证和清理
- 输出转义，防止 XSS
- 使用 HTTPS
- 敏感信息不提交到代码库
- 定期更新依赖，修复安全漏洞

### 9.3 开发体验

- 使用 ESLint + Prettier 统一代码风格
- 配置 Git Hooks 自动检查
- 使用 TypeScript 提升类型安全
- 编写清晰的 README 和注释
- 提供开发环境快速启动脚本

---

## 十、检查清单

### 新项目启动检查

- [ ] `package.json` 包含 `"type": "module"`
- [ ] 选择了现代构建工具（Vite/Rollup/esbuild）
- [ ] 配置了代码格式化工具（Prettier）
- [ ] 配置了代码检查工具（ESLint）
- [ ] 建立了清晰的目录结构
- [ ] 编写了 README 文档
- [ ] 配置了 Git 忽略文件

### 代码提交检查

- [ ] 所有导入使用 ESM 语法
- [ ] 导入路径包含文件扩展名
- [ ] 无 CommonJS 语法残留
- [ ] 无未使用的导入和变量
- [ ] 代码通过 ESLint 检查
- [ ] 代码格式符合 Prettier 规范

---

**版本**：v1.0  
**最后更新**：2026-03-07  
**适用范围**：所有新建 JavaScript/TypeScript 项目
