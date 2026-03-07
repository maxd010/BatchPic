import { app } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Template, TemplateManager as ITemplateManager, ProcessingParams } from './types.js';

interface TemplateStorage {
  templates: Template[];
  version: string;
}

export class TemplateManager implements ITemplateManager {
  private templatesFilePath: string;
  private readonly STORAGE_VERSION = '1.0.0';

  constructor() {
    // Use Electron's userData directory for storage
    const userDataPath = app.getPath('userData');
    this.templatesFilePath = path.join(userDataPath, 'templates.json');
  }

  /**
   * Save a new template
   */
  async save(name: string, params: ProcessingParams): Promise<void> {
    const templates = await this.loadAll();
    
    // Generate unique ID
    const id = this.generateId();
    
    const newTemplate: Template = {
      id,
      name,
      params,
      createdAt: new Date()
    };
    
    templates.push(newTemplate);
    await this.saveToFile(templates);
  }

  /**
   * Load all templates
   */
  async loadAll(): Promise<Template[]> {
    try {
      const fileContent = await fs.readFile(this.templatesFilePath, 'utf-8');
      const storage: TemplateStorage = JSON.parse(fileContent);
      
      // Convert createdAt strings back to Date objects
      return storage.templates.map(template => ({
        ...template,
        createdAt: new Date(template.createdAt)
      }));
    } catch (error: any) {
      // If file doesn't exist or is invalid, return empty array
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete a template by ID
   */
  async delete(id: string): Promise<void> {
    const templates = await this.loadAll();
    const filteredTemplates = templates.filter(template => template.id !== id);
    await this.saveToFile(filteredTemplates);
  }

  /**
   * Save templates to file
   */
  private async saveToFile(templates: Template[]): Promise<void> {
    const storage: TemplateStorage = {
      templates,
      version: this.STORAGE_VERSION
    };
    
    // Ensure directory exists
    const dir = path.dirname(this.templatesFilePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write to file with pretty formatting
    await fs.writeFile(
      this.templatesFilePath,
      JSON.stringify(storage, null, 2),
      'utf-8'
    );
  }

  /**
   * Generate a unique ID for a template
   */
  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
