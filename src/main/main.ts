import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FileScannerImpl } from './FileScanner.js';
import { SharpImageProcessor } from './ImageProcessor.js';
import { TemplateManager } from './TemplateManager.js';
import { OutputManagerImpl } from './OutputManager.js';
import { ImageFile, ProcessingParams } from './types.js';

// ES 模块中获取 __dirname 的方式
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Always load from localhost in dev, and always open DevTools
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    
    // Open DevTools
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow!.webContents.openDevTools();
    });
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

// Open file dialog
ipcMain.handle('open-file-dialog', async () => {
  try {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return [];
  } catch (error) {
    console.error('Error opening file dialog:', error);
    throw error;
  }
});

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

// Load image as data URL for preview
ipcMain.handle('load-image-preview', async (_event, filePath: string) => {
  try {
    const fs = require('fs/promises');
    const imageBuffer = await fs.readFile(filePath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/jpeg';
    
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error loading image preview:', error);
    throw error;
  }
});

// Auto-process on drop APIs (Requirements 2.3, 5.3, 6.1, 6.2)

// Create output directory (Requirement 6.1)
ipcMain.handle('create-output-directory', async (_event, inputPaths: string[]) => {
  try {
    const outputDir = await outputManager.createOutputDirectory(inputPaths);
    return outputDir;
  } catch (error) {
    console.error('Failed to create output directory:', error);
    throw error;
  }
});

// Process images with fine-grained progress (Requirements 5.3, 6.1)
ipcMain.handle(
  'process-images-with-progress',
  async (event, files: ImageFile[], params: ProcessingParams, outputDir: string) => {
    try {
      const result = await imageProcessor.processBatch(
        files,
        params,
        outputDir,
        (currentIndex: number, total: number, processedImage: any) => {
          // Send per-image progress event (Requirement 5.3)
          event.sender.send('image-processed', currentIndex, processedImage);
        }
      );
      
      return result;
    } catch (error) {
      console.error('Failed to process images:', error);
      throw error;
    }
  }
);
