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
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Generate summary text
  const getSummaryText = () => {
    const parts: string[] = [];
    
    // Format
    const formatText = outputFormat === 'original' ? '原始格式' : outputFormat.toUpperCase();
    parts.push(`格式: ${formatText}`);
    
    // Compression
    if (compressionMode === 'none') {
      parts.push('压缩: 不压缩');
    } else if (compressionMode === 'quality') {
      parts.push(`压缩: 质量${compressionValue}%`);
    } else if (compressionMode === 'targetSize') {
      parts.push(`压缩: ${compressionValue}KB`);
    }
    
    // Resize
    if (resizeMode === 'none') {
      parts.push('尺寸: 保持原始');
    } else if (resizeMode === 'aspectRatio') {
      parts.push(`尺寸: ${aspectRatio}`);
    } else {
      const modeText = resizeMode === 'width' ? '宽' : 
                       resizeMode === 'height' ? '高' : 
                       resizeMode === 'longEdge' ? '长边' : '短边';
      parts.push(`尺寸: ${modeText}${resizeValue}px`);
    }
    
    return parts.join(' · ');
  };

  return (
    <div className={`parameter-panel-tabs ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Collapsed Summary View */}
      {!isExpanded && (
        <div className="panel-summary" onClick={() => setIsExpanded(true)}>
          <div className="summary-content">
            <span className="summary-text">{getSummaryText()}</span>
          </div>
          <svg className="expand-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Expanded Full Panel */}
      {isExpanded && (
        <>
          <div className="panel-header">
            <span className="panel-title">参数设置</span>
            <button 
              className="collapse-button" 
              onClick={() => setIsExpanded(false)}
              title="收起面板"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 10L8 6L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

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
                <div className="param-group">
                  <label>调整模式</label>
                  <div className="button-group">
                    {['none', 'width', 'height', 'longEdge', 'shortEdge', 'aspectRatio'].map((mode) => (
                      <button
                        key={mode}
                        className={`mode-button ${resizeMode === mode ? 'active' : ''}`}
                        onClick={() => setResizeMode(mode as any)}
                        title={
                          mode === 'none' ? '保持原始尺寸' :
                          mode === 'width' ? '按宽度调整' :
                          mode === 'height' ? '按高度调整' :
                          mode === 'longEdge' ? '按长边调整' :
                          mode === 'shortEdge' ? '按短边调整' :
                          '按宽高比调整'
                        }
                      >
                        {mode === 'none' && '保持原始'}
                        {mode === 'width' && '按宽度'}
                        {mode === 'height' && '按高度'}
                        {mode === 'longEdge' && '按长边'}
                        {mode === 'shortEdge' && '按短边'}
                        {mode === 'aspectRatio' && '宽高比'}
                      </button>
                    ))}
                  </div>
                </div>

                {resizeMode !== 'none' && resizeMode !== 'aspectRatio' && (
                  <div className="param-group">
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
                  <div className="param-group">
                    <label>比例</label>
                    <div className="button-group">
                      {(['1:1', '4:5', '16:9'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          className={`aspect-button ${aspectRatio === ratio ? 'active' : ''}`}
                          onClick={() => setAspectRatio(ratio)}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compression Tab */}
            {activeTab === 'compression' && (
              <div className="tab-pane active">
                <div className="param-group">
                  <label>压缩模式</label>
                  <div className="button-group">
                    {(['quality', 'targetSize', 'none'] as const).map((mode) => (
                      <button
                        key={mode}
                        className={`mode-button ${compressionMode === mode ? 'active' : ''}`}
                        onClick={() => setCompressionMode(mode)}
                        title={
                          mode === 'quality' ? '按质量压缩' :
                          mode === 'targetSize' ? '压缩至目标大小' :
                          '不进行压缩'
                        }
                      >
                        {mode === 'quality' && '按质量'}
                        {mode === 'targetSize' && '按大小'}
                        {mode === 'none' && '不压缩'}
                      </button>
                    ))}
                  </div>
                </div>

                {compressionMode === 'targetSize' && (
                  <div className="param-group">
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
                  <label>输出格式</label>
                  <div className="button-group">
                    {(['original', 'jpg', 'png', 'webp'] as const).map((format) => (
                      <button
                        key={format}
                        className={`format-button ${outputFormat === format ? 'active' : ''}`}
                        onClick={() => setOutputFormat(format)}
                        title={
                          format === 'original' ? '保持原始格式' :
                          format === 'jpg' ? '转换为 JPG 格式' :
                          format === 'png' ? '转换为 PNG 格式' :
                          '转换为 WebP 格式'
                        }
                      >
                        {format === 'original' && '原始格式'}
                        {format === 'jpg' && 'JPG'}
                        {format === 'png' && 'PNG'}
                        {format === 'webp' && 'WebP'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
