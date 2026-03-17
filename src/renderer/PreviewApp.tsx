import { useState, useEffect } from "react";
import "./components/FullScreenPreview.css";
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
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  const [isLoadingProcessed, setIsLoadingProcessed] = useState(false);

  // Fetch preview data from main process on mount
  useEffect(() => {
    window.electronAPI.getPreviewData?.().then((incoming) => {
      if (incoming) setData(incoming);
    });
  }, []);

  // Load original image
  useEffect(() => {
    if (!data?.originalPath) return;
    let mounted = true;
    setIsLoadingOriginal(true);
    window.electronAPI.loadImagePreview(data.originalPath).then((url) => {
      if (mounted) { setOriginalUrl(url); setIsLoadingOriginal(false); }
    }).catch(() => { if (mounted) setIsLoadingOriginal(false); });
    return () => { mounted = false; };
  }, [data?.originalPath]);

  // Load processed image
  useEffect(() => {
    if (!data?.outputPath) { setProcessedUrl(null); setIsLoadingProcessed(false); return; }
    let mounted = true;
    setIsLoadingProcessed(true);
    window.electronAPI.loadImagePreview(data.outputPath).then((url) => {
      if (mounted) { setProcessedUrl(url); setIsLoadingProcessed(false); }
    }).catch(() => { if (mounted) setIsLoadingProcessed(false); });
    return () => { mounted = false; };
  }, [data?.outputPath]);

  if (!data) {
    return (
      <div className="preview-app-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="preview-app">
      <div className="preview-app-header">
        <h3>实时效果对比</h3>
        <span className="preview-filename">{data.filename}</span>
      </div>

      <div className="preview-app-content">
        <div className="comparison-container">
          {/* Original */}
          <div className="comparison-side">
            <div className="side-label">处理前 (Original)</div>
            <div className="image-container checkered-bg">
              {isLoadingOriginal ? (
                <div className="preview-loading"><div className="loading-spinner"></div><p>加载中...</p></div>
              ) : (
                originalUrl && <img src={originalUrl} alt="Original" />
              )}
            </div>
          </div>

          {/* Processed */}
          <div className="comparison-side">
            <div className="side-label processed">处理后 (Processed)</div>
            <div className="image-container checkered-bg">
              {isLoadingProcessed ? (
                <div className="preview-loading"><div className="loading-spinner"></div><p>加载中...</p></div>
              ) : processedUrl ? (
                <img src={processedUrl} alt="Processed" />
              ) : (
                <div className="preview-loading"><p className="preview-not-processed">尚未处理</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
