/**
 * 脚本系统属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证脚本系统的通用正确性属性
 * 
 * 测试属性:
 * - Property 11: 打包前自动构建 (Validates: Requirements 3.6)
 * - Property 12: 脚本失败错误处理 (Validates: Requirements 3.7)
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
const testTempRoot = path.join(projectRoot, 'test-temp-script-pbt')

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
 * 创建测试项目结构
 */
async function createTestProject(
  testDir: string,
  options: {
    hasValidSource: boolean
    hasBuildScript: boolean
    hasPackageScript: boolean
  }
): Promise<void> {
  // 创建目录结构
  const srcDir = path.join(testDir, 'src', 'main')
  const distDir = path.join(testDir, 'dist')
  
  await fs.mkdir(srcDir, { recursive: true })
  await fs.mkdir(distDir, { recursive: true })
  
  // 创建源文件
  if (options.hasValidSource) {
    const mainFile = path.join(srcDir, 'main.ts')
    await fs.writeFile(mainFile, `
export const app = {
  name: 'TestApp',
  version: '1.0.0'
};
export default app;
`)
  } else {
    // 创建有错误的源文件
    const mainFile = path.join(srcDir, 'main.ts')
    await fs.writeFile(mainFile, `
const x: number = "string"; // 类型错误
export default x;
`)
  }
  
  // 创建 TypeScript 配置
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'CommonJS',
      outDir: path.join(distDir, 'main'),
      rootDir: srcDir,
      moduleResolution: 'node',
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true
    },
    include: ['src/**/*']
  }
  await fs.writeFile(
    path.join(testDir, 'tsconfig.main.json'),
    JSON.stringify(tsConfig, null, 2)
  )
  
  // 创建 package.json
  const packageJson: any = {
    name: 'test-app',
    version: '1.0.0',
    main: 'dist/main/main.js',
    scripts: {}
  }
  
  if (options.hasBuildScript) {
    packageJson.scripts.build = 'tsc -p tsconfig.main.json'
  }
  
  if (options.hasPackageScript) {
    if (options.hasBuildScript) {
      packageJson.scripts.package = 'npm run build && echo "Packaging..."'
    } else {
      packageJson.scripts.package = 'echo "Packaging without build..."'
    }
  }
  
  await fs.writeFile(
    path.join(testDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  )
}

/**
 * 执行 npm 脚本
 */
async function runNpmScript(
  testDir: string,
  scriptName: string
): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  try {
    const { stdout, stderr } = await execAsync(`npm run ${scriptName}`, { 
      cwd: testDir,
      env: { ...process.env, NODE_ENV: 'test' }
    })
    return { exitCode: 0, stderr, stdout }
  } catch (error: any) {
    return {
      exitCode: error.code || 1,
      stderr: error.stderr || '',
      stdout: error.stdout || ''
    }
  }
}

/**
 * 检查构建产物是否存在
 */
async function checkBuildArtifacts(testDir: string): Promise<boolean> {
  const mainJsPath = path.join(testDir, 'dist', 'main', 'main.js')
  try {
    await fs.access(mainJsPath)
    return true
  } catch {
    return false
  }
}

