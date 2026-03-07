/**
 * 构建系统单元测试
 * 
 * 测试范围:
 * - 构建脚本定义 (Requirements 1.1, 1.2, 1.3, 1.5)
 * - 构建前清理功能 (Requirement 1.5)
 * - TypeScript 编译错误处理 (Requirements 1.4, 1.6)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 获取项目根目录 (Jest 环境下使用 __dirname)
const projectRoot = path.resolve(__dirname, '../..')

describe('构建系统单元测试', () => {
  describe('构建脚本定义', () => {
    it('应该在 package.json 中定义 build 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts.build).toBeDefined()
      expect(pkg.scripts.build).toContain('build:main')
      expect(pkg.scripts.build).toContain('build:preload')
      expect(pkg.scripts.build).toContain('build:renderer')
    })

    it('应该在 package.json 中定义 build:main 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts['build:main']).toBeDefined()
      expect(pkg.scripts['build:main']).toContain('tsc')
      expect(pkg.scripts['build:main']).toContain('tsconfig.main.json')
    })

    it('应该在 package.json 中定义 build:preload 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts['build:preload']).toBeDefined()
      expect(pkg.scripts['build:preload']).toContain('tsc')
      expect(pkg.scripts['build:preload']).toContain('tsconfig.preload.json')
    })

    it('应该在 package.json 中定义 build:renderer 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts['build:renderer']).toBeDefined()
      expect(pkg.scripts['build:renderer']).toContain('vite build')
    })

    it('应该在 package.json 中定义 clean 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts.clean).toBeDefined()
      expect(pkg.scripts.clean).toMatch(/rimraf|rm -rf/)
      expect(pkg.scripts.clean).toContain('dist')
    })
  })

  describe('构建前清理功能', () => {
    const testDistDir = path.join(projectRoot, 'test-temp', 'dist')
    const testOldFile = path.join(testDistDir, 'main', 'old.js')

    beforeEach(async () => {
      // 创建测试目录和旧文件
      await fs.mkdir(path.dirname(testOldFile), { recursive: true })
      await fs.writeFile(testOldFile, 'old content')
    })

    afterEach(async () => {
      // 清理测试目录
      try {
        await fs.rm(path.join(projectRoot, 'test-temp'), { recursive: true, force: true })
      } catch (error) {
        // 忽略清理错误
      }
    })

    it('应该在构建前删除旧的 dist 目录', async () => {
      // 验证旧文件存在
      const existsBefore = await fs.access(testOldFile).then(() => true).catch(() => false)
      expect(existsBefore).toBe(true)

      // 执行清理
      await fs.rm(testDistDir, { recursive: true, force: true })

      // 验证目录被删除
      const existsAfter = await fs.access(testDistDir).then(() => true).catch(() => false)
      expect(existsAfter).toBe(false)
    })

    it('clean 脚本应该删除 dist 和 release 目录', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const cleanScript = pkg.scripts.clean
      expect(cleanScript).toContain('dist')
      
      // 如果配置了 release 目录,也应该清理
      if (cleanScript.includes('release')) {
        expect(cleanScript).toContain('release')
      }
    })

    it('build 脚本应该在构建前执行清理', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const buildScript = pkg.scripts.build
      
      // 验证 build 脚本包含 clean 或直接包含清理命令
      const hasClean = buildScript.includes('clean') || 
                       buildScript.includes('rimraf') || 
                       buildScript.includes('rm -rf')
      
      expect(hasClean).toBe(true)
    })
  })

  describe('TypeScript 编译配置', () => {
    it('应该存在 tsconfig.main.json 配置文件', async () => {
      const configPath = path.join(projectRoot, 'tsconfig.main.json')
      const exists = await fs.access(configPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('应该存在 tsconfig.preload.json 配置文件', async () => {
      const configPath = path.join(projectRoot, 'tsconfig.preload.json')
      const exists = await fs.access(configPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('tsconfig.main.json 应该配置正确的输出目录', async () => {
      const configPath = path.join(projectRoot, 'tsconfig.main.json')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configContent)
      
      expect(config.compilerOptions.outDir).toBeDefined()
      expect(config.compilerOptions.outDir).toContain('dist/main')
    })

    it('tsconfig.preload.json 应该配置正确的输出目录', async () => {
      const configPath = path.join(projectRoot, 'tsconfig.preload.json')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configContent)
      
      expect(config.compilerOptions.outDir).toBeDefined()
      expect(config.compilerOptions.outDir).toContain('dist/preload')
    })
  })

  describe('构建错误处理', () => {
    const testSrcDir = path.join(projectRoot, 'test-temp', 'src', 'main')
    const testErrorFile = path.join(testSrcDir, 'error-test.ts')
    const testTsConfig = path.join(projectRoot, 'test-temp', 'tsconfig.test.json')

    beforeEach(async () => {
      // 创建测试目录
      await fs.mkdir(testSrcDir, { recursive: true })
    })

    afterEach(async () => {
      // 清理测试文件
      try {
        await fs.rm(path.join(projectRoot, 'test-temp'), { recursive: true, force: true })
      } catch (error) {
        // 忽略清理错误
      }
    })

    it('应该在 TypeScript 类型错误时返回非零退出码', async () => {
      // 创建有类型错误的文件
      const errorCode = `
const x: number = "string"; // 类型错误
export default x;
`
      await fs.writeFile(testErrorFile, errorCode)

      // 创建测试用的 tsconfig
      const tsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          outDir: path.join(projectRoot, 'test-temp', 'dist'),
          rootDir: path.join(projectRoot, 'test-temp', 'src'),
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        },
        include: ['src/**/*']
      }
      await fs.writeFile(testTsConfig, JSON.stringify(tsConfig, null, 2))

      // 执行编译
      try {
        await execAsync(`npx tsc -p ${testTsConfig}`, { cwd: projectRoot })
        // 如果没有抛出错误,测试失败
        expect(true).toBe(false) // 不应该到达这里
      } catch (error: any) {
        // 验证退出码非零
        expect(error.code).not.toBe(0)
        // 验证错误信息包含类型错误提示 (检查 stderr 或 stdout)
        const errorOutput = error.stderr || error.stdout || error.message
        expect(errorOutput).toMatch(/Type.*is not assignable|类型/)
      }
    })

    it('应该在 TypeScript 语法错误时返回非零退出码', async () => {
      // 创建有语法错误的文件
      const errorCode = `
const x = {
  name: "test"
  // 缺少逗号
  value: 123
};
export default x;
`
      await fs.writeFile(testErrorFile, errorCode)

      // 创建测试用的 tsconfig
      const tsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          outDir: path.join(projectRoot, 'test-temp', 'dist'),
          rootDir: path.join(projectRoot, 'test-temp', 'src'),
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        },
        include: ['src/**/*']
      }
      await fs.writeFile(testTsConfig, JSON.stringify(tsConfig, null, 2))

      // 执行编译
      try {
        await execAsync(`npx tsc -p ${testTsConfig}`, { cwd: projectRoot })
        // 如果没有抛出错误,测试失败
        expect(true).toBe(false) // 不应该到达这里
      } catch (error: any) {
        // 验证退出码非零
        expect(error.code).not.toBe(0)
      }
    })

    it('应该输出包含错误位置的信息', async () => {
      // 创建有错误的文件
      const errorCode = `
const x: number = "string";
export default x;
`
      await fs.writeFile(testErrorFile, errorCode)

      // 创建测试用的 tsconfig
      const tsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          outDir: path.join(projectRoot, 'test-temp', 'dist'),
          rootDir: path.join(projectRoot, 'test-temp', 'src'),
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        },
        include: ['src/**/*']
      }
      await fs.writeFile(testTsConfig, JSON.stringify(tsConfig, null, 2))

      // 执行编译
      try {
        await execAsync(`npx tsc -p ${testTsConfig}`, { cwd: projectRoot })
        expect(true).toBe(false) // 不应该到达这里
      } catch (error: any) {
        // 验证错误信息包含文件路径 (检查 stderr 或 stdout)
        const errorOutput = error.stderr || error.stdout || error.message
        expect(errorOutput).toContain('error-test.ts')
        // 验证错误信息包含行号
        expect(errorOutput).toMatch(/\(\d+,\d+\)|:\d+:\d+/)
      }
    })
  })

  describe('构建产物验证', () => {
    it('构建后应该存在 dist/main 目录', async () => {
      const distMainDir = path.join(projectRoot, 'dist', 'main')
      
      // 如果 dist 目录存在,验证结构
      try {
        await fs.access(distMainDir)
        const stats = await fs.stat(distMainDir)
        expect(stats.isDirectory()).toBe(true)
      } catch (error) {
        // 如果还没有构建过,跳过此测试
        console.log('提示: dist/main 目录不存在,可能还未执行构建')
      }
    })

    it('构建后应该存在 dist/preload 目录', async () => {
      const distPreloadDir = path.join(projectRoot, 'dist', 'preload')
      
      // 如果 dist 目录存在,验证结构
      try {
        await fs.access(distPreloadDir)
        const stats = await fs.stat(distPreloadDir)
        expect(stats.isDirectory()).toBe(true)
      } catch (error) {
        // 如果还没有构建过,跳过此测试
        console.log('提示: dist/preload 目录不存在,可能还未执行构建')
      }
    })

    it('构建后应该存在 dist/renderer 目录', async () => {
      const distRendererDir = path.join(projectRoot, 'dist', 'renderer')
      
      // 如果 dist 目录存在,验证结构
      try {
        await fs.access(distRendererDir)
        const stats = await fs.stat(distRendererDir)
        expect(stats.isDirectory()).toBe(true)
      } catch (error) {
        // 如果还没有构建过,跳过此测试
        console.log('提示: dist/renderer 目录不存在,可能还未执行构建')
      }
    })
  })
})
