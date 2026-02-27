import { useState, useEffect } from 'react';
import { ImageFile, ProcessingParams } from '../../main/types';
import { XMarkIcon, MagnifyingGlassPlusIcon } from './Icons';
import './FullScreenPreview.css';

interface FullScreenPreviewProps {
  image: ImageFile;
  params: ProcessingParams;
  onClose: () => void;
}

export function FullScreenPreview({ image, params, onClose }: FullScreenPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const generatePreview = async () => {
      setIsProcessing(true);
      try {
        if (window.electronAPI?.generatePreview) {
          const url = await window.electronAPI.generatePreview(image.path, params);
          if (isMounted) {
            setPreviewUrl(url);
          }
        }
      } catch (error) {
        console.error('Failed to generate preview:', error);
      } finally {
        if (isMounted) {
          setIsProcessing(false);
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
    };
  }, [image, params]);

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
                <img src={`file://${image.path}`} alt="Original" />
              </div>
            </div>

            {/* Processed side */}
            <div className="comparison-side">
              <div className="side-label processed">处理后 (Processed)</div>
              <div className="image-container checkered-bg">
                {isProcessing ? (
                  <div className="preview-loading">
                    <div className="loading-spinner"></div>
                    <p>正在生成预览...</p>
                  </div>
                ) : (
                  previewUrl && <img src={previewUrl} alt="Processed" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="preview-modal-footer">
          <p className="preview-tip">提示：调整右侧参数面板可实时查看效果变化</p>
          <button className="preview-done-button" onClick={onClose}>
            关闭预览
          </button>
        </div>
      </div>
    </div>
  );
}
