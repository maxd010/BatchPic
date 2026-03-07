import { memo } from 'react';
import { ImageProgress } from '../context/AppContext';
import { ClockIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import './ProgressPanel.css';

interface ProgressPanelProps {
  imageProgress: ImageProgress[];
  isProcessing: boolean;
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
export const ProgressPanel = memo(function ProgressPanel({ imageProgress, isProcessing }: ProgressPanelProps) {
  // Don't render if no images (Requirement 4.1)
  if (imageProgress.length === 0) {
    return null;
  }

  // Calculate statistics (Requirement 4.5)
  const totalCount = imageProgress.length;
  const completedCount = imageProgress.filter(
    p => p.status === 'success' || p.status === 'failed'
  ).length;
  const successCount = imageProgress.filter(p => p.status === 'success').length;
  const failedCount = imageProgress.filter(p => p.status === 'failed').length;

  return (
    <div className="progress-panel">
      {/* Header with statistics (Requirement 4.5) */}
      <div className="progress-header">
        <h3>处理进度</h3>
        <span className="progress-summary">
          {completedCount} / {totalCount}
          {!isProcessing && ` (${successCount} 成功, ${failedCount} 失败)`}
        </span>
      </div>

      {/* Progress list (Requirements 4.1, 4.2) */}
      <div className="progress-list">
        {imageProgress.map((item, index) => (
          <ProgressItem key={index} item={item} />
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function (Requirement 10.2)
  // Only re-render if actual content changes, not just reference changes
  
  // Check if processing state changed
  if (prevProps.isProcessing !== nextProps.isProcessing) {
    return false; // Props changed, need to re-render
  }
  
  // Check if array length changed
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
      prevItem.outputPath !== nextItem.outputPath ||
      prevItem.originalSize !== nextItem.originalSize ||
      prevItem.processedSize !== nextItem.processedSize
    );
  });
  
  // Return true to skip re-render if no changes detected
  return !hasChanges;
});

/**
 * ProgressItem - Individual image progress item
 * 
 * Performance Optimization (Requirement 10.2):
 * - Memoized to prevent re-rendering when other items change
 * - Only re-renders when its own item data changes
 */
const ProgressItem = memo(function ProgressItem({ item }: { item: ImageProgress }) {
  return (
    <div className={`progress-item status-${item.status}`}>
      {/* Status icon (Requirement 4.2) */}
      <div className="progress-item-icon">
        {item.status === 'pending' && <ClockIcon />}
        {item.status === 'processing' && <SpinnerIcon />}
        {item.status === 'success' && <CheckCircleIcon />}
        {item.status === 'failed' && <XCircleIcon />}
      </div>

      {/* File info (Requirements 4.3, 4.4) */}
      <div className="progress-item-info">
        <div className="progress-item-name">{item.fileName}</div>
        
        {/* Error message for failed images (Requirement 4.4) */}
        {item.status === 'failed' && item.error && (
          <div className="progress-item-error">{item.error}</div>
        )}
        
        {/* File sizes and compression for successful images (Requirement 4.3) */}
        {item.status === 'success' && item.originalSize && item.processedSize && (
          <div className="progress-item-size">
            {formatSize(item.originalSize)} → {formatSize(item.processedSize)}
            {' '}({calculateCompression(item.originalSize, item.processedSize)})
          </div>
        )}
      </div>

      {/* Progress bar for processing state (Requirement 4.2) */}
      {item.status === 'processing' && (
        <div className="progress-item-bar">
          <div 
            className="progress-item-fill" 
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if item actually changed
  const prev = prevProps.item;
  const next = nextProps.item;
  
  return (
    prev.status === next.status &&
    prev.progress === next.progress &&
    prev.error === next.error &&
    prev.outputPath === next.outputPath &&
    prev.originalSize === next.originalSize &&
    prev.processedSize === next.processedSize &&
    prev.fileName === next.fileName
  );
});

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
  return ratio > 0 ? `-${ratio.toFixed(0)}%` : `+${Math.abs(ratio).toFixed(0)}%`;
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
