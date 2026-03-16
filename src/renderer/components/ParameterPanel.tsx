import React, { useState, useEffect } from "react";
import {
  ProcessingParams,
  ResizeParams,
  CompressionParams,
  ImageFile,
  StoredProcessingSettings,
} from "../../main/types";
import { useDebounce } from "../hooks/useDebounce";
import {
  loadProcessingSettings,
  saveProcessingSettings,
} from "../../utils/storage";
import { AdjustmentsIcon, ArrowsPointingInIcon, PhotoIcon } from "./Icons";
import "./ParameterPanel.css";

interface ParameterPanelProps {
  params: ProcessingParams;
  onChange: (params: ProcessingParams) => void;
  inputFiles: ImageFile[];
  estimatedSize?: number;
}

type TabType = "resize" | "compression" | "format" | null;

/**
 * ParameterPanel - Control panel for processing parameters with Tab switching
 */
export function ParameterPanel({
  params,
  onChange,
  inputFiles,
  estimatedSize,
}: ParameterPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>(null);

  const [resizeMode, setResizeMode] = useState<ResizeParams["mode"] | "none">(
    params.resize?.mode || "none",
  );
  const [resizeValue, setResizeValue] = useState<number>(
    params.resize?.value || 0,
  );
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "16:9">(
    params.resize?.aspectRatio || "1:1",
  );
  const [compressionMode, setCompressionMode] = useState<
    CompressionParams["mode"]
  >(params.compression?.mode || "smart");
  const [qualityPreset, setQualityPreset] = useState<number>(
    (params.compression?.value as number) || 80,
  );
  const [targetSize, setTargetSize] = useState<number>(
    params.compression?.mode === "targetSize"
      ? params.compression?.value || 200
      : 200,
  );
  const [removeMetadata, setRemoveMetadata] = useState<boolean>(
    params.compression?.removeMetadata ?? true,
  );
  const [outputFormat, setOutputFormat] = useState<
    "jpg" | "png" | "webp" | "original"
  >(params.format || "original");

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = loadProcessingSettings();

    if (stored) {
      // 应用所有保存的设置
      setResizeMode(stored.resizeMode);
      if (stored.resizeValue !== undefined) {
        setResizeValue(stored.resizeValue);
      }
      if (stored.aspectRatio !== undefined) {
        setAspectRatio(stored.aspectRatio);
      }

      setCompressionMode(stored.compressionMode);
      setRemoveMetadata(stored.removeMetadata);
      if (stored.qualityPreset !== undefined) {
        setQualityPreset(stored.qualityPreset);
      }
      if (stored.targetSize !== undefined) {
        setTargetSize(stored.targetSize);
      }

      setOutputFormat(stored.outputFormat);
    }
  }, []);

  // Build current parameters object
  const currentParams: ProcessingParams = {
    resize:
      resizeMode === "none"
        ? undefined
        : {
            mode: resizeMode as ResizeParams["mode"],
            value: resizeValue,
            aspectRatio: resizeMode === "aspectRatio" ? aspectRatio : undefined,
          },
    compression:
      compressionMode === "none"
        ? undefined
        : {
            mode: compressionMode,
            value:
              compressionMode === "quality"
                ? qualityPreset
                : compressionMode === "targetSize"
                  ? targetSize
                  : undefined,
            removeMetadata: compressionMode === "smart" ? true : removeMetadata,
          },
    format: outputFormat === "original" ? undefined : outputFormat,
  };

  const debouncedParams = useDebounce(currentParams, 300);

  useEffect(() => {
    onChange(debouncedParams);
  }, [debouncedParams]);

  // Save all settings to localStorage with 500ms delay
  const debouncedResizeMode = useDebounce(resizeMode, 500);
  const debouncedResizeValue = useDebounce(resizeValue, 500);
  const debouncedAspectRatio = useDebounce(aspectRatio, 500);
  const debouncedCompressionMode = useDebounce(compressionMode, 500);
  const debouncedQualityPreset = useDebounce(qualityPreset, 500);
  const debouncedTargetSize = useDebounce(targetSize, 500);
  const debouncedRemoveMetadata = useDebounce(removeMetadata, 500);
  const debouncedOutputFormat = useDebounce(outputFormat, 500);

  useEffect(() => {
    const settingsToSave: StoredProcessingSettings = {
      resizeMode: debouncedResizeMode,
      resizeValue:
        debouncedResizeMode !== "none" ? debouncedResizeValue : undefined,
      aspectRatio:
        debouncedResizeMode === "aspectRatio"
          ? debouncedAspectRatio
          : undefined,
      compressionMode: debouncedCompressionMode,
      qualityPreset:
        debouncedCompressionMode === "quality"
          ? debouncedQualityPreset
          : undefined,
      targetSize:
        debouncedCompressionMode === "targetSize"
          ? debouncedTargetSize
          : undefined,
      removeMetadata: debouncedRemoveMetadata,
      outputFormat: debouncedOutputFormat,
      version: "1.0",
    };

    saveProcessingSettings(settingsToSave);
  }, [
    debouncedResizeMode,
    debouncedResizeValue,
    debouncedAspectRatio,
    debouncedCompressionMode,
    debouncedQualityPreset,
    debouncedTargetSize,
    debouncedRemoveMetadata,
    debouncedOutputFormat,
  ]);

  const originalSize = inputFiles.length > 0 ? inputFiles[0].size : 0;

  const getFormatValue = () =>
    outputFormat === "original" ? "原始格式" : outputFormat.toUpperCase();

  const getCompressionValue = () => {
    if (compressionMode === "none") return "不压缩";
    if (compressionMode === "smart") return "智能";
    if (compressionMode === "quality") return `质量 ${qualityPreset}`;
    if (compressionMode === "targetSize") return `${targetSize} KB`;
    return "";
  };

  const getResizeValue = () => {
    if (resizeMode === "none") return "原始";
    if (resizeMode === "scale") return `缩放 ${resizeValue}%`;
    if (resizeMode === "width") return `宽 ${resizeValue}px`;
    if (resizeMode === "longEdge") return `最大 ${resizeValue}px`;
    return "";
  };

  const handleTabToggle = (tab: TabType) => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  // 点击外部关闭下拉
  const panelRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="parameter-panel-tabs" ref={panelRef}>
      <div className="tabs-bar">

        {/* 格式 Tab */}
        <div className={`tab-item ${activeTab === "format" ? "active" : ""}`}>
          <button className="tab-trigger" onClick={() => handleTabToggle("format")} title="展开格式设置">
            <PhotoIcon className="tab-icon" />
            <span className="tab-label">格式</span>
            <span className="tab-value">{getFormatValue()}</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
              style={{ transform: activeTab === "format" ? "rotate(180deg)" : "none", transition: "transform 200ms ease", flexShrink: 0 }}>
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {activeTab === "format" && (
            <div className="tab-dropdown">
              {(["original", "jpg", "png", "webp"] as const).map((format) => (
                <button
                  key={format}
                  className={`dropdown-item ${outputFormat === format ? "active" : ""}`}
                  onClick={() => { setOutputFormat(format); setActiveTab(null); }}
                >
                  {format === "original" && "保持原格式"}
                  {format === "jpg" && "转为 JPG"}
                  {format === "png" && "转为 PNG"}
                  {format === "webp" && "转为 WebP"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 优化 Tab */}
        <div className={`tab-item ${activeTab === "compression" ? "active" : ""}`}>
          <button className="tab-trigger" onClick={() => handleTabToggle("compression")} title="展开优化设置">
            <AdjustmentsIcon className="tab-icon" />
            <span className="tab-label">优化</span>
            <span className="tab-value">{getCompressionValue()}</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
              style={{ transform: activeTab === "compression" ? "rotate(180deg)" : "none", transition: "transform 200ms ease", flexShrink: 0 }}>
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {activeTab === "compression" && (
            <div className="tab-dropdown">
              {(["smart", "quality", "targetSize", "none"] as const).map((mode) => (
                <button
                  key={mode}
                  className={`dropdown-item ${compressionMode === mode ? "active" : ""}`}
                  onClick={() => setCompressionMode(mode)}
                  title={
                    mode === "smart" ? "推荐模式：自动平衡清晰度与文件大小"
                    : mode === "quality" ? "通过数值控制图片质量"
                    : mode === "targetSize" ? "尝试将图片压缩到指定大小以内"
                    : "不进行任何压缩，仅转换格式或调整尺寸"
                  }
                >
                  {mode === "smart" && "智能压缩"}
                  {mode === "quality" && "设定质量"}
                  {mode === "targetSize" && "目标大小"}
                  {mode === "none" && "无损模式"}
                </button>
              ))}

              {compressionMode === "quality" && (
                <div className="dropdown-extra">
                  <div className="label-with-value">
                    <label>质量级别</label>
                    <span className="value-display">{qualityPreset}</span>
                  </div>
                  <div className="range-wrapper">
                    <input
                      type="range" min="10" max="100" step="1"
                      value={qualityPreset}
                      onChange={(e) => setQualityPreset(parseInt(e.target.value))}
                      className="param-slider"
                      style={{ "--value": `${qualityPreset}%`, backgroundSize: `${qualityPreset}% 100%` } as React.CSSProperties}
                    />
                  </div>
                  <div className="button-group">
                    {([60, 75, 80, 85, 90, 95] as const).map((preset) => (
                      <button
                        key={preset}
                        className={`preset-button ${qualityPreset === preset ? "active" : ""}`}
                        onClick={() => setQualityPreset(preset)}
                      >
                        {preset === 80 ? "推荐" : preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {compressionMode === "targetSize" && (
                <div className="dropdown-extra">
                  <div className="label-with-value">
                    <label htmlFor="target-size">目标文件大小</label>
                    <span className="value-display">{targetSize} KB</span>
                  </div>
                  <input
                    id="target-size" type="number" min="10" max="20480"
                    aria-label="目标大小 (KB)"
                    value={targetSize}
                    onChange={(e) => setTargetSize(Math.max(10, Math.min(20480, parseInt(e.target.value) || 10)))}
                    className="param-input"
                    placeholder="输入目标 KB 值"
                  />
                </div>
              )}

              <div className="dropdown-extra">
                {compressionMode !== "smart" ? (
                  <label className="checkbox-label" title="移除相机型号、拍摄时间、GPS 等 EXIF 信息，可进一步缩小体积并保护隐私">
                    <input type="checkbox" checked={removeMetadata} onChange={(e) => setRemoveMetadata(e.target.checked)} className="param-checkbox" />
                    <span>清除隐私元数据 (EXIF)</span>
                  </label>
                ) : (
                  <label className="checkbox-label disabled" title="智能模式已自动包含此项优化">
                    <input type="checkbox" checked={true} disabled className="param-checkbox" />
                    <span>清除元数据 (智能模式已开启)</span>
                  </label>
                )}
              </div>

              {originalSize > 0 && (
                <div className="dropdown-extra file-size-info compact">
                  <div className="size-row">
                    <span>原始大小: <span className="size-value original">{(originalSize / 1024).toFixed(1)} KB</span></span>
                    {estimatedSize && (
                      <span>预计压缩后: <span className="size-value estimated">{(estimatedSize / 1024).toFixed(1)} KB</span></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 尺寸 Tab */}
        <div className={`tab-item ${activeTab === "resize" ? "active" : ""}`}>
          <button className="tab-trigger" onClick={() => handleTabToggle("resize")} title="展开尺寸设置">
            <ArrowsPointingInIcon className="tab-icon" />
            <span className="tab-label">尺寸</span>
            <span className="tab-value">{getResizeValue()}</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
              style={{ transform: activeTab === "resize" ? "rotate(180deg)" : "none", transition: "transform 200ms ease", flexShrink: 0 }}>
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {activeTab === "resize" && (
            <div className="tab-dropdown">
              {["none", "scale", "width", "longEdge"].map((mode) => (
                <button
                  key={mode}
                  className={`dropdown-item ${resizeMode === mode ? "active" : ""}`}
                  onClick={() => setResizeMode(mode as any)}
                  title={
                    mode === "none" ? "不改变图片尺寸"
                    : mode === "scale" ? "按百分比等比例缩放"
                    : mode === "width" ? "固定宽度，高度自动适应"
                    : "限制图片最长边，另一边自动适应"
                  }
                >
                  {mode === "none" && "原始尺寸"}
                  {mode === "scale" && "比例缩放"}
                  {mode === "width" && "固定宽度"}
                  {mode === "longEdge" && "限制长边"}
                </button>
              ))}
              {resizeMode !== "none" && (
                <div className="dropdown-extra">
                  <input
                    id="resize-value" type="number"
                    min={resizeMode === "scale" ? 1 : 10}
                    max={resizeMode === "scale" ? 200 : 5000}
                    aria-label={resizeMode === "scale" ? "缩放比例" : resizeMode === "width" ? "像素宽度" : "最大像素"}
                    value={resizeValue}
                    onChange={(e) => {
                      const min = resizeMode === "scale" ? 1 : 10;
                      setResizeValue(Math.max(min, parseInt(e.target.value) || 0));
                    }}
                    className="param-input"
                  />
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
