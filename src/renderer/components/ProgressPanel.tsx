import { memo } from "react";
import { ImageProgress } from "../context/AppContext";
import { ImageFile } from "../../main/types";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassPlusIcon,
  FolderOpenIcon,
  TrashIcon,
} from "./Icons";
import "./ProgressPanel.css";

interface ProgressPanelProps {
  inputFiles: ImageFile[];
  imageProgress: ImageProgress[];
  isProcessing: boolean;
  onPreviewClick?: (file: ImageFile, outputPath?: string) => void;
  onClearAll?: () => void;
  onOpenFolder?: () => void;
}

/**
 * ProgressPanel - Display per-image processing progress
 *
 * Requirements:
 * - 4.1: Display all images with their current status
 * - 4.2: Reflect status changes immediately
 * - 4.3: Show file sizes and compression ratio for successful images
 * - 4.4: Show error messages for failed images
 * - 4.5: Display overall statistics
 * - 10.2: Optimized rendering with React.memo
 * - 10.4: Performance optimization for large lists
 *
 * Performance Optimizations (Requirement 10.2, 10.4):
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Custom comparison function checks actual content changes
 * - Individual ProgressItem components are also memoized
 * - For lists > 100 items, consider implementing virtual scrolling
 *   using libraries like react-window or react-virtualized
 */
