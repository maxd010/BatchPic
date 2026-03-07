JavaScript 模块体系与技术选型全局规则
1. 模块体系统一规则

本项目所有 JavaScript / TypeScript 代码 必须使用 ES Modules (ESM) 模式。

禁止使用 CommonJS (CJS) 模块系统。

ES Modules 是 ECMAScript 官方标准模块系统，具有静态依赖分析、优化能力强、生态兼容性好等优势，是现代 JavaScript 项目的标准实践。

项目代码必须统一采用以下语法：

import { foo } from './foo.js'
import bar from './bar.js'

export function baz() {}
export default class Example {}

严禁使用以下 CommonJS 语法：

const foo = require('./foo')
module.exports = {}
exports.bar = function(){}
2. 项目配置要求

所有 Node.js 运行环境必须明确声明 ES Modules 模式。

在 package.json 中必须包含：

{
  "type": "module"
}

该配置确保：

.js 文件默认使用 ES Modules

Node.js 与浏览器模块语义保持一致

构建工具能够进行静态依赖分析

3. 文件扩展规则

模块导入必须使用 显式扩展名。

正确示例：

import { helper } from './utils/helper.js'

禁止：

import { helper } from './utils/helper'

原因：

浏览器原生 ESM 需要完整路径

与现代构建工具保持一致

减少运行环境差异

4. 动态加载规则

当需要按需加载模块时，必须使用 ESM 动态导入：

const module = await import('./module.js')

禁止使用：

require('./module')

动态 import() 支持：

代码分割

懒加载

更好的构建优化

5. 构建工具要求

项目构建系统必须基于 原生 ES Modules 优先设计的工具链。

推荐工具：

Vite

Rollup

esbuild

避免依赖过重、历史兼容负担较大的工具链。

6. 依赖库选择原则

引入第三方依赖时必须遵守以下原则：

优先选择：

原生 ESM-first 库

支持 Tree Shaking

维护活跃

文档完整

避免：

仅支持 CommonJS 的库

已停止维护的库

历史兼容包袱较重的库

7. 技术现代化原则

项目应保持技术栈现代化，避免引入过时技术。

禁止引入以下类型技术：

仅支持 CommonJS 的新依赖

已被标准替代的库

不再维护的框架

需要复杂兼容层的历史工具

在技术选型时，应优先采用：

原生 Web 标准

ECMAScript 新特性

模块化、可组合架构

小而专注的工具

8. 架构目标

统一使用 ES Modules 的长期目标包括：

保持代码结构一致性

支持现代构建优化（Tree Shaking、Code Splitting）

提升浏览器原生兼容能力

降低技术债

简化开发与部署流程

9. 例外规则

若必须使用仅提供 CommonJS 的历史依赖，应满足以下条件：

依赖库无可替代方案

使用适配层隔离

在技术文档中记录原因

该类依赖应被视为 技术债务，并计划未来替换。

10. 总体原则

项目技术体系遵循以下原则：

标准优先

简单优先

现代优先

长期维护优先

任何新技术引入，都必须符合上述原则。