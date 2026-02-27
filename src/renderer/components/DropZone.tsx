import React, { useState, useCallback } from 'react';
import { UploadIcon, CheckCircleIcon, PhotoIcon, ArrowDownTrayIcon } from './Icons';
import './DropZone.css';

/**
 * DropZone - File and folder drag-drop component
 * 
 * Requirements:
 * - 1.1: Accept single image files dragged into the application
 * - 1.2: Accept folders dragged into the application
 * - 7.3: Display empty state ("拖入图片，马上处理")
 * 
 * Features:
 * - Visual feedback during drag operations
 * - Empty state display when no files are loaded
 * - File count display when files are loaded
 */

interface DropZoneProps {
  onFilesDropped: (paths: string[]) => void;
  isEmpty: boolean;
  fileCount?: number;
}

export function DropZone({ onFilesDropped, isEmpty, fileCount = 0 }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

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
    
    // Only set isDragging to false if we're leaving the drop zone itself
    // (not just moving between child elements)
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Extract file paths from dropped items
    const paths: string[] = [];
    
    if (e.dataTransfer.files) {
      // Get file paths from dropped files
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        // In Electron, we can access the path property
        const path = (file as any).path;
        if (path) {
          paths.push(path);
        }
      }
    }

    if (paths.length > 0) {
      onFilesDropped(paths);
    }
  }, [onFilesDropped]);

  return (
    <div
      className={`drop-zone ${isDragging ? 'dragging' : ''} ${isEmpty ? 'empty' : 'has-files'}`}
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
          <div className="drop-zone-icon-wrapper success">
            <CheckCircleIcon className="drop-zone-icon-svg" />
          </div>
          <h3 className="drop-zone-count">已选择 {fileCount} 张图片</h3>
          <p className="drop-zone-hint">点击或拖入更多文件以添加到批次</p>
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
