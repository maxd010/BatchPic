import { useEffect, useState, useCallback } from 'react';
import { useAppContext, DEFAULT_PARAMS } from '../context/AppContext';
import { DropZone } from './DropZone';
import { ParameterPanel } from './ParameterPanel';
import { PreviewPanel } from './PreviewPanel';
import { TemplateSelector } from './TemplateSelector';
import { NotificationContainer } from './NotificationContainer';
import { ErrorReportDialog } from './ErrorReportDialog';
import './MainWindow.css';

/**
 * MainWindow - Single-page application root component
 * 
 * Requirements:
 * - 7.1: Display all processing options on a single main page
 * - 7.3: Show drag-drop area, size options, compression options, format options, 
 *        template selection, and start button on application startup
 * 
 * Layout structure:
 * - Header with app title
 * - Main content area with:
 *   - Drop zone (left side)
 *   - Parameter panel (right side)
 *   - Preview panel (bottom)
 * - Footer with export button
 */
export function MainWindow() {
  const { 
    state, 
    setInputFiles, 
    setTemplates, 
    setProcessingParams, 
    setSelectedTemplateId,
    setIsProcessing,
    setProgress,
    setResult,
    setOutputDirectory,
    resetState,
    showNotification,
    dismissNotification,
    notifications
  } = useAppContext();
  const [estimatedSize, setEstimatedSize] = useState<number | undefined>();
  const [showErrorReport, setShowErrorReport] = useState(false);

  // Load templates on mount
  useEffect(() => {
    // TODO: Load templates from TemplateManager via IPC
    // This will be implemented in task 9.1
  }, [setTemplates]);

  // Listen for progress updates from main process (Requirement 9.5)
  useEffect(() => {
    if (!window.electronAPI?.onProcessingProgress) {
      console.warn('electronAPI.onProcessingProgress not available');
      return;
    }

    const unsubscribe = window.electronAPI.onProcessingProgress((progress: number) => {
      setProgress(progress);
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [setProgress]);

  // Handle files dropped into the drop zone
  const handleFilesDropped = async (paths: string[]) => {
    try {
      // Scan files via IPC (Requirements 1.1, 1.2)
      const scannedFiles = await window.electronAPI.scanFiles(paths);
      
      // Update state with scanned files
      // If files already exist, append new files (allow adding more files)
      setInputFiles([...state.inputFiles, ...scannedFiles]);
      
      // Automatically apply default parameters (Requirement 8.1)
      setProcessingParams(DEFAULT_PARAMS);
      
      // Show notification confirming ready-to-use version (Requirement 8.2)
      showNotification('已为你准备好一个可直接使用的版本', 'success', 3000);
    } catch (error) {
      console.error('Failed to scan files:', error);
      showNotification('文件扫描失败', 'error', 3000);
    }
  };

  // Handle parameter changes with real-time feedback (Requirement 8.4)
  // The ParameterPanel now debounces parameter changes internally
  // This handler receives debounced parameters and updates expensive operations
  const handleParametersChange = useCallback(async (params: any) => {
    setProcessingParams(params);
    
    // Disable file size estimation for now - it's too expensive
    // TODO: Implement a faster estimation method
    /*
    // Estimate output file size based on first image (debounced)
    if (state.inputFiles.length > 0) {
      try {
        const estimated = await window.electronAPI.estimateFileSize(
          state.inputFiles[0].path,
          params
        );
        setEstimatedSize(estimated);
      } catch (error) {
        console.error('Failed to estimate file size:', error);
      }
    }
    */
  }, [setProcessingParams]);

  // Handle template selection (Requirement 5.3)
  const handleSelectTemplate = (templateId: string) => {
    const template = state.templates.find(t => t.id === templateId);
    if (template) {
      setProcessingParams(template.params);
      setSelectedTemplateId(templateId);
    }
  };

  // Handle save template (Requirement 5.1)
  const handleSaveTemplate = async (name: string) => {
    try {
      // TODO: Save template via IPC to TemplateManager
      // This will be implemented in task 9.1
      console.log('Save template:', name, state.processingParams);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  // Handle delete template (Requirement 5.4)
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      // TODO: Delete template via IPC to TemplateManager
      // This will be implemented in task 9.1
      console.log('Delete template:', templateId);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  // Handle export button click (Requirements 10.1, 10.2)
  const handleExport = async () => {
    if (state.inputFiles.length === 0 || state.isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setResult(undefined);

      // Process images via IPC (Requirement 10.1 - no confirmation dialog)
      const response = await window.electronAPI.processImages(
        state.inputFiles,
        state.processingParams
      );

      // Update state with result (Requirement 10.3)
      setResult(response.result);
      setProgress(100);
      setOutputDirectory(response.outputDirectory);

      // Show error report dialog if there are failures (Requirement 10.4)
      if (response.result.failed.length > 0) {
        setShowErrorReport(true);
      }
    } catch (error) {
      console.error('Failed to process images:', error);
      showNotification(`导出失败: ${error instanceof Error ? error.message : String(error)}`, 'error', 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle open output directory (Requirement 10.3)
  const handleOpenOutputDirectory = async () => {
    if (!state.outputDirectory) {
      return;
    }

    try {
      await window.electronAPI.openOutputDirectory(state.outputDirectory);
    } catch (error) {
      console.error('Failed to open output directory:', error);
    }
  };

  // Handle close error report dialog (Requirement 10.4)
  const handleCloseErrorReport = () => {
    setShowErrorReport(false);
  };

  return (
    <div className="main-window">
      {/* Notification container (Requirement 8.2) */}
      <NotificationContainer 
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      {/* Error report dialog (Requirement 10.4) */}
      {showErrorReport && state.result && (
        <ErrorReportDialog 
          result={state.result}
          onClose={handleCloseErrorReport}
        />
      )}

      {/* Header */}
      <header className="main-header">
        <h1>BatchPic</h1>
        <p className="subtitle">图片交付准备工具</p>
      </header>

      {/* Main content area - single page layout (Requirement 7.1) */}
      <main className="main-content">
        {/* Left side: Drop zone and file list */}
        <section className="drop-zone-section">
          {/* DropZone component (Task 7.2) */}
          <DropZone 
            onFilesDropped={handleFilesDropped}
            isEmpty={state.inputFiles.length === 0}
            fileCount={state.inputFiles.length}
          />
          
          {/* File list */}
          {state.inputFiles.length > 0 && (
            <div className="file-list">
              <h3>已选择 {state.inputFiles.length} 张图片</h3>
              <ul>
                {state.inputFiles.slice(0, 5).map((file, index) => (
                  <li key={index}>
                    {file.relativePath} ({Math.round(file.size / 1024)} KB)
                  </li>
                ))}
                {state.inputFiles.length > 5 && (
                  <li className="more">...还有 {state.inputFiles.length - 5} 张</li>
                )}
              </ul>
            </div>
          )}
        </section>

        {/* Right side: Parameter controls */}
        <section className="parameter-section">
          {/* ParameterPanel component (Task 7.3) */}
          <ParameterPanel
            params={state.processingParams}
            onChange={handleParametersChange}
            inputFiles={state.inputFiles}
            estimatedSize={estimatedSize}
          />

          {/* TemplateSelector component (Task 7.5) */}
          <TemplateSelector
            templates={state.templates}
            selectedId={state.selectedTemplateId}
            onSelect={handleSelectTemplate}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
          />
        </section>

        {/* Preview panel (bottom, full width) */}
        <section className="preview-section">
          {/* PreviewPanel component (Task 7.4) */}
          {state.inputFiles.length > 0 && (
            <PreviewPanel
              originalImage={state.inputFiles[0]}
              params={state.processingParams}
            />
          )}
        </section>
      </main>

      {/* Footer with export button */}
      <footer className="main-footer">
        {/* Export button (Requirement 10.1) */}
        <button 
          className="export-button"
          onClick={handleExport}
          disabled={state.inputFiles.length === 0 || state.isProcessing}
        >
          {state.isProcessing ? `处理中... ${state.progress}%` : '导出图片'}
        </button>
        
        {/* Processing progress (Requirement 9.5) */}
        {state.isProcessing && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${state.progress}%` }}
            />
          </div>
        )}

        {/* Result message (Requirement 10.3) */}
        {state.result && (
          <div className="result-message">
            <p>
              处理完成！成功: {state.result.successful.length} 张，
              失败: {state.result.failed.length} 张
            </p>
            {state.outputDirectory && (
              <button 
                className="open-folder-button"
                onClick={handleOpenOutputDirectory}
              >
                打开输出文件夹
              </button>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
