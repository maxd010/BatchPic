import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { FileScannerImpl } from './FileScanner';
import { SharpImageProcessor } from './ImageProcessor';
import { TemplateManager } from './TemplateManager';
import { OutputManagerImpl } from './OutputManager';
import { ImageFile, ProcessingParams } from './types';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Initialize services
const fileScanner = new FileScannerImpl();
const imageProcessor = new SharpImageProcessor();
const templateManager = new TemplateManager();
const outputManager = new OutputManagerImpl();

// IPC Handlers

// File scanning (Requirements 1.1, 1.2)
ipcMain.handle('scan-files', async (_event, paths: string[]) => {
  try {
    const files = await fileScanner.scan(paths);
    return files;
  } catch (error) {
    console.error('Error scanning files:', error);
    throw error;
  }
});

// Image processing
ipcMain.handle('process-images', async (event, files: ImageFile[], params: ProcessingParams) => {
  try {
    // Create output directory
    const outputRoot = await outputManager.createOutputDirectory(files.map(f => f.path));
    
    // Process images with progress callback
    const result = await imageProcessor.processBatch(
      files,
      params,
      outputRoot,
      (current: number, total: number) => {
        // Send progress updates to renderer
        const progress = Math.round((current / total) * 100);
        event.sender.send('processing-progress', progress);
      }
    );
    
    return { result, outputDirectory: outputRoot };
  } catch (error) {
    console.error('Error processing images:', error);
    throw error;
  }
});

// Template management
ipcMain.handle('save-template', async (_event, name: string, params: ProcessingParams) => {
  try {
    await templateManager.save(name, params);
  } catch (error) {
    console.error('Error saving template:', error);
    throw error;
  }
});

ipcMain.handle('load-templates', async () => {
  try {
    const templates = await templateManager.loadAll();
    return templates;
  } catch (error) {
    console.error('Error loading templates:', error);
    throw error;
  }
});

ipcMain.handle('delete-template', async (_event, id: string) => {
  try {
    await templateManager.delete(id);
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
});

// Estimate file size for preview (Requirement 8.4)
ipcMain.handle('estimate-file-size', async (_event, filePath: string, params: ProcessingParams) => {
  try {
    const fs = require('fs/promises');
    const sharp = require('sharp');
    
    // Get actual image dimensions
    const metadata = await sharp(filePath).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not read image dimensions');
    }
    
    // Create a temporary image file to estimate size
    const tempOutputPath = path.join(require('os').tmpdir(), `estimate-${Date.now()}.jpg`);
    const imageFile: ImageFile = {
      path: filePath,
      relativePath: path.basename(filePath),
      format: (metadata.format as 'jpg' | 'png' | 'webp') || 'jpg',
      size: (await fs.stat(filePath)).size,
      dimensions: { width: metadata.width, height: metadata.height }
    };
    
    const result = await imageProcessor.process(imageFile, params, tempOutputPath);
    
    // Clean up temp file
    await fs.unlink(tempOutputPath).catch(() => {});
    
    return result.processedSize;
  } catch (error) {
    console.error('Error estimating file size:', error);
    throw error;
  }
});

// Output directory operations
ipcMain.handle('open-output-directory', async (_event, dirPath: string) => {
  try {
    await outputManager.openOutputDirectory(dirPath);
  } catch (error) {
    console.error('Error opening output directory:', error);
    throw error;
  }
});
