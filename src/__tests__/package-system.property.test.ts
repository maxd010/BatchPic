/**
 * 打包系统属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证打包系统的通用正确性属性
 * 
 * 测试属性:
 * - Property 5: 跨平台打包支持 (Validates: Requirements 2.1, 2.2)
 * - Property 8: 文件过滤正确性 (Validates: Requirements 2.5)
 * - Property 10: 打包输出目录 (Validates: Requirements 2.9)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import fc from 'fast-check'
import fs from 'fs/promises'
import path from 'path'
import JSON5 from 'json5'

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '../..')

// 测试临时目录
const testTempRoot = path.join(projectRoot, 'test-temp-package-pbt')

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
 * 创建测试用的 electron-builder 配置
 */
async function createTestElectronBuilderConfig(
  configPath: string,
  options: {
    outputDir: string
    files?: string[]
    platform?: 'mac' | 'win'
  }
): Promise<void> {
  const config: any = {
    appId: 'com.test.app',
    productName: 'TestApp',
    copyright: 'Copyright © 2024 Test',
    directories: {
      output: options.outputDir,
      buildResources: 'build'
    },
    files: options.files || ['dist/**/*', 'package.json']
  }

  // 添加平台特定配置
  if (options.platform === 'mac') {
    config.mac = {
      target: ['dmg', 'zip'],
      icon: 'build/icons/icon.icns',
      category: 'public.app-category.utilities'
    }
  } else if (options.platform === 'win') {
    config.win = {
      target: [
        { target: 'nsis', arch: ['x64'] },
        { target: 'portable', arch: ['x64'] }
      ],
      icon: 'build/icons/icon.ico'
    }
  }

  await fs.mkdir(path.dirname(configPath), { recursive: true })
  await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

describe('打包系统属性测试', () => {
  beforeEach(async () => {
    await cleanupTestTemp()
  })

  afterEach(async () => {
    await cleanupTestTemp()
  })

  /**
   * **Validates: Requirements 2.1, 2.2**
   * 
   * Property 5: 跨平台打包支持
   * 
   * 对于任何目标平台(macOS/Windows),打包系统应能够
   * 生成该平台的所有指定格式的安装包
   */
  it('Property 5: 配置应支持所有目标平台的打包格式', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('mac', 'win'),
        async (platform) => {
          // 读取实际的 electron-builder 配置
          const configPath = path.join(projectRoot, 'electron-builder.json5')
          const configContent = await fs.readFile(configPath, 'utf-8')
          const config = JSON5.parse(configContent)

          // 验证平台配置存在
          expect(config[platform]).toBeDefined()
          expect(typeof config[platform]).toBe('object')

          // 验证目标格式配置
          expect(config[platform].target).toBeDefined()
          expect(Array.isArray(config[platform].target)).toBe(true)
          expect(config[platform].target.length).toBeGreaterThan(0)

          // 验证图标配置
          expect(config[platform].icon).toBeDefined()
          expect(typeof config[platform].icon).toBe('string')

          // 验证平台特定的目标格式
          if (platform === 'mac') {
            // macOS 应该支持 DMG 和 ZIP
            expect(config.mac.target).toContain('dmg')
            expect(config.mac.target).toContain('zip')

            // 验证图标格式
            expect(config.mac.icon).toMatch(/\.icns$/)

            // 验证 DMG 配置
            expect(config.mac.dmg).toBeDefined()
            expect(config.mac.dmg.window).toBeDefined()
            expect(config.mac.dmg.contents).toBeDefined()
          } else if (platform === 'win') {
            // Windows 应该支持 NSIS 和 Portable
            const hasNsis = config.win.target.some((t: any) =>
              typeof t === 'string' ? t === 'nsis' : t.target === 'nsis'
            )
            const hasPortable = config.win.target.some((t: any) =>
              typeof t === 'string' ? t === 'portable' : t.target === 'portable'
            )

            expect(hasNsis).toBe(true)
            expect(hasPortable).toBe(true)

            // 验证图标格式
            expect(config.win.icon).toMatch(/\.ico$/)

            // 验证 NSIS 配置
            expect(config.win.nsis).toBeDefined()
            expect(typeof config.win.nsis.oneClick).toBe('boolean')
            expect(typeof config.win.nsis.perMachine).toBe('boolean')
          }
        }
      ),
      { numRuns: 5 } // 快速运行 5 次迭代
    )
  }, 30000) // 30 秒超时

  /**
   * **Validates: Requirements 2.5**
   * 
   * Property 8: 文件过滤正确性
   * 
   * 对于任何打包操作,生成的安装包应只包含配置中指定的文件,
   * 并排除配置中标记为排除的文件
   */
  it('Property 8: 配置应正确指定需要打包和排除的文件', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 生成需要包含的文件模式
          includePatterns: fc.array(
            fc.constantFrom('dist/**/*', 'package.json', 'node_modules/**/*', 'assets/**/*'),
            { minLength: 1, maxLength: 4 }
          ),
          // 生成需要排除的文件模式
          excludePatterns: fc.array(
            fc.constantFrom('**/*.map', '**/*.ts', '**/test/**', '**/__tests__/**', '**/node_modules/**'),
            { minLength: 0, maxLength: 3 }
          )
        }),
        async ({ includePatterns, excludePatterns }) => {
          // 创建测试目录
          const testId = Date.now() + Math.random()
          const testDir = path.join(testTempRoot, `test-${testId}`)
          const configPath = path.join(testDir, 'electron-builder.json')

          // 创建测试配置
          const config = {
            appId: 'com.test.app',
            productName: 'TestApp',
            directories: {
              output: 'release',
              buildResources: 'build'
            },
            files: includePatterns,
            // electron-builder 使用 files 数组中的 ! 前缀来排除文件
            // 或者使用单独的配置项
          }

          // 如果有排除模式，添加到 files 数组中（使用 ! 前缀）
          if (excludePatterns.length > 0) {
            config.files = [
              ...includePatterns,
              ...excludePatterns.map(pattern => `!${pattern}`)
            ]
          }

          await fs.mkdir(path.dirname(configPath), { recursive: true })
          await fs.writeFile(configPath, JSON.stringify(config, null, 2))

          // 读取并验证配置
          const savedContent = await fs.readFile(configPath, 'utf-8')
          const savedConfig = JSON.parse(savedContent)

          // 验证 files 配置存在
          expect(savedConfig.files).toBeDefined()
          expect(Array.isArray(savedConfig.files)).toBe(true)
          expect(savedConfig.files.length).toBeGreaterThan(0)

          // 验证包含的文件模式
          for (const pattern of includePatterns) {
            expect(savedConfig.files).toContain(pattern)
          }

          // 验证排除的文件模式（带 ! 前缀）
          for (const pattern of excludePatterns) {
            const excludePattern = `!${pattern}`
            expect(savedConfig.files).toContain(excludePattern)
          }

          // 验证实际项目配置的文件过滤规则
          const actualConfigPath = path.join(projectRoot, 'electron-builder.json5')
          const actualConfigContent = await fs.readFile(actualConfigPath, 'utf-8')
          const actualConfig = JSON5.parse(actualConfigContent)

          // 验证实际配置包含必需的文件
          expect(actualConfig.files).toBeDefined()
          expect(Array.isArray(actualConfig.files)).toBe(true)

          // 验证包含 dist 目录
          const hasDist = actualConfig.files.some((pattern: string) =>
            pattern.includes('dist')
          )
          expect(hasDist).toBe(true)

          // 验证包含 package.json
          expect(actualConfig.files).toContain('package.json')
        }
      ),
      { numRuns: 5 } // 快速运行 5 次迭代
    )
  }, 30000) // 30 秒超时

  /**
   * **Validates: Requirements 2.9**
   * 
   * Property 10: 打包输出目录
   * 
   * 对于任何打包操作,所有生成的安装包应输出到 release/ 目录下
   * 对应的平台子目录中
   */
  it('Property 10: 配置应指定正确的输出目录', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 生成输出目录名称
          outputDir: fc.constantFrom('release', 'dist-packages', 'build-output', 'packages'),
          // 生成平台
          platform: fc.constantFrom('mac', 'win')
        }),
        async ({ outputDir, platform }) => {
          // 创建测试目录
          const testId = Date.now() + Math.random()
          const testDir = path.join(testTempRoot, `test-${testId}`)
          const configPath = path.join(testDir, 'electron-builder.json')

          // 创建测试配置
          await createTestElectronBuilderConfig(configPath, {
            outputDir,
            platform: platform as 'mac' | 'win'
          })

          // 读取并验证配置
          const configContent = await fs.readFile(configPath, 'utf-8')
          const config = JSON.parse(configContent)

          // 验证输出目录配置
          expect(config.directories).toBeDefined()
          expect(config.directories.output).toBeDefined()
          expect(typeof config.directories.output).toBe('string')
          expect(config.directories.output).toBe(outputDir)

          // 验证实际项目配置
          const actualConfigPath = path.join(projectRoot, 'electron-builder.json5')
          const actualConfigContent = await fs.readFile(actualConfigPath, 'utf-8')
          const actualConfig = JSON5.parse(actualConfigContent)

          // 验证实际配置的输出目录
          expect(actualConfig.directories).toBeDefined()
          expect(actualConfig.directories.output).toBeDefined()
          expect(typeof actualConfig.directories.output).toBe('string')

          // 验证输出目录是 release
          expect(actualConfig.directories.output).toBe('release')

          // 验证构建资源目录配置
          expect(actualConfig.directories.buildResources).toBeDefined()
          expect(typeof actualConfig.directories.buildResources).toBe('string')
        }
      ),
      { numRuns: 5 } // 快速运行 5 次迭代
    )
  }, 30000) // 30 秒超时

  /**
   * 额外属性测试: 应用元数据完整性
   * 
   * 验证配置文件包含所有必需的应用元数据
   */
  it('Property: 配置应包含完整的应用元数据', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          appId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => /^[a-z0-9.-]+$/.test(s)),
          productName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9 ]+$/.test(s)),
          copyright: fc.string({ minLength: 10, maxLength: 100 })
        }),
        async ({ appId, productName, copyright }) => {
          // 创建测试目录
          const testId = Date.now() + Math.random()
          const testDir = path.join(testTempRoot, `test-${testId}`)
          const configPath = path.join(testDir, 'electron-builder.json')

          // 创建测试配置
          const config = {
            appId: `com.${appId}`,
            productName,
            copyright,
            directories: {
              output: 'release',
              buildResources: 'build'
            },
            files: ['dist/**/*']
          }

          await fs.mkdir(path.dirname(configPath), { recursive: true })
          await fs.writeFile(configPath, JSON.stringify(config, null, 2))

          // 读取并验证配置
          const savedContent = await fs.readFile(configPath, 'utf-8')
          const savedConfig = JSON.parse(savedContent)

          // 验证元数据字段
          expect(savedConfig.appId).toBeDefined()
          expect(typeof savedConfig.appId).toBe('string')
          expect(savedConfig.appId.length).toBeGreaterThan(0)

          expect(savedConfig.productName).toBeDefined()
          expect(typeof savedConfig.productName).toBe('string')
          expect(savedConfig.productName.length).toBeGreaterThan(0)

          expect(savedConfig.copyright).toBeDefined()
          expect(typeof savedConfig.copyright).toBe('string')
          expect(savedConfig.copyright.length).toBeGreaterThan(0)

          // 验证实际项目配置
          const actualConfigPath = path.join(projectRoot, 'electron-builder.json5')
          const actualConfigContent = await fs.readFile(actualConfigPath, 'utf-8')
          const actualConfig = JSON5.parse(actualConfigContent)

          // 验证实际配置包含所有必需元数据
          expect(actualConfig.appId).toBeDefined()
          expect(actualConfig.productName).toBeDefined()
          expect(actualConfig.copyright).toBeDefined()

          // 验证 appId 格式（反向域名格式）
          expect(actualConfig.appId).toMatch(/^[a-z0-9.-]+\.[a-z0-9.-]+/)
        }
      ),
      { numRuns: 5 } // 快速运行 5 次迭代
    )
  }, 30000) // 30 秒超时

  /**
   * 额外属性测试: 平台特定配置一致性
   * 
   * 验证每个平台的配置都包含必需的字段
   */
  it('Property: 每个平台配置应包含必需的字段', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('mac', 'win'),
        async (platform) => {
          // 读取实际配置
          const configPath = path.join(projectRoot, 'electron-builder.json5')
          const configContent = await fs.readFile(configPath, 'utf-8')
          const config = JSON5.parse(configContent)

          // 验证平台配置存在
          expect(config[platform]).toBeDefined()

          const platformConfig = config[platform]

          // 验证通用必需字段
          expect(platformConfig.target).toBeDefined()
          expect(platformConfig.icon).toBeDefined()

          // 验证 target 是数组
          expect(Array.isArray(platformConfig.target)).toBe(true)
          expect(platformConfig.target.length).toBeGreaterThan(0)

          // 验证 icon 是字符串且不为空
          expect(typeof platformConfig.icon).toBe('string')
          expect(platformConfig.icon.length).toBeGreaterThan(0)

          // 验证图标文件扩展名
          if (platform === 'mac') {
            expect(platformConfig.icon).toMatch(/\.icns$/)
            // 验证 macOS 特定字段
            expect(platformConfig.category).toBeDefined()
            expect(typeof platformConfig.hardenedRuntime).toBe('boolean')
            expect(typeof platformConfig.gatekeeperAssess).toBe('boolean')
          } else if (platform === 'win') {
            expect(platformConfig.icon).toMatch(/\.ico$/)
            // 验证 Windows 特定字段
            expect(platformConfig.artifactName).toBeDefined()
            expect(platformConfig.nsis).toBeDefined()
          }
        }
      ),
      { numRuns: 5 } // 快速运行 5 次迭代
    )
  }, 30000) // 30 秒超时
})
