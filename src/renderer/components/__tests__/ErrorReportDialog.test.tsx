import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorReportDialog } from '../ErrorReportDialog';
import { ProcessingResult } from '../../main/types';

describe('ErrorReportDialog', () => {
  const mockOnClose = jest.fn();

  const mockResultWithErrors: ProcessingResult = {
    successful: [
      {
        outputPath: '/output/photo1.jpg',
        originalSize: 1024000,
        processedSize: 512000,
        success: true,
      },
      {
        outputPath: '/output/photo2.jpg',
        originalSize: 2048000,
        processedSize: 1024000,
        success: true,
      },
    ],
    failed: [
      {
        outputPath: '/output/photo3.jpg',
        originalSize: 1024000,
        processedSize: 0,
        success: false,
        error: '文件损坏',
      },
      {
        outputPath: '/output/photo4.png',
        originalSize: 512000,
        processedSize: 0,
        success: false,
        error: '权限被拒绝',
      },
    ],
    totalTime: 5000,
  };

  const mockResultNoErrors: ProcessingResult = {
    successful: [
      {
        outputPath: '/output/photo1.jpg',
        originalSize: 1024000,
        processedSize: 512000,
        success: true,
      },
    ],
    failed: [],
    totalTime: 1000,
  };

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  test('renders dialog with success and failure counts', () => {
    render(
      <ErrorReportDialog result={mockResultWithErrors} onClose={mockOnClose} />
    );

    expect(screen.getByText('处理完成')).toBeInTheDocument();
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('失败')).toBeInTheDocument();
    expect(screen.getAllByText('2 张')).toHaveLength(2); // 2 successful and 2 failed
  });

  test('displays error details for failed images', () => {
    render(
      <ErrorReportDialog result={mockResultWithErrors} onClose={mockOnClose} />
    );

    expect(screen.getByText('失败详情')).toBeInTheDocument();
    expect(screen.getByText('文件损坏')).toBeInTheDocument();
    expect(screen.getByText('权限被拒绝')).toBeInTheDocument();
  });

  test('displays file names from output paths', () => {
    render(
      <ErrorReportDialog result={mockResultWithErrors} onClose={mockOnClose} />
    );

    expect(screen.getByText('photo3.jpg')).toBeInTheDocument();
    expect(screen.getByText('photo4.png')).toBeInTheDocument();
  });

  test('does not show failure section when there are no errors', () => {
    render(
      <ErrorReportDialog result={mockResultNoErrors} onClose={mockOnClose} />
    );

    expect(screen.queryByText('失败')).not.toBeInTheDocument();
    expect(screen.queryByText('失败详情')).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <ErrorReportDialog result={mockResultWithErrors} onClose={mockOnClose} />
    );

    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close dialog button is clicked', () => {
    render(
      <ErrorReportDialog result={mockResultWithErrors} onClose={mockOnClose} />
    );

    const closeButton = screen.getByText('关闭');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('displays "未知错误" when error message is missing', () => {
    const resultWithMissingError: ProcessingResult = {
      successful: [],
      failed: [
        {
          outputPath: '/output/photo.jpg',
          originalSize: 1024000,
          processedSize: 0,
          success: false,
        },
      ],
      totalTime: 1000,
    };

    render(
      <ErrorReportDialog result={resultWithMissingError} onClose={mockOnClose} />
    );

    expect(screen.getByText('未知错误')).toBeInTheDocument();
  });

  test('handles file paths with multiple directories correctly', () => {
    const resultWithNestedPath: ProcessingResult = {
      successful: [],
      failed: [
        {
          outputPath: '/output/vacation/beach/photo.jpg',
          originalSize: 1024000,
          processedSize: 0,
          success: false,
          error: '处理失败',
        },
      ],
      totalTime: 1000,
    };

    render(
      <ErrorReportDialog result={resultWithNestedPath} onClose={mockOnClose} />
    );

    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
  });
});
