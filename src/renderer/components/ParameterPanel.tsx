import { useState, useEffect } from 'react';
import { ProcessingParams, ResizeParams, CompressionParams, ImageFile } from '../../main/types';
import { useDebounce } from '../hooks/useDebounce';
import './ParameterPanel.css';

interface ParameterPanelProps {
  params: ProcessingParams;
  onChange: (params: ProcessingParams) => void;
  inputFiles: ImageFile[];
  estimatedSize?: number;
}

/**
 * ParameterPanel - Control panel for processing parameters
 * 
 * Requirements:
 * - 2.1, 2.5: Size adjustment options (width/height/longEdge/shortEdge/aspectRatio)
 * - 3.1, 3.2: Compression options (targetSize/quality)
 * - 4.3: Format options (jpg/png/webp)
 * - 7.3: Display all options on single page
 * - 8.4: Real-time feedback on parameter changes
 */
export function ParameterPanel({
  params,
  onChange,
  inputFiles,
  estimatedSize,
}: ParameterPanelProps) {
  const [resizeMode, setResizeMode] = useState<ResizeParams['mode'] | 'none'>(
    params.resize?.mode || 'none'
  );
  const [resizeValue, setResizeValue] = useState<number>(params.resize?.value || 0);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9'>(
    params.resize?.aspectRatio || '1:1'
  );
  const [compressionMode, setCompressionMode] = useState<CompressionParams['mode'] | 'none'>(
    params.compression?.mode || 'quality'
  );
  const [compressionValue, setCompressionValue] = useState<number>(
    params.compression?.value || 70
  );
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png' | 'webp' | 'original'>(
    params.format || 'original'
  );

  // Build current parameters object (before debouncing)
  const currentParams: ProcessingParams = {
    resize: resizeMode === 'none' ? undefined : {
      mode: resizeMode as ResizeParams['mode'],
      value: resizeValue,
      aspectRatio: resizeMode === 'aspectRatio' ? aspectRatio : undefined,
    },
    compression: compressionMode === 'none' ? undefined : {
      mode: compressionMode as CompressionParams['mode'],
      value: compressionValue,
    },
    format: outputFormat === 'original' ? undefined : outputFormat,
  };

  // Debounce parameter changes to avoid excessive updates (Requirement 8.4)
  // This ensures preview and file size estimation don't update on every keystroke
  const debouncedParams = useDebounce(currentParams, 300);

  // Update parent component when debounced parameters change
  useEffect(() => {
    onChange(debouncedParams);
  }, [debouncedParams]);

  // Get original file size for estimation
  const originalSize = inputFiles.length > 0 ? inputFiles[0].size : 0;

  return (
    <div className="parameter-panel">
      {/* Resize section */}
      <div className="param-section">
        <h3>尺寸调整</h3>
        
        <div className="param-group">
          <label htmlFor="resize-mode">调整模式</label>
          <select
            id="resize-mode"
            value={resizeMode}
            onChange={(e) => setResizeMode(e.target.value as any)}
            className="param-select"
          >
            <option value="none">保持原始尺寸</option>
            <option value="width">按宽度调整</option>
            <option value="height">按高度调整</option>
            <option value="longEdge">按长边调整</option>
            <option value="shortEdge">按短边调整</option>
            <option value="aspectRatio">固定宽高比</option>
          </select>
        </div>

        {/* Resize value input */}
        {resizeMode !== 'none' && resizeMode !== 'aspectRatio' && (
          <div className="param-group">
            <label htmlFor="resize-value">
              {resizeMode === 'width' && '目标宽度 (px)'}
              {resizeMode === 'height' && '目标高度 (px)'}
              {resizeMode === 'longEdge' && '长边尺寸 (px)'}
              {resizeMode === 'shortEdge' && '短边尺寸 (px)'}
            </label>
            <input
              id="resize-value"
              type="number"
              min="10"
              max="5000"
              value={resizeValue}
              onChange={(e) => setResizeValue(Math.max(10, parseInt(e.target.value) || 0))}
              className="param-input"
            />
          </div>
        )}

        {/* Aspect ratio selector */}
        {resizeMode === 'aspectRatio' && (
          <div className="param-group">
            <label htmlFor="aspect-ratio">宽高比</label>
            <select
              id="aspect-ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as any)}
              className="param-select"
            >
              <option value="1:1">1:1 (正方形)</option>
              <option value="4:5">4:5 (竖版)</option>
              <option value="16:9">16:9 (横版)</option>
            </select>
          </div>
        )}
      </div>

      {/* Compression section */}
      <div className="param-section">
        <h3>压缩</h3>
        
        <div className="param-group">
          <label htmlFor="compression-mode">压缩模式</label>
          <select
            id="compression-mode"
            value={compressionMode}
            onChange={(e) => setCompressionMode(e.target.value as any)}
            className="param-select"
          >
            <option value="quality">按质量压缩</option>
            <option value="targetSize">按目标大小压缩</option>
            <option value="none">不压缩</option>
          </select>
        </div>

        {/* Quality slider */}
        {compressionMode === 'quality' && (
          <div className="param-group">
            <div className="label-with-value">
              <label htmlFor="quality-slider">质量</label>
              <span className="value-display">{compressionValue}%</span>
            </div>
            <input
              id="quality-slider"
              type="range"
              min="1"
              max="100"
              value={compressionValue}
              onChange={(e) => setCompressionValue(parseInt(e.target.value))}
              className="param-slider"
            />
            <div className="slider-labels">
              <span>低</span>
              <span>高</span>
            </div>
          </div>
        )}

        {/* Target size input */}
        {compressionMode === 'targetSize' && (
          <div className="param-group">
            <label htmlFor="target-size">目标大小 (KB)</label>
            <input
              id="target-size"
              type="number"
              min="5"
              max="10000"
              value={compressionValue}
              onChange={(e) => setCompressionValue(Math.max(5, parseInt(e.target.value) || 0))}
              className="param-input"
            />
          </div>
        )}

        {/* File size estimation */}
        {originalSize > 0 && (
          <div className="file-size-info">
            <div className="size-row">
              <span>原始大小:</span>
              <span className="size-value">{(originalSize / 1024).toFixed(1)} KB</span>
            </div>
            {estimatedSize && (
              <div className="size-row">
                <span>预估大小:</span>
                <span className="size-value">{(estimatedSize / 1024).toFixed(1)} KB</span>
              </div>
            )}
            {estimatedSize && (
              <div className="size-row">
                <span>压缩率:</span>
                <span className="size-value">
                  {((1 - estimatedSize / originalSize) * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Format section */}
      <div className="param-section">
        <h3>输出格式</h3>
        
        <div className="param-group">
          <label htmlFor="output-format">格式</label>
          <select
            id="output-format"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as any)}
            className="param-select"
          >
            <option value="original">保持原始格式</option>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </div>
      </div>

      {/* Info box */}
      <div className="info-box">
        <p>💡 参数更改会实时更新预览和文件大小估算</p>
      </div>
    </div>
  );
}
