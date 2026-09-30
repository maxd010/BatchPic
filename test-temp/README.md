# test-temp/

测试运行产生的临时目录，**其中测试产物不进版本控制**（见根目录 `.gitignore` 的 `/test-temp/*` 与 `!/test-temp/README.md`）。

所有测试产物统一收在这个目录下，避免散落在项目根目录。

## 目录说明

| 子目录 | 产出者 | 内容 |
| --- | --- | --- |
| `pbt/` | `src/__tests__/build-system.property.test.ts` | fast-check 属性测试生成的临时 TS 工程（`test-<timestamp>/`） |
| `script/` | `src/__tests__/script-system.test.ts` | 打包脚本测试的临时工程（`package-error-test/` 等） |
| `script-pbt/` | `src/__tests__/script-system.property.test.ts` | 脚本系统属性测试产物 |
| `package-pbt/` | `src/__tests__/package-system.property.test.ts` | 打包系统属性测试产物 |
| `build/` | `src/__tests__/build-system.test.ts` → `构建前清理功能` | 清理功能测试的 `dist/` 断言对象 |
| `build-error/` | `src/__tests__/build-system.test.ts` → `构建错误处理` | TS 编译错误测试的临时工程 |
| `templates/` | `src/main/__tests__/TemplateManager.test.ts` | 模板存储测试的临时目录 |
| `review/` | 人工（代码评审取证） | 评审报告用的测试基线与原始报告，**非测试自动产出** |

各子目录由对应测试在 `beforeEach`/`afterEach` 中自行创建和清理。
**注意**：每个套件只清理自己的子目录，不要清理整个 `test-temp/` ——
否则会误删其他套件或 `review/` 下的取证材料。

## review/

存放代码评审的取证材料，与测试运行无关，**请勿在清理测试产物时一并删除**：

- `baseline.txt` — 某次全量测试的基线统计（套件/用例数、失败套件清单）
- `jest-report-latest.json` — Jest `--json` 输出的完整报告
- `isolated-*.json / isolated-summary*.txt` — 单个测试套件隔离重跑的取证记录（用于判定失败是否为环境抖动）

评审报告（2026-09-15 / 2026-09-23 两份）已移出仓库，需要原文时从 git 历史取回：
`git log --diff-filter=D --oneline -- docs/` 找到删除提交，再 `git show <提交>^:<路径>`。
本目录下的取证材料不受影响。

## 清理

可以随时整体删除，测试会自行重建需要的子目录；但 `review/` 里是人工取证材料，
删掉后只能重跑测试重新生成。

```powershell
# 只清测试产物，保留 review/
Get-ChildItem test-temp -Directory | Where-Object { $_.Name -ne 'review' } | Remove-Item -Recurse -Force
```
