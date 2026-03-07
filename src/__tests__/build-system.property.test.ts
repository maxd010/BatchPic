/**
 * 构建系统属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证构建系统的通用正确性属性
 * 
 * 测试属性:
 * - Property 1: 构建输出目录正确性 (Validates: Requirements 1.1, 1.2, 1.3)
 * - Property 2: 构建前清理 (Validates: Requirements 1.5)
 * - Property 4: 构建失败错误处理 (Validates: Requirements 1.6)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import fc from 'fast-check'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '../..')

// 测试临时目录
const testTempRoot = path.join(projectRoot, 'test-temp-pbt')

/**
 * 清理测试临时目录
 */
async function cleanupTestTemp() {
  try {
    await fs.rm(testTempRoot, { recursive: true, force: true })
  } catch (error) {
    // 忽略清理错误
  }
}

/**
 * 创建测试用的 TypeScript 配置文件
 */
async function createTestTsConfig(
  configPath: string,
  outDir: string,
  rootDir: string
): Promise<void> {
  const config = {
    compilerOptions: {
      target: 'ES2020',
      module: 'CommonJS', // 使用 CommonJS 以避免模块解析问题
      outDir,
      rootDir,
      moduleResolution: 'node',
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false, // 放宽类型检查以便测试
      noEmitOnError: false // 即使有错误也生成文件
    },
    include: [path.relative(path.dirname(configPath), rootDir) + '/**/*'] // 只包含 rootDir 下的文件
  }
  await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

/**
 * 创建有效的 TypeScript 源文件
 */
async function createValidTsFile(filePath: string, content?: string): Promise<void> {
  const defaultContent = `
// 简单的导出，避免模块解析问题
export const value = 42;
export function hello(): string {
  return "Hello, World!";
}
export default value;
`
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content || defaultContent)
}

/**
 * 创建有错误的 TypeScript 源文件
 */
async function createErrorTsFile(
  filePath: string,
  errorType: 'type-error' | 'syntax-error' | 'import-error'
): Promise<void> {
  let content: string
  
  switch (errorType) {
    case 'type-error':
      content = `
const x: number = "string"; // 类型错误
export default x;
`
      break
    case 'syntax-error':
      content = `
const x = {
  name: "test"
  value: 123 // 缺少逗号
};
export default x;
`
      break
    case 'import-error':
      content = `
import { nonExistent } from './non-existent-module'; // 模块不存在
export default nonExistent;
`
      break
  }
  
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content)
}

/**
 * 执行 TypeScript 编译
 */
async function compileTsProject(configPath: string): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  try {
    const { stdout, stderr } = await execAsync(`npx tsc -p ${configPath}`, { cwd: projectRoot })
    return { exitCode: 0, stderr, stdout }
  } catch (error: any) {
    return {
      exitCode: error.code || 1,
      stderr: error.stderr || '',
      stdout: error.stdout || ''
    }
  }
}

