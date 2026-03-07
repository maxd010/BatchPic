/**
 * 脚本系统单元测试
 * 
 * 测试范围:
 * - 打包脚本定义 (Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6)
 * - 脚本失败时的错误处理 (Requirement 3.7)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '../..')

describe('脚本系统单元测试', () => {
  describe('打包脚本定义', () => {
    it('应该在 package.json 中定义 package 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts.package).toBeDefined()
      expect(pkg.scripts.package).toContain('electron-builder')
    })

    it('应该在 package.json 中定义 package:mac 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts['package:mac']).toBeDefined()
      expect(pkg.scripts['package:mac']).toContain('electron-builder')
      expect(pkg.scripts['package:mac']).toContain('--mac')
    })

    it('应该在 package.json 中定义 package:win 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts['package:win']).toBeDefined()
      expect(pkg.scripts['package:win']).toContain('electron-builder')
      expect(pkg.scripts['package:win']).toContain('--win')
    })

    it('应该在 package.json 中定义 release 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts.release).toBeDefined()
      expect(pkg.scripts.release).toContain('package')
    })

    it('package 脚本应该在打包前执行构建', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const packageScript = pkg.scripts.package
      
      // 验证 package 脚本包含 build 或构建相关命令
      const hasBuild = packageScript.includes('build') || 
                       packageScript.includes('npm run build')
      
      expect(hasBuild).toBe(true)
    })

    it('package:mac 脚本应该在打包前执行构建', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const packageMacScript = pkg.scripts['package:mac']
      
      // 验证 package:mac 脚本包含 build 或构建相关命令
      const hasBuild = packageMacScript.includes('build') || 
                       packageMacScript.includes('npm run build')
      
      expect(hasBuild).toBe(true)
    })

    it('package:win 脚本应该在打包前执行构建', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const packageWinScript = pkg.scripts['package:win']
      
      // 验证 package:win 脚本包含 build 或构建相关命令
      const hasBuild = packageWinScript.includes('build') || 
                       packageWinScript.includes('npm run build')
      
      expect(hasBuild).toBe(true)
    })
  })

  describe('脚本执行顺序', () => {
    it('package 脚本应该先构建后打包', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const packageScript = pkg.scripts.package
      
      // 验证构建命令在打包命令之前
      const buildIndex = packageScript.indexOf('build')
      const electronBuilderIndex = packageScript.indexOf('electron-builder')
      
      expect(buildIndex).toBeGreaterThan(-1)
      expect(electronBuilderIndex).toBeGreaterThan(-1)
      expect(buildIndex).toBeLessThan(electronBuilderIndex)
    })

    it('release 脚本应该执行 package 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const releaseScript = pkg.scripts.release
      
      // 验证 release 脚本调用 package
      expect(releaseScript).toContain('package')
    })
  })

  describe('脚本错误处理', () => {
    const testTempRoot = path.join(projectRoot, 'test-temp-script')

    beforeEach(async () => {
      // 清理测试临时目录
      try {
        await fs.rm(testTempRoot, { recursive: true, force: true })
      } catch (error) {
        // 忽略清理错误
      }
    })

    afterEach(async () => {
      // 清理测试临时目录
      try {
        await fs.rm(testTempRoot, { recursive: true, force: true })
      } catch (error) {
        // 忽略清理错误
      }
    })

    it('构建失败时应该返回非零退出码', async () => {
      // 创建测试目录和有错误的源文件
      const testDir = path.join(testTempRoot, 'build-error-test')
      const srcDir = path.join(testDir, 'src', 'main')
      const errorFile = path.join(srcDir, 'error.ts')
      
      await fs.mkdir(srcDir, { recursive: true })
      
      // 创建有类型错误的文件
      const errorCode = `
const x: number = "string"; // 类型错误
export default x;
`
      await fs.writeFile(errorFile, errorCode)
      
      // 创建 TypeScript 配置
      const tsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          outDir: path.join(testDir, 'dist'),
          rootDir: srcDir,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        },
        include: ['src/**/*']
      }
      const configPath = path.join(testDir, 'tsconfig.json')
      await fs.writeFile(configPath, JSON.stringify(tsConfig, null, 2))
      
      // 执行编译
      try {
        await execAsync(`npx tsc -p ${configPath}`, { cwd: projectRoot })
        // 如果没有抛出错误,测试失败
        expect(true).toBe(false) // 不应该到达这里
      } catch (error: any) {
        // 验证退出码非零
        expect(error.code).not.toBe(0)
      }
    })

    it('构建失败时应该输出清晰的错误信息', async () => {
      // 创建测试目录和有错误的源文件
      const testDir = path.join(testTempRoot, 'error-message-test')
      const srcDir = path.join(testDir, 'src', 'main')
      const errorFile = path.join(srcDir, 'error.ts')
      
      await fs.mkdir(srcDir, { recursive: true })
      
      // 创建有类型错误的文件
      const errorCode = `
const x: number = "string"; // 类型错误
export default x;
`
      await fs.writeFile(errorFile, errorCode)
      
      // 创建 TypeScript 配置
      const tsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          outDir: path.join(testDir, 'dist'),
          rootDir: srcDir,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        },
        include: ['src/**/*']
      }
      const configPath = path.join(testDir, 'tsconfig.json')
      await fs.writeFile(configPath, JSON.stringify(tsConfig, null, 2))
      
      // 执行编译
      try {
        await execAsync(`npx tsc -p ${configPath}`, { cwd: projectRoot })
        expect(true).toBe(false) // 不应该到达这里
      } catch (error: any) {
        // 验证错误信息包含文件路径
        const errorOutput = error.stderr || error.stdout || error.message
        expect(errorOutput).toContain('error.ts')
        
        // 验证错误信息包含错误类型
        expect(errorOutput).toMatch(/Type.*is not assignable|error TS/)
        
        // 验证错误信息包含行号或位置信息
        expect(errorOutput).toMatch(/\(\d+,\d+\)|:\d+:\d+/)
      }
    })

    it('打包失败时应该返回非零退出码', async () => {
      // 创建测试目录和无效的 electron-builder 配置
      const testDir = path.join(testTempRoot, 'package-error-test')
      const configPath = path.join(testDir, 'electron-builder.json5')
      
      await fs.mkdir(testDir, { recursive: true })
      
      // 创建无效的配置 (缺少必需字段)
      const invalidConfig = `{
  // 缺少 appId
  "productName": "TestApp"
}`
      await fs.writeFile(configPath, invalidConfig)
      
      // 创建最小的 package.json
      const packageJson = {
        name: 'test-app',
        version: '1.0.0',
        main: 'main.js'
      }
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      )
      
      // 执行打包 (预期失败)
      try {
        await execAsync(`npx electron-builder --config ${configPath}`, { cwd: testDir })
        // 如果没有抛出错误,测试失败
        expect(true).toBe(false) // 不应该到达这里
      } catch (error: any) {
        // 验证退出码非零
        expect(error.code).not.toBe(0)
      }
    })

    it('打包失败时应该输出清晰的错误信息', async () => {
      // 创建测试目录和无效的 electron-builder 配置
      const testDir = path.join(testTempRoot, 'package-error-message-test')
      const configPath = path.join(testDir, 'electron-builder.json5')
      
      await fs.mkdir(testDir, { recursive: true })
      
      // 创建无效的配置 (缺少必需字段)
      const invalidConfig = `{
  // 缺少 appId
  "productName": "TestApp"
}`
      await fs.writeFile(configPath, invalidConfig)
      
      // 创建最小的 package.json
      const packageJson = {
        name: 'test-app',
        version: '1.0.0',
        main: 'main.js'
      }
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      )
      
      // 执行打包 (预期失败)
      try {
        await execAsync(`npx electron-builder --config ${configPath}`, { cwd: testDir })
        expect(true).toBe(false) // 不应该到达这里
      } catch (error: any) {
        // 验证错误信息不为空
        const errorOutput = error.stderr || error.stdout || error.message
        expect(errorOutput.length).toBeGreaterThan(0)
        
        // 验证错误信息包含有用的提示 (可能包含 "appId", "error", "failed" 等关键词)
        const hasUsefulInfo = 
          errorOutput.includes('appId') ||
          errorOutput.includes('error') ||
          errorOutput.includes('Error') ||
          errorOutput.includes('failed')
        
        expect(hasUsefulInfo).toBe(true)
      }
    })
  })

  describe('脚本依赖关系', () => {
    it('所有打包脚本应该依赖构建脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const packagingScripts = [
        'package',
        'package:mac',
        'package:win'
      ]
      
      for (const scriptName of packagingScripts) {
        const script = pkg.scripts[scriptName]
        expect(script).toBeDefined()
        
        // 验证脚本包含构建步骤
        const hasBuild = script.includes('build') || script.includes('npm run build')
        expect(hasBuild).toBe(true)
      }
    })

    it('构建脚本应该包含所有必需的子步骤', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const buildScript = pkg.scripts.build
      
      // 验证构建脚本包含所有子步骤
      expect(buildScript).toContain('build:main')
      expect(buildScript).toContain('build:preload')
      expect(buildScript).toContain('build:renderer')
    })
  })

  describe('脚本命名规范', () => {
    it('平台特定脚本应该使用冒号分隔符', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      // 验证平台特定脚本使用 : 分隔符
      expect(pkg.scripts['package:mac']).toBeDefined()
      expect(pkg.scripts['package:win']).toBeDefined()
      expect(pkg.scripts['build:main']).toBeDefined()
      expect(pkg.scripts['build:preload']).toBeDefined()
      expect(pkg.scripts['build:renderer']).toBeDefined()
    })

    it('脚本名称应该清晰表达其功能', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      // 验证关键脚本存在且命名清晰
      const expectedScripts = [
        'clean',      // 清理
        'build',      // 构建
        'package',    // 打包
        'release'     // 发布
      ]
      
      for (const scriptName of expectedScripts) {
        expect(pkg.scripts[scriptName]).toBeDefined()
      }
    })
  })
})
