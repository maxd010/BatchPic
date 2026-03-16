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

type TabType = "resize" | "compression" | "format";

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
  const [activeTab, setActiveTab] = useState<TabType>("resize");

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

  // Generate summary badges
  const getSummaryBadges = () => {
    const badges: { label: string; value: string }[] = [];
    // Format
    const formatText =
      outputFormat === "original" ? "原始格式" : outputFormat.toUpperCase();
    badges.push({ label: "格式", value: formatText });

    // Compression
    if (compressionMode === "none") {
      badges.push({ label: "压缩", value: "不压缩" });
    } else if (compressionMode === "smart") {
      badges.push({ label: "压缩", value: "智能" });
    } else if (compressionMode === "quality") {
      badges.push({ label: "压缩", value: `质量 ${qualityPreset}` });
    } else if (compressionMode === "targetSize") {
      badges.push({ label: "压缩", value: `${targetSize} KB` });
    }

    // Resize
    if (resizeMode === "none") {
      badges.push({ label: "尺寸", value: "原始" });
    } else if (resizeMode === "scale") {
      badges.push({ label: "尺寸", value: `缩放 ${resizeValue}%` });
    } else if (resizeMode === "width") {
      badges.push({ label: "尺寸", value: `宽 ${resizeValue}px` });
    } else if (resizeMode === "longEdge") {
      badges.push({ label: "尺寸", value: `最大 ${resizeValue}px` });
    }

    return badges;
  };

  return (
    <div
      className={`parameter-panel-tabs ${isExpanded ? "expanded" : "collapsed"}`}
    >
      <div
        className="panel-summary"
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <div className="summary-content">
          {isExpanded ? (
            <span className="panel-title">参数设置</span>
          ) : (
            <div className="summary-badges">
              {getSummaryBadges().map((badge, i) => (
                <span key={i} className="summary-badge">
                  <span className="badge-label">{badge.label}</span>
                  <span className="badge-value">{badge.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {isExpanded ? (
          <button
            className="toggle-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            title="收起面板"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 10L8 6L4 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <button
            className="toggle-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            title="展开面板"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="panel-expanded-content">
          <div className="tabs-header">
            <button
              className={`tab-item ${activeTab === "resize" ? "active" : ""}`}
              onClick={() => setActiveTab("resize")}
              title="尺寸调整"
            >
              <ArrowsPointingInIcon className="tab-icon" />
              <span>尺寸</span>
            </button>
            <button
              className={`tab-item ${activeTab === "compression" ? "active" : ""}`}
              onClick={() => setActiveTab("compression")}
              title="优化控制"
            >
              <AdjustmentsIcon className="tab-icon" aria-label="优化" />
              <span>优化</span>
            </button>
            <button
              className={`tab-item ${activeTab === "format" ? "active" : ""}`}
              onClick={() => setActiveTab("format")}
              title="输出格式"
            >
              <PhotoIcon className="tab-icon" />
              <span>格式</span>
            </button>
          </div>

          <div className="tabs-content">
            {/* Resize Tab */}
            {activeTab === "resize" && (
              <div className="tab-pane active">
                <div className="param-group">
                  <div className="button-group">
                    {["none", "scale", "width", "longEdge"].map((mode) => (
                      <button
                        key={mode}
                        className={`mode-button ${resizeMode === mode ? "active" : ""}`}
                        onClick={() => setResizeMode(mode as any)}
                        title={
                          mode === "none"
                            ? "不改变图片尺寸"
                            : mode === "scale"
                              ? "按百分比等比例缩放"
                              : mode === "width"
                                ? "固定宽度，高度自动适应"
                                : "限制图片最长边，另一边自动适应"
                        }
                      >
                        {mode === "none" && "原始尺寸"}
                        {mode === "scale" && "比例缩放"}
                        {mode === "width" && "固定宽度"}
                        {mode === "longEdge" && "限制长边"}
                      </button>
                    ))}
                  </div>
                </div>

                {resizeMode !== "none" && (
                  <div className="param-group">
                    <input
                      id="resize-value"
                      type="number"
                      min={resizeMode === "scale" ? 1 : 10}
                      max={resizeMode === "scale" ? 200 : 5000}
                      aria-label={
                        resizeMode === "scale"
                          ? "缩放比例"
                          : resizeMode === "width"
                            ? "像素宽度"
                            : "最大像素"
                      }
                      value={resizeValue}
                      onChange={(e) => {
                        const min = resizeMode === "scale" ? 1 : 10;
                        setResizeValue(
                          Math.max(min, parseInt(e.target.value) || 0),
                        );
                      }}
                      className="param-input"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Compression Tab */}
            {activeTab === "compression" && (
              <div className="tab-pane active">
                <div className="param-group">
                  <div className="button-group">
                    {(["smart", "quality", "targetSize", "none"] as const).map(
                      (mode) => (
                        <button
                          key={mode}
                          className={`mode-button ${compressionMode === mode ? "active" : ""}`}
                          onClick={() => setCompressionMode(mode)}
                          title={
                            mode === "smart"
                              ? "推荐模式：自动平衡清晰度与文件大小"
                              : mode === "quality"
                                ? "通过数值控制图片质量"
                                : mode === "targetSize"
                                  ? "尝试将图片压缩到指定大小以内"
                                  : "不进行任何压缩，仅转换格式或调整尺寸"
                          }
                        >
                          {mode === "smart" && "智能压缩"}
                          {mode === "quality" && "设定质量"}
                          {mode === "targetSize" && "目标大小"}
                          {mode === "none" && "无损模式"}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {compressionMode === "quality" && (
                  <div className="param-group">
                    <div className="label-with-value">
                      <label>质量级别</label>
                      <span className="value-display">{qualityPreset}</span>
                    </div>
                    <div className="range-wrapper">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="1"
                        value={qualityPreset}
                        onChange={(e) =>
                          setQualityPreset(parseInt(e.target.value))
                        }
                        className="param-slider"
                        style={
                          {
                            "--value": `${qualityPreset}%`,
                            backgroundSize: `${qualityPreset}% 100%`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <div className="button-group">
                      {([60, 75, 80, 85, 90, 95] as const).map((preset) => (
                        <button
                          key={preset}
                          className={`preset-button ${qualityPreset === preset ? "active" : ""}`}
                          onClick={() => setQualityPreset(preset)}
                          title={
                            preset === 60
                              ? "高压缩：文件极小，画质有损"
                              : preset === 75
                                ? "平衡：适合网页显示"
                                : preset === 80
                                  ? "良好：推荐的压缩比例"
                                  : preset === 85
                                    ? "优秀：兼顾体积与画质"
                                    : preset === 90
                                      ? "极佳：高保真"
                                      : "原画级：几乎无损"
                          }
                        >
                          {preset === 80 ? "推荐" : preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {compressionMode === "targetSize" && (
                  <div className="param-group">
                    <div className="label-with-value">
                      <label htmlFor="target-size">目标文件大小</label>
                      <span className="value-display">{targetSize} KB</span>
                    </div>
                    <input
                      id="target-size"
                      type="number"
                      min="10"
                      max="20480"
                      aria-label="目标大小 (KB)"
                      value={targetSize}
                      onChange={(e) =>
                        setTargetSize(
                          Math.max(
                            10,
                            Math.min(20480, parseInt(e.target.value) || 10),
                          ),
                        )
                      }
                      className="param-input"
                      placeholder="输入目标 KB 值"
                    />
                  </div>
                )}

                {compressionMode !== "smart" && (
                  <div className="param-group">
                    <label
                      className="checkbox-label"
                      title="移除相机型号、拍摄时间、GPS 等 EXIF 信息，可进一步缩小体积并保护隐私"
                    >
                      <input
                        type="checkbox"
                        checked={removeMetadata}
                        onChange={(e) => setRemoveMetadata(e.target.checked)}
                        className="param-checkbox"
                      />
                      <span>清除隐私元数据 (EXIF)</span>
                    </label>
                  </div>
                )}

                {compressionMode === "smart" && (
                  <div className="param-group">
                    <label
                      className="checkbox-label disabled"
                      title="智能模式已自动包含此项优化"
                    >
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="param-checkbox"
                      />
                      <span>清除元数据 (智能模式已开启)</span>
                    </label>
                  </div>
                )}

                {originalSize > 0 && (
                  <div className="file-size-info compact">
                    <div className="size-row">
                      <span>
                        原始大小:{" "}
                        <span className="size-value original">
                          {(originalSize / 1024).toFixed(1)} KB
                        </span>
                      </span>
                      {estimatedSize && (
                        <span>
                          预计压缩后:{" "}
                          <span className="size-value estimated">
                            {(estimatedSize / 1024).toFixed(1)} KB
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Format Tab */}
            {activeTab === "format" && (
              <div className="tab-pane active">
                <div className="param-group">
                  <div className="button-group">
                    {(["original", "jpg", "png", "webp"] as const).map(
                      (format) => (
                        <button
                          key={format}
                          className={`format-button ${outputFormat === format ? "active" : ""}`}
                          onClick={() => setOutputFormat(format)}
                          title={
                            format === "original"
                              ? "保持原始格式"
                              : format === "jpg"
                                ? "转换为 JPG 格式"
                                : format === "png"
                                  ? "转换为 PNG 格式"
                                  : "转换为 WebP 格式"
                          }
                        >
                          {format === "original" && "保持原格式"}
                          {format === "jpg" && "转为 JPG"}
                          {format === "png" && "转为 PNG"}
                          {format === "webp" && "转为 WebP"}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
