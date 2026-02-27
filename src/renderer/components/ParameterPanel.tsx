import { useState, useEffect } from 'react';
import { ProcessingParams, ResizeParams, CompressionParams, ImageFile } from '../../main/types';
import { useDebounce } from '../hooks/useDebounce';
import { AdjustmentsIcon, ArrowsPointingInIcon, PhotoIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';
import './ParameterPanel.css';

interface ParameterPanelProps {
  params: ProcessingParams;
  onChange: (params: ProcessingParams) => void;
  inputFiles: ImageFile[];
  estimatedSize?: number;
}

/**
 * ParameterPanel - Control panel for processing parameters
 */
export function ParameterPanel({
  params,
  onChange,
  inputFiles,
  estimatedSize,
}: ParameterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    resize: true,
    compression: true,
    format: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
      <div className={`param-section ${expandedSections.resize ? 'expanded' : 'collapsed'}`}>
        <div className="section-header" onClick={() => toggleSection('resize')}>
          <div className="header-left">
            <ArrowsPointingInIcon className="section-icon" />
            <h3>尺寸调整</h3>
          </div>
          {expandedSections.resize ? <ChevronUpIcon className="toggle-icon" /> : <ChevronDownIcon className="toggle-icon" />}
        </div>
        
        {expandedSections.resize && (
          <div className="section-content">
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

              {/* Resize value input */}
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

              {/* Aspect ratio selector */}
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
      </div>

      {/* Compression section */}
      <div className={`param-section ${expandedSections.compression ? 'expanded' : 'collapsed'}`}>
        <div className="section-header" onClick={() => toggleSection('compression')}>
          <div className="header-left">
            <AdjustmentsIcon className="section-icon" />
            <h3>压缩控制</h3>
          </div>
          {expandedSections.compression ? <ChevronUpIcon className="toggle-icon" /> : <ChevronDownIcon className="toggle-icon" />}
        </div>
        
        {expandedSections.compression && (
          <div className="section-content">
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

              {/* Target size input */}
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

            {/* Quality slider */}
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

            {/* File size estimation */}
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
      </div>

      {/* Format section */}
      <div className={`param-section ${expandedSections.format ? 'expanded' : 'collapsed'}`}>
        <div className="section-header" onClick={() => toggleSection('format')}>
          <div className="header-left">
            <PhotoIcon className="section-icon" />
            <h3>输出格式</h3>
          </div>
          {expandedSections.format ? <ChevronUpIcon className="toggle-icon" /> : <ChevronDownIcon className="toggle-icon" />}
        </div>
        
        {expandedSections.format && (
          <div className="section-content">
            <div className="param-group">
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
