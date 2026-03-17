import { useState, useEffect, useRef, useCallback } from "react";
import "./PreviewApp.css";

interface PreviewData {
  originalPath: string;
  outputPath?: string;
  filename: string;
}

export function PreviewApp() {
  const [data, setData] = useState<PreviewData | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch preview data from main process on mount
  useEffect(() => {
    window.electronAPI.getPreviewData?.().then((incoming) => {
      if (incoming) setData(incoming);
    });
  }, []);

  // Load original image
  useEffect(() => {
    if (!data?.originalPath) return;
    window.electronAPI.loadImagePreview(data.originalPath)
      .then(setOriginalUrl)
      .catch(() => {});
  }, [data?.originalPath]);

  // Load processed image
  useEffect(() => {
    if (!data?.outputPath) { setProcessedUrl(null); return; }
    window.electronAPI.loadImagePreview(data.outputPath)
      .then(setProcessedUrl)
      .catch(() => {});
  }, [data?.outputPath]);

  const updateSlider = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pos = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => updateSlider(e.clientX);
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, updateSlider]);

  if (!data) {
    return (
      <div className="preview-loading-screen">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="preview-app">
      <div className="preview-header">
        <span className="preview-header-title">实时效果对比</span>
        <span className="preview-header-filename">{data.filename}</span>
      </div>

      <div className="preview-body">
        <div
          ref={containerRef}
          className="comparison-wrapper"
          onMouseDown={(e) => updateSlider(e.clientX)}
        >
          {/* Base layer: processed (right side) */}
          <div className="comparison-layer comparison-layer--processed">
            {processedUrl
              ? <img src={processedUrl} alt="Processed" draggable={false} />
              : <div className="comparison-placeholder">尚未处理</div>
            }
            <span className="comparison-badge comparison-badge--right">处理后</span>
          </div>

          {/* Top layer: original (left side), clipped */}
          <div
            className="comparison-layer comparison-layer--original"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            {originalUrl
              ? <img src={originalUrl} alt="Original" draggable={false} />
              : <div className="comparison-placeholder">加载中...</div>
            }
            <span className="comparison-badge comparison-badge--left">处理前</span>
          </div>

          {/* Divider */}
          <div
            className="comparison-divider"
            style={{ left: `${sliderPos}%` }}
            onMouseDown={handleMouseDown}
          >
            <div className="comparison-handle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