export const ProgressPanel = memo(
  function ProgressPanel({
    inputFiles,
    imageProgress,
    isProcessing,
    onPreviewClick,
    onClearAll,
    onOpenFolder,
  }: ProgressPanelProps) {
    // Don't render if no files
    if (inputFiles.length === 0) {
      return null;
    }

    // Calculate statistics (Requirement 4.5)
    const totalCount = inputFiles.length;
    const completedCount = imageProgress.filter(
      (p) => p.status === "success" || p.status === "failed",
    ).length;
    const successCount = imageProgress.filter(
      (p) => p.status === "success",
    ).length;
    const failedCount = imageProgress.filter(
      (p) => p.status === "failed",
    ).length;
    const hasProgress = imageProgress.length > 0;

    // Build a lookup map: filePath -> progress
    const progressMap = new Map<string, ImageProgress>();
    imageProgress.forEach((p) => progressMap.set(p.filePath, p));

    return (
      <div className="progress-panel">
        {/* Header with statistics (Requirement 4.5) */}
        <div className="progress-header">
          <div className="header-left">
            <h3>{hasProgress ? "处理进度" : `已选择 ${totalCount} 张图片`}</h3>
            {hasProgress && (
              <span className="progress-summary">
                {completedCount} / {totalCount}
                {!isProcessing &&
                  successCount + failedCount > 0 &&
                  ` (${successCount} 成功${failedCount > 0 ? `, ${failedCount} 失败` : ""})`}
              </span>
            )}
          </div>
          <div className="header-actions">
            {onOpenFolder && !isProcessing && completedCount > 0 && (
              <button
                className="action-button action-icon-button action-open-folder"
                onClick={onOpenFolder}
                title="打开输出文件夹"
              >
                <FolderOpenIcon className="action-icon" />
              </button>
            )}
            {onClearAll && !isProcessing && (
              <button
                className="action-button action-icon-button action-clear"
                onClick={onClearAll}
                title="清空全部文件"
              >
                <TrashIcon className="action-icon" />
              </button>
            )}
          </div>
        </div>

        {/* Progress list (Requirements 4.1, 4.2) */}
        <div className="progress-list">
          {inputFiles.map((file) => (
            <ProgressItem
              key={file.path}
              file={file}
              progress={progressMap.get(file.path)}
              onPreviewClick={onPreviewClick}
            />
          ))}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function (Requirement 10.2)
    // Only re-render if actual content changes, not just reference changes

    // Check if processing state changed
    if (prevProps.isProcessing !== nextProps.isProcessing) {
      return false; // Props changed, need to re-render
    }

    // Check if array length changed
    if (prevProps.inputFiles.length !== nextProps.inputFiles.length) {
      return false; // Props changed, need to re-render
    }
    if (prevProps.imageProgress.length !== nextProps.imageProgress.length) {
      return false; // Props changed, need to re-render
    }

    // Check if any image progress actually changed
    // Compare status and progress for each item
    const hasChanges = prevProps.imageProgress.some((prevItem, index) => {
      const nextItem = nextProps.imageProgress[index];
      return (
        prevItem.status !== nextItem.status ||
        prevItem.progress !== nextItem.progress ||
        prevItem.error !== nextItem.error ||
        prevItem.processedSize !== nextItem.processedSize
      );
    });

    // Return true to skip re-render if no changes detected
    return !hasChanges;
  },
);

/**
 * ProgressItem - Individual image progress item
 *
 * Performance Optimization (Requirement 10.2):
 * - Memoized to prevent re-rendering when other items change
 * - Only re-renders when its own item data changes
 */
const ProgressItem = memo(
  function ProgressItem({
    file,
    progress,
    onPreviewClick,
  }: {
    file: ImageFile;
    progress?: ImageProgress;
    onPreviewClick?: (file: ImageFile, outputPath?: string) => void;
  }) {
    const status = progress?.status || "pending";
    const isClickable = !!(
      onPreviewClick &&
      (status === "success" || !progress)
    );

    const handleClick = () => {
      if (isClickable && onPreviewClick) {
        onPreviewClick(file, progress?.outputPath);
      }
    };

    return (
      <div
        className={`progress-item status-${status}${isClickable ? " clickable" : ""}`}
        onClick={handleClick}
        title={file.relativePath}
      >
        {/* Status icon (Requirement 4.2) */}
        <div className="progress-item-icon">
          {status === "pending" && <ClockIcon />}
          {status === "processing" && <SpinnerIcon />}
          {status === "success" && <CheckCircleIcon />}
          {status === "failed" && <XCircleIcon />}
        </div>

        {/* File info (Requirements 4.3, 4.4) */}
        <div className="progress-item-info">
          <div className="progress-item-name" title={file.relativePath}>
            {truncateFileName(file.relativePath, 40)}
          </div>

          {/* Error message for failed images (Requirement 4.4) */}
          {status === "failed" && progress?.error && (
            <div className="progress-item-error">{progress.error}</div>
          )}

          {/* File sizes (Requirement 4.3) */}
          <div className="progress-item-size">
            <span className="size-label">Original: </span>
            <span className="size-value size-original">
              {formatSize(file.size)}
            </span>
            {(status === "pending" || status === "processing") &&
              progress?.estimatedSize && (
                <>
                  <span className="size-separator"> • </span>
                  <span className="size-label">Estimated: </span>
                  <span className="size-value size-estimated">
                    {formatSize(progress.estimatedSize)}
                  </span>
                </>
              )}
            {status === "success" && progress?.processedSize && (
              <>
                <span className="size-separator"> → </span>
                <span className="size-value size-processed">
                  {formatSize(progress.processedSize)}
                </span>
                <span className="compression-ratio">
                  {calculateCompression(file.size, progress.processedSize)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Preview icon for clickable items */}
        {isClickable && (
          <div className="progress-item-action">
            <MagnifyingGlassPlusIcon className="preview-icon" />
          </div>
        )}

        {/* Progress bar for processing state (Requirement 4.2) */}
        {status === "processing" && (
          <div className="progress-item-bar">
            <div
              className="progress-item-fill"
              style={{ width: `${progress?.progress || 0}%` }}
            />
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    const prev = prevProps.progress;
    const next = nextProps.progress;
    if (!prev && !next) return true;
    if (!prev || !next) return false;
    return (
      prev.status === next.status &&
      prev.progress === next.progress &&
      prev.error === next.error &&
      prev.processedSize === next.processedSize &&
      prev.estimatedSize === next.estimatedSize
    );
  },
);

/**
 * Truncate file name to max length, preserving extension
 */
function truncateFileName(fileName: string, maxLength: number): string {
  if (fileName.length <= maxLength) return fileName;
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot > 0) {
    const name = fileName.substring(0, lastDot);
    const ext = fileName.substring(lastDot);
    const avail = maxLength - ext.length - 3;
    if (avail > 0) return name.substring(0, avail) + "..." + ext;
  }
  return fileName.substring(0, maxLength - 3) + "...";
}

/**
 * SpinnerIcon - Animated spinner for processing state
 */
function SpinnerIcon() {
  return (
    <svg
      className="spinner-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="15"
      />
    </svg>
  );
}

/**
 * Format file size in human-readable format
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Calculate compression ratio
 */
function calculateCompression(original: number, processed: number): string {
  const ratio = ((original - processed) / original) * 100;
  return ratio > 0
    ? `-${ratio.toFixed(0)}%`
    : `+${Math.abs(ratio).toFixed(0)}%`;
}

/**
 * Virtual Scrolling Considerations (Requirement 10.4):
 *
 * For large batches (>100 images), consider implementing virtual scrolling
 * to improve rendering performance. This would only render visible items
 * in the viewport, significantly reducing DOM nodes and improving FPS.
 *
 * Recommended libraries:
 * - react-window: Lightweight, simple API, good for fixed-height items
 * - react-virtualized: More features, better for complex layouts
 *
 * Implementation approach:
 * 1. Install: npm install react-window
 * 2. Replace progress-list div with FixedSizeList component
 * 3. Set itemSize to match progress-item height (e.g., 60px)
 * 4. Set height to viewport height (e.g., 400px)
 *
 * Example:
 * ```tsx
 * import { FixedSizeList } from 'react-window';
 *
 * <FixedSizeList
 *   height={400}
 *   itemCount={imageProgress.length}
 *   itemSize={60}
 *   width="100%"
 * >
 *   {({ index, style }) => (
 *     <div style={style}>
 *       <ProgressItem item={imageProgress[index]} />
 *     </div>
 *   )}
 * </FixedSizeList>
 * ```
 *
 * Performance impact:
 * - Without virtual scrolling: 1000 items = 1000 DOM nodes
 * - With virtual scrolling: 1000 items = ~10-20 DOM nodes (only visible)
 * - Expected FPS improvement: 30fps → 60fps for large lists
 */
