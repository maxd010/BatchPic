import { TemplateManager } from './TemplateManager';
import { ProcessingParams, Template } from './types';
import { promises as fs } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import * as fc from 'fast-check';

// Mock Electron's app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn()
  }
}));

describe('TemplateManager', () => {
  let templateManager: TemplateManager;
  let tempDir: string;
  let templatesFilePath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = path.join(__dirname, '../../test-temp', `templates-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Mock app.getPath to return our temp directory
    (app.getPath as jest.Mock).mockReturnValue(tempDir);
    
    templatesFilePath = path.join(tempDir, 'templates.json');
    templateManager = new TemplateManager();
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('save', () => {
    it('should save a template to JSON file', async () => {
      const params: ProcessingParams = {
        resize: { mode: 'width', value: 1920 },
        compression: { mode: 'quality', value: 80 },
        format: 'jpg'
      };

      await templateManager.save('Instagram Post', params);

      // Verify file was created
      const fileExists = await fs.access(templatesFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify content
      const fileContent = await fs.readFile(templatesFilePath, 'utf-8');
      const storage = JSON.parse(fileContent);
      
      expect(storage.version).toBe('1.0.0');
      expect(storage.templates).toHaveLength(1);
      expect(storage.templates[0].name).toBe('Instagram Post');
      expect(storage.templates[0].params).toEqual(params);
      expect(storage.templates[0].id).toBeDefined();
      expect(storage.templates[0].createdAt).toBeDefined();
    });

    it('should save multiple templates', async () => {
      const params1: ProcessingParams = {
        resize: { mode: 'aspectRatio', value: 1080, aspectRatio: '1:1' },
        format: 'jpg'
      };
      
      const params2: ProcessingParams = {
        resize: { mode: 'width', value: 1920 },
        compression: { mode: 'quality', value: 90 }
      };

      await templateManager.save('Square Post', params1);
      await templateManager.save('HD Export', params2);

      const templates = await templateManager.loadAll();
      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Square Post');
      expect(templates[1].name).toBe('HD Export');
    });

    it('should create directory if it does not exist', async () => {
      // Remove the directory
      await fs.rm(tempDir, { recursive: true, force: true });

      const params: ProcessingParams = {
        compression: { mode: 'quality', value: 70 }
      };

      await templateManager.save('Test Template', params);

      // Verify directory and file were created
      const fileExists = await fs.access(templatesFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('loadAll', () => {
    it('should return empty array when no templates file exists', async () => {
      const templates = await templateManager.loadAll();
      expect(templates).toEqual([]);
    });

    it('should load all saved templates', async () => {
      const params1: ProcessingParams = {
        resize: { mode: 'width', value: 800 }
      };
      
      const params2: ProcessingParams = {
        format: 'webp',
        compression: { mode: 'quality', value: 85 }
      };

      await templateManager.save('Template 1', params1);
      await templateManager.save('Template 2', params2);

      const templates = await templateManager.loadAll();
      
      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Template 1');
      expect(templates[0].params).toEqual(params1);
      expect(templates[1].name).toBe('Template 2');
      expect(templates[1].params).toEqual(params2);
    });

    it('should convert createdAt strings to Date objects', async () => {
      const params: ProcessingParams = {
        compression: { mode: 'quality', value: 70 }
      };

      await templateManager.save('Test Template', params);
      const templates = await templateManager.loadAll();

      expect(templates[0].createdAt).toBeInstanceOf(Date);
    });

    it('should preserve all template properties', async () => {
      const params: ProcessingParams = {
        resize: { mode: 'aspectRatio', value: 1080, aspectRatio: '16:9' },
        compression: { mode: 'targetSize', value: 500 },
        format: 'png'
      };

      await templateManager.save('Complex Template', params);
      const templates = await templateManager.loadAll();

      expect(templates[0].params.resize).toEqual(params.resize);
      expect(templates[0].params.compression).toEqual(params.compression);
      expect(templates[0].params.format).toBe(params.format);
    });
  });

  describe('delete', () => {
    it('should delete a template by ID', async () => {
      const params: ProcessingParams = {
        resize: { mode: 'width', value: 1920 }
      };

      await templateManager.save('To Delete', params);
      const templates = await templateManager.loadAll();
      expect(templates).toHaveLength(1);

      const templateId = templates[0].id;
      await templateManager.delete(templateId);

      const remainingTemplates = await templateManager.loadAll();
      expect(remainingTemplates).toHaveLength(0);
    });

    it('should only delete the specified template', async () => {
      await templateManager.save('Template 1', { format: 'jpg' });
      await templateManager.save('Template 2', { format: 'png' });
      await templateManager.save('Template 3', { format: 'webp' });

      const templates = await templateManager.loadAll();
      expect(templates).toHaveLength(3);

      // Delete the middle template
      await templateManager.delete(templates[1].id);

      const remainingTemplates = await templateManager.loadAll();
      expect(remainingTemplates).toHaveLength(2);
      expect(remainingTemplates[0].name).toBe('Template 1');
      expect(remainingTemplates[1].name).toBe('Template 3');
    });

    it('should handle deleting non-existent template gracefully', async () => {
      await templateManager.save('Template 1', { format: 'jpg' });

      // Try to delete a non-existent ID
      await templateManager.delete('non-existent-id');

      const templates = await templateManager.loadAll();
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('Template 1');
    });
  });

  describe('template persistence round-trip', () => {
    it('should preserve all parameters after save and load', async () => {
      const originalParams: ProcessingParams = {
        resize: { mode: 'aspectRatio', value: 1080, aspectRatio: '4:5' },
        compression: { mode: 'targetSize', value: 250 },
        format: 'webp'
      };

      await templateManager.save('Round Trip Test', originalParams);
      const templates = await templateManager.loadAll();

      expect(templates[0].params).toEqual(originalParams);
    });

    it('should handle templates with minimal parameters', async () => {
      const minimalParams: ProcessingParams = {
        format: 'jpg'
      };

      await templateManager.save('Minimal', minimalParams);
      const templates = await templateManager.loadAll();

      expect(templates[0].params).toEqual(minimalParams);
    });

    it('should handle templates with only resize parameters', async () => {
      const resizeOnlyParams: ProcessingParams = {
        resize: { mode: 'longEdge', value: 2048 }
      };

      await templateManager.save('Resize Only', resizeOnlyParams);
      const templates = await templateManager.loadAll();

      expect(templates[0].params).toEqual(resizeOnlyParams);
    });

    it('should handle templates with only compression parameters', async () => {
      const compressionOnlyParams: ProcessingParams = {
        compression: { mode: 'quality', value: 60 }
      };

      await templateManager.save('Compression Only', compressionOnlyParams);
      const templates = await templateManager.loadAll();

      expect(templates[0].params).toEqual(compressionOnlyParams);
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs for each template', async () => {
      await templateManager.save('Template 1', { format: 'jpg' });
      await templateManager.save('Template 2', { format: 'png' });
      await templateManager.save('Template 3', { format: 'webp' });

      const templates = await templateManager.loadAll();
      const ids = templates.map(t => t.id);

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('file format', () => {
    it('should save templates in pretty-printed JSON format', async () => {
      const params: ProcessingParams = {
        resize: { mode: 'width', value: 1920 },
        format: 'jpg'
      };

      await templateManager.save('Pretty Print Test', params);

      const fileContent = await fs.readFile(templatesFilePath, 'utf-8');
      
      // Check that the JSON is formatted with indentation
      expect(fileContent).toContain('\n');
      expect(fileContent).toContain('  ');
    });

    it('should include version in storage format', async () => {
      await templateManager.save('Version Test', { format: 'jpg' });

      const fileContent = await fs.readFile(templatesFilePath, 'utf-8');
      const storage = JSON.parse(fileContent);

      expect(storage.version).toBe('1.0.0');
    });
  });

  // Feature: batchpic, Property 9: 模板持久化往返
  // **Validates: Requirements 5.2, 5.3**
  describe('Property 9: Template Persistence Round-Trip', () => {
    it('should preserve any valid ProcessingParams after save and load', async () => {
      // Arbitrary generators for ProcessingParams
      const resizeModeArb = fc.constantFrom('width', 'height', 'longEdge', 'shortEdge', 'aspectRatio');
      const aspectRatioArb = fc.constantFrom('1:1', '4:5', '16:9');
      const formatArb = fc.constantFrom('jpg', 'png', 'webp');
      
      const resizeParamsArb = fc.record({
        mode: resizeModeArb,
        value: fc.integer({ min: 50, max: 5000 }),
        aspectRatio: fc.option(aspectRatioArb, { nil: undefined })
      }).map(params => {
        // Only include aspectRatio when mode is 'aspectRatio'
        if (params.mode === 'aspectRatio') {
          return { ...params, aspectRatio: params.aspectRatio || '1:1' };
        } else {
          const { aspectRatio, ...rest } = params;
          return rest;
        }
      });

      const compressionParamsArb = fc.record({
        mode: fc.constantFrom('targetSize', 'quality'),
        value: fc.integer({ min: 1, max: 100 })
      }).map(params => {
        // Adjust value range based on mode
        if (params.mode === 'targetSize') {
          return { mode: params.mode, value: Math.max(10, params.value * 10) }; // 10-1000 KB
        }
        return params; // quality: 1-100
      });

      const processingParamsArb = fc.record({
        resize: fc.option(resizeParamsArb, { nil: undefined }),
        compression: fc.option(compressionParamsArb, { nil: undefined }),
        format: fc.option(formatArb, { nil: undefined })
      }).filter(params => {
        // Ensure at least one parameter is defined
        return params.resize !== undefined || params.compression !== undefined || params.format !== undefined;
      });

      const templateNameArb = fc.string({ minLength: 1, maxLength: 50 });

      await fc.assert(
        fc.asyncProperty(
          templateNameArb,
          processingParamsArb,
          async (name, originalParams) => {
            // Save the template
            await templateManager.save(name, originalParams);
            
            // Load all templates
            const templates = await templateManager.loadAll();
            
            // Find the template we just saved (it should be the last one)
            const savedTemplate = templates[templates.length - 1];
            
            // Verify the parameters match exactly
            expect(savedTemplate.name).toBe(name);
            expect(savedTemplate.params).toEqual(originalParams);
            
            // Clean up for next iteration
            await templateManager.delete(savedTemplate.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
