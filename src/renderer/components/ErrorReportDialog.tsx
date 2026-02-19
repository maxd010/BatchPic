import React from 'react';
import { ProcessingResult } from '../../main/types';
import './ErrorReportDialog.css';

interface ErrorReportDialogProps {
  result: ProcessingResult;
  onClose: () => void;
}

/**
 * ErrorReportDialog - Displays error summary and details after processing
 * 
 * Requirements:
 * - 10.4: Collect all processing errors
 * - 10.4: Display error summary dialog after completion
 * - 10.4: Provide clear error messages for each error
 * - 10.5: Continue processing all remaining images and report failures at the end
 * 
 * Shows:
 * - Success count
 * - Failure count
 * - Detailed error list with file names and error messages
 */
export function ErrorReportDialog({ result, onClose }: ErrorReportDialogProps) {
  const hasErrors = result.failed.length > 0;

  return (
    <div className="error-report-overlay">
      <div className="error-report-dialog">
        {/* Header */}
        <div className="error-report-header">
          <h2>处理完成</h2>
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {/* Summary */}
        <div className="error-report-summary">
          <div className="summary-item success">
            <span className="summary-label">成功</span>
            <span className="summary-count">{result.successful.length} 张</span>
          </div>
          {hasErrors && (
            <div className="summary-item failure">
              <span className="summary-label">失败</span>
              <span className="summary-count">{result.failed.length} 张</span>
            </div>
          )}
        </div>

        {/* Error details (only show if there are failures) */}
        {hasErrors && (
          <div className="error-report-details">
            <h3>失败详情</h3>
            <div className="error-list">
              {result.failed.map((failedImage, index) => (
                <div key={index} className="error-item">
                  <div className="error-file-name">
                    {failedImage.outputPath.split('/').pop() || failedImage.outputPath}
                  </div>
                  <div className="error-message">
                    {failedImage.error || '未知错误'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="error-report-footer">
          <button 
            className="close-dialog-button"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
