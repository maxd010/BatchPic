import { useState, useEffect } from 'react';
import { ProcessingParams, ResizeParams, CompressionParams, ImageFile, StoredCompressionSettings } from '../../main/types';
import { useDebounce } from '../hooks/useDebounce';
import { loadSettings, saveSettings } from '../../utils/storage';
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
  const [compressionMode, setCompressionMode] = useState<CompressionParams['mode']>(
    params.compression?.mode || 'smart'
  );
  const [qualityPreset, setQualityPreset] = useState<60 | 70 | 75 | 80 | 85 | 90>(
    (params.compression?.value as 60 | 70 | 75 | 80 | 85 | 90) || 80
  );
  const [targetSize, setTargetSize] = useState<number>(
    params.compression?.mode === 'targetSize' ? (params.compression?.value || 200) : 200
  );
  const [removeMetadata, setRemoveMetadata] = useState<boolean>(
    params.compression?.removeMetadata ?? true
  );
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png' | 'webp' | 'original'>(
    params.format || 'original'
  );

  // Load settings from localStorage on mount (Requirement 10.2)
  useEffect(() => {
    const stored = loadSettings();
    
    if (stored) {
      // Apply loaded settings to component state
      setCompressionMode(stored.mode);
      setRemoveMetadata(stored.removeMetadata);
      
      if (stored.qualityPreset !== undefined) {
        setQualityPreset(stored.qualityPreset);
      }
      
      if (stored.targetSize !== undefined) {
        setTargetSize(stored.targetSize);
      }
    }
    // If no stored settings, use defaults (smart mode) - already initialized above
  }, []);

  // Build current parameters object
  const currentParams: ProcessingParams = {
    resize: resizeMode === 'none' ? undefined : {
      mode: resizeMode as ResizeParams['mode'],
      value: resizeValue,
      aspectRatio: resizeMode === 'aspectRatio' ? aspectRatio : undefined,
    },
    compression: compressionMode === 'none' ? undefined : {
      mode: compressionMode,
      value: compressionMode === 'quality' ? qualityPreset : 
             compressionMode === 'targetSize' ? targetSize : undefined,
      removeMetadata: compressionMode === 'smart' ? true : removeMetadata,
    },
    format: outputFormat === 'original' ? undefined : outputFormat,
  };

  const debouncedParams = useDebounce(currentParams, 300);

  useEffect(() => {
    onChange(debouncedParams);
  }, [debouncedParams]);

  // Save settings to localStorage with 500ms delay (Requirement 10.1, 10.4)
  const debouncedCompressionMode = useDebounce(compressionMode, 500);
  const debouncedQualityPreset = useDebounce(qualityPreset, 500);
  const debouncedTargetSize = useDebounce(targetSize, 500);
  const debouncedRemoveMetadata = useDebounce(removeMetadata, 500);

  useEffect(() => {
    // Build settings object to save
    const settingsToSave: StoredCompressionSettings = {
      mode: debouncedCompressionMode,
      removeMetadata: debouncedRemoveMetadata,
      version: '1.0',
    };

    // Add optional fields based on mode
    if (debouncedCompressionMode === 'quality') {
      settingsToSave.qualityPreset = debouncedQualityPreset;
    } else if (debouncedCompressionMode === 'targetSize') {
      settingsToSave.targetSize = debouncedTargetSize;
    }

    saveSettings(settingsToSave);
  }, [debouncedCompressionMode, debouncedQualityPreset, debouncedTargetSize, debouncedRemoveMetadata]);

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
    } else if (compressionMode === 'smart') {
      parts.push('压缩: 智能压缩');
    } else if (compressionMode === 'quality') {
      parts.push(`压缩: 质量${qualityPreset}`);
    } else if (compressionMode === 'targetSize') {
      parts.push(`压缩: ${targetSize}KB`);
    }
    
    // Resize
    if (resizeMode === 'none') {
      parts.push('尺寸: Original');
    } else if (resizeMode === 'scale') {
      parts.push(`尺寸: Scale ${resizeValue}%`);
    } else {
      const modeText = resizeMode === 'width' ? 'Width' : 'Max edge';
      parts.push(`尺寸: ${modeText} ${resizeValue}px`);
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
              title="优化控制"
            >
              <AdjustmentsIcon className="tab-icon" aria-label="优化" />
              <span>优化</span>
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
                    {['none', 'scale', 'width', 'longEdge'].map((mode) => (
                      <button
                        key={mode}
                        className={`mode-button ${resizeMode === mode ? 'active' : ''}`}
                        onClick={() => setResizeMode(mode as any)}
                        title={
                          mode === 'none' ? '保持原始尺寸' :
                          mode === 'scale' ? '按百分比缩放' :
                          mode === 'width' ? '按宽度调整' :
                          '按长边调整'
                        }
                      >
                        {mode === 'none' && 'Original'}
                        {mode === 'scale' && 'Scale'}
                        {mode === 'width' && 'Width'}
                        {mode === 'longEdge' && 'Max edge'}
                      </button>
                    ))}
                  </div>
                </div>

                {resizeMode !== 'none' && (
                  <div className="param-group">
                    <label htmlFor="resize-value">
                      {resizeMode === 'scale' && '缩放比例 (%)'}
                      {resizeMode === 'width' && '宽度 (px)'}
                      {resizeMode === 'longEdge' && '长边 (px)'}
                    </label>
                    <input
                      id="resize-value"
                      type="number"
                      min={resizeMode === 'scale' ? 1 : 10}
                      max={resizeMode === 'scale' ? 200 : 5000}
                      value={resizeValue}
                      onChange={(e) => {
                        const min = resizeMode === 'scale' ? 1 : 10;
                        setResizeValue(Math.max(min, parseInt(e.target.value) || 0));
                      }}
                      className="param-input"
                    />
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
                    {(['smart', 'quality', 'targetSize', 'none'] as const).map((mode) => (
                      <button
                        key={mode}
                        className={`mode-button ${compressionMode === mode ? 'active' : ''}`}
                        onClick={() => setCompressionMode(mode)}
                        title={
                          mode === 'smart' ? '根据图片格式自动选择最优参数' :
                          mode === 'quality' ? '手动选择压缩质量' :
                          mode === 'targetSize' ? '压缩至目标文件大小' :
                          '保持原始质量'
                        }
                      >
                        {mode === 'smart' && '智能压缩 (默认)'}
                        {mode === 'quality' && '按质量'}
                        {mode === 'targetSize' && '按大小'}
                        {mode === 'none' && '不压缩'}
                      </button>
                    ))}
                  </div>
                </div>

                {compressionMode === 'quality' && (
                  <div className="param-group">
                    <label>质量预设</label>
                    <div className="button-group">
                      {([60, 70, 75, 80, 85, 90] as const).map((preset) => (
                        <button
                          key={preset}
                          className={`preset-button ${qualityPreset === preset ? 'active' : ''}`}
                          onClick={() => setQualityPreset(preset)}
                          title={
                            preset === 60 ? '高压缩，文件最小' :
                            preset === 70 ? '较高压缩' :
                            preset === 75 ? '平衡压缩' :
                            preset === 80 ? '推荐质量' :
                            preset === 85 ? '高质量' :
                            '极高质量'
                          }
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {compressionMode === 'targetSize' && (
                  <div className="param-group">
                    <label htmlFor="target-size">目标大小 (KB)</label>
                    <input
                      id="target-size"
                      type="number"
                      min="5"
                      max="10000"
                      value={targetSize}
                      onChange={(e) => setTargetSize(Math.max(5, Math.min(10000, parseInt(e.target.value) || 5)))}
                      className="param-input"
                    />
                  </div>
                )}

                {compressionMode !== 'smart' && (
                  <div className="param-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={removeMetadata}
                        onChange={(e) => setRemoveMetadata(e.target.checked)}
                        className="param-checkbox"
                      />
                      <span>移除元数据</span>
                    </label>
                  </div>
                )}

                {compressionMode === 'smart' && (
                  <div className="param-group">
                    <label className="checkbox-label disabled">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="param-checkbox"
                      />
                      <span>移除元数据 (智能模式自动移除)</span>
                    </label>
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
