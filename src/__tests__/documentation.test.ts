/**
 * 文档系统单元测试
 * 
 * 测试范围:
 * - 文档文件存在性 (Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7)
 * - 文档结构完整性
 * - 必需章节验证
 */

import { describe, it, expect } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '../..')

describe('文档系统单元测试', () => {
  describe('文档文件存在性', () => {
    it('应该存在 PACKAGING_GUIDE.md 文档文件', async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      const exists = await fs.access(docPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('PACKAGING_GUIDE.md 应该是可读的文件', async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      const stats = await fs.stat(docPath)
      expect(stats.isFile()).toBe(true)
      expect(stats.size).toBeGreaterThan(0)
    })
  })

  describe('文档结构完整性', () => {
    let docContent: string

    beforeAll(async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      docContent = await fs.readFile(docPath, 'utf-8')
    })

    it('应该包含版本管理规范章节 (Requirement 4.1)', () => {
      expect(docContent).toMatch(/##?\s*1\.?\s*版本管理规范/)
    })

    it('应该包含发布流程章节 (Requirement 4.2)', () => {
      expect(docContent).toMatch(/##?\s*2\.?\s*发布流程/)
    })

    it('应该包含代码签名配置章节 (Requirement 4.3)', () => {
      expect(docContent).toMatch(/##?\s*3\.?\s*代码签名配置/)
    })

    it('应该包含自动更新配置章节 (Requirement 4.4)', () => {
      expect(docContent).toMatch(/##?\s*4\.?\s*自动更新配置/)
    })

    it('应该包含常见问题章节 (Requirement 4.5)', () => {
      expect(docContent).toMatch(/##?\s*5\.?\s*常见问题/)
    })

    it('应该包含附录章节 (Requirement 4.6)', () => {
      expect(docContent).toMatch(/##?\s*6\.?\s*附录/)
    })
  })

  describe('版本管理规范章节内容', () => {
    let docContent: string

    beforeAll(async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      docContent = await fs.readFile(docPath, 'utf-8')
    })

    it('应该包含语义化版本说明', () => {
      expect(docContent).toMatch(/语义化版本|Semantic Versioning/)
    })

    it('应该包含版本号格式说明 (MAJOR.MINOR.PATCH)', () => {
      expect(docContent).toMatch(/MAJOR\.MINOR\.PATCH/)
    })

    it('应该包含版本号更新流程', () => {
      expect(docContent).toMatch(/版本号更新流程|npm version/)
    })

    it('应该包含预发布版本说明', () => {
      expect(docContent).toMatch(/预发布版本|alpha|beta|rc/)
    })
  })

  describe('发布流程章节内容', () => {
    let docContent: string

    beforeAll(async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      docContent = await fs.readFile(docPath, 'utf-8')
    })

    it('应该包含完整发布步骤', () => {
      expect(docContent).toMatch(/完整发布步骤|发布步骤/)
    })

    it('应该包含构建命令说明', () => {
      expect(docContent).toMatch(/npm run build/)
    })

    it('应该包含打包命令说明', () => {
      expect(docContent).toMatch(/npm run package/)
    })

    it('应该包含发布检查清单', () => {
      expect(docContent).toMatch(/发布检查清单|检查清单/)
    })

    it('应该包含测试验证步骤', () => {
      expect(docContent).toMatch(/测试|验证/)
    })
  })

  describe('代码签名配置章节内容', () => {
    let docContent: string

    beforeAll(async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      docContent = await fs.readFile(docPath, 'utf-8')
    })

    it('应该包含 macOS 代码签名说明', () => {
      expect(docContent).toMatch(/macOS.*代码签名|代码签名.*macOS/)
    })

    it('应该包含 Windows 代码签名说明', () => {
      expect(docContent).toMatch(/Windows.*代码签名|代码签名.*Windows/)
    })

    it('应该包含证书配置说明', () => {
      expect(docContent).toMatch(/证书|certificate/)
    })

    it('应该包含安全建议', () => {
      expect(docContent).toMatch(/安全|密码|环境变量/)
    })
  })

  describe('自动更新配置章节内容', () => {
    let docContent: string

    beforeAll(async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      docContent = await fs.readFile(docPath, 'utf-8')
    })

    it('应该包含更新机制说明', () => {
      expect(docContent).toMatch(/更新机制|自动更新|electron-updater/)
    })

    it('应该包含更新服务器配置', () => {
      expect(docContent).toMatch(/更新服务器|GitHub Releases|publish/)
    })

    it('应该包含更新实现代码示例', () => {
      expect(docContent).toMatch(/autoUpdater|checkForUpdates/)
    })

    it('应该包含测试自动更新说明', () => {
      expect(docContent).toMatch(/测试.*更新|更新.*测试/)
    })
  })

  describe('常见问题章节内容', () => {
    let docContent: string

    beforeAll(async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      docContent = await fs.readFile(docPath, 'utf-8')
    })

    it('应该包含构建问题排查', () => {
      expect(docContent).toMatch(/构建问题|构建失败/)
    })

    it('应该包含打包问题排查', () => {
      expect(docContent).toMatch(/打包问题|打包失败/)
    })

    it('应该包含运行时问题排查', () => {
      expect(docContent).toMatch(/运行时问题|运行时错误/)
    })

    it('应该包含解决方法说明', () => {
      expect(docContent).toMatch(/解决方法|解决方案/)
    })
  })

  describe('附录章节内容', () => {
    let docContent: string

    beforeAll(async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      docContent = await fs.readFile(docPath, 'utf-8')
    })

    it('应该包含配置文件参考', () => {
      expect(docContent).toMatch(/配置文件参考|package\.json|electron-builder/)
    })

    it('应该包含工具链说明', () => {
      expect(docContent).toMatch(/工具链说明|TypeScript|Vite|electron-builder/)
    })

    it('应该包含目录结构说明', () => {
      expect(docContent).toMatch(/目录结构|src\/|dist\//)
    })

    it('应该包含相关资源链接', () => {
      expect(docContent).toMatch(/相关资源|官方文档|文档/)
    })
  })

  describe('文档质量验证', () => {
    let docContent: string

    beforeAll(async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      docContent = await fs.readFile(docPath, 'utf-8')
    })

    it('文档应该包含标题', () => {
      expect(docContent).toMatch(/^#\s+.+/m)
    })

    it('文档应该包含目录', () => {
      expect(docContent).toMatch(/目录|Table of Contents/)
    })

    it('文档应该包含代码示例', () => {
      expect(docContent).toMatch(/```/)
    })

    it('文档长度应该合理 (至少 5000 字符)', () => {
      expect(docContent.length).toBeGreaterThan(5000)
    })

    it('文档应该包含所有 6 个主要章节', () => {
      const sections = [
        /##?\s*1\.?\s*版本管理规范/,
        /##?\s*2\.?\s*发布流程/,
        /##?\s*3\.?\s*代码签名配置/,
        /##?\s*4\.?\s*自动更新配置/,
        /##?\s*5\.?\s*常见问题/,
        /##?\s*6\.?\s*附录/
      ]

      sections.forEach(sectionPattern => {
        expect(docContent).toMatch(sectionPattern)
      })
    })
  })

  describe('文档可访问性', () => {
    it('docs 目录应该存在', async () => {
      const docsDir = path.join(projectRoot, 'docs')
      const exists = await fs.access(docsDir).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('docs 目录应该是可读的目录', async () => {
      const docsDir = path.join(projectRoot, 'docs')
      const stats = await fs.stat(docsDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('PACKAGING_GUIDE.md 应该有合理的文件权限', async () => {
      const docPath = path.join(projectRoot, 'docs', 'PACKAGING_GUIDE.md')
      
      // 验证文件可读
      await expect(fs.readFile(docPath, 'utf-8')).resolves.toBeDefined()
    })
  })
})