describe('脚本系统属性测试', () => {
  beforeEach(async () => {
    await cleanupTestTemp()
  })

  afterEach(async () => {
    await cleanupTestTemp()
  })

  /**
   * **Validates: Requirements 3.6**
   * 
   * Property 11: 打包前自动构建
   * 
   * 对于任何打包脚本(package, package:mac, package:win),
   * 执行时应自动触发完整的构建流程
   */
  it('Property 11: 打包脚本应自动触发构建流程', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 生成随机的应用名称
          appName: fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
          // 生成随机的版本号
          version: fc.tuple(
            fc.integer({ min: 0, max: 9 }),
            fc.integer({ min: 0, max: 99 }),
            fc.integer({ min: 0, max: 999 })
          ).map(([major, minor, patch]) => `${major}.${minor}.${patch}`)
        }),
        async ({ appName, version }) => {
          // 创建测试目录
          const testId = Date.now() + Math.random()
          const testDir = path.join(testTempRoot, `test-${testId}`)
          
          // 创建测试项目 (有效源代码 + 构建脚本 + 打包脚本)
          await createTestProject(testDir, {
            hasValidSource: true,
            hasBuildScript: true,
            hasPackageScript: true
          })
          
          // 更新 package.json 中的应用信息
          const pkgPath = path.join(testDir, 'package.json')
          const pkgContent = await fs.readFile(pkgPath, 'utf-8')
          const pkg = JSON.parse(pkgContent)
          pkg.name = appName.toLowerCase()
          pkg.version = version
          await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))
          
          // 确保构建产物不存在
          const artifactsExistBefore = await checkBuildArtifacts(testDir)
          expect(artifactsExistBefore).toBe(false)
          
          // 执行打包脚本
          const result = await runNpmScript(testDir, 'package')
          
          // 验证脚本成功执行
          expect(result.exitCode).toBe(0)
          
          // 验证构建产物已生成 (证明构建流程被触发)
          const artifactsExistAfter = await checkBuildArtifacts(testDir)
          expect(artifactsExistAfter).toBe(true)
          
          // 验证输出包含构建相关信息
          const output = result.stdout + result.stderr
          const hasBuildInfo = output.includes('build') || 
                              output.includes('tsc') || 
                              output.includes('Compiling')
          expect(hasBuildInfo).toBe(true)
        }
      ),
      { numRuns: 5 } // 快速迭代 5 次
    )
  }, 120000) // 120 秒超时

  /**
   * **Validates: Requirements 3.6**
   * 
   * Property 11 (变体): 验证实际项目的打包脚本配置
   * 
   * 对于实际项目中的所有打包脚本,应该在脚本定义中包含构建步骤
   */
  it('Property 11 (变体): 实际项目的打包脚本应包含构建步骤', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('package', 'package:mac', 'package:win'),
        async (scriptName) => {
          // 读取实际项目的 package.json
          const pkgPath = path.join(projectRoot, 'package.json')
          const pkgContent = await fs.readFile(pkgPath, 'utf-8')
          const pkg = JSON.parse(pkgContent)
          
          // 验证脚本存在
          expect(pkg.scripts[scriptName]).toBeDefined()
          
          const script = pkg.scripts[scriptName]
          
          // 验证脚本包含构建步骤
          const hasBuild = script.includes('build') || 
                          script.includes('npm run build')
          expect(hasBuild).toBe(true)
          
          // 验证构建在打包之前执行
          const buildIndex = script.indexOf('build')
          const electronBuilderIndex = script.indexOf('electron-builder')
          
          expect(buildIndex).toBeGreaterThan(-1)
          expect(electronBuilderIndex).toBeGreaterThan(-1)
          expect(buildIndex).toBeLessThan(electronBuilderIndex)
        }
      ),
      { numRuns: 5 } // 对每个脚本测试 5 次
    )
  }, 30000) // 30 秒超时

  /**
   * **Validates: Requirements 3.7**
   * 
   * Property 12: 脚本失败错误处理
   * 
   * 对于任何执行失败的构建或打包脚本,
   * 应输出清晰的错误信息说明失败原因
   */
  it('Property 12: 脚本失败时应输出清晰的错误信息', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 生成错误类型
          errorType: fc.constantFrom('build-error', 'missing-script'),
          // 生成文件名
          fileName: fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s))
        }),
        async ({ errorType, fileName }) => {
          // 创建测试目录
          const testId = Date.now() + Math.random()
          const testDir = path.join(testTempRoot, `test-${testId}`)
          
          if (errorType === 'build-error') {
            // 创建有构建错误的项目
            await createTestProject(testDir, {
              hasValidSource: false, // 无效源代码
              hasBuildScript: true,
              hasPackageScript: true
            })
            
            // 执行打包脚本 (预期失败)
            const result = await runNpmScript(testDir, 'package')
            
            // 验证退出码非零
            expect(result.exitCode).not.toBe(0)
            
            // 验证错误输出不为空
            const errorOutput = result.stderr || result.stdout
            expect(errorOutput.length).toBeGreaterThan(0)
            
            // 验证错误信息包含有用的提示
            const hasUsefulInfo = 
              errorOutput.includes('error') ||
              errorOutput.includes('Error') ||
              errorOutput.includes('failed') ||
              errorOutput.includes('Type') ||
              errorOutput.includes('not assignable')
            expect(hasUsefulInfo).toBe(true)
            
            // 验证错误信息包含文件位置信息
            const hasLocationInfo = 
              /\(\d+,\d+\)|:\d+:\d+/.test(errorOutput) ||
              errorOutput.includes('.ts')
            expect(hasLocationInfo).toBe(true)
            
          } else if (errorType === 'missing-script') {
            // 创建缺少构建脚本的项目
            await createTestProject(testDir, {
              hasValidSource: true,
              hasBuildScript: false, // 缺少构建脚本
              hasPackageScript: true
            })
            
            // 修改 package.json，让 package 脚本依赖不存在的 build 脚本
            const pkgPath = path.join(testDir, 'package.json')
            const pkgContent = await fs.readFile(pkgPath, 'utf-8')
            const pkg = JSON.parse(pkgContent)
            pkg.scripts.package = 'npm run build && echo "Packaging..."'
            await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))
            
            // 执行打包脚本 (预期失败,因为依赖的 build 脚本不存在)
            const result = await runNpmScript(testDir, 'package')
            
            // 验证退出码非零（npm run 不存在的脚本会返回非零退出码）
            expect(result.exitCode).not.toBe(0)
            
            // 验证错误输出不为空
            const errorOutput = result.stderr || result.stdout
            expect(errorOutput.length).toBeGreaterThan(0)
            
            // 验证错误信息包含脚本相关提示
            const hasScriptError = 
              errorOutput.includes('script') ||
              errorOutput.includes('build') ||
              errorOutput.includes('missing') ||
              errorOutput.includes('not found') ||
              errorOutput.includes('Unknown')
            expect(hasScriptError).toBe(true)
          }
        }
      ),
      { numRuns: 5 } // 快速迭代 5 次
    )
  }, 120000) // 120 秒超时

  /**
   * **Validates: Requirements 3.7**
   * 
   * Property 12 (变体): 验证不同类型的错误都能被正确处理
   * 
   * 对于不同类型的脚本失败场景,应该输出相应的错误信息
   */
  it('Property 12 (变体): 不同类型的错误应输出相应的错误信息', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'type-error',
          'syntax-error',
          'missing-file'
        ),
        async (errorScenario) => {
          // 创建测试目录
          const testId = Date.now() + Math.random()
          const testDir = path.join(testTempRoot, `test-${testId}`)
          const srcDir = path.join(testDir, 'src', 'main')
          
          await fs.mkdir(srcDir, { recursive: true })
          
          // 根据错误场景创建不同的源文件
          let errorCode: string
          let expectedErrorKeyword: string
          
          switch (errorScenario) {
            case 'type-error':
              errorCode = `
const x: number = "string"; // 类型错误
export default x;
`
              expectedErrorKeyword = 'Type'
              break
            case 'syntax-error':
              errorCode = `
const x = {
  name: "test"
  value: 123 // 缺少逗号
};
export default x;
`
              expectedErrorKeyword = 'error'
              break
            case 'missing-file':
              errorCode = `
import { missing } from './non-existent'; // 文件不存在
export default missing;
`
              expectedErrorKeyword = 'Cannot find'
              break
            default:
              errorCode = ''
              expectedErrorKeyword = 'error'
          }
          
          const mainFile = path.join(srcDir, 'main.ts')
          await fs.writeFile(mainFile, errorCode)
          
          // 创建 TypeScript 配置
          const tsConfig = {
            compilerOptions: {
              target: 'ES2020',
              module: 'CommonJS',
              outDir: path.join(testDir, 'dist', 'main'),
              rootDir: srcDir,
              moduleResolution: 'node',
              esModuleInterop: true,
              skipLibCheck: true,
              strict: true
            },
            include: ['src/**/*']
          }
          await fs.writeFile(
            path.join(testDir, 'tsconfig.main.json'),
            JSON.stringify(tsConfig, null, 2)
          )
          
          // 创建 package.json
          const packageJson = {
            name: 'test-app',
            version: '1.0.0',
            scripts: {
              build: 'tsc -p tsconfig.main.json'
            }
          }
          await fs.writeFile(
            path.join(testDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
          )
          
          // 执行构建脚本 (预期失败)
          const result = await runNpmScript(testDir, 'build')
          
          // 验证退出码非零
          expect(result.exitCode).not.toBe(0)
          
          // 验证错误输出包含预期的错误关键词
          const errorOutput = result.stderr || result.stdout
          expect(errorOutput).toContain(expectedErrorKeyword)
          
          // 验证错误信息包含文件名
          expect(errorOutput).toContain('main.ts')
        }
      ),
      { numRuns: 5 } // 快速迭代 5 次
    )
  }, 120000) // 120 秒超时
})
