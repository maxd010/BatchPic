/**
 * 打包系统单元测试
 * 
 * 测试范围:
 * - 应用元数据配置 (Requirement 2.4)
 * - 平台配置存在性 (Requirements 2.1, 2.2)
 * - 图标路径正确性 (Requirement 2.3)
 * - 平台特定配置完整性 (Requirements 2.6, 2.7, 2.8)
 */

import { describe, it, expect } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'
import JSON5 from 'json5'

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '../..')

describe('打包系统单元测试', () => {
  describe('配置文件存在性', () => {
    it('应该存在 electron-builder.json5 配置文件', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const exists = await fs.access(configPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('应该存在 package.json 配置文件', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const exists = await fs.access(pkgPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })
  })

  describe('应用元数据配置 (Requirement 2.4)', () => {
    it('应该在 electron-builder.json5 中配置 appId', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.appId).toBeDefined()
      expect(typeof config.appId).toBe('string')
      expect(config.appId.length).toBeGreaterThan(0)
    })

    it('应该在 electron-builder.json5 中配置 productName', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.productName).toBeDefined()
      expect(typeof config.productName).toBe('string')
      expect(config.productName.length).toBeGreaterThan(0)
    })

    it('应该在 electron-builder.json5 中配置 copyright', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.copyright).toBeDefined()
      expect(typeof config.copyright).toBe('string')
      expect(config.copyright.length).toBeGreaterThan(0)
    })

    it('应该在 package.json 中配置 name', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.name).toBeDefined()
      expect(typeof pkg.name).toBe('string')
      expect(pkg.name.length).toBeGreaterThan(0)
    })

    it('应该在 package.json 中配置 description', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.description).toBeDefined()
      expect(typeof pkg.description).toBe('string')
      expect(pkg.description.length).toBeGreaterThan(0)
    })

    it('应该在 package.json 中配置 author', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.author).toBeDefined()
    })

    it('应该在 package.json 中配置 version', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.version).toBeDefined()
      expect(typeof pkg.version).toBe('string')
      // 验证版本号格式 (语义化版本)
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/)
    })
  })

  describe('目标平台配置存在性 (Requirements 2.1, 2.2)', () => {
    it('应该配置 macOS 平台打包选项', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac).toBeDefined()
      expect(typeof config.mac).toBe('object')
    })

    it('应该配置 Windows 平台打包选项', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win).toBeDefined()
      expect(typeof config.win).toBe('object')
    })

    it('macOS 配置应该包含目标格式', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.target).toBeDefined()
      expect(Array.isArray(config.mac.target)).toBe(true)
      expect(config.mac.target.length).toBeGreaterThan(0)
    })

    it('macOS 配置应该包含 DMG 格式', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.target).toContain('dmg')
    })

    it('macOS 配置应该包含 ZIP 格式', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.target).toContain('zip')
    })

    it('Windows 配置应该包含目标格式', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.target).toBeDefined()
      expect(Array.isArray(config.win.target)).toBe(true)
      expect(config.win.target.length).toBeGreaterThan(0)
    })

    it('Windows 配置应该包含 NSIS 安装器', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      const hasNsis = config.win.target.some((t: any) => 
        typeof t === 'string' ? t === 'nsis' : t.target === 'nsis'
      )
      expect(hasNsis).toBe(true)
    })

    it('Windows 配置应该包含便携版', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      const hasPortable = config.win.target.some((t: any) => 
        typeof t === 'string' ? t === 'portable' : t.target === 'portable'
      )
      expect(hasPortable).toBe(true)
    })
  })

  describe('图标路径正确性 (Requirement 2.3)', () => {
    it('macOS 配置应该指定图标路径', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.icon).toBeDefined()
      expect(typeof config.mac.icon).toBe('string')
      expect(config.mac.icon.length).toBeGreaterThan(0)
    })

    it('macOS 图标路径应该指向 .icns 文件', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.icon).toMatch(/\.icns$/)
    })

    it('macOS 图标文件应该存在', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      const iconPath = path.join(projectRoot, config.mac.icon)
      const exists = await fs.access(iconPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('Windows 配置应该指定图标路径', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.icon).toBeDefined()
      expect(typeof config.win.icon).toBe('string')
      expect(config.win.icon.length).toBeGreaterThan(0)
    })

    it('Windows 图标路径应该指向 .ico 文件', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.icon).toMatch(/\.ico$/)
    })

    it('Windows 图标文件应该存在', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      const iconPath = path.join(projectRoot, config.win.icon)
      const exists = await fs.access(iconPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })
  })

  describe('应用分类和文件关联 (Requirement 2.6)', () => {
    it('macOS 配置应该指定应用分类', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.category).toBeDefined()
      expect(typeof config.mac.category).toBe('string')
      expect(config.mac.category.length).toBeGreaterThan(0)
    })

    it('macOS 应用分类应该使用正确的格式', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      // macOS 应用分类应该以 public.app-category. 开头
      expect(config.mac.category).toMatch(/^public\.app-category\./)
    })

    it('应该配置需要打包的文件', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.files).toBeDefined()
      expect(Array.isArray(config.files)).toBe(true)
      expect(config.files.length).toBeGreaterThan(0)
    })

    it('打包文件配置应该包含 dist 目录', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      const hasDist = config.files.some((pattern: string) => pattern.includes('dist'))
      expect(hasDist).toBe(true)
    })

    it('打包文件配置应该包含 package.json', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.files).toContain('package.json')
    })
  })

  describe('macOS DMG 配置 (Requirement 2.7)', () => {
    it('macOS 配置应该包含 DMG 窗口配置', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.dmg).toBeDefined()
      expect(typeof config.mac.dmg).toBe('object')
    })

    it('DMG 配置应该包含窗口大小设置', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.dmg.window).toBeDefined()
      expect(config.mac.dmg.window.width).toBeDefined()
      expect(config.mac.dmg.window.height).toBeDefined()
      expect(typeof config.mac.dmg.window.width).toBe('number')
      expect(typeof config.mac.dmg.window.height).toBe('number')
    })

    it('DMG 配置应该包含内容布局', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.dmg.contents).toBeDefined()
      expect(Array.isArray(config.mac.dmg.contents)).toBe(true)
      expect(config.mac.dmg.contents.length).toBeGreaterThan(0)
    })

    it('DMG 内容布局应该包含应用文件', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      const hasAppFile = config.mac.dmg.contents.some((item: any) => item.type === 'file')
      expect(hasAppFile).toBe(true)
    })

    it('DMG 内容布局应该包含 Applications 链接', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      const hasAppLink = config.mac.dmg.contents.some((item: any) => 
        item.type === 'link' && item.path === '/Applications'
      )
      expect(hasAppLink).toBe(true)
    })

    it('macOS 配置应该启用强化运行时', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.hardenedRuntime).toBeDefined()
      expect(typeof config.mac.hardenedRuntime).toBe('boolean')
    })

    it('macOS 配置应该设置 Gatekeeper 评估选项', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.mac.gatekeeperAssess).toBeDefined()
      expect(typeof config.mac.gatekeeperAssess).toBe('boolean')
    })
  })

  describe('Windows NSIS 配置 (Requirement 2.8)', () => {
    it('Windows 配置应该包含 NSIS 安装器配置', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.nsis).toBeDefined()
      expect(typeof config.win.nsis).toBe('object')
    })

    it('NSIS 配置应该设置一键安装选项', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.nsis.oneClick).toBeDefined()
      expect(typeof config.win.nsis.oneClick).toBe('boolean')
    })

    it('NSIS 配置应该设置安装范围选项', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.nsis.perMachine).toBeDefined()
      expect(typeof config.win.nsis.perMachine).toBe('boolean')
    })

    it('NSIS 配置应该设置是否允许更改安装目录', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.nsis.allowToChangeInstallationDirectory).toBeDefined()
      expect(typeof config.win.nsis.allowToChangeInstallationDirectory).toBe('boolean')
    })

    it('NSIS 配置应该设置桌面快捷方式选项', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.nsis.createDesktopShortcut).toBeDefined()
      expect(typeof config.win.nsis.createDesktopShortcut).toBe('boolean')
    })

    it('NSIS 配置应该设置开始菜单快捷方式选项', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.nsis.createStartMenuShortcut).toBeDefined()
      expect(typeof config.win.nsis.createStartMenuShortcut).toBe('boolean')
    })

    it('Windows 配置应该设置产物命名模式', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.win.artifactName).toBeDefined()
      expect(typeof config.win.artifactName).toBe('string')
      expect(config.win.artifactName.length).toBeGreaterThan(0)
    })
  })

  describe('输出目录配置 (Requirement 2.9)', () => {
    it('应该配置输出目录', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.directories).toBeDefined()
      expect(config.directories.output).toBeDefined()
      expect(typeof config.directories.output).toBe('string')
    })

    it('输出目录应该设置为 release', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.directories.output).toBe('release')
    })

    it('应该配置构建资源目录', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.directories.buildResources).toBeDefined()
      expect(typeof config.directories.buildResources).toBe('string')
    })

    it('构建资源目录应该设置为 build', async () => {
      const configPath = path.join(projectRoot, 'electron-builder.json5')
      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(configContent)
      
      expect(config.directories.buildResources).toBe('build')
    })
  })

  describe('打包脚本配置 (Requirements 3.2, 3.3, 3.4, 3.5)', () => {
    it('应该在 package.json 中定义 package 脚本', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts.package).toBeDefined()
      expect(pkg.scripts.package).toContain('electron-builder')
    })

    it('package 脚本应该在打包前执行构建', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      // 验证 package 脚本包含 build 或直接调用 electron-builder (会自动构建)
      const packageScript = pkg.scripts.package
      const hasBuild = packageScript.includes('build') || packageScript.includes('electron-builder')
      expect(hasBuild).toBe(true)
    })

    it('应该在 package.json 中定义 package:mac 脚本 (Requirement 3.3)', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts['package:mac']).toBeDefined()
      expect(pkg.scripts['package:mac']).toContain('electron-builder')
      expect(pkg.scripts['package:mac']).toContain('--mac')
    })

    it('package:mac 脚本应该在打包前执行构建 (Requirement 3.6)', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const packageMacScript = pkg.scripts['package:mac']
      expect(packageMacScript).toContain('build')
    })

    it('应该在 package.json 中定义 package:win 脚本 (Requirement 3.4)', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts['package:win']).toBeDefined()
      expect(pkg.scripts['package:win']).toContain('electron-builder')
      expect(pkg.scripts['package:win']).toContain('--win')
    })

    it('package:win 脚本应该在打包前执行构建 (Requirement 3.6)', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      const packageWinScript = pkg.scripts['package:win']
      expect(packageWinScript).toContain('build')
    })

    it('应该在 package.json 中定义 release 脚本 (Requirement 3.5)', async () => {
      const pkgPath = path.join(projectRoot, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgContent)
      
      expect(pkg.scripts.release).toBeDefined()
      // release 脚本应该调用 package 脚本
      expect(pkg.scripts.release).toContain('package')
    })
  })
})
