import React, { useState, useCallback } from 'react';
import { UploadIcon, CheckCircleIcon, PhotoIcon, ArrowDownTrayIcon, TrashIcon } from './Icons';
import './DropZone.css';

/**
 * DropZone - File and folder drag-drop component
 */

interface DropZoneProps {
  onFilesDropped: (paths: string[]) => void;
  onClearFiles?: () => void;
  isEmpty: boolean;
  fileCount?: number;
  compact?: boolean;
}

export function DropZone({ onFilesDropped, onClearFiles, isEmpty, fileCount = 0, compact = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Handle clear files
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the click-to-upload
    if (onClearFiles) {
      onClearFiles();
    }
  };

  // Handle click to open file browser
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    try {
      if (window.electronAPI?.openFileDialog) {
        const paths = await window.electronAPI.openFileDialog();
        if (paths.length > 0) {
          onFilesDropped(paths);
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  }, [onFilesDropped]);

  // Handle drag enter
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set isDragging to false if the mouse is leaving the drop zone container
    // Check if relatedTarget is outside the currentTarget
    const relatedTarget = e.relatedTarget as Node;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    console.log('[DropZone] handleDrop triggered');

    // Extract file paths from dropped items
    const paths: string[] = [];
    
    if (e.dataTransfer.files) {
      console.log('[DropZone] dataTransfer.files count:', e.dataTransfer.files.length);
      // Get file paths from dropped files
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        // In Electron, we can access the path property
        const path = (file as any).path;
        console.log('[DropZone] File', i, 'path:', path);
        if (path) {
          paths.push(path);
        }
      }
    }

    console.log('[DropZone] Extracted paths:', paths);

    if (paths.length > 0) {
      console.log('[DropZone] Calling onFilesDropped with', paths.length, 'paths');
      onFilesDropped(paths);
    } else {
      console.log('[DropZone] No paths extracted, not calling onFilesDropped');
    }
  }, [onFilesDropped]);

  return (
    <div
      className={`drop-zone ${isDragging ? 'dragging' : ''} ${isEmpty ? 'empty' : 'has-files'} ${compact ? 'compact' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        handleClick(e);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
    >
      {isEmpty ? (
        // Empty state (Requirement 7.3)
        <div className="drop-zone-empty">
          <div className="drop-zone-icon-wrapper">
            <PhotoIcon className="drop-zone-icon-svg" />
          </div>
          <h2 className="drop-zone-title">拖入图片，马上处理</h2>
          <p className="drop-zone-hint">或点击此处选择文件</p>
          <div className="drop-zone-meta">
            <span className="drop-zone-tag">JPG</span>
            <span className="drop-zone-tag">PNG</span>
            <span className="drop-zone-tag">WEBP</span>
          </div>
          <p className="drop-zone-subhint">可拖入单个文件或整个文件夹</p>
        </div>
      ) : (
        // Files loaded state
        <div className="drop-zone-loaded">
          <div className="loaded-left">
            <div className="drop-zone-icon-wrapper success">
              <CheckCircleIcon className="drop-zone-icon-svg" />
            </div>
            <div className="loaded-info">
              <h3 className="drop-zone-count">已选择 {fileCount} 张图片</h3>
              <p className="drop-zone-hint">点击或拖入更多文件以添加到批次</p>
            </div>
          </div>
          
          <button 
            className="drop-zone-clear-button"
            onClick={handleClear}
            title="清空所有图片"
          >
            <TrashIcon className="clear-icon-svg" />
            <span>清空全部</span>
          </button>
        </div>
      )}

      {/* Drag overlay for visual feedback */}
      {isDragging && (
        <div className="drop-zone-overlay">
          <div className="drop-zone-overlay-content">
            <ArrowDownTrayIcon className="drop-zone-overlay-icon" />
            <p className="drop-zone-overlay-text">释放以添加文件</p>
          </div>
        </div>
      )}
    </div>
  );
}
