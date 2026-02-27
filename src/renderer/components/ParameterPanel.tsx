import { useState, useEffect } from 'react';
import { ProcessingParams, ResizeParams, CompressionParams, ImageFile } from '../../main/types';
import { useDebounce } from '../hooks/useDebounce';
import { AdjustmentsIcon, ArrowsPointingInIcon, PhotoIcon } from './Icons';
import './ParameterPanel.css';

interface ParameterPanelProps {
  params: ProcessingParams;
  onChange: (params: ProcessingParams) => void;
  inputFiles: ImageFile[];
  estimatedSize?: number;
}

type TabType = 'resize' | 'compression' | 'format';

/**
 * ParameterPanel - Control panel for processing parameters with Tab switching
 */
export function ParameterPanel({
  params,
  onChange,
  inputFiles,
  estimatedSize,
}: ParameterPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('resize');

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

  // Build current parameters object
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

  const debouncedParams = useDebounce(currentParams, 300);

  useEffect(() => {
    onChange(debouncedParams);
  }, [debouncedParams]);

  const originalSize = inputFiles.length > 0 ? inputFiles[0].size : 0;

  return (
    <div className="parameter-panel-tabs">
      <div className="tabs-header">
        <button 
          className={`tab-item ${activeTab === 'resize' ? 'active' : ''}`}
          onClick={() => setActiveTab('resize')}
          title="尺寸调整"
        >
          <ArrowsPointingInIcon className="tab-icon" />
          <span>尺寸</span>
        </button>
        <button 
          className={`tab-item ${activeTab === 'compression' ? 'active' : ''}`}
          onClick={() => setActiveTab('compression')}
          title="压缩控制"
        >
          <AdjustmentsIcon className="tab-icon" />
          <span>压缩</span>
        </button>
        <button 
          className={`tab-item ${activeTab === 'format' ? 'active' : ''}`}
          onClick={() => setActiveTab('format')}
          title="输出格式"
        >
          <PhotoIcon className="tab-icon" />
          <span>格式</span>
        </button>
      </div>

      <div className="tabs-content">
        {/* Resize Tab */}
        {activeTab === 'resize' && (
          <div className="tab-pane active">
            <div className="param-row">
              <div className="param-col">
                <label htmlFor="resize-mode">调整模式</label>
                <div className="select-wrapper">
                  <select
                    id="resize-mode"
                    value={resizeMode}
                    onChange={(e) => setResizeMode(e.target.value as any)}
                    className="param-select"
                  >
                    <option value="none">保持原始</option>
                    <option value="width">按宽度</option>
                    <option value="height">按高度</option>
                    <option value="longEdge">按长边</option>
                    <option value="shortEdge">按短边</option>
                    <option value="aspectRatio">宽高比</option>
                  </select>
                </div>
              </div>

              {resizeMode !== 'none' && resizeMode !== 'aspectRatio' && (
                <div className="param-col">
                  <label htmlFor="resize-value">
                    {resizeMode === 'width' && '宽度'}
                    {resizeMode === 'height' && '高度'}
                    {resizeMode === 'longEdge' && '长边'}
                    {resizeMode === 'shortEdge' && '短边'}
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

              {resizeMode === 'aspectRatio' && (
                <div className="param-col">
                  <label htmlFor="aspect-ratio">比例</label>
                  <div className="select-wrapper">
                    <select
                      id="aspect-ratio"
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as any)}
                      className="param-select"
                    >
                      <option value="1:1">1:1</option>
                      <option value="4:5">4:5</option>
                      <option value="16:9">16:9</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compression Tab */}
        {activeTab === 'compression' && (
          <div className="tab-pane active">
            <div className="param-row">
              <div className="param-col">
                <label htmlFor="compression-mode">模式</label>
                <div className="select-wrapper">
                  <select
                    id="compression-mode"
                    value={compressionMode}
                    onChange={(e) => setCompressionMode(e.target.value as any)}
                    className="param-select"
                  >
                    <option value="quality">按质量</option>
                    <option value="targetSize">按大小</option>
                    <option value="none">不压缩</option>
                  </select>
                </div>
              </div>

              {compressionMode === 'targetSize' && (
                <div className="param-col">
                  <label htmlFor="target-size">目标(KB)</label>
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
            </div>

            {compressionMode === 'quality' && (
              <div className="param-group compact">
                <div className="label-with-value">
                  <label htmlFor="quality-slider">质量</label>
                  <span className="value-display">{compressionValue}%</span>
                </div>
                <div className="range-wrapper">
                  <input
                    id="quality-slider"
                    type="range"
                    min="1"
                    max="100"
                    value={compressionValue}
                    onChange={(e) => setCompressionValue(parseInt(e.target.value))}
                    className="param-slider"
                    style={{ backgroundSize: `${compressionValue}% 100%` }}
                  />
                </div>
              </div>
            )}

            {originalSize > 0 && (
              <div className="file-size-info compact">
                <div className="size-row">
                  <span>原始: <span className="size-value original">{(originalSize / 1024).toFixed(1)} KB</span></span>
                  {estimatedSize && (
                    <span>预估: <span className="size-value estimated">{(estimatedSize / 1024).toFixed(1)} KB</span></span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Format Tab */}
        {activeTab === 'format' && (
          <div className="tab-pane active">
            <div className="param-group">
              <label htmlFor="output-format">输出格式</label>
              <div className="select-wrapper">
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
          </div>
        )}
      </div>
    </div>
  );
}
