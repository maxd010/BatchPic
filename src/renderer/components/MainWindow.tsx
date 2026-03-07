import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { throttle } from 'lodash';
import { useAppContext, DEFAULT_PARAMS } from '../context/AppContext';
import { DropZone } from './DropZone';
import { ParameterPanel } from './ParameterPanel';
import { PreviewPanel } from './PreviewPanel';
import { TemplateSelector } from './TemplateSelector';
import { FullScreenPreview } from './FullScreenPreview';
import { NotificationContainer } from './NotificationContainer';
import { ErrorReportDialog } from './ErrorReportDialog';
import { ProgressPanel } from './ProgressPanel';
import { FolderOpenIcon, ArrowPathIcon, MagnifyingGlassPlusIcon, ChevronRightIcon, ChevronLeftIcon, AdjustmentsVerticalIcon } from './Icons';
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
    notifications,
    initializeImageProgress,
    updateImageProgress,
    setAutoProcessOnDrop,
  } = useAppContext();
  const [estimatedSize, setEstimatedSize] = useState<number | undefined>();
  const [showErrorReport, setShowErrorReport] = useState(false);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Create throttled version of updateImageProgress (Requirement 10.2)
  // Throttle to 100ms to avoid excessive re-renders during batch processing
  const throttledUpdateImageProgress = useRef(
    throttle((index: number, progress: any) => {
      updateImageProgress(index, progress);
    }, 100)
  ).current;

  // Cleanup throttled function on unmount
  useEffect(() => {
    return () => {
      throttledUpdateImageProgress.cancel();
    };
  }, [throttledUpdateImageProgress]);

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

  // Auto-process images after drop (Requirements 2.1, 2.2, 2.3, 5.5, 7.1, 7.2, 7.3)
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const autoProcessImages = useCallback(async (files: any[]) => {
    console.log('[MainWindow] autoProcessImages called with', files.length, 'files');
    
    try {
      console.log('[MainWindow] Setting isProcessing to true');
      setIsProcessing(true);
      
      // Create output directory (Requirements 2.3, 6.1)
      console.log('[MainWindow] Creating output directory...');
      const outputDir = await window.electronAPI.createOutputDirectory(
        files.map((f: any) => f.path)
      );
      console.log('[MainWindow] Output directory created:', outputDir);
      setOutputDirectory(outputDir);
      
      // Process images with per-image progress callback (Requirements 5.3, 5.5)
      console.log('[MainWindow] Starting processImagesWithProgress...');
      const results = await window.electronAPI.processImagesWithProgress(
        files,
        state.processingParams,
        outputDir,
        (index: number, result: any) => {
          console.log('[MainWindow] Progress callback for image', index, ':', result);
          // Update per-image progress with throttling (Requirements 3.2, 3.3, 3.4, 10.2)
          // Throttled to 100ms to prevent excessive re-renders during batch processing
          throttledUpdateImageProgress(index, {
            status: result.success ? 'success' : 'failed',
            progress: 100,
            error: result.error,
            outputPath: result.outputPath,
            originalSize: result.originalSize,
            processedSize: result.processedSize
          });
        }
      );
      
      console.log('[MainWindow] Processing completed:', results);
      
      // Update final result (Requirement 5.5)
      setResult(results);
      
      // Show completion notification (Requirements 7.1, 7.2)
      const successCount = results.successful.length;
      const failedCount = results.failed.length;
      
      if (failedCount > 0) {
        showNotification(
          `处理完成：${successCount} 成功，${failedCount} 失败`,
          'warning',
          5000
        );
        // Show error report dialog (Requirement 7.3)
        setShowErrorReport(true);
      } else {
        showNotification(
          `处理完成：${successCount} 张图片已导出`,
          'success',
          5000
        );
      }
    } catch (error) {
      console.error('[MainWindow] Auto-process failed:', error);
      showNotification(
        `自动处理失败: ${error instanceof Error ? error.message : String(error)}`,
        'error',
        5000
      );
    } finally {
      console.log('[MainWindow] Setting isProcessing to false');
      setIsProcessing(false);
    }
  }, [state.processingParams, throttledUpdateImageProgress, setIsProcessing, setOutputDirectory, setResult, showNotification]);

  // Handle files dropped into the drop zone
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleFilesDropped = useCallback(async (paths: string[]) => {
    console.log('[MainWindow] handleFilesDropped called with paths:', paths);
    console.log('[MainWindow] autoProcessOnDrop:', state.autoProcessOnDrop);
    
    try {
      // Scan files via IPC (Requirements 1.1, 1.2)
      console.log('[MainWindow] Calling scanFiles...');
      const scannedFiles = await window.electronAPI.scanFiles(paths);
      console.log('[MainWindow] Scanned files:', scannedFiles.length, 'files');
      
      // Update state with scanned files
      // If files already exist, append new files (allow adding more files)
      setInputFiles([...state.inputFiles, ...scannedFiles]);
      
      // Automatically apply default parameters (Requirement 8.1)
      setProcessingParams(DEFAULT_PARAMS);
      
      // Auto-trigger processing if enabled (Requirements 2.1, 2.4)
      console.log('[MainWindow] Checking auto-process condition:', {
        autoProcessOnDrop: state.autoProcessOnDrop,
        scannedFilesLength: scannedFiles.length
      });
      
      if (state.autoProcessOnDrop && scannedFiles.length > 0) {
        console.log('[MainWindow] Auto-processing triggered!');
        // Initialize image progress tracking (Requirements 3.1)
        console.log('[MainWindow] Initializing image progress...');
        initializeImageProgress(scannedFiles);
        await autoProcessImages(scannedFiles);
      } else {
        console.log('[MainWindow] Auto-processing NOT triggered');
        // Initialize image progress tracking (Requirements 3.1)
        console.log('[MainWindow] Initializing image progress...');
        initializeImageProgress(scannedFiles);
        // Show notification confirming ready-to-use version (Requirement 2.5)
        showNotification('已为你准备好一个可直接使用的版本', 'success', 3000);
      }
    } catch (error) {
      console.error('[MainWindow] Failed to scan files:', error);
      showNotification('文件扫描失败', 'error', 3000);
    }
  }, [state.inputFiles, state.autoProcessOnDrop, setInputFiles, setProcessingParams, initializeImageProgress, showNotification, autoProcessImages]);

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
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleSelectTemplate = useCallback((templateId: string) => {
    const template = state.templates.find(t => t.id === templateId);
    if (template) {
      setProcessingParams(template.params);
      setSelectedTemplateId(templateId);
    }
  }, [state.templates, setProcessingParams, setSelectedTemplateId]);

  // Handle save template (Requirement 5.1)
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleSaveTemplate = useCallback(async (name: string) => {
    try {
      // TODO: Save template via IPC to TemplateManager
      // This will be implemented in task 9.1
      console.log('Save template:', name, state.processingParams);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  }, [state.processingParams]);

  // Handle delete template (Requirement 5.4)
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      // TODO: Delete template via IPC to TemplateManager
      // This will be implemented in task 9.1
      console.log('Delete template:', templateId);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  }, []);

  // Handle export button click (Requirements 10.1, 10.2)
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleExport = useCallback(async () => {
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
  }, [state.inputFiles, state.isProcessing, state.processingParams, setIsProcessing, setProgress, setResult, setOutputDirectory, showNotification]);

  // Handle open output directory (Requirement 10.3)
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleOpenOutputDirectory = useCallback(async () => {
    if (!state.outputDirectory) {
      return;
    }

    try {
      await window.electronAPI.openOutputDirectory(state.outputDirectory);
    } catch (error) {
      console.error('Failed to open output directory:', error);
    }
  }, [state.outputDirectory]);

  // Handle close error report dialog (Requirement 10.4)
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleCloseErrorReport = useCallback(() => {
    setShowErrorReport(false);
  }, []);

  // Handle preview file click
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handlePreviewFile = useCallback((file: any) => {
    // Prevent preview if user is dragging
    if (isDragging) {
      return;
    }
    setPreviewFile(file);
  }, [isDragging]);

  // Handle close preview
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  // Handle clear files
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleClearFiles = useCallback(() => {
    setInputFiles([]);
  }, [setInputFiles]);

  // Handle auto-process toggle
  // Wrapped with useCallback to prevent recreation on every render (Requirement 10.4)
  const handleAutoProcessToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoProcessOnDrop(e.target.checked);
  }, [setAutoProcessOnDrop]);

  // Memoize expensive computations (Requirement 10.4)
  // Calculate if export button should be disabled
  const isExportDisabled = useMemo(() => {
    return state.inputFiles.length === 0 || state.isProcessing;
  }, [state.inputFiles.length, state.isProcessing]);

  // Calculate if files are loaded (used in multiple places)
  const hasFiles = useMemo(() => {
    return state.inputFiles.length > 0;
  }, [state.inputFiles.length]);

  // Calculate workspace class name
  const workspaceDropzoneClass = useMemo(() => {
    return `workspace-dropzone ${hasFiles ? 'compact-container' : ''}`;
  }, [hasFiles]);

  // Handle drag events on window level to track dragging state
  const handleWindowDragEnter = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleWindowDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear dragging state when leaving the window
    if (e.target === e.currentTarget) {
      setIsDragging(false);
    }
  }, []);

  const handleWindowDrop = useCallback(() => {
    // Clear dragging state after drop, with a small delay to prevent click
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  }, []);

  return (
    <div 
      className="main-window"
      onDragEnter={handleWindowDragEnter}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
    >
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

      {/* Full screen preview modal */}
      {previewFile && (
        <FullScreenPreview 
          image={previewFile}
          params={state.processingParams}
          onClose={handleClosePreview}
        />
      )}

      {/* Top Header with App Title */}
      <header className="app-header">
        <div className="app-title">
          <h1>BatchPic</h1>
          <p className="subtitle">图片交付准备工具</p>
        </div>
        
        {/* Auto-process toggle (Requirements 8.1, 8.2, 8.3, 8.5) */}
        <div className="auto-process-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={state.autoProcessOnDrop}
              onChange={handleAutoProcessToggle}
              className="toggle-checkbox"
            />
            <span className="toggle-text">拖拽后自动处理</span>
          </label>
        </div>
      </header>

      {/* Parameter Panel - Always at top */}
      <div className="top-parameter-panel">
        <ParameterPanel
          params={state.processingParams}
          onChange={handleParametersChange}
          inputFiles={state.inputFiles}
          estimatedSize={estimatedSize}
        />
      </div>

      {/* Main content area */}
      <main className="main-content-vertical">
        {/* Center workspace */}
        <section className="workspace-center">
          {/* Drop zone - compact when files loaded */}
          <div className={workspaceDropzoneClass}>
            <DropZone 
              onFilesDropped={handleFilesDropped}
              onClearFiles={handleClearFiles}
              isEmpty={!hasFiles}
              fileCount={state.inputFiles.length}
              compact={hasFiles}
            />
          </div>

          {/* File list and preview */}
          {hasFiles && (
            <div className="workspace-content">
              {/* Progress Panel - Show real-time progress (Requirements 4.1) */}
              {state.imageProgress.length > 0 && (
                <ProgressPanel 
                  imageProgress={state.imageProgress}
                  isProcessing={state.isProcessing}
                />
              )}
              
              {/* File list - compact horizontal cards */}
              <div className="file-list-compact">
                <div className="file-list-header">
                  <h3>已选择 {state.inputFiles.length} 张图片</h3>
                  <p className="file-list-tip">点击图片卡片可查看沉浸式对比预览</p>
                </div>
                <div className="file-grid">
                  {state.inputFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className="file-card"
                      onClick={() => handlePreviewFile(file)}
                    >
                      <div className="file-card-inner">
                        <div className="file-info-main">
                          <div className="file-name">{file.relativePath}</div>
                          <div className="file-size">{Math.round(file.size / 1024)} KB</div>
                        </div>
                        <div className="file-card-action">
                          <MagnifyingGlassPlusIcon className="preview-trigger-icon" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Template Selector and Export Actions */}
        <div className="bottom-actions">
          <div className="template-section-horizontal">
            <TemplateSelector
              templates={state.templates}
              selectedId={state.selectedTemplateId}
              onSelect={handleSelectTemplate}
              onSave={handleSaveTemplate}
              onDelete={handleDeleteTemplate}
            />
          </div>

          {/* Export button and results */}
          <div className="export-section">
            {/* Processing progress */}
            {state.isProcessing && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
                <span className="progress-text">{state.progress}%</span>
              </div>
            )}

            {/* Export button */}
            {hasFiles && (
              <button 
                className="export-button"
                onClick={handleExport}
                disabled={isExportDisabled}
              >
                {state.isProcessing ? '处理中...' : '开始导出图片'}
              </button>
            )}

            {/* Result message */}
            {state.result && (
              <div className="result-inline">
                <div className="result-info">
                  <p>✓ 处理完成 ({state.result.successful.length} 成功, {state.result.failed.length} 失败)</p>
                </div>
                <div className="result-actions">
                  {state.outputDirectory && (
                    <button 
                      className="action-button"
                      onClick={handleOpenOutputDirectory}
                      title="打开文件夹"
                    >
                      <FolderOpenIcon className="action-icon" />
                    </button>
                  )}
                  <button 
                    className="action-button"
                    onClick={resetState}
                    title="重置"
                  >
                    <ArrowPathIcon className="action-icon" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
