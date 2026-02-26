import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  scanFiles: (paths: string[]) => ipcRenderer.invoke('scan-files', paths),
  
  // Image processing
  processImages: (files: any[], params: any) => ipcRenderer.invoke('process-images', files, params),
  estimateFileSize: (filePath: string, params: any) => ipcRenderer.invoke('estimate-file-size', filePath, params),
  
  // Template management
  saveTemplate: (name: string, params: any) => ipcRenderer.invoke('save-template', name, params),
  loadTemplates: () => ipcRenderer.invoke('load-templates'),
  deleteTemplate: (id: string) => ipcRenderer.invoke('delete-template', id),
  
  // Output management
  openOutputDirectory: (path: string) => ipcRenderer.invoke('open-output-directory', path),
  
  // Image preview
  loadImagePreview: (filePath: string) => ipcRenderer.invoke('load-image-preview', filePath),
  
  // Progress updates
  onProcessingProgress: (callback: (progress: number) => void) => {
    const listener = (_event: any, progress: number) => callback(progress);
    ipcRenderer.on('processing-progress', listener);
    return () => ipcRenderer.removeListener('processing-progress', listener);
  }
});
