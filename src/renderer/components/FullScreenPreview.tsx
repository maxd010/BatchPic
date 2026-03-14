import { useState, useEffect } from "react";
import { ImageFile, ProcessingParams } from "../../main/types";
import { XMarkIcon, MagnifyingGlassPlusIcon } from "./Icons";
import "./FullScreenPreview.css";

interface FullScreenPreviewProps {
  image: ImageFile;
  outputPath?: string;
  params: ProcessingParams;
  onClose: () => void;
}

export function FullScreenPreview({
  image,
  outputPath,
  params,
  onClose,
}: FullScreenPreviewProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(true);
  const [isLoadingProcessed, setIsLoadingProcessed] = useState(!!outputPath);

  // Load original image via IPC (file:// is blocked by same-origin policy in http renderer)
  useEffect(() => {
    let isMounted = true;
    setIsLoadingOriginal(true);
    window.electronAPI
      .loadImagePreview(image.path)
      .then((url) => {
        if (isMounted) {
          setOriginalUrl(url);
          setIsLoadingOriginal(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load original image:", err);
        if (isMounted) setIsLoadingOriginal(false);
      });
    return () => {
      isMounted = false;
    };
  }, [image.path]);

  // Load processed image via IPC when outputPath is available
  useEffect(() => {
    if (!outputPath) {
      setProcessedUrl(null);
      setIsLoadingProcessed(false);
      return;
    }
    let isMounted = true;
    setIsLoadingProcessed(true);
    window.electronAPI
      .loadImagePreview(outputPath)
      .then((url) => {
        if (isMounted) {
          setProcessedUrl(url);
          setIsLoadingProcessed(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load processed image:", err);
        if (isMounted) setIsLoadingProcessed(false);
      });
    return () => {
      isMounted = false;
    };
  }, [outputPath]);

  return (
    <div className="full-screen-preview-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal-header">
          <div className="preview-modal-title">
            <MagnifyingGlassPlusIcon className="preview-modal-icon" />
            <h3>实时效果对比</h3>
            <span className="preview-filename">{image.relativePath}</span>
          </div>
          <button className="preview-modal-close" onClick={onClose}>
            <XMarkIcon className="close-icon" />
          </button>
        </div>

        <div className="preview-modal-content">
          <div className="comparison-container">
            {/* Original side */}
            <div className="comparison-side">
              <div className="side-label">处理前 (Original)</div>
              <div className="image-container checkered-bg">
                {isLoadingOriginal ? (
                  <div className="preview-loading">
                    <div className="loading-spinner"></div>
                    <p>加载中...</p>
                  </div>
                ) : (
                  originalUrl && <img src={originalUrl} alt="Original" />
                )}
              </div>
            </div>

            {/* Processed side */}
            <div className="comparison-side">
              <div className="side-label processed">处理后 (Processed)</div>
              <div className="image-container checkered-bg">
                {isLoadingProcessed ? (
                  <div className="preview-loading">
                    <div className="loading-spinner"></div>
                    <p>加载中...</p>
                  </div>
                ) : processedUrl ? (
                  <img src={processedUrl} alt="Processed" />
                ) : (
                  <div className="preview-loading">
                    <p className="preview-not-processed">尚未处理</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="preview-modal-footer">
          <p className="preview-tip">
            提示：调整右侧参数面板可实时查看效果变化
          </p>
          <button className="preview-done-button" onClick={onClose}>
            关闭预览
          </button>
        </div>
      </div>
    </div>
  );
}