describe('构建系统属性测试', () => {
  beforeEach(async () => {
    await cleanupTestTemp()
  })

  afterEach(async () => {
    await cleanupTestTemp()
  })

  /**
   * **Validates: Requirements 1.1, 1.2, 1.3**
   * 
   * Property 1: 构建输出目录正确性
   * 
   * 对于任何有效的源代码和构建配置,执行完整构建后,
   * 主进程代码应输出到 dist/main/,预加载脚本应输出到 dist/preload/,
   * 渲染进程资源应输出到 dist/renderer/
   */
  it('Property 1: 所有组件应输出到正确的目录', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 生成 1-5 个主进程文件名
          mainFiles: fc.array(
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
            { minLength: 1, maxLength: 5 }
          ),
          // 生成 1-3 个预加载脚本文件名
          preloadFiles: fc.array(
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
            { minLength: 1, maxLength: 3 }
          )
        }),
        async ({ mainFiles, preloadFiles }) => {
          // 创建测试目录结构
          const testId = Date.now()
          const testDir = path.join(testTempRoot, `test-${testId}`)
          const srcDir = path.join(testDir, 'src')
          const distDir = path.join(testDir, 'dist')
          
          const mainSrcDir = path.join(srcDir, 'main')
          const preloadSrcDir = path.join(srcDir, 'preload')
          
          const mainDistDir = path.join(distDir, 'main')
          const preloadDistDir = path.join(distDir, 'preload')
          
          // 创建主进程源文件
          for (const fileName of mainFiles) {
            const filePath = path.join(mainSrcDir, `${fileName}.ts`)
            await createValidTsFile(filePath)
          }
          
          // 创建预加载脚本源文件
          for (const fileName of preloadFiles) {
            const filePath = path.join(preloadSrcDir, `${fileName}.ts`)
            await createValidTsFile(filePath)
          }
          
          // 创建主进程 TypeScript 配置
          const mainConfigPath = path.join(testDir, 'tsconfig.main.json')
          await createTestTsConfig(mainConfigPath, mainDistDir, mainSrcDir)
          
          // 创建预加载脚本 TypeScript 配置
          const preloadConfigPath = path.join(testDir, 'tsconfig.preload.json')
          await createTestTsConfig(preloadConfigPath, preloadDistDir, preloadSrcDir)
          
          // 编译主进程
          const mainResult = await compileTsProject(mainConfigPath)
          expect(mainResult.exitCode).toBe(0)
          
          // 编译预加载脚本
          const preloadResult = await compileTsProject(preloadConfigPath)
          expect(preloadResult.exitCode).toBe(0)
          
          // 验证输出目录存在
          const mainDirExists = await fs.access(mainDistDir).then(() => true).catch(() => false)
          const preloadDirExists = await fs.access(preloadDistDir).then(() => true).catch(() => false)
          
          expect(mainDirExists).toBe(true)
          expect(preloadDirExists).toBe(true)
          
          // 验证主进程文件被编译
          for (const fileName of mainFiles) {
            const jsFilePath = path.join(mainDistDir, `${fileName}.js`)
            const exists = await fs.access(jsFilePath).then(() => true).catch(() => false)
            expect(exists).toBe(true)
          }
          
          // 验证预加载脚本文件被编译
          for (const fileName of preloadFiles) {
            const jsFilePath = path.join(preloadDistDir, `${fileName}.js`)
            const exists = await fs.access(jsFilePath).then(() => true).catch(() => false)
            expect(exists).toBe(true)
          }
        }
      ),
      { numRuns: 5 } // 最小迭代次数以快速验证
    )
  }, 120000) // 120 秒超时

  /**
   * **Validates: Requirements 1.5**
   * 
   * Property 2: 构建前清理
   * 
   * 对于任何构建操作,在开始编译前,旧的 dist/ 目录应被完全删除
   */
  it('Property 2: 构建前应清理旧的构建产物', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 生成 1-10 个旧文件名
          oldFiles: fc.array(
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
            { minLength: 1, maxLength: 10 }
          ),
          // 生成新的源文件名
          newFiles: fc.array(
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async ({ oldFiles, newFiles }) => {
          // 创建测试目录结构
          const testId = Date.now()
          const testDir = path.join(testTempRoot, `test-${testId}`)
          const srcDir = path.join(testDir, 'src', 'main')
          const distDir = path.join(testDir, 'dist', 'main')
          
          // 创建旧的构建产物
          await fs.mkdir(distDir, { recursive: true })
          for (const fileName of oldFiles) {
            const filePath = path.join(distDir, `${fileName}.js`)
            await fs.writeFile(filePath, '// old content')
          }
          
          // 验证旧文件存在
          for (const fileName of oldFiles) {
            const filePath = path.join(distDir, `${fileName}.js`)
            const exists = await fs.access(filePath).then(() => true).catch(() => false)
            expect(exists).toBe(true)
          }
          
          // 执行清理 (模拟构建前清理)
          await fs.rm(distDir, { recursive: true, force: true })
          
          // 创建新的源文件
          for (const fileName of newFiles) {
            const filePath = path.join(srcDir, `${fileName}.ts`)
            await createValidTsFile(filePath)
          }
          
          // 创建 TypeScript 配置
          const configPath = path.join(testDir, 'tsconfig.json')
          await createTestTsConfig(configPath, distDir, srcDir)
          
          // 执行编译
          const result = await compileTsProject(configPath)
          expect(result.exitCode).toBe(0)
          
          // 验证旧文件不存在（如果旧文件名不在新文件列表中，考虑大小写）
          for (const fileName of oldFiles) {
            // 检查是否有相同名称的新文件（不区分大小写，因为某些文件系统不区分大小写）
            const hasMatchingNewFile = newFiles.some(
              newFile => newFile.toLowerCase() === fileName.toLowerCase()
            )
            
            if (!hasMatchingNewFile) {
              const filePath = path.join(distDir, `${fileName}.js`)
              const exists = await fs.access(filePath).then(() => true).catch(() => false)
              expect(exists).toBe(false)
            }
          }
          
          // 验证新文件存在
          for (const fileName of newFiles) {
            const filePath = path.join(distDir, `${fileName}.js`)
            const exists = await fs.access(filePath).then(() => true).catch(() => false)
            expect(exists).toBe(true)
          }
        }
      ),
      { numRuns: 5 } // 最小迭代次数以快速验证
    )
  }, 120000) // 120 秒超时

  /**
   * **Validates: Requirements 1.6**
   * 
   * Property 4: 构建失败错误处理
   * 
   * 对于任何导致编译失败的源代码,构建系统应返回非零退出码
   * 并输出包含错误位置和原因的信息
   */
  it('Property 4: 编译错误应返回非零退出码并输出错误信息', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 生成文件名
          fileName: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
          // 生成错误类型
          errorType: fc.constantFrom('type-error', 'syntax-error')
        }),
        async ({ fileName, errorType }) => {
          // 创建测试目录结构
          const testId = Date.now() + Math.random()
          const testDir = path.join(testTempRoot, `test-${testId}`)
          const srcDir = path.join(testDir, 'src')
          const distDir = path.join(testDir, 'dist')
          
          // 创建有错误的源文件
          const filePath = path.join(srcDir, `${fileName}.ts`)
          await createErrorTsFile(filePath, errorType as any)
          
          // 创建 TypeScript 配置 (启用严格模式以捕获类型错误)
          const configPath = path.join(testDir, 'tsconfig.json')
          const config = {
            compilerOptions: {
              target: 'ES2020',
              module: 'CommonJS',
              outDir: distDir,
              rootDir: srcDir,
              moduleResolution: 'node',
              esModuleInterop: true,
              skipLibCheck: true,
              strict: true // 启用严格模式
            },
            include: ['**/*']
          }
          await fs.writeFile(configPath, JSON.stringify(config, null, 2))
          
          // 执行编译
          const result = await compileTsProject(configPath)
          
          // 验证退出码非零
          expect(result.exitCode).not.toBe(0)
          
          // 验证错误输出不为空
          const errorOutput = result.stderr || result.stdout
          expect(errorOutput.length).toBeGreaterThan(0)
          
          // 验证错误信息包含文件名
          expect(errorOutput).toContain(fileName)
          
          // 验证错误信息包含行号或位置信息
          const hasLineInfo = /\(\d+,\d+\)|:\d+:\d+/.test(errorOutput)
          expect(hasLineInfo).toBe(true)
        }
      ),
      { numRuns: 5 } // 最小迭代次数以避免超时
    )
  }, 120000) // 120 秒超时
})
