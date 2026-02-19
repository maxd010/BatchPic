import { useState, useEffect } from 'react';
import { ImageFile, ProcessingParams, ResizeParams } from '../../main/types';
import './PreviewPanel.css';

interface PreviewPanelProps {
  originalImage?: ImageFile;
  params: ProcessingParams;
}

interface PreviewDimensions {
  width: number;
  height: number;
}

/**
 * PreviewPanel - Display preview of first image with processing effects
 * 
 * Requirements:
 * - 7.5: Show preview of first image
 * - 7.4: Update preview in real-time as parameters change
 * - 7.5: Display original and output dimensions
 * 
 * Features:
 * - Real-time preview updates
 * - Dimension calculations based on resize parameters
 * - Visual representation of aspect ratio changes
 */
export function PreviewPanel({ originalImage, params }: PreviewPanelProps) {
  const [previewDimensions, setPreviewDimensions] = useState<PreviewDimensions | null>(null);

  // Calculate output dimensions based on parameters
  useEffect(() => {
    if (!originalImage) {
      setPreviewDimensions(null);
      return;
    }

    const { width: origWidth, height: origHeight } = originalImage.dimensions;
    let newWidth = origWidth;
    let newHeight = origHeight;

    // Apply resize parameters
    if (params.resize) {
      const { mode, value, aspectRatio } = params.resize;

      switch (mode) {
        case 'width':
          newWidth = value;
          newHeight = Math.round((value / origWidth) * origHeight);
          break;

        case 'height':
          newHeight = value;
          newWidth = Math.round((value / origHeight) * origWidth);
          break;

        case 'longEdge': {
          const maxDim = Math.max(origWidth, origHeight);
          const scale = value / maxDim;
          newWidth = Math.round(origWidth * scale);
          newHeight = Math.round(origHeight * scale);
          break;
        }

        case 'shortEdge': {
          const minDim = Math.min(origWidth, origHeight);
          const scale = value / minDim;
          newWidth = Math.round(origWidth * scale);
          newHeight = Math.round(origHeight * scale);
          break;
        }

        case 'aspectRatio': {
          // Parse aspect ratio (e.g., "16:9" -> 16/9)
          const [ratioW, ratioH] = (aspectRatio || '1:1').split(':').map(Number);
          const targetRatio = ratioW / ratioH;
          const currentRatio = origWidth / origHeight;

          if (currentRatio > targetRatio) {
            // Image is wider than target ratio, crop width
            newHeight = origHeight;
            newWidth = Math.round(origHeight * targetRatio);
          } else {
            // Image is taller than target ratio, crop height
            newWidth = origWidth;
            newHeight = Math.round(origWidth / targetRatio);
          }
          break;
        }
      }
    }

    setPreviewDimensions({ width: newWidth, height: newHeight });
  }, [originalImage, params]);

  if (!originalImage) {
    return (
      <div className="preview-panel empty">
        <div className="preview-placeholder">
          <p>拖入图片以查看预览</p>
        </div>
      </div>
    );
  }

  const { width: origWidth, height: origHeight } = originalImage.dimensions;
  const previewWidth = previewDimensions?.width || origWidth;
  const previewHeight = previewDimensions?.height || origHeight;

  // Calculate display dimensions for the preview box (max 300px)
  const maxDisplaySize = 300;
  const scale = Math.min(
    maxDisplaySize / Math.max(previewWidth, previewHeight),
    1
  );
  const displayWidth = Math.round(previewWidth * scale);
  const displayHeight = Math.round(previewHeight * scale);

  // Calculate aspect ratio change
  const originalAspectRatio = (origWidth / origHeight).toFixed(2);
  const newAspectRatio = (previewWidth / previewHeight).toFixed(2);
  const aspectRatioChanged = originalAspectRatio !== newAspectRatio;

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h3>预览</h3>
        <p className="preview-subtitle">第一张图片的处理效果</p>
      </div>

      <div className="preview-content">
        {/* Preview visualization */}
        <div className="preview-visualization">
          <div className="preview-box">
            <div
              className="preview-image"
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                backgroundColor: '#e0e0e0',
                border: '2px solid #999',
                borderRadius: '4px',
              }}
            >
              <span className="preview-text">
                {originalImage.relativePath}
              </span>
            </div>
          </div>
        </div>

        {/* Dimensions info */}
        <div className="preview-info">
          <div className="info-section">
            <h4>原始尺寸</h4>
            <div className="dimension-row">
              <span className="label">宽度:</span>
              <span className="value">{origWidth} px</span>
            </div>
            <div className="dimension-row">
              <span className="label">高度:</span>
              <span className="value">{origHeight} px</span>
            </div>
            <div className="dimension-row">
              <span className="label">宽高比:</span>
              <span className="value">{originalAspectRatio}</span>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="arrow-indicator">→</div>

          <div className="info-section">
            <h4>输出尺寸</h4>
            <div className="dimension-row">
              <span className="label">宽度:</span>
              <span className={`value ${previewWidth !== origWidth ? 'changed' : ''}`}>
                {previewWidth} px
              </span>
            </div>
            <div className="dimension-row">
              <span className="label">高度:</span>
              <span className={`value ${previewHeight !== origHeight ? 'changed' : ''}`}>
                {previewHeight} px
              </span>
            </div>
            <div className="dimension-row">
              <span className="label">宽高比:</span>
              <span className={`value ${aspectRatioChanged ? 'changed' : ''}`}>
                {newAspectRatio}
              </span>
            </div>
          </div>
        </div>

        {/* Changes summary */}
        {(previewWidth !== origWidth || previewHeight !== origHeight) && (
          <div className="changes-summary">
            <div className="change-item">
              <span className="change-label">尺寸变化:</span>
              <span className="change-value">
                {origWidth}×{origHeight} → {previewWidth}×{previewHeight}
              </span>
            </div>
            {aspectRatioChanged && (
              <div className="change-item">
                <span className="change-label">宽高比变化:</span>
                <span className="change-value">
                  {originalAspectRatio} → {newAspectRatio}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
